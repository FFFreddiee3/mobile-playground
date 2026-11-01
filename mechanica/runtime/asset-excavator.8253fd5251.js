import * as T from '#three';
import {makeBuilder} from '#geometry';
import {instantiateAsset} from '#glb';
import {EXCAVATOR as ORIGINAL,excavatorPose as originalPose} from '#heavy-machines';
import {circleJoint} from '#mechanism-kit';
import {trackPose} from '#mechanism-kit';
import {offsets} from '#vehicle-kit';
export const MM=5700/2.35;
// 2026-10-29 两只动臂油缸紧贴动臂两侧：销套内侧(半长0.031×1.15)与动臂主梁外表面|z|=0.13留0.005。
const BOOM_CYL_Z=.13+.005+.031*1.15;
// 尺寸与销中心取自AEXQ3758-01第4页，未标注的安装点按该图推断，见SOURCE.md。
export const EXCAVATOR={...ORIGINAL,stick:2900/MM,q0:[.055,.708],bcBase:[.4,.75],bcRod:[.97,.446],acBase:[1.35,.5],acRod:[-.23,.1],kcBase:[.12,.26],d:[-.178,.026],ear:[-.07,.15],rocker:.26,coupler:.26,cylinders:ORIGINAL.cylinders.map((c,i)=>i===0?{...c,z:-BOOM_CYL_Z}:{...c}),twinZ:BOOM_CYL_Z};
const E=EXCAVATOR;
const rotate=(p,a)=>[p[0]*Math.cos(a)-p[1]*Math.sin(a),p[0]*Math.sin(a)+p[1]*Math.cos(a)],add=(a,b)=>[a[0]+b[0],a[1]+b[1]];
export function jointPose(b,s,k,yaw=0){
 const q0=E.q0,q1=add(q0,rotate([E.boom,0],b)),q2=add(q1,rotate([E.stick,0],s));
 const d=add(q2,rotate(E.d,s)),ear=add(q2,rotate(E.ear,k)),joint=circleJoint(d,ear,E.rocker,E.coupler);
 return {yaw,b,s,k,q0,q1,q2,d,ear,joint,cylinders:[[E.bcBase,add(q0,rotate(E.bcRod,b))],[add(q0,rotate(E.acBase,b)),add(q1,rotate(E.acRod,s))],[add(q1,rotate(E.kcBase,s)),joint]]};
}
export function excavatorPose(a){const p=originalPose(a);return jointPose(p.b,p.s,p.k,p.yaw);}
export const TRANSPORT={b:-.03,s:-2.86,k:2,yaw:0};
// 缸筒闭合长度按运输图及整个展示周期的销距校核，属于安装结构补全。
E.cylinders.forEach(c=>c.barrel=c.stroke+.08);
// 16个部件目录沿用代码造型，GLB只保存几何与命名关节，运动直接复用既有函数。
export const INFO={
 source:'https://s7d2.scene7.com/is/content/Caterpillar/CM20240927-d80d6-c6a9b',
 sourceName:'Caterpillar 320 技术规格书 AEXQ3758-01，第4页',
 basis:'底盘、驾驶室和配重以Caterpillar 320官方尺寸及侧视、后视图为依据，每模型单位2425.53毫米。动臂5.7米、斗杆2.9米，默认展示保留原关节角变化规律。销座和油缸安装点按官方运输图推断，运输姿态仅用于轮廓核对。内部结构、安装点与细节属于网页造型补全，不是制造图纸。'
};
const PARTS=[
 [
  "undercarriage",
  "下部底架与履带架",
  "UNDERCARRIAGE",
  "中心架连接两侧箱形履带架，行走马达、导向轮叉和支重轮支架都固定在履带架上。",
  [
   0,
   -0.9,
   0
  ]
 ],
 [
  "track0",
  "左履带链",
  "TRACK CHAIN",
  "46节链轨与三齿履带板沿闭合路径循环，套筒落在链轮齿间。",
  [
   0,
   -0.25,
   -1.4
  ]
 ],
 [
  "rollers0",
  "左行走轮系",
  "TRAVEL WHEELS",
  "后部链轮、前部导向轮、8个支重轮与2个托链轮绕固定轴转动。",
  [
   0,
   0.2,
   -1.9
  ]
 ],
 [
  "track1",
  "右履带链",
  "TRACK CHAIN",
  "46节链轨与三齿履带板沿闭合路径循环，套筒落在链轮齿间。",
  [
   0,
   -0.25,
   1.4
  ]
 ],
 [
  "rollers1",
  "右行走轮系",
  "TRAVEL WHEELS",
  "后部链轮、前部导向轮、8个支重轮与2个托链轮绕固定轴转动。",
  [
   0,
   0.2,
   1.9
  ]
 ],
 [
  "slew",
  "回转支承",
  "SLEW BEARING",
  "外圈螺栓固定在中心架上，上部平台在内圈上方绕中心回转。",
  [
   0,
   0.9,
   0
  ]
 ],
 [
  "platform",
  "上部平台、动臂座与配重",
  "UPPER CARRIAGE",
  "平台底板承托驾驶室、发动机舱和油箱，前端动臂座和油缸支座与底板焊成一体，尾部配重按规格书回转半径布置。",
  [
   -1.5,
   1,
   -0.5
  ]
 ],
 [
  "cab",
  "驾驶室框架与玻璃",
  "OPERATOR CAB",
  "左前驾驶室的立柱、顶板、门框与四面玻璃安装在平台底板上，顶高按规格书2960 mm。",
  [
   -1.2,
   1.5,
   -1
  ]
 ],
 [
  "controls",
  "座椅、操纵台与显示器",
  "CAB CONTROLS",
  "座椅与两侧操纵台固定在驾驶室地板上，操纵手柄位于扶手前端。",
  [
   -1.6,
   1.7,
   0.2
  ]
 ],
 [
  "power",
  "发动机舱、油箱与扶手",
  "POWER & TANKS",
  "发动机罩、散热格栅和排气管位于配重前方，右前侧为液压油箱和燃油箱，顶部扶手按规格书高度布置。",
  [
   1.3,
   1.3,
   -1
  ]
 ],
 [
  "boom",
  "弯曲动臂与销座",
  "BOOM",
  "箱形动臂根部套在平台动臂座销轴上，腹部横向销座连接两根动臂缸，背部支座连接斗杆缸，前端叉板夹住斗杆根部。",
  [
   1.2,
   1.4,
   -0.6
  ]
 ],
 [
  "stick",
  "斗杆与连杆座",
  "STICK",
  "斗杆根部套在动臂端销上，尾端耳座连接斗杆缸活塞杆，上方支座连接铲斗缸，前端设导向连杆座和铲斗销孔。",
  [
   1.8,
   1.1,
   0.8
  ]
 ],
 [
  "bucket",
  "铲斗、侧板与斗齿",
  "BUCKET",
  "铲斗顶板上的两对耳板分别连接斗杆销与动力连杆，弧形背板、侧板、刃板和五个斗齿组成斗体。",
  [
   2.3,
   -0.2,
   0.6
  ]
 ],
 [
  "hydraulics",
  "动臂缸、斗杆缸与铲斗缸",
  "HYDRAULIC CYLINDERS",
  "缸筒与活塞杆同轴，两端耳环夹在销耳板之间，伸缩量由两端销距决定并保持在规格书行程以内。",
  [
   1.1,
   2,
   1.1
  ]
 ],
 [
  "linkage",
  "铲斗导向连杆与动力连杆",
  "BUCKET LINKAGE",
  "导向连杆两片夹住铲斗缸耳环，动力连杆两片在外侧连接铲斗耳座，四连杆按固定销距闭合。",
  [
   2,
   1.9,
   -1
  ]
 ],
 [
  "hoses",
  "主控阀与平台软管",
  "VALVE & HOSES",
  "主控阀固定在动臂座后方，平台软管沿动臂座两侧板接到油缸与动臂管路接头。",
  [
   -1.1,
   1.7,
   -1.7
  ]
 ]
];

