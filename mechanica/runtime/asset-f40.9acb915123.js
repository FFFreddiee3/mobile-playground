import * as T from '#three';
import {makeBuilder} from '#geometry';
import {instantiateAsset} from '#glb';
import {offsets} from '#vehicle-kit';
const PI=Math.PI,TAU=PI*2;
// 1 模型单位 = 0.5 m。整车尺寸与轮胎规格取自 Ferrari 官方历史车型页（长宽高、轴距、前后轮距、前 245/40 ZR17、后 335/35 ZR17）。
// 几何由 blender/f40.py 建模导出为 models/f40.glb，本模块按部件组与子组名称驱动运动，运动公式与代码造型 src/road.mjs 逐行一致。
const tyreRadius=(rim,width,aspect)=>(rim*25.4/2+width*aspect)/500;
const SPEC={
 f40:{L:4358/500,W:1970/500,H:1124/500,rim:17*25.4/1000,disc:.32,kp:.26,sill:.26,floor:.30,rail:{z:.82,y0:.30,y1:.40},case:.25,
  axles:[{x:-2450/1000,R:tyreRadius(17,245,.40),w:245/500,z:1594/1000,steer:true,drive:false},{x:2450/1000,R:tyreRadius(17,335,.35),w:335/500,z:1606/1000,steer:false,drive:true}]}
};
export const ROAD_SPEC=SPEC;
// 网页补全：主销在轮心面内侧 DK，转向演示幅度 STEER（弧度），横拉杆长 TIE，转向臂球销在主销前方 ARM。
const DK=.12,STEER=.2,TIE=.48,ARM=-.26;
const XS=[1.58,1.78,1.98,2.18];
// 部件组顺序与展开偏移照搬代码造型 src/road.mjs 的 buildCar。
const PARTS=[
 ['chassis','底盘与承载结构','CHASSIS','钢管车架与地板连接前后悬架，后部横梁承托纵置发动机。',[0,-1.1,0]],
 ['body','车身与翼子板','BODY PANELS','连续车身围绕承载结构，四处轮拱与黑色内衬为车轮转动和前轮转向保留空间。',[0,1.5,-2.4]],
 ['hood','前舱盖','FRONT HOOD','整块前舱盖沿车头轮廓闭合，移开后可观察前悬架、转向机与散热器。',[-2.4,1.8,0]],
 ['roof','车顶与前风挡','ROOF & GLAZING','玻璃和车顶共用边缘轮廓，侧窗向车内倾斜并连接车顶。',[0,2.4,0]],
 ['doorL','左侧车门','SIDE DOOR','车门、倾斜侧窗和密封边框组成可单独移开的部件组。',[0,.7,-2.6]],
 ['doorR','右侧车门','SIDE DOOR','车门、倾斜侧窗和密封边框组成可单独移开的部件组。',[0,.7,2.6]],
 ['rear','发动机罩与固定尾翼','REAR DECK','整块后部发动机罩带透明百叶与整幅尾翼，移开后可观察发动机与后轴。',[2.2,2,0]],
 ['cabin','双座座舱','CABIN','两个独立座椅、仪表台、转向柱与中央通道。',[0,1.6,2.1]],
 ['suspension','悬架与转向机构','SUSPENSION','前后上下叉臂、螺旋弹簧套筒减震器和转向节连接底盘与车轮，齿条经横拉杆推动前轮转向节。',[0,-.8,2.2]],
 ['wheel0L','前左车轮与轮毂','WHEEL','轮胎、轮辋与轮毂绕轮轴转动，并随转向节绕主销偏转。',[-.55,-.25,-2.3]],
 ['wheel0R','前右车轮与轮毂','WHEEL','轮胎、轮辋与轮毂绕轮轴转动，并随转向节绕主销偏转。',[-.55,-.25,2.3]],
 ['wheel1L','后左车轮与轮毂','WHEEL','轮胎、轮辋与轮毂绕轮轴转动。',[.55,-.25,-2.3]],
 ['wheel1R','后右车轮与轮毂','WHEEL','轮胎、轮辋与轮毂绕轮轴转动。',[.55,-.25,2.3]],
 ['brakes','四轮制动系统','BRAKES','制动盘随车轮转动，卡钳固定在转向节上并随前轮转向偏转。',[0,1.2,-2.5]],
 ['power','双涡轮V8动力总成','POWERTRAIN','纵置90度V8布置在座舱后方，两侧涡轮增压，变速器壳体经半轴驱动后轮。',[1.5,1.8,1.8]],
 ['thermal','散热器与冷却管路','COOLING','前置散热器经中央通道内的冷却管连接发动机。',[-2,1.2,-2.1]],
 ['lights','灯组与外部细节','LIGHTING','前灯、尾灯、侧面装饰线与后视镜沿车身布置。',[0,1.5,2.5]]
];
export const INFO={
 basis:'总长、总宽、总高、轴距、前后轮距与轮胎规格取自 Ferrari 官方历史车型页，1 模型单位为 0.5 m。车身曲面、尾翼轮廓按该页官方照片的俯视与侧视轮廓重建，前后悬分配、内部尺寸、管路与转向角度按网页观察补全，用于网页演示。'
};
export function build(materials,info){
 const B=makeBuilder(materials);
 instantiateAsset(B,'f40',PARTS,materials);
 // Blender 导出时同名节点会追加 .001 序号，网页端按基名恢复名称，便于按名字取用子组。
 const index=new Map();
 B.root.traverse(o=>{
  const base=o.name.replace(/\.\d{3}$/,'');
  o.name=base;
  if(!index.has(base))index.set(base,[]);
  index.get(base).push(o);
 });
 const groups=name=>{const list=index.get(name);if(!list||!list.length)throw new Error('F40 模型缺少子组 '+name);return list;};
 const one=name=>{const list=groups(name);if(list.length!==1)throw new Error('F40 模型子组数量不符 '+name);return list[0];};
 const [front,back]=SPEC.f40.axles;
 // 轮角：按主销位置取转向节、卡钳与制动盘子组。
 const corners=[];
 for(const [i,a]of SPEC.f40.axles.entries())for(const s of [-1,1]){
  const zK=a.z-DK,K=[a.x,a.R,s*zK];
  const near=list=>list.find(o=>Math.abs(o.position.x-a.x)<2e-3&&Math.abs(o.position.z-s*zK)<2e-3);
  const wheel=B.parts.find(p=>p.id===`wheel${i}${s>0?'R':'L'}`).group;
  const knuckle=near(groups('wheel-knuckle')),caliper=near(groups('brake-caliper')),disc=near(groups('brake-disc'));
  if(!knuckle||!caliper||!disc)throw new Error('F40 模型缺少轮角总成 '+i+(s>0?'R':'L'));
  const corner=`${i}${s>0?'R':'L'}`;
  wheel.userData.rigid='wheel-'+corner;
  knuckle.userData.rigid='knuckle-'+corner;
  caliper.userData.rigid='knuckle-'+corner;
  disc.userData.rigid='wheel-'+corner;
  corners.push({i,s,a,K,wheel,knuckle,caliper,disc});
 }
 // 转向齿条与横拉杆：横拉杆按代码造型同名，两根共用 tie-rod 名称。
 const rack=one('steering-rack');
 rack.userData.rigid='steering-rack';
 const zP=front.z-DK-TIE;
 // GLB 以单精度保存平移，横拉杆内端与齿条端必须落在同一数值上，这里按精确值复位。
 for(const c of rack.children){if(!c.isMesh)continue;const z=c.position.z;c.position.z=Math.abs(z)<1e-6?0:Math.sign(z)*zP;}
 const ties=[];
 for(const s of [-1,1]){
  const g=one('tie-rod-'+(s>0?'R':'L'));
  g.name='tie-rod';
  g.userData.rigid='tie-rod-'+(s>0?'R':'L');
  ties.push({g,s});
 }
 // 动力总成：曲轴、半轴与八组活塞连杆。
 const crank=one('crankshaft');
 crank.userData.rigid='crankshaft';
 const halfshaft=one('halfshaft-2.45');
 halfshaft.userData.rigid='halfshaft-2.45';
 const pistons=[];
 for(const s of [-1,1]){const bank=index.get(`bank-${s}`)?.[0];if(bank)bank.rotation.set(s*PI/4,0,0);}
 for(const s of [-1,1])for(let i=0;i<4;i++){
  const p=one(`piston-${s}-${i}`),link=one(`rod-${s}-${i}`);
  p.rotation.set(s*PI/4,0,0);
  p.userData.rigid=`piston-${s}-${i}`;
  link.userData.rigid=`rod-${s}-${i}`;
  pistons.push({p,link,s,i,x:XS[i]+s*.035});
 }
 const axisY=new T.Vector3(0,1,0),pin=new T.Vector3(),end=new T.Vector3(),direction=new T.Vector3(),P=new T.Vector3(),Q=new T.Vector3();
 const solveLeft=shift=>{const h=p=>TIE+shift+ARM*Math.sin(p)-Math.sqrt(TIE*TIE-(ARM*(1-Math.cos(p)))**2);let lo=-.6,hi=.6;for(let k=0;k<60;k++){const m=(lo+hi)/2;if(h(m)>0)lo=m;else hi=m;}return (lo+hi)/2;};
 function update(a,e){
  offsets(B,e);
  const psiR=front.steer?STEER*Math.sin(a*.45):0,shift=front.steer?TIE-ARM*Math.sin(psiR)-Math.sqrt(TIE*TIE-(ARM*(1-Math.cos(psiR)))**2):0,psiL=front.steer?solveLeft(shift):0;
  for(const c of corners){const psi=c.a.steer?(c.s>0?psiR:psiL):0;c.wheel.rotation.set(0,psi,-a);c.disc.rotation.set(0,psi,-a);c.knuckle.rotation.set(0,psi,0);c.caliper.rotation.set(0,psi,0);c.psi=psi;}
  rack.position.set(front.x+ARM,front.R,shift);
  for(const t of ties){const c=corners.find(c=>c.i===0&&c.s===t.s);t.g.position.set(front.x+ARM,front.R,t.s*zP+shift);P.copy(t.g.position);Q.set(c.K[0]+ARM*Math.cos(c.psi),c.K[1],c.K[2]-ARM*Math.sin(c.psi));t.g.quaternion.setFromUnitVectors(axisY,direction.subVectors(Q,P).normalize());}
  halfshaft.rotation.z=-a;
  crank.rotation.x=a*3;
  for(const {p,link,s,i,x}of pistons){const t=a*3+i*PI,vy=Math.SQRT1_2,vz=s*Math.SQRT1_2;pin.set(x,.80+.0695*Math.cos(t),.0695*Math.sin(t));const projection=.0695*(vy*Math.cos(t)+vz*Math.sin(t)),h=projection+Math.sqrt(.30*.30-.0695*.0695+projection*projection);end.set(x,.80+vy*h,vz*h);p.position.copy(end);link.position.copy(pin);direction.subVectors(end,pin).normalize();link.quaternion.setFromUnitVectors(axisY,direction);}
 }
 return {...B,update,info};
}
