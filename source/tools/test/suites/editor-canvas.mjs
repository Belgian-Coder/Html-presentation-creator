// The editor's canvas, with real mouse and keyboard: "use on every slide" (transition, background), equal spacing while
// dragging, the turn handle (snap to 0/45/90, Shift 15° steps, Alt exact, readout, undo, reachable at the corner, locked),
// + Insert and dragging by the body (text box, shapes, free picture, Shift+click group, touch cancel), adding where you click
// (double-click and right-click on an empty spot), the 8 handles (resize from any side, Ctrl from the middle, turned
// element, picture ratio, text box height / auto height), arrow-key runs as one undo step, readouts, Alt distances, and
// reordering a layout block / pulling it out to place it freely.
export const covers = ['js/01-', 'js/18-', 'js/19-', 'js/20-', 'css/13-'];
export const timeoutMs = 180000;

const q = JSON.stringify;
const SEL = `document.querySelector('.editor-stage .is-editor-selected')`;

export default async function (t) {
  const ed = t.editor;
  // a clean editor on #numbers (storage emptied: nothing left over from the section before)
  const fresh = async () => {
    await t.send('Page.navigate', { url: 'about:blank' });   // (the harness answers the leave-the-page question; wait until the page has really gone)
    await t.waitFor(`location.href === 'about:blank'`, { label: 'blank page' });
    await t.open('numbers', { clear: true });
    await t.waitFor(`!document.querySelector('.editor .editor-stage .scene')`);
    await t.key('e', 'KeyE', 69);
    await t.waitFor(`!!document.querySelector('.editor .editor-stage .scene')`, { label: 'editor open' });
  };
  const v = name => ed.value(name);
  const rotation = () => t.eval(`parseFloat(${SEL}.style.rotate) || 0`);
  const shown = s => t.eval(`(() => { const n = document.querySelector(${q(s)}); return !!n && getComputedStyle(n).display !== 'none'; })()`);
  const count = s => t.eval(`document.querySelectorAll(${q(s)}).length`);
  const handle = dir => t.centre(`.editor-selection .editor-handle[data-dir="${dir}"]`);
  const menuHeading = () => t.eval(`document.querySelector('.editor-insert-menu .editor-menu-heading').textContent`);
  const xOf = () => t.eval(`${SEL} && ${SEL}.style.getPropertyValue('--x')`);
  const undo = async () => { await ed.undo(); };
  const setFree = async (x, y, w) => {
    await ed.panelSet('[data-element-field="--x"]', String(x));
    await ed.panelSet('[data-element-field="--y"]', String(y));
    if (w) await ed.panelSet('[data-element-field="--w"]', String(w));
    await t.waitFor(`parseFloat(${SEL}.style.getPropertyValue('--x')) === ${x} && parseFloat(${SEL}.style.getPropertyValue('--y')) === ${y}`);
  };
  const click = async point => { await t.mouse('mousePressed', point.x, point.y); await t.mouse('mouseReleased', point.x, point.y, { buttons: 0 }); };
  const openMenu = async () => {
    await t.click('.editor-bar [data-action="insert-menu"]');
    await t.waitFor(`!!document.querySelector('.editor-insert-menu')`);
  };

  // ================= use on every slide: transition, background (was test 16) =================
  await fresh();
  const sceneAttr = attr => t.eval(`[...document.querySelectorAll('.editor-slide-list .scene')].map(s => s.getAttribute(${q(attr)}) || '')`);
  await ed.tab('slide');
  await ed.panelSet('[data-slide-field="transition"]', 'zoom');
  await t.click('.editor-panel-body [data-action="transition-all"]');
  await t.waitFor(`[...document.querySelectorAll('.editor-slide-list .scene')].every(s => s.getAttribute('data-transition') === 'zoom')`, { label: 'transition on all' });
  const tr = await sceneAttr('data-transition');
  t.check('the transition goes to every slide', tr.length > 10 && tr.every(x => x === 'zoom'), JSON.stringify(tr));
  await t.click('.editor-panel-body [data-action="transition-all"]');
  await t.waitFor(`/already/i.test(document.querySelector('.toast')?.textContent || '')`, { label: 'already toast' });
  t.check('a second time: nothing to change, no undo step', true);
  await undo();
  await t.waitFor(`[...document.querySelectorAll('.editor-slide-list .scene')].filter(s => s.getAttribute('data-transition') === 'zoom').length === 1`, { label: 'one undo' });
  t.check('one undo step takes it back (this slide keeps its own)', true);
  t.check('no background: no "every slide" button for it', !(await t.eval(`!!document.querySelector('.editor-panel-body [data-action="background-all"]')`)));
  await ed.panelSet('[data-tool-field="backgroundColor"]', '#203040');
  await t.waitFor(`!!document.querySelector('.editor-panel-body [data-action="background-all"]')`);
  await t.click('.editor-panel-body [data-action="background-all"]');
  await t.waitFor(`[...document.querySelectorAll('.editor-slide-list .scene')].every(s => s.style.backgroundColor === 'rgb(32, 48, 64)')`, { label: 'background on all' });
  t.check('the background colour goes to every slide', true);

  // ================= equal spacing (was test 16) =================
  await fresh();
  await ed.pick('.editor-stage .scene h2'); await ed.blur();
  const shapes = `[...document.querySelectorAll('.editor-stage .scene > .shape')]`;
  for (const x of [100, 700]) { await ed.insert('rect'); await setFree(x, 620, 160); }
  await ed.insert('circle'); await setFree(360, 400, 160);
  const k = await ed.scale();
  const box = n => t.eval(`(() => { const r = ${shapes}[${n}].getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; })()`);
  const s0 = await box(0), s1 = await box(1), s2 = await box(2);
  const move = await t.centre('.editor-move');
  // drag the circle to the row of the two rects, about midway (a few px off)
  const dx = (s0.x + s0.w + s1.x - s2.w) / 2 + 3 * k - s2.x, dy = s0.y - s2.y + k;
  let bars = -1;
  await t.drag(move, dx, dy, { steps: 6, during: async () => { bars = await count('.editor-gap'); } });
  const xs = await t.eval(`${shapes}.map(s => parseFloat(s.style.getPropertyValue('--x')))`);
  const [a, b, c] = xs;
  t.check('dragged between two: it snaps to the middle (equal gaps)', Math.abs((c - (a + 160)) - (b - (c + 160))) <= 1, JSON.stringify(xs));
  t.check('the equal gaps are shown while dragging', bars === 2, String(bars));
  t.check('the bars are gone after the drag', (await count('.editor-gap')) === 0);

  // ================= the turn handle (was test 17; the handle is above the top middle) =================
  await fresh();
  await ed.pick('.editor-stage .scene h2'); await ed.blur();
  await ed.insert('rect'); await setFree(500, 400, 240);
  const first = `document.querySelector('.editor-stage .scene > .shape')`;
  t.check('a round rotate handle on a free element', await shown('.editor-rotate'));
  const turn = async (degrees, modifiers = 0) => {
    const h = await t.eval(`(() => { const r = document.querySelector('.editor-rotate').getBoundingClientRect(), b = ${first}.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, cx: b.x + b.width / 2, cy: b.y + b.height / 2 }; })()`);
    const r = Math.hypot(h.x - h.cx, h.y - h.cy), a0 = Math.atan2(h.y - h.cy, h.x - h.cx);
    await t.mouse('mousePressed', h.x, h.y, { modifiers });
    let label = null;
    for (let i = 1; i <= 8; i++) {
      const an = a0 + (degrees * Math.PI / 180) * i / 8;
      await t.mouse('mouseMoved', h.cx + r * Math.cos(an), h.cy + r * Math.sin(an), { buttons: 1, modifiers });
      if (i === 8) label = await t.eval(`document.querySelector('.editor-rotate').dataset.angle || ''`);
    }
    const an = a0 + degrees * Math.PI / 180;
    await t.mouse('mouseReleased', h.cx + r * Math.cos(an), h.cy + r * Math.sin(an), { buttons: 0, modifiers });
    await t.waitFor(`!document.querySelector('.editor-rotate').dataset.angle`, { label: 'angle label gone' });
    return label;
  };
  const rot = () => t.eval(`parseFloat(${first}.style.rotate) || 0`);
  const label = await turn(32);
  const r1 = await rot();
  t.check('dragging the handle turns the element (about 32°)', Math.abs(r1 - 32) <= 2, String(r1));
  t.check('the angle shows while turning', /^3\d°$/.test(label), label);
  t.check('the angle label is gone afterwards', true);
  await turn(20, 8);
  const r2 = await rot();
  t.check('Shift: steps of 15°', ((r2 % 15) + 15) % 15 === 0, String(r2));
  await ed.tab('element');
  t.check('the Rotate field shows it', (await t.eval(`document.querySelector('.editor-panel-body [data-tool-field="rotate"]').value`)) === String(r2));
  await undo();
  await t.waitFor(`Math.abs((parseFloat(${first}.style.rotate) || 0) - ${r1}) < 0.5`, { label: 'undo the turn' });
  t.check('one undo step per turn', true);
  await turn(10); const r3 = await rot();
  await turn(0);
  await undo();
  await t.waitFor(`Math.abs((parseFloat(${first}.style.rotate) || 0) - ${r1}) < 0.5`, { label: 'undo goes before the last real turn' });
  t.check('a click on the handle makes no undo step', true, JSON.stringify([r1, r3]));
  // near the top left corner of the slide the handle moves inside and can be reached
  await ed.tab('element'); await setFree(0, 0, 240);
  t.check('at the slide\'s top left corner the rotate handle is still reachable', await t.eval(`(() => { const h = document.querySelector('.editor-rotate').getBoundingClientRect(); const s = document.querySelector('.editor-stage-box').getBoundingClientRect(); const x = h.x + h.width / 2, y = h.y + h.height / 2; return x > s.left && y > s.top && document.elementFromPoint(x, y) === document.querySelector('.editor-rotate'); })()`));
  await ed.tab('layers');
  await t.eval(`[...document.querySelectorAll('.layer-row')].find(r => /shape/i.test(r.textContent)).querySelector('[data-layer-action="lock"]').click()`);
  await t.waitFor(`getComputedStyle(document.querySelector('.editor-rotate')).display === 'none'`, { label: 'locked' });
  t.check('a locked element has no rotate or resize handle', await t.eval(`getComputedStyle(document.querySelector('.editor-rotate')).display === 'none' && [...document.querySelectorAll('.editor-selection .editor-handle')].every(h => getComputedStyle(h).display === 'none')`));
  t.check('the saved slide has plain CSS rotate', /rotate: 3\ddeg/.test(await ed.modelHtml()));

  // ================= + Insert and drag by the body (was test 23) =================
  await fresh();
  t.check('+ Insert is in the bar', await t.eval(`!!document.querySelector('.editor-bar [data-action="insert-menu"]')`));
  await openMenu();
  t.check('it opens a list (nothing selected: at the end of the slide)', /end of the slide/i.test(await menuHeading()));
  t.check('the list has blocks and the free ones', (await count('.editor-insert-menu [data-kind]')) >= 20);
  await t.click('.editor-bar [data-action="insert-menu"]');
  await t.waitFor(`!document.querySelector('.editor-insert-menu')`);
  t.check('a second click closes it', true);
  await openMenu();
  await t.click('.editor-insert-menu [data-kind="textbox"]');
  await t.waitFor(`${SEL}?.matches('.text-box.is-free') && !document.querySelector('.editor-insert-menu')`, { label: 'text box inserted' });
  t.check('Text box: inserted, selected, list gone', true);
  await ed.blur();
  await t.eval(`window.getSelection().removeAllRanges()`);
  const x0 = parseFloat(await xOf());
  const k2 = await ed.scale();
  await t.drag(await t.centre('.editor-stage .is-editor-selected'), 200 * k2, 0);
  const x1 = parseFloat(await xOf());
  t.check('dragging the text box by its body moves it (about 200 px)', Math.abs(x1 - x0 - 200) <= 8, x0 + ' -> ' + x1);
  t.check('no text got selected, not typing in it', (await t.eval(`String(window.getSelection())`)) === '' && !(await t.eval(`document.activeElement?.isContentEditable`)));
  t.check('the editor is not left in moving state', !(await t.eval(`document.querySelector('.editor').classList.contains('is-moving')`)));
  const c2 = await t.centre('.editor-stage .is-editor-selected');
  await click(c2);
  await t.waitFor(`document.activeElement?.isContentEditable && ${SEL}.contains(document.activeElement)`, { label: 'typing cursor' });
  t.check('a click (no move) puts the cursor in it for typing, no move', parseFloat(await xOf()) === x1);
  await t.drag({ x: c2.x - 30 * k2, y: c2.y }, 120 * k2, 0);
  t.check('while typing in it, a drag selects words and does not move it', parseFloat(await xOf()) === x1, await t.eval(`String(window.getSelection())`));
  await ed.blur(); await t.eval(`window.getSelection().removeAllRanges()`);
  await ed.pick('.editor-stage .scene h2'); await ed.blur();
  await openMenu();
  t.check('with a selection: after the selected element', /after the selected/i.test(await menuHeading()));
  await t.click('.editor-insert-menu [data-kind="rect"]');
  await t.waitFor(`${SEL}?.matches('.shape')`, { label: 'rect inserted' });
  const rx0 = parseFloat(await xOf());
  await t.drag(await t.centre('.editor-stage .is-editor-selected'), -160 * k2, 80 * k2);
  t.check('a shape drags by its body', Math.abs(parseFloat(await xOf()) - rx0 + 160) <= 8, rx0 + ' -> ' + await xOf());
  await undo();
  await t.waitFor(`parseFloat(${SEL}.style.getPropertyValue('--x')) === ${rx0}`, { label: 'move undone' });
  t.check('Undo takes the move back (one step)', true);
  // an image placed freely: the browser's own image drag must not take over
  await openMenu();
  await t.click('.editor-insert-menu [data-kind="image"]');
  await t.waitFor(`${SEL}?.matches('.image-frame, img')`, { label: 'image inserted' });
  await ed.tab('element');
  await t.eval(`document.querySelector('.editor-panel-body [data-element-field="free"]').click()`);
  await t.waitFor(`document.querySelector('.editor-stage .scene .image-frame.is-free')`, { label: 'image free' });
  const i0 = parseFloat(await xOf());
  await t.drag(await t.centre('.editor-stage .is-editor-selected'), 100 * k2, 0);
  t.check('a freely placed image drags by its body', Math.abs(parseFloat(await xOf()) - i0 - 100) <= 8, i0 + ' -> ' + await xOf());
  const fr = await t.centre('.editor-stage .is-editor-selected');
  await click(fr);
  await t.waitFor(`${SEL}?.matches('img')`, { label: 'image reached' });
  t.check('a click on the selected frame reaches the image inside', true);
  await click({ x: fr.x + 300 * k2, y: fr.y });
  await t.waitFor(`!${SEL}?.matches('img')`, { label: 'other picked' });
  t.check('a click on another element picks that one', true);
  // Shift+click on a free image adds its frame to the group
  await openMenu();
  await t.click('.editor-insert-menu [data-kind="circle"]');
  await t.waitFor(`${SEL}?.matches('.shape')`, { label: 'circle inserted' });
  // a spot of the image that nothing lies over (the new circle's toolbar may cover its middle)
  const frameImg = await t.eval(`(() => { const img = document.querySelector('.editor-stage .scene .image-frame.is-free img'); const r = img.getBoundingClientRect(); for (const [fx, fy] of [[.5, .5], [.8, .8], [.2, .8], [.8, .2], [.2, .2]]) { const x = r.x + r.width * fx, y = r.y + r.height * fy; if (document.elementFromPoint(x, y) === img) return { x, y }; } return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
  await t.clickAt(frameImg, { modifiers: 8 });
  const frameX = () => t.eval(`parseFloat(document.querySelector('.editor-stage .scene .image-frame.is-free').style.getPropertyValue('--x'))`);
  const fx0 = await frameX();
  await t.drag(await t.centre('.editor-stage .scene > .shape:last-of-type'), 80 * k2, 0);
  t.check('Shift+click on a free image puts its frame in the group (it moves along)', Math.abs((await frameX()) - fx0 - 80) <= 8, fx0 + ' -> ' + await frameX());
  await ed.pick('.editor-stage .scene > .text-box'); await ed.blur();
  await openMenu();
  t.check('a free text box selected: the menu says at the end of the slide', /end of the slide/i.test(await menuHeading()));
  await t.key('Escape', 'Escape', 27);
  await t.waitFor(`!document.querySelector('.editor-insert-menu') && document.activeElement?.dataset.action === 'insert-menu'`, { label: 'Esc closes list' });
  t.check('Esc closes the list and gives + Insert the focus back', true);
  // touch: the browser takes the gesture over (pointercancel); no drag may stay running
  const tb = await t.centre('.editor-stage .scene > .text-box');
  await ed.blur();
  const tbX = () => t.eval(`document.querySelector('.editor-stage .scene > .text-box').style.getPropertyValue('--x')`);
  const tx0 = await tbX();
  await t.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: tb.x, y: tb.y }] });
  for (let i = 1; i <= 5; i++) await t.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: tb.x + i * 20, y: tb.y }] });
  await t.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await t.waitFor(`!document.querySelector('.editor').classList.contains('is-moving')`, { label: 'not moving after touch' });
  const tx1 = await tbX();
  await t.mouse('mouseMoved', 50, 50, { button: 'none', buttons: 0 });
  await t.eval(`new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))`);
  t.check('after a touch drag nothing follows the mouse and the editor is not stuck moving', (await tbX()) === tx1 && !(await t.eval(`document.querySelector('.editor').classList.contains('is-moving')`)), tx0 + ' -> ' + tx1);

  // ================= add where you click (was test 24) =================
  await fresh();
  const emptySpot = (fromRight) => t.eval(`(() => { const s = document.querySelector('.editor-stage').getBoundingClientRect(), k = s.width / 1600, scene = document.querySelector('.editor-stage .scene');
    const ok = (x, y) => { const e = document.elementFromPoint(s.left + x * k, s.top + y * k); return e === scene || (e && e.parentElement === scene && e.classList.contains('content')); };
    if (${fromRight}) { for (let y = 820; y > 100; y -= 40) for (let x = 1500; x > 100; x -= 40) if (ok(x, y)) return { x, y, cx: s.left + x * k, cy: s.top + y * k }; }
    else { for (let y = 840; y > 100; y -= 40) for (let x = 120; x < 1000; x += 40) if (ok(x, y)) return { x, y, cx: s.left + x * k, cy: s.top + y * k }; }
    return null; })()`);
  const spot = await emptySpot(true);
  t.check('found an empty spot', !!spot, JSON.stringify(spot));
  const boxes0 = await count('.editor-stage .scene .text-box');
  const at = { x: spot.cx, y: spot.cy };
  await t.mouse('mousePressed', at.x, at.y); await t.mouse('mouseReleased', at.x, at.y, { buttons: 0 });
  await t.mouse('mousePressed', at.x, at.y, { clickCount: 2 }); await t.mouse('mouseReleased', at.x, at.y, { clickCount: 2, buttons: 0 });
  await t.waitFor(`document.querySelectorAll('.editor-stage .scene .text-box').length === ${boxes0 + 1}`, { label: 'text box by double-click' });
  t.check('double-click on an empty spot: a text box', true);
  const pos = await t.eval(`[parseFloat(${SEL}.style.getPropertyValue('--x')), parseFloat(${SEL}.style.getPropertyValue('--y'))]`);
  t.check('it starts where you clicked', Math.abs(pos[0] - spot.x) <= 2 && Math.abs(pos[1] - (spot.y - 24)) <= 2 || pos[0] === 1600 - 560, JSON.stringify([pos, spot]));
  await t.waitFor(`document.activeElement === ${SEL} && String(window.getSelection()) === ${SEL}.textContent`, { label: 'keyboard in new box' });
  t.check('it has the keyboard, its text selected', true);
  await t.type('Hello there');
  await t.waitFor(`${SEL}.textContent === 'Hello there'`);
  t.check('typing replaces the text', true);
  await ed.blur();
  await t.waitFor(`/Hello there/.test(document.querySelector('.editor-slide-list li.is-selected .scene').outerHTML)`, { label: 'saved in slide' });
  t.check('it is saved in the slide', true);
  // right-click an empty spot: Add here
  const spot2 = await emptySpot(false);
  t.check('found a second empty spot', !!spot2, JSON.stringify(spot2));
  const at2 = { x: spot2.cx, y: spot2.cy };
  const hereMenu = '.editor-menu:not([hidden])';
  await t.clickAt(at2, { button: 'right' });
  await t.waitFor(`!!document.querySelector('${hereMenu} [data-menu="here-circle"]') && !!document.querySelector('${hereMenu} [data-menu="here-textbox"]')`, { label: 'Add here menu' });
  t.check('right-click on an empty spot: Add here with text box and shapes', true);
  await t.click(`${hereMenu} [data-menu="here-circle"]`);
  await t.waitFor(`${SEL}?.matches('.shape[data-shape="circle"]')`, { label: 'circle added' });
  const circle = await t.eval(`(() => { const c = ${SEL}; return [parseFloat(c.style.getPropertyValue('--x')) + parseFloat(c.style.getPropertyValue('--w')) / 2, parseFloat(c.style.getPropertyValue('--y')) + parseFloat(c.style.getPropertyValue('--h')) / 2]; })()`);
  t.check('Circle: a circle around that spot (or kept inside the slide)', (Math.abs(circle[0] - spot2.x) <= 3 || spot2.x < 150) && (Math.abs(circle[1] - spot2.y) <= 3 || spot2.y > 760), JSON.stringify([circle, spot2]));
  await undo();
  await t.waitFor(`document.querySelectorAll('.editor-stage .scene .shape[data-shape="circle"]').length === 0`, { label: 'circle undone' });
  t.check('Undo removes it (one step)', true);
  await t.clickAt(at2, { button: 'right' });
  await t.waitFor(`!!document.querySelector('${hereMenu} [data-menu^="here-"]')`, { label: 'menu open again' });
  await t.key('Escape', 'Escape', 27);
  await t.waitFor(`!document.querySelector('${hereMenu} [data-menu^="here-"]')`, { label: 'Esc closes menu' });
  t.check('Esc closes the menu', true);
  await t.clickAt(await t.centre('.editor-stage .scene h2'), { button: 'right' });
  await t.waitFor(`!!document.querySelector('${hereMenu} [data-menu="duplicate"]')`, { label: 'normal menu' });
  t.check('right-click on an element: the normal menu', true);
  await t.key('Escape', 'Escape', 27);

  // ================= handles, resize from any side, turn, readouts, reorder and detach (was test 25) =================
  await fresh();
  const k3 = await ed.scale();
  await openMenu();
  await t.click('.editor-insert-menu [data-kind="rect"]');
  await t.waitFor(`${SEL}?.matches('.shape')`, { label: 'rect inserted' });
  t.check('a free shape shows 8 handles, the turn handle and the move grip', (await t.eval(`[...document.querySelectorAll('.editor-selection .editor-handle')].filter(h => getComputedStyle(h).display !== 'none').length`)) === 8 && await shown('.editor-selection .editor-rotate') && await shown('.editor-selection .editor-move'));
  const hw = await t.eval(`document.querySelector('.editor-selection .editor-handle').getBoundingClientRect().width`);
  t.check('handles keep their size on screen', Math.abs(hw - 13) < 1.5, String(hw));
  let x0b = await v('--x'), w0 = await v('--w');
  await t.drag(await handle('w'), -100 * k3, 0);
  let x1b = await v('--x'), w1 = await v('--w');
  t.check('left side: wider to the left, the right side stays', Math.abs((w1 - w0) - 100) <= 8 && Math.abs((x0b + w0) - (x1b + w1)) <= 1, JSON.stringify([x0b, w0, x1b, w1]));
  const y0 = await v('--y'), h0 = await v('--h');
  await t.drag(await handle('n'), 0, -80 * k3);
  t.check('top side: higher upwards, the bottom stays', Math.abs((await v('--h')) - h0 - 80) <= 8 && Math.abs((y0 + h0) - ((await v('--y')) + (await v('--h')))) <= 1, JSON.stringify([y0, h0, await v('--y'), await v('--h')]));
  x0b = await v('--x'); w0 = await v('--w');
  let readoutSeen = '';
  await t.drag(await handle('e'), 60 * k3, 0, { modifiers: 2, during: async () => { readoutSeen = await t.eval(`(() => { const r = document.querySelector('.editor-readout'); return r && !r.hidden ? r.textContent : ''; })()`); } });
  t.check('Ctrl: from the middle (both sides move)', Math.abs((await v('--w')) - w0 - 120) <= 16 && Math.abs(((await v('--x')) + (await v('--w')) / 2) - (x0b + w0 / 2)) <= 2, JSON.stringify([x0b, w0, await v('--x'), await v('--w')]));
  t.check('a readout shows width × height while resizing', /^\d+ × \d+$/.test(readoutSeen), readoutSeen);
  t.check('the readout is gone after', !(await shown('.editor-readout')));
  // turn: soft snap at 45°, Alt: exact
  const turnTo = async (degrees, modifiers = 0) => {
    const c = await t.centre('.editor-stage .is-editor-selected'), r = await t.centre('.editor-selection .editor-rotate');
    const radius = Math.hypot(r.x - c.x, r.y - c.y), a = degrees * Math.PI / 180;
    await t.mouse('mousePressed', r.x, r.y, { modifiers });
    for (let i = 1; i <= 10; i++) { const an = a * i / 10; await t.mouse('mouseMoved', c.x + radius * Math.sin(an), c.y - radius * Math.cos(an), { buttons: 1, modifiers }); }
    await t.mouse('mouseReleased', c.x + radius * Math.sin(a), c.y - radius * Math.cos(a), { buttons: 0, modifiers });
    await t.waitFor(`!document.querySelector('.editor-rotate').dataset.angle`, { label: 'turn finished' });
  };
  await turnTo(47);
  t.check('turning to 47°: it snaps to 45°', (await t.eval(`${SEL}.style.rotate`)) === '45deg', await t.eval(`${SEL}.style.rotate`));
  await undo();
  await t.waitFor(`(parseFloat(${SEL}.style.rotate) || 0) === 0`, { label: 'turn undone' });
  await turnTo(47, 1);
  t.check('with Alt: no snap (about 47°)', Math.abs((await rotation()) - 47) <= 1, await t.eval(`${SEL}.style.rotate`));
  t.check('the outline turns with it', Math.abs(parseFloat(await t.eval(`document.querySelector('.editor-selection').style.rotate`)) - (await rotation())) < 0.5);
  // a turned element: the opposite side stays where it is
  const wMid = await handle('w');
  w0 = await v('--w');
  const eh = await handle('e');
  const ang = (await rotation()) * Math.PI / 180;
  await t.drag(eh, 80 * k3 * Math.cos(ang), 80 * k3 * Math.sin(ang));
  const wMid2 = await handle('w');
  t.check('turned: the right side grows along its own direction, the left side stays', Math.abs((await v('--w')) - w0 - 80) <= 10 && Math.hypot(wMid2.x - wMid.x, wMid2.y - wMid.y) < 4, JSON.stringify([w0, await v('--w'), wMid, wMid2]));
  // keys: a run of arrows is one undo step; Alt+→ turns 15°
  await ed.blur();
  x0b = await v('--x');
  for (let i = 0; i < 3; i++) await t.key('ArrowRight', 'ArrowRight', 39);
  await t.waitFor(`parseFloat(${SEL}.style.getPropertyValue('--x')) === ${x0b + 3}`, { label: '3 arrows' });
  t.check('3 × → moves 3 px', true);
  await t.key('z', 'KeyZ', 90, 2);
  await t.waitFor(`parseFloat(${SEL}.style.getPropertyValue('--x')) === ${x0b}`, { label: 'one undo for the run' });
  t.check('one Undo takes the whole run back', true);
  const rBefore = await rotation();
  await t.key('ArrowRight', 'ArrowRight', 39, 1);
  await t.waitFor(`Math.abs((parseFloat(${SEL}.style.rotate) || 0) - ${rBefore}) > 1`, { label: 'Alt+arrow turn' });
  const rAfter = await rotation();
  t.check('Alt+→ turns 15°', Math.abs(rAfter - rBefore - 15) < 0.5 || Math.abs(rAfter - rBefore + 345) < 0.5, String(rAfter));
  // a free picture keeps its proportions at a corner
  await openMenu();
  await t.click('.editor-insert-menu [data-kind="image"]');
  await t.waitFor(`${SEL}?.matches('.image-frame, img')`, { label: 'image inserted' });
  await ed.tab('element');
  await t.eval(`document.querySelector('.editor-panel-body [data-element-field="free"]').click()`);
  await t.waitFor(`!!document.querySelector('.editor-stage .scene .image-frame.is-free')`, { label: 'image free' });
  const ratio = () => t.eval(`${SEL}.offsetWidth / ${SEL}.offsetHeight`);
  const ratio0 = await ratio();
  await t.drag(await handle('se'), -120 * k3, 10 * k3);
  const ratio1 = await ratio();
  t.check('a picture keeps its proportions at a corner', Math.abs(ratio1 - ratio0) < 0.03, ratio0 + ' -> ' + ratio1);
  await t.drag(await handle('se'), -60 * k3, 60 * k3, { modifiers: 8 });
  t.check('Shift frees them', Math.abs((await ratio()) - ratio1) > 0.05, String(await ratio()));
  // a text box: the bottom side gives it a height; Auto height takes it back
  await openMenu();
  await t.click('.editor-insert-menu [data-kind="textbox"]');
  await t.waitFor(`${SEL}?.matches('.text-box')`, { label: 'text box inserted' });
  await ed.blur();
  await t.drag(await handle('s'), 0, 120 * k3);
  t.check('the bottom side gives a text box a height of its own', (await v('--h')) > 0);
  await ed.tab('element');
  t.check('Auto height is offered', await t.eval(`!!document.querySelector('.editor-panel-body [data-action="auto-height"]')`));
  await t.click('.editor-panel-body [data-action="auto-height"]');
  await t.waitFor(`(parseFloat(${SEL}.style.getPropertyValue('--h')) || 0) === 0`, { label: 'auto height' });
  t.check('Auto height: no height of its own', true);
  // a block in the layout: move grip, reorder with a line, Esc cancels, pull out = placed freely
  await ed.goSlide('numbers');
  await ed.pick('.editor-stage .scene .content > h2'); await ed.blur();
  t.check('a block in the layout: only the move grip', await shown('.editor-selection .editor-move') && !(await shown('.editor-selection .editor-handle[data-dir="e"]')));
  const order = () => t.eval(`[...document.querySelector('.editor-stage .scene .content').children].map(n => n.tagName + '.' + (n.className || '').split(' ')[0]).join(' ')`);
  const order0 = await order();
  const stats = await t.eval(`(() => { const r = document.querySelector('.editor-stage .scene .content > .stats').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.bottom - 5 }; })()`);
  const grip = await t.centre('.editor-selection .editor-move');
  let lineSeen = false;
  await t.drag(grip, stats.x - grip.x, stats.y - grip.y, { during: async () => { lineSeen = await shown('.editor-insert-line'); } });
  t.check('a line shows where it goes', lineSeen);
  const order1 = await order();
  t.check('dropped after the numbers: the heading moved there', order1 !== order0 && order1.indexOf('H2') > order1.indexOf('DIV.stats'), order0 + ' -> ' + order1);
  // v197: Slide › Reset the layout puts the order back too
  await t.eval(`(() => { document.querySelector('.editor-menubar [data-menu-id="slide"]').click(); document.querySelector('.editor-menubar-menu [data-command="reset-layout"]').click(); return true; })()`);
  await t.waitFor(`[...document.querySelector('.editor-stage .scene .content').children].map(n => n.tagName + '.' + (n.className || '').split(' ')[0]).join(' ') === ${q(order0)}`, { label: 'order reset' }).catch(() => {});
  t.check('Slide › Reset the layout puts a dragged order back (and leaves no marks in the file)', (await order()) === order0 && await t.eval(`!document.querySelector('.editor-stage .scene [data-editor-home]')`), await order());
  await undo();
  await undo();
  await t.waitFor(`[...document.querySelector('.editor-stage .scene .content').children].map(n => n.tagName + '.' + (n.className || '').split(' ')[0]).join(' ') === ${q(order0)}`, { label: 'order undone' });
  t.check('Undo puts it back', true);
  await ed.pick('.editor-stage .scene .content > h2'); await ed.blur();
  const grip2 = await t.centre('.editor-selection .editor-move');
  await t.mouse('mousePressed', grip2.x, grip2.y);
  for (let i = 1; i <= 6; i++) await t.mouse('mouseMoved', grip2.x, grip2.y + i * 30, { buttons: 1 });
  await t.key('Escape', 'Escape', 27);
  await t.mouse('mouseReleased', grip2.x, grip2.y + 180, { buttons: 0 });
  await t.eval(`new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))`);
  t.check('Esc cancels the drag', (await order()) === order0 && await t.eval(`!!document.querySelector('.editor-stage .is-editor-selected')`));
  await ed.pick('.editor-stage .scene .content > .eyebrow'); await ed.blur();
  const grip3 = await t.centre('.editor-selection .editor-move');
  const content = await t.eval(`document.querySelector('.editor-stage .scene .content').getBoundingClientRect().left`);
  let boxSeen = false;
  const toX = Math.max(content - 60, 5);
  await t.drag(grip3, toX - grip3.x, 40, { during: async () => { boxSeen = await shown('.editor-drop-box'); } });
  t.check('pulled out of its column: a dashed box shows where it lands', boxSeen);
  t.check('it is placed freely there, with a message', await t.eval(`!!document.querySelector('.editor-stage .scene .eyebrow.is-free')`) && /Placed freely/.test(await ed.toast()), await ed.toast());
  await undo();
  await t.waitFor(`!document.querySelector('.editor-stage .scene .eyebrow.is-free')`, { label: 'back in layout' });
  t.check('Ctrl+Z puts it back in the layout', true);
  // Alt over another element: distances
  await ed.pick('.editor-stage .scene .content > h2'); await ed.blur();
  const statBox = await t.centre('.editor-stage .scene .content > .stats .stat');
  await t.mouse('mouseMoved', statBox.x, statBox.y, { button: 'none', buttons: 0, modifiers: 1 });
  await t.waitFor(`document.querySelectorAll('.editor-distance').length >= 1`, { label: 'distances shown' });
  const marks = await t.eval(`[...document.querySelectorAll('.editor-distance')].map(m => m.className + ':' + m.dataset.label)`);
  t.check('Alt over another element: the distance to it, in slide pixels', marks.length >= 1 && marks.every(m => /\d+$/.test(m)), JSON.stringify(marks));
  await t.key('Alt', 'AltLeft', 18, 0);
  await t.mouse('mouseMoved', statBox.x + 2, statBox.y, { button: 'none', buttons: 0, modifiers: 0 });
  await t.waitFor(`document.querySelectorAll('.editor-distance').length === 0`, { label: 'distances gone' });
  t.check('without Alt they are gone', true);
  // review fixes (v48): a 1 px jitter on the bottom handle gives no height; arrow runs on two elements are two undo steps;
  // a drag on a slide with its own script leaves nothing behind
  {
    await t.editor.open('numbers');
    await t.editor.insert('textbox');
    await t.editor.blur();
    const s = await t.centre('.editor-selection .editor-handle[data-dir="s"]');
    await t.mouse('mousePressed', s.x, s.y, { buttons: 1 });
    await t.mouse('mouseMoved', s.x, s.y + 1, { buttons: 1 });
    await t.mouse('mouseReleased', s.x, s.y + 1);
    t.check('a 1 px jitter on the bottom handle gives a text no height of its own', (await t.editor.value('--h')) === 0);
    const firstX = await t.editor.value('--x');
    const boxIndex = await t.eval(`[...document.querySelector('.editor-stage .scene').children].indexOf(document.querySelector('.editor-stage .is-editor-selected')) + 1`);   // this text box (an earlier draft may hold others)
    await t.key('ArrowRight', 'ArrowRight', 39);
    await t.waitFor(`parseFloat(document.querySelector('.editor-stage .is-editor-selected').style.getPropertyValue('--x')) === ${firstX + 1}`, { label: 'the first nudge' });
    await t.editor.insert('rect');
    await t.editor.blur();
    const rectX = await t.editor.value('--x');
    await t.key('ArrowRight', 'ArrowRight', 39);
    await t.waitFor(`parseFloat(document.querySelector('.editor-stage .is-editor-selected').style.getPropertyValue('--x')) === ${rectX + 1}`);
    await t.editor.undo();
    await t.waitFor(`parseFloat(document.querySelector('.editor-stage .is-editor-selected')?.style.getPropertyValue('--x')) === ${rectX}`, { label: 'undo the second nudge only' });
    t.check('arrow presses on two elements are two undo steps', (await t.eval(`parseFloat(document.querySelector('.editor-stage .scene > :nth-child(${boxIndex})').style.getPropertyValue('--x'))`)) === firstX + 1);
    await t.editor.goSlide('timeline');
    const car = await t.centre('.editor-stage .scene .road-car');
    await t.drag(car, 60, 0);
    t.check('a drag on a slide with its own script leaves the editor normal', !(await t.eval(`document.querySelector('.editor').classList.contains('is-moving')`)));
  }
}
