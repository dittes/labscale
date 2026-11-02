/* DocScale code editor: textarea + syntax layer, line numbers, folding, bracket matching, find/replace */
(function(){
'use strict';
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function LB(){const lines=[''];return{lines,emit(cls,s){if(!s)return;s.split('\n').forEach((p,i)=>{if(i>0)lines.push('');if(p)lines[lines.length-1]+=cls?'<span class="'+cls+'">'+esc(p)+'</span>':esc(p)})}}}
const RXT=/(%[^\n]*)|(\\(?:begin|end)\s*\{[^}\n]*\})|(\\(?:part|chapter|section|subsection|subsubsection|paragraph)\*?)(\{[^}\n]*\})?|(\\[a-zA-Z@]+\*?|\\[^a-zA-Z])|(\$\$[\s\S]*?\$\$|\$(?:\\.|[^$\\\n])+\$)|([{}\[\]&])/g;
function hlTex(text){const b=LB();let last=0,m;RXT.lastIndex=0;
  while((m=RXT.exec(text))){b.emit('',text.slice(last,m.index));last=RXT.lastIndex;
    if(m[1])b.emit('hc',m[1]);
    else if(m[2]){const q=/^(\\(?:begin|end))(\s*)(\{[^}]*\})/.exec(m[2]);b.emit('hk',q[1]);b.emit('',q[2]);b.emit('he',q[3])}
    else if(m[3]){b.emit('hs',m[3]);if(m[4])b.emit('ht',m[4])}
    else if(m[5])b.emit('hk',m[5]);
    else if(m[6])m[6].split(/(\\[a-zA-Z]+)/).forEach((x,i)=>b.emit(i%2?'hmk':'hm',x));
    else b.emit('hb',m[7])}
  b.emit('',text.slice(last));return b.lines}
