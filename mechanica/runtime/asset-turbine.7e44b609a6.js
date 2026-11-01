import {makeBuilder} from '#geometry';
import {instantiateAsset} from '#glb';
// 唯一几何入口为 blender/turbine.py，部件说明与展开偏移逐项保留旧模型。
const PARTS=[
 [
  "inlet",
  "分流环与增压级机匣",
  "SPLITTER & BOOSTER CASE",
  "分流环把风扇后的气流分成内外两股：内侧进入增压级和核心机，外侧进入外涵道。增压级静子固定在分流环内壁。",
  [
   -2.1,
   0,
   0
  ]
 ],
 [
  "compressor",
  "高压压气机转子",
  "HP COMPRESSOR ROTOR",
  "九级转子叶片装在同一鼓筒上，由高压涡轮经高压轴驱动。流道沿流向收窄，后级叶片逐渐变短。",
  [
   -1.3,
   0.5,
   0
  ]
 ],
 [
  "stators",
  "压气机静子",
  "COMPRESSOR STATORS",
  "静子叶片位于相邻两排转子之间，调整气流方向。外端固定在机匣上，内端由内环连成一体，不随转子旋转。",
  [
   0,
   1.8,
   -0.3
  ]
 ],
 [
  "case",
  "压气机机匣",
  "COMPRESSOR CASE",
  "机匣包围高压压气机并固定静子。分段法兰、紧固件和外侧引气管表现其装配关系。",
  [
   0,
   2.2,
   1.8
  ]
 ],
 [
  "diffuser",
  "扩压段",
  "DIFFUSER",
  "压气机出口气流进入扩压段，速度降低，部分动能转为压力。这里把环形过渡通道剖开展示。",
  [
   -0.2,
   1.3,
   0
  ]
 ],
 [
  "combustor",
  "环形燃烧室",
  "ANNULAR COMBUSTOR",
  "燃料在环形流道中与空气混合并燃烧。内外壁围成燃烧空间，壁面孔列用于展示火焰筒的结构。",
  [
   0.1,
   1.4,
   1.1
  ]
 ],
 [
  "injectors",
  "燃油喷嘴与供油环",
  "FUEL INJECTORS",
  "供油环把燃料分配到燃烧室前端的多个喷嘴。喷嘴围绕主轴排列，中心保留主轴通道。",
  [
   0,
   2.7,
   -0.5
  ]
 ],
 [
  "turbine",
  "高压涡轮转子",
  "HP TURBINE ROTOR",
  "燃烧后的高温气体推动单级高压涡轮，涡轮经高压轴带动高压压气机，两者同速旋转。",
  [
   1.6,
   0.4,
   0
  ]
 ],
 [
  "turbineStator",
  "涡轮导向叶片",
  "TURBINE GUIDE VANES",
  "高压涡轮导向器把燃烧室出口气流引向涡轮转子。低压涡轮四排导向叶片与转子交错布置。内外环把叶片连成整体，外环固定在热端机匣上。",
  [
   1.8,
   1.7,
   -0.5
  ]
 ],
 [
  "shaft",
  "主轴与支承",
  "SHAFT & SUPPORTS",
  "高压轴连接高压压气机与高压涡轮。前后两处轴承座经径向支板固定在机匣上，低压轴从高压轴内部穿过。",
  [
   0,
   -1.8,
   0
  ]
 ],
 [
  "nozzle",
  "尾锥与喷管",
  "EXHAUST NOZZLE",
  "尾锥包住后轴承座，引导气流绕过主轴后端。喷管逐渐收缩，使排出的气流加速。",
  [
   2.8,
   0,
   0
  ]
 ],
 [
  "hotCase",
  "热端机匣",
  "HOT SECTION CASE",
  "热端机匣包围燃烧室和高低压涡轮，外侧法兰连接相邻段。剖切后可见燃烧室与叶片排列。",
  [
   1,
   2.7,
   1.9
  ]
 ],
 [
  "fanRotor",
  "风扇、增压级与低压轴",
  "FAN, BOOSTER & LP SHAFT",
  "宽弦风扇叶片推动大部分空气进入外涵道。风扇后方的三级增压级先压缩核心气流。它们由低压涡轮经穿过高压轴内部的低压轴驱动。",
  [
   -2.7,
   0,
   1.7
  ]
 ],
 [
  "nacelle",
  "进气唇口与风扇机匣",
  "FAN CASE & INLET LIP",
  "圆弧进气唇口包围前置风扇。机匣在剖切时打开，露出风扇与核心机。",
  [
   -1.6,
   2.1,
   -1.2
  ]
 ],
 [
  "bypass",
  "外涵道与短舱",
  "BYPASS DUCT",
  "风扇后的部分空气绕过核心机，经外涵道向后流动。",
  [
   0,
   2.4,
   -2
  ]
 ],
 [
  "fanStator",
  "风扇出口导向叶片",
  "FAN OUTLET GUIDE VANES",
  "静止导向叶片连接内外机匣，并调整风扇出口气流方向。",
  [
   -0.7,
   -2,
   1
  ]
 ],
 [
  "lowTurbine",
  "低压涡轮",
  "LOW PRESSURE TURBINE",
  "四级低压涡轮经低压轴带动风扇与增压级，与高压转子分开转动。",
  [
   2.3,
   -0.8,
   1.4
  ]
 ]
];
export const INFO={
 basis:'外形依据CFM56-7B的官方尺寸和Safran官方照片重建。参考轮廓为按照片推断的正交外形。基本发动机长2508 mm、宽2118 mm、高1829 mm，风扇直径61英寸。保留单级22片风扇、三级增压级、九级高压压气机、单级高压涡轮和四级低压涡轮。短舱过渡、附件位置、内部结构与细节属于网页造型补全，不是制造图纸。',
 source:'https://www.safran-group.com/products-services/cfm56-best-selling-engine-commercial-aviation-history',
 sourceName:'Safran CFM56与UK CAA型号数据',
};
export function build(materials,info){
 const B=makeBuilder(materials),named=instantiateAsset(B,'turbine',PARTS,materials);
 const get=n=>{const g=named.get(n);if(!g)throw new Error('涡扇缺少子组 '+n);return g;};
 const part=id=>B.parts.find(p=>p.id===id).group;
 const compressor=get('rotor.hp.compressor'),turbine=get('rotor.hp.turbine'),spindle=get('rotor.hp.shaft');
 for(const [id,g] of [['compressor',compressor],['turbine',turbine],['shaft',spindle]]){
  const a=part(id).children;a.splice(a.indexOf(g),1);a.unshift(g);
 }
 // 压气机和高压涡轮按原角速度，风扇和低压涡轮按原0.65倍角速度。
 function update(a,e){
  for(const p of B.parts)p.group.position.copy(p.base).addScaledVector(p.offset,e);
  compressor.rotation.x=turbine.rotation.x=spindle.rotation.x=a;
  part('fanRotor').rotation.x=part('lowTurbine').rotation.x=a*.65;
 }
 // 风扇机匣的防腐涂层与核心机的金属色按官方照片区分，只修改本模型的材质副本。
 for(const id of ['nacelle','bypass'])part(id).traverse(o=>{
  if(o.isMesh&&o.userData.materialKey==='alloy'){o.material.color.setHex(0x8d9670);o.material.metalness=.48;o.material.roughness=.43;}
 });
 return {...B,update,info};
}
