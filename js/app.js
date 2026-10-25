'use strict';
// ===== Core: project state, workbook grid, column ops, plotting, I/O =====
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const L=i=>{let s='';i++;while(i>0){const m=(i-1)%26;s=String.fromCharCode(65+m)+s;i=Math.floor((i-1)/26)}return s};
const NR=sh=>sh.cols.reduce((m,c)=>Math.max(m,c.d.length),0);
const DES=[['X','X'],['Y','Y'],['Z','Z'],['E','Err'],['XE','X Err'],['L','Label'],['D','Disregard'],['N','None']];
const NONY=['X','E','L','Z','XE','D'];
let P={sheets:[],graphs:[],results:[],userFuncs:[],templates:[],palettes:[],layouts:[],notes:[],plugins:[],aTemplates:[],presets:{},master:{text:'',pos:'br',fs:11},folders:[],nid:1,open:[],act:null};
const uid=()=>P.nid++;
const sheetById=id=>P.sheets.find(s=>s.id===id),graphById=id=>P.graphs.find(g=>g.id===id);
const winObj=(t,id)=>t==='sheet'?sheetById(id):t==='graph'?graphById(id):t==='layout'?(P.layouts||[]).find(l=>l.id===id):t==='note'?(P.notes||[]).find(n=>n.id===id):null;
const WINICON={sheet:'▦',graph:'◢',layout:'▤',note:'✎'};
const EXTRA_DEF=()=>({layouts:[],notes:[],plugins:[],aTemplates:[],presets:{},master:{text:'',pos:'br',fs:11},folders:[],tfolders:{},templates:[],palettes:[],userFuncs:[]});
const packExtra=()=>Object.fromEntries(Object.keys(EXTRA_DEF()).map(k=>[k,P[k]]));
const unpackExtra=o=>{const d=EXTRA_DEF();Object.keys(d).forEach(k=>{P[k]=o&&o[k]!==undefined?o[k]:d[k]});if(typeof ensurePages==='function')(P.layouts||[]).forEach(ensurePages)};
const sheetName=(sh,i)=>(sh.cols[i].name||L(i));

function mkSheet(name,cols,extra={}){
  const sh={id:uid(),name,mask:[],cols:cols.map((c,i)=>({name:c.name??'',unit:c.unit||'',comment:c.comment||'',des:c.des||'Y',d:c.d||[],...(c.fmt?{fmt:c.fmt}:{}),...(c.dec!=null?{dec:c.dec}:{})})),...extra};
  P.sheets.push(sh);return sh}
function curSheet(){const a=P.act;if(!a)return P.sheets[0]||null;if(a.t==='sheet')return sheetById(a.id)||null;const g=graphById(a.id);return g?sheetById(g.sheetId):P.sheets[0]||null}
function curGraph(){return P.act&&P.act.t==='graph'?graphById(P.act.id):null}
function maskedVals(sh,ci){const c=sh.cols[ci];if(!c)return[];const n=NR(sh),o=new Array(n);for(let i=0;i<n;i++){const v=c.d[i];o[i]=(sh.mask&&sh.mask[i])||typeof v!=='number'?NaN:(c.fmt==='date'?v/864e5:v)}return o}
function maskedBy(sh,args){if((args._xlo==null&&args._xhi==null)||args.x==null||!sh.cols[args.x])return sh;const xc=sh.cols[args.x],lo=args._xlo??-Infinity,hi=args._xhi??Infinity,date=xc.fmt==='date',clone={...sh,mask:(sh.mask||[]).slice()},n=NR(sh);for(let i=0;i<n;i++){let x=xc.d[i];if(typeof x!=='number')x=NaN;if(date)x/=864e5;if(!(x>=lo&&x<=hi))clone.mask[i]=true}return clone}
const ctxForArgs=(sh,args)=>ctxFor(maskedBy(sh,args));
function ctxFor(sh){return{sheet:sh,nrows:NR(sh),vals:ci=>maskedVals(sh,ci),raw:ci=>sh.cols[ci].d.map((v,i)=>sh.mask&&sh.mask[i]?undefined:v),name:(ci,short)=>{const n=sh.cols[ci].name||L(ci);return short?n:`${n}(${L(ci)})`}}}
const colLabel=(sh,i)=>`${L(i)}: ${sh.cols[i].name||'(unnamed)'}${sh.cols[i].unit?` [${sh.cols[i].unit}]`:''}`;

// ----- serialization / undo / autosave -----
const ser=()=>JSON.stringify({sheets:P.sheets,graphs:P.graphs.map(g=>({...g,view:null})),results:P.results,...packExtra(),nid:P.nid,open:P.open,act:P.act},(k,v)=>typeof v==='number'&&!Number.isFinite(v)?null:v);
function deser(txt){const o=JSON.parse(txt);o.results=o.results||[];Object.entries(EXTRA_DEF()).forEach(([k,v])=>{if(o[k]===undefined)o[k]=v});o.sheets.forEach(s=>{s.mask=s.mask||[];s.cols.forEach(c=>{c.d=c.d.map(v=>v===null?NaN:v)})});return o}
let undoS=[],redoS=[],undoL=[],redoL=[],histHint=null;
const HIST_SKIP=new Set(['snap','snapLabel','anonymous','onOk','onclick','onchange','oninput','forEach','map','filter','Object','Array','Function','HTMLButtonElement','HTMLDocument','HTMLInputElement','HTMLSelectElement','HTMLElement','Promise','call','apply','run','handler','dispatch','dialog']);
function snapLabel(){if(histHint)return histHint;try{const st=new Error().stack.split('\n');for(let i=2;i<st.length;i++){const m=/at (?:async )?(?:new )?(?:[\w$]+\.)*([A-Za-z_$][\w$]*)/.exec(st[i]);if(m&&!HIST_SKIP.has(m[1])){return m[1].replace(/([a-z0-9])([A-Z])/g,'$1 $2').replace(/_/g,' ').replace(/^./,x=>x.toUpperCase())}}}catch(e){}return'Edit'}
function snap(){undoS.push(ser());undoL.push({t:snapLabel(),at:Date.now()});if(undoS.length>60){undoS.shift();undoL.shift()}redoS=[];redoL=[];updUndo()}
function restore(txt){const o=deser(txt);P.sheets=o.sheets;P.graphs=o.graphs;P.results=o.results;unpackExtra(o);registerUserFuncs();renderResults();P.nid=o.nid;P.open=(o.open||[]).filter(w=>winObj(w.t,w.id));P.act=o.act&&winObj(o.act.t,o.act.id)?o.act:(P.open[0]||null);showWin()}
function undo(){if(!undoS.length)return;redoS.push(ser());redoL.push(undoL.pop());restore(undoS.pop());updUndo();save()}
function redo(){if(!redoS.length)return;undoS.push(ser());undoL.push(redoL.pop());restore(redoS.pop());updUndo();save()}
function updUndo(){$('#bUndo').disabled=!undoS.length;$('#bRedo').disabled=!redoS.length;if(typeof histRefresh==='function')histRefresh()}
let saveT=null;function save(){clearTimeout(saveT);saveT=setTimeout(()=>{try{const s=ser();if(s.length<4e6)localStorage.setItem('labanalysis.project',s)}catch(e){}},700)}
function dirty(){save()}

