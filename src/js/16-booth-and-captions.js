  /* ===========================================================================
     16. BOOTH MODE AND LIVE CAPTIONS
     Booth mode: the presentation plays by itself (a screen at a stand or in a
     hallway) and starts again after the last slide. Start it in Settings, or
     open the file with ?booth=20 (seconds per slide). Any key, click or touch
     stops it.
     Live captions (optional, off by default): what you say appears as
     subtitles at the bottom of the slides, also in the audience window. It uses
     the browser's speech recognition; in Chrome and Edge that sends the sound
     of your microphone to Google or Microsoft, so it needs internet and is
     only started when you switch it on in Settings.
     =========================================================================== */

  /* ---- Booth mode ---- */
  const boothMode = {
    on: false,
    timer: null,
    startedAt: 0,

    settings() {
      const saved = storage.read(CONFIG.storageKeys.booth) || {};
      const seconds = Number.isFinite(saved.slideSeconds) ? saved.slideSeconds : CONFIG.booth.slideSeconds;
      return { slideSeconds: clamp(Math.round(seconds), CONFIG.booth.minSeconds, CONFIG.booth.maxSeconds) };
    },
    saveSeconds(seconds) { storage.write(CONFIG.storageKeys.booth, { slideSeconds: seconds }); },

    start() {
      if (this.on || sync.isAudience || editorIsOpen()) return;   // never behind the editor
      this.on = true;
      this.startedAt = performance.now();
      deck.classList.add('is-booth');
      settingsPanel.close();
      showToast(ui('toast.boothStarted'));
      this.planNext();
    },
    stop(showMessage) {
      if (!this.on) return;
      this.on = false;
      clearTimeout(this.timer);
      deck.classList.remove('is-booth');
      if (showMessage) showToast(ui('toast.boothStopped'));
    },
    /** The next click comes after the slide time; clicks inside a slide (steps) come faster. */
    planNext() {
      clearTimeout(this.timer);
      const hasClicksLeft = clicksLeft() > 1;
      const delayMs = hasClicksLeft ? CONFIG.booth.stepSeconds * 1000 : this.settings().slideSeconds * 1000;
      this.timer = setTimeout(() => runSafely('booth mode', () => this.advance()), delayMs);
    },
    advance() {
      if (!this.on) return;
      try {
        if (clicksLeft() <= 1 && nextSlideIndex(state.currentIndex) < 0) goToSlide(firstSlideOfTalk());   // the end: start again
        else goNext();
      } finally {
        this.planNext();   // also after an error, so booth mode never stalls
      }
    },
    /** Any key, click or touch stops it (not in the first moment, so the click that started it does not). */
    setUp() {
      const stopOnInput = () => { if (this.on && performance.now() - this.startedAt > CONFIG.booth.ignoreInputMs) this.stop(true); };
      ['keydown', 'pointerdown', 'touchstart'].forEach(type => document.addEventListener(type, stopOnInput, { capture: true, passive: true }));
      const fromAddress = new URLSearchParams(location.search).get('booth');
      if (fromAddress !== null && !sync.isAudience) {
        const seconds = parseInt(fromAddress, 10);
        if (Number.isFinite(seconds) && seconds > 0) this.saveSeconds(clamp(seconds, CONFIG.booth.minSeconds, CONFIG.booth.maxSeconds));
        this.start();
      }
    },
  };

  /* ---- Live captions ---- */
  const liveCaptions = {
    recognition: null,
    on: false,
    hideTimer: null,
    finalText: '',

    isSupported() { return !!(window.SpeechRecognition || window.webkitSpeechRecognition); },
    language() {
      const saved = storage.read(CONFIG.storageKeys.captions) || {};
      return typeof saved.language === 'string' ? saved.language : CONFIG.captions.languages[0].code;
    },
    saveLanguage(code) {
      storage.write(CONFIG.storageKeys.captions, { language: code });
      if (this.on) { this.stop(); this.start(); }
    },

    start() {
      if (this.on || sync.isAudience) return;
      if (!this.isSupported()) { showToast(ui('toast.captionsUnsupported')); return; }
      const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = this.recognition = new Recognition();
      recognition.lang = this.language();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = event => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const text = event.results[i][0].transcript;
          if (event.results[i].isFinal) this.finalText = (this.finalText + ' ' + text).trim();
          else interim += text;
        }
        const words = (this.finalText + ' ' + interim).trim().split(/\s+/);
        this.finalText = this.finalText.split(/\s+/).slice(-CONFIG.captions.keepWords).join(' ');
        this.show(words.slice(-CONFIG.captions.showWords).join(' '));
      };
      recognition.onerror = event => {
        const messages = { 'not-allowed': 'toast.captionsNoMicrophone', 'service-not-allowed': 'toast.captionsNoMicrophone', 'audio-capture': 'toast.captionsNoMicrophone',
          network: 'toast.captionsNoInternet', 'language-not-supported': 'toast.captionsLanguage' };
        if (messages[event.error]) { this.stop(); showToast(ui(messages[event.error])); }
      };
      // it stops by itself after a pause: start again, but give up when it keeps stopping at once
      let quickEnds = 0, startedAt = performance.now();
      recognition.onend = () => {
        if (!this.on) return;
        quickEnds = performance.now() - startedAt < 1500 ? quickEnds + 1 : 0;
        if (quickEnds >= CONFIG.captions.maxQuickRestarts) { this.stop(); showToast(ui('toast.captionsStopped')); return; }
        startedAt = performance.now();
        try { recognition.start(); } catch (e) { /* already started */ }
      };
      this.on = true;
      this.finalText = '';
      try { recognition.start(); } catch (e) { /* already started */ }
      settingsPanel.render();
    },
    stop() {
      this.on = false;
      if (this.recognition) {
        this.recognition.onend = null;
        try { this.recognition.stop(); } catch (e) { /* not running */ }
        this.recognition = null;
      }
      this.show('');
      if (settingsPanel.isOpen()) settingsPanel.render();
    },
    /** Shows the caption here and in the other window; it disappears after a moment of silence. */
    show(text) {
      this.display(text);
      sendToPeer('caption', { text });
    },
    /** Puts the text in the caption bar of this window (also called for a message from the other window). */
    display(text) {
      let bar = stage.querySelector('.live-captions');
      if (!bar) {
        bar = document.createElement('div');
        bar.className = 'live-captions';
        bar.setAttribute('aria-live', 'polite');
        stage.appendChild(bar);
      }
      bar.textContent = String(text || '');
      bar.classList.toggle('is-shown', !!text);
      clearTimeout(this.hideTimer);
      if (text) this.hideTimer = setTimeout(() => bar.classList.remove('is-shown'), CONFIG.captions.hideAfterMs);
    },
  };
