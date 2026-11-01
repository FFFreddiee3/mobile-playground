import * as T from '#three';
import {makeBuilder} from '#geometry';
import {offsets} from '#vehicle-kit';
import {instantiateAsset} from '#glb';
const PI=Math.PI;
// 几何由blender/models.py建模导出为models/models.glb，本模块按部件与子组名称驱动运动。
// 1个模型单位=0.5m：总长5021mm、不含后视镜总宽1987mm、总高1430mm、轴距2960mm、轮距1690mm，
// 前后悬961/1100mm、离地间隙126mm、轮胎255/45R19与285/40R19，取自Tesla Model S用户手册Dimensions与Wheels and Tires页。
const SPEC={
 L:5021/500,W:1987/500,H:1430/500,
 axles:[{x:-5021/1000+961/500,R:(19*25.4/2+255*.45)/500,w:255/500,z:1690/1000,steer:true},
        {x:-5021/1000+(961+2960)/500,R:(19*25.4/2+285*.40)/500,w:285/500,z:1690/1000,steer:false}]};
const DK=.12,STEER=.2,TIE=.48,ARM=-.26;
const PARTS=[
 ['chassis','底盘与承载结构','CHASSIS','铝制地板承托底置电池，前后副车架纵梁连接悬架与电驱。',[0,-1.1,0]],
 ['body','车身与翼子板','BODY PANELS','连续车身围绕承载结构，四处轮拱与黑色内衬为车轮转动和前轮转向保留空间。',[0,1.5,-2.4]],
 ['hood','前备箱盖','FRONT HOOD','前备箱盖沿车头轮廓闭合，移开后可观察前电驱、转向机与散热器。',[-2.4,1.8,0]],
 ['roof','全玻璃车顶与前后风挡','ROOF & GLAZING','玻璃和车顶共用边缘轮廓，侧窗向车内倾斜并连接车顶。',[0,2.4,0]],
 ['doorL','左侧前后车门组','SIDE DOOR','车门、倾斜侧窗和密封边框组成可单独移开的部件组。',[0,.7,-2.6]],
 ['doorR','右侧前后车门组','SIDE DOOR','车门、倾斜侧窗和密封边框组成可单独移开的部件组。',[0,.7,2.6]],
 ['rear','尾门与后舱','REAR DECK','尾门与尾部轮廓闭合，移开后可观察后电驱与后轴。',[2.2,2,0]],
 ['cabin','五座乘员舱','CABIN','前排独立座椅、中控台与横置大屏，后排三个座位。',[0,1.6,2.1]],
 ['suspension','悬架与转向机构','SUSPENSION','前轴双叉臂与后轴连杆经减震支柱和转向节连接底盘与车轮，齿条经横拉杆推动前轮转向节。',[0,-.8,2.2]],
 ['wheel0L','前左车轮与轮毂','WHEEL','轮胎、轮辋与轮毂绕轮轴转动，并随转向节绕主销偏转。',[-.55,-.25,-2.3]],
 ['wheel0R','前右车轮与轮毂','WHEEL','轮胎、轮辋与轮毂绕轮轴转动，并随转向节绕主销偏转。',[-.55,-.25,2.3]],
 ['wheel1L','后左车轮与轮毂','WHEEL','轮胎、轮辋与轮毂绕轮轴转动。',[.55,-.25,-2.3]],
 ['wheel1R','后右车轮与轮毂','WHEEL','轮胎、轮辋与轮毂绕轮轴转动。',[.55,-.25,2.3]],
 ['brakes','四轮制动系统','BRAKES','制动盘随车轮转动，卡钳固定在转向节上并随前轮转向偏转。',[0,1.2,-2.5]],
 ['power','前后电驱总成','POWERTRAIN','前后两套电机与减速器经半轴驱动四轮，端盘显示转子转动。',[1.5,1.8,1.8]],
 ['battery','底置电池包','BATTERY PACK','电池模块排布在地板下方的托盘内，橙色高压线连接前后电驱。',[0,-1.8,0]],
 ['thermal','冷却回路与前舱','COOLING','前置散热器经冷却管连接前电驱。',[-2,1.2,-2.1]],
 ['lights','灯组与外部细节','LIGHTING','前灯、尾灯、侧面装饰线与后视镜沿车身布置。',[0,1.5,2.5]]
];
export const INFO={basis:'总长5021mm、不含后视镜总宽1987mm、总高1430mm、轴距2960mm、前后轮距1690mm、前后悬961/1100mm、离地间隙126mm与轮胎255/45R19、285/40R19取自Tesla Model S用户手册Dimensions与Wheels and Tires页；正交轮廓按该手册Dimensions页的厂商尺寸图（正面与侧面两个视图）逐段比对。车身曲面、悬架几何、电驱与电池内部尺寸属于网页造型补全，不是制造图纸。',source:'https://www.tesla.com/ownersmanual/models/en_us/GUID-91E5877F-3CD2-4B3B-B2B8-B5DB4A6C0A05.html',sourceName:'Tesla Model S 用户手册 Dimensions'};
export function build(materials,info){
 const B=makeBuilder(materials),named=instantiateAsset(B,'models',PARTS,materials);
 const part=id=>B.parts.find(p=>p.id===id).group;
 const kids=(g,name)=>g.children.filter(o=>o.name===name);
 const cornerOf=g=>{const x=g.position.x,z=g.position.z;return (x<0?'0':'1')+(z<0?'L':'R');};
 // 车轮组：代码造型把轮轴组放在主销与轮轴交点，转向与滚动都在该组上。
 const wheels=[part('wheel0L'),part('wheel0R'),part('wheel1L'),part('wheel1R')];
 wheels.forEach(g=>{g.userData.rigid='wheel-'+((g.position.x<0?'0':'1')+(g.position.z<0?'L':'R'));});
 const knuckles=kids(part('suspension'),'wheel-knuckle').sort((a,b)=>a.position.x-b.position.x||a.position.z-b.position.z);
 const ties=kids(part('suspension'),'tie-rod').sort((a,b)=>a.position.z-b.position.z);
 const rack=kids(part('suspension'),'steering-rack')[0];
 const calipers=kids(part('brakes'),'brake-caliper').sort((a,b)=>a.position.x-b.position.x||a.position.z-b.position.z);
 const discs=kids(part('brakes'),'brake-disc').sort((a,b)=>a.position.x-b.position.x||a.position.z-b.position.z);
 const shafts=kids(part('power'),'halfshaft').sort((a,b)=>a.position.x-b.position.x);
 const rotors=kids(part('power'),'motor-rotor').sort((a,b)=>a.position.x-b.position.x);
 knuckles.forEach(g=>g.userData.rigid='knuckle-'+cornerOf(g));
 calipers.forEach(g=>g.userData.rigid='knuckle-'+cornerOf(g));
 discs.forEach(g=>g.userData.rigid='wheel-'+cornerOf(g));
 ties.forEach(g=>g.userData.rigid='tie-rod-'+(g.position.z<0?'L':'R'));
 rack.userData.rigid='steering-rack';
 shafts.forEach(g=>g.userData.rigid='halfshaft-'+g.position.x.toFixed(2));
 rotors.forEach((g,i)=>g.userData.rigid='motor-rotor-'+i);
 // 每个角：车轮组、转向节、卡钳与制动盘对应同一角。
 const corners=[];
 for(const [i,a]of SPEC.axles.entries())for(const s of [-1,1]){
  const id=(s>0?'R':'L'),wheel=wheels[i*2+(s>0?1:0)],kn=knuckles.find(g=>cornerOf(g)===(i?(s>0?'1R':'1L'):(s>0?'0R':'0L')));
  const cal=calipers.find(g=>cornerOf(g)===(i?(s>0?'1R':'1L'):(s>0?'0R':'0L')));
  const disc=discs.find(g=>cornerOf(g)===(i?(s>0?'1R':'1L'):(s>0?'0R':'0L')));
  corners.push({i,s,a,wheel,knuckle:kn,caliper:cal,disc,K:new T.Vector3(a.x,a.R,s*(a.z-DK))});
 }
 const zKf=SPEC.axles[0].z-DK,zP=zKf-TIE;
 // GLB节点是单精度。由原始尺寸恢复关节和齿条球心，保持同一运动学的定长连接。
 for(const c of corners){for(const g of [c.wheel,c.knuckle,c.caliper,c.disc])g.position.copy(c.K);B.parts.find(p=>p.group===c.wheel).base.copy(c.K);}
 rack.position.set(SPEC.axles[0].x+ARM,SPEC.axles[0].R,0);
 for(const child of rack.children)if(Math.abs(child.position.z)>.1)child.position.z=Math.sign(child.position.z)*zP;
 // 后视镜三个网格使用代码造型的同名标记，让整车宽度口径继续排除后视镜。
 part('lights').traverse(o=>{if(o.isMesh&&o.name.startsWith('door-mirror'))o.name='door-mirror';});
 const axisY=new T.Vector3(0,1,0),pin=new T.Vector3(),P=new T.Vector3(),Q=new T.Vector3(),direction=new T.Vector3();
 const solveLeft=shift=>{const h=p=>TIE+shift+ARM*Math.sin(p)-Math.sqrt(TIE*TIE-(ARM*(1-Math.cos(p)))**2);let lo=-.6,hi=.6;for(let k=0;k<60;k++){const m=(lo+hi)/2;if(h(m)>0)lo=m;else hi=m;}return (lo+hi)/2;};
 function update(a,e){
  offsets(B,e);
  const front=SPEC.axles[0],psiR=front.steer?STEER*Math.sin(a*.45):0,shift=front.steer?TIE-ARM*Math.sin(psiR)-Math.sqrt(TIE*TIE-(ARM*(1-Math.cos(psiR)))**2):0,psiL=front.steer?solveLeft(shift):0;
  for(const c of corners){const psi=c.a.steer?(c.s>0?psiR:psiL):0;c.wheel.rotation.set(0,psi,-a);c.disc.rotation.set(0,psi,-a);c.knuckle.rotation.set(0,psi,0);c.caliper.rotation.set(0,psi,0);c.psi=psi;}
  rack.position.z=shift;
  for(const t of ties){const s=t.position.z<0?-1:1,c=corners.find(c=>c.i===0&&c.s===s);t.position.set(front.x+ARM,front.R,s*zP+shift);P.copy(t.position);Q.set(c.K.x+ARM*Math.cos(c.psi),c.K.y,c.K.z-ARM*Math.sin(c.psi));t.quaternion.setFromUnitVectors(axisY,direction.subVectors(Q,P).normalize());}
  for(const h of shafts)h.rotation.z=-a;for(const r of rotors)r.rotation.z=a*3;
 }
 return {...B,update,info};
}
