  /* ===========================================================================
     19. EDITOR TOOLS: animations overview, style, shapes, clipboard, shortcuts
       Animations tab   every element of the slide that appears or moves, in
                        playing order: "with the slide" (by order) and per
                        click. Change the order or the click, select an item,
                        and play the slide on the canvas (▶ Play slide, then
                        Next click ▶ for each click).
       Style            (Element tab) text size, colour, alignment, rotation and
                        layer (front / back). Written as plain inline CSS, e.g.
                        style="font-size: 125%; color: var(--color-accent)".
       Shapes, text box (Insert) placed freely on the slide; a shape is a small
                        SVG coloured with the element's colour.
       Clipboard        Ctrl+C / Ctrl+X / Ctrl+V copy, cut and paste elements,
                        also to another slide; Ctrl+D duplicates; an image from
                        the system clipboard pastes as a new image block.
       Shortcuts        Tab / Shift+Tab next / previous element, Alt+↑ parent,
                        Ctrl+↑ / Ctrl+↓ move it, ? shows all editor keys.
       Slide tab        background colour or image (with darkening), and Save
                        as template (the slide becomes a layout in + Slide).
       Several elements Shift+click adds or removes an element: align (left,
                        centre, right, top, middle, bottom), spread them out,
                        move them together (arrows, or drag one), delete them.
       Right-click      a menu with copy, cut, paste, duplicate, delete, parent,
                        place freely, front and back.
       Find and replace (Presentation tab) in every slide's texts, titles and
                        image descriptions, optionally in the speaker notes.
       Zoom             − / + under the canvas, Ctrl+wheel, Ctrl+plus / minus,
                        Ctrl+0 fits the slide again; a zoomed slide scrolls.
       Timeline drag    (Animations tab) drag a bar "with the slide" left or
                        right: it comes earlier or later (its order, or the
                        delay of its own animation).
       Layers tab, Copy style, pan, Ctrl+drag, speed: section 20.
     =========================================================================== */

  /** Colours an element can take (Style, Colour); the values are the theme's colour tokens. */
  const STYLE_COLOURS = { '': 'editor.colourDefault', 'var(--color-accent)': 'editor.colourAccent', 'var(--color-teal)': 'editor.colourTeal',
    'var(--color-rose)': 'editor.colourRose', 'var(--color-violet)': 'editor.colourViolet', 'var(--color-text-muted)': 'editor.colourMuted', 'var(--color-text)': 'editor.colourText' };
  const STYLE_SIZES = ['', '75%', '90%', '110%', '125%', '150%', '200%', '300%'];
  /** Text size (Style, A+ / A−): a % is of the element's OWN designed size (its slide's CSS), not of the text around it
      (as CSS % would be): a big title made "150%" gets bigger, never smaller. When the two differ, the % for CSS is
      worked out and the chosen one is kept in data-text-size (shown in the list, the next step of A+ / A− starts there). */
  function designedFontPx(element) {
    const inline = element.style.getPropertyValue('font-size'), priority = element.style.getPropertyPriority('font-size');
    element.style.removeProperty('font-size');
    const px = parseFloat(getComputedStyle(element).fontSize) || 16;
    if (inline) element.style.setProperty('font-size', inline, priority);
    return px;
  }
  function writeTextSize(element, choice) {
    element.removeAttribute('data-text-size');
    if (!choice) { element.style.removeProperty('font-size'); keepInnerSizes(element); return; }
    if (!/^[\d.]+%$/.test(choice)) { element.style.fontSize = choice; return; }   // (a size of its own, e.g. from Fit)
    const parentPx = parseFloat(getComputedStyle(element.parentElement || element).fontSize) || 16;
    const factor = designedFontPx(element) / parentPx;
    if (Math.abs(factor - 1) < 0.02) { element.style.fontSize = choice; keepInnerSizes(element); return; }
    element.style.fontSize = (Math.round(parseFloat(choice) * factor * 100) / 100) + '%';
    element.setAttribute('data-text-size', choice + ' ' + element.style.fontSize);   // (the chosen % and the % written for CSS)
    keepInnerSizes(element);
  }
  /** A size given another way (Fit): remembered as a % of its own size too, so the list and A+ / A− start from it. */
  function rememberTextSize(element) {
    element.removeAttribute('data-text-size');
    const written = element.style.fontSize;
    if (!/%$/.test(written)) return;
    const chosen = textSizeOf(element);
    if (chosen !== written) element.setAttribute('data-text-size', chosen + ' ' + written);
  }
  /** Texts inside with a size chosen of their own (a point of a list made bigger): written again for their new surroundings. */
  function keepInnerSizes(element) {
    element.querySelectorAll('[data-text-size]').forEach(inner => {
      const [chosen, written] = inner.getAttribute('data-text-size').split(' ');
      if (chosen && written === inner.style.fontSize) writeTextSize(inner, chosen);
    });
  }
  /** The text size as chosen (Style, A+ / A−); a size written another way since (Code tab, Fit) is shown as it is. */
  function textSizeOf(element) {
    const [chosen, written] = (element.getAttribute('data-text-size') || '').split(' ');
    if (chosen && written === element.style.fontSize) return chosen;
    if (!element.style.fontSize) return '';
    // (set another way: Fit, a corner, the Code tab, a file from before v183): how big it really is, in % of its own size
    return Math.round((parseFloat(getComputedStyle(element).fontSize) || 16) / designedFontPx(element) * 100) + '%';
  }
  /** Image focus (Element tab, Image): which part stays in view; '' = the middle. */
  const IMAGE_FOCUS = [['', 'editor.focusMiddle'], ['50% 0%', 'editor.focusTop'], ['50% 100%', 'editor.focusBottom'], ['0% 50%', 'editor.focusLeft'], ['100% 50%', 'editor.focusRight'],
    ['0% 0%', 'editor.focusTopLeft'], ['100% 0%', 'editor.focusTopRight'], ['0% 100%', 'editor.focusBottomLeft'], ['100% 100%', 'editor.focusBottomRight']];
  /** Image zoom (Element tab, Image), in %: a part of the image shown larger in the same box ('' = the whole image). */
  const IMAGE_ZOOMS = ['', '125', '150', '200', '300', '400'];
  /** A slide's background gradient (Slide tab): over its colour (and image), in the theme's colours; --background-gradient (css/05). */
  const BACKGROUND_GRADIENTS = [['', 'editor.gradientNone'],
    ['radial-gradient(ellipse at 15% 10%, color-mix(in srgb, var(--color-accent) 26%, transparent), transparent 60%)', 'editor.gradientWarm'],
    ['radial-gradient(ellipse at 85% 90%, color-mix(in srgb, var(--color-teal) 24%, transparent), transparent 60%)', 'editor.gradientTeal'],
    ['linear-gradient(135deg, color-mix(in srgb, var(--color-violet) 22%, transparent), transparent 55%, color-mix(in srgb, var(--color-accent) 18%, transparent))', 'editor.gradientDiagonal'],
    ['radial-gradient(ellipse at center, transparent 45%, rgb(0 0 0 / .55))', 'editor.gradientVignette'],
    // patterns: thin lines in the text colour, faint (they need no size of their own, so Moves slowly can still shift them)
    ['repeating-linear-gradient(0deg, color-mix(in srgb, var(--color-text) 7%, transparent) 0 1px, transparent 1px 56px), repeating-linear-gradient(90deg, color-mix(in srgb, var(--color-text) 7%, transparent) 0 1px, transparent 1px 56px)', 'editor.gradientGrid'],
    ['repeating-linear-gradient(135deg, color-mix(in srgb, var(--color-text) 4%, transparent) 0 18px, transparent 18px 36px)', 'editor.gradientStripes']];
  /** An image's look (Image section): a filter on the picture itself, in --image-look (css/05). */
  const IMAGE_LOOKS = [['', 'editor.lookNormal'], ['grayscale(1)', 'editor.lookGray'], ['sepia(.8)', 'editor.lookSepia'], ['brightness(.55)', 'editor.lookDim'],
    ['saturate(1.5) contrast(1.08)', 'editor.lookVivid'], ['blur(4px)', 'editor.lookSoft'],
    // tints in the deck's colours: black and white, coloured (one colour, so photos of different kinds look like one set)
    ['grayscale(1) sepia(.7) hue-rotate(130deg) saturate(1.7) brightness(.95)', 'editor.lookTeal'], ['grayscale(1) sepia(.9) saturate(1.8) brightness(1.02)', 'editor.lookAmber'],
    // duotone: dark parts in the theme's darkest colour, light parts in a theme colour (SVG filters, duotone in js/13)
    ['url(#duotone-teal)', 'editor.lookDuotoneTeal'], ['url(#duotone-amber)', 'editor.lookDuotoneAmber'], ['url(#duotone-violet)', 'editor.lookDuotoneViolet']];
  /** Image › Brightness, Contrast and Colour (sliders, in %): written after the look's own filter in --image-look, all three
      together ("… brightness(1.1) contrast(1) saturate(1.3)"), so every rule that uses the look keeps them too. */
  const ADJUST_PATTERN = /\s*brightness\(([\d.]+)\) contrast\(([\d.]+)\) saturate\(([\d.]+)\)$/;
  const ADJUSTS = [['brightness', 'editor.adjustBrightness', 30, 170], ['contrast', 'editor.adjustContrast', 30, 170], ['saturate', 'editor.adjustSaturation', 0, 200]];
  /** An image's look in two parts: the chosen look (a list value) and the three adjustments (1 = as it is). */
  function lookParts(image) {
    const look = image.style.getPropertyValue('--image-look').trim();
    const match = look.match(ADJUST_PATTERN);
    return { preset: match ? look.slice(0, match.index).trim() : look, adjust: match ? match.slice(1, 4).map(Number) : [1, 1, 1] };
  }
  function setLook(image, preset, adjust) {
    const value = (preset + (adjust.every(part => part === 1) ? '' : ' brightness(' + adjust[0] + ') contrast(' + adjust[1] + ') saturate(' + adjust[2] + ')')).trim();
    if (value) image.style.setProperty('--image-look', value);
    else image.style.removeProperty('--image-look');
  }
  /** More text style (Style): [value, interface text]; '' leaves it as the slide's CSS has it. */
  const STYLE_CHOICES = {
    fontFamily: [['', 'editor.asItIs'], ['var(--font-display)', 'editor.fontDisplay'], ['var(--font-body)', 'editor.fontBody'], ['var(--font-mono)', 'editor.fontMono']],
    fontWeight: [['', 'editor.asItIs'], ['400', 'editor.weightNormal'], ['700', 'editor.weightBold']],
    fontStyle: [['', 'editor.asItIs'], ['italic', 'editor.styleItalic'], ['normal', 'editor.styleUpright']],
    lineHeight: [['', 'editor.asItIs'], ['1', '1'], ['1.15', '1.15'], ['1.3', '1.3'], ['1.5', '1.5'], ['1.8', '1.8']],
    textTransform: [['', 'editor.asItIs'], ['uppercase', 'editor.caseUpper'], ['none', 'editor.caseAsTyped']],
    letterSpacing: [['', 'editor.asItIs'], ['-0.02em', 'editor.spacingTight'], ['0.05em', 'editor.spacingWide'], ['0.15em', 'editor.spacingWider']],
    alignContent: [['', 'editor.asItIs'], ['start', 'editor.valignTop'], ['center', 'editor.valignMiddle'], ['end', 'editor.valignBottom']],   // its text in a box with a height of its own
    border: [['', 'editor.asItIs'], ['2px solid var(--color-accent)', 'editor.edgeThin'], ['5px solid var(--color-accent)', 'editor.edgeThick'], ['2px dashed var(--color-accent)', 'editor.edgeDashed'],
      ['2px solid color-mix(in srgb, currentColor 35%, transparent)', 'editor.edgeSoft'], ['0px none', 'editor.edgeNone']],   // Edge: a border (theme colours)
    columnCount: [['', 'editor.asItIs'], ['2', '2'], ['3', '3']],   // Text columns: a long text or a list over 2 or 3 columns
    padding: [['', 'editor.asItIs'], ['0px', 'editor.paddingNone'], ['0.5em', 'editor.paddingSmall'], ['1em', 'editor.paddingMedium'], ['1.6em', 'editor.paddingLarge']],
    borderRadius: [['', 'editor.asItIs'], ['0', 'editor.cornersSquare'], ['8px', 'editor.cornersSmall'], ['18px', 'editor.cornersRound'], ['32px', 'editor.cornersRounder'], ['50%', 'editor.cornersCircle']],
  };
  /** Box (Style): a background behind a text or block, in the theme's colours (a theme change follows). */
  const BOX_FILLS = [['', 'editor.asItIs'], ['color-mix(in srgb, var(--color-accent) 16%, transparent)', 'editor.boxAccent'], ['color-mix(in srgb, var(--color-teal) 16%, transparent)', 'editor.boxTeal'],
    ['var(--color-surface)', 'editor.boxSurface'], ['var(--color-accent)', 'editor.boxSolid'], ['frosted', 'editor.boxFrosted'], ['transparent', 'editor.boxNone']];
  /** Box › Frosted glass: a see-through card colour that blurs what lies behind it (backdrop-filter). */
  const FROSTED = { background: 'color-mix(in srgb, var(--color-surface) 45%, transparent)', blur: 'blur(14px)' };
  /** A shadow (Style): a drop shadow that follows the element's shape (a text's letters, a shape's outline), in --element-shadow;
      its filter keeps it (a blur in a keyframe adds the shadow too, section 7). */
  const SHADOWS = [['', 'editor.shadowNone'], ['drop-shadow(0 6px 14px rgb(0 0 0 / .35))', 'editor.shadowSoft'], ['drop-shadow(0 14px 30px rgb(0 0 0 / .6))', 'editor.shadowStrong'],
    ['drop-shadow(0 0 18px color-mix(in srgb, var(--color-accent) 65%, transparent))', 'editor.shadowGlow']];
  /** A shape's fill (--shape-fill, 0 to 1) and outline (--shape-stroke). */
  /** Text fill (Style): a gradient through the letters, in --text-gradient (css/05); theme colours, so a theme change follows. */
  const TEXT_GRADIENTS = [['', 'editor.textFillPlain'], ['linear-gradient(90deg, var(--color-accent), var(--color-rose))', 'editor.textFillSunset'],
    ['linear-gradient(90deg, var(--color-accent), var(--color-teal))', 'editor.textFillAccentTeal'], ['linear-gradient(90deg, var(--color-teal), var(--color-violet))', 'editor.textFillTealViolet'], ['outline', 'editor.textFillOutline']];   // (Outline: only the letters' edges, --text-outline)
  /** Opacity (Style): '' is fully visible; the rest in --element-opacity. */
  const OPACITIES = ['', '.8', '.6', '.4', '.2'];
  const SHAPE_FILLS = [['', 'editor.fillLight'], ['.5', 'editor.fillHalf'], ['1', 'editor.fillSolid'], ['0', 'editor.fillNone']];
  const SHAPE_STROKES = [['', 'editor.strokeNormal'], ['1.5px', 'editor.strokeThin'], ['6px', 'editor.strokeThick'], ['0px', 'editor.strokeNone']];

  /** The shapes that can be inserted: an SVG drawn in a 100 x 100 box that stretches with the element. */
  const SHAPES = {
    rect: '<rect x="2" y="2" width="96" height="96" rx="6" fill="currentColor" fill-opacity=".16" stroke="currentColor" stroke-width="3" vector-effect="non-scaling-stroke"/>',
    circle: '<ellipse cx="50" cy="50" rx="48" ry="48" fill="currentColor" fill-opacity=".16" stroke="currentColor" stroke-width="3" vector-effect="non-scaling-stroke"/>',
    line: '<line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" stroke-width="4" stroke-linecap="round" vector-effect="non-scaling-stroke"/>',
    arrow: '<line x1="0" y1="50" x2="92" y2="50" stroke="currentColor" stroke-width="4" stroke-linecap="round" vector-effect="non-scaling-stroke"/><path d="M80 36 L100 50 L80 64" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>',
    triangle: '<polygon points="50,2 98,98 2,98" fill="currentColor" fill-opacity=".16" stroke="currentColor" stroke-width="3" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>',
    star: '<polygon points="50,4 61.8,35.8 95.7,37.2 69,58.2 78.2,90.8 50,72 21.8,90.8 31,58.2 4.3,37.2 38.2,35.8" fill="currentColor" fill-opacity=".16" stroke="currentColor" stroke-width="3" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>',
    callout: '<path d="M6 3 H94 Q98 3 98 7 V65 Q98 69 94 69 H42 L20 96 L26 69 H6 Q2 69 2 65 V7 Q2 3 6 3 Z" fill="currentColor" fill-opacity=".16" stroke="currentColor" stroke-width="3" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>',
    diamond: '<polygon points="50,2 98,50 50,98 2,50" fill="currentColor" fill-opacity=".16" stroke="currentColor" stroke-width="3" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>',
    hexagon: '<polygon points="25,4 75,4 98,50 75,96 25,96 2,50" fill="currentColor" fill-opacity=".16" stroke="currentColor" stroke-width="3" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>',
    heart: '<path d="M50 92 C22 72 2 54 2 31 C2 14 14 3 28 3 C38 3 46 9 50 19 C54 9 62 3 72 3 C86 3 98 14 98 31 C98 54 78 72 50 92 Z" fill="currentColor" fill-opacity=".16" stroke="currentColor" stroke-width="3" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>',
    chevron: '<polygon points="2,8 72,8 98,50 72,92 2,92 28,50" fill="currentColor" fill-opacity=".16" stroke="currentColor" stroke-width="3" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>',
    check: '<path d="M8 54 L38 84 L94 14" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>',
    plus: '<polygon points="35,2 65,2 65,35 98,35 98,65 65,65 65,98 35,98 35,65 2,65 2,35 35,35" fill="currentColor" fill-opacity=".16" stroke="currentColor" stroke-width="3" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>',
    pentagon: '<polygon points="50,2 98,38 80,98 20,98 2,38" fill="currentColor" fill-opacity=".16" stroke="currentColor" stroke-width="3" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>',
    octagon: '<polygon points="30,2 70,2 98,30 98,70 70,98 30,98 2,70 2,30" fill="currentColor" fill-opacity=".16" stroke="currentColor" stroke-width="3" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>',
    cloud: '<path d="M26 88 C10 88 2 76 4 64 C6 53 14 47 24 47 C24 30 37 18 53 20 C65 21 73 30 75 40 C89 38 98 49 97 61 C96 78 86 88 72 88 Z" fill="currentColor" fill-opacity=".16" stroke="currentColor" stroke-width="3" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>',
    curve: '<path d="M2 84 Q48 -8 92 50" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/><path d="M78.4 45.3 L93.2 51.6 L91.1 35.6" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>',
    twoway: '<line x1="6" y1="50" x2="94" y2="50" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/><path d="M20 36 L0 50 L20 64 M80 36 L100 50 L80 64" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>',
    cross: '<path d="M12 12 L88 88 M88 12 L12 88" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>',
  };
  /** Texts placed freely (Insert, the menu of an empty spot): a text box, a label (a text in a badge). */
  const FREE_TEXTS = ['textbox', 'label', 'note', 'icon'];
  /** + Insert (section 20): its groups, in this order ([interface text, kinds]), and a small picture per kind (a shape draws itself). */
  const INSERT_GROUPS = [
    ['editor.insertGroupText', ['heading', 'text', 'eyebrow', 'list', 'columns', 'quote', 'textbox', 'label', 'note']],
    ['editor.insertGroupMedia', ['image', 'video', 'sound', 'icon', 'qr']],
    ['editor.insertGroupData', ['cards', 'numbers', 'chart', 'table', 'progress', 'ring', 'steps', 'roadmap', 'agenda', 'break']],
    ['editor.insertGroupShapes', Object.keys(SHAPES)],
  ];
  const INSERT_ICONS = { heading: 'H', text: '¶', eyebrow: 'ᴀʙ', list: '☰', columns: '▥', quote: '❝', textbox: 'T', label: '🏷', note: '🗒', image: '🖼', video: '🎬', sound: '🔊', icon: '★', qr: '▦',
    cards: '▤', numbers: '#', chart: '📊', table: '▦', progress: '▬', ring: '◔', steps: '➜', roadmap: '🛣', agenda: '☷', break: '☕' };
  /** Icon: the symbols offered (any other can be typed in it: an emoji, a letter). */
  const ICONS = ['💡', '🚀', '🎯', '📈', '⚡', '✓', '★', '🔒', '⏱', '👥', '⚙', '💬', '📦', '🧭', '🛠', '❤'];
  /** The size a new shape gets (px): [width, height]. */
  const SHAPE_SIZES = { line: [360, 40], arrow: [360, 40], star: [220, 220], triangle: [260, 220], callout: [340, 220],
    diamond: [220, 220], hexagon: [240, 210], heart: [220, 200], chevron: [260, 160], check: [180, 160], cross: [160, 160],
    plus: [200, 200], pentagon: [230, 220], octagon: [220, 220], cloud: [300, 200], curve: [240, 240], twoway: [360, 40] };
  /** Shapes that are lines (nothing to fill; their outline is the line itself). */
  /** Fill (one freely placed element): edge to edge over these parts of the slide. */
  const FILL_AREAS = ['slide', 'left', 'right', 'top', 'bottom'];
  const LINE_SHAPES = '.shape[data-shape="line"], .shape[data-shape="arrow"], .shape[data-shape="check"], .shape[data-shape="cross"], .shape[data-shape="curve"], .shape[data-shape="twoway"]';
  /** What can be flipped (mirrored): its picture is (the shape's drawing, the image, the video), not the element: its
      motion, morph and handles stay as they are. No texts (they would read backwards), no groups; a picture in its frame
      flips through the frame (a picture without one keeps its own transform for effects and still copies: not flipped). */
  const FLIPPABLE = '.shape, .image-frame, .video-frame';
  const flipTargetOf = item => (item.matches(FLIPPABLE) ? item : item.matches('img, video') && item.parentElement && item.parentElement.matches('.image-frame, .video-frame') ? item.parentElement : null);

  /** What "Copy" puts on the system clipboard for an element, so Paste knows it is the editor's own. */
  const CLIPBOARD_MARK = '[Presentation editor element] ';

  const editorTools = {
    clipboard: null,      // the last copied element(s): { html, files, label } (the label ends in a unique "#id")
    copyCount: 0,
    group: [],
    copyToTicked: new Set(),   // Copy to other slides: the slides ticked (names)            // elements chosen with Shift+click (canvas copies), for align and spread
    playStep: -1,         // -1: the canvas is still; 0, 1, ...: the slide plays, this many clicks shown

    /* ---- Animations tab ---- */
    /** The animated elements of the canvas slide: { slide: [...], clicks: Map(step -> [...]) }. */
    animatedElements() {
      const scene = editorCanvas.scene;
      const definitions = editor.animations();
      const slide = [], clicks = new Map();
      if (!scene) return { slide, clicks };
      scene.querySelectorAll('.reveal, [data-reveal-step], [data-animation], [data-play-step]').forEach(element => {
        if (element.closest('svg, .speaker-notes')) return;
        const step = revealStepOf(element) || playStepOf(element);
        const animation = definitions[element.getAttribute('data-animation')];
        if (step > 0 && !(animation && animation.trigger === 'slide')) {
          if (!clicks.has(step)) clicks.set(step, []);
          clicks.get(step).push(element);
        } else {
          slide.push(element);
        }
      });
      const orderOf = element => {
        const animation = definitions[element.getAttribute('data-animation')];
        return animation ? (Number(animation.delay) || 0) / 130 : parseFloat(element.style.getPropertyValue('--order')) || 0;
      };
      slide.sort((a, b) => orderOf(a) - orderOf(b));
      return { slide, clicks: new Map(Array.from(clicks.entries()).sort((a, b) => a[0] - b[0])) };
    },
    /** ▲ / ▼ in the Animations tab: an element that comes in with the slide changes places with its neighbour in the
        order; the order numbers of those (without an animation of their own) are then 0, 1, 2, … in one undo step. */
    moveInOrder(path, direction) {
      const element = editorCanvas.elementAtPath(String(path).split('/').filter(Boolean).map(Number));
      if (!element || editorCanvas.locked()) return;
      const list = this.animatedElements().slide.filter(item => !item.hasAttribute('data-animation'));
      const index = list.indexOf(element), other = index + direction;
      if (index < 0 || other < 0 || other >= list.length) { showToast(ui(direction < 0 ? 'editor.alreadyFirst' : 'editor.alreadyLast')); return; }
      [list[index], list[other]] = [list[other], list[index]];
      editor.nextLabel = ui('editor.historyOrder');
      editorCanvas.change(() => list.forEach((item, order) => item.style.setProperty('--order', order)), { rerender: true });
      editor.nextLabel = null;
    },
    /** A short name for an element in the list: its text, or what it is. */
    labelOf(element) {
      const name = editorLayers.cleanName(element.getAttribute('data-editor-name'));
      if (name) return '“' + name + '”';   // its name (Layers tab, section 20)
      const text = this.textOf(element);
      if (text) return text.length > 34 ? text.slice(0, 33) + '…' : text;
      if (element.matches('img, .image-frame')) return ui('editor.blockImage');
      if (element.matches('video, .video-frame')) return ui('editor.sectionVideo');
      if (element.matches('.shape')) return ui('editor.blockShape');
      return element.tagName.toLowerCase();
    },
    /** Its text with a space between the texts of different elements ("49 stories delivered", not "49stories delivered"). */
    textOf(element) {
      let text = '', lastParent = null;
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const parent = walker.currentNode.parentElement;
        if (lastParent && parent !== lastParent) text += ' ';
        text += walker.currentNode.nodeValue;
        lastParent = parent;
      }
      return text.replace(/\s+/g, ' ').trim();
    },
    /** What the element does: "rises in", a click effect, or its animation's name. */
    actionOf(element) {
      if (element.hasAttribute('data-animation')) return '★ ' + animationLabel(element.getAttribute('data-animation'));
      if (element.matches(':is(video, audio)[data-play-step]')) return ui(element.matches('audio') ? 'cue.playsSound' : 'cue.playsVideo');
      const effect = element.getAttribute('data-reveal-effect');
      if (effect) return ui('editor.effect' + effect.replace(/(^|-)(.)/g, (whole, dash, letter) => letter.toUpperCase()));
      return ui('editor.effectNone');
    },
    animationsPanelHtml() {
      this.makeTimingProbe();
      const { slide, clicks } = this.animatedElements();
      const locked = editorCanvas.locked();
      const disabled = locked ? ' disabled' : '';
      const row = (element, kind) => {
        const path = editorCanvas.pathOf(element).join('/');
        const value = kind === 'slide' ? (parseFloat(element.style.getPropertyValue('--order')) || 0) : (revealStepOf(element) || playStepOf(element));
        const editable = !(kind === 'slide' && element.hasAttribute('data-animation'));
        const timing = this.timingOf(element, kind);
        const total = kind === 'slide' ? slideTotal : clickTotal(revealStepOf(element) || playStepOf(element));
        const bar = 'left:' + (100 * timing.start / total).toFixed(1) + '%; width:' + Math.max(1.5, 100 * Math.min(timing.length, total - timing.start) / total).toFixed(1) + '%';
        // drag the bar: "with the slide" changes its order; its own animation (used only here) changes its delay
        const name = element.getAttribute('data-animation');
        const ownAnimation = !!name && editor.model.querySelectorAll('[data-animation="' + CSS.escape(name) + '"]').length === 1;
        const drag = locked ? '' : kind === 'slide' && !name ? 'order' : ownAnimation ? 'delay' : '';
        const dragData = drag ? ' data-drag="' + drag + '" data-path="' + path + '" data-total="' + Math.round(total) + '" data-start="' + Math.round(timing.start) + '"' +
          (drag === 'order' ? ' data-order="' + value + '" data-stagger="' + Math.round(stagger) + '"' : '') : '';
        return '<div class="anim-row' + (element === editorCanvas.selected ? ' is-selected' : '') + '" data-path="' + path + '">' +
          '<button class="anim-label" data-action="select-path" data-path="' + path + '" title="' + escapeHtml(this.labelOf(element) + ' · ' + this.actionOf(element)) + '">' + escapeHtml(this.labelOf(element)) + '</button>' +
          '<span class="anim-action">' + escapeHtml(this.actionOf(element)) + '</span>' +
          // (with the slide: ▲ comes in before the one above it, ▼ after the one below it, in one undo step)
          (kind === 'slide' && editable && !locked ? '<span class="anim-move"><button data-action="anim-earlier" data-path="' + path + '" title="' + escapeHtml(ui('editor.appearEarlier')) + '" aria-label="' + escapeHtml(ui('editor.appearEarlier')) + '">▲</button>' +
            '<button data-action="anim-later" data-path="' + path + '" title="' + escapeHtml(ui('editor.appearLater')) + '" aria-label="' + escapeHtml(ui('editor.appearLater')) + '">▼</button></span>' : '') +
          (editable ? '<label class="anim-num"><small>' + escapeHtml(ui(kind === 'slide' ? 'editor.orderShort' : 'editor.clickShort')) + '</small><input type="number" min="' + (kind === 'slide' ? 0 : 1) + '" max="40" data-tool-field="' + (kind === 'slide' ? 'order' : 'step') + '" data-path="' + path + '" value="' + value + '"' + disabled + ' title="' + escapeHtml(ui(kind === 'slide' ? 'editor.order' : 'editor.clickNumber')) + '"></label>' : '<span></span>') +
          '<div class="anim-track' + (drag ? ' is-draggable' : '') + '"' + dragData + ' data-from="' + Math.round(timing.start) + '" data-length="' + (timing.length === Infinity ? '' : Math.round(timing.length)) + '" data-ktotal="' + Math.round(total) + '" title="' + escapeHtml(ui('editor.timing', { start: Math.round(timing.start), length: timing.length === Infinity ? '∞' : Math.round(timing.length) }) + (drag ? ' · ' + ui('editor.dragTiming') : '')) + '">' +
            '<span class="anim-bar' + (timing.length === Infinity ? ' is-loop' : '') + '" style="' + bar + '"></span>' + editorMotion.keysHtml(element, timing, total) + '</div>' +
        '</div>';
      };
      // the timeline under each row: one scale for "with the slide", one per click
      const endOf = elements => Math.max(1000, ...elements.map(element => { const t = this.timingOf(element, 'slide'); return t.start + (t.length === Infinity ? 1500 : t.length); }));
      const slideTotal = endOf(slide);
      const clickTotals = new Map(Array.from(clicks.entries()).map(([step, elements]) => [step, Math.max(1000, ...elements.map(element => { const t = this.timingOf(element, 'click'); return t.start + (t.length === Infinity ? 1500 : t.length); }))]));
      const clickTotal = step => clickTotals.get(step) || 1000;
      const stagger = this.staggerMs();
      let html = '<p class="editor-note is-tip">' + escapeHtml(ui('editor.animationsNote')) + '</p>' +
        '<div class="editor-buttons anim-transport"><button data-action="play-slide" data-ui="editor.playSlide"></button>' +
        '<button data-action="play-click"' + (this.playStep < 0 ? ' disabled' : '') + ' data-ui="editor.playClick"></button>' +
        '<button data-action="play-pause"' + (this.playStep < 0 ? ' disabled' : '') + ' aria-pressed="' + !!this.paused + '" data-ui="' + (this.paused ? 'editor.playResume' : 'editor.playPause') + '"></button>' +
        '<button data-action="play-stop"' + (this.playStep < 0 ? ' disabled' : '') + ' data-ui="editor.playStop" data-ui-title="editor.playStopTooltip"></button></div>';
      html += '<h4 data-ui="editor.withSlide"></h4>' + editorMotion.rulerHtml(slideTotal) + (slide.length ? slide.map(element => row(element, 'slide')).join('') : '<p class="editor-note" data-ui="editor.nothingHere"></p>');
      clicks.forEach((elements, step) => { html += '<h4>' + escapeHtml(ui('editor.onClick', { number: step })) + '</h4>' + elements.map(element => row(element, 'click')).join(''); });
      if (!clicks.size) html += '<h4 data-ui="editor.clicksHeading"></h4><p class="editor-note" data-ui="editor.noClicks"></p>';
      // (folded unless this slide has a pace of its own; the Animations tab has no folding headings)
      html += '<details class="anim-pace"' + (this.slidePace() || this.paceOpen ? ' open' : '') + '><summary data-ui="editor.paceHeading"></summary>' + this.timingPresetsHtml(slide, disabled) + '</details>';
      // (then the quick animations for the selected element: the slide's steps come first, as a beginner looks for them)
      html += '<h4 data-ui="editor.quickHeading"></h4>' + editorMotion.quickHtml();
      return html;
    },

    /** Timing presets for this slide: its pace (time between items; the presentation's, calm, brisk, all at once, or a
        number) and the order (as you read it, or the other way round). The pace is the slide's own --reveal-stagger. */
    timingPresetsHtml(slide, disabled) {
      const own = this.slidePace();
      const chip = (value, label) => '<button data-action="slide-pace" data-pace="' + value + '"' + disabled + (own === value ? ' class="is-current"' : '') + '>' + escapeHtml(ui(label)) + '</button>';
      const ordered = slide.filter(element => !element.hasAttribute('data-animation')).length > 1;
      return '<div class="anim-quick anim-timing"><div class="anim-quick-group"><span>' + escapeHtml(ui('editor.pace')) + '</span>' +
        chip('', 'editor.paceDeck') + chip('240', 'editor.paceCalm') + chip('70', 'editor.paceBrisk') + chip('0', 'editor.paceTogether') +
        '<input type="number" min="0" max="2000" step="10" data-tool-field="slidePace"' + disabled + ' value="' + escapeHtml(own) + '" placeholder="' + Math.round(this.deckStaggerMs()) + '" title="' + escapeHtml(ui('editor.paceTooltip')) + '" aria-label="' + escapeHtml(ui('editor.paceTooltip')) + '"></div>' +
        (ordered ? '<div class="anim-quick-group"><span>' + escapeHtml(ui('editor.orderPresets')) + '</span>' +
          '<button data-action="slide-order" data-order="reading"' + disabled + ' title="' + escapeHtml(ui('editor.orderReadingTooltip')) + '">' + escapeHtml(ui('editor.orderReading')) + '</button>' +
          '<button data-action="slide-order" data-order="reverse"' + disabled + ' title="' + escapeHtml(ui('editor.orderReverseTooltip')) + '">' + escapeHtml(ui('editor.orderReverse')) + '</button></div>' : '') + '</div>';
    },
    /** This slide's own time between items in ms as text ('' = the presentation's). */
    slidePace() {
      const scene = editor.selected;
      const match = scene && (scene.getAttribute('style') || '').match(/--reveal-stagger:\s*(\d+)ms/);
      return match ? match[1] : '';
    },
    /** The presentation's time between items (Presentation tab), in ms. */
    deckStaggerMs() {
      const match = (editor.model.getElementById('deck').getAttribute('style') || '').match(/--reveal-stagger:\s*(\d+)ms/);
      if (match) return Number(match[1]);
      const value = getComputedStyle(root).getPropertyValue('--reveal-stagger').trim();
      return (/ms$/.test(value) ? parseFloat(value) : (parseFloat(value) || 0) * 1000) || 130;
    },
    /** The slide's pace: '' (the presentation's) or a number of ms. One undo step. */
    setSlidePace(value) {
      const scene = editor.selected;
      if (!scene || editorCanvas.locked()) return;
      const ms = value === '' || value === null ? '' : String(clamp(Math.round(Number(value) || 0), 0, 2000));
      if (ms === this.slidePace()) return;
      editor.nextLabel = ui('editor.historyPace');
      editor.edit(() => {
        if (ms === '') scene.style.removeProperty('--reveal-stagger'); else scene.style.setProperty('--reveal-stagger', ms + 'ms');
        if (!scene.getAttribute('style')) scene.removeAttribute('style');
      }, { node: scene });
      editor.nextLabel = null;
      runSafely('pace preview', () => this.playSlide());   // you see the new pace at once
    },
    /** "With the slide" in reading order (top to bottom, left to right on a line) or the other way round: orders 0, 1, 2 … */
    setSlideOrder(how) {
      if (editorCanvas.locked()) { showToast(ui('editor.scriptedNote')); return; }
      if (this.playStep >= 0 || editorMotion.playhead !== null) this.stopPlaying();   // measured on the still slide (not while items rise in)
      const all = this.animatedElements().slide.filter(element => !element.hasAttribute('data-animation'));
      const items = all.filter(element => element.getClientRects().length);   // (one that is not shown keeps its order; a locked one takes part: locking is about its place)
      if (items.length < 2) return;
      const taken = new Set(all.filter(element => !items.includes(element)).map(element => parseFloat(element.style.getPropertyValue('--order')) || 0));
      const place = new Map(items.map(element => [element, element.getBoundingClientRect()]));
      // lines first (by top: a new line where the next top is clearly lower), then each line left to right
      const gap = 24 * editorCanvas.scale, lines = [];
      items.slice().sort((a, b) => place.get(a).top - place.get(b).top).forEach(element => {
        const last = lines[lines.length - 1];
        if (last && place.get(element).top - place.get(last[last.length - 1]).top < gap) last.push(element); else lines.push([element]);
      });
      const sorted = lines.flatMap(line => line.sort((a, b) => place.get(a).left - place.get(b).left));
      if (how === 'reverse') sorted.reverse();
      const numbers = [];
      for (let n = 0; numbers.length < sorted.length; n++) if (!taken.has(n)) numbers.push(n);   // never the number of one left as it is
      editor.nextLabel = ui(how === 'reverse' ? 'editor.orderReverse' : 'editor.orderReading');
      editorCanvas.change(() => sorted.forEach((element, index) => element.style.setProperty('--order', numbers[index])), { rerender: true });
      editor.nextLabel = null;
      runSafely('order preview', () => this.playSlide());
    },

    /** When an element starts and how long it moves, in ms (from the slide's start, or from its click). */
    timingOf(element, kind) {
      const animation = editor.animations()[element.getAttribute('data-animation')];
      if (animation && typeof animation === 'object') {
        const repeat = animation.repeat === 'infinite' ? Infinity : Math.max(1, Number(animation.repeat) || 1);
        return { start: Math.max(0, Number(animation.delay) || 0), length: Math.max(1, Number(animation.duration) || 800) * repeat };
      }
      const real = this.realTiming(element, kind);   // the slide's own CSS (some slides have their own pace)
      if (real) return real;
      const token = name => { const value = getComputedStyle(root).getPropertyValue(name).trim(); return /ms$/.test(value) ? parseFloat(value) : (parseFloat(value) || 0) * 1000; };
      const deckStyle = editor.model.getElementById('deck').getAttribute('style') || '';
      const sceneStyle = (editor.selected && editor.selected.getAttribute('style')) || '';   // this slide's own pace comes first
      const deckMs = (name, fallback) => { const match = sceneStyle.match(new RegExp(name + ':\\s*(\\d+)ms')) || deckStyle.match(new RegExp(name + ':\\s*(\\d+)ms')); return match ? Number(match[1]) : fallback; };
      if (element.matches(':is(video, audio)[data-play-step]')) return { start: 0, length: Infinity };
      const speed = editorLayers.speedOf(element);   // Speed (section 20), e.g. "1.2s"
      const ownLength = speed ? (/ms$/.test(speed) ? parseFloat(speed) : parseFloat(speed) * 1000) || 0 : 0;
      if (kind === 'slide') {
        const order = parseFloat(element.style.getPropertyValue('--order')) || 0;
        return { start: order * deckMs('--reveal-stagger', token('--reveal-stagger') || 130) + deckMs('--scene-enter-delay', token('--scene-enter-delay') || 300), length: ownLength || token('--duration-slow') || 800 };
      }
      return { start: 0, length: ownLength || token('--duration-medium') || 450 };
    },

    /** The timing the slide's CSS gives an element, read from an invisible playing copy of the slide
        (made once per redraw of the panel). Null when the CSS gives it no animation or transition. */
    realTiming(element, kind) {
      const probe = this.timingProbe;
      if (!probe || probe.source !== editorCanvas.scene) return null;
      // with motion reduced in this browser, the CSS shortens everything: the designed timings are shown instead
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches && !root.classList.contains('force-motion')) return null;
      const copy = probe.scene && (() => { let node = probe.scene; for (const index of editorCanvas.pathOf(element)) node = node && node.children[index]; return node; })();
      if (!copy) return null;
      const style = getComputedStyle(copy);
      const list = value => String(value).split(',').map(part => { part = part.trim(); return /ms$/.test(part) ? parseFloat(part) : (parseFloat(part) || 0) * 1000; });
      // several properties (e.g. "Pops in": opacity .26s, transform .7s): from the first start to the last end
      const span = (delays, durations) => {
        const starts = durations.map((duration, i) => delays[i % delays.length] || 0);
        const start = Math.min(...starts);
        return { start, length: Math.max(1, Math.max(...durations.map((duration, i) => starts[i] + duration)) - start) };
      };
      if (kind === 'slide' && style.animationName && style.animationName !== 'none') return span(list(style.animationDelay), list(style.animationDuration));
      if (kind === 'click' && Math.max(...list(style.transitionDuration)) > 0) return span(list(style.transitionDelay), list(style.transitionDuration));
      return null;
    },
    makeTimingProbe() {
      if (this.timingProbe && this.timingProbe.holder) this.timingProbe.holder.remove();
      this.timingProbe = null;
      if (!editorCanvas.scene) return;
      const holder = document.createElement('div');
      holder.className = 'editor-timing-probe';
      holder.setAttribute('style', editor.model.getElementById('deck').getAttribute('style') || '');   // the pace set in the Presentation tab (not saved yet)
      holder.setAttribute('aria-hidden', 'true');
      const scene = editorCanvas.scene.cloneNode(true);
      scene.classList.add('is-visible');
      scene.querySelectorAll('.is-editor-selected').forEach(node => node.classList.remove('is-editor-selected'));
      scene.querySelectorAll('video, audio').forEach(video => { video.removeAttribute('autoplay'); video.removeAttribute('src'); });   // never plays (nor loads its file)
      scene.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
      scene.inert = true;
      holder.appendChild(scene);
      editor.element.appendChild(holder);
      this.timingProbe = { holder, scene, source: editorCanvas.scene };
    },

    /* ---- Play the slide on the canvas ---- */
    playSlide() {
      if (editorMotion.drawing) editorMotion.setDrawing(false);   // no path drawn on the playing copy (section 20b)
      if (!editorMotion.scrubbing) editorMotion.stopScrub();   // playing is not paused: no playhead, no Record (section 20b)
      editorLayers.stopPreview();   // the whole slide plays now
      const holder = editorCanvas.stageElement;
      const scene = editorCanvas.scene;
      if (!scene) return;
      editorCanvas.finishTyping();
      this.applyModelAnimations();
      scene.querySelectorAll('[data-split]').forEach(element => runSafely('text by word', () => splitText(element)));   // as in the presentation
      scene.querySelectorAll('.shape[data-draw]').forEach(shape => runSafely('shape draw', () => measureShapeDraw(shape)));
      holder.classList.remove('still-slide');
      holder.classList.add('is-playing-preview');
      scene.querySelectorAll('[contenteditable]').forEach(element => element.setAttribute('contenteditable', 'false'));
      scene.querySelectorAll('.is-revealed').forEach(element => element.classList.remove('is-revealed'));
      scene.classList.remove('has-focus');   // Dim the rest on this click: not yet
      this.clearCanvasZoom();   // Zoom in on this click: not yet
      scene.classList.remove('is-visible');
      forceReflow(scene);
      scene.classList.add('is-visible');   // the entrance animations start, as on the real slide
      animateCountUps(scene, false);
      this.playStep = 0;
      this.setPaused(false);
      runSafely('video', () => updateVideos(scene, 0));
      editor.renderPanel();
    },
    /** Zoom in on this click, on the canvas (▶ Play): back to the whole slide at once (a new Play, the timeline, Record:
        their positions count on the slide as it is). */
    clearCanvasZoom() {
      const holder = editorCanvas.stageElement;
      if (!holder) return;
      clearTimeout(holder.stepZoomTimer);
      ['--step-zoom', '--step-zoom-shift'].forEach(name => holder.style.removeProperty(name));
      holder.removeAttribute('data-step-zoomed');
    },
    playNextClick() {
      const scene = editorCanvas.scene;
      if (!scene || this.playStep < 0) return;
      this.playStep++;
      const changed = new Set(), newlyShown = new Set();
      scene.querySelectorAll('[data-reveal-step]').forEach(element => {
        const was = element.classList.contains('is-revealed');
        element.classList.toggle('is-revealed', revealStepOf(element) <= this.playStep);
        if (was !== element.classList.contains('is-revealed')) changed.add(element);
        if (!was && element.classList.contains('is-revealed') && !element.matches(SHOWN_BEFORE_CLICK)) runSafely('count-up', () => animateCountUps(element, false, true));   // its numbers count on this click
        if (!was && element.classList.contains('is-revealed')) newlyShown.add(element);
      });
      runSafely('confetti', () => celebrateOnStep(scene, newlyShown));   // 🎉 also in ▶ Play, as when presenting (section 6)
      runSafely('video', () => updateVideos(scene, this.playStep));
      runSafely('focus', () => focusOnStep(scene, this.playStep, changed));   // Dim the rest on this click
      runSafely('zoom', () => zoomOnStep(scene, this.playStep, editorCanvas.stageElement));   // Zoom in on this click (css/13)
      editorCode.stepOnCanvas(this.playStep);   // ▶ with scripts: their onStep (section 20e)
      editor.renderPanel();
    },
    stopPlaying() {
      editorMotion.stopScrub();   // a still canvas again: no playhead, no Record
      if (this.playStep < 0) return;
      editorCanvas.render(editor.selected);   // render leaves play mode
      editor.renderPanel();
    },
    /** ❚❚ Pause / ▶ Resume while the slide plays on the canvas (the panel's button, or the timeline's Play button):
        every animation on the slide holds where it is, then goes on from there. */
    togglePause() {
      if (this.playStep < 0 || !editorCanvas.scene) return;
      this.setPaused(!this.paused);
      editorCanvas.scene.getAnimations({ subtree: true }).forEach(animation => {
        if (this.paused && animation.playState === 'running') animation.pause();
        else if (!this.paused && animation.playState === 'paused') animation.play();   // (a finished one stays finished)
      });
      editor.renderPanel();
    },
    setPaused(paused) {
      this.paused = paused;
      const button = editor.element && editor.element.querySelector('.timeline-head [data-tl="play"]');   // the timeline's Play: Pause while it plays
      if (button) button.textContent = ui(this.playStep < 0 ? 'editor.playSlide' : paused ? 'editor.playResume' : 'editor.playPause');
    },
    /** Back to the still canvas (called by every redraw of the canvas). */
    leavePlaying() {
      editorCode.stopOnCanvas();   // scripts that ran on the playing copy end with it (section 20e)
      this.playStep = -1;
      this.setPaused(false);
      const holder = editorCanvas.stageElement;
      if (holder) { holder.classList.add('still-slide'); holder.classList.remove('is-playing-preview'); }
      const style = byId('editorAnimationStyles');
      if (style) style.remove();
    },
    /** The animations as they are in the editor (not yet in the file), for playing them on the canvas. */
    applyModelAnimations() {
      let style = byId('editorAnimationStyles');
      if (!style) {
        style = document.createElement('style');
        style.id = 'editorAnimationStyles';
        document.body.appendChild(style);
      }
      style.textContent = animationCss(editor.animations());
    },

    /* ---- Style section of the Element tab ---- */
    styleSectionHtml(element, disabled) {
      // several selected: every field shows their common value, or "mixed" (a change gives all of them the new value)
      const members = this.group.length > 1 ? this.group : [element];
      const MIXED = '\u0000mixed';
      const common = (read, list = members) => { const values = list.map(read); return values.every(value => value === values[0]) ? values[0] : MIXED; };
      const mixedOption = current => (current === MIXED ? '<option value="" selected disabled>' + escapeHtml(ui('editor.mixed')) + '</option>' : '');
      const option = (value, label, current) => '<option value="' + escapeHtml(value) + '"' + (value === current ? ' selected' : '') + '>' + escapeHtml(label) + '</option>';
      const size = common(item => textSizeOf(editorCanvas.sizeHolderOf(item)));   // (a shape's text: its shape's size; in % of its own designed size)
      const colour = common(item => item.style.color || '');
      const isOwnColour = !!colour && colour !== MIXED && !hasOwn(STYLE_COLOURS, colour);
      const align = common(item => item.style.textAlign || '');
      const rotate = common(item => parseFloat(item.style.rotate) || 0);
      const shapes = members.filter(item => item.matches('.shape'));
      const placeDisabled = disabled || (editorLayers.isLocked(element) ? ' disabled' : '');   // locked in the Layers tab
      const flatShape = shapes.length > 0 && shapes.every(item => item.matches(LINE_SHAPES));   // nothing to fill; its outline is the line itself
      // the browser writes some values its own way ("0px none" as "0px"): each choice is compared as the browser writes it
      const probe = document.createElement('div');
      const written = (field, value) => { probe.style[field] = ''; probe.style[field] = value; return probe.style[field]; };
      // "As it is" says what that is now (one element selected): "As it is (Bold)", "As it is (1.3)", "As it is (24 px)"
      const computed = members.length === 1 ? getComputedStyle(element) : null;
      const pixels = value => Math.round(parseFloat(value) || 0);
      const nowOf = field => {
        if (!computed) return '';
        const value = computed[field] || '', fontSize = parseFloat(computed.fontSize) || 1;
        if (field === 'fontFamily') return value.split(',')[0].replace(/["']/g, '').trim();
        if (field === 'fontWeight') return ui(Number(value) >= 600 ? 'editor.weightBold' : 'editor.weightNormal');
        if (field === 'fontStyle') return ui(/italic|oblique/.test(value) ? 'editor.styleItalic' : 'editor.styleUpright');
        if (field === 'lineHeight') return value === 'normal' ? '' : String(Math.round(parseFloat(value) / fontSize * 100) / 100);
        if (field === 'textTransform') return ui(value === 'uppercase' ? 'editor.caseUpper' : 'editor.caseAsTyped');
        if (field === 'letterSpacing') return value === 'normal' || !parseFloat(value) ? '' : Math.round(parseFloat(value) / fontSize * 100) / 100 + 'em';
        if (field === 'columnCount') return value === 'auto' ? '1' : value;
        if (field === 'padding') return pixels(computed.paddingTop) ? pixels(computed.paddingTop) + ' px' : ui('editor.paddingNone');
        if (field === 'borderRadius') {   // (a radius in % stays a %: 50 % and more is a circle)
          const radius = computed.borderTopLeftRadius;
          if (/%/.test(radius)) return parseFloat(radius) >= 50 ? ui('editor.cornersCircle') : Math.round(parseFloat(radius)) + ' %';
          return pixels(radius) ? pixels(radius) + ' px' : ui('editor.cornersSquare');
        }
        if (field === 'border') return pixels(computed.borderTopWidth) && computed.borderTopStyle !== 'none' ? pixels(computed.borderTopWidth) + ' px' : ui('editor.edgeNone');
        return '';
      };
      const choice = (field, label) => {
        const current = common(item => item.style[field] || '');
        const chosen = current === MIXED ? MIXED : ((STYLE_CHOICES[field].find(([value]) => value === current || (value && written(field, value) === current)) || [current])[0]);
        const now = current === '' ? nowOf(field) : '';
        return editor.field(label, '<select data-tool-field="' + field + '"' + disabled + '>' + mixedOption(current) +
          STYLE_CHOICES[field].map(([value, text]) => option(value, (/^editor\./.test(text) ? ui(text) : text) + (value === '' && now ? ' (' + now + ')' : ''), chosen)).join('') + '</select>');
      };
      // a picture, a video or a QR code has no words: no text size, font, colour, alignment … for it (only what it can use)
      const textual = !members.every(item => item.matches('img, video, .image-frame, .video-frame, .qr-code'));
      // a shape without words: its colour (it draws in it) but no text size, alignment or text options
      const wordless = members.every(item => item.matches('.shape') && !item.querySelector(':scope > .shape-text'));
      // More text options (font, weight, slant, line height, capitals, letter spacing, columns, text fill, up or down in its box):
      // folded under a line of its own, open when one of them is used here or when it was opened last (editorTools.moreTextOpen)
      const moreTextUsed = members.some(item => ['fontFamily', 'fontWeight', 'fontStyle', 'lineHeight', 'textTransform', 'letterSpacing', 'columnCount', 'alignContent'].some(name => item.style[name]) ||
        item.style.getPropertyValue('--text-gradient').trim() || item.style.getPropertyValue('--text-outline').trim());
      const shadow = common(item => item.style.getPropertyValue('--element-shadow').trim());
      const opacity = common(item => item.style.getPropertyValue('--element-opacity').trim());
      const gradient = common(item => item.style.getPropertyValue('--text-outline').trim() ? 'outline' : item.style.getPropertyValue('--text-gradient').trim());
      const boxFill = common(item => item.style.backdropFilter ? 'frosted' : item.style.backgroundColor || '');
      const fill = common(item => item.style.getPropertyValue('--shape-fill').trim(), shapes), stroke = common(item => item.style.getPropertyValue('--shape-stroke').trim(), shapes);
      return '<h4 data-ui="editor.sectionStyle"></h4>' + (members.length > 1 ? '<p class="editor-note is-tip">' + escapeHtml(ui('editor.styleForAll', { count: members.length })) + '</p>' : '') + (this.textOf(element) ? editorLayers.textStylesHtml(element, disabled) : '') + (textual ? '<div class="editor-row">' +   // text styles (section 20)
        (wordless ? '' : editor.field('editor.textSize', '<select data-tool-field="fontSize"' + disabled + '>' + mixedOption(size) + STYLE_SIZES.map(value => option(value, value || ui('editor.sizeNormal') + (computed && size === '' ? ' (' + pixels(getComputedStyle(editorCanvas.sizeHolderOf(element)).fontSize) + ' px)' : ''), size)).join('') +
          (size && size !== MIXED && !STYLE_SIZES.includes(size) ? option(size, size, size) : '') + '</select>')) +   // (a size of its own, e.g. from Fit the text to its box)
        editor.field('editor.colour', '<select data-tool-field="color"' + disabled + '>' + mixedOption(colour) + Object.keys(STYLE_COLOURS).map(value => option(value, ui(STYLE_COLOURS[value]), colour)).join('') +
          option('custom', ui('editor.colourCustom'), isOwnColour ? 'custom' : '') + '</select>') +
        (isOwnColour ? editor.field('editor.colourPick', '<input type="color" data-tool-field="colorCustom"' + disabled + ' value="' + (this.toHex(colour) || '#ffffff') + '">') : '') +
        '</div>' + this.usedColoursHtml(disabled) + (window.EyeDropper ? '<div class="editor-buttons"><button data-action="pick-colour"' + disabled + ' data-ui="editor.pickColour" data-ui-title="editor.pickColourTooltip"></button></div>' : '') : '') +
        '<div class="editor-row">' +
        (textual && !wordless ? editor.field('editor.align', '<select data-tool-field="textAlign"' + disabled + '>' + mixedOption(align) + ['', 'left', 'center', 'right'].map(value => option(value, ui('editor.align' + (value || 'default').replace(/^./, c => c.toUpperCase())), align)).join('') + '</select>') : '') +
        editor.field('editor.rotate', '<input type="number" min="-360" max="360" step="1" data-tool-field="rotate"' + disabled + (rotate === MIXED ? ' value="" placeholder="' + escapeHtml(ui('editor.mixed')) + '"' : ' value="' + rotate + '"') + '>') +
        '</div>' +
        // ★ one click: an edge, a light tint and a glow in the accent colour (again: off)
        (members.length === 1 && textual && !wordless ? '<div class="editor-buttons"><button data-action="stand-out"' + disabled + ' aria-pressed="' + element.hasAttribute('data-stand-out') + '" data-ui="editor.standOut" data-ui-title="editor.standOutTooltip"></button></div>' : '') +
        (members.length === 1 && this.canFitText(element) ? '<div class="editor-buttons"><button data-action="fit-text"' + disabled + ' data-ui="editor.fitText" data-ui-title="editor.fitTextTooltip"></button></div>' +
          '<label class="editor-check"><input type="checkbox" data-tool-field="keepFitting"' + disabled + (element.hasAttribute('data-fit-text') ? ' checked' : '') + '><span>' + escapeHtml(ui('editor.keepFitting')) + '</span></label>' : '') +
        (textual && !wordless ? '<details class="editor-more-text"' + (moreTextUsed || this.moreTextOpen ? ' open' : '') + '><summary>' + escapeHtml(ui('editor.moreTextOptions')) + '</summary>' +
          '<div class="editor-row">' + choice('fontFamily', 'editor.font') + choice('fontWeight', 'editor.weight') + '</div>' +
          '<div class="editor-row">' + choice('fontStyle', 'editor.italic') + choice('lineHeight', 'editor.lineHeight') + choice('textTransform', 'editor.case') + '</div>' +
          (members.every(item => this.canFillText(item)) ? '<div class="editor-row">' + editor.field('editor.textFill', '<select data-tool-field="textGradient"' + disabled + '>' + mixedOption(gradient) + TEXT_GRADIENTS.map(([value, label]) => option(value, ui(label), gradient)).join('') + '</select>') + '</div>' : '') +
          '<div class="editor-row">' + choice('letterSpacing', 'editor.letterSpacing') +
          // (Text columns: a block of text or a list; a grid or flex block lays its items out itself)
          (members.every(item => item.matches('.big-list') || !/grid|flex/.test(getComputedStyle(item).display)) && !shapes.length ? choice('columnCount', 'editor.columns') : '') +
          (shapes.length ? '' : choice('alignContent', 'editor.valign')) + '</div></details>' : '') +
        (shapes.length || members.some(item => item.matches('.icon-badge, .image-frame[data-frame], .video-frame[data-frame]')) ? '' : '<div class="editor-row">' + choice('border', 'editor.edge') + choice('padding', 'editor.padding') + '</div>' +
          '<div class="editor-row">' +
          // (no Box with Text fill, whose letters the background would fill, nor with the Highlight effect, whose tint it would hide)
          (members.some(item => item.style.getPropertyValue('--text-gradient').trim() || item.style.getPropertyValue('--text-outline').trim() || item.getAttribute('data-reveal-effect') === 'highlight') ? '' : editor.field('editor.box', '<select data-tool-field="boxFill"' + disabled + '>' + mixedOption(boxFill) + BOX_FILLS.map(([value, label]) => option(value, ui(label), boxFill)).join('') + '</select>')) + '</div>') +   // (a box: its text up, middle or down, room inside, a background)
        '<div class="editor-row">' + (shapes.length === members.length ? '' : choice('borderRadius', 'editor.corners')) +   // (a shape draws itself: no corners)

          editor.field('editor.shadow', '<select data-tool-field="shadow"' + disabled + '>' + mixedOption(shadow) + SHADOWS.map(([value, label]) => option(value, ui(label), shadow)).join('') + '</select>') +
        editor.field('editor.opacity', '<select data-tool-field="opacity"' + disabled + '>' + mixedOption(opacity) + OPACITIES.map(value => option(value, value ? Math.round(Number(value) * 100) + ' %' : ui('editor.opacityFull'), opacity)).join('') + '</select>') + '</div>' +
        (shapes.length ? '<div class="editor-row">' + (flatShape ? '' :
          editor.field('editor.shapeFill', '<select data-tool-field="shapeFill"' + disabled + '>' + mixedOption(fill) + SHAPE_FILLS.map(([value, label]) => option(value, ui(label), fill)).join('') + '</select>')) +
          editor.field(flatShape ? 'editor.shapeThickness' : 'editor.shapeStroke', '<select data-tool-field="shapeStroke"' + disabled + '>' + mixedOption(stroke) +
            SHAPE_STROKES.filter(([value]) => !(flatShape && value === '0px')).map(([value, label]) => option(value, ui(label), stroke)).join('') + '</select>') + '</div>' +
          (members.length === 1 && element.matches('.shape[data-connect]') ? '<label class="editor-check"><input type="checkbox" data-tool-field="connectFollow" checked' + disabled + '><span>' + escapeHtml(ui('editor.connectFollow')) + '</span></label>' : '') +
          (members.length === 1 && element.matches('.shape') && (element.querySelector(':scope > .shape-text') || !element.matches(LINE_SHAPES)) ? '<div class="editor-buttons">' + (element.querySelector(':scope > .shape-text')
            ? '<button data-action="shape-text-remove"' + disabled + ' data-ui="editor.shapeTextRemove"></button>' : '<button data-action="shape-text-add"' + disabled + ' data-ui="editor.shapeTextAdd"></button>') + '</div>' : '') +
          (members.length === 1 && element.matches('.shape') ? editor.field('editor.shapeKind', '<select data-tool-field="shapeKind"' + disabled + '>' +
            Object.keys(SHAPES).map(kind => option(kind, ui('editor.shapeKind_' + kind), element.getAttribute('data-shape') || '')).join('') + '</select>') : '') +
          '<label class="editor-check"><input type="checkbox" data-tool-field="shapeDraw"' + disabled + (shapes.every(item => item.hasAttribute('data-draw')) ? ' checked' : '') + '><span>' + escapeHtml(ui('editor.shapeDraw')) + '</span></label>' : '') +
        (members.length === 1 && element.matches('.icon-badge') ? '<p class="editor-note is-tip" data-ui="editor.iconPick"></p><div class="editor-buttons editor-icons">' +
          ICONS.map(icon => '<button data-action="set-icon" data-icon="' + icon + '"' + disabled + (element.textContent.trim() === icon ? ' class="is-current"' : '') + ' aria-label="' + icon + '">' + icon + '</button>').join('') + '</div>' : '') +
        (members.every(item => flipTargetOf(item)) ? '<div class="editor-buttons"><button data-action="flip-x"' + disabled + ' data-ui="editor.flipX"></button><button data-action="flip-y"' + disabled + ' data-ui="editor.flipY"></button></div>' : '') +
        (editorCanvas.isFree(element) ? '<div class="editor-buttons"><button data-action="to-front"' + placeDisabled + ' data-ui="editor.toFront"></button><button data-action="layer-forward"' + placeDisabled + ' data-ui="editor.layerForward" data-ui-title="cmd.layerForward"></button>' +
          '<button data-action="layer-back"' + placeDisabled + ' data-ui="editor.layerBack" data-ui-title="cmd.layerBack"></button><button data-action="to-back"' + placeDisabled + ' data-ui="editor.toBack"></button></div>' : '') +
        (editorCanvas.isFree(element) && members.length === 1 && !element.hasAttribute('data-group') ? '<p class="editor-note" data-ui="editor.repeatNote"></p><div class="editor-buttons">' +   // Repeat in a row (copies side by side)
          [2, 3, 4, 5].map(count => '<button data-action="repeat-row" data-count="' + count + '"' + placeDisabled + ' title="' + escapeHtml(ui('editor.repeatRowTooltip')) + '">→ × ' + count + '</button>').join('') + '</div><div class="editor-buttons">' +
          [2, 3, 4].map(count => '<button data-action="repeat-column" data-count="' + count + '"' + placeDisabled + ' title="' + escapeHtml(ui('editor.repeatColumnTooltip')) + '">↓ × ' + count + '</button>').join('') + '</div>' : '') +
        (editorCanvas.isFree(element) && members.length === 1 ? '<p class="editor-note">' + escapeHtml(ui('editor.alignOnSlide')) + '</p><div class="editor-buttons editor-align-slide">' +   // one element: lined up on the slide
          ['left', 'centre', 'right', 'top', 'middle', 'bottom'].map(edge => '<button data-action="align-' + edge + '"' + placeDisabled + ' data-ui="editor.align' + edge.replace(/^./, c => c.toUpperCase()) + 's"></button>').join('') + '</div>' +
          (element.hasAttribute('data-group') ? '' : '<p class="editor-note" data-ui="editor.fillNote"></p><div class="editor-buttons editor-fill">' + FILL_AREAS.map(area => '<button data-action="fill-' + area + '"' + placeDisabled + ' data-ui="editor.fill_' + area + '"></button>').join('') + '</div>') : '') +
        editorLayers.styleButtonsHtml(disabled) +   // Copy style / Paste style (section 20)
        this.copyToSlidesHtml(members, disabled);
    },
    /** ⧉ Copy to other slides…: freely placed elements (a badge, a logo, a shape) onto the slides you tick, in the same place. */
    copyToSlidesHtml(members, disabled) {
      if (!members.every(item => editorCanvas.isFree(item))) return '';
      if (this.copyToOpen && this.copyToKey !== this.copyToKeyNow()) { this.copyToOpen = false; this.copyToTicked = new Set(); }   // another slide or element: closed again
      if (!this.copyToOpen) return '<div class="editor-buttons"><button data-action="copy-to-open"' + disabled + ' data-ui="editor.copyToSlides" data-ui-title="editor.copyToSlidesTooltip"></button></div>';
      const others = editor.modelScenes().filter(scene => scene !== editor.selected && !isScriptedSlide(scene));   // (not a slide with its own script: the editor leaves those as they are)
      return '<h4 data-ui="editor.copyToSlides"></h4><div class="editor-copy-to">' +
        '<label class="editor-check"><input type="checkbox" data-copy-all' + (others.length && others.every(scene => this.copyToTicked.has(scene.getAttribute('data-name'))) ? ' checked' : '') + '><span>' + escapeHtml(ui('editor.copyToAll')) + '</span></label>' +
        others.map(scene => '<label class="editor-check"><input type="checkbox" data-copy-slide="' + escapeHtml(scene.getAttribute('data-name')) + '"' + (this.copyToTicked.has(scene.getAttribute('data-name')) ? ' checked' : '') + '><span>' +
          escapeHtml(scene.getAttribute('data-title') || scene.getAttribute('data-name')) + '</span></label>').join('') + '</div>' +
        '<div class="editor-buttons"><button data-action="copy-to-run" data-ui="editor.copyToRun"></button><button data-action="copy-to-cancel" data-ui="editor.cancel"></button></div>';
    },
    /** Which slide and element the list was opened for (it closes when that changes). */
    copyToKeyNow() { return (editor.selected && editor.selected.getAttribute('data-name')) + '|' + String(editorCanvas.selectedPath); },
    copyToSlides() {
      const element = editorCanvas.selected;
      const members = this.group.length > 1 ? this.inDocumentOrder(this.group) : element ? [element] : [];
      const body = editor.element.querySelector('.editor-panel-body');
      const names = Array.from(this.copyToTicked);   // (kept while the panel redraws)
      if (!body) return;
      if (!members.length || !members.every(item => editorCanvas.isFree(item))) return;
      if (!names.length) { showToast(ui('editor.copyToNone')); return; }
      const assets = editor.modelAssets();
      const html = members.map(member => this.copyHtml(member, assets, {})).join('');
      const scenes = editor.modelScenes().filter(scene => names.includes(scene.getAttribute('data-name')));
      editor.nextLabel = ui('editor.copyToSlides');
      editor.edit(() => scenes.forEach(scene => {
        const template = document.createElement('template');
        template.innerHTML = html;
        Array.from(template.content.children).forEach(block => {
          editorLayers.unmark(block);   // a copy starts unlocked and visible
          const copy = editor.model.importNode(block, true);
          const notes = scene.querySelector(':scope > .speaker-notes');
          const before = notes && notes.previousSibling && notes.previousSibling.nodeType === Node.TEXT_NODE ? notes.previousSibling : notes;
          scene.insertBefore(editor.model.createTextNode('\n    '), before);
          scene.insertBefore(copy, before);
          editorCode.adoptRules(copy, scene);   // its own rules (Code tab), on that slide too
        });
        this.closeClickGaps(scene);   // a copy that appears on click 3 on a slide with no clicks: on click 1 there
        editor.changed(scene);
      }));
      editor.nextLabel = null;
      this.copyToOpen = false;
      this.copyToTicked = new Set();
      editor.renderPanel();
      showToast(ui('editor.copyToDone', { count: scenes.length }));
    },
    /** Fit the text to its box: a text placed freely with a height of its own gets the largest size (in %) at which
        all of it fits inside its box (bigger when there is room, smaller when it runs out). */
    canFitText(element) {
      return !!element && editorCanvas.isFree(element) && editorCanvas.freeValue(element, '--h') > 0 && !!this.textOf(element) && !element.matches('.shape, .icon-badge, .group, img, video, .image-frame, .video-frame');
    },
    /** The largest size (in %) at which all of the element's text fits in its box, or null when even a fifth does not. */
    bestFitSize(element) {
      if (!element.getClientRects().length || !element.clientHeight) return null;   // hidden (or no box): nothing to measure
      const before = element.style.fontSize;
      const fits = percent => {
        element.style.fontSize = percent + '%';
        return element.scrollHeight <= element.clientHeight + 1 && element.scrollWidth <= element.clientWidth + 1;
      };
      let low = 20, high = 800;   // (between a fifth and eight times its usual size)
      const room = fits(low);
      if (room) while (high - low > 1) { const middle = Math.floor((low + high) / 2); if (fits(middle)) low = middle; else high = middle; }
      element.style.fontSize = before;   // (only measured here)
      return room ? low + '%' : null;   // (always a size of its own: without one it would take its CSS size, which can differ from 100%)
    },
    /** Keep fitting (data-fit-text): after typing in it or resizing it, the text gets its best size again (no message;
        part of that same change). True when its size changed. */
    refit(element) {
      if (!element || !element.hasAttribute('data-fit-text') || !this.canFitText(element)) return false;
      const size = this.bestFitSize(element);
      if (!size || size === element.style.fontSize) return false;
      element.style.fontSize = size;
      rememberTextSize(element);   // (fitted: remembered as a % of its own size)
      return true;
    },
    fitText() {
      const element = editorCanvas.selected;
      if (!this.canFitText(element)) return;
      if (editorCanvas.locked()) { showToast(ui('editor.scriptedNote')); return; }
      const before = element.style.fontSize;
      const size = this.bestFitSize(element);
      if (!size) { showToast(ui('editor.fitTextNoRoom')); return; }
      if (size === before) { showToast(ui('editor.fitTextDone')); return; }
      editor.nextLabel = ui('editor.fitText');
      try {
        editorCanvas.change(() => { element.style.fontSize = size; rememberTextSize(element); if (!element.getAttribute('style')) element.removeAttribute('style'); });
      } finally { editor.nextLabel = null; }
      showToast(ui('editor.fitTextDone'));
    },
    /** Flip across (x) or up-down (y): its picture mirrored (--flip-x / --flip-y: -1, css/05), again to undo it; the selection, or all of a group. */
    flip(axis) {
      const element = editorCanvas.selected;
      if (!element || editorCanvas.locked()) return;
      const chosen = this.group.length > 1 ? this.group.slice() : [element];
      if (!chosen.every(item => flipTargetOf(item))) { showToast(ui('editor.flipNotText')); return; }
      const targets = Array.from(new Set(chosen.map(flipTargetOf)));
      if (editorLayers.refuses(targets)) return;
      editorCanvas.change(() => targets.forEach(item => {
        const property = axis === 'x' ? '--flip-x' : '--flip-y';
        if (item.style.getPropertyValue(property).trim() === '-1') item.style.removeProperty(property); else item.style.setProperty(property, '-1');
        if (!item.getAttribute('style')) item.removeAttribute('style');
      }));
    },
    /** Text fill is for a text itself: not a box with a background of its own (a card would lose it), not the Highlight
        or Strike click effects (they colour the text themselves). */
    canFillText(item) {
      if (!this.textOf(item) || ['highlight', 'strike', 'underline'].includes(item.getAttribute('data-reveal-effect'))) return false;
      const style = getComputedStyle(item);
      if (item.style.getPropertyValue('--text-outline').trim()) return true;   // (to take Outline off again)
      return style.backgroundImage === 'none' || !!item.style.getPropertyValue('--text-gradient') ? /rgba\(.*,\s*0\)|transparent/.test(style.backgroundColor) : false;
    },
    /** Image fit (Element tab, Image). */
    imageFitHtml(image, disabled) {
      const fit = image.style.objectFit || '';
      const option = (value, label) => '<option value="' + value + '"' + (value === fit ? ' selected' : '') + '>' + escapeHtml(ui(label)) + '</option>';
      // the focus: which part of the image stays in view when it is cut (cover) or where it sits (contain); plain object-position
      const focus = image.style.objectPosition || '';
      const focusOption = ([value, label]) => '<option value="' + escapeHtml(value) + '"' + (value === focus ? ' selected' : '') + '>' + escapeHtml(/^editor\./.test(label) ? ui(label) : label) + '</option>';
      const focusChoices = IMAGE_FOCUS.concat(focus && !IMAGE_FOCUS.some(([value]) => value === focus) ? [[focus, focus]] : []);   // written by hand
      const zoom = this.imageZoomOf(image);
      const zoomChoices = IMAGE_ZOOMS.concat(zoom && !IMAGE_ZOOMS.includes(zoom) ? [zoom] : []);   // written by hand
      const zoomOption = value => '<option value="' + value + '"' + (value === zoom ? ' selected' : '') + '>' + escapeHtml(value === 'custom' ? ui('editor.zoomCustom') : value ? value + '%' : ui('editor.zoomWhole')) + '</option>';
      return editor.field('editor.imageFit', '<select data-tool-field="objectFit"' + disabled + '>' + option('', 'editor.fitDefault') + option('contain', 'editor.fitContain') + option('cover', 'editor.fitCover') + option('fill', 'editor.fitFill') + '</select>', ui('editor.imageFitNote')) +
        editor.field('editor.imageZoom', '<select data-tool-field="imageZoom"' + disabled + '>' + zoomChoices.map(zoomOption).join('') + '</select>', ui('editor.imageZoomNote')) +
        this.frameFieldHtml(image, disabled) +
        editor.field('editor.imageLook', '<select data-tool-field="imageLook"' + disabled + '>' + IMAGE_LOOKS
          // a duotone is an SVG filter, and Chrome cannot animate a filter list with one in it: not for an image that blurs or glows on its own click
          .filter(([value]) => !(value.startsWith('url(') && value !== lookParts(image).preset && image.matches('[data-reveal-effect="blur"], [data-reveal-effect="glow"]')))
          .map(([value, label]) => '<option value="' + escapeHtml(value) + '"' + (value === lookParts(image).preset ? ' selected' : '') + '>' + escapeHtml(ui(label)) + '</option>').join('') + '</select>',
          lookParts(image).preset.startsWith('url(') ? ui('editor.imageLookDuotoneNote') : '') +
        this.adjustFieldsHtml(image, disabled) +
        (image.parentElement && image.parentElement !== editorCanvas.scene && getComputedStyle(image.parentElement).overflow === 'hidden' && !image.hasAttribute('data-animation') && !image.closest('.screenshot') ?   // (not the screenshot switcher: it moves and zooms its own pictures)   // in a frame that cuts it: room to zoom
          editor.field('editor.kenBurns', '<select data-tool-field="kenBurns"' + disabled + '>' + [['off', 'editor.kenBurnsOff'], ['', 'editor.kenBurnsIn'], ['out', 'editor.kenBurnsOut'], ['left', 'editor.kenBurnsLeft'], ['right', 'editor.kenBurnsRight']]
            .map(([value, label]) => '<option value="' + value + '"' + ((image.hasAttribute('data-ken-burns') ? (['out', 'left', 'right'].includes(image.getAttribute('data-ken-burns')) ? image.getAttribute('data-ken-burns') : '') : 'off') === value ? ' selected' : '') + '>' + escapeHtml(ui(label)) + '</option>').join('') + '</select>') : '') +
        (fit === 'fill' && !zoom ? '' : editor.field('editor.imageFocus', '<select data-tool-field="objectPosition"' + disabled + '>' + focusChoices.map(focusOption).join('') + '</select>', ui('editor.imageFocusNote')));
    },
    /** Brightness, Contrast and Colour sliders (Image section) and, when one is moved, a button that puts all three back. */
    adjustFieldsHtml(image, disabled) {
      const { adjust } = lookParts(image);
      return '<div class="editor-row editor-adjust">' + ADJUSTS.map(([name, label, min, max], index) =>
        editor.field(label, '<input type="range" data-tool-field="adjust-' + name + '" min="' + min + '" max="' + max + '" step="5" value="' + Math.round(adjust[index] * 100) + '"' + disabled + ' title="' + Math.round(adjust[index] * 100) + ' %">')).join('') + '</div>' +
        (adjust.every(part => part === 1) ? '' : '<div class="editor-buttons"><button data-action="adjust-reset"' + disabled + ' data-ui="editor.adjustReset"></button></div>');
    },
    /** While a slider moves: the picture on the canvas follows at once (the canvas is a copy; the change on letting go is the undo step). */
    previewAdjust(input) {
      const element = editorCanvas.selected;
      const image = element && (element.matches('img') ? element : element.querySelector('img'));
      const index = ADJUSTS.findIndex(([name]) => input.dataset.toolField === 'adjust-' + name);
      if (!image || index < 0) return;
      const parts = lookParts(image);
      parts.adjust[index] = Number(input.value) / 100;
      setLook(image, parts.preset, parts.adjust);
      input.title = input.value + ' %';
    },
    /** Frame (Image, Video): a browser window, a phone or a polaroid around a picture or video in its frame (data-frame, css/05). */
    frameFieldHtml(media, disabled) {
      const frame = media.parentElement && media.parentElement.matches('.image-frame, .video-frame') ? media.parentElement : null;
      if (!frame) return '';
      const current = frame.getAttribute('data-frame') || '';
      return editor.field('editor.imageFrame', '<select data-tool-field="imageFrame"' + disabled + '>' +
        [['', 'editor.frameNone'], ['browser', 'editor.frameBrowser'], ['phone', 'editor.framePhone'], ['polaroid', 'editor.framePolaroid']].map(([value, label]) => '<option value="' + value + '"' + (value === current ? ' selected' : '') + '>' + escapeHtml(ui(label)) + '</option>').join('') + '</select>') +
        (current === 'polaroid' ? editor.field('editor.frameCaption', '<input data-tool-field="frameCaption" maxlength="60"' + disabled + ' value="' + escapeHtml(frame.getAttribute('data-caption') || '') + '">', ui('editor.frameCaptionNote')) : '');
    },
    /** A polaroid's caption, handwritten on its wide bottom edge. The frame cuts what is inside it, so the caption
        cannot be an element in it: it is a picture of the text (an SVG in --caption, css/05). data-caption keeps the
        text itself, for this field. */
    setFrameCaption(frame, text) {
      const caption = String(text || '').trim().slice(0, 60);
      if (!caption) { frame.removeAttribute('data-caption'); frame.style.removeProperty('--caption'); return; }
      const xml = caption.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const fonts = 'Segoe Print, Bradley Hand, Comic Sans MS, cursive';
      // as wide as the text (measured with the same fonts) plus a margin: in a narrow polaroid the whole caption gets smaller
      const measure = (this.captionCanvas || (this.captionCanvas = document.createElement('canvas'))).getContext('2d');
      measure.font = '26px ' + fonts.split(', ').map(font => (/ /.test(font) ? '"' + font + '"' : font)).join(', ');
      const width = Math.ceil(measure.measureText(caption).width) + 48;
      const svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 " + width + " 62' preserveAspectRatio='xMidYMid meet'><text x='" + width / 2 + "' y='41' text-anchor='middle' " +
        "font-family='" + fonts + "' font-size='26' fill='#3b3a36'>" + xml + '</text></svg>';
      frame.setAttribute('data-caption', caption);
      frame.style.setProperty('--caption', 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")');
    },
    /** The image's zoom in % read back from its object-view-box: inset(top right bottom left); '' = none,
        'custom' = one this field did not write (other units, not the same cut both ways, another function). */
    imageZoomOf(image) {
      const written = (image.style.getPropertyValue('object-view-box') || '').trim();
      if (!written || written === 'none') return '';
      if (image.hasAttribute('data-crop')) return 'custom';   // ✂ Crop made it: not a Zoom
      const match = written.match(/^inset\(([^)]*)\)$/);
      const parts = match ? match[1].trim().split(/\s+/) : [];
      if (!parts.length || parts.length > 4 || parts.some(part => !/^[\d.]+%$|^0$/.test(part))) return 'custom';
      // the browser writes it short, as CSS does: inset(25%) = all four sides, inset(0% 25% 50%) = top, left and right, bottom
      const sides = parts.map(part => parseFloat(part));
      const top = sides[0], right = sides.length > 1 ? sides[1] : top, bottom = sides.length > 2 ? sides[2] : top, left = sides.length > 3 ? sides[3] : right;
      if (Math.abs((top + bottom) - (right + left)) > 0.1) return 'custom';   // a crop, not a zoom
      const shown = 1 - (right + left) / 100;   // the part of the width (and height) still in view
      return shown > 0 && shown < 1 ? String(Math.round(100 / shown)) : '';
    },
    /** Writes the zoom: the part shown is 1/zoom of the width and height, placed by the focus (object-position). */
    setImageView(image, zoom) {
      const factor = parseFloat(zoom) / 100;
      if (!(factor > 1)) { image.style.removeProperty('object-view-box'); return; }
      const [x, y] = (image.style.objectPosition || '50% 50%').split(/\s+/).map(part => clamp(parseFloat(part), 0, 100) / 100);
      const cut = (1 - 1 / factor) * 100;   // % of the image left out, per direction
      const percent = value => (Math.round(value * 100) / 100) + '%';
      const across = Number.isFinite(x) ? x : 0.5, down = Number.isFinite(y) ? y : 0.5;
      image.style.setProperty('object-view-box', 'inset(' + [cut * down, cut * (1 - across), cut * (1 - down), cut * across].map(percent).join(' ') + ')');
    },

    /* ---- Slide tab: background and save as template ---- */
    /** ✓ Check the presentation: loose ends in the file, each [slide, element or null, text]. */
    /** Example text: what Insert and the layouts put in until you type over it ("Topic", "How it works", "Point 3").
        The canvas underlines it (dotted) and Check the presentation lists it. */
    isSampleText(text) {
      text = (text || '').trim();
      if (!text) return false;
      if (!this.samples || this.samples.model !== editor.model) {
        const layoutTexts = new Set();
        editor.templateScenes().forEach(scene => scene.querySelectorAll('*').forEach(element => {
          if (element.children.length || element.closest('.speaker-notes, svg, script, style')) return;
          const words = element.textContent.trim();
          if (words.length >= 3 && !/^[\d\s.,:%+-]+$/.test(words)) layoutTexts.add(words);   // (not a bare number: real numbers look like that)
        }));
        this.samples = { model: editor.model, layoutTexts, patterns: this.placeholderPatterns() };
      }
      return this.samples.layoutTexts.has(text) || this.samples.patterns.some(pattern => pattern.test(text));
    },
    placeholderPatterns() {
      return ['editor.newHeading', 'editor.newText', 'editor.newEyebrow', 'editor.newCardTitle', 'editor.newCardText', 'editor.newQuote', 'editor.newColumnText', 'editor.newStepText',
        'editor.newNumberLabel', 'editor.newAgendaNote', 'editor.newLabel', 'editor.newProgressLabel', 'editor.newCell', 'editor.newPoint', 'editor.newColumn', 'editor.newColumnTitle', 'editor.newStep', 'editor.newMilestone', 'editor.newRow']
        .map(key => new RegExp('^' + ui(key, { number: '\u0000' }).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace('\u0000', '\\d+') + '$'));
    },
    /** The slides whose content runs off the bottom: each one drawn once, off screen, at full size (as the overflow
        warning of the status bar measures the slide on the canvas). */
    overflowingScenes(scenes) {
      const assets = editor.modelAssets(), result = new Set();
      const box = document.createElement('div');
      box.className = 'editor-thumb still-slide';
      box.style.cssText = 'position: fixed; left: -20000px; top: 0; width: 1600px; height: 900px; --thumb-scale: 1; visibility: hidden;';
      box.innerHTML = '<div class="editor-thumb-stage"></div>';
      editor.element.appendChild(box);
      try {
        scenes.forEach(scene => runSafely('overflow check', () => {
          const copy = editorCanvas.stillCopyOf(scene, assets);
          box.firstChild.replaceChildren(copy);
          const bottom = copy.getBoundingClientRect().bottom, content = copy.querySelector(':scope > .content');
          if (content && Array.from(content.children).some(block => !block.matches('.speaker-notes') && block.getClientRects().length && block.getBoundingClientRect().bottom > bottom + 2)) result.add(scene);
        }));
      } finally { box.remove(); }
      return result;
    },
    deckFindings() {
      const scenes = editor.modelScenes(), names = new Set(scenes.map(scene => scene.getAttribute('data-name')));
      const findings = [];
      const overflowing = this.overflowingScenes(scenes);
      scenes.forEach(scene => {
        if (overflowing.has(scene)) findings.push([scene, null, ui('editor.checkOverflow')]);
        if (!(scene.getAttribute('data-title') || '').trim()) findings.push([scene, null, ui('editor.checkNoTitle')]);
        scene.querySelectorAll('[data-editor-note]').forEach(element => findings.push([scene, element, ui('editor.checkNote', { note: element.getAttribute('data-editor-note') })]));
        scene.querySelectorAll('[data-goto]').forEach(element => { if (!names.has(element.getAttribute('data-goto'))) findings.push([scene, element, ui('editor.checkLink', { name: element.getAttribute('data-goto') })]); });
        scene.querySelectorAll('img').forEach(image => { const alt = (image.getAttribute('alt') || '').trim(); if ((!alt || alt === ui('editor.newImageAlt')) && !image.closest('.logo')) findings.push([scene, image.closest('.image-frame') || image, ui('editor.checkAlt')]); });
        scene.querySelectorAll('*').forEach(element => {   // every text with nothing inside it but words
          if (element.children.length || element.closest('.speaker-notes, svg, script, style')) return;
          if (this.isSampleText(element.textContent)) findings.push([scene, element, ui('editor.checkPlaceholder', { text: element.textContent.trim() })]);   // (Insert's and the layouts' example texts)
        });
      });
      return findings;
    },
    checkHtml() {
      if (!this.checkOpen) return '<div class="editor-buttons"><button data-action="check-deck" data-ui="editor.checkDeck"></button></div>';
      const findings = this.deckFindings();
      this.checkTargets = findings;
      return '<h4 data-ui="editor.checkDeck"></h4>' + (findings.length ? '<div class="editor-check-list">' + findings.map(([scene, element, text], index) => '<button data-action="check-go" data-index="' + index + '"><b>' +
        escapeHtml(scene.getAttribute('data-title') || scene.getAttribute('data-name')) + '</b> ' + escapeHtml(text) + '</button>').join('') + '</div>' : '<p class="editor-note">' + escapeHtml(ui('editor.checkAllGood')) + '</p>') +
        '<div class="editor-buttons"><button data-action="check-deck" data-ui="editor.checkAgain"></button></div>';
    },
    /** Go: that slide, that element selected (found on the canvas by a mark the model carries only for a moment). */
    checkGo(index) {
      const finding = this.checkTargets && this.checkTargets[index];
      if (!finding) return;
      const [scene, element] = finding;
      if (!scene.isConnected || (element && !element.isConnected)) { editor.renderPanel(); return; }
      if (element) element.setAttribute('data-check-target', '');
      editor.select(scene);
      if (element) {
        element.removeAttribute('data-check-target');
        const target = editorCanvas.scene && editorCanvas.scene.querySelector('[data-check-target]');
        document.querySelectorAll('[data-check-target]').forEach(copy => copy.removeAttribute('data-check-target'));   // (the slide list's small copies have it too)
        if (target) editorCanvas.selectElement(target);
      }
    },
    /** ✂ Crop… (Image section, right-click, Ctrl+K "crop"): the whole picture in a window with a frame over the part that
        shows; drag the frame to move it, a corner to make it larger or smaller. The frame keeps the shape of the picture's
        box on the slide, so nothing is stretched. Crop writes it as object-view-box: inset(top right bottom left) in %
        (the same as Zoom), one undo step; Whole picture takes the crop away. */
    openCrop(image) {
      const natural = { w: image.naturalWidth, h: image.naturalHeight };
      if (!natural.w || !natural.h) { showToast(ui('editor.cropNotLoaded')); return; }
      // the frame's width / height in % units (x is % of the picture's width, y % of its height); the box as laid out
      // (offsetWidth/Height: a turned or scaled picture keeps its own shape)
      const ratio = (image.offsetWidth && image.offsetHeight ? image.offsetWidth / image.offsetHeight : natural.w / natural.h) / (natural.w / natural.h);
      const fitWhole = () => { let w = 100, h = 100 / ratio; if (h > 100) { h = 100; w = 100 * ratio; } return { x: (100 - w) / 2, y: (100 - h) / 2, w, h }; };
      // a crop or zoom already there: that part
      let rect = fitWhole();
      const written = (image.style.getPropertyValue('object-view-box') || '').trim().match(/^inset\(([^)]*)\)$/);
      if (written) {
        const sides = written[1].trim().split(/\s+/).map(parseFloat);
        if (sides.length && sides.every(Number.isFinite)) {
          const [top, right = top, bottom = top, left = right] = sides;
          if (100 - left - right > 1 && 100 - top - bottom > 1) rect = { x: left, y: top, w: 100 - left - right, h: 100 - top - bottom };
        }
      }
      const dialog = editor.openDialog(ui('editor.cropTitle'));
      const grid = dialog.querySelector('.editor-template-grid');
      grid.innerHTML = '<div class="crop-tool"><div class="crop-area"><img alt="" draggable="false"><div class="crop-box">' +
        ['nw', 'ne', 'sw', 'se'].map(corner => '<i data-corner="' + corner + '"></i>').join('') + '</div></div>' +
        '<p class="editor-note is-tip">' + escapeHtml(ui('editor.cropNote')) + '</p>' +
        '<div class="editor-buttons"><button data-crop="apply" class="is-primary">' + escapeHtml(ui('editor.cropApply')) + '</button><button data-crop="whole">' + escapeHtml(ui('editor.cropWhole')) + '</button></div></div>';
      const tool = grid.querySelector('.crop-tool'), area = tool.querySelector('.crop-area'), frame = tool.querySelector('.crop-box');
      area.querySelector('img').src = image.currentSrc || image.src;
      const draw = () => Object.assign(frame.style, { left: rect.x + '%', top: rect.y + '%', width: rect.w + '%', height: rect.h + '%' });
      draw();
      area.addEventListener('pointerdown', event => {
        const corner = event.target.closest('[data-corner]');
        if (!corner && !event.target.closest('.crop-box')) return;
        event.preventDefault();
        const place = area.getBoundingClientRect(), start = Object.assign({}, rect), from = { x: event.clientX, y: event.clientY };
        const toPercent = pointer => ({ x: (pointer.clientX - place.left) / place.width * 100, y: (pointer.clientY - place.top) / place.height * 100 });
        const move = pointer => {
          if (!corner) {   // the whole frame
            rect.x = clamp(start.x + (pointer.clientX - from.x) / place.width * 100, 0, 100 - rect.w);
            rect.y = clamp(start.y + (pointer.clientY - from.y) / place.height * 100, 0, 100 - rect.h);
          } else {   // a corner: the opposite one stays, the frame keeps its shape
            const east = corner.dataset.corner.includes('e'), south = corner.dataset.corner.includes('s');
            const anchor = { x: east ? start.x : start.x + start.w, y: south ? start.y : start.y + start.h }, point = toPercent(pointer);
            let w = clamp((east ? point.x - anchor.x : anchor.x - point.x), 5, east ? 100 - anchor.x : anchor.x), h = w / ratio;
            const roomDown = south ? 100 - anchor.y : anchor.y;
            if (h > roomDown) { h = roomDown; w = h * ratio; }
            rect = { x: east ? anchor.x : anchor.x - w, y: south ? anchor.y : anchor.y - h, w, h };
          }
          draw();
        };
        const stop = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', stop); window.removeEventListener('pointercancel', stop); };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', stop);
        window.addEventListener('pointercancel', stop);
      });
      tool.addEventListener('click', event => {
        const button = event.target.closest('[data-crop]');
        if (!button) return;
        const whole = button.dataset.crop === 'whole';
        const percent = value => (Math.round(clamp(value, 0, 100) * 100) / 100) + '%';
        editorCanvas.change(() => {
          // (data-crop: a crop, never read as a Zoom, so a later Focus leaves it where it is)
          if (whole || (rect.w > 99.5 && rect.h > 99.5)) { image.style.removeProperty('object-view-box'); image.removeAttribute('data-crop'); }
          else { image.style.setProperty('object-view-box', 'inset(' + [rect.y, 100 - rect.x - rect.w, 100 - rect.y - rect.h, rect.x].map(percent).join(' ') + ')'); image.setAttribute('data-crop', ''); }
          if (!image.getAttribute('style')) image.removeAttribute('style');
        });
        editor.closeDialog();
      });
    },
    /** Add a comment (right-click, Edit menu, Ctrl+K): the Element tab with the cursor in the element's Comment field. */
    openComment(element) {
      if (!element) { showToast(ui('cmd.needsElement')); return; }
      editor.panelTab = 'element';
      editor.renderPanel();
      editorCommands.openDock('right');
      const field = editor.element.querySelector('.editor-panel-body [data-element-field="authorNote"]');
      if (!field) return;
      if (field.disabled) { showToast(ui('editor.commentScripted')); return; }   // (a slide run by a script: its elements take no changes)
      editor.unfoldAround(field);
      field.scrollIntoView({ block: 'center' });
      field.focus();
    },
    /** The editor notes on this slide's elements (Element tab, Note for the editor): a click selects the element. */
    slideNotesHtml() {
      const scene = editorCanvas.scene;
      const noted = scene ? Array.from(scene.querySelectorAll('[data-editor-note]')) : [];
      if (!noted.length) return '';
      return '<h4 data-ui="editor.sectionAuthorNotes"></h4><div class="editor-author-notes">' + noted.map(element => '<button data-action="select-note" data-path="' + editorCanvas.pathOf(element).join('/') + '"><b>' +
        escapeHtml(this.labelOf(element)) + '</b> ' + escapeHtml(element.getAttribute('data-editor-note')) + '</button>').join('') + '</div>';
    },
    slideSectionHtml(scene) {
      const colour = scene.style.backgroundColor ? this.toHex(scene.style.backgroundColor) : '';
      const dim = Math.round((parseFloat(scene.style.getPropertyValue('--background-dim')) || 0) * 100);
      const gradient = scene.style.getPropertyValue('--background-gradient').trim();
      return '<h4 data-ui="editor.sectionBackground"></h4>' +
        '<div class="editor-row">' + editor.field('editor.backgroundColour', '<input type="color" data-tool-field="backgroundColor" value="' + (colour || '#000000') + '">') +
          editor.field('editor.backgroundGradient', '<select data-tool-field="backgroundGradient">' + BACKGROUND_GRADIENTS.map(([value, label]) => '<option value="' + escapeHtml(value) + '"' + (value === gradient ? ' selected' : '') + '>' + escapeHtml(ui(label)) + '</option>').join('') + '</select>') + '</div>' +
        (gradient && !scene.hasAttribute('data-asset-background') ? '<label class="editor-check"><input type="checkbox" data-tool-field="backgroundDrift"' + (scene.hasAttribute('data-background-drift') ? ' checked' : '') + '><span>' + escapeHtml(ui('editor.backgroundDrift')) + '</span></label>' : '') +
        '<div class="editor-buttons">' + (colour ? '<button data-action="background-colour-off" data-ui="editor.backgroundColourOff"></button>' : '') +
        (window.EyeDropper ? '<button data-action="pick-background" data-ui="editor.pickColour" data-ui-title="editor.pickColourTooltip"></button>' : '') +
        '<button data-action="background-image" data-ui="editor.backgroundImage"></button>' +
        (colour || gradient || scene.hasAttribute('data-asset-background') ? '<button data-action="background-all" data-ui-title="editor.backgroundAllTooltip">' + escapeHtml(editor.everySlideLabel()) + '</button>' : '') +   // section 20
        (scene.hasAttribute('data-asset-background') ? '<button data-action="background-image-off" data-ui="editor.backgroundImageOff"></button>' : '') + '</div>' +
        (scene.hasAttribute('data-asset-background') ? editor.field('editor.backgroundDim', '<input type="range" min="0" max="90" step="5" data-tool-field="backgroundDim" value="' + dim + '">') : '') +
        (isScriptedSlide(scene) ? '' : '<h4 data-ui="editor.sectionTemplate"></h4><div class="editor-buttons"><button data-action="save-template" data-ui="editor.saveTemplate"></button></div>');
    },
    /** The colours of your own this presentation already uses (texts and backgrounds), most used first: one click gives one to the selection. */
    usedColours() {
      const count = new Map();
      editor.modelScenes().forEach(scene => [scene, ...scene.querySelectorAll('[style]')].forEach(item => {
        ['color', 'background-color'].forEach(property => {
          const value = item.style.getPropertyValue(property).trim();
          if (!/^rgba?\(\d+, \d+, \d+(, 1)?\)$/.test(value)) return;   // solid colours only (the theme's own, var(…), are in the list above; see-through or oklch ones are not offered)
          const hex = this.toHex(value).toLowerCase();
          if (hex) count.set(hex, (count.get(hex) || 0) + 1);
        });
      }));
      return Array.from(count).sort((a, b) => b[1] - a[1]).slice(0, CONFIG.editor.usedColoursShown).map(([hex]) => hex);
    },
    usedColoursHtml(disabled) {
      const colours = this.usedColours();
      return colours.length ? '<div class="editor-swatches" role="group" aria-label="' + escapeHtml(ui('editor.usedColours')) + '"><span class="editor-note" data-ui="editor.usedColours"></span>' +
        colours.map(hex => '<button data-action="use-colour" data-colour="' + hex + '" style="--swatch: ' + hex + '" title="' + hex + '" aria-label="' + hex + '"' + disabled + '></button>').join('') + '</div>' : '';
    },
    toHex(colour) {
      const match = String(colour).match(/\d+/g);
      if (!match || match.length < 3) return /^#[0-9a-f]{6}$/i.test(colour) ? colour : '';
      return '#' + match.slice(0, 3).map(n => Number(n).toString(16).padStart(2, '0')).join('');
    },

    /* ---- Changes from the panel ---- */
    onPanelChange(event) {
      const input = event.target;
      const field = input.dataset.toolField;
      if (!field) return false;
      if (field === 'newTextStyle') { editorLayers.saveTextStyle(input.value); return true; }   // "+ Save as style" (section 20)
      if (field === 'arrangeGap') { this.arrangeGap = clamp(parseInt(input.value, 10) || 0, 0, 400); return true; }   // the gap of In a row / In a column / grid (no change to the file yet)
      if (field === 'staggerStep') { this.staggerStep = clamp(parseInt(input.value, 10) || 0, 0, 5000); return true; }   // the stagger's time apart (no change to the file yet)
      if (field === 'slidePace') { this.setSlidePace(input.value.trim()); return true; }
      if (field === 'split' || field === 'splitStagger' || field === 'splitEffect' || field === 'splitOrder') {   // text by word, letter or line, and how its parts come in (section 7)
        const element = editorCanvas.selected;
        if (!element || editorCanvas.locked()) return true;
        editorCanvas.change(() => {
          if (field === 'split') {
            const before = element.getAttribute('data-split') || 'word', stagger = element.style.getPropertyValue('--split-stagger').trim();
            if (input.value) element.setAttribute('data-split', input.value); else element.removeAttribute('data-split');
            // the time apart that suits it (letters close together, lines further apart), unless you chose your own
            if (input.value && (!stagger || stagger === SPLIT_STAGGER_MS[before] + 'ms')) {
              if (input.value === 'word') element.style.removeProperty('--split-stagger'); else element.style.setProperty('--split-stagger', SPLIT_STAGGER_MS[input.value] + 'ms');
            }
            if (!input.value) { element.style.removeProperty('--split-stagger'); element.removeAttribute('data-split-effect'); element.removeAttribute('data-split-order'); }
          } else if (field === 'splitEffect') {
            if (SPLIT_EFFECTS.includes(input.value) && input.value) element.setAttribute('data-split-effect', input.value); else element.removeAttribute('data-split-effect');
          } else if (field === 'splitOrder') {
            if (SPLIT_ORDERS.includes(input.value) && input.value) element.setAttribute('data-split-order', input.value); else element.removeAttribute('data-split-order');
          } else element.style.setProperty('--split-stagger', clamp(parseInt(input.value, 10) || 0, 0, 2000) + 'ms');
          if (!element.getAttribute('style')) element.removeAttribute('style');
        });
        if (field !== 'splitStagger' && element.hasAttribute('data-split')) runSafely('split preview', () => this.playSlide());   // you see it at once
        return true;
      }
      if (field === 'order' || field === 'step') {
        const element = editorCanvas.elementAtPath(input.dataset.path.split('/').filter(Boolean).map(Number));
        if (!element) return true;
        const number = clamp(parseInt(input.value, 10) || 0, field === 'step' ? 1 : 0, 40);
        editorCanvas.change(() => {
          if (field === 'order') element.style.setProperty('--order', number);
          else if (element.matches(':is(video, audio)[data-play-step]')) element.setAttribute('data-play-step', number);
          else element.setAttribute('data-reveal-step', number);
        }, { rerender: true });
        return true;
      }
      if (field === 'backgroundDrift') {   // the gradient moves slowly while the slide is shown (css/05)
        const scene = editor.selected;
        editor.edit(() => scene.toggleAttribute('data-background-drift', input.checked), { node: scene });
        return true;
      }
      if (field === 'backgroundGradient') {   // over the slide's colour (and image): --background-gradient (css/05)
        const scene = editor.selected, value = BACKGROUND_GRADIENTS.some(([known]) => known === input.value) ? input.value : '';
        editor.edit(() => { if (value) scene.style.setProperty('--background-gradient', value); else { scene.style.removeProperty('--background-gradient'); scene.removeAttribute('data-background-drift'); } if (!scene.getAttribute('style')) scene.removeAttribute('style'); }, { node: scene });
        return true;
      }
      if (['backgroundColor', 'backgroundDim'].includes(field)) {
        const scene = editor.selected;
        editor.edit(() => {
          if (field === 'backgroundColor') scene.style.backgroundColor = input.value;
          else if (Number(input.value)) scene.style.setProperty('--background-dim', (Number(input.value) / 100).toFixed(2));
          else scene.style.removeProperty('--background-dim');
          if (!scene.getAttribute('style')) scene.removeAttribute('style');
        }, { node: scene });
        return true;
      }
      const element = editorCanvas.selected;
      if (!element) return true;
      // several selected: the style goes to all of them (a locked one refuses it: nothing changes)
      const targets = (this.group.length > 1 && !['objectFit', 'objectPosition', 'imageZoom'].includes(field) ? this.group.slice() : [element])
        .map(item => (['fontSize', 'lineHeight'].includes(field) ? editorCanvas.sizeHolderOf(item) : item));   // (a shape's text: its size is the shape's, so the text scales from it)
      if (targets.length > 1 && editorLayers.refuses(targets)) { editor.renderPanel(); return true; }
      const tidy = item => { if (!item.getAttribute('style')) item.removeAttribute('style'); };
      if (field === 'color' && input.value === 'custom') {   // starts from the colour it has now
        const start = this.toHex(getComputedStyle(element).color) || '#ffffff';   // several: all start from the colour of the one clicked first
        editorCanvas.change(() => targets.forEach(item => { item.style.color = targets.length > 1 ? start : this.toHex(getComputedStyle(item).color) || '#ffffff'; }), { rerender: false });
        return true;
      }
      if (field === 'colorCustom') {
        editorCanvas.change(() => targets.forEach(item => { item.style.color = input.value; }));
        return true;
      }
      if (field === 'fontSize') {   // Text size: in % of each one's own designed size (writeTextSize)
        editorCanvas.change(() => targets.forEach(item => { writeTextSize(item, input.value); tidy(item); }));
        return true;
      }
      if (field === 'connectFollow') {   // an ordinary arrow from now on: it no longer follows the two elements
        if (!input.checked) editorCanvas.change(() => element.removeAttribute('data-connect'));
        return true;
      }
      if (field === 'shapeKind') {   // another shape: the same box, colours, fill, outline and animation
        if (!SHAPES[input.value] || !element.matches('.shape')) return true;
        editorCanvas.change(() => {
          element.setAttribute('data-shape', input.value);
          element.removeAttribute('data-connect');   // (another shape follows nothing)
          const svg = element.querySelector(':scope > svg');
          if (svg) { svg.innerHTML = SHAPES[input.value]; svg.setAttribute('viewBox', '0 0 100 100'); }   // (a connector arrow drew in pixels)
          if (element.matches(LINE_SHAPES) && element.style.getPropertyValue('--shape-stroke').trim() === '0px') element.style.removeProperty('--shape-stroke');   // a line with no outline would be gone
        });
        return true;
      }
      if (field === 'shapeDraw') {   // it draws itself in (css/05)
        editorCanvas.change(() => targets.filter(item => item.matches('.shape')).forEach(item => {
          item.toggleAttribute('data-draw', input.checked);   // (its lines' lengths are measured when the slide comes on, section 7)
        }));
        return true;
      }
      if (field === 'shapeFill' || field === 'shapeStroke') {
        const name = field === 'shapeFill' ? '--shape-fill' : '--shape-stroke';
        const flat = item => item.matches(LINE_SHAPES);   // its outline is the line itself
        editorCanvas.change(() => targets.filter(item => item.matches('.shape') && !(flat(item) && input.value === '0px')).forEach(item => { if (input.value) item.style.setProperty(name, input.value); else item.style.removeProperty(name); tidy(item); }));
        return true;
      }
      if (field === 'imageFrame') {   // a browser window or a polaroid around the picture (css/05)
        const media = element.matches('img, video') ? element : element.querySelector('img, video');
        const frame = media && media.parentElement && media.parentElement.matches('.image-frame, .video-frame') ? media.parentElement : null;
        if (!frame) return true;
        editorCanvas.change(() => {
          if (['browser', 'phone', 'polaroid'].includes(input.value)) {
            frame.setAttribute('data-frame', input.value);
            frame.style.removeProperty('border');   // the frame is drawn with the border: an Edge of its own would hide it (Edge is not offered with a frame)
          } else frame.removeAttribute('data-frame');
          if (input.value !== 'polaroid') this.setFrameCaption(frame, '');   // a caption only belongs to a polaroid
          if (!frame.getAttribute('style')) frame.removeAttribute('style');
        });
        return true;
      }
      if (field === 'frameCaption') {   // the handwritten line on a polaroid's bottom edge
        const media = element.matches('img, video') ? element : element.querySelector('img, video');
        const frame = media && media.parentElement && media.parentElement.matches('.image-frame, .video-frame') ? media.parentElement : null;
        if (!frame) return true;
        editorCanvas.change(() => {
          this.setFrameCaption(frame, input.value);
          if (!frame.getAttribute('style')) frame.removeAttribute('style');
        });
        return true;
      }
      if (field.startsWith('adjust-')) {   // Brightness, Contrast, Colour: one undo step when the slider is let go
        const image = element.matches('img') ? element : element.querySelector('img');
        const index = ADJUSTS.findIndex(([name]) => field === 'adjust-' + name);
        if (!image || index < 0) return true;
        const parts = lookParts(image);
        const wanted = input.value === '' ? NaN : Number(input.value);   // (0 % colour is a real value: black and white)
        parts.adjust[index] = clamp(Number.isFinite(wanted) ? wanted : 100, ADJUSTS[index][2], ADJUSTS[index][3]) / 100;
        editorCanvas.change(() => {
          setLook(image, parts.preset, parts.adjust);
          if (!image.getAttribute('style')) image.removeAttribute('style');
        });
        return true;
      }
      if (field === 'imageLook' || field === 'kenBurns') {   // the picture itself (in its frame)
        const image = element.matches('img') ? element : element.querySelector('img');
        if (!image) return true;
        editorCanvas.change(() => {
          if (field === 'kenBurns') {   // off, slowly closer (data-ken-burns, as before), further away, or gliding to one side
            if (input.value === 'off') image.removeAttribute('data-ken-burns');
            else image.setAttribute('data-ken-burns', ['out', 'left', 'right'].includes(input.value) ? input.value : '');
          }
          else setLook(image, IMAGE_LOOKS.some(([known]) => known === input.value) ? input.value : '', lookParts(image).adjust);   // (its adjustments stay)
          if (!image.getAttribute('style')) image.removeAttribute('style');
        });
        return true;
      }
      if (field === 'objectFit' || field === 'objectPosition' || field === 'imageZoom') {
        const image = element.matches('img') ? element : element.querySelector('img');
        editorCanvas.change(() => {
          if (field !== 'imageZoom') image.style[field] = input.value;
          if (field === 'imageZoom') image.removeAttribute('data-crop');   // (a Zoom chosen replaces a crop)
          // a zoom, or a new focus of a zoom made here, writes the view box; a view box written by hand stays as it is
          const zoom = field === 'imageZoom' ? input.value : this.imageZoomOf(image);
          if (field === 'imageZoom' ? zoom !== 'custom' : field === 'objectPosition' && zoom && zoom !== 'custom') this.setImageView(image, zoom);
          if (!image.getAttribute('style')) image.removeAttribute('style');
        });
        return true;
      }
      if (field === 'shadow') {   // the drop shadow: in --element-shadow (css/05 shows it with a filter; the effects' rules keep it)
        const value = SHADOWS.some(([known]) => known === input.value) ? input.value : '';
        editorCanvas.change(() => targets.forEach(item => {
          if (value) item.style.setProperty('--element-shadow', value); else item.style.removeProperty('--element-shadow');   // (the CSS shows it: css/05)
          tidy(item);
        }));
        return true;
      }
      if (field === 'keepFitting') {   // Keep fitting: on now, and after every change of its text or size (finishTyping, a resize)
        const element = editorCanvas.selected;
        if (!element) return true;
        editorCanvas.change(() => {
          element.toggleAttribute('data-fit-text', input.checked);
          if (input.checked) this.refit(element);
        });
        return true;
      }
      if (field === 'textGradient') {   // a gradient through the letters: --text-gradient (css/05)
        const value = TEXT_GRADIENTS.some(([known]) => known === input.value) ? input.value : '';
        editorCanvas.change(() => targets.forEach(item => {
          if (value && value !== 'outline') item.style.setProperty('--text-gradient', value); else item.style.removeProperty('--text-gradient');
          if (value === 'outline') item.style.setProperty('--text-outline', '1'); else item.style.removeProperty('--text-outline');   // Outline: css/05
          tidy(item);
        }));
        return true;
      }
      if (field === 'opacity') {   // its own opacity: --element-opacity (css/05; the ways it appears keep it)
        const value = OPACITIES.includes(input.value) ? input.value : '';
        editorCanvas.change(() => targets.forEach(item => { if (value) item.style.setProperty('--element-opacity', value); else item.style.removeProperty('--element-opacity'); tidy(item); }));
        return true;
      }
      if (field === 'boxFill') {   // Box: a background in the theme's colours ('' as it is)
        const value = BOX_FILLS.some(([known]) => known === input.value) ? input.value : '';
        editorCanvas.change(() => targets.forEach(item => {
          item.style.backgroundColor = value === 'frosted' ? FROSTED.background : value;
          item.style.backdropFilter = value === 'frosted' ? FROSTED.blur : '';   // Frosted glass: what lies behind it blurred
          // a solid accent box: its text in the slide's background colour (readable), unless a colour of its own was chosen
          if (value === 'var(--color-accent)' && !item.style.color) item.style.color = 'var(--color-background)';
          else if (value !== 'var(--color-accent)' && item.style.color === 'var(--color-background)') item.style.removeProperty('color');
          tidy(item);
        }));
        return true;
      }
      if (field === 'rotate' && input.value === '' && targets.length > 1) return true;   // "mixed" left empty: no change
      editorCanvas.change(() => targets.forEach(item => {
        if (field === 'rotate') { editorCanvas.unlinkConnector(item); item.style.rotate = Number(input.value) ? Number(input.value) + 'deg' : ''; }
        else item.style[field] = input.value;
        tidy(item);
      }));
      return true;
    },

    /* ---- Buttons ---- */
    runAction(action, button) {
      const element = editorCanvas.selected;
      const scene = editor.selected;
      const actions = {
        'stand-out': () => {   // ★ Make it stand out: edge, tint and glow in the accent colour together (data-stand-out); again: all three off
          if (!element || editorCanvas.locked() || editorLayers.refuses([element])) return;
          const on = !element.hasAttribute('data-stand-out');
          editorCanvas.change(() => {
            element.toggleAttribute('data-stand-out', on);
            element.style.border = on ? '3px solid var(--color-accent)' : '';
            element.style.backgroundColor = on ? 'color-mix(in srgb, var(--color-accent) 14%, transparent)' : '';
            if (on) element.style.setProperty('--element-shadow', 'drop-shadow(0 0 18px color-mix(in srgb, var(--color-accent) 65%, transparent))'); else element.style.removeProperty('--element-shadow');
            if (!element.getAttribute('style')) element.removeAttribute('style');
          });
          showToast(ui(on ? 'editor.standOutOn' : 'editor.standOutOff'));
        },
        'crop-image': () => {   // ✂ Crop…: a window to choose which part of the picture shows
          const image = element && (element.matches('img') ? element : element.querySelector('img'));
          if (!image) { showToast(ui('cmd.needsImage')); return; }
          if (editorCanvas.locked()) { showToast(ui('editor.scriptedNote')); return; }
          this.openCrop(image);
        },
        'adjust-reset': () => {   // Brightness, Contrast and Colour back to as it is (the look stays)
          const image = element && (element.matches('img') ? element : element.querySelector('img'));
          if (image) editorCanvas.change(() => { setLook(image, lookParts(image).preset, [1, 1, 1]); if (!image.getAttribute('style')) image.removeAttribute('style'); });
        },
        'slide-pace': () => this.setSlidePace(button.dataset.pace),
        'slide-order': () => this.setSlideOrder(button.dataset.order),
        'check-deck': () => { this.checkOpen = true; editor.renderPanel(); }, 'check-go': () => this.checkGo(Number(button.dataset.index)),
        'select-note': () => { const target = editorCanvas.elementAtPath(button.dataset.path.split('/').filter(Boolean).map(Number)); if (target) { editorCanvas.selectElement(target); editor.panelTab = 'element'; editor.renderPanel(); } },
        'anim-earlier': () => this.moveInOrder(button.dataset.path, -1), 'anim-later': () => this.moveInOrder(button.dataset.path, 1),
        'select-path': () => {
          const target = editorCanvas.elementAtPath(button.dataset.path.split('/').filter(Boolean).map(Number));
          if (target) { editorCanvas.selectElement(target); editor.panelTab = 'animations'; editor.renderPanel(); }
        },
        'play-slide': () => this.playSlide(),
        'play-pause': () => this.togglePause(),
        'play-click': () => this.playNextClick(),
        'play-stop': () => this.stopPlaying(),
        'flip-x': () => this.flip('x'), 'flip-y': () => this.flip('y'), 'fit-text': () => this.fitText(),
        'shape-text-add': () => {   // a text in the shape, in its middle: typed on the slide like any text
          if (!element || !element.matches('.shape') || element.querySelector(':scope > .shape-text') || editorLayers.refuses([element])) return;
          editorCanvas.change(() => { const text = document.createElement('span'); text.className = 'shape-text'; text.textContent = ui('editor.shapeTextNew'); element.appendChild(text); }, { rerender: true });
        },
        'shape-text-remove': () => {
          const text = element && element.querySelector(':scope > .shape-text');
          if (text && !editorLayers.refuses([element])) editorCanvas.change(() => text.remove(), { rerender: true });
        },
        'set-icon': () => { if (element && element.matches('.icon-badge') && ICONS.includes(button.dataset.icon) && !editorLayers.refuses([element])) editorCanvas.change(() => { element.textContent = button.dataset.icon; }); },
        'fill-slide': () => this.fillArea('slide'), 'fill-left': () => this.fillArea('left'), 'fill-right': () => this.fillArea('right'), 'fill-top': () => this.fillArea('top'), 'fill-bottom': () => this.fillArea('bottom'),
        'copy-to-open': () => { this.copyToOpen = true; this.copyToKey = this.copyToKeyNow(); this.copyToTicked = new Set(); editor.renderPanel(); },
        'copy-to-cancel': () => { this.copyToOpen = false; this.copyToTicked = new Set(); editor.renderPanel(); },
        'copy-to-run': () => this.copyToSlides(),
        'layer-forward': () => this.layerStep(1), 'layer-back': () => this.layerStep(-1),
        'to-front': () => {
          if (editorLayers.refuses([element])) return;
          const box = element.getBoundingClientRect();
          const over = Array.from(editorCanvas.scene.querySelectorAll('.is-free')).some(other => other !== element && !other.contains(element) && !element.contains(other) && (parseInt(other.style.zIndex, 10) || 0) >= (parseInt(element.style.zIndex, 10) || 0) && (r => r.left < box.right && r.right > box.left && r.top < box.bottom && r.bottom > box.top)(other.getBoundingClientRect()));
          editorCanvas.change(() => { element.style.zIndex = this.highestLayer() + 1; });
          if (!over) showToast(ui('editor.frontAlready'));
        },
        'to-back': () => { if (!editorLayers.refuses([element])) editorCanvas.change(() => { element.style.zIndex = -1; }); },   // behind the slide's own content (the slide isolates its layers, css/05)
        'background-colour-off': () => editor.edit(() => { scene.style.backgroundColor = ''; if (!scene.getAttribute('style')) scene.removeAttribute('style'); }, { node: scene }),
        'background-image': () => editorCanvas.pickFile('image/*', file => editorCanvas.readFile(file, dataUrl => editor.edit(() => {
          const assets = editor.modelAssets();
          scene.setAttribute('data-asset-background', addAsset(assets, dataUrl, scene.getAttribute('data-name') + '-background'));
          writeAssetsOf(editor.model, assets);
        }, { node: scene }))),
        'background-image-off': () => editor.edit(() => {
          scene.removeAttribute('data-asset-background');
          scene.style.removeProperty('--background-dim');
          if (!scene.getAttribute('style')) scene.removeAttribute('style');
        }, { node: scene }),
        'save-template': () => this.saveAsTemplate(),
        shortcuts: () => this.showShortcuts(),
        'align-left': () => this.alignGroup('left'), 'align-centre': () => this.alignGroup('centre'), 'align-right': () => this.alignGroup('right'),
        'align-top': () => this.alignGroup('top'), 'align-middle': () => this.alignGroup('middle'), 'align-bottom': () => this.alignGroup('bottom'),
        'spread-across': () => this.spreadGroup('x'), 'spread-down': () => this.spreadGroup('y'),
        'same-width': () => this.matchSize('width'), 'same-height': () => this.matchSize('height'),
        'arrange-grid': () => this.arrangeGrid(), 'repeat-row': () => this.repeatInRow(Number(button.dataset.count)), 'repeat-column': () => this.repeatInRow(Number(button.dataset.count), 'y'), 'arrange-row': () => this.arrangeGrid('row'), 'arrange-column': () => this.arrangeGrid('column'), 'swap-places': () => this.swapPlaces(), 'connect-arrow': () => this.connectArrow(), 'follow-shape': () => editorMotion.followShape(),
        'group-delete': () => this.deleteGroup(),
        'group-clear': () => { this.group = []; this.drawGroup(); editor.renderPanel(); },
        'find-count': () => this.findAndReplace(false),
        'replace-all': () => this.findAndReplace(true),
        'stagger-forward': () => this.staggerGroup('forward'), 'stagger-reverse': () => this.staggerGroup('reverse'), 'stagger-middle': () => this.staggerGroup('middle'), 'stagger-random': () => this.staggerGroup('random'),
        'group-make': () => this.groupSelection(), 'group-break': () => this.ungroupSelection(),
        'group-appear-sequence': () => this.appearGroup('sequence'), 'group-appear-clicks': () => this.appearGroup('clicks'), 'group-appear-together': () => this.appearGroup('together'),
        'guide-add-x': () => editorCanvas.addUserGuide('x'), 'guide-add-y': () => editorCanvas.addUserGuide('y'),
        'zoom-in': () => this.setZoom(editorCanvas.zoom * 1.25), 'zoom-out': () => { if (editorCanvas.zoom <= 1) { showToast(ui('cmd.zoomedOutFully')); return; } this.setZoom(editorCanvas.zoom / 1.25); }, 'zoom-fit': () => { if (editorCanvas.zoom <= 1) showToast(ui('cmd.zoomedOutFully')); this.setZoom(1); }, 'zoom-selection': () => this.zoomToSelection(),
        'use-colour': () => {   // a colour this presentation already uses: on the text of the selection (all of a Shift+click group)
          if (!element || editorCanvas.locked() || !/^#[0-9a-f]{6}$/.test(button.dataset.colour)) return;
          const targets = this.group.length > 1 ? this.group.slice() : [element];
          if (targets.length > 1 && editorLayers.refuses(targets)) return;   // a locked one in the group (as the Colour select)
          editorCanvas.change(() => targets.forEach(item => { item.style.color = button.dataset.colour; }));
        },
        'pick-colour': () => this.pickColour(hex => {
          if (!element || element !== editorCanvas.selected || editorCanvas.locked()) return;   // the selection changed meanwhile
          editorCanvas.change(() => { element.style.color = hex; });
        }),
        'pick-background': () => this.pickColour(hex => { if (editor.selected === scene) editor.edit(() => { scene.style.backgroundColor = hex; }, { node: scene }); }),
      };
      if (actions[action]) { runSafely('editor: ' + action, actions[action]); return true; }
      return false;
    },
    /** One layer forward (+1) or back (-1) among the freely placed elements next to it (in the same box): it swaps places with
        the next one. They keep the layer numbers they had, handed out again in the new order (made different where two were
        equal), so nothing moves past elements outside that box (a group's members compete with the slide's other elements).
        It stays on its side of the slide's content: To the front / To the back cross it. */
    layerStep(direction) {
      const element = editorCanvas.selected;
      if (!element || editorCanvas.locked()) return;
      if (!editorCanvas.isFree(element)) { showToast(ui('cmd.needsFree')); return; }
      if (editorLayers.refuses([element])) return;
      const z = item => { const value = getComputedStyle(item).zIndex; return value === 'auto' ? 0 : parseInt(value, 10) || 0; }, behind = z(element) < 0;   // (a free element is 1 by its CSS)
      const siblings = Array.from(element.parentElement.children).filter(item => editorCanvas.isFree(item) && (z(item) < 0) === behind);
      const order = siblings.slice().sort((a, b) => z(a) - z(b) || siblings.indexOf(a) - siblings.indexOf(b));   // as they are stacked now
      const index = order.indexOf(element), next = index + direction;
      if (next < 0 || next >= order.length) { showToast(ui(direction > 0 ? 'editor.layerFrontAlready' : 'editor.layerBackAlready')); return; }
      const values = order.map(z);   // the numbers they have, lowest first
      [order[index], order[next]] = [order[next], order[index]];
      if (behind) { for (let i = values.length - 2; i >= 0; i--) if (values[i] >= values[i + 1]) values[i] = values[i + 1] - 1; }   // all different, staying under 0
      else { for (let i = 1; i < values.length; i++) if (values[i] <= values[i - 1]) values[i] = values[i - 1] + 1; }
      editor.nextLabel = ui(direction > 0 ? 'cmd.layerForward' : 'cmd.layerBack');
      editorCanvas.change(() => order.forEach((item, rank) => { item.style.zIndex = values[rank]; }));
      editor.nextLabel = null;
    },
    highestLayer() {
      return Array.from(editorCanvas.scene.querySelectorAll('.is-free')).reduce((highest, item) => Math.max(highest, parseInt(item.style.zIndex, 10) || 1), 1);
    },
    /** The slide becomes a layout in "+ Slide" (a copy in the SLIDE TEMPLATES block of the file). */
    saveAsTemplate() {
      const scene = editor.selected;
      const block = editor.model.getElementById('slideTemplates');
      if (!scene || !block) return;
      if (isScriptedSlide(scene)) { showToast(ui('editor.scriptedNoCopy')); return; }   // its script only knows the original
      {
        const copy = editor.model.importNode(scene, true);
        copy.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
        let name = 'template-' + scene.getAttribute('data-name');
        const taken = new Set(Array.from(block.content.querySelectorAll('section.scene')).map(template => template.getAttribute('data-name')));
        for (let n = 2; taken.has(name); n++) name = 'template-' + scene.getAttribute('data-name') + '-' + n;
        copy.setAttribute('data-name', name);
        copy.setAttribute('data-title', 'Template: ' + (scene.getAttribute('data-title') || scene.getAttribute('data-name')));
        copy.removeAttribute('data-backup');
        copy.classList.remove('is-active');
        // templates sit 2 spaces deeper in the file than slides
        const walker = editor.model.createTreeWalker(copy, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) if (walker.currentNode.nodeValue.includes('\n')) walker.currentNode.nodeValue = walker.currentNode.nodeValue.replace(/\n/g, '\n  ');
        const last = block.content.lastChild;
        if (last && last.nodeType === Node.TEXT_NODE && !last.textContent.trim()) last.remove();
        // the comment names the template by its name (letters, digits, dashes): a title could contain "-->"
        block.content.append(editor.model.createTextNode('\n\n    '), editor.model.createComment(' TEMPLATE · ' + name + ' (saved in the editor) '),
          editor.model.createTextNode('\n    '), copy, editor.model.createTextNode('\n  '));
      }
      // not an undo step (undo covers the slides): delete the template in the file if it is not wanted
      editor.changed();
      showToast(ui('editor.templateSaved'));
    },

    /* ---- Inserted blocks: text box and shapes, placed freely in the middle of the slide ---- */
    freeBlockHtml(kind, at) {
      // in the middle of the slide, or at a point (double-click, right-click "Add here"): a shape around it, a text box starting
      // there; always inside the slide
      // (in the middle, where another one already is: a little lower and to the right, so the new one is seen)
      const taken = (x, y) => !!editorCanvas.scene && Array.from(editorCanvas.scene.querySelectorAll('.is-free')).some(item => Math.round(editorCanvas.freeValue(item, '--x')) === x && Math.round(editorCanvas.freeValue(item, '--y')) === y);
      const place = (width, height, left, top) => {
        let x = Math.round(clamp(left, 0, CONFIG.stage.width - Math.min(width, CONFIG.stage.width))), y = Math.round(clamp(top, 0, CONFIG.stage.height - Math.max(height, 60)));
        for (let step = 0; !at && step < 8 && taken(x, y); step++) { x = Math.round(clamp(x + 32, 0, CONFIG.stage.width - Math.min(width, CONFIG.stage.width))); y = Math.round(clamp(y + 32, 0, CONFIG.stage.height - Math.max(height, 60))); }
        return '--x:' + x + 'px; --y:' + y + 'px; --w:' + width + 'px' + (height ? '; --h:' + height + 'px' : '');
      };
      const centred = (width, height) => at ? place(width, height, at.x - width / 2, at.y - height / 2) : place(width, height, CONFIG.stage.width / 2 - width / 2, CONFIG.stage.height / 2 - height / 2);
      if (kind === 'textbox') return '<p class="text-box is-free" style="' + (at ? place(560, 0, at.x, at.y - 24) : centred(560, 0)) + '">' + escapeHtml(ui('editor.newText')) + '</p>';
      if (kind === 'icon') return '<div class="icon-badge is-free" style="' + centred(140, 140) + '">' + ICONS[0] + '</div>';   // a symbol in a round badge (css/05)
      if (kind === 'note') return '<p class="text-box note-box is-free" style="' + centred(320, 230) + '; rotate: -2deg">' + escapeHtml(ui('editor.newNote')) + '</p>';   // a sticky note: a tilted square in the accent colour (css/05)
      if (kind === 'label') return '<p class="text-box label-box is-free" style="' + (at ? place(90, 0, at.x, at.y - 24) : centred(90, 0)).replace(/; --w:\d+px/, '') + '">' + escapeHtml(ui('editor.newLabel')) + '</p>';   // a text in a badge (css/05)
      if (!SHAPES[kind]) return '';
      const [width, height] = SHAPE_SIZES[kind] || [280, 200];
      return '<div class="shape is-free" data-shape="' + kind + '" style="' + centred(width, height) + '; color: var(--color-accent)">' +
        '<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' + SHAPES[kind] + '</svg></div>';
    },

    /* ---- Clipboard and keys (called by editor.onKeyDown when no text has the keyboard) ---- */
    copy(cut) {
      const element = editorCanvas.selected;
      if (!element) return;
      const members = this.group.length > 1 ? this.inDocumentOrder(this.group) : [element];
      // their files travel with them (Save may drop a file no slide uses any more, e.g. after a cut)
      const assets = editor.modelAssets(), files = {};
      const label = this.clipboardLabel() + ' #' + (++this.copyCount).toString(36) + Date.now().toString(36).slice(-4);   // unique per copy
      this.lastCopyLabel = label;
      this.clipboard = { html: members.map(member => this.copyHtml(member, assets, files)).join(''), files, label };
      try { sessionStorage.setItem(DECK_ID + '-editor.clipboard', JSON.stringify(this.clipboard)); }   // survives the reload after Save
      catch (e) { try { sessionStorage.removeItem(DECK_ID + '-editor.clipboard'); } catch (e2) { /* no session storage */ } }   // too large: never leave an older copy there
      const blocked = cut && editorLayers.refusesRemoval(members);   // copied, but a locked element stays (the message says why)
      const removes = cut && !blocked && !editorCanvas.locked();
      if (removes) { if (members.length > 1) this.deleteGroup(); else editorCanvas.runAction('delete'); }
      if (!blocked) showToast(ui(removes ? 'editor.cutDone' : 'editor.copyDone'));
    },
    /** What Copy writes on the system clipboard after the marker: the element's name, or "3 elements". */
    clipboardLabel() {
      return this.group.length > 1 ? ui('editor.groupLabel', { count: this.group.length }) : editorCanvas.selected ? this.labelOf(editorCanvas.selected) : '';
    },
    /** Elements in the order they are in the slide (a copied group pastes in that order). */
    inDocumentOrder(list) {
      return list.slice().sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    },
    /** A clean copy of one element for the clipboard (HTML); the files it uses are added to `files`. */
    copyHtml(element, assets, files) {
      const copy = element.cloneNode(true);
      copy.classList.remove('is-editor-selected');
      copy.querySelectorAll('[contenteditable]').forEach(node => { node.removeAttribute('contenteditable'); node.removeAttribute('spellcheck'); });
      copy.querySelectorAll('[data-editor-wrap]').forEach(wrap => wrap.replaceWith(...wrap.childNodes));
      copy.querySelectorAll('.chart-drawing').forEach(drawing => drawing.remove());
      copy.querySelectorAll('.qr-code').forEach(node => { node.innerHTML = ''; });
      copy.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
      copy.removeAttribute('id');
      editorCode.carryRules(copy);   // its rules (Code tab) go along, inside it, until it is pasted (section 20e)
      if (editorCanvas.isFree(element) && element.parentElement !== editorCanvas.scene) {
        // --x / --y count from its parent (e.g. .content); a pasted copy goes straight into the slide: count from the slide
        const origin = editorCanvas.freeOrigin(element);
        const sceneOrigin = editorCanvas.boxInStage(editorCanvas.scene);
        copy.style.setProperty('--x', Math.round(editorCanvas.freeValue(element, '--x') + origin.left - sceneOrigin.left - editorCanvas.scene.clientLeft) + 'px');
        copy.style.setProperty('--y', Math.round(editorCanvas.freeValue(element, '--y') + origin.top - sceneOrigin.top - editorCanvas.scene.clientTop) + 'px');
      }
      // src / poster come back through resolveAssets, so they are not stored twice
      [copy].concat(Array.from(copy.querySelectorAll('*'))).forEach(node => ['data-asset', 'data-asset-poster', 'data-asset-background'].forEach(name => {
        const path = node.getAttribute(name);
        if (path && hasOwn(assets, path)) files[path] = assets[path];
      }));
      const withItself = selector => (copy.matches(selector) ? [copy] : []).concat(Array.from(copy.querySelectorAll(selector)));   // an image itself, or one inside
      withItself('[data-asset]').forEach(node => node.removeAttribute('src'));
      withItself('[data-asset-poster]').forEach(node => node.removeAttribute('poster'));
      withItself('[data-asset-background]').forEach(node => {
        node.style.removeProperty('--asset-background');
        if (node.getAttribute('style') === '') node.removeAttribute('style');
      });
      return copy.outerHTML;
    },
    /** The copied element { html, files, label }: from this page, or from before the reload after Save (same tab). */
    clipboardItem() {
      if (this.clipboard) return this.clipboard;
      try { return parseJsonOr(sessionStorage.getItem(DECK_ID + '-editor.clipboard'), null); } catch (e) { return null; }
    },
    /** Free elements pasted or duplicated onto the same spot as another free element (anywhere on the slide)
        move 24 px down and right (together) until no spot is taken, so a copy is never hidden under its original. */
    moveOffOthers(blocks) {
      blocks = [].concat(blocks).filter(Boolean);
      if (!blocks.length) return;
      const others = Array.from(editorCanvas.scene.querySelectorAll('.is-free')).filter(other => blocks.every(block => other !== block && !block.contains(other) && !other.contains(block)));
      const otherBoxes = others.map(other => editorCanvas.boxInStage(other));
      const taken = () => blocks.some(block => {
        const box = editorCanvas.boxInStage(block);
        return otherBoxes.some(otherBox => Math.abs(otherBox.left - box.left) < 2 && Math.abs(otherBox.top - box.top) < 2);
      });
      for (let n = 0; n < 40 && taken(); n++) blocks.forEach(block => ['--x', '--y'].forEach(name => block.style.setProperty(name, (parseFloat(block.style.getPropertyValue(name)) || 0) + 24 + 'px')));
    },
    paste() {
      const item = this.clipboardItem();
      if (!item || !item.html) { showToast(ui('cmd.needsClipboardLong')); return; }
      if (editorCanvas.locked()) return;
      // a block in the layout goes after the selection: never into a container locked in the Layers tab
      const inLayoutAnchor = element => element && !editorCanvas.isFree(element) && element.parentElement !== editorCanvas.scene;
      const firstAnchor = this.group.length > 1 ? (this.inDocumentOrder(this.group).filter(inLayoutAnchor).pop() || null)
        : (editorCanvas.selected && editorCanvas.selected.parentElement !== editorCanvas.scene ? editorCanvas.layoutAnchorOf(editorCanvas.selected) : null);
      const probe = document.createElement('template');
      probe.innerHTML = item.html;
      if (Array.from(probe.content.children).some(block => !block.classList.contains('is-free')) && editorLayers.refusesInto(firstAnchor, false)) return;
      editorCanvas.change(() => {
        const assets = editor.modelAssets();
        const missing = Object.keys(item.files || {}).filter(path => !hasOwn(assets, path));
        if (missing.length) { missing.forEach(path => { assets[path] = item.files[path]; }); writeAssetsOf(editor.model, assets); }
        const template = document.createElement('template');
        template.innerHTML = item.html;
        // in the layout: after the selected element (each next one after the one before); placed freely: on the slide
        const inLayout = element => element && !editorCanvas.isFree(element) && element.parentElement !== editorCanvas.scene;
        let anchor = this.group.length > 1 ? (this.inDocumentOrder(this.group).filter(inLayout).pop() || null)   // after the whole group
          : (editorCanvas.selected && editorCanvas.selected.parentElement !== editorCanvas.scene ? editorCanvas.layoutAnchorOf(editorCanvas.selected) : null);   // (never inside a table)
        const blocks = Array.from(template.content.children);
        blocks.forEach(block => {
          editorLayers.unmark(block);   // a copy starts unlocked and visible
          const free = block.classList.contains('is-free');
          editorCanvas.placeBlock(block, free ? null : anchor);
          if (!free && anchor) anchor = block;
          editorCode.adoptRules(block, editorCanvas.scene);   // the rules it carried: on this slide, under a name of its own
          resolveAssets(block, editor.modelAssets());
        });
        this.moveOffOthers(blocks.filter(block => block.classList.contains('is-free')));   // never exactly on top of the original
        editorCanvas.selected = blocks[0] || null;
        this.group = blocks.length > 1 ? blocks : [];   // a pasted group stays selected together
      }, { rerender: true });
    },
    /** An image pasted from the system clipboard (e.g. a screenshot) becomes a new image block. */
    pasteImage(file) {
      if (editorCanvas.locked() || editorLayers.refusesInto(editorCanvas.selected && editorCanvas.selected.parentElement !== editorCanvas.scene ? editorCanvas.selected : null, false)) return;
      editorCanvas.readFile(file, dataUrl => editorCanvas.change(() => {
        const assets = editor.modelAssets();
        const name = addAsset(assets, dataUrl, editor.selected.getAttribute('data-name') + '-pasted');
        writeAssetsOf(editor.model, assets);
        const frame = document.createElement('div');
        frame.className = 'image-frame';
        frame.innerHTML = '<img alt="' + escapeHtml(ui('editor.newImageAlt')) + '">';
        frame.firstChild.setAttribute('data-asset', name);
        frame.firstChild.setAttribute('src', dataUrl);
        let anchor = editorCanvas.selected && editorCanvas.selected.parentElement !== editorCanvas.scene ? editorCanvas.selected : null;
        if (anchor && anchor.matches('li')) anchor = anchor.closest('ul, ol');   // a point of a list selected: the picture goes after the list, not into it
        if (anchor && anchor.parentElement === editorCanvas.scene) anchor = null;
        editorCanvas.placeBlock(frame, anchor);
        editorCanvas.selected = frame;
      }, { rerender: true }));
    },
    /** All elements Tab walks through, in the order they are in the slide. */
    selectableElements() {
      const scene = editorCanvas.scene;
      if (!scene) return [];
      const visible = element => {   // not see-through on the still slide (e.g. an item that only appears while the script runs)
        for (let node = element; node && node !== scene; node = node.parentElement) {
          const style = getComputedStyle(node);
          if (style.opacity === '0' || style.visibility === 'hidden' || style.display === 'none') return false;
        }
        return true;
      };
      return Array.from(scene.querySelectorAll('*')).filter(element =>
        !element.closest('svg, .speaker-notes, [hidden]') && !INLINE_TAGS.has(element.tagName) && !element.matches('[data-editor-wrap], .editor-overlay *, .editor-overlay') &&
        element.getBoundingClientRect().width > 0 && visible(element));
    },
    /** True when the keyboard is in a text, a field or the panel (copy, paste and Tab are theirs then). */
    keyboardIsElsewhere() {
      const active = document.activeElement;
      if (!active || active === document.body || active === editor.element) return false;
      if (active.isContentEditable || active.matches('input, textarea, select')) return true;
      return !(editor.element.querySelector('.editor-canvas').contains(active) || active.closest('.editor-slides'));
    },
    /** Copy, cut and paste of elements go through the browser's own clipboard events, so an image or text
        copied elsewhere (a screenshot, a sentence) can be pasted too: an image block or a text box. */
    setUp() {
      if (this.setUpDone) return;
      this.setUpDone = true;
      const canvas = editor.element.querySelector('.editor-canvas');
      canvas.addEventListener('pointerdown', () => { this.focusBeforePointer = document.activeElement; this.pointerDownAt = Date.now(); }, true);
      canvas.addEventListener('contextmenu', event => this.openMenu(event));
      canvas.addEventListener('wheel', event => {   // Ctrl+wheel (or a pinch on a touchpad) zooms the slide, not the page
        if (!(event.ctrlKey || event.metaKey)) return;
        event.preventDefault();
        const pixels = event.deltaY * (event.deltaMode === 1 ? 40 : event.deltaMode === 2 ? 800 : 1);   // lines or pages: in pixels
        this.setZoom(editorCanvas.zoom * clamp(Math.exp(-pixels * 0.0015), 0.8, 1.25), { x: event.clientX, y: event.clientY });   // a pinch sends many small steps
      }, { passive: false });
      editor.element.querySelector('.editor-panel-body').addEventListener('pointerover', event => editorMotion.onQuickHover(event));   // a preset under the pointer plays in a loop (section 20b)
      editor.element.querySelector('.editor-panel-body').addEventListener('pointerleave', () => editorMotion.endQuickHover());   // …until the pointer leaves
      editor.element.querySelector('.editor-panel-body').addEventListener('pointerdown', event => { if (!editorCommands.startScrub(event) && !editorMotion.onPanelPointerDown(event)) this.startTimelineDrag(event); });   // number labels (20c), the timeline (20b), the bars   // the ruler and the keyframes first (section 20b)
      editor.element.addEventListener('click', event => {
        const entry = event.target.closest('.editor-menu button[data-menu]');
        if (entry) { this.runMenu(entry.dataset.menu); return; }
        if (!event.target.closest('.editor-menu, [data-action="bar-more"]')) this.closeMenu();   // ⋯ in the selection bar opens it (section 20c)
      });
      editor.element.addEventListener('pointerdown', event => { if (!event.target.closest('.editor-menu')) this.closeMenu(); }, true);
      editor.element.querySelector('.editor-panel-body').addEventListener('scroll', () => this.closeMenu());
      const usable = () => editor.isOpen() && !this.keyboardIsElsewhere() && editor.element.querySelector('.editor-dialog').hidden && !settingsPanel.isOpen();
      ['copy', 'cut'].forEach(type => document.addEventListener(type, event => {
        if (!usable() || !editorCanvas.selected) return;
        event.preventDefault();
        if (this.playStep >= 0) this.stopPlaying();   // also a cut from a menu (no key press): never from the playing slide
        this.copy(type === 'cut');
        if (event.clipboardData) event.clipboardData.setData('text/plain', CLIPBOARD_MARK + this.lastCopyLabel);
      }));
      document.addEventListener('paste', event => {
        if (!usable() || !editorCanvas.scene) return;
        if (this.playStep >= 0) this.stopPlaying();   // a paste from a menu (no key press): never into the playing slide
        const data = event.clipboardData;
        const image = data && Array.from(data.files || []).find(file => /^image\//.test(file.type));
        const text = data ? data.getData('text/plain') : '';
        const ours = text.startsWith(CLIPBOARD_MARK);
        const item = this.clipboardItem();
        const matches = item && (!text || text.slice(CLIPBOARD_MARK.length) === item.label);   // the marker names what was copied
        if (image && !text.trim()) { event.preventDefault(); this.pasteImage(image); }   // with text too (Excel, PowerPoint): the text
        else if ((ours || !text) && matches) { event.preventDefault(); this.paste(); }
        else if (ours) { event.preventDefault(); showToast(ui('editor.copyAgain')); }   // copied in another tab or file
        else if (text.trim()) { event.preventDefault(); this.pasteText(text); }
      });
    },
    /** Text from elsewhere: rows with tabs (Excel, Google Sheets, a Word table) become a table, lines that start with a
        bullet or a number ("- ", "• ", "1. ") a list, both in the layout after the selection; anything else a new text box
        in the middle of the slide. */
    pasteText(text) {
      if (editorCanvas.locked()) return;
      const plain = String(text).replace(/\r\n?/g, '\n');
      const lines = plain.split('\n').map(line => line.replace(/[ \t]+$/, '')).filter(line => line.trim());
      const marker = /^\s*(?:[-*•▪◦–·\uF0B7]|\d{1,2}[.)])\s+/;   // (Word puts a tab after its bullet or number)
      const listed = lines.length >= 2 && lines.length <= CONFIG.editor.pasteListMax && lines.every(line => marker.test(line));
      const rows = listed ? [] : this.tabRows(plain);
      const tabbed = rows.filter(row => row.length >= 2 && row[0].trim()).length >= 2;   // (code indented with tabs: its first cells are empty)
      if (tabbed || listed) {
        // (pasted points with a point of a list selected: they join that list, after the point; insertAnchor gives the list itself)
        const point = editorCanvas.layoutAnchorOf(editorCanvas.selected);
        let anchor = listed && point && point.matches('li') && point.parentElement && point.parentElement.matches('ul, ol') && !point.parentElement.closest('.is-free') ? point : editorCanvas.insertAnchor();
        const hostList = anchor && anchor.matches('li') && anchor.parentElement.matches('ul, ol') ? anchor.parentElement : null;
        if (hostList && !listed) anchor = hostList;   // a table goes after the list, not into it
        if (editorLayers.refusesInto(anchor, false)) return;   // a locked container: nothing is added
        editorCanvas.change(() => {
          const order = editorCanvas.nextOrder();
          const template = document.createElement('template');
          const pointsOf = () => lines.map((line, n) => '<li class="reveal" style="--order:' + (order + n) + '">' + escapeHtml(line.replace(marker, '').trim().slice(0, 500)) + '</li>').join('');
          if (listed && hostList) {   // a list item is selected: the points join that list, after it
            template.innerHTML = pointsOf();
            let after = anchor;
            Array.from(template.content.children).forEach(item => { after.after(item); after = item; });
            editorCanvas.selected = after;
          } else {
            if (tabbed) {   // the first row: the headings
              const kept = rows.slice(0, CONFIG.editor.pasteTableRows + 1).map(row => row.slice(0, CONFIG.editor.pasteTableColumns).map(cell => cell.trim()));
              const width = Math.max(...kept.map(row => row.length));
              const cells = (row, tag) => Array.from({ length: width }, (unused, index) => '<' + tag + '>' + escapeHtml(row[index] || '').replace(/\n/g, '<br>') + '</' + tag + '>').join('');
              template.innerHTML = '<table class="data-table reveal" style="--order:' + order + '"><thead><tr>' + cells(kept[0], 'th') + '</tr></thead><tbody>' +
                kept.slice(1).map(row => '<tr>' + cells(row, 'td') + '</tr>').join('') + '</tbody></table>';
            } else template.innerHTML = '<ul class="big-list">' + pointsOf() + '</ul>';   // one point per line, without its bullet (the list draws its own)
            const block = template.content.firstElementChild;
            editorCanvas.placeBlock(block, anchor);
            editorCanvas.selected = block;
          }
          this.group = [];
        }, { rerender: true });
        showToast(ui(listed ? 'editor.pastedList' : 'editor.pastedTable'));
        return;
      }
      editorCanvas.change(() => {
        const template = document.createElement('template');
        template.innerHTML = this.freeBlockHtml('textbox');
        const box = template.content.firstElementChild;
        box.textContent = text.replace(/\s+/g, ' ').trim().slice(0, 2000);
        editorCanvas.placeBlock(box, null);
        this.moveOffOthers(box);
        editorCanvas.selected = box;
      }, { rerender: true });
    },
    /** Tab-separated rows as a spreadsheet puts them on the clipboard: a cell in "quotes" may hold tabs and line breaks
        ("" is one quote); empty rows at the end are left out. */
    tabRows(text) {
      const rows = [];
      let row = [], cell = '', quoted = false, index = 0;
      while (index < text.length) {
        const character = text[index];
        if (quoted) {
          if (character === '"' && text[index + 1] === '"') { cell += '"'; index += 2; continue; }
          if (character === '"') { quoted = false; index++; continue; }
          cell += character; index++; continue;
        }
        if (character === '"' && cell === '') { quoted = true; index++; continue; }
        if (character === '\t') { row.push(cell); cell = ''; index++; continue; }
        if (character === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; index++; continue; }
        cell += character; index++;
      }
      if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
      while (rows.length && rows[rows.length - 1].every(value => !value.trim())) rows.pop();
      return rows;
    },
    /** Keys of the editor that work on elements (no text or field has the keyboard); true when used. */
    onKey(event) {
      const withModifier = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      const element = editorCanvas.selected;
      if (withModifier && key === 'd' && element) { event.preventDefault(); editorCanvas.runAction('duplicate'); return true; }
      if (withModifier && key === 'a' && !event.altKey && !event.shiftKey) { event.preventDefault(); this.selectAll(); return true; }   // every element placed freely on the slide
      if (withModifier && !event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown') && element) { event.preventDefault(); editorCanvas.runAction(event.key === 'ArrowUp' ? 'up' : 'down'); return true; }
      if (event.altKey && !withModifier && event.key === 'ArrowUp' && element) { event.preventDefault(); editorCanvas.runAction('parent'); return true; }
      if (event.key === 'Tab' && !withModifier && !event.altKey && !this.keyboardIsElsewhere()) {
        const list = this.selectableElements();
        if (!list.length) return false;
        event.preventDefault();
        const index = list.indexOf(element);
        const next = index < 0 ? list[event.shiftKey ? list.length - 1 : 0] : list[(index + (event.shiftKey ? -1 : 1) + list.length) % list.length];
        editorCanvas.selectElement(next);
        return true;
      }
      if (event.key === '?' && !withModifier) { event.preventDefault(); this.showShortcuts(); return true; }
      if (event.code === 'Digit2' && event.shiftKey && !withModifier && !event.altKey) { event.preventDefault(); this.zoomToSelection(); return true; }   // Shift+2
      if (event.code === 'Digit1' && event.shiftKey && !withModifier && !event.altKey) { event.preventDefault(); this.setZoom(1); return true; }   // Shift+1: the whole slide
      return false;
    },
    /** Ctrl+plus / minus / 0 zoom the slide, not the whole page (also while a text or field has the keyboard). */
    onZoomKey(event) {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || !['=', '+', '-', '_', '0'].includes(event.key)) return false;
      // German, Spanish, Italian keyboards: the key right of P types "+"; with a free element selected (and no text typed in) it is One layer forward
      const typing = document.activeElement && (document.activeElement.isContentEditable || document.activeElement.matches('input, textarea, select'));
      if (event.code === 'BracketRight' && !typing && editorCanvas.selected && editorCanvas.isFree(editorCanvas.selected)) return false;
      event.preventDefault();
      this.setZoom(event.key === '0' ? 1 : editorCanvas.zoom * (event.key === '-' || event.key === '_' ? 1 / 1.25 : 1.25));
      return true;
    },
    /** Help › Keyboard shortcuts (or ?): the keys in groups, everyday ones first, a field that finds a key by its words,
        and the keys while presenting at the end. */
    showShortcuts() {
      const groups = [
        ['editor.keysEveryday', ['ctrlS', 'ctrlShiftS', 'ctrlZ', 'ctrlY', 'ctrlC', 'ctrlX', 'ctrlV', 'ctrlD', 'delete', 'enter', 'f2', 'escape', 'ctrlK', 'ctrlF', 'f7', 'question']],
        ['editor.keysText', ['ctrlShiftSize', 'ctrlShiftAlign']],
        ['editor.keysArrange', ['tab', 'altUp', 'shiftClick', 'arrows', 'ctrlUpDown', 'altDrag', 'ctrlDrag', 'shiftCorner', 'ctrlResize', 'shiftRotate', 'altTurn', 'altHover', 'ctrlAltCV', 'frontBack', 'ctrlG', 'rightClick', 'doubleClick']],
        ['editor.keysSlides', ['pages', 'ctrlM', 'ctrlShiftD', 'overview', 'zoom', 'zoomSelection', 'space', 'grid', 'f5']],
        ['editor.keysKeyboard', ['f6', 'f10', 'shiftF10']],
      ];
      const dialog = editor.openDialog(ui('editor.shortcutsTitle'), { done: true });
      const grid = dialog.querySelector('.editor-template-grid');
      grid.innerHTML = '<input type="search" class="editor-shortcuts-find" data-ui-placeholder="editor.keysFind" aria-label="' + escapeHtml(ui('editor.keysFind')) + '">' +
        groups.map(([title, names]) => '<section class="editor-shortcuts-group"><h4 class="editor-shortcuts-head">' + escapeHtml(ui(title)) + '</h4><dl class="editor-shortcuts">' +
          names.map(name => '<dt>' + escapeHtml(ui('editor.key_' + name)) + '</dt><dd>' + escapeHtml(ui('editor.key_' + name + 'Text')) + '</dd>').join('') + '</dl></section>').join('') +
        // and the keys while presenting (the Keys drawer's list, section 11): the pen, the spotlight, a black screen…
        '<section class="editor-shortcuts-group"><h4 class="editor-shortcuts-head">' + escapeHtml(ui('editor.shortcutsPresenting')) + '</h4><div class="editor-shortcuts-present keys-drawer-list">' + keyListHtml() + '</div></section>';
      applyInterfaceTexts(grid);
      const find = grid.querySelector('.editor-shortcuts-find');
      find.addEventListener('input', () => {   // a word ("copy", "slide", "pen"): only the keys that say it
        const words = find.value.trim().toLowerCase();
        grid.querySelectorAll('.editor-shortcuts-group').forEach(group => {
          let any = false;
          group.querySelectorAll('dt').forEach(term => { const show = !words || (term.textContent + ' ' + term.nextElementSibling.textContent).toLowerCase().includes(words); term.hidden = term.nextElementSibling.hidden = !show; any = any || show; });
          group.querySelectorAll('.editor-shortcuts-present > div').forEach(row => { const show = !words || row.textContent.toLowerCase().includes(words); row.hidden = !show; any = any || show; });
          group.hidden = !any;
        });
      });
    },

    /* ---- Several elements (Shift+click): align, spread, move and delete together ---- */
    /** Adds or removes an element; the selected element is the first one. True when the click was used. */
    toggleGroup(element) {
      if (!element) return false;
      if (!this.group.length && editorCanvas.selected && editorCanvas.selected !== element) this.group.push(editorCanvas.selected);
      const index = this.group.indexOf(element);
      if (index >= 0) this.group.splice(index, 1); else this.group.push(element);
      this.group = this.group.filter(item => editorCanvas.scene && editorCanvas.scene.contains(item) && !this.group.some(other => other !== item && other.contains(item)));
      if (this.group.length < 2) {   // one left: an ordinary selection
        const only = this.group[0] || null;
        this.group = [];
        editorCanvas.selectElement(only);
      } else {
        if (!this.group.includes(editorCanvas.selected)) editorCanvas.selectElement(this.group[0]);
        // the keyboard leaves the text it was in, so Delete and the arrows work on the group
        const active = document.activeElement;
        if (active && active.isContentEditable && editorCanvas.scene.contains(active)) { editorCanvas.finishTyping(); active.blur(); window.getSelection().removeAllRanges(); }
        editor.panelTab = 'element';
        editor.renderPanel();
      }
      this.drawGroup();
      return true;
    },
    /** Select all: every element placed freely on the slide (a group counts as one; locked and hidden ones are left out).
        like: only those of its kind (the same shape, or the same sort of element). */
    selectAll(like) {
      const scene = editorCanvas.scene;
      if (!scene || editorCanvas.locked()) return;
      const kindOf = item => (item.matches('.shape') ? 'shape:' + item.getAttribute('data-shape') : item.hasAttribute('data-group') ? 'group' : item.matches('.label-box') ? 'label' : item.matches('.note-box') ? 'note' : item.tagName + '.' + (item.classList[0] || ''));
      let items = Array.from(scene.querySelectorAll('.is-free')).filter(item => !item.parentElement.closest('.is-free') && !editorLayers.isLocked(item) && !item.closest('[data-editor-hidden]') && item.getClientRects().length);
      if (like && like.parentElement.closest('.is-free')) { showToast(ui('editor.selectLikeInGroup')); return; }   // (inside a group: the group is what is selected with the others)
      if (like) items = items.filter(item => kindOf(item) === kindOf(like));
      if (!items.length) { showToast(ui('editor.selectAllNone')); return; }
      editorCanvas.finishTyping();
      if (items.length === 1) { this.group = []; editorCanvas.selectElement(items[0]); if (like) showToast(ui('editor.selectLikeOnly')); return; }
      this.group = items;
      editorCanvas.selectElement(like && items.includes(like) ? like : items[0]);
      const active = document.activeElement;   // the keyboard leaves a text it was in: Delete and the arrows work on all of them
      if (active && active.isContentEditable && scene.contains(active)) active.blur();
      editor.panelTab = 'element';
      editor.renderPanel();
      this.drawGroup();
      showToast(ui('editor.selectAllDone', { count: items.length }));
    },
    /** The box drawn on the slide (slide px): the outermost elements that lie wholly inside it are selected (a card,
        not its texts; a group, not its members; locked and hidden ones are left out). add: on top of the selection. */
    selectInBox(box, add) {
      const scene = editorCanvas.scene;
      if (!scene || editorCanvas.locked()) return;
      const inside = item => { const b = editorCanvas.boxInStage(item); return b.width > 0 && b.left >= box.left - 1 && b.top >= box.top - 1 && b.left + b.width <= box.left + box.width + 1 && b.top + b.height <= box.top + box.height + 1; };
      const found = editorLayers.layerElements().filter(item => !item.matches('.content, .slide-footer, .logo, [data-editor-wrap]') && !item.closest('[data-editor-hidden]') &&
        !editorLayers.isLocked(item) && !(item.parentElement && item.parentElement.closest('[data-group]')) && inside(item));
      let items = found.filter(item => !found.some(other => other !== item && other.contains(item)));
      if (add) items = Array.from(new Set((this.group.length ? this.group : editorCanvas.selected && editorCanvas.selected !== scene.querySelector('.content') ? [editorCanvas.selected] : []).concat(items)));
      items = items.filter(item => scene.contains(item) && !items.some(other => other !== item && other.contains(item)));
      if (!items.length) return;
      editorCanvas.finishTyping();
      if (items.length === 1) { this.group = []; editorCanvas.selectElement(items[0]); return; }
      this.group = items;
      editorCanvas.selectElement(items[0]);
      const active = document.activeElement;
      if (active && active.isContentEditable && scene.contains(active)) active.blur();
      editor.panelTab = 'element';
      editor.renderPanel();
      this.drawGroup();
      showToast(ui('editor.selectAllDone', { count: items.length }));
    },
    /** A dashed outline around every element of the group (drawn with the selection). */
    drawGroup() {
      const overlay = editorCanvas.stageElement && editorCanvas.stageElement.querySelector('.editor-overlay');
      if (!overlay) return;
      overlay.querySelectorAll('.editor-group-box').forEach(box => box.remove());
      this.group = this.group.filter(item => editorCanvas.scene && editorCanvas.scene.contains(item));
      if (this.group.length < 2) { editorCommands.placeBar(); return; }
      this.group.forEach(item => {
        const box = editorCanvas.boxInStage(item);
        const outline = document.createElement('div');
        outline.className = 'editor-group-box';
        Object.assign(outline.style, { left: box.left + 'px', top: box.top + 'px', width: box.width + 'px', height: box.height + 'px' });
        overlay.appendChild(outline);
      });
      editorCommands.placeBar();   // several selected: no selection bar (section 20c)
    },
    groupSectionHtml(disabled) {
      if (this.group.length < 2) return '';
      const button = (action, label) => '<button data-action="' + action + '"' + disabled + ' data-ui="' + label + '"></button>';
      const free = this.group.filter(item => editorCanvas.isFree(item)).length;
      return '<h4>' + escapeHtml(ui('editor.groupTitle', { count: this.group.length })) + '</h4>' +
        (free < this.group.length ? '<p class="editor-note">' + escapeHtml(ui('editor.groupNeedsFree', { count: this.group.length - free })) + '</p>' : '') +
        '<div class="editor-buttons">' + button('align-left', 'editor.alignLefts') + button('align-centre', 'editor.alignCentres') + button('align-right', 'editor.alignRights') + '</div>' +
        '<div class="editor-buttons">' + button('align-top', 'editor.alignTops') + button('align-middle', 'editor.alignMiddles') + button('align-bottom', 'editor.alignBottoms') + '</div>' +
        '<div class="editor-buttons">' + button('same-width', 'editor.matchWidth') + button('same-height', 'editor.matchHeight') + '</div>' +
        '<div class="editor-buttons editor-stagger">' + button('arrange-row', 'editor.arrangeRow') + button('arrange-column', 'editor.arrangeColumn') +
        '<input type="number" min="0" max="400" step="4" data-tool-field="arrangeGap" value="' + (this.arrangeGap ?? CONFIG.editor.gridGapPx) + '" title="' + escapeHtml(ui('editor.arrangeGapTooltip')) + '" aria-label="' + escapeHtml(ui('editor.arrangeGapTooltip')) + '"></div>' +
        '<div class="editor-buttons">' + button('arrange-grid', 'editor.arrangeGrid') + (this.group.length === 2 ? button('swap-places', 'editor.swapPlaces') + button('connect-arrow', 'editor.connectArrow') : '') + '</div>' +
        (this.group.length === 2 && this.group.some(item => item.matches('.shape')) ? '<div class="editor-buttons">' + button('follow-shape', 'editor.followShape') + '</div>' : '') +
        '<div class="editor-buttons">' + button('spread-across', 'editor.spreadAcross') + button('spread-down', 'editor.spreadDown') + button('group-delete', 'editor.groupDelete') +
        '<button data-action="group-clear" data-ui="editor.groupClear"></button></div>' +
        '<p class="editor-note" data-ui="editor.groupAppearNote"></p>' +
        '<div class="editor-buttons">' + button('group-appear-sequence', 'editor.groupAppearSequence') + button('group-appear-clicks', 'editor.groupAppearClicks') + button('group-appear-together', 'editor.groupAppearTogether') + '</div>' +
        '<p class="editor-note" data-ui="editor.staggerNote"></p><div class="editor-buttons editor-stagger">' +
        '<input type="number" min="0" max="5000" step="10" data-tool-field="staggerStep" value="' + (this.staggerStep ?? CONFIG.editor.staggerMs) + '" title="' + escapeHtml(ui('editor.staggerStepTooltip')) + '" aria-label="' + escapeHtml(ui('editor.staggerStepTooltip')) + '">' +
        button('stagger-forward', 'editor.staggerForward') + button('stagger-reverse', 'editor.staggerReverse') + button('stagger-middle', 'editor.staggerMiddle') + button('stagger-random', 'editor.staggerRandom') + '</div>' +
        '<div class="editor-buttons">' + button('group-make', 'editor.groupMake') + '</div>';
    },
    /** The freely placed elements of the group with their boxes (stage pixels). */
    freeMembers() {
      return this.group.filter(item => editorCanvas.isFree(item) && !editorLayers.isLocked(item)).map(item => ({ item, box: editorCanvas.boxInStage(item) }));   // a locked one stays
    },
    /** Moves a free element by dx / dy stage pixels (its --x / --y count from its parent: the same scale). */
    shift(item, dx, dy) {
      item.style.setProperty('--x', Math.round(editorCanvas.freeValue(item, '--x') + dx) + 'px');
      item.style.setProperty('--y', Math.round(editorCanvas.freeValue(item, '--y') + dy) + 'px');
    },
    alignGroup(edge) {
      if (editorCanvas.locked()) { showToast(ui('editor.scriptedNote')); return; }
      if (this.group.length < 2) { this.alignOnSlide(edge); return; }
      if (this.refusesInTurnedGroup()) return;
      const members = this.freeMembers();
      if (members.length < 2) { showToast(ui('editor.groupNeedsFree', { count: this.group.length - members.length })); return; }
      const left = Math.min(...members.map(m => m.box.left)), right = Math.max(...members.map(m => m.box.left + m.box.width));
      const top = Math.min(...members.map(m => m.box.top)), bottom = Math.max(...members.map(m => m.box.top + m.box.height));
      editorCanvas.change(() => members.forEach(({ item, box }) => {
        const dx = { left: left - box.left, centre: (left + right) / 2 - (box.left + box.width / 2), right: right - (box.left + box.width) }[edge] || 0;
        const dy = { top: top - box.top, middle: (top + bottom) / 2 - (box.top + box.height / 2), bottom: bottom - (box.top + box.height) }[edge] || 0;
        this.shift(item, dx, dy);
      }));
    },
    /** One element placed freely: lined up on the slide (left, right, top, bottom: at the slide's margin; centre, middle: its middle). */
    alignOnSlide(edge) {
      const item = editorCanvas.selected;
      if (!item || !editorCanvas.isFree(item)) { showToast(ui('editor.alignNeedsFree')); return; }
      if (editorLayers.refuses([item])) return;
      for (let parent = item.parentElement; parent && parent !== editorCanvas.scene; parent = parent.parentElement) if (parseFloat(parent.style.rotate)) { showToast(ui('editor.alignTurnedGroup')); return; }   // (its places count in the turned group's frame)
      const box = editorCanvas.boxInStage(item), pad = getComputedStyle(editorCanvas.scene);
      const width = CONFIG.stage.width, height = CONFIG.stage.height;
      const dx = { left: parseFloat(pad.paddingLeft) - box.left, centre: width / 2 - (box.left + box.width / 2), right: width - parseFloat(pad.paddingRight) - (box.left + box.width) }[edge] || 0;
      const dy = { top: parseFloat(pad.paddingTop) - box.top, middle: height / 2 - (box.top + box.height / 2), bottom: height - parseFloat(pad.paddingBottom) - (box.top + box.height) }[edge] || 0;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
      editorCanvas.change(() => this.shift(item, dx, dy));
    },
    /** Fill: the element's whole box (border included) over the whole slide or one half of it, edge to edge (a picture is
        cropped to it: its frame covers). Its turn stays; inside a turned group it is refused, as Align on the slide. */
    fillArea(area) {
      const item = editorCanvas.selected;
      if (!item || !editorCanvas.isFree(item)) { showToast(ui('editor.alignNeedsFree')); return; }
      if (item.hasAttribute('data-group')) { showToast(ui('editor.fillNoGroup')); return; }   // (its elements would not follow its box)
      if (editorLayers.refuses([item])) return;
      for (let parent = item.parentElement; parent && parent !== editorCanvas.scene; parent = parent.parentElement) if (parseFloat(parent.style.rotate)) { showToast(ui('editor.alignTurnedGroup')); return; }
      const W = CONFIG.stage.width, H = CONFIG.stage.height;
      const target = { slide: [0, 0, W, H], left: [0, 0, W / 2, H], right: [W / 2, 0, W / 2, H], top: [0, 0, W, H / 2], bottom: [0, H / 2, W, H / 2] }[area];
      if (!target) return;
      const [left, top, width, height] = target;
      editorCanvas.change(() => {
        const rotation = item.style.rotate;
        item.style.rotate = '';   // its own box, not the box around its turned shape
        if (getComputedStyle(item).maxWidth !== 'none') item.style.maxWidth = 'none';   // (a text that keeps its lines short would stop before the edge)
        const media = item.matches('img, video') ? item : item.querySelector(':scope > img, :scope > video');
        if (media && !media.style.objectFit && !(media.matches('img') && this.imageZoomOf(media))) media.style.objectFit = 'cover';   // a picture is cropped to the area, not squashed
        const style = getComputedStyle(item);
        const extraW = item.offsetWidth - (parseFloat(style.width) || item.offsetWidth), extraH = item.offsetHeight - (parseFloat(style.height) || item.offsetHeight);   // padding and border
        item.style.setProperty('--w', Math.round(width - extraW) + 'px');
        item.style.setProperty('--h', Math.round(height - extraH) + 'px');
        const origin = editorCanvas.freeOrigin(item);
        item.style.setProperty('--x', Math.round(left - origin.left) + 'px');
        item.style.setProperty('--y', Math.round(top - origin.top) + 'px');
        const box = editorCanvas.boxInStage(item);   // put right once (a parent with a border or padding)
        if (Math.abs(box.left - left) >= .5) item.style.setProperty('--x', Math.round(editorCanvas.freeValue(item, '--x') + left - box.left) + 'px');
        if (Math.abs(box.top - top) >= .5) item.style.setProperty('--y', Math.round(editorCanvas.freeValue(item, '--y') + top - box.top) + 'px');
        this.refit(item);   // (Keep fitting: its text fills the area)
        item.style.rotate = rotation;
      });
    },
    /** Same width / Same height: the others get the whole size (border included) of the element selected first, each around its
        own middle. A picture keeps its proportions (both sides scale); a group (its elements would not follow) is left out; a
        height only goes to what has a height of its own (shapes, images, videos: a text's height follows its words). */
    matchSize(side) {
      const first = editorCanvas.selected;
      if (editorCanvas.locked() || !first || this.group.length < 2) return;
      const keepsRatio = item => item.matches('img, video, .image-frame, .video-frame, [data-keep-ratio]') || !!item.querySelector(':scope > img, :scope > video');
      const hasHeight = item => !!item.style.getPropertyValue('--h') || item.matches('.shape') || keepsRatio(item);
      const targets = this.freeMembers().map(member => member.item).filter(item => item !== first && !item.hasAttribute('data-group') && (side === 'width' || hasHeight(item)));
      if (!targets.length) { showToast(ui('editor.sameSizeNone')); return; }
      const wanted = side === 'width' ? first.offsetWidth : first.offsetHeight;
      editorCanvas.change(() => targets.forEach(item => {
        const style = getComputedStyle(item), outerW = item.offsetWidth, outerH = item.offsetHeight;
        const extraW = outerW - parseFloat(style.width), extraH = outerH - parseFloat(style.height);   // padding and border (--w / --h are the inside)
        let newW = outerW, newH = outerH;
        if (keepsRatio(item)) {   // both sides of the picture by the same factor (its border stays: a polaroid's wide edge too)
          const factor = Math.max(1, wanted - (side === 'width' ? extraW : extraH)) / Math.max(1, side === 'width' ? outerW - extraW : outerH - extraH);
          newW = (outerW - extraW) * factor + extraW; newH = (outerH - extraH) * factor + extraH;
          item.style.setProperty('--w', Math.max(1, Math.round(newW - extraW)) + 'px');
          if (item.style.getPropertyValue('--h')) item.style.setProperty('--h', Math.max(1, Math.round(newH - extraH)) + 'px');
          newW = item.offsetWidth; newH = item.offsetHeight;   // (as it is now laid out: around its middle exactly)
        } else if (side === 'width') { newW = wanted; item.style.setProperty('--w', Math.max(1, Math.round(newW - extraW)) + 'px'); }
        else { newH = wanted; item.style.setProperty('--h', Math.max(1, Math.round(newH - extraH)) + 'px'); }
        this.shift(item, (outerW - newW) / 2, (outerH - newH) / 2);   // around its middle
        this.refit(item);   // (Keep fitting: its text fills the new size)
      }));
    },
    /** Arrange in a grid: in reading order, in rows and columns (about square), each cell as big as the largest element,
        evenly apart (CONFIG.editor.gridGapPx), from the top left of the selection; each sits in the middle of its cell. */
    /** Repeat in a row: one freely placed element and copies of it, `count` in all, side by side (the gap of In a row),
        all of them selected afterwards (to move, stagger or style together). Refused when the row would leave the slide. */
    repeatInRow(count, axis = 'x') {   // axis 'y': one under the other (Repeat in a column)
      const element = editorCanvas.selected;
      if (!element || !editorCanvas.isFree(element) || editorCanvas.locked() || !(count >= 2) || editorLayers.refuses([element])) return;
      for (let parent = element.parentElement; parent && parent !== editorCanvas.scene; parent = parent.parentElement) if (parseFloat(parent.style.rotate)) { showToast(ui('editor.alignTurnedGroup')); return; }   // (its places count in that turned frame)
      const box = editorCanvas.boxInStage(element), gap = clamp(Number(this.arrangeGap ?? CONFIG.editor.gridGapPx), 0, 400);
      const across = axis !== 'y';
      if (across ? box.left + count * box.width + (count - 1) * gap > CONFIG.stage.width + 1 : box.top + count * box.height + (count - 1) * gap > CONFIG.stage.height + 1) { showToast(ui(across ? 'editor.repeatTooWide' : 'editor.repeatTooTall', { count })); return; }
      editor.nextLabel = ui('editor.repeatHistory', { count });
      editorCanvas.change(() => {
        const copies = [];
        let after = element;
        for (let index = 1; index < count; index++) {
          const copy = element.cloneNode(true);
          copy.classList.remove('is-editor-selected');
          copy.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
          copy.removeAttribute('id');
          editorLayers.unmark(copy);
          [copy, ...copy.querySelectorAll('[data-morph]')].forEach(node => node.removeAttribute('data-morph'));   // (one glide name per slide)
          editorCanvas.placeBlock(copy, after);
          if (across) this.shift(copy, index * (box.width + gap), 0); else this.shift(copy, 0, index * (box.height + gap));
          copies.push(copy);
          after = copy;
        }
        editorCanvas.selected = element;
        this.group = [element].concat(copies);
      }, { rerender: true });
      editor.nextLabel = null;
    },
    /** layout 'grid' (rows and columns), 'row' (side by side, each its own width) or 'column' (one under the other): this.arrangeGap apart. */
    arrangeGrid(layout = 'grid') {
      if (editorCanvas.locked() || this.refusesInTurnedGroup()) return;
      const members = this.readingOrder(this.freeMembers().map(member => member.item)).map(item => ({ item, box: editorCanvas.boxInStage(item) }));
      const lockedCount = this.group.filter(item => editorLayers.isLocked(item)).length;
      if (members.length < 2) { showToast(lockedCount ? ui('editor.lockedLeftOut', { count: lockedCount }) : ui('editor.groupNeedsFree', { count: this.group.length - members.length })); return; }
      const gap = clamp(Number(this.arrangeGap ?? CONFIG.editor.gridGapPx), 0, 400);
      if (layout === 'row' || layout === 'column') {   // in reading order, from the first one's place; lined up on their middles
        const across = layout === 'row', W = CONFIG.stage.width, H = CONFIG.stage.height;
        const along = m => (across ? m.box.width : m.box.height), side = m => (across ? m.box.height : m.box.width);
        const total = members.reduce((sum, m) => sum + along(m), 0) + gap * (members.length - 1), widest = Math.max(...members.map(side));
        if (total > (across ? W : H)) { showToast(ui('editor.gridTooBig')); return; }
        let position = clamp(Math.min(...members.map(m => (across ? m.box.left : m.box.top))), 0, (across ? W : H) - total);
        const middle = clamp(Math.min(...members.map(m => (across ? m.box.top : m.box.left))) + widest / 2, widest / 2, (across ? H : W) - widest / 2);
        editorCanvas.change(() => members.forEach(m => {
          const x = across ? position : middle - m.box.width / 2, y = across ? middle - m.box.height / 2 : position;
          this.shift(m.item, x - m.box.left, y - m.box.top);
          position += along(m) + gap;
        }));
        if (lockedCount) showToast(ui('editor.lockedLeftOut', { count: lockedCount }));
        return;
      }
      const columns = Math.ceil(Math.sqrt(members.length)), rows = Math.ceil(members.length / columns);
      const cellWidth = Math.max(...members.map(m => m.box.width)), cellHeight = Math.max(...members.map(m => m.box.height));
      const gridWidth = columns * cellWidth + (columns - 1) * gap, gridHeight = rows * cellHeight + (rows - 1) * gap;
      if (gridWidth > CONFIG.stage.width || gridHeight > CONFIG.stage.height) { showToast(ui('editor.gridTooBig')); return; }
      // from the selection's top left, pulled back so the whole grid stays on the slide
      const left = clamp(Math.min(...members.map(m => m.box.left)), 0, CONFIG.stage.width - gridWidth), top = clamp(Math.min(...members.map(m => m.box.top)), 0, CONFIG.stage.height - gridHeight);
      editorCanvas.change(() => members.forEach(({ item, box }, index) => {
        const column = index % columns, row = Math.floor(index / columns);
        const x = left + column * (cellWidth + gap) + (cellWidth - box.width) / 2, y = top + row * (cellHeight + gap) + (cellHeight - box.height) / 2;
        this.shift(item, x - box.left, y - box.top);
      }));
      if (lockedCount) showToast(ui('editor.lockedLeftOut', { count: lockedCount }));
    },
    /** Places count in their parent's frame: in a turned group a move on the slide would go elsewhere. True (and a message) then. */
    refusesInTurnedGroup() {
      const turned = this.group.some(item => { for (let parent = item.parentElement; parent && parent !== editorCanvas.scene; parent = parent.parentElement) if (parseFloat(parent.style.rotate)) return true; return false; });
      if (turned) showToast(ui('editor.alignTurnedGroup'));
      return turned;
    },
    /** Swap places: two selected elements trade places (each keeps its own size; their middles swap). */
    /** → Connect with an arrow (two selected): a new arrow shape from the edge of the one selected first to the edge of the
        other, a little apart from both, turned to point at it. It stays connected: when either moves or changes size, it
        follows (updateConnectors; data-connect="a1 a2" on the arrow, data-anchor on the two). Dragging the arrow itself, or
        Follows the two elements off, makes it an ordinary arrow. */
    connectArrow() {
      if (editorCanvas.locked() || this.group.length !== 2) return;
      const first = editorCanvas.selected && this.group.includes(editorCanvas.selected) ? editorCanvas.selected : this.group[0];
      const second = this.group.find(item => item !== first);
      const geometry = this.connectorGeometry(first, second);
      if (!geometry) { showToast(ui('editor.connectTooClose')); return; }
      editor.nextLabel = ui('editor.connectArrow');
      editorCanvas.change(() => {
        const template = document.createElement('template');
        template.innerHTML = this.freeBlockHtml('arrow');
        const arrow = template.content.firstElementChild;
        editorCanvas.placeBlock(arrow, null);
        const anchorOf = item => {   // a name of its own on the slide (kept in the file)
          if (!item.getAttribute('data-anchor')) {   // higher than any name in the file or on the canvas, also those arrows still point to (never reused)
            const names = [editor.model, editorCanvas.scene].flatMap(root => Array.from(root.querySelectorAll('[data-anchor], [data-connect]')))
              .flatMap(node => [node.getAttribute('data-anchor'), ...String(node.getAttribute('data-connect') || '').split(/\s+/)]);
            const used = names.map(name => parseInt(String(name || '').slice(1), 10) || 0);
            item.setAttribute('data-anchor', 'a' + (Math.max(0, ...used) + 1));
          }
          return item.getAttribute('data-anchor');
        };
        arrow.setAttribute('data-connect', anchorOf(first) + ' ' + anchorOf(second));
        this.applyConnector(arrow, geometry);
        editorCanvas.selected = arrow;
        this.group = [];
      }, { rerender: true });
      editor.nextLabel = null;
    },
    /** Where the arrow from `first` to `second` goes: from edge to edge (a turned element: its own turned edge), or null when too close. */
    connectorGeometry(first, second) {
      const upright = item => { const turn = item.style.rotate; item.style.rotate = ''; const box = editorCanvas.boxInStage(item); item.style.rotate = turn; return Object.assign(box, { turn: (parseFloat(turn) || 0) * Math.PI / 180 }); };
      const boxA = upright(first), boxB = upright(second);
      const a = { x: boxA.left + boxA.width / 2, y: boxA.top + boxA.height / 2 }, b = { x: boxB.left + boxB.width / 2, y: boxB.top + boxB.height / 2 };
      const distance = Math.hypot(b.x - a.x, b.y - a.y);
      if (distance < 1) return null;
      const ux = (b.x - a.x) / distance, uy = (b.y - a.y) / distance;
      const reach = box => {   // from its middle to its edge, that way (in the element's own, turned directions)
        const lx = ux * Math.cos(box.turn) + uy * Math.sin(box.turn), ly = -ux * Math.sin(box.turn) + uy * Math.cos(box.turn);
        return Math.min(Math.abs(lx) > 1e-9 ? box.width / 2 / Math.abs(lx) : Infinity, Math.abs(ly) > 1e-9 ? box.height / 2 / Math.abs(ly) : Infinity);
      };
      const gap = CONFIG.editor.connectGapPx;
      const start = { x: a.x + ux * (reach(boxA) + gap), y: a.y + uy * (reach(boxA) + gap) };
      const end = { x: b.x - ux * (reach(boxB) + gap), y: b.y - uy * (reach(boxB) + gap) };
      const length = (end.x - start.x) * ux + (end.y - start.y) * uy;
      if (length < CONFIG.editor.connectMinPx) return null;
      return { length: Math.round(length), middle: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }, angle: Math.round(Math.atan2(uy, ux) * 180 / Math.PI * 10) / 10 };
    },
    applyConnector(arrow, geometry) {
      const height = 40, w = geometry.length, head = CONFIG.editor.connectHeadPx;
      arrow.style.setProperty('--x', Math.round(geometry.middle.x - w / 2) + 'px');
      arrow.style.setProperty('--y', Math.round(geometry.middle.y - height / 2) + 'px');
      arrow.style.setProperty('--w', w + 'px');
      arrow.style.setProperty('--h', height + 'px');
      if (geometry.angle) arrow.style.rotate = geometry.angle + 'deg'; else arrow.style.removeProperty('rotate');
      // its drawing in real pixels: a head of the usual size however long it is (not stretched with the box)
      const svg = arrow.querySelector(':scope > svg');
      if (!svg) return;
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + height);
      svg.innerHTML = SHAPES.arrow.replace('x1="0" y1="50" x2="92" y2="50"', 'x1="0" y1="' + height / 2 + '" x2="' + (w - 3) + '" y2="' + height / 2 + '"')
        .replace('M80 36 L100 50 L80 64', 'M' + (w - head) + ' ' + (height / 2 - head * .7) + ' L' + w + ' ' + height / 2 + ' L' + (w - head) + ' ' + (height / 2 + head * .7));
    },
    /** Every connected arrow on the canvas follows its two elements (called before each write to the file). One of them
        gone, hidden or too close: it stays as it is. */
    updateConnectors(scene) {
      if (!scene || this.playStep >= 0) return;
      scene.querySelectorAll(':scope > .shape[data-shape="arrow"][data-connect]').forEach(arrow => {
        const [from, to] = String(arrow.getAttribute('data-connect')).split(/\s+/).map(name => scene.querySelector('[data-anchor="' + CSS.escape(name || '') + '"]'));
        if (!from || !to || !from.getClientRects().length || !to.getClientRects().length) return;
        const geometry = this.connectorGeometry(from, to);
        if (!geometry) return;
        this.applyConnector(arrow, geometry);
      });
    },
    swapPlaces() {
      if (editorCanvas.locked() || this.refusesInTurnedGroup()) return;
      const members = this.freeMembers();
      if (this.group.length === 2 && this.group.some(item => editorLayers.isLocked(item))) { showToast(ui('editor.swapLocked')); return; }
      if (this.group.length !== 2 || members.length !== 2) { showToast(ui('editor.swapNeedsTwo')); return; }
      const [a, b] = members, middle = box => ({ x: box.left + box.width / 2, y: box.top + box.height / 2 });
      const ma = middle(a.box), mb = middle(b.box);
      editorCanvas.change(() => { this.shift(a.item, mb.x - ma.x, mb.y - ma.y); this.shift(b.item, ma.x - mb.x, ma.y - mb.y); });
    },
    /** Equal space between the elements, between the first and the last one (left to right, or top to bottom). */
    spreadGroup(axis) {
      const members = this.freeMembers();
      if (members.length < 3 || editorCanvas.locked()) { showToast(ui('editor.spreadNeedsThree')); return; }
      const start = axis === 'x' ? 'left' : 'top', size = axis === 'x' ? 'width' : 'height';
      members.sort((a, b) => a.box[start] - b.box[start]);
      const first = members[0].box, last = members[members.length - 1].box;
      const used = members.reduce((sum, m) => sum + m.box[size], 0);
      const gap = (last[start] + last[size] - first[start] - used) / (members.length - 1);
      let position = first[start];
      editorCanvas.change(() => members.forEach(({ item, box }) => {
        const delta = position - box[start];
        this.shift(item, axis === 'x' ? delta : 0, axis === 'y' ? delta : 0);
        position += box[size] + gap;
      }));
    },
    deleteGroup() {
      if (editorCanvas.locked() || this.group.length < 2 || editorLayers.refusesRemoval(this.group)) return;
      const members = this.group.slice();
      this.group = [];
      editorCanvas.change(() => { members.forEach(item => item.remove()); editorCanvas.selected = null; }, { rerender: true });
      editorCanvas.selectElement(null);
    },
    /** Arrow keys with a group: every freely placed element of it moves. */
    nudgeGroup([dx, dy]) {
      const layout = editorCanvas.groupLayoutMembers();   // items in the layout: placed freely where they are first, so all move
      const moving = () => this.group.filter(item => editorCanvas.isFree(item) && !editorLayers.isLocked(item));   // a locked one stays
      if ((!moving().length && !layout.length) || editorCanvas.locked()) return;
      editorCanvas.change(() => {
        if (layout.length) editorCanvas.freeTogether(layout);
        moving().forEach(item => this.shift(item, dx, dy));
      });
      if (layout.length) showToast(ui('editor.groupFreedToMove'));
    },
    /** Ctrl+D (or Duplicate) with several selected: each gets a copy right after itself; the copies are the new group. */
    duplicateGroup() {
      if (editorCanvas.locked() || this.group.length < 2 || this.group.some(member => editorLayers.refusesInto(member))) return;
      const members = this.inDocumentOrder(this.group);
      editorCanvas.change(() => {
        const copies = members.map(member => {
          const copy = member.cloneNode(true);
          copy.classList.remove('is-editor-selected');
          copy.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
          copy.removeAttribute('id');
          editorLayers.unmark(copy);
          [copy, ...copy.querySelectorAll('[data-morph]')].forEach(node => node.removeAttribute('data-morph'));   // (one glide name per slide)
          editorCanvas.placeBlock(copy, member);
          return copy;
        });
        this.moveOffOthers(copies.filter(copy => editorCanvas.isFree(copy)));   // visible next to the originals
        editorCanvas.selected = copies[0];
        this.group = copies;
      }, { rerender: true });
    },
    /* ---- Groups (Ctrl+G): elements placed freely together in one box that moves, turns and animates as one ---- */
    groupSelection() {
      const members = this.group.length > 1 ? this.inDocumentOrder(this.group) : [];
      if (members.length < 2) { showToast(ui('editor.groupNeedsTwo')); return; }
      if (editorCanvas.locked()) { showToast(ui('editor.scriptedNote')); return; }
      if (members.some(member => !editorCanvas.isFree(member))) { showToast(ui('editor.groupOnlyFree')); return; }
      const parent = members[0].parentElement;
      if (members.some(member => member.parentElement !== parent)) { showToast(ui('editor.groupSameParent')); return; }
      if (editorLayers.refuses(members)) return;
      editor.nextLabel = ui('editor.historyGroup');
      editorCanvas.change(() => {
        const boxes = members.map(member => ({ member, x: editorCanvas.freeValue(member, '--x'), y: editorCanvas.freeValue(member, '--y'), w: member.offsetWidth, h: member.offsetHeight }));
        const left = Math.min(...boxes.map(box => box.x)), top = Math.min(...boxes.map(box => box.y));
        const right = Math.max(...boxes.map(box => box.x + box.w)), bottom = Math.max(...boxes.map(box => box.y + box.h));
        const box = document.createElement('div');
        box.className = 'group is-free';
        box.setAttribute('data-group', '');
        box.setAttribute('data-editor-name', ui('editor.groupName'));
        box.style.setProperty('--x', Math.round(left) + 'px');
        box.style.setProperty('--y', Math.round(top) + 'px');
        box.style.setProperty('--w', Math.round(right - left) + 'px');
        box.style.setProperty('--h', Math.round(bottom - top) + 'px');
        members[0].before(box);
        boxes.forEach(({ member, x, y }) => {   // their places now count from the group's corner
          member.style.setProperty('--x', Math.round(x - left) + 'px');
          member.style.setProperty('--y', Math.round(y - top) + 'px');
          box.appendChild(member);
        });
        this.group = [];
        this.drawGroup();
        editorCanvas.selected = box;
      }, { rerender: true });
      editor.nextLabel = null;
      showToast(ui('editor.grouped', { count: members.length }));
    },
    /** Ctrl+Shift+G: the group's elements back on their own, where they are now (its own turn and animation go). */
    ungroupSelection() {
      const box = editorCanvas.selected && editorCanvas.selected.closest('[data-group]');
      if (!box || !editorCanvas.scene.contains(box)) { showToast(ui('editor.ungroupNothing')); return; }
      if (editorCanvas.locked()) { showToast(ui('editor.scriptedNote')); return; }
      if (editorLayers.refuses([box])) return;
      const lost = box.hasAttribute('data-animation') || box.hasAttribute('data-morph') || box.hasAttribute('data-css');   // its own animation, morph or rules (a turn, a layer and how it appears go to its members)
      editor.nextLabel = ui('editor.historyUngroup');
      let children = [];
      editorCanvas.change(() => {
        const left = editorCanvas.freeValue(box, '--x'), top = editorCanvas.freeValue(box, '--y');
        const turn = parseFloat(box.style.rotate) || 0, radians = turn * Math.PI / 180, cos = Math.cos(radians), sin = Math.sin(radians);
        const middle = { x: box.offsetWidth / 2, y: box.offsetHeight / 2 };   // a group turns around its middle
        // how the group appeared (with the slide, or on a click with its effect, speed and easing) and its layer
        const order = box.classList.contains('reveal') ? (parseFloat(box.style.getPropertyValue('--order')) || 0) : null;
        const step = Number(box.getAttribute('data-reveal-step')) || 0, effect = box.getAttribute('data-reveal-effect');
        const speed = editorLayers.speedOf(box), ease = editorLayers.easeOf(box), layer = box.style.zIndex;
        const ownLayer = !!(turn || layer || box.hasAttribute('data-animation'));   // it was a layer of its own: its members lay inside it
        children = Array.from(box.children).filter(child => !child.matches('style, script'));
        children.forEach(child => {
          if (editorCanvas.isFree(child)) {
            // its middle, turned with the group around the group's middle, then back to its corner; its own angle plus the group's
            const w = child.offsetWidth, h = child.offsetHeight;
            const cx = editorCanvas.freeValue(child, '--x') + w / 2 - middle.x, cy = editorCanvas.freeValue(child, '--y') + h / 2 - middle.y;
            child.style.setProperty('--x', Math.round(left + middle.x + cx * cos - cy * sin - w / 2) + 'px');
            child.style.setProperty('--y', Math.round(top + middle.y + cx * sin + cy * cos - h / 2) + 'px');
            if (turn) { const angle = (((parseFloat(child.style.rotate) || 0) + turn) % 360 + 540) % 360 - 180; child.style.rotate = angle ? angle + 'deg' : ''; }
          }
          // a member appears no earlier than the group did (the later of the two wins), the way the group appeared
          if (!child.hasAttribute('data-animation')) {
            const ownStep = Number(child.getAttribute('data-reveal-step')) || 0;
            if (step) {
              if (step >= ownStep) {   // the group's click decides: its effect, speed and easing too
                child.classList.remove('reveal');
                child.style.removeProperty('--order');
                child.setAttribute('data-reveal-step', step);
                if (effect && editorCanvas.effectFits(child, effect)) child.setAttribute('data-reveal-effect', effect); else child.removeAttribute('data-reveal-effect');
                if (speed) editorLayers.setSpeed(child, speed);
                if (ease) editorLayers.setEase(child, ease);
              }
            } else if (order !== null && !ownStep) {   // with the slide: the later of the two orders
              const ownOrder = child.classList.contains('reveal') ? (parseFloat(child.style.getPropertyValue('--order')) || 0) : -1;
              child.classList.add('reveal');
              child.style.setProperty('--order', Math.max(order, ownOrder));
              if (speed && !editorLayers.speedOf(child)) editorLayers.setSpeed(child, speed);
            }
          }
          // a group that was a layer of its own (turned, To the front, animated) kept its members inside it: they take its layer
          if (ownLayer) { if (layer) child.style.zIndex = layer; else child.style.removeProperty('z-index'); }
          else if (layer && !child.style.zIndex) child.style.zIndex = layer;
          if (!child.getAttribute('style')) child.removeAttribute('style');
          box.before(child);
        });
        box.remove();
        editorCanvas.selected = children[0] || null;
        this.group = children.length > 1 ? children : [];   // they stay selected together
      }, { rerender: true });
      editor.nextLabel = null;
      if (lost) showToast(ui('editor.ungroupLost'));
    },

    /* ---- Stagger: several elements one after another, a fixed time apart ---- */
    /** how: 'forward' (as you read them), 'reverse' or 'middle' (from the middle outwards). Own animations: their delay;
        a click effect: its transition-delay; rising in with the slide: their order (the slide's pace). One undo step. */
    staggerGroup(how) {
      if (editorCanvas.locked() || this.group.length < 2) { showToast(ui('editor.staggerNeedsTwo')); return; }
      if (editorLayers.refuses(this.group)) return;
      let items = this.readingOrder(this.group.slice());
      if (how === 'reverse') items.reverse();
      if (how === 'random') for (let index = items.length - 1; index > 0; index--) { const other = Math.floor(Math.random() * (index + 1)); [items[index], items[other]] = [items[other], items[index]]; }   // shuffled once: the file keeps that order
      if (how === 'middle') {
        const boxes = items.map(item => editorCanvas.boxInStage(item));
        const middle = { x: (Math.min(...boxes.map(b => b.left)) + Math.max(...boxes.map(b => b.left + b.width))) / 2, y: (Math.min(...boxes.map(b => b.top)) + Math.max(...boxes.map(b => b.top + b.height))) / 2 };
        const distance = item => { const b = editorCanvas.boxInStage(item); return Math.hypot(b.left + b.width / 2 - middle.x, b.top + b.height / 2 - middle.y); };
        items = items.slice().sort((a, b) => distance(a) - distance(b));
      }
      const ms = clamp(Math.round(Number(this.staggerStep ?? CONFIG.editor.staggerMs)), 0, 5000);
      const definitions = editor.animations();
      const own = item => { const name = item.getAttribute('data-animation'); return name && definitions[name] && editor.model.querySelectorAll('[data-animation="' + CSS.escape(name) + '"]').length === 1 ? definitions[name] : null; };
      const shared = items.filter(item => item.hasAttribute('data-animation') && !own(item)).length;
      const firstDelay = Math.min(...items.map(item => (own(item) ? Number(own(item).delay) || 0 : Infinity)).concat([Infinity]));
      const base = Number.isFinite(firstDelay) ? firstDelay : 0;
      editor.nextLabel = ui('editor.historyStagger');
      // with the slide: from the first order they had (not before the slide's other items); on a click: counted per click
      const slideItems = items.filter(item => !item.hasAttribute('data-animation') && !item.hasAttribute('data-reveal-step'));
      const orders = slideItems.filter(item => item.classList.contains('reveal')).map(item => parseFloat(item.style.getPropertyValue('--order')) || 0);
      let slideOrder = orders.length ? Math.min(...orders) : editorCanvas.nextOrder();
      const perClick = new Map();
      editorCanvas.change(() => {
        items.forEach((item, index) => {
          const definition = own(item);
          if (definition) definition.delay = Math.round(base + index * ms);
          else if (item.hasAttribute('data-animation')) return;   // shared with others: left as it is
          else if (item.hasAttribute('data-reveal-step')) {
            const step = item.getAttribute('data-reveal-step'), count = perClick.get(step) || 0;
            perClick.set(step, count + 1);
            if (count) item.style.transitionDelay = count * ms + 'ms'; else item.style.removeProperty('transition-delay');
          } else { item.classList.add('reveal'); item.style.setProperty('--order', Math.min(40, slideOrder++)); }   // with the slide: one after another at the slide's pace
          if (!item.getAttribute('style')) item.removeAttribute('style');
        });
        editor.saveAnimations(definitions);
      }, { rerender: true });
      editor.nextLabel = null;
      if (shared) showToast(ui('editor.staggerShared', { count: shared }));
    },

    /** The group in reading order: top to bottom, and left to right on about the same line. */
    readingOrder(list) {
      const boxes = new Map(list.map(item => [item, editorCanvas.boxInStage(item)]));
      return list.slice().sort((a, b) => {
        const boxA = boxes.get(a), boxB = boxes.get(b);
        return Math.abs(boxA.top - boxB.top) > 24 ? boxA.top - boxB.top : boxA.left - boxB.left;
      });
    },
    /** How the group appears, in reading order: one after another with the slide, each on its own click
        (after the clicks the slide has), or all together on one new click. */
    appearGroup(mode) {
      if (editorCanvas.locked() || this.group.length < 2) return;
      const members = this.readingOrder(this.group.filter(item => !item.hasAttribute('data-animation')));   // their own animation decides for those
      const skipped = this.group.length - members.length;
      if (!members.length) { showToast(ui('editor.groupAppearSkipped', { count: skipped })); return; }
      const scene = editorCanvas.scene;
      const stepOf = node => revealStepOf(node) || playStepOf(node);
      const others = Array.from(scene.querySelectorAll('[data-reveal-step], [data-play-step]')).filter(node => !members.some(member => member === node || member.contains(node) || node.contains(member)));   // (not a block they sit in: its click stays)
      // on clicks: where the group's first click was (the later clicks of the slide move up to make room), else after the slide's own clicks
      const held = members.map(member => revealStepOf(member)).filter(Boolean);
      const first = held.length ? Math.min(...held) : Math.max(ownStepsOf(scene), 0, ...others.map(stepOf)) + 1;
      const needed = mode === 'clicks' ? members.length : 1;
      const orders = members.filter(member => member.classList.contains('reveal')).map(member => parseFloat(member.style.getPropertyValue('--order')) || 0);
      const firstOrder = orders.length ? Math.min(...orders) : editorCanvas.nextOrder();
      editorCanvas.change(() => {
        if (mode !== 'sequence' && held.length) {
          // the later clicks move up to make room, their speaker-note lines with them
          const moves = new Map();   // a member's old click -> its new click (its speaker-note line goes along)
          members.forEach((member, index) => { const step = revealStepOf(member); if (step && !moves.has(step)) moves.set(step, mode === 'clicks' ? first + index : first); });
          others.filter(node => stepOf(node) >= first).forEach(node => node.setAttribute(node.hasAttribute('data-reveal-step') ? 'data-reveal-step' : 'data-play-step', stepOf(node) + needed));
          scene.querySelectorAll('.speaker-notes [data-note-step]').forEach(line => {
            const step = parseInt(line.getAttribute('data-note-step'), 10) || 0;
            if (moves.has(step)) line.setAttribute('data-note-step', moves.get(step));
            else if (step >= first) line.setAttribute('data-note-step', step + needed);
          });
        }
        members.forEach((member, index) => {
          if (mode === 'sequence') {
            editorCanvas.setAppear(member, 'slide');
            member.style.setProperty('--order', clamp(firstOrder + index, 0, 40));
          } else {
            editorCanvas.setAppear(member, 'click');
            member.setAttribute('data-reveal-step', clamp(mode === 'clicks' ? first + index : first, 1, 40));
          }
        });
        this.closeClickGaps(scene);
      });
      showToast(skipped ? ui('editor.groupAppearSkipped', { count: skipped }) : ui('editor.groupAppearDone'));
    },

    /** Renumbers the clicks of a slide 1, 2, 3, ... without empty clicks in between (not on a slide whose script
        counts its own steps, data-steps); speaker-note lines keep pointing at the same moment. */
    closeClickGaps(scene) {
      if (ownStepsOf(scene)) return;
      const items = Array.from(scene.querySelectorAll('[data-reveal-step], [data-play-step]')).filter(node => !node.closest('.speaker-notes'));
      const attributeOf = node => (node.hasAttribute('data-reveal-step') ? 'data-reveal-step' : 'data-play-step');
      const used = Array.from(new Set(items.map(node => parseInt(node.getAttribute(attributeOf(node)), 10) || 0).filter(step => step > 0))).sort((a, b) => a - b);
      const rank = step => used.filter(value => value <= step).length;   // 1, 2, 3, ... for the clicks in use
      if (used.every((step, index) => step === index + 1)) return;
      items.forEach(node => { const step = parseInt(node.getAttribute(attributeOf(node)), 10) || 0; if (step > 0) node.setAttribute(attributeOf(node), rank(step)); });
      scene.querySelectorAll('.speaker-notes [data-note-step]').forEach(line => { const step = parseInt(line.getAttribute('data-note-step'), 10) || 0; if (step > 0) line.setAttribute('data-note-step', Math.max(1, rank(step))); });
    },

    /* ---- Zoom ---- */
    /** Zooms the canvas (1: the slide fits; up to 4) and keeps the point under `point` (or the middle) in place, as far
        as the scroll bars allow (a direction in which the slide still fits stays centred). */
    /** Shift+2: zoomed in on the selection (all of a Shift+click group), in the middle of the canvas; nothing selected: the whole slide. */
    zoomToSelection() {
      const members = this.group.length > 1 ? this.group : editorCanvas.selected ? [editorCanvas.selected] : [];
      const area = editor.element.querySelector('.editor-canvas-scroll');
      if (!members.length || !area) { this.setZoom(1); return; }
      const union = () => members.map(item => item.getBoundingClientRect()).reduce((box, r) => ({ left: Math.min(box.left, r.left), top: Math.min(box.top, r.top), right: Math.max(box.right, r.right), bottom: Math.max(box.bottom, r.bottom) }),
        { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity });
      const box = union(), scale = editorCanvas.scale || 1, base = scale / (editorCanvas.zoom || 1);
      const width = Math.max(8, (box.right - box.left) / scale), height = Math.max(8, (box.bottom - box.top) / scale);   // in slide px
      const margin = CONFIG.editor.zoomToSelectionMargin;
      this.setZoom(Math.min((area.clientWidth - 2 * margin) / (width * base), (area.clientHeight - 2 * margin) / (height * base)), { x: (box.left + box.right) / 2, y: (box.top + box.bottom) / 2 });
      const after = union(), view = area.getBoundingClientRect();   // then its middle in the middle of the canvas
      area.scrollLeft += (after.left + after.right) / 2 - (view.left + area.clientWidth / 2);
      area.scrollTop += (after.top + after.bottom) / 2 - (view.top + area.clientHeight / 2);
      editorCanvas.drawSelection();
    },
    setZoom(zoom, point) {
      const area = editor.element.querySelector('.editor-canvas-scroll');
      const stage = editorCanvas.stageElement;
      if (!area || !stage) return;
      const rect = area.getBoundingClientRect();
      const at = point || { x: rect.left + area.clientWidth / 2, y: rect.top + area.clientHeight / 2 };
      const before = stage.getBoundingClientRect(), oldScale = editorCanvas.scale || 1;
      const spot = { x: (at.x - before.left) / oldScale, y: (at.y - before.top) / oldScale };   // the slide point under `at`
      const next = clamp(zoom, 1, 4);
      editorCanvas.zoom = next < 1.02 && next < editorCanvas.zoom ? 1 : next;   // not rounded: the small steps of a pinch add up
      editorCanvas.fit();
      const after = stage.getBoundingClientRect();
      area.scrollLeft += after.left + spot.x * editorCanvas.scale - at.x;
      area.scrollTop += after.top + spot.y * editorCanvas.scale - at.y;
      if (!editorLayers.canScroll()) editorLayers.setSpace(false);   // nothing to pan any more
    },
    /** The zoom buttons: the size of the slide on screen (100% = real size), − only when zoomed in. */
    showZoom() {
      const bar = editor.element && editor.element.querySelector('.editor-zoom');
      if (!bar) return;
      bar.querySelector('.editor-zoom-level').textContent = Math.round(editorCanvas.scale * 100) + '%';
      bar.querySelector('[data-action="zoom-out"]').disabled = editorCanvas.zoom <= 1;
      bar.querySelector('[data-action="zoom-in"]').disabled = editorCanvas.zoom >= 4;
      editorCanvas.stageElement.closest('.editor-canvas').classList.toggle('is-zoomed', editorCanvas.zoom > 1);
    },

    /* ---- Pick a colour from the screen (Chrome / Edge: EyeDropper) ---- */
    pickColour(apply) {
      if (!window.EyeDropper || this.pickingColour) return;
      this.pickingColour = true;   // Esc cancels the picker: it must not also close the editor (editor.onKeyDown)
      new window.EyeDropper().open()
        .then(result => runSafely('editor: pick colour', () => apply(result.sRGBHex)))
        .catch(() => { /* cancelled */ })
        .finally(() => setTimeout(() => { this.pickingColour = false; }, 150));
    },

    /* ---- Timeline: drag a bar "with the slide" earlier or later ---- */
    /** The time between items that rise in one after another on this slide (ms). */
    staggerMs() {
      const scene = this.timingProbe && this.timingProbe.scene;
      const value = getComputedStyle(scene || root).getPropertyValue('--reveal-stagger').trim();
      const ms = /ms$/.test(value) ? parseFloat(value) : (parseFloat(value) || 0) * 1000;
      return ms > 0 ? ms : 130;
    },
    startTimelineDrag(event) {
      const bar = event.target.closest('.anim-track.is-draggable .anim-bar');
      if (!bar || event.button !== 0) return;
      event.preventDefault();
      const track = bar.parentElement, row = track.closest('.anim-row');
      const kind = track.dataset.drag, total = Number(track.dataset.total) || 1000, width = track.clientWidth || 1;
      const start = Number(track.dataset.start) || 0, order = Number(track.dataset.order) || 0, stagger = Number(track.dataset.stagger) || 130;
      const left = parseFloat(bar.style.left) || 0, x = event.clientX;
      const input = row.querySelector('input[data-tool-field]');
      const label = row.querySelector('.anim-action');
      let value = kind === 'order' ? order : start;
      // the other bars on the same timeline (between the same headings): their starts and ends pull this one's start
      const marks = [];
      const collect = other => {
        const otherTrack = other.matches && other.matches('.anim-row') && other !== row && other.querySelector('.anim-track');
        if (!otherTrack) return;
        const from = Number(otherTrack.dataset.from) || 0, length = otherTrack.dataset.length === '' ? null : Number(otherTrack.dataset.length) || 0;   // its real timing (a short bar is drawn wider)
        const name = (other.querySelector('.anim-label') || {}).textContent || '';
        marks.push({ at: from, text: ui('editor.snapStartOf', { label: name }) });
        if (length !== null) marks.push({ at: from + length, text: ui('editor.snapEndOf', { label: name }) });   // (a loop has no end)
      };
      for (let other = row.previousElementSibling; other && !other.matches('h4'); other = other.previousElementSibling) collect(other);
      for (let other = row.nextElementSibling; other && !other.matches('h4'); other = other.nextElementSibling) collect(other);
      const reach = Math.min(CONFIG.editor.barPullPx / width * total, CONFIG.editor.barPullMs);   // a few px on the track, never far in time (a narrow track)
      let snappedTo = '';
      row.classList.add('is-dragging');
      try { bar.setPointerCapture(event.pointerId); } catch (e) { /* the pointer is gone */ }
      const onMove = moveEvent => {
        const ms = (moveEvent.clientX - x) / width * total;
        const near = kind === 'delay' && !moveEvent.altKey ? marks.filter(mark => Math.abs(mark.at - (start + ms)) < reach).sort((a, b) => Math.abs(a.at - start - ms) - Math.abs(b.at - start - ms))[0] : null;   // Alt: no pull
        snappedTo = near ? near.text : '';
        value = kind === 'order' ? clamp(Math.round(order + ms / stagger), 0, 40) : near ? clamp(near.at, 0, 20000) : clamp(Math.round((start + ms) / 50) * 50, 0, 20000);
        const moved = kind === 'order' ? (value - order) * stagger : value - start;
        bar.style.left = clamp(left + 100 * moved / total, 0, 100 - (parseFloat(bar.style.width) || 0)) + '%';   // stays on its track
        if (input) input.value = value;
        label.textContent = kind === 'order' ? ui('editor.dragOrder', { order: value }) : ui('editor.dragDelay', { ms: value }) + (snappedTo ? ' = ' + snappedTo : '');
        row.classList.toggle('is-snapped', !!snappedTo);
      };
      const onUp = upEvent => {
        bar.removeEventListener('pointermove', onMove);
        bar.removeEventListener('pointerup', onUp);
        bar.removeEventListener('pointercancel', onUp);
        row.classList.remove('is-dragging', 'is-snapped');
        // cancelled (e.g. a touch that became a scroll), or nothing changed: the panel shows the old timing again
        if (upEvent.type === 'pointercancel' || !bar.isConnected || editorCanvas.locked() || value === (kind === 'order' ? order : start)) { editor.renderPanel(); return; }
        if (this.playStep >= 0) this.stopPlaying();   // a new still canvas: find the element in it
        const element = editorCanvas.elementAtPath(track.dataset.path.split('/').filter(Boolean).map(Number));
        if (!element) { editor.renderPanel(); return; }
        if (kind === 'order') { editorCanvas.change(() => element.style.setProperty('--order', value), { rerender: true }); return; }
        const definitions = editor.animations();
        const definition = definitions[element.getAttribute('data-animation')];
        if (!definition) { editor.renderPanel(); return; }
        editor.record();
        definition.delay = value;
        editor.saveAnimations(definitions);
        editor.changed(editor.selected);
        editor.renderPanel();
      };
      bar.addEventListener('pointermove', onMove);
      bar.addEventListener('pointerup', onUp);
      bar.addEventListener('pointercancel', onUp);
    },

    /* ---- Right-click menu on the slide ---- */
    openMenu(event) {
      if (!editorCanvas.scene || !editorCanvas.scene.contains(event.target)) return;
      // the text that had the keyboard before this right-click (a right-click focuses the text first); from the keyboard (menu key, Shift+F10): the text that has it now
      const fromPointer = Date.now() - (this.pointerDownAt || 0) < 2000;   // on Windows the menu event comes at the button's release
      const typing = fromPointer ? this.focusBeforePointer : document.activeElement;
      this.pointerDownAt = 0;
      if (typing && typing.isContentEditable && typing.contains(event.target)) return;   // in the text you type: spelling suggestions, paste text
      event.preventDefault();
      if (this.playStep >= 0) { this.stopPlaying(); return; }
      if (editorCanvas.isEmptySpot(event.target)) { this.openAddHereMenu(event, fromPointer); return; }
      const block = editorCanvas.blockOf(event.target);
      if (!block) return;
      if (!this.group.includes(block)) { this.group = []; this.drawGroup(); if (block !== editorCanvas.selected) editorCanvas.selectElement(block); }
      const locked = editorCanvas.locked(), free = editorCanvas.isFree(block);
      const item = (action, label, enabled) => '<button role="menuitem" data-menu="' + action + '"' + (enabled === false ? ' disabled' : '') + '>' + escapeHtml(ui(label)) + '</button>';
      const menu = this.menu || (this.menu = Object.assign(document.createElement('div'), { className: 'editor-menu' }));
      menu.setAttribute('role', 'menu');
      menu.innerHTML = item('copy', 'editor.menuCopy') + item('cut', 'editor.menuCut', !locked) + item('paste', 'editor.menuPaste', !locked && !!this.clipboardItem()) +
        item('duplicate', 'editor.menuDuplicate', !locked) + item('delete', 'editor.menuDelete', !locked) + '<hr>' +
        item('select-like', 'editor.menuSelectLike', editorCanvas.isFree(block) && !block.parentElement.closest('.is-free')) + item('parent', 'editor.menuParent', block.parentElement !== editorCanvas.scene) + item('free', free ? 'editor.menuFixed' : 'editor.menuFree', !locked) +
        (free ? item('front', 'editor.menuFront', !locked) + item('back', 'editor.menuBack', !locked) : '') + '<hr>' +
        item('copy-style', 'editor.menuCopyStyle') + item('paste-style', 'editor.menuPasteStyle', !locked && !!editorLayers.copiedStyle) + item('lock', block.hasAttribute('data-editor-locked') ? 'editor.menuUnlock' : 'editor.menuLock', !locked) + '<hr>' +
        item('animations', 'editor.menuAnimations') + item('layers', 'editor.menuLayers') + '<hr>' + item('comment', 'editor.menuComment') +
        (editorCanvas.kindOf(block) === 'image' ? item('crop', 'editor.menuCrop', !locked) : '');
      editor.element.appendChild(menu);
      menu.hidden = false;
      const width = 220, height = menu.offsetHeight;
      menu.style.left = Math.min(event.clientX, window.innerWidth - width - 8) + 'px';
      menu.style.top = Math.min(event.clientY, window.innerHeight - height - 8) + 'px';
      fitMenuOnScreen(menu);   // (taller than the window: it scrolls)
      const first = menu.querySelector('button:not([disabled])');
      if (first) first.focus();
    },
    /** Copy from the menu: the system clipboard gets the same marker as with Ctrl+C, so a later Ctrl+V pastes
        this element and not whatever was copied before in another app. */
    markSystemClipboard(label) {
      const item = this.clipboardItem();
      const text = CLIPBOARD_MARK + (label || (item && item.label) || '');
      const helper = document.createElement('textarea');   // a copy command needs a selection: a hidden field with the marker
      helper.value = text;
      helper.setAttribute('readonly', '');
      helper.style.cssText = 'position: fixed; left: -9999px; top: 0; opacity: 0;';
      editor.element.appendChild(helper);
      helper.select();
      try { document.execCommand('copy'); } catch (e) { /* the clipboard cannot be written here */ }
      helper.remove();
    },
    /** Keys while the menu is open: arrows, Home and End move through it, Esc and Tab close it, Enter and Space
        press the button; nothing reaches the slide. True when the menu was open. */
    onMenuKey(event) {
      if (!this.menu || this.menu.hidden) return false;
      const items = Array.from(this.menu.querySelectorAll('button:not([disabled])'));
      const index = items.indexOf(document.activeElement);
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        if (items[next]) items[next].focus();
      } else if (event.key === 'Enter' || event.key === ' ') {
        // the focused button does it (its click)
      } else {
        event.preventDefault();
        this.closeMenu();
      }
      return true;
    },
    /** True when the menu was open. */
    closeMenu() {
      if (!this.menu || this.menu.hidden) return false;
      this.menu.hidden = true;
      return true;
    },
    /** Right-click on an empty spot: a text box or shape there, or paste. */
    openAddHereMenu(event, fromPointer) {
      this.group = []; this.drawGroup();
      editorCanvas.selectElement(null);
      this.menuPoint = fromPointer ? editorCanvas.stagePoint(event) : null;   // from the keyboard: in the middle
      const menu = this.menu || (this.menu = Object.assign(document.createElement('div'), { className: 'editor-menu' }));
      menu.setAttribute('role', 'menu');
      const item = (action, label, enabled) => '<button role="menuitem" data-menu="' + action + '"' + (enabled === false ? ' disabled' : '') + '>' + escapeHtml(ui(label)) + '</button>';
      menu.innerHTML = '<p class="editor-menu-heading">' + escapeHtml(ui('editor.addHere')) + '</p>' +
        FREE_TEXTS.concat(Object.keys(SHAPES)).map(kind => item('here-' + kind, 'editor.block' + kind.replace(/^./, c => c.toUpperCase()))).join('') + '<hr>' +
        item('paste', 'editor.menuPaste', !!this.clipboardItem()) + item('select-all', 'editor.menuSelectAll');
      editor.element.appendChild(menu);
      menu.hidden = false;
      const width = 220, height = menu.offsetHeight;
      menu.style.left = Math.min(event.clientX, window.innerWidth - width - 8) + 'px';
      menu.style.top = Math.max(8, Math.min(event.clientY, window.innerHeight - height - 8)) + 'px';
      fitMenuOnScreen(menu);   // (taller than the window: it scrolls)
      const first = menu.querySelector('button:not([disabled])');
      if (first) first.focus();
    },
    runMenu(action) {
      this.closeMenu();
      if (action.startsWith('here-')) { runSafely('editor menu: ' + action, () => editorCanvas.insertBlock(action.slice(5), this.menuPoint)); return; }
      const element = editorCanvas.selected;
      const actions = {
        copy: () => { this.copy(false); this.markSystemClipboard(this.lastCopyLabel); }, cut: () => { this.copy(true); this.markSystemClipboard(this.lastCopyLabel); },
        paste: () => this.paste(),
        duplicate: () => editorCanvas.runAction('duplicate'),
        delete: () => (this.group.length > 1 ? this.deleteGroup() : editorCanvas.runAction('delete')),
        parent: () => editorCanvas.runAction('parent'),
        'select-all': () => this.selectAll(), 'select-like': () => { if (element) this.selectAll(element); },
        free: () => { if (element && editorCanvas.locked()) showToast(ui('editor.scriptedNote')); if (element && !editorCanvas.locked() && !editorLayers.refuses([element])) { const freeing = !editorCanvas.isFree(element); editorCanvas.change(() => editorCanvas.setFree(element, freeing), { rerender: true }); if (freeing && element.parentElement !== editorCanvas.scene) showToast(ui('editor.freeLeavesLayout')); } },
        front: () => this.runAction('to-front'), back: () => this.runAction('to-back'),
        animations: () => { editor.panelTab = 'animations'; editor.renderPanel(); },
        layers: () => { editor.panelTab = 'layers'; editor.renderPanel(); },
        comment: () => this.openComment(element),
        crop: () => this.runAction('crop-image'),
        'copy-style': () => editorLayers.copyStyle(), 'paste-style': () => editorLayers.pasteStyle(),
        lock: () => { if (element && !editorCanvas.locked()) editorLayers.toggle(element, 'data-editor-locked'); },   // unlock: in the Layers tab (a locked element takes no clicks)
      };
      if (actions[action]) runSafely('editor menu: ' + action, actions[action]);
    },

    /* ---- Find and replace (Presentation tab) ---- */
    findReplaceHtml() {
      return '<h4 data-ui="editor.sectionFind"></h4>' +
        '<div class="editor-row">' + editor.field('editor.find', '<input data-find-field="find" value="' + escapeHtml(this.findText || '') + '">') +
        editor.field('editor.replaceWith', '<input data-find-field="replace" value="' + escapeHtml(this.replaceText || '') + '">') + '</div>' +
        '<label class="editor-check"><input type="checkbox" data-find-field="notes"' + (this.findNotes ? ' checked' : '') + '><span>' + escapeHtml(ui('editor.findNotes')) + '</span></label>' +
        '<label class="editor-check"><input type="checkbox" data-find-field="case"' + (this.findCase ? ' checked' : '') + '><span>' + escapeHtml(ui('editor.matchCase')) + '</span></label>' +
        '<div class="editor-buttons"><button data-action="find-count" data-ui="editor.findCount"></button><button data-action="replace-all" data-ui="editor.replaceAll"></button></div>';
    },
    /** Counts (or replaces) the words in every slide: texts, chapter titles, image descriptions, read-out titles. */
    findAndReplace(replace) {
      const body = editor.element.querySelector('.editor-panel-body');
      const value = name => { const field = body.querySelector('[data-find-field="' + name + '"]'); return field ? (field.type === 'checkbox' ? field.checked : field.value) : ''; };
      this.findText = value('find'); this.replaceText = value('replace'); this.findNotes = value('notes'); this.findCase = value('case');
      if (!this.findText) { showToast(ui('editor.findEmpty')); return; }
      const pattern = new RegExp(this.findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g' + (this.findCase ? '' : 'i'));
      let count = 0;
      const slides = new Set();
      const visit = (scene, apply) => {
        const walker = editor.model.createTreeWalker(scene, NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        nodes.forEach(node => {
          const parent = node.parentElement;
          if (!parent || parent.closest('script, style, svg, .count-up, .break-timer time, .qr-code, [data-no-edit]') || (!this.findNotes && parent.closest('.speaker-notes'))) return;   // numbers and drawings a script makes stay as they are
          const found = (node.nodeValue.match(pattern) || []).length;
          if (!found) return;
          const shownByLabel = !!parent.closest('[data-edit-attr="aria-label"]');   // the typed-out words: counted once, by their label below
          if (!shownByLabel) { count += found; slides.add(scene); }
          if (apply) node.nodeValue = node.nodeValue.replace(pattern, () => this.replaceText);
        });
        // the chapter title, image descriptions, and words a script types out (their aria-label is the text)
        const describes = element => element.getAttribute('data-edit-attr') === 'aria-label' || element.getAttribute('role') === 'img';   // its label is its text, or a picture's description
        [scene].concat(Array.from(scene.querySelectorAll('[alt], [data-edit-attr="aria-label"], [role="img"][aria-label]'))).forEach(element => ['data-title', 'alt', 'aria-label'].forEach(name => {
          const text = element.getAttribute(name);
          if (!text || (name === 'data-title' && element !== scene) || (name === 'aria-label' && !describes(element))) return;
          const found = (text.match(pattern) || []).length;
          if (!found) return;
          count += found; slides.add(scene);
          if (apply) element.setAttribute(name, text.replace(pattern, () => this.replaceText));
        }));
        // a title made of separate letters ("IDEA") is read out by its aria-label: it follows the letters, as in cleanCopy
        if (apply) scene.querySelectorAll('h1[aria-label], h2[aria-label]').forEach(title => {
          if (!title.hasAttribute('data-edit-attr') && title.textContent.trim()) title.setAttribute('aria-label', title.textContent.replace(/\s+/g, ' ').trim());
        });
      };
      editor.modelScenes().forEach(scene => visit(scene, false));
      if (!count) { showToast(ui('editor.nothingFound')); return; }
      const plural = slides.size === 1 ? 'One' : '';   // "on 1 slide" / "on 3 slides"
      if (!replace) { showToast(ui('editor.foundCount' + plural, { count, slides: slides.size })); return; }
      const found = { count, slides: slides.size };
      editorCanvas.finishTyping();
      editor.edit(() => { slides.forEach(scene => { visit(scene, true); editor.changedNodes.add(scene); }); });
      showToast(ui('editor.replacedCount' + plural, found));
    },
  };
