  // The page exactly as it was loaded, before the script changes anything.
  // "Save a copy with these settings" starts from this.
  const ORIGINAL_HTML = document.documentElement.outerHTML;

  /* ===========================================================================
     1. CONFIG
     Every timing and number of the script in one place. CSS timings (delays
     of the entrance animations) live in each slide's CSS block.
     =========================================================================== */
  const CONFIG = {
    stage: { width: 1600, height: 900 },              // design size of a slide, in px
    stepZoomLevel: 1.6, stepZoomMs: 900,             // (how long the glide takes: as in css/04)                               // Zoom in on this click: how much the slide is magnified (data-zoom-in can say otherwise)
    focusFadeMs: 600,                                 // Dim the rest on this click: how long the rest takes to brighten again (CSS: .5 s)
    sceneResetAfterLeaveMs: 600,
    slowTransitionFactor: 2,
    confetti: { pieces: 46, durationMs: 1600, settleMs: 250, withSlideMs: 700 },   // (withSlideMs: after it starts to rise in with the slide)   // (settleMs: after its click effect, then it bursts)       // 🎉 Confetti on its click (data-confetti, section 6)
    selfRunningMaxSeconds: 600,                       // Moves on by itself after (data-advance): at most this many seconds
    pushMs: 600,                                      // transition Push: how long it takes (as css/04 --scene-push)                          // Transition speed Slow (a slide's setting): its reset waits this many times longer (CSS: .9s)                      // a slide that left is reset once its fade-out is done
    controls: { hideAfterMs: 2500, wakeZonePx: 110 }, // the bottom bar hides when idle; the mouse near the bottom shows it
    cursorHideAfterMs: 2500,
    swipe: { minDistancePx: 60, horizontalRatio: 1.5 },
    countUp: {
      durationMs: 1400,
      staggerMs: 130,                                 // when the CSS gives no --reveal-stagger (it normally does: a slide's own pace too)
      startDelayMs: 650,                              // when the CSS gives no --scene-enter-delay: (300) + riseMs
      riseMs: 350,                                    // a count starts this long after its card starts to rise in
    },
    timeline: {                                       // slide 3
      autoStartMs: 2000,                              // the car starts by itself after this
      driveDoneMs: 7100,                              // from start of the drive until everything has played
      ignoreNextMs: 1500,                             // Next presses this soon after the start are ignored
      fastForwardRate: 6,                             // Next during the drive plays the rest this many times faster
    },
    mindset: {                                        // slide 5, last step: the knob tours several modes
      tourStops: [3, 0, 1, 3, 2],                     // positions: 0 Manual, 1 Spec-driven, 2 Evidence-driven, 3 Vibe coding
      tourMoveMs: 420,
      tourHoldMs: 330,
    },
    flow: {                                           // slide 6
      firstStepMs: 700,                               // when the first step pops in
      popMs: 420,                                     // how long a step takes to pop in
      dotSpeedPxPerMs: .34,                           // the dot moves at one steady speed
      cornerRadiusPx: 12,                             // rounded corner where a connector changes lane
      harnessLoopDipPx: 22,                           // how far the harness loop curves below the steps
      implementStepIndex: 6,                          // "Implement" (harness lane)
      validateStepIndex: 7,                           // "Validate" (harness lane)
    },
    typing: { startDelayMs: 900, perCharacterMs: 55, caretVisibleAfterMs: 900 },   // slide 9
    presenter: { refreshMs: 500, connectTimeoutMs: 4000 },
    checks: {                                         // the check row at the bottom of the presenter view
      pingEveryMs: 1000,                              // the presenter asks the audience window "are you there?" this often
      notRespondingAfterMs: 4000,                     // no answer for this long: "not responding"
      outOfSyncAfterAnswers: 3,                       // this many answers in a row from another slide: "on another slide"
      lowBatteryPercent: 40,                          // below this (and not charging) the battery check turns amber
    },
    slideGrid: { columns: 4 },                        // Slides drawer (G): thumbnails per row
    textEditor: { saveAfterMs: 250 },                 // Texts drawer (T): a change is applied and saved this long after the last key
    booth: {                                          // booth mode (Settings, or ?booth=20): the deck plays by itself
      slideSeconds: 20,                               // time per slide (Settings can change it)
      stepSeconds: 4,                                 // time per click inside a slide
      minSeconds: 5, maxSeconds: 300,
      ignoreInputMs: 800,                             // input this soon after the start does not stop it
    },
    editor: {                                         // the editor (E)
      escapeAgainMs: 3000,                            // Esc with nothing left to close: a second Esc within this time closes the editor
      undoSteps: 60,                                  // how many changes Undo can take back
      draftAfterMs: 1500,                             // a draft is kept in this browser this long after the last change
      writeBackAfterMs: 400,                          // typed text goes into the model this long after the last key
      transitionPreviewMs: 3200,                      // Slide tab, ▶ Preview: how long the slide's entrance plays on the canvas
      gridPx: 8, snapPx: 6,                           // free placement: grid, and how close a guide catches an element
      handlePx: 13,                                   // size of a selection handle on screen (at any zoom)
      rotateSnapDegrees: 4,                           // turning: this close to 0°, 45°, 90° … it snaps there (Alt: not)
      detachPx: 24,                                   // dragging a block this far out of its box places it freely
      keyRunMs: 1200,                                 // arrow presses this close together are one undo step
      previewLoopRestMs: 600,                         // the pointer over a quick animation: it repeats, resting this long at its end each time
      previewMaxMs: 4000,                             // a preview (▶ Preview, the pointer over a quick animation) plays at most this long
      timelineLabelPx: 200,
      timelineGraphPx: 64,                            // the timeline's graph: height of a property line                           // the timeline panel: width of the names column
      barPullPx: 6, barPullMs: 120,                   // a timeline bar's start pulls to another bar's start or end this close (px on the track, at most ms)
      staggerMs: 120,                                 // the stagger tool: the time between the elements (ms), until you set another
      guideBlocks: 80,                                // guides from at most this many of the slide's own blocks while dragging
      pathMs: 1600,                                   // a drawn motion path: how long the way takes (an own animation keeps its own)
      pathTolerancePx: 4,                             // a drawn path is simplified: points this close to the line are left out
      pathShapePx: 160, pathShapeSteps: 24,           // ◯ ⌒ ∿ ∞ ready ways: how big (slide px) and how many keyframes
      pathMaxKeys: 24,                                // at most this many keyframes from one drawn path
      pathTimeWeight: .2,                             // ⏱ Your speed: 1 s of drawing time counts as 200 px when the path is simplified
      dockOpenMs: 280, dockCloseMs: 500,              // a hidden dock: open after the pointer rests on its tab, close after it left
      barNearPx: 60, barFadePx: 140,                  // the selection bar: full within 60 px of the pointer, faded 140 px further
      timelineNudgeMs: 10, timelineNudgeBigMs: 100,   // ← → on selected keyframes in the timeline (Shift: the bigger step)
      gridGapPx: 32,                                  // Arrange in a grid: the space between the cells (slide px)
      zoomToSelectionMargin: 48,                      // Shift+2: room around the selection on screen (px)
      pasteTableRows: 30, pasteTableColumns: 10,      // pasted spreadsheet rows: at most this many rows (under the headings) and columns
      pasteListMax: 30,                               // pasted bullet lines: at most this many become a list
      connectGapPx: 16, connectMinPx: 40, connectHeadPx: 20,             // Connect with an arrow: room between the arrow and the two elements; shorter than this: not drawn
      usedColoursShown: 8,                            // Style: how many of the presentation's own colours are offered
      textSizeStep: 1.2,                              // A− / A+ in the text bar: this many times smaller or bigger per click
      largeFileBytes: 8 * 1048576,                    // a bigger image or video asks first (it makes the file big)
    },
    captions: {                                       // optional live captions (Settings)
      languages: [{ code: 'en-US', label: 'English' }, { code: 'nl-BE', label: 'Nederlands' }, { code: 'fr-BE', label: 'Français' }],
      showWords: 18,                                  // the caption bar shows the last words spoken
      keepWords: 40,
      hideAfterMs: 4000,                              // the bar hides after this much silence
      maxQuickRestarts: 5,                            // recognition that keeps stopping at once is given up (with a message)
    },
    pace: {
      onTimeMarginMs: 15000,                          // within this margin of the plan counts as "on schedule"
      wellBehindMs: 60000,                            // more behind than this turns the status rose
      slideMarginMs: 10000,                           // a slide may take this much longer than its estimate and still be "on time"
      minimumRealizedSeconds: 5,                      // shorter visits (skipping through) never become the plan
    },
    audience: { helloDelayMs: 300, fullscreenHintMs: 20000 },
    pointer: {                                        // spotlight (L) and zoom (Z); the mouse wheel or + and − change the size
      spotlightSizePercent: 20,                       // start radius of the circle, % of the slide height (Settings can change it)
      minSpotlightSizePercent: 8, maxSpotlightSizePercent: 50,   // also the limits for the mouse wheel and + / −
      spotlightDimPercent: 78,                        // how dark outside the circle, % (Settings can change it)
      maxSpotlightDimPercent: 95,
      followHideMs: 1500,                             // "show while the mouse moves": hide this long after the mouse stops
      zoomLevel: 2, minZoomLevel: 1.5, maxZoomLevel: 4,
      wheelFactor: 1.15,                              // one wheel tick or + / − press makes it this much bigger or smaller
    },
    notes: { minScale: .7, maxScale: 2.2, scaleStep: .15 },   // text size of the speaker notes (A− / A+)
    print: { landscapeWidthMm: 277, portraitWidthMm: 190 },  // slide width on an A4 page with 10 mm margins
    toastMs: 7000,
    storageKeys: {                                    // settings saved in this browser (localStorage);
      colors: 'colors',                               //   each key gets the deck id in front, e.g. "talk-deck.colors",
      theme: 'theme',                                 //   so two presentations never share settings
      themes: 'themes',
      estimates: 'estimates',
      notesScale: 'notesScale',
      spotlight: 'spotlight',
      slideTexts: 'slideTexts',                       // texts changed in the Texts drawer
      interfaceTexts: 'interfaceTexts',
      booth: 'booth',
      captions: 'captions',
    },
    exportFilePrefix: 'presentation',                 // exported files are named presentation-time-plan-<date>.json etc.
    copyFileName: 'Presentation.html',                // file name of "Save a copy with these settings"
  };

  // colours you can change in the settings panel: CSS token -> its label in the interface texts
  const COLOR_SETTINGS = [
    { token: '--color-background', labelKey: 'color.background' },
    { token: '--color-surface', labelKey: 'color.surface' },
    { token: '--color-line', labelKey: 'color.line' },
    { token: '--color-text', labelKey: 'color.text' },
    { token: '--color-text-muted', labelKey: 'color.textMuted' },
    { token: '--color-accent', labelKey: 'color.accent' },
    { token: '--color-teal', labelKey: 'color.teal' },
    { token: '--color-rose', labelKey: 'color.rose' },
    { token: '--color-violet', labelKey: 'color.violet' },
    { token: '--color-presenter-background', labelKey: 'color.presenterBackground' },
  ];
  /** Besides its colours, a theme can set its look: the three fonts (titles, text, labels), how round the corners are
      (a factor: 0 square, 1 as designed), the letter spacing of titles, and how wide titles are drawn (font-stretch). */
  const THEME_STYLE_TOKENS = ['--font-display', '--font-body', '--font-mono', '--radius-scale', '--title-tracking', '--display-stretch'];

