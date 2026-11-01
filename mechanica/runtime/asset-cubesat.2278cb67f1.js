import {makeBuilder} from '#geometry';
import {instantiateAsset} from '#glb';
import {offsets} from '#vehicle-kit';
const PI=Math.PI;
// 部件文字、顺序和展开偏移来自旧代码的inspect-code.json，运动保持原公式与相位。
const PARTS=[
 [
  "frame",
  "3U 导轨与端框",
  "3U STRUCTURE",
  "四根8.5毫米宽导轨贯通340.5毫米全长，端框与导轨相接，导轨端面伸出5毫米支脚。",
  [
   0,
   0,
   -1.4
  ]
 ],
 [
  "boards",
  "PC/104 电路板堆叠",
  "AVIONICS STACK",
  "电路板由四根堆叠螺杆穿过角孔定位，板间连接器和芯片分别构造。",
  [
   -1.2,
   -0.6,
   0
  ]
 ],
 [
  "batteries",
  "电池板与锂离子单体",
  "BATTERY MODULE",
  "四节圆柱单体卧放在电池板上，压条把单体固定在板面。",
  [
   0,
   -1.3,
   1.2
  ]
 ],
 [
  "body-solar",
  "机身太阳能电池板",
  "BODY SOLAR PANELS",
  "两侧电池板卡在相邻导轨之间，电池片外伸约1毫米，未超出6.5毫米限值。",
  [
   0,
   0.4,
   -1.5
  ]
 ],
 [
  "solar0",
  "左展开电池板",
  "DEPLOYABLE PANEL",
  "铰链销由三处支座固定在导轨角上，展开板的铰链筒套在销上转到与机身垂直。",
  [
   -1.3,
   0,
   0.5
  ]
 ],
 [
  "solar1",
  "右展开电池板",
  "DEPLOYABLE PANEL",
  "铰链销由三处支座固定在导轨角上，展开板的铰链筒套在销上转到与机身垂直。",
  [
   1.3,
   0,
   0.5
  ]
 ],
 [
  "payload",
  "光学载荷与遮光筒",
  "OPTICAL PAYLOAD",
  "光学载荷固定在上端两层电路板之间，遮光筒从上端框中央向外。",
  [
   1.2,
   1,
   0.6
  ]
 ],
 [
  "antenna",
  "展开天线模块",
  "DEPLOYABLE ANTENNAS",
  "端部天线模块固定在上端框，四根卷尺式天线从模块边缘展开。",
  [
   0,
   1.4,
   0
  ]
 ],
 [
  "covers",
  "侧壁板与接口口盖",
  "SIDE PANELS",
  "前后侧壁板卡在导轨之间，前板设检修口和拔除销，后板为黑色阳极氧化面。",
  [
   0,
   -0.4,
   1.5
  ]
 ],
 [
  "base",
  "底端板、分离弹簧与部署开关",
  "BASE INTERFACE",
  "-Z端板连接四根导轨，两处分离弹簧柱塞和部署开关位于导轨端面支脚。",
  [
   0,
   -1.4,
   -0.7
  ]
 ]
];
export const INFO={
 source:'https://static1.squarespace.com/static/5418c831e4b0fa4ecac1bacd/t/62193b7fc9e72e0053f00910/1645820809779/CDS+REV14_1+2022-02-09.pdf',
 sourceName:'Cal Poly CubeSat Design Specification Rev 14.1，第31页',
 basis:'导轨主体按CDS Rev 14.1附录B第31页的100×100×340.5毫米3U外包络，导轨宽8.5毫米，模型1单位为100毫米。图纸提供端面与纵向两个正交视图。载荷、内部板卡、展开电池板、天线和表面细节属于网页造型补全，不是制造图纸。'
};
export function build(materials,info){
 const B=makeBuilder(materials),named=instantiateAsset(B,'cubesat',PARTS,materials);
 const wings=[-1,1].map((s,i)=>({g:named.get('cubesat-panel-hinge-'+i),s}));
 for(const {g}of wings)if(!g)throw new Error('立方星缺少太阳翼铰链');
 // 将GLB单精度保存的四分之一圈恢复为精确角度，避免面板朝向出现累计舍入。
 for(const [i,s]of [-1,1].entries()){
  named.get('body.panel.'+s).rotation.set(0,0,-s*PI/2);
  named.get('wing.panel.'+i).rotation.set(0,0,-s*PI/2);
 }
 B.root.traverse(o=>{
  if(!o.isMesh)return;const k=o.userData.materialKey,m=o.material;
  if(o.userData.part==='frame'&&k==='alloy'){m.color.setHex(0x5f666c);m.metalness=.55;m.roughness=.48;}
  if(k==='solar'){m.color.setHex(0x0f2442);m.metalness=.35;m.roughness=.34;m.envMapIntensity=.7;}
  if(k==='goldfoil'){m.color.setHex(0xc7a458);m.metalness=.80;m.roughness=.40;}
  if(k==='foil'){m.color.setHex(0xc5c9c9);m.metalness=.86;m.roughness=.36;}
 });
 function update(a,e){offsets(B,e);wings.forEach(({g,s})=>g.rotation.y=-s*(PI/2+.08*Math.sin(a*.18)));}
 return {...B,update,info};
}
