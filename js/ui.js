'use strict';
// ===== UI: windows, explorer, ribbon, dialogs, properties, results, analysis runner, init =====
function openWin(t,id){if(!P.open.some(w=>w.t===t&&w.id===id))P.open.push({t,id});P.act={t,id};showWin()}
function closeWin(t,id){P.open=P.open.filter(w=>!(w.t===t&&w.id===id));if(P.act&&P.act.t===t&&P.act.id===id)P.act=P.open[P.open.length-1]||null;showWin()}
function showWin(){
  const a=P.act;$('#sheetWin').hidden=!(a&&a.t==='sheet');$('#graphWin').hidden=!(a&&a.t==='graph');$('#layoutWin').hidden=!(a&&a.t==='layout');$('#noteWin').hidden=!(a&&a.t==='note');$('#empty').hidden=!!a;renderTabs();renderExplorer();
  if(a&&(a.t==='layout'||a.t==='note')){if(!winObj(a.t,a.id)){P.act=null;return showWin()}requestAnimationFrame(()=>a.t==='layout'?renderLayout():renderNote())}
  if(a&&a.t==='sheet'){if(!sheetById(a.id)){P.act=null;return showWin()}gsel={c0:0,r0:0,c1:0,r1:0,extra:new Set()};cur={r:0,c:0};gridEl().scrollTop=0;renderGrid()}
  if(a&&a.t==='graph'){if(!graphById(a.id)){P.act=null;return showWin()}requestAnimationFrame(()=>{chart.mode=gmode;redrawGraph()})}
  renderProps();dirty();if(typeof gadgetRefresh==='function')gadgetRefresh()}
function initShell(){
  $('#wintabs').addEventListener('click',e=>{const t=e.target.closest('.wt');if(!t)return;if(e.target.dataset.close){closeWin(t.dataset.t,+t.dataset.id);return}P.act={t:t.dataset.t,id:+t.dataset.id};showWin()});
  $('#explorer').addEventListener('click',e=>{if(e.target.id==='exNew')return newSheetCmd();if(e.target.id==='exLay')return newLayoutDialog();if(e.target.id==='exNote')return newNoteCmd();if(e.target.id==='exRes'){$('#results').classList.remove('min');return}const it=e.target.closest('.it');if(!it)return;const t=it.dataset.t,id=+it.dataset.id;
    if(e.target.dataset.del){if(!confirm('Delete this '+t+'?'))return;snap();if(t==='sheet'){P.graphs=P.graphs.filter(g=>g.sheetId!==id);P.sheets=P.sheets.filter(s=>s.id!==id)}else if(t==='layout')P.layouts=P.layouts.filter(l=>l.id!==id);else if(t==='note')P.notes=P.notes.filter(l=>l.id!==id);else P.graphs=P.graphs.filter(g=>g.id!==id);
      P.open=P.open.filter(w=>winObj(w.t,w.id));if(!P.act||!winObj(P.act.t,P.act.id))P.act=P.open[P.open.length-1]||null;showWin();return}
    openWin(t,id)});
  $('#bUndo').onclick=undo;$('#bRedo').onclick=redo;
  $('#bExp').onclick=()=>$('#body').classList.toggle('noexp');$('#bProps').onclick=()=>$('#body').classList.toggle('noprops');
  $('#bRes').onclick=()=>$('#results').classList.toggle('min');$('#rHide').onclick=()=>$('#results').classList.add('min');
    $('#rClear').onclick=()=>{P.results=[];renderResults();renderExplorer()};$('#rExport').onclick=exportReport;
  $('#fileIn').onchange=e=>{[...e.target.files].forEach(importFile);e.target.value=''};
  document.addEventListener('dragover',e=>e.preventDefault());document.addEventListener('drop',e=>{e.preventDefault();[...e.dataTransfer.files].forEach(importFile)});
  document.addEventListener('keydown',e=>{if(e.target.closest('input,textarea,select')||document.querySelector('dialog[open]'))return;const m=e.ctrlKey||e.metaKey;if(m&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo()}else if(m&&e.key.toLowerCase()==='y'){e.preventDefault();redo()}})}
function newSheetCmd(){snap();const sh=mkSheet(`Sheet${P.nid}`,[{name:'X',des:'X'},{name:'Y',des:'Y'}]);openWin('sheet',sh.id);dirty()}

// ===== Dialog builder =====
function dialog({title,fields,ok='OK',vals={},hint,sheet,onOk}){
  const sh=sheet||curSheet(),dlg=document.createElement('dialog');dlg.className='dlg';
  const colOpts=(f,v)=>(f.none?`<option value="-1" ${v===-1?'selected':''}>${f.noneLabel||'(new column)'}</option>`:'')+sh.cols.map((c,i)=>`<option value="${i}" ${(Array.isArray(v)?v.includes(i):v===i)?'selected':''}>${esc(colLabel(sh,i))}</option>`).join('');
  const fh=fields.map(f=>{const v=vals[f.k]??f.def;const id='f_'+f.k;
    switch(f.t){case'col':return`<div class="f"><label for="${id}">${f.label}</label><select id="${id}">${colOpts(f,v)}</select></div>`;
      case'cols':return`<div class="f"><label for="${id}">${f.label} <span class="note">(Ctrl/Shift-click for several)</span></label><select id="${id}" multiple>${colOpts(f,v)}</select></div>`;
      case'num':return`<div class="f"><label for="${id}">${f.label}</label><input id="${id}" type="number" step="any" value="${v}"></div>`;
      case'sel':return`<div class="f"><label for="${id}">${f.label}</label><select id="${id}">${(typeof f.opts==='function'?f.opts():f.opts).map(([k,l])=>`<option value="${esc(k)}" ${String(v)===String(k)?'selected':''}>${esc(l)}</option>`).join('')}</select></div>`;
      case'chk':return`<div class="f c"><input id="${id}" type="checkbox" ${v?'checked':''}><label for="${id}">${f.label}</label></div>`;
      case'msel':return`<div class="f"><label for="${id}">${f.label}</label><select id="${id}" multiple>${f.opts.map(([k,l])=>`<option value="${esc(k)}" ${(v||[]).map(String).includes(String(k))?'selected':''}>${esc(l)}</option>`).join('')}</select></div>`;
      case'area':return`<div class="f"><label for="${id}">${f.label}</label><textarea id="${id}" rows="${f.rows||10}" spellcheck="false" style="font:12px ui-monospace,Menlo,monospace;width:100%">${esc(v??'')}</textarea></div>`;
      case'txt':return`<div class="f"><label for="${id}">${f.label}</label><input id="${id}" type="text" value="${esc(v??'')}" spellcheck="false"></div>`}}).join('');
  dlg.innerHTML=`<form method="dialog"><h3>${title}</h3>${hint?`<p class="hint">${hint}</p>`:''}<div class="fl">${fh}</div><div class="fb"><button type="button" class="cancel">Cancel</button><button class="p" value="ok">${ok}</button></div></form>`;
  document.body.append(dlg);dlg.showModal();
  const close=()=>{dlg.close();dlg.remove()};$('.cancel',dlg).onclick=close;dlg.addEventListener('cancel',()=>dlg.remove());
  $('form',dlg).onsubmit=e=>{e.preventDefault();const a={};fields.forEach(f=>{const el=$('#f_'+f.k,dlg);a[f.k]=f.t==='col'?+el.value:f.t==='cols'?[...el.selectedOptions].map(o=>+o.value):f.t==='num'?parseFloat(el.value):f.t==='chk'?el.checked:f.t==='msel'?[...el.selectedOptions].map(o=>o.value):el.value});close();onOk(a)};
  const first=$('select,input,textarea',dlg);first&&first.focus()}

