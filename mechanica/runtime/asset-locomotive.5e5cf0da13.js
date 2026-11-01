import * as T from '#three';
import {makeBuilder} from '#geometry';
import {instantiateAsset} from '#glb';
import {LOCOMOTIVE as L,locomotivePose} from '#heavy-machines';
export {LOCOMOTIVE,locomotivePose} from '#heavy-machines';
export const INFO={zoom:1.10,basis:'外形依据原英国铁路 Standard Locomotive Diagrams 第2页的 BR Standard Class 2 2-6-0 侧视图与正视图，缓冲器间全长53 ft 2.5 in。保留原网页轮轴、曲柄与连杆运动接口。内部烟管排列、管板、驾驶室设备、紧固件和其他细节属于网页造型补全，不是制造图纸。',source:'http://www.barrowmoremrg.co.uk/BRBDocuments/Locos/BR_Std_Locos_n2_JDF_web.pdf',sourceName:'British Railways Standard Locomotive Diagrams，第2页'};
// 按原代码造型逐项保存部件顺序、文字与展开偏移。
const PARTS=[
 [
  "frame",
  "主车架、走行板与缓冲梁",
  "MAIN FRAMES",
  "两片内侧板框在三根动轴处开导槽容纳轴箱，前缓冲梁、后拖钩梁和两侧走行板固定在板框上。",
  [
   0,
   -0.9,
   -0.6
  ]
 ],
 [
  "suspension",
  "轴箱与钢板弹簧",
  "AXLE BOXES",
  "六只轴箱嵌在板框导槽内套住动轴，下挂叠板弹簧两端吊在板框底边。",
  [
   0,
   0.8,
   -1.4
  ]
 ],
 [
  "drivers0",
  "右侧三只动轮",
  "DRIVING WHEELS",
  "三只动轮各带半根车轴和曲柄销，联动杆使三轴同步，两侧曲柄相差四分之一圈。",
  [
   0,
   -0.2,
   1.5
  ]
 ],
 [
  "drivers1",
  "左侧三只动轮",
  "DRIVING WHEELS",
  "三只动轮各带半根车轴和曲柄销，联动杆使三轴同步，两侧曲柄相差四分之一圈。",
  [
   0,
   -0.2,
   -1.5
  ]
 ],
 [
  "coupling",
  "分段联动杆",
  "COUPLING RODS",
  "每侧两段定长联动杆套在三只曲柄销上，前段在内层、后段在外层，于中间曲柄销叠合。",
  [
   0,
   0.4,
   1.9
  ]
 ],
 [
  "cylinders",
  "汽缸、阀室与滑板",
  "CYLINDERS & GUIDES",
  "缸筒内径按规格16.5英寸，前后缸盖封闭缸筒，上方阀室、后方滑板和吊架把十字头导向到走行板下。",
  [
   1.4,
   0.5,
   -1
  ]
 ],
 [
  "pistons",
  "活塞、活塞杆与十字头",
  "PISTONS & CROSSHEADS",
  "十字头沿上方滑板往复，活塞杆穿过后缸盖把活塞推到缸筒内，十字头销连接主连杆小端。",
  [
   1.5,
   1,
   1.2
  ]
 ],
 [
  "mainrods",
  "主连杆",
  "CONNECTING RODS",
  "主连杆大端套在中间动轮曲柄销最外层，小端夹在十字头两片侧板之间。",
  [
   0,
   1.4,
   -1.7
  ]
 ],
 [
  "boiler",
  "锅炉筒体与包覆",
  "BOILER",
  "锅炉筒体后接火箱、前接烟箱，外包覆和箍带包住筒体。",
  [
   0,
   1.7,
   -1.2
  ]
 ],
 [
  "tubes",
  "烟管与管板",
  "SMOKE TUBES",
  "烟管两端插在火箱管板和烟箱管板上，热烟气由火箱经烟管进入烟箱。",
  [
   0,
   2,
   0.9
  ]
 ],
 [
  "firebox",
  "火箱与后板",
  "FIREBOX",
  "火箱夹在后部板框之间并由支架托住，后板伸进驾驶室，设炉门和水表。",
  [
   -1.5,
   1.6,
   0
  ]
 ],
 [
  "smokebox",
  "烟箱、鞍座与烟囱",
  "SMOKEBOX",
  "烟箱坐在板框间的鞍座上，前门、门把和烟囱装在烟箱上。",
  [
   1.8,
   1.5,
   -0.8
  ]
 ],
 [
  "fittings",
  "汽包、安全阀与外部管路",
  "BOILER FITTINGS",
  "汽包和安全阀坐在锅炉与火箱顶部，给水管沿走行板通到锅炉前部止回阀，扶手杆由立柱固定在包覆上。",
  [
   0,
   2.6,
   0
  ]
 ],
 [
  "cab",
  "驾驶室",
  "CAB",
  "驾驶室地板压在板框上，前板开口让火箱后部伸入，侧板开窗，顶棚覆盖操纵位置。",
  [
   -1.7,
   2,
   -1
  ]
 ],
 [
  "tender",
  "煤水车与牵引连接",
  "TENDER",
  "煤水车板框托住水柜和煤仓，三根车轴的轴箱嵌在板框导槽内，牵引杆连接机车后拖钩梁。",
  [
   -2,
   0,
   -1
  ]
 ],
 [
  "pilot",
  "前导轮与煤水车轮对",
  "CARRYING WHEELS",
  "前导轮对装在转向架轴箱内，煤水车三根轮对装在板框轴箱内，轮对与动轮按同一线速度滚动。",
  [
   0,
   -0.4,
   1.8
  ]
 ]
];
export function build(materials,info){
 const B=makeBuilder(materials),named=instantiateAsset(B,'locomotive',PARTS,materials),drivers=[],smallWheels=[],motions=[],links=[];
 const get=name=>{const g=named.get(name);if(!g)throw new Error('机车缺少子组 '+name);return g;};
 // 还原由Blender回转/圆柱构造生成、在GLB解析时丢失的描述元数据。
 // 轮箍半径和活塞头半径仍由实际顶点确定，未替换几何或测试。
 for(const [name,o] of named){
  if(/^driver\.[01]\.[0-2]\.tyre$/.test(name))o.geometry.type='LatheGeometry';
  if(/^piston\.head\.[01]$/.test(name)){
   const p=o.geometry.attributes.position;let radius=0;
   for(let i=0;i<p.count;i++)radius=Math.max(radius,Math.hypot(p.getX(i),p.getZ(i)));
   o.geometry.type='CylinderGeometry';o.geometry.parameters={radiusTop:radius};
  }
 }
 const up=new T.Vector3(0,1,0),v=new T.Vector3();
 const linkFor=g=>({group:g,set(a,b){g.position.set(...a);v.set(b[0]-a[0],b[1]-a[1],b[2]-a[2]);g.quaternion.setFromUnitVectors(up,v.normalize());}});
 for(let side=0;side<2;side++){
  const o=side===0?1:-1;
  for(let i=0;i<3;i++){const g=get(`driver.${side}.${i}`),x=L.coupled[i];g.position.set(x,L.axleY,o*L.wheelZ);g.name='loco-driver';drivers.push({g,x,z:o*L.wheelZ,side});}
  for(let j=0;j<2;j++)links.push({side,x:-1.6+j*1.6,link:linkFor(get(`coupling.${side}.${j}`))});
  const piston=get(`crosshead.${side}`);piston.name='loco-crosshead';motions.push({side,z:o*L.rodZ,piston,link:linkFor(get(`mainrod.${side}`))});
 }
 [[L.lead,L.leadR],...L.tender.map(x=>[x,L.tenderR])].forEach(([x,r],i)=>{const g=get('carrying.'+i);g.position.set(x,L.rail+r,0);g.name='loco-carrying-wheelset';smallWheels.push({g,r});});
 const tones={gearpaint:[0x202424,.24,.44],black:[0x101113,.15,.58],cast:[0x2d3236,.55,.5]};
 B.root.traverse(o=>{const t=o.material&&tones[o.userData.materialKey];if(t){o.material.color.setHex(t[0]);o.material.metalness=t[1];o.material.roughness=t[2];}});
 function update(a,e){
  for(const p of B.parts)p.group.position.copy(p.base).addScaledVector(p.offset,e);
  drivers.forEach(({g,side})=>g.rotation.z=a+side*Math.PI/2);
  smallWheels.forEach(({g,r})=>g.rotation.z=a*L.driverR/r);
  links.forEach(({side,x,link})=>{const p=locomotivePose(a,side),z=side===0?.96:-.96;link.set([x+p.x,L.axleY+p.y,z],[x+1.6+p.x,L.axleY+p.y,z]);});
  motions.forEach(({side,z,piston,link})=>{const p=locomotivePose(a,side);piston.position.set(p.slider,L.axleY,z);link.set([p.x,L.axleY+p.y,z],[p.slider,L.axleY,z]);});
 }
 return {...B,update,info,inspection:{drivers,motions,links,smallWheels}};
}
