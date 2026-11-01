import {makeBuilder} from '#geometry';
import {instantiateAsset} from '#glb';
// 由Blender提供几何，部件顺序、展开偏移与展示相位沿用旧代码。
const PARTS=[
 [
  "body",
  "机匣外壳",
  "EXTERIOR DISPLAY",
  "圆柱形机匣带端部法兰、分缝与螺钉列，剖开后显示壁厚与空腔，不含内部机构。",
  [
   -1,
   0.4,
   -0.6
  ]
 ],
 [
  "cluster",
  "枪管束外观",
  "EXTERIOR DISPLAY",
  "六根外观筒带短浅端口凹陷，后部封闭，转动仅用于外形观察。",
  [
   1.6,
   0.3,
   0.7
  ]
 ],
 [
  "front-ring",
  "前部夹箍",
  "EXTERIOR DISPLAY",
  "前环架用六根短支承保持柱体外观的周向分布。",
  [
   2.1,
   0.7,
   -0.2
  ]
 ],
 [
  "rear-ring",
  "后部支承环",
  "EXTERIOR DISPLAY",
  "后部支承环与外壳前端连接，支承外观筒组。",
  [
   0.6,
   0.9,
   -1
  ]
 ],
 [
  "motor",
  "外部电机罩壳",
  "EXTERIOR DISPLAY",
  "封闭电机罩与外形支架相接，不包含工作电路或传动参数。",
  [
   -0.8,
   1.1,
   1.2
  ]
 ],
 [
  "cradle",
  "外部叉形托架",
  "EXTERIOR DISPLAY",
  "两侧托架与底座连接，只承托展品外形。",
  [
   0,
   -0.9,
   -0.9
  ]
 ],
 [
  "base",
  "展示立柱与底盘",
  "EXTERIOR DISPLAY",
  "宽底盘和立柱形成可拆解展示支座。",
  [
   0,
   -1.5,
   0.1
  ]
 ],
 [
  "handles",
  "双握把与按钮",
  "EXTERIOR DISPLAY",
  "后部双握把具有收放的橡胶曲面、环纹、按钮和护圈外形，没有控制电路。",
  [
   -1.8,
   0.3,
   0.5
  ]
 ],
 [
  "panels",
  "铭牌与外部盖片",
  "EXTERIOR DISPLAY",
  "小铭牌及固定件贴合圆柱机匣表面。",
  [
   -0.6,
   1.4,
   -1.2
  ]
 ],
 [
  "cables",
  "电缆与外部导槽",
  "EXTERIOR DISPLAY",
  "电缆带接头，柔性外槽由分节空框及外侧销连接，两端分别接入口罩与托架，不含内部供弹机构。",
  [
   -1,
   0.6,
   1.6
  ]
 ],
 [
  "rear-panel",
  "后部端板与饰环",
  "EXTERIOR DISPLAY",
  "后部端板由同轴封闭圆片和外环组成。",
  [
   -1.9,
   0.4,
   -0.5
  ]
 ],
 [
  "pins",
  "环架与罩板紧固件",
  "EXTERIOR DISPLAY",
  "后壳饰环和后环架端面上的表面紧固细节独立可选。",
  [
   0.7,
   1.3,
   1
  ]
 ]
];
export const INFO={
 selected:'rear-panel',
 phases:[
  ['机匣','HOUSING','分体外壳移开后可观察壁厚和空腔。','body'],
  ['筒组','EXTERIOR TUBES','六筒端部显示短浅凹口，夹箍保持周向布局。','cluster'],
  ['外部附件','EXTERIOR FITTINGS','双握把按钮、电缆接头和弯曲导槽分别呈现。','cables'],
  ['支座','DISPLAY BASE','叉形托架与销轴连接到展示立柱和底盘。','cradle']
 ],
 source:'https://www.awm.gov.au/collection/C1292533',
 tag:'枪管束外观 · 外部导槽 · 空壳剖视',
 sourceName:'澳大利亚战争纪念馆外观照片与史密森尼馆藏整体长度',
 basis:'外形依据澳大利亚战争纪念馆公开照片作比例推断，整体长度参考史密森尼馆藏。展示支座、短浅端口和空壳内部为网页造型补全，没有弹膛、膛线、弹药或内部击发、供弹、闭锁机构，不是可用武器设计。'
};
export function build(materials,info){
 const B=makeBuilder(materials),named=instantiateAsset(B,'rotarygun',PARTS,materials);
 const rotor=named.get('display-rotor'),frontPivot=named.get('display-front-ring');
 const palette={steel:{color:0x494949,metalness:.48,roughness:.68,envMapIntensity:.35},dark:{color:0x272727,metalness:.32,roughness:.78,envMapIntensity:.20},cast:{color:0x343434,metalness:.4,roughness:.72,envMapIntensity:.30},black:{color:0x191c1e,metalness:.2,roughness:.75},rubber:{color:0x151515,metalness:0,roughness:.9,envMapIntensity:.12}};
 B.root.traverse(o=>{if(!o.isMesh)return;const f=palette[o.userData.materialKey];if(!f)return;const {color,...values}=f;o.material.color.setHex(color);Object.assign(o.material,values);});
 function update(a,e){for(const p of B.parts)p.group.position.copy(p.base).addScaledVector(p.offset,e);rotor.rotation.x=frontPivot.rotation.x=a*.38;}
 return {...B,update,info,inspection:{displayOnly:true,kind:'rotarygun',rotor,frontPivot}};
}
