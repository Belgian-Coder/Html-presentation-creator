  /* ===========================================================================
     21. AUDIENCE WINDOW (opened by the presenter view with ?audience=1)
     Shows a "full screen" hint until full screen, a key press or 20 s.
     =========================================================================== */
  let fullscreenHint = null;

  function hideFullscreenHint() {
    if (fullscreenHint && fullscreenHint.parentNode) fullscreenHint.remove();
  }

  function showFullscreenHint() {
    if (!fullscreenHint || fullscreenHint.parentNode || document.fullscreenElement) return;
    deck.appendChild(fullscreenHint);
    setTimeout(hideFullscreenHint, CONFIG.audience.fullscreenHintMs);
  }

  function moveAudienceWindow(target) {
    try {
      window.moveTo(target.left, target.top);
      window.resizeTo(target.width, target.height);
    } catch (e) { /* not allowed */ }
    showFullscreenHint();
  }

  function setUpAudienceWindow() {
    document.title = DEFAULT_TITLE + ' · ' + ui('audience.windowTitle');
    deck.classList.add('is-audience');
    fullscreenHint = document.createElement('button');
    fullscreenHint.className = 'fullscreen-hint';
    fullscreenHint.dataset.ui = 'audience.fullscreenHint';   // the text comes from the interface texts
    fullscreenHint.textContent = ui('audience.fullscreenHint');
    fullscreenHint.addEventListener('click', () => { hideFullscreenHint(); toggleFullscreen(); });
    deck.appendChild(fullscreenHint);
    setTimeout(hideFullscreenHint, CONFIG.audience.fullscreenHintMs);
    document.addEventListener('fullscreenchange', () => { if (document.fullscreenElement) hideFullscreenHint(); });
    document.addEventListener('keydown', hideFullscreenHint);
    window.addEventListener('resize', () => { if (window.innerHeight >= screen.height - 2) hideFullscreenHint(); });   // F11 full screen
    setTimeout(() => sendToPeer('hello'), CONFIG.audience.helloDelayMs);
  }

