import * as T from '#three';
import {makeBuilder} from '#geometry';
import {instantiateAsset} from '#glb';
// 几何由blender/brake.py建模导出为models/brake.glb，本模块按部件组驱动运动。
// 1个模型单位=82.5毫米：制动盘外径330毫米对应4个单位。坐标与src/extras.mjs的代码造型一致，y向上、z沿制动盘轴线。
export const PARTS=[
 ['disc','通风制动盘','VENTILATED DISC','两片盘面之间由36条支承连接，54个盘面通孔与中间通风间隙相通，随轮毂同步旋转。',[0,0,1.8]],
 ['hub','轮毂与车轮螺栓','WHEEL HUB','轮毂轴颈穿过转向节，前端法兰贴住盘帽内侧，五根车轮螺栓穿过盘帽。',[0,0,-1.7]],
 ['caliper','固定式卡钳','CALIPER','卡钳两侧的实际孔容纳对向活塞，外侧连接桥避开完整盘缘，后侧固定耳连接支架。',[1.8,.4,0]],
 ['pads','制动片','BRAKE PADS','弧形摩擦面完整位于制动盘环面内，背板承接两侧活塞，盘面保留观察用间隙。',[1.3,-1,1.3]],
 ['pistons','对向活塞','OPPOSED PISTONS','四个活塞装入卡钳孔，前端中空并接到制动片背板，后端封闭。',[1.4,1.3,1.6]],
 ['bracket','卡钳支架与转向节','MOUNTING BRACKET','后侧支架连接卡钳固定耳，转向节座孔承托轮毂轴颈，安装臂提供外部固定位置。',[-1.6,-.7,-1]],
 ['hose','液压接头','HYDRAULIC LINE','接头连接卡钳上方的柔性管路。',[2,1.7,0]],
 ['shield','防尘挡板','DUST SHIELD','挡板内缘装在转向节座上，位于制动盘内侧并避开卡钳安装范围。',[0,-.5,-2]]
];
// 说明字段改写：外形依据与比例来自Brembo 09.7960.11制动盘规格页与固定式卡钳说明，内部结构与细节为网页造型补全。
export const INFO={
 basis:'外形与比例参考Brembo 09.7960.11制动盘官方规格页（外径Ø330毫米、厚度32毫米、盘高76毫米、5孔、通风式）与Brembo固定式卡钳说明：固定卡钳为单一主体刚性连接悬架，两侧各有两个活塞从两侧推动制动片。网页按1个模型单位=82.5毫米换算（制动盘外径330毫米对应4个单位），两片盘面之间留通风间隙、54个盘面通孔与36条支承筋相通，四个对向活塞装在卡钳两侧的实际孔内，两侧制动片与盘面间隙相等。盘帽、轮毂法兰、五根车轮螺栓、转向节座孔、防尘挡板与卡钳支架的尺寸属于网页造型补全，不是制造图纸、不是可制动设计，也不代表任何厂商具体套件。',
 source:'https://www.bremboparts.com/america/en/view-document/catalogue/disc/09-7960-11',
 sourceName:'Brembo 09.7960.11 制动盘规格页'
};
export function build(materials,info){
 const B=makeBuilder(materials);
 const named=instantiateAsset(B,'brake',PARTS,materials);
 // Blender会把重名网格导出成xxx.001；网页造型用重名网格表示同一类零件（四个活塞杯、两片盘面等），这里还原基础名。
 for(const [key,o]of [...named]){
  const base=key.replace(/\.\d{3}$/,'');
  if(base===key)continue;
  named.delete(key);
  o.name=base;
  if(!named.has(base))named.set(base,o);
 }
 const part=id=>B.parts.find(p=>p.id===id).group;
 function setOffsets(e){for(const p of B.parts)p.group.position.copy(p.base).addScaledVector(p.offset,e);}
 function update(a,e,mode){
  setOffsets(e);
  part('disc').rotation.z=a;
  part('hub').rotation.z=a;
 }
 return {...B,update,info};
}
