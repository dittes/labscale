// ===== Insight tools: data profile, outlier masking, colour-vision preview =====
function profStats(sh,ci){
  const c=sh.cols[ci],N=NR(sh),vals=[];let miss=0;const uniq=new Set();
  for(let r=0;r<N;r++){const v=c.d[r];if(v==null||v===''||(typeof v==='number'&&Number.isNaN(v))){miss++;continue}uniq.add(v);if(typeof v==='number')vals.push(v)}
  const o={name:c.name||L(ci),unit:c.unit,n:N-miss,miss,uniq:uniq.size,numeric:vals.length>0&&vals.length===N-miss,date:c.fmt==='date'};
  if(o.numeric){const s=vals.slice().sort((a,b)=>a-b),q=p=>{const i=(s.length-1)*p,f=Math.floor(i);return s[f]+(s[Math.min(f+1,s.length-1)]-s[f])*(i-f)};
    const mean=s.reduce((a,b)=>a+b,0)/s.length,sd=Math.sqrt(s.reduce((a,b)=>a+(b-mean)**2,0)/Math.max(1,s.length-1)),q1=q(.25),q3=q(.75),iqr=q3-q1;
    Object.assign(o,{min:s[0],max:s[s.length-1],mean,sd,med:q(.5),q1,q3,out:s.filter(v=>v<q1-1.5*iqr||v>q3+1.5*iqr).length});
    const nb=Math.min(20,Math.max(5,Math.round(Math.sqrt(s.length)))),lo=s[0],hi=s[s.length-1],w=(hi-lo)/nb||1,bins=new Array(nb).fill(0);s.forEach(v=>bins[Math.min(nb-1,Math.floor((v-lo)/w))]++);o.bins=bins}
  return o}
function profSpark(bins){const m=Math.max(...bins),w=100/bins.length;return`<svg viewBox="0 0 100 28" width="100" height="28" preserveAspectRatio="none">${bins.map((b,i)=>`<rect x="${i*w+.5}" y="${28-b/m*26}" width="${w-1}" height="${b/m*26}" fill="currentColor" opacity=".75"/>`).join('')}</svg>`}
function dataProfileDialog(){
  const sh=curSheet();if(!sh)return alert('Open a sheet first.');if(sh.isMatrix)return flash('Not available on matrix sheets');
  const f=v=>v==null||!Number.isFinite(v)?'':(Math.abs(v)>=1e5||(v!==0&&Math.abs(v)<1e-3)?v.toExponential(2):String(+v.toPrecision(4))),N=NR(sh);
  const rows=sh.cols.map((_,i)=>profStats(sh,i)).map(o=>`<tr><td><b>${esc(o.name)}</b>${o.unit?` <span class="note">(${esc(o.unit)})</span>`:''}</td><td>${o.date?'date':o.numeric?'number':'text'}</td><td>${o.n}</td><td${o.miss?' style="color:var(--warn)"':''}>${o.miss||''}</td><td>${o.uniq}</td>${o.numeric?`<td>${f(o.min)}</td><td>${f(o.mean)}</td><td>${f(o.med)}</td><td>${f(o.max)}</td><td>${f(o.sd)}</td><td${o.out?' style="color:var(--warn)"':''}>${o.out||''}</td><td style="color:var(--acc)">${profSpark(o.bins)}</td>`:'<td colspan="7" class="note">—</td>'}</tr>`).join('');
  const d=document.createElement('dialog');d.className='dlg';d.style.maxWidth='980px';
  d.innerHTML=`<form method="dialog"><h3>Data profile — ${esc(sh.name)}</h3><div class="fl" style="max-height:66vh;overflow:auto"><div class="note" style="margin-bottom:6px">${N} rows × ${sh.cols.length} columns. Outliers use the 1.5 × IQR rule.</div><table class="rt"><tr><th>Column</th><th>Type</th><th>Valid</th><th>Missing</th><th>Unique</th><th>Min</th><th>Mean</th><th>Median</th><th>Max</th><th>SD</th><th>Outliers</th><th>Distribution</th></tr>${rows}</table></div><div class="fb"><button value="x">Close</button></div></form>`;
  document.body.append(d);d.addEventListener('close',()=>d.remove());d.showModal()}
