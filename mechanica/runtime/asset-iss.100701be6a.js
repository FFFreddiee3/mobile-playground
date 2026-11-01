import {makeBuilder} from '#geometry';
import {offsets} from '#vehicle-kit';
import {instantiateAsset} from '#glb';
const PARTS=[
 [
  "truss0",
  "主桁架第1段",
  "INTEGRATED TRUSS",
  "纵向管梁和交叉支杆组成主承力结构，各段端面对接。",
  [
   -1.25,
   1,
   0
  ]
 ],
 [
  "truss1",
  "主桁架第2段",
  "INTEGRATED TRUSS",
  "纵向管梁和交叉支杆组成主承力结构，各段端面对接。",
  [
   -1,
   1,
   0
  ]
 ],
 [
  "truss2",
  "主桁架第3段",
  "INTEGRATED TRUSS",
  "纵向管梁和交叉支杆组成主承力结构，各段端面对接。",
  [
   -0.75,
   1,
   0
  ]
 ],
 [
  "truss3",
  "主桁架第4段",
  "INTEGRATED TRUSS",
  "纵向管梁和交叉支杆组成主承力结构，各段端面对接。",
  [
   -0.5,
   1,
   0
  ]
 ],
 [
  "truss4",
  "主桁架第5段",
  "INTEGRATED TRUSS",
  "纵向管梁和交叉支杆组成主承力结构，各段端面对接。",
  [
   -0.25,
   1,
   0
  ]
 ],
 [
  "truss5",
  "主桁架中央段 S0",
  "INTEGRATED TRUSS",
  "纵向管梁和交叉支杆组成主承力结构，各段端面对接。",
  [
   0,
   1,
   0
  ]
 ],
 [
  "truss6",
  "主桁架第7段",
  "INTEGRATED TRUSS",
  "纵向管梁和交叉支杆组成主承力结构，各段端面对接。",
  [
   0.25,
   1,
   0
  ]
 ],
 [
  "truss7",
  "主桁架第8段",
  "INTEGRATED TRUSS",
  "纵向管梁和交叉支杆组成主承力结构，各段端面对接。",
  [
   0.5,
   1,
   0
  ]
 ],
 [
  "truss8",
  "主桁架第9段",
  "INTEGRATED TRUSS",
  "纵向管梁和交叉支杆组成主承力结构，各段端面对接。",
  [
   0.75,
   1,
   0
  ]
 ],
 [
  "truss9",
  "主桁架第10段",
  "INTEGRATED TRUSS",
  "纵向管梁和交叉支杆组成主承力结构，各段端面对接。",
  [
   1,
   1,
   0
  ]
 ],
 [
  "truss10",
  "主桁架第11段",
  "INTEGRATED TRUSS",
  "纵向管梁和交叉支杆组成主承力结构，各段端面对接。",
  [
   1.25,
   1,
   0
  ]
 ],
 [
  "solar0",
  "第1组太阳翼",
  "SOLAR ARRAY WINGS",
  "每组两翼经转接筒连接桁架，每翼由中央桅杆和两侧电池毯组成。",
  [
   -1.2,
   1.5,
   0
  ]
 ],
 [
  "solar1",
  "第2组太阳翼",
  "SOLAR ARRAY WINGS",
  "每组两翼经转接筒连接桁架，每翼由中央桅杆和两侧电池毯组成。",
  [
   -1.2,
   1.5,
   0
  ]
 ],
 [
  "solar2",
  "第3组太阳翼",
  "SOLAR ARRAY WINGS",
  "每组两翼经转接筒连接桁架，每翼由中央桅杆和两侧电池毯组成。",
  [
   1.2,
   1.5,
   0
  ]
 ],
 [
  "solar3",
  "第4组太阳翼",
  "SOLAR ARRAY WINGS",
  "每组两翼经转接筒连接桁架，每翼由中央桅杆和两侧电池毯组成。",
  [
   1.2,
   1.5,
   0
  ]
 ],
 [
  "zvezda",
  "星辰号服务舱",
  "PRESSURIZED MODULE",
  "舱段经端部对接环相连，外部包覆与内部设备分层展示。",
  [
   0,
   -1.2,
   -1.5
  ]
 ],
 [
  "zarya",
  "曙光号功能货舱",
  "PRESSURIZED MODULE",
  "舱段经端部对接环相连，外部包覆与内部设备分层展示。",
  [
   0,
   -1.2,
   -0.845
  ]
 ],
 [
  "unity",
  "团结号节点舱",
  "PRESSURIZED MODULE",
  "舱段经端部对接环相连，外部包覆与内部设备分层展示。",
  [
   0,
   -1.2,
   -0.325
  ]
 ],
 [
  "destiny",
  "命运号实验舱",
  "PRESSURIZED MODULE",
  "舱段经端部对接环相连，外部包覆与内部设备分层展示。",
  [
   0,
   -1.2,
   0.175
  ]
 ],
 [
  "harmony",
  "和谐号节点舱",
  "PRESSURIZED MODULE",
  "舱段经端部对接环相连，外部包覆与内部设备分层展示。",
  [
   0,
   -1.2,
   0.715
  ]
 ],
 [
  "kibo",
  "希望号实验舱",
  "SIDE MODULE",
  "侧向舱段经对接环连接节点舱，舱外扶手和接口可分别观察。",
  [
   -1.7,
   -0.7,
   0.572
  ]
 ],
 [
  "columbus",
  "哥伦布实验舱",
  "SIDE MODULE",
  "侧向舱段经对接环连接节点舱，舱外扶手和接口可分别观察。",
  [
   1.7,
   -0.7,
   0.572
  ]
 ],
 [
  "tranquility",
  "宁静号节点舱",
  "SIDE MODULE",
  "侧向舱段经对接环连接节点舱，舱外扶手和接口可分别观察。",
  [
   -1.7,
   -0.7,
   -0.26
  ]
 ],
 [
  "quest",
  "探索号气闸舱",
  "SIDE MODULE",
  "侧向舱段经对接环连接节点舱，舱外扶手和接口可分别观察。",
  [
   1.7,
   -0.7,
   -0.26
  ]
 ],
 [
  "nauka",
  "科学号实验舱",
  "SIDE MODULE",
  "侧向舱段经对接环连接节点舱，舱外扶手和接口可分别观察。",
  [
   0,
   -1.6,
   -1.16
  ]
 ],
 [
  "docking",
  "对接接口与转接舱",
  "DOCKING ADAPTERS",
  "和谐号前端与星辰号后端的接口形成载人及货运飞船的连接位置。",
  [
   0,
   -0.2,
   2
  ]
 ],
 [
  "cupola",
  "穹顶舱与观察窗",
  "CUPOLA",
  "穹顶舱装在宁静号对地一侧，由中央窗和六扇周向窗组成七扇窗口。",
  [
   -1.5,
   -1.4,
   -0.7
  ]
 ],
 [
  "radiator0",
  "左舷散热器",
  "THERMAL RADIATORS",
  "主散热器翼经热控旋转接头连接P1桁架，横梁上三块散热器单元各八片白色板；外侧P4与P6各有一块七片板的光伏散热器。",
  [
   -1,
   2,
   -1.5
  ]
 ],
 [
  "radiator1",
  "右舷散热器",
  "THERMAL RADIATORS",
  "主散热器翼经热控旋转接头连接S1桁架，横梁上三块散热器单元各八片白色板；外侧S4与S6各有一块七片板的光伏散热器。",
  [
   1,
   2,
   -1.5
  ]
 ],
 [
  "rus-solar",
  "俄方舱段太阳翼",
  "RUSSIAN SEGMENT ARRAYS",
  "小型太阳翼经支杆布置在服务舱和功能货舱两侧。",
  [
   0,
   -0.5,
   -2.3
  ]
 ],
 [
  "arm",
  "空间站机械臂",
  "ROBOTIC ARM",
  "串联关节连接两段长臂，端部随关节运动而保持连接。",
  [
   -1.8,
   1.2,
   1.6
  ]
 ],
 [
  "platform",
  "外部实验与设备平台",
  "EXTERNAL PAYLOADS",
  "实验平台接在希望号外端，设备箱、天线和通信结构连接舱体或桁架。",
  [
   1.7,
   0.8,
   1.6
  ]
 ]
];
export const INFO={
 source:'https://science.nasa.gov/3d-resources/international-space-station-iss-d-igoal/',
 sourceName:'NASA IGOAL 国际空间站三维资源',
 basis:'外形参考NASA IGOAL发布的含科学号实验舱与增设太阳翼的国际空间站三维资源，尺寸按NASA参考手册文字数字修正：主桁架94米、太阳翼总跨度109米、翼展73米、单翼宽38英尺，团结号18×14英尺、和谐号22×14英尺、科学号长43英尺，主散热器与光伏散热器板按NASA热控概览尺寸重建。舱内机柜、地板和机械臂动作为网页造型补全，不是实时在轨构型或制造图纸。'
};
export function build(materials,info){
 const B=makeBuilder(materials),named=instantiateAsset(B,'iss',PARTS,materials);
 const get=n=>{const o=named.get(n);if(!o)throw new Error('ISS缺少节点 '+n);return o;};
 const wings=[0,1,2,3].map(i=>get('solar.pivot.'+i));
 for(let i=0;i<4;i++){
  wings[i].name='station-solar-pivot';
  for(let q=0;q<2;q++)for(let side=0;side<2;side++)get(`solar.blanket.${i}.${q}.${side}`).name='station-solar-blanket';
 }
 for(let i=0;i<2;i++)get(`radiator.joint.${i}`).name='station-trrj';
 // 主散热器每翼三块单元、每块八片板；光伏散热器两翼各两块、每块七片板。
 for(let i=0;i<2;i++){
  for(let k=0;k<3;k++){get(`radiator.oru.${i}.${k}`).name='station-radiator-oru';for(let j=0;j<8;j++)get(`radiator.hrs.${i}.${k}.${j}`).name='station-hrs-panel';}
  for(let k=0;k<2;k++)for(let j=0;j<7;j++)get(`radiator.pvr.${i}.${k}.${j}`).name='station-pvr-panel';
 }
 B.root.traverse(o=>{if(o.isMesh&&o.userData.materialKey==='solar'){o.material.color.setHex(0x153652);o.material.metalness=.18;o.material.roughness=.62;o.material.clearcoat=.12;o.material.clearcoatRoughness=.55;o.material.envMapIntensity=.55;}});
 const shoulder=get('arm.shoulder'),upper=get('arm.upper'),elbow=get('arm.elbow'),wrist=get('arm.wrist');
 shoulder.name='station-arm-shoulder';upper.name='station-arm-upper';elbow.name='station-arm-elbow';
 elbow.position.set(0,1.1,0);wrist.position.set(0,1,0);
 const fixedAssemblies=[...wings,...['radiator0','radiator1','rus-solar'].map(id=>B.parts.find(p=>p.id===id).group)];
 function update(a,e){
  offsets(B,e);
  wings.forEach((g,i)=>g.rotation.x=.12*Math.sin(a*.12+i*.4));
  shoulder.rotation.z=-.50+.20*Math.sin(a*.18);
  elbow.rotation.z=.9+.24*Math.sin(a*.22);
  wrist.rotation.y=a*.12;
 }
 return {...B,fixedAssemblies,update,info};
}
