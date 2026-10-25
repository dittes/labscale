'use strict';
// Report export with a format prompt: PDF (vector graphs), HTML, Word, Markdown, plain text, print.
const REPORT_CSS='body{font:14px system-ui;max-width:960px;margin:24px auto;color:#111}table{border-collapse:collapse;margin:6px 0}th,td{border:1px solid #ccc;padding:2px 9px;text-align:right}th:first-child,td:first-child{text-align:left}.eq{font-family:monospace;background:#f3f4f6;padding:4px 8px}.rc{border-bottom:1px solid #ddd;padding:10px 0}h4{color:#666;text-transform:uppercase;font-size:12px}.note{color:#667}hr.pb{border:0;page-break-after:always}figure{margin:12px 0}figcaption{color:#667;font-size:12px}img{max-width:100%}';
const REPORT_FORMATS=[['pdf','PDF document (.pdf)'],['html','Web page (.html)'],['doc','Word-compatible (.doc)'],['md','Markdown (.md)'],['txt','Plain text (.txt)'],['print','Print…']];
function reportExport(name,getBody){const safe=String(name||'report').replace(/[\\/:*?"<>|]+/g,'_');let last='pdf';try{last=localStorage.getItem('la_report_fmt')||'pdf'}catch(e){}
  dialog({title:'Export report',ok:'Export',hint:'Choose the output format. PDF keeps graphs as vector drawings.',sheet:{cols:[]},fields:[{t:'sel',k:'f',label:'Format',def:last,opts:REPORT_FORMATS}],onOk:a=>{try{localStorage.setItem('la_report_fmt',a.f)}catch(e){}
    try{const html=getBody();
      if(a.f==='pdf')download(safe+'.pdf',htmlToPDF(html,safe));
      else if(a.f==='html')download(safe+'.html',new Blob([`<!doctype html><meta charset=utf-8><title>${esc(name)}</title><style>${REPORT_CSS}</style>${html}`],{type:'text/html'}));
      else if(a.f==='doc')download(safe+'.doc',new Blob([`<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${esc(name)}</title><style>${REPORT_CSS}</style></head><body>${html}</body></html>`],{type:'application/msword'}));
      else if(a.f==='md')download(safe+'.md',new Blob([htmlToText(html,true)],{type:'text/markdown'}));
      else if(a.f==='txt')download(safe+'.txt',new Blob([htmlToText(html,false)],{type:'text/plain'}));
      else printHTML(html);
    }catch(e){alert('Report export failed: '+e.message)}}})}
function htmlToText(html,md){const d=document.createElement('div');d.innerHTML=html;d.querySelectorAll('img').forEach(i=>i.replaceWith(document.createTextNode(`[graph: ${i.alt||'image'}]`)));let out=[];
  const tx=e=>e.textContent.replace(/\s+/g,' ').trim();
  const walk=e=>{for(const n of e.childNodes){if(n.nodeType===3){const t=n.textContent.replace(/\s+/g,' ').trim();if(t)out.push(t);continue}if(n.nodeType!==1)continue;const t=n.tagName;
    if(/^H[1-6]$/.test(t))out.push('',(md?'#'.repeat(+t[1])+' ':'')+tx(n),'');
    else if(t==='TABLE'){const rows=[...n.rows].map(r=>[...r.cells].map(c=>tx(c)));if(md){out.push('');rows.forEach((r,i)=>{out.push('| '+r.join(' | ')+' |');if(i===0)out.push('|'+r.map(()=>'---').join('|')+'|')});out.push('')}else{const w=rows[0]?rows[0].map((_,j)=>Math.max(...rows.map(r=>(r[j]||'').length))):[];out.push('');rows.forEach(r=>out.push(r.map((c,j)=>c.padEnd(w[j])).join('  ')));out.push('')}}
    else if(/^(P|DIV|FIGURE|FIGCAPTION|LI|PRE)$/.test(t)){if(n.querySelector('table,h1,h2,h3,h4,p,div,figure'))walk(n);else{const s=tx(n);if(s)out.push((t==='LI'?'- ':'')+s)}}
    else walk(n)}};walk(d);return out.join('\n').replace(/\n{3,}/g,'\n\n').trim()+'\n'}
function htmlToPDF(html,title){const d=document.createElement('div');d.innerHTML=html;const PW=523,PH=759,items=[];
  const san=s=>String(s).replace(/\s+/g,' ').trim(),tx=e=>san(e.textContent);
  const walk=e=>{for(const n of e.childNodes){if(n.nodeType===3){const t=san(n.textContent);if(t)items.push({k:'p',t,sz:10});continue}if(n.nodeType!==1)continue;const t=n.tagName;
    if(/^H[1-6]$/.test(t))items.push({k:'p',t:tx(n),sz:{H1:20,H2:15,H3:12.5,H4:10.5,H5:10,H6:10}[t],b:true,gap:6});
    else if(t==='TABLE')items.push({k:'t',rows:[...n.rows].map(r=>[...r.cells].map(c=>tx(c)))});
    else if(t==='IMG'){const g=P.graphs.find(g=>g.name===n.alt);if(g)items.push({k:'g',g})}
    else if(t==='PRE'||n.classList.contains('eq'))items.push({k:'p',t:tx(n),sz:9,mono:true});
    else if(t==='FIGCAPTION')items.push({k:'p',t:tx(n),sz:8.5,gray:true});
    else if(/^(P|LI|SMALL)$/.test(t)&&!n.querySelector('table,img')){const s=tx(n);if(s)items.push({k:'p',t:(t==='LI'?'• ':'')+s,sz:10})}
    else if(t==='HR')items.push({k:n.classList.contains('pb')?'pb':'hr'});
    else walk(n)}};walk(d);
  const mc=new PDFDoc(),probe=new PDFCtx(mc),W=(s,sz,b,mono)=>{probe.font=`${b?'bold ':''}${sz}px ${mono?'Courier':'Helvetica'}`;return probe.measureText(s).width};
  const wrap=(s,sz,b,mono,w)=>{const out=[];let line='';for(const wd of s.split(' ')){let t=line?line+' '+wd:wd;if(W(t,sz,b,mono)<=w||!line)line=t;else{out.push(line);line=wd}}if(line)out.push(line);return out};
  const pages=[[]];let y=0;const place=(h,draw)=>{if(y+h>PH&&y>0){pages.push([]);y=0}pages[pages.length-1].push({y,draw});y+=h};
  items.forEach(it=>{
    if(it.k==='p'){const lh=it.sz*1.3,ls=wrap(it.t,it.sz,it.b,it.mono,PW);y+=it.gap||0;ls.forEach(l=>place(lh,(c,yy)=>{c.font=`${it.b?'bold ':''}${it.sz}px ${it.mono?'Courier':'Helvetica'}`;c.fillStyle=it.gray?'#666':'#111';c.textBaseline='alphabetic';c.fillText(l,0,yy+it.sz)}));y+=3}
    else if(it.k==='pb'){if(y>0){pages.push([]);y=0}}
    else if(it.k==='hr')place(8,(c,yy)=>{c.strokeStyle='#bbb';c.lineWidth=.5;c.beginPath();c.moveTo(0,yy+4);c.lineTo(PW,yy+4);c.stroke()});
    else if(it.k==='g'){const[gw,gh]=graphSize(it.g),h=Math.min(PH-10,PW*gh/gw),w=h*gw/gh;place(h+8,(c,yy)=>{c.save();c.translate((PW-w)/2,yy);c.scale(w/gw,h/gh);drawGraphTo(c,it.g,gw,gh,LIGHT,true);c.restore()})}
    else if(it.k==='t'&&it.rows.length){const sz=8,nc=Math.max(...it.rows.map(r=>r.length)),cw=Array.from({length:nc},(_,j)=>Math.max(...it.rows.map(r=>W(r[j]||'',sz,false)))+8),tot=cw.reduce((a,b)=>a+b,0),f=tot>PW?PW/tot:1,cws=cw.map(x=>x*f);
      it.rows.forEach((r,ri)=>place(sz*1.6,(c,yy)=>{let x=0;r.forEach((cell,j)=>{c.font=`${ri===0?'bold ':''}${sz}px Helvetica`;c.fillStyle='#111';let s=cell;while(s.length>1&&W(s,sz,ri===0)>cws[j]-4)s=s.slice(0,-1);c.textAlign=j===0?'left':'right';c.fillText(s,j===0?x+3:x+cws[j]-3,yy+sz*1.15);x+=cws[j]});c.textAlign='left';c.strokeStyle='#ccc';c.lineWidth=.4;c.beginPath();c.moveTo(0,yy+sz*1.6);c.lineTo(Math.min(PW,tot),yy+sz*1.6);c.stroke()}));y+=6}});
  const doc=new PDFDoc(),stamp=new Date().toLocaleString();
  pages.forEach((pg,i)=>doc.addPage(PW,PH,c=>{pg.forEach(o=>{c.save();o.draw(c,o.y);c.restore()})},{pw:595.28,ph:841.89,margin:36,footer:`${title} · ${stamp} · page ${i+1} of ${pages.length}`}));return doc.build()}