// ===== Analyses =====
const lastArgs={};
function defaultsFor(def,sh){
  const sel=selectedCols().filter(i=>sh.cols[i]),isX=i=>sh.cols[i].des==='X',notX=sel.filter(i=>!isX(i));
  const allY=sh.cols.map((_,i)=>i).filter(i=>!NONY.includes(sh.cols[i].des)),multi=notX.length>1;
  let yc=multi?notX:[...notX,...allY.filter(i=>!notX.includes(i))];if(!yc.length)yc=sh.cols.map((_,i)=>i);const ycAll=multi?notX:(allY.length?allY:yc);
  const xc=sel.find(isX)??sh.cols.findIndex((c,i)=>isX(i)),xcols=sh.cols.map((_,i)=>i).filter(isX),v={};let yi=0;
  def.fields.forEach(f=>{if(f.t==='col'&&f.none){v[f.k]=-1}else if(f.t==='col'){v[f.k]=f.role==='x'?(xc>=0?xc:0):(yc[Math.min(yi++,yc.length-1)]??0)}
    else if(f.t==='cols'){v[f.k]=f.role==='x'?(xcols.length?xcols:yc.slice(1)):ycAll.slice()}});
  const mem=lastArgs[def.id]&&lastArgs[def.id].sheet===sh.id?lastArgs[def.id].a:{};
  def.fields.forEach(f=>{if(mem[f.k]!==undefined&&f.t!=='col'&&f.t!=='cols')v[f.k]=mem[f.k]});
  if(def.id==='mlr'&&Array.isArray(v.xs)){v.xs=v.xs.filter(c=>c!==v.y);if(!v.xs.length)v.xs=xcols.filter(c=>c!==v.y)}
  return v}
function openAnalysis(id,pv,so){const def=A.defs[id],sh=curSheet();if(!sh)return alert('Open a sheet first.');
  const hasX=def.fields.some(f=>f.t==='col'&&f.k==='x'),fields=hasX?[...def.fields,{t:'txt',k:'_xlo',label:'Limit X range: from (blank = all)',def:''},{t:'txt',k:'_xhi',label:'Limit X range: to (blank = all)',def:''}]:def.fields;
  dialog({title:def.label,fields,vals:defaultsFor(def,sh),sheet:sh,ok:'Run',onOk:a=>{['_xlo','_xhi'].forEach(k=>{if(a[k]!==undefined){const v=parseFloat(a[k]);if(Number.isFinite(v))a[k]=v;else delete a[k]}});lastArgs[id]={sheet:sh.id,a};runAnalysis(id,a,sh)}})}
function runAnalysis(id,args,sh,opts={}){
  const def=A.defs[id];let res;try{res=def.run(args,ctxForArgs(sh,args))}catch(e){console.error(e);res={html:`<p class="err">Analysis failed: ${esc(/call stack|array length|too large|out of memory/i.test(e.message)?'the data are too large or have too many distinct levels for this analysis. Check that factor columns contain categories, not continuous values.':e.message)}</p>`}}
  if(!opts.quiet)snap();const added=[];
  (res.cols||[]).forEach(c=>{const ci=addColumn(sh,c.name,c.des||'Y',c.d.map(v=>Number.isFinite(v)?v:NaN),c.unit||'');sh.cols[ci].cid=uid();added.push(ci)});
  let note='',outSheet=null;
  if(res.sheet){outSheet=mkSheet(`${res.sheet.name}${P.nid}`,res.sheet.cols,{isMatrix:res.sheet.isMatrix,xv:res.sheet.xv,yv:res.sheet.yv});note=`<p class="note">Created sheet “${esc(outSheet.name)}”.</p>`}
  const ycols=args.y!==undefined?[args.y]:(args.ys||null);let g=null;
  if(res.curves||res.marks){g=curGraph()&&curGraph().sheetId===sh.id?curGraph():P.graphs.find(q=>q.sheetId===sh.id&&q.series.some(s=>ycols&&ycols.includes(s.y)&&(args.x===undefined||s.x===args.x)));
    if(!g&&ycols)g=autoGraph(sh,args.x,ycols);
    if(g){if(res.curves)g.curves=mapCurves(res.curves,g.xdate);g.marks=(res.marks||(res.curves?[]:g.marks)).map(mk=>g.xdate&&res.marks?{...mk,x:mk.x*864e5}:mk);g.view=null;if(res.graphOpts&&g.series.length&&!g.optsApplied){Object.assign(g,res.graphOpts);g.optsApplied=true}}}
  if(res.plot&&added.length&&!opts.quiet){const pl=res.plot;g=newGraph(sh,pl.type,pl.series.map(([xi,yi,label])=>({x:typeof xi==='object'?xi.col:added[xi],y:added[yi],label})),{xl:pl.xl||'',yl:pl.yl||'',connect:pl.connect||'straight',lw:pl.lw,legend:pl.series.length>1?'tr':'none'})}
  if(res.newGraph&&!opts.quiet){g=graphDefaults(sh.id,res.newGraph.type);g.id=uid();g.name=`${GTYPES[g.type]||g.type} ${g.id}`;Object.assign(g,res.newGraph.props||{});P.graphs.push(g)}
  if(res.sheet&&res.sheet.plot&&outSheet&&!opts.quiet){g=graphDefaults(outSheet.id,res.sheet.plot);g.id=uid();g.name=`${GTYPES[g.type]} ${g.id}`;g.xl='Time';g.yl='Frequency';g.cmap='plasma';P.graphs.push(g)}
  addResult(def.label,sh.name+(args.y!==undefined&&sh.cols[args.y]?` · ${sh.cols[args.y].name||L(args.y)}`:''),(res.html||'')+note,{defId:id,args,sheetId:sh.id,cids:added.map(i=>sh.cols[i].cid),graphId:g&&g.id,outSheetId:outSheet&&outSheet.id,note});
  dirty();if(opts.quiet)return;
  if(g&&!(P.act&&P.act.t==='graph'&&P.act.id===g.id))openWin('graph',g.id);else if(P.act&&P.act.t==='graph')redrawGraph(true);else{renderGrid();renderExplorer()}
  if(added.length&&P.act&&P.act.t==='sheet'){renderGrid()}}
