// UI layout audit: a screenshot of every screen (presentation, presenter view, editor tabs, menus and dialogs) at
// 1920x1080 (full HD) and 960x1080 (half a full-HD screen), plus automatic checks per screen: text cut off or spilling
// out of its box, controls off-screen, covered or on top of each other, tiny click targets, small text, sideways scroll.
//
//   node <project>/tools/ui-audit.mjs [outDir]
//
// Writes <outDir>/fullhd/NN-name.png, <outDir>/half/NN-name.png and <outDir>/report.json (per screen: what it shows and
// what the checks found). outDir defaults to <temp>/deck-ui-audit. It uses the test harness (tools/test/harness.mjs),
// which starts one headless browser with its safe profile; build the preview first (python build.py --preview).
// Not a test suite: nothing passes or fails; a person (or an agent) looks at the pictures and the findings.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { startBrowser, makePage, sleep } from './test/harness.mjs';
const OUT = process.argv[2] || join(tmpdir(), 'deck-ui-audit');
const SIZES = [[1920, 1080, 'fullhd'], [960, 1080, 'half']];

import { CHECK } from './ui-audit-checks.mjs';

const { connection, close } = await startBrowser();
const report = {};
try {
  for (const [width, height, label] of SIZES) {
    const dir = join(OUT, label); mkdirSync(dir, { recursive: true });
    let t = await makePage(connection, 'audit-' + label);
    await t.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    let e = t.editor;
    let n = 0;
    const shot = async (id, note = '') => {
      await sleep(450); await t.settle(2500);
      const file = String(++n).padStart(2, '0') + '-' + id + '.png';
      await t.screenshot(join(dir, file));
      let found = [];
      try { found = await t.eval(CHECK); } catch (err) { found = ['check failed: ' + err.message]; }
      report[label + '/' + file] = { note, found };
      writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 1));   // (kept when a run stops half-way)
      console.log(label, file, found.length);
    };
    let hung = false;
    const step = async (id, fn, note) => {
      if (hung) return;
      let timer;
      const limit = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('step took over 25 s')), 25000); });
      try { await Promise.race([(async () => { await fn(); await shot(id, note); })(), limit]); }
      catch (err) { report[label + '/' + id] = { note, error: String(err.message).slice(0, 300) }; console.log(label, id, 'ERROR', err.message.slice(0, 160)); if (/25 s/.test(err.message)) hung = true; }
      finally { clearTimeout(timer); }
    };
    const esc = async (times = 2) => { for (let i = 0; i < times; i++) { await t.key('Escape', 'Escape', 27); await sleep(120); } };
    /** In the editor: Esc closes the open menu or dialog (a second Esc can close the editor itself: then it opens again). */
    const back = async () => {
      await t.key('Escape', 'Escape', 27); await sleep(200);
      if (await t.eval(`!!document.querySelector('.editor-menubar-menu, .editor-dialog:not([hidden]), .editor-palette:not([hidden])')`)) { await t.key('Escape', 'Escape', 27); await sleep(200); }
      if (await t.eval(`!document.querySelector('.editor') || document.querySelector('.editor').hidden`)) { await t.key('e', 'KeyE', 69); await t.waitFor(`!!document.querySelector('.editor .editor-stage .scene')`); await e.goSlide('numbers'); }
    };
    const safe = async fn => { try { await fn(); } catch (err) { console.log(label, 'between steps', err.message.slice(0, 120)); } };
    const menu = async id => { await t.click('.editor-menubar [data-menu-id="' + id + '"]'); await t.waitFor(`!!document.querySelector('.editor-menubar-menu')`); };
    const cmd = async (m, c) => { await menu(m); await t.click('.editor-menubar-menu [data-command="' + c + '"]'); await sleep(300); };
    const inSlide = sel => sel.split(',').map(part => '.editor-stage .scene ' + part.trim()).join(', ');
    const pickFirst = async sel => { await e.pick(inSlide(sel)); };

    // ---------- presentation
    await t.open('title', { clear: true });
    await step('present-start', async () => {}, 'presentation, first slide, controls hidden');
    await step('present-controls', async () => { await t.mouse('mouseMoved', width / 2, height - 40); await sleep(300); }, 'controls bar shown (mouse at bottom)');
    await step('present-chapter-hover', async () => { const p = await t.eval(`(() => { const b = document.querySelectorAll('.chapter-bar button, #chapterBar button')[3]; if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`); if (p) await t.mouse('mouseMoved', p.x, p.y); }, 'hover a chapter in the chapter bar');
    await step('present-settings', async () => { await t.key('s', 'KeyS', 83); await sleep(400); }, 'settings panel (S)');
    await step('present-settings-scrolled', async () => { await t.eval(`(() => { const p = document.querySelector('.settings-panel'); const sc = [p, ...p.querySelectorAll('*')].find(x => x.scrollHeight > x.clientHeight + 20 && /(auto|scroll)/.test(getComputedStyle(x).overflowY)); if (sc) sc.scrollTop = sc.scrollHeight; return true; })()`); }, 'settings panel scrolled to the bottom');
    await esc();
    for (const slide of await t.eval(`[...document.querySelectorAll('#stage > .scene')].map(s => s.dataset.name)`)) {
      await step('slide-' + slide, async () => { await t.eval(`location.hash = '${slide}'; true`); await sleep(900); for (let i = 0; i < 6; i++) { await t.key('ArrowRight', 'ArrowRight', 39); await sleep(350); } await t.eval(`location.hash = '${slide}'; true`); await sleep(2500); }, 'slide ' + slide + ' (after stepping through)');
    }
    await t.open('numbers');
    await step('presenter-view', async () => { await t.key('p', 'KeyP', 80); await sleep(900); }, 'presenter view (P)');
    await step('presenter-keys', async () => { await t.key('k', 'KeyK', 75); await sleep(500); }, 'presenter view with key list (K)');
    await t.key('k', 'KeyK', 75);
    await step('presenter-chapters', async () => { await t.key('c', 'KeyC', 67); await sleep(500); }, 'presenter view with chapters (C)');
    await t.key('c', 'KeyC', 67);
    await step('presenter-slides', async () => { await t.key('g', 'KeyG', 71); await sleep(500); }, 'presenter view slides drawer (G)');
    await t.key('g', 'KeyG', 71);
    await step('presenter-texts', async () => { await t.key('t', 'KeyT', 84); await sleep(500); }, 'presenter view texts drawer (T)');
    await esc(3);

    // ---------- editor
    await t.open('title');
    await t.eval(`localStorage.removeItem('presentation-editor.welcomed'); true`);
    await t.key('e', 'KeyE', 69);
    await t.waitFor(`!!document.querySelector('.editor .editor-stage .scene')`);
    await step('editor-welcome', async () => {}, 'editor first open: welcome card');
    await back();
    await t.eval(`document.querySelector('.editor-welcome button, .editor-welcome [data-action]')?.click(); true`);
    await step('editor-open', async () => { await e.blur(); }, 'editor, nothing selected');
    for (const tab of ['layers', 'animations', 'slide', 'deck', 'code']) {
      await step('tab-' + tab, async () => { await e.tab(tab); }, 'panel tab ' + tab);
      await step('tab-' + tab + '-bottom', async () => { await t.eval(`(() => { const b = document.querySelector('.editor-panel-body'); b.scrollTop = b.scrollHeight; return true; })()`); }, 'panel tab ' + tab + ' scrolled to the bottom');
    }
    await e.goSlide('numbers');
    await step('element-selected', async () => { await pickFirst('h2, h1'); await e.tab('element'); }, 'numbers slide, title selected, Element tab');
    await step('element-mid', async () => { await t.eval(`(() => { const b = document.querySelector('.editor-panel-body'); b.scrollTop = b.scrollHeight / 2; return true; })()`); }, 'Element tab scrolled half');
    await step('element-bottom', async () => { await t.eval(`(() => { const b = document.querySelector('.editor-panel-body'); b.scrollTop = b.scrollHeight; return true; })()`); }, 'Element tab scrolled to bottom');
    await step('element-card', async () => { await t.eval(`document.querySelector('.editor-panel-body').scrollTop = 0`); await pickFirst('.stat, .card, li'); }, 'a card/stat selected');
    await step('animations-selected', async () => { await e.tab('animations'); }, 'Animations tab with an element selected');
    await safe(() => e.tab('element'));
    await step('typing', async () => { const p = await t.centre(inSlide('h2, h1')); await t.eval(`(() => { const h = document.querySelector(${JSON.stringify(inSlide('h2, h1'))}); h.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, clientX: ${p.x}, clientY: ${p.y} })); return true; })()`); await sleep(300); }, 'typing in a title (double-click)');
    await back();
    if (hung) { await t.close(); t = await makePage(connection, 'audit-' + label + '-2'); await t.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false }); e = t.editor; hung = false; }
    await e.open('numbers');
    await pickFirst('h2, h1');
    for (const m of ['file', 'edit', 'insert', 'format', 'slide', 'animate', 'arrange', 'view', 'help']) {
      await step('menu-' + m, async () => { await menu(m); }, 'menu ' + m + ' open (title selected)');
      await back();
    }
    await step('insert-button', async () => { await t.click('.editor-bar [data-action="insert-menu"]'); await sleep(300); }, '+ Insert menu');
    await back();
    await step('history', async () => { await t.click('.editor-bar [data-action="history"]'); await sleep(300); }, 'undo history dropdown');
    await back();
    await step('find-palette', async () => { await e.blur(); await t.key('k', 'KeyK', 75, 2); await sleep(300); await t.type('shadow'); await sleep(300); }, 'Ctrl+K find with "shadow"');
    await back();
    await step('find-replace', async () => { await cmd('edit', 'find-replace'); }, 'find and replace');
    await back();
    await step('shortcuts', async () => { await cmd('help', 'shortcuts'); }, 'keyboard shortcuts dialog');
    await back();
    await step('add-slide', async () => { await cmd('slide', 'add-slide'); }, 'new slide: templates dialog');
    await back();
    await step('change-layout', async () => { await cmd('slide', 'change-layout'); }, 'change layout dialog');
    await back();
    await step('import-slides', async () => { await cmd('slide', 'import-slides'); }, 'import slides dialog');
    await back();
    await step('overview', async () => { await cmd('slide', 'overview'); }, 'overview of all slides (O)');
    await back();
    await step('settings-in-editor', async () => { await cmd('file', 'settings'); }, 'settings from inside the editor');
    await back();
    await step('spelling', async () => { await cmd('edit', 'check-spelling'); }, 'spelling walk-through bar');
    await back();
    await step('timeline-toggle', async () => { await cmd('view', 'timeline'); }, 'timeline toggled (View > Timeline)');
    await safe(async () => { await cmd('view', 'timeline'); });
    await step('preview-transition', async () => { await cmd('slide', 'preview-transition'); await sleep(200); }, 'preview transition running');
    await back();
    await step('docks-unpinned', async () => { await cmd('view', 'pin-left'); await cmd('view', 'pin-right'); }, 'both docks unpinned (hidden to edge tabs)');
    await safe(async () => { await cmd('view', 'pin-left'); await cmd('view', 'pin-right'); });
    await step('quick-animate', async () => { await pickFirst('h2, h1'); await cmd('animate', 'animate-quick'); }, 'Animate > quick animation');
    await back();
    await step('slide-notes', async () => { await cmd('slide', 'slide-notes'); }, 'slide notes');
    await back();
    await step('right-click', async () => { const p = await t.centre(inSlide('h2, h1')); await t.clickAt(p, { button: 'right' }); await sleep(300); }, 'right-click menu on the title');
    await back();
    await step('zoomed-in', async () => { for (let i = 0; i < 4; i++) await cmd('view', 'zoom-in'); }, 'zoomed in 4x');
    await safe(async () => { await cmd('view', 'zoom-fit'); });
    await t.close();
  }
} finally {
  writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 1));
  await close();
}
console.log('done', Object.keys(report).length);
