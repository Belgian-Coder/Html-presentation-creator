  /* ===========================================================================
     18. EDITOR CANVAS: the slide in the middle of the editor and the Element tab
     The chosen slide is shown as a copy (in its end state). Click on anything
     to select it; its settings show in the Element tab:
       - move it up or down, duplicate or delete it, select its parent;
       - how it appears: with the slide (and in which order), on a click (with
         a click effect), or always;
       - an animation with keyframes (presets, or your own), a morph name;
       - "place freely": drag it anywhere on the slide (with guides) and set
         its width; arrow keys move it by 1 px (Shift: 10 px);
       - what belongs to its kind: image or video file, number, chart rows,
         QR link, break minutes, agenda target;
       - insert a new block after it (heading, text, list, cards, numbers,
         chart, image, video, quote, QR code, break timer, agenda).
     Texts are typed straight on the slide; B and Accent format the selected
     words. Every change is written back into the editor's model at once.
     =========================================================================== */

  const INLINE_TAGS = new Set(['SPAN', 'B', 'I', 'EM', 'STRONG', 'SMALL', 'BR', 'SUP', 'SUB', 'MARK', 'CODE', 'A', 'S', 'U']);

  /** Ready-made animations; choosing one copies it into the ANIMATIONS block, where it can be changed. */
  const ANIMATION_PRESETS = {
    'pop-in': { trigger: 'slide', duration: 650, delay: 300, easing: 'elastic', repeat: 1, alternate: false, keyframes: [{ at: 0, opacity: 0, scale: 0.6 }, { at: 100, opacity: 1, scale: 1 }] },
    'fade-out': { trigger: 'click', duration: 600, delay: 0, easing: 'ease-in', repeat: 1, alternate: false, keyframes: [{ at: 0, opacity: 1 }, { at: 100, opacity: 0 }] },
    'sink-out': { trigger: 'click', duration: 700, delay: 0, easing: 'ease-in', repeat: 1, alternate: false, keyframes: [{ at: 0, opacity: 1, y: 0 }, { at: 100, opacity: 0, y: 60 }] },
    'zoom-out': { trigger: 'click', duration: 600, delay: 0, easing: 'ease-in', repeat: 1, alternate: false, keyframes: [{ at: 0, opacity: 1, scale: 1 }, { at: 100, opacity: 0, scale: 0.6 }] },
    'wobble': { trigger: 'click', duration: 800, delay: 0, easing: 'ease-in-out', repeat: 1, alternate: false, keyframes: [{ at: 0, rotate: 0 }, { at: 25, rotate: -6 }, { at: 50, rotate: 5 }, { at: 75, rotate: -3 }, { at: 100, rotate: 0 }] },
    'fade-in': { trigger: 'slide', duration: 800, delay: 300, easing: 'ease-out', repeat: 1, alternate: false, keyframes: [{ at: 0, opacity: 0 }, { at: 100, opacity: 1 }] },
    'rise': { trigger: 'slide', duration: 800, delay: 300, easing: 'ease-out', repeat: 1, alternate: false, keyframes: [{ at: 0, opacity: 0, y: 40 }, { at: 100, opacity: 1, y: 0 }] },
    'zoom-in': { trigger: 'slide', duration: 900, delay: 300, easing: 'elastic', repeat: 1, alternate: false, keyframes: [{ at: 0, opacity: 0, scale: 0.5 }, { at: 100, opacity: 1, scale: 1 }] },
    'slide-from-left': { trigger: 'slide', duration: 800, delay: 300, easing: 'ease-out', repeat: 1, alternate: false, keyframes: [{ at: 0, opacity: 0, x: -240 }, { at: 100, opacity: 1, x: 0 }] },
    'slide-from-right': { trigger: 'slide', duration: 800, delay: 300, easing: 'ease-out', repeat: 1, alternate: false, keyframes: [{ at: 0, opacity: 0, x: 240 }, { at: 100, opacity: 1, x: 0 }] },
    'spin-in': { trigger: 'slide', duration: 1000, delay: 300, easing: 'ease-out', repeat: 1, alternate: false, keyframes: [{ at: 0, opacity: 0, scale: 0.3, rotate: -180 }, { at: 100, opacity: 1, scale: 1, rotate: 0 }] },
    'bounce-in': { trigger: 'slide', duration: 1100, delay: 300, easing: 'ease-out', repeat: 1, alternate: false, keyframes: [{ at: 0, opacity: 0, y: -160 }, { at: 60, opacity: 1, y: 14 }, { at: 80, y: -6 }, { at: 100, y: 0 }] },
    'blur-in': { trigger: 'slide', duration: 900, delay: 300, easing: 'ease-out', repeat: 1, alternate: false, keyframes: [{ at: 0, opacity: 0, blur: 18 }, { at: 100, opacity: 1, blur: 0 }] },
    'pulse': { trigger: 'slide', duration: 1400, delay: 0, easing: 'ease-in-out', repeat: 'infinite', alternate: false, keyframes: [{ at: 0, scale: 1 }, { at: 50, scale: 1.06 }, { at: 100, scale: 1 }] },
    // orbit: a small circle around where it is, over and over · rock: tilts to and fro · blink: fades out a little and back
    'orbit': { trigger: 'slide', duration: 3200, delay: 0, easing: 'linear', repeat: 'infinite', alternate: false, keyframes: [{ at: 0, x: 0, y: 0 }, { at: 13, x: 17, y: 7 }, { at: 25, x: 24, y: 24 }, { at: 38, x: 17, y: 41 }, { at: 50, x: 0, y: 48 }, { at: 63, x: -17, y: 41 }, { at: 75, x: -24, y: 24 }, { at: 88, x: -17, y: 7 }, { at: 100, x: 0, y: 0 }] },
    'rock': { trigger: 'slide', duration: 2400, delay: 0, easing: 'ease-in-out', repeat: 'infinite', alternate: false, keyframes: [{ at: 0, rotate: 0 }, { at: 25, rotate: -6 }, { at: 75, rotate: 6 }, { at: 100, rotate: 0 }] },
    'blink': { trigger: 'slide', duration: 1600, delay: 0, easing: 'ease-in-out', repeat: 'infinite', alternate: false, keyframes: [{ at: 0, opacity: 1 }, { at: 50, opacity: 0.25 }, { at: 100, opacity: 1 }] },
    'float': { trigger: 'slide', duration: 3000, delay: 0, easing: 'ease-in-out', repeat: 'infinite', alternate: false, keyframes: [{ at: 0, y: 0 }, { at: 50, y: -14 }, { at: 100, y: 0 }] },
    'grow-right': { trigger: 'slide', duration: 900, delay: 300, easing: 'ease-out', repeat: 1, alternate: false, origin: 'left center', keyframes: [{ at: 0, opacity: 0, scaleX: 0 }, { at: 30, opacity: 1, scaleX: 0.3 }, { at: 100, opacity: 1, scaleX: 1 }] },   // out of its left side
    'swing': { trigger: 'slide', duration: 1400, delay: 300, easing: 'ease-in-out', repeat: 1, alternate: false, origin: 'center top', keyframes: [{ at: 0, rotate: 0 }, { at: 20, rotate: 14 }, { at: 40, rotate: -10 }, { at: 60, rotate: 6 }, { at: 80, rotate: -3 }, { at: 100, rotate: 0 }] },   // hanging from its top
    'flash': { trigger: 'slide', duration: 900, delay: 300, easing: 'ease-in-out', repeat: 1, alternate: false, keyframes: [{ at: 0, brightness: 1 }, { at: 25, brightness: 2.2 }, { at: 50, brightness: 1 }, { at: 75, brightness: 2.2 }, { at: 100, brightness: 1 }] },   // lights up twice
    'unfold': { trigger: 'slide', duration: 800, delay: 300, easing: 'ease-out', repeat: 1, alternate: false, origin: 'center top', keyframes: [{ at: 0, opacity: 0, scaleY: 0 }, { at: 40, opacity: 1, scaleY: 0.4 }, { at: 100, opacity: 1, scaleY: 1 }] },   // folds open from its top
    'swing-in': { trigger: 'slide', duration: 1100, delay: 300, easing: 'ease-out', repeat: 1, alternate: false, origin: 'center top', keyframes: [{ at: 0, opacity: 0, rotate: -40 }, { at: 40, opacity: 1, rotate: 18 }, { at: 65, rotate: -8 }, { at: 85, rotate: 3 }, { at: 100, opacity: 1, rotate: 0 }] },
    'heartbeat': { trigger: 'slide', duration: 1300, delay: 0, easing: 'ease-in-out', repeat: 'infinite', alternate: false, keyframes: [{ at: 0, scale: 1 }, { at: 14, scale: 1.14 }, { at: 28, scale: 1 }, { at: 42, scale: 1.1 }, { at: 70, scale: 1 }, { at: 100, scale: 1 }] },
    'tada': { trigger: 'click', duration: 1000, delay: 0, easing: 'ease-in-out', repeat: 1, alternate: false, keyframes: [{ at: 0, scale: 1, rotate: 0 }, { at: 10, scale: 0.9, rotate: -3 }, { at: 30, scale: 1.1, rotate: 3 }, { at: 50, scale: 1.1, rotate: -3 }, { at: 70, scale: 1.1, rotate: 3 }, { at: 90, scale: 1.1, rotate: -3 }, { at: 100, scale: 1, rotate: 0 }] },
    'glow': { trigger: 'slide', duration: 2200, delay: 0, easing: 'ease-in-out', repeat: 'infinite', alternate: false, keyframes: [{ at: 0, brightness: 1 }, { at: 50, brightness: 1.6 }, { at: 100, brightness: 1 }] },
    'slide-out-left': { trigger: 'click', duration: 700, delay: 0, easing: 'ease-in', repeat: 1, alternate: false, keyframes: [{ at: 0, opacity: 1, x: 0 }, { at: 100, opacity: 0, x: -240 }] },
    'slide-out-right': { trigger: 'click', duration: 700, delay: 0, easing: 'ease-in', repeat: 1, alternate: false, keyframes: [{ at: 0, opacity: 1, x: 0 }, { at: 100, opacity: 0, x: 240 }] },
    'blur-out': { trigger: 'click', duration: 800, delay: 0, easing: 'ease-in', repeat: 1, alternate: false, keyframes: [{ at: 0, opacity: 1, blur: 0 }, { at: 100, opacity: 0, blur: 18 }] },
    'shrink-out': { trigger: 'click', duration: 700, delay: 0, easing: 'ease-in', repeat: 1, alternate: false, keyframes: [{ at: 0, opacity: 1, scale: 1, rotate: 0 }, { at: 100, opacity: 0, scale: 0.1, rotate: 90 }] },
    'jelly': { trigger: 'slide', duration: 900, delay: 300, easing: 'ease-out', repeat: 1, alternate: false, keyframes: [{ at: 0, scaleX: 1, scaleY: 1 }, { at: 30, scaleX: 1.25, scaleY: 0.75 }, { at: 45, scaleX: 0.78, scaleY: 1.22 }, { at: 60, scaleX: 1.12, scaleY: 0.88 }, { at: 78, scaleX: 0.96, scaleY: 1.04 }, { at: 100, scaleX: 1, scaleY: 1 }] },   // squash and stretch
    'drop-in': { trigger: 'slide', duration: 800, delay: 300, easing: 'ease-out', repeat: 1, alternate: false, keyframes: [{ at: 0, opacity: 0, y: -60 }, { at: 100, opacity: 1, y: 0 }] },
    'roll-in': { trigger: 'slide', duration: 900, delay: 300, easing: 'ease-out', repeat: 1, alternate: false, keyframes: [{ at: 0, opacity: 0, x: -240, rotate: -120 }, { at: 100, opacity: 1, x: 0, rotate: 0 }] },
    'stretch-in': { trigger: 'slide', duration: 700, delay: 300, easing: 'ease-out', repeat: 1, alternate: false, keyframes: [{ at: 0, opacity: 0, scaleX: 0 }, { at: 60, opacity: 1, scaleX: 1.08 }, { at: 100, opacity: 1, scaleX: 1 }] },
    'nod': { trigger: 'click', duration: 700, delay: 0, easing: 'ease-in-out', repeat: 1, alternate: false, keyframes: [{ at: 0, rotate: 0 }, { at: 25, rotate: -7 }, { at: 50, rotate: 6 }, { at: 75, rotate: -3 }, { at: 100, rotate: 0 }] },
    'spin-forever': { trigger: 'slide', duration: 2400, delay: 0, easing: 'linear', repeat: 'infinite', alternate: false, keyframes: [{ at: 0, rotate: 0 }, { at: 100, rotate: 360 }] },   // a loader: turns slowly, again and again
    'spin': { trigger: 'click', duration: 900, delay: 0, easing: 'ease-in-out', repeat: 1, alternate: false, keyframes: [{ at: 0, rotate: 0 }, { at: 100, rotate: 360 }] },
    'rise-out': { trigger: 'click', duration: 700, delay: 0, easing: 'ease-in', repeat: 1, alternate: false, keyframes: [{ at: 0, opacity: 1, y: 0 }, { at: 100, opacity: 0, y: -60 }] },
    'spin-out': { trigger: 'click', duration: 800, delay: 0, easing: 'ease-in', repeat: 1, alternate: false, keyframes: [{ at: 0, opacity: 1, scale: 1, rotate: 0 }, { at: 100, opacity: 0, scale: 0.4, rotate: 270 }] },
    'land-in': { trigger: 'slide', duration: 650, delay: 300, easing: 'ease-out', repeat: 1, alternate: false, keyframes: [{ at: 0, opacity: 0, scale: 1.8 }, { at: 70, opacity: 1, scale: 0.96 }, { at: 100, opacity: 1, scale: 1 }] },   // comes down onto the slide from big
    'bounce': { trigger: 'click', duration: 900, delay: 0, easing: 'ease-out', repeat: 1, alternate: false, keyframes: [{ at: 0, y: 0 }, { at: 25, y: -40 }, { at: 50, y: 0 }, { at: 68, y: -16 }, { at: 84, y: 0 }, { at: 93, y: -5 }, { at: 100, y: 0 }] },
    'fall-out': { trigger: 'click', duration: 800, delay: 0, easing: 'ease-in', repeat: 1, alternate: false, keyframes: [{ at: 0, opacity: 1, y: 0, rotate: 0 }, { at: 100, opacity: 0, y: 140, rotate: 14 }] },   // drops off the slide, tipping over
    'pop-out': { trigger: 'click', duration: 500, delay: 0, easing: 'ease-in', repeat: 1, alternate: false, keyframes: [{ at: 0, opacity: 1, scale: 1 }, { at: 35, opacity: 1, scale: 1.15 }, { at: 100, opacity: 0, scale: 0 }] },
    'shake': { trigger: 'click', duration: 600, delay: 0, easing: 'linear', repeat: 1, alternate: false, keyframes: [{ at: 0, x: 0 }, { at: 20, x: -14 }, { at: 40, x: 14 }, { at: 60, x: -10 }, { at: 80, x: 10 }, { at: 100, x: 0 }] },
  };
  const KEYFRAME_FIELDS = ['at', 'opacity', 'x', 'y', 'scale', 'rotate', 'blur', 'scaleX', 'scaleY', 'skew', 'brightness', 'hue'];
  const EXTRA_KEYFRAME_FIELDS = ['scaleX', 'scaleY', 'skew', 'brightness', 'hue'];
  const SPLIT_STAGGER_MS = { word: 60, letter: 25, line: 180 };   // text by word, letter or line: the time between two parts, unless set
  const SPLIT_EFFECTS = ['', 'fade', 'pop', 'drop', 'blur', 'flip', 'scatter', 'type', 'typewriter'];
  const SPLIT_ORDERS = ['', 'reverse', 'middle', 'edges', 'random'];   // data-split-order (section 7)
  const LIST_BULLETS = ['', 'number', 'check', 'box', 'arrow', 'dash', 'none'];   // a list's bullets (data-bullets; '': the accent squares, css/05)   // how each part comes in ('': it rises; css/06)
  /** Where an animation turns and grows from (its "origin"): the 3 x 3 points of the element's box; '' is the middle. */
  const ANIMATION_ORIGINS = [['', 'editor.originMiddle'], ['left top', 'editor.originTopLeft'], ['center top', 'editor.originTop'], ['right top', 'editor.originTopRight'], ['left center', 'editor.originLeft'],
    ['right center', 'editor.originRight'], ['left bottom', 'editor.originBottomLeft'], ['center bottom', 'editor.originBottom'], ['right bottom', 'editor.originBottomRight']];   // in the keyframe table only once an animation uses them (+ property)
  const EFFECTS = ['', 'grow', 'from-left', 'from-right', 'rise', 'drop', 'zoom', 'wipe', 'wipe-down', 'iris', 'spin', 'pop', 'blur', 'flip', 'highlight', 'strike', 'underline', 'circled', 'tick', 'shake', 'pulse', 'jump', 'glow', 'fade-out', 'leave'];
  /** Click effects that point at an element already on screen by moving it once (not with an animation of its own on it: it would stop it). */
  const EMPHASIS_EFFECTS = ['shake', 'pulse', 'jump', 'glow'];

  /** A grey picture for a new image block, until a file is chosen. */
  /** What Insert offers (the Element tab and + Insert in the bar): blocks in the layout, then the freely placed ones (with SHAPES, section 19). */
  /** An animation's name as people read it: "slide-from-left" → "Slide from left" (its value in the file stays the same). */
  function animationLabel(name) {
    return String(name || '').replace(/[-_]+/g, ' ').trim().replace(/^./, letter => letter.toUpperCase());
  }
  const INSERT_BLOCKS = ['heading', 'text', 'eyebrow', 'list', 'columns', 'cards', 'numbers', 'progress', 'ring', 'table', 'steps', 'roadmap', 'chart', 'image', 'video', 'sound', 'quote', 'qr', 'break', 'agenda'];
  /** The resize handles around a selection: corners and sides, by compass direction. */
  const RESIZE_HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
  const PLACEHOLDER_IMAGE = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000"><rect width="1600" height="1000" fill="#24424b"/><path d="M560 640l180-220 140 160 100-110 180 170z" fill="#9bb5b8"/><circle cx="1010" cy="380" r="60" fill="#9bb5b8"/><text x="800" y="820" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="60" fill="#cfe0e2">Double-click to choose a picture</text></svg>');   // (what to do, on the picture itself)

  /** A design token's value ("--ease-out"), for the animation preview; `fallback` when it is not set. */
  function cssToken(name, fallback) { return getComputedStyle(root).getPropertyValue(name).trim() || fallback; }

  const editorCanvas = {
    textPaths: new Map(),    // slide name -> paths of elements that had text (an emptied text stays editable)
    stageElement: null,
    scene: null,             // the copy of the slide on the canvas
    selected: null,          // the selected element in that copy
    typingRecorded: false,
    writeTimer: null,
    drag: null,
    stopBodyDrag: null,      // ends a press on a free element that is waiting to become a drag (armBodyDrag)
    zoom: 1,                 // 1: the slide fits the canvas; up to 4 (section 19, Zoom)

    setUp(editorElement) {
      this.stageElement = editorElement.querySelector('.editor-stage');
      const canvas = editorElement.querySelector('.editor-canvas');
      canvas.addEventListener('pointerdown', event => this.onPointerDown(event));
      canvas.addEventListener('dblclick', event => this.onDoubleClick(event));
      canvas.addEventListener('input', event => this.onInput(event));
      canvas.addEventListener('focusout', event => { if (event.target.isContentEditable) this.finishTyping(); });
      canvas.addEventListener('focusin', event => {   // Tab to the next cell of a table: that cell is selected too (the Table buttons act there)
        const cell = event.target.closest && event.target.closest('table.data-table :is(td, th)');
        if (cell && cell.isContentEditable && cell !== this.selected && this.scene && this.scene.contains(cell)) this.selectElement(cell);
      });
      canvas.addEventListener('paste', event => {   // only plain text comes in
        if (!event.target.closest || !event.target.closest('[contenteditable="true"]')) return;
        event.preventDefault();
        const text = (event.clipboardData || window.clipboardData).getData('text/plain').replace(/\s*\r?\n\s*/g, ' ');   // one line: a new paragraph would break the layout
        document.execCommand('insertText', false, text);
      });
      canvas.addEventListener('keydown', event => {   // Enter finishes the text; Shift+Enter makes a new line
        if (!event.target.isContentEditable || event.isComposing || event.keyCode === 229) return;   // typing with an input method: leave it alone
        if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.target.blur(); return; }
        const key = event.key.toLowerCase();
        if ((event.ctrlKey || event.metaKey) && ['b', 'i', 'u'].includes(key)) {   // the browser's own formatting would add tags the editor does not know
          event.preventDefault();
          if (key === 'b') this.formatSelection('b');
          if (key === 'i') this.formatSelection('i');
          if (key === 'u') this.formatSelection('u');
        }
      });
      // the format buttons must not take the text selection away when they are pressed
      editorElement.querySelector('.editor-panel-body').addEventListener('mousedown', event => {
        if (event.target.closest('[data-action="bold"], [data-action="accent"], [data-action="plain"]')) event.preventDefault();
      });
      editorElement.querySelector('.editor-panel-body').addEventListener('focusin', () => { this.recordedInput = null; });   // a new field: a new undo step
      window.addEventListener('resize', () => {
        if (!editor.isOpen()) return;
        this.fit();
        if (!editor.element.querySelector('.editor-dialog').hidden) scaleThumbnails(editor.element.querySelector('.editor-template-grid'));
      });
      editorElement.querySelector('.editor-panel-body').addEventListener('input', event => {
        // keyframe values change while you type; "at %" only when you leave the field (it re-sorts the rows)
        if (event.target.matches('[data-keyframe]') && event.target.dataset.key !== 'at') this.onPanelChange(event);
      });
    },

    /* ---- Showing the slide ---- */
    /** A still copy of a model slide for this page: files put in place, QR codes and charts drawn. */
    stillCopyOf(modelScene, assets) {
      const copy = document.importNode(modelScene, true);
      copy.classList.add('is-active');
      copy.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
      resolveAssets(copy, assets);
      copy.querySelectorAll('.qr-code').forEach(element => runSafely('QR code', () => drawQrCode(element)));
      copy.querySelectorAll('.chart').forEach(figure => runSafely('chart', () => drawChart(figure)));
      copy.querySelectorAll('video').forEach(video => { video.removeAttribute('autoplay'); video.muted = true; });
      copy.inert = true;
      return copy;
    },
    render(modelScene) {
      const stageElement = this.stageElement;
      // a Shift+click group survives a redraw of the same slide (e.g. after "Place freely"): kept by its paths
      const sameSlide = this.scene && modelScene && this.scene.getAttribute('data-name') === modelScene.getAttribute('data-name');
      const groupPaths = sameSlide ? editorTools.group.filter(item => this.scene.contains(item)).map(item => this.pathOf(item)) : [];
      stageElement.innerHTML = '';
      this.scene = null;
      editorTools.leavePlaying();   // a redraw shows the still slide again
      editorLayers.stopPreview();
      if (!modelScene) return;
      const assets = editor.modelAssets();
      const logo = editor.modelStage().querySelector(':scope > .logo');
      if (logo) { const logoCopy = document.importNode(logo, true); resolveAssets(logoCopy, assets); stageElement.appendChild(logoCopy); }
      stageElement.dataset.slide = modelScene.getAttribute('data-name');
      const scene = this.scene = document.importNode(modelScene, true);
      scene.classList.add('is-active');
      // (canvas only: cleanCopy takes it away) its number as when presenting: main slides 1, 2, 3 …, backup slides B1, B2 …
      const before = editor.modelScenes().slice(0, editor.modelScenes().indexOf(modelScene) + 1).filter(other => other.hasAttribute('data-backup') === modelScene.hasAttribute('data-backup')).length;
      slideFooter.apply(scene, modelScene.hasAttribute('data-backup') ? ui('slides.backupNumber', { number: before }) : String(before), editor.model.getElementById('deck'));
      resolveAssets(scene, assets);
      scene.querySelectorAll('.qr-code').forEach(element => runSafely('QR code', () => drawQrCode(element)));
      scene.querySelectorAll('.chart').forEach(figure => runSafely('chart', () => drawChart(figure)));
      scene.querySelectorAll('video').forEach(video => { video.muted = true; video.pause(); });   // the property only: the file keeps its attributes
      const behaviour = slideBehaviours[modelScene.getAttribute('data-name')];
      if (behaviour && behaviour.preparePreview) runSafely('editor preview', () => behaviour.preparePreview(scene));
      stageElement.appendChild(scene);
      this.makeTextsEditable(scene);
      runSafely('example text', () => this.markSampleTexts(scene));
      editorTools.group = groupPaths.map(path => this.elementAtPath(path)).filter(Boolean);
      if (editorTools.group.length < 2) editorTools.group = [];
      const overlay = document.createElement('div');
      overlay.className = 'editor-overlay';
      // the selection: 8 resize handles (the right one and the bottom right one keep their old class names), a round turn
      // handle above it, a move grip below it; a readout (x, y / width × height) while dragging; the line where a dragged
      // block will go in the layout, and the dashed box where it lands when it is pulled out (placed freely)
      const handles = RESIZE_HANDLES.map(dir => '<span class="editor-handle' + (dir === 'e' ? ' editor-resize' : dir === 'se' ? ' editor-resize-corner' : '') + '" data-dir="' + dir + '" data-ui-title="' + (dir.length === 2 ? 'editor.dragToResizeCorner' : 'editor.dragToResize') + '"></span>').join('');
      overlay.innerHTML = '<div class="editor-selection" hidden><span class="editor-move" data-ui-title="editor.dragToMove"></span>' + handles + '<span class="editor-rotate" data-ui-title="editor.dragToRotate"></span></div>' +
        '<div class="editor-guide is-vertical" hidden></div><div class="editor-guide is-horizontal" hidden></div>' +
        '<div class="editor-readout" hidden></div><div class="editor-insert-line" hidden></div><div class="editor-drop-box" hidden></div>';
      applyInterfaceTexts(overlay);
      stageElement.appendChild(overlay);
      this.drawUserGuides(overlay);
      if (this.selectedPath) {
        this.selected = this.elementAtPath(this.selectedPath);
        if (this.selected) this.selected.classList.add('is-editor-selected');
      }
      // a new selection outside the group (a duplicate, a paste) ends it: Delete and the arrows then act on what you see selected
      if (editorTools.group.length && !editorTools.group.includes(this.selected)) editorTools.group = [];
      this.fit();
      this.drawSelection();
      if (this.zoom > 1 && this.selected) this.scrollToSelection();   // zoomed in: never out of sight
    },
    /** Scrolls the zoomed canvas (only the canvas, never the slide inside it) so the selection is in view. */
    scrollToSelection() {
      const area = this.stageElement.closest('.editor-canvas-scroll');
      const view = area.getBoundingClientRect(), box = this.selected.getBoundingClientRect();
      const margin = 16;
      const along = (start, end, viewStart, viewSize) => {   // how far to scroll: 0 when it is in view already
        if (start < viewStart + margin) return start - viewStart - margin;
        if (end > viewStart + viewSize - margin) return Math.min(end - viewStart - viewSize + margin, start - viewStart - margin);
        return 0;
      };
      area.scrollLeft += along(box.left, box.right, view.left, area.clientWidth);
      area.scrollTop += along(box.top, box.bottom, view.top, area.clientHeight);
    },
    fit() {
      const box = this.stageElement.parentElement;
      const area = this.stageElement.closest('.editor-canvas-scroll');   // its outer size: the scroll bars of a zoomed slide do not count
      const scale = Math.min((area.offsetWidth - 32) / CONFIG.stage.width, (area.offsetHeight - 32) / CONFIG.stage.height);
      this.scale = Math.max(.1, scale) * this.zoom;
      box.style.width = CONFIG.stage.width * this.scale + 'px';
      box.style.height = CONFIG.stage.height * this.scale + 'px';
      this.stageElement.style.transform = 'scale(' + this.scale + ')';
      this.stageElement.style.setProperty('--editor-scale', this.scale);   // handles and readouts keep their size on screen (css/13)
      if (editorLayers.transitionPreview) editorLayers.transitionPreview.stage.style.transform = this.stageElement.style.transform;   // section 20
      editorTools.showZoom();
      this.drawSelection();
      editorCommands.placeTextBar();   // zoomed: the text bar stays above its words
    },
    /** Texts you can type in: elements with their own text and only inline formatting inside. */
    /** ⏭ After the one before: its own animation starts when the last one before it (on the slide, coming with the slide)
        has ended, as "After previous" in PowerPoint. Its Delay field gets that time (one undo step). */
    startAfterPrevious(element) {
      if (!element || !this.scene) return;
      let end = 0;
      Array.from(this.scene.querySelectorAll('.reveal, [data-animation]')).forEach(other => {
        if (other === element || other.contains(element) || element.contains(other)) return;
        if (!(other.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING)) return;   // only what comes before it
        if (other.hasAttribute('data-reveal-step') || other.closest('[data-reveal-step]')) return;   // (on a click: not with the slide)
        const own = editor.animations()[other.getAttribute('data-animation')];
        if (own && own.trigger === 'click') return;
        const timing = editorTools.timingOf(other, 'slide');
        if (Number.isFinite(timing.start + timing.length)) end = Math.max(end, timing.start + timing.length);
      });
      if (!end) { showToast(ui('editor.animNothingBefore')); return; }
      editorCommands.applySetting('element', 'data-anim-field', 'delay', String(Math.round(end / 50) * 50));
      showToast(ui('editor.animAfterPreviousDone', { seconds: (Math.round(end / 50) * 50 / 1000).toFixed(2).replace(/0$/, '') }));
    },
    /** A new picture in the layout: half the width, or smaller until the slide's content fits again (a big picture pushed
        the texts below it off the slide). Never under a fifth. */
    fitNewPicture(frame) {
      const content = this.scene && this.scene.querySelector(':scope > .content');
      if (!content || !frame.isConnected) return;
      const bottom = () => Math.max(...Array.from(content.children).filter(child => child.getClientRects().length && !child.matches('.speaker-notes')).map(child => child.getBoundingClientRect().bottom));
      const limit = this.scene.getBoundingClientRect().bottom - 2;
      for (let width = 50; width > 20 && bottom() > limit; width -= 5) frame.style.width = (width - 5) + '%';
    },
    /** Example text on the canvas (a layout's "Topic", Insert's "Point 3"): a dotted line under it and a tooltip, until
        you type over it (cleanCopy takes both away again: they never reach the file). */
    markSampleTexts(scene) {
      scene.querySelectorAll('*').forEach(element => {
        if (element.children.length || element.closest('.speaker-notes, svg, script, style, .editor-overlay')) return;
        if (!editorTools.isSampleText(element.textContent)) return;
        element.classList.add('is-sample-text');
        element.setAttribute('data-editor-sample', ui('editor.sampleTextTooltip'));
      });
    },
    makeTextsEditable(scene) {
      const editable = element => { element.setAttribute('contenteditable', 'true'); element.setAttribute('spellcheck', 'true'); };
      const name = scene.getAttribute('data-name');
      const hadText = this.textPaths.get(name) || new Set();
      this.textPaths.set(name, hadText);
      scene.querySelectorAll('*').forEach(element => {
        // (a slide's own CSS is no text; a chart is drawn from its rows, but its caption is a text)
        if (element.closest('svg, style, script, .speaker-notes, [hidden], [data-no-edit], .chart, .count-up, [data-edit-attr], .break-timer time, .qr-code') && !element.matches('.chart > figcaption')) return;
        if (element.parentElement && element.parentElement.closest('[contenteditable="true"]')) return;   // already inside an editable text
        const textNodes = Array.from(element.childNodes).filter(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
        const onlyInline = Array.from(element.children).every(child => INLINE_TAGS.has(child.tagName) && !child.matches('.count-up, [data-edit-attr], [data-no-edit]'));
        const path = this.pathOf(element).join('/');
        if (textNodes.length) hadText.add(path);
        const emptied = !textNodes.length && (hadText.has(path) || element.matches('table.data-table :is(td, th)')) && Array.from(element.children).every(child => child.tagName === 'BR');   // (a table's cell: always)
        // all of its text in one formatting tag (bold, underlined, …): the text itself is typed in, so its handles and Plain stay
        const formattedWhole = !textNodes.length && !INLINE_TAGS.has(element.tagName) && element.children.length === 1 && element.children[0].matches('b, strong, i, em, u, s, sup, sub, mark') && !element.children[0].hasAttribute('class') && element.textContent.trim() !== '';
        if ((textNodes.length && onlyInline) || emptied || (formattedWhole && onlyInline)) {
          editable(element);
          element.querySelectorAll('.count-up').forEach(number => number.setAttribute('contenteditable', 'false'));   // (a counted number deeper in, e.g. in <b>: its value is set under Number)
          return;
        }
        // text next to a number or another special part (e.g. "92.2" + "%"): each loose piece of text gets its
        // own editable span on the canvas only (cleanCopy takes the spans away again)
        textNodes.forEach(node => {
          const wrap = document.createElement('span');
          wrap.setAttribute('data-editor-wrap', '');
          node.replaceWith(wrap);
          wrap.appendChild(node);
          editable(wrap);
        });
      });
    },

    /* ---- Writing the canvas back into the model ---- */
    /** The canvas copy without the editor's own marks and the drawings the script makes when it runs. */
    cleanCopy() {
      const copy = this.scene.cloneNode(true);
      copy.classList.remove('is-active');
      copy.removeAttribute('inert');
      copy.querySelectorAll('[data-editor-wrap]').forEach(wrap => wrap.replaceWith(...wrap.childNodes));   // canvas-only spans
      copy.querySelectorAll(':scope > .slide-footer').forEach(footer => footer.remove());   // the footer is written when the page opens
      copy.querySelectorAll('[contenteditable]').forEach(element => { element.removeAttribute('contenteditable'); element.removeAttribute('spellcheck'); });
      copy.querySelectorAll('.is-sample-text, [data-editor-sample]').forEach(element => { element.classList.remove('is-sample-text'); element.removeAttribute('data-editor-sample'); if (!element.getAttribute('class')) element.removeAttribute('class'); });   // (canvas-only marks)
      copy.querySelectorAll('br').forEach(lineBreak => { if (!lineBreak.parentElement.textContent.trim()) lineBreak.remove(); });   // left by an emptied text
      copy.classList.remove('is-visible');   // play-through classes (section 19), in case they are still there
      copy.querySelectorAll('.is-editor-selected, .is-editor-dragged, .is-revealed, .is-previewing, .is-dimmed').forEach(element => element.classList.remove('is-editor-selected', 'is-editor-dragged', 'is-revealed', 'is-previewing', 'is-dimmed'));   // also a running ▶ Preview, Dim the rest
      copy.classList.remove('has-focus');
      copy.querySelectorAll('.chart-drawing').forEach(drawing => drawing.remove());
      // a count-up as its end number: not one that is counting or rolling (odometer strips) while the canvas plays or is paused
      copy.querySelectorAll('.count-up').forEach(number => { const end = parseFloat(number.dataset.to); if (Number.isFinite(end)) number.textContent = countUpText(number, end); });
      copy.querySelectorAll('[data-split]').forEach(element => unsplitText(element));   // text by word: the plain text (section 7)
      copy.querySelectorAll('.qr-code').forEach(element => { element.innerHTML = ''; });
      copy.querySelectorAll(':scope > style[data-element-css]').forEach(block => { if (!copy.querySelector('[data-css="' + CSS.escape(block.getAttribute('data-element-css')) + '"]')) block.remove(); });   // its element is gone (section 20e)
      copy.querySelectorAll('.flow-links').forEach(svg => { svg.innerHTML = ''; });
      copy.querySelectorAll('[data-asset]').forEach(element => element.removeAttribute('src'));
      copy.querySelectorAll('[data-asset-poster]').forEach(element => element.removeAttribute('poster'));
      [copy].concat(Array.from(copy.querySelectorAll('[data-asset-background]'))).forEach(element => {
        element.style.removeProperty('--asset-background');   // put in by resolveAssets; the file names the asset
        if (element.getAttribute('style') === '') element.removeAttribute('style');
      });
      copy.querySelectorAll('[class=""]').forEach(element => element.removeAttribute('class'));
      // Chrome types a non-breaking space at the end of a word; a normal space reads better in the file
      const walker = document.createTreeWalker(copy, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) if (walker.currentNode.nodeValue.includes('\u00a0')) walker.currentNode.nodeValue = walker.currentNode.nodeValue.replace(/\u00a0/g, ' ');
      // a title read out as one word ("IDEA", "Thank you") follows its edited letters
      copy.querySelectorAll('h1[aria-label], h2[aria-label]').forEach(title => {
        if (!title.hasAttribute('data-edit-attr') && title.textContent.trim()) title.setAttribute('aria-label', title.textContent.replace(/\s+/g, ' ').trim());
      });
      return copy;
    },
    writeBack() {
      clearTimeout(this.writeTimer);
      if (!this.scene || !editor.selected) return;
      if (editorCode.running) { editorTools.stopPlaying(); return; }   // the canvas holds what scripts made (▶ in the Code tab): never written
      runSafely('connectors', () => editorTools.updateConnectors(this.scene));   // connected arrows follow their elements (section 19)
      const fresh = editor.model.importNode(this.cleanCopy(), true);
      editor.selected.replaceWith(fresh);
      editor.selected = fresh;
      editor.changed(fresh);
    },
    /** A change made on the canvas: undo step, change, write back, redraw. */
    change(changeFunction, options) {
      this.finishTyping();
      editor.record();
      this.duplicateFrom = null;
      changeFunction();
      this.writeBack();
      this.selectedPath = this.selected && this.scene && this.scene.contains(this.selected) ? this.pathOf(this.selected) : null;   // (an element no longer on the slide: none)
      // a duplicate remembers where its original was (smart duplicate); any other change on another element forgets it
      if (this.duplicateFrom) this.lastDuplicate = Object.assign({ slide: editor.selected && editor.selected.getAttribute('data-name'), path: String(this.selectedPath) }, this.duplicateFrom);
      else if (!this.lastDuplicate || this.lastDuplicate.path !== String(this.selectedPath)) this.lastDuplicate = null;
      if (options && options.rerender) editor.renderAll();
      else { this.drawSelection(); editor.renderSlideList(); editor.renderPanel(); }
    },
    onInput(event) {
      if (!event.target.isContentEditable) return;
      if (!this.typingRecorded) {
        editor.nextLabel = ui('editor.historyTyping'); editor.record(); editor.nextLabel = null; this.typingRecorded = true;
        // typing in the slide's heading: the slide list's name may follow it (finishTyping), when that name is still the
        // layout's or the heading's own (a name chosen in the Slide tab stays)
        const heading = this.scene && this.scene.querySelector('h1, h2'), modelHeading = editor.selected && editor.selected.querySelector('h1, h2');
        this.titleWatch = heading && modelHeading && (heading.contains(event.target) || event.target.contains(heading))
          ? { title: (editor.selected.getAttribute('data-title') || '').trim(), heading: modelHeading.textContent.replace(/\s+/g, ' ').trim() } : null;
      }
      this.typingIn = event.target.closest('[data-fit-text]') || this.typingIn;   // Keep fitting: the text typed in (a click on another element selects that one first)
      clearTimeout(this.writeTimer);
      this.writeTimer = setTimeout(() => { this.writeBack(); editor.renderSlideList(); }, CONFIG.editor.writeBackAfterMs);
      this.drawSelection();
    },
    /** After typing in the heading: the slide's name (the slide list, the chapter bar) becomes the new heading, if the name
        was the layout's ("Title and bullet points") or the old heading itself. Part of the same undo step. */
    followHeading() {
      const watch = this.titleWatch, scene = editor.selected;
      this.titleWatch = null;
      if (!watch || !scene || (scene.getAttribute('data-title') || '').trim() !== watch.title) return;
      const layoutNames = editor.templateScenes().map(template => (template.getAttribute('data-title') || '').replace(/^Template: /, '').trim().toLowerCase());
      if (watch.title && watch.title !== watch.heading && !layoutNames.includes(watch.title.toLowerCase()) && watch.title !== ui('editor.blankTitle')) return;
      const heading = scene.querySelector('h1, h2'), text = heading ? heading.textContent.replace(/\s+/g, ' ').trim().slice(0, 80) : '';
      if (text && text !== watch.title) { scene.setAttribute('data-title', text); editor.changed(scene); }
    },
    finishTyping() {
      if (this.typingRecorded) {
        this.writeBack();
        const typedIn = this.typingIn && this.typingIn.isConnected ? this.typingIn : this.selected;
        if (typedIn && editorTools.refit(typedIn)) this.writeBack();   // Keep fitting: the new text gets its best size (the same undo step)
        this.typingIn = null;
        this.typingRecorded = false;
        runSafely('slide name', () => this.followHeading());
        if (editor.element) editor.renderSlideList();
      }
    },

    /* ---- Selecting ---- */
    /** The element a click selects: the clicked element, or the nearest that is not inline text formatting. */
    blockOf(target) {
      const host = target.closest && target.closest('[contenteditable="true"]');
      if (host && this.scene.contains(host)) return host.matches('[data-editor-wrap]') ? host.parentElement : host;   // the text you type in, not its container
      let element = target.closest('svg') ? target.closest('svg').parentElement : target;
      while (element && element !== this.scene && INLINE_TAGS.has(element.tagName) && !element.matches('.count-up, img')) element = element.parentElement;
      return element && element !== this.scene && this.scene.contains(element) ? element : null;
    },
    /** A path of child numbers from the slide down to an element, so the selection survives a redraw. */
    pathOf(element) {
      const path = [];
      while (element && element !== this.scene) { path.unshift(Array.prototype.indexOf.call(element.parentElement.children, element)); element = element.parentElement; }
      return path;
    },
    elementAtPath(path) {
      let element = this.scene;
      for (const index of path || []) { element = element && element.children[index]; }
      return element && element !== this.scene ? element : null;
    },
    selectElement(element) {
      if (this.previewRun && element !== this.selected) this.stopPreview();   // a preview belongs to the element it plays on
      if (editorMotion.drawing && element !== this.selected) editorMotion.setDrawing(false);   // Draw a path was for the element before
      if (!editorTools.group.includes(element)) { editorTools.group = []; editorTools.drawGroup(); }   // a plain click ends a group
      if (this.selected) this.selected.classList.remove('is-editor-selected');
      this.selected = element || null;
      this.selectedPath = element ? this.pathOf(element) : null;
      if (element) element.classList.add('is-editor-selected');
      if (editor.element) {
        editor.panelTab = editorMotion.recording ? 'animations' : editor.panelTab === 'code' ? 'code' : element ? 'element' : 'slide';   // in Record the timeline stays; the Code tab stays
        editor.renderPanel();
        this.drawSelection();
      }
    },
    onPointerDown(event) {
      if (this.stopBodyDrag) this.stopBodyDrag();   // a new press: an earlier one that never got its pointerup waits no longer
      if (!this.scene) return;
      // a panel field you typed in, then clicked the slide: leave it now, so its change goes to the element it belongs to
      // (later, the new selection would already be there: the value, or a shared animation's timing, would land on the wrong one)
      const field = document.activeElement;
      if (field && field.closest('.editor-panel-body') && field.matches('input:not([type="checkbox"]), textarea')) {
        field.blur();
        if (!event.target.isConnected) return;   // that change redrew the slide: click again
      }
      if (editorTools.playStep >= 0 && this.stageElement.contains(event.target) && !editorMotion.recording) { editorTools.stopPlaying(); return; }   // a click on the playing slide stops it (in Record it stays, to move things)
      const handle = event.target.closest('.editor-move, .editor-handle, .editor-rotate');
      if (handle && this.selected) {
        if (handle.classList.contains('editor-move') && !this.isFree(this.selected) && !this.canMoveAsGroup()) { this.startReorder(event); return; }   // a block in the layout: to another place in it, or out (several selected: they all move)
        this.startDrag(event, handle.classList.contains('editor-handle') ? 'resize' : handle.classList.contains('editor-rotate') ? 'rotate' : 'move', handle.dataset.dir);
        return;
      }
      if (this.selected && event.button === 0 && editorMotion.nearPath(event)) { event.preventDefault(); return; }   // on its motion path: it stays selected (a double-click adds a keyframe there, section 20b)
      if (!this.scene.contains(event.target)) {
        const logo = event.target.closest('.logo');
        if (logo && logo.parentElement === this.stageElement) { editorLayers.openLogoSettings(); return; }   // the logo: its settings (Presentation tab; not the one of a transition preview)
        const area = event.target.matches('.editor-canvas-scroll') ? event.target : null;
        if (area && (event.offsetX >= area.clientWidth || event.offsetY >= area.clientHeight)) return;   // its scroll bar (zoomed in)
        if (event.target.closest('.editor-stage-box') || event.target.matches('.editor-canvas, .editor-canvas-scroll')) {
          if (!event.shiftKey) this.selectElement(null);
          if (event.button === 0 && !this.locked()) { event.preventDefault(); this.armMarquee(event); }   // drawn from around the slide: a box that selects what is in it
        }
        return;
      }
      // an element sent "To the back" lies under the slide's content: a click on it (not on a text) still selects it
      const behindAt = () => document.elementsFromPoint(event.clientX, event.clientY).map(node => node.closest && node.closest('.is-free'))
        .find(node => node && this.scene.contains(node) && parseInt(getComputedStyle(node).zIndex, 10) < 0);
      if (event.button === 0 && this.isEmptySpot(event.target) && !this.locked() && !behindAt()) {   // an empty spot: a drag draws a box that selects (a click: as before)
        event.preventDefault();   // no text cursor, no words selected on the way
        const active = document.activeElement;
        if (active && active.isContentEditable && this.scene.contains(active)) { this.finishTyping(); active.blur(); }
        this.armMarquee(event);
        if (event.shiftKey) return;   // (Shift: adds to the selection; the empty spot itself is not one)
      }
      let block = this.blockOf(event.target);
      const typingHere = document.activeElement && document.activeElement.isContentEditable && document.activeElement.contains(event.target);
      if (!block || !block.isContentEditable) {
        const behind = behindAt();
        if (behind && (!block || !this.isFree(block))) block = behind;
      }
      // a part of a freely placed element that is no text (the image in its frame) stands for that element, so a drag moves it;
      // once the element is selected, a click (without moving) reaches the part
      const isText = node => node.isContentEditable || !!node.querySelector('[contenteditable="true"]');
      // (a shape's text counts as a part too: the first press takes the shape, a click on the selected shape types in it)
      const holder = block && !this.isFree(block) && (!isText(block) || block.matches('.shape > .shape-text')) && block.parentElement ? block.parentElement.closest('.is-free') : null;
      const canDrag = node => event.button === 0 && !this.locked() && !editorLayers.isLocked(node) && !editorLayers.refuses([node]);   // not on a slide with its own script
      const part = block;
      const inShapeText = part && part.matches('.shape > .shape-text');
      if (holder && this.scene.contains(holder) && (event.shiftKey || holder !== this.selected) && !(inShapeText && typingHere)) {   // (typing in a shape's text: a click stays in it)
        block = holder;
        if (inShapeText && !event.shiftKey) {   // the press takes the shape: no cursor in its text yet (keys then move or delete the shape)
          event.preventDefault();
          if (document.activeElement && document.activeElement.isContentEditable && this.scene.contains(document.activeElement)) document.activeElement.blur();
        }
      }
      // in a group (Ctrl+G): the first click takes the whole group, the next one what lies in it (nested: one level per click)
      const groups = [];
      for (let node = block && block.parentElement; node && node !== this.scene; node = node.parentElement) if (node.hasAttribute('data-group')) groups.unshift(node);
      const outside = groups.find(groupBox => !(this.selected && groupBox.contains(this.selected)));
      if (outside && !typingHere) {
        block = outside;
        event.preventDefault();   // the press takes the group: no cursor in a text of it (keys move or ungroup the group)
        if (document.activeElement && document.activeElement.isContentEditable && outside.contains(document.activeElement)) document.activeElement.blur();
      }
      if (event.shiftKey && block && !this.locked() && !typingHere) { event.preventDefault(); editorTools.toggleGroup(block); return; }   // several elements (in the text you type: Shift+click selects words)
      if (holder && holder === this.selected && block === part) {
        if (canDrag(holder)) { this.armBodyDrag(event, holder, () => this.selectElement(part)); return; }
      }
      if (block !== this.selected) this.selectElement(block);
      // a freely placed element moves when you drag it anywhere (not only by its handle); a text you are typing in selects words instead
      if (block && !typingHere && (this.isFree(block) || this.canMoveAsGroup()) && canDrag(block)) this.armBodyDrag(event, block);   // (several selected: all of them)
      // a block in the layout that is no text (an image, a chart): a drag moves it to another place in the layout, or out of it
      else if (block && !typingHere && !isText(block) && this.canReorder(block) && canDrag(block)) this.armBodyDrag(event, block, null, () => this.startReorder(event));
    },
    /** A double-click on an empty spot of the slide: a text box there, ready to type in. */
    /** A picture placeholder (the "image and text" layout): a picture chosen for it takes its place (same place in the
        layout, same way of appearing), one undo step. */
    fillPlaceholder(placeholder) {
      if (!placeholder || this.locked()) return;
      this.pickFile('image/*', file => this.readFile(file, dataUrl => {
        editor.nextLabel = ui('editor.historyPicture');
        this.change(() => {
          const assets = editor.modelAssets();
          const name = addAsset(assets, dataUrl, editor.selected.getAttribute('data-name') + '-' + file.name.replace(/\.[^.]+$/, ''));
          writeAssetsOf(editor.model, assets);
          const frame = document.createElement('div');
          frame.className = Array.from(placeholder.classList).filter(name => name !== 'image-placeholder').concat('image-frame').join(' ');
          if (placeholder.getAttribute('style')) frame.setAttribute('style', placeholder.getAttribute('style'));
          Array.from(placeholder.attributes).forEach(attribute => { if (/^data-/.test(attribute.name)) frame.setAttribute(attribute.name, attribute.value); });
          frame.innerHTML = '<img alt="">';
          frame.firstChild.setAttribute('alt', file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '));
          frame.firstChild.setAttribute('data-asset', name);
          frame.firstChild.setAttribute('src', dataUrl);
          placeholder.replaceWith(frame);
          this.selected = frame;
        }, { rerender: true });
        editor.nextLabel = null;
      }));
    },
    onDoubleClick(event) {
      const placeholder = event.button === 0 && this.scene && this.scene.contains(event.target) && event.target.closest('.image-placeholder');
      if (placeholder) { event.preventDefault(); if (placeholder !== this.selected) this.selectElement(placeholder); this.fillPlaceholder(placeholder); return; }
      // a picture: choose another one (the placeholder picture says so on itself)
      const picture = event.button === 0 && editorTools.playStep < 0 && this.scene && this.scene.contains(event.target) && !this.stageElement.querySelector('.editor-motion-path') && event.target.closest('img');
      if (picture && !this.locked() && !editorLayers.isLocked(picture)) {
        event.preventDefault();
        const block = this.blockOf(picture) || picture;
        if (block !== this.selected) this.selectElement(block);
        this.pickFile('image/*', file => this.replaceMedia(picture, file));
        return;
      }
      // a number that counts up or a chart: its value (its rows) in the Element tab, ready to type (as a double-click on a
      // chart in PowerPoint opens its data)
      const data = event.button === 0 && !event.target.closest('figcaption, .chart-caption') && editorTools.playStep < 0 && this.scene && this.scene.contains(event.target) && !this.stageElement.querySelector('.editor-motion-path') && event.target.closest('.count-up, .chart');   // (not while a motion path shows: a double-click there adds a point)   // (its caption: a text to type in, not its rows)
      if (data) {
        event.preventDefault();
        const block = data.matches('.chart') ? data : (data.closest('.stat') || data);
        if (block !== this.selected) this.selectElement(block);
        editor.panelTab = 'element';
        editor.renderPanel();
        editorCommands.openDock('right');
        const field = editor.element.querySelector('.editor-panel-body [data-element-field="' + (data.matches('.chart') ? 'chartRows' : 'countUp') + '"]');
        if (field) { editor.unfoldAround(field); field.scrollIntoView({ block: 'center' }); field.focus(); if (field.select) field.select(); }
        return;
      }
      if (event.button !== 0 || event.shiftKey || editorTools.playStep >= 0 || !this.isEmptySpot(event.target)) return;
      event.preventDefault();
      this.selectElement(null);
      this.insertBlock('textbox', this.stagePoint(event));
    },
    /** The slide itself, or its layout column, where no element lies (a click there selects nothing in particular). */
    isEmptySpot(target) {
      return !!this.scene && (target === this.scene || (target.parentElement === this.scene && target.classList.contains('content')));
    },
    /** Where the pointer is, in slide pixels (the canvas is scaled and may be zoomed and scrolled). */
    stagePoint(event) {
      const box = this.stageElement.getBoundingClientRect();
      return { x: (event.clientX - box.left) / this.scale, y: (event.clientY - box.top) / this.scale };
    },
    /** A drag from an empty spot: a dashed box; let go and everything that lies wholly inside it is selected (Shift: added). Esc cancels. */
    armMarquee(downEvent) {
      const overlay = this.stageElement.querySelector('.editor-overlay');
      if (!overlay) return;
      const from = this.stagePoint(downEvent);
      let box = null, mark = null;
      const onMove = moveEvent => {
        if (moveEvent.pointerType === 'mouse' && !(moveEvent.buttons & 1)) { box = null; stop(); return; }   // its release was lost (outside the window)
        if (!box && Math.abs(moveEvent.clientX - downEvent.clientX) + Math.abs(moveEvent.clientY - downEvent.clientY) < 6) return;
        if (window.getSelection() && !window.getSelection().isCollapsed) window.getSelection().removeAllRanges();
        if (!mark) {
          mark = document.createElement('div');
          mark.className = 'editor-marquee';
          overlay.appendChild(mark);
          editor.element.classList.add('is-moving');   // no text gets selected on the way (css/13)
          if (window.getSelection()) window.getSelection().removeAllRanges();
        }
        const to = this.stagePoint(moveEvent);
        box = { left: Math.min(from.x, to.x), top: Math.min(from.y, to.y), width: Math.abs(to.x - from.x), height: Math.abs(to.y - from.y) };
        Object.assign(mark.style, { left: box.left + 'px', top: box.top + 'px', width: box.width + 'px', height: box.height + 'px' });
      };
      const stop = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', stop);
        window.removeEventListener('keydown', onKey, true);
        if (mark) mark.remove();
        editor.element.classList.remove('is-moving');
      };
      const onUp = () => { stop(); if (box) editorTools.selectInBox(box, downEvent.shiftKey); };
      const onKey = keyEvent => { if (keyEvent.key === 'Escape') { keyEvent.preventDefault(); keyEvent.stopPropagation(); box = null; stop(); } };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', stop);
      window.addEventListener('keydown', onKey, true);
    },
    /** Waits for the pointer to really move (a click still places the cursor in a text), then drags like the move handle. */
    armBodyDrag(downEvent, block, onClick, onStart) {
      if (this.stopBodyDrag) this.stopBodyDrag();   // only one at a time
      const stop = this.stopBodyDrag = () => {
        this.stopBodyDrag = null;
        document.removeEventListener('pointermove', onMove, true);
        document.removeEventListener('pointerup', onUp, true);
        document.removeEventListener('pointercancel', stop, true);
        document.removeEventListener('dragstart', noNativeDrag, true);
      };
      const onUp = () => { stop(); if (onClick) onClick(); };   // let go without moving: a click
      const noNativeDrag = event => event.preventDefault();   // an image would start the browser's own drag (and no pointerup would come)
      const onMove = moveEvent => {
        if (moveEvent.pointerType === 'mouse' && !(moveEvent.buttons & 1)) { stop(); return; }   // the mouse moves with no button held: its release was lost (outside the window), no drag
        if (Math.abs(moveEvent.clientX - downEvent.clientX) + Math.abs(moveEvent.clientY - downEvent.clientY) < 5) return;
        stop();
        if (this.selected !== block || !block.isConnected) return;
        const active = document.activeElement;
        if (active && active !== document.body && block.contains(active)) active.blur();   // no typing in it while it moves
        const selection = window.getSelection();
        if (selection) selection.removeAllRanges();
        editor.element.classList.add('is-moving');   // no text gets selected on the way (css/13); startDrag's end removes it
        const started = onStart ? onStart() : this.startDrag(downEvent, 'move');   // from where the press started
        if (!started) editor.element.classList.remove('is-moving');   // it could not start (e.g. locked)
      };
      document.addEventListener('pointermove', onMove, true);
      document.addEventListener('pointerup', onUp, true);
      document.addEventListener('pointercancel', stop, true);
      document.addEventListener('dragstart', noNativeDrag, true);
    },
    /** The outline of the selection and its drag handles (free elements only). */
    drawSelection() {
      const outline = this.stageElement && this.stageElement.querySelector('.editor-selection');
      if (!outline) return;
      if (!this.selected || !this.scene || !this.scene.contains(this.selected)) { outline.hidden = true; editorMotion.drawPath(); editorCommands.placeBar(); return; }
      let box = this.boxInStage(this.selected);
      // a turned element: the outline is its own box, turned the same way (the handles turn with it)
      const angle = parseFloat(this.selected.style.rotate) || 0;
      if (angle) {
        const width = this.selected.offsetWidth, height = this.selected.offsetHeight;
        box = { left: box.left + box.width / 2 - width / 2, top: box.top + box.height / 2 - height / 2, width, height };
      }
      outline.hidden = false;
      Object.assign(outline.style, { left: box.left + 'px', top: box.top + 'px', width: box.width + 'px', height: box.height + 'px', rotate: angle ? angle + 'deg' : '' });
      outline.style.setProperty('--outline-turn', angle + 'deg');   // the angle label stays upright (css/13)
      outline.classList.toggle('is-free', this.isFree(this.selected));
      outline.classList.toggle('can-reorder', !this.isFree(this.selected) && this.canReorder(this.selected) && !this.locked());
      outline.classList.toggle('can-free-resize', this.canFreeResize(this.selected));   // a picture in the layout: its corners size it (css/13)
      outline.classList.toggle('is-group', this.selected.hasAttribute('data-group'));   // a group: its members scale with it when it is resized   // a block in the layout: the move grip
      outline.classList.toggle('is-locked', editorLayers.isLocked(this.selected));   // no drag handles (section 20)
      // near an edge of the slide the handles move inside, where they can be reached (the slide cuts off what is outside)
      const handle = CONFIG.editor.handlePx / this.scale;   // a handle's size in slide pixels (the same size on screen at any zoom)
      outline.classList.toggle('is-near-top', box.top < handle * 3.2);
      outline.classList.toggle('is-near-left', box.left < handle / 2);
      outline.classList.toggle('is-near-right', CONFIG.stage.width - (box.left + box.width) < handle / 2);
      outline.classList.toggle('is-near-bottom', CONFIG.stage.height - (box.top + box.height) < handle * 2.2);
      outline.style.setProperty('--off-left', Math.max(0, -box.left) + 'px');   // how far the outline sticks out of the slide (e.g. turned)
      outline.style.setProperty('--off-top', Math.max(0, -box.top) + 'px');
      outline.style.setProperty('--off-right', Math.max(0, box.left + box.width - CONFIG.stage.width) + 'px');
      outline.style.setProperty('--off-bottom', Math.max(0, box.top + box.height - CONFIG.stage.height) + 'px');
      editorTools.drawGroup();
      editorMotion.drawPath();   // its way over the slide (section 20b)
      editorCommands.placeBar();   // the bar above it (section 20c)
    },
    /** An element's box in stage pixels (the canvas is scaled). */
    boxInStage(element) {
      const stageBox = this.stageElement.getBoundingClientRect();
      const box = element.getBoundingClientRect();
      return { left: (box.left - stageBox.left) / this.scale, top: (box.top - stageBox.top) / this.scale, width: box.width / this.scale, height: box.height / this.scale };
    },

    /* ---- Free placement: drag, resize, guides ---- */
    isFree(element) { return !!element && element.classList.contains('is-free'); },
    /** The box a free element is placed in: its nearest positioned parent (the slide, or e.g. a card). */
    freeParentOf(element) { return element.parentElement && this.scene.contains(element.parentElement) ? element.parentElement : this.scene; },
    /** The box --x / --y count from: the padding box of the free element's parent, in stage pixels. */
    freeOrigin(element) {
      const parent = this.freeParentOf(element);
      const box = this.boxInStage(parent);
      return { left: box.left + parent.clientLeft, top: box.top + parent.clientTop, width: parent.clientWidth, height: parent.clientHeight };
    },
    setFree(element, on, measured) {
      if (on) {
        const rotation = element.style.rotate;
        element.style.rotate = '';   // measure the element itself, not the box around its rotated shape
        const box = measured ? measured.box : this.boxInStage(element);   // (measured: before others left the layout, freeTogether)
        const contentWidth = measured ? measured.contentWidth : parseFloat(getComputedStyle(element).width) || box.width;
        const parentBox = this.freeOrigin(element);
        element.classList.add('is-free');
        element.style.setProperty('--x', Math.round(box.left - parentBox.left) + 'px');
        element.style.setProperty('--y', Math.round(box.top - parentBox.top) + 'px');
        element.style.setProperty('--w', Math.round(contentWidth) + 'px');   // the CSS width (inside padding and border), as --w sets it
        // taking it out of the layout can move its box (e.g. a card that centres its content): correct once
        const moved = this.boxInStage(element);
        element.style.setProperty('--x', Math.round(this.freeValue(element, '--x') + box.left - moved.left) + 'px');
        element.style.setProperty('--y', Math.round(this.freeValue(element, '--y') + box.top - moved.top) + 'px');
        element.style.rotate = rotation;
      } else {
        element.classList.remove('is-free');
        ['--x', '--y', '--w', '--h'].forEach(name => element.style.removeProperty(name));
      }
      if (!element.getAttribute('style')) element.removeAttribute('style');
    },
    freeValue(element, name) { return parseFloat(element.style.getPropertyValue(name)) || 0; },
    /** Slide › Reset the layout (as PowerPoint's Reset): every part of the layout that was dragged out of its place, sized
        or turned goes back into the layout. What was put on the slide itself (a text box, a shape) stays where it is. */
    resetLayout() {
      if (!this.scene) return;
      if (this.locked()) { showToast(ui('editor.scriptedNote')); return; }
      const moved = Array.from(this.scene.querySelectorAll('.is-free')).filter(element => element.parentElement !== this.scene && !element.closest('[data-group]') && !element.parentElement.closest('.is-free') && !editorLayers.isLocked(element));   // (a locked layer stays as it is)
      // rows and columns whose order was changed by dragging (data-editor-home: each part's first place)
      const homes = Array.from(this.scene.querySelectorAll('[data-editor-home]')).filter(element => !editorLayers.isLocked(element));
      if (!moved.length && !homes.length) { showToast(ui('editor.resetNothing')); return; }
      this.selectElement(null);
      editor.nextLabel = ui('editor.historyResetLayout');
      try {
        // (its turn and its place in front of or behind the others go too: back in the layout, a z-index could hide it behind the slide)
        this.change(() => {
          moved.forEach(element => { this.setFree(element, false); ['rotate', 'z-index'].forEach(name => element.style.removeProperty(name)); if (!element.getAttribute('style')) element.removeAttribute('style'); });
          new Set(homes.map(element => element.parentElement)).forEach(parent => {
            const children = Array.from(parent.children);
            if (children.every(child => child.hasAttribute('data-editor-home'))) children.sort((a, b) => Number(a.getAttribute('data-editor-home')) - Number(b.getAttribute('data-editor-home'))).forEach(child => parent.appendChild(child));
          });
          homes.forEach(element => element.removeAttribute('data-editor-home'));
        }, { rerender: true });
      } finally { editor.nextLabel = null; }
      showToast(ui('editor.resetDone', { count: moved.length + new Set(homes.map(element => element.parentElement)).size }));
    },
    /** Where a text's size and line height go: a shape's text takes them from its shape (so they scale from its 28 px). */
    /** Gets circled draws its ring as the element's ::after, outside its box: not on a picture, a frame that cuts what
        sticks out (overflow), or an element whose ::after is already its own (a roadmap line, a quote mark, a date's stroke). */
    /** A click effect that only some elements can have: Gets ticked (a point of a list), Gets circled (see below). */
    effectFits(element, effect) {
      if (effect === 'tick') return element.matches('.big-list > li');
      if (effect === 'circled') return this.canBeCircled(element);
      // a duotone image (an SVG filter in its look): Chrome cannot animate a filter list with one in it (kept if it has it already)
      if (['blur', 'glow'].includes(effect) && effect !== element.getAttribute('data-reveal-effect') && element.style.getPropertyValue('--image-look').trim().startsWith('url(')) return false;
      return true;
    },
    canBeCircled(element) {
      if (element.getAttribute('data-reveal-effect') === 'circled') return true;
      if (element.matches('img, video, .quote, .image-frame, .video-frame, .qr-code')) return false;
      return getComputedStyle(element).overflow === 'visible' && getComputedStyle(element, '::after').content === 'none';
    },
    sizeHolderOf(element) { return element && element.matches('.shape > .shape-text') ? element.parentElement : element; },
    /** Several selected (Shift+click) and one of them is dragged or nudged: they all move together. */
    movesAsGroup() { return editorTools.group.length > 1 && editorTools.group.includes(this.selected); },
    /** …and the selected one can move with them (free, or a layout item that can be placed freely; a table cell cannot). */
    canMoveAsGroup() { return this.movesAsGroup() && (this.isFree(this.selected) || this.groupLayoutMembers().includes(this.selected)); },
    /** The selection's items that are still in the layout and can be placed freely (not locked, not inside another
        selected one, not a table's rows or cells): placed freely where they are first, so the whole selection moves. */
    groupLayoutMembers() {
      const group = editorTools.group;
      if (group.some(item => editorLayers.isLocked(item) && !this.isFree(item))) return [];   // a locked one in the layout would slide into the others' places: none leave it
      return group.filter(item => this.scene && item !== this.scene && this.scene.contains(item) && !this.isFree(item) && !editorLayers.isLocked(item) &&
        !group.some(other => other !== item && other.contains(item)) && !item.matches('.speaker-notes, .slide-footer, table.data-table :is(thead, tbody, tr, td, th)'));
    },
    /** Places several layout items freely at once, each exactly where it is now: all measured first (one leaving the
        layout moves the others up), then placed, then put right once more. */
    freeTogether(items) {
      const measure = item => { const rotation = item.style.rotate; item.style.rotate = ''; const box = this.boxInStage(item); const contentWidth = parseFloat(getComputedStyle(item).width) || box.width; item.style.rotate = rotation; return { item, box, contentWidth }; };
      const measured = items.map(measure);
      measured.forEach(entry => this.setFree(entry.item, true, entry));
      measured.forEach(({ item, box }) => {
        const now = measure(item).box;
        if (Math.abs(now.left - box.left) >= .5) item.style.setProperty('--x', Math.round(this.freeValue(item, '--x') + box.left - now.left) + 'px');
        if (Math.abs(now.top - box.top) >= .5) item.style.setProperty('--y', Math.round(this.freeValue(item, '--y') + box.top - now.top) + 'px');
      });
    },
    /** A picture or video in the layout: its four corners show, and a corner drag places it freely first (startDrag), so a
        basic user can size it as in any slide program without knowing Place freely. */
    canFreeResize(element) {
      return !!element && !this.isFree(element) && !this.locked() && !editorLayers.isLocked(element) && !element.closest('[data-group]') &&
        element.parentElement !== this.scene && (element.matches('.image-frame, .video-frame') || (element.matches('img, video') && !element.parentElement.matches('.image-frame, .video-frame')));
    },
    /** A block that lies in a layout (not the slide's own column, not the slide itself): it can move to another place there. */
    canReorder(element) {
      return !!element && !!element.parentElement && element.parentElement !== this.scene && this.scene.contains(element.parentElement) && !element.matches('.speaker-notes');
    },
    /** Drags a block in the layout: a line shows where it goes among the blocks next to it; pulled out of the box that holds
        it (or with Alt) a dashed box shows where it lands, placed freely. Esc cancels; a click (no move) does nothing. */
    startReorder(downEvent) {
      downEvent.preventDefault();
      const element = this.selected;
      if (!element || this.isFree(element) || !this.canReorder(element) || this.locked() || editorLayers.refuses([element])) return false;
      this.finishTyping();
      const parent = element.parentElement;
      const overlay = this.stageElement.querySelector('.editor-overlay');
      const line = overlay.querySelector('.editor-insert-line'), dropBox = overlay.querySelector('.editor-drop-box');
      const startBox = this.boxInStage(element), parentBox = this.boxInStage(parent);
      const others = Array.from(parent.children).filter(node => node !== element && !this.isFree(node) && !node.matches('.speaker-notes, [data-editor-hidden]') && node.getClientRects().length)
        .map(node => ({ node, box: this.boxInStage(node) }));
      const sameRow = (a, b) => Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top) > Math.min(a.height, b.height) / 2;
      const thickness = 4 / this.scale, reach = CONFIG.editor.detachPx;
      let moved = false, drop = null;   // drop: { node, before } or { free: true }
      element.classList.add('is-editor-dragged');
      const show = (node, style) => { node.hidden = false; Object.assign(node.style, style); };
      const onMove = moveEvent => {
        if (!moved && Math.abs(moveEvent.clientX - downEvent.clientX) + Math.abs(moveEvent.clientY - downEvent.clientY) < 5) return;
        if (!moved) { moved = true; editor.element.classList.add('is-moving'); }
        const point = this.stagePoint(moveEvent);
        const dx = (moveEvent.clientX - downEvent.clientX) / this.scale, dy = (moveEvent.clientY - downEvent.clientY) / this.scale;
        const outside = point.x < parentBox.left - reach || point.x > parentBox.left + parentBox.width + reach || point.y < parentBox.top - reach || point.y > parentBox.top + parentBox.height + reach;
        if (outside || moveEvent.altKey || !others.length) {
          drop = { free: true };
          line.hidden = true;
          show(dropBox, { left: startBox.left + dx + 'px', top: startBox.top + dy + 'px', width: startBox.width + 'px', height: startBox.height + 'px' });
          dropBox.dataset.label = ui('editor.dropPlaceFreely');
          return;
        }
        dropBox.hidden = true;
        // the nearest block; before or after it (across for blocks side by side, else up and down)
        const distance = box => Math.hypot(Math.max(box.left - point.x, 0, point.x - box.left - box.width), Math.max(box.top - point.y, 0, point.y - box.top - box.height));
        const nearest = others.reduce((best, other) => (distance(other.box) < distance(best.box) ? other : best));
        const across = others.some(other => other !== nearest && sameRow(other.box, nearest.box)) || sameRow(startBox, nearest.box);
        const box = nearest.box;
        const before = across ? point.x < box.left + box.width / 2 : point.y < box.top + box.height / 2;
        drop = { node: nearest.node, before };
        if (across) show(line, { left: (before ? box.left - thickness * 2 : box.left + box.width + thickness) + 'px', top: box.top + 'px', width: thickness + 'px', height: box.height + 'px' });
        else show(line, { left: box.left + 'px', top: (before ? box.top - thickness * 2 : box.top + box.height + thickness) + 'px', width: box.width + 'px', height: thickness + 'px' });
      };
      const finish = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', cancel);
        window.removeEventListener('keydown', onKey, true);
        element.classList.remove('is-editor-dragged');
        if (editor.element) editor.element.classList.remove('is-moving');
        requestAnimationFrame(() => editorCommands.placeBar());
        line.hidden = true;
        dropBox.hidden = true;
      };
      const cancel = () => { drop = null; finish(); };
      const onKey = keyEvent => { if (keyEvent.key === 'Escape') { keyEvent.preventDefault(); keyEvent.stopPropagation(); cancel(); } };
      const onUp = upEvent => {
        const target = drop;
        finish();
        if (!moved || !target) return;
        if (target.free) {
          const dx = (upEvent.clientX - downEvent.clientX) / this.scale, dy = (upEvent.clientY - downEvent.clientY) / this.scale;
          editor.nextLabel = ui('editor.historyPlaceFreely');
          this.change(() => {
            this.setFree(element, true);   // where it was, then moved by the drag
            element.style.setProperty('--x', Math.round(this.freeValue(element, '--x') + dx) + 'px');
            element.style.setProperty('--y', Math.round(this.freeValue(element, '--y') + dy) + 'px');
          }, { rerender: true });
          editor.nextLabel = null;
          showToast(ui('editor.placedFreelyToast'));
          return;
        }
        if ((target.before ? target.node.previousElementSibling : target.node.nextElementSibling) === element) return;   // where it already was
        editor.nextLabel = ui('editor.historyReorder');
        this.change(() => {
          // the first move in this row or column: each part notes its place in the layout, so Reset the layout can put the order back
          const parent = element.parentElement;
          if (!Array.from(parent.children).some(child => child.hasAttribute('data-editor-home'))) Array.from(parent.children).forEach((child, index) => child.setAttribute('data-editor-home', index));
          if (target.before) target.node.before(element); else target.node.after(element);
        });
        editor.nextLabel = null;
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', cancel);
      window.addEventListener('keydown', onKey, true);
      return true;
    },
    /** Drags a freely placed element: 'move', 'rotate', or 'resize' by a handle (dir: n, ne, e, se, s, sw, w, nw). */
    startDrag(event, mode, dir) {
      event.preventDefault();
      const together = mode === 'move' && this.movesAsGroup() && !editorMotion.records(mode) ? this.groupLayoutMembers() : [];   // several selected: the layout ones are placed freely first
      const freeFirst = mode === 'resize' && dir && dir.length === 2 && this.canFreeResize(this.selected);   // a picture in the layout, by a corner
      if ((!this.isFree(this.selected) && !together.includes(this.selected) && !freeFirst) || this.locked() || editorLayers.refuses([this.selected])) return false;
      if (editorMotion.records(mode) && editorTools.group.length > 1) { showToast(ui('editor.recordOneElement')); return false; }   // Record: one element at a time
      editor.element.classList.add('is-dragging-handle');   // the selection bar hides meanwhile (section 20c)
      const connected = this.selected.getAttribute('data-connect');   // a connected arrow moved by hand: an ordinary arrow from now on (not on a click without a move)
      if (connected) this.selected.removeAttribute('data-connect');
      this.finishTyping();
      editor.nextLabel = ui({ move: 'editor.historyMove', resize: 'editor.historyResize', rotate: 'editor.historyTurn' }[mode]);
      editor.record();
      editor.nextLabel = null;
      if (together.length) this.freeTogether(together);   // (in this undo step)
      if (freeFirst) { this.freeTogether([this.selected]); this.drawSelection(); }   // (in this undo step too; the message comes with the first move)
      const element = this.selected;
      // Ctrl+drag: a copy stays where it was (of the group's free elements too); removed again when nothing moved
      const copies = mode === 'move' && (event.ctrlKey || event.metaKey) && !editorMotion.records(mode) ? editorLayers.leaveCopies([element].concat(editorTools.group.filter(other => other !== element && this.isFree(other) && !editorLayers.isLocked(other)))) : [];
      let moved = false;
      const start = { x: event.clientX, y: event.clientY, left: this.freeValue(element, '--x'), top: this.freeValue(element, '--y'), width: this.freeValue(element, '--w') || parseFloat(getComputedStyle(element).width) || element.offsetWidth, height: this.freeValue(element, '--h'),
        boxHeight: parseFloat(getComputedStyle(element).height) || element.offsetHeight,   // the CSS sizes (inside padding and border), as --w / --h set them
        outerWidth: element.offsetWidth, outerHeight: element.offsetHeight,   // the whole box (with padding and border): what --x / --y place
        keepsRatio: element.matches('img, video, .image-frame, .video-frame, .icon-badge, [data-keep-ratio]') || !!element.querySelector(':scope > img, :scope > video') };   // a picture keeps its proportions (Shift frees them)
      start.fullHeight = start.height || start.boxHeight || 1;
      // a text box (not a shape, picture or group; not Keep fitting, which sizes its text itself): a corner scales its text
      // with it, like a picture, and its lines stay as they are (Alt: only the box, as before)
      start.scalesText = mode === 'resize' && !!editorTools.textOf(element) && !element.matches('.shape, .icon-badge, .group, [data-group], img, video, .image-frame, .video-frame') && !element.querySelector('img, video, svg') &&
        !(element.hasAttribute('data-fit-text') && editorTools.canFitText(element));   // (Keep fitting sizes its text itself, while it can: with a height of its own)
      if (start.scalesText) {
        start.fontPx = parseFloat(getComputedStyle(element).fontSize) || 16;
        start.parentFontPx = parseFloat(getComputedStyle(element.parentElement).fontSize) || 16;
        start.inline = { font: element.style.fontSize, fontPriority: element.style.getPropertyPriority('font-size'), w: element.style.getPropertyValue('--w'), h: element.style.getPropertyValue('--h') };
        const styleAttribute = element.getAttribute('style');
        // only when all of its text follows its size: a card or stat whose parts have sizes of their own (rem) would not scale
        const parts = Array.from(element.querySelectorAll('*')).filter(part => Array.from(part.childNodes).some(node => node.nodeType === Node.TEXT_NODE && node.nodeValue.trim()));
        const sizes = parts.map(part => parseFloat(getComputedStyle(part).fontSize));
        element.style.fontSize = start.fontPx * 2 + 'px';
        start.scalesText = parts.every((part, index) => Math.abs(parseFloat(getComputedStyle(part).fontSize) / sizes[index] - 2) < .05);
        if (styleAttribute === null) element.removeAttribute('style'); else element.setAttribute('style', styleAttribute);   // exactly as it was (also an !important)
      }
      // a text box back to its own size, width and height (each move starts from these: Alt pressed or let go mid-drag)
      const restoreText = () => {
        element.style.setProperty('font-size', start.inline.font, start.inline.fontPriority);
        if (start.inline.w) element.style.setProperty('--w', start.inline.w); else element.style.removeProperty('--w');
        if (start.inline.h) element.style.setProperty('--h', start.inline.h); else element.style.removeProperty('--h');
      };
      const turned = (parseFloat(element.style.rotate) || 0) * Math.PI / 180;
      const turn = { cos: Math.cos(turned), sin: Math.sin(turned) };   // a resize follows the element's own (turned) sides
      const readout = this.stageElement.querySelector('.editor-readout');
      const showReadout = (moveEvent, text) => {
        if (!readout) return;
        const point = this.stagePoint(moveEvent), gap = 18 / this.scale;
        readout.hidden = false;
        readout.textContent = text;
        Object.assign(readout.style, { left: Math.min(point.x + gap, CONFIG.stage.width - 220 / this.scale) + 'px', top: Math.min(point.y + gap, CONFIG.stage.height - 40 / this.scale) + 'px' });
      };
      const styleBefore = element.getAttribute('style') || '';
      let heightTouched = false;   // corner handle: an element without a height of its own gets one only when it is dragged downwards (or Shift)
      // rotate handle: the angle from the element's middle to the pointer, added to the rotation it had
      const middle = (() => { const box = element.getBoundingClientRect(); return { x: box.left + box.width / 2, y: box.top + box.height / 2 }; })();
      const rotation = { start: Math.atan2(event.clientY - middle.y, event.clientX - middle.x), from: parseFloat(element.style.rotate) || 0 };
      const rotateLabel = mode === 'rotate' && this.stageElement.querySelector('.editor-rotate');

      const movesAlong = other => other === element || element.contains(other) || (mode === 'move' && editorTools.group.some(member => member === other || member.contains(other)));
      const freeOthers = Array.from(this.scene.querySelectorAll('.is-free')).filter(other => !movesAlong(other) && !other.closest('[data-editor-hidden]'));   // not the ones that move along, not hidden ones
      const others = freeOthers.map(other => this.boxInStage(other));
      // the slide's own blocks (a heading, a card, an image in the layout): their edges and middles are guides too, and
      // their sizes are sizes to match while resizing (not the blocks that hold the element)
      const blocks = mode === 'move' || mode === 'resize' ? editorLayers.layerElements().filter(other => !this.isFree(other) && !movesAlong(other) && !other.contains(element) && !other.closest('[data-editor-hidden], .is-free')).slice(0, CONFIG.editor.guideBlocks) : [];
      const anchors = blocks.map(other => this.boxInStage(other));
      const sizeTargets = freeOthers.concat(blocks).map(other => ({ width: other.offsetWidth, height: other.offsetHeight, label: editorTools.labelOf(other) }));   // whole boxes, as laid out (not turned)
      // a group: its members scale with it (their places and sizes; a text gets a width, its height follows its text)
      const collect = box => Array.from(box.children).filter(child => this.isFree(child)).flatMap(child => [{
        child, x: this.freeValue(child, '--x'), y: this.freeValue(child, '--y'), w: this.freeValue(child, '--w') || child.offsetWidth, h: this.freeValue(child, '--h') }].concat(child.hasAttribute('data-group') ? collect(child) : []));   // a group inside: its elements too (their places count from it: the same scale)
      const members = mode === 'resize' && element.hasAttribute('data-group') ? collect(element) : null;
      const groupStart = members ? { w: this.freeValue(element, '--w') || element.offsetWidth, h: this.freeValue(element, '--h') || element.offsetHeight } : null;
      const sceneBox = this.freeOrigin(element);   // coordinates are relative to this box
      const followers = mode === 'move' ? editorTools.group.filter(other => other !== element && this.isFree(other) && !editorLayers.isLocked(other)).map(other => ({ other, x: this.freeValue(other, '--x'), y: this.freeValue(other, '--y') })) : [];
      // the others a drag changes (a resized group's members, the selected ones that move along): as they were, so a drag
      // that changes nothing at all leaves no empty undo step (onUp)
      const alsoChanged = (members || []).map(({ child }) => child).concat(followers.map(({ other }) => other));
      const othersBefore = alsoChanged.map(other => other.getAttribute('style') || '');
      const onMove = moveEvent => {
        const dx = (moveEvent.clientX - start.x) / this.scale, dy = (moveEvent.clientY - start.y) / this.scale;
        if (!moved && Math.abs(moveEvent.clientX - start.x) + Math.abs(moveEvent.clientY - start.y) > 3) {
          moved = true;
          if (freeFirst) showToast(ui('editor.placedFreelyToSize'));   // (a picture taken out of the layout to size it: said once it really moves)
        }
        const free = moveEvent.altKey || !editorLayers.snapping;   // Alt, or Snap switched off under the canvas: no snapping
        const onGrid = value => free ? Math.round(value) : Math.round(value / CONFIG.editor.gridPx) * CONFIG.editor.gridPx;
        if (mode === 'resize') {
          if (!moved) return;   // a press without a real move changes nothing (no height from a 1 px jitter)
          // the side or corner you drag moves; the opposite one stays (Ctrl: the middle stays). A corner of a picture keeps
          // its proportions (Shift frees them); of anything else Shift keeps them. A text without a height of its own keeps
          // growing with its text, until you drag its top or bottom (or a corner downwards)
          const sx = dir.includes('e') ? 1 : dir.includes('w') ? -1 : 0, sy = dir.includes('s') ? 1 : dir.includes('n') ? -1 : 0;
          const local = { x: dx * turn.cos + dy * turn.sin, y: -dx * turn.sin + dy * turn.cos };
          const fromMiddle = moveEvent.ctrlKey || moveEvent.metaKey, factor = fromMiddle ? 2 : 1;
          const corner = sx !== 0 && sy !== 0;
          const keepRatio = corner && (start.keepsRatio ? !moveEvent.shiftKey : moveEvent.shiftKey);
          const scaleText = corner && start.scalesText && !moveEvent.altKey;
          const matched = [];
          if (start.scalesText) restoreText();   // (Alt may have changed since the last move)
          if (scaleText) {   // the whole text grows or shrinks: its box, its own height (if any) and its letters by the same factor
            // the corner follows the pointer, as a picture's does: across or down, whichever reaches further (so a drag
            // straight down scales it too)
            const across = start.outerWidth || start.width, down = start.outerHeight || start.fullHeight;
            const scale = clamp(Math.abs(local.x) * down >= Math.abs(local.y) * across ? 1 + factor * sx * local.x / across : 1 + factor * sy * local.y / down, .2, 8);
            if (Math.abs(scale - 1) >= .005) {   // (back where it started: nothing changes, so no undo step either)
              // the size in % with decimals (as Text size writes it); the box follows the size the letters really got, rounded up,
              // so a full line never wraps; a box without a width of its own (a label) keeps fitting its words
              const percent = Math.max(10, Math.round(start.fontPx * scale / start.parentFontPx * 10000) / 100);
              element.style.fontSize = percent + '%';
              element.removeAttribute('data-text-size');   // (scaled by a corner: a size of its own)
              const ratio = (percent / 100 * start.parentFontPx) / start.fontPx;
              if (start.inline.w) element.style.setProperty('--w', Math.max(40, Math.ceil(start.width * ratio)) + 'px');
              if (start.height) element.style.setProperty('--h', Math.max(4, Math.ceil(start.height * ratio)) + 'px');
            }
          } else {
          if (corner && Math.abs(local.y) > 4) heightTouched = true;
          let width = start.width + sx * local.x * factor, height = start.fullHeight + sy * local.y * factor;
          if (keepRatio) {
            const ratio = start.width / start.fullHeight;
            if (Math.abs(local.x) >= Math.abs(local.y) * ratio) height = width / ratio; else width = height * ratio;
            if (width < 40) { width = 40; height = 40 / ratio; }
          } else {
            width = onGrid(width);
            height = onGrid(height);
          }
          // the same width or height as another element (Alt or Snap off: not); the size readout says which
          if (!free && !keepRatio) {
            // --w / --h are the sizes inside padding and border: the whole box is that plus this element's own padding and border
            const extra = { width: start.outerWidth - start.width, height: start.outerHeight - start.boxHeight };
            const same = (value, key) => sizeTargets.find(target => Math.abs(target[key] - (value + extra[key])) < CONFIG.editor.snapPx);
            const getsHeight = sy !== 0 && (start.height || !corner || heightTouched);   // (a text that grows with its text gets no height from this)
            const sameWidth = sx && same(width, 'width'), sameHeight = getsHeight && same(height, 'height');
            if (sameWidth) { width = sameWidth.width - extra.width; matched.push(ui('editor.sameWidth', { label: sameWidth.label })); }
            if (sameHeight) { height = sameHeight.height - extra.height; matched.push(ui('editor.sameHeight', { label: sameHeight.label })); }
          }
          if (sx) element.style.setProperty('--w', Math.max(40, Math.round(width)) + 'px');
          const ownHeight = sy !== 0 && (start.height || !corner || (keepRatio ? !start.keepsRatio || element.hasAttribute('data-keep-ratio') : heightTouched));   // (a picture's height follows its width; Keeps its proportions sets both)
          if (ownHeight) element.style.setProperty('--h', Math.max(4, Math.round(height)) + 'px');
          else if (!start.height) element.style.removeProperty('--h');
          }   // (the end of: the box only)
          // keep the opposite side in place (for a turned element: along its own sides)
          const newWidth = element.offsetWidth, newHeight = element.offsetHeight;
          const shiftX = fromMiddle ? 0 : (sx || 1) * (newWidth - start.outerWidth) / 2, shiftY = fromMiddle ? 0 : (sy || 1) * (newHeight - start.outerHeight) / 2;
          const middleX = start.left + start.outerWidth / 2 + shiftX * turn.cos - shiftY * turn.sin;
          const middleY = start.top + start.outerHeight / 2 + shiftX * turn.sin + shiftY * turn.cos;
          element.style.setProperty('--x', Math.round(middleX - newWidth / 2) + 'px');
          element.style.setProperty('--y', Math.round(middleY - newHeight / 2) + 'px');
          if (members) {
            const scaleX = (this.freeValue(element, '--w') || groupStart.w) / groupStart.w, scaleY = (this.freeValue(element, '--h') || groupStart.h) / groupStart.h;
            members.forEach(({ child, x, y, w, h }) => {
              child.style.setProperty('--x', Math.round(x * scaleX) + 'px');
              child.style.setProperty('--y', Math.round(y * scaleY) + 'px');
              child.style.setProperty('--w', Math.max(4, Math.round(w * scaleX)) + 'px');
              if (h) child.style.setProperty('--h', Math.max(4, Math.round(h * scaleY)) + 'px');
            });
          }
          showReadout(moveEvent, Math.round(this.freeValue(element, '--w') || newWidth) + ' × ' + Math.round(this.freeValue(element, '--h') || parseFloat(getComputedStyle(element).height) || newHeight) + (matched.length ? '   = ' + matched.join(', ') : ''));
        } else if (mode === 'rotate') {   // whole degrees; Shift: steps of 15° (not before the pointer really moves: a typed 12.5° stays)
          if (!moved) return;
          let angle = rotation.from + (Math.atan2(moveEvent.clientY - middle.y, moveEvent.clientX - middle.x) - rotation.start) * 180 / Math.PI;
          angle = ((angle % 360) + 540) % 360 - 180;   // -180 … 180
          angle = moveEvent.shiftKey ? Math.round(angle / 15) * 15 : Math.round(angle);
          const straight = Math.round(angle / 45) * 45;   // close to 0°, 45°, 90° …: there (Alt: not)
          if (!moveEvent.shiftKey && !moveEvent.altKey && Math.abs(angle - straight) <= CONFIG.editor.rotateSnapDegrees) angle = straight;
          if (angle === -180) angle = 180;
          element.style.rotate = angle ? angle + 'deg' : '';
          if (rotateLabel) rotateLabel.dataset.angle = angle + '°';
        } else {
          // Alt: no snapping (to the grid, the middle or other elements); Shift: only across or only up and down
          const along = moveEvent.shiftKey ? (Math.abs(dx) >= Math.abs(dy) ? { x: dx, y: 0 } : { x: 0, y: dy }) : { x: dx, y: dy };
          const snapped = free ? (this.showGuides(null, null), { x: start.left + along.x, y: start.top + along.y }) : this.snap(start.left + along.x, start.top + along.y, element.offsetWidth, element.offsetHeight, others, sceneBox, anchors);
          if (moveEvent.shiftKey) { if (!along.x) snapped.x = start.left; if (!along.y) snapped.y = start.top; }
          element.style.setProperty('--x', Math.round(snapped.x) + 'px');
          element.style.setProperty('--y', Math.round(snapped.y) + 'px');
          // the other elements of a Shift+click group move along
          const movedX = Math.round(snapped.x) - start.left, movedY = Math.round(snapped.y) - start.top;
          followers.forEach(({ other, x, y }) => { other.style.setProperty('--x', Math.round(x + movedX) + 'px'); other.style.setProperty('--y', Math.round(y + movedY) + 'px'); });
          if (moved) showReadout(moveEvent, 'X ' + Math.round(snapped.x) + '   Y ' + Math.round(snapped.y));
        }
        this.drawSelection();
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
        if (editor.element) editor.element.classList.remove('is-moving', 'is-dragging-handle');   // a body drag (armBodyDrag), any drag
        requestAnimationFrame(() => editorCommands.placeBar());   // the selection bar comes back where the element is now
        if (readout) readout.hidden = true;
        this.showGuides(null, null);
        if (rotateLabel) delete rotateLabel.dataset.angle;
        if (!element.getAttribute('style')) element.removeAttribute('style');
        if (moved && editorMotion.records(mode)) {   // Record (section 20b): the move becomes a keyframe at the playhead
          editor.history.pop();   // that keyframe is the undo step
          editorMotion.recordDrag(element, mode, { left: start.left, top: start.top, rotate: rotation.from, styleRotate: rotation.from }, styleBefore);
          return;
        }
        const stayed = this.freeValue(element, '--x') === start.left && this.freeValue(element, '--y') === start.top;
        if (!moved || stayed) copies.forEach(copy => copy.remove());   // the copies and their line breaks
        if (!moved && connected) element.setAttribute('data-connect', connected);
        if (moved && connected) showToast(ui('editor.connectUnlinked'));
        if (!moved && (together.length || freeFirst)) { editor.history.pop(); editor.renderAll(); return; }   // pressed and let go: they stay in the layout
        if (moved && together.length) showToast(ui('editor.groupFreedToMove'));
        // a click on a handle, or back where it started with nothing else changed (no copies, no blocks placed freely, no arrow
        // unlinked): no empty undo step
        const othersUnchanged = alsoChanged.every((other, index) => (other.getAttribute('style') || '') === othersBefore[index]);
        const copiesKept = copies.some(copy => copy.isConnected);
        if ((element.getAttribute('style') || '') === styleBefore && othersUnchanged && (!moved || (!copiesKept && !together.length && !connected))) { editor.history.pop(); this.drawSelection(); return; }
        this.selectedPath = this.pathOf(element);   // a copy in front of it changes its place in the file
        if (mode === 'resize') editorTools.refit(element);   // Keep fitting: its text fills the new size
        if (mode === 'resize' && members) members.forEach(({ child }) => editorTools.refit(child));   // (and the texts of a group that was resized)
        this.writeBack();
        editor.renderSlideList();
        editor.renderPanel();
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);   // touch: the browser may take the gesture over; the drag ends there
      return true;
    },
    /** Snaps to the grid, to the middle of the slide and to the edges and middles of other free elements and of the
        slide's own blocks (`anchors`); equal gaps only between free elements. */
    snap(x, y, width, height, others, sceneBox, anchors = []) {
      const grid = CONFIG.editor.gridPx, reach = CONFIG.editor.snapPx;
      // on the slide's grid (the one Grid shows), also for an element whose --x / --y count from a card or the layout column
      const onGrid = (value, offset) => Math.round((value + offset) / grid) * grid - offset;
      let result = { x: onGrid(x, sceneBox.left), y: onGrid(y, sceneBox.top) };
      let guideX = null, guideY = null;
      const boxes = others.concat(anchors);
      const own = this.userGuides();   // your own guides (under the canvas: ┃ ━)
      const linesX = [CONFIG.stage.width / 2 - sceneBox.left].concat(own.filter(guide => guide.axis === 'x').map(guide => guide.at - sceneBox.left), ...boxes.map(o => [o.left - sceneBox.left, o.left - sceneBox.left + o.width / 2, o.left - sceneBox.left + o.width]));
      const linesY = [CONFIG.stage.height / 2 - sceneBox.top].concat(own.filter(guide => guide.axis === 'y').map(guide => guide.at - sceneBox.top), ...boxes.map(o => [o.top - sceneBox.top, o.top - sceneBox.top + o.height / 2, o.top - sceneBox.top + o.height]));
      [[0, 0], [width / 2, 1], [width, 2]].forEach(([offset]) => linesX.forEach(line => {
        if (Math.abs(x + offset - line) < reach && guideX === null) { result.x = line - offset; guideX = line; }
      }));
      [[0], [height / 2], [height]].forEach(([offset]) => linesY.forEach(line => {
        if (Math.abs(y + offset - line) < reach && guideY === null) { result.y = line - offset; guideY = line; }
      }));
      // equal spacing: between its two neighbours, or the same gap as the neighbour has to the next one (also shown)
      const gaps = [];
      if (guideX === null) this.snapSpacing(result, 'x', x, width, height, others, sceneBox, reach, gaps);
      if (guideY === null) this.snapSpacing(result, 'y', y, width, height, others, sceneBox, reach, gaps);
      this.showGuides(guideX === null ? null : guideX + sceneBox.left, guideY === null ? null : guideY + sceneBox.top, gaps);
      return result;
    },
    /** Equal gaps along one axis ('x' or 'y') with the free elements on the same line; changes `result`, adds the gaps to show. */
    snapSpacing(result, axis, raw, width, height, others, sceneBox, reach, gaps) {
      const x = axis === 'x';
      const size = x ? width : height;
      const start = raw + (x ? sceneBox.left : sceneBox.top);   // where the pointer puts it (not grid-rounded), in stage pixels like the others' boxes
      const crossStart = x ? result.y + sceneBox.top : result.x + sceneBox.left, crossSize = x ? height : width;
      const box = o => ({ from: x ? o.left : o.top, to: x ? o.left + o.width : o.top + o.height, crossFrom: x ? o.top : o.left, crossTo: x ? o.top + o.height : o.left + o.width });
      const line = others.map(box).filter(o => o.crossFrom < crossStart + crossSize && o.crossTo > crossStart);   // on the same row (or column)
      const before = line.filter(o => o.to <= start + reach).sort((a, b) => b.to - a.to);
      const after = line.filter(o => o.from >= start + size - reach).sort((a, b) => a.from - b.from);
      const candidates = [];
      if (before[0] && after[0] && after[0].from - before[0].to - size > 0) candidates.push({ at: (before[0].to + after[0].from - size) / 2, show: [[before[0].to, null], [null, after[0].from]] });   // in the middle
      if (before[0] && before[1]) { const gap = before[0].from - before[1].to; if (gap > 0) candidates.push({ at: before[0].to + gap, show: [[before[1].to, before[0].from], [before[0].to, null]] }); }
      if (after[0] && after[1]) { const gap = after[1].from - after[0].to; if (gap > 0) candidates.push({ at: after[0].from - gap - size, show: [[after[0].to, after[1].from], [null, after[0].from]] }); }
      const best = candidates.filter(c => Math.abs(c.at - start) < reach).sort((a, b) => Math.abs(a.at - start) - Math.abs(b.at - start))[0];
      if (!best) return;
      const at = Math.round(best.at);
      if (x) result.x = at - sceneBox.left; else result.y = at - sceneBox.top;
      const middle = crossStart + crossSize / 2;
      best.show.forEach(([from, to]) => gaps.push({ axis, from: from === null ? at + size : from, to: to === null ? at : to, middle }));
    },
    /* ---- Your own guides (data-editor-guides="x640 y360" on the deck, in slide px; on every slide; the editor's only) ---- */
    userGuides() {
      const deckElement = editor.model && editor.model.getElementById('deck');
      return (deckElement && deckElement.getAttribute('data-editor-guides') || '').split(/\s+/).map(item => item.match(/^([xy])(\d+(?:\.\d+)?)$/)).filter(Boolean)
        .map(([, axis, at]) => ({ axis, at: Number(at) })).filter(guide => guide.at >= 0 && guide.at <= (guide.axis === 'x' ? CONFIG.stage.width : CONFIG.stage.height));
    },
    setUserGuides(guides, label) {
      const deckElement = editor.model.getElementById('deck');
      editor.nextLabel = ui(label);
      editor.edit(() => {
        const text = guides.map(guide => guide.axis + Math.round(guide.at)).join(' ');
        if (text) deckElement.setAttribute('data-editor-guides', text); else deckElement.removeAttribute('data-editor-guides');
      });
    },
    /** ┃ / ━ under the canvas: a new guide across the middle (the next one a little further). */
    addUserGuide(axis) {
      const guides = this.userGuides(), size = axis === 'x' ? CONFIG.stage.width : CONFIG.stage.height;
      let at = size / 2;
      while (guides.some(guide => guide.axis === axis && Math.abs(guide.at - at) < 1) && at < size - CONFIG.editor.gridPx) at += CONFIG.editor.gridPx;
      this.setUserGuides(guides.concat({ axis, at }), 'editor.historyGuide');
      showToast(ui('editor.guideAdded'));
    },
    drawUserGuides(overlay) {
      this.userGuides().forEach((guide, index) => {
        const line = document.createElement('div');
        line.className = 'editor-user-guide is-' + guide.axis;
        line.style[guide.axis === 'x' ? 'left' : 'top'] = guide.at + 'px';
        line.title = ui('editor.guideTooltip');
        line.addEventListener('pointerdown', event => this.dragUserGuide(event, index));
        line.addEventListener('dblclick', event => { event.stopPropagation(); this.setUserGuides(this.userGuides().filter((other, n) => n !== index), 'editor.historyGuideRemove'); });
        overlay.insertBefore(line, overlay.firstChild);   // under the selection: its handles stay on top
      });
    },
    /** Drag a guide: on the grid or the slide's middle (Alt: anywhere); let go outside the slide and it is gone. */
    dragUserGuide(event, index) {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      const line = event.currentTarget, guides = this.userGuides(), guide = guides[index];
      if (!guide) return;
      const size = guide.axis === 'x' ? CONFIG.stage.width : CONFIG.stage.height;
      let at = guide.at;
      const place = moveEvent => {
        const box = this.stageElement.getBoundingClientRect();
        const raw = guide.axis === 'x' ? (moveEvent.clientX - box.left) / this.scale : (moveEvent.clientY - box.top) / this.scale;
        at = moveEvent.altKey ? raw : Math.abs(raw - size / 2) < CONFIG.editor.snapPx ? size / 2 : Math.round(raw / CONFIG.editor.gridPx) * CONFIG.editor.gridPx;
        line.style[guide.axis === 'x' ? 'left' : 'top'] = at + 'px';
        line.classList.toggle('is-leaving', at < 0 || at > size);
      };
      const end = () => {
        window.removeEventListener('pointermove', place);
        window.removeEventListener('pointerup', end);
        window.removeEventListener('pointercancel', end);
        if (Math.round(at) === Math.round(guide.at)) return;   // a click, no move
        if (at < 0 || at > size) this.setUserGuides(guides.filter((other, n) => n !== index), 'editor.historyGuideRemove');
        else this.setUserGuides(guides.map((other, n) => (n === index ? { axis: other.axis, at } : other)), 'editor.historyGuide');
      };
      window.addEventListener('pointermove', place);
      window.addEventListener('pointerup', end);
      window.addEventListener('pointercancel', end);
    },
    showGuides(x, y, gaps) {
      const vertical = this.stageElement.querySelector('.editor-guide.is-vertical');
      const horizontal = this.stageElement.querySelector('.editor-guide.is-horizontal');
      if (!vertical) return;
      vertical.hidden = x === null;
      horizontal.hidden = y === null;
      if (x !== null) vertical.style.left = x + 'px';
      if (y !== null) horizontal.style.top = y + 'px';
      const overlay = this.stageElement.querySelector('.editor-overlay');
      if (overlay) {
        overlay.querySelectorAll('.editor-gap').forEach(mark => mark.remove());
        (gaps || []).forEach(gap => {   // a short bar across each equal gap
          const mark = document.createElement('div');
          mark.className = 'editor-gap is-' + gap.axis;
          const from = Math.min(gap.from, gap.to), length = Math.abs(gap.to - gap.from);
          Object.assign(mark.style, gap.axis === 'x' ? { left: from + 'px', width: length + 'px', top: gap.middle + 'px' } : { top: from + 'px', height: length + 'px', left: gap.middle + 'px' });
          overlay.appendChild(mark);
        });
      }
    },
    /** A connected arrow moved or turned by hand (keys, the panel, a drag): an ordinary arrow from now on (section 19). */
    unlinkConnector(element) {
      if (!element || !element.hasAttribute('data-connect')) return;
      element.removeAttribute('data-connect');
      showToast(ui('editor.connectUnlinked'));
    },
    nudge([dx, dy]) {
      const element = this.selected;
      if (this.locked() || editorLayers.refuses([element])) return;
      this.changeByKeys('editor.historyNudge', () => {
        this.unlinkConnector(element);
        element.style.setProperty('--x', this.freeValue(element, '--x') + dx + 'px');
        element.style.setProperty('--y', this.freeValue(element, '--y') + dy + 'px');
      });
    },
    /** Alt+← / → turns a freely placed element (15°; with Shift 1°). */
    turnBy(degrees) {
      const element = this.selected;
      if (!this.isFree(element) || this.locked() || editorLayers.refuses([element])) return;
      this.changeByKeys('editor.historyTurn', () => {
        this.unlinkConnector(element);
        let angle = (parseFloat(element.style.rotate) || 0) + degrees;
        angle = ((angle % 360) + 540) % 360 - 180;
        if (angle === -180) angle = 180;
        element.style.rotate = angle ? angle + 'deg' : '';
        if (!element.getAttribute('style')) element.removeAttribute('style');
      });
    },
    /** A change by a key that you press several times in a row (arrows): one undo step for the whole run. */
    changeByKeys(label, changeFunction) {
      const last = editor.history[editor.history.length - 1];
      const target = (editor.selected ? editor.selected.getAttribute('data-name') : '') + ':' + (this.selected ? this.pathOf(this.selected).join('/') : '');   // the same element on the same slide
      const sameRun = last && last.label === ui(label) && Date.now() - (this.lastKeyChangeAt || 0) < CONFIG.editor.keyRunMs && !editor.future.length && this.lastKeyTarget === target;
      this.lastKeyChangeAt = Date.now();
      this.lastKeyTarget = target;
      if (!sameRun) { editor.nextLabel = ui(label); this.change(changeFunction); editor.nextLabel = null; return; }
      this.finishTyping();
      changeFunction();
      this.writeBack();
      this.selectedPath = this.selected ? this.pathOf(this.selected) : null;
      this.drawSelection();
      editor.renderSlideList();
      editor.renderPanel();
    },

    /* ---- The Element tab ---- */
    locked() { return isScriptedSlide(editor.selected); },
    kindOf(element) {
      if (element.matches('.sound-badge')) return 'sound';
      if (element.matches('img')) return 'image';
      if (element.querySelector(':scope > img') && element.children.length === 1) return 'image';
      if (element.matches('video') || (element.querySelector(':scope > video') && element.children.length === 1)) return 'video';
      if (element.matches('.chart')) return 'chart';
      if (element.matches('.qr-code')) return 'qr';
      if (element.matches('.break-timer') || element.closest('.break-timer')) return 'break';
      if (element.matches('.agenda-item')) return 'agenda';
      if (element.matches('.count-up') || element.querySelectorAll('.count-up').length === 1) return 'number';
      if (element.matches('.progress, .progress-ring')) return 'progress';
      return 'block';
    },
    /** What an element is, in plain words, for the path at the top of the Element tab (its own name first, Layers tab). */
    partNameOf(node) {
      const own = editorLayers.cleanName(node.getAttribute('data-editor-name'));
      if (own) return own;
      const kinds = [['h1', 'editor.partTitle'], ['h2, h3, h4, h5', 'editor.partHeading'], ['img, .image-frame', 'editor.blockImage'], ['.sound-badge', 'editor.sectionSound'], ['video, .video-frame', 'editor.sectionVideo'],
        ['.shape', 'editor.blockShape'], ['.count-up, .stat', 'editor.partNumber'], ['.stats', 'editor.partNumbers'], ['.card', 'editor.partCard'], ['.cards', 'editor.partCards'],
        ['ul, ol', 'editor.partList'], ['li', 'editor.partPoint'], ['table', 'editor.partTable'], ['tr', 'editor.partRow'], ['td, th', 'editor.partCell'], ['.chart', 'editor.sectionChart'],
        ['.qr-code', 'editor.sectionQr'], ['p, span, b, strong, i, em, small, label, a', 'editor.partText']];
      const kind = kinds.find(([selector]) => node.matches(selector));
      return ui(kind ? kind[1] : 'editor.partBox');
    },
    /** Insert › Today's date: typed at the cursor when you are typing in a text, else as a new text box. */
    insertDate() {
      const today = new Date().toLocaleDateString(document.documentElement.lang || undefined, { day: 'numeric', month: 'long', year: 'numeric' });
      const selection = window.getSelection();
      const node = selection.rangeCount ? selection.getRangeAt(0).startContainer : null;
      const host = node && (node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement).closest('[contenteditable="true"]');
      if (host && this.scene && this.scene.contains(host)) { document.execCommand('insertText', false, today); return; }
      this.insertBlock('textbox');
      const box = this.selected;
      if (box && box.matches('.text-box')) this.change(() => { box.textContent = today; });
    },
    elementPanelHtml() {
      const element = this.selected;
      if (!element) return '';
      const field = (label, input, note) => editor.field(label, input, note);
      const locked = this.locked();
      const disabled = locked ? ' disabled' : '';
      const placeDisabled = locked || editorLayers.isLocked(element) ? ' disabled' : '';   // locked in the Layers tab: it stays where it is
      const step = revealStepOf(element);
      const appear = element.hasAttribute('data-reveal-step') ? 'click' : element.classList.contains('reveal') ? 'slide' : 'always';
      const option = (value, label, current) => '<option value="' + escapeHtml(value) + '"' + (value === current ? ' selected' : '') + '>' + escapeHtml(label) + '</option>';
      // where it sits, in plain words (Slide › Cards › Card › Heading); a click on a part selects that one, its code shows on hover
      const path = [];
      for (let node = element, depth = 0; node && node !== this.scene; node = node.parentElement, depth++) path.unshift({ node, depth });
      let html = '<p class="editor-path"><span>' + escapeHtml(ui('editor.partSlide')) + '</span>' + path.map(({ node, depth }) => ' › ' + (depth
        ? '<button type="button" data-action="select-part" data-depth="' + depth + '" title="' + escapeHtml(ui('editor.pathTooltip', { name: this.partNameOf(node).toLowerCase() })) + '">' + escapeHtml(this.partNameOf(node)) + '</button>'
        : '<b>' + escapeHtml(this.partNameOf(node)) + '</b>')).join('') + '</p>' +
        (locked ? '<p class="editor-note is-warning">' + escapeHtml(ui('editor.scriptedNote')) + '</p>' : '') +
        '<div class="editor-buttons">' +
          '<button data-action="parent" data-ui="editor.selectParent"></button>' +
          '<button data-action="up"' + disabled + ' data-ui-title="editor.moveUp" data-ui-aria-label="editor.moveUp">↑</button>' +
          '<button data-action="down"' + disabled + ' data-ui-title="editor.moveDown" data-ui-aria-label="editor.moveDown">↓</button>' +
          '<button data-action="duplicate"' + disabled + ' data-ui="editor.duplicate"></button>' +
          '<button data-action="delete"' + disabled + ' data-ui="editor.delete"></button>' +
        '</div>';
      html += editorTools.groupSectionHtml(disabled);
      if (element.matches('.image-placeholder')) html += '<div class="editor-buttons"><button data-action="fill-placeholder"' + disabled + ' data-ui="editor.fillPlaceholder"></button></div>';   // (a place for a picture: choose one)
      // a text: Bold / Accent / Plain first (they work on the words selected on the slide)
      const textSection = '<h4 data-ui="editor.sectionText"></h4><div class="editor-buttons"><button data-action="bold" data-ui="editor.bold"></button><button data-action="accent" data-ui="editor.accent"></button><button data-action="plain" data-ui="editor.plain"></button></div>' +
        '<p class="editor-note is-tip" data-ui="editor.textNote"></p>';
      const isText = element.hasAttribute('contenteditable') || !!element.querySelector('[contenteditable]');   // also while the slide plays (contenteditable false)
      if (isText) html += textSection;
      // what belongs to its kind
      const kind = this.kindOf(element);
      if (kind === 'image') {
        const image = element.matches('img') ? element : element.querySelector('img');
        html += '<h4 data-ui="editor.sectionImage"></h4><div class="editor-buttons"><button data-action="replace-image" data-ui="editor.replaceImage"></button><button data-action="crop-image"' + disabled + ' data-ui="editor.cropButton" data-ui-title="editor.cropTooltip"></button><button data-action="image-circle"' + disabled + ' data-ui="editor.imageCircle"></button></div>' +
          field('editor.altText', '<input data-element-field="alt" value="' + escapeHtml(image.getAttribute('alt') || '') + '">', ui('editor.altTextNote')) +
          editorTools.imageFitHtml(image, disabled);
      } else if (kind === 'video') {
        const video = element.matches('video') ? element : element.querySelector('video');
        html += '<h4 data-ui="editor.sectionVideo"></h4><div class="editor-buttons"><button data-action="replace-video" data-ui="editor.replaceVideo"></button></div>' +
          field('editor.videoPlays', '<select data-element-field="playStep">' + option('0', ui('editor.videoWithSlide'), String(playStepOf(video))) + [1, 2, 3, 4].map(n => option(String(n), ui('editor.onClick', { number: n }), String(playStepOf(video)))).join('') + '</select>') +
          '<label class="editor-check"><input type="checkbox" data-element-field="sound"' + (video.hasAttribute('muted') ? '' : ' checked') + '><span>' + escapeHtml(ui('editor.videoSound')) + '</span></label>' +
          editorTools.frameFieldHtml(video, disabled);   // a browser window, a phone or a polaroid around it
      } else if (kind === 'sound') {   // a sound (Insert › Sound): when it plays, again and again, its speaker shown or not
        const audio = element.querySelector('audio');
        html += '<h4 data-ui="editor.sectionSound"></h4><div class="editor-buttons"><button data-action="replace-sound"' + disabled + ' data-ui="editor.replaceSound"></button></div>' +
          field('editor.videoPlays', '<select data-element-field="playStep"' + disabled + '>' + option('0', ui('editor.videoWithSlide'), String(playStepOf(audio))) + [1, 2, 3, 4].map(n => option(String(n), ui('editor.onClick', { number: n }), String(playStepOf(audio)))).join('') + '</select>') +
          '<label class="editor-check"><input type="checkbox" data-element-field="loop"' + disabled + (audio.hasAttribute('loop') ? ' checked' : '') + '><span>' + escapeHtml(ui('editor.soundLoop')) + '</span></label>' +
          '<label class="editor-check"><input type="checkbox" data-element-field="soundHidden"' + disabled + (element.hasAttribute('data-badge-hidden') ? ' checked' : '') + '><span>' + escapeHtml(ui('editor.soundHidden')) + '</span></label>' +
          '<p class="editor-note is-tip">' + escapeHtml(ui('editor.soundNote')) + '</p>';
      } else if (kind === 'number') {
        const number = element.matches('.count-up') ? element : element.querySelector('.count-up');
        const inText = !number.closest('.stat-value, .progress, .progress-ring');   // a number counted in a text (Count up): it can stop again
        html += '<h4 data-ui="editor.sectionNumber"></h4>' + (inText ? '<div class="editor-buttons"><button data-action="count-up-off"' + disabled + ' data-ui="editor.countUpOff"></button></div>' : '') + field('editor.numberValue', '<input data-element-field="countUp" value="' + escapeHtml(number.getAttribute('data-to') || '0') + '">', ui('editor.numberNote')) +
          '<div class="editor-row">' + field('editor.numberFrom', '<input type="number" step="any" data-element-field="countFrom" value="' + escapeHtml(number.getAttribute('data-from') || '0') + '">') +
          field('editor.numberDuration', '<input type="number" min="100" max="20000" step="100" data-element-field="countDuration" value="' + escapeHtml(number.getAttribute('data-duration') || String(CONFIG.countUp.durationMs)) + '">') + '</div>' +
          field('editor.numberSeparator', '<select data-element-field="countSeparator">' + [['', 'editor.separatorNone'], [',', 'editor.separatorComma'], [' ', 'editor.separatorSpace'], ['.', 'editor.separatorDot']].map(([value, label]) => option(value, ui(label), number.getAttribute('data-separator') || '')).join('') + '</select>') +
          field('editor.countStyle', '<select data-element-field="countStyle">' + [['', 'editor.countStyleCount'], ['roll', 'editor.countStyleRoll']].map(([value, label]) => option(value, ui(label), number.getAttribute('data-count-style') || '')).join('') + '</select>');
      } else if (kind === 'progress') {   // how far the bar fills (--value) and the number next to it
        html += '<h4 data-ui="editor.sectionProgress"></h4>' + field('editor.progressValue', '<input type="number" min="0" max="100" step="1" data-element-field="progress" value="' + (parseFloat(element.style.getPropertyValue('--value')) || 0) + '">', ui('editor.progressNote'));
      } else if (kind === 'chart') {
        const rows = chartRowsOf(element).map(row => (row.highlight ? '*' : '') + row.label + ': ' + row.valueText).join('\n');
        html += '<h4 data-ui="editor.sectionChart"></h4>' +
          field('editor.chartType', '<select data-element-field="chartType">' + option('bar', ui('editor.chartBar'), element.getAttribute('data-chart') || 'bar') + option('line', ui('editor.chartLine'), element.getAttribute('data-chart')) + option('pie', ui('editor.chartPie'), element.getAttribute('data-chart')) + '</select>') +
          field('editor.chartUnit', '<input data-element-field="chartUnit" value="' + escapeHtml(element.getAttribute('data-unit') || '') + '">') +
          field('editor.chartRows', '<textarea rows="6" data-element-field="chartRows">' + escapeHtml(rows) + '</textarea>', ui('editor.chartRowsNote'));
      } else if (kind === 'qr') {
        html += '<h4 data-ui="editor.sectionQr"></h4>' + field('editor.qrLink', '<input data-element-field="qr" value="' + escapeHtml(element.getAttribute('data-qr') || '') + '">');
      } else if (kind === 'break') {
        const time = (element.closest('.break-timer') || element).querySelector('.break-time');
        if (time) html += '<h4 data-ui="editor.sectionBreak"></h4>' + field('editor.breakMinutes', '<input type="number" min="1" max="240" data-element-field="minutes" value="' + escapeHtml(time.getAttribute('data-minutes') || '10') + '">');
      } else if (kind === 'agenda') {
        const slideOptions = current => option('', '—', current) + editor.modelScenes().map(scene => option(scene.getAttribute('data-name'), scene.getAttribute('data-title') || scene.getAttribute('data-name'), current)).join('');
        html += '<h4 data-ui="editor.sectionAgenda"></h4>' +
          field('editor.agendaGoto', '<select data-element-field="goto">' + slideOptions(element.getAttribute('data-goto') || '') + '</select>') +
          field('editor.agendaUntil', '<select data-element-field="until">' + slideOptions(element.getAttribute('data-until') || '') + '</select>', ui('editor.agendaUntilNote'));
      }
      const table = element.closest('table.data-table');   // a table (or a cell of it): rows and columns
      if (table && this.scene.contains(table)) {
        const tableButton = (action, label) => '<button data-action="' + action + '"' + disabled + ' data-ui="' + label + '"></button>';
        html += '<h4 data-ui="editor.sectionTable"></h4><div class="editor-buttons">' + tableButton('table-add-row', 'editor.tableAddRow') + tableButton('table-add-column', 'editor.tableAddColumn') + '</div>' +
          '<div class="editor-buttons">' + tableButton('table-remove-row', 'editor.tableRemoveRow') + tableButton('table-remove-column', 'editor.tableRemoveColumn') + '</div><p class="editor-note is-tip">' + escapeHtml(ui('editor.tableNote')) + '</p>' +
          (element.closest('tbody tr') ? '<div class="editor-buttons">' + tableButton('table-highlight-row', element.closest('tr').classList.contains('is-highlight') ? 'editor.tableUnhighlightRow' : 'editor.tableHighlightRow') + '</div>' : '') +
          '<label class="editor-check"><input type="checkbox" data-element-field="tableHeader"' + disabled + (table.hasAttribute('data-table-header') ? ' checked' : '') + '><span>' + escapeHtml(ui('editor.tableHeader')) + '</span></label>' +
          field('editor.tableStyle', '<select data-element-field="tableStyle"' + disabled + '>' + ['', 'striped', 'grid'].map(value => option(value, ui('editor.tableStyle_' + (value || 'lines')), table.getAttribute('data-table-style') || '')).join('') + '</select>') +
          '<p class="editor-note">' + escapeHtml(ui('editor.tableRowsAppear')) + '</p><div class="editor-buttons">' + tableButton('table-rows-sequence', 'editor.tableRowsSequence') + tableButton('table-rows-clicks', 'editor.tableRowsClicks') + tableButton('table-rows-plain', 'editor.tableRowsPlain') + '</div>';
      }
      // a link to a slide or a web page while presenting (section 7): lower down, near the end, folded at first unless it has one
      let linkHtml = '';
      if (!element.matches('.agenda-item')) {
        const goto = element.getAttribute('data-goto') || '';
        linkHtml = '<h4 data-ui="editor.sectionLink"></h4>' + field('editor.linkSlide', '<select data-element-field="linkSlide"' + disabled + '>' + option('', ui('editor.linkNone'), goto) + (goto && !editor.modelScenes().some(scene => scene.getAttribute('data-name') === goto) ? option(goto, ui('editor.linkMissing', { name: goto }), goto) : '') + editor.modelScenes().filter(scene => scene !== editor.selected).map(scene => option(scene.getAttribute('data-name'), scene.getAttribute('data-title') || scene.getAttribute('data-name'), goto)).join('') + '</select>') +
          field('editor.linkUrl', '<input type="text" data-element-field="linkUrl"' + disabled + ' placeholder="https://…" value="' + escapeHtml(element.getAttribute('data-href') || '') + '">') +
          (goto ? '<label class="editor-check"><input type="checkbox" data-element-field="linkBack"' + disabled + (element.hasAttribute('data-goto-back') ? ' checked' : '') + '><span>' + escapeHtml(ui('editor.linkBack')) + '</span></label>' : '');
      }
      if (element.matches('.cards, .stats, .agenda')) {   // how many next to each other
        const perRow = element.style.getPropertyValue('--per-row').trim();
        html += field('editor.perRow', '<select data-element-field="perRow"' + disabled + '>' + ['', '1', '2', '3', '4', '5', '6'].map(value => option(value, value || ui('editor.perRowDefault'), perRow)).join('') + '</select>');
      }
      const list = element.closest('.big-list');   // a list (or a point of it): its bullets
      if (list && this.scene.contains(list)) html += '<h4 data-ui="editor.sectionList"></h4>' + field('editor.bullets', '<select data-element-field="bullets"' + disabled + '>' +
        LIST_BULLETS.map(value => option(value, ui('editor.bullets_' + (value || 'square')), list.getAttribute('data-bullets') || '')).join('') + '</select>', ui('editor.bulletsNote'));
      // its name and a note for the editor (only for the editor, section 20): in More at the end, folded at first (rarely needed)
      const moreHtml = '<h4 data-ui="editor.sectionMore"></h4>' + editorLayers.nameFieldHtml(element) + field('editor.authorNote', '<textarea rows="2" maxlength="1000" data-element-field="authorNote"' + disabled + ' placeholder="' + escapeHtml(ui('editor.authorNotePlaceholder')) + '">' + escapeHtml(element.getAttribute('data-editor-note') || '') + '</textarea>', ui('editor.authorNoteNote'));
      html += editorTools.styleSectionHtml(element, disabled);
      // how it appears
      html += '<h4 data-ui="editor.sectionAppear"></h4>' +
        // an element with an animation of its own: When says whether that animation plays with the slide or on a click
        // (one place for "on a click" and its effect, as in PowerPoint's Start: On Click); else how it appears
        (element.hasAttribute('data-animation') && editor.animations()[element.getAttribute('data-animation')]
          ? field('editor.appear', '<select data-element-field="animTrigger"' + disabled + '>' + option('slide', ui('editor.appearSlide'), editor.animations()[element.getAttribute('data-animation')].trigger === 'click' ? 'click' : 'slide') +
            option('click', ui('editor.appearClick'), editor.animations()[element.getAttribute('data-animation')].trigger === 'click' ? 'click' : 'slide') + '</select>', ui('editor.appearWithOwnAnimation', { name: animationLabel(element.getAttribute('data-animation')) }))
          : field('editor.appear', '<select data-element-field="appear"' + (element.hasAttribute('data-animation') ? ' disabled' : disabled) + '>' + option('always', ui('editor.appearAlways'), appear) + option('slide', ui('editor.appearSlide'), appear) + option('click', ui('editor.appearClick'), appear) + '</select>'));
      // 🎉 Celebrate when it appears: on its click, or as it comes in with the slide
      const celebrateField = field('editor.confetti', '<select data-element-field="confetti"' + disabled + '>' + [['none', 'editor.confettiNone'], ['', 'editor.confettiPaper'], ['stars', 'editor.confettiStars'], ['hearts', 'editor.confettiHearts'], ['emoji', 'editor.confettiEmoji']]
            .map(([value, label]) => option(value, ui(label), element.hasAttribute('data-confetti') ? (['stars', 'hearts', 'emoji'].includes(element.getAttribute('data-confetti')) ? element.getAttribute('data-confetti') : '') : 'none')).join('') + '</select>');
      // (an element that is always there inside a click item appears with that click: it can celebrate then)
      const insideClickItem = appear === 'always' && !!element.parentElement && !!element.parentElement.closest('[data-reveal-step]');
      if (appear === 'slide' || insideClickItem) html += celebrateField;
      if (appear === 'slide') html += field('editor.order', '<input type="number" min="0" max="40" data-element-field="order"' + disabled + ' value="' + escapeHtml(String(parseFloat(element.style.getPropertyValue('--order')) || 0)) + '">', ui('editor.orderNote'));
      if (appear === 'click') {
        html += celebrateField +   // 🎉 right under Appears (a beginner looks for it there)
          field('editor.clickNumber', '<input type="number" min="1" max="20" data-element-field="step"' + disabled + ' value="' + (step || 1) + '">') +
          field('editor.effect', '<select data-element-field="effect"' + disabled + '>' + EFFECTS.filter(effect => !(this.clickAnimationOf(element) && ['leave', 'fade-out'].includes(effect)) && !(EMPHASIS_EFFECTS.includes(effect) && element.hasAttribute('data-animation')) && !(effect === 'circled' && !this.canBeCircled(element)) && !(effect === 'tick' && !element.matches('.big-list > li')) && !(['blur', 'glow'].includes(effect) && !this.effectFits(element, effect))).map(effect => option(effect, ui('editor.effect' + (effect || 'none').replace(/(^|-)(.)/g, (whole, dash, letter) => letter.toUpperCase())), element.getAttribute('data-reveal-effect') || '')).join('') + '</select>') +
          '<label class="editor-check"><input type="checkbox" data-element-field="focus"' + disabled + (element.hasAttribute('data-focus') ? ' checked' : '') + '><span>' + escapeHtml(ui('editor.focus')) + '</span></label>' +
          field('editor.stepZoomIn', '<select data-element-field="zoomIn"' + disabled + '>' + ['', '1.3', '1.6', '2', '2.5'].map(value => option(value, value ? value + ' ×' : ui('editor.stepZoomNone'), element.hasAttribute('data-zoom-in') ? element.getAttribute('data-zoom-in') : '')).join('') +
            (element.hasAttribute('data-zoom-in') && !['1.3', '1.6', '2', '2.5'].includes(element.getAttribute('data-zoom-in')) ? option(element.getAttribute('data-zoom-in'), (parseFloat(element.getAttribute('data-zoom-in')) || CONFIG.stepZoomLevel) + ' ×', element.getAttribute('data-zoom-in')) : '') + '</select>');   // (written by hand: the zoom it gives)
      }
      // (not on a click: Dim the rest and Zoom in on it are shown greyed, with how to get them; Ctrl+K finds them too)
      if (appear !== 'click' && !element.hasAttribute('data-animation')) {
        const onlyOnClick = escapeHtml(ui('editor.clickOnlyNote'));
        html += '<label class="editor-check"><input type="checkbox" data-element-field="focus" disabled title="' + onlyOnClick + '"><span>' + escapeHtml(ui('editor.focus')) + '</span></label>' +
          field('editor.stepZoomIn', '<select data-element-field="zoomIn" disabled title="' + onlyOnClick + '"><option>' + escapeHtml(ui('editor.stepZoomNone')) + '</option></select>', ui('editor.clickOnlyNote'));
      }
      if (appear !== 'always' && !element.hasAttribute('data-animation') && !EMPHASIS_EFFECTS.includes(element.getAttribute('data-reveal-effect')))
        html += (['circled', 'tick'].includes(element.getAttribute('data-reveal-effect')) ? '' : '<div class="editor-row">' + editorLayers.speedFieldHtml(element, disabled) + editorLayers.easeFieldHtml(element, disabled) + '</div>') +
          (element.getAttribute('data-reveal-effect') === 'tick' ? '' : editorLayers.previewButtonHtml());   // (Gets circled: its ring keeps its own pace)   // section 20
      if (isText && appear !== 'always' && !element.hasAttribute('data-animation') && !['leave', 'fade-out', 'highlight', 'strike', 'underline', 'circled', 'tick', ...EMPHASIS_EFFECTS].includes(element.getAttribute('data-reveal-effect'))) {   // a text: whole, word by word, letter by letter (section 7)
        const split = element.getAttribute('data-split') || '';
        html += '<div class="editor-row">' + field('editor.splitText', '<select data-tool-field="split"' + disabled + '>' + option('', ui('editor.splitWhole'), split) + option('word', ui('editor.splitWord'), split) + option('letter', ui('editor.splitLetter'), split) + option('line', ui('editor.splitLine'), split) + '</select>') +
          (split ? field('editor.splitStagger', '<input type="number" min="0" max="2000" step="5" data-tool-field="splitStagger"' + disabled + ' value="' + (Number.isFinite(parseFloat(element.style.getPropertyValue('--split-stagger'))) ? parseFloat(element.style.getPropertyValue('--split-stagger')) : SPLIT_STAGGER_MS[split] || 60) + '">') : '') + '</div>';
        const splitEffect = element.getAttribute('data-split-effect') || '';
        const splitOrderValue = element.getAttribute('data-split-order') || '';
        if (split) html += '<div class="editor-row">' + field('editor.splitEffect', '<select data-tool-field="splitEffect"' + disabled + '>' + SPLIT_EFFECTS.map(effect => option(effect, ui('editor.splitEffect_' + (effect || 'rise')), splitEffect)).join('') + '</select>') +
          field('editor.splitOrder', '<select data-tool-field="splitOrder"' + disabled + '>' + SPLIT_ORDERS.map(how => option(how, ui('editor.splitOrder_' + (how || 'start')), splitOrderValue)).join('') + '</select>') + '</div>';
      }
      html += this.itemsAppearHtml(element, disabled);   // a block with items: how its items appear, in one click
      if (this.countableNumberOf(element)) html += '<div class="editor-buttons"><button data-action="count-up-on"' + disabled + ' data-ui="editor.countUpOn" data-ui-title="editor.countUpOnTooltip"></button></div>';
      html += editorLayers.appearButtonsHtml(disabled);
      // animation with keyframes
      const definitions = editor.animations();
      const current = element.getAttribute('data-animation') || '';
      const names = Object.keys(definitions);
      html += '<h4 data-ui="editor.sectionAnimation"></h4>' +
        field('editor.animation', '<select data-element-field="animation"' + disabled + '>' + option('', ui('editor.animationNone'), current) +
          (names.length ? '<optgroup label="' + escapeHtml(ui('editor.animationsInFile')) + '">' + names.map(name => option(name, animationLabel(name), current)).join('') + '</optgroup>' : '') +
          '<optgroup label="' + escapeHtml(ui('editor.animationPresets')) + '">' + Object.keys(ANIMATION_PRESETS).filter(name => !names.includes(name)).map(name => option('preset:' + name, animationLabel(name), current)).join('') + '</optgroup>' +
          option('new', ui('editor.animationNew'), current) + '</select>');
      if (current && definitions[current]) html += this.keyframeEditorHtml(current, definitions[current], disabled);
      // morph and layout
      html += editorMotion.morphSectionHtml(element, disabled) +   // the name, where it glides, Pair with the next slide (section 20b)
        '<h4 data-ui="editor.sectionLayout"></h4><label class="editor-check"><input type="checkbox" data-element-field="free"' + (element.hasAttribute('data-group') ? ' disabled title="' + escapeHtml(ui('editor.groupStaysFree')) + '"' : placeDisabled) + (this.isFree(element) ? ' checked' : '') + '><span>' + escapeHtml(ui('editor.placeFreely')) + '</span></label>';
      if (this.isFree(element)) {
        const sizes = ['--x', '--y', '--w', '--h'];   // height 0: as high as its content
        html += '<div class="editor-row">' + sizes.map(name => field('editor.free' + name.slice(2).toUpperCase(), '<input type="number" data-element-field="' + name + '"' + placeDisabled + ' value="' + Math.round(this.freeValue(element, name)) + '">')).join('') + '</div>';
        if ((this.freeValue(element, '--h') || element.hasAttribute('data-keep-ratio')) && !element.matches('img, video, .image-frame, .video-frame, .icon-badge') && !element.querySelector(':scope > img, :scope > video')) html += '<label class="editor-check"><input type="checkbox" data-element-field="keepRatio"' + placeDisabled + (element.hasAttribute('data-keep-ratio') ? ' checked' : '') + '><span>' + escapeHtml(ui('editor.keepRatio')) + '</span></label>';   // (pictures always do)
        if (this.freeValue(element, '--h') && !element.matches('.shape')) html += '<div class="editor-buttons"><button data-action="auto-height"' + placeDisabled + ' data-ui="editor.autoHeight" data-ui-title="editor.autoHeightTooltip"></button></div>';   // a text grows with its text again
        html += editorLayers.lineUpHtml(element, placeDisabled);   // section 20
      }
      // insert a new block after this one
      html += '<h4 data-ui="editor.sectionInsert"></h4><div class="editor-row"><select data-insert-kind' + disabled + '>' +
        INSERT_BLOCKS.map(kindName => option(kindName, ui('editor.block' + kindName.replace(/^./, c => c.toUpperCase())), '')).join('') +
        '<optgroup label="' + escapeHtml(ui('editor.placedFreely')) + '">' + FREE_TEXTS.concat(Object.keys(SHAPES)).map(kindName => option(kindName, ui('editor.block' + kindName.replace(/^./, c => c.toUpperCase())), '')).join('') + '</optgroup>' +
        '</select><button data-action="insert"' + disabled + ' data-ui="editor.insert"></button></div>' +
        (isText || element.matches('img, video, .image-frame, .video-frame, .qr-code') ? '' : textSection);   // (a picture has no words to make bold)
      html += linkHtml + moreHtml;
      return html;
    },
    keyframeEditorHtml(name, definition, disabled) {
      const field = (label, input) => editor.field(label, input);
      const option = (value, label, current) => '<option value="' + escapeHtml(value) + '"' + (String(value) === String(current) ? ' selected' : '') + '>' + escapeHtml(label) + '</option>';
      const frames = sortedKeyframes(definition);
      const users = editor.model.querySelectorAll('[data-animation="' + CSS.escape(name) + '"]').length;
      const usedKey = key => frames.some(frame => frame[key] !== undefined && frame[key] !== '');
      const shift = String(originShift(definition.origin));   // a value typed by hand ("top", "LEFT top") shows as the point it means; one that means nothing: the middle
      const shownOrigin = (ANIMATION_ORIGINS.find(([value]) => String(originShift(value)) === shift) || [''])[0];
      const shownFields = KEYFRAME_FIELDS.filter(key => !EXTRA_KEYFRAME_FIELDS.includes(key) || usedKey(key)), unusedExtras = EXTRA_KEYFRAME_FIELDS.filter(key => !usedKey(key));
      return '<div class="editor-keyframes">' +
        (users > 1 ? '<p class="editor-note">' + escapeHtml(ui('editor.animationShared', { count: users })) + '</p>' : '') +
        '<div class="editor-row">' +
          field('editor.animTrigger', '<select data-anim-field="trigger"' + disabled + '>' + option('slide', ui('editor.animWithSlide'), definition.trigger) + option('click', ui('editor.animOnClick'), definition.trigger) + '</select>') +
          field('editor.animEasing', '<select data-anim-field="easing"' + disabled + '>' + Object.keys(EASINGS).map(easing => option(easing, easing, definition.easing || 'ease-out')).join('') + '</select>') +
        '</div><div class="editor-row">' +
          field('editor.animDuration', '<input type="number" min="0" max="20000" step="50" data-anim-field="duration"' + disabled + ' value="' + (Number(definition.duration) || 800) + '">') +
          field('editor.animDelay', '<input type="number" min="0" max="20000" step="50" data-anim-field="delay"' + disabled + ' value="' + (Number(definition.delay) || 0) + '">') +
          (definition.trigger === 'click' ? '' : '<div class="editor-buttons"><button data-action="anim-after-previous"' + disabled + ' data-ui="editor.animAfterPrevious" data-ui-title="editor.animAfterPreviousTooltip"></button></div>') +
          field('editor.animRepeat', '<input data-anim-field="repeat"' + disabled + ' value="' + escapeHtml(String(definition.repeat || 1)) + '">') +
        '</div>' +
        field('editor.origin', '<select data-anim-field="origin"' + disabled + '>' + ANIMATION_ORIGINS.map(([value, label]) => option(value, ui(label), shownOrigin)).join('') + '</select>', ui('editor.originNote')) +
        '<label class="editor-check"><input type="checkbox" data-anim-field="alternate"' + disabled + (definition.alternate ? ' checked' : '') + '><span>' + escapeHtml(ui('editor.animAlternate')) + '</span></label>' +
        '<table class="editor-keyframe-table"><thead><tr>' + shownFields.map(key => '<th>' + escapeHtml(ui('editor.key' + key.replace(/^./, c => c.toUpperCase()))) + '</th>').join('') + '<th>' + escapeHtml(ui('editor.keyEase')) + '</th><th></th></tr></thead><tbody>' +
        frames.map((frame, index) => '<tr>' + shownFields.map(key => '<td><input type="number" step="any" data-keyframe="' + index + '" data-key="' + key + '"' + disabled +
          ' value="' + (frame[key] === undefined ? '' : escapeHtml(String(frame[key]))) + '" placeholder="' + (key === 'at' ? '' : KEYFRAME_DEFAULTS[key]) + '"></td>').join('') +
          '<td>' + (index < frames.length - 1 ? '<button class="keyframe-ease" data-action="motion-ease-row" data-index="' + index + '"' + disabled + ' title="' + escapeHtml(ui('editor.keyEaseTooltip')) + '">' + escapeHtml(editorMotion.easeLabel(frame.ease || '')) + '</button>' : '') + '</td>' +
          '<td><button data-action="remove-keyframe" data-index="' + index + '"' + disabled + ' title="' + escapeHtml(ui('editor.removeKeyframe')) + '">×</button></td></tr>').join('') +
        '</tbody></table>' +
        (unusedExtras.length && !disabled ? '<select class="editor-add-property" data-anim-add-property aria-label="' + escapeHtml(ui('editor.tlLaneAdd')) + '"><option value="">' + escapeHtml(ui('editor.tlLaneAdd')) + '</option>' +
          unusedExtras.map(key => '<option value="' + key + '">' + escapeHtml(ui('editor.key' + key.replace(/^./, c => c.toUpperCase()))) + '</option>').join('') + '</select>' : '') +
        '<div class="editor-buttons"><button data-action="add-keyframe"' + disabled + ' data-ui="editor.addKeyframe"></button>' +
        '<button data-action="preview-animation" data-ui="editor.previewAnimation"></button>' +
        '<button data-action="copy-animation"' + disabled + ' data-ui="editor.copyAnimation"></button>' +
        '<button data-action="motion-mine-save" data-ui="editor.mineSave" data-ui-title="editor.mineSaveTooltip"></button></div></div>';   // My animations (section 20b)
    },

    /* ---- Element changes ---- */
    onPanelChange(event) {
      const input = event.target;
      if (input.matches('[data-anim-add-property]')) {   // + property: stretch or slant in every keyframe at its normal value
        const key = input.value;
        if (EXTRA_KEYFRAME_FIELDS.includes(key)) this.editKeyframes(frames => frames.forEach(frame => { frame[key] = KEYFRAME_DEFAULTS[key]; }));
        return;
      }
      const element = this.selected;
      if (!element) return;
      if (input.dataset.keyframe !== undefined || input.dataset.animField) { this.changeAnimation(input); return; }
      const field = input.dataset.elementField;
      if (!field) return;
      if (['free', '--x', '--y', '--w', '--h'].includes(field) && editorLayers.refuses([element])) { editor.renderPanel(); return; }
      const value = input.type === 'checkbox' ? input.checked : input.value;
      // a web address: checked before anything is recorded (a refused one leaves no undo step); "#name" is a slide of this file
      let linkAddress = '';
      if (field === 'linkUrl') {
        linkAddress = String(value || '').trim();
        if (linkAddress.startsWith('#')) {
          const name = linkAddress.slice(1);
          if (!editor.modelScenes().some(scene => scene.getAttribute('data-name') === name)) { showToast(ui('editor.linkNoSlide', { name })); editor.renderPanel(); return; }
          this.change(() => { element.setAttribute('data-goto', name); element.removeAttribute('data-href'); });
          return;
        }
        if (linkAddress && !/^(https?:|mailto:)/i.test(linkAddress)) {
          if (/^[a-z][a-z0-9+.-]*:(?!\d+(\/|$))/i.test(linkAddress)) { showToast(ui('editor.linkRefused')); editor.renderPanel(); return; }   // (a port, "example.com:8080", is no scheme)
          linkAddress = 'https://' + linkAddress;   // "example.com"
        }
      }
      const media = element.matches('img, video, audio') ? element : element.querySelector('img, video, audio');
      const numberElement = element.matches('.count-up') ? element : element.querySelector('.count-up');
      const changes = {
        alt: () => media.setAttribute('alt', value),
        playStep: () => { if (Number(value)) media.setAttribute('data-play-step', value); else media.removeAttribute('data-play-step'); },
        sound: () => { media.toggleAttribute('muted', !value); },
        loop: () => { media.toggleAttribute('loop', !!value); },   // a sound that starts again at its end (background music)
        soundHidden: () => { element.toggleAttribute('data-badge-hidden', !!value); },   // its speaker not shown while presenting (css/05)
        countUp: () => {
          const number = parseCountUpValue(value);
          if (number === null) { showToast(ui('editor.badNumber')); return; }
          writeTextItem({ kind: 'number', element: numberElement }, number);
        },
        countFrom: () => { const from = parseFloat(value); if (Number.isFinite(from) && from !== 0) numberElement.setAttribute('data-from', String(from)); else numberElement.removeAttribute('data-from'); },
        countDuration: () => { const ms = clamp(parseInt(value, 10) || 0, 0, 20000); if (ms && ms !== CONFIG.countUp.durationMs) numberElement.setAttribute('data-duration', String(ms)); else numberElement.removeAttribute('data-duration'); },
        countStyle: () => { if (value === 'roll') numberElement.setAttribute('data-count-style', 'roll'); else numberElement.removeAttribute('data-count-style'); },
        countSeparator: () => { if ([',', ' ', '.'].includes(value)) numberElement.setAttribute('data-separator', value); else numberElement.removeAttribute('data-separator'); numberElement.textContent = countUpText(numberElement, parseFloat(numberElement.dataset.to)); },
        chartType: () => element.setAttribute('data-chart', ['bar', 'line', 'pie'].includes(value) ? value : 'bar'),
        chartUnit: () => { if (value) element.setAttribute('data-unit', value); else element.removeAttribute('data-unit'); },
        chartRows: () => this.writeChartRows(element, value),
        animTrigger: () => {   // its own animation: with the slide or on a click (an animation that others use too gets a copy of its own)
          const definitions = editor.animations();
          let name = element.getAttribute('data-animation');
          const trigger = value === 'click' ? 'click' : 'slide';
          if (!definitions[name] || definitions[name].trigger === trigger) return;
          if (editor.model.querySelectorAll('[data-animation="' + CSS.escape(name) + '"]').length > 1) {
            let copy = name + '-2';
            for (let n = 3; hasOwn(definitions, copy); n++) copy = name + '-' + n;
            definitions[copy] = JSON.parse(JSON.stringify(definitions[name]));
            name = copy;
          }
          definitions[name].trigger = trigger;
          editor.saveAnimations(definitions);
          this.chooseAnimation(element, name);   // (its click is added or taken away there)
        },
        qr: () => element.setAttribute('data-qr', value.trim()),
        tableHeader: () => { const table = element.closest('table.data-table'); if (table) table.toggleAttribute('data-table-header', !!value); },   // the header row in the accent colour (css/05)
        tableStyle: () => { const table = element.closest('table.data-table'); if (table) { if (['striped', 'grid'].includes(value)) table.setAttribute('data-table-style', value); else table.removeAttribute('data-table-style'); } },   // lines (the default), striped rows, a full grid (css/05)
        bullets: () => { const list = element.closest('.big-list'); if (list) { if (LIST_BULLETS.includes(value) && value) list.setAttribute('data-bullets', value); else list.removeAttribute('data-bullets'); } },
        progress: () => {
          const percent = clamp(Math.round(Number(value) || 0), 0, 100);
          element.style.setProperty('--value', element.matches('.progress-ring') ? String(percent) : percent + '%');   // (a ring: a plain number, its circle counts to 100)
          const fill = element.querySelector('.ring-fill');
          if (fill) { fill.setAttribute('stroke-dasharray', percent + ' 100'); if (percent) fill.removeAttribute('visibility'); else fill.setAttribute('visibility', 'hidden'); }   // (0: no round dot)
          const label = element.querySelector('.progress-value');
          if (label) label.textContent = percent + ' %';
        },
        minutes: () => {   // the break's length; the slide shows it at once (while presenting it counts down from it)
          const time = (element.closest('.break-timer') || element).querySelector('.break-time'), minutes = clamp(parseInt(value, 10) || 10, 1, 240);
          time.setAttribute('data-minutes', minutes);
          time.textContent = String(minutes).padStart(2, '0') + ':00';
        },
        goto: () => { if (value) element.setAttribute('data-goto', value); else element.removeAttribute('data-goto'); },
        authorNote: () => { const text = String(value).trim().slice(0, 1000); if (text) element.setAttribute('data-editor-note', text); else element.removeAttribute('data-editor-note'); },   // (editor only)
        linkSlide: () => { if (value) { element.setAttribute('data-goto', value); element.removeAttribute('data-href'); } else { element.removeAttribute('data-goto'); element.removeAttribute('data-goto-back'); } },
        linkUrl: () => {   // a web address (or mail) instead of a slide (checked above: never javascript: and the like)
          if (!linkAddress) { element.removeAttribute('data-href'); return; }
          element.setAttribute('data-href', linkAddress);
          element.removeAttribute('data-goto'); element.removeAttribute('data-goto-back');
        },
        perRow: () => { if (/^[1-6]$/.test(String(value))) element.style.setProperty('--per-row', value); else element.style.removeProperty('--per-row'); if (!element.getAttribute('style')) element.removeAttribute('style'); },
        linkBack: () => element.toggleAttribute('data-goto-back', !!value),
        focus: () => element.toggleAttribute('data-focus', !!value),
        confetti: () => { if (value === 'none') element.removeAttribute('data-confetti'); else element.setAttribute('data-confetti', ['stars', 'hearts', 'emoji'].includes(value) ? value : ''); },   // 🎉 on its click (section 6)
        keepRatio: () => element.toggleAttribute('data-keep-ratio', !!value),   // its corners keep its proportions (Shift frees them)
        zoomIn: () => { const level = parseFloat(value); if (level > 1) element.setAttribute('data-zoom-in', String(clamp(level, 1.1, 4))); else element.removeAttribute('data-zoom-in'); },   // Zoom in on this click (section 6)   // Dim the rest on this click (section 6)
        until: () => { if (value) element.setAttribute('data-until', value); else element.removeAttribute('data-until'); },
        appear: () => this.setAppear(element, value),
        order: () => element.style.setProperty('--order', clamp(parseInt(value, 10) || 0, 0, 40)),
        step: () => element.setAttribute('data-reveal-step', clamp(parseInt(value, 10) || 1, 1, 20)),
        effect: () => { if (value) element.setAttribute('data-reveal-effect', value); else element.removeAttribute('data-reveal-effect'); this.dropHidingEffect(element); },
        speed: () => editorLayers.setSpeed(element, value),
        ease: () => editorLayers.setEase(element, value),
        editorName: () => editorLayers.applyName(element, value),
        animation: () => this.chooseAnimation(element, value),
        morph: () => { const name = animationName(value); if (name) element.setAttribute('data-morph', name); else element.removeAttribute('data-morph'); },
        free: () => this.setFree(element, value),
        '--x': () => element.style.setProperty('--x', (parseFloat(value) || 0) + 'px'),
        '--y': () => element.style.setProperty('--y', (parseFloat(value) || 0) + 'px'),
        '--w': () => element.style.setProperty('--w', Math.max(40, parseFloat(value) || 40) + 'px'),
        '--h': () => { if ((parseFloat(value) || 0) > 0) element.style.setProperty('--h', Math.max(4, parseFloat(value)) + 'px'); else element.style.removeProperty('--h'); },
      };
      if (changes[field] && ['--x', '--y', '--w', '--h'].includes(field)) { const set = changes[field]; changes[field] = () => { this.unlinkConnector(element); set(); }; }   // (a connected arrow placed by hand)
      if (changes[field] && ['--w', '--h'].includes(field) && element.hasAttribute('data-keep-ratio') && this.freeValue(element, '--w') && this.freeValue(element, '--h')) {   // Keeps its proportions: the other side follows
        const set = changes[field], ratio = this.freeValue(element, '--h') / this.freeValue(element, '--w');
        changes[field] = () => {
          set();
          if (!this.freeValue(element, field)) return;   // (cleared: as high as its content, or no width of its own: nothing to follow)
          if (field === '--w') element.style.setProperty('--h', Math.max(4, Math.round(this.freeValue(element, '--w') * ratio)) + 'px');
          else {
            const width = Math.max(40, Math.round(this.freeValue(element, '--h') / ratio));   // (never narrower than a drag allows: the height then follows that width)
            element.style.setProperty('--w', width + 'px');
            element.style.setProperty('--h', Math.round(width * ratio) + 'px');
          }
        };
      }
      if (changes[field] && ['--w', '--h'].includes(field)) { const set = changes[field]; changes[field] = () => { set(); editorTools.refit(element); }; }   // Keep fitting: the text fills its new size
      if (changes[field]) this.change(changes[field], { rerender: ['chartRows', 'chartType', 'chartUnit', 'qr', 'appear', 'free', 'animation', 'animTrigger'].includes(field) });
      if (['appear', 'effect', 'speed', 'ease'].includes(field)) editorLayers.previewAppear(this.selected);   // you see the change at once (section 20)
    },
    setAppear(element, mode) {
      const speed = editorLayers.speedOf(element), ease = editorLayers.easeOf(element);
      element.classList.toggle('reveal', mode === 'slide');
      if (mode === 'slide' && !element.style.getPropertyValue('--order')) element.style.setProperty('--order', this.nextOrder());
      if (mode !== 'slide') element.style.removeProperty('--order');
      if (mode === 'click') { if (!element.hasAttribute('data-reveal-step')) element.setAttribute('data-reveal-step', 1); }
      else { element.removeAttribute('data-reveal-step'); element.removeAttribute('data-reveal-effect'); }
      // (nothing appears: nothing to celebrate, and no control for it then; inside a click item it appears with that click)
      if (mode === 'always' && !(element.parentElement && element.parentElement.closest('[data-reveal-step]'))) element.removeAttribute('data-confetti');
      editorLayers.setSpeed(element, mode === 'always' ? '' : speed);   // kept for the new way it appears; nothing appears: no speed
      editorLayers.setEase(element, mode === 'always' ? '' : ease);
      if (!element.getAttribute('style')) element.removeAttribute('style');
    },
    nextOrder() {
      return Array.from(this.scene.querySelectorAll('[style*="--order"]')).reduce((highest, element) => Math.max(highest, parseFloat(element.style.getPropertyValue('--order')) || 0), -1) + 1;
    },
    writeChartRows(figure, text) {
      let table = figure.querySelector('table');
      if (!table) { table = document.createElement('table'); figure.appendChild(table); }
      table.innerHTML = '';
      String(text).split('\n').map(line => line.trim()).filter(Boolean).forEach(line => {
        const highlight = line.startsWith('*');
        const [label, ...rest] = line.replace(/^\*/, '').split(':');
        const row = document.createElement('tr');
        if (highlight) row.className = 'is-highlight';
        const head = document.createElement('th'), cell = document.createElement('td');
        head.textContent = label.trim();
        cell.textContent = rest.join(':').trim() || '0';
        row.append(head, cell);
        table.appendChild(row);
      });
    },
    chooseAnimation(element, value) {
      if (!value) { element.removeAttribute('data-animation'); return; }
      const definitions = editor.animations();
      let name = value;
      if (value.startsWith('preset:')) {
        name = value.slice(7);
        definitions[name] = JSON.parse(JSON.stringify(ANIMATION_PRESETS[name]));
      } else if (value === 'new') {
        name = animationName('animation');
        for (let n = 2; hasOwn(definitions, name); n++) name = 'animation-' + n;
        definitions[name] = JSON.parse(JSON.stringify(ANIMATION_PRESETS.rise));
      }
      editor.saveAnimations(definitions);
      editorLayers.setSpeed(element, '');   // its own duration counts (Speed would override it)
      editorLayers.setEase(element, '');
      element.setAttribute('data-animation', name);
      element.classList.remove('reveal');   // its own animation replaces the usual rise-in
      element.style.removeProperty('--order');
      if (definitions[name].trigger === 'click' && !element.hasAttribute('data-reveal-step')) { element.setAttribute('data-reveal-step', 1); element.setAttribute('data-editor-step-added', ''); }
      else if (definitions[name].trigger !== 'click' && element.hasAttribute('data-editor-step-added')) { element.removeAttribute('data-reveal-step'); element.removeAttribute('data-editor-step-added'); }   // (the click an earlier click animation added goes)   // removed again with the animation (section 20b)
      element.removeAttribute('data-split'); element.removeAttribute('data-split-effect'); element.removeAttribute('data-split-order');   // its own animation decides how it appears (not word by word)
      element.style.removeProperty('--split-stagger');
      if (definitions[name].trigger === 'click') this.dropHidingEffect(element);
      if (!element.getAttribute('style')) element.removeAttribute('style');
    },
    /** An animation on the element's click replaces a click effect that hides it (it would hide the animation). */
    dropHidingEffect(element) {
      if (this.clickAnimationOf(element) && ['leave', 'fade-out'].includes(element.getAttribute('data-reveal-effect'))) element.removeAttribute('data-reveal-effect');
      if (element.hasAttribute('data-animation') && EMPHASIS_EFFECTS.includes(element.getAttribute('data-reveal-effect'))) element.removeAttribute('data-reveal-effect');   // its shake, pulse or jump would stop its own animation
    },
    /** True when the element has an animation that plays on its click. */
    clickAnimationOf(element) {
      const definition = editor.animations()[element.getAttribute('data-animation')];
      return !!definition && definition.trigger === 'click';
    },
    /** A field of the keyframe editor changed: the definition in the ANIMATIONS block changes. */
    changeAnimation(input) {
      const element = this.selected;
      const name = element.getAttribute('data-animation');
      const definitions = editor.animations();
      const definition = definitions[name];
      if (!definition) return;
      if (this.recordedInput !== input) { editor.record(); this.recordedInput = input; }   // one undo step per field
      if (input.dataset.keyframe !== undefined) {
        const frames = sortedKeyframes(definition);
        const frame = frames[Number(input.dataset.keyframe)];
        if (!frame) return;
        if (input.value === '' && input.dataset.key !== 'at') delete frame[input.dataset.key];
        else frame[input.dataset.key] = Number(input.value);
        definition.keyframes = frames;
      } else {
        const field = input.dataset.animField;
        if (field === 'alternate') definition.alternate = input.checked;
        else if (field === 'repeat') definition.repeat = /^inf/i.test(input.value.trim()) ? 'infinite' : Math.max(1, parseInt(input.value, 10) || 1);
        else if (field === 'duration' || field === 'delay') definition[field] = Math.max(0, parseInt(input.value, 10) || 0);
        else if (field === 'origin') { if (originShift(input.value)) definition.origin = input.value; else delete definition.origin; }   // (the middle: none)
        else definition[field] = input.value;
        if (field === 'trigger') this.setTriggerForAll(name, input.value);
      }
      editor.saveAnimations(definitions);
      editor.changed(editor.selected);
      if (input.dataset.keyframe === undefined || input.dataset.key === 'at') { this.recordedInput = null; editor.renderPanel(); }
    },
    /** "On its click" needs a click step on every element that plays this animation, "with the slide" none. */
    setTriggerForAll(name, trigger) {
      const users = scope => Array.from(scope.querySelectorAll('[data-animation="' + CSS.escape(name) + '"]'));
      const fix = element => {
        if (trigger === 'click' && !element.hasAttribute('data-reveal-step')) element.setAttribute('data-reveal-step', 1);
        if (trigger === 'click') this.dropHidingEffect(element);
        if (trigger === 'slide' && !element.hasAttribute('data-reveal-effect')) element.removeAttribute('data-reveal-step');
      };
      users(this.scene).forEach(fix);
      this.writeBack();
      users(editor.model).forEach(element => { fix(element); editor.changedNodes.add(element.closest('section.scene') || element); });
    },
    /** Plays the selected element's animation on the canvas (the canvas itself stays still). */
    /** Plays the selected element's animation (or `definition`, e.g. a preset under the pointer) on the still canvas.
        { loop: true }: again and again, with a short rest in its end state, until stopPreview (the pointer left it). */
    previewAnimation(definitionToShow, { loop = false } = {}) {
      const element = this.selected;
      const definition = definitionToShow || (element && editor.animations()[element.getAttribute('data-animation')]);
      if (!definition) return;
      const frames = sortedKeyframes(definition);
      const used = Object.assign(usedProperties(frames), { origin: originShift(definition.origin) });
      const ownOpacity = element ? (parseFloat(element.style.getPropertyValue('--element-opacity')) || 1) : 1;
      const keyframes = frames.map(frame => {
        const css = keyframeCss(frame, used);
        const read = property => (css.match(new RegExp(property + ': ([^;]+);')) || [])[1];
        const result = { offset: frame.at / 100 };
        if (segmentEasing(frame.ease)) result.easing = segmentEasing(frame.ease);   // from this keyframe to the next
        if (used.opacity) result.opacity = String((Number.isFinite(Number(frame.opacity)) && frame.opacity !== '' ? Number(frame.opacity) : 1) * ownOpacity);   // (times its own opacity, Style)
        if (used.transform) result.transform = read('transform');
        if (used.blur) result.filter = read('filter');
        return result;
      });
      this.stopPreview();   // one preview at a time
      const hiddenUntilClick = Array.from(this.scene.querySelectorAll('[data-reveal-step]:not(.is-revealed)'));
      hiddenUntilClick.forEach(item => item.classList.add('is-revealed'));   // keep click items visible meanwhile
      element.classList.add('is-previewing');   // the still rules skip .is-previewing, so the preview can move it
      // a few seconds at most: fewer rounds of a long animation (a single very long one plays faster)
      const duration = Math.max(1, Number(definition.duration) || 800), cap = CONFIG.editor.previewMaxMs;
      const rounds = Math.max(1, Math.min(definition.repeat === 'infinite' ? 3 : Math.max(1, Number(definition.repeat) || 1), Math.floor(cap / duration)));
      const animation = element.animate(keyframes, {
        duration, delay: Math.min(1000, Math.max(0, Number(definition.delay) || 0)),
        easing: { elastic: cssToken('--ease-elastic', 'ease-out'), 'ease-out': cssToken('--ease-out', 'ease-out') }[definition.easing] || definition.easing || 'ease-out',
        iterations: loop ? Infinity : rounds, direction: definition.alternate ? 'alternate' : 'normal',
        endDelay: loop ? CONFIG.editor.previewLoopRestMs : 0,
      });
      if (duration > cap) animation.playbackRate = duration / cap;
      const done = () => {
        if (this.previewRun && this.previewRun.animation !== animation) return;   // a newer preview owns the element now
        this.previewRun = null;
        element.classList.remove('is-previewing');
        hiddenUntilClick.forEach(item => item.classList.remove('is-revealed'));
      };
      this.previewRun = { animation, done, loop };
      animation.onfinish = done;
      animation.oncancel = done;
    },

    /** Ends a running preview (another preview, another element). */
    stopPreview() {
      const run = this.previewRun;
      if (!run) return;
      this.previewRun = null;
      try { run.animation.cancel(); } catch (e) { /* already gone */ }
      run.done();
    },

    /* ---- Buttons of the Element tab ---- */
    runAction(action, button) {
      const element = this.selected;
      const actions = {
        parent: () => { if (element && element.parentElement !== this.scene) this.selectElement(element.parentElement); },
        'select-part': () => {   // a part of the path at the top of the Element tab: that many levels up
          let node = element;
          for (let up = Number(button && button.dataset.depth) || 0; up > 0 && node && node.parentElement && node.parentElement !== this.scene; up--) node = node.parentElement;
          if (node && node !== element) this.selectElement(node);
        },
        'table-add-row': () => this.editTable('add-row'), 'table-add-column': () => this.editTable('add-column'),
        'table-remove-row': () => this.editTable('remove-row'), 'table-remove-column': () => this.editTable('remove-column'),
        'table-highlight-row': () => { const row = element && element.closest('table.data-table tbody tr'); if (row && !this.locked()) this.change(() => row.classList.toggle('is-highlight')); },
        'count-up-on': () => this.countUpNumber(), 'count-up-off': () => this.countUpOff(),
        'items-sequence': () => this.itemsAppear('sequence'), 'items-clicks': () => this.itemsAppear('clicks'), 'items-together': () => this.itemsAppear('together'), 'items-plain': () => this.itemsAppear('plain'),
        'table-rows-sequence': () => this.tableRowsAppear('sequence'), 'table-rows-clicks': () => this.tableRowsAppear('clicks'), 'table-rows-plain': () => this.tableRowsAppear('plain'),
        'auto-height': () => { if (element && !this.locked()) this.change(() => { element.style.removeProperty('--h'); if (!element.getAttribute('style')) element.removeAttribute('style'); }); },
        up: () => { const before = this.previousBlock(element); if (before) this.change(() => before.before(element)); },
        down: () => { const after = this.nextBlock(element); if (after) this.change(() => after.after(element)); },
        duplicate: () => (element && editorTools.group.length < 2 && element.matches('table.data-table :is(tr, td, th, thead, tbody)') ? showToast(ui('editor.tableUseButtons')) : editorTools.group.length > 1 ? editorTools.duplicateGroup() : editorLayers.refusesInto(element) ? null : this.change(() => {
          const copy = element.cloneNode(true);
          copy.classList.remove('is-editor-selected');
          copy.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
          copy.removeAttribute('id');
          editorLayers.unmark(copy);
          [copy, ...copy.querySelectorAll('[data-morph]')].forEach(node => node.removeAttribute('data-morph'));   // (one glide name per slide: the copy does not glide)
          this.placeBlock(copy, element);
          // Ctrl+D on the copy you just moved: the next one goes as far again (a row or a grid in a few presses)
          const last = this.lastDuplicate, here = { x: this.freeValue(element, '--x'), y: this.freeValue(element, '--y') };
          const step = last && this.isFree(element) && last.slide === (editor.selected && editor.selected.getAttribute('data-name')) && last.path === String(this.selectedPath) ? { x: here.x - last.x, y: here.y - last.y } : null;
          const next = step && { x: Math.round(here.x + step.x), y: Math.round(here.y + step.y) };
          const onSlide = next && next.x >= 0 && next.y >= 0 && next.x + element.offsetWidth <= CONFIG.stage.width && next.y + element.offsetHeight <= CONFIG.stage.height;   // (off the slide: next to it as usual)
          if (onSlide && (step.x || step.y)) ['x', 'y'].forEach(axis => copy.style.setProperty('--' + axis, next[axis] + 'px'));
          else if (this.isFree(copy)) editorTools.moveOffOthers(copy);   // visible next to the original
          this.selected = copy;
          this.duplicateFrom = this.isFree(element) ? here : null;
        }, { rerender: true })),
        delete: () => {
          if (element && element.matches('table.data-table tr')) { this.editTable('remove-row'); return; }   // a row: − Row
          if (element && element.matches('table.data-table :is(td, th)')) {   // a cell: its text goes (the table keeps its shape)
            if (!this.locked()) this.change(() => { element.textContent = ''; });
            return;
          }
          if (!element || this.locked() || editorLayers.refusesRemoval([element])) return;
          if (!editor.nextLabel || editor.nextLabel === ui('cmd.delete')) editor.nextLabel = ui('editor.historyDelete', { what: editorTools.labelOf(element) });   // ("Deleted “The numbers”")
          this.change(() => { element.remove(); this.selected = null; }, { rerender: true });
          this.selectElement(null);
          showToast(ui('editor.deletedUndo'));   // (how to get it back)
        },
        'fill-placeholder': () => this.fillPlaceholder(element && element.closest('.image-placeholder')),
        'insert-date': () => this.insertDate(),
        'anim-after-previous': () => this.startAfterPrevious(element),
        'image-circle': () => editorCommands.applySetting('element', 'data-tool-field', 'borderRadius', '50%'),   // the same as Corners › Circle, lower in the panel
        'replace-image': () => this.pickFile('image/*', file => this.replaceMedia(element.matches('img') ? element : element.querySelector('img'), file)),
        'replace-video': () => this.pickFile('video/mp4,video/webm', file => this.replaceMedia(element.matches('video') ? element : element.querySelector('video'), file)),
        'replace-sound': () => this.pickFile('audio/*', file => this.replaceMedia(element.querySelector('audio'), file)),
        insert: () => this.insertBlock(editor.element.querySelector('[data-insert-kind]').value),
        bold: () => {
          // no words selected: the whole element bold (again: not bold), as Highlight does for its colour (v214)
          const picked = window.getSelection();
          const words = picked.rangeCount && !picked.isCollapsed && element && element.contains(picked.getRangeAt(0).commonAncestorContainer);
          if (!words && element) {
            if (this.locked() || editorLayers.refuses([element])) return;
            const heavy = (parseInt(getComputedStyle(element).fontWeight, 10) || 400) >= 650;
            if (heavy && !element.style.fontWeight) { showToast(ui('editor.boldByDesign')); return; }   // (a heading: bold already)
            this.change(() => {
              if (!heavy) element.style.fontWeight = '700';
              else { element.style.removeProperty('font-weight'); if ((parseInt(getComputedStyle(element).fontWeight, 10) || 400) >= 650) element.style.fontWeight = '400'; }
              if (!element.getAttribute('style')) element.removeAttribute('style');
            });
            showToast(ui(heavy ? 'editor.boldWholeOff' : 'editor.boldWhole'));
            return;
          }
          // words in a text that is bold already (a heading): Bold shows no change, so say what does stand out there
          const selection = window.getSelection(), anchor = selection.anchorNode && (selection.anchorNode.nodeType === Node.ELEMENT_NODE ? selection.anchorNode : selection.anchorNode.parentElement);
          const heavy = !!anchor && !anchor.closest('b, strong') && (parseInt(getComputedStyle(anchor).fontWeight, 10) || 400) >= 650;
          this.formatSelection('b');
          editorCommands.hideTextBar();
          if (heavy) showToast(ui('editor.boldAlready'));
        },
        accent: () => {
          // words selected in it: those words; none: the whole element in the accent colour (again: its own colour back)
          const selection = window.getSelection();
          const words = selection.rangeCount && !selection.isCollapsed && element && element.contains(selection.getRangeAt(0).commonAncestorContainer);
          if (words || !element) { this.formatSelection('highlight'); editorCommands.hideTextBar(); return; }
          if (this.locked() || editorLayers.refuses([element])) return;   // (a locked element says so itself)
          const on = element.style.color !== 'var(--color-accent)';
          this.change(() => { element.style.color = on ? 'var(--color-accent)' : ''; if (!element.getAttribute('style')) element.removeAttribute('style'); });
          showToast(ui(on ? 'editor.accentWhole' : 'editor.accentWholeOff'));
        },
        plain: () => {
          // no words selected: the whole element's own colour and weight back (what Bold and Highlight did to all of it)
          const picked = window.getSelection();
          const words = picked.rangeCount && !picked.isCollapsed && element && element.contains(picked.getRangeAt(0).commonAncestorContainer);
          if (!words && element && (element.style.color || element.style.fontWeight)) {
            if (this.locked() || editorLayers.refuses([element])) return;
            this.change(() => { element.style.removeProperty('color'); element.style.removeProperty('font-weight'); if (!element.getAttribute('style')) element.removeAttribute('style'); });
            showToast(ui('editor.plainWhole'));
            return;
          }
          if (!words && element) { showToast(ui('editor.plainAlready')); return; }   // (nothing of its own to take away)
          this.formatSelection(null); editorCommands.hideTextBar();
        },
        'add-keyframe': () => this.editKeyframes(frames => {
          const last = frames[frames.length - 1];
          const previous = frames[frames.length - 2] || last;
          frames.splice(frames.length - 1, 0, Object.assign({}, last, { at: Math.round((previous.at + last.at) / 2) }));
        }),
        'remove-keyframe': () => this.editKeyframes(frames => { if (frames.length > 2) frames.splice(Number(button.dataset.index), 1); }),
        'preview-animation': () => this.previewAnimation(),
        'copy-animation': () => {
          const definitions = editor.animations();
          const name = element.getAttribute('data-animation');
          let copyName = animationName(name + '-copy');
          for (let n = 2; hasOwn(definitions, copyName); n++) copyName = animationName(name + '-copy-' + n);
          definitions[copyName] = JSON.parse(JSON.stringify(definitions[name]));
          this.change(() => { editor.saveAnimations(definitions); element.setAttribute('data-animation', copyName); }, { rerender: true });
        },
      };
      if (this.locked() && ['up', 'down', 'duplicate', 'insert'].includes(action)) return;   // also from the keys (Ctrl+D, Ctrl+arrows)
      if (element && ['up', 'down'].includes(action) && editorLayers.refuses([element])) return;   // locked in the Layers tab
      if (actions[action] && (element || action === 'insert' || action === 'insert-date')) runSafely('editor: ' + action, actions[action]);   // (these need no selection)
    },
    editKeyframes(changeFrames) {
      const definitions = editor.animations();
      const name = this.selected.getAttribute('data-animation');
      if (!definitions[name]) return;
      editor.record();
      const frames = sortedKeyframes(definitions[name]);
      changeFrames(frames);
      definitions[name].keyframes = frames;
      editor.saveAnimations(definitions);
      editor.changed(editor.selected);
      editor.renderPanel();
    },
    previousBlock(element) { let node = element.previousElementSibling; while (node && node.matches('.speaker-notes, svg, style, script')) node = node.previousElementSibling; return node; },
    nextBlock(element) { let node = element.nextElementSibling; while (node && node.matches('.speaker-notes, svg, style, script')) node = node.nextElementSibling; return node; },

    /** Bold, italic, accent (amber), a link or plain for the selected words of the text being typed.
        kind: 'b' (bold), 'i' (italic), 's' (struck through), 'highlight' (accent), 'link' (value: the address),
        'marker' (a highlighter stroke), 'size' (value: times bigger, e.g. 1.2 or 1/1.2), 'colour' (value: a CSS colour; '' the text's own) or null (plain). */
    formatSelection(kind, value) {
      const selection = window.getSelection();
      if (!selection.rangeCount || selection.isCollapsed) { showToast(ui('editor.selectWordsFirst')); return; }
      const range = selection.getRangeAt(0);
      const host = (range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement).closest('[contenteditable="true"]');
      if (!host || !this.scene.contains(host)) { showToast(ui('editor.selectWordsFirst')); return; }
      if (!this.typingRecorded) { editor.record(); this.typingRecorded = true; }
      if (kind === null) {
        // the bold or accent the words sit in is taken away (with its whole run), then the words themselves
        const start = range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer : range.startContainer.parentElement;
        const wrapper = start.closest('b, strong, i, em, s, u, sup, sub, small, mark, span, a');
        if (wrapper && host.contains(wrapper) && wrapper !== host) {
          wrapper.replaceWith(...wrapper.childNodes);
        } else {
          const text = range.toString();
          range.deleteContents();
          range.insertNode(document.createTextNode(text));
        }
        host.querySelectorAll('span:empty, b:empty, strong:empty, small:empty, em:empty, s:empty, u:empty, sup:empty, sub:empty, a:empty').forEach(empty => empty.remove());
      } else if (kind === 'size' || kind === 'colour') {
        // a size or colour of their own: on a span around exactly these words (made once, then changed: the words stay selected for the next click)
        const element = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement;
        // (class text-format: the slide's own rules for spans in cards, titles … never reach it, css/05)
        let span = element.closest('span.text-format');
        if (!span || span === host || !host.contains(span) || span.textContent.trim() !== range.toString().trim()) {
          span = document.createElement('span');
          span.className = 'text-format';
          const words = range.extractContents();
          if (kind === 'colour') words.querySelectorAll('span.text-format[style]').forEach(inner => {   // older colours inside: the new one decides (sizes inside stay: they grow along)
            inner.style.removeProperty('color');
            if (!inner.getAttribute('style')) inner.replaceWith(...inner.childNodes);
          });
          span.appendChild(words);
          range.insertNode(span);
        }
        if (kind === 'size') {
          const size = Math.round(clamp((parseFloat(span.style.fontSize) || 1) * value, 0.4, 4) * 100) / 100;
          if (Math.abs(size - 1) < 0.01) span.style.removeProperty('font-size'); else span.style.fontSize = size + 'em';
        } else if (value) span.style.color = value;
        else span.style.removeProperty('color');
        const again = document.createRange();   // the words stay selected: click again
        if (!span.getAttribute('style')) {   // back to the text's own: no span left
          const first = span.firstChild, last = span.lastChild;
          span.replaceWith(...span.childNodes);
          if (first) { again.setStartBefore(first); again.setEndAfter(last); }
        } else again.selectNodeContents(span);
        selection.removeAllRanges();
        selection.addRange(again);
      } else {
        const inLink = node => { const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement; const link = element && element.closest('a'); return link && host.contains(link) ? link : null; };
        const oldLink = kind === 'link' && inLink(range.startContainer);
        if (oldLink && oldLink === inLink(range.endContainer)) {   // words in a link already: that link gets the new address (never a link in a link)
          oldLink.setAttribute('href', value);
          if (value.startsWith('#')) { oldLink.removeAttribute('target'); oldLink.removeAttribute('rel'); }
          else { oldLink.setAttribute('target', '_blank'); oldLink.setAttribute('rel', 'noopener'); }
          host.normalize();
          this.finishTyping();
          return;
        }
        let wrapper;
        if (kind === 'b') wrapper = document.createElement('b');
        else if (kind === 'i') wrapper = document.createElement('em');
        else if (kind === 's') wrapper = document.createElement('s');
        else if (['u', 'sup', 'sub'].includes(kind)) wrapper = document.createElement(kind);   // underlined, raised (m²), lowered (CO₂)
        else if (kind === 'link') {   // opens in a new tab when presenting; only web, mail or a slide of this file (#name)
          wrapper = document.createElement('a');
          wrapper.setAttribute('href', value);
          if (!value.startsWith('#')) { wrapper.setAttribute('target', '_blank'); wrapper.setAttribute('rel', 'noopener'); }
        } else if (kind === 'marker') wrapper = Object.assign(document.createElement('span'), { className: 'marker' });   // a highlighter stroke behind the words (css/05)
        else wrapper = Object.assign(document.createElement('span'), { className: 'highlight' });
        const words = range.extractContents();
        if (kind === 'link') words.querySelectorAll('a').forEach(link => link.replaceWith(...link.childNodes));   // (part of) another link: the new one only
        wrapper.appendChild(words);
        range.insertNode(wrapper);
        if (kind === 'link') host.querySelectorAll('a:empty').forEach(empty => empty.remove());
      }
      host.normalize();
      this.finishTyping();
    },

    /* ---- Files: images, videos, the logo ---- */
    pickFile(accept, onFile) {
      const picker = document.createElement('input');
      picker.type = 'file';
      picker.accept = accept;
      picker.addEventListener('change', () => { if (picker.files[0]) onFile(picker.files[0]); });
      picker.click();
    },
    /** A chosen file becomes a data URL in the ASSETS block of the model; the element names it. */
    readFile(file, onDataUrl) {
      if (file.size > CONFIG.editor.largeFileBytes && !askToConfirm(ui('editor.largeFile', { size: Math.round(file.size / 1048576) }))) return;
      const reader = new FileReader();
      reader.onload = () => onDataUrl(reader.result);
      reader.readAsDataURL(file);
    },
    replaceMedia(media, file) {
      if (!media) return;
      this.readFile(file, dataUrl => this.change(() => {
        const assets = editor.modelAssets();
        const name = addAsset(assets, dataUrl, editor.selected.getAttribute('data-name') + '-' + file.name.replace(/\.[^.]+$/, ''));
        writeAssetsOf(editor.model, assets);
        media.setAttribute('data-asset', name);
        media.setAttribute('src', dataUrl);
        media.removeAttribute('data-asset-poster');   // the old video's still picture would not match
        media.removeAttribute('poster');
      }, { rerender: true }));
    },
    replaceLogo(file) {
      this.readFile(file, dataUrl => editor.edit(() => {
        const assets = editor.modelAssets();
        const name = addAsset(assets, dataUrl, 'logo');
        writeAssetsOf(editor.model, assets);
        const logo = editor.modelStage().querySelector(':scope > .logo img');
        if (logo) { logo.setAttribute('data-asset', name); logo.removeAttribute('src'); }
      }, { node: editor.modelStage().querySelector(':scope > .logo') }));
    },

    /* ---- Insert a block ---- */
    blockHtml(kind, at) {
      const free = editorTools.freeBlockHtml(kind, at);   // text box and shapes: placed freely (at a point, or in the middle)
      if (free) return free;
      const order = this.nextOrder();
      const reveal = n => 'class="reveal" style="--order:' + (order + n) + '"';
      const fromTemplate = (templateName, selector) => {
        const template = editor.templateScenes().find(scene => scene.getAttribute('data-name') === templateName);
        const block = template && template.querySelector(selector);
        return block ? block.outerHTML : '';
      };
      const otherSlides = editor.modelScenes().filter(scene => scene !== editor.selected).slice(0, 3);
      const blocks = {
        heading: '<h2 ' + reveal(0) + '>' + escapeHtml(ui('editor.newHeading')) + '</h2>',
        text: '<p class="subtitle reveal" style="--order:' + order + '">' + escapeHtml(ui('editor.newText')) + '</p>',
        eyebrow: '<div class="eyebrow reveal" style="--order:' + order + '">' + escapeHtml(ui('editor.newEyebrow')) + '</div>',
        list: '<ul class="big-list">' + [0, 1, 2].map(n => '<li ' + reveal(n) + '>' + escapeHtml(ui('editor.newPoint', { number: n + 1 })) + '</li>').join('') + '</ul>',
        cards: '<div class="cards">' + [0, 1, 2].map(n => '<div class="card ' + 'reveal" style="--order:' + (order + n) + '"><b>' + escapeHtml(ui('editor.newCardTitle')) + '</b><span>' + escapeHtml(ui('editor.newCardText')) + '</span></div>').join('') + '</div>',
        numbers: '<div class="stats">' + [42, 7, 98].map((value, n) => '<div class="stat ' + (n === 0 ? 'key-figure ' : '') + 'reveal" style="--order:' + (order + n) + '"><div class="stat-value"><span class="count-up" data-to="' + value + '">' + value + '</span></div><div class="stat-label">' + escapeHtml(ui('editor.newNumberLabel')) + '</div></div>').join('') + '</div>',
        chart: fromTemplate('template-chart', '.chart').replace(/ data-unit="[^"]*"/, ''),   // (no unit: plain numbers stay plain; Unit adds one)
        columns: '<div class="columns">' + [0, 1].map(n => '<div class="column reveal" style="--order:' + (order + n) + '"><h3>' + escapeHtml(ui('editor.newColumnTitle', { number: n + 1 })) + '</h3><p>' + escapeHtml(ui('editor.newColumnText')) + '</p></div>').join('') + '</div>',
        steps: '<ol class="process-steps">' + [1, 2, 3, 4].map(n => '<li class="reveal" style="--order:' + (order + n - 1) + '"><b>' + escapeHtml(ui('editor.newStep', { number: n })) + '</b><span>' + escapeHtml(ui('editor.newStepText')) + '</span></li>').join('') + '</ol>',
        roadmap: '<ol class="roadmap">' + [['Q1', 1], ['Q2', 2], ['Q3', 3], ['Q4', 4]].map(([when, n]) => '<li class="reveal" style="--order:' + (order + n - 1) + '"><time>' + when + '</time><b>' + escapeHtml(ui('editor.newMilestone', { number: n })) + '</b><span>' + escapeHtml(ui('editor.newStepText')) + '</span></li>').join('') + '</ol>',
        ring: '<div class="progress-ring reveal" style="--order:' + order + '; --value: 70"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="ring-track" cx="60" cy="60" r="52" pathLength="100"/>' +
          '<circle class="ring-fill" cx="60" cy="60" r="52" pathLength="100" stroke-dasharray="70 100"/></svg><span class="progress-value" data-no-edit>70 %</span><span class="progress-label">' + escapeHtml(ui('editor.newProgressLabel')) + '</span></div>',
        table: '<table class="data-table reveal" style="--order:' + order + '"><thead><tr>' + [1, 2, 3].map(n => '<th>' + escapeHtml(ui('editor.newColumn', { number: n })) + '</th>').join('') + '</tr></thead><tbody>' +
          [1, 2].map(row => '<tr>' + [1, 2, 3].map(n => '<td>' + escapeHtml(ui(n === 1 ? 'editor.newRow' : 'editor.newCell', { number: row })) + '</td>').join('') + '</tr>').join('') + '</tbody></table>',
        progress: '<div class="progress reveal" style="--order:' + order + '; --value: 70%"><span class="progress-label">' + escapeHtml(ui('editor.newProgressLabel')) + '</span>' +
          '<span class="progress-track"><span class="progress-fill"></span></span><span class="progress-value" data-no-edit>70 %</span></div>',   // (the number follows Filled (%), Element tab)
        quote: '<blockquote class="quote reveal" style="--order:' + order + '">' + escapeHtml(ui('editor.newQuote')) + '</blockquote>',
        qr: fromTemplate('template-qr', '.qr-block'),
        break: fromTemplate('template-break', '.break-timer'),
        agenda: '<div class="agenda">' + otherSlides.map((scene, n) => '<button class="agenda-item reveal" style="--order:' + (order + n) + '" data-goto="' + escapeHtml(scene.getAttribute('data-name')) + '"><span class="agenda-number">' +
          String(n + 1).padStart(2, '0') + '</span><b>' + escapeHtml(scene.getAttribute('data-title') || '') + '</b><small>' + escapeHtml(ui('editor.newAgendaNote')) + '</small></button>').join('') + '</div>',
        image: '<div class="image-frame reveal" style="--order:' + order + '; width: 50%"><img data-asset="img/placeholder.svg" alt="' + escapeHtml(ui('editor.newImageAlt')) + '"></div>',
        video: '<div class="video-frame reveal" style="--order:' + order + '"><video class="slide-video" data-asset="" muted playsinline preload="auto"></video></div>',
        // a sound: a speaker with its name (the file's name, can be typed over); it plays with the slide or on a click (section 7)
        sound: '<div class="sound-badge reveal" style="--order:' + order + '"><span class="sound-icon" aria-hidden="true">🔊</span><span class="sound-name">' + escapeHtml(ui('editor.blockSound').replace(/…$/, '')) + '</span><audio class="slide-audio" data-asset="" preload="auto"></audio></div>',
      };
      return blocks[kind] || '';
    },
    /** + / − row or column of the table the selection is in (after / at the selected cell; else at the end). One undo step;
        a table keeps its heading row, one row and one column. */
    editTable(what) {
      const element = this.selected;
      const table = element && element.closest('table.data-table');
      if (!table || this.locked() || editorLayers.refuses([table])) return;
      const cell = element.closest('td, th'), row = element.closest('tr');   // a cell, a row (Alt+↑), or the table: at its end
      const rows = Array.from(table.rows), bodyRows = Array.from(table.tBodies[0] ? table.tBodies[0].rows : []);
      const rowIndex = row ? rows.indexOf(row) : rows.length - 1, columnIndex = cell ? cell.cellIndex : rows[0].cells.length - 1;
      const columns = rows[0] ? rows[0].cells.length : 0;
      if (what === 'remove-row' && (bodyRows.length < 2 || rowIndex < 1)) { showToast(ui('editor.tableKeepRow')); return; }
      if (what === 'remove-column' && columns < 2) { showToast(ui('editor.tableKeepColumn')); return; }
      this.change(() => {
        let next = null;   // the cell selected afterwards
        if (what === 'add-row') {
          const after = rowIndex < 1 ? bodyRows[0] && bodyRows[0].previousElementSibling : rows[rowIndex];
          const row = document.createElement('tr');
          for (let i = 0; i < columns; i++) { const td = document.createElement('td'); td.textContent = '…'; row.appendChild(td); }
          if (after && after.parentElement === table.tBodies[0]) after.after(row); else table.tBodies[0].prepend(row);
          // it appears like the row before it (or the first one): on the next click (the later clicks move up), or rising in after it
          const like = row.previousElementSibling || row.nextElementSibling;
          const step = like ? revealStepOf(like) : 0;
          if (step) {
            const next = row.previousElementSibling ? step + 1 : step;
            this.scene.querySelectorAll('[data-reveal-step], [data-play-step]').forEach(node => {
              if (node.closest('.speaker-notes')) return;
              const attribute = node.hasAttribute('data-reveal-step') ? 'data-reveal-step' : 'data-play-step';
              const value = parseInt(node.getAttribute(attribute), 10) || 0;
              if (value >= next) node.setAttribute(attribute, value + 1);
            });
            this.scene.querySelectorAll('.speaker-notes [data-note-step]').forEach(line => { const value = parseInt(line.getAttribute('data-note-step'), 10) || 0; if (value >= next) line.setAttribute('data-note-step', value + 1); });
            this.setAppear(row, 'click');
            row.setAttribute('data-reveal-step', next);
          } else if (like && like.classList.contains('reveal')) {
            this.setAppear(row, 'slide');
            row.style.setProperty('--order', clamp((parseFloat(like.style.getPropertyValue('--order')) || 0) + (row.previousElementSibling ? 1 : 0), 0, 40));
          }
          next = row.cells[Math.max(0, columnIndex)];
        } else if (what === 'add-column') {
          rows.forEach(row => {
            const fresh = document.createElement(row.parentElement.tagName === 'THEAD' ? 'th' : 'td');
            fresh.textContent = row.parentElement.tagName === 'THEAD' ? ui('editor.newColumn', { number: columns + 1 }) : '…';
            const at = row.cells[Math.min(columnIndex, row.cells.length - 1)];
            if (at) at.after(fresh); else row.appendChild(fresh);
            if (row === rows[rowIndex]) next = fresh;
          });
        } else if (what === 'remove-row') {
          const row = rows[rowIndex];
          const neighbour = row.nextElementSibling || row.previousElementSibling;
          row.remove();
          editorTools.closeClickGaps(this.scene);   // (its click goes with it)
          next = neighbour && neighbour.cells[Math.min(columnIndex, neighbour.cells.length - 1)];
        } else {
          rows.forEach(row => { if (row.cells[columnIndex]) row.cells[columnIndex].remove(); });
          const row = rows[rowIndex];
          next = row && row.cells[Math.min(columnIndex, row.cells.length - 1)];
        }
        this.selected = next || table;
      }, { rerender: true });
    },
    /** Puts a new block after `anchor`, or at the end of the slide's content (a free block: of the slide itself,
        before the speaker notes), on a line of its own with the right indentation, so the file stays readable. */
    placeBlock(block, anchor) {
      const parent = anchor ? anchor.parentElement : block.classList.contains('is-free') ? this.scene : (this.scene.querySelector(':scope > .content') || this.scene);
      let depth = 0;
      for (let node = parent; node && node !== this.scene; node = node.parentElement) depth++;
      const newline = () => document.createTextNode('\n' + ' '.repeat(4 + depth * 2));
      if (anchor) { anchor.after(newline(), block); return block; }
      const notes = parent === this.scene ? parent.querySelector(':scope > .speaker-notes, :scope > .slide-footer') : null;   // (before the notes and the canvas-only footer)
      let before = notes || (parent.lastChild && parent.lastChild.nodeType === Node.TEXT_NODE && !parent.lastChild.textContent.trim() ? parent.lastChild : null);
      if (notes && notes.previousSibling && notes.previousSibling.nodeType === Node.TEXT_NODE && !notes.previousSibling.textContent.trim()) before = notes.previousSibling;
      parent.insertBefore(newline(), before);
      parent.insertBefore(block, before);
      return block;
    },
    /** Where a new block goes: after the selected element, or (null) at the end of the slide. Not after an element placed
        on the slide itself, and not inside a freely placed one (after the image in its frame). */
    insertAnchor() {
      let selected = this.layoutAnchorOf(this.selected);
      if (selected && selected.matches('li') && selected.parentElement) selected = selected.parentElement;   // (a point of a list: after the list)
      if (!selected || selected.parentElement === this.scene) return null;
      return selected.parentElement.closest('.is-free') ? null : selected;
    },
    /** The items of a block that holds several of the same kind (a list's points, cards, numbers, steps, milestones,
        columns): the children of the most common tag, two or more. Not the slide's own column, not a text
        made of pieces, not a number with its unit, not a table (its rows have their own buttons), not a group (it appears as one). */
    /** Count up: the first number in a text of its own (not in a number block already), as [text node, match]. */
    countableNumberOf(element) {
      if (!element || !(element.isContentEditable || element.querySelector(':scope > [contenteditable="true"]')) || element.querySelector('.count-up') || element.closest('.count-up')) return null;
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        // groups of 3 after 1 to 3 digits ("1,200", "12 345", "1.234,56"), or a plain number with decimals ("2026", "0.125", "1,5")
        const match = /\d{1,3}(?:[.,\u202f ]\d{3})+(?:[.,]\d+)?(?!\d)|\d+(?:[.,]\d+)?/.exec(walker.currentNode.nodeValue);
        if (match) return [walker.currentNode, match];
      }
      return null;
    },
    /** That number becomes <span class="count-up" data-to="…"> (its thousands separator and decimals kept), so it counts up when it appears. */
    countUpNumber() {
      const element = this.selected, found = this.countableNumberOf(element);
      if (!found || this.locked() || editorLayers.refuses([element])) return;
      const [node, match] = found, token = match[0];
      // the decimal mark: the last separator when it differs from the one before it ("1.234,56"), when it is the only one and
      // not followed by exactly 3 digits ("1,5"), or after a lone 0 ("0.125"); the separators before it group the thousands
      const marks = token.match(/[.,\u202f ]/g) || [];
      const last = token.match(/([.,])(\d+)$/);
      const isDecimal = !!last && (marks.length > 1 ? marks[marks.length - 1] !== marks[0] : last[2].length !== 3 || /^0[.,]/.test(token));
      const decimals = isDecimal ? last[2].length : 0;
      const whole = decimals ? token.slice(0, -(decimals + 1)) : token;
      const grouping = (whole.match(/[.,\u202f ](?=\d{3})/) || [''])[0];
      const value = parseFloat(whole.replace(/[.,\u202f ]/g, '') + (decimals ? '.' + last[2] : ''));
      if (!Number.isFinite(value)) return;
      this.change(() => {
        const after = node.splitText(match.index);
        after.splitText(token.length);
        const span = document.createElement('span');
        span.className = 'count-up';
        span.setAttribute('data-to', String(value));
        if (decimals) span.setAttribute('data-decimals', String(decimals));
        if (grouping) span.setAttribute('data-separator', grouping === '\u202f' ? ' ' : grouping);
        if (decimals && last[1] === ',') span.setAttribute('data-decimal', ',');   // (a decimal comma stays one)
        span.textContent = token;
        after.replaceWith(span);
      }, { rerender: true });
      showToast(ui('editor.countUpDone', { number: token }));
    },
    /** Stop counting: the number is plain text again. */
    countUpOff() {
      const element = this.selected, number = element && (element.matches('.count-up') ? element : element.querySelector('.count-up'));
      if (!number || this.locked() || editorLayers.refuses([element])) return;
      this.change(() => { number.replaceWith(document.createTextNode(number.textContent)); element.normalize(); });
    },
    itemsOf(element) {
      if (!element || element.isContentEditable || element.parentElement === this.scene || element.matches('table, thead, tbody, tr, td, th, [data-group], .speaker-notes, svg, svg *') ||
        element.querySelector(':scope > .count-up')) return [];
      const children = Array.from(element.children).filter(child => !child.matches('style, script, template, br, svg, .speaker-notes, .slide-footer, [data-editor-hidden]') && child.getClientRects().length);
      if (children.every(child => INLINE_TAGS.has(child.tagName))) return [];   // a text in pieces (a heading with a highlighted word)
      const kindOf = child => child.tagName;   // (by tag: one stat with a class of its own still belongs to its row)
      const counts = new Map();
      children.forEach(child => counts.set(kindOf(child), (counts.get(kindOf(child)) || 0) + 1));
      const [kind, count] = Array.from(counts).sort((a, b) => b[1] - a[1])[0] || [];
      return count >= 2 ? children.filter(child => kindOf(child) === kind) : [];
    },
    itemsAppearHtml(element, disabled) {
      if (this.itemsOf(element).length < 2) return '';
      const button = (action, label) => '<button data-action="' + action + '"' + disabled + ' data-ui="' + label + '"></button>';
      return '<p class="editor-note">' + escapeHtml(ui('editor.itemsAppear', { count: this.itemsOf(element).length })) + '</p><div class="editor-buttons">' +
        button('items-sequence', 'editor.tableRowsSequence') + button('items-clicks', 'editor.tableRowsClicks') + button('items-together', 'editor.itemsTogether') + button('items-plain', 'editor.itemsPlain') + '</div>';
    },
    /** Its items one after another (with the slide), each on a click, together on one click, or with the block itself. */
    itemsAppear(mode) {
      const element = this.selected, items = this.itemsOf(element);
      if (items.length < 2 || this.locked() || editorLayers.refuses([element].concat(items))) return;
      if (items.some(item => item.querySelector('[data-reveal-step]'))) { showToast(ui('editor.itemsHaveClicks')); return; }   // (their own clicks would be lost in theirs)
      if (mode === 'plain') {
        const plain = items.filter(item => !item.hasAttribute('data-animation'));   // an animation of its own keeps its click (it plays on it)
        if (plain.length < items.length) showToast(ui('editor.groupAppearSkipped', { count: items.length - plain.length }));
        if (plain.length) this.change(() => { plain.forEach(item => this.setAppear(item, 'always')); editorTools.closeClickGaps(this.scene); });
        return;
      }
      const clickBlock = element.closest('[data-reveal-step]');
      if (mode === 'sequence' && clickBlock) { showToast(ui('editor.itemsClickBlock')); return; }   // (they would rise in while the block still waits for its click)
      // the block appears on a click: its items start on that click (the first one, or all together, appears with it)
      if (clickBlock && !items.some(item => item.hasAttribute('data-reveal-step'))) items.filter(item => !item.hasAttribute('data-animation')).forEach(item => item.setAttribute('data-reveal-step', revealStepOf(clickBlock)));
      editorTools.group = items;
      editorTools.appearGroup(mode);
      editorTools.group = [];
      editorTools.drawGroup();
    },
    /** How the rows of the selected table appear: one after another with the slide, one per click (as for several selected
        elements, section 19), or with the table itself (plain). */
    tableRowsAppear(mode) {
      const table = this.selected && this.selected.closest('table.data-table');
      if (!table || this.locked()) return;
      const rows = Array.from(table.tBodies[0] ? table.tBodies[0].rows : []);
      if (mode === 'plain') {
        this.change(() => { rows.forEach(row => this.setAppear(row, 'always')); editorTools.closeClickGaps(this.scene); });
        return;
      }
      if (rows.length < 2) { showToast(ui('editor.tableRowsNeedTwo')); return; }
      if (mode === 'sequence' && table.hasAttribute('data-reveal-step')) { showToast(ui('editor.tableRowsClickTable')); return; }   // (they would rise in while the table still waits for its click)
      editorTools.group = rows;
      editorTools.appearGroup(mode);
      editorTools.group = [];
      editorTools.drawGroup();
    },
    /** Where a new or pasted block goes after: a cell or row of a table means the table (a block never goes inside it). */
    layoutAnchorOf(element) { return (element && element.closest('table.data-table')) || element; },
    /** Inserts a block; `at` (slide pixels) places a text box or shape there. A new text box gets the keyboard, its text selected. */
    insertBlock(kind, at) {
      if (this.locked()) return;
      if (kind === 'image' && this.selected && this.selected.matches('.image-placeholder')) { this.fillPlaceholder(this.selected); return; }   // (a placeholder selected: the picture goes there)
      const free = FREE_TEXTS.includes(kind) || hasOwn(SHAPES, kind);   // placed freely: on the slide itself
      if (!free && editorLayers.refusesInto(this.insertAnchor(), false)) return;
      const place = () => {
        const html = this.blockHtml(kind, at);
        if (!html) return null;
        const template = document.createElement('template');
        template.innerHTML = html;
        const block = template.content.firstElementChild;
        const isFree = block.classList.contains('is-free');   // --x / --y count from the slide itself
        const anchor = isFree ? null : this.insertAnchor();
        return this.placeBlock(block, anchor);
      };
      if (kind === 'video' || kind === 'sound') {
        showToast(ui(kind === 'video' ? 'editor.chooseVideo' : 'editor.chooseSound'));   // (the file chooser comes next: say what to choose)
        this.pickFile(kind === 'video' ? 'video/mp4,video/webm' : 'audio/*', file => this.readFile(file, dataUrl => this.change(() => {
          const block = place();
          const assets = editor.modelAssets();
          const name = addAsset(assets, dataUrl, editor.selected.getAttribute('data-name') + '-' + kind);
          writeAssetsOf(editor.model, assets);
          if (kind === 'sound') { const label = block.querySelector('.sound-name'); if (label) label.textContent = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '); }
          const video = block.querySelector('video, audio');
          video.setAttribute('data-asset', name);
          video.setAttribute('src', dataUrl);
          this.selected = block;
        }, { rerender: true })));
        return;
      }
      this.change(() => {
        if (kind === 'image') {
          const assets = editor.modelAssets();
          if (!hasOwn(assets, 'img/placeholder.svg')) { assets['img/placeholder.svg'] = PLACEHOLDER_IMAGE; writeAssetsOf(editor.model, assets); }
        }
        const block = place();
        if (block) {
          resolveAssets(block, editor.modelAssets());
          this.selected = block;
          if (kind === 'image') runSafely('picture size', () => this.fitNewPicture(block));
        }
      }, { rerender: true });
      if (this.selected && editor.panelTab !== 'element') { editor.panelTab = 'element'; editor.renderPanel(); }   // the new element's settings
      // a new shape (in the middle of the slide) over the slide's texts: say how to get it out of the way
      if ((hasOwn(SHAPES, kind) || (this.selected && this.isFree(this.selected))) && this.selected && this.scene && runSafely('covers', () => {
        const box = this.selected.getBoundingClientRect(), content = this.scene.querySelector(':scope > .content');
        return !!content && Array.from(content.children).some(block => { const r = block.getBoundingClientRect(); return block.getClientRects().length && r.left < box.right && r.right > box.left && r.top < box.bottom && r.bottom > box.top; });
      }, false)) showToast(ui(hasOwn(SHAPES, kind) ? 'editor.shapeCoversText' : 'editor.freeCoversText'));
      // a picture: the file chooser opens at once (cancelled: the placeholder stays, ✂ Replace… later)
      if (kind === 'image' && this.selected && this.selected.querySelector('img')) this.runAction('replace-image');
      this.lastInsert = kind;
      const text = FREE_TEXTS.includes(kind) && this.selected;
      if (text && text.isContentEditable) {   // type at once: the first key replaces "New text"
        text.focus();
        const range = document.createRange();
        range.selectNodeContents(text);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      }
    },
  };