// ===== Grid =====
const RH=24,CW=112;let gsel={c0:0,r0:0,c1:0,r1:0,extra:new Set()},cur={r:0,c:0},dragSel=false,editing=null;
const gridEl=()=>$('#grid');
function selRange(){return{c0:Math.min(gsel.c0,gsel.c1),c1:Math.max(gsel.c0,gsel.c1),r0:Math.min(gsel.r0,gsel.r1),r1:Math.max(gsel.r0,gsel.r1)}}
function selectedCols(){const sh=curSheet();if(!sh)return[];const r=selRange(),s=new Set(gsel.extra);for(let c=r.c0;c<=r.c1;c++)if(c<sh.cols.length)s.add(c);return[...s].sort((a,b)=>a-b)}
function layoutInfo(sh){const w=sh.isMatrix?84:CW;let left=50;const info=sh.cols.map((c,i)=>{const hid=!!c.hidden,o={hid,wd:hid?0:w};if(sh.freeze&&i<sh.freeze&&!hid)o.left=left;if(!hid)left+=o.wd;return o});return{info,total:left,w}}
const hdrRows=sh=>sh&&sh.spark?5:4;
function renderGrid(){
  const sh=curSheet(),gt=$('#gt');if(!sh){gt.innerHTML='';return}
  const nc=sh.cols.length,Lo=layoutInfo(sh),th=(i,extra='')=>{const o=Lo.info[i];return`${o.hid?' hid':''}${o.left!=null?' frz':''}${extra}`},st=i=>{const o=Lo.info[i];return o.left!=null?` style="left:${o.left}px"`:''};
  let h=`<colgroup><col style="width:50px">${Lo.info.map(o=>`<col style="width:${o.wd}px">`).join('')}</colgroup><thead>`;
  h+=`<tr><th class="rn"></th>${sh.cols.map((c,i)=>`<th class="lt${th(i)}" data-c="${i}"${st(i)}><span>${L(i)}${c.formula?'<i title="Formula column: '+esc(c.formula)+'">ƒ</i>':''}</span> <button class="kebab" type="button" title="Column options" aria-label="Column options" aria-haspopup="menu">⋯</button><select class="des" data-c="${i}" title="Column designation">${DES.map(([k,l])=>`<option value="${k}" ${c.des===k?'selected':''}>${l}</option>`).join('')}</select></th>`).join('')}</tr>`;
  [['name','Name'],['unit','Unit'],['comment','Note']].forEach(([k,lab])=>{h+=`<tr><th class="rn">${lab}</th>${sh.cols.map((c,i)=>`<th class="hr-l${th(i)}"${st(i)}><input data-h="${k}" data-c="${i}" value="${esc(c[k])}" ${k==='name'?'':'placeholder="—"'}></th>`).join('')}</tr>`});
  if(sh.spark)h+=`<tr class="spk"><th class="rn">trend</th>${sh.cols.map((c,i)=>`<th class="${th(i)}"${st(i)}><canvas data-sp="${i}" width="220" height="36"></canvas></th>`).join('')}</tr>`;
  gt.innerHTML=h+'</thead><tbody></tbody>';gt.style.width=Lo.total+'px';if(sh.spark)drawSparks(sh);renderBody();paintSel()}
function drawSparks(sh){$$('#gt canvas[data-sp]').forEach(cv=>{const col=sh.cols[+cv.dataset.sp],v=col.d.filter(x=>typeof x==='number'&&Number.isFinite(x)),c=cv.getContext('2d');c.clearRect(0,0,cv.width,cv.height);if(v.length<2)return;
  const step=Math.max(1,Math.floor(v.length/110)),p=v.filter((_,i)=>i%step===0),lo=Math.min(...p),hi=Math.max(...p),w=cv.width,h=cv.height;c.strokeStyle=getComputedStyle(document.documentElement).getPropertyValue('--acc').trim()||'#2563eb';c.lineWidth=2;c.beginPath();p.forEach((y,i)=>{const px=i/(p.length-1)*(w-4)+2,py=h-3-(y-lo)/((hi-lo)||1)*(h-6);i?c.lineTo(px,py):c.moveTo(px,py)});c.stroke()})}
function renderBody(){
  const sh=curSheet(),gr=gridEl();if(!sh)return;const nc=sh.cols.length,nr=Math.max(NR(sh)+30,60),H=gr.clientHeight||600,Lo=layoutInfo(sh),cfn=typeof cfEvaluator==='function'?cfEvaluator(sh):null;
  const first=Math.max(0,Math.floor(gr.scrollTop/RH)-10),last=Math.min(nr,Math.ceil((gr.scrollTop+H)/RH)+4);let h='';
  h+=`<tr><td colspan="${nc+1}" style="height:${first*RH}px;padding:0;border:0"></td></tr>`;
  for(let r=first;r<last;r++){const mk=sh.mask[r];h+=`<tr><td class="rn" data-r="${r}" data-rn="1">${r+1}</td>`;
    for(let c=0;c<nc;c++){const col=sh.cols[c],v=col.d[r],isS=typeof v==='string',o=Lo.info[c],key=r+','+c;let cls=(mk?'mk ':'')+(isS?'str':'num'),sty='';if(o.hid)cls+=' hid';if(o.left!=null){cls+=' frz';sty+=`left:${o.left}px;`}
      if(cfn){const bg=cfn(c,v,r);if(bg)sty+=bg}if(sh.cellF&&sh.cellF[key])cls+=' fx';const note=sh.notes&&sh.notes[key];if(note)cls+=' nt';
      h+=`<td data-r="${r}" data-c="${c}" class="${cls}"${sty?` style="${sty}"`:''}${note?` title="${esc(note)}"`:''}>${v===undefined||(typeof v==='number'&&Number.isNaN(v))?'':isS?esc(v):esc(fmtCell(col,v))}</td>`}h+='</tr>'}
  h+=`<tr><td colspan="${nc+1}" style="height:${(nr-last)*RH}px;padding:0;border:0"></td></tr>`;
  $('#gt tbody').innerHTML=h;paintSel()}
function fmtCell(c,v){if(!Number.isFinite(v))return String(v);if(c.fmt==='date')return formatDate(v);const d=Number.isFinite(c.dec)?c.dec:3;
  switch(c.fmt){case'fixed':return v.toFixed(d);case'sci':return v.toExponential(d);case'eng':{const e=Math.floor(Math.log10(Math.abs(v)||1)/3)*3;return(v/Math.pow(10,e)).toFixed(d)+(e?'e'+e:'')}case'pct':return(v*100).toFixed(d)+'%';case'int':return String(Math.round(v));case'sig':return v.toPrecision(Math.max(1,d));default:return+v.toPrecision(12)}}
