/* DocScale project templates */
(function(){
function diagram(){
  const c=document.createElement('canvas');c.width=960;c.height=560;const g=c.getContext('2d');
  g.fillStyle='#fff';g.fillRect(0,0,960,560);
  const L=90,T=40,W=820,H=420,X=x=>L+x/10*W,Y=y=>T+H-y/1.2*H;
  g.strokeStyle='#e5e7eb';g.lineWidth=1;g.font='15px system-ui,sans-serif';g.fillStyle='#667085';
  for(let i=0;i<=5;i++){g.beginPath();g.moveTo(L,Y(i*.24));g.lineTo(L+W,Y(i*.24));g.stroke();g.textAlign='right';g.fillText((i*.24).toFixed(2),L-10,Y(i*.24)+5)}
  for(let i=0;i<=5;i++){g.textAlign='center';g.fillText(String(i*2),X(i*2),T+H+24)}
  g.strokeStyle='#1c2230';g.lineWidth=1.6;g.beginPath();g.moveTo(L,T);g.lineTo(L,T+H);g.lineTo(L+W,T+H);g.stroke();
  g.setLineDash([6,5]);g.strokeStyle='#9aa3b2';g.beginPath();g.moveTo(L,Y(1));g.lineTo(L+W,Y(1));g.stroke();g.setLineDash([]);
  g.fillStyle='#667085';g.textAlign='left';g.fillText('V_max',L+W-52,Y(1)-8);
  const f=s=>s/(1.6+s);g.strokeStyle='#2563eb';g.lineWidth=3;g.beginPath();for(let s=0;s<=10;s+=.1){const x=X(s),y=Y(f(s)*1.0);s?g.lineTo(x,y):g.moveTo(x,y)}g.stroke();
  const pts=[[.4,.2],[.8,.34],[1.5,.5],[2.5,.62],[4,.7],[6,.8],[8,.82],[9.6,.86]];
  pts.forEach(([s,v],i)=>{const y=f(s)*(1+(i%2?.05:-.06)),e=.05;g.strokeStyle='#1c2230';g.lineWidth=1.4;g.beginPath();g.moveTo(X(s),Y(y-e));g.lineTo(X(s),Y(y+e));g.stroke();g.fillStyle='#fff';g.strokeStyle='#2563eb';g.lineWidth=2.4;g.beginPath();g.arc(X(s),Y(y),6,0,7);g.fill();g.stroke()});
  g.fillStyle='#1c2230';g.font='17px system-ui,sans-serif';g.textAlign='center';g.fillText('Substrate concentration [S] (mM)',L+W/2,T+H+54);
  g.save();g.translate(28,T+H/2);g.rotate(-Math.PI/2);g.fillText('Initial velocity v (mM/s)',0,0);g.restore();
  return c.toDataURL('image/png')}

const PRE=`% Shared macros and theorem environments
\\newcommand{\\R}{\\mathbb{R}}
\\newcommand{\\E}{\\mathbb{E}}
\\newcommand{\\vmax}{V_{\\max}}
\\newcommand{\\Km}{K_{\\mathrm{m}}}
\\DeclareMathOperator{\\argmax}{arg\\,max}
\\newtheorem{theorem}{Theorem}[section]
\\newtheorem{lemma}[theorem]{Lemma}
\\newtheorem{definition}{Definition}[section]
\\newtheorem{remark}{Remark}
`;
const BIB=`@article{michaelis1913,
  author  = {Michaelis, Leonor and Menten, Maud L.},
  title   = {The kinetics of invertase action},
  journal = {Biochemische Zeitschrift},
  volume  = {49},
  pages   = {333--369},
  year    = {1913}
}

@article{briggs1925,
  author  = {Briggs, George E. and Haldane, John B. S.},
  title   = {A note on the kinetics of enzyme action},
  journal = {Biochemical Journal},
  volume  = {19},
  number  = {2},
  pages   = {338--339},
  year    = {1925},
  doi     = {10.1042/bj0190338}
}

@book{cornish2013,
  author    = {Cornish-Bowden, Athel},
  title     = {Fundamentals of Enzyme Kinetics},
  publisher = {Wiley-Blackwell},
  edition   = {4},
  year      = {2013}
}

@inproceedings{lamport1994,
  author    = {Lamport, Leslie},
  title     = {{LaTeX}: A Document Preparation System},
  booktitle = {User's Guide and Reference Manual},
  year      = {1994}
}
`;
const PAPER=`\\documentclass[11pt,a4paper]{article}
\\usepackage{preamble}
\\usepackage{amsmath,amssymb,graphicx,booktabs}

\\title{Quantitative Analysis of Enzyme Kinetics\\\\in Microfluidic Reactors}
\\author{A. Researcher\\thanks{Corresponding author.} \\and B. Colleague \\and C. Scientist}
\\date{\\today}

\\begin{document}
\\maketitle

\\begin{abstract}
We present a compact framework for estimating Michaelis--Menten parameters from time-resolved
fluorescence traces recorded in microfluidic reactors. A closed-form estimator is derived,
its saturation behaviour is proven, and the method is validated on a titration series
with $n=8$ substrate concentrations. The fitted parameters agree with bulk assays within 4\\,\\%.
\\end{abstract}

\\keywords{enzyme kinetics, microfluidics, parameter estimation}

\\section{Introduction}
Enzyme-catalysed reactions are commonly described by the rate law of
Michaelis and Menten~\\cite{michaelis1913,briggs1925}. Even the most famous formula of
physics, $E = mc^2$, is a one-liner, yet the practical details behind a fitted curve are not.
Here we focus on the \\textbf{initial velocity} $v$ as a function of the substrate
concentration $[S]$ (see Eq.~\\eqref{eq:mm}):
\\begin{equation}
  v = \\frac{\\vmax\\,[S]}{\\Km + [S]}
  \\label{eq:mm}
\\end{equation}
Displayed formulas can also be written with double dollars:
$$ \\int_{-\\infty}^{\\infty} e^{-x^2}\\,dx = \\sqrt{\\pi} $$
A thorough treatment is given in~\\cite{cornish2013}.

\\subsection{Contributions}
The main contributions of this work are:
\\begin{itemize}
  \\item a closed-form estimator for $\\vmax$ and $\\Km$,
  \\item a proof of monotone saturation (Theorem~\\ref{thm:sat}),
  \\item an open, browser-based analysis workflow.
\\end{itemize}

\\section{Theory}
\\begin{definition}
A reaction is \\emph{saturable} if $\\lim_{[S]\\to\\infty} v([S])$ exists and is finite.
\\end{definition}

\\begin{theorem}[Saturation]\\label{thm:sat}
For $\\vmax,\\Km>0$ the velocity $v$ in Eq.~\\eqref{eq:mm} is strictly increasing on $[0,\\infty)$
and converges to $\\vmax$.
\\end{theorem}
\\begin{proof}
Differentiating gives $v'([S]) = \\vmax\\Km/(\\Km+[S])^2 > 0$. Moreover
$v([S]) \\le \\vmax$ and $\\lim_{[S]\\to\\infty} v([S]) = \\vmax$.
\\end{proof}

Fitting is done by least squares, which for $N$ observations reads
\\begin{align}
  \\hat\\theta &= \\argmax_{\\theta\\in\\R^2}\; -\\sum_{i=1}^{N} \\bigl(v_i - v(S_i;\\theta)\\bigr)^2 \\\\
  \\E[\\hat\\theta] &= \\theta_0 + O(N^{-1}) \\label{eq:bias}
\\end{align}
The bias term in Eq.~\\eqref{eq:bias} is negligible for our sample sizes.

\\section{Methods}
\\subsection{Experimental setup}
Reactions were run at \\SI{25}{\\celsius} in a buffer of \\SI{50}{\\milli\\molar} Tris at pH 7.5
containing \\ce{MgCl2}. Substrate was varied between \\SI{0.4}{\\milli\\molar} and
\\SI{9.6}{\\milli\\molar}.\\footnote{Concentrations are final values after on-chip mixing.}
\\begin{enumerate}
  \\item Prime the channels with buffer.
  \\item Inject enzyme and substrate streams at equal flow rate.
  \\item Record fluorescence for \\SI{120}{\\second}.
\\end{enumerate}

\\begin{figure}[ht]
  \\centering
  \\includegraphics[width=0.8\\textwidth]{figures/diagram.png}
  \\caption{Initial velocity versus substrate concentration. Points are means of
  triplicates, the line is the least-squares fit of Eq.~\\eqref{eq:mm}.}
  \\label{fig:diagram}
\\end{figure}

\\section{Results}
Figure~\\ref{fig:diagram} shows the titration series; the fitted parameters are collected in
Table~\\ref{tab:fit}.

\\begin{table}[ht]
  \\centering
  \\caption{Fitted parameters (mean $\\pm$ s.d., $n=3$).}
  \\label{tab:fit}
  \\begin{tabular}{lccc}
    \\toprule
    Method & $\\vmax$ (mM/s) & $\\Km$ (mM) & $R^2$ \\\\
    \\midrule
    Microfluidic & $1.02 \\pm 0.03$ & $1.61 \\pm 0.09$ & 0.994 \\\\
    Bulk assay   & $0.98 \\pm 0.05$ & $1.55 \\pm 0.12$ & 0.989 \\\\
    \\bottomrule
  \\end{tabular}
\\end{table}

\\section{Conclusion}
The proposed estimator reproduces bulk parameters while using about two orders of magnitude
less enzyme. Source code and data are available on request.

\\bibliographystyle{plain}
\\bibliography{references}
\\end{document}
`;
const REPORT=`\\documentclass[11pt]{article}
\\usepackage{amsmath,graphicx}
\\title{Lab Report: Spectrophotometric Determination of Concentration}
\\author{Student Name}
\\date{\\today}
\\newcommand{\\unit}[1]{\\,\\mathrm{#1}}

\\begin{document}
\\maketitle
\\tableofcontents

\\section{Objective}
Determine the concentration of an unknown sample from its absorbance using the Beer--Lambert law,
\\begin{equation}\\label{eq:bl}
  A = \\varepsilon\\, c\\, \\ell .
\\end{equation}

\\section{Materials}
\\begin{itemize}
  \\item Spectrophotometer, cuvettes ($\\ell = 1\\unit{cm}$)
  \\item Stock solution, \\SI{10}{\\milli\\molar}
  \\item Distilled water, \\ce{H2O}
\\end{itemize}

\\section{Procedure}
\\begin{enumerate}
  \\item Prepare a dilution series from the stock solution.
  \\item Blank the instrument with distilled water.
  \\item Measure the absorbance of every dilution and of the unknown.
\\end{enumerate}

\\section{Data}
\\begin{table}[h]
\\centering
\\caption{Absorbance at 450 nm.}\\label{tab:abs}
\\begin{tabular}{|c|c|}
\\hline
$c$ (mM) & $A$ \\\\ \\hline
0.5 & 0.081 \\\\
1.0 & 0.163 \\\\
2.0 & 0.322 \\\\
Unknown & 0.245 \\\\ \\hline
\\end{tabular}
\\end{table}

\\section{Analysis}
From Eq.~\\eqref{eq:bl} and Table~\\ref{tab:abs}, the slope is $\\varepsilon\\ell \\approx 0.16\\unit{mM^{-1}}$,
so the unknown has $c \\approx 1.53\\unit{mM}$.

\\section{Discussion}
The calibration is linear over the measured range. Systematic errors arise from pipetting and
cuvette positioning.
\\end{document}
`;
const NOTE=`---
title: Laboratory Notebook
author: A. Researcher
date: today
---

[TOC]

## 2026-11-02 · Protein expression test

**Goal.** Check expression of construct *pET-28a-GFP* at three induction temperatures.

> [!NOTE] Strain: BL21(DE3). Pre-culture grown overnight at 37 °C in LB + kanamycin.

### Protocol

1. Dilute the pre-culture 1:100 into fresh LB.
2. Grow to $\\mathrm{OD}_{600} \\approx 0.6$.
3. Induce with 0.5 mM IPTG and split into three flasks.
   - 18 °C overnight
   - 25 °C for 6 h
   - 37 °C for 3 h
4. Harvest by centrifugation (4000 × g, 15 min).

### Results

| Temperature | OD600 at harvest | Fluorescence (a.u.) | Notes        |
|:------------|-----------------:|--------------------:|:-------------|
| 18 °C       |             2.10 |               8 400 | soluble      |
| 25 °C       |             2.85 |               7 900 | mostly soluble |
| 37 °C       |             3.40 |               3 100 | inclusion bodies |

Table: Fluorescence normalised to cell density.

The specific fluorescence follows $F_s = F / \\mathrm{OD}_{600}$, e.g. for 18 °C

$$ F_s = \\frac{8400}{2.10} = 4000 \;\\text{a.u.} $$

![Example fit of kinetic data (placeholder figure).](figures/diagram.png){width=70%}

> [!WARNING] Do not store induced cultures at room temperature overnight.

### To do

- [x] Run SDS-PAGE of soluble fractions
- [ ] Purify the 18 °C sample on Ni-NTA
- [ ] Repeat at 30 °C

Method adapted from [@cornish2013]. A footnote example.[^1]

[^1]: Footnotes are collected at the end of the document.

\\newpage

## 2026-11-03 · Purification

\`\`\`bash
# Equilibrate the column
buffer_A="50 mM Tris pH 8.0, 300 mM NaCl, 10 mM imidazole"
\`\`\`

Yield: ~4 mg per litre of culture.
`;
const NOTEBIB=BIB.split('@inproceedings')[0];
const SLIDE=`# Untitled document

Write in **Markdown** with inline math $a^2+b^2=c^2$ and display math:

$$ \\sum_{k=1}^{n} k = \\frac{n(n+1)}{2} $$
`;
const T={
  paper:{label:'Scientific paper (LaTeX)',desc:'Abstract, theorem, figure, table and bibliography',main:'main.tex',make:()=>[{path:'main.tex',text:PAPER},{path:'references.bib',text:BIB},{path:'preamble.sty',text:PRE},{path:'figures/diagram.png',bin:diagram()}]},
  report:{label:'Lab report (LaTeX)',desc:'Objective, procedure, data table, analysis',main:'main.tex',make:()=>[{path:'main.tex',text:REPORT}]},
  notebook:{label:'Lab notebook (Markdown)',desc:'Dated entries, protocols, tables, callouts',main:'notebook.md',make:()=>[{path:'notebook.md',text:NOTE},{path:'references.bib',text:NOTEBIB},{path:'figures/diagram.png',bin:diagram()}]},
  blank:{label:'Blank Markdown document',desc:'An empty page',main:'document.md',make:()=>[{path:'document.md',text:SLIDE}]}
};
window.DST={templates:T,diagram};
})();
