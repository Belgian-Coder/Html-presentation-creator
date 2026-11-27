  /* ===========================================================================
     20d. EDITOR TIMELINE: the animation panel along the bottom (the object editorTimeline)
     WHAT IT SHOWS   one row per element that appears or moves on this slide, for one
                     part of the slide at a time: "With the slide", "Click 1", "Click 2" …
                     (the buttons at the top). A bar runs from when it starts to when it
                     has finished; an animation of its own shows its keyframes (◆) on
                     the bar, and ▸ opens one line per property (opacity, X, Y, scale,
                     rotation, blur) with the keyframes that set it.
     DRAG            the bar: later or earlier (an animation of its own: its delay, in
                       steps of 10 ms; one that rises in with the slide: its order); it
                       pulls to the start and end of the other bars and to the playhead
                       (Alt: no pull, 1 ms steps). The left end: the start (the end
                       stays); the right end: how long it takes (an animation of its
                       own: its duration; otherwise its Speed). A ◆: that keyframe to
                       another moment (the first and last: the start and the end).
                       The ruler: the slide at that moment (the playhead).
     PROPERTIES      under ▸, "+ property" adds a line (e.g. rotation) to the animation,
                     at its normal value in every keyframe (then drag its dots in Graph);
                     × on a line takes that property out of all keyframes.
     COPY / PASTE    Ctrl+C copies the selected ◆ (their values and the time between
                     them); Ctrl+V puts them into the selected element's own animation
                     at the red line (or after its last keyframe). What the copied ◆ do
                     not set follows the animation there.
     EASING          right-click the line between two ◆ (or a ◆, or a bar): a list of
                     easings with their curves for that segment (with several ◆
                     selected: the segments that start at them; on a bar: all its
                     segments). "Ease ▾" at the top does the same for the selected ◆, or
                     else for the selected element's whole animation.
     CLICK           a name: select the element; the line between two ◆: how it
                       moves there (the easing window); a ◆: select it (Delete removes
                       it); double-click on a track: a keyframe there, with the values
                       the element shows at that moment.
     SEVERAL ◆       Shift+click adds one to the selection (or takes it out); a drag on
                     an empty part of the tracks draws a box that selects the ◆ in it.
                     Dragging one of them moves them all (each stays between its
                     neighbours that are not selected); Delete removes them all.
     GRAPH           "Graph" shows a property line as its curve: the value over time,
                     with the easing of each segment (an overshoot shows above the
                     line). Drag a dot up or down for its value, left or right for its
                     moment. ▸ (or Graph) opens the lines of the selected element.
     VIEW            Ctrl+wheel or − / + zoom, Fit shows the whole part; the top edge
                     changes the height; T (or View › Timeline) shows or hides it
                     (remembered in this browser).
     All changes are plain edits of the file (the ANIMATIONS block, --order, the speed),
     one undo step each, as in the Animations tab.
     =========================================================================== */

  const TIMELINE_KEY = 'presentation-editor.timeline';
  const TIMELINE_LANES = ['opacity', 'x', 'y', 'scale', 'rotate', 'blur', 'scaleX', 'scaleY', 'skew', 'brightness', 'hue'];

  const editorTimeline = {
    open: true,
    height: 230,
    section: 0,            // 0: with the slide; n: click n
    zoom: null,            // px per ms; null: the whole part fits
    expanded: new Set(),   // rows with their property lines open (paths)
    selectedKeys: new Set(),   // the selected ◆: 'path|index'
    graph: false,          // property lines as curves
    dragging: false,
    scale: null,           // { px, total, kind } of the last drawing

    setUp() {
      const element = editor.element;
      // closed the first time (a basic user sees the slide, not a timeline); View › Timeline or T opens it, and that is remembered
      try { Object.assign(this, (({ open, height }) => ({ open: open === true, height: Number(height) || Math.round(clamp(window.innerHeight * .26, 150, 230)) }))(JSON.parse(localStorage.getItem(TIMELINE_KEY) || '{}'))); } catch (e) { /* defaults */ }
      const box = this.box();
      box.addEventListener('pointerdown', event => this.onPointerDown(event));
      box.addEventListener('click', event => this.onClick(event));
      box.addEventListener('dblclick', event => this.onDoubleClick(event));
      box.addEventListener('contextmenu', event => this.onContextMenu(event));
      box.addEventListener('change', event => this.onChange(event));
      box.querySelector('.timeline-body').addEventListener('wheel', event => this.onWheel(event), { passive: false });
      window.addEventListener('resize', () => { if (editor.isOpen()) this.apply(); });
      this.apply();
      element.classList.toggle('timeline-open', this.open);
    },
    box() { return editor.element && editor.element.querySelector('.editor-timeline'); },
    remember() { try { localStorage.setItem(TIMELINE_KEY, JSON.stringify({ open: this.open, height: this.height })); } catch (e) { /* not remembered */ } },
    apply() {
      this.height = clamp(this.height, 120, Math.max(120, Math.round(window.innerHeight * .6)));   // (remembered from a larger window: the slide keeps room)
      editor.element.style.setProperty('--timeline-height', this.height + 'px');
      editor.element.classList.toggle('timeline-open', this.open);
      const toggle = editor.element.querySelector('[data-action="view-timeline"]');
      if (toggle) toggle.setAttribute('aria-pressed', String(this.open));
    },
    toggle(open = !this.open) {
      this.open = open;
      this.remember();
      this.apply();
      this.render();
      requestAnimationFrame(() => { if (editorCanvas.stageElement) editorCanvas.fit(); });   // the slide gets the room
    },

    /* ======== DRAWING ======== */

    /** The rows of the shown part: { element, path, timing, definition, own, shared }. */
    rows() {
      const { slide, clicks } = editorTools.animatedElements();
      const steps = Array.from(clicks.keys()).sort((a, b) => a - b);
      if (this.section && !clicks.has(this.section)) this.section = 0;
      const kind = this.section ? 'click' : 'slide';
      const definitions = editor.animations();
      const list = (this.section ? clicks.get(this.section) : slide) || [];
      return { steps, kind, rows: list.map(element => {
        const name = element.getAttribute('data-animation');
        const definition = name && definitions[name] && typeof definitions[name] === 'object' ? definitions[name] : null;
        const shared = !!definition && editor.model.querySelectorAll('[data-animation="' + CSS.escape(name) + '"]').length > 1;
        return { element, path: editorCanvas.pathOf(element).join('/'), timing: editorTools.timingOf(element, kind), definition, name, own: !!definition && !shared, shared };
      }) };
    },
    render() {
      const box = this.box();
      if (!box || !this.open || this.dragging) return;
      const hadKeyboard = box.contains(document.activeElement) && !document.activeElement.matches('input');   // (a button it draws again would drop it to the page: Delete would reach the slide)
      // 2: selected ◆ belong to the keyframes as they were picked: anything else changed them (another slide, undo, Record …): none selected
      if (this.selectedKeys.size && this.selectionStamp !== this.stamp()) this.selectedKeys.clear();
      const body = box.querySelector('.timeline-body');
      const sections = box.querySelector('.timeline-sections');
      if (!editorCanvas.scene) { body.innerHTML = ''; sections.innerHTML = ''; return; }
      editorTools.makeTimingProbe();   // the timings the slide's CSS gives (as the Animations tab)
      const { steps, kind, rows } = this.rows();
      sections.innerHTML = [0].concat(steps).map(step => '<button data-tl="section" data-section="' + step + '"' + (step === this.section ? ' class="is-current"' : '') + '>' +
        escapeHtml(step ? ui('editor.onClick', { number: step }) : ui('editor.withSlide')) + '</button>').join('');
      if (!rows.length) { body.innerHTML = '<p class="editor-note timeline-empty">' + escapeHtml(ui('editor.tlEmpty')) + '</p>'; this.scale = null; return; }
      const end = row => row.timing.start + (row.timing.length === Infinity ? 1500 : row.timing.length);
      const total = Math.max(1000, ...rows.map(end)) * 1.15 + 200;
      const label = CONFIG.editor.timelineLabelPx;
      const fit = Math.max(.01, (body.clientWidth - label - 28) / total);   // (room for a scrollbar: Fit never scrolls sideways)
      const px = this.zoom || fit;
      this.scale = { px, total, kind, fit };
      const x = ms => (ms * px).toFixed(1);
      const width = Math.ceil(total * px);
      const locked = editorCanvas.locked();
      // the ruler: a label every ~80 px
      const step = [20, 50, 100, 200, 250, 500, 1000, 2000, 5000, 10000].find(candidate => candidate * px >= 70) || 10000;
      let ticks = '';
      for (let ms = 0; ms <= total; ms += step) ticks += '<span style="left:' + x(ms) + 'px">' + (ms >= 1000 || step >= 1000 ? (ms / 1000).toFixed(step % 1000 ? 1 : 0) + ' s' : ms + ' ms') + '</span>';
      const playhead = kind === 'slide' && editorMotion.playhead !== null ? '<div class="tl-playhead" style="left:' + (label + editorMotion.playhead * px).toFixed(1) + 'px" data-time="' + (editorMotion.playhead / 1000).toFixed(2) + ' s"></div>' : '';
      let html = '<div class="tl-grid" style="--tl-label:' + label + 'px; width:' + (label + width) + 'px">' +
        '<div class="tl-ruler-row"><div class="tl-label tl-corner">' + escapeHtml(ui('editor.tlRulerNote')) + '</div><div class="tl-ruler' + (kind === 'slide' ? '' : ' is-off') + '" style="width:' + width + 'px" title="' + escapeHtml(ui(kind === 'slide' ? 'editor.rulerTooltip' : 'editor.tlRulerClick')) + '">' + ticks + '</div></div>';
      rows.forEach(row => {
        const { element, path, timing, definition, own } = row;
        const selected = element === editorCanvas.selected;
        const frames = definition ? sortedKeyframes(definition) : [];
        const duration = definition ? Math.max(1, Number(definition.duration) || 800) : 0;
        const keyAt = frame => timing.start + frame.at / 100 * duration;
        const what = this.whatDragDoes(row);
        const loop = timing.length === Infinity;
        const barWidth = Math.max(6, (loop ? total - timing.start : timing.length) * px);
        const handles = locked ? '' : (what.start ? '<span class="tl-handle is-start" data-tl="start" title="' + escapeHtml(ui('editor.tlStartTooltip')) + '"></span>' : '') +
          (what.end && !loop ? '<span class="tl-handle is-end" data-tl="end" title="' + escapeHtml(ui('editor.tlEndTooltip')) + '"></span>' : '');
        let keys = '';
        if (definition) frames.forEach((frame, index) => {
          if (index < frames.length - 1) keys += '<span class="tl-seg' + (frame.ease ? ' is-eased' : '') + '" data-tl="seg" data-index="' + index + '" style="left:' + x(keyAt(frame)) + 'px; width:' + Math.max(2, (keyAt(frames[index + 1]) - keyAt(frame)) * px).toFixed(1) + 'px" title="' + escapeHtml(ui('editor.segmentTooltip', { ease: editorMotion.easeLabel(frame.ease || '') })) + '"></span>';
          keys += this.keyHtml(path, index, x(keyAt(frame)), Math.round(keyAt(frame)), !own);
        });
        const twist = definition && frames.length ? '<button class="tl-twist" data-tl="expand" aria-expanded="' + this.expanded.has(path) + '" title="' + escapeHtml(ui('editor.tlExpand')) + '">' + (this.expanded.has(path) ? '▾' : '▸') + '</button>' : '<span class="tl-twist"></span>';
        const stepField = kind === 'click' && !definition ? '<input class="tl-step" type="number" min="1" max="40" data-tl-step data-path="' + path + '" value="' + (revealStepOf(element) || playStepOf(element)) + '"' + (locked ? ' disabled' : '') + ' title="' + escapeHtml(ui('editor.clickNumber')) + '">' : '';
        html += '<div class="tl-row' + (selected ? ' is-selected' : '') + '" data-path="' + path + '">' +
          '<div class="tl-label">' + twist + '<button class="tl-name" data-tl="select" title="' + escapeHtml(editorTools.actionOf(element)) + '">' + escapeHtml(this.nameOf(element)) + '</button>' + stepField + '</div>' +
          '<div class="tl-track" style="width:' + width + 'px" title="' + escapeHtml(ui('editor.timing', { start: Math.round(timing.start), length: loop ? '∞' : Math.round(timing.length) }) + ' · ' + ui(what.note)) + '">' +
            '<div class="tl-bar' + (loop ? ' is-loop' : '') + (what.bar ? '' : ' is-fixed') + (definition ? ' has-keys' : '') + '" data-tl="bar" style="left:' + x(timing.start) + 'px; width:' + barWidth.toFixed(1) + 'px">' + handles + '</div>' + keys +
          '</div></div>';
        if (this.expanded.has(path) && definition) {
          TIMELINE_LANES.filter(lane => frames.some(frame => frame[lane] !== undefined && frame[lane] !== '')).forEach(lane => {
            const laneName = escapeHtml(ui('editor.key' + lane.replace(/^./, c => c.toUpperCase())));
            if (this.graph) { html += this.graphLaneHtml(row, lane, laneName, frames, keyAt, width, px); return; }
            let laneKeys = '';
            frames.forEach((frame, index) => { if (frame[lane] !== undefined && frame[lane] !== '') laneKeys += this.keyHtml(path, index, x(keyAt(frame)), Math.round(keyAt(frame)), !own, lane + ' ' + frame[lane]); });
            html += '<div class="tl-row tl-lane" data-path="' + path + '"><div class="tl-label"><span class="tl-twist"></span><span class="tl-lane-name">' + laneName + '</span>' + this.laneRemoveHtml(row, lane) + '</div>' +
              '<div class="tl-track" style="width:' + width + 'px">' + laneKeys + '</div></div>';
          });
          html += this.addLaneHtml(row, frames, width);
        }
      });
      html += playhead + '</div>';
      const scroll = { left: body.scrollLeft, top: body.scrollTop };
      body.innerHTML = html;
      body.scrollLeft = scroll.left;
      body.scrollTop = scroll.top;
      if (hadKeyboard && !box.contains(document.activeElement)) box.focus({ preventScroll: true });
      box.querySelector('[data-tl="zoom-fit"]').classList.toggle('is-current', !this.zoom);
      box.querySelector('[data-tl="graph"]').classList.toggle('is-current', this.graph);
      box.querySelector('[data-tl="graph"]').setAttribute('aria-pressed', String(this.graph));
    },
    /** Its name as the slide shows it at the end (a number that counts up: its final value, also while the slide is paused). */
    nameOf(element) {
      if (!element.querySelector('.count-up')) return editorTools.labelOf(element);
      const copy = element.cloneNode(true);
      copy.querySelectorAll('.count-up').forEach(number => { number.textContent = number.dataset.to ? countUpText(number, parseFloat(number.dataset.to)) : number.textContent; });
      return editorTools.labelOf(copy);
    },
    keyHtml(path, index, left, ms, fixed, value) {
      const selected = this.selectedKeys.has(path + '|' + index);
      return '<span class="tl-key' + (selected ? ' is-selected' : '') + (fixed ? ' is-fixed' : '') + '" data-tl="key" data-path="' + path + '" data-index="' + index + '" style="left:' + left + 'px" title="' + escapeHtml((value ? value + ' · ' : '') + ui('editor.tlKeyTooltip', { time: ms })) + '"></span>';
    },
    /** A property line as a curve: its value at each keyframe (a dot) and in between (with each segment's easing). */
    graphLaneHtml(row, lane, laneName, frames, keyAt, width, px) {
      const values = frames.map(frame => this.valueOf(frame, lane));
      const { low, high } = this.rangeOf(lane, values);
      const shownLow = Math.min(...values), shownHigh = Math.max(...values);   // the label says what the keyframes hold
      const height = CONFIG.editor.timelineGraphPx, pad = 7;
      const y = value => (pad + (1 - (value - low) / (high - low)) * (height - 2 * pad)).toFixed(1);
      const points = [];
      frames.forEach((frame, index) => {
        if (index === frames.length - 1) return;
        const ease = easingFunction(this.easeCss(frame, row.definition));
        for (let step = 0; step <= 24; step++) {
          const t = step / 24, time = keyAt(frame) + (keyAt(frames[index + 1]) - keyAt(frame)) * t;
          points.push((time * px).toFixed(1) + ',' + y(values[index] + (values[index + 1] - values[index]) * ease(t)));
        }
      });
      const dots = frames.map((frame, index) => '<span class="tl-dot' + (this.selectedKeys.has(row.path + '|' + index) ? ' is-selected' : '') + (row.own ? '' : ' is-fixed') + '" data-tl="dot" data-path="' + row.path + '" data-index="' + index + '" data-lane="' + lane + '" style="left:' + (keyAt(frame) * px).toFixed(1) + 'px; top:' + y(values[index]) + 'px" title="' + escapeHtml(lane + ' ' + values[index] + ' · ' + ui('editor.tlKeyTooltip', { time: Math.round(keyAt(frame)) })) + '"></span>').join('');
      return '<div class="tl-row tl-lane is-graph" data-path="' + row.path + '"><div class="tl-label"><span class="tl-twist"></span><span class="tl-lane-name">' + laneName +
        ' <small>' + this.format(lane, shownLow) + ' – ' + this.format(lane, shownHigh) + '</small></span>' + this.laneRemoveHtml(row, lane) + '</div>' +
        '<div class="tl-track" style="width:' + width + 'px; height:' + height + 'px" data-low="' + low + '" data-high="' + high + '">' +
        '<svg class="tl-curve" width="' + width + '" height="' + height + '" aria-hidden="true"><polyline points="' + points.join(' ') + '"/></svg>' + dots + '</div></div>';
    },
    /* ---- Property lines ---- */
    laneRemoveHtml(row, lane) {
      return row.own && !editorCanvas.locked() ? '<button class="tl-lane-remove" data-tl="lane-remove" data-lane="' + lane + '" title="' + escapeHtml(ui('editor.tlLaneRemove')) + '" aria-label="' + escapeHtml(ui('editor.tlLaneRemove')) + '">×</button>' : '';
    },
    /** "+ property": the properties the animation does not use yet. */
    addLaneHtml(row, frames, width) {
      if (!row.own || editorCanvas.locked()) return '';
      const missing = TIMELINE_LANES.filter(lane => !frames.some(frame => frame[lane] !== undefined && frame[lane] !== ''));
      if (!missing.length) return '';
      return '<div class="tl-row tl-lane tl-add-lane" data-path="' + row.path + '"><div class="tl-label"><span class="tl-twist"></span><select data-tl-add-lane data-path="' + row.path + '" aria-label="' + escapeHtml(ui('editor.tlLaneAdd')) + '">' +
        '<option value="">' + escapeHtml(ui('editor.tlLaneAdd')) + '</option>' + missing.map(lane => '<option value="' + lane + '">' + escapeHtml(ui('editor.key' + lane.replace(/^./, c => c.toUpperCase()))) + '</option>').join('') + '</select></div>' +
        '<div class="tl-track" style="width:' + width + 'px"></div></div>';
    },
    /** A property in every keyframe at its normal value (added), or out of all of them (removed): one undo step. */
    setLane(row, lane, add) {
      const definitions = editor.animations();
      const definition = definitions[row.name];
      if (!definition || !TIMELINE_LANES.includes(lane)) return;
      const frames = sortedKeyframes(definition);
      if (!add && TIMELINE_LANES.filter(other => other !== lane && frames.some(frame => frame[other] !== undefined && frame[other] !== '')).length === 0) { showToast(ui('editor.tlLaneLast')); return; }
      editor.nextLabel = ui(add ? 'editor.tlHistoryLaneAdd' : 'editor.tlHistoryLaneRemove');
      editor.record();
      editor.nextLabel = null;
      frames.forEach(frame => { if (add) frame[lane] = KEYFRAME_DEFAULTS[lane]; else delete frame[lane]; });
      definition.keyframes = frames;
      editor.saveAnimations(definitions);
      this.expanded.add(row.path);
      this.selectedKeys.clear();
      editor.changed(editor.selected);
      editor.renderAll();
    },

    /* ---- Copy and paste of keyframes ---- */
    /** Ctrl+C: the selected ◆ of one row, with their values and the time between them. */
    copyKeys() {
      const set = this.selectedSets()[0];
      if (!set || !set.picked.length) { showToast(ui('editor.tlCopyNothing')); return; }
      const first = set.times[set.picked[0]];
      this.keyClipboard = set.picked.map(index => {
        const values = {};
        TIMELINE_LANES.forEach(lane => { if (set.frames[index][lane] !== undefined && set.frames[index][lane] !== '') values[lane] = Number(set.frames[index][lane]); });
        if (set.frames[index].ease) values.ease = set.frames[index].ease;
        return { dt: set.times[index] - first, values };
      });
      showToast(ui('editor.tlCopied', { count: this.keyClipboard.length }));
    },
    /** Ctrl+V: the copied ◆ into the selected element's own animation, at the red line (or after its last keyframe). */
    pasteKeys() {
      const clip = this.keyClipboard;
      const element = editorCanvas.selected;
      const name = element && element.getAttribute('data-animation');
      const definition = name && editor.animations()[name];
      if (!clip || !clip.length) { showToast(ui('editor.tlPasteNothing')); return; }
      const shared = definition && editor.model.querySelectorAll('[data-animation="' + CSS.escape(name) + '"]').length > 1;
      if (!definition || shared || editorCanvas.locked()) { showToast(ui(shared ? 'editor.tlShared' : 'editor.tlKeyNeedsOwn')); return; }
      const frames = sortedKeyframes(definition), duration = Math.max(1, Number(definition.duration) || 800), delay = Math.max(0, Number(definition.delay) || 0);
      const times = frames.map(frame => delay + frame.at / 100 * duration);
      const base = this.section === 0 && editorMotion.playhead !== null && definition.trigger !== 'click' ? editorMotion.playhead : times[times.length - 1] + 100;
      const used = TIMELINE_LANES.filter(lane => frames.some(frame => frame[lane] !== undefined && frame[lane] !== '') || clip.some(key => lane in key.values));
      // the value of a property at a moment, from the animation as it is (between its keyframes: in a straight line)
      const valueAt = (lane, time) => {
        if (!frames.some(frame => frame[lane] !== undefined && frame[lane] !== '')) return KEYFRAME_DEFAULTS[lane];
        const known = frames.map((frame, i) => ({ time: times[i], value: this.valueOf(frame, lane) }));   // a keyframe that leaves it blank has the default there (as the CSS plays it)
        if (time <= known[0].time) return known[0].value;
        for (let i = 1; i < known.length; i++) if (time <= known[i].time) return known[i - 1].value + (known[i].value - known[i - 1].value) * (time - known[i - 1].time) / Math.max(1, known[i].time - known[i - 1].time);
        return known[known.length - 1].value;
      };
      const added = clip.map(key => {
        const time = Math.max(0, base + key.dt), frame = {};
        used.forEach(lane => { frame[lane] = lane in key.values ? key.values[lane] : Math.round(valueAt(lane, time) * 1000) / 1000; });
        if (key.values.ease) frame.ease = key.values.ease;
        return { frame, time };
      });
      // a pasted ◆ on the moment of an existing one replaces it
      added.forEach(({ frame, time }) => {
        const same = times.findIndex(other => Math.abs(other - time) < 5);
        if (same >= 0) { frames.splice(same, 1); times.splice(same, 1); }
        frames.push(frame);
        times.push(time);
      });
      frames.forEach(frame => used.forEach(lane => { if (frame[lane] === undefined || frame[lane] === '') frame[lane] = KEYFRAME_DEFAULTS[lane]; }));   // every keyframe sets every property it uses
      const row = { name, path: editorCanvas.pathOf(element).join('/') };
      this.selectedKeys.clear();
      this.writeFrames([{ row, frames, times }], 'editor.tlHistoryPaste');
      showToast(ui('editor.tlPasted', { count: added.length }));
    },

    /** A keyframe's value of a property (as the CSS makes it: one it does not set has the default there). */
    valueOf(frame, lane) { return frame[lane] !== undefined && frame[lane] !== '' && Number.isFinite(Number(frame[lane])) ? Number(frame[lane]) : KEYFRAME_DEFAULTS[lane]; },
    rangeOf(lane, values) {
      let low = Math.min(...values), high = Math.max(...values);
      if (lane === 'opacity') { low = Math.min(low, 0); high = Math.max(high, 1); }
      const span = high - low || (['opacity', 'scale', 'scaleX', 'scaleY', 'brightness'].includes(lane) ? 1 : 100);
      return { low: low - span * .15, high: high + span * .15 };
    },
    format(lane, value) { return ['opacity', 'scale', 'scaleX', 'scaleY', 'brightness'].includes(lane) ? (Math.round(value * 100) / 100).toString() : Math.round(value).toString(); },
    /** The easing of the segment that starts at this keyframe, as CSS (its own, else the animation's). */
    easeCss(frame, definition) {
      const own = segmentEasing(frame.ease);
      if (own) return own;
      const css = EASINGS[definition.easing] || EASINGS['ease-out'];
      const token = css.match(/^var\((--[\w-]+)\)$/);
      return token ? getComputedStyle(root).getPropertyValue(token[1]).trim() || 'ease-out' : css;
    },
    /** What dragging this row's bar and its ends changes. */
    whatDragDoes(row) {
      if (editorCanvas.locked()) return { note: 'editor.scriptedNote' };
      if (row.shared) return { note: 'editor.tlShared' };
      if (row.own) return { bar: 'delay', start: 'start', end: 'duration', note: 'editor.tlOwnNote' };
      if (row.definition) return { note: 'editor.tlShared' };
      if (row.element.matches(':is(video, audio)[data-play-step]')) return { note: 'editor.tlFixedNote' };
      if (this.section === 0) return { bar: 'order', start: 'order', end: 'speed', note: 'editor.tlOrderNote' };
      return { end: 'speed', note: 'editor.tlClickNote' };
    },
    rowOf(path) { return this.rows().rows.find(row => row.path === path); },
    elementAt(path) { return editorCanvas.elementAtPath(String(path).split('/').filter(Boolean).map(Number)); },

    /* ======== POINTER ======== */

    onPointerDown(event) {
      if (event.button !== 0) return;
      const target = event.target;
      if (target.closest('.timeline-resize')) { this.startResize(event); return; }
      const ruler = target.closest('.tl-ruler:not(.is-off)');
      if (ruler) { event.preventDefault(); this.startScrub(event, ruler); return; }
      const dot = target.closest('.tl-dot');
      if (dot && !dot.classList.contains('is-fixed') && !editorCanvas.locked()) { event.preventDefault(); this.startDotDrag(event, dot); return; }
      const key = target.closest('.tl-key');
      if (key && !key.classList.contains('is-fixed') && !editorCanvas.locked()) { event.preventDefault(); this.startKeyDrag(event, key); return; }
      if (target.matches('.tl-track, .tl-grid, .tl-curve, .tl-curve *') && !target.closest('.tl-label')) { event.preventDefault(); this.startBoxSelect(event); return; }
      const part = target.closest('[data-tl="start"], [data-tl="end"], [data-tl="seg"], .tl-bar:not(.is-fixed)');
      if (part && !editorCanvas.locked()) { event.preventDefault(); this.startBarDrag(event, part); }
    },
    onClick(event) {
      const button = event.target.closest('[data-tl]');
      if (!button) return;
      const action = button.dataset.tl;
      const row = button.closest('.tl-row');
      if (action === 'select' && row) {
        const element = this.elementAt(row.dataset.path);
        if (element) editorCanvas.selectElement(element);
      } else if (action === 'expand' && row) {
        if (this.expanded.has(row.dataset.path)) this.expanded.delete(row.dataset.path); else this.expanded.add(row.dataset.path);
        this.render();
      } else if (action === 'section') { this.section = Number(button.dataset.section) || 0; this.selectedKeys.clear(); this.render(); }
      else if (action === 'graph') {
        this.graph = !this.graph;
        const element = editorCanvas.selected;   // the selected element's lines open with it
        if (this.graph && element && element.hasAttribute('data-animation')) this.expanded.add(editorCanvas.pathOf(element).join('/'));
        this.render();
      }
      else if (action === 'zoom-in' || action === 'zoom-out') this.zoomBy(action === 'zoom-in' ? 1.5 : 1 / 1.5);
      else if (action === 'zoom-fit') { this.zoom = null; this.render(); }
      else if (action === 'play') { if (editorTools.playStep >= 0) editorTools.togglePause(); else editorTools.playSlide(); }   // playing: Pause / Resume
      else if (action === 'close') this.toggle(false);
      else if (action === 'key-here') this.addKeyAtPlayhead();
      else if (action === 'ease') this.easeButton(button);
      else if (action === 'lane-remove' && row) { const target = this.rowOf(row.dataset.path); if (target && target.own) this.setLane(target, button.dataset.lane, false); }
    },
    onDoubleClick(event) {
      const track = event.target.closest('.tl-row:not(.tl-lane) .tl-track');
      if (!track || !this.scale || this.scale.kind !== 'slide' || editorCanvas.locked() || event.target.closest('.tl-key')) return;
      const row = this.rowOf(track.closest('.tl-row').dataset.path);
      if (!row || !row.own) { showToast(ui('editor.tlKeyNeedsOwn')); return; }
      const ms = Math.max(1, Math.round((event.clientX - track.getBoundingClientRect().left) / this.scale.px / 10) * 10);
      editorMotion.scrubTo(ms, true);   // the values it shows at that moment
      editorMotion.addKey(row.element, ms, {}, editorMotion.shownValues(row.element));
    },
    /* ---- Easing presets ---- */
    /** Right-click on a segment, a ◆ or a bar of an animation of its own: the easings for those segments. */
    onContextMenu(event) {
      const target = event.target;
      const part = target.closest('.tl-seg, .tl-key, .tl-dot, .tl-bar');
      const rowBox = target.closest('.tl-row');
      if (!part || !rowBox) return;
      const row = this.rowOf(rowBox.dataset.path);
      event.preventDefault();
      if (!row || !row.own || editorCanvas.locked()) { showToast(ui(row && row.definition ? 'editor.tlShared' : 'editor.tlKeyNeedsOwn')); return; }
      const count = sortedKeyframes(row.definition).length;
      const segmentOf = index => Math.min(index, count - 2);   // the last ◆: the segment into it
      let targets;
      if (part.matches('.tl-seg')) targets = [{ row, indexes: [Number(part.dataset.index)] }];
      else if (part.matches('.tl-key, .tl-dot')) {
        const id = row.path + '|' + part.dataset.index;
        targets = this.selectedKeys.has(id) && this.selectedKeys.size > 1
          ? this.selectedSets().map(set => ({ row: set.row, indexes: Array.from(new Set(set.picked.map(index => Math.min(index, set.frames.length - 2)))) }))
          : [{ row, indexes: [segmentOf(Number(part.dataset.index))] }];
      } else targets = [{ row, indexes: Array.from({ length: count - 1 }, (unused, index) => index) }];
      this.openEaseMenu(event.clientX, event.clientY, targets);
    },
    /** Ease ▾: the selected ◆, else the selected element's whole animation. */
    easeButton(button) {
      let targets = this.selectedKeys.size ? this.selectedSets().map(set => ({ row: set.row, indexes: Array.from(new Set(set.picked.map(index => Math.min(index, set.frames.length - 2)))) })) : [];
      if (!targets.length) {
        const element = editorCanvas.selected;
        const name = element && element.getAttribute('data-animation');
        const definition = name && editor.animations()[name];
        const shared = definition && editor.model.querySelectorAll('[data-animation="' + CSS.escape(name) + '"]').length > 1;
        if (!definition || shared || editorCanvas.locked()) { showToast(ui(shared ? 'editor.tlShared' : 'editor.tlEaseNothing')); return; }   // (shown in this part or not)
        targets = [{ row: { name, definition }, indexes: Array.from({ length: sortedKeyframes(definition).length - 1 }, (unused, index) => index) }];
      }
      const box = button.getBoundingClientRect();
      this.openEaseMenu(box.left, box.bottom + 4, targets);
    },
    openEaseMenu(x, y, targets) {
      this.closeEaseMenu();
      const segments = targets.reduce((sum, target) => sum + target.indexes.length, 0);
      const menu = document.createElement('div');
      menu.className = 'editor-menu tl-ease-menu';
      menu.setAttribute('role', 'menu');
      menu.innerHTML = '<p class="editor-note">' + escapeHtml(ui(segments === 1 ? 'editor.tlEaseForOne' : 'editor.tlEaseFor', { count: segments })) + '</p>' +
        EASE_CHOICES.map(([value, label]) => '<button role="menuitem" data-tl-ease="' + escapeHtml(value) + '">' + easeCurveSvg(segmentEasing(value) || 'ease-out', 26) + '<span>' + escapeHtml(ui(label)) + '</span></button>').join('');
      editor.element.appendChild(menu);
      menu.style.left = Math.min(x, window.innerWidth - menu.offsetWidth - 8) + 'px';
      menu.style.top = Math.max(8, Math.min(y, window.innerHeight - menu.offsetHeight - 8)) + 'px';
      fitMenuOnScreen(menu);
      menu.addEventListener('click', event => { const item = event.target.closest('[data-tl-ease]'); if (item) { this.closeEaseMenu(); this.applyEase(targets, item.dataset.tlEase); showToast(ui('editor.tlEaseDone', { name: item.textContent.trim() })); } });
      this.easeOutside = event => { if (!menu.contains(event.target)) this.closeEaseMenu(); };
      this.easeKeys = event => {
        const items = Array.from(menu.querySelectorAll('button')), index = items.indexOf(document.activeElement);
        event.stopPropagation();   // never the slide (Delete, arrows, Ctrl+Z …) while the menu is open
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          event.preventDefault();
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
          if (items[next]) items[next].focus();
        } else if (event.key === 'Enter' || event.key === ' ') { /* the focused item presses itself */ }
        else if (!['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) { event.preventDefault(); this.closeEaseMenu(); }
      };
      document.addEventListener('pointerdown', this.easeOutside, true);
      window.addEventListener('keydown', this.easeKeys, true);
      this.easeMenu = menu;
      const first = menu.querySelector('button');
      if (first) first.focus();
    },
    closeEaseMenu() {
      if (!this.easeMenu) return;
      const hadFocus = this.easeMenu.contains(document.activeElement);
      this.easeMenu.remove();
      if (hadFocus && this.box()) this.box().focus({ preventScroll: true });
      this.easeMenu = null;
      document.removeEventListener('pointerdown', this.easeOutside, true);
      window.removeEventListener('keydown', this.easeKeys, true);
    },
    /** The chosen easing on those segments (one undo step); '' = the animation's own. */
    applyEase(targets, value) {
      const definitions = editor.animations();
      const list = targets.filter(target => definitions[target.row.name]);
      if (!list.length) return;
      editor.nextLabel = ui('editor.tlHistoryEase');
      editor.record();
      editor.nextLabel = null;
      list.forEach(({ row, indexes }) => {
        const frames = sortedKeyframes(definitions[row.name]);
        indexes.forEach(index => { if (!frames[index]) return; if (value) frames[index].ease = value; else delete frames[index].ease; });
        definitions[row.name].keyframes = frames;
      });
      editor.saveAnimations(definitions);
      this.selectionStamp = this.stamp();   // our own change: the selected ◆ stay selected
      editor.changed(editor.selected);
      editor.renderAll();
    },

    /** ◆ at the playhead: a keyframe there for the selected element (its own animation). */
    addKeyAtPlayhead() {
      const element = editorCanvas.selected;
      const ms = editorMotion.playhead;
      if (!element || ms === null || this.section) { showToast(ui('editor.tlKeyHereNote')); return; }
      if (!element.hasAttribute('data-animation')) { showToast(ui('editor.tlKeyNeedsOwn')); return; }
      editorMotion.addKey(element, ms, {}, editorMotion.shownValues(element));
    },
    onChange(event) {
      const lane = event.target.closest('[data-tl-add-lane]');
      if (lane) { const target = this.rowOf(lane.dataset.path); if (target && target.own && lane.value) this.setLane(target, lane.value, true); return; }
      const field = event.target.closest('[data-tl-step]');
      if (!field) return;
      const element = this.elementAt(field.dataset.path);
      if (!element || editorCanvas.locked()) return;
      const number = clamp(parseInt(field.value, 10) || 1, 1, 40);
      editorCanvas.change(() => { if (element.matches(':is(video, audio)[data-play-step]')) element.setAttribute('data-play-step', number); else element.setAttribute('data-reveal-step', number); }, { rerender: true });
      this.section = number;   // follow it to its click
      this.render();
    },
    onWheel(event) {
      if (!(event.ctrlKey || event.metaKey) || !this.scale) return;   // a plain wheel scrolls
      event.preventDefault();
      this.zoomBy(Math.exp(-event.deltaY * 0.0015), event.clientX);
    },
    zoomBy(factor, clientX) {
      if (!this.scale) return;
      const body = this.box().querySelector('.timeline-body');
      const label = CONFIG.editor.timelineLabelPx;
      const anchorX = clientX === undefined ? body.clientWidth / 2 + label / 2 : clientX - body.getBoundingClientRect().left;
      const ms = (body.scrollLeft + anchorX - label) / this.scale.px;   // the moment under the pointer stays there
      this.zoom = clamp(this.scale.px * factor, this.scale.fit * .5, 2);
      this.render();
      body.scrollLeft = Math.max(0, ms * this.zoom + label - anchorX);
    },
    /** Pulls a moment (ms) to a start or end of the other rows, or to the playhead, when it is a few px away. */
    pull(ms, path, alt) {
      if (alt || !this.scale) return { ms: Math.max(0, Math.round(ms)), text: '' };
      const reach = CONFIG.editor.barPullPx / this.scale.px;
      const marks = [];
      this.rows().rows.forEach(row => {
        if (row.path === path) return;
        const name = editorTools.labelOf(row.element);
        marks.push({ at: row.timing.start, text: ui('editor.snapStartOf', { label: name }) });
        if (row.timing.length !== Infinity) marks.push({ at: row.timing.start + row.timing.length, text: ui('editor.snapEndOf', { label: name }) });
      });
      if (this.scale.kind === 'slide' && editorMotion.playhead !== null) marks.push({ at: editorMotion.playhead, text: ui('editor.tlPlayhead') });
      const near = marks.filter(mark => Math.abs(mark.at - ms) < reach).sort((a, b) => Math.abs(a.at - ms) - Math.abs(b.at - ms))[0];
      return near ? { ms: Math.max(0, Math.round(near.at)), text: near.text } : { ms: Math.max(0, Math.round(ms / 10) * 10), text: '' };
    },
    readout(event, text) {
      const box = this.box().querySelector('.tl-readout');
      box.hidden = !text;
      box.textContent = text;
      const area = this.box().getBoundingClientRect();
      box.style.left = clamp(event.clientX - area.left + 12, 0, area.width - 200) + 'px';
      box.style.top = Math.max(0, event.clientY - area.top - 30) + 'px';
    },
    /** A drag inside the panel: the moves, then `done(moved, lastEvent)`. The panel is not redrawn meanwhile. */
    follow(event, onMove, done) {
      this.dragging = true;
      const startX = event.clientX;
      let moved = false, last = event;
      const move = moveEvent => { last = moveEvent; if (Math.abs(moveEvent.clientX - startX) > 2) moved = true; if (moved) onMove(moveEvent, moveEvent.clientX - startX); };
      const up = upEvent => {
        window.removeEventListener('pointermove', move, true);
        window.removeEventListener('pointerup', up, true);
        window.removeEventListener('pointercancel', up, true);
        this.dragging = false;
        this.box().querySelector('.tl-readout').hidden = true;
        done(moved && upEvent.type !== 'pointercancel', last);
      };
      window.addEventListener('pointermove', move, true);
      window.addEventListener('pointerup', up, true);
      window.addEventListener('pointercancel', up, true);
    },
    startScrub(event, ruler) {
      const left = ruler.getBoundingClientRect().left;   // (the first scrub draws the panel again: the old ruler is gone then)
      const at = clientX => { const now = this.box().querySelector('.tl-ruler'); return clamp(Math.round((clientX - (now && now.isConnected ? now.getBoundingClientRect().left : left)) / this.scale.px / 10) * 10, 0, Math.round(this.scale.total)); };
      const head = () => this.box().querySelector('.tl-playhead');
      editorMotion.scrubTo(at(event.clientX), true);
      if (!head()) this.render();
      this.follow(event, moveEvent => {
        const ms = at(moveEvent.clientX);
        editorMotion.scrubTo(ms, true);
        const line = head();
        if (line) { line.style.left = (CONFIG.editor.timelineLabelPx + ms * this.scale.px) + 'px'; line.dataset.time = (ms / 1000).toFixed(2) + ' s'; }
      }, (moved, last) => editorMotion.scrubTo(at(last.clientX)));   // drawn again with the playhead there
    },
    /** The bar (later / earlier), its left end (the start) or its right end (how long). */
    startBarDrag(event, part) {
      const rowBox = part.closest('.tl-row');
      const row = this.rowOf(rowBox.dataset.path);
      if (!row) return;
      const what = this.whatDragDoes(row);
      const mode = part.dataset.tl === 'start' ? what.start : part.dataset.tl === 'end' ? what.end : what.bar;
      const bar = rowBox.querySelector('.tl-bar');
      const segment = part.dataset.tl === 'seg' ? part : null;
      if (!mode) { if (!segment) showToast(ui(what.note)); return; }
      const px = this.scale.px, start = row.timing.start, length = row.timing.length === Infinity ? null : row.timing.length;
      // an animation that repeats: the bar shows all its runs; its ends change one run (the duration in the file)
      const repeat = row.definition ? (row.definition.repeat === 'infinite' ? Infinity : Math.max(1, Number(row.definition.repeat) || 1)) : 1;
      const oneRun = row.definition ? Math.max(1, Number(row.definition.duration) || 800) : length;
      const order = parseFloat(row.element.style.getPropertyValue('--order')) || 0, stagger = editorTools.staggerMs();
      const baseLeft = parseFloat(bar.style.left) || 0;
      let result = null;
      bar.classList.add('is-dragging');
      this.follow(event, (moveEvent, dx) => {
        const ms = dx / px;
        if (mode === 'order') {
          const value = clamp(Math.round(order + ms / stagger), 0, 40);
          result = { order: value };
          bar.style.left = (baseLeft + (value - order) * stagger * px) + 'px';
          this.readout(moveEvent, ui('editor.dragOrder', { order: value }));
        } else if (mode === 'delay') {   // the whole bar: its start, pulled to the others
          const pulled = this.pull(start + ms, row.path, moveEvent.altKey);
          result = { delay: pulled.ms };
          bar.style.left = (pulled.ms * px) + 'px';
          rowBox.querySelectorAll('.tl-key, .tl-seg').forEach(node => { node.style.translate = ((pulled.ms - start) * px) + 'px 0'; });
          this.readout(moveEvent, ui('editor.tlStartsAt', { s: (pulled.ms / 1000).toFixed(2) }) + (pulled.text ? ' = ' + pulled.text : ''));
        } else if (mode === 'start' && repeat === Infinity) {   // a loop has no end to keep: its start only
          const pulled = this.pull(start + ms, row.path, moveEvent.altKey);
          result = { delay: pulled.ms };
          bar.style.left = (pulled.ms * px) + 'px';
          this.readout(moveEvent, ui('editor.tlStartsAt', { s: (pulled.ms / 1000).toFixed(2) }) + (pulled.text ? ' = ' + pulled.text : ''));
        } else if (mode === 'start') {   // its left end: the start moves, the end of (the first run) stays
          const pulled = this.pull(start + ms, row.path, moveEvent.altKey);
          const from = Math.min(pulled.ms, start + oneRun - 50);
          result = { delay: from, duration: oneRun - (from - start) };
          bar.style.left = (from * px) + 'px';
          bar.style.width = ((oneRun - (from - start)) * repeat * px) + 'px';
          this.readout(moveEvent, ui('editor.tlStartsAt', { s: (from / 1000).toFixed(2) }) + (pulled.text ? ' = ' + pulled.text : ''));
        } else {   // its right end: how long it takes (an animation of its own: its duration; otherwise its speed)
          const pulled = this.pull(start + (length || 0) + ms, row.path, moveEvent.altKey);
          const span = Math.max(50 * repeat, pulled.ms - start);   // all its runs
          result = mode === 'duration' ? { duration: span / repeat } : { speed: span };
          bar.style.width = (span * px) + 'px';
          this.readout(moveEvent, ui('editor.tlTakes', { s: (span / repeat / 1000).toFixed(2) }) + (repeat > 1 ? ' × ' + repeat : '') + (pulled.text ? ' = ' + pulled.text : ''));
        }
      }, moved => {
        bar.classList.remove('is-dragging');
        if (!moved || !result) {
          if (segment && row.definition) editorMotion.openEase(segment, row.element, Number(segment.dataset.index));   // a click on the line between two ◆
          return;   // (no redraw: a double-click on the bar still reaches it)
        }
        this.write(row, result);
      });
    },
    /** A ◆ to another moment: the others keep theirs (the first and last one: the start and the end). */
    /** The rows with selected ◆ and their keyframes and moments: [{ row, frames, times, picked: [indexes] }]. */
    selectedSets() {
      const byPath = new Map();
      this.selectedKeys.forEach(id => { const [path, index] = id.split('|'); if (!byPath.has(path)) byPath.set(path, []); byPath.get(path).push(Number(index)); });
      return Array.from(byPath.entries()).map(([path, picked]) => {
        const row = this.rowOf(path);
        if (!row || !row.own) return null;
        const frames = sortedKeyframes(row.definition), duration = Math.max(1, Number(row.definition.duration) || 800);
        return { row, frames, times: frames.map(frame => row.timing.start + frame.at / 100 * duration), picked: picked.filter(index => index < frames.length).sort((a, b) => a - b) };
      }).filter(Boolean);
    },
    /** What the selected ◆ belong to: the slide and the animations of their rows (as text). */
    stamp() {
      const definitions = editor.animations();
      const paths = Array.from(new Set(Array.from(this.selectedKeys, id => id.split('|')[0])));
      return (editor.selected ? editor.selected.getAttribute('data-name') : '') + '|' + this.section + '|' + paths.map(path => {
        const element = this.elementAt(path);
        const name = element && element.getAttribute('data-animation');
        return path + ':' + (name ? JSON.stringify(definitions[name] || null) : '');
      }).join(';');
    },
    markSelected() {
      this.selectionStamp = this.stamp();
      this.box().querySelectorAll('.tl-key, .tl-dot').forEach(node => node.classList.toggle('is-selected', this.selectedKeys.has(node.dataset.path + '|' + node.dataset.index)));
    },
    /** A ◆ (and the other selected ones) to another moment; each keeps between its neighbours that stay. Shift+click: add or take out. */
    startKeyDrag(event, key) {
      const id = key.dataset.path + '|' + key.dataset.index;
      if (event.shiftKey) { if (this.selectedKeys.has(id)) this.selectedKeys.delete(id); else this.selectedKeys.add(id); this.markSelected(); this.box().focus({ preventScroll: true }); return; }
      if (!this.selectedKeys.has(id)) { this.selectedKeys.clear(); this.selectedKeys.add(id); }
      this.markSelected();
      this.box().focus({ preventScroll: true });   // Delete removes them
      const sets = this.selectedSets();
      const own = sets.find(set => set.row.path === key.dataset.path);
      if (!own) return;
      const anchor = own.times[Number(key.dataset.index)];
      const { low, high } = this.limitsOf(sets);
      let shift = 0;
      this.follow(event, (moveEvent, dx) => {
        const pulled = this.pull(anchor + dx / this.scale.px, key.dataset.path, moveEvent.altKey);
        shift = clamp(pulled.ms - anchor, low, high);
        sets.forEach(({ row, times, picked }) => picked.forEach(index => this.box().querySelectorAll('.tl-key[data-path="' + row.path + '"][data-index="' + index + '"], .tl-dot[data-path="' + row.path + '"][data-index="' + index + '"]')
          .forEach(node => { node.style.left = ((times[index] + shift) * this.scale.px) + 'px'; })));
        this.readout(moveEvent, ui('editor.tlKeyTooltip', { time: Math.round(anchor + shift) }) + (this.selectedKeys.size > 1 ? ' · ' + ui('editor.tlKeysMoving', { count: this.selectedKeys.size }) : '') + (pulled.text ? ' = ' + pulled.text : ''));
      }, done => {
        if (!done || !shift) { this.render(); return; }
        sets.forEach(set => set.picked.forEach(index => { set.times[index] += shift; }));
        this.writeFrames(sets, this.selectedKeys.size > 1 ? 'editor.tlHistoryKeysMove' : 'editor.historyKeyTime');
      });
    },
    /** How far the selected ◆ may go together: none passes a neighbour that is not selected (5 ms apart), none before 0. */
    limitsOf(sets) {
      let low = -Infinity, high = Infinity;
      sets.forEach(({ times, picked }) => picked.forEach(index => {
        let before = index - 1; while (before >= 0 && picked.includes(before)) before--;
        let after = index + 1; while (after < times.length && picked.includes(after)) after++;
        low = Math.max(low, before >= 0 ? times[before] + 5 - times[index] : -times[index]);
        if (after < times.length) high = Math.min(high, times[after] - 5 - times[index]);
      }));
      return { low, high };
    },
    /** A box drawn on the tracks: the ◆ (and dots) in it are selected (Shift: added). A click there: none. */
    startBoxSelect(event) {
      const grid = this.box().querySelector('.tl-grid');
      if (!grid) return;
      const origin = grid.getBoundingClientRect();
      const box = document.createElement('div');
      box.className = 'tl-select-box';
      grid.appendChild(box);
      const from = { x: event.clientX, y: event.clientY };
      let to = from;
      const draw = () => Object.assign(box.style, { left: (Math.min(from.x, to.x) - origin.left) + 'px', top: (Math.min(from.y, to.y) - origin.top) + 'px', width: Math.abs(to.x - from.x) + 'px', height: Math.abs(to.y - from.y) + 'px' });
      this.follow(event, moveEvent => { to = { x: moveEvent.clientX, y: moveEvent.clientY }; draw(); }, done => {
        box.remove();
        if (!event.shiftKey) this.selectedKeys.clear();
        if (done) {
          const left = Math.min(from.x, to.x), right = Math.max(from.x, to.x), top = Math.min(from.y, to.y), bottom = Math.max(from.y, to.y);
          this.box().querySelectorAll('.tl-key:not(.is-fixed), .tl-dot:not(.is-fixed)').forEach(node => {
            const b = node.getBoundingClientRect(), cx = b.left + b.width / 2, cy = b.top + b.height / 2;
            if (cx >= left && cx <= right && cy >= top && cy <= bottom) this.selectedKeys.add(node.dataset.path + '|' + node.dataset.index);
          });
        }
        this.markSelected();
        this.box().focus({ preventScroll: true });
      });
    },
    /** A dot of the graph: up or down its value, left or right its moment (one undo step). */
    startDotDrag(event, dot) {
      const row = this.rowOf(dot.dataset.path);
      if (!row || !row.own) return;
      const index = Number(dot.dataset.index), lane = dot.dataset.lane;
      this.selectedKeys.clear();
      this.selectedKeys.add(row.path + '|' + index);
      this.markSelected();
      this.box().focus({ preventScroll: true });
      const track = dot.parentElement, low = Number(track.dataset.low), high = Number(track.dataset.high);
      const height = CONFIG.editor.timelineGraphPx, pad = 7;
      const frames = sortedKeyframes(row.definition), duration = Math.max(1, Number(row.definition.duration) || 800);
      const times = frames.map(frame => row.timing.start + frame.at / 100 * duration);
      const startTop = parseFloat(dot.style.top), startY = event.clientY;
      const before = index ? times[index - 1] + 5 : 0, after = index < times.length - 1 ? times[index + 1] - 5 : Infinity;
      let value = this.valueOf(frames[index], lane), time = times[index], changed = false;
      const startedY = { done: false };
      this.dragging = true;
      const move = moveEvent => {
        const dy = moveEvent.clientY - startY, dx = moveEvent.clientX - event.clientX;
        if (!startedY.done && Math.abs(dy) + Math.abs(dx) < 3) return;
        startedY.done = changed = true;
        const top = clamp(startTop + dy, pad, height - pad);
        let raw = low + (1 - (top - pad) / (height - 2 * pad)) * (high - low);
        if (lane === 'opacity') raw = clamp(raw, 0, 1);
        if (['scale', 'scaleX', 'scaleY', 'blur', 'brightness'].includes(lane)) raw = Math.max(0, raw);
        value = ['opacity', 'scale', 'scaleX', 'scaleY', 'brightness'].includes(lane) ? Math.round(raw * 100) / 100 : Math.round(raw);
        time = moveEvent.shiftKey ? times[index] : clamp(this.pull(times[index] + dx / this.scale.px, row.path, moveEvent.altKey).ms, before, after);   // Shift: only the value
        dot.style.top = top + 'px';
        dot.style.left = (time * this.scale.px) + 'px';
        this.readout(moveEvent, lane + ' ' + value + ' · ' + Math.round(time) + ' ms');
      };
      const up = () => {
        window.removeEventListener('pointermove', move, true);
        window.removeEventListener('pointerup', up, true);
        this.dragging = false;
        this.box().querySelector('.tl-readout').hidden = true;
        if (!changed) { this.render(); return; }
        frames[index][lane] = value;
        times[index] = time;
        this.writeFrames([{ row, frames, times }], 'editor.tlHistoryValue');
      };
      window.addEventListener('pointermove', move, true);
      window.addEventListener('pointerup', up, true);
    },
    startResize(event) {
      event.preventDefault();
      const startY = event.clientY, from = this.height;
      this.dragging = true;
      const move = moveEvent => { this.height = clamp(Math.round(from - (moveEvent.clientY - startY)), 120, Math.round(window.innerHeight * .6)); this.apply(); };
      const up = () => {
        window.removeEventListener('pointermove', move, true);
        window.removeEventListener('pointerup', up, true);
        this.dragging = false;
        this.remember();
        this.render();
        if (editorCanvas.stageElement) editorCanvas.fit();
      };
      window.addEventListener('pointermove', move, true);
      window.addEventListener('pointerup', up, true);
    },

    /* ======== WRITING ======== */

    /** A finished drag: one undo step. */
    write(row, result) {
      if (editorTools.playStep >= 0) editorTools.stopPlaying();   // the still slide is what changes
      const element = this.elementAt(row.path);
      if (!element) { this.render(); return; }
      if ('order' in result) { editor.nextLabel = ui('editor.tlHistoryOrder'); editorCanvas.change(() => element.style.setProperty('--order', result.order), { rerender: true }); editor.nextLabel = null; return; }
      if ('speed' in result) {
        editor.nextLabel = ui('editor.tlHistorySpeed');
        editorCanvas.change(() => editorLayers.setSpeed(element, Math.round(result.speed) + 'ms'), { rerender: true });
        editor.nextLabel = null;
        return;
      }
      const definitions = editor.animations();
      const definition = definitions[row.name];
      if (!definition) { this.render(); return; }
      editor.nextLabel = ui(result.duration !== undefined && result.delay === undefined ? 'editor.tlHistoryLength' : 'editor.tlHistoryStart');
      editor.record();
      editor.nextLabel = null;
      if (result.delay !== undefined) definition.delay = Math.round(result.delay);
      if (result.duration !== undefined) definition.duration = Math.max(1, Math.round(result.duration));
      editor.saveAnimations(definitions);
      editor.changed(editor.selected);
      editor.renderAll();
    },
    /** New moments (and values) for the keyframes of one or more rows, [{ row, frames, times }]: delay, duration and each
        "at" again. One undo step. */
    writeFrames(sets, label) {
      const definitions = editor.animations();
      const list = sets.filter(set => definitions[set.row.name]);
      if (!list.length) return;
      editor.nextLabel = ui(label);
      editor.record();
      editor.nextLabel = null;
      list.forEach(({ row, frames, times }) => {
        const definition = definitions[row.name];
        const order = frames.map((frame, i) => ({ frame, time: times[i] })).sort((a, b) => a.time - b.time);
        const first = order[0].time, last = order[order.length - 1].time, span = Math.max(1, last - first);
        definition.delay = Math.max(0, Math.round(first));
        definition.duration = Math.round(span);
        definition.keyframes = order.map(({ frame, time }) => Object.assign({}, frame, { at: Math.round((time - first) / span * 1000) / 10 }));
      });
      editor.saveAnimations(definitions);
      this.selectionStamp = this.stamp();   // our own change: the selected ◆ stay selected
      editor.changed(editor.selected);
      editor.renderAll();
    },
    /** Keys while the panel has the keyboard: Delete removes the selected ◆. True when handled. */
    onKey(event) {
      const box = this.box();
      if (!box || !box.contains(document.activeElement) || document.activeElement.matches('input, select')) return false;
      const ctrl = (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey;
      // ◆ selected / ◆ copied: Ctrl+C / Ctrl+V are the keyframes'; otherwise they stay the element's
      if (ctrl && event.key.toLowerCase() === 'c' && this.selectedKeys.size) { event.preventDefault(); this.copyKeys(); return true; }
      if (ctrl && event.key.toLowerCase() === 'v' && this.keyClipboard && this.keyClipboard.length) { event.preventDefault(); this.pasteKeys(); return true; }
      if (event.key === 'Delete' || event.key === 'Backspace') {   // the panel has the keyboard: never the element on the slide
        event.preventDefault();
        if (!this.selectedKeys.size) return true;
        const sets = this.selectedSets();
        let refused = false;
        sets.forEach(set => {
          if (set.frames.length - set.picked.length < 2) { refused = true; set.skip = true; return; }   // an animation keeps two keyframes
          set.picked.slice().reverse().forEach(index => { set.frames.splice(index, 1); set.times.splice(index, 1); });
        });
        if (refused) showToast(ui('editor.tlKeyLast'));
        const several = this.selectedKeys.size > 1;
        this.selectedKeys.clear();
        this.markSelected();   // (when every row refused, nothing is drawn again)
        this.writeFrames(sets.filter(set => !set.skip), several ? 'editor.tlHistoryKeysDelete' : 'editor.tlHistoryKeyDelete');
        return true;
      }
      if (event.key === 'Escape' && this.selectedKeys.size) { this.selectedKeys.clear(); this.markSelected(); return true; }
      if (ctrl && event.key.toLowerCase() === 'a') {   // every ◆ in the timeline (of animations of their own)
        event.preventDefault();
        box.querySelectorAll('.tl-key:not(.is-fixed)').forEach(key => this.selectedKeys.add(key.dataset.path + '|' + key.dataset.index));
        this.markSelected();
        return true;
      }
      if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') && this.selectedKeys.size && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();   // the selected ◆ a little earlier or later (Shift: more), never past a neighbour
        const sets = this.selectedSets();
        if (!sets.length) return true;
        const { low, high } = this.limitsOf(sets);
        const shift = clamp((event.shiftKey ? CONFIG.editor.timelineNudgeBigMs : CONFIG.editor.timelineNudgeMs) * (event.key === 'ArrowLeft' ? -1 : 1), low, high);
        if (!shift || Math.sign(shift) !== (event.key === 'ArrowLeft' ? -1 : 1)) return true;   // no room that way (never the other way)
        sets.forEach(set => set.picked.forEach(index => { set.times[index] += shift; }));
        this.writeFrames(sets, 'editor.tlHistoryKeysNudge');
        return true;
      }
      return false;
    },
  };
