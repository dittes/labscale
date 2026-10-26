/* Chromatogram renderer */
(function () {
  'use strict';
  const BW = (globalThis.BW = globalThis.BW || {});

  class TraceView {
    constructor(canvas, app) {
      this.cv = canvas; this.app = app; this.ctx = canvas.getContext('2d');
      this.seq = null; this.t = null;
      this.sx = 1.7; this.scroll = 0; this.gain = 1;
      this.showQual = true; this.classic = false;
      this.hover = -1; this.focusBase = -1; this.selRange = null;
      this._raf = 0; this._anim = 0;
      new ResizeObserver(() => this.resize()).observe(canvas.parentElement);
      this.bind();
    }

    set(seq) {
      const same = this.seq === seq;
      this.seq = seq; this.t = seq ? seq.trace : null;
      if (this.t && !same) {
        this.initScale();
        this.gain = 1;
        this.scroll = 0;
      }
      this.draw();
    }

    initScale() {
      const t = this.t, L = t.bases.length, hs = [];
      for (let i = 0; i < L; i++) { const a = t.ch[t.bases[i]]; if (a) hs.push(a[t.peaks[i]] || 0); }
      hs.sort((x, y) => x - y);
      this.fullScale = Math.max(200, (hs[Math.floor(hs.length * 0.95)] || t.max) * 1.18);
      this.spacing = L > 1 ? (t.peaks[L - 1] - t.peaks[0]) / (L - 1) : 12;
    }

    resize() {
      const r = this.cv.parentElement.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const centre = this.W && this.t ? this.scroll + this.W / this.sx / 2 : null;
      this.W = Math.max(10, r.width); this.H = Math.max(10, r.height);
      if (this.pending != null) { const p = this.pending; this.pending = null; this.centerOn(p, true); }
      else if (centre !== null) { this.scroll = centre - this.W / this.sx / 2; this.clampScroll(); }
      this.cv.width = Math.round(this.W * dpr); this.cv.height = Math.round(this.H * dpr);
      this.cv.style.width = this.W + 'px'; this.cv.style.height = this.H + 'px';
      this.dpr = dpr; this.draw();
    }

    request() { if (!this._raf) this._raf = requestAnimationFrame(() => { this._raf = 0; this.draw(); }); }

    clampScroll() {
      if (!this.t) return;
      const maxS = Math.max(0, this.t.nSamples - this.W / this.sx + 40);
      this.scroll = Math.min(Math.max(-40, this.scroll), maxS);
    }

    centerOn(base, instant) {
      if (!this.t || base < 0 || base >= this.t.peaks.length) return;
      if (!this.W) { this.pending = base; return; }
      const target = this.t.peaks[base] - (this.W / this.sx) / 2;
      const visible = this.t.peaks[base] >= this.scroll + 20 / this.sx && this.t.peaks[base] <= this.scroll + (this.W - 20) / this.sx;
      if (instant || !visible || true) this.animateTo(target, instant);
    }

    animateTo(target, instant) {
      clearTimeout(this._anim);
      if (instant) { this.scroll = target; this.clampScroll(); this.draw(); return; }
      const step = () => {
        const d = target - this.scroll;
        if (Math.abs(d) < 0.5) { this.scroll = target; this.clampScroll(); this.draw(); return; }
        this.scroll += d * 0.3; this.clampScroll(); this.draw();
        this._anim = setTimeout(step, 16);
      };
      this._anim = setTimeout(step, 16);
    }

    zoom(f, ax) {
      const old = this.sx, anchorSample = this.scroll + (ax ?? this.W / 2) / old;
      this.sx = Math.min(8, Math.max(0.12, old * f));
      this.scroll = anchorSample - (ax ?? this.W / 2) / this.sx;
      this.clampScroll(); this.draw();
    }
    setGain(f) { this.gain = Math.min(12, Math.max(0.2, this.gain * f)); this.draw(); }

    baseAt(px) {
      const t = this.t; if (!t) return -1;
      const s = this.scroll + px / this.sx;
      let lo = 0, hi = t.peaks.length - 1;
      while (lo < hi) { const m = (lo + hi) >> 1; if (t.peaks[m] < s) lo = m + 1; else hi = m; }
      if (lo > 0 && Math.abs(t.peaks[lo - 1] - s) < Math.abs(t.peaks[lo] - s)) lo--;
      return Math.abs(t.peaks[lo] - s) * this.sx < Math.max(14, this.spacing * this.sx * 0.7) ? lo : -1;
    }

    bind() {
      const cv = this.cv; let down = null;
      cv.addEventListener('pointerdown', (e) => {
        if (!this.t) return;
        cv.setPointerCapture(e.pointerId);
        down = { x: e.offsetX, scroll: this.scroll, moved: false, shift: e.shiftKey };
        clearTimeout(this._anim);
      });
      cv.addEventListener('pointermove', (e) => {
        if (!this.t) return;
        if (down) {
          const dx = e.offsetX - down.x;
          if (Math.abs(dx) > 3) { down.moved = true; cv.classList.add('panning'); }
          if (down.moved) { this.scroll = down.scroll - dx / this.sx; this.clampScroll(); this.request(); }
        } else {
          const b = this.baseAt(e.offsetX);
          if (b !== this.hover) { this.hover = b; this.app.onTraceHover(b); this.request(); }
        }
      });
      const up = (e) => {
        if (down && !down.moved) { const b = this.baseAt(e.offsetX); if (b >= 0) this.app.onTraceClick(b, down.shift); }
        down = null; cv.classList.remove('panning');
      };
      cv.addEventListener('pointerup', up);
      cv.addEventListener('pointerleave', () => { if (!down && this.hover !== -1) { this.hover = -1; this.app.onTraceHover(-1); this.request(); } });
      cv.addEventListener('wheel', (e) => {
        if (!this.t) return;
        e.preventDefault();
        if (e.ctrlKey || e.metaKey) this.zoom(Math.exp(-e.deltaY * 0.01), e.offsetX);
        else { this.scroll += (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) / this.sx; this.clampScroll(); this.request(); }
      }, { passive: false });
      cv.addEventListener('dblclick', (e) => { this.zoom(e.shiftKey ? 0.6 : 1.6, e.offsetX); });
    }

    draw() {
      const { ctx, W, H, dpr } = this; if (!W) return;
      document.getElementById('trEmpty').hidden = !!this.t;
      this.render(ctx, W, H, dpr);
    }

    render(ctx, W, H, dpr) {
      const A = this.app, th = A.theme;
      if (dpr) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = th.panel; ctx.fillRect(0, 0, W, H);
      const t = this.t;
      if (!t) return;
      const sx = this.sx, s0 = this.scroll, s1 = s0 + W / sx;
      const topH = this.showQual ? 74 : 56, plotTop = topH + 4, plotBot = H - 6, ph = plotBot - plotTop;
      const X = (s) => (s - s0) * sx;
      const peaks = t.peaks, L = peaks.length;
      // visible base range
      let i0 = 0, i1 = L - 1;
      { let lo = 0, hi = L - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (peaks[m] < s0 - this.spacing) lo = m + 1; else hi = m; } i0 = lo;
        lo = 0; hi = L - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (peaks[m] > s1 + this.spacing) hi = m - 1; else lo = m; } i1 = hi; }
      const tS = this.seq.tStart, tE = this.seq.tEnd;
      const half = this.spacing / 2;

      // trimmed regions
      ctx.fillStyle = th.trim;
      if (tS > 0) ctx.fillRect(Math.min(0, X(-100)), 0, X(peaks[tS] - half) - Math.min(0, X(-100)), H);
      if (tE < L) { const x = X(peaks[tE - 1] + half); ctx.fillRect(x, 0, W - x, H); }

      // selection band & hover band
      const band = (i, color) => { const x = X(peaks[i] - half), w = this.spacing * sx; ctx.fillStyle = color; ctx.fillRect(x, 0, w, H); };
      if (this.selRange) for (let i = Math.max(i0, this.selRange[0]); i <= Math.min(i1, this.selRange[1]); i++) band(i, th.sel);
      if (this.hover >= 0) band(this.hover, th.colHi);

      // grid baseline
      ctx.strokeStyle = th.line; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, plotBot + .5); ctx.lineTo(W, plotBot + .5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, topH - .5); ctx.lineTo(W, topH - .5); ctx.stroke();

      // waveforms
      const scale = (ph * this.gain) / this.fullScale;
      const order = ['A', 'C', 'G', 'T'];
      const a0 = Math.max(0, Math.floor(s0) - 1), a1 = Math.min(t.nSamples - 1, Math.ceil(s1) + 1);
      ctx.save(); ctx.beginPath(); ctx.rect(0, topH, W, H - topH); ctx.clip();
      const fstep = sx >= 0.7 ? 1 : Math.max(1, Math.round(1 / sx));
      for (const b of order) {
        const arr = t.ch[b];
        ctx.beginPath();
        for (let s = a0, first = true; s <= a1; s += fstep) {
          let m = arr[s];
          if (fstep > 1) for (let k = s + 1; k < Math.min(s + fstep, a1 + 1); k++) if (arr[k] > m) m = arr[k];
          const x = X(s), y = plotBot - Math.min(m * scale, ph + 20);
          if (first) { ctx.moveTo(x, plotBot); first = false; }
          ctx.lineTo(x, y);
        }
        ctx.lineTo(X(a1), plotBot); ctx.closePath();
        ctx.globalAlpha = th.dark ? 0.14 : 0.1; ctx.fillStyle = A.baseColor(b, this.classic); ctx.fill(); ctx.globalAlpha = 1;
      }
      ctx.restore();
      this._strokeAll(ctx, a0, a1, X, scale, plotBot, ph, topH, W, H, A);

      // header: numbers, bases, ref, quality
      const px = this.spacing * sx;
      const mix = BW.mixRatios(t);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let i = i0; i <= i1; i++) {
        const x = X(peaks[i]);
        const inTrim = i >= tS && i < tE;
        const q = t.qual[i];
        if (px > 9) {
          ctx.font = '600 ' + Math.min(15, Math.max(10, px * 0.8)) + 'px ' + th.mono;
          ctx.globalAlpha = inTrim ? (0.5 + 0.5 * Math.min(1, q / 25)) : 0.45;
          ctx.fillStyle = A.baseColor(t.bases[i], this.classic);
          ctx.fillText(t.bases[i], x, 25);
          ctx.globalAlpha = 1;
          if (t.edited.has(i)) { ctx.fillStyle = th.accent; ctx.fillRect(x - 4, 33, 8, 2); }
        } else {
          ctx.fillStyle = A.baseColor(t.bases[i], this.classic);
          ctx.globalAlpha = inTrim ? 1 : 0.4; ctx.fillRect(x - 1, 18, 2, 12); ctx.globalAlpha = 1;
        }
        // numbering
        if ((i + 1) % 10 === 0 && px > 4) {
          ctx.font = '10px ' + th.mono; ctx.fillStyle = th.muted; ctx.fillText(String(i + 1), x, 9);
          ctx.fillRect(x - .5, 14, 1, 3);
        }
        // reference/consensus
        if (px > 9) {
          const rc = A.traceRefChar(this.seq, i);
          if (rc) {
            const mism = rc !== t.bases[i] && rc !== '-' && t.bases[i] !== 'N';
            ctx.font = '600 ' + Math.min(12, Math.max(9, px * 0.65)) + 'px ' + th.mono;
            if (mism) { ctx.fillStyle = th.badSoft; ctx.fillRect(x - px / 2 + 1, 38, px - 2, 14); ctx.fillStyle = th.bad; }
            else ctx.fillStyle = th.muted;
            ctx.fillText(rc, x, 45);
          }
        }
        // quality bars
        if (this.showQual) {
          const bh = Math.max(1, Math.min(18, q / 60 * 18));
          ctx.fillStyle = q >= 30 ? th.qHigh : q >= 20 ? th.qMid : th.qLow;
          ctx.globalAlpha = inTrim ? 0.95 : 0.35;
          const bw = Math.max(1, Math.min(px - 2, 10));
          ctx.fillRect(x - bw / 2, topH - 3 - bh, bw, bh);
          ctx.globalAlpha = 1;
        }
        // mixed-peak marker
        if (mix[i] > 0.33 && inTrim) {
          ctx.fillStyle = th.warn;
          ctx.beginPath(); ctx.moveTo(x - 4, plotTop + 1); ctx.lineTo(x + 4, plotTop + 1); ctx.lineTo(x, plotTop + 8); ctx.fill();
        }
      }
      // focus cursor line
      if (this.focusBase >= 0 && this.focusBase < L) {
        const x = X(peaks[this.focusBase]);
        ctx.strokeStyle = th.selLine; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.moveTo(x, 4); ctx.lineTo(x, H); ctx.stroke(); ctx.setLineDash([]);
        const w = Math.max(this.spacing * sx, 12);
        ctx.strokeStyle = th.selLine; ctx.lineWidth = 1.5; ctx.strokeRect(x - w / 2, 14, w, 24 + (this.showQual ? 0 : 0));
      }
      // labels for trimmed areas
      ctx.font = '600 10px ' + th.sans; ctx.fillStyle = th.muted; ctx.textAlign = 'left';
      if (tS > 0 && X(peaks[tS]) > 90) ctx.fillText('LOW-QUALITY END (trimmed)', Math.max(8, X(peaks[tS] - half) - 150), H - 14);
      if (tE < L) { const x = X(peaks[tE - 1] + half); if (x < W - 150) ctx.fillText('LOW-QUALITY END (trimmed)', x + 8, H - 14); }
    }

    _strokeAll(ctx, a0, a1, X, scale, plotBot, ph, topH, W, H, A) {
      const t = this.t, sx = this.sx;
      ctx.save(); ctx.beginPath(); ctx.rect(0, topH, W, H - topH); ctx.clip();
      const step = sx >= 0.7 ? 1 : Math.max(1, Math.round(1 / sx));
      ctx.lineJoin = 'round'; ctx.lineWidth = 1.6;
      for (const b of ['A', 'C', 'G', 'T']) {
        const arr = t.ch[b];
        ctx.strokeStyle = A.baseColor(b, this.classic);
        ctx.beginPath();
        for (let s = a0, first = true; s <= a1; s += step) {
          let m = arr[s];
          if (step > 1) for (let k = s + 1; k < Math.min(s + step, a1 + 1); k++) if (arr[k] > m) m = arr[k];
          const x = X(s), y = plotBot - Math.min(m * scale, ph + 20);
          if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
  }
  /** Off-screen chromatogram centred on a base, for reports. */
  BW.traceSnapshot = (app, seq, base, W, H) => {
    const v = Object.create(TraceView.prototype);
    Object.assign(v, { app, seq, t: seq.trace, sx: 1.7, gain: 1, showQual: true, classic: false, hover: -1, focusBase: base, selRange: null, W, H });
    v.initScale(); v.scroll = v.t.peaks[base] - W / v.sx / 2;
    return v;
  };
  BW.TraceView = TraceView;
})();
