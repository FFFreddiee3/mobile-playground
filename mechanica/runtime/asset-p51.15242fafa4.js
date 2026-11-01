import * as T from '#three';
import {makeBuilder} from '#geometry';
import {instantiateAsset} from '#glb';
import {offsets} from '#vehicle-kit';
// 外壳及翼面唯一建模入口为 blender/p51.py，内部可复用结构经 Blender 导出。
export const INFO={source:'https://commons.wikimedia.org/wiki/File:North_American_P-51D_Mustang_3-view_line_drawing.png',sourceName:'美军 AN 01-60-3 第30页',basis:'外形依据美军 AN 01-60-3 第30页的 P-51D 正投影尺寸图，机长32 ft 3-5/16 in、翼展37 ft 5/16 in。保留原网页坐标与运动。座舱、发动机内部、梁肋、管路与连接细节属于网页造型补全，不是制造图纸。模型用于民用外观展示。'};
const PARTS=[["fuselage", "机身蒙皮", "FUSELAGE", "连续截面形成机身，座舱开口内不保留遮挡座椅的实心顶盖。", [0, 1.5, -1.8]], ["frame", "机身框架与隔框", "AIRFRAME", "座舱开口前后布置隔框，纵向构件连接前后各段。", [0, -1, -1.4]], ["cockpit", "飞行员座舱", "COCKPIT", "座椅、仪表板、操纵杆与脚蹬布置在座舱开口下方。", [0, 1.8, 1.4]], ["canopy", "水滴形座舱盖", "CANOPY", "风挡、透明座舱和边框沿机身开口相接。", [0, 2.5, 0]], ["engine", "液冷V形发动机", "PISTON ENGINE", "发动机通过前部传动轴带动螺旋桨，外形与部件布局用于结构展示。", [-1.5, 1.4, 1.3]], ["cowl", "发动机整流罩", "ENGINE COWLING", "圆滑整流罩包围动力舱，剖切后可见发动机。", [-2, 1.7, -1]], ["prop", "四叶螺旋桨与桨毂", "PROPELLER", "螺旋桨与发动机输出轴共轴旋转。", [-2.5, 0, 0]], ["wingL", "左主翼", "WING ASSEMBLY", "圆滑前缘、厚翼面与向上微抬的圆翼尖连接翼梁和翼肋。", [0.4, 0.4, -2.7]], ["wingR", "右主翼", "WING ASSEMBLY", "圆滑前缘、厚翼面与向上微抬的圆翼尖连接翼梁和翼肋。", [0.4, 0.4, 2.7]], ["flaps", "副翼与襟翼", "CONTROL SURFACES", "活动翼面的前缘沿实际连接轴小角度偏转。", [0, 1.4, 2]], ["tailplane", "水平尾翼", "HORIZONTAL TAIL", "有厚度的左右尾翼接入尾部，圆滑翼尖与机身相连。", [2.1, 0.6, 0]], ["fin", "垂直尾翼与方向舵", "VERTICAL TAIL", "圆滑垂直尾翼接入机身，方向舵沿后缘固定轴转动。", [2.4, 1.5, 0]], ["landing", "起落架与机轮", "LANDING GEAR", "主起落架支柱接入主翼，尾轮支柱接入机身尾段。", [0, -1.5, 1.4]], ["fuel", "翼内油箱与供油管路", "FUEL SYSTEM", "油箱沿主翼截面收在上下蒙皮内，管路接向动力舱。", [0, -1.2, -2]], ["cooling", "机腹散热器", "COOLING SYSTEM", "机腹曲面通道包围散热表面，前方保留可见进气口。", [1, -1.2, 0]], ["details", "接缝、舱口与识别涂装", "AIRFRAME DETAILS", "接缝随蒙皮曲面排列，外部涂装与表面分区表现装配关系。", [0, 1.6, -2.2]]];
export function build(materials,info){
 const B=makeBuilder(materials),named=instantiateAsset(B,'p51',PARTS,materials),part=id=>B.parts.find(p=>p.id===id).group;
 const nodes=[];B.root.traverse(o=>nodes.push(o));
 for(const o of nodes){const m=o.name.match(/^(\d+)~(.*)$/);if(m){o.userData.sourceOrder=+m[1];o.name=m[2];}}
 for(const o of nodes)o.children.sort((a,b)=>(a.userData.sourceOrder??1e6)-(b.userData.sourceOrder??1e6));
 // GLB四元数是单精度，固定垂尾偏置恢复为精确角度，避免把恒定姿态误判为运动。
 const finFrame=B.root.getObjectByName('fin.offset');finFrame.rotation.set(0,-Math.PI/180,0);
 const prop=part('prop'),crank=B.root.getObjectByName('fighter-crank'),rudder=B.root.getObjectByName('fighter-rudder-hinge'),wheels=nodes.filter(o=>o.isGroup&&o.name==='fighter-wheel');
 // 重建翼面的上下表面与封边恢复语义名称和顺序，不改导出几何。
 for(const g of nodes.filter(o=>o.isGroup)){
  const wing=g.children.filter(o=>/^(wing\.\d|moving|tail\.-?1|tank\.-?1)\.[abc](?:\.\d+)?$/.test(o.name));
  wing.sort((a,b)=>a.name.localeCompare(b.name));
  if(wing.length){g.children=[...wing,...g.children.filter(o=>!wing.includes(o))];for(const o of wing)o.name=/\.c(?:\.\d+)?$/.test(o.name)?'fighter-wing-edge':'fighter-wing-skin';}
 }
 const controls=nodes.filter(o=>o.isGroup&&o.name.startsWith('control.')).map(g=>{const sign=+g.name.split('.')[1],j=+g.name.split('.')[2],s=[[.23,-2.45,.25,1.16],[.70,-2.28,.20,1.20],[2.20,-2.12,-.115,1.33],[4.70,-1.945,-.515,1.55],[5.15,-1.914,-.62,1.59],[5.41,-1.86,-.68,1.62],[5.52,-1.82,-.78,1.63],[5.60,-1.72,-1.0,1.64],[5.64,-1.58,-1.51,1.64]].map(v=>v.map((x,k)=>k===3?x-.047+.003*v[0]:x)),z0=Math.max(.8,s[j][0])+.008,z1=Math.min(5.41,s[j+1][0])-.008;
  const pt=z=>{const t=(z-s[j][0])/(s[j+1][0]-s[j][0]),q=s[j].map((v,k)=>v+(s[j+1][k]-v)*t),u=.77;return new T.Vector3(q[1]+(q[2]-q[1])*u,q[3]+.018*(q[2]-q[1])*Math.sin(Math.PI*u),sign*z);};
  const a=pt(z0),b=pt(z1),axis=b.sub(a).normalize();g.position.copy(a);g.name='fighter-control-hinge';g.userData.hingeAxis=axis.toArray();return {g,axis,sign};});
 const pane=B.root.getObjectByName('fighter-canopy-pane');Object.assign(pane.material,{transparent:true,opacity:.32,side:T.DoubleSide,depthWrite:false,metalness:.04,roughness:.05});pane.material.color.setHex(0xa7c3cb);
 // 翼根橙块是油箱。保留油箱语义与实际几何，表面改为柔性箱体的暗绿色。
 part('fuel').traverse(o=>{if(o.isMesh&&o.userData.materialKey==='bronze'){o.userData.tank=true;o.material=o.material.clone();o.material.color.setHex(0x555d42);o.material.metalness=.08;o.material.roughness=.82;}});
 // 保留原本由 ExtrudeGeometry 生成的两只缸盖的构造类型，几何仍来自 GLB。
 const banks=part('engine').children.filter(o=>o.isMesh&&o.userData.materialKey==='dark');for(const o of banks)o.geometry.type='ExtrudeGeometry';
 function update(a,e){offsets(B,e);prop.rotation.x=crank.rotation.x=a*2.4;controls.forEach(({g,axis,sign})=>g.quaternion.setFromAxisAngle(axis,.10*Math.sin(a*.4)*sign));rudder.rotation.y=.08*Math.sin(a*.33);wheels.forEach(g=>g.rotation.z=-a*.35);}
 return {...B,update,info,refPose(){part("prop").rotation.x=Math.PI/4;}};
}
