# DocScale: lab books and documents

A browser-based editor for lab notebooks, reports and papers. Write **LaTeX** or **Markdown**, see a paginated A4 / Letter preview while you type, and export to PDF, Word, HTML, EPUB, Markdown, plain text or a ZIP of the project. Static files only, no build step: open `DocScale/index.html` from a web server (for example `python3 -m http.server 8765`) and go to `/DocScale/`.

Projects live in the browser (`localStorage`). Use **Export → Project backup (.json)** to move them elsewhere.

## Using it

- **Dashboard**: new project from a template (scientific paper, lab report, lab notebook, blank Markdown), rename, duplicate, delete, backup, import `.json` backups or loose `.tex` / `.md` / `.bib` / image files.
- **Header**: back to dashboard, editable project name, save status (Saved / Unsaved changes / Compiling…), auto-compile switch (800 ms debounce, adjustable in Settings), Recompile with timestamp and duration, PDF, Export menu, Raw view (compiled HTML with math collapsed to TeX), Settings, layout switch (Code / Split / Preview). `Ctrl/Cmd+Enter` compiles, `Ctrl/Cmd+S` saves, `Ctrl/Cmd+J` jumps to the cursor position in the preview, `Ctrl/Cmd+\` cycles the layout.
- **Files**: tree with folders, new file / folder, upload (text and images), rename, delete, duplicate, set as main document, drag a file onto a folder to move it, right-click or hover icons. The **Outline** below lists the headings of the main document.
- **Editor**: tabs with close buttons and unsaved dots, syntax highlighting for LaTeX, Markdown and BibTeX, line numbers, word wrap, bracket matching, auto-closing brackets, auto-indent, `\begin{…}` auto-`\end{…}`, list continuation in Markdown, code folding (sections, environments, headings, fences, BibTeX entries), find / replace (`Ctrl/Cmd+F`), comment toggle (`Ctrl/Cmd+/`), `Ctrl/Cmd+B` / `I`, insert menus (figures, tables, theorems, citations from your `.bib`, references from your `\label`s), error and warning markers in the gutter, cursor position, character and word counts in the status bar.
- **Preview**: paged sheets with page numbers, zoom (buttons, `Ctrl`+wheel, fit to width), page navigation, a compile log with clickable problems. Click any block in the preview to jump to its source line; the preview follows the editor cursor.

## What the compiler understands

This is a client-side approximation of LaTeX, not a TeX engine. Output is HTML laid out into pages.

- **LaTeX**: `\documentclass`, `\title` / `\author` / `\date` / `\maketitle`, abstract, `\section` to `\paragraph` (numbered or starred), `\appendix`, `\tableofcontents` (with page numbers), `\label` / `\ref` / `\eqref` / `\autoref`, `\cite` family with a BibTeX file or `thebibliography` (numeric or author-year), footnotes, itemize / enumerate / description, equation / align / gather / multline and `$…$`, `\[…\]`, `$$…$$` (rendered by the bundled KaTeX), theorem-like environments via `\newtheorem`, proofs, figures and tables with captions, `tabular` (with `\hline`, booktabs rules, `\multicolumn`), `\includegraphics` for project images, verbatim and listings, quotes, `\newcommand` / `\def` / `\DeclareMathOperator`, `\input` / `\include` and `\usepackage{local-file}`, accents, `\SI{}{}` and `\ce{}` for units and formulas, `\verb`, `\href` / `\url`, page breaks.
- **Markdown**: headings, emphasis, lists and task lists, tables with alignment and `Table:` captions, fenced code, blockquotes and `> [!NOTE]` callouts, links, images with `{width=50%}`, inline and display math, footnotes, `[@key]` citations, `[TOC]`, YAML front matter (`title`, `author`, `date`, `abstract`), `\newpage`.
- Unsupported commands and environments (TikZ, custom environments, …) produce a warning in the compile log instead of failing.

## Exports

| Format | Notes |
|---|---|
| PDF | Uses the browser print dialog with exact page size; choose "Save as PDF". |
| Word (.docx) | Headings, paragraphs, lists, tables, images, captions. Equations are written as TeX text. |
| HTML (.html) | Standalone page, KaTeX fonts embedded when the document has math (needs to be served over http). |
| EPUB (.epub) | Math as MathML, images embedded. |
| Markdown, plain text | Generated from the compiled document; math is kept as `$…$`. |
| Source, .bib, ZIP, backup | Main file, bibliography, all project files, re-importable JSON. |

## Files

`index.html` (app shell), `css/app.css` (UI, same design tokens as LabScale), `css/paper.css` (document typography, also used by the HTML and EPUB exports), `js/compile.js` (LaTeX, Markdown and BibTeX to HTML), `js/editor.js` (code editor), `js/export.js` (ZIP writer, DOCX, EPUB, Markdown, text, HTML), `js/templates.js` (starter projects), `js/app.js` (UI, pagination, projects). KaTeX 0.16.11 (MIT) is bundled in `vendor/katex/`; nothing is loaded from a CDN.