function inlMd(s){return esc(s).replace(/(`[^`]*`)|(\$[^$\n]+\$)|(\*\*[^*\n]+\*\*)|(\[@[^\]]+\])|(!?\[[^\]\n]*\]\([^)\n]*\))|(\*[^*\n\s][^*\n]*\*)/g,(m,a,b,c,d,e,f)=>'<span class="'+(a?'hcode':b?'hm':c?'hbold':d?'hcite':e?'hlink':'hital')+'">'+m+'</span>')}
function hlMd(text){const L=text.split('\n'),out=[];let fence=false,math=false,fm=L[0]==='---';
  L.forEach((l,i)=>{let h;
    if(fm){h='<span class="hc">'+esc(l)+'</span>';if(i>0&&l==='---')fm=false}
    else if(fence){h='<span class="hcode">'+esc(l)+'</span>';if(/^\s*(```|~~~)/.test(l))fence=false}
    else if(/^\s*(```|~~~)/.test(l)){fence=true;h='<span class="hcode">'+esc(l)+'</span>'}
    else if(math){h='<span class="hm">'+esc(l)+'</span>';if(/\$\$\s*$/.test(l))math=false}
    else if(/^\s*\$\$/.test(l)){h='<span class="hm">'+esc(l)+'</span>';if(!/^\s*\$\$.+\$\$\s*$/.test(l))math=true}
    else if(/^#{1,6}\s/.test(l)){const m=/^(#+)(.*)$/.exec(l);h='<span class="hk">'+m[1]+'</span><span class="ht">'+esc(m[2])+'</span>'}
    else if(/^\s*>/.test(l)){const m=/^(\s*>+)(.*)$/.exec(l);h='<span class="hk">'+esc(m[1])+'</span>'+inlMd(m[2])}
    else if(/^\s*([-*+]|\d+[.)])\s/.test(l)){const m=/^(\s*(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?)(.*)$/.exec(l);h='<span class="hk">'+esc(m[1])+'</span>'+inlMd(m[2])}
    else if(/^\s*\|/.test(l))h=esc(l).replace(/\|/g,'<span class="hk">|</span>');
    else if(/^\s*(-{3,}|\*{3,})\s*$/.test(l))h='<span class="hk">'+esc(l)+'</span>';
    else h=inlMd(l);
    out.push(h)});return out}
function hlBib(text){const b=LB(),RX=/(@\w+)(\s*\{)([^,\n]*)|(^|\n)(\s*)([\w-]+)(\s*=)|([{}])/g;let last=0,m;
  while((m=RX.exec(text))){b.emit('',text.slice(last,m.index));last=RX.lastIndex;
    if(m[1]){b.emit('hs',m[1]);b.emit('',m[2]);b.emit('he',m[3])}else if(m[6]){b.emit('',m[4]+m[5]);b.emit('hk',m[6]);b.emit('',m[7])}else b.emit('hb',m[8])}
  b.emit('',text.slice(last));return b.lines}
const hlTxt=t=>t.split('\n').map(esc);
const HL={tex:hlTex,md:hlMd,bib:hlBib,txt:hlTxt};
function langOf(path){const e=(path.split('.').pop()||'').toLowerCase();return{tex:'tex',sty:'tex',cls:'tex',md:'md',markdown:'md',bib:'bib'}[e]||'txt'}

function regionsOf(lines,lang){const R={};
  const put=(s,e)=>{while(e>s&&!lines[e].trim())e--;if(e>s&&!(s in R))R[s]=e};
  if(lang==='tex'){const stack=[],head=[];
    lines.forEach((l,i)=>{let m;if((m=/^\s*\\(part|chapter|section|subsection|subsubsection)\*?\b/.exec(l)))head.push([i,['part','chapter','section','subsection','subsubsection'].indexOf(m[1])]);
      if((m=/\\begin\{([^}]*)\}/.exec(l))&&!/\\end\{/.test(l))stack.push([i,m[1]]);
      else if((m=/\\end\{([^}]*)\}/.exec(l))){for(let k=stack.length-1;k>=0;k--)if(stack[k][1]===m[1]){const s=stack[k][0];stack.length=k;if(m[1]!=='document')put(s,i-1);break}}});
    head.forEach(([i,lv],k)=>{let e=lines.length-1;for(let q=k+1;q<head.length;q++)if(head[q][1]<=lv){e=head[q][0]-1;break}
      for(let q=i+1;q<=e;q++)if(/\\end\{document\}/.test(lines[q])){e=q-1;break}put(i,e)})}
  else if(lang==='md'){const head=[];let fence=-1,math=-1;
    lines.forEach((l,i)=>{if(/^\s*(```|~~~)/.test(l)){if(fence<0)fence=i;else{put(fence,i);fence=-1}return}if(fence>=0)return;
      if(/^\s*\$\$\s*$/.test(l)){if(math<0)math=i;else{put(math,i);math=-1}return}
      const m=/^(#{1,6})\s/.exec(l);if(m)head.push([i,m[1].length])});
    head.forEach(([i,lv],k)=>{let e=lines.length-1;for(let q=k+1;q<head.length;q++)if(head[q][1]<=lv){e=head[q][0]-1;break}put(i,e)})}
  else if(lang==='bib'){let d=0,s=-1;lines.forEach((l,i)=>{for(const ch of l){if(ch==='{'){if(d===0)s=i;d++}else if(ch==='}'){d--;if(d===0&&s>=0){put(s,i);s=-1}}}})}
  return R}

const PAIRS={'{':'}','(':')','[':']'},CLOSE={'}':'{',')':'(',']':'['};

function Editor(host,o){
  this.o=Object.assign({lang:'txt',wrap:true,size:13,tab:2,lineNumbers:true,onChange(){},onCursor(){},onSave(){}},o);
  this.full='';this.folded=new Set();this.vis=[];this.regions={};this.problems={};this.marks=[];this.fq=null;this.lang=this.o.lang;
  const el=this.el=document.createElement('div');el.className='ed';
  el.innerHTML='<div class="ed-scroll"><div class="ed-gut"></div><div class="ed-main"><div class="ed-cur"></div><div class="ed-mark"></div><div class="ed-hl"></div><div class="ed-hl ed-cm"></div><textarea spellcheck="false" autocomplete="off" autocapitalize="off" wrap="off"></textarea></div></div>';
  host.appendChild(el);
  const q=s=>el.querySelector(s);this.sc=q('.ed-scroll');this.gut=q('.ed-gut');this.main=q('.ed-main');this.cur=q('.ed-cur');this.mk=q('.ed-mark');this.hl=q('.ed-hl');this.cm=q('.ed-cm');this.ta=q('textarea');
  this.applyOpts();this.bind()}
