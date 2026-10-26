/* Imprint, privacy notice and licences. Structured data so it can be shown in a dialog and printed in PDF reports. */
(function () {
  'use strict';
  const BW = (globalThis.BW = globalThis.BW || {});
  const L = { name: 'Andreas Dittes', street: 'Bautzener Str. 35', city: '10829 Berlin', country: 'Germany', mail: 'labscale@dittes.info', year: 2026 };
  BW.LEGAL = L;

  BW.LEGAL_IMPRINT = [
    ['Legal notice (Imprint)', [
      `Information pursuant to § 5 DDG (German Digital Services Act)\nDNAScale\nc/o ${L.name}\n${L.street}\n${L.city}\n${L.country}`,
      `Contact\nE-mail: ${L.mail}`,
      `Responsible for content pursuant to § 18(2) MStV\n${L.name}, address as above`]],
    ['Liability for content', ['As a service provider I am responsible for my own content under the general laws (§ 7(1) DDG). Under §§ 8–10 DDG I am not obliged to monitor transmitted or stored third-party information or to investigate circumstances indicating illegal activity. Obligations to remove or block the use of information under general law remain unaffected; liability is only possible from the moment a specific infringement becomes known. I will remove such content immediately upon notice.']],
    ['Liability for links', ['This application may refer to external third-party websites over whose content I have no influence. The respective provider is always responsible for the linked content. No infringements were apparent at the time of linking; I will remove such links immediately upon notice.']],
    ['Copyright', ['Content and works created by the operator (source code, texts, sample data, graphics) are subject to German copyright law. Reproduction, adaptation, distribution and any use beyond the limits of copyright law require the author’s written consent. Third-party material is identified (see “Licences”).']],
    ['Notice on analysis results', ['DNAScale aligns sequences, calls differences and estimates quality using common, published methods. No warranty is given for correctness, completeness or fitness for a particular purpose. Results are for research use only and must be independently verified (for example against the raw chromatogram and by repeat sequencing) before any use in diagnostic, regulatory or other safety-relevant decisions.']],
    ['Trademarks', ['All product and company names mentioned are trademarks of their respective owners. “DNAScale” is not affiliated with, endorsed or sponsored by any other software vendor.']],
  ];

  BW.LEGAL_PRIVACY = [
    ['Privacy notice', [`Controller (Art. 4(7) GDPR)\nDNAScale, c/o ${L.name}, ${L.street}, ${L.city}, e-mail: ${L.mail}`]],
    ['Local processing', ['DNAScale runs entirely in your browser once loaded from this site. Your sequences, trace files, alignments and reports are not sent to any server. To restore your work the app keeps the last project and your settings (theme) in your browser’s local storage (localStorage / IndexedDB). This data never leaves your device and can be deleted at any time with your browser’s “clear site data”. No analytics or advertising cookies and no tracking services are used, and no fonts, scripts or other resources are loaded from third parties.']],
    ['External services (only on request)', ['The “BLAST at NCBI” command opens the National Center for Biotechnology Information (NCBI) BLAST page in a new browser tab and passes the chosen sequence in the link address. This happens only after you confirm a notice and click “Open NCBI BLAST”; DNAScale itself transmits nothing. NCBI’s own privacy policy applies to that page.']],
    ['Hosting and server log files', ['This site is hosted on GitHub Pages, a service of GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, USA. When you open the site, GitHub processes technically necessary access data (IP address, date and time, requested file, browser type) in server logs to deliver the pages and to ensure security and stability (Art. 6(1)(f) GDPR). I have no access to these logs and do not combine them with other data. The retention period is determined by GitHub; see the GitHub privacy statement. Data may be transferred to the USA; GitHub provides the safeguards described in its data protection terms.']],
    ['Your rights', ['You have the right of access (Art. 15), rectification (16), erasure (17), restriction (18), data portability (20) and objection (21 GDPR), and the right to withdraw consent at any time with effect for the future. You may lodge a complaint with a supervisory authority, e.g. the Berlin Commissioner for Data Protection and Freedom of Information, Alt-Moabit 59–61, 10555 Berlin.']],
  ];

  BW.LEGAL_LICENCES = [
    ['Licences and credits', ['DNAScale contains no third-party code libraries. Reference data and methods:']],
    ['Data', ['NCBI genetic-code translation tables (public scientific data). BLOSUM62 substitution matrix: S. Henikoff & J. G. Henikoff (1992), PNAS 89:10915–10919, as published by NCBI. Restriction-enzyme recognition sites are factual data compiled for this application.']],
    ['Methods', ['Independent implementations of published methods: DNA walk after Gates (1986), chaos game representation (Jeffrey 1990), sequence logos (Schneider & Stephens 1990), idealised A/B/Z-DNA helix parameters (Saenger 1984), dot plots; the visualisation concepts were inspired by DNAvisualization.org (Lee et al. 2019, Nucleic Acids Res. 47:W20–W25; Apache-2.0) — no code from that project is used. Further algorithms: Gotoh affine-gap alignment (1982); UPGMA guide tree; neighbour-joining (Saitou & Nei 1987); Jukes–Cantor distance; Phred quality scores (Ewing & Green 1998) and the Mott trimming algorithm; ABIF and SCF trace file formats (public specifications). The PDF writer is original code.']],
  ];

  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  BW.legalHtml = (sections) => sections.map(([h, ps]) => `<h4>${esc(h)}</h4>` + ps.map((p) => {
    const lines = p.split('\n');
    return `<p>${lines.map((l, i) => (i === 0 && lines.length > 1 && !/@|^\d|^c\//.test(l) ? `<b>${esc(l)}</b>` : esc(l))).join('<br>')}</p>`;
  }).join('')).join('');
})();
