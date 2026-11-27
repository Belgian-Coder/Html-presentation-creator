// UI action audit: runs EVERY action of the editor's menus and right-click menus, each from a fresh page with a fitting
// element selected, at 1920x1080 (full HD) and 960x1080 (half), and records what it did:
//   - a screenshot of the result, and the automatic layout checks on it (tools/ui-audit-checks.mjs);
//   - what opened (a dialog, menu, bar or panel that was not there before), the messages it showed (toasts),
//     script errors, whether the slide or the slide list changed, what is selected and which tab is open after;
//   - "no visible result": nothing changed, nothing opened, no message (a dead or silent action, worth a look).
// Menus covered: the 9 menus of the menu bar; the right-click menu on a title, a card, a free shape, a picture, a
// chart and two selected elements; right-click on an empty spot ("add here"); the ⋯ of the bar next to the selection;
// right-click on a timeline bar.
//
//   node <project>/tools/ui-audit-actions.mjs [outDir] [filter]
//
// outDir defaults to <temp>/deck-ui-audit-actions; filter (optional) runs only actions whose id contains it.
// Writes <outDir>/<size>/NNN-<menu>-<action>.png, <outDir>/results.json (everything) and <outDir>/summary.md
// (what needs a look). One headless browser (tools/test/harness.mjs, with its safe profile), both sizes side by side
// in two tabs. Build the preview first (python build.py --preview). Not a test: nothing passes or fails.
// Left out (they open another window or print): File › Export as PDF, Print handout, Present (play).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { startBrowser, makePage, sleep } from './test/harness.mjs';
import { CHECK } from './ui-audit-checks.mjs';

const OUT = process.argv[2] || join(tmpdir(), 'deck-ui-audit-actions');
const FILTER = process.argv[3] || '';
const SIZES = [[1920, 1080, 'fullhd'], [960, 1080, 'half']];
const MENUS = ['file', 'edit', 'insert', 'format', 'slide', 'animate', 'arrange', 'view', 'help'];
const LEFT_OUT = { 'export-pdf': 'opens a print window', 'print-handout': 'opens a print window', play: 'opens the presentation in another window' };
// what is selected before an action; the first one in this order where a menu item is not greyed is used for it
const SETUPS = ['title', 'free', 'several', 'image', 'list', 'chart', 'undone', 'copied', 'none'];   // (undone: a shape inserted and undone, so Redo has work)

/** Before an action: every visible element (outside the slides) gets a mark, the messages are recorded from now on. */
const MARK = `(() => {
  const visible = e => { const r = e.getBoundingClientRect(); if (!r.width || !r.height) return false; const s = getComputedStyle(e); return s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0; };
  document.querySelectorAll('body *').forEach(e => { e.__auditSeen = visible(e); });
  window.__toasts = [];
  if (!window.__toastWatch) { window.__toastWatch = new MutationObserver(list => list.forEach(m => m.addedNodes.forEach(n => { if (n.classList && n.classList.contains('toast')) window.__toasts.push(n.textContent); }))); window.__toastWatch.observe(document.body, { childList: true, subtree: true }); }
  return true;
})()`;
/** The state that tells whether an action did something. */
const STATE = `(() => {
  const visible = e => { const r = e.getBoundingClientRect(); if (!r.width || !r.height) return false; const s = getComputedStyle(e); return s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0; };
  const text = e => ((e.getAttribute && (e.getAttribute('aria-label') || '')) + ' ' + (e.innerText || '')).trim().replace(/\\s+/g, ' ').slice(0, 70);
  const name = e => e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\\s+/).slice(0, 2).join('.') : '');
  const editorEl = document.querySelector('.editor');
  const slide = document.querySelector('.editor-slide-list li.is-selected .scene');
  const sel = document.querySelector('.editor-stage .is-editor-selected');
  const opened = [...document.querySelectorAll('body *')].filter(e => e.__auditSeen !== true && visible(e) && e.parentElement && e.parentElement.__auditSeen === true
    && !e.closest('.scene, .editor-thumb-stage, .editor-timing-probe, .toast, .editor-selection, .editor-handles, .editor-group-box, .editor-hover-box') && e.getBoundingClientRect().width * e.getBoundingClientRect().height > 400)
    .slice(0, 6).map(e => name(e) + ' "' + text(e).slice(0, 50) + '"');
  let hash = 0; const html = slide ? slide.outerHTML : ''; for (let i = 0; i < html.length; i++) hash = (hash * 31 + html.charCodeAt(i)) | 0;
  return {
    editorOpen: !!editorEl && !editorEl.hidden, slides: document.querySelectorAll('.editor-slide-list > li').length, slideHash: hash,
    slideName: slide ? slide.dataset.name : '', selected: sel ? name(sel) + ' "' + text(sel).slice(0, 30) + '"' : '', tab: (document.querySelector('.editor-tabs .is-selected') || {}).textContent || '',
    canUndo: !!document.querySelector('.editor-bar [data-action="undo"]:not(:disabled)'), undoSteps: editorEl ? editorEl.dataset.undoSteps || '0' : '', slideCount: document.querySelectorAll('.editor-slide-list > li').length, zoom: (document.querySelector('.editor-zoom-level') || {}).textContent || '',
    timeline: !!editorEl && editorEl.classList.contains('timeline-open'), opened, toasts: window.__toasts || [], hash: location.hash, focus: document.activeElement ? name(document.activeElement) : '',
    classes: editorEl ? editorEl.className : '', grid: !!document.querySelector('.editor-stage.show-grid'),
  };
})()`;

