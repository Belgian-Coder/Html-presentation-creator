  /* ===========================================================================
     14. TEXTS: CHANGE THE WORDING WITHOUT TOUCHING THE HTML
     The Texts drawer (presenter view, left edge, T) lists every text of the
     slides and every interface text, and lets you change them:
       This slide   the texts of the slide on screen (titles, cards, notes ...)
       All slides   every slide text in one list, slide by slide
       Interface    the interface texts table (section 4), e.g. to translate it
     A change shows at once, also in the audience window, and is saved in this
     browser. "Save a copy" writes the changes into a new presentation file;
     "Export texts" saves all texts as one JSON file, "Import" reads it back.

     How slide texts are found (slideTexts.collect): every piece of text inside
     a slide, in HTML order, becomes an item named "<slide name>#<number>";
     "<slide name>#title" is its chapter title (data-title). Numbers that count
     up (class count-up) are one item; an element with data-edit-attr="x" is
     edited through its attribute x (slide 9's typed words); svg and elements
     with data-no-edit are skipped. A saved change remembers the text it
     replaced: when the HTML of that text was changed since, the old change is
     ignored instead of landing on the wrong text.
     =========================================================================== */

  /** Every text item of the given slides (in this page, or in the copy that "Save a copy" builds). */
  function collectTextItems(sceneElements) {
    const items = [];
    sceneElements.forEach(scene => {
      const name = scene.getAttribute('data-name');
      items.push({ key: name + '#title', slideName: name, kind: 'title', element: scene, original: scene.getAttribute('data-title') || '' });
      let number = 0;
      const addItem = item => items.push(Object.assign({ key: name + '#' + (++number), slideName: name }, item));
      const visit = node => {
        if (node.nodeType === Node.TEXT_NODE) {
          if (node.nodeValue.trim()) addItem({ kind: 'text', node, element: node.parentElement, original: node.nodeValue });
          return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE || node.matches('svg, script, style, template, [data-no-edit]')) return;
        if (node.classList.contains('count-up')) {
          addItem({ kind: 'number', element: node, original: node.getAttribute('data-to') || '0' });
          return;
        }
        if (node.hasAttribute('data-edit-attr')) {
          const attribute = node.getAttribute('data-edit-attr');
          addItem({ kind: 'attribute', attribute, element: node, original: node.getAttribute(attribute) || '' });
          return;
        }
        node.childNodes.forEach(visit);
      };
      scene.childNodes.forEach(visit);
    });
    return items;
  }

  /** The text as it shows in the editor: a text without the spaces around it. */
  function editableValueOf(item) {
    if (item.kind === 'title') return item.element.getAttribute('data-title') || '';
    if (item.kind === 'number') return item.element.getAttribute('data-to') || '0';
    if (item.kind === 'attribute') return item.element.getAttribute(item.attribute) || '';
    return item.node.nodeValue.trim();
  }

  /** The original text in the same form as editableValueOf. */
  function originalValueOf(item) { return item.kind === 'text' ? item.original.trim() : item.original; }

  /** A number for a count-up: "49", "0.47", "-3" (null when it is not a number). */
  function parseCountUpValue(text) {
    const clean = String(text).trim();
    return /^-?\d+(\.\d+)?$/.test(clean) ? clean : null;
  }

  /** Puts `value` into the page (or the copy) for one item. Only changes the DOM, nothing else. */
  function writeTextItem(item, value) {
    if (item.kind === 'title') {
      item.element.setAttribute('data-title', value);
    } else if (item.kind === 'number') {
      const decimals = (value.split('.')[1] || '').length;
      item.element.setAttribute('data-to', value);
      if (decimals || item.element.hasAttribute('data-decimals')) item.element.setAttribute('data-decimals', decimals);
      item.element.countUpRun = (item.element.countUpRun || 0) + 1;   // a count that is still running stops (section 5)
      item.element.textContent = countUpText(item.element, Number(value));
    } else if (item.kind === 'attribute') {
      item.element.setAttribute(item.attribute, value);
      // the still copies and the saved copy show the words too (not while slide 9 is typing them: it finishes with the old words)
      if (item.attribute === 'aria-label' && !item.element.querySelector('.typing-caret')) item.element.textContent = value;
    } else {
      const spacesBefore = item.original.match(/^\s*/)[0];
      const spacesAfter = item.original.match(/\s*$/)[0];
      const splitHost = item.node.splitHost;   // a text shown word by word (section 7): its plain text first, then split again
      if (splitHost) unsplitText(splitHost);
      item.node.nodeValue = spacesBefore + value + spacesAfter;
      if (splitHost) splitText(splitHost);
      // an element that reads its letters out as one word (aria-label on "IDEA", "Thank you") follows the change
      const labelled = item.element.closest('[aria-label]:not([role="img"]):not([data-edit-attr]):not(section)');
      if (labelled) labelled.setAttribute('aria-label', labelled.textContent.replace(/\s+/g, ' ').trim());
    }
  }

  /* ---- Slide texts: the items of this page and the changes saved in this browser ---- */
  const slideTexts = {
    items: [],

    collect() { this.items = collectTextItems(scenes); },
    /** Saved changes: { key: { original, text } }. */
    saved() {
      const saved = storage.read(CONFIG.storageKeys.slideTexts);
      return saved && typeof saved === 'object' ? saved : {};
    },
    /** The saved change of an item, when it still belongs to the same original text. */
    changeOf(item, saved) {
      const change = (saved || this.saved())[item.key];
      return change && change.original === item.original && typeof change.text === 'string' ? change.text : null;
    },
    hasChanges() { return this.changeCount() > 0; },
    changeCount() {
      const saved = this.saved();
      return this.items.filter(item => this.changeOf(item, saved) !== null).length;
    },
    /** At start-up: puts the saved changes into the slides. */
    applySaved() {
      const saved = this.saved();
      this.items.forEach(item => {
        const text = this.changeOf(item, saved);
        if (text !== null) runSafely('text ' + item.key, () => writeTextItem(item, text));
      });
    },
    /** Another window changed the texts: every item shows its saved text or its original again. */
    reload() {
      const saved = this.saved();
      const changedSlides = new Set();
      this.items.forEach(item => {
        const text = this.changeOf(item, saved);
        const value = text !== null ? text : originalValueOf(item);
        if (value === editableValueOf(item)) return;   // only what really changed, so running animations go on
        changedSlides.add(item.slideName);
        runSafely('text ' + item.key, () => writeTextItem(item, value));
      });
      if (!changedSlides.size) return;
      afterTextsChanged(Array.from(changedSlides));
      textEditor.markOutOfDate();
    },
    /** Saves and shows a new text for one item; its original text removes the change. */
    set(item, value) {
      const saved = this.saved();
      if (value === originalValueOf(item)) delete saved[item.key];
      else saved[item.key] = { original: item.original, text: value };
      storage.write(CONFIG.storageKeys.slideTexts, Object.keys(saved).length ? saved : null);
      writeTextItem(item, value);
      afterTextsChanged([item.slideName]);
    },
    resetAll() {
      storage.write(CONFIG.storageKeys.slideTexts, null);
      this.items.forEach(item => writeTextItem(item, originalValueOf(item)));
      afterTextsChanged();
    },
    /** "Save a copy": the saved changes written into the slides of the copy. */
    writeInto(copyDocument, onlyKeys) {   // onlyKeys: just these items (the editor takes each change once)
      const saved = this.saved();
      const copyStage = copyDocument.getElementById('stage');
      if (!copyStage) return;
      collectTextItems(Array.from(copyStage.querySelectorAll('section.scene'))).forEach(item => {
        if (onlyKeys && !onlyKeys.includes(item.key)) return;
        const text = this.changeOf(item, saved);
        if (text !== null) writeTextItem(item, text);
      });
    },
    /** Every text in one file: the slide texts (with their original) and the interface texts. */
    buildExport() {
      return {
        type: 'presentation-texts',
        version: 1,
        presentation: DEFAULT_TITLE,
        exportedAt: new Date().toISOString(),
        slides: this.items.map(item => ({ key: item.key, slide: item.slideName, kind: item.kind, original: originalValueOf(item), text: editableValueOf(item) })),
        interface: interfaceTexts.merged(),
      };
    },
  };

  /** Import of a texts file: slide texts whose original still matches, and the interface texts. */
  function importTexts(data) {
    let changed = 0, skipped = 0;
    if (Array.isArray(data.slides)) {
      data.slides.forEach(entry => {
        if (!entry || typeof entry.key !== 'string' || typeof entry.text !== 'string') return;
        const item = slideTexts.items.find(candidate => candidate.key === entry.key);
        if (!item || entry.original !== originalValueOf(item) || (item.kind === 'number' && parseCountUpValue(entry.text) === null)) { skipped++; return; }
        if (entry.text !== editableValueOf(item)) { slideTexts.set(item, item.kind === 'number' ? parseCountUpValue(entry.text) : entry.text); changed++; }
      });
    }
    if (data.interface && typeof data.interface === 'object') {
      const known = interfaceTexts.file();
      Object.keys(data.interface).forEach(key => {
        if (!hasOwn(known, key) || typeof data.interface[key] !== 'string') return;
        if (data.interface[key] !== ui(key)) { interfaceTexts.set(key, data.interface[key]); changed++; }
      });
      refreshInterfaceTexts();
    }
    textEditor.markOutOfDate();
    textEditor.render();
    return ui('import.texts', { count: changed }) + (skipped ? ' ' + ui('import.textsSkipped', { count: skipped }) : '');
  }

  /** After a slide text changed: titles, the presenter view's preview and notes, and the scripts of the
      slides in `slideNames` (all slides when it is left out). */
  function afterTextsChanged(slideNames) {
    updateChapterBarTitles();
    if (presenter.panel) {
      updateChapterListTitles();
      presenter.panel.dataset.previewFor = '';   // draws the next-slide preview and the notes again
    }
    if (hasPresenterView()) slidesDrawer.markOutOfDate();
    Object.keys(slideBehaviours).forEach(name => {
      const behaviour = slideBehaviours[name];
      if (slideNames && !slideNames.includes(name)) return;
      if (behaviour.onTextChange) runSafely('slide "' + name + '" (text change)', () => behaviour.onTextChange());
    });
    slideComponents.textChanged(scenes.filter(scene => !slideNames || slideNames.includes(scene.dataset.name)));
    if (settingsPanel.isOpen()) settingsPanel.render();
    updatePresenterView();
  }

  /** After an interface text changed: every place that shows interface texts. */
  function refreshInterfaceTexts() {
    applyInterfaceTexts(deck);
    if (sync.isAudience) document.title = DEFAULT_TITLE + ' · ' + ui('audience.windowTitle');
    if (state.currentIndex >= 0) slideCounter.textContent = slideCounterText(state.currentIndex);
    applyPresenterTexts();
    if (hasPresenterView()) slidesDrawer.markOutOfDate();
    if (settingsPanel.isOpen()) settingsPanel.render();
    updatePresenterView();
  }

  const textEditor = {
    container: null,
    tab: 'slide',             // 'slide', 'all' or 'interface'
    renderedFor: '',          // what the list shows now, so it is only drawn again when needed
    saveTimers: new Map(),    // row -> timer: a change is saved shortly after the last key

    build(container) {
      this.container = container;
      this.renderedFor = '';
      container.innerHTML =
        '<div class="presenter-label"><span data-ui="texts.title"></span> <small data-ui="texts.hint"></small></div>' +
        '<div class="texts-tabs" role="tablist">' +
          '<button role="tab" data-tab="slide" data-ui="texts.tabThisSlide"></button>' +
          '<button role="tab" data-tab="all" data-ui="texts.tabAllSlides"></button>' +
          '<button role="tab" data-tab="interface" data-ui="texts.tabInterface"></button>' +
          '<button role="tab" data-tab="images" data-ui="texts.tabImages"></button>' +
        '</div>' +
        '<input class="texts-search" type="search" data-ui-placeholder="texts.search" data-ui-aria-label="texts.search">' +
        '<div class="texts-list"></div>' +
        '<p class="texts-note" data-ui="texts.note"></p>' +
        '<div class="texts-actions">' +
          '<button data-action="save-copy" data-ui="texts.saveCopy"></button>' +
          '<button data-action="export" data-ui="texts.export"></button>' +
          '<button data-action="import" data-ui="texts.import"></button>' +
          '<button data-action="reset" data-ui="texts.resetAll"></button>' +
        '</div>';
      applyInterfaceTexts(container);
      if (window.top !== window) container.querySelector('[data-action="save-copy"]').hidden = true;   // downloads are blocked inside a web page
      container.querySelector('.texts-tabs').addEventListener('click', event => {
        const button = event.target.closest('button[data-tab]');
        if (!button) return;
        button.blur();
        this.tab = button.dataset.tab;
        this.render();
      });
      container.querySelector('.texts-search').addEventListener('input', () => this.render());
      container.closest('.presenter-drawer').addEventListener('pointerenter', () => { if (this.isOutOfDate()) this.render(); });
      container.querySelector('.texts-actions').addEventListener('click', event => {
        const button = event.target.closest('button[data-action]');
        if (button) { button.blur(); this.runAction(button.dataset.action); }
      });
      const list = container.querySelector('.texts-list');
      list.addEventListener('input', event => this.onInput(event.target));
      list.addEventListener('focusin', event => this.highlight(event.target, true));
      list.addEventListener('focusout', event => {
        this.highlight(event.target, false);
        this.saveNow(event.target);
      });
      list.addEventListener('click', event => {
        if (imageSwaps.onListClick(event)) return;
        const reset = event.target.closest('.text-row-reset');
        if (reset) { reset.blur(); this.resetRow(reset.closest('.text-row')); }
      });
    },

    runAction(action) {
      if (action === 'save-copy') {
        try { downloadFile(CONFIG.copyFileName, buildPresentationCopy(), 'text/html'); }
        catch (error) { showToast(ui('toast.saveCopyFailed', { error: error.message })); }
      } else if (action === 'export') {
        downloadFile(exportFileName('texts', 'json'), JSON.stringify(slideTexts.buildExport(), null, 2), 'application/json');
      } else if (action === 'import') {
        byId('importFile').click();
      } else if (action === 'reset') {
        if (!slideTexts.hasChanges() && !Object.keys(interfaceTexts.overrides()).length) return;
        if (askToConfirm(ui('confirm.resetTexts'))) this.resetAll();
      }
    },
    resetAll() {
      slideTexts.resetAll();
      interfaceTexts.resetAll();
      refreshInterfaceTexts();
      this.renderedFor = '';
      this.render();
    },

    /** True while a text field of the drawer has the keyboard. */
    isTyping() {
      const active = document.activeElement;
      return !!active && !!this.container && this.container.contains(active) && active.matches('textarea, input');
    },
    leaveField() { if (document.activeElement) document.activeElement.blur(); },

    /** True while the drawer is on screen (hovered, open with T, or a field in it has the keyboard). */
    isShown() {
      const drawer = this.container && this.container.closest('.presenter-drawer');
      return !!drawer && drawer.matches(':hover, :focus-within, .is-open');
    },
    /** Called on every presenter refresh: "This slide" follows the slide on screen. A closed drawer
        is not drawn (that would cost time on every slide change); it is drawn when it opens. */
    refreshIfNeeded() {
      if (this.container && this.isShown() && this.isOutOfDate()) this.render();
    },
    isOutOfDate() {
      const search = this.container.querySelector('.texts-search').value.trim().toLowerCase();
      return this.renderedFor !== this.tab + '|' + (this.tab === 'slide' ? state.currentIndex : '') + '|' + search;
    },
    /** A text was changed elsewhere (another window, import, undo): draw again when next shown. */
    markOutOfDate() { this.renderedFor = ''; },

    /** Draws the list of the chosen tab (never while you type in one of its texts; the search field may have the keyboard). */
    render() {
      if (!this.container || this.container.querySelector('.texts-list').contains(document.activeElement)) return;
      const search = this.container.querySelector('.texts-search').value.trim().toLowerCase();
      this.renderedFor = this.tab + '|' + (this.tab === 'slide' ? state.currentIndex : '') + '|' + search;
      this.container.querySelectorAll('.texts-tabs button').forEach(button => {
        button.classList.toggle('is-selected', button.dataset.tab === this.tab);
        button.setAttribute('aria-selected', button.dataset.tab === this.tab ? 'true' : 'false');
      });
      const matches = (where, text) => !search || where.toLowerCase().includes(search) || text.toLowerCase().includes(search);
      let html = '';
      if (this.tab === 'images') {
        html = '<p class="texts-note">' + escapeHtml(ui('images.note')) + '</p>' + imageSwaps.rowsHtml(search);
      } else if (this.tab === 'interface') {
        interfaceTexts.keys().forEach(key => {
          const text = interfaceTexts.template(key);
          if (matches(key, text)) html += this.rowHtml('ui:' + key, key, text, interfaceTexts.isChanged(key));
        });
      } else {
        const saved = slideTexts.saved();
        const sceneIndexes = this.tab === 'slide' ? [state.currentIndex] : scenes.map((scene, index) => index);
        sceneIndexes.forEach(index => {
          const scene = scenes[index];
          if (!scene) return;
          let rows = '';
          slideTexts.items.forEach((item, itemIndex) => {
            if (item.slideName !== scene.dataset.name) return;
            const where = this.describe(item);
            const text = editableValueOf(item);
            if (matches(where, text)) rows += this.rowHtml('slide:' + itemIndex, where, text, slideTexts.changeOf(item, saved) !== null);
          });
          if (rows && this.tab === 'all') html += '<h4 class="texts-slide-heading"><b>' + escapeHtml(slideNumberText(index)) + '</b>' + escapeHtml(titleOf(scene)) + '</h4>';
          html += rows;
        });
      }
      const list = this.container.querySelector('.texts-list');
      list.innerHTML = html || '<p class="texts-empty">' + escapeHtml(ui('texts.nothingFound')) + '</p>';
      this.fitAllHeights(list);
    },

    /** Every field as high as its text: first all reads, then all writes (one layout instead of one per field). */
    fitAllHeights(list) {
      const fields = Array.from(list.querySelectorAll('textarea'));
      fields.forEach(field => { field.style.height = 'auto'; });
      const heights = fields.map(field => field.scrollHeight);
      fields.forEach((field, index) => { field.style.height = heights[index] + 2 + 'px'; });
    },

    rowHtml(id, where, text, isChanged) {
      return '<div class="text-row' + (isChanged ? ' is-changed' : '') + '" data-id="' + escapeHtml(id) + '">' +
        '<div class="text-row-head"><span class="text-row-where">' + escapeHtml(where) + '</span>' +
        '<button class="text-row-reset" title="' + escapeHtml(ui('texts.resetOne')) + '" aria-label="' + escapeHtml(ui('texts.resetOne')) + '">↺</button></div>' +
        '<textarea rows="1" spellcheck="true" aria-label="' + escapeHtml(where) + '">' + escapeHtml(text) + '</textarea></div>';
    },

    /** Where a text is: "Chapter title", "Notes", "Number", or the element it sits in (e.g. "h2 · highlight"). */
    describe(item) {
      if (item.kind === 'title') return ui('texts.kindTitle');
      if (item.kind === 'number') return ui('texts.kindNumber');
      if (item.kind === 'attribute') {
        const kinds = { 'aria-label': 'texts.kindAnimated', 'data-qr': 'texts.kindQrLink', 'data-minutes': 'texts.kindBreakMinutes' };
        return ui(kinds[item.attribute] || 'texts.kindAttribute', { attribute: item.attribute });
      }
      if (item.element.closest('.speaker-notes')) return ui('texts.kindNotes');
      if (item.element.closest('[hidden]')) return ui('texts.kindStepText');
      const element = item.element;
      const firstClass = (element.getAttribute('class') || '').split(/\s+/).filter(name => name && !/^(reveal|is-)/.test(name))[0];
      return element.tagName.toLowerCase() + (firstClass ? ' · ' + firstClass : '');
    },

    itemOfRow(row) {
      const [type, id] = row.dataset.id.split(/:(.*)/s);
      return type === 'ui' ? { interfaceKey: id } : { slideItem: slideTexts.items[Number(id)] };
    },

    fitHeight(field) {
      field.style.height = 'auto';
      field.style.height = field.scrollHeight + 2 + 'px';
    },

    onInput(field) {
      if (!field.matches('textarea')) return;
      this.fitHeight(field);
      const row = field.closest('.text-row');
      clearTimeout(this.saveTimers.get(row));
      this.saveTimers.set(row, setTimeout(() => this.saveNow(field), CONFIG.textEditor.saveAfterMs));
    },

    /** Applies and saves what is in the field (a number must be a number). */
    saveNow(field) {
      if (!field || !field.matches || !field.matches('.text-row textarea')) return;
      const row = field.closest('.text-row');
      clearTimeout(this.saveTimers.get(row));
      this.saveTimers.delete(row);
      const target = this.itemOfRow(row);
      runSafely('Texts drawer', () => {
        if (target.interfaceKey) {
          if (field.value === interfaceTexts.template(target.interfaceKey)) return;
          interfaceTexts.set(target.interfaceKey, field.value);
          row.classList.toggle('is-changed', interfaceTexts.isChanged(target.interfaceKey));
          refreshInterfaceTexts();
          return;
        }
        const item = target.slideItem;
        let value = item.kind === 'text' ? field.value.trim() : field.value;
        if (item.kind === 'number') {
          value = parseCountUpValue(value);
          row.classList.toggle('is-invalid', value === null);
          if (value === null) return;
        }
        if (value === editableValueOf(item)) return;
        slideTexts.set(item, value);
        row.classList.toggle('is-changed', value !== originalValueOf(item));
      });
    },

    resetRow(row) {
      const target = this.itemOfRow(row);
      const field = row.querySelector('textarea');
      if (target.interfaceKey) {
        interfaceTexts.set(target.interfaceKey, interfaceTexts.file()[target.interfaceKey]);
        field.value = interfaceTexts.template(target.interfaceKey);
        refreshInterfaceTexts();
      } else {
        slideTexts.set(target.slideItem, originalValueOf(target.slideItem));
        field.value = originalValueOf(target.slideItem);
      }
      row.classList.remove('is-changed', 'is-invalid');
      this.fitHeight(field);
    },

    /** While a slide text's field has the keyboard, its place on the slide gets a dashed outline (this window only). */
    highlight(field, on) {
      if (!field.matches || !field.matches('.text-row textarea')) return;
      const target = this.itemOfRow(field.closest('.text-row'));
      const item = target.slideItem;
      if (!item || item.kind === 'title' || !item.element) return;
      if (!on) item.element.classList.remove('is-text-target');
      else if (item.element.closest('.scene') === currentScene()) item.element.classList.add('is-text-target');
    },
  };
