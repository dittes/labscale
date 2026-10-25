'use strict';
// Clustered overlay navigation: menu bar with mega-dropdowns and sub-sections, condensed header.
const MENUS=[
  {n:'File',tabs:['File']},
  {n:'Data',tabs:['Column']},
  {n:'Plot',tabs:['Plot']},
  {n:'Analysis',tabs:['Statistics','Fitting','Peaks & Baseline','Signal','Multivariate'],sections:true},
  {n:'Quality',tabs:['Quality']},
  {n:'View',custom:'view'},
  {n:'Help',custom:'help'}];
function navRun(tab,gi,ii){const it=RIB[tab][gi][1][ii];if(!it)return;const needSheet=['Column','Plot','Statistics','Fitting','Peaks & Baseline','Signal','Multivariate','Quality'].includes(tab)&&!['Function plot','Multi-panel','Script','Function builder','Simulate curve','Stats advisor','Template gallery'].includes(it[0]);
  if(needSheet&&!curSheet())return alert('Create or import a sheet first.');try{it[2]()}catch(err){alert('Error: '+err.message);console.error(err)}}
const navEsc=s=>String(s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
function navIcon(it){const[l,ic,fn,svg]=it;return svg?`<svg viewBox="0 0 24 24">${ic}</svg>`:`<i>${navEsc(String(ic).slice(0,4))}</i>`}
const SUBCATS={
 'Statistics':[['Descriptive & distributions',/Descriptive|Normality|Distribution Fit|Grubbs|Dixon|Discrete Frequency|Statistics of Y|2D Frequency|Matrix Statistics/],['Non-parametric tests',/Mann|Kruskal|Wilcoxon|Sign|Mood|Friedman|Kolmogorov/],['Survival and power',/Kaplan|Cox|Weibull|Power/],['Proportions and variance',/Proportion|Variance/],['Compare means (t-tests, ANOVA)',/t-|ANOVA|Welch|Dunnett|ANCOVA/],['Categorical data',/Chi-Square|Fisher|Cross Tab/],['Correlation and models',/Correlation|Logistic|Generalized|ROC/],['Guide',/advisor/i]],
 'Fitting':[['Regression',/Linear Regression|Polynomial|Multiple Linear/],['Curve fitting',/Nonlinear|Global|Dose|Standard Curve|X and Y Errors|Compare Two|Rank Models|Circle|Surface|Differential/],['Functions',/Function builder|Simulate/]],
 'Signal':[['Smoothing and filtering',/Smooth|FIR|Butterworth|FFT Filter|Decimate/],['Transforms',/^FFT$|Inverse FFT|Hilbert|Spectrogram|Spectral|Wavelet|2D FFT/],['Calculus and resampling',/Differentiate|Integrate|Interpolate|Normalize|Envelope Curves/],['Correlation and convolution',/Correlation|Convolution|Deconvolution/]],
 'Multivariate':[['Reduction and clustering',/Principal|K-Means|Hierarchical|Partial Least|Discriminant/],['Classification',/Decision Tree/],['Matrix and counts',/XYZ|Matrix|Frequency Counts/]]};
function subcatGroups(tab){const items=(RIB[tab]||[]).flatMap((g,gi)=>g[1].map((it,ii)=>({it,gi,ii}))),rules=SUBCATS[tab];if(!rules)return(RIB[tab]||[]).map(([gn,its],gi)=>({name:gn,items:its.map((it,ii)=>({it,gi,ii}))}));
  const out=rules.map(([n])=>({name:n,items:[]})),rest=[];items.forEach(x=>{const k=rules.findIndex(([n,re])=>re.test(x.it[0]));(k>=0?out[k].items:rest).push(x)});if(rest.length)out.push({name:'More',items:rest});return out.filter(g=>g.items.length)}
function viewItems(){const b=document.getElementById('body'),res=document.getElementById('results'),ws=document.body.dataset.ws||'studio',ck=v=>v?'✓':'';
  return[['Layout',[['Standard','Menus, context bar, tool strip, panels',()=>setWorkspace('studio'),ws!=='minimal'],['Minimal','Canvas first, panels hidden',()=>setWorkspace('minimal'),ws==='minimal']]],
    ['Panels',[['Project explorer','',()=>b.classList.toggle('noexp'),!b.classList.contains('noexp')],['Properties','',()=>b.classList.toggle('noprops'),!b.classList.contains('noprops')],['Results log','',()=>res.classList.toggle('min'),!res.classList.contains('min')],['Hide all panels','Tab',()=>{document.body.classList.toggle('focus');if(typeof redrawGraph==='function')setTimeout(redrawGraph,30)},document.body.classList.contains('focus')]]],
    ['History',[['History panel','Every step, jump back',()=>histToggle()],['Undo','Ctrl+Z',()=>undo()],['Redo','Ctrl+Shift+Z',()=>redo()]]],
    ['Appearance',[['Settings…','Theme, report format',()=>workspaceDialog()]]]]}
function helpItems(){return[['Help',[['Help and shortcuts','?',()=>helpDialog()],['Guided tour','',()=>startTour()],['Search commands','Ctrl+K',()=>openPalette()]]],['Legal',[['Imprint','',()=>legalDialog('imprint')],['Privacy','',()=>legalDialog('privacy')],['Licences','',()=>legalDialog('licences')]]]]}
function megaHTML(m){let h='';
  const row=(a,b,c,d,x)=>`<button class="mi" ${x}><span class="mic">${a}</span><span class="mil">${navEsc(b)}</span>${c?`<span class="mih">${navEsc(c)}</span>`:''}${d===true?'<span class="mck">✓</span>':''}</button>`;
  if(m.custom){const sets=m.custom==='view'?viewItems():helpItems();sets.forEach(([t,its],si)=>{h+=`<div class="mg"><h5>${navEsc(t)}</h5>${its.map(([l,hint,fn,chk],ii)=>row(chk?'✓':'',l,hint,false,`data-c="${m.custom}" data-s="${si}" data-i="${ii}"`)).join('')}</div>`});return h}
  m.tabs.forEach(tab=>{if(m.sections)h+=`<h4 class="ms">${navEsc(tab)}</h4>`;const hasSub=SUBCATS[tab];subcatGroups(tab).forEach(g=>{h+=`<div class="mg">${(m.sections&&!hasSub&&(RIB[tab]||[]).length===1)?'':`<h5>${navEsc(g.name)}</h5>`}${g.items.map(x=>row(navIcon(x.it),x.it[0],'',false,`data-t="${navEsc(tab)}" data-g="${x.gi}" data-i="${x.ii}"`)).join('')}</div>`})});return h}
let megaOpen=null;
function closeMega(){document.getElementById('mega')?.remove();megaOpen=null;document.querySelectorAll('#mbar button.on').forEach(b=>b.classList.remove('on'))}
function openMega(idx,btn){closeMega();const m=MENUS[idx];megaOpen=idx;btn.classList.add('on');const el=document.createElement('div');el.id='mega';const r=document.getElementById('top').getBoundingClientRect();el.style.top=r.bottom+'px';
  const wide=!m.custom;el.innerHTML=`${wide?'<div class="mf"><input type="search" placeholder="Filter this menu…" autocomplete="off"></div>':''}<div class="mcols ${wide?'':'narrow'}">${megaHTML(m)}</div>`;document.body.append(el);
  const bl=btn.getBoundingClientRect();if(wide){el.style.left=Math.max(8,Math.min(bl.left,innerWidth-Math.min(1000,innerWidth-16)-8))+'px';el.style.width=Math.min(1000,innerWidth-16)+'px'}else{el.style.left=Math.max(8,Math.min(bl.left,innerWidth-392))+'px';el.style.width='380px'}
  const inp=el.querySelector('input');if(inp){inp.focus();inp.oninput=()=>{const q=inp.value.trim().toLowerCase();el.querySelectorAll('.mi').forEach(b=>b.style.display=!q||b.textContent.toLowerCase().includes(q)?'':'none');el.querySelectorAll('.mg').forEach(g=>{g.style.display=[...g.querySelectorAll('.mi')].some(b=>b.style.display!=='none')?'':'none'});el.querySelectorAll('.ms').forEach(h=>{let n=h.nextElementSibling,any=false;while(n&&n.classList.contains('mg')){if(n.style.display!=='none')any=true;n=n.nextElementSibling}h.style.display=any?'':'none'})};
    inp.onkeydown=e=>{if(e.key==='Enter'){const f=[...el.querySelectorAll('.mi')].find(b=>b.style.display!=='none');if(f)f.click()}}}
  el.onclick=e=>{const b=e.target.closest('.mi');if(!b)return;const d=b.dataset;closeMega();if(d.c){const sets=d.c==='view'?viewItems():helpItems();setTimeout(()=>sets[+d.s][1][+d.i][2](),0)}else setTimeout(()=>navRun(d.t,+d.g,+d.i),0)}}
function buildMenubar(){const top=document.getElementById('top');let mb=document.getElementById('mbar');if(!mb){mb=document.createElement('nav');mb.id='mbar';top.insertBefore(mb,document.getElementById('rtabs'))}
  mb.innerHTML=MENUS.map((m,i)=>`<button data-i="${i}">${m.n}</button>`).join('');
  mb.onclick=e=>{const b=e.target.closest('button');if(!b)return;if(megaOpen===+b.dataset.i)closeMega();else openMega(+b.dataset.i,b)};
  mb.onmouseover=e=>{const b=e.target.closest('button');if(b&&megaOpen!==null&&megaOpen!==+b.dataset.i)openMega(+b.dataset.i,b)};
  if(!document.getElementById('bSearch')){const s=document.createElement('button');s.id='bSearch';s.title='Search every command (Ctrl+K)';s.innerHTML='⌘K <span>Search</span>';s.onclick=()=>openPalette();top.insertBefore(s,document.getElementById('bUndo'))}}
document.addEventListener('mousedown',e=>{if(megaOpen!==null&&!e.target.closest('#mega,#mbar'))closeMega()});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMega()});
buildMenubar();
{const st=document.createElement('style');st.textContent=`#mbar{display:none;gap:2px;margin-right:6px}#mbar button{border:0;background:none;padding:5px 11px;border-radius:6px;color:var(--ink);font-size:13px}#mbar button:hover,#mbar button.on{background:var(--acc2);color:var(--acc)}
body[data-ws=studio] #mbar,body[data-ws=minimal] #mbar{display:flex}body[data-ws=studio] #rtabs,body[data-ws=minimal] #rtabs{display:none}body[data-ws=studio] #bExp,body[data-ws=studio] #bProps,body[data-ws=studio] #bRes,body[data-ws=studio] #bHist,body[data-ws=minimal] #bExp,body[data-ws=minimal] #bProps,body[data-ws=minimal] #bRes,body[data-ws=minimal] #bHist{display:none}
#bSearch{display:none;border:1px solid var(--line);background:var(--panel2);border-radius:7px;padding:4px 10px;color:var(--mut);font-size:12px}#bSearch span{margin-left:4px}body[data-ws=studio] #bSearch,body[data-ws=minimal] #bSearch{display:inline-block}
#mega{position:fixed;z-index:80;background:var(--panel);border:1px solid var(--line);border-top:0;border-radius:0 0 12px 12px;box-shadow:0 22px 60px rgba(0,0,0,.4);max-height:calc(100vh - 70px);overflow:auto;padding:10px 14px 14px}
#mega .mf{position:sticky;top:-10px;background:var(--panel);padding:4px 0 8px;z-index:2}#mega .mf input{width:100%;padding:7px 10px;border:1px solid var(--line);border-radius:8px;background:var(--panel2);color:var(--ink)}
#mega .mcols{column-width:215px;column-gap:20px}#mega .mcols.narrow{column-width:auto;column-count:1}#mega .mg{break-inside:avoid;margin-bottom:12px}#mega h5{margin:0 0 4px;font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;color:var(--mut);padding:0 8px}
#mega h4.ms{column-span:all;margin:10px 0 4px;padding:4px 8px;font-size:12px;background:var(--panel2);border-radius:6px;color:var(--acc)}
#mega .mi{display:flex;align-items:center;gap:8px;width:100%;border:0;background:none;text-align:left;padding:4px 8px;border-radius:6px;color:var(--ink);font-size:13px;cursor:pointer}#mega .mi:hover{background:var(--acc2)}
#mega .mic{width:30px;flex:none;text-align:center;color:var(--acc);font-size:12px;overflow:hidden}#mega .mic i{font-style:normal}#mega .mic svg{width:16px;height:16px;stroke:var(--acc);fill:none;stroke-width:1.8;vertical-align:middle}
#mega .mcols.narrow .mi{display:grid;grid-template-columns:28px 1fr;align-items:center;padding:6px 8px;row-gap:0}#mega .mcols.narrow .mil{white-space:normal;overflow:visible;font-size:13.5px}#mega .mcols.narrow .mih{grid-column:2;font-size:11.5px;margin-top:1px}#mega .mcols.narrow .mic{width:auto;text-align:left}#mega .mil{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#mega .mih{color:var(--mut);font-size:11px}#mega .mck{color:var(--acc)}`;document.head.append(st)}
