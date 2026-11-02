/* DocScale application */
(function(){
'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const uid=()=>Math.random().toString(36).slice(2,10);
const IP={back:'<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',play:'<polygon points="6 4 20 12 6 20 6 4"/>',file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
 filetext:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',folder:'<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9l-.8-1.2A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/>',
 image:'<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',plus:'<path d="M5 12h14M12 5v14"/>',x:'<path d="M18 6 6 18M6 6l12 12"/>',
 trash:'<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
 more:'<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>',
 upload:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5M12 3v12"/>',
 settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
 code:'<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',split:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 3v18"/>',
 zin:'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3M11 8v6M8 11h6"/>',zout:'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3M8 11h6"/>',fit:'<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
 chl:'<path d="m15 18-6-6 6-6"/>',chr:'<path d="m9 18 6-6-6-6"/>',chd:'<path d="m6 9 6 6 6-6"/>',search:'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',check:'<path d="M20 6 9 17l-5-5"/>',
 alert:'<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/>',info:'<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',errc:'<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/>',
 copy:'<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',sidebar:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/>',
 sync:'<path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/>',book:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
 folderplus:'<path d="M12 10v6M9 13h6"/><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9l-.8-1.2A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/>',
 fileplus:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M12 18v-6M9 15h6"/>',star:'<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
 home:'<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
 moon:'<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',target:'<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',printer:'<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>'};
const ic=n=>'<svg class="i" viewBox="0 0 24 24">'+(IP[n]||'')+'</svg>';
const PAPER={a4:{w:794,h:1123,name:'A4'},letter:{w:816,h:1056,name:'US Letter'}};
const MM=3.7795;

/* ---------- storage ---------- */
const LS={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}},del(k){try{localStorage.removeItem(k)}catch(e){}}};
const ST=Object.assign({theme:'auto',size:13,tab:2,wrap:true,lineNumbers:true,curLine:true,auto:true,delay:800,cite:'numeric',paper:'a4',margin:25,font:'serif',fs:11,follow:true,view:'split',zoom:'fit',exw:236,edw:null,explorer:true},LS.get('ds.settings',{}));
const saveSettings=()=>LS.set('ds.settings',ST);
let IDX=LS.get('ds.index',[]);
const saveIdx=()=>LS.set('ds.index',IDX);
let P=null,editors={},views={},dirtyFiles=new Set(),unsaved=false,saveT=0,cmpT=0,compiling=false,last=null,rawOn=false,probOpen=false,zoomMode=ST.zoom,pageCount=1,scale=1;

/* ---------- ui helpers ---------- */
function toast(msg,ms){const d=document.createElement('div');d.className='toast';d.textContent=msg;$('#toasts').appendChild(d);setTimeout(()=>d.remove(),ms||2600)}
function closeMenus(){$$('.pm').forEach(m=>m.remove())}
document.addEventListener('mousedown',e=>{if(!e.target.closest('.pm'))closeMenus()},true);
window.addEventListener('blur',closeMenus);
function popMenu(items,x,y){closeMenus();const m=document.createElement('div');m.className='pm';
  items.forEach(it=>{if(it[0]==='—'){m.insertAdjacentHTML('beforeend','<div class="msep"></div>');return}
    const d=document.createElement('div');d.className='mi'+(it[5]?' '+it[5]:'');d.innerHTML=(it[4]?ic(it[4]):'<span style="width:15px;flex:none"></span>')+'<span>'+it[0]+'</span>'+(it[1]?'<span class="h">'+it[1]+'</span>':'')+(it[3]?'<span class="h">'+ic('chr')+'</span>':'');
    d.onclick=e=>{e.stopPropagation();if(it[3]){const r=d.getBoundingClientRect();popSub(it[3],r.right,r.top);return}closeMenus();if(it[2])it[2]()};m.appendChild(d)});
  document.body.appendChild(m);const r=m.getBoundingClientRect();m.style.left=Math.max(4,Math.min(x,innerWidth-r.width-6))+'px';m.style.top=Math.max(4,Math.min(y,innerHeight-r.height-6))+'px';m.style.maxHeight=(innerHeight-12)+'px';m.style.overflow='auto';return m}
function popSub(items,x,y){const keep=$$('.pm').slice(0,1);const m=popMenu(items,x,y);keep.forEach(k=>document.body.appendChild(k))}
function menuAt(btn,items){const r=btn.getBoundingClientRect();popMenu(items,r.left,r.bottom+3)}
function modal(o){const w=document.createElement('div');w.className='mdl';w.innerHTML='<div class="mbox'+(o.wide?' wide':'')+'"><div class="mh">'+o.title+'</div><div class="mb">'+o.body+'</div><div class="mf"></div></div>';document.body.appendChild(w);
  const close=()=>{w.remove();document.removeEventListener('keydown',kd,true)};const mf=w.querySelector('.mf');
  const kd=e=>{if(e.key==='Escape'){e.stopPropagation();close()}else if(e.key==='Enter'&&!e.shiftKey&&e.target.tagName!=='TEXTAREA'&&e.target.tagName!=='BUTTON'&&e.target.tagName!=='SELECT'){const p=mf.querySelector('.p');if(p){e.preventDefault();p.click()}}};document.addEventListener('keydown',kd,true);
  (o.buttons||[{label:'Close'}]).forEach(b=>{const x=document.createElement('button');x.textContent=b.label;if(b.cls)x.className=b.cls;x.onclick=()=>{if(b.fn){if(b.fn(close,w)===false)return}else close();if(!b.keep&&b.fn)close()};mf.appendChild(x)});
  w.addEventListener('mousedown',e=>{if(e.target===w&&!o.sticky)close()});if(o.mount)o.mount(w,close);const f=w.querySelector('input,select,textarea');if(f)setTimeout(()=>{f.focus();if(f.select)f.select()},30);return{el:w,close}}
const ask=(title,label,val,okLabel,cb,note)=>modal({title,body:'<div class="fld"><label>'+label+'</label><input type="text" value="'+esc(val)+'" spellcheck="false"></div>'+(note?'<div class="note">'+note+'</div>':''),buttons:[{label:'Cancel'},{label:okLabel||'OK',cls:'p',fn:(close,w)=>{const v=w.querySelector('input').value.trim();if(!v)return false;return cb(v)===false?false:undefined}}]});
const confirmDlg=(title,msg,okLabel,cb,danger)=>modal({title,body:'<div>'+msg+'</div>',buttons:[{label:'Cancel'},{label:okLabel,cls:danger?'p danger':'p',fn:()=>{cb()}}]});
const fmtTime=d=>new Date(d).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'});
const ago=t=>{const s=(Date.now()-t)/1000;if(s<60)return'just now';if(s<3600)return Math.floor(s/60)+' min ago';if(s<86400)return Math.floor(s/3600)+' h ago';return new Date(t).toLocaleDateString()};

/* ---------- theme ---------- */
function applyTheme(){const r=document.documentElement;if(ST.theme==='auto')r.removeAttribute('data-theme');else r.setAttribute('data-theme',ST.theme)}
applyTheme();

/* ---------- file helpers ---------- */
const extOf=p=>(p.split('.').pop()||'').toLowerCase();
const isImg=p=>/^(png|jpe?g|gif|svg|webp|bmp)$/.test(extOf(p));
const isText=f=>f.text!=null;
const baseName=p=>p.split('/').pop();
const dirOf=p=>p.includes('/')?p.slice(0,p.lastIndexOf('/')):'';
const fileById=id=>P.files.find(f=>f.id===id);
const mainFile=()=>fileById(P.mainId)||P.files.find(f=>/\.(tex|md)$/i.test(f.path)&&f.text!=null)||null;
function uniquePath(path){if(!P.files.some(f=>f.path===path))return path;const d=dirOf(path),b=baseName(path),i=b.lastIndexOf('.'),n=i>0?b.slice(0,i):b,e=i>0?b.slice(i):'';let k=2;while(P.files.some(f=>f.path===(d?d+'/':'')+n+' ('+k+')'+e))k++;return(d?d+'/':'')+n+' ('+k+')'+e}
function iconFor(f){return isImg(f.path)?'image':/\.(tex|md|txt)$/i.test(f.path)?'filetext':/\.(bib)$/i.test(f.path)?'book':'file'}

/* ---------- dashboard ---------- */
function newProj(tpl,name){const T=DST.templates[tpl],files=T.make().map(f=>Object.assign({id:uid()},f)),main=files.find(f=>f.path===T.main);
  const p={id:uid(),name:name||T.label.replace(/ \(.*\)/,''),files,folders:[],mainId:main.id,open:[main.id],active:main.id,collapsed:[],created:Date.now(),modified:Date.now(),tpl};
  LS.set('ds.p.'+p.id,p);IDX.unshift({id:p.id,name:p.name,created:p.created,modified:p.modified,tpl,n:files.length});saveIdx();return p}
