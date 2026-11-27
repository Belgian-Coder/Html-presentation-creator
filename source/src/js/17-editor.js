  /* ===========================================================================
     17. EDITOR (press E, or the pencil button): make and change the presentation
     The editor works on a copy of this file's HTML (the "model": a document
     built from ORIGINAL_HTML), never on the running slides. You see the
     slides in a list on the left, the chosen slide in the middle, and its
     settings on the right (section 18 draws the middle and the Element tab).
       Save (Ctrl+S)        writes the model into this HTML file itself. Chrome
                            and Edge ask once which file that is (pick this
                            file), then save into it directly; the page then
                            opens the saved file again.
       Save as new file     writes a separate presentation file.
       New presentation     an empty presentation with the theme and templates.
       Play from here       opens the edited presentation in a new tab.
     Every change is kept as a draft in this browser until you save, so a
     closed tab loses nothing. Undo / redo: Ctrl+Z / Ctrl+Y (outside a text).
     Saved files stay readable for people and AI tools: the HTML keeps its
     comments and layout, slides get a numbered banner comment, and images
     go into the ASSETS block instead of the slides.
     Slides with their own script (slideBehaviours, e.g. the car) are locked:
     their texts, numbers and images can change, their layout cannot.
     =========================================================================== */

  /** A small key-value store in the browser database, per deck: the draft and the file to save into. */
  function editorStore(storeName) {
    const openDatabase = () => new Promise((resolve, reject) => {
      const request = indexedDB.open(DECK_ID + '-deck-editor', 1);
      request.onupgradeneeded = () => ['drafts', 'files'].forEach(name => {
        if (!request.result.objectStoreNames.contains(name)) request.result.createObjectStore(name);
      });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const run = async (mode, action) => {
      try {
        const database = await openDatabase();
        return await new Promise((resolve, reject) => {
          const transaction = database.transaction(storeName, mode);
          const request = action(transaction.objectStore(storeName));
          transaction.oncomplete = () => { database.close(); resolve(request.result); };
          transaction.onerror = transaction.onabort = () => { database.close(); reject(transaction.error); };
        });
      } catch (error) {
        return undefined;   // the browser blocks its database: no draft, the file is asked again
      }
    };
    return {
      get: key => run('readonly', store => store.get(key)),
      set: (key, value) => run('readwrite', store => store.put(value, key)),
      remove: key => run('readwrite', store => store.delete(key)),
    };
  }
  const editorDrafts = editorStore('drafts');
  const editorFiles = editorStore('files');

  /** A short fingerprint of this file as it was opened, so a draft is only offered for the same file version. */
  function fileFingerprint() {
    if (!fileFingerprint.value) fileFingerprint.value = textFingerprint(ORIGINAL_HTML);
    return fileFingerprint.value;
  }
  /** A short fingerprint of a text: its length and an FNV-1a hash over every character (any change gives another value). */
  function textFingerprint(text) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 0x01000193) >>> 0; }
    return text.length + ':' + hash.toString(36);
  }

  /** The name of this HTML file, e.g. "my-talk.html". */
  function currentFileName() {
    const name = decodeURIComponent(location.pathname.split('/').pop() || '');
    return /\.html?$/i.test(name) ? name : CONFIG.copyFileName;
  }

  /** "Animation slide": a slide with its own script; its layout is locked in the editor. */
  /** A menu or pop-up list placed on the screen: when it would reach below the window it moves up, and when it is
      taller than the window it gets the window's height and scrolls (the mouse wheel, or the arrow keys), so every
      item can be reached. Called by every menu after it is placed (menu bar, right-click, + Insert, History, easing).
      anchored: a menu that hangs from a button (menu bar, + Insert, History) keeps its place under it and only gets
      shorter, so it never covers the bar it belongs to. */
  function fitMenuOnScreen(menu, anchored) {
    if (!menu || menu.hidden) return;
    menu.style.maxHeight = '';
    if (anchored) {
      const below = window.innerHeight - Math.max(0, menu.getBoundingClientRect().top) - 8;
      if (menu.getBoundingClientRect().height > below) { menu.style.boxSizing = 'border-box'; menu.style.maxHeight = Math.max(120, below) + 'px'; }
      return;
    }
    const room = window.innerHeight - 16;
    if (menu.getBoundingClientRect().height > room) { menu.style.boxSizing = 'border-box'; menu.style.maxHeight = room + 'px'; }   // (its padding and edge counted in)
    const box = menu.getBoundingClientRect();
    if (box.bottom > window.innerHeight - 8) menu.style.top = Math.max(8, window.innerHeight - 8 - box.height) + 'px';
    if (box.top < 8) menu.style.top = '8px';
  }
  /** All slides › Fonts: the choices for every title (data-font-headings) and all running text (data-font-text) on the
      deck; css/05 gives the slides that font ('' = as the theme has it). */
  const DECK_FONTS = [['', 'editor.fontAsDesigned'], ['display', 'editor.fontDisplay'], ['body', 'editor.fontBody'], ['mono', 'editor.fontMono'], ['serif', 'editor.fontSerif'], ['system', 'editor.fontSystem']];
  function isScriptedSlide(scene) { return !!scene && hasOwn(slideBehaviours, scene.getAttribute('data-name')); }

  /** A slide name that is not used yet, from `base` ("results", "results-2", ...). */
  function freeSlideName(base, model) {
    const clean = String(base || 'slide').toLowerCase().replace(/^template-/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'slide';
    const used = new Set(Array.from(model.querySelectorAll('#stage section.scene')).map(scene => scene.getAttribute('data-name')));
    let name = clean;
    for (let n = 2; used.has(name); n++) name = clean + '-' + n;
    return name;
  }

  /** "1:30" for the time fields. */
  function secondsToField(seconds) { return formatMinutesSeconds(Math.max(0, Number(seconds) || 0)); }

  const editor = {
    element: null,
    model: null,              // the document being edited
    selected: null,           // the model <section> on the canvas
    dirty: false,             // changes that are not in the file yet
    history: [],              // snapshots for undo
    future: [],               // snapshots for redo
    htmlCache: new WeakMap(), // node -> its HTML, so a snapshot only serialises what changed
    changedNodes: new WeakSet(),
    draftTimer: null,
    fileHandle: null,         // the file Save writes into (Chrome / Edge)
    panelTab: 'slide',

    isOpen() { return !!this.element && !this.element.hidden; },
    modelStage() { return this.model.getElementById('stage'); },
    modelScenes() { return Array.from(this.modelStage().querySelectorAll(':scope > section.scene')); },
    templateScenes() {
      const block = this.model.getElementById('slideTemplates');
      return block ? Array.from(block.content.querySelectorAll('section.scene')) : [];
    },
    modelAssets() { return readAssetsOf(this.model); },
    animations() {
      const block = this.model.getElementById('deckAnimations');
      const data = parseJsonOr(block && block.textContent, {});
      return data && typeof data === 'object' ? data : {};
    },
    /** Your own text styles (the TEXT STYLES block): { key: { name, values } }. */
    textStyles() {
      const block = this.model.getElementById('deckTextStyles');
      const data = parseJsonOr(block && block.textContent, {});
      return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
    },
    saveTextStyles(styles) {
      let block = this.model.getElementById('deckTextStyles');
      const animations = this.model.getElementById('deckAnimations');
      if (!block && animations) {   // a file from before v55: the block goes right after the ANIMATIONS block
        block = this.model.createElement('script');
        block.setAttribute('type', 'application/json');
        block.id = 'deckTextStyles';
        animations.after(this.model.createTextNode('\n'), block);
      }
      if (block) block.textContent = '\n' + JSON.stringify(styles, null, 2) + '\n';
    },
    saveAnimations(definitions) {
      let block = this.model.getElementById('deckAnimations');
      if (!block) return;
      block.textContent = '\n' + JSON.stringify(definitions, null, 2) + '\n';
    },

    /* ---- Opening and closing ---- */
    async open(sceneName) {
      if (sync.isAudience) return;
      if (deck.hasAttribute('data-preview-copy')) { showToast(ui('editor.previewCopy')); return; }   // "Play from here" tab
      if (peerWindow() || boothMode.on) { showToast(ui('editor.notWhilePresenting')); return; }
      if (window.top !== window) showToast(ui('editor.embeddedNote'));
      closePresenterView();
      settingsPanel.close();
      if (!this.isOpen()) this.titleBefore = document.title;
      boothMode.stop();
      if (!this.model) await this.loadModel();
      this.takeBrowserSettings();
      // the file as it was opened (with this browser's settings written in): a draft is only kept when the work differs from it
      if (this.cleanHtml === undefined && !this.dirty) this.cleanHtml = this.serialize();
      if (!this.element) this.build();
      this.element.hidden = false;
      deck.classList.add('is-editing');
      const wanted = this.modelScenes().find(scene => scene.getAttribute('data-name') === (sceneName || (currentScene() && currentScene().dataset.name)));
      this.select(wanted || this.modelScenes()[0]);
      editorCode.onOpen();   // the page shows the file's own CSS as the editor has it (section 20e)
      this.renderAll();
      runSafely('welcome', () => editorCommands.showWelcome());   // the first time in this browser: the few things to know
    },
    close() {
      if (!this.element) return;
      this.escapeAt = 0;
      this.closeDialog();
      if (editorCommands.spell) editorCommands.stopSpelling();
      editorCommands.closeMenu();
      editorMotion.setDrawing(false);
      editorCode.onClose();
      editorCanvas.finishTyping();
      this.flushDraft();
      this.element.hidden = true;
      deck.classList.remove('is-editing');
      if (this.titleBefore) document.title = this.titleBefore;   // the presentation's own title again
      if (this.dirty) showToast(ui('editor.closedWithDraft'));
    },
    /** The file as it was opened, or a draft kept from before (only a draft of this same file version). */
    async loadModel() {
      this.model = new DOMParser().parseFromString(ORIGINAL_HTML, 'text/html');
      const draft = await editorDrafts.get('draft');
      if (draft && typeof draft.html === 'string' && draft.base !== fileFingerprint()) {
        // the file changed since: not offered and not mentioned (nothing can be done with it here; the draft stays
        // for that older file, until a change here replaces it)
      } else if (draft && typeof draft.html === 'string' && askToConfirm(ui('editor.restoreDraft', { time: formatClockTime(new Date(draft.at)) }))) {
        this.model = new DOMParser().parseFromString(draft.html, 'text/html');
        this.dirty = true;
        // the file as it was opened when the draft was made (its fingerprint): work brought back to it is no change
        if (typeof draft.clean === 'string') this.cleanPrint = draft.clean;
        this.wroteDraft = true;   // (this draft is this page's own now: it goes when the work is back to the file)
      }
    },
    /** Times, texts and images changed in this browser (Settings, Texts drawer, image swap) go into the
        model; a slide or text changed in the editor since is left alone (applySlideSettingsTo checks that). */
    takeBrowserSettings() {
      runSafely('editor: browser settings', () => {
        const applied = this.applied || (this.applied = { estimates: {}, texts: {}, swaps: {} });
        // each change is taken once: a later edit in the editor is never overwritten by an older browser value
        const times = storage.read(CONFIG.storageKeys.estimates) || {};
        Object.keys(times).forEach(name => {
          if (applied.estimates[name] === times[name]) return;
          applied.estimates[name] = times[name];
          const scene = this.modelScenes().find(candidate => candidate.getAttribute('data-name') === name);
          if (scene && Number.isFinite(times[name])) scene.setAttribute('data-estimate', times[name]);
        });
        const texts = slideTexts.saved();
        const newTexts = Object.keys(texts).filter(key => applied.texts[key] !== JSON.stringify(texts[key]));
        if (newTexts.length) slideTexts.writeInto(this.model, newTexts);
        newTexts.forEach(key => { applied.texts[key] = JSON.stringify(texts[key]); });
        const newSwaps = Array.from(imageSwaps.swapped.keys()).filter(key => applied.swaps[key] !== imageSwaps.swapped.get(key).dataUrl.length + '|' + imageSwaps.swapped.get(key).fileName);
        if (newSwaps.length) imageSwaps.writeInto(this.model, newSwaps);
        newSwaps.forEach(key => { applied.swaps[key] = imageSwaps.swapped.get(key).dataUrl.length + '|' + imageSwaps.swapped.get(key).fileName; });
      });
      this.htmlCache = new WeakMap();   // the logo and slides may have changed: the next snapshot reads them again
    },

    /* ---- Changes, undo and redo ---- */
    htmlOf(node) {
      if (node.nodeType === Node.COMMENT_NODE) return '<!--' + node.data + '-->';
      if (node.nodeType !== Node.ELEMENT_NODE) return node.textContent;
      if (!this.changedNodes.has(node) && this.htmlCache.has(node)) return this.htmlCache.get(node);
      const html = node.outerHTML;
      this.htmlCache.set(node, html);
      this.changedNodes.delete(node);
      return html;
    },
    snapshot() {
      const deckElement = this.model.getElementById('deck');
      return {
        children: Array.from(this.modelStage().childNodes).map(node => this.htmlOf(node)),
        title: this.model.title,
        deckStyle: deckElement.getAttribute('style'),
        footer: deckElement.getAttribute('data-footer'), footerText: deckElement.getAttribute('data-footer-text'), guides: deckElement.getAttribute('data-editor-guides'), progressLine: deckElement.getAttribute('data-progress-line'), loop: deckElement.getAttribute('data-loop'), fontHeadings: deckElement.getAttribute('data-font-headings'), fontText: deckElement.getAttribute('data-font-text'), textScale: deckElement.getAttribute('data-text-scale'),   // (section 7; your guides, section 19)
        animations: this.model.getElementById('deckAnimations') ? this.model.getElementById('deckAnimations').textContent : '',
        textStyles: this.model.getElementById('deckTextStyles') ? this.model.getElementById('deckTextStyles').textContent : null,
        customCss: this.model.getElementById('deckCustomCss') ? this.model.getElementById('deckCustomCss').textContent : null,
        customJs: this.model.getElementById('deckCustomJs') ? this.model.getElementById('deckCustomJs').textContent : null,
        assets: this.model.getElementById('deckAssets') ? this.model.getElementById('deckAssets').textContent : '',
        selectedName: this.selected ? this.selected.getAttribute('data-name') : null,
        selectedPath: editorCanvas.selectedPath ? editorCanvas.selectedPath.slice() : null,   // the element selected at that moment
        // the theme of this browser (theme gallery): taken back by Undo only for a step that changed it (themeChange)
        themeState: JSON.stringify([storage.read(CONFIG.storageKeys.theme), storage.read(CONFIG.storageKeys.colors)]),
      };
    },
    restore(snapshot) {
      this.modelStage().innerHTML = snapshot.children.join('');
      this.model.title = snapshot.title;
      const deckElement = this.model.getElementById('deck');
      if (snapshot.deckStyle === null) deckElement.removeAttribute('style'); else deckElement.setAttribute('style', snapshot.deckStyle);
      [['data-footer', snapshot.footer], ['data-footer-text', snapshot.footerText], ['data-editor-guides', snapshot.guides], ['data-progress-line', snapshot.progressLine], ['data-loop', snapshot.loop], ['data-font-headings', snapshot.fontHeadings], ['data-font-text', snapshot.fontText], ['data-text-scale', snapshot.textScale]].forEach(([name, value]) => { if (value === null || value === undefined) deckElement.removeAttribute(name); else deckElement.setAttribute(name, value); });
      if (snapshot.themeChange && snapshot.themeState) {   // a theme picked in the gallery: the one before (or after) again
        const [theme, colors] = JSON.parse(snapshot.themeState);
        storage.write(CONFIG.storageKeys.theme, theme);
        storage.write(CONFIG.storageKeys.colors, colors);
        colorSettings.apply();
      }
      if (this.model.getElementById('deckAnimations')) this.model.getElementById('deckAnimations').textContent = snapshot.animations;
      if (snapshot.textStyles !== null && snapshot.textStyles !== undefined) this.saveTextStyles(parseJsonOr(snapshot.textStyles, {}));
      else if (this.model.getElementById('deckTextStyles')) this.model.getElementById('deckTextStyles').textContent = '\n{}\n';   // made after that step
      if (snapshot.customCss !== null && snapshot.customCss !== undefined) editorCode.saveDeckCss(snapshot.customCss);
      else if (this.model.getElementById('deckCustomCss')) editorCode.saveDeckCss('');
      if (snapshot.customJs !== null && snapshot.customJs !== undefined) editorCode.saveDeckJs(snapshot.customJs);
      else if (this.model.getElementById('deckCustomJs')) editorCode.saveDeckJs('');
      editorCode.afterRestore();
      if (this.model.getElementById('deckAssets')) this.model.getElementById('deckAssets').textContent = snapshot.assets;
      const scenesNow = this.modelScenes();
      const keepPath = this.selected && this.selected.getAttribute('data-name') === snapshot.selectedName ? (snapshot.selectedPath !== undefined ? snapshot.selectedPath : editorCanvas.selectedPath) : null;
      const tabBefore = this.panelTab;
      this.select(scenesNow.find(scene => scene.getAttribute('data-name') === snapshot.selectedName) || scenesNow[0]);
      // undo keeps the element you were working on, and the Animations or Layers tab when it was open (e.g. after dragging a timeline bar)
      if (keepPath) { editorCanvas.selectedPath = keepPath; this.panelTab = 'element'; }
      else if (snapshot.selectedPath === null) editorCanvas.selectedPath = null;   // (nothing was selected then: after undoing an insert, nothing is)
      if (tabBefore === 'animations' || tabBefore === 'layers' || tabBefore === 'code') this.panelTab = tabBefore;
      this.changed();
      this.renderAll();
    },
    /** Remembers the state before a change (for undo). */
    record() {
      const snapshot = this.snapshot();
      snapshot.label = this.nextLabel || ui('editor.historyChange');   // what this undo step takes back (the History list, section 20)
      snapshot.themeChange = !!this.nextThemeChange;
      snapshot.where = this.selected ? ui('editor.historySlide', { number: this.modelScenes().indexOf(this.selected) + 1 }) : '';   // (on which slide)
      snapshot.time = Date.now();
      editorLayers.closeHistory();   // its step numbers would be old now
      this.history.push(snapshot);
      if (this.history.length > CONFIG.editor.undoSteps) this.history.shift();
      this.future = [];
    },
    undo() {
      if (!this.history.length) return;
      editorCanvas.finishTyping();
      editorLayers.closeHistory();
      const step = this.history.pop();
      editorCanvas.lastDuplicate = null;   // (smart duplicate: the next Ctrl+D starts fresh)
      const now = Object.assign(this.snapshot(), { label: step.label, time: step.time, where: step.where, themeChange: step.themeChange });
      this.future.push(now);
      this.restore(step);
      showToast(ui('editor.undid', { what: (step.label || ui('editor.historyChange')) + (step.where ? ' (' + step.where + ')' : '') }));   // (what went back, and where)
    },
    redo() {
      if (!this.future.length) return;
      editorLayers.closeHistory();
      const step = this.future.pop();
      editorCanvas.lastDuplicate = null;
      this.history.push(Object.assign(this.snapshot(), { label: step.label, time: step.time, where: step.where, themeChange: step.themeChange }));
      this.restore(step);
      showToast(ui('editor.redid', { what: (step.label || ui('editor.historyChange')) + (step.where ? ' (' + step.where + ')' : '') }));
    },
    /** A change: undo step first, then the change, then the screen and the draft. */
    edit(change, options) {
      this.record();
      change();
      this.changed(options && options.node);
      if (!options || options.render !== false) this.renderAll();
    },
    /** A slide got another name: agenda buttons that point to it (data-goto, data-until) follow. */
    renameLinks(oldName, name) {
      if (!oldName || oldName === name) return;
      ['data-goto', 'data-until'].forEach(attribute => this.model.querySelectorAll('[' + attribute + '="' + CSS.escape(oldName) + '"]').forEach(link => {
        link.setAttribute(attribute, name);   // agenda buttons keep pointing to this slide
        this.changedNodes.add(link.closest('section.scene') || link);
      }));
    },
    /** Marks a node (and its slide) as changed, keeps a draft, shows "not saved". */
    changed(node) {
      if (node) {
        this.changedNodes.add(node);
        const scene = node.closest && node.closest('section.scene');
        if (scene) this.changedNodes.add(scene);
      }
      this.dirty = true;
      this.renderStatus();
      clearTimeout(this.draftTimer);
      this.draftTimer = setTimeout(() => this.flushDraft(), CONFIG.editor.draftAfterMs);
    },

    /** Writes the draft now (instead of after the short wait). */
    flushDraft() {
      if (!this.dirty || !this.model) return Promise.resolve();
      clearTimeout(this.draftTimer);
      const html = this.serialize();
      // the file as it was opened: kept whole, or (after a restored draft) only its fingerprint
      if (this.cleanHtml !== undefined && !this.cleanPrint) this.cleanPrint = textFingerprint(this.cleanHtml);
      const backToClean = this.cleanHtml !== undefined ? html === this.cleanHtml : !!this.cleanPrint && textFingerprint(html) === this.cleanPrint;
      if (backToClean) {   // nothing really changed (an automatic tidy-up, or undone again): no draft, nothing unsaved
        this.dirty = false;
        this.renderStatus();
        if (!this.wroteDraft) return Promise.resolve();   // (a draft of another version of the file is not this page's to remove)
        this.wroteDraft = false;
        return editorDrafts.remove('draft');
      }
      this.wroteDraft = true;
      return editorDrafts.set('draft', { html, at: Date.now(), base: fileFingerprint(), clean: this.cleanPrint });
    },

    /* ---- Saving ---- */
    /** The model as an HTML file: themes, spotlight and interface texts of this browser written in,
        numbered slide banners, unused assets dropped. */
    serialize(options) {
      const { newFile, savedAt, previewCopy, withoutEditor, withoutPresenter } = options || {};
      const asNewFile = newFile || previewCopy;
      const copy = this.model.cloneNode(true);
      applyGlobalSettingsTo(copy);
      if (savedAt) copy.getElementById('deck').setAttribute('data-saved-at', savedAt);   // to check after the reload
      if (previewCopy) copy.getElementById('deck').setAttribute('data-preview-copy', '');   // "Play from here": no editor there
      renumberSlideBanners(copy);
      writeAssetsOf(copy, pruneAssetsOf(copy, readAssetsOf(copy)));
      if (asNewFile || withoutEditor || withoutPresenter) giveNewDeckId(copy);
      // a copy to share without the editor and/or the presenter view: the code between their marks goes (EDITOR-ONLY,
      // PRESENTER-ONLY; build.py --without does the same), the editor's texts and slide templates too
      if (withoutEditor) {
        copy.getElementById('deck').setAttribute('data-no-editor', '');
        const texts = copy.getElementById('deckUiTexts');
        const table = texts && parseJsonOr(texts.textContent, null);
        if (table) texts.textContent = '\n' + JSON.stringify(Object.fromEntries(Object.entries(table).filter(([key]) => !/^(editor|cmd)\./.test(key))), null, 2) + '\n';
      }
      if (withoutEditor) copy.querySelectorAll('[data-editor-note]').forEach(element => element.removeAttribute('data-editor-note'));
      if (withoutEditor) copy.querySelectorAll('[data-editor-home]').forEach(element => element.removeAttribute('data-editor-home'));   // (a place in the layout before a drag: for Reset the layout)   // (notes for the editor stay in the editor's file)
      if (withoutEditor) copy.getElementById('deck').removeAttribute('data-editor-guides');   // (so do its guides)
      if (withoutPresenter) copy.getElementById('deck').setAttribute('data-no-presenter', '');
      let html = serializeDocument(copy);
      if (withoutEditor) html = html.replace(markedPart('EDITOR'), '');
      if (withoutPresenter) html = html.replace(markedPart('PRESENTER'), '');
      return html;
    },
    canWriteFiles() { return window.top === window && typeof window.showSaveFilePicker === 'function'; },
    async pickFile(suggestedName) {
      try {
        return await window.showSaveFilePicker({ suggestedName, types: [{ description: ui('editor.fileType'), accept: { 'text/html': ['.html'] } }] });
      } catch (error) {
        if (error && error.name !== 'AbortError') showToast(ui('editor.saveFailed', { error: error.message }));   // AbortError: the window was closed
        return null;
      }
    },
    /** True when a remembered file is this page's file: same name, and changed on disk when this page was loaded. */
    async isThisFile(handle) {
      if (!handle || handle.name !== currentFileName()) return false;
      if (!(await this.allowWriting(handle))) return false;   // a new session asks permission first (one click)
      try {
        const file = await handle.getFile();
        return Math.abs(file.lastModified - new Date(document.lastModified).getTime()) < 3000;
      } catch (error) {
        return false;
      }
    },
    async allowWriting(handle) {
      try {
        if (await handle.queryPermission({ mode: 'readwrite' }) === 'granted') return true;
        return await handle.requestPermission({ mode: 'readwrite' }) === 'granted';
      } catch (error) {
        return false;
      }
    },
    async writeFile(handle, html) {
      const writable = await handle.createWritable();
      await writable.write(new Blob([html], { type: 'text/html' }));
      await writable.close();
    },
    /** Save: into this file (Chrome / Edge), or as a download where the browser cannot write files. */
    async save() {
      editorCanvas.finishTyping();
      this.takeBrowserSettings();   // also what changed in Settings while the editor was open
      if (!this.canWriteFiles()) {
        downloadFile(currentFileName(), this.serialize(), 'text/html');
        showToast(ui('editor.downloaded', { file: currentFileName() }));
        return;
      }
      let handle = this.fileHandle || await editorFiles.get('file');
      if (handle && !(await this.isThisFile(handle))) handle = null;   // remembered for another file (or a copy of the same name)
      if (!handle) {
        // the save window opens straight from the click (a question first would use up the browser's permission)
        showToast(ui('editor.pickThisFile', { file: currentFileName() }));
        handle = await this.pickFile(currentFileName());
        if (!handle) return;
        if (handle.name !== currentFileName() && !askToConfirm(ui('editor.otherFileName', { file: handle.name, current: currentFileName() }))) return;
      }
      if (!(await this.allowWriting(handle))) { showToast(ui('editor.notAllowed')); return; }
      const savedAt = new Date().toISOString();
      try {
        // a file with another name is a separate presentation: it gets a deck id of its own
        await this.writeFile(handle, handle.name === currentFileName() ? this.serialize({ savedAt }) : this.serialize({ newFile: true }));
      } catch (error) {
        showToast(ui('editor.saveFailed', { error: error.message }));
        return;
      }
      if (handle.name !== currentFileName()) { showToast(ui('editor.savedElsewhere', { file: handle.name })); return; }
      this.fileHandle = handle;
      await editorFiles.set('file', handle);
      await this.reloadAfterSave(savedAt);
    },
    /** The page opens the saved file again (the editor comes back on the same slide). Only when the reloaded
        page carries this save's stamp are the browser's own copies of settings and the draft cleared
        (finishSaveAfterReload, at start-up): if Save wrote into another file of the same name, nothing is lost. */
    async reloadAfterSave(savedAt) {
      await this.flushDraft();   // kept until the reloaded page proves it is the saved file, then removed
      this.dirty = false;
      try {
        sessionStorage.setItem(DECK_ID + '-deck.reopenEditor', JSON.stringify({ slide: this.selected ? this.selected.getAttribute('data-name') : '', savedAt }));
      } catch (e) { /* no session storage */ }
      location.reload();
    },
    /** Export without editor: a copy to share or send; only this file keeps the editor. */
    async exportWithoutEditor() {
      editorCanvas.finishTyping();
      const name = currentFileName().replace(/\.html?$/i, '') + '-presentation.html';
      await this.writeNewFile(name, this.serialize({ withoutEditor: true }));
    },
    /** Export without presenter view (keeps the editor), or slides only (neither): a copy for one screen. */
    async exportWithout(parts) {
      editorCanvas.finishTyping();
      const slidesOnly = parts.editor && parts.presenter;
      const name = currentFileName().replace(/\.html?$/i, '') + (slidesOnly ? '-slides.html' : '-without-presenter.html');
      await this.writeNewFile(name, this.serialize({ withoutEditor: !!parts.editor, withoutPresenter: !!parts.presenter }));
    },
    /** Save as new file: a separate presentation with its own deck id. */
    async saveAs() {
      editorCanvas.finishTyping();
      const name = currentFileName().replace(/\.html?$/i, '') + '-copy.html';
      await this.writeNewFile(name, this.serialize({ newFile: true }));
    },
    async writeNewFile(suggestedName, html) {
      if (!this.canWriteFiles()) {
        downloadFile(suggestedName, html, 'text/html');
        showToast(ui('editor.downloaded', { file: suggestedName }));
        return;
      }
      const handle = await this.pickFile(suggestedName);
      if (!handle) return;
      try {
        await this.writeFile(handle, html);
        showToast(ui('editor.savedElsewhere', { file: handle.name }));
      } catch (error) {
        showToast(ui('editor.saveFailed', { error: error.message }));
      }
    },
    /** New presentation: the theme, templates and texts of this file with one title slide. */
    async newPresentation() {
      showToast(ui('editor.newInfo'));   // the save window opens straight from the click; this file stays as it is
      const copy = this.model.cloneNode(true);
      const copyStage = copy.getElementById('stage');
      copyStage.querySelectorAll(':scope > section.scene').forEach(scene => scene.remove());
      copyStage.querySelectorAll(':scope > *').forEach(node => { if (!node.matches('.logo, .spotlight')) node.remove(); });
      Array.from(copyStage.childNodes).forEach(node => {
        if ((node.nodeType === Node.COMMENT_NODE && /SLIDE/.test(node.data)) || (node.nodeType === Node.TEXT_NODE && !node.textContent.trim())) node.remove();
      });
      const title = copy.getElementById('slideTemplates') && copy.getElementById('slideTemplates').content.querySelector('section[data-name="template-title"]');
      const first = title ? copy.importNode(title, true) : copy.createElement('section');
      first.setAttribute('data-name', 'title');
      first.setAttribute('data-title', ui('editor.newTitle'));
      first.classList.add('scene');
      const end = Array.from(copyStage.childNodes).find(node => node.nodeType === Node.COMMENT_NODE && /END OF THE SLIDES/.test(node.data)) || null;
      [copy.createTextNode('\n\n  '), copy.createComment(' ==================== SLIDE 01 · title ==================== '), copy.createTextNode('\n  '), first, copy.createTextNode('\n\n  ')]
        .forEach(node => copyStage.insertBefore(node, end));
      copy.title = ui('editor.newTitle');
      copy.getElementById('deckAnimations').textContent = '\n{}\n';
      applyGlobalSettingsTo(copy);
      writeAssetsOf(copy, pruneAssetsOf(copy, readAssetsOf(copy)));
      giveNewDeckId(copy);
      await this.writeNewFile('new-presentation.html', serializeDocument(copy));   // this presentation and its edits stay as they are
    },
    /** Play from here: the edited presentation in a new tab, on the chosen slide. */
    playFromHere() {
      editorCanvas.finishTyping();
      const url = URL.createObjectURL(new Blob([this.serialize({ previewCopy: true })], { type: 'text/html' }));
      const opened = window.open(url + '#' + (this.selected ? this.selected.getAttribute('data-name') : ''), '_blank');
      if (!opened) showToast(ui('toast.popupBlockedTab'));
      else showToast(ui('editor.playOpened'));   // (nothing changes here: say where it went and how to come back)
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    },

    /** File › Export as PDF: the work as it is now (also unsaved) in a new tab that opens the browser's print window
        by itself (#print-pdf, section 23): there, choose "Save as PDF" as the printer. One slide per page. */
    exportPdf(handout) {   // handout: two slides a page with their speaker notes (File › Print a handout)
      editorCanvas.finishTyping();
      const url = URL.createObjectURL(new Blob([this.serialize({ previewCopy: true })], { type: 'text/html' }));
      const opened = window.open(url + (handout ? '#print-handout' : '#print-pdf'), '_blank');
      if (!opened) showToast(ui('toast.popupBlockedTab'));
      else showToast(ui('editor.exportPdfNote'));
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    },

    /* ---- Slides ---- */
    select(scene) {
      editorCanvas.finishTyping();
      if (editorMotion.drawing) editorMotion.setDrawing(false);   // Draw a path belongs to one element on one slide
      this.selected = scene || null;
      editorCanvas.selectElement(null);
      if (this.element) this.renderAll();
    },
    selectedIndex() { return this.modelScenes().indexOf(this.selected); },
    insertSlide(source, after) {
      const scene = this.model.importNode(source, true);
      // (a layout's notes are only an example of what to say: a new slide starts with none)
      if (/^template-/.test(source.getAttribute('data-name') || '')) scene.querySelectorAll(':scope > .speaker-notes').forEach(notes => { notes.innerHTML = ''; });
      const name = freeSlideName(source.getAttribute('data-name'), this.model);
      scene.setAttribute('data-name', name);
      const title = (scene.getAttribute('data-title') || '').replace(/^Template: /, '');
      scene.setAttribute('data-title', title.charAt(0).toUpperCase() + title.slice(1));
      scene.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));   // ids must stay unique
      scene.classList.remove('is-active');
      // templates sit 2 spaces deeper in the file: the copy gets the indentation of a slide
      const walker = this.model.createTreeWalker(scene, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) if (walker.currentNode.nodeValue.includes('\n    ')) walker.currentNode.nodeValue = walker.currentNode.nodeValue.replace(/\n {2}/g, '\n');
      // agenda buttons of a template point to template slides: point them to the slides after this one instead
      const following = after ? this.modelScenes().slice(this.modelScenes().indexOf(after) + 1) : [];
      let next = 0;
      scene.querySelectorAll('[data-goto^="template-"]').forEach(link => {
        const target = following[next++];
        if (target) link.setAttribute('data-goto', target.getAttribute('data-name')); else link.removeAttribute('data-goto');
      });
      scene.querySelectorAll('[data-until^="template-"]').forEach(link => link.removeAttribute('data-until'));
      const banner = this.model.createComment(' ==================== SLIDE ' + name + ' ==================== ');
      const anchor = after ? after.nextSibling : this.endOfSlidesMarker();
      const parent = after ? after.parentNode : this.modelStage();
      parent.insertBefore(this.model.createTextNode('\n\n  '), anchor);
      parent.insertBefore(banner, anchor);
      parent.insertBefore(this.model.createTextNode('\n  '), anchor);
      parent.insertBefore(scene, anchor);
      return scene;
    },
    endOfSlidesMarker() {
      return Array.from(this.modelStage().childNodes).find(node => node.nodeType === Node.COMMENT_NODE && /END OF THE SLIDES/.test(node.data)) || null;
    },
    /** Change layout… (Slide menu, Slide tab, Ctrl+K): the slide is made again from the chosen layout, as PowerPoint's
        Layout does: its title, its small label and its texts (points, paragraphs, card texts, in order) go into the new
        layout's places; texts with no place go into its list (extra points) or else into the speaker notes; places left
        over in a list go. The slide keeps its name (links to it still work), its title, time, transition, background
        and speaker notes. One undo step. */
    changeLayout(source) {
      const old = this.selected;
      this.layoutChange = false;
      if (!old) return;
      const content = scene => scene.querySelector(':scope > .content') || scene;
      const textual = 'li, p, h3, blockquote';
      const pieces = scene => Array.from(content(scene).querySelectorAll(textual)).filter(node => !node.closest('.speaker-notes, .eyebrow') &&
        !node.querySelector(textual) && node.textContent.trim());
      const heading = scene => content(scene).querySelector('h1, h2');
      let made = null, leftOver = 0;
      this.edit(() => {
        made = this.insertSlide(source, old);
        // the title, the small label, then the texts in order
        const oldHeading = heading(old), newHeading = heading(made);
        if (oldHeading && newHeading) newHeading.innerHTML = oldHeading.innerHTML;
        const oldLabel = content(old).querySelector('.eyebrow'), newLabel = content(made).querySelector('.eyebrow');
        if (oldLabel && newLabel) newLabel.textContent = oldLabel.textContent.trim();
        else if (newLabel && !oldLabel) newLabel.remove();   // (the old slide had none: no "Topic" placeholder)
        const texts = pieces(old).map(node => node.innerHTML.trim());
        const places = pieces(made);
        places.forEach((place, index) => { if (index < texts.length) place.innerHTML = texts[index]; });
        const list = content(made).querySelector('ul, ol');
        const extra = texts.slice(places.length);
        if (extra.length && list && list.lastElementChild) extra.forEach(text => { const point = list.lastElementChild.cloneNode(false); point.innerHTML = text; point.removeAttribute('data-reveal-step'); list.appendChild(point); });
        else leftOver = extra.length;
        if (list && texts.length && texts.length < places.length) places.slice(texts.length).filter(place => place.matches('li') && list.contains(place)).forEach(place => place.remove());
        // what belongs to the slide itself: its name (links keep working), title, time, transition, background, notes
        const name = old.getAttribute('data-name');
        Array.from(old.attributes).forEach(attribute => { if (attribute.name !== 'class') made.setAttribute(attribute.name, attribute.value); });
        old.classList.forEach(name => { if (!name.startsWith('is-')) made.classList.add(name); });   // (its own classes too, e.g. a look of its own)
        const oldNotes = old.querySelector(':scope > .speaker-notes'), newNotes = made.querySelector(':scope > .speaker-notes');
        if (oldNotes && newNotes) newNotes.replaceWith(oldNotes.cloneNode(true));
        else if (oldNotes) made.appendChild(oldNotes.cloneNode(true));
        else if (newNotes) newNotes.innerHTML = '';
        const notes = made.querySelector(':scope > .speaker-notes');
        if (leftOver && notes) notes.insertAdjacentHTML('beforeend', extra.map(text => '<p>' + text + '</p>').join(''));
        // the old slide goes, with its banner comment
        for (let node = old.previousSibling; node && (node.nodeType === Node.TEXT_NODE && !node.nodeValue.trim() || node.nodeType === Node.COMMENT_NODE && /SLIDE/.test(node.data));) {
          const previous = node.previousSibling;
          const banner = node.nodeType === Node.COMMENT_NODE;
          node.remove();
          node = previous;
          if (banner) break;
        }
        old.remove();
        made.setAttribute('data-name', name);
      }, { render: false });
      this.select(made);
      this.closeDialog();
      showToast(ui(leftOver ? 'editor.layoutChangedNotes' : 'editor.layoutChanged', { count: leftOver }));
    },
    addSlide(source) {
      let added = null;
      this.edit(() => { added = this.insertSlide(source, this.selected); }, { render: false });
      this.select(added);
      this.closeDialog();
    },
    /** glide: ⧉ Duplicate to glide: first every block of the slide (its freely placed elements and the blocks of its layout
        column) gets a data-morph name of its own, so in the copy right after it they glide from where they were to where you
        put them (move, resize, recolour them there). */
    duplicateSlide(glide) {
      if (!this.selected) return;
      if (isScriptedSlide(this.selected)) { showToast(ui('editor.scriptedNoCopy')); return; }
      let added = null, named = 0;
      this.edit(() => {
        if (glide) {
          const used = new Set(Array.from(this.model.querySelectorAll('[data-morph]')).map(element => element.getAttribute('data-morph')));
          let number = 0;
          Array.from(this.selected.querySelectorAll(':scope > .is-free, :scope > .content > *')).filter(element => !element.matches('.speaker-notes, style, script, template')).forEach(element => {
            if (element.getAttribute('data-morph')) return;   // (one it had keeps its name)
            // not a click item or a block holding one (it would show before its click), nor one holding a glide name of its own
            if (element.matches('[data-reveal-step]') || element.querySelector('[data-reveal-step], [data-morph]')) return;
            let name;
            do { name = 'glide-' + (++number); } while (used.has(name));
            used.add(name);
            element.setAttribute('data-morph', name);
            named++;
          });
          this.changedNodes.add(this.selected);
        }
        added = this.insertSlide(this.selected, this.selected);
      }, { render: false });
      this.select(added);
      showToast(glide ? ui('editor.duplicateGlideDone', { count: named }) : ui('editor.slideDuplicated'));   // (the copy is the slide you see now)
    },
    deleteSlide() {
      if (!this.selected || this.modelScenes().length <= 1) return;
      if (!askToConfirm(ui('editor.confirmDelete', { title: this.selected.getAttribute('data-title') || this.selected.getAttribute('data-name') }))) return;
      const scenesBefore = this.modelScenes();
      const index = scenesBefore.indexOf(this.selected);
      const title = this.selected.getAttribute('data-title') || this.selected.getAttribute('data-name');
      this.edit(() => this.detachSlide(this.selected), { render: false });
      this.select(this.modelScenes()[Math.min(index, this.modelScenes().length - 1)]);
      showToast(ui('editor.slideDeleted', { title }));   // (as an element's Delete: what went, and how it comes back)
    },
    /** The SLIDE banner comment right before a slide, if there is one. */
    bannerOf(scene) {
      let node = scene.previousSibling;
      while (node && node.nodeType === Node.TEXT_NODE && !node.textContent.trim()) node = node.previousSibling;
      return node && node.nodeType === Node.COMMENT_NODE && /SLIDE/.test(node.data) ? node : null;
    },
    /** Takes a slide out of the stage with its banner and the blank lines before them; returns the banner. */
    detachSlide(scene) {
      const banner = this.bannerOf(scene);
      let first = banner || scene;
      while (first.previousSibling && first.previousSibling.nodeType === Node.TEXT_NODE && !first.previousSibling.textContent.trim()) first.previousSibling.remove();
      if (banner) {
        while (banner.nextSibling && banner.nextSibling !== scene) banner.nextSibling.remove();   // the space between banner and slide
        banner.remove();
      }
      scene.remove();
      return banner;
    },
    /** Moves a slide to before `target` (or to the end). Its banner comment goes along. */
    moveSlide(scene, target) {
      if (!scene || scene === target) return;
      this.edit(() => {
        const banner = this.detachSlide(scene);
        const parent = this.modelStage();
        const anchorNode = target ? (this.bannerOf(target) || target) : this.endOfSlidesMarker();
        // the new slide goes before the blank lines that lead to the anchor, so the layout stays tidy
        let anchor = anchorNode;
        while (anchor && anchor.previousSibling && anchor.previousSibling.nodeType === Node.TEXT_NODE && !anchor.previousSibling.textContent.trim()) anchor = anchor.previousSibling;
        parent.insertBefore(this.model.createTextNode('\n\n  '), anchor);
        if (banner) {
          parent.insertBefore(banner, anchor);
          parent.insertBefore(this.model.createTextNode('\n  '), anchor);
        }
        parent.insertBefore(scene, anchor);
      }, { node: scene });
    },
    moveSelectedBy(steps) {
      const list = this.modelScenes();
      const index = list.indexOf(this.selected);
      const targetIndex = index + steps;
      if (index < 0 || targetIndex < 0 || targetIndex >= list.length) return;
      this.moveSlide(this.selected, steps < 0 ? list[targetIndex] : list[targetIndex + 1] || null);
    },

    /* ---- Screen ---- */
    build() {
      const element = this.element = document.createElement('div');
      element.className = 'editor';
      element.innerHTML =
        '<header class="editor-bar">' +
          '<b class="editor-title" data-ui="editor.title"></b>' +
          '<nav class="editor-menubar" role="menubar" data-ui-aria-label="editor.menubar"></nav>' +   // filled by section 20c
          '<span class="editor-bar-group">' +
            '<button data-action="undo" data-ui="editor.undo" data-ui-title="editor.undoTooltip"></button>' +
            '<button class="editor-history-button" data-action="history" data-ui-title="editor.historyTooltip" data-ui-aria-label="editor.historyTooltip">▾</button>' +
            '<button data-action="redo" data-ui="editor.redo" data-ui-title="editor.redoTooltip"></button>' +
          '</span><span class="editor-bar-group">' +
            '<button class="editor-insert-button" data-action="insert-menu" data-ui="editor.insertMenu" data-ui-title="editor.insertMenuTooltip"></button>' +
            '<button class="editor-find-button" data-action="command-palette" data-ui="editor.findButton" data-ui-title="editor.findButtonTooltip"></button>' +
          '</span>' +
          '<span class="editor-bar-spacer"></span>' +
          '<span class="editor-bar-group">' +
            '<button data-action="play" data-ui="editor.play" data-ui-title="editor.playTooltip"></button>' +
            '<button class="is-primary" data-action="save" data-ui="editor.save" data-ui-title="editor.saveTooltip"></button>' +
            '<button data-action="close" data-ui="editor.close"></button>' +
          '</span>' +
        '</header>' +
        '<button class="editor-edge-tab is-left" data-dock="left" data-ui-title="editor.dockSlidesTooltip"><span data-ui="editor.dockSlides"></span></button>' +
        '<button class="editor-edge-tab is-right" data-dock="right" data-ui-title="editor.dockPanelTooltip"><span data-ui="editor.dockPanel"></span></button>' +
        '<nav class="editor-slides editor-dock" data-dock="left" data-ui-aria-label="editor.slides">' +
          '<div class="editor-dock-head"><b data-ui="editor.dockSlides"></b><button class="editor-pin" data-action="pin-left" data-ui-title="editor.pinTooltip" aria-pressed="false">📌</button></div>' +
          '<ol class="editor-slide-list" role="listbox" data-ui-aria-label="editor.slides"></ol>' +
          '<div class="editor-slide-actions">' +
            '<button data-action="add-slide" data-ui="editor.addSlide"></button>' +
            '<button data-action="duplicate-slide" data-ui="editor.duplicateSlide"></button>' +
            '<button data-action="duplicate-glide" data-ui="editor.duplicateGlide" data-ui-title="editor.duplicateGlideTooltip"></button>' +
            '<button data-action="overview" data-ui="editor.overview" data-ui-title="editor.overviewTooltip"></button>' +
            '<button data-action="delete-slide" data-ui="editor.deleteSlide"></button>' +
            '<button data-action="slide-up" data-ui-title="editor.slideUp" data-ui-aria-label="editor.slideUp">↑</button>' +
            '<button data-action="slide-down" data-ui-title="editor.slideDown" data-ui-aria-label="editor.slideDown">↓</button>' +
          '</div>' +
        '</nav>' +
        '<main class="editor-canvas" data-ui-aria-label="editor.regionSlide"><div class="editor-canvas-scroll"><div class="editor-stage-box"><div class="editor-stage still-slide"></div></div></div></main>' +
        '<aside class="editor-panel editor-dock" data-dock="right">' +
          '<div class="editor-dock-head"><b data-ui="editor.dockPanel"></b><span class="editor-dock-tools"><button class="editor-tips-toggle" data-action="toggle-tips" aria-pressed="false" data-ui="editor.tips" data-ui-title="editor.tipsTooltip"></button>' +
            '<button class="editor-pin" data-action="pin-right" data-ui-title="editor.pinTooltip" aria-pressed="false">📌</button></span></div>' +
          '<div class="editor-tabs" role="tablist">' +
            '<button role="tab" data-tab="element" data-ui="editor.tabElement"></button>' +
            '<button role="tab" data-tab="layers" data-ui="editor.tabLayers"></button>' +
            '<button role="tab" data-tab="animations" data-ui="editor.tabAnimations"></button>' +
            '<button role="tab" data-tab="slide" data-ui="editor.tabSlide"></button>' +
            '<button role="tab" data-tab="deck" data-ui="editor.tabDeck" data-ui-title="editor.tabDeckTooltip"></button>' +
            '<button role="tab" data-tab="code" data-ui="editor.tabCode" data-ui-title="editor.tabCodeTooltip"></button>' +
          '</div>' +
          '<div class="editor-panel-body" role="tabpanel"></div>' +
        '</aside>' +
        '<section class="editor-timeline" tabindex="-1" data-ui-aria-label="editor.tlTitle">' +   // the animation panel (section 20d)
          '<div class="timeline-resize" data-ui-title="editor.tlResize"></div>' +
          '<header class="timeline-head"><b data-ui="editor.tlTitle"></b><span class="timeline-sections"></span>' +
            '<button data-tl="play" data-ui="editor.playSlide"></button>' +
            '<button data-tl="key-here" data-ui="editor.tlKeyHere" data-ui-title="editor.tlKeyHereTooltip"></button>' +
            '<button data-tl="graph" aria-pressed="false" data-ui="editor.tlGraph" data-ui-title="editor.tlGraphTooltip"></button>' +
            '<button data-tl="ease" data-ui="editor.tlEase" data-ui-title="editor.tlEaseTooltip"></button>' +
            '<span class="editor-bar-spacer"></span>' +
            '<button data-tl="zoom-out" data-ui-title="editor.tlZoomOut" data-ui-aria-label="editor.tlZoomOut">−</button>' +
            '<button data-tl="zoom-fit" data-ui="editor.tlFit" data-ui-title="editor.tlFitTooltip"></button>' +
            '<button data-tl="zoom-in" data-ui-title="editor.tlZoomIn" data-ui-aria-label="editor.tlZoomIn">+</button>' +
            '<button data-tl="close" data-ui-title="editor.tlHide" data-ui-aria-label="editor.tlHide">×</button></header>' +
          '<div class="timeline-body"></div><div class="tl-readout" hidden></div>' +
        '</section>' +
        '<footer class="editor-statusbar">' +   // save state · slide n / m · the selection · zoom, grid, snap
          '<span class="editor-status" aria-live="polite"></span><span class="editor-file"></span>' +
          '<span class="status-slide"></span><span class="status-selection"></span><span class="status-overflow" role="button" tabindex="0" hidden></span>' +
          '<span class="editor-zoom"><button data-action="zoom-out" data-ui-title="editor.zoomOut" data-ui-aria-label="editor.zoomOut">−</button>' +
          '<button class="editor-zoom-level" data-action="zoom-fit" data-ui-title="editor.zoomFit">100%</button>' +
          '<button data-action="zoom-in" data-ui-title="editor.zoomIn" data-ui-aria-label="editor.zoomIn">+</button>' +
          '<button class="editor-view-toggle" data-action="view-grid" aria-pressed="false" data-ui="editor.grid" data-ui-title="editor.gridTooltip"></button>' +
          '<button class="editor-view-toggle" data-action="view-snap" aria-pressed="true" data-ui="editor.snap" data-ui-title="editor.snapTooltip"></button>' +
          '<button data-action="guide-add-x" data-ui-title="editor.guideAddX" data-ui-aria-label="editor.guideAddX">+ ┃ ' + escapeHtml(ui('editor.guideWord')) + '</button><button data-action="guide-add-y" data-ui-title="editor.guideAddY" data-ui-aria-label="editor.guideAddY">+ ━ ' + escapeHtml(ui('editor.guideWord')) + '</button>' +
          '<button class="editor-view-toggle" data-action="view-timeline" aria-pressed="true" data-ui="editor.tlTitle" data-ui-title="editor.tlToggleTooltip"></button></span>' +
        '</footer>' +
        '<div class="editor-dialog" role="dialog" aria-modal="true" aria-labelledby="editorDialogTitle" hidden><div class="editor-dialog-card"><div class="editor-dialog-head"><b id="editorDialogTitle" data-ui="editor.chooseTemplate"></b>' +
          '<button data-action="close-dialog" data-ui="editor.cancel"></button></div><div class="editor-template-grid"></div></div></div>';
      deck.appendChild(element);
      applyInterfaceTexts(element);
      element.addEventListener('click', event => {
        const button = event.target.closest('button[data-action]');
        // blur after a click: the element keys work right away; pressed with the keyboard (Enter, Space: no click count) it keeps the keyboard
        if (button && element.contains(button)) { if (event.detail) button.blur(); this.runAction(button.dataset.action, button); }
        const tab = event.target.closest('.editor-tabs button[data-tab]');
        if (tab) { if (event.detail) tab.blur(); this.panelTab = tab.dataset.tab; this.renderPanel(); }
      });
      // the panel's tabs: ← → go to the next tab and open it (as tabs do everywhere)
      element.querySelector('.editor-tabs').addEventListener('keydown', event => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home' && event.key !== 'End') return;
        const tabs = Array.from(element.querySelectorAll('.editor-tabs button[data-tab]')).filter(tab => !tab.disabled);
        const index = tabs.indexOf(document.activeElement);
        if (index < 0) return;
        event.preventDefault();
        event.stopPropagation();   // (the arrows must not also move the selected element)
        const next = tabs[event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
        next.focus();
        this.panelTab = next.dataset.tab;
        this.renderPanel();
      });
      this.setUpSlideList();
      editorCanvas.setUp(element);
      editorTools.setUp();
      editorLayers.setUp();
      editorCommands.setUp();   // the menu bar, the docks, the status bar (section 20c)
      editorMotion.setUp();   // Draw a path (section 20b)
      editorTimeline.setUp();   // the animation panel (section 20d)
      editorCode.setUp();   // the Code tab (section 20e)
      // the name field of "+ Save as style" (section 20): Cancel keeps the keyboard in it (its change would save the name);
      // Esc, or leaving it empty, closes it
      element.addEventListener('mousedown', event => { if (event.target.closest('[data-action="text-style-cancel"]')) event.preventDefault(); });
      element.addEventListener('focusout', event => {
        if (!event.target.matches('[data-tool-field="newTextStyle"]') || event.target.value.trim()) return;
        setTimeout(() => {
          if (!editorLayers.namingStyle) return;
          editorLayers.namingStyle = false;
          if (!element.querySelector('.editor-panel-body').contains(document.activeElement)) this.renderPanel();   // (another field you went to keeps its place)
        }, 0);
      });
      element.addEventListener('pointerdown', () => { this.escapeAt = 0; this.byKeyboard = false; }, true);   // (a click ends "press Esc again")
      element.querySelector('.editor-panel-body').addEventListener('change', event => this.onPanelChange(event));
      // Image sliders (Brightness, Contrast, Colour): the picture follows while you drag (the change on letting go is kept)
      element.querySelector('.editor-panel-body').addEventListener('input', event => { if (event.target.matches('input[type="range"][data-tool-field^="adjust-"]')) runSafely('adjust', () => editorTools.previewAdjust(event.target)); });
      // a section's heading folds or opens it (a click, or Enter / Space on it)
      element.querySelector('.editor-panel-body').addEventListener('click', event => { const head = event.target.closest('.editor-section-head'); if (head) this.toggleSection(head); });
      element.querySelector('.editor-panel-body').addEventListener('keydown', event => {
        const head = event.target.closest('.editor-section-head');
        if (head && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); event.stopPropagation(); this.toggleSection(head); }
      });
      // a tile of the transition picker (Slide tab): chooses that transition through the list, so it is one change
      // with the same undo step and preview
      // a theme of the gallery (All slides tab): used for the whole presentation at once
      element.querySelector('.editor-panel-body').addEventListener('click', event => {
        const theme = event.target.closest('[data-pick-theme]');
        if (!theme || !themeLibrary.colorsOf(theme.dataset.pickTheme)) return;
        const before = colorSettings.hasOverrides() ? null : colorSettings.activeThemeName();   // (named in the message: a click on it goes back)
        // (an undo step of its own: Ctrl+Z gives the theme before again)
        this.nextLabel = ui('editor.historyTheme', { name: theme.dataset.pickTheme });
        this.nextThemeChange = true;
        this.record();
        this.nextLabel = null;
        this.nextThemeChange = false;
        colorSettings.useTheme(theme.dataset.pickTheme);
        this.changed();   // (the file gets it when it is saved)
        this.renderPanel();
        const again = element.querySelector('.editor-panel-body [data-pick-theme="' + CSS.escape(theme.dataset.pickTheme) + '"]');
        if (again) again.focus({ preventScroll: true });
        showToast(ui('editor.themeUsed', { name: theme.dataset.pickTheme }) + (before && before !== theme.dataset.pickTheme ? ' ' + ui('editor.themeBack', { name: before }) : ''));
      });
      element.querySelector('.editor-panel-body').addEventListener('click', event => {
        const tile = event.target.closest('[data-pick-transition]');
        const list = tile && element.querySelector('.editor-panel-body [data-slide-field="transition"]');
        if (!list) return;
        const value = tile.dataset.pickTransition, focused = document.activeElement === tile;
        if (list.value === value) { editorLayers.previewTransition(); return; }   // (already chosen: no change, no undo step)
        list.value = value;
        list.dispatchEvent(new Event('change', { bubbles: true }));
        if (focused) {   // the panel is drawn again: the keyboard stays on the tiles
          const again = element.querySelector('.editor-panel-body [data-pick-transition="' + CSS.escape(value) + '"]');
          if (again) again.focus({ preventScroll: true });
        }
      });
      window.addEventListener('beforeunload', event => {
        if (this.dirty && this.isOpen()) { event.preventDefault(); event.returnValue = ''; }   // the draft is kept anyway
      });
    },
    runAction(action, button) {
      // while the slide plays on the canvas, a change first brings the still slide back (the playing copy is never written)
      if (editorTools.playStep >= 0 && !/^(play-|zoom-|view-|motion-|bar-animate$|bar-more$|bar-styles$|bar-align$|bar-appear$|slide-pace$|view-timeline$|code-run$|code-stop$|motion-mine-save$|motion-mine-export$|motion-mine-import$|motion-mine-remove$|morph-pair$|motion-orient$|select-path$|shortcuts$|close-dialog$|command-palette$|pin-)/.test(action)) editorTools.stopPlaying();
      // the name of the undo step this button makes (History list): its text, or its title when the text is only a sign (↑, +)
      const caption = button && (button.querySelector(':scope > span') || button);
      const text = caption ? caption.textContent.replace(/[▶■↑↓]/g, '').replace(/\s+/g, ' ').trim() : '';
      this.nextLabel = button ? (historyLabel(text.length >= 3 ? text : String(button.getAttribute('title') || text).replace(/\s*\(.*?\)\s*$/, '')) || null) : null;
      // (no button: a key or a command: its name in the menus, e.g. "Delete", "Duplicate", never just "Change")
      if (!this.nextLabel) { const command = editorCommands.commandById(action); if (command) this.nextLabel = historyLabel(ui(command[1]).replace(/…$/, '')); }
      try { this.runActionNamed(action, button); } finally { this.nextLabel = null; }
    },
    runActionNamed(action, button) {
      const actions = {
        undo: () => this.undo(), redo: () => this.redo(), play: () => this.playFromHere(), 'export-pdf': () => this.exportPdf(), 'print-handout': () => this.exportPdf(true),
        settings: () => settingsPanel.open(), save: () => this.save(), 'save-as': () => this.saveAs(), new: () => this.newPresentation(),
        close: () => this.close(), 'add-slide': () => this.openTemplateDialog(), 'duplicate-slide': () => this.duplicateSlide(), 'duplicate-glide': () => this.duplicateSlide(true),
        'delete-slide': () => this.deleteSlide(), 'slide-up': () => this.moveSelectedBy(-1), 'slide-down': () => this.moveSelectedBy(1),
        'close-dialog': () => this.closeDialog(),
        'command-palette': () => editorCommands.openPalette(),
        'export-clean': () => this.exportWithoutEditor(),
        'export-no-presenter': () => this.exportWithout({ presenter: true }),
        'export-slides-only': () => this.exportWithout({ editor: true, presenter: true }),
        'add-template': () => {
          const source = button.dataset.template === '' ? this.blankSlide() : this.templateScenes().find(scene => scene.getAttribute('data-name') === button.dataset.template);
          if (source && this.layoutChange) this.changeLayout(source);   // Change layout…: this slide in that layout
          else if (source) this.addSlide(source);
        },
        'change-layout': () => this.openTemplateDialog(true),
        'replace-logo': () => editorCanvas.pickFile('image/*', file => editorCanvas.replaceLogo(file)),
      };
      if (actions[action]) runSafely('editor: ' + action, actions[action]);
      else if (!editorTools.runAction(action, button) && !editorLayers.runAction(action, button) && !editorMotion.runAction(action, button) && !editorCommands.runAction(action, button) && !editorCode.runAction(action)) editorCanvas.runAction(action, button);
    },
    renderAll() {
      if (!this.element || !this.model) return;
      // (the slides on the canvas show the fonts chosen for all slides: the live deck gets the model's two marks)
      ['data-font-headings', 'data-font-text', 'data-text-scale'].forEach(name => { const value = this.model.getElementById('deck').getAttribute(name); if (value) deck.setAttribute(name, value); else deck.removeAttribute(name); });
      this.renderStatus();
      this.renderSlideList();
      editorCanvas.render(this.selected);
      this.renderPanel();
      editorMotion.restoreScrub();   // a redraw after a change keeps the slide at the playhead (section 20b)
      editorCommands.showHint();   // an empty slide says how to start (section 20c)
      if (this.overviewOpen()) editorLayers.openOverview({ redraw: true });   // after a move, undo or redo: the overview shows the new order
    },
    renderStatus() {
      if (!this.element) return;
      this.element.querySelector('.editor-file').textContent = currentFileName();
      this.element.querySelector('.editor-status').textContent = this.dirty ? ui('editor.statusUnsaved') : ui('editor.statusSaved');
      this.element.querySelector('.editor-status').classList.toggle('is-unsaved', this.dirty);
      if (this.isOpen()) document.title = (this.dirty ? '● ' : '') + currentFileName() + ' — ' + ui('editor.title');   // as a desktop program's window
      this.element.querySelector('[data-action="undo"]').disabled = !this.history.length;
      this.element.querySelector('[data-action="redo"]').disabled = !this.future.length;
      this.element.dataset.undoSteps = this.history.length;   // (read by tools/ui-audit-actions.mjs: did an action change the work?)
    },

    /* ---- The slide list (left) ---- */
    setUpSlideList() {
      const list = this.element.querySelector('.editor-slide-list');
      let dragged = null;
      // a click on a slide gives the keyboard back to the editor's keys (as before); only F6 puts it in the list
      list.addEventListener('click', event => { if (event.detail && list.contains(document.activeElement)) document.activeElement.blur(); }, true);
      // with the keyboard in the list (F6): ↑ ↓ Home End choose a slide, Enter goes to that slide
      list.addEventListener('keydown', event => {
        if (event.ctrlKey || event.metaKey || event.altKey || !event.target.matches('li[data-index]')) return;
        const scenes = this.modelScenes(), index = scenes.indexOf(this.selected);
        const next = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: scenes.length - 1 }[event.key];
        if (next !== undefined) {
          event.preventDefault();
          event.stopPropagation();   // (not also: move the selected element)
          if (scenes[next] && next !== index) this.select(scenes[next]);
        } else if (event.key === 'Enter') {
          event.preventDefault();
          event.stopPropagation();
          this.focusRegion(0);
        }
      });
      list.addEventListener('click', event => {
        const item = event.target.closest('li[data-index]');
        if (!item) return;
        const scene = this.modelScenes()[Number(item.dataset.index)];
        // Ctrl+click or Shift+click: several slides picked (with the open one), for "Use on the selected slides"
        if ((event.ctrlKey || event.metaKey || event.shiftKey) && scene && this.selected) {
          this.slidePicks = this.slidePicks || new Set();
          if (!this.slidePicks.size) this.slidePicks.add(this.selected.getAttribute('data-name'));
          const name = scene.getAttribute('data-name');
          if (this.slidePicks.has(name) && scene !== this.selected) this.slidePicks.delete(name); else this.slidePicks.add(name);
          this.renderSlideList();
          this.renderPanel();
          showToast(ui('editor.slidesPicked', { count: this.slidePicks.size }));
          return;
        }
        this.slidePicks = null;
        this.select(scene);
      });
      list.addEventListener('dragstart', event => {
        const item = event.target.closest('li[data-index]');
        if (!item) return;
        dragged = this.modelScenes()[Number(item.dataset.index)];
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', item.dataset.index);
      });
      list.addEventListener('dragover', event => {
        const item = event.target.closest('li[data-index]');
        if (!dragged || !item) return;
        event.preventDefault();
        list.querySelectorAll('.is-drop-before').forEach(other => other.classList.remove('is-drop-before'));
        item.classList.add('is-drop-before');
      });
      list.addEventListener('dragover', event => { if (dragged && !event.target.closest('li[data-index]')) event.preventDefault(); });   // below the last slide: to the end
      list.addEventListener('drop', event => {
        const item = event.target.closest('li[data-index]');
        list.querySelectorAll('.is-drop-before').forEach(other => other.classList.remove('is-drop-before'));
        if (!dragged) return;
        event.preventDefault();
        const all = this.modelScenes();
        const target = item ? all[Number(item.dataset.index)] : null;
        const staysPut = target === dragged || all[all.indexOf(dragged) + 1] === target || (!target && all[all.length - 1] === dragged);
        if (!staysPut) this.moveSlide(dragged, target);
        dragged = null;
      });
      list.addEventListener('dragend', () => { dragged = null; });
    },
    renderSlideList() {
      const list = this.element.querySelector('.editor-slide-list');
      const hadKeyboard = list.contains(document.activeElement);   // (drawn again: the keyboard stays on the open slide)
      const assets = this.modelAssets();
      list.innerHTML = '';
      this.modelScenes().forEach((scene, index) => {
        const item = document.createElement('li');
        item.dataset.index = index;
        item.draggable = true;
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', String(scene === this.selected));
        item.tabIndex = scene === this.selected ? 0 : -1;   // one stop for Tab: the open slide (the arrows go on from it)
        item.classList.toggle('is-selected', scene === this.selected);
        item.classList.toggle('is-picked', !!this.slidePicks && this.slidePicks.has(scene.getAttribute('data-name')));
        item.classList.toggle('is-skipped', scene.hasAttribute('data-skip'));
        const badges = (scene.hasAttribute('data-backup') ? '<span class="editor-badge" data-ui="editor.badgeBackup"></span>' : '') +
          (scene.hasAttribute('data-skip') ? '<span class="editor-badge" data-ui="editor.badgeSkipped"></span>' : '') +
          (scene.querySelector('[data-editor-note]') ? '<span class="editor-badge" data-ui="editor.badgeComments" data-ui-title="editor.badgeCommentsTooltip"></span>' : '') +
          (isScriptedSlide(scene) ? '<span class="editor-badge" data-ui="editor.badgeScripted"></span>' : '');
        item.innerHTML = '<span class="editor-slide-number">' + (index + 1) + '</span><div class="editor-thumb still-slide"><div class="editor-thumb-stage"></div></div>' +
          '<span class="editor-slide-title">' + escapeHtml(scene.getAttribute('data-title') || scene.getAttribute('data-name')) + '</span>' + badges;
        item.querySelector('.editor-thumb-stage').appendChild(editorCanvas.stillCopyOf(scene, assets));
        list.appendChild(item);
      });
      applyInterfaceTexts(list);
      scaleThumbnails(list);
      const selectedItem = list.querySelector('.is-selected');
      if (selectedItem) selectedItem.scrollIntoView({ block: 'nearest' });
      if (hadKeyboard && selectedItem) selectedItem.focus({ preventScroll: true });
    },
    /** F6 (Shift+F6 back) goes round the editor's parts, as in Office and Windows: 0 the slide, 1 the slide list,
        2 the panel. A part that is not on screen (a hidden dock) is skipped. A short note says where the keyboard is. */
    cycleRegion(back) {
      const active = document.activeElement;
      const now = active && active.closest('.editor-slides') ? 1 : active && active.closest('.editor-panel') ? 2 : 0;
      for (let step = 1; step <= 3; step++) {
        const region = (now + (back ? -step : step) + 3) % 3;
        if (this.focusRegion(region)) return;
      }
    },
    focusRegion(region) {
      const target = region === 1 ? this.element.querySelector('.editor-slide-list li[tabindex="0"]')
        : region === 2 ? this.element.querySelector('.editor-tabs button[aria-selected="true"]')
        : this.element.querySelector('.editor-canvas');
      if (!target || !target.getClientRects().length) return false;
      const dock = target.closest('.editor-dock');
      const sliding = !!dock && !editorCommands.layout[dock.dataset.dock] && !dock.classList.contains('is-open');
      if (sliding) editorCommands.openDock(dock.dataset.dock);   // a dock that only shows on hover: shown now
      // the slide area takes the keyboard only for F6 (always focusable, a click on the slide would take it: other code expects the page to keep it)
      if (region === 0) { target.tabIndex = -1; target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true }); }
      target.focus({ preventScroll: region !== 1 });
      if (document.activeElement !== target) {
        if (!sliding) return false;
        setTimeout(() => target.focus({ preventScroll: region !== 1 }), 160);   // (it becomes visible as it slides in: .14 s, css/13)
      }
      showToast(ui('editor.regionNow', { region: ui(['editor.regionSlide', 'editor.slides', 'editor.dockPanel'][region]) }));
      return true;
    },
    /** What has the keyboard in the panel, said so that the same control can be found after the panel is drawn
        again: its kind, its data-* attributes, which of the alike it is, and where it is in the panel. */
    focusSignature(body) {
      const active = document.activeElement;
      if (!active || active === body || !body.contains(active)) return null;
      const all = Array.from(body.querySelectorAll(PANEL_FOCUSABLE));
      const attributes = Array.from(active.attributes).filter(attribute => attribute.name.startsWith('data-') && !attribute.name.startsWith('data-ui')).map(attribute => [attribute.name, attribute.value]);
      const alike = element => element.tagName === active.tagName && attributes.every(([name, value]) => element.getAttribute(name) === value);
      return { tab: this.shownTab, alike, occurrence: all.filter(alike).indexOf(active), hasAttributes: attributes.length > 0 };
    },
    /** After the redraw (the same tab, the last thing done was a key): the same control gets the keyboard back. */
    restoreFocus(body, signature) {
      // (only for keyboard work: after a click the keyboard goes back to the slide's keys, as it always did)
      if (!signature || !this.byKeyboard || signature.tab !== this.panelTab || (document.activeElement && document.activeElement !== document.body && !body.contains(document.activeElement))) return;
      const matches = signature.hasAttributes ? Array.from(body.querySelectorAll(PANEL_FOCUSABLE)).filter(signature.alike) : [];
      const target = matches[signature.occurrence] || matches[0];
      if (target && !target.disabled) target.focus({ preventScroll: true });   // (gone: the keyboard goes back to the slide's keys, as before)
    },

    /* ---- Add a slide: a template, or an empty slide ---- */
    blankSlide() {
      const template = this.model.createElement('template');
      template.innerHTML = '<section class="scene" data-name="slide" data-title="' + escapeHtml(ui('editor.blankTitle')) + '" data-estimate="40">\n' +
        '      <div class="content">\n        <div class="eyebrow reveal" style="--order:0">' + escapeHtml(ui('editor.blankEyebrow')) + '</div>\n' +
        '        <h2 class="reveal" style="--order:1">' + escapeHtml(ui('editor.blankHeading')) + '</h2>\n      </div>\n    </section>';
      return template.content.firstElementChild;
    },
    /** File › Insert slides from another presentation… (also the Slide menu, Ctrl+K): another file made with this
        program (its .html) is read here, in this browser; its slides show as pictures, you click the ones you want, and
        they come in after this slide with their pictures, sounds and animations. One undo step. A look written for that
        file's own slides (CSS or code by slide name) does not come along: the dialog says so. */
    importSlides() {
      editorCanvas.pickFile('.html,.htm,text/html', file => file.text().then(html => this.openImportDialog(html, file.name)).catch(() => { this.closeDialog(); showToast(ui('editor.importUnreadable')); }));
    },
    openImportDialog(html, fileName) {
      const other = new DOMParser().parseFromString(html, 'text/html');   // (an inert document: nothing in it runs)
      // the other file is not trusted: each slide goes through the same cleaning as typed HTML (section 20e: no scripts,
      // frames, outside files or on… handlers), and its own slide code stays behind too; a file only on a picture, video or sound
      const scenes = Array.from(other.querySelectorAll('#stage > section.scene')).map(scene => {
        const result = editorCode.parseHtml(scene.outerHTML, 'slide');
        if (!result.node) return null;
        result.node.querySelectorAll('script').forEach(node => node.remove());
        [result.node, ...result.node.querySelectorAll('[data-asset], [data-asset-poster]')].forEach(node => {
          if (!node.matches('img, video, audio, source')) { node.removeAttribute('data-asset'); node.removeAttribute('data-asset-poster'); }
        });
        return result.node;
      }).filter(Boolean);
      if (!scenes.length) { showToast(ui('editor.importNone', { file: fileName })); return; }
      const assets = {};   // only files written in it (data: pictures, videos, sounds), never an address elsewhere
      Object.entries(readAssetsOf(other)).forEach(([path, value]) => { if (typeof value === 'string' && /^data:(image|video|audio)\//i.test(value)) assets[path] = value; });
      const animationsBlock = other.getElementById('deckAnimations');
      const animations = {};
      Object.entries(parseJsonOr(animationsBlock && animationsBlock.textContent, {}) || {}).forEach(([name, definition]) => {
        const clean = editorMotion.cleanDefinition(definition);   // (within the limits of the animation editor)
        if (clean) animations[name] = clean;
      });
      const dialog = this.openDialog(ui('editor.importTitle', { file: fileName }));
      const grid = dialog.querySelector('.editor-template-grid');
      grid.innerHTML = '';
      const bar = document.createElement('div');
      bar.className = 'editor-import-bar';
      bar.innerHTML = '<p class="editor-note"></p><button class="editor-import-all"></button><button class="editor-import-go"></button>';
      bar.querySelector('p').textContent = ui('editor.importNote');
      grid.appendChild(bar);
      const chosen = new Set();
      const goButton = bar.querySelector('.editor-import-go'), allButton = bar.querySelector('.editor-import-all');
      const update = () => {
        goButton.textContent = ui('editor.importGo', { count: chosen.size });
        goButton.disabled = !chosen.size;
        allButton.textContent = ui(chosen.size === scenes.length ? 'editor.importClear' : 'editor.importAll');
        grid.querySelectorAll('[data-import-index]').forEach(button => button.setAttribute('aria-pressed', String(chosen.has(Number(button.dataset.importIndex)))));
      };
      scenes.forEach((scene, index) => {
        const button = document.createElement('button');
        button.dataset.importIndex = index;
        button.innerHTML = '<div class="editor-thumb still-slide"><div class="editor-thumb-stage"></div></div><span></span>';
        button.querySelector('span').textContent = (index + 1) + '. ' + (scene.getAttribute('data-title') || scene.getAttribute('data-name') || '');
        runSafely('import picture', () => button.querySelector('.editor-thumb-stage').appendChild(editorCanvas.stillCopyOf(scene, assets)));
        button.addEventListener('click', () => { if (chosen.has(index)) chosen.delete(index); else chosen.add(index); update(); });
        grid.appendChild(button);
      });
      allButton.addEventListener('click', () => { if (chosen.size === scenes.length) chosen.clear(); else scenes.forEach((scene, index) => chosen.add(index)); update(); });
      goButton.addEventListener('click', () => {
        const picked = scenes.filter((scene, index) => chosen.has(index));
        this.closeDialog();
        this.insertForeignSlides(picked, assets, animations);
      });
      update();
      scaleThumbnails(grid);
    },
    /** The chosen slides of another file, after this slide, in their order: their files (pictures, videos, sounds) and
        animations come along; a name that is taken here by another file or animation gets a new one. */
    insertForeignSlides(picked, foreignAssets, foreignAnimations) {
      if (!picked.length) return;
      let first = null;
      this.nextLabel = ui('editor.historyImport', { count: picked.length });
      this.edit(() => {
        const assets = this.modelAssets(), definitions = this.animations();
        let after = this.selected, assetsChanged = false, animationsChanged = false;
        const names = new Map(), inserted = [];   // the other file's slide names -> their names here (a taken name changes)
        picked.forEach(source => {
          const scene = this.insertSlide(source, after);
          names.set(source.getAttribute('data-name'), scene.getAttribute('data-name'));
          inserted.push(scene);
          [scene].concat(Array.from(scene.querySelectorAll('*'))).forEach(node => ['data-asset', 'data-asset-poster', 'data-asset-background'].forEach(attribute => {
            const path = node.getAttribute(attribute);
            if (!path || !hasOwn(foreignAssets, path) || assets[path] === foreignAssets[path]) return;
            const name = hasOwn(assets, path) ? addAsset(assets, foreignAssets[path], path.replace(/^img\//, '').replace(/\.[^.]+$/, '')) : path;
            assets[name] = foreignAssets[path];
            node.setAttribute(attribute, name);
            assetsChanged = true;
          }));
          [scene].concat(Array.from(scene.querySelectorAll('[data-animation]'))).forEach(node => {
            const name = node.getAttribute('data-animation');
            if (!name || !hasOwn(foreignAnimations, name)) return;
            const definition = foreignAnimations[name];
            let target = name;
            for (let n = 2; hasOwn(definitions, target) && JSON.stringify(definitions[target]) !== JSON.stringify(definition); n++) target = name + '-' + n;
            if (!hasOwn(definitions, target)) { definitions[target] = definition; animationsChanged = true; }
            node.setAttribute('data-animation', target);
          });
          first = first || scene;
          after = scene;
        });
        // links between them (an agenda, a button to a slide) follow the new names; to a slide that did not come: gone
        inserted.forEach(scene => [scene, ...scene.querySelectorAll('[data-goto], [data-until]')].forEach(node => ['data-goto', 'data-until'].forEach(attribute => {
          const target = node.getAttribute(attribute);
          if (target === null) return;
          if (names.has(target)) node.setAttribute(attribute, names.get(target)); else node.removeAttribute(attribute);
        })));
        if (assetsChanged) writeAssetsOf(this.model, assets);
        if (animationsChanged) this.saveAnimations(definitions);
      }, { render: false });
      this.nextLabel = null;
      this.select(first);
      showToast(ui('editor.imported', { count: picked.length }));
    },
    openTemplateDialog(changing) {
      if (changing && this.selected && isScriptedSlide(this.selected)) { showToast(ui('editor.scriptedNoLayout')); return; }
      this.layoutChange = !!changing;   // Change layout… (the same window: this slide gets the chosen layout)
      const dialog = this.openDialog(ui(changing ? 'editor.chooseNewLayout' : 'editor.chooseTemplate'));   // the same window also shows the editor keys and the overview
      const grid = dialog.querySelector('.editor-template-grid');
      const assets = this.modelAssets();
      grid.innerHTML = '';
      const add = (scene, name, label) => {
        const button = document.createElement('button');
        button.dataset.action = 'add-template';
        button.dataset.template = name;
        button.innerHTML = '<div class="editor-thumb still-slide"><div class="editor-thumb-stage"></div></div><span></span>';
        button.querySelector('span').textContent = label;
        button.querySelector('.editor-thumb-stage').appendChild(editorCanvas.stillCopyOf(scene, assets));
        grid.appendChild(button);
      };
      add(this.blankSlide(), '', ui('editor.blankSlide'));
      this.templateScenes().forEach(scene => add(scene, scene.getAttribute('data-name'), (scene.getAttribute('data-title') || '').replace(/^Template: /, '')));
      scaleThumbnails(grid);
    },
    /** The editor's window (layouts, keys, the overview of section 20): its title and button, scrolled to the top;
        the rest of the editor takes no clicks or Tab meanwhile. */
    openDialog(title, options) {
      const dialog = this.element.querySelector('.editor-dialog');
      dialog.querySelector('.editor-dialog-head b').textContent = title;
      const button = dialog.querySelector('[data-action="close-dialog"]');
      button.setAttribute('data-ui', options && options.done ? 'editor.done' : 'editor.cancel');   // the overview and the keys change nothing to cancel
      button.textContent = ui(button.getAttribute('data-ui'));
      dialog.querySelector('.editor-template-grid').classList.toggle('is-overview', !!(options && options.overview));
      dialog.querySelector('.editor-dialog-card').scrollTop = 0;
      if (dialog.hidden) this.dialogReturn = document.activeElement;   // (where the keyboard goes back to)
      dialog.hidden = false;
      Array.from(this.element.children).forEach(child => { if (child !== dialog) child.inert = true; });
      // the keyboard in the window: its first choice (once the caller has filled it), else its button
      setTimeout(() => {
        if (dialog.hidden || dialog.contains(document.activeElement)) return;
        const first = dialog.querySelector('.editor-template-grid :is(button, input, select, textarea, [tabindex="0"]):not([disabled])') || button;
        first.focus({ preventScroll: true });
      }, 0);
      return dialog;
    },
    closeDialog() {
      if (!this.element) return;
      const dialog = this.element.querySelector('.editor-dialog');
      dialog.hidden = true;
      this.layoutChange = false;   // (Change layout… cancelled: the next + Slide adds a slide again)
      dialog.querySelector('.editor-template-grid').classList.remove('is-overview');
      Array.from(this.element.children).forEach(child => { child.inert = false; });
      const back = this.dialogReturn;
      this.dialogReturn = null;
      if (back && back.isConnected && back !== document.body && dialog.contains(document.activeElement)) back.focus({ preventScroll: true });
      else if (dialog.contains(document.activeElement)) document.activeElement.blur();
    },
    /** True while the overview (section 20) is open. */
    overviewOpen() { return !!this.element && !this.element.querySelector('.editor-dialog').hidden && this.element.querySelector('.editor-template-grid').classList.contains('is-overview'); },

    /* ---- The panel (right): the Slide and Presentation tabs; the Element tab is in section 18, Animations in 19 ---- */
    renderPanel() {
      const body = this.element.querySelector('.editor-panel-body');
      if (this.panelTab === 'element' && !editorCanvas.selected) this.panelTab = 'slide';
      const focusBefore = this.focusSignature(body);
      this.element.querySelectorAll('.editor-tabs button').forEach(tab => {
        tab.classList.toggle('is-selected', tab.dataset.tab === this.panelTab);
        tab.setAttribute('aria-selected', String(tab.dataset.tab === this.panelTab));
        tab.tabIndex = tab.dataset.tab === this.panelTab ? 0 : -1;   // one Tab stop for the tabs; ← → go between them
        tab.disabled = tab.dataset.tab === 'element' && !editorCanvas.selected;
      });
      if (this.panelTab === 'element') body.innerHTML = editorCanvas.elementPanelHtml();
      else if (this.panelTab === 'animations') body.innerHTML = editorTools.animationsPanelHtml();
      else if (this.panelTab === 'layers') { body.innerHTML = editorLayers.panelHtml(); editorLayers.applyLayerFilter(body); }
      else if (this.panelTab === 'deck') body.innerHTML = this.deckPanelHtml();
      else if (this.panelTab === 'code') body.innerHTML = editorCode.panelHtml();   // section 20e
      else body.innerHTML = this.slidePanelHtml();
      runSafely('timeline', () => editorTimeline.render());   // the animation panel follows (section 20d)
      applyInterfaceTexts(body);
      if (['element', 'slide', 'deck'].includes(this.panelTab)) runSafely('panel sections', () => this.foldSections(body));
      // nothing selected: the first thing the panel says is how to start (not the slide's technical fields)
      // More text options (Style): opened or folded, it stays so for the next element (this visit)
      // (only a click on its line counts, not a panel or Ctrl+K opening it)
      body.querySelectorAll('details.editor-more-text > summary').forEach(summary => summary.addEventListener('click', () => { editorTools.moreTextOpen = !summary.parentElement.open; }));
      body.querySelectorAll('details.anim-pace > summary').forEach(summary => summary.addEventListener('click', () => { editorTools.paceOpen = !summary.parentElement.open; }));
      if (this.panelTab === 'slide' && !editorCanvas.selected) body.insertAdjacentHTML('afterbegin', '<p class="editor-start-hint">' + escapeHtml(ui('cmd.panelStartHint')) + '</p>');
      this.shownTab = this.panelTab;   // (the tab whose controls are in the panel now: focusSignature)
      this.restoreFocus(body, focusBefore);
    },
    /** The panel's sections (a heading and what follows it, up to the next heading) fold away with a click on their
        heading (or Enter), as in Figma or Blender, so a long panel shows what you use. What you fold or open is
        remembered in this browser; the rare ones start folded (FOLDED_AT_FIRST), unless the element uses them. */
    foldSections(body) {
      const remembered = this.foldedSections(), selected = editorCanvas.selected;
      const FOLDED_AT_FIRST = {
        'editor.sectionAnimation': () => !(selected && selected.hasAttribute('data-animation')),
        'editor.sectionMorph': () => !(selected && selected.hasAttribute('data-morph')),
        'editor.sectionInsert': () => true,
        'editor.sectionLink': () => !(selected && (selected.hasAttribute('data-goto') || selected.hasAttribute('data-href'))),
        'editor.sectionMore': () => !(selected && (selected.hasAttribute('data-editor-name') || selected.hasAttribute('data-editor-note'))),
      };
      Array.from(body.querySelectorAll(':scope > h4')).forEach(head => {
        const key = head.getAttribute('data-ui') || head.textContent.trim();
        const section = document.createElement('div');
        section.className = 'editor-section';
        for (let node = head.nextSibling; node && !(node.nodeType === 1 && node.matches('h4'));) { const next = node.nextSibling; section.appendChild(node); node = next; }
        head.after(section);
        head.classList.add('editor-section-head');
        head.setAttribute('role', 'button');
        head.tabIndex = 0;
        head.dataset.section = key;
        this.setFolded(head, hasOwn(remembered, key) ? !!remembered[key] : !!(FOLDED_AT_FIRST[key] && FOLDED_AT_FIRST[key]()));
      });
    },
    setFolded(head, folded) {
      head.setAttribute('aria-expanded', String(!folded));
      if (head.nextElementSibling && head.nextElementSibling.matches('.editor-section')) head.nextElementSibling.hidden = folded;
    },
    foldedSections() {
      try { return JSON.parse(localStorage.getItem('presentation-editor.folded') || '{}') || {}; } catch (e) { return {}; }
    },
    /** A click on a section's heading: folds or opens it, and remembers that. */
    toggleSection(head) {
      const folded = head.getAttribute('aria-expanded') === 'true';
      this.setFolded(head, folded);
      const all = this.foldedSections();
      all[head.dataset.section] = folded;
      try { localStorage.setItem('presentation-editor.folded', JSON.stringify(all)); } catch (e) { /* not remembered */ }
    },
    /** Opens the folded section a field sits in (Ctrl+K found it there), without remembering it. */
    unfoldAround(control) {
      const details = control && control.closest('details');
      if (details && !details.open) details.open = true;   // (More text options)
      const section = control && control.closest('.editor-section');
      if (section && section.hidden && section.previousElementSibling) this.setFolded(section.previousElementSibling, false);
    },
    field(label, inputHtml, note) {
      return '<label class="editor-field"' + (note ? ' title="' + escapeHtml(note) + '"' : '') + '><span>' + escapeHtml(ui(label)) + '</span>' + inputHtml + (note ? '<small>' + escapeHtml(note) + '</small>' : '') + '</label>';
    },
    slidePanelHtml() {
      const scene = this.selected;
      if (!scene) return '';
      const scripted = isScriptedSlide(scene);
      const transition = scene.getAttribute('data-transition') || '';
      const kinds = ['', 'fade', 'zoom', 'rise', 'blur', 'flip', 'push', 'cover', 'uncover', 'wipe', 'circle', 'split', 'cube', 'none'];
      const labelOf = value => ui('editor.transition' + (value || 'slide').replace(/^./, c => c.toUpperCase()));
      const options = kinds.map(value => '<option value="' + value + '"' + (value === transition ? ' selected' : '') + '>' + escapeHtml(labelOf(value)) + '</option>').join('');
      // the transition picker: a small picture of each transition (an old slide A, a new slide B) that plays it while
      // the pointer is on it (css/13); a click chooses it, as the list above does
      const tiles = '<div class="transition-tiles" role="group" aria-label="' + escapeHtml(ui('editor.slideTransition')) + '">' + kinds.map(value =>
        '<button type="button" class="transition-tile" data-pick-transition="' + value + '" data-kind="' + (value || 'slide') + '" aria-pressed="' + (value === transition) + '" title="' + escapeHtml(labelOf(value)) + '">' +
        '<span class="tile-demo" aria-hidden="true"><i class="tile-old">A</i><i class="tile-new">B</i></span><span class="tile-name">' + escapeHtml(labelOf(value).replace(/\s*\(.*$/, '')) + '</span></button>').join('') + '</div>';
      return (scripted ? '<p class="editor-note is-warning">' + escapeHtml(ui('editor.scriptedNote')) + '</p>' : '') +
        this.field('editor.slideTitle', '<input data-slide-field="title" value="' + escapeHtml(scene.getAttribute('data-title') || '') + '">') +
        this.field('editor.slideName', '<input data-slide-field="name" value="' + escapeHtml(scene.getAttribute('data-name') || '') + '"' + (scripted ? ' disabled' : '') + '>', ui('editor.slideNameNote')) +
        '<div class="editor-buttons"><button data-action="change-layout" data-ui="editor.changeLayout" data-ui-title="editor.changeLayoutTooltip"' + (scripted ? ' disabled' : '') + '></button></div>' +
        this.field('editor.slideTime', '<input data-slide-field="estimate" value="' + escapeHtml(secondsToField(scene.getAttribute('data-estimate'))) + '">', ui('editor.slideTimeNote')) +
        '<div class="editor-row editor-transition-row">' + this.field('editor.slideTransition', '<select data-slide-field="transition">' + options + '</select>') +
        this.field('editor.transitionSpeed', '<select data-slide-field="transitionSpeed">' + ['', 'fast', 'slow'].map(value => '<option value="' + value + '"' + (value === (scene.getAttribute('data-transition-speed') || '') ? ' selected' : '') + '>' + escapeHtml(ui('editor.transitionSpeed_' + (value || 'normal'))) + '</option>').join('') + '</select>') + '</div>' +
        tiles + '<p class="editor-note is-tip">' + escapeHtml(ui('editor.transitionTilesNote')) + '</p>' +
        '<div class="editor-buttons"><button data-action="preview-transition" data-ui="editor.previewTransition" data-ui-title="editor.previewTransitionTooltip"></button>' +
        '<button data-action="transition-all" data-ui-title="editor.transitionAllTooltip">' + escapeHtml(this.everySlideLabel('editor.sameTransitionAll')) + '</button></div>' +
        this.field('editor.slideAdvance', '<input type="number" min="0" max="' + CONFIG.selfRunningMaxSeconds + '" step="1" data-slide-field="advance" placeholder="' + escapeHtml(ui('editor.slideAdvanceOff')) + '" value="' + escapeHtml(scene.getAttribute('data-advance') || '') + '">', ui('editor.slideAdvanceNote')) +
        '<div class="editor-buttons"><button data-action="advance-all" data-ui-title="editor.advanceAllTooltip">' + escapeHtml(this.everySlideLabel('editor.sameTimingAll')) + '</button></div>' +
        '<label class="editor-check"><input type="checkbox" data-slide-field="skip"' + (scene.hasAttribute('data-skip') ? ' checked' : '') + '><span>' + escapeHtml(ui('editor.slideSkip')) + '</span></label>' +
        '<label class="editor-check"><input type="checkbox" data-slide-field="backup"' + (scene.hasAttribute('data-backup') ? ' checked' : '') + '><span>' + escapeHtml(ui('editor.slideBackup')) + '</span></label>' +
        '<label class="editor-check"><input type="checkbox" data-slide-field="noFooter"' + (scene.hasAttribute('data-no-footer') ? ' checked' : '') + '><span>' + escapeHtml(ui('editor.noFooterHere')) + '</span></label>' +
        '<label class="editor-check"><input type="checkbox" data-slide-field="hideLogo"' + (scene.hasAttribute('data-hide-logo') ? ' checked' : '') + '><span>' + escapeHtml(ui('editor.hideLogoHere')) + '</span></label>' +
        this.field('editor.slideNotes', '<textarea rows="8" data-slide-field="notes">' + escapeHtml(this.notesToText(scene)) + '</textarea>', ui('editor.slideNotesNote')) +
        editorTools.slideNotesHtml() +   // the notes for the editor on this slide
        editorTools.slideSectionHtml(scene) +
        '<p class="editor-note is-tip">' + escapeHtml(ui('editor.slideHint')) + '</p>';
    },
    /** The themes as a gallery (All slides tab): each a small slide in its colours (its background, "Aa" in its text and
        accent colour, its four other colours as dots); a click uses it for the whole presentation (written into the file
        when it is saved, as Theme and colours… does). The one in use is marked. */
    /** The slides picked with Ctrl/Shift+click in the slide list (two or more, with the open one), or null. */
    pickedSlides() {
      if (!this.slidePicks || this.slidePicks.size < 2) return null;
      return this.modelScenes().filter(scene => this.slidePicks.has(scene.getAttribute('data-name')));
    },
    everySlideLabel(everyKey) {   // (everyKey: what it copies, "Same transition on every slide"; else "Use on every slide")
      const picked = this.pickedSlides();
      return picked ? ui('editor.useOnPicked', { count: picked.length }) : ui(everyKey || 'editor.useOnEverySlide');
    },
    themeGalleryHtml() {
      const names = themeLibrary.names().filter(name => name && themeLibrary.colorsOf(name) && !Array.isArray(themeLibrary.colorsOf(name)));   // (a broken saved theme: no tile)
      if (!names.length) return '';
      const active = colorSettings.hasOverrides() ? null : colorSettings.activeThemeName();
      const tile = name => {
        const colors = Object.assign({}, colorSettings.cssDefaults, themeLibrary.colorsOf(name) || {});
        const colour = token => (isHexColor(colors[token]) ? colors[token] : colorSettings.cssDefaults[token]) || 'transparent';
        return '<button type="button" class="theme-tile" data-pick-theme="' + escapeHtml(name) + '" aria-pressed="' + (name === active) + '" title="' + escapeHtml(name) + '">' +
          '<span class="theme-swatch" aria-hidden="true" style="background: ' + colour('--color-background') + '; color: ' + colour('--color-text') + '">' +
          '<b' + (typeof colors['--font-display'] === 'string' && /^[\w\s"',.-]+$/.test(colors['--font-display']) ? ' style="font-family: ' + escapeHtml(colors['--font-display']) + '"' : '') + '>A<span style="color: ' + colour('--color-accent') + '">a</span></b>' +
          ['--color-accent', '--color-teal', '--color-rose', '--color-violet'].map(token => '<i style="background: ' + colour(token) + '"></i>').join('') + '</span>' +
          '<span class="theme-name">' + escapeHtml(name) + '</span></button>';
      };
      return '<h4 data-ui="editor.sectionTheme"></h4><div class="theme-gallery">' + names.map(tile).join('') + '</div><p class="editor-note is-tip">' + escapeHtml(ui('editor.themeGalleryNote')) + '</p>';
    },
    deckPanelHtml() {
      const deckElement = this.model.getElementById('deck');
      const style = deckElement.getAttribute('style') || '';
      const valueOf = (name, fallback) => { const match = style.match(new RegExp(name + ':\\s*(\\d+)ms')); return match ? match[1] : fallback; };
      return this.field('editor.deckTitle', '<input data-deck-field="title" value="' + escapeHtml(this.model.title) + '">') +
        this.themeGalleryHtml() +
        '<h4 data-ui="editor.sectionFonts"></h4><div class="editor-row">' + ['fontHeadings', 'fontText'].map(field => {
          const current = deckElement.getAttribute(field === 'fontHeadings' ? 'data-font-headings' : 'data-font-text') || '';
          return this.field(field === 'fontHeadings' ? 'editor.fontAllHeadings' : 'editor.fontAllText', '<select data-deck-field="' + field + '">' +
            DECK_FONTS.filter(([value]) => value !== (field === 'fontHeadings' ? 'display' : 'body')).map(([value, label]) => '<option value="' + value + '"' + (value === current ? ' selected' : '') + '>' + escapeHtml(ui(label)) + '</option>').join('') + '</select>');
        }).join('') + '</div>' +
        // the text of every slide bigger, for a large room (css/05: the slides' layout grows with it)
        this.field('editor.textScale', '<select data-deck-field="textScale">' + ['', 'bigger', 'biggest'].map(value => '<option value="' + value + '"' + (value === (deckElement.getAttribute('data-text-scale') || '') ? ' selected' : '') + '>' + escapeHtml(ui('editor.textScale_' + (value || 'normal'))) + '</option>').join('') + '</select>', ui('editor.textScaleNote')) +
        '<div class="editor-buttons"><button data-action="settings" data-ui="editor.themeButton"></button></div>' +
        // (the theme first, as people look for it here; then the footer, timing and progress line of all slides)
        '<h4 data-ui="editor.sectionDeckPlay"></h4>' +
        this.field('editor.deckStagger', '<input type="number" min="0" max="2000" step="10" data-deck-field="stagger" value="' + valueOf('--reveal-stagger', 130) + '">', ui('editor.deckStaggerNote')) +
        this.field('editor.progressLine', '<select data-deck-field="progressLine">' + ['', 'top', 'bottom'].map(value => '<option value="' + value + '"' + (value === (deckElement.getAttribute('data-progress-line') || '') ? ' selected' : '') + '>' + escapeHtml(ui('editor.progressLine_' + (value || 'none'))) + '</option>').join('') + '</select>', ui('editor.progressLineNote')) +
        '<label class="editor-check"><input type="checkbox" data-deck-field="loop"' + (deckElement.hasAttribute('data-loop') ? ' checked' : '') + '><span>' + escapeHtml(ui('editor.deckLoop')) + '</span></label>' +
        this.field('editor.deckFooter', '<select data-deck-field="footer">' + ['', 'number', 'text', 'both'].map(value => '<option value="' + value + '"' + (value === (deckElement.getAttribute('data-footer') || '') ? ' selected' : '') + '>' + escapeHtml(ui('editor.footer_' + (value || 'none'))) + '</option>').join('') + '</select>', ui('editor.deckFooterNote')) +
        (['text', 'both'].includes(deckElement.getAttribute('data-footer')) ? this.field('editor.deckFooterText', '<input data-deck-field="footerText" value="' + escapeHtml(deckElement.getAttribute('data-footer-text') || '') + '">') : '') +
        this.field('editor.deckEnterDelay', '<input type="number" min="0" max="3000" step="10" data-deck-field="enterDelay" value="' + valueOf('--scene-enter-delay', 300) + '">', ui('editor.deckEnterDelayNote')) +
        editorLayers.logoPanelHtml() +
        editorTools.findReplaceHtml() +
        editorTools.checkHtml() +   // ✓ Check the presentation
        '<p class="editor-note is-tip">' + escapeHtml(ui('editor.deckNote', { id: deckElement.getAttribute('data-deck-id') || '' })) + '</p>';
    },
    /** Speaker notes as text: one line per paragraph, "2: text" for a line of click step 2. */
    notesToText(scene) {
      const notes = scene.querySelector(':scope > .speaker-notes');
      if (!notes) return '';
      return Array.from(notes.querySelectorAll('p, li')).map(line => (line.hasAttribute('data-note-step') ? line.getAttribute('data-note-step') + ': ' : '') + line.textContent.trim()).join('\n');
    },
    textToNotes(scene, text) {
      let notes = scene.querySelector(':scope > .speaker-notes');
      const lines = String(text).split('\n').map(line => line.trim()).filter(Boolean);
      if (!lines.length) { if (notes) notes.remove(); return; }
      if (!notes) {
        notes = this.model.createElement('aside');
        notes.className = 'speaker-notes';
        scene.append(this.model.createTextNode('  '), notes, this.model.createTextNode('\n    '));
      }
      notes.textContent = '';
      lines.forEach(line => {
        const paragraph = this.model.createElement('p');
        const step = line.match(/^(\d+):\s*(.*)$/);
        if (step) paragraph.setAttribute('data-note-step', step[1]);
        paragraph.textContent = step ? step[2] : line;
        notes.appendChild(paragraph);
      });
    },
    onPanelChange(event) {
      const input = event.target;
      // a number outside what the field takes: it is kept within, and said (not corrected without a word)
      if (input.type === 'number' && input.value !== '' && ((input.min !== '' && Number(input.value) < Number(input.min)) || (input.max !== '' && Number(input.value) > Number(input.max))))
        showToast(ui('editor.numberKeptWithin', { min: input.min || '…', max: input.max || '…' }));
      const label = input.closest('.editor-field, .editor-check');   // the field's name names the undo step (History list)
      this.nextLabel = label ? historyLabel((label.querySelector('span') || label).textContent) : null;
      try { this.onPanelChangeNamed(event); } finally { this.nextLabel = null; }
    },
    onPanelChangeNamed(event) {
      const input = event.target;
      if (editorTools.playStep >= 0) editorTools.stopPlaying();   // see runAction
      if (input.matches('textarea[data-code], select[data-code-snippet]')) { editorCode.onChange(input); return; }   // the Code tab (section 20e)
      if (input.matches('textarea[data-html]')) { editorCode.onHtmlChange(input); return; }
      if (input.matches('textarea[data-js], select[data-js-snippet]')) { editorCode.onJsChange(input); return; }
      const scene = this.selected;
      if (input.dataset.slideField && scene) {
        const field = input.dataset.slideField;
        const value = input.type === 'checkbox' ? input.checked : input.value;
        if (field === 'name') {
          const name = String(value).trim().toLowerCase();
          const taken = name !== scene.getAttribute('data-name') && this.modelScenes().some(other => other.getAttribute('data-name') === name);
          if (!/^[a-z0-9][a-z0-9-]*$/.test(name) || taken) { showToast(ui(taken ? 'editor.nameTaken' : 'editor.badName')); this.renderPanel(); return; }
          const oldName = scene.getAttribute('data-name');
          this.edit(() => {
            scene.setAttribute('data-name', name);
            this.renameLinks(oldName, name);
          }, { node: scene });
        } else if (field === 'estimate') {
          const seconds = parseMinutesSeconds(value);
          if (seconds === null) { showToast(ui('editor.badTime')); this.renderPanel(); return; }
          this.edit(() => scene.setAttribute('data-estimate', seconds), { node: scene });
          const times = storage.read(CONFIG.storageKeys.estimates) || {};
          if (hasOwn(times, scene.getAttribute('data-name'))) {   // the editor's time wins from now on
            delete times[scene.getAttribute('data-name')];
            storage.write(CONFIG.storageKeys.estimates, Object.keys(times).length ? times : null);
          }
        } else if (field === 'title') this.edit(() => scene.setAttribute('data-title', value), { node: scene });
        else if (field === 'transitionSpeed') {
          this.edit(() => { if (['fast', 'slow'].includes(value)) scene.setAttribute('data-transition-speed', value); else scene.removeAttribute('data-transition-speed'); }, { node: scene });
          editorLayers.previewTransition();   // you see it at once (section 20)
        } else if (field === 'transition') {
          this.edit(() => { if (value) scene.setAttribute('data-transition', value); else scene.removeAttribute('data-transition'); }, { node: scene });
          editorLayers.previewTransition();   // you see it at once (section 20)
        }
        else if (field === 'advance') {   // Moves on by itself after … seconds (section 8)
          const seconds = Math.round(Number(value));
          this.edit(() => { if (seconds > 0) scene.setAttribute('data-advance', Math.min(seconds, CONFIG.selfRunningMaxSeconds)); else scene.removeAttribute('data-advance'); }, { node: scene });
        }
        else if (field === 'backup') { this.edit(() => scene.toggleAttribute('data-backup', value), { node: scene }); showToast(ui(value ? 'editor.backupOn' : 'editor.backupOff')); }
        else if (field === 'skip') { this.edit(() => scene.toggleAttribute('data-skip', value), { node: scene }); this.renderAll(); }   // (its mark in the slide list)
        else if (field === 'hideLogo') this.edit(() => scene.toggleAttribute('data-hide-logo', value), { node: scene });
        else if (field === 'noFooter') this.edit(() => scene.toggleAttribute('data-no-footer', value), { node: scene });
        else if (field === 'notes') this.edit(() => this.textToNotes(scene, value), { node: scene });
      } else if (input.dataset.logoField) {
        editorLayers.setLogo(input);
      } else if (input.hasAttribute('data-copy-all')) {   // Copy to other slides: all of them, or none
        input.closest('.editor-copy-to').querySelectorAll('[data-copy-slide]').forEach(box => {
          box.checked = input.checked;
          if (input.checked) editorTools.copyToTicked.add(box.getAttribute('data-copy-slide')); else editorTools.copyToTicked.delete(box.getAttribute('data-copy-slide'));
        });
      } else if (input.hasAttribute('data-copy-slide')) {   // (kept outside the panel: a redraw keeps the ticks)
        if (input.checked) editorTools.copyToTicked.add(input.getAttribute('data-copy-slide')); else editorTools.copyToTicked.delete(input.getAttribute('data-copy-slide'));
      } else if (input.dataset.deckField) {
        const field = input.dataset.deckField;
        if (field === 'title') { this.edit(() => { this.model.title = input.value; }); return; }
        const deckElement = this.model.getElementById('deck');
        if (field === 'loop') { this.edit(() => deckElement.toggleAttribute('data-loop', input.checked)); return; }   // self-running: after the last slide, the first again (section 8)
        if (field === 'fontHeadings' || field === 'fontText') {   // All slides › Fonts: every title, or all running text (css/05)
          const name = field === 'fontHeadings' ? 'data-font-headings' : 'data-font-text';
          this.edit(() => { if (DECK_FONTS.some(([value]) => value === input.value) && input.value) deckElement.setAttribute(name, input.value); else deckElement.removeAttribute(name); });
          return;
        }
        if (field === 'textScale') {   // All slides › Text size: bigger for a classroom or a large room
          this.edit(() => { if (['bigger', 'biggest'].includes(input.value)) deckElement.setAttribute('data-text-scale', input.value); else deckElement.removeAttribute('data-text-scale'); });
          editorCommands.checkOverflow();
          return;
        }
        if (field === 'progressLine') {   // a thin bar that grows with the talk (section 7)
          this.edit(() => { if (['top', 'bottom'].includes(input.value)) deckElement.setAttribute('data-progress-line', input.value); else deckElement.removeAttribute('data-progress-line'); });
          return;
        }
        if (field === 'footer' || field === 'footerText') {   // a footer on every slide (section 7)
          const attribute = field === 'footer' ? 'data-footer' : 'data-footer-text', value = input.value.trim();
          this.edit(() => { if (value) deckElement.setAttribute(attribute, value); else deckElement.removeAttribute(attribute); });
          this.renderAll();
          return;
        }
        const property = field === 'stagger' ? '--reveal-stagger' : '--scene-enter-delay';
        const ms = clamp(parseInt(input.value, 10) || 0, 0, 3000);
        this.edit(() => {
          const rest = (deckElement.getAttribute('style') || '').split(';').map(part => part.trim()).filter(part => part && !part.startsWith(property));
          rest.push(property + ': ' + ms + 'ms');
          deckElement.setAttribute('style', rest.join('; '));
        });
      } else if (!editorTools.onPanelChange(event)) {
        editorCanvas.onPanelChange(event);
      }
    },

    /* ---- Keys while the editor is open (section 9 sends every key here) ---- */
    onKeyDown(event) {
      this.byKeyboard = true;   // (renderPanel keeps the keyboard's place only for keyboard work)
      const active = document.activeElement;
      const typing = !!active && (active.isContentEditable || active.matches('input, textarea, select'));
      const withModifier = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      if (settingsPanel.isOpen()) {
        if (event.key === 'Escape') { event.preventDefault(); settingsPanel.close(); }
        else if (event.key === 'Tab') settingsPanel.keepFocusInside(event);
        else if (withModifier && key === 's') { event.preventDefault(); settingsPanel.close(); if (event.shiftKey) this.saveAs(); else this.save(); }
        return;
      }
      if (editorTimeline.onKey(event)) return;   // the animation panel: Delete removes the selected keyframe (section 20d)
      if (event.key === 'Enter' && active && active.matches('[data-tool-field="newTextStyle"]')) { event.preventDefault(); editorLayers.saveTextStyle(active.value); return; }   // the style's name: saved
      if (editorCommands.onKey(event, typing)) return;   // Ctrl+K or /: find an action; its window has the keyboard (section 20c)
      if (event.key === 'F6' && !withModifier && !event.altKey && this.element.querySelector('.editor-dialog').hidden) {   // F6: the next part of the editor
        event.preventDefault();
        if (typing && active.isContentEditable) editorCanvas.finishTyping();
        this.cycleRegion(event.shiftKey);
        return;
      }
      if (editorCommands.onAppKey(event, typing)) return;   // F5, F10, Ctrl+M, Ctrl+Shift+D (section 20c)
      if (editorTools.onMenuKey(event)) return;   // the right-click menu has the keyboard
      if (editorLayers.onHistoryKey(event)) return;   // so has the History list (section 20)
      if (this.element.querySelector('.editor-dialog').hidden && editorTools.onZoomKey(event)) return;
      if (withModifier && key === 's') {
        event.preventDefault();
        if (typing && active.closest('.editor-panel-body')) active.blur();   // what you just typed goes in first
        if (event.shiftKey) this.saveAs(); else this.save();
        return;
      }
      if (withModifier && !typing && (key === 'z' || key === 'y')) {
        event.preventDefault();
        if (key === 'y' || event.shiftKey) this.redo(); else this.undo();
        return;
      }
      // (the "press Esc again" question only holds for the very next key: any other key, or an Esc used for something else, ends it)
      const escapeArmed = event.key === 'Escape' && this.escapeAt && Date.now() - this.escapeAt < CONFIG.editor.escapeAgainMs;
      this.escapeAt = 0;
      if (event.key === 'Escape') {
        event.preventDefault();
        if (editorTools.pickingColour) return;   // it cancelled the colour picker
        if (typing && active.closest('.editor-panel-body') && (editorTools.playStep >= 0 || editorMotion.playhead !== null)) active.blur();   // its value goes in before the panel is drawn again
        if (editorMotion.closeEase(true)) return;   // the easing window (section 20b)
        if (editorLayers.closeHistory()) return;   // the History list
        if (editorLayers.transitionPreview) { editorLayers.stopPreview(); return; }   // Esc ends the transition preview first
        if (editorMotion.drawing) { editorMotion.setDrawing(false); this.renderPanel(); }   // ✎ Draw a path off again
        else if (editorCommands.closeMenu()) { /* a menu of the menu bar closed */ }
        else if (editorTools.closeMenu()) { /* the right-click menu closed */ }
        else if (!this.element.querySelector('.editor-dialog').hidden) this.closeDialog();
        else if (editorMotion.recording || editorMotion.playhead !== null) editorTools.stopPlaying();   // Record and the paused slide (section 20b)
        else if (editorTools.playStep >= 0) editorTools.stopPlaying();
        else if (typing) { if (active.matches('[data-tool-field="newTextStyle"]')) active.value = ''; active.blur(); }   // Esc in the style name: no style
        else if (editorCanvas.selected) editorCanvas.selectElement(null);
        else if (escapeArmed) this.close();
        else { this.escapeAt = Date.now(); showToast(ui('editor.escapeAgain')); }   // (one Esc too many never closes the editor by surprise)
        return;
      }
      if (typing) return;
      if (!this.element.querySelector('.editor-dialog').hidden) return;
      if (editorTools.playStep >= 0 && !['Shift', 'Control', 'Alt', 'Meta', 'PageUp', 'PageDown', '?'].includes(event.key) && !(event.key === ' ' && editorLayers.canPan()) && !(key === 'g' && !withModifier && !event.altKey && !event.shiftKey)) editorTools.stopPlaying();   // see runAction (Space: pans; G: the grid)
      const onSlide = !active || active === document.body || active === this.element || this.element.querySelector('.editor-canvas').contains(active);
      // Shift+F10 or the menu key: the right-click menu of the selected element (nothing selected: of the slide), at its middle
      if ((event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey && !withModifier)) && editorCanvas.scene) {
        event.preventDefault();
        const target = editorCanvas.selected || editorCanvas.scene, box = target.getBoundingClientRect();
        editorTools.focusBeforePointer = null;
        editorTools.pointerDownAt = 0;
        editorTools.openMenu({ target, clientX: Math.round(box.left + Math.min(box.width / 2, 120)), clientY: Math.round(box.top + Math.min(box.height / 2, 80)), preventDefault() {} });
        return;
      }
      // Enter or F2 on a selected text: typing in it, the caret at the end (as F2 in Excel, Enter in PowerPoint)
      // (not the Enter that just finished a text: section 18 took it and gave the keyboard back)
      if ((event.key === 'Enter' || event.key === 'F2') && !event.defaultPrevented && !event.repeat && !withModifier && !event.altKey && !event.shiftKey && onSlide && editorCanvas.selected && editorTools.group.length <= 1) {
        const element = editorCanvas.selected;
        const host = element.isContentEditable ? element : element.querySelector('[contenteditable="true"]');
        if (host) {
          event.preventDefault();
          host.focus();
          const range = document.createRange();
          range.selectNodeContents(host);
          range.collapse(false);
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
          return;
        }
      }
      if (editorTools.onKey(event)) return;
      if (editorLayers.onKey(event)) return;
      if ((event.key === 'Delete' || event.key === 'Backspace') && editorCanvas.selected) {
        event.preventDefault();
        if (editorTools.group.length > 1) editorTools.deleteGroup(); else editorCanvas.runAction('delete');
        return;
      }
      const grouped = editorTools.group.length > 1;
      // Alt+← / →: turn a freely placed element 15° (Alt+Shift: 1°)
      if (event.altKey && !withModifier && (event.key === 'ArrowLeft' || event.key === 'ArrowRight') && editorCanvas.selected && !grouped && editorCanvas.isFree(editorCanvas.selected)) {
        event.preventDefault();
        editorCanvas.turnBy((event.key === 'ArrowLeft' ? -1 : 1) * (event.shiftKey ? 1 : 15));
        return;
      }
      if (event.key.startsWith('Arrow') && editorCanvas.selected && (grouped ? editorTools.group.some(item => editorCanvas.isFree(item)) || editorCanvas.groupLayoutMembers().length > 0 : editorCanvas.isFree(editorCanvas.selected))) {
        event.preventDefault();
        const step = event.shiftKey ? 10 : 1;
        const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[event.key];
        if (grouped) editorTools.nudgeGroup(delta); else editorCanvas.nudge(delta);
        return;
      }
      if (event.key === 'PageDown' || event.key === 'PageUp') {
        event.preventDefault();
        const list = this.modelScenes();
        const index = list.indexOf(this.selected) + (event.key === 'PageDown' ? 1 : -1);
        if (list[index]) this.select(list[index]);
      }
    },
  };

  /** What can have the keyboard in the panel (to find it again after a redraw: renderPanel). */
  const PANEL_FOCUSABLE = 'button, input, select, textarea, summary, a[href], [tabindex]:not([tabindex="-1"])';

  /** Every small slide picture in `container` scaled to the width of its box. */
  function scaleThumbnails(container) {
    container.querySelectorAll('.editor-thumb').forEach(box => box.style.setProperty('--thumb-scale', box.clientWidth / CONFIG.stage.width));
  }

  /** Writes "SLIDE 03 · name" in the banner comment before every slide, so the numbers match the order. */
  /** A short name for an undo step ("Undone: …"): only the name of what was clicked (not its explanation after " · "),
      at most 48 characters, cut at a word. */
  function historyLabel(text) {
    let label = String(text || '').split(/ · | — |\n/)[0].replace(/\s+/g, ' ').trim();
    if (label.length > 48) label = label.slice(0, 48).replace(/\s+\S*$/, '') + '…';
    return label;
  }

  function renumberSlideBanners(documentNode) {
    const stageElement = documentNode.getElementById('stage');
    if (!stageElement) return;
    let number = 0;
    Array.from(stageElement.querySelectorAll(':scope > section.scene')).forEach(scene => {
      number++;
      let node = scene.previousSibling;
      while (node && node.nodeType === Node.TEXT_NODE && !node.textContent.trim()) node = node.previousSibling;
      if (!node || node.nodeType !== Node.COMMENT_NODE || !/SLIDE/.test(node.data)) return;
      // keep any explanation lines after the first line of the banner
      const lines = node.data.split('\n');
      lines[0] = ' ==================== SLIDE ' + String(number).padStart(2, '0') + ' · ' + scene.getAttribute('data-name') + ' ====================' + (lines.length === 1 ? ' ' : '');
      node.data = lines.join('\n');
    });
  }
