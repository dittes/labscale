/* Analysis view: ORF map, G+C frame plot, restriction map + fragments, protein profiles, reverse translation. */
(function () {
  'use strict';
  const BW = (globalThis.BW = globalThis.BW || {});
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = (n) => Number(n).toLocaleString('en-US');
  let A = null;
  const an = { key: null, minOrf: 50, win: 120, circular: false, enz: new Set(), enzKey: '', filter: 1, scale: 'kd', swin: 0, orf: -1, rev: '', revKey: '' };
  const cache = {};

  const ungapped = (s) => s.res.replace(/-/g, '');
  function targets() {
    const rows = A.rows(), st = A.stats(), list = rows.map((s) => ({ key: s.id, name: s.name, type: s.type, seq: ungapped(s), row: s }));
    if (rows.length > 1 && st.cons) {
      const cm = A.S.contigs.find((c) => c.id === A.S.group);
      list.push({ key: 'cons', name: (cm ? cm.name + ' ' : '') + 'consensus', type: A.mainType(), seq: st.cons.replace(/-/g, ''), row: null });
    }
    return list;
  }
  function current() {
    const list = targets(); if (!list.length) return null;
    let t = list.find((x) => x.key === an.key);
    if (!t) { const cur = A.S.cursor && A.rows()[A.S.cursor.r]; t = (cur && list.find((x) => x.key === cur.id)) || list[0]; an.key = t.key; an.orf = -1; }
    return t;
  }
  function memo(name, t, extra, fn) {
    const k = name + '|' + t.key + '|' + t.seq.length + '|' + extra, c = cache[name];
    if (c && c.k === k) return c.v;
    const v = fn(); cache[name] = { k, v }; return v;
  }
  const orfsOf = (t) => memo('orf', t, A.S.opts.code + ':' + an.minOrf + ':' + t.seq.slice(0, 30), () => BW.findOrfs(t.seq, A.S.opts.code, an.minOrf));
  const sitesOf = (t) => memo('sites', t, t.seq.slice(0, 30) + t.seq.slice(-30), () => (t.seq.length < 200000 ? BW.findSites(t.seq) : {}));

  function proteinSources(t, orfs) {
    if (t.type === 'protein') return [{ label: t.name + ' (protein)', prot: t.seq.replace(/\*/g, '') }];
    return orfs.slice(0, 12).map((o, i) => ({ label: `${o.strand > 0 ? '+' : '−'}${o.frame} · ${fmt(o.start)}–${fmt(o.end)} · ${o.aa} aa`, prot: o.protein.replace(/\*/g, ''), i }));
  }

  /* ---------------- rendering ---------------- */
  function fit(cv, h) {
    const W = Math.max(300, cv.parentElement.clientWidth - 28), dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(W * dpr); cv.height = Math.round(h * dpr); cv.style.width = W + 'px'; cv.style.height = h + 'px';
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); return { ctx, W, H: h };
  }

  let hitsOrf = [];
  function render() {
    const body = $('#anBody'), t = current();
    const sel = $('#anSeq');
    if (!t) { sel.innerHTML = ''; body.innerHTML = '<div class="hint" style="padding:40px">Add a sequence to analyse it here.</div>'; return; }
    const list = targets();
    sel.innerHTML = list.map((x) => `<option value="${x.key}" ${x.key === t.key ? 'selected' : ''}>${esc(x.name)} (${fmt(x.seq.length)} ${x.type === 'dna' ? 'bp' : 'aa'})</option>`).join('');
    const dna = t.type === 'dna', orfs = dna ? orfsOf(t) : [], th = A.theme;
    let h = '';
    if (dna) {
      h += `<div class="card an"><h4>Open reading frames <span class="r muted">min <input class="field num-in" id="anMinOrf" type="number" min="10" max="2000" value="${an.minOrf}"> aa · ${esc(BW.codonTable(A.S.opts.code).name)}</span></h4>
        <canvas id="cvOrf"></canvas>
        <div class="orf-list">${orfs.length ? orfs.slice(0, 60).map((o, i) => `<div class="orf ${an.orf === i ? 'on' : ''}" data-orf="${i}"><span>${o.strand > 0 ? '→' : '←'} <b>${fmt(o.start)}–${fmt(o.end)}</b> <span class="muted">F${o.strand > 0 ? '+' : '−'}${o.frame}${o.open ? ' · open' : ''}</span></span><span class="muted">${o.aa} aa</span><span class="acts"><button class="btn sm" data-a="prot">Translate</button>${t.row ? '<button class="btn sm" data-a="sel">Select</button>' : ''}</span></div>`).join('') : `<div class="muted" style="padding:8px 0">No open reading frames of at least ${an.minOrf} aa.</div>`}</div>
        <div id="orfProt"></div></div>`;
      h += `<div class="card an"><h4>G+C frame plot <span class="r muted">window <select class="sel" id="anWin">${[60, 120, 240, 480].map((w) => `<option ${w === an.win ? 'selected' : ''}>${w}</option>`).join('')}</select> bp</span></h4>
        <canvas id="cvGc"></canvas><div class="muted note">GC content at each of the three codon positions. In a coding region one position — usually the third — stands out from the others, which marks the reading frame.</div></div>`;
      const sites = sitesOf(t), all = Object.values(sites);
      const flt = an.filter, shown = all.filter((e) => flt === 0 || (flt === 3 ? e.hits.length >= 3 : e.hits.length === flt)).sort((a, b) => a.hits[0].cut - b.hits[0].cut);
      const key = t.key + ':' + t.seq.length;
      if (an.enzKey !== key) { an.enzKey = key; an.enz = new Set(all.filter((e) => e.hits.length === 1).slice(0, 10).map((e) => e.name)); }
      h += `<div class="card an"><h4>Restriction map &amp; fragments <span class="r muted"><label class="chk"><input type="checkbox" id="anCirc" ${an.circular ? 'checked' : ''}> circular</label></span></h4>
        <div class="pill-row">${[[1, 'Unique'], [2, 'Two cuts'], [3, '3+'], [0, 'All']].map(([v, l]) => `<button class="btn sm ${flt === v ? 'on' : ''}" data-rf="${v}">${l}</button>`).join('')}<button class="btn sm" data-a="enzall">Select shown</button><button class="btn sm" data-a="enznone">Clear</button></div>
        <div class="enz">${shown.length ? shown.slice(0, 200).map((e) => `<label title="${e.site} — ${e.hits.length} cut${e.hits.length > 1 ? 's' : ''}"><input type="checkbox" data-enz="${e.name}" ${an.enz.has(e.name) ? 'checked' : ''}>${e.name}<small>${e.hits.length}</small></label>`).join('') : '<span class="muted">No enzymes cut this many times.</span>'}</div>
        <canvas id="cvRes"></canvas><div id="fragTable"></div>
        <details><summary>Non-cutters (${BW.nonCutters(sites).length})</summary><div class="muted note" style="line-height:1.7">${BW.nonCutters(sites).join(', ')}</div></details></div>`;
    }
    const srcs = proteinSources(t, orfs);
    if (srcs.length) {
      if (an.orf >= 0 && t.type === 'dna') { /* keep */ }
      const si = Math.max(0, srcs.findIndex((s) => s.i === an.orf));
      h += `<div class="card an"><h4>Protein profiles <span class="r muted">${t.type === 'dna' ? `<select class="sel" id="anSrc">${srcs.map((s, i) => `<option value="${i}" ${i === si ? 'selected' : ''}>${esc(s.label)}</option>`).join('')}</select>` : ''}</span></h4>
        <div class="pill-row">${Object.entries(BW.SCALES).map(([k, s]) => `<button class="btn sm ${an.scale === k ? 'on' : ''}" data-scale="${k}">${s.name.split(' (')[0]}</button>`).join('')}<span class="muted" style="margin-left:6px">window <input class="field num-in" id="anSWin" type="number" min="3" max="41" step="2" value="${an.swin || BW.SCALES[an.scale].win}"></span></div>
        <canvas id="cvProf"></canvas><div class="muted note" id="profNote"></div></div>`;
      h += `<div class="card an"><h4>Reverse translation <span class="r muted">IUPAC-degenerate DNA</span></h4>
        <textarea class="field mono" id="anRev" spellcheck="false" placeholder="Protein sequence">${esc(an.rev || srcs[si].prot)}</textarea>
        <div id="revOut"></div></div>`;
    } else if (!dna) h += '';
    body.innerHTML = h;
    bind(t, orfs);
    drawAll(t, orfs, th);
  }

  function drawAll(t, orfs, th) {
    th = th || A.theme;
    if (t.type === 'dna') {
      let cv = $('#cvOrf'); if (cv) { const f = fit(cv, 210); hitsOrf = BW.drawOrfMap(f.ctx, f.W, f.H, t.seq.length, orfs, th, an.orf); }
      cv = $('#cvGc'); if (cv) {
        const f = fit(cv, 200), g = BW.gcFrame(t.seq, an.win), cols = ['#2563eb', '#e8a317', '#2fa66a'];
        BW.drawPlot(f.ctx, f.W, f.H, g.xs, [{ ys: g.f[0], color: cols[0], label: 'position 1' }, { ys: g.f[1], color: cols[1], label: 'position 2' }, { ys: g.f[2], color: cols[2], label: 'position 3' }, { ys: g.all, color: th.muted, label: 'all', width: 1.2 }], th, { ymin: 0, ymax: 100, xmax: t.seq.length, xlabel: 'position (bp)' });
      }
      cv = $('#cvRes'); if (cv) drawRestriction(t, cv, th);
    }
    drawProfile(t, orfs, th); drawReverse(t, orfs, th);
  }

  function enzItems(t) { const sites = sitesOf(t); return [...an.enz].filter((n) => sites[n]).map((n) => ({ name: n, cuts: [...new Set(sites[n].hits.map((h) => h.cut))].sort((a, b) => a - b), site: sites[n].site })); }
  function drawRestriction(t, cv, th, W, H, ctxIn) {
    const items = enzItems(t), n = t.seq.length;
    const f = ctxIn ? { ctx: ctxIn, W, H } : fit(cv, an.circular ? 360 : 160);
    BW.drawRestrictionMap(f.ctx, f.W, f.H, n, items, th, an.circular);
    if (!ctxIn) {
      const frags = BW.digest(n, items.flatMap((i) => i.cuts), an.circular);
      $('#fragTable').innerHTML = items.length ? `<table class="frag"><tr><th>#</th><th>Start</th><th>End</th><th class="r">Size (bp)</th></tr>${[...frags].sort((a, b) => b.len - a.len).map((fr, i) => `<tr><td>${i + 1}</td><td>${fmt(fr.start)}</td><td>${fmt(fr.end)}${fr.wrap ? ' <span class="muted">(wraps)</span>' : ''}</td><td class="r">${fmt(fr.len)}</td></tr>`).join('')}</table><div class="pill-row" style="margin-top:8px"><button class="btn sm" data-a="copyfrag">Copy table</button></div>` : '<div class="muted note">Tick enzymes above to digest the sequence.</div>';
    }
  }

  function currentProtein(t, orfs) {
    const srcs = proteinSources(t, orfs); if (!srcs.length) return null;
    const sel = $('#anSrc'); const i = sel ? +sel.value : 0; return srcs[Math.min(i, srcs.length - 1)];
  }
  function drawProfile(t, orfs, th, ctxIn, W, H) {
    const cv = $('#cvProf'); if (!cv && !ctxIn) return;
    const src = currentProtein(t, orfs); if (!src) return;
    const sc = BW.SCALES[an.scale], win = an.swin || sc.win, ys = BW.profile(src.prot, an.scale, win), xs = ys.map((_, i) => i + 1);
    const shade = [];
    if (sc.thr !== 0 || an.scale === 'kt') { let a = -1; ys.forEach((v, i) => { if (v > sc.thr) { if (a < 0) a = i; } else if (a >= 0) { if (i - a >= 6) shade.push([a + 1, i]); a = -1; } }); if (a >= 0 && ys.length - a >= 6) shade.push([a + 1, ys.length]); }
    const f = ctxIn ? { ctx: ctxIn, W, H } : fit(cv, 220);
    BW.drawPlot(f.ctx, f.W, f.H, xs, [{ ys, color: th.accent }], th, { title: sc.name + ' · window ' + win, hline: sc.thr, shade: an.scale === 'kt' ? shade : null, xlabel: 'residue', xmax: Math.max(10, ys.length) });
    if (!ctxIn) {
      let note = sc.hint;
      if (an.scale === 'kt') note += shade.length ? ` Antigenic regions (≥ 6 aa): ${shade.map(([a, b]) => `${a}–${b}`).join(', ')}.` : ' No region reaches the threshold.';
      if (an.scale === 'kd') { const w19 = BW.profile(src.prot, 'kd', 19), tm = []; let a = -1; w19.forEach((v, i) => { if (v > 1.6) { if (a < 0) a = i; } else if (a >= 0) { tm.push([a + 1, i]); a = -1; } }); note += tm.length ? ` Possible transmembrane segments (19-aa window > 1.6): ${tm.map(([a, b]) => `${a}–${b}`).join(', ')}.` : ' No window above 1.6 over 19 residues.'; }
      $('#profNote').textContent = note;
    }
  }

  function drawReverse(t, orfs, th) {
    const ta = $('#anRev'); if (!ta) return;
    const prot = ta.value.toUpperCase().replace(/[^A-Z*]/g, ''), out = $('#revOut');
    if (!prot) { out.innerHTML = ''; return; }
    const r = BW.revTranslate(prot, A.S.opts.code), exact = r.codons.filter((c) => c.exact).length, tot = r.degeneracy.reduce((x, y) => x * Math.min(y, 1e6), 1);
    out.innerHTML = `<div class="protein-out" style="margin-top:8px">${esc(r.dna)}</div>
      <div class="muted note">${r.dna.length} nt · ${exact} of ${r.codons.length} codons fully degenerate-exact${exact < r.codons.length ? `; for Leu, Ser, Arg and stop the largest exact block is used (it covers ${r.codons.filter((c) => !c.exact).map((c) => c.cover + '/' + c.total).filter((v, i, a) => a.indexOf(v) === i).join(', ')} of the synonymous codons).` : '.'} Total variants: ${tot > 1e12 ? '≈ 10^' + Math.round(Math.log10(tot)) : fmt(tot)}.</div>
      <canvas id="cvRev" style="margin-top:6px"></canvas>
      <div class="pill-row" style="margin-top:8px"><button class="btn sm" data-a="revcopy">Copy DNA</button><button class="btn sm" data-a="revadd">Add as sequence</button></div>`;
    const cv = $('#cvRev'), f = fit(cv, 110); BW.drawBars(f.ctx, f.W, f.H, r.degeneracy.flatMap((d) => [d]), th);
    an.revDna = r.dna;
  }

  /* ---------------- events ---------------- */
  function bind(t, orfs) {
    const body = $('#anBody');
    const mo = $('#anMinOrf'); if (mo) mo.onchange = () => { an.minOrf = Math.max(10, +mo.value || 50); an.orf = -1; render(); };
    const w = $('#anWin'); if (w) w.onchange = () => { an.win = +w.value; drawAll(t, orfs); };
    const c = $('#anCirc'); if (c) c.onchange = () => { an.circular = c.checked; drawAll(t, orfs); };
    const sw = $('#anSWin'); if (sw) sw.onchange = () => { an.swin = Math.max(3, +sw.value | 1); drawAll(t, orfs); };
    const src = $('#anSrc'); if (src) src.onchange = () => { an.rev = ''; $('#anRev').value = currentProtein(t, orfs).prot; drawAll(t, orfs); };
    const rv = $('#anRev'); if (rv) rv.oninput = () => { an.rev = rv.value; drawReverse(t, orfs, A.theme); };
    body.onchange = (e) => { const cb = e.target.closest('[data-enz]'); if (cb) { cb.checked ? an.enz.add(cb.dataset.enz) : an.enz.delete(cb.dataset.enz); drawRestriction(t, $('#cvRes'), A.theme); } };
    const cvo = $('#cvOrf');
    if (cvo) cvo.onclick = (e) => { const r = cvo.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top; const h = hitsOrf.find((k) => x >= k.x && x <= k.x + k.w && y >= k.y && y <= k.y + k.h); if (h) { an.orf = h.i; showProt(t, orfs); render(); } };
    body.onclick = (e) => {
      const rf = e.target.closest('[data-rf]'); if (rf) { an.filter = +rf.dataset.rf; render(); return; }
      const sc = e.target.closest('[data-scale]'); if (sc) { an.scale = sc.dataset.scale; an.swin = 0; render(); return; }
      const row = e.target.closest('[data-orf]'), a = e.target.closest('[data-a]');
      if (row) {
        const i = +row.dataset.orf, o = orfs[i];
        if (a && a.dataset.a === 'sel' && t.row) { const ri = A.rows().indexOf(t.row); A.selectResidueRange(ri, o.start - 1, o.end - 1); A.setView('align'); return; }
        an.orf = i; if (!(a && a.dataset.a === 'prot')) { render(); return; } render(); showProt(t, orfs); return;
      }
      if (!a) return;
      switch (a.dataset.a) {
        case 'enzall': $$all('[data-enz]').forEach((cb) => { cb.checked = true; an.enz.add(cb.dataset.enz); }); drawRestriction(t, $('#cvRes'), A.theme); break;
        case 'enznone': an.enz.clear(); $$all('[data-enz]').forEach((cb) => (cb.checked = false)); drawRestriction(t, $('#cvRes'), A.theme); break;
        case 'copyfrag': { const items = enzItems(t), fr = BW.digest(t.seq.length, items.flatMap((i) => i.cuts), an.circular).sort((x, y) => y.len - x.len); A.copyText('#\tStart\tEnd\tSize\n' + fr.map((f, i) => `${i + 1}\t${f.start}\t${f.end}\t${f.len}`).join('\n'), 'Fragment table copied'); break; }
        case 'revcopy': A.copyText(an.revDna, 'DNA copied'); break;
        case 'revadd': A.addSeqs([A.makeSeq({ name: (t.name + '_backtranslated').replace(/\s+/g, '_'), seq: an.revDna, type: 'dna', group: 0 })], 'Added the degenerate DNA as a new sequence'); break;
        case 'protcopy': A.copyText(a.dataset.p, 'Protein copied'); break;
        case 'protadd': A.addSeqs([A.makeSeq({ name: a.dataset.n, seq: a.dataset.p, type: 'protein', group: 0 })], 'Added the protein as a new sequence'); break;
      }
    };
    body.querySelectorAll('canvas').forEach(() => {});
    if (an.orf >= 0) showProt(t, orfs);
  }
  const $$all = (s) => [...document.querySelectorAll('#anBody ' + s)];
  function showProt(t, orfs) {
    const o = orfs[an.orf], box = $('#orfProt'); if (!o || !box) return;
    const p = o.protein.replace(/\*$/, ''), nm = `${t.name}_ORF_${o.start}-${o.end}${o.strand < 0 ? 'c' : ''}`.replace(/\s+/g, '_');
    box.innerHTML = `<div class="pill-row" style="margin-top:10px"><span class="chip">${o.strand > 0 ? '+' : '−'}${o.frame}</span><span class="muted">${fmt(o.start)}–${fmt(o.end)} · ${o.aa} aa</span></div><div class="protein-out">${esc(p)}</div><div class="pill-row" style="margin-top:8px"><button class="btn sm" data-a="protcopy" data-p="${p}">Copy protein</button><button class="btn sm" data-a="protadd" data-p="${p}" data-n="${esc(nm)}">Add as sequence</button></div>`;
  }

  /* ---------------- report pages ---------------- */
  BW.analysisPages = (app, th) => {
    const t = current(); if (!t) return [];
    const pages = [], orfs = t.type === 'dna' ? orfsOf(t) : [], PW = 770, PH = 513, foot = `${t.name} · sequence analysis`;
    const block = (c, y, h, title, draw) => {
      c.font = '700 11px Helvetica'; c.fillStyle = '#1c2230'; c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.fillText(title, 0, y + 11);
      c.save(); c.translate(0, y + 18); c.beginPath(); c.rect(0, 0, PW, h); c.clip(); draw(c, PW, h); c.restore();
      c.strokeStyle = th.line; c.lineWidth = 0.8; c.strokeRect(0, y + 18, PW, h);
    };
    const hdr = (c, sub) => { c.font = '700 15px Helvetica'; c.fillStyle = '#1c2230'; c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.fillText(sub, 0, 16); c.fillStyle = th.line; c.fillRect(0, 26, PW, 0.8); };
    if (t.type === 'dna') {
      pages.push({ W: PW, H: PH, foot, fn: (c) => {
        hdr(c, `Sequence analysis · ${t.name} · ${fmt(t.seq.length)} bp`);
        block(c, 36, 215, `Open reading frames (≥ ${an.minOrf} aa, ${BW.codonTable(A.S.opts.code).name})`, (cc, w, h) => BW.drawOrfMap(cc, w, h, t.seq.length, orfs, th, -1));
        const g = BW.gcFrame(t.seq, an.win);
        block(c, 270, 200, `G+C frame plot (window ${an.win} bp)`, (cc, w, h) => BW.drawPlot(cc, w, h, g.xs, [{ ys: g.f[0], color: '#2563eb', label: 'position 1' }, { ys: g.f[1], color: '#e8a317', label: 'position 2' }, { ys: g.f[2], color: '#2fa66a', label: 'position 3' }, { ys: g.all, color: '#667085', label: 'all', width: 1.2 }], th, { ymin: 0, ymax: 100, xmax: t.seq.length, xlabel: 'position (bp)' }));
      } });
      const items = enzItems(t);
      if (items.length) pages.push({ W: PW, H: PH, foot, fn: (c) => {
        hdr(c, `Restriction map · ${t.name}`);
        const mh = an.circular ? 300 : 150;
        block(c, 36, mh, `${items.length} enzyme${items.length > 1 ? 's' : ''}${an.circular ? ' · circular' : ''}`, (cc, w, h) => BW.drawRestrictionMap(cc, w, h, t.seq.length, items, th, an.circular));
        const fr = BW.digest(t.seq.length, items.flatMap((i) => i.cuts), an.circular).sort((x, y) => y.len - x.len);
        let y = 36 + mh + 40; c.font = '700 8px Helvetica'; c.fillStyle = '#667085'; ['#', 'START', 'END', 'SIZE (BP)'].forEach((h, i) => { c.textAlign = i === 3 ? 'right' : 'left'; c.fillText(h, [0, 40, 130, 330][i], y); });
        c.font = '9px Helvetica'; c.fillStyle = '#1c2230';
        fr.slice(0, Math.floor((PH - y - 30) / 12)).forEach((f, i) => { y += 12; c.textAlign = 'left'; c.fillText(String(i + 1), 0, y); c.fillText(fmt(f.start), 40, y); c.fillText(fmt(f.end) + (f.wrap ? ' (wraps)' : ''), 130, y); c.textAlign = 'right'; c.fillText(fmt(f.len), 330, y); });
      } });
    }
    const srcs = proteinSources(t, orfs);
    if (srcs.length) { const prot = srcs[0].prot; pages.push({ W: PW, H: PH, foot, fn: (c) => {
      hdr(c, `Protein profiles · ${srcs[0].label}`);
      Object.entries(BW.SCALES).forEach(([k, sc], i) => {
        const ys = BW.profile(prot, k, sc.win);
        block(c, 36 + i * 152, 128, sc.name, (cc, w, h) => BW.drawPlot(cc, w, h, ys.map((_, j) => j + 1), [{ ys, color: '#2563eb' }], th, { hline: sc.thr, xmax: Math.max(10, ys.length), xlabel: 'residue' }));
      });
    } }); }
    return pages;
  };

  BW.initAnalysis = (app) => {
    A = app;
    const ro = new ResizeObserver(() => { if (A.S.opts.view === 'analysis') { const t = current(); if (t) drawAll(t, t.type === 'dna' ? orfsOf(t) : []); } });
    ro.observe($('#anBody'));
    $('#anSeq').onchange = (e) => { an.key = e.target.value; an.orf = -1; an.rev = ''; render(); };
    BW.analysis = { render, pages: (th) => BW.analysisPages(app, th) };
  };
})();