function showDash(){if(P){saveNow();closeProject()}$('#app').classList.add('hide');const d=$('#dash');d.classList.remove('hide');document.title='DocScale · Lab books and documents';
  d.innerHTML='<div id="dtop"><span class="brand"><img src="favicon.svg" width="26" height="26" alt=""><span style="font-size:17px">Doc<b>Scale</b></span></span><span class="sp"></span><button id="dImp">'+ic('upload')+'Import</button><button class="ib" id="dTheme" title="Toggle theme">'+ic(document.documentElement.getAttribute('data-theme')==='dark'||(ST.theme==='auto'&&matchMedia('(prefers-color-scheme:dark)').matches)?'sun':'moon')+'</button><button class="p" id="dNew">'+ic('plus')+'New project</button></div>'
   +'<div id="dmain"><h1>Projects</h1><div class="sub">Lab books, reports and papers. Everything is stored in this browser; export a project backup to move it elsewhere.</div><div class="grid" id="dgrid"></div><input type="file" id="dfile" multiple hidden></div>';
  const g=$('#dgrid');g.innerHTML='<div class="card new" id="cNew">'+ic('plus')+'<span>New project</span></div>'+IDX.slice().sort((a,b)=>b.modified-a.modified).map(p=>{const T=DST.templates[p.tpl];return'<div class="card" data-id="'+p.id+'"><button class="ib ghost more" data-more="'+p.id+'" title="More">'+ic('more')+'</button><div class="thumb">'+(p.tpl==='notebook'||p.tpl==='blank'?'MD':'TeX')+'</div><div class="t">'+esc(p.name)+'</div><div class="m"><span class="tag">'+esc(T?T.label:'Project')+'</span></div><div class="m">Edited '+ago(p.modified)+' · '+(p.n||'')+' files</div></div>'}).join('');
  g.onclick=e=>{const mo=e.target.closest('[data-more]');if(mo){e.stopPropagation();const id=mo.dataset.more;menuAt(mo,[['Open','',()=>go(id),null,'file'],['Rename','',()=>ask('Rename project','Name',IDX.find(x=>x.id===id).name,'Rename',v=>{renameIdx(id,v)}),null,'edit'],['Duplicate','',()=>dupProject(id),null,'copy'],['Download backup','',()=>backup(id),null,'download'],['—'],['Delete','',()=>confirmDlg('Delete project','Delete <b>'+esc(IDX.find(x=>x.id===id).name)+'</b>? This cannot be undone.','Delete',()=>{LS.del('ds.p.'+id);IDX=IDX.filter(x=>x.id!==id);saveIdx();showDash()},1),null,'trash','danger']]);return}
    const c=e.target.closest('.card');if(!c)return;if(c.id==='cNew')newProjectDlg();else go(c.dataset.id)};
  $('#dNew').onclick=newProjectDlg;$('#dImp').onclick=()=>$('#dfile').click();$('#dfile').onchange=e=>importFiles([...e.target.files]);
  $('#dTheme').onclick=()=>{const dark=document.documentElement.getAttribute('data-theme')==='dark'||(ST.theme==='auto'&&matchMedia('(prefers-color-scheme:dark)').matches);ST.theme=dark?'light':'dark';saveSettings();applyTheme();showDash()}}
const go=id=>{location.hash='#/p/'+id};
function renameIdx(id,name){const x=IDX.find(p=>p.id===id);x.name=name;const p=LS.get('ds.p.'+id);if(p){p.name=name;LS.set('ds.p.'+id,p)}saveIdx();showDash()}
function dupProject(id){const p=LS.get('ds.p.'+id);if(!p)return;p.id=uid();p.name+=' copy';p.created=p.modified=Date.now();LS.set('ds.p.'+p.id,p);IDX.unshift({id:p.id,name:p.name,created:p.created,modified:p.modified,tpl:p.tpl,n:p.files.length});saveIdx();showDash()}
function backup(id){const p=id?LS.get('ds.p.'+id):P;DSX.download((p.name||'project').replace(/[^\w.-]+/g,'_')+'.docscale.json',JSON.stringify({docscale:1,project:p}),'application/json')}
function newProjectDlg(){let sel='paper';const T=DST.templates;
  modal({title:'New project',wide:1,body:'<div class="fld"><label>Name</label><input type="text" id="npn" value="Untitled project"></div><div class="fld"><label>Template</label><div id="tpls" style="display:flex;flex-direction:column;gap:8px">'+Object.keys(T).map(k=>'<div class="tpl'+(k===sel?' on':'')+'" data-k="'+k+'">'+ic(k==='notebook'||k==='blank'?'book':'filetext')+'<div><b>'+esc(T[k].label)+'</b><span>'+esc(T[k].desc)+'</span></div></div>').join('')+'</div></div>',
    buttons:[{label:'Cancel'},{label:'Create',cls:'p',fn:(close,w)=>{const p=newProj(sel,w.querySelector('#npn').value.trim()||'Untitled project');go(p.id)}}],
    mount:w=>w.querySelector('#tpls').onclick=e=>{const t=e.target.closest('.tpl');if(!t)return;sel=t.dataset.k;w.querySelectorAll('.tpl').forEach(x=>x.classList.toggle('on',x===t));const n=w.querySelector('#npn');if(/^(Untitled project|Scientific paper|Lab report|Lab notebook|Blank Markdown document)$/.test(n.value))n.value=sel==='blank'?'Untitled document':T[sel].label.replace(/ \(.*\)/,'')}})}
async function importFiles(fl){for(const f of fl){if(/\.json$/i.test(f.name)){try{const j=JSON.parse(await f.text());if(j.docscale&&j.project){const p=j.project;p.id=uid();p.modified=Date.now();LS.set('ds.p.'+p.id,p);IDX.unshift({id:p.id,name:p.name,created:p.created||Date.now(),modified:p.modified,tpl:p.tpl,n:p.files.length});saveIdx();toast('Imported '+p.name);continue}}catch(e){}toast('Not a DocScale backup: '+f.name)}}
  const docs=fl.filter(f=>!/\.json$/i.test(f.name));if(docs.length){const p=newProj('blank',docs[0].name.replace(/\.[^.]+$/,''));p.files=[];for(const f of docs){const o={id:uid(),path:f.name};if(isImg(f.name))o.bin=await new Promise(r=>{const fr=new FileReader();fr.onload=()=>r(fr.result);fr.readAsDataURL(f)});else o.text=await f.text();p.files.push(o)}
    const m=p.files.find(f=>/\.(tex|md)$/i.test(f.path))||p.files[0];p.mainId=m.id;p.open=[m.id];p.active=m.id;LS.set('ds.p.'+p.id,p);const x=IDX.find(i=>i.id===p.id);x.n=p.files.length;saveIdx()}
  showDash()}

/* ---------- project open/close/save ---------- */
function closeProject(){Object.values(editors).forEach(e=>e.destroy());editors={};views={};$('#edhost').innerHTML='';P=null;last=null;clearTimeout(cmpT);clearTimeout(saveT)}
function openProject(id){const p=LS.get('ds.p.'+id);if(!p){toast('Project not found');location.hash='#/';return}
  if(P&&P.id===id)return;if(P){saveNow();closeProject()}
  P=p;P.folders=P.folders||[];P.collapsed=P.collapsed||[];P.open=(P.open||[]).filter(i=>fileById(i));if(!P.open.length&&mainFile())P.open=[mainFile().id];if(!fileById(P.active))P.active=P.open[0];
  $('#dash').classList.add('hide');$('#app').classList.remove('hide');$('#pname').value=P.name;document.title=P.name+' · DocScale';
  unsaved=false;dirtyFiles.clear();setStatus();renderTree();renderTabs();activate(P.active,true);applyView();compileNow(false,true)}
function saveNow(){if(!P)return;clearTimeout(saveT);P.modified=Date.now();P.files.forEach(f=>{if(editors[f.id])f.text=editors[f.id].getValue()});
  const ok=LS.set('ds.p.'+P.id,P);const x=IDX.find(i=>i.id===P.id);if(x){x.name=P.name;x.modified=P.modified;x.n=P.files.length;saveIdx()}
  if(!ok)toast('Could not save: browser storage is full. Export a backup.',5000);else{unsaved=false;dirtyFiles.clear();renderTabs();renderTree()}setStatus()}
function markDirty(f){unsaved=true;if(f)dirtyFiles.add(f.id);setStatus();clearTimeout(saveT);saveT=setTimeout(saveNow,1200);renderTabsLight()}
function setStatus(){const s=$('#stat'),t=$('#statT');s.classList.toggle('busy',compiling);s.classList.toggle('dirty',!compiling&&unsaved);t.textContent=compiling?'Compiling…':unsaved?'Unsaved changes':'Saved'}

