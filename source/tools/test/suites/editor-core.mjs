// The editor, in three runs on a clean page each: (A) slides, texts, a number, a chart, blocks with animations, free layout,
// delete and undo, slide settings, reorder, delete a slide, Play from here, Save and the readable saved file (opened again);
// (B) the Animations tab and playing the slide, Style, shapes (insert, the 8 handles, resize, order, copy and paste,
// Ctrl+D), the keys dialog (34 rows), clipboard (copy, cut, paste text and image), image fit, slide background,
// save as template, and the saved file; (C) several elements with Shift+click (align, spread, move, delete, undo), Alt while
// dragging, the right-click menu, own colour, find and replace, and the animation timeline.
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const covers = ['js/17-', 'js/18-', 'js/19-', 'js/20-', 'css/13-', 'interface-texts.json', 'parts/'];
export const timeoutMs = 180000;

const MODEL = `document.querySelector('.editor-slide-list li.is-selected .scene')`;   // the slide as saved in the model (its thumbnail is a copy)
const CANVAS = `document.querySelector('.editor-stage .scene')`;
const SELECTED = `document.querySelector('.editor-stage .is-editor-selected')`;
const ADD_DIALOG_OPEN = `!document.querySelector('.editor-dialog').hidden`;

export default async function (t) {
  const ev = t.eval, e = t.editor, sleep = t.sleep;
  const dir = mkdtempSync(join(tmpdir(), 'deck-editor-core-'));
  let savedCount = 0;

  /** A check that waits for its condition (a page expression) and records the result; false after `timeout` ms. */
  const until = async (label, expression, timeout = 4000) => {
    try { await t.waitFor(expression, { timeout, label }); t.check(label, true); }
    catch (error) { t.check(label, false, error.message.slice(0, 300)); }
  };
  const model = () => ev(MODEL + '.outerHTML');
  const modelTag = async tag => (await model()).match(new RegExp('<' + tag + '[^>]*>'))?.[0] || '';
  const tab = e.tab, panelSet = e.panelSet, goSlide = e.goSlide, blur = e.blur;
  const press = (key, code, keyCode, modifiers = 0) => t.key(key, code, keyCode, modifiers);
  const CTRL = 2, ALT = 1, SHIFT = 8;
  const clickButton = selector => ev(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const field = name => `parseFloat(${SELECTED}.style.getPropertyValue('${name}'))`;
  const clipboardEvent = (type, setup) => ev(`(() => { const dt = new DataTransfer(); ${setup || ''}; const e = new ClipboardEvent('${type}', { clipboardData: dt, bubbles: true, cancelable: true }); (document.activeElement || document.body).dispatchEvent(e); return { prevented: e.defaultPrevented, text: dt.getData('text/plain') }; })()`);
  const toastText = () => ev(`document.querySelector('.toast')?.textContent || ''`);
  const insertAndWait = async kind => {
    const before = await ev(`document.querySelectorAll('.editor-stage .scene *').length`);
    await panelSet('[data-insert-kind]', kind);
    await t.editor.unfoldFor('[data-action="insert"]');
    await t.click('.editor-panel-body [data-action="insert"]');
    await t.waitFor(`document.querySelectorAll('.editor-stage .scene *').length > ${before}`);
  };
  /** The editor on a clean page (empty storage), at the slide. */
  const openClean = async hash => {
    await t.open(hash, { clear: true });
    await t.key('e', 'KeyE', 69);
    await t.waitFor(`!!document.querySelector('.editor .editor-stage .scene') && !document.querySelector('.editor').hidden`, { label: 'editor open' });
  };
  /** Save in the editor; waits for the written file and for the reload that follows; returns the written html. */
  const save = async () => {
    await ev(`window.__beforeSave = 1; sessionStorage.removeItem('test-written'); true`);
    await clickButton('[data-action=save]');
    await t.waitFor(`JSON.parse(sessionStorage.getItem('test-written') || '[]').length >= 1`, { timeout: 10000, label: 'file written' });
    await t.waitFor(`window.__beforeSave === undefined && document.readyState === 'complete'`, { timeout: 10000, label: 'page reloaded after Save' });
    return JSON.parse(await ev(`sessionStorage.getItem('test-written') || '[]'`));
  };
  /** Opens a saved file as a page of its own (in this tab) at #hash; returns how many page errors it raised. */
  const openSaved = async (html, hash) => {
    const file = join(dir, `saved-${++savedCount}.html`);
    writeFileSync(file, html);
    const errorsBefore = t.errors.length;
    await t.send('Page.navigate', { url: pathToFileURL(file).href + '#' + hash });
    await t.waitFor(`document.readyState === 'complete' && document.querySelector('.scene.is-active')?.dataset.name === ${JSON.stringify(hash)}`, { timeout: 15000, label: 'saved file loaded' });
    return () => t.errors.length - errorsBefore;
  };
  const noEditorLeftovers = /contenteditable|is-editor-selected|is-previewing|is-playing-preview|is-revealed|is-visible/;
  const slidesPartOf = html => { const at = html.indexOf('id="stage"'); return html.slice(at, html.indexOf('END OF THE SLIDES', at)); };

  // ================= A: slides, texts, blocks, animations, free layout, undo, save =================
  await openClean('numbers');
  t.check('E opens the editor', await ev(`!document.querySelector('.editor').hidden`));
  t.check('slide list shows all 38 slides', (await ev(`document.querySelectorAll('.editor-slide-list > li').length`)) === 38);
  t.check('the editor opens on the slide on screen', (await ev(`${CANVAS}.dataset.name`)) === 'numbers');
  await press('ArrowRight', 'ArrowRight', 39);
  await sleep(300);   // time is what is tested: nothing must happen
  t.check('slide keys do not move the presentation while editing', (await ev(`location.hash`)) === '#numbers');

  // type a text on the slide
  await t.click('.editor-stage .scene .eyebrow');
  await until('a click selects the element (Element tab)', `document.querySelector('.editor-tabs [data-tab=element]').classList.contains('is-selected') && !!${SELECTED}`);
  await ev(`(() => { const e = document.querySelector('.editor-stage .scene .eyebrow'); e.focus(); const r = document.createRange(); r.selectNodeContents(e); getSelection().removeAllRanges(); getSelection().addRange(r); })()`);
  await t.type('Spring 2026');
  await until('typing on the slide changes the text', `document.querySelector('.editor-stage .scene .eyebrow').textContent === 'Spring 2026'`);
  await until('the change shows in the slide list picture', `document.querySelector('.editor-slide-list > li.is-selected .eyebrow').textContent === 'Spring 2026'`);
  await until('status says not saved', `/Not saved/.test(document.querySelector('.editor-status').textContent)`);
  await press('Escape', 'Escape', 27);

  // Ctrl+S is the editor's save (checked with a cancelled save window)
  await ev(`window.__realPicker = window.showSaveFilePicker; window.showSaveFilePicker = async () => { window.__ctrlS = true; throw new Error('cancelled'); }; true`);
  await press('s', 'KeyS', 83, CTRL);
  await until('Ctrl+S saves in the editor', `window.__ctrlS === true`);
  await ev(`window.showSaveFilePicker = window.__realPicker; true`);

  // card texts are typeable; Bold with a real mouse click keeps the selected words
  await goSlide('quality');
  t.check('card and chip texts can be typed', await ev(`[...document.querySelectorAll('.editor-stage .chip')].every(c => c.isContentEditable) && document.querySelector('.editor-stage .sonar b').isContentEditable`));
  const selectChipWord = `(() => { const chip = document.querySelector('.editor-stage .chip'); chip.focus(); const r = document.createRange(); r.setStart(chip.firstChild, 0); r.setEnd(chip.firstChild, 4); getSelection().removeAllRanges(); getSelection().addRange(r); })()`;
  await ev(selectChipWord);
  await t.click('.editor-stage .chip');
  await t.waitFor(`!!${SELECTED}`);
  await ev(selectChipWord);
  await tab('element');
  await t.click('.editor-panel-body [data-action=bold]');
  await until('Bold works with a real mouse click', `document.querySelector('.editor-stage .chip b')?.textContent === 'Firs'`);
  await press('Escape', 'Escape', 27);
  await goSlide('numbers');

  // number
  await t.click('.editor-stage .scene .count-up');
  await t.waitFor(`!!document.querySelector('.editor-panel-body [data-element-field=countUp]')`);
  await panelSet('[data-element-field=countUp]', '57');
  await until('number changed in the Element tab', `document.querySelector('.editor-stage .scene .count-up').dataset.to === '57'`);

  // add a slide from a template
  await clickButton('[data-action=add-slide]');
  await until('+ Slide shows the layouts', `${ADD_DIALOG_OPEN} && document.querySelectorAll('.editor-template-grid button').length > 10`);
  await clickButton('.editor-template-grid button[data-template=template-chart]');
  await until('the new slide is added after the current one', `document.querySelectorAll('.editor-slide-list > li').length === 39 && ${CANVAS}.dataset.name === 'chart-2'`);
  t.check('the new slide gets a clean title', (await ev(`document.querySelector('.editor-panel-body [data-slide-field=title]').value`)) === 'Chart');

  // chart rows
  await t.click('.editor-stage .scene .chart-drawing');
  await until('chart selected', `!!document.querySelector('.editor-panel-body [data-element-field=chartRows]')`);
  await panelSet('[data-element-field=chartRows]', 'Q1: 10\nQ2: 20\n*Q3: 45');
  await until('chart rows change the drawing', `document.querySelectorAll('.editor-stage .chart-bar').length === 3`);

  // insert a heading block after the chart, give it an animation
  await panelSet('[data-insert-kind]', 'heading');
  await clickButton('.editor-panel-body [data-action=insert]');
  await until('a block is inserted and selected', `${SELECTED}?.tagName === 'H2' && document.querySelectorAll('.editor-stage .scene h2').length === 2`);
  await panelSet('[data-element-field=animation]', 'preset:bounce-in');
  await until('choosing a ready-made animation shows its keyframes', `document.querySelectorAll('.editor-keyframe-table tbody tr').length === 4`);
  await panelSet('[data-anim-field=duration]', '1500');
  await clickButton('.editor-panel-body [data-action=add-keyframe]');
  await until('keyframes can be added', `document.querySelectorAll('.editor-keyframe-table tbody tr').length === 5`);
  await clickButton('.editor-panel-body [data-action=preview-animation]');
  await until('preview plays the animation on the canvas', `${SELECTED}.getAnimations().length > 0`);
  await t.settle();

  // free placement
  await clickButton('.editor-panel-body [data-element-field=free]');
  await until('place freely shows the drag handle', `getComputedStyle(document.querySelector('.editor-move')).display !== 'none'`);
  const x1 = await ev(field('--x'));
  await t.drag(await t.centre('.editor-move'), 120, 60);
  await t.waitFor(`${field('--x')} !== ${x1}`);
  const x2 = await ev(field('--x'));
  t.check('dragging moves a free element (on the 8 px grid)', x2 > x1 && x2 % 8 === 0, x1 + ' -> ' + x2);
  await press('ArrowRight', 'ArrowRight', 39);
  await until('arrow keys nudge a free element', `${field('--x')} === ${x2 + 1}`);

  // free placement of a nested element keeps its place on screen
  await goSlide('numbers');
  await t.click('.editor-stage .scene .stat .stat-label');
  await t.waitFor(`${SELECTED}?.classList.contains('stat-label')`);
  const rectOf = `(() => { const r = ${SELECTED}.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y)]; })()`;
  const before = await ev(rectOf);
  await clickButton('.editor-panel-body [data-element-field=free]');
  await t.waitFor(`${SELECTED}?.classList.contains('is-free')`);
  const after = await ev(rectOf);
  t.check('place freely keeps a nested element where it was', Math.abs(before[0] - after[0]) <= 2 && Math.abs(before[1] - after[1]) <= 2, before + ' -> ' + after);
  await press('z', 'KeyZ', 90, CTRL);
  await t.waitFor(`!document.querySelector('.editor-stage .scene .stat-label.is-free')`);
  await goSlide('chart-2');
  await t.click('.editor-stage .scene h2');
  await t.waitFor(`${SELECTED}?.tagName === 'H2'`);

  // delete and undo
  const h2Before = await ev(`document.querySelectorAll('.editor-stage .scene h2').length`);
  await press('Escape', 'Escape', 27);   // leave the text (the element stays selected); Delete then removes the element
  await until('Esc leaves the text but keeps the element selected', `!!${SELECTED} && !document.activeElement.isContentEditable`);
  await press('Delete', 'Delete', 46);
  await until('Delete removes the selected element', `document.querySelectorAll('.editor-stage .scene h2').length === ${h2Before - 1}`);
  await press('z', 'KeyZ', 90, CTRL);
  await until('Ctrl+Z brings it back', `document.querySelectorAll('.editor-stage .scene h2').length === ${h2Before}`);

  // slide settings, reorder
  await tab('slide');
  await panelSet('[data-slide-field=transition]', 'zoom');
  await panelSet('[data-slide-field=notes]', 'Say this first.\n1: At the first click.');
  await panelSet('[data-slide-field=estimate]', '1:15');
  await until('slide settings kept', `document.querySelector('.editor-panel-body [data-slide-field=estimate]').value === '1:15'`);
  await clickButton('[data-action=slide-up]');
  await until('the slide moves up in the list', `[...document.querySelectorAll('.editor-slide-list > li')].findIndex(li => li.classList.contains('is-selected')) === 10`);

  // delete an animation slide (the mode switcher): the saved file must still start without errors
  await goSlide('mindset');
  await clickButton('[data-action=delete-slide]');
  await until('an animation slide can be deleted', `document.querySelectorAll('.editor-slide-list > li').length === 38`);
  await goSlide('chart-2');

  // play from here: a new window with the edited presentation
  await clickButton('[data-action=play]');
  let playWindow = null;
  try { playWindow = await t.waitForWindow(''); } catch { /* checked below */ }
  t.check('Play from here opens the edited presentation in a new tab', !!playWindow);
  if (playWindow) await playWindow.close();

  // save into the file (stubbed): the page reloads and the editor comes back
  let written = await save();
  t.check('Save writes the file', written.length === 1, written.map(w => w.name).join(','));
  // the stubbed save cannot write the served file, so the reloaded page lacks the save stamp: the editor must say so
  // and keep the browser's settings and the draft (nothing may be lost when Save wrote into another file)
  await until('after saving into another file, the page says so and keeps everything', `/file you chose/.test(document.querySelector('.toast')?.textContent || '')`, 10000);
  if (written.length) {
    const html = written[0].text;
    const binaryAt = html.indexOf('==================== BINARY DATA');
    const readable = html.slice(0, binaryAt), slidesPart = slidesPartOf(html);
    t.check('saved: the edited text and number are in the HTML', readable.includes('>Spring 2026<') && readable.includes('data-to="57"'));
    t.check('saved: the new slide with a numbered banner', /SLIDE 11 · chart-2/.test(readable) && !readable.includes('data-name="mindset"') && readable.includes('data-name="chart-2"') && readable.includes('data-transition="zoom"') && readable.includes('data-estimate="75"'));
    t.check('saved: the notes as paragraphs with a click step', readable.includes('<p>Say this first.</p><p data-note-step="1">At the first click.</p>'));
    t.check('saved: the animation in the readable ANIMATIONS block', /"bounce-in": \{\s+"trigger": "slide",\s+"duration": 1500/.test(readable) && readable.includes('data-animation="bounce-in"'));
    t.check('saved: no editor leftovers in the slides', !/contenteditable|is-editor-selected|is-previewing|chart-drawing|is-active/.test(slidesPart), (slidesPart.match(/contenteditable|is-editor-selected|is-previewing|chart-drawing|is-active/) || [''])[0]);
    t.check('saved: no file data inside the slides (images point to the ASSETS block)', !/src="data:/.test(readable) && readable.includes('data-asset="img/placeholder-1.svg"'));
    t.check('saved: the ASSETS block comes after the readable part, then the MAIN SCRIPT', binaryAt > 0 && html.indexOf('id="deckAssets"') > binaryAt && html.indexOf('==================== MAIN SCRIPT') > html.indexOf('id="deckAssets"'));
    t.check('saved: the READ ME FIRST guide is still at the top', html.slice(0, 2000).includes('READ ME FIRST'));
    const newErrors = await openSaved(html, 'chart-2');
    t.check('the saved file opens and shows the new slide', (await ev(`document.querySelectorAll('.scene.is-active .chart-bar').length`)) === 3);
    t.check('the saved file has 38 slides (one added, one deleted) and its images', (await ev(`document.querySelectorAll('#chapterBar button').length`)) === 38 && (await ev(`document.querySelector('.logo img').src.startsWith('data:image/')`)));
    t.check('the saved file plays the custom animation (CSS made from the block)', /@keyframes deck-bounce-in/.test(await ev(`document.getElementById('deckAnimationStyles').textContent`)));
    t.check('no errors in the saved file', newErrors() === 0, t.errors.slice(-3).join(' | ').slice(0, 300));
  }

  // ================= B: Animations tab, style, shapes, keys, clipboard, background, template, save =================
  await openClean('numbers');
  t.check('E opens the editor on numbers', (await ev(`${CANVAS}.dataset.name`)) === 'numbers');
  t.check('the panel has an Animations tab', await ev(`!!document.querySelector('.editor-tabs [data-tab="animations"]')`));
  await tab('animations');
  const rows = await ev(`document.querySelectorAll('.editor-panel-body .anim-row').length`);
  t.check('Animations tab lists the elements that rise in with the slide', rows >= 8, String(rows));
  t.check('Animations tab: nothing waits for a click yet', await ev(`!!document.querySelector('.editor-panel-body [data-ui="editor.noClicks"]')`));
  await ev(`(() => { const row = [...document.querySelectorAll('.anim-row')].find(r => r.querySelector('.anim-label').textContent === 'The numbers'); const f = row.querySelector('input'); f.value = 12; f.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  await until('Animations tab: changing the order writes --order into the slide', `/<h2 class="reveal" style="--order: ?12;?"/.test(${MODEL}.outerHTML)`);
  await until('Animations tab: the list follows the new order (heading last)', `[...document.querySelectorAll('.anim-row .anim-label')].slice(-1)[0].textContent === 'The numbers'`);
  await ev(`[...document.querySelectorAll('.anim-row .anim-label')].find(b => b.textContent === 'The numbers').click()`);
  await until('clicking a name in the list selects the element', `${SELECTED}?.tagName === 'H2' && document.querySelector('.anim-row.is-selected .anim-label')?.textContent === 'The numbers'`);
  // make the eyebrow a click item
  await ev(`[...document.querySelectorAll('.anim-row .anim-label')].find(b => b.textContent.startsWith('Period'))?.click()`);
  await t.waitFor(`${SELECTED}?.classList.contains('eyebrow')`);
  await tab('element');
  await panelSet('[data-element-field="appear"]', 'click');
  await tab('animations');
  await until('Animations tab: the click item is listed under "on click 1"', `[...document.querySelectorAll('.editor-panel-body h4')].some(h => /click 1/.test(h.textContent))`);

  // Play slide and Next click
  await t.click('.editor-panel-body [data-action="play-slide"]');
  await until('Play slide: the canvas plays (not still)', `(() => { const s = document.querySelector('.editor-stage'); return !s.classList.contains('still-slide') && s.classList.contains('is-playing-preview'); })()`);
  await until('Play slide: the elements rise in (animations running)', `[...document.querySelectorAll('.editor-stage .scene .reveal')].filter(e => e.getAnimations().length).length >= 5`);
  t.check('Play slide: the click item waits', await t.waitFor(`getComputedStyle(document.querySelector('.editor-stage .scene .eyebrow')).opacity === '0'`, { timeout: 8000 }).then(() => true, () => false));   // (under load the play starts a little later)
  t.check('Play slide: texts cannot be typed in while it plays', await ev(`!document.querySelector('.editor-stage [contenteditable="true"]')`));
  await t.click('.editor-panel-body [data-action="play-click"]');
  await until('Next click: the click item appears', `document.querySelector('.editor-stage .scene .eyebrow').classList.contains('is-revealed')`);
  // a change while it plays: the still slide comes back first, nothing of the playing state goes into the file
  await t.click('.editor-panel-body [data-action="play-slide"]');
  await t.waitFor(`document.querySelector('.editor-stage').classList.contains('is-playing-preview')`);
  await ev(`(() => { const row = [...document.querySelectorAll('.anim-row')][1]; const f = row.querySelector('input'); f.value = 2; f.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  await until('a change while playing stops playing and writes no play state', `document.querySelector('.editor-stage').classList.contains('still-slide') && !/is-visible|is-revealed|contenteditable/.test(${MODEL}.outerHTML) && /data-to="42">42</.test(${MODEL}.outerHTML)`);
  await t.click('.editor-panel-body [data-action="play-slide"]');
  await t.waitFor(`document.querySelector('.editor-stage').classList.contains('is-playing-preview')`);
  await t.click('.editor-panel-body [data-action="play-click"]');
  await blur();
  await press('Escape', 'Escape', 27);
  await until('Esc stops playing: the canvas is still again and editable', `document.querySelector('.editor-stage').classList.contains('still-slide') && !!document.querySelector('.editor-stage [contenteditable="true"]')`);
  t.check('Esc while playing keeps the editor open', await ev(`!document.querySelector('.editor').hidden`));

  // Style
  await e.pick('.editor-stage .scene h2');
  await tab('element');
  t.check('Element tab has a Style section', await ev(`!!document.querySelector('.editor-panel-body [data-tool-field="fontSize"]')`));
  await panelSet('[data-tool-field="fontSize"]', '150%');
  await panelSet('[data-tool-field="color"]', 'var(--color-teal)');
  await panelSet('[data-tool-field="textAlign"]', 'center');
  await panelSet('[data-tool-field="rotate"]', '-4');
  await until('Style: size, colour, alignment and rotation as plain inline CSS', `(() => { const h = ${MODEL}.querySelector('h2').outerHTML.match(/<h2[^>]*>/)[0]; return (/data-text-size="150% /.test(h) || /font-size: 150%/.test(h)) && /color: var\\(--color-teal\\)/.test(h) && /text-align: center/.test(h) && /rotate: -4deg/.test(h); })()`);
  await until('Style: the canvas shows the rotation', `getComputedStyle(document.querySelector('.editor-stage .scene h2')).rotate === '-4deg'`);
  await clickButton('[data-action="undo"]');
  await until('Undo takes the last style change back', `(() => { const h = ${MODEL}.querySelector('h2').outerHTML.match(/<h2[^>]*>/)[0]; return !/rotate/.test(h) && /data-text-size="150% /.test(h); })()`);

  // shapes and text box (placed freely)
  await insertAndWait('rect');
  await until('Insert rectangle: a free shape in the slide, selected', `(() => { const s = document.querySelector('.editor-stage .scene > .shape.is-free[data-shape="rect"]'); return !!s && s.classList.contains('is-editor-selected'); })()`);
  t.check('the shape is drawn with its own height', (await ev(`Math.round(document.querySelector('.editor-stage .scene > .shape').getBoundingClientRect().height / document.querySelector('.editor-stage').getBoundingClientRect().height * 900)`)) === 200);
  t.check('the shape has a Height field', await ev(`!!document.querySelector('.editor-panel-body [data-element-field="--h"]')`));
  t.check('a free shape has its 8 resize handles', (await ev(`document.querySelectorAll('.editor-handle[data-dir]').length`)) === 8);
  const size = () => ev(`(() => { const s = document.querySelector('.editor-stage .scene > .shape'); return [parseFloat(s.style.getPropertyValue('--w')), parseFloat(s.style.getPropertyValue('--h'))]; })()`);
  const size0 = await size();
  await t.drag(await t.centre('.editor-resize'), 80, 60);
  await t.waitFor(`parseFloat(document.querySelector('.editor-stage .scene > .shape').style.getPropertyValue('--w')) > ${size0[0]}`);
  const size1 = await size();
  t.check('the right handle changes only the width of a shape', size1[0] > size0[0] && size1[1] === size0[1], JSON.stringify([size0, size1]));
  await t.drag(await t.centre('.editor-resize-corner'), 40, 30);
  await t.waitFor(`parseFloat(document.querySelector('.editor-stage .scene > .shape').style.getPropertyValue('--h')) > ${size1[1]}`);
  const size2 = await size();
  t.check('the corner handle changes the width and the height of a shape', size2[0] > size1[0] && size2[1] > size1[1], JSON.stringify([size1, size2]));
  await panelSet('[data-tool-field="color"]', 'var(--color-rose)');
  await until('the shape takes the colour', `/color: var\\(--color-rose\\)/.test(${MODEL}.querySelector('.shape').outerHTML.match(/<div class="shape[^>]*>/)[0])`);
  await t.click('.editor-panel-body [data-action="to-front"]');
  await until('To the front gives the shape a z-index above the others', `/z-index: \\d+/.test(${MODEL}.querySelector('.shape').outerHTML.match(/<div class="shape[^>]*>/)[0])`);
  // To the back: behind the heading, so the heading is still clickable
  await panelSet('[data-element-field="--x"]', '200');
  await panelSet('[data-element-field="--y"]', '160');
  await t.click('.editor-panel-body [data-action="to-back"]');
  await until('To the back puts the shape behind the slide content (the heading stays on top)', `(() => { const h = document.querySelector('.editor-stage .scene h2'); const r = h.getBoundingClientRect(); const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return !!hit && h.contains(hit); })()`);
  // a click on the part of the shape that lies under the slide's content (not on a text) still selects it
  await e.pick('.editor-stage .scene h2');
  await t.waitFor(`${SELECTED}.tagName === 'H2'`);
  // (a spot of the shape that no text lies on: the layout's empty space over it)
  await t.clickAt(await ev(`(() => { const r = document.querySelector('.editor-stage .scene > .shape[data-shape="rect"]').getBoundingClientRect(); let fallback = { x: r.x + 6, y: r.bottom - 6 };
    for (let y = r.bottom - 6; y > r.y; y -= 12) for (let x = r.x + 6; x < r.right - 6; x += 12) { const hit = document.elementFromPoint(x, y); if (hit && !hit.closest('.editor-overlay') && !hit.closest('.shape') && ![...hit.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && !hit.matches('h1, h2, p, li, span, b, svg, path, img')) return { x, y }; }
    return fallback; })()`));
  await until('a shape behind the content can still be selected with a click', `!!document.querySelector('.editor-stage .scene > .shape.is-editor-selected')`);
  await t.click('.editor-panel-body [data-action="to-front"]');
  // Ctrl+D on a free element: the copy sits next to it
  const shapeCount = await ev(`document.querySelectorAll('.editor-stage .scene > .shape').length`);
  await blur(); await press('d', 'KeyD', 68, CTRL);
  await until('Ctrl+D of a free shape puts the copy next to it, not on top', `(() => { const s = [...document.querySelectorAll('.editor-stage .scene > .shape[data-shape="rect"]')]; return s.length === 2 && s[0].style.getPropertyValue('--x') !== s[1].style.getPropertyValue('--x'); })() && document.querySelectorAll('.editor-stage .scene > .shape').length === ${shapeCount + 1}`);
  await blur(); await press('Delete', 'Delete', 46);
  await t.waitFor(`document.querySelectorAll('.editor-stage .scene > .shape').length === ${shapeCount}`);
  // the heading placed freely inside .content, copied and pasted: the copy lands next to it (slide coordinates)
  await e.pick('.editor-stage .scene h2');
  await ev(`(() => { const f = document.querySelector('.editor-panel-body [data-element-field="free"]'); f.checked = true; f.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  await t.waitFor(`document.querySelector('.editor-stage .scene h2').classList.contains('is-free')`);
  const h2Box = await ev(`(() => { const r = document.querySelector('.editor-stage .scene h2').getBoundingClientRect(); return [r.x, r.y]; })()`);
  await blur();
  const c2 = await clipboardEvent('copy');
  await clipboardEvent('paste', `dt.setData('text/plain', ${JSON.stringify(c2.text)})`);
  await t.waitFor(`document.querySelectorAll('.editor-stage .scene h2').length === 2`);
  const pastedBox = await ev(`(() => { const all = document.querySelectorAll('.editor-stage .scene h2'); const r = all[all.length - 1].getBoundingClientRect(); return [r.x, r.y, all.length]; })()`);
  const scale = await e.scale();
  t.check('a free element inside a container, pasted: lands 24 px from the original', pastedBox[2] === 2 && Math.abs((pastedBox[0] - h2Box[0]) / scale - 24) < 3 && Math.abs((pastedBox[1] - h2Box[1]) / scale - 24) < 3, JSON.stringify([h2Box, pastedBox, scale]));
  await clickButton('[data-action="undo"]');
  await t.waitFor(`document.querySelectorAll('.editor-stage .scene h2').length === 1`);
  await clickButton('[data-action="undo"]');
  await until('undo takes the paste and the free placement back', `document.querySelectorAll('.editor-stage .scene h2').length === 1 && !document.querySelector('.editor-stage .scene h2').classList.contains('is-free')`);
  await insertAndWait('arrow');
  await insertAndWait('textbox');
  await until('Insert arrow and text box: both in the slide', `!!document.querySelector('.editor-stage .scene > .shape[data-shape="arrow"]') && !!document.querySelector('.editor-stage .scene > p.text-box.is-free')`);
  t.check('the text box can be typed in', await ev(`document.querySelector('.editor-stage .scene > p.text-box').getAttribute('contenteditable') === 'true'`));

  // keys: Tab, Alt+Up, Ctrl+D, Ctrl+Down, ?
  await e.pick('.editor-stage .scene .stat');
  await blur();
  const firstSelected = await ev(`${SELECTED}?.className`);
  await press('Tab', 'Tab', 9);
  await until('Tab selects the next element', `${SELECTED}?.className !== ${JSON.stringify(firstSelected)}`);
  await press('ArrowUp', 'ArrowUp', 38, ALT);
  await until('Alt+↑ selects the parent', `${SELECTED}?.classList.contains('stat') === true`);
  const stats = await ev(`document.querySelectorAll('.editor-stage .scene .stat').length`);
  await press('d', 'KeyD', 68, CTRL);
  await until('Ctrl+D duplicates the element', `document.querySelectorAll('.editor-stage .scene .stat').length === ${stats + 1}`);
  const indexBefore = await ev(`[...document.querySelectorAll('.editor-stage .scene .stat')].indexOf(${SELECTED})`);
  await blur();
  await press('ArrowDown', 'ArrowDown', 40, CTRL);
  await until('Ctrl+↓ moves the element down', `[...document.querySelectorAll('.editor-stage .scene .stat')].indexOf(${SELECTED}) === ${indexBefore + 1}`);
  await blur();
  await press('?', 'Slash', 191, SHIFT);
  await until('? shows the editor keys (47 rows)', `${ADD_DIALOG_OPEN} && document.querySelectorAll('.editor-shortcuts dt').length === 47`);
  await press('Escape', 'Escape', 27);
  await until('Esc closes the keys window', `document.querySelector('.editor-dialog').hidden && !document.querySelector('.editor').hidden`);
  await t.click('.editor-slides [data-action="add-slide"]');
  await t.waitFor(ADD_DIALOG_OPEN);
  t.check('the + Slide window has its own title again', /template|layout|slide/i.test(await ev(`document.querySelector('.editor-dialog-head b').textContent`)), await ev(`document.querySelector('.editor-dialog-head b').textContent`));
  await clickButton('[data-action="close-dialog"]');
  await t.waitFor(`document.querySelector('.editor-dialog').hidden`);

  // clipboard: copy the shape, paste it on another slide; paste text and an image
  await e.pick('.editor-stage .scene > .shape[data-shape="rect"]');
  await blur();
  const copied = await clipboardEvent('copy');
  t.check('Ctrl+C copies the element (the browser clipboard gets a marker)', copied.prevented && copied.text.startsWith('[Presentation editor element]'), JSON.stringify(copied));
  await goSlide('quality');
  await blur();
  const pasted = await clipboardEvent('paste', `dt.setData('text/plain', ${JSON.stringify(copied.text)})`);
  await until('Ctrl+V pastes it on another slide', `!!document.querySelector('.editor-stage .scene[data-name="quality"] > .shape.is-free[data-shape="rect"]')`);
  t.check('the paste was handled (not left to the browser)', pasted.prevented);
  await until('the pasted shape is in the model of that slide', `/data-shape="rect"/.test(${MODEL}.outerHTML)`);
  await blur();
  await clipboardEvent('paste', `dt.setData('text/plain', 'Pasted from another app')`);
  await until('pasting text makes a text box', `document.querySelector('.editor-stage .scene > p.text-box')?.textContent === 'Pasted from another app'`);
  await blur();
  await clipboardEvent('paste', `dt.items.add(window.__pngFile())`);
  await until('pasting an image makes an image block with its file in the ASSETS block', `(() => { const img = document.querySelector('.editor-stage .scene .image-frame img[data-asset*="pasted"]'); return !!img && img.src.startsWith('data:image/png'); })()`);
  // typing in a text: paste stays the browser's own (plain text into the text)
  await ev(`document.querySelector('.editor-stage .scene > p.text-box').focus()`);
  await clipboardEvent('paste', `dt.setData('text/plain', 'X')`);
  t.check('while typing, paste goes into the text, not a new block', (await ev(`document.querySelectorAll('.editor-stage .scene > p.text-box').length`)) === 1);
  await blur();

  // image fit
  await e.pick('.editor-stage .scene .image-frame');
  await tab('element');
  await panelSet('[data-tool-field="objectFit"]', 'contain');
  await until('Image fit writes object-fit on the image', `/<img[^>]*style="object-fit: contain;?"/.test(${MODEL}.outerHTML)`);

  // slide background and save as template
  await blur(); await press('Escape', 'Escape', 27);
  await tab('slide');
  await panelSet('[data-tool-field="backgroundColor"]', '#203040');
  await until('Background colour on the slide', `/<section[^>]*style="[^"]*background-color: rgb\\(32, 48, 64\\)/.test(${MODEL}.outerHTML)`);
  await ev(`window.__nextFile = window.__pngFile(); true`);
  await t.click('.editor-panel-body [data-action="background-image"]');
  await until('Background image: data-asset-background on the slide', `/<section[^>]*data-asset-background="img\\/quality-background\\.png"/.test(${MODEL}.outerHTML)`);
  await until('Background image shows on the canvas', `/url\\("?data:image\\/png/.test(getComputedStyle(${CANVAS}).backgroundImage)`);
  await panelSet('[data-tool-field="backgroundDim"]', '40');
  await until('Darken the image: --background-dim', `/--background-dim: 0\\.40/.test(${MODEL}.outerHTML.match(/<section[^>]*>/)[0])`);
  await until('the thumbnail shows the background too', `/url\\("?data:image\\/png/.test(getComputedStyle(document.querySelector('.editor-slide-list li.is-selected .scene')).backgroundImage)`);
  await t.click('.editor-panel-body [data-action="save-template"]');
  await t.waitFor(`/saved|template/i.test(document.querySelector('.toast')?.textContent || '')`).catch(() => {});
  await t.click('.editor-slides [data-action="add-slide"]');
  await until('Save as template: the slide is in + Slide', `[...document.querySelectorAll('.editor-template-grid button')].some(b => b.dataset.template === 'template-quality')`);
  await ev(`[...document.querySelectorAll('.editor-template-grid button')].find(b => b.dataset.template === 'template-quality').click()`);
  await until('a slide made from the saved template has its background and shapes', `(() => { const s = document.querySelector('.editor-stage .scene'); return s.dataset.name !== 'quality' && s.hasAttribute('data-asset-background') && !!s.querySelector('.shape'); })()`);
  await ev(`document.querySelector('[data-action="close-dialog"]')?.click()`);
  // cut the pasted image (its file is then used nowhere, so Save drops it); after the reload it pastes with its file
  await e.pick('.editor-stage .scene .image-frame');
  await blur();
  const cutImage = await clipboardEvent('cut');
  await until('Ctrl+X cuts the image block', `!document.querySelector('.editor-stage .scene .image-frame')`);
  t.check('the cut put the element marker on the clipboard', cutImage.text.startsWith('[Presentation editor element]'));
  await goSlide('timeline'); await tab('slide');
  t.check('Save as template is not offered on a slide with its own script', await ev(`!document.querySelector('.editor-panel-body [data-action="save-template"]')`));
  await goSlide('quality');

  // save and open the saved file
  written = await save();
  t.check('Save writes the file', written.length === 1);
  if (written.length) {
    const html = written[0].text;
    const readable = html.slice(0, html.indexOf('==================== BINARY DATA')), slidesPart = slidesPartOf(html);
    t.check('saved: shapes as readable SVG in the slides', /<div class="shape is-free" data-shape="rect" style="[^"]*--h: \d+px/.test(slidesPart) && slidesPart.includes('<svg viewBox="0 0 100 100"'));
    t.check('saved: a pasted text box has a line of its own, before the speaker notes', /\n\s+<p class="text-box is-free"[^>]*>X?Pasted from another app<\/p>\n/.test(slidesPart));
    t.check('saved: style as inline CSS', slidesPart.includes('data-text-size="150% ') && slidesPart.includes('color: var(--color-teal)'));
    t.check('saved: background names an asset, the image itself is in the ASSETS block', slidesPart.includes('data-asset-background="img/quality-background.png"') && !/--asset-background/.test(slidesPart) && /"img\/quality-background\.png": "data:image\/png/.test(html));
    t.check('saved: the template is in the SLIDE TEMPLATES block', /TEMPLATE · [^\n]*\(saved in the editor\)/.test(readable) && readable.includes('data-name="template-quality"'));
    t.check('saved: no editor leftovers in the slides', !noEditorLeftovers.test(slidesPart), (slidesPart.match(noEditorLeftovers) || [''])[0]);
    // the editor comes back after the reload; the cut image pastes with its file; without a copied element the marker text gives a message
    if (!(await ev(`!!document.querySelector('.editor') && !document.querySelector('.editor').hidden`))) {
      await t.key('e', 'KeyE', 69);
      await t.waitFor(`!!document.querySelector('.editor .editor-stage .scene') && !document.querySelector('.editor').hidden`, { label: 'editor back' }).catch(() => {});
    }
    if (await ev(`!!document.querySelector('.editor') && !document.querySelector('.editor').hidden`)) {
      await blur();
      const boxes = await ev(`document.querySelectorAll('.editor-stage .scene > p.text-box').length`);
      await goSlide('quality'); await blur();
      await clipboardEvent('paste', `dt.setData('text/plain', ${JSON.stringify(cutImage.text)})`);
      await until('after Save and the reload, the cut image pastes with its file', `(() => { const img = document.querySelector('.editor-stage .scene .image-frame img'); return !!img && img.src.startsWith('data:image/png'); })()`);
      await ev(`Object.keys(sessionStorage).filter(k => k.endsWith('-editor.clipboard')).forEach(k => sessionStorage.removeItem(k)); true`);
      await clipboardEvent('paste', `dt.setData('text/plain', '[Presentation editor element] Something')`);
      await until('the marker text with nothing copied here: a message, no text box', `document.querySelectorAll('.editor-stage .scene > p.text-box').length === ${boxes} && /copy it again/.test(document.querySelector('.toast')?.textContent || '')`);
    } else t.check('the editor came back after Save', false);
    const newErrors = await openSaved(html, 'quality');
    t.check('saved file: the slide shows its background image', /url\("?data:image\/png/.test(await ev(`getComputedStyle(document.querySelector('.scene.is-active')).backgroundImage`)));
    t.check('saved file: the shape is drawn on the slide', (await ev(`Math.round(document.querySelector('.scene.is-active > .shape').getBoundingClientRect().width)`)) > 100);
    await ev(`location.hash = '#numbers'`);
    await t.waitFor(`document.querySelector('.scene.is-active')?.dataset.name === 'numbers'`);
    t.check('saved file: the click item waits for its click, then appears', (await ev(`getComputedStyle(document.querySelector('.scene.is-active .eyebrow')).opacity`)) === '0');
    t.check('no errors in the saved file', newErrors() === 0, t.errors.slice(-3).join(' | ').slice(0, 300));
  }

  // ================= C: several elements, align, spread, timeline, menu, colour, find and replace =================
  await openClean('numbers');
  t.check('E opens the editor on numbers (again)', (await ev(`${CANVAS}.dataset.name`)) === 'numbers');
  await tab('animations');
  const bars = await ev(`[...document.querySelectorAll('.anim-row .anim-bar')].map(b => parseFloat(b.style.left))`);
  t.check('Animations tab: a timeline bar under every row', bars.length >= 8, JSON.stringify(bars));
  t.check('Animations tab: later items start further right', bars[0] < bars[1] && bars[1] < bars[2], JSON.stringify(bars.slice(0, 4)));
  t.check('Animations tab: the bar tells when it starts and how long', /Starts at 300 ms, moves for 800 ms/.test(await ev(`document.querySelector('.anim-track').title`)), await ev(`document.querySelector('.anim-track').title`));

  // three shapes, placed apart
  await e.pick('.editor-stage .scene h2'); await tab('element');
  for (const [x, y] of [[100, 600], [520, 650], [1100, 700]]) {
    await insertAndWait('rect');
    await panelSet('[data-element-field="--x"]', String(x));
    await panelSet('[data-element-field="--y"]', String(y));
    await panelSet('[data-element-field="--w"]', String(120 + x / 10));
  }
  await t.waitFor(`document.querySelectorAll('.editor-stage .scene > .shape').length === 3`);
  t.check('three shapes on the slide', true);
  const boxes = () => ev(`[...document.querySelectorAll('.editor-stage .scene > .shape')].map(s => { const r = s.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; })`);
  const shapeAt = (i, shift) => ev(`window.__shapes[${i}].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, shiftKey: ${!!shift} }))`);
  await ev(`window.__shapes = [...document.querySelectorAll('.editor-stage .scene > .shape')]; true`);
  await shapeAt(0); await shapeAt(1, true); await shapeAt(2, true);
  await until('Shift+click: three elements selected, each with an outline', `document.querySelectorAll('.editor-group-box').length === 3 && /3 elements selected/.test(document.querySelector('.editor-panel-body').textContent)`);
  await t.click('.editor-panel-body [data-action="align-left"]');
  let b = await boxes();
  t.check('Align left: the left edges line up', b[0][0] === b[1][0] && b[1][0] === b[2][0], JSON.stringify(b));
  await t.click('.editor-panel-body [data-action="align-middle"]');
  b = await boxes();
  t.check('Align middle: the middles line up', Math.abs((b[0][1] + b[0][3] / 2) - (b[2][1] + b[2][3] / 2)) <= 1, JSON.stringify(b));
  await ev(`window.__shapes[1].style.setProperty('--x', '300px'); window.__shapes[2].style.setProperty('--x', '1200px'); true`);
  await t.click('.editor-panel-body [data-action="spread-across"]');
  b = (await boxes()).sort((m, n) => m[0] - n[0]);
  const gap1 = b[1][0] - (b[0][0] + b[0][2]), gap2 = b[2][0] - (b[1][0] + b[1][2]);
  t.check('Spread across: equal space between them', Math.abs(gap1 - gap2) <= 2, JSON.stringify([gap1, gap2]));
  t.check('the group stays selected after aligning', (await ev(`document.querySelectorAll('.editor-group-box').length`)) === 3);
  const xs = await ev(`window.__shapes.map(s => parseFloat(s.style.getPropertyValue('--x')))`);
  await blur(); await press('ArrowRight', 'ArrowRight', 39, SHIFT);
  await until('Shift+→ moves the whole group by 10 px', `window.__shapes.map(s => parseFloat(s.style.getPropertyValue('--x'))).every((x, i) => x === ${JSON.stringify(xs)}[i] + 10)`);
  // drag one: the others follow
  await shapeAt(0, true);
  await shapeAt(0, true);
  await t.waitFor(`getComputedStyle(document.querySelector('.editor-move')).display !== 'none'`);
  const ys = `window.__shapes.map(s => parseFloat(s.style.getPropertyValue('--y')))`;
  const yBefore = await ev(ys);
  await t.drag(await t.centre('.editor-move'), 0, -57);
  await t.waitFor(`${ys}[0] !== ${yBefore[0]}`);
  const yAfter = await ev(ys);
  t.check('dragging one element of the group moves the others the same way', yAfter.every((y, i) => Math.abs((y - yBefore[i]) - (yAfter[0] - yBefore[0])) < 1), JSON.stringify([yBefore, yAfter]));
  await blur(); await press('Delete', 'Delete', 46);
  await until('Delete removes the whole group', `document.querySelectorAll('.editor-stage .scene > .shape').length === 0`);
  await clickButton('[data-action="undo"]');
  await until('Undo brings them back', `document.querySelectorAll('.editor-stage .scene > .shape').length === 3`);
  await e.pick('.editor-stage .scene h2');
  await until('a plain click ends the group', `document.querySelectorAll('.editor-group-box').length === 0`);

  // Alt while dragging: no snapping
  await e.pick('.editor-stage .scene > .shape');
  await t.waitFor(`getComputedStyle(document.querySelector('.editor-move')).display !== 'none'`);
  await t.drag(await t.centre('.editor-move'), 13.3, 5.1, { modifiers: ALT });
  await until('Alt while dragging: no snapping to the 8 px grid', `parseFloat(document.querySelectorAll('.editor-stage .scene > .shape')[0].style.getPropertyValue('--x')) % 8 !== 0`);

  // right-click menu
  const rightClickHeading = async () => { await t.clickAt(await t.centre('.editor-stage .scene h2'), { button: 'right' }); };
  await rightClickHeading();
  await until('Right-click shows the menu and selects the element', `(() => { const m = document.querySelector('.editor-menu'); return !!m && !m.hidden && ${SELECTED}?.tagName === 'H2'; })()`);
  await clickButton('.editor-menu [data-menu="duplicate"]');
  await until('Menu: Duplicate copies the heading and closes the menu', `document.querySelectorAll('.editor-stage .scene h2').length === 2 && document.querySelector('.editor-menu').hidden`);
  await rightClickHeading();
  await t.waitFor(`!document.querySelector('.editor-menu').hidden`);
  await blur(); await press('Escape', 'Escape', 27);
  await until('Esc closes the menu and keeps the editor open', `document.querySelector('.editor-menu').hidden && !document.querySelector('.editor').hidden`);
  await clickButton('[data-action="undo"]');
  await t.waitFor(`document.querySelectorAll('.editor-stage .scene h2').length === 1`);

  // own colour
  await e.pick('.editor-stage .scene h2'); await tab('element');
  await panelSet('[data-tool-field="color"]', 'custom');
  await until('Own colour… shows a colour picker', `!!document.querySelector('.editor-panel-body [data-tool-field="colorCustom"]')`);
  await panelSet('[data-tool-field="colorCustom"]', '#ff3366');
  await until('the own colour is written into the slide', `/<h2[^>]*style="[^"]*color: rgb\\(255, 51, 102\\)/.test(${MODEL}.outerHTML)`);

  // find and replace
  const setFind = (find, replace) => ev(`(() => { const b = document.querySelector('.editor-panel-body'); b.querySelector('[data-find-field="find"]').value = ${JSON.stringify(find)}; ${replace == null ? '' : `b.querySelector('[data-find-field="replace"]').value = ${JSON.stringify(replace)};`} })()`);
  await tab('deck');
  await setFind('number means', 'figure says');
  await t.click('.editor-panel-body [data-action="find-count"]');
  await until('Find counts the words in all slides', `/Found 3× on 1 slide\\./.test(document.querySelector('.toast')?.textContent || '')`);
  await t.click('.editor-panel-body [data-action="replace-all"]');
  await until('Replace all changes them in the slides', `[...document.querySelectorAll('.editor-stage .stat-label')].filter(l => l.textContent.includes('figure says')).length === 3 && !/number means/.test(${MODEL}.outerHTML.replace(/<aside class="speaker-notes">[\\s\\S]*?<\\/aside>/, ''))`);
  t.check('the find fields keep their words after replacing', (await ev(`document.querySelector('.editor-panel-body [data-find-field="find"]').value`)) === 'number means');
  await clickButton('[data-action="undo"]');
  await until('Undo takes the replacement back', `/number means/i.test(${MODEL}.outerHTML)`);

  // the menu's Copy also writes the marker to the system clipboard
  await ev(`window.__copied = null; document.addEventListener('copy', e => { window.__copied = e.target && e.target.value; }, { once: true }); true`);
  await e.pick('.editor-stage .scene h2');
  await blur();
  await rightClickHeading();
  await t.waitFor(`!document.querySelector('.editor-menu').hidden`);
  await clickButton('.editor-menu [data-menu="copy"]');
  await until('Menu Copy puts the marker on the system clipboard too', `/^\\[Presentation editor element\\] /.test(window.__copied || '')`);
  // keys in the menu: arrows walk through it, Delete closes it and deletes nothing
  await rightClickHeading();
  await t.waitFor(`!document.querySelector('.editor-menu').hidden`);
  await press('ArrowDown', 'ArrowDown', 40);
  await until('↓ in the menu moves to the next item', `document.activeElement?.dataset.menu === 'cut'`);
  const h2count = await ev(`document.querySelectorAll('.editor-stage .scene h2').length`);
  await press('Delete', 'Delete', 46);
  await until('Delete with the menu open only closes the menu', `document.querySelectorAll('.editor-stage .scene h2').length === ${h2count} && document.querySelector('.editor-menu').hidden`);
  // Shift+click from a text being typed: the keyboard leaves the text, Delete works on the group
  await ev(`(() => { const h = document.querySelector('.editor-stage .scene h2'); h.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); h.focus(); })()`);
  await ev(`document.querySelector('.editor-stage .scene .eyebrow').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, shiftKey: true }))`);
  await until('Shift+click while typing: the group gets the keyboard (no text has focus)', `!document.activeElement?.isContentEditable && document.querySelectorAll('.editor-group-box').length === 2`);
  // the group survives Place freely (a redraw)
  await ev(`(() => { const f = document.querySelector('.editor-panel-body [data-element-field="free"]'); f.checked = true; f.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  await t.waitFor(`document.querySelector('.editor-stage .scene h2').classList.contains('is-free')`);
  t.check('the group stays after Place freely redraws the slide', (await ev(`document.querySelectorAll('.editor-group-box').length`)) === 2);
  await clickButton('[data-action="undo"]');
  await t.waitFor(`!document.querySelector('.editor-stage .scene h2').classList.contains('is-free')`);
  await e.pick('.editor-stage .scene h2');
  // find and replace: titles made of letters keep their read-out name in step; numbers are left alone
  await tab('deck');
  await setFind('IDEA', 'XYZW');
  await t.click('.editor-panel-body [data-action="replace-all"]');
  await goSlide('big-letters');
  await until('Replace leaves a title made of letters and its read-out name in step', `(() => { const h = document.querySelector('.editor-stage .scene h1[aria-label]'); return !!h && h.getAttribute('aria-label') === h.textContent.replace(/\\s+/g, ' ').trim(); })()`);
  await clickButton('[data-action="undo"]');
  await goSlide('numbers'); await tab('deck');
  await setFind('42');
  await t.click('.editor-panel-body [data-action="find-count"]');
  await until('Find skips numbers that count up', `/Not found/.test(document.querySelector('.toast')?.textContent || '')`);
  await goSlide('numbers');

  await e.pick('.editor-stage .scene h2');
  await ev(`document.querySelector('.editor-stage .scene .eyebrow').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, shiftKey: true }))`);
  await t.waitFor(`document.querySelectorAll('.editor-group-box').length === 2`);
  await blur(); await press('d', 'KeyD', 68, CTRL);
  await until('Ctrl+D with a group: both are copied and the copies are the group', `document.querySelectorAll('.editor-group-box').length === 2 && document.querySelectorAll('.editor-stage .scene h2').length === 2`);
  await clickButton('[data-action="undo"]');
  await t.waitFor(`document.querySelectorAll('.editor-stage .scene h2').length === 1`);
  await tab('deck'); await panelSet('[data-deck-field="stagger"]', '500');
  await tab('animations');
  await until('the timeline follows the pace set in the Presentation tab', `/Starts at 800 ms/.test([...document.querySelectorAll('.anim-track')].map(t => t.title).join('|'))`);
  await clickButton('[data-action="undo"]');
  await ev(`document.querySelector('.editor-stage .scene h2').focus(); true`);
  await sleep(2100);   // time is what is tested: a menu key more than 2 s after a pointer press comes from the keyboard
  t.check('the menu key inside the text being typed keeps the browser menu', !(await ev(`(() => { const h = document.querySelector('.editor-stage .scene h2'); const e = new MouseEvent('contextmenu', { bubbles: true, cancelable: true }); h.dispatchEvent(e); return e.defaultPrevented; })()`)));
  await blur();

  // keys list
  await press('?', 'Slash', 191, SHIFT);
  await until('? lists Shift+click, Alt while dragging and Right-click', `/Shift\\+click/.test(document.querySelector('.editor-dialog .editor-template-grid').textContent) && /Right-click/.test(document.querySelector('.editor-dialog .editor-template-grid').textContent)`);
  await press('Escape', 'Escape', 27);
}