const P=Editor.prototype;
P.applyOpts=function(){const o=this.o;this.el.classList.toggle('wrap',!!o.wrap);this.el.classList.toggle('nogut',!o.lineNumbers);this.el.style.setProperty('--ed-size',o.size+'px');this.ta.style.tabSize=this.hl.style.tabSize=o.tab;this.fit()};
P.setOptions=function(x){Object.assign(this.o,x);this.applyOpts();this.render()};
P.getValue=function(){return this.full};
P.setValue=function(t){this.full=t;this.folded.clear();this.ta.value=t;this.render()};
P.setLang=function(l){this.lang=l;this.render()};
P.focus=function(){this.ta.focus({preventScroll:true})};
P.bind=function(){const ta=this.ta,self=this;
  ta.addEventListener('beforeinput',()=>{if(self.folded.size)self.unfoldAll(true)});
  ta.addEventListener('input',()=>{self.full=ta.value;self.render();self.revealCaret();self.o.onChange(self)});
  ta.addEventListener('keydown',e=>self.key(e));
  ta.addEventListener('scroll',()=>{ta.scrollTop=0;ta.scrollLeft=0});
  ta.addEventListener('blur',()=>self.o.onBlur&&self.o.onBlur(self));
  document.addEventListener('selectionchange',this._sel=()=>{if(document.activeElement===ta)self.cursorChanged()});
  this.main.addEventListener('mousedown',e=>{if(e.target===self.main||e.target.closest('.ed-hl,.ed-mark,.ed-cur')){e.preventDefault();ta.focus();ta.setSelectionRange(ta.value.length,ta.value.length)}});
  this.gut.addEventListener('click',e=>{const f=e.target.closest('.gf');if(f)self.toggleFold(+f.dataset.l)});
  if(window.ResizeObserver){this._ro=new ResizeObserver(()=>{if(self.el.offsetParent)self.fit()});this._ro.observe(this.main)}};
P.destroy=function(){document.removeEventListener('selectionchange',this._sel);if(this._ro)this._ro.disconnect();this.el.remove()};
/* geometry */
P.fit=function(){const ta=this.ta;ta.style.height='0';ta.style.width=this.o.wrap?'100%':'0';const h=ta.scrollHeight;ta.style.height=h+'px';
  if(!this.o.wrap){const w=Math.max(ta.scrollWidth,this.main.parentElement.clientWidth-40);ta.style.width=w+'px'}this.layers()};
P.layers=function(){this.hl.style.height=this.mk.style.height=this.ta.style.height;if(!this.o.wrap){this.hl.style.width=this.mk.style.width=this.cm.style.width=this.ta.style.width}else this.hl.style.width=this.mk.style.width=this.cm.style.width=''};
/* rendering */
P.lineHtml=function(){return(HL[this.lang]||hlTxt)(this.full)};
P.render=function(){
  const full=this.full,lines=full.split('\n');this.nl=lines.length;this.regions=regionsOf(lines,this.lang);
  const hid=new Set();this.folded.forEach(s=>{if(!(s in this.regions)){this.folded.delete(s);return}for(let k=s+1;k<=this.regions[s];k++)hid.add(k)});
  const hh=this.lineHtml();this.vis=[];const html=[],disp=[];
  lines.forEach((l,i)=>{if(hid.has(i))return;this.vis.push(i);disp.push(l);let h=hh[i]||'';if(this.folded.has(i))h+='<span class="fpill" data-l="'+i+'">⋯ '+(this.regions[i]-i)+' lines</span>';html.push('<div class="ln">'+(h||'&#8203;')+'</div>')});
  const dv=disp.join('\n');if(this.ta.value!==dv)this.ta.value=dv;
  this.hl.innerHTML=html.join('');this.fit();this.gutter();this.renderMarks();this.curLine()};
P.gutter=function(){const ch=this.hl.children,H=[],lh=ch.length&&this.o.wrap?0:parseFloat(getComputedStyle(this.hl).lineHeight)||20;
  for(let k=0;k<this.vis.length;k++){const i=this.vis[k],h=ch[k]?ch[k].offsetHeight:lh,r=this.regions[i],pr=this.problems[i+1];
    H.push('<div class="gl'+(pr?' '+pr:'')+'" style="height:'+h+'px">'+(r!=null?'<span class="gf'+(this.folded.has(i)?' c':'')+'" data-l="'+i+'">'+(this.folded.has(i)?'▸':'▾')+'</span>':'')+'<span class="gn">'+(i+1)+'</span></div>')}
  this.gut.innerHTML=H.join('')};