/* ---------- file tree ---------- */
function treeModel(){const root={dirs:{},files:[],path:''};const dir=(parts)=>{let n=root;parts.forEach((p,i)=>{n=n.dirs[p]||(n.dirs[p]={dirs:{},files:[],path:parts.slice(0,i+1).join('/')})});return n};
  P.files.forEach(f=>{const parts=f.path.split('/');dir(parts.slice(0,-1)).files.push(f)});P.folders.forEach(d=>dir(d.split('/')));return root}
function renderTree(){const mf=mainFile();const rows=[];
  (function walk(n,d){Object.keys(n.dirs).sort((a,b)=>a.localeCompare(b)).forEach(k=>{const c=n.dirs[k],col=P.collapsed.includes(c.path);
      rows.push('<div class="it f" data-dir="'+esc(c.path)+'" style="--d:'+d+'">'+ic(col?'chr':'chd')+ic('folder')+'<span class="n">'+esc(k)+'/</span><span class="acts"><button data-a="new" title="New file here">'+ic('plus')+'</button><button data-a="ren" title="Rename">'+ic('edit')+'</button><button data-a="more" title="More">'+ic('more')+'</button></span></div>');
      if(!col)walk(c,d+1)});
    n.files.slice().sort((a,b)=>baseName(a.path).localeCompare(baseName(b.path))).forEach(f=>{rows.push('<div class="it'+(f.id===P.active?' on':'')+'" draggable="true" data-id="'+f.id+'" style="--d:'+d+'" title="'+esc(f.path)+'"><span style="width:15px;flex:none"></span>'+ic(iconFor(f))+'<span class="n">'+esc(baseName(f.path))+'</span>'+(mf&&mf.id===f.id?'<span class="badge" title="Main document">MAIN</span>':'')+(dirtyFiles.has(f.id)?'<span class="ud"></span>':'')+'<span class="acts"><button data-a="ren" title="Rename">'+ic('edit')+'</button><button data-a="del" title="Delete">'+ic('trash')+'</button><button data-a="more" title="More">'+ic('more')+'</button></span></div>')})})(treeModel(),0);
  $('#tree').innerHTML=rows.join('')||'<div class="empty-note">No files yet. Use + to add one.</div>'}
function fileMenu(f){const mf=mainFile();return[['Open','',()=>openFile(f.id),null,'file'],['Rename','F2',()=>renameDlg(f),null,'edit'],['Duplicate','',()=>dupFile(f),null,'copy'],isText(f)&&/\.(tex|md)$/i.test(f.path)?['Set as main document','',()=>setMain(f),null,'star',mf&&mf.id===f.id?'dis':'']:null,['Download','',()=>dlFile(f),null,'download'],['—'],['Delete','Del',()=>delDlg(f),null,'trash','danger']].filter(Boolean)}
function dirMenu(path){return[['New file here…','',()=>newFileDlg(path),null,'fileplus'],['New folder here…','',()=>newFolderDlg(path),null,'folderplus'],['Upload here…','',()=>{upDir=path;$('#upin').click()},null,'upload'],['—'],['Rename folder','',()=>renameDirDlg(path),null,'edit'],['Delete folder','',()=>delDirDlg(path),null,'trash','danger']]}
let upDir='';
$('#tree').addEventListener('click',e=>{const row=e.target.closest('.it');if(!row)return;const a=e.target.closest('button');
  if(row.dataset.dir!=null){const p=row.dataset.dir;if(a){e.stopPropagation();if(a.dataset.a==='new')newFileDlg(p);else if(a.dataset.a==='ren')renameDirDlg(p);else menuAt(a,dirMenu(p));return}
    const i=P.collapsed.indexOf(p);if(i<0)P.collapsed.push(p);else P.collapsed.splice(i,1);renderTree();return}
  const f=fileById(row.dataset.id);if(!f)return;if(a){e.stopPropagation();if(a.dataset.a==='ren')renameDlg(f);else if(a.dataset.a==='del')delDlg(f);else menuAt(a,fileMenu(f));return}openFile(f.id)});
$('#tree').addEventListener('contextmenu',e=>{e.preventDefault();const row=e.target.closest('.it');if(!row){popMenu([['New file…','',()=>newFileDlg(''),null,'fileplus'],['New folder…','',()=>newFolderDlg(''),null,'folderplus'],['Upload files…','',()=>{upDir='';$('#upin').click()},null,'upload']],e.clientX,e.clientY);return}
  if(row.dataset.dir!=null)popMenu(dirMenu(row.dataset.dir),e.clientX,e.clientY);else{const f=fileById(row.dataset.id);if(f)popMenu(fileMenu(f),e.clientX,e.clientY)}});
$('#tree').addEventListener('dblclick',e=>{const row=e.target.closest('.it:not(.f)');if(row&&!e.target.closest('button')){const f=fileById(row.dataset.id);if(f)renameDlg(f)}});
$('#tree').addEventListener('dragstart',e=>{const row=e.target.closest('.it[data-id]');if(row){e.dataTransfer.setData('text/x-ds-file',row.dataset.id);e.dataTransfer.effectAllowed='move'}});
$('#tree').addEventListener('dragover',e=>{if(e.dataTransfer.types.includes('text/x-ds-file')){e.preventDefault();$$('#tree .drop').forEach(x=>x.classList.remove('drop'));const r=e.target.closest('.it.f');if(r)r.classList.add('drop')}});
$('#tree').addEventListener('dragleave',e=>{if(!e.relatedTarget||!e.relatedTarget.closest||!e.relatedTarget.closest('#tree'))$$('#tree .drop').forEach(x=>x.classList.remove('drop'))});
$('#tree').addEventListener('drop',e=>{const id=e.dataTransfer.getData('text/x-ds-file');$$('#tree .drop').forEach(x=>x.classList.remove('drop'));if(!id)return;e.preventDefault();const f=fileById(id),r=e.target.closest('.it.f'),d=r?r.dataset.dir:'';if(!f||dirOf(f.path)===d)return;
  const np=(d?d+'/':'')+baseName(f.path);if(P.files.some(x=>x.path===np)){toast('A file with that name already exists there');return}f.path=np;afterTreeChange()});
function afterTreeChange(){renderTree();renderTabs();Object.keys(editors).forEach(id=>{const f=fileById(id);if(f)editors[id].setLang(DSEditor.langOf(f.path))});saveNow();scheduleCompile(true)}
function setMain(f){P.mainId=f.id;saveNow();renderTree();compileNow(false);toast(baseName(f.path)+' is now the main document')}
function dupFile(f){const nf=Object.assign({},f,{id:uid(),path:uniquePath(f.path.replace(/(\.[^./]+)?$/,' copy$1'))});if(editors[f.id])nf.text=editors[f.id].getValue();P.files.push(nf);renderTree();openFile(nf.id);saveNow()}
function dlFile(f){if(f.bin)DSX.download(baseName(f.path),new Blob([DSX.dataToBytes(f.bin)]));else DSX.download(baseName(f.path),editors[f.id]?editors[f.id].getValue():f.text,'text/plain')}
const STARTER={tex:'% New LaTeX file\n',md:'# Title\n\n',bib:'',sty:'% Package file\n',txt:''};
function newFileDlg(dir){const pre=dir?dir+'/':'';modal({title:'New file',body:'<div class="fld"><label>File name (use / for folders)</label><input type="text" id="nfn" value="'+esc(pre+'untitled.tex')+'" spellcheck="false"></div><div class="fld"><label>Type</label><select id="nft"><option value="tex">LaTeX (.tex)</option><option value="md">Markdown (.md)</option><option value="bib">BibTeX (.bib)</option><option value="sty">Style / macros (.sty)</option><option value="txt">Plain text (.txt)</option></select></div>',
  buttons:[{label:'Cancel'},{label:'Create',cls:'p',fn:(close,w)=>{let n=w.querySelector('#nfn').value.trim().replace(/^\/+/,'');const t=w.querySelector('#nft').value;if(!n)return false;if(!/\.[A-Za-z0-9]+$/.test(n))n+='.'+t;
    if(P.files.some(f=>f.path===n)){toast('A file with that name already exists');return false}const f={id:uid(),path:n,text:STARTER[extOf(n)]!=null?STARTER[extOf(n)]:''};P.files.push(f);renderTree();openFile(f.id);saveNow();scheduleCompile(true)}}],
  mount:w=>w.querySelector('#nft').onchange=e=>{const i=w.querySelector('#nfn');i.value=i.value.replace(/\.[A-Za-z0-9]+$/,'')+'.'+e.target.value}})}