function paintSel(){
  const sh=curSheet();if(!sh)return;const r=selRange(),cs=new Set(selectedCols());
  $$('#gt tbody td[data-c]').forEach(td=>{const rr=+td.dataset.r,cc=+td.dataset.c;td.classList.toggle('sel',(rr>=r.r0&&rr<=r.r1&&cc>=r.c0&&cc<=r.c1)||(gsel.extra.has(cc)&&gsel.r0===0));td.classList.toggle('cur',rr===cur.r&&cc===cur.c)});
  $$('#gt th.lt').forEach(th=>th.classList.toggle('sc',cs.has(+th.dataset.c)));updSelInfo();if(typeof updFormulaBar==='function')updFormulaBar();renderProps(true)}
function updSelInfo(){const sh=curSheet();if(!sh){return}const r=selRange(),v=[];if((r.r1-r.r0+1)*(r.c1-r.c0+1)<2e6)for(let c=r.c0;c<=r.c1;c++)for(let i=r.r0;i<=r.r1;i++){const x=sh.cols[c]?.d[i];if(typeof x==='number'&&Number.isFinite(x))v.push(x)}
  $('#selinfo').textContent=v.length>1?`N=${v.length}  Σ=${Mx.fmt(Mx.sum(v),6)}  mean=${Mx.fmt(Mx.mean(v),6)}  sd=${Mx.fmt(Mx.sd(v),5)}`:`${sh.cols.length} columns × ${NR(sh)} rows${sh.mask.some(Boolean)?` · ${sh.mask.filter(Boolean).length} masked`:''}`}
function setSel(c0,r0,c1,r1,keepExtra){gsel={c0,r0,c1,r1,extra:keepExtra?gsel.extra:new Set()};paintSel()}
function moveCur(dr,dc,ext){const sh=curSheet(),nr=Math.max(NR(sh)+30,60);cur.r=Math.max(0,Math.min(nr-1,cur.r+dr));cur.c=Math.max(0,Math.min(sh.cols.length-1,cur.c+dc));while(dc&&sh.cols[cur.c]&&sh.cols[cur.c].hidden&&cur.c+Math.sign(dc)>=0&&cur.c+Math.sign(dc)<sh.cols.length)cur.c+=Math.sign(dc);
  if(ext){gsel.c1=cur.c;gsel.r1=cur.r}else{gsel={c0:cur.c,r0:cur.r,c1:cur.c,r1:cur.r,extra:new Set()}}ensureVisible();paintSel()}
function ensureVisible(){const gr=gridEl(),hr=hdrRows(curSheet()),top=cur.r*RH+hr*RH,bot=top+RH;if(top-hr*RH<gr.scrollTop)gr.scrollTop=cur.r*RH;else if(bot>gr.scrollTop+gr.clientHeight)gr.scrollTop=bot-gr.clientHeight;
  const x=50+cur.c*CW;if(x<gr.scrollLeft+50)gr.scrollLeft=Math.max(0,x-50);else if(x+CW>gr.scrollLeft+gr.clientWidth)gr.scrollLeft=x+CW-gr.clientWidth;renderBody()}
function parseCell(t){t=String(t).trim();if(t==='')return NaN;if(/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t))return parseFloat(t);if(/^[-+]?\d+,\d+$/.test(t))return parseFloat(t.replace(',','.'));return t}
function setCell(sh,r,c,raw){const col=sh.cols[c];if(!col||sh.protect)return;while(col.d.length<=r)col.d.push(NaN);
  if(typeof raw==='string'&&raw.trim().startsWith('=')){sh.cellF=sh.cellF||{};sh.cellF[r+','+c]=raw.trim();col.d[r]=NaN;if(typeof evalCellFormulas==='function')evalCellFormulas(sh);return}if(sh.cellF&&sh.cellF[r+','+c])delete sh.cellF[r+','+c];
  let v=parseCell(raw);
  if(typeof v==='string'){const dt=parseDate(v);if(Number.isFinite(dt)&&(col.fmt==='date'||col.d.every((x,i)=>i===r||typeof x!=='number'||Number.isNaN(x)))){col.fmt='date';v=dt}}
  col.d[r]=v;while(col.d.length&&col.d[col.d.length-1]!==col.d[col.d.length-1]&&typeof col.d[col.d.length-1]==='number')col.d.pop()}
function startEdit(r,c,init){const sh=curSheet();if(sh.protect)return flash('This sheet is protected (Column ▸ Protect sheet)');const td=$(`#gt td[data-r="${r}"][data-c="${c}"]`),ed=$('#ed');if(!td)return;
  const v=sh.cols[c].d[r],fx=sh.cellF&&sh.cellF[r+','+c];ed.value=init!==undefined?init:fx?fx:(v===undefined||(typeof v==='number'&&Number.isNaN(v))?'':String(v));
  ed.style.left=td.offsetLeft+'px';ed.style.top=td.offsetTop+'px';ed.style.width=td.offsetWidth+'px';ed.hidden=false;editing={r,c};ed.focus();if(init===undefined)ed.select()}
function endEdit(commit){const ed=$('#ed');if(!editing)return;const{r,c}=editing;editing=null;if(commit){const sh=curSheet();snap();setCell(sh,r,c,ed.value);dirty();refreshAfterData()}ed.hidden=true}
function refreshAfterData(){renderBody();renderExplorer();redrawGraph();updSelInfo();const sh=curSheet();if(sh)dataChanged(sh.id)}
function clearSel(){const sh=curSheet(),r=selRange();if(sh.protect)return flash('This sheet is protected');snap();if(sh.cellF)Object.keys(sh.cellF).forEach(k=>{const[rr,cc]=k.split(',').map(Number);if(rr>=r.r0&&rr<=r.r1&&cc>=r.c0&&cc<=r.c1)delete sh.cellF[k]});const cs=new Set([...gsel.extra]);for(let c=r.c0;c<=r.c1;c++)cs.add(c);const wholeRows=gsel.extra.size===0;
  cs.forEach(c=>{const col=sh.cols[c];if(!col)return;const wholeCol=gsel.extra.has(c)||(gsel.r0===0&&gsel.r1>=NR(sh)-1&&c>=r.c0&&c<=r.c1);for(let i=r.r0;i<=r.r1&&(wholeCol||true);i++)if(i<col.d.length)col.d[i]=NaN;while(col.d.length&&Number.isNaN(col.d[col.d.length-1]))col.d.pop()});dirty();refreshAfterData()}
function copySel(e,cut){const sh=curSheet(),r=selRange(),rows=[];for(let i=r.r0;i<=r.r1;i++){const row=[];for(let c=r.c0;c<=r.c1;c++){const v=sh.cols[c]?.d[i];row.push(v===undefined||(typeof v==='number'&&Number.isNaN(v))?'':v)}rows.push(row.join('\t'))}
  e.clipboardData.setData('text/plain',rows.join('\n'));e.preventDefault();if(cut)clearSel()}
