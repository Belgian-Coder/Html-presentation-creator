// The editor as a desktop program: the menu bar (mouse and keys), the docks that hide to an edge tab, the status bar,
// the bar next to the selection, desktop keys (F5, Ctrl+M, Ctrl+Shift+D) and "export without the editor".
import { writeFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PAGE, sleep } from '../harness.mjs';

export const timeoutMs = 300000;   // (38 slides: more to load and walk through)
export const covers = ['js/03-', 'js/17-', 'js/18-', 'js/20-', 'css/08-', 'css/13-', 'deck.html', 'interface-texts.json'];

export default async function (t) {
  const e = t.editor;
  const menuOpen = id => `!!document.querySelector('.editor-menubar-menu') && document.querySelector('.editor-menubar [data-menu-id="${id}"]').getAttribute('aria-expanded') === 'true'`;
  await e.open('numbers');

  // ---- menu bar with the mouse
  await t.click('.editor-menubar [data-menu-id="file"]');
  await t.waitFor(menuOpen('file'), { label: 'File opens' });
  t.check('File has Save (with its key) and Export without editor', await t.eval(`(() => { const m = document.querySelector('.editor-menubar-menu'); return m.querySelector('[data-command="save"] kbd')?.textContent === 'Ctrl+S' && !!m.querySelector('[data-command="export-clean"]'); })()`));
  const edit = await t.centre('.editor-menubar [data-menu-id="edit"]');
  await t.mouse('mouseMoved', edit.x, edit.y);
  await t.waitFor(menuOpen('edit'), { label: 'the pointer on Edit opens Edit' });
  t.check('with a menu open, the pointer on the next opens that one (one at a time)', await t.eval(`document.querySelectorAll('.editor-menubar-menu').length === 1 && !!document.querySelector('.editor-menubar-menu [data-command="undo"]')`));
  await t.click('.editor-menubar [data-menu-id="edit"]');
  await t.waitFor(`!document.querySelector('.editor-menubar-menu')`, { label: 'a second click closes it' });
  t.check('a second click on the open menu closes it', true);
  await t.click('.editor-menubar [data-menu-id="file"]');
  await t.waitFor(menuOpen('file'));
  await t.key('Escape', 'Escape', 27);
  await t.waitFor(`!document.querySelector('.editor-menubar-menu')`, { label: 'Esc closes a menu opened with the mouse' }).catch(() => {});
  await t.key('Escape', 'Escape', 27);
  t.check('Esc closes a menu opened with the mouse; the next Esc leaves the editor open', await t.eval(`!document.querySelector('.editor-menubar-menu') && !document.querySelector('.editor').hidden`));
  // a switch shows ✓ and flips
  const grid = await t.eval(`!!document.querySelector('.editor-stage.show-grid, .editor .show-grid, [data-grid="on"]')`);
  await t.click('.editor-menubar [data-menu-id="view"]');
  await t.waitFor(menuOpen('view'));
  const gridBefore = await t.eval(`document.querySelector('.editor-menubar-menu [data-command="grid"]').getAttribute('aria-checked')`);
  await t.click('.editor-menubar-menu [data-command="grid"]');
  await t.waitFor(`!document.querySelector('.editor-menubar-menu')`);
  await t.click('.editor-menubar [data-menu-id="view"]');
  await t.waitFor(menuOpen('view'));
  t.check('View › Grid is a switch with a ✓ that flips', (await t.eval(`document.querySelector('.editor-menubar-menu [data-command="grid"]').getAttribute('aria-checked')`)) === String(gridBefore !== 'true'), JSON.stringify([grid, gridBefore]));
  await t.click('.editor-menubar-menu [data-command="grid"]');   // back
  await t.waitFor(`!document.querySelector('.editor-menubar-menu')`);
  // greyed with its reason when it needs a selection
  t.check('(nothing selected yet)', !(await t.eval(`!!document.querySelector('.editor-stage .is-editor-selected')`)));
  await t.click('.editor-menubar [data-menu-id="arrange"]');
  await t.waitFor(menuOpen('arrange'));
  t.check('a menu is as wide as its rows (no key cut off)', await t.eval(`(() => { const menu = document.querySelector('.editor-menubar-menu'), right = menu.getBoundingClientRect().right; return [...menu.querySelectorAll('kbd')].every(k => k.getBoundingClientRect().right <= right && k.scrollWidth <= k.clientWidth + 1); })()`));
  t.check('without a selection, Arrange › Bring to front is greyed with the reason', await t.eval(`(() => { const item = document.querySelector('.editor-menubar-menu [data-command="to-front"]'); return item.getAttribute('aria-disabled') === 'true' && !!item.title; })()`));
  await t.click('.editor-menubar [data-menu-id="arrange"]');
  await t.waitFor(`!document.querySelector('.editor-menubar-menu')`);

  // ---- menu bar with the keys
  await e.blur();
  await t.key('F10', 'F10', 121);
  await t.waitFor(`document.activeElement?.dataset.menuId === 'file'`, { label: 'F10 puts the keyboard on File' });
  t.check('F10 puts the keyboard on the menu bar', true);
  await t.key('ArrowRight', 'ArrowRight', 39);
  await t.key('ArrowDown', 'ArrowDown', 40);
  await t.waitFor(`${menuOpen('edit')} && document.activeElement?.matches('.editor-menubar-menu [data-command]')`, { label: '→ ↓ opens Edit with its first item' });
  const firstItem = await t.eval(`document.activeElement.dataset.command`);
  await t.key('ArrowDown', 'ArrowDown', 40);
  t.check('→ then ↓ opens Edit; ↓ goes to the next item', firstItem === 'undo' && (await t.eval(`document.activeElement.dataset.command`)) === 'redo');
  await t.key('ArrowRight', 'ArrowRight', 39);
  await t.waitFor(menuOpen('insert'), { label: '→ in a menu: the next menu' });
  await t.key('Escape', 'Escape', 27);
  await t.waitFor(`!document.querySelector('.editor-menubar-menu') && document.activeElement?.dataset.menuId === 'insert'`, { label: 'Esc closes, focus on its name' });
  t.check('Esc closes the menu and leaves the keyboard on its name', true);
  await t.key('Escape', 'Escape', 27);
  await e.blur();
  await t.key('Alt', 'AltLeft', 18, 1);
  await t.waitFor(`document.activeElement?.dataset.menuId === 'file'`, { label: 'Alt alone' }).catch(() => {});
  t.check('Alt alone puts the keyboard on the menu bar', await t.eval(`document.activeElement?.dataset.menuId === 'file'`));
  await e.blur();
  // Enter on an item does it: Insert › Star
  const stars = await t.eval(`document.querySelectorAll('.editor-stage .scene .shape[data-shape="star"]').length`);
  await t.key('F10', 'F10', 121);
  await t.key('ArrowRight', 'ArrowRight', 39); await t.key('ArrowRight', 'ArrowRight', 39);
  await t.key('ArrowDown', 'ArrowDown', 40);
  await t.waitFor(menuOpen('insert'));
  await t.eval(`document.querySelector('.editor-menubar-menu [data-command="insert-star"]').focus()`);
  await t.key('Enter', 'Enter', 13);
  await t.waitFor(`document.querySelectorAll('.editor-stage .scene .shape[data-shape="star"]').length === ${stars + 1} && !document.querySelector('.editor-menubar-menu')`, { label: 'Enter inserts the star' });
  t.check('Enter on a menu item does it and closes the menu', true);
  await t.key('F10', 'F10', 121, 8);
  await sleep(150);
  t.check('Shift+F10 is not the menu bar (it stays the right-click menu)', !(await t.eval(`!!document.activeElement?.closest('.editor-menubar')`)));
  t.check('Shift+F10 opens the right-click menu, the keyboard in it', await t.eval(`!!document.activeElement?.closest('.editor-menu:not(.editor-menubar-menu)')`));
  if (await t.eval(`!!document.querySelector('.editor-menu:not(.editor-menubar-menu):not([hidden])')`)) await t.key('Escape', 'Escape', 27);

  // ---- v189: the keyboard alone
  await e.insert('textbox');
  await e.blur();
  await t.key('Enter', 'Enter', 13);
  t.check('Enter on a selected text: typing in it', await t.eval(`!!document.activeElement?.isContentEditable && !!document.activeElement.closest('.is-editor-selected')`));
  await t.key('Escape', 'Escape', 27);
  await e.blur();
  await t.key('F2', 'F2', 113);
  t.check('F2 on a selected text: typing in it too', await t.eval(`!!document.activeElement?.isContentEditable`));
  await t.key('Enter', 'Enter', 13);
  t.check('…Enter there finishes the text (it does not start typing again)', await t.eval(`!document.activeElement?.isContentEditable`));
  await e.tab('element');
  await t.eval(`(() => { const f = document.querySelector('.editor-panel-body [data-tool-field="color"]'); f.focus(); f.value = 'var(--color-rose)'; f.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
  await sleep(100);
  t.check('A choice in the panel: the panel is drawn again and the keyboard stays on that field', await t.eval(`!!document.activeElement?.matches('.editor-panel-body [data-tool-field="color"]')`), await t.eval(`document.activeElement?.outerHTML.slice(0, 80)`));
  t.check('The panel tabs say which one is open', await t.eval(`document.querySelectorAll('.editor-tabs [aria-selected="true"]').length === 1 && document.querySelector('.editor-tabs [aria-selected="true"]').dataset.tab === 'element'`));
  await e.undo(); await e.undo();
  await e.blur();
  const slideBefore = await t.eval(`document.querySelector('.editor-slide-list li.is-selected').dataset.index`);
  await t.key('F6', 'F6', 117);
  t.check('F6: the keyboard on the slide list (the open slide)', await t.eval(`!!document.activeElement?.matches('.editor-slide-list li.is-selected[aria-selected="true"]')`));
  await t.key('ArrowDown', 'ArrowDown', 40);
  t.check('…↓ opens the next slide, the keyboard stays in the list', await t.eval(`document.activeElement?.matches('.editor-slide-list li.is-selected') && document.activeElement.dataset.index === String(${Number(slideBefore) + 1})`));
  await t.key('ArrowUp', 'ArrowUp', 38);
  await t.key('F6', 'F6', 117);
  t.check('F6 again: the panel (its open tab)', await t.eval(`!!document.activeElement?.matches('.editor-tabs [aria-selected="true"]')`));
  await t.key('ArrowLeft', 'ArrowLeft', 37);
  t.check('…← opens the tab before it', await t.eval(`document.activeElement?.matches('.editor-tabs [aria-selected="true"]') && document.querySelectorAll('.editor-tabs [aria-selected="true"]').length === 1`));
  await t.key('F6', 'F6', 117);
  t.check('F6 again: the slide; a note says where the keyboard is', await t.eval(`document.activeElement?.matches('.editor-canvas') && /F6/.test(document.querySelector('.toast')?.textContent || '')`));
  await t.key('F6', 'F6', 117, 8);
  t.check('Shift+F6: back to the panel', await t.eval(`!!document.activeElement?.closest('.editor-panel')`));
  await e.blur();
  await t.key('m', 'KeyM', 77, 2);
  await t.waitFor(`!document.querySelector('.editor-dialog').hidden`).catch(() => {});
  await sleep(50);
  t.check('A window (Ctrl+M) takes the keyboard and is a dialog', await t.eval(`document.querySelector('.editor-dialog').contains(document.activeElement) && document.querySelector('.editor-dialog').getAttribute('aria-modal') === 'true'`));
  await t.key('Escape', 'Escape', 27);
  await t.key('k', 'KeyK', 75, 2);
  await t.key('Tab', 'Tab', 9);
  t.check('Tab in Ctrl+K stays in its window', await t.eval(`!!document.activeElement?.closest('.editor-palette')`));
  await t.key('Escape', 'Escape', 27);
  await t.key('F10', 'F10', 121);
  await t.key('ArrowDown', 'ArrowDown', 40);
  await t.key('End', 'End', 35);
  t.check('End in a menu: its last row', await t.eval(`(() => { const rows = [...document.querySelectorAll('.editor-menubar-menu [data-command]')]; return rows.length > 1 && document.activeElement === rows[rows.length - 1]; })()`));
  await t.key('Home', 'Home', 36);
  t.check('Home in a menu: its first row', await t.eval(`document.activeElement === document.querySelector('.editor-menubar-menu [data-command]')`));
  await t.key('Escape', 'Escape', 27); await t.key('Escape', 'Escape', 27);
  await e.blur();
  if (!(await t.eval(`!!document.querySelector('.editor-stage .is-editor-selected')`))) await e.pick('.editor-stage .scene .shape[data-shape="star"]');

  // ---- status bar
  t.check('pinned docks: no edge tabs; the status bar at the bottom of the window', await t.eval(`[...document.querySelectorAll('.editor-edge-tab')].every(tab => getComputedStyle(tab).display === 'none') && Math.abs(document.querySelector('.editor-statusbar').getBoundingClientRect().bottom - innerHeight) <= 2`));
  t.check('the status bar shows slide n / m', /\d+\D+\d+/.test(await t.eval(`document.querySelector('.status-slide').textContent`)));
  t.check('the status bar shows the selected element with place and size', /X -?\d+ +Y -?\d+ +\d+ × \d+/.test(await t.eval(`document.querySelector('.status-selection').textContent`)), await t.eval(`document.querySelector('.status-selection').textContent`));

  // ---- the bar next to the selection
  await t.waitFor(`document.querySelector('.editor-quickbar')?.hidden === false`, { label: 'the bar shows' });
  t.check('the bar sits above or below the selection, not over it', await t.eval(`(() => { const bar = document.querySelector('.editor-quickbar').getBoundingClientRect(), sel = document.querySelector('.editor-selection').getBoundingClientRect(); return bar.bottom <= sel.top || bar.top >= sel.bottom; })()`));
  await t.click('.editor-quickbar [data-action="bar-animate"]');
  await t.waitFor(`!!document.querySelector('.editor-quick-menu [data-action="motion-quick"]')`, { label: 'Animate opens the quick animations' });
  t.check('Animate in the bar opens the quick animations', true);
  await t.key('Escape', 'Escape', 27);
  await t.waitFor(`!document.querySelector('.editor-quick-menu')`).catch(() => {});
  if (!(await t.eval(`!!document.querySelector('.editor-stage .is-editor-selected')`))) await e.pick('.editor-stage .scene .shape[data-shape="star"]');
  await t.waitFor(`document.querySelector('.editor-quickbar')?.hidden === false`);
  await t.click('.editor-quickbar [data-action="bar-more"]');
  await t.waitFor(`!!document.querySelector('.editor-menu:not(.editor-menubar-menu):not([hidden]) [data-menu]')`, { label: '⋯ opens the right-click menu' });
  t.check('⋯ in the bar opens the right-click menu', true);
  await t.key('Escape', 'Escape', 27);
  await t.mouse('mouseMoved', 3, await t.eval(`innerHeight - 3`));
  await t.waitFor(`document.querySelector('.editor-quickbar').classList.contains('is-faded')`, { label: 'faded far away' }).catch(() => {});
  t.check('the bar fades when the pointer is far from it (and takes no clicks then)', await t.eval(`document.querySelector('.editor-quickbar').classList.contains('is-faded') && getComputedStyle(document.querySelector('.editor-quickbar')).pointerEvents === 'none'`));
  const barAt = await t.centre('.editor-quickbar');
  await t.mouse('mouseMoved', barAt.x, barAt.y);
  await t.waitFor(`!document.querySelector('.editor-quickbar').classList.contains('is-faded')`, { label: 'back near' });
  t.check('near the bar it is back', true);

  // ---- desktop keys
  const slides = () => t.eval(`document.querySelectorAll('.editor-slide-list > li').length`);
  await e.blur();
  await t.key('m', 'KeyM', 77, 2);
  await t.waitFor(`!!document.querySelector('.editor-template-grid')`, { label: 'Ctrl+M' });
  t.check('Ctrl+M opens "new slide" (its templates)', true);
  await t.key('Escape', 'Escape', 27);
  await t.waitFor(`!document.querySelector('.editor-template-grid')`).catch(() => {});
  const count = await slides();
  await e.blur();
  await t.key('D', 'KeyD', 68, 2 | 8);
  await t.waitFor(`document.querySelectorAll('.editor-slide-list > li').length === ${count + 1}`, { label: 'Ctrl+Shift+D' });
  t.check('Ctrl+Shift+D duplicates the slide', true);
  await e.undo();
  await t.waitFor(`document.querySelectorAll('.editor-slide-list > li').length === ${count}`);
  await e.blur();
  await t.key('F5', 'F5', 116);
  let played = null;
  try { played = await t.waitForWindow('blob:'); } catch { /* checked below */ }
  t.check('F5 plays the presentation from this slide (a new window)', !!played && /#numbers$/.test(await played.eval('location.href')));
  if (played) { await played.eval('window.close(); true').catch(() => {}); await played.close(); }

  // ---- v53: text styles, draw a path, Morph pairing
  const SEL = e.selected;
  const modelH2 = () => t.eval(`document.querySelector('.editor-slide-list li.is-selected .scene h2').getAttribute('style') || ''`);
  await e.pick('.editor-stage .scene h2');
  await e.tab('element');
  await t.click('.editor-panel-body .text-style-chip[data-style="title"]');
  await t.waitFor(`/font-size: 200%/.test(document.querySelector('.editor-slide-list li.is-selected .scene h2').getAttribute('style') || '')`, { label: 'Title style' }).catch(() => {});
  t.check('a text style chip gives the whole look in one click (written as plain inline CSS)', /font-family: var\(--font-display\)/.test(await modelH2()) && /font-weight: 700/.test(await modelH2()), await modelH2());
  t.check('the chip of the style it has now is marked', await t.eval(`document.querySelector('.editor-panel-body .text-style-chip[data-style="title"]').classList.contains('is-current')`));
  await t.waitFor(`document.querySelector('.editor-quickbar')?.hidden === false`);
  await t.click('.editor-quickbar [data-action="bar-styles"]');
  await t.waitFor(`!!document.querySelector('.editor-styles-menu .text-style-chip[data-style="caption"]')`, { label: 'Aa opens the styles' });
  await t.click('.editor-styles-menu .text-style-chip[data-style="caption"]');
  await t.waitFor(`/color-text-muted/.test(document.querySelector('.editor-slide-list li.is-selected .scene h2').getAttribute('style') || '')`, { label: 'Caption' }).catch(() => {});
  t.check('Aa in the selection bar: another style replaces the first (no 200% left)', /color: var\(--color-text-muted\)/.test(await modelH2()) && !/200%/.test(await modelH2()) && !(await t.eval(`!!document.querySelector('.editor-styles-menu')`)), await modelH2());
  await e.undo(); await e.undo();
  await t.waitFor(`!(document.querySelector('.editor-slide-list li.is-selected .scene h2').getAttribute('style') || '').includes('font')`).catch(() => {});
  t.check('each style is one undo step', !/font/.test(await modelH2()), await modelH2());

  // draw a path for the star: an L-shaped drag
  await e.pick('.editor-stage .scene .shape[data-shape="star"]');
  await e.tab('animations');
  await t.click('.editor-panel-body [data-action="motion-draw"]');
  await t.waitFor(`document.querySelector('.editor').classList.contains('is-drawing-path')`, { label: 'drawing on' });
  const star = await t.centre('.editor-stage .scene .shape[data-shape="star"]');
  const k = await e.scale();
  await t.mouse('mousePressed', star.x, star.y, { buttons: 1 });
  for (let i = 1; i <= 8; i++) await t.mouse('mouseMoved', star.x - 30 * i, star.y, { buttons: 1 });
  t.check('while drawing, the line shows on the slide', await t.eval(`(document.querySelector('.editor-path-drawing polyline')?.getAttribute('points') || '').split(' ').length >= 5`));
  for (let i = 1; i <= 8; i++) await t.mouse('mouseMoved', star.x - 240, star.y - 20 * i, { buttons: 1 });
  await t.mouse('mouseReleased', star.x - 240, star.y - 160, { buttons: 0 });
  await t.waitFor(`!!${SEL}?.getAttribute('data-animation')`, { label: 'path made' }).catch(() => {});
  await e.tab('element');
  await t.waitFor(`document.querySelectorAll('.editor-keyframe-table tbody tr').length >= 3`, { label: 'keyframes' }).catch(() => {});
  const keys = await t.eval(`[...document.querySelectorAll('.editor-keyframe-table tbody tr')].map(r => ['at', 'x', 'y', 'rotate'].map(k => r.querySelector('[data-key="' + k + '"]')?.value))`);
  const last = keys[keys.length - 1] || [];
  t.check('a drawn L becomes keyframes: start at 0, a corner, the end where you let go', keys.length >= 3 && keys.length <= 6 && keys[0][1] === '0' && Math.abs(Number(last[1]) + 240 / k) < 6 && Math.abs(Number(last[2]) + 160 / k) < 6 && last[0] === '100', JSON.stringify([keys, k]));
  t.check('the same speed along the way (easing linear); drawing is off again', (await t.eval(`document.querySelector('.editor-panel-body [data-anim-field="easing"]').value`)) === 'linear' && !(await t.eval(`document.querySelector('.editor').classList.contains('is-drawing-path')`)));
  t.check('the motion path shows through the keyframes', await t.eval(`!!document.querySelector('.editor-motion-path polyline')`));
  await e.undo();
  await t.waitFor(`!${SEL}?.hasAttribute('data-animation')`, { label: 'undo the path' }).catch(() => {});
  t.check('the path is one undo step', !(await t.eval(`${SEL}?.hasAttribute('data-animation')`)));
  // ⏱ Your speed: slow first, fast after: the middle keyframe comes late; it lasts as long as the drawing
  await e.tab('animations');
  await t.click('.editor-panel-body [data-action="motion-timed"]');
  await t.click('.editor-panel-body [data-action="motion-draw"]');
  await t.waitFor(`document.querySelector('.editor').classList.contains('is-drawing-path')`);
  const started = Date.now();
  await t.mouse('mousePressed', star.x, star.y, { buttons: 1 });
  for (let i = 1; i <= 6; i++) { await t.mouse('mouseMoved', star.x - 20 * i, star.y, { buttons: 1 }); await sleep(120); }   // slow to the left
  for (let i = 1; i <= 6; i++) await t.mouse('mouseMoved', star.x - 120, star.y - 25 * i, { buttons: 1 });   // fast up
  await t.mouse('mouseReleased', star.x - 120, star.y - 150, { buttons: 0 });
  const tookMs = Date.now() - started;
  await e.tab('element');
  await t.waitFor(`document.querySelectorAll('.editor-keyframe-table tbody tr').length >= 3`).catch(() => {});
  const timedKeys = await t.eval(`(() => { const rows = [...document.querySelectorAll('.editor-keyframe-table tbody tr')].map(r => ({ at: Number(r.querySelector('[data-key="at"]').value), x: Number(r.querySelector('[data-key="x"]').value), y: Number(r.querySelector('[data-key="y"]').value) })); const last = rows[rows.length - 1]; const corner = rows.find(r => Math.abs(r.x - last.x) < 8 && r.y > last.y / 4); return [rows.length, corner ? corner.at : -1]; })()`);   // [keyframes, when it reaches the corner]
  const timedLength = Number(await t.eval(`document.querySelector('.editor-panel-body [data-anim-field="duration"]').value`));
  t.check('⏱ Your speed: the slow part takes most of the time (the corner comes late), and it lasts about as long as the drawing', timedKeys[0] >= 3 && timedKeys[1] > 60 && timedLength > 300 && timedLength <= tookMs + 200, JSON.stringify([timedKeys, timedLength, tookMs]));
  await e.undo();
  await e.tab('animations');
  await t.click('.editor-panel-body [data-action="motion-timed"]');   // off again
  // Turn along: the arrow of the way turns too; Esc stops drawing without a path
  await e.tab('animations');
  await t.click('.editor-panel-body [data-action="motion-orient"]');
  await t.click('.editor-panel-body [data-action="motion-draw"]');
  await t.waitFor(`document.querySelector('.editor').classList.contains('is-drawing-path')`);
  await t.mouse('mousePressed', star.x, star.y, { buttons: 1 });
  for (let i = 1; i <= 6; i++) await t.mouse('mouseMoved', star.x - 30 * i, star.y, { buttons: 1 });
  for (let i = 1; i <= 6; i++) await t.mouse('mouseMoved', star.x - 180, star.y - 30 * i, { buttons: 1 });
  await t.mouse('mouseReleased', star.x - 180, star.y - 180, { buttons: 0 });
  await e.tab('element');
  await t.waitFor(`document.querySelectorAll('.editor-keyframe-table tbody tr').length >= 3`).catch(() => {});
  const turned = await t.eval(`[...document.querySelectorAll('.editor-keyframe-table tbody tr')].map(r => Number(r.querySelector('[data-key="rotate"]').value))`);
  t.check('Turn along: going left then up, it turns a quarter (90°)', turned[0] === 0 && Math.abs(Math.abs(turned[turned.length - 1]) - 90) <= 3, JSON.stringify(turned));
  await e.undo();
  await e.tab('animations');
  await t.click('.editor-panel-body [data-action="motion-orient"]');   // off again
  await t.click('.editor-panel-body [data-action="motion-draw"]');
  await t.key('Escape', 'Escape', 27);
  t.check('Esc stops drawing (the editor stays open)', await t.eval(`!document.querySelector('.editor').classList.contains('is-drawing-path') && !document.querySelector('.editor').hidden`));

  // Morph: pair the heading with one on the next slide
  await e.pick('.editor-stage .scene h2');
  await e.tab('element');
  await t.editor.unfoldFor('[data-action="morph-pair"]');
  await t.click('.editor-panel-body [data-action="morph-pair"]');
  await t.waitFor(`document.querySelectorAll('.editor-morph-menu [data-action="morph-choose"]').length >= 2`, { label: 'next slide elements' });
  const partner = await t.eval(`document.querySelector('.editor-morph-menu [data-action="morph-choose"]').textContent`);
  await t.click('.editor-morph-menu [data-action="morph-choose"]');
  await t.waitFor(`!!document.querySelector('.editor-panel-body .morph-link')`, { label: 'paired' }).catch(() => {});
  const morph = await t.eval(`(() => { const lis = [...document.querySelectorAll('.editor-slide-list > li')]; const i = lis.findIndex(li => li.classList.contains('is-selected')); const name = lis[i].querySelector('.scene h2').getAttribute('data-morph'); return { name, next: !!name && !!lis[i + 1].querySelector('.scene [data-morph="' + name + '"]'), link: document.querySelector('.editor-panel-body .morph-link')?.textContent || '' }; })()`);
  t.check('Pair with the next slide: both get the same morph name; the tab says where it glides', !!morph.name && morph.next && morph.link.includes(partner.trim().slice(0, 10)), JSON.stringify([morph, partner]));
  await e.undo();
  await t.waitFor(`!document.querySelector('.editor-slide-list li.is-selected .scene h2').hasAttribute('data-morph')`).catch(() => {});
  t.check('pairing is one undo step (both slides)', await t.eval(`(() => { const lis = [...document.querySelectorAll('.editor-slide-list > li')]; const i = lis.findIndex(li => li.classList.contains('is-selected')); return !lis[i].querySelector('.scene [data-morph]') && !lis[i + 1].querySelector('.scene [data-morph]'); })()`));

  // a second element paired with the same one: the first gives up the name (one partner per slide)
  const pairFirst = async selector => {
    await e.pick(selector); await e.tab('element');
    await t.editor.unfoldFor('[data-action="morph-pair"]');
    await t.click('.editor-panel-body [data-action="morph-pair"]');
    await t.waitFor(`!!document.querySelector('.editor-morph-menu [data-action="morph-choose"]')`);
    await t.click('.editor-morph-menu [data-action="morph-choose"]');
    await t.waitFor(`!!document.querySelector('.editor-panel-body .morph-link')`).catch(() => {});
  };
  await pairFirst('.editor-stage .scene h2');
  await pairFirst('.editor-stage .scene .eyebrow');
  t.check('pairing another element with the same partner takes the name from the first (one per slide)', await t.eval(`(() => { const scene = document.querySelector('.editor-slide-list li.is-selected .scene'); const name = scene.querySelector('.eyebrow').getAttribute('data-morph'); return !!name && scene.querySelectorAll('[data-morph="' + name + '"]').length === 1; })()`));
  await e.undo(); await e.undo();
  // Draw a path ends when you go to another slide; Format's text styles need a text
  await e.pick('.editor-stage .scene .shape[data-shape="star"]');
  await e.tab('animations');
  await t.click('.editor-panel-body [data-action="motion-draw"]');
  await t.waitFor(`document.querySelector('.editor').classList.contains('is-drawing-path')`);
  await t.key('PageDown', 'PageDown', 34);
  await t.waitFor(`document.querySelector('.editor-stage .scene')?.dataset.name !== 'numbers'`).catch(() => {});
  t.check('another slide ends Draw a path', !(await t.eval(`document.querySelector('.editor').classList.contains('is-drawing-path')`)));
  await t.key('PageUp', 'PageUp', 33);
  await t.waitFor(`document.querySelector('.editor-stage .scene')?.dataset.name === 'numbers'`);
  await e.pick('.editor-stage .scene .shape[data-shape="star"]');
  await t.click('.editor-menubar [data-menu-id="format"]');
  await t.waitFor(`!!document.querySelector('.editor-menubar-menu [data-command="style-title"]')`);
  t.check('Format › Text style is greyed for a shape (it needs a text)', await t.eval(`document.querySelector('.editor-menubar-menu [data-command="style-title"]').getAttribute('aria-disabled') === 'true'`));
  await t.click('.editor-menubar [data-menu-id="format"]');

  // ---- v54: several selected: the bar for all of them, Style with mixed values; the panel never scrolls sideways
  await e.insert('rect');
  await e.tab('element');
  await e.panelSet('[data-tool-field="color"]', 'var(--color-rose)');
  await t.waitFor(`${SEL}?.style.color === 'var(--color-rose)'`);
  await e.pick('.editor-stage .scene .shape[data-shape="star"]', { shift: true });
  await t.waitFor(`/2/.test(document.querySelector('.editor-quickbar:not([hidden]) .quickbar-count')?.textContent || '')`, { label: 'group bar' });
  t.check('two selected: one bar for both, next to them', await t.eval(`(() => { const bar = document.querySelector('.editor-quickbar').getBoundingClientRect(); const boxes = [...document.querySelectorAll('.editor-group-box')].map(b => b.getBoundingClientRect()); return boxes.length === 2 && boxes.every(b => bar.bottom <= b.top + 1 || bar.top >= b.bottom - 1 || bar.right <= b.left || bar.left >= b.right); })()`));
  await e.tab('element');
  t.check('Style shows “mixed” where they differ (the colour)', await t.eval(`(() => { const f = document.querySelector('.editor-panel-body [data-tool-field="color"]'); return f.selectedOptions[0].disabled && /mixed/.test(f.selectedOptions[0].textContent); })()`));
  await e.panelSet('[data-tool-field="color"]', 'var(--color-teal)');
  await t.waitFor(`[...document.querySelectorAll('.editor-stage .scene .shape')].filter(s => s.style.color === 'var(--color-teal)').length === 2`, { label: 'both teal' }).catch(() => {});
  t.check('a Style choice gives all selected the same value (one undo step)', (await t.eval(`[...document.querySelectorAll('.editor-stage .scene .shape')].filter(s => s.style.color === 'var(--color-teal)').length`)) === 2);
  await t.click('.editor-quickbar [data-action="bar-align"]');
  await t.waitFor(`!!document.querySelector('.editor-align-menu [data-run="align-top"]')`, { label: 'Align list' });
  await t.click('.editor-align-menu [data-run="align-top"]');
  await t.waitFor(`(() => { const tops = [...document.querySelectorAll('.editor-group-box')].map(b => Math.round(b.getBoundingClientRect().top)); return tops.length === 2 && Math.abs(tops[0] - tops[1]) <= 2; })()`, { label: 'aligned' }).catch(() => {});
  t.check('Align ▾ › Top lines them up', await t.eval(`(() => { const tops = [...document.querySelectorAll('.editor-group-box')].map(b => Math.round(b.getBoundingClientRect().top)); return tops.length === 2 && Math.abs(tops[0] - tops[1]) <= 2; })()`));
  await e.insert('line');
  await e.pick('.editor-stage .scene .shape[data-shape="rect"]', { shift: true });
  await e.tab('element');
  await e.panelSet('[data-tool-field="shapeStroke"]', '0px');
  await t.waitFor(`document.querySelector('.editor-stage .scene .shape[data-shape="rect"]').style.getPropertyValue('--shape-stroke').trim() === '0px'`).catch(() => {});
  t.check('Outline None on a line and a box: the box loses it, the line keeps it (it is the line)', await t.eval(`document.querySelector('.editor-stage .scene .shape[data-shape="rect"]').style.getPropertyValue('--shape-stroke').trim() === '0px' && document.querySelector('.editor-stage .scene .shape[data-shape="line"]').style.getPropertyValue('--shape-stroke').trim() !== '0px'`));
  await e.pick('.editor-stage .scene .shape[data-shape="rect"]');
  await e.tab('element');
  await t.eval(`(() => { const f = document.querySelector('.editor-panel-body [data-element-field="animation"]'); f.value = [...f.options].some(o => o.value === 'bounce-in') ? 'bounce-in' : 'preset:bounce-in'; f.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
  await t.waitFor(`!!document.querySelector('.editor-panel-body .keyframe-ease')`);
  t.check('the panel never scrolls sideways (a keyframe table with easings)', await t.eval(`(() => { const b = document.querySelector('.editor-panel-body'); return b.scrollWidth <= b.clientWidth + 1; })()`));

  // ---- v55: your own text styles in the file; guides from the slide's own blocks; the same size as another element
  await e.pick('.editor-stage .scene .eyebrow');
  await e.tab('element');
  await e.panelSet('[data-tool-field="fontSize"]', '150%');
  await t.waitFor(`(((document.querySelector('.editor-stage .scene .eyebrow')).getAttribute('data-text-size') || '').split(' ')[0] || (document.querySelector('.editor-stage .scene .eyebrow')).style.fontSize) === '150%'`);
  await e.panelSet('[data-tool-field="color"]', 'var(--color-rose)');
  await t.waitFor(`document.querySelector('.editor-stage .scene .eyebrow').style.color === 'var(--color-rose)'`);
  await t.click('.editor-panel-body [data-action="text-style-new"]');
  await t.waitFor(`document.activeElement?.matches('[data-tool-field="newTextStyle"]')`, { label: 'style name field' });
  await t.type('Rose label');
  await t.key('Enter', 'Enter', 13);
  await t.waitFor(`!!document.querySelector('.editor-panel-body .text-style-chip[data-style="own:rose-label"]')`, { label: 'own style chip' }).catch(() => {});
  t.check('+ Save as style: the look becomes a chip of its own (marked as the one it has)', await t.eval(`document.querySelector('.editor-panel-body .text-style-chip[data-style="own:rose-label"]')?.classList.contains('is-current') === true`));
  await t.click('.editor-panel-body [data-action="text-style-new"]');
  await t.waitFor(`document.activeElement?.matches('[data-tool-field="newTextStyle"]')`);
  await t.type('Alpha');
  await t.click('.editor-panel-body [data-action="text-style-cancel"]');
  await t.waitFor(`!document.querySelector('[data-tool-field="newTextStyle"]')`).catch(() => {});
  t.check('Cancel saves no style (and closes the name field)', await t.eval(`!document.querySelector('.text-style-chip[data-style="own:alpha"]') && !document.querySelector('[data-tool-field="newTextStyle"]')`));
  await t.click('.editor-panel-body [data-action="text-style-new"]');
  await t.waitFor(`document.activeElement?.matches('[data-tool-field="newTextStyle"]')`);
  await t.type('Beta');
  await t.key('Escape', 'Escape', 27);
  await t.waitFor(`!document.querySelector('[data-tool-field="newTextStyle"]')`).catch(() => {});
  t.check('Esc in the name field: no style, the field closes, the editor stays', await t.eval(`!document.querySelector('.text-style-chip[data-style="own:beta"]') && !document.querySelector('[data-tool-field="newTextStyle"]') && !document.querySelector('.editor').hidden`));
  await e.pick('.editor-stage .scene h2');
  await e.tab('element');
  await t.click('.editor-panel-body .text-style-chip[data-style="own:rose-label"]');
  await t.waitFor(`document.querySelector('.editor-stage .scene h2').style.color === 'var(--color-rose)'`, { label: 'own style applied' }).catch(() => {});
  t.check('your own style gives another text the same look', await t.eval(`(() => { const h = document.querySelector('.editor-stage .scene h2'); return h.style.color === 'var(--color-rose)' && (((h).getAttribute('data-text-size') || '').split(' ')[0] || (h).style.fontSize) === '150%'; })()`));
  await e.undo();
  await t.waitFor(`document.querySelector('.editor-stage .scene h2').style.color !== 'var(--color-rose)'`).catch(() => {});
  await t.click('.editor-panel-body .text-style-remove[data-style="own:rose-label"]');
  await t.waitFor(`!document.querySelector('.editor-panel-body .text-style-chip[data-style="own:rose-label"]')`, { label: 'removed' }).catch(() => {});
  t.check('× removes your own style', !(await t.eval(`!!document.querySelector('.editor-panel-body .text-style-chip[data-style="own:rose-label"]')`)));
  await e.undo();
  await t.waitFor(`!!document.querySelector('.editor-panel-body .text-style-chip[data-style="own:rose-label"]')`).catch(() => {});
  t.check('undo brings the style back', await t.eval(`!!document.querySelector('.editor-panel-body .text-style-chip[data-style="own:rose-label"]')`));
  await t.eval(`window.__beforeSave = 1; sessionStorage.removeItem('test-written'); true`);
  await e.blur();
  await t.key('s', 'KeyS', 83, 2);
  await t.waitFor(`JSON.parse(sessionStorage.getItem('test-written') || '[]').length >= 1`, { timeout: 10000, label: 'saved' });
  const savedFile = await t.eval(`JSON.parse(sessionStorage.getItem('test-written')).pop().text`);
  t.check('the style is in the saved file (the TEXT STYLES block, readable JSON)', /id="deckTextStyles">[\s\S]*"rose-label": \{\s*"name": "Rose label"[\s\S]*"color": "var\(--color-rose\)"/.test(savedFile));
  await t.waitFor(`window.__beforeSave === undefined && document.readyState === 'complete'`, { timeout: 10000, label: 'the page opened again after Save' });
  await e.open('numbers');

  // guides: a free shape dragged near the top of a card snaps to it (a line shows); resizing: the same width as a card
  await e.insert('rect');
  const kk = await e.scale();
  const geo = await t.eval(`(() => { const stage = document.querySelector('.editor-stage').getBoundingClientRect(); const card = document.querySelectorAll('.editor-stage .scene .stat')[1].getBoundingClientRect(); const rect = document.querySelector('.editor-stage .is-editor-selected').getBoundingClientRect(); return { stageTop: stage.top, cardTop: card.top, cardWidth: card.width, rectTop: rect.top, rectWidth: rect.width }; })()`);
  const grip = await t.centre('.editor-selection .editor-move');
  let guideAt = null;
  await t.drag(grip, 37, geo.cardTop + 3 * kk - geo.rectTop, { steps: 6, during: async () => { guideAt = await t.eval(`(() => { const g = document.querySelector('.editor-guide.is-horizontal'); return g && !g.hidden ? parseFloat(g.style.top) : null; })()`); } });
  t.check('dragging near a card of the slide (not placed freely): a guide at its top, and it snaps there', guideAt !== null && Math.abs(guideAt - (geo.cardTop - geo.stageTop) / kk) <= 1.5 && Math.abs((await t.eval(`document.querySelector('.editor-stage .is-editor-selected').getBoundingClientRect().top`)) - geo.cardTop) <= 2 * kk, JSON.stringify([guideAt, (geo.cardTop - geo.stageTop) / kk]));
  const east = await t.centre('.editor-selection .editor-handle[data-dir="e"]');
  let readoutText = '';
  const rectNow = await t.eval(`document.querySelector('.editor-stage .is-editor-selected').getBoundingClientRect().width`);
  await t.drag(east, geo.cardWidth - rectNow + 3 * kk, 0, { steps: 6, during: async () => { readoutText = await t.eval(`document.querySelector('.editor-readout').textContent`); } });
  t.check('resizing near a card’s width: the same width, and the size says so', /width of/.test(readoutText) && Math.abs((await t.eval(`document.querySelector('.editor-stage .is-editor-selected').getBoundingClientRect().width`)) - geo.cardWidth) <= 1.5, readoutText);

  // ---- v56: the slide's pace and order presets; timeline bars pull to each other
  const modelScene = `document.querySelector('.editor-slide-list li.is-selected .scene')`;
  await e.tab('animations');
  t.check('v216: Pace and order starts folded (the slide has no pace of its own)', await t.eval(`document.querySelector('.editor-panel-body details.anim-pace')?.open === false`));
  await t.click('.editor-panel-body details.anim-pace > summary');   // (it stays open while you use it)
  await t.click('.editor-panel-body [data-action="slide-pace"][data-pace="70"]');
  await t.waitFor(`/--reveal-stagger: 70ms/.test(${modelScene}.getAttribute('style') || '')`, { label: 'brisk pace' }).catch(() => {});
  t.check('Pace › Brisk gives this slide its own time between items (plain CSS on the slide)', /--reveal-stagger: 70ms/.test(await t.eval(`${modelScene}.getAttribute('style') || ''`)));
  await e.tab('animations');
  t.check('the chip of the slide’s pace is marked; the field shows it', await t.eval(`document.querySelector('.editor-panel-body [data-action="slide-pace"][data-pace="70"]').classList.contains('is-current') && document.querySelector('.editor-panel-body [data-tool-field="slidePace"]').value === '70'`));
  await t.click('.editor-panel-body [data-action="slide-pace"][data-pace=""]');
  await t.waitFor(`!/--reveal-stagger/.test(${modelScene}.getAttribute('style') || '')`).catch(() => {});
  t.check('As the presentation takes the slide’s own pace away', !/--reveal-stagger/.test(await t.eval(`${modelScene}.getAttribute('style') || ''`)));
  await e.tab('animations');
  await t.click('.editor-panel-body [data-action="slide-order"][data-order="reverse"]');
  await t.waitFor(`(() => { const s = [...document.querySelectorAll('.editor-stage .scene .stat')].map(x => parseFloat(x.style.getPropertyValue('--order'))); return s.length > 2 && s.every((v, i) => i === 0 || v < s[i - 1]); })()`, { label: 'reverse' }).catch(() => {});
  t.check('Order › The other way round: the last card (as you read) comes first', await t.eval(`(() => { const s = [...document.querySelectorAll('.editor-stage .scene .stat')].map(x => parseFloat(x.style.getPropertyValue('--order'))); return s.length > 2 && s.every((v, i) => i === 0 || v < s[i - 1]); })()`));
  await e.tab('animations');
  await t.click('.editor-panel-body [data-action="slide-order"][data-order="reading"]');
  await t.waitFor(`(() => { const s = [...document.querySelectorAll('.editor-stage .scene .stat')].map(x => parseFloat(x.style.getPropertyValue('--order'))); return s.every((v, i) => i === 0 || v > s[i - 1]); })()`, { label: 'reading' }).catch(() => {});
  t.check('Order › As you read it: top to bottom, left to right', await t.eval(`(() => { const s = [...document.querySelectorAll('.editor-stage .scene .stat')].map(x => parseFloat(x.style.getPropertyValue('--order'))); return s.every((v, i) => i === 0 || v > s[i - 1]); })()`));
  // two shapes with animations of their own: drag the second bar's start to the first one's end
  const ownAnimation = async (shape, preset) => {
    await e.insert(shape);
    await e.tab('element');
    await t.eval(`(() => { const f = document.querySelector('.editor-panel-body [data-element-field="animation"]'); f.value = 'preset:${preset}'; f.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
    await t.waitFor(`!!${SEL}?.getAttribute('data-animation')`);
  };
  await ownAnimation('circle', 'fade-in');
  await ownAnimation('triangle', 'zoom-in');
  await e.tab('animations');
  const bars = await t.eval(`(() => { const rows = [...document.querySelectorAll('.anim-row')].filter(r => r.querySelector('.anim-track.is-draggable[data-drag="delay"]')); rows[rows.length - 1].scrollIntoView({ block: 'center' }); const [a, b] = rows.slice(-2).map(r => r.querySelector('.anim-bar').getBoundingClientRect()); return { aEnd: a.right, bStart: b.left, bMid: (() => { const barB = rows[rows.length - 1].querySelector('.anim-bar'); for (let x = b.left + 6; x < b.right - 6; x += 2) if (document.elementFromPoint(x, b.top + b.height / 2) === barB) return x; return b.left + b.width / 2; })(), y: b.top + b.height / 2, total: Number(rows[rows.length - 1].querySelector('.anim-track').dataset.total), width: rows[rows.length - 1].querySelector('.anim-track').clientWidth, aEndMs: Math.round((parseFloat(rows[rows.length - 2].querySelector('.anim-bar').style.left) + parseFloat(rows[rows.length - 2].querySelector('.anim-bar').style.width)) / 100 * Number(rows[rows.length - 2].querySelector('.anim-track').dataset.total)) }; })()`);
  let dragLabel = '';
  await t.drag({ x: bars.bMid, y: bars.y }, bars.aEnd - bars.bStart + 4, 0, { steps: 6, during: async () => { dragLabel = await t.eval(`document.querySelector('.anim-row.is-dragging .anim-action')?.textContent || ''`); } });
  t.check('dragging a bar near another bar’s end: it pulls there and says so', /= end of/.test(dragLabel), dragLabel);
  await e.tab('element');
  const delay = Number(await t.eval(`document.querySelector('.editor-panel-body [data-anim-field="delay"]').value`));
  t.check('…and its delay is that end exactly (not rounded to 50)', Math.abs(delay - bars.aEndMs) <= 1, JSON.stringify([delay, bars.aEndMs]));

  // ---- v66: groups (Ctrl+G) and the stagger (on a clean page: no shapes from before)
  await t.open('numbers', { clear: true });
  await t.key('e', 'KeyE', 69);
  await t.waitFor(`!!document.querySelector('.editor .editor-stage .scene')`, { label: 'editor (clean)' });
  const addShape = async (kind, x, y) => { await e.insert(kind); await e.tab('element'); for (const [name, value] of [['--x', x], ['--y', y]]) { await e.panelSet(`[data-element-field="${name}"]`, String(value)); await t.waitFor(`parseFloat(${SEL}.style.getPropertyValue('${name}')) === ${value}`); } };
  await addShape('rect', 300, 620);
  await addShape('circle', 700, 640);
  const shapeBoxes = () => t.eval(`[...document.querySelectorAll('.editor-stage .scene .shape')].map(s => { const b = s.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top)]; })`);
  const before66 = await shapeBoxes();
  await e.pick('.editor-stage .scene .shape[data-shape="rect"]');
  await e.pick('.editor-stage .scene .shape[data-shape="circle"]', { shift: true });
  await e.blur();
  await t.key('g', 'KeyG', 71, 2);
  await t.waitFor(`document.querySelectorAll('.editor-stage .scene [data-group] > .shape').length === 2`, { label: 'grouped' }).catch(() => {});
  t.check('Ctrl+G puts the selected shapes in one group, where they were', (await t.eval(`document.querySelectorAll('.editor-stage .scene [data-group] > .shape').length`)) === 2 && JSON.stringify(await shapeBoxes()) === JSON.stringify(before66), JSON.stringify([before66, await shapeBoxes()]));
  t.check('…and the group is selected', await t.eval(`${SEL}?.hasAttribute('data-group')`));
  const circleAt = await t.centre('.editor-stage .scene [data-group] .shape[data-shape="circle"]');
  await t.clickAt({ x: 5, y: 5 });   // nothing selected
  await e.pick('.editor-stage .scene h2');
  await t.clickAt(circleAt);
  t.check('a click on a shape in the group selects the group first', await t.eval(`${SEL}?.hasAttribute('data-group')`));
  await t.clickAt(circleAt);
  t.check('…the next click the shape itself', await t.eval(`${SEL}?.matches('.shape[data-shape="circle"]')`));
  await e.pick('.editor-stage .scene [data-group]');
  const grip66 = await t.centre('.editor-selection .editor-move');
  await t.drag(grip66, 80, 0, { steps: 5, modifiers: 1 });
  const moved66 = await shapeBoxes();
  t.check('dragging the group moves both shapes together', moved66.every((box, i) => Math.abs(box[0] - before66[i][0]) > 20 && Math.abs((box[0] - before66[i][0]) - (moved66[0][0] - before66[0][0])) <= 2), JSON.stringify([before66, moved66]));
  // v67: resizing the group scales its members; a turned group ungroups without anything moving
  const widths = () => t.eval(`[...document.querySelectorAll('.editor-stage .scene [data-group] > .shape')].map(s => Math.round(s.getBoundingClientRect().width))`);
  const w0 = await widths();
  const eastHandle = await t.centre('.editor-selection .editor-handle[data-dir="e"]');
  await t.drag(eastHandle, 120, 0, { steps: 5, modifiers: 1 });
  const w1 = await widths();
  t.check('resizing the group scales its members (both get wider)', w1.length === 2 && w1.every((w, i) => w > w0[i] + 10), JSON.stringify([w0, w1]));
  const centres = () => t.eval(`[...document.querySelectorAll('.editor-stage .scene .shape')].map(s => { const b = s.getBoundingClientRect(); return [Math.round(b.left + b.width / 2), Math.round(b.top + b.height / 2)]; })`);
  await e.tab('element');
  await e.panelSet('[data-tool-field="rotate"]', '90');
  await t.waitFor(`${SEL}?.style.rotate === '90deg'`).catch(() => {});
  const turnedCentres = await centres();
  await e.blur();
  await t.key('G', 'KeyG', 71, 2 | 8);
  await t.waitFor(`!document.querySelector('.editor-stage .scene [data-group]')`, { label: 'ungrouped' }).catch(() => {});
  const afterCentres = await centres();
  t.check('ungrouping a turned group: every shape stays where it was, turned 90°', afterCentres.every((c, i) => Math.abs(c[0] - turnedCentres[i][0]) <= 2 && Math.abs(c[1] - turnedCentres[i][1]) <= 2) && (await t.eval(`[...document.querySelectorAll('.editor-stage .scene .shape')].every(s => s.style.rotate === '90deg')`)), JSON.stringify([turnedCentres, afterCentres]));
  await e.undo();   // back to the turned group
  await e.undo();   // its turn off
  await t.waitFor(`!!document.querySelector('.editor-stage .scene [data-group]') && !document.querySelector('.editor-stage .scene [data-group]').style.rotate`).catch(() => {});
  await e.pick('.editor-stage .scene [data-group]');
  const beforeUngroup = await shapeBoxes();
  await e.blur();
  await t.key('G', 'KeyG', 71, 2 | 8);
  await t.waitFor(`!document.querySelector('.editor-stage .scene [data-group]')`, { label: 'ungrouped' }).catch(() => {});
  t.check('Ctrl+Shift+G ungroups: the shapes stay where they are', !(await t.eval(`!!document.querySelector('.editor-stage .scene [data-group]')`)) && JSON.stringify(await shapeBoxes()) === JSON.stringify(beforeUngroup));
  // a group that appears on a click: ungrouped, its members wait for that click (none rises in with the slide before it)
  await e.blur();
  await t.key('g', 'KeyG', 71, 2);
  await t.waitFor(`${SEL}?.hasAttribute('data-group')`).catch(() => {});
  await e.tab('element');
  await e.panelSet('[data-element-field="appear"]', 'click');
  await t.waitFor(`${SEL}?.hasAttribute('data-reveal-step')`).catch(() => {});
  await e.blur();
  await t.key('G', 'KeyG', 71, 2 | 8);
  await t.waitFor(`!document.querySelector('.editor-stage .scene [data-group]')`).catch(() => {});
  t.check('ungrouping a group on a click: its shapes wait for that click (no rise-in before it)', await t.eval(`[...document.querySelectorAll('.editor-stage .scene .shape')].every(s => s.hasAttribute('data-reveal-step') && !s.classList.contains('reveal'))`));
  await e.undo(); await e.undo(); await e.undo();
  await e.pick('.editor-stage .scene .shape[data-shape="rect"]');
  await e.pick('.editor-stage .scene .shape[data-shape="circle"]', { shift: true });
  // stagger: with the slide they rise in one after another in reading order, or the other way round
  t.check('after ungrouping both stay selected (ready to stagger)', (await t.eval(`document.querySelectorAll('.editor-group-box').length`)) === 2);
  await e.tab('element');
  await t.click('.editor-panel-body [data-action="stagger-reverse"]');
  await t.waitFor(`(() => { const r = document.querySelector('.editor-stage .scene .shape[data-shape="rect"]'), c = document.querySelector('.editor-stage .scene .shape[data-shape="circle"]'); return r.classList.contains('reveal') && parseFloat(c.style.getPropertyValue('--order')) < parseFloat(r.style.getPropertyValue('--order')); })()`, { label: 'stagger' }).catch(() => {});
  t.check('Stagger ← the other way: the right one (as you read: last) rises in first', await t.eval(`(() => { const r = document.querySelector('.editor-stage .scene .shape[data-shape="rect"]'), c = document.querySelector('.editor-stage .scene .shape[data-shape="circle"]'); const co = parseFloat(c.style.getPropertyValue('--order')), ro = parseFloat(r.style.getPropertyValue('--order')); return ro === co + 1 && co >= 1; })()`));   // after the slide's own items, one after another

  // ---- v68: the text bar above selected words (italic, a link), Ctrl+I
  const selectWord = (word) => t.eval(`(() => { const h = document.querySelector('.editor-stage .scene h2'); h.focus(); const walker = document.createTreeWalker(h, NodeFilter.SHOW_TEXT); let node; while ((node = walker.nextNode())) { const at = node.nodeValue.indexOf(${JSON.stringify(word)}); if (at >= 0) { const r = document.createRange(); r.setStart(node, at); r.setEnd(node, at + ${word.length}); const s = getSelection(); s.removeAllRanges(); s.addRange(r); return true; } } return false; })()`);
  const modelH2v68 = () => t.eval(`document.querySelector('.editor-slide-list li.is-selected .scene h2').innerHTML`);
  await e.pick('.editor-stage .scene h2');
  await selectWord('numbers');
  await t.waitFor(`document.querySelector('.editor-textbar') && !document.querySelector('.editor-textbar').hidden`, { label: 'text bar' }).catch(() => {});
  t.check('selecting words while typing: a text bar shows above them', await t.eval(`(() => { const bar = document.querySelector('.editor-textbar'); if (!bar || bar.hidden) return false; const r = getSelection().getRangeAt(0).getBoundingClientRect(), b = bar.getBoundingClientRect(); return b.bottom <= r.top + 1 || b.top >= r.bottom - 1; })()`));
  await t.click('.editor-textbar [data-action="text-italic"]');
  await t.waitFor(`/<em>numbers<\/em>/.test(document.querySelector('.editor-slide-list li.is-selected .scene h2').innerHTML)`, { label: 'italic' }).catch(() => {});
  t.check('I makes the selected words italic (<em>)', /<em>numbers<\/em>/.test(await modelH2v68()), await modelH2v68());
  await e.undo();
  await e.pick('.editor-stage .scene h2');
  await selectWord('numbers');
  await t.waitFor(`document.querySelector('.editor-textbar') && !document.querySelector('.editor-textbar').hidden`).catch(() => {});
  await t.click('.editor-textbar [data-action="text-link"]');
  await t.waitFor(`document.activeElement?.matches('.editor-textbar-link')`, { label: 'link field' });
  await t.type('javascript:alert(1)');
  await t.key('Enter', 'Enter', 13);
  t.check('a javascript: link is refused', !/<a /.test(await modelH2v68()) && /web addresses/.test(await t.eval(`document.querySelector('.toast')?.textContent || ''`)));
  await t.eval(`(() => { const f = document.querySelector('.editor-textbar-link'); f.select(); return true; })()`);
  await t.type('example.com');
  await t.key('Enter', 'Enter', 13);
  await t.waitFor(`/<a /.test(document.querySelector('.editor-slide-list li.is-selected .scene h2').innerHTML)`, { label: 'link' }).catch(() => {});
  t.check('🔗 puts a link on the words (https added; opens in a new tab)', /<a href="https:\/\/example\.com" target="_blank" rel="noopener">numbers<\/a>/.test(await modelH2v68()), await modelH2v68());
  // the link again: its address changes (never a link in a link); a slide name that does not exist and a port
  const linkAgain = async (address) => {
    await e.pick('.editor-stage .scene h2');
    await selectWord('numbers');
    await t.waitFor(`document.querySelector('.editor-textbar') && !document.querySelector('.editor-textbar').hidden`).catch(() => {});
    await t.click('.editor-textbar [data-action="text-link"]');
    await t.waitFor(`document.activeElement?.matches('.editor-textbar-link')`, { label: 'link field' });
    const before = await t.eval(`document.querySelector('.editor-textbar-link').value`);
    await t.eval(`(() => { document.querySelector('.editor-textbar-link').select(); return true; })()`);
    await t.type(address);
    await t.key('Enter', 'Enter', 13);
    await t.waitFor(`!document.activeElement?.matches('.editor-textbar-link')`, { timeout: 3000 }).catch(() => {});
    return before;
  };
  t.check('🔗 on a link: the field shows its address', (await linkAgain('localhost:3000/x')) === 'https://example.com');
  t.check('… a new address replaces it (no link in a link); an address with a port is fine', /<a href="https:\/\/localhost:3000\/x"[^>]*>numbers<\/a>/.test(await modelH2v68()) && (await modelH2v68()).split('<a ').length === 2, await modelH2v68());
  await linkAgain('#no-such-slide');
  t.check('a link to a slide name that does not exist is refused', /no slide named/.test(await t.eval(`document.querySelector('.toast')?.textContent || ''`)) && /localhost:3000/.test(await modelH2v68()));
  await t.key('Escape', 'Escape', 27);
  for (let i = 0; i < 4 && /<a /.test(await modelH2v68()); i++) await e.undo();
  await e.pick('.editor-stage .scene h2');
  await selectWord('numbers');
  // v69: bigger twice (the words stay selected), a colour of the theme, the text's own colour again, struck through
  await t.waitFor(`document.querySelector('.editor-textbar') && !document.querySelector('.editor-textbar').hidden`).catch(() => {});
  await t.click('.editor-textbar [data-action="text-bigger"]');
  await t.click('.editor-textbar [data-action="text-bigger"]');
  await t.waitFor(`/font-size: 1.44em/.test(document.querySelector('.editor-slide-list li.is-selected .scene h2').innerHTML)`, { label: 'bigger' }).catch(() => {});
  t.check('A+ twice: the words 1.2 × 1.2 bigger (one span, still selected)', /<span class="text-format" style="font-size: 1.44em;">numbers<\/span>/.test(await modelH2v68()) && (await t.eval(`getSelection().toString()`)) === 'numbers', await modelH2v68());
  await t.click('.editor-textbar [data-action="text-colours"]');
  await t.click('.editor-textbar [data-colour="var(--color-teal)"]');
  await t.waitFor(`/color: var\(--color-teal\)/.test(document.querySelector('.editor-slide-list li.is-selected .scene h2').innerHTML)`, { label: 'colour' }).catch(() => {});
  t.check('🎨 Teal: the same span gets the theme colour', /<span class="text-format" style="font-size: 1.44em; color: var\(--color-teal\);">numbers<\/span>/.test(await modelH2v68()), await modelH2v68());
  await t.eval(`new Promise(r => setTimeout(r, 300))`);   // (the colour list closes, the bar settles)
  await t.click('.editor-textbar [data-action="text-smaller"]');
  await t.eval(`new Promise(r => setTimeout(r, 300))`);
  await t.click('.editor-textbar [data-action="text-smaller"]');
  await t.eval(`new Promise(r => setTimeout(r, 300))`);   // (the bar settles above the smaller words)
  await t.click('.editor-textbar [data-colour=""]');
  await t.waitFor(`!/<span/.test(document.querySelector('.editor-slide-list li.is-selected .scene h2').innerHTML)`, { label: 'own again' }).catch(() => {});
  t.check('A− twice and × own colour: no span left (the words still selected)', !/<span/.test(await modelH2v68()) && (await t.eval(`getSelection().toString()`)) === 'numbers', await modelH2v68());
  await selectWord('numbers');
  await t.waitFor(`document.querySelector('.editor-textbar') && !document.querySelector('.editor-textbar').hidden`).catch(() => {});
  await t.click('.editor-textbar [data-action="text-strike"]');
  await t.waitFor(`/<s>numbers<\/s>/.test(document.querySelector('.editor-slide-list li.is-selected .scene h2').innerHTML)`).catch(() => {});
  t.check('S: struck through', /<s>numbers<\/s>/.test(await modelH2v68()), await modelH2v68());
  for (let i = 0; i < 8 && /<s>|<span/.test(await modelH2v68()); i++) await e.undo();
  await e.pick('.editor-stage .scene h2');
  await selectWord('numbers');
  await t.key('i', 'KeyI', 73, 2);
  await t.waitFor(`/<em>numbers<\/em>/.test(document.querySelector('.editor-slide-list li.is-selected .scene h2').innerHTML)`).catch(() => {});
  t.check('Ctrl+I while typing: italic too', /<em>numbers<\/em>/.test(await modelH2v68()));
  await e.undo();
  // v157: Ctrl+U underlines; x² raises the words
  await e.pick('.editor-stage .scene h2');
  await selectWord('numbers');
  await t.key('u', 'KeyU', 85, 2);
  await t.waitFor(`/<u>numbers<\/u>/.test(document.querySelector('.editor-slide-list li.is-selected .scene h2').innerHTML)`).catch(() => {});
  t.check('Ctrl+U while typing: underlined', /<u>numbers<\/u>/.test(await modelH2v68()), await modelH2v68());
  await e.undo();
  await e.pick('.editor-stage .scene h2');
  await selectWord('numbers');
  await t.waitFor(`document.querySelector('.editor-textbar') && !document.querySelector('.editor-textbar').hidden`).catch(() => {});
  await t.click('.editor-textbar [data-action="text-sup"]');
  await t.waitFor(`/<sup>numbers<\/sup>/.test(document.querySelector('.editor-slide-list li.is-selected .scene h2').innerHTML)`).catch(() => {});
  t.check('x²: raised', /<sup>numbers<\/sup>/.test(await modelH2v68()), await modelH2v68());
  await e.undo();

  // ---- docks: unpinned they hide to a tab; the pointer on it opens, leaving closes, 📌 keeps it
  await t.eval(`localStorage.setItem('presentation-editor.layout', '{}'); true`);
  await e.open('numbers');
  t.check('unpinned: both docks hide, the slide gets the room', await t.eval(`(() => { const ed = document.querySelector('.editor'); return ed.classList.contains('left-unpinned') && ed.classList.contains('right-unpinned') && !document.querySelector('.editor-dock.is-open'); })()`));
  const leftTab = await t.centre('.editor-edge-tab.is-left');
  await t.mouse('mouseMoved', leftTab.x, leftTab.y);
  await t.waitFor(`document.querySelector('.editor-dock[data-dock="left"]').classList.contains('is-open')`, { label: 'hover opens' });
  t.check('the pointer on the edge tab opens the slide list', true);
  const middle = await t.centre('.editor-canvas');
  await t.mouse('mouseMoved', middle.x + 200, middle.y);
  await t.waitFor(`!document.querySelector('.editor-dock[data-dock="left"]').classList.contains('is-open')`, { label: 'leaving closes', timeout: 3000 });
  t.check('it closes again when the pointer leaves', true);
  await t.clickAt(await t.centre('.editor-edge-tab.is-right'));   // (resting on it may have opened it already)
  await t.waitFor(`document.querySelector('.editor-dock[data-dock="right"]').classList.contains('is-open')`, { label: 'right opens' });
  await t.eval(`document.querySelector('.editor-panel-body input, .editor-panel-body select').focus(); true`);
  await t.clickAt(middle);
  await t.waitFor(`!document.querySelector('.editor-dock[data-dock="right"]').classList.contains('is-open')`, { label: 'closed after its field' }).catch(() => {});
  t.check('a click on the slide closes the dock also after one of its fields had the keyboard', await t.eval(`!document.querySelector('.editor-dock[data-dock="right"]').classList.contains('is-open')`));
  await t.waitFor(`(() => { const r = document.querySelector('.editor-stage > .logo img').getBoundingClientRect(); const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!top && !!top.closest('.logo'); })()`, { timeout: 8000, label: 'the logo free to click' }).catch(() => {});   // (a dock still sliding away under load)
  await t.click('.editor-stage > .logo img');
  await t.waitFor(`!!document.querySelector('.editor-logo-heading') && document.querySelector('.editor-dock[data-dock="right"]').classList.contains('is-open')`, { label: 'logo settings' }).catch(() => {});
  t.check('a click on the logo with the panel hidden opens the panel; the editor never shifts sideways', await t.eval(`document.querySelector('.editor').scrollLeft === 0 && document.querySelector('.editor-menubar').getBoundingClientRect().left >= 0 && document.querySelector('.editor-dock[data-dock="right"]').classList.contains('is-open')`));
  await t.clickAt(middle);
  await t.waitFor(`document.elementFromPoint(${leftTab.x}, ${leftTab.y})?.closest('.editor-edge-tab') !== null`, { label: 'slid out' });   // its slide-out ends
  await t.clickAt(leftTab);   // (resting on the tab opens it too; a slow machine may have it open before the click)
  await t.waitFor(`document.querySelector('.editor-dock[data-dock="left"]').classList.contains('is-open')`, { label: 'click opens' });
  await t.waitFor(`document.querySelector('.editor-pin[data-action="pin-left"]').getBoundingClientRect().left >= 0 && !document.querySelector('.editor-dock[data-dock="left"]').getAnimations().length`, { label: 'slid in' });
  await t.click('.editor-pin[data-action="pin-left"]');
  await t.waitFor(`!document.querySelector('.editor').classList.contains('left-unpinned')`, { label: 'pinned' });
  t.check('📌 keeps it open, remembered in this browser', await t.eval(`JSON.parse(localStorage.getItem('presentation-editor.layout')).left === true`));
  await t.mouse('mouseMoved', middle.x + 200, middle.y);
  await sleep(800);
  t.check('a pinned dock stays when the pointer leaves', await t.eval(`!document.querySelector('.editor').classList.contains('left-unpinned') && getComputedStyle(document.querySelector('.editor-slides')).visibility !== 'hidden'`));

  // ---- export without the editor
  await t.eval(`sessionStorage.removeItem('test-written'); true`);
  await t.click('.editor-menubar [data-menu-id="file"]');
  await t.waitFor(menuOpen('file'));
  await t.click('.editor-menubar-menu [data-command="export-clean"]');
  await t.waitFor(`JSON.parse(sessionStorage.getItem('test-written') || '[]').length >= 1`, { timeout: 10000, label: 'exported' });
  const file = await t.eval(`JSON.parse(sessionStorage.getItem('test-written')).pop()`);
  t.check('Export without editor writes <name>-presentation.html', /-presentation\.html$/.test(file.name), file.name);
  t.check('the export has no editor code, no editor texts, no markers', !/\/\* EDITOR-ONLY-(START|END)|<!-- EDITOR-ONLY-|editorCanvas|"editor\.|"cmd\./.test(file.text) && /data-no-editor/.test(file.text));
  t.check('the export is much smaller than the file with the editor', file.text.length < statSync(PAGE).size * 0.85, file.text.length + ' vs ' + statSync(PAGE).size);
  await t.eval(`sessionStorage.removeItem('test-written'); true`);
  await t.click('.editor-menubar [data-menu-id="file"]');
  await t.waitFor(menuOpen('file'));
  await t.click('.editor-menubar-menu [data-command="export-slides-only"]');
  await t.waitFor(`JSON.parse(sessionStorage.getItem('test-written') || '[]').length >= 1`, { timeout: 10000, label: 'slides only' });
  const slidesOnly = await t.eval(`JSON.parse(sessionStorage.getItem('test-written')).pop()`);
  t.check('Export slides only: <name>-slides.html without the editor and the presenter view', /-slides\.html$/.test(slidesOnly.name) && !/\/\* (EDITOR|PRESENTER)-ONLY-(START|END)|<!-- (EDITOR|PRESENTER)-ONLY-|editorCanvas|const presenterView/.test(slidesOnly.text) && /data-no-presenter/.test(slidesOnly.text), slidesOnly.name);
  const exported = join(tmpdir(), `deck-test-export-${process.pid}.html`);
  writeFileSync(exported, file.text);
  await t.send('Page.navigate', { url: 'about:blank' });
  await t.waitFor(`location.href === 'about:blank'`);
  await t.send('Page.navigate', { url: pathToFileURL(exported).href + '#title' });
  await t.waitFor(`document.readyState === 'complete' && !!document.querySelector('#stage .scene.is-active')`, { timeout: 15000, label: 'the export opens' });
  const firstName = await t.eval(`document.querySelector('#stage .scene.is-active').dataset.name`);
  for (let i = 0; i < 4; i++) { await t.key('ArrowRight', 'ArrowRight', 39); await sleep(250); }
  t.check('the export presents (Next goes on)', (await t.eval(`document.querySelector('#stage .scene.is-active').dataset.name`)) !== firstName);
  await t.send('Page.navigate', { url: pathToFileURL(exported).href + '?templates=1#title' });
  await t.waitFor(`document.readyState === 'complete' && !!document.querySelector('#stage .scene.is-active')`, { timeout: 15000, label: 'the export with ?templates=1' }).catch(() => {});
  t.check('the export opens with ?templates=1 too (no templates in it; the button is hidden)', await t.eval(`!!document.querySelector('#stage .scene.is-active') && document.getElementById('btnShowTemplates').hidden`));
  await t.key('e', 'KeyE', 69);
  await sleep(300);
  t.check('the export has no editor: E opens nothing, no Edit button', await t.eval(`!document.querySelector('.editor') && (!document.querySelector('#btnEditor') || getComputedStyle(document.querySelector('#btnEditor')).display === 'none')`));
}
