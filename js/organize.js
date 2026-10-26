'use strict';
// Organise: explorer with folders (drag & drop, context menus), inline rename, layout pages, report page breaks,
// and dragging graphs / results / sheets into layouts and reports.
const SEC_NAME={sheet:'Sheets',graph:'Graphs',layout:'Layouts',note:'Reports'};
const listOf=t=>t==='sheet'?P.sheets:t==='graph'?P.graphs:t==='layout'?(P.layouts=P.layouts||[]):(P.notes=P.notes||[]);
const TYPE_LABEL={sheet:'sheet',graph:'graph',layout:'layout',note:'report'};
let ORG_DRAG=null;
const orgSnap=label=>{histHint=label;snap();histHint=null};

// ---------- folders ----------
function foldersOf(t){const set=new Set((P.tfolders&&P.tfolders[t])||[]);listOf(t).forEach(o=>{if(o.folder)set.add(o.folder)});return[...set]}
function addFolder(t,name){P.tfolders=P.tfolders||{};const a=(P.tfolders[t]=P.tfolders[t]||[]);if(!a.includes(name))a.push(name)}
function uniqueFolder(t,base){const have=foldersOf(t);let n=base,i=2;while(have.includes(n))n=base+' '+i++;return n}
function orgNewFolder(t){if(!listOf(t))t='sheet';orgSnap('New folder');const n=uniqueFolder(t,'New folder');addFolder(t,n);if(P.foldClosed)delete P.foldClosed[t+'|'+n];dirty();$('#body').classList.remove('noexp');renderExplorer();
  const el=[...document.querySelectorAll('#explorer .fold')].find(f=>f.dataset.t===t&&f.dataset.f===n);if(el)renameFolderInline(el)}
function renameFolder(t,old,nw){nw=nw.trim();if(!nw||nw===old)return;orgSnap('Rename folder');listOf(t).forEach(o=>{if(o.folder===old)o.folder=nw});const a=(P.tfolders&&P.tfolders[t])||[];const i=a.indexOf(old);if(i>=0){if(a.includes(nw))a.splice(i,1);else a[i]=nw}else addFolder(t,nw);
  if(P.foldClosed&&P.foldClosed[t+'|'+old]!==undefined){P.foldClosed[t+'|'+nw]=P.foldClosed[t+'|'+old];delete P.foldClosed[t+'|'+old]}dirty();renderExplorer()}
function deleteFolder(t,f){orgSnap('Delete folder');listOf(t).forEach(o=>{if(o.folder===f)delete o.folder});if(P.tfolders&&P.tfolders[t])P.tfolders[t]=P.tfolders[t].filter(x=>x!==f);dirty();renderExplorer()}
function moveToFolderOf(t,id,folder){const o=winObj(t,id);if(!o||(o.folder||'')===(folder||''))return;orgSnap('Move to folder');if(folder){addFolder(t,folder);o.folder=folder;if(P.foldClosed)delete P.foldClosed[t+'|'+folder]}else delete o.folder;dirty();renderExplorer()}
function folderBlock(items,t,sub,itFn){const closed=P.foldClosed||{};
  let h=items.filter(o=>!o.folder).map(o=>itFn(t,o,sub(o))).join('');
  foldersOf(t).forEach(f=>{const its=items.filter(o=>o.folder===f),k=t+'|'+f;
    h+=`<div class="fold" data-fold="${esc(k)}" data-t="${t}" data-f="${esc(f)}" title="Double-click to rename · right-click for options"><span class="fchev">${closed[k]?'▸':'▾'}</span><svg class="ficon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">${closed[k]?'<path d="M1.5 3.5a1 1 0 0 1 1-1h3.2l1.5 1.7h6.3a1 1 0 0 1 1 1v6.8a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1z" fill="currentColor" opacity=".85"/>':'<path d="M1.5 3.5a1 1 0 0 1 1-1h3.2l1.5 1.7h6.3a1 1 0 0 1 1 1v1H4.2L1.5 12.5z" fill="currentColor" opacity=".55"/><path d="M4.2 6.2h11l-2.4 6.3a1 1 0 0 1-.9.6H2.5a1 1 0 0 1-1-1.1z" fill="currentColor" opacity=".9"/>'}</svg><span class="fn">${esc(f)}</span> <span class="note">${its.length}</span></div>`+(closed[k]?'':its.map(o=>itFn(t,o,sub(o)).replace('class="it','class="it indent')).join(''))});return h}