function pasteText(txt){const sh=curSheet();if(!sh)return;if(sh.protect)return flash('This sheet is protected');snap();const rows=txt.replace(/\r/g,'').replace(/\n$/,'').split('\n').map(l=>l.split(l.includes('\t')?'\t':l.includes(';')?';':l.includes(',')&&/^[^"]*$/.test(l)&&!/^\s*[-+]?\d+,\d+\s*$/.test(l)?',':'\t'));
  rows.forEach((row,i)=>row.forEach((cell,j)=>{const c=cur.c+j;while(sh.cols.length<=c)sh.cols.push({name:'',unit:'',comment:'',des:'Y',d:[]});setCell(sh,cur.r+i,c,cell)}));
  const sheetRow=cur.r,w=Math.max(...rows.map(r=>r.length));gsel={c0:cur.c,r0:sheetRow,c1:cur.c+w-1,r1:sheetRow+rows.length-1,extra:new Set()};dirty();renderGrid();renderExplorer();redrawGraph();dataChanged(sh.id)}
function initGrid(){
  const gr=gridEl(),gt=$('#gt'),ed=$('#ed');
  gr.addEventListener('scroll',()=>{if(editing)endEdit(true);requestAnimationFrame(renderBody)});
  gt.addEventListener('mousedown',e=>{const td=e.target.closest('td[data-c]'),th=e.target.closest('th.lt'),rn=e.target.closest('td[data-rn]');if(e.target.closest('select,input'))return;
    if(editing)endEdit(true);const sh=curSheet();
    if(td){const r=+td.dataset.r,c=+td.dataset.c;if(e.shiftKey){gsel.c1=c;gsel.r1=r}else{cur={r,c};gsel={c0:c,r0:r,c1:c,r1:r,extra:new Set()}}dragSel=true;paintSel();e.preventDefault();gr.focus()}
    else if(th){const c=+th.dataset.c,n=Math.max(NR(sh)-1,0);if(e.ctrlKey||e.metaKey){gsel.extra.has(c)?gsel.extra.delete(c):gsel.extra.add(c)}else if(e.shiftKey){gsel.c1=c;gsel.r0=0;gsel.r1=n}else{cur.c=c;gsel={c0:c,r0:0,c1:c,r1:n,extra:new Set()}}paintSel();gr.focus()}
    else if(rn){const r=+rn.dataset.r;if(e.shiftKey)gsel.r1=r;else{cur.r=r;gsel={c0:0,r0:r,c1:sh.cols.length-1,r1:r,extra:new Set()}}paintSel();gr.focus()}});
  gt.addEventListener('mouseover',e=>{if(!dragSel)return;const td=e.target.closest('td[data-c]');if(td){gsel.c1=+td.dataset.c;gsel.r1=+td.dataset.r;paintSel()}});
  window.addEventListener('mouseup',()=>dragSel=false);
  gt.addEventListener('dblclick',e=>{const td=e.target.closest('td[data-c]');if(td)startEdit(+td.dataset.r,+td.dataset.c)});
  gt.addEventListener('change',e=>{const sh=curSheet(),t=e.target;
    if(t.matches('select.des')){snap();sh.cols[+t.dataset.c].des=t.value;dirty();renderProps(true)}
    else if(t.dataset.h){snap();sh.cols[+t.dataset.c][t.dataset.h]=t.value;dirty();renderExplorer();redrawGraph(true)}});
  ed.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();endEdit(true);moveCur(1,0);gr.focus()}else if(e.key==='Tab'){e.preventDefault();endEdit(true);moveCur(0,e.shiftKey?-1:1);gr.focus()}else if(e.key==='Escape'){endEdit(false);gr.focus()}});
  ed.addEventListener('blur',()=>{if(editing)endEdit(true)});
  gr.addEventListener('keydown',e=>{if(e.target===ed)return;const mod=e.ctrlKey||e.metaKey;
    const mv={ArrowDown:[1,0],ArrowUp:[-1,0],ArrowLeft:[0,-1],ArrowRight:[0,1]}[e.key];
    if(mv){e.preventDefault();moveCur(mv[0],mv[1],e.shiftKey)}
    else if(e.key==='PageDown'){e.preventDefault();moveCur(20,0,e.shiftKey)}else if(e.key==='PageUp'){e.preventDefault();moveCur(-20,0,e.shiftKey)}
    else if(e.key==='Enter'||e.key==='F2'){e.preventDefault();startEdit(cur.r,cur.c)}
    else if(e.key==='Tab'){e.preventDefault();moveCur(0,e.shiftKey?-1:1)}
    else if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();clearSel()}
    else if(mod&&e.key.toLowerCase()==='a'){e.preventDefault();const sh=curSheet();setSel(0,0,sh.cols.length-1,Math.max(NR(sh)-1,0))}
    else if(e.key.length===1&&!mod&&!e.altKey){e.preventDefault();startEdit(cur.r,cur.c,e.key)}});
  gr.addEventListener('copy',e=>copySel(e,false));gr.addEventListener('cut',e=>copySel(e,true));
  document.addEventListener('paste',e=>{if(!P.act||P.act.t!=='sheet')return;if(e.target.closest('input,textarea,select')&&e.target!==gr)return;if(document.activeElement&&document.activeElement.closest&&document.activeElement.closest('dialog'))return;
    const t=e.clipboardData.getData('text/plain');if(t){e.preventDefault();pasteText(t)}});
  $('#cmd').addEventListener('keydown',e=>{if(e.key==='Enter'){try{runCommand(e.target.value);e.target.select()}catch(err){alert('Command error: '+err.message)}}});
  new ResizeObserver(()=>{if(P.act&&P.act.t==='sheet')renderBody()}).observe(gr)}

// ===== Column operations =====
function addColumn(sh,name='',des='Y',d=[],unit=''){sh.cols.push({name,unit,comment:'',des,d});return sh.cols.length-1}
function rowsEval(sh,expr,extraVars0={}){const extraVars={DAY:864e5,HOUR:36e5,MINUTE:6e4,SECOND:1e3,WEEK:6048e5,date:parseDate,...extraVars0}; // evaluate expression for each row; columns by letter; i,n
  const nc=sh.cols.length,letters=sh.cols.map((_,i)=>L(i)),n=NR(sh);
  const fn=Mx.compile(expr,[...letters,'i','n',...Object.keys(extraVars)]),out=new Array(n);
  for(let r=0;r<n;r++){const args=sh.cols.map(c=>{const v=c.d[r];return typeof v==='number'?v:NaN});out[r]=Number(fn(...args,r+1,n,...Object.values(extraVars)))}
  return out}