export function build(materials,info){
 const B=makeBuilder(materials),named=instantiateAsset(B,'excavator',PARTS,materials);
 const part=id=>B.parts.find(p=>p.id===id).group;
 const get=name=>{const o=named.get(name);if(!o)throw new Error('挖掘机缺少子组 '+name);return o;};
 const boom=part('boom'),stick=part('stick'),bucket=part('bucket');
 const tracks=[],wheels=[],r=E.r,half=E.half;
 // Blender空组恢复成独立Bone，使共用履带批绘仍由46个刚性骨骼驱动。
 for(let side=0;side<2;side++){
  const parent=part('track'+side),shoes=[];
  for(let i=0;i<E.shoes;i++){
   const old=get('track.'+side+'.'+String(i).padStart(2,'0')),g=new T.Bone();
   g.name='track-shoe';g.userData={...old.userData};g.position.copy(old.position);g.quaternion.copy(old.quaternion);g.scale.copy(old.scale);
   for(const child of [...old.children])g.add(child);parent.remove(old);parent.add(g);shoes.push(g);
  }
  const length=4*half+2*Math.PI*r,pitch=length/E.shoes,z=(side?1:-1)*E.trackZ;
  function update(distance){shoes.forEach((g,i)=>{const p=trackPose(i*pitch+distance,half,r);g.position.set(p.x,p.y+r+.08,z);g.rotation.z=p.angle;});}
  const batch={parent,bones:shoes,half,r,z};(B.rigidBatches??=[]).push(batch);tracks.push({shoes,update,pitch,length,r,half,z,batch});
  for(const [type,count,radius] of [['sprocket',1,r],['idler',1,r],['roller',8,.040],['carrier',2,.032]]){
   for(let i=0;i<count;i++){
    const g=get('wheel.'+side+'.'+type+(count>1?'.'+i:''));g.name='excavator-'+type;
    // 固定轴位置从同一组双精度常数恢复，避免GLB Float32节点位移的累计误差。
    const x=type==='sprocket'?-half:type==='idler'?half:type==='roller'?-.57+i*1.14/7:[-.30,.30][i];
    const y=type==='roller'?.1555:type==='carrier'?.3136:.08+r;
    g.position.set(x,y,z);wheels.push({g,r:radius});
   }
  }
 }
 // 恢复旧代码中链轮、导向轮、支重轮、托链轮的子组顺序。
 for(let side=0;side<2;side++){const parent=part('rollers'+side),ordered=wheels.slice(side*12,side*12+12).map(w=>w.g);parent.children.sort((a,b)=>ordered.indexOf(a)-ordered.indexOf(b));}
 const up=new T.Vector3(0,1,0),dir=new T.Vector3();
 const link=(name,length)=>{const group=get(name);return {group,length,set(a,b){group.position.set(...a);dir.set(b[0]-a[0],b[1]-a[1],b[2]-a[2]);group.quaternion.setFromUnitVectors(up,dir.normalize());}};};
 const cylinder=i=>{
  const c=E.cylinders[i===3?0:i],group=get('cylinder.'+i),tip=get('cylinder.'+i+'.tip'),ram=get('cylinder.'+i+'.ram');
  return {group,tip,ram,barrelLength:c.barrel,stroke:c.stroke,rodLength:c.stroke+.105,
   set(a,b){group.position.set(...a);dir.set(b[0]-a[0],b[1]-a[1],b[2]-a[2]);const length=dir.length();group.quaternion.setFromUnitVectors(up,dir.normalize());tip.position.set(0,length,0);}};
 };
 const cylinders=[0,1,2].map(cylinder),twin=cylinder(3),rocker=link('link.rocker',E.rocker),coupler=link('link.coupler',E.coupler);
 part('linkage').children.sort((a,b)=>[rocker.group,coupler.group].indexOf(a)-[rocker.group,coupler.group].indexOf(b));
 const upperParts=['platform','cab','controls','power','hoses','hydraulics','linkage'].map(part);
 const yawQ=new T.Quaternion(),angleQ=new T.Quaternion(),zaxis=new T.Vector3(0,0,1),yaxis=new T.Vector3(0,1,0),v=new T.Vector3();
 const world=(p,yaw,z=0)=>[p[0]*Math.cos(yaw)+z*Math.sin(yaw),p[1],-p[0]*Math.sin(yaw)+z*Math.cos(yaw)];
 const tones={orangepaint:[0xe8a91c,.04,.42],dark:[0x25272a,.45,.52],cast:[0x4a4641,.72,.62],black:[0x121315,0,.72]};
 B.root.traverse(o=>{const t=o.material&&tones[o.userData.materialKey];if(t){o.material.color.setHex(t[0]);o.material.metalness=t[1];o.material.roughness=t[2];}});
 function applyPose(p,e=0){offsets(B,e);yawQ.setFromAxisAngle(yaxis,p.yaw);upperParts.forEach(g=>g.quaternion.copy(yawQ));
  for(const [g,point,angle]of [[boom,p.q0,p.b],[stick,p.q1,p.s],[bucket,p.q2,p.k]]){v.set(...world(point,p.yaw));g.position.add(v);g.quaternion.copy(yawQ).multiply(angleQ.setFromAxisAngle(zaxis,angle));}
  p.cylinders.forEach(([from,to],i)=>cylinders[i].set([...from,E.cylinders[i].z],[...to,E.cylinders[i].z]));twin.set([...p.cylinders[0][0],E.twinZ],[...p.cylinders[0][1],E.twinZ]);
  rocker.set([...p.d,E.linkZ],[...p.joint,E.linkZ]);coupler.set([...p.joint,E.linkZ],[...p.ear,E.linkZ]);
 }
 function update(a,e){applyPose(excavatorPose(a),e);const travel=a*.27;tracks.forEach(t=>t.update(travel));wheels.forEach(({g,r})=>g.rotation.z=-travel/r);
 }
 function refPose(){applyPose(jointPose(TRANSPORT.b,TRANSPORT.s,TRANSPORT.k,0));}
 const refPoseNodes=[...cylinders.flatMap(c=>[c.group,c.tip]),twin.group,twin.tip,rocker.group,coupler.group];
 return {...B,update,refPose,refPoseNodes,info,inspection:{boom,stick,bucket,cylinders,twin,rocker,coupler,tracks,wheels,world,upperParts}};
}
