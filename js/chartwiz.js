// ===== Chart wizard: 1 Upload -> 2 Check & describe -> 3 Visualize (type, refine, annotate, layout) -> 4 Publish =====
let cw=null;
const CW_SIZES=[['','Default for this chart type'],['1200x630','Social media 1200 × 630'],['1080x1080','Square 1080 × 1080'],['1280x720','Slide 16:9 1280 × 720'],['800x500','Blog 800 × 500'],['600x400','Compact 600 × 400']];
const CW_KEEP=['title','subtitle','desc','xl','yl','notes','refs','ys','xs','fs','font','legend','gridx','gridy','outSize','cwDark','cwSrc','lwAll'];
const cwStepNames=['Upload','Check & describe','Visualize','Publish'];
const cwQ=s=>cw.el.querySelector(s);
const cwPal=()=>cw.g&&cw.g.cwDark?DARK:LIGHT;

(function(){const gs=graphSize;graphSize=function(g){return g&&g.outSize?g.outSize:gs(g)}})();

function cwStart(sheet){
  if(cw)return;
  cw={step:sheet?2:1,sh:sheet||null,own:!sheet,name:sheet?sheet.name:'',text:null,opts:{sep:'auto',skip:0,header:'auto',decimal:'auto',dates:true,naTokens:true,thousands:'',comment:'#',custom:''},x:-1,ys:[],type:'line',g:null,tab:'refine',tpl:-1,committed:false,mask:false};
  const el=cw.el=document.createElement('div');el.id='cw';document.body.append(el);
  el.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();cwClose()}});
  if(sheet){cw.des=sheet.cols.map(c=>c.des);cwInitCols()}
  cwRender()}
function cwClose(force){
  if(!cw)return;if(!force&&cw.step>=2&&!cw.committed&&cw.own&&!confirm('Close the chart wizard? The uploaded data and chart will be discarded.'))return;
  if(!cw.own&&cw.des&&cw.sh)cw.sh.cols.forEach((c,i)=>{if(cw.des[i]!==undefined)c.des=cw.des[i]});
  if(cw.own&&!cw.committed&&cw.sh){const i=P.sheets.indexOf(cw.sh);if(i>=0)P.sheets.splice(i,1)}
  if(cw.el)cw.el.remove();cw=null}
function cwRender(){
  const s=cw.step,el=cw.el;
  el.innerHTML=`<div class="cwh"><b class="cwt">Chart wizard</b><ol class="cws">${cwStepNames.map((n,i)=>`<li class="${i+1===s?'on':i+1<s?'done':''}" ${i+1<s?`data-go="${i+1}"`:''}><span>${i+1<s?'✓':i+1}</span>${n}</li>`).join('')}</ol><span class="sp"></span><button id="cwX" title="Close (Esc)">✕</button></div><div class="cwb" id="cwB"></div><div class="cwf"><button id="cwBack" ${s===1||(s===2&&!cw.own)?'disabled':''}>← Back</button><span class="sp"></span><span class="note" id="cwMsg"></span>${s<4?`<button class="p" id="cwNext">${s===3?'Continue to publish →':'Next →'}</button>`:`<button class="p" id="cwDone">Open in workspace</button>`}</div>`;
  el.onclick=e=>{const t=e.target;if(t.closest('#cwX'))return cwClose();const go=t.closest('[data-go]');if(go){cw.step=+go.dataset.go;return cwRender()}
    if(t.closest('#cwBack')){cw.step--;return cwRender()}if(t.closest('#cwNext'))return cwNext();if(t.closest('#cwDone'))return cwFinish()};
  [cwStep1,cwStep2,cwStep3,cwStep4][s-1](cwQ('#cwB'))}
function cwNext(){
  if(cw.step===1&&!cw.sh)return cwMsg('Add some data first');
  if(cw.step===2){if(!cw.ys.length)return cwMsg('Pick at least one column with the role “Y” (values)');}
  cw.step++;cwRender()}
function cwMsg(t){const m=cwQ('#cwMsg');if(m){m.textContent=t;clearTimeout(m._t);m._t=setTimeout(()=>m.textContent='',3500)}}