// ---------- tabs and explorer ----------
function renderTabs(){$('#wintabs').innerHTML=P.open.map(w=>{const o=winObj(w.t,w.id);if(!o)return'';const on=P.act&&P.act.t===w.t&&P.act.id===w.id;return`<div class="wt ${on?'on':''}" data-t="${w.t}" data-id="${w.id}" title="Double-click to rename"><span>${WINICON[w.t]}</span><span class="tn">${esc(o.name)}</span><button data-close="1" title="Close">×</button></div>`}).join('')}
function renderExplorer(){
  const it=(t,o,sub)=>`<div class="it ${P.act&&P.act.t===t&&P.act.id===o.id?'on':''}" draggable="true" data-t="${t}" data-id="${o.id}"><span>${WINICON[t]||'◢'}</span><span class="n" title="${esc(o.name)}">${esc(o.name)}</span><span class="note">${sub}</span><button class="x" data-del="1" title="Delete">✕</button></div>`;
  const sec=(t,items,sub,btn,none)=>`<h5 data-sec="${t}">${SEC_NAME[t]}${btn?` <span class="sp"></span>${btn}`:''}</h5>${folderBlock(items,t,sub,it)||`<div class="note" style="padding:6px 10px">${none}</div>`}`;
  $('#explorer').innerHTML=`<div class="ex">`+
    sec('sheet',P.sheets,s=>`${s.cols.length}×${NR(s)}${s.conn?' ⛓︎':''}`,'<button id="exNew" style="padding:0 6px" title="New sheet">+</button>','No sheets')+
    sec('graph',P.graphs,g=>GTYPES[g.type]?.split(' ')[0]||'','','No graphs yet')+
    sec('layout',listOf('layout'),l=>(l.pages&&l.pages.length>1)?l.pages.length+' pg':'','<button id="exLay" style="padding:0 6px" title="New layout page">+</button>','None')+
    sec('note',listOf('note'),()=>'','<button id="exNote" style="padding:0 6px" title="New report / note">+</button>','None')+
    `<h5>Results <span class="sp"></span><span class="note">${P.results.length}</span></h5><div class="note" style="padding:6px 10px;cursor:pointer" id="exRes">${P.results.length?'Show results log':'None yet'}</div></div>`}

// ---------- inline rename ----------
function inlineEdit(host,cur,commit){if(host.querySelector('input.renm'))return;const inp=document.createElement('input');inp.type='text';inp.className='renm';inp.value=cur;inp.setAttribute('aria-label','Rename');inp.style.width=Math.max(90,host.offsetWidth)+'px';
  const prev=host.innerHTML;host.textContent='';host.append(inp);inp.focus();inp.select();let done=false;
  const fin=ok=>{if(done)return;done=true;const v=inp.value.trim();if(ok&&v&&v!==cur)commit(v);else host.innerHTML=prev};
  inp.onkeydown=e=>{e.stopPropagation();if(e.key==='Enter'){e.preventDefault();fin(true)}else if(e.key==='Escape'){e.preventDefault();fin(false)}};inp.onblur=()=>fin(true);['click','dblclick','mousedown','dragstart'].forEach(ev=>inp.addEventListener(ev,e=>e.stopPropagation()))}
function renameObj(t,id,nw){const o=winObj(t,id);if(!o)return;const old=o.name;orgSnap('Rename '+TYPE_LABEL[t]);o.name=nw;
  if(t==='graph'||t==='sheet'){const tag=t==='graph'?'graph':'table';(P.notes||[]).forEach(n=>{n.text=n.text.split(`{{${tag}:${old}}}`).join(`{{${tag}:${nw}}}`)})}
  dirty();renderTabs();renderExplorer();if(P.act&&P.act.t===t&&P.act.id===id)renderProps()}
function renameFolderInline(el){const f=el.dataset.f,t=el.dataset.t;inlineEdit(el.querySelector('.fn'),f,v=>renameFolder(t,f,v))}
function renameItemInline(it){const t=it.dataset.t,id=+it.dataset.id,o=winObj(t,id);if(o)inlineEdit(it.querySelector('.n'),o.name,v=>renameObj(t,id,v))}
function renameActive(){const a=P.act;if(!a)return;const tab=[...document.querySelectorAll('#wintabs .wt')].find(x=>x.dataset.t===a.t&&+x.dataset.id===a.id),o=winObj(a.t,a.id);if(tab&&o)inlineEdit(tab.querySelector('.tn'),o.name,v=>renameObj(a.t,a.id,v))}

