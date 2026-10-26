/* Canvas alignment viewer: virtualised, pinned ruler/consensus/names, selection, drag-select. */
(function () {
  'use strict';
  const BW = (globalThis.BW = globalThis.BW || {});

  /** residue ↔ column maps for a row (cached by res identity) */
  BW.seqMap = (s) => {
    if (s._map && s._mapFor === s.res) return s._map;
    const L = s.res.length, colToIdx = new Int32Array(L); const idx = [];
    let k = 0;
    for (let c = 0; c < L; c++) { if (s.res.charCodeAt(c) === 45) colToIdx[c] = -1; else { colToIdx[c] = k++; idx.push(c); } }
    s._mapFor = s.res; return (s._map = { colToIdx, idxToCol: Int32Array.from(idx) });
  };

  const KD = { A: 1.8, R: -4.5, N: -3.5, D: -3.5, C: 2.5, Q: -3.5, E: -3.5, G: -0.4, H: -3.2, I: 4.5, L: 3.8, K: -3.9, M: 1.9, F: 2.8, P: -1.6, S: -0.8, T: -0.7, W: -0.9, Y: -1.3, V: 4.2 };
  const CLUSTAL = {};
  for (const [set, col] of [['AVLIMFWC', '#6f8fe8'], ['KR', '#e0463c'], ['NQST', '#3fae5b'], ['DE', '#c05bc0'], ['G', '#e8963c'], ['HY', '#2fa6a6'], ['P', '#d6c23a']]) for (const c of set) CLUSTAL[c] = col;

  const lum = (hex) => { const n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
  const mix = (a, b, t) => {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const ch = (s) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
    return '#' + [16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join('');
  };

  BW.SCHEMES = {
    residue: { label: 'Residue (filled)', types: 'both' },
    diff: { label: 'Differences only', types: 'both' },
    clustal: { label: 'Chemistry', types: 'protein' },
    hydro: { label: 'Hydrophobicity (Kyte–Doolittle)', types: 'protein' },
    blosum: { label: 'Similarity to consensus (BLOSUM62)', types: 'protein' },
    text: { label: 'Colored letters (no fill)', types: 'both' },
    none: { label: 'No color', types: 'both' },
  };

  class AlignView {
    constructor(app) {
      this.app = app;
      this.host = document.getElementById('alignHost');
      this.sc = document.getElementById('alignScroller');
      this.spacer = document.getElementById('alignSpacer');
      this.cv = document.getElementById('alignCanvas');
      this.ctx = this.cv.getContext('2d');
      this.ov = document.querySelector('#overview canvas');
      this.nameW = 200; this.rulerH = 24; this.barsH = 30;
      this._cache = new Map(); this._cacheKey = '';
      this.hoverCell = null;
      new ResizeObserver(() => this.resize()).observe(this.host);
      new ResizeObserver(() => this.drawOverview()).observe(this.ov.parentElement);
      this.sc.addEventListener('scroll', () => this.request(), { passive: true });
      this.bind();
    }

    get rh() { const z = this.app.S.opts.zoom; return z < 9 ? 17 : z < 13 ? 20 : 23; }
    get cw() { return this.app.S.opts.zoom; }
    get transH() { return this.app.S.opts.translate ? this.rh + 4 : 0; }
    get headerH() { return this.rulerH + this.barsH + this.rh + this.transH; }

    resize() {
      const dpr = window.devicePixelRatio || 1;
      const w = this.sc.clientWidth, h = this.sc.clientHeight;
      if (!w || !h) return;
      this.W = w; this.H = h; this.dpr = dpr;
      this.cv.width = Math.round(w * dpr); this.cv.height = Math.round(h * dpr);
      this.cv.style.width = w + 'px'; this.cv.style.height = h + 'px';
      this.layout(); this.draw();
    }

    layout() {
      const L = this.app.alnLen(), N = this.app.rows().length;
      this.spacer.style.width = this.nameW + L * this.cw + 60 + 'px';
      this.spacer.style.height = this.headerH + N * this.rh + 40 + 'px';
    }

    request() { if (!this._raf) this._raf = requestAnimationFrame(() => { this._raf = 0; this.draw(); this.drawOverview(); }); }
    invalidate() { this.layout(); this.request(); }

    /* ----- colour handling ----- */
    cellColors(ch, cons, type, scheme) {
      const th = this.app.theme;
      const key = th.key + scheme + type;
      if (key !== this._cacheKey) { this._cache.clear(); this._cacheKey = key; }
      const k = ch + cons;
      let v = this._cache.get(k);
      if (v !== undefined) return v;
      v = this._compute(ch, cons, type, scheme, th);
      this._cache.set(k, v); return v;
    }
    _compute(ch, cons, type, scheme, th) {
      if (ch === '-') return null;
      const dna = type === 'dna';
      if (scheme === 'none') return { bg: null, fg: th.text };
      if (scheme === 'text') {
        const c = dna ? th.dna[ch] || th.dna.N : CLUSTAL[ch] || '#8892a6';
        return { bg: null, fg: c, bold: true };
      }
      if (scheme === 'diff') {
        if (ch === cons || cons === '-' || cons === undefined) return { bg: null, fg: th.muted };
        const c = dna ? th.dna[ch] || th.dna.N : CLUSTAL[ch] || '#8892a6';
        return { bg: c, fg: lum(c) > 0.62 ? '#2a2000' : '#fff', bold: true };
      }
      if (dna && (scheme === 'residue' || scheme === 'clustal' || scheme === 'hydro' || scheme === 'blosum')) {
        const c = th.dna[ch] || (/[RYKMSWBDHV]/.test(ch) ? th.dna.amb : th.dna.N);
        if (scheme === 'blosum') {
          if (ch === cons) return { bg: th.accent, fg: '#fff' };
          return { bg: null, fg: th.muted };
        }
        return { bg: c, fg: lum(c) > 0.62 ? '#2a2000' : '#fff' };
      }
      if (scheme === 'residue' || scheme === 'clustal') {
        const c = CLUSTAL[ch] || '#9aa3b2';
        return { bg: c, fg: '#fff' };
      }
      if (scheme === 'hydro') {
        const h = KD[ch]; if (h === undefined) return { bg: '#9aa3b2', fg: '#fff' };
        const t = (h + 4.5) / 9;
        const c = t < 0.5 ? mix('#3b82f6', th.dark ? '#2a303c' : '#eef0f4', t * 2) : mix(th.dark ? '#2a303c' : '#eef0f4', '#ef5a34', (t - 0.5) * 2);
        return { bg: c, fg: lum(c) > 0.6 ? '#1b1f27' : '#fff' };
      }
      if (scheme === 'blosum') {
        const s = BW.BLOSUM62[ch + (cons && cons !== '-' ? cons : ch)] ?? -2;
        if (ch === cons) return { bg: th.accent, fg: '#fff' };
        if (s >= 1) return { bg: mix(th.accent, th.panel, 0.6), fg: th.text };
        if (s === 0) return { bg: mix(th.accent, th.panel, 0.82), fg: th.text };
        return { bg: null, fg: th.muted };
      }
      return { bg: null, fg: th.text };
    }

    /* ----- painting ----- */
    draw() {
      if (!this.W) return;
      const sl = this.sc.scrollLeft, st = this.sc.scrollTop;
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.paint(this.ctx, this.W, this.H, sl, st, false);
    }

    paint(ctx, W, H, sl, st, forExport) {
      const A = this.app, S = A.S, o = S.opts, th = A.theme;
      const rows = A.rows(), L = A.alnLen(), cw = this.cw, rh = this.rh, nameW = this.nameW;
      const hdr = this.headerH, stats = A.stats();
      ctx.fillStyle = th.panel; ctx.fillRect(0, 0, W, H);
      const fc = Math.max(0, Math.floor(sl / cw)), lc = Math.min(L - 1, Math.ceil((sl + W - nameW) / cw));
      const fr = Math.max(0, Math.floor(st / rh)), lr = Math.min(rows.length - 1, Math.ceil((st + H - hdr) / rh));
      const X = (c) => nameW + c * cw - sl, Y = (r) => hdr + r * rh - st;
      const scheme = A.scheme();
      const dots = o.display === 'dots';
      const ref = A.refSeq();
      const consStr = stats.cons;
      const fontPx = Math.max(8, Math.min(rh - 8, cw * 0.8, 15));
      const showLetters = cw >= 9;
      const sel = S.sel, cur = S.cursor;

      /* --- rows --- */
      ctx.save(); ctx.beginPath(); ctx.rect(nameW, hdr, W - nameW, H - hdr); ctx.clip();
      ctx.font = `600 ${fontPx}px ${th.mono}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let r = fr; r <= lr; r++) {
        const s = rows[r], y = Y(r);
        if (r % 2 === 1 && scheme !== 'residue' && scheme !== 'clustal') { ctx.fillStyle = th.stripe; ctx.fillRect(nameW, y, W - nameW, rh); }
        const res = s.res;
        const map = s.trace ? BW.seqMap(s) : null;
        const t = s.trace, mixr = t ? BW.mixRatios(t) : null;
        const isRef = ref && ref === s;
        for (let c = fc; c <= lc; c++) {
          const ch = res[c]; if (ch === undefined || ch === '-') continue;
          const target = ref ? ref.res[c] : consStr[c];
          const x = X(c);
          const isDot = dots && !isRef && ch === target;
          const col = isDot ? null : this.cellColors(ch, scheme === 'diff' || scheme === 'blosum' ? target : '', s.type, scheme);
          let alpha = 1;
          if (t && o.dimLowQ && map) {
            const bi = s.tStart + map.colToIdx[c], q = t.qual[bi];
            if (q !== undefined) alpha = 0.38 + 0.62 * Math.min(1, q / 28);
          }
          if (alpha !== 1) ctx.globalAlpha = alpha;
          if (col && col.bg) { ctx.fillStyle = col.bg; ctx.fillRect(x, y, cw - (cw > 6 ? 1 : 0), rh - (cw > 6 ? 1 : 0)); }
          if (showLetters) {
            if (isDot) { ctx.fillStyle = th.muted; ctx.globalAlpha = alpha * 0.55; ctx.fillRect(x + cw / 2 - 1, y + rh / 2 - 1, 2, 2); }
            else if (col) { ctx.fillStyle = col.fg; ctx.fillText(ch, x + cw / 2, y + rh / 2 + 0.5); }
          }
          if (alpha !== 1 || isDot) ctx.globalAlpha = 1;
          if (t && cw >= 10 && map) {
            const bi = s.tStart + map.colToIdx[c];
            if (mixr[bi] > 0.33) { ctx.fillStyle = th.warn; ctx.beginPath(); ctx.moveTo(x + cw - 1, y); ctx.lineTo(x + cw - 6, y); ctx.lineTo(x + cw - 1, y + 5); ctx.fill(); }
            if (t.edited.has(bi)) { ctx.fillStyle = th.accent; ctx.fillRect(x + 1, y + rh - 3, cw - 3, 2); }
          }
        }
      }
      // column highlight
      if (cur && cur.c >= fc && cur.c <= lc) { ctx.fillStyle = th.colHi; ctx.fillRect(X(cur.c), hdr, cw, H - hdr); }
      if (S.find && !forExport) for (const h of S.find) {
        if (h.r < fr || h.r > lr || h.c1 < fc || h.c0 > lc) continue;
        const x = X(h.c0), y = Y(h.r), w = X(h.c1 + 1) - x;
        ctx.fillStyle = th.warn; ctx.globalAlpha = 0.28; ctx.fillRect(x, y, w, rh); ctx.globalAlpha = 1;
        ctx.strokeStyle = th.warn; ctx.lineWidth = 1.2; ctx.strokeRect(x + .5, y + .5, w - 1, rh - 1);
      }
      // selection
      if (sel) {
        const x0 = X(sel.c0), x1 = X(sel.c1 + 1), y0 = Y(sel.r0), y1 = Y(sel.r1 + 1);
        ctx.fillStyle = th.sel; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
        ctx.strokeStyle = th.selLine; ctx.lineWidth = 1.5; ctx.strokeRect(x0 + .75, y0 + .75, x1 - x0 - 1.5, y1 - y0 - 1.5);
      }
      if (cur && !forExport) {
        const x = X(cur.c), y = Y(cur.r);
        ctx.strokeStyle = o.edit ? th.warn : th.selLine; ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, cw - 2, rh - 2);
      }
      ctx.restore();

      /* --- header (ruler, conservation, consensus, translation) --- */
      ctx.save(); ctx.beginPath(); ctx.rect(nameW, 0, W - nameW, hdr); ctx.clip();
      ctx.fillStyle = th.panel2; ctx.fillRect(nameW, 0, W - nameW, hdr);
      ctx.font = `500 10.5px ${th.mono}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = th.muted;
      const tick = cw >= 14 ? 5 : cw >= 8 ? 10 : cw >= 4 ? 20 : 50;
      for (let c = fc; c <= lc; c++) {
        const n = c + 1;
        if (n % tick === 0 || n === 1) {
          const x = X(c) + cw / 2;
          ctx.fillStyle = th.line2; ctx.fillRect(Math.round(x), this.rulerH - 6, 1, 6);
          ctx.fillStyle = th.muted; ctx.textAlign = 'center'; ctx.fillText(String(n), x, 9);
        }
      }
      if (cur && cur.c >= fc && cur.c <= lc) { ctx.fillStyle = th.selLine; ctx.fillRect(X(cur.c), this.rulerH - 3, cw, 3); }
      // conservation bars
      const by = this.rulerH, bh = this.barsH - 4;
      const contigMode = stats.mode === 'contig';
      for (let c = fc; c <= lc; c++) {
        const x = X(c);
        let h, col;
        if (contigMode) {
          const cv = stats.cover[c]; h = cv ? Math.max(2, cv / stats.maxCover * bh) : 0;
          col = stats.amb[c] ? th.warn : cv >= 2 ? th.accent : mix(th.warn, th.panel2, 0.55);
        } else {
          const id = stats.ident[c]; h = Math.max(id > 0 ? 2 : 0, id * bh);
          col = id >= 0.999 ? th.accent : id >= 0.6 ? mix(th.accent, th.panel2, 0.45) : th.line2;
        }
        ctx.fillStyle = col;
        ctx.fillRect(x + (cw > 5 ? 1 : 0), by + 2 + bh - h, Math.max(1, cw - (cw > 5 ? 2 : 0)), h);
      }
      // consensus row
      const cy = this.rulerH + this.barsH;
      ctx.font = `600 ${fontPx}px ${th.mono}`; ctx.textAlign = 'center';
      for (let c = fc; c <= lc; c++) {
        const ch = consStr[c]; if (!ch || ch === '-') continue;
        const x = X(c), col = this.cellColors(ch, '', A.mainType(), scheme === 'diff' || scheme === 'blosum' ? 'residue' : scheme);
        if (col && col.bg) { ctx.globalAlpha = 0.9; ctx.fillStyle = col.bg; ctx.fillRect(x, cy, cw - (cw > 6 ? 1 : 0), rh - 1); ctx.globalAlpha = 1; }
        if (showLetters && col) { ctx.fillStyle = col.fg; ctx.fillText(ch, x + cw / 2, cy + rh / 2 + 0.5); }
        if (stats.amb && stats.amb[c]) { ctx.strokeStyle = th.warn; ctx.lineWidth = 2; ctx.strokeRect(x + 1, cy + 1, cw - (cw > 6 ? 2 : 1), rh - 3); }
        if (stats.ovr && stats.ovr[c]) { ctx.fillStyle = th.accent; ctx.fillRect(x, cy, 4, 4); }
      }
      // translation track
      if (o.translate && A.mainType() === 'dna') {
        const ty = cy + rh + 2;
        const cols = []; for (let c = 0; c < L; c++) if (consStr[c] && consStr[c] !== '-') cols.push(c);
        const code = o.code, tbl = BW.codonTable(code);
        ctx.font = `600 ${Math.min(13, fontPx)}px ${th.mono}`;
        for (let k = o.frame; k + 2 < cols.length; k += 3) {
          const c0 = cols[k], c2 = cols[k + 2];
          if (c2 < fc || c0 > lc) continue;
          const cod = consStr[c0] + consStr[cols[k + 1]] + consStr[c2];
          const aa = tbl.map[cod.replace(/U/g, 'T')] || 'X';
          const x0 = X(c0), w = X(c2 + 1) - x0 - 1;
          const isStart = tbl.starts.has(cod), isStop = aa === '*';
          ctx.fillStyle = isStop ? th.badSoft : isStart ? th.okSoft : th.line;
          ctx.fillRect(x0, ty, w, rh - 1);
          ctx.fillStyle = isStop ? th.bad : isStart ? th.ok : th.text2;
          if (showLetters || w > 12) ctx.fillText(aa, x0 + w / 2, ty + rh / 2 + 0.5);
        }
      }
      ctx.fillStyle = th.line; ctx.fillRect(nameW, hdr - 1, W - nameW, 1);
      ctx.restore();

      /* --- names column --- */
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, nameW, H); ctx.clip();
      ctx.fillStyle = th.panel; ctx.fillRect(0, 0, nameW, H);
      ctx.fillStyle = th.panel2; ctx.fillRect(0, 0, nameW, hdr);
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = `600 10px ${th.sans}`; ctx.fillStyle = th.muted;
      ctx.fillText('POSITION', 12, 12);
      ctx.fillText(stats.mode === 'contig' ? 'COVERAGE' : 'CONSERVATION', 12, this.rulerH + this.barsH / 2);
      ctx.font = `600 12px ${th.sans}`; ctx.fillStyle = th.text2;
      ctx.fillText(stats.mode === 'contig' ? 'Consensus' : 'Consensus', 12, cy + rh / 2);
      if (this.transH) { ctx.fillStyle = th.muted; ctx.font = `600 11px ${th.sans}`; ctx.fillText('Translation · F' + (o.frame + 1), 12, cy + rh + 2 + rh / 2); }
      ctx.save(); ctx.beginPath(); ctx.rect(0, hdr, nameW, H - hdr); ctx.clip();
      ctx.font = `560 12.5px ${th.sans}`;
      for (let r = fr; r <= lr; r++) {
        const s = rows[r], y = Y(r);
        const selected = S.sel && r >= S.sel.r0 && r <= S.sel.r1 && S.sel.c0 === 0 && S.sel.c1 === L - 1;
        const isCur = cur && cur.r === r;
        if (selected) { ctx.fillStyle = th.accentSoft; ctx.fillRect(0, y, nameW, rh); }
        else if (isCur) { ctx.fillStyle = th.colHi; ctx.fillRect(0, y, nameW, rh); }
        ctx.fillStyle = s.trace ? '#3b82f6' : s.type === 'protein' ? '#a15cd8' : '#3ea66b';
        ctx.beginPath(); ctx.arc(14, y + rh / 2, 3.5, 0, 7); ctx.fill();
        let label = s.name, maxW = nameW - 36 - (ref === s ? 34 : 0);
        ctx.fillStyle = th.text;
        if (ctx.measureText(label).width > maxW) { while (label.length > 3 && ctx.measureText(label + '…').width > maxW) label = label.slice(0, -1); label += '…'; }
        ctx.fillText(label, 26, y + rh / 2 + 0.5);
        if (ref === s) {
          ctx.font = `700 9px ${th.sans}`; const tw = 26; ctx.fillStyle = th.warnSoft; ctx.fillRect(nameW - 34, y + rh / 2 - 7, tw, 14);
          ctx.fillStyle = th.warn; ctx.textAlign = 'center'; ctx.fillText('REF', nameW - 34 + tw / 2, y + rh / 2 + 0.5); ctx.textAlign = 'left';
          ctx.font = `560 12.5px ${th.sans}`;
        }
      }
      ctx.restore();
      ctx.fillStyle = th.line; ctx.fillRect(nameW - 1, 0, 1, H); ctx.fillRect(0, hdr - 1, nameW, 1);
      ctx.restore();
    }

    /* ----- overview strip ----- */
    drawOverview() {
      const cv = this.ov, p = cv.parentElement, dpr = window.devicePixelRatio || 1;
      const w = p.clientWidth, h = p.clientHeight; if (!w) return;
      if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
      const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const A = this.app, th = A.theme, L = A.alnLen(), stats = A.stats();
      ctx.fillStyle = th.panel; ctx.fillRect(0, 0, w, h);
      if (!L) return;
      const px = Math.max(1, w / L);
      const nb = Math.min(L, Math.floor(w));
      for (let b = 0; b < nb; b++) {
        const c0 = Math.floor(b * L / nb), c1 = Math.max(c0 + 1, Math.floor((b + 1) * L / nb));
        let mn = 1, anyDiff = false;
        for (let c = c0; c < c1; c++) { const v = stats.ident[c]; if (v < mn) mn = v; if ((stats.diff && stats.diff[c]) || (stats.het && stats.het[c])) anyDiff = true; }
        const x = b * (w / nb);
        ctx.fillStyle = mn >= 0.999 ? mix(th.accent, th.panel, 0.55) : mn > 0.5 ? th.line2 : th.line;
        const bh = 6 + mn * 14;
        ctx.fillRect(x, h - 4 - bh, Math.ceil(w / nb), bh);
        if (anyDiff) { ctx.fillStyle = th.warn; ctx.fillRect(x, 3, Math.max(2, Math.ceil(w / nb)), 7); }
      }
      // viewport box
      const sl = this.sc.scrollLeft, vw = this.W - this.nameW;
      const x0 = (sl / this.cw) / L * w, x1 = ((sl + vw) / this.cw) / L * w;
      ctx.fillStyle = th.sel; ctx.fillRect(x0, 0, Math.max(3, x1 - x0), h);
      ctx.strokeStyle = th.selLine; ctx.lineWidth = 1.5; ctx.strokeRect(x0 + .75, .75, Math.max(3, x1 - x0) - 1.5, h - 1.5);
    }

    /* ----- geometry / hit testing ----- */
    hit(e) {
      const rect = this.cv.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      const sl = this.sc.scrollLeft, st = this.sc.scrollTop, L = this.app.alnLen(), N = this.app.rows().length;
      const hdr = this.headerH;
      const col = Math.min(L - 1, Math.max(0, Math.floor((x - this.nameW + sl) / this.cw)));
      const row = Math.min(N - 1, Math.max(0, Math.floor((y - hdr + st) / this.rh)));
      let zone = 'cell';
      if (x < this.nameW) zone = y < hdr ? 'corner' : 'name';
      else if (y < this.rulerH) zone = 'ruler';
      else if (y < this.rulerH + this.barsH) zone = 'bars';
      else if (y < hdr) zone = 'cons';
      return { x, y, zone, row, col, inside: x >= this.nameW && y >= hdr && row < N && (x - this.nameW + sl) / this.cw < L };
    }

    ensureVisible(r, c, center) {
      const sc = this.sc, cw = this.cw, rh = this.rh, vw = this.W - this.nameW, vh = this.H - this.headerH;
      let x = c * cw, y = r * rh;
      if (center) sc.scrollLeft = Math.max(0, x - vw / 2 + cw / 2);
      else if (x < sc.scrollLeft + cw) sc.scrollLeft = Math.max(0, x - cw * 2);
      else if (x + cw > sc.scrollLeft + vw - cw) sc.scrollLeft = x + cw * 3 - vw;
      if (r >= 0) {
        if (y < sc.scrollTop) sc.scrollTop = y;
        else if (y + rh > sc.scrollTop + vh) sc.scrollTop = y + rh - vh;
      }
    }

    bind() {
      const A = this.app; let drag = null, timer = 0, lastE = null;
      this.cv.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        this.sc.focus({ preventScroll: true });
        const h = this.hit(e);
        if (h.zone === 'cell' && !h.inside) return;
        this.cv.setPointerCapture(e.pointerId);
        drag = { zone: h.zone, r: h.row, c: h.col };
        if (h.zone === 'cell') A.onCellDown(h.row, h.col, e.shiftKey);
        else if (h.zone === 'name') A.onRowClick(h.row, e);
        else if (h.zone === 'ruler' || h.zone === 'bars' || h.zone === 'cons') A.onColClick(h.col, e.shiftKey);
        lastE = e;
        clearInterval(timer);
        timer = setInterval(() => {
          if (!drag || !lastE) return;
          const rect = this.cv.getBoundingClientRect();
          const dx = lastE.clientX > rect.right - 24 ? 22 : lastE.clientX < rect.left + this.nameW + 24 ? -22 : 0;
          const dy = lastE.clientY > rect.bottom - 20 ? 16 : lastE.clientY < rect.top + this.headerH + 20 ? -16 : 0;
          if (dx || dy) { this.sc.scrollLeft += dx; this.sc.scrollTop += dy; const h2 = this.hit(lastE); this.dragTo(drag, h2); }
        }, 40);
      });
      this.cv.addEventListener('pointermove', (e) => {
        lastE = e;
        const h = this.hit(e);
        if (drag) { this.dragTo(drag, h); return; }
        const hc = h.inside && h.zone === 'cell' ? { r: h.row, c: h.col } : null;
        A.onHoverCell(hc);
      });
      const end = () => { drag = null; clearInterval(timer); };
      this.cv.addEventListener('pointerup', end); this.cv.addEventListener('pointercancel', end);
      this.cv.addEventListener('pointerleave', () => { if (!drag) A.onHoverCell(null); });
      this.cv.addEventListener('dblclick', (e) => { const h = this.hit(e); if (h.zone === 'name') A.renameRow(h.row); });
      this.cv.addEventListener('contextmenu', (e) => { e.preventDefault(); const h = this.hit(e); A.contextMenu(e, h); });
      // overview
      const ov = this.ov.parentElement; let od = false;
      const go = (e) => {
        const r = ov.getBoundingClientRect(), L = A.alnLen();
        const frac = (e.clientX - r.left) / r.width;
        const vw = (this.W - this.nameW) / this.cw;
        this.sc.scrollLeft = Math.max(0, (frac * L - vw / 2) * this.cw);
      };
      ov.addEventListener('pointerdown', (e) => { od = true; ov.setPointerCapture(e.pointerId); go(e); });
      ov.addEventListener('pointermove', (e) => { if (od) go(e); });
      ov.addEventListener('pointerup', () => (od = false));
    }

    dragTo(d, h) {
      const A = this.app;
      if (d.zone === 'cell') A.onCellDrag(h.row, h.col);
      else if (d.zone === 'name') A.onRowDrag(d.r, h.row);
      else A.onColDrag(d.c, h.col);
    }

    /** Render the whole alignment to an offscreen canvas (for PNG export). */
    renderFull(maxPx = 16000) {
      const A = this.app, L = A.alnLen(), N = A.rows().length;
      const W = Math.min(maxPx, this.nameW + L * this.cw + 8), H = Math.min(maxPx, this.headerH + N * this.rh + 8);
      const cv = document.createElement('canvas'); const dpr = 2;
      cv.width = W * dpr; cv.height = H * dpr;
      const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const keep = this.app.S.sel; this.app.S.sel = null;
      this.paint(ctx, W, H, 0, 0, true);
      this.app.S.sel = keep;
      return cv;
    }
  }
  BW.AlignView = AlignView;
})();
