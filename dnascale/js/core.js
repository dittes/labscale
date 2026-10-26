/* DNAScale core: sequence utilities, file parsers/writers, analysis, aligners. No DOM. */
(function () {
  'use strict';
  const BW = (globalThis.BW = globalThis.BW || {});

  /* ---------- basics ---------- */
  let _uid = 0;
  BW.uid = () => 's' + (++_uid).toString(36) + Math.random().toString(36).slice(2, 5);

  const COMP = { A: 'T', C: 'G', G: 'C', T: 'A', U: 'A', R: 'Y', Y: 'R', K: 'M', M: 'K', S: 'S', W: 'W', B: 'V', V: 'B', D: 'H', H: 'D', N: 'N', '-': '-', '.': '.', '*': '*' };
  BW.revcomp = (s) => { let o = ''; for (let i = s.length - 1; i >= 0; i--) o += COMP[s[i]] || s[i]; return o; };
  BW.complementBase = (c) => COMP[c] || c;

  BW.guessType = (s) => {
    const t = s.replace(/[-\s*.]/g, '').toUpperCase();
    if (!t.length) return 'dna';
    let acgt = 0, amb = 0;
    for (let i = 0; i < t.length; i++) {
      const c = t[i];
      if ('ACGTUN'.includes(c)) acgt++; else if ('RYKMSWBDHV'.includes(c)) amb++;
    }
    return acgt / t.length > 0.85 && (acgt + amb) / t.length > 0.95 ? 'dna' : 'protein';
  };

  const IUPAC = { A: 'A', C: 'C', G: 'G', T: 'T', R: 'AG', Y: 'CT', S: 'CG', W: 'AT', K: 'GT', M: 'AC', B: 'CGT', D: 'AGT', H: 'ACT', V: 'ACG', N: 'ACGT' };
  const IUPAC_REV = { A: 'A', C: 'C', G: 'G', T: 'T', AG: 'R', CT: 'Y', CG: 'S', AT: 'W', GT: 'K', AC: 'M', CGT: 'B', AGT: 'D', ACT: 'H', ACG: 'V', ACGT: 'N' };
  BW.IUPAC = IUPAC;
  BW.iupacFor = (set) => IUPAC_REV[[...new Set(set)].sort().join('')] || 'N';

  /* ---------- Phred / trimming ---------- */
  BW.trimByQuality = (qual, q = 20) => {
    // Richard Mott's modified algorithm: maximise sum(cutoff - p_err) over a window.
    const cutoff = Math.pow(10, -q / 10);
    let best = 0, cur = 0, start = 0, bs = 0, be = 0;
    for (let i = 0; i < qual.length; i++) {
      cur += cutoff - Math.pow(10, -qual[i] / 10);
      if (cur <= 0) { cur = 0; start = i + 1; }
      else if (cur > best) { best = cur; bs = start; be = i + 1; }
    }
    return [bs, be];
  };

  /* ---------- ABIF (.ab1 / .abi) ---------- */
  BW.parseABIF = (buf, name) => {
    const u8 = new Uint8Array(buf);
    let base = -1;
    for (const off of [0, 128]) {
      if (u8[off] === 65 && u8[off + 1] === 66 && u8[off + 2] === 73 && u8[off + 3] === 70) { base = off; break; }
    }
    if (base < 0) throw new Error('Not an ABIF trace file');
    const dv = new DataView(buf, base);
    const n = dv.getInt32(18), dirOff = dv.getInt32(26);
    const str = (o, l) => { let s = ''; for (let i = 0; i < l; i++) s += String.fromCharCode(dv.getUint8(o + i)); return s; };
    const dir = {};
    for (let i = 0; i < n; i++) {
      const p = dirOff + i * 28;
      const e = { name: str(p, 4), number: dv.getInt32(p + 4), type: dv.getInt16(p + 8), elemSize: dv.getInt16(p + 10), num: dv.getInt32(p + 12), size: dv.getInt32(p + 16) };
      e.pos = e.size <= 4 ? p + 20 : dv.getInt32(p + 20);
      dir[e.name + e.number] = e;
    }
    const get = (tag, no) => {
      const e = dir[tag + no];
      if (!e) return undefined;
      const { pos, num, type } = e;
      switch (type) {
        case 1: { const a = new Uint8Array(num); for (let i = 0; i < num; i++) a[i] = dv.getUint8(pos + i); return a; }
        case 2: return str(pos, e.size);
        case 4: { const a = new Int16Array(num); for (let i = 0; i < num; i++) a[i] = dv.getInt16(pos + i * 2); return a; }
        case 5: { const a = new Int32Array(num); for (let i = 0; i < num; i++) a[i] = dv.getInt32(pos + i * 4); return a; }
        case 7: { const a = new Float32Array(num); for (let i = 0; i < num; i++) a[i] = dv.getFloat32(pos + i * 4); return a; }
        case 18: return str(pos + 1, dv.getUint8(pos));
        case 19: { let s = '', i = 0; while (i < e.size && dv.getUint8(pos + i)) s += String.fromCharCode(dv.getUint8(pos + i++)); return s; }
        case 10: return dv.getInt16(pos) + '-' + String(dv.getUint8(pos + 2)).padStart(2, '0') + '-' + String(dv.getUint8(pos + 3)).padStart(2, '0');
        case 11: return [4, 5, 6].map((k) => String(dv.getUint8(pos + k - 4)).padStart(2, '0')).join(':');
        default: return undefined;
      }
    };
    const fwo = (get('FWO_', 1) || 'GATC').toUpperCase().slice(0, 4);
    const ch = {};
    for (let i = 0; i < 4; i++) {
      const d = get('DATA', 9 + i) || get('DATA', 1 + i);
      if (!d) throw new Error('Trace data missing (DATA' + (9 + i) + ')');
      ch[fwo[i]] = d;
    }
    for (const b of 'ACGT') if (!ch[b]) throw new Error('Unsupported dye order: ' + fwo);
    const bases = (get('PBAS', 2) || get('PBAS', 1) || '').toUpperCase();
    const ploc = get('PLOC', 2) || get('PLOC', 1) || new Int16Array(0);
    const peaks = new Int32Array(ploc.length);
    for (let i = 0; i < ploc.length; i++) peaks[i] = ploc[i] & 0xffff;
    let qual = get('PCON', 2) || get('PCON', 1);
    if (typeof qual === 'string') qual = Uint8Array.from(qual, (c) => c.charCodeAt(0));
    if (!qual || qual.length !== bases.length) qual = new Uint8Array(bases.length).fill(20);
    let qualEstimated = false;
    if (!qual.some((v) => v > 0)) { qual = BW.estimateQuality(bases, peaks, ch); qualEstimated = true; }
    const sample = get('SMPL', 1) || '';
    const meta = {
      Sample: sample, Instrument: get('MODL', 1) || get('MCHN', 1), 'Run date': get('RUND', 1), Lane: get('LANE', 1),
      'Dye set': get('DySN', 1), 'Basecaller': get('SVER', 2) || get('SVER', 1), 'Avg spacing': (get('SPAC', 1) || [])[0],
      'Run name': get('RUNN', 1), 'Comment': get('CMNT', 1) || get('CMT', 1),
    };
    for (const k of Object.keys(meta)) if (meta[k] === undefined || meta[k] === '') delete meta[k];
    if (meta['Avg spacing']) meta['Avg spacing'] = (+meta['Avg spacing']).toFixed(2);
    return BW.makeTrace({ name: name || sample || 'trace', sample, bases, qual, peaks, ch, meta, qualEstimated });
  };


  // For files that carry no Phred values: estimate from peak purity and height.
  BW.estimateQuality = (bases, peaks, ch) => {
    const tmp = BW.makeTrace({ bases, qual: new Uint8Array(bases.length), peaks, ch, meta: {} }), mix = BW.mixRatios(tmp);
    const q = new Uint8Array(bases.length);
    for (let i = 0; i < bases.length; i++) {
      if (!'ACGT'.includes(bases[i])) { q[i] = 2; continue; }
      const h = ch[bases[i]][peaks[i]] || 0, hf = Math.min(1, h / (tmp.max * 0.12));
      q[i] = Math.max(3, Math.min(60, Math.round(60 * (1 - 1.7 * mix[i]) * hf)));
    }
    return q;
  };

  /* ---------- SCF (Standard Chromatogram Format, v2 / v3) ---------- */
  BW.parseSCF = (buf, name) => {
    const dv = new DataView(buf), u32 = (o) => dv.getUint32(o);
    if (u32(0) !== 0x2e736366) throw new Error('Not an SCF file');
    const nS = u32(4), sOff = u32(8), nB = u32(12), bOff = u32(24), cSize = u32(28), cOff = u32(32);
    let ver = ''; for (let i = 36; i < 40; i++) ver += String.fromCharCode(dv.getUint8(i));
    const v3 = parseFloat(ver) >= 3, sSize = dv.getUint32(40) || 2;
    const ch = { A: new Int16Array(nS), C: new Int16Array(nS), G: new Int16Array(nS), T: new Int16Array(nS) };
    const rd = (o) => (sSize === 1 ? dv.getUint8(o) : dv.getUint16(o));
    const order = ['A', 'C', 'G', 'T'];
    if (v3) {
      for (let k = 0; k < 4; k++) {
        const a = new Int32Array(nS);
        for (let i = 0; i < nS; i++) a[i] = rd(sOff + (k * nS + i) * sSize);
        for (let pass = 0; pass < 2; pass++) { let p = 0; for (let i = 0; i < nS; i++) { a[i] = (a[i] + p) & (sSize === 1 ? 0xff : 0xffff); p = a[i]; } }
        for (let i = 0; i < nS; i++) ch[order[k]][i] = a[i];
      }
    } else {
      for (let i = 0; i < nS; i++) for (let k = 0; k < 4; k++) ch[order[k]][i] = rd(sOff + (i * 4 + k) * sSize);
    }
    const peaks = new Int32Array(nB); let qual = new Uint8Array(nB), bases = '';
    if (v3) {
      for (let i = 0; i < nB; i++) {
        peaks[i] = u32(bOff + i * 4);
        const c = String.fromCharCode(dv.getUint8(bOff + nB * 8 + i)).toUpperCase(); bases += c;
        const k = order.indexOf(c); qual[i] = k >= 0 ? dv.getUint8(bOff + nB * (4 + k) + i) : 0;
      }
    } else {
      for (let i = 0; i < nB; i++) {
        const o = bOff + i * 12; peaks[i] = u32(o);
        const c = String.fromCharCode(dv.getUint8(o + 8)).toUpperCase(); bases += c;
        const k = order.indexOf(c); qual[i] = k >= 0 ? dv.getUint8(o + 4 + k) : 0;
      }
    }
    const meta = {};
    if (cSize) {
      let txt = ''; for (let i = 0; i < cSize; i++) { const b = dv.getUint8(cOff + i); if (b) txt += String.fromCharCode(b); }
      const nice = { NAME: 'Sample', LANE: 'Lane', MACH: 'Instrument', DATE: 'Run date', DYEP: 'Dye set', BCAL: 'Basecaller', SPAC: 'Avg spacing' };
      for (const line of txt.split('\n')) { const m = line.match(/^(\w+)=(.*)$/); if (m && nice[m[1]]) meta[nice[m[1]]] = m[2].trim(); }
    }
    bases = bases.replace(/[-.]/g, 'N');
    let qualEstimated = false;
    if (!qual.some((v) => v > 0)) { qual = BW.estimateQuality(bases, peaks, ch); qualEstimated = true; }
    return BW.makeTrace({ name: name || 'trace', sample: meta.Sample || '', bases, qual, peaks, ch, meta, qualEstimated });
  };

  BW.parseTrace = (buf, name) => {
    const b = new Uint8Array(buf, 0, 4), s = String.fromCharCode(...b);
    return s === '.scf' ? BW.parseSCF(buf, name) : BW.parseABIF(buf, name);
  };

  BW.makeTrace = (t) => {
    let n = 0, max = 1;
    for (const b of 'ACGT') { n = Math.max(n, t.ch[b].length); }
    for (const b of 'ACGT') { const a = t.ch[b]; for (let i = 0; i < a.length; i++) if (a[i] > max) max = a[i]; }
    t.nSamples = n; t.max = max;
    t.edited = t.edited || new Set();
    t.origBases = t.origBases || t.bases;
    return t;
  };

  // Ratio of 2nd to 1st highest channel at each base call (for mixed-peak flagging)
  BW.mixRatios = (t) => {
    if (t._mix) return t._mix;
    const m = new Float32Array(t.bases.length);
    const floor = t.max * 0.04;
    for (let i = 0; i < m.length; i++) {
      const p = t.peaks[i]; let a = 0, b = 0;
      for (const c of 'ACGT') {
        const arr = t.ch[c]; let v = 0;
        for (let k = -1; k <= 1; k++) { const x = arr[p + k]; if (x > v) v = x; }
        if (v > a) { b = a; a = v; } else if (v > b) b = v;
      }
      m[i] = a > floor ? b / a : 0;
    }
    return (t._mix = m);
  };

  // Base with the second-highest signal at a base call (for heterozygous / mixed peaks)
  BW.secondBase = (t, i) => {
    const p = t.peaks[i]; let a = '', av = 0, b = '', bv = 0;
    for (const ch of 'ACGT') {
      const arr = t.ch[ch]; let v = 0;
      for (let k = -1; k <= 1; k++) { const x = arr[p + k]; if (x > v) v = x; }
      if (v > av) { b = a; bv = av; a = ch; av = v; } else if (v > bv) { b = ch; bv = v; }
    }
    return t.bases[i] === a ? b : a;
  };

  BW.revcompTrace = (t) => {
    const swap = { A: 'T', T: 'A', C: 'G', G: 'C' };
    const ch = {};
    for (const b of 'ACGT') ch[swap[b]] = t.ch[b].slice().reverse();
    const N = t.nSamples, L = t.bases.length;
    const peaks = new Int32Array(L), qual = new Uint8Array(L);
    for (let i = 0; i < L; i++) { peaks[i] = N - 1 - t.peaks[L - 1 - i]; qual[i] = t.qual[L - 1 - i]; }
    const edited = new Set([...t.edited].map((i) => L - 1 - i));
    return BW.makeTrace({ ...t, _mix: null, ch, peaks, qual, bases: BW.revcomp(t.bases), origBases: BW.revcomp(t.origBases), edited, flipped: !t.flipped });
  };

  /* ---------- text formats ---------- */
  const clean = (s) => s.replace(/[\s\d]/g, '').replace(/\./g, '-').toUpperCase();

  BW.parseFasta = (text) => {
    const out = [];
    if (!/^\s*>/m.test(text)) {
      const seq = clean(text.replace(/^;.*$/gm, ''));
      return seq ? [{ name: 'Pasted sequence', seq }] : [];
    }
    let cur = null;
    for (const line of text.split(/\r?\n/)) {
      if (line.startsWith('>')) {
        const h = line.slice(1).trim();
        cur = { name: h.split(/\s+/)[0] || 'sequence', desc: h.replace(/^\S+\s*/, ''), seq: '' };
        out.push(cur);
      } else if (cur) cur.seq += clean(line);
    }
    return out.filter((r) => r.seq.length);
  };

  BW.parseGenBank = (text) => {
    const out = [];
    for (const rec of text.split(/^\/\/\s*$/m)) {
      const locus = rec.match(/^LOCUS\s+(\S+)/m);
      if (!locus) continue;
      const def = (rec.match(/^DEFINITION\s+([\s\S]*?)(?=^\S)/m) || [, ''])[1].replace(/\s+/g, ' ').trim();
      const o = rec.split(/^ORIGIN.*$/m)[1];
      if (!o) continue;
      out.push({ name: locus[1], desc: def, seq: clean(o.replace(/[^a-zA-Z\s\d]/g, '')) });
    }
    return out;
  };

  BW.parseClustal = (text) => {
    const names = [], map = {};
    for (const line of text.split(/\r?\n/)) {
      if (!line.trim() || /^\s/.test(line) || /^(CLUSTAL|MUSCLE|MAFFT)/i.test(line)) continue;
      const m = line.match(/^(\S+)\s+([A-Za-z\-.*]+)(?:\s+\d+)?\s*$/);
      if (!m) continue;
      if (!(m[1] in map)) { map[m[1]] = ''; names.push(m[1]); }
      map[m[1]] += m[2].replace(/\./g, '-').toUpperCase();
    }
    return names.map((n) => ({ name: n, seq: map[n] }));
  };

  BW.parseAnyText = (text, filename = '') => {
    if (/^\s*(CLUSTAL|MUSCLE)/i.test(text)) return BW.parseClustal(text);
    if (/^LOCUS\s/m.test(text)) return BW.parseGenBank(text);
    return BW.parseFasta(text);
  };

  BW.toFasta = (items, width = 70) => items.map((s) => {
    const body = width ? s.seq.replace(new RegExp('(.{' + width + '})', 'g'), '$1\n').replace(/\n$/, '') : s.seq;
    return '>' + s.name + '\n' + body + '\n';
  }).join('');

  BW.toClustal = (items, width = 60) => {
    if (!items.length) return '';
    const pad = Math.max(...items.map((s) => s.name.length)) + 4;
    let out = 'CLUSTAL W multiple sequence alignment (exported from DNAScale)\n\n';
    const L = items[0].seq.length;
    for (let i = 0; i < L; i += width) {
      for (const s of items) out += s.name.padEnd(pad) + s.seq.slice(i, i + width) + '\n';
      out += '\n';
    }
    return out;
  };

  /* ---------- column statistics ---------- */
  BW.columnStats = (rows, type, threshold = 0.5) => {
    const n = rows.length, L = n ? rows[0].length : 0;
    const cons = new Array(L), ident = new Float32Array(L), gapFrac = new Float32Array(L);
    for (let c = 0; c < L; c++) {
      const cnt = {}; let ng = 0;
      for (let r = 0; r < n; r++) {
        const ch = rows[r][c];
        if (ch === '-' || ch === ' ' || ch === undefined) continue;
        cnt[ch] = (cnt[ch] || 0) + 1; ng++;
      }
      gapFrac[c] = n ? 1 - ng / n : 0;
      if (!ng) { cons[c] = '-'; continue; }
      let top = '', tc = 0;
      for (const k in cnt) if (cnt[k] > tc) { tc = cnt[k]; top = k; }
      ident[c] = tc / n;
      if (ng / n < 0.5) cons[c] = '-';
      else if (tc / ng >= threshold) cons[c] = top;
      else if (type === 'dna') {
        const set = Object.keys(cnt).filter((k) => 'ACGT'.includes(k) && cnt[k] / ng >= 0.2);
        cons[c] = set.length ? BW.iupacFor(set) : 'N';
      } else cons[c] = 'X';
    }
    return { cons: cons.join(''), ident, gapFrac };
  };

  /* ---------- translation / ORFs ---------- */
  const codonTables = {};
  BW.codonTable = (id = 1) => {
    if (codonTables[id]) return codonTables[id];
    const g = BW.GCODES[id] || BW.GCODES[1];
    const B = 'TCAG', map = {}, starts = new Set();
    for (let i = 0; i < 64; i++) {
      const cod = B[i >> 4] + B[(i >> 2) & 3] + B[i & 3];
      map[cod] = g.aa[i];
      if (g.starts[i] === 'M') starts.add(cod);
    }
    return (codonTables[id] = { map, starts, name: g.name });
  };

  BW.translate = (seq, id = 1, frame = 0, toStop = false) => {
    const t = BW.codonTable(id).map; let o = '';
    seq = seq.replace(/U/g, 'T');
    for (let i = frame; i + 3 <= seq.length; i += 3) {
      const a = t[seq.substr(i, 3)] || 'X';
      if (toStop && a === '*') break;
      o += a;
    }
    return o;
  };

  BW.findOrfs = (seq, id = 1, minAA = 30) => {
    seq = seq.replace(/-/g, '').toUpperCase();
    const { map, starts } = BW.codonTable(id), L = seq.length, res = [];
    for (const strand of [1, -1]) {
      const s = strand === 1 ? seq : BW.revcomp(seq);
      for (let f = 0; f < 3; f++) {
        let st = -1;
        for (let i = f; i + 3 <= L; i += 3) {
          const cod = s.substr(i, 3), aa = map[cod];
          if (st < 0 && starts.has(cod)) st = i;
          else if (st >= 0 && aa === '*') { push(st, i + 3); st = -1; }
        }
        if (st >= 0) push(st, f + Math.floor((L - f) / 3) * 3, true);
        function push(a, b, open) {
          if ((b - a) / 3 - (open ? 0 : 1) < minAA) return;
          const prot = BW.translate(s.slice(a, b), id, 0);
          const start = strand === 1 ? a + 1 : L - b + 1, end = strand === 1 ? b : L - a;
          res.push({ strand, frame: f + 1, start, end, aa: prot.replace(/\*$/, '').length, protein: prot, open: !!open });
        }
      }
    }
    return res.sort((x, y) => y.aa - x.aa);
  };

  /* ---------- restriction ---------- */
  const reCache = {};
  const patRe = (p) => reCache[p] || (reCache[p] = new RegExp('(?=(' + [...p].map((c) => { const s = IUPAC[c]; return s.length === 1 ? s : '[' + s + ']'; }).join('') + '))', 'g'));
  BW.findSites = (seq, enzymes = BW.ENZYMES) => {
    seq = seq.replace(/-/g, '').toUpperCase();
    const out = {};
    for (const [name, pat, top, bot] of enzymes) {
      const fixed = pat.replace(/N/g, '').length;
      if (fixed < 4) continue;
      const hits = [];
      const rc = BW.revcomp(pat), pal = rc === pat;
      const scan = (p, strand) => {
        const re = patRe(p); re.lastIndex = 0; let m;
        while ((m = re.exec(seq))) {
          if (m.index + p.length > seq.length) break;
          const cut = strand === 1 ? m.index + top : m.index + (p.length - top);
          hits.push({ enzyme: name, pos: m.index + 1, cut, strand, site: pat });
          re.lastIndex = m.index + 1;
        }
      };
      scan(pat, 1);
      if (!pal) scan(rc, -1);
      if (hits.length) out[name] = { name, site: pat, top, bot, overhang: bot < 0 ? 0 : bot - top, hits };
    }
    return out;
  };

  /* ---------- misc analysis ---------- */
  BW.gcContent = (s) => { s = s.replace(/[^A-Z]/g, ''); if (!s.length) return 0; let g = 0; for (const c of s) if (c === 'G' || c === 'C' || c === 'S') g++; return g / s.length; };
  BW.tm = (s) => {
    s = s.replace(/[^ACGT]/g, ''); const n = s.length; if (n < 8) return null;
    const gc = [...s].filter((c) => c === 'G' || c === 'C').length;
    return n < 14 ? 2 * (n - gc) + 4 * gc : 64.9 + (41 * (gc - 16.4)) / n;
  };
  BW.composition = (s) => { const c = {}; for (const ch of s) if (ch !== '-') c[ch] = (c[ch] || 0) + 1; return c; };
  BW.molWeightDNA = (s) => { const w = { A: 313.21, C: 289.18, G: 329.21, T: 304.2 }; let m = 18.015 - 61.96; for (const c of s) m += w[c] || 308; return m; };

  BW.identityMatrix = (rows, type) => {
    const n = rows.length, M = [];
    for (let i = 0; i < n; i++) M.push(new Float32Array(n));
    for (let i = 0; i < n; i++) {
      M[i][i] = 1;
      for (let j = i + 1; j < n; j++) {
        let same = 0, tot = 0; const a = rows[i], b = rows[j];
        for (let c = 0; c < a.length; c++) {
          const x = a[c], y = b[c];
          if (x === '-' || y === '-') continue;
          tot++; if (x === y) same++;
        }
        M[i][j] = M[j][i] = tot ? same / tot : 0;
      }
    }
    return M;
  };

  // Neighbour-joining (Saitou & Nei). dist: n×n array. Returns nested tree.
  BW.neighborJoining = (dist, names) => {
    let nodes = names.map((n, i) => ({ name: n, idx: i, len: 0 }));
    let D = dist.map((r) => Array.from(r));
    while (nodes.length > 2) {
      const n = nodes.length, r = D.map((row) => row.reduce((a, b) => a + b, 0));
      let bi = 0, bj = 1, best = Infinity;
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        const q = (n - 2) * D[i][j] - r[i] - r[j];
        if (q < best) { best = q; bi = i; bj = j; }
      }
      const dij = D[bi][bj];
      const li = Math.max(0, dij / 2 + (r[bi] - r[bj]) / (2 * (n - 2)));
      const lj = Math.max(0, dij - li);
      nodes[bi].len = li; nodes[bj].len = lj;
      const nn = { children: [nodes[bi], nodes[bj]], len: 0 };
      const nd = [];
      for (let k = 0; k < n; k++) if (k !== bi && k !== bj) nd.push((D[bi][k] + D[bj][k] - dij) / 2);
      const keep = [];
      for (let k = 0; k < n; k++) if (k !== bi && k !== bj) keep.push(k);
      const ND = keep.map((a) => keep.map((b) => D[a][b]));
      const newNodes = keep.map((k) => nodes[k]);
      ND.forEach((row, i) => row.push(nd[i]));
      ND.push([...nd, 0]);
      newNodes.push(nn); nodes = newNodes; D = ND;
    }
    if (nodes.length === 1) return nodes[0];
    const d = D[0][1];
    nodes[0].len = d / 2; nodes[1].len = d / 2;
    return { children: [nodes[0], nodes[1]], len: 0 };
  };

  /* =====================================================================
     Alignment engine: Gotoh affine-gap profile aligner + progressive MSA
     ===================================================================== */
  const AA = 'ARNDCQEGHILKMFPSTWYV';
  const scoring = (type) => {
    const idx = new Int8Array(128);
    let K, S, go, ge;
    if (type === 'dna') {
      K = 5; idx.fill(4);
      idx[65] = 0; idx[67] = 1; idx[71] = 2; idx[84] = 3; idx[85] = 3;
      S = new Float32Array(K * K);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) S[i * K + j] = i === j ? 5 : -4;
      go = -12; ge = -1.5;
    } else {
      K = 21; idx.fill(20);
      for (let i = 0; i < 20; i++) idx[AA.charCodeAt(i)] = i;
      const sym = AA + 'X';
      S = new Float32Array(K * K);
      for (let i = 0; i < K; i++) for (let j = 0; j < K; j++) S[i * K + j] = BW.BLOSUM62[sym[i] + sym[j]] ?? -1;
      go = -11; ge = -1;
    }
    return { K, idx, S, go, ge };
  };

  const mkProfile = (rows, sc) => {
    const n = rows.length, L = rows[0].length, f = new Float32Array(L * sc.K);
    for (let r = 0; r < n; r++) {
      const row = rows[r];
      for (let c = 0; c < L; c++) {
        const ch = row.charCodeAt(c);
        if (ch === 45) continue;
        f[c * sc.K + sc.idx[ch & 127]] += 1 / n;
      }
    }
    return { rows, L, f, n };
  };

  const NEG = -1e9;
  // Returns ops (0=both, 1=A-only [gap in B], 2=B-only [gap in A]) for aligning profile B onto A.
  const alignOps = (A, B, sc, endFree) => {
    const { K, S, go, ge } = sc, la = A.L, lb = B.L, W = lb + 1;
    const VA = new Float32Array(la * K);
    for (let i = 0; i < la; i++) for (let k = 0; k < K; k++) {
      const fa = A.f[i * K + k]; if (!fa) continue;
      for (let m = 0; m < K; m++) VA[i * K + m] += fa * S[k * K + m];
    }
    const tb = new Uint8Array((la + 1) * W);
    let Mp = new Float32Array(W), Xp = new Float32Array(W), Yp = new Float32Array(W);
    let Mc = new Float32Array(W), Xc = new Float32Array(W), Yc = new Float32Array(W);
    const colM = new Float32Array(la + 1), colX = new Float32Array(la + 1), colY = new Float32Array(la + 1);
    Mp[0] = 0; Xp[0] = NEG; Yp[0] = NEG;
    for (let j = 1; j <= lb; j++) { Mp[j] = NEG; Xp[j] = NEG; Yp[j] = endFree ? 0 : go + (j - 1) * ge; }
    colM[0] = 0; colX[0] = NEG; colY[0] = NEG;
    const fb = B.f;
    for (let i = 1; i <= la; i++) {
      Mc[0] = NEG; Yc[0] = NEG; Xc[0] = endFree ? 0 : go + (i - 1) * ge;
      const vo = (i - 1) * K, row = i * W;
      for (let j = 1; j <= lb; j++) {
        let s = 0; const bo = (j - 1) * K;
        for (let k = 0; k < K; k++) s += VA[vo + k] * fb[bo + k];
        // M
        let a = Mp[j - 1], b = Xp[j - 1], c = Yp[j - 1], pm = 0, best = a;
        if (b > best) { best = b; pm = 1; } if (c > best) { best = c; pm = 2; }
        Mc[j] = best + s;
        // X: consume A only (vertical)
        a = Mp[j] + go; b = Xp[j] + ge; c = Yp[j] + go; let px = 0; best = a;
        if (b > best) { best = b; px = 1; } if (c > best) { best = c; px = 2; }
        Xc[j] = best;
        // Y: consume B only (horizontal)
        a = Mc[j - 1] + go; b = Xc[j - 1] + go; c = Yc[j - 1] + ge; let py = 0; best = a;
        if (b > best) { best = b; py = 1; } if (c > best) { best = c; py = 2; }
        Yc[j] = best;
        tb[row + j] = pm | (px << 2) | (py << 4);
      }
      colM[i] = Mc[lb]; colX[i] = Xc[lb]; colY[i] = Yc[lb];
      let t = Mp; Mp = Mc; Mc = t; t = Xp; Xp = Xc; Xc = t; t = Yp; Yp = Yc; Yc = t;
    }
    // choose end cell (Mp/Xp/Yp now hold last row)
    let bi = la, bj = lb, bs = 0, bv = Mp[lb];
    if (Xp[lb] > bv) { bv = Xp[lb]; bs = 1; } if (Yp[lb] > bv) { bv = Yp[lb]; bs = 2; }
    if (endFree) {
      for (let j = 0; j < lb; j++) for (let s = 0; s < 3; s++) {
        const v = (s === 0 ? Mp : s === 1 ? Xp : Yp)[j];
        if (v > bv) { bv = v; bi = la; bj = j; bs = s; }
      }
      for (let i = 0; i < la; i++) for (let s = 0; s < 3; s++) {
        const v = (s === 0 ? colM : s === 1 ? colX : colY)[i];
        if (v > bv) { bv = v; bi = i; bj = lb; bs = s; }
      }
    }
    const ops = [];
    for (let j = lb; j > bj; j--) ops.push(2);
    for (let i = la; i > bi; i--) ops.push(1);
    let i = bi, j = bj, st = bs;
    while (i > 0 || j > 0) {
      if (i === 0) { ops.push(2); j--; continue; }
      if (j === 0) { ops.push(1); i--; continue; }
      const bits = tb[i * W + j];
      if (st === 0) { ops.push(0); st = bits & 3; i--; j--; }
      else if (st === 1) { ops.push(1); st = (bits >> 2) & 3; i--; }
      else { ops.push(2); st = (bits >> 4) & 3; j--; }
    }
    return { ops: ops.reverse(), score: bv };
  };

  const applyOps = (A, B, ops) => {
    const ra = A.rows.map(() => []), rb = B.rows.map(() => []);
    let i = 0, j = 0;
    for (const op of ops) {
      if (op === 0) { A.rows.forEach((r, k) => ra[k].push(r[i])); B.rows.forEach((r, k) => rb[k].push(r[j])); i++; j++; }
      else if (op === 1) { A.rows.forEach((r, k) => ra[k].push(r[i])); B.rows.forEach((r, k) => rb[k].push('-')); i++; }
      else { A.rows.forEach((r, k) => ra[k].push('-')); B.rows.forEach((r, k) => rb[k].push(r[j])); j++; }
    }
    return [ra.map((a) => a.join('')), rb.map((a) => a.join(''))];
  };

  const kmerSets = (seqs, type) => {
    const k = type === 'dna' ? 6 : 3, base = type === 'dna' ? 4 : 20, size = Math.pow(base, k);
    const map = type === 'dna' ? { A: 0, C: 1, G: 2, T: 3, U: 3 } : Object.fromEntries([...AA].map((c, i) => [c, i]));
    return seqs.map((s) => {
      const set = new Uint8Array(size); let v = 0, run = 0, cnt = 0;
      for (const ch of s) {
        const x = map[ch];
        if (x === undefined) { run = 0; v = 0; continue; }
        v = (v * base + x) % size; run++;
        if (run >= k && !set[v]) { set[v] = 1; cnt++; }
      }
      return { set, cnt };
    });
  };
  const kmerSim = (a, b) => {
    const m = Math.min(a.cnt, b.cnt); if (!m) return 0;
    let sh = 0; const A = a.set, B = b.set;
    for (let i = 0; i < A.length; i++) if (A[i] & B[i]) sh++;
    return sh / m;
  };

  // Orient sequences to the reference by k-mer similarity. Returns array of booleans (true = reverse-complement needed).
  BW.detectOrientation = (seqs, ref) => {
    const ks = kmerSets([ref, BW.revcomp(ref), ...seqs], 'dna');
    return seqs.map((_, i) => kmerSim(ks[0], ks[i + 2]) < kmerSim(ks[1], ks[i + 2]) - 0.01);
  };

  function guideTree(seqs, type) {
    const n = seqs.length;
    const ks = kmerSets(seqs, type);
    let clusters = seqs.map((_, i) => ({ id: i, leaves: [i], size: 1 }));
    const D = {};
    const key = (a, b) => (a < b ? a + ',' + b : b + ',' + a);
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) D[key(i, j)] = 1 - kmerSim(ks[i], ks[j]);
    let nextId = n;
    while (clusters.length > 1) {
      let bi = 0, bj = 1, bd = Infinity;
      for (let i = 0; i < clusters.length; i++) for (let j = i + 1; j < clusters.length; j++) {
        const d = D[key(clusters[i].id, clusters[j].id)];
        if (d < bd) { bd = d; bi = i; bj = j; }
      }
      const a = clusters[bi], b = clusters[bj], id = nextId++;
      for (const c of clusters) if (c !== a && c !== b) {
        D[key(id, c.id)] = (D[key(a.id, c.id)] * a.size + D[key(b.id, c.id)] * b.size) / (a.size + b.size);
      }
      const merged = { id, left: a, right: b, size: a.size + b.size, leaves: [...a.leaves, ...b.leaves] };
      clusters = clusters.filter((c) => c !== a && c !== b); clusters.push(merged);
    }
    return clusters[0];
  }

  /** Progressive multiple alignment. seqs: ungapped uppercase strings. */
  BW.msa = (seqs, type, opts = {}) => {
    const n = seqs.length;
    if (n === 0) return [];
    const sc = scoring(type);
    if (n === 1) return [seqs[0]];
    const tree = guideTree(seqs, type);
    const walk = (node) => {
      if (node.id < n && !node.left) return { rows: [seqs[node.id]], ids: [node.id] };
      const A = walk(node.left), B = walk(node.right);
      const pa = mkProfile(A.rows, sc), pb = mkProfile(B.rows, sc);
      const { ops } = alignOps(pa, pb, sc, !!opts.endFree);
      const [ra, rb] = applyOps(pa, pb, ops);
      return { rows: [...ra, ...rb], ids: [...A.ids, ...B.ids] };
    };
    const res = walk(tree), out = new Array(n);
    res.ids.forEach((id, k) => (out[id] = res.rows[k]));
    return out;
  };

  /** Align new ungapped sequences, one at a time, onto an existing alignment (rows may contain gaps). */
  BW.alignAdd = (rows, newSeqs, type, opts = {}) => {
    const sc = scoring(type);
    let cur = rows.slice();
    for (const s of newSeqs) {
      const pa = mkProfile(cur, sc), pb = mkProfile([s], sc);
      const { ops } = alignOps(pa, pb, sc, opts.endFree !== false);
      const [ra, rb] = applyOps(pa, pb, ops);
      cur = [...ra, rb[0]];
    }
    return cur;
  };


  /* =====================================================================
     Contig assembly (overlap–layout–consensus for Sanger-scale read sets)
     ===================================================================== */
  BW.revcompAligned = (row) => { let o = ''; for (let i = row.length - 1; i >= 0; i--) { const c = row[i]; o += c === '-' ? '-' : COMP[c] || c; } return o; };

  /** Merge two alignments (sets of equal-length rows) by profile alignment. Returns {rows, overlap, agree}. */
  BW.alignProfileRows = (rowsA, rowsB, type, endFree = true) => {
    const sc = scoring(type), A = mkProfile(rowsA, sc), B = mkProfile(rowsB, sc);
    const { ops } = alignOps(A, B, sc, endFree);
    const [ra, rb] = applyOps(A, B, ops);
    const maj = (rows, c) => { const cnt = {}; let best = '', bc = 0; for (const r of rows) { const ch = r[c]; if (ch === '-') continue; const v = (cnt[ch] = (cnt[ch] || 0) + 1); if (v > bc) { bc = v; best = ch; } } return best; };
    let overlap = 0, agree = 0;
    for (let c = 0; c < ra[0].length; c++) {
      const a = maj(ra, c), b = maj(rb, c);
      if (a && b) { overlap++; if (a === b) agree++; }
    }
    return { rows: [...ra, ...rb], overlap, agree };
  };

  /**
   * Assemble reads into contigs.
   * reads: ungapped uppercase DNA strings. Returns { contigs: [{ members: [{ idx, flip, row }] }], singles: [idx] }
   */
  BW.assemble = (reads, opts = {}) => {
    const minOverlap = opts.minOverlap || 30, minIdent = opts.minIdentity || 0.9, k = opts.k || 12, n = reads.length;
    const rc = reads.map(BW.revcomp);
    // k-mer index over both strands
    const index = new Map();
    const addK = (seq, ri, strand) => {
      for (let p = 0; p + k <= seq.length; p++) {
        const km = seq.substr(p, k); if (km.includes('N')) continue;
        let l = index.get(km); if (!l) index.set(km, (l = []));
        if (l.length < 60) l.push(ri * 2 + (strand > 0 ? 0 : 1), p);
      }
    };
    reads.forEach((r, i) => { addK(r, i, 1); addK(rc[i], i, -1); });
    // candidate pairs: read i forward vs read j on either strand, voting by diagonal
    const cand = new Map();
    for (let i = 0; i < n; i++) {
      const votes = new Map(), seq = reads[i];
      for (let p = 0; p + k <= seq.length; p++) {
        const l = index.get(seq.substr(p, k)); if (!l) continue;
        for (let t = 0; t < l.length; t += 2) {
          const j = l[t] >> 1, strand = l[t] & 1; if (j <= i) continue;
          const key = j * 2 + strand + ':' + Math.round((p - l[t + 1]) / 8);
          votes.set(key, (votes.get(key) || 0) + 1);
        }
      }
      const best = new Map();
      for (const [key, v] of votes) {
        if (v < 3) continue;
        const pj = +key.split(':')[0];
        if (!best.has(pj) || best.get(pj) < v) best.set(pj, v);
      }
      [...best.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).forEach(([pj, v]) => cand.set(i + '|' + pj, { i, j: pj >> 1, rc: pj & 1, votes: v }));
    }
    // verify candidates by end-free alignment
    const good = [];
    for (const c of cand.values()) {
      const b = c.rc ? rc[c.j] : reads[c.j];
      const pw = BW.pairwise(reads[c.i], b, 'dna', true);
      let first = -1, last = -1;
      for (let x = 0; x < pw.a.length; x++) if (pw.a[x] !== '-' && pw.b[x] !== '-') { if (first < 0) first = x; last = x; }
      if (first < 0) continue;
      let match = 0; for (let x = first; x <= last; x++) if (pw.a[x] === pw.b[x]) match++;
      const span = last - first + 1, ident = match / span;
      if (span >= minOverlap && ident >= minIdent) good.push({ ...c, span, ident, score: match * ident });
    }
    good.sort((x, y) => y.score - x.score);
    // greedy merging
    const contigs = reads.map((r, i) => ({ rows: [r], members: [{ idx: i, o: 0 }] }));
    const cid = reads.map((_, i) => i), alive = new Set(reads.map((_, i) => i));
    for (const g of good) {
      const ci = cid[g.i], cj = cid[g.j];
      const oi = contigs[ci].members.find((m) => m.idx === g.i).o, oj = contigs[cj].members.find((m) => m.idx === g.j).o;
      const want = oi ^ g.rc;
      if (ci === cj) continue;
      const B = contigs[cj];
      const rowsB = want !== oj ? B.rows.map(BW.revcompAligned) : B.rows;
      const membersB = want !== oj ? B.members.map((m) => ({ idx: m.idx, o: m.o ^ 1 })) : B.members;
      const merged = BW.alignProfileRows(contigs[ci].rows, rowsB, 'dna', true);
      if (merged.overlap < minOverlap * 0.8 || merged.agree / Math.max(1, merged.overlap) < minIdent * 0.97) continue;
      contigs[ci] = { rows: merged.rows, members: [...contigs[ci].members, ...membersB] };
      for (const m of membersB) cid[m.idx] = ci;
      alive.delete(cj);
    }
    const out = [], singles = [];
    for (const id of alive) {
      const c = contigs[id];
      if (c.members.length < 2) { singles.push(c.members[0].idx); continue; }
      // drop all-gap columns
      const L = c.rows[0].length, keep = [];
      for (let x = 0; x < L; x++) if (c.rows.some((r) => r[x] !== '-')) keep.push(x);
      const rows = c.rows.map((r) => keep.map((x) => r[x]).join(''));
      out.push({ members: c.members.map((m, t) => ({ idx: m.idx, flip: !!m.o, row: rows[t] })), length: rows[0].length });
    }
    out.sort((a, b) => b.members.length - a.members.length || b.length - a.length);
    return { contigs: out, singles: singles.sort((a, b) => a - b) };
  };

  /**
   * Quality-weighted consensus. info(r, c) -> {q, b2, ratio} | null describes read r at column c.
   * Returns { cons, cq (consensus Q), cover, amb (1 = ambiguity), votes(c) }.
   */
  BW.consensusQ = (rows, info) => {
    const n = rows.length, L = n ? rows[0].length : 0;
    const cons = new Array(L), cq = new Uint8Array(L), cover = new Uint16Array(L), amb = new Uint8Array(L);
    const first = rows.map((r) => r.search(/[^-]/)), last = rows.map((r) => { for (let i = r.length - 1; i >= 0; i--) if (r[i] !== '-') return i; return -1; });
    const votesAt = (c) => {
      const sc = { A: 0, C: 0, G: 0, T: 0 }; let gap = 0, cov = 0;
      for (let r = 0; r < n; r++) {
        const ch = rows[r][c], inf = info ? info(r, c) : null;
        if (inf && inf.skip) continue;
        if (ch === '-') { if (c > first[r] && c < last[r]) gap += 30; continue; }
        cov++;
        const w = inf ? Math.max(3, Math.min(60, inf.q)) : 30;
        if (ch in sc) {
          if (inf && inf.b2 && inf.ratio >= 0.4) { const f = inf.ratio / (1 + inf.ratio); sc[ch] += w * (1 - f); sc[inf.b2] += w * f; } else sc[ch] += w;
        }
      }
      return { sc, gap, cov };
    };
    for (let c = 0; c < L; c++) {
      const { sc, gap, cov } = votesAt(c); cover[c] = cov;
      const arr = Object.entries(sc).sort((a, b) => b[1] - a[1]), total = arr.reduce((a, b) => a + b[1], 0);
      if (!cov) { cons[c] = '-'; continue; }
      if (gap > total) { cons[c] = '-'; cq[c] = Math.min(60, Math.round(gap - total)); continue; }
      if (total === 0) { cons[c] = 'N'; amb[c] = 1; continue; }
      const top = arr[0][1];
      cq[c] = Math.max(2, Math.min(60, Math.round(top - (total - top))));
      const set = arr.filter(([, v]) => v >= 0.3 * top && v >= 8).map(([b]) => b);
      if (set.length > 1) { cons[c] = BW.iupacFor(set); amb[c] = 1; } else cons[c] = arr[0][0];
    }
    return { cons: cons.join(''), cq, cover, amb, votes: votesAt };
  };

  /** Pairwise global/semi-global alignment, returns {a,b,identity,score}. */
  BW.pairwise = (a, b, type, endFree = false) => {
    const sc = scoring(type);
    const pa = mkProfile([a], sc), pb = mkProfile([b], sc);
    const { ops, score } = alignOps(pa, pb, sc, endFree);
    const [ra, rb] = applyOps(pa, pb, ops);
    let same = 0, tot = 0;
    for (let i = 0; i < ra[0].length; i++) if (ra[0][i] !== '-' && rb[0][i] !== '-') { tot++; if (ra[0][i] === rb[0][i]) same++; }
    return { a: ra[0], b: rb[0], score, identity: tot ? same / tot : 0 };
  };
})();
