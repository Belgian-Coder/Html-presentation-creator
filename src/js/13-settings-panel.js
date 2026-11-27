  /* ===========================================================================
     13. SETTINGS PANEL: THEMES, TIME PLAN, EXPORT AND IMPORT (gear button or S)
     Saved in this browser (localStorage). A change in one window reaches the
     other window through the browser's "storage" event. Export and import use
     JSON files with a "type" field; the realized times also export as CSV.
     =========================================================================== */

  /* ---- Themes: named sets of the ten colour tokens ----
     Built-in themes live in the HTML (<script id="deckThemes">). Themes you save or import are
     kept in this browser. A built-in theme always wins over a browser theme with the same name.
     "Save a copy with these settings" writes all of them into a new file. */
  const isHexColor = value => /^#[0-9a-f]{6}$/i.test(String(value));
  /** A safe value for a theme's look (THEME_STYLE_TOKENS): a font list in plain words, or a number (with em or %). */
  const isStyleValue = (token, value) => typeof value === 'string' && value.length <= 200 &&
    (token.startsWith('--font-') ? /^[\w\s"',.-]+$/.test(value) : /^-?\d*\.?\d+(em|%)?$/.test(value));
  const RESERVED_NAMES = ['__proto__', 'constructor', 'prototype'];

  /** A safe theme name: trimmed, at most 40 characters, never a JavaScript reserved property name. */
  function cleanThemeName(name, fallback) {
    let clean = String(name || '').trim().slice(0, 40) || fallback;
    if (RESERVED_NAMES.includes(clean)) clean += ' theme';
    return clean;
  }

  const themeLibrary = {
    builtIn: { active: null, themes: {} },

    /** Reads the themes from the HTML; a broken THEMES block gives a message instead of failing silently. */
    load() {
      let data = null;
      try {
        data = JSON.parse(byId('deckThemes').textContent);
      } catch (e) {
        console.warn('The THEMES block (deckThemes) is not valid JSON.', e);
      }
      if (!data || typeof data !== 'object' || !data.themes || typeof data.themes !== 'object') {
        this.builtIn = { active: null, themes: {} };
        if (!sync.isAudience) showToast(ui('toast.themesBlockBroken'));
        return;
      }
      this.builtIn = { active: typeof data.active === 'string' ? data.active : null, themes: data.themes };
    },
    /** Themes saved in this browser, without the ones a built-in theme of the same name replaces. */
    browserThemes() {
      const saved = storage.read(CONFIG.storageKeys.themes) || {};
      const themes = {};
      Object.keys(saved).forEach(name => { if (!this.isBuiltIn(name)) themes[name] = saved[name]; });
      return themes;
    },
    all() { return Object.assign({}, this.browserThemes(), this.builtIn.themes); },
    names() { return Object.keys(this.all()); },
    isBuiltIn(name) { return hasOwn(this.builtIn.themes, name); },
    isInBrowser(name) { return hasOwn(storage.read(CONFIG.storageKeys.themes) || {}, name) && !this.isBuiltIn(name); },
    colorsOf(name) {
      const themes = this.all();
      return name && hasOwn(themes, name) && themes[name] && typeof themes[name] === 'object' ? themes[name] : null;
    },
    save(name, colors) {
      const themes = storage.read(CONFIG.storageKeys.themes) || {};
      themes[name] = colors;
      storage.write(CONFIG.storageKeys.themes, themes);
    },
    remove(name) {
      const themes = storage.read(CONFIG.storageKeys.themes) || {};
      delete themes[name];
      storage.write(CONFIG.storageKeys.themes, themes);
    },
  };

  /** Duotone image looks (Image › Look): one SVG filter per look turns an image grey, then maps its dark parts to the
      theme's darkest colour (the background or the text) and its light parts to a theme colour. The filters live in a
      hidden SVG on the page, never in a slide (so the editor never saves it); an image uses one as url(#duotone-teal)
      in --image-look. colorSettings.apply() calls update(), so the looks follow a theme or colour change. */
  const duotone = {
    LOOKS: { teal: '--color-teal', amber: '--color-accent', violet: '--color-violet' },
    /** '#12abef' (or '#1af') as three numbers from 0 to 1. */
    channels(hex) {
      let digits = String(hex || '').replace('#', '');
      if (digits.length === 3) digits = digits.split('').map(digit => digit + digit).join('');
      return [0, 2, 4].map(start => (parseInt(digits.slice(start, start + 2), 16) || 0) / 255);
    },
    update(colors) {
      let svg = document.getElementById('duotoneFilters');
      if (!svg) {
        svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.id = 'duotoneFilters';
        svg.setAttribute('aria-hidden', 'true');
        svg.setAttribute('focusable', 'false');
        svg.style.cssText = 'position: absolute; width: 0; height: 0; overflow: hidden; pointer-events: none;';
        (document.body || document.documentElement).appendChild(svg);
      }
      const light = hex => { const [r, g, b] = this.channels(hex); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
      const dark = light(colors['--color-background']) <= light(colors['--color-text']) ? colors['--color-background'] : colors['--color-text'];
      const shadow = this.channels(dark);
      // grey first (the same weights as the eye's), then each channel from the dark colour (black) to the look's colour (white)
      svg.innerHTML = Object.keys(this.LOOKS).map(name => {
        const bright = this.channels(colors[this.LOOKS[name]]);
        const table = index => shadow[index].toFixed(3) + ' ' + bright[index].toFixed(3);
        return '<filter id="duotone-' + name + '" color-interpolation-filters="sRGB">' +
          '<feColorMatrix type="matrix" values=".2126 .7152 .0722 0 0  .2126 .7152 .0722 0 0  .2126 .7152 .0722 0 0  0 0 0 1 0"/>' +
          '<feComponentTransfer><feFuncR type="table" tableValues="' + table(0) + '"/><feFuncG type="table" tableValues="' + table(1) + '"/><feFuncB type="table" tableValues="' + table(2) + '"/></feComponentTransfer></filter>';
      }).join('');
    },
  };

  /* ---- Colours on screen = CSS defaults, then the active theme, then single picker changes ---- */
  const colorSettings = {
    cssDefaults: {},      // token -> colour from CSS section 2, read at start-up

    init() {
      COLOR_SETTINGS.forEach(({ token }) => {
        this.cssDefaults[token] = getComputedStyle(root).getPropertyValue(token).trim();
      });
      this.apply();
    },
    overrides() { return storage.read(CONFIG.storageKeys.colors) || {}; },
    hasOverrides() { return Object.keys(this.overrides()).length > 0; },
    /** The theme chosen in this browser, else the "active" theme of the HTML. */
    activeThemeName() {
      const chosen = storage.read(CONFIG.storageKeys.theme);
      if (themeLibrary.colorsOf(chosen)) return chosen;
      return themeLibrary.colorsOf(themeLibrary.builtIn.active) ? themeLibrary.builtIn.active : null;
    },
    /** All ten colours as they are on screen now. */
    current() {
      const colors = Object.assign({}, this.cssDefaults, themeLibrary.colorsOf(this.activeThemeName()) || {}, this.overrides());
      const result = {};
      COLOR_SETTINGS.forEach(({ token }) => { result[token] = isHexColor(colors[token]) ? colors[token].toLowerCase() : this.cssDefaults[token]; });
      return result;
    },
    valueOf(token) { return this.current()[token]; },
    /** The active theme's look (fonts, corners, titles): only the tokens it sets, each checked. */
    look() {
      const theme = themeLibrary.colorsOf(this.activeThemeName()) || {};
      const look = {};
      THEME_STYLE_TOKENS.forEach(token => { if (isStyleValue(token, theme[token])) look[token] = theme[token]; });
      return look;
    },
    /** The colours on screen and the theme's look: what a saved, exported or copied theme holds. */
    currentWithLook() { return Object.assign({}, this.look(), this.current()); },
    /** Puts the colours on the page, and tells the browser whether the page is dark or light (scrollbars, pickers). */
    apply() {
      const colors = this.current();
      COLOR_SETTINGS.forEach(({ token }) => {
        if (colors[token] === this.cssDefaults[token]) root.style.removeProperty(token);
        else root.style.setProperty(token, colors[token]);
      });
      root.style.colorScheme = isDarkColor(colors['--color-background']) ? 'dark' : 'light';
      const look = this.look();   // the theme's fonts and shapes (a theme without them: the CSS's own)
      THEME_STYLE_TOKENS.forEach(token => { if (hasOwn(look, token)) root.style.setProperty(token, look[token]); else root.style.removeProperty(token); });
      runSafely('duotone', () => duotone.update(colors));   // the duotone image looks in these colours
    },
    set(token, colour) {
      const overrides = this.overrides();
      overrides[token] = colour;
      storage.write(CONFIG.storageKeys.colors, overrides);
      this.apply();
    },
    useTheme(name) {
      storage.write(CONFIG.storageKeys.theme, name);
      storage.write(CONFIG.storageKeys.colors, null);   // a theme starts without single changes
      this.apply();
    },
    /** Back to the theme the HTML file starts with. */
    reset() {
      storage.write(CONFIG.storageKeys.colors, null);
      storage.write(CONFIG.storageKeys.theme, null);
      this.apply();
    },
  };

  /** true for a dark #rrggbb colour (relative brightness below one half). */
  function isDarkColor(hex) {
    const value = parseInt(String(hex).replace('#', ''), 16);
    const brightness = (0.299 * ((value >> 16) & 255) + 0.587 * ((value >> 8) & 255) + 0.114 * (value & 255)) / 255;
    return brightness < 0.5;
  }

  /* ---- Files: download and pick ---- */

  /** Lets the browser download `content` (text or bytes) as a file. */
  function downloadFile(fileName, content, mimeType) {
    const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  /** "presentation-time-plan-2026-11-19-1432.json" */
  function exportFileName(kind, extension) {
    const now = new Date();
    const pad = number => String(number).padStart(2, '0');
    const stamp = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + '-' + pad(now.getHours()) + pad(now.getMinutes());
    return CONFIG.exportFilePrefix + '-' + kind + '-' + stamp + '.' + extension;
  }

  /** "1 min 06 s": readable, and Excel keeps it as text (it would read "1:06" as 1 hour 6 minutes). */
  function formatForSpreadsheet(seconds) {
    const sign = seconds < 0 ? '-' : '';
    const rounded = Math.abs(Math.round(seconds));
    return sign + Math.floor(rounded / 60) + ' min ' + String(rounded % 60).padStart(2, '0') + ' s';
  }

  /* ---- Export formats ----
     Every exported JSON file has a "type", so Import knows what it is. */

  /** { type: 'presentation-time-plan', slides: [{ name, title, seconds }] } */
  function buildTimePlanExport() {
    return {
      type: 'presentation-time-plan',
      version: 1,
      presentation: DEFAULT_TITLE,
      exportedAt: new Date().toISOString(),
      totalSeconds: timePlan.totalMs() / 1000,
      slides: scenes.slice(0, mainSlideCount).map((scene, index) => ({ name: scene.dataset.name, title: titleOf(scene), seconds: timePlan.seconds[index] })),   // backup slides are not in the plan
    };
  }

  /** Planned against realized time per slide, from the presenter view timer.
      The slide on screen is still running, so it is marked "in progress". */
  function buildRunReport() {
    const marginSeconds = CONFIG.pace.slideMarginMs / 1000;
    const slides = scenes.slice(0, mainSlideCount).map((scene, index) => {   // backup slides are not in the report
      const plannedSeconds = timePlan.seconds[index];
      const actualSeconds = presenterTimer.initialized ? Math.round(paceTracker.spentOn(index) / 1000) : 0;
      let status = 'on time';
      if (actualSeconds === 0) status = 'not timed';
      else if (index === state.currentIndex) status = 'in progress';
      else if (actualSeconds > plannedSeconds + marginSeconds) status = 'longer';
      else if (actualSeconds < plannedSeconds - marginSeconds) status = 'shorter';
      return {
        number: index + 1, name: scene.dataset.name, title: titleOf(scene),
        plannedSeconds, actualSeconds, differenceSeconds: actualSeconds - plannedSeconds, status,
      };
    });
    const timed = slides.filter(slide => slide.actualSeconds > 0);
    const sum = (list, field) => list.reduce((total, slide) => total + slide[field], 0);
    return {
      type: 'presentation-run-report',
      version: 1,
      presentation: DEFAULT_TITLE,
      exportedAt: new Date().toISOString(),
      totals: {
        plannedSeconds: sum(slides, 'plannedSeconds'),
        actualSeconds: sum(slides, 'actualSeconds'),
        plannedSecondsOfTimedSlides: sum(timed, 'plannedSeconds'),   // compare like with like
        timedSlides: timed.length,
      },
      slides,
    };
  }

  /** The run report as a table for Excel: tab-separated UTF-16 with a byte-order mark, which every
      Excel language opens correctly (accents included). The (s) columns are numbers you can sum. */
  function runReportToSpreadsheet(report) {
    const cell = text => String(text).replace(/[\t\r\n]+/g, ' ');
    const rows = [['Slide', 'Title', 'Planned (s)', 'Actual (s)', 'Difference (s)', 'Planned', 'Actual', 'Difference', 'Status']];
    report.slides.forEach(slide => {
      const timed = slide.actualSeconds > 0;
      rows.push([slide.number, slide.title, slide.plannedSeconds, slide.actualSeconds, timed ? slide.differenceSeconds : '',
        formatForSpreadsheet(slide.plannedSeconds), formatForSpreadsheet(slide.actualSeconds), timed ? formatForSpreadsheet(slide.differenceSeconds) : '', slide.status]);
    });
    const totals = report.totals;
    const difference = totals.actualSeconds - totals.plannedSecondsOfTimedSlides;
    rows.push(['', 'Total (timed slides)', totals.plannedSecondsOfTimedSlides, totals.actualSeconds, difference,
      formatForSpreadsheet(totals.plannedSecondsOfTimedSlides), formatForSpreadsheet(totals.actualSeconds), formatForSpreadsheet(difference), totals.timedSlides + ' slides']);
    const text = rows.map(row => row.map(cell).join('\t')).join('\r\n') + '\r\n';
    const bytes = new Uint16Array(text.length + 1);   // UTF-16 little-endian, starting with the byte-order mark
    bytes[0] = 0xFEFF;
    for (let i = 0; i < text.length; i++) bytes[i + 1] = text.charCodeAt(i);
    return bytes;
  }

  /** { type: 'presentation-theme', name, colors } with the colours on screen now. */
  function buildThemeExport() {
    const name = colorSettings.hasOverrides() || !colorSettings.activeThemeName() ? 'Custom' : colorSettings.activeThemeName();
    return { type: 'presentation-theme', version: 1, name, colors: colorSettings.currentWithLook() };
  }

  /* ---- Using realized times as the plan ---- */

  /** Realized seconds per slide name that are worth keeping: finished slides of at least
      CONFIG.pace.minimumRealizedSeconds (the slide on screen is still running, so it is skipped). */
  function realizedSecondsByName(report) {
    const secondsByName = {};
    report.slides.forEach(slide => {
      if (slide.status === 'in progress' || slide.status === 'not timed') return;
      if (slide.actualSeconds >= CONFIG.pace.minimumRealizedSeconds) secondsByName[slide.name] = slide.actualSeconds;
    });
    return secondsByName;
  }

  /** Sets the plan from { slide name -> seconds }; returns how many slides matched. */
  function applyPlanSeconds(secondsByName) {
    let matched = 0;
    scenes.forEach((scene, index) => {
      if (!hasOwn(secondsByName, scene.dataset.name)) return;
      const seconds = Number(secondsByName[scene.dataset.name]);
      if (Number.isFinite(seconds) && seconds >= 0 && seconds < 36000) {
        timePlan.set(index, Math.round(seconds));
        matched++;
      }
    });
    return matched;
  }

  /* ---- Import: one button, the file's "type" decides what happens ---- */

  function slidesOf(data) {
    if (!Array.isArray(data.slides)) throw new Error('the file has no list of slides');
    return data.slides.filter(slide => slide && typeof slide === 'object' && typeof slide.name === 'string');
  }

  function importTimePlan(data) {
    const secondsByName = {};
    slidesOf(data).forEach(slide => { secondsByName[slide.name] = slide.seconds; });
    return ui('import.timePlan', { count: applyPlanSeconds(secondsByName) });
  }

  /** A realized-times file: its real times become the plan (short or untimed slides keep their time). */
  function importRunReport(data) {
    const report = { slides: slidesOf(data).map(slide => Object.assign({}, slide, { actualSeconds: Number(slide.actualSeconds) || 0 })) };
    return ui('import.runReport', { count: applyPlanSeconds(realizedSecondsByName(report)) });
  }

  function importTheme(data) {
    if (!data.colors || typeof data.colors !== 'object') throw new Error('the file has no colours');
    if (colorSettings.hasOverrides() && !askToConfirm(ui('confirm.importThemeLosesColours'))) return ui('import.cancelled');
    const colors = {};
    let missing = 0;
    COLOR_SETTINGS.forEach(({ token }) => {
      const value = data.colors[token];
      if (isHexColor(value)) colors[token] = value.toLowerCase();
      else { colors[token] = colorSettings.cssDefaults[token]; missing++; }
    });
    THEME_STYLE_TOKENS.forEach(token => { if (isStyleValue(token, data.colors[token])) colors[token] = data.colors[token]; });   // (its fonts and shapes)
    let name = cleanThemeName(data.name, ui('theme.importedName'));
    if (themeLibrary.isBuiltIn(name)) name += ' ' + ui('theme.importedSuffix');
    const replaced = themeLibrary.isInBrowser(name);
    themeLibrary.save(name, colors);
    colorSettings.useTheme(name);
    return ui('import.theme', { name }) + (replaced ? ' ' + ui('import.themeReplaced') : '') +
      (missing ? ', ' + ui('import.themeMissingColours', { count: missing }) : '');
  }

  const IMPORTERS = { 'presentation-time-plan': importTimePlan, 'presentation-run-report': importRunReport, 'presentation-theme': importTheme, 'presentation-texts': importTexts };

  async function importFile(file) {
    try {
      const data = JSON.parse(await file.text());
      const type = data && typeof data === 'object' ? data.type : null;
      if (!hasOwn(IMPORTERS, type)) {
        showToast(ui('toast.importNotRecognized', { file: file.name }));
        return;
      }
      showToast(ui('toast.imported', { what: IMPORTERS[type](data) }));
    } catch (error) {
      showToast(ui('toast.importFailed', { file: file.name, error: error.message }));
    }
    settingsPanel.render();
    updatePresenterView();
  }

  /* ---- Save a copy of the whole presentation with the settings written into it ----
     The page keeps the HTML as it was loaded (ORIGINAL_HTML). The copy gets the current time plan
     as data-estimate values, all themes in the THEMES block, the spotlight settings as data-spotlight
     on the deck, the changed slide texts in the slides themselves, the interface texts in their
     block, and a new deck id, so the browser starts the copy with exactly these values instead of
     settings saved for the original. */
  function buildPresentationCopy() {
    const copy = new DOMParser().parseFromString(ORIGINAL_HTML, 'text/html');
    applySlideSettingsTo(copy);
    applyGlobalSettingsTo(copy);
    giveNewDeckId(copy);
    return serializeDocument(copy);
  }

  /** The settings of single slides, kept in this browser, written into `copy`: time plan (only the times
      this browser changed), changed texts, swapped images. Running it twice changes nothing more. */
  function applySlideSettingsTo(copy) {
    const savedTimes = storage.read(CONFIG.storageKeys.estimates) || {};
    copy.querySelectorAll('section.scene[data-name]').forEach(section => {
      const seconds = savedTimes[section.getAttribute('data-name')];
      if (Number.isFinite(seconds)) section.setAttribute('data-estimate', seconds);
    });
    slideTexts.writeInto(copy);
    imageSwaps.writeInto(copy);
  }

  /** The settings of the whole presentation written into `copy`: all themes (the one on screen as "active"),
      the spotlight settings and the interface texts. */
  function applyGlobalSettingsTo(copy) {
    const themesBlock = copy.getElementById('deckThemes');
    const interfaceTextsBlock = copy.getElementById('deckUiTexts');
    const copyDeck = copy.getElementById('deck');
    if (!themesBlock || !copyDeck || !interfaceTextsBlock) throw new Error(ui('error.copyBlocksMissing'));
    const themes = themeLibrary.all();
    let active = colorSettings.activeThemeName();
    if (colorSettings.hasOverrides() || !active) {
      active = 'Custom';
      for (let n = 2; hasOwn(themes, active); n++) active = 'Custom ' + n;   // never replace an existing theme
      themes[active] = colorSettings.currentWithLook();
    }
    const json = JSON.stringify({ active, themes }, null, 2).replace(/</g, '\\u003c');   // never closes the <script> by accident
    themesBlock.textContent = '\n' + json + '\n';
    copyDeck.setAttribute('data-spotlight', JSON.stringify(spotlightSettings.current()));
    interfaceTextsBlock.textContent = '\n' + JSON.stringify(interfaceTexts.merged(), null, 2).replace(/</g, '\\u003c') + '\n';
  }

  /** A deck id of its own, so the browser keeps the copy's settings apart from the original's. */
  function giveNewDeckId(copy) {
    const baseId = DECK_ID.replace(/-copy-[a-z0-9]+$/, '');
    copy.getElementById('deck').setAttribute('data-deck-id', baseId + '-copy-' + Date.now().toString(36));
  }

  /** The document as the text of an HTML file. */
  function serializeDocument(copy) {
    if (!copy.querySelector('meta[charset]')) {   // make sure "·", "≈" and accents survive
      const meta = copy.createElement('meta');
      meta.setAttribute('charset', 'utf-8');
      copy.head.prepend(meta);
    }
    return '<!doctype html>\n' + copy.documentElement.outerHTML;
  }

  /* ---- The settings panel ---- */
  const settingsPanel = {
    element: byId('settingsPanel'),
    colorInputs: [],      // { token, input }
    estimateInputs: [],   // one per slide
    realizedLabels: [],   // "took 1:06" next to each time field
    estimateTitles: [],   // the slide title next to each time field

    isOpen() { return !this.element.hidden; },
    open() {
      this.render();
      this.element.hidden = false;
      byId('btnCloseSettings').focus();
    },
    close() {
      this.element.hidden = true;
      if (document.activeElement) document.activeElement.blur();
    },
    /** Tab and Shift+Tab cycle through the panel only, never to the buttons behind it. */
    keepFocusInside(event) {
      const focusable = Array.from(this.element.querySelectorAll('button:not(:disabled):not([hidden]), input:not([hidden]), select'));
      const first = focusable[0], last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (!this.element.contains(active) || (event.shiftKey && active === first) || (!event.shiftKey && active === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    },

    /** Creates the pickers, the time fields and the button actions once. */
    build() {
      this.buildColorPickers();
      this.buildEstimateFields();
      const onClick = (id, action) => byId(id).addEventListener('click', () => { action(); this.render(); updatePresenterView(); });

      // spotlight: size (% of the slide height), darkness (%) and "show while the mouse moves"
      const onSpotlightChange = (id, eventName, read) => byId(id).addEventListener(eventName, event => {
        spotlightSettings.save(read(event.target));
        pointerTools.applySpotlightSettings();
        this.renderSpotlight();
      });
      onSpotlightChange('spotlightSize', 'input', input => ({ sizePercent: Number(input.value) }));
      onSpotlightChange('spotlightDim', 'input', input => ({ dimPercent: Number(input.value) }));
      onSpotlightChange('spotlightFollow', 'change', input => ({ followEnabled: input.checked }));
      onClick('btnResetSpotlight', () => { spotlightSettings.reset(); pointerTools.applySpotlightSettings(); });

      // booth mode and live captions
      byId('boothSeconds').addEventListener('change', event => {
        const seconds = clamp(parseInt(event.target.value, 10) || CONFIG.booth.slideSeconds, CONFIG.booth.minSeconds, CONFIG.booth.maxSeconds);
        boothMode.saveSeconds(seconds);
        event.target.value = seconds;
      });
      byId('btnStartBooth').addEventListener('click', () => boothMode.start());
      const languageSelect = byId('captionsLanguage');
      CONFIG.captions.languages.forEach(({ code, label }) => languageSelect.append(new Option(label, code)));
      languageSelect.addEventListener('change', () => liveCaptions.saveLanguage(languageSelect.value));
      byId('captionsOn').addEventListener('change', event => { if (event.target.checked) liveCaptions.start(); else liveCaptions.stop(); });

      // theme and colours
      byId('themeSelect').addEventListener('change', event => {
        const name = event.target.value;
        const losesCustomColors = colorSettings.hasOverrides() && name;
        if (losesCustomColors && !askToConfirm(ui('confirm.switchThemeLosesColours', { name }))) {
          this.render();   // back to "Custom (not saved)"
          return;
        }
        if (name) colorSettings.useTheme(name);
        this.render();
      });
      onClick('btnDeleteTheme', () => {
        const name = colorSettings.activeThemeName();
        if (!themeLibrary.isInBrowser(name)) return;
        themeLibrary.remove(name);
        colorSettings.reset();
        showToast(ui('toast.themeDeleted', { name }));
      });
      onClick('btnSaveTheme', () => {
        const typed = byId('themeName').value.trim();
        if (!typed) { showToast(ui('toast.themeNameNeeded')); return; }
        const name = cleanThemeName(typed, ui('theme.defaultName'));
        if (themeLibrary.isBuiltIn(name)) { showToast(ui('toast.themeNameBuiltIn', { name })); return; }
        const replaced = themeLibrary.isInBrowser(name);
        themeLibrary.save(name, colorSettings.currentWithLook());
        colorSettings.useTheme(name);
        byId('themeName').value = '';
        showToast(ui(replaced ? 'toast.themeUpdated' : 'toast.themeSaved', { name }));
      });
      onClick('btnResetColors', () => colorSettings.reset());

      // time plan
      onClick('btnResetEstimates', () => timePlan.reset());
      onClick('btnUseRealizedTimes', () => {
        const secondsByName = realizedSecondsByName(buildRunReport());
        const count = Object.keys(secondsByName).length;
        const minimum = CONFIG.pace.minimumRealizedSeconds;
        if (!count) { showToast(ui('toast.noRealizedTimes', { seconds: minimum })); return; }
        if (!askToConfirm(ui('confirm.useRealizedTimes', { count, seconds: minimum }))) return;
        showToast(ui('import.runReport', { count: applyPlanSeconds(secondsByName) }) + '.');
      });

      // export and import
      onClick('btnExportPlan', () => downloadFile(exportFileName('time-plan', 'json'), JSON.stringify(buildTimePlanExport(), null, 2), 'application/json'));
      onClick('btnExportReportCsv', () => downloadFile(exportFileName('realized-times', 'csv'), runReportToSpreadsheet(buildRunReport()), 'text/csv'));
      onClick('btnExportReportJson', () => downloadFile(exportFileName('realized-times', 'json'), JSON.stringify(buildRunReport(), null, 2), 'application/json'));
      onClick('btnExportTexts', () => downloadFile(exportFileName('texts', 'json'), JSON.stringify(slideTexts.buildExport(), null, 2), 'application/json'));
      onClick('btnResetTexts', () => {
        if (!slideTexts.hasChanges() && !Object.keys(interfaceTexts.overrides()).length) return;
        if (!askToConfirm(ui('confirm.resetTexts'))) return;
        textEditor.resetAll();
      });
      onClick('btnExportTheme', () => {
        const theme = buildThemeExport();
        const slug = theme.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'theme';
        downloadFile(exportFileName('theme-' + slug, 'json'), JSON.stringify(theme, null, 2), 'application/json');
      });
      const fileInput = byId('importFile');
      byId('btnImport').addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', () => {
        if (fileInput.files[0]) importFile(fileInput.files[0]);
        fileInput.value = '';   // so the same file can be imported again
      });

      // presentation file
      onClick('btnPrintSlides', () => printSlides(false));
      onClick('btnPrintHandout', () => printSlides(true));
      onClick('btnSaveCopy', () => {
        try {
          downloadFile(CONFIG.copyFileName, buildPresentationCopy(), 'text/html');
        } catch (error) {
          showToast(ui('toast.saveCopyFailed', { error: error.message }));
        }
      });
      const isEmbedded = window.top !== window;   // inside a web page (e.g. the published artifact) downloads may be blocked
      byId('btnSaveCopy').hidden = isEmbedded;
      byId('saveCopyEmbeddedNote').hidden = !isEmbedded;
      byId('btnShowTemplates').hidden = !byId('slideTemplates');   // a copy without the editor has none
      byId('btnShowTemplates').dataset.ui = SHOW_TEMPLATES ? 'settings.hideTemplates' : 'settings.showTemplates';
      byId('btnShowTemplates').addEventListener('click', () => {
        const hasRealizedTimes = presenterTimer.initialized && scenes.some((scene, index) => paceTracker.spentOn(index) >= 1000);
        if (hasRealizedTimes && !askToConfirm(ui('confirm.reloadForTemplates'))) return;
        const url = new URL(location.href);
        url.hash = '';
        if (SHOW_TEMPLATES) url.searchParams.delete('templates');
        else { url.searchParams.set('templates', '1'); url.hash = 'template-title'; }
        location.href = url.href;
      });

      byId('btnCloseSettings').addEventListener('click', () => this.close());
      // a click outside the card closes the panel (only when the press also started outside it,
      // so selecting text in a field and releasing outside does not close it)
      let pressStartedOutside = false;
      this.element.addEventListener('pointerdown', event => { pressStartedOutside = event.target === this.element; });
      this.element.addEventListener('click', event => {
        if (pressStartedOutside && event.target === this.element) this.close();
      });
    },

    buildColorPickers() {
      const pickers = byId('colorPickers');
      COLOR_SETTINGS.forEach(({ token, labelKey }) => {
        const row = document.createElement('label');
        const label = document.createElement('span');
        label.dataset.ui = labelKey;   // applyInterfaceTexts refills it after a text change
        label.textContent = ui(labelKey);
        const input = document.createElement('input');
        input.type = 'color';
        input.addEventListener('input', () => {   // live preview
          colorSettings.set(token, input.value);
          this.renderThemeChoice();
        });
        row.append(input, label);
        pickers.appendChild(row);
        this.colorInputs.push({ token, input });
      });
    },

    buildEstimateFields() {
      const list = byId('estimateInputs');
      scenes.slice(0, mainSlideCount).forEach((scene, index) => {   // backup slides are not in the time plan
        const row = document.createElement('label');
        const name = document.createElement('span');
        const number = document.createElement('b');
        const input = document.createElement('input');
        const realized = document.createElement('small');
        number.textContent = index + 1;
        const title = document.createElement('span');
        title.className = 'estimate-title';
        name.append(number, title);
        this.estimateTitles.push(title);
        realized.className = 'realized-time';
        input.addEventListener('input', () => {
          const isInvalid = parseMinutesSeconds(input.value) === null;
          input.classList.toggle('is-invalid', isInvalid);
          input.setAttribute('aria-invalid', isInvalid ? 'true' : 'false');
        });
        input.addEventListener('blur', () => {      // leaving an invalid field shows the saved time again
          if (parseMinutesSeconds(input.value) !== null) return;
          input.value = formatMinutesSeconds(timePlan.seconds[index]);
          input.classList.remove('is-invalid');
          input.setAttribute('aria-invalid', 'false');
        });
        input.addEventListener('change', () => {
          const seconds = parseMinutesSeconds(input.value);
          if (seconds === null) return;          // keep the old value until the text is valid
          input.value = formatMinutesSeconds(seconds);   // "90" becomes "1:30"
          timePlan.set(index, seconds);
          this.render();
          updatePresenterView();
        });
        row.append(name, input, realized);
        list.appendChild(row);
        this.estimateInputs.push(input);
        this.realizedLabels.push(realized);
      });
    },

    /** The theme list; "Custom (not saved)" while single colours were changed. */
    renderThemeChoice() {
      const select = byId('themeSelect');
      const active = colorSettings.activeThemeName();
      const showCustom = colorSettings.hasOverrides() || !active;
      select.innerHTML = '';
      if (showCustom) select.append(new Option(ui('theme.customNotSaved'), ''));
      themeLibrary.names().forEach(name => {
        select.append(new Option(name + (themeLibrary.isBuiltIn(name) ? '' : ' ' + ui('theme.thisBrowserSuffix')), name));
      });
      select.value = showCustom ? '' : active;
      byId('btnDeleteTheme').disabled = showCustom || !themeLibrary.isInBrowser(active);
    },

    /** The realized times: refreshed every presenter tick while the panel is open. */
    renderRealized() {
      const hasRun = presenterTimer.initialized;
      ['btnExportReportCsv', 'btnExportReportJson', 'btnUseRealizedTimes'].forEach(id => { byId(id).disabled = !hasRun; });
      const report = buildRunReport();
      report.slides.forEach((slide, index) => {
        const label = this.realizedLabels[index];
        if (!label) return;   // backup slides have no time field
        const time = formatMinutesSeconds(slide.actualSeconds);
        label.textContent = slide.actualSeconds > 0 ? ui(slide.status === 'in progress' ? 'settings.realizedNow' : 'settings.realizedTook', { time }) : '';
        label.classList.toggle('is-over-time', slide.status === 'longer');
      });
      byId('realizedNote').textContent = hasRun
        ? ui('settings.realizedSoFar', { actual: formatMinutesSeconds(report.totals.actualSeconds), slides: report.totals.timedSlides,
          planned: formatMinutesSeconds(report.totals.plannedSecondsOfTimedSlides) })
        : ui('settings.realizedExplained');
    },

    /** Says where the current settings come from, so a surprise is explainable. */
    renderSource() {
      const fromBrowser = [];
      if (storage.read(CONFIG.storageKeys.theme) || colorSettings.hasOverrides()) fromBrowser.push(ui('source.colours'));
      const savedTimes = Object.keys(storage.read(CONFIG.storageKeys.estimates) || {}).length;
      if (savedTimes) fromBrowser.push(ui('source.slideTimes', { count: savedTimes }));
      if (spotlightSettings.hasBrowserValues()) fromBrowser.push(ui('source.spotlight'));
      const changedTexts = slideTexts.changeCount() + Object.keys(interfaceTexts.overrides()).length;
      if (changedTexts) fromBrowser.push(ui('source.texts', { count: changedTexts }));
      byId('settingsSource').textContent = fromBrowser.length
        ? ui('source.thisBrowser', { what: fromBrowser.join(ui('source.and')) })
        : ui('source.file');
    },

    /** Shows the current values. */
    render() {
      applyInterfaceTexts(this.element);
      this.estimateTitles.forEach((title, index) => { title.textContent = titleOf(scenes[index]); });
      this.renderThemeChoice();
      this.colorInputs.forEach(({ token, input }) => { input.value = colorSettings.valueOf(token); });
      this.estimateInputs.forEach((input, index) => {
        if (input === document.activeElement) return;   // never overwrite what is being typed
        input.value = formatMinutesSeconds(timePlan.seconds[index]);
        input.classList.remove('is-invalid');
      });
      byId('estimateTotal').textContent = ui('settings.total', { time: formatMinutesSeconds(timePlan.totalMs() / 1000) });
      this.renderRealized();
      this.renderSource();
      this.renderSpotlight();
      this.renderBoothAndCaptions();
    },
    renderBoothAndCaptions() {
      byId('boothSeconds').value = boothMode.settings().slideSeconds;
      byId('captionsLanguage').value = liveCaptions.language();
      byId('captionsOn').checked = liveCaptions.on;
      byId('captionsOn').disabled = !liveCaptions.isSupported();
      byId('captionsUnsupported').hidden = liveCaptions.isSupported();
    },
    renderSpotlight() {
      const settings = spotlightSettings.current();
      byId('spotlightSize').value = settings.sizePercent;
      byId('spotlightSizeValue').textContent = settings.sizePercent + ' %';   // the slider shows a number, no text
      byId('spotlightDim').value = settings.dimPercent;
      byId('spotlightDimValue').textContent = settings.dimPercent + ' %';
      byId('spotlightFollow').checked = settings.followEnabled;
    },
  };

  /** A setting changed in the other window (or another tab with this file). */
  function handleStorageChange(event) {
    if (event.key) storage.forget(event.key);
    const colorKeys = [CONFIG.storageKeys.colors, CONFIG.storageKeys.theme, CONFIG.storageKeys.themes];
    if (colorKeys.includes(event.key)) colorSettings.apply();
    if (event.key === CONFIG.storageKeys.spotlight) pointerTools.applySpotlightSettings();
    if (event.key === CONFIG.storageKeys.estimates) {
      timePlan.load();
      updatePresenterView();
    }
    if (event.key === CONFIG.storageKeys.slideTexts) slideTexts.reload();
    if (event.key === CONFIG.storageKeys.interfaceTexts) {
      interfaceTexts.reload();
      refreshInterfaceTexts();
    }
    if (settingsPanel.isOpen()) settingsPanel.render();
  }

