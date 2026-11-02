/* QualityScale charts: every figure is rendered to an SVG string (or an HTML table) so that the screen,
   PNG, SVG and report exports are identical. */
(function () {
  'use strict';
  const QS = globalThis.QS, esc = QS.esc, NQ = 94, f1 = QS.f, num = QS.num;
  const FONT = "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,system-ui,sans-serif", MONO = 'ui-monospace,Menlo,monospace';

  QS.palette = (dark) => dark
    ? { dark: true, bg: '#171c25', text: '#e6e9ef', text2: '#b4bccb', muted: '#8b94a5', line: '#2a313e', line2: '#394253', panel: '#171c25', panel2: '#1d232e', accent: '#5b9bff', accentSoft: '#1d2a42', ok: '#4ade80', warn: '#fbbf24', bad: '#ff6b81', neutral: '#232a37', A: '#4ade80', C: '#5b9bff', G: '#fbbf24', T: '#ff6b81', N: '#8b94a5', series: ['#5b9bff', '#ff6b81', '#4ade80', '#fbbf24', '#b79bff', '#38d6e8', '#f472b6', '#a3e635'] }
    : { dark: false, bg: '#ffffff', text: '#1c2230', text2: '#4a5367', muted: '#667085', line: '#e3e6ec', line2: '#c8cdd8', panel: '#ffffff', panel2: '#f6f7f9', accent: '#2563eb', accentSoft: '#e3ecff', ok: '#16a34a', warn: '#f59e0b', bad: '#e5484d', neutral: '#f1f3f7', A: '#22a559', C: '#2563eb', G: '#f59e0b', T: '#e5484d', N: '#8b94a5', series: ['#2563eb', '#e5484d', '#16a34a', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#65a30d'] };

  /* ---------- colour helpers ---------- */
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mixc = (a, b, t) => 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',') + ')';
  const ramp = (stops, t) => { t = Math.max(0, Math.min(1, t)); const k = t * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(k)); return mixc(stops[i], stops[i + 1], k - i); };
  const SEQ_L = ['#f1f5fd', '#a9c8fb', '#3b82f6', '#1d4ed8', '#1e1b6b'].map(hex), SEQ_D = ['#1a2130', '#1e3a8a', '#2f6fe0', '#7cc4ff', '#ffffff'].map(hex);
  const QRAMP = ['#e5484d', '#f59e0b', '#facc15', '#22a559'].map(hex);
  const seqc = (t, P) => ramp(P.dark ? SEQ_D : SEQ_L, t);
  const divc = (t, P) => { t = Math.max(-1, Math.min(1, t)); return t < 0 ? mixc(hex(P.neutral), hex(P.bad), -t) : mixc(hex(P.neutral), hex(P.C), t); };
  QS.qcolor = (t) => ramp(QRAMP, t);
  QS.seqc = seqc;

  function nice(min, max, count) {
    const span = max - min || 1, raw = span / Math.max(1, count), mag = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / mag;
    const step = (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * mag, t = [];
    for (let v = Math.ceil(min / step - 1e-9) * step; v <= max + step * 1e-9; v += step) t.push(+v.toFixed(10));
    return t;
  }
  const T = (x, y, s, P, o) => { o = o || {}; return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${o.size || 11}" fill="${o.fill || P.muted}" text-anchor="${o.anchor || 'middle'}" font-family="${o.mono ? MONO : FONT}"${o.weight ? ` font-weight="${o.weight}"` : ''}${o.rot ? ` transform="rotate(${o.rot} ${x.toFixed(1)} ${y.toFixed(1)})"` : ''}>${esc(s)}</text>`; };
  const R = (x, y, w, h, fill, extra) => `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(0, w).toFixed(1)}" height="${Math.max(0, h).toFixed(1)}" fill="${fill}"${extra || ''}/>`;
  const Ln = (x1, y1, x2, y2, stroke, w, extra) => `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${stroke}" stroke-width="${w || 1}"${extra || ''}/>`;
  const pts = (a) => a.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const tipOf = (...a) => (QS.noTips ? '' : ` data-tip="${esc(a.join('|'))}"`);

  function frame(w, h, P, m) {
    m = Object.assign({ l: 50, r: 16, t: 14, b: 40 }, m || {});
    const f = { w, h, P, m, iw: w - m.l - m.r, ih: h - m.t - m.b, p: [], x0: 0, x1: 1, y0: 0, y1: 1 };
    f.dom = (x0, x1, y0, y1) => { f.x0 = x0; f.x1 = x1; f.y0 = y0; f.y1 = y1; return f; };
    f.X = (v) => m.l + ((v - f.x0) / (f.x1 - f.x0 || 1)) * f.iw;
    f.Y = (v) => m.t + f.ih - ((v - f.y0) / (f.y1 - f.y0 || 1)) * f.ih;
    f.add = (s) => { f.p.push(s); return f; };
    f.grid = (ticks, fmt) => { ticks.forEach((v) => { const y = f.Y(v); f.p.push(Ln(m.l, y, m.l + f.iw, y, P.line, 1)); f.p.push(T(m.l - 7, y + 3.5, fmt ? fmt(v) : v, P, { anchor: 'end' })); }); return f; };
    f.xticks = (ticks, fmt) => { ticks.forEach((v) => { const x = f.X(v); f.p.push(Ln(x, m.t + f.ih, x, m.t + f.ih + 4, P.line2, 1)); f.p.push(T(x, m.t + f.ih + 17, fmt ? fmt(v) : v, P)); }); return f; };
    f.gticks = (G) => { const step = Math.max(1, Math.ceil(G.length / Math.max(2, f.iw / 46))); G.forEach((g, i) => { if (i % step) return; const x = f.X(i + 0.5); f.p.push(Ln(x, m.t + f.ih, x, m.t + f.ih + 4, P.line2, 1)); f.p.push(T(x, m.t + f.ih + 17, g.label, P, { size: 10.5 })); }); return f; };
    f.frame = () => { f.p.push(Ln(m.l, m.t + f.ih, m.l + f.iw, m.t + f.ih, P.line2, 1)); return f; };
    f.titles = (xt, yt) => { if (xt) f.p.push(T(m.l + f.iw / 2, h - 6, xt, P, { size: 11.5, fill: P.text2 })); if (yt) f.p.push(T(13, m.t + f.ih / 2, yt, P, { size: 11.5, fill: P.text2, rot: -90 })); return f; };
    f.inner = () => f.p.join('');
    f.out = (attrs) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" class="ch" data-w="${w}" data-h="${h}"${attrs || ''}>${f.p.join('')}</svg>`;
    return f;
  }
  function cbar(f, fn, lo, hi, label, fmt) {
    const P = f.P, x = f.m.l + f.iw + 12, y = f.m.t, hh = f.ih, n = 24;
    for (let i = 0; i < n; i++) f.add(R(x, y + (hh * i) / n, 9, hh / n + 0.6, fn(1 - i / (n - 1))));
    f.add(T(x + 14, y + 8, fmt ? fmt(hi) : hi, P, { size: 10, anchor: 'start' })); f.add(T(x + 14, y + hh, fmt ? fmt(lo) : lo, P, { size: 10, anchor: 'start' }));
    if (label) f.add(T(x + 4, y - 4, label, P, { size: 10, anchor: 'start' }));
  }
  function legend(f, items, x, y) {
    let cx = x; items.forEach(([c, s, dash]) => { f.add(`<rect x="${cx}" y="${y - 8}" width="14" height="${dash === 'box' ? 9 : 3}" ${dash === 'box' ? '' : `transform="translate(0,3)"`} rx="1.5" fill="${c}"/>`); f.add(T(cx + 19, y, s, f.P, { anchor: 'start', size: 11, fill: f.P.text2 })); cx += 30 + s.length * 6; });
  }
  function posX(f, G, pos0) {
    if (pos0 >= G[G.length - 1].e + 1) return f.X(G.length);
    let gi = 0; for (let i = 0; i < G.length; i++) if (pos0 >= G[i].s) gi = i;
    return f.X(gi + (pos0 - G[gi].s) / (G[gi].e - G[gi].s + 1));
  }
  /* shaded trim regions and draggable handles for charts whose x axis is the read position */
  function trimOv(f, o, G, L) {
    const t = o.trim; if (!t || !t.show) return;
    const P = f.P, x5 = posX(f, G, t.t5), xk = posX(f, G, Math.min(L, t.keep)), top = f.m.t, bot = f.m.t + f.ih;
    if (t.t5 > 0) f.add(R(f.m.l, top, x5 - f.m.l, f.ih, P.bad, ' opacity=".13"'));
    if (t.keep < L) f.add(R(xk, top, f.m.l + f.iw - xk, f.ih, P.bad, ' opacity=".13"'));
    [[x5, 't5', '5′ trim ' + t.t5, 'start'], [xk, 'keep', 'keep to ' + t.keep, 'end']].forEach(([x, k, lab, an]) => {
      f.add(`<g class="th" data-h="${k}" style="cursor:ew-resize">` + Ln(x, top, x, bot, P.accent, 1.6, ' stroke-dasharray="5 3"') + `<rect x="${(x - 7).toFixed(1)}" y="${top}" width="14" height="${f.ih}" fill="transparent"/><circle cx="${x.toFixed(1)}" cy="${(top + f.ih / 2).toFixed(1)}" r="6" fill="${P.accent}" stroke="${P.bg}" stroke-width="2"/>` + T(x + (k === 't5' ? 10 : -10), bot - 8, lab, P, { size: 10.5, fill: P.accent, anchor: k === 't5' ? 'start' : 'end', weight: 600 }) + '</g>');
    });
  }
  const gAttr = (f, G, L) => ` data-pos="1" data-ml="${f.m.l}" data-iw="${f.iw}" data-gs='${JSON.stringify(G.map((g) => g.s).concat([G[G.length - 1].e + 1]))}' data-L="${L}"`;
  const dim = (o, w, h) => [o.w || w, o.h || h];
  const opt = (o, k, dflt) => (o.opts && o.opts[k] !== undefined ? o.opts[k] : dflt);
  const hitCols = (f, n, tip) => { for (let i = 0; i < n; i++) f.add(`<rect class="hit" x="${f.X(i).toFixed(1)}" y="${f.m.t}" width="${(f.iw / n).toFixed(2)}" height="${f.ih}" fill="transparent"${tip(i)}/>`); };
  const empty = (o, msg) => { const [w, h] = dim(o, 640, 300); const f = frame(w, h, o.P); f.add(T(w / 2, h / 2, msg, o.P, { size: 13 })); return f.out(); };

  const C = (QS.charts = {});

  C.pbq = (res, o) => {
    if (!res.hasQual) return empty(o, 'No quality scores in this file');
    const P = o.P, d = QS.derive(res), G = d.groups, n = G.length, [w, h] = dim(o, 720, 360), mode = opt(o, 'mode', 'box');
    const f = frame(w, h, P, { l: 50, b: 42 }), ymax = mode === 'q30' ? 100 : Math.max(30, Math.ceil((d.qMax + 1) / 5) * 5);
    f.dom(0, n, 0, ymax);
    if (mode !== 'q30') [[0, 20, P.bad], [20, 28, P.warn], [28, ymax, P.ok]].forEach(([a, b, c]) => f.add(R(f.m.l, f.Y(b), f.iw, f.Y(a) - f.Y(b), c, ' opacity=".09"')));
    f.grid(nice(0, ymax, 6)).frame();
    const gw = f.iw / n, bw = Math.max(1, gw * 0.72);
    if (mode === 'box') {
      d.pbq.forEach((s, i) => {
        const xc = f.X(i + 0.5);
        f.add(Ln(xc, f.Y(s.p90), xc, f.Y(s.p10), P.text2, 1, ' opacity=".7"'));
        f.add(R(xc - bw / 2, f.Y(s.uq), bw, Math.max(1, f.Y(s.lq) - f.Y(s.uq)), P.accent, ` fill-opacity=".25" stroke="${P.accent}" stroke-width="1"`));
        f.add(Ln(xc - bw / 2, f.Y(s.med), xc + bw / 2, f.Y(s.med), P.text, 2));
      });
      f.add(`<polyline points="${pts(d.pbq.map((s, i) => [f.X(i + 0.5), f.Y(s.mean)]))}" fill="none" stroke="${P.warn}" stroke-width="1.6" stroke-linejoin="round"/>`);
      legend(f, [[P.accent, 'IQR', 'box'], [P.text, 'Median'], [P.warn, 'Mean']], f.m.l + 8, f.m.t + 14);
    } else if (mode === 'line') {
      const up = d.pbq.map((s, i) => [f.X(i + 0.5), f.Y(s.p90)]), lo = d.pbq.map((s, i) => [f.X(i + 0.5), f.Y(s.p10)]).reverse();
      const iu = d.pbq.map((s, i) => [f.X(i + 0.5), f.Y(s.uq)]), il = d.pbq.map((s, i) => [f.X(i + 0.5), f.Y(s.lq)]).reverse();
      f.add(`<polygon points="${pts(up.concat(lo))}" fill="${P.accent}" opacity=".12"/><polygon points="${pts(iu.concat(il))}" fill="${P.accent}" opacity=".22"/>`);
      f.add(`<polyline points="${pts(d.pbq.map((s, i) => [f.X(i + 0.5), f.Y(s.med)]))}" fill="none" stroke="${P.text}" stroke-width="1.8"/><polyline points="${pts(d.pbq.map((s, i) => [f.X(i + 0.5), f.Y(s.mean)]))}" fill="none" stroke="${P.warn}" stroke-width="1.8"/>`);
      legend(f, [[P.accent, '10–90%', 'box'], [P.text, 'Median'], [P.warn, 'Mean']], f.m.l + 8, f.m.t + 14);
    } else {
      [[d.q20Pos, P.accent, '≥ Q20'], [d.q30Pos, P.ok, '≥ Q30']].forEach(([arr, c]) => {
        const line = arr.map((v, i) => [f.X(i + 0.5), f.Y(v)]);
        f.add(`<polygon points="${pts([[f.X(0.5), f.Y(0)]].concat(line, [[f.X(n - 0.5), f.Y(0)]]))}" fill="${c}" opacity=".12"/><polyline points="${pts(line)}" fill="none" stroke="${c}" stroke-width="2"/>`);
      });
      legend(f, [[P.accent, 'Bases ≥ Q20'], [P.ok, 'Bases ≥ Q30']], f.m.l + 8, f.m.t + 14);
    }
    hitCols(f, n, (i) => { const s = d.pbq[i]; return tipOf('Position ' + G[i].label, 'Mean Q' + f1(s.mean), 'Median Q' + s.med, 'Q1–Q3: Q' + s.lq + '–Q' + s.uq, 'P10–P90: Q' + s.p10 + '–Q' + s.p90, '≥Q30: ' + f1(d.q30Pos[i]) + '%', num(s.n) + ' bases'); });
    trimOv(f, o, G, res.L);
    f.gticks(G).titles('Position in read (bp)', mode === 'q30' ? '% of bases' : 'Phred quality score');
    return f.out(gAttr(f, G, res.L));
  };

  C.pqh = (res, o) => {
    if (!res.hasQual) return empty(o, 'No quality scores in this file');
    const P = o.P, d = QS.derive(res), G = d.groups, n = G.length, [w, h] = dim(o, 720, 360), f = frame(w, h, P, { l: 50, r: 58, b: 42 });
    const ymax = Math.max(30, Math.ceil((d.qMax + 1) / 5) * 5); f.dom(0, n, 0, ymax + 1);
    const mats = G.map((g) => { const hh = new Float64Array(ymax + 2); let t = 0; for (let p = g.s; p <= g.e; p++) for (let i = 0; i < NQ; i++) { const c = res.q[p * NQ + i]; if (c) { hh[Math.min(ymax + 1, d.qv(i))] += c; t += c; } } for (let q = 0; q < hh.length; q++) hh[q] = t ? hh[q] / t : 0; return hh; });
    let mx = 0; mats.forEach((r) => r.forEach((v) => { if (v > mx) mx = v; })); mx = Math.max(mx * 0.85, 1e-6);
    const cw = f.iw / n, ch = f.ih / (ymax + 1);
    mats.forEach((r, i) => { for (let q = 0; q <= ymax; q++) if (r[q] > 0) f.add(`<rect x="${(f.X(i)).toFixed(1)}" y="${(f.Y(q + 1)).toFixed(1)}" width="${(cw + 0.5).toFixed(1)}" height="${(ch + 0.5).toFixed(1)}" fill="${seqc(Math.pow(Math.min(1, r[q] / mx), 0.55), P)}"${tipOf('Position ' + G[i].label, 'Q' + q, f1(r[q] * 100, 2) + '% of bases')}/>`); });
    f.add(`<polyline points="${pts(d.pbq.map((s, i) => [f.X(i + 0.5), f.Y(s.med + 0.5)]))}" fill="none" stroke="${P.warn}" stroke-width="1.8"/>`);
    legend(f, [[P.warn, 'Median']], f.m.l + 8, f.m.t + 14);
    cbar(f, (t) => seqc(Math.pow(t, 0.55), P), 0, mx * 100, '% bases', (v) => f1(v, 0));
    f.grid(nice(0, ymax, 6)).frame(); trimOv(f, o, G, res.L); f.gticks(G).titles('Position in read (bp)', 'Phred quality score');
    return f.out(gAttr(f, G, res.L));
  };

  C.tile = (res, o) => {
    const P = o.P, d = QS.derive(res), mode = opt(o, 'mode', 'tile'), [w, h] = dim(o, 720, 360);
    if (!res.hasQual) return empty(o, 'No quality scores in this file');
    if (mode === 'flow') {
      if (!res.sp) return empty(o, 'Cluster coordinates not found in the read headers');
      const sp = res.sp, n = sp.x.length, hasT = sp.t && sp.t.length === n, f = frame(w, h, P, { l: 46, r: 62, t: 30, b: 14 });
      const xs = Array.from(sp.x).sort((a, b) => a - b), ys = Array.from(sp.y).sort((a, b) => a - b);
      const x1 = xs[Math.floor(n * 0.999)] || 1, y1 = ys[Math.floor(n * 0.999)] || 1, x0 = xs[0], y0 = ys[0];
      let gs = 0; for (let i = 0; i < n; i++) gs += d.qv(sp.q[i]); gs /= n;
      const lo = Math.max(0, gs - 14), hi = Math.min(40, gs + 4), qc = (v) => QS.qcolor((v - lo) / (hi - lo));
      if (!hasT) return empty(o, 'Tile numbers are needed for the flow-cell layout');
      const ids = [...new Set(sp.t)].sort((a, b) => a - b), cols = [...new Set(ids.map((t) => Math.floor(t / 100)))].sort((a, b) => a - b), rowsK = [...new Set(ids.map((t) => t % 100))].sort((a, b) => a - b);
      const ci = new Map(cols.map((c, i) => [c, i])), ri = new Map(rowsK.map((r, i) => [r, i])), pw = f.iw / cols.length, ph = f.ih / rowsK.length;
      const perTile = n / ids.length, B = Math.max(2, Math.min(8, Math.round(Math.sqrt(perTile / 10)))), cells = new Map();
      for (let i = 0; i < n; i++) {
        const t = sp.t[i], bx = Math.min(B - 1, Math.max(0, Math.floor(((sp.x[i] - x0) / (x1 - x0 + 1)) * B))), by = Math.min(B - 1, Math.max(0, Math.floor(((sp.y[i] - y0) / (y1 - y0 + 1)) * B))), k = t * 100 + by * B + bx;
        let c = cells.get(k); if (!c) { c = [0, 0]; cells.set(k, c); } c[0] += d.qv(sp.q[i]); c[1]++;
      }
      cols.forEach((c, j) => f.add(T(f.m.l + (j + 0.5) * pw, f.m.t - 10, 'Swath ' + c, P, { size: 10.5 })));
      rowsK.forEach((r, i) => { if (rowsK.length <= 30 || i % 2 === 0) f.add(T(f.m.l - 6, f.m.t + (i + 0.5) * ph + 3.5, 'Tile ' + r, P, { anchor: 'end', size: 10 })); });
      ids.forEach((t) => {
        const px = f.m.l + ci.get(Math.floor(t / 100)) * pw + 1.5, py = f.m.t + ri.get(t % 100) * ph + 1.5, tw = pw - 3, th = ph - 3;
        f.add(R(px, py, tw, th, P.neutral));
        for (let by = 0; by < B; by++) for (let bx = 0; bx < B; bx++) {
          const c = cells.get(t * 100 + by * B + bx); if (!c || c[1] < 2) continue; const m = c[0] / c[1];
          f.add(`<rect x="${(px + (bx * tw) / B).toFixed(1)}" y="${(py + (by * th) / B).toFixed(1)}" width="${(tw / B + 0.3).toFixed(1)}" height="${(th / B + 0.3).toFixed(1)}" fill="${qc(m)}"${tipOf('Tile ' + t, 'x ' + num(x0 + (bx * (x1 - x0)) / B) + '–' + num(x0 + ((bx + 1) * (x1 - x0)) / B) + ', y ' + num(y0 + (by * (y1 - y0)) / B) + '–' + num(y0 + ((by + 1) * (y1 - y0)) / B), 'Mean Q' + f1(m), c[1] + ' sampled reads')}/>`);
        }
        f.add(`<rect x="${px.toFixed(1)}" y="${py.toFixed(1)}" width="${tw.toFixed(1)}" height="${th.toFixed(1)}" fill="none" stroke="${P.line2}" stroke-width=".6"/>`);
      });
      cbar(f, (t) => QS.qcolor(t), lo, hi, 'mean Q', (v) => 'Q' + f1(v, 0));
      return f.out();
    }
    if (!d.tile) return empty(o, 'No tile information in the read headers');
    const t = d.tile, G = t.groups, nt = t.rank.length, ng = G.length, f = frame(w, h, P, { l: 56, r: 62, b: 42 }), rng = Math.max(5, t.worst);
    f.dom(0, ng, 0, nt);
    const cw = f.iw / ng, ch = f.ih / nt;
    for (let i = 0; i < nt; i++) for (let j = 0; j < ng; j++) { const v = t.delta[i][j]; if (!Number.isFinite(v)) continue; f.add(`<rect x="${(f.m.l + j * cw).toFixed(1)}" y="${(f.m.t + i * ch).toFixed(1)}" width="${(cw + 0.4).toFixed(1)}" height="${(ch + 0.4).toFixed(1)}" fill="${divc(v / rng, P)}"${tipOf('Tile ' + t.rank[i].id + ' · position ' + G[j].label, 'Δ ' + f1(v, 1) + ' Q vs average', 'Mean Q' + f1(t.mat[i][j] + (res.enc.offset === 33 ? 0 : 33 - res.enc.offset), 1))}/>`); }
    const step = Math.max(1, Math.ceil(nt / (f.ih / 13))); t.rank.forEach((r, i) => { if (i % step === 0) f.add(T(f.m.l - 6, f.m.t + (i + 0.5) * ch + 3.5, r.id, P, { anchor: 'end', size: 10 })); });
    f.add(`<rect x="${f.m.l}" y="${f.m.t}" width="${f.iw}" height="${f.ih}" fill="none" stroke="${P.line2}"/>`);
    const step2 = Math.max(1, Math.ceil(ng / Math.max(2, f.iw / 46))); G.forEach((g, j) => { if (j % step2 === 0) f.add(T(f.m.l + (j + 0.5) * cw, f.m.t + f.ih + 16, g.label, P, { size: 10.5 })); });
    cbar(f, (u) => divc(u * 2 - 1, P), -rng, rng, 'Δ Q', (v) => f1(v, 0));
    f.titles('Position in read (bp)', 'Tile');
    return f.out();
  };

  C.psq = (res, o) => {
    if (!res.hasQual) return empty(o, 'No quality scores in this file');
    const P = o.P, d = QS.derive(res), [w, h] = dim(o, 720, 340), f = frame(w, h, P, { l: 58, r: 52, b: 42 }), xmax = Math.max(30, Math.ceil((d.qMax + 1) / 5) * 5);
    let mx = 1; for (let i = 0; i <= xmax; i++) mx = Math.max(mx, d.psq[i]);
    f.dom(0, xmax + 1, 0, mx * 1.08); const tot = res.n;
    f.grid(nice(0, mx * 1.05, 5), (v) => QS.si(v)).frame();
    let cum = 0; const cumPts = [];
    const tail = new Array(xmax + 2).fill(0); for (let i = xmax + 1; i >= 0; i--) tail[i] = (tail[i + 1] || 0) + (d.psq[i] || 0);
    for (let i = 0; i <= xmax; i++) {
      const c = d.psq[i]; if (c > 0) f.add(R(f.X(i) + 1, f.Y(c), f.iw / (xmax + 1) - 2, f.Y(0) - f.Y(c), i < 20 ? P.bad : i < 30 ? P.warn : P.ok, ` opacity=".85"${tipOf('Mean read quality Q' + i, num(c) + ' reads (' + f1((c * 100) / tot, 2) + '%)', f1((tail[i] * 100) / tot, 1) + '% of reads ≥ Q' + i)}`));
      cum += c; cumPts.push([f.X(i + 0.5), f.m.t + f.ih - (f.ih * (tail[i] * 100) / tot) / 100]);
    }
    f.add(`<polyline points="${pts(cumPts)}" fill="none" stroke="${P.text2}" stroke-width="1.6" stroke-dasharray="4 3"/>`);
    [20, 30].forEach((q) => { const x = f.X(q); f.add(Ln(x, f.m.t, x, f.m.t + f.ih, P.text2, 1, ' stroke-dasharray="2 3"') + T(x + 3, f.m.t + 11, f1((tail[q] * 100) / tot, 1) + '% ≥ Q' + q, P, { anchor: 'start', size: 10.5, fill: P.text2 })); });
    [0, 25, 50, 75, 100].forEach((v) => f.add(T(f.m.l + f.iw + 7, f.m.t + f.ih - (f.ih * v) / 100 + 3.5, v + '%', P, { anchor: 'start', size: 10 })));
    f.xticks(nice(0, xmax, 8)).titles('Mean quality of read (Phred)', 'Reads');
    legend(f, [[P.text2, 'Cumulative % of reads ≥ Q']], f.m.l + f.iw - 190, f.m.t + 14);
    return f.out();
  };

  C.qgc = (res, o) => {
    if (!res.hasQual) return empty(o, 'No quality scores in this file');
    const P = o.P, d = QS.derive(res), [w, h] = dim(o, 720, 360), f = frame(w, h, P, { l: 50, r: 62, b: 42 }), ymax = Math.max(30, Math.ceil((d.qMax + 1) / 5) * 5), BX = 50;
    const mat = new Float64Array(BX * (ymax + 1)); let mx = 0;
    for (let g = 0; g < 101; g++) for (let i = 0; i < NQ; i++) { const c = res.qgc[g * NQ + i]; if (!c) continue; const q = Math.min(ymax, d.qv(i)), bx = Math.min(BX - 1, Math.floor((g * BX) / 101)); mat[q * BX + bx] += c; }
    mat.forEach((v) => { if (v > mx) mx = v; });
    f.dom(0, 100, 0, ymax + 1); const cw = f.iw / BX, ch = f.ih / (ymax + 1);
    for (let q = 0; q <= ymax; q++) for (let b = 0; b < BX; b++) { const v = mat[q * BX + b]; if (!v) continue; f.add(`<rect x="${(f.m.l + b * cw).toFixed(1)}" y="${f.Y(q + 1).toFixed(1)}" width="${(cw + 0.4).toFixed(1)}" height="${(ch + 0.4).toFixed(1)}" fill="${seqc(Math.pow(Math.log(v + 1) / Math.log(mx + 1), 1.1), P)}"${tipOf('GC ' + Math.round((b * 100) / BX) + '–' + Math.round(((b + 1) * 100) / BX) + '%, Q' + q, num(v) + ' reads')}/>`); }
    cbar(f, (t) => seqc(Math.pow(t, 1.1), P), 1, mx, 'reads', (v) => QS.si(v));
    f.grid(nice(0, ymax, 6)).frame().xticks(nice(0, 100, 10), (v) => v + '%').titles('GC content of read', 'Mean read quality (Phred)');
    return f.out();
  };

  C.pbc = (res, o) => {
    const P = o.P, d = QS.derive(res), G = d.groups, n = G.length, [w, h] = dim(o, 720, 340), mode = opt(o, 'mode', 'lines'), f = frame(w, h, P, { l: 50, b: 42, r: mode === 'bias' ? 62 : 16 });
    const names = ['A', 'C', 'G', 'T', 'N'], col = [P.A, P.C, P.G, P.T, P.N];
    if (mode === 'bias') {
      f.dom(0, n, 0, 4); const rowh = f.ih / 4, cw = f.iw / n;
      for (let k = 0; k < 4; k++) { const mean = d.baseTot[k] / (d.baseTot[0] + d.baseTot[1] + d.baseTot[2] + d.baseTot[3] + d.baseTot[4] || 1) * 100; f.add(T(f.m.l - 8, f.m.t + (k + 0.5) * rowh + 5, names[k], P, { anchor: 'end', size: 13, fill: col[k], weight: 700 }));
        for (let i = 0; i < n; i++) f.add(`<rect x="${(f.m.l + i * cw).toFixed(1)}" y="${(f.m.t + k * rowh).toFixed(1)}" width="${(cw + 0.4).toFixed(1)}" height="${(rowh - 1).toFixed(1)}" fill="${divc((d.base[k][i] - mean) / 15, P)}"${tipOf('Position ' + G[i].label + ' · ' + names[k], f1(d.base[k][i], 1) + '%', (d.base[k][i] - mean >= 0 ? '+' : '') + f1(d.base[k][i] - mean, 1) + ' vs read average')}/>`); }
      cbar(f, (u) => divc(u * 2 - 1, P), -15, 15, 'Δ %', (v) => f1(v, 0)); trimOv(f, o, G, res.L); f.gticks(G).titles('Position in read (bp)');
      return f.out(gAttr(f, G, res.L));
    }
    const zoom = opt(o, 'zoom', false);
    let y0 = 0, y1 = 100;
    if (zoom && mode === 'lines') { let mn = 100, mx = 0; for (let k = 0; k < 4; k++) d.base[k].forEach((v) => { mn = Math.min(mn, v); mx = Math.max(mx, v); }); y0 = Math.max(0, Math.floor(mn / 5) * 5 - 5); y1 = Math.min(100, Math.ceil(mx / 5) * 5 + 5); }
    f.dom(0, n, y0, y1); f.grid(nice(y0, y1, 5), (v) => v + '%').frame();
    if (mode === 'stack') {
      const base = new Array(n).fill(0);
      for (let k = 0; k < 5; k++) { const lo = base.map((b, i) => [f.X(i + 0.5), f.Y(b)]); const hi = base.map((b, i) => [f.X(i + 0.5), f.Y(b + d.base[k][i])]); d.base[k].forEach((v, i) => { base[i] += v; }); f.add(`<polygon points="${pts(hi.concat(lo.reverse()))}" fill="${col[k]}" opacity=".78"/>`); }
    } else {
      [4, 0, 1, 2, 3].forEach((k) => { if (k === 4 && Math.max(...d.base[4]) < 0.01) return; f.add(`<polyline points="${pts(d.base[k].map((v, i) => [f.X(i + 0.5), f.Y(v)]))}" fill="none" stroke="${col[k]}" stroke-width="${k === 4 ? 1.2 : 1.9}"${k === 4 ? ' stroke-dasharray="3 3"' : ''} stroke-linejoin="round"/>`); });
    }
    hitCols(f, n, (i) => tipOf('Position ' + G[i].label, 'A ' + f1(d.base[0][i], 1) + '%', 'C ' + f1(d.base[1][i], 1) + '%', 'G ' + f1(d.base[2][i], 1) + '%', 'T ' + f1(d.base[3][i], 1) + '%', 'N ' + f1(d.base[4][i], 2) + '%'));
    legend(f, names.map((nm, k) => [col[k], nm]).slice(0, 4).concat(mode === 'stack' ? [[col[4], 'N']] : []), f.m.l + f.iw - 190, f.m.t + 14);
    trimOv(f, o, G, res.L); f.gticks(G).titles('Position in read (bp)', '% of bases');
    return f.out(gAttr(f, G, res.L));
  };

  C.gc = (res, o) => {
    const P = o.P, d = QS.derive(res), g = d.gc, [w, h] = dim(o, 720, 340), mode = opt(o, 'mode', 'hist'), f = frame(w, h, P, { l: 58, b: 42 });
    let mx = 1; for (let i = 0; i < 101; i++) mx = Math.max(mx, g.obs[i], g.theo[i]);
    if (mode === 'cum') {
      f.dom(0, 100, 0, 100); f.grid(nice(0, 100, 5), (v) => v + '%').frame();
      let c = 0, ct = 0; const po = [], pt = []; for (let i = 0; i < 101; i++) { c += g.obs[i]; ct += g.theo[i]; po.push([f.X(i), f.Y((c * 100) / g.tot)]); pt.push([f.X(i), f.Y((ct * 100) / g.tot)]); }
      f.add(`<polyline points="${pts(pt)}" fill="none" stroke="${P.warn}" stroke-width="2" stroke-dasharray="5 3"/><polyline points="${pts(po)}" fill="none" stroke="${P.accent}" stroke-width="2.2"/>`);
      legend(f, [[P.accent, 'Observed'], [P.warn, 'Normal fit']], f.m.l + 10, f.m.t + 14);
      f.xticks(nice(0, 100, 10), (v) => v + '%').titles('GC content of read', 'Cumulative % of reads');
      return f.out();
    }
    f.dom(0, 101, 0, mx * 1.08);
    g_ex(f, d, P);
    f.grid(nice(0, mx * 1.05, 5), (v) => QS.si(v)).frame();
    for (let i = 0; i < 101; i++) if (g.obs[i] > 0) f.add(R(f.X(i) + 0.4, f.Y(g.obs[i]), f.iw / 101 - 0.8, f.Y(0) - f.Y(g.obs[i]), P.accent, ` opacity=".7"${tipOf('GC ' + i + '%', num(g.obs[i]) + ' reads (' + f1((g.obs[i] * 100) / g.tot, 2) + '%)', 'Normal fit: ' + num(g.theo[i]))}`));
    const smooth = []; for (let i = 0; i <= 200; i++) { const xv = i / 2, y = g.tot * Math.exp(-((xv - g.mu) * (xv - g.mu)) / (2 * g.sd * g.sd)) / (g.sd * Math.sqrt(2 * Math.PI)); smooth.push([f.X(xv + 0.5), f.Y(Math.min(y, mx * 1.08))]); }
    f.add(`<polyline points="${pts(smooth)}" fill="none" stroke="${P.warn}" stroke-width="2.2"/>`);
    const ref = opt(o, 'ref', -1);
    if (ref >= 0 && QS.GENOME_GC[ref]) { const [nm, v] = QS.GENOME_GC[ref], x = f.X(v + 0.5); f.add(Ln(x, f.m.t, x, f.m.t + f.ih, P.ok, 1.8, ' stroke-dasharray="6 4"') + T(x + 5, f.m.t + 28, nm + ' genome ~' + v + '%', P, { anchor: 'start', size: 10.5, fill: P.ok, weight: 600 })); }
    legend(f, [[P.accent, 'Reads'], [P.warn, 'Normal fit (' + f1(g.mu, 0) + '% ± ' + f1(g.sd, 1) + ')']], f.m.l + 10, f.m.t + 14);
    f.xticks(nice(0, 100, 10), (v) => v + '%').titles('GC content of read', 'Reads');
    return f.out();
  };
  function g_ex(f, d, P) { d.gcExcess.forEach((r) => { const x0 = f.X(r.from), x1 = f.X(r.to + 1); f.add(R(x0, f.m.t, x1 - x0, f.ih, P.bad, ' opacity=".10"') + T((x0 + x1) / 2, f.m.t + f.ih - 8, 'extra ' + f1(r.pct, 0) + '%', P, { size: 10, fill: P.bad })); }); }

  C.nc = (res, o) => {
    const P = o.P, d = QS.derive(res), G = d.groups, n = G.length, [w, h] = dim(o, 720, 300), f = frame(w, h, P, { l: 50, b: 42 });
    const mx = Math.max(1, Math.ceil(Math.max(...d.nPos) * 1.15)), lim = o.lim || QS.defaultLimits();
    f.dom(0, n, 0, mx); f.grid(nice(0, mx, 5), (v) => v + '%').frame();
    [[lim.nc[0], P.warn], [lim.nc[1], P.bad]].forEach(([v, c]) => { if (v <= mx) f.add(Ln(f.m.l, f.Y(v), f.m.l + f.iw, f.Y(v), c, 1.2, ' stroke-dasharray="5 4"')); });
    const line = d.nPos.map((v, i) => [f.X(i + 0.5), f.Y(v)]);
    f.add(`<polygon points="${pts([[f.X(0.5), f.Y(0)]].concat(line, [[f.X(n - 0.5), f.Y(0)]]))}" fill="${P.accent}" opacity=".15"/><polyline points="${pts(line)}" fill="none" stroke="${P.accent}" stroke-width="2"/>`);
    hitCols(f, n, (i) => tipOf('Position ' + G[i].label, 'N content ' + f1(d.nPos[i], 3) + '%'));
    trimOv(f, o, G, res.L); f.gticks(G).titles('Position in read (bp)', '% N');
    return f.out(gAttr(f, G, res.L));
  };

  C.len = (res, o) => {
    const P = o.P, [w, h] = dim(o, 720, 320), mode = opt(o, 'mode', 'hist'), f = frame(w, h, P, { l: 58, b: 42 }), H = res.lenH;
    const lo = H[0][0], hi = H[H.length - 1][0], span = hi - lo + 1, B = span <= 70 ? span : 60, bw = span / B, bins = new Float64Array(B);
    H.forEach(([l, c]) => { bins[Math.min(B - 1, Math.floor((l - lo) / bw))] += c; });
    if (lo === hi) { f.dom(0, 1, 0, 1); f.add(R(f.m.l + f.iw * 0.4, f.m.t + f.ih * 0.1, f.iw * 0.2, f.ih * 0.9, P.accent, ' opacity=".75"')); f.add(T(f.m.l + f.iw / 2, f.m.t + f.ih * 0.1 - 6, num(res.n) + ' reads of ' + lo + ' bp', P, { size: 13, fill: P.text, weight: 600 })); f.add(Ln(f.m.l, f.m.t + f.ih, f.m.l + f.iw, f.m.t + f.ih, P.line2)); f.titles('Sequence length (bp)', 'Reads'); return f.out(); }
    if (mode === 'cum') {
      let c = 0; const po = H.map(([l, k]) => { c += k; return [l, (c * 100) / res.n]; });
      f.dom(lo, hi, 0, 100); f.grid(nice(0, 100, 5), (v) => v + '%').frame();
      f.add(`<polyline points="${pts(po.map(([l, v]) => [f.X(l), f.Y(v)]))}" fill="none" stroke="${P.accent}" stroke-width="2.2"/>`);
      f.xticks(nice(lo, hi, 9)).titles('Sequence length (bp)', 'Cumulative % of reads'); return f.out();
    }
    const log = mode === 'log', val = (v) => (log ? Math.log10(v + 1) : v), mx = Math.max(...bins.map(val));
    f.dom(0, B, 0, mx * 1.08);
    if (log) f.grid([0, 1, 2, 3, 4, 5, 6].filter((e) => e <= mx * 1.05), (e) => QS.si(Math.pow(10, e) - 1)); else f.grid(nice(0, mx * 1.05, 5), (v) => QS.si(v));
    f.frame();
    bins.forEach((c, i) => { if (c > 0) f.add(R(f.X(i) + 0.5, f.Y(val(c)), f.iw / B - 1, f.Y(0) - f.Y(val(c)), P.accent, ` opacity=".78"${tipOf(span <= 70 ? lo + i + ' bp' : Math.round(lo + i * bw) + '–' + Math.round(lo + (i + 1) * bw - 1) + ' bp', num(c) + ' reads (' + f1((c * 100) / res.n, 2) + '%)')}`)); });
    const mean = res.totalBases / res.n, mx0 = f.m.l + ((mean - lo) / span) * f.iw;
    f.add(Ln(mx0, f.m.t, mx0, f.m.t + f.ih, P.warn, 1.6, ' stroke-dasharray="5 3"') + T(mx0 + 5, f.m.t + 12, 'mean ' + f1(mean, 1) + ' bp', P, { anchor: 'start', size: 10.5, fill: P.warn, weight: 600 }));
    const tk = nice(lo, hi, 9); tk.forEach((v) => { const x = f.m.l + ((v - lo) / span) * f.iw; f.add(Ln(x, f.m.t + f.ih, x, f.m.t + f.ih + 4, P.line2) + T(x, f.m.t + f.ih + 17, v, P)); });
    f.titles('Sequence length (bp)', 'Reads');
    return f.out();
  };

  C.dup = (res, o) => {
    const P = o.P, D = res.dup, [w, h] = dim(o, 720, 340), f = frame(w, h, P, { l: 50, b: 46 }), n = D.labels.length;
    f.dom(0, n, 0, 100); f.grid(nice(0, 100, 5), (v) => v + '%').frame();
    D.total.forEach((v, i) => { if (v > 0) f.add(R(f.X(i) + 3, f.Y(v), f.iw / n - 6, f.Y(0) - f.Y(v), P.bad, ` opacity=".5"${tipOf('Duplication level ' + D.labels[i], f1(v, 1) + '% of all reads', f1(D.dedup[i], 1) + '% of distinct sequences')}`)); });
    f.add(`<polyline points="${pts(D.dedup.map((v, i) => [f.X(i + 0.5), f.Y(v)]))}" fill="none" stroke="${P.accent}" stroke-width="2.4" stroke-linejoin="round"/>` + D.dedup.map((v, i) => `<circle cx="${f.X(i + 0.5).toFixed(1)}" cy="${f.Y(v).toFixed(1)}" r="3.2" fill="${P.accent}"/>`).join(''));
    D.labels.forEach((l, i) => f.add(T(f.X(i + 0.5), f.m.t + f.ih + 16, l, P, { size: 10.5 })));
    legend(f, [[P.accent, 'Distinct sequences'], [P.bad, 'All reads', 'box']], f.m.l + f.iw - 290, f.m.t + 14);
    f.add(T(f.m.l + f.iw - 8, f.m.t + 50, f1(D.pctDedup, 1) + '% unique', P, { anchor: 'end', size: 20, fill: P.text, weight: 700 }));
    f.add(T(f.m.l + f.iw - 8, f.m.t + 66, 'remain after de-duplication' + (D.sampled ? ' (estimated)' : ''), P, { anchor: 'end', size: 10.5 }));
    f.titles('Sequence duplication level', '% of reads');
    return f.out();
  };

  C.adp = (res, o) => {
    const P = o.P, d = QS.derive(res), G = d.groups, n = G.length, [w, h] = dim(o, 720, 340), f = frame(w, h, P, { l: 50, b: 42 }), lim = o.lim || QS.defaultLimits();
    const mx = Math.max(10, Math.ceil(Math.max(...d.adMax) * 1.15 / 5) * 5);
    f.dom(0, n, 0, mx); f.grid(nice(0, mx, 5), (v) => v + '%').frame();
    [[lim.adp[0], P.warn], [lim.adp[1], P.bad]].forEach(([v, c]) => { if (v <= mx) f.add(Ln(f.m.l, f.Y(v), f.m.l + f.iw, f.Y(v), c, 1.2, ' stroke-dasharray="5 4"')); });
    const at = (a, g) => d.adCum[a][Math.min(G[g].e, d.adCum[a].length - 1)];
    const act = res.adNames.map((_, a) => a).filter((a) => d.adMax[a] > 0.05);
    act.forEach((a) => { const line = G.map((g, i) => [f.X(i + 0.5), f.Y(at(a, i))]); f.add(`<polygon points="${pts([[f.X(0.5), f.Y(0)]].concat(line, [[f.X(n - 0.5), f.Y(0)]]))}" fill="${P.series[a % 8]}" opacity=".08"/><polyline points="${pts(line)}" fill="none" stroke="${P.series[a % 8]}" stroke-width="2" stroke-linejoin="round"/>`); });
    if (!act.length) f.add(T(f.m.l + f.iw / 2, f.m.t + f.ih / 2, 'No adapter sequences detected', P, { size: 13, fill: P.ok, weight: 600 }));
    hitCols(f, n, (i) => tipOf.apply(null, ['Position ' + G[i].label].concat(act.map((a) => res.adNames[a] + ': ' + f1(at(a, i), 2) + '%'))));
    legend(f, act.slice(0, 4).map((a) => [P.series[a % 8], res.adNames[a] + ' ' + f1(d.adMax[a], 1) + '%']), f.m.l + 10, f.m.t + 14);
    trimOv(f, o, G, res.L); f.gticks(G).titles('Position in read (bp)', '% of reads with adapter');
    return f.out(gAttr(f, G, res.L));
  };

  C.ee = (res, o) => {
    if (!res.hasQual) return empty(o, 'No quality scores in this file');
    const P = o.P, d = QS.derive(res), [w, h] = dim(o, 720, 340), mode = opt(o, 'mode', 'read'), f = frame(w, h, P, { l: 54, b: 42 });
    if (mode === 'along') {
      const L = res.L, mx = Math.max(2, Math.ceil(d.eeCum[L - 1] * 1.1)), step = Math.max(1, Math.floor(L / 700));
      f.dom(0, L, 0, mx); f.grid(nice(0, mx, 5)).frame();
      [1, 2, 5].forEach((v) => { if (v < mx) f.add(Ln(f.m.l, f.Y(v), f.m.l + f.iw, f.Y(v), P.line2, 1, ' stroke-dasharray="4 4"') + T(f.m.l + f.iw - 4, f.Y(v) - 4, v + ' error' + (v > 1 ? 's' : ''), P, { anchor: 'end', size: 10 })); });
      const line = []; for (let p = 0; p < L; p += step) line.push([f.X(p + 1), f.Y(d.eeCum[p])]);
      f.add(`<polygon points="${pts([[f.X(1), f.Y(0)]].concat(line, [[line[line.length - 1][0], f.Y(0)]]))}" fill="${P.bad}" opacity=".12"/><polyline points="${pts(line)}" fill="none" stroke="${P.bad}" stroke-width="2.2"/>`);
      f.add(`<rect class="hit" x="${f.m.l}" y="${f.m.t}" width="${f.iw}" height="${f.ih}" fill="transparent" data-ee="${d.eeCum.length}"/>`);
      f.xticks(nice(0, L, 9)).titles('Position in read (bp)', 'Cumulative expected errors per read');
      return f.out();
    }
    const H = res.eeH, ex = (e) => Math.pow(10, (e - 40) / 20) - 0.01, tot = res.n; let mx = 1; H.forEach((v) => { if (v > mx) mx = v; });
    f.dom(-2, 4, 0, 100); f.grid(nice(0, 100, 5), (v) => v + '%').frame();
    let c = 0; const cum = [];
    for (let e = 0; e < 121; e++) { c += H[e]; const x0 = f.X((e - 40) / 20 - 0.0), x1 = f.X((e + 1 - 40) / 20); if (H[e] > 0) f.add(R(x0, f.Y((H[e] / mx) * 38), x1 - x0, f.Y(0) - f.Y((H[e] / mx) * 38), P.accent, ` opacity=".45"${tipOf('Expected errors ~' + f1(Math.max(0, ex(e)), 2) + '–' + f1(Math.max(0, ex(e + 1)), 2), num(H[e]) + ' reads', f1((c * 100) / tot, 1) + '% of reads at or below')}`)); cum.push([x1, f.Y((c * 100) / tot)]); }
    f.add(`<polyline points="${pts(cum)}" fill="none" stroke="${P.bad}" stroke-width="2.4"/>`);
    [0.5, 1, 2, 5].forEach((v) => { const x = f.X(Math.log10(v + 0.01)), key = v === 0.5 ? 'le05' : v === 1 ? 'le1' : v === 2 ? 'le2' : 'le5'; f.add(Ln(x, f.m.t, x, f.m.t + f.ih, P.text2, 1, ' stroke-dasharray="2 3"') + T(x + 4, f.m.t + 12 + (v === 0.5 ? 0 : v === 1 ? 14 : v === 2 ? 28 : 42), f1((res.ee[key] * 100) / tot, 1) + '% ≤ ' + v, P, { anchor: 'start', size: 10.5, fill: P.text2, weight: 600 })); });
    [0.01, 0.1, 1, 10, 100, 1000].forEach((v) => { const x = f.X(Math.log10(v + 0.01)); f.add(Ln(x, f.m.t + f.ih, x, f.m.t + f.ih + 4, P.line2) + T(x, f.m.t + f.ih + 17, v < 0.1 ? 0 : v, P)); });
    f.titles('Expected errors per read (log scale)', 'Cumulative % of reads');
    return f.out();
  };

  C.cmplx = (res, o) => {
    const P = o.P, [w, h] = dim(o, 720, 320), hw = Math.floor(w / 2), f = frame(hw, h, P, { l: 54, r: 14, b: 42 }), g = frame(w - hw, h, P, { l: 54, r: 14, b: 42 });
    let mx = 1; res.entH.forEach((v) => { if (v > mx) mx = v; });
    f.dom(0, 41, 0, mx * 1.08); f.grid(nice(0, mx * 1.05, 4), (v) => QS.si(v)).frame();
    f.add(R(f.m.l, f.m.t, f.X(20) - f.m.l, f.ih, P.bad, ' opacity=".09"'));
    res.entH.forEach((v, i) => { if (v > 0) f.add(R(f.X(i) + 0.5, f.Y(v), f.iw / 41 - 1, f.Y(0) - f.Y(v), i < 20 ? P.bad : P.accent, ` opacity=".78"${tipOf('Entropy ' + f1(i / 20, 2) + '–' + f1((i + 1) / 20, 2) + ' bits', num(v) + ' reads')}`)); });
    f.xticks([0, 0.5, 1, 1.5, 2].map((v) => v * 20), (v) => v / 20).titles('Shannon entropy (bits)', 'Reads');
    f.add(T(f.m.l + 6, f.m.t + 12, 'Low complexity', P, { anchor: 'start', size: 10.5, fill: P.bad }));
    const H = res.hpH, lg = (v) => Math.log10(v + 1); let my = 1; H.forEach((v) => { if (lg(v) > my) my = lg(v); });
    g.dom(0, 61, 0, my * 1.08); g.grid([0, 1, 2, 3, 4, 5, 6].filter((e) => e <= my * 1.05), (e) => QS.si(Math.pow(10, e) - 1)).frame();
    H.forEach((v, i) => { if (v > 0) g.add(R(g.X(i) + 0.5, g.Y(lg(v)), g.iw / 61 - 1, g.Y(0) - g.Y(lg(v)), i >= 20 ? P.bad : P.accent, ` opacity=".78"${tipOf('Longest single-base run: ' + (i === 60 ? '60+' : i) + ' bp', num(v) + ' reads')}`)); });
    g.xticks([0, 10, 20, 30, 40, 50, 60]).titles('Longest homopolymer run (bp)', 'Reads (log scale)');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" class="ch" data-w="${w}" data-h="${h}">${f.inner()}<g transform="translate(${hw},0)">${g.inner()}</g></svg>`;
  };

  C.idx = (res, o) => {
    if (!res.bc.length) return empty(o, 'No index sequences in the read headers');
    const P = o.P, rows = res.bc.slice(0, 12), tot = res.bcTotal, [w] = dim(o, 720, 0), rh = 26, h = o.h || 40 + rows.length * rh + 30, f = frame(w, h, P, { l: 120, r: 80, t: 16, b: 30 });
    const top = rows[0][0], ham = (a, b) => { if (a.length !== b.length) return 99; let k = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) k++; return k; };
    const mx = rows[0][1]; f.dom(0, mx, 0, 1);
    rows.forEach(([bc, c], i) => {
      const y = f.m.t + i * rh, dd = ham(bc, top), col = i === 0 ? P.accent : dd === 1 ? P.warn : P.N, bw = (c / mx) * f.iw;
      f.add(T(f.m.l - 10, y + 17, bc, P, { anchor: 'end', size: 12, mono: 1, fill: P.text }) + R(f.m.l, y + 4, Math.max(2, bw), rh - 9, col, ` opacity=".85" rx="3"${tipOf(bc, num(c) + ' reads', f1((c * 100) / tot, 2) + '% of indexed reads', i ? 'Distance to top index: ' + dd : 'Dominant index')}`) + T(f.m.l + Math.max(2, bw) + 8, y + 17, f1((c * 100) / tot, 2) + '%', P, { anchor: 'start', size: 11, fill: P.text2 }));
    });
    legend(f, [[P.accent, 'Dominant', 'box'], [P.warn, '1 mismatch', 'box'], [P.N, 'Other', 'box']], f.m.l, h - 8);
    return f.out();
  };

  /* ---------- table style modules (HTML) ---------- */
  const seqHtml = (s) => '<span class="sq">' + s.split('').map((c) => `<i class="b${'ACGT'.includes(c) ? c : 'N'}">${c}</i>`).join('') + '</span>';
  QS.seqHtml = seqHtml;
  C.over = (res, o) => {
    if (!res.over.length) return '<div class="ok-note">No sequence reaches 0.1% of the reads.</div>';
    const mx = res.over[0].pct, lim = o.lim || QS.defaultLimits();
    return '<table class="dt"><thead><tr><th>Sequence</th><th class="r">Count</th><th class="r">Share</th><th>Possible source</th></tr></thead><tbody>' + res.over.slice(0, o.rows || 12).map((s) => `<tr><td class="seqc">${seqHtml(s.seq)}</td><td class="r num">${num(s.count)}</td><td class="r num"><div class="mb"><i style="width:${Math.max(3, (s.pct / mx) * 100)}%;background:${s.pct > lim.over[1] ? 'var(--bad)' : s.pct > lim.over[0] ? 'var(--warn)' : 'var(--accent)'}"></i></div>${QS.f(s.pct, 2)}%</td><td>${s.hit ? esc(s.hit) : '<span class="muted">No hit</span>'}</td></tr>`).join('') + '</tbody></table>';
  };
  C.kmer = (res, o) => {
    if (!res.kmer.length) return '<div class="ok-note">No k-mer is enriched at a specific position.</div>';
    const P = o.P;
    return '<table class="dt"><thead><tr><th>7-mer</th><th class="r">Count</th><th class="r">Max enrichment</th><th class="r">−log10 p</th><th class="r">At position</th><th>Profile along the read</th></tr></thead><tbody>' + res.kmer.slice(0, o.rows || 10).map((k) => {
      const mx = Math.max(...k.prof, 1), W = 150, Hh = 26, p = k.prof.map((v, i) => (i / Math.max(1, k.prof.length - 1) * W).toFixed(1) + ',' + (Hh - 2 - (Math.min(v, mx) / mx) * (Hh - 6)).toFixed(1)).join(' ');
      return `<tr><td class="seqc">${seqHtml(k.seq)}</td><td class="r num">${num(k.count)}</td><td class="r num">${QS.f(k.ratio, 1)}×</td><td class="r num">${QS.f(k.lp, 1)}</td><td class="r num">${k.pos}</td><td><svg viewBox="0 0 ${W} ${Hh}" width="150" height="26"><polyline points="${p}" fill="none" stroke="${P.accent}" stroke-width="1.6"/></svg></td></tr>`;
    }).join('') + '</tbody></table>';
  };
  C.basic = (res, o) => {
    const d = QS.derive(res), rows = [
      ['File name', esc(res.name)], ['File type', res.fmt + (res.gz ? ' (gzip)' : '') + (res.hasQual ? '' : ', no qualities')], ['Quality encoding', res.hasQual ? res.enc.name : '–'],
      ['Reads analysed', num(res.n) + (res.truncated ? ' <span class="chip warn">first ' + QS.si(res.limit) + ' only</span>' : '')], ['Reads flagged as filtered', num(res.flagged)], ['Total bases', QS.si(res.totalBases) + 'bp'],
      ['Read length', res.minLen === res.maxLen ? res.maxLen + ' bp' : res.minLen + '–' + res.maxLen + ' bp (mean ' + QS.f(d.meanLen, 1) + ')'], ['GC content', QS.f(d.gcPct, 1) + '%'],
    ];
    if (res.hasQual) rows.push(['Mean quality', 'Q' + QS.f(d.meanQ, 1)], ['Bases ≥ Q20 / ≥ Q30', QS.f(d.q20, 1) + '% / ' + QS.f(d.q30, 1) + '%'], ['Expected errors per read', QS.f(res.ee.sum / res.n, 2)]);
    if (res.bad) rows.push(['Skipped malformed records', num(res.bad)]);
    return '<table class="dt kvt"><tbody>' + rows.map(([a, b]) => `<tr><td>${a}</td><td class="r">${b}</td></tr>`).join('') + '</tbody></table>';
  };

  QS.CHART_HTML = { over: 1, kmer: 1, basic: 1 };
  QS.renderMod = (id, res, o) => (C[id] ? C[id](res, o) : '');

  /* ---------- CSV per module ---------- */
  QS.csv = {
    pbq: (res) => { const d = QS.derive(res); return 'position,mean,median,q1,q3,p10,p90,pct_q20,pct_q30\n' + d.groups.map((g, i) => [g.label, ...[d.pbq[i].mean, d.pbq[i].med, d.pbq[i].lq, d.pbq[i].uq, d.pbq[i].p10, d.pbq[i].p90, d.q20Pos[i], d.q30Pos[i]].map((v) => +(+v).toFixed(3))].join(',')).join('\n'); },
    psq: (res) => { const d = QS.derive(res); return 'quality,reads\n' + Array.from(d.psq, (v, i) => i + ',' + v).join('\n'); },
    pbc: (res) => { const d = QS.derive(res); return 'position,A,C,G,T,N\n' + d.groups.map((g, i) => [g.label, ...[0, 1, 2, 3, 4].map((k) => d.base[k][i].toFixed(3))].join(',')).join('\n'); },
    gc: (res) => { const d = QS.derive(res); return 'gc_percent,reads,normal_fit\n' + Array.from(res.gch, (v, i) => i + ',' + v + ',' + d.gc.theo[i].toFixed(1)).join('\n'); },
    nc: (res) => { const d = QS.derive(res); return 'position,n_percent\n' + d.groups.map((g, i) => g.label + ',' + d.nPos[i].toFixed(4)).join('\n'); },
    len: (res) => 'length,reads\n' + res.lenH.map((x) => x.join(',')).join('\n'),
    dup: (res) => 'level,pct_of_distinct,pct_of_reads\n' + res.dup.labels.map((l, i) => `"${l}",${res.dup.dedup[i].toFixed(3)},${res.dup.total[i].toFixed(3)}`).join('\n'),
    over: (res) => 'sequence,count,percent,possible_source\n' + res.over.map((s) => `${s.seq},${s.count},${s.pct.toFixed(4)},"${s.hit}"`).join('\n'),
    adp: (res) => { const d = QS.derive(res); return 'position,' + res.adNames.map((n) => `"${n}"`).join(',') + '\n' + d.groups.map((g) => g.label + ',' + d.adCum.map((a) => a[Math.min(g.e, a.length - 1)].toFixed(4)).join(',')).join('\n'); },
    kmer: (res) => 'kmer,count,max_obs_exp,neg_log10_p,position\n' + res.kmer.map((k) => `${k.seq},${k.count},${k.ratio},${k.lp},${k.pos}`).join('\n'),
    tile: (res) => { const d = QS.derive(res); if (!d.tile) return ''; return 'tile,' + d.tile.groups.map((g) => g.label).join(',') + '\n' + d.tile.rank.map((r, i) => r.id + ',' + d.tile.delta[i].map((v) => (Number.isFinite(v) ? v.toFixed(2) : '')).join(',')).join('\n'); },
    ee: (res) => { const d = QS.derive(res); return 'position,cumulative_expected_errors\n' + Array.from(d.eeCum, (v, i) => i + 1 + ',' + v.toFixed(4)).join('\n'); },
    idx: (res) => 'index,reads\n' + res.bc.map((x) => x.join(',')).join('\n'),
    cmplx: (res) => 'entropy_bin_start_bits,reads\n' + Array.from(res.entH, (v, i) => i / 20 + ',' + v).join('\n'),
  };

  /* ---------- exports ---------- */
  QS.svgStandalone = (svg, P, w, h) => svg.replace('<svg ', '<svg width="' + w + '" height="' + h + '" ').replace(/>/, `><rect width="${w}" height="${h}" fill="${P.bg}"/>`);
  QS.svgToPng = (svg, P, scale) => new Promise((ok, no) => {
    const m = svg.match(/viewBox="0 0 (\d+) (\d+)"/), w = +m[1], h = +m[2], s = QS.svgStandalone(svg, P, w, h), img = new Image();
    img.onload = () => { const c = document.createElement('canvas'); c.width = w * scale; c.height = h * scale; const x = c.getContext('2d'); x.scale(scale, scale); x.drawImage(img, 0, 0); c.toBlob((b) => (b ? ok(b) : no(new Error('PNG export failed'))), 'image/png'); };
    img.onerror = () => no(new Error('PNG export failed')); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
  });

  /* ---------- multi-sample comparison charts ---------- */
  QS.perPos = (res) => {
    if (res._pp) return res._pp; const d = QS.derive(res), L = res.L, a = new Float64Array(L);
    if (res.hasQual) for (let p = 0; p < L; p++) { let s = 0, c = 0; for (let i = 0; i < NQ; i++) { const k = res.q[p * NQ + i]; s += k * d.qv(i); c += k; } a[p] = c ? s / c : 0; }
    return (res._pp = a);
  };
  QS.cmpChart = (samples, kind, o) => {
    const P = o.P, [w, h] = dim(o, 720, 320), f = frame(w, h, P, { l: 54, b: 42, r: 16 }); let xmax = 1, ymax = 100, ymin = 0, xt = '', yt = '', series = [], xfmt = null, yfmt = (v) => v;
    if (kind === 'pbq') {
      series = samples.filter((s) => s.res.hasQual).map((s) => ({ s, xs: Array.from(QS.perPos(s.res), (_, i) => i + 1), ys: Array.from(QS.perPos(s.res)) }));
      xmax = Math.max(1, ...series.map((r) => r.xs.length)); ymax = Math.max(30, Math.ceil(Math.max(...series.map((r) => Math.max(...r.ys))) / 5) * 5) + 5; ymin = 0; xt = 'Position in read (bp)'; yt = 'Mean Phred quality';
    } else if (kind === 'gc') {
      series = samples.map((s) => { const g = s.res.gch, t = g.reduce((a, b) => a + b, 0) || 1; return { s, xs: Array.from({ length: 101 }, (_, i) => i), ys: Array.from(g, (v, i) => { let a = 0, c = 0; for (let k = -2; k <= 2; k++) if (g[i + k] !== undefined) { a += g[i + k]; c++; } return (a / c * 100) / t; }) }; });
      xmax = 100; ymax = Math.ceil(Math.max(...series.map((r) => Math.max(...r.ys))) * 1.1); xt = 'GC content of read (%)'; yt = '% of reads';
    } else if (kind === 'len') {
      series = samples.map((s) => { let c = 0; const xs = [], ys = []; s.res.lenH.forEach(([l, k]) => { xs.push(l); c += k; ys.push((c * 100) / s.res.n); }); return { s, xs, ys }; });
      xmax = Math.max(1, ...series.map((r) => r.xs[r.xs.length - 1])); xt = 'Sequence length (bp)'; yt = 'Cumulative % of reads';
    } else if (kind === 'adp') {
      series = samples.map((s) => { const d = QS.derive(s.res), L = s.res.L, ys = new Float64Array(L); for (let p = 0; p < L; p++) { let m = 0; d.adCum.slice(0, 5).forEach((a) => { if (a[p] > m) m = a[p]; }); ys[p] = m; } return { s, xs: Array.from(ys, (_, i) => i + 1), ys: Array.from(ys) }; });
      xmax = Math.max(1, ...series.map((r) => r.xs.length)); ymax = Math.max(10, Math.ceil(Math.max(...series.map((r) => Math.max(...r.ys))) * 1.15 / 5) * 5); xt = 'Position in read (bp)'; yt = '% reads with adapter';
    } else if (kind === 'ee') {
      series = samples.filter((s) => s.res.hasQual).map((s) => { const d = QS.derive(s.res); return { s, xs: Array.from(d.eeCum, (_, i) => i + 1), ys: Array.from(d.eeCum) }; });
      xmax = Math.max(1, ...series.map((r) => r.xs.length)); ymax = Math.max(1, Math.ceil(Math.max(...series.map((r) => Math.max(...r.ys))) * 1.1)); xt = 'Position in read (bp)'; yt = 'Cumulative expected errors';
    }
    if (!series.length) return empty(o, 'Not available for the loaded samples');
    f.dom(0, xmax, ymin, ymax); f.grid(nice(ymin, ymax, 5)).frame().xticks(nice(0, xmax, 9)).titles(xt, yt);
    series.forEach((r) => { const step = Math.max(1, Math.floor(r.xs.length / 600)), pp = []; for (let i = 0; i < r.xs.length; i += step) pp.push([f.X(r.xs[i]), f.Y(r.ys[i])]); f.add(`<polyline points="${pts(pp)}" fill="none" stroke="${r.s.color}" stroke-width="2"${r.s.dim ? ' opacity=".35"' : ''} stroke-linejoin="round"/>`); });
    legend(f, series.slice(0, 6).map((r) => [r.s.color, r.s.name.length > 18 ? r.s.name.slice(0, 17) + '…' : r.s.name]), f.m.l + 10, f.m.t + 14);
    return f.out();
  };
})();
