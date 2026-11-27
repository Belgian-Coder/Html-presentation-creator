  /* ===========================================================================
     10. TIME PLAN, TIMER AND STILL COPIES (always in the file)
     The time plan (seconds per slide, Settings), the presenter's timer and the
     pace, the slide numbers, still copies of a slide in its end state (the
     next-slide preview, the Slides drawer, print and PDF) and printing. The
     presenter view itself (10b-12) uses these; the plain presentation and the
     editor do too, so they stay in a copy without the presenter view.
     Calls into the presenter view go through updatePresenterView() and the
     other functions at the end: they do nothing in a copy without it.
     =========================================================================== */
  const presenter = {
    panel: null,              // the presenter view element while it is open
    refreshTimer: null,
  };

  /* ---- Timer: on slide 1 it waits for the first Next; can be paused and reset ---- */
  const presenterTimer = {
    startedAt: 0,
    accumulatedMs: 0,
    paused: false,
    initialized: false,
    waitingForFirstAdvance: false,

    init() {
      if (this.initialized) return;       // reopening the view keeps the running time
      this.startedAt = Date.now();
      this.accumulatedMs = 0;
      this.paused = state.currentIndex === firstSlideOfTalk();   // (the opening slide: the first one not skipped)
      this.waitingForFirstAdvance = state.currentIndex === firstSlideOfTalk();
      this.initialized = true;
      paceTracker.reset(state.currentIndex);
    },
    elapsedMs() { return this.accumulatedMs + (this.paused ? 0 : Date.now() - this.startedAt); },
    togglePause() {
      this.waitingForFirstAdvance = false;   // a manual start or pause wins over the wait for slide 2
      if (this.paused) {
        this.startedAt = Date.now();
        this.paused = false;
      } else {
        this.accumulatedMs += Date.now() - this.startedAt;
        this.paused = true;
      }
      this.render();
    },
    reset() {
      this.accumulatedMs = 0;
      this.startedAt = Date.now();
      paceTracker.reset(state.currentIndex);   // the time plan starts again from this slide
    },
    onSlideChange(index) {
      if (!this.waitingForFirstAdvance || index === firstSlideOfTalk() || isBackupSlide(index)) return;   // a look at a backup slide does not start the talk
      this.waitingForFirstAdvance = false;
      this.paused = false;
      this.startedAt = Date.now();
      paceTracker.reset(index);   // the opening slide is not timed, so the plan starts at this slide
      this.render();
    },
    /** Pause button text and timer colour. */
    render() {
      if (!presenter.panel) return;
      presenter.panel.querySelector('.presenter-pause').textContent = this.paused ? ui('presenter.resume') : ui('presenter.pause');
      presenter.panel.querySelector('.presenter-timer').classList.toggle('is-paused', this.paused);
    },
  };

  /* ---- Time plan: the estimated seconds per slide (data-estimate, or changed in the settings) ---- */
  const timePlan = {
    defaultSeconds: scenes.map(scene => parseInt(scene.dataset.estimate || '0', 10) || 0),
    seconds: [],

    /** Reads saved estimates; they are stored by slide name, so moving a slide keeps its time. */
    load() {
      const saved = storage.read(CONFIG.storageKeys.estimates) || {};
      this.seconds = scenes.map((scene, index) => {
        const value = saved[scene.dataset.name];
        return Number.isFinite(value) ? value : this.defaultSeconds[index];
      });
    },
    set(index, seconds) {
      const saved = storage.read(CONFIG.storageKeys.estimates) || {};
      saved[scenes[index].dataset.name] = seconds;
      storage.write(CONFIG.storageKeys.estimates, saved);
      this.load();
    },
    reset() {
      storage.write(CONFIG.storageKeys.estimates, null);
      this.load();
    },
    durationMs(index) { return this.seconds[index] * 1000; },
    /** Planned time from the start of the deck until slide `index` begins. */
    startMs(index) { return this.seconds.slice(0, index).reduce((sum, value, at) => sum + (scenes[at].hasAttribute('data-skip') ? 0 : value), 0) * 1000; },   // (a skipped slide is not part of the plan)
    totalMs() { return this.startMs(mainSlideCount); },   // backup slides are not part of the plan
  };

  /* ---- Pace tracker: compares the presenter timer with the time plan ----
     The plan counts from the slide where the timer (re)started. Going Back to
     show something again does not change the pace: it is measured against the
     furthest slide reached with Next. A jump (chapter click, End) only counts
     while you stay on that slide. */
  const paceTracker = {
    spentMs: [],          // time spent per slide while the timer ran
    enteredAtMs: 0,       // timer value when the current slide was entered
    startIndex: 0,        // slide where the timer started
    furthestIndex: 0,     // furthest slide reached with Next since then

    reset(atIndex) {
      this.spentMs = scenes.map(() => 0);
      this.enteredAtMs = presenterTimer.elapsedMs();
      this.startIndex = clamp(atIndex, 0, mainSlideCount - 1);   // opened on a backup slide: the plan starts at the last slide
      this.furthestIndex = this.startIndex;
    },
    /** Books the time spent on the slide we leave. */
    onSlideChange(previousIndex, nextIndex) {
      if (!presenterTimer.initialized || previousIndex < 0) return;
      const now = presenterTimer.elapsedMs();
      this.spentMs[previousIndex] += now - this.enteredAtMs;
      this.enteredAtMs = now;
      if (nextIndex === nextSlideIndex(previousIndex) && !isBackupSlide(nextIndex)) this.furthestIndex = Math.max(this.furthestIndex, nextIndex);
    },
    /** Planned time from the timer start to the end of the deck. */
    plannedTotalMs() { return timePlan.totalMs() - timePlan.startMs(this.startIndex); },
    spentOn(index) {
      const current = index === state.currentIndex ? presenterTimer.elapsedMs() - this.enteredAtMs : 0;
      return this.spentMs[index] + current;
    },
    /** Timer time at which the plan says slide `index` starts. */
    plannedStartMs(index) { return timePlan.startMs(index) - timePlan.startMs(this.startIndex); },
    /** How far behind (positive) or ahead (negative) of the plan we are, in ms. 0 while on the planned slide. */
    deviationMs() {
      const elapsed = presenterTimer.elapsedMs();
      // on a backup slide the plan goes on from the furthest slide of the talk
      const slide = isBackupSlide(state.currentIndex) ? this.furthestIndex : Math.max(state.currentIndex, this.furthestIndex);
      const plannedStart = this.plannedStartMs(slide);
      const plannedEnd = plannedStart + timePlan.durationMs(slide);
      if (elapsed > plannedEnd) return elapsed - plannedEnd;      // should already be on a later slide
      if (elapsed < plannedStart) return elapsed - plannedStart;  // reached this slide early
      return 0;
    },
    /** 'ahead', 'on-time', 'behind' or 'well-behind'. */
    status() {
      const deviation = this.deviationMs();
      if (deviation > CONFIG.pace.wellBehindMs) return 'well-behind';
      if (deviation > CONFIG.pace.onTimeMarginMs) return 'behind';
      if (deviation < -CONFIG.pace.onTimeMarginMs) return 'ahead';
      return 'on-time';
    },
    /** Where the plan says we should be now, from 0 (start of the deck) to 1 (end). */
    plannedPosition() {
      const total = timePlan.totalMs();
      return total ? clamp((timePlan.startMs(this.startIndex) + presenterTimer.elapsedMs()) / total, 0, 1) : 0;
    },
  };

  /** "07:42" */
  function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    return String(Math.floor(totalSeconds / 60)).padStart(2, '0') + ':' + String(totalSeconds % 60).padStart(2, '0');
  }

  /** Time of day in 24-hour notation, whatever the computer's locale: "14:05". */
  function formatClockTime(date) {
    return String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
  }

  /** Next clicks left before the next slide. */
  function clicksLeft() {
    const scene = currentScene();
    const behaviour = behaviourOf(scene);
    if (behaviour.clicksLeft) return runSafely(slideLabel(scene, 'clicks'), () => behaviour.clicksLeft(scene), 1) + Math.max(0, stepsOf(scene) - state.step);
    return Math.max(0, stepsOf(scene) - state.step) + 1;
  }

  /** The slide Next goes to after slide `index`, or -1 at the end of the talk or of the backup slides.
      A slide of the talk with data-skip (Skip this slide, editor) is passed over; it can still be opened (Slides drawer, chapter list). */
  function nextSlideIndex(index) {
    if (index === mainSlideCount - 1 || index >= scenes.length - 1) return -1;
    if (index >= mainSlideCount) return index + 1;   // the backup slides: one after another
    for (let next = index + 1; next < mainSlideCount; next++) if (!scenes[next].hasAttribute('data-skip')) return next;
    return -1;   // (only skipped slides after it: this is the end)
  }
  /** The first and the last slide of the talk that is not skipped (Home, End, a start again; 0 / the last when all are). */
  function firstSlideOfTalk() { return Math.max(0, nextSlideIndex(-1)); }
  function lastSlideOfTalk() { const last = previousSlideIndex(mainSlideCount); return last < 0 ? mainSlideCount - 1 : last; }
  /** The slide Back goes to before slide `index` of the talk (skipped ones passed over), or -1 at its start. */
  function previousSlideIndex(index) {
    for (let previous = Math.min(index, mainSlideCount) - 1; previous >= 0; previous--) if (!scenes[previous].hasAttribute('data-skip')) return previous;
    return -1;
  }

  /** "5" for slide 5, "B2" for the second backup slide. */
  function slideNumberText(index) {
    return isBackupSlide(index) ? ui('slides.backupNumber', { number: index - mainSlideCount + 1 }) : String(index + 1);
  }

  /** A still, inert copy of slide `index` (next-slide preview, handout and PDF). Put it inside a .still-slide box. */
  function makeStillCopy(index) {
    const copy = scenes[index].cloneNode(true);
    copy.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));   // ids must stay unique
    copy.querySelectorAll('.speaker-notes').forEach(element => element.remove());
    copy.querySelectorAll('.is-text-target').forEach(element => element.classList.remove('is-text-target'));   // the Texts drawer's outline
    copy.classList.remove('is-leaving', 'is-playing', 'is-finished', 'is-fast-forward', 'is-returning');
    clearFocus(copy);   // a still copy shows the end of everything, nothing dimmed (section 6)
    copy.classList.add('is-active');
    copy.querySelectorAll('.count-up').forEach(element => {   // the final number, also when it is still counting
      element.textContent = countUpText(element, parseFloat(element.dataset.to));
    });
    copy.inert = true;
    copy.setAttribute('aria-hidden', 'true');
    const behaviour = behaviourOf(scenes[index]);
    if (behaviour.preparePreview) runSafely(slideLabel(scenes[index], 'preview'), () => behaviour.preparePreview(copy));
    runSafely('still copy', () => slideComponents.prepareStill(copy));
    return copy;
  }

  /** The notes of a slide as HTML ('' when it has none). */
  function notesOf(scene) {
    const notes = scene.querySelector('.speaker-notes');
    return notes ? notes.innerHTML.trim() : '';
  }
  /* ---- Print: every slide as a still copy in its end state, optionally with its notes ----
     The browser's print window can also save as PDF ("Save as PDF" as the printer). */
  function printSlides(withNotes) {
    if (window.top !== window) {   // inside a web page (e.g. the published artifact) printing is usually blocked
      showToast(ui('toast.printNeedsFile'));
      return;
    }
    document.querySelectorAll('.print-pages, .print-page-size').forEach(old => old.remove());   // left over from an earlier print
    const widthMm = withNotes ? CONFIG.print.portraitWidthMm : CONFIG.print.landscapeWidthMm;
    const pixelsPerMm = 96 / 25.4;
    const pages = document.createElement('div');
    pages.className = 'print-pages';
    pages.style.setProperty('--print-width', widthMm + 'mm');
    pages.style.setProperty('--print-scale', widthMm * pixelsPerMm / CONFIG.stage.width);
    const logo = stage.querySelector('.logo');
    scenes.forEach((scene, index) => {
      const page = document.createElement('section');
      page.className = 'print-page';
      if (withNotes) page.innerHTML = '<p class="print-heading"><b>' + escapeHtml(slideNumberText(index)) + '</b>' + escapeHtml(titleOf(scene)) + '</p>';
      const slide = document.createElement('div');
      slide.className = 'print-slide still-slide';
      const printStage = document.createElement('div');
      printStage.className = 'print-stage';
      printStage.dataset.slide = scene.dataset.name;   // the logo is large on the first and last slide
      if (logo) printStage.appendChild(logo.cloneNode(true));
      const copy = makeStillCopy(index);
      if (scene.hasAttribute('data-end-state')) copy.classList.add('is-finished');
      printStage.appendChild(copy);
      slide.appendChild(printStage);
      page.appendChild(slide);
      if (withNotes) {
        const notes = document.createElement('div');
        notes.className = 'print-notes';
        notes.innerHTML = notesOf(scene) || '<p class="notes-empty">' + escapeHtml(ui('print.noNotes')) + '</p>';
        page.appendChild(notes);
      }
      pages.appendChild(page);
    });
    const pageStyle = document.createElement('style');
    pageStyle.className = 'print-page-size';
    pageStyle.textContent = '@page { size: A4 ' + (withNotes ? 'portrait' : 'landscape') + '; margin: 10mm; }';
    document.head.appendChild(pageStyle);
    document.body.appendChild(pages);
    root.classList.add('is-printing');
    const cleanUp = () => { pages.remove(); pageStyle.remove(); root.classList.remove('is-printing'); };
    window.addEventListener('afterprint', cleanUp, { once: true });   // the print window was closed
    settingsPanel.close();
    setTimeout(() => {   // a moment for the copies to lay out
      try {
        window.print();
      } catch (e) {
        cleanUp();
        showToast(ui('toast.printNotAllowed'));
      }
    }, 150);
  }

  /* ---- The presenter view (sections 10b-12, between the PRESENTER-ONLY marks): the rest of the file calls it through
     these, so a copy without it ("Export without presenter view", build.py --without presenter) works, just without it ---- */
  function updatePresenterView() { if (hasPresenterView()) presenterView.update(); }
  function openPresenterView() { if (hasPresenterView()) presenterView.open(); }
  function closePresenterView() { if (hasPresenterView()) presenterView.close(); }
  function applyPresenterTexts() { if (hasPresenterView()) presenterView.applyTexts(); }
  function updateChapterListTitles() { if (hasPresenterView()) presenterView.updateChapterTitles(); }
  function scalePreview() { if (hasPresenterView()) presenterView.scalePreview(); }
