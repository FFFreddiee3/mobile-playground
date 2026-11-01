import * as T from '#three';
import {makeBuilder} from '#geometry';
import {instantiateAsset} from '#glb';
const PI=Math.PI;
// 几何由blender/falconheavy.py建模导出为models/falconheavy.glb，尺寸与src/space.mjs的buildRocket(m,true)相同：
// 1个模型单位=5000 mm，全箭高14.0单位（70 m），三个芯级位于x=-0.854/0/+0.854，y=0为芯级尾段基面。
// 本模块补齐网页端效果网格（27台发动机的火焰），并复刻代码造型的展开偏移与火焰动画。
const PARTS=[
 ['structure','贮箱段结构与加强环','PRIMARY STRUCTURE','贮箱段外壁和环向加强结构连接发动机支承与级间段。',[0,0,-1.8]],
 ['fuel','一级燃料贮箱','FIRST STAGE FUEL TANKS','燃料贮箱布置于一级下部，与上部氧化剂贮箱分隔。',[-1.5,-.3,0]],
 ['oxygen','一级氧化剂贮箱','FIRST STAGE OXIDIZER TANKS','氧化剂贮箱位于一级上部，封头和管路用于展示内部布置。',[1.5,.3,0]],
 ['plumbing','输送管路与外部线缆槽','FEED LINES','内部管路沿贮箱段连接动力舱，外部线缆槽沿箭体纵向布置。',[0,.5,1.7]],
 ['engines','九机发动机与支承框架','FIRST STAGE ENGINES','三个芯级各有九台发动机，按中心一台和外围八台排列。',[0,-1.9,0]],
 ['legs','四支着陆腿与支承','LANDING LEGS','四支着陆腿沿一级外壁收拢，底部铰链与外部支承保持连接。',[0,-.7,1.9]],
 ['fins','栅格舵与外部铰座','GRID FINS','四片通透栅格舵沿箭体收拢，转轴座位于一级上端外壁。',[0,1.1,-1.8]],
 ['interstage','级间段与分离接口','INTERSTAGE','级间段连接一级与二级，周向分布的连接结构形成分离接口。',[0,1.7,0]],
 ['upper','二级贮箱与箭体','SECOND STAGE','二级由贮箱段、发动机及载荷适配结构组成。',[0,2.8,-1.2]],
 ['upperTanks','二级内部贮箱','SECOND STAGE TANKS','二级内部容器按轴向排列，外形不作为制造尺寸。',[1.5,2.5,0]],
 ['vacuum','二级真空发动机','VACUUM ENGINE','二级发动机使用较大的扩张喷管，轴线与箭体重合。',[0,1.3,1.7]],
 ['avionics','设备舱与载荷适配器','AVIONICS & ADAPTER','设备和环形适配结构位于二级前端。',[0,3.5,1.4]],
 ['fairingL','左半整流罩','PAYLOAD FAIRING','曲面外壳经下部收缩段接入二级，两半罩各有独立的薄壁、接缝端面和半环下缘。',[-1.7,3.4,0]],
 ['fairingR','右半整流罩','PAYLOAD FAIRING','曲面外壳经下部收缩段接入二级，两半罩各有独立的薄壁、接缝端面和半环下缘。',[1.7,3.4,0]],
 ['payload','载荷与安装支架','PAYLOAD','载荷安装在二级前端适配结构上，作为可拆解的展示总成。',[0,4.5,0]],
 ['boostercaps','两侧助推器鼻锥与连接件','SIDE BOOSTERS','两侧芯级以外部连接件接入中央芯级，连接件位于箭体之间。',[-2.7,.6,0]]
];
export function build(materials,info){
 const B=makeBuilder(materials),flames=[];
 instantiateAsset(B,'falconheavy',PARTS,materials);
 // Blender场景图内对象名唯一，导出时重复命名带 .001 后缀；这里恢复与代码造型一致的精确名称。
 B.root.traverse(o=>{const m=/^(leg-hinge|falcon-stowed-grid|falcon-fin-mount|falcon-external-booster-joint|falcon-booster-attachment|falcon-body-marking|falcon-fairing-shell|falcon-fairing-seam|falcon-fairing-rim|falcon-engine-skirt|falcon-stowed-leg)(?:\.\d+)?$/.exec(o.name);if(m)o.name=m[1];});
 const engines=B.parts.find(p=>p.id==='engines').group;
 // 27台发动机的火焰：锥体朝下（绕x转180°），与代码造型同位同序（先中心一台再外围八台，按芯级顺序）。
 for(const cx of [-.854,0,.854]){
  const spots=[[cx,0]];
  for(let i=0;i<8;i++){const a=i*PI*2/8;spots.push([cx+.245*Math.cos(a),.245*Math.sin(a)]);}
  for(const [x,z] of spots){
   const g=new T.Group();g.position.set(x,.16,z);engines.add(g);
   const m=B.mesh(g,new T.ConeGeometry(.067,.68,16),'flame',[0,-.34,0],[PI,0,0]);
   m.userData.effect=true;m.castShadow=false;flames.push(g);
  }
 }
 // 喷漆、隔热黑色表面和金属栅格使用各自材质，调整只作用于本模型的材质副本。
 B.root.traverse(o=>{if(!o.isMesh)return;const key=o.userData.materialKey;if(key==='porcelain'){o.material.metalness=.04;o.material.roughness=.39;}if(key==='black'){o.material.metalness=.08;o.material.roughness=.68;}if(key==='titanium'){o.material.color.setHex(0x52565b);o.material.metalness=.72;o.material.roughness=.56;}if(o.name==='falcon-body-marking'){o.material.color.setHex(0x145476);o.material.metalness=.02;o.material.roughness=.54;}});
 function update(a,e){
  for(const p of B.parts){p.group.position.copy(p.base).addScaledVector(p.offset,e);p.group.rotation.set(0,0,0);}
  flames.forEach((g,i)=>g.scale.y=.76+.16*Math.sin(a*6+i));
 }
 return {...B,update,info};
}
