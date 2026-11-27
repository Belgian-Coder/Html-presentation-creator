  /* ===========================================================================
     8. NAVIGATION
     =========================================================================== */

  const brokenScenes = new Set();   // slides whose script failed when they came on screen (see runSafely)

  /** Transitions where both slides stay whole and move or open (css/04): one at a time; a quick Next fades instead. */
  const GLIDING_TRANSITIONS = ['push', 'cover', 'uncover', 'wipe', 'circle', 'split', 'cube'];
  /** A slide facing you on the cube (css/04 .stage[data-transition="cube"] .scene.is-active): where a leaving cube slide starts. */
  const CUBE_FACING = 'translateZ(-800px) rotateY(0deg) translateZ(800px)';

  /** Shows slide `index`. showEndState: the slide was reached with Back, show its end. */
  function goToSlide(index, showEndState) {
    index = clamp(index, 0, scenes.length - 1);
    if (index === state.currentIndex) return;
    agenda.followSlide(index);   // leaving a chapter opened from an agenda forgets the way back (section 7)
    sendToPeer('go', { slideIndex: index, showEndState: !!showEndState, agendaReturn: agenda.returnTo });
    pointerTools.endZoom();                                  // both windows do this themselves (no message)
    paceTracker.onSlideChange(state.currentIndex, index);   // book the time spent on the slide we leave
    presenterTimer.onSlideChange(index);
    clearSlideTimeouts();
    stage.dataset.direction = index > state.currentIndex ? 'forward' : 'backward';
    if (isBackupSlide(index) && !isBackupSlide(state.currentIndex) && state.currentIndex >= 0) state.returnIndex = state.currentIndex;
    const morphPlaces = runSafely('morph', () => slideMorph.capture(state.currentIndex >= 0 ? currentScene() : null), new Map());   // data-morph elements glide (section 7)
    // the new slide's transition (CSS section 4), before it starts; a push over a slide zoomed in on a click, or while the
    // last push still runs (quick Next): a fade instead (two pushes at once would leave a gap or overlap)
    let transition = scenes[index].dataset.transition || '';
    const interrupted = performance.now() < (state.pushBusyUntil || 0);   // a push or cover still moving: whatever comes next fades, and what moves stays where it is
    if (interrupted) {
      stage.querySelectorAll(':scope > .scene:is(.is-active, .is-leaving)').forEach(scene => {
        const shown = getComputedStyle(scene);
        const turned = stage.dataset.transition === 'cube';   // (a cube's slides keep the stage's depth once it fades: css/04)
        Object.assign(scene.style, { transform: (turned && shown.transform !== 'none' ? 'perspective(2600px) ' : '') + shown.transform, transformOrigin: turned ? '50% 50%' : '', backfaceVisibility: turned ? 'hidden' : '', clipPath: shown.clipPath, maskImage: shown.maskImage, transition: 'opacity var(--duration-fast) var(--ease-in), visibility 0s linear var(--duration-fast)' });
      });
      state.pushBusyUntil = 0;
      transition = 'fade';
    }
    if (GLIDING_TRANSITIONS.includes(transition) && stage.hasAttribute('data-step-zoomed')) transition = 'fade';
    if (GLIDING_TRANSITIONS.includes(transition)) state.pushBusyUntil = performance.now() + CONFIG.pushMs * ({ fast: .5, slow: 1.85 }[scenes[index].dataset.transitionSpeed] || 1);
    stage.dataset.transition = transition;
    if (['uncover', 'wipe', 'circle', 'split'].includes(transition)) void scenes[index].offsetWidth;   // (its clip first as it waits, so it can open gliding: css/04)
    stage.dataset.transitionSpeed = scenes[index].dataset.transitionSpeed || '';   // and its speed (fast, slow)
    if (state.currentIndex >= 0) leaveScene(currentScene());

    state.currentIndex = index;
    ink.render();   // the lines drawn on this slide earlier in the talk (section 9)
    state.step = 0;
    const scene = currentScene();
    cancelPendingReset(scene);
    scene.classList.remove(...SCENE_STATE_CLASSES);
    forceReflow(scene);                         // so its entrance animations play again
    scene.classList.add('is-active', 'is-visible');
    stage.dataset.slide = scene.dataset.name;    // used by the CSS (logo size)
    deck.dataset.slide = scene.dataset.name;     // used by the CSS (glow colour)
    updateChapterBar();
    slideCounter.textContent = slideCounterText(index);
    updateUrlHash(scene);
    if (showEndState) state.step = stepsOf(scene);
    enterScene(scene, showEndState);
    selfRunning.schedule();   // a slide that moves on by itself (below)
    runSafely('morph', () => slideMorph.play(scene, morphPlaces));
    updatePresenterView();
  }

  /** "4 / 16", or "Backup 1 / 2" on a backup slide. */
  function slideCounterText(index) {
    if (isBackupSlide(index)) return ui('counter.backup', { number: index - mainSlideCount + 1, total: scenes.length - mainSlideCount });
    return (index + 1) + ' / ' + mainSlideCount;
  }

  function enterScene(scene, showEndState) {
    animateCountUps(scene, showEndState);
    runSafely('confetti', () => celebrateWithSlide(scene, showEndState));   // 🎉 for what comes in with the slide (section 6)
    revealStepsBehaviour.showingEnd = !!showEndState;   // (its click items' numbers show their end too, section 6)
    if (showEndState && scene.hasAttribute('data-end-state')) scene.classList.add('is-finished', 'is-returning');
    const behaviour = behaviourOf(scene);
    if (behaviour.enter) {
      // a slide whose script failed to start skips its own clicks from now on, so Next simply moves on
      const result = runSafely(slideLabel(scene, 'enter'), () => { behaviour.enter(scene, showEndState); return 'ok'; }, 'failed');
      if (result === 'failed') brokenScenes.add(scene);
      showRevealSteps(scene, state.step);
    } else {
      showStepOf(scene, state.step);   // step 0, or the last step after Back
    }
    revealStepsBehaviour.showingEnd = false;
    runSafely('slide components', () => slideComponents.enter(scene));   // break timers, agenda marks (section 7)
    customCode.enter(scene);   // your own scripts (section 16b; they catch their own errors)
    if (state.step > 0 && currentScene() === scene) customCode.step(scene, state.step);   // reached with Back: at its last click
  }

  /** Shows step `step` of a slide: its own behaviour, plus any data-reveal-step elements on it. */
  function showStepOf(scene, step) {
    const behaviour = behaviourOf(scene);
    if (behaviour === revealStepsBehaviour) {
      showRevealSteps(scene, step);
      return;
    }
    if (behaviour.showStep) {   // its own code only sees its own steps
      runSafely(slideLabel(scene, 'step'), () => behaviour.showStep(scene, Math.min(step, ownStepsOf(scene))));
    }
    showRevealSteps(scene, step);
  }

  /** 'slide "flow" (enter)': names the slide in error reports. */
  function slideLabel(scene, what) { return 'slide "' + scene.dataset.name + '" (' + what + ')'; }

  /** The data-reveal-step elements of a step, and the components that follow steps (videos). */
  function showRevealSteps(scene, step) {
    revealStepsBehaviour.showStep(scene, step);
    slideComponents.step(scene, step);
    customCode.step(scene, step);
  }

  /** The slide fades out; once that is done it is reset for its next visit. */
  function leaveScene(scene) {
    if (stage.hasAttribute('data-step-zoomed')) {   // zoomed in on a click: it leaves as it is, not back to full size first (section 6)
      const shown = getComputedStyle(scene);
      Object.assign(scene.style, { scale: shown.scale, translate: shown.translate, transformOrigin: '50% 50%' });
    }
    const covered = ['cover', 'wipe'].includes(stage.dataset.transition), holed = ['circle', 'split'].includes(stage.dataset.transition);
    if (covered) { scene.style.clipPath = 'inset(0 0 0 0)'; void scene.offsetWidth; }   // Cover, Wipe: the old slide's clip starts whole, so it can give way gliding (css/04)
    if (holed) { scene.style.setProperty('--scene-hole', '0%'); void scene.offsetWidth; }   // Circle, Split: its hole starts closed
    const cubed = stage.dataset.transition === 'cube';   // Cube: it starts from the same three steps it turns with (from none it would drift off the cube's edge)
    if (cubed) { Object.assign(scene.style, { transition: 'none', transform: CUBE_FACING }); void scene.offsetWidth; }
    scene.classList.remove('is-active');
    scene.classList.add('is-leaving');
    if (covered) scene.style.removeProperty('clip-path');
    if (holed) scene.style.removeProperty('--scene-hole');
    if (cubed) { scene.style.removeProperty('transform'); scene.style.removeProperty('transition'); }
    runSafely('slide components', () => slideComponents.leave(scene));   // a video stops at once
    customCode.leave();   // its timers, listeners and added elements end (section 16b)
    state.resetTimers.set(scene, setTimeout(() => {
      scene.classList.remove(...SCENE_STATE_CLASSES);
      clearFocus(scene);   // Dim the rest on this click: nothing dimmed on the next visit (section 6)
      dropKeptZoom(scene);
      state.resetTimers.delete(scene);
      const behaviour = behaviourOf(scene);
      if (behaviour.afterLeave) runSafely(slideLabel(scene, 'leave'), () => behaviour.afterLeave(scene));
    }, CONFIG.sceneResetAfterLeaveMs * (stage.dataset.transitionSpeed === 'slow' ? CONFIG.slowTransitionFactor : 1)));   // (a slow transition: once its slower fade-out is done)
  }

  /** The zoom a slide kept while it left zoomed in on a click (leaveScene): gone once it is reset, or back on screen. */
  function dropKeptZoom(scene) {
    ['scale', 'translate', 'transform-origin', 'transform', 'clip-path', 'mask-image', 'backface-visibility', 'transition'].forEach(name => scene.style.removeProperty(name));   // (and the place a quick Next froze it at)
    if (!scene.getAttribute('style')) scene.removeAttribute('style');
  }
  function cancelPendingReset(scene) {
    dropKeptZoom(scene);   // (back before its reset: the stage's zoom decides again)
    if (!state.resetTimers.has(scene)) return;
    clearTimeout(state.resetTimers.get(scene));
    state.resetTimers.delete(scene);
  }

  /** Next: first the slide's own clicks and steps, then the next slide.
      The last slide of the talk and the last backup slide stay where they are. */
  function goNext() {
    const index = state.currentIndex;
    const next = nextSlideIndex(index);   // (-1: the end; skipped slides passed over)
    // a chapter opened from an agenda slide goes back to the agenda at its end (section 7)
    if (!advanceWithinScene(currentScene()) && !agenda.takeNext() && next >= 0) goToSlide(next);
    updatePresenterView();
  }

  /** Back: first the slide's steps, then the previous slide in its end state.
      On the first backup slide Back returns to the slide you came from. */
  function goBack() {
    // Back on the first slide of a chapter opened from an agenda goes back to the agenda (section 7)
    if (!stepBackWithinScene(currentScene()) && !agenda.takeBack()) {
      const index = state.currentIndex;
      const previous = index === mainSlideCount ? state.returnIndex : index > mainSlideCount ? index - 1 : previousSlideIndex(index);   // (skipped slides passed over)
      if (previous >= 0) goToSlide(previous, true);
    }
    updatePresenterView();
  }

  /** Returns true when the current slide used the Next click itself. */
  function advanceWithinScene(scene) {
    const behaviour = behaviourOf(scene);
    if (behaviour.next && !brokenScenes.has(scene) && runSafely(slideLabel(scene, 'next'), () => behaviour.next(scene), false)) { selfRunning.schedule(); return true; }   // (its own click: the wait starts again)
    if (state.step >= stepsOf(scene)) return false;
    state.step++;
    showCurrentStep(scene);
    return true;
  }

  function stepBackWithinScene(scene) {
    if (state.step <= 0) return false;
    state.step--;
    showCurrentStep(scene);
    return true;
  }

  /** Jumps to a step of the current slide (used by the product tabs). */
  function goToStep(step) {
    state.step = step;
    showCurrentStep(currentScene());
    updatePresenterView();
  }

  function showCurrentStep(scene) {
    showStepOf(scene, state.step);
    sendToPeer('step', { slideName: scene.dataset.name, step: state.step });
    selfRunning.schedule();
  }

  /* ---- Moves on by itself: a slide with data-advance="8" takes its next click (or goes to the next slide) by itself
     8 seconds after it came on, and again 8 seconds after every click; a click of yours in between starts the wait again.
     data-loop on #deck: after the last slide the talk starts again from the first (a self-running screen, e.g. at a stand).
     Only the window that leads does this (not the audience window, which follows it); it waits while the editor is open
     or the screen is black (B). ---- */
  const selfRunning = {
    timer: null,
    schedule() {
      clearTimeout(this.timer);
      this.timer = null;
      const scene = currentScene();
      const seconds = scene ? Number(scene.getAttribute('data-advance')) : 0;
      if (sync.isAudience || !(seconds > 0)) return;
      this.timer = setTimeout(() => this.fire(), clamp(seconds, 1, CONFIG.selfRunningMaxSeconds) * 1000);
    },
    fire() {
      this.timer = null;
      if (editorIsOpen() || deck.classList.contains('is-blank')) { this.schedule(); return; }   // (it waits, then tries again)
      if (typeof boothMode !== 'undefined' && boothMode.on) return;   // booth mode (section 16) leads with its own times: one of them only
      const scene = currentScene();
      const atTheEnd = state.currentIndex < mainSlideCount && nextSlideIndex(state.currentIndex) < 0 && state.step >= stepsOf(scene);
      if (atTheEnd && deck.hasAttribute('data-loop')) { goToSlide(firstSlideOfTalk()); updatePresenterView(); return; }
      goNext();   // (at the end without a loop it stays: nothing changes, so nothing is scheduled again)
    },
  };

  /** Plays the current slide again from the start (both windows do this together). */
  function restartCurrentSlide() {
    const index = state.currentIndex;
    if (currentScene()) runSafely('slide components', () => slideComponents.leave(currentScene()));   // a video starts from the beginning again
    state.currentIndex = -1;
    goToSlide(index);
  }

  /** The URL shows the slide name (#numbers), so a reload stays on the same slide. */
  function updateUrlHash(scene) {
    const hash = '#' + scene.dataset.name;
    if (location.hash === hash) return;
    try { history.replaceState(null, '', hash); } catch (e) { location.hash = hash; }
  }

  function slideIndexFromHash() {
    const name = location.hash.slice(1).split(/[?&]/)[0];
    const index = scenes.findIndex(scene => scene.dataset.name === name);
    return index < 0 ? firstSlideOfTalk() : index;
  }

