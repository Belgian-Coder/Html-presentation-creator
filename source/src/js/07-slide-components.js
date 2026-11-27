  /* ===========================================================================
     7. SLIDE COMPONENTS
     Building blocks that work on any slide, without a behaviour of their own.
     Put the HTML on a slide (see the slide templates) and they work:
       .break-timer   a countdown to the end of a break ("Back at 14:30")
       .qr-code       a QR code drawn from data-qr (a link), offline
       video.slide-video  plays when the slide comes on (or on click data-play-step="1"); audio.slide-audio (a sound) too
       .chart         a bar or line chart drawn from the <table> inside it
       .agenda        buttons that jump to a chapter and come back afterwards
       data-animation an animation with keyframes from the ANIMATIONS block
       data-morph     an element with the same data-morph name on the slide you
                      leave and the slide you go to glides from its old place to
                      the new one (like Keynote's Magic Move / PowerPoint's Morph)
     The navigation (section 8) calls slideComponents.enter / step / leave,
     the Texts drawer calls textChanged and the still copies call
     prepareStill; every call runs through runSafely().
     =========================================================================== */

  /* ---- QR code: a small QR encoder (byte mode, error correction level M, versions 1 to 10).
     Up to 213 characters. It follows the QR standard (ISO/IEC 18004); a junior never needs to
     change it: put <div class="qr-code" data-qr="https://..."> on a slide. */
  const qrEncoder = (() => {
    // per version: [total codewords, error-correction codewords per block, blocks]
    const LEVEL_M = [null, [26, 10, 1], [44, 16, 1], [70, 26, 1], [100, 18, 2], [134, 24, 2], [172, 16, 4], [196, 18, 4], [242, 22, 4], [292, 22, 5], [346, 26, 5]];
    const ALIGNMENT = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];

    function gfMultiply(x, y) {
      let z = 0;
      for (let i = 7; i >= 0; i--) {
        z = (z << 1) ^ ((z >>> 7) * 0x11D);
        z ^= ((y >>> i) & 1) * x;
      }
      return z & 0xFF;
    }
    function reedSolomonDivisor(degree) {
      const result = new Array(degree).fill(0);
      result[degree - 1] = 1;
      let root = 1;
      for (let i = 0; i < degree; i++) {
        for (let j = 0; j < degree; j++) {
          result[j] = gfMultiply(result[j], root);
          if (j + 1 < degree) result[j] ^= result[j + 1];
        }
        root = gfMultiply(root, 0x02);
      }
      return result;
    }
    function reedSolomonRemainder(data, divisor) {
      const result = divisor.map(() => 0);
      data.forEach(byte => {
        const factor = byte ^ result.shift();
        result.push(0);
        divisor.forEach((coefficient, i) => { result[i] ^= gfMultiply(coefficient, factor); });
      });
      return result;
    }

    /** The data codewords and error correction, interleaved as the standard says. */
    function codewordsFor(bytes, version) {
      const [total, eccPerBlock, blockCount] = LEVEL_M[version];
      const dataCapacity = total - eccPerBlock * blockCount;
      const bits = [];
      const push = (value, length) => { for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1); };
      push(0b0100, 4);                                  // byte mode
      push(bytes.length, version < 10 ? 8 : 16);        // character count
      bytes.forEach(byte => push(byte, 8));
      push(0, Math.min(4, dataCapacity * 8 - bits.length));   // terminator
      while (bits.length % 8) bits.push(0);
      const data = [];
      for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(''), 2));
      for (let pad = 0xEC; data.length < dataCapacity; pad ^= 0xEC ^ 0x11) data.push(pad);
      // split into blocks: the first blocks are one codeword shorter when it does not divide evenly
      const shortLength = Math.floor(dataCapacity / blockCount);
      const longBlocks = dataCapacity % blockCount;
      const divisor = reedSolomonDivisor(eccPerBlock);
      const blocks = [];
      let offset = 0;
      for (let b = 0; b < blockCount; b++) {
        const length = shortLength + (b >= blockCount - longBlocks ? 1 : 0);
        const blockData = data.slice(offset, offset + length);
        offset += length;
        blocks.push({ data: blockData, ecc: reedSolomonRemainder(blockData, divisor) });
      }
      const result = [];
      for (let i = 0; i <= shortLength; i++) blocks.forEach(block => { if (i < block.data.length) result.push(block.data[i]); });
      for (let i = 0; i < eccPerBlock; i++) blocks.forEach(block => result.push(block.ecc[i]));
      return result;
    }

    function maskBit(mask, x, y) {
      switch (mask) {
        case 0: return (x + y) % 2 === 0;
        case 1: return y % 2 === 0;
        case 2: return x % 3 === 0;
        case 3: return (x + y) % 3 === 0;
        case 4: return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
        case 5: return (x * y) % 2 + (x * y) % 3 === 0;
        case 6: return ((x * y) % 2 + (x * y) % 3) % 2 === 0;
        default: return ((x + y) % 2 + (x * y) % 3) % 2 === 0;
      }
    }

    /** Builds the module grid for one mask: true = dark. */
    function buildMatrix(codewords, version, mask) {
      const size = version * 4 + 17;
      const modules = Array.from({ length: size }, () => new Array(size).fill(false));
      const isFunction = Array.from({ length: size }, () => new Array(size).fill(false));
      const set = (x, y, dark) => { modules[y][x] = dark; isFunction[y][x] = true; };
      // finder patterns with their separators
      [[3, 3], [size - 4, 3], [3, size - 4]].forEach(([cx, cy]) => {
        for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
          const x = cx + dx, y = cy + dy;
          if (x < 0 || y < 0 || x >= size || y >= size) continue;
          const distance = Math.max(Math.abs(dx), Math.abs(dy));
          set(x, y, distance !== 2 && distance !== 4);
        }
      });
      // timing patterns
      for (let i = 0; i < size; i++) {
        if (!isFunction[6][i]) set(i, 6, i % 2 === 0);
        if (!isFunction[i][6]) set(6, i, i % 2 === 0);
      }
      // alignment patterns
      const positions = ALIGNMENT[version];
      positions.forEach((cy, i) => positions.forEach((cx, j) => {
        const last = positions.length - 1;
        if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) return;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }));
      // format information (level M = 00) with its error correction
      const formatData = (0b00 << 3) | mask;
      let remainder = formatData;
      for (let i = 0; i < 10; i++) remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537);
      const format = ((formatData << 10) | remainder) ^ 0x5412;
      const formatBit = i => ((format >>> i) & 1) === 1;
      for (let i = 0; i <= 5; i++) set(8, i, formatBit(i));
      set(8, 7, formatBit(6));
      set(8, 8, formatBit(7));
      set(7, 8, formatBit(8));
      for (let i = 9; i < 15; i++) set(14 - i, 8, formatBit(i));
      for (let i = 0; i < 8; i++) set(size - 1 - i, 8, formatBit(i));
      for (let i = 8; i < 15; i++) set(8, size - 15 + i, formatBit(i));
      set(8, size - 8, true);   // always dark
      // version information (versions 7 and up)
      if (version >= 7) {
        let versionRemainder = version;
        for (let i = 0; i < 12; i++) versionRemainder = (versionRemainder << 1) ^ ((versionRemainder >>> 11) * 0x1F25);
        const versionBits = (version << 12) | versionRemainder;
        for (let i = 0; i < 18; i++) {
          const dark = ((versionBits >>> i) & 1) === 1;
          const a = size - 11 + (i % 3), b = Math.floor(i / 3);
          set(a, b, dark);
          set(b, a, dark);
        }
      }
      // the data, in the zigzag order of the standard, with the mask
      let bitIndex = 0;
      for (let right = size - 1; right >= 1; right -= 2) {
        if (right === 6) right = 5;
        for (let vertical = 0; vertical < size; vertical++) {
          for (let j = 0; j < 2; j++) {
            const x = right - j;
            const upward = ((right + 1) & 2) === 0;
            const y = upward ? size - 1 - vertical : vertical;
            if (isFunction[y][x]) continue;
            let dark = false;
            if (bitIndex < codewords.length * 8) dark = ((codewords[bitIndex >>> 3] >>> (7 - (bitIndex & 7))) & 1) === 1;
            bitIndex++;
            modules[y][x] = dark !== maskBit(mask, x, y);
          }
        }
      }
      return modules;
    }

    /** How hard a mask makes the code to read (rules 1, 2 and 4 of the standard; lower is better). */
    function penalty(modules) {
      const size = modules.length;
      let score = 0, dark = 0;
      for (let y = 0; y < size; y++) {
        let runRow = 1, runColumn = 1;
        for (let x = 0; x < size; x++) {
          if (modules[y][x]) dark++;
          if (x > 0) {
            if (modules[y][x] === modules[y][x - 1]) { runRow++; if (runRow === 5) score += 3; else if (runRow > 5) score++; } else runRow = 1;
            if (modules[x][y] === modules[x - 1][y]) { runColumn++; if (runColumn === 5) score += 3; else if (runColumn > 5) score++; } else runColumn = 1;
          }
          if (x > 0 && y > 0) {
            const colour = modules[y][x];
            if (colour === modules[y][x - 1] && colour === modules[y - 1][x] && colour === modules[y - 1][x - 1]) score += 3;
          }
        }
      }
      score += Math.floor(Math.abs(dark * 20 - size * size * 10) / (size * size)) * 10;
      return score;
    }

    return {
      /** The module grid for `text` (true = dark), or null when it is too long. */
      encode(text) {
        const bytes = Array.from(new TextEncoder().encode(String(text)));
        let version = 1;
        for (; version <= 10; version++) {
          const [total, eccPerBlock, blockCount] = LEVEL_M[version];
          const capacityBits = (total - eccPerBlock * blockCount) * 8;
          if (4 + (version < 10 ? 8 : 16) + bytes.length * 8 <= capacityBits) break;
        }
        if (version > 10) return null;
        const codewords = codewordsFor(bytes, version);
        let best = null, bestScore = Infinity;
        for (let mask = 0; mask < 8; mask++) {
          const modules = buildMatrix(codewords, version, mask);
          const score = penalty(modules);
          if (score < bestScore) { best = modules; bestScore = score; }
        }
        return best;
      },
    };
  })();

  /** Draws the QR code of data-qr into the element, as an SVG (dark modules on a white square). */
  function drawQrCode(element) {
    const link = (element.getAttribute('data-qr') || '').trim();
    if (!link) {
      element.innerHTML = '<p class="qr-too-long">' + escapeHtml(ui('components.qrEmpty')) + '</p>';
      return;
    }
    const modules = qrEncoder.encode(link);
    if (!modules) {
      element.innerHTML = '<p class="qr-too-long">' + escapeHtml(ui('components.qrTooLong')) + '</p>';
      return;
    }
    const quiet = 4, size = modules.length + quiet * 2;
    let path = '';
    modules.forEach((row, y) => row.forEach((dark, x) => { if (dark) path += 'M' + (x + quiet) + ' ' + (y + quiet) + 'h1v1h-1z'; }));
    element.innerHTML = '<svg viewBox="0 0 ' + size + ' ' + size + '" role="img" aria-label="' + escapeHtml(ui('components.qrLabel', { link })) +
      '" shape-rendering="crispEdges"><rect width="' + size + '" height="' + size + '" fill="#fff"/><path d="' + path + '" fill="#000"/></svg>';
  }

  /* ---- Chart: a bar or line chart from the table inside .chart ----
     <figure class="chart" data-chart="bar" data-unit="%"> with <table><tr><th>Label</th><td>42</td></tr>...</table>.
     A row with class "is-highlight" is drawn in amber. The table stays in the page for screen
     readers and for the Texts drawer: change a number there and the chart is drawn again. */
  const CHART_SIZE = { width: 1100, height: 400, labelSpace: 46, valueSpace: 40 };

  function chartRowsOf(figure) {
    return Array.from(figure.querySelectorAll('table tr')).map(row => {
      const cells = row.querySelectorAll('th, td');
      const valueText = cells[1] ? cells[1].textContent.trim() : '0';
      return { label: cells[0] ? cells[0].textContent.trim() : '', valueText, value: chartNumber(valueText), highlight: row.classList.contains('is-highlight') };
    }).filter(row => row.label || row.valueText);
  }

  /** The number in a table cell: "1,234.5", "1.234,5", "1,200" and "42%" all work (other characters are ignored).
      A comma is the decimal sign only when it comes after the last point and is not followed by exactly 3 digits. */
  function chartNumber(text) {
    let clean = String(text).replace(/[^\d.,-]/g, '');
    const commaIsDecimal = clean.lastIndexOf(',') > clean.lastIndexOf('.') && !/,\d{3}$/.test(clean);
    clean = commaIsDecimal ? clean.replace(/\./g, '').replace(',', '.') : clean.replace(/,/g, '');
    return parseFloat(clean) || 0;
  }

  function drawChart(figure) {
    const rows = chartRowsOf(figure);
    const unit = figure.getAttribute('data-unit') || '';
    const isLine = figure.getAttribute('data-chart') === 'line';
    const { width, height, labelSpace, valueSpace } = CHART_SIZE;
    const plotHeight = height - labelSpace - valueSpace;
    const maximum = Math.max(1, ...rows.map(row => row.value));
    const columnWidth = width / Math.max(1, rows.length);
    const yOf = value => valueSpace + plotHeight - (Math.max(0, value) / maximum) * plotHeight;
    let svg = '<svg class="chart-drawing" viewBox="0 0 ' + width + ' ' + height + '" aria-hidden="true">';
    if (figure.getAttribute('data-chart') === 'pie') {   // a ring of parts, each a share of the whole, its label and value beside it
      const total = rows.reduce((sum, row) => sum + Math.max(0, row.value), 0) || 1;
      const centre = { x: height / 2, y: height / 2 }, outer = height / 2 - 14, inner = outer * .56;
      const colours = ['var(--color-teal)', 'var(--color-violet)', 'var(--color-rose)', 'var(--color-text-muted)', 'var(--color-line)'];
      const at = (radius, angle) => (centre.x + radius * Math.sin(angle)).toFixed(1) + ' ' + (centre.y - radius * Math.cos(angle)).toFixed(1);
      let angle = 0;
      rows.forEach((row, i) => {
        const share = Math.max(0, row.value) / total, end = angle + Math.min(share, .9999) * Math.PI * 2, large = share > .5 ? 1 : 0;
        const fill = row.highlight ? 'var(--color-accent)' : colours[i % colours.length];
        if (share > 0) svg += '<path class="chart-slice' + (row.highlight ? ' is-highlight' : '') + '" style="--i:' + i + '; fill:' + fill + '" d="M ' + at(outer, angle) + ' A ' + outer + ' ' + outer + ' 0 ' + large + ' 1 ' + at(outer, end) + ' L ' + at(inner, end) + ' A ' + inner + ' ' + inner + ' 0 ' + large + ' 0 ' + at(inner, angle) + ' Z"/>';
        const y = 40 + i * Math.min(64, (height - 60) / Math.max(1, rows.length));
        const shown = unit && row.valueText.endsWith(unit) ? row.valueText : row.valueText + unit;
        svg += '<rect class="chart-key" x="' + (height + 40) + '" y="' + (y - 22) + '" width="26" height="26" rx="6" style="fill:' + fill + '"/>' +
          '<text class="chart-label chart-legend" x="' + (height + 82) + '" y="' + y + '">' + escapeHtml(row.label) + ' · ' + escapeHtml(shown) + ' (' + Math.round(share * 100) + ' %)</text>';
        angle = end;
      });
      svg += '</svg>';
      const previous = figure.querySelector('.chart-drawing');
      if (previous) previous.remove();
      figure.insertAdjacentHTML('beforeend', svg);
      return;
    }
    svg += '<line class="chart-axis" x1="0" x2="' + width + '" y1="' + (valueSpace + plotHeight) + '" y2="' + (valueSpace + plotHeight) + '"/>';
    if (isLine) {
      const points = rows.map((row, i) => (columnWidth * (i + .5)) + ',' + yOf(row.value)).join(' ');
      svg += '<polyline class="chart-line" pathLength="1" points="' + points + '"/>';
    }
    rows.forEach((row, i) => {
      const centerX = columnWidth * (i + .5);
      const top = yOf(row.value);
      const highlight = row.highlight ? ' is-highlight' : '';
      if (isLine) {
        svg += '<circle class="chart-dot' + highlight + '" style="--i:' + i + '" cx="' + centerX + '" cy="' + top + '" r="9"/>';
      } else {
        const barWidth = Math.min(140, columnWidth * .6);
        svg += '<rect class="chart-bar' + highlight + '" style="--i:' + i + '" x="' + (centerX - barWidth / 2) + '" y="' + top + '" width="' + barWidth + '" height="' + (valueSpace + plotHeight - top) + '" rx="6"/>';
      }
      const shown = unit && row.valueText.endsWith(unit) ? row.valueText : row.valueText + unit;   // "42%" with data-unit="%" stays "42%"
      svg += '<text class="chart-value' + highlight + '" style="--i:' + i + '" x="' + centerX + '" y="' + (top - 12) + '">' + escapeHtml(shown) + '</text>';
      svg += '<text class="chart-label" x="' + centerX + '" y="' + (height - 12) + '">' + escapeHtml(row.label) + '</text>';
    });
    svg += '</svg>';
    const old = figure.querySelector('.chart-drawing');
    if (old) old.remove();
    figure.insertAdjacentHTML('beforeend', svg);
  }

  /* ---- Break timer: "Back at 14:30" and a countdown ----
     <div class="break-timer"> with <time class="break-time" data-minutes="10">; the minutes can be
     changed in the Texts drawer. The end time is set when the slide first comes on and kept while it
     lies ahead, so going back and forth does not restart the break. */
  function breakTimerParts(timer) {
    const time = timer.querySelector('.break-time');
    return { time, countdown: timer.querySelector('.break-countdown'), minutes: Math.max(0, parseFloat(time && time.getAttribute('data-minutes')) || 0) };
  }

  function startBreakTimer(timer, scene) {
    const { time, countdown, minutes } = breakTimerParts(timer);
    if (!time || !countdown) return;
    clearTimeout(timer.breakTick);   // one countdown per timer, also when it is started again
    if (!timer.breakEndsAt || timer.breakEndsAt <= Date.now() || timer.breakMinutes !== minutes) {
      // whole seconds, so both windows (which start the slide together) count the same
      timer.breakEndsAt = Math.ceil((Date.now() + minutes * 60000) / 1000) * 1000;
      timer.breakMinutes = minutes;
    }
    // the window you present from decides: an audience window opened later gets the same end time
    if (!sync.isAudience) sendToPeer('break', { slideName: scene.dataset.name, endsAt: timer.breakEndsAt, minutes });
    // "Back at" rounds up to the next whole minute: never earlier than the end of the countdown
    time.textContent = formatClockTime(new Date(Math.ceil(timer.breakEndsAt / 60000) * 60000));
    const tick = () => {
      const leftMs = Math.max(0, timer.breakEndsAt - Date.now());
      countdown.textContent = formatDuration(Math.ceil(leftMs / 1000) * 1000);
      timer.classList.toggle('is-over', leftMs === 0);
      if (leftMs > 0 && scene.classList.contains('is-active')) timer.breakTick = slideTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    };
    tick();
  }

  const breakTimers = {
    /** The presenter window's end time for a break slide (message "break"). */
    apply(payload) {
      const scene = scenes.find(candidate => candidate.dataset.name === payload.slideName);
      if (!scene || !Number.isFinite(payload.endsAt)) return;
      scene.querySelectorAll('.break-timer').forEach(timer => {
        timer.breakEndsAt = payload.endsAt;
        timer.breakMinutes = breakTimerParts(timer).minutes;
        if (scene.classList.contains('is-active')) startBreakTimer(timer, scene);
      });
    },
  };

  /** In a still copy (preview, Slides drawer, print) the timer shows its full length. */
  function stillBreakTimer(timer) {
    const { time, countdown, minutes } = breakTimerParts(timer);
    if (time) time.textContent = ui('components.breakMinutes', { minutes });
    if (countdown) countdown.textContent = formatDuration(minutes * 60000);
  }

  /* ---- Video: plays when the slide comes on, or at its click (data-play-step="1") ----
     The presenter view plays it without sound: the sound comes from the audience window. */
  const MEDIA_PLAYED = 'video.slide-video, audio.slide-audio';
  function playStepOf(element) { return Math.max(0, parseInt(element.getAttribute('data-play-step'), 10) || 0); }

  function updateVideos(scene, step) {
    scene.querySelectorAll(MEDIA_PLAYED).forEach(video => {   // (a sound the same way: the same calls)
      // the presenter view stays quiet while an audience window plays the sound
      video.muted = video.defaultMuted || !!(presenter.panel && peerWindow());
      const shouldPlay = scene.classList.contains('is-active') && step >= playStepOf(video);
      if (shouldPlay && video.paused && !video.ended && !video.playRequested) {
        video.playRequested = true;
        // a video plays also with "less motion": the presenter chose to show it, it is content, not decoration
        const playing = video.play();
        // a browser may refuse to play sound before anyone clicked in this window: play it without sound then
        if (playing && playing.catch) playing.catch(() => {
          if (video.muted) { video.playRequested = false; return; }
          // a sound without sound is nothing: say how to allow it (it tries again at the next click or on the slide again)
          if (video.tagName === 'AUDIO') { video.playRequested = false; showToast(ui('toast.soundBlocked')); return; }
          video.muted = true;
          video.play().catch(() => { video.playRequested = false; });
        });
      } else if (!shouldPlay && (!video.paused || video.playRequested)) {
        resetVideo(video);
      }
    });
  }

  function resetVideo(video) {
    video.pause();
    video.playRequested = false;
    try { video.currentTime = 0; } catch (e) { /* not loaded yet */ }
  }

  /* ---- Agenda: buttons that jump to a chapter; Next at its end comes back to the agenda ----
     <button class="agenda-item" data-goto="slide name" data-until="last slide of the chapter">.
     data-until is optional (default: the chapter is one slide). A visited chapter is marked.
     Any element with data-href="https://…" (or mailto:) opens that address in a new tab on a click.
     Any other element with data-goto="slide name" goes there on a click too (a link); with data-goto-back, Next on that
     slide comes back (like a chapter of the agenda). */
  const agenda = {
    returnTo: null,   // { agendaIndex, firstIndex, untilIndex } while a chapter opened from the agenda is shown

    setUp() {
      stage.addEventListener('click', event => {
        const item = event.target.closest('.agenda-item, [data-goto], [data-href]');
        if (!item || !stage.contains(item) || event.target.closest('a[href]')) return;   // (a text link inside goes where it says)
        // not while it waits for its click, nor once a click took it away (it is invisible there)
        if (item.closest('[data-reveal-step]:not(.is-revealed), [data-reveal-step].is-revealed:is([data-reveal-effect="leave"], [data-reveal-effect="fade-out"])')) return;
        event.stopPropagation();
        item.blur();
        if (!item.hasAttribute('data-goto') && !item.matches('.agenda-item')) {   // a web address: in a new tab (only web and mail)
          const href = (item.getAttribute('data-href') || '').trim();
          if (/^(https?:|mailto:)/i.test(href)) window.open(href, '_blank', 'noopener');
          return;
        }
        if (item.matches('.agenda-item') || item.hasAttribute('data-goto-back')) { this.open(item); return; }
        const target = scenes.findIndex(scene => scene.dataset.name === item.getAttribute('data-goto'));
        if (target < 0) showToast(ui('components.agendaMissing', { name: item.getAttribute('data-goto') }));
        else if (target !== state.currentIndex) goToSlide(target);
      });
    },
    open(item) {
      const target = scenes.findIndex(scene => scene.dataset.name === item.getAttribute('data-goto'));
      if (target < 0) { showToast(ui('components.agendaMissing', { name: item.getAttribute('data-goto') })); return; }
      if (target === state.currentIndex) return;   // (already there: no way back to keep)
      const until = scenes.findIndex(scene => scene.dataset.name === item.getAttribute('data-until'));
      // a way back inside another one (a link in a chapter): the outer one is kept, for after this one
      this.returnTo = { agendaIndex: state.currentIndex, firstIndex: target, untilIndex: until >= target ? until : target, outer: this.returnTo };
      goToSlide(target);
    },
    /** A slide outside the chapter (Back, Home, the chapter list ...) forgets the way back. */
    followSlide(index) {
      if (this.returnTo && (index < this.returnTo.firstIndex || index > this.returnTo.untilIndex)) this.returnTo = null;
    },
    /** Next on the last slide of a chapter opened from the agenda: back to the agenda (true when it did). */
    takeNext() {
      if (!this.atChapterEnd()) return false;
      const agendaIndex = this.returnTo.agendaIndex, outer = this.returnTo.outer || null;
      this.returnTo = null;
      goToSlide(agendaIndex, true);
      this.returnTo = outer;   // (after goToSlide: it would forget a way back that does not hold this slide)
      return true;
    },
    /** Back on the first slide of such a chapter: back to the agenda (true when it did). */
    takeBack() {
      if (!this.returnTo || state.currentIndex !== this.returnTo.firstIndex || state.step > 0) return false;
      const agendaIndex = this.returnTo.agendaIndex, outer = this.returnTo.outer || null;
      this.returnTo = null;
      goToSlide(agendaIndex, true);
      this.returnTo = outer;
      return true;
    },
    /** Where Next goes from the end of such a chapter (for the presenter view's preview), or -1. */
    nextIndex() {
      return this.atChapterEnd() ? this.returnTo.agendaIndex : -1;
    },
    /** On the last slide of such a chapter, or on the last one Next reaches in it (its later slides skipped). */
    atChapterEnd() {
      if (!this.returnTo) return false;
      const index = state.currentIndex, { firstIndex, untilIndex } = this.returnTo;
      if (index === untilIndex) return true;
      if (index < firstIndex || index > untilIndex) return false;
      const next = nextSlideIndex(index);
      return next < 0 || next > untilIndex;
    },
    /** The presenter view's cue on the last slide of such a chapter. */
    cue() {
      return this.atChapterEnd() ? ui('cue.backToAgenda') : null;
    },
    /** Marks the agenda items whose chapter is on screen now (both windows do this themselves). */
    markVisited(scene) {
      stage.querySelectorAll('.agenda-item[data-goto="' + CSS.escape(scene.dataset.name) + '"]').forEach(item => item.classList.add('is-visited'));
    },
  };

  /* ---- Morph: an element with the same data-morph name on the old and the new slide glides ----
     The positions are measured with offsetLeft/offsetTop (the layout without the slide's own
     animations), so they mean the same in every window and at every window size. */
  const slideMorph = {
    durationMs: 700,

    /** Where every data-morph element of the slide we leave is, in stage pixels. */
    capture(scene) {
      const places = new Map();
      if (!scene || motion.reduced) return places;
      scene.querySelectorAll('[data-morph]').forEach(element => places.set(element.getAttribute('data-morph'), { element, box: stageBoxOf(element) }));
      return places;
    },
    /** After the new slide came on: its matching elements start at the old place and glide to their own. */
    play(scene, places) {
      scene.querySelectorAll('.is-morphed').forEach(element => element.classList.remove('is-morphed'));   // from an earlier visit
      if (!places.size) return;
      const pairs = Array.from(scene.querySelectorAll('[data-morph]')).filter(element => places.has(element.getAttribute('data-morph')));
      if (!pairs.length) return;
      stage.classList.add('is-morphing');
      pairs.forEach(element => {
        const from = places.get(element.getAttribute('data-morph'));
        const to = stageBoxOf(element);
        from.element.classList.add('is-morph-source');   // the old one hides, so there is only one
        element.classList.add('is-morph-target');
        let scaleX = to.width ? from.box.width / to.width : 1;
        let scaleY = to.height ? from.box.height / to.height : 1;
        // a box keeps its own shape change; text of another length scales evenly (by its height) so it is not squeezed
        if (Math.abs(scaleX - scaleY) > .25) scaleX = scaleY;
        const animation = element.animate([
          { transformOrigin: '0 0', transform: 'translate(' + (from.box.left - to.left) + 'px,' + (from.box.top - to.top) + 'px) scale(' + scaleX + ',' + scaleY + ')' },
          { transformOrigin: '0 0', transform: 'none' },
        ], { duration: this.durationMs, easing: 'cubic-bezier(.45,0,.2,1)' });
        element.classList.add('is-morphed');   // stays until the next visit: its own entrance animation never plays afterwards
        runSafely('count-up', () => animateCountUps(element, true));   // its numbers glide as they were: their end, not counted again
        const done = () => {
          element.classList.remove('is-morph-target');
          from.element.classList.remove('is-morph-source');
          if (!stage.querySelector('.is-morph-target')) stage.classList.remove('is-morphing');
        };
        animation.onfinish = done;
        animation.oncancel = done;
      });
    },
  };

  /** The box of an element in stage pixels, from the layout (not the animations). */
  function stageBoxOf(element) {
    let left = 0, top = 0, current = element;
    while (current && current !== stage) {
      left += current.offsetLeft;
      top += current.offsetTop;
      current = current.offsetParent;
    }
    return { left, top, width: element.offsetWidth, height: element.offsetHeight };
  }

  /* ---- Custom animations with keyframes (made in the editor, or by hand) ----
     The ANIMATIONS block (<script type="application/json" id="deckAnimations">) holds named animations:
       "pulse": { "trigger": "slide", "duration": 1200, "delay": 300, "easing": "ease-out",
                  "repeat": 1, "alternate": false,
                  "keyframes": [ { "at": 0, "opacity": 0, "x": -80 }, { "at": 100, "opacity": 1, "x": 0 } ] }
     trigger "slide": plays when the slide comes on; "click": plays at the element's data-reveal-step.
     repeat: a number of times, or "infinite". Keyframe values (each optional): at (0-100 %), opacity
     (0-1), x and y (px), scale (1 = normal), rotate (degrees), blur (px), and "ease": how it moves from this
     keyframe to the next (see segmentEasing; without it, the animation's easing); scaleX / scaleY (stretch), skew
     (degrees), brightness (1 = as it is) and hue (degrees: a colour shift). "origin" (optional): the point it turns and grows around, e.g. "left top" or "center bottom"
     (without it: the middle); only the animation turns there, the element's own rotation keeps its middle.
     An element uses one with data-animation="pulse". The script turns the block into CSS @keyframes
     when the page opens (a <style id="deckAnimationStyles">), so the animations are plain CSS. */
  const EASINGS = { linear: 'linear', ease: 'ease', 'ease-in': 'ease-in', 'ease-out': 'var(--ease-out)', 'ease-in-out': 'ease-in-out', elastic: 'var(--ease-elastic)' };
  const KEYFRAME_DEFAULTS = { opacity: 1, x: 0, y: 0, scale: 1, rotate: 0, blur: 0, scaleX: 1, scaleY: 1, skew: 0, brightness: 1, hue: 0 };   // brightness: × (1 = as it is), hue: a colour shift in degrees   // scaleX / scaleY: stretched (× the scale), skew: slanted (degrees)
  /** Easing of one segment (a keyframe's "ease"): named curves; springs (by how much they bounce); hold (jumps at the end). */
  const SEGMENT_EASINGS = { smooth: 'cubic-bezier(.4, 0, .2, 1)', 'ease-out': 'cubic-bezier(0, 0, .2, 1)', 'ease-in': 'cubic-bezier(.4, 0, 1, 1)', linear: 'linear',
    'back-out': 'cubic-bezier(.34, 1.56, .64, 1)', 'back-in': 'cubic-bezier(.36, 0, .66, -.56)', 'back-in-out': 'cubic-bezier(.68, -.6, .32, 1.6)', hold: 'steps(1, end)' };
  const SPRING_DAMPING = { 'spring-soft': .7, 'spring-bouncy': .4, 'spring-wobbly': .22 };

  /** A spring as a CSS linear() easing: it settles by the end of the segment (damping 1 = no bounce, lower = more). */
  function springEasing(damping) {
    const omega = 6.2 / damping, bounce = omega * Math.sqrt(1 - damping * damping), values = [];
    for (let i = 0; i <= 48; i++) {
      const t = i / 48;
      values.push(1 - Math.exp(-damping * omega * t) * (Math.cos(bounce * t) + damping * omega / bounce * Math.sin(bounce * t)));
    }
    values[48] = 1;
    return 'linear(' + values.map(value => Math.round(value * 1000) / 1000).join(', ') + ')';
  }
  /** The CSS easing of a keyframe's "ease": a name above, "steps-4" ("hold-start" / "steps-4-start": the jump at the start), or "cubic-bezier(x1, y1, x2, y2)" (x between 0 and 1); null when unknown. */
  function segmentEasing(value) {
    const text = String(value || '').trim();
    if (!text) return null;
    if (hasOwn(SEGMENT_EASINGS, text)) return SEGMENT_EASINGS[text];
    if (hasOwn(SPRING_DAMPING, text)) return springEasing(SPRING_DAMPING[text]);
    if (text === 'hold-start') return 'steps(1, start)';   // jumps at once (a hold played backwards, ⇄ Reverse)
    const steps = text.match(/^steps-(\d{1,2})(-start)?$/);
    if (steps) return 'steps(' + Math.max(1, Number(steps[1])) + (steps[2] ? ', start)' : ', end)');
    const bezier = text.match(/^cubic-bezier\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)$/);
    if (bezier && [1, 3].every(i => Number(bezier[i]) >= 0 && Number(bezier[i]) <= 1) && bezier.slice(1).every(part => Number.isFinite(Number(part)))) return 'cubic-bezier(' + bezier.slice(1).map(Number).join(', ') + ')';
    return null;
  }

  /** A safe animation name: lower-case letters, digits and dashes. */
  function animationName(text) { return String(text || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40); }

  /** Which CSS properties an animation's keyframes use: an animation that only moves leaves the
      element's own opacity alone, and one that only fades leaves its transform alone. */
  function usedProperties(frames) {
    const uses = name => frames.some(frame => frame[name] !== undefined && frame[name] !== '');
    return { stretch: uses('scaleX') || uses('scaleY'), slant: uses('skew'), opacity: uses('opacity'), transform: ['x', 'y', 'scale', 'rotate', 'scaleX', 'scaleY', 'skew'].some(uses),
      blur: ['blur', 'brightness', 'hue'].some(uses), blurOwn: uses('blur'), brightness: uses('brightness'), hue: uses('hue') };   // blur: the filter is used (blur, brightness or hue)
  }

  const negate = percent => (percent === '0%' ? percent : percent.startsWith('-') ? percent.slice(1) : '-' + percent);
  /** An animation's turning point ("left top", "center bottom" …) as the shift from the middle, in % of the element; null: the middle. */
  function originShift(origin) {
    const words = String(origin || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length || words.length > 2) return null;
    const across = { left: '-50%', right: '50%' }, down = { top: '-50%', bottom: '50%' };
    let x = '0%', y = '0%';
    for (const word of words) {
      if (hasOwn(across, word)) x = across[word];
      else if (hasOwn(down, word)) y = down[word];
      else if (word !== 'center') return null;
    }
    return x === '0%' && y === '0%' ? null : [x, y];
  }
  /** The CSS of one keyframe ("opacity: 0; transform: ...; filter: ..."), only the properties in `used`. */
  function keyframeCss(frame, used) {
    const value = name => Number.isFinite(Number(frame[name])) && frame[name] !== '' ? Number(frame[name]) : KEYFRAME_DEFAULTS[name];
    const parts = [];
    if (used.opacity) parts.push('opacity: calc(' + value('opacity') + ' * var(--element-opacity, 1));');   // (times its own opacity, Style)
    if (used.transform) {
      const stretch = used.stretch ? ' scale(' + value('scaleX') + ', ' + value('scaleY') + ')' : '', slant = used.slant ? ' skewX(' + value('skew') + 'deg)' : '';   // (only when used: older animations keep their exact CSS)
      // its turning point (used.origin): there, then back (translate % is of the element itself), so it turns and grows around it
      const toOrigin = used.origin ? ' translate(' + used.origin[0] + ', ' + used.origin[1] + ')' : '', back = used.origin ? ' translate(' + negate(used.origin[0]) + ', ' + negate(used.origin[1]) + ')' : '';
      parts.push('transform: translate(' + value('x') + 'px, ' + value('y') + 'px)' + toOrigin + ' scale(' + value('scale') + ')' + stretch + ' rotate(' + value('rotate') + 'deg)' + slant + back + ';');
    }
    if (used.blur) {   // the filter: only the parts the animation uses (an older animation keeps its exact CSS); its shadow stays (Style)
      const filters = [];
      filters.push('var(--reveal-blur, )');   // (the Blur click effect, css/05: an animation's filter never switches it off)
      if (used.blurOwn !== false) filters.push('blur(' + Math.max(0, value('blur')) + 'px)');   // (below 0 the whole filter would be invalid)
      if (used.brightness) filters.push('brightness(' + Math.max(0, value('brightness')) + ')');
      if (used.hue) filters.push('hue-rotate(' + value('hue') + 'deg)');
      parts.push('filter: ' + filters.join(' ') + ' var(--image-look, ) var(--element-shadow, );');   // (an image's look stays too)
    }
    return parts.join(' ');
  }

  /** The keyframes of a definition, sorted, with a frame at 0 % and at 100 %. */
  function sortedKeyframes(definition) {
    const frames = (Array.isArray(definition.keyframes) ? definition.keyframes : []).filter(frame => frame && typeof frame === 'object')
      .map(frame => Object.assign({}, frame, { at: clamp(Number(frame.at) || 0, 0, 100) })).sort((a, b) => a.at - b.at);
    if (!frames.length || frames[0].at > 0) frames.unshift(Object.assign({}, frames[0] || {}, { at: 0 }));
    if (frames[frames.length - 1].at < 100) frames.push(Object.assign({}, frames[frames.length - 1], { at: 100 }));
    return frames;
  }

  /** All animations of the block as CSS. */
  function animationCss(definitions) {
    let css = '';
    Object.keys(definitions || {}).forEach((rawName, index) => {
      const name = animationName(rawName) + '-' + index;   // a unique keyframes name, also for names that only differ in case
      const definition = definitions[rawName];
      if (!name || !definition || typeof definition !== 'object') return;
      const frames = sortedKeyframes(definition);
      const used = Object.assign(usedProperties(frames), { origin: originShift(definition.origin) });
      const repeat = definition.repeat === 'infinite' ? 'infinite' : Math.max(1, Math.round(Number(definition.repeat) || 1));
      const timing = Math.max(0, Number(definition.duration) || 800) + 'ms ' + (EASINGS[definition.easing] || EASINGS['ease-out']) + ' ' +
        Math.max(0, Number(definition.delay) || 0) + 'ms ' + repeat + ' ' + (definition.alternate ? 'alternate' : 'normal') + ' both';
      const selector = '[data-animation="' + String(rawName).replace(/["\\\n]/g, character => '\\' + character.charCodeAt(0).toString(16) + ' ') + '"]';   // the name exactly as the elements write it
      if (used.origin) css += '.scene ' + selector + ' { transform-origin: 50% 50% !important; }\n';   // its turning point counts from the middle (never a flip effect's or the slide's own)
      const easeOf = frame => { const easing = segmentEasing(frame.ease); return easing ? ' animation-timing-function: ' + easing + ';' : ''; };   // from this keyframe to the next
      css += '@keyframes deck-' + name + ' {' + frames.map(frame => ' ' + frame.at + '% { ' + keyframeCss(frame, used) + easeOf(frame) + ' }').join('') + ' }\n';
      if (definition.trigger === 'click') {
        // before its click the element looks like the first keyframe; the click plays the animation
        // before its click the element looks like the first keyframe, in full (also an animation that only moves stays visible)
        css += '.scene ' + selector + '[data-reveal-step] { transition: none; ' + keyframeCss(frames[0], Object.assign({}, used, { opacity: true, transform: true })) + ' }\n';
        css += '.scene ' + selector + '[data-reveal-step].is-revealed { animation: deck-' + name + ' ' + timing + '; }\n';
      } else {
        css += '.scene.is-visible ' + selector + ' { animation: deck-' + name + ' ' + timing + '; }\n';
      }
      // still copies (preview, Slides drawer, print, editor) show the last keyframe
      const finalFrame = frames[frames.length - 1];
      const endsHidden = definition.trigger === 'click' && used.opacity && Number(finalFrame.opacity) < 0.12;
      const lastFrame = keyframeCss(endsHidden ? Object.assign({}, finalFrame, { opacity: 0.12 }) : finalFrame, used);   // an Out on a click: faint in still copies
      if (lastFrame) css += '.still-slide ' + selector + ':not(.is-previewing) { ' + lastFrame.replace(/;/g, ' !important;') + ' }\n';
    });
    return css;
  }

  const customAnimations = {
    /** The definitions in the file. */
    definitions() {
      const block = byId('deckAnimations');
      const data = parseJsonOr(block && block.textContent, {});
      return data && typeof data === 'object' ? data : {};
    },
    /** Puts the CSS of the animations on the page (at start-up). */
    apply(definitions) {
      let style = byId('deckAnimationStyles');
      if (!style) {
        style = document.createElement('style');
        style.id = 'deckAnimationStyles';
        document.body.appendChild(style);   // after the main CSS, so these rules win a tie
      }
      style.textContent = animationCss(definitions || this.definitions());
    },
  };

  /* ---- Text by word, letter or line (data-split="word" | "letter" | "line") ----
     Each word (or letter) gets a span of its own with its number (--i), so the CSS (section 6) lets them rise in one
     after another, --split-stagger apart. By line: the words of one line share their number (numberLines; again
     when the slide comes on, as the lines may have changed). data-split-effect: how each part comes in (CSS);
     data-split-order: which part first (reverse, middle, edges or random: see splitOrder). Done when the page opens (and on the editor's playing copy); the file keeps
     the plain text. Screen readers read the whole text (aria-label). */
  function splitText(element) {
    if (!element || element.splitParts) return;
    const byLetter = element.getAttribute('data-split') === 'letter';
    // letters as a reader sees them: an accent or an emoji with its skin tone or flag stays one letter
    const letters = typeof Intl !== 'undefined' && Intl.Segmenter ? (word => Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(word), piece => piece.segment)) : (word => Array.from(word));
    const part = (text, index) => {
      const span = document.createElement('span');
      span.className = 'split-part';
      span.textContent = text;
      span.style.setProperty('--i', index);
      span.setAttribute('aria-hidden', 'true');
      return span;
    };
    element.splitLabel = !element.hasAttribute('aria-label');   // our own label: removed again by unsplitText
    if (element.splitLabel) element.setAttribute('aria-label', element.textContent.replace(/\s+/g, ' ').trim());
    // the text pieces, and a counted number as one piece (it counts inside its part, so it rises with its words)
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, { acceptNode: node =>
      (node.nodeType === Node.ELEMENT_NODE ? (node.matches('.count-up') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP) : node.parentElement.closest('.count-up') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    let index = 0;
    element.splitParts = [];   // per text node: the node itself (kept, so whoever holds it can still change it) and its parts
    nodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {   // a counted number: wrapped whole in a part of its own
        const holder = part('', index++);
        node.replaceWith(holder);
        holder.appendChild(node);
        element.splitParts.push({ node, parts: [holder] });
        return;
      }
      const parts = [];
      node.nodeValue.split(/(\s+)/).forEach(piece => {
        if (!piece) return;
        if (/^\s+$/.test(piece)) { parts.push(document.createTextNode(piece)); return; }
        if (!byLetter) { parts.push(part(piece, index++)); return; }
        const word = document.createElement('span');   // a word never breaks between its letters
        word.className = 'split-word';
        word.setAttribute('aria-hidden', 'true');
        letters(piece).forEach(letter => word.appendChild(part(letter, index++)));
        parts.push(word);
      });
      node.splitHost = element;
      node.replaceWith(...parts);
      element.splitParts.push({ node, parts });
    });
    if (element.getAttribute('data-split') === 'line') numberLines(element);
    else if (element.hasAttribute('data-split-order')) {
      const parts = Array.from(element.querySelectorAll('.split-part'));
      splitOrder(element, parts.map((part, index) => index)).forEach((number, index) => parts[index].style.setProperty('--i', number));
    }
    if (element.getAttribute('data-split') !== 'line') markCaretParts(Array.from(element.querySelectorAll('.split-part')));
  }
  /** Typed with a cursor: of the parts that come in together (one line, or two from the middle), only the last one shows the cursor. */
  function markCaretParts(parts) {
    const last = new Map();
    parts.forEach(part => { part.classList.remove('split-caret-part'); last.set(part.style.getPropertyValue('--i'), part); });
    last.forEach(part => part.classList.add('split-caret-part'));
  }
  /** data-split-order: the numbers 0, 1, 2 … (in reading order) as the order the parts come in.
      reverse: the last one first; middle: from the middle out (two at a time); edges: from both ends in;
      random: shuffled, the same way every time (from the text itself: the audience and the presenter's preview agree). */
  function splitOrder(element, numbers) {
    const how = element.getAttribute('data-split-order');
    const count = numbers.length ? Math.max(...numbers) + 1 : 0;
    if (!how || count < 2) return numbers;
    const fromMiddle = number => Math.floor(Math.abs(2 * number - (count - 1)) / 2);   // 0 in the middle
    let map;
    if (how === 'reverse') map = number => count - 1 - number;
    else if (how === 'middle') map = fromMiddle;
    else if (how === 'edges') map = number => fromMiddle(0) - fromMiddle(number);
    else if (how === 'random') {
      let seed = 0;
      for (const character of element.textContent.replace(/\s+/g, ' ').trim()) seed = (seed * 31 + character.charCodeAt(0)) >>> 0;
      const next = () => { seed = (seed + 0x6D2B79F5) >>> 0; let value = Math.imul(seed ^ (seed >>> 15), 1 | seed); value ^= value + Math.imul(value ^ (value >>> 7), 61 | value); return ((value ^ (value >>> 14)) >>> 0) / 4294967296; };
      const shuffled = Array.from({ length: count }, (unused, index) => index);
      for (let index = count - 1; index > 0; index--) { const other = Math.floor(next() * (index + 1)); [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]]; }
      map = number => shuffled[number];
    } else return numbers;
    return numbers.map(map);
  }
  /** By line: each word gets the number of its line (a word lower than the bottom of the line so far starts the next one). */
  function numberLines(element) {
    const parts = Array.from(element.querySelectorAll('.split-part'));
    if (!parts.length || !element.getClientRects().length) return;   // not laid out (yet): numbered when its slide comes on
    // the top of a word in the text's own frame (a word inside a positioned span counts from that span: added up)
    const ends = new Set([element, element.offsetParent]);
    const topOf = part => { let top = 0; for (let node = part; node && !ends.has(node); node = node.offsetParent) top += node.offsetTop; return top; };
    let line = -1, bottom = -Infinity, lineTop = Infinity;
    const lines = parts.map(part => {
      const top = topOf(part);
      // lower than the line so far: the next line; higher than its top: the next column (Text columns) starts
      if (top >= bottom - 1 || top < lineTop - part.offsetHeight / 2) { line++; bottom = top + part.offsetHeight; lineTop = top; }
      else bottom = Math.max(bottom, top + part.offsetHeight);
      return line;
    });
    splitOrder(element, lines).forEach((number, index) => parts[index].style.setProperty('--i', number));
    markCaretParts(parts);
  }
  /** Puts the original text back (before a change of the text, and in every copy the editor saves). */
  function unsplitText(element) {
    if (element && element.splitParts) {
      element.splitParts.forEach(({ node, parts }) => {
        if (!parts.length || !parts[0].parentNode) return;
        parts[0].before(node);
        parts.forEach(piece => piece.remove());
      });
      element.splitParts = null;
      if (element.splitLabel) element.removeAttribute('aria-label');
      return;
    }
    // a copy (cloned: without the kept nodes): its parts become plain text again
    if (!element || !element.querySelector('.split-part')) return;
    element.querySelectorAll('.split-word').forEach(word => word.replaceWith(word.textContent));
    element.querySelectorAll('.split-part').forEach(piece => piece.replaceWith(...piece.childNodes));   // (a counted number in a part stays itself)
    element.normalize();
    if (element.hasAttribute('data-split')) element.removeAttribute('aria-label');
  }

  /* ---- A footer on every slide (data-footer on the deck: "number", "text" or "both"; data-footer-text) ----
     Written into each slide when the page opens (and on the editor's canvas), never into the file: a slide with
     data-no-footer has none. Still copies (print, the next-slide preview) are copies of these slides, so they have it too. */
  const slideFooter = {
    apply(scene, numberText, deckElement) {
      scene.querySelectorAll(':scope > .slide-footer').forEach(old => old.remove());
      const mode = deckElement.getAttribute('data-footer') || '';
      if (!['number', 'text', 'both'].includes(mode) || scene.hasAttribute('data-no-footer')) return;
      const text = (deckElement.getAttribute('data-footer-text') || '').trim();
      const footer = document.createElement('div');
      footer.className = 'slide-footer';
      footer.setAttribute('aria-hidden', 'true');
      footer.setAttribute('data-no-edit', '');
      footer.textContent = (mode === 'number' ? [numberText] : mode === 'text' ? [text] : [text, numberText]).filter(Boolean).join('  ·  ');
      scene.appendChild(footer);
    },
  };

  /* ---- A shape that draws itself in (data-draw, css/05): each line's length on the slide in --draw-length ----
     Its lines keep their thickness when the shape stretches (non-scaling stroke), so the dashes count in slide pixels:
     the length is worked out from points along the line, stretched like the shape. */
  function measureShapeDraw(shape) {
    const svg = shape.querySelector('svg');
    if (!svg) return;
    const width = svg.clientWidth / 100, height = svg.clientHeight / 100;   // its 100 x 100 drawing, stretched (the stage's own scale does not count)
    svg.querySelectorAll('rect, ellipse, circle, line, polyline, polygon, path').forEach(part => {
      if (typeof part.getTotalLength !== 'function') return;
      const total = part.getTotalLength(), steps = 64;
      let length = 0, before = part.getPointAtLength(0);
      for (let i = 1; i <= steps; i++) {
        const point = part.getPointAtLength(total * i / steps);
        length += Math.hypot((point.x - before.x) * width, (point.y - before.y) * height);
        before = point;
      }
      part.style.setProperty('--draw-length', Math.ceil(length + 2));
    });
  }

  /* ---- A progress line (data-progress-line="top" or "bottom" on the deck) ----
     A thin bar along the stage that grows with every slide of the talk (none on the backup slides). It is made when the page
     opens, never written into the file. */
  const progressLine = {
    bar: null,
    init() {
      if (!['top', 'bottom'].includes(deck.getAttribute('data-progress-line'))) return;
      this.bar = document.createElement('div');
      this.bar.className = 'deck-progress';
      this.bar.setAttribute('aria-hidden', 'true');
      stage.insertBefore(this.bar, stage.querySelector(':scope > .spotlight'));   // (under the spotlight: it dims with the slide)
    },
    show(scene) {
      if (!this.bar) return;
      const index = scenes.indexOf(scene);
      this.bar.hidden = index < 0 || isBackupSlide(index);
      if (!this.bar.hidden) this.bar.style.setProperty('--deck-progress', String((index + 1) / mainSlideCount));
    },
  };

  /* ---- The list the navigation uses ---- */
  const slideComponents = {
    /** At start-up: draws the QR codes and charts, and listens for agenda clicks. */
    init() {
      runSafely('animations', () => customAnimations.apply());
      runSafely('footer', () => scenes.forEach((scene, index) => slideFooter.apply(scene, slideNumberText(index), deck)));
      runSafely('progress line', () => progressLine.init());
      stage.querySelectorAll('[data-split]').forEach(element => runSafely('text by word', () => splitText(element)));
      stage.querySelectorAll('.qr-code').forEach(element => runSafely('QR code', () => drawQrCode(element)));
      stage.querySelectorAll('.chart').forEach(figure => runSafely('chart', () => drawChart(figure)));
      agenda.setUp();
    },
    enter(scene) {
      runSafely('progress line', () => progressLine.show(scene));
      scene.querySelectorAll('.shape[data-draw]').forEach(shape => runSafely('shape draw', () => measureShapeDraw(shape)));
      scene.querySelectorAll('[data-split="line"]').forEach(element => runSafely('text by line', () => numberLines(element)));
      scene.querySelectorAll('.break-timer').forEach(timer => runSafely('break timer', () => startBreakTimer(timer, scene)));
      agenda.markVisited(scene);
    },
    /** A step (click) of the slide; also called right after enter with its first step. */
    step(scene, step) { runSafely('video', () => updateVideos(scene, step)); },
    /** The slide starts to fade out. */
    leave(scene) { scene.querySelectorAll(MEDIA_PLAYED).forEach(resetVideo); },
    /** A text of these slides changed in the Texts drawer: draw the QR codes and charts again. */
    textChanged(sceneElements) {
      sceneElements.forEach(scene => {
        scene.querySelectorAll('.qr-code').forEach(element => runSafely('QR code', () => drawQrCode(element)));
        scene.querySelectorAll('.chart').forEach(figure => runSafely('chart', () => drawChart(figure)));
        if (scene.classList.contains('is-active')) scene.querySelectorAll('.break-timer').forEach(timer => runSafely('break timer', () => startBreakTimer(timer, scene)));
      });
    },
    /** A still copy (preview, Slides drawer, print): no playing video, a timer at full length. */
    prepareStill(copy) {
      copy.querySelectorAll('video').forEach(video => { video.removeAttribute('autoplay'); video.preload = 'auto'; video.muted = true; });
      copy.querySelectorAll('.break-timer').forEach(stillBreakTimer);
    },
  };
