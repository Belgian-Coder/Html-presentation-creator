  /* ===========================================================================
     3. SMALL HELPERS
     =========================================================================== */
  /* ---- Safety net: one broken slide script never stops the talk ----
     Slide behaviours, slide timers and the presenter view refresh run through runSafely().
     An error there is written to the console and counted in the presenter view's check row
     (rose "script error"); Next and Back keep working. */
  const scriptErrors = { count: 0, last: '', toastShown: false };

  /** Runs fn and returns its result; on an error returns `fallback` and reports the error. */
  function runSafely(what, fn, fallback) {
    try {
      return fn();
    } catch (error) {
      reportScriptError(what, error);
      return fallback;
    }
  }

  function reportScriptError(what, error) {
    scriptErrors.count++;
    scriptErrors.last = what + ': ' + (error && error.message ? error.message : String(error));
    console.error('Presentation script error in ' + what + ' (the presentation keeps working)', error);
    // one message, only in the presenter view: a single window may be the one on the projector
    if (!scriptErrors.toastShown && presenter.panel) {
      scriptErrors.toastShown = true;
      showToast(ui('toast.scriptError'));
    }
  }

  /** Errors outside runSafely (e.g. in an event handler) are counted too. */
  function setUpErrorReporting() {
    window.addEventListener('error', event => reportScriptError('page', event.error || event.message));
    window.addEventListener('unhandledrejection', event => reportScriptError('page', event.reason));
  }

  /** Runs fn after ms, unless the slide changes first. */
  function slideTimeout(fn, ms) {
    const timer = setTimeout(() => runSafely('slide timer', fn), ms);
    state.timeouts.push(timer);
    return timer;
  }

  /** Cancels everything planned with slideTimeout. */
  function clearSlideTimeouts() {
    state.timeouts.forEach(clearTimeout);
    state.timeouts = [];
  }

  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }

  function currentScene() { return scenes[state.currentIndex]; }

  /** Number of extra Next clicks a slide uses: data-steps or the highest data-reveal-step (the larger); 0 for most slides. */
  function stepsOf(scene) {
    const declared = parseInt(scene.dataset.steps || '0', 10) || 0;
    const highestReveal = Array.from(scene.querySelectorAll('[data-reveal-step]'))
      .reduce((highest, element) => Math.max(highest, revealStepOf(element)), declared);
    // a video that starts on a click (data-play-step, section 7) counts as a step too
    return Array.from(scene.querySelectorAll('[data-play-step]'))
      .reduce((highest, element) => Math.max(highest, parseInt(element.getAttribute('data-play-step'), 10) || 0), highestReveal);
  }

  /** The steps a slide's own behaviour handles (data-steps); reveal steps above that are only for data-reveal-step. */
  function ownStepsOf(scene) { return parseInt(scene.dataset.steps || '0', 10) || 0; }

  /** The data-reveal-step number of an element; an empty or wrong value counts as 0 (always shown). */
  /** Click effects whose item is on screen before its click (the click changes it, or takes it away). */
  const SHOWN_BEFORE_CLICK = '[data-reveal-effect="fade-out"], [data-reveal-effect="leave"], [data-reveal-effect="highlight"], [data-reveal-effect="strike"], [data-reveal-effect="underline"], [data-reveal-effect="shake"], [data-reveal-effect="pulse"], [data-reveal-effect="jump"], [data-reveal-effect="circled"], [data-reveal-effect="glow"], [data-reveal-effect="tick"]';
  function revealStepOf(element) { return Math.max(0, parseInt(element.dataset.revealStep, 10) || 0); }

  /** Chapter title of a slide (data-title). */
  function titleOf(scene) { return scene.dataset.title || scene.dataset.name; }

  /** Forces the browser to apply style changes now, so a removed-and-added class restarts its animation. */
  function forceReflow(element) { void element.offsetWidth; }

  /** "1:05" for 65 seconds. */
  function formatMinutesSeconds(seconds) {
    const rounded = Math.round(seconds);
    return Math.floor(rounded / 60) + ':' + String(rounded % 60).padStart(2, '0');
  }

  /** "1:30" or "90" -> 90 seconds; anything else -> null. */
  function parseMinutesSeconds(text) {
    const match = String(text).trim().match(/^(?:(\d+):)?(\d+)$/);
    if (!match) return null;
    const minutes = match[1] ? parseInt(match[1], 10) : 0;
    const seconds = parseInt(match[2], 10);
    if (match[1] && seconds > 59) return null;
    return minutes * 60 + seconds;
  }

  /** A colour token (e.g. '--color-accent') as rgba() with the given transparency, for script animations. */
  function colorWithAlpha(token, alpha) {
    const hex = getComputedStyle(root).getPropertyValue(token).trim().replace('#', '');
    const value = parseInt(hex.length === 3 ? hex.replace(/./g, c => c + c) : hex, 16);
    return `rgba(${(value >> 16) & 255},${(value >> 8) & 255},${value & 255},${alpha})`;
  }

  /** Settings saved in this browser. Cookies do not work for a file opened from disk,
      so localStorage is used: it stays on this computer and survives a restart. */
  const storage = {
    memory: new Map(),   // fallback when the browser blocks storage: settings then last until the page closes

    read(key) {
      if (this.memory.has(key)) return JSON.parse(this.memory.get(key));   // newest value written here
      try {
        const raw = localStorage.getItem(key);
        return raw === null ? null : JSON.parse(raw);
      } catch (e) {
        return null;
      }
    },
    /** Drops the in-memory copy, so the next read sees what another window saved. */
    forget(key) { this.memory.delete(key); },
    write(key, value) {
      if (value === null) this.memory.delete(key);
      else this.memory.set(key, JSON.stringify(value));
      try {
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, JSON.stringify(value));
      } catch (e) { /* storage blocked: the in-memory copy is used */ }
    },
  };

  /** True when `object` has `key` itself (not from its prototype, so "constructor" never counts). */
  function hasOwn(object, key) { return !!object && Object.prototype.hasOwnProperty.call(object, key); }

  /** JSON.parse that gives `fallback` instead of an error for missing or broken text. */
  function parseJsonOr(text, fallback) {
    try { return text ? JSON.parse(text) : fallback; } catch (e) { return fallback; }
  }

  /** Text made safe to put inside innerHTML. */
  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  /** Asks yes/no. Where the browser blocks dialogs (inside some web pages) confirm() returns false
      at once; nobody can answer that fast, so then the action simply goes ahead. */
  function askToConfirm(question) {
    const askedAt = Date.now();
    const answer = window.confirm(question);
    return answer || Date.now() - askedAt < 50;
  }

  /** The parts of the file between the marks of one kind ('EDITOR', 'PRESENTER'): a comment KIND-ONLY-START … KIND-ONLY-END in
      CSS and script, an HTML comment in the page. Cut out, the rest still works (README, "Leaving parts out"). */
  function markedPart(kind) {
    return new RegExp('/\\* ' + kind + '-ONLY-START[\\s\\S]*?' + kind + '-ONLY-END \\*/|<!-- ' + kind + '-ONLY-START -->[\\s\\S]*?<!-- ' + kind + '-ONLY-END -->', 'g');
  }
  /** True when this file has the editor (a copy made with "Export without editor" has not). */
  function hasEditor() { return typeof editor !== 'undefined'; }
  /** True when this file has the presenter view (a copy made with "Export without presenter view" has not; sections 10b-12). */
  function hasPresenterView() { return typeof presenterView !== 'undefined'; }
  /** True while the editor is open. */
  function editorIsOpen() { return hasEditor() && editor.isOpen(); }

  /** Shows a short message at the top of the window. */
  function showToast(message) {
    deck.querySelectorAll('.toast').forEach(old => old.remove());
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    deck.appendChild(toast);
    setTimeout(() => toast.remove(), CONFIG.toastMs);
  }

