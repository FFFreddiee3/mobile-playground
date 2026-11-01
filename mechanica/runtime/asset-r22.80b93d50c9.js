import * as T from '#three';
import {makeBuilder} from '#geometry';
import {instantiateAsset} from '#glb';
const PARTS=[["cabin","双座座舱与机身","CABIN","曲面机身为前风挡和侧门玻璃留出真实开口，下方地板与后部动力支架相连。",[-1.5,0.5,-1.7]],["canopy","前风挡与侧门玻璃","WINDSCREEN","左右前风挡与侧门玻璃嵌入机身开口，边框沿同一曲面贴合。",[-2,1.8,0]],["seats","双座座椅与仪表台","FLIGHT CONTROLS","座椅、脚蹬与操纵杆围绕仪表板布置。",[-1.1,1.6,1.2]],["tail","尾梁与安定面","TAIL BOOM","收缩尾梁连接垂直和水平安定面，尾旋翼位于侧面。",[2,1,-1]],["tailshaft","尾传动轴与支承","TAIL DRIVE SHAFT","尾传动轴沿尾部中心通道连接后部齿箱。",[1.8,-0.9,0.9]],["power","发动机、皮带与减速传动","POWERPLANT","发动机、外露散热片和皮带轮围绕主传动支架分层布置。",[0,-1.2,-1.6]],["mast","主轴、旋翼头与变距拉杆","ROTOR HEAD","固定导向套筒从减速器顶面穿出主轴罩，转动主轴在套筒上端伸出并穿过控制环接到旋翼头，变距拉杆随旋翼头同步转动。",[0,1.8,1.2]],["blades","双叶主旋翼","MAIN ROTOR","两片有厚度的桨叶围绕同一根主轴旋转，前后缘与桨尖均封闭。",[0,2.7,0]],["swash","控制环与操纵连杆","SWASHPLATE","固定环坐在主轴罩顶上方的导向套筒顶端，转动环随旋翼转动，经短臂连接变距拉杆。",[1.5,1.2,1.4]],["tailrotor","双叶尾旋翼与尾部齿箱","TAIL ROTOR","尾旋翼在横向输出轴上转动，齿箱与尾传动轴端部接合。",[2,0.5,1.9]],["skids","滑橇式起落架","SKID LANDING GEAR","左右滑橇通过横向支柱连接机身底部。",[0,-1.2,0]],["plumbing","油箱、排气与冷却管路","AUXILIARY SYSTEMS","油箱和排气分置动力舱两侧，避开主轴和尾部传动通道。",[0,0.8,-2]]];
export const INFO={basis:'尺寸与三视图轮廓依据Robinson R22飞行员操作手册第1节第1-3页外部尺寸图（总长8.76米、旋翼半径3.84米、机高2.72米），外形细节参照官方配置器公开的2026-01-16三维几何。内部结构和运动连接为网页造型补全，不是制造图纸。',source:'https://www.robinsonheli.com/publications',sourceName:'Robinson R22飞行员操作手册与官方配置器'};
// 与r22.py相同的手册尺寸缩放：以主轴x=-0.199、地面y=0.13、中线z=0为基准的三向线性缩放，表达式与运算顺序一致以得到相同的双精度值。
// 这里只换算主轴之后的点（x≥-0.199），r22.py中主轴之前另用的纵向系数FXF不涉及。
const RY=.13+2.72-.067,FX=(4.721-.535+.199)/(4.435+.199),FY=(RY-.13)/(2.88-.13),FZ=.92,AX=x=>-.199+FX*(x+.199),A=(x,y,z)=>[-.199+FX*(x+.199),.13+FY*(y-.13),FZ*z];

