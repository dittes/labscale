/* MoleculeScale application core: state, scene management, editing operations, tools and pointer handling. */
(function () {
  'use strict';
  const MS = window.MS, EL = MS.EL, V = MS.V, C = MS.chem;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const A = (MS.app = {});
  A.$ = $; A.$$ = $$; A.esc = esc;

  /* ------------------------------------------------------------ icons */
  const ICONS = {
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>', undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 010 11H11"/>', redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 000 11H13"/>',
    open: '<path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>', bolt: '<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>', moon: '<path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>', help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 114 2c-.8.6-1.5 1-1.5 2M12 17h.01"/>',
    'panel-l': '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>', 'panel-r': '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>', tree: '<path d="M4 6h6v12H4M10 12h10M10 6h6M10 18h6"/>', flask: '<path d="M9 3h6M10 3v6L4.5 19a1.6 1.6 0 001.4 2.4h12.2a1.6 1.6 0 001.4-2.4L14 9V3"/><path d="M7.5 15h9"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>', table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M3 14h18M9 4v16"/>', ruler: '<path d="M3 15L15 3l6 6L9 21z"/><path d="M7 11l2 2M10 8l2 2M13 5l2 2"/>',
    pencil: '<path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 013 3L8 19z"/><path d="M14 7l3 3"/>', paste: '<rect x="6" y="5" width="12" height="16" rx="2"/><path d="M9 5V4h6v1M9 11h6M9 15h4"/>', spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 17l.7 1.8 1.8.7-1.8.7L19 22l-.7-1.8-1.8-.7 1.8-.7z"/>',
    navigate: '<path d="M12 3a9 9 0 100 18 9 9 0 000-18z"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>', select: '<path d="M4 4l6.5 16 2.3-6.7L19.5 11z"/>', 'select-box': '<path d="M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3"/><path d="M10 10l5 9 1.5-3.5L20 14z"/>',
    move: '<path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3"/>', measure: '<path d="M3 17L17 3l4 4L7 21z"/><path d="M7 13l2 2M10 10l2 2M13 7l2 2"/>', bond: '<circle cx="6" cy="12" r="3"/><circle cx="18" cy="12" r="3"/><path d="M9 12h6"/><path d="M12 6c2 .5 3.5 2 4 4M12 18c-2-.5-3.5-2-4-4" opacity=".8"/>',
    erase: '<path d="M4 17l8-9 8 7-4 4H8z"/><path d="M13 20h7"/>', fit: '<path d="M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4"/><circle cx="12" cy="12" r="2.5"/>', ortho: '<path d="M4 8l8-4 8 4v8l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v8"/>',
    spin: '<path d="M20 12a8 8 0 11-2.6-5.9"/><path d="M20 4v5h-5"/>', camera: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z"/><circle cx="12" cy="13" r="3.5"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', 'eye-off': '<path d="M3 3l18 18M10.6 6.2A9.8 9.8 0 0112 6c6.5 0 10 6 10 6a17 17 0 01-3.2 3.8M6.4 7.8A16 16 0 002 12s3.5 6 10 6a9.7 9.7 0 003.6-.7"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>', more: '<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
    play: '<path d="M7 4l13 8-13 8z"/>', pause: '<path d="M8 5v14M16 5v14"/>', 'step-l': '<path d="M18 5v14M16 5L7 12l9 7z"/>', 'step-r': '<path d="M6 5v14M8 5l9 7-9 7z"/>', 'chev-d': '<path d="M6 9l6 6 6-6"/>', 'chev-r': '<path d="M9 6l6 6-6 6"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2"/>', trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    cell: '<path d="M4 8l8-4 8 4v8l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v8" opacity=".45"/>', dipole: '<path d="M4 18L18 6M18 6h-5M18 6v5"/><circle cx="5" cy="17" r="2"/>', atom: '<circle cx="12" cy="12" r="2"/><ellipse cx="12" cy="12" rx="9" ry="3.8"/><ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(120 12 12)"/>',
    tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.3"/>', surface: '<path d="M5 15c-2-3 0-9 5-9 3 0 3 2 6 2 4 0 4 5 2 8s-4 4-7 4-4-2-6-5z"/>', save: '<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>',
  };
  A.icon = (n, extra) => `<svg class="i" viewBox="0 0 24 24"${extra ? ' ' + extra : ''}>${ICONS[n] || ''}</svg>`;
  A.hydrate = (root) => { $$('[data-i]', root || document).forEach((el) => { if (!el.dataset.done) { el.innerHTML = A.icon(el.dataset.i); el.style.display = 'inline-flex'; el.dataset.done = 1; } }); };

  /* ------------------------------------------------------------ state */
  const S = (A.S = {
    mol: new MS.Mol(), layers: [], layerSel: 0, tool: 'navigate', el: 6, bo: 1, autoH: true, selMode: 'atom', selOrder: [], undo: [], redo: [],
    auto: false, spin: false, play: false, fps: 8, showDip: false, measure: [], energy: null, dragging: false, info: 'props', side: 'display', busy: false, addMode: false,
  });
  let layerId = 1;
  A.STYLE_NAMES = { bs: 'Ball & stick', stick: 'Sticks', wire: 'Wireframe', vdw: 'Space-filling', cartoon: 'Cartoon', surface: 'Surface', labels: 'Labels', iso: 'Orbital / density' };
  A.mkLayer = (style, props) => Object.assign({ id: layerId++, name: A.STYLE_NAMES[style], style, color: 'element', scope: 'all', vis: true, size: 1, scale: 1, opacity: style === 'surface' ? 0.7 : 1, surf: 'smooth', label: 'element', iso: 0.05, hex: '#7aa2ff', res: 0 }, props || {});
  A.defaultLayers = (m) => {
    if (m.vol && m.meta.orbital) return [A.mkLayer('bs', { size: 0.8 }), A.mkLayer('iso', { iso: 0.18, opacity: 0.8 })];
    if (m.vol) return [A.mkLayer('bs'), A.mkLayer('iso', { iso: 0.04, opacity: 0.75 })];
    if (m.meta.protein && m.atoms.length > 150) {
      const l = [A.mkLayer('cartoon', { scope: 'protein', color: 'ss' })];
      if (m.res.some((r) => !r.aa && !r.water)) l.push(A.mkLayer('bs', { scope: 'ligand', name: 'Ligands' }));
      if (m.res.some((r) => r.water)) l.push(A.mkLayer('vdw', { scope: 'water', name: 'Water', scale: 0.25, vis: false }));
      return l;
    }
    if (m.atoms.length > 800) return [A.mkLayer('stick')];
    if (m.meta.crystal) return [A.mkLayer('bs', { size: 1.25 })];
    return [A.mkLayer('bs')];
  };

  /* ------------------------------------------------------------ renderer */
  const R = (A.R = new MS.Renderer($('#gl'), $('#ov')));
  A.setTheme = (t) => {
    document.documentElement.dataset.theme = t; try { localStorage.setItem('ms-theme', t); } catch (e) { }
    R.opts.dark = t === 'dark'; R.invalidate(false); const b = $('#btnTheme'); if (b) { b.innerHTML = A.icon(t === 'dark' ? 'sun' : 'moon'); }
  };
  Object.defineProperty(R, 'layers', { get: () => S.layers, set: () => { } });
  A.sync = () => { R.setData(S.mol, S.layers); };

  /* ------------------------------------------------------------ refresh scheduling */
  let uiPending = false;
  A.refresh = () => { if (uiPending) return; uiPending = true; requestAnimationFrame(() => { uiPending = false; (A.uiFns || []).forEach((f) => { try { f(); } catch (e) { console.error(e); } }); }); };
  A.uiFns = [];

  /* ------------------------------------------------------------ undo */
  A.snap = (label) => {
    const m = S.mol; S.undo.push({ s: m.snapshot(), label: label || 'Edit', layers: structuredClone(S.layers.map((l) => ({ ...l, _mesh: undefined }))) });
    const cap = m.atoms.length > 4000 ? 8 : 40; if (S.undo.length > cap) S.undo.shift(); S.redo = []; A.persistSoon();
  };
  A.undo = () => { if (!S.undo.length) return; const m = S.mol; S.redo.push({ s: m.snapshot(), layers: structuredClone(S.layers.map((l) => ({ ...l, _mesh: undefined }))) }); const u = S.undo.pop(); m.restore(u.s); S.layers = u.layers; S.selOrder = []; S.measure = []; A.sync(); A.changed(); };
  A.redo = () => { if (!S.redo.length) return; const m = S.mol; S.undo.push({ s: m.snapshot(), layers: structuredClone(S.layers.map((l) => ({ ...l, _mesh: undefined }))) }); const u = S.redo.pop(); m.restore(u.s); S.layers = u.layers; S.selOrder = []; S.measure = []; A.sync(); A.changed(); };
  /** call after any change to the molecule */
  A.changed = (coordsOnly) => {
    const m = S.mol; if (coordsOnly) m.cv = (m.cv || 0) + 1; else { m.touch(); m.cv = (m.cv || 0) + 1; }
    S.energy = null; S.cache = null; R.invalidate(true); A.refresh(); A.persistSoon();
  };
  A.remap = (map) => {
    if (!map) return;
    S.layers.forEach((l) => { if (l.idx) { const s = new Set(); l.idx.forEach((i) => { if (map[i] >= 0) s.add(map[i]); }); l.idx = s; } });
    S.selOrder = S.selOrder.map((i) => map[i]).filter((i) => i >= 0); S.measure = S.measure.map((i) => map[i]).filter((i) => i >= 0);
    A.mz = null;
  };
  A.removeAtoms = (list) => { const map = S.mol.removeAtoms(list); A.remap(map); return map; };

  /* ------------------------------------------------------------ scene */
  A.resetView = () => { const bb = S.mol.bbox(); R.cam.q = [0, 0, 0, 1]; R.cam.fit(bb.c, bb.r); R.invalidate(false); };
  A.fit = (idx) => {
    const m = S.mol; const bb = m.bbox(idx && idx.size ? idx : null); const c = R.cam;
    c.target = bb.c; c.radius = bb.r; c.dist = Math.max(4, bb.r / Math.sin(Math.min(c.fov, 1.2) / 2) * 1.32); R.invalidate(true);
  };
  A.centreOn = (p) => {
    const cam = R.cam, from = cam.target.slice(), t0 = performance.now();
    const step = () => { const k = Math.min(1, (performance.now() - t0) / 260), e = 1 - Math.pow(1 - k, 3); cam.target = [0, 1, 2].map((i) => from[i] + (p[i] - from[i]) * e); R.invalidate(false); if (k < 1) requestAnimationFrame(step); };
    step();
  };
  A.setMol = (m, opts) => {
    opts = opts || {};
    S.mol = m; S.layers = opts.layers || A.defaultLayers(m); S.layerSel = 0; S.selOrder = []; S.measure = []; S.energy = null; S.cache = null; A.mz = null;
    S.undo = []; S.redo = []; R.opts.cell = !!m.cell && !m.meta.protein; S.play = false;
    A.sync(); if (!opts.keepView) { A.resetView(); } A.refresh();
  };
  A.merge = (src, shift) => {
    const m = S.mol; A.snap('Insert'); const n0 = m.atoms.length, r0 = m.res.length;
    if (shift && n0) { const a = m.bbox(), b = src.bbox(); src.translate(null, [a.c[0] + a.r + b.r + 1.5 - b.c[0], a.c[1] - b.c[1], a.c[2] - b.c[2]]); }
    src.atoms.forEach((a) => m.atoms.push(Object.assign({}, a, { r: a.r >= 0 ? a.r + r0 : -1 })));
    src.res.forEach((r) => m.res.push(Object.assign({}, r)));
    src.bonds.forEach((b) => m.bonds.push({ a: b.a + n0, b: b.b + n0, o: b.o }));
    m.frames = []; if (src.cell && !m.cell) m.cell = src.cell; m.touch(); m.sel = new Set(src.atoms.map((_, i) => i + n0));
    S.selOrder = []; A.changed(); A.fit();
  };
  /** Load a molecule: replace the scene or add it, depending on state */
  A.load = (m, opts) => {
    opts = opts || {};
    if ((opts.add || S.addMode) && S.mol.atoms.length) { A.merge(m, true); return; }
    A.setMol(m, opts);
  };

  /* ------------------------------------------------------------ selection */
  A.setSel = (list, order) => {
    const m = S.mol; m.sel = new Set(list); S.selOrder = order || (m.sel.size <= 4 ? [...m.sel] : []); R.invalidate(true); A.refresh();
  };
  A.selectionFor = (i, mode) => {
    const m = S.mol; const a = m.atoms[i];
    if (mode === 'residue' && a.r >= 0) return m.atoms.map((x, k) => (x.r === a.r ? k : -1)).filter((k) => k >= 0);
    if (mode === 'chain' && a.r >= 0) { const ch = m.res[a.r].chain; return m.atoms.map((x, k) => (x.r >= 0 && m.res[x.r].chain === ch ? k : -1)).filter((k) => k >= 0); }
    if (mode === 'fragment') { const { comp } = m.components(); return m.atoms.map((x, k) => (comp[k] === comp[i] ? k : -1)).filter((k) => k >= 0); }
    return [i];
  };
  A.clickSelect = (i, additive, mode) => {
    const list = A.selectionFor(i, mode || S.selMode), m = S.mol;
    if (additive) {
      const all = list.every((k) => m.sel.has(k)); const ns = new Set(m.sel);
      if (all) list.forEach((k) => ns.delete(k)); else list.forEach((k) => ns.add(k));
      S.selOrder = all ? S.selOrder.filter((k) => !list.includes(k)) : S.selOrder.concat(list.length === 1 ? list : []);
      m.sel = ns; if (m.sel.size > 4) S.selOrder = []; R.invalidate(true); A.refresh();
    } else A.setSel(list, list.length === 1 ? list : null);
  };

  /* ------------------------------------------------------------ editing ops */
  const bondLen = (z1, z2, o) => EL[z1].cov + EL[z2].cov - (o === 2 ? 0.17 : o === 3 ? 0.3 : 0);
  A.bondLen = bondLen;
  /** add/remove hydrogens on the given heavy atoms so their valence is satisfied */
  A.adjustH = (list) => {
    const m = S.mol; const heavy = [...new Set(list)].filter((i) => m.atoms[i] && m.atoms[i].e > 1);
    const rm = [];
    heavy.forEach((i) => {
      const a = m.atoms[i], vl = MS.valList(a.e, a.q); if (!vl) return;
      const nb = m.nb()[i]; let s = 0, hs = []; nb.forEach((x) => { s += m.bonds[x.b].o; if (m.atoms[x.j].e === 1 && m.nb()[x.j].length === 1) hs.push(x.j); });
      const excess = s - vl[vl.length - 1];
      if (excess > 0) hs.slice(0, excess).forEach((h) => rm.push(h));
    });
    const refs = heavy.map((i) => m.atoms[i]);
    if (rm.length) A.removeAtoms(rm);
    const idx = refs.map((a) => m.atoms.indexOf(a)).filter((i) => i >= 0);
    idx.forEach((i) => C.addHydrogens(m, [i]));
  };
  A.addBonded = (i, z, order, dirHint) => {
    const m = S.mol; const a = m.atoms[i]; const k = m.nb()[i].length;
    const hy = C.hybrid(m, i); const sn = k + 1;
    const geom = order === 3 || hy === 'sp' || sn <= 2 && order > 1 ? 'sp' : (order === 2 || hy === 'sp2' || sn === 3) ? 'sp2' : 'sp3';
    let d = dirHint;
    if (!d) {
      // prefer a free hydrogen's direction, else compute ideal direction
      const hn = m.nb()[i].find((x) => m.atoms[x.j].e === 1);
      if (hn) { const p = m.pos(hn.j); d = V.norm(V.sub(p, m.pos(i))); }
      else d = C.missingDirs(m, i, 1, geom)[0];
    }
    const L = bondLen(a.e, z, order), j0 = m.addAtom(z, a.x + d[0] * L, a.y + d[1] * L, a.z + d[2] * L, { r: a.r });
    const newAtom = m.atoms[j0], j = j0; m.addBond(i, j, order);
    // drop one hydrogen that was in that slot
    const hs = m.nb()[i].filter((x) => m.atoms[x.j].e === 1 && x.j !== j);
    const over = m.nb()[i].reduce((s, x) => s + m.bonds[x.b].o, 0) - (MS.valList(a.e, a.q) || [99]).slice(-1)[0];
    if (over > 0 && hs.length) A.removeAtoms(hs.slice(0, Math.min(over, hs.length)).map((x) => x.j));
    return m.atoms.indexOf(newAtom);
  };
  A.setElement = (i, z) => { const m = S.mol; m.atoms[i].e = z; m.atoms[i].q = 0; m.touch(); };
  A.deleteAtoms = (list) => {
    const m = S.mol; const set = new Set(list); const heavyN = [];
    set.forEach((i) => m.nb()[i].forEach((x) => { if (!set.has(x.j)) heavyN.push(m.atoms[x.j]); }));
    // also drop hydrogens that would be orphaned
    const orphan = []; set.forEach((i) => { if (m.atoms[i].e > 1) m.nb()[i].forEach((x) => { if (m.atoms[x.j].e === 1) orphan.push(x.j); }); });
    orphan.forEach((h) => set.add(h));
    A.removeAtoms([...set]);
    if (S.autoH) A.adjustH(heavyN.map((a) => m.atoms.indexOf(a)).filter((i) => i >= 0));
  };
  A.deleteSelection = () => { const m = S.mol; if (!m.sel.size) return; A.snap('Delete'); A.deleteAtoms([...m.sel]); A.changed(); };

  /* ------------------------------------------------------------ minimiser / animation */
  A.mzFor = () => {
    const m = S.mol;
    if (!A.mz || A.mz.ver !== m.ver || A.mz.n !== m.atoms.length) { A.mz = { mz: new MS.ff.Minimizer(m, { dt: 0.02, tol: 0.08 }), ver: m.ver, n: m.atoms.length }; }
    return A.mz;
  };
  let lastT = 0;
  R.animating = () => {
    const now = performance.now(), dt = Math.min(0.1, (now - (lastT || now)) / 1000); lastT = now;
    let need = false;
    if (S.spin) { R.cam.rotate(0, 0, 0); R.cam.q = (function () { const q = R.cam.q; const a = 0.6 * dt; const s = Math.sin(a / 2); const r = [0, s, 0, Math.cos(a / 2)]; const [x, y, z, w] = [r[0], r[1], r[2], r[3]]; return [w * q[0] + x * q[3] + y * q[2] - z * q[1], w * q[1] - x * q[2] + y * q[3] + z * q[0], w * q[2] + x * q[1] - y * q[0] + z * q[3], w * q[3] - x * q[0] - y * q[1] - z * q[2]]; })(); need = true; R.dirty = true; }
    if (S.play && S.mol.frames.length > 1) { A.playAcc = (A.playAcc || 0) + dt * S.fps; while (A.playAcc >= 1) { A.playAcc -= 1; A.setFrame((S.mol.frame + 1) % S.mol.frames.length, true); } need = true; }
    if (S.auto && S.mol.atoms.length) {
      const z = A.mzFor(), m = S.mol;
      if (S.dragging || !z.mz.done) {
        z.mz.x.set(m.coords()); if (S.dragging) { z.mz.v.fill(0); z.mz.done = false; }
        z.mz.step(S.dragging ? 6 : 12); m.setCoords(z.mz.x); m.cv = (m.cv || 0) + 1; R.fast = true; R.invalidate(true); S.energy = z.mz.E; need = true; A.refresh();
      } else { R.fast = false; const cur = m.coords(); let moved = 0; for (let i = 0; i < cur.length; i++) moved = Math.max(moved, Math.abs(cur[i] - z.mz.x[i])); if (moved > 1e-6) { z.mz.done = false; } }
    }
    if (need) A.refresh();
    return need || S.auto;
  };
  A.setFrame = (k, noRefresh) => {
    const m = S.mol; if (!m.frames.length) return; k = Math.max(0, Math.min(m.frames.length - 1, k)); m.frame = k; const f = m.frames[k];
    for (let i = 0; i < m.atoms.length; i++) { const a = m.atoms[i]; a.x = f[i * 3]; a.y = f[i * 3 + 1]; a.z = f[i * 3 + 2]; }
    m.cv = (m.cv || 0) + 1; S.energy = m.meta.frameE ? m.meta.frameE[k] : null; A.mz = null; R.invalidate(true); if (!noRefresh) A.refresh();
  };

  /* ------------------------------------------------------------ overlay (tool feedback) */
  let boxSel = null, ghost = null;
  R.hooks.push((ctx) => {
    const m = S.mol, cam = R.cam;
    // measurement annotations
    if (S.tool === 'measure' || S.measure.length) A.drawMeasure(ctx);
    if (boxSel) { ctx.save(); ctx.fillStyle = 'rgba(37,99,235,.12)'; ctx.strokeStyle = 'rgba(37,99,235,.85)'; ctx.lineWidth = 1.2; ctx.setLineDash([5, 3]); ctx.fillRect(boxSel[0], boxSel[1], boxSel[2] - boxSel[0], boxSel[3] - boxSel[1]); ctx.strokeRect(boxSel[0], boxSel[1], boxSel[2] - boxSel[0], boxSel[3] - boxSel[1]); ctx.restore(); }
    if (ghost) {
      ctx.save(); ctx.strokeStyle = 'rgba(37,99,235,.9)'; ctx.lineWidth = 3; ctx.setLineDash([6, 4]); ctx.lineCap = 'round';
      if (ghost.from) { ctx.beginPath(); ctx.moveTo(ghost.from[0], ghost.from[1]); ctx.lineTo(ghost.to[0], ghost.to[1]); ctx.stroke(); }
      ctx.setLineDash([]); ctx.fillStyle = ghost.snap ? 'rgba(37,99,235,.25)' : 'rgba(37,99,235,.18)'; ctx.beginPath(); ctx.arc(ghost.to[0], ghost.to[1], ghost.snap ? 16 : 12, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#' + ((1 << 24) + (Math.round(EL[S.el].col[0] * 255) << 16) + (Math.round(EL[S.el].col[1] * 255) << 8) + Math.round(EL[S.el].col[2] * 255)).toString(16).slice(1);
      ctx.restore();
    }
    if (S.showDip && m.atoms.length) A.drawDipole(ctx);
  });
  A.drawMeasure = (ctx) => {
    const m = S.mol, ids = S.measure; if (!ids.length) return;
    const P = ids.map((i) => (m.atoms[i] ? R.cam.project(m.pos(i)) : null)); if (P.some((p) => !p)) return;
    const dark = R.opts.dark || R.opts.bg === 'black';
    ctx.save(); ctx.lineWidth = 1.8; ctx.strokeStyle = '#f59e0b'; ctx.fillStyle = '#f59e0b'; ctx.setLineDash([6, 4]);
    for (let k = 0; k + 1 < P.length; k++) { ctx.beginPath(); ctx.moveTo(P[k][0], P[k][1]); ctx.lineTo(P[k + 1][0], P[k + 1][1]); ctx.stroke(); }
    ctx.setLineDash([]);
    const label = (x, y, t) => { ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif'; const w = ctx.measureText(t).width + 12; ctx.fillStyle = dark ? 'rgba(20,24,34,.92)' : 'rgba(255,255,255,.95)'; ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - w / 2, y - 10, w, 20, 6) : ctx.rect(x - w / 2, y - 10, w, 20); ctx.fill(); ctx.stroke(); ctx.fillStyle = dark ? '#ffd9a0' : '#9a4b00'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t, x, y + 0.5); };
    P.forEach((p) => { ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(p[0], p[1], 3.5, 0, 7); ctx.fill(); });
    for (let k = 0; k + 1 < P.length; k++) label((P[k][0] + P[k + 1][0]) / 2, (P[k][1] + P[k + 1][1]) / 2 - 12, MS.geom.dist(m, ids[k], ids[k + 1]).toFixed(3) + ' Å');
    if (ids.length >= 3) label(P[1][0], P[1][1] + 22, MS.geom.angle(m, ids[0], ids[1], ids[2]).toFixed(1) + '°');
    if (ids.length === 4) label((P[1][0] + P[2][0]) / 2, (P[1][1] + P[2][1]) / 2 + 24, 'φ ' + MS.geom.dihedral(m, ids[0], ids[1], ids[2], ids[3]).toFixed(1) + '°');
    ctx.restore();
  };
  A.drawDipole = (ctx) => {
    const m = S.mol; const d = C.dipole(m); if (d.debye < 0.01) return; const c = m.centroid();
    const L = Math.min(5, 1 + d.debye * 0.7), u = V.norm(d.vec); const a = R.cam.project(V.sub(c, V.mul(u, L / 2))), b = R.cam.project(V.add(c, V.mul(u, L / 2)));
    ctx.save(); ctx.strokeStyle = '#d946ef'; ctx.fillStyle = '#d946ef'; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]); ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(b[0] - 12 * Math.cos(ang - 0.4), b[1] - 12 * Math.sin(ang - 0.4)); ctx.lineTo(b[0] - 12 * Math.cos(ang + 0.4), b[1] - 12 * Math.sin(ang + 0.4)); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(a[0], a[1], 4, 0, 7); ctx.stroke();
    ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif'; ctx.fillText('μ = ' + d.debye.toFixed(2) + ' D', (a[0] + b[0]) / 2 + 8, (a[1] + b[1]) / 2 - 10); ctx.restore();
  };

  /* ------------------------------------------------------------ pointer handling */
  const stage = $('#stage'), tip = $('#tip');
  const pointers = new Map(); let drag = null, space = false, pinch = null;
  const localXY = (e) => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  A.setTool = (t) => {
    S.tool = t; stage.className = 't-' + t; if (t !== 'measure') { /* keep measure marks until changed */ }
    ghost = null; boxSel = null; R.hover = -1; tip.hidden = true; R.invalidate(true); A.refresh();
  };
  const TOOLS = {};
  A.TOOLS = TOOLS;

  TOOLS.navigate = {
    down(d) { d.mode = d.shift ? 'pan' : d.meta ? 'zoom' : 'rotate'; },
    dbl(d) { if (d.pick.atom >= 0) A.centreOn(S.mol.pos(d.pick.atom)); else A.fit(); },
  };
  TOOLS.select = {
    down(d) { d.mode = 'tool'; },
    move(d) { if (d.moved) { boxSel = [d.x0, d.y0, d.x, d.y]; R.invalidate(false); } },
    up(d) {
      const m = S.mol;
      if (d.moved) {
        const hit = R.pickRect(d.x0, d.y0, d.x, d.y); boxSel = null;
        if (d.shift || d.meta) { const ns = new Set(m.sel); hit.forEach((i) => ns.add(i)); A.setSel(ns, []); } else A.setSel(hit, hit.length <= 4 ? hit : []);
        R.invalidate(false);
      } else if (d.pick.atom >= 0) A.clickSelect(d.pick.atom, d.shift || d.meta);
      else if (d.pick.bond >= 0) { const b = m.bonds[d.pick.bond]; A.setSel([b.a, b.b], [b.a, b.b]); }
      else if (!d.shift && !d.meta) A.setSel([]);
    },
    dbl(d) { if (d.pick.atom >= 0) A.clickSelect(d.pick.atom, false, S.selMode === 'atom' ? 'fragment' : S.selMode); },
  };
  TOOLS.draw = {
    down(d) { d.mode = 'tool'; d.from = d.pick.atom; },
    move(d) {
      const m = S.mol, cam = R.cam;
      if (d.from >= 0 && d.moved) { const p0 = cam.project(m.pos(d.from)); const hov = R.pick(d.x, d.y, 2).atom; ghost = { from: [p0[0], p0[1]], to: hov >= 0 && hov !== d.from ? (() => { const q = cam.project(m.pos(hov)); return [q[0], q[1]]; })() : [d.x, d.y], snap: hov >= 0 && hov !== d.from }; R.invalidate(false); }
      else if (d.from < 0) { ghost = d.moved ? null : null; }
    },
    up(d) {
      const m = S.mol, cam = R.cam; ghost = null;
      if (d.from >= 0 && d.moved) {
        const hov = R.pick(d.x, d.y, 2).atom; A.snap('Draw bond');
        if (hov >= 0 && hov !== d.from) {
          const k = m.bondIndex(d.from, hov); if (k >= 0) m.bonds[k].o = m.bonds[k].o === S.bo ? (S.bo % 3) + 1 : S.bo; else m.addBond(d.from, hov, S.bo);
          if (S.autoH) A.adjustH([d.from, hov]);
        } else {
          const a = m.atoms[d.from]; const pt = cam.unprojectAt(d.x, d.y, m.pos(d.from)); let dir = V.sub(pt, m.pos(d.from)); if (V.len(dir) < 1e-3) dir = [1, 0, 0]; dir = V.norm(dir);
          const j = A.addBonded(d.from, S.el, S.bo, dir); const idx = m.atoms.length - 1;
          if (S.autoH) A.adjustH([d.from, m.atoms.length - 1 === j ? j : j]);
          A.setSel([]);
        }
        A.changed(); return;
      }
      if (d.moved) { R.invalidate(false); return; }
      if (d.from >= 0) { // click on atom
        A.snap('Draw'); const a = m.atoms[d.from];
        if (a.e !== S.el) { A.setElement(d.from, S.el); if (S.autoH) A.adjustH([d.from, ...m.nb()[d.from].map((x) => x.j)]); }
        else { const before = m.atoms.length; const j = A.addBonded(d.from, S.el, S.bo); if (S.autoH) A.adjustH([d.from, j]); }
        A.changed(); return;
      }
      if (d.pick.bond >= 0) {
        A.snap('Bond order'); const b = m.bonds[d.pick.bond]; b.o = b.o === S.bo ? (b.o % 3) + 1 : S.bo; if (S.autoH) A.adjustH([b.a, b.b]); A.changed(); return;
      }
      // empty space: new atom on the plane through the view target
      A.snap('Add atom'); const p = cam.unprojectAt(d.x, d.y, m.atoms.length ? cam.target : [0, 0, 0]);
      const j = m.addAtom(S.el, p[0], p[1], p[2]); if (S.autoH) A.adjustH([j]); A.changed();
      if (m.atoms.length === 1 + m.nb()[j].length) A.resetView && 0;
    },
    rclick(d) { if (d.pick.atom >= 0) { A.snap('Delete atom'); A.deleteAtoms([d.pick.atom]); A.changed(); return true; } if (d.pick.bond >= 0) { A.snap('Delete bond'); const b = S.mol.bonds[d.pick.bond]; S.mol.bonds.splice(d.pick.bond, 1); S.mol.touch(); if (S.autoH) A.adjustH([b.a, b.b]); A.changed(); return true; } return false; },
  };
  TOOLS.erase = {
    down(d) { d.mode = 'tool'; },
    up(d) {
      if (d.moved) return; const m = S.mol;
      if (d.pick.atom >= 0) { A.snap('Delete atom'); A.deleteAtoms([d.pick.atom]); A.changed(); }
      else if (d.pick.bond >= 0) { A.snap('Delete bond'); const b = m.bonds[d.pick.bond]; m.bonds.splice(d.pick.bond, 1); m.touch(); if (S.autoH) A.adjustH([b.a, b.b]); A.changed(); }
    },
  };
  TOOLS.move = {
    down(d) {
      const m = S.mol; d.mode = 'tool';
      if (d.pick.atom >= 0) {
        d.atom = d.pick.atom; d.group = m.sel.has(d.atom) ? [...m.sel] : [d.atom];
        d.depthPlane = m.pos(d.atom); d.start = d.group.map((i) => m.pos(i)); d.p0 = R.cam.unprojectAt(d.x0, d.y0, d.depthPlane); d.snapped = false;
        S.dragging = true; if (S.auto) { const z = A.mzFor(); z.mz.ff.fixed.fill(0); m.atoms.forEach((a, i) => { if (a.fx) z.mz.ff.fixed[i] = 1; }); z.mz.ff.fixed[d.atom] = 1; if (d.group.length > 1) d.group.forEach((i) => { z.mz.ff.fixed[i] = 1; }); }
        R.invalidate(false);
      } else { d.rot = true; d.group = m.sel.size ? [...m.sel] : m.atoms.map((_, i) => i); d.centre = m.centroid(d.group); }
    },
    move(d) {
      const m = S.mol, cam = R.cam;
      if (!d.moved) return;
      if (!d.snapped) { A.snap('Move'); d.snapped = true; }
      if (d.atom !== undefined) {
        let delta;
        if (d.shift) { const f = cam.forward(); delta = V.mul(f, -(d.y - d.y0) * 0.02); }
        else delta = V.sub(cam.unprojectAt(d.x, d.y, d.depthPlane), d.p0);
        d.group.forEach((i, k) => m.setPos(i, V.add(d.start[k], delta)));
        A.changed(true); S.dragging = true;
      } else if (d.rot) {
        const Rm = cam.R(); const dx = d.x - d.px, dy = d.y - d.py;
        if (dx) C.rotateAbout(m, d.group, d.centre, Rm[1], dx * 0.0085); if (dy) C.rotateAbout(m, d.group, d.centre, Rm[0], dy * 0.0085);
        A.changed(true);
      }
    },
    up(d) { S.dragging = false; if (d.atom !== undefined && d.moved && S.auto) { const z = A.mzFor(); z.mz.ff.fixed.fill(0); S.mol.atoms.forEach((a, i) => { if (a.fx) z.mz.ff.fixed[i] = 1; }); z.mz.done = false; } if (d.atom !== undefined && !d.moved) A.clickSelect(d.atom, d.shift || d.meta); else if (d.atom === undefined && !d.moved) A.setSel([]); A.refresh(); },
  };
  TOOLS.measure = {
    down(d) { d.mode = 'tool'; },
    up(d) {
      if (d.moved) return; const m = S.mol;
      if (d.pick.atom >= 0) { if (S.measure.length >= 4 || S.measure.includes(d.pick.atom)) S.measure = S.measure.includes(d.pick.atom) ? S.measure : []; if (!S.measure.includes(d.pick.atom)) S.measure.push(d.pick.atom); }
      else S.measure = [];
      A.setSel(S.measure, S.measure.slice()); S.info = S.measure.length > 1 ? 'geom' : S.info; A.refresh();
    },
  };
  TOOLS.bond = {
    down(d) {
      d.mode = 'tool'; const m = S.mol; if (d.pick.bond < 0) return;
      const b = m.bonds[d.pick.bond]; let side = C.sideOf(m, b.a, b.b), from = b.a, to = b.b;
      let other = C.sideOf(m, b.b, b.a);
      if (!side && !other) { d.ring = true; return; }
      if (!side || (other && other.size < side.size)) { side = other; from = b.b; to = b.a; }
      d.side = side; d.axisP = m.pos(to); d.axis = V.sub(m.pos(to), m.pos(from)); d.k = d.pick.bond; d.snapped = false; d.ends = [m.pos(from), m.pos(to)];
      A.setSel([b.a, b.b]);
    },
    move(d) {
      if (!d.side || !d.moved) return; const m = S.mol, cam = R.cam;
      if (!d.snapped) { A.snap('Rotate bond'); d.snapped = true; }
      const p = cam.project(d.ends[0]), q = cam.project(d.ends[1]); let s = [q[0] - p[0], q[1] - p[1]]; const l = Math.hypot(s[0], s[1]) || 1; s = [s[0] / l, s[1] / l];
      const n = [-s[1], s[0]]; const ang = ((d.x - d.px) * n[0] + (d.y - d.py) * n[1]) * 0.015;
      const side = [...d.side]; C.rotateAbout(m, side, d.axisP, d.axis, ang); A.changed(true);
    },
    up(d) { if (d.ring && !d.moved) A.toast('That bond is part of a ring and cannot be rotated.'); },
  };

  function onDown(e) {
    stage.setPointerCapture(e.pointerId); const [x, y] = localXY(e); pointers.set(e.pointerId, { x, y });
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }; drag = null; return; }
    const tool = S.tool, T = TOOLS[tool] || TOOLS.navigate;
    drag = { x0: x, y0: y, x, y, px: x, py: y, moved: false, btn: e.button, shift: e.shiftKey, meta: e.metaKey || e.ctrlKey, alt: e.altKey, pick: R.pick(x, y), t0: performance.now() };
    if (e.button === 1 || (e.button === 0 && (e.altKey || space))) drag.mode = 'rotate';
    else if (e.button === 2) drag.mode = 'pan';
    else if (e.button === 0) { if (T.down) T.down(drag); else drag.mode = 'rotate'; }
    if (drag.mode === 'rotate' || drag.mode === 'pan' || drag.mode === 'zoom') stage.classList.add('grabbing');
    const nowT = performance.now(), L = A.lastDown;
    if (e.button === 0 && L && nowT - L.t < 400 && Math.hypot(x - L.x, y - L.y) < 8 && T.dbl) { T.dbl(drag); A.lastDown = null; } else A.lastDown = { t: nowT, x, y };
    e.preventDefault();
  }
  function onMove(e) {
    const [x, y] = localXY(e);
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x, y });
    if (pinch && pointers.size === 2) {
      const [a, b] = [...pointers.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); R.cam.zoom(pinch.d / d); pinch.d = d;
      const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2; R.cam.pan(cx - pinch.cx, cy - pinch.cy); pinch.cx = cx; pinch.cy = cy; R.invalidate(false); return;
    }
    if (!drag) { A.hoverAt(x, y, e); return; }
    drag.px = drag.x; drag.py = drag.y; drag.x = x; drag.y = y;
    if (!drag.moved && Math.hypot(x - drag.x0, y - drag.y0) > 4) drag.moved = true;
    const dx = x - drag.px, dy = y - drag.py, cam = R.cam;
    if (drag.mode === 'rotate') { cam.rotate(dx, dy); R.invalidate(false); }
    else if (drag.mode === 'pan') { cam.pan(dx, dy); R.invalidate(false); }
    else if (drag.mode === 'zoom') { cam.zoom(Math.exp(dy * 0.01)); R.invalidate(false); }
    else if (drag.mode === 'tool') { const T = TOOLS[S.tool]; if (T && T.move) T.move(drag); }
  }
  function onUp(e) {
    pointers.delete(e.pointerId); stage.classList.remove('grabbing');
    if (pinch) { if (pointers.size < 2) pinch = null; return; }
    if (!drag) return; const d = drag; drag = null; const T = TOOLS[S.tool];
    if (d.mode === 'pan' && !d.moved && d.btn === 2) { const handled = T && T.rclick ? T.rclick(d) : false; if (!handled) A.contextMenu(d, e); }
    else if (d.mode === 'tool' && T && T.up) T.up(d);
    S.dragging = false; R.fast = false;
  }
  A.hoverAt = (x, y, e) => {
    if (S.dragging || !S.mol.atoms.length) return;
    const p = R.pick(x, y); const prev = R.hover;
    R.hover = p.atom; stage.classList.toggle('hot', p.atom >= 0 || p.bond >= 0);
    if (prev !== R.hover) R.invalidate(true);
    if (p.atom >= 0) {
      const m = S.mol, a = m.atoms[p.atom], r = a.r >= 0 ? m.res[a.r] : null;
      tip.textContent = `${EL[a.e].sym}${p.atom + 1} · ${EL[a.e].name}${r ? ' · ' + r.name + r.num + (r.chain ? ':' + r.chain : '') : ''}${a.nm && r ? ' ' + a.nm : ''} · ${m.nb()[p.atom].length} bonds`;
      tip.hidden = false; tip.style.left = x + 'px'; tip.style.top = y + 'px';
    } else if (p.bond >= 0) {
      const m = S.mol, b = m.bonds[p.bond]; tip.textContent = `${EL[m.atoms[b.a].e].sym}${b.a + 1}–${EL[m.atoms[b.b].e].sym}${b.b + 1} · order ${b.o} · ${MS.geom.dist(m, b.a, b.b).toFixed(3)} Å`; tip.hidden = false; tip.style.left = x + 'px'; tip.style.top = y + 'px';
    } else tip.hidden = true;
  };
  stage.addEventListener('pointerdown', onDown); stage.addEventListener('pointermove', onMove); stage.addEventListener('pointerup', onUp); stage.addEventListener('pointercancel', onUp);
  stage.addEventListener('pointerleave', () => { tip.hidden = true; if (R.hover >= 0) { R.hover = -1; R.invalidate(true); } });
  stage.addEventListener('contextmenu', (e) => e.preventDefault());
  stage.addEventListener('wheel', (e) => { e.preventDefault(); const [x, y] = localXY(e); const f = Math.exp((e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY) * (e.ctrlKey ? 0.012 : 0.0016)); const cam = R.cam; const before = cam.unprojectAt(x, y, cam.target); cam.zoom(f); const after = cam.unprojectAt(x, y, cam.target); cam.target = V.add(cam.target, V.sub(before, after)); R.invalidate(false); }, { passive: false });
  window.addEventListener('keydown', (e) => { if (e.code === 'Space' && !/INPUT|TEXTAREA|SELECT|BUTTON/.test(document.activeElement.tagName)) { space = true; } });
  window.addEventListener('keyup', (e) => { if (e.code === 'Space') space = false; });
  new ResizeObserver(() => R.invalidate(false)).observe(stage);
})();
