  /* ===========================================================================
     5. ANIMATIONS AND WINDOW SYNC
     =========================================================================== */

  /* ---- Reduced motion -------------------------------------------------------
     Windows "Animation effects" off makes the browser ask for reduced motion.
     ?motion=1 in the URL or the M key brings the animations back. */
  const motion = {
    osPrefersReduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    reduced: false,          // true: skip animations, show end states
  };
  if (/[?&]motion=1/.test(location.search)) root.classList.add('force-motion');
  motion.reduced = motion.osPrefersReduced && !isMotionForced();

  function isMotionForced() { return root.classList.contains('force-motion'); }

  function setForceMotion(on) {
    root.classList.toggle('force-motion', on);
    motion.reduced = motion.osPrefersReduced && !on;
  }

  /* ---- Window sync ----------------------------------------------------------
     In presenter mode two windows show the deck: this one (presenter) and the
     audience window it opened. Whatever happens in one is sent to the other
     with postMessage, as one of these message types:
       hello                  audience -> presenter: "I just loaded" (both restart the slide)
       go                     { slideIndex, showEndState }  go to a slide
       step                   { slideName, step }      show a step of a slide with data-steps
       timeline-start         slide 3: start the car
       timeline-fast-forward  slide 3: play the rest faster
       flow-finish            slide 6: show the end of the flow
       blank                  { on }  black screen on/off
       motion                 { on }  animations forced on/off
       move                   { left, top, width, height }  presenter -> audience: move to the projector
       pointer                { spotlight, followVisible, zoom, x, y, spotlightRadius, dimPercent, zoomLevel, version }  spotlight
                              and zoom (version counts its changes: an older state than the window's own is ignored)
       ping                   presenter -> audience, every second: "are you there?"
       pong                   { slideIndex, step, isFullscreen }  audience -> presenter: the answer (check row)
       image                  { key, dataUrl? }  an image was swapped (section 15): read it from the browser
                              database, or use dataUrl when the browser could not save it
       caption                { text }  live captions (section 16)
       break                  { slideName, endsAt }  presenter -> audience: the end time of a break timer (section 7)
     A window that applies a message does not send it back (applyingRemoteMessage). */
  const MESSAGE_SOURCE = 'presentation-deck';
  const sync = {
    isAudience: new URLSearchParams(location.search).has('audience'),
    audienceWindow: null,        // set in the presenter window
    applyingRemoteMessage: false,
    helloReceived: false,
    helloSent: false,            // audience window: nothing goes to the presenter before its hello (also after a reload)
  };

  /** The other window, or null when it is closed. */
  function peerWindow() {
    const other = sync.isAudience ? window.opener : sync.audienceWindow;
    try { return other && !other.closed ? other : null; } catch (e) { return null; }
  }

  function sendToPeer(type, payload) {
    if (sync.applyingRemoteMessage) return;
    // the audience window, while it loads (its first slide), says nothing until its hello: a Next pressed in the
    // presenter meanwhile would be undone (the hello puts both windows on the presenter's slide)
    if (sync.isAudience && !sync.helloSent) { if (type !== 'hello') return; sync.helloSent = true; }
    const other = peerWindow();
    if (!other) return;
    try { other.postMessage({ source: MESSAGE_SOURCE, type, payload }, '*'); } catch (e) { /* window just closed */ }
  }

  /* ---- Messages from the other window: apply exactly what happened there ---- */
  function handlePeerMessage(event) {
    const message = event.data;
    if (!message || message.source !== MESSAGE_SOURCE) return;
    const other = peerWindow();
    if (!other || event.source !== other) return;
    if (message.type === 'hello') {
      if (!sync.isAudience) {
        sync.helloReceived = true;
        if (hasPresenterView()) audienceConnection.onHello();   // (the checks, section 12)
        restartCurrentSlide();       // both windows restart the current slide at the same moment
        pointerTools.send();         // a spotlight that is on also shows in the new window
        ink.sendAll();               // and the lines drawn so far (section 9)
      }
      return;
    }
    if (message.type === 'ping') {   // the audience window answers where it is
      if (sync.isAudience) sendToPeer('pong', { slideIndex: state.currentIndex, step: state.step, isFullscreen: isFullscreenWindow() });
      return;
    }
    if (message.type === 'pong') {
      if (!sync.isAudience && hasPresenterView()) audienceConnection.onAnswer(message.payload || {});
      return;
    }
    // what the audience window does while it loads (going to its first slide) is not the presenter's: a Next pressed in
    // that moment would be undone. Its hello, which follows, puts both windows on the presenter's slide.
    if (!sync.isAudience && !sync.helloReceived) return;
    const payload = message.payload || {};
    sync.applyingRemoteMessage = true;
    try {
      const scene = currentScene();
      switch (message.type) {
        case 'go':
          // the sender never sends its own slide twice, so the same slide means "restart"
          if (payload.slideIndex === state.currentIndex) {   // restart: a video starts from the beginning again
            runSafely('slide components', () => slideComponents.leave(currentScene()));
            state.currentIndex = -1;
          }
          agenda.returnTo = payload.agendaReturn || null;   // both windows know the way back to an agenda
          goToSlide(payload.slideIndex, payload.showEndState);
          break;
        case 'step':
          if (scene.dataset.name === payload.slideName) {
            state.step = payload.step;
            revealStepsBehaviour.quiet = !!payload.quiet;   // a Resync: the click is not played again (confetti, section 6)
            try { showStepOf(scene, payload.step); } finally { revealStepsBehaviour.quiet = false; }
            selfRunning.schedule();   // a click in the other window: the wait of a slide that moves on by itself starts again
          }
          break;
        case 'blank':
          deck.classList.toggle('is-blank', !!payload.on);
          break;
        case 'motion':
          setForceMotion(!!payload.on);
          break;
        case 'move':
          if (sync.isAudience) moveAudienceWindow(payload);
          break;
        case 'pointer':
          pointerTools.apply(payload);
          break;
        case 'ink':   // lines drawn on a slide (section 9)
          ink.apply(payload);
          break;
        case 'image':
          imageSwaps.onPeerMessage(payload);
          break;
        case 'break':
          breakTimers.apply(payload);
          break;
        case 'caption':
          liveCaptions.display(payload.text);
          break;
        default: {
          const behaviour = behaviourOf(scene);
          if (behaviour.onPeerMessage) runSafely('slide "' + scene.dataset.name + '" (message)', () => behaviour.onPeerMessage(message.type, scene));
        }
      }
      updatePresenterView();
    } finally {
      sync.applyingRemoteMessage = false;
    }
  }

  /* ---- Count-ups --------------------------------------------------------------
     <span class="count-up" data-to="92.2" data-decimals="1"> counts from 0 to
     data-to once its card has risen in. Optional: data-from (where it starts), data-duration (ms),
     data-separator="," / " " / "." (thousands: 12,500 · 12 500 · 12.500 with a decimal comma),
     data-count-style="roll" (the digits roll up like an odometer instead of counting: rollCountUp).
     In a click item it counts on its click (onClick: called by the click, section 6). */
  function countUpText(element, value) {
    const decimals = parseInt(element.dataset.decimals || '0', 10);
    const separator = element.dataset.separator || '';
    const fixed = (Number(Number(value).toFixed(decimals)) === 0 ? 0 : Number(value)).toFixed(decimals);   // (never "-0")
    const mark = element.dataset.decimal || (separator === '.' ? ',' : '.');   // data-decimal="," : a decimal comma
    const [whole, fraction] = fixed.split('.');
    const grouped = separator ? whole.replace(/\B(?=(\d{3})+(?!\d))/g, separator === ' ' ? '\u202f' : separator) : whole;   // (a narrow space never breaks the number)
    return fraction === undefined ? grouped : grouped + mark + fraction;
  }
  function animateCountUps(scene, showEndState, onClick) {
    (scene.matches && scene.matches('.count-up') ? [scene] : Array.from(scene.querySelectorAll('.count-up'))).forEach(element => {   // (a click item that is a number itself too)
      const target = parseFloat(element.dataset.to);
      const from = Number.isFinite(parseFloat(element.dataset.from)) ? parseFloat(element.dataset.from) : 0;
      const waiting = !showEndState && !onClick && element.closest('[data-reveal-step]:not(.is-revealed):not(' + SHOWN_BEFORE_CLICK + ')');   // it counts on its click (not an item on screen before it)
      if (motion.reduced || showEndState || target === from) {
        element.countUpRun = (element.countUpRun || 0) + 1;    // stops a count that may still run
        element.textContent = countUpText(element, target);
        return;
      }
      element.textContent = countUpText(element, from);
      if (waiting) { element.countUpRun = (element.countUpRun || 0) + 1; return; }
      const run = element.countUpRun = (element.countUpRun || 0) + 1;
      const duration = parseFloat(element.dataset.duration) > 0 ? parseFloat(element.dataset.duration) : CONFIG.countUp.durationMs;
      // the pace its card rises in with: the slide's own (or the presentation's) time between items and wait before the first
      const cssMs = name => { const value = getComputedStyle(element).getPropertyValue(name).trim(); return /ms$/.test(value) ? parseFloat(value) : /s$/.test(value) ? parseFloat(value) * 1000 : NaN; };
      const stagger = cssMs('--reveal-stagger'), enter = cssMs('--scene-enter-delay');
      const delay = onClick ? CONFIG.countUp.riseMs : revealOrderOf(element) * (Number.isFinite(stagger) ? stagger : CONFIG.countUp.staggerMs) + (Number.isFinite(enter) ? enter + CONFIG.countUp.riseMs : CONFIG.countUp.startDelayMs);
      // an odometer (data-count-style="roll"), not in a gradient text (its rolling digits would lose the gradient)
      if (element.dataset.countStyle === 'roll' && !clipsTextBackground(element)) { rollCountUp(element, from, target, delay, duration, run); return; }
      let startTime = null;

      function tick(now) {
        if (startTime === null) startTime = now;
        const progress = clamp((now - startTime - delay) / duration, 0, 1);
        const easedProgress = 1 - Math.pow(1 - progress, 3);   // ease out: fast first, slow at the end
        if (run !== element.countUpRun) return;                // a newer visit (or a changed number) owns this number
        element.textContent = countUpText(element, from + (target - from) * easedProgress);
        if (progress < 1 && (element.closest('.scene') || scene).classList.contains('is-visible')) requestAnimationFrame(tick);
        else {
          element.textContent = countUpText(element, target);
          if (progress >= 1) flashKeyFigure(element);
        }
      }
      requestAnimationFrame(tick);
    });
  }

  /** True when the element or a parent (up to its slide) paints its text with its background (a gradient text):
      text in strips laid over it would not be painted. */
  function clipsTextBackground(element) {
    for (let node = element; node && node.nodeType === 1 && !node.classList.contains('scene'); node = node.parentElement) {
      const style = getComputedStyle(node);
      if (/text/.test(style.backgroundClip || '') || /text/.test(style.webkitBackgroundClip || '')) return true;
    }
    return false;
  }
  /** data-count-style="roll": every digit of the end number is a window over a strip of digits 0–9 that rolls up to
      it, like an odometer; the digits further right turn more often (up to 3 extra turns). The separators and the
      decimal mark stay still. When all strips have stopped, the plain number is back (the element holds text only). */
  function rollCountUp(element, from, target, delay, duration, run) {
    const endText = countUpText(element, target);
    const endDigits = endText.replace(/\D/g, '');
    const startDigits = countUpText(element, from).replace(/\D/g, '').padStart(endDigits.length, '0').slice(-endDigits.length);
    element.textContent = '';
    const rolls = [];
    let index = 0;
    Array.from(endText).forEach(character => {
      if (!/\d/.test(character)) { element.appendChild(document.createTextNode(character)); return; }
      const first = Number(startDigits[index]) || 0, turns = Math.min(index, 3);
      let last = turns * 10 + Number(character);
      if (last < first) last += 10;   // it always rolls forward
      // the window: the end digit itself (hidden) keeps the number's width and baseline; the strip rolls over it
      const column = document.createElement('span');
      column.className = 'count-roll';
      const space = document.createElement('span');
      space.className = 'count-roll-space';
      space.textContent = character;
      const strip = document.createElement('span');
      strip.className = 'count-roll-strip';
      for (let digit = 0; digit <= last; digit += 1) {
        const cell = document.createElement('span');
        cell.textContent = String(digit % 10);
        strip.appendChild(cell);
      }
      column.append(space, strip);
      element.appendChild(column);
      rolls.push({ strip, first, last, cells: last + 1, index });
      index += 1;
    });
    const count = Math.max(1, rolls.length - 1);
    const animations = rolls.map(({ strip, first, last, cells, index: position }) => strip.animate(
      [{ transform: 'translateY(' + (-first / cells * 100) + '%)' }, { transform: 'translateY(' + (-last / cells * 100) + '%)' }],
      { duration: duration * (.7 + .3 * position / count), delay, easing: 'cubic-bezier(.22, .8, .3, 1)', fill: 'both' }));
    Promise.all(animations.map(animation => animation.finished)).then(() => {
      if (run !== element.countUpRun) return;   // a newer visit (or a changed number) owns this number
      element.textContent = endText;
      flashKeyFigure(element);
    }).catch(() => {});   // (cancelled: the element was rewritten)
  }

  /** The --order of the nearest revealed parent (0 when there is none). */
  function revealOrderOf(element) {
    const host = element.closest('[style*="--order"]');
    return host ? parseFloat(getComputedStyle(host).getPropertyValue('--order')) || 0 : 0;
  }

  /** A short amber flash on a key-figure card when its number is done. */
  function flashKeyFigure(element) {
    const card = element.closest('.stat.key-figure');
    if (!card || motion.reduced) return;
    const amber = alpha => colorWithAlpha('--color-accent', alpha);
    card.animate([
      { transform: 'none', boxShadow: `0 0 0 0 ${amber(0)}` },
      { transform: 'scale(1.045)', boxShadow: `0 0 0 3px ${amber(.65)}`, offset: .35 },
      { transform: 'none', boxShadow: `0 0 0 0 ${amber(0)}` },
    ], { duration: 650, easing: 'ease-out' });
  }

