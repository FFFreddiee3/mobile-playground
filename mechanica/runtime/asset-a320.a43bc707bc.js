import * as T from '#three';
import {makeBuilder} from '#geometry';
import {offsets} from '#vehicle-kit';
import {instantiateAsset} from '#glb';
const PI=Math.PI;
// 几何由blender/a320.py建模导出为models/a320.glb，本模块按部件与子组名称驱动运动。
// 1个模型单位=3130.833 mm（37.57 m机长对应12个模型单位），x沿机身向后为正、y向上、z向右舷为正。
// 铰链子组（airliner-control-hinge、airliner-rudder-hinge）的局部X轴即铰链轴，蒙皮顶点已按该坐标系摆放。
export const PARTS=[
 ['hull','机身蒙皮与舷窗','FUSELAGE','圆滑机头、上翘尾锥与带窗孔的机身蒙皮相接，剖切时移开上部蒙皮。',[0,2,-2]],
 ['cockpit','驾驶舱与前风挡','FLIGHT DECK','六块前风挡随机头曲面布置，后方为双座驾驶舱与仪表台。',[-2.2,1.4,1.3]],
 ['frames','隔框、地板与货舱','FRAMES & DECK','机身隔框贴住蒙皮内侧支承客舱地板，地板从驾驶舱延伸到后舱，下方为货舱。',[0,-1.3,0]],
 ['cabin','客舱座椅与行李架','PASSENGER CABIN','座椅分列中央过道两侧并由支脚立在地板上，上部行李架避开舷窗。',[0,1.5,2]],
 ['wingL','左主翼','WING ASSEMBLY','带厚度的曲面机翼连接翼梁与翼肋，后缘为独立活动翼面。',[.4,.4,-2.7]],
 ['wingR','右主翼','WING ASSEMBLY','带厚度的曲面机翼连接翼梁与翼肋，后缘为独立活动翼面。',[.4,.4,2.7]],
 ['flaps','襟翼、副翼与扰流板','WING CONTROLS','活动翼面沿实际连接轴偏转，展向缝隙中的铰链支座连接固定翼面。',[.5,1.5,2.4]],
 ['tailplane','水平尾翼','HORIZONTAL TAIL','左右尾翼有渐薄截面，根部穿入机身尾段。',[2.1,.6,0]],
 ['fin','垂直尾翼与方向舵','VERTICAL TAIL','方向舵绕后掠铰链轴偏转，下缘离开尾锥顶面。',[2.4,1.5,0]],
 ['gears','起落架、支柱与舱门','LANDING GEAR','成对机轮夹住支柱并绕各自短轴转动，主支柱接入机翼或发动机短舱，前支柱接入机头下部。',[0,-1.6,1.7]],
 ['tanks','翼内油箱与中央油箱','WING TANKS','油箱位于翼盒与内侧翼段，厚度收在上下翼面之间。',[0,-1.3,-2.2]],
 ['systems','液压、供电与环境管路','AIRCRAFT SYSTEMS','地板下管路沿货舱顶面连接前后系统舱。',[0,1.2,-2.6]],
 ['engineL0','左发动机','ENGINE ASSEMBLY','前置风扇、核心机与喷管组成翼下涡扇，吊架接到主翼下方。',[-.8,.8,-2.7]],
 ['engineR0','右发动机','ENGINE ASSEMBLY','前置风扇、核心机与喷管组成翼下涡扇，吊架接到主翼下方。',[-.8,.8,2.7]],
 ['doors','客舱门与货舱门','DOORS','弯曲舱门边框贴合机身，主门、紧急出口和货舱门分层布置。',[0,1.6,2.8]]
];
export const INFO={
 source:'https://www.aircraft.airbus.com/sites/g/files/jlcbta126/files/2025-01/AC_A320_0624.pdf',
 sourceName:'Airbus A320 机场与维修规划手册（2024年6月版，2-2-0节 General Aircraft Dimensions：FIGURE-2-2-0-991-004-A01 第3、4张）',
 basis:'机长、翼展、机身截面、轮距、发动机横向位置、离地高度与舱门位置按 Airbus A320 机场与维修规划手册（2024 年 6 月版）2-2-0 节 General Aircraft Dimensions 的 A320-200 Sharklet 外形尺寸图（第3、4张），前视图同取 A320-200 的第3张尺寸图。翼型坐标、客舱、货舱与发动机内部由结构关系补全，用于网页观察，不是制造图纸。'
};
export function build(materials,info){
 const B=makeBuilder(materials),named=instantiateAsset(B,'a320',PARTS,materials),part=id=>B.parts.find(p=>p.id===id).group;
 // Blender导出时同名节点会加.001后缀，按前缀取用子组。
 const byPrefix=prefix=>{const out=[];B.root.traverse(o=>{if(o.isGroup&&o.name.startsWith(prefix))out.push(o);});return out;};
 const all=[];B.root.traverse(o=>{if(o.isGroup)all.push(o);});
 const hinges=byPrefix('airliner-control-hinge');
 const rudder=byPrefix('airliner-rudder-hinge')[0];
 const wheels=byPrefix('airliner-wheel');
 if(hinges.length!==8||wheels.length!==6||!rudder)throw new Error('A320模型子组数量不符 '+hinges.length+'/'+wheels.length);
 // 网页原型按语义名称查找全部同类对象，Blender的唯一名称后缀仅用于文件导出。
 for(const g of [...hinges,...wheels,...byPrefix('airliner-engine-rotor'),rudder])g.name=g.name.replace(/\.\d+$/,'');
 part('cockpit').traverse(o=>{if(o.name.startsWith('airliner-cockpit-pane'))o.name='airliner-cockpit-pane';});
 // GLB单精度旋转分量会使固定仪表板的四元数略短于1，载入时恢复单位长度。
 part('cockpit').traverse(o=>{if(o.isGroup)o.quaternion.normalize();});
 // Blender按名称字母顺序导出子节点：这里把上下蒙皮放在封边之前，并把两个蒙皮统一命名为airliner-wing-skin。
 for(const g of hinges){const kids=[...g.children];
  const skins=kids.filter(o=>o.name.startsWith('airliner-wing-skin'));
  const rest=kids.filter(o=>!o.name.startsWith('airliner-wing-skin'));
  g.children.length=0;skins.forEach(o=>g.children.push(o));rest.forEach(o=>g.children.push(o));
  skins.forEach(o=>{o.name='airliner-wing-skin';o.userData.hingeAxis=[1,0,0];});
  g.userData.hingeAxis=[1,0,0];}
 rudder.userData.hingeAxis=[1,0,0];
 // 油箱网格带标记，供翼面厚度检查使用；透明件双面渲染，保证开孔处能看见玻璃。
 part('tanks').traverse(o=>{if(o.isMesh)o.userData.tank=true;});
 for(const key of ['glass','optics'])for(const o of [part('hull'),part('cockpit')])o.traverse(m=>{if(m.isMesh&&m.userData.materialKey===key)m.material.side=T.DoubleSide;});
 // 舷窗使用独立的深色镀膜玻璃，闭合时遮住客舱，剖开时仍由既有cut标记移开。
 part('hull').traverse(o=>{if(o.isMesh&&o.name.startsWith('airliner-cabin-window')){
  o.material.color.setHex(0x0b1117);
  Object.assign(o.material,{transparent:false,opacity:1,transmission:0,depthWrite:true,
   metalness:.25,roughness:.18,clearcoat:1,clearcoatRoughness:.08,envMapIntensity:.6});
 }});
 // 驾驶舱为独立克隆材质：灰色织物、蓝灰控制台和黑色屏框各自保留表面属性。
 part('cockpit').traverse(o=>{if(!o.isMesh||o.name.startsWith('airliner-cockpit-pane'))return;
  const key=o.userData.materialKey;
  if(key==='sand')Object.assign(o.material,{metalness:0,roughness:.9}),o.material.color.setHex(0xa7a59c);
  if(key==='alloy')Object.assign(o.material,{metalness:.15,roughness:.6}),o.material.color.setHex(0x657b88);
  if(key==='dark')Object.assign(o.material,{metalness:.1,roughness:.65});
  if(key==='screen')Object.assign(o.material,{emissiveIntensity:.25,metalness:0,roughness:.48});
 });
 const hingeBase=hinges.map(g=>g.quaternion.clone()),rudderBase=rudder.quaternion.clone();
 const rotorList=byPrefix('airliner-engine-rotor');
 const wheelList=wheels;
 function update(a,e,mode){
  offsets(B,e);
  rotorList.forEach(g=>g.rotation.x=a*1.6);
  wheelList.forEach(g=>g.rotation.z=-a*.3);
  hinges.forEach((g,i)=>{const q=new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),.09*Math.sin(a*.30));g.quaternion.copy(hingeBase[i]).multiply(q);});
  const qr=new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),.065*Math.sin(a*.28));rudder.quaternion.copy(rudderBase).multiply(qr);
 }
 return {...B,update,info:{...info,...INFO}};
}
