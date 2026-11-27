  /* ===========================================================================
     15. IMAGES: SWAP AN IMAGE WITHOUT CODE
     In the presenter view, drop an image file onto an image of the large slide,
     or use the Images tab of the Texts drawer (T): Replace… picks a file, ↺
     brings the original back. The new image shows at once in both windows.
     The images are kept in this browser (IndexedDB: room for large images,
     unlike localStorage); "Save a copy" writes them into the new file.
     Like a changed text, a swapped image remembers which image it replaced:
     after the HTML gets another image there, the old swap is ignored.
     Images found: the logo, then every <img> inside a slide, in HTML order
     ("logo#image", "numbers#image1", ...).
     =========================================================================== */

  /* ---- The ASSETS block of a saved file: { "img/logo.png": "data:image/png;base64,..." } ----
     Used by "Save a copy" and the editor (section 17) to put new images in the copy. */
  function readAssetsOf(documentNode) {
    const block = documentNode.getElementById('deckAssets');
    return parseJsonOr(block && block.textContent, {}) || {};
  }

  /** Writes the block back: one file per line, so the rest of the file stays easy to read. */
  function writeAssetsOf(documentNode, assets) {
    const block = documentNode.getElementById('deckAssets');
    if (!block) return;
    const lines = Object.keys(assets).map(path => '  ' + JSON.stringify(path) + ': ' + JSON.stringify(assets[path]));
    block.textContent = ('\n' + (lines.length ? '{\n' + lines.join(',\n') + '\n}' : '{}') + '\n').replace(/</g, '\\u003c');   // never closes the <script> by accident
  }

  /** Adds a file (a data: URL) to `assets` under a free name like "img/edited-1.png"; returns that name. */
  function addAsset(assets, dataUrl, nameHint) {
    const extension = ((dataUrl.match(/^data:[a-z]+\/([a-z0-9.+-]+)/i) || [])[1] || 'bin').replace('jpeg', 'jpg').replace('svg+xml', 'svg');
    const base = 'img/' + String(nameHint || 'edited').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    let name = base + '.' + extension;
    for (let n = 2; hasOwn(assets, name) && assets[name] !== dataUrl; n++) name = base + '-' + n + '.' + extension;
    assets[name] = dataUrl;
    return name;
  }

  /** Drops files from the block that no element (also in the slide templates) uses any more. */
  function pruneAssetsOf(documentNode, assets) {
    const used = new Set();
    const collect = container => container.querySelectorAll('[data-asset], [data-asset-poster], [data-asset-background]').forEach(element => {
      ['data-asset', 'data-asset-poster', 'data-asset-background'].forEach(name => { if (element.hasAttribute(name)) used.add(element.getAttribute(name)); });
    });
    collect(documentNode);
    documentNode.querySelectorAll('template').forEach(template => collect(template.content));
    Object.keys(assets).forEach(path => { if (!used.has(path)) delete assets[path]; });
    return assets;
  }

  /** Which image an element shows in the file: its asset name and size (or its src), to notice a change. */
  function imageIdentityOf(element, assets) {
    const path = element.getAttribute('data-asset');
    if (path) return path + '|' + String(assetUrl(path, assets)).length;
    return element.getAttribute('src') || '';
  }

  /** Every swappable image of the given stage (in this page, or in the copy "Save a copy" builds). */
  function collectImageItems(stageElement, assets) {
    const items = [];
    const add = (key, slideName, element) => items.push({ key, slideName, element, original: imageIdentityOf(element, assets), restoreSrc: element.getAttribute('src') || '' });
    const logo = stageElement.querySelector(':scope > .logo img');
    if (logo) add('logo#image', null, logo);
    stageElement.querySelectorAll('section.scene').forEach(scene => {
      scene.querySelectorAll('img').forEach((image, index) => add(scene.getAttribute('data-name') + '#image' + (index + 1), scene.getAttribute('data-name'), image));
    });
    return items;
  }

  /** A short fingerprint of an image source (its length and a hash), to notice that the HTML changed. */
  function fingerprintOf(text) {
    let hash = 5381;
    for (let i = 0; i < text.length; i += 7) hash = ((hash * 33) ^ text.charCodeAt(i)) >>> 0;   // every 7th character is enough here
    return text.length + ':' + hash.toString(36);
  }

  const imageSwaps = {
    items: [],
    swapped: new Map(),    // key -> { original fingerprint, dataUrl, fileName } (also kept in IndexedDB)
    database: null,        // a promise of the IndexedDB database, or null where the browser blocks it

    collect() { this.items = collectImageItems(stage); },
    itemByKey(key) { return this.items.find(item => item.key === key); },

    /** Opens the browser database once (per deck id, like the other settings). */
    openDatabase() {
      if (this.database) return this.database;
      this.database = new Promise((resolve, reject) => {
        try {
          const request = indexedDB.open(DECK_ID + '-deck-images', 1);
          request.onupgradeneeded = () => request.result.createObjectStore('images');
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        } catch (error) { reject(error); }
      });
      this.database.catch(() => {});   // blocked storage: swaps then last until the page closes
      return this.database;
    },
    /** A read or write in the database; resolves to undefined when the browser blocks it. */
    async useStore(mode, action) {   // write: resolves to false when it could not be saved
      try {
        const database = await this.openDatabase();
        return await new Promise((resolve, reject) => {
          const transaction = database.transaction('images', mode);
          const request = action(transaction.objectStore('images'));
          transaction.oncomplete = () => resolve(request && request.result);
          transaction.onerror = () => reject(transaction.error);
          transaction.onabort = () => reject(transaction.error);   // e.g. the disk is full
        });
      } catch (error) {
        return mode === 'readwrite' ? false : undefined;
      }
    },

    /** At start-up and after another window changed one: shows the swapped images saved in this browser. */
    async loadSaved(onlyKey) {
      const keys = onlyKey ? [onlyKey] : this.items.map(item => item.key);
      for (const key of keys) {
        const item = this.itemByKey(key);
        if (!item) continue;
        const saved = await this.useStore('readonly', store => store.get(key));
        if (saved && saved.original === fingerprintOf(item.original)) {
          this.swapped.set(key, saved);
          item.element.setAttribute('src', saved.dataUrl);
        } else if (onlyKey) {   // the other window put the original back
          this.swapped.delete(key);
          item.element.setAttribute('src', item.restoreSrc);
        }
      }
      if (keys.length) afterImagesChanged();
    },

    /** Replaces the image of `item` with an image file. */
    replace(item, file) {
      if (!file || !/^image\//.test(file.type)) { showToast(ui('toast.notAnImage')); return; }
      const reader = new FileReader();
      reader.onload = async () => {
        const record = { original: fingerprintOf(item.original), dataUrl: reader.result, fileName: file.name };
        this.swapped.set(item.key, record);
        item.element.setAttribute('src', record.dataUrl);
        const saved = await this.useStore('readwrite', store => store.put(record, item.key));
        // saved: the other window reads it from the database; not saved: it gets the image in the message
        sendToPeer('image', saved === false ? { key: item.key, dataUrl: record.dataUrl } : { key: item.key });
        afterImagesChanged();
        showToast(ui(saved === false ? 'toast.imageNotSaved' : 'toast.imageReplaced', { file: file.name }));
      };
      reader.readAsDataURL(file);
    },
    /** Message "image" from the other window: show what it did. */
    onPeerMessage(payload) {
      const key = String(payload.key || '');
      const item = this.itemByKey(key);
      if (!item) return;
      if (typeof payload.dataUrl === 'string' && payload.dataUrl.startsWith('data:image/')) {   // not saved in the database
        this.swapped.set(key, { original: fingerprintOf(item.original), dataUrl: payload.dataUrl, fileName: '' });
        item.element.setAttribute('src', payload.dataUrl);
        afterImagesChanged();
        return;
      }
      this.loadSaved(key);
    },
    /** Back to the image of the file. */
    async reset(item) {
      this.swapped.delete(item.key);
      item.element.setAttribute('src', item.restoreSrc);
      await this.useStore('readwrite', store => store.delete(item.key));
      sendToPeer('image', { key: item.key });
      afterImagesChanged();
    },
    /** After a confirmed Save: every swap of this deck is in the file, so the browser database is emptied. */
    async clearStore() {
      this.swapped.clear();
      await this.useStore('readwrite', store => store.clear());
    },
    async resetAll() {
      const keys = Array.from(this.swapped.keys());
      for (const key of keys) {
        const item = this.itemByKey(key);
        if (item) await this.reset(item);
      }
    },
    /** "Save a copy": the swapped images written into the copy. */
    writeInto(copyDocument, onlyKeys) {   // onlyKeys: just these images (the editor takes each change once)
      const copyStage = copyDocument.getElementById('stage');
      if (!copyStage || !this.swapped.size) return;
      const assets = readAssetsOf(copyDocument);
      collectImageItems(copyStage, assets).forEach(item => {
        if (onlyKeys && !onlyKeys.includes(item.key)) return;
        const record = this.swapped.get(item.key);
        if (!record || record.original !== fingerprintOf(item.original)) return;
        // the new image goes into the ASSETS block; the slide only names it
        item.element.setAttribute('data-asset', addAsset(assets, record.dataUrl, item.key.replace('#', '-')));
        item.element.removeAttribute('src');
      });
      writeAssetsOf(copyDocument, pruneAssetsOf(copyDocument, assets));
    },

    /* ---- Drag and drop on the large slide of the presenter view ---- */
    setUpDropping(panel) {
      // a file dropped anywhere else never replaces the presentation with that file
      if (!this.windowGuarded) {
        this.windowGuarded = true;
        const hasFiles = event => event.dataTransfer && Array.from(event.dataTransfer.types || []).includes('Files');
        ['dragover', 'drop'].forEach(type => window.addEventListener(type, event => { if (hasFiles(event)) event.preventDefault(); }));
      }
      const main = panel.querySelector('.presenter-main');
      const imageUnder = event => {
        const image = event.target.closest && event.target.closest('img');
        return image && stage.contains(image) ? this.items.find(item => item.element === image) : null;
      };
      let marked = null;
      const mark = item => {
        if (marked && marked !== item) marked.element.classList.remove('is-drop-target');
        marked = item;
        if (item) item.element.classList.add('is-drop-target');
      };
      main.addEventListener('dragover', event => {
        const item = imageUnder(event);
        mark(item);
        if (item) { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; }
      });
      main.addEventListener('dragleave', () => mark(null));
      main.addEventListener('drop', event => {
        const item = imageUnder(event);
        mark(null);
        if (!item) return;
        event.preventDefault();
        this.replace(item, event.dataTransfer.files[0]);
      });
    },

    /* ---- The Images tab of the Texts drawer ---- */
    rowsHtml(search) {
      return this.items.map((item, index) => {
        const scene = scenes.find(candidate => candidate.dataset.name === item.slideName);
        const where = item.slideName === null ? ui('images.logo') : (scene ? slideNumberText(scenes.indexOf(scene)) + '. ' + titleOf(scene) : item.slideName);
        const record = this.swapped.get(item.key);
        const description = (item.element.getAttribute('alt') || '') + (record ? ' · ' + record.fileName : '');
        if (search && !(where + ' ' + description).toLowerCase().includes(search)) return '';
        return '<div class="image-row' + (record ? ' is-changed' : '') + '" data-image="' + index + '">' +
          '<img src="' + escapeHtml(item.element.getAttribute('src')) + '" alt="">' +
          '<div><div class="text-row-where">' + escapeHtml(where) + '</div><div class="image-row-description">' + escapeHtml(description) + '</div></div>' +
          '<div class="image-row-actions"><button class="image-row-replace">' + escapeHtml(ui('images.replace')) + '</button>' +
          '<button class="text-row-reset image-row-reset" title="' + escapeHtml(ui('images.reset')) + '" aria-label="' + escapeHtml(ui('images.reset')) + '">↺</button></div></div>';
      }).join('');
    },
    /** A click in the Images tab: Replace… asks for a file, ↺ puts the original back. */
    onListClick(event) {
      const row = event.target.closest('.image-row');
      if (!row) return false;
      const item = this.items[Number(row.dataset.image)];
      if (event.target.closest('.image-row-reset')) { this.reset(item); return true; }
      if (event.target.closest('.image-row-replace')) {
        const picker = document.createElement('input');
        picker.type = 'file';
        picker.accept = 'image/*';
        picker.addEventListener('change', () => { if (picker.files[0]) this.replace(item, picker.files[0]); });
        picker.click();
        return true;
      }
      return false;
    },
  };

  /** After an image changed: the presenter view's preview, the Slides drawer and the Images tab. */
  function afterImagesChanged() {
    if (presenter.panel) presenter.panel.dataset.previewFor = '';
    if (hasPresenterView()) slidesDrawer.markOutOfDate();
    textEditor.markOutOfDate();
    textEditor.refreshIfNeeded();
    updatePresenterView();
  }