P.setProblems=function(map){this.problems=map||{};if(this.el.offsetParent)this.gutter();else this._pd=1};
/* cursor, lines, positions */
P.selRange=function(){return[this.ta.selectionStart,this.ta.selectionEnd]};
P.dispToFull=function(pos){const v=this.ta.value;let ln=0,col=pos;for(let k=0;k<pos;k++)if(v[k]==='\n'){ln++;}const ls=v.lastIndexOf('\n',pos-1)+1;col=pos-ls;return{line:this.vis[ln]==null?ln:this.vis[ln],col}};
P.cursor=function(){const[a,b]=this.selRange(),p=this.dispToFull(a);return{line:p.line+1,col:p.col+1,sel:Math.abs(b-a),pos:a}};
P.cursorChanged=function(){this.curLine();this.brackets();this.o.onCursor(this,this.cursor())};
P.lineTop=function(k){const c=this.hl.children[k];return c?c.offsetTop:0};
P.dispLineOf=function(pos){const v=this.ta.value;let n=0;for(let k=0;k<pos&&k<v.length;k++)if(v[k]==='\n')n++;return n};
P.curLine=function(){if(!this.o.curLine&&this.o.curLine!==undefined){this.cur.style.display='none';return}
  const k=this.dispLineOf(this.ta.selectionStart),c=this.hl.children[k];if(!c){this.cur.style.display='none';return}
  this.cur.style.display=this.o.focusOnly===false||document.activeElement===this.ta?'block':'none';this.cur.style.top=c.offsetTop+'px';this.cur.style.height=c.offsetHeight+'px'};
P.revealCaret=function(){const ta=this.ta,pos=ta.selectionEnd,k=this.dispLineOf(pos),c=this.hl.children[k];if(!c)return;
  const ls=ta.value.lastIndexOf('\n',pos-1)+1;let y=c.offsetTop,hgt=parseFloat(getComputedStyle(this.hl).lineHeight)||20;
  if(this.o.wrap){this.cm.innerHTML='<div class="ln">'+esc(ta.value.slice(ls,pos))+'<span>&#8203;</span></div>';const sp=this.cm.querySelector('span'),pad=parseFloat(getComputedStyle(this.cm).paddingTop)||0;y=c.offsetTop+(sp.offsetTop-pad);this.cm.innerHTML=''}
  const sc=this.sc,top=y+this.main.offsetTop,m=hgt*2;if(top<sc.scrollTop+m)sc.scrollTop=Math.max(0,top-m);else if(top+hgt>sc.scrollTop+sc.clientHeight-m)sc.scrollTop=top+hgt-sc.clientHeight+m};
P.goto=function(line,col,flash){if(this.folded.size)this.unfoldAll();const lines=this.full.split('\n');line=Math.max(1,Math.min(line,lines.length));let pos=0;for(let k=0;k<line-1;k++)pos+=lines[k].length+1;pos+=Math.min((col||1)-1,lines[line-1].length);
  this.ta.focus({preventScroll:true});this.ta.setSelectionRange(pos,pos);this.curLine();
  const c=this.hl.children[line-1];if(c)this.sc.scrollTop=Math.max(0,c.offsetTop-this.sc.clientHeight/3);if(flash)this.flash(line);this.cursorChanged()};
P.flash=function(line){const c=this.hl.children[line-1];if(!c)return;c.classList.remove('flash');void c.offsetWidth;c.classList.add('flash')};
/* folding */
P.toggleFold=function(l){if(this.folded.has(l))this.folded.delete(l);else if(l in this.regions)this.folded.add(l);this.render()};
P.foldAll=function(){Object.keys(this.regions).forEach(k=>{if(!(this.hiddenBy(+k)))this.folded.add(+k)});this.render()};
P.hiddenBy=function(l){for(const s of this.folded)if(l>s&&l<=this.regions[s])return true;return false};
P.unfoldAll=function(keepSel){if(!this.folded.size)return;const[a,b]=this.selRange(),pa=this.dispToFull(a),pb=this.dispToFull(b);this.folded.clear();
  const L=this.full.split('\n'),off=(p)=>{let o=0;for(let k=0;k<p.line;k++)o+=L[k].length+1;return o+Math.min(p.col,(L[p.line]||'').length)};
  this.ta.value=this.full;this.ta.setSelectionRange(off(pa),off(pb));this.render()};