// ---------- step 1: upload ----------
function cwStep1(b){
  const smp=typeof SAMPLES!=='undefined'?Object.entries(SAMPLES).slice(0,8):[];
  b.innerHTML=`<div class="cw1"><div class="cwdrop" id="cwDrop"><div class="big">⇪</div><b>Drop a data file here</b><div class="note">CSV, TSV, TXT, Excel, JSON, HTML tables or XML</div><button class="p" id="cwPick">Choose file…</button></div>
  <div class="cwor">or paste your data</div><textarea id="cwPaste" rows="6" spellcheck="false" placeholder="Paste rows copied from a spreadsheet, or type CSV.&#10;Year,Sales,Costs&#10;2021,120,90&#10;2022,150,100"></textarea><div><button id="cwUse">Use pasted data</button></div>
  <div class="cwor">or start with an example</div><div class="cwsamples">${smp.map(([k,v])=>`<button data-s="${k}">${esc(v.label)}</button>`).join('')}</div>${cw.sh?`<p class="note">Loaded: <b>${esc(cw.name)}</b> (${NR(cw.sh)} rows × ${cw.sh.cols.length} columns). Click Next, or load something else.</p>`:''}</div>
  <input type="file" id="cwFile" hidden accept=".csv,.tsv,.txt,.dat,.prn,.asc,.xlsx,.xls,.json,.html,.htm,.xml">`;
  const drop=b.querySelector('#cwDrop');
  drop.ondragover=e=>{e.preventDefault();e.stopPropagation();drop.classList.add('dz')};drop.ondragleave=()=>drop.classList.remove('dz');
  drop.ondrop=e=>{e.preventDefault();e.stopPropagation();drop.classList.remove('dz');if(e.dataTransfer.files[0])cwFile(e.dataTransfer.files[0])};
  b.querySelector('#cwPick').onclick=()=>b.querySelector('#cwFile').click();b.querySelector('#cwFile').onchange=e=>{if(e.target.files[0])cwFile(e.target.files[0])};
  b.querySelector('#cwUse').onclick=()=>{const t=b.querySelector('#cwPaste').value;if(!t.trim())return cwMsg('Paste some data first');cwText(t,'Pasted data')};
  b.querySelector('.cwsamples').onclick=e=>{const k=e.target.closest('[data-s]');if(!k)return;const s=SAMPLES[k.dataset.s].make();cwSetSheet(mkSheetDetached(s.name,s.cols,s.isMatrix?{isMatrix:true,xv:s.xv,yv:s.yv}:{}),s.name)}}
function mkSheetDetached(name,cols,extra){const n=P.sheets.length,sh=mkSheet(name,cols,extra);P.sheets.length=n;return sh}
function cwDropOld(){if(cw.own&&cw.sh){const i=P.sheets.indexOf(cw.sh);if(i>=0)P.sheets.splice(i,1)}}
function cwSetSheet(sh,name){cwDropOld();cw.sh=sh;cw.own=true;cw.name=name;P.sheets.push(sh);cwInitCols();cw.step=2;cwRender()}
async function cwFile(file){
  const nm=file.name.replace(/\.[^.]+$/,'');
  if(/\.(csv|tsv|txt|dat|prn|asc)$/i.test(file.name)||!/\.[a-z0-9]+$/i.test(file.name)){const buf=await file.arrayBuffer(),u=new Uint8Array(buf);let enc='utf-8';if(u[0]===0xFF&&u[1]===0xFE)enc='utf-16le';else if(u[0]===0xFE&&u[1]===0xFF)enc='utf-16be';
    let t;try{t=new TextDecoder(enc).decode(buf)}catch(e){t=new TextDecoder('utf-8').decode(buf)}if(/�/.test(t)&&enc==='utf-8')t=new TextDecoder('windows-1252').decode(buf);return cwText(t,nm)}
  cwMsg('Reading file…');const before=new Set(P.sheets);window.cwSuppress=true;
  try{await importFile(file)}finally{window.cwSuppress=false}
  const made=P.sheets.filter(s=>!before.has(s));if(!made.length)return cwMsg('No table found in that file');
  const sh=made[made.length-1];P.sheets=P.sheets.filter(s=>before.has(s));P.open=P.open.filter(w=>w.t!=='sheet'||P.sheets.some(s=>s.id===w.id));if(P.act&&!winObj(P.act.t,P.act.id))P.act=P.open[0]||null;showWin();
  cwSetSheet(sh,nm)}
function cwText(t,nm){cw.text=t;cw.name=nm;cwReparse()}
function cwReparse(){
  let r;try{const o={...cw.opts};if(o.header!=='auto')o.header=+o.header;r=parseWizard(cw.text,o)}catch(e){return cwMsg('Could not read the data: '+e.message)}
  if(!r.cols.length||!r.nrows)return cwMsg('No data rows found');cw.info=r.info;
  const sh=mkSheetDetached(cw.name,r.cols.map(c=>({unit:'',comment:'',...c})));cwDropOld();cw.sh=sh;cw.own=true;P.sheets.push(sh);cwInitCols();
  if(cw.step===1)cw.step=2;cwRender()}
