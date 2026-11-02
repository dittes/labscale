/* DocScale compiler: LaTeX / Markdown / BibTeX -> HTML (client side, KaTeX for math) */
(function(){
'use strict';
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const ACC={'"':'\u0308',"'":'\u0301','`':'\u0300','^':'\u0302','~':'\u0303','=':'\u0304','.':'\u0307','u':'\u0306','v':'\u030C','c':'\u0327','H':'\u030B','r':'\u030A'};
const SYM={ss:'ß',ae:'æ',AE:'Æ',oe:'œ',OE:'Œ',o:'ø',O:'Ø',aa:'å',AA:'Å',l:'ł',L:'Ł',i:'ı',j:'ȷ',S:'§',P:'¶',copyright:'©',pounds:'£',textregistered:'®',texttrademark:'™',textdegree:'°',degree:'°',textmu:'µ',texttimes:'×',textbullet:'•',textendash:'–',textemdash:'—',textbackslash:'\\',textless:'<',textgreater:'>',textbar:'|',textasciitilde:'~',textasciicircum:'^',textunderscore:'_',checkmark:'✓',textperthousand:'‰',euro:'€',dag:'†',ddag:'‡',lq:'‘',rq:'’',guillemotleft:'«',guillemotright:'»',ldots:'…',dots:'…',textellipsis:'…',quad:'\u2003',qquad:'\u2003\u2003',enspace:'\u2002',thinspace:'\u2009',textquotesingle:"'",'&':'&','%':'%','$':'$','#':'#','_':'_','{':'{','}':'}',' ':' ',',':'\u2009',';':'\u2005',':':'\u2005'};
const UNIT={meter:'m',metre:'m',second:'s',gram:'g',kilo:'k',milli:'m',micro:'µ',nano:'n',pico:'p',centi:'c',deci:'d',mega:'M',giga:'G',hertz:'Hz',kelvin:'K',volt:'V',ampere:'A',mole:'mol',liter:'L',litre:'L',percent:'%',degreeCelsius:'°C',celsius:'°C',per:'/',squared:'²',cubed:'³',molar:'M',joule:'J',watt:'W',newton:'N',pascal:'Pa',bar:'bar',hour:'h',minute:'min',day:'d',dalton:'Da',degree:'°',radian:'rad',coulomb:'C',farad:'F',ohm:'Ω',tesla:'T',sievert:'Sv',gray:'Gy',katal:'kat',lumen:'lm',lux:'lx',siemens:'S',weber:'Wb',henry:'H',becquerel:'Bq',electronvolt:'eV',angstrom:'Å',atmosphere:'atm',rpm:'rpm',cm:'cm',mm:'mm'};
const SIZES={tiny:'.6em',scriptsize:'.7em',footnotesize:'.8em',small:'.9em',normalsize:'1em',large:'1.2em',Large:'1.44em',LARGE:'1.73em',huge:'2.07em',Huge:'2.49em'};
const DECL={bfseries:['<b>','</b>'],bf:['<b>','</b>'],itshape:['<i>','</i>'],it:['<i>','</i>'],em:['<i>','</i>'],slshape:['<i>','</i>'],scshape:['<span class="sc">','</span>'],sc:['<span class="sc">','</span>'],ttfamily:['<span class="tt">','</span>'],tt:['<span class="tt">','</span>'],sffamily:['<span class="sf">','</span>'],rmfamily:['',''],normalfont:['',''],mdseries:['',''],upshape:['','']};
const THM0={theorem:['Theorem','plain'],lemma:['Lemma','plain'],proposition:['Proposition','plain'],corollary:['Corollary','plain'],conjecture:['Conjecture','plain'],claim:['Claim','plain'],definition:['Definition','def'],example:['Example','def'],remark:['Remark','def'],note:['Note','def'],notation:['Notation','def'],assumption:['Assumption','def'],hypothesis:['Hypothesis','def'],axiom:['Axiom','def'],fact:['Fact','plain'],problem:['Problem','def'],exercise:['Exercise','def']};
const IGN={setlength:2,setcounter:2,addtocounter:2,pagestyle:1,thispagestyle:1,geometry:1,hypersetup:1,graphicspath:1,bibliographystyle:1,usetikzlibrary:1,pgfplotsset:1,lstset:1,captionsetup:1,linespread:1,addcontentsline:3,numberwithin:2,pagenumbering:1,setlist:1,sisetup:1,floatplacement:2,definecolor:3,titleformat:4,titlespacing:4,fancyhf:1,fancyhead:1,fancyfoot:1,rhead:1,lhead:1,chead:1,rfoot:1,lfoot:1,cfoot:1,setmainfont:1,DeclareGraphicsExtensions:1,theoremstyle:1,AtBeginDocument:1,counterwithin:2,sloppy:0,allowdisplaybreaks:0,raggedbottom:0,flushbottom:0,frenchspacing:0,onehalfspacing:0,doublespacing:0,singlespacing:0,hline:0,toprule:0,midrule:0,bottomrule:0,hfill:0,vfill:0,smallskip:0,medskip:0,bigskip:0,'protect':0,relax:0,'ignorespaces':0,'unskip':0,'-':0,'/':0,'@':0,'!':0,printbibliography:0,listoffigures:0,listoftables:0};

function matchBrace(t,i,o,c){o=o||'{';c=c||'}';let d=0;for(let k=i;k<t.length;k++){const ch=t[k];if(ch==='\\'){k++;continue}if(ch===o)d++;else if(ch===c){d--;if(d===0)return k}}return -1}
function readArg(S,i,b){const t=S.t;while(i<b&&/[\s\u0001]/.test(t[i]))i++;if(i>=b)return null;
  if(t[i]==='{'){const m=matchBrace(t,i);if(m<0||m>=b)return{a:i+1,b:b,end:b,bad:1};return{a:i+1,b:m,end:m+1}}
  if(t[i]==='\\'){let k=i+1;if(/[a-zA-Z]/.test(t[k])){while(k<b&&/[a-zA-Z]/.test(t[k]))k++}else k++;return{a:i,b:k,end:k}}
  return{a:i,b:i+1,end:i+1}}
function readOpt(S,i,b){const t=S.t;let k=i;while(k<b&&/[ \t\u0001]/.test(t[k]))k++;if(t[k]!=='[')return null;let d=0;
  for(let m=k+1;m<b;m++){const ch=t[m];if(ch==='\\'){m++;continue}if(ch==='{')d++;else if(ch==='}')d--;else if(ch===']'&&d<=0)return{a:k+1,b:m,end:m+1}}return null}
function mkSrc(text,file,fixed){
  const lines=text.split('\n');let verb=false;
  for(let n=0;n<lines.length;n++){let L=lines[n];
    if(verb){if(/\\end\{(verbatim|lstlisting|minted|Verbatim)\*?\}/.test(L))verb=false;continue}
    if(/\\begin\{(verbatim|lstlisting|minted|Verbatim)\*?\}/.test(L)&&!/\\end\{(verbatim|lstlisting|minted|Verbatim)\*?\}/.test(L))verb=true;
    for(let k=0;k<L.length;k++){const ch=L[k];if(ch==='\\'){k++;continue}if(ch==='%'){lines[n]=L.slice(0,k)+'\u0001'.repeat(L.length-k);break}}}
  const t=lines.join('\n'),ls=[0];for(let k=0;k<t.length;k++)if(t[k]==='\n')ls.push(k+1);
  return{t,file,ls,fixed:fixed==null?null:fixed}}
function lineOf(S,p){if(S.fixed!=null)return S.fixed;let lo=0,hi=S.ls.length-1;while(lo<hi){const m=(lo+hi+1)>>1;if(S.ls[m]<=p)lo=m;else hi=m-1}return lo+1}
function plain(s){return String(s).replace(/\\[a-zA-Z]+\*?/g,'').replace(/[{}$]/g,'').replace(/\s+/g,' ').trim()}
function accent(a,ch){return (ch+ACC[a]).normalize('NFC')}
function detex(s){return String(s).replace(/\\([\"'`^~=.uvcHr])\s*\{?\\?([a-zA-Z])\}?/g,(m,a,c)=>accent(a,c)).replace(/\\&/g,'&').replace(/\\([a-zA-Z]+)\s*/g,(m,n)=>SYM[n]||'').replace(/--/g,'–').replace(/[{}]/g,'').replace(/\s+/g,' ').trim()}
function ceTex(x){return '\\mathrm{'+x.replace(/(\d+)/g,(m,d,off)=>off===0?d:'_{'+d+'}').replace(/\^?([+-])(?=\s|$|\)|\})/g,'^{$1}')+'}'}
function unitStr(u){return u.replace(/\\([a-zA-Z]+)/g,(m,n)=>UNIT[n]||n).replace(/[{}]/g,'').replace(/\s+/g,'').replace(/\^(-?\d)/g,'^$1')}
function cssLen(s){s=(s||'').trim();let m=/^([\d.]+)\s*\\(textwidth|linewidth|columnwidth|hsize)/.exec(s);if(m)return(parseFloat(m[1])*100)+'%';
  if(/^\\(textwidth|linewidth|columnwidth)$/.test(s))return'100%';m=/^(-?[\d.]+)\s*(cm|mm|pt|in|em|ex|px)/.exec(s);return m?m[1]+(m[2]==='ex'?'em':m[2]):''}

/* ---------- BibTeX ---------- */
function parseBib(text){
  const out={},t=text;let i=0;
  while((i=t.indexOf('@',i))>=0){
    const m=/^@(\w+)\s*([{(])/.exec(t.slice(i,i+40));if(!m){i++;continue}
    const type=m[1].toLowerCase(),open=i+m[0].length-1,close=matchBrace(t,open,t[open],t[open]==='{'?'}':')');
    if(close<0)break;i=close+1;if(/^(comment|preamble|string)$/.test(type))continue;
    const body=t.slice(open+1,close),ci=body.indexOf(',');if(ci<0)continue;
    const key=body.slice(0,ci).trim(),e={type,key,f:{}};let p=ci+1;
    while(p<body.length){const fm=/\s*([\w-]+)\s*=\s*/y;fm.lastIndex=p;const r=fm.exec(body);if(!r){p++;continue}
      const name=r[1].toLowerCase();p=fm.lastIndex;let v='';
      if(body[p]==='{'){const e2=matchBrace(body,p);v=body.slice(p+1,e2<0?body.length:e2);p=(e2<0?body.length:e2)+1}
      else if(body[p]==='"'){let q=p+1;while(q<body.length&&body[q]!=='"'){if(body[q]==='\\'||body[q]==='{'&&0)q++;q++}v=body.slice(p+1,q);p=q+1}
      else{const q=/[,}\n]/.exec(body.slice(p));const e2=q?p+q.index:body.length;v=body.slice(p,e2).trim();p=e2}
      e.f[name]=v.replace(/\s+/g,' ').trim()}
    out[key]=e}
  return out}
function authors(s){if(!s)return[];return s.split(/\s+and\s+/).map(a=>{a=detex(a);let f='',l=a;if(a.includes(',')){const x=a.split(',');l=x[0].trim();f=x.slice(1).join(' ').trim()}else{const x=a.split(' ');l=x.pop();f=x.join(' ')}return{f,l}})}
function authStr(a,short){if(!a.length)return'';const n=a.map(x=>(x.f?x.f.replace(/([A-Z])[a-z]+/g,'$1.')+' ':'')+x.l);if(short)return a.length>2?a[0].l+' et al.':a.map(x=>x.l).join(' and ');return n.length>2?n.slice(0,-1).join(', ')+', and '+n[n.length-1]:n.join(' and ')}
function fmtBib(e){const f=e.f,A=authStr(authors(f.author||f.editor)),T=detex(f.title||''),y=f.year||'',p=[];
  if(A)p.push(esc(A));
  const jn=f.journal||f.journaltitle,bt=f.booktitle;
  if(e.type==='book'){p.push('<i>'+esc(T)+'</i>');if(f.publisher)p.push(esc(detex(f.publisher)));if(f.address)p.push(esc(detex(f.address)))}
  else{if(T)p.push('“'+esc(T)+',”');if(jn)p.push('<i>'+esc(detex(jn))+'</i>');else if(bt)p.push('in <i>'+esc(detex(bt))+'</i>');else if(f.school)p.push(esc(detex(f.school)));else if(f.howpublished)p.push(esc(detex(f.howpublished)));else if(f.publisher)p.push(esc(detex(f.publisher)))}
  if(f.volume)p.push('vol. '+esc(f.volume));if(f.number)p.push('no. '+esc(f.number));if(f.pages)p.push('pp. '+esc(f.pages.replace(/--?/,'–')));if(y)p.push(esc(y));
  let h=p.join(', ').replace(/,”,/,',”')+'.';if(f.doi)h+=' <a href="https://doi.org/'+esc(f.doi)+'" target="_blank" rel="noopener">doi:'+esc(f.doi)+'</a>';else if(f.url)h+=' <a href="'+esc(f.url)+'" target="_blank" rel="noopener">'+esc(f.url)+'</a>';return h}

/* ---------- shared context ---------- */
function newCtx(files,opts){return{files,opts:opts||{},bib:{},bibManual:{},citeNum:{},log:[],km:{},macros:{},thm:Object.assign({},THM0),labels:{},outline:[],pass:0,cls:'article',title:'',author:'',date:'',hasCh:false,imgs:0}}
function findFile(files,name,exts){name=String(name).trim().replace(/^\.\//,'');const L=[name].concat((exts||[]).map(e=>name+e));
  for(const n of L){const f=files.find(f=>f.path===n);if(f)return f}for(const n of L){const f=files.find(f=>f.path.split('/').pop()===n.split('/').pop());if(f)return f}return null}
function loadBib(C,names){for(const n of names.split(',')){const f=findFile(C.files,n.trim(),['.bib']);if(f)Object.assign(C.bib,parseBib(f.text||''));else if(C.pass===2)C.logw('warn','Bibliography file \''+n.trim()+'\' not found')}}
function bibAll(C){for(const f of C.files)if(/\.bib$/i.test(f.path)&&f.text!=null)Object.assign(C.bib,parseBib(f.text))}
function resetPass(C){C.cnt={};C.sec=[0,0,0,0];C.eq=0;C.fn=[];C.cited=[];C.cur={};C.outline=[];C.newLabels={};C.floats=[];C.appx=false;C.bibShown=false;C.tocPos=0;C.depth=0;C.log=[];C.eqRows=0;C.listDepth=0;C.fnCount=0;C.fig=0;C.tab=0;C.cs=null}
function mkLog(C){C.logw=function(type,msg,S,pos){if(C.pass===1)return;C.log.push({type,msg,file:S?S.file:null,line:S?(pos==null?null:lineOf(S,pos)):null})}}
function secNum(C,lvl){const c=C.sec;if(C.appx){const base=C.hasCh?0:1;const A=String.fromCharCode(64+c[base]);return lvl===base?A:A+'.'+c.slice(base+1,lvl+1).join('.')}
  return c.slice(C.hasCh?0:1,lvl+1).join('.')}
function citeFmt(C,keys,kind,S,pos,pre,post){
  const style=C.opts.cite||'numeric',parts=[];
  for(const k of keys){let e=C.bib[k],man=C.bibManual[k];
    if(!e&&!man){C.logw('warn',"Citation '"+k+"' undefined",S,pos);parts.push(['?','?']);continue}
    if(C.citeNum[k]==null&&!man){C.citeNum[k]=Object.keys(C.citeNum).length+1}
    if(man&&C.citeNum[k]==null)C.citeNum[k]=man.num;
    if(C.cited.indexOf(k)<0)C.cited.push(k);
    const n=C.citeNum[k]||'?';let au='',yr='';
    if(e){const a=authors(e.f.author||e.f.editor);au=authStr(a,true);yr=e.f.year||''}
    parts.push([k,n,au,yr])}
  const link=(p,txt)=>p[0]==='?'?txt:'<a class="cite" href="#bib-'+esc(p[0])+'" data-cite="'+esc(p[0])+'">'+txt+'</a>';
  const extra=post?', '+esc(post):'';
  if(style==='authoryear'){
    if(kind==='t')return parts.map(p=>link(p,esc(p[2]||'?'))+' ('+esc(p[3]||'n.d.')+extra+')').join('; ');
    if(kind==='a')return parts.map(p=>link(p,esc(p[2]||'?'))).join('; ');
    if(kind==='y')return parts.map(p=>link(p,esc(p[3]||'n.d.'))).join('; ');
    return'('+(pre?esc(pre)+' ':'')+parts.map(p=>link(p,esc((p[2]||'?')+', '+(p[3]||'n.d.')))).join('; ')+extra+')'}
  const nums=parts.map(p=>link(p,String(p[1]))).join(', ');
  if(kind==='t')return parts.map(p=>link(p,esc(p[2]||'?'))+' ['+link(p,String(p[1]))+extra+']').join(', ');
  if(kind==='a')return parts.map(p=>link(p,esc(p[2]||'?'))).join(', ');
  if(kind==='y')return parts.map(p=>link(p,esc(p[3]||'n.d.'))).join(', ');
  return'['+(pre?esc(pre)+' ':'')+nums+extra+']'}
function bibHtml(C,title){
  let items;
  if(Object.keys(C.bibManual).length)items=Object.keys(C.bibManual).map(k=>({k,n:C.bibManual[k].num,h:C.bibManual[k].html}));
  else{const keys=C.cited.filter(k=>C.bib[k]);keys.sort((a,b)=>(C.citeNum[a]||0)-(C.citeNum[b]||0));
    if((C.opts.cite||'numeric')==='authoryear')keys.sort((a,b)=>(authStr(authors(C.bib[a].f.author),1)||a).localeCompare(authStr(authors(C.bib[b].f.author),1)||b));
    items=keys.map(k=>({k,n:C.citeNum[k],h:fmtBib(C.bib[k])}))}
  if(!items.length)return'';
  const ay=(C.opts.cite||'numeric')==='authoryear';
  return'<section class="bib"><h2 class="unnum">'+esc(title||'References')+'</h2><ol class="bibl'+(ay?' ay':'')+'">'+items.map(x=>'<li id="bib-'+esc(x.k)+'" data-bib="'+esc(x.k)+'">'+(ay?'':'<span class="bn">['+x.n+']</span> ')+x.h+'</li>').join('')+'</ol></section>'}

/* ---------- LaTeX ---------- */
function mathHtml(C,src,disp,S,pos){
  src=src.replace(/\\ce\{((?:[^{}]|\{[^{}]*\})*)\}/g,(m,x)=>ceTex(x)).replace(/\\SI\{([^}]*)\}\{([^}]*)\}/g,(m,v,u)=>v+'\\,\\mathrm{'+unitStr(u)+'}').replace(/\\num\{([^}]*)\}/g,'$1');
  const o={displayMode:disp,macros:Object.assign({},C.km),strict:'ignore',trust:false,errorColor:'#c2410c'};
  if(typeof katex==='undefined')return'<code class="mathfallback">'+esc(src)+'</code>';
  const tag=h=>h.replace('<span class="katex"','<span class="katex" data-tex="'+esc(src.trim())+'"');
  try{return tag(katex.renderToString(src,Object.assign({throwOnError:true},o)))}
  catch(e){C.logw('error','Math: '+String(e.message||e).replace(/^KaTeX parse error: /,''),S,pos);o.macros=Object.assign({},C.km);return tag(katex.renderToString(src,Object.assign({throwOnError:false},o)))}}
function findEnd(t,i,name,b){const re=new RegExp('\\\\(begin|end)\\{'+name.replace(/[*+?.()|\\^$]/g,'\\$&')+'\\}','g');re.lastIndex=i;let d=1,m;
  while((m=re.exec(t))&&m.index<b){if(m[1]==='begin')d++;else if(--d===0)return{at:m.index,end:m.index+m[0].length}}return null}
function splitCells(t,a,b){const out=[];let d=0,env=0,last=a;
  for(let i=a;i<b;i++){const c=t[i];if(c==='\\'){const m=/^\\(begin|end)\{/.exec(t.slice(i,i+8));if(m){env+=m[1]==='begin'?1:-1;i+=m[0].length-1;continue}i++;continue}
    if(c==='{')d++;else if(c==='}')d--;else if(c==='&'&&!d&&!env){out.push([last,i]);last=i+1}}
  out.push([last,b]);return out}
function splitRows(t,a,b){const out=[];let d=0,env=0,last=a;
  for(let i=a;i<b;i++){const c=t[i];if(c==='\\'){const m=/^\\(begin|end)\{/.exec(t.slice(i,i+8));if(m){env+=m[1]==='begin'?1:-1;i+=m[0].length-1;continue}
      if(t[i+1]==='\\'&&!d&&!env){out.push([last,i]);i+=1;let k=i+1;if(t[k]==='*')k++;const o=readOpt({t},k,b);if(o&&/^\s*-?[\d.]/.test(t.slice(o.a,o.b)))k=o.end;last=k;i=k-1;continue}i++;continue}
    if(c==='{')d++;else if(c==='}')d--}
  out.push([last,b]);return out}

function run(C,S,a,b,inl){
  const t=S.t;let i=a,out=[],para='',pl=-1,lastSp=true,decl=[],noInd=false,align='';
  const ln=p=>lineOf(S,p);
  const add=h=>{if(!h)return;if(para===''&&decl.length)para=decl.map(d=>d[0]).join('');if(pl<0)pl=ln(i);para+=h;lastSp=false};
  const txt=s=>{s=esc(s).replace(/[ \t\r\n]+/g,' ');if(lastSp&&s[0]===' ')s=s.slice(1);if(!s)return;add(s);lastSp=s.slice(-1)===' '};
  const flush=()=>{if(para===''){pl=-1;return}let h=para+decl.slice().reverse().map(d=>d[1]).join('');para='';
    if(!inl){const tx=h.replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').trim();
      if(tx||/<(img|svg)|class="katex|class="ph-img/.test(h)){const cls=(align?align+' ':'')+(noInd?'ni':'');out.push('<p'+(cls?' class="'+cls.trim()+'"':'')+' data-f="'+esc(S.file||'')+'" data-l="'+(pl<0?1:pl)+'">'+h.replace(/\s+$/,'')+'</p>')}
      noInd=false}else out.push(h);pl=-1;lastSp=true};
  const block=h=>{flush();out.push(h)};
  const subInl=g=>run(C,S,g.a,g.b,true);
  const R=g=>t.slice(g.a,g.b);
  const bodyBlocks=(a2,b2)=>run(C,S,a2,b2,false);
  const dataAttr=p=>' data-f="'+esc(S.file||'')+'" data-l="'+ln(p)+'"';

  function expand(m,args,p){let s=m.body;for(let k=args.length;k>=1;k--)s=s.split('#'+k).join(args[k-1]);
    if(C.depth>40){C.logw('error','Macro recursion too deep',S,p);return}
    C.depth++;const S2=mkSrc(s,S.file,ln(p));const blk=/\\(begin|section|subsection|item)\b/.test(s);
    if(blk){flush();out.push(run(C,S2,0,S2.t.length,false))}else add(run(C,S2,0,S2.t.length,true));C.depth--}

  function heading(name,star,p,g,optShort){
    const lvl={chapter:0,section:1,subsection:2,subsubsection:3,paragraph:4,subparagraph:4}[name];
    let num='';
    if(!star&&lvl<4){C.sec[lvl]++;for(let k=lvl+1;k<4;k++)C.sec[k]=0;num=secNum(C,lvl);if(lvl<=1)C.cnt._secKey=C.sec[1]+'.'+C.sec[0];C.cur={num,kind:name==='chapter'?'chapter':'section'}}
    else if(!star&&lvl===4)C.cur={num:'',kind:'paragraph'};
    const id='sec-'+(C.outline.length+1),title=subInl(g);
    if(lvl<4)C.outline.push({level:lvl,num,title:plain(R(g)),file:S.file,line:ln(p),id});
    if(lvl===4){block('<h5 class="run" id="'+id+'"'+dataAttr(p)+'>'+title+'</h5>');return}
    const tag='h'+Math.min(lvl+1,4);
    const pre=name==='chapter'&&num?'<span class="chlab">'+(C.appx?'Appendix ':'Chapter ')+num+'</span>':num?'<span class="num">'+num+'</span>':'';
    block('<'+tag+' class="sec'+(star?' unnum':'')+(name==='chapter'?' chap':'')+'" id="'+id+'"'+dataAttr(p)+'>'+pre+title+'</'+tag+'>');noInd=true}

  function setLabel(k,S2,p){C.newLabels[k]=Object.assign({},C.cur);return'<a class="anc" id="lbl-'+esc(k)+'"></a>'}
  function refHtml(k,kind,p){const l=C.labels[k];if(!l){C.logw('warn',"Reference '"+k+"' undefined",S,p);return'<b class="unres">??</b>'}
    const nm={section:'Section ',chapter:'Chapter ',figure:'Figure ',table:'Table ',eq:'Equation ',item:'item ',theorem:(l.name||'')+' '}[l.kind]||'';
    const n=kind==='eq'&&l.kind==='eq'?'('+l.num+')':l.num;return'<a class="ref" href="#lbl-'+esc(k)+'" data-ref="'+esc(k)+'">'+(kind==='auto'?nm:'')+n+'</a>'}

  function eqBlock(name,a2,b2,p){
    const star=name.endsWith('*'),base=name.replace('*','');let inner=t.slice(a2,b2);const labels=[];
    inner=inner.replace(/\\label\{([^}]*)\}/g,(m,k)=>{labels.push(k);return''}).replace(/\u0001/g,'');
    let rows=1;
    if(/^(align|gather|alignat|flalign|eqnarray)$/.test(base)){const rs=inner.split(/\\\\/);rows=rs.filter((r,idx)=>!/\\(nonumber|notag)/.test(r)&&(idx<rs.length-1||r.trim())).length}
    const first=C.eq+1;
    if(!star){if(/\\(nonumber|notag)/.test(inner)&&base==='equation')rows=0;C.eq+=rows}
    let env=base,src;
    if(base==='multline'){src='\\begin{gathered}'+inner+'\\end{gathered}';env=star?'*':'equation'}
    else if(base==='eqnarray')src='\\begin{align'+(star?'*':'')+'}'+inner.replace(/&=&/g,'&=&').replace(/&/g,'&')+'\\end{align'+(star?'*':'')+'}';
    else if(base==='equation'||base==='displaymath'||base==='math')src=star||base!=='equation'?inner:inner;
    else src='\\begin{'+name+'}'+inner+'\\end{'+name+'}';
    let h;
    if(base==='multline'&&!star)h=mathHtml(C,'\\begin{equation}'+src+'\\end{equation}',true,S,p);
    else if(base==='equation'&&!star)h=mathHtml(C,'\\begin{equation}'+inner+'\\end{equation}',true,S,p);
    else h=mathHtml(C,src,true,S,p);
    labels.forEach((k,idx)=>{C.cur={num:String(first+Math.min(idx,Math.max(rows-1,0))),kind:'eq'};C.newLabels[k]=Object.assign({},C.cur)});
    block('<div class="eq"'+dataAttr(p)+'>'+labels.map(k=>'<a class="anc" id="lbl-'+esc(k)+'"></a>').join('')+h+'</div>');noInd=true}

  function listBlock(name,a2,b2,p){
    const items=[];const re=/\\(begin|end)\{[^}]*\}|\\item\b/g;re.lastIndex=a2;let m,d=0,cur=null;
    while((m=re.exec(t))&&m.index<b2){if(m[1]==='begin')d++;else if(m[1]==='end')d--;else if(m[0]==='\\item'&&d===0){if(cur)cur.e=m.index;cur={a:m.index+5,e:b2,p:m.index};items.push(cur)}}
    C.listDepth++;let n=0;
    const lis=items.map(it=>{n++;let lab=null,a3=it.a;const o=readOpt(S,a3,it.e);if(o){lab=subInl(o);a3=o.end}
      C.cur={num:String(n),kind:'item'};let inner=bodyBlocks(a3,it.e);if((inner.match(/<p[ >]/g)||[]).length===1&&inner.startsWith('<p'))inner=inner.replace(/^<p[^>]*>([\s\S]*?)<\/p>/,'$1');
      if(name==='description')return'<dt'+dataAttr(it.p)+'>'+(lab||'')+'</dt><dd>'+inner+'</dd>';
      return'<li'+dataAttr(it.p)+(lab!=null?' class="lab"><span class="ilab">'+lab+'</span>':'>')+inner+'</li>'});
    C.listDepth--;
    const tag=name==='enumerate'?'ol':name==='description'?'dl':'ul';
    block('<'+tag+' class="l'+Math.min(C.listDepth,3)+'"'+dataAttr(p)+'>'+lis.join('')+'</'+tag+'>')}

  function tabular(a2,b2,p,spec){
    const cols=[];spec.replace(/[@!<>]\{[^}]*\}/g,'').replace(/([lcrX])|[pmb]\{[^}]*\}|(\*\{\d+\}\{[^}]*\})/g,(m,x,y)=>{if(x)cols.push(x==='X'?'l':x);else if(y){const q=/\*\{(\d+)\}\{([^}]*)\}/.exec(y);for(let n=0;n<+q[1];n++)q[2].replace(/[lcr]/g,z=>cols.push(z))}else if(/^[pmb]/.test(m))cols.push('l');return m});
    const border=/\|/.test(spec),rows=splitRows(t,a2,b2);const rowsA=[];let pendTop=false;
    for(const r of rows){let rs=r[0],re=r[1],top=0,mid=0;
      let seg=t.slice(rs,re);const lead=/^(\s|\u0001)*(\\(hline|toprule|midrule|bottomrule|cline\{[^}]*\}|cmidrule(\([^)]*\))?\{[^}]*\})\s*)+/.exec(seg);
      if(lead){top=1;rs+=lead[0].length}
      const tr=t.slice(rs,re).replace(/\u0001/g,'').trim();
      if(!tr){if(top){if(rowsA.length)rowsA[rowsA.length-1].bb=1;else pendTop=true}continue}
      let cells=splitCells(t,rs,re),ci=0,tds='';
      for(const c of cells){let ca=c[0],cb=c[1],span=1,al=cols[ci]||'l',rsp=1;
        let mm=/^\s*\\multicolumn\s*\{(\d+)\}\s*\{([^}]*)\}\s*/.exec(t.slice(ca,cb));
        if(mm){span=+mm[1];al=(/[lcr]/.exec(mm[2])||['l'])[0];ca+=mm[0].length;const g=readArg(S,ca,cb);if(g){ca=g.a;cb=g.b}}
        const mr=/^\s*\\multirow\s*\{(\d+)\}\s*\{[^}]*\}\s*/.exec(t.slice(ca,cb));
        if(mr){rsp=+mr[1];ca+=mr[0].length;const g=readArg(S,ca,cb);if(g){ca=g.a;cb=g.b}}
        let cs=t.slice(ca,cb).replace(/\\(hline|toprule|midrule|bottomrule)\b/g,'');
        const S2=mkSrc(cs,S.file,ln(rs));const h=run(C,S2,0,S2.t.length,true);
        tds+='<td class="'+al+'"'+(span>1?' colspan="'+span+'"':'')+(rsp>1?' rowspan="'+rsp+'"':'')+'>'+h.trim()+'</td>';ci+=span}
      rowsA.push({bt:top||pendTop,bb:0,tds});pendTop=false}
    const html=rowsA.map(r=>'<tr class="'+(r.bt?'bt ':'')+(r.bb?'bb':'')+'">'+r.tds+'</tr>').join('');
    return'<table class="tab'+(border?' vg':'')+'"'+dataAttr(p)+'><tbody>'+html+'</tbody></table>'}

  function envBlock(name,p,a2,b2,g0){
    const star=name.endsWith('*'),base=name.replace(/\*$/,'');
    if(/^(equation|align|gather|multline|alignat|flalign|eqnarray|displaymath)$/.test(base)){eqBlock(name,a2,b2,p);return}
    if(/^(itemize|enumerate|description)$/.test(name)){listBlock(name,a2,b2,p);return}
    if(C.thm[base]||base==='proof'){
      let o=readOpt(S,a2,b2),nm=o?subInl(o):'';if(o)a2=o.end;
      if(base==='proof'){block('<div class="proof"'+dataAttr(p)+'><span class="pl">'+(nm||'Proof')+'.</span> '+qedIn(bodyBlocks(a2,b2))+'</div>');return}
      const th=C.thm[base];const key=th.counter||base;const sk=th.within?key+'@'+C.sec[1]+'.'+C.sec[0]:key;
      C.cnt[sk]=(C.cnt[sk]||0)+1;const num=(th.within?secNum(C,1)+'.':'')+C.cnt[sk];C.cur={num,kind:'theorem',name:th.title};
      block('<div class="thm '+th.style+'"'+dataAttr(p)+'><span class="tl"><b>'+esc(th.title)+' '+num+'</b>'+(nm?' <span class="tn">('+nm+')</span>':'')+'.</span> '+bodyBlocks(a2,b2)+'</div>');return}
    switch(base){
      case'abstract':block('<div class="abstract"'+dataAttr(p)+'><h4>'+esc(C.opts.abstractTitle||'Abstract')+'</h4>'+bodyBlocks(a2,b2)+'</div>');return;
      case'figure':case'table':{const po=readOpt(S,a2,b2);if(po&&/^[htbpH!\s]*$/.test(R(po)))a2=po.end;const kind=base;C[kind==='figure'?'fig':'tab']++;const n=C[kind==='figure'?'fig':'tab'];C.cur={num:String(n),kind};C.floats.push({kind,n});
        const inner=bodyBlocks(a2,b2);C.floats.pop();block('<figure class="'+kind+(star?' wide':'')+'" id="fl-'+kind+n+'"'+dataAttr(p)+'>'+inner+'</figure>');return}
      case'tabular':case'array':case'tabularx':case'longtable':case'tabulary':{let a3=a2;if(base==='tabularx'||base==='tabulary'){const w=readArg(S,a3,b2);if(w)a3=w.end}
        const o=readOpt(S,a3,b2);if(o)a3=o.end;const sp=readArg(S,a3,b2);if(!sp){C.logw('error','Missing column specification for tabular',S,p);return}block('<div class="tabwrap">'+tabular(sp.end,b2,p,R(sp))+'</div>');return}
      case'verbatim':case'lstlisting':case'minted':case'Verbatim':{let a3=a2;if(base==='minted'){const l=readArg(S,a3,b2);if(l)a3=l.end}const o=base!=='verbatim'?readOpt(S,a3,b2):null;if(o)a3=o.end;
        block('<pre class="code"'+dataAttr(p)+'>'+esc(t.slice(a3,b2).replace(/^\n/,'').replace(/\n\s*$/,''))+'</pre>');return}
      case'quote':case'quotation':block('<blockquote'+dataAttr(p)+'>'+bodyBlocks(a2,b2)+'</blockquote>');return;
      case'center':block('<div class="center"'+dataAttr(p)+'>'+bodyBlocks(a2,b2)+'</div>');return;
      case'flushleft':block('<div class="left"'+dataAttr(p)+'>'+bodyBlocks(a2,b2)+'</div>');return;
      case'flushright':block('<div class="right"'+dataAttr(p)+'>'+bodyBlocks(a2,b2)+'</div>');return;
      case'minipage':{const w=readArg(S,readOpt(S,a2,b2)?readOpt(S,a2,b2).end:a2,b2);block('<div class="mini"'+dataAttr(p)+' style="width:'+(w?cssLen(R(w)):'50%')+'">'+bodyBlocks(w?w.end:a2,b2)+'</div>');return}
      case'thebibliography':{let n=0;const w=readArg(S,a2,b2);let q=w?w.end:a2;const re=/\\bibitem\s*(\[[^\]]*\])?\s*\{([^}]*)\}/g;re.lastIndex=q;let m,cur=null,items=[];
        while((m=re.exec(t))&&m.index<b2){if(cur)cur.e=m.index;cur={k:m[2],a:re.lastIndex,e:b2};items.push(cur)}
        items.forEach(it=>{n++;C.bibManual[it.k]={num:n,html:subInl({a:it.a,b:it.e}).trim()}});C.bibShown=true;C.cited=C.cited.concat(items.map(x=>x.k).filter(k=>C.cited.indexOf(k)<0));
        block(bibHtml(C,'References'));return}
      case'tikzpicture':case'pgfpicture':case'axis':C.logw('warn','TikZ/PGF pictures are not rendered in this preview',S,p);block('<div class="ph-img"'+dataAttr(p)+'>TikZ picture (not rendered in preview)</div>');return;
      case'titlepage':block('<div class="titlepage center"'+dataAttr(p)+'>'+bodyBlocks(a2,b2)+'</div>');return;
      case'small':case'footnotesize':case'scriptsize':case'large':case'Large':case'tiny':case'normalsize':case'huge':block('<div style="font-size:'+SIZES[base]+'"'+dataAttr(p)+'>'+bodyBlocks(a2,b2)+'</div>');return;
      case'multicols':case'spacing':case'sloppypar':case'samepage':case'adjustwidth':case'singlespace':case'doublespace':case'onehalfspace':case'landscape':case'frame':block(bodyBlocks(a2,b2));return;
      case'filecontents':return;
    }
    C.logw('warn',"Environment '"+name+"' is not supported; content shown as-is",S,p);block(bodyBlocks(a2,b2))}

  function qedIn(h){return/<\/p>$/.test(h)?h.replace(/<\/p>$/,'<span class="qed">∎</span></p>'):h+'<span class="qed">∎</span>'}
  function cmd(){
    const p=i;let j=i+1,name,star=false;const ch=t[j];
    if(ch===undefined){i++;return}
    if(/[a-zA-Z@]/.test(ch)){let k=j;while(k<b&&/[a-zA-Z@]/.test(t[k]))k++;name=t.slice(j,k);j=k;if(t[j]==='*'&&!/^(item|\\)$/.test(name)){star=true;j++}}
    else{name=ch;j=j+1}
    const arg=()=>{const g=readArg(S,j,b);if(g)j=g.end;return g};
    const opt=()=>{const g=readOpt(S,j,b);if(g)j=g.end;return g};
    const skipSp=()=>{while(j<b&&/[ \t]/.test(t[j]))j++};
    const user=C.macros[name];
    if(user){const args=[];let np=user.n;if(user.def!==undefined){const o=opt();args.push(o?R(o):user.def);np--}for(let k=0;k<np;k++){const g=arg();args.push(g?R(g):'')}expand(user,args,p);i=j;return}
    if(ACC[name]&&!/[a-zA-Z]/.test(name)||(/^[uvcHr]$/.test(name))){skipSp();let c2='';if(t[j]==='{'){const g=arg();c2=g?R(g).replace(/\\[ij]\b/,m=>m[1]==='i'?'ı':'ȷ').slice(0,1):''}else if(t[j]==='\\'&&/[ij]/.test(t[j+1])){c2=t[j+1]==='i'?'i':'j';j+=2}else{c2=t[j]||'';j++}
      txt(c2?accent(name,c2):'');i=j;return}
    if(Object.prototype.hasOwnProperty.call(SYM,name)){txt(SYM[name]);if(/^[a-zA-Z]+$/.test(name)&&!/^(quad|qquad|enspace|thinspace)$/.test(name))skipSp();i=j;return}
    if(Object.prototype.hasOwnProperty.call(SIZES,name)){decl.push(['<span style="font-size:'+SIZES[name]+'">','</span>']);if(para!=='')para+=decl[decl.length-1][0];i=j;return}
    if(Object.prototype.hasOwnProperty.call(DECL,name)){decl.push(DECL[name]);if(para!=='')para+=DECL[name][0];i=j;return}
    if(Object.prototype.hasOwnProperty.call(IGN,name)){for(let k=0;k<IGN[name];k++){opt();arg()}if(name==='numberwithin'||name==='counterwithin')C.logw('info','\\'+name+' ignored',S,p);i=j;return}
    switch(name){
      case'\\':{if(t[j]==='*')j++;opt();add('<br>');i=j;return}
      case'newline':add('<br>');i=j;return;
      case'par':flush();i=j;return;
      case'noindent':noInd=true;i=j;return;
      case'centering':align='center';i=j;return;
      case'raggedright':align='left';i=j;return;
      case'raggedleft':align='right';i=j;return;
      case'-':case'/':case'@':case'!':i=j;return;
      case'documentclass':{const o=opt(),g=arg();if(g)C.cls=R(g).trim();if(o&&/twocolumn/.test(R(o)))C.logw('info','twocolumn is not rendered in this preview',S,p);i=j;return}
      case'usepackage':case'RequirePackage':{const o=opt(),g=arg();if(g){for(const n of R(g).split(',')){const f=findFile(C.files,n.trim(),['.sty']);if(f&&/\.sty$/.test(f.path)){const S2=mkSrc(f.text,f.path);if(C.depth<8){C.depth++;run(C,S2,0,S2.t.length,true);C.depth--}}
        if(/natbib|biblatex/.test(n)&&o&&/authoryear|round|square/.test(R(o))&&!C.opts.citeSet)C.opts.cite=C.opts.cite||'authoryear'}}i=j;return}
      case'title':{const o=opt(),g=arg();if(g)C.title=subInl(g);i=j;return}
      case'author':{const g=arg();if(g)C.author=R(g);i=j;return}
      case'date':{const g=arg();if(g){C.date=subInl(g);C.dateSet=1}i=j;return}
      case'thanks':{const g=arg();C.fn.push(g?subInl(g):'');C.fnCount++;add('<sup class="fn">'+['*','†','‡','§'][C.fn.length-1]+'</sup>');i=j;return}
      case'maketitle':{const au=C.author.split(/\\and\b/).map(x=>{const S2=mkSrc(x,S.file,ln(p));return'<div class="au">'+run(C,S2,0,S2.t.length,true)+'</div>'}).join('');
        block('<header class="titleblock"'+dataAttr(p)+'><h1 class="title">'+(C.title||'')+'</h1>'+(C.author?'<div class="authors">'+au+'</div>':'')+(C.date||C.date===''?'':'')+'<div class="date">'+(C.date===''&&C.dateSet?'':C.date||todayStr())+'</div></header>');i=j;return}
      case'today':add(todayStr());i=j;return;
      case'keywords':case'Keywords':{const g=arg();block('<p class="keywords"'+dataAttr(p)+'><b>Keywords: </b>'+(g?subInl(g):'')+'</p>');i=j;return}
      case'appendix':C.appx=true;C.sec=[0,0,0,0];i=j;return;
      case'tableofcontents':block('<nav class="toc" data-toc="1"'+dataAttr(p)+'><h2 class="unnum">Contents</h2><div class="tocbody">'+C.tocHtml+'</div></nav>');C.tocPos=1;i=j;return;
      case'newpage':case'clearpage':case'pagebreak':case'cleardoublepage':block('<div class="pgbrk"></div>');i=j;return;
      case'vspace':case'vskip':{const g=arg();const h=g?cssLen(R(g)):'';block('<div style="height:'+(h||'1em')+'"></div>');i=j;return}
      case'hspace':{const g=arg();add('<span style="display:inline-block;width:'+(g?cssLen(R(g))||'1em':'1em')+'"></span>');i=j;return}
      case'smallskip':block('<div style="height:.4em"></div>');i=j;return;
      case'medskip':block('<div style="height:.8em"></div>');i=j;return;
      case'bigskip':block('<div style="height:1.4em"></div>');i=j;return;
      case'phantom':case'hphantom':case'vphantom':arg();i=j;return;
      case'LaTeX':add('<span class="logo">L<sup>a</sup>T<sub>e</sub>X</span>');i=j;return;
      case'TeX':add('<span class="logo">T<sub>e</sub>X</span>');i=j;return;
      case'textbf':case'textit':case'emph':case'textsl':case'textsc':case'texttt':case'textrm':case'textsf':case'textnormal':case'underline':case'uline':case'textsuperscript':case'textsubscript':case'mbox':case'hbox':case'text':case'textup':case'textmd':case'ensuremath2':case'nolinkurl':case'sout':case'st':case'hl':case'mathrm2':{
        const g=arg();if(!g){i=j;return}const h=subInl(g);
        const w={textbf:'b',textit:'i',emph:'em',textsl:'i',textsc:'span class="sc"',texttt:'span class="tt"',textsf:'span class="sf"',underline:'u',uline:'u',textsuperscript:'sup',textsubscript:'sub',sout:'s',st:'s',hl:'mark',nolinkurl:'span class="tt"'}[name];
        add(w?'<'+w+'>'+h+'</'+w.split(' ')[0]+'>':h);i=j;return}
      case'textcolor':case'color':{const c=arg();if(name==='color'){i=j;return}const g=arg();add('<span style="color:'+esc(R(c).replace(/^#?/,/^[0-9a-fA-F]{6}$/.test(R(c))?'#':''))+'">'+(g?subInl(g):'')+'</span>');i=j;return}
      case'colorbox':case'fcolorbox':{if(name==='fcolorbox')arg();arg();const g=arg();add('<span class="cbox">'+(g?subInl(g):'')+'</span>');i=j;return}
      case'footnote':case'footnotetext':{opt();const g=arg();const n=C.fn.length+1;C.fn.push(g?subInl(g):'');add('<sup class="fn"><a href="#fn-'+n+'" id="fnref-'+n+'">'+n+'</a></sup>');i=j;return}
      case'url':case'href':{let u=arg();const uu=u?R(u).replace(/\u0001/g,''):'';let label=esc(uu);if(name==='href'){const g=arg();label=g?subInl(g):label}add('<a href="'+esc(uu)+'" target="_blank" rel="noopener">'+label+'</a>');i=j;return}
      case'verb':{const d=t[j];const e=t.indexOf(d,j+1);if(e<0||e>=b){i=j;return}add('<span class="tt">'+esc(t.slice(j+1,e))+'</span>');i=e+1;return}
      case'label':{const g=arg();if(g){add(setLabel(R(g).trim(),S,p))}i=j;return}
      case'ref':case'pageref':case'eqref':case'autoref':case'cref':case'Cref':case'nameref':case'vref':{const g=arg();if(g)add(R(g).split(',').map(k=>refHtml(k.trim(),name==='eqref'?'eq':name==='autoref'||/cref|vref/i.test(name)?'auto':'plain',p)).join(', '));i=j;return}
      case'cite':case'citep':case'citet':case'citealp':case'citeauthor':case'citeyear':case'parencite':case'textcite':case'autocite':case'Cite':case'citealt':case'footcite':{
        const o1=opt(),o2=opt(),g=arg();let pre='',post='';if(o2){pre=R(o1);post=R(o2)}else if(o1)post=R(o1);
        if(g){const kind=/^(citet|textcite|citealt)$/.test(name)?'t':name==='citeauthor'?'a':name==='citeyear'?'y':'p';add(citeFmt(C,R(g).split(',').map(s=>s.trim()).filter(Boolean),kind,S,p,pre,post.replace(/~/g,' ')))}i=j;return}
      case'nocite':{const g=arg();if(g){for(const k of R(g).split(',').map(s=>s.trim())){if(k==='*'){Object.keys(C.bib).forEach(x=>{if(C.citeNum[x]==null)C.citeNum[x]=Object.keys(C.citeNum).length+1;if(C.cited.indexOf(x)<0)C.cited.push(x)})}else if(C.bib[k]){if(C.citeNum[k]==null)C.citeNum[k]=Object.keys(C.citeNum).length+1;if(C.cited.indexOf(k)<0)C.cited.push(k)}}}i=j;return}
      case'bibliography':case'addbibresource':{const g=arg();if(g)loadBib(C,R(g).replace(/\.bib\b/g,''));if(name==='bibliography'){block(bibHtml(C,C.opts.bibTitle||'References'));C.bibShown=true}i=j;return}
      case'includegraphics':{const o=opt(),g=arg();if(!g){i=j;return}const path=R(g).trim(),f=findFile(C.files,path,['.png','.jpg','.jpeg','.svg','.gif','.webp','.pdf']);let st='';
        if(o){const os=R(o);const w=/width\s*=\s*([^,]+)/.exec(os),h=/height\s*=\s*([^,]+)/.exec(os),sc=/scale\s*=\s*([\d.]+)/.exec(os);if(w)st+='width:'+(cssLen(w[1])||'auto')+';';if(h)st+='height:'+(cssLen(h[1])||'auto')+';';if(sc)st+='zoom:'+sc[1]+';'}
        if(f&&f.bin&&/^data:image/.test(f.bin))add('<img src="'+f.bin+'" alt="'+esc(path)+'" style="'+st+'" data-path="'+esc(f.path)+'">');
        else{C.logw('error',f?"Cannot display '"+path+"' (unsupported format in preview)":"File '"+path+"' not found",S,p);add('<span class="ph-img">Missing image: '+esc(path)+'</span>')}i=j;return}
      case'caption':case'captionof':{if(name==='captionof')arg();opt();const g=arg();const fl=C.floats[C.floats.length-1];
        if(fl){C.cur={num:String(fl.n),kind:fl.kind};block('<figcaption'+dataAttr(p)+'><b>'+(fl.kind==='figure'?'Figure':'Table')+' '+fl.n+'.</b> '+(g?subInl(g):'')+'</figcaption>')}
        else{C.logw('warn','\\caption outside of a figure or table',S,p);if(g)add(subInl(g))}i=j;return}
      case'SI':case'qty':{const o=opt(),v=arg(),u=arg();add(esc(v?R(v):'')+'\u2009'+esc(u?unitStr(R(u)):''));i=j;return}
      case'si':case'unit':{const u=arg();add(esc(u?unitStr(R(u)):''));i=j;return}
      case'num':{const v=arg();add(esc(v?R(v).replace(/e(-?\d+)/i,'×10<sup>$1</sup>'):'').replace(/&amp;times;/g,'×').replace(/×10&lt;sup&gt;(-?\d+)&lt;\/sup&gt;/,'×10<sup>$1</sup>'));i=j;return}
      case'ce':{const g=arg();add(g?esc(R(g)).replace(/(\d+)/g,(m,d,off)=>off===0?d:'<sub>'+d+'</sub>').replace(/\^?([+-])(?=\s|$)/g,'<sup>$1</sup>'):'');i=j;return}
      case'section':case'subsection':case'subsubsection':case'chapter':case'paragraph':case'subparagraph':{opt();const g=arg();if(g)heading(name,star,p,g);i=j;return}
      case'part':{arg();i=j;return}
      case'item':{i=j;return}
      case'input':case'include':case'subfile':{const g=arg();i=j;if(!g)return;const f=findFile(C.files,R(g).trim(),['.tex','.md']);if(!f||f.text==null){C.logw('error',"File '"+R(g).trim()+"' not found",S,p);return}
        if(C.depth>8){C.logw('error','Too many nested \\input',S,p);return}C.depth++;const S2=mkSrc(f.text,f.path);let m0=/\\begin\{document\}/.exec(S2.t),a3=m0?m0.index+m0[0].length:0;const e3=S2.t.lastIndexOf('\\end{document}');
        flush();out.push(run(C,S2,a3,e3>a3?e3:S2.t.length,false));C.depth--;return}
      case'newcommand':case'renewcommand':case'providecommand':case'DeclareRobustCommand':case'def':case'newcommand*':case'gdef':case'let':{
        let nm=arg();if(!nm){i=j;return}let n=0,def;
        if(name==='def'||name==='gdef'){let k=j,ps='';while(k<b&&t[k]!=='{'){ps+=t[k];k++}j=k;const m=/#(\d)/g;let mm;while((mm=m.exec(ps)))n=Math.max(n,+mm[1])}
        else{const o1=opt();if(o1){n=parseInt(R(o1))||0;const o2=opt();if(o2)def=R(o2)}}
        const bd=arg();const mname=R(nm).replace(/^\\/,'');
        if(bd&&/^[a-zA-Z@]+$/.test(mname)){const body=R(bd).replace(/\u0001/g,'');C.macros[mname]={n,def,body};if(def===undefined)C.km['\\'+mname]=body}
        i=j;return}
      case'DeclareMathOperator':{const nm=arg(),bd=arg();if(nm&&bd)C.km[R(nm)]='\\operatorname'+(star?'*':'')+'{'+R(bd)+'}';i=j;return}
      case'newtheorem':{const s2=star;const nm=arg();let cnt=null;const o1=opt();if(o1)cnt=R(o1).trim();const ti=arg();const wi=opt();if(nm&&ti){const k=R(nm).trim();const stl=C._thmStyle||(THM0[k]?THM0[k][1]:'plain');C.thm[k]={title:R(ti).trim(),style:stl,counter:s2?'*'+k:cnt,within:wi?1:(cnt&&C.thm[cnt]?C.thm[cnt].within:0)}}i=j;return}
      case'newenvironment':case'renewenvironment':{arg();opt();arg();arg();C.logw('warn','Custom environments are not supported',S,p);i=j;return}
      case'begin':{const g=arg();if(!g){i=j;return}const nm=R(g).trim();
        if(nm==='document'){i=j;return}
        const e=findEnd(t,j,nm,b);if(!e){C.logw('error','Missing \\end{'+nm+'}',S,p);envBlock(nm,p,j,b);i=b;return}
        envBlock(nm,p,j,e.at);i=e.end;return}
      case'end':{const g=arg();C.logw('error','Unexpected \\end{'+(g?R(g):'')+'}',S,p);i=j;return}
      case'(':{const e=t.indexOf('\\)',j);if(e<0||e>=b){i=j;return}add(mathHtml(C,t.slice(j,e).replace(/\u0001/g,''),false,S,p));i=e+2;return}
      case'[':{const e=t.indexOf('\\]',j);if(e<0||e>=b){i=j;return}block('<div class="eq"'+dataAttr(p)+'>'+mathHtml(C,t.slice(j,e).replace(/\u0001/g,''),true,S,p)+'</div>');noInd=true;i=e+2;return}
      case'ensuremath':{const g=arg();add(g?mathHtml(C,R(g),false,S,p):'');i=j;return}
      case'hline':case'toprule':case'midrule':case'bottomrule':i=j;return;
      case'bibitem':{opt();arg();i=j;return}
      case'bibliographystyle':{arg();i=j;return}
    }
    C.logw('warn','Unknown command \\'+name+(name==='graphicspath'?'':''),S,p);
    // keep braces content of unknown command-with-arg visible
    skipSp();i=j}

  function todayStr(){return new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}

  const ordinary=/[^\\$%{}~\n\-`'&<>\u0001]+/y;
  while(i<b){const c=t[i];
    if(c==='\u0001'){i++;continue}
    if(c==='\\'){cmd();continue}
    if(c==='$'){let disp=t[i+1]==='$',e;const s0=i+(disp?2:1);
      if(disp)e=t.indexOf('$$',s0);else{e=s0;while(e<b&&t[e]!=='$'){if(t[e]==='\\')e++;e++}}
      if(e<0||e>=b){C.logw('error','Unterminated math (missing $)',S,i);i=b;break}
      const src=t.slice(s0,e).replace(/\u0001/g,'');
      if(disp){block('<div class="eq"'+dataAttr(i)+'>'+mathHtml(C,src,true,S,i)+'</div>');noInd=true}else add(mathHtml(C,src,false,S,i));
      i=e+(disp?2:1);continue}
    if(c==='{'){const m=matchBrace(t,i);if(m<0||m>=b){C.logw('error','Unmatched { ',S,i);i++;continue}
      const save=decl;add(run(C,S,i+1,m,true));i=m+1;continue}
    if(c==='}'){C.logw('warn','Unmatched }',S,i);i++;continue}
    if(c==='~'){add('&nbsp;');lastSp=false;i++;continue}
    if(c==='\n'){let k=i+1;while(k<b&&(t[k]===' '||t[k]==='\t'||t[k]==='\r'))k++;
      if(k<b&&t[k]==='\n'){flush();i=k;while(i<b&&/[\s]/.test(t[i]))i++;continue}
      txt(' ');i++;continue}
    if(c==='-'){let k=i;while(t[k]==='-'&&k-i<3)k++;const n=k-i;add(n===1?'-':n===2?'–':'—');i=k;continue}
    if(c==='`'){if(t[i+1]==='`'){add('“');i+=2}else{add('‘');i++}continue}
    if(c==="'"){if(t[i+1]==="'"){add('”');i+=2}else{add('’');i++}continue}
    if(c==='&'||c==='<'||c==='>'){txt(c);i++;continue}
    ordinary.lastIndex=i;const m=ordinary.exec(t);if(m&&m.index===i){const seg=m[0];const bb=Math.min(seg.length,b-i);txt(seg.slice(0,bb));i+=bb}else i++}
  flush();
  if(inl){return out.join('')+decl.slice().reverse().map(d=>d[1]).join('')}
  return out.join('')}

function compileTex(files,mainPath,opts){
  const C=newCtx(files,Object.assign({},opts));mkLog(C);C.tocHtml='';
  const mf=findFile(files,mainPath);if(!mf)return{html:'',outline:[],log:[{type:'error',msg:'Main file not found'}],kind:'tex'};
  C.hasCh=/\\chapter\b/.test(mf.text);bibAll(C);
  const S0=mkSrc(mf.text,mf.path);let html='';
  for(C.pass=1;C.pass<=2;C.pass++){
    const keep={bib:C.bib,citeNum:C.citeNum,bibManual:C.bibManual,labels:C.newLabels||{},tocHtml:C.tocHtml};
    resetPass(C);C.bib=keep.bib;C.citeNum=keep.citeNum;C.labels=keep.labels;C.tocHtml=keep.tocHtml;C.bibManual=C.pass===1?{}:keep.bibManual;C.macros={};C.km={};C.thm=Object.assign({},THM0);C.title=C.author=C.date='';C.dateSet=0;
    const S=C.pass===1?S0:mkSrc(mf.text,mf.path);const m=/\\begin\{document\}/.exec(S.t);let a=0,b=S.t.length;
    if(m){C.depth=0;run(C,S,0,m.index,true);a=m.index+m[0].length;const e=S.t.lastIndexOf('\\end{document}');if(e>=a)b=e;else C.logw('warn','Missing \\end{document}',S,S.t.length-1)}
    else if(C.pass===2)C.logw('info','No \\begin{document}; compiling as a fragment',S,0);
    html=run(C,S,a,b,false);
    if(C.pass===1){C.tocHtml='<ul>'+C.outline.filter(o=>o.level<=2).map(o=>'<li class="t'+o.level+'"><a href="#'+o.id+'" data-target="'+o.id+'"><span class="tt1">'+(o.num?o.num+'&emsp;':'')+esc(o.title)+'</span><span class="pg"></span></a></li>').join('')+'</ul>'}
    if(C.pass===2){
      if(C.fn.length)html+='<section class="footnotes"><hr><ol>'+C.fn.map((f,n)=>'<li id="fn-'+(n+1)+'" value="'+(n+1)+'">'+f+' <a href="#fnref-'+(n+1)+'" class="fnb">↩</a></li>').join('')+'</ol></section>';
      if(!C.bibShown&&C.cited.length){html+=bibHtml(C,C.opts.bibTitle||'References')}
      const un=Object.keys(C.bib).length;if(!un&&/\\cite/.test(S.t))C.logw('warn','No bibliography entries found (add a .bib file and \\bibliography{...})',S,0)}}
  return{html,outline:C.outline,log:C.log,kind:'tex',cls:C.cls,title:plain(C.title),labels:Object.keys(C.newLabels||{}),bibKeys:Object.keys(C.bib),stats:{cites:C.cited.length,eq:C.eq,figs:C.fig,tabs:C.tab}}}

/* ---------- Markdown ---------- */
function compileMd(files,mainPath,opts){
  const C=newCtx(files,Object.assign({},opts));mkLog(C);C.pass=2;resetPass(C);C.pass=2;bibAll(C);
  const mf=findFile(files,mainPath);if(!mf)return{html:'',outline:[],log:[{type:'error',msg:'Main file not found'}],kind:'md'};
  let src=mf.text.replace(/\r/g,''),meta={},off=0;
  const fm=/^---\n([\s\S]*?)\n---\n/.exec(src);if(fm){fm[1].split('\n').forEach(l=>{const m=/^(\w+):\s*(.*)$/.exec(l);if(m)meta[m[1].toLowerCase()]=m[2].replace(/^["']|["']$/g,'')});off=fm[0].split('\n').length-1;src=src.slice(fm[0].length)}
  const lines=src.split('\n'),notes={},noteOrder=[];
  let figN=0,tabN=0;
  // collect footnote definitions
  for(let k=0;k<lines.length;k++){const m=/^\[\^([^\]]+)\]:\s*(.*)$/.exec(lines[k]);if(m){notes[m[1]]=m[2];let q=k+1;while(q<lines.length&&/^( {2,}|\t)\S/.test(lines[q])){notes[m[1]]+=' '+lines[q].trim();lines[q]='';q++}lines[k]=''}}
  const F=esc(mf.path),SM={file:mf.path,fixed:0};
  function inline(s){
    const hold=[];const ph=h=>{hold.push(h);return'\u0002'+(hold.length-1)+'\u0003'};
    s=s.replace(/`([^`]+)`/g,(m,c)=>ph('<code>'+esc(c)+'</code>'));
    s=s.replace(/\$\$([^$]+)\$\$/g,(m,x)=>ph(mathHtml(C,x,true,SM,0)));
    s=s.replace(/(^|[^\\$\d])\$(?!\s)([^$\n]*?[^\s\\$])\$(?!\d)/g,(m,pre,x)=>pre+ph(mathHtml(C,x,false,SM,0)));
    s=s.replace(/\\\$/g,'$');
    s=s.replace(/\[@([^\]]+)\]/g,(m,k)=>{const keys=k.split(/;\s*/).map(x=>x.replace(/^@/,'').trim());return ph(citeFmt(C,keys,'p',SM,0,'',''))});
    s=s.replace(/(^|[\s(])@([A-Za-z][\w:.-]*\w)(?=[\s.,;:)]|$)/g,(m,pre,k)=>C.bib[k]?pre+ph(citeFmt(C,[k],'t',SM,0,'','')):m);
    s=s.replace(/\[\^([^\]]+)\]/g,(m,k)=>{if(!(k in notes))return m;let n=noteOrder.indexOf(k)+1;if(!n){noteOrder.push(k);n=noteOrder.length}return ph('<sup class="fn"><a href="#fn-'+n+'" id="fnref-'+n+'">'+n+'</a></sup>')});
    s=s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)(\{[^}]*\})?/g,(m,alt,u,at)=>{const f=findFile(files,decodeURI(u));let st='';const w=at&&/width\s*=\s*([\d.]+(?:%|px|cm|mm)?)/.exec(at);if(w)st='width:'+(/^[\d.]+$/.test(w[1])?w[1]+'px':w[1]);
      if(f&&f.bin)return ph('<img src="'+f.bin+'" alt="'+esc(alt)+'" style="'+st+'" data-path="'+esc(f.path)+'">');
      if(/^(https?:|data:image)/.test(u))return ph('<img src="'+esc(u)+'" alt="'+esc(alt)+'" style="'+st+'">');
      C.log.push({type:'error',msg:"Image '"+u+"' not found",file:mf.path,line:null});return ph('<span class="ph-img">Missing image: '+esc(u)+'</span>')});
    s=s.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g,(m,tx,u)=>ph('<a href="'+esc(u)+'" target="_blank" rel="noopener">'+esc(tx)+'</a>'));
    s=s.replace(/<(https?:\/\/[^>\s]+)>/g,(m,u)=>ph('<a href="'+esc(u)+'" target="_blank" rel="noopener">'+esc(u)+'</a>'));
    s=esc(s);
    s=s.replace(/\*\*\*([^*]+)\*\*\*/g,'<b><i>$1</i></b>').replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>').replace(/__([^_]+)__/g,'<b>$1</b>').replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g,'$1<i>$2</i>').replace(/(^|[^_\w])_([^_\s][^_]*?)_(?!\w)/g,'$1<i>$2</i>')
      .replace(/~~([^~]+)~~/g,'<s>$1</s>').replace(/==([^=]+)==/g,'<mark>$1</mark>').replace(/\^([^^\s]+)\^/g,'<sup>$1</sup>').replace(/~([^~\s]+)~/g,'<sub>$1</sub>')
      .replace(/(  |\\)\n/g,'<br>').replace(/&lt;br&gt;/g,'<br>');
    return s.replace(/\u0002(\d+)\u0003/g,(m,n)=>hold[+n])}
  const out=[];let L=0;
  const d=n=>' data-f="'+F+'" data-l="'+(n+off+1)+'"';
  function parseBlock(ls,base){
    const o=[];let k=0;const lineNo=x=>base+x;
    while(k<ls.length){let l=ls[k];
      if(!l.trim()){k++;continue}
      let m;
      if((m=/^(```+|~~~+)\s*([\w+-]*)/.exec(l))){const fence=m[1];let q=k+1;const buf=[];while(q<ls.length&&!ls[q].startsWith(fence.slice(0,3))){buf.push(ls[q]);q++}
        if(m[2]==='math'||m[2]==='latex'&&0)o.push('<div class="eq"'+d(lineNo(k))+'>'+mathHtml(C,buf.join('\n'),true,SM,0)+'</div>');
        else o.push('<pre class="code"'+d(lineNo(k))+'>'+esc(buf.join('\n'))+'</pre>');k=q+1;continue}
      if(/^\s*\$\$/.test(l)){let q=k,buf=[];const first=l.replace(/^\s*\$\$/,'');if(/\$\$\s*$/.test(first)&&first.trim()!=='$$'&&first.trim()!==''){buf=[first.replace(/\$\$\s*$/,'')];q=k}
        else{if(first.trim())buf.push(first);q=k+1;while(q<ls.length&&!/\$\$\s*$/.test(ls[q])){buf.push(ls[q]);q++}if(q<ls.length)buf.push(ls[q].replace(/\$\$\s*$/,''))}
        o.push('<div class="eq"'+d(lineNo(k))+'>'+mathHtml(C,buf.join('\n'),true,SM,0)+'</div>');k=q+1;continue}
      if((m=/^(#{1,6})\s+(.*?)(?:\s+#+)?(?:\s*\{#([\w-]+)\})?$/.exec(l))){const lv=m[1].length,id='sec-'+(C.outline.length+1);C.outline.push({level:Math.max(0,lv-1),num:'',title:m[2].replace(/[*_`$]/g,''),file:mf.path,line:lineNo(k)+off+1,id});
        o.push('<h'+Math.min(lv+1,6)+' class="sec unnum" id="'+id+'"'+d(lineNo(k))+'>'+inline(m[2])+'</h'+Math.min(lv+1,6)+'>');k++;continue}
      if(/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(l)){o.push('<hr>');k++;continue}
      if(/^\s*(\\(newpage|pagebreak|clearpage)|<!--\s*pagebreak\s*-->|\\\\newpage)\s*$/.test(l)){o.push('<div class="pgbrk"></div>');k++;continue}
      if(/^\s*\[TOC\]\s*$/i.test(l)){o.push('<nav class="toc" data-toc="1"><h2 class="unnum">Contents</h2><div class="tocbody">@@TOC@@</div></nav>');k++;continue}
      if(/^>/.test(l)){let q=k;const buf=[];while(q<ls.length&&/^>/.test(ls[q])){buf.push(ls[q].replace(/^>\s?/,''));q++}
        let cls='',first=buf[0];const cm=/^\[!(\w+)\]\s*(.*)$/.exec(first);if(cm){cls=' callout '+cm[1].toLowerCase();buf[0]=cm[2];o.push('<blockquote class="'+cls.trim()+'"'+d(lineNo(k))+'><div class="ct">'+cm[1]+'</div>'+parseBlock(buf,lineNo(k)).join('')+'</blockquote>')}
        else o.push('<blockquote'+d(lineNo(k))+'>'+parseBlock(buf,lineNo(k)).join('')+'</blockquote>');k=q;continue}
      if(/^\s*\|.*\|\s*$/.test(l)&&k+1<ls.length&&/^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(ls[k+1])){
        const split=r=>r.trim().replace(/^\||\|$/g,'').split(/(?<!\\)\|/).map(x=>x.trim().replace(/\\\|/g,'|'));
        const head=split(l),al=split(ls[k+1]).map(x=>/^:-+:$/.test(x)?'c':/-:$/.test(x)?'r':'l');let q=k+2;const rows=[];while(q<ls.length&&/\|/.test(ls[q])&&ls[q].trim()){rows.push(split(ls[q]));q++}
        let cap='';let q2=q;while(q2<ls.length&&!ls[q2].trim())q2++;const cm=/^Table:\s*(.*)$/.exec(ls[q2]||'');if(cm){cap=cm[1];q=q2+1}
        let h='<div class="tabwrap">'+(cap?'<div class="tcap">'+(++tabN&&'<b>Table '+tabN+'.</b> ')+inline(cap)+'</div>':'')+'<table class="tab grid"'+d(lineNo(k))+'><thead><tr>'+head.map((c,x)=>'<th class="'+(al[x]||'l')+'">'+inline(c)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+head.map((c,x)=>'<td class="'+(al[x]||'l')+'">'+inline(r[x]||'')+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
        o.push(h);k=q;continue}
      if(/^(\s*)([-*+]|\d+[.)])\s+/.test(l)){const r=parseList(ls,k,lineNo);o.push(r.html);k=r.k;continue}
      // paragraph (or standalone figure)
      let q=k;const buf=[];while(q<ls.length&&ls[q].trim()&&!/^(```|~~~|#{1,6}\s|>|\s*\$\$|\s*(-{3,}|\*{3,})\s*$|\s*([-*+]|\d+[.)])\s)/.test(ls[q])&&!(q>k&&/^\s*\|.*\|\s*$/.test(ls[q])&&/^\s*\|?\s*:?-{2,}/.test(ls[q+1]||''))){buf.push(ls[q]);q++}
      if(!buf.length){buf.push(ls[q]);q++}
      const para=buf.join('\n');const fg=/^!\[([^\]]*)\]\(([^)]+)\)(\{[^}]*\})?\s*$/.exec(para.trim());
      if(fg&&fg[1]){figN++;o.push('<figure class="figure"'+d(lineNo(k))+'><p>'+inline(para.trim().replace(/^!\[[^\]]*\]/,'![]'))+'</p><figcaption><b>Figure '+figN+'.</b> '+inline(fg[1])+'</figcaption></figure>')}
      else o.push('<p'+d(lineNo(k))+'>'+inline(para)+'</p>');
      k=q}
    return o}
  function parseList(ls,k,lineNo){
    const m0=/^(\s*)([-*+]|\d+[.)])\s+/.exec(ls[k]);const ind=m0[1].length,ord=/\d/.test(m0[2]);let items=[],cur=null,q=k;
    while(q<ls.length){const l=ls[q];const m=/^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(l);
      if(m&&m[1].length===ind&&/\d/.test(m[2])===ord){cur={t:[m[3]],sub:[],ln:q};items.push(cur);q++;continue}
      if(!l.trim()){if(q+1<ls.length&&/^\s/.test(ls[q+1])&&cur){cur.sub.push('');q++;continue}break}
      if(cur&&(m?m[1].length>ind:/^\s+\S/.test(l)&&l.search(/\S/)>ind)){cur.sub.push(l.slice(Math.min(ind+2,l.search(/\S/))));q++;continue}
      if(cur&&!m&&!/^\s/.test(l)&&!/^(#|>|```|\|)/.test(l)){cur.t.push(l);q++;continue}
      break}
    const tag=ord?'ol':'ul';
    const html='<'+tag+' class="l0"'+d(lineNo(k))+'>'+items.map(it=>{let first=it.t.join('\n'),task='';const tm=/^\[([ xX])\]\s+(.*)$/.exec(first);if(tm){task='<input type="checkbox" disabled'+(tm[1]!==' '?' checked':'')+'> ';first=tm[2]}
      const subs=it.sub.some(x=>x.trim())?parseBlock(it.sub,lineNo(it.ln)).join(''):'';return'<li'+(tm?' class="task"':'')+d(lineNo(it.ln))+'>'+task+inline(first)+subs+'</li>'}).join('')+'</'+tag+'>';
    return{html,k:q}}
  out.push(...parseBlock(lines,0));
  let head='';
  if(meta.title||meta.author||meta.date)head='<header class="titleblock"><h1 class="title">'+esc(meta.title||'')+'</h1>'+(meta.author?'<div class="authors"><div class="au">'+esc(meta.author)+'</div></div>':'')+(meta.date?'<div class="date">'+esc(meta.date==='today'?new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}):meta.date)+'</div>':'')+'</header>';
  if(meta.abstract)head+='<div class="abstract"><h4>Abstract</h4><p>'+esc(meta.abstract)+'</p></div>';
  let html=head+out.join('');
  const toc='<ul>'+C.outline.filter(o=>o.level<=2).map(o=>'<li class="t'+o.level+'"><a href="#'+o.id+'" data-target="'+o.id+'"><span class="tt1">'+esc(o.title)+'</span><span class="pg"></span></a></li>').join('')+'</ul>';
  html=html.replace('@@TOC@@',toc);
  if(noteOrder.length)html+='<section class="footnotes"><hr><ol>'+noteOrder.map((k,n)=>'<li id="fn-'+(n+1)+'" value="'+(n+1)+'">'+inline(notes[k])+' <a href="#fnref-'+(n+1)+'" class="fnb">↩</a></li>').join('')+'</ol></section>';
  if(C.cited.length)html+=bibHtml(C,opts&&opts.bibTitle||'References');
  return{html,outline:C.outline,log:C.log,kind:'md',title:meta.title||'',labels:[],bibKeys:Object.keys(C.bib),stats:{cites:C.cited.length,figs:figN,tabs:tabN}}}

function compile(files,main,opts){
  try{const f=findFile(files,main);if(!f)return{html:'<p class="empty">No main document. Create a <code>.tex</code> or <code>.md</code> file and set it as the main document.</p>',outline:[],log:[{type:'error',msg:'No main document'}],kind:'none'};
    return /\.(md|markdown)$/i.test(f.path)?compileMd(files,main,opts):compileTex(files,main,opts)}
  catch(e){return{html:'<p class="empty">Compiler crashed: '+esc(e.message)+'</p>',outline:[],log:[{type:'error',msg:'Internal compiler error: '+e.message}],kind:'none'}}}

window.DSC={compile,parseBib,esc,detex,findFile,fmtBib,plain};
})();
