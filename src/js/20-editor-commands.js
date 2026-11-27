  /* ===========================================================================
     20c. EDITOR COMMANDS: find any action, the bar over the selection, number
          labels you drag, the hint on an empty slide (the object editorCommands)
     FIND AN ACTION   Ctrl+K (or / when you are not typing), or ⌕ in the top bar:
                      type a few letters of what you want ("ins sta" finds Insert
                      a star); ↑ ↓ choose, Enter does it, Esc closes. Each row shows
                      its key. Without a selection, actions for an element are
                      greyed (with the reason). The last ones you used come first.
                      "Go to" rows open a slide by its number or title.
                      It also finds every SETTING of the Element, Slide and
                      Presentation tabs, in everyday words too ("transparent" finds
                      Opacity, "confetti" Celebrate): a field opens its tab and
                      points at it; a choice in a list ("Look: Duotone, teal")
                      is applied at once (settingRows, read from the panels' own
                      HTML, so a new field is found without listing it here).
     TEXT BAR         above the words you select while typing on the slide: B (bold),
                      I (italic), S (struck through), A− / A+ (smaller, bigger), 🎨 (a colour of
                      the theme), Accent, Plain and 🔗 Link (type the address, Enter;
                      a slide of this file: #its-name). Ctrl+B / Ctrl+I do the same.
     SELECTION BAR    next to the selected element (above or below it, clear of its
                      handles and of other elements; else at the top of the canvas): the most used
                      controls: Bold / Accent / Plain and smaller / bigger for a
                      text, Replace for an image, Front / Back for a freely placed
                      one, Animate (the quick animations), Duplicate, Delete, and ⋯
                      (the full right-click menu). It fades as the pointer moves away
                      (as a desktop program's mini toolbar), so it never stays in the
                      way, and hides while you drag or the slide plays.
     NUMBER LABELS    drag the name of a number field (X, Y, Width, Rotation …)
                      left or right to change it (Shift: 10 times faster, Alt: 10
                      times finer); one undo step per drag.
     EMPTY SLIDE      a hint in the middle: double-click to add text, + Insert,
                      Ctrl+K.
     MENU BAR         File, Edit, Insert, Format, Slide, Animate, Arrange, View, Help: every
                      action with its key; ✓ for switches. A click opens a menu,
                      then the pointer moves between them; Alt (alone) or F10
                      puts the keyboard on it: ← → menus, ↓ opens, ↑ ↓ items,
                      Enter does it, Esc back.
     DOCKS            the slide list (left) and the panel (right) hide to a tab at
                      the edge; the pointer on the tab opens it (after 280 ms), it
                      closes again 500 ms after the pointer left (not while you
                      type in it); 📌 keeps it open (remembered in this browser,
                      for every presentation).
     STATUS BAR       saved or not, the file, slide n / m, the selection (its
                      place, size and angle), zoom, grid and snap.
     DESKTOP KEYS     F5 plays from here, Ctrl+M a new slide, Ctrl+Shift+D
                      duplicates the slide; the browser's own right-click menu
                      only in text fields.
     =========================================================================== */

  /** The actions to find: [id, interface text, key (shown), what it does, what it needs]. Needs: 'element' (a selection),
      'free' (a freely placed one), 'text', 'image'. What it does: { action } (a button's data-action), { menu } (the
      right-click menu), { insert } (a block), or a function. */
  const COMMANDS = [
    ['insert-textbox', 'cmd.insertTextbox', '', { insert: 'textbox' }], ['insert-label', 'cmd.insertLabel', '', { insert: 'label' }], ['insert-note', 'cmd.insertNote', '', { insert: 'note' }], ['insert-icon', 'cmd.insertIcon', '', { insert: 'icon' }], ['insert-heading', 'cmd.insertHeading', '', { insert: 'heading' }],
    ['insert-text', 'cmd.insertText', '', { insert: 'text' }], ['insert-list', 'cmd.insertList', '', { insert: 'list' }], ['insert-columns', 'cmd.insertColumns', '', { insert: 'columns' }],
    ['insert-image', 'cmd.insertImage', '', { insert: 'image' }], ['insert-video', 'cmd.insertVideo', '', { insert: 'video' }], ['insert-sound', 'cmd.insertSound', '', { insert: 'sound' }],
    ['insert-chart', 'cmd.insertChart', '', { insert: 'chart' }], ['insert-cards', 'cmd.insertCards', '', { insert: 'cards' }],
    ['insert-numbers', 'cmd.insertNumbers', '', { insert: 'numbers' }], ['insert-progress', 'cmd.insertProgress', '', { insert: 'progress' }], ['insert-ring', 'cmd.insertRing', '', { insert: 'ring' }], ['insert-steps', 'cmd.insertSteps', '', { insert: 'steps' }], ['insert-roadmap', 'cmd.insertRoadmap', '', { insert: 'roadmap' }], ['insert-table', 'cmd.insertTable', '', { insert: 'table' }], ['insert-quote', 'cmd.insertQuote', '', { insert: 'quote' }],
    ['insert-qr', 'cmd.insertQr', '', { insert: 'qr' }], ['insert-agenda', 'cmd.insertAgenda', '', { insert: 'agenda' }],
    ['insert-rect', 'cmd.insertRect', '', { insert: 'rect' }], ['insert-circle', 'cmd.insertCircle', '', { insert: 'circle' }], ['insert-triangle', 'cmd.insertTriangle', '', { insert: 'triangle' }],
    ['insert-arrow', 'cmd.insertArrow', '', { insert: 'arrow' }], ['insert-line', 'cmd.insertLine', '', { insert: 'line' }],
    ['insert-star', 'cmd.insertStar', '', { insert: 'star' }], ['insert-diamond', 'cmd.insertDiamond', '', { insert: 'diamond' }], ['insert-hexagon', 'cmd.insertHexagon', '', { insert: 'hexagon' }],
    ['insert-heart', 'cmd.insertHeart', '', { insert: 'heart' }], ['insert-chevron', 'cmd.insertChevron', '', { insert: 'chevron' }], ['insert-check', 'cmd.insertCheck', '', { insert: 'check' }], ['insert-cross', 'cmd.insertCross', '', { insert: 'cross' }], ['insert-plus', 'cmd.insertPlus', '', { insert: 'plus' }], ['insert-pentagon', 'cmd.insertPentagon', '', { insert: 'pentagon' }], ['insert-octagon', 'cmd.insertOctagon', '', { insert: 'octagon' }], ['insert-cloud', 'cmd.insertCloud', '', { insert: 'cloud' }], ['insert-curve', 'cmd.insertCurve', '', { insert: 'curve' }], ['insert-twoway', 'cmd.insertTwoway', '', { insert: 'twoway' }], ['insert-callout', 'cmd.insertCallout', '', { insert: 'callout' }],
    ['duplicate', 'cmd.duplicate', 'Ctrl+D', { action: 'duplicate' }, 'element'], ['delete', 'cmd.delete', 'Delete', { menu: 'delete' }, 'element'],
    ['copy', 'cmd.copy', 'Ctrl+C', { menu: 'copy' }, 'element'], ['cut', 'cmd.cut', 'Ctrl+X', { menu: 'cut' }, 'element'], ['paste', 'cmd.paste', 'Ctrl+V', { menu: 'paste' }, 'clipboard'],
    ['select-all', 'cmd.selectAll', 'Ctrl+A', { menu: 'select-all' }], ['select-like', 'cmd.selectLike', '', { menu: 'select-like' }, 'free'],
    ['parent', 'cmd.parent', 'Alt+↑', { action: 'parent' }, 'element'], ['free', 'cmd.free', '', { menu: 'free' }, 'element'],
    ['flip-x', 'cmd.flipX', '', { action: 'flip-x' }, 'element'], ['flip-y', 'cmd.flipY', '', { action: 'flip-y' }, 'element'],
    ['to-front', 'cmd.toFront', 'Ctrl+Shift+]', { action: 'to-front' }, 'free'], ['layer-forward', 'cmd.layerForward', 'Ctrl+]', { action: 'layer-forward' }, 'free'], ['layer-back', 'cmd.layerBack', 'Ctrl+[', { action: 'layer-back' }, 'free'], ['to-back', 'cmd.toBack', 'Ctrl+Shift+[', { action: 'to-back' }, 'free'],
    ['line-up-centre', 'cmd.lineUpCentre', '', { action: 'line-up-centre' }, 'free'], ['line-up-middle', 'cmd.lineUpMiddle', '', { action: 'line-up-middle' }, 'free'],
    ['copy-style', 'cmd.copyStyle', 'Ctrl+Alt+C', { action: 'copy-style' }, 'element'], ['paste-style', 'cmd.pasteStyle', 'Ctrl+Alt+V', { action: 'paste-style' }, 'element'],
    ['copy-appear', 'cmd.copyAppear', '', { action: 'copy-appear' }, 'element'], ['paste-appear', 'cmd.pasteAppear', '', { action: 'paste-appear' }, 'element'],
    ['spread-across', 'cmd.spreadAcross', '', { action: 'spread-across' }, 'several'], ['spread-down', 'cmd.spreadDown', '', { action: 'spread-down' }, 'several'],
    ['same-width', 'cmd.sameWidth', '', { action: 'same-width' }, 'several'], ['same-height', 'cmd.sameHeight', '', { action: 'same-height' }, 'several'], ['arrange-grid', 'cmd.arrangeGrid', '', { action: 'arrange-grid' }, 'several'],
    ['lock', 'cmd.lock', '', { menu: 'lock' }, 'element'], ['group', 'cmd.group', 'Ctrl+G', { action: 'group-make' }, 'several'], ['ungroup', 'cmd.ungroup', 'Ctrl+Shift+G', { action: 'group-break' }, 'element'],
    ['stagger', 'cmd.stagger', '', { action: 'stagger-forward' }], ['bold', 'cmd.bold', '', { action: 'bold' }, 'text'], ['accent', 'cmd.accent', '', { action: 'accent' }, 'text'],
    ['replace-image', 'cmd.replaceImage', '', { action: 'replace-image' }, 'image'],
    ['undo', 'cmd.undo', 'Ctrl+Z', { action: 'undo' }, 'undo'], ['redo', 'cmd.redo', 'Ctrl+Y', { action: 'redo' }, 'redo'], ['history', 'cmd.history', '', () => editorLayers.openHistory(editor.element.querySelector('[data-action="history"]'))],
    ['style-title', 'cmd.styleTitle', '', () => editorLayers.applyTextStyle('title'), 'text'], ['style-heading', 'cmd.styleHeading', '', () => editorLayers.applyTextStyle('heading'), 'text'],
    ['style-body', 'cmd.styleBody', '', () => editorLayers.applyTextStyle('body'), 'text'], ['style-caption', 'cmd.styleCaption', '', () => editorLayers.applyTextStyle('caption'), 'text'],
    ['style-label', 'cmd.styleLabel', '', () => editorLayers.applyTextStyle('label'), 'text'], ['style-quote', 'cmd.styleQuote', '', () => editorLayers.applyTextStyle('quote'), 'text'],
    ['style-plain', 'cmd.stylePlain', '', () => editorLayers.applyTextStyle('plain'), 'text'],
    ['animate-quick', 'cmd.animateQuick', '', () => editorCommands.runAction('bar-animate', editor.element.querySelector('.editor-quickbar:not([hidden]) [data-action="bar-animate"]') || editor.element.querySelector('.editor-menubar [data-menu-id="animate"]')), 'element'],
    ['draw-path', 'cmd.drawPath', '', () => editorMotion.toggleDrawing(), 'element'], ['morph-pair', 'cmd.morphPair', '', () => editorMotion.openMorphPicker(editor.element.querySelector('.editor-panel-body [data-action="morph-pair"]')), 'element'],
    ['play-slide', 'cmd.playSlide', '', { action: 'play-slide' }], ['record', 'cmd.record', '', () => { editor.panelTab = 'animations'; editor.renderPanel(); editorMotion.toggleRecording(); }],
    ['tab-animations', 'cmd.tabAnimations', '', () => { editor.panelTab = 'animations'; editor.renderPanel(); }], ['tab-layers', 'cmd.tabLayers', '', () => { editor.panelTab = 'layers'; editor.renderPanel(); }],
    ['tab-slide', 'cmd.tabSlide', '', () => { editor.panelTab = 'slide'; editor.renderPanel(); }], ['tab-code', 'cmd.tabCode', '', () => { editor.panelTab = 'code'; editor.renderPanel(); }], ['tab-deck', 'cmd.tabDeck', '', () => { editor.panelTab = 'deck'; editor.renderPanel(); }],
    ['add-slide', 'cmd.addSlide', '', { action: 'add-slide' }], ['duplicate-slide', 'cmd.duplicateSlide', '', { action: 'duplicate-slide' }], ['duplicate-glide', 'cmd.duplicateGlide', '', { action: 'duplicate-glide' }], ['delete-slide', 'cmd.deleteSlide', '', { action: 'delete-slide' }],
    ['overview', 'cmd.overview', 'O', { action: 'overview' }], ['grid', 'cmd.grid', 'G', { action: 'view-grid' }], ['snap', 'cmd.snap', '', { action: 'view-snap' }], ['tips', 'cmd.tips', '', { action: 'toggle-tips' }],
    ['zoom-in', 'cmd.zoomIn', 'Ctrl +', { action: 'zoom-in' }], ['zoom-out', 'cmd.zoomOut', 'Ctrl −', { action: 'zoom-out' }], ['zoom-selection', 'cmd.zoomSelection', 'Shift+2', { action: 'zoom-selection' }], ['zoom-fit', 'cmd.zoomFit', 'Ctrl+0', { action: 'zoom-fit' }],
    ['preview-transition', 'cmd.previewTransition', '', { action: 'preview-transition' }], ['replace-logo', 'cmd.replaceLogo', '', { action: 'replace-logo' }],
    ['save', 'cmd.save', 'Ctrl+S', { action: 'save' }], ['save-as', 'cmd.saveAs', 'Ctrl+Shift+S', { action: 'save-as' }], ['export-no-presenter', 'cmd.exportNoPresenter', '', { action: 'export-no-presenter' }], ['export-slides-only', 'cmd.exportSlidesOnly', '', { action: 'export-slides-only' }], ['export-clean', 'cmd.exportClean', '', { action: 'export-clean' }], ['new', 'cmd.new', '', { action: 'new' }], ['play', 'cmd.play', '', { action: 'play' }],
    ['welcome', 'cmd.welcome', '', () => editorCommands.showWelcome(true)],
    ['tips-again', 'cmd.tipsAgain', '', () => editorCommands.resetTips()],
    ['insert-date', 'cmd.insertDate', '', { action: 'insert-date' }],
    ['change-layout', 'cmd.changeLayout', '', { action: 'change-layout' }],
    ['transition-all', 'cmd.transitionAll', '', { action: 'transition-all' }],
    // (found missing in a findability test: a break timer, guides and the check had no command of their own)
    ['insert-break', 'cmd.insertBreak', '', { insert: 'break' }],
    ['guide-x', 'cmd.guideX', '', { action: 'guide-add-x' }], ['guide-y', 'cmd.guideY', '', { action: 'guide-add-y' }],
    ['check-deck', 'cmd.checkDeck', '', () => editorCommands.revealSetting('deck', { attribute: 'data-action', value: 'check-deck', nth: 0, press: true })],
    // the slide's own settings, straight from the Slide menu and Ctrl+K (the Slide tab opens at that field)
    ['slide-notes', 'cmd.slideNotes', '', () => editorCommands.revealSetting('slide', { attribute: 'data-slide-field', value: 'notes', nth: 0 })],
    ['slide-time', 'cmd.slideTime', '', () => editorCommands.revealSetting('slide', { attribute: 'data-slide-field', value: 'estimate', nth: 0 })],
    ['slide-advance', 'cmd.slideAdvance', '', () => editorCommands.revealSetting('slide', { attribute: 'data-slide-field', value: 'advance', nth: 0 })],
    ['slide-skip', 'cmd.slideSkip', '', () => { editorCommands.revealSetting('slide', { attribute: 'data-slide-field', value: 'skip', nth: 0, press: true }); requestAnimationFrame(() => { if (editor.selected) showToast(ui(editor.selected.hasAttribute('data-skip') ? 'editor.skipOn' : 'editor.skipOff')); }); }],
    ['slide-backup', 'cmd.slideBackup', '', () => editorCommands.revealSetting('slide', { attribute: 'data-slide-field', value: 'backup', nth: 0, press: true })],   // (ticks it, or unticks: its message says which)
    ['slide-background', 'cmd.slideBackground', '', () => editorCommands.revealSetting('slide', { attribute: 'data-action', value: 'background-image', nth: 0 })],
    ['slide-transition', 'cmd.slideTransition', '', () => editorCommands.revealSetting('slide', { attribute: 'data-slide-field', value: 'transition', nth: 0 })],
    ['comment', 'cmd.comment', '', () => editorTools.openComment(editorCanvas.selected), 'element'],
    ['crop-image', 'cmd.crop', '', { action: 'crop-image' }, 'image'],
    ['find-replace', 'cmd.findReplace', 'Ctrl+H', () => editorCommands.revealSetting('deck', { attribute: 'data-find-field', value: 'find', nth: 0 })], ['export-pdf', 'cmd.exportPdf', '', { action: 'export-pdf' }],
    ['settings', 'cmd.settings', '', { action: 'settings' }], ['shortcuts', 'cmd.shortcuts', '?', { action: 'shortcuts' }], ['close', 'cmd.close', 'Esc', { action: 'close' }],
    // (v190, from a check against PowerPoint and Google Slides: where a basic user looks for these there)
    ['align-left', 'cmd.alignLeft', 'Ctrl+Shift+L', () => editorCommands.applySetting('element', 'data-tool-field', 'textAlign', 'left'), 'text'],
    ['align-centre', 'cmd.alignCentre', 'Ctrl+Shift+E', () => editorCommands.applySetting('element', 'data-tool-field', 'textAlign', 'center'), 'text'],
    ['align-right', 'cmd.alignRight', 'Ctrl+Shift+R', () => editorCommands.applySetting('element', 'data-tool-field', 'textAlign', 'right'), 'text'],
    ['list-bullets', 'cmd.listBullets', '', () => editorCommands.applySetting('element', 'data-element-field', 'bullets', ''), 'list'],
    ['list-numbers', 'cmd.listNumbers', '', () => editorCommands.applySetting('element', 'data-element-field', 'bullets', 'number'), 'list'],
    ['insert-slide-number', 'cmd.insertSlideNumber', '', () => editorCommands.showFooter('number')],
    ['insert-footer', 'cmd.insertFooter', '', () => editorCommands.showFooter('text')],
    ['print-handout', 'cmd.printHandout', '', { action: 'print-handout' }],
    ['import-slides', 'cmd.importSlides', '', () => editor.importSlides()],
    ['reset-layout', 'cmd.resetLayout', '', () => editorCanvas.resetLayout()],
    ['pen-help', 'cmd.penHelp', '', () => showToast(ui('editor.penHelp'))],
    ['check-spelling', 'cmd.checkSpelling', 'F7', () => editorCommands.startSpelling()],
    ['insert-link', 'cmd.insertLink', '', () => editorCommands.insertLink()],
    ['box-border', 'cmd.boxBorder', '', () => editorCommands.revealSetting('element', { attribute: 'data-tool-field', value: 'border', nth: 0 }), 'element'],   // (low in the Element tab: the Format menu goes there)
  ];

  /** The words on a slide (not its speaker notes): shown in the status bar, as Word and PowerPoint do. Text node by
      text node (no copy of the slide: this runs while you type and drag), so two blocks never run together into one word. */
  function wordCount(scene) {
    if (!scene) return 0;
    const skip = '.speaker-notes, style, script, template, svg';
    const walker = document.createTreeWalker(scene, NodeFilter.SHOW_TEXT, { acceptNode: node => node.parentElement && node.parentElement.closest(skip) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
    let count = 0;
    for (let node = walker.nextNode(); node; node = walker.nextNode()) count += (node.data.match(/[\p{L}\p{N}][\p{L}\p{N}'’.-]*/gu) || []).length;
    return count;
  }

  /** The menus of the menu bar: [id, interface text, command ids] ('-' a line). The commands: COMMANDS (and MENU_ONLY). */
  const MENUS = [
    ['file', 'menu.file', ['save', 'save-as', 'export-clean', 'export-no-presenter', 'export-slides-only', 'export-pdf', 'print-handout', 'new', 'import-slides', '-', 'play', '-', 'settings', '-', 'close']],
    ['edit', 'menu.edit', ['undo', 'redo', 'history', '-', 'cut', 'copy', 'paste', 'duplicate', 'delete', '-', 'select-all', 'select-like', 'parent', 'find', 'find-replace', 'check-spelling', '-', 'comment']],
    ['insert', 'menu.insert', ['insert-heading', 'insert-text', 'insert-list', 'insert-columns', 'insert-quote', 'insert-textbox', 'insert-label', 'insert-note', 'insert-date', 'insert-slide-number', 'insert-footer', 'insert-link', '-', 'insert-image', 'insert-video', 'insert-sound', 'insert-icon', 'insert-qr', '-', 'insert-chart', 'insert-cards', 'insert-numbers', 'insert-progress', 'insert-ring', 'insert-table', 'insert-steps', 'insert-roadmap', 'insert-agenda', 'insert-break', '-', 'insert-rect', 'insert-circle', 'insert-triangle', 'insert-arrow', 'insert-line', 'insert-star', 'insert-callout', 'insert-diamond', 'insert-hexagon', 'insert-heart', 'insert-chevron', 'insert-check', 'insert-cross', 'insert-plus', 'insert-pentagon', 'insert-octagon', 'insert-cloud', 'insert-curve', 'insert-twoway']],
    ['format', 'menu.format', ['style-title', 'style-heading', 'style-body', 'style-caption', 'style-label', 'style-quote', 'style-plain', '-', 'bold', 'accent', '-', 'align-left', 'align-centre', 'align-right', '-', 'list-bullets', 'list-numbers', 'insert-link', '-', 'box-border', '-', 'copy-style', 'paste-style']],
    ['slide', 'menu.slide', ['add-slide', 'duplicate-slide', 'duplicate-glide', 'import-slides', 'delete-slide', '-', 'change-layout', 'reset-layout', 'slide-background', 'slide-notes', 'slide-time', 'slide-advance', 'slide-skip', 'slide-backup', '-', 'slide-up', 'slide-down', 'overview', '-', 'slide-transition', 'preview-transition', '-', 'tab-slide']],
    ['animate', 'menu.animate', ['animate-quick', 'draw-path', 'morph-pair', '-', 'copy-appear', 'paste-appear', '-', 'play-slide', 'record', '-', 'tab-animations']],
    ['arrange', 'menu.arrange', ['to-front', 'layer-forward', 'layer-back', 'to-back', '-', 'flip-x', 'flip-y', '-', 'group', 'ungroup', '-', 'line-up-left', 'line-up-centre', 'line-up-right', 'line-up-top', 'line-up-middle', 'line-up-bottom', '-', 'spread-across', 'spread-down', 'same-width', 'same-height', 'arrange-grid', '-', 'free', 'lock']],
    ['view', 'menu.view', ['zoom-in', 'zoom-out', 'zoom-selection', 'zoom-fit', '-', 'grid', 'snap', 'guide-x', 'guide-y', '-', 'timeline', 'pin-left', 'pin-right', 'tips', '-', 'tab-layers', 'tab-deck', 'tab-code', '-', 'fullscreen']],
    ['help', 'menu.help', ['welcome', 'tips-again', 'shortcuts', 'pen-help', 'find']],
  ];
  /** Commands only in the menus (not in "find an action" twice). */
  const MENU_ONLY = [
    ['slide-up', 'cmd.slideUp', '', { action: 'slide-up' }], ['slide-down', 'cmd.slideDown', '', { action: 'slide-down' }],
    ['line-up-left', 'cmd.lineUpLeft', '', { action: 'line-up-left' }, 'free'], ['line-up-right', 'cmd.lineUpRight', '', { action: 'line-up-right' }, 'free'],
    ['line-up-top', 'cmd.lineUpTop', '', { action: 'line-up-top' }, 'free'], ['line-up-bottom', 'cmd.lineUpBottom', '', { action: 'line-up-bottom' }, 'free'],
  ];
  /** Everyday words for settings: a setting whose name or place has the key also answers to these words in "find an
      action" (a basic user types "transparent", not "Opacity"). English only, like the search itself. */
  const SEARCH_WORDS = {
    opacity: 'transparent transparency see through faded', look: 'filter photo effect black white grey gray colour color',
    celebrate: 'confetti party fireworks stars hearts emoji', 'stand out': 'highlight emphasise emphasize important attention pop accent', 'zoom in on it': 'close up magnify enlarge closer camera', 'dim the rest': 'dim darken highlight spotlight focus attention', template: 'layout reuse design master own layout', split: 'typewriter typing word by word letter by letter', confetti: 'celebrate party fireworks stars hearts emoji', shadow: 'drop shadow depth glow', edge: 'border outline stroke line',
    corners: 'rounded radius round', box: 'background fill card highlight', 'text fill': 'gradient colour color letters outline',
    repeat: 'loop forever endless keep going again infinite', 'speed curve': 'easing ease in out accelerate slow down',
    transition: 'between slides change effect', appear: 'animation entrance build fly in fade in show reveal on click one at a time', speed: 'duration time fast slow',
    easing: 'ease bounce spring smooth', font: 'typeface type letters', rotation: 'rotate turn tilt angle', frame: 'phone browser polaroid device mockup',
    caption: 'subtitle label under', zoom: 'crop enlarge magnify', focus: 'crop position part', 'slow zoom': 'ken burns pan move ken burns pan photo picture slow movement',
    order: 'sequence first later', background: 'wallpaper backdrop colour color image picture', notes: 'speaker notes', comment: 'note remark review feedback question todo', time: 'duration minutes seconds estimate',
    advance: 'auto play automatic self running timer kiosk loop', skip: 'hide hidden', count: 'number counter odometer roll', link: 'url hyperlink web address',
  };
  /** Everyday words for actions (as SEARCH_WORDS for settings): "new slide" finds Add a slide, "picture" Insert an image. */
  const COMMAND_WORDS = {
    // (from a findability test of 25 features: the words a beginner tried that found nothing)
    'insert-break': 'break pause coffee countdown timer clock', 'guide-x': 'guide ruler line alignment helper vertical', 'guide-y': 'guide ruler line alignment helper horizontal',
    tips: 'help hints explanations explain text hide show', 'check-deck': 'check errors problems proofread review before presenting mistakes', 'tab-code': 'css javascript js script code html custom developer',
    'export-clean': 'share send email give copy publish read only final', 'insert-qr': 'barcode scan phone link', 'insert-agenda': 'contents toc outline chapters menu navigation',
    'morph-pair': 'morph glide smooth move between slides magic move', 'duplicate-glide': 'glide smooth move between slides magic move',
    'draw-path': 'move along line curve route travel fly path',
    'add-slide': 'new slide page', 'duplicate-slide': 'copy slide', 'delete-slide': 'remove slide', 'slide-up': 'move slide earlier reorder', 'slide-down': 'move slide later reorder',
    'insert-image': 'picture photo logo screenshot', 'insert-video': 'movie film clip', 'insert-sound': 'audio music sound mp3 voice voiceover background music song', 'insert-list': 'bullet points bullets', 'insert-textbox': 'text box write type',
    'insert-chart': 'graph diagram bars', 'insert-table': 'grid rows columns', 'play': 'present presentation slideshow start show run',
    'free': 'resize smaller bigger size width height move anywhere', 'slide-transition': 'transition between slides effect', 'change-layout': 'layout design template arrange slide', 'slide-notes': 'speaker notes what to say script talk cue cards presenter', 'slide-time': 'planned time duration minutes seconds',
    'slide-advance': 'auto advance automatic next by itself timer seconds kiosk autoplay auto play loop repeat forever slideshow unattended', 'slide-skip': 'hide hidden skip slide', 'slide-background': 'background picture image wallpaper photo',
    'line-up-top': 'align top side by side', 'line-up-centre': 'center centre horizontally middle of the slide', 'line-up-middle': 'center centre vertically middle of the slide',
    'copy-style': 'format painter copy format formatting look', 'paste-style': 'format painter paste format formatting look', 'lock': 'lock freeze fix in place pin',
    'transition-all': 'same transition every slide all slides', 'animate-quick': 'animation effect spin loader loop forever fly in fly-in on a click appear on click reveal fly in slide in fade in zoom in', 'line-up-left': 'align left side by side', 'group': 'together combine join', 'insert-numbers': 'counter count up number',
     'undo': 'back mistake', 'save': 'store keep', 'export-pdf': 'print pdf handout paper save as pdf',
    'comment': 'note remark review feedback', 'insert-date': 'date today day', 'tips-again': 'tips hints help again', 'crop-image': 'cut trim picture', 'delete': 'remove erase', 'find-replace': 'search find text change word everywhere all slides rename swap',
    'overview': 'slide sorter sorter grid all slides thumbnails reorder', 'paste': 'paste plain text without formatting unformatted',
    'align-left': 'align left text alignment', 'align-centre': 'align center centre text alignment middle', 'align-right': 'align right text alignment',
    'list-bullets': 'bullets bulleted list points dots', 'list-numbers': 'numbered list numbering 1 2 3 ordered',
    'insert-slide-number': 'page number slide number numbering footer', 'insert-footer': 'footer bottom text every slide name date',
    'print-handout': 'print handout notes paper speaker notes',
    'shortcuts': 'keyboard shortcuts keys hotkeys key list', 'accent': 'accent highlight colour color amber stand out', 'bold': 'bold strong heavy thick fat', 'pen-help': 'pen draw drawing highlighter annotate mark ink write on slide presenting',
    'slide-backup': 'backup extra spare slide hidden appendix only when asked questions',
    'insert-link': 'link hyperlink url website web address internet page button go to slide',
    'check-spelling': 'spelling spell check typos mistakes proofread words dictionary',
    'tab-deck': 'theme colours colors all slides text size bigger larger classroom fonts', 'box-border': 'border edge outline frame line around padding space inside room box',
    'reset-layout': 'reset layout put back original positions undo moves restore tidy',
    'import-slides': 'import insert slides from another file presentation reuse old deck copy slides merge combine',
  };
  /** Settings of other kinds of element, so "find an action" finds them when such an element is not selected: [the kind
      (interface text), where it is on the slide (selector), its settings: [label, attribute, value, press (a button)]].
      Chosen: the first such element on the slide is selected and the setting opens; none on the slide: it says to insert one. */
  const OTHER_KIND_SETTINGS = [
    ['cmd.kindPicture', 'img', [['editor.imageLook', 'data-tool-field', 'imageLook'], ['editor.imageFrame', 'data-tool-field', 'imageFrame'], ['editor.adjustBrightness', 'data-tool-field', 'adjust-brightness'],
      ['editor.kenBurns', 'data-tool-field', 'kenBurns'], ['editor.cropButton', 'data-action', 'crop-image', true]]],
    ['cmd.kindChart', '.chart', [['editor.chartRows', 'data-element-field', 'chartRows'], ['editor.chartType', 'data-element-field', 'chartType'], ['editor.chartUnit', 'data-element-field', 'chartUnit']]],
    ['cmd.kindNumber', '.count-up', [['editor.numberValue', 'data-element-field', 'countUp'], ['editor.countStyle', 'data-element-field', 'countStyle']]],
    ['cmd.kindShape', '.shape', [['editor.shapeFill', 'data-tool-field', 'shapeFill'], ['editor.shapeStroke', 'data-tool-field', 'shapeStroke']]],
    ['cmd.kindText', '.content h1, .content h2, .content p', [['editor.textSize', 'data-tool-field', 'fontSize'], ['editor.colour', 'data-tool-field', 'color'], ['editor.shadow', 'data-tool-field', 'shadow'],
      ['editor.edge', 'data-tool-field', 'border'], ['editor.padding', 'data-tool-field', 'padding'], ['editor.align', 'data-tool-field', 'textAlign']]],
  ];
  /** Tips at the moment of use: the first time an element of a kind is selected (in this browser), one line names the
      most useful thing to do with it; each tip once (Help › Show the tips again). [selector, interface text]. */
  const TIPS = [['img, .image-frame', 'cmd.tipPicture'], ['.chart', 'cmd.tipChart'], ['.count-up, .stat', 'cmd.tipNumber'], ['.shape', 'cmd.tipShape'],
    ['.big-list, .big-list li', 'cmd.tipList'], ['h1, h2, h3, p, .text-box', 'cmd.tipText']];
  const TIPS_KEY = 'presentation-editor.tips';
  /** Layout of the editor (docks pinned or not): one choice for every presentation in this browser. */
  const LAYOUT_KEY = 'presentation-editor.layout';

  /** 🎨 in the text bar: the theme's colours as variables (a new theme recolours the words too); '' is the text's own colour. */
  const TEXT_COLOURS = [['', 'cmd.colourOwn'], ['var(--color-accent)', 'cmd.colourAccent'], ['var(--color-teal)', 'cmd.colourTeal'], ['var(--color-rose)', 'cmd.colourRose'],
    ['var(--color-violet)', 'cmd.colourViolet'], ['var(--color-text-muted)', 'cmd.colourMuted']];

  const editorCommands = {
    palette: null,     // the open "find an action" window: { box, input, list, rows, index }
    menu: null,        // the open menu of the menu bar: { id, box, button }
    // pinned docks: shown at first for a new user (the slides and the settings), as far as the window leaves the slide room:
    // the settings from 1100 px wide, the slide list too from 1500 px; 📌 shows or hides one (remembered)
    layout: { left: window.innerWidth >= 1500, right: window.innerWidth >= 1100 },

    /** Once, when the editor is built: the menu bar, the docks, the keys of a desktop program. */
    setUp() {
      const element = editor.element;
      this.setUpDropping(element.querySelector('.editor-canvas'));
      // ⚠ Content runs off the slide: a click selects the block that does it
      element.querySelector('.status-overflow').addEventListener('click', () => this.selectOverflowing());
      element.querySelector('.status-overflow').addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); this.selectOverflowing(); } });
      element.querySelector('.editor-menubar').innerHTML = MENUS.map(([id, label]) => '<button role="menuitem" aria-haspopup="true" aria-expanded="false" data-menu-id="' + id + '">' + escapeHtml(ui(label)) + '</button>').join('');
      const bar = element.querySelector('.editor-menubar');
      bar.addEventListener('click', event => { const button = event.target.closest('[data-menu-id]'); if (button) { if (this.menu && this.menu.id === button.dataset.menuId) this.closeMenu(); else this.openMenu(button.dataset.menuId); } });
      bar.addEventListener('pointerover', event => { const button = event.target.closest('[data-menu-id]'); if (button && this.menu && this.menu.id !== button.dataset.menuId) this.openMenu(button.dataset.menuId); });   // one open: the pointer moves between them
      bar.addEventListener('keydown', event => this.onMenubarKey(event));
      // Alt alone (pressed and let go, nothing else in between) or F10: the keyboard on the menu bar
      window.addEventListener('keydown', event => { this.altAlone = event.key === 'Alt' && !event.repeat; }, true);
      window.addEventListener('pointermove', () => { this.altAlone = false; }, true);
      window.addEventListener('keyup', event => {
        if (event.key === 'Alt' && this.altAlone && editor.isOpen() && !this.palette) { event.preventDefault(); this.focusMenubar(); }
        this.altAlone = false;
      }, true);
      // a layout chosen before keeps its meaning (a side not in it is hidden); nothing chosen yet (a new user): both shown
      try { const stored = localStorage.getItem(LAYOUT_KEY); if (stored !== null) Object.assign(this.layout, { left: false, right: false }, JSON.parse(stored || '{}')); } catch (e) { /* no storage: both shown */ }
      element.querySelectorAll('.editor-edge-tab').forEach(tab => {
        const side = tab.dataset.dock;
        tab.addEventListener('pointerenter', () => { clearTimeout(this.dockClose && this.dockClose[side]); this.dockOpenTimer = setTimeout(() => this.openDock(side), CONFIG.editor.dockOpenMs); });
        tab.addEventListener('pointerleave', () => { clearTimeout(this.dockOpenTimer); this.closeDockSoon(side); });
        tab.addEventListener('click', () => { clearTimeout(this.dockOpenTimer); this.openDock(side); });
      });
      element.querySelectorAll('.editor-dock').forEach(dock => {
        const side = dock.dataset.dock;
        dock.addEventListener('pointerenter', () => clearTimeout(this.dockClose && this.dockClose[side]));
        dock.addEventListener('pointerleave', () => this.closeDockSoon(side));
      });
      element.querySelector('.editor-canvas').addEventListener('pointerdown', () => ['left', 'right'].forEach(side => {   // a click on the slide closes an open dock
        const dock = this.dockOf(side);
        if (dock && !this.layout[side] && dock.contains(document.activeElement)) document.activeElement.blur();   // its field gives up the keyboard (its change is kept)
        this.closeDock(side);
      }), true);
      // the browser's own right-click menu only in text fields (this is a program, not a page)
      element.addEventListener('contextmenu', event => { if (!event.target.closest('input, textarea, [contenteditable="true"]') && !event.defaultPrevented) event.preventDefault(); });
      window.addEventListener('pointermove', event => { this.pointerAt = { x: event.clientX, y: event.clientY }; this.fadeBar(); }, { passive: true });
      document.addEventListener('selectionchange', () => this.onSelectionChange());   // the text bar above selected words
      document.addEventListener('scroll', event => { if (event.target.matches && event.target.matches('.editor-canvas-scroll')) this.placeTextBar(); }, true);
      this.applyLayout();
      this.showTips(this.tipsShown());
      let resizeFrame = 0;
      window.addEventListener('resize', () => { cancelAnimationFrame(resizeFrame); resizeFrame = requestAnimationFrame(() => { if (editor.isOpen()) this.applyLayout(); }); });
    },

    /* ======== TEXT BAR ======== */

    /** Words selected in a text on the slide: the bar above them (it never takes the selection away). */
    onSelectionChange() {
      if (!editor.isOpen()) return;
      const bar = editor.element.querySelector('.editor-textbar');
      if (bar && bar.contains(document.activeElement)) return;   // typing an address in it
      const selection = window.getSelection();
      const range = selection && selection.rangeCount ? selection.getRangeAt(0) : null;
      const node = range && (range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement);
      const host = node && node.closest('[contenteditable="true"]');
      if (!range || selection.isCollapsed || !host || !editorCanvas.scene || !editorCanvas.scene.contains(host) || editorTools.playStep >= 0) { this.hideTextBar(); return; }
      this.showTextBar(range);
    },
    showTextBar(range) {
      let bar = editor.element.querySelector('.editor-textbar');
      if (!bar) {
        bar = document.createElement('div');
        bar.className = 'editor-textbar';
        bar.setAttribute('role', 'toolbar');
        bar.setAttribute('aria-label', ui('cmd.textBarLabel'));
        const button = (action, label, title, cls) => '<button data-action="' + action + '"' + (cls ? ' class="' + cls + '"' : '') + ' title="' + escapeHtml(ui(title)) + '" aria-label="' + escapeHtml(ui(title)) + '">' + escapeHtml(ui(label)) + '</button>';
        const swatch = (colour, title) => '<button data-action="text-colour" data-colour="' + colour + '" title="' + escapeHtml(ui(title)) + '" aria-label="' + escapeHtml(ui(title)) + '" style="--swatch: ' + (colour || 'var(--color-text)') + '">' + (colour ? '' : '×') + '</button>';
        bar.innerHTML = button('bold', 'cmd.textB', 'cmd.textBTooltip', 'is-bold') + button('text-italic', 'cmd.textI', 'cmd.textITooltip', 'is-italic') + button('text-strike', 'cmd.textS', 'cmd.textSTooltip', 'is-strike') + button('text-underline', 'cmd.textU', 'cmd.textUTooltip', 'is-underline') +
          button('text-sup', 'cmd.textSup', 'cmd.textSupTooltip') + button('text-sub', 'cmd.textSub', 'cmd.textSubTooltip') +
          button('text-smaller', 'cmd.textSmaller', 'cmd.textSmallerTooltip') + button('text-bigger', 'cmd.textBigger', 'cmd.textBiggerTooltip') + button('text-colours', 'cmd.textColour', 'cmd.textColourTooltip') +
          button('text-marker', 'cmd.textMarker', 'cmd.textMarkerTooltip') + button('accent', 'cmd.barAccent', 'cmd.accent') + button('plain', 'cmd.barPlain', 'cmd.plain') +
          button('text-link', 'cmd.textLink', 'cmd.textLinkTooltip') +
          '<span class="editor-textbar-colours" hidden>' + TEXT_COLOURS.map(([colour, title]) => swatch(colour, title)).join('') + '</span>' + '<input class="editor-textbar-link" type="text" hidden placeholder="' + escapeHtml(ui('cmd.textLinkPlaceholder')) + '" aria-label="' + escapeHtml(ui('cmd.textLinkTooltip')) + '">' +
          '<select class="editor-textbar-slide" hidden aria-label="' + escapeHtml(ui('cmd.textLinkSlide')) + '"></select>';   // (or a slide of this presentation, from a list)
        bar.addEventListener('mousedown', event => { if (!event.target.matches('input, select, option')) event.preventDefault(); });   // the words stay selected
        // a slide chosen from the list with the mouse: the link is made; with the keyboard (↓ changes the choice at once):
        // only Enter makes it, Esc goes back to the words
        const slides = bar.querySelector('.editor-textbar-slide');
        slides.addEventListener('pointerdown', () => { slides.dataset.keys = ''; });
        slides.addEventListener('keydown', event => {
          event.stopPropagation();   // (the slide never gets these keys)
          slides.dataset.keys = '1';
          if (event.key === 'Enter' && slides.value) { event.preventDefault(); this.addLink(slides.value); }
          else if (event.key === 'Escape') { event.preventDefault(); this.closeLinkField(true); }
        });
        slides.addEventListener('change', () => { if (slides.value && !slides.dataset.keys) this.addLink(slides.value); });
        bar.querySelector('input').addEventListener('keydown', event => {
          event.stopPropagation();   // (the slide never gets these keys)
          if (event.key === 'Enter') { event.preventDefault(); this.addLink(event.target.value); }
          else if (event.key === 'Escape') { event.preventDefault(); this.closeLinkField(true); }
        });
        editor.element.appendChild(bar);
      }
      const box = range.getBoundingClientRect();
      const area = editor.element.querySelector('.editor-canvas-scroll');
      const view = area && area.getBoundingClientRect();
      if (view && (box.bottom < view.top || box.top > view.bottom || box.right < view.left || box.left > view.right)) { bar.hidden = true; return; }   // the words scrolled out of sight
      bar.hidden = false;
      bar.style.maxWidth = view ? Math.max(200, view.width - 16) + 'px' : '';   // (a narrow slide area: two rows, never over the slide list)
      const top = box.top - bar.offsetHeight - 10 >= 8 ? box.top - bar.offsetHeight - 10 : box.bottom + 10;   // above the words (no room: under them)
      // within the slide's area (not over the slide list or the panel), unless that area is narrower than the bar
      const low = view && view.width > bar.offsetWidth + 16 ? view.left + 8 : 8, high = view && view.width > bar.offsetWidth + 16 ? view.right - bar.offsetWidth - 8 : window.innerWidth - bar.offsetWidth - 8;
      bar.style.left = clamp(box.left + box.width / 2 - bar.offsetWidth / 2, low, high) + 'px';
      bar.style.top = top + 'px';
    },
    /** The canvas scrolled or zoomed: the bar goes with its words (or hides while they are out of sight). */
    placeTextBar() {
      const bar = editor.element && editor.element.querySelector('.editor-textbar');
      if (!bar) return;
      if (bar.contains(document.activeElement) && this.linkRange) this.showTextBar(this.linkRange);   // typing an address
      else this.onSelectionChange();
    },
    hideTextBar() {
      const bar = editor.element && editor.element.querySelector('.editor-textbar');
      if (bar && !bar.hidden) { this.closeLinkField(false); bar.hidden = true; bar.querySelector('.editor-textbar-colours').hidden = true; }
    },
    /** 🔗: the address field in the bar (the selected words are kept to put the link on). */
    openLinkField() {
      const selection = window.getSelection();
      if (!selection.rangeCount || selection.isCollapsed) { showToast(ui('editor.selectWordsFirst')); return; }
      this.linkRange = selection.getRangeAt(0).cloneRange();
      const field = editor.element.querySelector('.editor-textbar-link');
      const existing = selection.anchorNode && (selection.anchorNode.nodeType === Node.ELEMENT_NODE ? selection.anchorNode : selection.anchorNode.parentElement).closest('a');
      field.value = existing ? existing.getAttribute('href') || '' : '';
      field.hidden = false;
      // a slide of this presentation from a list (no #name to remember)
      const slides = editor.element.querySelector('.editor-textbar-slide');
      slides.innerHTML = '<option value="">' + escapeHtml(ui('cmd.textLinkSlide')) + '</option>' + editor.modelScenes().map((scene, index) =>
        '<option value="#' + escapeHtml(scene.getAttribute('data-name')) + '">' + escapeHtml((index + 1) + '. ' + (scene.getAttribute('data-title') || scene.getAttribute('data-name'))) + '</option>').join('');
      slides.hidden = false;
      field.focus();
    },
    closeLinkField(backToText) {
      const field = editor.element && editor.element.querySelector('.editor-textbar-link');
      if (!field || field.hidden) return;
      field.hidden = true;
      editor.element.querySelector('.editor-textbar-slide').hidden = true;
      if (backToText && this.linkRange) {   // the words selected again
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(this.linkRange);
      }
      this.linkRange = null;
    },
    addLink(text) {
      let address = String(text || '').trim();
      if (!address) { this.closeLinkField(true); return; }
      if (address.startsWith('#') && !editor.modelScenes().some(scene => scene.getAttribute('data-name') === address.slice(1))) { showToast(ui('editor.linkNoSlide', { name: address.slice(1) })); return; }   // a slide of this file that exists
      if (!/^(https?:|mailto:|#)/i.test(address)) {
        if (/^[a-z][a-z0-9+.-]*:(?!\d+(\/|$))/i.test(address)) { showToast(ui('editor.linkRefused')); return; }   // javascript:, data: … never
        address = 'https://' + address;   // "example.com"
      }
      const range = this.linkRange;
      this.closeLinkField(false);
      if (!range) return;
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      editorCanvas.formatSelection('link', address);
      this.hideTextBar();
    },

    /* ======== TIPS ======== */
    /** The panel's explanations (notes marked is-tip, the hint under a field) show only with Tips on: the options stay,
        the reading goes (a field's hint is also its tooltip). Off at first; remembered in this browser. */
    tipsShown() {
      try { return localStorage.getItem('presentation-editor.tips') === 'on'; } catch (e) { return false; }
    },
    showTips(on) {
      try { localStorage.setItem('presentation-editor.tips', on ? 'on' : 'off'); } catch (e) { /* not remembered */ }
      editor.element.classList.toggle('show-tips', !!on);
      editor.element.querySelector('.editor-tips-toggle').setAttribute('aria-pressed', String(!!on));
    },

    /* ======== MENU BAR ======== */

    commandById(id) {
      const extra = {
        find: ['find', 'cmd.find', 'Ctrl+K', () => this.openPalette()],
        'pin-left': ['pin-left', 'cmd.pinLeft', '', () => this.pin('left')],
        'pin-right': ['pin-right', 'cmd.pinRight', '', () => this.pin('right')],
        timeline: ['timeline', 'cmd.timeline', 'T', () => editorTimeline.toggle()],
        fullscreen: ['fullscreen', 'cmd.fullscreen', 'F11', () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {})],
      };
      return extra[id] || COMMANDS.find(command => command[0] === id) || MENU_ONLY.find(command => command[0] === id);
    },
    /** A switch's state (✓ in the menu), or undefined for an action. */
    checked(id) {
      return { tips: this.tipsShown(), timeline: editorTimeline.open, grid: editorLayers.grid, snap: editorLayers.snapping, 'pin-left': this.layout.left, 'pin-right': this.layout.right, fullscreen: !!document.fullscreenElement }[id];
    },
    openMenu(id) {
      this.closeMenu();
      const entry = MENUS.find(menu => menu[0] === id);
      const button = editor.element.querySelector('.editor-menubar [data-menu-id="' + id + '"]');
      if (!entry || !button) return;
      const box = document.createElement('div');
      box.className = 'editor-menu editor-menubar-menu';
      box.setAttribute('role', 'menu');
      box.innerHTML = entry[2].map(commandId => {
        if (commandId === '-') return '<hr>';
        const command = this.commandById(commandId);
        if (!command) return '';
        const [, label, keys, , needs] = command;
        const reason = this.blockedReason(needs);
        const state = this.checked(commandId);
        return '<button role="' + (state === undefined ? 'menuitem' : 'menuitemcheckbox') + '" data-command="' + commandId + '"' + (state !== undefined ? ' aria-checked="' + state + '"' : '') + (reason ? ' aria-disabled="true" title="' + escapeHtml(reason) + '"' : '') + '>' +
          '<span class="menu-check">' + (state ? '✓' : '') + '</span><span class="menu-label">' + escapeHtml(ui(label)) + '</span><kbd>' + escapeHtml(keys || '') + '</kbd></button>';
      }).join('');
      editor.element.appendChild(box);
      const place = button.getBoundingClientRect();
      // taller than the room under its button: two columns side by side (all of Insert at a glance, no long scroll)
      if (box.scrollHeight > window.innerHeight - place.bottom - 16 && window.innerWidth >= 560) box.classList.add('is-columns');
      box.style.left = Math.min(place.left, window.innerWidth - box.offsetWidth - 8) + 'px';
      box.style.top = place.bottom + 2 + 'px';
      fitMenuOnScreen(box, true);   // (a long menu scrolls, under its button)
      button.setAttribute('aria-expanded', 'true');
      button.classList.add('is-open');
      box.addEventListener('click', event => { const item = event.target.closest('[data-command]'); if (item) this.runFromMenu(item); });
      box.addEventListener('keydown', event => this.onMenuKey(event));
      this.menuOutside = event => { if (!box.contains(event.target) && !event.target.closest('.editor-menubar')) this.closeMenu(); };
      document.addEventListener('pointerdown', this.menuOutside, true);
      this.menu = { id, box, button };
      return box;
    },
    closeMenu(focusButton) {
      if (!this.menu) return false;
      const { box, button } = this.menu;
      box.remove();
      button.setAttribute('aria-expanded', 'false');
      button.classList.remove('is-open');
      document.removeEventListener('pointerdown', this.menuOutside, true);
      this.menu = null;
      if (focusButton) button.focus();
      return true;
    },
    runFromMenu(item) {
      if (item.getAttribute('aria-disabled') === 'true') { showToast(item.title); return; }
      const id = item.dataset.command;
      this.closeMenu();
      this.runCommand(id);
    },
    /** Runs a command by its id (the menus and "find an action" share this). */
    runCommand(id) {
      const command = this.commandById(id);
      if (!command) return;
      const run = command[3];
      // like the buttons: a change first brings the still slide back (the playing copy is never written); looking does not
      if (editorTools.playStep >= 0 && !/^(zoom-|grid$|snap$|play-slide$|record$|tab-|history$|shortcuts$|go-|find$|pin-|fullscreen$|timeline$|animate-quick$|morph-pair$)/.test(id)) editorTools.stopPlaying();
      const reason = this.blockedReason(command[4]);   // (a key for a command that needs a selection: says what it needs, as the greyed menu row does)
      if (reason) { showToast(reason); return; }
      runSafely('editor command: ' + id, () => {
        if (typeof run === 'function') run();
        else if (run.insert) editorCanvas.insertBlock(run.insert);
        else if (run.menu) editorTools.runMenu(run.menu);
        else editor.runAction(run.action, editor.element.querySelector('[data-action="' + run.action + '"]'));
      });
      if (/^tab-|^record$/.test(id)) this.openDock('right');   // a tab of the panel: show the panel
    },
    focusMenubar() {
      const first = editor.element.querySelector('.editor-menubar [data-menu-id]');
      if (first) first.focus();
    },
    onMenubarKey(event) {
      const buttons = Array.from(editor.element.querySelectorAll('.editor-menubar [data-menu-id]'));
      const index = buttons.indexOf(document.activeElement);
      if (index < 0) return;
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); buttons[(index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length].focus(); }
      else if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        const box = this.openMenu(buttons[index].dataset.menuId);
        const first = box && box.querySelector('[data-command]');
        if (first) first.focus();
      } else if (event.key === 'Escape') { event.preventDefault(); if (this.menu) this.closeMenu(true); else buttons[index].blur(); }   // first the open menu, then leave the bar
    },
    onMenuKey(event) {
      const items = Array.from(this.menu.box.querySelectorAll('[data-command]'));
      const index = items.indexOf(document.activeElement);
      event.stopPropagation();   // the slide never gets these keys
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); items[(index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus(); }
      else if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); items[event.key === 'Home' ? 0 : items.length - 1].focus(); }   // the first / last row
      else if (event.key === 'Escape') { event.preventDefault(); this.closeMenu(true); }
      else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        const ids = MENUS.map(menu => menu[0]);
        const next = ids[(ids.indexOf(this.menu.id) + (event.key === 'ArrowRight' ? 1 : -1) + ids.length) % ids.length];
        const box = this.openMenu(next);
        const first = box && box.querySelector('[data-command]');
        if (first) first.focus();
      } else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (items[index]) this.runFromMenu(items[index]); }
    },
    /** Keys of a desktop program (called by the editor's keys). True when handled. */
    onAppKey(event, typing) {
      const ctrl = event.ctrlKey || event.metaKey;
      if (event.defaultPrevented && event.target.closest && event.target.closest('.editor-menubar')) return true;   // the menu bar took the key (Esc there never closes the editor)
      if (event.key === 'F10' && !ctrl && !event.shiftKey) { event.preventDefault(); this.focusMenubar(); return true; }   // (Shift+F10: the right-click menu)
      if (event.key === 'F7' && !ctrl && !event.altKey) { event.preventDefault(); if (this.spell) this.spellStep(event.shiftKey ? -1 : 1); else this.startSpelling(); return true; }   // spelling, as in Word and PowerPoint (again: the next text)
      if (event.key === 'Escape' && this.spell) { event.preventDefault(); this.stopSpelling(); return true; }
      if (event.key === 'F5' && !ctrl) { event.preventDefault(); editor.runAction('play', editor.element.querySelector('[data-action="play"]')); return true; }
      // Ctrl+Shift+L / E / R: the text left, centred, right (as in Google Slides). Always taken: in a field of the panel
      // they do nothing (Ctrl+Shift+R would reload the page in the browser)
      const align = { l: 'align-left', e: 'align-centre', r: 'align-right' }[event.key.toLowerCase()];
      if (ctrl && event.shiftKey && !event.altKey && align) {
        event.preventDefault();
        const active = document.activeElement;
        if (!typing || (active.isContentEditable && editorCanvas.scene && editorCanvas.scene.contains(active))) this.runCommand(align);
        return true;
      }
      if (typing) return false;
      const menuOpen = (editorTools.menu && !editorTools.menu.hidden) || !!editorLayers.historyList;   // (those take every key themselves)
      if (!ctrl && !event.altKey && !event.shiftKey && !menuOpen && event.key.toLowerCase() === 't') { event.preventDefault(); editorTimeline.toggle(); return true; }   // the animation panel
      if (ctrl && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'm') { event.preventDefault(); this.runCommand('add-slide'); return true; }
      if (ctrl && event.shiftKey && !event.altKey && event.key.toLowerCase() === 'd') { event.preventDefault(); this.runCommand('duplicate-slide'); return true; }
      const canGroup = event.shiftKey ? !!(editorCanvas.selected && editorCanvas.selected.closest('[data-group]')) : editorTools.group.length > 1;
      if (ctrl && !event.altKey && event.key.toLowerCase() === 'g' && canGroup) { event.preventDefault(); this.runCommand(event.shiftKey ? 'ungroup' : 'group'); return true; }   // group, ungroup (nothing to do: the browser's own key)
      return false;
    },

    /** Insert › Link…: on the selected words, the link box of the text bar; else the selected element's Link (on a click
        while presenting) in the Element tab; nothing selected: how. */
    insertLink() {
      const selection = window.getSelection();
      const anchor = selection && selection.anchorNode && (selection.anchorNode.nodeType === Node.ELEMENT_NODE ? selection.anchorNode : selection.anchorNode.parentElement);
      if (selection && !selection.isCollapsed && anchor && anchor.closest('[contenteditable="true"]') && editorCanvas.scene && editorCanvas.scene.contains(anchor)) { this.openLinkField(); return; }
      if (editorCanvas.selected) { this.revealSetting('element', { attribute: 'data-element-field', value: 'linkUrl', nth: 0 }); return; }
      showToast(ui('cmd.linkHow'));
    },

    /* ======== SPELLING (F7, Edit › Check spelling) ========
       Offline there is no dictionary this page can read; the browser's own checker underlines the words of the text that
       has the keyboard. So Check spelling walks through every text of every slide, one at a time, with the keyboard in it:
       a misspelled word shows its red line, and a right-click on it offers the browser's corrections. */
    startSpelling() {
      const scenes = editor.modelScenes();
      if (!scenes.length) return;
      editor.closeDialog();
      this.spell = { slide: 0, text: -1 };
      editor.select(scenes[0]);
      this.spellBar(true);
      this.spellStep(1);
    },
    /** The texts of the slide on the canvas that have words (a text inside another text counts once). */
    spellTexts() {
      if (!editorCanvas.scene) return [];
      return Array.from(editorCanvas.scene.querySelectorAll('[contenteditable="true"]')).filter(host => host.textContent.trim() && !host.parentElement.closest('[contenteditable="true"]'));
    },
    /** The next (1) or previous (-1) text; past the last one of a slide: the next slide; past the last slide: done. */
    spellStep(direction) {
      const state = this.spell;
      if (!state) return;
      const scenes = editor.modelScenes();
      if (editor.selectedIndex() !== state.slide) { state.slide = Math.max(0, editor.selectedIndex()); state.text = direction > 0 ? -1 : this.spellTexts().length; }   // (another slide chosen meanwhile: go on from there)
      editorCanvas.finishTyping();
      let texts = this.spellTexts();
      let next = state.text + direction;
      while (next < 0 || next >= texts.length) {
        const slide = state.slide + direction;
        if (slide < 0 || slide >= scenes.length) { this.stopSpelling(ui(direction > 0 ? 'editor.spellEnd' : 'editor.spellFirst')); return; }
        state.slide = slide;
        editor.select(scenes[slide]);
        texts = this.spellTexts();
        next = direction > 0 ? 0 : texts.length - 1;
      }
      state.text = next;
      const host = texts[next];
      editorCanvas.selectElement(editorCanvas.blockOf(host) || host);
      const live = this.spellTexts()[next] || host;   // (selecting can draw the slide again)
      live.focus({ preventScroll: true });
      const range = document.createRange();
      range.selectNodeContents(live);
      range.collapse(true);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
      live.scrollIntoView({ block: 'nearest' });
      const where = editor.element.querySelector('.editor-spellbar .spell-where');
      if (where) where.textContent = ui('editor.spellWhere', { slide: state.slide + 1, slides: scenes.length, text: next + 1, texts: texts.length });
    },
    stopSpelling(message) {
      if (!this.spell) return;
      this.spell = null;
      this.spellBar(false);
      editorCanvas.finishTyping();
      if (document.activeElement && document.activeElement.isContentEditable) document.activeElement.blur();
      showToast(message || ui('editor.spellDone'));
    },
    /** The bar while checking: where you are, ◂ ▸, Done, and how the red lines work. */
    spellBar(show) {
      let bar = editor.element.querySelector('.editor-spellbar');
      if (!show) { if (bar) bar.hidden = true; return; }
      if (!bar) {
        bar = document.createElement('div');
        bar.className = 'editor-spellbar';
        bar.setAttribute('role', 'toolbar');
        bar.innerHTML = '<b data-ui="editor.spellTitle"></b><span class="spell-where"></span><button data-spell="-1" data-ui="editor.spellPrevious"></button><button data-spell="1" data-ui="editor.spellNext"></button><button data-spell="done" data-ui="editor.spellStop"></button><small data-ui="editor.spellHow"></small>';
        applyInterfaceTexts(bar);
        bar.addEventListener('mousedown', event => { if (event.target.closest('button')) event.preventDefault(); });   // (the text keeps the keyboard)
        bar.addEventListener('click', event => {
          const button = event.target.closest('[data-spell]');
          if (!button) return;
          if (button.dataset.spell === 'done') this.stopSpelling(); else this.spellStep(Number(button.dataset.spell));
        });
        editor.element.appendChild(bar);
      }
      bar.hidden = false;
    },

    /* ======== DOCKS ======== */

    applyLayout() {
      const element = editor.element;
      // (pinned, but the window is too narrow for it now: folded to its tab, without changing the choice; v215)
      element.classList.toggle('left-unpinned', !this.layout.left || window.innerWidth < 1100);
      element.classList.toggle('right-unpinned', !this.layout.right || window.innerWidth < 760);
      element.querySelectorAll('.editor-pin').forEach(pin => {
        const on = !!this.layout[pin.dataset.action === 'pin-left' ? 'left' : 'right'];
        pin.setAttribute('aria-pressed', String(on));
        pin.classList.toggle('is-pinned', on);
      });
      if (editorCanvas.stageElement) requestAnimationFrame(() => editorCanvas.fit());   // the slide gets the room
    },
    pin(side) {
      this.layout[side] = !this.layout[side];
      try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(this.layout)); } catch (e) { /* not remembered */ }
      this.closeDock(side);
      this.applyLayout();
      if (this.layout[side] && window.innerWidth < (side === 'left' ? 1100 : 760)) showToast(ui('editor.pinNoRoom'));   // (folded for now: say why)
    },
    dockOf(side) { return editor.element.querySelector('.editor-dock[data-dock="' + side + '"]'); },
    openDock(side) {
      if (this.layout[side]) return;
      const dock = this.dockOf(side);
      if (dock) dock.classList.add('is-open');
    },
    closeDock(side) {
      const dock = this.dockOf(side);
      if (!dock || this.layout[side]) return;
      if (dock.contains(document.activeElement) && document.activeElement.matches('input, textarea, select, [contenteditable="true"]')) return;   // you type in it
      dock.classList.remove('is-open');
    },
    closeDockSoon(side) {
      this.dockClose = this.dockClose || {};
      clearTimeout(this.dockClose[side]);
      this.dockClose[side] = setTimeout(() => {
        const dock = this.dockOf(side);
        if (dock && (dock.matches(':hover') || editor.element.querySelector('.editor-edge-tab[data-dock="' + side + '"]:hover') || document.querySelector('.editor-menu:not([hidden]):not(.editor-menubar-menu)'))) return;   // back over it, or a menu of it is open
        this.closeDock(side);
      }, CONFIG.editor.dockCloseMs);
    },

    /* ======== STATUS BAR ======== */

    updateStatus() {
      const element = editor.element;
      if (!element) return;
      runSafely('overflow', () => this.checkOverflow());
      const scenes = editor.modelScenes();
      const index = scenes.indexOf(editor.selected);
      const slide = element.querySelector('.status-slide');
      if (slide) {
        slide.textContent = index >= 0 ? ui('editor.statusSlide', { number: index + 1, count: scenes.length }) + ' · ' + ui('editor.statusWords', { count: wordCount(editor.selected) }) : '';
        if (!slide.dataset.wordsReady) {   // the words on all slides: counted when the pointer comes over it (its tooltip), not at every change
          slide.dataset.wordsReady = '1';
          slide.addEventListener('pointerenter', () => { slide.title = ui('editor.statusWordsAll', { count: editor.modelScenes().reduce((sum, scene) => sum + wordCount(scene), 0) }); });
        }
      }
      const status = element.querySelector('.status-selection');
      const selected = editorCanvas.selected;
      if (!status) return;
      if (!selected || !editorCanvas.scene || !editorCanvas.scene.contains(selected)) { status.textContent = ''; return; }
      const name = editorTools.labelOf(selected);
      if (editorCanvas.isFree(selected)) {
        const value = key => Math.round(editorCanvas.freeValue(selected, key));
        const angle = Math.round(parseFloat(selected.style.rotate) || 0);
        status.textContent = name + ' · X ' + value('--x') + '  Y ' + value('--y') + '  ' + (value('--w') || Math.round(selected.offsetWidth)) + ' × ' + (value('--h') || Math.round(selected.offsetHeight)) + (angle ? '  ' + angle + '°' : '');
      } else status.textContent = name;
    },

    /* ======== FIND AN ACTION ======== */

    /** Keys for this section (called first by the editor's keys). True when handled. */
    onKey(event, typing) {
      if (this.palette) return this.onPaletteKey(event);
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && (key === 'h' || key === 'f')) {   // Find and replace (as in Word, PowerPoint; Ctrl+F too, the first key people try)
        event.preventDefault();
        this.runCommand('find-replace');
        return true;
      }
      if (((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && key === 'k') || (!typing && event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey)) {
        event.preventDefault();
        this.openPalette();
        return true;
      }
      return false;
    },
    /** What the selection allows: why a command cannot run now, or '' when it can. */
    blockedReason(needs) {
      const element = editorCanvas.selected;
      if (!needs) return '';
      if (needs === 'clipboard') return editorTools.clipboardItem() ? '' : ui('cmd.needsClipboard');
      if (needs === 'undo') return editor.history.length ? '' : ui('cmd.needsUndo');
      if (needs === 'redo') return editor.future.length ? '' : ui('cmd.needsRedo');
      if (needs === 'several') return editorTools.group.filter(item => item.isConnected).length >= 2 ? '' : ui('cmd.needsSeveral');   // (Shift+click)
      if (!element) return ui('cmd.needsElement');
      if (needs === 'free' && !editorCanvas.isFree(element)) return ui('cmd.needsFree');
      if (needs === 'text' && !(element.isContentEditable || element.querySelector('[contenteditable="true"]'))) return ui('cmd.needsText');
      if (needs === 'list' && !element.closest('.big-list')) return ui('cmd.needsList');
      if (needs === 'image' && !element.matches('img, .image-frame') && !element.querySelector(':scope > img')) return ui('cmd.needsImage');
      return '';
    },
    /** All rows: the actions, then "Go to" every slide. */
    entries() {
      const rows = COMMANDS.map(([id, label, keys, run, needs]) => ({ id, label: ui(label), words: COMMAND_WORDS[id] || '', keys, run, reason: this.blockedReason(needs) }));
      editor.modelScenes().forEach((scene, index) => rows.push({ id: 'go-' + scene.getAttribute('data-name'), label: ui('cmd.goTo', { number: index + 1, title: scene.getAttribute('data-title') || scene.getAttribute('data-name') }), keys: '', run: () => editor.select(scene), reason: '' }));
      return rows.concat(this.settingRows());
    },
    /** Every setting of the Element (with a selection), Slide and Presentation tabs as rows: a field (it opens its tab and
        points at it), each choice of a list (applied at once) and each button. Read from the panels' HTML, built in a
        box that is never shown, so whatever a panel offers for this selection is found, and nothing else. */
    settingRows() {
      const rows = [];
      const tabs = [['element', () => (editorCanvas.selected ? editorCanvas.elementPanelHtml() : '')], ['slide', () => editor.slidePanelHtml()], ['deck', () => editor.deckPanelHtml()]];
      tabs.forEach(([tab, panelHtml]) => runSafely('editor: find settings', () => {
        const box = document.createElement('div');
        box.innerHTML = panelHtml();
        applyInterfaceTexts(box);
        const tabButton = editor.element.querySelector('.editor-tabs button[data-tab="' + tab + '"]');
        const tabName = tabButton ? tabButton.textContent.trim() : tab;
        // why a control is greyed: its own tooltip, a slide run by a script, a locked element (Layers tab), else "not now"
        const selected = editorCanvas.selected;
        const reasonOf = control => !control.disabled ? '' : control.getAttribute('title') ||
          ((tab === 'element' ? editorCanvas.locked() : !!editor.selected && isScriptedSlide(editor.selected)) ? ui('cmd.settingScripted')
            : tab === 'element' && selected && editorLayers.isLocked(selected) ? ui('cmd.settingLocked') : ui('cmd.settingNotNow'));
        let section = '';
        const seen = {};
        box.querySelectorAll('h4, .editor-field, .editor-check, button[data-action]').forEach(node => {
          if (node.matches('h4')) { section = node.textContent.trim(); return; }
          const where = tabName + (section ? ' › ' + section : '');
          if (node.matches('button')) {   // a button of the panel (▶ Preview, Use on every slide, …)
            const name = (node.textContent.trim().length > 2 ? node.textContent : node.getAttribute('title') || node.textContent).trim();
            if (!name || node.closest('.editor-field, .editor-check')) return;
            const action = node.getAttribute('data-action'), nth = seen['action=' + action] = (seen['action=' + action] ?? -1) + 1;
            rows.push(this.settingRow(tab, name, where, action, { attribute: 'data-action', value: action, nth, press: true }, reasonOf(node)));
            return;
          }
          const control = node.querySelector('input, select, textarea');
          const attribute = control && Array.from(control.attributes).find(candidate => /^data-[a-z]+-field$/.test(candidate.name));
          if (!attribute) return;
          const key = attribute.name + '=' + attribute.value, nth = seen[key] = (seen[key] ?? -1) + 1;
          const name = ((node.querySelector('span') || node).textContent || '').trim();
          if (!name) return;
          const target = { attribute: attribute.name, value: attribute.value, nth };
          const words = attribute.value.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
          rows.push(this.settingRow(tab, name, where, words, target, reasonOf(control)));
          // each choice of a list: applied at once ("Look: Duotone, teal")
          if (control.matches('select') && !control.disabled) Array.from(control.options).slice(0, 40).forEach(option => {
            const text = option.textContent.trim();
            if (!text || option.disabled) return;
            rows.push(this.settingRow(tab, name + ': ' + text + (option.selected ? ' ✓' : ''), where, words, Object.assign({ choose: option.value }, target), ''));
          });
        });
      }));
      runSafely('editor: find other settings', () => rows.push(...this.otherKindRows(rows)));
      return rows;
    },
    /** The main settings of the kinds of element that are not selected now (OTHER_KIND_SETTINGS), as rows of their own. */
    otherKindRows(rows) {
      const listed = new Set(rows.map(row => String(row.id).split(':')[2]));
      const scene = editorCanvas.scene;
      const firstOf = selector => {
        const node = scene && Array.from(scene.querySelectorAll(selector)).find(candidate => !candidate.closest('.speaker-notes, [hidden]'));
        if (!node) return null;
        return node.matches('img') ? (node.closest('.image-frame') || node) : node.matches('.count-up') ? (node.closest('.stat') || node) : node;
      };
      const found = [];
      OTHER_KIND_SETTINGS.forEach(([kindKey, selector, settings]) => {
        const kind = ui(kindKey), element = firstOf(selector);
        settings.forEach(([label, attribute, value, press]) => {
          if (listed.has(attribute + '=' + value)) return;   // (the selected element has it: its own row is there)
          const name = ui(label), where = ui('cmd.otherKindWhere', { kind });
          const lower = (name + ' ' + where).toLowerCase();
          const extra = Object.keys(SEARCH_WORDS).filter(word => lower.includes(word)).map(word => SEARCH_WORDS[word]).join(' ');
          found.push({ id: 'other:' + attribute + '=' + value, setting: true, label: name, where, keys: '',
            search: name + ' · ' + kind + ' · ' + value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/-/g, ' ').toLowerCase() + ' ' + extra,
            reason: editorCanvas.locked() ? ui('cmd.settingScripted') : element ? '' : ui('cmd.otherKindNone', { kind }),
            run: () => { editorCanvas.selectElement(element); this.revealSetting('element', { attribute, value, nth: 0, press }); } });
        });
      });
      return found;
    },
    settingRow(tab, label, where, words, target, reason) {
      const lower = (label + ' ' + where).toLowerCase();
      const extra = Object.keys(SEARCH_WORDS).filter(word => lower.includes(word)).map(word => SEARCH_WORDS[word]).join(' ');
      return { id: 'set:' + tab + ':' + target.attribute + '=' + target.value + ':' + target.nth + (target.choose !== undefined ? ':' + target.choose : ''), setting: true,
        label, where, search: label + ' · ' + where + ' · ' + words + ' ' + extra, keys: '', reason,
        run: () => this.revealSetting(tab, target) };
    },
    /** A command that is a panel setting (Format › Align, the list's bullets): the setting is chosen there, as by
        hand (one undo step), and glows, without taking the keyboard (the text you type in keeps it). */
    applySetting(tab, attribute, value, choose) {
      if (editorCanvas.locked()) { showToast(ui('editor.scriptedNote')); return; }   // (a slide run by its script: its fields are greyed)
      this.revealSetting(tab, { attribute, value, nth: 0, choose, quiet: true });
    },
    /** Insert › Slide number and Footer: the footer setting of the Presentation tab (on every slide); the number and
        a text go together ("both"). For a text, the keyboard goes to its field. */
    showFooter(kind) {
      editor.panelTab = 'deck';
      editor.renderPanel();
      const select = editor.element.querySelector('.editor-panel-body [data-deck-field="footer"]');
      const now = select ? select.value : '';
      const other = kind === 'number' ? 'text' : 'number';
      const choose = now === other ? 'both' : now || kind;
      this.revealSetting('deck', { attribute: 'data-deck-field', value: 'footer', nth: 0, choose });
      if (kind === 'text') setTimeout(() => this.revealSetting('deck', { attribute: 'data-deck-field', value: 'footerText', nth: 0 }), 60);
    },
    /** Opens the tab of a setting found with "find an action", applies a chosen value or presses a button, and points at it.
        quiet: the panel is not brought out and the keyboard stays where it is (a key or menu command that just applies it). */
    revealSetting(tab, target) {
      editor.panelTab = tab;
      editor.renderPanel();
      if (!target.quiet) this.openDock('right');
      const find = () => Array.from(editor.element.querySelectorAll('.editor-panel-body [' + target.attribute + ']')).filter(control => control.getAttribute(target.attribute) === target.value)[target.nth] || null;
      const control = find();
      if (!control) { showToast(ui('cmd.settingGone')); return; }
      if (target.quiet && control.disabled) return;
      editor.unfoldAround(control);   // (in a folded section: it opens)
      if (target.press) { control.click(); return; }   // (its own action shows what it does)
      if (target.choose !== undefined && control.value === target.choose && target.quiet) showToast(ui('cmd.alreadySo'));
      if (target.choose !== undefined && control.value !== target.choose) {
        control.value = target.choose;
        control.dispatchEvent(new Event('change', { bubbles: true }));   // as a choice made by hand: one undo step
      }
      // (a change can draw the panel again: point at the field as it is now)
      requestAnimationFrame(() => {
        const now = find() || control;
        if (!now.isConnected) return;
        editor.unfoldAround(now);
        const field = now.closest('.editor-field, .editor-check') || now;
        if (target.quiet) { field.classList.remove('is-found'); void field.offsetWidth; field.classList.add('is-found'); setTimeout(() => field.classList.remove('is-found'), 2200); return; }
        field.scrollIntoView({ block: 'center', behavior: motion.reduced ? 'auto' : 'smooth' });
        field.classList.remove('is-found');
        void field.offsetWidth;   // (restarts the glow when it is found again)
        field.classList.add('is-found');
        now.focus({ preventScroll: true });
        setTimeout(() => field.classList.remove('is-found'), 2200);
      });
    },
    /** As score(), but every typed word must be in `text` as a word or a part of one (no letters spread out). */
    wordScore(text, query) {
      const haystack = text.toLowerCase(), words = query.toLowerCase().split(/\s+/).filter(Boolean);
      return words.length && words.every(word => haystack.includes(word)) ? this.score(text, query) : 0;
    },
    /** How well `query` fits `text` (0: not at all): every letter in order; more for word starts and letters together. */
    score(text, query) {
      const words = query.toLowerCase().split(/\s+/).filter(Boolean);
      const haystack = text.toLowerCase();
      let total = 0;
      for (const word of words) {
        // best: a word that starts with it ("sta" → star); then anywhere ("tar"); else its letters in order
        const startsWord = new RegExp('(^|[\\s(:·./-])' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(haystack);
        if (startsWord) { total += 20 + word.length * 4; continue; }
        if (haystack.includes(word)) { total += 10 + word.length * 2; continue; }
        let position = -1, points = 0, last = -2;
        for (const letter of word) {
          position = haystack.indexOf(letter, position + 1);
          if (position < 0) return 0;
          points += 1 + (position === last + 1 ? 2 : 0) + (position === 0 || /[\s(:·-]/.test(haystack[position - 1]) ? 3 : 0);
          last = position;
        }
        total += points;
      }
      return total;
    },
    openPalette() {
      if (this.palette) return;
      editorTools.closeMenu();
      editorLayers.closeHistory();
      // where the keyboard and the selected words were: back there when it closes (Backspace then edits that text again,
      // Bold works on those words)
      const selection = window.getSelection();
      this.before = { active: document.activeElement, ranges: selection ? Array.from({ length: selection.rangeCount }, (_, i) => selection.getRangeAt(i).cloneRange()) : [] };
      const box = document.createElement('div');
      box.className = 'editor-palette';
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-label', ui('cmd.title'));
      box.innerHTML = '<input class="palette-input" role="combobox" aria-expanded="true" aria-controls="editorPaletteList" spellcheck="false" autocomplete="off" placeholder="' + escapeHtml(ui('cmd.placeholder')) + '">' +
        '<div class="palette-list" id="editorPaletteList" role="listbox"></div>';
      editor.element.appendChild(box);
      const input = box.querySelector('.palette-input');
      this.palette = { box, input, list: box.querySelector('.palette-list'), rows: [], index: 0, all: this.entries() };
      input.addEventListener('input', () => this.showRows());
      box.addEventListener('click', event => { const row = event.target.closest('.palette-row'); if (row) this.runRow(Number(row.dataset.index)); });
      box.addEventListener('pointermove', event => { const row = event.target.closest('.palette-row'); if (row) this.highlight(Number(row.dataset.index)); });
      this.paletteOutside = event => { if (!box.contains(event.target)) this.closePalette(!editorCanvas.stageElement.contains(event.target)); };   // a click on the slide goes there
      document.addEventListener('pointerdown', this.paletteOutside, true);
      this.showRows();
      input.focus();
    },
    /** The rows that fit what is typed: the best first (the last used ones first when nothing is typed). */
    showRows() {
      const state = this.palette;
      const query = state.input.value.trim();
      let rows;
      if (!query) {
        const recent = this.recent();
        rows = recent.map(id => state.all.find(row => row.id === id)).filter(Boolean).concat(state.all.filter(row => !recent.includes(row.id) && !row.id.startsWith('go-') && !row.setting));
      } else {
        // (an action before a setting that fits as well: the settings are many)
        // (a setting: what its own name fits counts twice, so "duotone teal" puts Duotone, teal before Teal tint; an action:
        // its name and everyday words count twice, so "new slide" finds Add a slide before a transition that mentions a new slide)
        rows = state.all.map(row => {
          // an action: its name (letters in order count) or its everyday words (whole words only, so "accent" never finds "Insert an image")
          const all = row.setting ? this.score(row.search || row.label, query) : Math.max(this.score(row.label, query), this.wordScore(row.words || '', query));
          // strong: every typed word is in its name or everyday words (not only its letters spread out)
          const words = query.toLowerCase().split(/\s+/).filter(Boolean), text = ((row.search || row.label) + ' ' + (row.words || '')).toLowerCase();
          return { row, strong: words.every(word => text.includes(word)), score: all && all + (row.setting ? this.score(row.label, query) : all) };
        }).filter(item => item.score > 0)
          // what fits by its words first, even when it needs a selection first (it says so, greyed): "centre" with nothing selected
          // shows Centre the text (for a text) before a slide setting whose letters happen to spell it
          .sort((a, b) => (b.strong ? 1 : 0) - (a.strong ? 1 : 0) || (a.row.reason ? 1 : 0) - (b.row.reason ? 1 : 0) || b.score - a.score || (a.row.setting ? 1 : 0) - (b.row.setting ? 1 : 0)).map(item => item.row);
      }
      state.rows = rows.slice(0, 60);
      state.index = query ? 0 : Math.max(0, state.rows.findIndex(row => !row.reason));   // (a greyed first row: Enter says what it needs)
      state.list.innerHTML = state.rows.length ? state.rows.map((row, index) => '<div class="palette-row' + (row.reason ? ' is-disabled' : '') + '" role="option" data-index="' + index + '" id="paletteRow' + index + '">' +
        '<span class="palette-label">' + escapeHtml(row.label) + (row.reason ? ' <small>' + escapeHtml(row.reason) + '</small>' : '') + '</span>' + (row.keys ? '<kbd>' + escapeHtml(row.keys) + '</kbd>' : '') +
        (row.where ? '<small class="palette-where">' + escapeHtml(row.where) + '</small>' : '') + '</div>').join('')
        : '<p class="editor-note">' + escapeHtml(ui('cmd.nothing')) + '</p>';
      // nothing selected: the settings of an element can't be found yet; say how
      if (query && !editorCanvas.selected) state.list.insertAdjacentHTML('beforeend', '<p class="palette-hint">' + escapeHtml(ui('cmd.selectForSettings')) + '</p>');
      this.highlight(state.index);
    },
    highlight(index) {
      const state = this.palette;
      if (!state || !state.rows.length) return;
      state.index = clamp(index, 0, state.rows.length - 1);
      state.list.querySelectorAll('.palette-row').forEach(row => row.classList.toggle('is-current', Number(row.dataset.index) === state.index));
      const current = state.list.querySelector('#paletteRow' + state.index);
      if (current) { current.scrollIntoView({ block: 'nearest' }); state.input.setAttribute('aria-activedescendant', current.id); }
    },
    onPaletteKey(event) {
      const state = this.palette;
      if ((event.ctrlKey || event.metaKey) && !event.altKey) {
        const key = event.key.toLowerCase();
        if (key === 'k') { event.preventDefault(); this.closePalette(true); return true; }   // Ctrl+K again closes it
        if (key === 's') { this.closePalette(true); return false; }   // Ctrl+S saves, as always
        return true;   // Ctrl+A, C, V, Z edit the typing field
      }
      if (event.key === 'Escape') { event.preventDefault(); this.closePalette(true); return true; }
      if (event.key === 'Tab') { event.preventDefault(); this.highlight(state.index + (event.shiftKey ? -1 : 1)); return true; }   // Tab stays in the window: the next row
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); this.highlight(state.index + (event.key === 'ArrowDown' ? 1 : -1)); return true; }
      if (event.key === 'Enter') { event.preventDefault(); this.runRow(state.index); return true; }
      return true;   // typing in the field: nothing reaches the slide
    },
    runRow(index) {
      const row = this.palette && this.palette.rows[index];
      if (!row) return;
      if (row.reason) { showToast(row.reason); return; }
      this.closePalette(true);   // the keyboard and the selected words where they were (Bold, Accent use them)
      this.remember(row.id);
      if (row.id.startsWith('go-') || row.setting) { runSafely('editor command: ' + row.id, row.run); return; }
      this.runCommand(row.id);
    },
    /** True when it was open. restore: the keyboard and the selected words back where they were. */
    closePalette(restore) {
      if (!this.palette) return false;
      this.palette.box.remove();
      this.palette = null;
      document.removeEventListener('pointerdown', this.paletteOutside, true);
      const before = this.before;
      this.before = null;
      if (restore && before && before.active && before.active.isConnected && before.active !== document.body) {
        before.active.focus({ preventScroll: true });
        const selection = window.getSelection();
        const ranges = before.ranges.filter(range => range.startContainer.isConnected);
        if (selection && ranges.length) { selection.removeAllRanges(); ranges.forEach(range => selection.addRange(range)); }
      }
      return true;
    },
    recent() {
      try { return JSON.parse(localStorage.getItem(DECK_ID + '-editor.recent') || '[]').filter(id => typeof id === 'string').slice(0, 5); } catch (e) { return []; }
    },
    remember(id) {
      if (id.startsWith('go-') || id.startsWith('set:')) return;   // (a setting depends on the selection)
      try { localStorage.setItem(DECK_ID + '-editor.recent', JSON.stringify([id].concat(this.recent().filter(other => other !== id)).slice(0, 5))); } catch (e) { /* no storage: no list */ }
    },

    /* ======== SELECTION BAR ======== */

    /** The bar above the selection (screen coordinates; it lives outside the canvas, so a click on it never selects). */
    placeBar() {
      if (!editor.element) return;
      runSafely('tips', () => this.tipFor(editorCanvas.selected));
      // the welcome card folds to its title once something is selected (it would cover the selection's handles)
      const welcome = editor.element.querySelector('.editor-welcome');
      if (welcome && editorCanvas.selected) welcome.classList.add('is-small');
      this.updateStatus();
      let bar = editor.element.querySelector('.editor-quickbar');
      const element = editorCanvas.selected;
      const outline = editorCanvas.stageElement && editorCanvas.stageElement.querySelector('.editor-selection');
      const members = editorTools.group.length > 1 ? editorTools.group.filter(item => item.isConnected) : null;   // several selected: a bar for all of them
      const hidden = !element || !outline || (outline.hidden && !members) || (editorTools.playStep >= 0 && !editorMotion.recording) ||
        editor.element.classList.contains('is-moving') || editor.element.classList.contains('is-dragging-handle') || !editor.element.querySelector('.editor-dialog').hidden || !editorCanvas.scene || !editorCanvas.scene.contains(element);
      if (hidden) { if (bar) bar.hidden = true; return; }
      if (!bar) {
        bar = document.createElement('div');
        bar.className = 'editor-quickbar';
        bar.setAttribute('role', 'toolbar');
        bar.setAttribute('aria-label', ui('cmd.barLabel'));
        bar.addEventListener('pointerdown', event => event.preventDefault());   // a text keeps its selected words (Bold, Accent)
        editor.element.appendChild(bar);
      }
      const textOf = item => item.isContentEditable || !!item.querySelector('[contenteditable="true"]');
      const isText = textOf(element);
      const isImage = element.matches('img, .image-frame') || !!element.querySelector(':scope > img');
      const locked = editorCanvas.locked() || (!members && editorLayers.isLocked(element));
      const memberLocked = !!members && members.some(item => editorLayers.isLocked(item));   // several: a locked one stays where it is (Align, Appear), but it is not deleted or restyled
      const button = (action, label, title) => '<button data-action="' + action + '"' + ((locked && action !== 'command-palette') || (memberLocked && ['group-delete', 'bar-styles'].includes(action)) ? ' disabled' : '') + ' title="' + escapeHtml(ui(title || label)) + '">' + escapeHtml(ui(label)) + '</button>';
      const gap = '<span class="quickbar-gap"></span>';
      const html = members ? '<span class="quickbar-count">' + escapeHtml(ui('cmd.barCount', { count: members.length })) + '</span>' +
          (members.some(textOf) ? button('bar-styles', 'cmd.barStyles', 'cmd.styles') + gap : '') +
          button('bar-align', 'cmd.barAlign', 'cmd.align') + button('bar-appear', 'cmd.barAppear', 'cmd.appearTogether') + gap +
          button('group-make', 'cmd.barGroup', 'cmd.group') + button('duplicate', 'cmd.barDuplicate', 'cmd.duplicate') + button('group-delete', 'cmd.barDelete', 'cmd.delete')
        : (isText ? button('bar-styles', 'cmd.barStyles', 'cmd.styles') + button('bold', 'cmd.barBold', 'cmd.bold') + button('accent', 'cmd.barAccent', 'cmd.accent') + button('plain', 'cmd.barPlain', 'cmd.plain') +
          button('bar-smaller', 'cmd.barSmaller', 'cmd.smaller') + button('bar-bigger', 'cmd.barBigger', 'cmd.bigger') + gap : '') +
        (isImage ? button('replace-image', 'cmd.barReplace', 'cmd.replaceImage') + gap : '') +
        (editorCanvas.isFree(element) ? button('bar-align', 'cmd.barAlign', 'cmd.alignOnSlide') + button('to-front', 'cmd.barFront', 'cmd.toFront') + button('to-back', 'cmd.barBack', 'cmd.toBack') + gap : '') +
        button('bar-animate', 'cmd.barAnimate', 'cmd.animate') + button('duplicate', 'cmd.barDuplicate', 'cmd.duplicate') + button('delete', 'cmd.barDelete', 'cmd.delete') +
        '<button data-action="bar-more" title="' + escapeHtml(ui('cmd.more')) + '">' + escapeHtml(ui('cmd.barMore')) + '</button>';
      if (bar.dataset.html !== html) { bar.innerHTML = html; bar.dataset.html = html; }
      bar.hidden = false;
      const area = editorCanvas.stageElement.closest('.editor-canvas').getBoundingClientRect();
      bar.style.maxWidth = Math.max(160, area.width - 8) + 'px';   // (it wraps to a second row rather than leave the canvas)
      const box = members ? members.map(item => item.getBoundingClientRect()).reduce((all, one) => {   // all of them together
        const left = Math.min(all.left, one.left), top = Math.min(all.top, one.top), right = Math.max(all.right, one.right), bottom = Math.max(all.bottom, one.bottom);
        return { left, top, right, bottom, width: right - left, height: bottom - top };
      }) : outline.getBoundingClientRect();
      const ours = members || [element];   // what the bar may lie next to, not on
      // above it (clear of the turn handle) or below it (clear of the move grip): the first that fits in the canvas and
      // covers no other element; neither: at the top of the canvas
      const free = editorCanvas.isFree(element), handle = CONFIG.editor.handlePx;
      const grip = free || outline.classList.contains('can-reorder') || !!members;   // a layout block's move grip sits below it
      const width = bar.offsetWidth, height = bar.offsetHeight;
      const left = clamp(box.left + box.width / 2 - width / 2, area.left + 4, area.right - width - 4);
      const coversOthers = top => {
        bar.style.visibility = 'hidden';   // what lies under the bar's place, not the bar itself
        const others = [[0.1, 0.5], [0.5, 0.5], [0.9, 0.5]].some(([x, y]) => document.elementsFromPoint(left + width * x, top + height * y).some(node =>
          editorCanvas.scene.contains(node) && node !== editorCanvas.scene && !node.matches('.content') && !ours.some(item => node.contains(item) || item.contains(node))));
        bar.style.visibility = '';
        return others;
      };
      const fits = top => top >= area.top + 4 && top + height <= area.bottom - 4;
      const candidates = [box.top - height - (free ? handle * 3.6 : 10), box.bottom + (grip ? handle * 3 : 10)].filter(fits);
      // (never over another element: it would take the clicks meant for that one, e.g. a right-click; tried in v186)
      const top = candidates.find(candidate => !coversOthers(candidate)) ?? area.top + 4;
      bar.style.left = left + 'px';
      bar.style.top = top + 'px';
      this.fadeBar();
    },
    /** The farther the pointer from the bar, the fainter it is; far away it lets clicks through (it never stays in the way). */
    fadeBar() {
      const bar = editor.element && editor.element.querySelector('.editor-quickbar');
      if (!bar || bar.hidden || !this.pointerAt) return;
      const box = bar.getBoundingClientRect();
      const distance = Math.hypot(Math.max(box.left - this.pointerAt.x, 0, this.pointerAt.x - box.right), Math.max(box.top - this.pointerAt.y, 0, this.pointerAt.y - box.bottom));
      const opacity = clamp(1 - (distance - CONFIG.editor.barNearPx) / CONFIG.editor.barFadePx, 0, 1);
      bar.style.opacity = opacity;
      bar.classList.toggle('is-faded', opacity < 0.35);
    },
    /** The bar's own buttons (Animate, ⋯, text size) and the docks' 📌. True when handled. */
    runAction(action, button) {
      if (action === 'pin-left' || action === 'pin-right') { this.pin(action.slice(4)); return true; }   // 📌 on a dock
      if (action === 'toggle-tips') { this.showTips(!this.tipsShown()); showToast(ui(this.tipsShown() ? 'editor.tipsOn' : 'editor.tipsOff')); return true; }
      if (action === 'text-italic') { editorCanvas.formatSelection('i'); this.hideTextBar(); return true; }
      if (action === 'text-link') { this.openLinkField(); return true; }
      if (action === 'text-marker') { editorCanvas.formatSelection('marker'); this.hideTextBar(); return true; }
      if (action === 'text-strike') { editorCanvas.formatSelection('s'); this.hideTextBar(); return true; }
      if (action === 'text-underline' || action === 'text-sup' || action === 'text-sub') { editorCanvas.formatSelection(action.slice(5).replace('underline', 'u')); this.hideTextBar(); return true; }
      if (action === 'text-smaller' || action === 'text-bigger') { editorCanvas.formatSelection('size', action === 'text-bigger' ? CONFIG.editor.textSizeStep : 1 / CONFIG.editor.textSizeStep); return true; }   // the words stay selected: click again
      if (action === 'text-colours') { const row = editor.element.querySelector('.editor-textbar-colours'); row.hidden = !row.hidden; this.placeTextBar(); return true; }
      if (action === 'text-colour') { editorCanvas.formatSelection('colour', button.getAttribute('data-colour')); return true; }
      if (action === 'view-timeline') { editorTimeline.toggle(); return true; }
      if (action === 'bar-smaller' || action === 'bar-bigger') { editorLayers.stepTextSize(action === 'bar-bigger' ? 1 : -1); return true; }
      if (action === 'bar-align') {   // line them up, spread them (several selected); one: on the slide
        const item = (run, label) => '<button data-action="bar-run" data-run="' + run + '">' + escapeHtml(ui(label)) + '</button>';
        const several = editorTools.group.length > 1;
        editorLayers.openList(button, 'editor-align-menu', (several ? '' : '<p class="editor-note">' + escapeHtml(ui('editor.alignOnSlide')) + '</p>') + item('align-left', 'editor.alignLefts') + item('align-centre', 'editor.alignCentres') + item('align-right', 'editor.alignRights') + '<hr>' +
          item('align-top', 'editor.alignTops') + item('align-middle', 'editor.alignMiddles') + item('align-bottom', 'editor.alignBottoms') +
          (several ? '<hr>' + item('spread-across', 'editor.spreadAcross') + item('spread-down', 'editor.spreadDown') + '<hr>' + item('same-width', 'editor.matchWidth') + item('same-height', 'editor.matchHeight') + '<hr>' + item('arrange-grid', 'editor.arrangeGrid') + (editorTools.group.length === 2 ? item('swap-places', 'editor.swapPlaces') : '') : ''));
        return true;
      }
      if (action === 'bar-appear') {   // how they appear together
        const item = (run, label) => '<button data-action="bar-run" data-run="' + run + '">' + escapeHtml(ui(label)) + '</button>';
        editorLayers.openList(button, 'editor-align-menu', '<p class="editor-note">' + escapeHtml(ui('editor.groupAppearNote')) + '</p>' +
          item('group-appear-sequence', 'editor.groupAppearSequence') + item('group-appear-clicks', 'editor.groupAppearClicks') + item('group-appear-together', 'editor.groupAppearTogether') + '<hr>' +
          '<p class="editor-note">' + escapeHtml(ui('editor.staggerList', { ms: editorTools.staggerStep ?? CONFIG.editor.staggerMs })) + '</p>' +
          item('stagger-forward', 'editor.staggerForward') + item('stagger-reverse', 'editor.staggerReverse') + item('stagger-middle', 'editor.staggerMiddle') + item('stagger-random', 'editor.staggerRandom'));
        return true;
      }
      if (action === 'bar-run') {   // an item of those lists: the panel's own button does it
        editorLayers.closeHistory();
        editor.runAction(button.dataset.run, button);
        return true;
      }
      if (action === 'bar-styles') {   // the text styles under the button
        editorLayers.openList(button, 'editor-styles-menu', editorLayers.textStylesHtml(editorCanvas.selected, '', true));
        return true;
      }
      if (action === 'bar-animate') {   // the quick animations under the button (the pointer over one plays it)
        editorLayers.openList(button, 'editor-quick-menu', editorMotion.quickHtml());
        if (editorLayers.historyList) { editorLayers.historyList.addEventListener('pointerover', event => editorMotion.onQuickHover(event)); editorLayers.historyList.addEventListener('pointerleave', () => editorMotion.endQuickHover()); }
        return true;
      }
      if (action === 'bar-more') {   // the full right-click menu, at the bar
        const box = button.getBoundingClientRect();
        if (document.activeElement && document.activeElement.isContentEditable) document.activeElement.blur();
        editorTools.focusBeforePointer = null;
        editorTools.openMenu({ target: editorCanvas.selected, clientX: box.left, clientY: box.bottom + 4, preventDefault() {} });
        return true;
      }
      return false;
    },

    /* ======== NUMBER LABELS ======== */

    /** Drag on the name of a number field: its value follows (Shift: ×10, Alt: ×0.1); the change is written once, at the end. */
    startScrub(event) {
      const name = event.target.closest('.editor-field > span');
      const input = name && name.parentElement.querySelector(':scope > input[type="number"]');
      if (!input || input.disabled || event.button !== 0) return false;
      event.preventDefault();
      let start = Number(input.value) || 0;
      const startX = event.clientX;
      const size = { '--w': 'width', '--h': 'height' }[input.dataset.elementField];
      if (size && !start && editorCanvas.selected) start = Math.round(parseFloat(getComputedStyle(editorCanvas.selected)[size]) || 0);   // 0: as big as its content; start from what it is
      const step = Number(input.step) > 0 ? Number(input.step) : 1;
      const min = input.min === '' ? -Infinity : Number(input.min), max = input.max === '' ? Infinity : Number(input.max);
      let moved = false;
      document.body.classList.add('is-scrubbing');
      const onMove = moveEvent => {
        const dx = moveEvent.clientX - startX;
        if (!moved && Math.abs(dx) < 3) return;
        moved = true;
        const factor = moveEvent.shiftKey ? 10 : moveEvent.altKey ? 0.1 : 1;
        const value = clamp(start + Math.round(dx / 2) * step * factor, min, max);
        input.value = Math.round(value * 100) / 100;
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        document.body.classList.remove('is-scrubbing');
        if (!moved) { input.focus(); input.select(); return; }   // a click: type a value
        if (Number(input.value) !== start) input.dispatchEvent(new Event('change', { bubbles: true }));   // one undo step
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      return true;
    },

    /* ======== EMPTY SLIDE ======== */

    /** The hint in the middle of an empty slide (nothing on it yet). */
    /** Pictures dragged from the desktop or a folder onto the slide become image blocks (as a pasted screenshot does,
        one undo step each); the slide shows a frame while they are over it. */
    setUpDropping(canvas) {
      if (!canvas) return;
      const hasFiles = event => Array.from((event.dataTransfer && event.dataTransfer.types) || []).includes('Files');
      canvas.addEventListener('dragover', event => {
        if (!hasFiles(event)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
        canvas.classList.add('is-dropping');
      });
      canvas.addEventListener('dragleave', event => { if (!canvas.contains(event.relatedTarget)) canvas.classList.remove('is-dropping'); });
      canvas.addEventListener('drop', event => {
        if (!hasFiles(event)) return;
        event.preventDefault();
        canvas.classList.remove('is-dropping');
        const images = Array.from(event.dataTransfer.files).filter(file => /^image\//.test(file.type)).slice(0, 8);
        if (!images.length) { showToast(ui('cmd.dropOnlyImages')); return; }
        if (editorCanvas.locked()) { showToast(ui('editor.scriptedNote')); return; }   // (a slide run by a script takes no new blocks)
        if (editorTools.playStep >= 0) editorTools.stopPlaying();
        images.forEach(file => editorTools.pasteImage(file));
      });
    },
    /** Selects the first block of the slide's content that reaches below its bottom edge, and says what to do with it. */
    selectOverflowing() {
      const scene = editorCanvas.scene, content = scene && scene.querySelector(':scope > .content');
      if (!content) return;
      const bottom = scene.getBoundingClientRect().bottom;
      const block = Array.from(content.children).find(child => !child.matches('.speaker-notes') && child.getClientRects().length && child.getBoundingClientRect().bottom > bottom + 2);
      if (!block) return;
      editorCanvas.selectElement(block);
      showToast(ui('cmd.overflowPicked'));
    },
    /** A slide whose content runs off its bottom edge (a new block pushed it down): a warning in the status bar. */
    checkOverflow() {
      const flag = editor.element && editor.element.querySelector('.status-overflow');
      if (!flag) return;
      const scene = editorCanvas.scene;
      const content = scene && scene.querySelector(':scope > .content');
      // the lowest block of the slide's content (not its shadows or decorations) below the slide's bottom edge
      const bottom = scene ? scene.getBoundingClientRect().bottom : 0;
      const blocks = content ? Array.from(content.children).filter(block => !block.matches('.speaker-notes') && block.getClientRects().length) : [];
      const over = blocks.some(block => block.getBoundingClientRect().bottom > bottom + 2);
      const name = scene ? scene.dataset.name : '';
      if (over && this.overflowSeen !== name + ':over' && this.overflowSeen === name + ':ok') showToast(ui('cmd.overflowNow'));   // (this change made it too full)
      this.overflowSeen = name + (over ? ':over' : ':ok');
      flag.hidden = !over;
      flag.textContent = over ? ui('cmd.overflow') : '';
      flag.title = over ? ui('cmd.overflowTooltip') : '';
    },
    /** The first time the editor opens in this browser: a small card in a corner of the slide area with the few things
        to know, so nobody needs a manual. "Got it" hides it for good; Help › Show the welcome tips brings it back. */
    showWelcome(force) {
      const canvas = editor.element && editor.element.querySelector('.editor-canvas');
      if (!canvas) return;
      let seen = true;
      try { seen = !!localStorage.getItem('presentation-editor.welcomed'); } catch (e) { /* no storage: never shown */ }
      if (seen && !force) return;
      const old = canvas.querySelector('.editor-welcome');
      if (old) old.remove();
      const card = document.createElement('section');
      card.className = 'editor-welcome';
      card.setAttribute('role', 'dialog');
      card.setAttribute('aria-label', ui('cmd.welcomeTitle'));
      card.innerHTML = '<h3>' + escapeHtml(ui('cmd.welcomeTitle')) + '</h3><ul>' +
        ['cmd.welcomeSelect', 'cmd.welcomeType', 'cmd.welcomeInsert', 'cmd.welcomeFind', 'cmd.welcomeUndo'].map(key => '<li>' + escapeHtml(ui(key)) + '</li>').join('') +
        '</ul><button type="button" class="editor-welcome-ok">' + escapeHtml(ui('cmd.welcomeOk')) + '</button>';
      card.addEventListener('click', event => { if (card.classList.contains('is-small')) { event.stopPropagation(); card.classList.remove('is-small'); } });   // (folded: a click opens it)
      if (!force && window.innerHeight < 820) card.classList.add('is-small');   // (a small screen: as its title only, a click opens it, so the slide stays free)
      card.querySelector('.editor-welcome-ok').addEventListener('click', () => {
        try { localStorage.setItem('presentation-editor.welcomed', '1'); } catch (e) { /* shown again next time */ }
        card.remove();
      });
      canvas.appendChild(card);
    },
    /** The tip for this kind of element, the first time one is selected in this browser (TIPS). */
    tipFor(element) {
      if (!element || element === this.tippedElement || editorTools.playStep >= 0) return;
      this.tippedElement = element;
      const tip = TIPS.find(([selector]) => element.matches(selector));
      if (!tip) return;
      let seen = [];
      try { seen = JSON.parse(localStorage.getItem(TIPS_KEY) || '[]'); } catch (e) { return; }   // (no storage: no tips, never the same one again and again)
      if (!Array.isArray(seen) || seen.includes(tip[1])) return;
      seen.push(tip[1]);
      try { localStorage.setItem(TIPS_KEY, JSON.stringify(seen)); } catch (e) { return; }
      showToast(ui(tip[1]));
    },
    resetTips() {
      try { localStorage.removeItem(TIPS_KEY); } catch (e) { /* no storage */ }
      this.tippedElement = null;
      showToast(ui('cmd.tipsReset'));
    },
    showHint() {
      const box = editorCanvas.stageElement && editorCanvas.stageElement.closest('.editor-canvas');
      if (!box) return;
      let hint = box.querySelector('.editor-empty-hint');
      const scene = editorCanvas.scene;
      const empty = !!scene && !Array.from(scene.querySelectorAll('.content > *, :scope > .is-free')).some(node => !node.matches('.speaker-notes'));
      if (!empty) { if (hint) hint.hidden = true; return; }
      if (!hint) {
        hint = document.createElement('div');
        hint.className = 'editor-empty-hint';
        hint.innerHTML = '<p>' + escapeHtml(ui('cmd.hintTitle')) + '</p><ul><li>' + escapeHtml(ui('cmd.hintDoubleClick')) + '</li><li>' + escapeHtml(ui('cmd.hintInsert')) + '</li><li>' + escapeHtml(ui('cmd.hintFind')) + '</li><li>' + escapeHtml(ui('cmd.hintDrop')) + '</li></ul>';
        box.appendChild(hint);
      }
      hint.hidden = false;
    },
  };
