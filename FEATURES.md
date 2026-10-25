# LabScale – feature list

Legend: ✅ built in the first version · 🆕 added in this round · ⛔ not built (needs much more work)

## Round 3 (this build)
- 🆕 **Date/time columns** – typed, pasted or imported dates are detected automatically; calendar-aware date axis; dates in formulas (`date("2024-05-01")`, `DAY`, `HOUR`)
- 🆕 **Repeated-measures ANOVA** (Greenhouse–Geisser / Huynh–Feldt), **Welch ANOVA + Games–Howell**, **Dunnett** vs control
- 🆕 **Standard curve & unknowns** – 7 calibration models, weighting, back-calculated standards, unknown concentrations with 95 % CI, LOD/LOQ
- 🆕 **Dose–response** – EC50/IC50 with CI, fixed top/bottom, curve-comparison F tests
- 🆕 **SVG export**
- 🆕 **True multi-layer graphs** – up to five independent Y axes (left + 4 right) with their own scale, range and colour
- 🆕 **Shareable single-file projects** – `labscale-standalone.html` → *Share (.html)* produces one file with the app and your data

## Output
- 🆕 Export **any graph as vector PDF** (one graph, or every graph in one multi-page PDF)
- 🆕 **Print** a graph, all graphs, or the results report (print dialog → also "Save as PDF")
- ✅ PNG export / copy to clipboard
- 🆕 HTML report now embeds every graph image

## Graphs
- ✅ line, scatter, line+symbol, area, column, bar, stacked, histogram, box, pie, polar, heatmap, contour, 3D scatter/surface/wireframe
- 🆕 bubble, violin, radar, Q-Q plot, empirical CDF, kernel density
- 🆕 multi-panel graphs (grid of existing graphs) and "split series into stacked panels"
- 🆕 data labels, font family choice, copy / paste graph format (a lightweight template)
- ⛔ ternary, Smith, Sankey, candlestick, axis breaks, draggable annotations

## Worksheet
- ✅ multi-sheet grid, designations, mask, command line, set values, fill, sort, transpose, undo/redo
- 🆕 **live recalculation**: formula columns and analysis results update when data changes (per-result auto switch)
- 🆕 filter rows by expression, stack / unstack columns, matrix → XYZ, per-column number format
- 🆕 script window (multi-line commands: assignments, `plot`, `run`)
- 🆕 batch: run a finished analysis on every other sheet
- ⛔ date/time column types, database connectors, multiple workbooks

## Statistics
- ✅ descriptive, t-tests, one-way ANOVA, Mann–Whitney, Kruskal–Wallis, chi-square, correlation
- 🆕 two-way ANOVA (Type III, interaction) + Tukey HSD, Tukey for one-way ANOVA
- 🆕 Anderson–Darling normality, Wilcoxon signed-rank, Fisher exact test
- 🆕 binary logistic regression with odds ratios + ROC curve / AUC
- 🆕 Kaplan–Meier survival with log-rank test
- ⛔ repeated-measures ANOVA, MANOVA, Cox regression, power analysis

## Fitting
- ✅ linear / polynomial / multiple regression, nonlinear fit (14 models + custom)
- 🆕 fixed parameters and bounds, AIC / BIC, **global fit** with shared parameters
- ⛔ surface fitting, ODE fitting

## Signal
- ✅ smoothing, FFT, FIR filters, differentiate, integrate, interpolate, normalize
- 🆕 Butterworth IIR filters (zero-phase), spectrogram (STFT → heatmap)
- ⛔ wavelets, 2D FFT, image processing

## Rounds 4–6 (roadmap pass)
- 🆕 Matrix tools (Column ribbon → Matrix): transpose, rotate, flip, resize, shrink, expand, crop, smooth, gradient, normalize, formula, threshold, profiles, matrix → image
- 🆕 Image processing (Column ribbon → Image): open image, grayscale/invert/blur/sharpen/median/edges/Sobel/emboss, threshold (Otsu), ROI stats, line profile, image → matrix

## Graph gallery additions (28 new plot types)
Chord, network (force-directed), edge bundling, alluvial, sunburst, circle packing, treemap, spiral bar, trellis, cluster (hulls), confidence ellipses, fence, plot with inset, double-X, streamlines, contour profile, image profile, waterfall, bridge, high-low-close, kite, Piper, Schoeller, Stiff, tetrahedral, variability chart, correlation plot, map (coarse continents, 3 projections). All export as vector PDF/SVG/EPS. Data layout for each type is described in Properties ▸ Type options.

