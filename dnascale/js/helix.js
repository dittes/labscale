/* Interactive 3D double-helix viewer (own canvas-2D renderer; idealised parametric A/B/Z-DNA model). */
(function () {
  'use strict';
  const BW = (globalThis.BW = globalThis.BW || {});
  const FORMS = {
    B: { name: 'B-DNA', R: 10, rise: 3.4, twist: 360 / 10.5, off: 120, hand: 1, info: 'Right-handed, 10.5 bp per turn, 3.4 Å rise' },
    A: { name: 'A-DNA', R: 11.5, rise: 2.6, twist: 360 / 11, off: 140, hand: 1, info: 'Right-handed, 11 bp per turn, 2.6 Å rise' },
    Z: { name: 'Z-DNA', R: 9, rise: 3.7, twist: 360 / 12, off: 150, hand: -1, info: 'Left-handed, 12 bp per turn, 3.7 Å rise' },
  };
  BW.HELIX_FORMS = FORMS;
  const COMP = { A: 'T', T: 'A', G: 'C', C: 'G' };

  class HelixView {
    constructor(canvas, app) {
      this.cv = canvas; this.app = app; this.ctx = canvas.getContext('2d');
      this.o = { form: 'B', style: 'ball', color: 'base', backbone: true, bases: true, hbonds: true, letters: true, spin: true, win: 40, start: 0, follow: true };
      this.yaw = 0.6; this.pitch = 0.32; this.roll = -0.1; this.zoom = 1; this.panX = 0; this.panY = 0;
      this.info = null; this.hover = -1; this.pick = -1; this.t0 = performance.now();
      this.sprites = new Map(); this._timer = 0; this.active = false; this.dragging = false;
      new ResizeObserver(() => this.resize()).observe(canvas.parentElement);
      this.bind();
    }

    setInfo(info) { this.info = info; this.build(); this.kick(); }

    resize() {
      const r = this.cv.parentElement.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
      this.W = Math.max(200, r.width); this.H = Math.max(200, r.height); this.dpr = dpr;
      this.cv.width = Math.round(this.W * dpr); this.cv.height = Math.round(this.H * dpr);
      this.cv.style.width = this.W + 'px'; this.cv.style.height = this.H + 'px'; this.kick();
    }

    /* ---- geometry ---- */
    build() {
      const inf = this.info; this.pairs = [];
      if (!inf || !inf.seq) return;
      const f = FORMS[this.o.form], n = Math.min(this.o.win, inf.seq.length), s0 = Math.max(0, Math.min(this.o.start, inf.seq.length - n));
      this.o.start = s0; this.n = n; const mid = (n - 1) / 2, deg = Math.PI / 180;
      for (let k = 0; k < n; k++) {
        const i = s0 + k, b = inf.seq[i] || 'N', c = COMP[b] || 'N';
        const a = k * f.twist * deg * f.hand, a2 = a + f.off * deg * f.hand, y = (k - mid) * f.rise;
        const P1 = [y, f.R * Math.cos(a), f.R * Math.sin(a)], P2 = [y, f.R * Math.cos(a2), f.R * Math.sin(a2)];
        const r1 = f.R * 0.62;
        const C1 = [y, r1 * Math.cos(a), r1 * Math.sin(a)], C2 = [y, r1 * Math.cos(a2), r1 * Math.sin(a2)];
        const M = [y, (C1[1] + C2[1]) / 2, (C1[2] + C2[2]) / 2];
        this.pairs.push({ i, k, b, c, P1, P2, C1, C2, M, q: inf.qual ? inf.qual[i] : null, v: inf.variant ? inf.variant(i) : 0 });
      }
      this.f = f; this.span = (n - 1) * f.rise + 2 * f.R;
    }

    /* ---- projection ---- */
    project(p) {
      const cs = Math.cos(this.yaw), ss = Math.sin(this.yaw), ct = Math.cos(this.pitch), st = Math.sin(this.pitch), cr = Math.cos(this.roll), sr = Math.sin(this.roll);
      let x = p[0], y = p[1] * cs - p[2] * ss, z = p[1] * ss + p[2] * cs;       // spin about the helix axis
      const x2 = x * ct + z * st, z2 = -x * st + z * ct;                      // tilt towards / away from the viewer
      const x3 = x2 * cr - y * sr, y3 = x2 * sr + y * cr;                     // small roll of the axis in the screen plane
      const R = this.f ? this.f.R : 10, base = Math.min((this.W * 0.9) / Math.max(40, Math.abs(this.span) * Math.max(Math.cos(this.pitch), 0.18) + 30), (this.H * 0.5) / (2 * R + 8));
      const fov = 140, sc = this.zoom * base * (fov / (fov + z2 * 0.6));
      return { x: this.W / 2 + this.panX + x3 * sc, y: this.H / 2 + this.panY - y3 * sc, z: z2, s: sc };
    }

    color(p, strand) {
      const th = this.app.theme, o = this.o.color;
      if (o === 'strand') return strand === 2 ? '#a15cd8' : th.accent;
      if (o === 'uniform') return th.accent;
      if (o === 'quality' && p.q !== null) { const q = p.q; return q >= 30 ? th.qHigh : q >= 20 ? th.qMid : th.qLow; }
      if (o === 'variant') return p.v ? th.warn : th.muted;
      const b = strand === 2 ? p.c : p.b; return this.app.baseColor(b, false);
    }

    sprite(color, r) {
      r = Math.max(2, Math.round(r)); const key = color + r;
      let s = this.sprites.get(key); if (s) return s;
      const c = document.createElement('canvas'); c.width = c.height = r * 2 + 4; const x = c.getContext('2d');
      const g = x.createRadialGradient(r * 0.7 + 2, r * 0.65 + 2, r * 0.1, r + 2, r + 2, r);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.18, color); g.addColorStop(1, shade(color, -0.45));
      x.fillStyle = g; x.beginPath(); x.arc(r + 2, r + 2, r, 0, 7); x.fill();
      if (this.sprites.size > 600) this.sprites.clear();
      this.sprites.set(key, (s = c)); return s;
    }

    /* ---- drawing ---- */
    draw(ctx = this.ctx, W = this.W, H = this.H, dpr = this.dpr, forExport) {
      const th = this.app.theme; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!forExport || forExport === 'bg') { ctx.fillStyle = th.dark ? '#0b0f16' : '#f4f7fc'; ctx.fillRect(0, 0, W, H); }
      if (!this.pairs || !this.pairs.length) { ctx.fillStyle = th.muted; ctx.font = '14px ' + th.sans; ctx.textAlign = 'center'; ctx.fillText('Choose a DNA sequence to build the helix', W / 2, H / 2); return; }
      const o = this.o, items = [], pairs = this.pairs, f = this.f;
      const prim = (z, fn) => items.push({ z, fn });
      const proj = pairs.map((p) => ({ P1: this.project(p.P1), P2: this.project(p.P2), C1: this.project(p.C1), C2: this.project(p.C2), M: this.project(p.M) }));
      const sc0 = proj[0].M.s, thin = o.style === 'wire', fat = o.style === 'cartoon';
      const line = (a, b, w, col, alpha = 1, cap = 'round') => { ctx.globalAlpha = alpha; ctx.strokeStyle = col; ctx.lineWidth = Math.max(0.6, w); ctx.lineCap = cap; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.globalAlpha = 1; };
      const depthA = (z) => Math.max(0.35, Math.min(1, 0.78 - z * 0.012));
      for (let k = 0; k < pairs.length; k++) {
        const p = pairs[k], q = proj[k], hot = this.hover === k || this.pick === k, sel = this.info.sel && p.i >= this.info.sel[0] && p.i <= this.info.sel[1];
        // base pair rungs
        if (o.bases) {
          const w = (thin ? 0.9 : 0.55 * q.M.s * 2.4) * (hot ? 1.3 : 1);
          prim((q.C1.z + q.M.z) / 2, () => line(q.C1, q.M, w, this.color(p, 1), depthA(q.C1.z), thin ? 'butt' : 'round'));
          prim((q.C2.z + q.M.z) / 2, () => line(q.M, q.C2, w, this.color(p, 2), depthA(q.C2.z), thin ? 'butt' : 'round'));
          if (o.hbonds && !thin) prim(q.M.z, () => { const n = p.b === 'G' || p.b === 'C' ? 3 : 2; ctx.fillStyle = this.app.theme.text2; ctx.globalAlpha = 0.65; for (let j = 0; j < n; j++) { const t = (j + 1) / (n + 1); ctx.beginPath(); ctx.arc(q.C1.x + (q.C2.x - q.C1.x) * (0.4 + 0.2 * t), q.C1.y + (q.C2.y - q.C1.y) * (0.4 + 0.2 * t) + (j - (n - 1) / 2) * q.M.s * 0.5, Math.max(0.6, q.M.s * 0.22), 0, 7); ctx.fill(); } ctx.globalAlpha = 1; });
          if (o.letters && this.pairs.length <= 90 && q.M.s > 2.4) prim(q.M.z + 5, () => { ctx.font = `700 ${Math.min(15, q.M.s * 3.2)}px ${this.app.theme.mono}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.globalAlpha = depthA(q.M.z); ctx.fillText(p.b, q.C1.x * 0.62 + q.M.x * 0.38, q.C1.y * 0.62 + q.M.y * 0.38); ctx.fillText(p.c, q.C2.x * 0.62 + q.M.x * 0.38, q.C2.y * 0.62 + q.M.y * 0.38); ctx.globalAlpha = 1; });
        }
        // C1'-to-phosphate struts
        if (o.backbone && !thin) { prim((q.C1.z + q.P1.z) / 2, () => line(q.C1, q.P1, q.M.s * 0.45, this.color(p, 1), depthA(q.P1.z) * 0.6)); prim((q.C2.z + q.P2.z) / 2, () => line(q.C2, q.P2, q.M.s * 0.45, this.color(p, 2), depthA(q.P2.z) * 0.6)); }
        // backbone
        if (o.backbone && k + 1 < pairs.length) {
          const r = proj[k + 1], w = fat ? q.M.s * 2.2 : thin ? 1.1 : q.M.s * 0.95;
          prim((q.P1.z + r.P1.z) / 2, () => line(q.P1, r.P1, w, fat ? (this.o.color === 'strand' || this.o.color === 'uniform' ? this.color(p, 1) : this.app.theme.accent) : this.color(p, 1), depthA(q.P1.z), fat ? 'butt' : 'round'));
          prim((q.P2.z + r.P2.z) / 2, () => line(q.P2, r.P2, w, fat ? '#a15cd8' : this.color(p, 2), depthA(q.P2.z), fat ? 'butt' : 'round'));
        }
        // phosphates
        if (o.backbone && o.style === 'ball') {
          const r = q.M.s * 1.45; const col = this.o.color === 'base' ? '#e8a317' : this.color(p, 1), col2 = this.o.color === 'base' ? '#e8a317' : this.color(p, 2);
          prim(q.P1.z, () => { const s = this.sprite(col, r); ctx.globalAlpha = depthA(q.P1.z); ctx.drawImage(s, q.P1.x - r - 2, q.P1.y - r - 2, s.width, s.height); ctx.globalAlpha = 1; });
          prim(q.P2.z, () => { const s = this.sprite(col2, r); ctx.globalAlpha = depthA(q.P2.z); ctx.drawImage(s, q.P2.x - r - 2, q.P2.y - r - 2, s.width, s.height); ctx.globalAlpha = 1; });
        }
        // highlights: variants, selection, hover
        if (p.v || hot || sel) prim(q.M.z + 8, () => {
          const th = this.app.theme, t = (performance.now() - this.t0) / 1000, pulse = p.v ? 0.5 + 0.5 * Math.sin(t * 4) : 1;
          ctx.strokeStyle = hot ? th.text : sel ? th.accent : th.warn; ctx.lineWidth = hot ? 2 : 2.4; ctx.globalAlpha = hot ? 1 : 0.35 + 0.55 * pulse;
          ctx.beginPath(); ctx.ellipse((q.C1.x + q.C2.x) / 2, (q.C1.y + q.C2.y) / 2, Math.hypot(q.C1.x - q.C2.x, q.C1.y - q.C2.y) / 2 + q.M.s * 2.2, q.M.s * 3.4, Math.atan2(q.C2.y - q.C1.y, q.C2.x - q.C1.x) * 0, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
        });
      }
      items.sort((a, b) => b.z - a.z);
      ctx.save(); for (const it of items) it.fn(); ctx.restore();
      this.proj = proj;
    }

    /* ---- interaction ---- */
    kick() {
      if (this._timer) return;
      const step = () => {
        this._timer = 0; if (!this.active || !this.W) return;
        const now = performance.now(), dt = Math.min(50, now - (this._last || now)); this._last = now;
        if (this.o.spin && !this.dragging) this.yaw += dt * 0.0007;
        if (!this.dragging && !this.o.spin) { this.yaw += this.vy || 0; this.pitch += this.vp || 0; this.vy *= 0.92; this.vp *= 0.92; if (Math.abs(this.vy) < 1e-4) this.vy = 0; if (Math.abs(this.vp) < 1e-4) this.vp = 0; }
        this.draw();
        const animated = this.o.spin || this.dragging || this.vy || this.vp || (this.pairs && this.pairs.some((p) => p.v));
        if (animated) this._timer = setTimeout(step, 24);
      };
      this._timer = setTimeout(step, 0);
    }
    setActive(a) { this.active = a; if (a) { this.resize(); this.kick(); } }

    nearest(x, y) {
      if (!this.proj) return -1; let best = -1, bd = 22 * 22;
      this.proj.forEach((q, k) => { const mx = (q.C1.x + q.C2.x) / 2, my = (q.C1.y + q.C2.y) / 2; const d = (mx - x) ** 2 + (my - y) ** 2; if (d < bd) { bd = d; best = k; } });
      return best;
    }

    bind() {
      const cv = this.cv; let down = null;
      cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); down = { x: e.offsetX, y: e.offsetY, yaw: this.yaw, pitch: this.pitch, px: this.panX, py: this.panY, pan: e.shiftKey || e.button === 2, moved: false }; this.dragging = true; this.vy = this.vp = 0; });
      cv.addEventListener('pointermove', (e) => {
        if (down) {
          const dx = e.offsetX - down.x, dy = e.offsetY - down.y; if (Math.abs(dx) + Math.abs(dy) > 3) down.moved = true;
          if (down.pan) { this.panX = down.px + dx; this.panY = down.py + dy; }
          else { this.yaw = down.yaw + dx * 0.01; this.pitch = Math.max(-1.55, Math.min(1.55, down.pitch - dy * 0.006)); this.vy = 0; this.vp = 0; }
          this.o.spin = this.o.spin && !down.moved ? this.o.spin : false; this.app.onSpinChange && this.app.onSpinChange(this.o.spin);
          this.kick();
        } else { const k = this.nearest(e.offsetX, e.offsetY); if (k !== this.hover) { this.hover = k; this.app.onHover(k >= 0 ? this.pairs[k] : null, e); this.kick(); } }
      });
      const up = (e) => { if (down && !down.moved) { const k = this.nearest(e.offsetX, e.offsetY); if (k >= 0) { this.pick = k; this.app.onPick(this.pairs[k]); } else this.pick = -1; } down = null; this.dragging = false; this.kick(); };
      cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
      cv.addEventListener('pointerleave', () => { this.hover = -1; this.app.onHover(null); this.kick(); });
      cv.addEventListener('wheel', (e) => { e.preventDefault(); this.zoom = Math.max(0.25, Math.min(8, this.zoom * Math.exp(-e.deltaY * 0.0015))); this.kick(); }, { passive: false });
      cv.addEventListener('dblclick', () => this.reset());
      cv.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    reset() { this.zoom = 1; this.panX = this.panY = 0; this.setView('default'); }
    setView(v) {
      const V = { default: [0.6, 0.32, -0.1], side: [0, 0, 0], top: [0, Math.PI / 2 - 0.03, 0], major: [0.0, 0.0, 0], minor: [Math.PI, 0.0, 0] }[v] || [0.6, 0.32, -0.1];
      this.o.spin = false; this.yaw = V[0]; this.pitch = V[1]; this.roll = V[2]; this.app.onSpinChange && this.app.onSpinChange(false); this.kick();
    }

    /* ---- export ---- */
    png(scale = 2) {
      const c = document.createElement('canvas'); c.width = this.W * scale; c.height = this.H * scale;
      this.draw(c.getContext('2d'), this.W, this.H, scale, 'bg'); return c;
    }
    /** Coarse-grained PDB (P, C1' and a base-centre pseudo atom per nucleotide). Idealised model, not experimental data. */
    pdb() {
      const lines = ['REMARK   Idealised parametric ' + this.f.name + ' model generated by DNAScale (coarse-grained: P, C1\', base centre).', 'REMARK   Not an experimental or energy-minimised structure.'];
      let n = 1; const fmt = (v) => v.toFixed(3).padStart(8);
      const atom = (name, res, chain, num, p, el) => lines.push(`ATOM  ${String(n++).padStart(5)} ${name.padEnd(4)} ${res.padStart(3)} ${chain}${String(num).padStart(4)}    ${fmt(p[0])}${fmt(p[1])}${fmt(p[2])}  1.00  0.00          ${el.padStart(2)}`);
      const R = { A: 'DA', T: 'DT', G: 'DG', C: 'DC', N: 'DN' };
      this.pairs.forEach((p, k) => { atom('P', R[p.b] || 'DN', 'A', k + 1, p.P1, 'P'); atom("C1'", R[p.b] || 'DN', 'A', k + 1, p.C1, 'C'); atom('N1', R[p.b] || 'DN', 'A', k + 1, [p.M[0], (p.C1[1] + p.M[1]) / 2, (p.C1[2] + p.M[2]) / 2], 'N'); });
      for (let k = this.pairs.length - 1, r = 1; k >= 0; k--, r++) { const p = this.pairs[k]; atom('P', R[p.c] || 'DN', 'B', r, p.P2, 'P'); atom("C1'", R[p.c] || 'DN', 'B', r, p.C2, 'C'); atom('N1', R[p.c] || 'DN', 'B', r, [p.M[0], (p.C2[1] + p.M[1]) / 2, (p.C2[2] + p.M[2]) / 2], 'N'); }
      lines.push('END'); return lines.join('\n') + '\n';
    }
  }

  function shade(hex, amt) {
    const m = /^#([0-9a-f]{6})$/i.exec(hex); if (!m) return hex;
    const n = parseInt(m[1], 16), ch = (s) => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * (1 + amt))));
    return '#' + [16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join('');
  }
  BW.HelixView = HelixView;
})();