function newFolderDlg(dir){ask('New folder','Folder name',(dir?dir+'/':'')+'figures','Create',v=>{v=v.replace(/^\/+|\/+$/g,'');if(P.folders.includes(v)||P.files.some(f=>f.path.startsWith(v+'/'))){toast('Folder already exists');return false}P.folders.push(v);renderTree();saveNow()})}
function renameDlg(f){ask('Rename file','New path',f.path,'Rename',v=>{v=v.replace(/^\/+/,'');if(v!==f.path&&P.files.some(x=>x.path===v)){toast('A file with that name already exists');return false}f.path=v;afterTreeChange()})}
function renameDirDlg(p){ask('Rename folder','New path',p,'Rename',v=>{v=v.replace(/^\/+|\/+$/g,'');P.files.forEach(f=>{if(f.path.startsWith(p+'/'))f.path=v+f.path.slice(p.length)});P.folders=P.folders.map(d=>d===p?v:d.startsWith(p+'/')?v+d.slice(p.length):d);P.collapsed=P.collapsed.map(d=>d===p?v:d);afterTreeChange()})}
function delDlg(f){confirmDlg('Delete file','Delete <b>'+esc(f.path)+'</b>?','Delete',()=>removeFiles([f]),1)}
function delDirDlg(p){const fs=P.files.filter(f=>f.path.startsWith(p+'/'));confirmDlg('Delete folder','Delete folder <b>'+esc(p)+'</b> and its '+fs.length+' file(s)?','Delete',()=>{P.folders=P.folders.filter(d=>d!==p&&!d.startsWith(p+'/'));removeFiles(fs)},1)}
function removeFiles(fs){const ids=new Set(fs.map(f=>f.id));fs.forEach(f=>{if(editors[f.id]){editors[f.id].destroy();delete editors[f.id]}if(views[f.id]){views[f.id].remove();delete views[f.id]}});
  P.files=P.files.filter(f=>!ids.has(f.id));P.open=P.open.filter(i=>!ids.has(i));if(ids.has(P.mainId))P.mainId=(P.files.find(f=>/\.(tex|md)$/i.test(f.path))||{}).id;
  if(ids.has(P.active))P.active=P.open[P.open.length-1]||null;renderTree();renderTabs();activate(P.active);saveNow();scheduleCompile(true)}
$('#bNewF').onclick=()=>newFileDlg('');$('#bNewD').onclick=()=>newFolderDlg('');$('#bUp').onclick=()=>{upDir='';$('#upin').click()};
$('#upin').onchange=async e=>{const fl=[...e.target.files];e.target.value='';let lastF=null;for(const f of fl){const o={id:uid(),path:uniquePath((upDir?upDir+'/':'')+f.name)};
    if(isImg(f.name))o.bin=await new Promise(r=>{const fr=new FileReader();fr.onload=()=>r(fr.result);fr.readAsDataURL(f)});else{try{o.text=await f.text()}catch(err){continue}}P.files.push(o);lastF=o}
  if(lastF){renderTree();openFile(lastF.id);saveNow();scheduleCompile(true);toast('Uploaded '+fl.length+' file(s)')}};

/* ---------- tabs and views ---------- */
function renderTabs(){$('#tabs').innerHTML=P.open.map(id=>{const f=fileById(id);if(!f)return'';return'<div class="tab'+(id===P.active?' on':'')+'" data-id="'+id+'" title="'+esc(f.path)+'">'+ic(iconFor(f))+'<span>'+esc(baseName(f.path))+'</span><button class="x'+(dirtyFiles.has(id)?' dirty':'')+'" data-x="'+id+'" title="Close">'+(dirtyFiles.has(id)?'<i class="ud"></i>':'')+ic('x')+'</button></div>'}).join('')}
function renderTabsLight(){$$('#tabs .tab').forEach(t=>{const x=t.querySelector('.x'),d=dirtyFiles.has(t.dataset.id);if(d!==x.classList.contains('dirty')){x.classList.toggle('dirty',d);const u=x.querySelector('.ud');if(d&&!u)x.insertAdjacentHTML('afterbegin','<i class="ud"></i>');if(!d&&u)u.remove()}});$$('#tree .it[data-id]').forEach(r=>{const has=r.querySelector('.ud');if(dirtyFiles.has(r.dataset.id)&&!has)r.querySelector('.n').insertAdjacentHTML('afterend','<span class="ud"></span>')})}
$('#tabs').addEventListener('click',e=>{const x=e.target.closest('[data-x]');if(x){e.stopPropagation();closeTab(x.dataset.x);return}const t=e.target.closest('.tab');if(t)activate(t.dataset.id)});
$('#tabs').addEventListener('auxclick',e=>{const t=e.target.closest('.tab');if(t&&e.button===1)closeTab(t.dataset.id)});
function closeTab(id){const i=P.open.indexOf(id);if(i<0)return;P.open.splice(i,1);if(P.active===id)P.active=P.open[Math.min(i,P.open.length-1)]||null;renderTabs();activate(P.active);renderTree()}
function openFile(id,line){const f=fileById(id);if(!f)return;if(!P.open.includes(id))P.open.push(id);activate(id,false,line)}
function mkEditor(f){const ed=new DSEditor.Editor($('#edhost'),{lang:DSEditor.langOf(f.path),wrap:ST.wrap,size:ST.size,tab:ST.tab,lineNumbers:ST.lineNumbers,curLine:ST.curLine,
    onChange:e=>{f.text=e.getValue();markDirty(f);scheduleCompile();statusBar(e)},onCursor:(e,c)=>{statusBar(e,c);followCursor(f,c)},onSave:()=>{saveNow();toast('Saved')}});
  ed.setValue(f.text||'');ed.el.style.display='none';editors[f.id]=ed;views[f.id]=ed.el;return ed}
function activate(id,initial,line){P.active=id;const f=id&&fileById(id);
  $$('#edhost>*').forEach(e=>e.style.display='none');$('#edhost .nofile')&&$('#edhost .nofile').remove();
  if(!f){$('#edhost').insertAdjacentHTML('beforeend','<div class="binview nofile" style="display:flex"><div>No file open</div><div class="note">Select a file in the explorer or create a new one.</div></div>');renderTabs();renderTree();tbar(null);statusBar(null);return}
  if(!P.open.includes(id))P.open.push(id);
  if(isText(f)){const ed=editors[id]||mkEditor(f);ed.el.style.display='block';ed.render();if(ed._pd){ed.gutter();ed._pd=0}applyProblems();if(!initial||true)ed.focus();if(line)ed.goto(line,1,true)}
  else{if(!views[id]){const v=document.createElement('div');v.className=isImg(f.path)?'imgview':'binview';v.innerHTML=isImg(f.path)?'<img src="'+f.bin+'" alt=""><div class="note">'+esc(f.path)+' — reference it with <code>\\includegraphics{'+esc(f.path)+'}</code> or <code>![caption]('+esc(f.path)+')</code></div>':'<div>Binary file</div>';$('#edhost').appendChild(v);views[id]=v}views[id].style.display='flex'}
  renderTabs();renderTree();tbar(f);statusBar(isText(f)?editors[id]:null);const t=$('#tabs .tab.on');if(t&&t.scrollIntoView)t.scrollIntoView({block:'nearest',inline:'nearest'})}
const activeEd=()=>P&&P.active?editors[P.active]:null;

