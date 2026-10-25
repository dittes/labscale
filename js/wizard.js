// ===== Results log: resizable + toggle arrow; Import assistant (suggests next steps after a file is imported) =====
(function(){
  const res=document.getElementById('results'),btn=document.getElementById('rHide');if(!res||!btn)return;
  const KEY='la_res_h',clampH=h=>Math.max(80,Math.min(Math.round(window.innerHeight*.8),h));
  let h=240;try{h=clampH(+localStorage.getItem(KEY)||240)}catch(e){}
  const redraw=()=>{if(typeof redrawGraph==='function')redrawGraph()};
  const apply=()=>{res.style.height=h+'px'};
  const sync=()=>{const m=res.classList.contains('min');btn.textContent=m?'▴':'▾';btn.title=m?'Expand results log':'Collapse results log';if(!m)apply();else res.style.height='';setTimeout(redraw,30)};
  btn.addEventListener('click',e=>{e.stopImmediatePropagation();res.classList.toggle('min')},true);
  const grip=document.createElement('div');grip.id='rGrip';grip.title='Drag to resize';res.prepend(grip);
  grip.addEventListener('pointerdown',e=>{e.preventDefault();const y0=e.clientY,h0=res.getBoundingClientRect().height;grip.setPointerCapture(e.pointerId);grip.classList.add('drag');
    const mv=ev=>{h=clampH(h0+(y0-ev.clientY));apply()},up=()=>{grip.classList.remove('drag');grip.removeEventListener('pointermove',mv);grip.removeEventListener('pointerup',up);try{localStorage.setItem(KEY,String(h))}catch(x){}redraw()};
    grip.addEventListener('pointermove',mv);grip.addEventListener('pointerup',up)});
  new MutationObserver(sync).observe(res,{attributes:true,attributeFilter:['class']});sync();
})();

let dawArmed=0,dawMade=[];
function dawProfile(sh){
  const N=NR(sh),num=[],txt=[],date=[];
  sh.cols.forEach((c,i)=>{const vals=c.d.slice(0,N).filter(v=>v!=null&&v!==''&&!(typeof v==='number'&&Number.isNaN(v)));
    if(c.fmt==='date')date.push(i);else if(vals.length&&vals.every(v=>typeof v==='number'))num.push(i);else if(vals.length)txt.push(i)});
  let miss=0,missRows=[],dup=0;const seen=new Set();
  for(let r=0;r<N;r++){let m=false;sh.cols.forEach(c=>{const v=c.d[r];if(v==null||v===''||(typeof v==='number'&&Number.isNaN(v))){miss++;m=true}});if(m)missRows.push(r);
    const k=sh.cols.map(c=>String(c.d[r])).join('\u0001');if(seen.has(k))dup++;else seen.add(k)}
  let mono=false;const xi=date.length?date[0]:num[0];
  if(xi!=null){const d=sh.cols[xi].d;let up=true,dn=true;for(let r=1;r<N;r++){if(!(d[r]>d[r-1]))up=false;if(!(d[r]<d[r-1]))dn=false}mono=N>2&&(up||dn)}
  return{N,num,txt,date,miss,missRows,dup,mono,xi}}
function dawSel(cs){gsel={c0:cs[0],r0:0,c1:cs[0],r1:0,extra:new Set(cs)};cur={r:0,c:cs[0]};if(typeof paintSel==='function')paintSel()}
function dawRun(id,sh,over){const def=A.defs[id];if(!def)return flash('Analysis not available');const v=defaultsFor(def,sh);Object.assign(v,over);runAnalysis(id,v,sh)}
function dawAdvice(sh){
  const p=dawProfile(sh),nm=i=>sh.cols[i].name||L(i),out=[];
  const act=(group,title,sub,fn,warn)=>out.push({group,title,sub,fn,warn});
  if(sh.isMatrix){
    act('Visualise','Heatmap','Show the matrix as a colour map',()=>plotCmd('heat'));
    act('Visualise','3D surface','Rotate the matrix as a surface',()=>plotCmd('surf3d'));
    act('Visualise','Contour plot','Lines of equal value',()=>plotCmd('contour'));
    return{p,out}}
  if(p.missRows.length)act('Clean up',`Remove ${p.missRows.length} row${p.missRows.length>1?'s':''} with missing values`,`${p.miss} empty cell${p.miss>1?'s':''} found`,()=>{openWin('sheet',sh.id);deleteRows(p.missRows)},true);
  if(p.dup)act('Clean up',`Remove ${p.dup} duplicate row${p.dup>1?'s':''}`,'Identical rows are kept once',()=>{openWin('sheet',sh.id);removeDuplicateRows()},true);
  const ys=p.xi!=null&&(p.mono||p.date.length)?p.num.filter(i=>i!==p.xi):p.num;
  if(p.xi!=null&&p.mono&&ys.length){
    act('Visualise',`Plot ${ys.slice(0,3).map(nm).join(', ')}${ys.length>3?'…':''} vs ${nm(p.xi)}`,'Line plot, first column as X',()=>{sh.cols[p.xi].des='X';openWin('sheet',sh.id);dawSel(ys.slice(0,6));plotCmd('line')});
    act('Visualise','Scatter plot with symbols','Points only, good for measurements',()=>{sh.cols[p.xi].des='X';openWin('sheet',sh.id);dawSel(ys.slice(0,6));plotCmd('scatter')})}
  else if(p.num.length>=2){
    act('Visualise',`Scatter: ${nm(p.num[1])} vs ${nm(p.num[0])}`,'See whether two columns are related',()=>{sh.cols[p.num[0]].des='X';openWin('sheet',sh.id);dawSel([p.num[1]]);plotCmd('scatter')})}
  if(p.num.length)act('Visualise',`Histogram of ${nm(p.num[0])}`,'Distribution of the values',()=>{openWin('sheet',sh.id);dawSel([p.num[0]]);plotCmd('hist')});
  if(p.num.length>=2)act('Visualise','Box chart of all numeric columns','Compare spread and outliers',()=>{openWin('sheet',sh.id);dawSel(p.num.slice(0,12));plotCmd('box')});
  if(p.num.length>=3)act('Visualise','Scatter matrix','Every column against every other',()=>{openWin('sheet',sh.id);dawSel(p.num.slice(0,8));plotCmd('scatmat')});
  if(p.num.length)act('Analyse','Descriptive statistics','Mean, SD, median, quartiles…',()=>{openWin('sheet',sh.id);dawRun('descr',sh,{cols:p.num})});
  if(p.num.length)act('Analyse',`Normality test (${nm(p.num[0])})`,'Is the data roughly Gaussian?',()=>{openWin('sheet',sh.id);dawRun('normal',sh,{y:p.num[0]})});
  if(p.num.length>=2)act('Analyse','Correlation matrix','How strongly do columns move together?',()=>{openWin('sheet',sh.id);dawRun('corr',sh,{cols:p.num})});
  if(p.num.length>=2)act('Analyse',`Linear regression: ${nm(p.num[1])} on ${nm(p.num[0])}`,'Fit a straight line with statistics',()=>{openWin('sheet',sh.id);dawRun('linreg',sh,{x:p.num[0],y:p.num[1]})});
  if(p.num.length>=3)act('Analyse','Principal component analysis','Find the main directions of variation',()=>{openWin('sheet',sh.id);dawRun('pca',sh,{cols:p.num})});
  if(typeof statsAdvisor==='function')act('Not sure?','Open the Stats advisor','Answer a few questions to find the right test',()=>{openWin('sheet',sh.id);statsAdvisor()});
  return{p,out}}
