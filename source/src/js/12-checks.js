  /* ===========================================================================
     12. CHECKS (bottom of the presenter view)
     A row of small checks: is the audience window there and on the right
     slide, is it full screen, is the projector connected, does the screen
     stay awake, the battery, the fonts, script errors. A dot per check:
     teal fine, amber worth a look, rose a problem. The checks only inform:
     they never stop or block anything. Hover over a check for advice.
     =========================================================================== */

  /* ---- Audience window: the presenter asks "are you there?" every second ----
     The audience window answers with its slide (message "pong", section 5). No answer for
     a few seconds means it froze or was closed; answers from another slide mean it is out
     of step. Reconnect (or P) opens it again or brings it back to this slide. */
  const audienceConnection = {
    openedAt: 0,         // when the window was opened (or first asked), performance.now()
    lastAnswerAt: 0,     // when it last answered
    lastPingAt: 0,
    answer: null,        // its last answer: { slideIndex, step, isFullscreen }
    otherSlideCount: 0,  // answers in a row from another slide than this window's

    onOpened() {
      this.openedAt = performance.now();
      this.lastAnswerAt = 0;
      this.answer = null;
      this.otherSlideCount = 0;
    },
    onHello() {
      this.lastAnswerAt = performance.now();
      this.otherSlideCount = 0;
    },
    /** Called every presenter refresh; asks at most once per CONFIG.checks.pingEveryMs. */
    ping() {
      const now = performance.now();
      if (!peerWindow() || now - this.lastPingAt < CONFIG.checks.pingEveryMs) return;
      if (!this.openedAt) this.openedAt = now;   // a window that was already open before this view
      this.lastPingAt = now;
      sendToPeer('ping');
    },
    onAnswer(payload) {
      this.lastAnswerAt = performance.now();
      this.answer = payload;
      this.otherSlideCount = payload.slideIndex === state.currentIndex ? 0 : this.otherSlideCount + 1;
    },
    /** 'closed', 'connecting', 'not-responding', 'other-slide' or 'connected'. */
    status() {
      if (!peerWindow()) return 'closed';
      const now = performance.now();
      if (!this.lastAnswerAt) return now - this.openedAt < CONFIG.presenter.connectTimeoutMs ? 'connecting' : 'not-responding';
      if (now - this.lastAnswerAt > CONFIG.checks.notRespondingAfterMs) return 'not-responding';
      if (this.otherSlideCount >= CONFIG.checks.outOfSyncAfterAnswers) return 'other-slide';
      return 'connected';
    },
  };

  /** Loads the audience window again (it froze, or shows another page). It says hello when it is back. */
  function reloadAudienceWindow() {
    const audience = peerWindow();
    if (!audience) { openPresenterView(); return; }
    sync.helloReceived = false;
    audienceConnection.onOpened();
    try {
      audience.location.href = audienceUrl();
    } catch (e) {   // not allowed: close it and open a new one
      try { audience.close(); } catch (closeError) { /* already gone */ }
      sync.audienceWindow = null;
      openPresenterView();
    }
  }

  /** Brings the audience window to this window's slide and step, without restarting this window's slide. */
  function resyncAudienceWindow() {
    const scene = currentScene();
    const isAtEnd = state.step > 0 && state.step >= stepsOf(scene);
    sendToPeer('go', { slideIndex: state.currentIndex, showEndState: isAtEnd || scene.classList.contains('is-finished') });
    if (state.step > 0 && !isAtEnd) sendToPeer('step', { slideName: scene.dataset.name, step: state.step, quiet: true });   // (quiet: no confetti, nobody clicked)
  }

  /* ---- The check row ---- */
  const checkRow = {
    battery: null,          // the browser's battery object, where the browser has one
    lastHtml: '',

    setUp(panel) {
      this.lastHtml = '';
      const row = panel.querySelector('.presenter-checks');
      row.addEventListener('click', event => {
        const button = event.target.closest('button[data-action="reconnect"]');
        if (!button) return;
        button.blur();
        audienceConnection.otherSlideCount = 0;
        const status = audienceConnection.status();
        if (status === 'not-responding') reloadAudienceWindow();
        else if (status === 'other-slide') resyncAudienceWindow();
        else openPresenterView();   // opens the audience window again
      });
      if (navigator.getBattery && !this.battery) {
        navigator.getBattery().then(battery => { this.battery = battery; }).catch(() => {});
      }
    },

    /** The checks as { level: 'ok' | 'warn' | 'bad', text, tip, action? }. */
    items() {
      const items = [];
      const connection = audienceConnection.status();
      const audienceItems = {
        closed: { level: 'bad', text: ui('checks.audienceClosed'), tip: ui('checks.audienceClosedTip'), action: ui('checks.open') },
        connecting: { level: 'warn', text: ui('checks.audienceConnecting'), tip: ui('checks.audienceConnectingTip') },
        'not-responding': { level: 'bad', text: ui('checks.audienceNotResponding'), tip: ui('checks.audienceNotRespondingTip'), action: ui('checks.reconnect') },
        'other-slide': { level: 'bad', text: ui('checks.audienceOtherSlide'), tip: ui('checks.audienceOtherSlideTip'), action: ui('checks.resync') },
        connected: { level: 'ok', text: ui('checks.audienceConnected'), tip: ui('checks.audienceConnectedTip') },
      };
      items.push(audienceItems[connection]);
      if (connection === 'connected' && audienceConnection.answer) {
        items.push(audienceConnection.answer.isFullscreen
          ? { level: 'ok', text: ui('checks.audienceFullscreen'), tip: ui('checks.audienceFullscreenTip') }
          : { level: 'warn', text: ui('checks.audienceNotFullscreen'), tip: ui('checks.audienceNotFullscreenTip') });
      }
      if (typeof window.screen.isExtended === 'boolean') {   // Chrome and Edge know whether a second screen is connected
        items.push(window.screen.isExtended
          ? { level: 'ok', text: ui('checks.twoScreens'), tip: ui('checks.twoScreensTip') }
          : { level: 'warn', text: ui('checks.oneScreen'), tip: ui('checks.oneScreenTip') });
      }
      if (navigator.wakeLock) {
        items.push(wakeLock && !wakeLock.released
          ? { level: 'ok', text: ui('checks.awake'), tip: ui('checks.awakeTip') }
          : { level: 'warn', text: ui('checks.mightSleep'), tip: ui('checks.mightSleepTip') });
      }
      if (this.battery) {
        const percent = Math.round(this.battery.level * 100);
        if (this.battery.charging) items.push({ level: 'ok', text: ui('checks.batteryCharging', { percent }), tip: ui('checks.batteryChargingTip') });
        else items.push({ level: percent < CONFIG.checks.lowBatteryPercent ? 'bad' : 'warn', text: ui('checks.battery', { percent }), tip: ui('checks.batteryTip') });
      }
      const fontFaces = document.fonts ? Array.from(document.fonts) : [];
      if (fontFaces.some(face => face.status === 'error')) items.push({ level: 'bad', text: ui('checks.fontsMissing'), tip: ui('checks.fontsMissingTip') });
      else if (document.fonts && document.fonts.status === 'loading') items.push({ level: 'warn', text: ui('checks.fontsLoading'), tip: ui('checks.fontsLoadingTip') });
      else items.push({ level: 'ok', text: ui('checks.fonts'), tip: ui('checks.fontsTip') });
      if (motion.reduced) items.push({ level: 'warn', text: ui('checks.animationsOff'), tip: ui('checks.animationsOffTip') });
      if (scriptErrors.count) {
        items.push({ level: 'bad', text: ui('checks.scriptErrors', { count: scriptErrors.count }), tip: ui('checks.scriptErrorsTip', { last: scriptErrors.last }) });
      }
      return items;
    },

    /** Draws the row; only touches the page when something changed (so a tooltip stays put). */
    render(panel) {
      const html = this.items().map(item =>
        '<span class="check is-' + item.level + '" title="' + escapeHtml(item.tip) + '"><i aria-hidden="true"></i>' + escapeHtml(item.text) +
        (item.action ? ' <button data-action="reconnect">' + escapeHtml(item.action) + '</button>' : '') + '</span>').join('');
      if (html === this.lastHtml) return;
      this.lastHtml = html;
      panel.querySelector('.presenter-checks').innerHTML = html;
    },
  };