function cwInitCols(){
  const sh=cw.sh,N=NR(sh),isNum=c=>c.d.some(v=>typeof v==='number'&&Number.isFinite(v))&&c.d.every(v=>typeof v==='number'||v==null||v==='');
  let x=sh.cols.findIndex(c=>c.des==='X');const num=sh.cols.map((c,i)=>isNum(c)?i:-1).filter(i=>i>=0);
  if(sh.cols.length===1)x=-1;else if(x<0)x=sh.cols.findIndex(c=>c.fmt==='date');
  if(x<0&&sh.cols.length>1&&num.length)x=num[0];
  cw.x=x;cw.ys=num.filter(i=>i!==x).slice(0,8);if(!cw.ys.length&&num.length)cw.ys=[num[0]];
  const xd=x>=0&&sh.cols[x].fmt==='date',dx=x>=0?sh.cols[x].d:[];let mono=x>=0&&N>2;for(let r=1;r<N&&mono;r++)if(!(dx[r]>dx[r-1])&&!(dx[r]<dx[r-1]))mono=false;
  cw.type=cw.ys.length===1&&x<0?'hist':(xd||mono)?'line':x>=0?'scatter':'box';cwApplyRoles();cw.g=null}
function cwApplyRoles(){cw.sh.cols.forEach((c,i)=>{if(i===cw.x)c.des='X';else if(cw.ys.includes(i))c.des='Y';else c.des='L'})}

// ---------- step 2: check & describe ----------
function cwOutliers(){
  const sh=cw.sh,N=NR(sh),out=new Map();
  cw.ys.forEach(ci=>{const c=sh.cols[ci],v=[];for(let r=0;r<N;r++)if(typeof c.d[r]==='number'&&Number.isFinite(c.d[r]))v.push(c.d[r]);if(v.length<6)return;
    const s=v.slice().sort((a,b)=>a-b),q=p=>{const i=(s.length-1)*p,f=Math.floor(i);return s[f]+(s[Math.min(f+1,s.length-1)]-s[f])*(i-f)},q1=q(.25),q3=q(.75),lo=q1-1.5*(q3-q1),hi=q3+1.5*(q3-q1);
    for(let r=0;r<N;r++){const x=c.d[r];if(typeof x==='number'&&Number.isFinite(x)&&(x<lo||x>hi)){if(!out.has(r))out.set(r,new Set());out.get(r).add(ci)}}});
  return out}