const { connection, close } = await startBrowser();
const results = {};
const save = () => {
  writeFileSync(join(OUT, 'results.json'), JSON.stringify(results, null, 1));
  // what needs a look: errors, no visible result, new layout findings
  const lines = ['# UI action audit', '', 'Per action: what it did. ⚠ = needs a look.', ''];
  for (const [key, r] of Object.entries(results)) {
    const flags = [];
    if (r.error) flags.push('⚠ could not run: ' + r.error);
    if (r.errors && r.errors.length) flags.push('⚠ script error: ' + r.errors.join(' | ').slice(0, 200));
    if (r.nothing) flags.push('⚠ no visible result');
    if (r.newFindings && r.newFindings.length) flags.push('layout: ' + r.newFindings.slice(0, 4).join(' ; '));
    const did = [r.changed && 'changed the slide', r.slidesChanged && 'slides ' + r.slidesChanged, r.opened && r.opened.length && 'opened ' + r.opened.join(', '), r.toasts && r.toasts.length && 'said "' + r.toasts.join('" / "') + '"', r.other].filter(Boolean).join('; ');
    lines.push('- **' + key + '** (' + (r.label || '') + (r.setup ? ', with ' + r.setup : '') + '): ' + (did || '-') + (flags.length ? ' — ' + flags.join(' — ') : ''));
  }
  writeFileSync(join(OUT, 'summary.md'), lines.join('\n'));
};

