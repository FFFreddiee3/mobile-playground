import * as T from '#three';
import {makeBuilder} from '#geometry';
import {instantiateAsset} from '#glb';
// Blender建模入口为blender/webb.py，保持32个部件组和原有运动公式。
export const INFO={source:'https://science.nasa.gov/3d-resources/james-webb-space-telescope-a/',sourceName:'NASA Webb 官方三维模型',basis:'外形依据NASA官方Webb三维模型和公开总体尺寸。五层曲面遮阳膜与十八块主镜分别建立部件。尾部配平板按NASA公开展开图连接后托架，参考比对时恢复源模型的分离姿态。支承、促动器、设备箱、线缆与电池片细节属于网页造型补全，不是制造图纸。'};
const PARTS=[
 [
  "shield0",
  "遮阳板第5层（朝望远镜）",
  "SUNSHIELD LAYER",
  "风筝形薄膜由四角撑杆分开，各层互不接触，边缘带加强索。",
  [
   0,
   -0.65,
   0
  ]
 ],
 [
  "shield1",
  "遮阳板第4层",
  "SUNSHIELD LAYER",
  "风筝形薄膜由四角撑杆分开，各层互不接触，边缘带加强索。",
  [
   0,
   -1.01,
   0
  ]
 ],
 [
  "shield2",
  "遮阳板第3层",
  "SUNSHIELD LAYER",
  "风筝形薄膜由四角撑杆分开，各层互不接触，边缘带加强索。",
  [
   0,
   -1.37,
   0
  ]
 ],
 [
  "shield3",
  "遮阳板第2层",
  "SUNSHIELD LAYER",
  "风筝形薄膜由四角撑杆分开，各层互不接触，边缘带加强索。",
  [
   0,
   -1.73,
   0
  ]
 ],
 [
  "shield4",
  "遮阳板第1层（朝阳面）",
  "SUNSHIELD LAYER",
  "风筝形薄膜由四角撑杆分开，各层互不接触，边缘带加强索。",
  [
   0,
   -2.09,
   0
  ]
 ],
 [
  "booms",
  "遮阳板撑杆与伸展杆",
  "DEPLOYMENT BOOMS",
  "两根中部伸展杆把遮阳板向两侧拉开，前后托架连接两端，四角撑杆分开五层薄膜。",
  [
   0,
   -0.3,
   1.5
  ]
 ],
 [
  "backplane",
  "主镜背板与支承结构",
  "MIRROR BACKPLANE",
  "中央背板和两侧可折叠背板支承十八块镜片，背后安装科学仪器舱。",
  [
   0,
   0.9,
   -1.6
  ]
 ],
 [
  "mirror0",
  "主镜六边形镜片 01",
  "PRIMARY MIRROR SEGMENT",
  "独立六边形镜片经背部促动器装在背板上，镜面和背部支承分开显示。",
  [
   -0.6162,
   0.5263359724041174,
   1.4
  ]
 ],
 [
  "mirror1",
  "主镜六边形镜片 02",
  "PRIMARY MIRROR SEGMENT",
  "独立六边形镜片经背部促动器装在背板上，镜面和背部支承分开显示。",
  [
   -0.6162,
   0.8,
   1.4
  ]
 ],
 [
  "mirror2",
  "主镜六边形镜片 03",
  "PRIMARY MIRROR SEGMENT",
  "独立六边形镜片经背部促动器装在背板上，镜面和背部支承分开显示。",
  [
   -0.6162,
   1.0736640275958824,
   1.4
  ]
 ],
 [
  "mirror3",
  "主镜六边形镜片 04",
  "PRIMARY MIRROR SEGMENT",
  "独立六边形镜片经背部促动器装在背板上，镜面和背部支承分开显示。",
  [
   -0.3081,
   0.38950395860617615,
   1.4
  ]
 ],
 [
  "mirror4",
  "主镜六边形镜片 05",
  "PRIMARY MIRROR SEGMENT",
  "独立六边形镜片经背部促动器装在背板上，镜面和背部支承分开显示。",
  [
   -0.3081,
   0.6631679862020587,
   1.4
  ]
 ],
 [
  "mirror5",
  "主镜六边形镜片 06",
  "PRIMARY MIRROR SEGMENT",
  "独立六边形镜片经背部促动器装在背板上，镜面和背部支承分开显示。",
  [
   -0.3081,
   0.9368320137979413,
   1.4
  ]
 ],
 [
  "mirror6",
  "主镜六边形镜片 07",
  "PRIMARY MIRROR SEGMENT",
  "独立六边形镜片经背部促动器装在背板上，镜面和背部支承分开显示。",
  [
   -0.3081,
   1.210496041393824,
   1.4
  ]
 ],
 [
  "mirror7",
  "主镜六边形镜片 08",
  "PRIMARY MIRROR SEGMENT",
  "独立六边形镜片经背部促动器装在背板上，镜面和背部支承分开显示。",
  [
   0,
   0.25267194480823485,
   1.4
  ]
 ],
 [
  "mirror8",
  "主镜六边形镜片 09",
  "PRIMARY MIRROR SEGMENT",
  "独立六边形镜片经背部促动器装在背板上，镜面和背部支承分开显示。",
  [
   0,
   0.5263359724041174,
   1.4
  ]
 ],
 [
  "mirror9",
  "主镜六边形镜片 10",
  "PRIMARY MIRROR SEGMENT",
  "独立六边形镜片经背部促动器装在背板上，镜面和背部支承分开显示。",
  [
   0,
   1.0736640275958824,
   1.4
  ]
 ],
 [
  "mirror10",
  "主镜六边形镜片 11",
  "PRIMARY MIRROR SEGMENT",
  "独立六边形镜片经背部促动器装在背板上，镜面和背部支承分开显示。",
  [
   0,
   1.347328055191765,
   1.4
  ]
 ],
 [
  "mirror11",
  "主镜六边形镜片 12",
  "PRIMARY MIRROR SEGMENT",
  "独立六边形镜片经背部促动器装在背板上，镜面和背部支承分开显示。",
  [
   0.3081,
   0.38950395860617615,
   1.4
  ]
 ],
 [
  "mirror12",
  "主镜六边形镜片 13",
  "PRIMARY MIRROR SEGMENT",
  "独立六边形镜片经背部促动器装在背板上，镜面和背部支承分开显示。",
  [
   0.3081,
   0.6631679862020587,
   1.4
  ]
 ],
 [
  "mirror13",
  "主镜六边形镜片 14",
  "PRIMARY MIRROR SEGMENT",
  "独立六边形镜片经背部促动器装在背板上，镜面和背部支承分开显示。",
  [
   0.3081,
   0.9368320137979413,
   1.4
  ]
 ],
 [
  "mirror14",
  "主镜六边形镜片 15",
  "PRIMARY MIRROR SEGMENT",
  "独立六边形镜片经背部促动器装在背板上，镜面和背部支承分开显示。",
  [
   0.3081,
   1.210496041393824,
   1.4
  ]
 ],
 [
  "mirror15",
  "主镜六边形镜片 16",
  "PRIMARY MIRROR SEGMENT",
  "独立六边形镜片经背部促动器装在背板上，镜面和背部支承分开显示。",
  [
   0.6162,
   0.5263359724041174,
   1.4
  ]
 ],
 [
  "mirror16",
  "主镜六边形镜片 17",
  "PRIMARY MIRROR SEGMENT",
  "独立六边形镜片经背部促动器装在背板上，镜面和背部支承分开显示。",
  [
   0.6162,
   0.8,
   1.4
  ]
 ],
 [
  "mirror17",
  "主镜六边形镜片 18",
  "PRIMARY MIRROR SEGMENT",
  "独立六边形镜片经背部促动器装在背板上，镜面和背部支承分开显示。",
  [
   0.6162,
   1.0736640275958824,
   1.4
  ]
 ],
 [
  "tower",
  "可伸展支承塔",
  "DEPLOYABLE TOWER",
  "两段套接的黑色复合材料圆管把光学组件与下方航天器平台隔开。",
  [
   0,
   0.4,
   -2
  ]
 ],
 [
  "secondary",
  "次镜与三根支杆",
  "SECONDARY MIRROR",
  "三根长支杆从背板边缘伸出，把0.74米次镜固定在主镜前方。",
  [
   0,
   1.5,
   1.5
  ]
 ],
 [
  "instruments",
  "科学仪器舱与电子设备",
  "SCIENCE INSTRUMENT MODULE",
  "仪器舱贴在主镜背板后方，通过框架与光学组件相连。",
  [
   0,
   1,
   -2.8
  ]
 ],
 [
  "bus",
  "航天器平台与隔热板",
  "SPACECRAFT BUS",
  "平台位于遮阳板朝阳一侧，提供供电、通信与姿态控制设备的安装空间。",
  [
   0,
   -1.7,
   0
  ]
 ],
 [
  "power",
  "太阳能电池板",
  "SOLAR POWER",
  "单组电池板位于遮阳结构的温暖侧。",
  [
   0,
   -1.4,
   -1.6
  ]
 ],
 [
  "antenna",
  "通信天线与安装转台",
  "COMMUNICATIONS",
  "通信天线通过转台连接航天器平台。",
  [
   1.9,
   -1,
   0
  ]
 ],
 [
  "trim",
  "尾部配平板与边缘支架",
  "AFT MOMENTUM FLAP",
  "尾部配平板经支杆连接后端托架。",
  [
   0,
   0.5,
   -2.4
  ]
 ]
];
export function build(materials,info){
 const B=makeBuilder(materials),named=instantiateAsset(B,'webb',PARTS,materials);
 const get=name=>{const o=named.get(name);if(!o)throw new Error('Webb缺少节点 '+name);return o;};
 for(let i=0;i<5;i++){
  const o=get('webb.membrane.'+i);o.userData.sunshieldLayer=i;o.material.side=T.DoubleSide;o.material.color.setHex(i>=3?0xb5a1b3:0xb8c0cf);o.material.metalness=.74;o.material.roughness=.42;
 }
 for(let i=0;i<18;i++){
  const o=get('webb.mirror.surface.'+i);o.userData.mirrorSegment=i;o.material.color.setHex(0xd9ad4b);o.material.metalness=.92;o.material.roughness=.19;
 }
 // 从实际圆柱的局部包围盒恢复尺寸描述，保留导出的安装方向。
 for(let i=0;i<3;i++){
  const o=get('webb.secondary.strut.'+i);o.geometry.computeBoundingBox();
  const size=o.geometry.boundingBox.getSize(new T.Vector3());
  o.geometry.type='CylinderGeometry';o.geometry.parameters={radiusTop:size.x/2,radiusBottom:size.x/2,height:size.y,radialSegments:64};
 }
 // 四角撑杆同样从实际圆柱的局部包围盒恢复尺寸描述，半径按微米取整。
 for(let i=0;i<4;i++){
  const o=get('webb.sunshield.corner-post.'+i);o.geometry.computeBoundingBox();
  const size=o.geometry.boundingBox.getSize(new T.Vector3()),r=Math.round(size.x/2*1e6)/1e6;
  o.geometry.type='CylinderGeometry';o.geometry.parameters={radiusTop:r,radiusBottom:r,height:size.y,radialSegments:48};
 }
 // 官方节点树中有子节点的网格改为同变换的空组承载，网格本身无子节点，合并绘制时子网格不会随父网格一起移除。
 const hosts=[];B.root.traverse(o=>{if(o.isMesh&&o.children.length)hosts.push(o);});
 for(const o of hosts){
  const g=new T.Group();g.name=o.name+'-node';g.userData.part=o.userData.part;g.position.copy(o.position);g.quaternion.copy(o.quaternion);g.scale.copy(o.scale);
  const parent=o.parent,index=parent.children.indexOf(o);parent.children[index]=g;g.parent=parent;o.parent=null;
  for(const c of [...o.children])g.add(c);o.position.set(0,0,0);o.quaternion.identity();o.scale.set(1,1,1);g.add(o);
 }
 const dishPivot=get('webb-antenna-gimbal');
 // 天线转台摆幅±0.05弧度：正向超过约0.06弧度时转臂会碰到平台散热管。
 const flapDisplay=get('webb.trim.flap1-display'),hingeDisplay=get('webb.trim.hinge6-display');
 const flapPosition=flapDisplay.position.clone(),flapQuaternion=flapDisplay.quaternion.clone(),hingePosition=hingeDisplay.position.clone();
 function refPose(){flapDisplay.position.set(0,0,0);flapDisplay.quaternion.identity();hingeDisplay.position.set(0,0,0);}
 function update(a,e){for(const p of B.parts)p.group.position.copy(p.base).addScaledVector(p.offset,e);dishPivot.rotation.y=.05*Math.sin(a*.20);flapDisplay.position.copy(flapPosition);flapDisplay.quaternion.copy(flapQuaternion);hingeDisplay.position.copy(hingePosition);}
 return {...B,update,refPose,refPoseNodes:[flapDisplay,hingeDisplay],info};
}
