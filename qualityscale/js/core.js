/* QualityScale core: namespace, helpers, defaults and reference data. */
(function () {
  'use strict';
  const QS = (globalThis.QS = globalThis.QS || {});
  QS.VERSION = '1.0.0';
  QS.esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  QS.num = (n) => (Number.isFinite(n) ? Math.round(n).toLocaleString('en-US') : '–');
  QS.f = (x, d) => (Number.isFinite(x) ? x.toFixed(d === undefined ? 1 : d) : '–');
  QS.si = (n) => (n >= 1e9 ? (n / 1e9).toFixed(2) + ' G' : n >= 1e6 ? (n / 1e6).toFixed(2) + ' M' : n >= 1e4 ? (n / 1e3).toFixed(1) + ' k' : QS.num(n));
  QS.bytes = (n) => (n >= 1e9 ? (n / 1e9).toFixed(2) + ' GB' : n >= 1e6 ? (n / 1e6).toFixed(1) + ' MB' : n >= 1e3 ? (n / 1e3).toFixed(0) + ' kB' : n + ' B');
  QS.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  QS.mulberry32 = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  QS.revcomp = (s) => { const m = { A: 'T', C: 'G', G: 'C', T: 'A', N: 'N' }; let o = ''; for (let i = s.length - 1; i >= 0; i--) o += m[s[i]] || 'N'; return o; };

  /* Adapters searched in the read-through module (first 12–13 bases are enough to detect them). */
  QS.ADAPTERS = [
    { name: 'Universal adapter', seq: 'AGATCGGAAGAGC' },
    { name: 'Small RNA 3′ adapter', seq: 'TGGAATTCTCGG' },
    { name: 'Small RNA 5′ adapter', seq: 'GATCGTCGGACT' },
    { name: 'Transposase adapter', seq: 'CTGTCTCTTATA' },
    { name: 'Alternative-platform adapter', seq: 'AAGTCGGAGGCC' },
    { name: 'Poly-A', seq: 'AAAAAAAAAAAA' },
    { name: 'Poly-G', seq: 'GGGGGGGGGGGG' },
  ];
  /* Sources used to annotate over-represented sequences. */
  QS.CONTAMINANTS = [
    { name: 'Universal adapter (read 1)', seq: 'AGATCGGAAGAGCACACGTCTGAACTCCAGTCA' },
    { name: 'Universal adapter (read 2)', seq: 'AGATCGGAAGAGCGTCGTGTAGGGAAAGAGTGT' },
    { name: 'Indexed adapter', seq: 'GATCGGAAGAGCACACGTCTGAACTCCAGTCAC' },
    { name: 'Adapter, forward strand', seq: 'GATCGGAAGAGCTCGTATGCCGTCTTCTGCTTG' },
    { name: 'Adapter, reverse strand', seq: 'CAAGCAGAAGACGGCATACGAGCTCTTCCGATCT' },
    { name: 'PCR primer 1', seq: 'AATGATACGGCGACCACCGAGATCTACACTCTTTCCCTACACGACGCTCTTCCGATCT' },
    { name: 'PCR primer 2', seq: 'CAAGCAGAAGACGGCATACGAGCTCTTCCGATCT' },
    { name: 'Sequencing primer', seq: 'ACACTCTTTCCCTACACGACGCTCTTCCGATCT' },
    { name: 'Transposase adapter', seq: 'CTGTCTCTTATACACATCTCCGAGCCCACGAGAC' },
    { name: 'Transposase adapter (mate)', seq: 'CTGTCTCTTATACACATCTGACGCTGCCGACGA' },
    { name: 'Small RNA 3′ adapter', seq: 'TGGAATTCTCGGGTGCCAAGGAACTCCAGTCAC' },
    { name: 'Small RNA 5′ adapter', seq: 'GTTCAGAGTTCTACAGTCCGACGATC' },
    { name: 'Small RNA RT primer', seq: 'CAAGCAGAAGACGGCATACGAGATGTGACTGGAGTTCCTTGGCACCCGAGAATTCCA' },
    { name: 'Alternative-platform adapter 1', seq: 'AAGTCGGAGGCCAAGCGGTCTTAGGAAGACAA' },
    { name: 'Alternative-platform adapter 2', seq: 'AAGTCGGATCGTAGCCATGTCGTTCTGTGAGCCAAGGAGTTG' },
    { name: 'Poly-A', seq: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
    { name: 'Poly-T', seq: 'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT' },
    { name: 'Poly-G (no-signal artefact)', seq: 'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG' },
    { name: 'Poly-C', seq: 'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC' },
  ];
  /* Approximate GC content of common genomes, drawn as optional reference lines. */
  QS.GENOME_GC = [['Human', 41], ['Mouse', 42], ['Zebrafish', 36.5], ['Fruit fly', 42], ['C. elegans', 35.4], ['Arabidopsis', 36], ['Maize', 46.9], ['Baker’s yeast', 38.3], ['E. coli', 50.8], ['Phage PhiX174', 44.8], ['SARS-CoV-2', 38]];

  /* Thresholds. dir 'low': values BELOW the threshold are bad; 'high': values ABOVE. */
  QS.LIMIT_DEFS = [
    { id: 'pbq_lower', mod: 'pbq', label: 'Lower quartile quality', unit: 'Q', warn: 10, fail: 5, dir: 'low' },
    { id: 'pbq_median', mod: 'pbq', label: 'Median quality', unit: 'Q', warn: 25, fail: 20, dir: 'low' },
    { id: 'tile', mod: 'tile', label: 'Tile quality deficit', unit: 'Q', warn: 5, fail: 10, dir: 'high' },
    { id: 'psq', mod: 'psq', label: 'Most frequent read quality', unit: 'Q', warn: 27, fail: 20, dir: 'low' },
    { id: 'pbc', mod: 'pbc', label: 'A/T or G/C difference', unit: '%', warn: 10, fail: 20, dir: 'high' },
    { id: 'gc', mod: 'gc', label: 'Deviation from normal fit', unit: '%', warn: 15, fail: 30, dir: 'high' },
    { id: 'nc', mod: 'nc', label: 'N content at any position', unit: '%', warn: 5, fail: 20, dir: 'high' },
    { id: 'dup', mod: 'dup', label: 'Sequences remaining after de-duplication', unit: '%', warn: 70, fail: 50, dir: 'low' },
    { id: 'over', mod: 'over', label: 'Single sequence share', unit: '%', warn: 0.1, fail: 1, dir: 'high' },
    { id: 'adp', mod: 'adp', label: 'Adapter content at any position', unit: '%', warn: 5, fail: 10, dir: 'high' },
    { id: 'kmer', mod: 'kmer', label: 'K-mer enrichment (−log10 p)', unit: '', warn: 2, fail: 5, dir: 'high' },
    { id: 'cmplx', mod: 'cmplx', label: 'Low-complexity reads', unit: '%', warn: 5, fail: 15, dir: 'high' },
  ];
  QS.defaultLimits = () => { const o = {}; QS.LIMIT_DEFS.forEach((d) => { o[d.id] = [d.warn, d.fail]; }); return o; };
  QS.PRESETS = {
    Standard: {},
    Strict: { pbq_lower: [15, 10], pbq_median: [30, 25], psq: [30, 27], adp: [2, 5], over: [0.05, 0.5], nc: [2, 10], dup: [80, 60] },
    'RNA-seq': { pbc: [25, 40], gc: [25, 45], dup: [30, 15], over: [0.5, 3], kmer: [5, 10], cmplx: [8, 20] },
    Amplicon: { pbc: [40, 60], gc: [40, 70], dup: [10, 3], over: [5, 20], kmer: [10, 20], len: [1, 1], cmplx: [30, 60] },
  };
})();
