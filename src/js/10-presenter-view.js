  /* ===========================================================================
     10b. PRESENTER VIEW (press P)
     This window becomes the presenter view and opens the audience window. The
     slide stage moves into the large left area; the side panel shows the
     timer, what the next click does, a preview of the next slide and the
     chapter list. Esc goes back to the normal view (the audience window
     keeps following).
     =========================================================================== */
  /** "≈ 40 s" below a minute, "≈ 1.5 min" above (rounded to half minutes). */
  function approximateDuration(ms) {
    const seconds = Math.abs(ms) / 1000;
    if (seconds < 60) return ui('duration.aboutSeconds', { seconds: Math.max(10, Math.round(seconds / 10) * 10) });
    const halfMinutes = Math.round(seconds / 30) / 2;
    return ui('duration.aboutMinutes', { minutes: halfMinutes });
  }

  /** The pace line (ahead/behind), the chapter times and the coloured chapter bar. */
  function updatePace(panel) {
    const status = paceTracker.status();
    const deviation = paceTracker.deviationMs();
    const planTotal = escapeHtml(ui('pace.planTotal', { time: formatMinutesSeconds(paceTracker.plannedTotalMs() / 1000) }));
    let text;
    // the timer starts on slide 2, so the plan shown here leaves out the opening slide
    if (presenterTimer.waitingForFirstAdvance) text = escapeHtml(ui('pace.waitingForFirstNext', { time: formatMinutesSeconds((timePlan.totalMs() - timePlan.startMs(firstSlideOfTalk() + 1)) / 1000) }));
    else if (status === 'on-time') text = '<b>' + escapeHtml(ui('pace.onSchedule')) + '</b> · ' + planTotal;
    else text = '<b>' + escapeHtml(ui(deviation > 0 ? 'pace.behind' : 'pace.ahead', { amount: approximateDuration(deviation) })) + '</b> · ' + planTotal;
    panel.querySelector('.presenter-pace').innerHTML = text;
    updateCountdown(panel);
    deck.dataset.pace = presenterTimer.waitingForFirstAdvance ? 'on-time' : status;

    const chapterRows = panel.querySelectorAll('.presenter-chapters button');
    const barButtons = chapterBarButtons();
    scenes.forEach((scene, index) => {
      const estimateMs = timePlan.durationMs(index);
      const spentMs = paceTracker.spentOn(index);
      const isPast = index !== state.currentIndex && spentMs > 0;   // a slide already shown (also after going Back)
      const isOverTime = !isBackupSlide(index) && spentMs > estimateMs + CONFIG.pace.slideMarginMs;   // backup slides have no plan
      const row = chapterRows[index];
      const time = row.querySelector('.chapter-time');
      time.textContent = formatMinutesSeconds((isPast ? spentMs : estimateMs) / 1000);
      time.classList.toggle('is-on-time', isPast && !isOverTime);
      time.classList.toggle('is-over-time', (isPast || index === state.currentIndex) && isOverTime);
      row.title = ui('chapters.planned', { time: formatMinutesSeconds(estimateMs / 1000) }) +
        (spentMs > 0 ? ' · ' + ui('chapters.took', { time: formatMinutesSeconds(spentMs / 1000) }) : '');
      if (index === state.currentIndex) row.style.setProperty('--slide-progress', estimateMs ? clamp(spentMs / estimateMs, 0, 1) : 1);
      const segment = barButtons[index];
      if (!segment) return;   // backup slides have no segment in the bottom bar
      segment.style.setProperty('--estimate-weight', Math.max(1, timePlan.seconds[index]));
      segment.classList.toggle('is-on-time', isPast && !isOverTime);
      segment.classList.toggle('is-over-time', isPast && isOverTime);
    });
    paceMarker.classList.toggle('is-shown', !presenterTimer.waitingForFirstAdvance);
    paceMarker.style.setProperty('--pace-position', paceTracker.plannedPosition());
  }

  /** Removes the pace colours when the presenter view closes. */
  function clearPace() {
    delete deck.dataset.pace;
    paceMarker.classList.remove('is-shown');
    chapterBarButtons().forEach(button => button.classList.remove('is-on-time', 'is-over-time'));
  }

  /** What the next click will do, e.g. "starts the car" or "goes to 4. The numbers". */
  function nextClickCue() {
    const scene = currentScene();
    const behaviour = behaviourOf(scene);
    const slideCue = behaviour.nextCue ? runSafely(slideLabel(scene, 'cue'), () => behaviour.nextCue(scene), null) : null;
    if (slideCue) return slideCue;
    if (state.step >= stepsOf(scene) && agenda.cue()) return agenda.cue();
    if (state.step < stepsOf(scene)) {
      const nextStep = state.step + 1;
      const usesOwnStep = behaviour.stepLabel && (behaviour === revealStepsBehaviour || nextStep <= ownStepsOf(scene));
      const what = runSafely(slideLabel(scene, 'step label'), () =>
        (usesOwnStep ? behaviour.stepLabel(nextStep, scene) : revealStepsBehaviour.stepLabel(nextStep, scene)), '');
      return ui(stepCueKey(scene, nextStep), { what });
    }
    const nextIndex = nextSlideIndex(state.currentIndex);
    return nextIndex < 0 ? '' : ui('cue.goesTo', { number: slideNumberText(nextIndex), title: titleOf(scenes[nextIndex]) });
  }

  /** The cue for a click step: "shows …", or what its click effect does ("hides …", "plays the video"). */
  function stepCueKey(scene, step) {
    const element = scene.querySelector('[data-reveal-step="' + step + '"]');
    if (!element && scene.querySelector('[data-play-step="' + step + '"]')) return scene.querySelector('audio[data-play-step="' + step + '"]') ? 'cue.playsSound' : 'cue.playsVideo';
    const effectKeys = { 'fade-out': 'cue.hides', leave: 'cue.hides', highlight: 'cue.highlights', strike: 'cue.strikes', underline: 'cue.underlines', shake: 'cue.shakes', circled: 'cue.circles', tick: 'cue.ticks', glow: 'cue.glows', pulse: 'cue.pulses', jump: 'cue.jumps' };
    return (element && effectKeys[element.getAttribute('data-reveal-effect')]) || 'cue.shows';
  }

  /** The small preview of slide `index`; -1 shows "End of the presentation" (or "Last backup slide"). */
  function renderNextSlidePreview(index) {
    const box = presenter.panel.querySelector('.presenter-preview');
    box.innerHTML = '';
    if (index < 0) {
      const text = isBackupSlide(state.currentIndex) ? ui('presenter.lastBackupSlide') : ui('presenter.endOfPresentation');
      box.innerHTML = '<div class="presenter-preview-end">' + escapeHtml(text) + '</div>';
      return;
    }
    const previewStage = document.createElement('div');
    previewStage.className = 'presenter-preview-stage';
    previewStage.appendChild(makeStillCopy(index));
    box.appendChild(previewStage);
    scalePreview();
  }

  /* ---- Speaker notes: <aside class="speaker-notes"> inside a slide ---- */

  const notesView = {
    /** Shows the notes of slide `index` (called when the slide changes). */
    show(index) {
      const box = presenter.panel.querySelector('.presenter-notes');
      box.innerHTML = notesOf(scenes[index]) || '<p class="notes-empty">' + escapeHtml(ui('notes.none')) + '</p>';
      box.scrollTop = 0;
      box.dataset.step = '';
    },
    /** Lights the lines with data-note-step equal to the current step, and keeps them in view. */
    highlightStep(step) {
      const box = presenter.panel.querySelector('.presenter-notes');
      if (box.dataset.step === String(step)) return;
      box.dataset.step = step;
      let first = null;
      box.querySelectorAll('[data-note-step]').forEach(line => {
        const isCurrent = parseInt(line.dataset.noteStep, 10) === step;
        line.classList.toggle('is-current-step', isCurrent);
        if (isCurrent && !first) first = line;
      });
      if (first && (first.offsetTop < box.scrollTop || first.offsetTop + first.offsetHeight > box.scrollTop + box.clientHeight)) {
        box.scrollTop = Math.max(0, first.offsetTop - 8);
      }
    },
    scale() {
      const saved = storage.read(CONFIG.storageKeys.notesScale);
      return Number.isFinite(saved) ? clamp(saved, CONFIG.notes.minScale, CONFIG.notes.maxScale) : 1;
    },
    /** A− / A+: smaller or bigger notes text, remembered in this browser. */
    changeSize(direction) {
      const scale = clamp(this.scale() + direction * CONFIG.notes.scaleStep, CONFIG.notes.minScale, CONFIG.notes.maxScale);
      storage.write(CONFIG.storageKeys.notesScale, Math.round(scale * 100) / 100);
      this.applySize();
    },
    applySize() {
      if (!presenter.panel) return;
      presenter.panel.style.setProperty('--notes-scale', this.scale());
      const box = presenter.panel.querySelector('.presenter-notes');
      box.dataset.step = '';                 // bigger or smaller text: bring the current line into view again
      this.highlightStep(state.step);
    },
  };

  /* ---- Countdown next to the timer: planned time left ----
     The total of the time plan (from the slide where the timer started) minus the
     timer. Below zero it counts up in rose: the talk runs over. */
  function plannedTimeLeftMs() {
    if (presenterTimer.waitingForFirstAdvance) return timePlan.totalMs() - timePlan.startMs(firstSlideOfTalk() + 1);   // the timer starts on slide 2
    return paceTracker.plannedTotalMs() - presenterTimer.elapsedMs();
  }

  function updateCountdown(panel) {
    const leftMs = plannedTimeLeftMs();
    const countdown = panel.querySelector('.presenter-countdown');
    const isOverTime = leftMs <= -1000;   // the first second past zero still reads "00:00 left"
    countdown.innerHTML = isOverTime
      ? '+' + formatDuration(-leftMs) + '<small>' + escapeHtml(ui('countdown.over')) + '</small>'
      : formatDuration(Math.max(0, Math.ceil(leftMs / 1000) * 1000)) + '<small>' + escapeHtml(ui('countdown.left')) + '</small>';
    countdown.classList.toggle('is-over-time', isOverTime);
  }


  function scaleNextSlidePreview() {
    if (!presenter.panel) return;
    const box = presenter.panel.querySelector('.presenter-preview');
    const previewStage = box.querySelector('.presenter-preview-stage');
    if (previewStage) previewStage.style.transform = 'scale(' + box.clientWidth / CONFIG.stage.width + ')';
  }

  /** Refreshes the side panel; safe to call often (does nothing without presenter view).
      An error here is reported once and never stops the slides (see runSafely). */
  function renderPresenterView() {
    if (presenter.panel) runSafely('presenter view', refreshPresenterPanel);
  }

  function refreshPresenterPanel() {
    const panel = presenter.panel;
    const index = state.currentIndex;
    const clicks = clicksLeft();
    // what the next click does, and the number of clicks left before the slide changes
    const isLastClick = nextSlideIndex(index) < 0 && clicks <= 1;
    const clicksBadge = panel.querySelector('.presenter-clicks');
    clicksBadge.hidden = isLastClick;
    clicksBadge.classList.toggle('is-many', clicks > 1);
    clicksBadge.querySelector('.presenter-clicks-count').textContent = clicks;
    clicksBadge.title = clicks === 1 ? ui('presenter.clicksOne') : ui('presenter.clicksMany', { clicks });
    const lastText = isBackupSlide(index) ? ui('presenter.lastBackupSlide') : ui('presenter.lastSlide');
    const selfRunningSeconds = Number(scenes[index] && scenes[index].getAttribute('data-advance'));   // a slide that moves on by itself (section 8)
    panel.querySelector('.presenter-cue').innerHTML = '<b>' + escapeHtml(isLastClick ? lastText : (nextClickCue() || ui('cue.goesOn'))) + '</b>' +
      (selfRunningSeconds > 0 ? ' <span class="presenter-cue-self">' + escapeHtml(ui('cue.selfRunning', { seconds: selfRunningSeconds })) + '</span>' : '');
    if (panel.dataset.previewFor !== String(index)) {   // the slide changed (or a text did: previewFor is cleared)
      panel.dataset.previewFor = index;
      renderNextSlidePreview(agenda.nextIndex() >= 0 ? agenda.nextIndex() : nextSlideIndex(index));   // the end of an agenda chapter shows the agenda
      notesView.show(index);
      scrollChapterListTo(index);
    }
    notesView.highlightStep(state.step);
    panel.querySelector('.presenter-spotlight').classList.toggle('is-on', pointerTools.spotlight);
    panel.querySelector('.presenter-zoom').classList.toggle('is-on', pointerTools.zoom);
    chapterListButtons().forEach((button, buttonIndex) => {
      button.classList.toggle('is-current', buttonIndex === index);
      button.classList.toggle('is-past', buttonIndex < index && !isBackupSlide(buttonIndex));
    });
    updatePace(panel);
    slidesDrawer.markCurrent();
    textEditor.refreshIfNeeded();
    if (settingsPanel.isOpen()) settingsPanel.renderRealized();
    checkRow.render(panel);
  }

  function chapterListButtons() {
    return presenter.panel ? Array.from(presenter.panel.querySelectorAll('.presenter-chapters button')) : [];
  }

  /** Keeps the current chapter in the middle of the list (without scrolling the page). */
  function scrollChapterListTo(index) {
    const list = presenter.panel.querySelector('.presenter-chapters');
    const button = chapterListButtons()[index];
    if (button) list.scrollTop = Math.max(0, button.offsetTop - list.clientHeight / 2 + button.offsetHeight / 2);
  }

  /** URL of the audience window: this file with ?audience=1 (and ?motion=1 when forced). */
  function audienceUrl() {
    const url = new URL(location.href);
    url.searchParams.set('audience', '1');
    if (isMotionForced()) url.searchParams.set('motion', '1');
    else url.searchParams.delete('motion');
    if (SHOW_TEMPLATES) url.searchParams.set('templates', '1');   // same slides in both windows
    url.searchParams.set('t', Date.now());   // always a fresh load, so it says hello
    url.hash = location.hash;
    return url.href;
  }

  /** Opens (or re-syncs) the audience window, then shows the presenter view here. */
  function showPresenterView() {
    if (sync.isAudience) return;
    if (!/^(https?|file):$/.test(location.protocol)) {
      showToast(ui('toast.presenterNeedsFile'));
      return;
    }
    const audience = peerWindow();
    if (audience) {
      try { audience.focus(); } catch (e) { /* not allowed */ }
      audienceConnection.onOpened();   // the check row waits for its next answer
      audienceConnection.lastPingAt = 0;
      restartCurrentSlide();           // already open: bring it forward and resync
    } else {
      sync.helloReceived = false;
      sync.audienceWindow = window.open(audienceUrl(), 'presentation-audience', 'popup,width=1280,height=720');
      audienceConnection.onOpened();
      if (!sync.audienceWindow) {
        showToast(ui('toast.popupBlocked'));
        return;
      }
      setTimeout(() => {
        if (!sync.helloReceived) showToast(ui('toast.audienceDidNotConnect'));
      }, CONFIG.presenter.connectTimeoutMs);
    }
    if (presenter.panel) { updatePresenterView(); return; }
    buildPresenterPanel();
  }

  function buildPresenterPanel() {
    deck.classList.add('is-presenter');
    document.title = DEFAULT_TITLE + ' · ' + ui('presenter.windowTitle');
    const panel = presenter.panel = document.createElement('div');
    panel.className = 'presenter-view';
    // the texts come from the interface texts (data-ui, see section 4)
    panel.innerHTML =
      '<div class="presenter-main"></div>' +
      '<aside class="presenter-side">' +
        '<div class="presenter-top"><span class="presenter-timer" data-ui-title="presenter.timerTooltip">00:00</span>' +
          '<span class="presenter-countdown" data-ui-title="presenter.countdownTooltip"></span>' +
          '<span class="presenter-clock" data-ui-title="presenter.clockTooltip"></span></div>' +
        '<div class="presenter-pace"></div>' +
        '<div class="presenter-tools">' +
          '<button class="presenter-pause" data-ui="presenter.pause"></button>' +
          '<button class="presenter-reset" data-ui="presenter.reset"></button>' +
          '<button class="presenter-spotlight" data-ui="presenter.spotlightButton" data-ui-title="presenter.spotlightTooltip"></button>' +
          '<button class="presenter-zoom" data-ui="presenter.zoomButton" data-ui-title="presenter.zoomTooltip"></button>' +
          '<button class="presenter-chapters-toggle" data-ui="presenter.chaptersButton" data-ui-title="presenter.chaptersTooltip"></button>' +
          (window.getScreenDetails ? '<button class="presenter-move" data-ui="presenter.projectorButton" data-ui-title="presenter.projectorTooltip"></button>' : '') +
          '<button class="presenter-settings" data-ui="presenter.settingsButton" data-ui-title="presenter.settingsTooltip"></button>' +
          '<button class="presenter-exit" data-ui="presenter.exitButton"></button>' +
        '</div>' +
        '<div class="presenter-next-row">' +
          '<div class="presenter-next-text">' +
            '<div class="presenter-label"><span data-ui="presenter.nextLabel"></span>' +
              '<span class="presenter-clicks"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 2l14 10.5-6.2 1.1 3.7 7.4-2.7 1.3-3.7-7.5L5 19z"/></svg>' +
              '<span class="presenter-clicks-count"></span></span></div>' +
            '<div class="presenter-cue"></div>' +
          '</div>' +
          '<div class="presenter-preview still-slide"></div>' +
        '</div>' +
        '<div class="presenter-label presenter-notes-label"><span data-ui="presenter.notesLabel"></span>' +
          '<button class="notes-smaller" data-ui-title="presenter.notesSmaller" data-ui-aria-label="presenter.notesSmaller">A−</button>' +
          '<button class="notes-bigger" data-ui-title="presenter.notesBigger" data-ui-aria-label="presenter.notesBigger">A+</button></div>' +
        '<div class="presenter-notes"></div>' +
        '<div class="presenter-checks" aria-live="polite"></div>' +
      '</aside>' +
      // right edge: Chapters (upper half) and Keys (lower half); left edge: Slides and Texts
      '<nav class="presenter-drawer chapters-drawer" data-ui-aria-label="chapters.title">' +
        '<div class="presenter-drawer-tab" aria-hidden="true" data-ui="chapters.title"></div>' +
        '<div class="presenter-label"><span data-ui="chapters.title"></span> <small data-ui="chapters.hint"></small></div>' +
        '<div class="presenter-chapters"></div>' +
      '</nav>' +
      '<aside class="presenter-drawer keys-drawer" data-ui-aria-label="keys.title">' +
        '<div class="presenter-drawer-tab" aria-hidden="true" data-ui="keys.title"></div>' +
        '<div class="presenter-label"><span data-ui="keys.title"></span> <small data-ui="keys.hint"></small></div>' +
        '<div class="presenter-keys"></div>' +
        '<div class="presenter-last-key"><span data-ui="keys.lastKey"></span> <kbd>–</kbd></div>' +
      '</aside>' +
      '<nav class="presenter-drawer is-left slides-drawer" data-ui-aria-label="slides.title">' +
        '<div class="presenter-drawer-tab" aria-hidden="true" data-ui="slides.title"></div>' +
        '<div class="presenter-label"><span data-ui="slides.title"></span> <small data-ui="slides.hint"></small></div>' +
        '<div class="slide-grid"></div>' +
      '</nav>' +
      '<aside class="presenter-drawer is-left texts-drawer" data-ui-aria-label="texts.title">' +
        '<div class="presenter-drawer-tab" aria-hidden="true" data-ui="texts.title"></div>' +
        '<div class="texts-editor"></div>' +
      '</aside>';
    deck.insertBefore(panel, deck.querySelector('.controls'));
    panel.querySelector('.presenter-main').appendChild(stage);
    applyPresenterTexts();

    const chapterList = panel.querySelector('.presenter-chapters');
    scenes.forEach((scene, index) => {
      if (index === mainSlideCount) {   // backup slides get their own heading
        const heading = document.createElement('div');
        heading.className = 'presenter-chapters-heading';
        heading.dataset.ui = 'slides.backupHeading';
        heading.textContent = ui('slides.backupHeading');
        chapterList.appendChild(heading);
      }
      const button = document.createElement('button');
      button.innerHTML = '<b>' + escapeHtml(slideNumberText(index)) + '</b><span class="chapter-title"></span><span class="chapter-time"></span>';
      button.classList.toggle('is-backup', isBackupSlide(index));
      button.addEventListener('click', () => {
        button.blur();
        chapterDrawer.close();   // a chosen chapter closes the drawer
        goToSlide(index);
      });
      chapterList.appendChild(button);
    });
    updateChapterListTitles();
    textEditor.build(panel.querySelector('.texts-editor'));

    presenterTimer.init();
    presenterTimer.render();
    const onToolClick = (selector, action) => panel.querySelector(selector).addEventListener('click', event => {
      event.currentTarget.blur();
      action();
      updatePresenterView();
    });
    onToolClick('.presenter-pause', () => presenterTimer.togglePause());
    onToolClick('.presenter-reset', () => {
      const hasRealizedTimes = presenterTimer.initialized && scenes.some((scene, index) => paceTracker.spentOn(index) >= 1000);
      if (hasRealizedTimes && !askToConfirm(ui('confirm.resetTimer'))) return;
      presenterTimer.reset();
    });
    onToolClick('.presenter-chapters-toggle', () => chapterDrawer.toggle());
    onToolClick('.presenter-spotlight', () => pointerTools.toggleSpotlight());
    onToolClick('.presenter-zoom', () => pointerTools.toggleZoom());
    onToolClick('.notes-smaller', () => notesView.changeSize(-1));
    onToolClick('.notes-bigger', () => notesView.changeSize(1));
    notesView.applySize();
    onToolClick('.presenter-settings', () => settingsPanel.open());
    onToolClick('.presenter-exit', closePresenterView);
    if (window.getScreenDetails) onToolClick('.presenter-move', moveAudienceToProjector);
    panel.querySelector('.presenter-timer').addEventListener('click', () => panel.querySelector('.presenter-pause').click());
    checkRow.setUp(panel);
    imageSwaps.setUpDropping(panel);
    slidesDrawer.setUp(panel);

    presenter.refreshTimer = setInterval(() => {
      panel.querySelector('.presenter-timer').textContent = formatDuration(presenterTimer.elapsedMs());
      panel.querySelector('.presenter-clock').textContent = formatClockTime(new Date());
      audienceConnection.ping();
      updatePresenterView();
    }, CONFIG.presenter.refreshMs);
    fitStageToWindow();
    updatePresenterView();
  }

  /** Every interface text of the presenter view (again after a text was changed in the Texts drawer). */
  function translatePresenterView() {
    const panel = presenter.panel;
    if (!panel) return;
    applyInterfaceTexts(panel);
    panel.querySelector('.presenter-main').dataset.blankLabel = ui('presenter.blankScreen');
    panel.querySelector('.presenter-keys').innerHTML = keyListHtml();
    presenterTimer.render();
    document.title = DEFAULT_TITLE + ' · ' + ui('presenter.windowTitle');
    panel.dataset.previewFor = '';   // the preview and notes are drawn again on the next refresh
  }

  /** The chapter titles in the chapter list (again after a title was changed in the Texts drawer). */
  function retitleChapterList() {
    chapterListButtons().forEach((button, index) => {
      button.querySelector('.chapter-title').textContent = titleOf(scenes[index]);
    });
  }

  function hidePresenterView() {
    if (!presenter.panel) return;
    if (pointerTools.isOn()) pointerTools.turnOff();   // spotlight and zoom end with the presenter view
    clearInterval(presenter.refreshTimer);
    presenter.refreshTimer = null;
    deck.insertBefore(stage, presenter.panel);
    presenter.panel.remove();
    presenter.panel = null;
    deck.classList.remove('is-presenter');
    clearPace();
    document.title = DEFAULT_TITLE;
    fitStageToWindow();
  }

  /** Asks the audience window to move itself to the other screen (Chrome/Edge window management). */
  function moveAudienceToProjector() {
    window.getScreenDetails().then(details => {
      const otherScreen = details.screens.filter(screen => screen !== details.currentScreen)[0];
      if (!otherScreen) { showToast(ui('toast.oneScreenOnly')); return; }
      if (!peerWindow()) { showToast(ui('toast.audienceNotOpen')); return; }
      sendToPeer('move', { left: otherScreen.availLeft, top: otherScreen.availTop, width: otherScreen.availWidth, height: otherScreen.availHeight });
      showToast(ui('toast.sentToProjector'));
    }).catch(() => showToast(ui('toast.moveNotAllowed')));
  }

  /** What the rest of the file calls (through updatePresenterView() and the others in section 10). */
  const presenterView = {
    update: renderPresenterView,
    open: showPresenterView,
    close: hidePresenterView,
    applyTexts: translatePresenterView,
    updateChapterTitles: retitleChapterList,
    scalePreview: scaleNextSlidePreview,
  };