/* ---------- editor toolbar ---------- */
function snip(ed,text){const a=ed.ta.selectionStart,i=text.indexOf('§');ed.insert(text.replace('§',''));if(i>=0)ed.ta.setSelectionRange(a+i,a+i);ed.focus()}
function bibKeys(){return last&&last.bibKeys||[]}
function TB(lang){const E=()=>activeEd(),W=(a,b,p)=>()=>E()&&E().wrap(a,b,p),S=t=>()=>E()&&snip(E(),t);
  const btn=(label,title,fn)=>({label,title,fn}),sep={sep:1};
  if(lang==='tex')return[
   btn('Heading ▾','Section headings',(b)=>menuAt(b,[['Section','',S('\\section{§}\n')],['Subsection','',S('\\subsection{§}\n')],['Subsubsection','',S('\\subsubsection{§}\n')],['Paragraph','',S('\\paragraph{§}')],['Unnumbered section','',S('\\section*{§}\n')]])),sep,
   btn('<b>B</b>','Bold (Ctrl+B)',W('\\textbf{','}','bold')),btn('<i>I</i>','Italic (Ctrl+I)',W('\\textit{','}','italic')),btn('<span style="text-decoration:underline">U</span>','Underline',W('\\underline{','}','text')),btn('<span style="font-family:monospace">tt</span>','Monospace',W('\\texttt{','}','code')),sep,
   btn('$x$','Inline math',W('$','$','x')),btn('Eq ▾','Display math',(b)=>menuAt(b,[['Equation (numbered)','',S('\\begin{equation}\n  §\n  \\label{eq:}\n\\end{equation}\n')],['Display \\[ … \\]','',S('\\[\n  §\n\\]\n')],['Align','',S('\\begin{align}\n  § &= \\\\\n   &=\n\\end{align}\n')],['Fraction','',S('\\frac{§}{}')],['Sum','',S('\\sum_{i=1}^{n} §')],['Integral','',S('\\int_{a}^{b} § \\,dx')],['Matrix','',S('\\begin{pmatrix}\n  § & \\\\\n   &\n\\end{pmatrix}')],['Chemical formula (\\ce)','',S('\\ce{§}')]])),sep,
   btn('• List','Bullet list',S('\\begin{itemize}\n  \\item §\n\\end{itemize}\n')),btn('1. List','Numbered list',S('\\begin{enumerate}\n  \\item §\n\\end{enumerate}\n')),sep,
   btn('Insert ▾','Figures, tables, theorems…',(b)=>menuAt(b,[['Figure','',S('\\begin{figure}[ht]\n  \\centering\n  \\includegraphics[width=0.8\\textwidth]{§}\n  \\caption{}\n  \\label{fig:}\n\\end{figure}\n')],['Table','',S('\\begin{table}[ht]\n  \\centering\n  \\caption{§}\n  \\label{tab:}\n  \\begin{tabular}{lcc}\n    \\toprule\n    A & B & C \\\\\n    \\midrule\n    1 & 2 & 3 \\\\\n    \\bottomrule\n  \\end{tabular}\n\\end{table}\n')],['Theorem','',S('\\begin{theorem}[§]\n  \n\\end{theorem}\n')],['Proof','',S('\\begin{proof}\n  §\n\\end{proof}\n')],['Abstract','',S('\\begin{abstract}\n  §\n\\end{abstract}\n')],['Quote','',S('\\begin{quote}\n  §\n\\end{quote}\n')],['Code listing','',S('\\begin{verbatim}\n§\n\\end{verbatim}\n')],['—'],['Footnote','',S('\\footnote{§}')],['Hyperlink','',S('\\href{https://}{§}')],['Quantity with unit','',S('\\SI{§}{\\milli\\molar}')],['Page break','',S('\\newpage\n')],['Table of contents','',S('\\tableofcontents\n')],['Bibliography','',S('\\bibliographystyle{plain}\n\\bibliography{references}\n')]])),
   btn('Cite ▾','Insert citation',(b)=>{const k=bibKeys();if(!k.length){toast('No BibTeX entries found. Add a .bib file.');return}menuAt(b,k.map(x=>['\\cite{'+x+'}','',()=>E()&&snip(E(),'\\cite{'+x+'}')]))}),
   btn('Ref ▾','Insert reference',(b)=>{const k=last&&last.labels||[];if(!k.length){toast('No \\label found yet.');return}menuAt(b,k.map(x=>[x,'',()=>E()&&snip(E(),(/^eq/.test(x)?'\\eqref{':'\\ref{')+x+'}')]))}),
   btn('%','Toggle comment (Ctrl+/)',()=>E()&&E().toggleComment())];
  if(lang==='md')return[
   btn('Heading ▾','Headings',(b)=>menuAt(b,[1,2,3,4].map(n=>['Heading '+n,'',S('#'.repeat(n)+' §\n')]))),sep,
   btn('<b>B</b>','Bold (Ctrl+B)',W('**','**','bold')),btn('<i>I</i>','Italic (Ctrl+I)',W('*','*','italic')),btn('<s>S</s>','Strikethrough',W('~~','~~','text')),btn('<span style="font-family:monospace">`</span>','Inline code',W('`','`','code')),sep,
   btn('$x$','Inline math',W('$','$','x')),btn('$$','Display math',S('$$\n§\n$$\n')),sep,
   btn('• List','Bullet list',S('- §\n- \n')),btn('1. List','Numbered list',S('1. §\n2. \n')),btn('☑ Tasks','Task list',S('- [ ] §\n- [ ] \n')),sep,
   btn('Insert ▾','Tables, figures, callouts…',(b)=>menuAt(b,[['Table','',S('| Column A | Column B | Column C |\n|:---------|---------:|:--------:|\n| §        |          |          |\n\nTable: Caption.\n')],['Figure','',S('![Caption §](figures/diagram.png){width=70%}\n')],['Callout: note','',S('> [!NOTE] §\n')],['Callout: warning','',S('> [!WARNING] §\n')],['Callout: tip','',S('> [!TIP] §\n')],['Quote','',S('> §\n')],['Code block','',S('```\n§\n```\n')],['Link','',S('[§](https://)')],['Footnote','',S('[^1]\n\n[^1]: §\n')],['Horizontal rule','',S('\n---\n')],['Page break','',S('\n\\newpage\n')],['Table of contents','',S('[TOC]\n')]])),
   btn('Cite ▾','Insert citation',(b)=>{const k=bibKeys();if(!k.length){toast('No BibTeX entries found. Add a .bib file.');return}menuAt(b,k.map(x=>['[@'+x+']','',()=>E()&&snip(E(),'[@'+x+']')]))}),
   btn('Date','Insert today\'s date',()=>E()&&E().insert(new Date().toISOString().slice(0,10)))];
  if(lang==='bib')return[btn('@article','New article entry',S('@article{§key,\n  author  = {},\n  title   = {},\n  journal = {},\n  year    = {},\n}\n')),btn('@book','New book entry',S('@book{§key,\n  author    = {},\n  title     = {},\n  publisher = {},\n  year      = {},\n}\n')),btn('@misc','New misc entry',S('@misc{§key,\n  author = {},\n  title  = {},\n  url    = {},\n  year   = {},\n}\n'))];
  return[]}
function tbar(f){const bar=$('#tbar'),lang=f&&isText(f)?DSEditor.langOf(f.path):'';const items=TB(lang);bar.innerHTML='';bar.style.display=items.length?'flex':'none';
  items.forEach(it=>{if(it.sep){bar.insertAdjacentHTML('beforeend','<span class="vsep"></span>');return}const b=document.createElement('button');b.innerHTML=it.label;b.title=it.title;b.onmousedown=e=>e.preventDefault();b.onclick=()=>it.fn(b);bar.appendChild(b)});
  const sp=document.createElement('span');sp.className='sp';bar.appendChild(sp);
  const mk=(i,t,fn)=>{const b=document.createElement('button');b.innerHTML=ic(i);b.title=t;b.onmousedown=e=>e.preventDefault();b.onclick=fn;bar.appendChild(b)};
  if(lang){mk('search','Find and replace (Ctrl+F)',()=>activeEd()&&activeEd().openFind(true));mk('chd','Fold all',()=>activeEd()&&activeEd().foldAll());mk('chr','Unfold all',()=>activeEd()&&activeEd().unfoldAll())}}

/* ---------- status bar ---------- */
let sbT=0;
function statusBar(ed,c){const sb=$('#sbar');if(!P)return;const f=ed&&fileById(P.active);
  const log=last?last.log:[],ne=log.filter(l=>l.type==='error').length,nw=log.filter(l=>l.type==='warn').length;
  const chips='<span class="clk" id="sbProb" title="Show compile log">'+(ne?'<span class="e">'+ne+' error'+(ne>1?'s':'')+'</span> ':'')+(nw?'<span class="w">'+nw+' warning'+(nw>1?'s':'')+'</span>':'')+(!ne&&!nw?'✓ No problems':'')+'</span>';
  if(!f){sb.innerHTML='<span>'+(P.active&&fileById(P.active)?esc(fileById(P.active).path):'')+'</span><span class="sp"></span>'+chips;$('#sbProb').onclick=toggleProb;return}
  c=c||ed.cursor();const v=ed.getValue();
  sb.innerHTML='<span class="clk" id="sbLn" title="Go to line">Ln '+c.line+', Col '+c.col+(c.sel?' ('+c.sel+' selected)':'')+'</span><span id="sbCnt">'+v.length.toLocaleString()+' characters · '+(v.trim()?v.trim().split(/\s+/).length:0).toLocaleString()+' words</span><span>'+ed.nl+' lines</span><span class="sp"></span>'+chips+'<span>UTF-8</span><span>'+({tex:'LaTeX',md:'Markdown',bib:'BibTeX',txt:'Plain text'}[ed.lang])+'</span><span>Spaces: '+ST.tab+'</span>';
  $('#sbProb').onclick=toggleProb;$('#sbLn').onclick=()=>ask('Go to line','Line number',String(c.line),'Go',v=>{const n=parseInt(v);if(!n)return false;ed.goto(n,1)})}

