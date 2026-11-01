import {makeBuilder} from '#geometry';
import {instantiateAsset} from '#glb';
import {offsets} from '#vehicle-kit';
// 保留旧代码的部件说明、顺序、展开偏移和逐项运动公式。
export const INFO={zoom:.90,source:'https://lhea.gsfc.nasa.gov/archive/sm4/multimedia/gallery2.html',sourceName:'NASA SM4外形图与在轨照片',basis:'外形按NASA SM4正视和侧视图重建，后舱外径4.2米确定网页比例，太阳翼保留NASA供电页7.1米与2.6米的长宽比。隔热毯、舱门、扶手和外部接口参考NASA在轨照片，内部结构与细节属于网页造型补全，不是制造图纸。'};
const PARTS=[
 [
  "tube",
  "光学镜筒与遮光环",
  "OPTICAL TELESCOPE TUBE",
  "圆筒遮光结构包围前部光路，环向结构连接蒙皮。",
  [
   -1.1,
   0.7,
   0
  ]
 ],
 [
  "aft",
  "后部仪器舱外壳",
  "AFT SHROUD",
  "后舱包覆科学仪器和服务设备，检修盖按周向分布。",
  [
   1.5,
   0.6,
   0
  ]
 ],
 [
  "primary",
  "主镜与中央开孔",
  "PRIMARY MIRROR",
  "主反射镜把入射光反射至前方次镜。",
  [
   -0.2,
   -1.4,
   0
  ]
 ],
 [
  "secondary",
  "次镜与支承杆",
  "SECONDARY MIRROR",
  "细支杆把次镜定位在镜筒前部。",
  [
   -2,
   1.4,
   0
  ]
 ],
 [
  "frame",
  "内部光学支承框架",
  "OPTICAL SUPPORT",
  "纵向支杆和环形框架保持光学与仪器安装位置。",
  [
   0,
   -0.7,
   -1.7
  ]
 ],
 [
  "instruments",
  "科学仪器与后部设备",
  "SCIENCE INSTRUMENTS",
  "多个独立设备箱安装在后部框架内。",
  [
   1.6,
   -0.7,
   1.4
  ]
 ],
 [
  "electronics",
  "电子设备与储能模块",
  "ELECTRONICS",
  "服务设备、线束和电池模块沿仪器舱布置。",
  [
   2.5,
   1.3,
   0
  ]
 ],
 [
  "solar0",
  "左太阳能电池翼",
  "SOLAR ARRAY",
  "两块刚性分板通过径向支承轴连接镜筒，整个翼面绕支承轴转动。",
  [
   0,
   0.7,
   -1.8
  ]
 ],
 [
  "solar1",
  "右太阳能电池翼",
  "SOLAR ARRAY",
  "两块刚性分板通过径向支承轴连接镜筒，整个翼面绕支承轴转动。",
  [
   0,
   0.7,
   1.8
  ]
 ],
 [
  "antenna",
  "双高增益通信天线",
  "HIGH GAIN ANTENNAS",
  "两副天线通过长支杆避开镜筒。",
  [
   1.5,
   1.5,
   1.2
  ]
 ],
 [
  "door",
  "前部孔径门与铰链",
  "APERTURE DOOR",
  "圆形门通过顶部铰链连接镜筒。",
  [
   -1.8,
   1.5,
   0
  ]
 ],
 [
  "fixtures",
  "扶手与维修接口",
  "SERVICING FITTINGS",
  "扶手和安装接口位于舱体外部。",
  [
   0,
   -1.4,
   1.4
  ]
 ]
];
export function build(materials,info){
 const B=makeBuilder(materials),named=instantiateAsset(B,'hubble',PARTS,materials);
 const get=name=>{const o=named.get(name);if(!o)throw new Error('哈勃模型缺少子组 '+name);return o;};
 const wings=[0,1].map(i=>get('solar.pivot.'+i)),hinge=get('door.hinge'),ants=[0,1].map(i=>get('antenna.gimbal.'+i));
 wings.forEach(g=>g.name='hubble-solar-pivot');
 for(let i=0;i<2;i++){get('solar.surface.'+i).name='hubble-array-surface';for(let j=0;j<2;j++)get('solar.half.'+i+'.'+j).name='hubble-array-half';}
 hinge.name='hubble-door-hinge';
 for(const name of ['door.cover.outer','door.cover.inner'])get(name).name='hubble-aperture-cover';
 // GLB的单精度四元数还原成原公式的精确角度。
 for(let i=0;i<5;i++)get('instrument.'+i).rotation.set(i*Math.PI*2/5,0,0);
 for(let i=0;i<6;i++)get('electronics.'+i).rotation.set(i*Math.PI/3,0,0);
 B.root.traverse(o=>{if(!o.isMesh)return;const m=o.material;
  if(o.userData.materialKey==='solar'){m.color.setHex(0x080c12);m.metalness=.04;m.roughness=.62;m.clearcoat=.10;m.clearcoatRoughness=.5;m.envMapIntensity=.16;}
  if(o.userData.materialKey==='foil'){m.color.setHex(0xb5bdc5);m.metalness=.82;m.roughness=.43;m.bumpScale=.032;m.envMapIntensity=.78;}
  if(o.userData.part==='aft'&&o.userData.materialKey==='alloy'){m.color.setHex(0x8798a5);m.metalness=.90;m.roughness=.33;m.envMapIntensity=.78;}
  if(o.name==='aft.doors.upper'){m.color.setHex(0x748b9c);m.roughness=.38;}
  if(o.name==='aft.doors.lower'){m.color.setHex(0xc5cbcc);m.metalness=.25;m.roughness=.52;}
 });
 return {...B,info,update(a,e){offsets(B,e);wings.forEach(g=>g.rotation.z=.06*Math.sin(a*.17));hinge.rotation.z=-1.23+.04*Math.sin(a*.2);ants.forEach((g,i)=>g.rotation.y=.12*Math.sin(a*.15+i));}};
}
