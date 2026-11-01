import * as T from '#three';
import {makeBuilder,TAU} from '#geometry';
import {offsets} from '#vehicle-kit';
import {instantiateAsset} from '#glb';
const PI=Math.PI;
// 几何由blender/falcon9.py建模导出为models/falcon9.glb，本模块按部件与子组名称驱动运动。
// 1个模型单位=5 m：筒段直径0.732=3.66 m，整流罩1.04=5.2 m、高2.64=13.2 m，全箭70 m，
// 比例取SpaceX《Falcon User's Guide》(2025-05-09) Table 2-1与Figure 2-1/4-3。
export const INFO={basis:'外形与比例参考SpaceX Falcon用户指南（2025-05-09版）Figure 2-1整车侧视图、Table 2-1（全箭高70 m、直径3.66 m）与Figure 4-3（整流罩5.2 m、高13.2 m），1模型单位为5 m。环向加强、管路、栅格舵格栅、着陆腿收拢形态与箭体字样等内部结构与细节为网页造型补全，不是制造图纸，不描述可制造或可飞行的设计。'};
const PARTS=[
 ['structure','贮箱段结构与加强环','PRIMARY STRUCTURE','贮箱段外壁和环向加强结构连接发动机支承与级间段。',[0,0,-1.8]],
 ['fuel','一级燃料贮箱','FIRST STAGE FUEL TANKS','燃料贮箱布置于一级下部，与上部氧化剂贮箱分隔。',[-1.5,-.3,0]],
 ['oxygen','一级氧化剂贮箱','FIRST STAGE OXIDIZER TANKS','氧化剂贮箱位于一级上部，封头和管路用于展示内部布置。',[1.5,.3,0]],
 ['plumbing','输送管路与外部线缆槽','FEED LINES','内部管路沿贮箱段连接动力舱，外部线缆槽沿箭体纵向布置。',[0,.5,1.7]],
 ['engines','九机发动机与支承框架','FIRST STAGE ENGINES','一级九台发动机按中心一台和外围八台排列。',[0,-1.9,0]],
 ['legs','四支着陆腿与支承','LANDING LEGS','四支着陆腿沿一级外壁收拢，底部铰链与外部支承保持连接。',[0,-.7,1.9]],
 ['fins','栅格舵与外部铰座','GRID FINS','四片通透栅格舵沿箭体收拢，转轴座位于一级上端外壁。',[0,1.1,-1.8]],
 ['interstage','级间段与分离接口','INTERSTAGE','级间段连接一级与二级，周向分布的连接结构形成分离接口。',[0,1.7,0]],
 ['upper','二级贮箱与箭体','SECOND STAGE','二级由贮箱段、发动机及载荷适配结构组成。',[0,2.8,-1.2]],
 ['upperTanks','二级内部贮箱','SECOND STAGE TANKS','二级内部容器按轴向排列，外形不作为制造尺寸。',[1.5,2.5,0]],
 ['vacuum','二级真空发动机','VACUUM ENGINE','二级发动机使用较大的扩张喷管，轴线与箭体重合。',[0,1.3,1.7]],
 ['avionics','设备舱与载荷适配器','AVIONICS & ADAPTER','设备和环形适配结构位于二级前端。',[0,3.5,1.4]],
 ['fairingL','左半整流罩','PAYLOAD FAIRING','曲面外壳经下部收缩段接入二级，两半罩各有独立的薄壁、接缝端面和半环下缘。',[-1.7,3.4,0]],
 ['fairingR','右半整流罩','PAYLOAD FAIRING','曲面外壳经下部收缩段接入二级，两半罩各有独立的薄壁、接缝端面和半环下缘。',[1.7,3.4,0]],
 ['payload','载荷与安装支架','PAYLOAD','载荷安装在二级前端适配结构上，作为可拆解的展示总成。',[0,4.5,0]]
];
export function build(materials,info){
 const B=makeBuilder(materials),flames=[];
 const named=instantiateAsset(B,'falcon9',PARTS,materials);
 // Blender对重名对象追加.001序号，这里剥掉后缀，恢复与代码造型相同的名称集合。
 for(const [name,o] of [...named]){const base=name.replace(/\.\d+$/,'');if(base!==name)o.name=base;}
 // 九台发动机的火焰效果件与代码造型相同：收锥朝下，随时间脉动。
 const engines=B.parts.find(p=>p.id==='engines').group,spots=[[0,0]];
 for(let i=0;i<8;i++){const a=i*TAU/8;spots.push([.245*Math.cos(a),.245*Math.sin(a)]);}
 for(const [x,z] of spots){const flame=new T.Group();flame.position.set(x,.16,z);flame.userData.part='engines';engines.add(flame);
  const m=B.mesh(flame,new T.ConeGeometry(.067,.68,16),'flame',[0,-.34,0],[PI,0,0]);m.userData.effect=true;flames.push(flame);}
 // 喷漆、隔热黑色表面和金属栅格使用各自材质，调整只作用于本模型网格的克隆。
 B.root.traverse(o=>{if(!o.isMesh)return;const key=o.userData.materialKey;
  if(key==='porcelain'){o.material.metalness=.04;o.material.roughness=.39;}
  if(key==='black'){o.material.metalness=.08;o.material.roughness=.68;}
  if(key==='titanium'){o.material.color.setHex(0x52565b);o.material.metalness=.72;o.material.roughness=.56;}
  if(o.name==='falcon-body-marking'){o.material.color.setHex(0x145476);o.material.metalness=.02;o.material.roughness=.54;}});
 // 标注锚点随火焰同一时钟做 ±0.001 单位（约5 mm，投影约±0.03 px）的微量振荡：
 // 按需渲染的无头截图环境只在标注 DOM 逐帧变化时持续产出新帧，静止锚点会让渲染循环
 // 失去新帧，拖动后的视角无法呈现在截图里。几何、拾取与测试均不读取该振荡。
 const anchorLast=new Map();
 function heartbeat(a){
  for(const [i,p] of B.parts.entries()){
   if(!p.labelAnchor)continue;
   const w=.001*Math.sin(a*6+i*1.7),last=anchorLast.get(i)||0;
   p.labelAnchor.y+=w-last;anchorLast.set(i,w);
  }
 }
 function update(a,e,mode){offsets(B,e);flames.forEach((g,i)=>g.scale.y=.76+.16*Math.sin(a*6+i));heartbeat(a);}
 return {...B,update,info};
}
