// Presenter extras: export / import (time plan, realized-times report, themes, texts), built-in and own themes, "Save a copy"
// with the settings baked in, the template slides, the check row (audience connected / on another slide / not responding /
// closed, Resync / Reconnect / Open), the safety net for a broken slide script, the Slides drawer (G) and backup slides,
// the Texts drawer (T: slide texts, numbers, chapter titles, interface texts, keys while typing, save a copy, export, undo
// all, import), per-slide transitions, the break timer, QR code, video, morph, agenda, click effects, chart, image swap,
// live captions (fake speech recognition) and booth mode.
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PAGE, wrapTarget, makePage } from '../harness.mjs';

export const covers = ['js/05-', 'js/06-', 'js/07-', 'js/08-', 'js/09-', 'js/13-', 'js/14-', 'js/15-', 'js/16-', 'themes.json', 'css/0', 'css/10-', 'slides/', 'parts/', 'interface-texts.json', 'deck.html'];
export const timeoutMs = 180000;

const RIGHT = ['ArrowRight', 'ArrowRight', 39], LEFT = ['ArrowLeft', 'ArrowLeft', 37], ESC = ['Escape', 'Escape', 27], PGDN = ['PageDown', 'PageDown', 34];
const LOADED = `document.readyState === 'complete' && !!document.querySelector('#stage .scene.is-active')`;
// the page's link.click() downloads are recorded instead of saved (the page's own stubs cover the save window)
const CAPTURE = `(() => { window.__downloads = []; const orig = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (this.download) { const href = this.href, name = this.download; window.__downloads.push(fetch(href).then(r => r.arrayBuffer()).then(buf => { const b = new Uint8Array(buf); const text = b[0] === 0xFF && b[1] === 0xFE ? new TextDecoder('utf-16le').decode(b.subarray(2)) : new TextDecoder().decode(b); return { name, text, utf16: b[0] === 0xFF }; })); } else orig.call(this); }; })()`;
const FAKE_CLOCK = `(() => { const real = Date.now.bind(Date); let offset = 0; window.__advance = ms => { offset += ms; }; Date.now = () => real() + offset; })()`;
const SPEECH = `window.SpeechRecognition = class { start() { setTimeout(() => this.onresult && this.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: 'hello from the speaker' }], { isFinal: true })] }), 300); } stop() {} };`;
const q = JSON.stringify;

/** The parts are independent: each runs in its own isolated tab, at the same time; their results and errors are merged into t. */
export default async function (t) {
  const parts = [partSettings, partChecks, partTexts, partExtras, partBooth];
  const tabs = [t];
  for (let i = 1; i < parts.length; i++) tabs.push(await makePage(t.connection, 'presenter-extras ' + (i + 1)));
  try {
    const outcomes = await Promise.allSettled(parts.map((part, i) => part(tabs[i]).catch(error => { throw new Error('part ' + (i + 1) + ' after "' + (tabs[i].results.at(-1)?.label || 'title') + '": ' + error.message); })));
    const failed = outcomes.find(outcome => outcome.status === 'rejected');
    if (failed) throw failed.reason;
  } finally {
    for (const tab of tabs.slice(1)) {
      t.results.push(...tab.results);
      t.errors.push(...tab.errors);
      await tab.close();
    }
  }
}