function runCommand(txt){
  const sh=curSheet(),m=txt.match(/^\s*([A-Za-z_][\w ]*?)\s*=(?!=)\s*(.+)$/);if(!m)throw new Error('Use the form  TARGET = expression');
  const tgt=m[1].trim();let ci=sh.cols.findIndex((c,i)=>L(i)===tgt);if(ci<0)ci=sh.cols.findIndex(c=>c.name===tgt);
  snap();const vals=rowsEval(sh,m[2]);if(ci<0){ci=addColumn(sh,tgt,'Y')}sh.cols[ci].d=vals.map(v=>Number.isFinite(v)?v:NaN);sh.cols[ci].formula=m[2].trim();dirty();renderGrid();renderExplorer();redrawGraph();dataChanged(sh.id)}
function deleteColumns(sh,idx){snap();const del=new Set(idx),map=sh.cols.map((_,i)=>del.has(i)?-1:i-[...del].filter(d=>d<i).length);
  sh.cols=sh.cols.filter((_,i)=>!del.has(i));if(sh.isMatrix){sh.xv=sh.xv.filter((_,i)=>!del.has(i))}
  P.graphs.filter(g=>g.sheetId===sh.id).forEach(g=>{g.series=g.series.filter(s=>map[s.y]>=0);g.series.forEach(s=>{['x','e','z'].forEach(k=>{if(s[k]!=null&&s[k]>=0)s[k]=map[s[k]]>=0?map[s[k]]:-1});s.y=map[s.y]});if(g.mcols)g.mcols=g.mcols.map(i=>map[i]).filter(i=>i>=0)});
  gsel={c0:0,r0:0,c1:0,r1:0,extra:new Set()};cur={r:0,c:0};dirty();renderGrid();renderExplorer();redrawGraph(true)}
function sortSheet(sh,key,desc){snap();const n=NR(sh),idx=Array.from({length:n},(_,i)=>i),v=sh.cols[key].d;
  idx.sort((a,b)=>{const x=v[a],y=v[b],nx=typeof x!=='number'||Number.isNaN(x),ny=typeof y!=='number'||Number.isNaN(y);if(nx&&ny)return 0;if(nx)return 1;if(ny)return-1;return desc?y-x:x-y});
  sh.cols.forEach(c=>{const o=c.d.slice();c.d=idx.map(i=>i<o.length?o[i]:NaN)});sh.mask=idx.map(i=>sh.mask[i]||false);dirty();renderBody();dataChanged(sh.id)}
function transformCol(sh,ci,kind){const v=sh.cols[ci].d.map(x=>typeof x==='number'?x:NaN),f=v.filter(Number.isFinite);let o;
  switch(kind){case'cumsum':{let s=0;o=v.map(x=>Number.isFinite(x)?(s+=x):NaN);break}case'diff':o=v.map((x,i)=>i?x-v[i-1]:NaN);break;case'rank':{const idx=v.map((x,i)=>i).filter(i=>Number.isFinite(v[i])),rk=Mx.rank(idx.map(i=>v[i])).r;o=v.map(()=>NaN);idx.forEach((i,k)=>o[i]=rk[k]);break}
    case'reverse':o=v.slice().reverse();break;case'abs':o=v.map(Math.abs);break;case'ln':o=v.map(Math.log);break;case'log10':o=v.map(Math.log10);break;case'sqrt':o=v.map(Math.sqrt);break;case'square':o=v.map(x=>x*x);break;case'recip':o=v.map(x=>1/x);break;
    case'zscore':{const m=Mx.mean(f),s=Mx.sd(f);o=v.map(x=>(x-m)/s);break}case'center':{const m=Mx.mean(f);o=v.map(x=>x-m);break}case'pct':{const s=Mx.sum(f);o=v.map(x=>x/s*100);break}}
  return o.map(x=>Number.isFinite(x)?x:NaN)}
function fillColumn(sh,ci,kind,a,b,n){let o;const rnd=()=>Math.random();switch(kind){case'linear':o=Array.from({length:n},(_,i)=>a+b*i);break;case'rows':o=Array.from({length:n},(_,i)=>i+1);break;case'uniform':o=Array.from({length:n},()=>a+(b-a)*rnd());break;
    case'normal':o=Array.from({length:n},()=>a+b*Math.sqrt(-2*Math.log(rnd()+1e-12))*Math.cos(2*Math.PI*rnd()));break;case'geom':o=Array.from({length:n},(_,i)=>a*Math.pow(b,i));break}
  sh.cols[ci].d=o.map(x=>+x.toPrecision(12))}
function transposeSheet(sh){const n=NR(sh),cols=Array.from({length:n},(_,r)=>({name:String(r+1),d:sh.cols.map(c=>c.d[r]??NaN)}));return mkSheet(sh.name+'_T',cols)}

// ===== Plotting =====
function graphDefaults(sheetId,type){return{id:0,name:'',sheetId,type,series:[],title:'',xl:'',yl:'',yrl:'',zl:'',xs:'linear',ys:'linear',yrs:'linear',xmin:null,xmax:null,ymin:null,ymax:null,yrmin:null,yrmax:null,gridx:true,gridy:true,minor:false,legend:'tr',connect:'straight',fs:12,bins:0,normal:false,cmap:'viridis',levels:10,contour:false,fillmap:true,cbar:true,az:-50,el:25,zoom:1,curves:[],marks:[],refs:[],notes:[],view:null,offset:0}}
function newGraph(sh,type,specs,o={}){const g=graphDefaults(sh.id,type);Object.assign(g,o);if(specs[0]&&specs[0].x!=null&&sh.cols[specs[0].x]?.fmt==='date')g.xdate=true;g.id=uid();g.name=`${GTYPES[type]||type} ${g.id}`;
  g.series=specs.map((s,i)=>({y:s.y,x:s.x??null,e:s.e??null,z:null,color:s.color||PALETTE[i%PALETTE.length],symbol:SYMBOLS[i%6],size:6,lw:o.lw||2,dash:'',axis:'L',label:s.label||''}));
  if(g.series.length<2&&!o.legend)g.legend='none';P.graphs.push(g);return g}
const mapCurves=(cs,date)=>cs.map(c=>({x:date?c.x.map(v=>v*864e5):c.x,y:c.y,label:c.label,dash:c.dash,dot:c.dot,color:c.color}));
// ----- live recalculation -----
let recalcT=null,recalcBusy=false;
function dataChanged(sheetId){if(recalcBusy||sheetId==null)return;clearTimeout(recalcT);recalcT=setTimeout(()=>recalcSheet(sheetId),250)}
function recalcSheet(sheetId){const sh=sheetById(sheetId);if(!sh)return;recalcBusy=true;
  try{if(typeof evalCellFormulas==='function')evalCellFormulas(sh);for(let pass=0;pass<2;pass++)sh.cols.forEach(c=>{if(c.formula){try{c.d=rowsEval(sh,c.formula).map(v=>Number.isFinite(v)?v:NaN)}catch(e){}}});
    P.results.filter(r=>r.live&&r.sheetId===sheetId&&r.defId).slice().reverse().forEach(recalcResult)}finally{recalcBusy=false}
  if(P.act&&P.act.t==='sheet'&&P.act.id===sheetId){renderBody()}redrawGraph();renderResults();dirty()}