// ---------- duplicate / add to layout / report ----------
function dupItem(t,id){const o=winObj(t,id);if(!o)return;let c;try{c=structuredClone(o)}catch(e){c=JSON.parse(JSON.stringify(o))}orgSnap('Duplicate '+TYPE_LABEL[t]);c.id=uid();c.name=o.name+' copy';
  if(t==='layout'){(c.pages||[]).forEach(p=>p.items.forEach(i=>i.id=uid()));ensurePages(c)}listOf(t).push(c);dirty();openWin(t,c.id)}
function addToLayout(L,kind,id,x,y){orgSnap('Add to layout');const w=kind==='graph'?L.w*.45:L.w*.5,h=kind==='graph'?L.h*.5:L.h*.4,n=L.items.length,it={id:uid(),t:kind,w,h};
  it.x=Math.round(Math.max(0,Math.min(L.w-w,x!==undefined?x-w/2:40+(n%8)*24)));it.y=Math.round(Math.max(0,Math.min(L.h-h,y!==undefined?y-h/2:80+(n%8)*24)));
  if(kind==='graph')it.gid=id;else it.rid=id;L.items.push(it);LS.sel=it.id;dirty();if(curLayout()===L)renderLayout();flash(`Added to “${L.name}”, page ${(L.cur||0)+1}`)}
function addToNote(n,text){orgSnap('Add to report');n.text=n.text.replace(/\s*$/,'')+'\n\n'+text+'\n';dirty();const c=curNote();if(c===n){$('#ntext').value=n.text;renderNote()}flash(`Added to “${n.name}”`)}
function placeholderFor(t,id){const o=t==='result'?P.results.find(r=>r.id===id):winObj(t,id);if(!o)return'';return t==='graph'?`{{graph:${o.name}}}`:t==='sheet'?`{{table:${o.name}}}`:t==='result'?`{{result:${o.title}}}`:''}
function newLayoutWith(kind,id){const[w,h,pw,ph]=PAGES['A4 landscape'],L={id:uid(),name:'Figure page '+(listOf('layout').length+1),w,h,pw,ph,items:[]};ensurePages(L);orgSnap('New layout');listOf('layout').push(L);L.items.push({id:uid(),t:'text',text:L.name,x:30,y:20,w:w-60,h:40,fs:26,bold:true});
  const it={id:uid(),t:kind,x:30,y:80,w:w-60,h:h-110};if(kind==='graph')it.gid=id;else it.rid=id;L.items.push(it);openWin('layout',L.id);dirty()}

// ---------- context menus ----------
function itemMenu(t,id){const o=winObj(t,id);if(!o)return[];const fs=foldersOf(t),items=[['Open','',()=>openWin(t,id),null,'↗'],['Rename','F2',()=>{const el=[...document.querySelectorAll('#explorer .it')].find(x=>x.dataset.t===t&&+x.dataset.id===id);if(el)renameItemInline(el)},null,'✎'],['Duplicate','',()=>dupItem(t,id),null,'⧉']];
  const mv=[['(top level)','',()=>moveToFolderOf(t,id,''),null,o.folder?'':'✓'],...fs.map(f=>[f,'',()=>moveToFolderOf(t,id,f),null,o.folder===f?'✓':'▸']),['New folder…','',()=>{orgSnap('New folder');const n=uniqueFolder(t,'New folder');addFolder(t,n);o.folder=n;dirty();renderExplorer();const el=[...document.querySelectorAll('#explorer .fold')].find(f=>f.dataset.t===t&&f.dataset.f===n);if(el)renameFolderInline(el)},null,'+']];
  items.push(['Move to folder','',null,mv,'▸']);
  if(t==='graph'){const ls=listOf('layout');items.push(['—'],['Add to layout page','',null,[...ls.map(L=>[L.name,'',()=>addToLayout(L,'graph',id),null,'▤']),['New layout page','',()=>newLayoutWith('graph',id),null,'+']],'▤']);
    const ns=listOf('note');if(ns.length)items.push(['Insert into report','',null,ns.map(n=>[n.name,'',()=>addToNote(n,placeholderFor('graph',id)),null,'✎']),'✎'])}
  if(t==='sheet'){const ns=listOf('note');if(ns.length)items.push(['—'],['Insert table into report','',null,ns.map(n=>[n.name,'',()=>addToNote(n,placeholderFor('sheet',id)),null,'✎']),'✎'])}
  items.push(['—'],['Delete','',()=>{const el=[...document.querySelectorAll('#explorer .it')].find(x=>x.dataset.t===t&&+x.dataset.id===id);el&&el.querySelector('[data-del]').click()},null,'✕']);return items}
