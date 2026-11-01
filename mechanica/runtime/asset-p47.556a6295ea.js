import * as T from '#three';
import {makeBuilder} from '#geometry';
import {offsets} from '#vehicle-kit';
import {instantiateAsset} from '#glb';
const PI=Math.PI;
// 几何由blender/p47.py建模导出为models/p47.glb，本模块按部件与子组名称驱动运动。
// 1个模型单位=1m（=1000mm）；机长11.00m、翼展12.42m、桨径3.708m，机头在-x、翼展沿±z。
export const MM=1000,SPAN=12.42,LENGTH=11.00,PROP_R=1.854;
const PARTS=[
 ['fuselage','机身蒙皮','FUSELAGE','连续截面形成机身，座舱开口内不保留遮挡座椅的实心顶盖。',[0,1.5,-1.8]],
 ['frame','机身框架与隔框','AIRFRAME','座舱开口前后布置隔框，纵向构件连接前后各段。',[0,-1,-1.4]],
 ['cockpit','飞行员座舱','COCKPIT','座椅、仪表板、操纵杆与脚蹬布置在座舱开口下方。',[0,1.8,1.4]],
 ['canopy','脊背式座舱盖','CANOPY','风挡、透明座舱和边框沿机身开口相接。',[0,2.5,0]],
 ['engine','双排星形发动机','PISTON ENGINE','发动机通过前部传动轴带动螺旋桨，外形与部件布局用于结构展示。',[-1.5,1.4,1.3]],
 ['cowl','发动机整流罩','ENGINE COWLING','圆滑整流罩包围动力舱，剖切后可见发动机。',[-2,1.7,-1]],
 ['prop','四叶螺旋桨与桨毂','PROPELLER','螺旋桨与发动机输出轴共轴旋转。',[-2.5,0,0]],
 ['wingL','左主翼','WING ASSEMBLY','圆滑前缘、厚翼面与向上微抬的圆翼尖连接翼梁和翼肋。',[.4,.4,-2.7]],
 ['wingR','右主翼','WING ASSEMBLY','圆滑前缘、厚翼面与向上微抬的圆翼尖连接翼梁和翼肋。',[.4,.4,2.7]],
 ['flaps','副翼与襟翼','CONTROL SURFACES','活动翼面的前缘沿实际连接轴小角度偏转。',[0,1.4,2]],
 ['tailplane','水平尾翼','HORIZONTAL TAIL','有厚度的左右尾翼接入尾部，圆滑翼尖与机身相连。',[2.1,.6,0]],
 ['fin','垂直尾翼与方向舵','VERTICAL TAIL','圆滑垂直尾翼接入机身，方向舵沿后缘固定轴转动。',[2.4,1.5,0]],
 ['landing','起落架与机轮','LANDING GEAR','主起落架支柱接入主翼，尾轮支柱接入机身尾段。',[0,-1.5,1.4]],
 ['fuel','翼内油箱与供油管路','FUEL SYSTEM','油箱沿主翼截面收在上下蒙皮内，管路接向动力舱。',[0,-1.2,-2]],
 ['cooling','机腹增压与散热通道','COOLING SYSTEM','机腹曲面通道包围散热表面，前方保留可见进气口。',[1,-1.2,0]],
 ['details','接缝、舱口与识别涂装','AIRFRAME DETAILS','接缝随蒙皮曲面排列，外部涂装与表面分区表现装配关系。',[0,1.6,-2.2]]
];
// 翼面蒙皮在Blender里是每块面板三个网格（上表面、下表面、封边），这里还原成代码造型的命名与顺序。
const PANEL_ORDER=['main','te-in','te-out','ctl','tail','tank'],ROLE={upper:0,lower:1,rim:2};
function restoreSkins(root){
 root.traverse(g=>{
  if(!g.isGroup)return;
  const pattern=/^fighter-wing-skin\.([^.]*)\.(upper|lower|rim)(?:\.(\d+))?$/;
  const skins=g.children.filter(c=>c.isMesh&&pattern.test(c.name));
  if(!skins.length)return;
  const key=c=>{const m=pattern.exec(c.name);return [PANEL_ORDER.indexOf(m[1]),Number(m[3]||0),ROLE[m[2]]];};
  skins.sort((a,b)=>{const x=key(a),y=key(b);return x[0]-y[0]||x[1]-y[1]||x[2]-y[2];});
  for(const c of skins)if(/\.(upper|lower)(?:\.\d+)?$/.test(c.name))c.name='fighter-wing-skin';
  g.children=skins.concat(g.children.filter(c=>!skins.includes(c)));
 });
}
// GLB按三角面遍历重排顶点。恢复控制面的展向行、弦向列，三角形和属性值保持不变。
function restoreControlGrid(g){
 const sign=Math.sign(g.position.z),v=new T.Vector3();
 for(const mesh of g.children.filter(o=>o.name==='fighter-wing-skin')){
  const geo=mesh.geometry,p=geo.attributes.position;
  const points=Array.from({length:p.count},(_,i)=>{
   v.fromBufferAttribute(p,i).applyQuaternion(g.quaternion);
   return {i,span:sign*v.z,column:v.x};
  }).sort((a,b)=>a.span-b.span);
  // 同一展向行的单精度误差按相邻差聚类，避免固定舍入网格拆开一行。
  const rows=[];
  for(const point of points){const row=rows.at(-1);if(row&&Math.abs(point.span-row[0].span)<1e-5)row.push(point);else rows.push([point]);}
  const order=rows.flatMap(row=>row.sort((a,b)=>a.column-b.column).map(x=>x.i));
  const inverse=new Uint32Array(order.length);order.forEach((old,i)=>inverse[old]=i);
  for(const [name,attr] of Object.entries(geo.attributes)){
   const array=new attr.array.constructor(attr.array.length);
   order.forEach((old,i)=>{for(let j=0;j<attr.itemSize;j++)array[i*attr.itemSize+j]=attr.array[old*attr.itemSize+j];});
   geo.setAttribute(name,new T.BufferAttribute(array,attr.itemSize,attr.normalized));
  }
  geo.setIndex(Array.from(geo.index.array,old=>inverse[old]));
 }
}
export function build(materials,info){
 const B=makeBuilder(materials),named=instantiateAsset(B,'p47',PARTS,materials),part=id=>B.parts.find(p=>p.id===id).group;
 const get=name=>{const o=named.get(name);if(!o)throw new Error('P-47D模型缺少子组 '+name);return o;};
 restoreSkins(B.root);
 // 本模型的分缝用哑光暗漆，内部结构用低反光底漆，不沿用亮金属反射。
 B.root.traverse(o=>{
  if(!o.isMesh)return;
  if(o.name.startsWith('fighter-panel-seam')||o.userData.part==='details'){
   o.material.color.setHex(0x303929);Object.assign(o.material,{metalness:0,roughness:.95,envMapIntensity:.12});
  }else if(o.name.startsWith('fighter-wing-spar')||o.name.startsWith('fighter-wing-rib')){
   o.material.color.setHex(0x697446);Object.assign(o.material,{metalness:.06,roughness:.82,envMapIntensity:.35});
  }else if(o.userData.part==='frame'){
   o.material.color.setHex(0x3c4930);Object.assign(o.material,{metalness:.04,roughness:.88,envMapIntensity:.25});
  }else if(o.userData.part==='fuel'&&o.userData.materialKey==='bronze'){
   o.material.color.setHex(0x474c30);Object.assign(o.material,{metalness:.03,roughness:.92,envMapIntensity:.2});
  }
 });
 // 座舱玻璃与代码造型一致：低金属度、低粗糙度、半透明。
 const pane=B.root.getObjectByName('fighter-canopy-pane');
 if(pane){const m=pane.material;Object.assign(m,{transparent:true,opacity:.24,depthWrite:false,metalness:.04,roughness:.05});m.color.setHex(0xa7c3cb);if('clearcoat'in m){m.clearcoat=1;m.clearcoatRoughness=.04;}m.needsUpdate=true;}
 // 翼内油箱：代码造型用userData.tank标记，测试据此检查油箱是否收在上下蒙皮之间。
 B.root.traverse(o=>{if(o.isMesh&&o.userData.part==='fuel'&&o.userData.materialKey==='bronze')o.userData.tank=true;});
 // Blender里同名对象会自动加.001后缀，这里把子组名还原成代码造型的名字。
 B.root.traverse(o=>{
  if(o.isGroup&&/^fighter-control-hinge(\.\d+)?$/.test(o.name))o.name='fighter-control-hinge';
  if(o.isGroup&&/^fighter-wheel(\.\d+)?$/.test(o.name))o.name='fighter-wheel';
 });
 const prop=part('prop'),crank=get('fighter-crank'),rudder=get('fighter-rudder-hinge');
 const hinges=[];B.root.traverse(o=>{if(o.name==='fighter-control-hinge')hinges.push(o);});
 hinges.forEach(restoreControlGrid);
 const wheels=[];B.root.traverse(o=>{if(o.name==='fighter-wheel')wheels.push(o);});
 // 铰链组在Blender里把铰链轴对齐到自身局部X轴，静止姿态的四元数先存下来，运动时在该局部轴上叠加。
 const rests=hinges.map(g=>g.quaternion.clone());
 function update(a,e,mode){
  offsets(B,e);
  prop.rotation.x=a*2.4;crank.rotation.x=a*2.4;
  hinges.forEach((g,i)=>{
   const sign=g.position.z>=0?1:-1;
   g.quaternion.copy(rests[i]).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),.10*Math.sin(a*.4)*sign));
  });
  rudder.rotation.y=.08*Math.sin(a*.33);
  wheels.forEach(g=>g.rotation.z=-a*.35);
 }
 return {...B,update,info};
}
export const INFO={
 basis:'外形采用 Pima 航空与航天博物馆公布的 P-47D 总体尺寸，翼展约 12.42 m、机长约 11.00 m，并参照 Millville 陆军机场博物馆的脊背式照片。曲面、发动机内部、座舱与支承结构属于网页造型补全，不是制造图纸。',
 source:'https://pimaair.org/designation/p-47d/',
 sourceName:'Pima 航空与航天博物馆 P-47D'
};