function cwStep2(b){
  const sh=cw.sh,N=NR(sh),show=Math.min(N,200),outl=cwOutliers(),cols=sh.cols;
  const roleSel=i=>`<select data-role="${i}"><option value="X" ${cw.x===i?'selected':''}>X / category</option><option value="Y" ${cw.ys.includes(i)?'selected':''}>Y value</option><option value="L" ${cw.x!==i&&!cw.ys.includes(i)?'selected':''}>Ignore</option></select>`;
  const text=cw.text!=null,o=cw.opts;
  b.innerHTML=`${text?`<div class="cwopt"><label>Delimiter <select data-o="sep"><option value="auto">Auto</option><option value=",">Comma</option><option value=";">Semicolon</option><option value="\t">Tab</option><option value="|">Pipe</option><option value="space">Whitespace</option></select></label><label>Decimal <select data-o="decimal"><option value="auto">Auto</option><option value=".">1.5</option><option value=",">1,5</option></select></label><label>Header rows <select data-o="header"><option value="auto">Auto</option><option value="0">0</option><option value="1">1 (names)</option><option value="2">2 (+units)</option></select></label><label>Skip lines <input data-o="skip" type="number" min="0" value="${o.skip}" style="width:60px"></label></div>`:''}
  <div class="cwsum" id="cwSum"></div><div class="cwtab"><table class="rt"><thead><tr><th class="rn"></th>${cols.map((c,i)=>`<th><input class="hn" data-n="${i}" value="${esc(c.name||'')}" placeholder="${L(i)}"><input class="hu" data-u="${i}" value="${esc(c.unit||'')}" placeholder="unit">${roleSel(i)}</th>`).join('')}</tr></thead><tbody>${Array.from({length:show},(_,r)=>`<tr><td class="rn">${r+1}</td>${cols.map((c,i)=>{const v=c.d[r],na=v==null||v===''||(typeof v==='number'&&Number.isNaN(v)),isOut=outl.get(r)?.has(i);return`<td contenteditable="plaintext-only" data-r="${r}" data-c="${i}" class="${na?'na':''}${isOut?' out':''}${typeof v==='number'?' num':''}">${na?'':c.fmt==='date'&&typeof v==='number'?esc(new Date(v).toISOString().slice(0,10)):esc(String(v))}</td>`}).join('')}</tr>`).join('')}</tbody></table>${N>show?`<div class="note" style="padding:6px">Showing the first ${show} of ${N} rows.</div>`:''}</div>`;
  if(text)b.querySelectorAll('[data-o]').forEach(e=>{e.value=cw.opts[e.dataset.o]});
  cwSummary();
  b.onchange=e=>{const t=e.target;
    if(t.dataset.o){cw.opts[t.dataset.o]=t.type==='number'?+t.value:t.value;return cwReparse()}
    if(t.dataset.role!==undefined){const i=+t.dataset.role;if(t.value==='X'){cw.x=i;cw.ys=cw.ys.filter(j=>j!==i)}else{if(cw.x===i)cw.x=-1;cw.ys=cw.ys.filter(j=>j!==i);if(t.value==='Y')cw.ys.push(i)}cw.ys.sort((p,q)=>p-q);cwApplyRoles();cw.g=null;return cwStep2(b)}
    if(t.dataset.n!==undefined)cols[+t.dataset.n].name=t.value.trim();if(t.dataset.u!==undefined)cols[+t.dataset.u].unit=t.value.trim();cw.g=null};
  b.onfocusout=e=>{const td=e.target.closest&&e.target.closest('td[data-r]');if(!td)return;const r=+td.dataset.r,ci=+td.dataset.c,c=cols[ci],t=td.textContent.trim().replace(/ /g,' ');
    let v=t===''?NaN:(c.fmt==='date'?Date.parse(t):Number(t.replace(',','.')));if(t!==''&&Number.isNaN(v)){if(c.fmt==='date')v=NaN;else v=t}
    if(c.d[r]===v||(Number.isNaN(v)&&(c.d[r]==null||Number.isNaN(c.d[r]))))return;c.d[r]=v;cw.g=null;cwStep2(b)};
  b.onclick=e=>{if(e.target.closest('#cwMask')){cw.mask=e.target.closest('#cwMask').checked;const out=cwOutliers();sh.mask=[];if(cw.mask)out.forEach((_,r)=>sh.mask[r]=true);cw.g=null}};}
function cwSummary(){
  const sh=cw.sh,N=NR(sh),out=cwOutliers(),cells=[...out.values()].reduce((a,s)=>a+s.size,0);let na=0;sh.cols.forEach(c=>{for(let r=0;r<N;r++){const v=c.d[r];if(v==null||v===''||(typeof v==='number'&&Number.isNaN(v)))na++}});
  const el=cwQ('#cwSum');if(!el)return;
  el.innerHTML=`<b>${N}</b> rows × <b>${sh.cols.length}</b> columns${cw.info?` · delimiter “${esc(cw.info.sep)}”, decimal “${esc(cw.info.decimal)}”`:''}${na?` · <span class="warnt">${na} empty cell${na>1?'s':''}</span>`:''}. ${out.size?`<span class="warnt">${cells} potential outlier${cells>1?'s':''} in ${out.size} row${out.size>1?'s':''}</span> (highlighted) <label class="inl"><input type="checkbox" id="cwMask" ${cw.mask?'checked':''}> leave them out of the chart</label>`:'<span class="okt">No outliers detected.</span>'} Click a cell to edit it, rename columns, and set each column’s role.`}

// ---------- step 3: visualize ----------
function cwWith(fn){const pa=P.act,gs=gsel,cs=cur;P.act={t:'sheet',id:cw.sh.id};gsel={c0:cw.ys[0]??0,r0:0,c1:cw.ys[0]??0,r1:0,extra:new Set(cw.ys)};
  try{return fn()}finally{P.act=pa;gsel=gs;cur=cs}}
function cwBuild(type){
  const old=cw.g;let g=null;window.PLOT_DRY=true;const nid=P.nid,ao=window.alert;window.alert=()=>{};
  try{cwWith(()=>{g=plotCmd(type)})}catch(e){g=null}finally{window.PLOT_DRY=false;window.alert=ao;P.nid=nid}
  if(!g)return false;g.id=0;if(old)CW_KEEP.forEach(k=>{if(old[k]!==undefined)g[k]=old[k]});
  if(cw.tpl>=0)applyBuiltin(g,BUILTIN_TPL[cw.tpl]);if(old&&old.lwAll)g.series.forEach(s=>s.lw=old.lwAll);
  cw.g=g;cw.type=type;return true}
