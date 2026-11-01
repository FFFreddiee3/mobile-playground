import {makeBuilder} from '#geometry';
import {instantiateAsset} from '#glb';
import {offsets} from '#vehicle-kit';
const PARTS=[
 [
  "frame",
  "握持框架",
  "EXTERIOR DISPLAY",
  "框架外观与握把轮廓，连接固定外部控制件。",
  [
   -0.7,
   -0.5,
   -0.4
  ]
 ],
 [
  "slide",
  "套筒外壳",
  "EXTERIOR DISPLAY",
  "深灰套筒带圆弧顶面、防滑刻槽及抛壳口，剖开显示壳壁与空腔。",
  [
   0,
   0.9,
   -0.3
  ]
 ],
 [
  "barrel",
  "枪口外观",
  "EXTERIOR DISPLAY",
  "短盲凹腔表现枪口外观，不含内部枪管、膛室或膛线。",
  [
   1,
   0.35,
   0
  ]
 ],
 [
  "cap",
  "前端衬套与导杆塞",
  "EXTERIOR DISPLAY",
  "环形衬套与下部封闭导杆塞形成前端外观层次。",
  [
   1.4,
   0.15,
   0
  ]
 ],
 [
  "grip0",
  "左握把面板",
  "EXTERIOR DISPLAY",
  "深棕色圆角木质面板随握把后倾，菱形网格压纹在两颗螺钉周围留出平面区域。",
  [
   0,
   -0.4,
   -0.75
  ]
 ],
 [
  "grip1",
  "右握把面板",
  "EXTERIOR DISPLAY",
  "深棕色圆角木质面板随握把后倾，菱形网格压纹在两颗螺钉周围留出平面区域。",
  [
   0,
   -0.4,
   0.75
  ]
 ],
 [
  "guard",
  "扳机与护圈",
  "EXTERIOR DISPLAY",
  "固定扳机外形置于护圈内，无击发联动。",
  [
   0.6,
   -0.6,
   0.2
  ]
 ],
 [
  "sights",
  "准星与照门",
  "EXTERIOR DISPLAY",
  "前准星和后部带缺口照门固定在套筒顶部。",
  [
   0,
   1.2,
   0.6
  ]
 ],
 [
  "rear",
  "后部外观件",
  "EXTERIOR DISPLAY",
  "握把保险、鸭尾及击锤尾部仅作固定表面外形。",
  [
   -1.15,
   0.4,
   0.1
  ]
 ],
 [
  "base",
  "握把底部与背带环",
  "EXTERIOR DISPLAY",
  "主簧座外表面、弹匣底板及背带环，不含内部结构。",
  [
   0,
   -1.1,
   0
  ]
 ],
 [
  "panels",
  "外部操作件",
  "EXTERIOR DISPLAY",
  "拇指保险、空仓挂机柄、轴销头与弹匣释放钮均为静态外观。",
  [
   0,
   0.1,
   1
  ]
 ],
 [
  "rail",
  "框架前部",
  "EXTERIOR DISPLAY",
  "框架下缘及接缝外观。",
  [
   0.5,
   -0.8,
   -0.6
  ]
 ]
];
export const INFO={source:'https://www.iwm.org.uk/collections/item/object/30035890',sourceName:'IWM FIR 541 馆藏外观照片',selected:'panels',tag:'深灰钢面 · 木质握把 · 外观展品',short:'M1911A1 外观与外壳空间展示。',subtitle:'观察外部零件、表面质感及外壳空间。',cutaway:false,basis:'外形依据 IWM FIR 541 馆藏照片，比例按公开整体长度换算。外部细节与剖开壳壁、空腔为网页造型补全，不含内部击发、供弹、闭锁机构，不是可用武器设计。',phases:[['外壳','EXTERIOR','套筒圆弧、分缝、防滑纹和抛壳口。','slide'],['握把','GRIP','木质纹理、螺丝、底板和背带环。','grip0'],['外部件','DETAILS','固定控制件与后部轮廓。','panels'],['前端','FRONT','枪口、衬套与导杆塞的外观层次。','cap']]};
export function build(materials,info){
 const B=makeBuilder(materials);instantiateAsset(B,'pistol',PARTS,materials);
 // 深灰磷化表面和棕色握把仅为照片观感，不表示材料或性能验证。
 const palette={steel:[0x252823,.32,.80],dark:[0x1d201d,.24,.85],black:[0x141612,.12,.86],wood:[0x503522,.04,.71],cast:[0x2c2e28,.28,.82],chrome:[0x45473f,.55,.68]};
 B.root.traverse(o=>{if(!o.isMesh)return;const f=palette[o.userData.materialKey];if(f){o.material.color.setHex(f[0]);o.material.metalness=f[1];o.material.roughness=f[2];}});
 function update(a,e){offsets(B,e);const turn=.16*Math.sin(a*.22);for(const p of B.parts)p.group.rotation.y=turn;}
 return {...B,update,info,inspection:{displayOnly:true,kind:'pistol'}};
}
