# LabScale

**labscale.org** – start page: `index.html` (animated landing page, “Open” button), workbench: `app.html`, legal pages: `imprint.html`. Single-file offline build: `labscale-standalone.html` (run `python3 build.py`).

A browser-based data analysis and graphing workbench for scientists and engineers. No build step, no dependencies: open `app.html` in a browser.

## Features

**Workbook** – multiple sheets, virtual-scrolling grid (thousands of rows), long name / units / comment header rows, column designations (X, Y, Z, Err, Label), range selection, copy/paste to and from Excel, row masking, command line (`C = sin(A)*B + i`), set-values and fill-series dialogs, transforms (cumsum, diff, rank, z-score…), sort, transpose, undo/redo, autosave, CSV/TXT/Excel import (drag & drop too), project save/load, CSV export.

**Graphs** – line, scatter, line+symbol, area, column, horizontal bar, stacked column, histogram (with normal overlay), box chart, pie, polar, heatmap, contour, 3D scatter, 3D surface, 3D wireframe. Error bars, dual Y axes, log / ln / reciprocal scales, spline and step connectors, waterfall offset, reference lines, text notes, legends, colormaps. Pan, wheel-zoom, zoom-box, data reader tooltip, 3D rotate, PNG export / copy.

**Statistics** – descriptive, normality + Q-Q data, one-sample / two-sample (Welch, pooled) / paired t-tests, one-way ANOVA with Bonferroni post-hoc, Mann–Whitney, Kruskal–Wallis, chi-square independence, Pearson / Spearman correlation matrices.

**Fitting** – linear regression with confidence and prediction bands, polynomial regression, multiple linear regression, nonlinear fit (14 built-in functions plus custom expressions) with parameter standard errors, confidence limits, correlation, R², reduced χ².

**Peaks & baseline** – peak finder (prominence, FWHM, area), multi-peak Gaussian / Lorentzian fit, baseline correction (iterative polynomial, endpoints, rolling minimum).

**Signal processing** – smoothing (adjacent average, Savitzky–Golay, Gaussian, median, LOESS), FFT with windows, FIR low/high/band-pass/stop filters, differentiate, integrate, interpolate (linear/spline), normalize.

**Multivariate** – frequency counts, PCA, k-means, XYZ-to-matrix IDW gridding.

Results go into a Results Log that can be exported as an HTML report.

## Added in round 2

Vector PDF export and printing for every graph, live recalculation, multi-panel graphs, more graph types (bubble, violin, radar, Q-Q, CDF, density), two-way ANOVA with Tukey HSD, logistic regression with ROC, Kaplan–Meier, global fitting, Butterworth filters, spectrograms, scripting and batch runs. See `FEATURES.md` for the full list including what is still missing.

## Round 3

Date/time columns and date axes, repeated-measures / Welch / Dunnett tests, standard curves with unknowns, dose–response EC50 with curve comparison, SVG export, multi-layer Y axes, and shareable single-file projects.

**Single-file build:** run `python3 build.py` to produce `labscale-standalone.html` (the whole app in one file, no folders needed). Use *Share (.html)* in that file to export a copy with your project embedded — the recipient just double-clicks it.

## Files

- `js/math.js` – numerics (distributions, linear algebra, FFT, splines, Levenberg–Marquardt)
- `js/analysis.js`, `js/analysis2.js` – analysis library
- `js/pdf.js` – vector PDF writer and print helpers
- `js/svg.js` – SVG export
- `build.py` – bundles everything into `labscale-standalone.html`
- `js/chart.js` – canvas chart engine
- `js/app.js` – project state, grid, column operations, plotting, I/O
- `js/ui.js` – ribbon, dialogs, properties panel, results log
- `js/samples.js` – demo datasets

Excel (.xlsx) import loads the SheetJS reader from cdnjs on demand; everything else works offline.


## Legal
© 2026 LabScale