function recalcResult(r){const sh=sheetById(r.sheetId),def=A.defs[r.defId];if(!sh||!def)return;let res;try{res=def.run(r.args,ctxForArgs(sh,r.args))}catch(e){return}
  (res.cols||[]).forEach((c,k)=>{const d=c.d.map(v=>Number.isFinite(v)?v:NaN),cid=r.cids&&r.cids[k];const col=cid&&sh.cols.find(q=>q.cid===cid);
    if(col)col.d=d;else{const ci=addColumn(sh,c.name,c.des||'Y',d,c.unit||'');sh.cols[ci].cid=uid();(r.cids=r.cids||[])[k]=sh.cols[ci].cid}});
  const g=r.graphId&&graphById(r.graphId);if(g&&(res.curves||res.marks)){if(res.curves)g.curves=mapCurves(res.curves,g.xdate);g.marks=(res.marks||[]).map(mk=>g.xdate?{...mk,x:mk.x*864e5}:mk)}
  if(res.sheet&&r.outSheetId){const os=sheetById(r.outSheetId);if(os){os.cols=res.sheet.cols.map(c=>({name:c.name,unit:'',comment:'',des:'Y',d:c.d}));os.xv=res.sheet.xv;os.yv=res.sheet.yv}}
  r.html=(res.html||r.html)+(r.note||'');r.time=new Date().toLocaleTimeString()+' ⟳'}
// ----- graph format clipboard, panels -----
let fmtClip=null;const FMT_KEYS=['fs','font','legend','gridx','gridy','minor','connect','cmap','levels','xs','ys','yrs','bins','normal','cbar','fillmap','contour'];
function copyFormat(g){fmtClip={p:Object.fromEntries(FMT_KEYS.map(k=>[k,g[k]])),s:g.series.map(s=>({color:s.color,symbol:s.symbol,size:s.size,lw:s.lw,dash:s.dash,axis:s.axis}))};flash('Graph format copied')}
function pasteFormat(g){if(!fmtClip)return alert('Copy a graph format first.');Object.assign(g,fmtClip.p);g.series.forEach((s,i)=>{const f=fmtClip.s[i%fmtClip.s.length];if(f)Object.assign(s,f)});flash('Format applied')}
function splitPanels(g){if(g.series.length<2)return alert('Needs a graph with at least two series.');snap();const kids=g.series.map((s,i)=>{const k=JSON.parse(JSON.stringify({...g,view:null}));k.id=uid();k.series=[{...s,axis:'L'}];k.name=`${g.name} – ${P.sheets.find(q=>q.id===g.sheetId)?.cols[s.y]?.name||'panel '+(i+1)}`;k.legend='none';k.yl=P.sheets.find(q=>q.id===g.sheetId)?.cols[s.y]?.name||'';if(i<g.series.length-1)k.xl='';P.graphs.push(k);return k});
  const m=graphDefaults(g.sheetId,'multi');m.id=uid();m.name=`${g.name} (panels)`;m.children=kids.map(k=>k.id);m.prows=kids.length;m.pcols=1;m.gap=6;m.legend='none';P.graphs.push(m);openWin('graph',m.id);dirty()}

