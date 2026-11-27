// The editor's working tools, in five parts (each starts on a clean editor at "numbers"): (1) zoom, more shapes with fill and
// outline, text style, picking a colour from the screen, copy / paste / duplicate / cut of several elements, how a group
// appears, dragging timeline bars, and fixes (scroll bar, zoom keys, speaker notes following clicks); (2) the Layers tab
// (select, hide, lock), copy style, speed, Ctrl+drag copy, panning; (3) line up, the corner handle, grid and snap, the
// Disappears effect; (4) element names, easing, copy appearance; (5) slide overview (drag to reorder), Layers filter,
// front / back keys, and the keys list entries of all parts.
export const covers = ['js/18-', 'js/19-', 'js/20-', 'css/13-'];
export const timeoutMs = 300000;   // (38 slides: more to load and walk through)

export default async function (t) {
  const q = JSON.stringify;
  const MODEL = `document.querySelector('.editor-slide-list li.is-selected .scene').outerHTML`;
  const SHAPES = `[...document.querySelectorAll('.editor-stage .scene > .shape')]`;
  const nth = n => `${SHAPES}[${n}]`;
  const STATS = `[...document.querySelectorAll('.editor-stage .scene .stat')]`;
  const SELECTED = `document.querySelector('.editor-stage .is-editor-selected')`;
  const ACTIVE_TAB = name => `document.querySelector('.editor-tabs [data-tab="${name}"]').classList.contains('is-selected')`;

  // ---- helpers
  const frames = (n = 2) => t.eval(`new Promise(r => { let i = ${n}; const f = () => --i ? requestAnimationFrame(f) : r(true); requestAnimationFrame(f); })`);
  /** A check on page state: waits (up to 2 s) for the expression to turn true, then records it; `extra` (an expression) is shown on failure. */
  async function ok(label, expr, extra) {
    let value = false;
    try { value = await t.waitFor(expr, { timeout: 2000 }); } catch { value = false; }
    let more = '';
    if (!value && extra) { try { more = JSON.stringify(await t.eval(extra)); } catch (error) { more = String(error.message).slice(0, 100); } }
    t.check(label, !!value, more);
  }
  const model = () => t.eval(MODEL);
  const toast = () => t.editor.toast();
  const panelSet = (selector, value) => t.editor.panelSet(selector, value);
  const tab = name => t.editor.tab(name);
  const blur = () => t.editor.blur();
  const undoKey = async () => { await blur(); await t.key('z', 'KeyZ', 90, 2); await frames(); };
  const undoButton = async () => { await t.eval(`document.querySelector('[data-action="undo"]').click()`); await frames(); };
  const clipboardEvent = (type, setup) => t.eval(`(() => { const dt = new DataTransfer(); ${setup || ''}; const e = new ClipboardEvent('${type}', { clipboardData: dt, bubbles: true, cancelable: true }); (document.activeElement || document.body).dispatchEvent(e); return { prevented: e.defaultPrevented, text: dt.getData('text/plain') }; })()`);
  /** Selects the element an expression gives (as a click would). */
  async function pickExpr(expr, shift = false) {
    await t.eval(`${expr}.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, shiftKey: ${shift} }))`);
    await t.waitFor(shift ? `document.querySelectorAll('.editor-group-box').length >= 2` : `${SELECTED} === ${expr}`);
  }
  /** Sets a free element's place (and width), waiting for each value to arrive in the slide. */
  async function setFree(x, y, w) {
    for (const [name, value] of [['--x', x], ['--y', y], ['--w', w]]) {
      if (value === undefined) continue;
      await panelSet(`[data-element-field="${name}"]`, String(value));
      await t.waitFor(`parseFloat(${SELECTED}.style.getPropertyValue('${name}')) === ${value}`);
    }
  }
  async function insertFree(kind, x, y, w) {
    await t.editor.insert(kind);
    await tab('element');
    await setFree(x, y, w);
  }
  const shapeCount = () => t.eval(`${SHAPES}.length`);
  const saved = () => t.eval(`JSON.parse(sessionStorage.getItem('test-written') || '[]').length`);
  /** Presses a button/keys that saves, waits for the file; returns its text. */
  async function saveAnd(action) {
    const before = await saved();
    await action();
    await t.waitFor(`JSON.parse(sessionStorage.getItem('test-written') || '[]').length > ${before}`, { label: 'file saved' });
    return t.eval(`JSON.parse(sessionStorage.getItem('test-written') || '[]').map(f => f.text).pop() || ''`);
  }
  const openKeys = async () => {
    await blur(); await t.key('?', 'Slash', 191, 8);
    await t.waitFor(`document.querySelector('.editor-shortcuts')?.textContent.length > 50`, { label: 'keys list' });
  };
  const closeDialog = async () => { await t.key('Escape', 'Escape', 27); await t.waitFor(`document.querySelector('.editor-dialog').hidden`); };
  /** A clean editor on a slide (own storage emptied, the page reloaded). */
  async function fresh(hash = 'numbers') {
    await t.eval(`window.__old = 1`);
    await t.open(hash, { clear: true });
    await t.waitFor(`!window.__old`);
    await t.key('e', 'KeyE', 69);
    await t.waitFor(`!!document.querySelector('.editor .editor-stage .scene') && !document.querySelector('.editor').hidden`, { label: 'editor open' });
  }
  /** Reloads the page and opens the editor again (its draft is kept in the browser). */
  async function reload() {
    await t.eval(`window.__old = 1`);
    await t.send('Page.reload', {});
    await t.waitFor(`!window.__old && document.readyState === 'complete' && !!document.querySelector('#stage .scene.is-active')`, { timeout: 15000, label: 'reloaded' });
    if (!(await t.eval(`!!document.querySelector('.editor') && !document.querySelector('.editor').hidden`))) await t.key('e', 'KeyE', 69);
    await t.waitFor(`!!document.querySelector('.editor-stage .scene') && !document.querySelector('.editor').hidden`, { label: 'editor open again' });
  }
  const zoomKey = async (key, code, keyCode) => { await blur(); await t.key(key, code, keyCode, 2); };
  const wheel = (x, y, deltaY) => t.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX: 0, deltaY, modifiers: 2 });
  const canvasMid = () => t.eval(`(() => { const r = document.querySelector('.editor-canvas-scroll').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
  const scale = () => t.editor.scale();

  // =====================================================================================================
  // 1. zoom, shapes, text style, colour picking, several elements, groups, timeline
  // =====================================================================================================
  await t.editor.open('numbers');
  t.check('E opens the editor on numbers', (await t.eval(`document.querySelector('.editor-stage .scene').dataset.name`)) === 'numbers');

  // ---- zoom
  const fitScale = await scale();
  await ok('zoom: the size shows under the canvas', `document.querySelector('.editor-zoom-level').textContent === '${Math.round(fitScale * 100)}%'`, `document.querySelector('.editor-zoom-level').textContent`);
  t.check('zoom: - is off when the slide fits', await t.eval(`document.querySelector('[data-action="zoom-out"]').disabled`));
  await t.editor.pick('.editor-stage .scene h2'); await blur();
  await t.key('=', 'Equal', 187, 2);
  await t.waitFor(`document.querySelector('.editor-stage').getBoundingClientRect().width / 1600 > ${fitScale * 1.2}`);
  const zoomed = await scale();
  t.check('Ctrl+= zooms the slide in (x1.25)', Math.abs(zoomed / fitScale - 1.25) < 0.02, `${fitScale} -> ${zoomed}`);
  t.check('a zoomed slide scrolls', await t.eval(`(() => { const a = document.querySelector('.editor-canvas-scroll'); return a.scrollWidth > a.clientWidth + 10; })()`));
  await ok('the selection outline stays on the element when zoomed', `(() => { const a = document.querySelector('.editor-selection').getBoundingClientRect(), b = ${SELECTED}.getBoundingClientRect(); return Math.abs(a.left - b.left) < 2 && Math.abs(a.top - b.top) < 2 && Math.abs(a.width - b.width) < 2; })()`);
  const area = await canvasMid();
  await wheel(area.x, area.y, -120);
  await t.waitFor(`document.querySelector('.editor-stage').getBoundingClientRect().width / 1600 > ${zoomed * 1.1}`, { label: 'Ctrl+wheel zooms' });
  const wheeled = await scale();
  t.check('Ctrl+wheel zooms in further', wheeled > zoomed * 1.1, `${zoomed} -> ${wheeled}`);
  t.check('the browser page itself is not zoomed', (await t.eval(`window.visualViewport.scale`)) === 1);
  await t.click('.editor-zoom [data-action="zoom-out"]');
  await ok('- zooms out', `document.querySelector('.editor-stage').getBoundingClientRect().width / 1600 < ${wheeled}`);
  await t.key('0', 'Digit0', 48, 2);
  await ok('Ctrl+0 fits the slide again', `Math.abs(document.querySelector('.editor-stage').getBoundingClientRect().width / 1600 - ${fitScale}) < 0.002 && (() => { const a = document.querySelector('.editor-canvas-scroll'); return a.scrollWidth <= a.clientWidth + 2; })()`);

  // ---- more shapes, fill and outline
  await t.editor.pick('.editor-stage .scene h2'); await tab('element');
  t.check('Insert lists triangle, star and speech bubble', await t.eval(`['triangle', 'star', 'callout'].every(k => document.querySelector('.editor-panel-body [data-insert-kind] option[value="' + k + '"]'))`));
  await t.editor.insert('star'); await tab('element');
  t.check('a star is inserted, placed freely', await t.eval(`!!document.querySelector('.editor-stage .scene > .shape[data-shape="star"].is-free polygon')`));
  await panelSet('[data-tool-field="shapeFill"]', '1');
  await panelSet('[data-tool-field="shapeStroke"]', '6px');
  await ok('Fill: solid is written into the slide', `/data-shape="star"[^>]*--shape-fill: 1/.test(${MODEL})`, `${MODEL}.match(/<div class="shape[^>]*>/)?.[0]`);
  await ok('Fill and Outline change the drawing', `(() => { const s = getComputedStyle(document.querySelector('.editor-stage .shape[data-shape="star"] polygon')); return s.fillOpacity === '1' && s.strokeWidth === '6px'; })()`);
  await t.editor.insert('callout'); await t.editor.insert('triangle');
  t.check('triangle and speech bubble inserted', (await shapeCount()) === 3);

  // ---- more text style
  await t.editor.pick('.editor-stage .scene h2'); await tab('element');
  for (const [field, value] of [['fontFamily', 'var(--font-mono)'], ['fontWeight', '400'], ['fontStyle', 'italic'], ['lineHeight', '1.5'], ['textTransform', 'uppercase']]) await panelSet(`[data-tool-field="${field}"]`, value);
  await ok('font, weight, slant, line height and capitals are written as plain CSS', `(() => { const h = ${MODEL}.match(/<h2[^>]*>/)[0]; return /font-family: var\\(--font-mono\\)/.test(h) && /font-weight: 400/.test(h) && /font-style: italic/.test(h) && /line-height: 1.5/.test(h) && /text-transform: uppercase/.test(h); })()`, `${MODEL}.match(/<h2[^>]*>/)[0]`);
  await ok('the panel shows the chosen values', `(() => { const b = document.querySelector('.editor-panel-body'); return b.querySelector('[data-tool-field="fontFamily"]').value === 'var(--font-mono)' && b.querySelector('[data-tool-field="textTransform"]').value === 'uppercase'; })()`);

  // ---- pick a colour from the screen
  await t.click('.editor-panel-body [data-action="pick-colour"]');
  await ok('Pick a colour: the element takes it', `/<h2[^>]*color: rgb\\(18, 171, 52\\)/.test(${MODEL})`, `${MODEL}.match(/<h2[^>]*>/)?.[0]`);
  await ok('Pick a colour: the panel shows it as own colour', `document.querySelector('.editor-panel-body [data-tool-field="colorCustom"]')?.value === '#12ab34'`);
  await t.eval(`window.__dropperWaits = true; window.__dropperOpened = 0; true`);
  await t.sleep(200);   // a pick ignores a new start for 150 ms after the last one ended (pickColour)
  await t.click('.editor-panel-body [data-action="pick-colour"]');
  await t.waitFor(`window.__dropperOpened === 1`, { label: 'the colour picker is open' });
  await t.key('Escape', 'Escape', 27); await frames(5);
  t.check('Esc that cancels the colour picker keeps the editor and the selection', await t.eval(`!document.querySelector('.editor').hidden && !!${SELECTED}`));
  await t.eval(`window.__dropperWaits = false`);
  await tab('slide');
  await t.sleep(300);   // a pick ignores a new start for 150 ms after the last one ended (a busy machine: more)
  await t.click('.editor-panel-body [data-action="pick-background"]');
  await ok('Pick a colour for the slide background', `/<section[^>]*background-color: rgb\\(18, 171, 52\\)/.test(${MODEL})`);
  await undoButton();

  // ---- several elements: copy, paste, duplicate, cut
  await tab('element');
  for (const [i, x, y] of [[0, 900, 560], [1, 100, 560], [2, 500, 700]]) { await pickExpr(nth(i)); await setFree(x, y); }
  await pickExpr(nth(0)); await pickExpr(nth(1), true); await pickExpr(nth(2), true);
  await blur();
  const copied = await clipboardEvent('copy');
  t.check('Copy with three selected: the clipboard names "3 elements" with its own id', copied.prevented && /^\[Presentation editor element\] 3 elements #\w+$/.test(copied.text), JSON.stringify(copied));
  const pasted = await clipboardEvent('paste', `dt.setData('text/plain', ${q(copied.text)})`);
  await t.waitFor(`${SHAPES}.length === 6`, { label: 'paste' }).catch(() => {});
  t.check('Paste puts all three back', pasted.prevented && (await shapeCount()) === 6);
  await ok('the pasted three are selected together', `document.querySelectorAll('.editor-group-box').length === 3`);
  const offsets = await t.eval(`(() => { const all = ${SHAPES}; const v = (s, n) => parseFloat(s.style.getPropertyValue(n)); return all.slice(3).map((s, i) => [v(s, '--x') - v(all[i], '--x'), v(s, '--y') - v(all[i], '--y')]); })()`);
  t.check('the pasted three sit 24 px off the originals, together', offsets.length === 3 && offsets.every(([dx, dy]) => dx === 24 && dy === 24), JSON.stringify(offsets));
  await blur(); await t.key('d', 'KeyD', 68, 2);
  await ok('Ctrl+D with three selected duplicates all three', `${SHAPES}.length === 9 && document.querySelectorAll('.editor-group-box').length === 3`);
  await blur();
  const cut = await clipboardEvent('cut');
  await ok('Cut with three selected removes all three', `${SHAPES}.length === 6`);
  t.check('Cut was handled (clipboard text taken)', cut.prevented);
  await t.editor.goSlide('thanks');
  await blur();
  await clipboardEvent('paste', `dt.setData('text/plain', ${q(cut.text)})`);
  await ok('the three paste onto another slide too', `${SHAPES}.length === 3`);
  await undoButton();
  await t.editor.goSlide('numbers');

  // ---- how a group appears
  const first3 = `${SHAPES}.slice(0, 3)`;
  await pickExpr(nth(0)); await pickExpr(nth(1), true); await pickExpr(nth(2), true);
  await t.click('.editor-panel-body [data-action="group-appear-sequence"]');
  await ok('One after another: in reading order with the slide', `(() => { const o = ${first3}.map(s => [s.classList.contains('reveal'), parseFloat(s.style.getPropertyValue('--order'))]); return o.every(x => x[0]) && o[1][1] + 1 === o[0][1] && o[0][1] + 1 === o[2][1]; })()`, `${first3}.map(s => [s.classList.contains('reveal'), s.style.getPropertyValue('--order')])`);
  const maxStep = await t.eval(`Math.max(0, ...[...document.querySelectorAll('.editor-stage .scene [data-reveal-step]')].filter(n => !${first3}.includes(n)).map(n => +n.getAttribute('data-reveal-step')))`);
  await t.click('.editor-panel-body [data-action="group-appear-clicks"]');
  await ok('Each on a click: new clicks after the slide\'s own, in reading order', `(() => { const s = ${first3}.map(x => [x.classList.contains('reveal'), +x.getAttribute('data-reveal-step'), x.style.getPropertyValue('--order')]); return s.every(x => !x[0] && !x[2]) && s[1][1] === ${maxStep + 1} && s[0][1] === ${maxStep + 2} && s[2][1] === ${maxStep + 3}; })()`, `${first3}.map(x => [x.className, x.getAttribute('data-reveal-step')])`);
  await t.click('.editor-panel-body [data-action="group-appear-together"]');
  await ok('Together on a click: one new click for all three', `${first3}.every(s => +s.getAttribute('data-reveal-step') === ${maxStep + 1})`, `${first3}.map(s => s.getAttribute('data-reveal-step'))`);
  t.check('the group stays selected', (await t.eval(`document.querySelectorAll('.editor-group-box').length`)) === 3);
  await tab('animations');
  await ok('the Animations tab shows them on that click', `[...document.querySelectorAll('.editor-panel-body h4')].filter(h => h.nextElementSibling && h.nextElementSibling.matches('.anim-row')).map(h => { let n = 0; for (let r = h.nextElementSibling; r && r.matches('.anim-row'); r = r.nextElementSibling) n++; return n; }).pop() === 3`);

  // ---- timeline: drag a bar
  await t.editor.pick('.editor-stage .scene h2'); await tab('animations');
  const bar = await t.eval(`(() => { const t = document.querySelector('.anim-track.is-draggable'); t.scrollIntoView({ block: 'center' }); const b = t.querySelector('.anim-bar').getBoundingClientRect(); return { x: b.x + Math.min(6, b.width / 2), y: b.y + b.height / 2, width: t.clientWidth, total: +t.dataset.total, stagger: +t.dataset.stagger, order: +t.dataset.order, path: t.dataset.path }; })()`);
  const dx = 2 * bar.stagger / bar.total * bar.width + 2;
  await t.drag(bar, dx, 0, { steps: 2, during: () => ok('while dragging, the order shows in the row', `new RegExp('order ${bar.order + 2}$').test(document.querySelector('.anim-row.is-dragging .anim-action')?.textContent || '')`, `document.querySelector('.anim-row.is-dragging .anim-action')?.textContent`) });
  await ok('dragging a bar two steps right: its order goes up by 2', `+document.querySelector('.anim-track[data-path="${bar.path}"]')?.dataset.order === ${bar.order + 2}`, `document.querySelector('.anim-track[data-path="${bar.path}"]')?.dataset.order`);
  await undoButton();
  await ok('Undo puts the order back', `+document.querySelector('.anim-track[data-path="${bar.path}"]')?.dataset.order === ${bar.order}`);
  // its own animation: the bar changes its delay
  await t.editor.pick('.editor-stage .scene h2'); await tab('element');
  await panelSet('[data-element-field="animation"]', 'preset:fade-in');
  await tab('animations');
  await t.waitFor(`!!document.querySelector('.anim-track[data-drag="delay"]')`).catch(() => {});
  const own = await t.eval(`(() => { const t = document.querySelector('.anim-track[data-drag="delay"]'); if (!t) return null; t.scrollIntoView({ block: 'center' }); const b = t.querySelector('.anim-bar').getBoundingClientRect(); return { x: b.x + 4, y: b.y + b.height / 2, width: t.clientWidth, total: +t.dataset.total, start: +t.dataset.start, path: t.dataset.path }; })()`);
  t.check('its own animation: the bar can be dragged (delay)', !!own);
  if (own) {
    await t.drag(own, 500 / own.total * own.width, 0, { steps: 1, modifiers: 1 });   // Alt: no pull to the other bars (v56)
    await ok('dragging it 500 ms right: the animation starts 500 ms later', `document.querySelector('.anim-track[data-path="${own.path}"]').title.includes('Starts at ${own.start + 500} ms')`, `document.querySelector('.anim-track[data-path="${own.path}"]').title`);
    await tab('element');
    t.check('the delay field of the animation shows it', (await t.eval(`+document.querySelector('.editor-panel-body [data-anim-field="delay"]').value`)) === own.start + 500);
  }

  // ---- review fixes
  await t.editor.goSlide('numbers');
  await clipboardEvent('paste', `dt.setData('text/plain', '[Presentation editor element] 3 elements')`);
  await ok('a marker without this copy\'s id does not paste the old copy', `/copy it again/.test(document.querySelector('.toast')?.textContent || '')`, `document.querySelector('.toast')?.textContent + ' | focus: ' + (document.activeElement?.outerHTML || '').slice(0, 120)`);
  // scroll bar on a zoomed canvas keeps the selection
  await t.editor.pick('.editor-stage .scene h2'); await blur();
  await t.key('=', 'Equal', 187, 2); await t.key('=', 'Equal', 187, 2);
  await t.waitFor(`document.querySelector('.editor-stage').getBoundingClientRect().width / 1600 > ${fitScale * 1.4}`);
  const sb = await t.eval(`(() => { const a = document.querySelector('.editor-canvas-scroll'); const r = a.getBoundingClientRect(); return { x: r.left + a.clientWidth + 6, y: r.top + 60 }; })()`);
  await t.drag(sb, 0, 40, { steps: 1 }); await frames();
  t.check('a press on the zoomed canvas\'s scroll bar keeps the selection', await t.eval(`!!${SELECTED}`));
  // zoom keys while typing: the slide zooms, not the page
  await t.eval(`document.querySelector('.editor-stage .scene h2').focus()`);
  const z1 = await scale(); await t.key('-', 'Minus', 189, 2);
  await ok('Ctrl+- while typing zooms the slide out', `document.querySelector('.editor-stage').getBoundingClientRect().width / 1600 < ${z1} && window.visualViewport.scale === 1`);
  await zoomKey('0', 'Digit0', 48);
  await ok('the slide fits again', `Math.abs(document.querySelector('.editor-stage').getBoundingClientRect().width / 1600 - ${fitScale}) < 0.002`);
  t.check('the zoom bar does not cover the slide', await t.eval(`document.querySelector('.editor-zoom').getBoundingClientRect().top >= document.querySelector('.editor-stage-box').getBoundingClientRect().bottom`));
  // a line: no fill, thickness without None
  await t.editor.pick('.editor-stage .scene h2'); await t.editor.insert('line'); await tab('element');
  await ok('a line has Thickness (no None) and no Fill', `(() => { const b = document.querySelector('.editor-panel-body'); return !b.querySelector('[data-tool-field="shapeFill"]') && !!b.querySelector('[data-tool-field="shapeStroke"]') && !b.querySelector('[data-tool-field="shapeStroke"] option[value="0px"]'); })()`);
  await undoButton();
  // clicks: A1 B2 C3, group {A, B} together -> A, B on 1; C on 2 (no empty clicks)
  const setStep = async (i, n) => {
    await pickExpr(`${STATS}[${i}]`); await tab('element');
    await panelSet('[data-element-field="appear"]', 'click');
    await t.waitFor(`!!document.querySelector('.editor-panel-body [data-element-field="step"]')`);
    await panelSet('[data-element-field="step"]', String(n));
    await frames(4);
  };
  for (let i = 0; i < 3; i++) await setStep(i, 10 + i);
  const stepsNow = () => t.eval(`${STATS}.slice(0, 3).map(c => +c.getAttribute('data-reveal-step'))`);
  await pickExpr(`${STATS}[0]`); await pickExpr(`${STATS}[1]`, true);
  await t.click('.editor-panel-body [data-action="group-appear-together"]');
  await ok('Together on a click keeps the group\'s place and leaves no empty clicks', `(() => { const a = ${STATS}.slice(0, 3).map(c => +c.getAttribute('data-reveal-step')); const d = [...new Set([...document.querySelectorAll('.editor-stage .scene [data-reveal-step]')].map(n => +n.getAttribute('data-reveal-step')))].sort((x, y) => x - y); return a[0] === a[1] && a[2] === a[0] + 1 && d.every((v, i) => v === i + 1); })()`, `${STATS}.slice(0, 3).map(c => c.getAttribute('data-reveal-step'))`);
  // paste with a group selected: after the whole group
  const labels = () => t.eval(`[...document.querySelectorAll('.editor-stage .scene .stats > *')].map(n => n.querySelector('.stat-label')?.textContent)`);
  const statsBefore = await labels();
  await blur();
  await clipboardEvent('copy');
  await clipboardEvent('paste');
  await t.waitFor(`document.querySelectorAll('.editor-stage .scene .stats > *').length === ${statsBefore.length + 2}`).catch(() => {});
  const statsAfter = await labels();
  t.check('paste with a group selected goes after the whole group', statsAfter.length === statsBefore.length + 2 && statsAfter[2] === statsBefore[0] && statsAfter[3] === statsBefore[1] && statsAfter[1] === statsBefore[1], JSON.stringify(statsAfter));
  await undoButton();
  // undo of a group duplicate selects what was selected before
  await pickExpr(`${STATS}[0]`); await pickExpr(`${STATS}[1]`, true);
  await blur(); await t.key('d', 'KeyD', 68, 2);
  await t.waitFor(`document.querySelectorAll('.editor-stage .scene .stats > *').length === ${statsBefore.length + 2}`).catch(() => {});
  await undoButton();
  await ok('Undo of a group Duplicate selects the first element again', `${SELECTED} === ${STATS}[0]`);
  // a timeline drag that the browser cancels changes nothing
  await tab('animations');
  const tb = await t.eval(`(() => { const t = document.querySelector('.anim-track[data-drag="order"]'); t.scrollIntoView({ block: 'center' }); const b = t.querySelector('.anim-bar'); const r = b.getBoundingClientRect(); return { x: r.x + 3, y: r.y + r.height / 2, order: +t.dataset.order, path: t.dataset.path, width: t.clientWidth }; })()`);
  await t.eval(`(() => { const b = document.querySelector('.anim-track[data-path="${tb.path}"] .anim-bar'); const o = { bubbles: true, pointerId: 7, clientX: ${tb.x}, clientY: ${tb.y}, button: 0 }; b.dispatchEvent(new PointerEvent('pointerdown', o)); b.dispatchEvent(new PointerEvent('pointermove', { ...o, clientX: ${tb.x} + ${tb.width} / 2 })); b.dispatchEvent(new PointerEvent('pointercancel', o)); })()`);
  await frames(5);
  t.check('a cancelled timeline drag changes nothing', (await t.eval(`+document.querySelector('.anim-track[data-path="${tb.path}"]').dataset.order`)) === tb.order);

  // ---- fix checks, round 2
  await t.editor.pick('.editor-stage .scene h2');
  const area2 = await canvasMid();
  const zs = await scale();
  for (let i = 0; i < 30; i++) await wheel(area2.x, area2.y, -4);
  await ok('a slow pinch (small Ctrl+wheel steps) zooms in', `document.querySelector('.editor-stage').getBoundingClientRect().width / 1600 > ${zs * 1.1}`);
  // a redraw while zoomed never scrolls the slide itself
  await t.editor.goSlide('product');
  await zoomKey('=', 'Equal', 187); await zoomKey('=', 'Equal', 187);
  await t.waitFor(`document.querySelector('.editor-stage').getBoundingClientRect().width / 1600 > ${fitScale * 1.4}`);
  await t.eval(`(() => { const t = [...document.querySelectorAll('.editor-stage .scene *')].filter(n => n.getBoundingClientRect().right > document.querySelector('.editor-stage .scene').getBoundingClientRect().right - 2).pop() || document.querySelector('.editor-stage .scene h2'); t.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); })()`);
  await frames();
  await tab('slide'); await panelSet('[data-slide-field="title"]', 'Product X');
  await t.waitFor(`document.querySelector('.editor-slide-list li.is-selected')?.textContent.includes('Product X')`).catch(() => {});
  await frames();
  await ok('a redraw while zoomed leaves the slide unscrolled', `(() => { const sc = document.querySelector('.editor-stage .scene'); return sc.scrollLeft === 0 && sc.scrollTop === 0; })()`);
  await undoButton();
  await zoomKey('0', 'Digit0', 48);
  // speaker-note lines follow the clicks: stats A, B, C on 1, 2, 3 with notes 1, 2, 3; A+B each on a click
  await t.editor.goSlide('numbers'); await tab('slide');
  await panelSet('[data-slide-field="notes"]', '1: note A\n2: note B\n3: note C');
  await frames();
  await setStep(0, 1); await setStep(1, 3); await setStep(2, 2);
  await pickExpr(`${STATS}[0]`); await pickExpr(`${STATS}[1]`, true);
  await t.click('.editor-panel-body [data-action="group-appear-clicks"]');
  // A: 1 -> 1, B: 3 -> 2, C: 2 -> 3; note A follows A, note B (was click 2 = C) follows C, note C (was click 3 = B) follows B
  await ok('speaker-note lines follow their clicks when a group is renumbered', `(() => { const st = ${STATS}.slice(0, 3).map(c => +c.getAttribute('data-reveal-step')); const n = [...document.querySelectorAll('.editor-stage .scene .speaker-notes [data-note-step]')].map(l => l.textContent + '@' + l.getAttribute('data-note-step')).join(' '); return st[0] === 1 && st[1] === 2 && n === 'note A@' + st[0] + ' note B@' + st[2] + ' note C@' + st[1]; })()`, `[${STATS}.slice(0, 3).map(c => c.getAttribute('data-reveal-step')), [...document.querySelectorAll('.editor-stage .scene .speaker-notes [data-note-step]')].map(l => l.textContent + '@' + l.getAttribute('data-note-step'))]`);
  // saved file: the new styles stay
  const written1 = await saveAnd(() => t.eval(`document.querySelector('[data-action="save"]').click()`));
  t.check('Save writes the shapes with fill and outline and the text style', /--shape-fill: 1/.test(written1) && /font-family: var\(--font-mono\)/.test(written1) && /data-shape="callout"/.test(written1), String(written1.length));

  // =====================================================================================================
  // 2. Layers tab, copy style, speed, Ctrl+drag, panning
  // =====================================================================================================
  await fresh();
  await t.editor.pick('.editor-stage .scene h2'); await blur();
  await insertFree('rect', 200, 600, 200);
  await insertFree('circle', 500, 600, 200);
  t.check('two shapes inserted', (await shapeCount()) === 2, String(await shapeCount()));

  // ---- Layers tab
  await tab('layers');
  const rows = await t.eval(`document.querySelectorAll('.editor-panel-body .layer-row').length`);
  t.check('Layers tab lists the elements', rows > 5, String(rows));
  t.check('all five tabs fit', await t.eval(`(() => { const t = document.querySelector('.editor-tabs'), panel = document.querySelector('.editor-panel').getBoundingClientRect(); return t.scrollWidth <= t.clientWidth + 1 && [...t.children].every(b => b.getBoundingClientRect().right <= panel.right + 1); })()`));
  t.check('every row has hide and lock', await t.eval(`[...document.querySelectorAll('.layer-row')].every(r => r.querySelector('[data-layer-action="hide"]') && r.querySelector('[data-layer-action="lock"]'))`));
  t.check('nested elements are indented', await t.eval(`[...document.querySelectorAll('.layer-row')].some(r => parseFloat(r.style.getPropertyValue('--depth')) > 0)`));
  const shapeRows = `[...document.querySelectorAll('.layer-row')].filter(r => /shape|Shape/i.test(r.querySelector('.layer-label').textContent))`;
  t.check('the shapes are listed (free)', await t.eval(`${shapeRows}.length === 2 && ${shapeRows}.every(r => r.querySelector('small'))`), await t.eval(`${shapeRows}.map(r => r.textContent).join('|')`));
  const layerLabel = (i, event = 'click', init = '') => t.eval(`${shapeRows}[${i}].querySelector('.layer-label').dispatchEvent(new ${event === 'click' ? 'MouseEvent' : 'PointerEvent'}('${event}', { bubbles: true${init} }))`);
  await t.eval(`${shapeRows}[0].querySelector('.layer-label').click()`);
  await ok('a row selects its element and the Layers tab stays', `${SELECTED}?.matches('.shape') && ${ACTIVE_TAB('layers')} && ${shapeRows}[0].classList.contains('is-selected')`);
  await layerLabel(1, 'pointerover');
  await ok('the pointer over a row outlines the element', `(() => { const b = document.querySelector('.editor-hover-box'); if (!b || b.hidden) return false; const s = ${nth(1)}.getBoundingClientRect(), r = b.getBoundingClientRect(); return Math.abs(s.left - r.left) < 3 && Math.abs(s.width - r.width) < 3; })()`);
  await t.eval(`document.querySelector('.editor-panel-body').dispatchEvent(new PointerEvent('pointerleave'))`);
  await ok('and leaving the list removes it', `document.querySelector('.editor-hover-box').hidden`);
  await layerLabel(1, 'click', ', shiftKey: true');
  await ok('Shift+click on a row adds to the selection', `document.querySelectorAll('.editor-group-box').length === 2 && ${shapeRows}.every(r => r.classList.contains('is-grouped'))`);
  await t.eval(`${shapeRows}[0].querySelector('.layer-label').click()`);
  await ok('a plain click selects one again', `document.querySelectorAll('.editor-group-box').length === 0`);

  /** Presses a row's hide / lock button and waits for the slide to change. */
  const layerToggle = async (rowExpr, action) => {
    const marks = () => t.eval(`(${MODEL}.match(/data-editor-(locked|hidden)/g) || []).length`);
    const before = await marks();
    await t.eval(`${rowExpr}.querySelector('[data-layer-action="${action}"]').click()`);
    await t.waitFor(`(${MODEL}.match(/data-editor-(locked|hidden)/g) || []).length !== ${before}`);
  };
  // lock
  await layerToggle(`${shapeRows}[0]`, 'lock');
  const first = nth(0);
  t.check('lock: written in the file as data-editor-locked', /data-editor-locked/.test(await model()));
  await ok('lock: the element takes no clicks on the canvas', `getComputedStyle(${first}).pointerEvents === 'none'`);
  await ok('lock: no drag handles', `document.querySelector('.editor-selection').classList.contains('is-locked') && getComputedStyle(document.querySelector('.editor-move')).display === 'none'`);
  const xBefore = await t.eval(`${first}.style.getPropertyValue('--x')`);
  await blur(); await t.key('ArrowRight', 'ArrowRight', 39); await frames();
  t.check('lock: the arrows do not move it', (await t.eval(`${first}.style.getPropertyValue('--x')`)) === xBefore);
  await t.key('Delete', 'Delete', 46);
  await ok('lock: Delete leaves it (with a message)', `${SHAPES}.length === 2 && /locked/i.test(document.querySelector('.toast')?.textContent || '')`, `document.querySelector('.toast')?.textContent`);
  const cutLocked = await clipboardEvent('cut'); await frames();
  t.check('lock: Cut copies but leaves it', cutLocked.prevented && (await shapeCount()) === 2);
  await tab('element');
  t.check('lock: X / Y / Place freely / front and back are off', await t.eval(`['[data-element-field="--x"]', '[data-element-field="free"]', '[data-action="to-front"]'].every(s => document.querySelector('.editor-panel-body ' + s).disabled) && !document.querySelector('.editor-panel-body [data-tool-field="color"]').disabled`));
  await tab('layers');
  const box0 = await t.eval(`(() => { const r = ${first}.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
  await t.editor.pick('.editor-stage .scene h2');
  await t.clickAt(box0); await frames();
  t.check('lock: a click on it selects what is under it', !(await t.eval(`${first}.classList.contains('is-editor-selected')`)));
  // unlock
  await tab('layers');
  await layerToggle(`${shapeRows}[0]`, 'lock');
  t.check('unlock: the attribute is gone', !/data-editor-locked/.test(await model()));
  // a locked element inside a block: deleting the block is refused; inserting next to it goes after the block
  const contentRow = `[...document.querySelectorAll('.layer-row')].find(r => parseFloat(r.style.getPropertyValue('--depth')) === 0 && !/shape/i.test(r.textContent))`;
  const childRow = `${contentRow}.nextElementSibling`;
  await layerToggle(childRow, 'lock');
  await t.eval(`${contentRow}.querySelector('.layer-label').click()`);
  await t.waitFor(`${ACTIVE_TAB('layers')}`);
  const before0 = await t.eval(`document.querySelectorAll('.editor-stage .scene *').length`);
  await blur(); await t.key('Delete', 'Delete', 46);
  await ok('Delete of a block with a locked element inside is refused', `document.querySelectorAll('.editor-stage .scene *').length === ${before0} && /locked/i.test(document.querySelector('.toast')?.textContent || '')`);
  await tab('layers');
  await layerToggle(childRow, 'lock');
  await layerToggle(contentRow, 'lock');
  await t.eval(`${childRow}.querySelector('.layer-label').click()`);
  await t.waitFor(`!!${SELECTED}`);
  const before1 = await t.eval(`document.querySelectorAll('.editor-stage .scene *').length`);
  await blur(); await t.key('d', 'KeyD', 68, 2);
  await ok('Ctrl+D inside a locked block is refused (with a message)', `document.querySelectorAll('.editor-stage .scene *').length === ${before1} && /inside it/.test(document.querySelector('.toast')?.textContent || '')`, `document.querySelector('.toast')?.textContent`);
  await tab('layers');
  await layerToggle(contentRow, 'lock');
  t.check('unlocking the block: no lock left', !/data-editor-locked/.test(await model()));
  await tab('layers');

  // hide
  await layerToggle(`${shapeRows}[1]`, 'hide');
  const second = nth(1);
  await ok('hide: invisible on the canvas', `getComputedStyle(${second}).visibility === 'hidden'`);
  t.check('hide: still in the list (struck through)', await t.eval(`${shapeRows}.length === 2 && ${shapeRows}[1].classList.contains('is-hidden')`));
  t.check('hide: the slide list picture still shows it', (await t.eval(`getComputedStyle(document.querySelector('.editor-slide-list li.is-selected .scene [data-editor-hidden]')).visibility`)) === 'visible');
  await undoKey();
  await ok('undo shows it again and keeps the Layers tab', `!/data-editor-hidden/.test(${MODEL}) && ${ACTIVE_TAB('layers')}`);
  t.check('only the editor uses the attributes (no rule outside the canvas)', await t.eval(`[...document.styleSheets].flatMap(s => { try { return [...s.cssRules]; } catch (e) { return []; } }).filter(r => /data-editor-(hidden|locked)/.test(r.cssText)).every(r => r.selectorText.split(',').every(part => part.trim().startsWith('.editor-stage')))`));

  // ---- copy style
  await t.editor.pick('.editor-stage .scene h2');
  await blur(); await t.key('c', 'KeyC', 67, 3);
  await ok('Copy style of an element without own style says so', `/Nothing to copy yet/.test(document.querySelector('.toast')?.textContent || '')`, `document.querySelector('.toast')?.textContent`);
  await panelSet('[data-tool-field="color"]', 'var(--color-accent)');
  await panelSet('[data-tool-field="fontStyle"]', 'italic');
  await t.waitFor(`/font-style: italic/.test(${MODEL}.match(/<h2[^>]*>/)[0])`);
  await blur(); await t.key('c', 'KeyC', 67, 3);
  await ok('Ctrl+Alt+C copies the style (message)', `/copied/i.test(document.querySelector('.toast')?.textContent || '')`, `document.querySelector('.toast')?.textContent`);
  await t.editor.pick('.editor-stage .scene > .shape');
  await ok('Paste style is on in the Style section', `!document.querySelector('.editor-panel-body [data-action="paste-style"]').disabled`);
  await blur(); await t.key('v', 'KeyV', 86, 3);
  await ok('Ctrl+Alt+V gives the look to the shape', `${first}.style.color === 'var(--color-accent)' && ${first}.style.fontStyle === 'italic'`, `${first}.getAttribute('style')`);
  // from a shape: fill too, to a group of two
  await panelSet('[data-tool-field="shapeFill"]', '1');
  await t.waitFor(`${first}.style.getPropertyValue('--shape-fill').trim() === '1'`);
  await t.click('.editor-panel-body [data-action="copy-style"]');
  await t.editor.pick('.editor-stage .scene h2');
  await pickExpr(second);
  await pickExpr(`document.querySelector('.editor-stage .scene h2')`, true);
  await t.click('.editor-panel-body [data-action="paste-style"]');
  await ok('Paste style on a group: each gets it; the fill only the shape', `${second}.style.getPropertyValue('--shape-fill').trim() === '1' && ${second}.style.color === 'var(--color-accent)' && !document.querySelector('.editor-stage .scene h2').style.getPropertyValue('--shape-fill')`, `${second}.getAttribute('style') + ' | ' + document.querySelector('.editor-stage .scene h2').getAttribute('style')`);
  await undoKey();
  await ok('Paste style is one undo step', `${second}.style.getPropertyValue('--shape-fill') === ''`);

  // ---- right-click menu
  await t.editor.pick('.editor-stage .scene h2');
  await t.eval(`(() => { const t = ${second}; const r = t.getBoundingClientRect(); t.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: r.x + 5, clientY: r.y + 5 })); })()`);
  await ok('the menu has copy style, paste style, lock and layers', `['copy-style', 'paste-style', 'lock', 'layers'].every(a => document.querySelector('.editor-menu [data-menu="' + a + '"]'))`);
  await t.eval(`document.querySelector('.editor-menu [data-menu="lock"]').click()`);
  await ok('menu Lock locks it', `${second}.hasAttribute('data-editor-locked')`);
  await tab('layers');
  await layerToggle(`${shapeRows}[1]`, 'lock');

  // ---- speed
  await t.editor.pick('.editor-stage .scene > .shape');
  await panelSet('[data-element-field="appear"]', 'slide');
  await ok('Speed shows for an element that appears', `!!document.querySelector('.editor-panel-body [data-element-field="speed"]')`);
  await panelSet('[data-element-field="speed"]', '1.2s');
  await ok('Speed writes the animation duration (with the slide)', `${first}.style.animationDuration === '1.2s' && !${first}.style.transitionDuration`, `${first}.getAttribute('style')`);
  await tab('animations');
  await ok('the timeline shows the slower speed', `(() => { const path = [...${first}.parentElement.children].indexOf(${first}); const row = document.querySelector('.anim-row[data-path="' + path + '"]'); return !!row && /1200/.test(row.querySelector('.anim-track').title); })()`);
  await tab('element');
  await panelSet('[data-element-field="appear"]', 'click');
  await ok('on a click the speed becomes the transition duration', `${first}.style.transitionDuration === '1.2s' && !${first}.style.animationDuration`, `${first}.getAttribute('style')`);
  await panelSet('[data-element-field="appear"]', 'slide');
  await t.waitFor(`!!document.querySelector('.editor-panel-body [data-element-field="animation"]') && !${first}.hasAttribute('data-reveal-step')`);
  await panelSet('[data-element-field="animation"]', 'preset:fade-in');
  await ok('an animation of its own removes the speed', `${first}.hasAttribute('data-animation') && !${first}.style.animationDuration && !${first}.style.transitionDuration`, `${first}.getAttribute('style')`);
  await panelSet('[data-element-field="animation"]', '');
  await t.waitFor(`!${first}.hasAttribute('data-animation')`);
  await panelSet('[data-element-field="appear"]', 'slide');
  await t.waitFor(`!!document.querySelector('.editor-panel-body [data-element-field="speed"]')`);
  await panelSet('[data-element-field="speed"]', '2s');
  await t.waitFor(`${first}.style.animationDuration === '2s'`);
  await panelSet('[data-element-field="appear"]', 'always');
  await ok('"Always there" removes the speed', `!${first}.style.animationDuration && !${first}.style.transitionDuration && !document.querySelector('.editor-panel-body [data-element-field="speed"]')`);

  // ---- Ctrl+drag
  await t.editor.pick('.editor-stage .scene > .shape');
  const before = await t.eval(`(() => { const s = ${first}; return { x: s.style.getPropertyValue('--x'), y: s.style.getPropertyValue('--y') }; })()`);
  const handle = () => t.eval(`(() => { const r = document.querySelector('.editor-move').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
  const h0 = await handle();
  await t.clickAt(h0, { modifiers: 2 }); await frames();
  t.check('Ctrl+press without moving leaves no copy', (await shapeCount()) === 2);
  await t.drag(h0, 120, 0, { modifiers: 2, steps: 5 });
  await t.waitFor(`${SHAPES}.length === 3`).catch(() => {});
  const after = await t.eval(`${SHAPES}.map(s => s.style.getPropertyValue('--x') + ',' + s.style.getPropertyValue('--y') + (s.classList.contains('is-editor-selected') ? '*' : ''))`);
  t.check('Ctrl+drag leaves a copy where it was and moves the element', after.length === 3 && after[0] === before.x + ',' + before.y && after[1].endsWith('*') && after[1] !== before.x + ',' + before.y + '*', JSON.stringify([before, after]));
  await undoKey();
  await ok('Ctrl+drag is one undo step', `${SHAPES}.length === 2 && ${first}.style.getPropertyValue('--x') === '${before.x}'`);

  // ---- panning a zoomed slide
  await blur();
  await t.key('=', 'Equal', 187, 2);
  await t.waitFor(`document.querySelector('.editor-stage').getBoundingClientRect().width / 1600 > 0`);
  await blur();
  await t.key('=', 'Equal', 187, 2);
  await t.waitFor(`(() => { const a = document.querySelector('.editor-canvas-scroll'); return a.scrollWidth > a.clientWidth + 100; })()`);
  await blur();
  const scroll = () => t.eval(`(() => { const a = document.querySelector('.editor-canvas-scroll'); return [a.scrollLeft, a.scrollTop]; })()`);
  await t.eval(`(() => { const a = document.querySelector('.editor-canvas-scroll'); a.scrollLeft = 200; a.scrollTop = 0; })()`);
  const s0 = await scroll();
  const selBefore = await t.eval(`${SELECTED} ? ${SELECTED}.className : null`);
  const spaceDown = () => t.send('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
  const spaceUp = () => t.send('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
  await spaceDown();
  await ok('Space on a zoomed slide: ready to pan', `document.querySelector('.editor-canvas').classList.contains('is-pan-ready')`);
  const mid = await canvasMid();
  await t.drag(mid, -100, -40, { steps: 4 });
  await spaceUp();
  await ok('releasing Space ends it', `!document.querySelector('.editor-canvas').classList.contains('is-pan-ready')`);
  const s1 = await scroll();
  const maxDown = await t.eval(`(() => { const a = document.querySelector('.editor-canvas-scroll'); return a.scrollHeight - a.clientHeight; })()`);
  t.check('Space + drag pans the slide', Math.abs(s1[0] - s0[0] - 100) < 4 && Math.abs(s1[1] - s0[1] - Math.min(40, maxDown)) < 4 && maxDown > 10, JSON.stringify([s0, s1, maxDown]));
  t.check('panning selects nothing else', (await t.eval(`${SELECTED} ? ${SELECTED}.className : null`)) === selBefore);
  await t.mouse('mousePressed', mid.x, mid.y, { button: 'middle', buttons: 4 });
  for (let i = 1; i <= 4; i++) await t.mouse('mouseMoved', mid.x + i * 15, mid.y, { button: 'middle', buttons: 4 });
  await t.mouse('mouseReleased', mid.x + 60, mid.y, { button: 'middle', buttons: 0 });
  await frames();
  const s2 = await scroll();
  t.check('the middle mouse button pans too', Math.abs(s1[0] - s2[0] - 60) < 4, JSON.stringify([s1, s2]));
  await t.key('0', 'Digit0', 48, 2);
  await t.waitFor(`(() => { const a = document.querySelector('.editor-canvas-scroll'); return a.scrollWidth <= a.clientWidth + 2; })()`);
  await spaceDown(); await frames();
  t.check('Space does nothing when the slide fits', !(await t.eval(`document.querySelector('.editor-canvas').classList.contains('is-pan-ready')`)));
  await spaceUp();

  // ---- copies start unlocked
  await tab('layers');
  await layerToggle(`${shapeRows}[0]`, 'lock');
  await t.eval(`${shapeRows}[0].querySelector('.layer-label').click()`);
  await t.waitFor(`!!${SELECTED}`);
  await blur(); await t.key('d', 'KeyD', 68, 2);
  await ok('a duplicate of a locked element is not locked', `document.querySelectorAll('.editor-stage .scene > .shape[data-editor-locked]').length === 1 && ${SHAPES}.length === 3`);
  await tab('layers');
  const written2 = await saveAnd(() => t.eval(`document.querySelector('[data-action="save"]').click()`));
  t.check('Save keeps the lock in the file', /data-editor-locked/.test(written2), String(written2.length));

  // =====================================================================================================
  // 3. line up, corner handle, grid and snap, Disappears
  // =====================================================================================================
  await fresh();
  await t.editor.pick('.editor-stage .scene h2'); await blur();
  await insertFree('rect', 200, 600, 200);
  t.check('a shape inserted', (await shapeCount()) === 1);

  // ---- line up in its box
  await tab('element');
  t.check('line-up buttons for a free element', await t.eval(`['left', 'centre', 'right', 'top', 'middle', 'bottom'].every(e => document.querySelector('.editor-panel-body [data-action="line-up-' + e + '"]'))`));
  const box = () => t.eval(`(() => { const s = ${first}.getBoundingClientRect(), st = document.querySelector('.editor-stage .scene').getBoundingClientRect(), k = st.width / 1600; return { l: Math.round((s.left - st.left) / k), t: Math.round((s.top - st.top) / k), r: Math.round((st.right - s.right) / k), b: Math.round((st.bottom - s.bottom) / k) }; })()`);
  const boxNow = `(() => { const s = ${first}.getBoundingClientRect(), st = document.querySelector('.editor-stage .scene').getBoundingClientRect(), k = st.width / 1600; return { l: (s.left - st.left) / k, t: (s.top - st.top) / k, r: (st.right - s.right) / k, b: (st.bottom - s.bottom) / k }; })()`;
  const lineUp = async (edge, cond) => { await t.click(`.editor-panel-body [data-action="line-up-${edge}"]`); await t.waitFor(`(b => ${cond})(${boxNow})`).catch(() => {}); return box(); };
  let b = await lineUp('right', `Math.abs(b.r) <= 1`);
  t.check('Right: at the right edge of the slide', Math.abs(b.r) <= 1, JSON.stringify(b));
  b = await lineUp('centre', `Math.abs(b.l - b.r) <= 2`);
  t.check('Centre: in the middle', Math.abs(b.l - b.r) <= 2, JSON.stringify(b));
  b = await lineUp('bottom', `Math.abs(b.b) <= 1`);
  t.check('Bottom: at the bottom edge', Math.abs(b.b) <= 1, JSON.stringify(b));
  b = await lineUp('middle', `Math.abs(b.t - b.b) <= 2`);
  t.check('Middle: in the middle vertically', Math.abs(b.t - b.b) <= 2, JSON.stringify(b));
  await lineUp('left', `Math.abs(b.l) <= 1`); b = await lineUp('top', `Math.abs(b.t) <= 1`);
  t.check('Left and Top: in the corner', Math.abs(b.l) <= 1 && Math.abs(b.t) <= 1, JSON.stringify(b));
  await undoKey();
  await t.waitFor(`(b => Math.abs(b.t) > 5)(${boxNow})`).catch(() => {});
  b = await box();
  t.check('each line-up is one undo step', Math.abs(b.l) <= 1 && Math.abs(b.t) > 5, JSON.stringify(b));
  await setFree(200, 300, 200);

  // ---- corner handle
  const corner = async (dx, dy, modifiers = 0) => {
    const h = await t.eval(`(() => { const r = document.querySelector('.editor-resize-corner').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, shown: getComputedStyle(document.querySelector('.editor-resize-corner')).display !== 'none' }; })()`);
    await t.drag(h, dx, dy, { modifiers, steps: 5 });
    await frames();
    return h.shown;
  };
  const v = name => t.eval(`parseFloat(${first}.style.getPropertyValue('${name}'))`);
  const w0 = await v('--w'), h0b = await t.eval(`${first}.offsetHeight`);
  t.check('the corner handle shows for a free element', await corner(0, 0));
  const k = await scale();
  await corner(80 * k, 30 * k);
  await t.waitFor(`parseFloat(${first}.style.getPropertyValue('--h')) > 0`).catch(() => {});
  const w1 = await v('--w'), h1 = await v('--h');
  t.check('corner drag changes width and height (on the grid)', Math.abs(w1 - (w0 + 80)) <= 8 && Math.abs(h1 - (h0b + 30)) <= 8 && w1 % 8 === 0 && h1 % 8 === 0, JSON.stringify([w0, h0b, w1, h1]));
  await corner(100 * k, 0, 8);
  const w2 = await v('--w'), h2 = await v('--h');
  t.check('Shift keeps the proportions', Math.abs(w2 / h2 - w1 / h1) < 0.03 && w2 > w1, JSON.stringify([w1, h1, w2, h2]));
  // a text box with Alt (v158: a corner without Alt scales its text): a corner drag to the side only keeps it growing with its text (no height of its own)
  await t.editor.insert('textbox'); await tab('element'); await setFree(900, 200, 240);
  const tbox = SELECTED;
  await corner(60 * k, 2 * k, 1);
  await ok('corner to the side: a text box gets no fixed height', `!${tbox}.style.getPropertyValue('--h') && parseFloat(${tbox}.style.getPropertyValue('--w')) > 240`, `${tbox}.getAttribute('style')`);
  await corner(0, 40 * k, 1);
  await ok('corner downwards: then it gets one', `parseFloat(${tbox}.style.getPropertyValue('--h')) > 40`, `${tbox}.getAttribute('style')`);
  await t.key('Delete', 'Delete', 46);
  await t.waitFor(`${SHAPES}.length === 1`);
  await t.editor.pick('.editor-stage .scene > .shape');

  // ---- grid and snap
  t.check('Grid and Snap switches under the canvas', await t.eval(`!!document.querySelector('.editor-zoom [data-action="view-grid"]') && document.querySelector('.editor-zoom [data-action="view-snap"]').getAttribute('aria-pressed') === 'true'`));
  await t.click('.editor-zoom [data-action="view-grid"]');
  await ok('Grid shows a grid on the slide', `document.querySelector('.editor-stage').classList.contains('show-grid') && getComputedStyle(document.querySelector('.editor-overlay')).backgroundImage.includes('gradient') && document.querySelector('[data-action="view-grid"]').getAttribute('aria-pressed') === 'true'`);
  t.check('the grid is not in the slide (only the canvas overlay)', !/show-grid/.test(await model()));
  await blur(); await t.key('g', 'KeyG', 71);
  await ok('G hides it again', `!document.querySelector('.editor-stage').classList.contains('show-grid')`);
  await t.click('.editor-zoom [data-action="view-snap"]');
  await ok('Snap off', `document.querySelector('[data-action="view-snap"]').getAttribute('aria-pressed') === 'false'`);
  const x0 = await v('--x');
  await t.drag(await handle(), 33 * k, 0, { steps: 3 });
  await t.waitFor(`parseFloat(${first}.style.getPropertyValue('--x')) !== ${x0}`).catch(() => {});
  const x1 = await v('--x');
  t.check('with Snap off a drag is not on the grid', Math.abs(x1 - x0 - 33) <= 2 && x1 % 8 !== 0, JSON.stringify([x0, x1]));
  await reload();
  await ok('the switches are kept in this browser', `document.querySelector('[data-action="view-snap"]').getAttribute('aria-pressed') === 'false'`);
  await t.click('.editor-zoom [data-action="view-snap"]');
  await ok('Snap on again', `document.querySelector('[data-action="view-snap"]').getAttribute('aria-pressed') === 'true'`);

  // ---- Disappears (after the reload: the shape on numbers)
  await t.editor.goSlide('numbers');
  if (!(await shapeCount())) { await t.editor.pick('.editor-stage .scene h2'); await blur(); await insertFree('rect', 200, 300, 200); }
  await t.editor.pick('.editor-stage .scene > .shape');
  await tab('element');
  t.check('Disappears is a click effect', await t.eval(`!!document.querySelector('.editor-panel-body [data-element-field="appear"]')`));
  await panelSet('[data-element-field="appear"]', 'click');
  await t.waitFor(`!!document.querySelector('.editor-panel-body [data-element-field="effect"]')`);
  t.check('the effect list has Disappears', await t.eval(`[...document.querySelectorAll('.editor-panel-body [data-element-field="effect"] option')].some(o => o.value === 'leave' && o.textContent === 'Disappears')`));
  await panelSet('[data-element-field="effect"]', 'leave');
  await t.settle();   // the automatic preview plays first
  await ok('on the canvas: fully while selected', `getComputedStyle(${first}).opacity === '1'`);
  await t.editor.pick('.editor-stage .scene h2');
  await ok('on the canvas: half when not selected (readable)', `getComputedStyle(${first}).opacity === '0.5'`, `getComputedStyle(${first}).opacity`);
  await ok('in the slide list picture: faint (the end of the effect)', `getComputedStyle(document.querySelector('.editor-slide-list li.is-selected .scene [data-reveal-effect="leave"]')).opacity === '0.12'`);
  await t.editor.pick('.editor-stage .scene > .shape');
  await tab('animations');
  await t.click('.editor-panel-body [data-action="play-slide"]');
  const playing = `[...document.querySelectorAll('.editor-stage .scene [data-reveal-effect="leave"]')][0]`;
  await t.waitFor(`getComputedStyle(${playing}).opacity === '1' && !!document.querySelector('.editor-panel-body [data-action="play-click"]')`, { label: 'playing: there first' });
  t.check('playing: there first', true);
  await t.click('.editor-panel-body [data-action="play-click"]');
  await ok('playing: gone after its click', `getComputedStyle(${playing}).opacity === '0'`, `getComputedStyle(${playing}).opacity`);
  await t.click('.editor-panel-body [data-action="play-stop"]');
  // the presented slide: the effect works there too
  const written3 = await saveAnd(() => t.eval(`document.querySelector('[data-action="save"]').click()`));
  t.check('Save writes data-reveal-effect="leave"', /data-reveal-effect="leave"/.test(written3));
  t.check('the deck CSS has the leave rule', await t.eval(`[...document.styleSheets].flatMap(s => { try { return [...s.cssRules]; } catch (e) { return []; } }).some(r => /data-reveal-effect="leave"\\]\\.is-revealed/.test(r.cssText) && /opacity: 0/.test(r.cssText))`));

  // =====================================================================================================
  // 4. names, easing, copy appearance
  // =====================================================================================================
  await fresh();
  await t.editor.pick('.editor-stage .scene h2'); await blur();
  for (const [x, y] of [[100, 600], [400, 600], [700, 600]]) await insertFree('rect', x, y, 160);
  t.check('three shapes', (await shapeCount()) === 3);
  const attr = (n, name) => t.eval(`${nth(n)}.getAttribute('${name}')`);

  // ---- names
  await pickExpr(nth(0)); await tab('element');
  await panelSet('[data-element-field="editorName"]', '  Logo   box ');
  await ok('Name field writes data-editor-name (tidied)', `${nth(0)}.getAttribute('data-editor-name') === 'Logo box'`);
  await tab('layers');
  await ok('the Layers tab shows the name', `[...document.querySelectorAll('.layer-label')].some(b => b.textContent.startsWith('“Logo box”'))`);
  const rowOf = n => `[...document.querySelectorAll('.layer-row')].filter(r => r.querySelector('.layer-label') && /shape|“/i.test(r.querySelector('.layer-label').textContent))[${n}]`;
  const rowPoint = n => t.eval(`(() => { const l = ${rowOf(n)}.querySelector('.layer-label'); l.scrollIntoView({ block: 'center' }); const r = l.getBoundingClientRect(); return { x: r.x + 20, y: r.y + r.height / 2 }; })()`);
  const dblRow = async n => {   // a real double-click (two presses, clickCount 1 and 2)
    const p = await rowPoint(n);
    for (const count of [1, 2]) { await t.mouse('mousePressed', p.x, p.y, { clickCount: count }); await t.mouse('mouseReleased', p.x, p.y, { clickCount: count, buttons: 0 }); }
    await t.waitFor(`document.activeElement && document.activeElement.matches('.layer-rename')`, { label: 'rename field' });
  };
  await dblRow(1);
  t.check('double-click a row: a field to rename', true);
  await t.type('Arrow tip'); await t.key('Enter', 'Enter', 13);
  await ok('Enter renames', `${nth(1)}.getAttribute('data-editor-name') === 'Arrow tip'`);
  await dblRow(1);
  await t.type('XXX'); await t.key('Escape', 'Escape', 27); await frames(5);
  t.check('Esc cancels (and does not close the editor)', (await attr(1, 'data-editor-name')) === 'Arrow tip' && (await t.eval(`!!document.querySelector('.editor') && !document.querySelector('.editor').hidden`)));
  await dblRow(1);
  await t.eval(`document.activeElement.select()`); await t.key('Delete', 'Delete', 46); await t.key('Enter', 'Enter', 13);
  await ok('an empty name removes it', `!${nth(1)}.hasAttribute('data-editor-name')`);
  await undoKey();
  await ok('rename is one undo step', `${nth(1)}.getAttribute('data-editor-name') === 'Arrow tip'`);
  await tab('layers');
  await dblRow(2); await t.type('Third');
  await t.clickAt(await rowPoint(0));
  await ok('clicking another row while renaming: the name is kept and that row is selected', `${nth(2)}.getAttribute('data-editor-name') === 'Third' && ${nth(0)}.classList.contains('is-editor-selected')`, `${SELECTED}?.getAttribute('data-editor-name')`);
  await dblRow(2); await t.eval(`document.activeElement.select()`); await t.type('Saved name');
  const savedNow = await saveAnd(() => t.key('s', 'KeyS', 83, 2));
  t.check('Ctrl+S while renaming keeps the name and saves', /data-editor-name="Saved name"/.test(savedNow));
  await reload();
  await t.editor.goSlide('numbers');
  t.check('after the reload the shapes are there', (await shapeCount()) === 3, String(await shapeCount()));
  // the Name field, typed and then a click on the slide: kept
  await pickExpr(nth(1)); await tab('element');
  await t.eval(`(() => { const f = document.querySelector('.editor-panel-body [data-element-field="editorName"]'); f.focus(); f.select(); })()`); await t.type('Typed then click');
  const sc = await t.eval(`(() => { const r = ${nth(0)}.getBoundingClientRect(); return { x: r.x + 10, y: r.y + 10 }; })()`);
  await t.clickAt(sc);
  await ok('a typed name is kept when you click the slide', `${nth(1)}.getAttribute('data-editor-name') === 'Typed then click'`);

  // ---- easing
  await pickExpr(nth(0)); await tab('element');
  await panelSet('[data-element-field="appear"]', 'slide');
  await ok('Easing next to Speed', `!!document.querySelector('.editor-panel-body [data-element-field="ease"]') && [...document.querySelectorAll('.editor-panel-body [data-element-field="ease"] option')].map(o => o.textContent).join() === 'Normal,Smooth,Springy,Even'`);
  await panelSet('[data-element-field="ease"]', 'var(--ease-elastic)');
  await ok('Easing with the slide: animation-timing-function', `${nth(0)}.style.animationTimingFunction === 'var(--ease-elastic)' && !${nth(0)}.style.transitionTimingFunction`);
  await panelSet('[data-element-field="speed"]', '1.2s');
  await t.waitFor(`${nth(0)}.style.animationDuration === '1.2s'`);
  await panelSet('[data-element-field="appear"]', 'click');
  await ok('on a click: the transition properties (speed and easing kept)', `${nth(0)}.style.transitionTimingFunction === 'var(--ease-elastic)' && ${nth(0)}.style.transitionDuration === '1.2s' && !${nth(0)}.style.animationTimingFunction`, `${nth(0)}.getAttribute('style')`);
  await t.waitFor(`!!document.querySelector('.editor-panel-body [data-element-field="effect"]')`);
  await panelSet('[data-element-field="effect"]', 'pop');
  await t.waitFor(`${nth(0)}.getAttribute('data-reveal-effect') === 'pop'`);
  await panelSet('[data-element-field="step"]', '2');
  await t.waitFor(`${nth(0)}.getAttribute('data-reveal-step') === '2'`);

  // ---- copy appearance
  await t.click('.editor-panel-body [data-action="copy-appear"]');
  await ok('Copy appearance (message)', `/copied/i.test(document.querySelector('.toast')?.textContent || '')`, `document.querySelector('.toast')?.textContent`);
  await pickExpr(nth(1)); await pickExpr(nth(2), true);
  t.check('two selected', (await t.eval(`document.querySelectorAll('.editor-group-box').length`)) === 2);
  await tab('element');
  await t.click('.editor-panel-body [data-action="paste-appear"]');
  const same = n => `(() => { const s = ${nth(n)}; return [s.getAttribute('data-reveal-step'), s.getAttribute('data-reveal-effect'), s.style.transitionDuration, s.style.transitionTimingFunction].join('|'); })()`;
  await ok('Paste appearance gives click, effect, speed and easing to both', `${same(1)} === '2|pop|1.2s|var(--ease-elastic)' && ${same(2)} === '2|pop|1.2s|var(--ease-elastic)'`, `[${same(1)}, ${same(2)}]`);
  await undoKey();
  await ok('Paste appearance is one undo step', `!${nth(1)}.hasAttribute('data-reveal-step') && !${nth(2)}.hasAttribute('data-reveal-step')`);
  await pickExpr(nth(2)); await tab('element');
  await panelSet('[data-element-field="animation"]', 'preset:pulse');
  await t.waitFor(`${nth(2)}.hasAttribute('data-animation')`);
  await pickExpr(nth(1)); await pickExpr(nth(2), true); await tab('element');
  await t.click('.editor-panel-body [data-action="paste-appear"]');
  await ok('an element with its own animation is left alone (and said so)', `${nth(1)}.getAttribute('data-reveal-step') === '2' && !${nth(2)}.hasAttribute('data-reveal-effect') && /left alone/.test(document.querySelector('.toast')?.textContent || '')`, `document.querySelector('.toast')?.textContent`);

  // ---- Animations tab shows names
  await pickExpr(nth(0)); await tab('animations');
  await ok('the Animations tab shows the name', `[...document.querySelectorAll('.anim-label')].some(b => b.textContent === '“Logo box”')`);

  // ---- the played slide uses the easing
  await t.click('.editor-panel-body [data-action="play-slide"]');
  await ok('playing: the element has the springy transition', `getComputedStyle(${nth(0)}).transitionTimingFunction.startsWith('linear(')`, `getComputedStyle(${nth(0)}).transitionTimingFunction`);
  await t.click('.editor-panel-body [data-action="play-stop"]');

  // ---- saved file
  const written4 = await saveAnd(() => t.eval(`document.querySelector('[data-action="save"]').click()`));
  t.check('Save keeps the names and the easing', /data-editor-name="Logo box"/.test(written4) && /transition-timing-function: var\(--ease-elastic\)/.test(written4));
  // the editor is left by Save: open it again
  await t.waitFor(`document.readyState === 'complete' && !!document.querySelector('#stage .scene.is-active')`);
  if (!(await t.eval(`!!document.querySelector('.editor-stage .scene')`))) await t.key('e', 'KeyE', 69);
  await t.waitFor(`!!document.querySelector('.editor-stage .scene')`, { label: 'editor open again' });
  await t.editor.goSlide('numbers');
  // a typed animation duration, then a click on another element with another animation: it goes to the right animation
  await pickExpr(nth(0)); await tab('element'); await panelSet('[data-element-field="animation"]', 'preset:rise');
  await t.waitFor(`${nth(0)}.getAttribute('data-animation') === 'rise'`);
  await pickExpr(nth(1)); await tab('element'); await panelSet('[data-element-field="animation"]', 'preset:fade-in');
  await t.waitFor(`${nth(1)}.getAttribute('data-animation') === 'fade-in' && !!document.querySelector('.editor-panel-body [data-anim-field="duration"]')`);
  await t.eval(`(() => { const f = document.querySelector('.editor-panel-body [data-anim-field="duration"]'); f.focus(); f.select(); })()`); await t.type('4321');
  const s0b = await t.eval(`(() => { const r = ${nth(0)}.getBoundingClientRect(); return { x: r.x + 10, y: r.y + 10 }; })()`);
  await t.clickAt(s0b);
  await t.waitFor(`${SELECTED} === ${nth(0)}`);
  await tab('element');
  await ok('a typed animation duration goes to its own animation', `${SELECTED} === ${nth(0)} && document.querySelector('.editor-panel-body [data-anim-field="duration"]').value !== '4321'`);
  await pickExpr(nth(1)); await tab('element');
  await ok('... and the other one has it', `document.querySelector('.editor-panel-body [data-anim-field="duration"]').value === '4321'`, `document.querySelector('.editor-panel-body [data-anim-field="duration"]').value`);
  // Ctrl+S right after typing a name in the Element tab
  await pickExpr(nth(2)); await tab('element');
  await t.eval(`(() => { const f = document.querySelector('.editor-panel-body [data-element-field="editorName"]'); f.focus(); f.select(); })()`); await t.type('Before save');
  const saved2 = await saveAnd(() => t.key('s', 'KeyS', 83, 2));
  t.check('Ctrl+S right after typing in a field saves what was typed', /data-editor-name="Before save"/.test(saved2));

  // =====================================================================================================
  // 5. slide overview, Layers filter, front / back keys, keys list
  // =====================================================================================================
  await fresh();
  const titles = () => t.eval(`[...document.querySelectorAll('.editor-slide-list .editor-slide-title')].map(s => s.textContent)`);

  // ---- overview
  const titlesBefore = await titles();
  await t.click('.editor-slides [data-action="overview"]');
  const items = `[...document.querySelectorAll('.editor-template-grid.is-overview button[data-name]')]`;
  await t.waitFor(`${items}.length === ${titlesBefore.length} && !document.querySelector('.editor-dialog').hidden`, { label: 'overview open' });
  t.check('Overview shows every slide', true);
  t.check('the open slide is marked', await t.eval(`${items}.findIndex(b => b.classList.contains('is-selected')) === ${titlesBefore.indexOf('Key numbers')}`));
  t.check('the thumbnails are drawn and scaled', await t.eval(`${items}.every(b => b.querySelector('.editor-thumb-stage .scene')) && parseFloat(getComputedStyle(${items}[0].querySelector('.editor-thumb')).width) > 150`));
  // drag the 2nd slide before the 5th with the real mouse (Chrome's drag, intercepted and replayed by the test)
  let lastDrag = null;
  t.onEvent('Input.dragIntercepted', params => { lastDrag = params.data; });
  const centreOf = i => t.eval(`(() => { const r = ${items}[${i}].getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 3 }; })()`);
  const realDrag = async (from, to) => {
    await t.send('Input.setInterceptDrags', { enabled: true }); lastDrag = null;
    await t.mouse('mousePressed', from.x, from.y);
    for (let i = 1; i <= 8; i++) {
      await t.mouse('mouseMoved', from.x + (to.x - from.x) * i / 8, from.y + (to.y - from.y) * i / 8, { buttons: 1 });
      if (lastDrag) break;
    }
    for (let i = 0; i < 40 && !lastDrag; i++) await t.sleep(25);   // Chrome starts the drag a moment after the moves
    const started = !!lastDrag;
    if (started) {
      for (const type of ['dragEnter', 'dragOver']) await t.send('Input.dispatchDragEvent', { type, x: to.x, y: to.y, data: lastDrag });
      await t.send('Input.dispatchDragEvent', { type: 'drop', x: to.x, y: to.y, data: lastDrag });
    }
    await t.mouse('mouseReleased', to.x, to.y, { buttons: 0 });
    await t.send('Input.setInterceptDrags', { enabled: false });
    return started;
  };
  t.check('a real mouse drag starts in the overview', await realDrag(await centreOf(1), await centreOf(4)));
  const expected = titlesBefore.slice(); const [moved] = expected.splice(1, 1); expected.splice(3, 0, moved);
  await t.waitFor(`JSON.stringify([...document.querySelectorAll('.editor-slide-list .editor-slide-title')].map(s => s.textContent)) === ${q(JSON.stringify(expected))}`).catch(() => {});
  const afterMove = await titles();
  t.check('dragging in the overview moves the slide', JSON.stringify(afterMove) === JSON.stringify(expected), JSON.stringify([titlesBefore.slice(0, 6), afterMove.slice(0, 6)]));
  await ok('the overview stays open and shows the new order', `!document.querySelector('.editor-dialog').hidden && ${items}[3].textContent.includes(${q(moved)})`);
  await closeDialog();
  await undoKey();
  await t.waitFor(`JSON.stringify([...document.querySelectorAll('.editor-slide-list .editor-slide-title')].map(s => s.textContent)) === ${q(JSON.stringify(titlesBefore))}`).catch(() => {});
  t.check('undo takes the move back', JSON.stringify(await titles()) === JSON.stringify(titlesBefore));
  await blur(); await t.key('o', 'KeyO', 79);
  await t.waitFor(`!document.querySelector('.editor-dialog').hidden && ${items}.length > 0`, { label: 'O opens overview' });
  await ok('the overview button says Done', `document.querySelector('.editor-dialog [data-action="close-dialog"]').textContent === 'Done'`);
  t.check('the editor behind the overview takes no Tab or clicks (inert)', await t.eval(`document.querySelector('.editor-slides').inert && document.querySelector('.editor-bar').inert`));
  const gap = await t.eval(`(() => { const a = ${items}[5].getBoundingClientRect(), b = ${items}[6].getBoundingClientRect(); return { x: (a.right + b.left) / 2, y: a.top + a.height / 3 }; })()`);
  await realDrag(await centreOf(1), gap);
  const expGap = titlesBefore.slice(); const [m2] = expGap.splice(1, 1); expGap.splice(5, 0, m2);
  await t.waitFor(`JSON.stringify([...document.querySelectorAll('.editor-slide-list .editor-slide-title')].map(s => s.textContent)) === ${q(JSON.stringify(expGap))}`).catch(() => {});
  const afterGap = await titles();
  t.check('a drop in the gap between two pictures goes there (not to the end)', JSON.stringify(afterGap) === JSON.stringify(expGap), JSON.stringify(afterGap.slice(0, 8)));
  await t.key('z', 'KeyZ', 90, 2);
  await ok('undo inside the overview redraws it in the old order', `JSON.stringify([...document.querySelectorAll('.editor-slide-list .editor-slide-title')].map(s => s.textContent)) === ${q(JSON.stringify(titlesBefore))} && ${items}.map(b => b.querySelector(':scope > span').textContent.replace(/^\\d+\\. /, '').split(' · ')[0]).join('|') === ${q(titlesBefore.join('|'))}`, `${items}.map(b => b.querySelector(':scope > span').textContent).slice(0, 6).join('|')`);
  await closeDialog();
  await ok('closing makes the editor usable again', `!document.querySelector('.editor-slides').inert`);
  await blur(); await t.key('o', 'KeyO', 79);
  await ok('O opens the overview', `!document.querySelector('.editor-dialog').hidden && document.querySelector('.editor-template-grid').classList.contains('is-overview')`);
  await t.eval(`${items}[0].click()`);
  await ok('a click opens that slide and closes the overview', `document.querySelector('.editor-dialog').hidden && !document.querySelector('.editor-template-grid').classList.contains('is-overview') && document.querySelector('.editor-stage .scene').dataset.name === document.querySelector('.editor-slide-list li:first-child .scene').dataset.name`);
  await t.click('.editor-slides [data-action="add-slide"]');
  await ok('+ Slide afterwards shows the layouts again (not the overview)', `!document.querySelector('.editor-template-grid').classList.contains('is-overview') && !!document.querySelector('.editor-template-grid [data-action="add-template"]')`);
  await closeDialog();
  await t.editor.goSlide('numbers');

  // ---- Layers filter
  await tab('layers');
  t.check('a find field above the list', await t.eval(`!!document.querySelector('.editor-panel-body .layer-filter')`));
  await t.eval(`document.querySelector('.layer-filter').focus()`); await t.type('means');
  const shown = () => t.eval(`[...document.querySelectorAll('.layer-row')].filter(r => !r.hidden).map(r => r.querySelector('.layer-label').textContent)`);
  await t.waitFor(`[...document.querySelectorAll('.layer-row')].some(r => r.hidden)`, { label: 'rows filtered' });
  const fs1 = await shown();
  t.check('typing filters the rows (and keeps the blocks that hold them)', fs1.length > 0 && fs1.length < (await t.eval(`document.querySelectorAll('.layer-row').length`)) && fs1.some(x => /means/i.test(x)) && (await t.eval(`[...document.querySelectorAll('.layer-row')].filter(r => !r.hidden && !/means/i.test(r.textContent)).every(r => { const d = parseFloat(r.style.getPropertyValue('--depth')) || 0; let n = r.nextElementSibling; while (n && (parseFloat(n.style.getPropertyValue('--depth')) || 0) > d) { if (!n.hidden && /means/i.test(n.textContent)) return true; n = n.nextElementSibling; } return false; })`)), JSON.stringify(fs1).slice(0, 200));
  const firstMatch = await t.eval(`[...document.querySelectorAll('.layer-row')].find(r => !r.hidden && /number means/i.test(r.textContent)).querySelector('.layer-label').dataset.path`);
  await t.eval(`document.querySelector('.layer-label[data-path="${firstMatch}"]').click()`);
  await t.waitFor(`!!${SELECTED}`);
  await frames();
  t.check('the filter stays after a row is selected', (await t.eval(`document.querySelector('.layer-filter').value`)) === 'means' && (await shown()).length === fs1.length);
  await t.eval(`(() => { const f = document.querySelector('.layer-filter'); f.value = ''; f.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await ok('clearing it shows all rows', `[...document.querySelectorAll('.layer-row')].every(r => !r.hidden)`);

  // ---- front / back keys
  await t.editor.pick('.editor-stage .scene h2'); await blur();
  await t.editor.insert('rect'); await tab('element'); await setFree(200, 500, 160);
  await t.editor.insert('circle'); await tab('element'); await setFree(260, 540, 160);
  await blur();
  const z = n => t.eval(`${nth(n)}.style.zIndex`);
  await t.key('{', 'BracketLeft', 219, 2 | 8);
  await ok('Ctrl+Shift+[ sends it to the back', `${nth(1)}.style.zIndex === '-1'`, `${nth(1)}.style.zIndex`);
  await t.key('}', 'BracketRight', 221, 2 | 8);
  await ok('Ctrl+Shift+] brings it to the front', `parseInt(${nth(1)}.style.zIndex, 10) >= 2`, `${nth(1)}.style.zIndex`);

  // ---- keys list: the entries of this part (the count of rows is checked in editor-core)
  await openKeys();
  const keys = await t.eval(`document.querySelector('.editor-dialog .editor-template-grid').textContent`);
  t.check('? lists the zoom keys', /Ctrl \+ \/ Ctrl − \/ Ctrl\+0/.test(keys));
  t.check('? lists the new keys (copy style)', /Ctrl\+Alt\+C/.test(keys));
  t.check('? lists O and the front / back keys (one layer, with Shift: to the front / back)', /Ctrl\+\] \/ Ctrl\+\[/.test(keys) && /with Shift/.test(keys));
  await closeDialog();
}