/* ---------- compile ---------- */
const nf=()=>new Promise(r=>setTimeout(r,30));
function scheduleCompile(force){if(!ST.auto&&!force)return;clearTimeout(cmpT);cmpT=setTimeout(()=>compileNow(false),force?250:ST.delay)}
function runCompile(){P.files.forEach(f=>{if(editors[f.id])f.text=editors[f.id].getValue()});const mf=mainFile();return DSC.compile(P.files,mf?mf.path:null,{cite:ST.cite})}
async function compileNow(manual,initial){if(!P)return;clearTimeout(cmpT);compiling=true;setStatus();$('#cmpbtn').innerHTML='<i class="dot" style="background:none;border:2px solid #fff;border-top-color:transparent;animation:spin .7s linear infinite"></i>Compiling…';$('#cmpbtn').disabled=true;await nf();
  const t0=performance.now();const res=runCompile();const ms=performance.now()-t0;if(manual){const w=300-ms;if(w>0)await new Promise(r=>setTimeout(r,w))}
  if(!P)return;last=res;res.at=Date.now();res.ms=Math.round(ms);renderPreview(res);applyProblems();renderOutline();renderProb();
  compiling=false;setStatus();$('#cmpbtn').disabled=false;btnReset();$('#cmpinfo').innerHTML='Compiled '+fmtTime(res.at)+'<br>'+res.ms+' ms · '+pageCount+' page'+(pageCount>1?'s':'');statusBar(activeEd());if(rawOn)renderRaw()}
function btnReset(){$('#cmpbtn').innerHTML=ic('play')+'Recompile'}
function applyProblems(){if(!last||!P)return;Object.keys(editors).forEach(id=>{const f=fileById(id);if(!f)return;const m={};last.log.forEach(l=>{if(l.file===f.path&&l.line&&(l.type==='error'||m[l.line]!=='error'))m[l.line]=l.type==='info'?undefined:l.type});Object.keys(m).forEach(k=>{if(!m[k])delete m[k]});editors[id].setProblems(m)})}
function renderOutline(){const o=$('#outline');if(!last||!last.outline.length){o.innerHTML='<div class="empty-note">Headings of the main document appear here.</div>';return}
  o.innerHTML=last.outline.map((h,i)=>'<div class="ol" data-i="'+i+'" style="--d:'+Math.max(0,h.level-(last.kind==='tex'?(last.outline.some(x=>x.level===0)?0:1):0))+'" title="'+esc(h.title)+'"><span class="nm">'+esc(h.num||'')+'</span>'+esc(h.title)+'</div>').join('')}
$('#outline').addEventListener('click',e=>{const r=e.target.closest('.ol');if(!r||!last)return;const h=last.outline[+r.dataset.i],f=P.files.find(x=>x.path===h.file);if(f&&h.line){openFile(f.id,h.line);syncPreview(h.file,h.line)}});
function toggleProb(){probOpen=!probOpen;renderProb()}
function renderProb(){const el=$('#prob');el.classList.toggle('open',probOpen);if(!probOpen)return;const log=last?last.log:[];
  el.innerHTML='<div class="ph"><span class="tg">Compile log</span><span class="sp"></span><button id="pClose" title="Close">'+ic('x')+'</button></div>'+(log.length?log.map((l,i)=>'<div class="pr '+l.type+'" data-i="'+i+'">'+ic(l.type==='error'?'errc':l.type==='warn'?'alert':'info')+'<span>'+esc(l.msg)+'</span>'+(l.file?'<span class="loc">'+esc(l.file)+(l.line?':'+l.line:'')+'</span>':'')+'</div>').join(''):'<div class="empty-note">Compiled without problems.</div>');
  $('#pClose').onclick=toggleProb;el.onclick=e=>{const r=e.target.closest('.pr');if(!r)return;const l=log[+r.dataset.i],f=l.file&&P.files.find(x=>x.path===l.file);if(f)openFile(f.id,l.line||1)}}
$('#cmpbtn').onclick=()=>compileNow(true);
$('#swAuto').onclick=()=>{ST.auto=!ST.auto;saveSettings();$('#swAuto').classList.toggle('on',ST.auto);toast(ST.auto?'Auto-compile on':'Auto-compile off')};

/* ---------- preview + pagination ---------- */
function geom(){const d=PAPER[ST.paper]||PAPER.a4,m=Math.round(ST.margin*MM);return{W:d.w,H:d.h,m,cw:d.w-2*m,ch:d.h-2*m}}
function splitPara(p,limit){if(p.querySelector('img')||p.closest('figure'))return null;const lh=parseFloat(getComputedStyle(p).lineHeight)||20,pr=p.getBoundingClientRect();if(limit-pr.top<2*lh||pr.height<4*lh)return null;
  const w=document.createTreeWalker(p,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement.closest('.katex,.anc')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});let n,best=null;const r=document.createRange();
  while((n=w.nextNode())){r.selectNodeContents(n);const rc=r.getBoundingClientRect();if(rc.height===0)continue;if(rc.top>=limit-1)break;
    if(rc.bottom<=limit){best={n,k:n.data.length};continue}
    let lo=0,hi=n.data.length;while(lo<hi){const mid=(lo+hi+1)>>1;r.setStart(n,0);r.setEnd(n,mid);const bb=r.getBoundingClientRect();if(bb.bottom<=limit+0.5)lo=mid;else hi=mid-1}
    let k=lo;const sp=n.data.lastIndexOf(' ',k-1);if(k<n.data.length&&sp>0)k=sp+1;else if(k<n.data.length&&sp<=0&&best)k=0;if(k>0)best={n,k};break}
  if(!best||(best.n===p.firstChild&&best.k<8))return null;
  const a=document.createRange();a.setStart(p,0);a.setEnd(best.n,best.k);const b=document.createRange();b.setStart(best.n,best.k);b.setEnd(p,p.childNodes.length);
  const p1=p.cloneNode(false),p2=p.cloneNode(false);p1.appendChild(a.cloneContents());p2.appendChild(b.cloneContents());if(!p1.textContent.trim()||!p2.textContent.trim())return null;p2.classList.add('cont');p1.style.textAlignLast='justify';p.replaceWith(p1,p2);return p1}
function splitList(l,limit){const lis=[...l.children];let idx=lis.findIndex(li=>li.getBoundingClientRect().bottom>limit);if(idx<=0)return null;
  const a=l.cloneNode(false),b=l.cloneNode(false);lis.slice(0,idx).forEach(x=>a.appendChild(x));lis.slice(idx).forEach(x=>b.appendChild(x));if(l.tagName==='OL')b.start=(l.start||1)+idx;l.replaceWith(a,b);return a}
function paginate(html){const g=geom(),meas=$('#measure');meas.style.width=g.cw+'px';meas.className='paper-text'+(ST.font==='sans'?' sans':'');meas.style.setProperty('--ds-fs',(ST.fs*4/3)+'px');meas.innerHTML=html;
  const kids=meas.children;let i=0,start=null,cur=[],pages=[cur],guard=0;
  while(i<kids.length&&guard++<6000){const el=kids[i],t0=meas.getBoundingClientRect().top;
    if(el.classList.contains('pgbrk')){if(cur.length){pages.push(cur=[]);start=null}i++;continue}
    const r=el.getBoundingClientRect(),y=r.top-t0,b=r.bottom-t0;if(start===null)start=y;
    if(b-start<=g.ch+0.5){cur.push(el);i++;continue}
    const limit=t0+start+g.ch;
    if(el.tagName==='P'){const p1=splitPara(el,limit);if(p1){cur.push(p1);pages.push(cur=[]);start=null;i++;continue}}
    if((el.tagName==='UL'||el.tagName==='OL')){const l1=splitList(el,limit);if(l1){cur.push(l1);pages.push(cur=[]);start=null;i++;continue}}
    if(cur.length){const carry=[];while(cur.length>1&&/^H[2-6]$/.test(cur[cur.length-1].tagName))carry.unshift(cur.pop());pages.push(cur=carry);start=carry.length?carry[0].getBoundingClientRect().top-t0:null;
      if(carry.length===0&&start===null){}continue}
    cur.push(el);i++;pages.push(cur=[]);start=null}
  pages=pages.filter(p=>p.length);if(!pages.length)pages=[[]];
  const root=document.createDocumentFragment();
  pages.forEach((list,n)=>{const pg=document.createElement('div');pg.className='page';pg.dataset.n=n+1;pg.style.width=g.W+'px';pg.style.minHeight=g.H+'px';
    const body=document.createElement('div');body.className='page-body paper-text'+(ST.font==='sans'?' sans':'');body.style.cssText='left:'+g.m+'px;top:'+g.m+'px;width:'+g.cw+'px;--ds-fs:'+(ST.fs*4/3)+'px';list.forEach(el=>body.appendChild(el));
    const num=document.createElement('div');num.className='page-num';num.style.bottom=Math.max(10,g.m*.38)+'px';num.textContent=n+1;pg.append(body,num);root.appendChild(pg)});
  meas.innerHTML='';return{frag:root,n:pages.length}}
