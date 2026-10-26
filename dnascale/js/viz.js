/* Visualize view: 3D double helix, dot plot, DNA walks, chaos-game maps and sequence logos. */
(function () {
  'use strict';
  const BW = (globalThis.BW = globalThis.BW || {});
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = (n) => Number(n).toLocaleString('en-US');
  let A = null, helix = null;
  const vz = { tab: 'helix', a: null, b: null, k: 10, rc: true, walk: 'gates', cgrMode: 'fcgr', cgrK: 5, cgrLog: true, logoHalf: 12 };
  const PALETTE = ['#2563eb', '#e8a317', '#2fa66a', '#e0474c', '#a15cd8', '#0d9488', '#ea580c', '#64748b'];

  const ungapped = (s) => s.res.replace(/-/g, '');
  function targets() {
    const rows = A.rows(), st = A.stats(), list = rows.map((s) => ({ key: s.id, name: s.name, type: s.type, seq: ungapped(s).toUpperCase(), row: s }));
    if (rows.length > 1 && st.cons) { const cm = A.S.contigs.find((c) => c.id === A.S.group); list.push({ key: 'cons', name: (cm ? cm.name + ' ' : '') + 'consensus', type: A.mainType(), seq: st.cons.replace(/-/g, '').toUpperCase(), row: null }); }
    return list;
  }
  const byKey = (k) => targets().find((t) => t.key === k);
  function pickDefault() {
    const list = targets(); if (!list.length) return;
    const cur = A.S.cursor && A.rows()[A.S.cursor.r];
    if (!vz.a || !byKey(vz.a)) vz.a = (cur && cur.id) || list[0].key;
    if (!vz.b || !byKey(vz.b)) vz.b = vz.a;
  }
  const opt = (list, key, none) => (none ? '<option value="">None</option>' : '') + list.map((t) => `<option value="${t.key}" ${t.key === key ? 'selected' : ''}>${esc(t.name)} (${fmt(t.seq.length)})</option>`).join('');
  const fit = (cv, h, w) => {
    const W = w || Math.max(300, cv.parentElement.clientWidth), dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(W * dpr); cv.height = Math.round(h * dpr); cv.style.width = W + 'px'; cv.style.height = h + 'px';
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); return { ctx, W, H: h };
  };
  const png = (cv, name) => cv.toBlob((b) => A.download(name, b));

  /* ================= shell ================= */
  function render() {
    const body = $('#vzBody'); if (!body) return;
    pickDefault();
    $$('#vzTabs button').forEach((b) => b.classList.toggle('on', b.dataset.t === vz.tab));
    helix && helix.setActive(vz.tab === 'helix' && A.S.opts.view === 'viz');
    const list = targets(), t = byKey(vz.a);
    $('#vzSeqs').innerHTML = !list.length ? '' : `<label>${vz.tab === 'dot' ? 'X axis' : 'Sequence'} <select class="sel" id="vzA">${opt(list, vz.a)}</select></label>` +
      (['dot', 'cgr'].includes(vz.tab) ? `<label>${vz.tab === 'dot' ? 'Y axis' : 'Compare with'} <select class="sel" id="vzB">${opt(list, vz.tab === 'cgr' && vz.b === vz.a ? '' : vz.b, vz.tab === 'cgr')}</select></label>` : '');
    if (!list.length) { body.innerHTML = '<div class="hint" style="padding:40px">Add sequences to visualise them.</div>'; return; }
    ({ helix: renderHelix, dot: renderDot, walk: renderWalk, cgr: renderCgr, logo: renderLogo })[vz.tab](body, t, list);
    const a = $('#vzA'); if (a) a.onchange = () => { vz.a = a.value; if (vz.tab === 'dot' && !$('#vzB')) vz.b = vz.a; render(); };
    const b = $('#vzB'); if (b) b.onchange = () => { vz.b = b.value || vz.a; render(); };
  }

  /* ================= 3D helix ================= */
  function helixInfo(t) {
    const st = A.stats(), S = A.S, row = t.row;
    let qual = null, variant = () => 0, sel = null, map = null;
    if (row) {
      map = BW.seqMap(row);
      if (row.trace) qual = row.trace.qual.slice(row.tStart, row.tEnd);
      variant = (i) => { const c = map.idxToCol[i]; return c !== undefined && (st.diff[c] || st.het[c] || (st.amb && st.amb[c])) ? 1 : 0; };
      const r = A.rows().indexOf(row);
      if (S.sel && r >= S.sel.r0 && r <= S.sel.r1) { let a = -1, b = -1; for (let c = S.sel.c0; c <= S.sel.c1; c++) { const i = map.colToIdx[c]; if (i >= 0) { if (a < 0) a = i; b = i; } } if (a >= 0) sel = [a, b]; }
    } else {
      const cols = []; for (let c = 0; c < st.cons.length; c++) if (st.cons[c] !== '-') cols.push(c);
      variant = (i) => { const c = cols[i]; return c !== undefined && (st.diff[c] || st.het[c] || (st.amb && st.amb[c])) ? 1 : 0; };
    }
    const seq = t.seq.replace(/[^ACGT]/g, 'N');
    return { seq, qual, variant, sel, map, row, name: t.name };
  }
  function renderHelix(body, t) {
    if (t.type !== 'dna') { body.innerHTML = '<div class="hint" style="padding:40px">The 3D helix needs a DNA sequence.</div>'; return; }
    if (!$('#hxCanvas', body)) {
      body.innerHTML = `<div class="hx-controls">
        <div class="seg" id="hxForm">${Object.entries(BW.HELIX_FORMS).map(([k, f]) => `<button data-f="${k}" title="${f.info}">${f.name}</button>`).join('')}</div>
        <label>Style <select class="sel" id="hxStyle"><option value="ball">Ball &amp; stick</option><option value="cartoon">Ribbon</option><option value="wire">Wireframe</option></select></label>
        <label>Colour <select class="sel" id="hxColor"><option value="base">By base</option><option value="strand">By strand</option><option value="quality">By quality (Phred)</option><option value="variant">Differences</option><option value="uniform">Uniform</option></select></label>
        <span class="chips">${[['backbone', 'Backbone'], ['bases', 'Bases'], ['hbonds', 'H-bonds'], ['letters', 'Letters'], ['spin', 'Auto-rotate']].map(([k, l]) => `<label class="chip-toggle"><input type="checkbox" data-o="${k}"><span>${l}</span></label>`).join('')}</span>
        <span class="chips">${[['default', 'Default'], ['side', 'Side'], ['top', 'Top-down'], ['major', 'Major groove'], ['minor', 'Minor groove']].map(([k, l]) => `<button class="btn sm" data-v="${k}">${l}</button>`).join('')}</span>
        <label>Window <input type="range" id="hxWin" min="12" max="300" step="2"> <b id="hxWinV" class="num"></b> bp</label>
        <label class="chip-toggle"><input type="checkbox" id="hxFollow"><span>Follow cursor</span></label>
        <span class="grow"></span><button class="btn sm" id="hxPng">${A.icon('image')}PNG</button><button class="btn sm" id="hxPdb">PDB</button></div>
        <div class="hx-stage"><canvas id="hxCanvas"></canvas><div id="hxTip" hidden></div><div id="hxStats"></div><div class="hx-hint">Drag to rotate · scroll to zoom · shift-drag to pan · double-click to reset · click a base pair to select it</div></div>
        <div class="hx-strip"><canvas id="hxStrip"></canvas></div>`;
      helix = helix || new BW.HelixView($('#hxCanvas', body), makeHelixApp());
      helix.cv = $('#hxCanvas', body); helix.ctx = helix.cv.getContext('2d');
      new ResizeObserver(() => helix.resize()).observe($('.hx-stage', body)); helix.cv.parentElement && (helix.cv.style.position = 'absolute');
      bindHelixControls(body);
    }
    syncHelix(t); helix.setActive(A.S.opts.view === 'viz');
  }
  function makeHelixApp() {
    return { get theme() { return A.theme; }, baseColor: A.baseColor,
      onHover: (p, e) => { const tip = $('#hxTip'); if (!tip) return; if (!p) { tip.hidden = true; return; } const inf = helix.info; tip.hidden = false; tip.innerHTML = `<b>${p.i + 1}</b> · ${p.b}–${p.c}${p.q !== null ? ` · Q${p.q}` : ''}${p.v ? ' · <span style="color:var(--warn)">difference</span>' : ''}`; tip.style.left = Math.min(helix.W - 170, (e ? e.offsetX : 0) + 14) + 'px'; tip.style.top = (e ? e.offsetY : 0) + 14 + 'px'; },
      onPick: (p) => { const inf = helix.info; if (inf.row) { A.selectResidueRange(A.rows().indexOf(inf.row), p.i, p.i); } drawStrip(); },
      onSpinChange: (v) => { const c = $('[data-o=spin]'); if (c) c.checked = !!v; } };
  }
  function bindHelixControls(body) {
    const o = helix.o;
    const refresh = () => { const t = byKey(vz.a); if (t) syncHelix(t); };
    $$('#hxForm button', body).forEach((b) => (b.onclick = () => { o.form = b.dataset.f; refresh(); }));
    $('#hxStyle', body).onchange = (e) => { o.style = e.target.value; helix.kick(); };
    $('#hxColor', body).onchange = (e) => { o.color = e.target.value; helix.kick(); drawStrip(); };
    $$('[data-o]', body).forEach((c) => (c.onchange = () => { o[c.dataset.o] = c.checked; helix.kick(); }));
    $$('[data-v]', body).forEach((b) => (b.onclick = () => helix.setView(b.dataset.v)));
    $('#hxWin', body).oninput = (e) => { o.win = +e.target.value; refresh(); };
    $('#hxFollow', body).onchange = (e) => { o.follow = e.target.checked; refresh(); };
    $('#hxPng', body).onclick = () => png(helix.png(), `${A.base()}_helix.png`);
    $('#hxPdb', body).onclick = () => { A.download(`${A.base()}_helix.pdb`, helix.pdb(), 'chemical/x-pdb'); A.toast('Saved an idealised coarse-grained model as PDB'); };
    const strip = $('#hxStrip', body);
    strip.onclick = (e) => { const inf = helix.info; if (!inf) return; const frac = e.offsetX / strip.clientWidth; o.start = Math.round(frac * inf.seq.length - o.win / 2); o.follow = false; $('#hxFollow').checked = false; const t = byKey(vz.a); syncHelix(t); };
  }
  function syncHelix(t) {
    const body = $('#vzBody'), o = helix.o, inf = helixInfo(t);
    if (o.follow && inf.row && A.S.cursor && A.rows()[A.S.cursor.r] === inf.row) { const idx = BW.seqMap(inf.row).colToIdx[A.S.cursor.c]; if (idx >= 0) o.start = idx - Math.round(o.win / 2); }
    else if (o.follow && !inf.row && A.S.cursor) { /* consensus: keep */ }
    o.win = Math.min(o.win, Math.max(12, inf.seq.length));
    o.start = Math.max(0, Math.min(o.start, inf.seq.length - o.win));
    helix.setInfo(inf);
    $$('#hxForm button', body).forEach((b) => b.classList.toggle('on', b.dataset.f === o.form));
    $('#hxStyle', body).value = o.style; $('#hxColor', body).value = o.color;
    $$('[data-o]', body).forEach((c) => (c.checked = !!o[c.dataset.o]));
    $('#hxWin', body).value = o.win; $('#hxWinV', body).textContent = o.win; $('#hxFollow', body).checked = o.follow;
    const n = helix.n || 0, f = helix.f, seg = inf.seq.slice(o.start, o.start + n), gc = seg ? (seg.match(/[GC]/g) || []).length / Math.max(1, seg.length) : 0;
    $('#hxStats', body).innerHTML = `<b>${n}</b> bp · GC <b>${(gc * 100).toFixed(0)}%</b> · <b>${(n / (360 / f.twist)).toFixed(1)}</b> turns · <b>${((n - 1) * f.rise / 10).toFixed(1)}</b> nm<br><span>${inf.name} · ${o.start + 1}–${o.start + n} of ${fmt(inf.seq.length)} · ${f.name}</span>`;
    drawStrip();
  }
  function drawStrip() {
    const cv = $('#hxStrip'); if (!cv || !helix || !helix.info) return;
    const f = fit(cv, 44), { ctx, W, H } = f, th = A.theme, inf = helix.info, n = inf.seq.length, o = helix.o;
    ctx.fillStyle = th.panel; ctx.fillRect(0, 0, W, H);
    const bins = Math.min(n, Math.floor(W)), step = n / bins;
    for (let b = 0; b < bins; b++) {
      const i = Math.floor(b * step), x = (b / bins) * W, w = Math.max(1, W / bins);
      ctx.fillStyle = A.baseColor(inf.seq[i], false); ctx.globalAlpha = 0.9; ctx.fillRect(x, 4, w, 14); ctx.globalAlpha = 1;
      if (inf.qual) { const q = inf.qual[i] || 0, h = Math.max(1, q / 60 * 18); ctx.fillStyle = q >= 30 ? th.qHigh : q >= 20 ? th.qMid : th.qLow; ctx.fillRect(x, 40 - h, w, h); }
      if (inf.variant(i)) { ctx.fillStyle = th.warn; ctx.fillRect(x, 0, Math.max(2, w), 3); }
    }
    const x0 = (o.start / n) * W, x1 = ((o.start + (helix.n || 0)) / n) * W;
    ctx.fillStyle = th.sel; ctx.fillRect(x0, 0, Math.max(3, x1 - x0), H); ctx.strokeStyle = th.selLine; ctx.lineWidth = 1.5; ctx.strokeRect(x0 + .75, .75, Math.max(3, x1 - x0) - 1.5, H - 1.5);
  }

  /* ================= dot plot ================= */
  function renderDot(body, t) {
    const list = targets(), tb = byKey(vz.b) || t;
    body.innerHTML = `<div class="hx-controls"><label>Word size <input type="range" id="dtK" min="4" max="24" value="${vz.k}"> <b class="num" id="dtKv">${vz.k}</b></label>
      <label class="chip-toggle"><input type="checkbox" id="dtRc" ${vz.rc ? 'checked' : ''}><span>Show reverse-complement matches</span></label><span class="grow"></span><button class="btn sm" id="dtPng">${A.icon('image')}PNG</button></div>
      <div class="dot-wrap"><canvas id="dtCanvas"></canvas><div id="dtRead" class="hx-hint"></div></div>
      <div class="muted note" style="padding:0 16px 14px">Each dot is a stretch of identical bases. A diagonal line means the two sequences are similar there; a line running the other way (orange) means one is the reverse complement of the other. Compare a read to the reference, or one sequence to itself to see repeats.</div>`;
    const draw = () => drawDot(t, tb);
    $('#dtK').oninput = (e) => { vz.k = +e.target.value; $('#dtKv').textContent = vz.k; draw(); };
    $('#dtRc').onchange = (e) => { vz.rc = e.target.checked; draw(); };
    $('#dtPng').onclick = () => png($('#dtCanvas'), `${A.base()}_dotplot.png`);
    draw();
  }
  function drawDot(ta, tb) {
    const cv = $('#dtCanvas'), th = A.theme, avail = Math.max(320, Math.min($('#vzBody').clientWidth - 40, $('#vzBody').clientHeight - 130)), W = avail, H = avail;
    const f = fit(cv, H, W), { ctx } = f, ml = 64, mb = 40, mt = 14, mr = 14, pw = W - ml - mr, ph = H - mt - mb;
    ctx.fillStyle = th.panel; ctx.fillRect(0, 0, W, H);
    const a = ta.seq, b = tb.seq, k = Math.min(vz.k, a.length, b.length); if (k < 2) return;
    const idx = new Map();
    for (let j = 0; j + k <= b.length; j++) { const w = b.substr(j, k); if (w.includes('N')) continue; let l = idx.get(w); if (!l) idx.set(w, (l = [])); if (l.length < 40) l.push(j); }
    const img = ctx.createImageData(Math.round(pw), Math.round(ph)), d = img.data, iw = img.width, ih = img.height;
    const put = (i, j, r, g, bb) => {
      const x = Math.min(iw - 1, Math.floor((i / a.length) * iw)), y = Math.min(ih - 1, Math.floor((j / b.length) * ih));
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) { const xx = Math.min(iw - 1, x + dx), yy = Math.min(ih - 1, y + dy), o = (yy * iw + xx) * 4; d[o] = r; d[o + 1] = g; d[o + 2] = bb; d[o + 3] = 255; }
    };
    const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    const fw = hex(th.accent), rv = hex('#e8710a'); let hits = 0;
    for (let i = 0; i + k <= a.length && hits < 800000; i++) {
      const w = a.substr(i, k); if (w.includes('N')) continue;
      const l = idx.get(w); if (l) for (const j of l) { for (let s = 0; s < k; s += Math.max(1, Math.floor(k / 3))) put(i + s, j + s, fw[0], fw[1], fw[2]); hits++; }
      if (vz.rc) { const l2 = idx.get(BW.revcomp(w)); if (l2) for (const j of l2) { for (let s = 0; s < k; s += Math.max(1, Math.floor(k / 3))) put(i + s, j + k - 1 - s, rv[0], rv[1], rv[2]); hits++; } }
    }
    ctx.fillStyle = th.dark ? '#0f141c' : '#fbfcfe'; ctx.fillRect(ml, mt, pw, ph);
    // blit via temp canvas to keep crisp dots
    const tmp = document.createElement('canvas'); tmp.width = iw; tmp.height = ih; tmp.getContext('2d').putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = false; ctx.drawImage(tmp, ml, mt, pw, ph); ctx.imageSmoothingEnabled = true;
    // dilate sparse dots slightly for visibility
    ctx.strokeStyle = th.line2; ctx.lineWidth = 1; ctx.strokeRect(ml + .5, mt + .5, pw - 1, ph - 1);
    ctx.font = `10px ${th.sans}`; ctx.fillStyle = th.muted; ctx.textAlign = 'center';
    const tickEvery = (len) => { const raw = len / 6, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p; return (m >= 5 ? 10 : m >= 2 ? 5 : m >= 1 ? 2 : 1) * p; };
    for (let v = 0, s = tickEvery(a.length); v <= a.length; v += s) { const x = ml + (v / a.length) * pw; ctx.fillText(fmt(v), x, mt + ph + 14); ctx.fillRect(x, mt + ph, 1, 4); }
    ctx.textAlign = 'right'; for (let v = 0, s = tickEvery(b.length); v <= b.length; v += s) { const y = mt + (v / b.length) * ph; ctx.fillText(fmt(v), ml - 6, y + 3); ctx.fillRect(ml - 4, y, 4, 1); }
    ctx.font = `600 11px ${th.sans}`; ctx.fillStyle = th.text2; ctx.textAlign = 'center'; ctx.fillText(ta.name, ml + pw / 2, H - 6);
    ctx.save(); ctx.translate(12, mt + ph / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(tb.name, 0, 0); ctx.restore();
    cv.onmousemove = (e) => { const i = Math.round(((e.offsetX - ml) / pw) * a.length), j = Math.round(((e.offsetY - mt) / ph) * b.length); const r = $('#dtRead'); if (r) r.textContent = i >= 0 && j >= 0 && i <= a.length && j <= b.length ? `${ta.name} ${fmt(i)} · ${tb.name} ${fmt(j)}` : ''; };
  }

  /* ================= DNA walks ================= */
  function renderWalk(body) {
    body.innerHTML = `<div class="hx-controls"><label>Walk <select class="sel" id="wkType"><option value="gates" ${vz.walk === 'gates' ? 'selected' : ''}>2D walk (A↓ T↑ C← G→)</option><option value="pupy" ${vz.walk === 'pupy' ? 'selected' : ''}>Purine / pyrimidine walk</option><option value="gc" ${vz.walk === 'gc' ? 'selected' : ''}>Cumulative GC skew</option><option value="at" ${vz.walk === 'at' ? 'selected' : ''}>Cumulative AT skew</option></select></label>
      <span class="muted">All visible DNA sequences are overlaid — similar sequences run side by side.</span><span class="grow"></span><button class="btn sm" id="wkPng">${A.icon('image')}PNG</button></div>
      <div class="dot-wrap"><canvas id="wkCanvas"></canvas></div><div id="wkLegend" class="legend-row"></div>`;
    $('#wkType').onchange = (e) => { vz.walk = e.target.value; render(); };
    $('#wkPng').onclick = () => png($('#wkCanvas'), `${A.base()}_walk.png`);
    const cv = $('#wkCanvas'), h = Math.max(320, $('#vzBody').clientHeight - 150), f = fit(cv, h), { ctx, W, H } = f, th = A.theme;
    const seqs = targets().filter((t) => t.type === 'dna' && t.key !== 'cons' || (t.key === 'cons' && false));
    ctx.fillStyle = th.panel; ctx.fillRect(0, 0, W, H);
    const series = seqs.map((t, n) => {
      const pts = [[0, 0]]; let x = 0, y = 0;
      const step = Math.max(1, Math.floor(t.seq.length / 2500));
      for (let i = 0; i < t.seq.length; i++) {
        const c = t.seq[i];
        if (vz.walk === 'gates') { if (c === 'T') y++; else if (c === 'A') y--; else if (c === 'C') x--; else if (c === 'G') x++; }
        else if (vz.walk === 'pupy') { x = i + 1; if (c === 'A' || c === 'G') y++; else if (c === 'C' || c === 'T') y--; }
        else if (vz.walk === 'gc') { x = i + 1; if (c === 'G') y++; else if (c === 'C') y--; }
        else { x = i + 1; if (c === 'A') y++; else if (c === 'T') y--; }
        if (i % step === 0 || i === t.seq.length - 1) pts.push([x, y]);
      }
      return { t, pts, color: PALETTE[n % PALETTE.length] };
    });
    let x0 = 0, x1 = 1, y0 = 0, y1 = 1;
    for (const s of series) for (const [x, y] of s.pts) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const ml = 50, mr = 20, mt = 14, mb = 30; let pw = W - ml - mr, ph = H - mt - mb;
    let sx = pw / (x1 - x0 || 1), sy = ph / (y1 - y0 || 1);
    if (vz.walk === 'gates') { const s = Math.min(sx, sy); sx = sy = s; }
    const ox = ml + (pw - (x1 - x0) * sx) / 2, oy = mt + ph - (ph - (y1 - y0) * sy) / 2;
    const X = (v) => ox + (v - x0) * sx, Y = (v) => oy - (v - y0) * sy;
    ctx.strokeStyle = th.line; ctx.lineWidth = 1; ctx.fillStyle = th.muted; ctx.font = `10px ${th.sans}`;
    ctx.beginPath(); ctx.moveTo(X(0), mt); ctx.lineTo(X(0), mt + ph); ctx.moveTo(ml, Y(0)); ctx.lineTo(ml + pw, Y(0)); ctx.stroke();
    ctx.textAlign = 'center'; ctx.fillText(vz.walk === 'gates' ? 'G →' : 'position (bp)', ml + pw - 20, mt + ph + 22);
    ctx.textAlign = 'right'; ctx.fillText(vz.walk === 'gates' ? 'T ↑' : vz.walk === 'pupy' ? 'purine − pyrimidine' : vz.walk === 'gc' ? 'G − C' : 'A − T', ml - 6, mt + 10);
    for (const s of series) {
      ctx.strokeStyle = s.color; ctx.lineWidth = 1.8; ctx.lineJoin = 'round'; ctx.globalAlpha = 0.9; ctx.beginPath();
      s.pts.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y)))); ctx.stroke(); ctx.globalAlpha = 1;
      const e = s.pts[s.pts.length - 1]; ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(X(e[0]), Y(e[1]), 3.5, 0, 7); ctx.fill();
    }
    ctx.fillStyle = th.text; ctx.beginPath(); ctx.arc(X(0), Y(0), 3.5, 0, 7); ctx.fill();
    $('#wkLegend').innerHTML = series.map((s) => `<span><i style="background:${s.color}"></i>${esc(s.t.name)}</span>`).join('');
  }

  /* ================= chaos game ================= */
  const ramp = (t) => { const s = [[12, 18, 40], [38, 70, 160], [30, 160, 170], [240, 200, 60], [255, 250, 225]]; t = Math.max(0, Math.min(1, t)) * (s.length - 1); const i = Math.min(s.length - 2, Math.floor(t)), f = t - i; return s[i].map((v, k) => Math.round(v + (s[i + 1][k] - v) * f)); };
  function renderCgr(body, t) {
    const tb = vz.b && vz.b !== vz.a ? byKey(vz.b) : null;
    body.innerHTML = `<div class="hx-controls"><label>Map <select class="sel" id="cgMode"><option value="fcgr" ${vz.cgrMode === 'fcgr' ? 'selected' : ''}>Frequency map (k-mers)</option><option value="dots" ${vz.cgrMode === 'dots' ? 'selected' : ''}>Chaos game points</option></select></label>
      <label>k <input type="range" id="cgK" min="3" max="8" value="${vz.cgrK}"> <b class="num" id="cgKv">${vz.cgrK}</b></label><label class="chip-toggle"><input type="checkbox" id="cgLog" ${vz.cgrLog ? 'checked' : ''}><span>Log scale</span></label><span class="grow"></span><button class="btn sm" id="cgPng">${A.icon('image')}PNG</button></div>
      <div class="cgr-row">${[t, tb].filter(Boolean).map((x, i) => `<div class="cgr-cell"><div class="cgr-title">${esc(x.name)}</div><canvas id="cgc${i}"></canvas></div>`).join('')}</div>
      <div class="muted note" style="padding:0 16px 14px">Chaos game representation: each base pulls the point halfway toward its corner (A, C, G, T), so every k-mer gets its own spot. Related sequences give similar patterns; low-complexity DNA leaves empty regions.</div>`;
    $('#cgMode').onchange = (e) => { vz.cgrMode = e.target.value; render(); };
    $('#cgK').oninput = (e) => { vz.cgrK = +e.target.value; $('#cgKv').textContent = vz.cgrK; drawCgrAll(t, tb); };
    $('#cgLog').onchange = (e) => { vz.cgrLog = e.target.checked; drawCgrAll(t, tb); };
    $('#cgPng').onclick = () => png($('#cgc0'), `${A.base()}_cgr.png`);
    drawCgrAll(t, tb);
  }
  function drawCgrAll(t, tb) { [t, tb].filter(Boolean).forEach((x, i) => drawCgr($('#cgc' + i), x)); }
  function drawCgr(cv, t) {
    const th = A.theme, size = Math.max(260, Math.min(520, ($('#vzBody').clientWidth - 60) / ($('#cgc1') ? 2 : 1))), f = fit(cv, size, size), { ctx } = f;
    ctx.fillStyle = th.dark ? '#0b0f16' : '#0e1424'; ctx.fillRect(0, 0, size, size);
    const corner = { A: [0, 0], C: [0, 1], G: [1, 1], T: [1, 0] }, seq = t.seq; let x = 0.5, y = 0.5;
    const pad = 22, pw = size - 2 * pad;
    if (vz.cgrMode === 'dots') {
      ctx.fillStyle = '#ffd66b'; ctx.globalAlpha = 0.7;
      for (let i = 0; i < seq.length; i++) { const c = corner[seq[i]]; if (!c) continue; x = (x + c[0]) / 2; y = (y + c[1]) / 2; if (i > 4) ctx.fillRect(pad + x * pw, pad + (1 - y) * pw, 1.6, 1.6); }
      ctx.globalAlpha = 1;
    } else {
      const k = vz.cgrK, g = 1 << k, grid = new Float32Array(g * g); let mx = 0, n = 0;
      for (let i = 0; i < seq.length; i++) { const c = corner[seq[i]]; if (!c) { n = 0; continue; } x = (x + c[0]) / 2; y = (y + c[1]) / 2; if (++n >= k) { const gx = Math.min(g - 1, Math.floor(x * g)), gy = Math.min(g - 1, Math.floor(y * g)); const v = ++grid[gy * g + gx]; if (v > mx) mx = v; } }
      const cell = pw / g;
      for (let gy = 0; gy < g; gy++) for (let gx = 0; gx < g; gx++) {
        const v = grid[gy * g + gx], tt = !v ? 0 : vz.cgrLog ? Math.log(1 + v) / Math.log(1 + mx) : v / mx, c = ramp(tt);
        ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`; ctx.fillRect(pad + gx * cell, pad + (g - 1 - gy) * cell, Math.ceil(cell), Math.ceil(cell));
      }
    }
    ctx.font = `700 13px ${th.mono}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const [b, c] of Object.entries(corner)) { ctx.fillStyle = A.baseColor(b, false); ctx.fillText(b, pad + c[0] * pw + (c[0] ? 12 : -12) * 0.0 + (c[0] ? -0 : 0), pad + (1 - c[1]) * pw + (c[1] ? -11 : 11)); }
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.strokeRect(pad, pad, pw, pw);
  }

  /* ================= sequence logo ================= */
  const CLUSTAL = {}; for (const [set, col] of [['AVLIMFWC', '#6f8fe8'], ['KR', '#e0463c'], ['NQST', '#3fae5b'], ['DE', '#c05bc0'], ['G', '#e8963c'], ['HY', '#2fa6a6'], ['P', '#d6c23a']]) for (const c of set) CLUSTAL[c] = col;
  function renderLogo(body) {
    const rows = A.rows(), L = A.alnLen();
    body.innerHTML = `<div class="hx-controls"><label>Columns around the cursor ± <input type="range" id="lgHalf" min="4" max="60" value="${vz.logoHalf}"> <b class="num" id="lgHalfV">${vz.logoHalf}</b></label><span class="muted">Select a range in the alignment to plot exactly that range.</span><span class="grow"></span><button class="btn sm" id="lgPng">${A.icon('image')}PNG</button></div>
      <div class="dot-wrap"><canvas id="lgCanvas"></canvas></div><div class="muted note" style="padding:0 16px 14px">Letter height shows how conserved a column is (in bits; the full stack is 2 bits for DNA and ≈ 4.3 for protein). Tall letters are strongly conserved, short stacks are variable. Needs at least two aligned sequences.</div>`;
    $('#lgHalf').oninput = (e) => { vz.logoHalf = +e.target.value; $('#lgHalfV').textContent = vz.logoHalf; drawLogo(); };
    $('#lgPng').onclick = () => png($('#lgCanvas'), `${A.base()}_logo.png`);
    drawLogo();
  }
  function drawLogo() {
    const cv = $('#lgCanvas'), th = A.theme, rows = A.rows(), L = A.alnLen(), S = A.S;
    const f = fit(cv, 260), { ctx, W, H } = f; ctx.fillStyle = th.panel; ctx.fillRect(0, 0, W, H);
    if (rows.length < 2 || !L) { ctx.fillStyle = th.muted; ctx.font = `13px ${th.sans}`; ctx.textAlign = 'center'; ctx.fillText('Align at least two sequences to draw a logo', W / 2, H / 2); return; }
    let c0, c1; if (S.sel && S.sel.c1 > S.sel.c0) { c0 = S.sel.c0; c1 = Math.min(S.sel.c1, S.sel.c0 + 79); } else { const c = S.cursor ? S.cursor.c : 0; c0 = Math.max(0, c - vz.logoHalf); c1 = Math.min(L - 1, c + vz.logoHalf); }
    const dna = A.mainType() === 'dna', alpha = dna ? 'ACGT' : 'ACDEFGHIKLMNPQRSTVWY', sN = alpha.length, maxBits = Math.log2(sN);
    const ml = 46, mr = 10, mt = 12, mb = 30, pw = W - ml - mr, ph = H - mt - mb, n = c1 - c0 + 1, cw = pw / n;
    ctx.strokeStyle = th.line; ctx.fillStyle = th.muted; ctx.font = `10px ${th.sans}`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let b = 0; b <= maxBits + 0.01; b += dna ? 0.5 : 1) { const y = mt + ph - (b / maxBits) * ph; ctx.beginPath(); ctx.moveTo(ml, y); ctx.lineTo(ml + pw, y); ctx.stroke(); ctx.fillText(String(+b.toFixed(1)), ml - 6, y); }
    ctx.save(); ctx.translate(12, mt + ph / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.fillText('bits', 0, 0); ctx.restore();
    for (let c = c0; c <= c1; c++) {
      const cnt = {}; let tot = 0; for (const r of rows) { const ch = r.res[c]; if (ch && ch !== '-' && alpha.includes(ch)) { cnt[ch] = (cnt[ch] || 0) + 1; tot++; } }
      const x = ml + (c - c0) * cw;
      if (tot) {
        const en = (sN - 1) / (2 * Math.LN2 * tot); let H0 = 0; for (const ch in cnt) { const p = cnt[ch] / tot; H0 -= p * Math.log2(p); }
        const info = Math.max(0, maxBits - (H0 + en)); let y = mt + ph;
        for (const [ch, v] of Object.entries(cnt).sort((a, b) => a[1] - b[1])) {
          const hgt = (v / tot) * info / maxBits * ph; if (hgt < 1) continue;
          ctx.save(); ctx.translate(x + cw * 0.04, y); ctx.font = `700 100px Helvetica, Arial, sans-serif`; const gw = ctx.measureText(ch).width || 60; ctx.scale((cw * 0.92) / gw, hgt / 72);
          ctx.fillStyle = dna ? A.baseColor(ch, false) : CLUSTAL[ch] || '#888'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillText(ch, 0, 0); ctx.restore(); y -= hgt;
        }
      }
      if (n <= 40 || (c - c0) % 5 === 0) { ctx.fillStyle = th.muted; ctx.font = `9px ${th.mono}`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillText(String(c + 1), x + cw / 2, mt + ph + 14); }
    }
  }

  /* ================= init ================= */
  BW.initViz = (app) => {
    A = app;
    $('#vzTabs').innerHTML = [['helix', 'Helix 3D'], ['dot', 'Dot plot'], ['walk', 'DNA walk'], ['cgr', 'Chaos map'], ['logo', 'Logo']].map(([k, l]) => `<button data-t="${k}">${l}</button>`).join('');
    $('#vzTabs').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; vz.tab = b.dataset.t; render(); };
    const ro = new ResizeObserver(() => { if (A.S.opts.view === 'viz' && vz.tab !== 'helix') render(); }); ro.observe($('#vzBody'));
    BW.viz = { render, onSelection: () => { if (A.S.opts.view !== 'viz') return; if (vz.tab === 'helix') { const t = byKey(vz.a); if (t && helix && $('#hxCanvas')) syncHelix(t); } else if (vz.tab === 'logo') drawLogo(); }, setActive: (a) => helix && helix.setActive(a && vz.tab === 'helix') };
  };
})();
