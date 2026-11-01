import * as T from '#three';
import {makeBuilder} from '#geometry';
import {instantiateAsset} from '#glb';
import {offsets} from '#vehicle-kit';
// 几何来自Blender。剖开只显示壳壁与空腔，不包含内部武器机构。
const PARTS=[
 [
  "body",
  "铆接机匣",
  "EXTERIOR DISPLAY",
  "两侧钣金、底板与前后壳壁围成空腔，剖开只展示壳体。",
  [
   -0.5,
   0.5,
   -0.8
  ]
 ],
 [
  "cover",
  "顶盖、导轨与提把",
  "EXTERIOR DISPLAY",
  "顶盖与导轨分层排列，铰链和前段提把按照片补全外形。",
  [
   0.0,
   1.4,
   -0.3
  ]
 ],
 [
  "stock",
  "聚合物枪托与托底板",
  "EXTERIOR DISPLAY",
  "曲面枪托、托底纹理、背带环和连接座组成外部轮廓。",
  [
   -1.7,
   0.1,
   0.4
  ]
 ],
 [
  "jacket",
  "枪管外形与护罩",
  "EXTERIOR DISPLAY",
  "前段外形、带通风孔的护罩和侧面短导轨，不含内部机构。",
  [
   1.4,
   0.5,
   0.4
  ]
 ],
 [
  "cap",
  "开槽消焰器外形",
  "EXTERIOR DISPLAY",
  "外壳有开槽与端部开口，仅展示短空腔，不含内部功能结构。",
  [
   2.2,
   0.2,
   0.0
  ]
 ],
 [
  "grip",
  "手枪握把",
  "EXTERIOR DISPLAY",
  "倾斜握把带侧面压纹、螺丝头与外部按钮。",
  [
   -0.6,
   -0.6,
   0.7
  ]
 ],
 [
  "guard",
  "扳机与护圈",
  "EXTERIOR DISPLAY",
  "按照片补全扳机外形，固定展示，不连接内部机构。",
  [
   -0.2,
   -0.7,
   -0.7
  ]
 ],
 [
  "mount",
  "M192托架与调节外形",
  "EXTERIOR DISPLAY",
  "托架与支座相连，方向和高低调节旋钮仅表现外观。",
  [
   0.0,
   -0.7,
   -0.8
  ]
 ],
 [
  "tripod",
  "M192轻型三脚架外形",
  "EXTERIOR DISPLAY",
  "深色支架带腿套、锁紧外形与脚板，连接上方托架。",
  [
   0.0,
   -1.3,
   0.2
  ]
 ],
 [
  "sideblock",
  "右侧拉机柄与壳口",
  "EXTERIOR DISPLAY",
  "外部拉机柄、壳口边框和防尘盖，不含内部联动。",
  [
   -0.7,
   0.3,
   1.4
  ]
 ],
 [
  "sights",
  "照门与准星",
  "EXTERIOR DISPLAY",
  "固定照门、准星和底座形成照片中的上部轮廓。",
  [
   0.4,
   1.7,
   0.9
  ]
 ],
 [
  "panels",
  "机匣侧板与铆钉",
  "EXTERIOR DISPLAY",
  "铆接侧板、折边、刻字区和双排铆钉按照片分层布置。",
  [
   -0.6,
   0.6,
   -1.4
  ]
 ],
 [
  "collars",
  "导气筒外形与收拢两脚架",
  "EXTERIOR DISPLAY",
  "只表现导气筒壳体、箍带和收拢两脚架，不制作导气活塞。",
  [
   1.2,
   1.1,
   -0.7
  ]
 ],
 [
  "pins",
  "外部销钉与螺钉",
  "EXTERIOR DISPLAY",
  "钣金表面的销钉与螺钉头。",
  [
   0.0,
   -0.5,
   1.5
  ]
 ]
];
export const INFO={
 source:'https://www.dvidshub.net/image/4845949/m240',
 sourceName:'DVIDS M240B 外观照片与美国陆军整体长度资料',
 basis:'外形依据DVIDS军方公开照片与整体长度资料。局部比例、壳壁和内部空腔为网页造型补全，不是制造图纸。没有内部击发、供弹或闭锁机构，不是可用武器设计。',
 cutaway:false,selected:'body',tag:'铆接机匣 · 外部细节 · M192三脚架',
 phases:[['外观','EXTERIOR','观察机匣钣金、导轨、护罩与外部附件。','body'],['前段','FRONT','观察开槽外形与收拢两脚架。','jacket'],['支承','SUPPORT','观察M192三脚架外形与调节旋钮。','tripod'],['壳体','SHELL','剖开仅显示壳壁与空腔。','panels']]
};
export function build(materials,info){
 const B=makeBuilder(materials),named=instantiateAsset(B,'gpmg',PARTS,materials);
 // 机匣、枪管和钢制外附件共用中性深灰底色。粗糙度区分表面，避免侧板单独偏青。
 const palette={dark:[0x292927,.48,.72],steel:[0x30302e,.52,.67],black:[0x20201e,.05,.79],rubber:[0x171716,0,.88],cast:[0x292927,.48,.72]};
 B.root.traverse(o=>{if(!o.isMesh)return;const f=palette[o.userData.materialKey];if(f){o.material.color.setHex(f[0]);o.material.metalness=f[1];o.material.roughness=f[2];}
  if(['mount','tripod'].includes(o.userData.part)){o.material.color.setHex(o.userData.materialKey==='steel'?0x41433c:0x262b24);o.material.metalness=.42;o.material.roughness=.72;}
 });
 // Blender会将重复网格名加后缀，所有提把片段统一标记以保持原比例检查的对象范围。
 for(const [name,o] of named)if(name.startsWith('carry-handle'))o.name='carry-handle';
 const legs=Array.from({length:3},(_,i)=>{const a=i*Math.PI*2/3+Math.PI/3;return [-.05+.95*Math.cos(a),-1.22,.95*Math.sin(a)];});
 function update(a,e){offsets(B,e);const turn=.16*Math.sin(a*.22);for(const p of B.parts)p.group.rotation.y=turn;}
 return {...B,update,info,inspection:{displayOnly:true,kind:'gpmg',legs}};
}
