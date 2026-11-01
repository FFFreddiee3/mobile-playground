import * as T from '#three';
import {makeBuilder} from '#geometry';
import {instantiateAsset} from '#glb';
// 仅加载照片外观与空腔，所有细节属于网页造型。
export const INFO={selected:'pins',cutaway:false,tag:'金属外壳 · 弧面隔热罩 · 两脚架',basis:'外形参考DVIDS公开照片，整体长度按公开年鉴作展示归一化。壳壁、空腔与外观细节为网页补全，不包含内部击发、供弹或闭锁机构，不是可用武器设计。',source:'https://www.dvidshub.net/image/4846113/m249-light-machine-gun-squad-automatic-weapon',sourceName:'DVIDS M249 侧视外观照片'};
const PARTS=[
 [
  "body",
  "机匣外壳",
  "RECEIVER",
  "机匣外壳分成壳壁、侧盖与空腔。剖开只显示空的分区，不包含击发、供弹或闭锁机构。",
  [
   -0.6,
   0.4,
   -0.7
  ]
 ],
 [
  "cover",
  "顶盖与导轨",
  "TOP COVER & RAIL",
  "顶盖、锁扣、铰轴和横向刻槽按照片分层排列。",
  [
   0,
   1.4,
   -0.4
  ]
 ],
 [
  "stock",
  "枪托与托底板",
  "STOCK & BUTTPAD",
  "聚合物枪托、支承管、表面压线与橡胶托底板连接后部外壳。",
  [
   -1.8,
   -0.2,
   0
  ]
 ],
 [
  "barrel",
  "枪管外形",
  "BARREL EXTERIOR",
  "外露长柱与阶梯套环表现照片的外形，内部不制作枪膛或机构。",
  [
   1.4,
   0.4,
   0.5
  ]
 ],
 [
  "cap",
  "消焰器外壳",
  "MUZZLE EXTERIOR",
  "前端短外壳具有开口和周向长槽，凹腔在后方终止。",
  [
   2.2,
   0.1,
   0
  ]
 ],
 [
  "grip",
  "握把与防滑纹",
  "GRIP",
  "握把保留倾斜轮廓、细密横纹和表面螺钉。",
  [
   -0.4,
   -1,
   0.7
  ]
 ],
 [
  "topblock",
  "弹链盒外壳",
  "BOX EXTERIOR",
  "侧向盒体只表现外壳、盒缘与卡扣，没有弹链、弹药或供弹机构。",
  [
   0,
   -1.4,
   0.6
  ]
 ],
 [
  "guard",
  "扳机与护圈",
  "TRIGGER & GUARD",
  "固定扳机与护圈只作外形展示，没有连接内部击发机构。",
  [
   -0.2,
   -0.7,
   -0.7
  ]
 ],
 [
  "handle",
  "提把与快拆接头",
  "CARRY HANDLE",
  "弯曲提把、波纹握持套与根部接头形成固定展示外形。",
  [
   0.9,
   1.2,
   -0.8
  ]
 ],
 [
  "bipod",
  "两脚架",
  "BIPOD",
  "两脚架由固定铰链外盖、套筒、下段支腿和脚板组成，展示伸缩分段的外观。",
  [
   1.2,
   -0.9,
   1
  ]
 ],
 [
  "bands",
  "护木与隔热罩",
  "HANDGUARD",
  "聚合物护木、侧面导轨与带孔弧面金属罩分别建模。",
  [
   1.1,
   0.5,
   -1
  ]
 ],
 [
  "sights",
  "照门与准星",
  "SIGHTS",
  "后部照门与前方环形准星保留可见孔口和表面接头。",
  [
   0.4,
   1.6,
   1
  ]
 ],
 [
  "panels",
  "侧板与外部操作件",
  "EXTERNAL DETAILS",
  "侧板、拉机柄、保险外形与抛壳口浅凹位按照片分层表现，内部为空。",
  [
   -0.6,
   0.4,
   1.5
  ]
 ],
 [
  "pins",
  "外部紧固件",
  "FASTENERS",
  "表面销钉与螺钉头贴合各自的外壳。",
  [
   -0.4,
   -0.3,
   -1.4
  ]
 ]
];
export function build(materials,info){
 const B=makeBuilder(materials),named=instantiateAsset(B,'lmg',PARTS,materials);
 const palette={dark:[0x262a2c,.52,.61],cast:[0x333638,.45,.67],black:[0x17191b,.08,.81],rubber:[0x101214,.02,.89],olive:[0x424838,.1,.82]};
 B.root.traverse(o=>{if(!o.isMesh)return;const f=palette[o.userData.materialKey];if(f){o.material.color.setHex(f[0]);o.material.metalness=f[1];o.material.roughness=f[2];}if(o.userData.part==='bipod'){o.material.color.setHex(0x16191b);o.material.metalness=.48;o.material.roughness=.72;}});
 function update(a,e){const turn=.16*Math.sin(a*.22);for(const p of B.parts){p.group.position.copy(p.base).addScaledVector(p.offset,e);p.group.rotation.y=turn;}}
 return {...B,update,info,inspection:{displayOnly:true,kind:'lmg',style:'M249 exterior',feet:[named.get('display-bipod.left'),named.get('display-bipod.right')]}};
}
