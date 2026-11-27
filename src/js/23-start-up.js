  /* ===========================================================================
     23. START-UP
     =========================================================================== */
  function init() {
    setUpErrorReporting();
    // a copy the editor opened for File › Export as PDF (17 exportPdf): it prints itself once its slides are laid out
    // (#print-handout: the handout with the speaker notes, File › Print a handout)
    if (deck.hasAttribute('data-preview-copy') && /^#print-(pdf|handout)$/.test(location.hash)) document.fonts.ready.then(() => setTimeout(() => runSafely('print', () => printSlides(location.hash === '#print-handout')), 600));   // (its fonts first)
    applyInterfaceTexts(deck);     // the texts of the controls bar and the settings panel
    slideTexts.collect();          // before any slide script changes a text
    slideTexts.applySaved();       // texts changed in the Texts drawer
    slideComponents.init();        // QR codes and charts are drawn from the (changed) texts
    imageSwaps.collect();
    imageSwaps.loadSaved();        // images swapped in this browser (they arrive a moment later)
    themeLibrary.load();
    colorSettings.init();          // theme and saved colours first, so the first paint already uses them
    timePlan.load();
    settingsPanel.build();
    window.addEventListener('storage', handleStorageChange);
    setUpAutoHide();
    setUpButtons();
    document.addEventListener('keydown', handleKeyDown);
    setUpSwipe();
    setUpPointerTools();
    pointerTools.applySpotlightSettings();
    window.addEventListener('hashchange', () => {   // a link to a slide (#name); a name of no slide changes nothing
      const name = location.hash.slice(1).split(/[?&]/)[0];
      if (scenes.some(scene => scene.dataset.name === name)) goToSlide(slideIndexFromHash());
      else if (currentScene()) updateUrlHash(currentScene());
    });
    buildChapterBar();
    window.addEventListener('message', handlePeerMessage);
    if (sync.isAudience) setUpAudienceWindow();

    keepScreenAwake();
    ['keydown', 'pointerdown', 'visibilitychange', 'fullscreenchange'].forEach(type => document.addEventListener(type, keepScreenAwake));

    window.addEventListener('resize', fitStageToWindow);
    fitStageToWindow();
    Object.keys(slideBehaviours).forEach(name => {
      const behaviour = slideBehaviours[name];
      if (behaviour.init) runSafely('slide "' + name + '" (start-up)', () => behaviour.init());
    });
    customCode.start();            // your own scripts give their hooks (section 16b; ?safe=1: off)
    goToSlide(slideIndexFromHash());
    boothMode.setUp();             // ?booth=20 starts it at once
    reopenEditorAfterSave();
    // turn on the logo transition only after the first paint
    requestAnimationFrame(() => requestAnimationFrame(() => stage.classList.remove('no-transitions')));
    if (motion.reduced && !sync.isAudience) showToast(ui('toast.animationsOffAtStart'));
  }

  /** After Save the page opens the saved file again; the editor then comes back on the same slide.
      A draft from an earlier session is mentioned once. */
  function reopenEditorAfterSave() {
    if (sync.isAudience) return;
    let reopen = null;
    try {
      reopen = parseJsonOr(sessionStorage.getItem(DECK_ID + '-deck.reopenEditor'), null);
      sessionStorage.removeItem(DECK_ID + '-deck.reopenEditor');
    } catch (e) { /* no session storage */ }
    if (reopen) {
      finishSaveAfterReload(reopen);
      return;
    }
    if (hasEditor()) editorDrafts.get('draft').then(draft => { if (draft && draft.html && draft.base === fileFingerprint()) showToast(ui('editor.draftWaiting')); });
  }

  /** After Save: this page must be the file that was just written (same save stamp). Then the browser's own
      copies of the settings are cleared (they are in the file now) and so is the draft. Otherwise nothing is
      cleared and a message says where the save went wrong. */
  async function finishSaveAfterReload(reopen) {
    if (!hasEditor()) return;
    if (deck.getAttribute('data-saved-at') !== reopen.savedAt) {
      // the save went into another copy of this file: the editor opens again on the same slide, where your work is kept
      // as a draft of this page (it asks to bring it back), so nothing seems lost
      await editor.open(reopen.slide);
      showToast(ui('editor.savedOtherFile'));
      return;
    }
    [CONFIG.storageKeys.estimates, CONFIG.storageKeys.slideTexts, CONFIG.storageKeys.interfaceTexts, CONFIG.storageKeys.colors,
      CONFIG.storageKeys.theme, CONFIG.storageKeys.spotlight].forEach(key => storage.write(key, null));
    await imageSwaps.clearStore();
    await editorDrafts.remove('draft');
    await editor.open(reopen.slide);
    showToast(ui('editor.saved', { file: currentFileName() }));
  }

  init();
