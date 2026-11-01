import {makeBuilder} from '#geometry';
import {offsets} from '#vehicle-kit';
import {instantiateAsset} from '#glb';
const PARTS=[
 [
  "frame",
  "卫星平台承力框架",
  "SPACECRAFT STRUCTURE",
  "八角平台连接上部仪器、单侧太阳翼和底部安装环。",
  [
   0,
   -1.3,
   0
  ]
 ],
 [
  "covers",
  "平台隔热包覆",
  "THERMAL BLANKETS",
  "八块包覆面沿削角平台排列，接缝和安装边分别显示。",
  [
   0,
   0,
   -1.7
  ]
 ],
 [
  "electronics",
  "电子设备与配电组件",
  "AVIONICS",
  "多个设备箱连接平台底板，线束沿框架集中布置。",
  [
   -1.5,
   -0.7,
   0
  ]
 ],
 [
  "oli",
  "OLI-2 光学成像仪",
  "OPERATIONAL LAND IMAGER",
  "多面外罩与矩形遮光口连接平台上部，实际入光通道通至内部观察面。",
  [
   -1.2,
   1.3,
   0.8
  ]
 ],
 [
  "tirs",
  "TIRS-2 热红外传感器",
  "THERMAL INFRARED SENSOR",
  "独立红外仪器通过底脚连接平台，遮光筒内保留入光空间。",
  [
   1.4,
   1.2,
   0.6
  ]
 ],
 [
  "earthshield",
  "仪器遮光板与支架",
  "EARTH SHIELD",
  "独立白色板与三角支架位于红外仪器外侧。",
  [
   1.2,
   1.9,
   -0.7
  ]
 ],
 [
  "power",
  "单侧太阳能电池翼",
  "SOLAR ARRAY",
  "四段电池板通过根部转轴和背部支承连接卫星平台。",
  [
   2.2,
   0.7,
   0
  ]
 ],
 [
  "radiator",
  "散热面与导热连接",
  "RADIATOR",
  "白色散热板连接仪器与平台外部。",
  [
   -1.8,
   0.6,
   -1.3
  ]
 ],
 [
  "antenna",
  "通信天线与支撑",
  "COMMUNICATIONS",
  "天线经支架安装在卫星平台下方。",
  [
   -1.6,
   -1,
   0.7
  ]
 ],
 [
  "attitude",
  "姿态测量设备与内部轮组",
  "ATTITUDE COMPONENTS",
  "外部光学测量头和内部轮组分别安装在框架上。",
  [
   0,
   -1.7,
   1.1
  ]
 ],
 [
  "adapter",
  "安装适配环与底部接口",
  "LAUNCH ADAPTER",
  "底部环形接口连接平台承力结构。",
  [
   0,
   -2,
   0
  ]
 ]
];
export const INFO={source:'https://science.nasa.gov/mission/landsat/outreach/landsat-9-3d-model/',sourceName:'NASA Landsat 9官方三维装配模型',basis:'外形采用NASA官方三维装配模型，以官方9.8米太阳翼长度统一换算比例。平台包覆、仪器外罩和外部支架按该模型重建。内部光学、电路、轮组及细节为网页造型补全，不是制造图纸。'};
export function build(materials,info){
 const B=makeBuilder(materials),named=instantiateAsset(B,'landsat9',PARTS,materials);
 const get=n=>{const o=named.get(n);if(!o)throw new Error('Landsat 9缺少子组 '+n);return o;};
 const pivot=get('landsat-solar-hinge'),antenna=get('antenna.pointing'),wheels=Array.from({length:3},(_,i)=>get('wheel.rotor.'+i));
 // 按建模常量恢复分板边框位置，避免导出父子矩阵分解造成单精度累计误差。
 for(const [i,width] of [.74,1.58,1.58,1.58].entries())for(let j=0;j<2;j++)get('array.frame.x.'+i+'.'+j).position.x=(j?1:-1)*(width-.018)/2;
 // 兼容原模型供测试和交互读取的八个铰链同名对象。
 const hinges=[];pivot.traverse(o=>{if(o.isMesh&&o.name.startsWith('landsat-panel-hinge'))hinges.push(o);});
 for(const o of hinges)o.name='landsat-panel-hinge';
 B.root.traverse(o=>{if(!o.material)return;const key=o.userData.materialKey;if(key==='foil'){o.material.color.setHex(0xc5c9c9);o.material.metalness=.86;o.material.roughness=.36;}if(key==='goldfoil'){o.material.color.setHex(0xc7a458);o.material.metalness=.80;o.material.roughness=.40;}if(key==='solar'){o.material.color.setHex(0x0f2442);o.material.metalness=.35;o.material.roughness=.34;o.material.clearcoat=.3;o.material.envMapIntensity=.7;}});
 return {...B,info,update(a,e){offsets(B,e);pivot.rotation.x=.12*Math.sin(a*.18);antenna.rotation.y=.08*Math.sin(a*.2);wheels.forEach((g,i)=>g.rotation.z=a*(.25+i*.12));}};
}
