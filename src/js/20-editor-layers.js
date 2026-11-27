  /* ===========================================================================
     20. EDITOR EXTRAS: layers, style and appearance tools, canvas helpers,
         slides, undo history (the object editorLayers)
     LAYERS
       Layers tab       every element of the slide as a tree, in the order of
                        the file (a later one lies on top; freely placed ones
                        lie above the rest). Click selects, Shift+click adds or
                        removes, the pointer over a row outlines the element,
                        the field above the list finds elements by name or text.
                        👁 hides an element while you edit; 🔒 locks it (no
                        clicking, dragging, moving, cutting or deleting). Kept in
                        the file as data-editor-hidden / data-editor-locked;
                        presenting ignores them.
       Names            double-click a row, or Name in the Element tab:
                        data-editor-name="Logo box" (only the editor shows it).
     STYLE
       Copy style       Ctrl+Alt+C / Ctrl+Alt+V (also in the Style section and
                        the right-click menu): size, colour, alignment, font,
                        weight, italic, line height, capitals; a shape's fill
                        and outline only go from a shape to a shape.
       Text size keys   Ctrl+Shift+. / Ctrl+Shift+, (> / < on a US keyboard).
       Front / back     Ctrl+Shift+] / Ctrl+Shift+[ for a freely placed element; Ctrl+] / Ctrl+[ one layer.
     APPEARANCE (Element tab, How it appears)
       Speed, Easing    style="animation-duration: 1.2s; animation-timing-function:
                        var(--ease-elastic)" (with the slide) or the transition-…
                        properties (on a click).
       Copy appearance  the way it appears, its effect, speed and easing, to the
                        selected element(s).
       ▶ Preview        plays how one element appears with the slide's own CSS
                        (also by itself when one of those changes).
     CANVAS
       Grid, Snap       switches under the canvas (G): a 40 px grid from the
                        slide's corner; free elements snap to it in 8 px steps,
                        to guides and to equal gaps (short bars show them).
                        Snap off places freely (as Alt while dragging).
       Line up          left … bottom of the slide (or of the card it is in).
       Pan              Space + drag, or the middle mouse button (zoomed in).
       Ctrl+drag        a copy stays where the element was.
       Distances        hold Alt with the pointer over another element: the gaps
                        to it (over the selection or the slide: to the edges).
       (The corner and rotate handles are in section 18, startDrag.)
     SLIDES
       Every slide      (Slide tab) this slide's transition or background on
                        every slide, one undo step.
       Overview         (O) every slide large: click to open, drag to move.
       ▶ Preview        (Slide tab) how this slide comes on after the one
                        before it, with the presentation's own CSS.
     LOGO (Presentation tab; a click on the logo on the canvas opens it)
       Replace, show, corner, size in the corner, large on the first and last
       slide: attributes of <div class="logo"> (see css/03). Slide tab: "No
       logo on this slide" (data-hide-logo on the <section>).
     UNDO HISTORY
       ▾ next to Undo   the last changes by name; a click goes back to just
                        before that change (Redo comes back).
       + Insert         (bar) the same list as Insert in the Element tab, at any
                        time: after the selected element, or at the end of the
                        slide; text boxes and shapes in the middle. It uses the
                        same pop-up list as the history (historyList).
     =========================================================================== */

  /** What Copy style takes (inline CSS); the shape ones only go from a shape to a shape. */
  const COPIED_STYLE = ['font-size', 'color', 'text-align', 'font-family', 'font-weight', 'font-style', 'line-height', 'text-transform', 'letter-spacing', 'border-radius', '--element-shadow', '--element-opacity', '--text-gradient', '--text-outline'];
  const COPIED_SHAPE_STYLE = ['--shape-fill', '--shape-stroke'];
  const COPIED_BOX_STYLE = ['align-content', 'padding', 'background-color', 'backdrop-filter', 'border', 'column-count'];   // (Text in its box, Room inside, Box: not to shapes or icons)
  /** Text styles (Style, Styles; the selection bar's Aa; Format menu): a whole look in one click. Each sets all of these
      properties ('' removes one: the slide design's own); the alignment stays. [id, interface text, values, size of its chip]. */
  const TEXT_STYLES = [
    ['title', 'editor.styleTitle', { 'font-family': 'var(--font-display)', 'font-size': '200%', 'font-weight': '700', 'font-style': '', 'line-height': '1.1', 'text-transform': '', color: '' }, '1.15em'],
    ['heading', 'editor.styleHeading', { 'font-family': 'var(--font-display)', 'font-size': '150%', 'font-weight': '700', 'font-style': '', 'line-height': '1.15', 'text-transform': '', color: '' }, '1em'],
    ['body', 'editor.styleBody', { 'font-family': 'var(--font-body)', 'font-size': '', 'font-weight': '400', 'font-style': '', 'line-height': '1.5', 'text-transform': '', color: '' }, '.85em'],
    ['caption', 'editor.styleCaption', { 'font-family': 'var(--font-body)', 'font-size': '75%', 'font-weight': '400', 'font-style': '', 'line-height': '1.3', 'text-transform': '', color: 'var(--color-text-muted)' }, '.75em'],
    ['label', 'editor.styleLabel', { 'font-family': 'var(--font-mono)', 'font-size': '75%', 'font-weight': '400', 'font-style': '', 'line-height': '1.3', 'text-transform': 'uppercase', color: 'var(--color-accent)' }, '.72em'],
    ['quote', 'editor.styleQuote', { 'font-family': 'var(--font-display)', 'font-size': '125%', 'font-weight': '400', 'font-style': 'italic', 'line-height': '1.3', 'text-transform': '', color: 'var(--color-accent)' }, '.95em'],
    ['plain', 'editor.stylePlain', { 'font-family': '', 'font-size': '', 'font-weight': '', 'font-style': '', 'line-height': '', 'text-transform': '', color: '' }, '.85em'],
  ];
  /** The properties a text style sets (built-in and your own). */
  const TEXT_STYLE_PROPS = Object.keys(TEXT_STYLES[0][2]);
  /** How fast an element appears (Element tab); '' keeps what the slide's CSS gives it. */
  const APPEAR_SPEEDS = [['', 'editor.speedNormal'], ['0.3s', 'editor.speedFast'], ['1.2s', 'editor.speedSlow'], ['2s', 'editor.speedVerySlow']];
  /** How it moves while it appears; the values are the theme's motion tokens (css/02). */
  /** Where the logo sits (Presentation tab, Logo); '' is the top right corner. */
  const LOGO_CORNERS = [['', 'editor.logoTopRight'], ['top-left', 'editor.logoTopLeft'], ['bottom-right', 'editor.logoBottomRight'], ['bottom-left', 'editor.logoBottomLeft']];
  const APPEAR_EASINGS = [['', 'editor.easeNormal'], ['var(--ease-in-out)', 'editor.easeSmooth'], ['var(--ease-elastic)', 'editor.easeSpringy'], ['linear', 'editor.easeEven']];

  const editorLayers = {
    copiedStyle: null,    // { values: { property: value or '' }, shape: true when copied from a shape }
    copiedAppear: null,   // { mode: 'always' | 'slide' | 'click', step, effect, speed, ease }
    layerFilter: '',      // the letters typed above the Layers list
    spaceHeld: false,
    grid: false,          // the grid on the canvas (Grid under the canvas, G)
    snapping: true,       // free elements snap to the grid, the middle and other elements while dragging

    setUp() {
      if (this.setUpDone) return;
      this.setUpDone = true;
      const body = editor.element.querySelector('.editor-panel-body');
      body.addEventListener('click', event => {
        const button = event.target.closest('button[data-layer-action]');
        if (!button || button.disabled) return;
        button.blur();   // the element keys work right away
        const path = button.dataset.path;
        const rename = button.dataset.layerAction === 'select' && event.detail === 2 && !event.shiftKey;   // a double-click
        runSafely('editor layers: ' + button.dataset.layerAction, () => this.onLayerButton(button, event.shiftKey));
        const label = rename && body.querySelector('.layer-label[data-path="' + path + '"]');   // the redrawn row
        if (label) runSafely('editor layers: rename', () => this.startRename(label));
      });
      body.addEventListener('pointerover', event => {
        const row = event.target.closest('.layer-row');
        this.showHover(row ? this.elementOf(row.querySelector('.layer-label')) : null);
      });
      body.addEventListener('pointerleave', () => this.showHover(null));
      body.addEventListener('input', event => {
        if (!event.target.matches('.layer-filter')) return;
        this.layerFilter = event.target.value;
        this.applyLayerFilter(body);
      });
      this.setUpOverview();
      const area = editor.element.querySelector('.editor-canvas-scroll');
      area.addEventListener('pointerdown', event => this.startPan(event), true);   // before the canvas selects or drags
      area.addEventListener('scroll', () => editorCommands.placeBar(), { passive: true });   // the selection bar follows a scrolled canvas
      area.addEventListener('mousedown', event => { if (event.button === 1) event.preventDefault(); });   // no auto-scroll circle
      window.addEventListener('keyup', event => { if (event.key === ' ') this.setSpace(false); if (event.key === 'Alt') this.showDistances(null); });
      // Alt with the pointer over another element: the distances between it and the selection
      area.addEventListener('pointermove', event => { this.lastPointer = event; this.showDistances(event.altKey && !event.buttons ? event : null); });
      area.addEventListener('pointerleave', () => this.showDistances(null));
      window.addEventListener('keydown', event => {
        if (event.key !== 'Alt' || !this.lastPointer || !editor.element || !editor.element.contains(this.lastPointer.target)) return;
        this.showDistances(this.lastPointer);
        if (editorCanvas.stageElement && editorCanvas.stageElement.querySelector('.editor-distance')) editorCommands.altAlone = false;   // Alt for the distances: not the menu bar's Alt (section 20c)
      });
      window.addEventListener('blur', () => this.setSpace(false));
      try { const view = JSON.parse(localStorage.getItem(DECK_ID + '-editor.view') || '{}'); this.grid = view.grid === true; this.snapping = view.snapping !== false; }
      catch (e) { /* no storage: the defaults */ }
      this.showView();
    },

    /* ======== KEYS AND BUTTONS ======== */

    /* ---- Buttons and keys ---- */
    runAction(action, button) {
      const actions = {
        'text-style': () => { this.closeHistory(); this.applyTextStyle(button.dataset.style); },
        'text-style-new': () => {   // "+ Save as style": a name field in the Style section
          this.closeHistory();
          this.namingStyle = true;
          editor.panelTab = 'element';
          editor.renderPanel();
          editorCommands.openDock('right');
          const field = editor.element.querySelector('.editor-panel-body [data-tool-field="newTextStyle"]');
          editor.unfoldAround(field);   // (Style folded: it opens, so the name field can be typed in)
          if (field) field.focus();
        },
        'text-style-cancel': () => { this.namingStyle = false; editor.renderPanel(); },
        'text-style-remove': () => this.removeTextStyle(button.dataset.style),
        'copy-style': () => this.copyStyle(),
        'paste-style': () => this.pasteStyle(),
        'copy-appear': () => this.copyAppear(),
        'preview-appear': () => this.previewAppear(editorCanvas.selected),
        'preview-transition': () => this.previewTransition(),
        'paste-appear': () => this.pasteAppear(),
        'view-grid': () => { this.setView({ grid: !this.grid }); showToast(ui(this.grid ? 'editor.gridOn' : 'editor.gridOff')); },   // (the small button says what it did)
        overview: () => this.openOverview(),
        history: () => this.openHistory(button),
        'insert-menu': () => this.openInsertMenu(button),
        'insert-kind': () => { this.closeHistory(); editorCanvas.insertBlock(button.dataset.kind); },
        'history-go': () => {
          const steps = Number(button.dataset.steps) || 0;
          const names = editor.history.slice(-steps).reverse().map(step => step.label || ui('editor.historyChange'));
          this.closeHistory();
          for (let i = 0; i < steps; i++) editor.undo();
          if (steps > 1) showToast(ui('editor.undidMany', { count: steps, what: names.join(', ') }));   // (all of them named, not only the last)
        },
        'transition-all': () => this.useOnEverySlide(scene => {
          const value = editor.selected.getAttribute('data-transition'), speed = editor.selected.getAttribute('data-transition-speed');
          if (value) scene.setAttribute('data-transition', value); else scene.removeAttribute('data-transition');
          if (speed) scene.setAttribute('data-transition-speed', speed); else scene.removeAttribute('data-transition-speed');   // (its speed too)
        }),
        'advance-all': () => this.useOnEverySlide(scene => {   // Moves on by itself after … seconds: the same on every slide (a corner screen)
          const seconds = editor.selected.getAttribute('data-advance');
          if (seconds) scene.setAttribute('data-advance', seconds); else scene.removeAttribute('data-advance');
        }),
        'background-all': () => this.useOnEverySlide(scene => {
          const source = editor.selected;
          scene.style.backgroundColor = source.style.backgroundColor;
          const dim = source.style.getPropertyValue('--background-dim');
          if (dim) scene.style.setProperty('--background-dim', dim); else scene.style.removeProperty('--background-dim');
          const gradient = source.style.getPropertyValue('--background-gradient');
          if (gradient) scene.style.setProperty('--background-gradient', gradient); else scene.style.removeProperty('--background-gradient');
          if (source.hasAttribute('data-asset-background')) scene.setAttribute('data-asset-background', source.getAttribute('data-asset-background')); else scene.removeAttribute('data-asset-background');
          scene.toggleAttribute('data-background-drift', source.hasAttribute('data-background-drift'));   // (it moves slowly there too, or not)
          if (!scene.getAttribute('style')) scene.removeAttribute('style');
        }),
        'overview-open': () => { const scene = this.sceneNamed(button.dataset.name); editor.closeDialog(); if (scene) editor.select(scene); },
        'view-snap': () => { this.setView({ snapping: !this.snapping }); showToast(ui(this.snapping ? 'editor.snapOn' : 'editor.snapOff')); },
        'line-up-left': () => this.lineUp('left'), 'line-up-centre': () => this.lineUp('centre'), 'line-up-right': () => this.lineUp('right'),
        'line-up-top': () => this.lineUp('top'), 'line-up-middle': () => this.lineUp('middle'), 'line-up-bottom': () => this.lineUp('bottom'),
      };
      if (actions[action]) { runSafely('editor: ' + action, actions[action]); return true; }
      return false;
    },
    /** Ctrl+Alt+C / Ctrl+Alt+V and Space (pan); only while no text or field has the keyboard. True when used. */
    onKey(event) {
      const withModifier = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      if (withModifier && event.altKey && !event.shiftKey && (key === 'c' || key === 'v')) {
        if (!editorCanvas.selected) return false;
        event.preventDefault();
        if (key === 'c') this.copyStyle(); else this.pasteStyle();
        return true;
      }
      if (key === 'g' && !withModifier && !event.altKey && !event.shiftKey) { event.preventDefault(); this.setView({ grid: !this.grid }); return true; }
      if (withModifier && event.shiftKey && !event.altKey && (event.code === 'Period' || event.code === 'Comma') && editorCanvas.selected) {
        event.preventDefault();
        this.stepTextSize(event.code === 'Period' ? 1 : -1);
        return true;
      }
      if (key === 'o' && !withModifier && !event.altKey && !event.shiftKey) { event.preventDefault(); this.openOverview(); return true; }
      if (withModifier && !event.altKey && (event.code === 'BracketRight' || event.code === 'BracketLeft') && editorCanvas.selected && editorCanvas.isFree(editorCanvas.selected)) {
        event.preventDefault();   // with Shift: to the front / back; without: one layer (section 19)
        if (!editorCanvas.locked()) editorTools.runAction(event.code === 'BracketRight' ? (event.shiftKey ? 'to-front' : 'layer-forward') : (event.shiftKey ? 'to-back' : 'layer-back'));
        return true;
      }
      if (event.key === ' ' && !withModifier && !event.altKey && this.canPan()) {
        event.preventDefault();
        this.setSpace(true);
        return true;
      }
      return false;
    },

    /* ======== LAYERS ======== */

    /* ---- Layers tab ---- */
    /** True when the element (or a parent of it) is locked in the Layers tab. */
    isLocked(element) { return !!element && !!element.closest && !!element.closest('[data-editor-locked]'); },
    /** True (with a message) when one of the elements is locked: the caller does nothing then. */
    refuses(list) {
      if (!list.some(item => this.isLocked(item))) return false;
      showToast(ui('editor.lockedNote'));
      return true;
    },
    /** Deleting or cutting: also refused when a locked element is inside (moving a container takes it along). */
    refusesRemoval(list) {
      if (!list.some(item => this.isLocked(item) || !!item.querySelector('[data-editor-locked]'))) return false;
      showToast(ui(list.some(item => this.isLocked(item)) ? 'editor.lockedNote' : 'editor.lockedWithin'));
      return true;
    },
    /** True (with a message) when a new block would go into a container locked in the Layers tab (it would be locked too):
        after `anchor`, or (no anchor) on the slide; placeBlock (section 18) decides the place the same way. */
    refusesInto(anchor, free) {
      const scene = editorCanvas.scene;
      if (!scene) return false;
      const parent = anchor ? anchor.parentElement : free ? scene : (scene.querySelector(':scope > .content') || scene);
      if (!parent || parent === scene || !this.isLocked(parent)) return false;
      showToast(ui('editor.lockedInside'));
      return true;
    },
    /** A copy (duplicate, paste) starts unlocked and visible. */
    unmark(node) {
      [node].concat(Array.from(node.querySelectorAll('[data-editor-locked], [data-editor-hidden], [data-anchor], [data-connect]'))).forEach(item => {
        item.removeAttribute('data-editor-locked');
        item.removeAttribute('data-editor-hidden');
        item.removeAttribute('data-anchor');   // a copy is no end of a connected arrow, and a copied arrow follows nothing (section 19)
        item.removeAttribute('data-connect');
      });
    },
    elementOf(button) {
      return button && button.dataset.path ? editorCanvas.elementAtPath(button.dataset.path.split('/').filter(Boolean).map(Number)) : null;
    },
    /** The elements listed: those Tab goes through, and also the ones hidden while editing. */
    layerElements() {
      const scene = editorCanvas.scene;
      if (!scene) return [];
      const shown = element => {   // not see-through on the still slide (e.g. an item that only appears while the script runs)
        for (let node = element; node && node !== scene; node = node.parentElement) {
          const style = getComputedStyle(node);
          if (style.opacity === '0' || style.display === 'none') return false;
          if (style.visibility === 'hidden' && !node.closest('[data-editor-hidden]')) return false;
        }
        return true;
      };
      return Array.from(scene.querySelectorAll('*')).filter(element =>
        !element.closest('svg, .speaker-notes, [hidden]') && !INLINE_TAGS.has(element.tagName) && !element.matches('[data-editor-wrap]') &&
        element.getBoundingClientRect().width > 0 && shown(element));
    },
    panelHtml() {
      const scene = editorCanvas.scene;
      if (!scene) return '';
      const list = this.layerElements();
      const listed = new Set(list);
      const slideLocked = editorCanvas.locked();
      const rows = list.map(element => {
        let depth = 0;
        for (let node = element.parentElement; node && node !== scene; node = node.parentElement) if (listed.has(node)) depth++;
        const path = editorCanvas.pathOf(element).join('/');
        const hidden = element.hasAttribute('data-editor-hidden'), locked = element.hasAttribute('data-editor-locked');
        const toggle = (action, on, symbol, label) => '<button class="layer-toggle' + (on ? ' is-on' : '') + '" data-layer-action="' + action + '" data-path="' + path + '" aria-pressed="' + on + '"' +
          (slideLocked ? ' disabled' : '') + ' title="' + escapeHtml(ui(label)) + '" aria-label="' + escapeHtml(ui(label)) + '">' + symbol + '</button>';
        const find = (this.cleanName(element.getAttribute('data-editor-name')) + ' ' + editorTools.textOf(element)).toLowerCase();   // what the find field looks in
        return '<li data-find="' + escapeHtml(find) + '" class="layer-row' + (element === editorCanvas.selected ? ' is-selected' : '') + (editorTools.group.includes(element) ? ' is-grouped' : '') +
          (hidden ? ' is-hidden' : '') + (locked ? ' is-locked' : '') + '" style="--depth: ' + Math.min(depth, 8) + '">' +
          '<button class="layer-label" data-layer-action="select" data-path="' + path + '" title="' + escapeHtml(editorTools.textOf(element).slice(0, 120)) + '">' + escapeHtml(this.layerName(element)) +
          (editorCanvas.isFree(element) ? ' <small>' + escapeHtml(ui('editor.layerFree')) + '</small>' : '') + '</button>' +
          toggle('hide', hidden, hidden ? '◌' : '👁', hidden ? 'editor.layerShow' : 'editor.layerHide') +
          toggle('lock', locked, locked ? '🔒' : '🔓', locked ? 'editor.layerUnlock' : 'editor.layerLock') + '</li>';
      });
      // (the explanation folded under one line: the rows come first)
      return '<details class="editor-intro"><summary data-ui="editor.layersHow"></summary><p class="editor-note is-tip" data-ui="editor.layersNote"></p></details>' + (slideLocked ? '<p class="editor-note" data-ui="editor.scriptedNote"></p>' : '') +
        '<input type="search" class="layer-filter" value="' + escapeHtml(this.layerFilter) + '" placeholder="' + escapeHtml(ui('editor.layerFilter')) + '" aria-label="' + escapeHtml(ui('editor.layerFilter')) + '">' +
        '<p class="editor-note layer-none" hidden data-ui="editor.layerNone"></p>' +
        (rows.length ? '<ol class="editor-layers">' + rows.join('') + '</ol>' : '<p class="editor-note" data-ui="editor.noLayers"></p>');
    },
    /** Hides the rows whose label does not have the typed letters (a parent of a match stays, so you see where it is). */
    applyLayerFilter(container) {
      const wanted = this.layerFilter.trim().toLowerCase();
      const rows = Array.from(container.querySelectorAll('.layer-row'));
      const matches = row => !wanted || (row.dataset.find || '').includes(wanted);
      rows.forEach(row => { row.hidden = !matches(row); });
      const none = container.querySelector('.layer-none');
      if (none) none.hidden = !wanted || rows.some(row => !row.hidden);
      if (!wanted) return;
      rows.forEach((row, index) => {   // a match shows the rows above it that hold it (smaller depth)
        if (row.hidden) return;
        let depth = parseFloat(row.style.getPropertyValue('--depth')) || 0;
        for (let i = index - 1; i >= 0 && depth > 0; i--) {
          const above = parseFloat(rows[i].style.getPropertyValue('--depth')) || 0;
          if (above < depth) { rows[i].hidden = false; depth = above; }
        }
      });
    },
    onLayerButton(button, shift) {
      const action = button.dataset.layerAction;
      if (editorTools.playStep >= 0) editorTools.stopPlaying();   // the still slide again (paths stay the same)
      const element = this.elementOf(button);
      if (!element) return;
      if (action === 'select') {
        if (shift && !editorCanvas.locked()) editorTools.toggleGroup(element);
        else { editorTools.group = []; editorTools.drawGroup(); editorCanvas.selectElement(element); }   // a plain click in the list: only this one
        editor.panelTab = 'layers';
        editor.renderPanel();
        if (editorCanvas.zoom > 1 && editorCanvas.selected) editorCanvas.scrollToSelection();
        return;
      }
      if (editorCanvas.locked()) return;
      this.toggle(element, action === 'hide' ? 'data-editor-hidden' : 'data-editor-locked');
    },
    toggle(element, attribute) {
      editorCanvas.change(() => element.toggleAttribute(attribute));
      showToast(ui({ 'data-editor-hidden': element.hasAttribute(attribute) ? 'editor.layerHidden' : 'editor.layerShown',
        'data-editor-locked': element.hasAttribute(attribute) ? 'editor.layerLocked' : 'editor.layerUnlocked' }[attribute]));
    },
    /** An outline on the slide around the element whose row the pointer is over. */
    showHover(element) {
      const overlay = editorCanvas.stageElement && editorCanvas.stageElement.querySelector('.editor-overlay');
      if (!overlay) return;
      let box = overlay.querySelector('.editor-hover-box');
      if (!element || !editorCanvas.scene || !editorCanvas.scene.contains(element)) { if (box) box.hidden = true; return; }
      if (!box) { box = document.createElement('div'); box.className = 'editor-hover-box'; overlay.appendChild(box); }
      const rect = editorCanvas.boxInStage(element);
      box.hidden = false;
      Object.assign(box.style, { left: rect.left + 'px', top: rect.top + 'px', width: rect.width + 'px', height: rect.height + 'px' });
    },

    /* ---- Names (only for the editor) ---- */
    startRename(label) {
      const element = this.elementOf(label);
      if (!element) return;
      const field = document.createElement('input');
      field.className = 'layer-rename';
      field.value = element.getAttribute('data-editor-name') || '';
      field.maxLength = 60;
      field.placeholder = editorTools.textOf(element).slice(0, 40) || editorTools.labelOf(element);
      field.setAttribute('aria-label', ui('editor.elementName'));
      label.replaceWith(field);
      field.focus();
      let done = false;
      const finish = keep => {
        if (done) return;
        done = true;
        if (keep) this.setName(element, field.value); else editor.renderPanel();
      };
      field.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === 'Escape') {   // its own Enter and Esc (Esc must not reach the editor: that would keep the name)
          event.preventDefault();
          event.stopPropagation();
          finish(event.key === 'Enter');
        } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') finish(true);   // the name first, then the editor saves (the key goes on)
      });
      field.addEventListener('blur', () => {
        // a click elsewhere: keep the name without redrawing the panel now (a redraw would swallow that click)
        if (done) return;
        done = true;
        const value = this.cleanName(field.value);
        if (value !== (element.getAttribute('data-editor-name') || '') && editorCanvas.scene && editorCanvas.scene.contains(element)) {
          editorCanvas.finishTyping();
          editor.record();
          this.applyName(element, value);
          editorCanvas.writeBack();
          editor.renderSlideList();
        }
        const refresh = () => { if (field.isConnected) editor.renderPanel(); };   // only if nothing redrew it meanwhile
        document.addEventListener('pointerup', () => setTimeout(refresh, 0), { once: true, capture: true });
        setTimeout(refresh, 600);   // left with the keyboard (Tab): no pointerup comes
      });
    },
    /** '' removes the name. */
    setName(element, name) {
      const value = this.cleanName(name);
      if (value === element.getAttribute('data-editor-name') || (!value && !element.hasAttribute('data-editor-name'))) { editor.renderPanel(); return; }
      editorCanvas.change(() => this.applyName(element, value));
    },
    cleanName(name) { return String(name || '').replace(/\s+/g, ' ').trim().slice(0, 60).replace(/[\uD800-\uDBFF]$/, '').trim(); },   // never half an emoji
    /** Inside a change (Element tab field, or setName above). */
    applyName(element, name) {
      const value = this.cleanName(name);
      if (value) element.setAttribute('data-editor-name', value); else element.removeAttribute('data-editor-name');
    },
    nameFieldHtml(element) {
      return editor.field('editor.elementName', '<input data-element-field="editorName" maxlength="60" value="' + escapeHtml(element.getAttribute('data-editor-name') || '') + '" placeholder="' + escapeHtml(editorTools.textOf(element).slice(0, 40)) + '">', ui('editor.elementNameNote'));
    },

    /* ======== STYLE ======== */

    /* ---- Copy style ---- */
    copyStyle() {
      const element = editorCanvas.selected;
      if (!element) return;
      const values = {};
      COPIED_STYLE.concat(COPIED_SHAPE_STYLE, COPIED_BOX_STYLE).forEach(name => { values[name] = name === 'font-size' ? textSizeOf(element) : element.style.getPropertyValue(name).trim(); });   // (its size as chosen: % of its own size)
      // only what was set in the editor (inline): the slide design's own look is not copied, so nothing would change
      const draw = element.matches('.shape') && element.hasAttribute('data-draw');
      if (!Object.keys(values).some(name => values[name]) && !draw) { showToast(ui('editor.noOwnStyle')); return; }
      this.copiedStyle = { values, shape: element.matches('.shape'), draw };
      showToast(ui('editor.styleCopied'));
      editor.renderPanel();   // Paste style can be pressed now
    },
    pasteStyle() {
      const style = this.copiedStyle;
      if (!style) { showToast(ui('editor.noStyleCopied')); return; }
      if (editorCanvas.locked()) { showToast(ui('editor.scriptedNote')); return; }
      const targets = editorTools.group.length > 1 ? editorTools.group.slice() : [editorCanvas.selected].filter(Boolean);
      if (!targets.length) return;
      editorCanvas.change(() => targets.forEach(target => {
        const flat = target.matches(LINE_SHAPES);   // a line without an outline would be gone
        const names = COPIED_STYLE.concat(style.shape && target.matches('.shape') ? COPIED_SHAPE_STYLE : [], target.matches('.shape, .icon-badge, .image-frame[data-frame], .video-frame[data-frame]') ? [] : COPIED_BOX_STYLE);
        names.forEach(name => {
          const value = style.values[name];
          if (flat && name === '--shape-stroke' && value === '0px') return;
          if (name === 'font-size') writeTextSize(target, value || '');   // (in % of this one's own size)
          else if (value) target.style.setProperty(name, value); else target.style.removeProperty(name);
        });
        if (style.shape && target.matches('.shape')) target.toggleAttribute('data-draw', !!style.draw);   // (Draws itself in, too)
        if (!target.getAttribute('style')) target.removeAttribute('style');
      }));
      showToast(ui('editor.stylePasted', { count: targets.length }));
    },
    /* ---- Text styles ---- */
    /** All styles: the built-in ones, then your own ('own:' + key), as [id, shown name, values (every property), chip size]. */
    allTextStyles() {
      const own = editor.textStyles();
      return TEXT_STYLES.map(([id, label, values, size]) => [id, ui(label), values, size]).concat(Object.keys(own).filter(key => own[key] && typeof own[key] === 'object').map(key => {
        const values = {};
        TEXT_STYLE_PROPS.forEach(name => {   // only a plain value of that property (a file edited by hand may hold anything)
          const value = own[key].values && typeof own[key].values[name] === 'string' ? own[key].values[name].trim() : '';
          values[name] = value && !/[;{}\\<>]|url\(|@/i.test(value) && CSS.supports(name, value) ? value : '';
        });
        const size = clamp((parseFloat(values['font-size']) || 100) / 100 * .85, .7, 1.15).toFixed(2) + 'em';
        return ['own:' + key, String(own[key].name || key), values, size];
      }));
    },
    /** The text style the element has now (all its values the same), or ''. */
    textStyleOf(element) {
      const valueOf = name => (name === 'font-size' ? textSizeOf(editorCanvas.sizeHolderOf(element)) : element.style.getPropertyValue(name).trim());   // (the size as chosen)
      const entry = this.allTextStyles().find(([, , values]) => Object.keys(values).every(name => valueOf(name) === values[name]));
      return entry ? entry[0] : '';
    },
    /** "+ Save as style": the selected text's own look becomes a style of the file (one undo step). */
    saveTextStyle(name) {
      this.namingStyle = false;
      const element = editorCanvas.selected, clean = this.cleanName(name);
      if (!clean || !element) { editor.renderPanel(); return; }
      const values = {};
      TEXT_STYLE_PROPS.forEach(property => { values[property] = property === 'font-size' ? textSizeOf(editorCanvas.sizeHolderOf(element)) : element.style.getPropertyValue(property).trim(); });   // (its size as chosen)
      if (!Object.values(values).some(Boolean)) { showToast(ui('editor.noOwnStyle')); editor.renderPanel(); return; }
      const styles = editor.textStyles();
      // the same name again: that style is updated; another name gets a key of its own (names without a-z or 0-9 too)
      let key = Object.keys(styles).find(existing => styles[existing] && styles[existing].name === clean);
      if (!key) {
        const base = animationName(clean) || 'style';
        key = base;
        for (let n = 2; hasOwn(styles, key); n++) key = base + '-' + n;
      }
      editor.nextLabel = ui('editor.historySaveStyle', { name: clean });
      editor.record();
      editor.nextLabel = null;
      styles[key] = { name: clean, values };
      editor.saveTextStyles(styles);
      editor.changed();
      editor.renderPanel();
      showToast(ui('editor.styleSaved', { name: clean }));
    },
    removeTextStyle(id) {
      const key = String(id || '').replace(/^own:/, '');
      const styles = editor.textStyles();
      if (!hasOwn(styles, key)) return;
      editor.nextLabel = ui('editor.historyRemoveStyle', { name: styles[key].name || key });
      editor.record();
      editor.nextLabel = null;
      delete styles[key];
      editor.saveTextStyles(styles);
      editor.changed();
      editor.renderPanel();
    },
    /** One click: the selected element(s) get a style's whole look (one undo step). */
    applyTextStyle(id) {
      const entry = this.allTextStyles().find(([styleId]) => styleId === id);
      if (!entry) return;
      if (editorCanvas.locked()) { showToast(ui('editor.scriptedNote')); return; }
      const targets = editorTools.group.length > 1 ? editorTools.group.slice() : [editorCanvas.selected].filter(Boolean);
      if (!targets.length) { showToast(ui('editor.stylePick')); return; }
      if (this.refuses(targets)) return;
      editor.nextLabel = ui('editor.historyTextStyle', { name: entry[1] });
      editorCanvas.change(() => targets.forEach(target => {
        Object.entries(entry[2]).forEach(([name, value]) => {
          const holder = ['font-size', 'line-height'].includes(name) ? editorCanvas.sizeHolderOf(target) : target;   // (a shape's text: on its shape)
          if (name === 'color' && target.matches('.note-box') && /--color-accent/.test(value || '')) return;   // (a sticky note is accent paper: an accent text would vanish on it)
          if (name === 'font-size') writeTextSize(holder, value || '');   // (in % of this text's own size)
          else if (value) holder.style.setProperty(name, value); else holder.style.removeProperty(name);
          if (holder !== target) target.style.removeProperty(name);
        });
        if (!target.getAttribute('style')) target.removeAttribute('style');
      }));
      editor.nextLabel = null;
      editorCommands.placeBar();
    },
    /** The style chips, each written in its own look. */
    textStylesHtml(element, disabled, inPopover) {
      const current = element ? this.textStyleOf(element) : '';
      const chips = this.allTextStyles().map(([id, label, values, size]) => {
        const look = ['font-family', 'font-weight', 'font-style', 'text-transform', 'color'].filter(name => values[name]).map(name => name + ': ' + values[name]).join('; ');
        const chip = '<button class="text-style-chip' + (id === current ? ' is-current' : '') + '" data-action="text-style" data-style="' + escapeHtml(id) + '"' + (disabled || '') + ' style="' + escapeHtml('font-size: ' + size + (look ? '; ' + look : '')) + '">' + escapeHtml(label) + '</button>';
        return id.startsWith('own:') ? '<span class="text-style-own">' + chip + '<button class="text-style-remove" data-action="text-style-remove" data-style="' + escapeHtml(id) + '"' + (disabled || '') + ' title="' + escapeHtml(ui('editor.styleRemove', { name: label })) + '" aria-label="' + escapeHtml(ui('editor.styleRemove', { name: label })) + '">×</button></span>' : chip;
      }).join('');
      const naming = this.namingStyle && !disabled && !inPopover;   // the name field only in the panel
      const add = naming ? '<span class="text-style-naming"><input data-tool-field="newTextStyle" maxlength="40" placeholder="' + escapeHtml(ui('editor.styleNamePlaceholder')) + '"><button data-action="text-style-cancel" data-ui="editor.cancel"></button></span>'
        : '<button class="text-style-add" data-action="text-style-new"' + (disabled || '') + ' title="' + escapeHtml(ui('editor.styleSaveTooltip')) + '">' + escapeHtml(ui('editor.styleSave')) + '</button>';
      return '<div class="editor-text-styles" role="group" aria-label="' + escapeHtml(ui('editor.textStyles')) + '">' + chips + add + '</div>';
    },
    styleButtonsHtml(disabled) {
      return '<div class="editor-buttons"><button data-action="copy-style" data-ui="editor.copyStyle" data-ui-title="editor.copyStyleTooltip"></button>' +
        '<button data-action="paste-style"' + (this.copiedStyle ? disabled : ' disabled') + ' data-ui="editor.pasteStyle" data-ui-title="editor.pasteStyleTooltip"></button></div>';
    },

    /* ---- Text size keys: one step of the Style sizes (normal = 100%) ---- */
    stepTextSize(direction) {
      if (editorCanvas.locked()) { showToast(ui('editor.scriptedNote')); return; }
      const sizes = STYLE_SIZES.map(value => value ? parseFloat(value) : 100).sort((a, b) => a - b);
      const targets = (editorTools.group.length > 1 ? editorTools.group.slice() : [editorCanvas.selected]).map(target => editorCanvas.sizeHolderOf(target));   // (a shape's text: its shape)
      const nextOf = target => {
        const now = /%$/.test(textSizeOf(target)) ? parseFloat(textSizeOf(target)) : 100;   // (in % of its own designed size)
        const bigger = sizes.find(size => size > now), smaller = sizes.slice().reverse().find(size => size < now);   // a size in between: the next one
        // (already past the biggest or the smallest step: it stays as it is, A+ never makes it smaller)
        if ((direction > 0 ? bigger : smaller) === undefined) return textSizeOf(target);
        const next = direction > 0 ? bigger : smaller;
        return next === 100 ? '' : next + '%';
      };
      const changes = targets.map(target => [target, nextOf(target)]).filter(([target, size]) => size !== textSizeOf(target));
      if (!changes.length) return;   // already the biggest (smallest): no empty undo step
      editor.nextLabel = ui(direction > 0 ? 'editor.historyBigger' : 'editor.historySmaller');
      try {
        editorCanvas.change(() => changes.forEach(([target, size]) => {
          writeTextSize(target, size);
          if (!target.getAttribute('style')) target.removeAttribute('style');
        }));
      } finally { editor.nextLabel = null; }
    },

    /* ======== APPEARANCE ======== */

    /* ---- Speed of appearing (Element tab, How it appears) ---- */
    speedOf(element) { return element.style.getPropertyValue('animation-duration').trim() || element.style.getPropertyValue('transition-duration').trim(); },
    /** Rising in with the slide is an animation; appearing on a click is a transition. */
    speedProperty(element) { return element.hasAttribute('data-reveal-step') ? 'transition-duration' : 'animation-duration'; },
    speedFieldHtml(element, disabled) {
      const current = this.speedOf(element);
      const choices = APPEAR_SPEEDS.slice();
      if (current && !choices.some(([value]) => value === current)) choices.push([current, '']);   // written by hand in the file
      return editor.field('editor.speed', '<select data-element-field="speed"' + disabled + '>' + choices.map(([value, label]) =>
        '<option value="' + escapeHtml(value) + '"' + (value === current ? ' selected' : '') + '>' + escapeHtml(label ? ui(label) : value) + '</option>').join('') + '</select>');
    },
    /** Only the property of how it appears (see speedProperty); '' removes it. */
    setSpeed(element, value) {
      const own = this.speedProperty(element);
      ['animation-duration', 'transition-duration'].forEach(name => { if (value && name === own) element.style.setProperty(name, value); else element.style.removeProperty(name); });
      if (!element.getAttribute('style')) element.removeAttribute('style');
    },

    /* ---- Easing of appearing (Element tab, How it appears) ---- */
    easeProperty(element) { return element.hasAttribute('data-reveal-step') ? 'transition-timing-function' : 'animation-timing-function'; },
    easeOf(element) { return element.style.getPropertyValue('animation-timing-function').trim() || element.style.getPropertyValue('transition-timing-function').trim(); },
    easeFieldHtml(element, disabled) {
      const current = this.easeOf(element);
      const choices = APPEAR_EASINGS.slice();
      if (current && !choices.some(([value]) => value === current)) choices.push([current, '']);   // written by hand in the file
      return editor.field('editor.ease', '<select data-element-field="ease"' + disabled + '>' + choices.map(([value, label]) =>
        '<option value="' + escapeHtml(value) + '"' + (value === current ? ' selected' : '') + '>' + escapeHtml(label ? ui(label) : value) + '</option>').join('') + '</select>');
    },
    /** Only the property of how it appears (see easeProperty); '' removes it. */
    setEase(element, value) {
      const own = this.easeProperty(element);
      ['animation-timing-function', 'transition-timing-function'].forEach(name => { if (value && name === own) element.style.setProperty(name, value); else element.style.removeProperty(name); });
      if (!element.getAttribute('style')) element.removeAttribute('style');
    },

    /* ---- Copy appearance (How it appears): the way, effect, speed and easing ---- */
    appearOf(element) {
      return { mode: element.hasAttribute('data-reveal-step') ? 'click' : element.classList.contains('reveal') ? 'slide' : 'always',
        step: element.getAttribute('data-reveal-step') || '', effect: element.getAttribute('data-reveal-effect') || '', speed: this.speedOf(element), ease: this.easeOf(element) };
    },
    copyAppear() {
      const element = editorCanvas.selected;
      if (!element) return;
      if (element.hasAttribute('data-animation')) { showToast(ui('editor.appearByAnimation')); return; }
      this.copiedAppear = this.appearOf(element);
      showToast(ui('editor.appearCopied'));
      editor.renderPanel();
    },
    pasteAppear() {
      const source = this.copiedAppear;
      if (!source) { showToast(ui('editor.noAppearCopied')); return; }
      if (editorCanvas.locked()) { showToast(ui('editor.scriptedNote')); return; }
      const all = editorTools.group.length > 1 ? editorTools.group.slice() : [editorCanvas.selected].filter(Boolean);
      const targets = all.filter(target => !target.hasAttribute('data-animation'));   // its own animation decides how it appears
      if (!targets.length) { showToast(ui('editor.appearByAnimation')); return; }
      editorCanvas.change(() => targets.forEach(target => {
        editorCanvas.setAppear(target, source.mode);
        if (source.mode === 'click') {
          if (source.step) target.setAttribute('data-reveal-step', source.step);   // the same click
          if (source.effect && editorCanvas.effectFits(target, source.effect)) target.setAttribute('data-reveal-effect', source.effect); else target.removeAttribute('data-reveal-effect');   // (a tick only on a point of a list)
        }
        this.setSpeed(target, source.mode === 'always' ? '' : source.speed);
        this.setEase(target, source.mode === 'always' ? '' : source.ease);
      }), { rerender: true });
      showToast(ui('editor.appearPasted', { count: targets.length }) + (targets.length < all.length ? ' ' + ui('editor.appearSkipped', { count: all.length - targets.length }) : ''));
    },
    appearButtonsHtml(disabled) {
      return '<div class="editor-buttons"><button data-action="copy-appear" data-ui="editor.copyAppear" data-ui-title="editor.copyAppearTooltip"></button>' +
        '<button data-action="paste-appear"' + (this.copiedAppear ? disabled : ' disabled') + ' data-ui="editor.pasteAppear" data-ui-title="editor.pasteAppearTooltip"></button></div>';
    },

    /* ---- Preview how one element appears (▶ Preview) ---- */
    previewButtonHtml() {
      return '<div class="editor-buttons"><button data-action="preview-appear" data-ui="editor.previewAppear" data-ui-title="editor.previewAppearTooltip"></button></div>';
    },
    /** The @keyframes rule called `name`, as keyframes for element.animate (null when there is none). */
    keyframesNamed(name) {
      for (const sheet of Array.from(document.styleSheets)) {
        let rules;
        try { rules = sheet.cssRules; } catch (e) { continue; }
        const rule = Array.from(rules).find(item => item instanceof CSSKeyframesRule && item.name === name);
        if (!rule) continue;
        const frames = [];
        Array.from(rule.cssRules).forEach(frame => frame.keyText.split(',').forEach(key => {
          const offset = key.trim() === 'from' ? 0 : key.trim() === 'to' ? 1 : parseFloat(key) / 100;
          const values = { offset };
          for (let i = 0; i < frame.style.length; i++) {
            const property = frame.style[i];
            values[property.replace(/-([a-z])/g, (whole, letter) => letter.toUpperCase())] = frame.style.getPropertyValue(property);
          }
          frames.push(values);
        }));
        frames.sort((a, b) => a.offset - b.offset);
        return frames.length ? frames : null;
      }
      return null;
    },
    /** A CSS list split at its top-level commas ("linear(0, .2 4%, 1), ease" is two items). */
    listOf(value) {
      const items = [];
      let depth = 0, start = 0;
      for (let i = 0; i < value.length; i++) {
        if (value[i] === '(') depth++;
        else if (value[i] === ')') depth--;
        else if (value[i] === ',' && depth === 0) { items.push(value.slice(start, i).trim()); start = i + 1; }
      }
      items.push(value.slice(start).trim());
      return items;
    },
    toMs(value) { return /ms$/.test(value) ? parseFloat(value) : (parseFloat(value) || 0) * 1000; },
    /** Plays how the element appears, with what the slide's CSS gives it (read from the invisible copy, section 19):
        with the slide its @keyframes; on a click each changing property with its own duration, easing and delay. */
    previewAppear(element) {
      if (!element || !editorCanvas.scene || !editorCanvas.scene.contains(element) || element.hasAttribute('data-animation') || editorTools.playStep >= 0) return;
      const mode = this.appearOf(element).mode;
      if (mode === 'always') return;
      if (mode !== 'slide' && element.getAttribute('data-reveal-effect') === 'tick') {   // Gets ticked: its ✓ pops into the box (the ::before)
        try { element.animate([{ scale: .6 }, { scale: 1.2 }, { scale: 1 }], { pseudoElement: '::before', duration: 400, easing: 'ease-out' }); } catch (error) { /* an older browser: it stays ticked */ }
        return;
      }
      if (mode !== 'slide' && element.getAttribute('data-reveal-effect') === 'circled') {   // Gets circled: its ring (the ::after) draws itself
        try { element.animate({ '--circle-drawn': ['0%', '100%'] }, { pseudoElement: '::after', duration: 900, easing: 'cubic-bezier(.2, .75, .2, 1)' }); } catch (error) { /* an older browser: the ring stays whole */ }
        return;
      }
      editorTools.makeTimingProbe();
      const probe = editorTools.timingProbe;
      let copy = probe && probe.scene;
      for (const index of editorCanvas.pathOf(element)) copy = copy && copy.children[index];
      if (!copy) return;
      const camel = name => name.replace(/-([a-z])/g, (whole, letter) => letter.toUpperCase());
      const parts = [];   // [{ keyframes, duration, easing, delay }]
      const style = getComputedStyle(copy);
      if (mode === 'slide') {
        const names = this.listOf(style.animationName), durations = this.listOf(style.animationDuration), easings = this.listOf(style.animationTimingFunction);
        const keyframes = this.keyframesNamed(names[0]);
        if (keyframes) parts.push({ keyframes, duration: this.toMs(durations[0]), easing: easings[0], delay: 0 });
      } else {
        // each transition-property with the duration, easing and delay at its place (shorter lists repeat, as in CSS)
        const properties = this.listOf(style.transitionProperty), durations = this.listOf(style.transitionDuration);
        const easings = this.listOf(style.transitionTimingFunction), delays = this.listOf(style.transitionDelay);
        const known = ['opacity', 'transform', 'filter', 'color', 'background-color', 'background-size', 'clip-path'];   // (clip-path: Wipes in)
        const timings = {};
        properties.forEach((property, i) => (property === 'all' ? known : [property]).forEach(name => {
          timings[name] = { duration: this.toMs(durations[i % durations.length]), easing: easings[i % easings.length], delay: this.toMs(delays[i % delays.length]) };
        }));
        copy.style.transition = 'none';   // the end values at once, not the start of a transition
        const read = () => { const now = getComputedStyle(copy); const values = {}; known.forEach(name => { values[name] = now.getPropertyValue(name); }); return values; };
        const wasRevealed = copy.classList.contains('is-revealed');
        copy.classList.remove('is-revealed');
        const before = read();
        copy.classList.add('is-revealed');
        const after = read();
        const revealedStyle = getComputedStyle(copy);
        const clickAnimation = { name: this.listOf(revealedStyle.animationName)[0], duration: this.listOf(revealedStyle.animationDuration)[0], easing: this.listOf(revealedStyle.animationTimingFunction)[0] };
        copy.classList.toggle('is-revealed', wasRevealed);
        copy.style.transition = '';
        const clickKeyframes = clickAnimation.name && clickAnimation.name !== 'none' ? this.keyframesNamed(clickAnimation.name) : null;   // an effect that is an animation (Shakes)
        if (clickKeyframes) parts.push({ keyframes: clickKeyframes, duration: this.toMs(clickAnimation.duration), easing: clickAnimation.easing, delay: 0 });
        known.forEach(name => {
          const timing = timings[name];
          if (!timing || !(timing.duration > 0) || before[name] === after[name]) return;
          parts.push({ keyframes: [{ [camel(name)]: before[name] }, { [camel(name)]: after[name] }], duration: timing.duration, easing: timing.easing, delay: timing.delay });
        });
      }
      if (!parts.length || !parts.some(part => part.duration > 0)) { showToast(ui('editor.previewNothing')); return; }
      const slowedDown = window.matchMedia('(prefers-reduced-motion: reduce)').matches && !root.classList.contains('force-motion');
      this.stopPreview();
      element.classList.add('is-previewing');   // the still rules skip .is-previewing, so the preview can move it
      const animations = parts.map(part => {
        const timing = { duration: Math.max(slowedDown ? 400 : 1, part.duration), delay: part.delay, fill: 'backwards', easing: part.easing || 'ease' };
        try { return element.animate(part.keyframes, timing); }
        catch (e) { delete timing.easing; return element.animate(part.keyframes, timing); }   // an easing the animation cannot take
      });
      const preview = { element, animations };
      this.previewing = preview;
      Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
        if (this.previewing !== preview) return;   // a newer preview (or stopPreview) took over
        element.classList.remove('is-previewing');
        this.previewing = null;
      });
    },

    /* ======== CANVAS ======== */

    /* ---- Grid and Snap (under the canvas) ---- */
    showView() {
      const stage = editor.element && editor.element.querySelector('.editor-stage');
      if (!stage) return;
      stage.classList.toggle('show-grid', this.grid);
      editor.element.querySelector('[data-action="view-grid"]').setAttribute('aria-pressed', String(this.grid));
      editor.element.querySelector('[data-action="view-snap"]').setAttribute('aria-pressed', String(this.snapping));
    },
    setView(changes) {
      Object.assign(this, changes);
      try { localStorage.setItem(DECK_ID + '-editor.view', JSON.stringify({ grid: this.grid, snapping: this.snapping })); } catch (e) { /* not kept */ }
      this.showView();
    },

    /* ---- Line up a freely placed element in the box it is placed in ---- */
    lineUpHtml(element, disabled) {
      if (editorTools.group.length > 1) return '';   // a group has its own Left / Centre / ... (they line up with each other)
      const button = (edge, label) => '<button data-action="line-up-' + edge + '"' + disabled + ' data-ui="' + label + '"></button>';
      return '<p class="editor-note">' + escapeHtml(ui(this.lineUpOnSlide(element) ? 'editor.lineUpSlide' : 'editor.lineUpBox')) + '</p>' +
        '<div class="editor-buttons">' + button('left', 'editor.alignLeft') + button('centre', 'editor.alignCenter') + button('right', 'editor.alignRight') +
        button('top', 'editor.lineUpTop') + button('middle', 'editor.lineUpMiddle') + button('bottom', 'editor.lineUpBottom') + '</div>';
    },
    /** On the slide: placed on the slide itself, or in its layout column (.content, no box of its own). */
    lineUpOnSlide(element) { return element.parentElement === editorCanvas.scene || element.parentElement.matches('.content'); },
    lineUp(edge) {
      const element = editorCanvas.selected;
      if (!element || !editorCanvas.isFree(element) || editorCanvas.locked() || this.refuses([element])) return;
      const box = editorCanvas.boxInStage(element);
      const origin = this.lineUpOnSlide(element) ? { left: 0, top: 0, width: CONFIG.stage.width, height: CONFIG.stage.height } : editorCanvas.freeOrigin(element);
      const dx = { left: origin.left - box.left, centre: origin.left + origin.width / 2 - (box.left + box.width / 2), right: origin.left + origin.width - (box.left + box.width) }[edge] || 0;
      const dy = { top: origin.top - box.top, middle: origin.top + origin.height / 2 - (box.top + box.height / 2), bottom: origin.top + origin.height - (box.top + box.height) }[edge] || 0;
      editorCanvas.change(() => editorTools.shift(element, dx, dy));
      showToast(ui('editor.linedUp_' + edge));   // (what happened, and where)
    },

    /* ---- Pan a zoomed slide: Space + drag, or the middle mouse button ---- */
    scrollArea() { return editor.element.querySelector('.editor-canvas-scroll'); },
    canScroll() { const area = this.scrollArea(); return area.scrollWidth > area.clientWidth + 1 || area.scrollHeight > area.clientHeight + 1; },
    /** Space pans only when the keyboard is on the canvas (not on a button, where Space presses it). */
    canPan() {
      const active = document.activeElement;
      const onCanvas = !active || active === document.body || active === editor.element ||
        (editor.element.querySelector('.editor-canvas').contains(active) && !active.isContentEditable && !active.matches('button, input, select, textarea'));
      return onCanvas && this.canScroll();
    },
    setSpace(on) {
      this.spaceHeld = on;
      if (editor.element) editor.element.querySelector('.editor-canvas').classList.toggle('is-pan-ready', on);
    },
    startPan(event) {
      const area = event.currentTarget;
      if (!(event.button === 1 || (event.button === 0 && this.spaceHeld)) || !this.canScroll()) return;
      event.preventDefault();
      event.stopPropagation();   // no selecting or dragging of elements
      const start = { x: event.clientX, y: event.clientY, left: area.scrollLeft, top: area.scrollTop };
      const canvas = area.parentElement;
      canvas.classList.add('is-panning');
      try { area.setPointerCapture(event.pointerId); } catch (e) { /* the pointer is gone already */ }
      const onMove = moveEvent => {
        area.scrollLeft = start.left - (moveEvent.clientX - start.x);
        area.scrollTop = start.top - (moveEvent.clientY - start.y);
      };
      const onEnd = () => {
        area.removeEventListener('pointermove', onMove);
        area.removeEventListener('pointerup', onEnd);
        area.removeEventListener('pointercancel', onEnd);
        canvas.classList.remove('is-panning');
      };
      area.addEventListener('pointermove', onMove);
      area.addEventListener('pointerup', onEnd);
      area.addEventListener('pointercancel', onEnd);
    },

    /* ---- Distances (hold Alt over another element) ---- */
    /** Lines with the gap in slide pixels between the selection and the element under the pointer (or the slide's edges, when
        the pointer is over the selection itself, the slide, or an element that holds it). event null: hides them. */
    showDistances(event) {
      const overlay = editorCanvas.stageElement && editorCanvas.stageElement.querySelector('.editor-overlay');
      if (!overlay) return;
      overlay.querySelectorAll('.editor-distance').forEach(mark => mark.remove());
      const selected = editorCanvas.selected;
      if (!event || !selected || !editorCanvas.scene || !editorCanvas.scene.contains(selected) || editorTools.playStep >= 0) return;
      const under = document.elementFromPoint(event.clientX, event.clientY);
      const target = under && editorCanvas.scene.contains(under) ? editorCanvas.blockOf(under) : null;
      const a = editorCanvas.boxInStage(selected);
      const holds = !target || target === selected || target.contains(selected) || selected.contains(target);
      const b = holds ? (target && target !== selected && target.contains(selected) ? editorCanvas.boxInStage(target) : { left: 0, top: 0, width: CONFIG.stage.width, height: CONFIG.stage.height }) : editorCanvas.boxInStage(target);
      const line = (axis, from, to, at) => {
        const length = Math.abs(to - from);
        if (length < 1) return;
        const mark = document.createElement('div');
        mark.className = 'editor-distance is-' + axis;
        mark.dataset.label = Math.round(length);
        Object.assign(mark.style, axis === 'x' ? { left: Math.min(from, to) + 'px', width: length + 'px', top: at + 'px' } : { top: Math.min(from, to) + 'px', height: length + 'px', left: at + 'px' });
        overlay.appendChild(mark);
      };
      const middleY = a.top + a.height / 2, middleX = a.left + a.width / 2;
      if (holds) {   // inside: to each edge of what holds it
        line('x', b.left, a.left, middleY); line('x', a.left + a.width, b.left + b.width, middleY);
        line('y', b.top, a.top, middleX); line('y', a.top + a.height, b.top + b.height, middleX);
        return;
      }
      // side by side: the gap across and the gap up or down (where they overlap, in the middle of the overlap)
      const overlapY = [Math.max(a.top, b.top), Math.min(a.top + a.height, b.top + b.height)];
      const overlapX = [Math.max(a.left, b.left), Math.min(a.left + a.width, b.left + b.width)];
      const atY = overlapY[1] > overlapY[0] ? (overlapY[0] + overlapY[1]) / 2 : middleY;
      const atX = overlapX[1] > overlapX[0] ? (overlapX[0] + overlapX[1]) / 2 : middleX;
      if (a.left + a.width <= b.left) line('x', a.left + a.width, b.left, atY);
      else if (b.left + b.width <= a.left) line('x', b.left + b.width, a.left, atY);
      if (a.top + a.height <= b.top) line('y', a.top + a.height, b.top, atX);
      else if (b.top + b.height <= a.top) line('y', b.top + b.height, a.top, atX);
    },

    /* ---- Ctrl+drag: a copy stays where the element was ---- */
    /** Copies in front of the dragged elements (so these stay on top); returned to remove them again when nothing moved. */
    leaveCopies(list) {
      return list.map(item => {
        const copy = item.cloneNode(true);
        copy.classList.remove('is-editor-selected');
        copy.removeAttribute('id');
        copy.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
        this.unmark(copy);
        const space = item.previousSibling && item.previousSibling.nodeType === Node.TEXT_NODE && !item.previousSibling.textContent.trim() ? item.previousSibling.cloneNode() : document.createTextNode('\n');
        item.before(copy, space);   // on a line of its own in the file
        return [copy, space];
      }).flat();
    },

    /* ======== SLIDES ======== */

    /* ---- Every slide (Slide tab): this slide's transition or background on all slides, one undo step ---- */
    useOnEverySlide(apply) {
      // only the slides it really changes (tried on a copy of each <section> tag first): no empty undo step, no 'unsaved' for nothing
      // (several slides picked in the slide list: only those)
      const scenes = (editor.pickedSlides() || editor.modelScenes()).filter(scene => {
        if (scene === editor.selected) return false;
        const copy = scene.cloneNode(false);
        apply(copy);
        return copy.outerHTML !== scene.cloneNode(false).outerHTML;
      });
      if (!scenes.length) { showToast(ui('editor.alreadyOnEverySlide')); return; }
      editor.record();
      scenes.forEach(scene => { apply(scene); editor.changed(scene); });
      editor.renderAll();
      showToast(ui('editor.usedOnEverySlide', { count: scenes.length }));
    },

    /* ---- Overview: every slide large in one window (the editor's dialog) ---- */
    /** options.redraw: after a move, undo or redo (keeps the scroll and the keyboard place); otherwise opens it at the open slide. */
    openOverview(options) {
      const redraw = !!(options && options.redraw);
      const card = editor.element.querySelector('.editor-dialog-card');
      const scrolled = card.scrollTop;
      const focused = document.activeElement && document.activeElement.closest && document.activeElement.closest('.editor-template-grid button[data-name]');
      const focusName = focused ? focused.dataset.name : options && options.focus;
      const dialog = editor.openDialog(ui('editor.overviewTitle'), { overview: true, done: true });
      const grid = dialog.querySelector('.editor-template-grid');
      grid.innerHTML = '';
      const assets = editor.modelAssets();
      editor.modelScenes().forEach((scene, index) => {
        const item = document.createElement('button');
        item.dataset.action = 'overview-open';
        item.dataset.name = scene.getAttribute('data-name');   // by name: a stale picture can never open or move another slide
        item.draggable = true;
        item.classList.toggle('is-selected', scene === editor.selected);
        item.innerHTML = '<div class="editor-thumb still-slide"><div class="editor-thumb-stage"></div></div><span></span>';
        item.querySelector('span').textContent = (index + 1) + '. ' + (scene.getAttribute('data-title') || scene.getAttribute('data-name')) + (scene.hasAttribute('data-backup') ? ' · ' + ui('editor.badgeBackup') : '');
        item.querySelector('.editor-thumb-stage').appendChild(editorCanvas.stillCopyOf(scene, assets));
        grid.appendChild(item);
      });
      scaleThumbnails(grid);
      const keep = focusName && grid.querySelector('button[data-name="' + CSS.escape(focusName) + '"]');
      if (redraw) {
        card.scrollTop = scrolled;
        if (keep) keep.focus({ preventScroll: true });
      } else {
        const current = grid.querySelector('.is-selected');
        if (current) { current.scrollIntoView({ block: 'nearest' }); current.focus(); }
      }
    },
    sceneNamed(name) { return editor.modelScenes().find(scene => scene.getAttribute('data-name') === name) || null; },
    /** Where a drop goes, from the pointer: before the picture under it or the next one on its row (also in the gaps);
        null = after the last picture (to the end). */
    dropTargetAt(grid, x, y) {
      for (const item of grid.querySelectorAll('button[data-name]')) {
        const box = item.getBoundingClientRect();
        if (y < box.top) return item;                       // in the gap above this row
        if (y <= box.bottom + 12 && x < box.right) return item;   // on this row (or the gap under it), left of its right edge
      }
      return null;
    },
    /** Drag a slide in the overview to another place (as in the slide list). */
    setUpOverview() {
      const grid = editor.element.querySelector('.editor-template-grid');
      let dragged = null;
      const clearMarks = () => grid.querySelectorAll('.is-drop-before, .is-drop-after').forEach(item => item.classList.remove('is-drop-before', 'is-drop-after'));
      grid.addEventListener('dragstart', event => {
        const item = grid.classList.contains('is-overview') && event.target.closest && event.target.closest('button[data-name]');
        if (!item) return;
        dragged = this.sceneNamed(item.dataset.name);
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', item.dataset.name);
      });
      grid.addEventListener('dragover', event => {
        if (!dragged) return;
        event.preventDefault();
        clearMarks();
        const target = this.dropTargetAt(grid, event.clientX, event.clientY);
        const items = grid.querySelectorAll('button[data-name]');
        if (target) target.classList.add('is-drop-before'); else if (items.length) items[items.length - 1].classList.add('is-drop-after');
      });
      grid.addEventListener('drop', event => {
        clearMarks();
        if (!dragged) return;
        event.preventDefault();
        const targetItem = this.dropTargetAt(grid, event.clientX, event.clientY);
        const all = editor.modelScenes();
        const target = targetItem ? this.sceneNamed(targetItem.dataset.name) : null;
        const staysPut = target === dragged || all[all.indexOf(dragged) + 1] === target || (!target && all[all.length - 1] === dragged);
        const moving = dragged;
        dragged = null;
        if (staysPut) return;
        // moveSlide redraws everything, the overview too (renderAll); the moved slide keeps the keyboard
        runSafely('editor: overview move', () => {
          editor.moveSlide(moving, target);
          const moved = grid.querySelector('button[data-name="' + CSS.escape(moving.getAttribute('data-name')) + '"]');
          if (moved) moved.focus({ preventScroll: true });
        });
      });
      grid.addEventListener('dragend', () => { dragged = null; clearMarks(); });
    },

    /* ---- Preview the slide's transition (Slide tab): a playing copy of the slide before it and of this slide ---- */
    previewTransition() {
      const scene = editor.selected;
      if (!scene || !editorCanvas.stageElement) return;
      if (editorTools.playStep >= 0) editorTools.stopPlaying();
      this.stopPreview();
      const scenes = editor.modelScenes();
      const before = scenes[scenes.indexOf(scene) - 1] || null;
      const assets = editor.modelAssets();
      const playingCopy = source => {   // like the canvas copy, but it may move (no still-slide around it)
        const copy = document.importNode(source, true);
        copy.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
        resolveAssets(copy, assets);
        copy.querySelectorAll('.qr-code').forEach(element => runSafely('QR code', () => drawQrCode(element)));
        copy.querySelectorAll('.chart').forEach(figure => runSafely('chart', () => drawChart(figure)));
        copy.querySelectorAll('video').forEach(video => { video.removeAttribute('autoplay'); video.muted = true; });
        const behaviour = slideBehaviours[source.getAttribute('data-name')];   // a slide with its own script draws what it needs (as on the canvas)
        if (behaviour && behaviour.preparePreview) runSafely('editor preview', () => behaviour.preparePreview(copy));
        copy.inert = true;
        return copy;
      };
      editorTools.applyModelAnimations();   // the animations made in the editor play too (as in Play slide)
      const stage = document.createElement('div');
      stage.className = 'stage editor-transition-preview';
      stage.setAttribute('style', editor.model.getElementById('deck').getAttribute('style') || '');   // the pace set in the Presentation tab
      stage.style.transform = editorCanvas.stageElement.style.transform;   // the canvas's scale
      stage.dataset.direction = 'forward';
      stage.dataset.transition = scene.getAttribute('data-transition') || '';
      stage.dataset.transitionSpeed = scene.getAttribute('data-transition-speed') || '';
      stage.setAttribute('aria-hidden', 'true');
      stage.dataset.slide = scene.getAttribute('data-name');   // the logo's size and place follow the slide (as in the presentation)
      const logo = editor.modelStage().querySelector(':scope > .logo');
      if (logo) { const logoCopy = document.importNode(logo, true); resolveAssets(logoCopy, assets); stage.appendChild(logoCopy); }
      const incoming = playingCopy(scene);
      const outgoing = before ? playingCopy(before) : null;
      if (outgoing) {   // the slide before shows as it ends: everything there (its clicks done, its rise-ins finished)
        outgoing.classList.add('is-active', 'is-visible');
        outgoing.querySelectorAll('[data-reveal-step]').forEach(item => item.classList.add('is-revealed'));
        if (outgoing.hasAttribute('data-end-state')) outgoing.classList.add('is-finished');
        stage.appendChild(outgoing);
      }
      stage.appendChild(incoming);
      editorCanvas.stageElement.parentElement.appendChild(stage);
      if (outgoing && ['cover', 'wipe'].includes(stage.dataset.transition)) outgoing.style.clipPath = 'inset(0 0 0 0)';   // Cover, Wipe: its clip starts whole (as leaveScene does)
      if (outgoing && ['circle', 'split'].includes(stage.dataset.transition)) outgoing.style.setProperty('--scene-hole', '0%');   // Circle: its hole starts closed
      if (outgoing && stage.dataset.transition === 'cube') Object.assign(outgoing.style, { transition: 'none', transform: CUBE_FACING });   // Cube: from where it faces you (as leaveScene does)
      void stage.offsetWidth;   // the start positions first, then the change (as goToSlide does)
      if (outgoing) outgoing.getAnimations({ subtree: true }).forEach(animation => { try { animation.finish(); } catch (e) { /* an endless one */ } });
      if (outgoing) { outgoing.classList.remove('is-active'); outgoing.classList.add('is-leaving'); outgoing.style.removeProperty('clip-path'); outgoing.style.removeProperty('--scene-hole'); if (stage.dataset.transition === 'cube') { outgoing.style.removeProperty('transform'); outgoing.style.removeProperty('transition'); } }
      incoming.classList.add('is-active', 'is-visible');
      stage.addEventListener('pointerdown', () => this.stopPreview());   // a click ends it
      this.transitionPreview = { stage, timer: setTimeout(() => this.stopPreview(), CONFIG.editor.transitionPreviewMs) };
    },
    /** Ends a running preview at once (a new preview, Play slide, a redraw). */
    stopPreview() {
      if (this.transitionPreview) {
        clearTimeout(this.transitionPreview.timer);
        this.transitionPreview.stage.remove();
        this.transitionPreview = null;
        if (editorTools.playStep < 0) { const style = byId('editorAnimationStyles'); if (style) style.remove(); }   // Play slide keeps its own
      }
      const preview = this.previewing;
      if (!preview) return;
      this.previewing = null;
      preview.element.classList.remove('is-previewing');
      preview.animations.forEach(animation => animation.cancel());
    },

    /* ======== LOGO ======== */

    /** The Logo group of the Presentation tab. */
    logoPanelHtml() {
      const logo = editor.modelStage().querySelector(':scope > .logo');
      if (!logo) return '';
      const corner = logo.getAttribute('data-corner') || '';
      const corners = LOGO_CORNERS.map(([value, label]) => '<option value="' + value + '"' + (value === corner ? ' selected' : '') + '>' + escapeHtml(ui(label)) + '</option>').join('');
      const check = (field, on, label) => '<label class="editor-check"><input type="checkbox" data-logo-field="' + field + '"' + (on ? ' checked' : '') + '><span>' + escapeHtml(ui(label)) + '</span></label>';
      return '<h4 class="editor-logo-heading" data-ui="editor.sectionLogo"></h4>' +
        '<div class="editor-buttons"><button data-action="replace-logo" data-ui="editor.replaceLogo"></button></div>' +
        check('show', !logo.hasAttribute('hidden'), 'editor.logoShow') +
        '<div class="editor-row">' + editor.field('editor.logoCorner', '<select data-logo-field="corner">' + corners + '</select>') +
        editor.field('editor.logoSize', '<input type="number" min="10" max="100" step="1" data-logo-field="size" value="' + this.logoSize(logo) + '">') + '</div>' +
        check('large', logo.getAttribute('data-large') !== 'off', 'editor.logoLarge');
    },
    /** Size in the corner, in % of the logo's full size (the CSS default is 37%). */
    logoSize(logo) {
      const match = (logo.getAttribute('style') || '').match(/--logo-scale:\s*([\d.]+)/);
      return match ? Math.round(parseFloat(match[1]) * 100) : 37;
    },
    /** A Logo field changed: one undo step. */
    setLogo(input) {
      const logo = editor.modelStage().querySelector(':scope > .logo');
      if (!logo) return;
      const field = input.dataset.logoField;
      editor.edit(() => {
        if (field === 'show') logo.toggleAttribute('hidden', !input.checked);
        else if (field === 'large') { if (input.checked) logo.removeAttribute('data-large'); else logo.setAttribute('data-large', 'off'); }
        else if (field === 'corner') { if (input.value) logo.setAttribute('data-corner', input.value); else logo.removeAttribute('data-corner'); }
        else if (field === 'size') {
          const typed = parseFloat(input.value);
          const percent = Number.isFinite(typed) ? clamp(Math.round(typed), 10, 100) : 37;   // empty or not a number: normal size
          logo.style.removeProperty('--logo-scale');
          if (percent !== 37) logo.style.setProperty('--logo-scale', String(percent / 100));
          if (!logo.getAttribute('style')) logo.removeAttribute('style');
        }
      }, { node: logo });
    },
    /** A click on the logo on the canvas: the Presentation tab, scrolled to the Logo group. */
    openLogoSettings() {
      editorCanvas.selectElement(null);
      editor.panelTab = 'deck';
      editor.renderPanel();
      editorCommands.openDock('right');   // a hidden panel: show it (section 20c)
      const heading = editor.element.querySelector('.editor-logo-heading');
      const body = editor.element.querySelector('.editor-panel-body');
      if (heading && body) body.scrollTop += heading.getBoundingClientRect().top - body.getBoundingClientRect().top;   // only the panel scrolls
    },

    /** A row's name in the Layers tab: its own name; a block that holds several others by what it is and how many
        ("Cards · 3 items", not all their words run together); else its text or kind (labelOf). Its text is the row's tooltip. */
    layerName(element) {
      const own = this.cleanName(element.getAttribute('data-editor-name'));
      if (own) return '“' + own + '”';
      const blocks = Array.from(element.children).filter(child => !INLINE_TAGS.has(child.tagName) && !child.matches('.speaker-notes, style, script, svg'));
      if (blocks.length >= 2) return editorCanvas.partNameOf(element) + ' · ' + ui('editor.layerItems', { count: blocks.length });
      return editorTools.labelOf(element);
    },

    /* ======== UNDO HISTORY ======== */

    /* ---- History (▾ next to Undo): the last changes by name ---- */
    openHistory(button) {
      const steps = editor.history.slice(-20).reverse();
      const time = ms => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      this.openList(button, 'editor-history', steps.length ? steps.map((step, i) => '<button role="menuitem" data-action="history-go" data-steps="' + (i + 1) + '">' +
        '<span>' + escapeHtml(step.label || ui('editor.historyChange')) + '</span><small>' + escapeHtml([step.where, step.time ? time(step.time) : ''].filter(Boolean).join(' · ')) + '</small></button>').join('') :
        '<p class="editor-note">' + escapeHtml(ui('editor.historyEmpty')) + '</p>');
    },
    /* ---- + Insert (bar): what Insert in the Element tab offers, at any time ---- */
    /* (a grid in groups, as Canva's or PowerPoint's Insert: each kind with a small picture; a shape shows itself;
        what is placed freely says so on hover; kinds not in a group land in the last group, so none is ever missing) */
    openInsertMenu(button) {
      const groups = INSERT_GROUPS.map(([label, kinds]) => [label, kinds.filter(kind => INSERT_BLOCKS.includes(kind) || FREE_TEXTS.includes(kind) || hasOwn(SHAPES, kind))]);
      const listed = new Set(groups.flatMap(([, kinds]) => kinds));
      groups[groups.length - 1][1].push(...INSERT_BLOCKS.concat(FREE_TEXTS, Object.keys(SHAPES)).filter(kind => !listed.has(kind)));
      const free = kind => FREE_TEXTS.includes(kind) || hasOwn(SHAPES, kind);
      // a tile shows the short name ("Icon", not "Icon (a symbol in a round badge)"; "Eyebrow (small label)" shows "Small label");
      // the full name is its tooltip
      const fullName = kind => ui('editor.block' + kind.replace(/^./, c => c.toUpperCase()));
      const shortName = kind => {
        const [, main, extra] = fullName(kind).match(/^(.*?)\s*(?:\((.*)\))?\s*…?$/) || [, fullName(kind), ''];
        return kind === 'eyebrow' && extra ? extra.replace(/^./, c => c.toUpperCase()) : main;
      };
      const icon = kind => hasOwn(SHAPES, kind) ? '<svg viewBox="0 0 100 100" aria-hidden="true">' + SHAPES[kind] + '</svg>' : escapeHtml(INSERT_ICONS[kind] || '+');
      const item = kind => '<button role="menuitem" class="insert-tile" data-action="insert-kind" data-kind="' + kind + '" title="' + escapeHtml(fullName(kind) + (free(kind) ? ' · ' + ui('editor.insertFreeTip') : '')) + '">' +
        '<span class="insert-icon" aria-hidden="true">' + icon(kind) + '</span><span>' + escapeHtml(shortName(kind)) + '</span></button>';
      this.openList(button, 'editor-insert-menu', '<p class="editor-menu-heading">' + escapeHtml(ui(editorCanvas.insertAnchor() ? 'editor.insertAfter' : 'editor.insertAtEnd')) + '</p>' +
        groups.filter(([, kinds]) => kinds.length).map(([label, kinds]) => '<p class="editor-menu-heading">' + escapeHtml(ui(label)) + '</p><div class="insert-grid">' + kinds.map(item).join('') + '</div>').join(''));
    },
    /** A pop-up list under a bar button (History, + Insert): one at a time; a second click on its button closes it. */
    openList(button, className, innerHtml) {
      if (this.closeHistory()) return;
      const list = this.historyList = document.createElement('div');
      this.historyButton = button;   // keyboard: Esc gives it the focus back
      list.className = 'editor-menu ' + className;
      list.setAttribute('role', 'menu');
      list.innerHTML = innerHtml;
      editor.element.appendChild(list);
      const box = button.getBoundingClientRect();
      list.style.left = box.left + 'px';
      list.style.top = box.bottom + 6 + 'px';
      const room = window.innerWidth - 8 - list.getBoundingClientRect().right;   // (a wide list stays on the screen)
      if (room < 0) list.style.left = Math.max(8, box.left + room) + 'px';
      // (no room below the button but more above, e.g. the selection bar near the bottom: it opens upward)
      const below = window.innerHeight - box.bottom - 14, above = box.top - 14;
      if (list.offsetHeight > below && above > below) {
        list.style.top = Math.max(8, box.top - 6 - Math.min(list.offsetHeight, above)) + 'px';
        fitMenuOnScreen(list);
      } else fitMenuOnScreen(list, true);   // (a long list scrolls, under its button)
      const first = list.querySelector('button');
      if (first) first.focus();
      this.historyOutside = event => { if (!list.contains(event.target) && !button.contains(event.target)) this.closeHistory(); };   // ▾ itself toggles it
      document.addEventListener('pointerdown', this.historyOutside, true);
    },
    /** Keys while the list is open: arrows, Home and End move through it, Enter and Space press the item, any other key
        closes it; nothing reaches the slide. True when the list was open. */
    onHistoryKey(event) {
      if (!this.historyList) return false;
      const items = Array.from(this.historyList.querySelectorAll('button'));
      const index = items.indexOf(document.activeElement);
      if (['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) {   // (← → too: + Insert is a grid)
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (['ArrowDown', 'ArrowRight'].includes(event.key) ? 1 : -1) + items.length) % items.length;
        if (items[next]) items[next].focus();
      } else if (event.key !== 'Enter' && event.key !== ' ') {
        event.preventDefault();
        const button = this.historyButton;
        this.closeHistory();
        if (button && button.isConnected) button.focus();
      }
      return true;
    },
    /** True when the list was open. */
    closeHistory() {
      if (!this.historyList) return false;
      this.historyList.remove();
      this.historyList = null;
      editorMotion.endQuickHover();   // (a quick animation looping under the pointer stops with the list)
      document.removeEventListener('pointerdown', this.historyOutside, true);
      return true;
    },
  };