function renderPreview(res){const pvs=$('#pvs'),st=pvs.scrollTop,out=paginate(res.html);pageCount=out.n;const pages=$('#pages');pages.innerHTML='';pages.appendChild(out.frag);
  $$('#pages .toc a[data-target]').forEach(a=>{const t=document.getElementById(a.dataset.target),pg=t&&t.closest('.page');a.querySelector('.pg').textContent=pg?pg.dataset.n:''});
  applyZoom();pvs.scrollTop=st;updatePageLab()}
function applyZoom(){const g=geom(),pvs=$('#pvs');if(zoomMode==='fit')scale=Math.max(.25,Math.min(3,(pvs.clientWidth-48)/g.W));else scale=zoomMode;$('#pages').style.zoom=scale;$('#zlab').textContent=zoomMode==='fit'?'Fit':Math.round(scale*100)+'%'}
function setZoom(z){zoomMode=z;ST.zoom=z;saveSettings();const pvs=$('#pvs'),k=pvs.scrollTop/(pvs.scrollHeight||1);applyZoom();pvs.scrollTop=k*pvs.scrollHeight}
$('#zIn').onclick=()=>setZoom(Math.min(3,Math.round((scale+.1)*10)/10));$('#zOut').onclick=()=>setZoom(Math.max(.25,Math.round((scale-.1)*10)/10));$('#zFit').onclick=()=>setZoom('fit');$('#zlab').onclick=()=>setZoom(1);
$('#pvs').addEventListener('wheel',e=>{if(e.ctrlKey||e.metaKey){e.preventDefault();setZoom(Math.max(.25,Math.min(3,Math.round((scale*(e.deltaY<0?1.08:.92))*100)/100)))}},{passive:false});
function pageRects(){const r0=$('#pvs').getBoundingClientRect();return $$('#pages .page').map(p=>{const r=p.getBoundingClientRect();return{top:r.top-r0.top,bottom:r.bottom-r0.top,el:p}})}
function curPage(){const R=pageRects(),h=$('#pvs').clientHeight;let best=0;R.forEach((r,i)=>{if(r.top<h*.4)best=i});return best}
function updatePageLab(){$('#pgLab').textContent='Page '+(curPage()+1)+' of '+pageCount}
function goPage(n){const R=$$('#pages .page');n=Math.max(0,Math.min(R.length-1,n));const pvs=$('#pvs');pvs.scrollTo({top:pvs.scrollTop+R[n].getBoundingClientRect().top-pvs.getBoundingClientRect().top-16,behavior:'smooth'})}
$('#pvs').addEventListener('scroll',updatePageLab);$('#pPrev').onclick=()=>goPage(curPage()-1);$('#pNext').onclick=()=>goPage(curPage()+1);
window.addEventListener('resize',()=>{if(P&&zoomMode==='fit')applyZoom()});
function flashEl(el){el.classList.remove('flashp');void el.offsetWidth;el.classList.add('flashp')}
function syncPreview(path,line,onlyIfHidden){const els=$$('#pages [data-l]').filter(e=>e.dataset.f===path&&+e.dataset.l<=line);if(!els.length)return;let el=els[0];els.forEach(e=>{if(+e.dataset.l>=+el.dataset.l)el=e});
  const pvs=$('#pvs'),pr=pvs.getBoundingClientRect(),r=el.getBoundingClientRect();if(onlyIfHidden&&r.top>pr.top+20&&r.bottom<pr.bottom-20)return;pvs.scrollTo({top:pvs.scrollTop+r.top-pr.top-pr.height*.3,behavior:onlyIfHidden?'auto':'smooth'});if(!onlyIfHidden)flashEl(el)}
let fcT=0;function followCursor(f,c){if(!ST.follow||!c||$('#body').classList.contains('v-code'))return;clearTimeout(fcT);fcT=setTimeout(()=>{if(document.activeElement&&document.activeElement.tagName==='TEXTAREA')syncPreview(f.path,c.line,true)},160)}
$('#bSync').onclick=()=>{const ed=activeEd(),f=P.active&&fileById(P.active);if(ed&&f)syncPreview(f.path,ed.cursor().line)};
$('#pages').addEventListener('click',e=>{const a=e.target.closest('a[href^="#"]');if(a){e.preventDefault();const t=document.getElementById(decodeURIComponent(a.getAttribute('href').slice(1)));if(t){const pvs=$('#pvs');pvs.scrollTo({top:pvs.scrollTop+t.getBoundingClientRect().top-pvs.getBoundingClientRect().top-pvs.clientHeight*.3,behavior:'smooth'});flashEl(t.closest('li,p,figure,h1,h2,h3,h4,div')||t)}return}
  if(e.target.closest('a'))return;const el=e.target.closest('[data-l]');if(!el||getSelection().toString())return;const f=P.files.find(x=>x.path===el.dataset.f);if(!f)return;
  if($('#body').classList.contains('v-prev'))setView('split');openFile(f.id,+el.dataset.l);flashEl(el)});

