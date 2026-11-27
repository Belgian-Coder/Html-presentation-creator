  /* ===========================================================================
     22. SCREEN AND WINDOW
     =========================================================================== */

  /* Keeps the screen awake (no dimming, screensaver or lock) while the deck is open. */
  let wakeLock = null;
  function keepScreenAwake() {
    try {
      if (!navigator.wakeLock || document.visibilityState !== 'visible' || (wakeLock && !wakeLock.released)) return;
      navigator.wakeLock.request('screen').then(lock => { wakeLock = lock; }).catch(() => {});
    } catch (e) { /* not supported */ }
  }

  /** Scales the 1600 x 900 stage to fit its container (the window, or the presenter's main area). */
  function fitStageToWindow() {
    const container = stage.parentElement;
    const width = container === deck ? window.innerWidth : container.clientWidth;
    const height = container === deck ? window.innerHeight : container.clientHeight;
    stage.style.setProperty('--stage-scale', Math.min(width / CONFIG.stage.width, height / CONFIG.stage.height));
    if (presenter.panel && presenter.panel.dataset.previewFor) scalePreview();
    if (hasPresenterView()) slidesDrawer.rescale();
  }

  /** True when this window fills the screen (full screen with F, or F11). */
  function isFullscreenWindow() {
    return !!document.fullscreenElement || window.innerHeight >= screen.height - 2;
  }

