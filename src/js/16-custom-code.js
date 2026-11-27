  /* ===========================================================================
     16b. CUSTOM CODE: your own JavaScript, through hooks (the object customCode)
     WHERE IT IS     the whole presentation: <script type="text/plain" id="deckCustomJs">;
                     one slide: <script type="text/plain" data-slide-js> inside that
                     slide. "text/plain": the browser does not run them by itself; this
                     section does, with a helper called show (the editor's Code tab
                     writes both, with snippets).
     WHAT IT GETS    show.onEnter(fn)  fn(slide, { name }) each time a slide comes on (the
                                      presentation's script: every slide; a slide's
                                      script: that slide)
                     show.onStep(fn)   fn(step, slide) at each click
                     show.onLeave(fn)  fn(slide) when it goes
                     show.after(ms, fn), show.every(ms, fn), show.on(target, type, fn),
                     show.add(element[, parent])   timers, listeners and added elements
                                      that end by themselves when the slide goes
                     show.find(selector), show.findAll(selector)   in this slide
                     show.slide        the slide (a slide's script)
                     show.window       'single', 'presenter' (with the presenter view),
                                      'audience' (the audience window) or 'editor' (▶ in
                                      the Code tab): both windows run the scripts, so a
                                      sound or a counter can pick one
     SAFE            an error never stops the talk: it is caught, written to the console
                     (and shown in the Code tab). ?safe=1 after the file name opens the
                     presentation with all of these scripts off.
     =========================================================================== */


  const customCode = {
    safe: /[?&]safe=1\b/.test(location.search),
    ready: false,
    deckHooks: { enter: [], step: [], leave: [] },
    slideHooks: new WeakMap(),   // slide → its compiled hooks (made the first time it comes on)
    current: null,               // { scene, cleanups, deckHooks, slideHooks } of the slide on screen
    errors: [],                  // the last errors: { where, message }
    editorWindow: false,         // true while ▶ in the Code tab runs them on the editor's canvas

    /** At start-up (before the first slide): the presentation's script runs once and gives its hooks. */
    start() {
      if (this.safe) {
        if (this.hasCode(document)) showToast(ui('toast.safeMode'));
        return;
      }
      const block = byId('deckCustomJs');
      this.deckHooks = this.compile(block ? block.textContent : '', ui('code.wherePresentation'), null);
      this.ready = true;
    },
    hasCode(root) {
      const block = root.getElementById ? root.getElementById('deckCustomJs') : null;
      return !!(block && block.textContent.trim()) || Array.from(root.querySelectorAll('script[data-slide-js]')).some(script => script.textContent.trim());
    },
    /** A script's text, run once with show; its hooks. */
    compile(text, where, slide) {
      const hooks = { enter: [], step: [], leave: [] };
      if (!String(text).trim()) return hooks;
      try { const api = this.api(hooks, slide); new Function('show', String(text))(api); } catch (error) { this.report(where, error); }
      return hooks;
    },
    api(hooks, slide) {
      const self = this;
      const track = cleanup => { if (self.current) self.current.cleanups.push(cleanup); };
      return {
        slide,
        get window() { return self.windowKind(); },
        onEnter(fn) { if (typeof fn === 'function') hooks.enter.push(fn); },
        onStep(fn) { if (typeof fn === 'function') hooks.step.push(fn); },
        onLeave(fn) { if (typeof fn === 'function') hooks.leave.push(fn); },
        after(ms, fn) { const id = setTimeout(() => self.safely(fn, [], 'after'), ms); track(() => clearTimeout(id)); return id; },
        every(ms, fn) { const id = setInterval(() => self.safely(fn, [], 'every'), Math.max(16, Number(ms) || 0)); track(() => clearInterval(id)); return id; },
        on(target, type, fn, options) { if (!target || !target.addEventListener) return; target.addEventListener(type, fn, options); track(() => target.removeEventListener(type, fn, options)); },
        add(element, parent) { const host = parent || (self.current && self.current.scene) || slide; if (!host || !element) return element; host.appendChild(element); track(() => element.remove()); return element; },
        find(selector) { const root = (self.current && self.current.scene) || slide; return root ? root.querySelector(selector) : null; },
        findAll(selector) { const root = (self.current && self.current.scene) || slide; return root ? Array.from(root.querySelectorAll(selector)) : []; },
        log(...parts) { console.log('[show]', ...parts); },
      };
    },
    windowKind() { return this.editorWindow ? 'editor' : sync.isAudience ? 'audience' : presenter.panel ? 'presenter' : 'single'; },
    safely(fn, args, where) {
      try { return fn(...args); } catch (error) { this.report(where, error); return undefined; }
    },
    report(where, error) {
      const message = (error && (error.message || String(error))) || 'error';
      this.errors.push({ where, message });
      if (this.errors.length > 20) this.errors.shift();
      console.warn('[show] ' + where + ': ' + message);
    },
    /** A slide's script, compiled once (its top-level code runs then). */
    hooksOf(scene) {
      if (!this.slideHooks.has(scene)) {
        const script = scene.querySelector(':scope > script[data-slide-js]');
        this.slideHooks.set(scene, this.compile(script ? script.textContent : '', ui('code.whereSlide', { name: scene.dataset.name }), scene));
      }
      return this.slideHooks.get(scene);
    },

    /* ---- Called by navigation (section 8) ---- */
    enter(scene, hooks) {
      if (!this.ready && !hooks) return;
      this.leave();
      const where = ui('code.whereSlide', { name: scene.dataset.name });
      const run = this.current = { scene, cleanups: [], deckHooks: hooks ? hooks.deck : this.deckHooks, slideHooks: null };
      run.slideHooks = hooks ? hooks.slide : this.hooksOf(scene);
      // a hook that goes to another slide ends this slide's turn: the hooks after it are not run for it
      for (const fn of run.deckHooks.enter) { if (this.current !== run) return; this.safely(fn, [scene, { name: scene.dataset.name }], ui('code.wherePresentation')); }
      for (const fn of run.slideHooks.enter) { if (this.current !== run) return; this.safely(fn, [scene, { name: scene.dataset.name }], where); }
    },
    step(scene, step) {
      const run = this.current;
      if (!run || run.scene !== scene) return;
      for (const fn of run.deckHooks.step) { if (this.current !== run) return; this.safely(fn, [step, scene], ui('code.wherePresentation')); }
      for (const fn of run.slideHooks.step) { if (this.current !== run) return; this.safely(fn, [step, scene], ui('code.whereSlide', { name: scene.dataset.name })); }
    },
    leave() {
      const run = this.current;
      if (!run) return;
      this.current = null;
      run.deckHooks.leave.forEach(fn => this.safely(fn, [run.scene], ui('code.wherePresentation')));
      run.slideHooks.leave.forEach(fn => this.safely(fn, [run.scene], ui('code.whereSlide', { name: run.scene.dataset.name })));
      run.cleanups.reverse().forEach(cleanup => { try { cleanup(); } catch (e) { /* already gone */ } });
    },
  };
