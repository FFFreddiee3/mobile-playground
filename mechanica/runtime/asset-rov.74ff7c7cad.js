import {makeBuilder} from '#geometry';
import {instantiateAsset} from '#glb';
import {offsets} from '#vehicle-kit';
export {ROV} from '#heavy-machines';
const PARTS=[
 [
  "frame",
  "开式承力框架",
  "FRAME",
  "铝方管纵梁、立柱和上下横梁组成开式框架，上层横梁托住浮力块，下层横梁托住设备舱和液压站。",
  [
   0,
   -0.8,
   -1
  ]
 ],
 [
  "buoyancy",
  "顶部浮力块",
  "BUOYANCY",
  "四块浮力材料压在上层横梁上，围出中央开口给两台垂直推进器通流，外形决定整机长、宽、高。",
  [
   0,
   1.2,
   0
  ]
 ],
 [
  "skid",
  "底部工具橇",
  "TOOL SKID",
  "两根滑橇经立柱挂在下层纵梁下，三道横梁承托样品架和探测头。",
  [
   0,
   -1.1,
   0
  ]
 ],
 [
  "pressure",
  "钛合金耐压舱",
  "PRESSURE HOUSINGS",
  "两只圆筒耐压舱带半球端盖，用抱箍坐在下层横梁上。",
  [
   -1.3,
   0.2,
   -1
  ]
 ],
 [
  "hydraulics",
  "液压动力站与软管",
  "HYDRAULIC PACK",
  "电机、泵、补偿器和阀块组成液压站，坐在下层横梁上，软管通到两只机械臂底座。",
  [
   1.3,
   0.5,
   -1
  ]
 ],
 [
  "thrusters",
  "六台导管推进器",
  "DUCTED THRUSTERS",
  "四台水平推进器斜置在框架四角，两台垂直推进器挂在中部，均由支架连到上层横梁。",
  [
   0,
   0.6,
   1.4
  ]
 ],
 [
  "cameras",
  "前向相机与云台",
  "CAMERA PAN",
  "云台座挂在前上横梁下，相机和叉架绕竖轴左右摆动。",
  [
   1.6,
   1.2,
   0
  ]
 ],
 [
  "lights",
  "工作照明",
  "WORK LIGHTS",
  "两盏灯挂在前上横梁，两盏灯装在前立柱，均朝前照明。",
  [
   1.5,
   1.5,
   1
  ]
 ],
 [
  "navigation",
  "避碰声呐、测速与测高",
  "NAVIGATION",
  "前方声呐装在浮力块顶面，测速探头和测高计挂在下层横梁下方。",
  [
   -1.4,
   1.1,
   1
  ]
 ],
 [
  "arm0",
  "左采样机械臂",
  "MANIPULATOR",
  "底座、肩部转台、上臂、前臂、腕部和夹爪依次铰接，臂展参照7功能钛合金机械臂。",
  [
   1.6,
   0.2,
   -1.5
  ]
 ],
 [
  "arm1",
  "右采样机械臂",
  "MANIPULATOR",
  "底座、肩部转台、上臂、前臂、腕部和夹爪依次铰接，臂展参照7功能钛合金机械臂。",
  [
   1.6,
   0.2,
   1.5
  ]
 ],
 [
  "samples",
  "样品转盘与托板",
  "SAMPLE TRAY",
  "托板跨在滑橇两道横梁上，中心立轴承托转盘，十二只采样管绕立轴转动。",
  [
   1.2,
   -0.5,
   1.2
  ]
 ],
 [
  "tether",
  "脐带终端与弯曲限制器",
  "TETHER",
  "脐带终端坐在后部浮力块顶面，弯曲限制器把脐带向上引出。",
  [
   0,
   1.7,
   -0.8
  ]
 ]
];
export const INFO={source:'https://www.mbari.org/technology/rov-doc-ricketts/',sourceName:'MBARI Doc Ricketts 官方尺寸与照片，D级外形参考',basis:'外包络按MBARI公布的12×6×7英尺及官方照片推断，圆角、浮力材料和设备布局为网页造型补全。六推进器、两个同型机械臂及其运动保留通用网页机构，不是Doc Ricketts七推进器配置的完整复刻，内部结构与细节不是制造图纸。'};
export function build(materials,info){
 const B=makeBuilder(materials),named=instantiateAsset(B,'rov',PARTS,materials);
 const get=n=>{const o=named.get(n);if(!o)throw new Error('ROV模型缺少子组 '+n);return o;};
 const rotors=Array.from({length:6},(_,i)=>get('rotor.'+i));
 for(let i=0;i<6;i++){const g=get('thruster.'+i);g.name='rov-thruster';if(i<4)g.rotation.set(0,[3,-3,1,-1][i]*Math.PI/4,0);else g.rotation.set(0,0,Math.PI/2);rotors[i].name='rov-propeller';}
 const arms=[0,1].map(i=>{const a={shoulder:get('arm.'+i+'.shoulder'),upper:get('arm.'+i+'.upper'),elbow:get('arm.'+i+'.elbow'),fore:get('arm.'+i+'.fore'),wrist:get('arm.'+i+'.wrist'),jaws:[-1,1].map((s,j)=>({j:get('arm.'+i+'.jaw.'+j),s})),side:i?1:-1};a.shoulder.name='rov-shoulder';a.elbow.name='rov-elbow';a.wrist.name='rov-wrist';a.shoulder.position.set(1.75,.62,a.side*.55);a.elbow.position.set(.78,0,0);a.wrist.position.set(.72,0,0);a.jaws.forEach(({j})=>{j.name='rov-jaw';j.position.set(.18,0,0);});return a;});
 const carousel=get('sample.carousel'),cameraGimbal=get('camera.pan');carousel.name='rov-carousel';cameraGimbal.name='rov-camera-pan';
 const float=B.parts.find(p=>p.id==='buoyancy').group;
 float.traverse(o=>{if(o.isMesh&&o.userData.materialKey==='orangepaint'){o.material.color.setHex(0xd9b630);o.material.metalness=0;o.material.roughness=.9;}});
 function update(a,e){offsets(B,e);rotors.forEach((g,i)=>g.rotation.x=a*(i%2?-2.0:2.0));cameraGimbal.rotation.y=.17*Math.sin(a*.35);
  for(const arm of arms){arm.shoulder.rotation.y=arm.side*(.06+.06*Math.sin(a*.27));arm.upper.rotation.z=-.22+.12*Math.sin(a*.4+arm.side);arm.fore.rotation.z=.45+.22*Math.sin(a*.4+.7);arm.wrist.rotation.x=.2*Math.sin(a*.3);arm.jaws.forEach(({j,s})=>j.rotation.z=s*(.15+.13*Math.sin(a*.55)));}carousel.rotation.y=a*.13;}
 return {...B,update,info,inspection:{rotors,arms,carousel,cameraGimbal}};
}