async function auditSize([width, height, label]) {
  const dir = join(OUT, label); mkdirSync(dir, { recursive: true });
  let t, e, n = 0;
  const newPage = async () => {
    if (t) { try { await t.close(); } catch { /* gone */ } }
    t = await makePage(connection, 'actions-' + label);
    await t.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    e = t.editor;
  };
  await newPage();
  const withLimit = (promise, ms, what) => { let timer; return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(what + ' took over ' + ms / 1000 + ' s')), ms); })]).finally(() => clearTimeout(timer)); };
  const inSlide = sel => sel.split(',').map(part => '.editor-stage .scene ' + part.trim()).join(', ');

  /** A fresh page, the editor open on `slide`, then `setup` selected. */
  async function prepare(setup) {
    const slide = { image: 'product', list: 'speed' }[setup] || 'numbers';
    await t.open(slide, { clear: true });   // (empty storage: no draft of an earlier action comes back)
    await t.key('e', 'KeyE', 69);
    await t.waitFor(`!!document.querySelector('.editor .editor-stage .scene')`);
    await e.goSlide(slide);
    t.errors.length = 0;
    if (setup === 'title') await e.pick(inSlide('h2, h1'));
    if (setup === 'free') await e.insert('rect');
    if (setup === 'chart') await e.insert('chart');
    if (setup === 'copied') { await e.pick(inSlide('h2, h1')); await e.blur(); await t.key('c', 'KeyC', 67, 2); await sleep(200); }   // (Paste has something)
    if (setup === 'undone') { await e.insert('rect'); await e.undo(); await t.waitFor(`!document.querySelector('.editor-bar [data-action="redo"]').disabled`); }
    if (setup === 'several') { await e.pick(inSlide('.stat')); await e.pick(inSlide('.stat:nth-child(2)'), { shift: true }); }
    if (setup === 'image') await e.pick(inSlide('img'));
    if (setup === 'list') await e.pick(inSlide('.big-list li'));
    await sleep(250);
  }
  const before = async () => { await t.eval(MARK); return { state: await t.eval(STATE), found: await t.eval(CHECK).catch(() => []) }; };
  /** The result of an action: screenshot, checks and what changed. */
  async function capture(key, info, start) {
    await sleep(700); await t.settle(2000);
    const file = String(++n).padStart(3, '0') + '-' + key.replace(/[^a-z0-9-]+/gi, '_') + '.png';
    await t.screenshot(join(dir, file));
    const found = await t.eval(CHECK).catch(err => ['check failed: ' + err.message]);
    const after = await t.eval(STATE);
    const was = start.state;
    const changed = (after.slideHash !== was.slideHash && after.slideName === was.slideName) || after.undoSteps !== was.undoSteps;   // (the thumbnail can lag: the undo steps do not)
    const other = [
      after.slideName !== was.slideName && 'went to slide ' + after.slideName, after.selected !== was.selected && 'selection: ' + (after.selected || 'none'),
      after.tab !== was.tab && 'tab: ' + after.tab, after.zoom !== was.zoom && 'zoom ' + after.zoom, after.timeline !== was.timeline && 'timeline ' + (after.timeline ? 'open' : 'closed'),
      after.grid !== was.grid && 'grid ' + (after.grid ? 'on' : 'off'), after.editorOpen !== was.editorOpen && (after.editorOpen ? 'editor opened' : 'editor closed'),
      after.hash !== was.hash && 'address ' + after.hash, after.classes !== was.classes && 'editor classes: ' + after.classes.replace('editor', '').trim(),
    ].filter(Boolean).join('; ');
    const result = { ...info, file: label + '/' + file, changed, slidesChanged: after.slides !== was.slides ? was.slides + ' → ' + after.slides : '', opened: after.opened, toasts: after.toasts,
      other, errors: t.errors.splice(0), newFindings: found.filter(f => !start.found.includes(f)).slice(0, 12), focus: after.focus };
    result.nothing = !changed && !result.slidesChanged && !after.opened.length && !after.toasts.length && !other;
    results[label + ' ' + key] = result;
    save();
    console.log(label, file, result.nothing ? 'NOTHING' : '', result.errors.length ? 'ERRORS' : '');
  }
  /** Runs one action (setup, open its menu, click its item) with a time limit; a stuck page is replaced. */
  async function run(key, info, steps) {
    if (FILTER && !key.includes(FILTER)) return;
    try { await withLimit(steps(), 30000, key); }
    catch (err) { results[label + ' ' + key] = { ...info, error: String(err.message).slice(0, 300) }; save(); console.log(label, key, 'ERROR', err.message.slice(0, 140)); if (/took over/.test(err.message)) await newPage(); }
  }
  /** The items of the open menu (any .editor-menu): label, greyed. */
  const menuItems = () => t.eval(`[...document.querySelectorAll('.editor-menu:not([hidden]) button')].map((b, i) => ({ i, label: b.innerText.trim().replace(/\\s+/g, ' '), id: b.dataset.command || b.dataset.menu || b.dataset.action || '', off: b.disabled || b.getAttribute('aria-disabled') === 'true' }))`);
  const clickItem = async index => {
    await t.eval(`(() => { document.querySelectorAll('[data-audit-item]').forEach(b => b.removeAttribute('data-audit-item')); document.querySelectorAll('.editor-menu:not([hidden]) button')[${index}].setAttribute('data-audit-item', '1'); return true; })()`);
    await t.click('[data-audit-item]');
  };
  const openBarMenu = async id => { await t.click('.editor-menubar [data-menu-id="' + id + '"]'); await t.waitFor(`!!document.querySelector('.editor-menubar-menu')`); };
  const rightClick = async selector => { const p = await t.centre(selector); await t.clickAt(p, { button: 'right' }); await t.waitFor(`!!document.querySelector('.editor-menu:not([hidden]) button')`); };

  // ---- 1. the menu bar: which items each setup allows
  const allowed = {}, labels = {};
  for (const setup of SETUPS) {
    try {
      await withLimit(prepare(setup), 30000, 'prepare ' + setup);
      for (const menu of MENUS) {
        await openBarMenu(menu);
        for (const item of await menuItems()) { labels[item.id] = item.label; if (!item.off && !allowed[item.id]) allowed[item.id] = { setup, menu }; if (!allowed[item.id + '?']) allowed[item.id + '?'] = { menu }; }
        await t.key('Escape', 'Escape', 27); await sleep(100);
      }
    } catch (err) { console.log(label, 'setup', setup, err.message.slice(0, 120)); await newPage(); }
  }
  const commands = Object.keys(allowed).filter(id => !id.endsWith('?'));
  const never = Object.keys(allowed).filter(id => id.endsWith('?') && !allowed[id.slice(0, -1)]).map(id => id.slice(0, -1));
  for (const id of never) results[label + ' menu-' + allowed[id + '?'].menu + '-' + id] = { label: labels[id], error: 'greyed in every setup tried (' + SETUPS.join(', ') + ')' };

  // ---- 2. each menu-bar action
  for (const menu of MENUS) for (const id of commands.filter(c => allowed[c].menu === menu)) {
    const key = 'menu-' + menu + '-' + id, info = { label: labels[id], setup: allowed[id].setup };
    if (LEFT_OUT[id]) { results[label + ' ' + key] = { ...info, error: 'left out: ' + LEFT_OUT[id] }; continue; }
    await run(key, info, async () => {
      await prepare(allowed[id].setup);
      if (id === 'insert-image') await t.eval(`window.__nextFile = window.__pngFile(); true`);
      const start = await before();
      await openBarMenu(menu);
      const index = (await menuItems()).find(item => item.id === id).i;
      await clickItem(index);
      await capture(key, info, start);
    });
  }

  // ---- 3. right-click menus on elements, and every item in them
  const targets = [['title', 'h2, h1'], ['card', '.stat'], ['free', null], ['image', 'img'], ['chart', null], ['several', '.stat']];
  for (const [kind, selector] of targets) {
    const setup = kind === 'card' ? 'title' : kind;
    const where = () => selector ? inSlide(selector) : '.editor-stage .is-editor-selected';
    let items = [];
    await run('right-' + kind + '-menu', { label: 'right-click menu on a ' + kind, setup }, async () => {
      await prepare(setup);
      const start = await before();
      await rightClick(where());
      items = await menuItems();
      await capture('right-' + kind + '-menu', { label: 'right-click menu on a ' + kind, setup, items: items.map(item => (item.off ? '(greyed) ' : '') + item.label) }, start);
    });
    for (const item of items.filter(item => !item.off)) {
      const key = 'right-' + kind + '-' + (item.id || item.i), info = { label: item.label, setup: kind };
      await run(key, info, async () => {
        await prepare(setup);
        const start = await before();
        await rightClick(where());
        const now = (await menuItems()).find(other => other.label === item.label);
        if (!now) throw new Error('item not in the menu this time');
        await clickItem(now.i);
        await capture(key, info, start);
      });
    }
  }

  // ---- 4. right-click on an empty spot of the slide ("add here")
  const emptySpot = `(() => { const scene = document.querySelector('.editor-stage .scene'), r = scene.getBoundingClientRect();
    for (let y = .97; y > .5; y -= .03) for (let x = .03; x < .97; x += .04) { const px = r.left + r.width * x, py = r.top + r.height * y, top = document.elementFromPoint(px, py); if (top === scene || (top && top.matches('.content') && scene.contains(top))) return { x: px, y: py }; }
    return null; })()`;
  let spotItems = [];
  await run('right-empty-menu', { label: 'right-click on an empty spot', setup: 'none' }, async () => {
    await prepare('none');
    const start = await before();
    const p = await t.eval(emptySpot); if (!p) throw new Error('no empty spot found');
    await t.clickAt(p, { button: 'right' }); await t.waitFor(`!!document.querySelector('.editor-menu:not([hidden]) button')`);
    spotItems = await menuItems();
    await capture('right-empty-menu', { label: 'right-click on an empty spot', setup: 'none', items: spotItems.map(item => (item.off ? '(greyed) ' : '') + item.label) }, start);
  });
  for (const item of spotItems.filter(item => !item.off)) {
    const key = 'right-empty-' + (item.id || item.i), info = { label: item.label, setup: 'none' };
    await run(key, info, async () => {
      await prepare('none');
      const start = await before();
      const p = await t.eval(emptySpot);
      await t.clickAt(p, { button: 'right' }); await t.waitFor(`!!document.querySelector('.editor-menu:not([hidden]) button')`);
      await clickItem((await menuItems()).find(other => other.label === item.label).i);
      await capture(key, info, start);
    });
  }

  // ---- 5. the ⋯ of the bar next to the selection
  await run('bar-more-menu', { label: '⋯ on the bar next to the selection', setup: 'title' }, async () => {
    await prepare('title');
    const start = await before();
    await t.click('.editor-quickbar [data-action="bar-more"]');
    await t.waitFor(`!!document.querySelector('.editor-menu:not([hidden]) button')`);
    await capture('bar-more-menu', { label: '⋯ on the bar next to the selection', setup: 'title', items: (await menuItems()).map(item => (item.off ? '(greyed) ' : '') + item.label) }, start);
  });
  // ... and each button of that bar
  let barButtons = [];
  await run('bar-buttons', { label: 'list the bar buttons', setup: 'title' }, async () => { await prepare('title'); barButtons = await t.eval(`[...document.querySelectorAll('.editor-quickbar button')].map(b => ({ action: b.dataset.action, label: b.innerText.trim() })).filter(b => b.action && b.action !== 'bar-more')`); delete results[label + ' bar-buttons']; });
  for (const button of barButtons) {
    const key = 'bar-' + button.action, info = { label: 'bar: ' + button.label, setup: 'title' };
    await run(key, info, async () => {
      await prepare('title');
      const start = await before();
      await t.click('.editor-quickbar [data-action="' + button.action + '"]');
      await capture(key, info, start);
    });
  }

  // ---- 6. right-click on a timeline bar (an element with its own animation)
  const ownAnimation = async () => {
    await prepare('title');
    await e.tab('element');
    await t.eval(`(() => { const f = document.querySelector('.editor-panel-body [data-element-field="animation"]'); f.value = [...f.options].some(o => o.value === 'bounce-in') ? 'bounce-in' : 'preset:bounce-in'; f.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
    await t.waitFor(`!!document.querySelector('.editor-timeline .tl-row.is-selected .tl-seg, .editor-timeline .tl-row .tl-seg')`);
  };
  const timelineTarget = `.editor-timeline .tl-row.is-selected .tl-seg, .editor-timeline .tl-row .tl-seg`;
  let tlItems = [];
  await run('right-timeline-menu', { label: 'right-click on a timeline bar', setup: 'title with its own animation' }, async () => {
    await ownAnimation();
    const start = await before();
    await rightClick(timelineTarget);
    tlItems = await menuItems();
    await capture('right-timeline-menu', { label: 'right-click on a timeline bar', setup: 'title with its own animation', items: tlItems.map(item => (item.off ? '(greyed) ' : '') + item.label) }, start);
  });
  for (const item of tlItems.filter(item => !item.off)) {
    const key = 'right-timeline-' + (item.id || item.i), info = { label: item.label, setup: 'title with its own animation' };
    await run(key, info, async () => {
      await ownAnimation();
      const start = await before();
      await rightClick(timelineTarget);
      await clickItem((await menuItems()).find(other => other.label === item.label).i);
      await capture(key, info, start);
    });
  }
  await t.close();
}

try {
  mkdirSync(OUT, { recursive: true });
  await Promise.all(SIZES.map(size => auditSize(size)));
} finally {
  save();
  await close();
}
console.log('done', Object.keys(results).length);