function autoGraph(sh,x,ys){ys=[].concat(ys);const g=newGraph(sh,'scatter',ys.map(y=>({y,x:x!==undefined&&x>=0?x:null})),{xl:unitLbl(sh.cols[x],'X'),yl:ys.length===1?unitLbl(sh.cols[ys[0]],'Y'):'',legend:ys.length>1?'tr':'none'});g.name=`Fit graph ${g.id}`;return g}
function addResult(title,where,html,meta={}){const r={id:uid(),title,where,time:new Date().toLocaleTimeString(),html,live:true,...meta};P.results.unshift(r);renderResults();$('#results').classList.remove('min');renderExplorer();return r}
function renderResults(){$('#rlist').innerHTML=P.results.map(r=>`<div class="rc" data-id="${r.id}"><div class="h"><b>${esc(r.title)}</b><span class="note">${esc(r.where)} · ${esc(r.time)}</span><span class="sp"></span>${r.defId?`<label class="note" title="Re-run automatically when the data changes"><input type="checkbox" data-live="${r.id}" ${r.live?'checked':''}> auto-update</label><button data-recalc="${r.id}" title="Recalculate now">⟳</button><button data-batch="${r.id}" title="Run the same analysis on every other sheet">All sheets</button><button data-ally="${r.id}" title="Repeat for every other Y column">All Y</button><button data-dup="${r.id}" title="Reopen the dialog with these settings">Edit</button>`:''}<button data-rcopy="${r.id}" title="Copy as text">Copy</button><button class="kebab" type="button" data-rk="${r.id}" title="Result options" aria-label="Result options" aria-haspopup="menu">⋯</button><button class="x" data-rdel="${r.id}">✕</button></div>${r.html}</div>`).join('')||'<div class="note" style="padding:8px">Run an analysis from the Statistics, Fitting, Peaks, Signal or Multivariate tabs. Results appear here and update automatically when you change the data.</div>'}
function reportBody(){return [...P.results].reverse().map(r=>`<div class="rc"><h3>${esc(r.title)} <small class="note">${esc(r.where)} · ${esc(r.time)}</small></h3>${r.html}</div>`).join('')+(P.graphs.length?'<h2>Graphs</h2>'+P.graphs.map(g=>`<figure class="pf"><img src="${graphToPNGUrl(g,2)}" alt="${esc(g.name)}" style="max-width:100%"><figcaption>${esc(g.name)}${g.desc?' — '+esc(g.desc):''}</figcaption></figure>`).join(''):'')}
function exportReport(){reportExport('LabScale Report',()=>'<h1>LabScale Report</h1><p>'+new Date().toLocaleString()+'</p>'+reportBody())}
// ===== Column-op dialogs =====
let lastScript='# example\nsheet Spectrum\nD = B*2\nrun peakfind x=A y=B thr=5\nplot line B\n';
const COLOP={
  setvals(){const sh=curSheet(),c=selectedCols()[0];dialog({title:'Set Column Values',fields:[{t:'col',k:'t',label:'Target column',none:true,def:c??-1},{t:'txt',k:'e',label:'Expression (row-wise)',def:'sin(A)*B'},{t:'chk',k:'auto',label:'Keep updated (formula column)',def:true}],hint:'Columns by letter (A, B, …), <code>i</code> = row number, <code>n</code> = row count. Math functions: sin, exp, sqrt, ln, log (base 10), abs, pow, …',onOk:a=>{try{snap();const v=rowsEval(sh,a.e);let ci=a.t;if(ci<0)ci=addColumn(sh,'Calc','Y');sh.cols[ci].d=v.map(x=>Number.isFinite(x)?x:NaN);sh.cols[ci].formula=a.auto?a.e:undefined;dirty();renderGrid();renderExplorer();redrawGraph();dataChanged(sh.id)}catch(e){alert('Expression error: '+e.message)}}})},
  fill(){const sh=curSheet(),c=selectedCols()[0]??0;dialog({title:'Fill Column with Series',fields:[{t:'col',k:'c',label:'Column',def:c},{t:'sel',k:'kind',label:'Type',def:'linear',opts:[['linear','Linear: start + step·i'],['geom','Geometric: start · ratio^i'],['rows','Row numbers 1…n'],['uniform','Uniform random (min, max)'],['normal','Normal random (mean, SD)']]},{t:'num',k:'a',label:'Start / Min / Mean',def:0},{t:'num',k:'b',label:'Step / Ratio / Max / SD',def:1},{t:'num',k:'n',label:'Number of rows',def:Math.max(NR(sh),50)}],onOk:a=>{snap();fillColumn(sh,a.c,a.kind,a.a,a.b,Math.max(1,Math.round(a.n)));sh.cols[a.c].formula=undefined;dirty();renderGrid();renderExplorer();redrawGraph();dataChanged(sh.id)}})},
  sort(){const sh=curSheet(),c=selectedCols()[0]??0;dialog({title:'Sort Sheet',fields:[{t:'col',k:'c',label:'Sort by column',def:c},{t:'sel',k:'o',label:'Order',def:'asc',opts:[['asc','Ascending'],['desc','Descending']]}],onOk:a=>sortSheet(sh,a.c,a.o==='desc')})},
  transform(){const sh=curSheet(),c=selectedCols()[0]??0;dialog({title:'Transform Column → New Column',fields:[{t:'col',k:'c',label:'Source column',def:c},{t:'sel',k:'k',label:'Operation',def:'cumsum',opts:[['cumsum','Cumulative sum'],['diff','Differences (y[i] − y[i−1])'],['rank','Rank'],['reverse','Reverse order'],['abs','Absolute value'],['ln','Natural log'],['log10','Log base 10'],['sqrt','Square root'],['square','Square'],['recip','Reciprocal'],['zscore','Z-score'],['center','Subtract mean'],['pct','Percent of total']]}],onOk:a=>{snap();addColumn(sh,`${sh.cols[a.c].name||L(a.c)}_${a.k}`,'Y',transformCol(sh,a.c,a.k),sh.cols[a.c].unit);dirty();renderGrid();renderExplorer()}})},
  addcol(){const sh=curSheet();snap();addColumn(sh,'','Y');dirty();renderGrid();renderExplorer()},
  delcol(){const sh=curSheet(),cs=selectedCols();if(!cs.length||!confirm(`Delete ${cs.length} column(s)?`))return;deleteColumns(sh,cs)},
  dupcol(){const sh=curSheet();snap();selectedCols().forEach(i=>addColumn(sh,sh.cols[i].name+'_copy',sh.cols[i].des,sh.cols[i].d.slice(),sh.cols[i].unit));dirty();renderGrid();renderExplorer()},
  design(k){const sh=curSheet();snap();selectedCols().forEach(i=>sh.cols[i].des=k);dirty();renderGrid()},
  mask(on){const sh=curSheet(),r=selRange();snap();for(let i=r.r0;i<=r.r1;i++)sh.mask[i]=on;dirty();renderBody();redrawGraph();dataChanged(sh.id)},
  unmaskAll(){const sh=curSheet();snap();sh.mask=[];dirty();renderBody();redrawGraph();dataChanged(sh.id)},
  transpose(){const sh=curSheet();snap();const t=transposeSheet(sh);openWin('sheet',t.id);dirty()},
  rename(){const sh=curSheet(),n=prompt('Sheet name:',sh.name);if(n){snap();sh.name=n;dirty();renderTabs();renderExplorer()}},
  samples(){dialog({title:'Load Sample Data',fields:[{t:'sel',k:'s',label:'Dataset',def:'spectrum',opts:Object.entries(SAMPLES).map(([k,v])=>[k,v.label])}],ok:'Load',sheet:{cols:[]},onOk:a=>{snap();loadSample(a.s);dirty()}})},
  importFile(){$('#fileIn').click()},
  saveProj(){download('labscale-project.json',new Blob([projectJSON()],{type:'application/json'}))},
  csv(){const sh=curSheet();if(sh)download(sh.name+'.csv',new Blob([sheetToCSV(sh)],{type:'text/csv'}))},
  png(){const g=curGraph();if(g)chart.exportPNG(2,b=>download(g.name+'.png',b));else alert('Open a graph first.')},
  newsheet:newSheetCmd,
  filter(){const sh=curSheet();dialog({title:'Filter Rows',fields:[{t:'txt',k:'e',label:'Keep rows where…',def:'A>0'},{t:'chk',k:'add',label:'Combine with existing mask',def:false}],hint:'Rows that fail the condition are masked: ignored by plots and analyses, shown struck-through. Use column letters and i for the row number.',onOk:a=>{try{snap();const v=rowsEval(sh,a.e);v.forEach((x,i)=>{sh.mask[i]=(a.add&&!!sh.mask[i])||!x});dirty();renderBody();redrawGraph();dataChanged(sh.id)}catch(e){alert('Expression error: '+e.message)}}})},
  stack(){const sh=curSheet(),cs=selectedCols();if(cs.length<2)return alert('Select two or more columns to stack.');snap();const g=[],v=[];cs.forEach(c=>sh.cols[c].d.forEach(x=>{if(typeof x==='number'&&Number.isFinite(x)){g.push(sh.cols[c].name||L(c));v.push(x)}}));const ns=mkSheet(sh.name+'_stacked',[{name:'Group',des:'X',d:g},{name:'Value',des:'Y',d:v}]);openWin('sheet',ns.id);dirty()},
  unstack(){const sh=curSheet();dialog({title:'Unstack Column by Factor',fields:[{t:'col',k:'y',label:'Values column',def:Math.min(1,sh.cols.length-1)},{t:'col',k:'f',label:'Factor column',def:0}],onOk:a=>{snap();const R=ctxFor(sh).raw(a.f),V=sh.cols[a.y].d,lv=levelsOf(R.filter(x=>!rawBad(x))),cols=lv.map(l=>({name:l,des:'Y',d:V.filter((x,i)=>String(R[i])===l&&typeof x==='number'&&Number.isFinite(x))})),ns=mkSheet(sh.name+'_unstacked',cols);openWin('sheet',ns.id);dirty()}})},
  script(){dialog({title:'Script',fields:[{t:'area',k:'t',label:'Commands, one per line',def:lastScript}],sheet:{cols:[]},ok:'Run',hint:'<code>C = A*2+B</code> set a column · <code>sheet Name</code> switch sheet · <code>plot line B,C</code> plot columns · <code>run peakfind x=A y=B thr=5</code> run an analysis (any field name; columns by letter; <code>cols=B,C,D</code>). Lines starting with # are comments.',onOk:a=>{lastScript=a.t;try{const n=runScript(a.t);flash(`Script finished: ${n} command(s)`)}catch(e){alert(e.message)}}})},
  multi(){const gs=P.graphs.filter(g=>g.type!=='multi');if(gs.length<2)return alert('Create at least two graphs first.');dialog({title:'Multi-Panel Graph',fields:[{t:'msel',k:'ids',label:'Graphs to combine (Ctrl/Shift-click)',opts:gs.map(g=>[g.id,g.name]),def:[]},{t:'num',k:'cols',label:'Columns',def:2}],sheet:{cols:[]},onOk:a=>{const ids=a.ids.map(Number);if(ids.length<2)return alert('Pick at least two graphs.');snap();const m=graphDefaults(graphById(ids[0]).sheetId,'multi');m.id=uid();m.name=`Multi-panel ${m.id}`;m.children=ids;m.pcols=Math.max(1,Math.round(a.cols));m.prows=Math.ceil(ids.length/m.pcols);m.legend='none';P.graphs.push(m);openWin('graph',m.id);dirty()}})},
  pdf(){const g=curGraph();if(!g)return alert('Open a graph first.');exportPDF([g],g.name+'.pdf')},
  pdfAll(){exportPDF(P.graphs,'labscale-graphs.pdf')},
  svg(){const g=curGraph();if(!g)return alert('Open a graph first.');download(g.name+'.svg',graphToSVG(g))},
  async share(){try{const html=await buildStandalone(ser());download('labscale-shared.html',new Blob([html],{type:'text/html'}));flash('Shared file created: it contains the app and all your data')}catch(e){alert(e.message)}},
  print(){const g=curGraph();if(!g)return alert('Open a graph first.');printGraphs([g])},
  printAll(){printGraphs(P.graphs)},
  printReport(){printHTML('<h1>LabScale Report</h1><p>'+new Date().toLocaleString()+'</p>'+reportBody())},
  help(){alert('LabScale\n\n• Worksheet: type or paste data, Shift-click for ranges, header inputs edit name/unit/comment, drop-downs set X/Y/Z/Err/Label.\n• Command line: C = sin(A)*B (A,B… are columns; i is the row).\n• Plot: select Y columns then choose a graph type. Drag to pan, wheel to zoom, double-click to reset.\n• Analysis tabs run statistics, fits, peaks, filters, PCA and more; results land in the Results Log, fit curves are drawn on the graph.\n• Samples button loads demo data.')}
};