const GTYPES={bubble:'Bubble',violin:'Violin',qq:'Q-Q Plot',ecdf:'Cumulative Distribution',kde:'Density (KDE)',radar:'Radar',multi:'Multi-panel',line:'Line',scatter:'Scatter',linesym:'Line + Symbol',area:'Area',column:'Column',bar:'Bar (horizontal)',stack:'Stacked Column',hist:'Histogram',box:'Box Chart',pie:'Pie',polar:'Polar',heat:'Heatmap',contour:'Contour',scat3d:'3D Scatter',surf3d:'3D Surface',wire3d:'3D Wireframe'};
function unitLbl(c,fb){const n=c?(c.name||fb):fb;return c&&c.unit?`${n} (${c.unit})`:n}
function plotCmd(type){
  const sh=curSheet();if(!sh||!sh.cols.length)return alert('Create or import data first.');
  let S=selectedCols(),multi=S.length>1||gsel.extra.size>0;const noSel=!S.length;
  const isX=i=>sh.cols[i].des==='X',isY=i=>!NONY.includes(sh.cols[i].des);
  let ys=S.filter(isY);if(!ys.length)ys=sh.cols.map((_,i)=>i).filter(isY);if(!ys.length)ys=sh.cols.map((_,i)=>i).filter(i=>!isX(i));if(!ys.length)ys=[0];
  if(['scatmat','parallel','ridge','qc','pyramid','smith','ternary','candle','ohlc','windrose'].includes(type)&&S.length>=2&&ys.length<S.length)ys=S.filter(i=>!['E','L','Z'].includes(sh.cols[i].des)&&!(isX(i)&&(type==='candle'||type==='ohlc')&&i===S[0]&&sh.cols[i].fmt==='date'));
  if((type==='venn'||type==='fishbone'||type==='maineffects'||type==='interaction')&&S.length)ys=S.slice();
  let xc=S.find(isX);if(xc===undefined)xc=sh.cols.findIndex((c,i)=>isX(i)&&!ys.includes(i));if(xc<0)xc=null;
  const colorIdx=i=>PALETTE[i%PALETTE.length],mk=(y,i)=>{const e=sh.cols[y+1]&&sh.cols[y+1].des==='E'?y+1:null;return{y,x:xc,e,z:null,color:colorIdx(i),symbol:SYMBOLS[i%6],size:6,lw:2,dash:'',axis:'L',label:''}};
  if(!window.PLOT_DRY)snap();
  const g=graphDefaults(sh.id,type);g.id=uid();if(xc!==null&&sh.cols[xc].fmt==='date')g.xdate=true;
  const matTypes=['heat','contour','surf3d','wire3d','bars3d','ribbon3d','wall3d','contourprofile','imageprofile','heatdendro'];
  if(matTypes.includes(type)){if(!sh.isMatrix){let mc=S.filter(i=>!isX(i));if(!mc.length)mc=sh.cols.map((_,i)=>i).filter(i=>!isX(i));g.mcols=mc;if(mc.length<2)alert('Tip: heatmaps and surfaces use several selected columns as a matrix (or a matrix sheet from "XYZ → Matrix").')}
    g.series=[];g.type=type;if(type==='contour'){g.contour=true;g.fillmap=true}if(type==='imageprofile')g.cmap='gray';if(type==='contourprofile'){g.contour=true;g.fillmap=true}g.xl=sh.isMatrix?'X':'Column';g.yl=sh.isMatrix?'Y':'Row';g.zl='Z'}
  else if(type==='scat3d'||type==='traj3d'){const zc=sh.cols.findIndex(c=>c.des==='Z');const yy=ys[0],zz=zc>=0?zc:(ys[1]!==undefined?ys[1]:ys[0]);const x=xc!==null?xc:(ys[2]!==undefined?ys[0]:null);
    g.series=[{...mk(yy,0),x:xc,z:zz}];g.xl=unitLbl(sh.cols[xc],'X');g.yl=unitLbl(sh.cols[yy],'Y');g.zl=unitLbl(sh.cols[zz],'Z');if(xc===null)g.xl='Index'}
  else if(['cscatter','cline','vector','floatcol'].includes(type)){const zc=sh.cols.findIndex(c=>c.des==='Z'),zz=zc>=0?zc:(ys[1]!==undefined?ys[1]:ys[0]),s0={...mk(ys[0],0),x:xc,z:zz};if(type==='vector'){const ec=sh.cols.findIndex(c=>c.des==='E');s0.e=ec>=0?ec:(ys[2]!==undefined?ys[2]:null);s0.symbol='none'}g.series=[s0];g.xl=xc!==null?unitLbl(sh.cols[xc],'X'):'Index';g.yl=unitLbl(sh.cols[ys[0]],'Y');g.legend='none'}
  else if(type==='ba'){g.series=ys.slice(0,2).map((y,i)=>({...mk(y,i),x:null,e:null}));g.xl='Mean of the two methods';g.yl='Difference';g.legend='none'}
  else if(['interval','meanbar','swarm','colscatter'].includes(type)){g.series=ys.map((y,i)=>({...mk(y,i),x:null,e:null}));g.yl=ys.length===1?unitLbl(sh.cols[ys[0]],'Y'):'';g.legend='none';g.errtype='sd'}
  else if(['pareto','radialbar','bullet'].includes(type)){const lc=sh.cols.findIndex(c=>c.des==='L');g.series=ys.slice(0,type==='bullet'?2:1).map((y,i)=>({...mk(y,i),x:null,e:null}));g.labelCol=lc>=0?lc:null;g.legend='none'}
  else if(['sankey','chord','network','edgebundle'].includes(type)){const L=sh.cols.map((c,i)=>i).filter(i=>sh.cols[i].des==='L'),ys2=ys.filter(i=>!L.includes(i));g.series=[{...mk(ys2[0]??ys[0],0),x:null,e:null}];g.sankeySrc=L[0]??0;g.sankeyDst=L[1]??Math.min(1,sh.cols.length-1);g.legend='none'}
  else if(['maineffects','interaction'].includes(type)){g.series=ys.map((y,i)=>({...mk(y,i),x:null,e:null}));g.legend='none'}
  else if(['alluvial','sunburst','circpack','treemap','spiralbar','trellis','cluster','ellipse','fence','inset','doublex','streamline','waterfall','bridge','hlc','kite','piper','schoeller','stiff','tetra','variability','corrplot','map','forest','beforeafter','meansplot','runchart','venn','voronoi','fishbone','manhattan','poincare','andrews','pie3d','column3d','waterfall3d','isosurface','polarquiver','durov','soiltex','tilemap','dotplot','mac','histprob'].includes(type)){g.series=ys.map((y,i)=>({...mk(y,i),x:xc,e:null}));const lc=sh.cols.findIndex(c=>c.des==='L');g.labelCol=lc>=0?lc:null;g.legend='none';g.xl=xc!==null?unitLbl(sh.cols[xc],'X'):'';g.yl=ys.length===1?unitLbl(sh.cols[ys[0]],'Y'):'';if(type==='doublex'){const xs=sh.cols.map((c,i)=>i).filter(i=>sh.cols[i].des==='X');if(xs[1]!==undefined&&g.series[1])g.series[1].x=xs[1]}if(type==='map'){g.xl='';g.yl=''}}
  else if(['scatmat','ridge','parallel','qc','windrose','smith','ternary','pyramid','candle','ohlc'].includes(type)){g.series=ys.map((y,i)=>({...mk(y,i),x:xc,e:null}));g.legend='none';g.xl=xc!==null?unitLbl(sh.cols[xc],'X'):''}
  else if(type==='marginal'||type==='kde2d'){g.series=[{...mk(ys[0],0),x:xc,e:null}];g.xl=xc!==null?unitLbl(sh.cols[xc],'X'):'X';g.yl=unitLbl(sh.cols[ys[0]],'Y');g.legend='none';if(type==='kde2d'){g.fillmap=true}}
  else if(type==='bubble'){const zc=sh.cols.findIndex(c=>c.des==='Z'),zz=zc>=0?zc:(ys[1]!==undefined?ys[1]:ys[0]);g.series=[{...mk(ys[0],0),x:xc,z:zz}];g.xl=xc!==null?unitLbl(sh.cols[xc],'X'):'Index';g.yl=unitLbl(sh.cols[ys[0]],'Y');g.legend='none'}
  else if(type==='radar'){const lc=sh.cols.findIndex(c=>c.des==='L');g.series=ys.map((y,i)=>({...mk(y,i),x:null,e:null}));g.labelCol=lc>=0?lc:null}
  else if(['hist','box','violin','qq','ecdf','kde'].includes(type)){g.series=ys.map((y,i)=>({...mk(y,i),x:null,e:null}));const yl=ys.length===1?unitLbl(sh.cols[ys[0]],'Y'):'';g.yl=yl;
    if(type==='hist'){g.xl=yl||'Value';g.yl='Count'}else if(type==='ecdf'){g.xl=yl||'Value';g.yl='Cumulative probability'}else if(type==='kde'){g.xl=yl||'Value';g.yl='Density'}else if(type==='qq'){g.xl='Theoretical quantile';g.yl='Sample quantile'}}
  else if(type==='pie'||type==='doughnut'){const lc=sh.cols.findIndex(c=>c.des==='L');g.series=[{...mk(ys[0],0),x:lc>=0?lc:null,e:null}]}
  else{g.series=ys.map((y,i)=>mk(y,i));g.xl=xc!==null?unitLbl(sh.cols[xc],'X'):'Index';g.yl=ys.length===1?unitLbl(sh.cols[ys[0]],'Y'):(sh.cols[ys[0]].unit||'');
    if(type==='polar'){g.xl='';g.yl=''}}
  if(!['scat3d','pie'].includes(type)&&g.series.length<2)g.legend='none';
  if(type==='scat3d'||type==='box'||type==='violin'||type==='traj3d')g.legend='none';
  g.name=`${GTYPES[type]} ${g.id}`;if(window.PLOT_DRY)return g;P.graphs.push(g);openWin('graph',g.id);dirty();return g}

