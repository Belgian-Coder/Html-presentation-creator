// Find an action (Ctrl+K, /, ⌕), the bar above the selection, number labels you drag, the hint on an empty slide.
export const timeoutMs = 300000;   // (38 slides: more to load and walk through)
export const covers = ['js/17-', 'js/18-', 'js/19-', 'js/20-', 'css/13-', 'interface-texts.json'];

export default async function (t) {
  const e = t.editor;
  await e.open('numbers');
  // Ctrl+K: find and run an action with the keyboard
  await e.blur();
  await t.key('k', 'KeyK', 75, 2);
  await t.waitFor(`!!document.querySelector('.editor-palette') && document.activeElement === document.querySelector('.palette-input')`, { label: 'Ctrl+K opens it' });
  t.check('Ctrl+K opens "find an action" with the typing field ready', true);
  await t.type('ins sta');
  await t.waitFor(`/star/i.test(document.querySelector('.palette-row.is-current')?.textContent || '')`, { label: 'ins sta finds Insert a star' });
  t.check('a few letters find it ("ins sta" → Insert a star)', true);
  const shapes = await t.eval(`document.querySelectorAll('.editor-stage .scene .shape[data-shape="star"]').length`);
  await t.key('Enter', 'Enter', 13);
  await t.waitFor(`document.querySelectorAll('.editor-stage .scene .shape[data-shape="star"]').length === ${shapes + 1} && !document.querySelector('.editor-palette')`, { label: 'Enter runs it' });
  t.check('Enter does it and closes the window', true);
  // greyed when it needs a selection; the reason shows
  await t.key('Escape', 'Escape', 27);
  await t.waitFor(`!document.querySelector('.editor-stage .is-editor-selected')`).catch(() => {});
  await e.blur();
  await t.key('/', 'Slash', 191);
  await t.waitFor(`!!document.querySelector('.editor-palette')`, { label: '/ opens it too' });
  await t.type('duplicate');
  await t.waitFor(`!!document.querySelector('.palette-row')`);
  t.check('without a selection, Duplicate is greyed with the reason', await t.eval(`[...document.querySelectorAll('.palette-row')].some(r => /^Duplicate/.test(r.textContent) && r.classList.contains('is-disabled') && /select an element/.test(r.textContent))`));
  t.check('rows show their key', await t.eval(`[...document.querySelectorAll('.palette-row')].some(r => r.querySelector('kbd')?.textContent === 'Ctrl+D')`));
  await t.key('Escape', 'Escape', 27);
  await t.waitFor(`!document.querySelector('.editor-palette')`, { label: 'Esc closes it' });
  t.check('Esc closes it (and nothing else changes)', await t.eval(`!!document.querySelector('.editor')`));
  // Go to a slide
  await t.click('.editor-bar [data-action="command-palette"]');
  await t.waitFor(`!!document.querySelector('.editor-palette')`, { label: 'the ⌕ button opens it' });
  await t.type('go 5');
  await t.waitFor(`/^Go to 5\\./.test(document.querySelector('.palette-row.is-current')?.textContent || '')`, { label: 'go 5' });
  await t.key('Enter', 'Enter', 13);
  await t.waitFor(`document.querySelector('.editor-slide-list li.is-selected') === document.querySelectorAll('.editor-slide-list > li')[4]`, { label: 'slide 5 opened' });
  t.check('"go 5" opens slide 5', true);
  // the bar above the selection
  await e.goSlide('numbers');
  await e.insert('rect');
  await t.waitFor(`!!document.querySelector('.editor-quickbar:not([hidden])')`, { label: 'the bar shows' });
  t.check('a bar shows next to the selected element (above or below it, not over it)', await t.eval(`(() => { const bar = document.querySelector('.editor-quickbar').getBoundingClientRect(), sel = document.querySelector('.editor-selection').getBoundingClientRect(); return (bar.bottom <= sel.top || bar.top >= sel.bottom) && bar.left < sel.right && bar.right > sel.left; })()`));
  const count = await t.eval(`document.querySelectorAll('.editor-stage .scene > .shape').length`);
  await t.click('.editor-quickbar [data-action="duplicate"]');
  await t.waitFor(`document.querySelectorAll('.editor-stage .scene > .shape').length === ${count + 1}`, { label: 'Duplicate from the bar' });
  t.check('its Duplicate works, and the click does not select the slide behind it', await t.eval(`!!document.querySelector('.editor-stage .is-editor-selected')`));
  const handle = await t.centre('.editor-selection .editor-handle[data-dir="e"]');
  let hiddenWhileDragging = false;
  await t.drag(handle, 40, 0, { during: async () => { hiddenWhileDragging = await t.eval(`document.querySelector('.editor-quickbar').hidden`); } });
  t.check('it hides while you drag', hiddenWhileDragging);
  await t.waitFor(`!document.querySelector('.editor-quickbar').hidden`, { label: 'back after the drag' });
  // number labels: drag the name of X
  await e.tab('element');
  const xLabel = await t.centre('.editor-panel-body [data-element-field="--x"]');
  const label = await t.eval(`(() => { const s = document.querySelector('.editor-panel-body [data-element-field="--x"]').parentElement.querySelector(':scope > span'); s.scrollIntoView({ block: 'center' }); const r = s.getBoundingClientRect(); return { x: r.x + 6, y: r.y + r.height / 2 }; })()`);
  const x0 = await e.value('--x');
  await t.drag(label, 40, 0);
  await t.waitFor(`parseFloat(document.querySelector('.editor-stage .is-editor-selected').style.getPropertyValue('--x')) === ${x0 + 20}`, { label: 'X follows the label drag' });
  t.check('dragging the label "X" 40 px right adds 20', true);
  await e.undo();
  await t.waitFor(`parseFloat(document.querySelector('.editor-stage .is-editor-selected').style.getPropertyValue('--x')) === ${x0}`, { label: 'one undo step' });
  t.check('one Undo takes the whole drag back', true);
  // an empty slide shows how to start
  await t.click('.editor [data-action="add-slide"]');
  await t.waitFor(`!!document.querySelector('.editor-dialog:not([hidden]) [data-template=""]')`, { label: 'layouts' });
  await t.click('.editor-dialog [data-template=""]');
  await t.waitFor(`!!document.querySelector('.editor-stage .scene .content h2')`, { label: 'the new slide' });
  t.check('a new slide (a label and a heading to type over) shows no hint', !(await t.eval(`!!document.querySelector('.editor-empty-hint:not([hidden])')`)));
  for (const selector of ['.editor-stage .scene .content .eyebrow', '.editor-stage .scene .content h2']) {   // empty it
    await e.pick(selector);
    await e.blur();
    await t.key('Delete', 'Delete', 46);
    await t.waitFor(`!document.querySelector('${selector}')`);
  }
  await t.waitFor(`!!document.querySelector('.editor-empty-hint:not([hidden])')`, { label: 'empty slide hint' });
  t.check('an empty slide says how to start', true);
  await e.insert('textbox');
  await t.waitFor(`document.querySelector('.editor-empty-hint').hidden`, { label: 'the hint goes' });
  t.check('the hint goes once something is on it', true);
  // review fixes: Esc gives the keyboard back to the text you typed in (Backspace edits it, nothing is deleted);
  // Bold from the window works on the selected words; the bar hides for several elements; Ctrl+S still saves
  await e.open('numbers');
  await t.click('.editor-stage .scene h2');
  await t.waitFor(`document.activeElement?.matches('.editor-stage .scene h2')`, { label: 'typing in the heading' });
  await t.eval(`(() => { const h = document.querySelector('.editor-stage .scene h2'), r = document.createRange(); r.setStart(h.firstChild, 0); r.setEnd(h.firstChild, 3); const s = getSelection(); s.removeAllRanges(); s.addRange(r); return true; })()`);
  await t.key('k', 'KeyK', 75, 2);
  await t.waitFor(`!!document.querySelector('.editor-palette')`);
  await t.type('bold');
  await t.waitFor(`/^Bold/.test(document.querySelector('.palette-row.is-current')?.textContent || '')`);
  await t.key('Enter', 'Enter', 13);
  await t.waitFor(`!!document.querySelector('.editor-stage .scene h2 b')`, { label: 'Bold from the window' });
  t.check('Bold from the window works on the selected words', (await t.eval(`document.querySelector('.editor-stage .scene h2 b').textContent`)) === 'The');
  await t.key('k', 'KeyK', 75, 2);
  await t.waitFor(`!!document.querySelector('.editor-palette')`);
  await t.key('Escape', 'Escape', 27);
  await t.waitFor(`!document.querySelector('.editor-palette')`);
  t.check('after Esc the keyboard is back in the heading', await t.eval(`document.activeElement?.matches('.editor-stage .scene h2')`));
  const headings = await t.eval(`document.querySelectorAll('.editor-stage .scene h2').length`);
  await t.key('Backspace', 'Backspace', 8);
  t.check('Backspace then edits the text (the heading stays)', (await t.eval(`document.querySelectorAll('.editor-stage .scene h2').length`)) === headings);
  await e.blur();
  await e.insert('rect');
  await e.pick('.editor-stage .scene h2', { shift: true });
  await t.waitFor(`/2/.test(document.querySelector('.editor-quickbar:not([hidden]) .quickbar-count')?.textContent || '')`, { label: 'a bar for the group' });
  t.check('several selected: the bar is for all of them (count, Align, Appear)', await t.eval(`!!document.querySelector('.editor-quickbar [data-action="bar-align"]') && !!document.querySelector('.editor-quickbar [data-action="bar-appear"]')`));
  await e.blur();
  await t.key('k', 'KeyK', 75, 2);
  await t.waitFor(`!!document.querySelector('.editor-palette')`);
  await t.eval(`window.__beforeSave = 1; sessionStorage.removeItem('test-written'); true`);
  await t.key('s', 'KeyS', 83, 2);
  await t.waitFor(`JSON.parse(sessionStorage.getItem('test-written') || '[]').length >= 1`, { timeout: 10000, label: 'Ctrl+S saves with the window open' });
  t.check('Ctrl+S with the window open saves the file', true);
  await t.waitFor(`window.__beforeSave === undefined && document.readyState === 'complete'`, { timeout: 10000, label: 'the page opened again after Save' });
  // an action from the window while the slide plays never saves the playing copy (its numbers at 0)
  await e.open('numbers');
  await e.tab('animations');
  await t.click('.editor-panel-body [data-action="play-slide"]');
  await t.waitFor(`document.querySelector('.editor-stage').classList.contains('is-playing-preview')`, { label: 'playing' });
  await t.key('k', 'KeyK', 75, 2);
  await t.waitFor(`!!document.querySelector('.editor-palette')`);
  await t.type('ins sta');
  await t.waitFor(`/star/i.test(document.querySelector('.palette-row.is-current')?.textContent || '')`);
  await t.key('Enter', 'Enter', 13);
  await t.waitFor(`!!document.querySelector('.editor-stage .scene .shape[data-shape="star"]')`, { label: 'inserted' });
  t.check('an action from the window while playing keeps the slide as it is (42 stays 42)', /data-to="42"[^>]*>42</.test(await e.modelHtml()), (await e.modelHtml()).match(/data-to="42"[^>]*>[^<]*/)?.[0]);

  // v161: Ctrl+K finds settings too, in everyday words; a choice of a list is applied at once and the field glows
  await e.insert('image');
  await e.blur();
  await t.key('k', 'KeyK', 75, 2);
  await t.waitFor(`!!document.querySelector('.editor-palette')`, { label: 'opened for settings' });
  await t.type('transparent');
  await t.waitFor(`[...document.querySelectorAll('.palette-row')].some(r => /^Opacity/.test(r.textContent))`, { label: 'transparent → Opacity' }).catch(() => {});
  t.check('Ctrl+K "transparent" finds the Opacity setting and says where it is', await t.eval(`[...document.querySelectorAll('.palette-row')].some(r => /^Opacity/.test(r.querySelector('.palette-label')?.textContent || '') && /›/.test(r.querySelector('.palette-where')?.textContent || ''))`));
  await t.key('Escape', 'Escape', 27);
  await t.waitFor(`!document.querySelector('.editor-palette')`).catch(() => {});
  await e.blur();
  await t.key('k', 'KeyK', 75, 2);
  await t.waitFor(`!!document.querySelector('.editor-palette')`).catch(() => {});
  await t.type('duotone teal');
  await t.waitFor(`/Duotone, teal/.test(document.querySelector('.palette-row.is-current')?.textContent || '')`, { label: 'duotone teal' }).catch(() => {});
  await t.key('Enter', 'Enter', 13);
  await t.waitFor(`!!document.querySelector('.editor-stage img[style*="duotone-teal"]')`, { label: 'applied' }).catch(() => {});
  t.check('…a choice found that way is applied at once, and its field glows in the open tab', await t.eval(`!!document.querySelector('.editor-stage img[style*="duotone-teal"]') && !!document.querySelector('.editor-panel-body .is-found [data-tool-field="imageLook"]')`));
  for (let i = 0; i < 2; i++) await e.undo();

  // v161: a heading selected: Ctrl+K "shadow" finds its Shadow setting
  await e.goSlide('numbers');
  await e.pick('.editor-stage .scene h2');
  await e.blur();
  await t.key('k', 'KeyK', 75, 2);
  await t.waitFor(`!!document.querySelector('.editor-palette')`).catch(() => {});
  await t.type('shadow');
  await t.waitFor(`[...document.querySelectorAll('.palette-row .palette-label')].some(l => /^Shadow/.test(l.textContent))`, { label: 'shadow' }).catch(() => {});
  t.check('Ctrl+K "shadow" with a heading selected finds Shadow', await t.eval(`[...document.querySelectorAll('.palette-row .palette-label')].some(l => /^Shadow/.test(l.textContent))`));
  await t.key('Escape', 'Escape', 27);
  await t.waitFor(`!document.querySelector('.editor-palette')`).catch(() => {});

  // v161: the path at the top of the Element tab in plain words; a part selects that one
  await e.tab('element');
  t.check('The element path reads in plain words (Slide › … › Heading), not code', await t.eval(`(() => { const p = document.querySelector('.editor-panel-body .editor-path'); return !!p && /^Slide › /.test(p.textContent) && /Heading$/.test(p.textContent) && !/h2\\.|div\\./.test(p.textContent); })()`));
  const before161 = await t.eval(`document.querySelector('.editor-stage .is-editor-selected').tagName`);
  await t.eval(`document.querySelector('.editor-panel-body .editor-path button[data-action="select-part"]')?.click(); true`);
  await t.waitFor(`document.querySelector('.editor-stage .is-editor-selected')?.tagName !== ${JSON.stringify(before161)}`, { label: 'path part' }).catch(() => {});
  t.check('…a part of the path selects that element', await t.eval(`(() => { const el = document.querySelector('.editor-stage .is-editor-selected'); return !!el && el.tagName !== ${JSON.stringify(before161)} && !!el.querySelector('h2'); })()`));

  // v161: sections fold with a click on their heading (remembered); the rare ones start folded
  await e.pick('.editor-stage .scene h2');
  await e.tab('element');
  t.check('Panel sections: Insert starts folded, Style starts open', await t.eval(`(() => { const head = key => document.querySelector('.editor-panel-body .editor-section-head[data-section="' + key + '"]'); return head('editor.sectionInsert')?.getAttribute('aria-expanded') === 'false' && head('editor.sectionInsert').nextElementSibling.hidden && head('editor.sectionStyle')?.getAttribute('aria-expanded') === 'true'; })()`));
  await t.click('.editor-panel-body .editor-section-head[data-section="editor.sectionStyle"]');
  await e.tab('slide');
  await e.tab('element');
  t.check('…a click folds Style, and it stays folded when the panel is drawn again', await t.eval(`(() => { const h = document.querySelector('.editor-panel-body .editor-section-head[data-section="editor.sectionStyle"]'); return h?.getAttribute('aria-expanded') === 'false' && h.nextElementSibling.hidden; })()`));
  await e.blur();
  await t.key('k', 'KeyK', 75, 2);
  await t.waitFor(`!!document.querySelector('.editor-palette')`).catch(() => {});
  await t.type('opacity');
  await t.waitFor(`/^Opacity/.test(document.querySelector('.palette-row.is-current .palette-label')?.textContent || '')`, { label: 'opacity' }).catch(() => {});
  await t.key('Enter', 'Enter', 13);
  await t.waitFor(`!!document.querySelector('.editor-panel-body .is-found')`, { label: 'found' }).catch(() => {});
  t.check('…Ctrl+K opens a folded section to show the setting', await t.eval(`(() => { const f = document.querySelector('.editor-panel-body .is-found'); return !!f && !f.closest('.editor-section[hidden]'); })()`));
  await t.eval(`localStorage.removeItem('presentation-editor.folded'); true`);

  // v161: a picture's Style has no text choices
  await e.insert('image');
  await e.tab('element');
  t.check('An image shows no text size, font or text section', await t.eval(`!document.querySelector('.editor-panel-body [data-tool-field="fontSize"], .editor-panel-body [data-tool-field="fontFamily"], .editor-panel-body [data-ui="editor.sectionText"]') && !!document.querySelector('.editor-panel-body [data-tool-field="shadow"]')`));
  await e.undo();

  // v161: Spread out and Same size in the Arrange menu and Ctrl+K; greyed (with how) without a Shift+click selection
  t.check('Arrange menu lists Spread out evenly and Same width', await t.eval(`(() => { document.querySelector('.editor-menubar [data-menu-id="arrange"]').click(); const text = document.querySelector('.editor-menu:not([hidden])')?.textContent || ''; document.querySelector('.editor-menubar [data-menu-id="arrange"]').click(); return /Spread out evenly, across/.test(text) && /Same width/.test(text); })()`));

  // v161: a picture dropped from the computer onto the slide becomes an image block
  const images161 = await t.eval(`document.querySelectorAll('.editor-stage .scene img').length`);
  await t.eval(`(() => { const dt = new DataTransfer(); dt.items.add(new File([new Uint8Array([137, 80, 78, 71])], 'photo.png', { type: 'image/png' })); const canvas = document.querySelector('.editor-canvas'); canvas.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true })); canvas.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true })); return true; })()`);
  await t.waitFor(`document.querySelectorAll('.editor-stage .scene img').length > ${images161}`, { label: 'dropped' }).catch(() => {});
  t.check('A picture dropped on the slide becomes an image block', await t.eval(`document.querySelectorAll('.editor-stage .scene img').length > ${images161} && !document.querySelector('.editor-canvas.is-dropping')`));
  await e.undo();

  // v161: content that runs off the slide's bottom: a warning in the status bar (none on the real slides)
  const noisy161 = [];
  for (const name of await t.eval(`[...document.querySelectorAll('.editor-slide-list > li .scene')].map(s => s.dataset.name)`)) {
    await e.goSlide(name);
    await t.eval(`new Promise(r => setTimeout(r, 120))`);
    if (await t.eval(`!document.querySelector('.status-overflow').hidden`)) noisy161.push(name);
  }
  t.check('No overflow warning on any of the real slides', noisy161.length === 0, noisy161.join(', '));
  await e.goSlide('mindset');
  await e.pick('.editor-stage .scene h2');
  await t.eval(`(() => { const extra = document.createElement('div'); extra.className = 'test-tall'; extra.style.height = '1400px'; extra.style.flex = 'none'; document.querySelector('.editor-stage .scene > .content').appendChild(extra); return true; })()`);
  await e.pick('.editor-stage .scene .test-tall');
  await t.waitFor(`!document.querySelector('.status-overflow').hidden`, { label: 'overflow' }).catch(() => {});
  t.check('…a slide whose content runs off the bottom shows the warning', await t.eval(`!document.querySelector('.status-overflow').hidden && /runs off/.test(document.querySelector('.status-overflow').textContent)`));

  // v162: + Insert is a grid in groups (Text, Pictures and media, Data and layout, Shapes); a shape tile shows the shape; ← → move
  await t.eval(`document.querySelector('.test-tall')?.remove(); true`);
  await e.goSlide('numbers');
  await t.click('.editor-bar [data-action="insert-menu"]');
  await t.waitFor(`!!document.querySelector('.editor-insert-menu .insert-grid')`, { label: 'insert grid' }).catch(() => {});
  t.check('+ Insert: four groups of tiles, every kind there once, shapes drawn', await t.eval(`(() => { const m = document.querySelector('.editor-insert-menu'); const heads = [...m.querySelectorAll('.editor-menu-heading')].map(h => h.textContent); const kinds = [...m.querySelectorAll('[data-kind]')].map(b => b.dataset.kind); return ['Text', 'Pictures and media', 'Data and layout', 'Shapes'].every(h => heads.includes(h)) && kinds.length === new Set(kinds).size && kinds.includes('star') && !!m.querySelector('[data-kind="star"] svg') && kinds.includes('chart') && m.getBoundingClientRect().right <= innerWidth; })()`));
  const focus162 = await t.eval(`document.activeElement?.dataset.kind`);
  await t.key('ArrowRight', 'ArrowRight', 39);
  t.check('…→ moves to the next tile (the list stays open)', await t.eval(`!!document.querySelector('.editor-insert-menu') && document.activeElement?.dataset.kind !== ${JSON.stringify(focus162)}`));
  await t.key('Escape', 'Escape', 27);
  await t.waitFor(`!document.querySelector('.editor-insert-menu')`).catch(() => {});

  // v162: animation names read as words (Slide from left), the value stays the same
  await e.pick('.editor-stage .scene h2');
  await e.tab('element');
  t.check('Animation list: preset names in words, not ids', await t.eval(`(() => { const options = [...document.querySelectorAll('.editor-panel-body [data-element-field="animation"] option[value^="preset:"]')]; return options.length > 3 && options.every(o => !/-/.test(o.textContent) && /^[A-Z]/.test(o.textContent)); })()`));

  // v162: the welcome card (first time; Help › Show the welcome tips brings it back); Got it hides it for good
  await e.blur();
  await t.key('k', 'KeyK', 75, 2);
  await t.waitFor(`!!document.querySelector('.editor-palette')`).catch(() => {});
  await t.type('welcome');
  await t.waitFor(`/welcome/i.test(document.querySelector('.palette-row.is-current')?.textContent || '')`, { label: 'welcome' }).catch(() => {});
  await t.key('Enter', 'Enter', 13);
  await t.waitFor(`!!document.querySelector('.editor-welcome')`, { label: 'welcome card' }).catch(() => {});
  t.check('Help › Show the welcome tips: the card with the five things to know', await t.eval(`document.querySelectorAll('.editor-welcome li').length === 5 && /Ctrl\\+K/.test(document.querySelector('.editor-welcome').textContent)`));
  await e.pick('.editor-stage .scene .stat');
  t.check('…with an element selected it folds to its title (no handles covered); a click opens it', await t.eval(`(() => { const card = document.querySelector('.editor-welcome'); const small = card.classList.contains('is-small'); card.click(); return small && !card.classList.contains('is-small'); })()`));
  await t.click('.editor-welcome-ok');
  t.check('…Got it hides it and remembers that', await t.eval(`!document.querySelector('.editor-welcome') && localStorage.getItem('presentation-editor.welcomed') === '1'`));

  // v163: the element's name and editor note sit in More, at the end, folded at first
  await e.pick('.editor-stage .scene h2');
  await e.tab('element');
  t.check('Element tab: Name and Note for the editor in More, last and folded', await t.eval(`(() => { const heads = [...document.querySelectorAll('.editor-panel-body .editor-section-head')]; const more = heads[heads.length - 1]; return more?.dataset.section === 'editor.sectionMore' && more.getAttribute('aria-expanded') === 'false' && !!more.nextElementSibling.querySelector('[data-element-field="authorNote"]'); })()`));

  // v163: a new user's editor starts with the timeline closed
  await t.open('numbers');
  await t.eval(`localStorage.removeItem('presentation-editor.timeline'); true`);
  await t.key('e', 'KeyE', 69);
  await t.waitFor(`!!document.querySelector('.editor .editor-stage .scene')`, { label: 'editor open' }).catch(() => {});
  t.check('A new user: the timeline starts closed', await t.eval(`!document.querySelector('.editor').classList.contains('timeline-open')`));

  // v163: File › Export as PDF (the work as it is now, in a tab that prints itself)
  t.check('File menu lists Export as PDF', await t.eval(`(() => { const b = document.querySelector('.editor-menubar [data-menu-id="file"]'); b.click(); const text = document.querySelector('.editor-menu:not([hidden])')?.textContent || ''; b.click(); return /save as PDF/i.test(text) && /handout/i.test(text); })()`));

  // v164: nothing selected: the Slide tab starts with how to begin; Ctrl+H opens Find and replace; + Insert tiles show short names
  await e.open('numbers');
  await e.tab('slide');
  t.check('Nothing selected: the Slide tab starts with how to begin', await t.eval(`/Click anything on the slide/.test(document.querySelector('.editor-panel-body > .editor-start-hint')?.textContent || '')`));
  await e.blur();
  await t.key('h', 'KeyH', 72, 2);
  await t.waitFor(`document.activeElement?.matches('[data-find-field="find"]')`, { label: 'find field' }).catch(() => {});
  t.check('Ctrl+H: the All slides tab with the cursor in Find', await t.eval(`document.activeElement?.matches('[data-find-field="find"]') && document.querySelector('.editor-tabs .is-selected')?.dataset.tab === 'deck'`));
  await e.blur();
  await t.click('.editor-bar [data-action="insert-menu"]');
  await t.waitFor(`!!document.querySelector('.editor-insert-menu .insert-tile')`).catch(() => {});
  t.check('+ Insert tiles: short names (full name on hover)', await t.eval(`(() => { const tiles = [...document.querySelectorAll('.editor-insert-menu .insert-tile')]; const eyebrow = tiles.find(b => b.dataset.kind === 'eyebrow'); return tiles.every(b => !b.querySelector('span:last-child').textContent.includes('(')) && /Small label/.test(eyebrow.textContent) && /title/.test(eyebrow.title); })()`));
  await t.key('Escape', 'Escape', 27);

  // v164: a click on "content runs off the slide" selects the block that does it
  await e.goSlide('numbers');
  await t.eval(`(() => { const extra = document.createElement('p'); extra.className = 'test-tall2'; extra.style.cssText = 'height: 1400px; flex: none'; extra.textContent = 'tall'; document.querySelector('.editor-stage .scene > .content').appendChild(extra); return true; })()`);
  await e.pick('.editor-stage .scene .test-tall2');
  await e.pick('.editor-stage .scene h2');
  await t.waitFor(`!document.querySelector('.status-overflow').hidden`, { label: 'warning' }).catch(() => {});
  await t.eval(`document.querySelector('.status-overflow').click(); true`);
  t.check('…clicking the warning selects the block that runs off', await t.eval(`!!document.querySelector('.editor-stage .is-editor-selected.test-tall2')`));

  // v165: a menu taller than the window scrolls, and every item can be reached (the user could not reach the last ones)
  await t.eval(`(() => { const b = document.querySelector('.editor-menubar [data-menu-id="insert"]'); b.click(); return true; })()`);
  await t.waitFor(`!!document.querySelector('.editor-menubar-menu')`).catch(() => {});
  t.check('The Insert menu fits on the screen under the menu bar, and scrolls when it is taller', await t.eval(`(() => { const m = document.querySelector('.editor-menubar-menu'); const r = m.getBoundingClientRect(); const last = [...m.querySelectorAll('button')].pop(); last.scrollIntoView({ block: 'nearest' }); const l = last.getBoundingClientRect(); const bar = document.querySelector('.editor-menubar').getBoundingClientRect(); return r.top >= bar.bottom - 1 && r.bottom <= innerHeight && l.bottom <= innerHeight && l.top >= r.top; })()`));
  await t.eval(`document.querySelector('.editor-menubar [data-menu-id="insert"]').click(); true`);

  // v165: Style: More text options folded (open when used); a shape without words shows no text choices
  await e.pick('.editor-stage .scene h2');
  await e.tab('element');
  t.check('Style: size, colour and align first; More text options folded', await t.eval(`(() => { const d = document.querySelector('.editor-panel-body details.editor-more-text'); return !!d && !d.open && !!d.querySelector('[data-tool-field="fontFamily"]') && !!document.querySelector('.editor-panel-body [data-tool-field="fontSize"]'); })()`));
  await e.insert('star');
  await e.tab('element');
  t.check('…a star (no words): no text size, no More text options, but its colour', await t.eval(`!document.querySelector('.editor-panel-body [data-tool-field="fontSize"], .editor-panel-body details.editor-more-text') && !!document.querySelector('.editor-panel-body [data-tool-field="color"]')`));
  await e.undo();

  // v166: "As it is" says what that is now (a heading: its size in px, its weight)
  await e.pick('.editor-stage .scene h2');
  await e.tab('element');
  t.check('"As it is" shows the current value (size in px, weight)', await t.eval(`(() => { const size = document.querySelector('.editor-panel-body [data-tool-field="fontSize"] option[value=""]')?.textContent || ''; const weight = document.querySelector('.editor-panel-body [data-tool-field="fontWeight"] option[value=""]')?.textContent || ''; return /\\(\\d+ px\\)$/.test(size) && /^Keep current \\((Bold|Normal)\\)$/.test(weight); })()`));

  // v166: All slides › Theme gallery: a tile per theme; a click uses it (the page's colours change, the tile is marked)
  await e.tab('deck');
  const themes166 = await t.eval(`[...document.querySelectorAll('.editor-panel-body .theme-tile')].map(b => b.dataset.pickTheme)`);
  if (themes166.length > 1) {
    const other = await t.eval(`[...document.querySelectorAll('.editor-panel-body .theme-tile')].find(b => b.getAttribute('aria-pressed') !== 'true')?.dataset.pickTheme`);
    await t.eval(`document.querySelector('.editor-panel-body .theme-tile[data-pick-theme="${other}"]').click(); true`);
    t.check('Theme gallery: a click uses that theme (marked, and the editor has a change to save)', await t.eval(`document.querySelector('.editor-panel-body .theme-tile[data-pick-theme="${other}"]')?.getAttribute('aria-pressed') === 'true' && /unsaved|not saved/i.test(document.querySelector('.editor-status').textContent)`), JSON.stringify(themes166));
    // (the theme chosen in this browser goes again: "<deck id>.theme", see CONFIG.storageKeys)
    await t.eval(`Object.keys(localStorage).filter(key => /\.(theme|colors)$/.test(key)).forEach(key => localStorage.removeItem(key)); true`);
  } else t.check('Theme gallery: a tile per theme', themes166.length === 1, JSON.stringify(themes166));

  // v167: right-click › Add a comment: the Comment field gets the cursor; the slide gets a 💬 badge once it has one
  await e.goSlide('numbers');
  await e.pick('.editor-stage .scene h2');
  await t.eval(`(() => { const h = document.querySelector('.editor-stage .scene h2').getBoundingClientRect(); document.querySelector('.editor-stage .scene h2').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: h.left + 10, clientY: h.top + 10 })); return true; })()`);
  await t.waitFor(`!!document.querySelector('.editor-menu:not([hidden]) [data-menu="comment"], .editor-menu:not([hidden]) [data-action="comment"]')`, { label: 'comment item' }).catch(() => {});
  await t.eval(`document.querySelector('.editor-menu:not([hidden]) [data-menu="comment"], .editor-menu:not([hidden]) [data-action="comment"]')?.click(); true`);
  await t.waitFor(`document.activeElement?.matches('[data-element-field="authorNote"]')`, { label: 'comment field' }).catch(() => {});
  t.check('Right-click › Add a comment: the cursor is in the Comment field (More opened)', await t.eval(`document.activeElement?.matches('[data-element-field="authorNote"]') && !document.activeElement.closest('.editor-section[hidden]')`));
  await e.panelSet('[data-element-field="authorNote"]', 'Check this title');
  await t.waitFor(`!!document.querySelector('.editor-slide-list li.is-selected .editor-badge[data-ui="editor.badgeComments"]')`, { label: 'badge' }).catch(() => {});
  t.check('…the slide list shows a 💬 badge on that slide', await t.eval(`!!document.querySelector('.editor-slide-list li.is-selected .editor-badge[data-ui="editor.badgeComments"]')`));
  await e.undo();

  // v167: the transition tiles differ when still (paused halfway)
  await e.tab('slide');
  t.check('Transition tiles: paused halfway when still (they differ at a glance)', await t.eval(`(() => { const tiles = [...document.querySelectorAll('.editor-panel-body .transition-tile')]; const looks = new Set(tiles.map(b => { const n = getComputedStyle(b.querySelector('.tile-new')); return n.transform + '|' + n.opacity + '|' + n.clipPath; })); return tiles.length > 10 && getComputedStyle(tiles[0].querySelector('.tile-new')).animationPlayState === 'paused' && looks.size >= 6; })()`));

  // v169: Ctrl+K everyday words for actions; Accent on a whole heading; Undo says what it undid
  await e.goSlide('numbers');
  await e.blur();
  await t.key('k', 'KeyK', 75, 2);
  await t.waitFor(`!!document.querySelector('.editor-palette')`).catch(() => {});
  await t.type('new slide');
  await t.waitFor(`/slide/i.test(document.querySelector('.palette-row.is-current')?.textContent || '')`).catch(() => {});
  t.check('Ctrl+K "new slide" finds Add a slide first', await t.eval(`/^Add a slide/.test(document.querySelector('.palette-row.is-current .palette-label')?.textContent || '')`), await t.eval(`document.querySelector('.palette-row.is-current')?.textContent`));
  await t.key('Escape', 'Escape', 27);
  await e.pick('.editor-stage .scene h2');
  await e.blur();
  await t.eval(`window.getSelection().removeAllRanges(); true`);
  await e.tab('element');
  await t.eval(`document.querySelector('.editor-panel-body [data-action="accent"]')?.click(); true`);
  t.check('Accent with no words selected: the whole heading in the accent colour', await t.eval(`document.querySelector('.editor-stage .scene h2').style.color === 'var(--color-accent)'`));
  await e.undo();
  t.check('…Undo says what it undid', await t.eval(`/^Undone: /.test(document.querySelector('.toast')?.textContent || '')`), await t.eval(`document.querySelector('.toast')?.textContent || ''`));

  // v169 (review): pasted bullet lines with a point selected join that list
  await e.insert('list');
  await e.pick('.editor-stage .scene .big-list li:last-child');
  const points169 = await t.eval(`document.querySelector('.editor-stage .is-editor-selected').parentElement.children.length`);
  await t.eval(`(() => { const data = new DataTransfer(); data.setData('text/plain', '- Aaa\\n- Bbb'); document.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true })); return true; })()`);
  t.check('Pasted bullet lines with a point selected join that list', await t.eval(`(() => { const lists = [...document.querySelectorAll('.editor-stage .scene .big-list')]; return lists.some(list => list.children.length === ${points169} + 2 && /Bbb/.test(list.textContent)); })()`));

  // v170: a picture in the layout shows its corners; dragging one places it freely and sizes it (one undo step)
  await e.goSlide('numbers');
  await e.insert('image');
  await t.waitFor(`!!document.querySelector('.editor-selection.can-free-resize')`, { label: 'corners' }).catch(() => {});
  t.check('A picture in the layout shows its four corner handles', await t.eval(`(() => { const s = document.querySelector('.editor-selection'); return s.classList.contains('can-free-resize') && [...s.querySelectorAll('.editor-handle')].filter(h => getComputedStyle(h).display !== 'none').length === 4; })()`));
  const se170 = await t.centre('.editor-selection .editor-handle[data-dir="se"]');
  const w170 = await t.eval(`document.querySelector('.editor-stage .is-editor-selected').getBoundingClientRect().width`);
  await t.mouse('mouseMoved', se170.x, se170.y);
  await t.mouse('mousePressed', se170.x, se170.y);
  for (let i = 1; i <= 5; i++) await t.mouse('mouseMoved', se170.x - i * 12, se170.y - i * 8, { buttons: 1 });
  await t.mouse('mouseReleased', se170.x - 60, se170.y - 40, { buttons: 0 });
  t.check('…a corner drag places it freely and makes it smaller', await t.eval(`(() => { const el = document.querySelector('.editor-stage .is-editor-selected'); return el.classList.contains('is-free') && el.getBoundingClientRect().width < ${w170} - 10; })()`));
  await e.undo();
  t.check('…one Undo puts it back in the layout', await t.eval(`!document.querySelector('.editor-stage .scene .image-frame.is-free')`));
  await e.undo();

  // v170 (review): a press on a corner without moving leaves the picture in the layout (no change)
  await e.insert('image');
  const se170b = await t.centre('.editor-selection .editor-handle[data-dir="se"]');
  await t.mouse('mouseMoved', se170b.x, se170b.y);
  await t.mouse('mousePressed', se170b.x, se170b.y);
  await t.mouse('mouseReleased', se170b.x, se170b.y, { buttons: 0 });
  t.check('…a press on a corner without moving changes nothing', await t.eval(`!document.querySelector('.editor-stage .scene .image-frame.is-free')`));
  await e.undo();

  // v171: Change layout…: the slide in "title and bullet points"; its title and texts come along, its name stays; one undo step
  await e.goSlide('next');
  const before171 = await t.eval(`(() => { const s = document.querySelector('.editor-stage .scene'); return { name: s.dataset.name, title: s.querySelector('h1, h2')?.textContent.trim(), first: [...s.querySelectorAll('.content li, .content p, .content h3')].find(n => n.textContent.trim() && !n.closest('.eyebrow'))?.textContent.trim(), count: document.querySelectorAll('.editor-slide-list > li').length }; })()`);
  await e.tab('slide');
  await t.eval(`document.querySelector('.editor-panel-body [data-action="change-layout"]').click(); true`);
  await t.waitFor(`!!document.querySelector('.editor-dialog:not([hidden]) [data-template="template-title-bullets"]')`, { label: 'layouts' }).catch(() => {});
  await t.eval(`document.querySelector('.editor-dialog [data-template="template-title-bullets"]').click(); true`);
  await t.waitFor(`!!document.querySelector('.editor-dialog[hidden]')`).catch(() => {});
  const after171 = await t.eval(`(() => { const s = document.querySelector('.editor-stage .scene'); return { name: s.dataset.name, title: s.querySelector('h1, h2')?.textContent.trim(), list: !!s.querySelector('.content ul.big-list'), text: s.querySelector('.content').textContent, count: document.querySelectorAll('.editor-slide-list > li').length }; })()`);
  t.check('Change layout: same name, same title, its texts in the new layout, no extra slide', after171.name === before171.name && after171.title === before171.title && after171.list && after171.text.includes(before171.first) && after171.count === before171.count, JSON.stringify([before171, after171]));
  await e.undo();
  t.check('…one Undo brings the old layout back', await t.eval(`!document.querySelector('.editor-stage .scene .content ul.big-list.reveal') || document.querySelector('.editor-stage .scene').dataset.name === ${JSON.stringify(before171.name)}`));

  // v171 (check): on the numbers slide (count-ups), Change layout to cards; one Undo restores the slide exactly; Esc resets the mode
  await e.goSlide('numbers');
  const html171 = await e.modelHtml();
  const count171 = await t.eval(`document.querySelectorAll('.editor-slide-list > li').length`);
  await e.tab('slide');
  await t.eval(`document.querySelector('.editor-panel-body [data-action="change-layout"]').click(); true`);
  await t.waitFor(`!!document.querySelector('.editor-dialog:not([hidden]) [data-template="template-cards"]')`).catch(() => {});
  await t.eval(`document.querySelector('.editor-dialog [data-template="template-cards"]').click(); true`);
  await t.waitFor(`!!document.querySelector('.editor-dialog[hidden]')`).catch(() => {});
  const names171 = await t.eval(`[...document.querySelectorAll('.editor-slide-list > li .scene')].map(s => s.dataset.name)`);
  t.check('Change layout (numbers → cards): still one slide named numbers, no page error', names171.filter(n => n === 'numbers').length === 1 && names171.length === count171, JSON.stringify(names171));
  await e.undo();
  t.check('…one Undo restores the slide exactly', (await e.modelHtml()) === html171);
  await e.tab('slide');
  await t.eval(`document.querySelector('.editor-panel-body [data-action="change-layout"]').click(); true`);
  await t.waitFor(`!!document.querySelector('.editor-dialog:not([hidden])')`).catch(() => {});
  await t.eval(`document.querySelector('.editor-dialog [data-action="close-dialog"]').click(); true`);
  await t.eval(`document.querySelector('.editor-bar [data-action="add-slide"], .editor-slide-actions [data-action="add-slide"]')?.click(); true`);
  await t.waitFor(`!!document.querySelector('.editor-dialog:not([hidden]) [data-template="template-cards"]')`).catch(() => {});
  await t.eval(`document.querySelector('.editor-dialog [data-template="template-cards"]')?.click(); true`);
  t.check('…after Cancel, + Slide adds a slide again (one more)', (await t.eval(`document.querySelectorAll('.editor-slide-list > li').length`)) === count171 + 1);
  await e.undo();

  // v172: Slide menu › Speaker notes…: the Slide tab with the cursor in the notes; a second text box in the middle lands beside the first
  await t.eval(`(() => { const b = document.querySelector('.editor-menubar [data-menu-id="slide"]'); b.click(); document.querySelector('.editor-menubar-menu [data-command="slide-notes"]')?.click(); return true; })()`);
  await t.waitFor(`document.activeElement?.matches('[data-slide-field="notes"]')`, { label: 'notes' }).catch(() => {});
  t.check('Slide › Speaker notes…: the cursor in the slide\'s notes', await t.eval(`document.activeElement?.matches('[data-slide-field="notes"]')`));
  await e.blur();
  await e.insert('textbox');
  await e.blur();
  await e.insert('textbox');
  t.check('A second text box does not land exactly on the first', await t.eval(`(() => { const boxes = [...document.querySelectorAll('.editor-stage .scene .text-box.is-free')].slice(-2); return boxes.length === 2 && boxes[0].style.getPropertyValue('--x') !== boxes[1].style.getPropertyValue('--x'); })()`));
  await e.undo(); await e.undo();

  // v173: All slides › Fonts › Every title: the titles on the canvas change font; undo takes it back
  await e.goSlide('numbers');
  await e.tab('deck');
  const font173 = await t.eval(`getComputedStyle(document.querySelector('.editor-stage .scene h2')).fontFamily`);
  await e.panelSet('[data-deck-field="fontHeadings"]', 'serif');
  await t.waitFor(`/Georgia/.test(getComputedStyle(document.querySelector('.editor-stage .scene h2')).fontFamily)`, { label: 'serif titles' }).catch(() => {});
  t.check('Fonts › Every title: Classic (serif) on the canvas', await t.eval(`/Georgia/.test(getComputedStyle(document.querySelector('.editor-stage .scene h2')).fontFamily)`), await t.eval(`getComputedStyle(document.querySelector('.editor-stage .scene h2')).fontFamily`));
  await e.undo();
  t.check('…Undo: as designed again', await t.eval(`getComputedStyle(document.querySelector('.editor-stage .scene h2')).fontFamily === ${JSON.stringify(font173)}`));

  // v173: a double-click on a number opens its value field, ready to type
  await t.eval(`(() => { const n = document.querySelector('.editor-stage .scene .count-up'); n.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, button: 0 })); return true; })()`);
  await t.waitFor(`document.activeElement?.matches('[data-element-field="countUp"]')`, { label: 'number field' }).catch(() => {});
  t.check('Double-click on a number: its value field has the cursor', await t.eval(`document.activeElement?.matches('[data-element-field="countUp"]')`));

  // v173 (review): All running text reaches the slide's text, not only labels
  await e.goSlide('next');
  await e.tab('deck');
  await e.panelSet('[data-deck-field="fontText"]', 'mono');
  // (a list point is in the title font by design: the slide's own running text is what changes)
  t.check('Fonts › All running text: the slide\'s text in the mono font', await t.eval(`/JetBrains/.test(getComputedStyle(document.querySelector('.editor-stage .scene .content')).fontFamily)`));
  await e.undo();

  // v174: Ctrl+K "format painter" finds Copy style (an element selected); the grid button says what it did
  await e.goSlide('numbers');
  await e.pick('.editor-stage .scene h2');
  await e.blur();
  await t.key('k', 'KeyK', 75, 2);
  await t.waitFor(`!!document.querySelector('.editor-palette')`).catch(() => {});
  await t.type('format painter');
  await t.waitFor(`!!document.querySelector('.palette-row.is-current')`).catch(() => {});
  t.check('Ctrl+K "format painter" finds Copy style', await t.eval(`[...document.querySelectorAll('.palette-row')].slice(0, 3).some(r => /copy style/i.test(r.textContent))`), await t.eval(`[...document.querySelectorAll('.palette-row')].slice(0, 3).map(r => r.textContent).join(' | ')`));
  await t.key('Escape', 'Escape', 27);
  await t.eval(`document.querySelector('.editor-statusbar [data-action="view-grid"]').click(); true`);
  t.check('The Grid button says it is on', await t.eval(`/Grid on/.test(document.querySelector('.toast')?.textContent || '')`));
  await t.eval(`document.querySelector('.editor-statusbar [data-action="view-grid"]').click(); true`);

  // v175: Animations tab ▼ on the first one with the slide: it comes in after the second one
  await e.goSlide('mindset');
  await e.goSlide('next');
  await e.tab('animations');
  const rows175 = await t.eval(`[...document.querySelectorAll('.editor-panel-body .anim-row')].filter(r => r.querySelector('[data-action="anim-later"]')).map(r => r.querySelector('.anim-label').textContent)`);
  if (rows175.length >= 2) {
    await t.eval(`document.querySelector('.editor-panel-body .anim-row [data-action="anim-later"]').click(); true`);
    await t.waitFor(`[...document.querySelectorAll('.editor-panel-body .anim-row')].filter(r => r.querySelector('[data-action="anim-later"]'))[1]?.querySelector('.anim-label').textContent === ${JSON.stringify(rows175[0])}`, { label: 'swapped' }).catch(() => {});
    t.check('Animations tab ▼: the first one now comes in second', await t.eval(`[...document.querySelectorAll('.editor-panel-body .anim-row')].filter(r => r.querySelector('[data-action="anim-later"]'))[1]?.querySelector('.anim-label').textContent === ${JSON.stringify(rows175[0])}`), JSON.stringify(rows175));
    await e.undo();
  } else t.check('Animations tab: two rows with ▲ ▼ on slide next', false, JSON.stringify(rows175));

  // v176: an element with its own animation: Appears › On a click makes the animation start on a click (it gets a click)
  await e.goSlide('numbers');
  await e.insert('textbox');
  await e.tab('animations');
  await t.eval(`document.querySelector('.editor-panel-body [data-action="motion-quick"][data-preset="slide-from-left"]')?.click(); true`);
  await t.waitFor(`document.querySelector('.editor-stage .is-editor-selected')?.getAttribute('data-animation') === 'slide-from-left'`, { label: 'animated' }).catch(() => {});
  await e.tab('element');
  await t.waitFor(`!!document.querySelector('.editor-panel-body [data-element-field="animTrigger"]')`, { label: 'when' }).catch(() => {});
  t.check('With its own animation, Appears is not greyed: With the slide / On a click', await t.eval(`(() => { const f = document.querySelector('.editor-panel-body [data-element-field="animTrigger"]'); return !!f && !f.disabled && f.value === 'slide'; })()`));
  await e.panelSet('[data-element-field="animTrigger"]', 'click');
  await t.waitFor(`document.querySelector('.editor-stage .is-editor-selected')?.hasAttribute('data-reveal-step')`, { label: 'click' }).catch(() => {});
  t.check('…On a click: it gets a click, its animation starts on it', await t.eval(`(() => { const el = document.querySelector('.editor-stage .is-editor-selected'); return !!el && el.hasAttribute('data-reveal-step') && /^slide-from-left/.test(el.getAttribute('data-animation')); })()`));
  for (let i = 0; i < 3; i++) await e.undo();

  // v177: Insert › Today's date (a text box with the date); a chart caption can be typed in; a new slide has no sample notes
  await e.goSlide('numbers');
  await e.blur();
  await t.eval(`window.getSelection().removeAllRanges(); (() => { const b = document.querySelector('.editor-menubar [data-menu-id="insert"]'); b.click(); document.querySelector('.editor-menubar-menu [data-command="insert-date"]')?.click(); return true; })()`);
  await t.waitFor(`/\\d{4}/.test(document.querySelector('.editor-stage .is-editor-selected.text-box')?.textContent || '')`, { label: 'date' }).catch(() => {});
  t.check('Insert › Today\'s date: a text box with the date', await t.eval(`/${new Date().getFullYear()}/.test(document.querySelector('.editor-stage .is-editor-selected.text-box')?.textContent || '')`));
  await e.undo(); await e.undo();
  await e.insert('chart');
  t.check('…a chart\'s caption can be typed in', await t.eval(`document.querySelector('.editor-stage .is-editor-selected.chart figcaption, .editor-stage .chart.is-editor-selected figcaption')?.isContentEditable === true || [...document.querySelectorAll('.editor-stage .chart figcaption')].some(c => c.isContentEditable)`));
  await e.undo();

  // v178: Ctrl+click two more slides; "Use on the 3 selected slides" gives the transition to those only
  await e.goSlide('mindset');
  await e.tab('slide');
  await e.panelSet('[data-slide-field="transition"]', 'zoom');
  // (the list is drawn again after each Ctrl+click: each item is looked up afresh)
  for (const name of ['flow', 'four-cards']) await t.eval(`[...document.querySelectorAll('.editor-slide-list > li')].find(li => li.querySelector('.scene')?.dataset.name === ${JSON.stringify(name)}).dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true })); true`);
  await t.waitFor(`/Use on the 3 selected slides/.test(document.querySelector('.editor-panel-body [data-action="transition-all"]')?.textContent || '')`, { label: 'picked' }).catch(() => {});
  await t.eval(`document.querySelector('.editor-panel-body [data-action="transition-all"]').click(); true`);
  t.check('Several slides selected: their transition, not the other slides\'', await t.eval(`(() => { const scene = name => [...document.querySelectorAll('.editor-slide-list > li .scene')].find(s => s.dataset.name === name); return scene('flow').getAttribute('data-transition') === 'zoom' && scene('four-cards').getAttribute('data-transition') === 'zoom' && scene('numbers').getAttribute('data-transition') !== 'zoom'; })()`));
  await e.undo(); await e.undo();

  // v180: findability: Ctrl+K "coffee break" finds the break timer; "spotlight" with a heading selected finds Dim the rest (greyed, with why)
  await e.goSlide('numbers');
  await e.blur();
  await t.key('k', 'KeyK', 75, 2);
  await t.waitFor(`!!document.querySelector('.editor-palette')`).catch(() => {});
  await t.type('coffee break');
  await t.waitFor(`!!document.querySelector('.palette-row.is-current')`).catch(() => {});
  t.check('Ctrl+K "coffee break" finds Insert a break timer', await t.eval(`/break timer/i.test(document.querySelector('.palette-row.is-current')?.textContent || '')`));
  await t.key('Escape', 'Escape', 27);
  await e.pick('.editor-stage .scene h2');
  await e.blur();
  await t.key('k', 'KeyK', 75, 2);
  await t.waitFor(`!!document.querySelector('.editor-palette')`).catch(() => {});
  await t.type('spotlight');
  await t.waitFor(`!!document.querySelector('.palette-row')`).catch(() => {});
  t.check('…"spotlight" finds Dim the rest, saying it needs On a click', await t.eval(`[...document.querySelectorAll('.palette-row')].some(r => /Dim the rest/i.test(r.textContent) && /On a click/.test(r.textContent))`), await t.eval(`[...document.querySelectorAll('.palette-row')].slice(0, 4).map(r => r.textContent).join(' | ')`));
  await t.key('Escape', 'Escape', 27);

  // v181: nothing selected on the numbers slide: Ctrl+K "crop" says to insert a picture; "how it counts" selects a number and opens that setting
  await e.goSlide('numbers');
  await t.eval(`document.querySelector('.editor-stage .scene').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); true`);
  await e.blur();
  await t.key('k', 'KeyK', 75, 2);
  await t.waitFor(`!!document.querySelector('.editor-palette')`).catch(() => {});
  await t.type('crop');
  await t.waitFor(`!!document.querySelector('.palette-row')`).catch(() => {});
  t.check('Nothing selected: Ctrl+K "crop" lists Crop, saying to insert a picture first', await t.eval(`[...document.querySelectorAll('.palette-row')].some(r => /Crop/.test(r.textContent) && /insert a picture first/.test(r.textContent))`));
  await t.key('Escape', 'Escape', 27);
  await t.waitFor(`!document.querySelector('.editor-palette')`, { label: 'palette closed' }).catch(() => {});
  await e.goSlide('numbers');
  await t.click('.editor-bar [data-action="command-palette"]');   // (the ⌕ Find button)
  await t.waitFor(`!!document.querySelector('.editor-palette')`).catch(() => {});
  await t.type('how it counts');
  await t.waitFor(`/counts/i.test(document.querySelector('.palette-row.is-current')?.textContent || '')`).catch(() => {});
  await t.key('Enter', 'Enter', 13);
  await t.waitFor(`!!document.querySelector('.editor-panel-body .is-found [data-element-field="countStyle"]')`, { label: 'count style found' }).catch(() => {});
  t.check('…"how it counts" selects a number and opens How it counts', await t.eval(`!!document.querySelector('.editor-stage .is-editor-selected') && !!document.querySelector('.editor-panel-body [data-element-field="countStyle"]')`));

  // v182: a tip the first time a chart is selected (the tips reset), and only once
  await t.eval(`localStorage.removeItem('presentation-editor.tips'); true`);
  await e.goSlide('numbers');
  await e.insert('chart');
  await t.waitFor(`/double-click it to type its numbers/.test(document.querySelector('.toast')?.textContent || '')`, { label: 'chart tip' }).catch(() => {});
  t.check('First chart selected: the chart tip', await t.eval(`/double-click it to type its numbers/.test(document.querySelector('.toast')?.textContent || '')`));
  t.check('…remembered: it will not show again', await t.eval(`JSON.parse(localStorage.getItem('presentation-editor.tips')).includes('cmd.tipChart')`));
  await e.undo();

  // v183: the big title of slide start: A+ makes it bigger (it shrank before: % was of the text around it)
  await e.goSlide('title');
  await e.pick('.editor-stage .scene h1');
  const big183 = await t.eval(`parseFloat(getComputedStyle(document.querySelector('.editor-stage .scene h1')).fontSize)`);
  await e.tab('element');
  await e.panelSet('[data-tool-field="fontSize"]', '125%');
  const after183 = await t.eval(`parseFloat(getComputedStyle(document.querySelector('.editor-stage .scene h1')).fontSize)`);
  t.check('Text size 125% on a big title: bigger, about 1.25 ×', after183 > big183 * 1.2 && after183 < big183 * 1.3, JSON.stringify([big183, after183]));
  t.check('…the list shows 125%', await t.eval(`document.querySelector('.editor-panel-body [data-tool-field="fontSize"]').value === '125%'`));
  await e.undo();

  // v184: ★ Make it stand out on a card: edge, tint and glow; again: off. Undo says on which slide.
  await e.goSlide('numbers');
  await e.pick('.editor-stage .scene .stat');
  await e.tab('element');
  await t.eval(`document.querySelector('.editor-panel-body [data-action="stand-out"]').click(); true`);
  t.check('★ Make it stand out: an accent edge, tint and glow', await t.eval(`(() => { const s = document.querySelector('.editor-stage .is-editor-selected'); return s.hasAttribute('data-stand-out') && /accent/.test(s.style.border) && /accent/.test(s.style.backgroundColor) && /drop-shadow/.test(s.style.getPropertyValue('--element-shadow')); })()`));
  await e.undo();
  t.check('…Undo says on which slide', await t.eval(`/\\(slide \\d+\\)/.test(document.querySelector('.toast')?.textContent || '')`));

  // v186: a theme picked in the gallery: Ctrl+Z gives the theme before again
  await e.tab('deck');
  const before186 = await t.eval(`document.querySelector('.editor-panel-body .theme-tile[aria-pressed="true"]')?.dataset.pickTheme || ''`);
  const other186 = await t.eval(`[...document.querySelectorAll('.editor-panel-body .theme-tile')].find(b => b.getAttribute('aria-pressed') !== 'true')?.dataset.pickTheme`);
  if (before186 && other186) {
    await t.eval(`document.querySelector('.editor-panel-body .theme-tile[data-pick-theme="${other186}"]').click(); true`);
    await e.undo();
    await e.tab('slide'); await e.tab('deck');
    t.check('Theme from the gallery, then Ctrl+Z: the theme before again', await t.eval(`document.querySelector('.editor-panel-body .theme-tile[aria-pressed="true"]')?.dataset.pickTheme === ${JSON.stringify(before186)}`));
  } else t.check('Theme gallery: a theme in use and another one', false, JSON.stringify([before186, other186]));
  await t.eval(`Object.keys(localStorage).filter(key => /\\.(theme|colors)$/.test(key)).forEach(key => localStorage.removeItem(key)); true`);

  // v187: a deletion with the Delete key is named in Undo ("Undone: Deleted …"), not "Change"
  await e.goSlide('numbers');
  await e.insert('textbox');
  await e.blur();
  await t.key('Delete', 'Delete', 46);
  await t.waitFor(`!document.querySelector('.editor-stage .is-editor-selected')`).catch(() => {});
  await e.undo();
  t.check('Undo of a Delete key says "Deleted …"', await t.eval(`/Undone: Deleted/.test(document.querySelector('.toast')?.textContent || '')`), await t.eval(`document.querySelector('.toast')?.textContent || ''`));
  await e.undo();
  // v190: what a PowerPoint / Google Slides user looks for (a check against their menus)
  const runMenu = (menu, command) => t.eval(`(() => { document.querySelector('.editor-menubar [data-menu-id="${menu}"]').click(); const item = document.querySelector('.editor-menubar-menu [data-command="${command}"]'); if (!item) return false; item.click(); return true; })()`);
  await e.goSlide('numbers');
  await e.insert('textbox');
  await e.blur();
  await t.key('R', 'KeyR', 82, 2 | 8);
  await t.waitFor(`document.querySelector('.editor-stage .is-editor-selected')?.style.textAlign === 'right'`).catch(() => {});
  t.check('Ctrl+Shift+R: the selected text aligned right (the page is not reloaded)', await t.eval(`document.querySelector('.editor-stage .is-editor-selected')?.style.textAlign === 'right'`));
  t.check('…Format menu: Align and lists', await runMenu('format', 'align-centre') && await t.eval(`document.querySelector('.editor-stage .is-editor-selected')?.style.textAlign === 'center'`));
  t.check('the status bar counts the words on the slide', await t.eval(`/\\d+ words/.test(document.querySelector('.status-slide').textContent) && (document.querySelector('.status-slide').dispatchEvent(new PointerEvent('pointerenter')), /\\d+ words on all slides/.test(document.querySelector('.status-slide').title))`));
  await e.undo(); await e.undo(); await e.undo();
  await e.insert('list');
  await e.blur();
  t.check('Format › Numbered list numbers the selected list', await runMenu('format', 'list-numbers') && await t.eval(`document.querySelector('.editor-stage .is-editor-selected')?.closest('.big-list')?.getAttribute('data-bullets') === 'number'`));
  await e.undo(); await e.undo();
  await e.insert('table');
  await e.blur();
  await e.tab('element');
  await e.panelSet('[data-element-field="tableStyle"]', 'striped');
  t.check('a table: Table style Striped rows', await t.eval(`!!document.querySelector('.editor-stage .scene table.data-table[data-table-style="striped"]')`));
  await e.undo(); await e.undo();
  t.check('Insert › Slide number: the footer shows the number on every slide', await runMenu('insert', 'insert-slide-number') && await t.eval(`document.querySelector('.editor-panel-body [data-deck-field="footer"]')?.value === 'number'`));
  await e.undo();
  await e.blur();
  await t.key('f', 'KeyF', 70, 2);
  await t.eval('new Promise(r => setTimeout(r, 150))');
  t.check('Ctrl+F opens Find and replace', await t.eval(`!!document.activeElement?.matches('[data-find-field="find"]')`));
  await e.blur();
  t.check('File › Print a handout with notes is there', await t.eval(`(() => { const b = document.querySelector('.editor-menubar [data-menu-id="file"]'); b.click(); const ok = !!document.querySelector('.editor-menubar-menu [data-command="print-handout"]'); b.click(); return ok; })()`));
  // v191: Insert › Sound (the file chooser answered by the test: a short wav)
  await t.eval(`(() => {
    const original = HTMLInputElement.prototype.click;
    HTMLInputElement.prototype.click = function () {
      if (this.type !== 'file') return original.call(this);
      HTMLInputElement.prototype.click = original;
      const bytes = new Uint8Array(44 + 800), view = new DataView(bytes.buffer), text = (at, word) => [...word].forEach((c, i) => bytes[at + i] = c.charCodeAt(0));
      text(0, 'RIFF'); view.setUint32(4, 36 + 800, true); text(8, 'WAVE'); text(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
      view.setUint32(24, 8000, true); view.setUint32(28, 8000, true); view.setUint16(32, 1, true); view.setUint16(34, 8, true); text(36, 'data'); view.setUint32(40, 800, true);
      const files = new DataTransfer(); files.items.add(new File([bytes], 'intro-music.wav', { type: 'audio/wav' }));
      this.files = files.files;
      this.dispatchEvent(new Event('change'));
    };
    return true;
  })()`);
  await e.goSlide('numbers');
  t.check('Insert › Sound: a speaker with the file\'s name, its sound in the file', await runMenu('insert', 'insert-sound') && await t.waitFor(`!!document.querySelector('.editor-stage .scene .sound-badge audio.slide-audio[data-asset]')`).then(() => true, () => false) &&
    await t.eval(`/intro music/.test(document.querySelector('.editor-stage .scene .sound-badge .sound-name')?.textContent || '')`));
  await e.tab('element');
  await t.eval(`(() => { document.querySelector('.editor-panel-body [data-element-field="loop"]').click(); return true; })()`);
  t.check('…its Repeat and Plays settings', await t.eval(`document.querySelector('.editor-stage .scene .sound-badge audio')?.hasAttribute('loop') && !!document.querySelector('.editor-panel-body [data-element-field="playStep"]')`));
  await e.undo(); await e.undo();
  // v192: File › Insert slides from another presentation (the file chooser answered by the test: a small file of this program)
  await t.eval(`(() => {
    const original = HTMLInputElement.prototype.click;
    HTMLInputElement.prototype.click = function () {
      if (this.type !== 'file') return original.call(this);
      HTMLInputElement.prototype.click = original;
      const html = '<!doctype html><html><body><script type="application/json" id="deckAssets">{ "img/dot.svg": "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 10 10%22%3E%3Ccircle cx=%225%22 cy=%225%22 r=%225%22/%3E%3C/svg%3E" }<\/script>' +
        '<script type="application/json" id="deckAnimations">{ "wobble-in": { "keyframes": [] } }<\/script><div class="deck"><div class="stage" id="stage">' +
        '<section class="scene" data-name="numbers" data-title="Borrowed one"><div class="content"><h2 data-animation="wobble-in">From the other file</h2><img data-asset="img/dot.svg" alt="dot"><img src="x" onerror="window.__pwned = 1" alt=""><button data-goto="other">Next</button></div><script type="text/plain" data-slide-js>window.__pwned = 2<\/script></section>' +
        '<section class="scene" data-name="other" data-title="Borrowed two"><div class="content"><h2>Second</h2></div></section></div></div></body></html>';
      const files = new DataTransfer(); files.items.add(new File([html], 'old-talk.html', { type: 'text/html' }));
      this.files = files.files;
      this.dispatchEvent(new Event('change'));
    };
    return true;
  })()`);
  const slidesBefore192 = await t.eval(`document.querySelectorAll('.editor-slide-list > li').length`);
  await runMenu('file', 'import-slides');
  await t.waitFor(`document.querySelectorAll('.editor-dialog:not([hidden]) [data-import-index]').length === 2`, { label: 'the other file\'s slides' }).catch(() => {});
  t.check('Insert slides from another presentation: its slides as pictures to choose from', await t.eval(`document.querySelectorAll('.editor-dialog:not([hidden]) [data-import-index]').length === 2 && document.querySelector('.editor-import-go').disabled`));
  await t.eval(`document.querySelector('.editor-dialog [data-import-index="0"]').click(); document.querySelector('.editor-import-go').click(); true`);
  await t.waitFor(`document.querySelectorAll('.editor-slide-list > li').length === ${slidesBefore192 + 1}`).catch(() => {});
  t.check('…the chosen slide comes in after this one, with its picture (renamed: its name is taken here)', await t.eval(`document.querySelectorAll('.editor-slide-list > li').length === ${slidesBefore192 + 1} && /From the other file/.test(document.querySelector('.editor-stage .scene')?.textContent || '') && document.querySelector('.editor-stage .scene').dataset.name !== 'numbers' && /^data:image/.test(document.querySelector('.editor-stage .scene img')?.getAttribute('src') || '')`));
  await t.eval('new Promise(r => setTimeout(r, 200))');
  t.check('…cleaned: no on… handler, no slide script, nothing ran; a link to a slide that did not come is gone', await t.eval(`!window.__pwned && !document.querySelector('.editor-stage .scene [onerror]') && !document.querySelector('.editor-stage .scene script') && !document.querySelector('.editor-stage .scene [data-goto]')`));
  await e.undo();
  t.check('…Ctrl+Z takes it out again', await t.eval(`document.querySelectorAll('.editor-slide-list > li').length === ${slidesBefore192}`));
  // v192: Slide › Reset the layout: a part of the layout placed freely goes back in its place
  await e.goSlide('numbers');
  await e.pick('.editor-stage .scene .stat');
  await runMenu('arrange', 'free');
  await t.waitFor(`!!document.querySelector('.editor-stage .scene .stat.is-free')`).catch(() => {});
  const freed192 = await t.eval(`!!document.querySelector('.editor-stage .scene .stat.is-free')`);
  await e.blur();
  t.check('Slide › Reset the layout puts a freely placed part back in the layout', freed192 && await runMenu('slide', 'reset-layout') && await t.eval(`!document.querySelector('.editor-stage .scene .stat.is-free') && /layout is as it was/i.test(document.querySelector('.toast')?.textContent || '')`));
  await e.undo(); await e.undo();
  // v193 (a no-manual test as a first-time user): When in the quick animations; the keys while presenting in Help › Keyboard shortcuts
  await e.goSlide('numbers');
  await e.insert('textbox');
  await e.blur();
  await runMenu('animate', 'animate-quick');
  await t.waitFor(`!!document.querySelector('.editor-quick-menu [data-action="motion-quick-when"][data-when="click"]')`).catch(() => {});
  await t.eval(`document.querySelector('.editor-quick-menu [data-action="motion-quick-when"][data-when="click"]').click(); true`);
  await t.eval('new Promise(r => setTimeout(r, 150))');
  t.check('Quick animations › When: On a click makes it wait for a click', await t.eval(`document.querySelector('.editor-stage .is-editor-selected')?.hasAttribute('data-reveal-step') && /waits for a click/.test(document.querySelector('.toast')?.textContent || '')`));
  await e.undo(); await e.undo();
  await runMenu('help', 'shortcuts');
  await t.waitFor(`!!document.querySelector('.editor-dialog:not([hidden]) .editor-shortcuts-present')`).catch(() => {});
  t.check('Help › Keyboard shortcuts also lists the keys while presenting (the pen)', await t.eval(`/Pen/.test(document.querySelector('.editor-dialog:not([hidden]) .editor-shortcuts-present')?.textContent || '')`));
  await t.eval(`(() => { const f = document.querySelector('.editor-dialog:not([hidden]) .editor-shortcuts-find'); f.value = 'undo'; f.dispatchEvent(new Event('input')); return true; })()`);
  t.check('…in groups, and its find field keeps only the keys that say the word (undo)', await t.eval(`(() => { const shown = [...document.querySelectorAll('.editor-dialog:not([hidden]) .editor-shortcuts dt')].filter(dt => !dt.hidden && dt.closest('.editor-shortcuts-group:not([hidden])')); return document.querySelectorAll('.editor-dialog:not([hidden]) .editor-shortcuts-group').length >= 5 && shown.length >= 1 && shown.length <= 3 && shown.every(dt => /undo/i.test(dt.textContent + dt.nextElementSibling.textContent)); })()`));
  await t.key('Escape', 'Escape', 27);
  // v199: Ctrl+K with nothing selected: what fits by its words comes first, greyed with what it needs ("centre" → Centre the text)
  await e.goSlide('numbers');
  await t.eval(`document.querySelector('.editor-stage .scene').click(); true`);
  await t.key('Escape', 'Escape', 27);
  await e.blur();
  await t.eval(`document.querySelector('[data-action="command-palette"]')?.click(); true`);
  await t.waitFor(`!!document.querySelector('.editor-palette')`).catch(() => {});
  await t.type('centre');
  await t.eval('new Promise(r => setTimeout(r, 150))');
  t.check('Ctrl+K "centre" with nothing selected: centring commands first (greyed, saying what they need), Centre the text among the first three', await t.eval(`(() => { const rows = [...document.querySelectorAll('.palette-row')].slice(0, 3).map(r => r.textContent); return /^Centre/.test(rows[0] || '') && rows.some(r => /Centre the text/.test(r)); })()`), await t.eval(`document.querySelector('.palette-row')?.textContent`));
  await t.key('Escape', 'Escape', 27);
  // v200: Check spelling (F7): text by text with the keyboard in it, so the browser underlines the misspelled words
  await e.blur();
  await t.key('F7', 'F7', 118);
  await t.eval('new Promise(r => setTimeout(r, 150))');
  const spell1 = await t.eval(`document.querySelector('.editor-spellbar:not([hidden]) .spell-where')?.textContent || ''`);
  t.check('F7: the spelling bar, slide 1, the keyboard in its first text', /slide 1 of \d+ · text 1 of \d+/.test(spell1) && await t.eval(`!!document.activeElement?.isContentEditable && document.activeElement.spellcheck`), spell1);
  await t.key('F7', 'F7', 118);
  t.check('…F7 again: the next text', /text 2 of|slide 2 of/.test(await t.eval(`document.querySelector('.editor-spellbar .spell-where').textContent`)));
  await t.key('Escape', 'Escape', 27);
  t.check('…Esc stops it', await t.eval(`!!document.querySelector('.editor-spellbar[hidden]') && !document.activeElement?.isContentEditable`));
  // v201 (a teacher building a lesson, no manual): a double-click on a chart's caption types in it (not its rows); the same
  // auto-advance on every slide; a question layout
  await e.goSlide('numbers');
  await e.insert('chart');
  await e.blur();
  const caption = await t.centre('.editor-stage .scene .chart figcaption');
  await t.mouse('mousePressed', caption.x, caption.y); await t.mouse('mouseReleased', caption.x, caption.y);
  await t.mouse('mousePressed', caption.x, caption.y, { clickCount: 2 }); await t.mouse('mouseReleased', caption.x, caption.y, { clickCount: 2 });
  await t.eval('new Promise(r => setTimeout(r, 200))');
  t.check('a double-click on a chart caption: typing in the caption, not in the rows field', await t.eval(`!!document.activeElement?.closest('figcaption') && !document.activeElement.matches('[data-element-field="chartRows"]')`), await t.eval(`document.activeElement?.outerHTML.slice(0, 80)`));
  await t.key('Escape', 'Escape', 27);
  await e.undo();
  await e.tab('slide');
  t.check('Slide tab: auto-advance has its own Use on every slide', await t.eval(`!!document.querySelector('.editor-panel-body [data-action="advance-all"]')`));
  t.check('a layout: question, answer on a click', await t.eval(`!!document.querySelector('#slideTemplates')?.content.querySelector('[data-name="template-question"] [data-reveal-step="1"]') || [...document.querySelectorAll('section.scene')].some(s => s.dataset.name === 'template-question')`));
  // v202: All slides › Text size: every slide's layout and text larger (one undo step)
  await e.tab('deck');
  const before202 = await t.eval(`document.querySelector('.editor-stage .scene h2, .editor-stage .scene h1')?.getBoundingClientRect().height || 0`);
  await e.panelSet('[data-deck-field="textScale"]', 'biggest');
  await t.eval('new Promise(r => setTimeout(r, 150))');
  const after202 = await t.eval(`document.querySelector('.editor-stage .scene h2, .editor-stage .scene h1')?.getBoundingClientRect().height || 0`);
  t.check('All slides › Text size Biggest: the slide\'s text is larger', after202 > before202 * 1.15, JSON.stringify([before202, after202]));
  await e.undo();
  t.check('…Ctrl+Z: normal again', await t.eval(`!document.getElementById('deck').hasAttribute('data-text-scale')`));
  // v203: example text (a layout's "Topic", Insert's texts) has a dotted line on the canvas, never in the file
  await e.goSlide('numbers');
  await e.insert('textbox');
  await e.blur();
  t.check('an inserted text box: its example text dotted on the canvas, not in the file', await t.eval(`!!document.querySelector('.editor-stage .scene .is-sample-text')`) && !/is-sample-text|data-editor-sample/.test(await e.modelHtml()));
  await e.undo();
  // v204 (an office worker, no manual): ◯ Make it a circle next to Crop; a table's Header row; Insert › Link
  await e.goSlide('numbers');
  await e.insert('image');
  await e.blur();
  await e.tab('element');
  await t.eval(`document.querySelector('.editor-panel-body [data-action="image-circle"]').click(); true`);
  await t.eval('new Promise(r => setTimeout(r, 150))');
  t.check('◯ Make it a circle: the picture is round', await t.eval(`(() => { const el = document.querySelector('.editor-stage .is-editor-selected'); const target = el.matches('img') ? el : el.querySelector('img') || el; return /50%/.test(el.style.borderRadius + ' ' + target.style.borderRadius); })()`));
  await e.undo(); await e.undo();
  await e.insert('table');
  await e.blur();
  await e.tab('element');
  await t.eval(`document.querySelector('.editor-panel-body [data-element-field="tableHeader"]').click(); true`);
  await t.eval('new Promise(r => setTimeout(r, 150))');
  t.check('a table: Header row stands out', await t.eval(`!!document.querySelector('.editor-stage .scene table.data-table[data-table-header]')`));
  await e.undo(); await e.undo();
  await t.eval(`document.querySelector('.editor-stage .scene').click(); true`);
  await t.key('Escape', 'Escape', 27);
  await runMenu('insert', 'insert-link');
  t.check('Insert › Link with nothing selected: says how', await t.eval(`/Select a few words/.test(document.querySelector('.toast')?.textContent || '')`));
  // v205: Check the presentation lists a slide whose content runs off
  await e.goSlide('takeaways');
  await e.tab('deck');
  await t.eval(`document.querySelector('.editor-panel-body [data-action="check-deck"]').click(); true`);
  await t.waitFor(`!!document.querySelector('.editor-panel-body .editor-check-list')`).catch(() => {});
  const realOverflow = await t.eval(`[...document.querySelectorAll('.editor-panel-body .editor-check-list li, .editor-panel-body .editor-check-list > *')].filter(n => /runs off/.test(n.textContent) && !/numbers/i.test(n.textContent)).map(n => n.textContent.trim().slice(0, 60))`);
  t.check('the real slides: Check finds no content that runs off (numbers: earlier checks of this suite fill it)', realOverflow.length === 0, JSON.stringify(realOverflow));
  for (let i = 0; i < 6; i++) await e.insert('list');
  await e.blur();
  await e.tab('deck');
  await t.eval(`document.querySelector('.editor-panel-body [data-action="check-deck"]').click(); true`);
  await t.waitFor(`/runs off/.test(document.querySelector('.editor-panel-body .editor-check-list')?.textContent || '')`).catch(() => {});
  t.check('six lists more on a slide: Check says its content runs off', await t.eval(`/runs off/.test(document.querySelector('.editor-panel-body .editor-check-list')?.textContent || '')`));
  for (let i = 0; i < 6; i++) await e.undo();
  // v206: a chart as a ring; the slide list follows a heading typed on a slide made from a layout
  await e.goSlide('numbers');
  await e.insert('chart');
  await e.blur();
  await e.tab('element');
  await e.panelSet('[data-element-field="chartType"]', 'pie');
  await t.waitFor(`document.querySelectorAll('.editor-stage .scene .chart[data-chart="pie"] .chart-slice').length >= 2`).catch(() => {});
  t.check('Chart kind Ring: one part per row, with a legend', await t.eval(`(() => { const chart = document.querySelector('.editor-stage .scene .chart[data-chart="pie"]'); return !!chart && chart.querySelectorAll('.chart-slice').length >= 2 && chart.querySelectorAll('.chart-legend').length >= 2; })()`));
  await e.undo(); await e.undo();
  await t.key('m', 'KeyM', 77, 2);
  await t.waitFor(`!!document.querySelector('.editor-dialog:not([hidden]) [data-template="template-title-bullets"]')`).catch(() => {});
  await t.eval(`document.querySelector('.editor-dialog [data-template="template-title-bullets"]').click(); true`);
  await t.waitFor(`/Title and bullet points/i.test(document.querySelector('.editor-slide-list li.is-selected .editor-slide-title')?.textContent || '')`).catch(() => {});
  await e.pick('.editor-stage .scene h2');
  await e.blur();
  await t.key('F2', 'F2', 113);
  await t.key('a', 'KeyA', 65, 2);
  await t.type('The water cycle');
  await t.key('Escape', 'Escape', 27);
  await t.eval('new Promise(r => setTimeout(r, 200))');
  t.check('typing the heading of a slide made from a layout: the slide list shows that heading', await t.eval(`/The water cycle/.test(document.querySelector('.editor-slide-list li.is-selected .editor-slide-title')?.textContent || '')`), await t.eval(`document.querySelector('.editor-slide-list li.is-selected .editor-slide-title')?.textContent`));
  await e.undo(); await e.undo();
  // v207: a new shape over the slide's text says how to get it out of the way
  await e.goSlide('takeaways');
  await e.insert('rect');
  t.check('a new shape over the texts: a message says drag it or send it to the back', await t.eval(`/lies over the slide/.test(document.querySelector('.toast')?.textContent || '')`));
  await e.undo();
  // v208 (an animator, no manual): Spin, keeps going; picking another quick animation says which one it replaces
  await e.goSlide('numbers');
  await e.insert('star');
  await e.blur();
  await runMenu('animate', 'animate-quick');
  await t.waitFor(`!!document.querySelector('.editor-quick-menu [data-preset="spin-forever"]')`).catch(() => {});
  await t.eval(`document.querySelector('.editor-quick-menu [data-preset="spin-forever"]').click(); true`);
  await t.eval('new Promise(r => setTimeout(r, 150))');
  t.check('Quick animations › Spin, keeps going: turns again and again with the slide', await t.eval(`/spin-forever/.test(document.querySelector('.editor-stage .is-editor-selected')?.getAttribute('data-animation') || '')`));
  await runMenu('animate', 'animate-quick');
  await t.waitFor(`!!document.querySelector('.editor-quick-menu [data-preset="fade-in"]')`).catch(() => {});
  await t.eval(`document.querySelector('.editor-quick-menu [data-preset="fade-in"]').click(); true`);
  await t.eval('new Promise(r => setTimeout(r, 150))');
  t.check('…another one after it: the message says which it replaces', await t.eval(`/replaces Spin forever/.test(document.querySelector('.toast')?.textContent || '')`), await t.eval(`document.querySelector('.toast')?.textContent`));
  await e.undo(); await e.undo(); await e.undo();
  // v209: ❚❚ Pause / ▶ Resume while the slide plays on the canvas
  await e.goSlide('numbers');
  await e.tab('animations');
  await t.eval(`document.querySelector('.editor-panel-body [data-action="play-slide"]').click(); true`);
  await t.eval('new Promise(r => setTimeout(r, 120))');
  await t.eval(`document.querySelector('.editor-panel-body [data-action="play-pause"]').click(); true`);
  t.check('❚❚ Pause: the slide\'s animations hold; the button says Resume', await t.eval(`(() => { const all = document.querySelector('.editor-stage .scene').getAnimations({ subtree: true }); return all.some(a => a.playState === 'paused') && !all.some(a => a.playState === 'running') && /Resume/.test(document.querySelector('.editor-panel-body [data-action="play-pause"]').textContent); })()`));
  await t.eval(`document.querySelector('.editor-panel-body [data-action="play-pause"]').click(); true`);
  t.check('…▶ Resume: they go on', await t.eval(`!document.querySelector('.editor-stage .scene').getAnimations({ subtree: true }).some(a => a.playState === 'paused')`));
  await t.key('Escape', 'Escape', 27);
  // v210: a new picture shrinks until the slide's content fits again
  await e.goSlide('next');
  await e.insert('image');
  await t.eval('new Promise(r => setTimeout(r, 150))');
  t.check('a new picture: the slide\'s content still fits (it comes in smaller when needed)', await t.eval(`(() => { const scene = document.querySelector('.editor-stage .scene'); const content = scene.querySelector(':scope > .content'); const bottom = Math.max(...[...content.children].filter(c => c.getClientRects().length).map(c => c.getBoundingClientRect().bottom)); return bottom <= scene.getBoundingClientRect().bottom + 2 || parseFloat(document.querySelector('.editor-stage .is-editor-selected')?.style.width) <= 25; })()`));
  await e.undo();
  // v211: ⏭ Start after the one before: its delay becomes the end of the last animation before it
  await e.goSlide('numbers');
  await e.insert('textbox');
  await e.blur();
  await e.tab('element');
  await e.panelSet('[data-element-field="animation"]', 'preset:fade-in');
  await t.waitFor(`!!document.querySelector('.editor-panel-body [data-action="anim-after-previous"]')`).catch(() => {});
  await t.eval(`document.querySelector('.editor-panel-body [data-action="anim-after-previous"]').click(); true`);
  await t.eval('new Promise(r => setTimeout(r, 200))');
  t.check('⏭ Start after the one before: a later start, said in a message', await t.eval(`Number(document.querySelector('.editor-panel-body [data-anim-field="delay"]')?.value) > 300 && /after the one before/.test(document.querySelector('.toast')?.textContent || '')`), await t.eval(`document.querySelector('.editor-panel-body [data-anim-field="delay"]')?.value + ' ' + document.querySelector('.toast')?.textContent`));
  await e.undo(); await e.undo(); await e.undo();
}