function cwStep3(b){
  if(!cw.g||cw.g.type!==cw.type)if(!cwBuild(cw.type)){const ok=['line','scatter','column','hist','box'].some(t=>cwBuild(t));if(!ok){cw.step=2;cwRender();return cwMsg('This data cannot be charted. Check column roles.')}}
  b.innerHTML=`<div class="cw3"><aside class="cwg"><div class="cwgh">Chart type</div><div class="cwgrid" id="cwGrid"></div><button id="cwMore" class="lnk">Show more chart types</button></aside>
  <main class="cwp"><div class="cwprev"><canvas id="cwCv"></canvas></div></main>
  <aside class="cwc"><div class="seg" id="cwSeg">${[['refine','Refine'],['annotate','Annotate'],['layout','Layout']].map(([k,l])=>`<button data-t="${k}" class="${cw.tab===k?'on':''}">${l}</button>`).join('')}</div><div id="cwCtl"></div></aside></div>`;
  cwDrawPreview();cwControls();cwGallery(false);
  b.querySelector('#cwSeg').onclick=e=>{const t=e.target.closest('[data-t]');if(!t)return;cw.tab=t.dataset.t;b.querySelectorAll('#cwSeg button').forEach(x=>x.classList.toggle('on',x===t));cwControls()};
  b.querySelector('#cwMore').onclick=e=>{e.target.remove();cwGallery(true)};
  b.querySelector('#cwGrid').onclick=e=>{const t=e.target.closest('[data-type]');if(!t)return;if(cwBuild(t.dataset.type)){cwQ('#cwGrid').querySelectorAll('.cwty').forEach(x=>x.classList.toggle('on',x===t));cwDrawPreview();cwControls()}else cwMsg('That chart type cannot show this data')}}
let cwGalTok=0;
function cwGallery(all){
  const grid=cwQ('#cwGrid');if(!grid)return;const tok=++cwGalTok;if(!all)grid.innerHTML='';
  let list=all?Object.keys(GTYPES).filter(t=>!PREVIEW_FIRST.includes(t)):PREVIEW_FIRST.filter(t=>GTYPES[t]);
  const step=()=>{if(tok!==cwGalTok||!cw||!document.body.contains(grid))return;const t=list.shift();if(!t)return;
    const url=cwWith(()=>previewThumb(t));
    if(url){const d=document.createElement('button');d.className='cwty'+(t===cw.type?' on':'');d.dataset.type=t;d.title=GTYPES[t];d.innerHTML=`<img src="${url}" alt=""><span>${esc(GTYPES[t])}</span>`;grid.append(d)}setTimeout(step,0)};
  step()}
function cwDrawPreview(){
  const cv=cwQ('#cwCv');if(!cv||!cw.g)return;const g=cw.g,[W,H]=graphSize(g),dpr=Math.min(2,window.devicePixelRatio||1);
  cv.width=W*dpr;cv.height=H*dpr;cv.style.aspectRatio=`${W}/${H}`;const c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);
  try{drawGraphTo(c,g,W,H,cwPal())}catch(e){c.fillStyle='#c00';c.fillText('Could not draw: '+e.message,20,30)}}
