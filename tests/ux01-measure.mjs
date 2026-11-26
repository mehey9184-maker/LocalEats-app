// UX-01 observations only. No runtime application changes. Measurements are synthetic fixture evidence.
export function scan(){
 const round=n=>Math.round(n*10)/10;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=1;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});
 function rgba(value){try{ctx.clearRect(0,0,1,1);ctx.fillStyle='#000';ctx.fillStyle=value;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data].map((v,i)=>i===3?v/255:v);}catch{return null;}}
 const composite=(a,b)=>[0,1,2].map(i=>a[i]*a[3]+b[i]*(1-a[3])).concat(1);
 const lum=a=>a.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
 function contrast(el){const chain=[];for(let n=el;n;n=n.parentElement){let c=getComputedStyle(n);if(c.backgroundImage!=='none'||Number(c.opacity)!==1||c.mixBlendMode!=='normal'||c.filter!=='none'||c.backdropFilter!=='none')return null;chain.unshift(c);}
  let bg=[255,255,255,1];for(const c of chain){const v=rgba(c.backgroundColor);if(!v)return null;bg=composite(v,bg);}
  const c=getComputedStyle(el),f=rgba(c.color);if(!f)return null;const fg=composite(f,bg),a=lum(fg),b=lum(bg);return round((Math.max(a,b)+.05)/(Math.min(a,b)+.05));}
 const visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'&&!e.closest('[aria-hidden="true"]');};
 const label=e=>(e.getAttribute('aria-label')||e.getAttribute('title')||e.innerText||e.getAttribute('placeholder')||e.getAttribute('name')||'').trim().replace(/\s+/g,' ').slice(0,100);
 const nodes=[...document.querySelectorAll('button,a[href],input,select,textarea,summary,[role=button],[role=tab]')].filter(visible);
 const boxes=nodes.map(e=>e.getBoundingClientRect());
 const controls=nodes.map((e,i)=>{const r=boxes[i],c=getComputedStyle(e),x=r.x+r.width/2,y=r.y+r.height/2,onscreen=x>=0&&x<innerWidth&&y>=0&&y<innerHeight,hit=onscreen?document.elementFromPoint(x,y):null;
  const gaps=boxes.filter((_,j)=>j!==i).map(b=>Math.hypot(Math.max(0,r.left-b.right,b.left-r.right),Math.max(0,r.top-b.bottom,b.top-r.bottom)));
  return {label:label(e),tag:e.tagName,disabled:!!e.disabled||e.getAttribute('aria-disabled')==='true',w:round(r.width),h:round(r.height),x:round(r.x),y:round(r.y),centerViewport:onscreen,centerHit:onscreen?!!hit&&(e===hit||e.contains(hit)):null,nearestGap:gaps.length?round(Math.min(...gaps)):null,fontPx:parseFloat(c.fontSize),contrastEstimate:contrast(e),transition:c.transitionDuration,animation:c.animationDuration,focusable:e.tabIndex>=0};});
 const text=[...document.querySelectorAll('body *')].filter(e=>visible(e)&&e.childElementCount===0&&e.innerText?.trim()&&!['SCRIPT','STYLE','SVG','PATH'].includes(e.tagName)).slice(0,160).map(e=>({label:label(e),fontPx:parseFloat(getComputedStyle(e).fontSize),contrastEstimate:contrast(e)}));
 return {width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,theme:document.documentElement.classList.contains('dark')?'dark':'light',controls,text,activeAnimations:document.getAnimations().length};
}
export function summarize(data){const enabled=data.controls.filter(x=>!x.disabled),small=enabled.filter(x=>x.w<44||x.h<44),low=data.text.filter(x=>x.contrastEstimate!==null&&x.contrastEstimate<4.5&&x.fontPx<24);return {width:data.width,height:data.height,reduced:data.reduced,theme:data.theme,overflow:Math.max(0,data.scrollWidth-data.width),controls:enabled.length,under44:small.map(x=>({label:x.label,w:x.w,h:x.h})).slice(0,15),occludedCenters:enabled.filter(x=>x.centerHit===false).map(x=>x.label).slice(0,15),contrastSampled:data.text.filter(x=>x.contrastEstimate!==null).length,lowContrastCandidates:low.slice(0,12),motion:enabled.map(x=>({label:x.label,transition:x.transition,animation:x.animation})).filter(x=>x.transition!=='0s'||x.animation!=='0s').slice(0,8)};}
