/* QualityScale application: state, views, menus, inspector and file handling. */
(function () {
  'use strict';
  const QS = window.QS, esc = QS.esc, num = QS.num, fx = QS.f;
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const ST = { pass: 'Pass', warn: 'Warning', fail: 'Fail', info: 'Info', na: 'n/a' };
  const SCOL = ['#2563eb', '#e5484d', '#16a34a', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#65a30d'];
  const TRIM_MODS = ['pbq', 'pqh', 'pbc', 'nc', 'adp'];
  const MOPTS = {
    pbq: [['mode', [['box', 'Box plot'], ['line', 'Lines'], ['q30', '% ≥ Q']]]],
    tile: [['mode', [['tile', 'By tile'], ['flow', 'Flow-cell layout']]]],
    pbc: [['mode', [['lines', 'Lines'], ['stack', 'Stacked'], ['bias', 'Bias map']]]],
    gc: [['mode', [['hist', 'Histogram'], ['cum', 'Cumulative']]]],
    len: [['mode', [['hist', 'Histogram'], ['log', 'Log scale'], ['cum', 'Cumulative']]]],
    ee: [['mode', [['read', 'Per read'], ['along', 'Along the read']]]],
  };

  /* ------------------------------------------------------------ icons */
  const ICONS = {
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>', open: '<path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>',
    moon: '<path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z"/>', sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 114 2c-.9.6-1.5 1.1-1.5 2.2M12 17h.01"/>', 'panel-l': '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>', 'panel-r': '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>', check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    scissors: '<circle cx="6" cy="6" r="2.6"/><circle cx="6" cy="18" r="2.6"/><path d="M8 7.5L20 18M8 16.5L20 6"/>', sliders: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
    download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>', spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M18 16l.8 2.2L21 19l-2.2.8L18 22l-.8-2.2L15 19l2.2-.8z"/>',
    paste: '<rect x="6" y="5" width="12" height="16" rx="2"/><path d="M9 5V4h6v1M9 11h6M9 15h4"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>', plus: '<path d="M12 5v14M5 12h14"/>',
    dash: '<rect x="3" y="3" width="8" height="10" rx="2"/><rect x="13" y="3" width="8" height="6" rx="2"/><rect x="13" y="11" width="8" height="10" rx="2"/><rect x="3" y="15" width="8" height="6" rx="2"/>',
    grid: '<rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/>',
    focus: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>', compare: '<path d="M7 4v16M17 4v16M3 8l4-4 4 4M13 16l4 4 4-4"/>', 'chev-l': '<path d="M15 6l-6 6 6 6"/>', 'chev-r': '<path d="M9 6l6 6-6 6"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M21 16l-5-5-8 8"/>', table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M3 14h18M9 4v16"/>', expand: '<path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2"/>', refresh: '<path d="M20 12a8 8 0 11-2.6-5.9"/><path d="M20 4v5h-5"/>', file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>',
    save: '<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>', alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17h.01"/>', bolt: '<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>',
  };
  const icon = (n) => `<svg class="i" viewBox="0 0 24 24">${ICONS[n] || ''}</svg>`;
  const hydrate = (root) => $$('[data-i]', root).forEach((el) => { if (!el.dataset.done) { el.innerHTML = icon(el.dataset.i); el.style.display = 'inline-flex'; el.dataset.done = 1; } });

  /* ------------------------------------------------------------ state */
  const S = { samples: [], sel: -1, view: 'dash', mod: 'pbq', opts: {}, limits: QS.defaultLimits(), preset: 'Standard', readLimit: 1000000, side: 'samples', insp: 'details', showTrim: false, adapters: null, contam: null, sortCmp: 'score', sortDir: -1, limVer: 0, busy: 0 };
  let sid = 1, colorIdx = 0;
  const load = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
  { const l = load('qs-limits', null); if (l) Object.keys(S.limits).forEach((k) => { if (l[k]) S.limits[k] = l[k]; }); S.preset = load('qs-preset', 'Standard'); S.readLimit = load('qs-readlimit', 1000000); S.adapters = load('qs-adapters', null); S.contam = load('qs-contam', null); }

  const dark = () => document.documentElement.dataset.theme === 'dark';
  const pal = () => QS.palette(dark());
  const cur = () => S.samples[S.sel];
  const done = () => S.samples.filter((s) => s.res);
  const modInfo = (id) => QS.mod(id);

  /* ------------------------------------------------------------ small UI helpers */
  function toast(msg, err) { const t = document.createElement('div'); t.className = 'toast' + (err ? ' err' : ''); t.textContent = msg; $('#toasts').appendChild(t); setTimeout(() => t.remove(), err ? 6000 : 2800); }
  function dlg(o) {
    const d = $('#dlg'); d.style.width = (o.width || 560) + 'px';
    d.innerHTML = `<div class="dh"><h3>${esc(o.title)}</h3><span class="spacer"></span><button class="ico-btn" data-close>${icon('x')}</button></div><div class="db">${o.body}</div><div class="df">${(o.buttons || [{ l: 'Close' }]).map((b, i) => `<button class="btn ${b.primary ? 'primary' : ''}" data-b="${i}">${esc(b.l)}</button>`).join('')}</div>`;
    d.onclick = (e) => { if (e.target.closest('[data-close]')) d.close(); const b = e.target.closest('[data-b]'); if (b) { const def = (o.buttons || [{}])[+b.dataset.b]; if (!def.f || def.f(d) !== false) d.close(); } };
    d.showModal(); return d;
  }
  function download(name, data, mime) { const b = data instanceof Blob ? data : new Blob([data], { type: mime || 'text/plain' }), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
  const base = (s) => s.name.replace(/\.(gz|fastq|fq|fasta|fa|fna|txt)/gi, '').replace(/[^\w.-]+/g, '_');
  const chip = (st) => `<span class="chip ${st}">${ST[st]}</span>`;

  /* ------------------------------------------------------------ analysis */
  function evalAll() { S.samples.forEach((s) => { if (s.res) s.ev = QS.evaluate(s.res, S.limits); }); S.limVer++; }
  function newSample(name) { const s = { id: sid++, name, color: SCOL[colorIdx++ % SCOL.length], state: 'run', progress: 0, reads: 0 }; S.samples.push(s); if (S.sel < 0 || S.samples.length === 1) S.sel = S.samples.length - 1; return s; }
  function finishSample(s, res, file) {
    s.res = res; s.ev = QS.evaluate(res, S.limits); s.state = 'done'; s.file = file || s.file; s.trim = null;
    if (res.name && s.name !== res.name && !s.keepName) s.name = res.name;
    const first = done().length === 1; if (first) { S.sel = S.samples.indexOf(s); }
  }
  /* analysis runs in web workers (up to three in parallel) and falls back to the main thread when workers are unavailable */
  const MAXW = Math.max(1, Math.min(3, (navigator.hardwareConcurrency || 4) - 1)), jobs = []; let active = 0, workerOK = typeof Worker !== 'undefined';
  function pump() { while (jobs.length && active < (workerOK ? MAXW : 1)) { const j = jobs.shift(); active++; j().finally(() => { active--; pump(); }); } }
  const optsNow = () => ({ limit: S.readLimit, adapters: S.adapters || undefined, contaminants: S.contam || undefined });
  function inWorker(msg, s) {
    return new Promise((ok, no) => {
      let w, got = false; try { w = new Worker('js/worker.js?v=1'); } catch (e) { return no(Object.assign(e, { noWorker: true })); }
      s.abort = () => { w.terminate(); no(new Error('cancelled')); };
      w.onmessage = (ev) => { got = true; const m = ev.data; if (m.t === 'p') { s.progress = m.p; s.reads = m.n; progressSoon(); } else { w.terminate(); m.t === 'done' ? ok(m.res) : no(new Error(m.msg)); } };
      w.onerror = (ev) => { w.terminate(); no(Object.assign(new Error(ev.message || 'The worker failed'), { noWorker: !got })); };
      w.postMessage(msg);
    });
  }
  async function analyze(s, file, demoKind) {
    if (workerOK) {
      try { return await inWorker(demoKind ? { demo: demoKind, opts: optsNow() } : { file, opts: optsNow() }, s); } catch (e) { if (!e.noWorker) throw e; workerOK = false; }
    }
    if (demoKind) { await new Promise((r) => setTimeout(r, 30)); const res = QS.analyzeText(QS.makeDemo(demoKind), QS.demoName(demoKind), optsNow()); res.name = QS.demoName(demoKind); return res; }
    const ac = new AbortController(); s.abort = () => ac.abort();
    return QS.analyzeFile(file, Object.assign(optsNow(), { signal: ac.signal, onProgress: (p, n) => { s.progress = p; s.reads = n; progressSoon(); } }));
  }
  function runFiles(files) {
    files = [...files]; if (!files.length) return;
    const texts = files.filter((f) => /\.(qualityscale|json)$/i.test(f.name)), seqs = files.filter((f) => !texts.includes(f));
    texts.forEach((f) => f.text().then(loadResultsText).catch((e) => toast(e.message, true)));
    seqs.forEach((file) => {
      const s = newSample(file.name); s.file = file; S.busy++; render();
      jobs.push(async () => {
        try { const res = await analyze(s, file); if (s.removed) { S.busy--; return; } finishSample(s, res, file); toast(`${file.name}: ${num(res.n)} reads analysed`); }
        catch (e) { if (e.message !== 'cancelled') { s.state = 'err'; s.err = e.message; toast(file.name + ': ' + e.message, true); } }
        S.busy--; render();
      });
    });
    pump();
  }
  let pgPending = false;
  function progressSoon() { if (pgPending) return; pgPending = true; setTimeout(() => { pgPending = false; renderSide(); renderStatus(); const s = cur(); if (s && s.state === 'run') renderMain(true); }, 120); }
  function loadResultsText(txt) {
    const o = QS.unpackRes(txt); if (!o || o.app !== 'qualityscale' || !Array.isArray(o.samples)) throw new Error('This is not a QualityScale results file.');
    o.samples.forEach((r) => { const s = newSample(r.name); s.keepName = true; finishSample(s, r); }); S.view = 'dash'; render(); toast('Loaded ' + o.samples.length + ' result set(s)');
  }
  function demo(kinds) {
    kinds = kinds || QS.demoKinds;
    const all = kinds.map((k) => { const s = newSample(QS.demoName(k)); s.keepName = true; S.busy++; return [k, s]; }); render();
    return Promise.all(all.map(([k, s]) => new Promise((resolve) => {
      jobs.push(async () => {
        try { const res = await analyze(s, null, k); if (!s.removed) finishSample(s, res); } catch (e) { if (e.message !== 'cancelled') { s.state = 'err'; s.err = e.message; } }
        S.busy--; render(); resolve();
      }); pump();
    })));
  }
  function pasteDlg() {
    dlg({ title: 'Paste reads', width: 620, body: '<p class="muted" style="margin-top:0">Paste FASTQ or FASTA text (a few thousand reads are enough).</p><textarea id="pasteTxt" placeholder="@read1&#10;ACGT…&#10;+&#10;IIII…" spellcheck="false"></textarea>', buttons: [{ l: 'Cancel' }, { l: 'Analyse', primary: true, f: () => { const t = $('#pasteTxt').value.trim(); if (!t) return false; try { const s = newSample('Pasted reads'); s.keepName = true; finishSample(s, QS.analyzeText(t + '\n', 'Pasted reads', { limit: 0 })); S.view = 'dash'; render(); } catch (e) { toast(e.message, true); S.samples.pop(); S.sel = S.samples.length - 1; render(); } } }] });
  }

  /* ------------------------------------------------------------ chart helpers */
  const cache = new Map();
  function trimOf(s) {
    if (!s.trim) { const a = QS.trimAdvice(s.res); s.trim = { t5: a.t5, keep: a.keep, minLen: 30, adv: a, manual: false }; }
    return s.trim;
  }
  function chart(s, id, w, h, extra) {
    const t = S.showTrim && TRIM_MODS.includes(id) && s.res.hasQual !== undefined ? trimOf(s) : null, opts = S.opts[id] || {};
    const key = [s.id, id, dark(), JSON.stringify(opts), S.limVer, t ? t.t5 + ':' + t.keep : '', w, h, extra || ''].join('|');
    let v = cache.get(key);
    if (v === undefined) { v = QS.renderMod(id, s.res, { P: pal(), lim: S.limits, w, h, opts, rows: extra === 'full' ? 40 : 7, trim: t ? { show: true, t5: t.t5, keep: t.keep } : null }); if (cache.size > 400) cache.clear(); cache.set(key, v); }
    return v;
  }
  function optBar(id) {
    const defs = MOPTS[id]; if (!defs) return '';
    let h = defs.map(([k, list]) => { const v = (S.opts[id] || {})[k] || list[0][0]; return `<div class="seg">${list.map(([val, lab]) => `<button class="${v === val ? 'on' : ''}" data-act="opt:${id}:${k}:${val}">${lab}</button>`).join('')}</div>`; }).join('');
    if (id === 'pbc' && (S.opts.pbc || {}).mode !== 'stack' && (S.opts.pbc || {}).mode !== 'bias') h += `<label class="chk"><input type="checkbox" data-opt="pbc:zoom" ${(S.opts.pbc || {}).zoom ? 'checked' : ''}>Zoom Y axis</label>`;
    if (id === 'gc' && ((S.opts.gc || {}).mode || 'hist') === 'hist') h += `<select class="sel" style="width:auto" data-opt="gc:ref"><option value="-1">Reference genome GC…</option>${QS.GENOME_GC.map((g, i) => `<option value="${i}" ${(S.opts.gc || {}).ref === i ? 'selected' : ''}>${esc(g[0])} (${g[1]}%)</option>`).join('')}</select>`;
    return h;
  }
  const tools = (s, id) => `<span class="tools">${QS.CHART_HTML[id] ? '' : `<button class="ico-btn" title="Save as SVG" data-act="svg:${id}">${icon('image')}</button><button class="ico-btn" title="Save as PNG" data-act="png:${id}">${icon('download')}</button>`}${QS.csv[id] ? `<button class="ico-btn" title="Save data as CSV" data-act="csv:${id}">${icon('table')}</button>` : ''}</span>`;

  /* ------------------------------------------------------------ paired-end detection */
  function pairKey(n) {
    const b = n.replace(/\.(gz|fastq|fq|fasta|fa|fna)/gi, ''), re = /([\s._·-])R?([12])(?=[\s._·-]|$)/g; let m, last = null;
    while ((m = re.exec(b))) last = m;
    return last ? { key: (b.slice(0, last.index) + b.slice(last.index + last[0].length)).replace(/[\s._·-]+$/, ''), role: 'R' + last[2] } : null;
  }
  function findPairs() {
    const g = new Map();
    done().forEach((s) => { const k = pairKey(s.name); if (!k) return; if (!g.has(k.key)) g.set(k.key, {}); g.get(k.key)[k.role] = s; });
    return [...g.entries()].filter(([, v]) => v.R1 && v.R2).map(([key, v]) => ({ key, r1: v.R1, r2: v.R2, info: QS.pairInfo(v.R1.res, v.R2.res) }));
  }
  const pairOf = (s) => findPairs().find((p) => p.r1 === s || p.r2 === s);

  /* ------------------------------------------------------------ views */
  function ring(score, grade) {
    const c = 2 * Math.PI * 64, col = score >= 80 ? 'var(--ok)' : score >= 60 ? '#f59e0b' : 'var(--bad)';
    return `<svg viewBox="0 0 160 160" class="ring"><circle cx="80" cy="80" r="64" fill="none" stroke="var(--line)" stroke-width="12"/><circle cx="80" cy="80" r="64" fill="none" stroke="${col}" stroke-width="12" stroke-linecap="round" stroke-dasharray="${(c * score) / 100} ${c}" transform="rotate(-90 80 80)"/><text x="80" y="88" text-anchor="middle" font-size="44" font-weight="700" fill="var(--text)" letter-spacing="-1">${score}</text><text x="80" y="110" text-anchor="middle" font-size="13" fill="var(--muted)">Grade ${grade}</text></svg>`;
  }
  const kpi = (l, v, sub, bar, col) => `<div class="kpi card"><div class="l">${l}</div><div class="v">${v}</div><div class="s">${sub || '&nbsp;'}</div>${bar !== undefined ? `<div class="bar"><i style="width:${Math.max(2, Math.min(100, bar))}%;background:${col || 'var(--accent)'}"></i></div>` : ''}</div>`;

  function viewDash(s) {
    const r = s.res, ev = s.ev, d = QS.derive(r), m = QS.metrics(r, ev), fnd = QS.insights(r, ev), pr = pairOf(s);
    if (pr) { const o = pr.info, mate = pr.r1 === s ? pr.r2 : pr.r1; if (o.st === 'fail') fnd.unshift({ sev: 'fail', mod: 'basic', title: 'Mates are out of sync', text: `${mate.name}: ${o.note}` }); else fnd.push({ sev: 'info', mod: 'basic', title: 'Paired with ' + mate.name, text: `${o.note} Mean quality ${pr.r1 === s ? 'R1' : 'R2'} Q${fx(pr.r1 === s ? o.qa : o.qb, 1)} versus mate Q${fx(pr.r1 === s ? o.qb : o.qa, 1)}.`, act: { label: 'Compare mates', act: 'view:cmp' } }); }
    const worst = fnd.filter((x) => x.sev === 'fail').length, warn = fnd.filter((x) => x.sev === 'warn').length;
    const sum = worst + warn === 0 ? 'Everything looks healthy. No check needs attention.' : `${worst ? worst + ' check' + (worst > 1 ? 's' : '') + ' failed' : ''}${worst && warn ? ' and ' : ''}${warn ? warn + ' raised warnings' : ''}. See the findings below for what to do next.`;
    let h = `<div class="wrap"><div class="hero card">${ring(ev.score, ev.grade)}<div><h1>${esc(s.name)}</h1><div class="chips"><span class="chip acc">${r.fmt}${r.gz ? ' · gzip' : ''}</span>${r.hasQual ? `<span class="chip">${esc(r.enc.name)}</span>` : '<span class="chip warn">no qualities</span>'}<span class="chip">${r.minLen === r.maxLen ? r.maxLen + ' bp' : r.minLen + '–' + r.maxLen + ' bp'}</span>${r.truncated ? `<span class="chip warn">first ${QS.si(r.limit)} reads</span>` : ''}<span class="chip pass">${ev.cnt.pass} pass</span><span class="chip warn">${ev.cnt.warn} warn</span><span class="chip fail">${ev.cnt.fail} fail</span></div><p>${sum}</p><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" data-act="view:report">${icon('grid')}Open full report</button>${r.hasQual ? `<button class="btn" data-act="tab-trim">${icon('scissors')}Trim advisor</button>` : ''}<button class="btn" data-act="mod:pbq">${icon('focus')}Quality in detail</button></div></div></div>`;
    h += '<div class="kpis">' + kpi('Reads', QS.si(r.n), `mean length ${fx(d.meanLen, 0)} bp`) + kpi('Bases', QS.si(r.totalBases), 'bp analysed');
    if (r.hasQual) h += kpi('Mean quality', 'Q' + fx(d.meanQ, 1), 'Phred scale', (d.meanQ / 40) * 100, QS.qcolor((d.meanQ - 15) / 25)) + kpi('Bases ≥ Q30', fx(d.q30, 1) + '<small>%</small>', `≥ Q20: ${fx(d.q20, 1)}%`, d.q30, QS.qcolor((d.q30 - 50) / 45)) + kpi('Reads ≤ 1 error', fx(m.ee1, 1) + '<small>%</small>', `${fx(r.ee.sum / r.n, 2)} expected errors / read`, m.ee1, QS.qcolor((m.ee1 - 40) / 55));
    h += kpi('GC content', fx(d.gcPct, 1) + '<small>%</small>', `peak at ${fx(d.gc.mu, 0)}%`, d.gcPct) + kpi('Unique reads', fx(m.uniq, 1) + '<small>%</small>', 'after de-duplication', m.uniq, QS.qcolor((m.uniq - 30) / 60)) + kpi('Adapter content', fx(m.adp, 1) + '<small>%</small>', 'max across the read', m.adp * 4, m.adp > 5 ? 'var(--bad)' : 'var(--ok)') + kpi('N content', fx(m.nmax, 2) + '<small>%</small>', 'worst position', m.nmax * 10, m.nmax > 5 ? 'var(--bad)' : 'var(--ok)');
    h += '</div>';
    h += `<div class="strip card"><h3>${icon('check')} Checks <small class="muted">click one to open it</small></h3><div class="cells">${QS.MODS.filter((x) => x.id !== 'basic').map((x) => { const e = ev.mods[x.id]; return `<div class="cell ${e.st}" data-act="mod:${x.id}" title="${esc(e.note || x.title)}"><b>${esc(x.title)}</b><span>${ST[e.st]} · ${esc(e.val)}</span></div>`; }).join('')}</div></div>`;
    h += `<div class="secthead">Findings and recommendations</div><div class="finds">${fnd.map((i) => `<div class="find card ${i.sev}"><b>${esc(i.title)}</b><p>${esc(i.text)}</p><div class="a"><button class="btn sm" data-act="mod:${i.mod}">Show check</button>${i.act ? `<button class="btn sm primary" data-act="${i.act.act}">${esc(i.act.label)}</button>` : ''}</div></div>`).join('')}</div>`;
    h += '<div class="secthead">At a glance</div><div class="minis">' + ['pbq', 'gc', 'pbc'].filter((id) => ev.mods[id].st !== 'na').map((id) => `<div class="card mcard"><div class="hd"><h3>${esc(modInfo(id).title)}</h3>${chip(ev.mods[id].st)}<button class="ico-btn" data-act="mod:${id}" title="Open">${icon('expand')}</button></div><div class="bd">${chart(s, id, 560, 280)}</div></div>`).join('') + '</div></div>';
    return h;
  }
  function modCard(s, x) {
    const e = s.ev.mods[x.id], html = QS.CHART_HTML[x.id];
    return `<div class="card mcard" id="mc-${x.id}"><div class="hd"><span class="sdot ${e.st}"></span><h3>${esc(x.title)}</h3>${chip(e.st)}${tools(s, x.id)}<button class="ico-btn" title="Open in focus view" data-act="mod:${x.id}">${icon('expand')}</button></div>${e.note ? `<div class="note">${esc(e.note)}</div>` : ''}<div class="bd">${chart(s, x.id, 600, 300)}</div></div>`;
  }
  function viewReport(s) {
    const ev = s.ev, avail = QS.MODS.filter((x) => ev.mods[x.id].st !== 'na'), na = QS.MODS.filter((x) => ev.mods[x.id].st === 'na');
    return `<div class="wrap"><div class="secthead" style="margin-top:0">${esc(s.name)} <small>${avail.length} checks · score ${ev.score}</small></div><div class="grid">${avail.map((x) => modCard(s, x)).join('')}</div>${na.length ? `<div class="secthead">Not available for this file</div><div style="display:flex;gap:6px;flex-wrap:wrap">${na.map((x) => `<span class="chip">${esc(x.title)} · ${esc(ev.mods[x.id].val)}</span>`).join('')}</div>` : ''}</div>`;
  }
  function viewMod(s) {
    const id = S.mod, x = modInfo(id), e = s.ev.mods[id], hp = QS.HELP[id], list = QS.MODS.filter((m) => m.id === id || s.ev.mods[m.id].st !== 'na'), idx = list.findIndex((m) => m.id === id);
    let h = `<div class="wrap"><div class="card focus"><div class="hd"><button class="ico-btn" data-act="prev" title="Previous check (K)">${icon('chev-l')}</button><h2>${esc(x.title)}</h2><button class="ico-btn" data-act="next" title="Next check (J)">${icon('chev-r')}</button>${chip(e.st)}<span class="muted num">${idx + 1} / ${list.length}</span><span class="spacer"></span>${optBar(id)}${tools(s, id).replace('class="tools"', 'class="tools" style="opacity:1"')}</div>`;
    h += e.st === 'na' ? `<div class="note-box">This check is not available: ${esc(e.val)}.</div>` : `${e.note ? `<p class="muted" style="margin:0 0 6px">${esc(e.note)}</p>` : ''}<div>${chart(s, id, 980, id === 'basic' ? 300 : 470, 'full')}</div>`;
    h += '</div>';
    if (id === 'tile' && QS.derive(s.res).tile) { const rk = QS.derive(s.res).tile.rank.slice().sort((a, b) => a.min - b.min).slice(0, 6); h += `<div class="card focus"><div class="hd"><h2 style="font-size:15px">Lowest-quality tiles</h2></div><table class="dt"><thead><tr><th>Tile</th><th class="r">Average deviation</th><th class="r">Largest deficit</th></tr></thead><tbody>${rk.map((t) => `<tr><td>${t.id}</td><td class="r num">${fx(t.mean, 2)} Q</td><td class="r num">${fx(t.min, 1)} Q</td></tr>`).join('')}</tbody></table></div>`; }
    if (hp) h += `<div class="help3"><div class="card"><h5>What it shows</h5><p>${esc(hp[0])}</p></div><div class="card"><h5>What good looks like</h5><p>${esc(hp[1])}</p></div><div class="card"><h5>If it is flagged</h5><p>${esc(hp[2])}</p></div></div>`;
    return h + '</div>';
  }
  function viewCmp() {
    const ss = done();
    if (ss.length < 2) return `<div class="wrap"><div class="card focus" style="text-align:center;padding:40px"><h2>Compare samples</h2><p class="muted">Load at least two samples to see the pass/fail matrix, a ranked metric table and overlaid curves.</p><div style="display:flex;gap:8px;justify-content:center"><button class="btn primary" data-act="open">${icon('open')}Open files…</button><button class="btn" data-act="demo">${icon('spark')}Load demo samples</button></div></div></div>`;
    const prs = findPairs(); let ph = '';
    if (prs.length) ph = `<div class="secthead" style="margin-top:0">Paired-end libraries <small>${prs.length} pair${prs.length > 1 ? 's' : ''} detected from the file names</small></div>` + prs.map((p) => { const o = p.info, c1 = p.r1, c2 = p.r2; return `<div class="card focus"><div class="hd"><h2 style="font-size:15px">${esc(p.key)}</h2>${chip(o.st)}<span class="muted">${esc(o.note)}</span></div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;align-items:start"><table class="dt kvt"><thead><tr><th></th><th class="r">R1</th><th class="r">R2</th></tr></thead><tbody><tr><td>Reads</td><td class="r">${num(c1.res.n)}</td><td class="r">${num(c2.res.n)}</td></tr><tr><td>Read length</td><td class="r">${fx(QS.derive(c1.res).meanLen, 0)} bp</td><td class="r">${fx(QS.derive(c2.res).meanLen, 0)} bp</td></tr><tr><td>Mean quality</td><td class="r">Q${fx(o.qa, 1)}</td><td class="r">Q${fx(o.qb, 1)}</td></tr><tr><td>Bases ≥ Q30</td><td class="r">${fx(o.q30a, 1)}%</td><td class="r">${fx(o.q30b, 1)}%</td></tr><tr><td>Names in sync</td><td class="r" colspan="2">${o.idPct === null ? '–' : fx(o.idPct, 1) + '%'}</td></tr><tr><td>Score</td><td class="r">${c1.ev.score}</td><td class="r">${c2.ev.score}</td></tr></tbody></table><div>${QS.cmpChart([c1, c2], 'pbq', { P: pal(), w: 640, h: 270 })}</div></div></div>`; }).join('');
    const core = QS.MODS.filter((m) => m.core), cols = `minmax(120px,max-content) repeat(${core.length}, minmax(26px,1fr))`;
    let h = `<div class="wrap">${ph}<div class="secthead"${ph ? '' : ' style="margin-top:0"'}>Check matrix <small>${ss.length} samples · click a cell to open the check</small></div><div class="card mx" style="grid-template-columns:${cols}"><div></div>${core.map((m) => `<div class="h" title="${esc(m.title)}" data-act="cmpmod:${m.id}">${esc(m.short)}</div>`).join('')}`;
    ss.forEach((s) => { h += `<div class="rn" data-act="sel:${S.samples.indexOf(s)}"><span class="sdot" style="background:${s.color}"></span>${esc(s.name)}</div>` + core.map((m) => `<button class="c ${s.ev.mods[m.id].st}" title="${esc(s.name + ' · ' + m.title + ': ' + ST[s.ev.mods[m.id].st] + ' (' + s.ev.mods[m.id].val + ')')}" data-act="cmpcell:${S.samples.indexOf(s)}:${m.id}"></button>`).join(''); });
    h += '</div>';
    const cols2 = [['score', 'Score', 0, 1], ['reads', 'Reads', 0, 1], ['len', 'Mean length', 1, 1], ['gc', 'GC %', 1, 1], ['meanQ', 'Mean Q', 1, 1], ['q30', '% ≥ Q30', 1, 1], ['ee1', '% ≤1 error', 1, 1], ['uniq', '% unique', 1, 1], ['adp', 'Adapter %', 2, 1], ['nmax', 'N max %', 2, 1]];
    const rows = ss.map((s) => ({ s, m: QS.metrics(s.res, s.ev) })), key = S.sortCmp;
    rows.sort((a, b) => ((a.m[key] || 0) - (b.m[key] || 0)) * S.sortDir || a.s.name.localeCompare(b.s.name));
    const stats = {}; cols2.forEach(([k]) => { const v = rows.map((r) => r.m[k]).filter(Number.isFinite), mean = v.reduce((a, b) => a + b, 0) / (v.length || 1), sd = Math.sqrt(v.reduce((a, b) => a + (b - mean) * (b - mean), 0) / (v.length || 1)); stats[k] = { max: Math.max(...v, 1e-9), mean, sd }; });
    h += `<div class="secthead">Metrics <small>click a header to sort · red values are statistical outliers</small></div><div class="card" style="overflow-x:auto"><table class="mt"><thead><tr><th data-act="sortcmp:name">Sample</th>${cols2.map(([k, l]) => `<th data-act="sortcmp:${k}">${l}${key === k ? (S.sortDir < 0 ? ' ↓' : ' ↑') : ''}</th>`).join('')}</tr></thead><tbody>${rows.map(({ s, m }) => `<tr data-act="sel:${S.samples.indexOf(s)}" style="cursor:pointer"><td><span class="sdot" style="background:${s.color};margin-right:6px"></span>${esc(s.name)}</td>${cols2.map(([k, , dec]) => { const v = m[k], st = stats[k], out = rows.length >= 3 && st.sd > 0 && Math.abs(v - st.mean) / st.sd > 1.8; return `<td class="${out ? 'out' : ''}">${Number.isFinite(v) ? `<i class="bg" style="width:${(Math.abs(v) / st.max) * 100}%"></i>` : ''}<span>${Number.isFinite(v) ? (k === 'reads' ? QS.si(v) : fx(v, dec)) : '–'}</span></td>`; }).join('')}</tr>`).join('')}</tbody></table></div>`;
    const kinds = [['pbq', 'Mean quality along the read'], ['gc', 'GC distribution'], ['adp', 'Adapter content (max of adapters)'], ['len', 'Read length (cumulative)'], ['ee', 'Expected errors along the read']];
    h += '<div class="secthead">Overlays</div><div class="grid">' + kinds.map(([k, t]) => `<div class="card mcard"><div class="hd"><h3>${t}</h3></div><div class="bd">${QS.cmpChart(ss, k, { P: pal(), w: 600, h: 300 })}</div></div>`).join('') + '</div></div>';
    return h;
  }

  /* ------------------------------------------------------------ sidebar / hud / inspector / status */
  function renderSide() {
    const el = $('#sbPane'); $$('#sbTabs button').forEach((b) => b.classList.toggle('on', b.dataset.t === S.side));
    if (S.side === 'samples') {
      const pairs = findPairs();
      el.innerHTML = `<div style="display:flex;gap:6px;margin-bottom:10px"><button class="btn sm" data-act="open" style="flex:1;justify-content:center">${icon('plus')}Add files</button><button class="btn sm" data-act="demo" title="Load demo samples">${icon('spark')}Demo</button></div>` + (S.samples.length ? S.samples.map((s, i) => `<div class="row ${i === S.sel ? 'sel' : ''}" data-act="sel:${i}"><span class="dot" style="background:${s.color}"></span><span class="nm">${esc(s.name)}</span><span style="display:flex;align-items:center;gap:4px">${pairs.some((p) => p.r1 === s || p.r2 === s) ? `<span class="chip acc" title="Paired-end mates">${pairs.some((p) => p.r1 === s) ? 'R1' : 'R2'} ⇄</span>` : ''}${s.state === 'done' ? `<span class="chip ${s.ev.score >= 80 ? 'pass' : s.ev.score >= 60 ? 'warn' : 'fail'}">${s.ev.score}</span>` : s.state === 'err' ? '<span class="chip fail">error</span>' : `<span class="muted num">${Math.round(s.progress * 100)}%</span>`}<button class="ico-btn x" title="Remove" data-act="rm:${i}">${icon('x')}</button></span><span class="sub">${s.state === 'done' ? `${QS.si(s.res.n)} reads · ${s.res.minLen === s.res.maxLen ? s.res.maxLen + ' bp' : s.res.minLen + '–' + s.res.maxLen + ' bp'} · Q${fx(QS.derive(s.res).meanQ || 0, 0)}` : s.state === 'err' ? esc(s.err) : `Analysing… ${QS.si(s.reads)} reads`}</span>${s.state === 'run' ? `<div class="pg"><i style="width:${s.progress * 100}%"></i></div>` : ''}</div>`).join('') : '<div class="note-box">No samples yet. Add files or load the demo.</div>');
    } else {
      const s = cur();
      el.innerHTML = s && s.res ? QS.MODS.map((x) => { const e = s.ev.mods[x.id]; return `<div class="mrow ${S.view === 'mod' && S.mod === x.id ? 'sel' : ''}" data-act="mod:${x.id}" style="${e.st === 'na' ? 'opacity:.5' : ''}"><span class="sdot ${e.st}"></span><span class="nm">${esc(x.title)}</span><span class="vl">${esc(e.val)}</span></div>`; }).join('') : '<div class="note-box">Select an analysed sample.</div>';
    }
  }
  function renderHud() {
    const v = [['dash', 'Dashboard', 'dash'], ['report', 'Report', 'grid'], ['mod', 'Focus', 'focus'], ['cmp', 'Compare', 'compare']];
    $('#hud').innerHTML = `<div class="seg">${v.map(([k, l, ic]) => `<button class="${S.view === k ? 'on' : ''}" data-act="view:${k}">${icon(ic)}${l}</button>`).join('')}</div><span class="sepv"></span><button class="btn sm ${S.showTrim ? 'on' : ''}" data-act="trimguides" title="Show draggable trim guides on position charts (T)">${icon('scissors')}Trim guides</button>`;
    $('#hud').hidden = !S.samples.length;
  }
  function renderMain(keep) {
    const v = $('#view'), top = v.scrollTop, s = cur(); $('#empty').hidden = S.samples.length > 0; v.hidden = !S.samples.length;
    if (!S.samples.length) return;
    let h;
    if (S.view === 'cmp') h = viewCmp();
    else if (!s) h = '';
    else if (s.state === 'run') h = `<div class="wrap"><div class="card focus" style="text-align:center;padding:48px"><h2>Analysing ${esc(s.name)}</h2><p class="muted">${QS.si(s.reads)} reads read so far</p><div class="pg" style="max-width:420px;margin:12px auto"><i style="width:${s.progress * 100}%"></i></div></div></div>`;
    else if (s.state === 'err') h = `<div class="wrap"><div class="card focus"><h2>Could not analyse ${esc(s.name)}</h2><p class="warn-box">${esc(s.err)}</p></div></div>`;
    else h = S.view === 'report' ? viewReport(s) : S.view === 'mod' ? viewMod(s) : viewDash(s);
    v.innerHTML = h; v.style.scrollBehavior = 'auto'; v.scrollTop = keep ? top : 0; v.style.scrollBehavior = '';
  }
  function trimPanel(s) {
    const r = s.res; if (!r.hasQual && r.L === 0) return '<div class="note-box">Not available.</div>';
    const t = trimOf(s), a = t.adv, st = QS.trimStats(r, t.t5, t.keep, t.minLen), mx = r.maxLen || r.L;
    const adapters = r.adNames.map((n, i) => [n, QS.derive(r).adMax[i]]).filter((x) => x[1] > 1).map((x) => x[0]);
    const txt = `trim_5prime_bases: ${t.t5}\nkeep_up_to_position: ${t.keep}\nminimum_length: ${t.minLen}${adapters.length ? '\nadapters: ' + adapters.join(', ') : ''}${(r.hasQual && QS.derive(r).base[2].slice(-3).reduce((x, y) => x + y, 0) / 3 > 35) ? '\npoly_g_trimming: yes' : ''}`;
    return `<div class="sec"><label class="chk"><input type="checkbox" data-act="trimguides" ${S.showTrim ? 'checked' : ''}>Show draggable guides on the charts</label><div class="${a.why.length && a.why[0].startsWith('Read quality is stable') ? 'ok-box' : 'note-box'}"><b>Suggestion</b><br>${a.why.map(esc).join('<br>')}</div></div>
    <div class="sec"><h4>Trim settings</h4>
      <div class="field-row" style="grid-template-columns:1fr 70px"><label>Trim from 5′ end (bases)</label><input class="field" type="number" min="0" max="${mx}" value="${t.t5}" data-trim="t5"></div>
      <input type="range" min="0" max="${Math.floor(mx / 2)}" value="${t.t5}" data-trim="t5">
      <div class="field-row" style="grid-template-columns:1fr 70px;margin-top:8px"><label>Keep up to position</label><input class="field" type="number" min="10" max="${mx}" value="${t.keep}" data-trim="keep"></div>
      <input type="range" min="10" max="${mx}" value="${t.keep}" data-trim="keep">
      <div class="field-row" style="grid-template-columns:1fr 70px;margin-top:8px"><label>Minimum read length</label><input class="field" type="number" min="1" max="${mx}" value="${t.minLen}" data-trim="minLen"></div>
      <button class="btn sm" data-act="trim-suggest">${icon('bolt')}Use suggestion</button> <button class="btn sm" data-act="trim-reset">Reset</button></div>
    <div class="sec"><h4>What you would keep</h4><div class="trim-card"><div class="big">${fx(st.keptPct, 1)}<small>% of bases</small></div><div class="dualbar"><i style="width:${st.keptPct}%"></i></div>
      <div class="stat2"><div><b>${fx(st.dropPct, 1)}%</b>reads shorter than ${t.minLen} bp</div><div><b>${st.newLen} bp</b>new read length</div>${r.hasQual ? `<div><b>Q${fx(st.qBefore, 1)} → Q${fx(st.qAfter, 1)}</b>mean quality</div><div><b>${fx(st.q30After, 1)}%</b>bases ≥ Q30 after</div>` : ''}<div><b>${fx(st.adBefore, 1)}% → ${fx(st.adAfter, 1)}%</b>adapter in reads</div></div></div></div>
    <div class="sec"><h4>Settings to apply <button class="ico-btn" style="margin-left:auto" data-act="trim-copy" title="Copy">${icon('copy')}</button></h4><div class="code">${esc(txt)}</div><p class="muted" style="font-size:11.5px">Enter these values in the trimming tool of your choice.</p></div>`;
  }
  function settingsPanel() {
    const rl = [[100000, '100,000 reads'], [500000, '500,000 reads'], [1000000, '1,000,000 reads'], [5000000, '5,000,000 reads'], [0, 'All reads']];
    return `<div class="sec"><h4>Analysis</h4><div class="field-row" style="grid-template-columns:1fr 150px"><label>Reads to analyse</label><select class="sel" data-set="readLimit">${rl.map(([v, l]) => `<option value="${v}" ${S.readLimit === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="field-row" style="grid-template-columns:1fr 150px"><label>Threshold preset</label><select class="sel" data-set="preset">${Object.keys(QS.PRESETS).concat(S.preset === 'Custom' ? ['Custom'] : []).map((p) => `<option ${S.preset === p ? 'selected' : ''}>${p}</option>`).join('')}</select></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn sm" data-act="lists">${icon('file')}Adapter &amp; contaminant lists</button><button class="btn sm" data-act="rerun">${icon('refresh')}Re-run analysis</button></div></div>
      <div class="sec"><h4>Thresholds <span class="muted" style="margin-left:auto;text-transform:none;letter-spacing:0">warn · fail</span></h4>${QS.LIMIT_DEFS.map((d) => `<div class="field-row"><label>${esc(d.label)} <span class="muted">${d.dir === 'low' ? '(below)' : '(above)'} ${d.unit}</span></label><input class="field" type="number" step="any" value="${S.limits[d.id][0]}" data-lim="${d.id}:0"><input class="field" type="number" step="any" value="${S.limits[d.id][1]}" data-lim="${d.id}:1"></div>`).join('')}</div>
      <div class="note-box"><b>Score</b><br>70% check health (pass 1, warning 0.55, fail 0, weighted by importance) plus 30% from the share of bases at Q30 or better, scaled so that 85% earns full marks. Grades: A ≥ 90, B ≥ 80, C ≥ 70, D ≥ 55.</div>`;
  }
  function renderInspector() {
    const el = $('#inPane'); $$('#inTabs button').forEach((b) => b.classList.toggle('on', b.dataset.t === S.insp));
    const s = cur();
    if (S.insp === 'settings') { el.innerHTML = settingsPanel(); return; }
    if (!s || !s.res) { el.innerHTML = '<div class="note-box">Open a file to see its details.</div>'; return; }
    if (S.insp === 'trim') { el.innerHTML = trimPanel(s); return; }
    const r = s.res, d = QS.derive(r), kv = [['Format', r.fmt + (r.gz ? ' (gzip)' : '')], ['File size', r.size ? QS.bytes(r.size) : '–'], ['Encoding', r.hasQual ? r.enc.name : '–'], ['Reads', num(r.n)], ['Bases', QS.si(r.totalBases)], ['Length', r.minLen === r.maxLen ? r.maxLen + ' bp' : r.minLen + '–' + r.maxLen + ' bp'], ['GC', fx(d.gcPct, 1) + '%'], ['Mean quality', r.hasQual ? 'Q' + fx(d.meanQ, 1) : '–'], ['Filtered reads', num(r.flagged)], ['Distinct tiles', r.tiles ? r.tiles.ids.length : '–']];
    let h = `<div class="sec"><h4>Sample</h4><div class="kv">${kv.map(([a, b]) => `<span>${a}</span><span>${esc(b)}</span>`).join('')}</div></div>`;
    if (S.view === 'mod' || S.view === 'report') { const x = modInfo(S.mod), e = s.ev.mods[S.mod], hp = QS.HELP[S.mod]; h = `<div class="sec"><h4>${esc(x.title)}</h4>${chip(e.st)} <span class="muted">${esc(e.val)}</span>${e.note ? `<p style="margin:8px 0 0;color:var(--text-2)">${esc(e.note)}</p>` : ''}${hp ? `<p class="muted" style="margin:8px 0 0">${esc(hp[0])}</p>` : ''}</div>` + h; }
    const lim = QS.LIMIT_DEFS.find((q) => q.mod === S.mod);
    if (lim && (S.view === 'mod')) h += `<div class="sec"><h4>Thresholds for this check</h4>${QS.LIMIT_DEFS.filter((q) => q.mod === S.mod).map((q) => `<div class="kv"><span>${esc(q.label)}</span><span>${S.limits[q.id][0]} / ${S.limits[q.id][1]} ${q.unit}</span></div>`).join('')}<p class="muted" style="font-size:11.5px">Warning / failure. Change them under Settings.</p></div>`;
    el.innerHTML = h;
  }
  function renderStatus() {
    const s = cur(); const left = S.busy ? `<span class="chip acc"><span class="spin" style="display:inline-block">${icon('refresh')}</span>working…</span>` : s && s.res ? `<span><b>${esc(s.name)}</b></span><span>${num(s.res.n)} reads</span><span>score ${s.ev.score} (${s.ev.grade})</span>` : '<span>Ready</span>';
    $('#status').innerHTML = left + `<span class="grow"></span><a href="#" data-legal="imprint">Imprint</a><a href="#" data-legal="privacy">Privacy</a>`;
  }
  let rp = false;
  function render() { if (rp) return; rp = true; requestAnimationFrame(() => { rp = false; renderAll(); }); }
  function renderAll(keep) { renderSide(); renderHud(); renderMain(keep); renderInspector(); renderStatus(); hydrate(document); }
  function renderTrimLive() { renderMain(true); renderInspector(); hydrate(document); }

  /* ------------------------------------------------------------ exports */
  function svgOf(s, id) { return QS.renderMod(id, s.res, { P: QS.palette(false), lim: S.limits, w: 980, h: 480, opts: S.opts[id] || {}, rows: 40, trim: null }); }
  async function exportFig(kind, id) {
    const s = cur(); if (!s || !s.res) return;
    if (kind === 'csv') { download(`${base(s)}_${id}.csv`, QS.csv[id](s.res), 'text/csv'); return; }
    const svg = svgOf(s, id), m = svg.match(/data-w="(\d+)" data-h="(\d+)"/); if (!m) return toast('Nothing to export for this check', true);
    if (kind === 'svg') download(`${base(s)}_${id}.svg`, QS.svgStandalone(svg, QS.palette(false), +m[1], +m[2]), 'image/svg+xml');
    else { try { download(`${base(s)}_${id}.png`, await QS.svgToPng(svg, QS.palette(false), 3)); } catch (e) { toast(e.message, true); } }
  }
  function exportZip() {
    const s = cur(); if (!s || !s.res) return; const P = QS.palette(false), files = [];
    QS.MODS.forEach((x) => { if (QS.CHART_HTML[x.id] || s.ev.mods[x.id].st === 'na') return; const svg = QS.renderMod(x.id, s.res, { P, lim: S.limits, w: 980, h: 480, opts: S.opts[x.id] || {}, trim: null }), m = svg.match(/data-w="(\d+)" data-h="(\d+)"/); if (m) files.push({ name: `${x.id}.svg`, data: QS.svgStandalone(svg, P, +m[1], +m[2]) }); if (QS.csv[x.id]) { const c = QS.csv[x.id](s.res); if (c) files.push({ name: `${x.id}.csv`, data: c }); } });
    download(`${base(s)}_figures.zip`, QS.zip(files));
  }
  const exportReport = () => { const ss = done(); if (!ss.length) return toast('Analyse a file first', true); download('qualityscale_report.html', QS.reportHtml(ss, { lim: S.limits }), 'text/html'); };
  async function exportPdf() {
    const ss = done(); if (!ss.length) return toast('Analyse a file first', true);
    toast('Building PDF…'); S.busy++; renderStatus();
    try { const b = await QS.reportPdf(ss, { lim: S.limits }); download('qualityscale_report.pdf', b); } catch (e) { toast(e.message, true); }
    S.busy--; renderStatus();
  }
  const exportJson = () => { if (!done().length) return; download('qualityscale.qualityscale', '{"app":"qualityscale","v":1,"samples":[' + done().map((s) => { s.res.name = s.name; return QS.packRes(s.res); }).join(',') + ']}', 'application/json'); };

  /* ------------------------------------------------------------ menus */
  const menuStack = [];
  function closeMenus() { while (menuStack.length) menuStack.pop().remove(); $$('.menubar .open').forEach((b) => b.classList.remove('open')); }
  function popMenu(items, x, y, level) {
    level = level || 0; while (menuStack.length > level) menuStack.pop().remove();
    const m = document.createElement('div'); m.className = 'menu';
    items.forEach((it) => {
      if (it === '-') { m.appendChild(document.createElement('hr')); return; }
      if (it.lbl) { const l = document.createElement('div'); l.className = 'lbl'; l.textContent = it.lbl; m.appendChild(l); return; }
      const b = document.createElement('button'); b.innerHTML = `<span class="chk">${it.chk ? '✓' : ''}</span><span>${esc(it.l)}</span>${it.h ? `<small>${esc(it.h)}</small>` : ''}${it.sub ? '<small>›</small>' : ''}`;
      if (it.dis) b.disabled = true;
      b.onmouseenter = () => { if (it.sub) { const r = b.getBoundingClientRect(); popMenu(typeof it.sub === 'function' ? it.sub() : it.sub, r.right - 4, r.top - 5, level + 1); } else while (menuStack.length > level + 1) menuStack.pop().remove(); };
      b.onclick = () => { if (it.sub) return; closeMenus(); setTimeout(() => it.f && it.f(), 0); };
      m.appendChild(b);
    });
    document.body.appendChild(m); const r = m.getBoundingClientRect(); m.style.left = Math.max(6, Math.min(x, innerWidth - r.width - 6)) + 'px'; m.style.top = Math.max(6, Math.min(y, innerHeight - r.height - 6)) + 'px'; menuStack.push(m);
  }
  const setView = (v) => { S.view = v; render(); };
  const openMod = (id) => { S.mod = id; S.view = 'mod'; render(); };
  const stepMod = (dir) => { const s = cur(); if (!s || !s.res) return; const list = QS.MODS.filter((m) => s.ev.mods[m.id].st !== 'na'); let i = list.findIndex((m) => m.id === S.mod); i = (i + dir + list.length) % list.length; openMod(list[i].id); };
  const MENUS = {
    File: () => [{ l: 'Open files…', h: '⌘O', f: () => $('#fileInput').click() }, { l: 'Paste reads…', f: pasteDlg }, { l: 'Load demo samples', f: () => demo() }, '-', { l: 'Open saved results…', f: () => $('#fileInput').click() }, { l: 'Save results (.qualityscale)', f: exportJson, dis: !done().length }, '-', { l: 'Remove current sample', f: () => rm(S.sel), dis: !cur() }, { l: 'Clear all', f: () => { S.samples = []; S.sel = -1; render(); }, dis: !S.samples.length }],
    View: () => [{ l: 'Dashboard', h: '1', f: () => setView('dash'), chk: S.view === 'dash' }, { l: 'Full report', h: '2', f: () => setView('report'), chk: S.view === 'report' }, { l: 'Focus on one check', h: '3', f: () => setView('mod'), chk: S.view === 'mod' }, { l: 'Compare samples', h: '4', f: () => setView('cmp'), chk: S.view === 'cmp' }, '-', { l: 'Next check', h: 'J', f: () => stepMod(1) }, { l: 'Previous check', h: 'K', f: () => stepMod(-1) }, '-', { l: 'Trim guides on charts', h: 'T', chk: S.showTrim, f: toggleTrim }, { l: 'Left panel', h: '[', chk: !$('#app').classList.contains('no-sidebar'), f: () => $('#app').classList.toggle('no-sidebar') }, { l: 'Right panel', h: ']', chk: !$('#app').classList.contains('no-inspector'), f: () => $('#app').classList.toggle('no-inspector') }, { l: dark() ? 'Light theme' : 'Dark theme', f: toggleTheme }],
    Analysis: () => [{ lbl: 'Reads to analyse' }].concat([[100000, '100,000'], [500000, '500,000'], [1000000, '1,000,000'], [5000000, '5,000,000'], [0, 'All reads']].map(([v, l]) => ({ l, chk: S.readLimit === v, f: () => { S.readLimit = v; save('qs-readlimit', v); renderInspector(); toast('Applies to the next files you open'); } })), ['-', { lbl: 'Threshold preset' }], Object.keys(QS.PRESETS).map((p) => ({ l: p, chk: S.preset === p, f: () => applyPreset(p) })), ['-', { l: 'Adapter & contaminant lists…', f: listsDlg }, { l: 'Re-run analysis', f: rerun, dis: !S.samples.some((s) => s.file) }]).flat(),
    Export: () => [{ l: 'PDF report (all samples)', f: exportPdf, dis: !done().length }, { l: 'HTML report (all samples)', f: exportReport, dis: !done().length }, { l: 'Summary table (TSV)', f: () => download('qualityscale_summary.tsv', QS.summaryTsv(S.samples), 'text/tab-separated-values'), dis: !done().length }, { l: 'Results file (.qualityscale)', f: exportJson, dis: !done().length }, '-', { l: 'Current check as SVG', f: () => exportFig('svg', S.mod), dis: !cur() || !cur().res }, { l: 'Current check as PNG', f: () => exportFig('png', S.mod), dis: !cur() || !cur().res }, { l: 'Current check data (CSV)', f: () => exportFig('csv', S.mod), dis: !cur() || !cur().res || !QS.csv[S.mod] }, { l: 'All figures and tables (ZIP)', f: exportZip, dis: !cur() || !cur().res }],
    Help: () => [{ l: 'Keyboard shortcuts', h: '?', f: helpDlg }, { l: 'About QualityScale', f: aboutDlg }, '-', { l: 'Imprint', f: () => legal('imprint') }, { l: 'Privacy', f: () => legal('privacy') }],
  };
  function legal(tab) { dlg({ title: tab === 'imprint' ? 'Imprint' : 'Privacy', width: 640, body: `<div class="legal">${QS.legalHtml(tab === 'imprint' ? QS.LEGAL_IMPRINT : QS.LEGAL_PRIVACY)}</div>` }); }
  function helpDlg() {
    const k = [['1 2 3 4', 'Dashboard, report, focus, compare'], ['J / K', 'Next / previous check'], ['T', 'Trim guides on charts'], ['⌘O', 'Open files'], ['⌘K', 'Command palette'], ['[ / ]', 'Hide left / right panel'], ['?', 'This help']];
    dlg({ title: 'Keyboard shortcuts', body: `<div class="keys">${k.map(([a, b]) => `<span><kbd>${a}</kbd></span><span>${b}</span>`).join('')}</div>` });
  }
  function aboutDlg() {
    dlg({ title: 'About QualityScale', width: 600, body: `<p>QualityScale checks the quality of high-throughput sequencing reads. Open FASTQ or FASTA files (plain or gzip), read the dashboard, drill into any of the checks, drag trim guides over the charts and compare runs side by side.</p><p>Version ${QS.VERSION}. Everything runs in your browser; no data is uploaded. Duplication is estimated from the first 100,000 distinct sequences, tile statistics from a sample of reads and k-mers from a sample of reads.</p><p class="muted">Part of the LabScale family.</p>` });
  }
  function applyPreset(p) { const base0 = QS.defaultLimits(), over = QS.PRESETS[p] || {}; S.limits = Object.assign(base0, over); S.preset = p; save('qs-limits', S.limits); save('qs-preset', p); evalAll(); render(); }
  function parseList(t) { return t.split('\n').map((l) => l.trim()).filter((l) => l && l[0] !== '#').map((l) => { const p = l.split(/\t+|\s{2,}/); const seq = (p[p.length - 1] || '').replace(/[^ACGTNacgtn]/g, '').toUpperCase(); return { name: (p.length > 1 ? p.slice(0, -1).join(' ') : seq).trim(), seq }; }).filter((x) => x.seq.length >= 8); }
  function listsDlg() {
    const fmt = (a) => a.map((x) => x.name + '\t' + x.seq).join('\n');
    dlg({ title: 'Adapter and contaminant lists', width: 680, body: `<p class="muted" style="margin-top:0">One entry per line: <span class="mono">name</span>, a tab, then the sequence. The adapter list is searched in every read (first 12–13 bases are enough). The contaminant list annotates over-represented sequences.</p><h4 style="margin:10px 0 4px">Adapters</h4><textarea id="adTxt" style="min-height:120px" spellcheck="false">${esc(fmt(S.adapters || QS.ADAPTERS))}</textarea><h4 style="margin:10px 0 4px">Contaminants</h4><textarea id="coTxt" style="min-height:140px" spellcheck="false">${esc(fmt(S.contam || QS.CONTAMINANTS))}</textarea>`, buttons: [{ l: 'Restore defaults', f: () => { S.adapters = null; S.contam = null; save('qs-adapters', null); save('qs-contam', null); toast('Defaults restored. Re-run the analysis to apply.'); } }, { l: 'Save', primary: true, f: () => { const a = parseList($('#adTxt').value), c = parseList($('#coTxt').value); if (!a.length) { toast('The adapter list is empty', true); return false; } S.adapters = a; S.contam = c; save('qs-adapters', a); save('qs-contam', c); toast('Saved. Re-run the analysis to apply.'); } }] });
  }
  async function rerun() {
    const ss = S.samples.filter((s) => s.file); if (!ss.length) return toast('Only files opened in this session can be re-analysed', true);
    const files = ss.map((s) => s.file); S.samples = S.samples.filter((s) => !s.file); S.sel = S.samples.length - 1; colorIdx = 0; render(); runFiles(files);
  }
  function rm(i) { if (i < 0) return; const x = S.samples[i]; if (x && x.state === 'run') { x.removed = true; if (x.abort) x.abort(); } S.samples.splice(i, 1); if (S.sel >= S.samples.length) S.sel = S.samples.length - 1; render(); }
  function toggleTrim() { S.showTrim = !S.showTrim; renderMain(true); renderHud(); renderInspector(); hydrate(document); }
  function toggleTheme() { const t = dark() ? 'light' : 'dark'; document.documentElement.dataset.theme = t; save('qs-theme', t); try { localStorage.setItem('qs-theme', t); } catch (e) { } cache.clear(); $('#btnTheme').innerHTML = icon(t === 'dark' ? 'sun' : 'moon'); renderAll(true); }

  /* ------------------------------------------------------------ command palette */
  function commands() {
    const c = []; Object.entries(MENUS).forEach(([g, fn]) => fn().forEach((it) => { if (it && it.l && it.f && !it.dis) c.push({ l: g + ': ' + it.l, f: it.f, h: it.h }); }));
    QS.MODS.forEach((m) => c.push({ l: 'Go to: ' + m.title, f: () => openMod(m.id) }));
    S.samples.forEach((s, i) => c.push({ l: 'Select sample: ' + s.name, f: () => { S.sel = i; render(); } }));
    return c;
  }
  function palette() {
    const p = $('#palette'), inp = $('#palInput'), list = $('#palList'), all = commands(); let hl = 0, cur2 = all;
    const draw = () => { list.innerHTML = cur2.slice(0, 60).map((c, i) => `<button class="${i === hl ? 'hl' : ''}" data-i="${i}">${esc(c.l)}<small>${c.h ? esc(c.h) : ''}</small></button>`).join(''); const e = $('.hl', list); if (e) e.scrollIntoView({ block: 'nearest' }); };
    inp.value = ''; cur2 = all; hl = 0; draw(); p.showModal(); inp.focus();
    inp.oninput = () => { const q = inp.value.toLowerCase().split(/\s+/).filter(Boolean); cur2 = all.filter((c) => q.every((w) => c.l.toLowerCase().includes(w))); hl = 0; draw(); };
    const run = (i) => { const c = cur2[i]; p.close(); if (c) setTimeout(c.f, 0); };
    inp.onkeydown = (e) => { if (e.key === 'ArrowDown') { hl = Math.min(cur2.length - 1, hl + 1); draw(); e.preventDefault(); } else if (e.key === 'ArrowUp') { hl = Math.max(0, hl - 1); draw(); e.preventDefault(); } else if (e.key === 'Enter') run(hl); };
    list.onclick = (e) => { const b = e.target.closest('button'); if (b) run(+b.dataset.i); };
  }

  /* ------------------------------------------------------------ events */
  function act(a, el, ev) {
    const p = a.split(':'), k = p[0];
    switch (k) {
      case 'view': return setView(p[1]);
      case 'sel': S.sel = +p[1]; if (S.view === 'cmp') S.view = 'dash'; return render();
      case 'rm': ev.stopPropagation(); return rm(+p[1]);
      case 'mod': return openMod(p[1]);
      case 'cmpmod': return openMod(p[1]);
      case 'cmpcell': S.sel = +p[1]; return openMod(p[2]);
      case 'side': S.side = p[1]; return renderSide();
      case 'insp': S.insp = p[1]; return renderInspector();
      case 'tab-trim': S.insp = 'trim'; S.showTrim = true; $('#app').classList.remove('no-inspector'); if (S.view === 'dash' || S.view === 'cmp') { S.mod = 'pbq'; S.view = 'mod'; } return render();
      case 'opt': { const o = (S.opts[p[1]] = S.opts[p[1]] || {}); o[p[2]] = p[3]; return renderMain(true), hydrate(document); }
      case 'svg': case 'png': case 'csv': return exportFig(k, p[1]);
      case 'next': return stepMod(1);
      case 'prev': return stepMod(-1);
      case 'open': return $('#fileInput').click();
      case 'demo': return demo();
      case 'paste': return pasteDlg();
      case 'trimguides': return toggleTrim();
      case 'trim-suggest': { const s = cur(), t = trimOf(s), a2 = QS.trimAdvice(s.res); t.t5 = a2.t5; t.keep = a2.keep; return renderTrimLive(); }
      case 'trim-reset': { const s = cur(), t = trimOf(s); t.t5 = 0; t.keep = s.res.maxLen || s.res.L; return renderTrimLive(); }
      case 'trim-copy': { const c = $('.code', $('#inPane')); if (c) navigator.clipboard.writeText(c.textContent).then(() => toast('Copied')).catch(() => toast('Copy failed', true)); return; }
      case 'sortcmp': if (S.sortCmp === p[1]) S.sortDir *= -1; else { S.sortCmp = p[1]; S.sortDir = -1; } return renderMain(true);
      case 'lists': return listsDlg();
      case 'rerun': return rerun();
    }
  }
  document.addEventListener('click', (e) => {
    const lg = e.target.closest('[data-legal]'); if (lg) { e.preventDefault(); return legal(lg.dataset.legal); }
    if (!e.target.closest('.menu')) closeMenus();
    const a = e.target.closest('[data-act]'); if (a && !(a.tagName === 'INPUT' && a.type === 'checkbox' && e.type !== 'click')) act(a.dataset.act, a, e);
  });
  document.addEventListener('input', (e) => {
    const t = e.target.dataset;
    if (t.trim) { const s = cur(), tr = trimOf(s), mx = s.res.maxLen || s.res.L; let v = Math.round(+e.target.value); if (!Number.isFinite(v)) return; tr.manual = true; if (t.trim === 't5') tr.t5 = QS.clamp(v, 0, tr.keep - 10); else if (t.trim === 'keep') tr.keep = QS.clamp(v, tr.t5 + 10, mx); else tr.minLen = QS.clamp(v, 1, mx); trimSoon(e.target); }
  });
  let tsp = false; function trimSoon(src) { if (tsp) return; tsp = true; requestAnimationFrame(() => { tsp = false; renderMain(true); const f = document.activeElement; if (src && src.type === 'range') { const s = cur(), t = trimOf(s); $$('#inPane [data-trim]').forEach((x) => { if (x !== src && x.dataset.trim === src.dataset.trim) x.value = t[x.dataset.trim]; }); const st = QS.trimStats(s.res, t.t5, t.keep, t.minLen); const big = $('#inPane .big'); if (big) { renderInspectorKeepFocus(); } } else renderInspectorKeepFocus(); hydrate(document); }); }
  function renderInspectorKeepFocus() { const a = document.activeElement, key = a && a.dataset ? a.dataset.trim + a.type : null, pos = a && a.selectionStart; renderInspector(); if (key) { const n = $$('#inPane [data-trim]').find((x) => x.dataset.trim + x.type === key); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) { } } } }
  document.addEventListener('change', (e) => {
    const t = e.target, d = t.dataset;
    if (d.opt) { const [id, k] = d.opt.split(':'); (S.opts[id] = S.opts[id] || {})[k] = t.type === 'checkbox' ? t.checked : +t.value; renderMain(true); hydrate(document); }
    else if (d.lim) { const [id, i] = d.lim.split(':'); const v = parseFloat(t.value); if (Number.isFinite(v)) { S.limits[id][+i] = v; S.preset = 'Custom'; save('qs-limits', S.limits); save('qs-preset', 'Custom'); evalAll(); renderAll(true); } }
    else if (d.set === 'readLimit') { S.readLimit = +t.value; save('qs-readlimit', S.readLimit); toast('Applies to the next files you open'); }
    else if (d.set === 'preset') applyPreset(t.value);
    else if (d.act === 'trimguides') toggleTrim();
  });
  $('#fileInput').addEventListener('change', (e) => { runFiles(e.target.files); e.target.value = ''; });
  let dragN = 0;
  addEventListener('dragenter', (e) => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) { dragN++; $('#dropOverlay').classList.add('on'); } });
  addEventListener('dragleave', () => { if (--dragN <= 0) { dragN = 0; $('#dropOverlay').classList.remove('on'); } });
  addEventListener('dragover', (e) => e.preventDefault());
  addEventListener('drop', (e) => { e.preventDefault(); dragN = 0; $('#dropOverlay').classList.remove('on'); if (e.dataTransfer.files.length) runFiles(e.dataTransfer.files); });
  $('#btnOpen').onclick = () => $('#fileInput').click(); $('#btnReport').onclick = (e) => { e.stopPropagation(); closeMenus(); const r = e.currentTarget.getBoundingClientRect(); popMenu([{ l: 'PDF report', f: exportPdf }, { l: 'HTML report', f: exportReport }], r.left, r.bottom + 4); }; $('#btnPalette').onclick = palette;
  $('#btnSb').onclick = () => $('#app').classList.toggle('no-sidebar'); $('#btnIn').onclick = () => $('#app').classList.toggle('no-inspector');
  $('#btnTheme').onclick = toggleTheme; $('#btnHelp').onclick = helpDlg;
  /* menus */
  Object.keys(MENUS).forEach((name) => {
    const b = document.createElement('button'); b.textContent = name; $('#menubar').appendChild(b);
    const open = () => { const had = $('.menubar button.open'); closeMenus(); if (had === b) return; b.classList.add('open'); const r = b.getBoundingClientRect(); popMenu(MENUS[name](), r.left, r.bottom + 4); };
    b.onclick = (e) => { e.stopPropagation(); open(); };
    b.onmouseenter = () => { if ($('.menubar button.open') && !b.classList.contains('open')) { closeMenus(); b.classList.add('open'); const r = b.getBoundingClientRect(); popMenu(MENUS[name](), r.left, r.bottom + 4); } };
  });
  /* tooltips */
  const tip = $('#tip');
  document.addEventListener('mousemove', (e) => {
    const t = e.target.closest && e.target.closest('[data-tip]');
    if (!t) { tip.hidden = true; return; }
    const parts = t.dataset.tip.split('|'); tip.innerHTML = `<b>${esc(parts[0])}</b>` + parts.slice(1).map(esc).join('<br>'); tip.hidden = false;
    const r = tip.getBoundingClientRect(); tip.style.left = Math.min(innerWidth - r.width - 8, e.clientX + 14) + 'px'; tip.style.top = Math.min(innerHeight - r.height - 8, e.clientY + 16) + 'px';
  });
  /* trim handle dragging */
  let drag = null;
  document.addEventListener('pointerdown', (e) => {
    const h = e.target.closest && e.target.closest('.th'); if (!h) return; const svg = h.closest('svg'); if (!svg || !svg.dataset.pos) return;
    e.preventDefault(); drag = { which: h.dataset.h, svg, rect: svg.getBoundingClientRect(), ml: +svg.dataset.ml, iw: +svg.dataset.iw, gs: JSON.parse(svg.dataset.gs), vw: +svg.dataset.w };
  });
  document.addEventListener('pointermove', (e) => {
    if (!drag) return; const s = cur(), t = trimOf(s), x = ((e.clientX - drag.rect.left) / drag.rect.width) * drag.vw, n = drag.gs.length - 1;
    const fr = QS.clamp((x - drag.ml) / drag.iw, 0, 1), gi = Math.min(n - 1, Math.floor(fr * n)), pos = Math.round(drag.gs[gi] + (fr * n - gi) * (drag.gs[gi + 1] - drag.gs[gi])), mx = s.res.maxLen || s.res.L;
    t.manual = true; if (drag.which === 't5') t.t5 = QS.clamp(pos, 0, t.keep - 10); else t.keep = QS.clamp(pos, t.t5 + 10, mx);
    if (!tsp) { tsp = true; requestAnimationFrame(() => { tsp = false; if (!drag) return; renderMain(true); renderInspector(); hydrate(document); const sv = $$('#view svg[data-pos]'); }); }
  });
  document.addEventListener('pointerup', () => { if (drag) { drag = null; renderTrimLive(); } });
  /* keyboard */
  document.addEventListener('keydown', (e) => {
    const tag = (e.target.tagName || '').toLowerCase(); if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); return palette(); }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'o') { e.preventDefault(); return $('#fileInput').click(); }
    if (e.metaKey || e.ctrlKey || e.altKey || $('dialog[open]')) return;
    const k = e.key;
    if (k === '1') setView('dash'); else if (k === '2') setView('report'); else if (k === '3') setView('mod'); else if (k === '4') setView('cmp');
    else if (k === 'j' || k === 'ArrowRight' && S.view === 'mod') stepMod(1); else if (k === 'k' || k === 'ArrowLeft' && S.view === 'mod') stepMod(-1);
    else if (k === 't') toggleTrim(); else if (k === '[') $('#app').classList.toggle('no-sidebar'); else if (k === ']') $('#app').classList.toggle('no-inspector'); else if (k === '?') helpDlg();
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener && 0;

  /* ------------------------------------------------------------ boot */
  $('#btnTheme').innerHTML = icon(dark() ? 'sun' : 'moon');
  hydrate(document); renderAll();
  const qp = new URLSearchParams(location.search);
  if (qp.has('demo') || qp.has('sample')) { const k = qp.get('demo'); demo(k && QS.demoKinds.includes(k) ? [k] : undefined).then(() => { const v = qp.get('view'); if (v) { S.view = v; } if (qp.get('mod')) S.mod = qp.get('mod'); if (qp.has('trim')) { S.showTrim = true; } render(); }); }
  QS.app = { S, render, chart, runFiles };
})();