/* editing helpers */
P.ins=function(text,a,b){const ta=this.ta;if(a!=null)ta.setSelectionRange(a,b==null?a:b);ta.focus({preventScroll:true});
  if(!document.execCommand('insertText',false,text)){ta.setRangeText(text,ta.selectionStart,ta.selectionEnd,'end');ta.dispatchEvent(new Event('input',{bubbles:true}))}};
P.insert=function(t){if(this.folded.size)this.unfoldAll();this.ins(t)};
P.wrap=function(pre,post,ph){if(this.folded.size)this.unfoldAll();const ta=this.ta,[a,b]=this.selRange(),sel=ta.value.slice(a,b)||ph||'';
  this.ins(pre+sel+post,a,b);const s=a+pre.length;ta.setSelectionRange(s,s+sel.length)};
P.lineRange=function(a,b){const v=this.ta.value;return[v.lastIndexOf('\n',a-1)+1,(i=>i<0?v.length:i)(v.indexOf('\n',b>a&&v[b-1]==='\n'?b-1:b))]};
P.mapLines=function(fn){if(this.folded.size)this.unfoldAll();const ta=this.ta,[a,b]=this.selRange(),[s,e]=this.lineRange(a,b),L=ta.value.slice(s,e).split('\n'),R=fn(L);
  this.ins(R.join('\n'),s,e);ta.setSelectionRange(s,s+R.join('\n').length)};
P.toggleComment=function(){const t=this.lang==='md';this.mapLines(L=>{const all=L.every(l=>!l.trim()||(t?/^\s*<!--.*-->\s*$/.test(l):/^\s*%/.test(l)));
  return L.map(l=>!l.trim()?l:all?(t?l.replace(/^(\s*)<!--\s?/,'$1').replace(/\s?-->\s*$/,''):l.replace(/^(\s*)%\s?/,'$1')):(t?'<!-- '+l+' -->':l.replace(/^(\s*)/,'$1% ')))})};
