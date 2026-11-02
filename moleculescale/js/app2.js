/* MoleculeScale UI: menus, panels, dialogs, file I/O, calculations. */
(function () {
  'use strict';
  const MS = window.MS, A = MS.app, S = A.S, R = A.R, EL = MS.EL, V = MS.V, C = MS.chem;
  const { $, $$, esc } = A;
  const fmt = (n, d = 2) => Number(n).toFixed(d);

  /* ------------------------------------------------------------ toast / dialog / popup menu */
  A.toast = (msg, err) => { const t = document.createElement('div'); t.className = 'toast' + (err ? ' err' : ''); t.textContent = msg; $('#toasts').appendChild(t); setTimeout(() => t.remove(), err ? 6000 : 3200); };
  const dlg = $('#dlg');
  A.dlg = (o) => new Promise((resolve) => {
    dlg.style.width = (o.width || 560) + 'px';
    dlg.innerHTML = `<div class="dh"><h3>${esc(o.title)}</h3><span class="spacer"></span><button class="btn icon ghost sm" data-x>${A.icon('x')}</button></div><div class="db">${o.body || ''}</div><div class="df"></div>`;
    const df = $('.df', dlg); const btns = o.buttons || [{ label: 'Close' }];
    btns.forEach((b, i) => { const el = document.createElement('button'); el.className = 'btn' + (b.primary ? ' primary' : ''); el.textContent = b.label; el.onclick = async () => { if (b.fn) { const r = await b.fn(dlg); if (r === false) return; } dlg.close(); resolve(i); }; df.appendChild(el); });
    $('[data-x]', dlg).onclick = () => dlg.close();
    dlg.onclose = () => resolve(-1);
    if (!dlg.open) dlg.showModal();
    if (o.onOpen) o.onOpen(dlg);
  });
  let menuStack = [];
  A.closeMenus = () => { menuStack.forEach((m) => m.remove()); menuStack = []; $$('.menubar button.open').forEach((b) => b.classList.remove('open')); };
  A.popMenu = (items, x, y, level) => {
    level = level || 0; while (menuStack.length > level) menuStack.pop().remove();
    const el = document.createElement('div'); el.className = 'menu'; el.style.left = '0px'; el.style.top = '0px';
    items.forEach((it) => {
      if (!it) return;
      if (it === '-') { el.appendChild(document.createElement('hr')); return; }
      if (it.lbl) { const d = document.createElement('div'); d.className = 'lbl'; d.textContent = it.lbl; el.appendChild(d); return; }
      const b = document.createElement('button'); b.innerHTML = `<span class="chk">${it.chk ? '✓' : ''}</span>${it.icon ? A.icon(it.icon) : ''}<span>${esc(it.l)}</span>${it.sub ? '<small>›</small>' : it.h ? `<small>${esc(it.h)}</small>` : ''}`;
      if (it.dis) { b.disabled = true; b.style.opacity = 0.45; }
      b.onmouseenter = () => { if (it.sub) { const r = b.getBoundingClientRect(); b.classList.add('hl'); A.popMenu(typeof it.sub === 'function' ? it.sub() : it.sub, r.right - 4, r.top - 5, level + 1); } else { while (menuStack.length > level + 1) menuStack.pop().remove(); } };
      b.onmouseleave = () => b.classList.remove('hl');
      b.onclick = () => { if (it.sub) return; A.closeMenus(); if (it.f) it.f(); };
      el.appendChild(b);
    });
    document.body.appendChild(el); const w = el.offsetWidth, h = el.offsetHeight;
    el.style.left = Math.max(6, Math.min(x, innerWidth - w - 8)) + 'px'; el.style.top = Math.max(6, Math.min(y, innerHeight - h - 8)) + 'px';
    menuStack.push(el); return el;
  };
  document.addEventListener('pointerdown', (e) => { if (menuStack.length && !e.target.closest('.menu') && !e.target.closest('.menubar')) A.closeMenus(); }, true);

  /* ------------------------------------------------------------ files */
  A.download = (name, data, type) => { const b = data instanceof Blob ? data : new Blob([data], { type: type || 'text/plain' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); };
  A.baseName = () => (S.mol.title || 'molecule').replace(/[^\w\-. ]+/g, '').trim().slice(0, 40) || 'molecule';
  A.openText = (name, text, add) => {
    try {
      const r = MS.io.read(name, text);
      if (r.scene) { A.loadScene(r.scene); return; }
      const m = r.mol; if (!m.atoms.length) throw new Error('No atoms found.');
      A.load(m, { add }); S.dismissEmpty = true; A.toast(`${name || 'Structure'}: ${m.atoms.length} atoms, ${m.bonds.length} bonds${m.frames.length > 1 ? ', ' + m.frames.length + ' frames' : ''}${m.meta.note ? '. ' + m.meta.note : ''}`);
    } catch (e) { A.toast(e.message || String(e), true); console.error(e); }
  };
  A.openFiles = async (files, add) => { for (const f of files) { const t = await f.text(); A.openText(f.name, t, add || (S.addMode && S.mol.atoms.length)); } };
  const fileInput = $('#fileInput'); fileInput.onchange = () => { A.openFiles([...fileInput.files]); fileInput.value = ''; };
  A.openDialog = () => fileInput.click();
  let dragDepth = 0;
  window.addEventListener('dragenter', (e) => { if ([...(e.dataTransfer.types || [])].includes('Files')) { dragDepth++; $('#dropOverlay').classList.add('on'); } });
  window.addEventListener('dragleave', () => { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) $('#dropOverlay').classList.remove('on'); });
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => { e.preventDefault(); dragDepth = 0; $('#dropOverlay').classList.remove('on'); if (e.dataTransfer.files.length) A.openFiles([...e.dataTransfer.files], e.shiftKey); });
  window.addEventListener('paste', (e) => {
    if (/INPUT|TEXTAREA/.test(document.activeElement.tagName)) return; const t = e.clipboardData && e.clipboardData.getData('text'); if (!t || !t.trim()) return;
    if (MS.io.detect('', t)) { e.preventDefault(); A.openText('pasted', t); }
  });
  A.exportAs = (fmt) => {
    const m = S.mol; if (!m.atoms.length) return A.toast('Nothing to export.', true);
    try { const ext = { xyz: 'xyz', mol: 'mol', sdf: 'sdf', pdb: 'pdb', cml: 'cml', cif: 'cif', smiles: 'smi' }[fmt]; A.download(A.baseName() + '.' + ext, MS.io.write(m, fmt)); } catch (e) { A.toast(e.message, true); }
  };
  A.copyText = async (t, what) => { try { await navigator.clipboard.writeText(t); A.toast((what || 'Text') + ' copied.'); } catch (e) { A.toast('Clipboard unavailable.', true); } };
  A.sceneObj = () => {
    const m = S.mol, cam = R.cam;
    return { v: 1, app: 'MoleculeScale', mol: { atoms: m.atoms, bonds: m.bonds, res: m.res, cell: m.cell, title: m.title, meta: Object.assign({}, m.meta, { chiral: undefined }), sel: [...m.sel] }, layers: S.layers.map((l) => ({ ...l, _mesh: undefined, _key: undefined, idx: l.idx ? [...l.idx] : undefined })), cam: { q: cam.q, target: cam.target, dist: cam.dist, ortho: cam.ortho, radius: cam.radius }, opts: { bg: R.opts.bg, bgHex: R.opts.bgHex, ao: R.opts.ao, outline: R.opts.outline, fog: R.opts.fog, classic: R.opts.classic, axes: R.opts.axes, cell: R.opts.cell } };
  };
  A.loadScene = (sc) => {
    if (!sc || !sc.mol) throw new Error('Not a MoleculeScale scene.');
    const m = new MS.Mol(); Object.assign(m, { atoms: sc.mol.atoms, bonds: sc.mol.bonds, res: sc.mol.res || [], cell: sc.mol.cell || null, title: sc.mol.title || '', meta: sc.mol.meta || {} }); m.sel = new Set(sc.mol.sel || []); m.touch();
    const layers = (sc.layers || []).map((l) => A.mkLayer(l.style, { ...l, idx: l.idx ? new Set(l.idx) : undefined }));
    A.setMol(m, { layers: layers.length ? layers : null, keepView: true });
    if (sc.opts) Object.assign(R.opts, sc.opts); if (sc.cam) Object.assign(R.cam, sc.cam);
    S.dismissEmpty = true; R.invalidate(true); A.refresh();
  };
  A.saveScene = () => A.download(A.baseName() + '.moleculescale', JSON.stringify(A.sceneObj()), 'application/json');
  let persistT = 0;
  A.persistSoon = () => { clearTimeout(persistT); persistT = setTimeout(() => { try { if (!S.mol.atoms.length || S.mol.atoms.length > 15000) { localStorage.removeItem('ms-last'); return; } const j = JSON.stringify(A.sceneObj()); if (j.length < 3.5e6) localStorage.setItem('ms-last', j); } catch (e) { } }, 900); };
  A.screenshotDialog = () => {
    A.dlg({
      title: 'Save image', width: 420, body: `<div class="field-row"><label>Resolution</label><select class="sel" id="ssScale"><option value="1">1× (screen)</option><option value="2" selected>2×</option><option value="3">3×</option><option value="4">4× (print)</option></select></div>
      <div class="field-row"><label>Background</label><label class="chk"><input type="checkbox" id="ssTrans"> Transparent</label></div><p class="muted" style="margin:6px 0 0">Ambient occlusion, outlines and labels are included.</p>`,
      buttons: [{ label: 'Copy to clipboard', fn: async () => { const b = await R.snapshot(+$('#ssScale').value, $('#ssTrans').checked); try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]); A.toast('Image copied.'); } catch (e) { A.toast('Clipboard unavailable — use Save PNG.', true); } } }, { label: 'Save PNG', primary: true, fn: async () => { const b = await R.snapshot(+$('#ssScale').value, $('#ssTrans').checked); A.download(A.baseName() + '.png', b); } }],
    });
  };

  /* ------------------------------------------------------------ builders */
  A.insertSmiles = (smi, name, opts) => {
    try { const m = MS.smiles.fromSmiles(smi); if (name) m.title = name; A.load(m, opts); S.dismissEmpty = true; return true; } catch (e) { A.toast('SMILES error: ' + e.message, true); return false; }
  };
  A.smilesDialog = () => A.dlg({
    title: 'Insert from SMILES', width: 520,
    body: `<p class="muted" style="margin-top:0">Type or paste a SMILES string. A 3D structure is generated by distance geometry and cleaned up with the force field. Stereo centres (@, @@) are respected.</p>
      <input class="field mono" id="smiIn" placeholder="e.g. CC(=O)Oc1ccccc1C(=O)O" spellcheck="false" autocomplete="off"><div id="smiErr" class="err" style="color:var(--bad);margin-top:6px;min-height:18px"></div>
      <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">${['CCO', 'c1ccccc1', 'CN1CCC[C@H]1c1cccnc1', 'C[C@H](N)C(=O)O', 'C1CCC2CCCCC2C1'].map((s) => `<button class="btn sm" data-s="${s}">${esc(s)}</button>`).join('')}</div>`,
    buttons: [{ label: 'Cancel' }, { label: 'Insert', primary: true, fn: () => { const v = $('#smiIn').value.trim(); if (!v) return false; if (!A.insertSmiles(v, null)) return false; } }],
    onOpen: (d) => { const i = $('#smiIn', d); i.focus(); $$('[data-s]', d).forEach((b) => (b.onclick = () => { i.value = b.dataset.s; i.focus(); })); i.onkeydown = (e) => { if (e.key === 'Enter') $$('.df .btn', d)[1].click(); }; },
  });
  A.peptideDialog = () => A.dlg({
    title: 'Build peptide', width: 520,
    body: `<p class="muted" style="margin-top:0">One-letter amino-acid codes (up to 40 residues, L-amino acids, neutral termini). Backbone torsions are set for the chosen secondary structure and the geometry is relaxed.</p>
      <input class="field mono" id="pepSeq" value="AEAAAKEAAAKA" spellcheck="false"><div class="field-row" style="margin-top:10px"><label>Structure</label><select class="sel" id="pepSS"><option value="helix">α-helix (−57°, −47°)</option><option value="sheet">β-strand (−120°, +130°)</option><option value="ppii">Polyproline II</option><option value="extended">Extended</option><option value="coil">Relaxed coil (no restraint)</option></select></div>`,
    buttons: [{ label: 'Cancel' }, { label: 'Build', primary: true, fn: async () => { const b = $('#dlg .df .primary'); b.textContent = 'Building…'; await new Promise((r) => setTimeout(r, 30)); try { const m = MS.build.peptide($('#pepSeq').value, $('#pepSS').value); A.load(m); S.dismissEmpty = true; } catch (e) { b.textContent = 'Build'; A.toast(e.message, true); return false; } } }],
  });
  A.nanotubeDialog = () => A.dlg({
    title: 'Carbon nanotube', width: 420,
    body: `<div class="field-row"><label>Chirality (n, m)</label><div style="display:flex;gap:6px"><input class="field" id="ntN" type="number" value="6" min="1" max="20"><input class="field" id="ntM" type="number" value="6" min="0" max="20"></div></div><div class="field-row"><label>Length (cells)</label><input class="field" id="ntL" type="number" value="4" min="1" max="30"></div><label class="chk"><input type="checkbox" id="ntH"> Cap open ends with hydrogen</label>`,
    buttons: [{ label: 'Cancel' }, { label: 'Build', primary: true, fn: () => { const n = +$('#ntN').value, mm = +$('#ntM').value; if (n < mm) { A.toast('Use n ≥ m.', true); return false; } const m = MS.build.nanotube(n, mm, +$('#ntL').value); if (m.atoms.length > 4000) { A.toast('That is too large (' + m.atoms.length + ' atoms).', true); return false; } if ($('#ntH').checked) C.addHydrogens(m); A.load(m); S.dismissEmpty = true; } }],
  });
  A.grapheneDialog = () => A.dlg({
    title: 'Graphene sheet', width: 380, body: `<div class="field-row"><label>Cells (x, y)</label><div style="display:flex;gap:6px"><input class="field" id="grX" type="number" value="6" min="1" max="30"><input class="field" id="grY" type="number" value="6" min="1" max="30"></div></div>`,
    buttons: [{ label: 'Cancel' }, { label: 'Build', primary: true, fn: () => { A.load(MS.build.graphene(+$('#grX').value, +$('#grY').value)); S.dismissEmpty = true; } }],
  });
  A.supercell = (n) => {
    const m = S.mol; if (!m.cell) return A.toast('This structure has no unit cell.', true);
    const M = MS.cellMatrix(m.cell), out = new MS.Mol(); out.title = m.title + ' ' + n.join('×'); out.meta = Object.assign({}, m.meta);
    for (let i = 0; i < n[0]; i++) for (let j = 0; j < n[1]; j++) for (let k = 0; k < n[2]; k++) {
      const t = [0, 1, 2].map((c) => i * M[0][c] + j * M[1][c] + k * M[2][c]); const off = out.atoms.length;
      m.atoms.forEach((a) => out.atoms.push({ ...a, x: a.x + t[0], y: a.y + t[1], z: a.z + t[2] })); m.bonds.forEach((b) => out.bonds.push({ a: b.a + off, b: b.b + off, o: b.o }));
    }
    out.cell = { ...m.cell, a: m.cell.a * n[0], b: m.cell.b * n[1], c: m.cell.c * n[2] }; out.touch();
    if (out.atoms.length > 20000) return A.toast('Supercell would have too many atoms.', true);
    A.snap('Supercell'); S.mol.atoms = out.atoms; S.mol.bonds = out.bonds; S.mol.cell = out.cell; S.mol.title = out.title; S.mol.sel = new Set(); S.mol.res = []; A.changed(); A.fit();
  };
  A.supercellDialog = () => A.dlg({ title: 'Supercell', width: 380, body: `<div class="field-row"><label>Repeat (a, b, c)</label><div style="display:flex;gap:6px"><input class="field" id="scA" type="number" value="2" min="1" max="8"><input class="field" id="scB" type="number" value="2" min="1" max="8"><input class="field" id="scC" type="number" value="2" min="1" max="8"></div></div>`, buttons: [{ label: 'Cancel' }, { label: 'Create', primary: true, fn: () => A.supercell([+$('#scA').value, +$('#scB').value, +$('#scC').value]) }] });
  A.pickElement = (cb) => {
    const cells = []; for (let z = 1; z <= 118; z++) { const p = MS.PT_POS[z]; if (!p) continue; cells.push(`<button data-z="${z}" class="${z === S.el ? 'on' : ''}" style="grid-row:${p[0]};grid-column:${p[1]};background:${'#' + ((1 << 24) + (Math.round(EL[z].col[0] * 255) << 16) + (Math.round(EL[z].col[1] * 255) << 8) + Math.round(EL[z].col[2] * 255)).toString(16).slice(1)}33" title="${EL[z].name}"><small>${z}</small>${EL[z].sym}</button>`); }
    A.dlg({ title: 'Choose an element', width: 720, body: `<div id="ptable" style="grid-template-rows:repeat(10,auto)">${cells.join('')}</div>`, onOpen: (d) => $$('#ptable button', d).forEach((b) => (b.onclick = () => { d.close(); cb(+b.dataset.z); })) });
  };
  A.elementDialogForSelection = () => { if (!S.mol.sel.size) return A.toast('Select atoms first.', true); A.pickElement((z) => { A.snap('Change element'); const keep = [...S.mol.sel]; keep.forEach((i) => A.setElement(i, z)); if (S.autoH) { A.adjustH(keep.flatMap((i) => [i, ...S.mol.nb()[i].map((x) => x.j)])); } A.changed(); }); };
  A.chargeDialog = () => { if (S.mol.sel.size !== 1) return A.toast('Select one atom to set its formal charge.', true); const i = [...S.mol.sel][0]; A.dlg({ title: 'Formal charge', width: 340, body: `<div class="field-row"><label>Charge of ${EL[S.mol.atoms[i].e].sym}${i + 1}</label><input class="field" id="fqIn" type="number" value="${S.mol.atoms[i].q || 0}" min="-4" max="4"></div>`, buttons: [{ label: 'Cancel' }, { label: 'Apply', primary: true, fn: () => { A.snap('Charge'); S.mol.atoms[i].q = +$('#fqIn').value; if (S.autoH) A.adjustH([i]); A.changed(); } }] }); };

  /* ------------------------------------------------------------ calculations */
  A.tick = () => new Promise((r) => { const t = setTimeout(r, 40); requestAnimationFrame(() => { clearTimeout(t); r(); }); });
  A.optimize = async (maxSteps) => {
    const m = S.mol; if (!m.atoms.length || S.busy) return; S.busy = true; A.snap('Optimise');
    try {
      const e0 = MS.ff.energy(m); const mz = new MS.ff.Minimizer(m, { tol: 0.04, dt: 0.02 }); const per = m.atoms.length > 1500 ? 10 : 30; const limit = maxSteps || (m.atoms.length > 1500 ? 400 : 2500);
      while (!mz.done && mz.iter < limit) { mz.step(per); m.setCoords(mz.x); A.changed(true); S.energy = mz.E; await A.tick(); }
      A.changed(true); S.energy = mz.E; A.refresh();
      A.toast(`Optimised · ${fmt(e0, 1)} → ${fmt(mz.E, 1)} kcal/mol · ${mz.iter} steps${mz.done ? '' : ' (not converged)'}`);
    } catch (e) { console.error(e); A.toast('Optimisation failed: ' + e.message, true); } finally { S.busy = false; }
  };
  A.conformers = async (count) => {
    const m = S.mol; if (!m.atoms.length || S.busy) return; S.busy = true;
    try {
      const rb = []; const ring = new Set(); C.rings(m).forEach((r) => r.forEach((a, i) => { const b = r[(i + 1) % r.length]; ring.add(Math.min(a, b) + '_' + Math.max(a, b)); }));
      m.bonds.forEach((b) => { if (b.o !== 1 || ring.has(Math.min(b.a, b.b) + '_' + Math.max(b.a, b.b))) return; const s = C.sideOf(m, b.a, b.b); if (s && s.size > 1 && m.nb()[b.a].length > 1 && m.nb()[b.b].length > 1 && !(s.size === 3 && [...s].every((i) => m.atoms[i].e === 1 || i === b.b))) rb.push([b.a, b.b, s]); });
      if (!rb.length) { S.busy = false; return A.toast('No rotatable bonds — nothing to search.'); }
      A.snap('Conformer search'); const start = m.coords(); const found = []; const prog = A.progress('Conformer search');
      for (let t = 0; t < count; t++) {
        m.setCoords(start); if (t > 0) rb.forEach(([a, b, s]) => C.rotateAbout(m, s, m.pos(b), V.sub(m.pos(b), m.pos(a)), Math.random() * Math.PI * 2));
        const mz = new MS.ff.Minimizer(m, { tol: 0.1, dt: 0.02 }); mz.step(m.atoms.length > 100 ? 250 : 400);
        if (!found.some((f) => Math.abs(f.E - mz.E) < 0.02)) found.push({ E: mz.E, x: Float32Array.from(mz.x) });
        prog(t / count); await new Promise((r) => setTimeout(r, 0));
      }
      prog(1); found.sort((a, b) => a.E - b.E); m.frames = found.map((f) => f.x); m.meta.frameE = found.map((f) => f.E); A.setFrame(0); A.changed(true); S.energy = found[0].E; A.refresh();
      A.toast(`${found.length} distinct conformers · lowest ${fmt(found[0].E, 1)} kcal/mol, highest +${fmt(found[found.length - 1].E - found[0].E, 1)}. Use the frame slider to browse.`);
    } catch (e) { console.error(e); A.toast('Search failed: ' + e.message, true); } finally { S.busy = false; }
  };
  A.progress = (label) => { const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = `${esc(label)}<div class="progress"><i></i></div>`; $('#toasts').appendChild(t); return (f) => { $('i', t).style.width = Math.round(f * 100) + '%'; if (f >= 1) setTimeout(() => t.remove(), 400); }; };
  A.conformerDialog = () => A.dlg({ title: 'Conformer search', width: 420, body: `<p class="muted" style="margin-top:0">Randomises all rotatable single bonds, relaxes each trial with the force field and keeps the distinct results as frames, sorted by energy.</p><div class="field-row"><label>Trials</label><input class="field" id="cfN" type="number" value="40" min="5" max="500"></div>`, buttons: [{ label: 'Cancel' }, { label: 'Search', primary: true, fn: () => { setTimeout(() => A.conformers(+$('#cfN').value), 50); } }] });
  A.addH = () => { A.snap('Add hydrogens'); const n = C.addHydrogens(S.mol); A.changed(); A.toast(n ? `Added ${n} hydrogens.` : 'Nothing to add.'); };
  A.removeH = () => { A.snap('Remove hydrogens'); const m = S.mol; const rm = []; m.atoms.forEach((a, i) => { if (a.e === 1 && m.nb()[i].length <= 1) rm.push(i); }); A.removeAtoms(rm); A.changed(); A.toast(`Removed ${rm.length} hydrogens.`); };
  A.showCharges = () => { C.gasteiger(S.mol); let l = S.layers.find((x) => x.style === 'labels' && x.label === 'charge'); if (!l) { S.layers.push(A.mkLayer('labels', { label: 'charge', name: 'Partial charges', noH: false })); } S.layers.filter((x) => ['bs', 'stick', 'vdw', 'wire'].includes(x.style)).forEach((x) => { x.color = 'charge'; }); R.invalidate(true); A.refresh(); A.toast('Gasteiger partial charges computed (red = negative, blue = positive).'); };
  A.principalAxes = () => {
    const m = S.mol; if (m.atoms.length < 2) return; const c = m.centroid(); const cov = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    m.atoms.forEach((a) => { const d = [a.x - c[0], a.y - c[1], a.z - c[2]]; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) cov[i][j] += d[i] * d[j]; });
    // Jacobi eigen decomposition
    let Vm = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]; const Mx = cov.map((r) => r.slice());
    for (let sweep = 0; sweep < 30; sweep++) for (let p = 0; p < 2; p++) for (let q = p + 1; q < 3; q++) {
      if (Math.abs(Mx[p][q]) < 1e-12) continue; const th = (Mx[q][q] - Mx[p][p]) / (2 * Mx[p][q]); const t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1)); const cs = 1 / Math.sqrt(t * t + 1), sn = t * cs;
      for (let k = 0; k < 3; k++) { const a = Mx[k][p], b = Mx[k][q]; Mx[k][p] = cs * a - sn * b; Mx[k][q] = sn * a + cs * b; }
      for (let k = 0; k < 3; k++) { const a = Mx[p][k], b = Mx[q][k]; Mx[p][k] = cs * a - sn * b; Mx[q][k] = sn * a + cs * b; }
      for (let k = 0; k < 3; k++) { const a = Vm[k][p], b = Vm[k][q]; Vm[k][p] = cs * a - sn * b; Vm[k][q] = sn * a + cs * b; }
    }
    const ev = [0, 1, 2].map((i) => ({ l: Mx[i][i], v: [Vm[0][i], Vm[1][i], Vm[2][i]] })).sort((a, b) => b.l - a.l);
    const x = ev[0].v, y = ev[1].v, z = V.cross(x, y); // rows of rotation world->view: largest variance along screen x
    const Rm = [x, y, z]; const tr = Rm[0][0] + Rm[1][1] + Rm[2][2]; let q;
    if (tr > 0) { const s = Math.sqrt(tr + 1) * 2; q = [(Rm[2][1] - Rm[1][2]) / s, (Rm[0][2] - Rm[2][0]) / s, (Rm[1][0] - Rm[0][1]) / s, s / 4]; }
    else if (Rm[0][0] > Rm[1][1] && Rm[0][0] > Rm[2][2]) { const s = Math.sqrt(1 + Rm[0][0] - Rm[1][1] - Rm[2][2]) * 2; q = [s / 4, (Rm[0][1] + Rm[1][0]) / s, (Rm[0][2] + Rm[2][0]) / s, (Rm[2][1] - Rm[1][2]) / s]; }
    else if (Rm[1][1] > Rm[2][2]) { const s = Math.sqrt(1 + Rm[1][1] - Rm[0][0] - Rm[2][2]) * 2; q = [(Rm[0][1] + Rm[1][0]) / s, s / 4, (Rm[1][2] + Rm[2][1]) / s, (Rm[0][2] - Rm[2][0]) / s]; }
    else { const s = Math.sqrt(1 + Rm[2][2] - Rm[0][0] - Rm[1][1]) * 2; q = [(Rm[0][2] + Rm[2][0]) / s, (Rm[1][2] + Rm[2][1]) / s, s / 4, (Rm[1][0] - Rm[0][1]) / s]; }
    const l = Math.hypot(...q); R.cam.q = q.map((v) => v / l); R.invalidate(false);
  };
  A.viewAlong = (axis) => { const q = { x: [0, Math.SQRT1_2, 0, Math.SQRT1_2], y: [-Math.SQRT1_2, 0, 0, Math.SQRT1_2], z: [0, 0, 0, 1] }[axis]; R.cam.q = q; R.invalidate(false); };
  A.freeze = (on) => { const m = S.mol; if (!m.sel.size) return A.toast('Select atoms first.', true); m.sel.forEach((i) => { m.atoms[i].fx = on ? 1 : 0; }); A.mz = null; A.toast(on ? `${m.sel.size} atoms frozen for optimisation.` : 'Atoms released.'); A.changed(true); };

  /* ------------------------------------------------------------ view / layer commands */
  A.setBaseStyle = (style) => {
    const m = S.mol;
    if (style === 'cartoon') {
      if (!m.meta.protein) return A.toast('Cartoon needs a protein structure with residue information.', true);
      S.layers = S.layers.filter((l) => ['surface', 'labels', 'iso'].includes(l.style)); S.layers.unshift(A.mkLayer('cartoon', { scope: 'protein', color: 'ss' }), A.mkLayer('bs', { scope: 'ligand', name: 'Ligands' }));
    } else {
      const keep = S.layers.filter((l) => ['surface', 'labels', 'iso'].includes(l.style)); S.layers = [A.mkLayer(style, { scope: m.meta.protein ? 'nowater' : 'all', size: m.meta.crystal && style === 'bs' ? 1.25 : 1, scale: 1 })].concat(keep);
    }
    S.layerSel = 0; R.invalidate(true); A.refresh();
  };
  A.baseStyle = () => { const l = S.layers.find((x) => ['bs', 'stick', 'wire', 'vdw', 'cartoon'].includes(x.style)); return l ? l.style : null; };
  A.toggleLayerStyle = (style, props) => { const i = S.layers.findIndex((l) => l.style === style); if (i >= 0) S.layers.splice(i, 1); else { S.layers.push(A.mkLayer(style, props)); S.layerSel = S.layers.length - 1; } R.invalidate(true); A.refresh(); };
  A.addLayerMenu = (x, y) => A.popMenu(['bs', 'stick', 'wire', 'vdw', 'cartoon', 'surface', 'labels'].concat(S.mol.vol ? ['iso'] : []).map((s) => ({ l: A.STYLE_NAMES[s], f: () => { S.layers.push(A.mkLayer(s, s === 'cartoon' ? { scope: 'protein', color: 'ss' } : s === 'labels' ? { color: 'element', noH: true } : {})); S.layerSel = S.layers.length - 1; R.invalidate(true); A.refresh(); } })), x, y);
  A.selectBy = (fn) => { const m = S.mol; A.setSel(m.atoms.map((a, i) => (fn(a, i) ? i : -1)).filter((i) => i >= 0), []); };
  A.grow = (shrink) => { const m = S.mol, ns = new Set(m.sel); if (shrink) { m.sel.forEach((i) => { if (m.nb()[i].some((x) => !m.sel.has(x.j))) ns.delete(i); }); } else m.sel.forEach((i) => m.nb()[i].forEach((x) => ns.add(x.j))); A.setSel(ns, []); };

  /* ------------------------------------------------------------ menus */
  const mod = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl+';
  const exportMenu = () => [{ l: 'XYZ (.xyz)', f: () => A.exportAs('xyz') }, { l: 'MDL Molfile (.mol)', f: () => A.exportAs('mol') }, { l: 'SDF (.sdf)', f: () => A.exportAs('sdf') }, { l: 'PDB (.pdb)', f: () => A.exportAs('pdb') }, { l: 'CML (.cml)', f: () => A.exportAs('cml') }, { l: 'CIF (.cif)', f: () => A.exportAs('cif') }, { l: 'SMILES (.smi)', f: () => A.exportAs('smiles') }, '-', { l: '3D model (.obj)', f: () => A.download(A.baseName() + '.obj', R.toOBJ()) }];
  const insertMenu = () => [
    { l: 'From SMILES…', icon: 'paste', f: A.smilesDialog }, { l: 'Molecule library', icon: 'flask', f: () => A.showSide('library') },
    { l: 'Peptide…', f: A.peptideDialog }, '-',
    { l: 'Nanostructures', sub: () => [{ l: 'Fullerene C60', f: () => { A.load(MS.build.fullerene()); S.dismissEmpty = true; } }, { l: 'Carbon nanotube…', f: A.nanotubeDialog }, { l: 'Graphene sheet…', f: A.grapheneDialog }] },
    { l: 'Crystals', sub: () => MS.LIB.crystals.map((c) => ({ l: c.name, h: c.note, f: () => { A.load(MS.LIB.buildCrystal(c)); S.dismissEmpty = true; } })) },
    { l: 'Atomic orbitals', sub: () => MS.LIB.orbitals.map((o) => ({ l: o.name, f: () => { A.load(MS.LIB.buildOrbital(o)); S.dismissEmpty = true; } })) },
    '-', { l: 'Demo protein (crambin, 1CRN)', f: A.loadDemo },
  ];
  const MENUS = {
    File: () => [
      { l: 'New scene', h: mod + 'N', f: A.newScene }, { l: 'Open…', icon: 'open', h: mod + 'O', f: A.openDialog }, { l: 'Add file to scene…', f: () => { S.addOnce = true; fileInput.onchange = () => { A.openFiles([...fileInput.files], true); fileInput.value = ''; fileInput.onchange = () => { A.openFiles([...fileInput.files]); fileInput.value = ''; }; }; A.openDialog(); } }, { l: 'Paste structure or SMILES…', icon: 'paste', f: A.pasteDialog }, '-',
      { l: 'Save scene (.moleculescale)', icon: 'save', h: mod + 'S', f: A.saveScene }, { l: 'Export molecule', sub: exportMenu }, '-',
      { l: 'Save image…', icon: 'camera', h: mod + 'P', f: A.screenshotDialog }, { l: 'Copy SMILES', f: () => A.copyText(MS.smiles.toSmiles(S.mol), 'SMILES') }, { l: 'Copy as XYZ', f: () => A.copyText(MS.io.write(S.mol, 'xyz'), 'XYZ') }, '-',
      { l: 'Imprint', f: () => A.legal('imprint') }, { l: 'Privacy', f: () => A.legal('privacy') },
    ],
    Edit: () => [
      { l: 'Undo', icon: 'undo', h: mod + 'Z', f: A.undo, dis: !S.undo.length }, { l: 'Redo', icon: 'redo', h: '⇧' + mod + 'Z', f: A.redo, dis: !S.redo.length }, '-',
      { l: 'Delete selection', icon: 'trash', h: '⌫', f: A.deleteSelection }, { l: 'Hide selected atoms', f: () => { S.mol.sel.forEach((i) => { S.mol.atoms[i].hid = 1; }); A.setSel([]); } }, { l: 'Show all atoms', f: () => { S.mol.atoms.forEach((a) => { a.hid = 0; }); R.invalidate(true); } }, '-',
      { l: 'Freeze selected atoms', f: () => A.freeze(true) }, { l: 'Release all frozen atoms', f: () => { S.mol.atoms.forEach((a) => { a.fx = 0; }); A.mz = null; R.invalidate(true); } }, '-',
      { l: 'Centre molecule at origin', f: () => { A.snap('Centre'); const c = S.mol.centroid(); S.mol.translate(null, [-c[0], -c[1], -c[2]]); A.changed(true); A.fit(); } }, { l: 'Clear scene', f: () => { A.snap('Clear'); A.newScene(true); } },
    ],
    Build: () => [
      { l: 'Draw tool', icon: 'pencil', h: '3', f: () => A.setTool('draw') }, { l: 'Insert', sub: insertMenu }, '-',
      { l: 'Add hydrogens', h: '⇧H', f: A.addH }, { l: 'Remove hydrogens', f: A.removeH }, { l: 'Auto-adjust hydrogens while drawing', chk: S.autoH, f: () => { S.autoH = !S.autoH; A.refresh(); } }, '-',
      { l: 'Perceive bonds from geometry', f: () => { A.snap('Bonds'); C.perceiveBonds(S.mol, { clear: true }); C.perceiveOrders(S.mol); A.changed(); } }, { l: 'Perceive bond orders', f: () => { A.snap('Bond orders'); C.perceiveOrders(S.mol); A.changed(); } }, { l: 'Remove all bonds', f: () => { A.snap('Clear bonds'); S.mol.bonds = []; A.changed(); } }, '-',
      { l: 'Change element of selection…', f: A.elementDialogForSelection }, { l: 'Set formal charge…', f: A.chargeDialog }, { l: 'Supercell…', f: A.supercellDialog, dis: !S.mol.cell },
    ],
    Select: () => [
      { l: 'Select all', h: mod + 'A', f: () => A.selectBy(() => true) }, { l: 'Select none', h: 'Esc', f: () => A.setSel([]) }, { l: 'Invert selection', f: () => A.selectBy((a, i) => !S.mol.sel.has(i)) }, '-',
      { l: 'By element…', f: () => A.pickElement((z) => A.selectBy((a) => a.e === z)) }, { l: 'Hydrogens', f: () => A.selectBy((a) => a.e === 1) }, { l: 'Heavy atoms', f: () => A.selectBy((a) => a.e > 1) },
      { l: 'Protein', f: () => A.selectBy((a) => a.r >= 0 && S.mol.res[a.r].aa), dis: !S.mol.meta.protein }, { l: 'Water', f: () => A.selectBy((a) => a.r >= 0 && S.mol.res[a.r].water), dis: !S.mol.res.some((r) => r.water) }, { l: 'Ligands & ions', f: () => A.selectBy((a) => a.r >= 0 && !S.mol.res[a.r].aa && !S.mol.res[a.r].water), dis: !S.mol.res.length }, '-',
      { l: 'Grow selection', f: () => A.grow(false) }, { l: 'Shrink selection', f: () => A.grow(true) }, { l: 'Select whole fragment(s)', f: () => { const m = S.mol, { comp } = m.components(); const cs = new Set([...m.sel].map((i) => comp[i])); A.selectBy((a, i) => cs.has(comp[i])); } },
      { l: 'Selection mode', sub: () => ['atom', 'residue', 'chain', 'fragment'].map((k) => ({ l: k[0].toUpperCase() + k.slice(1), chk: S.selMode === k, f: () => { S.selMode = k; A.refresh(); } })) },
    ],
    View: () => [
      { l: 'Style', sub: () => ['bs', 'stick', 'wire', 'vdw', 'cartoon'].map((s) => ({ l: A.STYLE_NAMES[s], chk: A.baseStyle() === s, f: () => A.setBaseStyle(s) })) },
      { l: 'Add layer', sub: () => ['bs', 'stick', 'wire', 'vdw', 'cartoon', 'surface', 'labels'].map((s) => ({ l: A.STYLE_NAMES[s], f: () => { S.layers.push(A.mkLayer(s, s === 'cartoon' ? { scope: 'protein', color: 'ss' } : {})); S.layerSel = S.layers.length - 1; R.invalidate(true); A.refresh(); } })) }, '-',
      { l: 'Background', sub: () => [['auto', 'Automatic'], ['white', 'White'], ['black', 'Black']].map(([k, n]) => ({ l: n, chk: R.opts.bg === k, f: () => { R.opts.bg = k; R.invalidate(false); A.refresh(); } })) },
      { l: 'Orthographic projection', chk: R.cam.ortho, f: () => { R.cam.ortho = !R.cam.ortho; R.invalidate(false); A.refresh(); } }, { l: 'Ambient occlusion', chk: R.opts.ao > 0, f: () => { R.opts.ao = R.opts.ao > 0 ? 0 : 0.8; R.invalidate(false); A.refresh(); } }, { l: 'Outlines', chk: R.opts.outline > 0, f: () => { R.opts.outline = R.opts.outline > 0 ? 0 : 0.6; R.invalidate(false); A.refresh(); } }, { l: 'Depth cueing (fog)', chk: R.opts.fog > 0, f: () => { R.opts.fog = R.opts.fog > 0 ? 0 : 0.8; R.invalidate(false); A.refresh(); } },
      { l: 'Classic CPK colours', chk: R.opts.classic, f: () => { R.opts.classic = !R.opts.classic; R.invalidate(true); A.refresh(); } }, { l: 'Unit cell', chk: R.opts.cell, f: () => { R.opts.cell = !R.opts.cell; R.invalidate(true); A.refresh(); }, dis: !S.mol.cell }, { l: 'Axes indicator', chk: R.opts.axes, f: () => { R.opts.axes = !R.opts.axes; R.invalidate(false); } }, '-',
      { l: 'Fit to window', h: 'F', f: () => A.fit() }, { l: 'Reset orientation', h: '0', f: A.resetView }, { l: 'View along', sub: () => [{ l: 'X axis', f: () => A.viewAlong('x') }, { l: 'Y axis', f: () => A.viewAlong('y') }, { l: 'Z axis', f: () => A.viewAlong('z') }, { l: 'Principal axes', f: A.principalAxes }] }, { l: 'Spin', chk: S.spin, f: () => { S.spin = !S.spin; R.invalidate(false); A.refresh(); } },
    ],
    Calculate: () => [
      { l: 'Optimise geometry', icon: 'bolt', h: mod + 'E', f: () => A.optimize() }, { l: 'Auto-optimise while editing', chk: S.auto, f: () => { S.auto = !S.auto; A.mz = null; R.invalidate(false); A.refresh(); } }, { l: 'Conformer search…', f: A.conformerDialog }, '-',
      { l: 'Partial charges (Gasteiger)', f: A.showCharges }, { l: 'Show dipole moment', chk: S.showDip, f: () => { S.showDip = !S.showDip; R.invalidate(false); A.refresh(); } }, { l: 'Force-field energy', f: () => { const e = MS.ff.energy(S.mol); S.energy = e; A.refresh(); A.toast('Energy: ' + fmt(e, 2) + ' kcal/mol (quick force field)'); } }, '-',
      { l: 'Measure tool', icon: 'measure', h: '5', f: () => A.setTool('measure') }, { l: 'Properties', icon: 'info', f: () => A.showInfo('props') },
    ],
    Help: () => [{ l: 'Keyboard shortcuts', h: '?', f: A.helpDialog }, { l: 'About MoleculeScale', f: A.aboutDialog }, '-', { l: 'Imprint', f: () => A.legal('imprint') }, { l: 'Privacy', f: () => A.legal('privacy') }],
  };
  A.MENUS = MENUS;
  const mb = $('#menubar');
  Object.keys(MENUS).forEach((name) => {
    const b = document.createElement('button'); b.textContent = name;
    const open = () => { const hadOpen = $('.menubar button.open'); A.closeMenus(); b.classList.add('open'); const r = b.getBoundingClientRect(); A.popMenu(MENUS[name](), r.left, r.bottom + 4); };
    b.onclick = () => { if (b.classList.contains('open')) A.closeMenus(); else open(); };
    b.onmouseenter = () => { if ($('.menubar button.open') && !b.classList.contains('open')) open(); };
    mb.appendChild(b);
  });
  A.contextMenu = (d, e) => {
    const m = S.mol, a = d.pick.atom; const items = [];
    if (a >= 0) { if (!m.sel.has(a)) A.setSel([a]); items.push({ lbl: `${EL[m.atoms[a].e].sym}${a + 1} · ${EL[m.atoms[a].e].name}` }); }
    items.push({ l: 'Select all', f: () => A.selectBy(() => true) }, { l: 'Invert selection', f: () => A.selectBy((x, i) => !m.sel.has(i)) }, '-');
    if (m.sel.size) items.push({ l: 'Delete selected', icon: 'trash', f: A.deleteSelection }, { l: 'Hide selected', f: () => { m.sel.forEach((i) => { m.atoms[i].hid = 1; }); A.setSel([]); } }, { l: 'Change element…', f: A.elementDialogForSelection }, { l: 'Freeze', f: () => A.freeze(true) }, { l: 'Centre view on selection', f: () => A.fit(m.sel) }, { l: 'Add layer from selection', f: () => { S.layers.push(A.mkLayer('bs', { scope: 'sel', idx: new Set(m.sel), name: 'Selection' })); S.layerSel = S.layers.length - 1; R.invalidate(true); A.refresh(); } }, '-');
    items.push({ l: 'Fit to window', f: () => A.fit() }, { l: 'Save image…', icon: 'camera', f: A.screenshotDialog });
    A.popMenu(items, e.clientX, e.clientY);
  };

  /* ------------------------------------------------------------ command palette */
  const pal = $('#palette'), palIn = $('#palInput'), palList = $('#palList');
  let palItems = [], palHi = 0;
  const flatten = () => { const out = []; const walk = (items, path) => items.forEach((it) => { if (!it || it === '-' || it.lbl) return; if (it.sub) walk(typeof it.sub === 'function' ? it.sub() : it.sub, path + it.l + ' › '); else if (it.f) out.push({ l: path + it.l, h: it.h, f: it.f }); }); Object.keys(MENUS).forEach((k) => walk(MENUS[k](), k + ' › ')); return out; };
  const palRender = () => { const q = palIn.value.toLowerCase().trim(); const words = q.split(/\s+/).filter(Boolean); palItems = flatten().filter((it) => words.every((w) => it.l.toLowerCase().includes(w))).slice(0, 40); palHi = 0; palList.innerHTML = palItems.map((it, i) => `<button class="${i === 0 ? 'hl' : ''}" data-i="${i}">${esc(it.l)}<small>${esc(it.h || '')}</small></button>`).join('') || '<div class="muted" style="padding:12px">No matching command</div>'; };
  A.palette = () => { palIn.value = ''; palRender(); pal.showModal(); palIn.focus(); };
  palIn.oninput = palRender;
  palIn.onkeydown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); palHi = Math.max(0, Math.min(palItems.length - 1, palHi + (e.key === 'ArrowDown' ? 1 : -1))); $$('#palList button').forEach((b, i) => b.classList.toggle('hl', i === palHi)); const h = $$('#palList button')[palHi]; if (h) h.scrollIntoView({ block: 'nearest' }); }
    else if (e.key === 'Enter') { const it = palItems[palHi]; if (it) { pal.close(); it.f(); } }
  };
  palList.onclick = (e) => { const b = e.target.closest('button'); if (b) { const it = palItems[+b.dataset.i]; pal.close(); if (it) it.f(); } };
  pal.addEventListener('click', (e) => { if (e.target === pal) pal.close(); });

  /* ------------------------------------------------------------ rail / HUD / context bar */
  const TOOLDEF = [['navigate', 'Navigate', 'navigate', '1', 'Rotate, pan and zoom the view'], ['select', 'Select', 'select-box', '2', 'Click or drag a box to select atoms'], ['draw', 'Draw', 'pencil', '3', 'Add atoms and bonds'], ['move', 'Manipulate', 'move', '4', 'Move atoms and rotate the selection'], ['measure', 'Measure', 'measure', '5', 'Click atoms to read distances, angles, dihedrals'], ['bond', 'Rotate bond', 'bond', '6', 'Drag a bond to twist the molecule around it'], ['erase', 'Erase', 'erase', '7', 'Delete atoms and bonds']];
  const rail = $('#rail');
  rail.innerHTML = TOOLDEF.map(([id, n, ic, k, tip]) => `<button class="tool" data-tool="${id}" title="${n} — ${tip} (${k})">${A.icon(ic)}<kbd>${k}</kbd></button>`).join('');
  rail.onclick = (e) => { const b = e.target.closest('[data-tool]'); if (b) A.setTool(b.dataset.tool); };
  const hudTop = $('#hudTop'), hudRight = $('#hudRight');
  hudTop.innerHTML = `<div class="seg" id="styleSeg">${['bs', 'stick', 'wire', 'vdw', 'cartoon'].map((s) => `<button data-s="${s}">${A.STYLE_NAMES[s]}</button>`).join('')}</div><span class="sepv"></span><button class="btn sm ghost" id="hSurf">${A.icon('surface')}Surface</button><button class="btn sm ghost" id="hLab">${A.icon('tag')}Labels</button>`;
  hudTop.onclick = (e) => { const s = e.target.closest('[data-s]'); if (s) A.setBaseStyle(s.dataset.s); if (e.target.closest('#hSurf')) A.toggleLayerStyle('surface', {}); if (e.target.closest('#hLab')) A.toggleLayerStyle('labels', { noH: true, name: 'Labels' }); };
  hudRight.innerHTML = [['fit', 'fit', 'Fit to window (F)'], ['ortho', 'ortho', 'Perspective / orthographic'], ['spin', 'spin', 'Spin'], ['cell', 'cell', 'Unit cell'], ['dipole', 'dipole', 'Dipole moment'], ['cam', 'camera', 'Save image']].map(([id, ic, t]) => `<button class="hbtn" data-h="${id}" title="${t}">${A.icon(ic)}</button>`).join('');
  hudRight.onclick = (e) => {
    const b = e.target.closest('[data-h]'); if (!b) return; const k = b.dataset.h;
    if (k === 'fit') A.fit(); else if (k === 'ortho') { R.cam.ortho = !R.cam.ortho; R.invalidate(false); } else if (k === 'spin') { S.spin = !S.spin; R.invalidate(false); } else if (k === 'cell') { R.opts.cell = !R.opts.cell; R.invalidate(true); } else if (k === 'dipole') { S.showDip = !S.showDip; R.invalidate(false); } else if (k === 'cam') A.screenshotDialog();
    A.refresh();
  };
  const COMMON_EL = [1, 6, 7, 8, 9, 15, 16, 17, 35, 53];
  const hexOf = (c) => '#' + ((1 << 24) + (Math.round(c[0] * 255) << 16) + (Math.round(c[1] * 255) << 8) + Math.round(c[2] * 255)).toString(16).slice(1);
  const renderCbar = () => {
    const cb = $('#cbar'), t = S.tool, m = S.mol; let h = '';
    if (t === 'navigate') h = `<span class="hint">Drag to rotate · right-drag or ⇧-drag to pan · scroll to zoom · double-click an atom to centre</span>`;
    else if (t === 'select') h = `<div class="seg" id="cbMode">${['atom', 'residue', 'chain', 'fragment'].map((k) => `<button data-k="${k}" class="${S.selMode === k ? 'on' : ''}">${k[0].toUpperCase() + k.slice(1)}</button>`).join('')}</div><button class="btn sm" data-a="all">All</button><button class="btn sm" data-a="none">None</button><button class="btn sm" data-a="inv">Invert</button><span class="hint">${m.sel.size ? m.sel.size + ' selected' : 'Click or drag a box · ⇧ adds · double-click selects a fragment'}</span>`;
    else if (t === 'draw') h = COMMON_EL.map((z) => `<div class="el-chip ${S.el === z ? 'on' : ''}" data-z="${z}" title="${EL[z].name}">${EL[z].sym}<i style="background:${hexOf(EL[z].col)}"></i></div>`).join('') + (COMMON_EL.includes(S.el) ? '' : `<div class="el-chip on" data-z="${S.el}">${EL[S.el].sym}<i style="background:${hexOf(EL[S.el].col)}"></i></div>`) + `<button class="btn sm" data-a="pt">More…</button><div class="seg" id="cbBo">${[1, 2, 3].map((o) => `<button data-o="${o}" class="${S.bo === o ? 'on' : ''}">${['Single', 'Double', 'Triple'][o - 1]}</button>`).join('')}</div><label class="chk"><input type="checkbox" id="cbAutoH" ${S.autoH ? 'checked' : ''}> Auto-H</label>`;
    else if (t === 'move') h = `<label class="chk"><input type="checkbox" id="cbAuto" ${S.auto ? 'checked' : ''}> Auto-optimise</label><span class="hint">Drag atoms · drag empty space to rotate the selection · ⇧ moves in depth</span>`;
    else if (t === 'measure') { const ids = S.measure; h = ids.length > 1 ? `<span><b>${MS.geom.dist(m, ids[0], ids[1]).toFixed(3)} Å</b>${ids.length > 2 ? ` · <b>${MS.geom.angle(m, ids[0], ids[1], ids[2]).toFixed(1)}°</b>` : ''}${ids.length > 3 ? ` · φ <b>${MS.geom.dihedral(m, ids[0], ids[1], ids[2], ids[3]).toFixed(1)}°</b>` : ''}</span><button class="btn sm" data-a="clearm">Clear</button>` : `<span class="hint">Click 2 atoms for a distance, 3 for an angle, 4 for a dihedral</span>`; }
    else if (t === 'bond') h = `<span class="hint">Drag across a bond to twist the smaller side around it. Ring bonds cannot rotate.</span>`;
    else if (t === 'erase') h = `<span class="hint">Click an atom or bond to delete it${S.autoH ? ' · hydrogens are adjusted' : ''}</span>`;
    if (cb.dataset.h !== h) { cb.innerHTML = h; cb.dataset.h = h; }
  };
  $('#cbar').addEventListener('click', (e) => {
    const z = e.target.closest('[data-z]'); if (z) { S.el = +z.dataset.z; A.refresh(); return; }
    const k = e.target.closest('#cbMode [data-k]'); if (k) { S.selMode = k.dataset.k; A.refresh(); return; }
    const o = e.target.closest('[data-o]'); if (o) { S.bo = +o.dataset.o; A.refresh(); return; }
    const a = e.target.closest('[data-a]'); if (!a) return;
    ({ all: () => A.selectBy(() => true), none: () => A.setSel([]), inv: () => A.selectBy((x, i) => !S.mol.sel.has(i)), pt: () => A.pickElement((zz) => { S.el = zz; A.refresh(); }), clearm: () => { S.measure = []; A.setSel([]); } })[a.dataset.a]();
  });
  $('#cbar').addEventListener('change', (e) => { if (e.target.id === 'cbAutoH') S.autoH = e.target.checked; if (e.target.id === 'cbAuto') { S.auto = e.target.checked; A.mz = null; R.invalidate(false); } A.refresh(); });

  /* ------------------------------------------------------------ trajectory dock */
  const traj = $('#traj');
  const renderTraj = () => {
    const m = S.mol, n = m.frames.length; traj.hidden = n < 2; if (n < 2) return;
    const e = m.meta.frameE ? ` · ${fmt(m.meta.frameE[m.frame], 2)} kcal/mol` : '';
    const html = `<button class="hbtn" data-t="prev">${A.icon('step-l')}</button><button class="hbtn" data-t="play">${A.icon(S.play ? 'pause' : 'play')}</button><button class="hbtn" data-t="next">${A.icon('step-r')}</button><input type="range" min="0" max="${n - 1}" value="${m.frame}" id="trSl"><span class="num" style="min-width:150px;text-align:right">Frame ${m.frame + 1} / ${n}${e}</span>`;
    if (traj.dataset.k !== html) { traj.dataset.k = html; traj.innerHTML = html; }
  };
  traj.addEventListener('click', (e) => { const b = e.target.closest('[data-t]'); if (!b) return; const m = S.mol; if (b.dataset.t === 'play') { S.play = !S.play; R.invalidate(false); } else A.setFrame((m.frame + (b.dataset.t === 'next' ? 1 : -1) + m.frames.length) % m.frames.length); A.refresh(); });
  traj.addEventListener('input', (e) => { if (e.target.id === 'trSl') { S.play = false; A.setFrame(+e.target.value); } });

  /* ------------------------------------------------------------ sidebar */
  const sbPane = $('#sbPane');
  A.showSide = (t) => { S.side = t; $('#app').classList.remove('no-sidebar'); A.refresh(); };
  A.showInfo = (t) => { S.info = t; $('#app').classList.remove('no-inspector'); A.refresh(); };
  const SCHEMES = [['element', 'Element'], ['carbon-chain', 'Chain (carbons)'], ['chain', 'Chain'], ['residue', 'Residue type'], ['ss', 'Secondary structure'], ['rainbow', 'Rainbow (N→C)'], ['bfactor', 'B-factor'], ['charge', 'Partial charge'], ['uniform', 'Uniform colour']];
  const SCOPES = [['all', 'All atoms'], ['nowater', 'Without water'], ['heavy', 'Heavy atoms'], ['protein', 'Protein'], ['nonprotein', 'Non-protein'], ['ligand', 'Ligands & ions'], ['water', 'Water'], ['backbone', 'Backbone'], ['sidechain', 'Side chains'], ['selnow', 'Current selection (live)'], ['sel', 'Captured selection']];
  const opt = (list, cur) => list.map(([v, n]) => `<option value="${v}" ${v === cur ? 'selected' : ''}>${n}</option>`).join('');
  const slider = (label, k, min, max, step, val, src) => `<div class="field-row"><label>${label}</label><input type="range" data-${src || 'k'}="${k}" min="${min}" max="${max}" step="${step}" value="${val}"></div>`;
  const renderDisplay = () => {
    const rows = S.layers.map((l, i) => `<div class="layer ${i === S.layerSel ? 'sel' : ''} ${l.vis ? '' : 'off'}" data-l="${i}"><button class="ico-btn" data-vis="${i}" title="Show / hide">${A.icon(l.vis ? 'eye' : 'eye-off')}</button><span class="nm">${esc(l.name)}</span><button class="ico-btn" data-del="${i}" title="Remove layer">${A.icon('x')}</button><span class="sub">${A.STYLE_NAMES[l.style]} · ${(SCOPES.find((s) => s[0] === l.scope) || ['', l.scope])[1].toLowerCase()}${['bs', 'stick', 'wire', 'vdw', 'surface', 'cartoon'].includes(l.style) ? ' · ' + (SCHEMES.concat([['esp', 'ESP']]).find((s) => s[0] === l.color) || [0, l.color])[1].toLowerCase() : ''}</span></div>`).join('');
    const l = S.layers[S.layerSel]; let set = '';
    if (l) {
      const styleOpts = Object.keys(A.STYLE_NAMES).filter((s) => s !== 'iso' || S.mol.vol).map((s) => [s, A.STYLE_NAMES[s]]);
      set += `<div class="field-row"><label>Name</label><input class="field" data-k="name" value="${esc(l.name)}"></div><div class="field-row"><label>Style</label><select class="sel" data-k="style">${opt(styleOpts, l.style)}</select></div>`;
      if (l.style !== 'iso') set += `<div class="field-row"><label>Atoms</label><select class="sel" data-k="scope">${opt(SCOPES, l.scope)}</select></div>`;
      if (['bs', 'stick', 'wire', 'vdw', 'cartoon', 'surface'].includes(l.style)) set += `<div class="field-row"><label>Colour by</label><select class="sel" data-k="color">${opt(l.style === 'surface' ? SCHEMES.concat([['esp', 'Electrostatic (approx.)']]) : SCHEMES, l.color)}</select></div>`;
      if (l.color === 'uniform') set += `<div class="field-row"><label>Colour</label><input type="color" data-k="hex" value="${l.hex}"></div>`;
      if (['bs', 'stick', 'wire'].includes(l.style)) set += slider('Thickness', 'size', 0.4, 2.5, 0.05, l.size) + (l.style === 'bs' ? slider('Atom size', 'ball', 0.5, 2, 0.05, l.ball || 1) : '');
      if (l.style === 'vdw') set += slider('Radius scale', 'scale', 0.2, 1.4, 0.02, l.scale);
      if (l.style === 'surface') set += `<div class="field-row"><label>Type</label><select class="sel" data-k="surf">${opt([['smooth', 'Smooth (Gaussian)'], ['vdw', 'van der Waals'], ['sas', 'Solvent-accessible']], l.surf)}</select></div>` + slider('Opacity', 'opacity', 0.15, 1, 0.01, l.opacity) + `<div class="field-row"><label>Quality</label><select class="sel" data-k="res">${opt([[0, 'Standard'], [0.45, 'Fast'], [0.2, 'Fine']], l.res || 0)}</select></div><label class="chk"><input type="checkbox" data-k="noH" ${l.noH ? 'checked' : ''}> Ignore hydrogens</label>`;
      if (l.style === 'labels') set += `<div class="field-row"><label>Show</label><select class="sel" data-k="label">${opt([['element', 'Element'], ['label', 'Element + number'], ['index', 'Atom number'], ['name', 'Atom name'], ['charge', 'Partial charge'], ['residue', 'Residue'], ['coords', 'Coordinates']], l.label)}</select></div>` + slider('Size', 'size', 0.6, 2, 0.05, l.size) + `<label class="chk"><input type="checkbox" data-k="noH" ${l.noH ? 'checked' : ''}> Hide hydrogens</label>`;
      if (l.style === 'iso') set += slider('Iso value', 'iso', 0.005, 0.9, 0.005, l.iso) + slider('Opacity', 'opacity', 0.15, 1, 0.01, l.opacity == null ? 0.78 : l.opacity);
      if (l.scope === 'sel' || l.scope === 'selnow') set += `<button class="btn sm" data-act="capture" style="margin-top:4px">Use current selection</button>`;
    }
    const o = R.opts;
    sbPane.innerHTML = `<div class="sec"><h4>Layers<span class="spacer"></span><button class="btn sm" id="addLayer">${A.icon('plus')}Add</button></h4>${rows || '<div class="muted">No layers</div>'}</div>
      <div class="sec"><h4>Layer settings</h4>${set || '<div class="muted">Select a layer</div>'}</div>
      <div class="sec"><h4>Scene</h4><div class="field-row"><label>Background</label><select class="sel" data-o="bg">${opt([['auto', 'Automatic'], ['white', 'White'], ['black', 'Black'], ['custom', 'Custom']], o.bg)}</select></div>${o.bg === 'custom' ? `<div class="field-row"><label>Colour</label><input type="color" data-o="bgHex" value="${o.bgHex || '#ffffff'}"></div>` : ''}
      ${slider('Ambient occl.', 'ao', 0, 1, 0.05, o.ao, 'o')}${slider('Outline', 'outline', 0, 1, 0.05, o.outline, 'o')}${slider('Depth cue', 'fog', 0, 1, 0.05, o.fog, 'o')}
      <label class="chk"><input type="checkbox" data-o="classic" ${o.classic ? 'checked' : ''}> Classic CPK colours</label><br><label class="chk"><input type="checkbox" data-o="axes" ${o.axes ? 'checked' : ''}> Axes indicator</label>${S.mol.cell ? `<br><label class="chk"><input type="checkbox" data-o="cell" ${o.cell ? 'checked' : ''}> Unit cell</label>` : ''}</div>`;
  };
  sbPane.addEventListener('click', (e) => {
    if (S.side !== 'display') return;
    const vis = e.target.closest('[data-vis]'); if (vis) { const l = S.layers[+vis.dataset.vis]; l.vis = !l.vis; R.invalidate(true); A.refresh(); return; }
    const del = e.target.closest('[data-del]'); if (del) { S.layers.splice(+del.dataset.del, 1); S.layerSel = Math.max(0, Math.min(S.layerSel, S.layers.length - 1)); R.invalidate(true); A.refresh(); return; }
    if (e.target.closest('#addLayer')) { const r = e.target.closest('#addLayer').getBoundingClientRect(); A.addLayerMenu(r.left, r.bottom + 4); return; }
    if (e.target.closest('[data-act=capture]')) { const l = S.layers[S.layerSel]; l.scope = 'sel'; l.idx = new Set(S.mol.sel); R.invalidate(true); A.refresh(); return; }
    const row = e.target.closest('[data-l]'); if (row) { S.layerSel = +row.dataset.l; A.refresh(); }
  });
  const onSetting = (e) => {
    if (S.side !== 'display') return; const t = e.target; const l = S.layers[S.layerSel];
    if (t.dataset.k && l) { let v = t.type === 'checkbox' ? t.checked : t.type === 'range' ? +t.value : t.value; if (t.tagName === 'SELECT' && t.dataset.k === 'res') v = +v; l[t.dataset.k] = v; if (t.dataset.k === 'style') { l.name = A.STYLE_NAMES[v]; } R.invalidate(true); if (e.type === 'change' || t.tagName === 'SELECT') A.refresh(); else if (t.dataset.k === 'name') A.refresh(); }
    else if (t.dataset.o) { const k = t.dataset.o; R.opts[k] = t.type === 'checkbox' ? t.checked : t.type === 'range' ? +t.value : t.value; R.invalidate(true); if (t.tagName === 'SELECT' || t.type === 'checkbox') A.refresh(); }
  };
  sbPane.addEventListener('input', (e) => { if (e.target.type === 'range' || e.target.type === 'color' || (e.target.dataset.k === 'name')) onSetting(e); });
  sbPane.addEventListener('change', onSetting);

  const renderStructure = () => {
    const m = S.mol; let h = '';
    if (!m.atoms.length) { sbPane.innerHTML = '<div class="muted">Nothing here yet.</div>'; return; }
    const { comp, n } = m.components(); const sizes = new Array(n).fill(0); comp.forEach((c) => sizes[c]++);
    if (m.meta.protein) {
      const chains = {}; m.res.forEach((r, i) => { if (r.aa) (chains[r.chain] = chains[r.chain] || []).push(i); });
      const one = Object.fromEntries(Object.entries(MS.AA3).map(([k, v]) => [v, k]));
      Object.keys(chains).forEach((ch) => {
        const list = chains[ch]; const helix = list.filter((i) => m.res[i].ss === 'H').length, sheet = list.filter((i) => m.res[i].ss === 'E').length;
        h += `<div class="sec"><h4>Chain ${esc(ch)} <span class="chip">${list.length} residues</span><span class="spacer"></span><button class="btn sm" data-chain="${esc(ch)}">Select</button></h4><div class="seq-blocks">${list.map((i) => `<span class="${m.res[i].ss}" data-res="${i}" title="${m.res[i].name}${m.res[i].num}">${one[m.res[i].name] || 'X'}</span>`).join('')}</div><div class="muted" style="margin-top:4px">${Math.round(helix / list.length * 100)}% helix · ${Math.round(sheet / list.length * 100)}% sheet <span title="Secondary structure from the file, or estimated from Cα geometry">(${m.meta.ssGiven ? 'from file' : 'estimated'})</span></div></div>`;
      });
      const others = m.res.map((r, i) => [r, i]).filter(([r]) => !r.aa && !r.water);
      const water = m.res.filter((r) => r.water).length;
      if (others.length || water) h += `<div class="sec"><h4>Hetero groups</h4>${others.slice(0, 60).map(([r, i]) => `<div class="tree-row" data-res="${i}"><span>${esc(r.name)} ${r.num}</span><span class="tag">chain ${esc(r.chain)}</span></div>`).join('')}${water ? `<div class="tree-row" data-water="1"><span>Water molecules</span><span class="tag">${water}</span></div>` : ''}</div>`;
    }
    const counts = C.counts(m);
    h += `<div class="sec"><h4>Fragments <span class="chip">${n}</span></h4>${sizes.slice(0, 40).map((s, i) => { const idx = m.atoms.map((_, k) => (comp[k] === i ? k : -1)).filter((k) => k >= 0); return `<div class="tree-row" data-frag="${i}"><span>${C.formula(m, idx, true)}</span><span class="tag">${s} atoms</span></div>`; }).join('')}${n > 40 ? `<div class="muted">… and ${n - 40} more</div>` : ''}</div>`;
    h += `<div class="sec"><h4>Elements</h4>${Object.keys(counts).map(Number).sort((a, b) => counts[b] - counts[a]).map((z) => `<div class="tree-row" data-el="${z}"><span class="swatch" style="background:${hexOf(EL[z].col)}"></span><span>${EL[z].name}</span><span class="tag">${counts[z]}</span></div>`).join('')}</div>`;
    sbPane.innerHTML = h;
  };
  sbPane.addEventListener('click', (e) => {
    if (S.side !== 'structure') return; const m = S.mol;
    const r = e.target.closest('[data-res]'); if (r) { const ri = +r.dataset.res; const list = m.atoms.map((a, i) => (a.r === ri ? i : -1)).filter((i) => i >= 0); if (e.shiftKey) list.forEach((i) => m.sel.add(i)), A.setSel(m.sel, []); else A.setSel(list, []); if (e.detail === 2) A.fit(new Set(list)); return; }
    const ch = e.target.closest('[data-chain]'); if (ch) { A.selectBy((a) => a.r >= 0 && m.res[a.r].chain === ch.dataset.chain); return; }
    const f = e.target.closest('[data-frag]'); if (f) { const { comp } = m.components(); A.selectBy((a, i) => comp[i] === +f.dataset.frag); return; }
    const el = e.target.closest('[data-el]'); if (el) { A.selectBy((a) => a.e === +el.dataset.el); return; }
    if (e.target.closest('[data-water]')) A.selectBy((a) => a.r >= 0 && m.res[a.r].water);
  });

  const renderLibrary = () => {
    const q = (S.libQ || '').toLowerCase();
    let h = `<div class="search"><span style="position:absolute;left:9px;top:8px;color:var(--muted)">${A.icon('search')}</span><input id="libQ" placeholder="Search molecules" value="${esc(S.libQ || '')}"></div><label class="chk" style="margin-bottom:10px"><input type="checkbox" id="libAdd" ${S.addMode ? 'checked' : ''}> Add to the current scene</label>`;
    h += `<div class="sec"><h4>Build</h4><div class="lib-grid"><button class="lib-item" data-b="smiles"><b>From SMILES…</b><span>type a formula string</span></button><button class="lib-item" data-b="peptide"><b>Peptide…</b><span>helix, strand, coil</span></button><button class="lib-item" data-b="c60"><b>Fullerene C60</b><span>60 carbons</span></button><button class="lib-item" data-b="nt"><b>Nanotube…</b><span>(n, m) carbon tube</span></button><button class="lib-item" data-b="gr"><b>Graphene…</b><span>flat sheet</span></button><button class="lib-item" data-b="demo"><b>Crambin protein</b><span>PDB 1CRN · cartoon</span></button></div></div>`;
    const mols = MS.LIB.molecules.filter((x) => !q || (x.name + ' ' + x.cat).toLowerCase().includes(q));
    MS.LIB.cats.forEach((c) => { const l = mols.filter((x) => x.cat === c); if (l.length) h += `<div class="sec"><h4>${esc(c)}</h4><div class="lib-grid">${l.map((x) => `<button class="lib-item" data-smi="${esc(x.smi)}" data-name="${esc(x.name)}"><b>${esc(x.name)}</b><span>${esc(x.note || x.smi)}</span></button>`).join('')}</div></div>`; });
    const cr = MS.LIB.crystals.filter((x) => !q || x.name.toLowerCase().includes(q) || 'crystal'.includes(q)); if (cr.length) h += `<div class="sec"><h4>Crystals</h4><div class="lib-grid">${cr.map((x) => `<button class="lib-item" data-cry="${esc(x.name)}"><b>${esc(x.name)}</b><span>${esc(x.note)}</span></button>`).join('')}</div></div>`;
    const orb = MS.LIB.orbitals.filter((x) => !q || x.name.toLowerCase().includes(q) || 'orbital'.includes(q)); if (orb.length) h += `<div class="sec"><h4>Orbitals</h4><div class="lib-grid">${orb.map((x) => `<button class="lib-item" data-orb="${esc(x.name)}"><b>${esc(x.name)}</b><span>hydrogen-like</span></button>`).join('')}</div></div>`;
    if (sbPane.dataset.lib !== h) { const keep = document.activeElement && document.activeElement.id === 'libQ'; sbPane.innerHTML = h; sbPane.dataset.lib = h; if (keep) { const i = $('#libQ'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
  };
  sbPane.addEventListener('click', (e) => {
    if (S.side !== 'library') return; const b = e.target.closest('button.lib-item'); if (!b) return; S.dismissEmpty = true;
    if (b.dataset.smi) { A.insertSmiles(b.dataset.smi, b.dataset.name); return; }
    if (b.dataset.cry) { A.load(MS.LIB.buildCrystal(MS.LIB.crystals.find((c) => c.name === b.dataset.cry))); return; }
    if (b.dataset.orb) { A.load(MS.LIB.buildOrbital(MS.LIB.orbitals.find((c) => c.name === b.dataset.orb))); return; }
    ({ smiles: A.smilesDialog, peptide: A.peptideDialog, c60: () => A.load(MS.build.fullerene()), nt: A.nanotubeDialog, gr: A.grapheneDialog, demo: A.loadDemo })[b.dataset.b]();
  });
  sbPane.addEventListener('input', (e) => { if (e.target.id === 'libQ') { S.libQ = e.target.value; renderLibrary(); } });
  sbPane.addEventListener('change', (e) => { if (e.target.id === 'libAdd') S.addMode = e.target.checked; });
  $('#sbTabs').onclick = (e) => { const b = e.target.closest('[data-t]'); if (b) { S.side = b.dataset.t; sbPane.dataset.lib = ''; A.refresh(); } };

  /* ------------------------------------------------------------ inspector */
  const inPane = $('#inPane');
  const renderProps = () => {
    const m = S.mol; if (!m.atoms.length) { inPane.innerHTML = '<div class="note-box">No molecule yet. Draw atoms with the pencil tool, or insert one from the Library.</div>'; return; }
    if (!S.cache || S.cache.ver !== m.ver) { try { S.cache = { ver: m.ver, p: C.props(m), smi: m.atoms.length < 600 ? MS.smiles.toSmiles(m) : '', arom: 0 }; } catch (e) { S.cache = { ver: m.ver, p: C.props(m), smi: '' }; } }
    const p = S.cache.p; const counts = C.counts(m); const zs = Object.keys(counts).map(Number).sort((a, b) => counts[b] - counts[a]);
    const selN = m.sel.size; const selF = selN ? C.formula(m, m.sel, true) : '';
    let h = `<div class="sec"><div class="big-formula">${p.formula.replace(/(\d+)/g, '<sub>$1</sub>')}</div><div class="muted">${esc(m.title || 'Untitled')}</div></div>
      <div class="sec"><div class="kv"><span>Molar mass</span><span>${fmt(p.mass, 3)} g/mol</span><span>Atoms</span><span>${p.atoms} (${p.heavy} heavy)</span><span>Bonds</span><span>${p.bonds}</span><span>Rings</span><span>${p.rings}${p.aromatic ? ` (${p.aromatic} aromatic)` : ''}</span><span>Rotatable bonds</span><span>${p.rotatable}</span><span>H-bond donors / acceptors</span><span>${p.hbd} / ${p.hba}</span><span>Net charge</span><span>${p.charge > 0 ? '+' : ''}${p.charge}</span><span>Fragments</span><span>${p.frags}</span>${S.energy != null ? `<span>Force-field energy</span><span>${fmt(S.energy, 1)} kcal/mol</span>` : ''}</div>
      <div class="comp-bar">${zs.map((z) => `<i style="flex:${counts[z]};background:${hexOf(EL[z].col)}" title="${EL[z].name} ${counts[z]}"></i>`).join('')}</div><div class="muted" style="font-size:11.5px">${zs.slice(0, 8).map((z) => `${EL[z].sym} ${counts[z]}`).join(' · ')}</div></div>`;
    if (S.cache.smi && !m.meta.protein) h += `<div class="sec"><h4>SMILES<span class="spacer"></span><button class="btn sm" id="copySmi">${A.icon('copy')}Copy</button></h4><div class="smiles-box">${esc(S.cache.smi)}</div></div>`;
    if (selN) h += `<div class="sec"><h4>Selection</h4><div class="kv"><span>Atoms</span><span>${selN}</span><span>Formula</span><span>${selF}</span><span>Mass</span><span>${fmt(C.mass(m, m.sel), 2)} g/mol</span><span>Centroid</span><span>${m.centroid(m.sel).map((v) => fmt(v, 2)).join(', ')}</span></div></div>`;
    if (m.cell) h += `<div class="sec"><h4>Unit cell</h4><div class="kv"><span>a, b, c (Å)</span><span>${fmt(m.cell.a, 3)}, ${fmt(m.cell.b, 3)}, ${fmt(m.cell.c, 3)}</span><span>α, β, γ (°)</span><span>${fmt(m.cell.al, 2)}, ${fmt(m.cell.be, 2)}, ${fmt(m.cell.ga, 2)}</span><span>Volume (Å³)</span><span>${fmt(cellVol(m.cell), 2)}</span></div></div>`;
    if (m.meta.protein) { const helix = m.res.filter((r) => r.ss === 'H').length, sheet = m.res.filter((r) => r.ss === 'E').length, aa = m.res.filter((r) => r.aa).length; h += `<div class="sec"><h4>Protein</h4><div class="kv"><span>Residues</span><span>${aa}</span><span>α-helix</span><span>${helix}</span><span>β-sheet</span><span>${sheet}</span></div></div>`; }
    if (m.vol) h += `<div class="sec"><h4>Volume data</h4><div class="kv"><span>Grid</span><span>${m.vol.nx} × ${m.vol.ny} × ${m.vol.nz}</span><span>Range</span><span>${(() => { if (m.vol.rng === undefined) { let a = 1e9, b = -1e9; for (const v of m.vol.data) { if (v < a) a = v; if (v > b) b = v; } m.vol.rng = [a, b]; } return fmt(m.vol.rng[0], 3) + ' … ' + fmt(m.vol.rng[1], 3); })()}</span></div></div>`;
    h += `<div class="sec"><h4>Tools</h4><div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn sm" data-q="opt">${A.icon('bolt')}Optimise</button><button class="btn sm" data-q="addh">Add H</button><button class="btn sm" data-q="remh">Remove H</button><button class="btn sm" data-q="chg">Charges</button><button class="btn sm" data-q="dip">Dipole</button></div></div>`;
    if (p.atoms > 0 && p.atoms < 150 && m.meta.note) h += `<div class="note-box">${esc(m.meta.note)}</div>`;
    inPane.innerHTML = h;
  };
  const cellVol = (c) => { const d = Math.PI / 180, ca = Math.cos(c.al * d), cb = Math.cos(c.be * d), cg = Math.cos(c.ga * d); return c.a * c.b * c.c * Math.sqrt(Math.max(0, 1 - ca * ca - cb * cb - cg * cg + 2 * ca * cb * cg)); };
  const renderAtoms = () => {
    const m = S.mol; const n = m.atoms.length; if (!n) { inPane.innerHTML = '<div class="muted">No atoms.</div>'; return; }
    const sel = m.sel; const idx = []; const cap = 500;
    if (sel.size && sel.size < cap) sel.forEach((i) => idx.push(i)); else for (let i = 0; i < Math.min(n, cap); i++) idx.push(i);
    idx.sort((a, b) => a - b);
    const rows = idx.map((i) => { const a = m.atoms[i]; return `<tr data-i="${i}" class="${sel.has(i) ? 'sel' : ''}"><td>${i + 1}</td><td><input data-f="e" value="${EL[a.e].sym}" style="width:34px;text-align:left"></td><td><input data-f="x" value="${fmt(a.x, 4)}"></td><td><input data-f="y" value="${fmt(a.y, 4)}"></td><td><input data-f="z" value="${fmt(a.z, 4)}"></td><td><input data-f="q" value="${a.q || 0}" style="width:28px"></td></tr>`; }).join('');
    const html = `<div class="muted" style="margin-bottom:6px">${sel.size && sel.size < cap ? `Showing ${sel.size} selected of ${n} atoms` : n > cap ? `Showing first ${cap} of ${n} atoms — select atoms to list them` : `${n} atoms`} · edit any cell</div><table class="atoms"><thead><tr><th>#</th><th>El</th><th>x</th><th>y</th><th>z</th><th>q</th></tr></thead><tbody>${rows}</tbody></table>`;
    if (inPane.dataset.k !== html) { if (document.activeElement && inPane.contains(document.activeElement) && document.activeElement.tagName === 'INPUT') return; inPane.innerHTML = html; inPane.dataset.k = html; }
  };
  inPane.addEventListener('change', (e) => {
    const t = e.target; if (S.info !== 'atoms' || !t.dataset.f) return; const i = +t.closest('tr').dataset.i, a = S.mol.atoms[i], f = t.dataset.f;
    A.snap('Edit atom'); if (f === 'e') { const z = MS.zOf(t.value); if (!z) { A.toast('Unknown element.', true); return A.refresh(); } a.e = z; S.mol.touch(); } else if (f === 'q') a.q = parseInt(t.value, 10) || 0; else { const v = parseFloat(t.value); if (isNaN(v)) return A.refresh(); a[f] = v; }
    A.changed(f === 'x' || f === 'y' || f === 'z'); inPane.dataset.k = '';
  });
  inPane.addEventListener('click', (e) => {
    const tr = e.target.closest('table.atoms tr[data-i]'); if (tr && e.target.tagName !== 'INPUT') { A.clickSelect(+tr.dataset.i, e.shiftKey || e.metaKey); return; }
    if (e.target.closest('#copySmi')) return A.copyText(S.cache.smi, 'SMILES');
    const q = e.target.closest('[data-q]'); if (q) ({ opt: () => A.optimize(), addh: A.addH, remh: A.removeH, chg: A.showCharges, dip: () => { S.showDip = !S.showDip; R.invalidate(false); A.refresh(); } })[q.dataset.q]();
  });
  const renderGeom = () => {
    const m = S.mol, o = S.selOrder.filter((i) => m.atoms[i]); let h = '';
    if (o.length < 2) h = `<div class="note-box">Select 2–4 atoms (click them one after another) to read and edit distances, angles and dihedrals. Use the Measure tool, or click atoms with the Select tool.</div>`;
    else {
      const name = (i) => `${EL[m.atoms[i].e].sym}${i + 1}`;
      const row = (id, label, val, unit) => `<div class="row"><span>${label}</span><input class="field num" data-g="${id}" value="${val}" step="any" type="number"><span class="muted">${unit}</span></div>`;
      for (let k = 0; k + 1 < o.length; k++) h += `<div class="geo-card">${row('d' + k, `Distance ${name(o[k])}–${name(o[k + 1])}`, MS.geom.dist(m, o[k], o[k + 1]).toFixed(3), 'Å')}</div>`;
      if (o.length >= 3) h += `<div class="geo-card">${row('a', `Angle ${name(o[0])}–${name(o[1])}–${name(o[2])}`, MS.geom.angle(m, o[0], o[1], o[2]).toFixed(2), '°')}</div>`;
      if (o.length === 4) h += `<div class="geo-card">${row('t', `Dihedral ${o.map(name).join('–')}`, MS.geom.dihedral(m, o[0], o[1], o[2], o[3]).toFixed(2), '°')}</div>`;
      h += `<div class="muted">Changing a value moves the fragment on the far side of the bond. Edits that would break a ring are refused.</div>`;
    }
    if (m.sel.size > 4) h += `<div class="warn-box" style="margin-top:8px">${m.sel.size} atoms selected. Geometry editing needs 2–4 atoms.</div>`;
    const html = h; if (inPane.dataset.k !== html) { if (document.activeElement && inPane.contains(document.activeElement)) return; inPane.innerHTML = html; inPane.dataset.k = html; }
  };
  inPane.addEventListener('change', (e) => {
    const g = e.target.dataset.g; if (!g || S.info !== 'geom') return; const m = S.mol, o = S.selOrder, v = parseFloat(e.target.value); if (isNaN(v)) return;
    A.snap('Edit geometry'); let ok = false;
    if (g[0] === 'd') { const k = +g.slice(1); ok = fragmentDist(o[k], o[k + 1], v); } else if (g === 'a') ok = C.setAngle(m, o[0], o[1], o[2], v) || (C.setAngle(m, o[2], o[1], o[0], v)); else if (g === 't') ok = C.setDihedral(m, o[0], o[1], o[2], o[3], v) || C.setDihedral(m, o[3], o[2], o[1], o[0], v);
    if (!ok) { S.undo.pop(); A.toast('Cannot change this value without breaking a ring.', true); } else A.changed(true);
    inPane.dataset.k = ''; A.refresh();
  });
  const fragmentDist = (i, j, d) => {
    const m = S.mol; if (m.bondIndex(i, j) >= 0) return C.setDistance(m, i, j, d) || C.setDistance(m, j, i, d);
    const { comp } = m.components(); if (comp[i] === comp[j]) return false;
    const u = V.sub(m.pos(j), m.pos(i)), t = V.mul(V.norm(u), d - V.len(u)); m.translate(m.atoms.map((_, k) => k).filter((k) => comp[k] === comp[j]), t); return true;
  };
  $('#inTabs').onclick = (e) => { const b = e.target.closest('[data-t]'); if (b) { S.info = b.dataset.t; inPane.dataset.k = ''; A.refresh(); } };

  /* ------------------------------------------------------------ status bar / refresh */
  const status = $('#status');
  A.legal = (tab) => A.dlg({ title: tab === 'imprint' ? 'Imprint' : 'Privacy', width: 640, body: `<div class="legal">${MS.legalHtml(tab === 'imprint' ? MS.LEGAL_IMPRINT : MS.LEGAL_PRIVACY)}</div>` });
  document.addEventListener('click', (e) => { const a = e.target.closest('[data-legal]'); if (a) { e.preventDefault(); A.legal(a.dataset.legal); } });
  A.helpDialog = () => A.dlg({
    title: 'Keyboard shortcuts', width: 620, body: `<div class="kv" style="grid-template-columns:1fr auto;gap:5px 18px">${[['1 – 7', 'Navigate, Select, Draw, Manipulate, Measure, Rotate bond, Erase'], ['Draw tool + C N O H F P S L R I', 'Choose element (L = Cl, R = Br)'], ['Click atom / bond', 'Draw: change element, extend, set bond order'], ['Right-click in Draw / Erase', 'Delete atom or bond'], ['Space + drag, Alt + drag, middle-drag', 'Rotate the view in any tool'], ['Right-drag, ⇧ + drag', 'Pan'], ['Scroll, pinch', 'Zoom'], ['F', 'Fit to window'], ['0', 'Reset orientation'], [mod + 'Z / ⇧' + mod + 'Z', 'Undo / redo'], [mod + 'A', 'Select all'], ['Esc', 'Clear selection'], ['⌫', 'Delete selection'], ['⇧H', 'Add hydrogens'], [mod + 'E', 'Optimise geometry'], [mod + 'O / ' + mod + 'S', 'Open / save scene'], [mod + 'K', 'Command palette'], ['[ ] and P', 'Previous / next frame, play']].map(([k, d]) => `<span><kbd>${esc(k)}</kbd></span><span style="text-align:left">${esc(d)}</span>`).join('')}</div>`,
  });
  A.aboutDialog = () => A.dlg({ title: 'About MoleculeScale', width: 520, body: `<p>MoleculeScale is a 3D molecule editor and visualiser that runs entirely in your browser — a sibling of LabScale and DNAScale. It has its own WebGL renderer (no libraries), a quick general-purpose force field, a SMILES reader with 3D embedding, and readers and writers for the common structure formats.</p><p class="muted">Energies and charges are approximate. Use a quantum-chemistry package for publication-grade numbers.</p>` });
  A.pasteDialog = () => A.dlg({
    title: 'Paste structure or SMILES', width: 600, body: `<p class="muted" style="margin-top:0">Paste the contents of an XYZ, MOL, SDF, PDB, CIF or CML file, or a SMILES string.</p><textarea id="pasteTxt" spellcheck="false" placeholder="CC(=O)Oc1ccccc1C(=O)O"></textarea>`,
    buttons: [{ label: 'Cancel' }, { label: 'Open', primary: true, fn: () => { const t = $('#pasteTxt').value; if (!t.trim()) return false; A.openText('pasted', t); } }], onOpen: (d) => $('#pasteTxt', d).focus(),
  });
  A.newScene = (keepUndo) => { const m = new MS.Mol(); const u = S.undo; A.setMol(m); if (keepUndo === true) S.undo = u; S.dismissEmpty = false; A.persistSoon(); };
  A.loadDemo = () => { try { const r = MS.io.read('1crn.pdb', window.MS_SAMPLE_PDB); r.mol.title = 'Crambin (PDB 1CRN)'; A.load(r.mol); S.dismissEmpty = true; } catch (e) { A.toast(e.message, true); } };

  const renderStatus = () => {
    const m = S.mol; const p = m.atoms.length;
    status.innerHTML = `<span>${p ? '<b>' + C.formula(m, null, true) + '</b>' : 'Empty scene'}</span>${p ? `<span>${p} atoms · ${m.bonds.length} bonds</span>` : ''}${m.sel.size ? `<span>${m.sel.size} selected</span>` : ''}${S.energy != null ? `<span>E ${fmt(S.energy, 1)} kcal/mol</span>` : ''}${S.auto ? '<span class="chip ok">auto-optimise</span>' : ''}${S.busy ? '<span class="chip acc">working…</span>' : ''}<span class="grow"></span><a href="#" data-legal="imprint">Imprint</a><a href="#" data-legal="privacy">Privacy</a>`;
  };
  const renderChrome = () => {
    $$('#rail [data-tool]').forEach((b) => b.classList.toggle('on', b.dataset.tool === S.tool));
    $$('#styleSeg [data-s]').forEach((b) => b.classList.toggle('on', b.dataset.s === A.baseStyle()));
    $('#hSurf').classList.toggle('on', S.layers.some((l) => l.style === 'surface')); $('#hLab').classList.toggle('on', S.layers.some((l) => l.style === 'labels'));
    $$('#hudRight [data-h]').forEach((b) => { const k = b.dataset.h; b.classList.toggle('on', (k === 'ortho' && R.cam.ortho) || (k === 'spin' && S.spin) || (k === 'cell' && R.opts.cell) || (k === 'dipole' && S.showDip)); });
    $('#hudRight [data-h=cell]').style.display = S.mol.cell ? '' : 'none';
    $$('#hudTop [data-s=cartoon]').forEach((b) => { b.style.display = S.mol.meta.protein ? '' : 'none'; });
    $('#btnUndo').disabled = !S.undo.length; $('#btnRedo').disabled = !S.redo.length;
    $$('#sbTabs [data-t]').forEach((b) => b.classList.toggle('on', b.dataset.t === S.side)); $$('#inTabs [data-t]').forEach((b) => b.classList.toggle('on', b.dataset.t === S.info));
    const empty = !S.mol.atoms.length && !S.dismissEmpty; $('#empty').hidden = !empty; $('#rail').style.opacity = 1;
  };
  A.uiFns.push(renderChrome, renderCbar, renderStatus, renderTraj, () => { if (S.side === 'display') renderDisplay(); else if (S.side === 'structure') renderStructure(); else renderLibrary(); }, () => { if (S.info === 'props') renderProps(); else if (S.info === 'atoms') renderAtoms(); else renderGeom(); });
  A.hydrate();

  /* ------------------------------------------------------------ top-level buttons & shortcuts */
  $('#btnOpen').onclick = A.openDialog; $('#btnOpt').onclick = () => A.optimize(); $('#btnUndo').onclick = A.undo; $('#btnRedo').onclick = A.redo; $('#btnPalette').onclick = A.palette; $('#btnHelp').onclick = A.helpDialog;
  $('#btnSb').onclick = () => $('#app').classList.toggle('no-sidebar'); $('#btnIn').onclick = () => $('#app').classList.toggle('no-inspector');
  $('#btnTheme').onclick = () => A.setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  $('#emDraw').onclick = () => { S.dismissEmpty = true; A.setTool('draw'); }; $('#emSmiles').onclick = A.smilesDialog; $('#emOpen').onclick = A.openDialog; $('#emDemo').onclick = () => A.insertSmiles('Cn1cnc2c1c(=O)n(C)c(=O)n2C', 'Caffeine');
  $('#emResume').onclick = () => { try { A.loadScene(JSON.parse(localStorage.getItem('ms-last'))); } catch (e) { A.toast('Could not restore the last session.', true); } };
  const ELKEYS = { h: 1, c: 6, n: 7, o: 8, f: 9, p: 15, s: 16, l: 17, r: 35, i: 53, b: 5 };
  window.addEventListener('keydown', (e) => {
    const tag = document.activeElement && document.activeElement.tagName; if (/INPUT|TEXTAREA|SELECT/.test(tag) || document.querySelector('dialog[open]')) { if (e.key === 'Escape') return; if (!(e.metaKey || e.ctrlKey)) return; }
    const k = e.key, meta = e.metaKey || e.ctrlKey;
    if (meta && k.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? A.redo() : A.undo(); return; }
    if (meta && k.toLowerCase() === 'k') { e.preventDefault(); A.palette(); return; }
    if (meta && k.toLowerCase() === 'o') { e.preventDefault(); A.openDialog(); return; }
    if (meta && k.toLowerCase() === 's') { e.preventDefault(); A.saveScene(); return; }
    if (meta && k.toLowerCase() === 'e') { e.preventDefault(); A.optimize(); return; }
    if (meta && k.toLowerCase() === 'a') { e.preventDefault(); A.selectBy(() => true); return; }
    if (meta && k.toLowerCase() === 'p') { e.preventDefault(); A.screenshotDialog(); return; }
    if (meta) return;
    if (/^[1-7]$/.test(k)) { A.setTool(TOOLDEF[+k - 1][0]); return; }
    if (k === 'Escape') { S.measure = []; A.setSel([]); A.closeMenus(); return; }
    if (k === 'Backspace' || k === 'Delete') { e.preventDefault(); A.deleteSelection(); return; }
    if (k === '?') { A.helpDialog(); return; }
    if (S.tool === 'draw' && ELKEYS[k.toLowerCase()] && !e.shiftKey) { S.el = ELKEYS[k.toLowerCase()]; A.refresh(); return; }
    if (k === 'H' && e.shiftKey) { A.addH(); return; }
    if (k.toLowerCase() === 'f') { A.fit(S.mol.sel.size ? S.mol.sel : null); return; }
    if (k === '0') { A.resetView(); return; }
    if (k === '[') A.setFrame(S.mol.frame - 1); if (k === ']') A.setFrame(S.mol.frame + 1);
    if (k.toLowerCase() === 'p' && S.mol.frames.length > 1) { S.play = !S.play; R.invalidate(false); A.refresh(); }
  });

  /* ------------------------------------------------------------ boot */
  A.setTheme(document.documentElement.dataset.theme || 'light');
  try { if (localStorage.getItem('ms-last')) $('#emResume').hidden = false; } catch (e) { }
  const q = new URLSearchParams(location.search);
  A.setMol(S.mol);
  try {
    if (q.has('demo') || q.get('load') === 'protein') A.loadDemo();
    else if (q.get('smiles')) A.insertSmiles(q.get('smiles'), null);
    else if (q.get('mol')) { const it = MS.LIB.molecules.find((x) => x.name.toLowerCase() === q.get('mol').toLowerCase()); if (it) A.insertSmiles(it.smi, it.name); }
    else if (q.get('orbital')) { const o = MS.LIB.orbitals.find((x) => x.name === q.get('orbital')); if (o) A.load(MS.LIB.buildOrbital(o)); }
    else if (q.has('sample')) A.insertSmiles('Cn1cnc2c1c(=O)n(C)c(=O)n2C', 'Caffeine');
  } catch (e) { console.error(e); }
  if (q.get('tool')) A.setTool(q.get('tool'));
  S.dismissEmpty = S.dismissEmpty || false;
  A.refresh(); R.invalidate(true);
})();