const NEWFN={sheet:()=>newSheetCmd(),graph:()=>flash('Select data in a sheet and use the Plot menu'),layout:()=>newLayoutDialog(),note:()=>newNoteCmd()};
function exContext(e){const it=e.target.closest('.it'),fold=e.target.closest('.fold'),h=e.target.closest('h5[data-sec]');
  let items=null;
  if(it){items=itemMenu(it.dataset.t,+it.dataset.id)}
  else if(fold){const t=fold.dataset.t,f=fold.dataset.f;items=[['Rename folder','',()=>renameFolderInline(fold),null,'✎'],['New folder','',()=>orgNewFolder(t),null,'+'],['—'],['Delete folder (items move out)','',()=>deleteFolder(t,f),null,'✕']]}
  else if(h){const t=h.dataset.sec;items=[['New '+TYPE_LABEL[t],'',NEWFN[t],null,'+'],['New folder','',()=>orgNewFolder(t),null,'📁︎']]}
  if(!items)return;e.preventDefault();popMenu(items,e.clientX,e.clientY)}

// ---------- explorer drag & drop ----------
function clearDz(){document.querySelectorAll('.dz').forEach(x=>x.classList.remove('dz'))}
function exTarget(e){const d=ORG_DRAG;if(!d)return null;const it=e.target.closest('.it'),fold=e.target.closest('.fold'),h=e.target.closest('h5[data-sec]');
  if(d.t!=='result'){if(fold&&fold.dataset.t===d.t)return{el:fold,mode:'folder',f:fold.dataset.f};if(h&&h.dataset.sec===d.t)return{el:h,mode:'folder',f:''};
    if(it&&it.dataset.t===d.t&&!(+it.dataset.id===d.id)){const o=winObj(d.t,+it.dataset.id);return{el:it,mode:'folder',f:o&&o.folder||''}}}
  if(it&&it.dataset.t==='layout'&&(d.t==='graph'||d.t==='result'))return{el:it,mode:'layout',id:+it.dataset.id};
  if(it&&it.dataset.t==='note'&&(d.t==='graph'||d.t==='result'||d.t==='sheet'))return{el:it,mode:'note',id:+it.dataset.id};return null}
function initExplorerDnD(){const ex=$('#explorer');
  ex.addEventListener('dragstart',e=>{const it=e.target.closest&&e.target.closest('.it');if(!it){e.preventDefault();return}const t=it.dataset.t,id=+it.dataset.id;ORG_DRAG={t,id};e.dataTransfer.effectAllowed='copyMove';e.dataTransfer.setData('application/x-labscale',JSON.stringify(ORG_DRAG));e.dataTransfer.setData('text/plain',placeholderFor(t,id)||(winObj(t,id)||{}).name||'');it.classList.add('dragging')});
  ex.addEventListener('dragend',()=>{ORG_DRAG=null;clearDz();document.querySelectorAll('.dragging').forEach(x=>x.classList.remove('dragging'))});
  ex.addEventListener('dragover',e=>{const tg=exTarget(e);clearDz();if(!tg)return;e.preventDefault();e.dataTransfer.dropEffect=tg.mode==='folder'?'move':'copy';tg.el.classList.add('dz')});
  ex.addEventListener('dragleave',e=>{if(!ex.contains(e.relatedTarget))clearDz()});
  ex.addEventListener('drop',e=>{const tg=exTarget(e),d=ORG_DRAG;clearDz();if(!tg||!d)return;e.preventDefault();e.stopPropagation();
    if(tg.mode==='folder')moveToFolderOf(d.t,d.id,tg.f);
    else if(tg.mode==='layout'){const L=winObj('layout',tg.id);if(L)addToLayout(L,d.t,d.id)}
    else{const n=winObj('note',tg.id),ph=placeholderFor(d.t,d.id);if(n&&ph)addToNote(n,ph)}});
  ex.addEventListener('contextmenu',exContext);
  ex.addEventListener('dblclick',e=>{if(e.target.closest('button,input'))return;const fold=e.target.closest('.fold');if(fold){e.stopPropagation();renameFolderInline(fold);return}const it=e.target.closest('.it');if(it)renameItemInline(it)});
  ex.addEventListener('keydown',e=>{if(e.key==='F2'){const it=e.target.closest('.it');if(it){e.preventDefault();renameItemInline(it)}}});
  // tabs: double-click renames
  $('#wintabs').addEventListener('dblclick',e=>{const tab=e.target.closest('.wt');if(!tab||e.target.closest('button,input'))return;const t=tab.dataset.t,id=+tab.dataset.id,o=winObj(t,id);if(o)inlineEdit(tab.querySelector('.tn'),o.name,v=>renameObj(t,id,v))});
  document.addEventListener('keydown',e=>{if(e.key==='F2'&&!e.target.closest('input,textarea,select')&&!document.querySelector('dialog[open]')){e.preventDefault();renameActive()}});
  // result cards: drag by their header
  const rl=$('#rlist');rl.addEventListener('mousedown',e=>{const c=e.target.closest('.rc');if(c&&e.target.closest('.h')&&!e.target.closest('button,input,label'))c.draggable=true});
  rl.addEventListener('dragstart',e=>{const c=e.target.closest('.rc');if(!c){return}const id=+c.dataset.id;ORG_DRAG={t:'result',id};e.dataTransfer.effectAllowed='copy';e.dataTransfer.setData('application/x-labscale',JSON.stringify(ORG_DRAG));e.dataTransfer.setData('text/plain',placeholderFor('result',id))});
  rl.addEventListener('dragend',e=>{ORG_DRAG=null;clearDz();const c=e.target.closest('.rc');if(c)c.draggable=false});
  rl.addEventListener('mouseup',()=>rl.querySelectorAll('.rc[draggable=true]').forEach(c=>{if(!ORG_DRAG)c.draggable=false}))}

