// Test harness: one headless Chrome (or Edge) for all suites, each suite in its own isolated tab (own storage).
// Works on Windows, macOS and Linux with Node 22+ and nothing else (no npm packages, no web server: the page is
// opened as a file). Set CHROME_PATH to use a particular browser.
//
// A suite gets `t` (see makePage) and uses:
//   t.open(hash)            open the built page (_preview.html) at #hash, with the test stubs (save window, file
//                           picker, colour picker) and a clean browser storage
//   t.waitFor(expr)         wait until the page expression is truthy (no fixed pauses: fast, and steady under load)
//   t.eval(expr)            run an expression in the page, get its value
//   t.key / t.type / t.mouse / t.click / t.drag / t.centre   real keyboard and mouse input (as a person would)
//   t.check(name, ok, extra) record a check;  t.errors: page errors (checked at the end of every suite)
//   t.editor.*              helpers for the editor (open, pick, tab, panelSet, goSlide, insert, …)
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir, homedir, platform } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
// speaker notes for the test page (see open): the deck's own are empty
const TEST_NOTES = readFileSync(new URL('./fixtures/speaker-notes.json', import.meta.url), 'utf8');

export const PROJECT = resolve(import.meta.dirname, '..', '..');
export const PAGE = process.env.DECK_TEST_PAGE || join(PROJECT, '_preview.html');   // (another page: tools/theme-shots.mjs --page)
export const sleep = ms => new Promise(r => setTimeout(r, ms));

