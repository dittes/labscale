/* File formats: XYZ, MOL/SDF, PDB, CML, CIF, Gaussian cube, SMILES (read); XYZ, MOL, SDF, PDB, CML, CIF, SMILES (write). */
(function () {
  'use strict';
  const MS = (window.MS = window.MS || {});
  const EL = MS.EL, C = MS.chem;
  const BOHR = 0.529177249;
  const num = (s) => parseFloat(s);
  const WATER = new Set(['HOH', 'WAT', 'H2O', 'DOD', 'TIP', 'TIP3', 'SOL']);
  const AA = new Set(Object.values(MS.AA3 || {}).concat(['ALA', 'ARG', 'ASN', 'ASP', 'CYS', 'GLN', 'GLU', 'GLY', 'HIS', 'ILE', 'LEU', 'LYS', 'MET', 'PHE', 'PRO', 'SER', 'THR', 'TRP', 'TYR', 'VAL', 'MSE', 'HID', 'HIE', 'HIP', 'CYX', 'ASH', 'GLH', 'LYN']));
  const NUC = new Set(['A', 'C', 'G', 'T', 'U', 'DA', 'DC', 'DG', 'DT', 'DU', 'ADE', 'CYT', 'GUA', 'THY', 'URA']);

  /** classify residues, detect proteins, estimate secondary structure if absent */
  function finalize(m) {
    m.res.forEach((r) => { r.water = WATER.has(r.name); r.aa = AA.has(r.name); r.nuc = NUC.has(r.name); });
    const nAA = m.res.filter((r) => r.aa).length;
    m.meta.protein = nAA >= 4;
    if (m.meta.protein && !m.meta.ssGiven) estimateSS(m);
    return m;
  }
  function estimateSS(m) {
    const ca = new Map();
    m.atoms.forEach((a, i) => { if (a.nm === 'CA' && a.r >= 0 && m.res[a.r].aa) ca.set(a.r, i); });
    const chains = {};
    m.res.forEach((r, i) => { if (ca.has(i)) (chains[r.chain] = chains[r.chain] || []).push(i); });
    Object.values(chains).forEach((l) => {
      const d = (a, b) => MS.geom.dist(m, ca.get(l[a]), ca.get(l[b]));
      const tag = new Array(l.length).fill('C');
      for (let k = 0; k + 4 < l.length; k++) {
        const d3 = d(k, k + 3), d4 = d(k, k + 4);
        if (d3 > 4.4 && d3 < 5.9 && d4 > 5.5 && d4 < 7.0) for (let t = k; t <= k + 4; t++) tag[t] = 'H';
      }
      for (let k = 0; k + 2 < l.length; k++) {
        if (tag[k] === 'H') continue;
        const d2 = d(k, k + 2); if (d2 > 6.0 && d2 < 7.4 && tag[k + 1] !== 'H') { tag[k] = tag[k] === 'C' ? 'E' : tag[k]; tag[k + 1] = 'E'; tag[k + 2] = tag[k + 2] === 'C' ? 'E' : tag[k + 2]; }
      }
      // remove isolated strands of length < 3
      for (let k = 0; k < l.length;) { let e = k; while (e < l.length && tag[e] === tag[k]) e++; if (tag[k] === 'E' && e - k < 3) for (let t = k; t < e; t++) tag[t] = 'C'; k = e; }
      l.forEach((ri, k) => { m.res[ri].ss = tag[k]; });
    });
  }

  /* ---------- XYZ ---------- */
  function readXYZ(text) {
    const lines = text.split(/\r?\n/); const frames = []; let i = 0, first = null;
    while (i < lines.length) {
      if (!lines[i].trim()) { i++; continue; }
      const n = parseInt(lines[i], 10); if (!(n >= 0)) break;
      const title = lines[i + 1] || ''; const atoms = [];
      for (let k = 0; k < n; k++) {
        const p = (lines[i + 2 + k] || '').trim().split(/\s+/); if (p.length < 4) throw new Error('XYZ: bad atom line ' + (i + 3 + k));
        const z = /^\d+$/.test(p[0]) ? parseInt(p[0], 10) : MS.zOf(p[0].replace(/[^A-Za-z]/g, '')); if (!z) throw new Error('XYZ: unknown element ' + p[0]);
        atoms.push([z, num(p[1]), num(p[2]), num(p[3])]);
      }
      if (!first) first = { atoms, title }; else frames.push(atoms);
      i += 2 + n;
    }
    if (!first) throw new Error('XYZ: no atoms found');
    const m = new MS.Mol(); m.title = first.title.trim();
    first.atoms.forEach(([z, x, y, zz]) => m.addAtom(z, x, y, zz));
    addFrames(m, frames.map((f) => f.map((a) => [a[1], a[2], a[3]])));
    C.perceiveBonds(m); C.perceiveOrders(m); return m;
  }
  function addFrames(m, list) {
    const n = m.atoms.length;
    const ok = list.filter((f) => f.length === n);
    if (!ok.length) return;
    const first = new Float32Array(n * 3); m.atoms.forEach((a, i) => { first[i * 3] = a.x; first[i * 3 + 1] = a.y; first[i * 3 + 2] = a.z; });
    m.frames = [first].concat(ok.map((f) => { const g = new Float32Array(n * 3); f.forEach((p, i) => { g[i * 3] = p[0]; g[i * 3 + 1] = p[1]; g[i * 3 + 2] = p[2]; }); return g; }));
  }
  function writeXYZ(m) {
    return m.atoms.length + '\n' + (m.title || 'MoleculeScale') + '\n' + m.atoms.map((a) => EL[a.e].sym.padEnd(3) + [a.x, a.y, a.z].map((v) => v.toFixed(6).padStart(14)).join('')).join('\n') + '\n';
  }
  function writeXYZFrames(m) {
    if (m.frames.length < 2) return writeXYZ(m);
    const out = [];
    m.frames.forEach((f, k) => { out.push(m.atoms.length + '\nframe ' + (k + 1)); m.atoms.forEach((a, i) => out.push(EL[a.e].sym.padEnd(3) + [f[i * 3], f[i * 3 + 1], f[i * 3 + 2]].map((v) => v.toFixed(6).padStart(14)).join(''))); });
    return out.join('\n') + '\n';
  }

  /* ---------- MOL / SDF ---------- */
  function readMolBlock(lines) {
    const m = new MS.Mol(); m.title = (lines[0] || '').trim();
    const cl = lines[3] || ''; const na = parseInt(cl.slice(0, 3), 10), nb = parseInt(cl.slice(3, 6), 10);
    if (!(na >= 0)) throw new Error('MOL: bad counts line');
    if (/V3000/.test(cl)) throw new Error('MOL V3000 is not supported; export as V2000 or SDF.');
    const CH = { 0: 0, 1: 3, 2: 2, 3: 1, 5: -1, 6: -2, 7: -3 };
    for (let i = 0; i < na; i++) {
      const l = lines[4 + i]; const sym = l.slice(31, 34).trim();
      const z = MS.zOf(sym) || (sym === 'D' ? 1 : 0); if (!z) throw new Error('MOL: unknown element ' + sym);
      m.addAtom(z, num(l.slice(0, 10)), num(l.slice(10, 20)), num(l.slice(20, 30)), { q: CH[parseInt(l.slice(36, 39), 10) || 0] || 0 });
    }
    for (let i = 0; i < nb; i++) {
      const l = lines[4 + na + i]; const a = parseInt(l.slice(0, 3), 10) - 1, b = parseInt(l.slice(3, 6), 10) - 1; let o = parseInt(l.slice(6, 9), 10); if (o > 3) o = 1;
      m.addBond(a, b, o);
    }
    for (let i = 4 + na + nb; i < lines.length; i++) {
      const l = lines[i]; if (l.startsWith('M  END')) break;
      if (l.startsWith('M  CHG')) { const p = l.slice(6).trim().split(/\s+/).map(Number); for (let k = 1; k + 1 < p.length; k += 2) if (m.atoms[p[k] - 1]) m.atoms[p[k] - 1].q = p[k + 1]; }
    }
    return m;
  }
  function readSDF(text) {
    const blocks = text.replace(/\r/g, '').split(/\n\$\$\$\$\s*\n?/).filter((b) => b.trim().length);
    const mols = blocks.map((b) => readMolBlock(b.split('\n')));
    if (!mols.length) throw new Error('SDF: no molecules');
    const m = mols[0];
    if (mols.length > 1 && mols.every((x) => x.atoms.length === m.atoms.length)) addFrames(m, mols.slice(1).map((x) => x.atoms.map((a) => [a.x, a.y, a.z])));
    else if (mols.length > 1) m.meta.note = mols.length + ' molecules in file; showing the first.';
    return m;
  }
  function writeMol(m) {
    const f = (v, w, d) => v.toFixed(d).padStart(w);
    const CHC = { 3: 1, 2: 2, 1: 3, '-1': 5, '-2': 6, '-3': 7 };
    let s = (m.title || 'MoleculeScale').slice(0, 79) + '\n  MoleculeScale\n\n' + String(m.atoms.length).padStart(3) + String(m.bonds.length).padStart(3) + '  0  0  0  0  0  0  0  0999 V2000\n';
    m.atoms.forEach((a) => { s += f(a.x, 10, 4) + f(a.y, 10, 4) + f(a.z, 10, 4) + ' ' + EL[a.e].sym.padEnd(3) + ' 0' + String(a.q && CHC[-a.q] || 0).padStart(3) + '  0  0  0  0  0  0  0  0  0  0\n'; });
    m.bonds.forEach((b) => { s += String(b.a + 1).padStart(3) + String(b.b + 1).padStart(3) + String(b.o).padStart(3) + '  0\n'; });
    const ch = m.atoms.map((a, i) => [i + 1, a.q]).filter((x) => x[1]);
    for (let i = 0; i < ch.length; i += 8) { const part = ch.slice(i, i + 8); s += 'M  CHG' + String(part.length).padStart(3) + part.map((x) => String(x[0]).padStart(4) + String(x[1]).padStart(4)).join('') + '\n'; }
    return s + 'M  END\n';
  }

  /* ---------- PDB ---------- */
  function readPDB(text) {
    const m = new MS.Mol(), lines = text.split(/\r?\n/), frames = [], helix = [], sheet = [], conect = [], serial = new Map();
    let cur = null, model = 0, resKey = null;
    for (const l of lines) {
      const rec = l.slice(0, 6).trim();
      if (rec === 'TITLE' && !m.title) m.title = l.slice(10).trim();
      else if (rec === 'MODEL') { model++; if (model > 1) cur = []; }
      else if (rec === 'ENDMDL') { if (cur && model > 1) { frames.push(cur); cur = null; } }
      else if (rec === 'CRYST1') { const c = [l.slice(6, 15), l.slice(15, 24), l.slice(24, 33), l.slice(33, 40), l.slice(40, 47), l.slice(47, 54)].map(num); if (c[0] > 1 && c[1] > 1 && c[2] > 1) m.cell = { a: c[0], b: c[1], c: c[2], al: c[3] || 90, be: c[4] || 90, ga: c[5] || 90 }; }
      else if (rec === 'HELIX') helix.push([l[19], parseInt(l.slice(21, 25), 10), parseInt(l.slice(33, 37), 10)]);
      else if (rec === 'SHEET') sheet.push([l[21], parseInt(l.slice(22, 26), 10), parseInt(l.slice(33, 37), 10)]);
      else if (rec === 'CONECT') { const p = []; for (let i = 6; i + 5 <= l.length; i += 5) { const v = parseInt(l.slice(i, i + 5), 10); if (v) p.push(v); } conect.push(p); }
      else if (rec === 'ATOM' || rec === 'HETATM') {
        const alt = l[16]; if (alt !== ' ' && alt !== 'A' && alt !== '1' && alt !== undefined) continue;
        const x = num(l.slice(30, 38)), y = num(l.slice(38, 46)), z = num(l.slice(46, 54));
        if (model > 1) { cur.push([x, y, z]); continue; }
        const nm = l.slice(12, 16).trim(); let sym = l.slice(76, 78).trim();
        let e = MS.zOf(sym);
        if (!e) { const t = nm.replace(/[^A-Za-z]/g, ''); e = /^[A-Za-z]/.test(l.slice(12, 13)) && l[12] !== ' ' ? MS.zOf(t.slice(0, 2)) || MS.zOf(t[0]) : MS.zOf(t[0]); }
        if (!e) e = 6;
        const rn = l.slice(17, 20).trim(), ch = l[21] === ' ' ? 'A' : l[21], rs = parseInt(l.slice(22, 26), 10), ic = l[26] === ' ' ? '' : l[26];
        const key = ch + rs + ic + rn;
        if (key !== resKey) { m.res.push({ name: rn, num: rs, chain: ch, ss: 'C', het: rec === 'HETATM' }); resKey = key; }
        const q = l.slice(78, 80).trim(); let fq = 0; if (/^\d[+-]$/.test(q)) fq = (q[1] === '+' ? 1 : -1) * parseInt(q[0], 10);
        const idx = m.addAtom(e, x, y, z, { nm, r: m.res.length - 1, b: num(l.slice(60, 66)) || 0, het: rec === 'HETATM', q: fq });
        serial.set(parseInt(l.slice(6, 11), 10), idx);
      }
    }
    if (!m.atoms.length) throw new Error('PDB: no ATOM/HETATM records');
    m.res.forEach((r) => {
      for (const [c, a, b] of helix) if (r.chain === c && r.num >= a && r.num <= b) r.ss = 'H';
      for (const [c, a, b] of sheet) if (r.chain === c && r.num >= a && r.num <= b) r.ss = 'E';
    });
    m.meta.ssGiven = helix.length + sheet.length > 0;
    addFrames(m, frames);
    // bonds: distance-based, plus CONECT for hetero groups
    C.perceiveBonds(m);
    const nbd = m.atoms.length;
    for (const p of conect) for (let k = 1; k < p.length; k++) { const a = serial.get(p[0]), b = serial.get(p[k]); if (a != null && b != null && m.atoms[a].het) m.addBond(a, b, 1); }
    if (nbd < 60000) C.perceiveOrders(m);
    return finalize(m);
  }
  function writePDB(m) {
    const out = ['REMARK  Written by MoleculeScale'];
    if (m.cell) out.push('CRYST1' + [m.cell.a, m.cell.b, m.cell.c].map((v) => v.toFixed(3).padStart(9)).join('') + [m.cell.al, m.cell.be, m.cell.ga].map((v) => v.toFixed(2).padStart(7)).join('') + ' P 1           1');
    const cnt = {};
    m.atoms.forEach((a, i) => {
      const r = a.r >= 0 ? m.res[a.r] : null; const sym = EL[a.e].sym;
      cnt[sym] = (cnt[sym] || 0) + 1;
      let nm = a.nm || (sym + cnt[sym]); nm = nm.slice(0, 4);
      const nmf = nm.length < 4 && sym.length === 1 ? ' ' + nm.padEnd(3) : nm.padEnd(4);
      const rec = !r || r.het || !r.aa && !r.nuc ? 'HETATM' : 'ATOM  ';
      out.push(rec + String((i + 1) % 100000).padStart(5) + ' ' + nmf + ' ' + (r ? r.name : 'UNL').padStart(3) + ' ' + (r ? r.chain : 'A') + String(r ? r.num % 10000 : 1).padStart(4) + '    ' + [a.x, a.y, a.z].map((v) => v.toFixed(3).padStart(8)).join('') + '  1.00' + (a.b || 0).toFixed(2).padStart(6) + '          ' + sym.toUpperCase().padStart(2) + (a.q ? Math.abs(a.q) + (a.q > 0 ? '+' : '-') : '  '));
    });
    const hetero = m.bonds.filter((b) => { const ra = m.atoms[b.a].r, rb = m.atoms[b.b].r; return ra < 0 || m.res[ra].het || !m.res[ra].aa; });
    const byAtom = new Map(); hetero.forEach((b) => { (byAtom.get(b.a) || byAtom.set(b.a, []).get(b.a)).push(b.b); (byAtom.get(b.b) || byAtom.set(b.b, []).get(b.b)).push(b.a); });
    byAtom.forEach((l, a) => { out.push('CONECT' + String(a + 1).padStart(5) + l.slice(0, 4).map((x) => String(x + 1).padStart(5)).join('')); });
    out.push('END');
    return out.join('\n') + '\n';
  }

  /* ---------- CML ---------- */
  function readCML(text) {
    const doc = new DOMParser().parseFromString(text, 'text/xml');
    if (doc.querySelector('parsererror')) throw new Error('CML: invalid XML');
    const m = new MS.Mol(), ids = new Map();
    const atoms = [...doc.getElementsByTagName('atom')];
    if (!atoms.length) throw new Error('CML: no atoms');
    const cp = {}; [...doc.getElementsByTagName('scalar')].forEach((s) => { const t = s.getAttribute('title'); if (t) cp[t] = num(s.textContent); });
    const cellEl = doc.getElementsByTagName('crystal')[0];
    if (cellEl) { const sc = [...cellEl.getElementsByTagName('scalar')].map((s) => num(s.textContent)); if (sc.length >= 6) m.cell = { a: sc[0], b: sc[1], c: sc[2], al: sc[3], be: sc[4], ga: sc[5] }; }
    atoms.forEach((a) => {
      const z = MS.zOf(a.getAttribute('elementType')); if (!z) return;
      let x = num(a.getAttribute('x3')), y = num(a.getAttribute('y3')), zz = num(a.getAttribute('z3'));
      if (isNaN(x)) { x = num(a.getAttribute('x2')) || 0; y = num(a.getAttribute('y2')) || 0; zz = 0; }
      ids.set(a.getAttribute('id'), m.addAtom(z, x, y, zz, { q: parseInt(a.getAttribute('formalCharge') || '0', 10) }));
    });
    [...doc.getElementsByTagName('bond')].forEach((b) => {
      const r = (b.getAttribute('atomRefs2') || '').trim().split(/\s+/); const a = ids.get(r[0]), c = ids.get(r[1]); if (a == null || c == null) return;
      const o = b.getAttribute('order'); m.addBond(a, c, o === 'A' || o === '2' || o === 'D' ? 2 : o === '3' || o === 'T' ? 3 : 1);
    });
    if (!m.bonds.length) { C.perceiveBonds(m); C.perceiveOrders(m); }
    m.title = (doc.documentElement.getAttribute('title') || '');
    return m;
  }
  function writeCML(m) {
    const esc = (s) => String(s).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
    let s = '<?xml version="1.0" encoding="UTF-8"?>\n<molecule xmlns="http://www.xml-cml.org/schema" title="' + esc(m.title || '') + '">\n';
    if (m.cell) s += '  <crystal>\n' + ['a', 'b', 'c', 'al', 'be', 'ga'].map((k, i) => '    <scalar title="' + ['a', 'b', 'c', 'alpha', 'beta', 'gamma'][i] + '" units="' + (i < 3 ? 'units:angstrom' : 'units:degree') + '">' + m.cell[k] + '</scalar>').join('\n') + '\n  </crystal>\n';
    s += '  <atomArray>\n' + m.atoms.map((a, i) => '    <atom id="a' + (i + 1) + '" elementType="' + EL[a.e].sym + '"' + (a.q ? ' formalCharge="' + a.q + '"' : '') + ' x3="' + a.x.toFixed(5) + '" y3="' + a.y.toFixed(5) + '" z3="' + a.z.toFixed(5) + '"/>').join('\n') + '\n  </atomArray>\n';
    s += '  <bondArray>\n' + m.bonds.map((b) => '    <bond atomRefs2="a' + (b.a + 1) + ' a' + (b.b + 1) + '" order="' + b.o + '"/>').join('\n') + '\n  </bondArray>\n</molecule>\n';
    return s;
  }

  /* ---------- CIF ---------- */
  function tokenizeCif(text) {
    const toks = [];
    text.split(/\r?\n/).forEach((l) => {
      if (l.startsWith(';')) { toks.push({ t: 'text', v: l.slice(1) }); return; }
      const re = /'([^']*)'|"([^"]*)"|(\S+)/g; let mm;
      const c = l.replace(/(^|\s)#.*$/, '');
      while ((mm = re.exec(c))) toks.push({ t: 'tok', v: mm[1] !== undefined ? mm[1] : mm[2] !== undefined ? mm[2] : mm[3] });
    });
    return toks.map((x) => x.v);
  }
  function parseOp(str) {
    const comps = str.replace(/\s+/g, '').toLowerCase().split(',');
    if (comps.length !== 3) return null;
    const rows = comps.map((c) => {
      const r = [0, 0, 0, 0];
      (c.match(/[+-]?[^+-]+/g) || []).forEach((t) => {
        let sg = 1; if (t[0] === '+') t = t.slice(1); else if (t[0] === '-') { sg = -1; t = t.slice(1); }
        const ax = /[xyz]/.exec(t);
        const val = (s) => { if (!s) return 1; if (s.includes('/')) { const [a, b] = s.split('/'); return num(a) / num(b); } return num(s); };
        if (ax) { r['xyz'.indexOf(ax[0])] += sg * val(t.replace(/\*?[xyz].*/, '')); } else r[3] += sg * val(t);
      });
      return r;
    });
    return (x, y, z) => rows.map((r) => r[0] * x + r[1] * y + r[2] * z + r[3]);
  }
  function cellMatrix(c) {
    const d = Math.PI / 180, ca = Math.cos(c.al * d), cb = Math.cos(c.be * d), cg = Math.cos(c.ga * d), sg = Math.sin(c.ga * d);
    const ax = [c.a, 0, 0], bx = [c.b * cg, c.b * sg, 0];
    const cx = c.c * cb, cy = c.c * (ca - cb * cg) / sg, cz = Math.sqrt(Math.max(0, c.c * c.c - cx * cx - cy * cy));
    return [ax, bx, [cx, cy, cz]];
  }
  MS.cellMatrix = cellMatrix;
  function readCIF(text) {
    const lines = text.split(/\r?\n/); const cell = {}; const ops = []; let loopCols = null, rows = [];
    const sites = []; let colIdx = null;
    const val = (s) => num(String(s).replace(/\(.*\)/, ''));
    let i = 0;
    const handleLoop = (cols, data) => {
      const col = (n) => cols.indexOf(n);
      const w = cols.length;
      if (cols.some((c) => /symop_operation_xyz|symmetry_equiv_pos_as_xyz/.test(c))) { const k = cols.findIndex((c) => /symop_operation_xyz|symmetry_equiv_pos_as_xyz/.test(c)); for (let r = 0; r + w <= data.length; r += w) ops.push(data[r + k]); }
      if (col('_atom_site_fract_x') >= 0) {
        const kl = col('_atom_site_label'), kt = col('_atom_site_type_symbol'), kx = col('_atom_site_fract_x'), ky = col('_atom_site_fract_y'), kz = col('_atom_site_fract_z'), ko = col('_atom_site_occupancy');
        for (let r = 0; r + w <= data.length; r += w) {
          const lab = data[r + (kt >= 0 ? kt : kl)] || ''; const z = MS.zOf(lab.replace(/[^A-Za-z]/g, '').slice(0, 2)) || MS.zOf(lab.replace(/[^A-Za-z]/g, '').slice(0, 1));
          if (z) sites.push({ z, f: [val(data[r + kx]), val(data[r + ky]), val(data[r + kz])], label: data[r + kl] || lab });
        }
      }
    };
    const toks = []; // flatten with loop awareness
    let k = 0;
    const src = lines.map((l) => l.replace(/(^|\s)#.*$/, ''));
    while (k < src.length) {
      const l = src[k].trim();
      if (l.startsWith('_cell_')) { const p = l.split(/\s+/); const key = p[0].replace('_cell_', ''); cell[key] = val(p[1]); k++; continue; }
      if (l === 'loop_') {
        k++; const cols = []; while (k < src.length && src[k].trim().startsWith('_')) { cols.push(src[k].trim().split(/\s+/)[0]); k++; }
        const data = []; while (k < src.length) { const t = src[k].trim(); if (t.startsWith('_') || t === 'loop_' || t.startsWith('data_')) break; if (t) { const re = /'([^']*)'|"([^"]*)"|(\S+)/g; let mm; while ((mm = re.exec(t))) data.push(mm[1] !== undefined ? mm[1] : mm[2] !== undefined ? mm[2] : mm[3]); } k++; }
        handleLoop(cols, data); continue;
      }
      if (/^_(symmetry_equiv_pos_as_xyz|space_group_symop_operation_xyz)/.test(l)) { ops.push(l.replace(/^\S+\s+/, '').replace(/['"]/g, '')); }
      k++;
    }
    if (!(cell.length_a > 0) || !sites.length) throw new Error('CIF: no cell or atom sites found');
    const cl = { a: cell.length_a, b: cell.length_b, c: cell.length_c, al: cell.angle_alpha || 90, be: cell.angle_beta || 90, ga: cell.angle_gamma || 90 };
    const fns = ops.map(parseOp).filter(Boolean); if (!fns.length) fns.push((x, y, z) => [x, y, z]);
    const M = cellMatrix(cl), m = new MS.Mol(); m.cell = cl; const seen = [];
    const wrap = (v) => v - Math.floor(v + 1e-6);
    sites.forEach((s) => fns.forEach((f) => {
      const p = f(s.f[0], s.f[1], s.f[2]).map(wrap);
      if (seen.some((q) => q.z === s.z && Math.abs(q.p[0] - p[0]) % 1 < 0.002 && Math.abs(q.p[1] - p[1]) % 1 < 0.002 && Math.abs(q.p[2] - p[2]) % 1 < 0.002)) return;
      seen.push({ z: s.z, p });
      m.addAtom(s.z, p[0] * M[0][0] + p[1] * M[1][0] + p[2] * M[2][0], p[0] * M[0][1] + p[1] * M[1][1] + p[2] * M[2][1], p[0] * M[0][2] + p[1] * M[1][2] + p[2] * M[2][2], { nm: s.label });
    }));
    m.meta.crystal = true; C.perceiveBonds(m, { tol: 0.25 });
    return m;
  }
  function writeCIF(m) {
    const c = m.cell || { a: 20, b: 20, c: 20, al: 90, be: 90, ga: 90 };
    const M = cellMatrix(c);
    // inverse of the 3x3 lattice
    const [a, b, d] = M; const det = a[0] * (b[1] * d[2] - b[2] * d[1]) - a[1] * (b[0] * d[2] - b[2] * d[0]) + a[2] * (b[0] * d[1] - b[1] * d[0]);
    const inv = [
      [(b[1] * d[2] - b[2] * d[1]) / det, (a[2] * d[1] - a[1] * d[2]) / det, (a[1] * b[2] - a[2] * b[1]) / det],
      [(b[2] * d[0] - b[0] * d[2]) / det, (a[0] * d[2] - a[2] * d[0]) / det, (a[2] * b[0] - a[0] * b[2]) / det],
      [(b[0] * d[1] - b[1] * d[0]) / det, (a[1] * d[0] - a[0] * d[1]) / det, (a[0] * b[1] - a[1] * b[0]) / det]];
    let s = 'data_moleculescale\n_symmetry_space_group_name_H-M \'P 1\'\n_cell_length_a ' + c.a.toFixed(4) + '\n_cell_length_b ' + c.b.toFixed(4) + '\n_cell_length_c ' + c.c.toFixed(4) + '\n_cell_angle_alpha ' + c.al.toFixed(3) + '\n_cell_angle_beta ' + c.be.toFixed(3) + '\n_cell_angle_gamma ' + c.ga.toFixed(3) + '\nloop_\n_symmetry_equiv_pos_as_xyz\n\'x, y, z\'\nloop_\n_atom_site_label\n_atom_site_type_symbol\n_atom_site_fract_x\n_atom_site_fract_y\n_atom_site_fract_z\n';
    const cnt = {};
    m.atoms.forEach((at) => {
      const sym = EL[at.e].sym; cnt[sym] = (cnt[sym] || 0) + 1;
      const f = [0, 1, 2].map((j) => at.x * inv[0][j] + at.y * inv[1][j] + at.z * inv[2][j]);
      s += sym + cnt[sym] + ' ' + sym + ' ' + f.map((v) => v.toFixed(6)).join(' ') + '\n';
    });
    return s;
  }

  /* ---------- Gaussian cube ---------- */
  function readCube(text) {
    const L = text.split(/\r?\n/); let p = 2;
    const h = L[p++].trim().split(/\s+/).map(Number); let na = h[0]; const origin = h.slice(1, 4);
    const dims = [], axes = [];
    for (let i = 0; i < 3; i++) { const t = L[p++].trim().split(/\s+/).map(Number); dims.push(t[0]); axes.push(t.slice(1, 4).map((v) => v * (t[0] > 0 ? BOHR : 1))); }
    const m = new MS.Mol(); m.title = (L[0] || '').trim();
    const scale = dims[0] > 0 ? BOHR : 1;
    for (let i = 0; i < Math.abs(na); i++) { const t = L[p++].trim().split(/\s+/).map(Number); m.addAtom(t[0], t[2] * scale, t[3] * scale, t[4] * scale); }
    if (na < 0) p++;
    const n = Math.abs(dims[0] * dims[1] * dims[2]); const data = new Float32Array(n); let k = 0;
    for (; p < L.length && k < n; p++) { const t = L[p].trim(); if (!t) continue; for (const w of t.split(/\s+/)) { if (k < n) data[k++] = parseFloat(w); } }
    m.vol = { nx: Math.abs(dims[0]), ny: Math.abs(dims[1]), nz: Math.abs(dims[2]), origin: origin.map((v) => v * scale), axes, data };
    C.perceiveBonds(m); C.perceiveOrders(m);
    return m;
  }

  /* ---------- detect + dispatch ---------- */
  function looksLikeSmiles(t) { const s = t.trim(); return s.length > 0 && s.length < 600 && !/\s{2,}/.test(s) && /^[A-Za-z0-9@+\-\[\]\(\)=#$:\/\\%.]+(\s+\S+)?$/.test(s.split('\n')[0]) && !/^\d+\s*$/.test(s.split('\n')[0]); }
  function detect(name, text) {
    const ext = (name || '').toLowerCase().split('.').pop();
    const map = { xyz: 'xyz', mol: 'mol', sdf: 'sdf', sd: 'sdf', pdb: 'pdb', ent: 'pdb', cml: 'cml', cif: 'cif', cube: 'cube', cub: 'cube', smi: 'smiles', smiles: 'smiles', moleculescale: 'json', json: 'json' };
    if (map[ext]) return map[ext];
    if (/^\s*\{/.test(text)) return 'json';
    if (/^(ATOM|HETATM|HEADER|REMARK|CRYST1|MODEL|TITLE|COMPND)/m.test(text)) return 'pdb';
    if (/V2000|V3000/.test(text.split('\n')[3] || '')) return 'mol';
    if (/\$\$\$\$/.test(text)) return 'sdf';
    if (/<cml|<molecule/i.test(text)) return 'cml';
    if (/^_cell_length_a|^data_/m.test(text) && /_atom_site/.test(text)) return 'cif';
    if (/^\s*\d+\s*\n/.test(text) && text.split('\n').length > 2) { const l3 = (text.split('\n')[2] || '').trim().split(/\s+/); if (l3.length >= 4 && !isNaN(num(l3[1]))) return 'xyz'; }
    if (looksLikeSmiles(text)) return 'smiles';
    return null;
  }
  function read(name, text) {
    const f = detect(name, text); if (!f) throw new Error('Unrecognised file format.');
    let m;
    switch (f) {
      case 'xyz': m = readXYZ(text); break;
      case 'mol': case 'sdf': m = readSDF(text); break;
      case 'pdb': m = readPDB(text); break;
      case 'cml': m = readCML(text); break;
      case 'cif': m = readCIF(text); break;
      case 'cube': m = readCube(text); break;
      case 'smiles': { const line = text.trim().split(/\r?\n/)[0].trim().split(/\s+/); m = MS.smiles.fromSmiles(line[0]); if (line[1]) m.title = line.slice(1).join(' '); break; }
      case 'json': return { scene: JSON.parse(text) };
    }
    if (!m.title && name) m.title = name.replace(/\.[^.]+$/, '');
    if (f !== 'pdb') finalize(m);
    return { mol: m, format: f };
  }
  function write(m, fmt) {
    switch (fmt) {
      case 'xyz': return writeXYZFrames(m);
      case 'mol': case 'sdf': return writeMol(m) + (fmt === 'sdf' ? '$$$$\n' : '');
      case 'pdb': return writePDB(m);
      case 'cml': return writeCML(m);
      case 'cif': return writeCIF(m);
      case 'smiles': return MS.smiles.toSmiles(m) + (m.title && m.title.length < 60 ? '\t' + m.title : '') + '\n';
    }
    throw new Error('Unknown format');
  }

  MS.io = { read, write, detect, finalize, readPDB, readXYZ, readSDF, estimateSS, cellMatrix };
})();