## Workspaces (Settings ⚙ → Workspace)
- **(former ribbon layout, removed)** – the original full ribbon with explorer and properties panels.
- **Studio** – compact menu bar (click a menu to open its tools as a popover), vertical tool strip (pan, zoom box, ROI, brush, cursors, note, draw, move/add point, gadgets, image, command search), options bar for the open graph, properties dock on the right; explorer and results log collapsed.
- **Minimal** – menus and canvas only. In Studio and Minimal, Tab hides every panel; Ctrl+K searches all commands.
The choice is remembered on this device; Settings also sets theme and default report format.

## Window handling
Gadgets panel and all dialogs can be dragged by their title bar; the gadgets panel can also be resized. Light/dark is set in Settings (default: follow system); the old header toggle was removed.

## Quality, DOE and more (new "Quality" ribbon tab)
- **SPC control charts:** X̄–R, X̄–S, I–MR, p, np, c, u, EWMA, CUSUM with Nelson rules 1–4 flagged; centre/limit columns written to the sheet and plotted.
- **Process capability:** Cp, Cpk, Pp, Ppk, Cpm, expected and observed PPM.
- **Gage R&R (MSA):** crossed two-way ANOVA with interaction, % contribution / study variation / tolerance, distinct categories.
- **Tolerance intervals:** normal (two-sided Howe, one-sided exact) and non-parametric.
- **DOE:** 2-level full / half-fraction design generator (randomised, replicates, centre points) and factorial analysis (effects, coefficients, ANOVA-style summary, curvature test, Lenth PSE for saturated designs, Pareto of effects).
- **Decision tree (CART):** classification and regression, SVG tree, importance, cross-validation (under Multivariate).
- **ANOVA post-hoc:** Scheffé, Šidák and Fisher LSD added to the one-way ANOVA report.
- **35 more fit functions** (49 in total): growth/decay variants, Gompertz, Richards, von Bertalanffy, 5PL, adsorption isotherms, substrate inhibition, Arrhenius, damped sine, cumulative distributions, pseudo-Voigt, Pearson VII, log-normal, extreme-value, asymmetric Gaussian, EMG, pulse and more.

## Round 8
- **10 more graph types:** forest, before-after, means plot, run chart (with runs test), Venn (2–3 sets, area-proportional for two), Voronoi, cause-and-effect (fishbone), Manhattan, Poincaré (SD1/SD2), Andrews curves.
- **Axis scales:** square root, symmetric log, logit and probit added to linear / log / ln / reciprocal.
- **UX:** welcome screen with quick actions, Help and shortcuts dialog (press ?), collapsible result cards, proper icons for Quality tools.

## Round 9: remaining gallery types
3D pie, 3D columns, 3D waterfall, isosurface (marching tetrahedra, optional second level), polar quiver, Durov (simplified: Piper fields + pH–TDS panel), USDA soil texture triangle with sample classification, tile-grid map (US states or any labels), clustered heatmap with row/column dendrograms. 3D types rotate by dragging.

## Workflow polish (round 10)
- **History panel** (⏱ in the header, or File ▸ History): every change is listed with a label and time; click any step to jump back, or forward through undone steps. Up to 60 steps.
- **Template gallery** (Plot ▸ Style): 7 built-in styles (Publication, Presentation, Poster, Minimal, Colour-blind safe, Grayscale print, Lab notebook) with live thumbnails of your own graph, apply to one or all graphs, plus your saved templates.
- **Mini toolbar:** click a series in a graph to get a floating bar for colour, line width, symbol, symbol size, line style, hide, gadgets.
- **Import wizard v2:** auto-detects delimiter, decimal separator and header rows (names / units / comments), strips BOM, handles quoted fields with escaped quotes, detects dates (ISO and day-first/month-first), treats NA / null / “-” as blank, marks text columns as labels, trims empty trailing columns, and offers text encodings (UTF-8, Windows-1252, Latin-1, UTF-16).
- **Guided tour:** 9 steps with spotlight; starts on first run, restart from the welcome screen or Help.

## Round 11: navigation, legal, more analyses
- **Overlay mega-menus** (File, Data, Plot, Analysis, Quality, View, Help) with sub-categories and a live filter; header condensed to Undo/Redo/Search/Settings. The View menu holds layout choice, panel toggles and History. Default layout is now "Menus + tool strip"; the classic ribbon remains available.
- **Graph toolbar** condensed to Pan / Zoom / ROI plus Tools, View, Format and Export dropdowns.
- **Imprint / privacy / licences** (§ 5 DDG, § 18 MStV, GDPR), always linked at the bottom right; third-party scripts load only after consent.
- **New analyses:** one- and two-sample Poisson rate tests (exact), acceptance sampling with OC curve, stability study with shelf-life estimate, response-surface designs (CCD, Box–Behnken) and quadratic response-surface analysis with stationary point.