// ---------- layout pages ----------
function ensurePages(L){if(!L.pages)L.pages=[{items:Array.isArray(L.items)?L.items:[]}];if(typeof L.cur!=='number')L.cur=0;
  Object.defineProperty(L,'items',{configurable:true,enumerable:false,get(){return this.pages[Math.min(this.cur||0,this.pages.length-1)].items},set(v){this.pages[Math.min(this.cur||0,this.pages.length-1)].items=v}})}
function pageLabel(L,i){return L.pages[i].name||'Page '+(i+1)}
function gotoPage(L,i){if(i<0||i>=L.pages.length)return;L.cur=i;LS.sel=null;dirty();renderLayout()}
function addPage(L,at,src){orgSnap('Add layout page');const items=src?src.items.map(x=>({...structuredClone(x),id:uid()})):[];L.pages.splice(at,0,{items,name:src&&src.name?src.name+' copy':undefined});L.cur=at;LS.sel=null;dirty();renderLayout()}
function delPage(L,i){if(L.pages.length<2)return flash('A layout needs at least one page');orgSnap('Delete layout page');L.pages.splice(i,1);L.cur=Math.min(L.cur||0,L.pages.length-1);LS.sel=null;dirty();renderLayout()}
function movePage(L,i,to){if(to<0||to>=L.pages.length||to===i)return;orgSnap('Move layout page');const cur=L.pages[L.cur||0],[p]=L.pages.splice(i,1);L.pages.splice(to,0,p);L.cur=L.pages.indexOf(cur);dirty();renderLayout()}
function pageMenu(L,i){return[['Rename page','',()=>{const el=document.querySelector(`#lpages .pgt[data-i="${i}"] .pn`);if(el)inlineEdit(el,pageLabel(L,i),v=>{orgSnap('Rename page');L.pages[i].name=v;dirty();renderLayout()})},null,'✎'],['Add page after','',()=>addPage(L,i+1),null,'+'],['Duplicate page','',()=>addPage(L,i+1,L.pages[i]),null,'⧉'],['—'],['Move left','',()=>movePage(L,i,i-1),null,'←'],['Move right','',()=>movePage(L,i,i+1),null,'→'],['—'],['Delete page','',()=>delPage(L,i),null,'✕']]}
function drawPageBar(){const L=curLayout(),bar=$('#lpages');if(!bar)return;if(!L){bar.innerHTML='';return}ensurePages(L);
  bar.innerHTML=`<span class="note">Pages</span>`+L.pages.map((p,i)=>`<div class="pgt ${i===(L.cur||0)?'on':''}" draggable="true" data-i="${i}" title="Click to open · double-click to rename · drag to reorder · right-click for options"><span class="pn">${esc(pageLabel(L,i))}</span></div>`).join('')+`<button class="pgadd" data-pg="add" title="Add a page after this one">＋ Page</button><span class="sp"></span><span class="note">${(L.cur||0)+1} / ${L.pages.length}</span>`}
