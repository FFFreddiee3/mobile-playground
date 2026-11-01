import * as T from '#three';
import {makeBuilder} from '#geometry';
import {offsets} from '#vehicle-kit';
import {instantiateAsset} from '#glb';
// 几何由blender/starship.py建模导出为models/starship.glb，本模块按部件与子组名称驱动运动。
// 部件与展开偏移逐项照搬src/launchcraft.mjs的buildStarship；总高124米、直径9米、助推器72米、星舰52米，1单位=10米。
const PARTS=[
 ['booster','超重型助推器外壁','SUPER HEAVY','不锈钢环带焊接成下级箭体，顶部有前封头，外壁可剖开观察内部。',[-1.6,-.3,-.7]],
 ['booster-tanks','助推器内部贮箱','BOOSTER TANKS','下部大容器与上部容器沿纵轴排列，外壁贴合箭体内壁。',[1.5,0,.5]],
 ['booster-engines','33台猛禽发动机','BOOSTER ENGINES','外圈20台、中圈10台、中心3台，顶端连接推力板。',[0,-1.8,0]],
 ['gridfins','四片栅格舵','GRID FINS','格栅舵板绕径向转轴转动，转轴座固定在助推器上部外壁。',[-1.3,1.0,1.3]],
 ['hotstage','通风级间环','VENTED INTERSTAGE','上下环框与斜撑组成透空级间段，连接助推器顶部与星舰尾部。',[0,.8,-1.5]],
 ['ship','星舰不锈钢船体','SHIP STRUCTURE','上级船体、鼻锥与尾部接口保持共同纵轴。',[1.8,1.2,-.8]],
 ['tiles','迎风面隔热瓦','THERMAL TILES','六边形隔热瓦紧密排布在迎风半侧，鼻部瓦片随轮廓倾斜。',[0,1.5,1.7]],
 ['ship-tanks','星舰内部贮箱','SHIP TANKS','下部与上部容器沿纵轴排列，外壁贴合船体内壁。',[-1.5,1.4,.2]],
 ['ship-engines','三台海平面与三台真空发动机','SHIP ENGINES','中心三台海平面发动机与外圈三台大喷管真空发动机连接尾部推力板。',[0,1.2,-2]],
 ['flaps','前后四片襟翼','CONTROL FLAPS','两对襟翼位于船体两侧，围绕沿船体轮廓的根部铰轴偏转。',[1.8,2,1.2]],
 ['equipment','船内设备与任务舱','EQUIPMENT','前部隔板承载环形设备盒和任务舱环形结构。',[1.4,2.5,-.2]],
 ['raceway','外部线槽与安装接头','RACEWAY','线缆槽、接头和接口支座沿背风侧布置。',[-1.5,.5,-1.4]]
];
export function build(materials,info){
 const B=makeBuilder(materials),named=instantiateAsset(B,'starship',PARTS,materials),part=id=>B.parts.find(p=>p.id===id).group;
 // 不锈钢贮箱保持不透明，以几何剖开显示空腔。防热瓦去除金属反光。
 for(const id of ['booster-tanks','ship-tanks'])part(id).traverse(o=>{
  if(!o.isMesh)return;
  o.material.transparent=false;o.material.opacity=1;o.material.depthWrite=true;
  if(o.userData.materialKey==='steel'){o.material.roughness=.60;o.material.metalness=.72;}
 });
 // 瓦面与瓦缝分为两种哑光暗色，隔热衬层遮住下面钢壳的白色反光。
 part('tiles').traverse(o=>{
  if(!o.isMesh)return;
  o.material.color.setHex(o.name==='windward-tps-backing'?0x080a0c:0x22262a);
  o.material.metalness=0;o.material.roughness=1;o.material.envMapIntensity=0;
 });
 // 导出顺序按名称排列，这里把助推器两条半环带外壁放回部件前两个子节点，与代码造型的子节点顺序一致。
 const booster=part('booster');
 for(const name of ['shell-keep','shell-cut']){const o=booster.children.find(c=>c.name===name);if(o){booster.children.splice(booster.children.indexOf(o),1);booster.children.unshift(o);}}
 // GLB加载后几何类型统一为BufferGeometry，外形主壳的四个网格（两条船体半环带与两片鼻锥）恢复LatheGeometry标记。
 for(const o of part('ship').children)if(o.isMesh&&['hull-shell-keep','hull-shell-cut','nose-keep','nose-cut'].includes(o.name))o.geometry.type='LatheGeometry';
 // 栅格舵铰按fin-mount序号排回a=PI/4+i*PI/2的顺序；襟翼铰连同左右侧别一起收集。
 const fins=part('gridfins').children.filter(c=>c.name?.startsWith('fin-mount-')).sort((a,b)=>parseInt(a.name.slice(10))-parseInt(b.name.slice(10))).map(m=>m.children.find(c=>c.name==='starship-grid-hinge'));
 const hinges=[];
 for(const m of part('flaps').children.filter(c=>c.name?.startsWith('flap-mount-'))){const h=m.children.find(c=>c.name==='starship-flap-hinge');hinges.push({h,side:m.position.x<0?-1:1});}
 if(fins.includes(undefined)||hinges.some(x=>!x.h))throw new Error('星舰模型缺少铰子组');
 function update(a,e){offsets(B,e);for(let i=0;i<fins.length;i++)fins[i].rotation.z=.07*Math.sin(a*.4+i);for(const {h,side}of hinges)h.rotation.y=.14*Math.sin(a*.35)*side;}
 return {...B,update,inspection:{engineCount:33,shipEngineCount:6,boosterTop:6.9,interstageTop:7.2,shipBottom:7.2,noseTop:12.4,diameter:.9,flapHinges:hinges.map(x=>x.h),gridHinges:fins}};
}