## Round 12: search, annotations, plot preview
- **Global search** (magnifier at the top right, or Ctrl+K): finds commands and menu functions plus sheets, columns, cell values, graphs, results and report notes; Enter jumps there.
- **Annotations:** pick Draw shapes ▸ Line / Arrow / Rectangle / Ellipse / Text from a sub-menu (also from the tool strip). Click any annotation to select it (Shift = several), drag to move, drag the end handles to resize, double-click text to edit; floating toolbar for colour, width, dash, fill, arrow, text size, duplicate, order and delete; Del, Ctrl+D and arrow keys work. All steps are in History.
- **Plot gallery (preview):** Plot ▸ Preview, or Format ▸ Preview other plot types on a graph: shows your selected data as ~24 chart types (plus “try all other types”); click one to create it. Types that cannot display the data are hidden.
- Fixed: scatter (and other dot-style) icons were invisible in the new menus.

## Round 13: Office export, more statistics, more plots
- **PowerPoint (.pptx)**: one slide per graph (File ▸ Office). **Word (.docx)** report with headings, tables and embedded graphs (also an option in Export report). Both are standard Open XML packages (opened successfully by python-pptx and python-docx in testing).
- **Statistics:** homogeneity of variance (Levene, Brown–Forsythe, Bartlett), McNemar, Dunn post-hoc for Kruskal–Wallis, Cohen’s kappa (unweighted/linear/quadratic), intraclass correlation (all six Shrout–Fleiss forms), Mann–Kendall trend with Sen’s slope, ACF / PACF with Ljung–Box, exponential smoothing and Holt–Winters forecasting, classical seasonal decomposition.
- **Plots:** main-effects, interaction, stacked dot plot, marginal abatement cost curve, histogram with normal probability plot.
- **Quality assurance:** all 112 chart types × 3 data selections and all 112 analyses run without errors on a synthetic sheet; long error messages for oversized inputs are now friendly.

## Round 14: plot-feature gaps
- **Colour / size / symbol by column** (Properties ▸ Point styling by column, for scatter and line+symbol): numeric columns map to a colour map or a size range, text columns become categories (colour or symbol); a legend for each mapping appears in the plot (position selectable).
- **Maths text** in titles, axis titles, legends, notes and text annotations: `x^2`, `s^{-1}`, `H_{2}O`, `\mu`, `\alpha`, `\Delta`, `\pm`, `\le` … Greek letters are real Greek in PNG, SVG and PDF (PDF uses the built-in Symbol font).
- **Tables inside graphs** (Tools ▸ Insert table…): series statistics (N, mean, SD, min, max) or worksheet columns; linked to the data, selectable, movable, resizable text, exported with the graph.
- **Custom-formula axis scales:** choose “Custom formula f(x)…” for any X/Y axis and type e.g. `log(1+x)` or `sqrt(x)`; ticks are placed at round values.

## Round 15: spreadsheet editing and drawing
- **Sheet toolbar** (left strip in the menu layouts, bar above the grid in the classic layout; the strip switches automatically between sheet tools and graph tools): Rows (add data point, insert above/below, delete, remove blank/duplicate rows, mask), Columns (add, insert left/right, duplicate, delete, move, rename, hide/order, freeze), Insert function (ƒx), AutoSum menu, Fill (down/right/series/set values/transform), Sort and filter, Clear, Find/replace, Number format, Plot preview.
- Row and column insert/delete keep formulas correct (references shift like Excel), keep graphs linked to the right columns, and are in History.
- **More cell-formula functions:** PRODUCT, SUMSQ, COUNTA, VAR, VARP, STDEVP, MODE, PERCENTILE, QUARTILE, SKEW, CORREL, SLOPE, INTERCEPT, RSQ, SUMPRODUCT, SUMIF, COUNTIF, AVERAGEIF, IFERROR, ISNUMBER, POWER, MOD, INT, SIGN, LN, LOG(x, base), CEILING, FLOOR, ROUNDUP, ROUNDDOWN, RAND. Ctrl+D / Ctrl+R fill down / right.
- **Drawing tools stay active** until you press Esc or click Pan; a blue chip in the graph bar shows which shape you are drawing.
- View and Help menus are wider and show hints on their own line.

## Round 16: descriptions, legend, in-place editing, trendlines
- **Title, subtitle and description (caption):** Format ▸ Title and description…, the Description box in Properties, or double-click the area above/below the plot. The caption is wrapped below the graph and included in PNG/SVG/PDF exports, layouts, reports (figure caption) and PowerPoint slides.
- **Legend editor** (Format ▸ Legend…, double-click the legend, or right-click it): show/hide, position, **vertical or horizontal orientation**, number of columns, title, font size, frame, and per-entry rename/hide. Drag the legend to move it.
- **Edit in place:** double-click the title, an axis title, the description or text annotations to type directly on the graph.
- **Right-click menus:** on a graph (legend, titles/axes, shapes, series, empty plot area) and on the worksheet (column header, row number, cell) with the most useful actions for that spot.
- **Trendlines** (linear, polynomial 2/3, exponential, logarithmic, power) with equation and R² in the legend, and **point labels from a column** (Properties ▸ Trendlines and point labels).