function cwControls(){
  const box=cwQ('#cwCtl');if(!box)return;const g=cw.g,sh=cw.sh;
  const T=(k,l,ph='')=>`<div class="f"><label>${l}</label><input type="text" data-k="${k}" value="${esc(g[k]||'')}" placeholder="${esc(ph)}"></div>`;
  if(cw.tab==='refine'){
    const num=sh.cols.map((c,i)=>i).filter(i=>sh.cols[i].d.some(v=>typeof v==='number'));
    box.innerHTML=`${T('title','Title','Headline that states the finding')}${T('subtitle','Subtitle')}${T('xl','X axis title',cw.x>=0?sh.cols[cw.x].name:'')}${T('yl','Y axis title')}
    <div class="f"><label>X axis</label><select id="cwX">${`<option value="-1" ${cw.x<0?'selected':''}>(row number)</option>`+sh.cols.map((c,i)=>`<option value="${i}" ${cw.x===i?'selected':''}>${esc(c.name||L(i))}</option>`).join('')}</select></div>
    <div class="f"><label>Y columns</label><div class="chk">${num.filter(i=>i!==cw.x).map(i=>`<label><input type="checkbox" data-y="${i}" ${cw.ys.includes(i)?'checked':''}> ${esc(sh.cols[i].name||L(i))}</label>`).join('')}</div></div>
    <div class="f"><label>Y scale</label><select data-k="ys"><option value="linear">Linear</option><option value="log">Logarithmic</option></select></div>
    <div class="f"><label>Line width</label><input type="range" min="1" max="6" step=".5" id="cwLw" value="${g.lwAll||g.series[0]?.lw||2}"></div>
    <div class="f c"><input type="checkbox" data-k="gridy" ${g.gridy?'checked':''}><label>Horizontal grid</label></div><div class="f c"><input type="checkbox" data-k="gridx" ${g.gridx?'checked':''}><label>Vertical grid</label></div>`;
    const ys=box.querySelector('[data-k=ys]');if(ys)ys.value=g.ys||'linear'}
  else if(cw.tab==='annotate'){
    box.innerHTML=`<div class="f"><label>Text note</label><input type="text" id="nT" placeholder="e.g. Peak in 2022"></div><div class="two"><div class="f"><label>at X</label><input type="text" id="nX"></div><div class="f"><label>at Y</label><input type="text" id="nY"></div></div><button id="nAdd">Add note</button>
    <div class="f" style="margin-top:12px"><label>Reference line</label></div><div class="two"><select id="rA"><option value="y">Horizontal (y =)</option><option value="x">Vertical (x =)</option></select><input type="text" id="rV" placeholder="value"></div><button id="rAdd">Add line</button>
    <div class="f" style="margin-top:12px"><label>Description below the chart</label><textarea rows="3" data-k="desc" placeholder="Explain what the reader should see">${esc(g.desc||'')}</textarea></div>${T('cwSrc','Source','Data: …')}
    <div class="cwlist">${(g.notes||[]).map((n,i)=>`<span class="tag">${esc(n.text)}<button data-rn="${i}">✕</button></span>`).join('')}${(g.refs||[]).map((r,i)=>`<span class="tag">${r.axis}=${Mx.fmt(r.v,5)}<button data-rr="${i}">✕</button></span>`).join('')}</div><p class="note">Tip: later, in the workspace, you can drag notes and draw arrows and shapes.</p>`}
  else{
    box.innerHTML=`<div class="f"><label>Size</label><select id="cwSz">${CW_SIZES.map(([v,l])=>`<option value="${v}" ${(g.outSize?g.outSize.join('x'):'')===v?'selected':''}>${l}</option>`).join('')}</select></div>
    <div class="f"><label>Style</label><select id="cwTpl"><option value="-1">Default</option>${BUILTIN_TPL.map((t,i)=>`<option value="${i}" ${cw.tpl===i?'selected':''}>${esc(t.name)}: ${esc(t.desc)}</option>`).join('')}</select></div>
    <div class="f"><label>Background</label><select id="cwBg"><option value="0">Light</option><option value="1" ${g.cwDark?'selected':''}>Dark</option></select></div>
    <div class="f"><label>Font size</label><input type="range" min="9" max="24" id="cwFs" value="${g.fs||12}"></div>
    <div class="f"><label>Legend</label><select data-k="legend">${[['none','Hidden'],['tr','Top right'],['tl','Top left'],['br','Bottom right'],['bl','Bottom left']].map(([v,l])=>`<option value="${v}" ${g.legend===v?'selected':''}>${l}</option>`).join('')}</select></div>`}
  cwBind(box)}