/* raw view */
function rawText(html){const d=DSX.tmp(html);d.querySelectorAll('.katex-display,.katex').forEach(m=>{if(!m.isConnected)return;const disp=m.classList.contains('katex-display'),k=m.classList.contains('katex')?m:m.querySelector('.katex'),t=document.createTextNode((disp?'$$ ':'$')+(k&&k.dataset.tex!=null?k.dataset.tex:m.textContent)+(disp?' $$':'$'));m.replaceWith(t)});
  let h=d.innerHTML.replace(/ data-[fl]="[^"]*"/g,'').replace(/<a class="anc"[^>]*><\/a>/g,'');return h.replace(/<(\/?)(p|div|h[1-6]|ul|ol|li|table|tr|figure|figcaption|section|header|blockquote|pre|nav|dl|dt|dd|tbody|thead)\b/g,(m,s,t)=>(s?'':'\n')+m).replace(/^\n/,'')}
function renderRaw(){$('#raw').innerHTML=esc(rawText(last?last.html:'')).replace(/(&lt;\/?[a-z][^&]*?&gt;)/gi,'<span class="hk">$1</span>')}
$('#bRaw').onclick=()=>{rawOn=!rawOn;$('#bRaw').classList.toggle('on',rawOn);$('#raw').classList.toggle('hide',!rawOn);$('#pvs').classList.toggle('hide',rawOn);if(rawOn)renderRaw()};

/* ---------- layout, splitters ---------- */
function setView(v){ST.view=v;saveSettings();applyView()}
function applyView(){const b=$('#body');b.classList.remove('v-code','v-split','v-prev');b.classList.add('v-'+ST.view);b.classList.toggle('noex',!ST.explorer);b.style.setProperty('--ex-w',ST.exw+'px');if(ST.edw)b.style.setProperty('--ed-w',ST.edw+'px');else b.style.removeProperty('--ed-w');
  $$('#layout button').forEach(x=>x.classList.toggle('on',x.dataset.v===ST.view));$('#bSide').classList.toggle('on',ST.explorer);setTimeout(()=>{if(zoomMode==='fit')applyZoom();const e=activeEd();if(e&&e.el.offsetParent)e.render()},20)}
$$('#layout button').forEach(b=>b.onclick=()=>setView(b.dataset.v));$('#bSide').onclick=()=>{ST.explorer=!ST.explorer;saveSettings();applyView()};
function drag(el,fn){el.addEventListener('mousedown',e=>{e.preventDefault();el.classList.add('drag');document.body.style.cursor='col-resize';document.body.style.userSelect='none';const mv=ev=>fn(ev),up=()=>{removeEventListener('mousemove',mv);removeEventListener('mouseup',up);el.classList.remove('drag');document.body.style.cursor='';document.body.style.userSelect='';saveSettings();applyView()};addEventListener('mousemove',mv);addEventListener('mouseup',up)})}
drag($('#spl1'),ev=>{ST.exw=Math.max(150,Math.min(480,ev.clientX));$('#body').style.setProperty('--ex-w',ST.exw+'px')});
drag($('#spl2'),ev=>{const ex=ST.explorer?ST.exw+5:0,tot=innerWidth-ex-5;ST.edw=Math.max(300,Math.min(tot-300,ev.clientX-ex));$('#body').style.setProperty('--ed-w',ST.edw+'px')});
$('#spl2').addEventListener('dblclick',()=>{ST.edw=null;saveSettings();applyView()});

/* ---------- settings ---------- */
function settingsDlg(){const sel=(k,opts)=>'<select data-k="'+k+'">'+opts.map(o=>'<option value="'+o[0]+'"'+(String(ST[k])===String(o[0])?' selected':'')+'>'+o[1]+'</option>').join('')+'</select>',num=(k,min,max,st)=>'<input type="number" data-k="'+k+'" min="'+min+'" max="'+max+'" step="'+(st||1)+'" value="'+ST[k]+'">',chk=k=>'<span class="sw'+(ST[k]?' on':'')+'" data-sw="'+k+'"></span>';
  modal({title:'Settings',wide:1,body:'<div class="sgrp">Appearance</div><div class="row2"><label>Theme</label>'+sel('theme',[['auto','Match system'],['light','Light'],['dark','Dark']])+'</div>'
   +'<div class="sgrp">Editor</div><div class="row2"><label>Font size (px)</label>'+num('size',10,24)+'</div><div class="row2"><label>Tab width</label>'+sel('tab',[[2,'2 spaces'],[4,'4 spaces']])+'</div><div class="row2"><label>Word wrap</label>'+chk('wrap')+'</div><div class="row2"><label>Line numbers</label>'+chk('lineNumbers')+'</div><div class="row2"><label>Highlight current line</label>'+chk('curLine')+'</div><div class="row2"><label>Preview follows the cursor</label>'+chk('follow')+'</div>'
   +'<div class="sgrp">Compilation</div><div class="row2"><label>Auto-compile</label>'+chk('auto')+'</div><div class="row2"><label>Auto-compile delay (ms)</label>'+num('delay',200,5000,100)+'</div><div class="row2"><label>Citation style</label>'+sel('cite',[['numeric','Numeric [1]'],['authoryear','Author–year (Smith, 2020)']])+'</div>'
   +'<div class="sgrp">Page</div><div class="row2"><label>Paper size</label>'+sel('paper',[['a4','A4 (210 × 297 mm)'],['letter','US Letter']])+'</div><div class="row2"><label>Margins (mm)</label>'+num('margin',10,45)+'</div><div class="row2"><label>Font</label>'+sel('font',[['serif','Serif (book style)'],['sans','Sans-serif']])+'</div><div class="row2"><label>Font size (pt)</label>'+num('fs',9,14,.5)+'</div>',
   buttons:[{label:'Done',cls:'p'}],mount:w=>{const apply=()=>{saveSettings();applyTheme();$('#swAuto').classList.toggle('on',ST.auto);Object.values(editors).forEach(e=>e.setOptions({wrap:ST.wrap,size:ST.size,tab:ST.tab,lineNumbers:ST.lineNumbers,curLine:ST.curLine}));if(P)compileNow(false)};
    w.addEventListener('change',e=>{const k=e.target.dataset.k;if(!k)return;ST[k]=e.target.type==='number'?parseFloat(e.target.value)||ST[k]:(/^(tab)$/.test(k)?+e.target.value:e.target.value);apply()});
    w.addEventListener('click',e=>{const s=e.target.closest('[data-sw]');if(!s)return;ST[s.dataset.sw]=!ST[s.dataset.sw];s.classList.toggle('on',ST[s.dataset.sw]);apply()})}})}
$('#bSet').onclick=settingsDlg;

/* ---------- export ---------- */
function ensureFresh(){if(!P)return null;const res=runCompile();last=res;return res}
function exName(ext){return(P.name||'document').replace(/[^\w.-]+/g,'_')+'.'+ext}
function printPdf(){const res=ensureFresh();renderPreview(res);const g=geom(),root=$('#printroot'),mm=u=>(u/MM).toFixed(1)+'mm';root.innerHTML='';const clone=$('#pages').cloneNode(true);clone.style.zoom='1';clone.style.width='auto';root.appendChild(clone);
  let st=$('#pgsize');if(!st){st=document.createElement('style');st.id='pgsize';document.head.appendChild(st)}st.textContent='@page{size:'+mm(g.W)+' '+mm(g.H)+';margin:0}';
  document.body.classList.add('printing');toast('Choose “Save as PDF” as the destination in the print dialog.',4200);setTimeout(()=>{const done=()=>{document.body.classList.remove('printing');root.innerHTML='';removeEventListener('afterprint',done)};addEventListener('afterprint',done);window.print()},60)}
async function exportAs(kind){const res=ensureFresh();renderPreview(res);const html=res.html,title=res.title||P.name,mf=mainFile();
  try{switch(kind){
    case'pdf':printPdf();break;
    case'docx':DSX.download(exName('docx'),await DSX.toDocx(DSX.tmp(html),title));break;
    case'html':DSX.download(exName('html'),await DSX.toHtml(html,title),'text/html');break;
    case'epub':DSX.download(exName('epub'),await DSX.toEpub(html,title,''));break;
    case'md':DSX.download(exName('md'),DSX.toMarkdown(DSX.tmp(html)),'text/markdown');break;
    case'txt':DSX.download(exName('txt'),DSX.toText(DSX.tmp(html)),'text/plain');break;
    case'src':if(mf)dlFile(mf);break;
    case'bib':{const b=P.files.filter(f=>/\.bib$/i.test(f.path));if(!b.length){toast('No .bib file in this project');break}DSX.download(baseName(b[0].path),b.map(f=>f.text).join('\n'),'text/plain');break}
    case'zip':saveNow();DSX.download(exName('zip'),DSX.projectZip(P.files));break;
    case'json':saveNow();backup();break}
    if(kind!=='pdf')toast('Exported '+kind.toUpperCase())}catch(e){console.error(e);toast('Export failed: '+e.message,5000)}}
$('#bPdf').onclick=()=>exportAs('pdf');
$('#bExp').onclick=e=>menuAt(e.currentTarget,[['PDF document','print dialog',()=>exportAs('pdf'),null,'printer'],['Word document (.docx)','',()=>exportAs('docx'),null,'file'],['Web page (.html)','standalone',()=>exportAs('html'),null,'code'],['EPUB e-book (.epub)','',()=>exportAs('epub'),null,'book'],['Markdown (.md)','',()=>exportAs('md'),null,'filetext'],['Plain text (.txt)','',()=>exportAs('txt'),null,'filetext'],['—'],['Source file','main document',()=>exportAs('src'),null,'download'],['Bibliography (.bib)','',()=>exportAs('bib'),null,'book'],['Project archive (.zip)','all files',()=>exportAs('zip'),null,'download'],['Project backup (.json)','re-importable',()=>exportAs('json'),null,'download']]);

/* ---------- misc wiring ---------- */
$('#pname').addEventListener('input',e=>{P.name=e.target.value;document.title=(P.name||'Untitled')+' · DocScale';markDirty()});
$('#bBack').onclick=()=>{location.hash='#/'};
document.addEventListener('keydown',e=>{if(!P||$('#app').classList.contains('hide'))return;const mod=e.metaKey||e.ctrlKey;
  if(mod&&e.key==='Enter'){e.preventDefault();compileNow(true)}
  else if(mod&&e.key.toLowerCase()==='s'){e.preventDefault();saveNow();toast('Saved')}
  else if(mod&&e.key.toLowerCase()==='j'){e.preventDefault();$('#bSync').click()}
  else if(mod&&e.key==='\\'){e.preventDefault();setView(ST.view==='split'?'code':ST.view==='code'?'prev':'split')}
  else if(e.key==='F2'&&document.activeElement.tagName!=='TEXTAREA'&&P.active){const f=fileById(P.active);if(f)renameDlg(f)}});
window.addEventListener('beforeunload',()=>{if(P&&unsaved)saveNow()});
function icons(){const m={bBack:'back',bSide:'sidebar',bPdf:'printer',bExp:'download',bRaw:'code',bSet:'settings',zOut:'zout',zIn:'zin',zFit:'fit',pPrev:'chl',pNext:'chr',bSync:'target'};Object.keys(m).forEach(k=>{$('#'+k).innerHTML=ic(m[k])+(k==='bPdf'?'<span class="hide-sm">PDF</span>':k==='bExp'?'<span class="hide-sm">Export</span>':k==='zFit'?'Fit':k==='bSync'?'<span class="hide-sm">Sync</span>':'')});
  $$('#layout button').forEach(b=>b.innerHTML=ic({code:'code',split:'split',prev:'eye'}[b.dataset.v]));btnReset();$('#swAuto').classList.toggle('on',ST.auto);$('#bBack').insertAdjacentHTML('beforeend','')}
icons();
function route(){const m=/^#\/p\/(\w+)/.exec(location.hash);if(m&&IDX.some(x=>x.id===m[1]))openProject(m[1]);else showDash()}
window.addEventListener('hashchange',route);
if(!LS.get('ds.init',0)){newProj('notebook');newProj('paper');LS.set('ds.init',1);IDX=LS.get('ds.index',[])}
route();
window.DS={get project(){return P},get settings(){return ST},compileNow,exportAs,setView};
})();
