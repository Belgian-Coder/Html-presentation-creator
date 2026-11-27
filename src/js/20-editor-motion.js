  /* ===========================================================================
     20b. EDITOR MOTION: the timeline, easing and recording (the object editorMotion)
     TIMELINE (Animations tab)
       Ruler            above "With the slide": click or drag it to see the slide at
                        that moment (the playhead); the slide stays paused there.
       Keys             an element with its own animation shows its keyframes as
                        diamonds on its bar: drag one to another moment; click the
                        line between two to choose how it moves there (easing).
       ● Record         with the playhead on a moment, move or turn a freely placed
                        element on the slide: that becomes a keyframe at that moment
                        (its own animation is made or changed; the first one starts
                        where the element was). Undo takes it back.
     EASING (per segment: from a keyframe to the next one)
       A keyframe's "ease" in the ANIMATIONS block: a preset name (smooth, ease-out,
       ease-in, linear, back-out, back-in, back-in-out, spring-soft, spring-bouncy,
       spring-wobbly, hold, steps-4) or "cubic-bezier(x1, y1, x2, y2)". Without
       one, the animation's own easing. Section 7 turns it into CSS
       (animation-timing-function inside the keyframe; springs as linear()).
       The easing window: presets with their curves, a curve to drag (two
       handles), the cubic-bezier as text, a moving dot, copy / paste.
     QUICK ANIMATIONS (Animations tab, top)
       For the selected element: In (fade, rise, pop, zoom, from left / right, blur,
       bounce), Emphasis (pulse, float, shake, wobble) and Out (fade out, sink, zoom
       out); the pointer over one plays it on the element, a click gives it that
       animation (a ready-made one, which you can change: keyframes, easing).
     MOTION PATH (canvas)
       The selected element's way over the slide: a dotted line through its
       keyframes, a dot per keyframe; drag a dot to move that keyframe.
     DRAW A PATH (quick animations, Path; the Animate menu; Ctrl+K)
       ✎ Draw a path, then drag on the slide along the way it should go: the
       element gets its own animation with a keyframe per bend (simplified,
       at most 24), at the same speed all the way (easing linear; each
       segment can get its own easing afterwards). The way starts at the
       element's place. "⏱ Your speed" keeps the speed you drew it with (slow
       where you went slowly; its length is the time you took; drawn with the
       red line on a moment, it starts there). "Turn along" also turns it with the way (an arrow
       points where it goes). Esc stops. One undo step. An animation of its
       own keeps its trigger, delay and duration; its keyframes become the path.
     MY ANIMATIONS (quick animations, Mine; ★ in the keyframe editor)
       Your own animations kept in this browser for every presentation:
       ★ To my animations saves the selected element's animation (keyframes,
       duration, easing, repeat; not its delay). Mine shows them: the pointer
       over one plays it on the element, a click gives it that animation (a copy
       in this file's ANIMATIONS block), × removes it from the library. Export
       writes them to a .json file; Import reads such a file (from another
       browser or person) and adds them.
     MORPH PAIRING (Element tab, Morph)
       "Pair with the next slide…" lists the elements of the next slide: a
       click gives both the same data-morph name (the one this element or that
       one already has, else one made from its text). The tab shows where it
       glides to and comes from.
     =========================================================================== */

  /** The easing presets of the easing window: [value, interface text]. '' = the animation's own easing. */
  const EASE_CHOICES = [['', 'editor.easeAsAnimation'], ['smooth', 'editor.easeSmoothPreset'], ['ease-out', 'editor.easeOutPreset'], ['ease-in', 'editor.easeInPreset'],
    ['linear', 'editor.easeLinearPreset'], ['back-out', 'editor.easeBackOut'], ['back-in', 'editor.easeBackIn'], ['back-in-out', 'editor.easeBackInOut'],
    ['spring-soft', 'editor.easeSpringSoft'], ['spring-bouncy', 'editor.easeSpringBouncy'], ['spring-wobbly', 'editor.easeSpringWobbly'], ['hold', 'editor.easeHold'], ['steps-4', 'editor.easeSteps']];

  /** f(t) for a CSS easing (to draw it): cubic-bezier, linear(), steps(), linear and the keywords. */
  function easingFunction(css) {
    const text = String(css || '').trim();
    const keyword = { linear: [0, 0, 1, 1], ease: [.25, .1, .25, 1], 'ease-in': [.42, 0, 1, 1], 'ease-out': [0, 0, .58, 1], 'ease-in-out': [.42, 0, .58, 1] }[text];
    const bezier = keyword || ((text.match(/^cubic-bezier\(([^)]*)\)$/) || [])[1] || '').split(',').map(Number);
    if (bezier.length === 4 && bezier.every(Number.isFinite)) {
      const [x1, y1, x2, y2] = bezier;
      const curve = (a, b, s) => 3 * a * s * (1 - s) * (1 - s) + 3 * b * s * s * (1 - s) + s * s * s;
      return t => {   // find s with x(s) = t (bisection: steady), then y(s)
        let low = 0, high = 1, s = t;
        for (let i = 0; i < 30; i++) { s = (low + high) / 2; if (curve(x1, x2, s) < t) low = s; else high = s; }
        return curve(y1, y2, s);
      };
    }
    const linear = text.match(/^linear\((.*)\)$/);
    if (linear) {
      // stops "value [from%] [to%]": a stop without a place lies evenly between the ones around it (the first at 0, the last at 100%)
      const stops = [];
      linear[1].split(',').forEach(part => {
        const [value, ...places] = part.trim().split(/\s+/);
        if (!Number.isFinite(Number(value))) return;
        if (!places.length) stops.push({ value: Number(value), at: null });
        places.slice(0, 2).forEach(place => stops.push({ value: Number(value), at: parseFloat(place) / 100 }));
      });
      if (stops.length < 2) return t => t;
      if (stops[0].at === null) stops[0].at = 0;
      if (stops[stops.length - 1].at === null) stops[stops.length - 1].at = 1;
      for (let i = 1; i < stops.length; i++) if (stops[i].at !== null && stops[i].at < stops[i - 1].at) stops[i].at = stops[i - 1].at;   // never back in time
      for (let i = 1; i < stops.length - 1; i++) {
        if (stops[i].at !== null) continue;
        let j = i; while (stops[j].at === null) j++;
        for (let k = i; k < j; k++) stops[k].at = stops[i - 1].at + (stops[j].at - stops[i - 1].at) * (k - i + 1) / (j - i + 1);
      }
      return t => {
        if (t <= stops[0].at) return stops[0].value;
        for (let i = 1; i < stops.length; i++) if (t <= stops[i].at) { const span = stops[i].at - stops[i - 1].at; return span > 0 ? stops[i - 1].value + (stops[i].value - stops[i - 1].value) * (t - stops[i - 1].at) / span : stops[i].value; }
        return stops[stops.length - 1].value;
      };
    }
    const steps = text.match(/^steps\((\d+)(\s*,\s*(?:start|jump-start))?/);
    if (steps) { const n = Number(steps[1]); return steps[2] ? (t => Math.min(1, (Math.floor(t * n) + 1) / n)) : (t => (t >= 1 ? 1 : Math.floor(t * n) / n)); }
    return t => t;
  }

  /** A small drawing of an easing: the curve in a box (overshoot fits too). */
  function easeCurveSvg(css, size = 44) {
    const f = easingFunction(css), points = [];
    for (let i = 0; i <= 40; i++) { const t = i / 40; points.push((t * size).toFixed(1) + ',' + ((1.2 - f(t)) / 1.6 * size).toFixed(1)); }
    return '<svg viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '" aria-hidden="true"><path d="M0 ' + (1.2 / 1.6 * size).toFixed(1) + 'H' + size + 'M0 ' + (.2 / 1.6 * size).toFixed(1) + 'H' + size + '" class="ease-grid"/><polyline points="' + points.join(' ') + '"/></svg>';
  }

  /** The quick animations: [group interface text, [preset name, interface text] …]. Presets: section 18. */
  /** A drawn line with fewer points: the points further than `tolerance` from the line between their neighbours stay (Douglas-Peucker). */
  function simplifyLine(points, tolerance) {
    if (points.length < 3) return points.slice();
    const first = points[0], last = points[points.length - 1];
    const dx = last.x - first.x, dy = last.y - first.y, length = Math.hypot(dx, dy);
    let index = -1, far = 0;
    for (let i = 1; i < points.length - 1; i++) {
      const point = points[i];
      const distance = length ? Math.abs(dy * point.x - dx * point.y + last.x * first.y - last.y * first.x) / length : Math.hypot(point.x - first.x, point.y - first.y);
      if (distance > far) { far = distance; index = i; }
    }
    if (far <= tolerance) return [first, last];
    return simplifyLine(points.slice(0, index + 1), tolerance).slice(0, -1).concat(simplifyLine(points.slice(index), tolerance));
  }
  /** The same in three directions: x, y and the time (t × weight, in px). */
  function simplifyLine3(points, tolerance, weight) {
    if (points.length < 3) return points.slice();
    const z = point => point.t * weight;
    const first = points[0], last = points[points.length - 1];
    const ab = [last.x - first.x, last.y - first.y, z(last) - z(first)];
    const length = Math.hypot(...ab);
    let index = -1, far = 0;
    for (let i = 1; i < points.length - 1; i++) {
      const ap = [points[i].x - first.x, points[i].y - first.y, z(points[i]) - z(first)];
      const cross = [ap[1] * ab[2] - ap[2] * ab[1], ap[2] * ab[0] - ap[0] * ab[2], ap[0] * ab[1] - ap[1] * ab[0]];
      const distance = length ? Math.hypot(...cross) / length : Math.hypot(...ap);
      if (distance > far) { far = distance; index = i; }
    }
    if (far <= tolerance) return [first, last];
    return simplifyLine3(points.slice(0, index + 1), tolerance, weight).slice(0, -1).concat(simplifyLine3(points.slice(index), tolerance, weight));
  }
  /** The elements of a slide that can be a Morph partner (in the model: no layout to measure). */
  const MORPH_CANDIDATES = 'h1, h2, h3, h4, p, li, blockquote, img, .image-frame, .video-frame, .shape, .card, .stat, [data-morph], [data-editor-name]';

  /** Your own animations, for every presentation in this browser: { name: definition }. */
  const MY_ANIMATIONS_KEY = 'presentation-editor.myAnimations';
  /** Recent: the quick animations you gave last (in this browser, for every presentation), first the newest. */
  const RECENT_QUICK_KEY = 'presentation-editor.recentQuick';
  const RECENT_QUICK_COUNT = 6;

  /** Ready ways for an element (Animations tab, Shape): see editorMotion.pathShape. */
  const PATH_SHAPES = ['circle', 'arc', 'wave', 'eight'];
  /** The same easing played backwards: in ↔ out, a curve turned round; one that looks the same both ways (or a spring) stays. */
  function reversedEasing(value) {
    const swap = { 'ease-in': 'ease-out', 'ease-out': 'ease-in', 'back-in': 'back-out', 'back-out': 'back-in', hold: 'hold-start', 'hold-start': 'hold', smooth: 'cubic-bezier(.8, 0, .6, 1)' };
    if (hasOwn(swap, value)) return swap[value];
    const steps = String(value).match(/^steps-(\d{1,2})(-start)?$/);   // a jump at the end of each step: backwards at its start
    if (steps) return 'steps-' + steps[1] + (steps[2] ? '' : '-start');
    const bezier = String(value).match(/^cubic-bezier\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)$/);
    if (!bezier) return value;
    const [x1, y1, x2, y2] = bezier.slice(1).map(Number);
    const round = number => Math.round(number * 1000) / 1000;
    return 'cubic-bezier(' + [1 - x2, 1 - y2, 1 - x1, 1 - y1].map(round).join(', ') + ')';
  }
  const QUICK_ANIMATIONS = [
    ['editor.quickIn', [['fade-in', 'editor.quickFade'], ['rise', 'editor.quickRise'], ['pop-in', 'editor.quickPop'], ['zoom-in', 'editor.quickZoom'], ['slide-from-left', 'editor.quickFromLeft'], ['slide-from-right', 'editor.quickFromRight'], ['blur-in', 'editor.quickBlur'], ['bounce-in', 'editor.quickBounce'], ['drop-in', 'editor.quickDropIn'], ['roll-in', 'editor.quickRollIn'], ['stretch-in', 'editor.quickStretchIn'], ['land-in', 'editor.quickLandIn'], ['grow-right', 'editor.quickGrow'], ['unfold', 'editor.quickUnfold'], ['swing-in', 'editor.quickSwingIn']]],
    ['editor.quickEmphasis', [['pulse', 'editor.quickPulse'], ['float', 'editor.quickFloat'], ['shake', 'editor.quickShake'], ['wobble', 'editor.quickWobble'], ['jelly', 'editor.quickJelly'], ['swing', 'editor.quickSwing'], ['flash', 'editor.quickFlash'], ['heartbeat', 'editor.quickHeartbeat'], ['tada', 'editor.quickTada'], ['glow', 'editor.quickGlow'], ['nod', 'editor.quickNod'], ['spin', 'editor.quickSpin'], ['spin-forever', 'editor.quickSpinForever'], ['bounce', 'editor.quickBounceClick'], ['orbit', 'editor.quickOrbit'], ['rock', 'editor.quickRock'], ['blink', 'editor.quickBlink']]],
    ['editor.quickOut', [['fade-out', 'editor.quickFadeOut'], ['sink-out', 'editor.quickSink'], ['zoom-out', 'editor.quickZoomOut'], ['slide-out-left', 'editor.quickOutLeft'], ['slide-out-right', 'editor.quickOutRight'], ['blur-out', 'editor.quickBlurOut'], ['shrink-out', 'editor.quickShrinkOut'], ['rise-out', 'editor.quickRiseOut'], ['spin-out', 'editor.quickSpinOut'], ['fall-out', 'editor.quickFallOut'], ['pop-out', 'editor.quickPopOut']]],
  ];

  const editorMotion = {
    playhead: null,        // ms from the slide's start, or null (the canvas is still)
    recording: false,
    easeWindow: null,      // the open easing window: { element, name, index, value }
    copiedEase: null,
    drawing: false,        // ✎ Draw a path is on: the next drag on the canvas is the way
    orientPath: false,     // a drawn path also turns the element with the way
    timedPath: false,      // a drawn path keeps the speed it was drawn with

    /** Once, when the editor is built. */
    setUp() {
      // Draw a path: a press anywhere on the canvas starts the line, before anything else gets the press
      editor.element.querySelector('.editor-canvas').addEventListener('pointerdown', event => { if (this.drawing) this.startPathDraw(event); }, true);
    },

    /** The quick animations for the selected element (top of the Animations tab). */
    quickHtml() {
      const element = editorCanvas.selected;
      if (!element || !editorCanvas.scene || !editorCanvas.scene.contains(element)) return '<p class="editor-note">' + escapeHtml(ui('editor.quickPick')) + '</p>';
      const current = element.getAttribute('data-animation') || '';
      const locked = editorCanvas.locked() || editorLayers.isLocked(element) ? ' disabled' : '';
      const labels = new Map(QUICK_ANIMATIONS.flatMap(([, presets]) => presets));
      const recent = this.recentQuick().filter(name => labels.has(name));
      // When it plays, right where the animation is chosen (a first-time user looked for "on a click" here, not in the panel)
      const onClick = current && hasOwn(editor.animations(), current) ? editor.animations()[current].trigger === 'click' : element.hasAttribute('data-reveal-step');
      const when = '<div class="anim-quick-group anim-quick-when"><span>' + escapeHtml(ui('editor.quickWhen')) + '</span>' +
        [['slide', 'editor.animWithSlide', !onClick], ['click', 'editor.animOnClick', onClick]].map(([value, label, on]) => '<button data-action="motion-quick-when" data-when="' + value + '"' + locked + ' aria-pressed="' + on + '"' + (on ? ' class="is-current"' : '') + '>' + escapeHtml(ui(label)) + '</button>').join('') + '</div>';
      return '<div class="anim-quick">' + when + (recent.length ? [['editor.quickRecent', recent.map(name => [name, labels.get(name)])]] : []).concat(QUICK_ANIMATIONS).map(([group, presets]) => '<div class="anim-quick-group"><span>' + escapeHtml(ui(group)) + '</span>' +
        presets.map(([name, label]) => '<button data-action="motion-quick" data-preset="' + name + '"' + locked + (name === current ? ' class="is-current"' : '') + '>' + escapeHtml(ui(label)) + '</button>').join('') + '</div>').join('') +
        this.mineHtml(locked) +
        '<div class="anim-quick-group"><span>' + escapeHtml(ui('editor.quickPath')) + '</span><button data-action="motion-draw"' + locked + (this.drawing ? ' class="is-current"' : '') + ' title="' + escapeHtml(ui('editor.drawPathTooltip')) + '">' + escapeHtml(ui('editor.drawPath')) + '</button>' +
          '<button data-action="motion-orient" aria-pressed="' + this.orientPath + '"' + (this.orientPath ? ' class="is-current"' : '') + ' title="' + escapeHtml(ui('editor.orientPathTooltip')) + '">' + escapeHtml(ui('editor.orientPath')) + '</button>' +
          '<button data-action="motion-timed" aria-pressed="' + this.timedPath + '"' + (this.timedPath ? ' class="is-current"' : '') + ' title="' + escapeHtml(ui('editor.timedPathTooltip')) + '">' + escapeHtml(ui('editor.timedPath')) + '</button></div>' +
        '<div class="anim-quick-group"><span>' + escapeHtml(ui('editor.quickShape')) + '</span>' + PATH_SHAPES.map(shape => '<button data-action="motion-shape" data-shape="' + shape + '"' + locked + ' title="' + escapeHtml(ui('editor.shape_' + shape + 'Tooltip')) + '">' + escapeHtml(ui('editor.shape_' + shape)) + '</button>').join('') +
          (current ? '<button data-action="motion-reverse"' + locked + ' title="' + escapeHtml(ui('editor.reverseTooltip')) + '">' + escapeHtml(ui('editor.reverse')) + '</button>' : '') +
          (this.hasPath(element) ? '<button data-action="motion-smooth"' + locked + ' title="' + escapeHtml(ui('editor.pathSmoothTooltip')) + '">' + escapeHtml(ui('editor.pathSmooth')) + '</button>' : '') + '</div>' +
        (current ? '<button class="anim-quick-none" data-action="motion-quick" data-preset=""' + locked + '>' + escapeHtml(ui('editor.quickNone')) + '</button>' : '') + '</div>';
    },
    /* ======== MY ANIMATIONS ======== */

    myAnimations() {
      try {
        const data = JSON.parse(localStorage.getItem(MY_ANIMATIONS_KEY) || '{}');
        return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
      } catch (e) { return {}; }
    },
    saveMyAnimations(list) {
      try { localStorage.setItem(MY_ANIMATIONS_KEY, JSON.stringify(list)); return true; } catch (e) { showToast(ui('editor.mineNoStorage')); return false; }
    },
    /** Only what an animation is made of (a file from someone else may hold anything). Null when it is no animation. */
    cleanDefinition(definition) {
      if (!definition || typeof definition !== 'object' || !Array.isArray(definition.keyframes)) return null;
      const number = (value, low, high, fallback) => (Number.isFinite(Number(value)) ? clamp(Number(value), low, high) : fallback);
      const frames = definition.keyframes.filter(frame => frame && typeof frame === 'object').slice(0, 60).map(frame => {
        const copy = { at: number(frame.at, 0, 100, 0) };
        KEYFRAME_FIELDS.filter(key => key !== 'at').forEach(key => { if (frame[key] !== undefined && frame[key] !== '' && Number.isFinite(Number(frame[key]))) copy[key] = Number(frame[key]); });
        if (typeof frame.ease === 'string' && segmentEasing(frame.ease)) copy.ease = frame.ease;
        return copy;
      });
      if (frames.length < 2) return null;
      return {
        trigger: definition.trigger === 'click' ? 'click' : 'slide',
        duration: number(definition.duration, 1, 20000, 800),
        delay: 0,
        easing: hasOwn(EASINGS, definition.easing) ? definition.easing : 'ease-out',
        repeat: definition.repeat === 'infinite' ? 'infinite' : number(definition.repeat, 1, 100, 1),
        alternate: !!definition.alternate,
        keyframes: frames,
        ...(originShift(definition.origin) ? { origin: definition.origin } : {}),
      };
    },
    /** ★ To my animations: the selected element's animation, under its name (the same name again: replaced, after asking). */
    saveToMine() {
      const element = editorCanvas.selected;
      const name = element && element.getAttribute('data-animation');
      const definition = name && this.cleanDefinition(editor.animations()[name]);
      if (!definition) { showToast(ui('editor.mineNothing')); return; }
      const list = this.myAnimations();
      if (hasOwn(list, name) && JSON.stringify(list[name]) !== JSON.stringify(definition) && !askToConfirm(ui('editor.mineReplace', { name }))) return;
      list[name] = definition;
      if (this.saveMyAnimations(list)) showToast(ui('editor.mineSaved', { name }));
      editor.renderPanel();
    },
    /** A click on one of Mine: the element gets it (copied into this file's ANIMATIONS; one undo step). */
    applyMine(name) {
      const element = editorCanvas.selected;
      const definition = this.cleanDefinition(this.myAnimations()[name]);
      if (!element || !definition || editorCanvas.locked() || editorLayers.refuses([element])) return;
      editor.nextLabel = ui('editor.historyMine', { name });
      editorCanvas.change(() => {
        const definitions = editor.animations();
        let use = animationName(name) || 'mine';
        // the same name in this file but another animation: a name of its own (the file's one stays as it is)
        const same = key => JSON.stringify(this.cleanDefinition(definitions[key])) === JSON.stringify(definition);
        if (hasOwn(definitions, use) && !same(use)) {
          let n = 2;
          while (hasOwn(definitions, use + '-' + n) && !same(use + '-' + n)) n++;   // its copy from an earlier click is used again
          use = use + '-' + n;
        }
        if (!hasOwn(definitions, use)) { definitions[use] = definition; editor.saveAnimations(definitions); }
        editorCanvas.chooseAnimation(element, use);
        if (definition.trigger === 'click' && !element.hasAttribute('data-reveal-step')) { element.setAttribute('data-reveal-step', 1); element.setAttribute('data-editor-step-added', ''); }
      }, { rerender: true });
      editor.nextLabel = null;
      runSafely('mine preview', () => editorCanvas.previewAnimation());
    },
    removeMine(name) {
      const list = this.myAnimations();
      if (!hasOwn(list, name) || !askToConfirm(ui('editor.mineRemove', { name }))) return;
      delete list[name];
      this.saveMyAnimations(list);
      if (editorLayers.historyList && editorLayers.historyList.classList.contains('editor-quick-menu')) editorLayers.historyList.innerHTML = this.quickHtml();   // the Animate popover too
      editor.renderPanel();
    },
    exportMine() {
      const list = this.myAnimations();
      if (!Object.keys(list).length) { showToast(ui('editor.mineEmpty')); return; }
      downloadFile('my-animations.json', JSON.stringify({ format: 'presentation-animations', animations: list }, null, 2), 'application/json');
    },
    importMine() {
      editorCanvas.pickFile('.json,application/json', file => file.text().then(text => {
        const data = parseJsonOr(text, null);
        const source = data && typeof data === 'object' ? (data.animations && typeof data.animations === 'object' ? data.animations : data) : null;
        const list = this.myAnimations(), incoming = {};
        if (source) Object.keys(source).slice(0, 200).forEach(key => {
          const name = animationName(key), definition = this.cleanDefinition(source[key]);
          if (name && definition) incoming[name] = definition;   // (two keys with the same name: one)
        });
        const names = Object.keys(incoming);
        if (!names.length) { showToast(ui('editor.mineImportNone')); return; }
        const clashing = names.filter(name => hasOwn(list, name) && JSON.stringify(list[name]) !== JSON.stringify(incoming[name]));
        const replace = !clashing.length || askToConfirm(ui('editor.mineImportReplace', { count: clashing.length, names: clashing.slice(0, 5).join(', ') }));
        let added = 0;
        names.forEach(name => {
          if (hasOwn(list, name) && !replace && clashing.includes(name)) return;   // yours stays
          if (!hasOwn(list, name) || clashing.includes(name)) added++;
          list[name] = incoming[name];
        });
        if (!added) { showToast(ui('editor.mineImportNothingNew')); return; }
        if (this.saveMyAnimations(list)) showToast(ui('editor.mineImported', { count: added }));
        editor.renderPanel();
      }));
    },
    recentQuick() {
      try { const list = JSON.parse(localStorage.getItem(RECENT_QUICK_KEY) || '[]'); return Array.isArray(list) ? list.filter(name => typeof name === 'string').slice(0, RECENT_QUICK_COUNT) : []; } catch (e) { return []; }
    },
    rememberQuick(name) {
      try { localStorage.setItem(RECENT_QUICK_KEY, JSON.stringify([name].concat(this.recentQuick().filter(other => other !== name)).slice(0, RECENT_QUICK_COUNT))); } catch (e) { /* no storage: no Recent row */ }
    },
    /** The Mine row of the quick animations. */
    mineHtml(locked) {
      const names = Object.keys(this.myAnimations()).sort();
      const current = editorCanvas.selected ? editorCanvas.selected.getAttribute('data-animation') || '' : '';
      return '<div class="anim-quick-group anim-mine"><span>' + escapeHtml(ui('editor.quickMine')) + '</span>' +
        (names.length ? names.map(name => '<span class="anim-mine-item"><button data-action="motion-mine" data-mine="' + escapeHtml(name) + '"' + locked + (current === name || new RegExp('^' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '-\\d+$').test(current) ? ' class="is-current"' : '') + '>' + escapeHtml(name) + '</button>' +
          '<button class="anim-mine-remove" data-action="motion-mine-remove" data-mine="' + escapeHtml(name) + '" title="' + escapeHtml(ui('editor.mineRemoveTooltip', { name })) + '" aria-label="' + escapeHtml(ui('editor.mineRemoveTooltip', { name })) + '">×</button></span>').join('')
          : '<em class="editor-note">' + escapeHtml(ui('editor.mineNone')) + '</em>') +
        '<button data-action="motion-mine-export"' + (names.length ? '' : ' disabled') + ' title="' + escapeHtml(ui('editor.mineExportTooltip')) + '">' + escapeHtml(ui('editor.mineExport')) + '</button>' +
        '<button data-action="motion-mine-import" title="' + escapeHtml(ui('editor.mineImportTooltip')) + '">' + escapeHtml(ui('editor.mineImport')) + '</button></div>';
    },

    /** The pointer over a quick animation (Animations tab, the Animate list) or one of Mine: it plays on the selected
        element again and again while the pointer stays on it, and stops when it leaves (the file does not change). */
    onQuickHover(event) {
      const mine = event.target.closest && event.target.closest('[data-action="motion-mine"][data-mine]');
      const button = !mine && event.target.closest && event.target.closest('[data-action="motion-quick"][data-preset]');
      const key = mine ? 'mine:' + mine.dataset.mine : button ? button.dataset.preset : '';
      if (key && key === this.lastQuickHover) return;   // (still on the same one: it keeps looping)
      this.endQuickHover();
      if (!key || (mine || button).disabled || editorTools.playStep >= 0) return;
      const definition = mine ? this.cleanDefinition(this.myAnimations()[mine.dataset.mine]) : ANIMATION_PRESETS[key];
      if (!definition) return;
      this.lastQuickHover = key;
      runSafely('quick preview', () => editorCanvas.previewAnimation(definition, { loop: true }));
    },
    /** The pointer left the quick animations: the looping preview stops (the element is as it was). */
    endQuickHover() {
      if (!this.lastQuickHover) return;
      this.lastQuickHover = null;
      if (editorCanvas.previewRun && editorCanvas.previewRun.loop) editorCanvas.stopPreview();
    },
    /** A quick animation (or none) for the selected element: one undo step. */
    applyQuick(name) {
      const element = editorCanvas.selected;
      if (!element || editorCanvas.locked() || editorLayers.refuses([element])) return;
      const before = element.getAttribute('data-animation') || '';   // (one animation per element: say which one it replaces)
      if (name) this.rememberQuick(name);   // (the Recent row, at the top: before the panel is drawn again)
      editor.nextLabel = ui('editor.historyQuick');
      editorCanvas.change(() => {
        // an animation of that name that is already in the file (perhaps changed, perhaps used by others) stays as it is
        if (name) editorCanvas.chooseAnimation(element, hasOwn(editor.animations(), name) ? name : 'preset:' + name);
        else {
          editorCanvas.chooseAnimation(element, '');
          if (element.hasAttribute('data-editor-step-added')) { element.removeAttribute('data-reveal-step'); element.removeAttribute('data-editor-step-added'); }   // the click it got with the animation
          if (!element.hasAttribute('data-reveal-step')) element.classList.add('reveal');   // back to the usual rise-in
        }
      }, { rerender: true });
      editor.nextLabel = null;
      if (name) runSafely('quick preview', () => editorCanvas.previewAnimation());
      const replaced = name && before && before !== name && before !== 'preset:' + name ? ' ' + ui('editor.quickReplaced', { old: animationLabel(before.replace(/^preset:/, '')) }) : '';
      showToast(name ? ui('editor.quickApplied', { what: editorTools.labelOf(element), name: animationLabel(name) }) + replaced : ui('editor.quickRemoved'));   // (it played once on the canvas; ▶ Play slide shows it again)
    },

    /** The quick animations' When row: with the slide or on a click. Its own animation: when that plays (animTrigger);
        no animation of its own: when it appears (appear). The same settings as in the Element tab, so one undo step. */
    setQuickWhen(when) {
      const element = editorCanvas.selected;
      if (!element || !['slide', 'click'].includes(when)) return;
      const own = element.getAttribute('data-animation');
      if (own && hasOwn(editor.animations(), own)) editorCommands.applySetting('element', 'data-element-field', 'animTrigger', when);
      else editorCommands.applySetting('element', 'data-element-field', 'appear', when);
      // the list stays open (next: pick how it comes in); its When row shows the choice
      const list = editorLayers.historyList;
      if (list) list.querySelectorAll('[data-action="motion-quick-when"]').forEach(button => { const on = button.dataset.when === when; button.setAttribute('aria-pressed', String(on)); button.classList.toggle('is-current', on); });
      showToast(ui(when === 'click' ? 'editor.quickWhenClick' : 'editor.quickWhenSlide', { what: editorTools.labelOf(element) }));
    },
    /** Buttons of the motion tools (Animations tab, keyframe table). True when handled. */
    runAction(action, button) {
      if (action === 'motion-quick') { this.applyQuick(button.dataset.preset); return true; }
      if (action === 'motion-quick-when') { this.setQuickWhen(button.dataset.when); return true; }
      if (action === 'motion-mine') { editorLayers.closeHistory(); this.applyMine(button.dataset.mine); return true; }
      if (action === 'motion-mine-remove') { this.removeMine(button.dataset.mine); return true; }
      if (action === 'motion-mine-save') { this.saveToMine(); return true; }
      if (action === 'motion-mine-export') { this.exportMine(); return true; }
      if (action === 'motion-mine-import') { this.importMine(); return true; }
      if (action === 'motion-record') { this.toggleRecording(); return true; }
      if (action === 'motion-draw') { editorLayers.closeHistory(); this.toggleDrawing(); return true; }
      if (action === 'motion-shape') { this.pathShape(button.dataset.shape); return true; }
      if (action === 'motion-reverse') { this.reverseAnimation(); return true; }
      if (action === 'motion-smooth') { this.smoothPath(); return true; }
      if (action === 'motion-timed') {
        this.timedPath = !this.timedPath;
        editor.element.querySelectorAll('[data-action="motion-timed"]').forEach(toggle => { toggle.setAttribute('aria-pressed', String(this.timedPath)); toggle.classList.toggle('is-current', this.timedPath); });
        return true;
      }
      if (action === 'motion-orient') {
        this.orientPath = !this.orientPath;
        editor.element.querySelectorAll('[data-action="motion-orient"]').forEach(toggle => { toggle.setAttribute('aria-pressed', String(this.orientPath)); toggle.classList.toggle('is-current', this.orientPath); });
        return true;
      }
      if (action === 'morph-pair') { this.openMorphPicker(button); return true; }
      if (action === 'morph-choose') { this.pairMorph(Number(button.dataset.index)); return true; }
      if (action === 'motion-ease') {
        if (this.suppressClick) { this.suppressClick = false; return true; }   // it was a drag of the bar
        const element = editorCanvas.elementAtPath(button.dataset.path.split('/').map(Number));
        if (element) this.openEase(button, element, Number(button.dataset.index));
        return true;
      }
      if (action === 'motion-ease-row') { this.openEase(button, editorCanvas.selected, Number(button.dataset.index)); return true; }
      return false;
    },
    /** True after a drag in Record that becomes a keyframe (only moving and turning a freely placed element). */
    records(mode) { return this.recording && this.playhead !== null && (mode === 'move' || mode === 'rotate'); },

    /* ======== TIMELINE ======== */

    /** The ruler above "With the slide" (with the playhead) and the Record button. */
    rulerHtml(total) {
      const seconds = [];
      const every = total > 6000 ? 2000 : total > 3000 ? 1000 : 500;
      for (let ms = 0; ms <= total; ms += every) seconds.push('<span style="left:' + (100 * ms / total).toFixed(2) + '%"' + (ms > 0 && ms + every > total ? ' class="is-end"' : '') + '>' + (ms / 1000).toFixed(ms % 1000 ? 1 : 0) + ' s</span>');
      const head = this.playhead === null ? '' : '<span class="anim-playhead" style="left:' + clamp(100 * this.playhead / total, 0, 100).toFixed(2) + '%" data-time="' + (this.playhead / 1000).toFixed(2) + ' s"></span>';
      return '<div class="anim-ruler-row"><button class="anim-record' + (this.recording ? ' is-on' : '') + '" data-action="motion-record" data-ui-title="editor.recordTooltip" aria-pressed="' + this.recording + '">' + escapeHtml(ui('editor.record')) + '</button>' +
        '<div class="anim-ruler" data-total="' + Math.round(total) + '" data-ui-title="editor.rulerTooltip">' + seconds.join('') + head + '</div></div>';
    },
    /** The keyframes of an element's own animation as diamonds on its track, and the lines between them (easing). */
    keysHtml(element, timing, total) {
      const definition = editor.animations()[element.getAttribute('data-animation')];
      if (!definition || timing.length === Infinity && !(Number(definition.duration) > 0)) return '';
      const frames = sortedKeyframes(definition), duration = Math.max(1, Number(definition.duration) || 800);
      const position = frame => clamp(100 * (timing.start + frame.at / 100 * duration) / total, 0, 100);
      const path = editorCanvas.pathOf(element).join('/');
      let html = '';
      frames.forEach((frame, index) => {
        if (index < frames.length - 1) {
          const left = position(frame), right = position(frames[index + 1]);
          const ease = frame.ease || '';
          html += '<button class="anim-segment' + (ease === 'hold' ? ' is-hold' : ease ? ' is-eased' : '') + '" data-action="motion-ease" data-path="' + path + '" data-index="' + index + '" style="left:' + left.toFixed(2) + '%; width:' + Math.max(.5, right - left).toFixed(2) + '%"' +
            ' title="' + escapeHtml(ui('editor.segmentTooltip', { ease: this.easeLabel(ease) })) + '"></button>';
        }
        html += '<span class="anim-key' + (frame.ease === 'hold' ? ' is-hold' : '') + '" data-path="' + path + '" data-index="' + index + '" style="left:' + position(frame).toFixed(2) + '%"' +
          ' title="' + escapeHtml(ui('editor.keyTooltip', { at: frame.at, time: Math.round(timing.start + frame.at / 100 * duration) })) + '"></span>';
      });
      return html;
    },
    easeLabel(value) {
      const choice = EASE_CHOICES.find(([key]) => key === value);
      if (choice) return ui(choice[1]);
      const start = String(value).match(/^(hold|steps-\d{1,2})-start$/);   // (⇄ Reverse: it jumps at the start)
      const base = start && EASE_CHOICES.find(([key]) => key === start[1] || (start[1].startsWith('steps-') && key.startsWith('steps-')));
      return base ? ui('editor.easeJumpStart', { name: ui(base[1]) }) : value;
    },

    /** Pointer on the Animations tab: the ruler (scrub) and the keyframe diamonds (drag to another moment). True when handled. */
    onPanelPointerDown(event) {
      this.suppressClick = false;
      // the line between two keyframes lies on the bar: a click opens the easing window, a drag moves the bar (section 19);
      // the first and last keyframe (they cannot move by themselves) move the bar too
      const onBar = event.target.closest('.anim-track.is-draggable .anim-segment, .anim-track.is-draggable .anim-key');
      const endKey = onBar && onBar.matches('.anim-key') && (onBar.dataset.index === '0' || !onBar.nextElementSibling || !onBar.nextElementSibling.matches('.anim-segment, .anim-key'));
      const segment = onBar && (onBar.matches('.anim-segment') || endKey) ? onBar : null;
      if (segment && event.button === 0) {
        const bar = segment.parentElement.querySelector('.anim-bar'), startX = event.clientX, pointerId = event.pointerId;
        const stop = () => { window.removeEventListener('pointermove', onMove, true); window.removeEventListener('pointerup', stop, true); };
        const onMove = moveEvent => {
          if (Math.abs(moveEvent.clientX - startX) < 4) return;
          stop();
          this.suppressClick = true;   // the click that ends this drag opens no easing window
          editorTools.startTimelineDrag({ target: bar, button: 0, clientX: startX, pointerId, preventDefault() {} });
        };
        window.addEventListener('pointermove', onMove, true);
        window.addEventListener('pointerup', stop, true);
        return true;
      }
      const ruler = event.target.closest('.anim-ruler');
      if (ruler && event.button === 0) { event.preventDefault(); this.startScrub(event, ruler); return true; }
      const key = event.target.closest('.anim-key');
      if (key && event.button === 0 && !editorCanvas.locked() && !endKey) { event.preventDefault(); this.startKeyDrag(event, key); return true; }
      return false;
    },
    startScrub(event, ruler) {
      const total = Number(ruler.dataset.total) || 1000;
      const at = clientX => { const box = ruler.getBoundingClientRect(); return clamp(Math.round((clientX - box.left) / box.width * total / 10) * 10, 0, total); };
      this.scrubTo(at(event.clientX));
      const onMove = moveEvent => this.scrubTo(at(moveEvent.clientX), true);
      const onUp = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); editor.renderPanel(); };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    /** The canvas shows the slide `ms` after it came on, paused there. */
    scrubTo(ms, quick) {
      if (editorCode.running) editorTools.stopPlaying();   // (as Record)
      this.playhead = ms;
      this.scrubbing = true;   // playSlide (section 19) keeps the playhead for this
      try { if (editorTools.playStep < 0) editorTools.playSlide(); } finally { this.scrubbing = false; }
      const scene = editorCanvas.scene;
      if (!scene) return;
      editorTools.clearCanvasZoom();   // (a click's zoom is no part of the slide's timeline)
      scene.getAnimations({ subtree: true }).forEach(animation => {
        if (animation.effect && animation.effect.target === scene && ['scale', 'translate'].includes(animation.transitionProperty)) { animation.cancel(); return; }   // its zoom glide: not paused part-way
        try { animation.pause(); animation.currentTime = ms; } catch (e) { /* an animation without a timeline */ }
      });
      const head = editor.element.querySelector('.anim-playhead');
      const ruler = editor.element.querySelector('.anim-ruler');
      if (quick && head && ruler) { head.style.left = clamp(100 * ms / (Number(ruler.dataset.total) || 1000), 0, 100) + '%'; head.dataset.time = (ms / 1000).toFixed(2) + ' s'; }
      else if (!quick) editor.renderPanel();
      editorCanvas.drawSelection();
    },
    /** Shows the canvas at the playhead again after a redraw (the redraw makes it still). */
    restoreScrub() {
      if (this.playhead === null) return;
      const ms = this.playhead;
      requestAnimationFrame(() => { if (this.playhead === ms && editorTools.playStep < 0) this.scrubTo(ms); });
    },
    stopScrub() {
      this.playhead = null;
      this.setRecording(false);
    },
    startKeyDrag(event, key) {
      const element = editorCanvas.elementAtPath(key.dataset.path.split('/').map(Number));
      const name = element && element.getAttribute('data-animation');
      const definitions = editor.animations();
      if (!name || !definitions[name]) return;
      const frames = sortedKeyframes(definitions[name]);
      const index = Number(key.dataset.index);
      if (index === 0 || index === frames.length - 1) { showToast(ui('editor.keyEnds')); return; }   // the first and last one: change the delay or the duration
      const track = key.parentElement, width = track.getBoundingClientRect().width || 1;
      const total = Number(track.dataset.ktotal) || 1000, duration = Math.max(1, Number(definitions[name].duration) || 800);
      const startX = event.clientX, startAt = frames[index].at, baseLeft = parseFloat(key.style.left) || 0;
      const low = frames[index - 1].at + .5, high = frames[index + 1].at - .5;   // between its neighbours
      let at = startAt;
      key.classList.add('is-dragging');
      const onMove = moveEvent => {
        at = clamp(Math.round((startAt + (moveEvent.clientX - startX) / width * total / duration * 100) * 2) / 2, low, high);
        key.style.left = (baseLeft + (at - startAt) * duration / total) + '%';
        key.dataset.at = at + ' %';
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        key.classList.remove('is-dragging');
        if (at === startAt) return;
        editor.nextLabel = ui('editor.historyKeyTime');
        editor.record();
        editor.nextLabel = null;
        frames[index].at = at;
        definitions[name].keyframes = frames;
        editor.saveAnimations(definitions);
        editor.changed(editor.selected);
        editor.renderAll();   // the canvas too (paused at the playhead again: restoreScrub)
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },

    /* ======== RECORD ======== */

    setRecording(on) {
      this.recording = !!on;
      if (editor.element) editor.element.classList.toggle('is-recording', this.recording);
    },
    toggleRecording() {
      if (this.drawing) this.setDrawing(false);
      if (editorCode.running) editorTools.stopPlaying();   // scripts ran on the playing copy: never written (section 20e)
      if (!this.recording && this.playhead === null) this.scrubTo(1000);   // a moment to record at
      if (!this.recording) editorTools.clearCanvasZoom();   // Record moves things on the slide as it is, not zoomed in
      this.setRecording(!this.recording);
      editor.renderPanel();
      if (this.recording) showToast(ui('editor.recordOn'));
    },
    /** After a drag in Record: the move (or turn) becomes a keyframe at the playhead instead of a new place. True when it did. */
    recordDrag(element, mode, before, styleBefore) {
      if (!this.records(mode)) return false;
      const current = this.shownValues(element);   // what its animation shows now, at the playhead (paused)
      const angle = (parseFloat(before.styleRotate) || 0) * Math.PI / 180;
      let change;
      if (mode === 'move') {
        // the keyframe's x and y follow the element's own (turned) sides: the drag, turned back
        const dx = editorCanvas.freeValue(element, '--x') - before.left, dy = editorCanvas.freeValue(element, '--y') - before.top;
        change = { x: dx * Math.cos(angle) + dy * Math.sin(angle), y: -dx * Math.sin(angle) + dy * Math.cos(angle) };
      } else {
        const turned = (parseFloat(element.style.rotate) || 0) - before.rotate;
        change = { rotate: ((turned % 360) + 540) % 360 - 180 };   // the short way round
      }
      element.setAttribute('style', styleBefore);   // its place stays; the keyframe moves it
      if (!styleBefore) element.removeAttribute('style');
      if (Object.values(change).every(value => Math.abs(value) < 0.5)) return true;
      this.addKey(element, this.playhead, change, current);
      return true;
    },
    /** The values the element's animation shows now (x, y, scale, rotate from its transform; opacity), or null without one. */
    shownValues(element) {
      if (!element.hasAttribute('data-animation')) return null;
      const style = getComputedStyle(element);
      const matrix = new DOMMatrixReadOnly(style.transform === 'none' ? undefined : style.transform);
      const shown = { x: matrix.e, y: matrix.f, scale: Math.round(Math.hypot(matrix.a, matrix.b) * 1000) / 1000, rotate: Math.round(Math.atan2(matrix.b, matrix.a) * 1800 / Math.PI) / 10, opacity: Math.round(clamp(Number(style.opacity) / (parseFloat(element.style.getPropertyValue('--element-opacity')) || 1), 0, 1) * 1000) / 1000 };   // (its own opacity, Style, taken out: a keyframe holds the animation's part)
      // stretched or slanted: the matrix no longer tells scale and turn apart (they are then worked out from the keyframes)
      const definition = editor.animations()[element.getAttribute('data-animation')];
      if (definition && sortedKeyframes(definition).some(frame => ['scaleX', 'scaleY', 'skew'].some(key => frame[key] !== undefined && frame[key] !== ''))) { delete shown.scale; delete shown.rotate; }
      const shift = definition && originShift(definition.origin);
      if (shift) {   // its own turning point: the matrix's move holds the turn around it; taken out again (x = e − o + M·o)
        const ox = parseFloat(shift[0]) / 100 * element.offsetWidth, oy = parseFloat(shift[1]) / 100 * element.offsetHeight;
        shown.x = Math.round((matrix.e - ox + matrix.a * ox + matrix.c * oy) * 10) / 10;
        shown.y = Math.round((matrix.f - oy + matrix.b * ox + matrix.d * oy) * 10) / 10;
      }
      return shown;
    },
    /** Adds (or changes) a keyframe of the element's own animation at `ms` after the slide came on: its values there plus `change`. */
    addKey(element, ms, change, current) {
      if (ms <= 0) { showToast(ui('editor.recordLater')); return; }
      const definitions = editor.animations();
      let name = element.getAttribute('data-animation');
      let definition = name && definitions[name];
      if (definition && definition.trigger === 'click') { showToast(ui('editor.recordSlideOnly')); return; }
      if (definition && (definition.repeat === 'infinite' || Number(definition.repeat) > 1)) { showToast(ui('editor.recordOnce')); return; }   // a keyframe of one run only
      editor.nextLabel = ui('editor.historyRecord');
      editorCanvas.finishTyping();
      editor.record();
      editor.nextLabel = null;
      const shared = definition && editor.model.querySelectorAll('[data-animation="' + CSS.escape(name) + '"]').length > 1;
      if (!definition || shared) {   // its own animation (a shared one stays as it is for the others)
        let base = animationName((shared ? name : 'motion') + '-' + (editorTools.labelOf(element) || 'element')) || 'motion';
        let unique = base;
        for (let n = 2; hasOwn(definitions, unique); n++) unique = base + '-' + n;
        definitions[unique] = definition ? JSON.parse(JSON.stringify(definition))
          : { trigger: 'slide', duration: ms, delay: 0, easing: 'ease-in-out', repeat: 1, alternate: false, keyframes: [{ at: 0 }, { at: 100 }] };
        name = unique;
        definition = definitions[name];
        element.setAttribute('data-animation', name);
        editorLayers.setSpeed(element, '');
        editorLayers.setEase(element, '');
        element.classList.remove('reveal');   // its own animation replaces the rise-in
        element.style.removeProperty('--order');
        if (!element.getAttribute('style')) element.removeAttribute('style');
      }
      // keyframes in ms from the slide's start, every value filled in (a missing one would jump to its default)
      const delay = Math.max(0, Number(definition.delay) || 0), duration = Math.max(1, Number(definition.duration) || 800);
      const used = KEYFRAME_FIELDS.filter(key => key !== 'at' && (key in change || sortedKeyframes(definition).some(frame => frame[key] !== undefined && frame[key] !== '')));
      let keys = sortedKeyframes(definition).map(frame => Object.assign({}, frame, { time: delay + frame.at / 100 * duration }));
      const valueAt = (key, time) => {
        const known = keys.filter(frame => frame[key] !== undefined && frame[key] !== '').map(frame => ({ time: frame.time, value: Number(frame[key]) }));
        if (!known.length) return KEYFRAME_DEFAULTS[key];
        if (time <= known[0].time) return known[0].value;
        for (let i = 1; i < known.length; i++) if (time <= known[i].time) return known[i - 1].value + (known[i].value - known[i - 1].value) * (time - known[i - 1].time) / Math.max(1, known[i].time - known[i - 1].time);
        return known[known.length - 1].value;
      };
      keys.forEach(frame => used.forEach(key => { if (frame[key] === undefined || frame[key] === '') frame[key] = valueAt(key, frame.time); }));
      let target = keys.find(frame => Math.abs(frame.time - ms) < 20);
      if (!target) {
        target = { time: ms };
        keys.push(target);
      }
      // the values at that moment: as shown on the slide (with the animation's easing), else worked out from the keyframes
      used.forEach(key => { target[key] = current && definition.keyframes && key in current ? current[key] : (target[key] !== undefined && target[key] !== '' ? target[key] : valueAt(key, ms)); });
      Object.keys(change).forEach(key => { target[key] = Math.round((Number(target[key]) || 0) + change[key]); });
      keys.sort((a, b) => a.time - b.time);
      const start = keys[0].time, end = keys[keys.length - 1].time, length = Math.max(1, end - start);
      definition.delay = Math.round(start);
      definition.duration = Math.round(length);
      definition.keyframes = keys.map(frame => {
        const copy = Object.assign({}, frame, { at: Math.round((frame.time - start) / length * 1000) / 10 });
        delete copy.time;
        return copy;
      });
      // two keyframes at the same moment (e.g. 0 and 0): keep the later one
      definition.keyframes = definition.keyframes.filter((frame, index, list) => index === list.length - 1 || list[index + 1].at !== frame.at);
      editor.saveAnimations(definitions);
      editorCanvas.writeBack();
      editor.renderAll();
    },

    /* ======== EASING WINDOW ======== */

    /** Opens the easing window for the segment that starts at keyframe `index` of the element's animation. */
    openEase(anchor, element, index) {
      const name = element && element.getAttribute('data-animation');
      const definition = name && editor.animations()[name];
      if (!definition) return;
      this.closeEase();
      const frames = sortedKeyframes(definition);
      if (index >= frames.length - 1) return;
      const value = frames[index].ease || '';
      const box = document.createElement('div');
      box.className = 'editor-menu editor-ease';
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-label', ui('editor.easeTitle'));
      this.easeWindow = { box, element, name, index, value, anchor };
      box.innerHTML = '<p class="editor-menu-heading">' + escapeHtml(ui('editor.easeHeading', { from: frames[index].at, to: frames[index + 1].at })) + '</p>' +
        '<div class="ease-presets">' + EASE_CHOICES.map(([key, label]) => '<button data-ease="' + key + '"' + (key === value ? ' class="is-current"' : '') + ' title="' + escapeHtml(ui(label)) + '">' +
          easeCurveSvg(segmentEasing(key) || segmentEasing(definition.easing === 'elastic' ? 'back-out' : 'smooth') || 'ease') + '<span>' + escapeHtml(ui(label)) + '</span></button>').join('') + '</div>' +
        '<div class="ease-custom"><svg class="ease-editor" viewBox="-20 -40 240 280" width="200" height="232" aria-hidden="true"><path class="ease-grid" d="M0 200H200V0H0Z"/><line class="ease-arm ease-arm-1"/><line class="ease-arm ease-arm-2"/><path class="ease-line"/><circle class="ease-handle" data-handle="1" r="9"/><circle class="ease-handle" data-handle="2" r="9"/></svg>' +
        '<div><label class="editor-field"><span>' + escapeHtml(ui('editor.easeCss')) + '</span><input class="ease-css" spellcheck="false"></label>' +
        '<div class="ease-preview"><span class="ease-dot"></span></div>' +
        '<div class="editor-buttons"><button data-ease-action="copy">' + escapeHtml(ui('editor.easeCopy')) + '</button><button data-ease-action="paste"' + (this.copiedEase === null ? ' disabled' : '') + '>' + escapeHtml(ui('editor.easePaste')) + '</button></div></div></div>';
      editor.element.appendChild(box);
      // beside the right panel, at the height of what was clicked (it never covers the timeline you work in)
      const place = anchor.getBoundingClientRect();
      const panel = anchor.closest('.editor-panel') || anchor.closest('.editor-panel-body');
      const left = panel ? panel.getBoundingClientRect().left - box.offsetWidth - 10 : place.left;
      box.style.left = clamp(left, 8, window.innerWidth - box.offsetWidth - 8) + 'px';
      box.style.top = clamp(place.top + place.height / 2 - box.offsetHeight / 2, 8, Math.max(8, window.innerHeight - box.offsetHeight - 8)) + 'px';
      fitMenuOnScreen(box);
      this.showEase(value);
      box.addEventListener('click', clickEvent => {
        const preset = clickEvent.target.closest('[data-ease]');
        const action = clickEvent.target.closest('[data-ease-action]');
        if (preset) this.applyEase(preset.dataset.ease);
        else if (action && action.dataset.easeAction === 'copy') { this.copiedEase = this.easeWindow.value; box.querySelector('[data-ease-action="paste"]').disabled = false; showToast(ui('editor.easeCopied')); }
        else if (action && action.dataset.easeAction === 'paste' && this.copiedEase !== null) this.applyEase(this.copiedEase);
      });
      box.querySelector('.ease-css').addEventListener('change', changeEvent => {
        const text = changeEvent.target.value.trim();
        if (!text || segmentEasing(text)) this.applyEase(text); else { showToast(ui('editor.easeBad')); this.showEase(this.easeWindow.value); }
      });
      box.querySelector('.ease-editor').addEventListener('pointerdown', downEvent => this.dragHandle(downEvent));
      box.querySelector('.ease-editor').addEventListener('dblclick', clickEvent => {   // double-click a handle: that end straight again
        const handle = clickEvent.target.closest('.ease-handle');
        const css = segmentEasing(this.easeWindow && this.easeWindow.value) || segmentEasing('smooth');
        const values = ((css.match(/^cubic-bezier\(([^)]*)\)$/) || [])[1] || '.4,0,.2,1').split(',').map(Number);
        if (!handle) return;
        const straight = handle.dataset.handle === '1' ? [0, 0, values[2], values[3]] : [values[0], values[1], 1, 1];
        this.applyEase('cubic-bezier(' + straight.join(', ') + ')');
      });
      box.addEventListener('keydown', keyEvent => {
        if (keyEvent.key === 'Escape') { keyEvent.preventDefault(); keyEvent.stopPropagation(); this.closeEase(true); }
        else if (!keyEvent.ctrlKey && !keyEvent.metaKey) keyEvent.stopPropagation();   // typing here never reaches the slide (Ctrl+S, Ctrl+Z still work)
      });
      this.easeOutside = outsideEvent => { if (!box.contains(outsideEvent.target)) this.closeEase(); };
      document.addEventListener('pointerdown', this.easeOutside, true);
      const current = box.querySelector('.is-current') || box.querySelector('[data-ease]');
      if (current) current.focus();
    },
    /** The easing window shows `value`: the current preset, the curve with its handles, the text and the moving dot. */
    showEase(value) {
      const state = this.easeWindow;
      if (!state) return;
      state.value = value;
      const box = state.box;
      box.querySelectorAll('[data-ease]').forEach(button => button.classList.toggle('is-current', button.dataset.ease === value));
      const css = segmentEasing(value) || segmentEasing('smooth');
      box.querySelector('.ease-css').value = (segmentEasing(value) || '').startsWith('cubic-bezier') ? segmentEasing(value) : value;   // a curve as CSS, a spring or step by name
      const bezier = (css.match(/^cubic-bezier\(([^)]*)\)$/) || [])[1];
      const handles = bezier ? bezier.split(',').map(Number) : null;
      const editorSvg = box.querySelector('.ease-editor');
      editorSvg.classList.toggle('is-fixed', !handles);   // springs, hold, steps: drawn, no handles
      const f = easingFunction(css), points = [];
      for (let i = 0; i <= 60; i++) { const t = i / 60; points.push((t * 200).toFixed(1) + ' ' + (200 - f(t) * 200).toFixed(1)); }
      editorSvg.querySelector('.ease-line').setAttribute('d', 'M' + points.join('L'));
      if (handles) {
        const [x1, y1, x2, y2] = handles;
        const set = (selector, attributes) => Object.keys(attributes).forEach(key => editorSvg.querySelector(selector).setAttribute(key, attributes[key]));
        set('[data-handle="1"]', { cx: x1 * 200, cy: 200 - y1 * 200 });
        set('[data-handle="2"]', { cx: x2 * 200, cy: 200 - y2 * 200 });
        set('.ease-arm-1', { x1: 0, y1: 200, x2: x1 * 200, y2: 200 - y1 * 200 });
        set('.ease-arm-2', { x1: 200, y1: 0, x2: x2 * 200, y2: 200 - y2 * 200 });
      }
      const dot = box.querySelector('.ease-dot');
      dot.getAnimations().forEach(animation => animation.cancel());
      dot.animate([{ left: '0%' }, { left: '100%' }], { duration: 1100, easing: css, iterations: Infinity, direction: 'alternate', endDelay: 250 });
    },
    /** Dragging a handle of the curve: a cubic-bezier of your own (x between 0 and 1; y may overshoot). */
    dragHandle(event) {
      const handle = event.target.closest('.ease-handle');
      const state = this.easeWindow;
      if (!handle || !state) return;
      event.preventDefault();
      const svg = handle.ownerSVGElement;
      const css = segmentEasing(state.value) || segmentEasing('smooth');
      const start = ((css.match(/^cubic-bezier\(([^)]*)\)$/) || [])[1] || '.4,0,.2,1').split(',').map(Number);
      let values = start.slice();
      const toCurve = moveEvent => {
        const point = svg.createSVGPoint();
        point.x = moveEvent.clientX; point.y = moveEvent.clientY;
        const local = point.matrixTransform(svg.getScreenCTM().inverse());
        return { x: clamp(local.x / 200, 0, 1), y: clamp((200 - local.y) / 200, -1, 2) };
      };
      const which = handle.dataset.handle === '1' ? 0 : 2;
      const onMove = moveEvent => {
        const point = toCurve(moveEvent);
        values[which] = Math.round(point.x * 100) / 100;
        values[which + 1] = moveEvent.shiftKey ? (which === 0 ? 0 : 1) : Math.round(point.y * 100) / 100;   // Shift: flat
        this.showEase('cubic-bezier(' + values.join(', ') + ')');
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        if (values.join() !== start.join()) this.applyEase('cubic-bezier(' + values.join(', ') + ')');
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    /** Writes the easing into the keyframe (one undo step) and shows how it moves now. */
    applyEase(value) {
      const state = this.easeWindow;
      if (!state) return;
      const definitions = editor.animations();
      const definition = definitions[state.name];
      if (!definition) return;
      const frames = sortedKeyframes(definition);
      if (!frames[state.index]) return;
      if ((frames[state.index].ease || '') === value) { this.showEase(value); return; }
      editor.nextLabel = ui('editor.historyEase');
      editor.record();
      editor.nextLabel = null;
      if (value) frames[state.index].ease = value; else delete frames[state.index].ease;
      definition.keyframes = frames;
      editor.saveAnimations(definitions);
      editor.changed(editor.selected);
      this.showEase(value);
      const anchorPath = state.anchor && state.anchor.dataset.path;
      editor.renderPanel();
      if (anchorPath !== undefined) {   // the window stays at its segment (the panel was drawn again)
        const again = editor.element.querySelector('.anim-segment[data-path="' + anchorPath + '"][data-index="' + state.index + '"], [data-action="motion-ease-row"][data-index="' + state.index + '"]');
        if (again) state.anchor = again;
      }
      if (editorCanvas.selected === state.element) runSafely('ease preview', () => editorCanvas.previewAnimation());
    },
    /** True when it was open. */
    closeEase(focusBack) {
      const state = this.easeWindow;
      if (!state) return false;
      state.box.remove();
      this.easeWindow = null;
      document.removeEventListener('pointerdown', this.easeOutside, true);
      if (focusBack && state.anchor && state.anchor.isConnected) state.anchor.focus();
      return true;
    },

    /* ======== MOTION PATH ======== */

    /** Does the element's own animation move it (a path to show, smooth, add points to)? */
    hasPath(element) {
      const definition = element && editor.animations()[element.getAttribute('data-animation')];
      return !!definition && sortedKeyframes(definition).some(frame => (frame.x !== undefined && frame.x !== '' && Number(frame.x)) || (frame.y !== undefined && frame.y !== '' && Number(frame.y)));
    },
    /** The selected element's way over the slide (its keyframes' x and y): a dotted line, a dot per keyframe. */
    drawPath() {
      const overlay = editorCanvas.stageElement && editorCanvas.stageElement.querySelector('.editor-overlay');
      if (!overlay) return;
      let svg = overlay.querySelector('.editor-motion-path');
      const element = editorCanvas.selected;
      const definition = element && editorCanvas.scene && editorCanvas.scene.contains(element) && editor.animations()[element.getAttribute('data-animation')];
      const frames = definition ? sortedKeyframes(definition) : [];
      const moves = frames.some(frame => (frame.x !== undefined && frame.x !== '') || (frame.y !== undefined && frame.y !== ''));
      if (!moves) { if (svg) svg.remove(); return; }
      if (!svg) {
        svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'editor-motion-path');
        svg.setAttribute('viewBox', '0 0 ' + CONFIG.stage.width + ' ' + CONFIG.stage.height);
        svg.addEventListener('pointerdown', event => this.dragPathDot(event));
        if (!this.pathDoubleClickReady) {   // a double-click on a dot: that keyframe goes; on the line (not on the element): a keyframe there
          this.pathDoubleClickReady = true;
          document.addEventListener('dblclick', event => this.onPathDoubleClick(event), true);
        }
        overlay.insertBefore(svg, overlay.firstChild);   // under the selection's handles
      }
      const box = editorCanvas.boxInStage(element);
      const { points } = this.pathOnSlide(element, frames);
      const dotSize = 7 / editorCanvas.scale;
      const line = points.map(point => point.x.toFixed(1) + ',' + point.y.toFixed(1)).join(' ');
      svg.innerHTML = '<polyline points="' + line + '" style="stroke-width:' + (2 / editorCanvas.scale).toFixed(2) + 'px; stroke-dasharray:' + (6 / editorCanvas.scale).toFixed(1) + ' ' + (5 / editorCanvas.scale).toFixed(1) + '"/>' +
        // no dot where the element itself is now (dragging it there moves the element)
        points.map((point, index) => Math.hypot(point.x - (box.left + box.width / 2), point.y - (box.top + box.height / 2)) < 16 ? '' : '<circle class="motion-dot" data-index="' + index + '" cx="' + point.x.toFixed(1) + '" cy="' + point.y.toFixed(1) + '" r="' + dotSize.toFixed(1) + '"><title>' + escapeHtml(ui('editor.pathDotTooltip', { at: frames[index].at })) + '</title></circle>').join('');
    },
    /** The keyframes' x and y as points on the slide, and back (toFrame: a point on the slide as the x and y of a keyframe). */
    pathOnSlide(element, frames) {
      // where it is now, minus how far its animation moves it now: its own place
      const box = editorCanvas.boxInStage(element);
      const matrix = new DOMMatrixReadOnly(getComputedStyle(element).transform === 'none' ? undefined : getComputedStyle(element).transform);
      // the keyframes' x and y follow the element's own (turned) sides: turned onto the slide
      const angle = (parseFloat(element.style.rotate) || 0) * Math.PI / 180, cos = Math.cos(angle), sin = Math.sin(angle);
      const onSlide = (x, y) => ({ x: x * cos - y * sin, y: x * sin + y * cos });
      const shownOffset = onSlide(matrix.e, matrix.f);
      const middle = { x: box.left + box.width / 2 - shownOffset.x, y: box.top + box.height / 2 - shownOffset.y };
      const value = (frame, key) => Number.isFinite(Number(frame[key])) && frame[key] !== '' ? Number(frame[key]) : 0;
      const points = frames.map(frame => { const offset = onSlide(value(frame, 'x'), value(frame, 'y')); return { x: middle.x + offset.x, y: middle.y + offset.y }; });
      const toFrame = point => { const dx = point.x - middle.x, dy = point.y - middle.y; return { x: Math.round(dx * cos + dy * sin), y: Math.round(-dx * sin + dy * cos) }; };
      return { points, toFrame };
    },
    /** The element's path to change (one undo step): change(frames) gets its keyframes, sorted; false: nothing changed. */
    editPath(label, change) {
      const element = editorCanvas.selected;
      if (!element || editorCanvas.locked() || editorLayers.refuses([element])) return;
      const definitions = editor.animations(), name = element.getAttribute('data-animation');
      if (!definitions[name]) return;
      const frames = sortedKeyframes(definitions[name]);
      if (change(frames, element) === false) return;
      editor.nextLabel = ui(label);
      editorCanvas.change(() => {   // its own animation (a shared or ready-made one is copied first: the others keep theirs)
        const fresh = editor.animations();
        this.ownDefinition(fresh, element, 'path').keyframes = frames;
        editor.saveAnimations(fresh);
      }, { rerender: true });
      editor.nextLabel = null;
    },
    /** Is the pointer on the selected element's motion path (within 10 screen px of its line, not on the element itself)? */
    nearPath(event) {
      const element = editorCanvas.selected, stage = editorCanvas.stageElement;
      if (!element || !stage || !stage.querySelector('.editor-motion-path') || event.target.closest('.editor-move, .editor-handle, .editor-rotate, .motion-dot')) return false;
      if (editorCanvas.scene && editorCanvas.scene.contains(event.target) && !editorCanvas.isEmptySpot(event.target)) return false;   // another element under the line: it gets the click
      const definition = editor.animations()[element.getAttribute('data-animation')];
      if (!definition) return false;
      const at = editorCanvas.stagePoint(event), box = editorCanvas.boxInStage(element);
      if (at.x >= box.left && at.x <= box.left + box.width && at.y >= box.top && at.y <= box.top + box.height) return false;   // on the element: its own clicks (typing, dragging)
      const { points } = this.pathOnSlide(element, sortedKeyframes(definition));
      return points.slice(1).some((b, i) => {
        const a = points[i], length = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
        const t = length ? clamp(((at.x - a.x) * (b.x - a.x) + (at.y - a.y) * (b.y - a.y)) / length, 0, 1) : 0;
        return Math.hypot(a.x + (b.x - a.x) * t - at.x, a.y + (b.y - a.y) * t - at.y) * editorCanvas.scale < 10;
      });
    },
    onPathDoubleClick(event) {
      const stage = editorCanvas.stageElement, element = editorCanvas.selected;
      if (!editor.isOpen() || !stage || !element || !stage.contains(event.target) || !stage.querySelector('.editor-motion-path')) return;
      const dot = event.target.closest('.motion-dot');
      if (dot) { event.preventDefault(); event.stopPropagation(); this.removePathPoint(Number(dot.dataset.index)); return; }
      if (!this.nearPath(event)) return;
      event.preventDefault();
      event.stopPropagation();
      this.addPathPoint(event);
    },
    /** A double-click on the path: a keyframe there (at its share of the time between the two around it; the rest in between too). */
    addPathPoint(event) {
      const at = editorCanvas.stagePoint(event);
      this.editPath('editor.historyPathPoint', (frames, element) => {
        const { points, toFrame } = this.pathOnSlide(element, frames);
        let best = null;
        for (let i = 0; i < points.length - 1; i++) {   // the nearest piece of the line, and how far along it
          const a = points[i], b = points[i + 1], length = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
          const t = length ? clamp(((at.x - a.x) * (b.x - a.x) + (at.y - a.y) * (b.y - a.y)) / length, 0, 1) : 0;
          const distance = Math.hypot(a.x + (b.x - a.x) * t - at.x, a.y + (b.y - a.y) * t - at.y);
          if (!best || distance < best.distance) best = { i, t, distance };
        }
        if (!best) return false;
        const before = frames[best.i], after = frames[best.i + 1];
        const time = Math.round((before.at + (after.at - before.at) * best.t) * 10) / 10;
        if (time - before.at < 0.5 || after.at - time < 0.5) { showToast(ui('editor.pathPointTooClose')); return false; }
        const frame = { at: time };
        const set = value => value !== undefined && value !== '' && Number.isFinite(Number(value));
        KEYFRAME_FIELDS.filter(key => key !== 'at' && key !== 'x' && key !== 'y' && frames.some(other => set(other[key]))).forEach(key => {   // (a blank side: its normal value)
          const a = set(before[key]) ? Number(before[key]) : KEYFRAME_DEFAULTS[key], b = set(after[key]) ? Number(after[key]) : KEYFRAME_DEFAULTS[key];
          frame[key] = Math.round((a + (b - a) * best.t) * 100) / 100;
        });
        const a = points[best.i], b = points[best.i + 1];
        Object.assign(frame, toFrame({ x: a.x + (b.x - a.x) * best.t, y: a.y + (b.y - a.y) * best.t }));   // on the line itself: the way stays as it was
        if (before.ease) frame.ease = before.ease;   // both halves of the piece keep its easing
        frames.splice(best.i + 1, 0, frame);
      });
    },
    /** A double-click on a dot: that keyframe goes (two stay). */
    removePathPoint(index) {
      this.editPath('editor.historyPathPointRemove', frames => {
        if (frames.length <= 2 || !frames[index]) { showToast(ui('editor.tlKeyLast')); return false; }
        frames.splice(index, 1);
      });
    },
    /** 〰 Smooth: the path becomes a curve through its keyframes (more keyframes in between, at the same moments). */
    smoothPath() {
      this.editPath('editor.historyPathSmooth', frames => {
        const moving = frames.filter(frame => (frame.x !== undefined && frame.x !== '') || (frame.y !== undefined && frame.y !== ''));
        if (moving.length < 3) { showToast(ui('editor.pathSmoothNeedsThree')); return false; }
        const n = frames.length, steps = n <= 6 ? 4 : n <= 12 ? 3 : 2;
        if ((n - 1) * steps + 1 > CONFIG.editor.pathMaxKeys * 2) { showToast(ui('editor.pathSmoothTooMany')); return false; }
        const value = (frame, key) => (Number.isFinite(Number(frame[key])) && frame[key] !== '' ? Number(frame[key]) : KEYFRAME_DEFAULTS[key]);
        const closed = value(frames[0], 'x') === value(frames[n - 1], 'x') && value(frames[0], 'y') === value(frames[n - 1], 'y');
        const point = i => frames[closed ? (i + n - 1) % (n - 1) : clamp(i, 0, n - 1)];   // a way that comes back: it goes on round
        const result = [];
        for (let i = 0; i < n - 1; i++) {
          const p0 = point(i - 1), p1 = frames[i], p2 = frames[i + 1], p3 = point(i + 2);
          result.push(Object.assign({}, p1));
          for (let s = 1; s < steps; s++) {
            const t = s / steps, t2 = t * t, t3 = t2 * t;
            const curve = key => 0.5 * (2 * value(p1, key) + (-value(p0, key) + value(p2, key)) * t + (2 * value(p0, key) - 5 * value(p1, key) + 4 * value(p2, key) - value(p3, key)) * t2 + (-value(p0, key) + 3 * value(p1, key) - 3 * value(p2, key) + value(p3, key)) * t3);   // Catmull-Rom
            const frame = { at: Math.round((p1.at + (p2.at - p1.at) * t) * 10) / 10, x: Math.round(curve('x')), y: Math.round(curve('y')) };
            KEYFRAME_FIELDS.filter(key => !['at', 'x', 'y'].includes(key) && frames.some(other => other[key] !== undefined && other[key] !== '')).forEach(key => {   // (a blank side: its normal value)
              frame[key] = Math.round((value(p1, key) + (value(p2, key) - value(p1, key)) * t) * 100) / 100;
            });
            if (frame.at > p1.at && frame.at < p2.at) result.push(frame);   // (keyframes very close: none in between; every keyframe of yours stays)
          }
        }
        result.push(Object.assign({}, frames[n - 1]));
        result.forEach(frame => { delete frame.ease; });   // even steps along the curve (an easing per piece would make it jerk)
        frames.splice(0, n, ...result);
        showToast(ui('editor.pathSmoothed', { count: frames.length }));
      });
    },
    /* ======== DRAW A PATH ======== */

    setDrawing(on) {
      this.drawing = !!on;
      if (editor.element) editor.element.classList.toggle('is-drawing-path', this.drawing);
    },
    /** ✎ Draw a path: on (for the selected element) or off again. */
    toggleDrawing() {
      if (!this.drawing) {
        const element = editorCanvas.selected;
        if (!element || !editorCanvas.scene || !editorCanvas.scene.contains(element)) { showToast(ui('editor.drawPathPick')); return; }
        if (editorTools.group.length > 1) { showToast(ui('editor.recordOneElement')); return; }
        if (editorCanvas.locked()) { showToast(ui('editor.scriptedNote')); return; }
        if (editorLayers.refuses([element])) return;
        this.drawAt = this.playhead;   // ⏱: a path drawn now starts at the red line (stopping the slide takes the line away)
        if (editorTools.playStep >= 0 || this.playhead !== null) editorTools.stopPlaying();
        if (this.recording) this.setRecording(false);
        this.setDrawing(true);
        showToast(ui('editor.drawPathOn'));
      } else this.setDrawing(false);
      editor.renderPanel();
    },
    /** The press that starts the way: follow the pointer (a live line), let go: the path. Esc: nothing. */
    startPathDraw(event) {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();   // no selecting or dragging under it
      const element = editorCanvas.selected;
      const overlay = editorCanvas.stageElement && editorCanvas.stageElement.querySelector('.editor-overlay');
      // the same checks as when it was switched on: the slide or the element may have changed since
      const refused = !element || !overlay || !editorCanvas.scene.contains(element) || editorTools.group.length > 1 || editorTools.playStep >= 0 ||
        (editorCanvas.locked() && (showToast(ui('editor.scriptedNote')), true)) || editorLayers.refuses([element]);
      if (refused) { this.setDrawing(false); editor.renderPanel(); return; }
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'editor-path-drawing');
      svg.setAttribute('viewBox', '0 0 ' + CONFIG.stage.width + ' ' + CONFIG.stage.height);
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      line.style.strokeWidth = (3 / editorCanvas.scale).toFixed(2) + 'px';
      svg.appendChild(line);
      overlay.appendChild(svg);
      const points = [Object.assign(editorCanvas.stagePoint(event), { t: performance.now() })];   // (t: when, for ⏱ Your speed)
      const draw = () => line.setAttribute('points', points.map(point => point.x.toFixed(1) + ',' + point.y.toFixed(1)).join(' '));
      draw();
      const onMove = moveEvent => {
        const point = editorCanvas.stagePoint(moveEvent), last = points[points.length - 1];
        const now = performance.now();
        if (Math.hypot(point.x - last.x, point.y - last.y) * editorCanvas.scale < 3 && !(this.timedPath && now - last.t > 120)) return;   // (⏱: standing still is part of the timing)
        point.t = now;
        points.push(point);
        draw();
      };
      const finish = make => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onCancel);
        window.removeEventListener('keydown', onKey, true);
        svg.remove();
        this.setDrawing(false);
        if (make) this.makePath(element, points); else editor.renderPanel();
      };
      const onUp = () => finish(true);
      const onCancel = () => finish(false);
      const onKey = keyEvent => { if (keyEvent.key === 'Escape') { keyEvent.preventDefault(); keyEvent.stopPropagation(); finish(false); } };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);
      window.addEventListener('keydown', onKey, true);
    },
    /** The drawn points (slide px) become the element's own animation: a keyframe per bend, the same speed all the way. */
    makePath(element, raw, exact, prepare) {   // exact: the points as they are (a ready shape), never simplified; prepare(): in the same undo step, first
      const lengthOf = list => list.reduce((sum, point, index) => index ? sum + Math.hypot(point.x - list[index - 1].x, point.y - list[index - 1].y) : 0, 0);
      if (raw.length < 2 || lengthOf(raw) < 12) { showToast(ui('editor.drawPathShort')); editor.renderPanel(); return; }
      let tolerance = CONFIG.editor.pathTolerancePx;
      const timedRaw = !exact && this.timedPath && raw.every(point => Number.isFinite(point.t));
      // ⏱: time counts as a third direction (a pause or a change of speed is a bend in time), so it is kept too
      const simplify = limit => (timedRaw ? simplifyLine3(raw, limit, CONFIG.editor.pathTimeWeight) : simplifyLine(raw, limit));
      let points = exact ? raw : simplify(tolerance);
      while (points.length > CONFIG.editor.pathMaxKeys && !exact) points = simplify(tolerance *= 1.5);
      const total = Math.max(1, lengthOf(points));
      // x and y follow the element's own (turned) sides: the way, turned back
      const angle = (parseFloat(element.style.rotate) || 0) * Math.PI / 180, cos = Math.cos(angle), sin = Math.sin(angle);
      const direction = index => {   // where the way goes at this point (out of it; at the end: into it), in degrees
        const from = points[Math.min(index, points.length - 2)], to = points[Math.min(index, points.length - 2) + 1];
        return Math.atan2(to.y - from.y, to.x - from.x) * 180 / Math.PI;
      };
      const start = points[0], baseTurn = direction(0);
      const timed = !exact && this.timedPath && Number.isFinite(points[0].t), drawnMs = timed ? Math.max(1, points[points.length - 1].t - points[0].t) : 0;
      let walked = 0, lastTurn = 0;
      const frames = points.map((point, index) => {
        if (index) walked += Math.hypot(point.x - points[index - 1].x, point.y - points[index - 1].y);
        const dx = point.x - start.x, dy = point.y - start.y;
        const share = timed ? (point.t - points[0].t) / drawnMs : walked / total;   // ⏱: when you were there; else: how far along the way
        const frame = { at: index === points.length - 1 ? 100 : Math.round(share * 1000) / 10, x: Math.round(dx * cos + dy * sin), y: Math.round(-dx * sin + dy * cos) };
        if (this.orientPath) {
          let turn = direction(index) - baseTurn;
          while (turn - lastTurn > 180) turn -= 360;   // the short way round from the turn before
          while (turn - lastTurn < -180) turn += 360;
          frame.rotate = lastTurn = Math.round(turn);
          // a ready way that comes back where it started (◯, ∞): it ends turned all the way round, never a bit short
          if (exact && index === points.length - 1 && Math.hypot(point.x - start.x, point.y - start.y) < 1) frame.rotate = Math.round(lastTurn / 360) * 360;
        }
        return frame;
      }).filter((frame, index, list) => index === 0 || frame.at > list[index - 1].at);   // never two keyframes at the same moment
      editor.nextLabel = ui('editor.historyDrawPath');
      editorCanvas.change(() => {
        if (prepare) prepare();
        const definitions = editor.animations();
        const definition = this.ownDefinition(definitions, element, 'path');
        definition.keyframes = frames;
        definition.easing = 'linear';   // the same speed all the way (a segment can get its own easing afterwards)
        if (timed) {   // ⏱: as long as you took; from the red line when it stood on a moment
          definition.duration = Math.round(Math.max(200, drawnMs));
          if (Number.isFinite(this.drawAt) && definition.trigger !== 'click') definition.delay = Math.round(this.drawAt);
        }
        editor.saveAnimations(definitions);
        if (!element.getAttribute('style')) element.removeAttribute('style');
      }, { rerender: true });
      editor.nextLabel = null;
      this.drawAt = null;
      showToast(ui('editor.drawPathDone', { count: frames.length }));
      runSafely('path preview', () => editorCanvas.previewAnimation());
    },

    /** The element's animation as its own, to change: a shared or ready-made one is copied first (it stays as it is
        for the others); none yet: a new one (prefix-name). Inside a change. */
    ownDefinition(definitions, element, prefix) {
      let name = element.getAttribute('data-animation');
      let definition = name && definitions[name];
      const shared = definition && editor.model.querySelectorAll('[data-animation="' + CSS.escape(name) + '"]').length > 1;
      const ready = definition && hasOwn(ANIMATION_PRESETS, name);   // a quick animation's name: later quick buttons reuse it as it is
      if (definition && !shared && !ready) return definition;
      const base = animationName(prefix + '-' + (editorTools.labelOf(element) || 'element')) || prefix;
      let unique = base;
      for (let n = 2; hasOwn(definitions, unique); n++) unique = base + '-' + n;
      definitions[unique] = definition ? JSON.parse(JSON.stringify(definition)) : { trigger: 'slide', duration: CONFIG.editor.pathMs, delay: 0, repeat: 1, alternate: false };
      name = unique;
      element.setAttribute('data-animation', name);
      editorLayers.setSpeed(element, '');
      editorLayers.setEase(element, '');
      element.classList.remove('reveal');   // its own animation replaces the rise-in
      element.style.removeProperty('--order');
      unsplitText(element);   // the plain text first (the canvas copy would else be saved with its word spans)
      element.removeAttribute('data-split'); element.removeAttribute('data-split-effect'); element.removeAttribute('data-split-order');   // its animation decides how it appears
      return definitions[name];
    },
    /** May the selected element get a path or a change of its animation now? (A toast says why not.) */
    canMove(element) {
      if (!element || !editorCanvas.scene || !editorCanvas.scene.contains(element)) { showToast(ui('editor.drawPathPick')); return false; }
      if (editorTools.group.length > 1) { showToast(ui('editor.recordOneElement')); return false; }
      if (editorCanvas.locked()) { showToast(ui('editor.scriptedNote')); return false; }
      return !editorLayers.refuses([element]);
    },
    /** ◯ ⌒ ∿ ∞: a ready way for the element (from where it is, CONFIG.editor.pathShapePx big), the same speed all the way. */
    pathShape(shape) {
      const element = editorCanvas.selected;
      if (!this.canMove(element)) return;
      if (editorTools.playStep >= 0 || this.playhead !== null) editorTools.stopPlaying();
      if (this.drawing) this.setDrawing(false);
      const r = CONFIG.editor.pathShapePx, steps = CONFIG.editor.pathShapeSteps, points = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps, turn = 2 * Math.PI * t;
        if (shape === 'circle') points.push({ x: r * Math.sin(turn), y: r - r * Math.cos(turn) });   // clockwise, back where it started
        else if (shape === 'arc') points.push({ x: r - r * Math.cos(Math.PI * t), y: -r * Math.sin(Math.PI * t) });   // a jump up and over to the right
        else if (shape === 'wave') points.push({ x: 3 * r * t, y: -r / 2 * Math.sin(2 * turn) });   // two waves to the right
        else points.push({ x: r * Math.sin(turn), y: r / 2 * Math.sin(2 * turn) });   // a figure 8 on its side, back where it started
      }
      this.makePath(element, points, true);
    },
    /** Follow a shape: two selected, an element (the one selected first) and a shape: the element goes to the start of the shape's
        outline and gets a path once along it (the shape stays where it is, e.g. as a track to see). One undo step. */
    followShape() {
      const group = editorTools.group;
      if (group.length !== 2) { showToast(ui('editor.followNeedsTwo')); return; }
      const element = editorCanvas.selected && group.includes(editorCanvas.selected) ? editorCanvas.selected : group[0];
      const shape = group.find(item => item !== element);
      if (!shape.matches('.shape')) { showToast(ui('editor.followNeedsShape')); return; }
      if (!editorCanvas.isFree(element)) { showToast(ui('editor.followNeedsFree')); return; }
      if (parseFloat(shape.style.rotate) || editorTools.refusesInTurnedGroup()) { if (parseFloat(shape.style.rotate)) showToast(ui('editor.followTurned')); return; }
      if (editorCanvas.locked() || editorLayers.refuses([element])) return;
      let part = shape.querySelector('svg :is(path, polygon, rect, ellipse, circle, polyline, line)');
      if (!part || typeof part.getTotalLength !== 'function') return;
      // a path of several strokes (the cross): only its first one (between strokes the element would cut across)
      const strokes = part.matches('path') ? (part.getAttribute('d') || '').split(/(?=[Mm])/).filter(piece => piece.trim()) : [];
      let helper = null;
      if (strokes.length > 1) { helper = part.cloneNode(false); helper.setAttribute('d', strokes[0]); part.after(helper); part = helper; }
      // the boxes as they are, not as an animation of theirs ends in this still view (nor a preview that still plays)
      editorCanvas.stopPreview();
      element.classList.add('is-previewing'); shape.classList.add('is-previewing');
      const box = editorCanvas.boxInStage(shape), own = editorCanvas.boxInStage(element);
      element.classList.remove('is-previewing'); shape.classList.remove('is-previewing');
      const total = part.getTotalLength(), steps = CONFIG.editor.pathMaxKeys;
      const points = [];
      const flipX = shape.style.getPropertyValue('--flip-x').trim() === '-1', flipY = shape.style.getPropertyValue('--flip-y').trim() === '-1';   // a flipped shape (its drawing is mirrored)
      const view = shape.querySelector('svg').viewBox.baseVal, vw = view && view.width || 100, vh = view && view.height || 100;   // (a connector arrow draws in pixels)
      for (let i = 0; i <= steps; i++) { const p = part.getPointAtLength(total * i / steps); points.push({ x: box.left + (flipX ? vw - p.x : p.x) / vw * box.width, y: box.top + (flipY ? vh - p.y : p.y) / vh * box.height }); }
      if (helper) helper.remove();
      const start = points[0];
      if (editorTools.playStep >= 0 || this.playhead !== null) editorTools.stopPlaying();
      editorTools.group = [];
      editorTools.drawGroup();
      editorCanvas.selectElement(element);
      this.makePath(element, points, true, () => editorTools.shift(element, start.x - (own.left + own.width / 2), start.y - (own.top + own.height / 2)));   // its middle on the start of the outline
    },
    /** ⇄: the animation played backwards (a rise-in becomes a sink-out): the keyframes in the other order, each easing turned round. */
    reverseAnimation() {
      const element = editorCanvas.selected;
      if (!this.canMove(element)) return;
      const definitions = editor.animations(), name = element.getAttribute('data-animation');
      if (!name || !definitions[name]) return;
      const { repeat, alternate } = definitions[name];
      if (alternate && (repeat === 'infinite' || Number(repeat) % 2 === 0)) { showToast(ui('editor.reverseAlternate')); return; }   // there and back: backwards it is the same
      if (editorTools.playStep >= 0 || this.playhead !== null) editorTools.stopPlaying();
      editor.nextLabel = ui('editor.historyReverse');
      editorCanvas.change(() => {
        const fresh = editor.animations();
        const definition = this.ownDefinition(fresh, element, 'reversed');
        const frames = sortedKeyframes(definition);
        // a frame's ease is the way to the next one: backwards it belongs to the frame after it, turned round
        definition.keyframes = frames.map((frame, index) => {
          const copy = Object.assign({}, frame, { at: Math.round((100 - frame.at) * 10) / 10 });
          delete copy.ease;
          const before = frames[index - 1];
          if (before && before.ease) copy.ease = reversedEasing(before.ease);
          return copy;
        }).reverse();
        definition.easing = reversedEasing(definition.easing || 'ease-out');   // (none: it plays ease-out)
        editor.saveAnimations(fresh);
      }, { rerender: true });
      editor.nextLabel = null;
      showToast(ui('editor.reversed'));
      runSafely('reverse preview', () => editorCanvas.previewAnimation());
    },

    /* ======== MORPH PAIRING ======== */

    /** The elements with the same morph name on the next and the previous slide. */
    morphPartners(element) {
      const name = element.getAttribute('data-morph');
      const scenes = editor.modelScenes(), index = scenes.indexOf(editor.selected);
      const find = scene => (name && scene ? scene.querySelector('[data-morph="' + CSS.escape(name) + '"]') : null);
      return { to: find(scenes[index + 1]), from: index > 0 ? find(scenes[index - 1]) : null, index };
    },
    morphCandidates(scene) {
      if (!scene) return [];
      const ownText = node => !INLINE_TAGS.has(node.tagName) && Array.from(node.childNodes).some(child => child.nodeType === 3 && child.nodeValue.trim());   // a block with text of its own
      return Array.from(scene.querySelectorAll('*')).filter(node => (node.matches(MORPH_CANDIDATES) || ownText(node)) && !node.closest('svg, .speaker-notes, template, [hidden]') &&
        !(node.matches('img') && node.parentElement.matches('.image-frame')) && (editorTools.textOf(node) || node.matches('img, .image-frame, .video-frame, .shape')));
    },
    /** The Morph group of the Element tab: the name, where it glides to and from, Pair with the next slide. */
    morphSectionHtml(element, disabled) {
      const { to, from, index } = this.morphPartners(element);
      const hasNext = !!editor.modelScenes()[index + 1];
      const where = (node, number) => ui('editor.morphWhere', { label: editorTools.labelOf(node), number });
      return '<h4 data-ui="editor.sectionMorph"></h4>' +
        editor.field('editor.morphName', '<input data-element-field="morph"' + disabled + ' value="' + escapeHtml(element.getAttribute('data-morph') || '') + '">', ui('editor.morphNote')) +
        (to ? '<p class="editor-note morph-link">→ ' + escapeHtml(ui('editor.morphTo', { where: where(to, index + 2) })) + '</p>' : '') +
        (from ? '<p class="editor-note morph-link">← ' + escapeHtml(ui('editor.morphFrom', { where: where(from, index) })) + '</p>' : '') +
        (hasNext ? '<div class="editor-buttons"><button data-action="morph-pair"' + disabled + ' data-ui="editor.morphPair" data-ui-title="editor.morphPairTooltip"></button></div>' : '');
    },
    /** The next slide's elements to choose from. */
    openMorphPicker(button) {
      const element = editorCanvas.selected;
      const scenes = editor.modelScenes(), index = scenes.indexOf(editor.selected), next = scenes[index + 1];
      if (!element || !editorCanvas.scene || !editorCanvas.scene.contains(element)) { showToast(ui('editor.morphPick')); return; }
      if (!next) { showToast(ui('editor.morphNoNext')); return; }
      const current = this.morphPartners(element).to;
      const list = this.morphCandidates(next);
      const seen = node => { if (!node) return false; const box = node.getBoundingClientRect(); return box.width > 0 && box.left >= 0 && box.right <= window.innerWidth && box.top >= 0 && box.bottom <= window.innerHeight; };   // (a hidden dock's button is off-screen)
      const anchor = [button, editor.element.querySelector('.editor-quickbar:not([hidden]) [data-action="bar-animate"]'), editor.element.querySelector('.editor-menubar [data-menu-id="animate"]')].find(seen) || editor.element.querySelector('.editor-menubar');
      editorLayers.openList(anchor, 'editor-morph-menu', '<p class="editor-note">' + escapeHtml(ui('editor.morphPickNote', { number: index + 2 })) + '</p>' +
        (list.length ? list.map((node, i) => '<button data-action="morph-choose" data-index="' + i + '"' + (node === current ? ' class="is-current"' : '') + '>' + escapeHtml(editorTools.labelOf(node)) + '</button>').join('')
          : '<p class="editor-note">' + escapeHtml(ui('editor.morphNothing')) + '</p>'));
    },
    /** Gives the element and the chosen one on the next slide the same morph name (one undo step). */
    pairMorph(choice) {
      editorLayers.closeHistory();
      const element = editorCanvas.selected;
      const scenes = editor.modelScenes(), index = scenes.indexOf(editor.selected), next = scenes[index + 1];
      const target = this.morphCandidates(next)[choice];
      if (!element || !target) return;
      if (editorCanvas.locked()) { showToast(ui('editor.scriptedNote')); return; }
      if (editorLayers.refuses([element])) return;
      const own = element.getAttribute('data-morph'), theirs = target.getAttribute('data-morph');
      const has = (scene, morph) => !!(scene && morph && scene.querySelector('[data-morph="' + CSS.escape(morph) + '"]'));
      const ownChain = has(scenes[index - 1], own), theirChain = has(scenes[index + 2], theirs);
      let name = theirChain && !ownChain ? theirs : own || theirs;   // the target already glides on to the slide after: keep its name
      const renameChain = ownChain && theirChain && own !== theirs;   // both glide on: the target's way onwards takes this name
      if (!name) {
        const used = new Set(Array.from(editor.model.querySelectorAll('[data-morph]')).map(node => node.getAttribute('data-morph')));
        const base = animationName(editorTools.labelOf(element)) || 'morph';
        name = base;
        for (let n = 2; used.has(name); n++) name = base + '-' + n;
      }
      editor.nextLabel = ui('editor.historyMorph');
      editorCanvas.change(() => {
        next.querySelectorAll('[data-morph="' + CSS.escape(name) + '"]').forEach(old => { if (old !== target) old.removeAttribute('data-morph'); });   // one partner on that slide
        editorCanvas.scene.querySelectorAll('[data-morph="' + CSS.escape(name) + '"]').forEach(old => { if (old !== element) old.removeAttribute('data-morph'); });   // and on this one
        if (renameChain) {   // the slides after: the element that carried the target's name onwards gets this name
          for (let i = index + 2; i < scenes.length; i++) {
            const onward = scenes[i].querySelector('[data-morph="' + CSS.escape(theirs) + '"]');
            if (!onward || scenes[i].querySelector('[data-morph="' + CSS.escape(name) + '"]')) break;
            onward.setAttribute('data-morph', name);
            editor.changed(onward);
          }
        }
        target.setAttribute('data-morph', name);
        element.setAttribute('data-morph', name);
        editor.changed(target);
      });
      editor.nextLabel = null;
      editor.renderSlideList();
      showToast(ui('editor.morphPaired', { label: editorTools.labelOf(target), number: index + 2 }));
    },

    /** Dragging a dot of the motion path: that keyframe's x and y (one undo step). */
    dragPathDot(event) {
      const dot = event.target.closest('.motion-dot');
      const element = editorCanvas.selected;
      if (!dot || !element || event.button !== 0 || editorCanvas.locked() || editorLayers.refuses([element])) return;
      event.preventDefault();
      event.stopPropagation();
      const definitions = editor.animations(), name = element.getAttribute('data-animation');
      if (!definitions[name]) return;
      const frames = sortedKeyframes(definitions[name]), index = Number(dot.dataset.index), frame = frames[index];
      const start = { x: Number(frame.x) || 0, y: Number(frame.y) || 0, clientX: event.clientX, clientY: event.clientY, cx: Number(dot.getAttribute('cx')), cy: Number(dot.getAttribute('cy')) };
      let moved = null;
      const onMove = moveEvent => {
        const dx = (moveEvent.clientX - start.clientX) / editorCanvas.scale, dy = (moveEvent.clientY - start.clientY) / editorCanvas.scale;
        const angle = (parseFloat(element.style.rotate) || 0) * Math.PI / 180;   // into the element's own (turned) sides
        moved = { x: Math.round(start.x + dx * Math.cos(angle) + dy * Math.sin(angle)), y: Math.round(start.y - dx * Math.sin(angle) + dy * Math.cos(angle)) };
        dot.setAttribute('cx', start.cx + dx);
        dot.setAttribute('cy', start.cy + dy);
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        if (!moved) return;
        Object.assign(frame, moved);
        editor.nextLabel = ui('editor.historyPath');
        editorCanvas.change(() => {   // its own animation (a shared or ready-made one is copied first)
          const fresh = editor.animations();
          this.ownDefinition(fresh, element, 'path').keyframes = frames;
          editor.saveAnimations(fresh);
        }, { rerender: true });
        editor.nextLabel = null;
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
  };