function cwBind(box){
  const redo=()=>{cwDrawPreview()};
  box.oninput=e=>{const t=e.target,k=t.dataset.k;if(k){const g=cw.g;g[k]=t.type==='checkbox'?t.checked:t.value;if(k==='cwSrc'||k==='desc')cwSyncSrc();redo();return}
    if(t.id==='cwLw'){cw.g.lwAll=+t.value;cw.g.series.forEach(s=>s.lw=+t.value);redo()}if(t.id==='cwFs'){cw.g.fs=+t.value;redo()}};
  box.onchange=e=>{const t=e.target;
    if(t.id==='cwX'){cw.x=+t.value;cw.ys=cw.ys.filter(j=>j!==cw.x);if(!cw.ys.length){const f=cw.sh.cols.findIndex((c,i)=>i!==cw.x&&c.d.some(v=>typeof v==='number'));if(f>=0)cw.ys=[f]}cwApplyRoles();cwRebuild();return}
    if(t.dataset.y!==undefined){const i=+t.dataset.y;cw.ys=cw.ys.filter(j=>j!==i);if(t.checked)cw.ys.push(i);cw.ys.sort((a,b)=>a-b);if(!cw.ys.length){t.checked=true;cw.ys=[i]}cwApplyRoles();cwRebuild();return}
    if(t.id==='cwSz'){cw.g.outSize=t.value?t.value.split('x').map(Number):null;redo()}
    if(t.id==='cwTpl'){cw.tpl=+t.value;if(cw.tpl>=0)applyBuiltin(cw.g,BUILTIN_TPL[cw.tpl]);else cwBuild(cw.type);cwControls();redo()}
    if(t.id==='cwBg'){cw.g.cwDark=t.value==='1';redo()}
    if(t.dataset.k==='ys'||t.dataset.k==='legend'||t.dataset.k==='gridx'||t.dataset.k==='gridy'){cw.g[t.dataset.k]=t.type==='checkbox'?t.checked:t.value;redo()}};
  box.onclick=e=>{const g=cw.g,t=e.target;
    if(t.id==='nAdd'){const tx=box.querySelector('#nT').value.trim(),x=box.querySelector('#nX').value,y=parseFloat(box.querySelector('#nY').value);let xv=parseFloat(x);if(cw.x>=0&&cw.sh.cols[cw.x].fmt==='date'&&Number.isNaN(xv))xv=Date.parse(x);if(!tx||Number.isNaN(xv)||Number.isNaN(y))return cwMsg('Enter the note text and numeric X and Y positions');(g.notes=g.notes||[]).push({x:xv,y,text:tx});cwControls();cwDrawPreview()}
    if(t.id==='rAdd'){const v=parseFloat(box.querySelector('#rV').value);if(Number.isNaN(v))return cwMsg('Enter a numeric value');(g.refs=g.refs||[]).push({axis:box.querySelector('#rA').value,v});cwControls();cwDrawPreview()}
    if(t.dataset.rn!==undefined){g.notes.splice(+t.dataset.rn,1);cwControls();cwDrawPreview()}if(t.dataset.rr!==undefined){g.refs.splice(+t.dataset.rr,1);cwControls();cwDrawPreview()}}}
function cwSyncSrc(){const g=cw.g;g.desc=(g.desc||'').replace(/\n?Source: .*$/,'');if(g.cwSrc&&g.cwSrc.trim()){g.desc=(g.desc?g.desc+'\n':'')+'Source: '+g.cwSrc.replace(/^Source:\s*/i,'').trim()}}
function cwRebuild(){if(!cwBuild(cw.type)){cw.g=null;cwBuild('line')||cwBuild('scatter')}cwDrawPreview();cwControls();cwGallery(false)}

