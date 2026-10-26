/* Drawing helpers for sequence-analysis maps and plots. Work on any canvas-2D-like context (screen or PDF). */
(function () {
  'use strict';
  const BW = (globalThis.BW = globalThis.BW || {});
  const fmt = (n) => Number(n).toLocaleString('en-US');
  const font = (th, px, bold) => `${bold ? '600 ' : ''}${px}px ${th.sans}`;
  const niceStep = (span, n) => { const raw = span / n, p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p; return (f >= 5 ? 10 : f >= 2 ? 5 : f >= 1 ? 2 : 1) * p; };

  function axisX(ctx, th, x0, x1, y, len) {
    ctx.strokeStyle = th.line2; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
    const step = niceStep(len, Math.max(3, (x1 - x0) / 90));
    ctx.font = font(th, 9); ctx.fillStyle = th.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    for (let v = 0; v <= len; v += step) {
      const x = x0 + (v / len) * (x1 - x0);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 4); ctx.stroke(); ctx.fillText(fmt(v), x, y + 14);
    }
  }

  /** Six-frame ORF map. Returns hit rectangles for interaction. */
  BW.drawOrfMap = (ctx, W, H, len, orfs, th, sel) => {
    const ml = 46, mr = 12, top = 6, laneH = Math.max(16, (H - top - 26) / 6), x0 = ml, x1 = W - mr, hits = [];
    ctx.fillStyle = th.panel; ctx.fillRect(0, 0, W, H);
    const lanes = [[1, 1], [1, 2], [1, 3], [-1, 1], [-1, 2], [-1, 3]];
    ctx.textBaseline = 'middle';
    lanes.forEach(([st, fr], i) => {
      const y = top + i * laneH;
      if (i % 2 === 0) { ctx.fillStyle = th.stripe; ctx.fillRect(0, y, W, laneH); }
      ctx.font = font(th, 10, true); ctx.fillStyle = th.muted; ctx.textAlign = 'left'; ctx.fillText((st > 0 ? '+' : '−') + fr, 10, y + laneH / 2);
    });
    orfs.forEach((o, idx) => {
      const i = (o.strand > 0 ? 0 : 3) + (o.frame - 1), y = top + i * laneH + 3, h = laneH - 6;
      const xa = x0 + ((o.start - 1) / len) * (x1 - x0), xb = x0 + (o.end / len) * (x1 - x0), w = Math.max(2, xb - xa);
      ctx.fillStyle = o.strand > 0 ? th.accent : '#a15cd8'; ctx.globalAlpha = sel === idx ? 1 : 0.72;
      ctx.fillRect(xa, y, w, h); ctx.globalAlpha = 1;
      if (sel === idx) { ctx.strokeStyle = th.text; ctx.lineWidth = 1.5; ctx.strokeRect(xa, y, w, h); }
      if (w > 34) { ctx.font = font(th, 9, true); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(o.aa + ' aa', xa + w / 2, y + h / 2); }
      hits.push({ x: xa, y, w, h, i: idx });
    });
    axisX(ctx, th, x0, x1, top + 6 * laneH + 4, len);
    return hits;
  };

  /** Generic line plot. series: [{ys, color, label}], xs shared. opts: {title, ymin, ymax, hline, xlabel, ylabel, xmax} */
  BW.drawPlot = (ctx, W, H, xs, series, th, o = {}) => {
    const ml = 46, mr = 14, mt = o.title ? 24 : 12, mb = 28, w = W - ml - mr, h = H - mt - mb;
    ctx.fillStyle = th.panel; ctx.fillRect(0, 0, W, H);
    let lo = Infinity, hi = -Infinity;
    for (const s of series) for (const v of s.ys) { if (v < lo) lo = v; if (v > hi) hi = v; }
    if (o.ymin !== undefined) lo = o.ymin; if (o.ymax !== undefined) hi = o.ymax;
    if (!isFinite(lo) || lo === hi) { lo = 0; hi = 1; }
    const pad = o.ymin === undefined ? (hi - lo) * 0.08 : 0; lo -= pad; hi += o.ymax === undefined ? pad : 0;
    const xmax = o.xmax || xs[xs.length - 1] || 1, xmin = o.xmin || 0;
    const X = (v) => ml + ((v - xmin) / (xmax - xmin || 1)) * w, Y = (v) => mt + h - ((v - lo) / (hi - lo)) * h;
    if (o.title) { ctx.font = font(th, 11, true); ctx.fillStyle = th.text; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillText(o.title, ml, 14); }
    // grid + y ticks
    const ys = niceStep(hi - lo, 4); ctx.font = font(th, 9); ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let v = Math.ceil(lo / ys) * ys; v <= hi; v += ys) {
      const y = Y(v); ctx.strokeStyle = th.line; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(ml, y); ctx.lineTo(ml + w, y); ctx.stroke();
      ctx.fillStyle = th.muted; ctx.fillText((Math.abs(v) < 1e-9 ? 0 : +v.toFixed(2)).toString(), ml - 6, y);
    }
    if (o.hline !== undefined && o.hline > lo && o.hline < hi) { ctx.strokeStyle = th.warn; ctx.lineWidth = 1; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(ml, Y(o.hline)); ctx.lineTo(ml + w, Y(o.hline)); ctx.stroke(); ctx.setLineDash([]); }
    if (o.shade) for (const [a, b] of o.shade) { ctx.fillStyle = th.warn; ctx.globalAlpha = 0.14; ctx.fillRect(X(a), mt, Math.max(1, X(b) - X(a)), h); ctx.globalAlpha = 1; }
    ctx.save(); ctx.beginPath(); ctx.rect(ml, mt, w, h); ctx.clip();
    for (const s of series) {
      ctx.strokeStyle = s.color; ctx.lineWidth = s.width || 1.6; ctx.beginPath();
      const step = Math.max(1, Math.floor(xs.length / (w * 1.5)));
      for (let i = 0, f = true; i < xs.length; i += step) { const x = X(xs[i]), y = Y(s.ys[i]); if (f) { ctx.moveTo(x, y); f = false; } else ctx.lineTo(x, y); }
      ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = th.line2; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ml, mt + h); ctx.lineTo(ml + w, mt + h); ctx.moveTo(ml, mt); ctx.lineTo(ml, mt + h); ctx.stroke();
    // x ticks
    const xstep = niceStep(xmax - xmin, Math.max(3, w / 90)); ctx.font = font(th, 9); ctx.fillStyle = th.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    for (let v = Math.ceil(xmin / xstep) * xstep; v <= xmax; v += xstep) { const x = X(v); ctx.beginPath(); ctx.moveTo(x, mt + h); ctx.lineTo(x, mt + h + 4); ctx.stroke(); ctx.fillText(fmt(v), x, mt + h + 14); }
    if (o.xlabel) { ctx.fillText(o.xlabel, ml + w / 2, H - 3); }
    // legend
    if (series.length > 1 || series[0].label) {
      let lx = ml + w; ctx.textAlign = 'right'; ctx.font = font(th, 10);
      for (const s of [...series].reverse()) { if (!s.label) continue; const tw = ctx.measureText(s.label).width; ctx.fillStyle = th.text2; ctx.textBaseline = 'middle'; ctx.fillText(s.label, lx, 14); ctx.fillStyle = s.color; ctx.fillRect(lx - tw - 14, 11, 9, 6); lx -= tw + 26; }
    }
    return { X, Y, ml, mt, w, h, xmin, xmax };
  };

  /** Restriction map: items [{name, cuts:[...]}], linear or circular. */
  BW.drawRestrictionMap = (ctx, W, H, len, items, th, circular) => {
    ctx.fillStyle = th.panel; ctx.fillRect(0, 0, W, H);
    const marks = []; for (const it of items) for (const c of it.cuts) marks.push({ name: it.name, cut: c, n: it.cuts.length });
    marks.sort((a, b) => a.cut - b.cut);
    ctx.textBaseline = 'middle';
    if (!circular) {
      const x0 = 24, x1 = W - 24, y = H - 42, X = (c) => x0 + (c / len) * (x1 - x0);
      ctx.fillStyle = th.accent; ctx.fillRect(x0, y - 3, x1 - x0, 6);
      axisX(ctx, th, x0, x1, y + 12, len);
      ctx.font = font(th, 10, true); ctx.textAlign = 'left';
      const rows = []; const maxRows = Math.max(1, Math.floor((y - 12) / 15));
      for (const m of marks) {
        const label = m.name + ' ' + fmt(m.cut), tw = ctx.measureText(label).width + 8, x = X(m.cut);
        let r = 0; while (r < maxRows - 1 && rows[r] !== undefined && rows[r] > x - 2) r++;
        rows[r] = x + tw;
        const ly = y - 12 - r * 15;
        ctx.strokeStyle = m.n === 1 ? th.text2 : th.muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y - 3); ctx.lineTo(x, ly + 6); ctx.stroke();
        ctx.fillStyle = m.n === 1 ? th.text : th.text2; ctx.fillText(label, x + 3, ly);
      }
    } else {
      const cx = W / 2, cy = H / 2, R = Math.min(W / 2 - 130, H / 2 - 34);
      ctx.strokeStyle = th.accent; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke();
      ctx.font = font(th, 12, true); ctx.fillStyle = th.text; ctx.textAlign = 'center'; ctx.fillText(fmt(len) + ' bp', cx, cy);
      const placed = []; let lastA = -9;
      for (const m of marks) {
        let a = (m.cut / len) * 2 * Math.PI - Math.PI / 2; if (a - lastA < 0.11) a = lastA + 0.11; lastA = a;
        const ax = Math.cos(a), ay = Math.sin(a);
        ctx.strokeStyle = th.text2; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx + ax * (R - 6), cy + ay * (R - 6)); ctx.lineTo(cx + ax * (R + 14), cy + ay * (R + 14)); ctx.stroke();
        ctx.font = font(th, 10, true); ctx.fillStyle = th.text; ctx.textAlign = ax >= 0 ? 'left' : 'right';
        ctx.fillText(m.name + ' ' + fmt(m.cut), cx + ax * (R + 18), cy + ay * (R + 18)); placed.push(a);
      }
    }
  };

  /** Bar chart of per-codon degeneracy. */
  BW.drawBars = (ctx, W, H, vals, th, o = {}) => {
    const ml = 36, mr = 10, mt = 10, mb = 22, w = W - ml - mr, h = H - mt - mb, max = Math.max(4, ...vals);
    ctx.fillStyle = th.panel; ctx.fillRect(0, 0, W, H);
    ctx.font = font(th, 9); ctx.fillStyle = th.muted; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (const v of [1, 4, 16, 64].filter((x) => x <= max * 1.01 || x === 1)) { const y = mt + h - (Math.log2(v) / Math.log2(Math.max(max, 4))) * h; ctx.strokeStyle = th.line; ctx.beginPath(); ctx.moveTo(ml, y); ctx.lineTo(ml + w, y); ctx.stroke(); ctx.fillText(v + '×', ml - 5, y); }
    const bw = w / Math.max(1, vals.length);
    vals.forEach((v, i) => { const bh = Math.max(1, (Math.log2(v) / Math.log2(Math.max(max, 4))) * h); ctx.fillStyle = v >= 4 ? th.warn : v > 1 ? th.accent : th.ok; ctx.globalAlpha = 0.85; ctx.fillRect(ml + i * bw, mt + h - bh, Math.max(1, bw - 0.6), bh); ctx.globalAlpha = 1; });
    ctx.fillStyle = th.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillText('codon position (degeneracy per codon, log scale)', ml + w / 2, H - 4);
  };
})();