P.key=function(e){const ta=this.ta,mod=e.metaKey||e.ctrlKey,[a,b]=this.selRange(),v=ta.value,lang=this.lang,tab=' '.repeat(this.o.tab);
  if(mod&&!e.shiftKey&&!e.altKey){const k=e.key.toLowerCase();
    if(k==='s'){e.preventDefault();this.o.onSave(this);return}
    if(k==='f'||k==='h'){e.preventDefault();this.openFind(k==='h');return}
    if(k==='/'){e.preventDefault();this.toggleComment();return}
    if(k==='b'||k==='i'){e.preventDefault();const w=lang==='md'?(k==='b'?['**','**']:['*','*']):(k==='b'?['\\textbf{','}']:['\\textit{','}']);this.wrap(w[0],w[1],'text');return}}
  if(e.key==='Escape'&&this.findOpen){this.closeFind();return}
  if(e.key==='Tab'&&!mod){e.preventDefault();if(e.shiftKey||v.slice(a,b).includes('\n')){this.mapLines(L=>L.map(l=>e.shiftKey?l.replace(new RegExp('^( {1,'+this.o.tab+'}|\\t)'),''):(l?tab+l:l)))}else this.ins(tab);return}
  if(e.key==='Enter'&&!mod&&!e.shiftKey){const ls=v.lastIndexOf('\n',a-1)+1,line=v.slice(ls,a),ind=/^\s*/.exec(line)[0];
    if(lang==='md'){const m=/^(\s*)([-*+]|(\d+)[.)])\s+(\[[ xX]\]\s+)?(.*)$/.exec(line);
      if(m&&a===b&&v.slice(a,v.indexOf('\n',a)<0?v.length:v.indexOf('\n',a)).trim()===''||m&&a===b){if(m){e.preventDefault();if(!m[5].trim()){this.ins('',ls,a);return}
        const mk=m[3]?(+m[3]+1)+(/\)/.test(m[2])?')':'.'):m[2];this.ins('\n'+m[1]+mk+' '+(m[4]?'[ ] ':''));return}}}
    if(lang==='tex'&&a===b){const m=/\\begin\{([^}]+)\}\s*(\[[^\]]*\])?\s*$/.exec(line);
      if(m&&!/^(document)$/.test(m[1])){const re=n=>new RegExp('\\\\'+n+'\\{'+m[1].replace(/[*]/g,'\\*')+'\\}','g');const nb=(v.match(re('begin'))||[]).length,ne=(v.match(re('end'))||[]).length;
        e.preventDefault();const body=ind+tab;if(nb>ne){this.ins('\n'+body+'\n'+ind+'\\end{'+m[1]+'}');const p=a+1+body.length;ta.setSelectionRange(p,p)}else this.ins('\n'+body);return}
      if(/^\s*\\item\b/.test(line)&&!/^\s*\\item\s*$/.test(line)){e.preventDefault();this.ins('\n'+ind+'\\item ');return}}
    if(ind&&a===b){e.preventDefault();this.ins('\n'+ind);return}}
  if(!mod&&!e.altKey){
    if(PAIRS[e.key]&&lang!=='txt'){e.preventDefault();if(a!==b)this.wrap(e.key,PAIRS[e.key]);else{this.ins(e.key+PAIRS[e.key]);ta.setSelectionRange(a+1,a+1)}return}
    if((e.key==='}'||e.key===')'||e.key===']')&&a===b&&v[a]===e.key&&lang!=='txt'){e.preventDefault();ta.setSelectionRange(a+1,a+1);return}
    if(e.key==='$'&&a!==b&&lang!=='txt'){e.preventDefault();this.wrap('$','$');return}
    if(e.key==='Backspace'&&a===b&&a>0&&PAIRS[v[a-1]]===v[a]&&lang!=='txt'){e.preventDefault();this.ins('',a-1,a+1);return}}};
/* brackets + marks */
P.brackets=function(){this.bm=[];const v=this.ta.value,[a,b]=this.selRange();if(a===b&&this.lang!=='txt'){
    for(const p of[a-1,a]){const c=v[p];if(!c||!(PAIRS[c]||CLOSE[c]))continue;if(v[p-1]==='\\')continue;
      const open=!!PAIRS[c],mate=open?PAIRS[c]:CLOSE[c];let d=0,lim=Math.min(v.length,open?p+20000:p+1);
      if(open){for(let k=p;k<lim;k++){const x=v[k];if(x==='\\'){k++;continue}if(x===c)d++;else if(x===mate&&--d===0){this.bm=[p,k];break}}}
      else{for(let k=p;k>=Math.max(0,p-20000);k--){const x=v[k];if(v[k-1]==='\\'&&k>0){continue}if(x===c)d++;else if(x===mate&&--d===0){this.bm=[k,p];break}}}
      if(!this.bm.length)this.bm=[p,-1];break}}
  this.renderMarks()};
P.renderMarks=function(){const v=this.ta.value,R=[];(this.marks||[]).forEach(r=>R.push(r));
  if(this.bm&&this.bm.length)this.bm.forEach((p,i)=>{if(p>=0)R.push([p,p+1,this.bm[1]<0?'bmx':'bm'])});
  if(!R.length){this.mk.innerHTML='';return}
  R.sort((x,y)=>x[0]-y[0]);let h='',last=0;for(const[s,e,c]of R){if(s<last)continue;h+=esc(v.slice(last,s))+'<mark class="'+c+'">'+esc(v.slice(s,e))+'</mark>';last=e}
  this.mk.innerHTML=h+esc(v.slice(last))+'\n'};