// ===== Ribbon =====
const IC={line:'<path d="M3 18L9 10l5 4 7-9"/>',scatter:'<path d="M6 16h.01M10 9h.01M14 14h.01M18 6h.01M9 18h.01M17 15h.01" stroke-width="3.6"/>',linesym:'<path d="M3 18L9 10l5 4 7-9"/><path d="M3 18h.01M9 10h.01M14 14h.01M21 5h.01" stroke-width="3.6"/>',area:'<path d="M3 20v-6l6-6 5 4 7-8v16z"/>',column:'<path d="M5 20v-8M12 20V5M19 20V9" stroke-width="4"/>',bar:'<path d="M4 5h8M4 12h16M4 19h11" stroke-width="4"/>',stack:'<path d="M6 20v-5M6 12V9M13 20v-9M13 8V4M20 20v-4M20 13V7" stroke-width="4"/>',hist:'<path d="M4 20v-6M8 20V8M12 20V4M16 20V10M20 20v-5" stroke-width="3.4"/>',box:'<path d="M8 8h8v8H8zM12 3v5M12 16v5M8 12h8"/>',pie:'<path d="M12 3a9 9 0 1 0 9 9h-9z"/><path d="M14 2.5a9 9 0 0 1 7 7h-7z"/>',polar:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><path d="M12 3v18M3 12h18"/>',bubble:'<circle cx="8" cy="15" r="3.5"/><circle cx="16" cy="9" r="5"/><circle cx="18" cy="18" r="2"/>',violin:'<path d="M12 3c4 4 4 14 0 18-4-4-4-14 0-18z"/><path d="M12 8v8"/>',qq:'<path d="M4 20L20 4" stroke-dasharray="2 2"/><path d="M6 17h.01M9 13h.01M12 12h.01M15 8h.01M18 6h.01" stroke-width="3.4"/>',ecdf:'<path d="M3 19h5v-4h4v-5h4v-4h5"/>',kde:'<path d="M3 19c4 0 4-14 9-14s5 14 9 14"/>',radar:'<path d="M12 3l8 6-3 10H7L4 9z"/><path d="M12 12l5-3M12 12l-5-3M12 12v7"/>',multi:'<rect x="3" y="3" width="8" height="8"/><rect x="13" y="3" width="8" height="8"/><rect x="3" y="13" width="18" height="8"/>',heat:'<path d="M4 4h7v7H4zM13 13h7v7h-7z"/><path d="M13 4h7v7h-7zM4 13h7v7H4z" opacity=".45"/>',contour:'<ellipse cx="12" cy="12" rx="9" ry="6"/><ellipse cx="12" cy="12" rx="5" ry="3"/>',scat3d:'<path d="M4 8l8-3 8 3v10l-8 3-8-3zM12 11v10M4 8l8 3 8-3"/>',surf3d:'<path d="M3 13l6-5 6 5 6-5M3 19l6-5 6 5 6-5"/>',wire3d:'<path d="M3 12l9-6 9 6-9 6zM12 6v12M7.5 9l9 6M16.5 9l-9 6"/>'};
const AIC={descr:'Σ',normal:'N',ttest1:'t₁',ttest2:'t₂',ttestp:'tₚ',anova1:'F',mwu:'U',kruskal:'H',chisq:'χ²',corr:'ρ',linreg:'y=ax',polyreg:'Pn',mlr:'MLR',nlfit:'f(x)',peakfind:'▲',peakfit:'ΣG',baseline:'BL',smooth:'~',fft:'FFT',filter:'LP',deriv:'d/dx',integ:'∫',interp:'⇢',normalize:'0‑1',hist:'▥',pca:'PCA',kmeans:'k=',xyz2mat:'XYZ',anova2:'F²',wilcoxon:'W',fisher:'Fx',logreg:'logit',km:'KM',gfit:'Σf',butter:'IIR',stft:'STFT',mat2xyz:'M→XYZ',rmanova:'RM',welch:'Wlch',dunnett:'Dn',stdcurve:'Std',doseresp:'EC50'};
const RIB={File:[['Project',[['New sheet','+',COLOP.newsheet],['Samples','⚗',COLOP.samples],['Import file','⇥',COLOP.importFile],['Save project','⤓',COLOP.saveProj],['Share (.html)','⇪',COLOP.share],['Help','?',COLOP.help]]],['Export',[['Graph PDF','PDF',COLOP.pdf],['Graph SVG','SVG',COLOP.svg],['All graphs PDF','PDF×N',COLOP.pdfAll],['Graph PNG','PNG',COLOP.png],['Sheet CSV','CSV',COLOP.csv],['HTML report','▤',exportReport]]],['Print',[['Print graph','⎙',COLOP.print],['Print all graphs','⎙×N',COLOP.printAll],['Print report','⎙Σ',COLOP.printReport]]]],
  Column:[['Columns',[['Add','+',COLOP.addcol],['Delete','✕',COLOP.delcol],['Duplicate','⧉',COLOP.dupcol],['Set values','f(i)',COLOP.setvals],['Fill series','1‥n',COLOP.fill],['Transform','Σ→',COLOP.transform],['Sort','⇅',COLOP.sort]]],
    ['Designate',[['X','X',()=>COLOP.design('X')],['Y','Y',()=>COLOP.design('Y')],['Z','Z',()=>COLOP.design('Z')],['Error','±',()=>COLOP.design('E')],['Label','Aa',()=>COLOP.design('L')],['None','∅',()=>COLOP.design('N')]]],
    ['Rows & sheet',[['Filter rows','⊘',COLOP.filter],['Stack','▥→',COLOP.stack],['Unstack','→▥',COLOP.unstack],['Script','>_',COLOP.script],['Mask rows','▤',()=>COLOP.mask(true)],['Unmask','▥',()=>COLOP.mask(false)],['Clear mask','↺',COLOP.unmaskAll],['Transpose','⇄',COLOP.transpose],['Rename','Ab',COLOP.rename]]]],
  Plot:[['Line & symbol',[...[['line','Line'],['scatter','Scatter'],['linesym','Line+Symbol'],['area','Area']].map(([t,l])=>[l,IC[t],()=>plotCmd(t),1])]],['Bars & statistics',[...[['column','Column'],['bar','Bar'],['stack','Stacked'],['hist','Histogram'],['box','Box'],['pie','Pie']].map(([t,l])=>[l,IC[t],()=>plotCmd(t),1])]],
    ['Distribution',[...[['qq','Q-Q'],['ecdf','CDF'],['kde','Density'],['violin','Violin']].map(([t,l])=>[l,IC[t],()=>plotCmd(t),1])]],['Specialized',[...[['bubble','Bubble'],['radar','Radar'],['polar','Polar']].map(([t,l])=>[l,IC[t],()=>plotCmd(t),1]),['Multi-panel',IC.multi,COLOP.multi,1]]],['Contour & 3D',[...[['heat','Heatmap'],['contour','Contour'],['scat3d','3D Scatter'],['surf3d','3D Surface'],['wire3d','3D Wire']].map(([t,l])=>[l,IC[t],()=>plotCmd(t),1])]]]};
const analysisItems=g=>[g,A.order.filter(id=>A.defs[id].group===g).map(id=>[A.defs[id].label.replace(/\s*\(.*\)/,'').replace(/\s+/g,' ').replace('Convert XYZ to Matrix','XYZ→Matrix'),AIC[id]||(A.defs[id].label.match(/[A-Z0-9]/g)||['●']).slice(0,3).join(''),()=>openAnalysis(id)])];
['Statistics','Fitting','Peaks & Baseline','Signal','Multivariate'].forEach(g=>{RIB[g]=[analysisItems(g)]});
let ribTab='File';
function renderRibbon(){
  $('#rtabs').innerHTML=Object.keys(RIB).map(t=>`<button data-t="${esc(t)}" class="${t===ribTab?'on':''}">${esc(t)}</button>`).join('');
  $('#ribbon').innerHTML=RIB[ribTab].map(([gn,items],gi)=>`<div class="rg"><div class="items">${items.map(([l,ic,fn,svg],ii)=>`<button class="rb" data-g="${gi}" data-i="${ii}" title="${esc(l)}"><span class="ic">${svg?`<svg viewBox="0 0 24 24">${ic}</svg>`:esc(ic)}</span><span>${esc(l)}</span></button>`).join('')}</div><div class="gl">${esc(gn)}</div></div>`).join('')}
$('#rtabs')&&0;
function initRibbon(){['Statistics','Fitting','Peaks & Baseline','Signal','Multivariate'].forEach(g=>{RIB[g][0]=analysisItems(g)});
  $('#rtabs').addEventListener('click',e=>{const b=e.target.closest('button');if(b){ribTab=b.dataset.t;renderRibbon()}});
  $('#ribbon').addEventListener('click',e=>{const b=e.target.closest('.rb');if(!b)return;const it=RIB[ribTab][+b.dataset.g][1][+b.dataset.i];
    const needSheet=['Column','Plot','Statistics','Fitting','Peaks & Baseline','Signal','Multivariate'].includes(ribTab)&&!['Function plot','Multi-panel','Script','Function builder','Simulate curve','Stats advisor'].includes(it[0]);
    if(needSheet&&!curSheet())return alert('Create or import a sheet first.');try{it[2]()}catch(err){alert('Error: '+err.message);console.error(err)}});
  renderRibbon()}

// ===== Properties panel =====
const openSec=new Set(['General','Series','Axes']);
const getPath=(o,p)=>p.split('.').reduce((a,k)=>a==null?a:a[k],o);
function setPath(o,p,v){const ks=p.split('.');const last=ks.pop();const t=ks.reduce((a,k)=>a[k]??(a[k]={}),o);t[last]=v}
function renderProps(light){
  const el=$('#props'),a=P.act;if(!a){el.innerHTML='';return}
  if(light&&a.t!=='sheet')return;
  const ae=document.activeElement;if(light&&ae&&el.contains(ae)&&ae.matches('input,select'))return;
  el.innerHTML=a.t==='sheet'?sheetProps():a.t==='layout'?layoutProps():a.t==='note'?noteProps():graphProps()}
function sheetProps(){const sh=curSheet();if(!sh)return'';const c=sh.cols[cur.c];if(!c)return`<div class="ph">Sheet</div>`;
  const v=Mx.clean(maskedVals(sh,cur.c)),st=v.length?[['N',v.length],['Mean',Mx.fmt(Mx.mean(v),6)],['SD',Mx.fmt(Mx.sd(v),5)],['Min',Mx.fmt(Math.min(...v),6)],['Max',Mx.fmt(Math.max(...v),6)],['Sum',Mx.fmt(Mx.sum(v),7)]]:[];
  return`<div class="ph">Column ${L(cur.c)}</div><div class="pp"><details open><summary>Properties</summary><div class="body">
  <div class="r"><label>Long name</label><input type="text" data-sh="name" value="${esc(c.name)}"></div>
  <div class="r"><label>Units</label><input type="text" data-sh="unit" value="${esc(c.unit)}"></div>
  <div class="r"><label>Comments</label><input type="text" data-sh="comment" value="${esc(c.comment)}"></div>
  <div class="r"><label>Format</label><select data-sh="fmt">${[['','Auto'],['fixed','Fixed decimals'],['sci','Scientific'],['date','Date / time']].map(([k,l])=>`<option value="${k}" ${(c.fmt||'')===k?'selected':''}>${l}</option>`).join('')}</select><input type="number" min="0" max="12" data-sh="dec" value="${c.dec??3}" style="width:48px;flex:none" title="Decimals"></div>
  <div class="r"><label>Designation</label><select data-sh="des">${DES.map(([k,l])=>`<option value="${k}" ${c.des===k?'selected':''}>${l}</option>`).join('')}</select></div></div></details>
  <details open><summary>Column statistics</summary><div class="body">${st.length?`<table class="rt">${st.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</table>`:'<span class="note">No numeric data</span>'}</div></details>
  <details open><summary>Sheet</summary><div class="body"><div class="r"><label>Name</label><input type="text" data-shn="1" value="${esc(sh.name)}"></div><div class="note">${sh.cols.length} columns × ${NR(sh)} rows${sh.isMatrix?' · matrix':''}${sh.mask.some(Boolean)?` · ${sh.mask.filter(Boolean).length} masked rows`:''}</div></div></details></div>`}
function multiProps(g){const kids=(g.children||[]).map(id=>graphById(id)).filter(Boolean),T=(l,k,t='text')=>`<div class="r"><label>${l}</label><input type="${t==='num'?'number':'text'}" data-k="${k}" data-t="${t}" value="${esc(g[k]??'')}"></div>`;
  return`<div class="ph">Multi-panel graph</div><div class="pp"><details open><summary>General</summary><div class="body">${T('Name','name')}${T('Title','title')}${T('Rows','prows','num')}${T('Columns','pcols','num')}${T('Gap (px)','gap','num')}<div class="r"><label>Link X axes</label><input type="checkbox" data-k="linkX" data-t="bool" ${g.linkX?'checked':''}></div></div></details>
  <details open><summary>Panels</summary><div class="body">${kids.map((k,i)=>`<span class="tag">${i+1}. ${esc(k.name)}<button data-act="rmChild" data-i="${i}">✕</button></span>`).join('')||'<span class="note">No panels</span>'}<div class="r"><select id="addChild">${P.graphs.filter(x=>x.type!=='multi'&&!(g.children||[]).includes(x.id)).map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select><button data-act="addChild">Add</button></div><div class="note">Panels are live: edit a child graph and this layout updates.</div></div></details>
  <details open><summary>Export</summary><div class="body"><div class="r"><button data-act="pdf">Save PDF</button><button data-act="print">Print</button></div></div></details></div>`}
function graphProps(){
  const g=curGraph();if(g&&g.type==='multi')return multiProps(g);const sh=g&&sheetById(g.sheetId);if(!g||!sh)return'';
  const cart=['line','scatter','linesym','area','column','bar','stack','hist','box','bubble','violin','qq','ecdf','kde'].includes(g.type),matLike=['heat','contour','surf3d','wire3d'].includes(g.type),d3=['scat3d','surf3d','wire3d'].includes(g.type),seriesBased=!matLike;
  const O=(opts,v)=>opts.map(([k,l])=>`<option value="${esc(k)}" ${String(v)===String(k)?'selected':''}>${esc(l)}</option>`).join('');
  const colSel=(v,none)=>(none?`<option value="-1" ${v==null||v<0?'selected':''}>${none}</option>`:'')+sh.cols.map((c,i)=>`<option value="${i}" ${v===i?'selected':''}>${esc(L(i)+': '+(c.name||''))}</option>`).join('');
  const T=(l,k,t='text',x='')=>`<div class="r"><label>${l}</label><input type="${t==='num'||t==='numn'?'number':'text'}" step="any" data-k="${k}" data-t="${t}" value="${esc(getPath(g,k)??'')}" ${x}></div>`;
  const S=(l,k,opts,t='str',rb=false)=>`<div class="r"><label>${l}</label><select data-k="${k}" data-t="${t}" ${rb?'data-rebuild="1"':''}>${O(opts,getPath(g,k))}</select></div>`;
  const C=(l,k)=>`<div class="r"><label>${l}</label><input type="checkbox" data-k="${k}" data-t="bool" ${getPath(g,k)?'checked':''}></div>`;
  const scales=[['linear','Linear'],['log10','Log10'],['ln','Ln'],['recip','Reciprocal'],['sqrt','Square root'],['symlog','Symmetric log'],['logit','Logit (probability)'],['probit','Probit (probability)'],['f:','Custom formula f(x)…']];
  const FX=k=>String(g[k]||'').startsWith('f:')?`<div class="r"><label>f(x) =</label><input type="text" data-fx="${k}" value="${esc(String(g[k]).slice(2))}" placeholder="e.g. log(1+x)  or  sqrt(x)" spellcheck="false"></div><div class="note">Any increasing or decreasing formula of x (sqrt, log, ln, exp, pow, abs…).</div>`:'';
  const rkeys=[...new Set(g.series.map(s=>s.axis).filter(x=>x&&x!=='L'))].sort();
  const rax=k=>k==='R'?`<b class="note">Right Y axis (R)</b>${T('Title','yrl')}${S('Scale','yrs',scales)+FX('yrs')}<div class="r two"><label>Range</label><input type="number" step="any" data-k="yrmin" data-t="numn" placeholder="auto" value="${g.yrmin??''}"><input type="number" step="any" data-k="yrmax" data-t="numn" placeholder="auto" value="${g.yrmax??''}"></div>`:
    `<b class="note">Right Y axis (${k})</b>${T('Title','axes.'+k+'.label')}${S('Scale','axes.'+k+'.scale',scales)}<div class="r two"><label>Range</label><input type="number" step="any" data-k="axes.${k}.min" data-t="numn" placeholder="auto" value="${g.axes?.[k]?.min??''}"><input type="number" step="any" data-k="axes.${k}.max" data-t="numn" placeholder="auto" value="${g.axes?.[k]?.max??''}"></div>`;
  const sec=(n,body)=>`<details data-sec="${n}" ${openSec.has(n)?'open':''}><summary>${n}</summary><div class="body">${body}</div></details>`;
  let h=`<div class="ph">Graph properties</div><div class="pp">`;
  h+=sec('General',T('Name','name')+S('Type','type',Object.entries(GTYPES),'str',true)+T('Title','title')+T('Subtitle','subtitle')+`<div class="r"><label>Description</label><textarea rows="3" data-k="desc" data-t="str" placeholder="Caption shown below the graph" style="width:100%">${esc(g.desc||'')}</textarea></div><div class="r"><button data-act2="descDlg">Title and description…</button><button data-act2="legDlg">Legend…</button></div>`+T('Font size','fs','num')+S('Font','font',[['system-ui,sans-serif','Sans-serif'],["Georgia,'Times New Roman',serif",'Serif'],['ui-monospace,Menlo,monospace','Monospace']])+S('Legend','legend',[['tr','Top right'],['tl','Top left'],['br','Bottom right'],['bl','Bottom left'],['out','Outside'],['none','Hidden']]));
  if(cart)h+=sec('Axes',`<b class="note">X axis</b>${T('Title','xl')}${S('Scale','xs',scales)+FX('xs')}<div class="r two"><label>Range</label><input type="number" step="any" data-k="xmin" data-t="numn" placeholder="auto" value="${g.xmin??''}"><input type="number" step="any" data-k="xmax" data-t="numn" placeholder="auto" value="${g.xmax??''}"></div>
    <b class="note">Y axis</b>${T('Title','yl')}${S('Scale','ys',scales)+FX('ys')}<div class="r two"><label>Range</label><input type="number" step="any" data-k="ymin" data-t="numn" placeholder="auto" value="${g.ymin??''}"><input type="number" step="any" data-k="ymax" data-t="numn" placeholder="auto" value="${g.ymax??''}"></div>
    ${rkeys.map(rax).join('')}
    ${C('X is date/time','xdate')}${C('Grid X','gridx')}${C('Grid Y','gridy')}${C('Minor grid','minor')}`);
  else if(g.type!=='pie'&&g.type!=='polar')h+=sec('Axes',T('X title','xl')+T('Y title','yl')+(d3?T('Z title','zl'):'')+(!d3?`<div class="r two"><label>X range</label><input type="number" step="any" data-k="xmin" data-t="numn" placeholder="auto" value="${g.xmin??''}"><input type="number" step="any" data-k="xmax" data-t="numn" placeholder="auto" value="${g.xmax??''}"></div><div class="r two"><label>Y range</label><input type="number" step="any" data-k="ymin" data-t="numn" placeholder="auto" value="${g.ymin??''}"><input type="number" step="any" data-k="ymax" data-t="numn" placeholder="auto" value="${g.ymax??''}"></div>`:''));
  if(seriesBased){h+=sec('Series',g.series.map((s,i)=>`<div class="sr"><div class="r"><input type="color" data-k="series.${i}.color" data-t="str" value="${s.color}"><input type="text" data-k="series.${i}.label" data-t="str" placeholder="${esc(sh.cols[s.y]?.name||'label')}" value="${esc(s.label||'')}"><button data-act="rmSeries" data-i="${i}" title="Remove">✕</button></div>
      <div class="r"><label>Y</label><select data-k="series.${i}.y" data-t="int">${colSel(s.y)}</select></div>
      ${['hist','box','pie','violin','qq','ecdf','kde','radar'].includes(g.type)?'':`<div class="r"><label>X</label><select data-k="series.${i}.x" data-t="idx">${colSel(s.x,'(row index)')}</select></div>`}
      ${g.type==='scat3d'||g.type==='bubble'?`<div class="r"><label>${g.type==='bubble'?'Size':'Z'}</label><select data-k="series.${i}.z" data-t="idx">${colSel(s.z,'—')}</select></div>`:''}
      ${cart&&!['hist','box','violin','qq','ecdf','kde','bubble'].includes(g.type)||g.type==='scat3d'?`<div class="r"><label>Err (±)</label><select data-k="series.${i}.e" data-t="idx">${colSel(s.e,'none')}</select></div>`:''}
      ${cart?`<div class="r two"><select data-k="series.${i}.symbol" data-t="str">${O(SYMBOLS.map(x=>[x,x]),s.symbol)}</select><input type="number" min="1" max="30" data-k="series.${i}.size" data-t="num" value="${s.size}" title="Symbol size"><input type="number" min="0" max="12" step=".5" data-k="series.${i}.lw" data-t="num" value="${s.lw}" title="Line width"></div>
      <div class="r two"><select data-k="series.${i}.dash" data-t="str">${O([['','Solid'],['dash','Dashed'],['dot','Dotted'],['dashdot','Dash-dot']],s.dash)}</select><select data-k="series.${i}.axis" data-t="str" data-rebuild="1">${O([['L','Left Y'],['R','Right Y 1'],['R2','Right Y 2'],['R3','Right Y 3'],['R4','Right Y 4']],s.axis)}</select><label class="note"><input type="checkbox" data-k="series.${i}.hide" data-t="bool" ${s.hide?'checked':''}> hide</label><label class="note"><input type="checkbox" data-k="series.${i}.labels" data-t="bool" ${s.labels?'checked':''}> labels</label></div>`:''}</div>`).join('')+
      (g.type==='pie'?'':`<div class="r"><select id="addSer">${colSel(-5)}</select><button data-act="addSeries">Add</button></div>`));
    if(['line','linesym','area','errband','cline'].includes(g.type))h+=sec('Line style',S('Connect','connect',[['straight','Straight'],['spline','Spline'],['step','Step (centered)'],['hv','Step (horizontal first)'],['vh','Step (vertical first)']])+T('Waterfall offset','offset','num'));
    if(g.type==='hist')h+=sec('Histogram',T('Bins (0 = auto)','bins','num')+C('Normal curve','normal'));
    if(g.type==='polar')h+=sec('Polar',C('Angles in radians','rad')+C('Show symbols','polarSym'));}
  if(g.type==='radar')h+=sec('Radar',`<div class="r"><label>Labels</label><select data-k="labelCol" data-t="idx">${colSel(g.labelCol,'(1, 2, 3…)')}</select></div>`+T('Max value','zmax','numn','placeholder="auto"'));
  if(matLike||g.type==='scat3d')h+=sec('Color & surface',S('Colormap','cmap',Object.keys(CMAPS).map(k=>[k,k]))+(matLike?T('Z min','zmin','numn','placeholder="auto"')+T('Z max','zmax','numn','placeholder="auto"'):''+C('Color by Z','colorByZ'))+(['heat','contour'].includes(g.type)?T('Contour levels','levels','num')+C('Fill','fillmap')+C('Contour lines','contour')+C('Colorbar','cbar'):''));
  if(matLike&&!sh.isMatrix)h+=sec('Matrix source',`<div class="note">Matrix columns: ${(g.mcols||[]).map(i=>L(i)).join(', ')||'all'}.<br>Select columns in the sheet and re-plot to change.</div>`);
  if(d3)h+=sec('3D view',T('Azimuth°','az','num')+T('Elevation°','el','num')+T('Zoom','zoom','num')+'<div class="note">Drag on the graph to rotate, wheel to zoom.</div>');
  if(cart||matLike){h+=sec('Overlays',(g.curves.length?g.curves.map((c,i)=>`<span class="tag">${esc(c.label||'curve')}<button data-act="rmCurve" data-i="${i}">✕</button></span>`).join('')+'<button data-act="clrCurves">Clear fit curves</button>':'<span class="note">Fit curves, peak markers and bands from analyses appear here.</span>')+
    (g.marks.length?`<div class="r"><span class="note">${g.marks.length} peak markers</span><button data-act="clrMarks">Clear</button></div>`:'')+
    `<div class="r two"><select id="refAx"><option value="y">Horizontal line at Y =</option><option value="x">Vertical line at X =</option></select><input type="number" step="any" id="refV"><button data-act="addRef">Add</button></div>`+
    (g.refs.map((r,i)=>`<span class="tag">${r.axis}=${Mx.fmt(r.v,5)}<button data-act="editRef" data-i="${i}" title="Edit value">✎</button><button data-act="rmRef" data-i="${i}">✕</button></span>`).join(''))+
    (g.notes.map((n,i)=>`<span class="tag">“${esc(n.text)}”<button data-act="editNote" data-i="${i}" title="Edit text">✎</button><button data-act="rmNote" data-i="${i}">✕</button></span>`).join('')||'<div class="note">Use the “T Note” tool above the graph to add text.</div>'))}
  h+=sec('Data & export',`<div class="note">Sheet: ${esc(sh.name)}</div><div class="r"><button data-act="toSheet">Go to sheet</button><button data-act="pdf">PDF</button><button data-act="svg">SVG</button><button data-act="print">Print</button></div><div class="r"><button data-act="copyFmt">Copy format</button><button data-act="pasteFmt">Paste format</button></div>${g.series.length>1&&cart?'<button data-act="split">Split series into stacked panels</button>':''}`);
  return h+'</div>'}
function initProps(){
  const el=$('#props');
  el.addEventListener('toggle',e=>{const d=e.target;if(d.dataset&&d.dataset.sec){d.open?openSec.add(d.dataset.sec):openSec.delete(d.dataset.sec)}},true);
  const apply=e=>{const t=e.target,a=P.act;if(!a)return;
    if(a.t==='sheet'){const sh=curSheet();if(t.dataset.sh){snap();sh.cols[cur.c][t.dataset.sh]=t.dataset.sh==='dec'?+t.value:t.value;dirty();renderGrid();renderExplorer();renderProps();return}if(t.dataset.shn){snap();sh.name=t.value;dirty();renderTabs();renderExplorer()}return}
    const g=curGraph();if(!g||!t.dataset.k)return;let v;const ty=t.dataset.t;
    if(ty==='fillon')return;if(ty==='tb')v=t.checked?'T':undefined;else if(ty==='nbool')v=!t.checked;else if(ty==='bool')v=t.checked;else if(ty==='num')v=parseFloat(t.value);else if(ty==='numn')v=t.value===''?null:parseFloat(t.value);else if(ty==='int')v=+t.value;else if(ty==='idx')v=+t.value<0?null:+t.value;else v=t.value;
    if((ty==='num')&&Number.isNaN(v))return;
    if(e.type==='change')snap();setPath(g,t.dataset.k,v);if(t.dataset.k==='type'||t.dataset.k==='name'||ty==='int')g.view=null;
    redrawGraph();dirty();if(t.dataset.rebuild||t.dataset.k==='name'){renderProps();renderTabs();renderExplorer()}};
  el.addEventListener('input',e=>{if(e.target.type==='text'||e.target.type==='number'||e.target.type==='color')apply(e)});
  el.addEventListener('change',e=>{apply(e)});
  el.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b)return;const g=curGraph(),i=+b.dataset.i;snap();
    switch(b.dataset.act){case'rmSeries':g.series.splice(i,1);break;
      case'addSeries':{const y=+$('#addSer').value;if(y<0)return;g.series.push({y,x:g.series[0]?.x??null,e:null,z:null,color:PALETTE[g.series.length%PALETTE.length],symbol:SYMBOLS[g.series.length%6],size:6,lw:2,dash:'',axis:'L',label:''});if(g.legend==='none')g.legend='tr';break}
      case'rmCurve':g.curves.splice(i,1);break;case'clrCurves':g.curves=[];break;case'clrMarks':g.marks=[];break;
      case'addRef':{const v=parseFloat($('#refV').value);if(Number.isNaN(v))return;g.refs.push({axis:$('#refAx').value,v});break}
      case'editRef':{const nv=prompt('Reference line value:',g.refs[i].v);if(nv===null)return;const v=parseFloat(nv);if(!Number.isNaN(v))g.refs[i].v=v;break}case'editNote':{const nv=prompt('Text:',g.notes[i].text);if(nv===null)return;if(nv.trim())g.notes[i].text=nv;break}case'rmRef':g.refs.splice(i,1);break;case'rmNote':g.notes.splice(i,1);break;case'toSheet':openWin('sheet',g.sheetId);return;
      case'pdf':exportPDF([g],g.name+'.pdf');return;case'svg':download(g.name+'.svg',graphToSVG(g));return;case'print':printGraphs([g]);return;case'copyFmt':copyFormat(g);return;case'pasteFmt':pasteFormat(g);break;case'split':splitPanels(g);return;
      case'rmChild':g.children.splice(i,1);break;case'addChild':{const v=+$('#addChild').value;if(!v)return;g.children.push(v);break}}
    dirty();redrawGraph(true)});
  $('#rlist').addEventListener('click',e=>{const t=e.target;
    if(t.dataset.rdel){P.results=P.results.filter(r=>r.id!==+t.dataset.rdel);renderResults();renderExplorer();dirty()}
    else if(t.dataset.recalc){const r=P.results.find(x=>x.id===+t.dataset.recalc);if(r){recalcBusy=true;try{recalcResult(r)}finally{recalcBusy=false}renderResults();if(P.act&&P.act.t==='sheet')renderGrid();redrawGraph();dirty()}}
    else if(t.dataset.batch)batchRun(+t.dataset.batch);
    else if(t.dataset.ally)allYColumns(+t.dataset.ally);
    else if(t.dataset.dup){const r=P.results.find(x=>x.id===+t.dataset.dup);if(r){const sh=sheetById(r.sheetId);if(sh){openWin('sheet',sh.id);openAnalysis(r.defId,r.args,sh)}}}
    else if(t.dataset.rcopy){const c=t.closest('.rc');navigator.clipboard.writeText(c.innerText).then(()=>flash('Copied')).catch(()=>alert('Clipboard not available'))}});
  $('#rlist').addEventListener('change',e=>{const id=e.target.dataset.live;if(id){const r=P.results.find(x=>x.id===+id);r.live=e.target.checked;dirty();if(r.live)recalcSheet(r.sheetId)}});
  $('#gPdf').onclick=COLOP.pdf;$('#gSvg').onclick=COLOP.svg;$('#gPrint').onclick=COLOP.print;$('#gFmtC').onclick=()=>{const g=curGraph();g&&copyFormat(g)};$('#gFmtP').onclick=()=>{const g=curGraph();if(g){snap();pasteFormat(g);dirty();redrawGraph(true)}}}