function dawClose(){const e=document.getElementById('daw');if(e)e.remove()}
function dawShow(sh){
  sh=sh||curSheet();if(!sh)return flash('Import or open a sheet first');dawClose();
  const{p,out}=dawAdvice(sh),el=document.createElement('div');el.id='daw';
  const parts=[`${p.N} rows × ${sh.cols.length} columns`];if(p.num.length)parts.push(`${p.num.length} numeric`);if(p.date.length)parts.push(`${p.date.length} date`);if(p.txt.length)parts.push(`${p.txt.length} text`);
  const notes=[];if(sh.isMatrix)notes.push('Looks like a matrix (grid of values).');else{if(p.mono)notes.push(`“${esc(sh.cols[p.xi].name||L(p.xi))}” increases steadily and looks like an X axis.`);if(!p.miss&&!p.dup)notes.push('No missing values or duplicate rows.')}
  let html=`<div class="dh"><b>What would you like to do with “${esc(sh.name)}”?</b><button id="dawX" title="Close">✕</button></div><div class="ds">${parts.join(' · ')}<br>${notes.join(' ')}</div>`,last='';
  out.forEach((o,i)=>{if(o.group!==last){html+=`<div class="dg">${o.group}</div>`;last=o.group}html+=`<button class="da${o.warn?' warn':''}" data-i="${i}">${esc(o.title)}<small>${esc(o.sub)}</small></button>`});
  let off=false;try{off=localStorage.getItem('la_daw_off')==='1'}catch(e){}
  html+=`<div class="df"><input type="checkbox" id="dawOff" ${off?'checked':''}><label for="dawOff">Don’t suggest after import (reopen via File ▸ Data assistant)</label></div>`;
  el.innerHTML=html;document.body.append(el);
  el.onclick=e=>{if(e.target.closest('#dawX'))return dawClose();const b=e.target.closest('.da');if(!b)return;const o=out[+b.dataset.i];
    try{o.fn()}catch(err){alert('Could not do that: '+err.message)}
    if(o.group==='Clean up')setTimeout(()=>dawShow(sh),50);else dawClose()};
  el.querySelector('#dawOff').onchange=e=>{try{localStorage.setItem('la_daw_off',e.target.checked?'1':'0')}catch(x){}}}
(function(){
  const mk=mkSheet;mkSheet=function(){const sh=mk.apply(this,arguments);if(dawArmed)dawMade.push(sh);return sh};
  const imp=importFile;importFile=async function(file){dawMade=[];dawArmed=1;try{await imp.apply(this,arguments)}finally{dawArmed=0}dawAfter()};
  const iw=importWizard;importWizard=function(file){dawMade=[];dawArmed=1;setTimeout(()=>{dawArmed=0},10*60*1000);return iw.apply(this,arguments)};
  const op=openWin;openWin=function(t,id){op.apply(this,arguments);if(dawArmed&&t==='sheet'&&dawPending==null&&dawMade.some(q=>q.id===id))dawPending=setTimeout(dawAfter,60)};
  RIB.File.push(['Assistant',[['Data assistant','✨',()=>dawShow()]]]);
})();
let dawPending=null;
function dawAfter(){clearTimeout(dawPending);dawPending=null;const sh=dawMade[dawMade.length-1];dawMade=[];dawArmed=0;if(!sh)return;
  try{if(localStorage.getItem('la_daw_off')==='1')return}catch(e){}
  setTimeout(()=>dawShow(sh),150)}