// Blender导出会按法线与UV重排顶点。还原纵向截面顺序并保留同一组真实三角形。
function orderBlade(mesh){
 const g=mesh.geometry,p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv,points=[],ids=new Map(),old=[];
 for(let i=0;i<p.count;i++){
  const key=[p.getX(i),p.getY(i),p.getZ(i)].join(',');let j=ids.get(key);
  if(j===undefined){j=points.length;ids.set(key,j);points.push({p:[p.getX(i),p.getY(i),p.getZ(i)],n:[0,0,0],uv:uv?[uv.getX(i),uv.getY(i)]:[0,0]});}
  old.push(j);if(n){points[j].n[0]+=n.getX(i);points[j].n[1]+=n.getY(i);points[j].n[2]+=n.getZ(i);}
 }
 const order=points.map((q,i)=>i).sort((a,b)=>points[a].p[0]-points[b].p[0]||Math.atan2(points[a].p[1],points[a].p[2])-Math.atan2(points[b].p[1],points[b].p[2]));
 const remap=new Map(order.map((i,j)=>[i,j]));const pos=[],norm=[],tex=[];
 for(const i of order){const q=points[i],length=Math.hypot(...q.n);pos.push(...q.p);norm.push(...q.n.map(v=>v/length));tex.push(...q.uv);}
 const geo=g.clone();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('normal',new T.Float32BufferAttribute(norm,3));geo.setAttribute('uv',new T.Float32BufferAttribute(tex,2));
 const idx=g.index?Array.from(g.index.array):Array.from({length:p.count},(_,i)=>i);geo.setIndex(idx.map(i=>remap.get(old[i])));geo.computeBoundingSphere();mesh.geometry=geo;
}

export function build(materials,info){
 const B=makeBuilder(materials),named=instantiateAsset(B,'r22',PARTS,materials);
 const get=n=>{const o=named.get(n);if(!o)throw new Error('R22缺少子组 '+n);return o;};
 const blades=B.parts.find(p=>p.id==='blades').group,hub=get('main-rotor-hub'),ring=get('helicopter-rotating-ring'),tailSpin=get('helicopter-tail-rotor');
 get('blade-main.0').rotation.set(0,Math.PI,0);
 for(const [name,turn] of [['blade-tail.0',Math.PI],['blade-tail.1',0]])get(name).rotation.set(0,0,turn+152*Math.PI/180);
 for(const label of ['blade-main.0','blade-main.1','blade-tail.0','blade-tail.1'])get(label).children.filter(o=>o.isMesh).forEach(orderBlade);
 // 名称是既有运动与几何检查的接口，GLB节点后缀只用于定位。
 for(const [n,o]of named){if(n.startsWith('blade-main.'))o.name='helicopter-main-blade-assembly';if(n.startsWith('blade-tail.'))o.name='helicopter-tail-blade-assembly';if(n.startsWith('shaft-bearing.'))o.name='helicopter-shaft-bearing';}
 // 尾传动轴与三处支承按r22.py的双精度端点重设，GLB单精度坐标会使支承中心偏离轴线约1e-7；支承环沿自身z挤出，孔轴对准尾轴。
 // 尾部齿箱（tailrotor部件组）位置同样按双精度重设，尾轴终点与齿箱位置一致。
 const gear=B.parts.find(p=>p.id==='tailrotor');gear.group.position.set(...A(4.435,2.09,.17));gear.base.copy(gear.group.position);
 const shaftA=new T.Vector3(...A(.15,1.6,0)),shaftB=new T.Vector3(...A(4.435,2.09,0)),shaftAxis=shaftB.clone().sub(shaftA).normalize(),Y=new T.Vector3(0,1,0);
 const rod=get('helicopter-tail-shaft').children.filter(o=>o.isMesh);if(rod.length!==1)throw new Error('R22尾传动轴应为单一圆柱');rod[0].position.copy(shaftA).add(shaftB).multiplyScalar(.5);rod[0].quaternion.setFromUnitVectors(Y,shaftAxis);
 [AX(.6),AX(1.7),AX(2.8)].forEach((x,i)=>{const s=get('shaft-bearing.'+i);s.position.copy(shaftA).lerp(shaftB,(x-shaftA.x)/(shaftB.x-shaftA.x));s.children.filter(o=>o.isMesh).forEach(o=>o.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),shaftAxis));});
 for(const p of B.parts)p.group.traverse(o=>{if(o.isMesh&&o.userData.materialKey==='optics'){o.material.transparent=true;o.material.opacity=.62;o.material.depthWrite=false;o.material.metalness=.16;o.material.roughness=.16;}});
 function update(a,e){for(const p of B.parts)p.group.position.copy(p.base).addScaledVector(p.offset,e);blades.rotation.y=hub.rotation.y=ring.rotation.y=a*1.8;tailSpin.rotation.z=-a*6.2;}
 return {...B,update,info,inspection:{tailShaft:{start:shaftA.toArray(),end:shaftB.toArray()}}};
}