function batchRun(rid){const r=P.results.find(x=>x.id===rid);if(!r)return;const def=A.defs[r.defId],idx=def.fields.flatMap(f=>f.t==='col'?[r.args[f.k]]:f.t==='cols'?r.args[f.k]:[]).filter(i=>i>=0),need=Math.max(0,...idx)+1;
  const targets=P.sheets.filter(s=>s.id!==r.sheetId&&!s.isMatrix&&s.cols.length>=need);if(!targets.length)return alert('No other sheet has enough columns.');if(!confirm(`Run “${def.label}” on ${targets.length} other sheet(s) using the same column positions?`))return;
  snap();targets.forEach(t=>runAnalysis(r.defId,r.args,t,{quiet:true}));renderExplorer();flash(`Ran on ${targets.length} sheet(s)`)}
const letterIdx=t=>/^[A-Za-z]+$/.test(t)&&t.length<=3?[...t.toUpperCase()].reduce((a,c)=>a*26+c.charCodeAt(0)-64,0)-1:-1;
function colRef(sh,t){t=t.trim();let i=letterIdx(t);if(i>=0&&i<sh.cols.length)return i;i=sh.cols.findIndex(c=>c.name===t);if(i<0)throw new Error(`unknown column “${t}”`);return i}
function runScript(txt){let n=0;const lines=txt.split('\n');
  for(let li=0;li<lines.length;li++){const ln=lines[li].trim();if(!ln||ln.startsWith('#'))continue;
    try{const sh=curSheet();let m;
      if((m=ln.match(/^sheet\s+(.+)$/i))){const s2=P.sheets.find(q=>q.name===m[1].trim());if(!s2)throw new Error('no sheet named '+m[1]);openWin('sheet',s2.id)}
      else if((m=ln.match(/^plot\s+(\w+)\s*(.*)$/i))){if(!GTYPES[m[1]])throw new Error('unknown plot type '+m[1]);const cs=m[2]?m[2].split(/[,\s+]+/).filter(Boolean).map(t=>colRef(sh,t)):[];if(cs.length){gsel={c0:cs[0],r0:0,c1:cs[0],r1:0,extra:new Set(cs)}}plotCmd(m[1])}
      else if((m=ln.match(/^run\s+(\w+)\s*(.*)$/i))){const def=A.defs[m[1]];if(!def)throw new Error('unknown analysis '+m[1]+' (ids: '+A.order.join(', ')+')');const kv={};(m[2].match(/\w+=\S+/g)||[]).forEach(p=>{const q=p.indexOf('=');kv[p.slice(0,q)]=p.slice(q+1)});
        const a=defaultsFor(def,sh);def.fields.forEach(f=>{if(f.def!==undefined&&a[f.k]===undefined)a[f.k]=f.def;const v=kv[f.k];if(v===undefined)return;
          a[f.k]=f.t==='col'?colRef(sh,v):f.t==='cols'?v.split(/[,;+]/).map(t=>colRef(sh,t)):f.t==='num'?parseFloat(v):f.t==='chk'?/^(1|true|yes|on)$/i.test(v):v});runAnalysis(def.id,a,sh)}
      else runCommand(ln);n++}catch(e){throw new Error(`Script line ${li+1}: ${e.message}`)}}
  return n}
