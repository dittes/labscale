'use strict';
// Workspaces: Classic (full ribbon), Studio (tool strip + options bar + dockable panels), Minimal (canvas first).
const WORKSPACES=[['studio','Standard (menus, context bar, tool strip, panels)'],['minimal','Minimal (canvas first)']];
const WS_TOOLS=[['↖','Pan / select (click an annotation to select it)','pan'],['⛶','Zoom box','zoom'],['▭','Region of interest','roi'],['⬚','Brush select','brush'],['✛','Data cursors','cursor'],['T','Text note','note'],['✎','Draw shapes (choose a shape)','shape'],['⇱','Move a data point','movept'],['✚','Add a data point','drawpt']];
function wsGet(){try{return localStorage.getItem('la_workspace')==='minimal'?'minimal':'studio'}catch(e){return'studio'}}
function wsBuildStrip(){let s=document.getElementById('tstrip');if(!s){s=document.createElement('div');s.id='tstrip';document.getElementById('center').prepend(s)}
  if(P.act&&P.act.t==='sheet'&&typeof sheetStripHTML==='function'){s.innerHTML=sheetStripHTML();s.onclick=e=>{const b=e.target.closest('.ts');if(b)sheetToolClick(+b.dataset.st,b)};return}
  if(P.act&&P.act.t!=='graph'){s.innerHTML=[['＋','New worksheet','new'],['⇥','Import a file','imp'],['⚗','Load sample data','smp'],['⌘','Search everything (Ctrl+K)','pal']].map(([i,t,a])=>`<button class="ts" data-tip="${esc(t)}" data-w="${a}">${i}</button>`).join('');s.onclick=e=>{const b=e.target.closest('.ts');if(!b)return;({new:()=>COLOP.newsheet(),imp:()=>COLOP.importFile(),smp:()=>COLOP.samples(),pal:()=>openPalette()})[b.dataset.w]()};return}
  const act=(i,t,fn,mode)=>`<button class="ts" data-tip="${esc(t)}" ${mode?`data-m="${mode}"`:''} data-a="${i}">${esc(i)}</button>`;
  s.innerHTML=WS_TOOLS.map(([i,t,m])=>act(i,t,null,m)).join('')+'<i></i>'+[['⚙','Gadgets: quick fit, peaks, statistics…','gad'],['▣','Open an image for processing','img'],['⌘','Search every command (Ctrl+K)','pal']].map(([i,t,a])=>`<button class="ts" data-tip="${esc(t)}" data-x="${a}">${i}</button>`).join('');
  s.onclick=e=>{const b=e.target.closest('.ts');if(!b)return;if(b.dataset.x){if(b.dataset.x==='pal')openPalette();else if(b.dataset.x==='img')loadImageDialog();else if(P.act?.t==='graph')document.getElementById('gGad').click();else flash('Open a graph to use gadgets');return}
    if(P.act?.t!=='graph'){flash('Open a graph to use this tool');return}if(b.dataset.m==='shape'){const r=b.getBoundingClientRect();popMenu(shapeMenuItems(),r.right+6,r.top);return}const t=document.querySelector(`#gtools [data-mode="${b.dataset.m}"]`);if(t)t.click()};
  const sync=()=>s.querySelectorAll('[data-m]').forEach(b=>b.classList.toggle('on',!!document.querySelector(`#gtools [data-mode="${b.dataset.m}"].on`)));
  if(!wsBuildStrip.obs){wsBuildStrip.obs=new MutationObserver(sync);wsBuildStrip.obs.observe(document.getElementById('gtools'),{attributes:true,subtree:true,attributeFilter:['class']})}sync()}
function setWorkspace(name,persist=true){if(!WORKSPACES.some(w=>w[0]===name))name='studio';const prev=document.body.dataset.ws;document.body.dataset.ws=name;document.body.classList.remove('ribopen','focus');
  if(persist){try{localStorage.setItem('la_workspace',name)}catch(e){}}
  const body=document.getElementById('body'),res=document.getElementById('results');
  wsBuildStrip();
  if(prev!==name){// panel defaults per workspace
    body.classList.toggle('noexp',true);body.classList.toggle('noprops',name==='minimal');res.classList.toggle('min',true)}
  document.documentElement.style.setProperty('--toph',document.getElementById('top').offsetHeight+'px');document.documentElement.style.setProperty('--wt',document.getElementById('wintabs').offsetHeight+'px');
  if(typeof redrawGraph==='function')setTimeout(redrawGraph,30)}
