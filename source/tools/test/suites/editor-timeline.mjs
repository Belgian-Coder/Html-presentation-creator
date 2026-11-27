// The animation panel along the bottom (v57): rows per element, dragging bars and their ends, keyframes, the ruler,
// zoom, the height, showing and hiding; with the side panels pinned and hidden (their default).
import { sleep } from '../harness.mjs';

export const covers = ['js/17-', 'js/18-', 'js/19-', 'js/20-', 'css/13-', 'interface-texts.json'];

export default async function (t) {
  const e = t.editor;
  const SEL = e.selected;
  const row = text => `[...document.querySelectorAll('.tl-row:not(.tl-lane)')].find(r => r.querySelector('.tl-name')?.textContent.includes(${JSON.stringify(text)}))`;
  const rect = (expr, part = '.tl-bar') => t.eval(`(() => { const r = ${expr}; if (!r) return null; r.scrollIntoView({ block: 'nearest' }); const b = r.querySelector('${part}').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2, left: b.left, right: b.right, width: b.width }; })()`);
  const px = () => t.eval(`parseFloat(document.querySelector('.tl-grid').style.width) / 1`);

  for (const pinned of [true, false]) {
    await t.open('numbers');
    await t.eval(`localStorage.setItem('presentation-editor.layout', '${pinned ? '{"left":true,"right":true}' : '{}'}'); localStorage.setItem('presentation-editor.timeline', '{"open":true}'); true`);
    await e.open('numbers');
    const docks = pinned ? 'docks pinned' : 'docks hidden';
    await t.waitFor(`!!document.querySelector('.editor-timeline .tl-row')`, { label: 'timeline rows' });
    t.check(`[${docks}] the timeline shows along the bottom, under the slide, one row per element that appears`, await t.eval(`(() => { const tl = document.querySelector('.editor-timeline').getBoundingClientRect(), canvas = document.querySelector('.editor-canvas').getBoundingClientRect(), status = document.querySelector('.editor-statusbar').getBoundingClientRect(); return tl.height > 150 && tl.top >= canvas.bottom - 1 && tl.bottom <= status.top + 1 && document.querySelectorAll('.tl-row:not(.tl-lane)').length >= 8; })()`));

    // drag a bar that rises in with the slide two steps later: its order goes up by 2
    const stats = `[...document.querySelectorAll('.editor-stage .scene .stat')]`;
    const before = await t.eval(`parseFloat(${stats}[1].style.getPropertyValue('--order'))`);
    const target = row('128');
    const bar = await rect(target);
    const stagger = await t.eval(`(() => { const v = getComputedStyle(document.querySelector('.editor-stage .scene')).getPropertyValue('--reveal-stagger').trim(); return parseFloat(v) || 130; })()`);
    const gridPx = await t.eval(`(() => { const r = ${target}; const b = r.querySelector('.tl-bar'); return parseFloat(b.style.width) / ((r.querySelector('.tl-track').title.match(/moves for (\\d+)/) || [0, 800])[1] || 800); })()`);
    await t.drag({ x: bar.x, y: bar.y }, 2 * stagger * gridPx + 2, 0, { steps: 6 });
    await t.waitFor(`parseFloat(${stats}[1].style.getPropertyValue('--order')) === ${before + 2}`, { label: 'order +2' }).catch(() => {});
    t.check(`[${docks}] dragging a bar two steps right: its order goes up by 2`, (await t.eval(`parseFloat(${stats}[1].style.getPropertyValue('--order'))`)) === before + 2, JSON.stringify([before, await t.eval(`${stats}[1].style.getPropertyValue('--order')`), stagger, gridPx]));
    await e.undo();
    await t.waitFor(`parseFloat(${stats}[1].style.getPropertyValue('--order')) === ${before}`).catch(() => {});
    t.check(`[${docks}] one undo step`, (await t.eval(`parseFloat(${stats}[1].style.getPropertyValue('--order'))`)) === before);
    if (!pinned) {   // the hidden docks stay closed: the timeline is not in a dock
      t.check('[docks hidden] the right dock stayed closed while dragging on the timeline', !(await t.eval(`document.querySelector('.editor-dock[data-dock="right"]').classList.contains('is-open')`)));
      continue;
    }

    // the right end: how long it takes (its Speed)
    const bar2 = await rect(row('128'));
    await t.drag({ x: bar2.right - 2, y: bar2.y }, bar2.width * .5, 0, { steps: 6 });
    await t.waitFor(`/^\\d+ms$/.test(${stats}[1].style.getPropertyValue('animation-duration').trim())`, { label: 'three-points' }).catch(() => {});
    t.check('the right end of a bar: how long it takes (written as its speed)', /^\d+ms$/.test(await t.eval(`${stats}[1].style.getPropertyValue('animation-duration').trim()`)), await t.eval(`${stats}[1].getAttribute('style')`));
    await e.undo();

    // an element with an animation of its own: bar = delay, left end = start (end stays), right end = duration
    await e.insert('rect');
    await e.tab('element');
    await t.eval(`(() => { const f = document.querySelector('.editor-panel-body [data-element-field="animation"]'); f.value = 'preset:bounce-in'; f.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
    await t.waitFor(`!!${SEL}?.getAttribute('data-animation') && !!document.querySelector('.editor-panel-body [data-anim-field="delay"]')`, { label: 'own animation' });
    const field = name => t.eval(`Number(document.querySelector('.editor-panel-body [data-anim-field="${name}"]').value)`);
    const d0 = await field('delay'), l0 = await field('duration');
    const own = row('Shape');
    const keyFree = await t.eval(`(() => { const r = ${own}; r.scrollIntoView({ block: 'nearest' }); const b = r.querySelector('.tl-bar').getBoundingClientRect(); for (let x = b.left + 10; x < b.right - 10; x += 2) { const at = document.elementFromPoint(x, b.top + 3); if (at && at.matches('.tl-bar')) return { x, y: b.top + 3 }; } return { x: b.left + 12, y: b.top + 3 }; })()`);
    const ppm = await t.eval(`(() => { const b = ${own}.querySelector('.tl-bar'); return parseFloat(b.style.width) / ${l0}; })()`);
    await t.drag(keyFree, 300 * ppm, 0, { steps: 6, modifiers: 1 });   // Alt: no pull
    await t.waitFor(`Number(document.querySelector('.editor-panel-body [data-anim-field="delay"]')?.value) !== ${d0}`).catch(() => {});
    const d1 = await field('delay');
    t.check('its own animation: dragging the bar 300 ms later changes the delay by 300', Math.abs(d1 - d0 - 300) <= 5, JSON.stringify([d0, d1]));
    let r3 = await rect(own);
    await t.drag({ x: r3.right - 2, y: r3.y }, 200 * ppm, 0, { steps: 6, modifiers: 1 });
    await t.waitFor(`Number(document.querySelector('.editor-panel-body [data-anim-field="duration"]')?.value) !== ${l0}`).catch(() => {});
    t.check('the right end: its duration (+200 ms)', Math.abs((await field('duration')) - l0 - 200) <= 5, await field('duration'));
    const l1 = await field('duration');
    r3 = await rect(own);
    await t.drag({ x: r3.left + 2, y: r3.y }, 100 * ppm, 0, { steps: 6, modifiers: 1 });
    await t.waitFor(`Number(document.querySelector('.editor-panel-body [data-anim-field="delay"]')?.value) !== ${d1}`).catch(() => {});
    t.check('the left end: the start moves, the end stays', Math.abs((await field('delay')) - d1 - 100) <= 5 && Math.abs((await field('delay')) + (await field('duration')) - d1 - l1) <= 5, JSON.stringify([await field('delay'), await field('duration')]));

    // keyframes: drag the second ◆; select it and Delete removes it; the line between two ◆ opens the easing window
    const keys = () => t.eval(`[...document.querySelectorAll('.editor-keyframe-table tbody tr')].map(r => Number(r.querySelector('[data-key="at"]').value))`);
    const k0 = await keys();
    const key1 = await t.eval(`(() => { ${own}.scrollIntoView({ block: 'nearest' }); const k = ${own}.querySelector('.tl-key[data-index="1"]').getBoundingClientRect(); return { x: k.left + k.width / 2, y: k.top + k.height / 2 }; })()`);
    await t.drag(key1, 40, 0, { steps: 5, modifiers: 1 });
    await t.waitFor(`Number(document.querySelector('.editor-keyframe-table tbody tr:nth-child(2) [data-key="at"]')?.value) !== ${k0[1]}`).catch(() => {});
    const k1 = await keys();
    t.check('dragging a ◆ moves that keyframe later', k1[1] > k0[1] && k1.length === k0.length, JSON.stringify([k0, k1]));
    const key1b = await t.eval(`(() => { ${own}.scrollIntoView({ block: 'nearest' }); const k = ${own}.querySelector('.tl-key[data-index="1"]').getBoundingClientRect(); return { x: k.left + k.width / 2, y: k.top + k.height / 2 }; })()`);
    await t.clickAt(key1b);
    await t.key('Delete', 'Delete', 46);
    await t.waitFor(`document.querySelectorAll('.editor-keyframe-table tbody tr').length === ${k1.length - 1}`, { label: 'key deleted' }).catch(() => {});
    t.check('a selected ◆ and Delete: the keyframe is gone (the element stays)', (await t.eval(`document.querySelectorAll('.editor-keyframe-table tbody tr').length`)) === k1.length - 1 && (await t.eval(`!!${SEL}`)));
    const seg = await t.eval(`(() => { ${own}.scrollIntoView({ block: 'nearest' }); const s = ${own}.querySelector('.tl-seg').getBoundingClientRect(); return { x: s.left + s.width / 2, y: s.top + s.height / 2 }; })()`);
    await t.clickAt(seg);
    await t.waitFor(`!!document.querySelector('.editor-ease')`, { label: 'easing window' }).catch(() => {});
    t.check('a click on the line between two ◆ opens the easing window', await t.eval(`!!document.querySelector('.editor-ease')`));
    await t.key('Escape', 'Escape', 27);

    // ▸ shows a line per property
    await t.eval(`${own}.querySelector('[data-tl="expand"]').click(); true`);
    await t.waitFor(`document.querySelectorAll('.tl-lane').length >= 2`).catch(() => {});
    t.check('▸ shows one line per property with its keyframes', await t.eval(`document.querySelectorAll('.tl-lane').length >= 2 && [...document.querySelectorAll('.tl-lane .tl-lane-name')].some(n => /Opacity|Scale/.test(n.textContent))`));

    // the ruler: the playhead; double-click on the track: a keyframe there
    const ruler = await t.eval(`(() => { const r = document.querySelector('.tl-ruler').getBoundingClientRect(); return { x: r.left + 200, y: r.top + r.height / 2 }; })()`);
    await t.clickAt(ruler);
    await t.waitFor(`!!document.querySelector('.tl-playhead')`, { label: 'playhead' }).catch(() => {});
    t.check('a click on the ruler puts the red line there, at the time under the pointer (the slide at that moment)', await t.eval(`(() => { const head = document.querySelector('.tl-playhead'); return !!head && Math.abs(head.getBoundingClientRect().left - ${ruler.x}) <= 6; })()`));
    const anyKey = await t.eval(`(() => { ${own}.scrollIntoView({ block: 'nearest' }); const k = ${own}.querySelector('.tl-key').getBoundingClientRect(); return { x: k.left + k.width / 2, y: k.top + k.height / 2 }; })()`);
    await t.clickAt(anyKey);   // a ◆ selected: the panel has the keyboard
    await t.key('Escape', 'Escape', 27);   // no ◆ selected any more
    await t.key('Delete', 'Delete', 46);
    t.check('Delete in the timeline without a selected ◆ never deletes the element', await t.eval(`!!${SEL}`));
    const rows0 = await t.eval(`document.querySelectorAll('.editor-keyframe-table tbody tr').length`);
    const track = await t.eval(`(() => { const r = ${own}; r.scrollIntoView({ block: 'nearest' }); const b = r.querySelector('.tl-bar').getBoundingClientRect(); return { x: b.left + b.width * .7, y: b.top + 3 }; })()`);
    await t.mouse('mouseMoved', track.x, track.y);
    await t.mouse('mousePressed', track.x, track.y, { buttons: 1, clickCount: 1 }); await t.mouse('mouseReleased', track.x, track.y, { buttons: 0, clickCount: 1 });
    await t.mouse('mousePressed', track.x, track.y, { buttons: 1, clickCount: 2 }); await t.mouse('mouseReleased', track.x, track.y, { buttons: 0, clickCount: 2 });
    await t.waitFor(`document.querySelectorAll('.editor-keyframe-table tbody tr').length === ${rows0 + 1}`, { label: 'key added' }).catch(() => {});
    t.check('double-click on a bar: a keyframe at that moment', (await t.eval(`document.querySelectorAll('.editor-keyframe-table tbody tr').length`)) === rows0 + 1);

    // several ◆: Shift+click two, drag one: both move by the same time; a box selects; Delete removes all selected
    const keyAt = index => t.eval(`(() => { ${own}.scrollIntoView({ block: 'nearest' }); const k = ${own}.querySelector('.tl-key[data-index="${index}"]').getBoundingClientRect(); return { x: k.left + k.width / 2, y: k.top + k.height / 2 }; })()`);
    const times = () => t.eval(`[...${own}.querySelectorAll('.tl-key')].map(k => Number((k.title.match(/at (\\d+) ms/) || [])[1]))`);
    const before2 = await times();
    if (before2.length >= 4) {
      await t.clickAt(await keyAt(1));
      await t.clickAt(await keyAt(2), { modifiers: 8 });
      t.check('Shift+click selects a second ◆', (await t.eval(`${own}.querySelectorAll('.tl-key.is-selected').length`)) === 2);
      await t.drag(await keyAt(1), -20, 0, { steps: 5, modifiers: 1 });
      await t.waitFor(`(() => { const k = [...${own}.querySelectorAll('.tl-key')].map(k => Number((k.title.match(/at (\\d+) ms/) || [])[1])); return k[1] !== ${before2[1]}; })()`).catch(() => {});
      const after2 = await times();
      t.check('dragging one of two selected ◆ moves both by the same time (one undo step)', after2[1] < before2[1] && Math.abs((before2[1] - after2[1]) - (before2[2] - after2[2])) <= 2, JSON.stringify([before2, after2]));
      const rowBox = await t.eval(`(() => { const r = ${own}.querySelector('.tl-track').getBoundingClientRect(); const k1 = ${own}.querySelector('.tl-key[data-index="1"]').getBoundingClientRect(), k2 = ${own}.querySelector('.tl-key[data-index="2"]').getBoundingClientRect(); return { x1: k1.left - 6, x2: k2.right + 6, y: r.top + 1, h: r.height }; })()`);
      await t.clickAt({ x: rowBox.x2 + 200, y: rowBox.y + 1 });   // an empty spot: none selected
      t.check('a click on an empty part of the track: no ◆ selected', (await t.eval(`document.querySelectorAll('.tl-key.is-selected').length`)) === 0);
      await t.drag({ x: rowBox.x1, y: rowBox.y }, rowBox.x2 - rowBox.x1, rowBox.h - 2, { steps: 5 });
      t.check('a box drawn over two ◆ selects both', (await t.eval(`${own}.querySelectorAll('.tl-key.is-selected').length`)) === 2);
      const beforeNudge = await times();
      await t.key('ArrowLeft', 'ArrowLeft', 37);
      await t.waitFor(`(() => { const k = [...${own}.querySelectorAll('.tl-key')].map(k => Number((k.title.match(/at (\\d+) ms/) || [])[1])); return k[1] !== ${beforeNudge[1]}; })()`, { label: 'nudged' }).catch(() => {});
      const afterNudge = await times();
      t.check('← moves the selected ◆ 10 ms earlier, still selected', Math.abs(beforeNudge[1] - afterNudge[1] - 10) <= 2 && Math.abs(beforeNudge[2] - afterNudge[2] - 10) <= 2 && (await t.eval(`${own}.querySelectorAll('.tl-key.is-selected').length`)) === 2, JSON.stringify([beforeNudge, afterNudge]));
      await t.key('Delete', 'Delete', 46);
      await t.waitFor(`${own}.querySelectorAll('.tl-key').length === ${before2.length - 2}`, { label: 'two deleted' }).catch(() => {});
      t.check('Delete removes all selected ◆', (await t.eval(`${own}.querySelectorAll('.tl-key').length`)) === before2.length - 2 && (await t.eval(`!!${SEL}`)));
      await e.undo();
      await t.waitFor(`${own}.querySelectorAll('.tl-key').length === ${before2.length}`).catch(() => {});
      await e.undo();   // (the nudge)
      await t.clickAt({ x: rowBox.x2 + 200, y: rowBox.y + 1 });
      await t.key('a', 'KeyA', 65, 2);
      t.check('Ctrl+A in the timeline selects every ◆ of the element', (await t.eval(`${own}.querySelectorAll('.tl-key.is-selected').length`)) === before2.length);
      await t.key('Escape', 'Escape', 27);
    }
    // the graph: a property as its curve; drag a dot up: its value goes up
    await t.eval(`document.querySelector('[data-tl="graph"]').click(); true`);
    await t.waitFor(`!!document.querySelector('.tl-lane.is-graph .tl-curve polyline') && !!document.querySelector('.tl-dot[data-lane="scale"], .tl-dot[data-lane="y"]')`, { label: 'graph' }).catch(() => {});
    t.check('Graph shows the property lines as curves with a dot per keyframe', await t.eval(`document.querySelectorAll('.tl-lane.is-graph .tl-curve polyline').length >= 1 && document.querySelectorAll('.tl-dot').length >= 3`));
    const dotLane = await t.eval(`document.querySelector('.tl-dot[data-lane="y"]') ? 'y' : 'scale'`);
    const dot = await t.eval(`(() => { const d = document.querySelector('.tl-dot[data-lane="${dotLane}"][data-index="1"]'); d.scrollIntoView({ block: 'nearest' }); const b = d.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; })()`);
    const v0 = await t.eval(`Number(document.querySelector('.editor-keyframe-table tbody tr:nth-child(2) [data-key="${dotLane}"]').value)`);
    await t.drag(dot, 0, -15, { steps: 5, modifiers: 8 });
    await t.waitFor(`Number(document.querySelector('.editor-keyframe-table tbody tr:nth-child(2) [data-key="${dotLane}"]').value) !== ${v0}`).catch(() => {});
    const v1 = await t.eval(`Number(document.querySelector('.editor-keyframe-table tbody tr:nth-child(2) [data-key="${dotLane}"]').value)`);
    t.check('dragging a dot up raises that keyframe’s value (Shift: its moment stays)', v1 > v0, JSON.stringify([dotLane, v0, v1]));
    await t.eval(`document.querySelector('[data-tl="graph"]').click(); true`);

    // easing presets: right-click a line between two ◆; right-click the bar: all its segments
    const segAt = await t.eval(`(() => { ${own}.scrollIntoView({ block: 'nearest' }); const s = ${own}.querySelector('.tl-seg').getBoundingClientRect(); return { x: s.left + s.width / 2, y: s.top + s.height / 2 }; })()`);
    await t.clickAt(segAt, { button: 'right' });
    await t.waitFor(`!!document.querySelector('.tl-ease-menu [data-tl-ease="back-out"]')`, { label: 'ease menu' }).catch(() => {});
    t.check('right-click a line between two ◆: easings with their curves', await t.eval(`document.querySelectorAll('.tl-ease-menu [data-tl-ease] svg').length >= 10`));
    await t.click('.tl-ease-menu [data-tl-ease="back-out"]');
    await e.tab('element');
    await t.waitFor(`document.querySelector('.editor-panel-body .keyframe-ease[data-index="0"]')?.textContent !== ''`).catch(() => {});
    const eases = () => t.eval(`[...document.querySelectorAll('.editor-panel-body .keyframe-ease')].map(b => b.textContent)`);
    const e1 = await eases();
    t.check('…a click gives that segment the easing (one undo step)', /pull|over/i.test(e1[0] || '') && (e1[1] || '') !== e1[0], JSON.stringify(e1));
    const barAt = await t.eval(`(() => { ${own}.scrollIntoView({ block: 'nearest' }); const b = ${own}.querySelector('.tl-bar').getBoundingClientRect(); for (let x = b.left + 6; x < b.right - 6; x += 2) { const at = document.elementFromPoint(x, b.top + 3); if (at && at.matches('.tl-bar')) return { x, y: b.top + 3 }; } return { x: b.left + 8, y: b.top + 3 }; })()`);
    await t.clickAt(barAt, { button: 'right' });
    await t.waitFor(`!!document.querySelector('.tl-ease-menu [data-tl-ease="hold"]')`).catch(() => {});
    await t.click('.tl-ease-menu [data-tl-ease="hold"]');
    await t.waitFor(`[...document.querySelectorAll('.editor-panel-body .keyframe-ease')].every(b => b.textContent === ${JSON.stringify('')} || /hold|jump/i.test(b.textContent))`).catch(() => {});
    t.check('right-click the bar: every segment gets it', (await eases()).every(label => /hold|jump/i.test(label)), JSON.stringify(await eases()));
    await e.undo(); await e.undo();

    // property lines: + property adds one (at its normal value), × takes it out; Ctrl+C / Ctrl+V copy keyframes to the red line
    if (!(await t.eval(`${own}.querySelector('[data-tl="expand"]')?.getAttribute('aria-expanded') === 'true'`))) await t.eval(`${own}.querySelector('[data-tl="expand"]').click(); true`);
    await t.waitFor(`!!document.querySelector('.tl-add-lane select[data-tl-add-lane]')`, { label: '+ property' }).catch(() => {});
    await t.eval(`(() => { const s = document.querySelector('.tl-add-lane select[data-tl-add-lane]'); s.value = 'rotate'; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
    await t.waitFor(`[...document.querySelectorAll('.tl-lane .tl-lane-name')].some(n => /Turn|Rot/.test(n.textContent))`, { label: 'rotation line' }).catch(() => {});
    t.check('+ property adds a line (rotation) to the animation', await t.eval(`[...document.querySelectorAll('.tl-lane .tl-lane-name')].some(n => /Turn|Rot/.test(n.textContent))`) && (await t.eval(`[...document.querySelectorAll('.editor-keyframe-table tbody tr')].every(r => r.querySelector('[data-key="rotate"]').value === '0')`)));
    await t.eval(`[...document.querySelectorAll('.tl-lane')].find(l => /Turn|Rot/.test(l.textContent)).querySelector('[data-tl="lane-remove"]').click(); true`);
    await t.waitFor(`![...document.querySelectorAll('.tl-lane .tl-lane-name')].some(n => /Turn|Rot/.test(n.textContent))`).catch(() => {});
    t.check('× takes it out again', !(await t.eval(`[...document.querySelectorAll('.tl-lane .tl-lane-name')].some(n => /Turn|Rot/.test(n.textContent))`)) && (await t.eval(`[...document.querySelectorAll('.editor-keyframe-table tbody tr')].every(r => r.querySelector('[data-key="rotate"]').value === '')`)));
    const keysBefore = await t.eval(`${own}.querySelectorAll('.tl-key').length`);
    await t.clickAt(await keyAt(1));
    await t.key('c', 'KeyC', 67, 2);
    t.check('Ctrl+C in the timeline copies the selected ◆ (not the element)', /copied/i.test(await t.eval(`document.querySelector('.toast')?.textContent || ''`)));
    const rulerEnd = await t.eval(`(() => { const r = document.querySelector('.tl-ruler').getBoundingClientRect(); return { x: r.left + Math.min(r.width - 10, 420), y: r.top + r.height / 2 }; })()`);
    await t.clickAt(rulerEnd);
    await t.eval(`document.querySelector('.editor-timeline').focus(); true`);
    await t.key('v', 'KeyV', 86, 2);
    await t.waitFor(`${own}?.querySelectorAll('.tl-key').length === ${keysBefore + 1}`, { label: 'pasted' }).catch(() => {});
    t.check('Ctrl+V puts it into the animation at the red line (one more keyframe; nothing pasted on the slide)', (await t.eval(`${own}?.querySelectorAll('.tl-key').length`)) === keysBefore + 1 && (await t.eval(`document.querySelectorAll('.editor-stage .scene .shape').length`)) === 1);
    await e.undo();

    // zoom, height, hide and show
    const w0 = await px();
    await t.eval(`document.querySelector('[data-tl="zoom-in"]').click(); true`);
    t.check('+ zooms in (the timeline gets wider)', (await px()) > w0 * 1.3);
    await t.eval(`document.querySelector('[data-tl="zoom-fit"]').click(); true`);
    const h0 = await t.eval(`document.querySelector('.editor-timeline').getBoundingClientRect().height`);
    const edge = await t.eval(`(() => { const r = document.querySelector('.timeline-resize').getBoundingClientRect(); return { x: r.left + 300, y: r.top + r.height / 2 }; })()`);
    await t.drag(edge, 0, -60, { steps: 4 });
    t.check('dragging the top edge makes it higher (remembered)', (await t.eval(`document.querySelector('.editor-timeline').getBoundingClientRect().height`)) > h0 + 40 && /"height":/.test(await t.eval(`localStorage.getItem('presentation-editor.timeline')`)));
    await e.blur();
    await t.key('t', 'KeyT', 84);
    t.check('T hides it (the slide gets the room)', await t.eval(`getComputedStyle(document.querySelector('.editor-timeline')).display === 'none'`));
    await t.key('t', 'KeyT', 84);
    t.check('T shows it again', await t.eval(`getComputedStyle(document.querySelector('.editor-timeline')).display !== 'none'`));
  }
  await sleep(0);
}
