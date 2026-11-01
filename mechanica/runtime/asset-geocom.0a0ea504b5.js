import {makeBuilder} from '#geometry';
import {instantiateAsset} from '#glb';
// 部件文字与展开偏移来自原buildCommunication，运动公式保持原值。
const PARTS=[
 [
  "frame",
  "平台承力框架",
  "SPACECRAFT FRAME",
  "中心承力筒、上下层板和四角立柱组成主承力结构，外板与设备都固定在这一框架上。",
  [
   0,
   -1.3,
   0
  ]
 ],
 [
  "covers",
  "东西侧多层隔热毯",
  "THERMAL BLANKETS",
  "两侧隔热毯贴合层板和立柱外缘，压条分隔各块包覆，前侧剖开后露出内部设备。",
  [
   0,
   0.6,
   -1.7
  ]
 ],
 [
  "electronics",
  "电子设备箱与线束",
  "AVIONICS",
  "设备箱贴装在散热板内侧，电路板和线束沿箱体朝内一侧布置。",
  [
   -1.4,
   -0.5,
   -0.8
  ]
 ],
 [
  "batteries",
  "蓄电池组与配电",
  "BATTERY PACKS",
  "两组蓄电池贴装在散热板下半部内侧，单体顶部由连接条串接。",
  [
   1.4,
   -1.2,
   0
  ]
 ],
 [
  "radiator",
  "南北散热面与热管",
  "RADIATOR PANELS",
  "两侧白色散热板外表面排列光学反射片，内侧水平热管把设备热量传到板面。",
  [
   -1.7,
   0.7,
   0
  ]
 ],
 [
  "attitude",
  "反作用轮组",
  "REACTION WHEELS",
  "三个倾斜安装的反作用轮通过立座固定在底层板上，转子在罩内转动。",
  [
   0,
   -0.8,
   1.5
  ]
 ],
 [
  "adapter",
  "底部对接环与包带",
  "LAUNCH ADAPTER",
  "底层板下方的对接环与中心承力筒同轴，包带和螺栓把卫星固定在运载器接口上。",
  [
   0,
   -1.9,
   0
  ]
 ],
 [
  "solar0",
  "北侧太阳翼",
  "SOLAR ARRAY",
  "五块电池板经轭架和驱动座连接散热板，整翼绕根部转轴跟随太阳方向转动。",
  [
   -2.1,
   0.5,
   -0.4
  ]
 ],
 [
  "solar1",
  "南侧太阳翼",
  "SOLAR ARRAY",
  "五块电池板经轭架和驱动座连接散热板，整翼绕根部转轴跟随太阳方向转动。",
  [
   2.1,
   0.5,
   -0.4
  ]
 ],
 [
  "reflector0",
  "东侧展开反射器",
  "COMMUNICATIONS REFLECTOR",
  "反射器经展开臂和铰链座连接东西侧面，反射面朝向对地面馈源。",
  [
   0,
   0.6,
   1.6
  ]
 ],
 [
  "reflector1",
  "西侧展开反射器",
  "COMMUNICATIONS REFLECTOR",
  "反射器经展开臂和铰链座连接东西侧面，反射面朝向对地面馈源。",
  [
   0,
   0.6,
   -1.6
  ]
 ],
 [
  "reflector2",
  "对地面东向反射器",
  "COMMUNICATIONS REFLECTOR",
  "塔架把反射器支在对地面上方，反射面朝向外侧覆盖区。",
  [
   0,
   1.2,
   1.6
  ]
 ],
 [
  "reflector3",
  "对地面西向反射器",
  "COMMUNICATIONS REFLECTOR",
  "塔架把反射器支在对地面上方，反射面朝向外侧覆盖区。",
  [
   0,
   1.2,
   -1.6
  ]
 ],
 [
  "payload",
  "对地面馈源与输出复用器",
  "FEEDS & MULTIPLEXERS",
  "喇叭馈源对准各反射器，圆柱形输出复用器与设备箱装在对地面上。",
  [
   0,
   1.9,
   -0.5
  ]
 ],
 [
  "thrusters",
  "离子推力器与指向支架",
  "ION THRUSTERS",
  "四台离子推力器经指向支架装在平台底部四角，推力器出口朝外倾斜。",
  [
   0,
   -1.3,
   -1.7
  ]
 ]
];
export const INFO={basis:'外形依据Boeing Anik F1官方事实页、官方效果图及Telesat地面测试照片，翼展40.4米，每翼五块电池板。反射器口径为2.4米和2.2米，太阳翼采用单面电池片、背板和板间铰链组成的平板。内部结构、安装细节与照片推断尺寸为网页造型补全，不是制造图纸。',source:'https://web.archive.org/web/20050815080156/http://www.boeing.com/defense-space/space/bss/factsheets/702/anik_f1/anik_f1.html',sourceName:'Boeing Anik F1事实页与Telesat官方测试照片'};
export function build(materials,info){
 const B=makeBuilder(materials),named=instantiateAsset(B,'geocom',PARTS,materials);
 const all=[];B.root.traverse(o=>{all.push(o);if(o.name.startsWith('array-panel'))o.name='array-panel';if(o.name.startsWith('array-tracker'))o.name='array-tracker';if(o.name.startsWith('mli-blanket'))o.name='mli-blanket';if(o.name.startsWith('reflector-dish'))o.name='reflector-dish';});
 const wheels=all.filter(o=>o.name.startsWith('attitude-wheel')).sort((a,b)=>a.name.localeCompare(b.name));
 const wings=[named.get('tracker.0'),named.get('tracker.1')];wings.forEach(o=>{if(o)o.name='array-tracker';});
 if(wheels.length!==3||wings.some(o=>!o))throw new Error('geocom运动节点不完整');
 // 精确恢复绕y的PI角，保证南北翼电池面法向一致。
 named.get('mount.0').rotation.set(0,Math.PI,0);
 for(const o of all){if(!o.isMesh)continue;const k=o.userData.materialKey,m=o.material;
  if(k==='solar'){m.color.setHex(0x0f2442);m.metalness=.35;m.roughness=.34;m.clearcoat=.3;m.envMapIntensity=.7;}
  if(k==='goldfoil'){m.color.setHex(0xc7a458);m.metalness=.80;m.roughness=.40;}
  if(k==='foil'){m.color.setHex(0xc5c9c9);m.metalness=.86;m.roughness=.36;}
 }
 function update(a,e){for(const p of B.parts)p.group.position.copy(p.base).addScaledVector(p.offset,e);wheels.forEach((g,i)=>g.rotation.y=a*(.9+i*.25));wings.forEach((g,i)=>g.rotation.x=(i?-1:1)*.30*Math.sin(a*.12));}
 return {...B,update,info};
}
