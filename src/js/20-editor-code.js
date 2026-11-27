  /* ===========================================================================
     20e. EDITOR CODE: the Code tab (the object editorCode)
     Three places for CSS, each the same text the file holds (no copy):
       THIS ELEMENT        its style attribute: what Style, Place freely, Speed and the
                           other fields write. A field changes it here; a line typed
                           here changes the field. A line the browser does not know
                           is left out (the count says how many it took).
       RULES OF THIS       what its style attribute cannot hold: &:hover { … }, & b { … },
       ELEMENT             transitions … Kept in the slide as <style data-element-css="id">
                           @scope { [data-css="id"] { … } }; the element gets data-css="id".
                           A copy of the element shares them; a block whose element is gone
                           is dropped when the slide is written.
       THIS SLIDE          a <style data-slide-css> inside the slide, wrapped in
                           @scope { … }: its rules only reach this slide (:scope is
                           the slide itself; h2 { … } is a heading on this slide).
       WHOLE PRESENTATION  the CUSTOM CSS block (<style id="deckCustomCss">) after the
                           presentation's own CSS: it wins over it.
     The canvas shows what you type at once; leaving the field (or Ctrl+Enter) makes it
     one undo step. Tab indents. Snippets add a ready-made rule to the end.
     AUTOCOMPLETE   in the CSS fields: property names and, after the colon, values (the
                    theme's colours, fonts and easings among them); in the JavaScript fields:
                    after "show." its helpers. It opens as you type (Ctrl+Space: always);
                    ↑ ↓ choose, Enter or Tab takes it, Esc closes it.
     JAVASCRIPT (under this slide and the whole presentation): run through hooks
     (JS section 16b): show.onEnter, show.onStep, show.onLeave, show.every … ▶ runs them on
     the canvas (on a playing copy: what they do there is never saved); errors show
     under the field. Snippets: a clock, a countdown, confetti, …
     HTML (under each, opened with ▸ HTML): the element, or the whole slide, as the file
     holds it. Leaving the field (or Ctrl+Enter) puts the new HTML in its place, one undo
     step; it must be one element (a slide: one <section class="scene">, its name its own
     or a new free one). <script> and on…="" attributes are left out: scripts get their
     own place (the JavaScript part). The slide list, Layers and the fields follow.
     =========================================================================== */

  /** Ready-made CSS: [interface text, CSS] per place. */
  const CODE_SNIPPETS = {
    element: [
      ['editor.snipGlow', 'filter: drop-shadow(0 0 18px color-mix(in srgb, var(--color-accent) 70%, transparent));'],
      ['editor.snipGlass', 'background: color-mix(in srgb, var(--color-surface) 55%, transparent);\nbackdrop-filter: blur(12px);\nborder: 1px solid color-mix(in srgb, var(--color-text) 18%, transparent);\nborder-radius: 18px;\npadding: 24px;'],
      ['editor.snipGradientText', 'background: linear-gradient(90deg, var(--color-accent), var(--color-rose));\n-webkit-background-clip: text;\nbackground-clip: text;\ncolor: transparent;'],
      ['editor.snipRounded', 'border-radius: 24px;\noverflow: hidden;'],
      ['editor.snipShadow', 'box-shadow: 0 24px 60px rgb(0 0 0 / .45);'],
      ['editor.snipOutline', 'outline: 3px solid var(--color-accent);\noutline-offset: 8px;'],
    ],
    rules: [
      ['editor.snipRulesLift', 'transition: translate .25s, box-shadow .25s;\n&:hover {\n  translate: 0 -6px;\n  box-shadow: 0 18px 40px rgb(0 0 0 / .4);\n}'],
      ['editor.snipRulesGrow', 'transition: scale .25s var(--ease-out);\n&:hover {\n  scale: 1.05;\n}'],
      ['editor.snipRulesAccentBold', '& b, & strong {\n  color: var(--color-accent);\n}'],
      ['editor.snipRulesUnderline', '& a {\n  text-decoration: none;\n  background: linear-gradient(currentColor, currentColor) 0 100% / 0 2px no-repeat;\n  transition: background-size .3s;\n}\n& a:hover {\n  background-size: 100% 2px;\n}'],
    ],
    slide: [
      ['editor.snipSlideGradient', ':scope {\n  background: radial-gradient(circle at 20% 20%, color-mix(in srgb, var(--color-teal) 25%, transparent), transparent 60%);\n}'],
      ['editor.snipSlideHeadings', 'h2 {\n  color: var(--color-accent);\n}'],
      ['editor.snipSlideCardsLift', '.card, .stat {\n  transition: translate .25s, box-shadow .25s;\n}\n.card:hover, .stat:hover {\n  translate: 0 -6px;\n  box-shadow: 0 18px 40px rgb(0 0 0 / .4);\n}'],
      ['editor.snipSlideBigText', ':scope {\n  font-size: 115%;\n}'],
    ],
    deck: [
      ['editor.snipDeckHeadings', '.scene h2 {\n  letter-spacing: -.01em;\n}'],
      ['editor.snipDeckRounded', '.card, .stat {\n  border-radius: 22px;\n}'],
      ['editor.snipDeckLinks', '.scene a {\n  color: var(--color-teal);\n  text-underline-offset: 4px;\n}'],
    ],
  };

  /** Ready-made scripts: [interface text, code] per place. */
  const JS_SNIPPETS = {
    slide: [
      ['editor.snipJsClock', "show.onEnter(() => {\n  // the time, in an element with class=\"clock\" (or a corner of the slide)\n  const clock = show.find('.clock') || show.add(Object.assign(document.createElement('div'), { className: 'clock', style: 'position:absolute; right:70px; bottom:50px; font:600 2.4rem var(--font-mono); color:var(--color-accent)' }));\n  const tick = () => { clock.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); };\n  tick();\n  show.every(1000, tick);\n});"],
      ['editor.snipJsCountdown', "show.onEnter(() => {\n  // 5 minutes, in an element with class=\"countdown\" (or a corner of the slide)\n  const box = show.find('.countdown') || show.add(Object.assign(document.createElement('div'), { className: 'countdown', style: 'position:absolute; right:70px; bottom:50px; font:700 3rem var(--font-mono); color:var(--color-rose)' }));\n  const end = Date.now() + 5 * 60 * 1000;\n  const tick = () => { const left = Math.max(0, Math.round((end - Date.now()) / 1000)); box.textContent = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0'); };\n  tick();\n  show.every(250, tick);\n});"],
      ['editor.snipJsConfetti', "show.onEnter(slide => {\n  // confetti when the slide comes on\n  const colours = ['var(--color-accent)', 'var(--color-teal)', 'var(--color-rose)', 'var(--color-violet)'];\n  for (let i = 0; i < 70; i++) {\n    const bit = show.add(Object.assign(document.createElement('i'), { style: 'position:absolute; top:-20px; width:12px; height:18px; border-radius:3px; pointer-events:none; left:' + Math.random() * 100 + '%; background:' + colours[i % 4] }));\n    bit.animate([{ transform: 'translate(0, 0) rotate(0)' }, { transform: 'translate(' + (Math.random() * 300 - 150) + 'px, 1200px) rotate(' + Math.random() * 720 + 'deg)' }], { duration: 2000 + Math.random() * 1500, delay: Math.random() * 400, easing: 'cubic-bezier(.2, .6, .4, 1)', fill: 'forwards' });\n  }\n});"],
      ['editor.snipJsSteps', "show.onStep((step, slide) => {\n  // something at each click; here: the step in the browser's console\n  show.log(slide.dataset.name, 'click', step);\n});"],
    ],
    deck: [
      ['editor.snipJsLog', "show.onEnter((slide, info) => {\n  // each slide that comes on, in the browser's console\n  show.log('slide', info.name, 'in the', show.window, 'window');\n});"],
      ['editor.snipJsOneWindow', "show.onEnter(() => {\n  // only in one window: the audience window, or the only one there is\n  if (show.window === 'presenter') return;\n  show.log('this runs where the audience looks');\n});"],
    ],
  };

  /** Autocomplete in the code fields: a list under the caret. */
  const SHOW_HELPERS = ['onEnter(', 'onStep(', 'onLeave(', 'every(', 'after(', 'on(', 'add(', 'find(', 'findAll(', 'log(', 'slide', 'window'];
  const THEME_VALUES = ['var(--color-accent)', 'var(--color-teal)', 'var(--color-rose)', 'var(--color-violet)', 'var(--color-text)', 'var(--color-text-muted)', 'var(--color-surface)', 'var(--color-line)'];
  const CSS_VALUES = {
    display: ['block', 'flex', 'grid', 'inline-block', 'none'], position: ['relative', 'absolute', 'fixed', 'sticky'],
    'text-align': ['left', 'center', 'right'], 'font-weight': ['400', '700', '800'], 'font-style': ['italic', 'normal'],
    'font-family': ['var(--font-display)', 'var(--font-body)', 'var(--font-mono)'], 'text-transform': ['uppercase', 'none'],
    'transition-timing-function': ['var(--ease-out)', 'var(--ease-elastic)', 'ease-in-out', 'linear'], 'animation-timing-function': ['var(--ease-out)', 'var(--ease-elastic)', 'ease-in-out', 'linear'],
    cursor: ['pointer', 'default'], overflow: ['hidden', 'visible', 'clip'], 'pointer-events': ['none', 'auto'], 'mix-blend-mode': ['screen', 'multiply', 'overlay'],
  };
  const codeHints = {
    box: null, field: null, items: [], index: 0, from: 0, property: false,
    properties() {
      if (!this.list) {
        const style = getComputedStyle(document.documentElement), names = new Set(['--x', '--y', '--w', '--h', '--order', '--shape-fill', '--shape-stroke',
          'animation', 'background', 'border', 'border-bottom', 'border-color', 'border-left', 'border-radius', 'border-right', 'border-top', 'border-width', 'column-rule', 'columns', 'flex', 'flex-flow',
          'font', 'gap', 'grid', 'grid-area', 'grid-column', 'grid-row', 'grid-template', 'inset', 'list-style', 'margin', 'mask', 'outline', 'overflow', 'padding', 'place-content', 'place-items', 'place-self', 'text-decoration', 'transition']);   // (the computed style lists only the long names)
        for (let i = 0; i < style.length; i++) if (!style[i].startsWith('--')) names.add(style[i]);
        this.list = Array.from(names).sort();
      }
      return this.list;
    },
    /** What fits at the caret: { from, items, property } or null. */
    suggest(field, forced) {
      const before = field.value.slice(0, field.selectionStart);
      if (field.dataset.js) {
        const match = before.match(/(?:show)\.(\w*)$/);
        return match ? { from: field.selectionStart - match[1].length, items: SHOW_HELPERS.filter(name => name.startsWith(match[1])), property: false } : null;
      }
      const statement = before.slice(Math.max(before.lastIndexOf(';'), before.lastIndexOf('{'), before.lastIndexOf('}'), before.lastIndexOf('\n')) + 1);
      const colon = statement.indexOf(':');
      if (colon < 0 || /[&.#\[]/.test(statement.slice(0, colon))) {   // a property name (not a selector like &:hover)
        const word = (statement.match(/^\s*(-?[a-z-]*)$/) || [])[1];
        if (word === undefined || (!forced && word.length < 2)) return null;
        return { from: field.selectionStart - word.length, items: this.properties().filter(name => name.startsWith(word)).slice(0, 40), property: true };
      }
      const property = statement.slice(0, colon).trim().toLowerCase();
      const word = (statement.slice(colon + 1).match(/[-\w(]*$/) || [''])[0];
      if (!forced && !word) return null;
      const colourish = /color|background|fill|stroke|border|outline|shadow/.test(property);
      const pool = (CSS_VALUES[property] || []).concat(colourish ? THEME_VALUES : [], ['inherit', 'initial', 'unset']);
      return { from: field.selectionStart - word.length, items: pool.filter(value => value.startsWith(word) || value.includes(word.replace(/^var\(?/, ''))).slice(0, 40), property: false };
    },
    update(field, forced) {
      const result = this.suggest(field, forced);
      if (!result || !result.items.length || (result.items.length === 1 && field.value.slice(result.from, field.selectionStart) === result.items[0])) { this.close(); return; }
      Object.assign(this, { field, items: result.items, from: result.from, property: result.property, index: 0 });
      if (!this.box) { this.box = document.createElement('div'); this.box.className = 'editor-code-hints'; this.box.setAttribute('role', 'listbox'); editor.element.appendChild(this.box); this.box.addEventListener('mousedown', event => { event.preventDefault(); const item = event.target.closest('[data-index]'); if (item) { this.index = Number(item.dataset.index); this.accept(); } }); }
      this.draw();
      const caret = this.caretPoint(field);
      this.box.style.left = Math.min(caret.x, window.innerWidth - 260) + 'px';
      this.box.style.top = Math.min(caret.y + 4, window.innerHeight - 220) + 'px';
      this.box.hidden = false;
    },
    draw() {
      this.box.innerHTML = this.items.map((item, i) => '<div role="option" data-index="' + i + '"' + (i === this.index ? ' class="is-current" aria-selected="true"' : '') + '>' + escapeHtml(item) + '</div>').join('');
      const current = this.box.querySelector('.is-current');
      if (current) current.scrollIntoView({ block: 'nearest' });
    },
    close() { if (this.box) this.box.hidden = true; this.field = null; },
    open() { return !!(this.box && !this.box.hidden && this.field); },
    accept() {
      const field = this.field, item = this.items[this.index];
      if (!field || item === undefined || this.from > field.selectionStart || !/^[-\w(]*$/.test(field.value.slice(this.from, field.selectionStart))) { this.close(); return false; }
      field.setRangeText(item + (this.property ? ': ' : ''), this.from, field.selectionStart, 'end');
      this.close();
      field.dispatchEvent(new Event('input', { bubbles: true }));   // the slide shows it at once
      return true;
    },
    /** Keys in a code field: the list's own while it is open; Ctrl+Space opens it. True when handled. */
    onKey(event, field) {
      if (event.key === ' ' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); event.stopPropagation(); this.update(field, true); return true; }
      if (!this.open() || this.field !== field) return false;
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) { this.close(); return false; }   // the caret moves: the word is another one
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); event.stopPropagation(); this.index = (this.index + (event.key === 'ArrowDown' ? 1 : -1) + this.items.length) % this.items.length; this.draw(); return true; }
      if (event.key === 'Enter' || event.key === 'Tab') {
        if (!this.accept()) return false;   // (the list no longer fits the caret: the key keeps its own meaning)
        event.preventDefault();
        event.stopPropagation();
        return true;
      }
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); this.close(); return true; }
      return false;
    },
    /** Where the caret is on screen (a copy of the field's text up to it, measured). */
    caretPoint(field) {
      const style = getComputedStyle(field), mirror = document.createElement('div');
      ['font', 'letterSpacing', 'padding', 'border', 'boxSizing', 'width', 'lineHeight', 'tabSize', 'whiteSpace'].forEach(name => { mirror.style[name] = style[name]; });
      Object.assign(mirror.style, { position: 'fixed', visibility: 'hidden', left: '-9999px', top: '0', overflow: 'hidden', whiteSpace: 'pre' });
      mirror.textContent = field.value.slice(0, field.selectionStart);
      const marker = document.createElement('span');
      marker.textContent = '\u200b';
      mirror.appendChild(marker);
      document.body.appendChild(mirror);
      const box = field.getBoundingClientRect(), mark = marker.getBoundingClientRect(), base = mirror.getBoundingClientRect();
      mirror.remove();
      return { x: box.left + (mark.left - base.left) - field.scrollLeft, y: box.top + (mark.bottom - base.top) - field.scrollTop };
    },
  };

  const editorCode = {
    liveBefore: null,   // the page's own CUSTOM CSS when the editor opened (shown again when it closes)
    htmlOpen: { element: false, slide: false },   // ▸ HTML / JavaScript opened (kept while the editor is open)
    htmlBase: { element: '', slide: '' },
    running: false,   // ▶ runs the scripts on the canvas

    setUp() {
      const body = editor.element.querySelector('.editor-panel-body');
      body.addEventListener('input', event => {
        if (event.target.matches('textarea[data-code]')) this.preview(event.target);
        if (event.target.matches('textarea[data-code], textarea[data-js]')) codeHints.update(event.target);
        if (event.target.matches('textarea[data-html]')) this.checkHtml(event.target);   // only says whether it can be used; written when you leave it
        if (event.target.matches('textarea[data-js]')) {
          const status = editor.element.querySelector('[data-js-status="' + event.target.dataset.js + '"]');
          const problem = this.jsProblem(event.target.value);
          if (status) { status.textContent = problem ? ui('editor.jsBroken', { message: problem }) : ''; status.classList.toggle('is-warning', !!problem); }
        }
      });
      // a field you go into shows the HTML as it is now (e.g. after typing on the slide), when you have not changed it yet
      body.addEventListener('focusin', event => {
        const field = event.target.closest && event.target.closest('textarea[data-html]');
        if (!field || field.value !== this.htmlBase[field.dataset.html]) return;
        const now = this.currentHtml(field.dataset.html);
        if (now !== null && now !== field.value) { field.value = now; this.htmlBase[field.dataset.html] = now; }
      });
      body.addEventListener('mousedown', event => { if (event.target.matches('textarea')) codeHints.close(); });   // a click moves the caret
      body.addEventListener('focusout', event => { if (event.target.matches('textarea')) setTimeout(() => { if (!codeHints.field || document.activeElement !== codeHints.field) codeHints.close(); }, 0); });
      body.addEventListener('toggle', event => { if (event.target.matches('details[data-html-open]')) this.htmlOpen[event.target.dataset.htmlOpen] = event.target.open; }, true);
      body.addEventListener('keydown', event => {
        const field = event.target.closest && event.target.closest('textarea[data-code], textarea[data-html], textarea[data-js]');
        if (!field) return;
        if (codeHints.onKey(event, field)) return;   // the autocomplete list has these keys while it is open
        if (event.key === 'Tab' && !event.ctrlKey && !event.altKey && !event.metaKey) {   // a code field indents
          event.preventDefault();
          event.stopPropagation();
          field.setRangeText('  ', field.selectionStart, field.selectionEnd, 'end');
          if (field.dataset.code) this.preview(field); else if (field.dataset.html) this.checkHtml(field);
        } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); event.stopPropagation(); field.blur(); }   // Ctrl+Enter: done
      }, true);
    },

    /* ======== THE TEXTS ======== */

    /** The element's CSS as lines ("name: value;"). */
    elementCss(element) {
      return (element.getAttribute('style') || '').split(';').map(part => part.trim()).filter(Boolean).map(part => part + ';').join('\n');
    },
    /** The slide's own rules (inside its @scope), as you wrote them. */
    slideCss(scene) {
      const block = scene && scene.querySelector(':scope > style[data-slide-css]');
      if (!block) return '';
      const text = block.textContent.trim();
      const inner = text.match(/^@scope\s*\{([\s\S]*)\}$/);
      return (inner ? inner[1] : text).replace(/^\n+|\s+$/g, '').replace(/^ {2}/gm, '');
    },
    deckCss() {
      const block = editor.model.getElementById('deckCustomCss');
      return block ? block.textContent.replace(/^\n+|\s+$/g, '') : '';
    },
    /** How many rules the browser understood in a text (a slide's: inside its @scope). */
    ruleCount(text) {
      try {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(text);
        return Array.from(sheet.cssRules).reduce((sum, rule) => sum + (rule.cssRules ? rule.cssRules.length : 1), 0);
      } catch (e) { return 0; }
    },

    /* ======== THE TAB ======== */

    panelHtml() {
      const element = editorCanvas.selected && editorCanvas.scene && editorCanvas.scene.contains(editorCanvas.selected) ? editorCanvas.selected : null;
      const locked = editorCanvas.locked() ? ' disabled' : '';
      const field = (place, text, rows, note, count) => '<textarea class="editor-code" data-code="' + place + '" rows="' + rows + '" spellcheck="false" autocapitalize="off" autocomplete="off"' + (place !== 'deck' ? locked : '') + '>' + escapeHtml(text) + '</textarea>' +
        '<div class="editor-code-foot"><span class="editor-note" data-code-count="' + place + '">' + escapeHtml(count) + '</span>' +
        '<select data-code-snippet="' + place + '"' + (place !== 'deck' ? locked : '') + '><option value="">' + escapeHtml(ui('editor.codeSnippet')) + '</option>' +
        CODE_SNIPPETS[place].map(([label], index) => '<option value="' + index + '">' + escapeHtml(ui(label)) + '</option>').join('') + '</select></div>' +
        '<p class="editor-note">' + escapeHtml(ui(note)) + '</p>';
      let html = '<p class="editor-note is-tip">' + escapeHtml(ui('editor.codeIntro')) + '</p>';
      if (element) {
        const css = this.elementCss(element);
        html += '<h4>' + escapeHtml(ui('editor.codeElement', { label: editorTools.labelOf(element) })) + '</h4>' +
          field('element', css, Math.max(4, css.split('\n').length + 1), 'editor.codeElementNote', ui('editor.codeDeclarations', { count: css ? css.split('\n').length : 0 }));
        const rules = this.elementRules(element);
        html += '<h4 data-ui="editor.codeRulesTitle"></h4>' + field('rules', rules, Math.max(3, rules.split('\n').length + 1), 'editor.codeRulesNote', ui('editor.codeRules', { count: this.rulesCount(rules) }));
        html += this.htmlPartHtml('element', this.elementHtml(element), locked);
      } else html += '<h4 data-ui="editor.codeElementNone"></h4><p class="editor-note" data-ui="editor.codeElementPick"></p>';
      const slide = this.slideCss(editorCanvas.scene);
      html += '<h4 data-ui="editor.codeSlide"></h4>' + field('slide', slide, Math.max(5, slide.split('\n').length + 1), 'editor.codeSlideNote', ui('editor.codeRules', { count: slide ? this.ruleCount('@scope {' + slide + '}') : 0 }));
      html += this.htmlPartHtml('slide', editor.selected ? editor.selected.outerHTML : '', locked);
      html += this.jsPartHtml('slide', this.slideJs(editorCanvas.scene), locked);
      const deckText = this.deckCss();
      html += '<h4 data-ui="editor.codeDeck"></h4>' + field('deck', deckText, Math.max(5, deckText.split('\n').length + 1), 'editor.codeDeckNote', ui('editor.codeRules', { count: deckText ? this.ruleCount(deckText) : 0 }));
      html += this.jsPartHtml('deck', this.deckJs(), '');
      const errors = customCode.errors.slice(-5);
      html += '<div class="editor-buttons"><button data-action="code-run"' + (this.running ? ' class="is-current"' : '') + ' data-ui="editor.jsRun" data-ui-title="editor.jsRunTooltip"></button>' +
        '<button data-action="code-stop"' + (this.running ? '' : ' disabled') + ' data-ui="editor.jsStop"></button></div>' +
        (errors.length ? '<ul class="editor-js-errors">' + errors.map(error => '<li>' + escapeHtml(error.where + ': ' + error.message) + '</li>').join('') + '</ul>' : '') +
        '<p class="editor-note">' + escapeHtml(ui(customCode.safe ? 'editor.jsSafe' : 'editor.jsTrust')) + '</p>';
      return '<p class="editor-note is-warning">' + escapeHtml(ui('editor.codeExpertNote')) + '</p>' + html;   // (a beginner who opens it knows it is optional)
    },

    /* ======== JAVASCRIPT ======== */

    jsPartHtml(place, text, locked) {
      const open = this.htmlOpen['js-' + place] === undefined ? !!text : this.htmlOpen['js-' + place];   // (closed by you: stays closed)
      return '<details class="editor-code-html" data-html-open="js-' + place + '"' + (open ? ' open' : '') + '><summary>' + escapeHtml(ui(place === 'slide' ? 'editor.jsSlide' : 'editor.jsDeck')) + '</summary>' +
        '<textarea class="editor-code" data-js="' + place + '" rows="' + Math.min(24, Math.max(4, text.split('\n').length + 1)) + '" spellcheck="false" autocapitalize="off" autocomplete="off"' + locked + '>' + escapeHtml(text) + '</textarea>' +
        '<div class="editor-code-foot"><span class="editor-note" data-js-status="' + place + '"></span><select data-js-snippet="' + place + '"' + locked + '><option value="">' + escapeHtml(ui('editor.codeSnippet')) + '</option>' +
        JS_SNIPPETS[place].map(([label], index) => '<option value="' + index + '">' + escapeHtml(ui(label)) + '</option>').join('') + '</select></div>' +
        '<p class="editor-note">' + escapeHtml(ui(place === 'slide' ? 'editor.jsSlideNote' : 'editor.jsDeckNote')) + '</p></details>';
    },
    slideJs(scene) { const block = scene && scene.querySelector(':scope > script[data-slide-js]'); return block ? block.textContent.replace(/^\n+|\s+$/g, '') : ''; },
    deckJs() { const block = editor.model.getElementById('deckCustomJs'); return block ? block.textContent.replace(/^\n+|\s+$/g, '') : ''; },
    /** Script text as it may stand in a <script> of the file (a closing script tag in it would end the block there). */
    safeInScript(text) { return String(text).replace(/<\/(script)/gi, '<\\/$1'); },
    /** Whether the text is a script the browser can read (not run): an error message, or ''. */
    jsProblem(text) {
      if (!String(text).trim()) return '';
      if (/<(!--|\/?script)/i.test(text)) return ui('editor.jsNoScriptTag');   // it would end (or hide the end of) the script block in the file
      try { new Function('show', String(text)); return ''; } catch (error) { return error.message; }
    },
    /** Leaving a JavaScript field (or a snippet): written, one undo step. */
    onJsChange(input) {
      const place = input.dataset.js || input.dataset.jsSnippet;
      let field = input;
      if (input.matches('select[data-js-snippet]')) {
        const snippet = JS_SNIPPETS[place] && JS_SNIPPETS[place][Number(input.value)];
        field = editor.element.querySelector('textarea[data-js="' + place + '"]');
        if (!snippet || !field) return;
        field.value = (field.value.trim() ? field.value.replace(/\s+$/, '') + '\n\n' : '') + snippet[1];
      }
      const text = field.value.replace(/\s+$/, '');
      const problem = this.jsProblem(text);
      if (problem) { showToast(ui('editor.jsBroken', { message: problem })); return; }   // kept in the field to fix
      this.stopOnCanvas();
      if (place === 'slide') {
        const scene = editorCanvas.scene;
        if (!scene || editorCanvas.locked()) return;
        editor.nextLabel = ui('editor.jsHistorySlide');
        editorCanvas.change(() => {
          let block = scene.querySelector(':scope > script[data-slide-js]');
          if (!text) { if (block) block.remove(); return; }
          if (!block) { block = document.createElement('script'); block.type = 'text/plain'; block.setAttribute('data-slide-js', ''); scene.appendChild(block); }
          block.textContent = '\n' + this.safeInScript(text) + '\n';
        }, { rerender: true });
      } else {
        editor.nextLabel = ui('editor.jsHistoryDeck');
        editor.edit(() => this.saveDeckJs(text));
      }
      editor.nextLabel = null;
    },
    saveDeckJs(text) {
      let block = editor.model.getElementById('deckCustomJs');
      if (!block) {   // a file from before v61: right before the deck
        block = editor.model.createElement('script');
        block.setAttribute('type', 'text/plain');
        block.id = 'deckCustomJs';
        editor.model.getElementById('deck').before(block, editor.model.createTextNode('\n\n'));
      }
      const code = String(text).replace(/^\s*\n/, '').replace(/\s+$/, '');
      block.textContent = code ? '\n' + this.safeInScript(code) + '\n' : '\n';
    },
    /** ▶: the slide plays on the canvas with its scripts (a playing copy: never saved). */
    runOnCanvas() {
      this.stopOnCanvas();
      const fields = place => { const field = editor.element.querySelector('textarea[data-js="' + place + '"]'); return field ? field.value : (place === 'slide' ? this.slideJs(editorCanvas.scene) : this.deckJs()); };
      editorTools.playSlide();
      const scene = editorCanvas.scene;
      if (!scene) return;
      customCode.paused = customCode.current;   // the presentation behind the editor keeps its own run
      customCode.editorWindow = true;
      customCode.errors.length = 0;
      const top = customCode.current = { scene, cleanups: [] };   // what the scripts' top level starts belongs to this run
      const deck = customCode.compile(fields('deck'), ui('code.wherePresentation'), null);
      const slide = customCode.compile(fields('slide'), ui('code.whereSlide', { name: scene.dataset.name }), scene);
      customCode.current = null;
      this.running = true;
      customCode.enter(scene, { deck, slide });
      if (customCode.current) customCode.current.cleanups.push(...top.cleanups); else top.cleanups.forEach(cleanup => { try { cleanup(); } catch (e) { /* gone */ } });
      editor.renderPanel();
    },
    /** ■, or the slide stops playing: the scripts' timers, listeners and elements end. */
    stopOnCanvas() {
      if (!this.running) return;
      this.running = false;
      customCode.leave();
      customCode.editorWindow = false;
      customCode.current = customCode.paused || null;
      customCode.paused = null;
    },
    /** A click while ▶ plays (Next click in the Animations tab). */
    stepOnCanvas(step) { if (this.running && editorCanvas.scene) customCode.step(editorCanvas.scene, step); },
    runAction(action) {
      if (action === 'code-run') { this.runOnCanvas(); return true; }
      if (action === 'code-stop') { editorTools.stopPlaying(); return true; }
      return false;
    },

    /* ======== HTML ======== */

    /** ▸ HTML: the element or the slide as the file holds it, in a field. */
    htmlPartHtml(place, text, locked) {
      this.htmlBase[place] = text;   // what the field started from (a change made elsewhere since: see onHtmlChange)
      return '<details class="editor-code-html" data-html-open="' + place + '"' + (this.htmlOpen[place] ? ' open' : '') + '><summary>' + escapeHtml(ui(place === 'element' ? 'editor.htmlElement' : 'editor.htmlSlide')) + '</summary>' +
        '<textarea class="editor-code" data-html="' + place + '" rows="' + Math.min(24, Math.max(4, text.split('\n').length + 1)) + '" spellcheck="false" autocapitalize="off" autocomplete="off"' + locked + '>' + escapeHtml(text) + '</textarea>' +
        '<div class="editor-code-foot"><span class="editor-note" data-html-status="' + place + '"></span></div>' +
        '<p class="editor-note">' + escapeHtml(ui(place === 'element' ? 'editor.htmlElementNote' : 'editor.htmlSlideNote')) + '</p></details>';
    },
    /** The selected element as the file holds it (the canvas's own helpers taken away). */
    elementHtml(element) {
      element.setAttribute('data-code-target', '');
      try {
        const copy = editorCanvas.cleanCopy();
        const node = copy.querySelector('[data-code-target]');
        if (!node) return '';
        node.removeAttribute('data-code-target');
        return node.outerHTML;
      } finally { element.removeAttribute('data-code-target'); }
    },
    /** The element or slide as the file holds it now (null: none). */
    currentHtml(place) {
      editorCanvas.finishTyping();   // what was just typed on the slide counts
      if (place === 'element') return editorCanvas.selected && editorCanvas.scene && editorCanvas.scene.contains(editorCanvas.selected) ? this.elementHtml(editorCanvas.selected) : null;
      return editor.selected ? editor.selected.outerHTML : null;
    },
    /** The HTML typed in a field: one element (a slide: one section.scene), without scripts. { node, removed } or { error }. */
    parseHtml(text, place) {
      const template = document.createElement('template');
      template.innerHTML = String(text).trim();
      const roots = Array.from(template.content.childNodes).filter(node => node.nodeType === Node.ELEMENT_NODE || (node.nodeType === Node.TEXT_NODE && node.nodeValue.trim()));
      if (roots.length !== 1 || roots[0].nodeType !== Node.ELEMENT_NODE) return { error: ui('editor.htmlOneRoot') };
      const root = roots[0];
      if (place === 'slide' && !root.matches('section.scene')) return { error: ui('editor.htmlNeedsSection') };
      if (place === 'element' && root.matches('section, script, style')) return { error: ui('editor.htmlNotHere') };
      let removed = 0;
      // scripts, and what reaches past the slide: other pages in a frame, the page's address, base or refresh, outside files
      root.querySelectorAll('script, iframe, frame, object, embed, meta, base, link, noscript').forEach(node => {
        if (place === 'slide' && node.parentElement === root && node.matches('script[data-slide-js]') && !this.jsProblem(node.textContent)) { node.type = 'text/plain'; return; }   // the slide's own script (run through hooks) stays
        node.remove();
        removed++;
      });
      // CSS: only the slide's own block, and only rules that stay in the slide (a } too many would reach every slide and the editor)
      for (const style of Array.from(root.querySelectorAll('style'))) {
        if (place === 'slide' && style.parentElement === root && style.hasAttribute('data-element-css')) {   // rules of one element: kept when they stay on it
          const id = style.getAttribute('data-element-css');
          const rules = (style.textContent.match(/\[data-css="([^"]*)"\]\s*\{([\s\S]*)\}\s*\}\s*$/) || []);
          if (rules[1] === id && this.staysOnElement(rules[2])) continue;
          return { error: ui('editor.codeRulesBroken') };
        }
        const own = place === 'slide' && style.parentElement === root && style.hasAttribute('data-slide-css');
        const inner = own && (style.textContent.trim().match(/^@scope\s*\{([\s\S]*)\}$/) || [])[1];
        if (own && inner !== undefined && this.staysInSlide(inner)) continue;
        if (own) return { error: ui('editor.codeSlideBroken') };
        style.remove();
        removed++;
      }
      const hidden = value => value.replace(/[\u0000-\u0020\u007f]/g, '').toLowerCase();   // "java&#9;script:" is still javascript: to a browser
      [root, ...root.querySelectorAll('*')].forEach(node => Array.from(node.attributes).forEach(attribute => {
        if (/^on/i.test(attribute.name) || /^(srcdoc|formaction|action)$/i.test(attribute.name) || /^(javascript|vbscript):/.test(hidden(attribute.value))) { node.removeAttribute(attribute.name); removed++; }
      }));
      return { node: root, removed };
    },
    /** While you type HTML: whether it can be used (it is written when you leave the field). */
    checkHtml(field) {
      const status = editor.element.querySelector('[data-html-status="' + field.dataset.html + '"]');
      if (!status) return;
      const result = this.parseHtml(field.value, field.dataset.html);
      status.textContent = result.error || ui('editor.htmlReady', { count: result.node.querySelectorAll('*').length + 1 }) + (result.removed ? ' · ' + ui('editor.htmlScripts', { count: result.removed }) : '');
      status.classList.toggle('is-warning', !!result.error);
    },
    /** Leaving an HTML field (or Ctrl+Enter): the new HTML in its place, one undo step. */
    onHtmlChange(field) {
      const place = field.dataset.html;
      if (editorCanvas.locked()) { showToast(ui('editor.scriptedNote')); editor.renderPanel(); return; }
      const result = this.parseHtml(field.value, place);
      if (result.error) { showToast(result.error); return; }   // kept in the field to fix
      const now = this.currentHtml(place);
      if (now !== null && now !== this.htmlBase[place]) {   // changed elsewhere since this field was filled: nothing overwritten
        showToast(ui('editor.htmlChangedMeanwhile'));
        return;
      }
      if (result.removed) showToast(ui('editor.htmlScripts', { count: result.removed }));
      if (place === 'element') {
        const element = editorCanvas.selected;
        if (!element || editorLayers.refusesRemoval([element])) return;
        const fresh = document.importNode(result.node, true);
        editor.nextLabel = ui('editor.htmlHistoryElement');
        editorCanvas.change(() => { element.replaceWith(fresh); editorCanvas.selected = fresh; }, { rerender: true });   // the same place: it stays selected
        editor.nextLabel = null;
        return;
      }
      const scene = editor.selected;
      if (!scene) return;
      const name = result.node.getAttribute('data-name') || '';
      const taken = name !== scene.getAttribute('data-name') && editor.modelScenes().some(other => other !== scene && other.getAttribute('data-name') === name);
      if (!/^[a-z0-9][a-z0-9-]*$/.test(name) || taken) { showToast(ui(taken ? 'editor.nameTaken' : 'editor.badName')); return; }
      const fresh = editor.model.importNode(result.node, true);
      editor.nextLabel = ui('editor.htmlHistorySlide');
      editor.record();
      editor.nextLabel = null;
      editorCanvas.finishTyping();
      scene.replaceWith(fresh);
      editor.selected = fresh;
      editorCanvas.selected = null;   // the old slide's element is gone with it
      editor.renameLinks(scene.getAttribute('data-name'), name);   // agenda buttons follow a new name
      editorCanvas.selectedPath = null;
      editor.changed(fresh);
      editor.renderAll();
    },

    /** While you type: the canvas (and, for the whole presentation, the page) shows it at once; nothing is written yet. */
    preview(field) {
      const place = field.dataset.code, text = field.value;
      const count = editor.element.querySelector('[data-code-count="' + place + '"]');
      if (place === 'element') {
        const element = editorCanvas.selected;
        if (!element) return;
        if (this.styleBefore === undefined || this.previewing !== element) { this.styleBefore = element.getAttribute('style'); this.previewing = element; }
        element.style.cssText = this.declarations(text, element);
        if (count) count.textContent = ui('editor.codeDeclarations', { count: element.style.length });
        editorCanvas.drawSelection();
      } else if (place === 'rules') {
        const element = editorCanvas.selected, scene = editorCanvas.scene;
        if (!element || !scene || editorLayers.isLocked(element)) return;
        if (!this.rulesBefore || this.rulesBefore.element !== element) {   // as it was: put back when the text is not kept
          const id = element.getAttribute('data-css'), block = id && scene.querySelector(':scope > style[data-element-css="' + CSS.escape(id) + '"]');
          this.rulesBefore = { element, id, text: block ? block.textContent : null };
        }
        const fits = this.staysOnElement(text);
        if (fits) { if (!element.dataset.css) element.dataset.css = this.newCssId(); this.rulesBlock(scene, element.dataset.css, text); }
        if (count) count.textContent = fits ? ui('editor.codeRules', { count: this.rulesCount(text) }) : ui('editor.codeRulesBroken');
      } else if (place === 'slide') {
        const scene = editorCanvas.scene;
        if (!scene) return;
        const fits = this.staysInSlide(text);
        if (fits) this.slideBlock(scene, text);   // (not while a } too many would reach the other slides)
        if (count) count.textContent = fits ? ui('editor.codeRules', { count: text.trim() ? this.ruleCount('@scope {' + text + '}') : 0 }) : ui('editor.codeSlideBroken');
      } else {
        this.live().textContent = '\n' + text + '\n';
        if (count) count.textContent = ui('editor.codeRules', { count: text.trim() ? this.ruleCount(text) : 0 });
      }
    },
    /** Leaving the field (or Ctrl+Enter, or a snippet): written, one undo step. */
    onChange(input) {
      const place = input.dataset.code || input.dataset.codeSnippet;
      let field = input;
      if (input.matches('select[data-code-snippet]')) {   // a snippet: added to the end of that field
        const snippet = CODE_SNIPPETS[place] && CODE_SNIPPETS[place][Number(input.value)];
        field = editor.element.querySelector('textarea[data-code="' + place + '"]');
        if (!snippet || !field) return;
        field.value = (field.value.trim() ? field.value.replace(/\s+$/, '') + '\n' : '') + snippet[1];
        this.preview(field);
      }
      const text = field.value;
      editor.nextLabel = ui(place === 'element' ? 'editor.codeHistoryElement' : place === 'rules' ? 'editor.codeHistoryRules' : place === 'slide' ? 'editor.codeHistorySlide' : 'editor.codeHistoryDeck');
      if (place === 'rules') {
        const element = editorCanvas.selected, scene = editorCanvas.scene;
        editor.nextLabel = null;
        if (!element || !scene) { this.rulesBefore = null; return; }
        this.restoreRules(scene);   // the undo step (or a refusal) starts from before the typing
        if (!this.staysOnElement(text)) { showToast(ui('editor.codeRulesBroken')); return; }   // kept as typed in the field, not written
        if (editorLayers.refuses([element])) { editor.renderPanel(); return; }
        editor.nextLabel = ui('editor.codeHistoryRules');
        editorCanvas.change(() => {
          if (!element.dataset.css) element.dataset.css = this.newCssId();
          this.rulesBlock(scene, element.dataset.css, text);
          if (!String(text).trim()) element.removeAttribute('data-css');
        }, { rerender: true });
        editor.nextLabel = null;
        return;
      }
      if (place === 'element') {
        const element = editorCanvas.selected;
        if (!element) { editor.nextLabel = null; return; }
        if (this.previewing === element && this.styleBefore !== undefined) { if (this.styleBefore === null) element.removeAttribute('style'); else element.setAttribute('style', this.styleBefore); }   // the undo step starts from before the typing
        this.styleBefore = undefined;
        this.previewing = null;
        if (editorLayers.refuses([element])) { editor.nextLabel = null; editor.renderPanel(); return; }
        editorCanvas.change(() => { element.style.cssText = this.declarations(text, element); if (!element.getAttribute('style')) element.removeAttribute('style'); }, { rerender: true });
      } else if (place === 'slide') {
        const scene = editorCanvas.scene;
        if (!scene) { editor.nextLabel = null; return; }
        this.slideBlock(scene, this.slideCss(editor.selected));   // the undo step starts from the slide as it was
        if (!this.staysInSlide(text)) { editor.nextLabel = null; showToast(ui('editor.codeSlideBroken')); return; }   // kept as typed in the field, not written
        editorCanvas.change(() => this.slideBlock(scene, text), { rerender: true });
      } else {
        this.live().textContent = '\n' + this.deckCss() + '\n';
        editor.edit(() => this.saveDeckCss(text));
      }
      editor.nextLabel = null;
    },
    /** Only what the browser understands, keeping the editor's own values (--x, --order, …) and the order of the lines. */
    declarations(text, element) {
      const probe = document.createElement('div');
      probe.style.cssText = String(text).replace(/\n/g, ' ');
      return probe.style.cssText;
    },
    /* ---- Rules of one element ---- */
    /** Copy: the rules of the element (and of elements in it) ride along inside it as <style data-carried-css>. */
    carryRules(copy) {
      const scene = editorCanvas.scene;
      if (!scene) return;
      [copy].concat(Array.from(copy.querySelectorAll('[data-css]'))).forEach(node => {
        const id = node.getAttribute && node.getAttribute('data-css');
        const block = id && scene.querySelector(':scope > style[data-element-css="' + CSS.escape(id) + '"]');
        if (!block || copy.querySelector('style[data-carried-css="' + CSS.escape(id) + '"]')) return;
        const carried = document.createElement('style');
        carried.setAttribute('data-carried-css', id);
        carried.textContent = block.textContent;
        copy.appendChild(carried);
      });
    },
    /** Paste: carried rules become this slide's blocks, under a new name (the copy and the original never share by accident). */
    adoptRules(node, scene) {
      Array.from(node.querySelectorAll('style[data-carried-css]')).forEach(carried => {
        const id = carried.getAttribute('data-carried-css'), fresh = this.newCssId();
        [node].concat(Array.from(node.querySelectorAll('[data-css]'))).forEach(element => { if (element.getAttribute('data-css') === id) element.setAttribute('data-css', fresh); });
        const block = document.createElement('style');
        block.setAttribute('data-element-css', fresh);
        block.textContent = carried.textContent.split('[data-css="' + id + '"]').join('[data-css="' + fresh + '"]');
        carried.remove();
        scene.appendChild(block);
      });
    },
    rulesSheet(id, text) { return '@scope {[data-css="' + id + '"] {' + text + '\n}}'; },
    /** How many rules an element's text holds: its nested rules (&:hover …, all levels), and its own declarations as one. */
    rulesCount(text) {
      if (!String(text).trim()) return 0;
      try {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(this.rulesSheet('x', text));
        const own = sheet.cssRules[0] && sheet.cssRules[0].cssRules[0];
        if (!own) return 0;
        const nested = rule => Array.from(rule.cssRules || []).reduce((sum, child) => sum + 1 + nested(child), 0);
        return nested(own) + (own.style && own.style.length ? 1 : 0);
      } catch (e) { return 0; }
    },
    /** True when the rules stay inside the element's own rule (no } too many). */
    staysOnElement(text) {
      if (!String(text).trim()) return true;
      try {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(this.rulesSheet('x', text));
        return sheet.cssRules.length === 1 && sheet.cssRules[0].constructor.name === 'CSSScopeRule' && sheet.cssRules[0].cssRules.length === 1;
      } catch (e) { return false; }
    },
    /** A name for data-css that no element of the file has yet. */
    newCssId() {
      let id;
      do { id = 'c' + Math.random().toString(36).slice(2, 7); } while (editor.model.querySelector('[data-css="' + id + '"]') || (editorCanvas.scene && editorCanvas.scene.querySelector('[data-css="' + id + '"]')));
      return id;
    },
    /** The element's rules as written (inside its [data-css] rule). */
    elementRules(element) {
      const id = element.dataset.css, scene = editorCanvas.scene;
      const block = id && scene && scene.querySelector(':scope > style[data-element-css="' + CSS.escape(id) + '"]');
      if (!block) return '';
      const inner = block.textContent.match(/\[data-css="[^"]*"\]\s*\{([\s\S]*)\}\s*\}\s*$/);
      return (inner ? inner[1] : '').replace(/^\n+|\s+$/g, '').replace(/^ {4}/gm, '');
    },
    /** The canvas as it was before the rules were typed (their preview taken away). */
    restoreRules(scene) {
      const before = this.rulesBefore;
      this.rulesBefore = null;
      if (!before) return;
      const now = before.element.getAttribute('data-css');
      if (now && now !== before.id) scene.querySelectorAll(':scope > style[data-element-css="' + CSS.escape(now) + '"]').forEach(block => block.remove());
      if (before.id) before.element.setAttribute('data-css', before.id); else before.element.removeAttribute('data-css');
      if (!before.id) return;
      let block = scene.querySelector(':scope > style[data-element-css="' + CSS.escape(before.id) + '"]');
      if (before.text === null) { if (block) block.remove(); return; }
      if (!block) { block = document.createElement('style'); block.setAttribute('data-element-css', before.id); scene.appendChild(block); }
      block.textContent = before.text;
    },
    rulesBlock(scene, id, text) {
      let block = scene.querySelector(':scope > style[data-element-css="' + CSS.escape(id) + '"]');
      const rules = String(text).trim();
      if (!rules) { if (block) block.remove(); return; }
      if (!block) { block = document.createElement('style'); block.setAttribute('data-element-css', id); scene.appendChild(block); }
      block.textContent = '@scope {\n  [data-css="' + id + '"] {\n' + this.safeInStyle(rules).split('\n').map(line => (line ? '    ' + line : line)).join('\n') + '\n  }\n}';
    },
    /** True when the rules stay inside this slide's @scope (no } too many that would end it early). */
    staysInSlide(text) {
      if (!String(text).trim()) return true;
      try {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync('@scope {' + text + '\n}');
        return sheet.cssRules.length === 1 && sheet.cssRules[0].constructor.name === 'CSSScopeRule';
      } catch (e) { return false; }
    },
    /** CSS as it may stand in a <style> of the file: "</style" would end it there (CSS reads "<\/style" the same). */
    safeInStyle(text) { return String(text).replace(/<\/(style)/gi, '<\\/$1'); },
    /** The slide's <style data-slide-css> with these rules (none: no block). */
    slideBlock(scene, text) {
      let block = scene.querySelector(':scope > style[data-slide-css]');
      const rules = String(text).trim();
      if (!rules) { if (block) block.remove(); return; }
      if (!block) { block = document.createElement('style'); block.setAttribute('data-slide-css', ''); scene.appendChild(block); }
      block.textContent = '@scope {\n' + this.safeInStyle(rules).split('\n').map(line => (line ? '  ' + line : line)).join('\n') + '\n}';
    },
    /** The CUSTOM CSS block of the file (made after the other styles in a file from before v59). */
    saveDeckCss(text) {
      let block = editor.model.getElementById('deckCustomCss');
      if (!block) {   // a file from before v59: right before the deck, after the presentation's own CSS (so it wins)
        block = editor.model.createElement('style');
        block.id = 'deckCustomCss';
        editor.model.getElementById('deck').before(block, editor.model.createTextNode('\n\n'));
      }
      const rules = String(text).replace(/^\s*\n/, '').replace(/\s+$/, '');   // (no blank lines piling up at the top)
      block.textContent = rules ? '\n' + this.safeInStyle(rules) + '\n' : '\n';
      this.live().textContent = block.textContent;
    },
    /** The page's own CUSTOM CSS block (the canvas lies in this page). */
    live() {
      let block = document.getElementById('deckCustomCss');
      if (!block) { block = document.createElement('style'); block.id = 'deckCustomCss'; document.getElementById('deck').before(block); }   // after the presentation's own CSS
      return block;
    },
    /** The editor opens: the page shows the file's CSS as the editor has it (a draft too). */
    onOpen() {
      this.liveBefore = this.live().textContent;
      this.live().textContent = '\n' + this.deckCss() + '\n';
    },
    /** The editor closes: the page shows its own (saved) CSS again; Save reloads the page anyway. */
    onClose() {
      this.stopOnCanvas();
      if (this.liveBefore !== null) this.live().textContent = this.liveBefore;
      this.liveBefore = null;
    },
    /** Undo and redo: the page follows the file's CSS. */
    afterRestore() { if (this.liveBefore !== null) this.live().textContent = '\n' + this.deckCss() + '\n'; },
  };