async function buildStandalone(projectTxt){
  const need=['skeleton markup'];if(!window.__SKEL)throw new Error('App skeleton not available.');
  const text=async(src)=>{try{const r=await fetch(src);if(!r.ok)throw 0;return await r.text()}catch(e){throw new Error('Sharing needs the single-file build. Open labscale-standalone.html (or run the app from a web server) and use Share there.')}};
  let css='';const st=document.querySelector('style');if(st)css=st.textContent;else{const l=document.querySelector('link[rel=stylesheet]');if(l)css=await text(l.getAttribute('href'))}
  const scripts=[];for(const s of document.scripts){if(s.type==='application/json')continue;scripts.push(s.src?await text(s.getAttribute('src')):s.textContent)}
  const safe=t=>t.replace(/<\/script/gi,'<\\/script');
  return`<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>LabScale</title><style>${css}</style></head><body>${window.__SKEL}<script id="embedded-project" type="application/json">${projectTxt.replace(/</g,'\\u003c')}</script>\n${scripts.map(t=>'<script>'+safe(t)+'</script>').join('\n')}</body></html>`}
function embeddedProject(){const el=document.getElementById('embedded-project');if(!el||!el.textContent.trim())return null;const t=el.textContent;let h=t.length;for(let i=0;i<t.length;i+=Math.max(1,t.length>>10))h=(h*31+t.charCodeAt(i))|0;return{txt:t,hash:String(h)}}
// ===== init =====
function firstRun(){
  Object.keys(SAMPLES).forEach(k=>loadSample(k,false));
  const sp=P.sheets[0];P.act={t:'sheet',id:sp.id};P.open=[{t:'sheet',id:sp.id}];showWin();
  gsel={c0:1,r0:0,c1:1,r1:0,extra:new Set()};plotCmd('line');
  P.open=[{t:'sheet',id:sp.id},...P.open.filter(w=>w.t==='graph')];}
