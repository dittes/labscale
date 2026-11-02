# QualityScale — sequencing quality control

A single-page web app that checks the quality of high-throughput sequencing reads and helps you decide what to do about it.
No install, no server, no network, no libraries: open `index.html` (or serve the folder), drop in FASTQ or FASTA files and read the dashboard.
Part of the LabScale family; it shares the look of LabScale, DNAScale and MoleculeScale (same design tokens, light and dark theme).

## Try it
- Open `index.html` → **Open files…**, **Try the demo** (three synthetic runs with typical problems), **Paste reads**, or drop files on the window.
- URL shortcuts: `?demo` (three samples), `?demo=good|tail|rna` (one sample), `&view=dash|report|mod|cmp`, `&mod=pbq` (a check id), `&trim` (show trim guides).
- `⌘K` opens the command palette, `?` lists the shortcuts.
- Serve locally with `python3 -m http.server 8765` and open `http://localhost:8765/qualityscale/`.

## Input
FASTQ and FASTA, plain or gzip-compressed (detected from the file content, streamed in chunks so large files do not need to fit in memory). Quality encoding (Phred+33 / Phred+64) is detected automatically. By default the first 1,000,000 reads are analysed; change it under *Analysis › Reads to analyse*. Files without qualities (FASTA) skip the quality checks. A saved `.qualityscale` results file can be reopened later without the original reads.

## Checks (12 scored + 5 informational)
| Check | What it shows |
|---|---|
| Basic statistics | format, encoding, reads, length, GC, mean quality, Q20 / Q30 |
| Per-base sequence quality | box plot, lines, or % bases ≥ Q20 / Q30 along the read, with quality zones |
| Quality heatmap | density of every quality value at every position |
| Per-tile sequence quality | tile × position deviation heat map and a **flow-cell layout** (every tile as a small spatial panel) |
| Per-sequence quality | read-quality histogram with Q20 / Q30 markers and a cumulative curve |
| Quality versus GC | 2-D density of read GC against mean quality |
| Per-base sequence content | lines, stacked area, or a bias map (deviation from the read average) |
| Per-sequence GC content | histogram or cumulative curve against a fitted normal curve, extra populations highlighted, optional genome reference lines |
| Per-base N content | with threshold lines |
| Sequence length distribution | histogram, log scale, or cumulative |
| Duplication levels | distinct sequences vs. all reads, estimated from the first 100,000 distinct sequences |
| Overrepresented sequences | annotated against a list of adapters and primers |
| Adapter content | cumulative share of reads containing each adapter, per position |
| K-mer content | positionally enriched 7-mers with profile sparklines |
| Expected errors | per-read distribution (with ≤ 0.5 / 1 / 2 / 5 markers) and accumulation along the read |
| Sequence complexity | entropy and longest homopolymer run |
| Index / barcode composition | dominant and one-mismatch indexes from the read headers |

## Speed and pairs
- Files are analysed in **web workers**, up to three at a time, so the interface stays responsive; the demo samples build in parallel too. Without worker support (for example when opened from `file://`) the app falls back to the main thread automatically.
- **Paired-end detection**: files named `…_R1…` / `…_R2…`, `…_1` / `…_2` or `.R1.` / `.R2.` are linked automatically (shown as R1 ⇄ / R2 ⇄ in the sample list). The Compare view checks matching read counts and read-name order and shows both mates side by side with an overlay of mean quality; the dashboard warns when mates are out of sync.

## Beyond the checks
- **Dashboard**: overall score and grade, KPI tiles, a pass / warning / fail strip and plain-language *findings and recommendations* (quality decay, adapter read-through, tile problems, poly-G tails, biased read starts, mixed populations, index hopping).
- **Trim advisor**: suggests a 5′ trim and a 3′ cut position from quality and adapter onset. Draw the guides on any position chart and drag them; the inspector shows the bases kept, reads that become too short, quality before and after, and adapter content before and after, and gives the settings to copy.
- **Compare**: samples × checks matrix, a sortable metric table with outliers marked, and overlaid curves (mean quality, GC distribution, adapters, read length, expected errors).
- **Settings**: thresholds per check (warn / fail), presets (Standard, Strict, RNA-seq, Amplicon), editable adapter and contaminant lists, read limit.
- **Export**: self-contained HTML report (all samples), summary TSV, results file, every figure as SVG or PNG (identical to the screen), data tables as CSV, all figures in a ZIP.

## Score
70 % check health (pass 1, warning 0.55, fail 0, weighted by importance) plus 30 % from the share of bases at Q30 or better, scaled so that 85 % earns full marks. Grades: A ≥ 90, B ≥ 80, C ≥ 70, D ≥ 55.

## Notes
- Duplication uses the first 100,000 distinct sequences (reads over 75 bp are truncated to 50 bp) with a correction for under-sampling. Tile statistics come from all of the first 50,000 reads and every 10th read after that; k-mers from every 5th read up to 100,000 reads and every 50th after.
- Everything is computed in the browser. Settings (theme, thresholds, read limit, custom lists) are kept in local storage; sequence data is never stored or sent anywhere.
- Code layout: `js/engine.js` (streaming parser and single-pass analyser), `js/modules.js` (derived statistics, thresholds, findings, trim advice), `js/charts.js` (all figures as SVG strings), `js/report.js` (exports), `js/app.js` (interface), `js/demo.js` (synthetic data).
