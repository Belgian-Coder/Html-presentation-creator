  /* ===========================================================================
     4. INTERFACE TEXTS
     Every text of the presenter view, the settings panel, the drawers and the
     messages is in one table: src/interface-texts.json (in the built file the
     block <script id="deckUiTexts">). Translate that table to translate the
     presentation's interface; the slides themselves are not in it.
       ui('presenter.pause')                    -> "Pause"
       ui('toast.themeSaved', { name: 'Blue' }) -> fills {name} in the text
     HTML elements get their text from data-ui="key". data-ui-title,
     data-ui-aria-label and data-ui-placeholder set those attributes.
     Texts changed in the Texts drawer (presenter view, T) are saved in this
     browser and win over the table; "Save a copy" writes them into the file.
     =========================================================================== */
  const interfaceTexts = {
    fromFile: null,         // the table in the file
    changed: null,          // texts changed in this browser (key -> text), read once and kept
    warnedKeys: new Set(),  // keys missing from the table, warned once each

    /** The table in the file; a broken table gives a message instead of failing silently. */
    file() {
      if (this.fromFile) return this.fromFile;
      const block = byId('deckUiTexts');
      this.fromFile = parseJsonOr(block && block.textContent, null);
      if (!this.fromFile || typeof this.fromFile !== 'object') {
        console.warn('The interface texts block (deckUiTexts) is missing or not valid JSON: keys are shown instead of texts.');
        this.fromFile = {};
      }
      return this.fromFile;
    },
    overrides() {
      if (!this.changed) {
        const saved = storage.read(CONFIG.storageKeys.interfaceTexts);
        this.changed = saved && typeof saved === 'object' ? saved : {};
      }
      return this.changed;
    },
    /** All keys of the table, in the order of the file. */
    keys() { return Object.keys(this.file()); },
    /** The text of a key without its {placeholders} filled in. */
    template(key) {
      const changed = this.overrides();
      if (hasOwn(changed, key) && typeof changed[key] === 'string') return changed[key];
      const table = this.file();
      if (hasOwn(table, key)) return table[key];
      if (!this.warnedKeys.has(key)) {
        this.warnedKeys.add(key);
        console.warn('Interface text missing in interface-texts.json: ' + key);
      }
      return key;
    },
    isChanged(key) { return hasOwn(this.overrides(), key); },
    /** Saves a changed text in this browser; the text of the file removes the change. */
    set(key, text) {
      const changed = Object.assign({}, this.overrides());
      if (text === this.file()[key]) delete changed[key];
      else changed[key] = text;
      this.save(changed);
    },
    resetAll() { this.save({}); },
    save(changed) {
      this.changed = changed;
      storage.write(CONFIG.storageKeys.interfaceTexts, Object.keys(changed).length ? changed : null);
    },
    /** Another window changed the texts: read them again. */
    reload() { this.changed = null; },
    /** The table with the changes of this browser in it (for "Save a copy" and the export). */
    merged() { return Object.assign({}, this.file(), this.overrides()); },
  };


  /** The interface text for `key`, with {name} parts filled in from `values`. */
  function ui(key, values) {
    const text = interfaceTexts.template(key);
    if (!values) return text;
    return text.replace(/\{(\w+)\}/g, (whole, name) => (hasOwn(values, name) ? String(values[name]) : whole));
  }

  /** Fills every element with data-ui (and data-ui-title, -aria-label, -placeholder) inside `container`. */
  function applyInterfaceTexts(container) {
    const attributes = { uiTitle: 'title', uiAriaLabel: 'aria-label', uiPlaceholder: 'placeholder' };
    container.querySelectorAll('[data-ui], [data-ui-title], [data-ui-aria-label], [data-ui-placeholder]').forEach(element => {
      if (element.dataset.ui) element.textContent = ui(element.dataset.ui);
      Object.keys(attributes).forEach(name => {
        if (element.dataset[name]) element.setAttribute(attributes[name], ui(element.dataset[name]));
      });
    });
  }
