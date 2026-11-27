  /* ===========================================================================
     2. PAGE ELEMENTS AND STATE
     =========================================================================== */
  const byId = id => document.getElementById(id);
  const root = document.documentElement;

  /* Images and videos are kept in one block near the end of the file (<script id="deckAssets">), so the
     slides stay short and readable. An element with data-asset="img/logo.png" gets that file as its src
     (data-asset-poster: as its poster). Without the block (the _joined.html test file) the path itself
     is used, so the images load from the img folder. */
  const deckAssets = parseJsonOr(byId('deckAssets') && byId('deckAssets').textContent, {});

  /** The file for an asset path: from the ASSETS block (or `assets`), else the path itself. */
  function assetUrl(path, assets) {
    const table = assets || deckAssets;
    return hasOwn(table, path) ? table[path] : path;
  }

  /** Puts the files of every data-asset element inside `container` in place. */
  function resolveAssets(container, assets) {
    container.querySelectorAll('[data-asset]').forEach(element => element.setAttribute('src', assetUrl(element.getAttribute('data-asset'), assets)));
    container.querySelectorAll('[data-asset-poster]').forEach(element => element.setAttribute('poster', assetUrl(element.getAttribute('data-asset-poster'), assets)));
    // a slide background (data-asset-background on the <section>): a CSS property the slide's style uses
    const backgrounds = Array.from(container.querySelectorAll('[data-asset-background]'));
    if (container.matches && container.matches('[data-asset-background]')) backgrounds.push(container);
    backgrounds.forEach(element => element.style.setProperty('--asset-background', 'url("' + String(assetUrl(element.getAttribute('data-asset-background'), assets)).replace(/["\\\n]/g, '') + '")'));
  }
  resolveAssets(document);
  const deck = byId('deck');
  const stage = byId('stage');
  const chapterBar = byId('chapterBar');
  const slideCounter = byId('slideCounter');
  // ?templates=1 in the address (also accepted after the #slide part) adds the example slides
  // of <template id="slideTemplates"> after the last slide
  const SHOW_TEMPLATES = /[?&#]templates=(1|true|yes)\b/i.test(location.search + location.hash);
  if (SHOW_TEMPLATES && byId('slideTemplates')) {   // (a copy without the editor has no templates)
    stage.appendChild(byId('slideTemplates').content.cloneNode(true));
    resolveAssets(stage);   // the images and videos of the templates
    if (!/[?&]templates=/i.test(location.search)) {   // "#start?templates=1": move the flag before the # so it stays
      try {
        const url = new URL(location.href);
        url.searchParams.set('templates', '1');
        url.hash = location.hash.split(/[?&]/)[0];
        history.replaceState(null, '', url.href);
      } catch (e) { /* the address cannot be changed here */ }
    }
  }
  // Backup slides (data-backup on the <section>) come after all other slides, wherever they are in the
  // HTML. Next never goes into them: you reach them with the Slides drawer (G), the chapter list or
  // their #name. Inside the backups Next and Back move between them; Back on the first one returns
  // to the slide you came from. They are not part of the time plan.
  const allScenes = Array.from(stage.querySelectorAll('.scene'));
  const scenes = allScenes.filter(scene => !scene.hasAttribute('data-backup'))
    .concat(allScenes.filter(scene => scene.hasAttribute('data-backup')));
  const mainSlideCount = scenes.filter(scene => !scene.hasAttribute('data-backup')).length;
  const DEFAULT_TITLE = document.title;

  // Settings in the browser are kept per deck (data-deck-id on the deck element), so two
  // presentations, or a saved copy and its original, never mix their settings.
  const DECK_ID = (deck.dataset.deckId || 'deck').replace(/[^\w-]/g, '') || 'deck';
  Object.keys(CONFIG.storageKeys).forEach(name => { CONFIG.storageKeys[name] = DECK_ID + '-deck.' + CONFIG.storageKeys[name]; });

  // classes that describe where a slide is in its life; all removed when a slide is reset
  const SCENE_STATE_CLASSES = ['is-visible', 'is-playing', 'is-finished', 'is-leaving', 'is-returning', 'is-fast-forward', 'has-focus'];

  const state = {
    currentIndex: -1,          // index in scenes of the slide on screen
    step: 0,                   // extra clicks used on the current slide (see data-steps)
    timeouts: [],              // timers of the current slide; cleared on every slide change
    resetTimers: new Map(),    // slide -> timer that resets it after it faded out
    returnIndex: mainSlideCount - 1,   // the slide to go back to from the first backup slide (the last slide until then)
  };

  /** True for a backup slide (data-backup): it sits after the end of the talk. */
  function isBackupSlide(index) { return index >= mainSlideCount; }

