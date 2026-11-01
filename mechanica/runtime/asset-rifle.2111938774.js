// M4风格外观的Blender资产，运动和部件顺序沿用原网页。
import {makeBuilder} from '#geometry';
import {instantiateAsset} from '#glb';
const PARTS=[
 [
  "body",
  "上、下机匣",
  "EXTERIOR DISPLAY",
  "上下分体外壳具有平顶导轨、倒角肩、连接耳、分缝与空腔，剖开右侧壳体可观察壁厚。",
  [
   -0.8,
   0.4,
   -0.7
  ]
 ],
 [
  "stock",
  "伸缩枪托",
  "EXTERIOR DISPLAY",
  "连续曲面的注塑枪托、贴腮面、缓冲管外形、调节杆、背带孔与后垫。",
  [
   -1.7,
   -0.3,
   0.4
  ]
 ],
 [
  "cover",
  "拉机柄",
  "EXTERIOR DISPLAY",
  "静态T形拉机柄外观和两侧防滑刻槽。",
  [
   0,
   1,
   -0.6
  ]
 ],
 [
  "handguard",
  "圆弧护木与隔热罩",
  "EXTERIOR DISPLAY",
  "两半圆弧护木带环向凸纹，内侧为金属隔热罩空壳。",
  [
   1,
   0.6,
   0.7
  ]
 ],
 [
  "barrel",
  "前部管体外观",
  "EXTERIOR DISPLAY",
  "前部阶梯管体，仅展示外表面，不连接工作机构。",
  [
   1.6,
   0.1,
   0
  ]
 ],
 [
  "cap",
  "枪口装置",
  "EXTERIOR DISPLAY",
  "带外部刻槽与浅开口的枪口装置外观。",
  [
   2.2,
   0.3,
   0.2
  ]
 ],
 [
  "grip",
  "手枪握把",
  "EXTERIOR DISPLAY",
  "后倾握把带曲面纹理侧板、螺钉与底缘。",
  [
   0.2,
   -1,
   0.6
  ]
 ],
 [
  "lowerblock",
  "弹匣外观",
  "EXTERIOR DISPLAY",
  "深色弧形外观壳体带加强筋和底板，没有内部供弹件。",
  [
   0,
   -1.1,
   0
  ]
 ],
 [
  "guard",
  "扳机与护圈",
  "EXTERIOR DISPLAY",
  "静态扳机外观置于护圈内，没有内部击发机构。",
  [
   0.3,
   -0.7,
   -0.8
  ]
 ],
 [
  "rail",
  "上机匣导轨",
  "EXTERIOR DISPLAY",
  "带横向刻槽的顶部导轨。",
  [
   0,
   1.3,
   -0.1
  ]
 ],
 [
  "sights",
  "提把与照门准星",
  "EXTERIOR DISPLAY",
  "提把、外观照门孔、调节轮、A形前座与准星柱。",
  [
   0,
   1.8,
   0.6
  ]
 ],
 [
  "panels",
  "外部操作件与防尘盖",
  "EXTERIOR DISPLAY",
  "保险、释放钮、辅助钮、开口防尘盖，仅为静态外观。",
  [
   -0.6,
   0.5,
   1.2
  ]
 ],
 [
  "attachments",
  "背带环与环座",
  "EXTERIOR DISPLAY",
  "前后背带环与固定环座接在外壳表面。",
  [
   -1,
   0.2,
   -1.3
  ]
 ],
 [
  "pins",
  "机匣连接销与螺钉",
  "EXTERIOR DISPLAY",
  "外露销帽与表面螺钉头。",
  [
   0,
   -0.3,
   1.5
  ]
 ]
];
export const INFO={source:'https://commons.wikimedia.org/wiki/File:Carbine_M4_1.jpg',sourceName:'美国陆军TACOM与PEO外观照片',cutaway:false,basis:'外观依据美国陆军公开照片，保留M4风格的圆弧护木和提把。总体比例沿用已固定的外观参考，表面细节与剖面中的壁厚、空腔为网页造型补全。没有内部击发、供弹或闭锁机构，不是可用武器设计。'};
export function build(materials,info){
 const B=makeBuilder(materials),named=instantiateAsset(B,'rifle',PARTS,materials);
 const finish={dark:[0x3c4245,.62,.52],steel:[0x30373b,.70,.47],black:[0x1d2225,.10,.75],rubber:[0x191d20,.02,.85],cast:[0x757b7e,.5,.55]};
 B.root.traverse(o=>{if(!o.isMesh)return;const f=finish[o.userData.materialKey];if(f){o.material.color.setHex(f[0]);o.material.metalness=f[1];o.material.roughness=f[2];}
  if(o.userData.part==='body'&&o.userData.materialKey==='dark'){o.material.color.setHex(0x20262a);o.material.metalness=.40;o.material.roughness=.59;}
  if(o.userData.part==='lowerblock'){o.material.color.setHex(o.userData.materialKey==='dark'?0x151b1f:0x252b30);o.material.metalness=.32;o.material.roughness=.65;}
 });
 function update(a,e){for(const p of B.parts){p.group.position.copy(p.base).addScaledVector(p.offset,e);p.group.rotation.y=.16*Math.sin(a*.22);}}
 return {...B,update,info,inspection:{displayOnly:true,kind:'rifle',style:'M4 exterior'}};
}