function init(){
  try{const th=localStorage.getItem('labanalysis.theme');if(th)document.documentElement.dataset.theme=th}catch(e){}
  initGrid();initChart();gadgetInit();initShell();initRibbon();initProps();initProps2();initSheet2();initLayout();initNotes();renderResults();
  let loaded=false;try{const emb=embeddedProject();let useEmb=false;if(emb){let prev=null;try{prev=localStorage.getItem('labanalysis.embedHash')}catch(e){}if(prev!==emb.hash){useEmb=true;try{localStorage.setItem('labanalysis.embedHash',emb.hash)}catch(e){}}}
    const s=useEmb?emb.txt:localStorage.getItem('labanalysis.project');if(s){const o=deser(s);if(o.sheets&&o.sheets.length){P.sheets=o.sheets;P.graphs=o.graphs||[];P.results=o.results||[];unpackExtra(o);registerUserFuncs();P.nid=o.nid||100;P.open=o.open||[];P.act=o.act||P.open[0]||null;loaded=true}}}catch(e){console.warn('restore failed',e)}
  setTimeout(loadPlugins,700);
  if(loaded){renderResults();P.open=P.open.filter(w=>winObj(w.t,w.id));if(!P.act||!P.open.some(w=>w.t===P.act.t&&w.id===P.act.id))P.act=P.open[0]||null;showWin()}else firstRun();
  undoS=[];undoL=[];redoS=[];redoL=[];updUndo();
  matchMedia('(prefers-color-scheme:dark)').addEventListener('change',()=>redrawGraph())}
window.addEventListener('DOMContentLoaded',init);