function maskOutliersDialog(){
  const sh=curSheet();if(!sh||sh.isMatrix)return alert('Open a worksheet first.');
  dialog({title:'Mask outliers',ok:'Mask',sheet:sh,hint:'Rows with an outlier in any chosen column are masked: hidden from plots and analyses, but kept in the sheet. Unmask via Data ▸ Mask.',fields:[{t:'cols',k:'cols',label:'Columns',def:selectedCols()},{t:'sel',k:'m',label:'Rule',def:'iqr',opts:[['iqr','Tukey fences (1.5 × IQR)'],['iqr3','Far-out fences (3 × IQR)'],['z3','|z| > 3'],['mad','Modified z-score > 3.5 (MAD)']]}],
    onOk:a=>{const cs=[].concat(a.cols).filter(i=>sh.cols[i]);const N=NR(sh),bad=new Set();
      cs.forEach(ci=>{const idx=[],v=[];for(let r=0;r<N;r++){const x=sh.cols[ci].d[r];if(typeof x==='number'&&Number.isFinite(x)){idx.push(r);v.push(x)}}if(v.length<4)return;
        const s=v.slice().sort((p,q)=>p-q),q=p=>{const i=(s.length-1)*p,f=Math.floor(i);return s[f]+(s[Math.min(f+1,s.length-1)]-s[f])*(i-f)};
        let test;if(a.m==='z3'){const m=v.reduce((p,q)=>p+q,0)/v.length,sd=Math.sqrt(v.reduce((p,q)=>p+(q-m)**2,0)/(v.length-1));test=x=>sd>0&&Math.abs(x-m)/sd>3}
        else if(a.m==='mad'){const md=q(.5),dev=v.map(x=>Math.abs(x-md)).sort((p,q)=>p-q),mad=dev[Math.floor(dev.length/2)];test=x=>mad>0&&.6745*Math.abs(x-md)/mad>3.5}
        else{const k=a.m==='iqr3'?3:1.5,q1=q(.25),q3=q(.75);test=x=>x<q1-k*(q3-q1)||x>q3+k*(q3-q1)}
        idx.forEach((r,j)=>{if(test(v[j]))bad.add(r)})});
      if(!bad.size)return flash('No outliers found');histHint='Mask outliers';snap();histHint=null;sh.mask=sh.mask||[];bad.forEach(r=>sh.mask[r]=true);dirty();renderGrid();redrawGraph(true);flash(`${bad.size} row${bad.size>1?'s':''} masked`)}})}
// colour-vision preview (display only; exports are unchanged)
const CVD_MATRIX={deut:'0.367 0.861 -0.228 0 0  0.280 0.673 0.047 0 0  -0.012 0.043 0.969 0 0  0 0 0 1 0',prot:'0.152 1.053 -0.205 0 0  0.115 0.786 0.099 0 0  -0.004 -0.048 1.052 0 0  0 0 0 1 0',trit:'1.256 -0.077 -0.179 0 0  -0.078 0.931 0.148 0 0  0.005 0.691 0.304 0 0  0 0 0 1 0'};
function cvdPreview(mode){
  const cv=document.getElementById('cv');if(!cv)return;
  if(!document.getElementById('cvdDefs')){const s=document.createElementNS('http://www.w3.org/2000/svg','svg');s.id='cvdDefs';s.setAttribute('width','0');s.setAttribute('height','0');s.style.position='absolute';
    s.innerHTML=Object.entries(CVD_MATRIX).map(([k,m])=>`<filter id="cvd-${k}"><feColorMatrix type="matrix" values="${m}"/></filter>`).join('');document.body.append(s)}
  cv.style.filter=mode==='gray'?'grayscale(1)':CVD_MATRIX[mode]?`url(#cvd-${mode})`:'';
  if(mode)flash({deut:'Preview: red-green (deuteranopia)',prot:'Preview: red-green (protanopia)',trit:'Preview: blue-yellow (tritanopia)',gray:'Preview: grayscale print'}[mode]+' — display only');else flash('Colour preview off')}
(function(){
  RIB.Column.push(['Insight',[['Data profile','▥',dataProfileDialog],['Mask outliers…','⊘',maskOutliersDialog]]]);
  RIB.Plot.push(['Colour-vision check',[['Preview: red-green (deuteranopia)','◐',()=>cvdPreview('deut')],['Preview: red-green (protanopia)','◑',()=>cvdPreview('prot')],['Preview: blue-yellow (tritanopia)','◒',()=>cvdPreview('trit')],['Preview: grayscale print','◍',()=>cvdPreview('gray')],['Preview off','○',()=>cvdPreview('')]]]);
  // offer the profile from the import assistant
  const adv=dawAdvice;dawAdvice=function(sh){const r=adv(sh);if(!sh.isMatrix)r.out.unshift({group:'Understand',title:'Data profile',sub:'Types, missing values, ranges and distributions per column',fn:()=>{openWin('sheet',sh.id);dataProfileDialog()}});
    if(!sh.isMatrix&&r.p.num.length)r.out.push({group:'Clean up',title:'Mask outliers…',sub:'Hide extreme values from plots and analyses',fn:()=>{openWin('sheet',sh.id);maskOutliersDialog()}});
    r.out.sort((a,b)=>['Understand','Clean up','Visualise','Analyse','Not sure?'].indexOf(a.group)-['Understand','Clean up','Visualise','Analyse','Not sure?'].indexOf(b.group));return r};
})();
