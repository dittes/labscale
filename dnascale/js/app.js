/* DNAScale application shell: state, import/export, editing, panels, dialogs. */
(function () {
  'use strict';
  const BW = window.BW;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = (n) => Number(n).toLocaleString('en-US');
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ------------------------------------------------------------ icons */
  const ICONS = {
    grid: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M3 14h18M9 4v16"/>',
    tree: '<path d="M4 6h6v12H4M10 12h10M10 6h6M10 18h6"/>',
    matrix: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 12h16M12 4v16"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
    undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 010 11H11"/>',
    redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 000 11H13"/>',
    open: '<path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>',
    align: '<path d="M4 6h10M4 12h16M4 18h12"/>',
    export: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19h14"/>',
    moon: '<path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 114 2c-.8.6-1.5 1-1.5 2M12 17h.01"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
    'panel-l': '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
    'panel-r': '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/>',
    dna: '<path d="M7 4c0 5 10 5 10 10s-10 5-10 6M17 4c0 5-10 5-10 10s10 5 10 6M8.5 8h7M8.5 16h7"/>',
    'chev-l': '<path d="M15 6l-6 6 6 6"/>', 'chev-r': '<path d="M9 6l6 6-6 6"/>', 'chev-d': '<path d="M6 9l6 6 6-6"/>', 'chev-u': '<path d="M6 15l6-6 6 6"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
    unlock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 017.5-1.5"/>',
    wave: '<path d="M2 14c3 0 3-8 6-8s3 12 6 12 3-8 8-8"/>',
    'zoom-in': '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2M11 8v6M8 11h6"/>',
    'zoom-out': '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2M8 11h6"/>',
    flip: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="M21 16l-5-5-8 8"/>',
    spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 17l.7 1.8 1.8.7-1.8.7L19 22l-.7-1.8-1.8-.7 1.8-.7z"/>',
    paste: '<rect x="6" y="5" width="12" height="16" rx="2"/><path d="M9 5V4h6v1M9 11h6M9 15h4"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    'eye-off': '<path d="M3 3l18 18M10.6 6.2A9.8 9.8 0 0112 6c6.5 0 10 6 10 6a17 17 0 01-3.2 3.8M6.4 7.8A16 16 0 002 12s3.5 6 10 6a9.7 9.7 0 003.6-.7"/>',
    pin: '<path d="M12 17v5M9 3h6l-1 6 3 3v2H7v-2l3-3z"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    scissors: '<circle cx="6" cy="7" r="2.5"/><circle cx="6" cy="17" r="2.5"/><path d="M8 8.5L20 18M8 15.5L20 6"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
  };
  const icon = (n) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;
  const hydrate = (root = document) => $$('[data-i]', root).forEach((el) => { el.innerHTML = icon(el.dataset.i); el.style.display = 'inline-flex'; });

  /* ------------------------------------------------------------ state */
  const S = {
    seqs: [], refId: null, name: 'Untitled project', aligned: false,
    cursor: null, sel: null, anchor: null, focusId: null, hover: null, ver: 0,
    opts: { zoom: 14, scheme: 'auto', display: 'letters', dimLowQ: true, translate: false, code: 1, frame: 0, edit: false, view: 'align' },
    tool: 'translate', trimQ: 20, filter: '', group: 0, contigs: [], consOv: {},
  };
  const undoStack = [], redoStack = [];

  const App = {
    S,
    rows: () => S.seqs.filter((s) => s.visible && (s.group || 0) === S.group),
    alnLen: () => S.seqs.reduce((m, s) => ((s.group || 0) === S.group ? Math.max(m, s.res.length) : m), 0),
    grp: () => S.seqs.filter((s) => (s.group || 0) === S.group),
    contigMode: () => S.group > 0,
    refSeq: () => S.seqs.find((s) => s.id === S.refId && s.visible) || null,
    mainType: () => (S.seqs.filter((s) => s.type === 'protein').length > S.seqs.length / 2 ? 'protein' : 'dna'),
    scheme() { return S.opts.scheme === 'auto' ? (App.mainType() === 'dna' ? 'residue' : 'clustal') : S.opts.scheme; },
    theme: null,
  };

  /* ------------------------------------------------------------ theme */
  function buildTheme() {
    const cs = getComputedStyle(document.documentElement), g = (n) => cs.getPropertyValue(n).trim();
    const dark = document.documentElement.dataset.theme === 'dark';
    App.theme = {
      key: dark ? 'd' : 'l', dark,
      panel: g('--panel'), panel2: g('--panel-2'), line: g('--line'), line2: g('--line-2'), text: g('--text'), text2: g('--text-2'), muted: g('--muted'),
      accent: g('--accent'), accentSoft: g('--accent-soft'), sel: g('--sel'), selLine: g('--sel-line'), colHi: g('--col-hi'),
      warn: g('--warn'), warnSoft: g('--warn-soft'), bad: g('--bad'), badSoft: g('--bad-soft'), ok: g('--ok'), okSoft: g('--ok-soft'),
      stripe: dark ? 'rgba(255,255,255,.025)' : 'rgba(16,24,40,.03)', trim: dark ? 'rgba(0,0,0,.30)' : 'rgba(120,130,150,.17)',
      qHigh: '#2fb37a', qMid: '#e0a82e', qLow: '#e5484d', mono: g('--mono'), sans: g('--sans'),
      dna: { A: '#2fa66a', C: '#3d7fe0', G: '#e8a317', T: '#e0474c', U: '#e0474c', N: '#9aa3b2', amb: '#a78bfa' },
    };
  }
  App.lightTheme = () => ({
    key: 'p', dark: false, panel: '#ffffff', panel2: '#f6f7f9', line: '#d9dde5', line2: '#c8cdd8', text: '#1c2230', text2: '#4a5367', muted: '#667085',
    accent: '#2563eb', accentSoft: '#e3ecff', sel: 'rgba(37,99,235,.14)', selLine: 'rgba(37,99,235,.9)', colHi: 'rgba(37,99,235,.06)',
    warn: '#c2410c', warnSoft: '#fdeadd', bad: '#d1344a', badSoft: '#fde7ea', ok: '#15803d', okSoft: '#e0f3e6',
    stripe: 'rgba(16,24,40,.03)', trim: 'rgba(120,130,150,.17)', qHigh: '#2fb37a', qMid: '#e0a82e', qLow: '#e5484d',
    mono: 'ui-monospace, Menlo, monospace', sans: 'Helvetica, Arial, sans-serif',
    dna: { A: '#2fa66a', C: '#3d7fe0', G: '#e8a317', T: '#e0474c', U: '#e0474c', N: '#9aa3b2', amb: '#a78bfa' },
  });
  App.baseColor = (ch, classic) => {
    const th = App.theme;
    if (classic) return { A: '#1a9a50', C: '#2b6fd6', G: th.dark ? '#d5d9e3' : '#14181f', T: '#e0302a' }[ch] || th.muted;
    return th.dna[ch] || th.dna.N;
  };
  function setTheme(t) {
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('bw-theme', t); } catch (e) {}
    $('#btnTheme').innerHTML = icon(t === 'dark' ? 'sun' : 'moon');
    buildTheme(); renderTraceLegend(); redrawAll();
  }

  /* ------------------------------------------------------------ toasts & dialogs */
  function toast(msg, o = {}) {
    const el = document.createElement('div'); el.className = 'toast';
    el.innerHTML = `<span>${esc(msg)}</span>`;
    if (o.action) { const b = document.createElement('button'); b.textContent = o.action.label; b.onclick = () => { el.remove(); o.action.fn(); }; el.appendChild(b); }
    $('#toasts').appendChild(el);
    setTimeout(() => el.remove(), o.ms || (o.action ? 7000 : 3600));
  }
  function busy(msg) {
    const d = document.createElement('div'); d.className = 'busy'; d.innerHTML = `<div><span class="spin"></span>${esc(msg)}</div>`;
    document.body.appendChild(d); return () => d.remove();
  }
  const nextPaint = () => new Promise((r) => { const t = setTimeout(r, 60); requestAnimationFrame(() => setTimeout(() => { clearTimeout(t); r(); }, 16)); });

  function dialog(el, { title, desc, body, ok = 'OK', cancel = 'Cancel', onMount }) {
    return new Promise((resolve) => {
      el.innerHTML = `<form method="dialog"><div class="dlg-head"><h2>${title}</h2>${desc ? `<p>${desc}</p>` : ''}</div><div class="dlg-body">${body}</div>
        <div class="dlg-foot"><button class="btn primary" value="ok">${ok}</button>${cancel ? `<button class="btn" value="cancel" formnovalidate>${cancel}</button>` : ''}</div></form>`;
      const form = $('form', el);
      form.addEventListener('submit', () => {});
      el.onclose = () => resolve(el.returnValue === 'ok' ? form : null);
      el.returnValue = '';
      el.showModal(); if (onMount) onMount(form);
    });
  }

  function showMenu(x, y, items) {
    $$('.ctx').forEach((m) => m.remove());
    const m = document.createElement('div'); m.className = 'menu ctx';
    m.innerHTML = items.map((it, i) => it === '-' ? '<hr>' : it.label && !it.run ? `<div class="lbl">${esc(it.label)}</div>` : `<button data-i="${i}">${it.icon ? icon(it.icon) : ''}${esc(it.label)}${it.hint ? `<small>${esc(it.hint)}</small>` : ''}</button>`).join('');
    document.body.appendChild(m);
    const r = m.getBoundingClientRect();
    m.style.left = Math.min(x, innerWidth - r.width - 8) + 'px'; m.style.top = Math.min(y, innerHeight - r.height - 8) + 'px';
    m.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; m.remove(); items[+b.dataset.i].run(); });
    setTimeout(() => document.addEventListener('pointerdown', function h(e) { if (!m.contains(e.target)) { m.remove(); } document.removeEventListener('pointerdown', h, true); }, true), 0);
  }

  /* ------------------------------------------------------------ sequence model */
  function makeSeq({ name, seq, type, trace, desc, group, qual }) {
    const s = { id: BW.uid(), name, desc: desc || '', type: type || BW.guessType(seq), res: seq, trace: trace || null, tStart: 0, tEnd: seq.length, visible: true, rc: false };
    if (group !== undefined) s.group = group;
    if (qual) s.fq = qual;
    return s;
  }
  function stripExt(n) { return n.replace(/\.(ab1|abi|scf|ztr|sff|rsf|fasta|fa|fas|fna|faa|fastq|fq|embl|dat|gp|seq|txt|gb|gbk|aln)$/i, ''); }

  function seqFromTrace(trace, q = S.trimQ) {
    let [a, b] = BW.trimByQuality(trace.qual, q);
    if (b - a < 20) { a = 0; b = trace.bases.length; }
    const s = makeSeq({ name: stripExt(trace.name), seq: trace.bases.slice(a, b), type: 'dna', trace });
    s.tStart = a; s.tEnd = b; return s;
  }
  function applyTrim(s, a, b) {
    s.tStart = a; s.tEnd = b; s.res = s.trace.bases.slice(a, b);
  }

  function changed(what = {}) {
    S.contigs = S.contigs.filter((c) => S.seqs.some((s) => (s.group || 0) === c.id));
    if (S.group && !S.contigs.some((c) => c.id === S.group)) { S.group = 0; S.cursor = null; S.sel = null; }
    S.ver++; statsCache = null;
    if (what.layout !== false) av.invalidate();
    if (S.opts.view === 'analysis' && BW.analysis) BW.analysis.render();
    if (S.opts.view === 'viz' && BW.viz) BW.viz.render();
    autoLayout(); renderSidebar(); renderInspector(); renderStatus(); updateToolbar(); syncTrace(false);
    if (S.opts.view === 'tree') renderTree(); if (S.opts.view === 'matrix') renderMatrix();
    $('#empty').hidden = S.seqs.length > 0;
    scheduleAutosave();
  }
  function redrawAll() { av.request(); tv.request(); }
  let dockUser = false;
  function autoLayout() {
    const host = $('#alignHost'), dock = $('#traceDock'), view = $('#viewAlign');
    if (view.hidden) return;
    if (dockCollapsed) { host.style.flex = '1 1 0'; dock.style.flex = 'none'; dock.style.height = ''; return; }
    if (dockUser) { host.style.flex = '1 1 0'; dock.style.flex = 'none'; return; }
    const avail = view.clientHeight - $('.toolstrip').offsetHeight - 38 - 7;
    const need = av.headerH + App.rows().length * av.rh + 18;
    const hostH = clamp(need, 160, Math.max(160, avail * 0.56));
    host.style.flex = `0 0 ${Math.round(hostH)}px`; dock.style.flex = '1 1 0'; dock.style.height = 'auto';
  }

  function snapshot() {
    return { refId: S.refId, aligned: S.aligned, group: S.group, contigs: S.contigs.map((c) => ({ ...c })), consOv: JSON.parse(JSON.stringify(S.consOv)), seqs: S.seqs.map((s) => ({ s, group: s.group || 0, res: s.res, name: s.name, visible: s.visible, tStart: s.tStart, tEnd: s.tEnd, trace: s.trace, bases: s.trace && s.trace.bases, edited: s.trace && new Set(s.trace.edited), rc: s.rc })) };
  }
  function pushUndo() { undoStack.push(snapshot()); if (undoStack.length > 80) undoStack.shift(); redoStack.length = 0; updateToolbar(); }
  function restore(snap) {
    S.refId = snap.refId; S.aligned = snap.aligned; S.group = snap.group; S.contigs = snap.contigs; S.consOv = snap.consOv;
    S.seqs = snap.seqs.map((o) => {
      const s = o.s; s.group = o.group; s.res = o.res; s.name = o.name; s.visible = o.visible; s.tStart = o.tStart; s.tEnd = o.tEnd; s.trace = o.trace; s.rc = o.rc;
      if (s.trace) { s.trace.bases = o.bases; s.trace.edited = new Set(o.edited); s.trace._mix = null; }
      return s;
    });
    const rows = App.rows(); if (S.cursor) S.cursor.r = Math.min(S.cursor.r, rows.length - 1);
    S.sel = null; changed();
  }
  function undo() { if (!undoStack.length) return; redoStack.push(snapshot()); restore(undoStack.pop()); toast('Undone'); }
  function redo() { if (!redoStack.length) return; undoStack.push(snapshot()); restore(redoStack.pop()); toast('Redone'); }

  /** Pad all rows (per contig/group) to the same length and drop columns that are gaps everywhere. */
  function normalize(dropEmpty = true) {
    const groups = new Map();
    for (const s of S.seqs) { const g = s.group || 0; if (!groups.has(g)) groups.set(g, []); groups.get(g).push(s); }
    for (const list of groups.values()) {
      const L = list.reduce((m, s) => Math.max(m, s.res.length), 0);
      for (const s of list) if (s.res.length < L) s.res = s.res + '-'.repeat(L - s.res.length);
      if (dropEmpty && L) {
        const keep = [];
        for (let c = 0; c < L; c++) { let any = false; for (const s of list) if (s.res.charCodeAt(c) !== 45) { any = true; break; } if (any) keep.push(c); }
        if (keep.length !== L) for (const s of list) { let o = ''; for (const c of keep) o += s.res[c]; s.res = o; }
      }
    }
  }
  const ungapped = (s) => s.res.replace(/-/g, '');

  /* ------------------------------------------------------------ stats */
  let statsCache = null;
  App.stats = () => {
    if (statsCache && statsCache.ver === S.ver && statsCache.n === S.opts.view + App.rows().length) return statsCache;
    const rows = App.rows(), L = App.alnLen();
    const st = rows.length ? BW.columnStats(rows.map((s) => s.res), App.mainType(), 0.5) : { cons: '', ident: new Float32Array(0), gapFrac: new Float32Array(0) };
    const diff = new Uint8Array(L), list = [];
    const contig = S.group > 0 && rows.length > 0;
    const maps = rows.map((s) => BW.seqMap(s));
    const qAt = (r, c) => { const s = rows[r]; if (!s.trace) return 40; const idx = maps[r].colToIdx[c]; return idx < 0 ? 0 : s.trace.qual[s.tStart + idx]; };
    if (rows.length > 1) {
      for (let c = 0; c < L; c++) {
        let first = '', d = false;
        for (let r = 0; r < rows.length; r++) {
          const ch = rows[r].res[c];
          if (ch === '-' || ch === 'N' || ch === 'X' || ch === undefined) continue;
          if (contig && qAt(r, c) < 20) continue;
          if (!first) first = ch; else if (ch !== first) { d = true; break; }
        }
        if (d) { diff[c] = 1; list.push(c); }
      }
    }
    if (contig) {
      const meta = S.contigs.find((x) => x.id === S.group), ref = meta && meta.scaffold ? App.refSeq() : null;
      const mixes = rows.map((s) => (s.trace ? BW.mixRatios(s.trace) : null));
      const info = (r, c) => {
        const s = rows[r]; if (s === ref) return { skip: true };
        if (!s.trace) return null;
        const idx = maps[r].colToIdx[c]; if (idx < 0) return null;
        const bi = s.tStart + idx, m = mixes[r][bi];
        return { q: s.trace.qual[bi], ratio: m, b2: m >= 0.4 ? BW.secondBase(s.trace, bi) : null };
      };
      const cs = BW.consensusQ(rows.map((s) => s.res), info);
      const ov = S.consOv[S.group] || {}, ovr = new Uint8Array(L), arr = [...cs.cons];
      for (const k in ov) { arr[k] = ov[k]; cs.amb[k] = 0; ovr[k] = 1; }
      Object.assign(st, { cons: arr.join(''), cq: cs.cq, cover: cs.cover, amb: cs.amb, ovr, votes: cs.votes, mode: 'contig', maxCover: Math.max(1, ...cs.cover) });
    }
    const het = new Uint8Array(L);
    for (const s of rows) if (s.trace) {
      const m = BW.mixRatios(s.trace), map = BW.seqMap(s);
      for (let i = s.tStart; i < s.tEnd; i++) if (m[i] >= 0.4 && s.trace.qual[i] >= 6) { const col = map.idxToCol[i - s.tStart]; if (col !== undefined) het[col] = 1; }
    }
    const all = [];
    for (let c = 0; c < L; c++) if (diff[c] || het[c] || (st.amb && st.amb[c])) all.push(c);
    st.diff = diff; st.het = het; st.diffList = all; st.ver = S.ver; st.n = S.opts.view + rows.length;
    return (statsCache = st);
  };
  App.traceRefChar = (seq, bi) => {
    if (App.rows().length < 2) return null;
    const ref = App.refSeq(); if (ref === seq) return null;
    const idx = bi - seq.tStart; if (idx < 0 || idx >= seq.tEnd - seq.tStart) return null;
    const col = BW.seqMap(seq).idxToCol[idx];
    if (col === undefined) return null;
    return ref ? ref.res[col] : App.stats().cons[col];
  };

  /* ------------------------------------------------------------ import */
  const READ_EXT = /\.(ab1|abi|scf|ztr)$/i;
  async function importFiles(fileList) {
    const files = [...fileList]; if (!files.length) return;
    const added = [], errors = [];
    const done = busy('Reading files…'); await nextPaint();
    try {
      for (const f of files) {
        try {
          if (/\.dnascale$|\.json$/i.test(f.name)) { loadProject(JSON.parse(await f.text())); continue; }
          if (READ_EXT.test(f.name) || (await sniffAbif(f))) {
            added.push(seqFromTrace(await BW.parseTraceAsync(await f.arrayBuffer(), f.name)));
          } else if (/\.sff$/i.test(f.name)) {
            const recs = BW.parseSFF(await f.arrayBuffer());
            for (const r of recs) added.push(makeSeq({ name: r.name, seq: r.seq, type: 'dna', qual: r.qual }));
            if (recs.total > recs.length) errors.push(`${f.name}: loaded the first ${recs.length} of ${recs.total.toLocaleString('en-US')} reads`);
          } else {
            const recs = BW.parseAnyText(await f.text(), f.name);
            if (!recs.length) throw new Error('No sequences found');
            for (const r of recs) added.push(makeSeq({ name: r.name || stripExt(f.name), seq: r.seq, desc: r.desc, type: r.type, qual: r.qual }));
          }
        } catch (err) { errors.push(f.name + ': ' + err.message); }
      }
    } finally { done(); }
    if (errors.length) toast(errors[0] + (errors.length > 1 ? ` (+${errors.length - 1} more)` : ''), { ms: 6000 });
    if (added.length) await addSeqs(added, `Added ${added.length} sequence${added.length > 1 ? 's' : ''}`);
  }
  async function sniffAbif(f) { try { const b = new Uint8Array(await f.slice(0, 4).arrayBuffer()); const t = String.fromCharCode(...b); return t === 'ABIF' || t === '.scf' || (b[0] === 0xae && b[1] === 0x5a); } catch (e) { return false; } }

  async function addSeqs(list, message) {
    S.demo = false; pushUndo();
    { const meta = S.contigs.find((c) => c.id === S.group), here = S.group === 0 || (meta && meta.scaffold);
      for (const s of list) if (s.group === undefined && (!here || (S.group > 0 && s.type !== 'dna'))) s.group = 0; }
    if (list.length && list.every((s) => s.group !== undefined && s.group !== S.group)) {
      for (const s of list) { s.res = s.res.toUpperCase(); S.seqs.push(s); }
      normalize(false); changed(); toast(message + (S.contigs.length ? ' (see Unassembled)' : '')); return;
    }
    const hadAligned = S.aligned && App.grp().length > 0;
    const hasTrace = list.some((s) => s.trace);
    // if reads arrive with a FASTA, treat the first DNA FASTA as the reference
    if (!S.refId && hasTrace) {
      const cand = list.find((s) => !s.trace && s.type === 'dna');
      if (cand) S.refId = cand.id;
    }
    const wasEmpty = S.seqs.length === 0;
    for (const s of list) { s.res = s.res.toUpperCase(); if (s.group === undefined) s.group = S.group; S.seqs.push(s); }
    if (wasEmpty) S.name = list.length === 1 ? list[0].name : (hasTrace ? 'Sanger project' : 'Untitled project');
    const ref = App.refSeq();
    if (ref && list.includes(ref) && !hadAligned) { S.seqs = [ref, ...S.seqs.filter((s) => s !== ref)]; }
    if (hadAligned || (ref && hasTrace)) {
      await alignRun({ mode: ref ? 'map' : 'msa', endFree: true, orient: true, only: hadAligned ? list : null, silent: true });
      toast(ref ? `Mapped ${list.filter((s) => s.trace).length || list.length} sequence(s) to ${ref.name}` : message);
    } else {
      normalize(false);
      if (S.seqs.length > 1 && !S.aligned) toast(message + ' — not aligned yet', { action: { label: 'Align…', fn: openAlignDialog } });
      else toast(message);
    }
    setCursorAt(0, 0, true);
    changed();
    $('#empty').hidden = true;
    const firstTrace = App.rows().findIndex((s) => s.trace);
    if (firstTrace >= 0 && !S.cursor) setCursorAt(firstTrace, 0, true);
  }

  /* ------------------------------------------------------------ alignment actions */
  function flipSeq(s) {
    const ung = ungapped(s);
    if (s.trace) {
      const L = s.trace.bases.length, a = s.tStart, b = s.tEnd;
      s.trace = BW.revcompTrace(s.trace); s.tStart = L - b; s.tEnd = L - a;
    }
    s.res = BW.revcomp(ung); s.rc = !s.rc;
    if (s.fq) s.fq = Uint8Array.from(s.fq).reverse();
  }

  async function alignRun(o) {
    const done = o.silent ? () => {} : busy('Aligning…'); await nextPaint();
    try {
      const all = o.only ? App.grp().filter((s) => !o.only.includes(s)) : [];
      let targets = o.only ? o.only.slice() : App.grp();
      const type = App.mainType();
      const ref = App.refSeq() || (o.mode === 'map' ? null : null);
      // optional re-trim of reads
      if (o.trimQ) for (const s of targets) if (s.trace) { const [a, b] = BW.trimByQuality(s.trace.qual, o.trimQ); if (b - a >= 20) applyTrim(s, a, b); }
      // orientation (DNA)
      if (o.orient && type === 'dna') {
        const anchor = ref || (all.length ? all[0] : targets.slice().sort((x, y) => ungapped(y).length - ungapped(x).length)[0]);
        const aSeq = ungapped(anchor);
        const others = targets.filter((s) => s !== anchor && s.type === 'dna');
        const flags = BW.detectOrientation(others.map(ungapped), aSeq);
        let n = 0; others.forEach((s, i) => { if (flags[i]) { flipSeq(s); n++; } });
        if (n && !o.silent) toast(`Reverse-complemented ${n} sequence${n > 1 ? 's' : ''} to match`);
        else if (n) o._flipped = n;
      }
      if (o.only && all.length) {
        // add onto existing alignment
        const base = all.map((s) => s.res);
        const keepCols = base[0] ? base[0].length : 0; void keepCols;
        const newRows = BW.alignAdd(base, targets.map(ungapped), type, { endFree: o.endFree });
        all.forEach((s, i) => (s.res = newRows[i]));
        targets.forEach((s, i) => (s.res = newRows[all.length + i]));
      } else if (o.mode === 'map' && ref) {
        const rest = targets.filter((s) => s !== ref);
        const rows = BW.alignAdd([ungapped(ref)], rest.map(ungapped), type, { endFree: true });
        ref.res = rows[0]; rest.forEach((s, i) => (s.res = rows[i + 1]));
      } else {
        const rows = BW.msa(targets.map(ungapped), type, { endFree: o.endFree });
        targets.forEach((s, i) => (s.res = rows[i]));
      }
      S.aligned = true; normalize(true);
      if (o.mode === 'map' && ref && !o.only && S.group === 0) {
        const id = S.contigs.reduce((m, c) => Math.max(m, c.id), 0) + 1;
        S.contigs.push({ id, name: `Reads on ${ref.name}`, scaffold: true });
        for (const s of targets) s.group = id;
        S.group = id;
      }
    } finally { done(); }
  }

  /** Assemble DNA reads into contigs (overlap–layout–consensus). */
  async function assembleRun(o) {
    const ref = App.refSeq();
    const reads = S.seqs.filter((s) => s.type === 'dna' && s.visible && s !== ref);
    if (reads.length < 2) { toast('Assembly needs at least two DNA reads'); return false; }
    pushUndo();
    const done = busy('Assembling reads…'); await nextPaint();
    let res;
    try {
      if (o.trimQ) for (const s of reads) if (s.trace) { const [a, b] = BW.trimByQuality(s.trace.qual, o.trimQ); if (b - a >= 20) applyTrim(s, a, b); }
      for (const s of reads) s.res = ungapped(s);
      res = BW.assemble(reads.map((s) => s.res), { minOverlap: o.minOverlap, minIdentity: o.minIdentity / 100 });
      if (!res.contigs.length) { undoStack.pop(); toast(`No overlaps of ≥ ${o.minOverlap} bp at ≥ ${o.minIdentity}% identity were found.`, { ms: 6000 }); return false; }
      for (const s of S.seqs) s.group = 0;
      S.contigs = []; S.consOv = {};
      res.contigs.forEach((c, i) => {
        const id = i + 1; S.contigs.push({ id, name: `Contig ${id}` });
        for (const m of c.members) { const s = reads[m.idx]; if (m.flip) flipSeq(s); s.res = m.row; s.group = id; }
      });
      S.aligned = true; S.group = 1; S.cursor = null; S.sel = null; normalize(true);
    } finally { done(); }
    changed();
    const st = App.stats(), review = st.diffList.length;
    const first = st.diffList[0] ?? 0, r0 = Math.max(0, App.rows().findIndex((s) => s.trace));
    setCursorAt(r0, first, false); av.ensureVisible(r0, first, true);
    const nAmb = st.amb ? st.amb.reduce((x, y) => x + y, 0) : 0;
    toast(`${res.contigs.length} contig${res.contigs.length > 1 ? 's' : ''} from ${reads.length - res.singles.length} of ${reads.length} reads${res.singles.length ? ` · ${res.singles.length} unassembled` : ''} · ${nAmb} ambiguous base${nAmb === 1 ? '' : 's'} in contig 1`, review ? { action: { label: 'Review', fn: () => jumpDiff(1) }, ms: 8000 } : { ms: 6000 });
    return true;
  }
  function setGroup(g) {
    if (S.group === g) return;
    S.group = g; S.cursor = null; S.sel = null; S.anchor = null; changed();
    const rows = App.rows(); if (!rows.length) return;
    const st = App.stats(), r0 = Math.max(0, rows.findIndex((s) => s.trace)), c0 = st.diffList[0] ?? 0;
    setCursorAt(r0, c0, false); av.ensureVisible(r0, c0, true);
  }
  function setConsensus(col, ch) {
    pushUndo(); const o = (S.consOv[S.group] = S.consOv[S.group] || {});
    if (ch === null) delete o[col]; else o[col] = ch;
    changed({ layout: false });
  }
  function clearOverrides() { const o = S.consOv[S.group]; if (o && Object.keys(o).length) { S.consOv[S.group] = {}; toast('Manual consensus edits were cleared because columns moved'); } }

  /** remove a row from the alignment and re-insert it (used after flip / trim) */
  async function realignOne(s) {
    const others = App.grp().filter((x) => x !== s);
    if (!S.aligned || !others.length) { s.res = ungapped(s); normalize(false); return; }
    const rows = others.map((x) => x.res), L = rows[0].length, keep = [];
    for (let c = 0; c < L; c++) if (rows.some((r) => r.charCodeAt(c) !== 45)) keep.push(c);
    const base = rows.map((r) => keep.map((c) => r[c]).join(''));
    const out = BW.alignAdd(base, [ungapped(s)], App.mainType(), { endFree: true });
    others.forEach((x, i) => (x.res = out[i])); s.res = out[others.length];
    clearOverrides(); normalize(true);
  }

  /* ------------------------------------------------------------ cursor & selection */
  function setCursorAt(r, c, scroll, extend) {
    const rows = App.rows(), L = App.alnLen();
    if (!rows.length) { S.cursor = null; S.sel = null; return; }
    r = clamp(r, 0, rows.length - 1); c = clamp(c, 0, Math.max(0, L - 1));
    if (!extend || !S.anchor) S.anchor = { r, c };
    S.cursor = { r, c };
    if (extend) S.sel = { r0: Math.min(S.anchor.r, r), r1: Math.max(S.anchor.r, r), c0: Math.min(S.anchor.c, c), c1: Math.max(S.anchor.c, c) };
    else S.sel = null;
    if (scroll) av.ensureVisible(r, c);
    const s = rows[r]; if (s && s.trace) S.focusId = s.id;
    afterSelectionChange();
  }
  function afterSelectionChange() { av.request(); renderInspector(); renderStatus(); syncTrace(true); if (BW.viz) BW.viz.onSelection(); }

  App.onCellDown = (r, c, shift) => setCursorAt(r, c, false, shift);
  App.onCellDrag = (r, c) => { S.anchor = S.anchor || { ...S.cursor }; setCursorAt(r, c, false, true); };
  App.onRowClick = (r, e) => {
    const L = App.alnLen();
    if (e.shiftKey && S.anchor) { S.sel = { r0: Math.min(S.anchor.r, r), r1: Math.max(S.anchor.r, r), c0: 0, c1: L - 1 }; S.cursor = { r, c: S.cursor ? S.cursor.c : 0 }; }
    else { S.anchor = { r, c: 0 }; S.sel = { r0: r, r1: r, c0: 0, c1: L - 1 }; S.cursor = { r, c: S.cursor ? S.cursor.c : 0 }; }
    const s = App.rows()[r]; if (s && s.trace) S.focusId = s.id;
    afterSelectionChange(); renderSidebar();
  };
  App.onRowDrag = (r0, r) => { const L = App.alnLen(); S.sel = { r0: Math.min(r0, r), r1: Math.max(r0, r), c0: 0, c1: L - 1 }; afterSelectionChange(); };
  App.onColClick = (c, shift) => {
    const n = App.rows().length;
    if (shift && S.anchor) S.sel = { r0: 0, r1: n - 1, c0: Math.min(S.anchor.c, c), c1: Math.max(S.anchor.c, c) };
    else { S.anchor = { r: 0, c }; S.sel = { r0: 0, r1: n - 1, c0: c, c1: c }; }
    S.cursor = { r: S.cursor ? S.cursor.r : 0, c }; afterSelectionChange();
  };
  App.onColDrag = (c0, c) => { const n = App.rows().length; S.sel = { r0: 0, r1: n - 1, c0: Math.min(c0, c), c1: Math.max(c0, c) }; S.cursor.c = c; afterSelectionChange(); };
  App.onHoverCell = (hc) => { S.hover = hc; renderStatus(); };

  function selRect() {
    if (S.sel) return S.sel;
    if (S.cursor) return { r0: S.cursor.r, r1: S.cursor.r, c0: S.cursor.c, c1: S.cursor.c };
    return null;
  }

  /* ------------------------------------------------------------ trace dock sync */
  function focusSeq() {
    const f = S.seqs.find((s) => s.id === S.focusId && s.trace && s.visible);
    return f || App.rows().find((s) => s.trace) || null;
  }
  function syncTrace(animate) {
    const s = focusSeq();
    if (tv.seq !== s) tv.set(s);
    renderTraceHead(s);
    if (!s) { tv.focusBase = -1; tv.selRange = null; tv.request(); return; }
    const map = BW.seqMap(s);
    if (S.cursor) {
      const c = S.cursor.c, idx = map.colToIdx[c];
      if (idx >= 0) { tv.focusBase = s.tStart + idx; if (!dockCollapsed) tv.centerOn(tv.focusBase, !animate); }
      else {
        tv.focusBase = -1;
        // nearest residue to the left/right
        let lo = 0, hi = map.idxToCol.length; while (lo < hi) { const m = (lo + hi) >> 1; if (map.idxToCol[m] < c) lo = m + 1; else hi = m; }
        const near = clamp(lo, 0, map.idxToCol.length - 1);
        if (map.idxToCol.length && !dockCollapsed) tv.centerOn(s.tStart + near, !animate);
      }
      // selection range on this read
      const rows = App.rows(), r = rows.indexOf(s);
      if (S.sel && r >= S.sel.r0 && r <= S.sel.r1) {
        let a = -1, b = -1;
        for (let c2 = S.sel.c0; c2 <= S.sel.c1; c2++) { const i = map.colToIdx[c2]; if (i >= 0) { if (a < 0) a = i; b = i; } }
        tv.selRange = a >= 0 ? [s.tStart + a, s.tStart + b] : null;
      } else tv.selRange = null;
    }
    tv.request();
  }

  App.onTraceClick = (bi) => {
    const s = focusSeq(); if (!s) return;
    const idx = bi - s.tStart;
    if (idx < 0 || idx >= s.tEnd - s.tStart) { toast('That base is in the trimmed region — extend the trim in the inspector to include it.'); return; }
    const col = BW.seqMap(s).idxToCol[idx], r = App.rows().indexOf(s);
    setCursorAt(r, col, true);
  };
  App.onTraceHover = (bi) => {
    const s = focusSeq(); S.traceHover = bi >= 0 && s ? { s, bi } : null; renderStatus();
  };

  /* ------------------------------------------------------------ navigation */
  function jumpDiff(dir) {
    const st = App.stats(), list = st.diffList; if (!list.length) { toast('No differences found'); return; }
    const c0 = S.cursor ? S.cursor.c : -1;
    let t;
    if (dir > 0) t = list.find((c) => c > c0); else for (let i = list.length - 1; i >= 0; i--) if (list[i] < c0) { t = list[i]; break; }
    if (t === undefined) { t = dir > 0 ? list[0] : list[list.length - 1]; toast(dir > 0 ? 'Wrapped to first difference' : 'Wrapped to last difference'); }
    // prefer a row that has a trace and a residue here
    const rows = App.rows(); let r = S.cursor ? S.cursor.r : 0;
    if (!rows[r] || rows[r].res[t] === '-') { const rr = rows.findIndex((s) => s.res[t] !== '-' && s.trace); r = rr >= 0 ? rr : Math.max(0, rows.findIndex((s) => s.res[t] !== '-')); }
    S.sel = null; setCursorAt(r, t, false); av.ensureVisible(r, t, true);
  }

  /* ------------------------------------------------------------ editing */
  function editable(s) { return s; }
  function typeResidue(ch) {
    const rect = selRect(); if (!rect) return;
    const rows = App.rows(); pushUndo();
    let refused = 0, n = 0;
    for (let r = rect.r0; r <= rect.r1; r++) {
      const s = rows[r];
      for (let c = rect.c0; c <= rect.c1; c++) {
        const old = s.res[c];
        const dnaOk = /[ACGTUNRYKMSWBDHV]/.test(ch), ok = s.type === 'dna' ? dnaOk : /[A-Z*]/.test(ch);
        if (!ok) { refused++; continue; }
        if (old === '-') { if (s.trace) { refused++; continue; } }
        const bi = s.trace && old !== '-' ? s.tStart + BW.seqMap(s).colToIdx[c] : -1;
        s.res = s.res.slice(0, c) + ch + s.res.slice(c + 1); n++;
        if (bi >= 0) {
          const b = s.trace.bases; s.trace.bases = b.slice(0, bi) + ch + b.slice(bi + 1); s.trace._mix = null;
          if (s.trace.bases[bi] === s.trace.origBases[bi]) s.trace.edited.delete(bi); else s.trace.edited.add(bi);
        }
      }
    }
    if (refused && !n) { undoStack.pop(); toast('Reads can’t gain bases — they mirror the chromatogram. Use a gap, or edit existing bases.'); return; }
    changed({ layout: false });
    if (!S.sel || (rect.c0 === rect.c1 && rect.r0 === rect.r1)) setCursorAt(S.cursor.r, S.cursor.c + 1, true);
  }
  function insertGap() {
    const rect = selRect(); if (!rect) return; pushUndo();
    const rows = App.rows();
    clearOverrides();
    for (let r = rect.r0; r <= rect.r1; r++) { const s = rows[r]; s.res = s.res.slice(0, rect.c0) + '-'.repeat(rect.c1 - rect.c0 + 1) + s.res.slice(rect.c0); }
    S.aligned = true; normalize(false); changed();
  }
  function deleteCells(backspace) {
    const rect = selRect(); if (!rect) return; pushUndo();
    const rows = App.rows(); let refused = 0; clearOverrides();
    for (let r = rect.r0; r <= rect.r1; r++) {
      const s = rows[r];
      let res = s.res;
      // remove gap characters inside range (shifting left); residues become gaps if allowed
      let out = '';
      for (let c = 0; c < res.length; c++) {
        if (c >= rect.c0 && c <= rect.c1) {
          if (res[c] === '-') continue;
          if (s.trace) { refused++; out += res[c]; continue; }
          out += '-'; continue;
        }
        out += res[c];
      }
      s.res = out;
    }
    normalize(false);
    if (refused) toast('Bases of a read are tied to its chromatogram and weren’t removed.');
    changed();
    if (backspace && S.cursor) setCursorAt(S.cursor.r, Math.max(0, S.cursor.c - 1), true);
  }

  /* ------------------------------------------------------------ keyboard */
  document.addEventListener('keydown', (e) => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) { if (!(e.key === 'k' && (e.metaKey || e.ctrlKey))) return; }
    if ($('dialog[open]') && !(e.key === 'k' && (e.metaKey || e.ctrlKey))) return;
    const mod = e.metaKey || e.ctrlKey, k = e.key;
    if (mod && k.toLowerCase() === 'f') { e.preventDefault(); openFind(); return; }
    if (mod && k.toLowerCase() === 'k') { e.preventDefault(); openPalette(); return; }
    if (mod && k.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if (mod && k.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
    if (mod && k.toLowerCase() === 'o') { e.preventDefault(); $('#fileInput').click(); return; }
    if (mod && k === '\\') { e.preventDefault(); toggleSidebar(); return; }
    if (mod && k.toLowerCase() === 'p') { e.preventDefault(); openReport(); return; }
    if (mod && k.toLowerCase() === 's') { e.preventDefault(); exportProject(); return; }
    if (S.opts.view !== 'align' && !mod) { if (k === '1' || k === '2' || k === '3' || k === '4' || k === '5') setView(['align', 'tree', 'matrix', 'analysis', 'viz'][+k - 1]); return; }
    if (!S.seqs.length) return;
    const rows = App.rows(), L = App.alnLen(), cur = S.cursor || { r: 0, c: 0 };
    const extend = e.shiftKey;
    const stop = () => e.preventDefault();
    if (mod && k.toLowerCase() === 'a') { stop(); S.sel = { r0: 0, r1: rows.length - 1, c0: 0, c1: L - 1 }; afterSelectionChange(); return; }
    if (mod && k.toLowerCase() === 'c') { stop(); copySelection(e.shiftKey ? 'fasta' : 'auto'); return; }
    if (mod) return;
    const page = Math.max(1, Math.floor((av.W - av.nameW) / av.cw) - 2);
    switch (k) {
      case 'ArrowRight': stop(); setCursorAt(cur.r, cur.c + (e.altKey ? 10 : 1), true, extend); return;
      case 'ArrowLeft': stop(); setCursorAt(cur.r, cur.c - (e.altKey ? 10 : 1), true, extend); return;
      case 'ArrowDown': stop(); setCursorAt(cur.r + 1, cur.c, true, extend); return;
      case 'ArrowUp': stop(); setCursorAt(cur.r - 1, cur.c, true, extend); return;
      case 'Home': stop(); setCursorAt(cur.r, 0, true, extend); return;
      case 'End': stop(); setCursorAt(cur.r, L - 1, true, extend); return;
      case 'PageDown': stop(); setCursorAt(cur.r, cur.c + page, true, extend); return;
      case 'PageUp': stop(); setCursorAt(cur.r, cur.c - page, true, extend); return;
      case 'Escape': S.sel = null; S.anchor = null; afterSelectionChange(); return;
      case ']': stop(); jumpDiff(1); return;
      case '[': stop(); jumpDiff(-1); return;
      case '?': openHelp(); return;
    }
    if (k === 'Delete' && !S.opts.edit && S.sel && S.sel.c0 === 0 && S.sel.c1 === L - 1) { stop(); removeSelectedRows(); return; }
    if (S.opts.edit) {
      if (k === 'Backspace' || k === 'Delete') { stop(); deleteCells(k === 'Backspace'); return; }
      if (k === '-' || k === ' ') { stop(); insertGap(); return; }
      if (/^[a-zA-Z*]$/.test(k)) { stop(); typeResidue(k.toUpperCase()); return; }
      return;
    }
    switch (k.toLowerCase()) {
      case 'j': jumpDiff(1); break;
      case 'k': jumpDiff(-1); break;
      case 'd': toggleDisplay(); break;
      case 't': toggleTranslate(); break;
      case 'e': toggleEdit(); break;
      case '1': setView('align'); break;
      case '4': setView('analysis'); break;
      case '5': setView('viz'); break;
      case '2': setView('tree'); break;
      case '3': setView('matrix'); break;
      case '=': case '+': setZoom(S.opts.zoom + 2); break;
      case '-': setZoom(S.opts.zoom - 2); break;
    }
  });

  function copySelection(mode) {
    const rect = selRect(); if (!rect) return;
    const rows = App.rows(); const items = [];
    for (let r = rect.r0; r <= rect.r1; r++) items.push({ name: rows[r].name, seq: rows[r].res.slice(rect.c0, rect.c1 + 1) });
    const text = mode === 'fasta' || items.length > 1 ? BW.toFasta(items, 0) : items[0].seq.replace(/-/g, '');
    navigator.clipboard.writeText(text).then(() => toast(`Copied ${items.length > 1 || mode === 'fasta' ? items.length + ' sequences as FASTA' : fmt(text.length) + ' residues'}`), () => toast('Clipboard unavailable'));
  }

  /* ------------------------------------------------------------ toolbar */
  function toggleDisplay() { S.opts.display = S.opts.display === 'dots' ? 'letters' : 'dots'; updateToolbar(); av.request(); }
  function toggleTranslate() { S.opts.translate = !S.opts.translate; updateToolbar(); autoLayout(); av.invalidate(); renderInspector(); setTimeout(() => { av.resize(); tv.resize(); }, 20); }
  function toggleEdit() {
    S.opts.edit = !S.opts.edit; updateToolbar(); av.request();
    toast(S.opts.edit ? 'Editing on — type to replace a base, Space inserts a gap, Backspace removes one' : 'Editing locked');
  }
  function setZoom(z) {
    z = clamp(Math.round(z), 4, 30);
    const sc = av.sc, vw = av.W - av.nameW, centerCol = (sc.scrollLeft + vw / 2) / av.cw;
    S.opts.zoom = z; $('#zoom').value = z; av.layout();
    sc.scrollLeft = Math.max(0, centerCol * av.cw - vw / 2); av.request();
  }
  function updateToolbar() {
    const o = S.opts;
    $$('#segDisplay button').forEach((b) => b.classList.toggle('on', b.dataset.d === o.display));
    $('#btnTranslate').classList.toggle('on', o.translate);
    $('#selCode').style.display = $('#selFrame').style.display = o.translate ? '' : 'none';
    const eb = $('#btnEdit'); eb.classList.toggle('on', o.edit); $('#editLbl').textContent = o.edit ? 'Editing' : 'Locked'; eb.firstElementChild.innerHTML = icon(o.edit ? 'unlock' : 'lock');
    $('#btnUndo').disabled = !undoStack.length; $('#btnRedo').disabled = !redoStack.length;
    const nd = App.stats().diffList.length;
    $('#diffCount').textContent = nd ? `${nd} difference${nd === 1 ? '' : 's'}` : 'No differences';
    $('#btnPrevDiff').disabled = $('#btnNextDiff').disabled = !nd;
    // scheme options by type
    const sel = $('#selScheme'), type = App.mainType();
    const opts = Object.entries(BW.SCHEMES).filter(([k, v]) => v.types === 'both' || v.types === type);
    const want = [['auto', 'Automatic'], ...opts.map(([k, v]) => [k, v.label])];
    if (sel.dataset.type !== type) { sel.innerHTML = want.map(([k, l]) => `<option value="${k}">${l}</option>`).join(''); sel.dataset.type = type; }
    if (![...sel.options].some((x) => x.value === o.scheme)) o.scheme = 'auto';
    sel.value = o.scheme;
    const tb = $('#btnTranslate'); tb.disabled = type !== 'dna';
  }

  /* ------------------------------------------------------------ sidebar */
  function renderSidebar() {
    $('#seqCount').textContent = S.seqs.length;
    const list = $('#seqList'), q = S.filter.toLowerCase();
    const rows = App.rows(), cur = S.cursor ? rows[S.cursor.r] : null;
    const selRows = new Set(); if (S.sel) for (let r = S.sel.r0; r <= S.sel.r1; r++) if (rows[r]) selRows.add(rows[r].id);
    if (!S.seqs.length) { list.innerHTML = `<div class="hint">No sequences yet.<br>Drop files anywhere, or use <b>+</b> above.</div>`; }
    else {
      const itemHtml = (s) => {
      const len = ungapped(s).length;
      const isSel = cur === s || selRows.has(s.id) && selRows.size < rows.length;
      return `<div class="seq ${isSel ? 'sel' : ''} ${s.visible ? '' : 'off'}" data-id="${s.id}" draggable="true">
        <span class="dot ${s.trace ? 'trace' : s.type}"></span><span class="nm" title="${esc(s.name)}">${esc(s.name)}</span>
        <span class="sacts"><button class="eye" data-act="eye" title="${s.visible ? 'Hide' : 'Show'}">${icon(s.visible ? 'eye' : 'eye-off')}</button><button class="eye del" data-act="del" title="Remove from project">${icon('trash')}</button></span>
        <div class="meta">${S.refId === s.id ? '<span class="chip ref">REF</span>' : ''}<span class="num">${fmt(len)} ${s.type === 'dna' ? 'bp' : 'aa'}</span>${s.trace ? `<canvas data-q="${s.id}" width="140" height="24"></canvas>` : ''}${s.rc ? '<span class="chip rc">RC</span>' : ''}</div></div>`;
      };
      const items = S.seqs.filter((s) => !q || s.name.toLowerCase().includes(q));
      if (!S.contigs.length) list.innerHTML = items.map(itemHtml).join('');
      else list.innerHTML = [...S.contigs.map((c) => c.id), 0].map((g) => {
        const all = S.seqs.filter((s) => (s.group || 0) === g), mem = items.filter((s) => (s.group || 0) === g);
        if (!all.length) return '';
        const nm = g ? S.contigs.find((c) => c.id === g).name : 'Unassembled', len = all.reduce((m, s) => Math.max(m, s.res.length), 0);
        return `<div class="grp ${S.group === g ? 'on' : ''}" data-g="${g}" title="Show this ${g ? 'contig' : 'group'}"><b>${esc(nm)}</b><span>${all.filter((s) => s.id !== S.refId).length} read${all.length === 1 ? '' : 's'}${g ? ' · ' + fmt(len) + ' bp' : ''}</span></div>` + mem.map(itemHtml).join('');
      }).join('');
    }
    $$('canvas[data-q]', list).forEach((cv) => {
      const s = S.seqs.find((x) => x.id === cv.dataset.q), q = s.trace.qual, ctx = cv.getContext('2d'), n = q.length;
      const W = cv.width, H = cv.height, th = App.theme; ctx.clearRect(0, 0, W, H);
      const bins = W / 2;
      for (let b = 0; b < bins; b++) {
        const i0 = Math.floor(b * n / bins), i1 = Math.max(i0 + 1, Math.floor((b + 1) * n / bins));
        let sum = 0; for (let i = i0; i < i1; i++) sum += q[i]; const v = sum / (i1 - i0);
        const inTrim = i0 >= s.tStart && i0 < s.tEnd;
        ctx.globalAlpha = inTrim ? 1 : 0.28;
        ctx.fillStyle = v >= 30 ? th.qHigh : v >= 20 ? th.qMid : th.qLow;
        const h = Math.max(2, v / 60 * H); ctx.fillRect(b * 2, H - h, 1.5, h);
      }
    });
    const foot = $('#sbFoot');
    const nTr = S.seqs.filter((s) => s.trace).length, ref = App.refSeq();
    foot.innerHTML = S.seqs.length ? `<button class="btn" data-act="align">${icon('align')}${S.contigs.length ? 'Re-assemble / align…' : ref && nTr ? 'Map reads to reference' : nTr > 1 ? 'Assemble reads…' : 'Align sequences'}</button>` : '';
  }

  $('#seqList').addEventListener('click', (e) => {
    const gh = e.target.closest('.grp'); if (gh) { setGroup(+gh.dataset.g); return; }
    const row = e.target.closest('.seq'); if (!row) return;
    const s = S.seqs.find((x) => x.id === row.dataset.id);
    if (e.target.closest('[data-act="del"]')) { removeSeq(s); return; }
    if (s && (s.group || 0) !== S.group && !e.target.closest('[data-act="eye"]')) setGroup(s.group || 0);
    if (e.target.closest('[data-act="eye"]')) { pushUndo(); s.visible = !s.visible; if (S.cursor) S.cursor.r = Math.min(S.cursor.r, App.rows().length - 1); S.sel = null; changed(); return; }
    const r = App.rows().indexOf(s); if (r < 0) { toast('This sequence is hidden'); return; }
    App.onRowClick(r, e); av.ensureVisible(r, S.cursor ? S.cursor.c : 0);
  });
  $('#seqList').addEventListener('dblclick', (e) => { const row = e.target.closest('.seq'); if (row) renameSeq(S.seqs.find((x) => x.id === row.dataset.id)); });
  $('#seqList').addEventListener('contextmenu', (e) => { const row = e.target.closest('.seq'); if (!row) return; e.preventDefault(); rowMenu(e.clientX, e.clientY, S.seqs.find((x) => x.id === row.dataset.id)); });
  let dragId = null;
  $('#seqList').addEventListener('dragstart', (e) => { const row = e.target.closest('.seq'); if (!row) return; dragId = row.dataset.id; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', 'bw-row'); });
  $('#seqList').addEventListener('dragover', (e) => { if (!dragId) return; e.preventDefault(); $$('.drop-before').forEach((x) => x.classList.remove('drop-before')); const row = e.target.closest('.seq'); if (row) row.classList.add('drop-before'); });
  $('#seqList').addEventListener('drop', (e) => {
    if (!dragId) return; e.preventDefault(); e.stopPropagation();
    const row = e.target.closest('.seq'); const from = S.seqs.findIndex((s) => s.id === dragId); dragId = null;
    $$('.drop-before').forEach((x) => x.classList.remove('drop-before'));
    if (from < 0) return;
    pushUndo(); const [m] = S.seqs.splice(from, 1);
    const to = row ? S.seqs.findIndex((s) => s.id === row.dataset.id) : S.seqs.length;
    S.seqs.splice(to < 0 ? S.seqs.length : to, 0, m); S.sel = null; changed();
  });
  $('#seqList').addEventListener('dragend', () => { dragId = null; $$('.drop-before').forEach((x) => x.classList.remove('drop-before')); });
  $('#seqFilter').addEventListener('input', (e) => { S.filter = e.target.value; renderSidebar(); });
  $('#sbFoot').addEventListener('click', (e) => { if (e.target.closest('[data-act="align"]')) openAlignDialog(); });

  function rowMenu(x, y, s) {
    const isRef = S.refId === s.id;
    showMenu(x, y, [
      { label: 'Rename…', icon: 'edit', run: () => renameSeq(s) },
      { label: isRef ? 'Unset reference' : 'Use as reference', icon: 'pin', run: () => { pushUndo(); S.refId = isRef ? null : s.id; changed(); } },
      s.type === 'dna' ? { label: 'Reverse-complement', icon: 'flip', run: () => flipRow(s) } : null,
      { label: s.visible ? 'Hide' : 'Show', icon: 'eye', run: () => { pushUndo(); s.visible = !s.visible; changed(); } },
      { label: 'Copy as FASTA', icon: 'copy', run: () => navigator.clipboard.writeText(BW.toFasta([{ name: s.name, seq: ungapped(s) }])).then(() => toast('Copied')) },
      '-',
      { label: 'Remove from project', icon: 'trash', hint: 'Del', run: () => removeSeq(s) },
    ].filter(Boolean));
  }
  App.contextMenu = (e, h) => {
    if (h.zone === 'name' || h.inside) { const s = App.rows()[h.row]; if (s) { if (h.zone === 'name') App.onRowClick(h.row, { shiftKey: false }); rowMenu(e.clientX, e.clientY, s); } }
  };
  App.renameRow = (r) => renameSeq(App.rows()[r]);

  async function renameSeq(s) {
    const form = await dialog($('#dlgPaste'), { title: 'Rename sequence', body: `<input class="field" name="n" value="${esc(s.name)}" autofocus style="width:100%">`, ok: 'Rename', onMount: (f) => setTimeout(() => f.n.select(), 30) });
    if (form && form.n.value.trim()) { pushUndo(); s.name = form.n.value.trim().replace(/\s+/g, '_'); changed(); }
  }
  function removeSeq(s) {
    pushUndo(); S.seqs = S.seqs.filter((x) => x !== s); if (S.refId === s.id) S.refId = null;
    S.sel = null; if (S.cursor) S.cursor.r = clamp(S.cursor.r, 0, Math.max(0, App.rows().length - 1));
    if (S.seqs.length) normalize(true); else { S.cursor = null; S.aligned = false; }
    changed(); toast(`Removed ${s.name}`, { action: { label: 'Undo', fn: undo } });
  }
  function removeSelectedRows() {
    const rows = App.rows(), sel = S.sel; if (!sel) return;
    const gone = rows.slice(sel.r0, sel.r1 + 1); if (!gone.length) return;
    pushUndo(); S.seqs = S.seqs.filter((x) => !gone.includes(x)); if (gone.some((x) => x.id === S.refId)) S.refId = null;
    S.sel = null; S.anchor = null; if (S.cursor) S.cursor.r = clamp(S.cursor.r, 0, Math.max(0, App.rows().length - 1));
    if (S.seqs.length) normalize(true); else { S.cursor = null; S.aligned = false; S.group = 0; S.contigs = []; }
    changed(); toast(`Removed ${gone.length} sequence${gone.length > 1 ? 's' : ''}`, { action: { label: 'Undo', fn: undo } });
  }
  async function flipRow(s) {
    pushUndo(); const done = busy('Re-aligning…'); await nextPaint();
    try { flipSeq(s); await realignOne(s); } finally { done(); }
    changed(); toast(`${s.name} reverse-complemented`);
  }

  /* ------------------------------------------------------------ trace dock header */
  let dockCollapsed = false;
  function renderTraceLegend() {}
  function renderTraceHead(s) {
    const empty = $('#trEmpty');
    if (!s) {
      $('#trName').textContent = 'Chromatogram'; $('#trChips').innerHTML = '';
      empty.innerHTML = `<div><div style="font-size:15px;font-weight:600;color:var(--text-2);margin-bottom:4px">No trace loaded</div>Open <b>.ab1</b> files to inspect raw chromatograms here — linked to every base in the alignment.</div>`;
      empty.hidden = false; return;
    }
    empty.hidden = true;
    const t = s.trace, q = t.qual; let sum = 0; for (let i = s.tStart; i < s.tEnd; i++) sum += q[i];
    $('#trName').textContent = s.name;
    $('#trChips').innerHTML = `<span class="chip">${fmt(t.bases.length)} bases</span> ${t.qualEstimated ? '<span class="chip" title="This file has no Phred scores; quality is estimated from peak purity and height">Q estimated</span> ' : ''}<span class="chip ok">mean Q${(sum / Math.max(1, s.tEnd - s.tStart)).toFixed(0)}</span>${s.rc ? ' <span class="chip rc">reverse-complemented</span>' : ''}`;
  }

  /* ------------------------------------------------------------ inspector */
  let inspTimer = 0;
  function renderInspector() { cancelAnimationFrame(inspTimer); inspTimer = requestAnimationFrame(renderInspectorNow); }
  function colCounts(c) {
    const cnt = {}; for (const s of App.rows()) { const ch = s.res[c]; if (ch && ch !== '-') cnt[ch] = (cnt[ch] || 0) + 1; }
    return Object.entries(cnt).sort((a, b) => b[1] - a[1]);
  }
  const AA3 = { A: 'Ala', R: 'Arg', N: 'Asn', D: 'Asp', C: 'Cys', Q: 'Gln', E: 'Glu', G: 'Gly', H: 'His', I: 'Ile', L: 'Leu', K: 'Lys', M: 'Met', F: 'Phe', P: 'Pro', S: 'Ser', T: 'Thr', W: 'Trp', Y: 'Tyr', V: 'Val', '*': 'Stop' };

  function variantEffect(col, s, force) {
    if ((!S.opts.translate && !force) || App.mainType() !== 'dna') return null;
    const ref = App.refSeq(); if (!ref || s === ref) return null;
    const cols = []; for (let c = 0; c < ref.res.length; c++) if (ref.res[c] !== '-') cols.push(c);
    const pos = cols.indexOf(col); if (pos < 0) return null;
    const k = pos - S.opts.frame; if (k < 0) return null;
    const cstart = k - (k % 3) + S.opts.frame; if (cstart + 2 >= cols.length) return null;
    const cc = [cols[cstart], cols[cstart + 1], cols[cstart + 2]];
    const rc = cc.map((c) => ref.res[c]).join(''), vc = cc.map((c) => s.res[c]).join('');
    if (vc.includes('-') || vc.includes('N') || rc === vc) return null;
    const t = BW.codonTable(S.opts.code).map;
    const ra = t[rc] || 'X', va = t[vc] || 'X';
    return { rc, vc, ra, va, n: Math.floor(cstart / 3) + 1, kind: ra === va ? 'synonymous' : va === '*' ? 'nonsense' : 'missense' };
  }

  function renderInspectorNow() {
    const el = $('#inspectorBody'); const rows = App.rows();
    let h = '';
    if (!rows.length) { el.innerHTML = `<div class="hint">Select a base to see what’s there.</div>`; return; }
    const cur = S.cursor, s = cur ? rows[cur.r] : null, th = App.theme;
    /* selection card */
    if (cur && s) {
      const c = cur.c, ch = s.res[c] || '-', map = BW.seqMap(s), idx = map.colToIdx[c];
      const colors = av.cellColors(ch, '', s.type, 'residue') || { bg: th.line2, fg: th.text };
      const q = s.trace && idx >= 0 ? s.trace.qual[s.tStart + idx] : null;
      const cnts = colCounts(c), tot = cnts.reduce((a, b) => a + b[1], 0);
      const st = App.stats();
      const eff = variantEffect(c, s);
      h += `<div class="card"><h4>Position<span class="r">${S.sel && (S.sel.c1 > S.sel.c0 || S.sel.r1 > S.sel.r0) ? '' : ''}</span></h4>
        <div class="bigres"><div class="letter" style="background:${colors.bg || th.line2};color:${colors.bg ? colors.fg : th.text}">${ch === '-' ? '–' : esc(ch)}</div>
        <div class="where"><b>Column ${fmt(c + 1)}</b> <span class="muted">of ${fmt(App.alnLen())}</span><br><span class="muted">${esc(s.name)}${idx >= 0 ? ` · ${s.type === 'dna' ? 'base' : 'residue'} ${fmt(idx + 1)}` : ' · gap'}</span></div></div>
        <dl class="kv">
          ${q !== null ? `<dt>Phred quality</dt><dd><b style="color:${q >= 30 ? 'var(--ok)' : q >= 20 ? 'var(--warn)' : 'var(--bad)'}">Q${q}</b> <span class="muted">(${q >= 30 ? 'high' : q >= 20 ? 'ok' : 'low'})</span></dd>` : ''}
          ${s.trace && idx >= 0 && BW.mixRatios(s.trace)[s.tStart + idx] > 0.33 ? `<dt>Signal</dt><dd><span class="chip" style="background:var(--warn-soft);color:var(--warn);border:0">mixed peak ${Math.round(BW.mixRatios(s.trace)[s.tStart + idx] * 100)}%</span></dd>` : ''}
          ${s.trace && idx >= 0 && s.trace.edited.has(s.tStart + idx) ? `<dt>Edited</dt><dd>was ${s.trace.origBases[s.tStart + idx]}</dd>` : ''}
          <dt>Column identity</dt><dd>${Math.round(st.ident[c] * 100)}%</dd>
          <dt>Consensus</dt><dd class="mono">${esc(st.cons[c] || '-')}</dd>
        </dl>
        ${eff ? `<div class="callout ${eff.kind === 'synonymous' ? '' : 'warn'}" style="margin-top:10px"><b>p.${AA3[eff.ra] || eff.ra}${eff.n}${AA3[eff.va] || eff.va}</b> · ${eff.kind}<br><span class="mono">${eff.rc} → ${eff.vc}</span></div>` : ''}
        ${cnts.length > 1 || tot > 1 ? `<div class="bars">${cnts.slice(0, 6).map(([a, n]) => { const cc = av.cellColors(a, '', s.type, 'residue'); return `<div class="bar"><b class="mono">${a}</b><div class="track"><div class="fill" style="width:${n / tot * 100}%;background:${cc && cc.bg || th.accent}"></div></div><span class="num muted">${n}</span></div>`; }).join('')}</div>` : ''}
      </div>`;
    }
    if (App.contigMode() && cur && s) h += consensusCard(cur.c, rows);
    /* range card */
    const rect = S.sel;
    if (rect && (rect.c1 > rect.c0 || rect.r1 > rect.r0)) {
      const nr = rect.r1 - rect.r0 + 1, nc = rect.c1 - rect.c0 + 1;
      let extra = '';
      if (nr === 1) {
        const seg = rows[rect.r0].res.slice(rect.c0, rect.c1 + 1).replace(/-/g, '');
        const dna = rows[rect.r0].type === 'dna';
        extra = `<dt>Residues</dt><dd>${fmt(seg.length)}</dd>` + (dna ? `<dt>GC content</dt><dd>${(BW.gcContent(seg) * 100).toFixed(1)}%</dd>${BW.tm(seg) ? `<dt>Tm (approx.)</dt><dd>${BW.tm(seg).toFixed(1)} °C</dd>` : ''}` : '');
      }
      h += `<div class="card"><h4>Selection</h4><dl class="kv"><dt>Rows × columns</dt><dd>${nr} × ${fmt(nc)}</dd><dt>Columns</dt><dd>${fmt(rect.c0 + 1)}–${fmt(rect.c1 + 1)}</dd>${extra}</dl>
        <div class="pill-row" style="margin:10px 0 0"><button class="btn sm" data-a="copy">${icon('copy')}Copy</button><button class="btn sm" data-a="copyfasta">FASTA</button>${nr === 1 && s ? `<button class="btn sm" data-a="extract">Extract</button>` : ''}</div></div>`;
    }
    /* read card */
    const fs = focusSeq();
    if (fs) h += readCard(fs);
    /* differences */
    const st = App.stats();
    if (rows.length > 1) {
      const lst = st.diffList;
      h += `<div class="card"><h4>${st.mode === 'contig' ? 'To review' : 'Differences &amp; mixed peaks'} <span class="r muted">${lst.length}</span></h4>${lst.length ? `<div class="list">${lst.slice(0, 250).map((c) => {
        const cn = colCounts(c), tag = st.amb && st.amb[c] ? ' <span class="chip" style="background:var(--warn-soft);color:var(--warn);border:0">ambiguous</span>' : !st.diff[c] ? ' <span class="chip" style="background:var(--warn-soft);color:var(--warn);border:0">mixed</span>' : '';
        return `<button data-goto="${c}"><span><span class="mono">${fmt(c + 1)}</span>${tag}</span><small>${cn.map(([a, n]) => a + (n > 1 ? '×' + n : '')).join(' / ')}</small></button>`;
      }).join('')}</div>${lst.length > 250 ? `<div class="muted" style="margin-top:6px">First 250 shown.</div>` : ''}` : `<div class="callout ok">All aligned sequences agree.</div>`}</div>`;
    }
    /* tools */
    h += toolsCard();
    /* project */
    h += `<div class="card"><h4>Project</h4><dl class="kv"><dt>${S.group ? 'Contig' : 'Sequences'}</dt><dd>${S.group ? esc(S.contigs.find((x) => x.id === S.group).name) : S.seqs.length}</dd><dt>${S.group ? 'Reads' : 'Alignment length'}</dt><dd>${S.group ? rows.filter((x) => x.id !== S.refId).length : ''}</dd><dt>Alignment length</dt><dd>${fmt(App.alnLen())}</dd><dt>Mean identity</dt><dd>${meanIdentity()}</dd><dt>Reference</dt><dd>${App.refSeq() ? esc(App.refSeq().name) : '—'}</dd></dl></div>`;
    el.innerHTML = h;
    bindTools(el);
  }
  function consensusCard(c, rows) {
    const st = App.stats(); if (!st.votes) return '';
    const v = st.votes(c), call = st.cons[c] || '-', th = App.theme, isOv = st.ovr && st.ovr[c], isAmb = st.amb && st.amb[c];
    const colors = av.cellColors(call, '', 'dna', 'residue') || { bg: th.line2, fg: th.text };
    const total = Object.values(v.sc).reduce((x, y) => x + y, 0) || 1;
    const bars = Object.entries(v.sc).filter(([, x]) => x > 0).sort((x, y) => y[1] - x[1]).map(([b, x]) => { const cc = av.cellColors(b, '', 'dna', 'residue'); return `<div class="bar"><b class="mono">${b}</b><div class="track"><div class="fill" style="width:${x / total * 100}%;background:${cc.bg}"></div></div><span class="num muted">${Math.round(x / total * 100)}%</span></div>`; }).join('');
    const status = isOv ? '<span class="chip rc">set manually</span>' : isAmb ? '<span class="chip" style="background:var(--warn-soft);color:var(--warn);border:0">ambiguous</span>' : '<span class="chip ok">automatic</span>';
    const btn = (k, l) => `<button class="btn sm" data-cons="${k}" title="${l || 'Set consensus to ' + k}">${k === '-' ? '–' : k}</button>`;
    return `<div class="card"><h4>Consensus call <span class="r muted">${st.cover[c]}× · Q${st.cq[c]}</span></h4>
      <div class="bigres"><div class="letter" style="background:${colors.bg || th.line2};color:${colors.bg ? colors.fg : th.text}">${call === '-' ? '–' : esc(call)}</div><div class="where"><b>Column ${fmt(c + 1)}</b><br>${status}</div></div>
      <div class="bars">${bars || '<span class="muted">No coverage</span>'}</div>
      <div class="pill-row" style="margin:10px 0 0">${['A', 'C', 'G', 'T', 'R', 'Y', 'S', 'W', 'K', 'M', 'N', '-'].map((k) => btn(k)).join('')}${isOv ? '<button class="btn sm" data-cons="auto">Auto</button>' : ''}</div>
      <div class="muted" style="margin-top:6px;font-size:11.5px">Votes are weighted by Phred quality; mixed peaks count for both bases. Pick a letter to override the call.</div></div>`;
  }
  function meanIdentity() {
    const st = App.stats(), rows = App.rows(); if (rows.length < 2) return '—';
    let sum = 0, n = 0; for (let c = 0; c < st.ident.length; c++) if (st.gapFrac[c] < 0.5) { sum += st.ident[c]; n++; }
    return n ? (sum / n * 100).toFixed(1) + '%' : '—';
  }

  function readCard(s) {
    const t = s.trace, q = t.qual, L = q.length;
    let q20 = 0, q30 = 0, sum = 0, mixN = 0; const mixr = BW.mixRatios(t);
    for (let i = s.tStart; i < s.tEnd; i++) { sum += q[i]; if (q[i] >= 20) q20++; if (q[i] >= 30) q30++; if (mixr[i] > 0.33) mixN++; }
    const n = Math.max(1, s.tEnd - s.tStart);
    const bins = 48, hist = [];
    for (let b = 0; b < bins; b++) { const i0 = Math.floor(b * L / bins), i1 = Math.max(i0 + 1, Math.floor((b + 1) * L / bins)); let m = 0; for (let i = i0; i < i1; i++) m += q[i]; hist.push(m / (i1 - i0)); }
    const meta = Object.entries(t.meta || {}).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
    return `<div class="card"><h4>Read quality <span class="r muted">${esc(s.name)}</span></h4>
      <div class="qhist" title="Phred quality along the read">${hist.map((v, b) => { const inT = (b + .5) * L / bins >= s.tStart && (b + .5) * L / bins < s.tEnd; return `<i style="height:${Math.max(3, v / 60 * 100)}%;opacity:${inT ? .85 : .25};background:${v >= 30 ? 'var(--ok)' : v >= 20 ? 'var(--warn)' : 'var(--bad)'}"></i>`; }).join('')}</div>
      <dl class="kv"><dt>Kept region</dt><dd>${fmt(s.tStart + 1)}–${fmt(s.tEnd)} of ${fmt(L)}</dd><dt>Mean Q</dt><dd>${(sum / n).toFixed(1)}</dd><dt>≥ Q20 / ≥ Q30</dt><dd>${(q20 / n * 100).toFixed(0)}% / ${(q30 / n * 100).toFixed(0)}%</dd><dt>Mixed peaks</dt><dd>${mixN}</dd>${meta}</dl>
      <div class="slider-row" style="margin-top:12px"><label for="trimQ" class="muted">Trim ends below Q</label><b class="num" id="trimQv">${S.trimQ}</b><input type="range" id="trimQ" min="5" max="40" value="${S.trimQ}" style="grid-column:1/-1"></div>
      <div class="pill-row" style="margin-top:8px"><button class="btn sm" data-a="trim">${icon('scissors')}Re-trim this read</button>${mixN ? `<button class="btn sm" data-a="mixlist">Show mixed peaks</button>` : ''}<button class="btn sm" data-a="untrim">Keep all</button></div></div>`;
  }

  /* --- tools card (translate / ORF / restriction) --- */
  function toolSeq() {
    const rows = App.rows(), s = S.cursor ? rows[S.cursor.r] : null; if (!s) return null;
    return { s, seq: ungapped(s), map: BW.seqMap(s) };
  }
  const siteCache = new WeakMap();
  function toolsCard() {
    const ts = toolSeq(); if (!ts || ts.s.type !== 'dna') return '';
    const tab = S.tool, tabs = [['translate', 'Translate'], ['orf', 'ORFs'], ['rest', 'Restriction']];
    let body = '';
    const seq = ts.seq;
    if (tab === 'translate') {
      body = [0, 1, 2].map((f) => {
        const p = BW.translate(seq, S.opts.code, f);
        const pretty = esc(p.slice(0, 600)).replace(/\*/g, '<span class="stop">*</span>').replace(/^M|(?<=\*)M/g, '<span class="met">M</span>');
        return `<div style="margin-bottom:8px"><div class="pill-row"><span class="chip">Frame ${f + 1}</span><span class="muted">${p.length} aa</span></div><div class="protein-out">${pretty}${p.length > 600 ? '…' : ''}</div></div>`;
      }).join('') + `<div class="muted">Code: ${esc(BW.codonTable(S.opts.code).name)}. Change it in the toolbar (Translation).</div>`;
    } else if (tab === 'orf') {
      const orfs = BW.findOrfs(seq, S.opts.code, 30).slice(0, 40);
      body = orfs.length ? `<div class="list">${orfs.map((o, i) => `<button data-orf="${i}"><span>${o.strand > 0 ? '→' : '←'} ${fmt(o.start)}–${fmt(o.end)} ${o.open ? '<span class="muted">(open)</span>' : ''}</span><small>${o.aa} aa · F${o.strand > 0 ? '+' : '−'}${o.frame}</small></button>`).join('')}</div>` : '<div class="muted">No open reading frames ≥ 30 aa.</div>';
      ts._orfs = orfs; toolsState.orfs = orfs;
    } else {
      let res = siteCache.get(ts.s.res !== undefined ? ts.s : {});
      if (!res || res.key !== ts.s.res) { res = { key: ts.s.res, sites: seq.length < 60000 ? BW.findSites(seq) : {} }; siteCache.set(ts.s, res); }
      const all = Object.values(res.sites);
      const filter = S.restFilter || 1;
      const list = all.filter((e) => filter === 0 ? true : filter === 3 ? e.hits.length >= 3 : e.hits.length === filter).sort((a, b) => a.hits[0].cut - b.hits[0].cut);
      body = `<div class="pill-row">${[[1, 'Unique'], [2, 'Two cuts'], [3, '3+'], [0, 'All']].map(([v, l]) => `<button class="btn sm ${filter === v ? 'on' : ''}" data-rest="${v}">${l}</button>`).join('')}</div>` +
        (list.length ? `<div class="list">${list.slice(0, 120).map((e) => `<button data-site="${e.name}"><span><b>${e.name}</b> <span class="muted mono">${e.site.replace(/N+$/g, '')}</span></span><small>${e.hits.map((x) => x.cut).join(', ')}</small></button>`).join('')}</div>` : '<div class="muted">No enzymes cut this sequence that way.</div>');
      toolsState.sites = res.sites;
    }
    return `<div class="card"><h4>Tools <span class="r muted">${esc(ts.s.name)}</span></h4><div class="tabs">${tabs.map(([k, l]) => `<button data-tool="${k}" class="${tab === k ? 'on' : ''}">${l}</button>`).join('')}</div>${body}</div>`;
  }
  const toolsState = {};

  function selectResidueRange(rowIdx, i0, i1) {
    const rows = App.rows(), s = rows[rowIdx], map = BW.seqMap(s);
    const c0 = map.idxToCol[clamp(i0, 0, map.idxToCol.length - 1)], c1 = map.idxToCol[clamp(i1, 0, map.idxToCol.length - 1)];
    S.anchor = { r: rowIdx, c: c0 }; S.cursor = { r: rowIdx, c: c0 }; S.sel = { r0: rowIdx, r1: rowIdx, c0, c1 };
    if (s.trace) S.focusId = s.id;
    av.ensureVisible(rowIdx, c0, true); afterSelectionChange();
  }

  function bindTools(el) {
    const ts = toolSeq();
    el.onclick = (e) => {
      const g = e.target.closest('[data-goto]'); if (g) { const c = +g.dataset.goto; const rows = App.rows(); let r = S.cursor ? S.cursor.r : 0; if (rows[r].res[c] === '-') r = Math.max(0, rows.findIndex((s) => s.res[c] !== '-')); S.sel = null; setCursorAt(r, c, false); av.ensureVisible(r, c, true); return; }
      const tb = e.target.closest('[data-tool]'); if (tb) { S.tool = tb.dataset.tool; renderInspectorNow(); return; }
      const rf = e.target.closest('[data-rest]'); if (rf) { S.restFilter = +rf.dataset.rest; renderInspectorNow(); return; }
      const ob = e.target.closest('[data-orf]'); if (ob && ts) { const o = toolsState.orfs[+ob.dataset.orf]; selectResidueRange(S.cursor.r, o.start - 1, o.end - 1); return; }
      const sb = e.target.closest('[data-site]'); if (sb && ts) { const en = toolsState.sites[sb.dataset.site]; const h = en.hits[0]; selectResidueRange(S.cursor.r, h.pos - 1, h.pos - 1 + en.site.length - 1); return; }
      const cb = e.target.closest('[data-cons]'); if (cb && S.cursor) { setConsensus(S.cursor.c, cb.dataset.cons === 'auto' ? null : cb.dataset.cons); return; }
      const a = e.target.closest('[data-a]'); if (!a) return;
      switch (a.dataset.a) {
        case 'copy': copySelection('auto'); break;
        case 'copyfasta': copySelection('fasta'); break;
        case 'extract': extractSelection(); break;
        case 'trim': retrim(); break;
        case 'untrim': retrim(true); break;
        case 'mixlist': showMixed(); break;
      }
    };
    const tq = $('#trimQ', el);
    if (tq) { tq.oninput = () => { S.trimQ = +tq.value; $('#trimQv').textContent = tq.value; }; }
  }
  async function retrim(all) {
    const s = focusSeq(); if (!s) return;
    let [a, b] = all ? [0, s.trace.bases.length] : BW.trimByQuality(s.trace.qual, S.trimQ);
    if (b - a < 10) { toast('Nothing would be left at that threshold'); return; }
    pushUndo(); const done = busy('Re-trimming…'); await nextPaint();
    try { applyTrim(s, a, b); await realignOne(s); } finally { done(); }
    changed(); toast(all ? 'Using the full read' : `Kept bases ${a + 1}–${b} (Q≥${S.trimQ})`);
  }
  function showMixed() {
    const s = focusSeq(); if (!s) return; const t = s.trace, mix = BW.mixRatios(t), map = BW.seqMap(s);
    const items = [];
    for (let i = s.tStart; i < s.tEnd; i++) if (mix[i] > 0.33) items.push({ label: `Base ${i - s.tStart + 1} · ${t.bases[i]} · Q${t.qual[i]}`, hint: Math.round(mix[i] * 100) + '%', run: () => { setCursorAt(App.rows().indexOf(s), map.idxToCol[i - s.tStart], false); av.ensureVisible(App.rows().indexOf(s), map.idxToCol[i - s.tStart], true); } });
    const r = $('#inspectorBody').getBoundingClientRect();
    showMenu(Math.max(8, r.left + 10), 150, [{ label: 'Mixed peaks (2nd ≥ 33% of 1st)' }, ...items.slice(0, 40)]);
  }
  function extractSelection() {
    const rect = selRect(), s = App.rows()[rect.r0]; if (!s) return;
    const seg = s.res.slice(rect.c0, rect.c1 + 1).replace(/-/g, ''); if (!seg) return;
    addSeqs([makeSeq({ name: `${s.name}_${rect.c0 + 1}-${rect.c1 + 1}`, seq: seg, type: s.type })], 'Extracted selection as a new sequence');
  }

  /* ------------------------------------------------------------ status bar */
  function renderStatus() {
    const el = $('#status'), rows = App.rows();
    let mid = '';
    const tr = S.traceHover;
    if (tr) {
      const t = tr.s.trace, i = tr.bi;
      mid = `<span>Trace · <b>${tr.s.name}</b> · base <b>${i + 1}</b> · <span class="res" style="background:${App.baseColor(t.bases[i], false)}">${t.bases[i]}</span> · Q${t.qual[i]}</span>`;
    } else {
      const hc = S.hover || (S.cursor ? { r: S.cursor.r, c: S.cursor.c } : null);
      if (hc && rows[hc.r]) {
        const s = rows[hc.r], ch = s.res[hc.c], idx = BW.seqMap(s).colToIdx[hc.c];
        const bg = av.cellColors(ch, '', s.type, 'residue');
        mid = `<span><b>${esc(s.name)}</b> · col <b class="num">${fmt(hc.c + 1)}</b>${idx >= 0 ? ` · pos <b class="num">${fmt(idx + 1)}</b>` : ''} · <span class="res" style="background:${bg && bg.bg || 'var(--muted)'};color:${bg && bg.bg ? bg.fg : '#fff'}">${ch === '-' ? '–' : ch}</span></span>`;
      }
    }
    el.innerHTML = `<span>${esc(S.name)}</span><span class="muted">${rows.length} seq · ${fmt(App.alnLen())} columns${S.aligned ? '' : rows.length > 1 ? ' · <b style="color:var(--warn)">not aligned</b>' : ''}</span>${mid}<span class="grow"></span><span>${S.opts.edit ? '<b style="color:var(--warn)">Editing</b>' : 'Locked'}</span><span class="muted">Zoom ${S.opts.zoom}px</span><span class="legal-links"><a href="#" data-legal="imprint">Imprint</a> · <a href="#" data-legal="privacy">Privacy</a> · <a href="#" data-legal="licences">Licences</a></span>`;
  }

  /* ------------------------------------------------------------ dialogs */
  async function openAlignDialog() {
    if (S.seqs.length < 1) { toast('Add sequences first'); return; }
    const ref = App.refSeq(), nTr = S.seqs.filter((s) => s.trace).length, dna = App.mainType() === 'dna';
    const nDna = S.seqs.filter((s) => s.type === 'dna' && s.visible && s !== ref).length;
    const defMode = ref ? 'map' : dna && nDna >= 2 && nTr >= 2 ? 'assemble' : 'msa';
    const form = await dialog($('#dlgAlign'), {
      title: 'Align or assemble', desc: `${S.seqs.length} sequence${S.seqs.length > 1 ? 's' : ''} in the project.`, ok: 'Run',
      body: `<label class="opt"><input type="radio" name="mode" value="map" ${defMode === 'map' ? 'checked' : ''} ${ref ? '' : 'disabled'}><b>Map to reference</b><span>${ref ? `Align everything onto <b>${esc(ref.name)}</b> as a scaffold. Best for Sanger reads of a known sequence.` : 'Right-click a sequence and choose “Use as reference” to enable this.'}</span></label>
        <label class="opt"><input type="radio" name="mode" value="assemble" ${defMode === 'assemble' ? 'checked' : ''} ${dna && nDna >= 2 ? '' : 'disabled'}><b>Assemble reads into contigs</b><span>Finds overlaps between reads (either strand), merges them into contigs and calls a quality-weighted consensus with ambiguity codes. No reference needed.</span></label>
        <label class="opt"><input type="radio" name="mode" value="msa" ${defMode === 'msa' ? 'checked' : ''}><b>Multiple alignment</b><span>Progressive alignment of homologous sequences into one alignment.</span></label>
        <div class="row-opts">
          ${dna ? `<label><input type="checkbox" name="orient" checked> Reverse-complement sequences that match better on the opposite strand</label>` : ''}
          <label><input type="checkbox" name="endFree" ${dna ? 'checked' : ''}> Don’t penalise end gaps (partial sequences and reads)</label>
          ${nTr ? `<label><input type="checkbox" name="trim"> Re-trim reads first, below Q <input class="field" name="trimQ" type="number" min="5" max="40" value="${S.trimQ}" style="width:64px;padding:2px 6px"></label>` : ''}
          <label>Assembly: minimum overlap <input class="field" name="minOv" type="number" min="15" max="500" value="30" style="width:64px;padding:2px 6px"> bp, identity ≥ <input class="field" name="minId" type="number" min="70" max="100" value="90" style="width:58px;padding:2px 6px"> %</label>
        </div>`,
    });
    if (!form) return;
    const mode = form.mode.value, trimQ = form.trim && form.trim.checked ? +form.trimQ.value : 0;
    if (mode === 'assemble') { await assembleRun({ minOverlap: +form.minOv.value, minIdentity: +form.minId.value, trimQ }); return; }
    pushUndo();
    if (mode === 'msa') { for (const s of S.seqs) s.group = 0; S.contigs = []; S.group = 0; S.consOv = {}; }
    await alignRun({ mode, endFree: form.endFree.checked, orient: !!(form.orient && form.orient.checked), trimQ });
    changed(); setCursorAt(0, 0, true);
    const nd = App.stats().diffList.length;
    toast(`Aligned — ${fmt(App.alnLen())} columns, ${nd} to review`, nd ? { action: { label: 'Review', fn: () => jumpDiff(1) } } : {});
  }
  async function openPaste() {
    const form = await dialog($('#dlgPaste'), {
      title: 'Paste sequences', desc: 'FASTA, GenBank, Clustal — or a bare sequence.', ok: 'Add',
      body: `<input class="field" name="n" placeholder="Name (if pasting a bare sequence)" style="width:100%"><textarea class="field" name="t" placeholder=">my_sequence&#10;ATGGCC…" spellcheck="false"></textarea>`,
      onMount: (f) => setTimeout(() => f.t.focus(), 30),
    });
    if (!form || !form.t.value.trim()) return;
    const recs = BW.parseAnyText(form.t.value);
    if (!recs.length) { toast('No sequence found'); return; }
    if (recs.length === 1 && recs[0].name === 'Pasted sequence' && form.n.value.trim()) recs[0].name = form.n.value.trim().replace(/\s+/g, '_');
    const isAln = recs.length > 1 && recs.every((r) => r.seq.length === recs[0].seq.length) && recs.some((r) => r.seq.includes('-'));
    if (isAln) S.aligned = true;
    await addSeqs(recs.map((r) => makeSeq({ name: r.name, seq: r.seq, desc: r.desc })), `Added ${recs.length} sequence${recs.length > 1 ? 's' : ''}`);
  }
  function openHelp() {
    dialog($('#dlgHelp'), {
      title: 'Keyboard shortcuts', cancel: '', ok: 'Done',
      body: `<div class="shortcuts">
        <h5>Navigate</h5><span>Move cursor</span><span><kbd>←</kbd> <kbd>↑</kbd> <kbd>↓</kbd> <kbd>→</kbd></span><span>Extend selection</span><span><kbd>⇧</kbd> + arrows or drag</span>
        <span>Next / previous difference</span><span><kbd>]</kbd> <kbd>[</kbd> or <kbd>J</kbd> <kbd>K</kbd></span><span>Jump 10 columns</span><span><kbd>⌥</kbd> + arrows</span>
        <span>Select all · copy · copy as FASTA</span><span><kbd>⌘A</kbd> <kbd>⌘C</kbd> <kbd>⇧⌘C</kbd></span>
        <h5>View</h5><span>Show differences as dots</span><span><kbd>D</kbd></span><span>Translation track</span><span><kbd>T</kbd></span><span>Zoom</span><span><kbd>+</kbd> <kbd>−</kbd></span><span>Views</span><span><kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> <kbd>4</kbd> <kbd>5</kbd></span><span>Find a sequence</span><span><kbd>⌘F</kbd></span><span>Hide / show sidebar</span><span><kbd>⌘\\</kbd></span>
        <h5>Editing (press <kbd>E</kbd> to unlock)</h5><span>Replace base</span><span>type a letter</span><span>Insert a gap</span><span><kbd>Space</kbd> or <kbd>-</kbd></span><span>Remove gap / clear residue</span><span><kbd>⌫</kbd> <kbd>Del</kbd></span><span>Undo · redo</span><span><kbd>⌘Z</kbd> <kbd>⇧⌘Z</kbd></span>
        <h5>Chromatogram</h5><span>Pan</span><span>drag or scroll</span><span>Zoom</span><span><kbd>⌘</kbd> + scroll, or double-click</span>
        <h5>General</h5><span>Command palette</span><span><kbd>⌘K</kbd></span><span>Open files · save project</span><span><kbd>⌘O</kbd> <kbd>⌘S</kbd></span>
      </div>`,
    });
  }

  /* ------------------------------------------------------------ find */
  let findRes = [], findIdx = -1;
  function openFind() {
    if (!App.rows().length) return; setView('align');
    const p = $('#findPanel'); p.hidden = false; $('#findQ').focus(); $('#findQ').select();
  }
  function closeFind() { $('#findPanel').hidden = true; S.find = null; av.request(); }
  function runFind() {
    const q = $('#findQ').value.trim().toUpperCase().replace(/\s+/g, ''), mode = $('#findMode').value, both = $('#findBoth').checked, minId = +$('#findId').value / 100;
    findRes = []; findIdx = -1;
    $('#findId').parentElement.style.display = mode === 'sim' ? '' : 'none';
    if (q) {
      const rows = App.rows(), st = App.stats();
      rows.forEach((s, r) => {
        const ung = ungapped(s), dna = s.type === 'dna', map = BW.seqMap(s);
        const push = (i0, i1, strand, note) => { if (map.idxToCol.length) findRes.push({ r, i0, i1, strand, c0: map.idxToCol[i0], c1: map.idxToCol[Math.min(i1 - 1, map.idxToCol.length - 1)], label: `${s.name} · ${i0 + 1}–${i1}`, note }); };
        if (mode === 'exact') { for (const h of BW.searchSeq(ung, q, { dna, bothStrands: both })) push(h.start, h.end, h.strand, h.strand < 0 ? 'reverse strand' : ''); }
        else {
          const fw = BW.localAlign(q, ung, s.type), rv = dna && both ? BW.localAlign(BW.revcomp(q), ung, s.type) : null;
          for (const [h, strand] of [[fw, 1], [rv, -1]]) if (h && h.identity >= minId && h.coverage >= 0.8) push(h.start, h.end, strand, `${Math.round(h.identity * 100)}% identity${strand < 0 ? ' · reverse strand' : ''}`);
        }
      });
      if (rows.length > 1) {
        const cons = st.cons, cols = []; for (let c = 0; c < cons.length; c++) if (cons[c] !== '-') cols.push(c);
        const cu = cons.replace(/-/g, ''), dna = App.mainType() === 'dna';
        const add = (i0, i1, strand, note) => findRes.push({ r: -1, i0, i1, strand, c0: cols[i0], c1: cols[Math.min(i1 - 1, cols.length - 1)], label: `Consensus · ${i0 + 1}–${i1}`, note });
        if (mode === 'exact') for (const h of BW.searchSeq(cu, q, { dna, bothStrands: both })) add(h.start, h.end, h.strand, h.strand < 0 ? 'reverse strand' : '');
      }
      findRes = findRes.slice(0, 400);
    }
    S.find = findRes.filter((h) => h.r >= 0); av.request();
    $('#findCount').textContent = q ? `${findRes.length} match${findRes.length === 1 ? '' : 'es'}` : '';
    $('#findList').innerHTML = findRes.slice(0, 80).map((h, i) => `<button data-i="${i}"><span>${esc(h.label)}</span><small>${esc(h.note || '')}</small></button>`).join('');
    if (findRes.length) gotoFind(0);
  }
  function gotoFind(i) {
    if (!findRes.length) return; findIdx = (i + findRes.length) % findRes.length; const h = findRes[findIdx];
    $$('#findList button').forEach((b, k) => b.classList.toggle('on', k === findIdx));
    const on = $('#findList button.on'); if (on) on.scrollIntoView({ block: 'nearest' });
    const rows = App.rows();
    if (h.r >= 0) { S.anchor = { r: h.r, c: h.c0 }; S.cursor = { r: h.r, c: h.c0 }; S.sel = { r0: h.r, r1: h.r, c0: h.c0, c1: h.c1 }; if (rows[h.r].trace) S.focusId = rows[h.r].id; av.ensureVisible(h.r, h.c0, true); }
    else { const r = S.cursor ? S.cursor.r : 0; S.anchor = { r: 0, c: h.c0 }; S.cursor = { r, c: h.c0 }; S.sel = { r0: 0, r1: rows.length - 1, c0: h.c0, c1: h.c1 }; av.ensureVisible(r, h.c0, true); }
    afterSelectionChange();
  }
  $('#findQ').addEventListener('input', runFind); $('#findMode').onchange = runFind; $('#findBoth').onchange = runFind; $('#findId').onchange = runFind;
  $('#findQ').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); gotoFind(findIdx + (e.shiftKey ? -1 : 1)); } else if (e.key === 'Escape') { closeFind(); av.sc.focus(); } });
  $('#findList').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) gotoFind(+b.dataset.i); });
  $('#findNext').onclick = () => gotoFind(findIdx + 1); $('#findPrev').onclick = () => gotoFind(findIdx - 1); $('#findClose').onclick = closeFind;

  /* ------------------------------------------------------------ BLAST (hand-off to NCBI) */
  async function openBlast() {
    const rows = App.rows(); if (!rows.length) { toast('Add a sequence first'); return; }
    const s = S.cursor ? rows[S.cursor.r] : rows[0], rect = S.sel;
    const opts = [];
    if (rect && rect.r0 === rect.r1) { const seg = rows[rect.r0].res.slice(rect.c0, rect.c1 + 1).replace(/-/g, ''); if (seg.length >= 12) opts.push({ k: 'sel', label: `Selection (${fmt(seg.length)} ${s.type === 'dna' ? 'bp' : 'aa'})`, seq: seg, type: rows[rect.r0].type }); }
    opts.push({ k: 'seq', label: `${s.name} (${fmt(ungapped(s).length)})`, seq: ungapped(s), type: s.type });
    if (rows.length > 1 && App.stats().cons) opts.push({ k: 'cons', label: 'Consensus', seq: App.stats().cons.replace(/-/g, ''), type: App.mainType() });
    const form = await dialog($('#dlgAlign'), {
      title: 'BLAST at NCBI', desc: 'Opens the NCBI BLAST page in a new tab with your sequence filled in.', ok: 'Open NCBI BLAST',
      body: `<div class="row-opts">${opts.map((o, i) => `<label><input type="radio" name="src" value="${i}" ${i === 0 ? 'checked' : ''}> ${esc(o.label)}</label>`).join('')}</div>
        <label>Program <select class="sel" name="prog"><option value="auto">Automatic (by sequence type)</option><option value="blastn">blastn — nucleotide vs nucleotide</option><option value="blastp">blastp — protein vs protein</option><option value="blastx">blastx — translated DNA vs protein</option><option value="tblastn">tblastn — protein vs translated DNA</option></select></label>
        <div class="callout warn">The sequence is sent to <b>NCBI</b> (a third party, USA) when the new page opens, through the link address. Do not use this for confidential or unpublished sequences. DNAScale itself never sends your data anywhere.</div>`,
    });
    if (!form) return;
    const o = opts[+form.src.value]; let prog = form.prog.value;
    if (prog === 'auto') prog = o.type === 'protein' ? 'blastp' : 'blastn';
    let q = o.seq.toUpperCase(); if (q.length > 6000) { q = q.slice(0, 6000); toast('Only the first 6,000 residues were sent (link length limit).', { ms: 5000 }); }
    const url = 'https://blast.ncbi.nlm.nih.gov/Blast.cgi?PROGRAM=' + prog + '&PAGE_TYPE=BlastSearch&LINK_LOC=blasthome&QUERY=' + encodeURIComponent(q);
    window.open(url, '_blank', 'noopener');
  }

  /* ------------------------------------------------------------ command palette */
  function commands() {
    const c = [
      { l: 'Open files…', k: '⌘O', f: () => $('#fileInput').click() },
      { l: 'Paste sequences…', f: openPaste },
      { l: 'Load demo project', f: loadDemo },
      { l: 'Align or assemble reads…', f: openAlignDialog },
      { l: 'Copy consensus sequence', f: () => navigator.clipboard.writeText(App.stats().cons.replace(/-/g, '')).then(() => toast('Consensus copied')) },
      { l: 'Go to next difference', k: ']', f: () => jumpDiff(1) },
      { l: 'Go to previous difference', k: '[', f: () => jumpDiff(-1) },
      { l: 'Toggle differences-as-dots', k: 'D', f: toggleDisplay },
      { l: 'Toggle translation track', k: 'T', f: toggleTranslate },
      { l: 'Toggle editing lock', k: 'E', f: toggleEdit },
      { l: 'Show alignment', k: '1', f: () => setView('align') },
      { l: 'Show tree', k: '2', f: () => setView('tree') },
      { l: 'Show pairwise identity', k: '3', f: () => setView('matrix') },
      { l: 'Toggle light / dark theme', f: () => setTheme(App.theme.dark ? 'light' : 'dark') },
      { l: 'Hide / show sequence panel', k: '⌘\\', f: toggleSidebar },
      { l: 'Undo', k: '⌘Z', f: undo }, { l: 'Redo', k: '⇧⌘Z', f: redo },
      { l: 'Export lab report (PDF)', k: '⌘P', f: openReport },
      { l: 'Find a sequence…', k: '⌘F', f: openFind },
      { l: 'BLAST at NCBI…', f: openBlast },
      { l: 'Export edited trace as .ab1', f: () => exportTrace('ab1') },
      { l: 'Export edited trace as .scf', f: () => exportTrace('scf') },
      { l: 'Show sequence analysis (ORFs, restriction, plots)', k: '4', f: () => setView('analysis') },
      { l: 'Show 3D helix and other visualisations', k: '5', f: () => setView('viz') },
      { l: 'Copy chromatogram image', f: () => copyImage(traceCanvas(), 'Chromatogram copied') },
      { l: 'Copy alignment view image', f: () => copyImage(av.cv, 'Alignment view copied') },
      { l: 'Export reads as FASTQ', f: exportFastq },
      { l: 'Legal notice (imprint)', f: () => openLegal('imprint') },
      { l: 'Export alignment (FASTA)', f: () => doExport('aln-fasta') },
      { l: 'Export alignment (Clustal)', f: () => doExport('aln-clustal') },
      { l: 'Export alignment image (PNG)', f: () => doExport('png') },
      { l: 'Export consensus (FASTA)', f: () => doExport('cons') },
      { l: 'Save project file', k: '⌘S', f: exportProject },
      { l: 'Keyboard shortcuts', k: '?', f: openHelp },
    ];
    for (const s of S.seqs) c.push({ l: 'Go to: ' + s.name, k: '', f: () => { const r = App.rows().indexOf(s); if (r >= 0) { setCursorAt(r, S.cursor ? S.cursor.c : 0, true); av.ensureVisible(r, S.cursor.c); } } });
    return c;
  }
  let palSel = 0, palItems = [];
  function openPalette() {
    const d = $('#palette'); d.showModal(); const inp = $('#palInput'); inp.value = ''; renderPalette('');
    inp.focus();
  }
  function renderPalette(q) {
    q = q.toLowerCase().trim();
    const all = commands();
    palItems = (q ? all.filter((c) => q.split(/\s+/).every((w) => c.l.toLowerCase().includes(w))) : all.filter((c) => !c.l.startsWith('Go to:'))).slice(0, 40);
    palSel = 0; drawPalette();
  }
  function drawPalette() {
    $('#palList').innerHTML = palItems.map((c, i) => `<button class="${i === palSel ? 'on' : ''}" data-i="${i}">${esc(c.l)}<small>${c.k || ''}</small></button>`).join('') || '<div class="hint">No matching commands</div>';
    const on = $('#palList .on'); if (on) on.scrollIntoView({ block: 'nearest' });
  }
  $('#palInput').addEventListener('input', (e) => renderPalette(e.target.value));
  $('#palInput').addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); palSel = Math.min(palItems.length - 1, palSel + 1); drawPalette(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); palSel = Math.max(0, palSel - 1); drawPalette(); }
    else if (e.key === 'Enter') { e.preventDefault(); runPal(palSel); }
  });
  $('#palList').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) runPal(+b.dataset.i); });
  function runPal(i) { const c = palItems[i]; if (!c) return; $('#palette').close(); setTimeout(c.f, 30); }
  $('#palette').addEventListener('click', (e) => { if (e.target === $('#palette')) $('#palette').close(); });

  /* ------------------------------------------------------------ exports */
  function download(name, data, type = 'text/plain') {
    const blob = data instanceof Blob ? data : new Blob([data], { type });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  const base = () => (S.name || 'dnascale').replace(/[^\w.-]+/g, '_');
  function doExport(kind) {
    const rows = App.rows(); if (!rows.length) { toast('Nothing to export yet'); return; }
    const items = rows.map((s) => ({ name: s.name, seq: s.res }));
    switch (kind) {
      case 'report': openReport(); break;
      case 'aln-fasta': download(base() + '_alignment.fasta', BW.toFasta(items)); break;
      case 'aln-clustal': download(base() + '_alignment.aln', BW.toClustal(items)); break;
      case 'raw-fasta': download(base() + '_sequences.fasta', BW.toFasta(rows.map((s) => ({ name: s.name, seq: ungapped(s) })))); break;
      case 'cons': { const cm = S.contigs.find((x) => x.id === S.group), nm = (cm ? cm.name.replace(/\s+/g, '_') : base()) + '_consensus'; download(nm + '.fasta', BW.toFasta([{ name: nm, seq: App.stats().cons.replace(/-/g, '') }])); break; }
      case 'sel': { const r = selRect(); download(base() + '_selection.fasta', BW.toFasta(rows.slice(r.r0, r.r1 + 1).map((s) => ({ name: s.name, seq: s.res.slice(r.c0, r.c1 + 1) })))); break; }
      case 'png': {
        const cv = av.renderFull(); cv.toBlob((b) => download(base() + '_alignment.png', b));
        break;
      }
      case 'trace-png': tracePng(); break;
      case 'fastq': exportFastq(); break;
      case 'blast': openBlast(); break;
      case 'ab1': case 'scf': exportTrace(kind); break;
      case 'copy-trace': copyImage(traceCanvas(), 'Chromatogram copied'); break;
      case 'copy-aln': copyImage(av.cv, 'Alignment view copied'); break;
      case 'csv': { const M = BW.identityMatrix(rows.map((s) => s.res)); download(base() + '_identity.csv', ',' + rows.map((s) => s.name).join(',') + '\n' + rows.map((s, i) => s.name + ',' + [...M[i]].map((v) => (v * 100).toFixed(2)).join(',')).join('\n')); break; }
      case 'nwk': { const t = buildTree(); if (t) download(base() + '.nwk', toNewick(t) + ';\n'); break; }
    }
  }
  function traceCanvas() {
    if (!tv.t) { toast('No chromatogram to use'); return null; }
    const cv = document.createElement('canvas'), dpr = 2, W = Math.round(tv.W), H = Math.round(tv.H);
    cv.width = W * dpr; cv.height = H * dpr; tv.render(cv.getContext('2d'), W, H, dpr); return cv;
  }
  function tracePng() { const cv = traceCanvas(); if (cv) cv.toBlob((b) => download(`${base()}_${focusSeq().name}_trace.png`, b)); }
  function copyImage(cv, msg) {
    if (!cv) return;
    cv.toBlob(async (b) => {
      try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]); toast(msg + ' — paste it into your document'); }
      catch (e) { download(`${base()}_image.png`, b); toast('Clipboard blocked by the browser — saved as a PNG instead'); }
    });
  }
  function exportTrace(kind) {
    const s = focusSeq(); if (!s) { toast('Select a read with a chromatogram first'); return; }
    const t = s.trace, L = t.bases.length;
    const bytes = kind === 'ab1' ? BW.writeABIF(t, s.name) : BW.writeSCF(t, s.tStart, L - s.tEnd);
    download(`${s.name}.${kind}`, new Blob([bytes], { type: 'application/octet-stream' }));
    toast(`Saved ${s.name}.${kind} — all ${L} bases, including your edits${kind === 'scf' ? ' (trim saved as clip points)' : ''}`);
  }
  function exportFastq() {
    const items = []; let skipped = 0;
    for (const s of S.seqs) {
      if (!s.visible || s.type !== 'dna') continue;
      const seq = ungapped(s), q = s.trace ? s.trace.qual.slice(s.tStart, s.tEnd) : s.fq;
      if (!q || q.length !== seq.length) { skipped++; continue; }
      items.push({ name: s.name, seq, qual: q });
    }
    if (!items.length) { toast('No sequence has quality values to write as FASTQ'); return; }
    download(base() + '.fastq', BW.toFastq(items));
    toast(`Saved ${items.length} read${items.length > 1 ? 's' : ''} as FASTQ${skipped ? ` · ${skipped} without quality values skipped` : ''}`);
  }
  function buildExportMenu() {
    const items = [
      ['Lab report — PDF…', 'report'], '-', ['Alignment — FASTA', 'aln-fasta'], ['Alignment — Clustal', 'aln-clustal'], ['Sequences, ungapped — FASTA', 'raw-fasta'], ['Consensus — FASTA', 'cons'], ['Selection — FASTA', 'sel'], '-',
      ['Reads with quality — FASTQ', 'fastq'], ['Edited trace — .ab1', 'ab1'], ['Edited trace — .scf', 'scf'], ['BLAST at NCBI…', 'blast'], ['Alignment image — PNG', 'png'], ['Chromatogram — PNG', 'trace-png'], ['Copy chromatogram image', 'copy-trace'], ['Copy alignment view image', 'copy-aln'], '-', ['Identity matrix — CSV', 'csv'], ['Tree — Newick', 'nwk'], '-', ['Project file (.dnascale)', 'proj'],
    ];
    $('#menuExport').innerHTML = items.map((it) => it === '-' ? '<hr>' : `<button data-x="${it[1]}">${it[0]}</button>`).join('');
  }
  $('#menuExport').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; $('#menuExport').hidden = true; b.dataset.x === 'proj' ? exportProject() : doExport(b.dataset.x); });
  $('#btnExport').addEventListener('click', (e) => { e.stopPropagation(); const m = $('#menuExport'); m.hidden = !m.hidden; });
  document.addEventListener('pointerdown', (e) => { if (!e.target.closest('.menu-wrap')) $('#menuExport').hidden = true; });

  async function openReport() {
    if (!App.rows().length) { toast('Add sequences first'); return; }
    const nd = App.stats().diffList.length, nTr = S.seqs.filter((s) => s.trace).length;
    const form = await dialog($('#dlgAlign'), {
      title: 'Lab report (PDF)', desc: 'A vector PDF you can file with your lab notes. Always printed in light colours.', ok: 'Create PDF',
      body: `<div class="row-opts">
        <label><input type="checkbox" checked disabled> Summary and difference table</label>
        <label><input type="checkbox" name="alignment" checked> Alignment pages</label>
        <label><input type="checkbox" name="evidence" ${nTr && nd ? 'checked' : 'disabled'}> Chromatogram evidence for each difference ${nd ? `<span class="muted">(${Math.min(nd, 24)} of ${nd})</span>` : ''}</label>
        <label><input type="checkbox" name="analysis"> Sequence analysis pages (ORF map, G+C plot, restriction map, protein profiles) for the sequence chosen in Analysis</label></div>`,
    });
    if (!form) return;
    const done = busy('Building PDF…'); await nextPaint();
    try {
      const blob = BW.buildReport(App, { alignment: form.alignment.checked, evidence: form.evidence.checked, analysis: form.analysis.checked });
      download(base() + '_report.pdf', blob); toast('Report saved');
    } catch (e) { console.error(e); toast('PDF failed: ' + e.message, { ms: 6000 }); } finally { done(); }
  }

  const LEGAL_TABS = [['imprint', 'Imprint', () => BW.LEGAL_IMPRINT], ['privacy', 'Privacy', () => BW.LEGAL_PRIVACY], ['licences', 'Licences', () => BW.LEGAL_LICENCES]];
  function openLegal(tab = 'imprint') {
    dialog($('#dlgHelp'), {
      title: 'Legal', cancel: '', ok: 'Close',
      body: `<div class="seg" id="ltabs" style="width:max-content">${LEGAL_TABS.map(([k, l]) => `<button type="button" data-t="${k}" class="${k === tab ? 'on' : ''}">${l}</button>`).join('')}</div><div id="lbody" class="legal">${BW.legalHtml(LEGAL_TABS.find((t) => t[0] === tab)[2]())}</div>`,
      onMount: (f) => { f.querySelector('#ltabs').onclick = (e) => { const b = e.target.closest('button[data-t]'); if (!b) return; $$('#ltabs button', f).forEach((x) => x.classList.toggle('on', x === b)); $('#lbody', f).innerHTML = BW.legalHtml(LEGAL_TABS.find((t) => t[0] === b.dataset.t)[2]()); }; },
    });
  }
  $('#status').addEventListener('click', (e) => { const l = e.target.closest('[data-legal]'); if (l) { e.preventDefault(); openLegal(l.dataset.legal); } });

  /* ------------------------------------------------------------ project save / load */
  const arr = (a) => Array.from(a);
  function serialize() {
    return {
      v: 2, name: S.name, refId: S.refId, aligned: S.aligned, group: S.group, contigs: S.contigs, consOv: S.consOv, opts: { ...S.opts, view: 'align' },
      seqs: S.seqs.map((s) => ({
        id: s.id, group: s.group || 0, fq: s.fq ? Array.from(s.fq) : undefined, name: s.name, desc: s.desc, type: s.type, res: s.res, tStart: s.tStart, tEnd: s.tEnd, visible: s.visible, rc: s.rc,
        trace: s.trace && { name: s.trace.name, sample: s.trace.sample, bases: s.trace.bases, origBases: s.trace.origBases, qualEstimated: s.trace.qualEstimated, qual: arr(s.trace.qual), peaks: arr(s.trace.peaks), ch: Object.fromEntries('ACGT'.split('').map((b) => [b, arr(s.trace.ch[b])])), meta: s.trace.meta, edited: [...s.trace.edited], flipped: s.trace.flipped },
      })),
    };
  }
  function loadProject(p) {
    if (!p || !p.seqs) throw new Error('Not a DNAScale project');
    S.seqs = p.seqs.map((o) => {
      const s = { id: o.id || BW.uid(), group: o.group || 0, fq: o.fq ? Uint8Array.from(o.fq) : undefined, name: o.name, desc: o.desc, type: o.type, res: o.res, tStart: o.tStart, tEnd: o.tEnd, visible: o.visible !== false, rc: !!o.rc, trace: null };
      if (o.trace) {
        const t = o.trace;
        s.trace = BW.makeTrace({ name: t.name, sample: t.sample, bases: t.bases, origBases: t.origBases, qual: Uint8Array.from(t.qual), peaks: Int32Array.from(t.peaks), ch: Object.fromEntries('ACGT'.split('').map((b) => [b, Int16Array.from(t.ch[b])])), meta: t.meta || {}, qualEstimated: t.qualEstimated, edited: new Set(t.edited || []), flipped: t.flipped });
      }
      return s;
    });
    S.contigs = p.contigs || []; S.consOv = p.consOv || {}; S.group = p.group || 0;
    S.demo = false; S.name = p.name || 'Untitled project'; S.refId = p.refId || null; S.aligned = !!p.aligned; Object.assign(S.opts, p.opts || {}, { view: 'align' });
    undoStack.length = redoStack.length = 0; S.cursor = null; S.sel = null; S.focusId = null;
    $('#zoom').value = S.opts.zoom; $('#selCode').value = S.opts.code; $('#selFrame').value = S.opts.frame;
    normalize(false); changed(); setView('align');
    if (S.seqs.length) setCursorAt(Math.max(0, App.rows().findIndex((s) => s.trace)), 0, true);
  }
  function exportProject() { if (!S.seqs.length) { toast('Nothing to save yet'); return; } download(base() + '.dnascale', JSON.stringify(serialize()), 'application/json'); toast('Project saved'); }

  // autosave to IndexedDB
  let asTimer = 0;
  function idb() { return new Promise((res, rej) => { const r = indexedDB.open('dnascale', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
  async function idbSet(k, v) { try { const db = await idb(); const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); } catch (e) {} }
  async function idbGet(k) { try { const db = await idb(); return await new Promise((res) => { const q = db.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result); q.onerror = () => res(null); }); } catch (e) { return null; } }
  function scheduleAutosave() { clearTimeout(asTimer); if (!S.seqs.length || S.demo) return; asTimer = setTimeout(() => idbSet('last', serialize()), 1500); }

  /* ------------------------------------------------------------ demo */
  async function loadDemo() {
    const d = BW.demoProject();
    S.seqs = []; S.refId = null; S.aligned = false; S.group = 0; S.contigs = []; S.consOv = {}; undoStack.length = redoStack.length = 0; S.cursor = null; S.sel = null; S.focusId = null;
    S.name = 'Demo — Clone 12 confirmation'; S.demo = true;
    const ref = makeSeq({ name: d.reference.name, seq: d.reference.seq, type: 'dna' });
    const reads = d.reads.map((t) => seqFromTrace(t));
    S.refId = ref.id; S.seqs = [ref, ...reads];
    const done = busy('Building demo…'); await nextPaint();
    try { await alignRun({ mode: 'map', endFree: true, orient: true, silent: true }); } finally { done(); }
    changed(); setView('align');
    const st = App.stats(); const first = st.diffList[0];
    setCursorAt(1, first ?? 0, false); av.ensureVisible(1, first ?? 0, true);
    toast('Demo loaded — press ] to step through differences', { ms: 5000 });
  }

  /* ------------------------------------------------------------ tree + matrix */
  function distMatrix(rows) {
    const M = BW.identityMatrix(rows.map((s) => s.res)), dna = App.mainType() === 'dna';
    return M.map((r) => Array.from(r).map((id) => {
      const p = 1 - id; if (dna) { const x = 1 - 4 * p / 3; return x <= 0.001 ? 3 : -0.75 * Math.log(x); }
      const x = 1 - p; return x <= 0.001 ? 4 : -Math.log(x);
    }).map((d, j) => d));
  }
  function buildTree() {
    const rows = App.rows(); if (rows.length < 3) return null;
    const D = distMatrix(rows); for (let i = 0; i < D.length; i++) D[i][i] = 0;
    return BW.neighborJoining(D, rows.map((s) => s.name));
  }
  function toNewick(n) { return n.children ? '(' + n.children.map(toNewick).join(',') + ')' + ':' + (n.len || 0).toFixed(5) : n.name.replace(/[\s(),:;]/g, '_') + ':' + (n.len || 0).toFixed(5); }
  function renderTree() {
    const svg = $('#treeSvg'), rows = App.rows();
    if (rows.length < 3) { svg.setAttribute('width', 600); svg.setAttribute('height', 200); svg.innerHTML = `<text x="30" y="60" style="fill:var(--muted)">A tree needs at least three aligned sequences.</text>`; $('#treeNote').textContent = ''; return; }
    const tree = buildTree();
    let leafY = 0; const pad = { l: 40, t: 40, r: 220, b: 60 }, rowH = 30;
    let maxX = 0;
    (function lay(n, x) { n.x = x + (n.len || 0); if (n.children) n.children.forEach((c) => lay(c, n.x)); else maxX = Math.max(maxX, n.x); })(tree, 0);
    (function ly(n) { if (!n.children) { n.y = leafY++ * rowH; return n.y; } const ys = n.children.map(ly); n.y = (Math.min(...ys) + Math.max(...ys)) / 2; return n.y; })(tree);
    const W = 760, scale = (W - pad.l - pad.r) / (maxX || 1), H = leafY * rowH + pad.t + pad.b;
    let out = '';
    (function draw(n) {
      const x = pad.l + n.x * scale, y = pad.t + n.y;
      if (n.children) {
        const ys = n.children.map((c) => pad.t + c.y);
        out += `<path class="branch" d="M${x},${Math.min(...ys)}V${Math.max(...ys)}"/>`;
        for (const c of n.children) { const cx = pad.l + c.x * scale, cy = pad.t + c.y; out += `<path class="branch" d="M${x},${cy}H${cx}"/>`; draw(c); }
      } else out += `<g class="tip" data-name="${esc(n.name)}"><circle cx="${x}" cy="${y}" r="4.5" fill="var(--accent)"/><text x="${x + 10}" y="${y + 4}">${esc(n.name)}</text></g>`;
    })(tree);
    const sb = 0.1 * scale ? Math.pow(10, Math.floor(Math.log10(maxX / 3))) : 0.1;
    out += `<g transform="translate(${pad.l},${H - 28})"><path class="branch" d="M0,0H${sb * scale}M0,-4V4M${sb * scale},-4V4"/><text x="${sb * scale + 8}" y="4" style="fill:var(--muted)">${sb} substitutions/site</text></g>`;
    svg.setAttribute('width', W); svg.setAttribute('height', H); svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.innerHTML = out;
    $('#treeNote').textContent = `Neighbour-joining · ${App.mainType() === 'dna' ? 'Jukes–Cantor' : 'Poisson'} distances · unrooted`;
  }
  $('#treeSvg').addEventListener('click', (e) => { const g = e.target.closest('.tip'); if (!g) return; const r = App.rows().findIndex((s) => s.name === g.dataset.name); setView('align'); if (r >= 0) { setCursorAt(r, S.cursor ? S.cursor.c : 0, true); App.onRowClick(r, {}); av.ensureVisible(r, 0); } });

  function renderMatrix() {
    const rows = App.rows(), wrap = $('#matrixWrap');
    if (rows.length < 2) { wrap.innerHTML = '<div class="hint">Add at least two aligned sequences.</div>'; return; }
    const M = BW.identityMatrix(rows.map((s) => s.res));
    let mn = 1; for (let i = 0; i < rows.length; i++) for (let j = 0; j < rows.length; j++) if (i !== j) mn = Math.min(mn, M[i][j]);
    const th = App.theme;
    const col = (v) => { const t = clamp((v - mn) / Math.max(0.0001, 1 - mn), 0, 1); return `color-mix(in srgb, var(--accent) ${Math.round(t * 85 + 5)}%, var(--panel-2))`; };
    wrap.innerHTML = `<table class="mx"><tr><th></th>${rows.map((s) => `<th class="cn">${esc(s.name)}</th>`).join('')}</tr>` +
      rows.map((s, i) => `<tr><th>${esc(s.name)}</th>${rows.map((_, j) => `<td style="background:${i === j ? 'var(--panel-2)' : col(M[i][j])};color:${i === j ? 'var(--muted)' : (M[i][j] - mn) / Math.max(.0001, 1 - mn) > .55 ? '#fff' : 'var(--text)'}" title="${esc(s.name)} vs ${esc(rows[j].name)}">${i === j ? '—' : (M[i][j] * 100).toFixed(1)}</td>`).join('')}</tr>`).join('') + '</table>';
  }

  /* ------------------------------------------------------------ view / layout */
  function setView(v) {
    S.opts.view = v;
    $$('#viewTabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.view === v)));
    $('#viewAlign').hidden = v !== 'align'; $('#viewTree').hidden = v !== 'tree'; $('#viewMatrix').hidden = v !== 'matrix'; $('#viewAnalysis').hidden = v !== 'analysis'; $('#viewViz').hidden = v !== 'viz';
    if (v === 'tree') renderTree(); if (v === 'matrix') renderMatrix(); if (v === 'analysis') BW.analysis.render();
    if (BW.viz) { if (v === 'viz') BW.viz.render(); else BW.viz.setActive(false); }
    if (v === 'align') { autoLayout(); av.resize(); tv.resize(); }
  }
  function toggleSidebar() { $('#app').classList.toggle('no-sidebar'); setTimeout(() => { av.resize(); tv.resize(); }, 30); }
  function toggleInspector() { $('#app').classList.toggle('no-inspector'); setTimeout(() => { av.resize(); tv.resize(); }, 30); }
  $('#btnHideSb').onclick = $('#btnSb').onclick = toggleSidebar;
  $('#btnHideIn').onclick = $('#btnIn').onclick = toggleInspector;

  // splitter
  (function () {
    const sp = $('#splitter'), dock = $('#traceDock'); let sy = 0, sh = 0, drag = false;
    sp.addEventListener('pointerdown', (e) => { drag = true; sy = e.clientY; sh = dock.getBoundingClientRect().height; sp.setPointerCapture(e.pointerId); sp.classList.add('drag'); if (dockCollapsed) setCollapsed(false); });
    sp.addEventListener('pointermove', (e) => {
      if (!drag) return; const mainH = $('#viewAlign').getBoundingClientRect().height;
      const h = clamp(sh + (sy - e.clientY), 130, mainH - 260); dockUser = true; dock.style.flex = 'none'; $('#alignHost').style.flex = '1 1 0'; dock.style.height = h + 'px';
    });
    sp.addEventListener('pointerup', () => { drag = false; sp.classList.remove('drag'); av.resize(); tv.resize(); });
    sp.addEventListener('dblclick', () => { dockUser = false; autoLayout(); setTimeout(() => { av.resize(); tv.resize(); }, 20); });
  })();
  function setCollapsed(c) {
    dockCollapsed = c; $('#traceDock').classList.toggle('collapsed', c); $('#traceBody').hidden = c;
    $('#trCollapse').innerHTML = icon(c ? 'chev-u' : 'chev-d'); $$('.dock-head .tools > :not(#trCollapse)').forEach((x) => (x.hidden = c));
    autoLayout(); setTimeout(() => { av.resize(); tv.resize(); if (!c) syncTrace(false); }, 20);
  }
  $('#trCollapse').onclick = () => setCollapsed(!dockCollapsed);

  /* ------------------------------------------------------------ wiring */
  const av = new BW.AlignView(App);
  const tv = new BW.TraceView($('#traceCanvas'), App);
  App.av = av; App.tv = tv;
  App.variantEffect = variantEffect; window.BWApp = App;
  App.toast = toast; App.setView = setView; App.addSeqs = addSeqs; App.makeSeq = makeSeq; App.selectResidueRange = selectResidueRange;
  App.copyText = (text, msg) => navigator.clipboard.writeText(text).then(() => toast(msg || 'Copied'), () => toast('Clipboard unavailable'));
  App.icon = icon; App.download = download; App.base = base;
  BW.initAnalysis(App); BW.initViz(App);

  $('#zoom').addEventListener('input', (e) => setZoom(+e.target.value));
  $('#selScheme').addEventListener('change', (e) => { S.opts.scheme = e.target.value; av.request(); });
  $$('#segDisplay button').forEach((b) => (b.onclick = () => { S.opts.display = b.dataset.d; updateToolbar(); av.request(); }));
  $('#btnTranslate').onclick = toggleTranslate;
  $('#selCode').innerHTML = Object.entries(BW.GCODES).map(([id, g]) => `<option value="${id}">${id} · ${esc(g.name)}</option>`).join('');
  $('#selCode').onchange = (e) => { S.opts.code = +e.target.value; av.request(); renderInspector(); };
  $('#selFrame').onchange = (e) => { S.opts.frame = +e.target.value; av.request(); renderInspector(); };
  $('#btnEdit').onclick = toggleEdit;
  $('#btnNextDiff').onclick = () => jumpDiff(1); $('#btnPrevDiff').onclick = () => jumpDiff(-1);
  $('#btnUndo').onclick = undo; $('#btnRedo').onclick = redo;
  $('#btnOpen').onclick = () => $('#fileInput').click();
  $('#btnAddSeq').onclick = (e) => { const r = e.currentTarget.getBoundingClientRect(); showMenu(r.left, r.bottom + 4, [{ label: 'Open files…', icon: 'open', run: () => $('#fileInput').click() }, { label: 'Paste sequence…', icon: 'paste', run: openPaste }]); };
  $('#btnAlign').onclick = openAlignDialog;
  $('#btnPalette').onclick = openPalette;
  $('#btnHelp').onclick = openHelp;
  $('#btnTheme').onclick = () => setTheme(App.theme.dark ? 'light' : 'dark');
  $('#fileInput').addEventListener('change', (e) => { importFiles(e.target.files); e.target.value = ''; });
  $$('#viewTabs button').forEach((b) => (b.onclick = () => setView(b.dataset.view)));
  $('#emOpen').onclick = () => $('#fileInput').click(); $('#emDemo').onclick = loadDemo; $('#emPaste').onclick = openPaste;
  $('#emResume').onclick = async () => { const p = await idbGet('last'); if (p) loadProject(p); };
  $('#trZoomIn').onclick = () => tv.zoom(1.4); $('#trZoomOut').onclick = () => tv.zoom(1 / 1.4);
  $('#trGainUp').onclick = () => tv.setGain(1.4); $('#trGainDn').onclick = () => tv.setGain(1 / 1.4);
  $('#trQual').onchange = (e) => { tv.showQual = e.target.checked; tv.draw(); };
  $('#trClassic').onchange = (e) => { tv.classic = e.target.checked; renderTraceLegend(); tv.draw(); };
  $('#trFlip').onclick = () => { const s = focusSeq(); if (s) flipRow(s); };
  $('#trPng').onclick = tracePng; $('#trCopy').onclick = () => copyImage(traceCanvas(), 'Chromatogram copied');
  $('#btnTreeSvg').onclick = () => { const svg = $('#treeSvg').cloneNode(true); svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); const css = `.branch{stroke:#555;stroke-width:1.6;fill:none}text{font:12px sans-serif;fill:#111}`; svg.insertAdjacentHTML('afterbegin', `<style>${css}</style>`); download(base() + '_tree.svg', new XMLSerializer().serializeToString(svg), 'image/svg+xml'); };
  $('#btnTreeNwk').onclick = () => doExport('nwk'); $('#btnMatrixCsv').onclick = () => doExport('csv');

  // drag & drop files
  let dragDepth = 0;
  const hasFiles = (e) => e.dataTransfer && [...e.dataTransfer.types].includes('Files');
  window.addEventListener('dragenter', (e) => { if (!hasFiles(e)) return; dragDepth++; $('#dropOverlay').classList.add('on'); });
  window.addEventListener('dragleave', (e) => { if (!hasFiles(e)) return; if (--dragDepth <= 0) { dragDepth = 0; $('#dropOverlay').classList.remove('on'); } });
  window.addEventListener('dragover', (e) => { if (hasFiles(e)) e.preventDefault(); });
  window.addEventListener('drop', (e) => { if (!hasFiles(e)) return; e.preventDefault(); dragDepth = 0; $('#dropOverlay').classList.remove('on'); importFiles(e.dataTransfer.files); });
  // paste text anywhere
  window.addEventListener('paste', (e) => {
    const t = e.target.tagName; if (t === 'INPUT' || t === 'TEXTAREA') return;
    const text = e.clipboardData && e.clipboardData.getData('text'); if (!text || text.length < 10) return;
    const recs = BW.parseAnyText(text); if (recs.length) { e.preventDefault(); addSeqs(recs.map((r) => makeSeq({ name: r.name, seq: r.seq })), `Pasted ${recs.length} sequence${recs.length > 1 ? 's' : ''}`); }
  });
  window.addEventListener('beforeunload', (e) => { if (S.seqs.length && undoStack.length > 0 && !S.demo) { idbSet('last', serialize()); } });
  window.addEventListener('resize', () => { autoLayout(); av.resize(); tv.resize(); });

  /* ------------------------------------------------------------ boot */
  hydrate(); buildTheme();
  if (innerWidth < 1180) $('#app').classList.add('no-inspector');
  if (innerWidth < 820) $('#app').classList.add('no-sidebar');
  $('#btnTheme').innerHTML = icon(App.theme.dark ? 'sun' : 'moon');
  buildExportMenu(); renderTraceLegend(); setCollapsed(false);
  updateToolbar(); renderSidebar(); renderInspector(); renderStatus();
  av.resize(); tv.resize(); renderTraceHead(null);
  idbGet('last').then((p) => { if (p && p.seqs && p.seqs.length) { $('#emResume').hidden = false; $('#emResume').lastChild.textContent = `Resume “${p.name || 'last session'}”`; } });
  if (/[?&]demo\b/.test(location.search)) loadDemo();
})();