function tools(t) {
  const ev = (w, x) => w.eval(x);
  const slideOf = w => w.eval(`location.hash.slice(1)`);
  const waitSlide = (w, name, timeout) => w.waitFor(`location.hash === '#${name}'`, { timeout, label: 'slide ' + name });
  const isShown = (w, sel) => w.eval(`(() => { const d = document.querySelector('${sel}'); if (!d) return false; const r = d.getBoundingClientRect(); return r.right > 40 && r.left < window.innerWidth - 40; })()`);
  const showing = (w, sel) => w.waitFor(`(() => { const d = document.querySelector('${sel}'); if (!d) return false; const r = d.getBoundingClientRect(); return r.right > 40 && r.left < window.innerWidth - 40; })()`, { label: sel + ' shown' });
  const hidden = (w, sel) => w.waitFor(`(() => { const d = document.querySelector('${sel}'); if (!d) return true; const r = d.getBoundingClientRect(); return !(r.right > 40 && r.left < window.innerWidth - 40); })()`, { label: sel + ' hidden' });
  const go = async (w, name) => { await w.eval(`location.hash = '#${name}'`); await w.waitFor(`document.querySelector('#stage .scene.is-active')?.dataset.name === '${name}'`, { label: 'on ' + name }); };
  const next = w => w.key(...RIGHT);
  const open = async (w, suffix) => {   // the built page with a query, e.g. '?templates=1#title'
    await w.send('Page.navigate', { url: pathToFileURL(PAGE).href + suffix });
    await w.waitFor(LOADED, { timeout: 15000, label: 'page loaded ' + suffix });
  };
  /** P: the presenter view and the audience window; waits for the audience's hello (its first messages can undo an early Next). */
  const openPresenter = async w => {
    await w.eval(`window.__hello = false; window.addEventListener('message', e => { if (e.data && e.data.type === 'hello') window.__hello = true; })`);
    for (let i = 0; i < 4; i++) {   // a key right after a load can be lost: press again until the view is there
      await w.key('p', 'KeyP', 80);
      try { await w.waitFor(`!!document.querySelector('.presenter-view')`, { timeout: 2500 }); break; } catch { /* again */ }
    }
    await w.waitFor(`!!document.querySelector('.presenter-view')`, { label: 'presenter view' });
    await w.waitFor(`window.__hello`, { timeout: 10000, label: 'audience hello' });
    await w.settle();
  };
  /** Closes the audience windows of this tab (a new presenter view then opens a fresh one that says hello). */
  const closeAudiences = async () => {
    for (let i = 0; i < 40; i++) {
      const { targetInfos } = (await t.connection.send('Target.getTargets')).result;
      const open = targetInfos.filter(info => info.type === 'page' && info.browserContextId === t.contextId && info.url.includes('audience=1'));
      if (!open.length) return;
      for (const info of open) await t.connection.send('Target.closeTarget', { targetId: info.targetId });
      await t.sleep(50);
    }
  };
  const typeKeys = async (w, text) => {   // real key presses, one per letter
    for (const ch of text) {
      const code = ch === ' ' ? 'Space' : /\d/.test(ch) ? 'Digit' + ch : 'Key' + ch.toUpperCase();
      await w.key(ch, code, ch === ' ' ? 32 : ch.toUpperCase().charCodeAt(0));
    }
  };
  const lastDownload = async (w, count = 1) => {
    await w.waitFor(`window.__downloads.length >= ${count}`, { label: 'download ' + count });
    return w.eval(`Promise.all(window.__downloads).then(list => list[list.length - 1])`);
  };
  const importJson = (w, name, obj) => w.eval(`(() => { const input = document.getElementById('importFile'); const dt = new DataTransfer(); dt.items.add(new File([${q(JSON.stringify(obj))}], ${q(name)}, { type: 'application/json' })); input.files = dt.files; input.dispatchEvent(new Event('change')); })()`);
  const field = (index, value, blur = true) => `(() => { const t = document.querySelectorAll('.texts-list textarea')[${index}]; t.focus(); t.value = ${q(value)}; t.dispatchEvent(new Event('input', { bubbles: true })); ${blur ? 't.blur();' : ''} })()`;
  const searchTexts = (w, text) => w.eval(`(() => { const s = document.querySelector('.texts-search'); s.value = ${q(text)}; s.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  const textsTab = (w, tab) => w.eval(`[...document.querySelectorAll('.texts-tabs button')].find(b => b.dataset.tab === '${tab}').click()`);
  const toast = w => w.eval(`document.querySelector('.toast')?.textContent || ''`);
  const audiences = [];
  /** The audience window (the one with audience=1 of this tab's context), with the test API; reuses `known` while it is the same window. */
  const audienceWindow = async known => {
    let found = null;
    await t.waitFor(`true`);
    for (let i = 0; i < 160 && !found; i++) {
      const { targetInfos } = (await t.connection.send('Target.getTargets')).result;
      found = targetInfos.find(info => info.type === 'page' && info.browserContextId === t.contextId && info.url.includes('audience=1'));
      if (!found) await t.sleep(50);
    }
    if (!found) throw new Error('no audience window');
    if (known && known.targetId === found.targetId) return known;
    if (known) await known.close().catch(() => {});
    const w = await wrapTarget(t.connection, found.targetId, 'audience');
    audiences.push(w);
    await w.waitFor(`document.readyState === 'complete'`);
    return w;
  };
  return { ev, slideOf, waitSlide, isShown, showing, hidden, go, next, open, openPresenter, closeAudiences, typeKeys, lastDownload, importJson, field, searchTexts, textsTab, toast, audienceWindow };
}

async function partSettings(t) {
  const { ev, slideOf, waitSlide, isShown, showing, hidden, go, next, open, openPresenter, closeAudiences, typeKeys, lastDownload, importJson, field, searchTexts, textsTab, toast, audienceWindow } = tools(t);
  const dir = mkdtempSync(join(tmpdir(), 'deck-extras-'));
  try {
    // ================= export / import, themes, save a copy (a presenter run with realized times) =================
    await t.open('title');
    await t.eval(FAKE_CLOCK); await t.eval(CAPTURE);
    await openPresenter(t);
    t.check('presenter open', true);
    await t.key(...RIGHT); await waitSlide(t, 'big-letters'); await t.eval(`__advance(65000)`);   // slide 2: 65 s
    await t.key(...RIGHT); await waitSlide(t, 'agenda'); await t.eval(`__advance(20000)`);   // slide 3: 20 s
    for (let i = 0; i < 40 && (await slideOf(t)) !== 'numbers'; i++) {   // on to the numbers slide (every click of the slides between)
      await t.waitFor(`!/ignored for a moment/.test(document.querySelector('.presenter-cue')?.textContent || '')`, { label: 'next counts' });
      await next(t);
    }
    await waitSlide(t, 'numbers');
    await t.eval(`document.querySelector('.presenter-settings').click()`);
    await t.waitFor(`!document.getElementById('settingsPanel').hidden`);
    t.check('settings opens from presenter view', true);
    t.check('10 built-in themes listed', (await t.eval(`Array.from(document.getElementById('themeSelect').options).map(o => o.value).join('|')`)) === 'Dark|Light|High contrast|Editorial|Swiss|Boardroom|Studio|Forest|Nocturne|Launch');
    t.check('report buttons enabled after a run', !(await t.eval(`document.getElementById('btnExportReportCsv').disabled`)));

    await t.eval(`document.getElementById('btnExportPlan').click()`);
    let dl = await lastDownload(t, 1); let data = JSON.parse(dl.text);
    t.check('export time plan', data.type === 'presentation-time-plan' && data.slides.length === 38 && dl.name.startsWith('presentation-time-plan-'), dl.name);
    await t.eval(`document.getElementById('btnExportReportJson').click()`);
    dl = await lastDownload(t, 2); const report = JSON.parse(dl.text);
    const s2 = report.slides[1];
    t.check('report JSON slide 2 realized ~65 s, longer', s2.actualSeconds >= 64 && s2.actualSeconds <= 68 && s2.status === 'longer', JSON.stringify(s2));
    t.check('report slide 1 not timed', report.slides[0].status === 'not timed');
    await t.eval(`document.getElementById('btnExportReportCsv').click()`);
    dl = await lastDownload(t, 3);
    const lines = dl.text.trim().split(/\r?\n/);
    t.check('report spreadsheet (UTF-16, tabs, numbers in seconds)', dl.utf16 && lines[0].startsWith('Slide\tTitle\tPlanned (s)') && lines.length === 40 && /^2\tTitle in big letters\t30\t6\d\t3\d\t0 min 30 s\t1 min 0\d s/.test(lines[2]), JSON.stringify(lines[2]) + ' | ' + JSON.stringify(lines[17]));

    // themes
    await t.eval(`(() => { const s = document.getElementById('themeSelect'); s.value = 'Light'; s.dispatchEvent(new Event('change')); })()`);
    await t.waitFor(`getComputedStyle(document.documentElement).getPropertyValue('--color-background').trim() === '#f4f7f6'`, { label: 'Light theme applied' });
    t.check('Light theme applied', true);
    await t.eval(`(() => { const i = document.querySelectorAll('#colorPickers input')[5]; i.value = '#aa3300'; i.dispatchEvent(new Event('input')); })()`);
    t.check('picker change shows Custom', (await t.eval(`document.getElementById('themeSelect').value`)) === '');
    await t.eval(`document.getElementById('themeName').value = 'Rust'; document.getElementById('btnSaveTheme').click()`);
    t.check('save theme', (await t.eval(`document.getElementById('themeSelect').value`)) === 'Rust' && !(await t.eval(`document.getElementById('btnDeleteTheme').disabled`)));
    await t.eval(`document.getElementById('btnExportTheme').click()`);
    dl = await lastDownload(t, 4); data = JSON.parse(dl.text);
    t.check('export theme', data.type === 'presentation-theme' && data.name === 'Rust' && data.colors['--color-accent'] === '#aa3300' && data.colors['--color-background'] === '#f4f7f6', dl.name);
    await t.eval(`document.getElementById('btnDeleteTheme').click()`);
    t.check('delete theme returns to file theme', (await t.eval(`document.getElementById('themeSelect').value`)) === 'Dark');
    await importJson(t, 'rust.json', data);
    await t.waitFor(`document.getElementById('themeSelect').value === 'Rust' && getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim() === '#aa3300'`, { label: 'theme imported' });
    t.check('import theme', true);
    await importJson(t, 'bad.json', { hello: 1 });
    await t.waitFor(`(document.querySelector('.toast')?.textContent || '').includes('Import failed')`, { label: 'import failed toast' });
    t.check('unknown file rejected', true);

    // time plan import + realized as plan
    await importJson(t, 'plan.json', { type: 'presentation-time-plan', slides: [{ name: 'numbers', seconds: 99 }, { name: 'nope', seconds: 5 }] });
    try { await t.waitFor(`document.querySelectorAll('#estimateInputs input')[10].value === '1:39'`); t.check('import time plan', true); }
    catch { t.check('import time plan', false, await toast(t)); }
    await importJson(t, 'report.json', report);
    await t.waitFor(`document.querySelectorAll('#estimateInputs input')[1].value.startsWith('1:0')`, { label: 'report imported as plan' });
    t.check('import realized file as plan', true);
    await t.eval(`document.getElementById('btnResetEstimates').click()`);
    await t.eval(`document.getElementById('btnUseRealizedTimes').click()`);
    await t.waitFor(`document.querySelectorAll('#estimateInputs input')[1].value.startsWith('1:0')`);
    t.check('use realized times button', true);

    // save a copy with the settings baked in
    await t.eval(`document.getElementById('btnSaveCopy').click()`);
    dl = await lastDownload(t, 5);
    const copy = dl.text;
    const themesBlock = JSON.parse(copy.match(/<script type="application\/json" id="deckThemes">([\s\S]*?)<\/script>/)[1]);
    t.check('copy has themes and active', themesBlock.active === 'Rust' && !!themesBlock.themes['Rust'] && !!themesBlock.themes['Light'], dl.name + ' ' + Math.round(copy.length / 1024) + ' KB');
    t.check('copy has realized plan in data-estimate', /data-name="big-letters"[^>]*data-estimate="6[4-8]"/.test(copy));
    t.check('copy has its own deck id', /data-deck-id="presentation-copy-[a-z0-9]+"/.test(copy));
    t.check('copy is pristine', !copy.includes('<div class="presenter-view') && !/class="scene[^"]*is-active/.test(copy) && copy.includes('class="stage no-transitions"') && copy.startsWith('<!doctype html>'));
    t.check('no page errors (settings)', t.errors.length === 0, t.errors.join(' | '));

    // a fresh browser opening the saved copy starts in the saved theme with the saved plan
    const copyFile = join(dir, 'copy.html');
    writeFileSync(copyFile, copy);
    await t.send('Page.navigate', { url: pathToFileURL(copyFile).href + '#title' });
    await t.waitFor(LOADED, { timeout: 15000 });
    await t.eval(`localStorage.clear()`); await t.send('Page.reload');
    await t.waitFor(LOADED, { timeout: 15000 });
    t.check('copy starts in saved theme (fresh storage)', (await t.eval(`getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim()`)) === '#aa3300');
    t.check('copy starts with saved plan', (await t.eval(`document.querySelector('[data-name=big-letters]').dataset.estimate`)) >= 64);
    await t.eval(`localStorage.clear()`);

    // ================= templates =================
    await open(t, '?templates=1#template-title');
    t.check('templates appended', (await t.eval(`document.querySelectorAll('#stage .scene').length`)) === 58);   // 38 slides + 20 templates (v201: question, answer on a click) (v170: Title and bullet points)
    await open(t, '#start?templates=1');
    t.check('templates flag also works after the #slide part', (await t.eval(`document.querySelectorAll('#stage .scene').length`)) === 58);   // 38 slides + 20 templates (v170: Title and bullet points)
    await open(t, '?templates=1#template-title');
    await go(t, 'template-bullets');
    const revealed = () => t.eval(`document.querySelectorAll('[data-name=template-bullets] .is-revealed').length`);
    t.check('bullets start hidden', (await revealed()) === 0);
    await next(t); await next(t);
    t.check('two clicks reveal two', (await revealed()) === 2);
    await next(t);
    await next(t);
    await waitSlide(t, 'template-cards');
    t.check('next click moves on', true);
    await t.key(...LEFT);
    await t.waitFor(`document.querySelectorAll('[data-name=template-bullets] .is-revealed').length === 3`, { label: 'Back shows all revealed' });
    t.check('Back shows all revealed', true);
    await go(t, 'template-process');
    await openPresenter(t);
    t.check('presenter cue names the step', (await t.eval(`document.querySelector('.presenter-cue').textContent`)).includes('Step one'), await t.eval(`document.querySelector('.presenter-cue').textContent`));
    t.check('no page errors (templates)', t.errors.length === 0, t.errors.join(' | '));

  } finally {
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

async function partChecks(t) {
  const { ev, slideOf, waitSlide, isShown, showing, hidden, go, next, open, openPresenter, closeAudiences, typeKeys, lastDownload, importJson, field, searchTexts, textsTab, toast, audienceWindow } = tools(t);
  try {
    // ================= check row, Slides drawer, safety net, Texts drawer (templates, presenter view + audience window) =================
    await open(t, '?templates=1#title');
    t.check('settings title from the interface texts', (await t.eval(`document.getElementById('settingsTitle').textContent`)) === 'Settings');
    t.check('controls aria-label from the interface texts', (await t.eval(`document.getElementById('btnNext').getAttribute('aria-label')`)) === 'Next');
    t.check('no element left without its text', (await t.eval(`[...document.querySelectorAll('[data-ui]')].filter(e => !e.textContent.trim()).length`)) === 0, await t.eval(`[...document.querySelectorAll('[data-ui]')].filter(e => !e.textContent.trim()).map(e => e.dataset.ui).join(',')`));

    // backup slides
    const total = await t.eval(`document.querySelectorAll('#chapterBar button').length`);
    const sceneCount = await t.eval(`document.querySelectorAll('#stage .scene').length`);
    t.check('backup slide has no segment in the bottom bar', total === sceneCount - 1, total + ' segments, ' + sceneCount + ' slides');
    await t.key('End', 'End', 35);
    await waitSlide(t, 'template-break');
    t.check('End goes to the last slide of the talk, not the backup', true);
    for (let i = 0; i < 6; i++) await next(t);
    t.check('Next never goes into a backup slide', (await slideOf(t)) === 'template-break');
    t.check('counter on the last slide', (await t.eval(`document.getElementById('slideCounter').textContent`)) === (total + ' / ' + total));

    // presenter view and the check row
    await t.key('Home', 'Home', 36); await waitSlide(t, 'title');
    await openPresenter(t);
    let a = await audienceWindow(null);
    const checksText = () => t.eval(`document.querySelector('.presenter-checks')?.textContent || ''`);
    const checksHave = (re, timeout = 12000) => t.waitFor(`${re}.test(document.querySelector('.presenter-checks')?.textContent || '')`, { timeout, label: 'check row ' + re });
    const clickReconnect = () => t.click('.presenter-checks button[data-action="reconnect"]');
    await t.waitFor(`[...document.querySelectorAll('.presenter-checks .check')].some(c => c.classList.contains('is-ok') && c.textContent.startsWith('Audience'))`, { timeout: 8000, label: 'audience connected' });
    t.check('check row: audience connected', true);
    await checksHave(/Fonts/); t.check('check row: fonts ok', true);
    await checksHave(/full screen|Full screen/); t.check('check row reports full screen state of the audience', true);

    // out of step: the audience moves without telling the presenter
    await a.eval(`(() => { const o = window.opener; window.opener = null; location.hash = '#numbers'; setTimeout(() => { window.opener = o; }, 200); })()`);
    await checksHave(/another slide/, 15000);
    t.check('check row: audience on another slide', true);
    await clickReconnect();
    await t.waitFor(`true`);
    await a.waitFor(`location.hash.slice(1) === ${q(await slideOf(t))}`, { label: 'audience resynced' });
    t.check('Resync brings the audience back', true);
    await t.waitFor(`!/another slide/.test(document.querySelector('.presenter-checks')?.textContent || '')`);
    t.check('check row ok again after resync', true);

    // not responding: the audience window shows another page
    await a.send('Page.navigate', { url: 'about:blank' });
    await checksHave(/not responding/, 20000);
    t.check('check row: audience not responding', true);
    await clickReconnect();
    a = await audienceWindow(a);
    await checksHave(/^Audience/, 15000);
    t.check('Reconnect reopens the audience window', true);
    t.check('check row ok after reconnect', !/not responding|closed/.test(await checksText()), await checksText());

    // closed
    await a.eval(`window.close()`);
    await checksHave(/closed/, 10000);
    t.check('check row: audience window closed with an Open button', await t.eval(`!!document.querySelector('.presenter-checks button')`), await checksText());
    await clickReconnect();
    a = await audienceWindow(null);
    await checksHave(/^Audience/, 15000);
    t.check('Open brings the audience window back', !/closed/.test(await checksText()), await checksText());
    await a.waitFor(`!!document.querySelector('#stage .scene.is-active')`);

    // Slides drawer (G)
    await t.mouse('mouseMoved', 700, 400);
    t.check('Slides and Texts drawers hidden at first', !(await isShown(t, '.slides-drawer')) && !(await isShown(t, '.texts-drawer')));
    await t.mouse('mouseMoved', 6, 250);
    await showing(t, '.slides-drawer');
    t.check('hovering the upper left edge opens Slides', !(await isShown(t, '.texts-drawer')));
    const cards = await t.eval(`document.querySelectorAll('.slide-card').length`);
    t.check('Slides drawer shows every slide', cards === sceneCount, cards + ' cards');
    t.check('Slides drawer has a backup heading', (await t.eval(`document.querySelector('.slide-grid-heading')?.textContent`)) === 'Backup slides');
    const scale = await t.eval(`parseFloat(document.querySelector('.slide-card-stage').style.transform.slice(6))`);
    t.check('slide pictures are scaled down', scale > .05 && scale < .3, String(scale));
    await t.eval(`document.querySelectorAll('.slide-card')[11].click()`);
    await waitSlide(t, 'mindset'); await waitSlide(a, 'mindset');
    t.check('a click on a picture goes to that slide (both windows)', true);
    await t.mouse('mouseMoved', 1350, 400);
    await hidden(t, '.slides-drawer');
    t.check('the drawer closes after the click', true);
    await t.key('g', 'KeyG', 71);
    await showing(t, '.slides-drawer');
    t.check('G keeps the Slides drawer open', true);
    t.check('current slide marked in the drawer', (await t.eval(`document.querySelector('.slide-card.is-current')?.dataset.index`)) === '11');
    await t.eval(`document.querySelectorAll('.slide-card')[${sceneCount - 1}].click()`);
    await waitSlide(t, 'template-backup'); await waitSlide(a, 'template-backup');
    t.check('backup slide opened from the drawer', true);
    t.check('counter says Backup 1 / 1', (await t.eval(`document.getElementById('slideCounter').textContent`)) === 'Backup 1 / 1');
    t.check('cue on the last backup slide', (await t.eval(`document.querySelector('.presenter-cue').textContent`)) === 'Last backup slide');
    await next(t);
    t.check('Next on the last backup slide stays', (await slideOf(t)) === 'template-backup');
    await t.key(...LEFT);
    await waitSlide(t, 'mindset'); await waitSlide(a, 'mindset');
    t.check('Back returns to the slide you came from (both windows)', true);

    // safety net: a broken slide script never stops the talk
    await t.key('Home', 'Home', 36); await waitSlide(t, 'title');
    await t.eval(`document.querySelectorAll('#swimlanes .flow-step').forEach(e => e.remove())`);
    await t.eval(`location.hash = '#flow'`);
    await checksHave(/script error/, 8000);
    t.check('broken slide: the error is in the check row', true);
    await t.waitFor(`/keep working/.test(document.querySelector('.toast')?.textContent || '')`, { label: 'safety-net toast' });
    t.check('broken slide: a toast says the talk goes on', true);
    await t.settle();
    await t.key(...RIGHT);
    try { await waitSlide(t, 'chart'); t.check('broken slide: Next still works', true); } catch { t.check('broken slide: Next still works', false, await slideOf(t)); }
    t.check('audience window never shows the error toast', !(await a.eval(`!!document.querySelector('.toast')`)));
    // reload the presenter: back to a clean page (a new audience window follows)
    await closeAudiences(); await t.eval(`location.reload()`);
    await t.waitFor(`document.readyState !== 'loading' && !!document.querySelector('#stage .scene.is-active') && !document.querySelector('.presenter-view')`, { timeout: 15000 });
    await openPresenter(t);
    a = await audienceWindow(a);
    t.errors.length = 0; a.errors.length = 0;
  } finally { /* the tab is closed by the caller */ }
}

async function partTexts(t) {
  const { ev, slideOf, waitSlide, isShown, showing, hidden, go, next, open, openPresenter, closeAudiences, typeKeys, lastDownload, importJson, field, searchTexts, textsTab, toast, audienceWindow } = tools(t);
  try {
    await open(t, '?templates=1#title');
    await openPresenter(t);
    let a = await audienceWindow(null);
    t.errors.length = 0;

    // Texts drawer (T)
    await go(t, 'numbers');
    await t.mouse('mouseMoved', 700, 400);
    await t.mouse('mouseMoved', 6, 650);
    await showing(t, '.texts-drawer');
    t.check('hovering the lower left edge opens Texts', !(await isShown(t, '.slides-drawer')));
    await t.waitFor(`[...document.querySelectorAll('.texts-list textarea')].some(t => t.value === 'Period · source')`, { label: 'texts of the numbers slide' });
    const rows = await t.eval(`[...document.querySelectorAll('.texts-list .text-row')].map(r => r.querySelector('.text-row-where').textContent + ': ' + r.querySelector('textarea').value)`);
    t.check('This slide lists the texts of the slide', rows.some(r => r.includes('The numbers')) && rows.some(r => r.startsWith('Number') && r.endsWith('42')) , rows.slice(0, 4).join(' | '));   // (v153: the deck's speaker notes are empty, so no Notes row)
    const eyebrowIndex = await t.eval(`[...document.querySelectorAll('.texts-list textarea')].findIndex(t => t.value === 'Period · source')`);
    await t.eval(`document.querySelectorAll('.texts-list textarea')[${eyebrowIndex}].focus()`);
    t.check('the text being edited is outlined on the slide', await t.eval(`!!document.querySelector('.scene.is-active .eyebrow.is-text-target')`));
    await t.eval(`document.querySelectorAll('.texts-list textarea')[${eyebrowIndex}].select()`);
    await typeKeys(t, 'Spring 2026 bl');
    const eyebrow = w => w.eval(`document.querySelector('[data-name="numbers"] .eyebrow').textContent`);
    await a.waitFor(`document.querySelector('[data-name="numbers"] .eyebrow').textContent === 'Spring 2026 bl'`, { label: 'typed text in audience' });
    t.check('typed text shows on the slide', (await eyebrow(t)) === 'Spring 2026 bl', await eyebrow(t));
    t.check('typed text shows in the audience window', true);
    t.check('typing letters never triggers deck keys (b = black, l = spotlight)', !(await t.eval(`document.getElementById('deck').classList.contains('is-blank') || document.getElementById('stage').classList.contains('is-spotlight')`)));
    for (let i = 0; i < 3; i++) await t.key('Backspace', 'Backspace', 8);
    await t.waitFor(`document.querySelector('[data-name="numbers"] .eyebrow').textContent === 'Spring 2026'`);
    t.check('Backspace edits the text, not Back', (await slideOf(t)) === 'numbers');
    await t.key(...ESC);
    await t.waitFor(`document.activeElement.tagName !== 'TEXTAREA'`);
    t.check('Esc leaves the field (the presenter view stays)', await t.eval(`!!document.querySelector('.presenter-view')`));
    t.check('change saved in this browser', (await t.eval(`JSON.parse(localStorage.getItem('presentation-deck.slideTexts'))['numbers#1'].text`)) === 'Spring 2026');
    t.check('changed row marked', await t.eval(`document.querySelectorAll('.texts-list .text-row')[${eyebrowIndex}].classList.contains('is-changed')`));
    // number
    const numberIndex = await t.eval(`[...document.querySelectorAll('.texts-list textarea')].findIndex(t => t.value === '42')`);
    await t.eval(field(numberIndex, '5x', false));
    await t.waitFor(`document.querySelectorAll('.texts-list .text-row')[${numberIndex}].classList.contains('is-invalid')`);
    t.check('a wrong number is refused', (await a.eval(`document.querySelector('[data-name="numbers"] .count-up').dataset.to`)) === '42');
    await t.eval(field(numberIndex, '52.5'));
    await a.waitFor(`document.querySelector('[data-name="numbers"] .count-up').dataset.to === '52.5'`);
    await t.waitFor(`document.querySelector('[data-name="numbers"] .count-up').textContent === '52.5'`);
    t.check('a number counts up to the new value (both windows)', true);
    // PageDown while typing still moves the slide
    await t.eval(`document.querySelectorAll('.texts-list textarea')[0].focus()`);
    await t.key(...PGDN);
    try { await waitSlide(t, 'mindset'); t.check('PageDown while typing leaves the field and goes on', true); } catch { t.check('PageDown while typing leaves the field and goes on', false, await slideOf(t)); }
    await t.waitFor(`[...document.querySelectorAll('.texts-list textarea')].some(t => t.value.startsWith('What option 1 means'))`);
    t.check('This slide follows the slide on screen', true);
    const stepIndex = await t.eval(`[...document.querySelectorAll('.texts-list textarea')].findIndex(t => t.value.startsWith('What option 1 means'))`);
    await t.eval(field(stepIndex, 'We do it all by hand.'));
    await t.waitFor(`document.getElementById('modeDescription').textContent === 'We do it all by hand.'`);
    await a.waitFor(`document.getElementById('modeDescription').textContent === 'We do it all by hand.'`);
    t.check('a click-step text shows at once (both windows)', true);
    // chapter title
    await textsTab(t, 'all');
    await t.waitFor(`document.querySelectorAll('.texts-list .text-row').length > 150`);
    t.check('All slides lists every slide text', true);
    await searchTexts(t, 'The road');
    await t.waitFor(`[...document.querySelectorAll('.texts-list .text-row')].some(r => r.querySelector('.text-row-where').textContent === 'Chapter title')`);
    t.check('search finds the chapter title', true);
    const titleIndex = await t.eval(`[...document.querySelectorAll('.texts-list .text-row')].findIndex(r => r.querySelector('.text-row-where').textContent === 'Chapter title')`);
    await t.eval(field(titleIndex, 'The long road'));
    await t.waitFor(`document.querySelectorAll('.presenter-chapters button')[6].textContent.includes('The long road') && document.querySelectorAll('#chapterBar button')[6].getAttribute('aria-label') === '7. The long road'`);
    t.check('a chapter title changes the chapter list and the bottom bar', true);
    // typed words (attribute)
    await searchTexts(t, 'types itself');
    await t.waitFor(`[...document.querySelectorAll('.texts-list textarea')].some(f => f.value === 'types itself')`);
    await t.eval(`(() => { const t = [...document.querySelectorAll('.texts-list textarea')].find(f => f.value === 'types itself'); t.focus(); t.value = 'stay current'; t.dispatchEvent(new Event('input', { bubbles: true })); t.blur(); })()`);
    await t.eval(`location.hash = '#docs'`);
    await t.waitFor(`document.getElementById('typedText').textContent === 'stay current'`, { timeout: 10000 });
    await a.waitFor(`document.getElementById('typedText').textContent === 'stay current'`, { timeout: 10000 });
    t.check('typed-out words use the new text (both windows)', true);
    // interface text
    await textsTab(t, 'interface');
    await searchTexts(t, 'presenter.pause');
    await t.waitFor(`document.querySelectorAll('.texts-list textarea').length >= 1`);
    await t.eval(`(() => { const t = document.querySelector('.texts-list textarea'); t.focus(); t.value = 'Pauze'; t.dispatchEvent(new Event('input', { bubbles: true })); t.blur(); })()`);
    await t.waitFor(`document.querySelector('.presenter-pause').textContent === 'Pauze'`);
    t.check('an interface text changes the button at once', true);
    // reload: the changes stay
    await closeAudiences(); await t.eval(`location.reload()`);
    await t.waitFor(`document.readyState === 'complete' && document.querySelector('[data-name="numbers"] .eyebrow')?.textContent === 'Spring 2026'`, { timeout: 15000, label: 'reloaded with the changes' });
    t.check('changes stay after a reload', (await t.eval(`document.querySelector('[data-name="timeline"]').dataset.title`)) === 'The long road');
    await openPresenter(t);
    t.check('changed interface text after a reload', (await t.eval(`document.querySelector('.presenter-pause')?.textContent`)) === 'Pauze');
    a = await audienceWindow(a);

    // Save a copy: the changes are written into the file
    await t.eval(CAPTURE);
    await t.key('t', 'KeyT', 84);
    await showing(t, '.texts-drawer');
    await t.eval(`document.querySelector('.texts-actions [data-action="save-copy"]').click()`);
    const copyDownload = await lastDownload(t, 1);
    t.check('Save a copy from the Texts drawer downloads the file', copyDownload.name === 'Presentation.html', copyDownload.name);
    const text = copyDownload.text;
    t.check('copy has the changed slide text in its HTML', text.includes('<div class="eyebrow reveal" style="--order:0">Spring 2026</div>'));
    t.check('copy has the changed chapter title and number', text.includes('data-title="The long road"') && text.includes('data-to="52.5"'));
    t.check('copy has the changed interface text in its table', /"presenter\.pause": "Pauze"/.test(text));
    t.check('copy has the typed-out words', text.includes('aria-label="stay current" data-edit-attr="aria-label">stay current<'));
    // export, undo all, import
    await t.eval(`document.querySelector('.texts-actions [data-action="export"]').click()`);
    const exported = await lastDownload(t, 2);
    t.check('Export texts downloads one JSON file', /^presentation-texts-.*\.json$/.test(exported.name), exported.name);
    const exportedData = JSON.parse(exported.text);
    t.check('the export holds every slide text and the interface table', exportedData.type === 'presentation-texts' && exportedData.slides.length > 150 && exportedData.interface['presenter.pause'] === 'Pauze');
    await t.eval(`document.querySelector('.texts-actions [data-action="reset"]').click()`);
    await t.waitFor(`document.querySelector('[data-name="numbers"] .eyebrow').textContent === 'Period · source' && localStorage.getItem('presentation-deck.slideTexts') === null`);
    await a.waitFor(`document.querySelector('[data-name="numbers"] .eyebrow').textContent === 'Period · source'`);
    t.check('Undo all text changes restores the slides (both windows)', (await t.eval(`document.querySelector('.presenter-pause').textContent`)) !== 'Pauze');
    await importJson(t, 'texts.json', exportedData);
    try {
      await t.waitFor(`document.querySelector('[data-name="numbers"] .eyebrow').textContent === 'Spring 2026' && document.querySelector('.presenter-pause').textContent === 'Pauze'`);
      t.check('Import of the texts file brings the changes back', true);
    } catch { t.check('Import of the texts file brings the changes back', false, await toast(t)); }
    await t.eval(`document.querySelector('.texts-actions [data-action="reset"]').click()`);
    await t.waitFor(`localStorage.getItem('presentation-deck.slideTexts') === null`);
    t.check('no page errors (check row, drawers, texts)', t.errors.length === 0, t.errors.join(' | ').slice(0, 600));
  } finally { /* the tab is closed by the caller */ }
}

async function partExtras(t) {
  const { ev, slideOf, waitSlide, isShown, showing, hidden, go, next, open, openPresenter, closeAudiences, typeKeys, lastDownload, importJson, field, searchTexts, textsTab, toast, audienceWindow } = tools(t);
  try {
    let a = null;
    // ================= transitions, break, QR, video, morph, agenda, effects, chart, images, captions, booth =================
    await t.send('Page.addScriptToEvaluateOnNewDocument', { source: SPEECH });
    await t.open('title');
    await open(t, '?templates=1&motion=1#title');

    await go(t, 'template-break');
    t.check('transition per slide: fade on the break slide', (await t.eval(`document.getElementById('stage').dataset.transition`)) === 'fade');
    await go(t, 'template-agenda');
    t.check('transition per slide: zoom on the agenda', (await t.eval(`document.getElementById('stage').dataset.transition`)) === 'zoom');
    await go(t, 'template-title');
    t.check('no transition attribute: the default', (await t.eval(`document.getElementById('stage').dataset.transition`)) === '');

    await openPresenter(t);
    a = await audienceWindow(null);

    // break timer
    await go(t, 'template-break');
    const backAt = await t.eval(`document.querySelector('[data-name=template-break] .break-time').textContent`);
    const left1 = await t.eval(`document.querySelector('[data-name=template-break] .break-countdown').textContent`);
    t.check('break: "Back at" shows a 24-hour time', /^([01]\d|2[0-3]):[0-5]\d$/.test(backAt), backAt);
    t.check('break: same end time in the audience window', (await a.eval(`document.querySelector('[data-name=template-break] .break-time').textContent`)) === backAt);
    t.check('break: countdown at most 10 minutes', /^(10:00|0\d:[0-5]\d)$/.test(left1), left1);
    try { await t.waitFor(`document.querySelector('[data-name=template-break] .break-countdown').textContent !== ${q(left1)}`, { timeout: 4000 }); t.check('break: the countdown runs', true); }
    catch { t.check('break: the countdown runs', false, left1); }
    await go(t, 'template-title'); await go(t, 'template-break');
    t.check('break: going back and forth keeps the end time', (await t.eval(`document.querySelector('[data-name=template-break] .break-time').textContent`)) === backAt);

    // QR code
    await go(t, 'template-qr');
    const qrPath = () => t.eval(`document.querySelector('[data-name=template-qr] .qr-code svg path')?.getAttribute('d').length || 0`);
    await t.waitFor(`(document.querySelector('[data-name=template-qr] .qr-code svg path')?.getAttribute('d').length || 0) > 500`, { label: 'QR drawn' });
    const qr1 = await qrPath();
    t.check('QR code drawn', qr1 > 500, String(qr1));
    await t.key('t', 'KeyT', 84);
    await t.waitFor(`[...document.querySelectorAll('.texts-list .text-row')].some(r => r.querySelector('.text-row-where').textContent === 'QR code link')`);
    t.check('Texts drawer lists the QR code link', true);
    const qrRow = await t.eval(`[...document.querySelectorAll('.texts-list .text-row')].findIndex(r => r.querySelector('.text-row-where').textContent === 'QR code link')`);
    await t.eval(field(qrRow, 'https://example.com/another-link-that-is-longer'));
    await a.waitFor(`document.querySelector('[data-name=template-qr] .qr-code').dataset.qr === 'https://example.com/another-link-that-is-longer'`);
    await t.waitFor(`(document.querySelector('[data-name=template-qr] .qr-code svg path')?.getAttribute('d').length || 0) !== ${qr1}`);
    t.check('a new QR link draws a new code (both windows)', true);
    await t.key('t', 'KeyT', 84);

    // video
    await go(t, 'template-video');
    const videoState = w => w.eval(`(() => { const v = document.querySelector('[data-name=template-video] video'); return { paused: v.paused, time: v.currentTime, muted: v.muted }; })()`);
    t.check('video waits for its click', (await videoState(t)).paused);
    t.check('cue says the click plays the video', (await t.eval(`document.querySelector('.presenter-cue').textContent`)) === 'plays the video');
    await t.key(...RIGHT);
    await t.waitFor(`(() => { const v = document.querySelector('[data-name=template-video] video'); return !v.paused && v.currentTime > 0.3; })()`, { timeout: 8000, label: 'video plays' });
    await a.waitFor(`!document.querySelector('[data-name=template-video] video').paused`);
    t.check('video plays after the click (both windows)', true);
    t.check('the presenter view plays it without sound', (await videoState(t)).muted);
    await t.key(...RIGHT);
    await t.waitFor(`(() => { const v = document.querySelector('[data-name=template-video] video'); return v.paused && v.currentTime === 0; })()`, { label: 'video stopped and rewound' });
    t.check('leaving the slide stops and rewinds the video', true);

    // morph
    await go(t, 'template-morph-a');
    const watchMorph = w => w.eval(`window.__morph = null; new MutationObserver(() => { const o = { target: document.querySelectorAll('[data-name=template-morph-b] .is-morph-target').length, source: document.querySelectorAll('[data-name=template-morph-a] .is-morph-source').length, anim: document.querySelector('[data-name=template-morph-b] [data-morph=morph-card-1]').getAnimations().length }; if (o.target > 0 && !window.__morph) window.__morph = o; }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] }); true`);
    await watchMorph(t); await watchMorph(a);
    await t.key(...RIGHT);
    const morphing = await t.waitFor(`window.__morph`, { label: 'morph running' });
    t.check('morph: matching elements glide (title and two cards)', morphing.target === 3 && morphing.source === 3 && morphing.anim > 0, JSON.stringify(morphing));
    try { await a.waitFor(`window.__morph && window.__morph.target === 3`, { timeout: 3000 }); t.check('morph also runs in the audience window', true); }
    catch { t.check('morph also runs in the audience window', false, JSON.stringify(await a.eval(`window.__morph`))); }
    await t.waitFor(`document.querySelectorAll('.is-morph-target, .is-morph-source').length + (document.getElementById('stage').classList.contains('is-morphing') ? 1 : 0) === 0`, { label: 'morph settled' });
    t.check('morph: everything settles afterwards', true);

    // agenda
    await go(t, 'template-agenda');
    await t.eval(`document.querySelectorAll('[data-name=template-agenda] .agenda-item')[2].click()`);
    await waitSlide(t, 'template-chart'); await waitSlide(a, 'template-chart');
    t.check('agenda: a click goes to the chapter (both windows)', true);
    t.check('agenda: the cue says Next goes back', (await t.eval(`document.querySelector('.presenter-cue').textContent`)) === 'goes back to the agenda');
    t.check('agenda: the preview shows the agenda at the chapter end', (await t.eval(`document.querySelector('.presenter-preview .scene')?.dataset.name`)) === 'template-agenda');
    await t.settle();
    await t.key(...RIGHT);
    await waitSlide(t, 'template-agenda'); await waitSlide(a, 'template-agenda');
    t.check('agenda: Next at the end of the chapter goes back to the agenda (both windows)', true);
    await t.waitFor(`document.querySelectorAll('[data-name=template-agenda] .agenda-item')[2].classList.contains('is-visited')`);
    await a.waitFor(`document.querySelectorAll('[data-name=template-agenda] .agenda-item')[2].classList.contains('is-visited')`);
    t.check('agenda: the chapter is marked as visited (both windows)', true);
    await t.settle();
    await t.eval(`document.querySelectorAll('[data-name=template-agenda] .agenda-item')[0].click()`);
    await waitSlide(t, 'template-cards'); await t.settle();
    const titleOpacity = await t.eval(`getComputedStyle(document.querySelector('[data-name=template-cards] h2')).opacity`);
    t.check('morph: the glided title stays visible (no second entrance)', titleOpacity === '1', titleOpacity);
    await t.key(...LEFT);
    await waitSlide(t, 'template-agenda');
    t.check('agenda: Back on the chapter\'s first slide returns to the agenda', true);
    await t.settle();
    await t.key(...RIGHT);
    await waitSlide(t, 'template-effects');
    t.check('agenda: Next on the agenda itself goes on as usual', true);

    // click effects
    await t.settle();
    const effectRows = () => t.eval(`[...document.querySelectorAll('[data-name=template-effects] li')].map(li => li.classList.contains('is-revealed'))`);
    const effectCss = (i, prop) => t.eval(`getComputedStyle(document.querySelectorAll('[data-name=template-effects] li')[${i}]).${prop}`);
    t.check('effects: highlight, strike and fade-out items show from the start', await t.eval(`[...document.querySelectorAll('[data-name=template-effects] li')].slice(3).every(li => getComputedStyle(li).opacity === '1')`));
    for (let i = 0; i < 3; i++) await next(t);
    t.check('effects: cue for the highlight click', (await t.eval(`document.querySelector('.presenter-cue').textContent`)).startsWith('highlights'));
    await next(t);
    const color0 = await effectCss(0, 'color');
    await t.waitFor(`getComputedStyle(document.querySelectorAll('[data-name=template-effects] li')[3]).color !== ${q(color0)}`, { label: 'highlight colour' });
    t.check('effects: highlight turns amber', true);
    await next(t); await next(t);
    await t.waitFor(`parseFloat(getComputedStyle(document.querySelectorAll('[data-name=template-effects] li')[5]).opacity) < .2`, { label: 'fade-out' });
    t.check('effects: fade-out fades', true);
    await next(t);
    await t.waitFor(`parseFloat(getComputedStyle(document.querySelectorAll('[data-name=template-effects] li')[6]).opacity) < .05`, { label: 'leave' });
    t.check('effects: leave (Disappears) is gone after its click', true);
    const done = await effectRows();
    t.check('effects: all seven clicks used', done.length === 7 && done.every(Boolean));
    t.check('effects: still copies show fade-out and leave faded', (await t.eval(`(() => { const box = document.createElement('div'); box.className = 'still-slide'; const s = document.querySelector('[data-name=template-effects]').cloneNode(true); box.appendChild(s); document.body.appendChild(box); const o = ['fade-out', 'leave'].map(e => getComputedStyle(s.querySelector('[data-reveal-effect=' + e + ']')).opacity); box.remove(); return o.join(','); })()`)) === '0.12,0.12');
    t.check('effects: still copies show the strike end state', (await t.eval(`(() => { const box = document.createElement('div'); box.className = 'still-slide'; const li = document.querySelector('[data-name=template-effects] [data-reveal-effect=strike]').closest('section').cloneNode(true); box.appendChild(li); document.body.appendChild(box); const size = getComputedStyle(li.querySelector('[data-reveal-effect=strike]')).backgroundSize; box.remove(); return size; })()`)) === '100% 4px');

    // chart
    await go(t, 'template-chart');
    const bars = () => t.eval(`[...document.querySelectorAll('[data-name=template-chart] .chart-bar')].map(r => Math.round(+r.getAttribute('height')))`);
    await t.waitFor(`document.querySelectorAll('[data-name=template-chart] .chart-bar').length === 4`);
    const bars1 = await bars();
    t.check('chart: one bar per table row', bars1.length === 4, JSON.stringify(bars1));
    t.check('chart: the highest value has the tallest bar', bars1[3] === Math.max(...bars1));
    await t.key('t', 'KeyT', 84);
    await t.waitFor(`[...document.querySelectorAll('.texts-list textarea')].some(t => t.value === '34')`);
    const cellRow = await t.eval(`[...document.querySelectorAll('.texts-list textarea')].findIndex(t => t.value === '34')`);
    await t.eval(field(cellRow, '120'));
    await t.waitFor(`(() => { const h = [...document.querySelectorAll('[data-name=template-chart] .chart-bar')].map(r => Math.round(+r.getAttribute('height'))); return h[0] === Math.max(...h) && h[0] !== ${bars1[0]}; })()`, { label: 'chart redrawn' });
    t.check('chart: a changed number redraws the chart', true);
    await t.eval(`document.querySelector('.texts-actions [data-action="reset"]').click()`);

    // image swap
    await go(t, 'product');
    await textsTab(t, 'images');
    await t.waitFor(`document.querySelectorAll('.texts-list .image-row').length > 0`);
    const imageRows = await t.eval(`document.querySelectorAll('.texts-list .image-row').length`);
    t.check('Images tab lists the logo and the slide images', imageRows === 7, String(imageRows));   // (v149: two more screenshots on slide 12, one more on slide 13)
    const originalSrc = await t.eval(`document.querySelector('[data-name=product] .screenshot img').getAttribute('src').slice(0, 40)`);
    await t.eval(`(async () => {
      const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 200; const c = canvas.getContext('2d'); c.fillStyle = '#c0453a'; c.fillRect(0, 0, 320, 200);
      const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
      const file = new File([blob], 'red.png', { type: 'image/png' });
      const target = document.querySelector('[data-name=product] .screenshot img');
      const data = new DataTransfer(); data.items.add(file);
      target.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: data }));
      target.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: data }));
    })()`);
    const imgSrc = w => w.eval(`document.querySelector('[data-name=product] .screenshot img').getAttribute('src').slice(0, 22)`);
    try { await t.waitFor(`document.querySelector('[data-name=product] .screenshot img').getAttribute('src').startsWith('data:image/png;base64,')`); t.check('dropping an image file onto a slide image replaces it', true); }
    catch { t.check('dropping an image file onto a slide image replaces it', false, await imgSrc(t) + ' (was ' + originalSrc + ')'); }
    try { await a.waitFor(`document.querySelector('[data-name=product] .screenshot img').getAttribute('src').startsWith('data:image/png;base64,')`, { timeout: 3000 }); t.check('the audience window shows the new image', true); }
    catch { t.check('the audience window shows the new image', false, await imgSrc(a)); }
    t.check('the Images tab marks it as changed', (await t.eval(`document.querySelectorAll('.texts-list .image-row.is-changed').length`)) === 1);
    await t.eval(CAPTURE);
    await t.eval(`document.querySelector('.texts-actions [data-action="save-copy"]').click()`);
    const imgCopy = await lastDownload(t, 1);
    t.check('Save a copy writes the new image into the file (ASSETS block)', /<img data-asset="img\/product-image1[^"]*"/.test(imgCopy.text) && /"img\/product-image1[^"]*": "data:image\/png;base64,/.test(imgCopy.text), (imgCopy.text.match(/<img data-asset="[^"]*"/g) || []).join(' '));
    await closeAudiences(); await t.eval(`location.reload()`);
    await t.waitFor(`document.readyState === 'complete' && !!document.querySelector('#stage .scene.is-active') && document.querySelector('[data-name=product] .screenshot img').getAttribute('src').startsWith('data:image/png;base64,')`, { timeout: 15000, label: 'swapped image after reload' });
    t.check('the swapped image stays after a reload', true);
    await openPresenter(t);
    a = await audienceWindow(a);
    await t.key('t', 'KeyT', 84);
    await showing(t, '.texts-drawer');
    await textsTab(t, 'images');
    await t.waitFor(`!!document.querySelector('.texts-list .image-row.is-changed .image-row-reset')`);
    await t.eval(`document.querySelector('.texts-list .image-row.is-changed .image-row-reset').click()`);
    await t.waitFor(`document.querySelector('[data-name=product] .screenshot img').getAttribute('src').slice(0, 40) === ${q(originalSrc)}`);
    await a.waitFor(`document.querySelector('[data-name=product] .screenshot img').getAttribute('src').slice(0, 40) === ${q(originalSrc)}`);
    t.check('↺ brings the original image back (both windows)', true);
    await t.key('t', 'KeyT', 84);

    // live captions (fake speech recognition)
    await t.key('s', 'KeyS', 83);
    await t.waitFor(`!document.getElementById('settingsPanel').hidden`);
    t.check('captions are off until switched on', !(await t.eval(`document.getElementById('captionsOn').checked`)));
    await t.eval(`document.getElementById('captionsOn').click()`);
    await t.waitFor(`document.querySelector('.live-captions')?.textContent === 'hello from the speaker'`, { label: 'captions' });
    t.check('captions show what is said (presenter)', true);
    await a.waitFor(`document.querySelector('.live-captions.is-shown')?.textContent === 'hello from the speaker'`);
    t.check('captions show in the audience window', true);
    await t.eval(`document.getElementById('captionsOn').click()`);
    await a.waitFor(`!document.querySelector('.live-captions.is-shown')`);
    t.check('captions off hides the bar', true);
    await t.key(...ESC);
    await t.waitFor(`document.getElementById('settingsPanel').hidden`);
    t.check('no page errors (extras)', t.errors.length === 0 && a.errors.length === 0, t.errors.concat(a.errors).join(' | ').slice(0, 600));

  } finally { /* the tab is closed by the caller */ }
}

async function partBooth(t) {
  const { ev, slideOf, waitSlide, isShown, showing, hidden, go, next, open, openPresenter, closeAudiences, typeKeys, lastDownload, importJson, field, searchTexts, textsTab, toast, audienceWindow } = tools(t);
  try {
    // Next pressed right after P, before the audience window has said hello, must not be undone by the audience's first messages
    await t.open('title');
    await t.eval(`window.__hello = false; window.addEventListener('message', e => { if (e.data && e.data.type === 'hello') window.__hello = true; })`);
    await t.key('p', 'KeyP', 80);
    await t.key(...RIGHT);
    const early = await t.eval(`window.__hello`);
    await t.waitFor(`window.__hello`, { timeout: 10000, label: 'audience hello' });
    const early_a = await audienceWindow(null);
    await waitSlide(early_a, 'big-letters');
    t.check('early Next (before the audience says hello) keeps both windows on slide 2', (await slideOf(t)) === 'big-letters' && (await slideOf(early_a)) === 'big-letters', (early ? 'hello was already there; ' : '') + await slideOf(t) + ' / ' + await slideOf(early_a));
    // the same after the audience window reloads by itself (F5 there): Next right away is not undone
    await t.eval(`window.__hello = false; true`);
    await early_a.send('Page.reload', {});
    await t.key('ArrowRight', 'ArrowRight', 39);
    await t.waitFor(`window.__hello`, { timeout: 10000, label: 'hello after the reload' });
    await waitSlide(t, 'agenda');
    await waitSlide(early_a, 'agenda');
    t.check('after the audience window reloads, an early Next is not undone', (await slideOf(t)) === 'agenda' && (await slideOf(early_a)) === 'agenda', await slideOf(t) + ' / ' + await slideOf(early_a));
    await closeAudiences();
    // booth mode
    await t.open('title');
    await t.key('s', 'KeyS', 83);
    await t.waitFor(`!document.getElementById('settingsPanel').hidden`);
    await t.eval(`(() => { const f = document.getElementById('boothSeconds'); f.value = '5'; f.dispatchEvent(new Event('change')); })()`);
    await t.eval(`document.getElementById('btnStartBooth').click()`);
    await t.waitFor(`document.getElementById('deck').classList.contains('is-booth') && document.getElementById('settingsPanel').hidden`);
    t.check('booth mode starts and hides the controls', true);
    await waitSlide(t, 'big-letters', 12000);
    t.check('booth mode goes on by itself', true);
    await t.key('x', 'KeyX', 88);
    await t.waitFor(`!document.getElementById('deck').classList.contains('is-booth')`);
    t.check('any key stops booth mode', true);
    await open(t, '?booth=5#thanks');
    await t.waitFor(`document.getElementById('deck').classList.contains('is-booth')`);
    t.check('?booth=5 starts booth mode from the address', true);
    await waitSlide(t, 'title', 15000);
    t.check('booth mode starts again after the last slide', true);
    t.check('no page errors (booth)', t.errors.length === 0, t.errors.join(' | ').slice(0, 600));
  } finally { /* the tab is closed by the caller */ }
}

