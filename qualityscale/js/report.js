/* QualityScale exports: standalone HTML report, summary table, ZIP of figures. */
(function () {
  'use strict';
  const QS = globalThis.QS, esc = QS.esc, f1 = QS.f;
  const STNAME = { pass: 'Pass', warn: 'Warning', fail: 'Fail', info: 'Info', na: 'n/a' };

  QS.summaryTsv = (samples) => {
    const mods = QS.MODS.filter((m) => m.core);
    const head = ['sample', 'score', 'grade', 'reads', 'mean_length', 'gc_percent', 'mean_q', 'q30_percent', 'unique_percent', 'adapter_max_percent', 'n_max_percent', 'reads_le1_expected_error_percent'].concat(mods.map((m) => m.id));
    const rows = samples.filter((s) => s.res).map((s) => {
      const m = QS.metrics(s.res, s.ev), r = (v, d) => (Number.isFinite(v) ? v.toFixed(d) : '');
      return [s.name, s.ev.score, s.ev.grade, m.reads, r(m.len, 1), r(m.gc, 2), r(m.meanQ, 2), r(m.q30, 2), r(m.uniq, 2), r(m.adp, 2), r(m.nmax, 3), r(m.ee1, 1)].concat(mods.map((x) => s.ev.mods[x.id].st)).join('\t');
    });
    return head.join('\t') + '\n' + rows.join('\n') + '\n';
  };

  const crcT = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = crcT[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  QS.zip = (files) => {
    const enc = new TextEncoder(), parts = [], cd = []; let off = 0;
    files.forEach((fl) => {
      const nm = enc.encode(fl.name), data = typeof fl.data === 'string' ? enc.encode(fl.data) : fl.data, crc = crc32(data);
      const lh = new DataView(new ArrayBuffer(30)); lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, nm.length, true);
      parts.push(new Uint8Array(lh.buffer), nm, data);
      const ch = new DataView(new ArrayBuffer(46)); ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, nm.length, true); ch.setUint32(42, off, true);
      cd.push(new Uint8Array(ch.buffer), nm); off += 30 + nm.length + data.length;
    });
    const csz = cd.reduce((a, b) => a + b.length, 0), end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, csz, true); end.setUint32(16, off, true);
    return new Blob(parts.concat(cd, [new Uint8Array(end.buffer)]), { type: 'application/zip' });
  };

  QS.reportHtml = (samples, o) => {
    const P = QS.palette(false), lim = o.lim, done = samples.filter((s) => s.res);
    const mods = QS.MODS.filter((m) => m.core);
    const css = `body{font:14px/1.5 -apple-system,Inter,Segoe UI,Roboto,sans-serif;color:#1c2230;background:#f4f6fa;margin:0}main{max-width:1100px;margin:0 auto;padding:28px 22px 60px}h1{font-size:26px;margin:0 0 4px;letter-spacing:-.02em}h2{font-size:20px;margin:34px 0 6px;letter-spacing:-.01em}h3{font-size:15px;margin:0}.sub{color:#667085}.card{background:#fff;border:1px solid #d9dde5;border-radius:14px;padding:14px 16px;margin:12px 0;break-inside:avoid}.hd{display:flex;gap:10px;align-items:center;margin-bottom:6px}.hd h3{flex:1}.chip{font-size:11px;font-weight:650;padding:1px 9px;border-radius:99px}.pass{background:#e0f3e6;color:#15803d}.warn{background:#fdeadd;color:#c2410c}.fail{background:#fde7ea;color:#d1344a}.info,.na{background:#eef0f4;color:#667085}svg{width:100%;height:auto}table{border-collapse:collapse;width:100%;font-size:13px}th,td{padding:6px 8px;border-bottom:1px solid #e3e6ec;text-align:left}th{font-size:11px;text-transform:uppercase;color:#667085;letter-spacing:.05em}td.r,th.r{text-align:right}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.sq{font-family:ui-monospace,Menlo,monospace;font-size:12px;word-break:break-all}.sq i{font-style:normal;font-weight:600}.bA{color:#15803d}.bC{color:#2563eb}.bG{color:#d98a00}.bT{color:#d1344a}.bN{color:#667085}.mb{display:none}.score{font-size:42px;font-weight:700;letter-spacing:-.03em}.note{color:#4a5367;font-size:13px}.find{border-left:4px solid #c8cdd8;padding:6px 12px;margin:6px 0;background:#fff;border-radius:6px}.find.fail{border-color:#d1344a}.find.warn{border-color:#f59e0b}.find.ok{border-color:#15803d}.find.info{border-color:#2563eb}.dot{display:inline-block;width:12px;height:12px;border-radius:50%}@media(max-width:800px){.grid{grid-template-columns:1fr}}@media print{body{background:#fff}.card{break-inside:avoid}}`;
    const dot = (st) => `<span class="dot" style="background:${st === 'pass' ? '#15803d' : st === 'warn' ? '#f59e0b' : st === 'fail' ? '#d1344a' : '#c8cdd8'}"></span>`;
    QS.noTips = true;
    let h = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>QualityScale report</title><style>${css}</style></head><body><main><h1>QualityScale report</h1><div class="sub">${done.length} sample${done.length === 1 ? '' : 's'} · generated ${new Date().toLocaleString('en-GB')} · all analysis done locally in the browser</div>`;
    h += `<div class="card"><table><thead><tr><th>Sample</th><th class="r">Score</th><th class="r">Reads</th><th class="r">Mean Q</th><th class="r">Q30</th><th class="r">GC</th>${mods.map((m) => `<th title="${esc(m.title)}">${esc(m.short)}</th>`).join('')}</tr></thead><tbody>` + done.map((s) => { const m = QS.metrics(s.res, s.ev); return `<tr><td><a href="#s${s.id}">${esc(s.name)}</a></td><td class="r"><b>${s.ev.score}</b> ${s.ev.grade}</td><td class="r">${QS.num(m.reads)}</td><td class="r">${f1(m.meanQ, 1)}</td><td class="r">${f1(m.q30, 1)}%</td><td class="r">${f1(m.gc, 1)}%</td>${mods.map((x) => `<td>${dot(s.ev.mods[x.id].st)}</td>`).join('')}</tr>`; }).join('') + '</tbody></table></div>';
    done.forEach((s) => {
      const res = s.res, ev = s.ev, d = QS.derive(res);
      h += `<h2 id="s${s.id}">${esc(s.name)}</h2><div class="sub">${res.fmt}${res.gz ? ' (gzip)' : ''} · ${QS.num(res.n)} reads${res.truncated ? ' (first ' + QS.si(res.limit) + ' analysed)' : ''} · ${res.minLen === res.maxLen ? res.maxLen + ' bp' : res.minLen + '–' + res.maxLen + ' bp'} · ${res.hasQual ? res.enc.name : 'no qualities'}</div>`;
      h += `<div class="card"><div class="hd"><div class="score">${ev.score}</div><div><h3>Overall score · grade ${ev.grade}</h3><div class="sub">${ev.cnt.pass} passed, ${ev.cnt.warn} warnings, ${ev.cnt.fail} failures</div></div></div>`;
      QS.insights(res, ev).forEach((i) => { h += `<div class="find ${i.sev}"><b>${esc(i.title)}</b><div class="note">${esc(i.text)}</div></div>`; });
      h += '</div>';
      QS.MODS.forEach((m) => {
        const e = ev.mods[m.id]; if (!e || e.st === 'na') return;
        const variants = m.id === 'tile' ? ['tile', 'flow'] : [undefined];
        variants.forEach((mode) => {
          const html = QS.renderMod(m.id, res, { P, lim, opts: { mode }, w: 760, h: 380, rows: 20 });
          h += `<div class="card"><div class="hd"><h3>${esc(m.title)}${mode === 'flow' ? ' — flow-cell layout' : ''}</h3><span class="chip ${e.st}">${STNAME[e.st]}</span></div>${e.note ? `<div class="note">${esc(e.note)}</div>` : ''}${html}</div>`;
        });
      });
    });
    QS.noTips = false;
    h += `<p class="sub" style="margin-top:36px">Created with QualityScale ${QS.VERSION}. Thresholds: ${QS.LIMIT_DEFS.map((d) => `${esc(d.label)} ${o.lim[d.id][0]}/${o.lim[d.id][1]}${d.unit}`).join(' · ')}.</p></main></body></html>`;
    return h;
  };
})();
