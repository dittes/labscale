/* Extra formats (FASTQ, EMBL, SwissProt, GenPept), sequence search, digests, GC frame plot, protein profiles, reverse translation. No DOM. */
(function () {
  'use strict';
  const BW = (globalThis.BW = globalThis.BW || {});

  /* ---------------- formats ---------------- */
  BW.parseFastq = (text) => {
    const lines = text.split(/\r?\n/), out = [];
    for (let i = 0; i + 3 < lines.length + 1; i++) {
      if (!lines[i] || lines[i][0] !== '@') continue;
      const seq = (lines[i + 1] || '').trim().toUpperCase(), plus = lines[i + 2] || '', q = (lines[i + 3] || '').trim();
      if (plus[0] !== '+' || q.length !== seq.length) continue;
      const h = lines[i].slice(1).trim();
      out.push({ name: h.split(/\s+/)[0] || 'read', desc: h.replace(/^\S+\s*/, ''), seq: seq.replace(/\./g, 'N'), qual: Uint8Array.from(q, (c) => Math.max(0, c.charCodeAt(0) - 33)) });
      i += 3;
    }
    return out;
  };

  /** EMBL nucleotide and UniProt/SwissProt flat files (same line-code layout). */
  BW.parseEmbl = (text) => {
    const out = [];
    for (const rec of text.split(/^\/\/\s*$/m)) {
      const id = rec.match(/^ID\s+(\S+?);?(?:\s|$)/m); if (!id) continue;
      const sq = rec.search(/^SQ\s.*$/m); if (sq < 0) continue;
      const body = rec.slice(sq).replace(/^SQ.*$/m, '');
      const seq = body.replace(/[^A-Za-z]/g, '').toUpperCase();
      const de = [...rec.matchAll(/^DE\s+(.*)$/gm)].map((m) => m[1].trim()).join(' ');
      const protein = /\bAA\.?\s*$/m.test(rec.match(/^ID.*$/m)[0]) || /Reviewed|Unreviewed/.test(rec.match(/^ID.*$/m)[0]);
      out.push({ name: id[1], desc: de, seq, type: protein ? 'protein' : 'dna' });
    }
    return out;
  };

  const baseParse = BW.parseAnyText;
  BW.parseAnyText = (text, filename = '') => {
    const t = text.replace(/^﻿/, '');
    if (/^@\S/.test(t) && /\n\+/.test(t.slice(0, 20000))) { const r = BW.parseFastq(t); if (r.length) return r; }
    if (/^ID\s/m.test(t) && /^SQ\s/m.test(t)) { const r = BW.parseEmbl(t); if (r.length) return r; }
    const r = baseParse(t, filename);
    if (/^LOCUS\s+\S+\s+\d+\s+aa\b/m.test(t)) r.forEach((x) => (x.type = 'protein'));
    return r;
  };

  BW.toFastq = (items) => items.map((s) => `@${s.name}\n${s.seq}\n+\n${Array.from(s.qual, (q) => String.fromCharCode(Math.min(93, Math.max(0, q)) + 33)).join('')}\n`).join('');

  /* ---------------- search ---------------- */
  const IUP = BW.IUPAC;
  BW.iupacRegex = (q, dna) => {
    const parts = [...q.toUpperCase().replace(/U/g, dna ? 'T' : 'U')].map((c) => {
      if (dna && IUP[c]) { const s = IUP[c]; return s.length === 1 ? s : '[' + s + ']'; }
      if (c === 'X' || c === 'N' && !dna) return '.';
      return c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    });
    return new RegExp('(?=(' + parts.join('') + '))', 'g');
  };
  /** Exact / IUPAC search of an ungapped sequence. Returns [{start, end, strand}] (0-based, end exclusive). */
  BW.searchSeq = (seq, query, { dna = true, bothStrands = true } = {}) => {
    const hits = []; if (!query) return hits;
    const scan = (s, strand) => {
      const re = BW.iupacRegex(query, dna); let m;
      while ((m = re.exec(s))) {
        const len = m[1].length;
        hits.push(strand > 0 ? { start: m.index, end: m.index + len, strand } : { start: seq.length - m.index - len, end: seq.length - m.index, strand });
        re.lastIndex = m.index + 1;
        if (hits.length > 5000) return;
      }
    };
    scan(seq, 1);
    if (dna && bothStrands) scan(BW.revcomp(seq), -1);
    // de-duplicate (palindromes)
    const seen = new Set();
    return hits.filter((h) => { const k = h.start + ':' + h.end; if (seen.has(k)) return false; seen.add(k); return true; }).sort((a, b) => a.start - b.start);
  };

  /** Best local (Smith–Waterman) alignment of query within target. */
  BW.localAlign = (query, target, type = 'dna') => {
    const q = query.toUpperCase(), t = target.toUpperCase(), m = q.length, n = t.length;
    const sc = type === 'dna' ? (a, b) => (a === b ? 5 : a === 'N' || b === 'N' ? 0 : -4) : (a, b) => BW.BLOSUM62[a + b] ?? -1;
    const gap = type === 'dna' ? -6 : -7;
    let prev = new Int32Array(n + 1), cur = new Int32Array(n + 1), pS = new Int32Array(n + 1), cS = new Int32Array(n + 1);
    let best = 0, bi = 0, bj = 0, bs = 0;
    for (let i = 1; i <= m; i++) {
      cur[0] = 0; cS[0] = 0;
      for (let j = 1; j <= n; j++) {
        let v = prev[j - 1] + sc(q[i - 1], t[j - 1]), s = prev[j - 1] > 0 ? pS[j - 1] : j - 1;
        const up = prev[j] + gap, left = cur[j - 1] + gap;
        if (up > v) { v = up; s = pS[j]; } if (left > v) { v = left; s = cS[j - 1]; }
        if (v <= 0) { v = 0; s = j; }
        cur[j] = v; cS[j] = s;
        if (v > best) { best = v; bi = i; bj = j; bs = s; }
      }
      let x = prev; prev = cur; cur = x; x = pS; pS = cS; cS = x;
    }
    if (!best) return null;
    const seg = t.slice(bs, bj), pw = BW.pairwise(q, seg, type, true);
    return { score: best, start: bs, end: bj, identity: pw.identity, coverage: Math.min(1, (bj - bs) / m) };
  };

  /* ---------------- restriction digests ---------------- */
  BW.digest = (len, cuts, circular) => {
    const c = [...new Set(cuts)].filter((x) => x > 0 && x < len).sort((a, b) => a - b);
    const frags = [];
    if (!c.length) return circular ? [{ start: 1, end: len, len, wrap: false }] : [{ start: 1, end: len, len }];
    for (let i = 0; i < c.length - 1; i++) frags.push({ start: c[i] + 1, end: c[i + 1], len: c[i + 1] - c[i] });
    if (circular) frags.push({ start: c[c.length - 1] + 1, end: c[0], len: len - c[c.length - 1] + c[0], wrap: true });
    else { frags.unshift({ start: 1, end: c[0], len: c[0] }); frags.push({ start: c[c.length - 1] + 1, end: len, len: len - c[c.length - 1] }); }
    return frags;
  };
  BW.nonCutters = (sites) => BW.ENZYMES.filter((e) => !sites[e[0]]).map((e) => e[0]);

  /* ---------------- plots ---------------- */
  /** GC at each codon position in a sliding window (G+C frame plot). */
  BW.gcFrame = (seq, win = 120, step = 3) => {
    seq = seq.toUpperCase().replace(/-/g, ''); const n = seq.length, xs = [], f = [[], [], []], all = [];
    const isGC = new Uint8Array(n); for (let i = 0; i < n; i++) isGC[i] = seq[i] === 'G' || seq[i] === 'C' ? 1 : 0;
    const pre = new Int32Array(n + 1); for (let i = 0; i < n; i++) pre[i + 1] = pre[i] + isGC[i];
    const pre3 = [0, 1, 2].map((k) => { const a = new Int32Array(n + 1); for (let i = 0; i < n; i++) a[i + 1] = a[i] + (i % 3 === k ? isGC[i] : 0); return a; });
    for (let x = 0; x + win <= n; x += step) {
      xs.push(x + win / 2);
      all.push(100 * (pre[x + win] - pre[x]) / win);
      for (let k = 0; k < 3; k++) f[k].push(100 * (pre3[k][x + win] - pre3[k][x]) / (win / 3));
    }
    return { xs, f, all };
  };

  BW.SCALES = {
    kd: { name: 'Hydropathy (Kyte–Doolittle)', win: 9, hint: 'Peaks above 1.6 over 19 residues suggest membrane-spanning segments.', vals: { A: 1.8, R: -4.5, N: -3.5, D: -3.5, C: 2.5, Q: -3.5, E: -3.5, G: -0.4, H: -3.2, I: 4.5, L: 3.8, K: -3.9, M: 1.9, F: 2.8, P: -1.6, S: -0.8, T: -0.7, W: -0.9, Y: -1.3, V: 4.2 }, thr: 0 },
    hw: { name: 'Hydrophilicity (Hopp–Woods)', win: 7, hint: 'Hydrophilic peaks are likely to lie on the protein surface.', vals: { A: -0.5, R: 3.0, N: 0.2, D: 3.0, C: -1.0, Q: 0.2, E: 3.0, G: 0.0, H: -0.5, I: -1.8, L: -1.8, K: 3.0, M: -1.3, F: -2.5, P: 0.0, S: 0.3, T: -0.4, W: -3.4, Y: -2.3, V: -1.5 }, thr: 0 },
    kt: { name: 'Antigenicity (Kolaskar–Tongaonkar)', win: 7, hint: 'Regions above 1.0 are predicted to be antigenic determinants.', vals: { A: 1.064, R: 0.873, N: 0.776, D: 0.866, C: 1.412, Q: 1.015, E: 0.851, G: 0.874, H: 1.105, I: 1.152, L: 1.25, K: 0.93, M: 0.826, F: 1.091, P: 1.064, S: 1.012, T: 0.909, W: 0.893, Y: 1.161, V: 1.383 }, thr: 1.0 },
  };
  BW.profile = (prot, key, win) => {
    const sc = BW.SCALES[key], w = win || sc.win, h = Math.floor(w / 2), out = [];
    prot = prot.toUpperCase().replace(/[^A-Z]/g, '');
    for (let i = 0; i < prot.length; i++) {
      const a = Math.max(0, i - h), b = Math.min(prot.length - 1, i + h); let s = 0, c = 0;
      for (let k = a; k <= b; k++) { const v = sc.vals[prot[k]]; if (v !== undefined) { s += v; c++; } }
      out.push(c ? s / c : 0);
    }
    return out;
  };

  /** Reverse translation to an IUPAC-degenerate DNA sequence. */
  BW.revTranslate = (prot, codeId = 1) => {
    const { map } = BW.codonTable(codeId), byAa = {};
    for (const [cod, aa] of Object.entries(map)) (byAa[aa] = byAa[aa] || []).push(cod);
    const unionCodon = (cods) => [0, 1, 2].map((p) => BW.iupacFor(cods.map((c) => c[p]))).join('');
    const cache = {};
    const pick = (aa) => {
      if (cache[aa]) return cache[aa];
      const all = byAa[aa]; if (!all) return (cache[aa] = { codon: 'NNN', cover: 0, total: 0, exact: false });
      // exact if the product of per-position sets equals the codon set; otherwise take the largest exact block
      const u = unionCodon(all), prod = [...u].length && expand(u);
      let best = { codon: u, cover: all.length, total: all.length, exact: prod.length === all.length };
      if (!best.exact) {
        let cand = null;
        for (let p = 0; p < 3; p++) for (const b of new Set(all.map((c) => c[p]))) {
          const sub = all.filter((c) => c[p] === b), us = unionCodon(sub);
          if (expand(us).length === sub.length && (!cand || sub.length > cand.cover)) cand = { codon: us, cover: sub.length, total: all.length, exact: false };
        }
        if (cand) best = cand;
      }
      return (cache[aa] = best);
    };
    const expand = (cod) => { let r = ['']; for (const ch of cod) { const set = IUP[ch] || ch; r = r.flatMap((x) => [...set].map((b) => x + b)); } return r; };
    let dna = '', cover = [], deg = [];
    for (const aa of prot.toUpperCase().replace(/[^A-Z*]/g, '')) {
      const p = pick(aa); dna += p.codon; cover.push(p); deg.push(expand(p.codon).length);
    }
    return { dna, codons: cover, degeneracy: deg };
  };
})();