/** The browser: CHROME_PATH, else Chrome, else Edge, at the usual places of each system. */
export function findBrowser() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const env = process.env, home = homedir();
  const candidates = {
    win32: [
      join(env.PROGRAMFILES || 'C:\\Program Files', 'Google\\Chrome\\Application\\chrome.exe'),
      join(env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Google\\Chrome\\Application\\chrome.exe'),
      join(env.LOCALAPPDATA || join(home, 'AppData\\Local'), 'Google\\Chrome\\Application\\chrome.exe'),
      join(env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Microsoft\\Edge\\Application\\msedge.exe'),
      join(env.PROGRAMFILES || 'C:\\Program Files', 'Microsoft\\Edge\\Application\\msedge.exe'),
    ],
    darwin: [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      join(home, 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    ],
    linux: ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/microsoft-edge'],
  }[platform()] || [];
  const found = candidates.find(path => existsSync(path));
  if (!found) throw new Error('No Chrome or Edge found. Set CHROME_PATH to the browser program.');
  return found;
}

const isAlive = pid => { try { process.kill(pid, 0); return true; } catch (error) { return error.code === 'EPERM'; } };

/** Closes test browsers left behind by runs that are gone (a run killed from outside cannot close its own browser).
    Each profile is named deck-test-<pid of its run>-…, so browsers of runs that still go on are left alone. */
function sweepOrphans() {
  let lines = [];
  try {
    lines = platform() === 'win32'
      ? execFileSync('powershell.exe', ['-NoProfile', '-Command', "Get-CimInstance Win32_Process -Filter \"Name='chrome.exe' or Name='msedge.exe'\" | Where-Object { $_.CommandLine -match 'deck-test-' } | ForEach-Object { \"$($_.ProcessId) $($_.CommandLine)\" }"], { encoding: 'utf8', windowsHide: true }).split(/\r?\n/)
      : execFileSync('ps', ['-ax', '-o', 'pid=,command='], { encoding: 'utf8' }).split('\n');
  } catch { return; }
  for (const line of lines) {
    const match = line.match(/^\s*(\d+)\s.*deck-test-(\d+)-/);
    if (!match || isAlive(Number(match[2]))) continue;
    try {
      if (platform() === 'win32') execFileSync('taskkill', ['/PID', match[1], '/T', '/F'], { stdio: 'ignore', windowsHide: true });
      else process.kill(Number(match[1]), 'SIGKILL');
    } catch { /* already gone */ }
  }
}

/** Windows: in a profile it has not used before, Chrome (and Edge) checks whether the Windows password is blank by
    trying to log on with an empty one. Each run here gets a new profile, so every run made one failed logon, and ten
    within ten minutes locked the Windows account (also for Remote Desktop). The person's own browser already saved
    the answer; copying it into the new profile means the test browser does not check again. */
function seedPasswordCheck(profile, browser) {
  if (platform() !== 'win32' || !process.env.LOCALAPPDATA) return;
  const vendor = /msedge/i.test(browser) ? ['Microsoft', 'Edge'] : ['Google', 'Chrome'];
  try {
    const saved = JSON.parse(readFileSync(join(process.env.LOCALAPPDATA, ...vendor, 'User Data', 'Local State'), 'utf8')).password_manager || {};
    if (!saved.os_password_last_changed) return;   // no saved answer: the browser checks itself, as before
    writeFileSync(join(profile, 'Local State'), JSON.stringify({ password_manager: {
      os_password_blank: saved.os_password_blank === true, os_password_last_changed: saved.os_password_last_changed } }));
  } catch { /* no saved answer: the browser checks itself, as before */ }
}

/** Starts the browser; returns { connection, close }. The browser and its profile are removed when the process ends. */
export async function startBrowser() {
  sweepOrphans();
  // profiles of earlier runs that could not be removed then (a file still locked): remove them now
  for (const entry of readdirSync(tmpdir())) {
    if (!entry.startsWith('deck-test-')) continue;
    try { if (Date.now() - statSync(join(tmpdir(), entry)).mtimeMs > 600000) rmSync(join(tmpdir(), entry), { recursive: true, force: true }); } catch { /* in use */ }
  }
  const profile = mkdtempSync(join(tmpdir(), 'deck-test-' + process.pid + '-'));   // the run's pid: see sweepOrphans
  const args = ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
    '--allow-file-access-from-files', '--window-size=1600,900', 'about:blank'];
  const browser = findBrowser();
  seedPasswordCheck(profile, browser);
  const child = spawn(browser, args, { stdio: 'ignore', detached: platform() !== 'win32' });
  let closed = false, finished = false, connection = null;
  const kill = () => {
    try {
      if (platform() === 'win32') execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
      else process.kill(-child.pid, 'SIGKILL');   // the whole process group
    } catch { /* already gone */ }
  };
  const removeProfile = () => { try { rmSync(profile, { recursive: true, force: true }); } catch { /* still locked: removed by a later run */ } };
  /** Closes the browser the quick way (asks it), else kills it. */
  const close = async () => {
    if (closed) return;
    closed = true;
    const exited = new Promise(done => { if (child.exitCode !== null) done(); else child.once('exit', done); });
    try { connection && connection.send('Browser.close'); } catch { /* not connected */ }
    await Promise.race([exited, sleep(2000)]);
    kill();   // also when the started program exited: on Windows Chrome may go on in another process
    sweepOrphans();
    removeProfile();
    finished = true;
  };
  process.on('exit', () => { if (!finished) { kill(); removeProfile(); } });   // also when the script ends in the middle of close()
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => process.exit(130));
  // the browser writes its port to DevToolsActivePort in the profile
  let port = null, browserPath = null;
  for (let i = 0; i < 150 && !port; i++) {
    await sleep(100);
    try { [port, browserPath] = readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').trim().split(/\r?\n/); } catch { /* not yet */ }
  }
  if (!port) { kill(); removeProfile(); finished = true; throw new Error('The browser did not start.'); }
  connection = await connect(`ws://127.0.0.1:${port}${browserPath}`);
  return { connection, close };
}

/** One DevTools connection for the browser and all its tabs (sessions). */
async function connect(url) {
  const socket = new WebSocket(url);
  await new Promise((resolveOpen, reject) => { socket.onopen = resolveOpen; socket.onerror = reject; });
  let id = 0;
  const pending = new Map(), listeners = new Set();
  socket.onmessage = message => {
    const data = JSON.parse(message.data);
    if (data.id && pending.has(data.id)) { pending.get(data.id)(data); pending.delete(data.id); return; }
    listeners.forEach(listener => listener(data));
  };
  const send = (method, params = {}, sessionId) => new Promise(resolveSend => {
    const messageId = ++id;
    pending.set(messageId, resolveSend);
    socket.send(JSON.stringify(sessionId ? { id: messageId, method, params, sessionId } : { id: messageId, method, params }));
  });
  return { send, on: listener => { listeners.add(listener); return () => listeners.delete(listener); }, socket };
}

/** The test stubs: a save window that keeps what is written (sessionStorage 'test-written'), a file picker that takes
    window.__nextFile, a colour picker that returns #12ab34 (or waits for Esc with window.__dropperWaits), confirm() = yes. */
const STUBS = `
  window.confirm = () => true;
  // (sessionStorage holds ~5.2 M characters: a saved file is kept with its long embedded fonts and pictures shortened)
  const shortenEmbedded = text => text.replace(/(;base64,)([A-Za-z0-9+\\/=]{20000,})/g, (whole, start, data) => start + data.slice(0, 64) + '[' + data.length + ' characters]');
  window.showSaveFilePicker = async options => ({ name: options.suggestedName, queryPermission: async () => 'granted', requestPermission: async () => 'granted',
    createWritable: async () => { const parts = []; return { write: async blob => parts.push(typeof blob === 'string' ? blob : await blob.text()),
      close: async () => { const list = JSON.parse(sessionStorage.getItem('test-written') || '[]'); list.forEach(file => { file.text = ''; }); list.push({ name: options.suggestedName, text: shortenEmbedded(parts.join('')) }); sessionStorage.setItem('test-written', JSON.stringify(list)); } }; } });   // older files keep their place, not their text (storage holds ~5 MB)
  window.EyeDropper = class { open() { window.__dropperOpened = (window.__dropperOpened || 0) + 1; return window.__dropperWaits ? new Promise((resolve, reject) => window.addEventListener('keydown', e => { if (e.key === 'Escape') setTimeout(() => reject(new DOMException('cancelled', 'AbortError')), 0); }, { capture: true, once: true })) : Promise.resolve({ sRGBHex: '#12ab34' }); } };
  window.__pngFile = () => new File([Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVR42mP8z8DwnwEJMDIwMDAwAAAvAgP/2Xq0YQAAAABJRU5ErkJggg=='), c => c.charCodeAt(0))], 'test.png', { type: 'image/png' });
  const originalClick = HTMLInputElement.prototype.click;
  HTMLInputElement.prototype.click = function () {
    if (this.type === 'file' && window.__nextFile) { const dt = new DataTransfer(); dt.items.add(window.__nextFile); this.files = dt.files; window.__nextFile = null; this.dispatchEvent(new Event('change')); return; }
    return originalClick.call(this);
  };`;

/** A new isolated tab (own cookies and storage) with the test API. Windows the page opens itself (the presenter view,
    the audience window) are in the same context: t.waitForWindow() gives them the same API. */
export async function makePage(connection, name) {
  const { browserContextId } = (await connection.send('Target.createBrowserContext', { disposeOnDetach: true })).result;
  const { targetId } = (await connection.send('Target.createTarget', { url: 'about:blank', browserContextId })).result;
  const t = await wrapTarget(connection, targetId, name);
  t.contextId = browserContextId;
  const close = t.close;
  t.close = async () => { await close(); try { await connection.send('Target.disposeBrowserContext', { browserContextId }); } catch { /* gone */ } };
  /** The next window this tab's page opens (window.open), with the same test API; `urlPart` picks it by its address. */
  t.waitForWindow = async (urlPart = '', timeout = 8000) => {
    await connection.send('Target.setDiscoverTargets', { discover: true });
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      const { targetInfos } = (await connection.send('Target.getTargets')).result;
      const found = targetInfos.find(info => info.type === 'page' && info.browserContextId === browserContextId && info.targetId !== targetId && info.url.includes(urlPart) && !t.windows.includes(info.targetId));
      if (found) { t.windows.push(found.targetId); return wrapTarget(connection, found.targetId, name + ' (window)'); }
      await sleep(50);
    }
    throw new Error('no new window' + (urlPart ? ' with ' + urlPart : ''));
  };
  t.windows = [];
  return t;
}