// ===== Charts wiring =====
let chart=null,gmode='pan';
function isDark(){const t=document.documentElement.dataset.theme;return t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme:dark)').matches)}
function redrawGraph(rebuild){if(chart&&P.act&&P.act.t==='graph'){const g=curGraph();if(g){chart.setTheme(isDark()?'dark':'light');chart.set(g,sheetById)}}if(rebuild)renderProps()}
function initChart(){chart=new Chart($('#cv'),$('#tip'));chart.getGraph=graphById;chart.onView=()=>{};chart.onNote=()=>{dirty();renderProps()};
  new ResizeObserver(()=>redrawGraph()).observe($('#gwrap'));
  $$('#gtools [data-mode]').forEach(b=>b.onclick=()=>{setGraphMode(b.dataset.mode);if(['roi','brush','cursor'].includes(b.dataset.mode)){gadgetRefresh(true)}});
  $('#gGad').onclick=()=>gadgetToggle();
  $('#gReset').onclick=()=>{const g=curGraph();if(g){g.view=null;g.zoom=1;redrawGraph()}};
  $('#gPng').onclick=()=>{const g=curGraph();if(g)chart.exportPNG(2,b=>download((g.name||'graph')+'.png',b))};
  $('#gCopy').onclick=()=>{chart.exportPNG(2,async b=>{try{await navigator.clipboard.write([new ClipboardItem({'image/png':b})]);flash('Graph copied to clipboard')}catch(e){alert('Clipboard not available; use PNG export.')}})}}
function flash(msg){let f=$('#flash');if(!f){f=document.createElement('div');f.id='flash';f.style.cssText='position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:var(--ink);color:var(--bg);padding:7px 14px;border-radius:7px;z-index:99;font-size:13px';document.body.append(f)}f.textContent=msg;f.style.display='block';clearTimeout(f._t);f._t=setTimeout(()=>f.style.display='none',2500)}

// ===== I/O =====
function download(name,blob){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000)}
function sheetToCSV(sh){const n=NR(sh),q=s=>/[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;
  const head=[sh.cols.map(c=>q(c.name+(c.unit?` (${c.unit})`:''))).join(',')];return head.concat(Array.from({length:n},(_,r)=>sh.cols.map(c=>{const v=c.d[r];return v===undefined||(typeof v==='number'&&Number.isNaN(v))?'':q(String(v))}).join(','))).join('\n')}
function matrixToSheet(rows,name){ // rows: array of arrays of raw strings/numbers
  rows=rows.filter(r=>r.some(c=>String(c??'').trim()!==''));if(!rows.length)return null;const isNum=s=>typeof s==='number'||(s!==''&&!Number.isNaN(Number(String(s).replace(',','.'))));
  const hasHead=rows[0].some(c=>String(c??'').trim()!==''&&!isNum(String(c).trim()));let head=hasHead?rows.shift().map(c=>String(c??'').trim()):null;
  const nc=Math.max(...rows.map(r=>r.length),head?head.length:0);
  const cols=Array.from({length:nc},(_,j)=>{let nm=head&&head[j]||'',unit='';const m=nm.match(/^(.*?)\s*[\(\[]([^\)\]]*)[\)\]]\s*$/);if(m){nm=m[1];unit=m[2]}
    return{name:nm,unit,des:j===0&&nc>1?'X':'Y',d:rows.map(r=>{const v=r[j];return v===undefined?NaN:parseCell(typeof v==='number'?v:String(v))}).map(v=>v)}});
  cols.forEach(c=>{const strs=c.d.filter(v=>typeof v==='string'),nums=c.d.filter(v=>typeof v==='number'&&!Number.isNaN(v));
    if(strs.length>=2&&!nums.length&&strs.filter(v=>Number.isFinite(parseDate(v))).length>=.8*strs.length){c.d=c.d.map(v=>typeof v==='string'?(Number.isFinite(parseDate(v))?parseDate(v):NaN):v);c.fmt='date';if(c.des==='Y'&&cols.indexOf(c)===0)c.des='X'}
    while(c.d.length&&typeof c.d[c.d.length-1]==='number'&&Number.isNaN(c.d[c.d.length-1]))c.d.pop()});
  return mkSheet(name,cols)}
function parseDelimited(txt){const lines=txt.replace(/\r/g,'').split('\n').filter(l=>l.trim()!=='');if(!lines.length)return[];const f=lines.find(l=>!l.startsWith('#'))||lines[0];
  const sep=f.includes('\t')?'\t':f.includes(';')?';':f.includes(',')?',':/\s+/;
  return lines.filter(l=>!l.startsWith('#')).map(l=>{if(sep===','||sep===';'){const o=[];let cur='',q=false;for(const ch of l){if(ch==='"')q=!q;else if(ch===sep&&!q){o.push(cur);cur=''}else cur+=ch}o.push(cur);return o.map(s=>s.trim())}return l.trim().split(sep).map(s=>s.trim().replace(/^"|"$/g,''))})}
async function importFile(file){const nm=file.name.replace(/\.[^.]+$/,'');
  try{
    if(/\.json$/i.test(file.name)){importJSONText(await file.text(),nm);return}
    if(/\.html?$/i.test(file.name)){htmlTablesToSheets(await file.text(),nm);return}
    if(/\.xml$/i.test(file.name)){xmlToSheet(await file.text(),nm);return}
    if(/\.xlsx?$/i.test(file.name)){if(!window.XLSX){if(!await extConsent('The Excel reader (SheetJS, Apache-2.0)','cdnjs.cloudflare.com'))return;await new Promise((ok,no)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';s.onload=ok;s.onerror=()=>no(new Error('Could not load the Excel reader (offline?). Save as CSV instead.'));document.head.append(s)})}
      const wb=XLSX.read(await file.arrayBuffer(),{type:'array'});snap();let last;wb.SheetNames.forEach(n=>{last=matrixToSheet(XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,raw:true}),wb.SheetNames.length>1?`${nm}_${n}`:nm)||last});if(last)openWin('sheet',last.id);return}
    snap();const sh=matrixToSheet(parseDelimited(await file.text()),nm);if(!sh)return alert('No data found in file.');openWin('sheet',sh.id);dirty();flash(`Imported ${sh.cols.length} columns × ${NR(sh)} rows`)
  }catch(e){alert('Import failed: '+e.message)}}
function projectJSON(){return ser()}
function loadProject(txt){try{snap();const o=deser(txt);P.sheets=o.sheets;P.graphs=o.graphs;P.results=o.results;unpackExtra(o);registerUserFuncs();renderResults();P.nid=o.nid||100;P.open=o.open||[];P.act=o.act||null;if(!P.open.length&&P.sheets.length)P.open=[{t:'sheet',id:P.sheets[0].id}];if(!P.act||!P.open.length)P.act=P.open[0];showWin();dirty();flash('Project loaded')}catch(e){alert('Not a valid project file: '+e.message)}}
function loadSample(key,openIt=true){const s=SAMPLES[key].make(),sh=mkSheet(s.name,s.cols,s.isMatrix?{isMatrix:true,xv:s.xv,yv:s.yv}:{});if(openIt)openWin('sheet',sh.id);return sh}
