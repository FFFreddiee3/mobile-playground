export const SPEED_MIN=.1,SPEED_MAX=5;
export function boundedSpeed(value){const n=Number(value);if(!Number.isFinite(n))return null;return Math.round(Math.max(SPEED_MIN,Math.min(SPEED_MAX,n))*10)/10;}
export function transitionProgress(t){t=Math.max(0,Math.min(1,t));return t*t*t*(t*(t*6-15)+10);}

// 统计真实帧间隔，慢帧保留在样本里。平均帧率不能替代最慢帧或 p99 帧间隔。
export function frameStatistics(samples){
 if(!samples.length)return null;
 const sorted=[...samples].sort((a,b)=>a-b),sum=samples.reduce((a,b)=>a+b,0);
 const percentile=p=>sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*p)-1)];
 return {count:samples.length,fps:1000*samples.length/sum,p95:percentile(.95),p99:percentile(.99),max:sorted.at(-1),p99Fps:1000/percentile(.99),overBudget:samples.filter(v=>v>1000/120).length};
}

// 临界阻尼的解析解。中途改目标保留位置与速度，不重启一条从静止出发的曲线。
export class MotionValue {
 constructor(value=0,frequency=12){this.value=value;this.velocity=0;this.target=value;this.frequency=frequency;this.delay=0;}
 reset(value){this.value=this.target=value;this.velocity=0;this.delay=0;}
 to(value,delay=0){this.target=value;this.delay=delay;}
 get active(){return this.delay>0||this.value!==this.target||this.velocity!==0;}
 step(seconds){
  let dt=Math.max(0,seconds);
  if(this.delay>0){const wait=Math.min(dt,this.delay);this.delay-=wait;dt-=wait;}
  if(!dt)return 0;
  if(!this.active)return this.value*dt;
  const w=this.frequency,x=this.value-this.target,b=this.velocity+w*x,decay=Math.exp(-w*dt);
  // 同时返回这段时间的积分，让变速过程不依赖屏幕刷新率。
  const integral=this.target*dt+x*(1-decay)/w+b*(1-decay*(1+w*dt))/(w*w);
  this.value=this.target+(x+b*dt)*decay;
  this.velocity=(this.velocity-w*b*dt)*decay;
  if(Math.abs(this.value-this.target)<1e-5&&Math.abs(this.velocity)<1e-4){this.value=this.target;this.velocity=0;}
  return integral;
 }
}

// 画质只在持续慢帧时降低，恢复需要更长稳定窗口，避免反复改变分辨率。
export class ResolutionGovernor {
 constructor(max=1.5){this.max=max;this.value=max;this.slow=0;this.fast=0;}
 sample(p95){
  this.slow=p95>21?this.slow+1:0;this.fast=p95<12.5?this.fast+1:0;
  const previous=this.value;
  if(this.slow>=2){this.value=Math.max(.8,this.value-.15);this.slow=this.fast=0;}
  if(this.fast>=5){this.value=Math.min(this.max,this.value+.1);this.slow=this.fast=0;}
  return Math.abs(previous-this.value)>.001;
 }
}

// 页面返回与图形上下文恢复共用同一个唤醒入口，不改变用户的暂停或模型状态。
export function bindRenderLifecycle({canvas,document:doc,window:win,suspend,resume,rebuild,onError}){
 let lost=false,restoring=false,pageHidden=false,disposed=false,generation=0;
 const ready=()=>!disposed&&!lost&&!restoring&&!pageHidden&&!doc.hidden;
 function contextLost(event){event.preventDefault();generation++;lost=true;restoring=false;suspend('context-lost');}
 async function contextRestored(){
  if(disposed||!lost)return;
  lost=false;restoring=true;const current=++generation;
  try{
   await rebuild();
   if(disposed||current!==generation)return;
   restoring=false;if(ready())resume();
  }catch(error){if(!disposed&&current===generation)onError(error);}
 }
 function visibilityChanged(){if(doc.hidden)suspend('hidden');else if(ready())resume();}
 function pageHide(){pageHidden=true;suspend('hidden');}
 function pageShow(){pageHidden=false;if(ready())resume();}
 const bindings=[[canvas,'webglcontextlost',contextLost],[canvas,'webglcontextrestored',contextRestored],[doc,'visibilitychange',visibilityChanged],[win,'pagehide',pageHide],[win,'pageshow',pageShow]];
 for(const [target,event,handler]of bindings)target.addEventListener(event,handler);
 return {get ready(){return ready();},dispose(){disposed=true;generation++;for(const [target,event,handler]of bindings)target.removeEventListener(event,handler);}};
}