## LabScale start page
`index.html` is the public landing page for labscale.org: an animated hero in which streams of 0 and 1 flow through a “LabScale” gate and turn into line, bar, scatter + regression, heat-map and spectrum charts drawn in monospace characters (respects reduced-motion and dark mode, pauses off-screen), followed by a four-step workflow explorer, feature cards, chart-type overview, privacy section, FAQ and an **Open** button that launches the workbench (`app.html`; `app.html?sample=spectrum` opens straight into a sample graph). `imprint.html` serves the imprint, privacy notice and licences.

**Brand:** the LabScale mark (`favicon.svg`, `logo.svg` lockup, PNG icons) shows data dots passing a dotted gate and becoming a rising chart; used on the start page, in the app header, the imprint page and as favicon. The start-page accent is the same blue as the app (#2563eb light, #5b9bff dark).

## Navigation model (single layout)
The classic ribbon has been removed. Navigation now has three levels, following the Nielsen Norman Group guidance on contextual menus (secondary actions only, visible “⋯” trigger, grouped by object, short named menus, keyboard access):
1. **Menu bar** (File, Data, Plot, Analysis, Quality, View, Help) – global commands in overlay menus with sub-categories and a filter.
2. **Context bar** under the window tabs – actions for the active window: worksheets get quick icons (insert row/column, ƒx, AutoSum, sort) plus labelled groups (Rows, Columns, AutoSum, Fill, Sort & filter, Clear, Find, Format, Plot preview); graphs get Pan/Zoom/ROI plus Tools, View, Format, Export.
3. **Contextual menus** – a visible **⋯** button (column headers, graphs, result cards) or right-click / Shift+F10 / Menu key opens a short menu for that object only; global commands are never mixed in. Menus use ARIA roles and are fully keyboard-operable (arrows, Enter, Esc, Home/End, → for sub-menus).
The View menu offers two layouts: Standard and Minimal.

## Organise
- Double-click (or F2) renames sheets, graphs, layouts, reports, folders, layout pages and window tabs inline.
- Folders in every explorer section; drag items onto folders, right-click for Move to folder / New folder / Duplicate / Delete.
- Layouts have multiple pages (page bar, reorder by drag, duplicate, rename; PDF/print export all pages).
- Drag graphs and results from the explorer or results log onto a layout page or into a report; reports support `{{pagebreak}}`.

## Round 17: guidance and data insight
- **Import assistant:** after a file is imported, a panel profiles the data (rows, numeric/date/text columns, missing values, duplicates, X-axis candidate) and suggests clean-up, plots and analyses with one click. Reopen via File ▸ Data assistant; can be switched off.
- **Results log:** resizable by dragging its top edge; the collapse arrow turns into an expand arrow (▴) when collapsed.
- **Data profile** (Data ▸ Insight): per column type, valid/missing/unique counts, min/mean/median/max/SD, outlier count and a mini distribution.
- **Mask outliers** (Data ▸ Insight): Tukey fences, far-out fences, |z| > 3 or MAD; masked rows stay in the sheet but are ignored by plots and analyses.
- **Colour-vision check** (Plot menu): preview a graph as red-green or blue-yellow colour-blind viewers or in grayscale print (display only).
- Explorer folders show a folder icon (open/closed).

## Round 18: chart wizard
File ▸ Chart wizard… (or “Open the chart wizard” in the import assistant) guides a chart from data to publication in four steps:
1. **Upload:** drop or choose a file (CSV/TSV/TXT, Excel, JSON, HTML tables, XML), paste data, or start from an example.
2. **Check & describe:** editable preview table; delimiter, decimal, header-row and skip options; rename columns, set units, choose each column’s role (X, Y, ignore); empty cells and potential outliers are highlighted, with an option to leave outliers out of the chart.
3. **Visualize:** live thumbnails of the data as ~24 chart types (more on request) next to a large preview. *Refine* (titles, axes, Y columns, scale, line width, grid), *Annotate* (text notes at data coordinates, reference lines, description and source line), *Layout* (output size presets, built-in styles, light/dark background, font size, legend position).
4. **Publish:** PNG (1–3×), copy image, SVG, PDF, EPS, responsive web page (.html), embed / SVG code to paste into a web page, PowerPoint slide, data as CSV, open in the workspace for further editing, or share the whole project as one file.
