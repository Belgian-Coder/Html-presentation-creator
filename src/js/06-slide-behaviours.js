  /* ===========================================================================
     6. SLIDE BEHAVIOURS
     Slides that do more than CSS can do get a behaviour object. Every method
     is optional; the navigation calls them:
       init()                      once, at start-up
       enter(scene, showEndState)  the slide comes on screen (showEndState: entered with Back).
                                   Without enter(), the navigation calls showStep() with step 0
                                   (or the last step after Back).
       next(scene)                 Next was pressed; return true when the slide used it
       showStep(scene, step)       show step n of a slide with data-steps
       stepLabel(step)             what step n shows (for the presenter view)
       afterLeave(scene)           the slide has faded out
       clicksLeft(scene)           Next clicks left on this slide (presenter view)
       nextCue(scene)              what the next click does (presenter view), or null
       onPeerMessage(type, scene)  a slide-specific message from the other window
       preparePreview(copy)        fix up the still copy used as next-slide preview
       onTextChange()              a text on the slide was changed in the Texts drawer
     Everything the navigation calls runs through runSafely(): an error in a
     behaviour is reported, and Next and Back keep working. A behaviour whose
     slide is missing (deleted in the editor) returns an empty behaviour {}.
     =========================================================================== */

  /* ---- 07-road (data-name timeline): the car drives from the start to the goal -----------
     CSS does the animation; this code only adds the classes:
     is-playing (drive), is-fast-forward (rest at 6x), is-finished (end state). */
  const timelineSlide = (() => {
    let driveStartedAt = 0;

    const isPlaying = scene => scene.classList.contains('is-playing');
    const isFinished = scene => scene.classList.contains('is-finished');
    const isFastForward = scene => scene.classList.contains('is-fast-forward');
    const canFastForward = scene => !isFastForward(scene) && performance.now() - driveStartedAt > CONFIG.timeline.ignoreNextMs;

    function startDrive(scene) {
      scene.classList.add('is-playing');
      driveStartedAt = performance.now();
      if (motion.reduced) slideTimeout(() => scene.classList.add('is-finished'), 100);   // no animation: done at once
    }

    /** Starts the drive now (instead of waiting for the automatic start). */
    function startDriveNow(scene) {
      clearSlideTimeouts();
      startDrive(scene);
      slideTimeout(() => scene.classList.add('is-finished'), CONFIG.timeline.driveDoneMs);
    }

    /** Plays the rest of all animations on this slide faster, instead of cutting to the end. */
    function fastForward(scene) {
      const rate = CONFIG.timeline.fastForwardRate;
      scene.classList.add('is-fast-forward');
      let longestRemainingMs = 0;
      scene.getAnimations({ subtree: true }).forEach(animation => {
        try {
          const timing = animation.effect.getComputedTiming();
          const remainingMs = timing.endTime - (animation.currentTime || 0);
          if (isFinite(remainingMs) && remainingMs > longestRemainingMs) longestRemainingMs = remainingMs;
          if (animation.updatePlaybackRate) animation.updatePlaybackRate(rate);
          else animation.playbackRate = rate;
        } catch (e) { /* animation already gone */ }
      });
      clearSlideTimeouts();
      slideTimeout(() => scene.classList.add('is-finished'), longestRemainingMs / rate + 80);
    }

    return {
      enter(scene, showEndState) {
        if (showEndState) {
          scene.classList.add('is-playing', 'is-finished');
          return;
        }
        slideTimeout(() => startDrive(scene), CONFIG.timeline.autoStartMs);
        slideTimeout(() => scene.classList.add('is-finished'), CONFIG.timeline.autoStartMs + CONFIG.timeline.driveDoneMs);
      },
      // 1st Next starts the car, Next during the drive speeds it up, then Next leaves
      next(scene) {
        if (!isPlaying(scene)) {
          startDriveNow(scene);
          sendToPeer('timeline-start');
          return true;
        }
        if (!isFinished(scene)) {
          if (canFastForward(scene)) {    // a press in the first 1.5 s of the drive is ignored
            fastForward(scene);
            sendToPeer('timeline-fast-forward');
          }
          return true;
        }
        return false;
      },
      clicksLeft(scene) {
        if (!isPlaying(scene)) return 3;
        if (!isFinished(scene)) return 2;
        return 1;
      },
      nextCue(scene) {
        if (!isPlaying(scene)) return ui('cue.startsCar');
        if (!isFinished(scene)) return canFastForward(scene) ? ui('cue.speedsUp') : ui('cue.ignoredForAMoment');
        return null;
      },
      onPeerMessage(type, scene) {
        if (type === 'timeline-start' && !isPlaying(scene)) startDriveNow(scene);
        if (type === 'timeline-fast-forward' && !isFinished(scene) && !isFastForward(scene)) fastForward(scene);
      },
    };
  })();

  /* ---- 12-spectrum (data-name mindset): one mode per Next ------------------------------------
     The amber knob moves to the mode of each step and the text below changes.
     The last step tours several modes and settles on Evidence-driven.
     The texts of the steps are in the slide's HTML (<ol class="mode-texts" hidden>),
     so they can be changed like any other slide text. */
  const mindsetSlide = (() => {
    const spectrum = byId('spectrum');
    if (!spectrum) return {};   // the slide was deleted (e.g. in the editor): no behaviour, no error
    const knob = spectrum.querySelector('.knob');
    const labels = spectrum.querySelectorAll('span');
    const description = byId('modeDescription');
    const stepItems = Array.from(spectrum.closest('.scene').querySelectorAll('.mode-texts li'));

    /** Step n from the HTML: position = the knob's place (0 Manual ... 3 Vibe coding),
        label = what the presenter view calls the step, tour = the knob tours first. */
    function stepAt(stepIndex) {
      const item = stepItems[clamp(stepIndex, 0, stepItems.length - 1)];
      return {
        label: item.dataset.label,
        position: parseInt(item.dataset.position, 10) || 0,
        text: item.textContent.trim(),
        tour: item.hasAttribute('data-tour'),
      };
    }
    let tourTimers = [];

    /** Dark text on the label under the knob; -1 lights none. */
    function lightLabel(position) {
      labels.forEach((label, index) => label.classList.toggle('is-lit', index === position));
    }

    function placeKnob(position) { knob.style.transform = 'translateX(' + position * 100 + '%)'; }

    function stopTour() {
      tourTimers.forEach(clearTimeout);
      tourTimers = [];
      knob.getAnimations().forEach(animation => animation.cancel());
      spectrum.classList.remove('is-touring');
    }

    /** The knob visits each tour stop; it eases out of each stop and the label lights when it arrives. */
    function playTour(finalPosition) {
      const { tourStops: stops, tourMoveMs: moveMs, tourHoldMs: holdMs } = CONFIG.mindset;
      const totalMs = (stops.length - 1) * moveMs + (stops.length - 2) * holdMs;
      const keyframes = [];
      let time = 0;
      spectrum.classList.add('is-touring');
      stops.forEach((position, index) => {
        const transform = 'translateX(' + position * 100 + '%)';
        const isFirstStop = index === 0;
        const isLastStop = index === stops.length - 1;
        if (!isFirstStop) {                      // arrive here
          time += moveMs;
          keyframes.push({ transform, offset: time / totalMs, easing: 'linear' });
          const arriveAt = time;
          tourTimers.push(setTimeout(() => lightLabel(position), arriveAt));
        }
        if (!isLastStop) {                       // wait here, then leave with an eased start
          if (!isFirstStop) time += holdMs;
          keyframes.push({ transform, offset: time / totalMs, easing: 'cubic-bezier(.5,0,.2,1)' });
          const leaveAt = time;
          tourTimers.push(setTimeout(() => lightLabel(-1), leaveAt));   // the label it leaves goes back to normal
        }
      });
      keyframes[0].offset = 0;
      placeKnob(finalPosition);
      knob.animate(keyframes, { duration: totalMs });
      tourTimers.push(setTimeout(() => spectrum.classList.remove('is-touring'), totalMs));
    }

    /** Shows a step. quiet: no animation (used when the slide is entered). */
    function renderStep(stepIndex, quiet) {
      const step = stepAt(stepIndex);
      stopTour();
      if (step.tour && !quiet && !motion.reduced) {
        playTour(step.position);
      } else {
        lightLabel(step.position);
        placeKnob(step.position);
      }
      description.textContent = step.text;
      if (!quiet && !motion.reduced) {
        description.animate([{ opacity: 0, transform: 'translateY(22px)' }, { opacity: 1, transform: 'none' }],
          { duration: 500, easing: 'cubic-bezier(.2,.75,.2,1)' });
      }
    }

    return {
      init() { renderStep(0, true); },   // so the presenter preview of this slide is complete
      enter(scene, showEndState) { renderStep(showEndState ? stepItems.length - 1 : 0, true); },
      showStep(scene, stepIndex) { renderStep(stepIndex, false); },
      stepLabel(stepIndex) { return stepAt(stepIndex).label; },
      onTextChange() {   // never interrupts the knob's tour
        if (currentScene() && currentScene().dataset.name === 'mindset' && !spectrum.classList.contains('is-touring')) renderStep(state.step, true);
      },
    };
  })();

  /* ---- 15-swimlanes (data-name flow): a work item travels through the swimlanes ----------------
     An amber dot moves at one steady speed from step to step. Each step pops in
     as the dot arrives, each connector is drawn as the dot travels it, and the
     dot loops twice through the harness (Implement <-> Validate) before the
     developer's final check. */
  const flowSlide = (() => {
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const swimlanes = byId('swimlanes');
    if (!swimlanes) return {};   // the slide was deleted
    const linksSvg = byId('flowLinks');
    let runId = 0;                 // a newer run stops an older one
    let animations = [];           // all animations of the current run
    let finishCallbacks = [];      // run when the flow is finished early
    let isRunning = false;

    const arrowMarker = id => `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="13" markerHeight="13" orient="auto"><path d="M0 1 L9 5 L0 9z"/></marker>`;

    function getSteps() { return Array.from(swimlanes.querySelectorAll('.flow-step')); }

    /** Position of an element inside the swimlanes, in px. */
    function boxOf(element) {
      return {
        left: element.offsetLeft,
        right: element.offsetLeft + element.offsetWidth,
        top: element.offsetTop,
        bottom: element.offsetTop + element.offsetHeight,
        centerX: element.offsetLeft + element.offsetWidth / 2,
        centerY: element.offsetTop + element.offsetHeight / 2,
      };
    }

    /** Connector from one step to the next. Same lane: straight into its left edge.
        Other lane: across, then down (or up) into the top (or bottom) of the next step.
        Returns the SVG path and the point where it enters the next step. */
    function connectorBetween(fromStep, toStep) {
      const from = boxOf(fromStep), to = boxOf(toStep);
      const x1 = from.right, y1 = from.centerY, radius = CONFIG.flow.cornerRadiusPx;
      if (Math.abs(to.centerY - y1) < 1) {
        return { path: 'M' + x1 + ' ' + y1 + ' H' + to.left, entry: { x: to.left, y: to.centerY } };
      }
      const direction = to.centerY > y1 ? 1 : -1;
      const endY = direction > 0 ? to.top : to.bottom;
      return {
        path: 'M' + x1 + ' ' + y1 + ' H' + (to.centerX - radius) + ' Q' + to.centerX + ' ' + y1 + ' ' + to.centerX + ' ' + (y1 + direction * radius) + ' V' + endY,
        entry: { x: to.centerX, y: endY },
      };
    }

    /** The dashed curve under the harness steps, from Validate back to Implement. */
    function harnessLoopPath(validate, implement) {
      const dip = CONFIG.flow.harnessLoopDipPx;
      return 'M' + validate.centerX + ' ' + validate.bottom + ' C' + validate.centerX + ' ' + (validate.bottom + dip) + ' ' +
        implement.centerX + ' ' + (implement.bottom + dip) + ' ' + implement.centerX + ' ' + implement.bottom;
    }

    /** Ends the current run at once: everything in its final state. */
    function finish() {
      runId++;
      isRunning = false;
      animations.forEach(animation => { try { animation.finish(); } catch (e) { /* cancelled */ } });
      finishCallbacks.forEach(callback => callback());
      const dot = linksSvg.querySelector('.flow-dot-group');
      if (dot) dot.style.opacity = 0;
    }

    function play(showEndState) {
      const run = ++runId;
      animations = [];
      finishCallbacks = [];
      isRunning = true;
      const { firstStepMs, popMs, dotSpeedPxPerMs: speed, implementStepIndex, validateStepIndex } = CONFIG.flow;
      const steps = getSteps();
      const checkBadge = swimlanes.querySelector('.check-badge');
      steps.concat([checkBadge]).forEach(element => element.getAnimations().forEach(animation => animation.cancel()));
      linksSvg.innerHTML = '<defs>' + arrowMarker('arrow') + arrowMarker('arrowTeal') + '</defs>';

      function addPath(d, className, hidden) {
        const path = document.createElementNS(SVG_NS, 'path');
        path.setAttribute('d', d);
        if (className) path.setAttribute('class', className);
        if (hidden) path.style.opacity = 0;   // the dot follows it, but it is not drawn (it runs behind a step)
        linksSvg.appendChild(path);
        return path;
      }
      function track(element, keyframes, options) {
        const animation = element.animate(keyframes, options);
        animations.push(animation);
        return animation;
      }
      function popIn(element, at) {
        track(element, [{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'scale(1.06)', offset: .7 }, { opacity: 1, transform: 'none' }],
          { duration: motion.reduced ? 1 : popMs, delay: motion.reduced ? 0 : at, fill: 'both', easing: 'ease-out' });
      }
      function pulse(element, at) {
        if (motion.reduced) return;
        const teal = alpha => colorWithAlpha('--color-teal', alpha);
        track(element, [{ boxShadow: `0 0 0 0 ${teal(0)}` }, { boxShadow: `0 0 0 5px ${teal(.7)}`, offset: .35 }, { boxShadow: `0 0 0 0 ${teal(0)}` }],
          { duration: 600, delay: at, easing: 'ease-out' });
      }

      // the dot's route: a list of path segments, each with its start time and duration
      const segments = [];
      let clock = firstStepMs;
      function followPath(path) {
        const length = path.getTotalLength(), duration = length / speed;
        segments.push({ path, length, startsAt: clock, duration });
        clock += duration;
        return duration;
      }
      // a visible connector: drawn while the dot travels it, arrowhead added when it is complete
      function drawConnector(path, markerId) {
        const length = path.getTotalLength();
        path.style.strokeDasharray = length + ' ' + length;
        const drawing = track(path, [{ strokeDashoffset: length }, { strokeDashoffset: 0 }],
          { duration: motion.reduced ? 1 : length / speed, delay: motion.reduced ? 0 : clock, fill: 'both', easing: 'linear' });
        const addArrowhead = () => path.setAttribute('marker-end', 'url(#' + markerId + ')');
        drawing.onfinish = addArrowhead;
        finishCallbacks.push(addArrowhead);
        followPath(path);
      }

      popIn(steps[0], firstStepMs - popMs / 2);
      const validate = boxOf(steps[validateStepIndex]);
      const implement = boxOf(steps[implementStepIndex]);
      const entryPoints = [];   // where the connector into step n ends
      steps.forEach((step, index) => {
        const box = boxOf(step);
        if (index > 0) popIn(step, clock - 120);   // pops just as the dot reaches it
        if (index === steps.length - 1) return;
        if (index === validateStepIndex) {
          // the harness checks its own work twice: down under Validate, back to Implement,
          // through it, and on to Validate again
          const loop = addPath(harnessLoopPath(validate, implement), 'harness-loop');
          loop.style.strokeDasharray = '6 8';
          track(loop, [{ opacity: 0 }, { opacity: .9 }], { duration: motion.reduced ? 1 : 300, delay: motion.reduced ? 0 : clock, fill: 'both' });
          finishCallbacks.push(() => loop.setAttribute('marker-end', 'url(#arrowTeal)'));
          const downIntoLoop = addPath('M' + box.left + ' ' + box.centerY + ' H' + validate.centerX + ' V' + validate.bottom, '', true);
          const upThroughImplement = addPath('M' + implement.centerX + ' ' + implement.bottom + ' V' + implement.centerY + ' H' + implement.right, '', true);
          const acrossToValidate = addPath('M' + implement.right + ' ' + implement.centerY + ' H' + validate.left, '', true);
          const downAgain = addPath('M' + validate.left + ' ' + validate.centerY + ' H' + validate.centerX + ' V' + validate.bottom, '', true);
          followPath(downIntoLoop);
          for (let round = 0; round < 2; round++) {
            followPath(loop);
            pulse(steps[implementStepIndex], clock - 200);
            followPath(upThroughImplement);
            followPath(acrossToValidate);
            pulse(steps[validateStepIndex], clock);
            if (round === 0) followPath(downAgain);
          }
          loop.setAttribute('marker-end', '');
          track(loop, [{ opacity: .9 }, { opacity: .9 }], { duration: 1, delay: motion.reduced ? 0 : clock, fill: 'forwards' })
            .onfinish = () => loop.setAttribute('marker-end', 'url(#arrowTeal)');
          followPath(addPath('M' + validate.left + ' ' + validate.centerY + ' H' + validate.right, '', true));
        } else {
          const entry = entryPoints[index] || { x: box.left, y: box.centerY };
          // hidden: the dot passes behind the step
          followPath(addPath('M' + entry.x + ' ' + entry.y + ' L' + box.centerX + ' ' + box.centerY + ' L' + box.right + ' ' + box.centerY, '', true));
        }
        const connector = connectorBetween(step, steps[index + 1]);
        entryPoints[index + 1] = connector.entry;
        drawConnector(addPath(connector.path), 'arrow');
      });
      const endTime = clock;
      track(checkBadge, [{ opacity: 0, transform: 'scale(2.2) rotate(-20deg)' }, { opacity: 1, transform: 'none' }],
        { duration: motion.reduced ? 1 : 500, delay: motion.reduced ? 0 : endTime + popMs, fill: 'both', easing: 'cubic-bezier(.3,1.5,.5,1)' });

      // the dot lives in a group so its halo keeps its own transparency
      const dotGroup = document.createElementNS(SVG_NS, 'g');
      const halo = document.createElementNS(SVG_NS, 'circle');
      const dot = document.createElementNS(SVG_NS, 'circle');
      dotGroup.setAttribute('class', 'flow-dot-group');
      halo.setAttribute('class', 'flow-dot-halo');
      halo.setAttribute('r', 16);
      dot.setAttribute('class', 'flow-dot');
      dot.setAttribute('r', 8);
      dotGroup.appendChild(halo);
      dotGroup.appendChild(dot);
      linksSvg.appendChild(dotGroup);
      dotGroup.style.opacity = 0;
      if (motion.reduced || showEndState) { finish(); return; }

      let firstFrameTime = null;
      function moveDot(now) {
        if (run !== runId || !currentScene() || currentScene().dataset.name !== 'flow') return;
        if (firstFrameTime === null) firstFrameTime = now;
        const elapsed = now - firstFrameTime;
        let segment = segments[0];
        for (let i = segments.length - 1; i >= 0; i--) {
          if (elapsed >= segments[i].startsAt) { segment = segments[i]; break; }
        }
        const progress = clamp((elapsed - segment.startsAt) / segment.duration, 0, 1);
        const point = segment.path.getPointAtLength(progress * segment.length);
        dotGroup.setAttribute('transform', 'translate(' + point.x + ' ' + point.y + ')');
        if (elapsed < segments[0].startsAt) dotGroup.style.opacity = 0;
        else if (elapsed > endTime) dotGroup.style.opacity = Math.max(0, 1 - (elapsed - endTime) / 400);   // fades out at the end
        else dotGroup.style.opacity = 1;
        if (elapsed < endTime + 500) requestAnimationFrame(moveDot);
        else isRunning = false;
      }
      requestAnimationFrame(moveDot);
    }

    /** The presenter preview is a still copy: draw all connectors at once. */
    function drawStaticConnectors(svg) {
      if (svg.querySelector('path')) return;
      const steps = getSteps();
      let html = '<defs>' + arrowMarker('previewArrow') + '</defs>';
      for (let i = 0; i < steps.length - 1; i++) {
        html += '<path d="' + connectorBetween(steps[i], steps[i + 1]).path + '" marker-end="url(#previewArrow)"/>';
      }
      const loop = harnessLoopPath(boxOf(steps[CONFIG.flow.validateStepIndex]), boxOf(steps[CONFIG.flow.implementStepIndex]));
      html += '<path class="harness-loop" d="' + loop + '"/>';
      svg.innerHTML = html;
    }

    return {
      enter(scene, showEndState) { play(showEndState); },
      next() {
        if (!isRunning) return false;
        finish();                   // Next while the dot moves: show the end
        sendToPeer('flow-finish');
        return true;
      },
      clicksLeft() { return isRunning ? 2 : 1; },
      nextCue() { return isRunning ? ui('cue.finishesFlow') : null; },
      onPeerMessage(type) { if (type === 'flow-finish' && isRunning) finish(); },
      preparePreview(copy) { drawStaticConnectors(copy.querySelector('.flow-links')); },
    };
  })();

  /* ---- 25-typing-title (data-name docs): "write themselves" types itself out ----------------------
     The words come from its aria-label (data-edit-attr="aria-label"), which the Texts drawer changes. */
  const docsSlide = (() => {
    const typed = byId('typedText');
    if (!typed) return {};   // the slide was deleted
    let fullText = typed.getAttribute('aria-label');

    function showFullText() {
      fullText = typed.getAttribute('aria-label');   // a text changed in the Texts drawer may have replaced it
      typed.textContent = fullText;
    }

    function typeOut() {
      fullText = typed.getAttribute('aria-label');
      if (motion.reduced) { showFullText(); return; }
      typed.innerHTML = '<span class="typing-caret"></span>';
      const caret = typed.firstChild;
      let typedCount = 0;
      function addCharacter() {
        typed.insertBefore(document.createTextNode(fullText[typedCount]), caret);
        typedCount++;
        if (typedCount < fullText.length) slideTimeout(addCharacter, CONFIG.typing.perCharacterMs);
        else slideTimeout(() => caret.remove(), CONFIG.typing.caretVisibleAfterMs);
      }
      slideTimeout(addCharacter, CONFIG.typing.startDelayMs);
    }

    return {
      enter(scene, showEndState) {
        if (showEndState) showFullText();
        else typeOut();
      },
      afterLeave() { fullText = typed.getAttribute('aria-label'); showFullText(); },
      preparePreview(copy) {   // a still copy never shows half-typed text
        const copyOfTyped = copy.querySelector('h2 .highlight[aria-label]');
        if (copyOfTyped) copyOfTyped.textContent = copyOfTyped.getAttribute('aria-label');
      },
      onTextChange() {   // the slide is not typing right now: show the new words at once
        if (!typed.querySelector('.typing-caret')) { fullText = typed.getAttribute('aria-label'); showFullText(); }
      },
    };
  })();

  /* ---- 08-product-tour (data-name product): its screenshots (one per tab), switched by Next/Back or a tab click -- */
  const productSlide = (() => {
    const gallery = byId('gallery');
    if (!gallery) return {};   // the slide was deleted
    const tabs = gallery.querySelectorAll('.screen-tabs button');
    const screenshots = gallery.querySelectorAll('.screenshot img');

    function showScreenshot(index) {
      tabs.forEach((tab, tabIndex) => {
        tab.classList.remove('is-selected');
        forceReflow(tab);                       // restarts the underline animation
        tab.classList.toggle('is-selected', tabIndex === index);
        tab.setAttribute('aria-selected', tabIndex === index ? 'true' : 'false');
      });
      // restart the slow zoom; a screenshot that stays selected jumps back to scale 1 first (no reverse zoom)
      const chosen = screenshots[index];
      if (chosen.classList.contains('is-selected')) {
        chosen.style.transition = 'none';
        chosen.classList.remove('is-selected');
        forceReflow(gallery);
        chosen.style.transition = '';
      }
      screenshots.forEach(image => image.classList.remove('is-selected'));
      forceReflow(gallery);
      screenshots.forEach((image, imageIndex) => image.classList.toggle('is-selected', imageIndex === index));
    }

    tabs.forEach(tab => {
      tab.addEventListener('click', event => {
        event.stopPropagation();
        tab.blur();
        goToStep(+tab.dataset.step);
      });
    });

    return {
      enter(scene, showEndState) { showScreenshot(showEndState ? ownStepsOf(scene) : 0); },
      showStep(scene, step) { showScreenshot(step); },
      stepLabel(step) { return tabs[step].querySelector('b').textContent; },
    };
  })();

  /* ---- 26-result-and-screens (data-name reuse): centre the clock ring on the visible ink of the "1" ----
     A font box has empty space around the digit, so the ring is placed using the
     measured shape of the "1" instead. */
  const reuseSlide = (() => {
    function alignClockRing() {
      const digit = document.querySelector('.one-digit');
      if (!digit) return;   // the slide was deleted
      const ring = digit.querySelector('.clock-ring');
      const baselineMark = digit.querySelector('.baseline-mark');   // zero-size mark that sits on the baseline
      const style = getComputedStyle(digit);
      const context = document.createElement('canvas').getContext('2d');
      context.font = style.fontWeight + ' ' + style.fontSize + ' ' + style.fontFamily;
      const ink = context.measureText('1');
      const baseline = baselineMark.offsetTop;
      const centerX = (ink.actualBoundingBoxRight - ink.actualBoundingBoxLeft) / 2;
      const centerY = baseline - (ink.actualBoundingBoxAscent - ink.actualBoundingBoxDescent) / 2;
      const diameter = Math.max(ink.actualBoundingBoxAscent + ink.actualBoundingBoxDescent, ink.actualBoundingBoxRight + ink.actualBoundingBoxLeft) * 1.24;
      ring.style.left = centerX + 'px';
      ring.style.top = centerY + 'px';
      ring.style.width = ring.style.height = diameter + 'px';
      // room for the ring on both sides, so it never touches the label edge or the "d"
      digit.style.marginLeft = Math.max(0, diameter / 2 - centerX) + 4 + 'px';
      digit.style.marginRight = Math.max(0, diameter / 2 - (digit.offsetWidth - centerX)) + 14 + 'px';
    }

    return {
      init() {
        const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
        fontsReady.then(() => runSafely('slide "reuse" (clock ring)', alignClockRing));   // measure with the real font
      },
      onTextChange() { alignClockRing(); },   // the "1" may have changed
    };
  })();

  // data-name of a slide -> its behaviour
  const slideBehaviours = {
    timeline: timelineSlide,
    mindset: mindsetSlide,
    flow: flowSlide,
    docs: docsSlide,
    product: productSlide,
    reuse: reuseSlide,
  };

  /* ---- Generic: elements with data-reveal-step="1", "2", ... appear one per Next click ----
     Used by any slide that has such elements and no behaviour of its own. */
  const revealStepsBehaviour = {
    lastStep: new WeakMap(),   // per slide: the step shown last (confetti, below)
    showStep(scene, step) {
      const changed = new Set();
      // confetti only for one click forward (not for a jump: Resync, a step message that skips several, Back)
      const oneForward = step === (this.lastStep.get(scene) ?? 0) + 1 && !this.quiet;
      this.lastStep.set(scene, step);
      const newlyShown = new Set();   // the click items this step brings on (their 🎉, below)
      scene.querySelectorAll('[data-reveal-step]').forEach(element => {
        const was = element.classList.contains('is-revealed'), now = revealStepOf(element) <= step;
        element.classList.toggle('is-revealed', now);
        if (was !== now) changed.add(element);
        if (now && !was) newlyShown.add(element);
        // its count-ups: count on the click, back to their start on Back (section 5)
        // (coming back to the slide: its end, not a count)
        if (was !== now && !element.matches(SHOWN_BEFORE_CLICK) && (element.matches('.count-up') || element.querySelector('.count-up'))) runSafely('count-up', () => (now ? animateCountUps(element, !!this.showingEnd, true) : animateCountUps(element, false)));
      });
      // 🎉 on its click (not when it is reached with Back, a Resync or a jump)
      if (oneForward && !this.showingEnd) runSafely('confetti', () => celebrateOnStep(scene, newlyShown));
      focusOnStep(scene, step, changed);
      zoomOnStep(scene, step);
    },
    stepLabel(step, scene) {
      const element = scene.querySelector('[data-reveal-step="' + step + '"]');
      // the text pieces with a space between them ("Step one What happens here", not "Step oneWhat ...")
      const pieces = [];
      if (element && element.closest('[data-split]') && element.getAttribute('aria-label')) pieces.push(element.getAttribute('aria-label'));   // text by word or letter: as written
      else if (element) {
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) if (walker.currentNode.textContent.trim()) pieces.push(walker.currentNode.textContent.trim());
      }
      const text = pieces.length ? pieces.join(' ') : ui('cue.stepNumber', { step });
      return text.length > 40 ? text.slice(0, 39) + '…' : text;
    },
  };

  /** Dim the rest on this click (data-focus on a click item): while its click is the newest one, everything else on the
      slide dims (.is-dimmed on the other branches from the item up to the slide; the CSS dims them only while the slide
      has .has-focus, so they brighten again smoothly on the next click; the marks go once that is done). Click items not
      shown yet are never marked: their own click effect (a blur, a rise) stays as it is. */
  /** 🎉 Confetti (data-confetti on a click item): a burst of little pieces in the theme's colours from its middle, falling
      and fading in about 1.6 s. They live in a layer on the stage beside the slide (never in the slide itself, so the editor
      never saves them); none with reduced motion. */
  /** What flies (data-confetti="stars" | "hearts" | "emoji"; empty: paper confetti in the theme's colours). */
  const CONFETTI_GLYPHS = { stars: ['★', '✦', '✧', '★'], hearts: ['❤', '♥', '❤'], emoji: ['🎉', '🎈', '✨', '🥳', '⭐', '🎊'] };
  /** 🎉 on a click (presenting, and ▶ Play in the editor): every celebrating element this click brings on screen: a click
      item that appears now, or an element inside one (a click item inside another one comes on when the last of them does). */
  function celebrateOnStep(scene, newlyShown) {
    if (!newlyShown.size) return;
    scene.querySelectorAll('[data-confetti]').forEach(element => {
      const opener = clickItemsAround(element).find(item => newlyShown.has(item));
      if (opener) burstConfetti(element, opener);
    });
  }
  /** The click items an element appears with: itself (if it is one), then each one around it, nearest first. */
  function clickItemsAround(element) {
    const items = [];
    for (let item = element.closest('[data-reveal-step]'); item; item = item.parentElement && item.parentElement.closest('[data-reveal-step]')) items.push(item);
    return items;
  }
  /** Whether it is on screen as far as its clicks go: its own click has come, and each click item around it shows (one
      that disappears on its click, Fades away or Disappears, no longer shows once that click has come). */
  function shownByItsClicks(element) {
    return clickItemsAround(element).every(item => {
      if (item === element) return item.classList.contains('is-revealed');
      if (item.matches('[data-reveal-effect="leave"], [data-reveal-effect="fade-out"]')) return !item.classList.contains('is-revealed');
      return item.classList.contains('is-revealed') || item.matches(SHOWN_BEFORE_CLICK);
    });
  }
  function burstConfetti(element, opener = element) {
    // measured once it is in its place: after its click effect has moved it in, or after Zoom in on this click has glided there
    // (opener: the click item that brings it on, itself or one it sits in)
    const wait = opener.hasAttribute('data-zoom-in') ? CONFIG.stepZoomMs : CONFIG.confetti.settleMs;
    setTimeout(() => runSafely('confetti', () => { if (shownByItsClicks(element)) burstConfettiNow(element); }), wait);
  }
  /** 🎉 for elements that come in with the slide (data-confetti, no click of their own): once each has risen in, at the
      slide's pace (its place in the order, the time between items, the wait before the first). Not when the slide is
      reached with Back (its end is shown at once), nor in the editor. */
  function celebrateWithSlide(scene, showEndState) {
    if (showEndState || motion.reduced) return;
    scene.querySelectorAll('.reveal[data-confetti]:not([data-reveal-step]):not([data-reveal-step] *)').forEach(element => {   // (only what rises in)
      const cssMs = name => { const value = getComputedStyle(element).getPropertyValue(name).trim(); return /ms$/.test(value) ? parseFloat(value) : /s$/.test(value) ? parseFloat(value) * 1000 : NaN; };
      const stagger = cssMs('--reveal-stagger'), enter = cssMs('--scene-enter-delay');
      const wait = revealOrderOf(element) * (Number.isFinite(stagger) ? stagger : 130) + (Number.isFinite(enter) ? enter : 300) + CONFIG.confetti.withSlideMs;
      slideTimeout(() => { if (scene.classList.contains('is-active') && scene.classList.contains('is-visible')) burstConfettiNow(element); }, wait);   // (cleared when the slide changes: no burst from an earlier visit)
    });
  }
  function burstConfettiNow(element) {
    const scene = element.closest('.scene'), stageBox = scene && scene.parentElement;
    if (motion.reduced || !stageBox || !stageBox.offsetWidth || scene.classList.contains('is-leaving') || (scene.parentElement === stage && !scene.classList.contains('is-active'))) return;   // (not once the slide has gone)
    if (!element.getClientRects().length) return;   // (hidden: it has no place to burst from)
    const outer = stageBox.getBoundingClientRect(), box = element.getBoundingClientRect(), scale = outer.width / stageBox.offsetWidth || 1;
    const x = (box.left + box.width / 2 - outer.left) / scale, y = (box.top + box.height / 2 - outer.top) / scale;
    const glyphs = CONFETTI_GLYPHS[element.getAttribute('data-confetti')] || null;   // stars, hearts, an emoji party; none: paper confetti
    const layer = document.createElement('div');
    layer.className = 'confetti-layer' + (glyphs ? ' is-glyphs' : '');
    layer.setAttribute('aria-hidden', 'true');
    stageBox.appendChild(layer);
    const colours = ['--color-accent', '--color-teal', '--color-rose', '--color-violet', '--color-text'];
    for (let index = 0; index < CONFIG.confetti.pieces; index++) {
      const piece = document.createElement('span');
      const angle = Math.random() * Math.PI * 2, reach = 140 + Math.random() * 260, turn = (Math.random() - .5) * 1080;
      const dx = Math.cos(angle) * reach, dy = Math.sin(angle) * reach * .7 - 120;   // (more up than down: then they fall)
      piece.style.cssText = 'left:' + x + 'px; top:' + y + 'px; ' + (glyphs ? 'color: var(' + colours[index % colours.length] + '); font-size: ' + Math.round(18 + Math.random() * 20) + 'px;'
        : 'background: var(' + colours[index % colours.length] + ');' + (index % 3 ? '' : ' border-radius: 50%;'));
      if (glyphs) piece.textContent = glyphs[index % glyphs.length];
      layer.appendChild(piece);
      piece.animate([
        { transform: 'translate(-50%, -50%) rotate(0deg)', opacity: 1 },
        { transform: 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px)) rotate(' + turn / 2 + 'deg)', opacity: 1, offset: .45 },
        { transform: 'translate(calc(-50% + ' + dx * 1.2 + 'px), calc(-50% + ' + (dy + 260) + 'px)) rotate(' + turn + 'deg)', opacity: 0 },
      ], { duration: CONFIG.confetti.durationMs * (.75 + Math.random() * .5), easing: 'cubic-bezier(.2, .7, .4, 1)', fill: 'forwards' });
    }
    setTimeout(() => layer.remove(), CONFIG.confetti.durationMs * 1.3);
  }

  function focusOnStep(scene, step, changed = new Set()) {
    clearTimeout(scene.focusTimer);
    // not dimmed: click items not shown yet, and those that change now (`changed`: shown or hidden by this step): their own transition plays
    const hidden = element => (element.matches('[data-reveal-step]:not(.is-revealed)') && !element.matches(SHOWN_BEFORE_CLICK)) || (changed.has(element) && !element.matches('[data-focus]'));
    scene.querySelectorAll('.is-dimmed').forEach(element => { if (hidden(element)) element.classList.remove('is-dimmed'); });
    const focused = step > 0 ? Array.from(scene.querySelectorAll('[data-focus][data-reveal-step]')).filter(element => revealStepOf(element) === step) : [];
    if (!focused.length) {
      if (!scene.classList.contains('has-focus')) return;
      scene.classList.remove('has-focus');
      scene.focusTimer = setTimeout(() => clearFocus(scene), CONFIG.focusFadeMs);   // brightens first (CSS), then the marks go
      return;
    }
    const keep = new Set();
    focused.forEach(element => { for (let node = element; node && node !== scene; node = node.parentElement) keep.add(node); });
    scene.querySelectorAll('.is-dimmed').forEach(element => element.classList.remove('is-dimmed'));
    keep.forEach(node => Array.from(node.parentElement.children).forEach(other => {
      if (!keep.has(other) && !hidden(other) && !other.matches('.slide-footer, .speaker-notes, .logo, style, script, template')) other.classList.add('is-dimmed');
    }));
    scene.classList.add('has-focus');
  }
  /** Zoom in on this click (data-zoom-in="1.6" on a click item): while its click is the newest, the slide on the stage is
      magnified around its middle and moved so that the item comes to the middle (as far as the slide's edges allow); the
      next click or Back zooms out (data-step-zoomed stays until that is done, so the zoom-out glides too). */
  function zoomOnStep(scene, step, host = stage) {   // host: the stage, or the editor's canvas while ▶ Play runs (section 19)
    if (!host.contains(scene)) return;
    clearTimeout(host.stepZoomTimer);
    const item = step > 0 ? Array.from(scene.querySelectorAll('[data-zoom-in][data-reveal-step]')).find(element => revealStepOf(element) === step) : null;
    if (!item || !item.getClientRects().length) {
      if (host.hasAttribute('data-step-zoomed')) {
        host.style.setProperty('--step-zoom', 1);
        host.style.setProperty('--step-zoom-shift', '0px 0px');
        host.stepZoomTimer = setTimeout(() => host.removeAttribute('data-step-zoomed'), CONFIG.stepZoomMs + 100);
      }
      return;
    }
    const level = clamp(parseFloat(item.getAttribute('data-zoom-in')) || CONFIG.stepZoomLevel, 1.1, 4);
    // its middle on the slide as laid out (not as a transform shows it now)
    let x = 0, y = 0, node = item;
    while (node && node !== scene) { x += node.offsetLeft; y += node.offsetTop; node = node.offsetParent; }
    if (node !== scene) {   // (a box in between that is not positioned: measured on screen instead)
      const sceneBox = scene.getBoundingClientRect(), box = item.getBoundingClientRect(), k = sceneBox.width / scene.offsetWidth || 1;
      x = (box.left - sceneBox.left) / k; y = (box.top - sceneBox.top) / k;
    }
    const width = scene.offsetWidth, height = scene.offsetHeight;
    // magnified around the middle M, moved by T: a point P lands on M + T + level × (P − M); the item's middle C on M when
    // T = −level × (C − M), kept within ±(level − 1) × M so the slide still fills the stage
    const shift = (centre, size) => Math.round(clamp(-level * (centre - size / 2), -(level - 1) * size / 2, (level - 1) * size / 2));
    host.setAttribute('data-step-zoomed', '');
    host.style.setProperty('--step-zoom-shift', shift(x + item.offsetWidth / 2, width) + 'px ' + shift(y + item.offsetHeight / 2, height) + 'px');
    host.style.setProperty('--step-zoom', level);
  }
  /** No dimming at all (leaving the slide; still copies). */
  function clearFocus(scene) {
    clearTimeout(scene.focusTimer);
    scene.classList.remove('has-focus');
    scene.querySelectorAll('.is-dimmed').forEach(element => element.classList.remove('is-dimmed'));
  }

  function behaviourOf(scene) {
    if (slideBehaviours[scene.dataset.name]) return slideBehaviours[scene.dataset.name];
    return scene.querySelector('[data-reveal-step]') ? revealStepsBehaviour : {};
  }

