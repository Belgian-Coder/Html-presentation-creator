  /* ===========================================================================
     9. CONTROLS BAR AND INPUT
     =========================================================================== */

  /** One segment per slide in the bottom bar, with the chapter title on hover.
      In the presenter view a marker shows where the time plan says we should be. */
  const paceMarker = document.createElement('span');

  function chapterBarButtons() { return Array.from(chapterBar.querySelectorAll('button')); }

  function buildChapterBar() {
    scenes.slice(0, mainSlideCount).forEach((scene, index) => {   // backup slides get no segment
      const button = document.createElement('button');
      const tip = document.createElement('span');
      const number = document.createElement('b');
      button.setAttribute('role', 'tab');
      tip.className = 'chapter-tip';
      number.textContent = index + 1;
      tip.append(number, document.createElement('span'));
      button.appendChild(tip);
      button.addEventListener('click', () => { button.blur(); goToSlide(index); });
      chapterBar.appendChild(button);
    });
    paceMarker.className = 'pace-marker';
    paceMarker.setAttribute('aria-hidden', 'true');
    chapterBar.appendChild(paceMarker);
    updateChapterBarTitles();
  }

  /** The chapter titles in the bar (again after a title was changed in the Texts drawer). */
  function updateChapterBarTitles() {
    chapterBarButtons().forEach((button, index) => {
      button.setAttribute('aria-label', (index + 1) + '. ' + titleOf(scenes[index]));
      button.querySelector('.chapter-tip span').textContent = titleOf(scenes[index]);
    });
  }

  function updateChapterBar() {
    chapterBarButtons().forEach((button, index) => {
      button.classList.toggle('is-current', index === state.currentIndex);
      button.classList.toggle('is-past', index < state.currentIndex);
      button.setAttribute('aria-selected', index === state.currentIndex ? 'true' : 'false');
    });
  }

  /* ---- Auto-hide: the bar and the mouse cursor disappear when not used ---- */
  let hideControlsTimer = null;
  let hideCursorTimer = null;

  function showControlsBriefly() {
    deck.classList.remove('is-idle');
    clearTimeout(hideControlsTimer);
    hideControlsTimer = setTimeout(() => deck.classList.add('is-idle'), CONFIG.controls.hideAfterMs);
  }

  function showCursorBriefly() {
    deck.classList.remove('is-cursor-hidden');
    clearTimeout(hideCursorTimer);
    hideCursorTimer = setTimeout(() => deck.classList.add('is-cursor-hidden'), CONFIG.cursorHideAfterMs);
  }

  function setUpAutoHide() {
    document.addEventListener('mousemove', event => {
      showCursorBriefly();
      if (event.clientY > window.innerHeight - CONFIG.controls.wakeZonePx) showControlsBriefly();
    }, { passive: true });
    document.addEventListener('touchstart', showControlsBriefly, { passive: true });
    showControlsBriefly();
    showCursorBriefly();
  }

  /* ---- Black screen and full screen ---- */
  function isBlank() { return deck.classList.contains('is-blank'); }

  function setBlank(on) {
    deck.classList.toggle('is-blank', on);
    sendToPeer('blank', { on });
  }

  /** Smallest and largest spotlight radius in stage pixels, from the % limits in CONFIG.pointer. */
  function spotlightRadiusMinPx() { return CONFIG.pointer.minSpotlightSizePercent / 100 * CONFIG.stage.height; }
  function spotlightRadiusMaxPx() { return CONFIG.pointer.maxSpotlightSizePercent / 100 * CONFIG.stage.height; }

  /* ---- Spotlight settings (Settings panel), saved in this browser ---- */
  const spotlightSettings = {
    /** The values written in the file (data-spotlight on the deck, see "Save a copy"), else CONFIG. */
    defaults() {
      const fromConfig = { sizePercent: CONFIG.pointer.spotlightSizePercent, dimPercent: CONFIG.pointer.spotlightDimPercent, followEnabled: false };
      return this.checked(parseJsonOr(deck.dataset.spotlight, {}), fromConfig);
    },
    /** The values saved in this browser, else the file's values. */
    current() { return this.checked(storage.read(CONFIG.storageKeys.spotlight) || {}, this.defaults()); },
    hasBrowserValues() { return storage.read(CONFIG.storageKeys.spotlight) !== null; },
    /** Each value checked and kept within its limits; anything missing or wrong becomes the fallback's value. */
    checked(saved, defaults) {
      const { pointer } = CONFIG;
      const numberIn = (value, min, max, fallback) => Number.isFinite(value) ? clamp(Math.round(value), min, max) : fallback;
      return {
        sizePercent: numberIn(saved.sizePercent, pointer.minSpotlightSizePercent, pointer.maxSpotlightSizePercent, defaults.sizePercent),
        dimPercent: numberIn(saved.dimPercent, 0, pointer.maxSpotlightDimPercent, defaults.dimPercent),
        followEnabled: typeof saved.followEnabled === 'boolean' ? saved.followEnabled : defaults.followEnabled,
      };
    },
    save(changes) { storage.write(CONFIG.storageKeys.spotlight, Object.assign(this.current(), changes)); },
    reset() { storage.write(CONFIG.storageKeys.spotlight, null); },
  };

  /* ---- Spotlight (L) and zoom (Z) ----
     Both follow the mouse over the slide; the mouse wheel or + / − make the circle or the
     zoom bigger or smaller. Esc turns them off, a new slide ends the zoom.
     Follow mode (a Settings option) shows the spotlight by itself while the mouse moves and
     hides it again when the mouse stops; only the window where you work (not the audience
     window) runs that timer, and it tells the audience window with followVisible. The
     position is kept in stage pixels (0-1600, 0-900), so it means the same spot in
     both windows: moving the mouse over the presenter view moves it on the projector. */
  const pointerTools = {
    spotlight: false,
    zoom: false,
    x: CONFIG.stage.width / 2,
    y: CONFIG.stage.height / 2,
    spotlightRadius: 0,          // set from the settings by applySpotlightSettings()
    sizePercent: null,           // the start size it was set from, to notice when the setting changes
    dimPercent: CONFIG.pointer.spotlightDimPercent,
    followEnabled: false,        // setting: show the spotlight by itself while the mouse moves
    followVisible: false,          // ...and it is showing right now
    followTimer: null,
    zoomLevel: CONFIG.pointer.zoomLevel,
    sendPending: false,

    /** Spotlight or zoom turned on with L / Z (what Esc turns off first). */
    isPinned() { return this.spotlight || this.zoom; },
    /** Anything showing, including a follow spotlight (what the wheel and + / − resize). */
    isOn() { return this.isPinned() || this.followVisible; },
    isSpotlightShown() { return this.spotlight || this.followVisible; },
    /** Reads the start size, darkness and "follow" setting (at start and when Settings change them). */
    applySpotlightSettings() {
      const settings = spotlightSettings.current();
      if (settings.sizePercent !== this.sizePercent) {   // keep a size made with the wheel or + / − unless the start size changed
        this.sizePercent = settings.sizePercent;
        this.spotlightRadius = settings.sizePercent / 100 * CONFIG.stage.height;
      }
      this.dimPercent = settings.dimPercent;
      this.followEnabled = settings.followEnabled && !sync.isAudience;
      if (!this.followEnabled) this.hideFollow();
      this.render();
      if (!sync.isAudience) { this.version = (this.version || 0) + 1; this.send(); }   // the audience window never decides the pointer state
    },
    /** "Show while the mouse moves": show it now and hide it again once the mouse stops. */
    showFollow() {
      this.followVisible = true;
      clearTimeout(this.followTimer);
      this.followTimer = setTimeout(() => { this.hideFollow(); this.changed(); }, CONFIG.pointer.followHideMs);
    },
    hideFollow() {
      clearTimeout(this.followTimer);
      this.followVisible = false;
    },
    toggleSpotlight() { this.spotlight = !this.spotlight; this.changed(true); },
    toggleZoom() { this.zoom = !this.zoom; this.changed(true); },
    /** Esc: both off, in both windows. */
    turnOff() {
      this.spotlight = false;
      this.zoom = false;
      this.hideFollow();
      this.changed(true);
    },
    /** A new slide starts unzoomed (each window does this itself). */
    endZoom() {
      if (!this.zoom) return;
      this.zoom = false;
      this.render();
    },
    /** Draws it, tells the other window. deliberate: on/off or size (counts as a change that wins: apply), not the follow timer. */
    changed(deliberate) {
      if (deliberate) this.version = (this.version || 0) + 1;
      this.render();
      this.send();
      updatePresenterView();
    },
    /** Writes the state into CSS variables and classes on the stage (zoom: CSS section 4, spotlight: section 8). */
    render() {
      stage.classList.toggle('is-spotlight', this.isSpotlightShown());
      stage.style.setProperty('--spotlight-dim', this.dimPercent / 100);
      stage.classList.toggle('is-zoomed', this.zoom);
      stage.style.setProperty('--pointer-x', this.x + 'px');
      stage.style.setProperty('--pointer-y', this.y + 'px');
      stage.style.setProperty('--spotlight-radius', this.spotlightRadius + 'px');
      stage.style.setProperty('--zoom-level', this.zoom ? this.zoomLevel : 1);
      stage.style.setProperty('--zoom-x', this.x + 'px');
      stage.style.setProperty('--zoom-y', this.y + 'px');
    },
    /** Sends the state to the other window, at most once per screen frame. */
    send() {
      if (this.sendPending || sync.applyingRemoteMessage) return;
      this.sendPending = true;
      // at most once per frame; a window in the background gets no frames (or late ones): then after 50 ms
      const flush = () => {
        if (!this.sendPending) return;
        this.sendPending = false;
        sendToPeer('pointer', { spotlight: this.spotlight, followVisible: this.followVisible, zoom: this.zoom, x: this.x, y: this.y,
          spotlightRadius: this.spotlightRadius, dimPercent: this.dimPercent, zoomLevel: this.zoomLevel, version: this.version || 0 });
      };
      requestAnimationFrame(flush);
      setTimeout(flush, 50);
    },
    /** The state from the other window (never sent back). */
    apply(payload) {
      // two windows that change it at the same moment: the latest deliberate change (on/off, size, darkness) wins in both.
      // Each one counts up (version); an older state that crossed it does not change those; the same count: the presenter's
      // wins (no clock: windows may differ). Where the pointer is always follows.
      const version = Number(payload.version) || 0, mine = this.version || 0;
      const older = version < mine || (version === mine && !sync.isAudience && version > 0);
      const clampedOrFallback = (value, min, max, fallback) => Number.isFinite(value) ? clamp(value, min, max) : fallback;
      const { pointer } = CONFIG;
      if (!older) {
        this.version = version;
        this.spotlight = !!payload.spotlight;
        this.zoom = !!payload.zoom;
        this.spotlightRadius = clampedOrFallback(payload.spotlightRadius, spotlightRadiusMinPx(), spotlightRadiusMaxPx(), this.spotlightRadius);
        this.dimPercent = clampedOrFallback(payload.dimPercent, 0, pointer.maxSpotlightDimPercent, this.dimPercent);
        this.zoomLevel = clampedOrFallback(payload.zoomLevel, pointer.minZoomLevel, pointer.maxZoomLevel, this.zoomLevel);
      }
      if (sync.isAudience) this.followVisible = !!payload.followVisible;   // only the presenter's follow timer counts
      this.x = clampedOrFallback(payload.x, 0, CONFIG.stage.width, this.x);
      this.y = clampedOrFallback(payload.y, 0, CONFIG.stage.height, this.y);
      this.render();
    },
    /** The mouse moved: follow it while it is over the slide. */
    onMouseMove(event) {
      if (!(this.isOn() || this.followEnabled) || !isOverSlide(event)) return;
      if (this.followEnabled && !this.isPinned()) this.showFollow();   // never over a pinned spotlight or a zoom
      const box = stage.getBoundingClientRect();
      this.x = clamp((event.clientX - box.left) / box.width * CONFIG.stage.width, 0, CONFIG.stage.width);
      this.y = clamp((event.clientY - box.top) / box.height * CONFIG.stage.height, 0, CONFIG.stage.height);
      this.render();
      this.send();
    },
    /** Mouse wheel over the slide: bigger or smaller zoom (or spotlight circle when not zoomed). */
    onWheel(event) {
      if (!this.isOn() || !isOverSlide(event)) return;
      if (event.ctrlKey || event.deltaY === 0) return;   // browser zoom (Ctrl+wheel, pinch) and sideways scrolling stay as they are
      event.preventDefault();
      // one wheel click (deltaY 100) is one wheelFactor step; a trackpad sends many small steps
      this.resize(clamp(-event.deltaY / 100, -1, 1));
    },
    /** Bigger (steps > 0) or smaller: the zoom when zoomed, otherwise the spotlight circle. */
    resize(steps) {
      if (!this.isOn()) return;
      const { pointer } = CONFIG;
      const factor = Math.pow(pointer.wheelFactor, steps);
      if (this.followVisible) this.showFollow();   // keep a "follow" spotlight visible while resizing
      if (this.zoom) this.zoomLevel = clamp(this.zoomLevel * factor, pointer.minZoomLevel, pointer.maxZoomLevel);
      else this.spotlightRadius = clamp(this.spotlightRadius * factor, spotlightRadiusMinPx(), spotlightRadiusMaxPx());
      this.version = (this.version || 0) + 1;   // a deliberate change (apply)
      this.render();
      this.send();
    },
  };

  /* ---- Pen and highlighter while presenting (D, H; X wipes the slide; Esc stops drawing) ----
     Lines drawn on the slide with the mouse, a pen or a finger, as in PowerPoint's slide show. They belong to the slide
     they were drawn on (back on that slide: they are there again) and to this talk only: never saved. Both windows show
     them (the 'ink' message: the lines of one slide). */
  const INK_KINDS = ['pen', 'highlighter'];
  const INK_MAX_POINTS = 4000;   // per line (a very long scribble stops growing)
  const ink = {
    mode: '',               // 'pen', 'highlighter' or '' (not drawing)
    strokes: new Map(),     // slide index -> [{ kind, points: [[x, y], …] }] in stage pixels
    layer: null,
    drawing: null,          // the line being drawn now
    sendPending: false,

    setUp() {
      const layer = this.layer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      layer.setAttribute('class', 'ink-layer');
      layer.setAttribute('viewBox', '0 0 ' + CONFIG.stage.width + ' ' + CONFIG.stage.height);
      layer.setAttribute('aria-hidden', 'true');
      stage.appendChild(layer);
      layer.addEventListener('pointerdown', event => this.start(event));
      layer.addEventListener('pointermove', event => this.move(event));
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => layer.addEventListener(type, () => this.end()));
    },
    /** D / H or the ✎ button: that tool on, or off again. The zoom ends, in both windows (lines go where the slide is). */
    toggle(mode) {
      this.mode = this.mode === mode ? '' : mode;
      if (this.mode && pointerTools.zoom) { pointerTools.zoom = false; pointerTools.changed(true); }
      this.render();
      showToast(this.mode ? ui(this.mode === 'pen' ? 'toast.penOn' : 'toast.highlighterOn') : ui('toast.inkOff'));
    },
    /** Esc: drawing stops (the lines stay). True when it was on. */
    stop() {
      if (!this.mode) return false;
      this.mode = '';
      this.end();
      this.render();
      showToast(ui('toast.inkOff'));
      return true;
    },
    /** X: the lines on this slide go. */
    wipe() {
      if (!(this.strokes.get(state.currentIndex) || []).length) return;
      this.strokes.delete(state.currentIndex);
      this.render();
      this.send();
      showToast(ui('toast.inkWiped'));
    },
    point(event) {
      const box = stage.getBoundingClientRect();
      return [clamp(Math.round((event.clientX - box.left) / box.width * CONFIG.stage.width * 10) / 10, 0, CONFIG.stage.width),
        clamp(Math.round((event.clientY - box.top) / box.height * CONFIG.stage.height * 10) / 10, 0, CONFIG.stage.height)];
    },
    start(event) {
      if (!this.mode || event.button > 0) return;
      event.preventDefault();
      try { this.layer.setPointerCapture(event.pointerId); } catch (error) { /* a pointer that is gone already */ }
      this.drawing = { kind: this.mode, points: [this.point(event)] };
      if (!this.strokes.has(state.currentIndex)) this.strokes.set(state.currentIndex, []);
      this.strokes.get(state.currentIndex).push(this.drawing);
      this.render();
      this.send();
    },
    move(event) {
      if (!this.drawing || this.drawing.points.length >= INK_MAX_POINTS) return;
      const next = this.point(event), last = this.drawing.points[this.drawing.points.length - 1];
      if (Math.hypot(next[0] - last[0], next[1] - last[1]) < 2) return;   // (a line, not thousands of dots)
      this.drawing.points.push(next);
      this.render();
      this.send();
    },
    end() {
      if (!this.drawing) return;
      this.drawing = null;
      this.send();
    },
    /** Draws the lines of the slide that is on; the layer takes the mouse only while a tool is on. */
    render() {
      if (!this.layer) return;
      stage.classList.toggle('is-inking', !!this.mode);
      stage.dataset.ink = this.mode;
      const button = byId('btnPen');
      if (button) button.setAttribute('aria-pressed', String(!!this.mode));
      const lines = this.strokes.get(state.currentIndex) || [];
      this.layer.innerHTML = lines.map(line => '<polyline class="ink-' + line.kind + '" points="' + line.points.map(point => point.join(',')).join(' ') + '"/>').join('');
    },
    /** The lines of this slide to the other window, at most once a frame. */
    send() {
      if (this.sendPending || sync.applyingRemoteMessage) return;
      this.sendPending = true;
      const flush = () => {
        if (!this.sendPending) return;
        this.sendPending = false;
        sendToPeer('ink', { slideIndex: state.currentIndex, strokes: this.strokes.get(state.currentIndex) || [] });
      };
      requestAnimationFrame(flush);
      setTimeout(flush, 50);
    },
    /** A new audience window: the lines of every slide (it starts without any). */
    sendAll() { this.strokes.forEach((strokes, slideIndex) => sendToPeer('ink', { slideIndex, strokes })); },
    /** The lines of a slide from the other window (checked: only lines of the two kinds, numbers on the slide). */
    apply(payload) {
      const index = Number(payload.slideIndex);
      if (!Number.isInteger(index) || index < 0 || index >= scenes.length) return;
      const lines = (Array.isArray(payload.strokes) ? payload.strokes : []).filter(line => line && INK_KINDS.includes(line.kind) && Array.isArray(line.points))
        .map(line => ({ kind: line.kind, points: line.points.slice(0, INK_MAX_POINTS).filter(point => Array.isArray(point) && Number.isFinite(point[0]) && Number.isFinite(point[1]))
          .map(([x, y]) => [clamp(x, 0, CONFIG.stage.width), clamp(y, 0, CONFIG.stage.height)]) }));
      if (this.drawing && index === state.currentIndex) return;   // (drawing here now: this window's lines win)
      if (lines.length) this.strokes.set(index, lines); else this.strokes.delete(index);
      if (index === state.currentIndex) this.render();
    },
  };

  /** True when the mouse is over the slide. Without the presenter view the whole window counts;
      in the presenter view only the large slide on the left. */
  function isOverSlide(event) {
    if (settingsPanel.isOpen() || editorIsOpen()) return false;
    if (!presenter.panel) return true;
    return presenter.panel.querySelector('.presenter-main').contains(event.target);
  }

  function setUpPointerTools() {
    ink.setUp();
    document.addEventListener('mousemove', event => pointerTools.onMouseMove(event), { passive: true });
    document.addEventListener('wheel', event => pointerTools.onWheel(event), { passive: false });
  }

  function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        const leaving = document.exitFullscreen();
        if (leaving && leaving.catch) leaving.catch(() => {});
      }
      else if (root.requestFullscreen) {
        const request = root.requestFullscreen();
        if (request && request.catch) request.catch(() => {});
      }
    } catch (e) { /* not allowed here */ }
  }

  function toggleForcedMotion() {
    setForceMotion(!isMotionForced());
    sendToPeer('motion', { on: isMotionForced() });
    if (!sync.isAudience) showToast(motion.reduced ? ui('toast.animationsOff') : ui('toast.animationsOn'));
  }

  /* ---- Buttons: they drop focus after a click, so a clicker's Space/Enter never fires them twice ---- */
  function setUpButtons() {
    const onClick = (id, action) => byId(id).addEventListener('click', event => { event.currentTarget.blur(); action(); });
    onClick('btnNext', goNext);
    onClick('btnPrevious', goBack);
    onClick('btnFullscreen', toggleFullscreen);
    onClick('btnPresenter', openPresenterView);
    onClick('btnPen', () => ink.toggle('pen'));
    onClick('btnSettings', () => settingsPanel.open());
    onClick('btnEditor', () => { if (hasEditor()) editor.open(); });
  }

  /* ---- Keyboard and presenter remotes ----
     Remotes (e.g. Logitech Spotlight) send arrows or PageDown/PageUp. */
  const KEYS = {
    next: ['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'],
    back: ['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'],
    startShow: ['F5'],                  // F5 / Shift+F5 like PowerPoint: full screen
    blank: ['.', 'b', 'B'],
    presenter: ['p', 'P'],
    settings: ['s', 'S'],
    exitPresenter: ['Escape'],
    motion: ['m', 'M'],
    first: ['Home'],
    last: ['End'],
    fullscreen: ['f', 'F'],
    spotlight: ['l', 'L'],
    pen: ['d', 'D'],                     // draw on the slide (pen); again: off
    highlighter: ['h', 'H'],             // draw with a highlighter
    wipeInk: ['x', 'X'],                 // the lines on this slide go
    chapters: ['c', 'C'],                // presenter view: keep the chapter list open
    keyList: ['k', 'K', '?'],            // presenter view: keep the key list open
    slideGrid: ['g', 'G'],               // presenter view: keep the Slides drawer (all slides as pictures) open
    texts: ['t', 'T'],                   // presenter view: keep the Texts drawer open
    editor: ['e', 'E'],                  // the editor (section 17)
    zoom: ['z', 'Z'],
    bigger: ['+', '='],                 // spotlight circle or zoom bigger (also the mouse wheel)
    smaller: ['-', '_'],
  };
  const isKey = (event, action) => KEYS[action].includes(event.key);

  function handleKeyDown(event) {
    if (editorIsOpen()) { editor.onKeyDown(event); return; }   // the editor has keys of its own
    if (hasPresenterView()) showLastKey(event);   // (the presenter view shows the last key)
    // Typing in the Texts drawer: keys belong to the text field. Esc leaves the field; a remote's
    // PageDown / PageUp leave it and still change the slide, so the talk never gets stuck.
    // Space or Enter on a focused button in a drawer presses that button, never Next
    const active = document.activeElement;
    if ((event.key === ' ' || event.key === 'Enter') && active && active.matches('.presenter-drawer button, .presenter-checks button')) return;
    if (textEditor.isTyping()) {
      if (event.key === 'Escape') { event.preventDefault(); textEditor.leaveField(); return; }
      if (!['PageDown', 'PageUp'].includes(event.key)) return;
      textEditor.leaveField();
    }
    // While the panel is open: Esc closes it, Tab stays inside it, clicker keys close it and act,
    // and other keys belong to the panel while it has focus.
    if (settingsPanel.isOpen()) {
      if (event.key === 'Escape') {
        event.preventDefault();
        settingsPanel.close();
        return;
      }
      if (event.key === 'Tab') {
        settingsPanel.keepFocusInside(event);
        return;
      }
      // Clicker keys (arrows, PageDown/PageUp, F5) and B close the panel and do their job, so a
      // forgotten panel never blocks the talk. Exceptions: while you type in a time field, keys
      // edit the field; Space/Enter on a panel button press that button.
      const isClickerKey = ['PageDown', 'PageUp', 'F5'].includes(event.key);
      const isDeckKey = isKey(event, 'next') || isKey(event, 'back') || isKey(event, 'blank');
      const active = document.activeElement;
      // sliders and the checkbox do not count: a remote's arrow keys must still reach the slides
      const isTyping = active && active.matches('.settings-panel input:not([type=color], [type=range], [type=checkbox]), .settings-panel select');
      const isPressingPanelButton = (event.key === ' ' || event.key === 'Enter') && active && active.matches('.settings-panel button, .settings-panel input');
      if (!isClickerKey && (!isDeckKey || isTyping || isPressingPanelButton)) return;
      settingsPanel.close();
    }
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    if (isKey(event, 'startShow')) {
      event.preventDefault();
      if (!document.fullscreenElement) toggleFullscreen();
      return;
    }
    if (isKey(event, 'blank')) {
      event.preventDefault();
      setBlank(!isBlank());
      updatePresenterView();
      return;
    }
    if (isKey(event, 'presenter') && !sync.isAudience) {
      event.preventDefault();
      openPresenterView();
      return;
    }
    if (isKey(event, 'editor') && !sync.isAudience && !event.repeat) {
      event.preventDefault();
      if (hasEditor()) editor.open();
      return;
    }
    if (isKey(event, 'settings') && !sync.isAudience) {
      event.preventDefault();
      settingsPanel.open();
      return;
    }
    const isNext = isKey(event, 'next');
    const isBack = isKey(event, 'back');
    if ((isNext || isBack) && isBlank()) {    // the first press after a black screen only shows the slide again
      event.preventDefault();
      setBlank(false);
      return;
    }
    if ((isNext || isBack) && event.repeat) {  // a held button never skips slides
      event.preventDefault();
      return;
    }
    if (isNext) { event.preventDefault(); goNext(); }
    else if (isBack) { event.preventDefault(); goBack(); }
    else if (isKey(event, 'exitPresenter')) {
      if (ink.stop()) { /* Esc first ends drawing (the lines stay) */ }
      else if (pointerTools.isPinned()) pointerTools.turnOff();   // Esc first ends spotlight and zoom (a follow spotlight does not hold it up)
      else if (presenter.panel) closePresenterView();
      else if (deck.hasAttribute('data-preview-copy') && window.opener && !document.fullscreenElement) window.close();   // the tab "Present from here" opened: Esc goes back to the editor
    }
    else if (isKey(event, 'spotlight')) pointerTools.toggleSpotlight();
    else if (isKey(event, 'pen')) ink.toggle('pen');
    else if (isKey(event, 'highlighter')) ink.toggle('highlighter');
    else if (isKey(event, 'wipeInk')) ink.wipe();
    else if (isKey(event, 'chapters') && presenter.panel) chapterDrawer.toggle();
    else if (isKey(event, 'keyList') && presenter.panel) keysDrawer.toggle();
    else if (isKey(event, 'slideGrid') && presenter.panel) slidesDrawer.toggle();
    else if (isKey(event, 'texts') && presenter.panel) textsDrawer.toggle();
    else if (isKey(event, 'zoom')) { if (!pointerTools.zoom) ink.stop(); pointerTools.toggleZoom(); }   // (zoomed, lines would not stay on what they mark: drawing stops)
    else if (isKey(event, 'bigger')) pointerTools.resize(1);
    else if (isKey(event, 'smaller')) pointerTools.resize(-1);
    else if (isKey(event, 'motion') && motion.osPrefersReduced) toggleForcedMotion();
    else if (isKey(event, 'first')) goToSlide(firstSlideOfTalk());   // (a skipped slide passed over)
    else if (isKey(event, 'last')) goToSlide(lastSlideOfTalk());   // the last slide of the talk, not a backup
    else if (isKey(event, 'fullscreen')) toggleFullscreen();
  }

  /* ---- Touch: swipe left for Next, right for Back ---- */
  function setUpSwipe() {
    let startX = null, startY = null;
    document.addEventListener('touchstart', event => {
      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
    }, { passive: true });
    document.addEventListener('touchend', event => {
      if (startX === null || settingsPanel.isOpen() || editorIsOpen() || ink.mode) return;   // (a line drawn with a finger is no swipe)   // a drag inside the settings panel never changes slides
      const deltaX = event.changedTouches[0].clientX - startX;
      const deltaY = event.changedTouches[0].clientY - startY;
      const isHorizontalSwipe = Math.abs(deltaX) > CONFIG.swipe.minDistancePx && Math.abs(deltaX) > Math.abs(deltaY) * CONFIG.swipe.horizontalRatio;
      if (isHorizontalSwipe) {
        if (deltaX < 0) goNext();
        else goBack();
      }
      startX = startY = null;
    });
  }

