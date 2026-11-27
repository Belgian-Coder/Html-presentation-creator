  /* ===========================================================================
     11. PRESENTER VIEW DRAWERS
     Four drawers hide at the edges of the presenter view; only a thin tab
     shows. A drawer slides in while the mouse is over its tab, or stays open
     with its key. Only one drawer stays open at a time.
       right edge:  Chapters (C, upper half)    Keys (K or ?, lower half)
       left edge:   Slides (G, upper half)      Texts (T, lower half, section 14)
     =========================================================================== */

  /** A drawer of the presenter view (see CSS "drawers"). onOpen runs when its key opens it. */
  function makeDrawer(selector, onOpen) {
    return {
      element() { return presenter.panel && presenter.panel.querySelector(selector); },
      /** Its key or button: keep it open (or close it again). */
      toggle() {
        const drawer = this.element();
        if (!drawer) return;
        const opens = !drawer.classList.contains('is-open');
        presenter.panel.querySelectorAll('.presenter-drawer').forEach(other => other.classList.remove('is-open'));
        drawer.classList.toggle('is-open', opens);
        if (opens && onOpen) onOpen();
      },
      close() {
        const drawer = this.element();
        if (drawer) drawer.classList.remove('is-open');
      },
    };
  }

  /* ---- Chapters (right, upper half): the list is built in buildPresenterPanel ---- */
  const chapterDrawer = makeDrawer('.chapters-drawer', () => scrollChapterListTo(state.currentIndex));

  /* ---- Keys (right, lower half): what each key does ----
     The keys come from KEYS (section 9), the texts from the interface texts ("keys.<action>").
     A new KEYS action needs a row here (the console warns when one is missing). */
  const keysDrawer = makeDrawer('.keys-drawer');
  const KEY_HELP = ['next', 'back', 'blank', 'spotlight', 'pen', 'highlighter', 'wipeInk', 'zoom', 'bigger', 'smaller', 'exitPresenter', 'chapters', 'keyList',
    'slideGrid', 'texts', 'editor', 'settings', 'presenter', 'startShow', 'fullscreen', 'first', 'last', 'motion'];
  const KEY_NAMES = { ArrowRight: '→', ArrowLeft: '←', ArrowDown: '↓', ArrowUp: '↑', ' ': 'Space', Escape: 'Esc', PageDown: 'PgDn', PageUp: 'PgUp', Backspace: '⌫', '-': '−' };

  /** Keys drawer: shows the last key pressed, so you can see what a remote's buttons send. */
  function showLastKey(event) {
    const box = presenter.panel && presenter.panel.querySelector('.presenter-last-key kbd');
    if (!box) return;
    // Shift is left out for typed characters: "?" rather than "Shift+?"
    const modifierNames = event.key.length === 1 ? ['Control', 'Alt', 'Meta'] : ['Control', 'Alt', 'Shift', 'Meta'];
    const modifiers = modifierNames.filter(name => event.getModifierState && event.getModifierState(name) && event.key !== name);
    box.textContent = modifiers.concat(event.key === ' ' ? 'Space' : event.key).join('+');
  }

  function keyListHtml() {
    const missing = Object.keys(KEYS).filter(action => !KEY_HELP.includes(action));
    if (missing.length) console.warn('KEY_HELP has no row for: ' + missing.join(', '));   // add a row so the Keys drawer lists it
    const rows = KEY_HELP.filter(action => action !== 'editor' || hasEditor()).map(action => {   // a copy without the editor: no E row
      // "l" and "L" show as one key; letters in capitals
      const keys = [...new Set(KEYS[action].map(key => KEY_NAMES[key] || (key.length === 1 ? key.toUpperCase() : key)))];
      return '<div><span>' + escapeHtml(ui('keys.' + action)) + '</span><span class="keys-list">' + keys.map(key => '<kbd>' + escapeHtml(key) + '</kbd>').join('') + '</span></div>';
    });
    rows.push('<div><span>' + escapeHtml(ui('keys.wheel')) + '</span><span class="keys-list"><kbd>' + escapeHtml(ui('keys.mouseWheel')) + '</kbd></span></div>');
    return rows.join('');
  }

  /* ---- Slides (left, upper half): every slide as a small picture; a click goes there ----
     The pictures are still copies (like the next-slide preview), drawn the first time the
     drawer opens and again after a text change. Backup slides have their own heading. */
  /* ---- The Texts drawer (left edge, lower half): its editor is section 14 ---- */
  const textsDrawer = makeDrawer('.texts-drawer', () => textEditor.render());

  const slidesDrawer = Object.assign(makeDrawer('.slides-drawer', () => slidesDrawer.render()), {
    isDrawn: false,

    setUp(panel) {
      this.isDrawn = false;
      const drawer = panel.querySelector('.slides-drawer');
      drawer.style.setProperty('--slide-grid-columns', CONFIG.slideGrid.columns);
      drawer.addEventListener('pointerenter', () => this.render());   // hovering the tab opens it: draw it then
    },
    /** Draws the pictures if they are not there yet (or are out of date). */
    render() {
      const grid = presenter.panel && presenter.panel.querySelector('.slide-grid');
      if (!grid || this.isDrawn) return;
      this.isDrawn = true;
      grid.innerHTML = '';
      scenes.forEach((scene, index) => {
        if (index === mainSlideCount) {
          const heading = document.createElement('div');
          heading.className = 'slide-grid-heading';
          heading.textContent = ui('slides.backupHeading');
          grid.appendChild(heading);
        }
        const card = document.createElement('button');
        card.className = 'slide-card';
        card.dataset.index = index;
        const picture = document.createElement('div');
        picture.className = 'slide-card-picture still-slide';
        const pictureStage = document.createElement('div');
        pictureStage.className = 'slide-card-stage';
        pictureStage.dataset.slide = scene.dataset.name;
        const copy = makeStillCopy(index);
        if (scene.hasAttribute('data-end-state')) copy.classList.add('is-finished');
        pictureStage.appendChild(copy);
        picture.appendChild(pictureStage);
        const caption = document.createElement('span');
        caption.className = 'slide-card-caption';
        caption.innerHTML = '<b>' + escapeHtml(slideNumberText(index)) + '</b>' + escapeHtml(titleOf(scene));
        card.append(picture, caption);
        card.addEventListener('click', () => {
          card.blur();
          slidesDrawer.close();
          goToSlide(index);
        });
        grid.appendChild(card);
      });
      this.rescale();
      this.markCurrent();
    },
    /** Each picture is a 1600 x 900 slide, scaled down to the width of its card. */
    rescale() {
      if (!presenter.panel) return;
      presenter.panel.querySelectorAll('.slide-card-picture').forEach(picture => {
        picture.firstChild.style.transform = 'scale(' + picture.clientWidth / CONFIG.stage.width + ')';
      });
    },
    markCurrent() {
      if (!presenter.panel || !this.isDrawn) return;
      presenter.panel.querySelectorAll('.slide-card').forEach(card => {
        card.classList.toggle('is-current', Number(card.dataset.index) === state.currentIndex);
      });
    },
    /** A text changed: draw the pictures again the next time the drawer opens. */
    markOutOfDate() { this.isDrawn = false; },
  });
