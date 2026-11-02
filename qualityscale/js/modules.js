/* QualityScale modules: derived statistics, threshold evaluation, insights, trim advice and help texts. */
(function () {
  'use strict';
  const QS = globalThis.QS, NQ = 94;
  const { f: fx, num } = QS;

  QS.MODS = [
    { id: 'basic', short: 'Basics', title: 'Basic statistics', core: false },
    { id: 'pbq', short: 'Base quality', title: 'Per-base sequence quality', core: true, needs: 'qual' },
    { id: 'pqh', short: 'Heatmap', title: 'Quality heatmap', core: false, needs: 'qual' },
    { id: 'tile', short: 'Tiles', title: 'Per-tile sequence quality', core: true, needs: 'tiles' },
    { id: 'psq', short: 'Read quality', title: 'Per-sequence quality scores', core: true, needs: 'qual' },
    { id: 'qgc', short: 'Quality/GC', title: 'Quality versus GC content', core: false, needs: 'qual' },
    { id: 'pbc', short: 'Base content', title: 'Per-base sequence content', core: true },
    { id: 'gc', short: 'GC content', title: 'Per-sequence GC content', core: true },
    { id: 'nc', short: 'N content', title: 'Per-base N content', core: true },
    { id: 'len', short: 'Length', title: 'Sequence length distribution', core: true },
    { id: 'dup', short: 'Duplication', title: 'Sequence duplication levels', core: true },
    { id: 'over', short: 'Overrepresented', title: 'Overrepresented sequences', core: true },
    { id: 'adp', short: 'Adapters', title: 'Adapter content', core: true },
    { id: 'kmer', short: 'K-mers', title: 'K-mer content', core: true },
    { id: 'ee', short: 'Errors', title: 'Expected errors', core: false, needs: 'qual' },
    { id: 'cmplx', short: 'Complexity', title: 'Sequence complexity', core: true },
    { id: 'idx', short: 'Barcodes', title: 'Index / barcode composition', core: false, needs: 'idx' },
  ];
  QS.mod = (id) => QS.MODS.find((m) => m.id === id);

  /* Base groups (individual positions first, wider bins for long reads). */
  QS.groups = function (L) {
    const iv = L <= 75 ? 1 : L <= 200 ? 2 : L <= 300 ? 5 : L <= 1000 ? 10 : 50, out = [];
    let s = 1;
    while (s <= L) {
      let e = s < 10 || iv === 1 ? s : Math.min(L, s + iv - 1);
      out.push({ s: s - 1, e: e - 1, label: e === s ? String(s) : s + '–' + e });
      s = e + 1;
    }
    return out;
  };

  function histStats(h, Q) {
    let n = 0, sum = 0;
    for (let i = 0; i < NQ; i++) { n += h[i]; sum += h[i] * Q(i); }
    const pc = (fr) => { const t = fr * n; let c = 0; for (let i = 0; i < NQ; i++) { c += h[i]; if (c >= t && h[i] > 0) return Q(i); } return Q(NQ - 1); };
    return { n, mean: n ? sum / n : 0, med: pc(0.5), lq: pc(0.25), uq: pc(0.75), p10: pc(0.1), p90: pc(0.9) };
  }
  QS.histStats = histStats;

  QS.derive = function (res) {
    if (res._d) return res._d;
    const d = (res._d = {}), L = res.L, off = res.enc.offset, G = (d.groups = QS.groups(L)), ng = G.length;
    const Q = (d.qv = (i) => Math.max(0, i + 33 - off));
    d.n = res.n; d.meanLen = res.n ? res.totalBases / res.n : 0;
    /* base content */
    const acgt = [[], [], [], [], []]; d.baseTot = [0, 0, 0, 0, 0];
    G.forEach((g) => {
      const c = [0, 0, 0, 0, 0];
      for (let p = g.s; p <= g.e; p++) for (let k = 0; k < 5; k++) c[k] += res.b[p * 5 + k];
      const t = c[0] + c[1] + c[2] + c[3] + c[4] || 1;
      for (let k = 0; k < 5; k++) acgt[k].push((c[k] * 100) / t);
    });
    for (let p = 0; p < L; p++) for (let k = 0; k < 5; k++) d.baseTot[k] += res.b[p * 5 + k];
    d.base = acgt;
    const bt = d.baseTot, bs = bt[0] + bt[1] + bt[2] + bt[3];
    d.gcPct = bs ? ((bt[1] + bt[2]) * 100) / bs : 0;
    d.nPos = acgt[4];
    d.baseDiff = G.map((g, i) => Math.max(Math.abs(acgt[0][i] - acgt[3][i]), Math.abs(acgt[1][i] - acgt[2][i])));
    /* quality */
    if (res.hasQual) {
      d.qTot = new Float64Array(NQ);
      for (let p = 0; p < L; p++) for (let i = 0; i < NQ; i++) d.qTot[i] += res.q[p * NQ + i];
      let tn = 0, ts = 0, q20 = 0, q30 = 0, mx = 0;
      for (let i = 0; i < NQ; i++) { const c = d.qTot[i]; tn += c; ts += c * Q(i); if (Q(i) >= 20) q20 += c; if (Q(i) >= 30) q30 += c; if (c > 0) mx = Math.max(mx, Q(i)); }
      d.meanQ = tn ? ts / tn : 0; d.q20 = tn ? (q20 * 100) / tn : 0; d.q30 = tn ? (q30 * 100) / tn : 0; d.qMax = mx;
      d.pbq = G.map((g) => { const h = new Float64Array(NQ); for (let p = g.s; p <= g.e; p++) for (let i = 0; i < NQ; i++) h[i] += res.q[p * NQ + i]; return histStats(h, Q); });
      const frac = (th) => G.map((g) => { let a = 0, b = 0; for (let p = g.s; p <= g.e; p++) for (let i = 0; i < NQ; i++) { const c = res.q[p * NQ + i]; b += c; if (Q(i) >= th) a += c; } return b ? (a * 100) / b : 0; });
      d.q30Pos = frac(30); d.q20Pos = frac(20);
      /* per-read mean quality histogram on the Q axis */
      const psq = new Float64Array(NQ); for (let i = 0; i < NQ; i++) psq[Q(i)] += res.qh[i];
      d.psq = psq; let m = 0, mm = -1; for (let i = 0; i < NQ; i++) if (psq[i] > mm) { mm = psq[i]; m = i; } d.psqMode = m;
    }
    /* GC distribution and normal fit */
    const obs = res.gch; let tot = 0, mode = 0; for (let i = 0; i < 101; i++) { tot += obs[i]; if (obs[i] > obs[mode]) mode = i; }
    let mu = mode, sd = 6;
    for (let it = 0; it < 4; it++) {
      const w = Math.max(8, 3.5 * sd); let sw = 0, sm = 0, sv = 0;
      for (let i = Math.max(0, Math.round(mu - w)); i <= Math.min(100, Math.round(mu + w)); i++) { sw += obs[i]; sm += obs[i] * i; }
      if (sw) mu = sm / sw;
      for (let i = Math.max(0, Math.round(mu - w)); i <= Math.min(100, Math.round(mu + w)); i++) sv += obs[i] * (i - mu) * (i - mu);
      if (sw) sd = Math.max(1, Math.sqrt(sv / sw));
    }
    const theo = new Float64Array(101), Phi = (z) => 0.5 * QS.erfc(-z / Math.SQRT2);
    const lens = res.lenH.filter((x) => x[0] > 0).sort((a, b) => b[1] - a[1]).slice(0, 40), lt = lens.reduce((a, x) => a + x[1], 0) || 1;
    for (const [l0, c] of lens) {
      const l = Math.min(l0, 5000), w = (c / lt) * tot;
      for (let k = 0; k <= l; k++) {
        const hi = k === l ? 1 : Phi(((k + 0.5) / l * 100 - mu) / sd), lo = k === 0 ? 0 : Phi(((k - 0.5) / l * 100 - mu) / sd);
        theo[Math.round((k * 100) / l)] += w * (hi - lo);
      }
    }
    let dev = 0; for (let i = 0; i < 101; i++) dev += Math.abs(obs[i] - theo[i]);
    d.gc = { obs, theo, mode, mu, sd, dev: tot ? (dev * 100) / tot : 0, tot };
    /* excess regions (possible mixed populations) */
    const ex = []; let run = null;
    for (let i = 0; i < 101; i++) {
      const e = obs[i] - theo[i] - 3 * Math.sqrt(theo[i] + 1);
      if (e > 0) { if (!run) run = { a: i, b: i, sum: 0 }; run.b = i; run.sum += obs[i] - theo[i]; } else if (run) { ex.push(run); run = null; }
    }
    if (run) ex.push(run);
    d.gcExcess = ex.filter((r) => tot && (r.sum * 100) / tot >= 3).map((r) => ({ from: r.a, to: r.b, pct: (r.sum * 100) / tot }));
    /* adapters, cumulative per position */
    const na = res.adNames.length; d.adCum = [];
    for (let a = 0; a < na; a++) { const arr = new Float64Array(L); let c = 0; for (let p = 0; p < L; p++) { c += res.ad[p * na + a]; arr[p] = res.n ? (c * 100) / res.n : 0; } d.adCum.push(arr); }
    d.adMax = d.adCum.map((a) => (a.length ? a[a.length - 1] : 0));
    d.adTop = d.adMax.reduce((b, v, i) => (v > d.adMax[b] ? i : b), 0);
    /* tiles */
    if (res.tiles) {
      const T = res.tiles, tp = T.tp, nt = T.ids.length, gt = QS.groups(tp);
      const mat = [];
      for (let t = 0; t < nt; t++) mat.push(gt.map((g) => { let s = 0, c = 0; for (let p = g.s; p <= g.e; p++) { const k = T.cnt[t * tp + p]; if (k) { s += T.mean[t * tp + p] * k; c += k; } } return c >= 20 ? s / c : NaN; }));
      const col = gt.map((g, gi) => { let s = 0, c = 0; for (let t = 0; t < nt; t++) if (Number.isFinite(mat[t][gi])) { s += mat[t][gi]; c++; } return c ? s / c : 0; });
      const delta = mat.map((r) => r.map((v, gi) => (Number.isFinite(v) ? v - col[gi] : NaN)));
      let worst = 0; delta.forEach((r) => r.forEach((v) => { if (Number.isFinite(v) && -v > worst) worst = -v; }));
      const rank = T.ids.map((id, t) => { let s = 0, c = 0, mn = 0; delta[t].forEach((v) => { if (Number.isFinite(v)) { s += v; c++; if (v < mn) mn = v; } }); return { id, mean: c ? s / c : 0, min: mn }; });
      d.tile = { groups: gt, mat, delta, col, worst, rank };
    }
    /* expected errors along the read */
    if (res.hasQual) {
      const ep = new Float64Array(L); let cum = 0;
      for (let p = 0; p < L; p++) { let s = 0, c = 0; for (let i = 0; i < NQ; i++) { const k = res.q[p * NQ + i]; s += k * Math.pow(10, -Q(i) / 10); c += k; } cum += c ? s / c : 0; ep[p] = cum; }
      d.eeCum = ep;
    }
    /* complexity */
    let lowC = 0, ct = 0; for (let i = 0; i < 41; i++) { ct += res.entH[i]; if (i < 20) lowC += res.entH[i]; }
    d.lowCx = ct ? (lowC * 100) / ct : 0;
    return d;
  };

  const grade = (v, lim, dir) => (dir === 'low' ? (v < lim[1] ? 'fail' : v < lim[0] ? 'warn' : 'pass') : v > lim[1] ? 'fail' : v > lim[0] ? 'warn' : 'pass');
  const worse = (a, b) => { const o = { na: -1, info: 0, pass: 0, warn: 1, fail: 2 }; return o[a] >= o[b] ? a : b; };
  const WEIGHT = { pbq: 3, psq: 2, adp: 2, over: 1.5, gc: 1.5, tile: 1.5, dup: 1, pbc: 1, nc: 1, cmplx: 1, len: 0.5, kmer: 0.5 };

  QS.evaluate = function (res, lim) {
    lim = lim || QS.defaultLimits();
    const d = QS.derive(res), L = res.L, out = {};
    const set = (id, st, val, note) => { out[id] = { st, val, note: note || '' }; };
    set('basic', 'info', num(res.n) + ' reads');
    if (res.hasQual) {
      let lq = 99, md = 99, lqi = 0, mdi = 0;
      d.pbq.forEach((s, i) => { if (s.lq < lq) { lq = s.lq; lqi = i; } if (s.med < md) { md = s.med; mdi = i; } });
      const st = worse(grade(lq, lim.pbq_lower, 'low'), grade(md, lim.pbq_median, 'low'));
      set('pbq', st, 'min median Q' + fx(md, 0), `Lowest median Q${fx(md, 0)} at position ${d.groups[mdi].label}; lowest lower quartile Q${fx(lq, 0)} at ${d.groups[lqi].label}.`);
      set('pqh', 'info', 'Q' + fx(d.meanQ, 1) + ' mean');
      set('psq', grade(d.psqMode, lim.psq, 'low'), 'mode Q' + d.psqMode, `Most reads have a mean quality of Q${d.psqMode}.`);
      set('qgc', 'info', fx(d.q30, 1) + '% ≥ Q30');
      set('ee', 'info', fx((res.ee.le1 * 100) / res.n, 1) + '% ≤ 1 error', `${fx(res.ee.sum / res.n, 2)} expected errors per read on average.`);
    } else ['pbq', 'pqh', 'psq', 'qgc', 'ee'].forEach((k) => set(k, 'na', 'no qualities'));
    if (d.tile) {
      const st = grade(d.tile.worst, lim.tile, 'high'); const w = d.tile.rank.slice().sort((a, b) => a.min - b.min)[0];
      set('tile', st, 'max deficit Q' + fx(d.tile.worst, 1), `Tile ${w.id} falls up to ${fx(-w.min, 1)} quality points below the average.`);
    } else set('tile', 'na', res.hasQual ? 'no tile IDs' : 'no qualities');
    let bi = 0; d.baseDiff.forEach((v, i) => { if (v > d.baseDiff[bi]) bi = i; });
    set('pbc', grade(d.baseDiff[bi], lim.pbc, 'high'), 'max Δ ' + fx(d.baseDiff[bi], 1) + '%', `Largest A/T or G/C imbalance is ${fx(d.baseDiff[bi], 1)} percentage points at position ${d.groups[bi].label}.`);
    set('gc', grade(d.gc.dev, lim.gc, 'high'), fx(d.gc.dev, 1) + '% off normal', `GC peak at ${fx(d.gc.mu, 0)}% (mean ${fx(d.gcPct, 1)}%).` + (d.gcExcess.length ? ` Extra population near ${d.gcExcess.map((r) => (r.from === r.to ? r.from : r.from + '–' + r.to) + '%').join(', ')}.` : ''));
    const nmax = Math.max(0, ...d.nPos); let ni = d.nPos.indexOf(nmax);
    set('nc', grade(nmax, lim.nc, 'high'), 'max ' + fx(nmax, 2) + '%', `Highest N content ${fx(nmax, 2)}% at position ${d.groups[Math.max(0, ni)].label}.`);
    set('len', res.minLen === 0 ? 'fail' : res.minLen !== res.maxLen ? 'warn' : 'pass', res.minLen === res.maxLen ? res.maxLen + ' bp' : res.minLen + '–' + res.maxLen + ' bp', res.minLen === res.maxLen ? 'All reads have the same length.' : `${num(res.lenH.length)} different lengths, mean ${fx(d.meanLen, 1)} bp.`);
    set('dup', grade(res.dup.pctDedup, lim.dup, 'low'), fx(res.dup.pctDedup, 1) + '% unique', `${fx(res.dup.pctDedup, 1)}% of reads would remain after de-duplication.`);
    const omax = res.over.length ? res.over[0].pct : 0;
    set('over', grade(omax, lim.over, 'high'), res.over.length ? 'top ' + fx(omax, 2) + '%' : 'none', res.over.length ? `Most frequent sequence makes up ${fx(omax, 2)}% of reads${res.over[0].hit ? ' (' + res.over[0].hit + ')' : ''}.` : 'No sequence is repeated often enough to stand out.');
    const amax = Math.max(0, ...d.adMax);
    set('adp', grade(amax, lim.adp, 'high'), 'max ' + fx(amax, 1) + '%', amax > 0.05 ? `${res.adNames[d.adTop]} reaches ${fx(d.adMax[d.adTop], 1)}% of reads by the end of the read.` : 'No adapter content detected.');
    const klp = res.kmer.length ? res.kmer[0].lp : 0;
    set('kmer', res.kmer.length ? grade(klp, lim.kmer, 'high') : 'pass', res.kmer.length ? res.kmer.length + ' enriched' : 'none', res.kmer.length ? `${res.kmer[0].seq} is ${fx(res.kmer[0].ratio, 1)}× over-represented near position ${res.kmer[0].pos}.` : 'No positional k-mer enrichment.');
    set('cmplx', grade(d.lowCx, lim.cmplx, 'high'), fx(d.lowCx, 1) + '% low', `${fx(d.lowCx, 1)}% of reads have very low base diversity (entropy below 1 bit).`);
    set('idx', res.bc.length ? 'info' : 'na', res.bc.length ? res.bc.length + ' indexes' : 'no index in headers');
    /* overall score */
    let sw = 0, sv = 0;
    for (const id in WEIGHT) { const m = out[id]; if (!m || m.st === 'na') continue; sw += WEIGHT[id]; sv += WEIGHT[id] * (m.st === 'pass' ? 1 : m.st === 'warn' ? 0.55 : 0); }
    let score = sw ? (sv * 100) / sw : 0;
    if (res.hasQual) score = 0.7 * score + 0.3 * Math.min(100, (d.q30 / 85) * 100);
    const g = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 55 ? 'D' : 'F';
    const cnt = { pass: 0, warn: 0, fail: 0 }; for (const k in out) if (cnt[out[k].st] !== undefined && QS.mod(k).core) cnt[out[k].st]++;
    return { mods: out, score: Math.round(score), grade: g, cnt };
  };

  QS.metrics = function (res, ev) {
    const d = QS.derive(res);
    return {
      reads: res.n, bases: res.totalBases, len: d.meanLen, gc: d.gcPct, meanQ: res.hasQual ? d.meanQ : NaN, q30: res.hasQual ? d.q30 : NaN,
      uniq: res.dup.pctDedup, adp: Math.max(0, ...d.adMax), nmax: Math.max(0, ...d.nPos), ee1: res.hasQual ? (res.ee.le1 * 100) / res.n : NaN, score: ev.score,
    };
  };

  /* Trim advice and what-if statistics. */
  QS.trimAdvice = function (res) {
    const d = QS.derive(res), L = res.L, why = []; let t5 = 0, keep = res.maxLen || L;
    if (res.hasQual) {
      const nf = []; // first positions with N or very low quality
      for (let p = 0; p < Math.min(L, 12); p++) { let c = 0, k = 0; for (let i = 0; i < NQ; i++) { const v = res.q[p * NQ + i]; k += v; if (d.qv(i) < 20) c += v; } if (k && c / k > 0.2) nf.push(p); else break; }
      if (nf.length) { t5 = nf.length; why.push(`The first ${t5} base${t5 > 1 ? 's' : ''} have poor quality.`); }
      const win = 4; let cut = -1;
      for (let p = 0; p + win <= L; p++) { let s = 0; for (let w = 0; w < win; w++) { const g = d.groups.findIndex((x) => p + w >= x.s && p + w <= x.e); s += d.pbq[g].med; } if (s / win < 25 && p > 8) { cut = p; break; } }
      if (cut > 0 && cut < L - 1) { keep = cut; why.push(`Median quality drops below Q25 at position ${cut + 1}.`); }
    }
    let adStart = -1; d.adCum.forEach((arr, a) => { if (a >= 5) return; for (let p = 0; p < arr.length; p++) if (arr[p] >= 2) { if (adStart < 0 || p < adStart) adStart = p; break; } });
    if (adStart > 0 && adStart < keep) { keep = Math.max(adStart - 10, t5 + 20); why.push(`Adapter content passes 2% around position ${adStart + 1}.`); }
    if (!why.length) why.push('Read quality is stable along the read; trimming is optional.');
    return { t5, keep: Math.min(keep, res.maxLen || L), why };
  };
  QS.trimStats = function (res, t5, keep, minLen) {
    const d = QS.derive(res); let kept = 0, drop = 0, mapped = 0;
    for (const [l, c] of res.lenH) { const k = Math.max(0, Math.min(l, keep) - t5); kept += k * c; if (k < minLen) drop += c; mapped += c; }
    const o = { keptPct: res.totalBases ? (kept * 100) / res.totalBases : 0, dropPct: mapped ? (drop * 100) / mapped : 0, newLen: Math.max(0, keep - t5) };
    if (res.hasQual) {
      let s = 0, n = 0, q30 = 0, b = 0, sb = 0, nb = 0;
      for (let p = 0; p < res.L; p++) for (let i = 0; i < NQ; i++) { const c = res.q[p * NQ + i]; if (!c) continue; sb += c * d.qv(i); nb += c; if (p >= t5 && p < keep) { s += c * d.qv(i); n += c; if (d.qv(i) >= 30) q30 += c; } }
      o.qBefore = nb ? sb / nb : 0; o.qAfter = n ? s / n : 0; o.q30After = n ? (q30 * 100) / n : 0;
    }
    const pos = Math.min(keep, res.L) - 1; o.adBefore = Math.max(0, ...d.adMax.slice(0, 5)); o.adAfter = pos >= 0 ? Math.max(0, ...d.adCum.slice(0, 5).map((a) => a[pos])) : 0;
    return o;
  };

  /* Findings shown on the dashboard. */
  QS.insights = function (res, ev) {
    const d = QS.derive(res), I = [], m = ev.mods, add = (sev, mod, title, text, act) => I.push({ sev, mod, title, text, act });
    if (res.truncated) add('info', 'basic', 'Partial analysis', `Only the first ${num(res.n)} reads were analysed. Raise the read limit in Analysis › Reads to analyse for a complete picture.`);
    if (res.hasQual) {
      if (m.pbq.st !== 'pass') { const ta = QS.trimAdvice(res); add(m.pbq.st, 'pbq', 'Quality decays along the read', m.pbq.note + ' ' + ta.why.join(' '), { label: 'Open trim advisor', act: 'tab-trim' }); }
      if (m.psq.st !== 'pass') add(m.psq.st, 'psq', 'Many reads have low average quality', m.psq.note + ' Consider filtering reads below Q20.');
      if (d.q30 >= 90) add('ok', 'pbq', 'Excellent base quality', `${fx(d.q30, 1)}% of bases are Q30 or better (mean Q${fx(d.meanQ, 1)}).`);
      if (res.ee.le1 / res.n < 0.7) add('warn', 'ee', 'High expected error rate', `Only ${fx((res.ee.le1 * 100) / res.n, 0)}% of reads have one expected error or fewer, which matters for denoising and variant calling.`);
    }
    if (m.tile.st === 'warn' || m.tile.st === 'fail') add(m.tile.st, 'tile', 'Tile or flow-cell problem', m.tile.note + ' Check the spatial map for bubbles or edge effects; reads from those tiles can be filtered.');
    if (m.adp.st !== 'pass') add(m.adp.st, 'adp', 'Adapter read-through', m.adp.note + ' Trim adapters before alignment or assembly.', { label: 'Open trim advisor', act: 'tab-trim' });
    if (m.over.st !== 'pass') add(m.over.st, 'over', 'Over-represented sequence', m.over.note + (res.over[0] && res.over[0].hit ? ' It matches a known adapter or primer, so it is likely library artefact.' : ' It may be a highly expressed transcript, a contaminant or a PCR artefact.'));
    if (m.dup.st !== 'pass') add(m.dup.st, 'dup', 'High duplication', `Only ${fx(res.dup.pctDedup, 0)}% of reads are unique. Expected for RNA-seq and amplicons; for genomic libraries it points to low input or over-amplification.`);
    if (m.gc.st !== 'pass' || d.gcExcess.length) add(m.gc.st === 'pass' ? 'warn' : m.gc.st, 'gc', 'GC distribution has an extra population', m.gc.note + ' This often signals contamination or a mixed sample.');
    if (m.nc.st !== 'pass') add(m.nc.st, 'nc', 'Unresolved bases', m.nc.note + ' A single bad cycle usually indicates a transient instrument problem.');
    if (m.cmplx.st !== 'pass') add(m.cmplx.st, 'cmplx', 'Low-complexity reads', m.cmplx.note + ' Poly-A/G/T tails and repeats are typical causes.');
    const tg = d.base[2].slice(-3).reduce((a, b) => a + b, 0) / 3;
    if (res.hasQual && tg > 35 && d.pbq.length && d.pbq[d.pbq.length - 1].mean < 25) add('warn', 'pbc', 'Poly-G tail artefact', `Guanine makes up ${fx(tg, 0)}% of the last bases while quality is low, a typical two-colour chemistry artefact. Use poly-G trimming.`, { label: 'Open trim advisor', act: 'tab-trim' });
    const lead = Math.max(...d.baseDiff.slice(0, Math.min(10, d.baseDiff.length)));
    if (lead > 10 && m.pbc.st !== 'pass' && d.baseDiff.slice(10).every((v) => v < 6)) add('info', 'pbc', 'Biased start of reads', 'Composition is uneven only in the first ~10 bases, a known side-effect of random priming or transposase library prep. It is usually harmless.');
    if (m.kmer.st !== 'pass') add(m.kmer.st, 'kmer', 'Enriched k-mers', m.kmer.note);
    if (res.bc.length > 1 && res.bcTotal) {
      const top = res.bc[0][1] / res.bcTotal;
      if (top < 0.9) add('warn', 'idx', 'Mixed index sequences', `The dominant index covers ${fx(top * 100, 1)}% of reads. The rest could be index hopping, sequencing errors or other samples.`);
    }
    if (res.flagged) add('info', 'basic', 'Filtered reads present', `${num(res.flagged)} reads (${fx((res.flagged * 100) / res.n, 2)}%) are flagged as failing the instrument filter.`);
    if (!I.some((x) => x.sev === 'fail' || x.sev === 'warn')) add('ok', 'basic', 'No problems detected', 'All checks passed with the current thresholds.');
    const o = { fail: 0, warn: 1, info: 2, ok: 3 }; return I.sort((a, b) => o[a.sev] - o[b.sev]);
  };

  QS.HELP = {
    basic: ['Summary of the file: format, quality encoding, read counts, length range and overall GC.', 'Counts match what you expect from the run.', 'Far fewer reads than expected, or an unexpected length range.'],
    pbq: ['Quality score distribution at every position in the read. Boxes show the interquartile range, whiskers the 10th–90th percentile, the blue line the mean.', 'Medians stay above Q28 along the read.', 'Quality typically falls towards the 3′ end. A sudden drop in the middle of the read points to an instrument problem; trim or filter affected reads.'],
    pqh: ['Density of every quality value at each position. Brighter cells hold more bases.', 'A tight bright band near the top.', 'Splits into several bands (mixed populations of reads) or a diffuse smear at the 3′ end.'],
    tile: ['Mean quality of every flow-cell tile compared with the other tiles at the same cycle. The spatial map shows where on the flow cell the low-quality clusters sit.', 'A uniform field with no coloured streaks.', 'Blue patches or horizontal streaks mean a tile lost quality (bubble, debris, focus problem). Those reads can be excluded.'],
    psq: ['How many reads have each average quality. The line shows the share of reads at or above a quality.', 'One narrow peak near Q35 or higher.', 'A second peak at low quality means a subset of reads failed.'],
    qgc: ['Two-dimensional density of read GC content against mean quality.', 'A single compact blob.', 'Low-quality reads concentrated at extreme GC point to GC-dependent chemistry problems or contamination.'],
    pbc: ['Share of A, C, G and T at each position. In a random library the lines run parallel and flat.', 'Four flat parallel lines.', 'Composition bias in the first bases is normal for random priming and transposase libraries. Diverging lines further along suggest adapters or contamination.'],
    gc: ['Distribution of the GC content of whole reads compared with a theoretical normal distribution.', 'A smooth bell that matches the fitted curve.', 'Shoulders or a second peak indicate contamination or mixed species; a very narrow or very broad peak indicates low-complexity or biased libraries.'],
    nc: ['Share of bases that could not be called at every position.', 'Close to zero everywhere.', 'A spike at one position means a single bad cycle; a rising tail means the signal fades at the end of the read.'],
    len: ['Distribution of read lengths.', 'A single sharp peak for untrimmed runs.', 'Variable lengths are normal after trimming but unexpected for raw data.'],
    dup: ['How many reads are exact copies of others. Blue is the share of distinct sequences, red the share of all reads. Estimated from the first 100,000 distinct sequences.', 'Most reads occur once.', 'High levels mean low library complexity, over-amplification or very deep sequencing. For RNA-seq and amplicons they are expected.'],
    over: ['Sequences that make up more than 0.1% of all reads, annotated against known adapters and primers.', 'The list is empty.', 'A match with an adapter or primer means artefacts or adapter dimers; unmatched hits can be genuine biology (rRNA, highly expressed genes) or contamination.'],
    adp: ['Cumulative share of reads that contain an adapter sequence by each position.', 'All lines stay near zero.', 'Rising lines mean fragments shorter than the read length. Trim adapters before mapping.'],
    kmer: ['7-mers that appear more often than expected at specific positions of the read.', 'No enriched k-mers.', 'Enrichment at the start is typical for biased library prep. Enrichment that grows towards the end points to adapter read-through.'],
    ee: ['Expected errors derived from quality scores. Per read: distribution of the sum of error probabilities. Along the read: accumulated errors.', 'Most reads have well under one expected error.', 'A heavy tail means many reads contain several errors, which hurts denoising and variant calling.'],
    cmplx: ['Shannon entropy of the base composition of each read and the longest single-base run.', 'Entropy close to 2 bits for nearly all reads, short homopolymer runs.', 'Low entropy and long runs come from poly-A/G tails, repeats or primer dimers.'],
    idx: ['Index (barcode) sequences from the read headers.', 'A single dominant index per sample.', 'Many minor indexes indicate index hopping, cross-talk or sequencing errors in the index read.'],
  };
})();
