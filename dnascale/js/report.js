/* Lab report as vector PDF: summary, differences, alignment pages, chromatogram evidence. */
(function () {
  'use strict';
  const BW = (globalThis.BW = globalThis.BW || {});
  const PW = 770, PH = 513;
  const INK = '#1c2230', MUT = '#667085', LINE = '#d9dde5', ACC = '#2563eb', WARN = '#c2410c';
  const AA3 = { A: 'Ala', R: 'Arg', N: 'Asn', D: 'Asp', C: 'Cys', Q: 'Gln', E: 'Glu', G: 'Gly', H: 'His', I: 'Ile', L: 'Leu', K: 'Lys', M: 'Met', F: 'Phe', P: 'Pro', S: 'Ser', T: 'Thr', W: 'Trp', Y: 'Tyr', V: 'Val', '*': 'Stop' };

  const T = (c, s, x, y, { size = 10, bold = false, color = INK, align = 'left' } = {}) => {
    c.font = `${bold ? '700 ' : ''}${size}px Helvetica`; c.fillStyle = color; c.textAlign = align; c.textBaseline = 'alphabetic'; c.fillText(String(s), x, y);
  };
  const wrap = (c, text, maxW, size) => {
    c.font = `${size}px Helvetica`; const out = [];
    for (const para of String(text).split('\n')) {
      let line = '';
      for (const w of para.split(/\s+/)) {
        const t = line ? line + ' ' + w : w;
        if (c.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t;
      }
      out.push(line);
    }
    return out;
  };
  const trunc = (c, s, maxW, size, bold) => {
    c.font = `${bold ? '700 ' : ''}${size}px Helvetica`;
    if (c.measureText(s).width <= maxW) return s;
    while (s.length > 2 && c.measureText(s + '…').width > maxW) s = s.slice(0, -1);
    return s + '…';
  };

  function logo(c, x, y, s) {
    c.fillStyle = ACC; c.fillRect(x, y, s, s);
    c.strokeStyle = '#ffffff'; c.lineWidth = s * 0.09;
    for (const ph of [Math.PI, 0]) {
      c.globalAlpha = ph ? 0.6 : 1; c.beginPath();
      for (let i = 0; i <= 24; i++) { const t = i / 24, px = x + s * (0.5 + 0.18 * Math.sin(2 * Math.PI * t + ph)), py = y + s * (0.17 + 0.66 * t); i ? c.lineTo(px, py) : c.moveTo(px, py); }
      c.stroke();
    }
    c.globalAlpha = 1;
  }
  function header(c, title, sub) {
    logo(c, 0, 0, 22); c.font = '700 15px Helvetica'; const w = c.measureText('DNA').width;
    T(c, 'DNA', 30, 16, { size: 15, bold: true }); T(c, 'Scale', 30 + w, 16, { size: 15, bold: true, color: ACC });
    T(c, title, PW, 16, { size: 11, color: MUT, align: 'right' });
    c.fillStyle = LINE; c.fillRect(0, 30, PW, 0.8);
    if (sub) T(c, sub, 0, 52, { size: 15, bold: true });
  }

  function variantRows(A, rows, st) {
    const ref = A.refSeq(), out = [];
    for (const c of st.diffList) {
      const refCh = ref ? ref.res[c] : st.cons[c];
      const calls = []; let minQ = null, mixed = false;
      rows.forEach((s) => {
        const ch = s.res[c]; if (ch === undefined) return;
        const map = BW.seqMap(s), idx = map.colToIdx[c];
        let q = null;
        if (s.trace && idx >= 0) { q = s.trace.qual[s.tStart + idx]; if (BW.mixRatios(s.trace)[s.tStart + idx] >= 0.4) mixed = true; if (minQ === null || q < minQ) minQ = q; }
        if (s !== ref && ch !== refCh) calls.push(`${s.name}: ${ch}${q !== null ? ' (Q' + q + ')' : ''}`);
      });
      let effect = '';
      if (A.mainType() === 'dna' && ref) for (const s of rows) if (s !== ref) { const e = A.variantEffect(c, s, true); if (e) { effect = `p.${AA3[e.ra] || e.ra}${e.n}${AA3[e.va] || e.va} (${e.kind})`; break; } }
      const ri = ref ? BW.seqMap(ref).colToIdx[c] : -1;
      out.push({ col: c + 1, pos: ri >= 0 ? ri + 1 : '—', ref: refCh === '-' ? '–' : refCh, calls: calls.join('; ') || (mixed ? 'mixed peak' : '—'), mixed, effect, minQ });
    }
    return out;
  }

  /** Build the report. Returns a Blob. */
  BW.buildReport = (A, o = {}) => {
    const S = A.S, rows = A.rows(), st = A.stats(), L = BW.LEGAL;
    const keepTheme = A.theme, keepZoom = S.opts.zoom, keepSel = S.sel, keepCur = S.cursor;
    A.theme = A.lightTheme(); S.sel = null; S.cursor = null;
    try {
      const doc = new PDFDoc(); doc.title = 'DNAScale report - ' + (S.name || '').replace(/[()\\]/g, '');
      const date = new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
      const pages = [];
      const add = (W, H, fn, foot) => pages.push({ W, H, fn, foot });
      const proj = S.name || 'Untitled project';
      const ref = A.refSeq();

      /* ---- summary ---- */
      const vr = variantRows(A, rows, st);
      let meanId = 0, nId = 0; for (let c = 0; c < st.ident.length; c++) if (st.gapFrac[c] < 0.5) { meanId += st.ident[c]; nId++; }
      add(PW, PH, (c) => {
        header(c, 'Sequence verification report', proj);
        T(c, `Generated ${date}`, 0, 68, { size: 9, color: MUT });
        const stats = [[rows.length, 'sequences'], [A.alnLen().toLocaleString('en-US'), 'alignment columns'], [rows.length > 1 && nId ? (meanId / nId * 100).toFixed(1) + '%' : '—', 'mean identity'], [st.diffList.length, 'differences / mixed peaks']];
        stats.forEach(([v, l], i) => { const x = i * 190; T(c, v, x, 104, { size: 22, bold: true, color: i === 3 && st.diffList.length ? WARN : ACC }); T(c, l, x, 118, { size: 8.5, color: MUT }); });
        T(c, 'Sequences', 0, 150, { size: 11, bold: true });
        const cols = [['Name', 0, 'left'], ['Type', 250, 'left'], ['Length', 330, 'right'], ['Kept region', 440, 'right'], ['Mean Q', 505, 'right'], ['Notes', 530, 'left']];
        let y = 166; c.fillStyle = LINE; c.fillRect(0, y - 11, PW, 0.8);
        cols.forEach(([h, x, al]) => T(c, h.toUpperCase(), x, y, { size: 7.5, bold: true, color: MUT, align: al })); y += 5;
        for (const s of rows.slice(0, 12)) {
          y += 15; c.fillStyle = LINE; c.fillRect(0, y - 11, PW, 0.4);
          let mq = '—', kept = '—'; const notes = [];
          if (s.trace) { let sum = 0; for (let i = s.tStart; i < s.tEnd; i++) sum += s.trace.qual[i]; mq = (sum / Math.max(1, s.tEnd - s.tStart)).toFixed(1); kept = `${s.tStart + 1}–${s.tEnd} of ${s.trace.bases.length}`; if (s.trace.qualEstimated) notes.push('Q estimated'); }
          if (s === ref) notes.push('reference'); if (s.rc) notes.push('reverse-complemented');
          T(c, trunc(c, s.name, 240, 9), 0, y, { size: 9 }); T(c, s.trace ? 'trace read' : s.type === 'dna' ? 'DNA' : 'protein', 250, y, { size: 9, color: MUT });
          T(c, BW.ungappedLen(s).toLocaleString('en-US'), 330, y, { size: 9, align: 'right' }); T(c, kept, 440, y, { size: 9, align: 'right' }); T(c, mq, 505, y, { size: 9, align: 'right' }); T(c, notes.join(' · '), 530, y, { size: 8.5, color: MUT });
        }
        if (rows.length > 12) T(c, `… and ${rows.length - 12} more`, 0, y + 15, { size: 8.5, color: MUT });
        y += 40;
        T(c, 'Differences', 0, y, { size: 11, bold: true });
        if (!vr.length) T(c, rows.length > 1 ? 'All aligned sequences agree; no mixed peaks were flagged.' : 'Only one sequence — nothing to compare.', 0, y + 16, { size: 9.5, color: MUT });
        else T(c, `${vr.length} column${vr.length === 1 ? '' : 's'} — detail on the following page${vr.length > 14 ? 's' : ''}.`, 0, y + 16, { size: 9.5, color: MUT });
        if (st.mode === 'contig') {
          const seq = st.cons.replace(/-/g, ''), nAmb = st.amb.reduce((x, z) => x + z, 0), cm = S.contigs.find((x) => x.id === S.group);
          y += 52; T(c, `Consensus${cm ? ' · ' + cm.name : ''} — ${seq.length.toLocaleString('en-US')} bp, ${nAmb} ambiguous position${nAmb === 1 ? '' : 's'}`, 0, y, { size: 11, bold: true });
          c.font = '7.5px Courier'; c.fillStyle = INK; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
          const per = 150, maxLines = Math.max(1, Math.floor((PH - 30 - (y + 14)) / 9.5));
          for (let i = 0, k = 0; i < seq.length && k < maxLines; i += per, k++) c.fillText(seq.slice(i, i + per), 0, y + 14 + k * 9.5);
          if (seq.length > per * maxLines) T(c, '… sequence continues; export the consensus as FASTA for the full text.', 0, PH - 20, { size: 7.5, color: MUT });
        }
        T(c, 'Quality values are Phred scores (Q20 = 1% error, Q30 = 0.1%). Differences were detected automatically and must be confirmed against the chromatogram.', 0, PH - 8, { size: 7.5, color: MUT });
      }, proj);

      /* ---- variant table ---- */
      for (let i = 0; i < vr.length; i += 16) {
        const part = vr.slice(i, i + 16);
        add(PW, PH, (c) => {
          header(c, 'Differences', `Differences ${i + 1}–${i + part.length} of ${vr.length}`);
          const cols = [['Column', 0, 'left'], [ref ? 'Ref. pos.' : 'Pos.', 60, 'left'], [ref ? 'Reference' : 'Consensus', 120, 'left'], ['Variant calls', 190, 'left'], ['Effect', 520, 'left'], ['Min Q', PW, 'right']];
          let y = 80; c.fillStyle = LINE; c.fillRect(0, y - 11, PW, 0.8);
          cols.forEach(([h, x, al]) => T(c, h.toUpperCase(), x, y, { size: 7.5, bold: true, color: MUT, align: al })); y += 5;
          for (const r of part) {
            y += 22; c.fillStyle = LINE; c.fillRect(0, y - 15, PW, 0.4);
            T(c, r.col, 0, y, { size: 9.5, bold: true }); T(c, r.pos, 60, y, { size: 9.5 }); T(c, r.ref, 120, y, { size: 9.5, bold: true });
            T(c, trunc(c, r.calls, 320, 9), 190, y, { size: 9, color: r.mixed ? WARN : INK }); T(c, trunc(c, r.effect, 190, 9), 520, y, { size: 9 });
            T(c, r.minQ === null ? '—' : 'Q' + r.minQ, PW, y, { size: 9, align: 'right', color: r.minQ !== null && r.minQ < 20 ? WARN : INK });
          }
        }, proj);
      }

      /* ---- alignment ---- */
      if (o.alignment !== false && rows.length) {
        S.opts.zoom = 10; const av = A.av, cw = 10, nameW = av.nameW, K = 100, rpp = 38;
        const L2 = A.alnLen();
        for (let r0 = 0; r0 < rows.length; r0 += rpp) for (let c0 = 0; c0 < L2; c0 += K) {
          const nr = Math.min(rpp, rows.length - r0), nc = Math.min(K, L2 - c0);
          const W = nameW + nc * cw, H = av.headerH + nr * av.rh;
          add(W, H, (c) => {
            // draw the full-height view scrolled to this block: translate so rows r0.. are at the top
            c.save(); c.beginPath(); c.rect(0, 0, W, H); c.clip();
            av.paint(c, W, H, c0 * cw, r0 * av.rh, true);
            c.restore();
          }, `${proj} · alignment columns ${c0 + 1}–${c0 + nc}` + (rows.length > rpp ? ` · rows ${r0 + 1}–${r0 + nr}` : ''));
        }
      }

      /* ---- chromatogram evidence ---- */
      if (o.evidence !== false) {
        const traceRows = rows.filter((s) => s.trace), max = o.maxEvidence || 24;
        for (const r of vr.slice(0, traceRows.length ? max : 0)) {
          const c0 = r.col - 1, list = traceRows.filter((s) => BW.seqMap(s).colToIdx[c0] >= 0);
          for (let k = 0; k < list.length; k += 3) {
            const part = list.slice(k, k + 3);
            add(PW, PH, (c) => {
              header(c, 'Chromatogram evidence', `Column ${r.col}${r.pos !== '—' ? ` · reference position ${r.pos}` : ''}`);
              T(c, `${ref ? 'Reference' : 'Consensus'}: ${r.ref}   ·   ${r.calls}${r.effect ? '   ·   ' + r.effect : ''}`, 0, 68, { size: 9.5, color: MUT });
              let y = 84;
              for (const s of part) {
                const idx = BW.seqMap(s).colToIdx[c0], bi = s.tStart + idx, q = s.trace.qual[bi];
                T(c, s.name, 0, y + 9, { size: 9.5, bold: true });
                T(c, `base ${idx + 1} · ${s.trace.bases[bi]} · Q${q}${BW.mixRatios(s.trace)[bi] >= 0.4 ? ' · mixed peak' : ''}`, PW, y + 9, { size: 9, color: q < 20 ? WARN : MUT, align: 'right' });
                c.save(); c.translate(0, y + 14); c.beginPath(); c.rect(0, 0, PW, 140); c.clip();
                BW.traceSnapshot(A, s, bi, PW, 140).render(c, PW, 140, null);
                c.restore(); c.strokeStyle = LINE; c.lineWidth = 0.8; c.strokeRect(0, y + 14, PW, 140);
                y += 160;
              }
            }, proj);
          }
        }
      }

      /* ---- sequence analysis ---- */
      if (o.analysis && BW.analysis) for (const p of BW.analysis.pages(A.lightTheme())) add(p.W, p.H, p.fn, p.foot);

      if (o.firstPage) pages.splice(0, o.firstPage);
      pages.forEach((p, i) => {
        doc.addPage(p.W, p.H, p.fn, { footer: `${p.foot}  ·  DNAScale  ·  ${date}  ·  page ${i + 1}/${pages.length}`, margin: 36 });
      });
      return doc.build();
    } finally { A.theme = keepTheme; S.opts.zoom = keepZoom; S.sel = keepSel; S.cursor = keepCur; A.av.request(); }
  };

  BW.ungappedLen = (s) => s.res.replace(/-/g, '').length;
})();