function initLayoutPages(){const lw=$('#layoutWin'),bar=document.createElement('div');bar.id='lpages';bar.setAttribute('role','tablist');bar.setAttribute('aria-label','Layout pages');lw.append(bar);
  let dragI=null;
  bar.addEventListener('click',e=>{const L=curLayout();if(!L)return;if(e.target.closest('[data-pg=add]'))return addPage(L,(L.cur||0)+1);const t=e.target.closest('.pgt');if(t&&!e.target.closest('input'))gotoPage(L,+t.dataset.i)});
  bar.addEventListener('dblclick',e=>{const L=curLayout(),t=e.target.closest('.pgt');if(!L||!t)return;const i=+t.dataset.i;inlineEdit(t.querySelector('.pn'),pageLabel(L,i),v=>{orgSnap('Rename page');L.pages[i].name=v;dirty();renderLayout()})});
  bar.addEventListener('contextmenu',e=>{const L=curLayout(),t=e.target.closest('.pgt');if(!L||!t)return;e.preventDefault();popMenu(pageMenu(L,+t.dataset.i),e.clientX,e.clientY-40)});
  bar.addEventListener('dragstart',e=>{const t=e.target.closest('.pgt');if(!t){e.preventDefault();return}dragI=+t.dataset.i;e.dataTransfer.setData('text/plain','page '+dragI);e.dataTransfer.effectAllowed='move'});
  bar.addEventListener('dragover',e=>{if(dragI===null)return;const t=e.target.closest('.pgt');if(t){e.preventDefault();clearDz();t.classList.add('dz')}});
  bar.addEventListener('drop',e=>{const t=e.target.closest('.pgt'),L=curLayout();clearDz();if(dragI===null||!t||!L)return;e.preventDefault();e.stopPropagation();movePage(L,dragI,+t.dataset.i);dragI=null});
  bar.addEventListener('dragend',()=>{dragI=null;clearDz()});
  // page controls in the layout toolbar
  const o=buildLayoutTools;buildLayoutTools=function(){o();const L=curLayout();if(!L)return;$('#ltools').querySelector('[data-l=del]').insertAdjacentHTML('afterend','<button data-l="addP" title="Add a page after the current one">+ Page</button>')};
  $('#ltools').addEventListener('click',e=>{const b=e.target.closest('[data-l]');const L=curLayout();if(!b||!L)return;if(b.dataset.l==='addP'){e.stopImmediatePropagation();addPage(L,(L.cur||0)+1)}
    else if(b.dataset.l==='print'&&L.pages.length>1){e.stopImmediatePropagation();const urls=L.pages.map((p,k)=>layoutPageURL(L,k,3));printHTML(urls.map(u=>`<figure class="pf"><img src="${u}"></figure>`).join(''))}
    else if(b.dataset.l==='png'&&L.pages.length>1){e.stopImmediatePropagation();layoutPNG(L,2,b2=>download(`${L.name} - ${pageLabel(L,L.cur||0)}.png`,b2))}},true);
  document.addEventListener('keydown',e=>{const L=curLayout();if(!L||e.target.closest('input,textarea,select')||document.querySelector('dialog[open]'))return;if(e.altKey&&(e.key==='PageDown'||e.key==='PageUp')){e.preventDefault();gotoPage(L,(L.cur||0)+(e.key==='PageDown'?1:-1))}});
  // drop graphs / results straight onto the page
  const wrap=$('#lwrap');wrap.addEventListener('dragover',e=>{if(ORG_DRAG&&(ORG_DRAG.t==='graph'||ORG_DRAG.t==='result')&&curLayout()){e.preventDefault();e.dataTransfer.dropEffect='copy';wrap.classList.add('dz')}});
  wrap.addEventListener('dragleave',e=>{if(!wrap.contains(e.relatedTarget))wrap.classList.remove('dz')});
  wrap.addEventListener('drop',e=>{wrap.classList.remove('dz');const L=curLayout(),d=ORG_DRAG;if(!L||!d)return;if(d.t!=='graph'&&d.t!=='result'){e.preventDefault();return flash('Drop graphs or results onto a layout page')}e.preventDefault();e.stopPropagation();
    const b=$('#lcv').getBoundingClientRect();addToLayout(L,d.t,d.id,(e.clientX-b.left)/LS.scale,(e.clientY-b.top)/LS.scale)});
  const rl0=renderLayout;renderLayout=function(){const L=curLayout();if(L)ensurePages(L);rl0();drawPageBar()}}
