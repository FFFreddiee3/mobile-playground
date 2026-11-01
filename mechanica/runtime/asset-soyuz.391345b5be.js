import * as T from '#three';
import {makeBuilder} from '#geometry';
import {instantiateAsset} from '#glb';
// 几何由blender/soyuz.py建模导出为models/soyuz.glb，本模块按部件与子组名称驱动运动。
// 1个模型单位=1600毫米，飞船纵轴沿Y，轨道舱朝+Y，太阳翼沿X展开。运动只有展开位移，与代码造型相同。
// 说明来源：轮廓按NASA国际空间站参考指南(2010.11)第75页正视线图重建，总体尺寸按ESA联盟TMA资料。
export const INFO={
 basis:'轮廓按NASA《Reference Guide to the International Space Station》2010年11月版第75页联盟号正视线图重建：轨道舱梨形罩内嵌2.26米承压球壳并经颈环接返回舱，服务舱锥段桁架与扩口裙边、裙边下主发动机与运载连接结构、交会天线与姿态喷嘴组均按线图位置重建。总体尺寸按ESA联盟TMA资料：服务舱长2.26米，返回舱长2.24米，轨道舱段长2.98米，最大直径2.72米，太阳翼跨度10.6米、面积约10平方米。舱内设备、座椅与细部属于网页造型补全，不是制造图纸。',
 source:'https://www.nasa.gov/wp-content/uploads/2022/06/508318main_iss_ref_guide_nov2010.pdf',
 sourceName:'NASA ISS Reference Guide（2010.11）第75页联盟号正视线图'};
const PARTS=[
 ['service','仪器推进舱外壳','SERVICE MODULE','服务舱由下部扩口推进段、圆柱仪器段和上部过渡段组成，后部安装太阳翼。',[0,-1.3,-.8]],
 ['mainengine','主发动机外部喷管','MAIN ENGINE','后部主发动机喷管与船体纵轴重合，顶端连接后封板。',[0,-2,0]],
 ['equipment','舱内设备与容器','EQUIPMENT','球形容器坐落在推进段底板上，设备盒安装在仪器段隔板上。',[1.3,-1,0]],
 ['descent','返回舱蒙皮','DESCENT MODULE','钟形返回舱底部嵌入服务舱上部过渡段，顶部舱口连接轨道舱。',[-1.4,.3,.7]],
 ['heatshield','返回舱防热底部','HEAT SHIELD','宽底部与返回舱周缘接合，落在服务舱过渡段支承环上。',[0,-.6,1.5]],
 ['crew','三人座椅与仪表','CREW CABIN','三套座椅并排安装在舱底地板上，仪表板位于乘员前上方。',[1.5,.4,-.5]],
 ['orbital','球形轨道舱','ORBITAL MODULE','前部球形空间经舱口通道连接返回舱，顶部连接对接机构。',[0,1.5,-1.3]],
 ['habitat','轨道舱设备与舱口','ORBITAL INTERIOR','设备架立在舱内隔板上，侧面舱口嵌在球壳上。',[-1.5,1.2,.8]],
 ['docking','对接机构与探杆','DOCKING INTERFACE','对接环框、机构筒和探杆保持共同轴线。',[0,2,.8]],
 ['solar0','左太阳翼','SOLAR ARRAY','四块电池板经根部支杆连接服务舱，两翼总跨度10.6米。',[-1.6,0,0]],
 ['solar1','右太阳翼','SOLAR ARRAY','四块电池板经根部支杆连接服务舱，两翼总跨度10.6米。',[1.6,0,0]],
 ['antennas','交会天线与传感器','RENDEZVOUS','交会天线支杆从轨道舱球壳伸出，服务舱侧面安装传感器杆。',[1.2,1.7,1.3]],
 ['thrusters','姿态控制外部组件','ATTITUDE HARDWARE','小型喷口成组安装在服务舱圆柱段外侧。',[-1.3,-1.2,1.1]]];
export function build(materials,info){
 const B=makeBuilder(materials);
 instantiateAsset(B,'soyuz',PARTS,materials);
 // 测试按代码造型的构造参数量取舱段尺寸：这里按网格名恢复几何类型标记，数值与网格实际半径一致。
 // descent.shell.*（LatheGeometry）是返回舱钟形主壳，heatshield.bowl是防热底，orbital.shell.*是2.26米承压球壳（SphereGeometry，半径0.70625）。
 const tag=(name,type,params)=>{const o=B.root.getObjectByName(name);if(!o)throw new Error('联盟号模型缺少网格 '+name);o.geometry.type=type;o.geometry.parameters=params;};
 tag('descent.shell.a','LatheGeometry');
 tag('descent.shell.b','LatheGeometry');
 tag('heatshield.bowl','LatheGeometry');
 tag('orbital.shell.a','SphereGeometry',{radius:.70625});
 tag('orbital.shell.b','SphereGeometry',{radius:.70625});
 // 网页给蒙皮用的浅绿镀层：与代码造型相同，只改本模型网格的材质副本。
 B.root.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh&&o.userData.materialKey==='foil'&&['descent','orbital','habitat'].includes(o.userData.part)){o.material.color.setHex(0x8d978b);o.material.metalness=.25;o.material.roughness=.62;}});
 const wings=[];B.root.traverse(o=>{if(o.name==='soyuz-solar-hinge')wings.push(o);});
 const update=(a,e)=>{for(const p of B.parts){p.group.position.copy(p.base).addScaledVector(p.offset,e);p.group.rotation.set(0,0,0);}};
 return {...B,update,info,
  inspection:{modules:['service','descent','orbital'],wings,smBase:-2.0725,smTop:-.66,dmBase:-.946,dmTop:.454,omBase:.454,omTop:2.3165,dockTop:2.3165,span:3.3125,unit:1.6}};
}