function workspaceDialog(){dialog({title:'Settings',ok:'Apply',sheet:{cols:[]},hint:'Workspace changes how tools and panels are arranged. Tab hides every panel in Studio and Minimal. Your choice is remembered on this device.',fields:[{t:'sel',k:'ws',label:'Workspace',def:wsGet(),opts:WORKSPACES},{t:'sel',k:'th',label:'Theme',def:document.documentElement.dataset.theme||'auto',opts:[['auto','Follow system'],['light','Light'],['dark','Dark']]},{t:'sel',k:'rf',label:'Default report format',def:(()=>{try{return localStorage.getItem('la_report_fmt')||'pdf'}catch(e){return'pdf'}})(),opts:typeof REPORT_FORMATS!=='undefined'?REPORT_FORMATS:[['pdf','PDF']]}],
  onOk:a=>{setWorkspace(a.ws);const r=document.documentElement;if(a.th==='auto')delete r.dataset.theme;else r.dataset.theme=a.th;try{if(a.th==='auto')localStorage.removeItem('labanalysis.theme');else localStorage.setItem('labanalysis.theme',a.th);localStorage.setItem('la_report_fmt',a.rf)}catch(e){}if(typeof redrawGraph==='function')redrawGraph()}})}
(function initWorkspace(){const top=document.getElementById('top');if(!document.getElementById('bSet')){const b=document.createElement('button');b.id='bSet';b.title='Settings (workspace, theme, report format)';b.textContent='⚙';top.append(b)}document.getElementById('bSet').onclick=workspaceDialog;
  document.getElementById('rtabs').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||document.body.dataset.ws==='classic')return;const open=document.body.classList.contains('ribopen'),same=b.dataset.t===window.__ribTabPrev;document.body.classList.toggle('ribopen',!(open&&same));window.__ribTabPrev=b.dataset.t},true);
  document.getElementById('ribbon').addEventListener('click',e=>{if(document.body.dataset.ws!=='classic'&&e.target.closest('.rb'))setTimeout(()=>document.body.classList.remove('ribopen'),0)});
  document.addEventListener('mousedown',e=>{if(document.body.classList.contains('ribopen')&&!e.target.closest('#ribbon,#rtabs'))document.body.classList.remove('ribopen')});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')document.body.classList.remove('ribopen');if(e.key==='Tab'&&document.body.dataset.ws!=='classic'&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||'')&&!document.querySelector('dialog[open]')&&!(document.activeElement?.id==='grid')){e.preventDefault();document.body.classList.toggle('focus');if(typeof redrawGraph==='function')setTimeout(redrawGraph,30)}});
  RIB.File.push(['Workspace',[['Settings / layout','⚙',workspaceDialog],['Standard layout','◧',()=>setWorkspace('studio')],['Minimal layout','▢',()=>setWorkspace('minimal')]]]);
  if(typeof renderRibbon==='function')renderRibbon();setWorkspace(wsGet(),false)})();

// ---- draggable floating windows (gadgets panel, dialogs, image tool) ----
(function dragWindows(){let d=null;
  document.addEventListener('mousedown',e=>{if(e.button!==0)return;const h=e.target.closest('#gpanel .gh,dialog.dlg h3');if(!h||e.target.closest('select,button,input,textarea,a'))return;
    const el=h.closest('#gpanel,dialog.dlg');if(!el)return;e.preventDefault();
    if(el.id==='gpanel'){const pr=el.parentElement.getBoundingClientRect(),r=el.getBoundingClientRect();el.style.right='auto';el.style.bottom='auto';el.style.left=(r.left-pr.left)+'px';el.style.top=(r.top-pr.top)+'px';d={el,gp:true,x:e.clientX,y:e.clientY,l:r.left-pr.left,t:r.top-pr.top,pw:pr.width,ph:pr.height,w:r.width,h:r.height}}
    else{const m=/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(el.style.transform||'');d={el,x:e.clientX,y:e.clientY,tx:m?+m[1]:0,ty:m?+m[2]:0}}document.body.style.userSelect='none'});
  document.addEventListener('mousemove',e=>{if(!d)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;
    if(d.gp){d.el.style.left=Math.max(0,Math.min(d.pw-60,d.l+dx))+'px';d.el.style.top=Math.max(0,Math.min(d.ph-30,d.t+dy))+'px'}else d.el.style.transform=`translate(${d.tx+dx}px,${d.ty+dy}px)`});
  document.addEventListener('mouseup',()=>{if(d){d=null;document.body.style.userSelect=''}});
  const st=document.createElement('style');st.textContent='#gpanel .gh,dialog.dlg h3{cursor:move;user-select:none}#gpanel{resize:both;min-width:260px;min-height:120px}dialog.dlg h3{margin:-4px -4px 4px;padding:4px}';document.head.append(st)})();
