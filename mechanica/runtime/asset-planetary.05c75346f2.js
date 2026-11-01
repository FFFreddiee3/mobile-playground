import {makeBuilder} from '#geometry';
import {instantiateAsset} from '#glb';
import {planetaryPose} from '#extras';
const PI=Math.PI,TAU=2*PI;
export const INFO={
 source:'https://www.gunt.de/images/datasheet/1723/MT-122-Assembly-exercise-planetary-gear-gunt-1723-pdf_1_en-GB.pdf',
 sourceName:'GUNT MT 122 官方尺寸与外观资料',
 basis:'外壳按GUNT MT 122官方不含轴伸的140×115×115 mm、输入轴14×34 mm和输出轴30×45 mm重建。壳段划分与圆角按官方外观及装配照片推断，输出端方壳与法兰按审核要求做成连续整体。内部保留网页24、18、60齿与行星架输入2/7的演示，区别于MT 122的24、36、96齿及5:1传动。壁厚、轴承、销轴、平键、密封与紧固件属于网页造型补全，不是制造图纸。'
};
const PARTS=[
 [
  "housing",
  "安装壳体",
  "HOUSING",
  "带底脚的铸造壳体包住固定内齿圈，后端壁承装输入轴承。",
  [
   0,
   -0.7,
   -1.5
  ]
 ],
 [
  "ring",
  "固定内齿圈",
  "FIXED RING",
  "60齿内齿圈压入壳体并以螺钉固定，内侧渐开线轮齿与行星轮啮合。",
  [
   0,
   0.3,
   -1
  ]
 ],
 [
  "sun",
  "太阳轮与输入轴",
  "SUN GEAR",
  "后侧输入轴连接中心24齿太阳轮，轴端在轮体前侧结束。",
  [
   0,
   0,
   2.5
  ]
 ],
 [
  "planets",
  "三组行星轮",
  "PLANET GEARS",
  "三只18齿行星轮绕太阳轮公转，同时在销轴上自转。",
  [
   0,
   1.8,
   1
  ]
 ],
 [
  "carrier",
  "行星架与输出轴",
  "CARRIER",
  "行星架通过三根销轴支承行星轮，并提供输出。",
  [
   0,
   -0.5,
   2
  ]
 ],
 [
  "bearings",
  "主轴承",
  "BEARINGS",
  "前后轴承支承中心旋转组件。",
  [
   1.8,
   0,
   1
  ]
 ],
 [
  "cover",
  "前端盖",
  "FRONT COVER",
  "端盖封闭传动腔并承装输出轴承，剖切时移去盖体。",
  [
   -2.5,
   1.8,
   2.8
  ]
 ],
 [
  "seal",
  "输出轴密封",
  "OUTPUT SEAL",
  "轴端密封装在端盖轴承座外侧，紧贴前轴承。",
  [
   0,
   -1.6,
   2.4
  ]
 ]
];
// 轴与主轴承的轴向布局和Blender脚本planetary.py一致（每单位115/5.72毫米）：输入轴径14毫米、输出轴径30毫米，
// 输入轴从后端-104毫米到太阳轮前侧0.30，输出轴从0.50到前端115毫米；两只深沟球轴承中心在∓65毫米，宽0.24。
const mm=115/5.72;
// 轴端取单精度可表示值：合并网格以Float32保存顶点，轴端在±5.2附近若不取单精度值会有约2e-7的舍入。
const f=Math.fround;
export const PLANETARY={mm,bearingHalf:.12,input:{radius:7/mm,span:[f(-104/mm),f(.30)],bearing:-65/mm},output:{radius:15/mm,span:[f(.50),f(115/mm)],bearing:65/mm}};
export function build(materials,info){
 const B=makeBuilder(materials),named=instantiateAsset(B,'planetary',PARTS,materials);
 const part=id=>B.parts.find(p=>p.id===id).group;
 const sun=part('sun'),carrier=part('carrier'),planets=part('planets');
 // 恢复已知轴线与端面，消除GLB单精度旋转和长度量化造成的细小倾斜。
 for(const [name,[lo,hi]] of [['input.shaft',PLANETARY.input.span],['output.shaft',PLANETARY.output.span]]){
  const mesh=named.get(name);mesh.geometry.computeBoundingBox();
  const box=mesh.geometry.boundingBox;
  mesh.rotation.set(PI/2,0,0);mesh.scale.y=(hi-lo)/(box.max.y-box.min.y);
  mesh.position.set(0,0,lo-box.min.y*mesh.scale.y);
 }

 const wheels=[0,1,2].map(i=>named.get('planet.'+i));
 // 明确恢复三个轮组顺序，避免导出节点名称排序改变驱动顺序。
 const others=planets.children.filter(o=>!wheels.includes(o));planets.children=[...wheels,...others];
 for(const [name,teeth,pitchRadius] of [['gear.sun.body',24,.9],['gear.ring.body',60,2.25],...wheels.map((_,i)=>['gear.planet.'+i+'.body',18,.675])]){
  const mesh=named.get(name);mesh.geometry.userData={...mesh.geometry.userData,teeth,pitchRadius};
 }
 // 仅本模型壳体材质副本使用官方照片所示蓝色，共用网页材质不变。
 B.root.traverse(o=>{if(o.isMesh&&o.userData.materialKey==='motorpaint'){o.material.color.setHex(0x398eba);o.material.metalness=.35;o.material.roughness=.40;}});
 function update(a,e){
  for(const p of B.parts)p.group.position.copy(p.base).addScaledVector(p.offset,e);
  const p=planetaryPose(a);sun.rotation.z=p.sun;carrier.rotation.z=p.carrier;
  wheels.forEach((g,i)=>{const t=i*TAU/3+p.carrier;g.position.set(1.575*Math.cos(t),1.575*Math.sin(t),0);g.rotation.z=p.planet+i*TAU/3+PI/18;});
 }
 return {...B,update,info};
}