// ---------- step 4: publish ----------
function cwName(){return(cw.g.title||cw.name||'chart').replace(/[^\w\- ]+/g,'').trim().replace(/\s+/g,'-').toLowerCase()||'chart'}
function cwCanvas(scale){const g=cw.g,[W,H]=graphSize(g),cv=document.createElement('canvas');cv.width=W*scale;cv.height=H*scale;const c=cv.getContext('2d');c.scale(scale,scale);drawGraphTo(c,g,W,H,cwPal());return cv}
function cwSVGText(){const g=cw.g,[W,H]=graphSize(g),c=new SVGCtx();drawGraphTo(c,g,W,H,cwPal());return c.toSVG(W,H)}
function cwStep4(b){
  b.innerHTML=`<div class="cw4"><div class="cwprev small"><canvas id="cwCv"></canvas></div><div class="cwpub">
  <h3>Publish & export</h3>
  <div class="pcard"><b>Image</b><div class="note">For reports, slides and social media.</div><div class="row"><select id="pS"><option value="1">1× (${graphSize(cw.g).join(' × ')})</option><option value="2" selected>2× retina</option><option value="3">3× print</option></select><button data-p="png">Download PNG</button><button data-p="copy">Copy image</button></div></div>
  <div class="pcard"><b>Vector & print</b><div class="note">Sharp at any size; editable in vector editors.</div><div class="row"><button data-p="svg">SVG</button><button data-p="pdf">PDF</button><button data-p="eps">EPS</button></div></div>
  <div class="pcard"><b>Web</b><div class="note">Self-contained, responsive, no server needed.</div><div class="row"><button data-p="html">Download web page (.html)</button><button data-p="embed">Copy embed code</button><button data-p="svgcode">Copy SVG code</button></div></div>
  <div class="pcard"><b>Office</b><div class="row"><button data-p="pptx">PowerPoint slide (.pptx)</button><button data-p="csv">Data as CSV</button></div></div>
  <div class="pcard"><b>Project</b><div class="note">Keep editing with the full toolset: annotations, fits, statistics, layouts.</div><div class="row"><button data-p="open" class="p">Open in workspace</button><button data-p="share">Share whole project (.html)</button></div></div>
  </div></div>`;
  cwDrawPreview();
  b.querySelector('.cwpub').onclick=async e=>{const p=e.target.closest('[data-p]')?.dataset.p;if(!p)return;const nm=cwName();
    try{
      if(p==='png')cwCanvas(+b.querySelector('#pS').value).toBlob(bl=>{download(nm+'.png',bl);cwMsg('PNG saved')});
      else if(p==='copy'){const bl=await new Promise(r=>cwCanvas(2).toBlob(r));await navigator.clipboard.write([new ClipboardItem({'image/png':bl})]);cwMsg('Image copied')}
      else if(p==='svg'){download(nm+'.svg',new Blob([cwSVGText()],{type:'image/svg+xml'}));cwMsg('SVG saved')}
      else if(p==='pdf'){exportPDF([cw.g],nm+'.pdf');cwMsg('PDF saved')}
      else if(p==='eps'){download(nm+'.eps',graphToEPS(cw.g));cwMsg('EPS saved')}
      else if(p==='html'||p==='embed'||p==='svgcode'){const svg=cwSVGText().replace(/<svg /,'<svg style="max-width:100%;height:auto" ');
        const fig=`<figure style="margin:0;max-width:960px">${svg}</figure>`;
        if(p==='svgcode'){await navigator.clipboard.writeText(svg);cwMsg('SVG code copied')}else if(p==='embed'){await navigator.clipboard.writeText(fig);cwMsg('Embed code copied: paste it into any web page')}
        else{const doc=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(cw.g.title||cw.name)}</title><style>body{margin:0;padding:24px;background:${cwPal().bg};font-family:system-ui,sans-serif;display:flex;justify-content:center}figure{width:100%;max-width:960px}</style></head><body>${fig}</body></html>`;download(nm+'.html',new Blob([doc],{type:'text/html'}));cwMsg('Web page saved')}}
      else if(p==='pptx'){download(nm+'.pptx',pptxBlob([cw.g],cw.g.title||'LabScale'));cwMsg('PowerPoint saved')}
      else if(p==='csv'){const sh=cw.sh,N=NR(sh),q=v=>{const s=v==null||(typeof v==='number'&&Number.isNaN(v))?'':String(v);return/[",\n;]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s};
        download(nm+'-data.csv',new Blob([[sh.cols.map((c,i)=>q(c.name||L(i))).join(',')].concat(Array.from({length:N},(_,r)=>sh.cols.map(c=>q(c.d[r])).join(','))).join('\n')],{type:'text/csv'}));cwMsg('CSV saved')}
      else if(p==='open')cwFinish();
      else if(p==='share'){cwCommit();const html=await buildStandalone(ser());download(nm+'-project.html',new Blob([html],{type:'text/html'}));cwMsg('Project file created: it contains the app and your data')}
    }catch(err){alert('That did not work: '+err.message)}}}
function cwCommit(){
  if(cw.committed)return cw.g;
  if(cw.own){const i=P.sheets.indexOf(cw.sh);if(i>=0)P.sheets.splice(i,1);histHint='Chart wizard';snap();histHint=null;P.sheets.push(cw.sh)}else{histHint='Chart wizard';snap();histHint=null}
  const g=cw.g;g.id=uid();g.name=g.title||`${GTYPES[g.type]||g.type} ${g.id}`;g.sheetId=cw.sh.id;P.graphs.push(g);cw.committed=true;dirty();if(typeof renderExplorer==='function')renderExplorer();return g}
function cwFinish(){const g=cwCommit();cwClose(true);openWin('graph',g.id);flash('Chart added to your project')}

(function(){
  RIB.File.push(['Chart wizard',[['Chart wizard…','✦',()=>cwStart()],['Chart wizard for current sheet','✦',()=>{const s=curSheet();if(!s||s.isMatrix)return flash('Open a regular worksheet first');cwStart(s)}]]]);
  const adv=dawAdvice;dawAdvice=function(sh){const r=adv(sh);if(!sh.isMatrix&&r.p.num.length)r.out.unshift({group:'Guided',title:'Open the chart wizard',sub:'Check the data, compare chart types, annotate and publish',fn:()=>cwStart(sh)});
    const order=['Guided','Understand','Clean up','Visualise','Analyse','Not sure?'];r.out.sort((a,b)=>order.indexOf(a.group)-order.indexOf(b.group));return r};
  const da=dawAfter;dawAfter=function(){if(window.cwSuppress||cw){dawMade=[];dawArmed=0;return}return da.apply(this,arguments)};
})();