function layoutPageURL(L,k,scale){const cv=document.createElement('canvas');cv.width=L.w*scale;cv.height=L.h*scale;const c=cv.getContext('2d');c.scale(scale,scale);const o=L.cur;L.cur=k;try{drawLayoutTo(c,L,LIGHT,false)}finally{L.cur=o}return cv.toDataURL('image/png')}
function layoutToPDF(L){const doc=new PDFDoc();L.pages.forEach((p,k)=>doc.addPage(L.w,L.h,c=>{const o=L.cur;L.cur=k;try{drawLayoutTo(c,L,LIGHT,false)}finally{L.cur=o}},{pw:L.pw,ph:L.ph,margin:0,footer:''}));return doc.build()}

// ---------- report pages and drops ----------
const _noteHTML=noteHTML;noteHTML=function(t,f){return _noteHTML(t,f).replace(/(?:<p>)?\{\{pagebreak\}\}(?:<\/p>)?/g,'<hr class="pb">')};
function initReportPages(){const o=renderNote;renderNote=function(){o();const n=curNote();if(n)$('#ntools').insertAdjacentHTML('afterbegin','<button data-o="pb" title="Start a new page here in the PDF / print output">+ Page break</button><button data-o="grph" title="Insert a graph placeholder">+ Graph</button><span class="sp2"></span>')};
  $('#ntools').addEventListener('click',e=>{const b=e.target.closest('[data-o]');if(!b)return;if(b.dataset.o==='pb')insertAtCursor('\n{{pagebreak}}\n');else if(b.dataset.o==='grph')document.querySelector('#props [data-note=insG]')?.click()});
  const ta=$('#ntext');ta.addEventListener('dragover',e=>{if(ORG_DRAG){e.preventDefault();e.dataTransfer.dropEffect='copy'}});
  ta.addEventListener('drop',e=>{const d=ORG_DRAG;if(!d)return;e.preventDefault();e.stopPropagation();const ph=placeholderFor(d.t,d.id);if(!ph)return flash('Layouts and reports cannot be embedded in a report');
    insertAtCursor((ta.selectionStart>0&&ta.value[ta.selectionStart-1]!=='\n'?'\n':'')+ph+'\n')})}

// ---------- styles ----------
(function(){const st=document.createElement('style');st.textContent=`.ex .dz,#lpages .dz,#lwrap.dz{background:var(--acc2)!important;outline:2px dashed var(--acc);outline-offset:-2px}.ex .it.dragging{opacity:.45}.ex .it[draggable=true]{-webkit-user-drag:element}
input.renm{font:inherit;color:var(--ink);background:var(--panel);border:1px solid var(--acc);border-radius:4px;padding:0 4px;min-width:0;max-width:260px;outline:none}.wt input.renm{width:120px!important}
.ex h5[data-sec]{transition:background .1s}.ex .fold .fn{display:inline-block}
#lpages{display:flex;align-items:center;gap:4px;padding:5px 8px;border-top:1px solid var(--line);background:var(--panel2);flex-wrap:wrap}#lpages .pgt{padding:3px 12px;border:1px solid var(--line);border-radius:6px;background:var(--panel);cursor:pointer;font-size:12.5px;user-select:none}#lpages .pgt.on{background:var(--acc);border-color:var(--acc);color:#fff}#lpages .pgadd{border:1px dashed var(--line);background:none;border-radius:6px;padding:3px 10px;color:var(--acc);cursor:pointer}#lpages .pgadd:hover{background:var(--acc2)}#lpages .sp{flex:1}
#nprev hr.pb{border:0;border-top:2px dashed var(--line);margin:22px 0 14px;height:0;overflow:visible;position:relative}#nprev hr.pb::after{content:'page break';position:absolute;top:-9px;right:0;background:var(--panel);padding:0 6px;font-size:11px;color:var(--mut)}#ntools .sp2{width:1px;height:18px;background:var(--line);margin:0 4px}`;document.head.append(st)})();
initExplorerDnD();initLayoutPages();initReportPages();