/* find / replace */
P.openFind=function(rep){if(!this.fb){const d=this.fb=document.createElement('div');d.className='ed-find';
    d.innerHTML='<input class="fi" placeholder="Find" spellcheck="false"><span class="fc2"></span><button class="fprev" title="Previous (Shift+Enter)">↑</button><button class="fnext" title="Next (Enter)">↓</button><button class="fcase" title="Match case">Aa</button><button class="fre" title="Regular expression">.*</button><button class="fx" title="Close (Esc)">✕</button><br class="fbr"><input class="fr" placeholder="Replace" spellcheck="false"><button class="frep">Replace</button><button class="fall">All</button>';
    this.el.appendChild(d);const self=this,q=s=>d.querySelector(s);
    this.fq={t:'',cs:false,re:false};
    q('.fi').addEventListener('input',()=>{self.fq.t=q('.fi').value;self.findAll(true)});
    q('.fi').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();self.findNext(e.shiftKey?-1:1)}if(e.key==='Escape')self.closeFind()});
    q('.fr').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();self.replaceOne()}if(e.key==='Escape')self.closeFind()});
    q('.fnext').onclick=()=>self.findNext(1);q('.fprev').onclick=()=>self.findNext(-1);q('.fx').onclick=()=>self.closeFind();
    q('.fcase').onclick=e=>{self.fq.cs=!self.fq.cs;e.target.classList.toggle('on',self.fq.cs);self.findAll(true)};
    q('.fre').onclick=e=>{self.fq.re=!self.fq.re;e.target.classList.toggle('on',self.fq.re);self.findAll(true)};
    q('.frep').onclick=()=>self.replaceOne();q('.fall').onclick=()=>self.replaceAll()}
  this.unfoldAll();this.findOpen=true;this.fb.style.display='block';this.fb.classList.toggle('rep',!!rep);
  const i=this.fb.querySelector('.fi'),s=this.ta.value.slice(this.ta.selectionStart,this.ta.selectionEnd);if(s&&!s.includes('\n')){i.value=s;this.fq.t=s}i.focus();i.select();this.findAll(false)};
P.closeFind=function(){this.findOpen=false;if(this.fb)this.fb.style.display='none';this.marks=[];this.renderMarks();this.focus()};
P.rx=function(){const q=this.fq;if(!q||!q.t)return null;try{return new RegExp(q.re?q.t:q.t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'+(q.cs?'':'i'))}catch(e){return null}};
P.findAll=function(jump){const v=this.ta.value,re=this.rx(),R=[];this.matches=R;
  if(re){let m;while((m=re.exec(v))&&R.length<5000){if(!m[0].length){re.lastIndex++;continue}R.push([m.index,m.index+m[0].length])}}
  const sel=this.ta.selectionStart;let idx=R.findIndex(r=>r[0]>=sel);if(idx<0)idx=0;this.mi=R.length?idx:-1;this.paintFind();
  if(jump&&R.length)this.showMatch()};
P.paintFind=function(){const R=this.matches||[];this.marks=R.map((r,i)=>[r[0],r[1],i===this.mi?'fcur':'fm']);this.renderMarks();
  this.fb.querySelector('.fc2').textContent=this.fq.t?(R.length?(this.mi+1)+'/'+R.length:'0/0'):''};
P.showMatch=function(){const r=this.matches[this.mi];if(!r)return;this.ta.setSelectionRange(r[0],r[1]);this.revealCaret();this.curLine()};
P.findNext=function(d){this.findAll(false);const R=this.matches;if(!R.length)return;const sel=d>0?this.ta.selectionEnd:this.ta.selectionStart;
  let i=d>0?R.findIndex(r=>r[0]>=sel):(()=>{for(let k=R.length-1;k>=0;k--)if(R[k][1]<=sel)return k;return-1})();
  if(i<0)i=d>0?0:R.length-1;this.mi=i;this.paintFind();this.showMatch()};
P.replaceOne=function(){const re=this.rx();if(!re)return;const v=this.ta.value,[a,b]=this.selRange(),r=this.fb.querySelector('.fr').value;
  const cur=v.slice(a,b);const re1=new RegExp(re.source,re.flags.replace('g',''));if(a!==b&&re1.test(cur)){this.ins(cur.replace(new RegExp(re.source,re.flags.replace('g','')),this.fq.re?r:r.replace(/\$/g,'$$$$')),a,b)}this.findNext(1)};
P.replaceAll=function(){const re=this.rx();if(!re)return;const r=this.fb.querySelector('.fr').value,v=this.ta.value,n=v.replace(re,this.fq.re?r:r.replace(/\$/g,'$$$$'));if(n!==v)this.ins(n,0,v.length);this.findAll(false)};

window.DSEditor={Editor,langOf,hl:HL};
})();