/** The test API for one tab or window. */
export async function wrapTarget(connection, targetId, name) {
  const { sessionId } = (await connection.send('Target.attachToTarget', { targetId, flatten: true })).result;
  const send = (method, params) => connection.send(method, params, sessionId);
  const errors = [], results = [];
  const off = connection.on(message => {
    if (message.sessionId !== sessionId) return;
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') errors.push(JSON.stringify(message.params.args.map(a => a.value || a.description)));
    if (message.method === 'Page.javascriptDialogOpening') send('Page.handleJavaScriptDialog', { accept: true });
  });
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });   // keyboard focus as in a window that has it (parallel tabs)
  await send('Page.addScriptToEvaluateOnNewDocument', { source: STUBS });

  const evaluate = async expression => {
    const reply = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (reply.result?.exceptionDetails) throw new Error(expression.slice(0, 200) + ' -> ' + (reply.result.exceptionDetails.exception?.description || reply.result.exceptionDetails.text));
    return reply.result?.result?.value;
  };
  const t = {
    name, send, errors, results, sleep,
    /** Calls `listener(params)` for each `method` event of this tab; returns a function that stops it. */
    onEvent: (method, listener) => connection.on(message => { if (message.sessionId === sessionId && message.method === method) listener(message.params); }),
    eval: evaluate,
    check(label, ok, extra = '') { results.push({ ok: !!ok, label, extra: String(extra ?? '') }); },
    /** Waits until `expression` is truthy (polls every 25 ms); returns its value, or throws after `timeout` ms. */
    async waitFor(expression, { timeout = 6000, label } = {}) {
      const end = Date.now() + timeout;
      let last;
      while (Date.now() < end) {
        try { last = await evaluate(expression); if (last) return last; } catch (error) { last = error.message; }
        await sleep(25);
      }
      throw new Error('waitFor timed out: ' + (label || expression.slice(0, 160)) + ' (last: ' + String(last).slice(0, 120) + ')');
    },
    /** Waits until nothing changes for a moment: no running animations or transitions (endless ones excepted). */
    settle(timeout = 4000) {
      return t.waitFor(`document.getAnimations().every(a => a.playState !== 'running' || a.effect.getComputedTiming().iterations === Infinity)`, { timeout, label: 'animations finished' }).catch(() => true);
    },
    /** Opens the built page at #hash. Each suite's tab starts with empty storage; clear: true empties it again. */
    async open(hash = 'title', { clear = false } = {}) {
      // leave the page first (a "leave this page?" question about unsaved changes is answered yes), then open it fresh
      if ((await evaluate('location.href')) !== 'about:blank') {
        await send('Page.navigate', { url: 'about:blank' });
        await t.waitFor(`location.href === 'about:blank'`, { label: 'left the page' });
      }
      await send('Page.navigate', { url: pathToFileURL(PAGE).href + '#' + hash });
      await t.waitFor(`document.readyState === 'complete' && !!document.querySelector('#stage .scene.is-active')`, { timeout: 15000, label: 'page loaded' });
      if (clear) {
        await evaluate(`localStorage.clear(); sessionStorage.clear(); indexedDB.deleteDatabase('presentation-deck-editor'); true`);
        await send('Page.reload', {});
        await t.waitFor(`document.readyState === 'complete' && !!document.querySelector('#stage .scene.is-active')`, { timeout: 15000, label: 'page reloaded' });
      }
      // the editor's welcome card (v162) counts as seen, so it covers nothing a test clicks; its own test removes the mark
      await evaluate(`(() => { try { if (!localStorage.getItem('presentation-editor.welcomed')) localStorage.setItem('presentation-editor.welcomed', 'test'); } catch (e) {} return true; })()`);
      // the tips at the moment of use (v182) count as seen, so they never replace a message a test reads
      await evaluate(`(() => { try { if (!localStorage.getItem('presentation-editor.tips')) localStorage.setItem('presentation-editor.tips', JSON.stringify(['cmd.tipPicture', 'cmd.tipChart', 'cmd.tipNumber', 'cmd.tipShape', 'cmd.tipList', 'cmd.tipText'])); } catch (e) {} return true; })()`);
      // the timeline starts closed for a new user (v163); the tests were written with it open, so they get it open
      await evaluate(`(() => { try { if (!localStorage.getItem('presentation-editor.timeline')) localStorage.setItem('presentation-editor.timeline', '{"open":true}'); } catch (e) {} return true; })()`);
      // some slides have no speaker notes; the presenter-view tests need notes, so the test page gets
      // placeholder notes (tools/test/fixtures/speaker-notes.json) on every slide whose notes are empty. Only the live page:
      // the editor builds its model from the file itself, so a saved file never gets them.
      await evaluate(`(() => { const notes = ${TEST_NOTES}; document.querySelectorAll('#stage > .scene').forEach(scene => { const aside = scene.querySelector(':scope > .speaker-notes'); if (aside && !aside.innerHTML.trim() && notes[scene.dataset.name]) aside.innerHTML = notes[scene.dataset.name]; }); return true; })()`);
      // the editor's docks pinned unless a suite chose otherwise (editor-app unpins them). Not in the page-start stubs: storage
      // touched that early in an audience window made it miss the presenter's text changes now and then
      await evaluate(`(() => { try { if (!localStorage.getItem('presentation-editor.layout')) localStorage.setItem('presentation-editor.layout', '{"left":true,"right":true}'); } catch (e) {} return true; })()`);
    },
    async key(key, code, keyCode, modifiers = 0) {
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: keyCode, modifiers, text: key.length === 1 && !(modifiers & 2) ? key : undefined });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: keyCode, modifiers });
    },
    type: text => send('Input.insertText', { text }),
    /** A mouse event; a move without `buttons` holds no button (as the pointer moving freely). */
    mouse: (type, x, y, { button, buttons, clickCount = 1, modifiers = 0 } = {}) => {
      const held = buttons ?? (type === 'mousePressed' ? 1 : 0);
      return send('Input.dispatchMouseEvent', { type, x, y, button: button ?? (type === 'mouseMoved' && !held ? 'none' : 'left'), buttons: held, clickCount, modifiers });
    },
    /** The middle of an element on screen (scrolled into view). */
    centre: selector => evaluate(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) throw new Error('not found: ' + ${JSON.stringify(selector)}); e.scrollIntoView({ block: 'center', inline: 'center' }); const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`),
    async clickAt(point, options = {}) {
      await t.mouse('mouseMoved', point.x, point.y, { modifiers: options.modifiers || 0 });   // as a person: the pointer gets there first
      await t.mouse('mousePressed', point.x, point.y, { ...options, buttons: options.button === 'right' ? 2 : 1 });
      await t.mouse('mouseReleased', point.x, point.y, { ...options, buttons: 0 });
    },
    /** A real click in the middle of the element; stops with a clear message when something else lies on top of it there. */
    async click(selector, options) {
      const point = await t.centre(selector);
      await t.mouse('mouseMoved', point.x, point.y, { modifiers: (options && options.modifiers) || 0 });   // the pointer there first (what lies on top can depend on it)
      const covered = await evaluate(`(() => { const target = document.querySelector(${JSON.stringify(selector)}), top = document.elementFromPoint(${point.x}, ${point.y}); return !top ? 'nothing (outside the window)' : target.contains(top) ? '' : (top.className || top.tagName) + (top.dataset && top.dataset.action ? ' [' + top.dataset.action + ']' : ''); })()`);
      if (covered) throw new Error('cannot click ' + selector + ': covered by ' + covered);
      await t.clickAt(point, options);
    },
    /** A real drag in `steps` moves; `during` runs before letting go (to look at the page mid-drag). */
    async drag(from, dx, dy, { modifiers = 0, steps = 8, during } = {}) {
      await t.mouse('mousePressed', from.x, from.y, { buttons: 1, modifiers });
      for (let i = 1; i <= steps; i++) await t.mouse('mouseMoved', from.x + dx * i / steps, from.y + dy * i / steps, { buttons: 1, modifiers });
      if (during) await during();
      await t.mouse('mouseReleased', from.x + dx, from.y + dy, { buttons: 0, modifiers });
    },
    async screenshot(file, options = {}) {   // options: { clip: { x, y, width, height, scale } } for part of the page
      const reply = await send('Page.captureScreenshot', Object.assign({ format: 'png' }, options));
      (await import('node:fs')).writeFileSync(file, Buffer.from(reply.result.data, 'base64'));
    },
    connection, targetId,
    async close() { off(); try { await connection.send('Target.detachFromTarget', { sessionId }); } catch { /* gone */ } },
  };
  t.editor = editorHelpers(t);
  return t;
}

/** Helpers for the editor (section 17–20 of the page). */
function editorHelpers(t) {
  const q = JSON.stringify;
  const e = {
    /** Opens the page at #hash and the editor (E). */
    async open(hash = 'numbers') {
      await t.open(hash);
      await t.key('e', 'KeyE', 69);
      await t.waitFor(`!!document.querySelector('.editor .editor-stage .scene')`, { label: 'editor open' });
    },
    /** Selects an element on the canvas (as a click would). */
    async pick(selector, { shift = false } = {}) {
      await t.eval(`document.querySelector(${q(selector)}).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, shiftKey: ${shift} }))`);
      await t.waitFor(`!!document.querySelector('.editor-stage .is-editor-selected')`);
    },
    blur: () => t.eval(`document.activeElement && document.activeElement.blur && document.activeElement.blur(); true`),
    async tab(name) { await t.eval(`document.querySelector('.editor-tabs [data-tab="${name}"]').click()`); await t.waitFor(`document.querySelector('.editor-tabs [data-tab="${name}"]').classList.contains('is-selected')`); },
    /** Sets a panel field the way typing and leaving it would. */
    panelSet: (selector, value) => t.eval(`(() => { const f = document.querySelector('.editor-panel-body ' + ${q(selector)}); f.value = ${q(value)}; f.dispatchEvent(new Event('input', { bubbles: true })); f.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`),
    /** Opens the folded panel section a control sits in, as a click on its heading would (sections: js/17 foldSections). */
    unfoldFor: selector => t.eval(`(() => { const c = document.querySelector('.editor-panel-body ' + ${q(selector)}); const s = c && c.closest('.editor-section'); if (s && s.hidden) s.previousElementSibling.click(); return true; })()`),
    async goSlide(name) {
      await t.eval(`[...document.querySelectorAll('.editor-slide-list > li')].find(li => li.querySelector('.scene')?.dataset.name === ${q(name)})?.click()`);
      await t.waitFor(`document.querySelector('.editor-stage .scene')?.dataset.name === ${q(name)}`);
    },
    /** The selected slide as saved in the model (its thumbnail is a copy). */
    modelHtml: () => t.eval(`document.querySelector('.editor-slide-list li.is-selected .scene').outerHTML`),
    selected: `document.querySelector('.editor-stage .is-editor-selected')`,
    value: name => t.eval(`parseFloat(document.querySelector('.editor-stage .is-editor-selected').style.getPropertyValue(${q(name)})) || 0`),
    toast: () => t.eval(`document.querySelector('.toast')?.textContent || ''`),
    /** Inserts a block from + Insert in the bar; waits until it is selected. */
    async insert(kind) {
      await t.click('.editor-bar [data-action="insert-menu"]');
      await t.waitFor(`!!document.querySelector('.editor-insert-menu [data-kind="${kind}"]')`);
      const before = await t.eval(`document.querySelectorAll('.editor-stage .scene *').length`);
      await t.click(`.editor-insert-menu [data-kind="${kind}"]`);
      await t.waitFor(`document.querySelectorAll('.editor-stage .scene *').length > ${before} && !!document.querySelector('.editor-stage .is-editor-selected')`);
    },
    undo: async () => { await e.blur(); await t.key('z', 'KeyZ', 90, 2); },
    scale: () => t.eval(`document.querySelector('.editor-stage').getBoundingClientRect().width / 1600`),
  };
  return e;
}
