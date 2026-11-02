/* Dialogs and overlays for the biopolymer builders, structure checks, stereo labels and property estimates. */
(function () {
  'use strict';
  const MS = window.MS, A = MS.app, S = A.S, R = A.R, EL = MS.EL, C = MS.chem, B = MS.bio;
  const { $, $$, esc } = A;
  const fmt = (n, d = 2) => Number(n).toFixed(d);
  S.hbonds = true;

  /* ---------- stereo labels ---------- */
  A.toggleStereo = () => {
    const i = S.layers.findIndex((x) => x.style === 'labels' && x.label === 'stereo');
    if (i >= 0) { S.layers.splice(i, 1); R.invalidate(true); A.refresh(); return; }
    const n = [...B.stereo(S.mol).values()].length;
    S.layers.push(A.mkLayer('labels', { label: 'stereo', name: 'Stereo labels', noH: true, size: 1.25 }));
    R.invalidate(true); A.refresh();
    A.toast(n ? n + ' stereo descriptor' + (n > 1 ? 's' : '') + ' assigned from the 3D geometry (CIP rules).' : 'No stereocentres or stereogenic double bonds found.');
  };

  /* ---------- structure check ---------- */
  A.checkDialog = () => {
    const m = S.mol; if (!m.atoms.length) return A.toast('Nothing to check.', true);
    const res = B.check(m), icon = { ok: '✓', info: 'i', warn: '!', error: '✕' }, col = { ok: 'var(--good, #1f9d62)', info: 'var(--muted)', warn: '#d98a0b', error: 'var(--bad)' };
    A.dlg({
      title: 'Structure check', width: 560,
      body: res.map((r, k) => `<div class="chk-row" style="display:flex;gap:10px;align-items:flex-start;padding:7px 0;border-bottom:1px solid var(--line)"><b style="width:18px;text-align:center;color:${col[r.sev]}">${icon[r.sev]}</b><span style="flex:1">${esc(r.msg)}</span>${r.atoms.length ? `<button class="btn sm" data-sel="${k}">Select</button>` : ''}</div>`).join(''),
      buttons: [{ label: 'Close', primary: true }],
      onOpen: (d) => $$('[data-sel]', d).forEach((b) => (b.onclick = () => { A.setSel(res[+b.dataset.sel].atoms); A.toast('Selected ' + res[+b.dataset.sel].atoms.length + ' atoms.'); })),
    });
  };

  /* ---------- isotope pattern ---------- */
  A.isotopeDialog = () => {
    const m = S.mol; if (!m.atoms.length) return A.toast('Nothing to analyse.', true);
    const iso = B.isotopes(m); if (!iso) return A.toast('Isotope data is not available for every element in this structure.', true);
    const peaks = iso.peaks, lo = Math.floor(peaks[0].mass) - 1, hi = Math.ceil(peaks[peaks.length - 1].mass) + 1, W = 520, H = 150, pad = 28;
    const x = (mass) => pad + ((mass - lo) / (hi - lo)) * (W - pad * 2);
    const bars = peaks.map((p) => `<line x1="${x(p.mass).toFixed(1)}" x2="${x(p.mass).toFixed(1)}" y1="${H - 24}" y2="${(H - 24 - p.p * (H - 50)).toFixed(1)}" stroke="var(--accent)" stroke-width="5" stroke-linecap="round"/><text x="${x(p.mass).toFixed(1)}" y="${H - 8}" text-anchor="middle" font-size="10" fill="var(--muted)">${p.mass.toFixed(1)}</text>${p.p > 0.04 ? `<text x="${x(p.mass).toFixed(1)}" y="${(H - 30 - p.p * (H - 50)).toFixed(1)}" text-anchor="middle" font-size="9.5" fill="var(--text)">${(p.p * 100).toFixed(p.p > 0.995 ? 0 : 1)}</text>` : ''}`).join('');
    A.dlg({
      title: 'Exact mass and isotope pattern', width: 580,
      body: `<div class="kv" style="margin-bottom:8px"><span>Formula</span><span>${C.formula(m, null, true)}</span><span>Average molar mass</span><span>${fmt(C.mass(m), 4)} g/mol</span><span>Monoisotopic mass</span><span>${fmt(B.monoMass(m), 5)} u</span><span>Most abundant peak</span><span>${fmt(iso.mono, 4)} u</span></div>
        <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto"><line x1="${pad}" x2="${W - pad}" y1="${H - 24}" y2="${H - 24}" stroke="var(--line)"/>${bars}</svg>
        <p class="muted" style="margin:6px 0 0;font-size:12px">Peak heights are relative to the tallest peak (100). Calculated from natural isotope abundances for the neutral molecule.</p>`,
      buttons: [{ label: 'Copy peak list', fn: () => { A.copyText(peaks.map((p) => p.mass.toFixed(4) + '\t' + (p.p * 100).toFixed(2)).join('\n'), 'Peak list'); return false; } }, { label: 'Close', primary: true }],
    });
  };

  /* ---------- property estimates (appended to the Properties tab) ---------- */
  A.bioPropsHtml = (m) => {
    if (m.atoms.length > 3000) return '';
    if (m.heavy() > 150) return `<div class="sec"><h4>Analysis</h4><div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn sm" data-bio="check">Check structure</button>${B.stereo(m).size ? `<button class="btn sm" data-bio="stereo">${S.layers.some((x) => x.label === 'stereo') ? 'Hide' : 'Show'} R/S labels</button>` : ''}</div>${B.isNucleic(m) ? `<div class="muted" style="font-size:11.5px;margin-top:6px">Dashed lines show Watson–Crick base-pair hydrogen bonds (Calculate menu to hide).</div>` : ''}</div>`;
    let p; try { if (!m._bp || m._bp.v !== m.ver) m._bp = { v: m.ver, p: B.props(m) }; p = m._bp.p; } catch (e) { return ''; }
    const lip = p.lipinski.map((x) => `<span class="chip ${x[1] ? '' : 'bad'}" style="${x[1] ? '' : 'color:var(--bad)'}">${x[1] ? '✓' : '✕'} ${esc(x[0])}</span>`).join(' ');
    const st = B.stereo(m); const nR = [...st.values()].filter((v) => v === 'R' || v === 'S').length, nE = [...st.values()].filter((v) => v === 'E' || v === 'Z').length;
    return `<div class="sec"><h4>Estimates</h4><div class="kv"><span>log P (estimate)</span><span>${fmt(p.logp, 1)}</span><span>Polar surface area</span><span>${fmt(p.tpsa, 1)} Å²</span><span>Monoisotopic mass</span><span>${fmt(B.monoMass(m), 4)} u</span>${nR || nE ? `<span>Stereo</span><span>${nR ? nR + ' centre' + (nR > 1 ? 's' : '') : ''}${nR && nE ? ', ' : ''}${nE ? nE + ' double bond' + (nE > 1 ? 's' : '') : ''}</span>` : ''}</div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:6px;font-size:11.5px">${lip}</div><div class="muted" style="font-size:11px;margin-top:4px">${p.violations ? p.violations + ' Lipinski violation' + (p.violations > 1 ? 's' : '') : 'Passes Lipinski\'s rule of five'}${p.veber ? ' · passes Veber' : ''}. log P is a fitted atom-type estimate (typical error 0.6).</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px"><button class="btn sm" data-bio="check">Check structure</button><button class="btn sm" data-bio="stereo">${S.layers.some((x) => x.label === 'stereo') ? 'Hide' : 'Show'} R/S labels</button><button class="btn sm" data-bio="iso">Isotope pattern</button></div></div>`;
  };
  A.bioBind = (root) => $$('[data-bio]', root).forEach((b) => (b.onclick = () => ({ check: A.checkDialog, stereo: A.toggleStereo, iso: A.isotopeDialog })[b.dataset.bio]()));

  /* ---------- sequences: DNA / RNA / peptide ---------- */
  A.insertNucleic = (seq, rna, dbl, name) => {
    try { const m = B.nucleic(seq, { rna: !!rna, double: dbl !== false }); if (name) m.title = name; A.load(m); S.dismissEmpty = true; A.fit(); return true; } catch (e) { A.toast(e.message, true); return false; }
  };
  A.nucleicDialog = (preset) => A.dlg({
    title: 'Build DNA / RNA', width: 560,
    body: `<p class="muted" style="margin-top:0">Type a sequence (5′→3′). An all-atom helix is built from B-DNA base-pair geometry, with the complementary strand, hydrogens and base-pair hydrogen bonds. Up to 40 bases.</p>
      <textarea class="field mono" id="naSeq" rows="3" spellcheck="false" placeholder="e.g. CGCGAATTCGCG or a FASTA record">${esc((preset && preset.seq) || 'CGCGAATTCGCG')}</textarea>
      <div class="field-row" style="margin-top:10px"><label>Type</label><select class="sel" id="naKind"><option value="dna">DNA (B-form)</option><option value="rna">RNA (approximate, B-like sugar geometry)</option></select></div>
      <div class="field-row"><label>Strands</label><select class="sel" id="naStr"><option value="2">Double helix (add complementary strand)</option><option value="1">Single strand</option></select></div>
      <div id="naErr" class="err" style="color:var(--bad);min-height:18px;margin-top:6px"></div>`,
    buttons: [{ label: 'Cancel' }, { label: 'Build', primary: true, fn: async () => {
      const b = $('#dlg .df .primary'); const recs = B.parseFasta($('#naSeq').value); const seq = recs.length ? recs[0].seq : '';
      const rna = $('#naKind').value === 'rna', dbl = $('#naStr').value === '2';
      b.textContent = 'Building…'; await new Promise((r) => setTimeout(r, 30));
      try { const m = B.nucleic(seq, { rna, double: dbl }); A.load(m); S.dismissEmpty = true; A.fit(); } catch (e) { b.textContent = 'Build'; $('#naErr').textContent = e.message; return false; }
    } }],
    onOpen: (d) => { if (preset && preset.rna) $('#naKind', d).value = 'rna'; if (preset && preset.single) $('#naStr', d).value = '1'; $('#naSeq', d).focus(); },
  });
  /** choose the right builder for pasted FASTA text */
  A.openFasta = (text) => {
    const recs = B.parseFasta(text); if (!recs.length || !recs[0].seq) return A.toast('No sequence found.', true);
    const r = recs[0]; if (recs.length > 1) A.toast(recs.length + ' records found; using the first (' + (r.name || 'unnamed').slice(0, 40) + ').');
    if (r.kind === 'protein') { A.peptideDialog(); setTimeout(() => { const i = $('#pepSeq'); if (i) i.value = r.seq; }, 30); } else A.nucleicDialog({ seq: r.seq, rna: r.kind === 'rna' });
  };
  A.fastaDialog = () => A.dlg({
    title: 'Sequence from FASTA', width: 600,
    body: `<p class="muted" style="margin-top:0">Paste a FASTA record or a plain sequence. Protein sequences open the peptide builder, DNA and RNA open the nucleic-acid builder.</p><textarea class="field mono" id="faTxt" rows="7" spellcheck="false" placeholder=">my_peptide\nAEAAAKEAAAKA"></textarea>`,
    buttons: [{ label: 'Cancel' }, { label: 'Continue', primary: true, fn: () => { const t = $('#faTxt').value; if (!t.trim()) return false; setTimeout(() => A.openFasta(t), 60); } }],
    onOpen: (d) => $('#faTxt', d).focus(),
  });

  /* ---------- base-pair hydrogen bonds in the overlay ---------- */
  R.hooks.push((ctx) => {
    const m = S.mol; if (!S.hbonds || !m || !m.atoms.length || !B.isNucleic(m)) return;
    const list = B.basePairBonds(m); if (!list.length) return;
    const dark = R.opts.dark || R.opts.bg === 'black';
    ctx.save(); ctx.lineCap = 'round'; ctx.setLineDash([4, 3]); ctx.lineWidth = 1.7;
    list.forEach(([i, j]) => {
      const a = m.atoms[i], b = m.atoms[j]; if (a.hid || b.hid) return;
      const p = R.cam.project([a.x, a.y, a.z]), q = R.cam.project([b.x, b.y, b.z]); if (p[2] <= 0.1 || q[2] <= 0.1) return;
      ctx.strokeStyle = dark ? 'rgba(255,214,102,.9)' : 'rgba(214,120,0,.9)';
      ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
    });
    ctx.restore();
  });
  A.toggleHbonds = () => { S.hbonds = !S.hbonds; R.invalidate(false); A.refresh(); };
})();
