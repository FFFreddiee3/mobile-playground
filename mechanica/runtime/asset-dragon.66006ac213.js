import * as T from '#three';
import {makeBuilder} from '#geometry';
import {instantiateAsset} from '#glb';
// 几何由blender/dragon.py建模导出为models/dragon.glb，本模块按部件与子组名称驱动运动。
// 1个模型单位=2439 mm，使SpaceX公开总高8.1 m、直径4 m与代码造型闭合高度3.331单位、直径1.64单位一致。
// 鼻锥绕后侧铰轴（子组dragon-nose-hinge）往复开合，公式与代码造型逐字相同。
export const INFO={
 basis:'外形与比例依据SpaceX官网公开总体尺寸（总高8.1米、直径4米）与NASA肯尼迪航天中心发布的龙飞船正射线图与正射渲染图（KSC-20210723-PH-SPX01_0002、KSC-20200429-PH-SPX01_0001），三视轮廓与图版逐一比对。返回舱侧壁按侧视正投影半宽取样，下段收到热盾唇，上段为锥面，肩部圆角收到鼻锥座。壁厚、座椅、仪表板、舱口通道、后备舱贮箱与支撑、舷窗、推力器口与防热罩边缘属于网页造型补全，不是制造图纸，不代表可制造、可飞行或可运行的设计。',
 source:'https://images.nasa.gov/details/KSC-20210723-PH-SPX01_0002',
 sourceName:'NASA KSC 龙飞船正射线图与渲染图'
};
const PARTS=[
 ['trunk','非加压后备舱','TRUNK','后备舱承力筒连接返回舱，外表面一半为太阳能电池、一半为散热器。',[0,-1.4,-1.0]],
 ['solar','贴体太阳能电池','BODY SOLAR ARRAY','电池片覆盖后备舱的一半，不使用外伸太阳翼。',[-1.3,-.8,1.2]],
 ['radiator','半圆散热表面与尾部鳍片','RADIATOR & FINS','另一半热控面与尾部四片鳍片沿筒体分布。',[1.4,-1,.2]],
 ['frame','返回舱承架与压力壳','PRESSURE STRUCTURE','内部环框贴合舱壁，纵向支杆连接上下环框。',[0,.2,-1.5]],
 ['capsule','白色返回舱外壳','CAPSULE','锥形返回舱具有圆弧肩部和侧面舱口。',[-1.5,.4,-.8]],
 ['heatshield','返回防热大底','HEAT SHIELD','弧形防热底部安装在返回舱下缘，下沿嵌入后备舱顶端。',[0,-.4,1.7]],
 ['docking','前端对接机构外形','DOCKING RING','前端环框位于可翻转鼻锥内部。',[0,1.7,.8]],
 ['nose','翻转鼻锥','HINGED NOSE CONE','鼻锥绕后侧铰轴打开，露出前端对接口。',[1.2,1.9,-.2]],
 ['crew','四人座椅与舱内承架','CREW SEATING','四套座椅安装在舱底地板上，带固定头枕和约束带。',[1.7,.6,-.3]],
 ['controls','触摸显示与面板','CREW DISPLAYS','三块显示面板安装在乘员前方，面板两端固定在舱壁。',[0,1.3,1.4]],
 ['windows','舷窗与侧面舱门','WINDOWS & HATCH','两扇侧舷窗和舱门舷窗沿返回舱外表面安装。',[-1.4,.8,1.1]],
 ['systems','电源与环境设备','CABIN SYSTEMS','设备盒、通风管和下部供电模块固定在舱底地板与环框之间。',[1.4,-.2,-1.4]],
 ['pods','外部推进舱与小喷口','EXTERNAL PODS','四组外部罩壳各含两台逃逸发动机喷口，沿返回舱下侧分布。',[-1.5,-.3,-1.5]],
 ['parachutes','上部回收设备盒','RECOVERY EQUIPMENT','两具减速伞与四具主伞的收纳包固定在前部隔板上。',[0,2.2,-1.1]]
];
export function build(materials,info){
 const B=makeBuilder(materials),named=instantiateAsset(B,'dragon',PARTS,materials);
 const hinge=named.get('dragon-nose-hinge');
 if(!hinge)throw new Error('龙飞船模型缺少子组 dragon-nose-hinge');
 // GLB不携带几何类型：后备舱对开半筒在网页代码造型里是挤出环（B.tube→ExtrudeGeometry），
 // 这里按Blender同名构造（kit.tube沿轴挤出圆环）恢复类型标记，使外形主壳体筛选与代码造型一致。
 for(const o of B.parts.find(p=>p.id==='trunk').group.children)
  if(o.isMesh&&/^trunk-shell-/.test(o.name))o.geometry.type='ExtrudeGeometry';
 const setOffsets=e=>{for(const p of B.parts){p.group.position.copy(p.base).addScaledVector(p.offset,e);p.group.rotation.set(0,0,0);}};
 function update(a,e){setOffsets(e);hinge.rotation.x=-1.05-.18*Math.sin(a*.25);}
 const inspection={noseHinge:hinge,trunkTop:-.13,capsuleBottom:-.13,solarCells:300,trunkBase:-1.37,noseTop:1.951,diameter:1.64};
 return {...B,update,inspection,info};
}
