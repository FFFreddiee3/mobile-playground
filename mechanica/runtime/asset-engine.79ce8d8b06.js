import * as T from '#three';
import {makeBuilder} from '#geometry';
import {ENGINE,pistonPose,valveLift} from '#motion';
import {instantiateAsset} from '#glb';
const PI=Math.PI;
// 几何由blender/engine.py建模导出为models/engine.glb，本模块按部件与子组名称驱动运动。
// 1个模型单位=43.548 mm，使54 mm行程等于两倍ENGINE曲柄半径。气缸轴线在XY平面内高出水平25°。
export const MM=54/(2*ENGINE.radius),TILT=25*PI/180;
const AXIS=new T.Vector2(Math.cos(TILT),Math.sin(TILT)),FRAME=-(PI/2-TILT);
const toWorld=(x,s)=>[s*AXIS.x+x*Math.sin(TILT),s*AXIS.y-x*Math.cos(TILT)];
const PARTS=[
 ['case','曲轴箱','CRANKCASE','铝合金曲轴箱容纳曲轴、凸轮轴与正时齿轮，两端轴承座支承曲轴，底座四个安装耳用螺栓固定。输出轴端为可拆的侧盖。',[-.6,-1.6,1.4]],
 ['cylinder','气缸体与缸套','CYLINDER & LINER','铸铁缸套为活塞导向，铝缸体外铸矩形散热片。气缸轴线高出水平25°，下侧两根推杆从散热片的孔中穿过。',[1.4,.6,0]],
 ['head','气缸盖','CYLINDER HEAD','铝合金缸盖内有燃烧室、进排气道与气门导管。顶置气门由摇臂压开，摇臂支在缸盖上的支座上，推杆从缸盖下侧的孔中进入摇臂室。',[3.0,1.4,0]],
 ['cover','摇臂室盖','ROCKER COVER','铝合金摇臂室盖罩住摇臂与气门弹簧，盖面铸有顶置气门字样。开启剖切后移去盖体，便于观察配气机构。',[4.2,2.0,0]],
 ['intake','进气门组','INTAKE VALVE TRAIN','进气冲程中，凸轮顶起挺柱与推杆，摇臂压下进气门，混合气进入气缸。弹簧使气门回位。',[-1.0,2.4,-1.6]],
 ['exhaust','排气门组','EXHAUST VALVE TRAIN','排气冲程中，凸轮经挺柱、推杆与摇臂压下排气门，燃烧后的气体经排气道进入消声器。',[-1.0,2.4,1.6]],
 ['cam','凸轮轴','CAMSHAFT','凸轮轴装在曲轴箱内，由曲轴齿轮以二比一减速驱动，两个凸轮经挺柱与推杆控制顶置气门。凸轮轴每转一圈，曲轴转两圈。',[1.2,-1.4,-.4]],
 ['spark','火花塞与高压线','SPARK PLUG','火花塞从缸盖上侧斜插入燃烧室，电极间的火花点燃压缩后的混合气。高压线把点火线圈的电压送到火花塞帽。',[-.6,2.6,-.8]],
 ['piston','活塞与活塞销','PISTON & WRIST PIN','活塞通过活塞销连接连杆。顶部承受缸内气体的作用，两道气环与一道油环装在环槽中，裙部沿缸套运动。',[...toWorld(0,-.2),2.2]],
 ['rod','连杆','CONNECTING ROD','连杆的小端经衬套连接活塞销，大端经轴瓦连接曲柄销。大端盖与螺栓用于装配，杆身采用凹入截面减轻质量。',[0,-.6,2.8]],
 ['crank','曲轴','CRANKSHAFT','曲柄销偏离主轴中心，带动连杆摆动。两侧曲柄臂和配重随曲轴转动，输出端是直径20 mm带平键的输出轴，另一端装飞轮。',[0,-1.2,.6]],
 ['bearings','主轴承','MAIN BEARINGS','两只滚珠轴承装在曲轴箱与侧盖的轴承座内，支承曲轴并允许它相对曲轴箱旋转。',[0,-.3,3.2]],
 ['flywheel','飞轮与风扇','FLYWHEEL & FAN','飞轮与曲轴一起旋转，转动惯量减小转速波动。外缘的风扇叶片把冷却空气经风罩吹向气缸，轮缘磁铁每转一次在点火线圈中感应出点火电压。',[0,-.4,-3.0]],
 ['timing','正时齿轮','TIMING GEARS','曲轴上的20齿小齿轮直接带动凸轮轴上的40齿大齿轮，两者转向相反、转速二比一，保持气门与活塞的相位关系。',[2.4,-1.6,2.6]],
 ['ports','进排气管与化油器','INTAKE, CARBURETOR & EXHAUST','化油器把燃油与空气混合后经进气道送入气缸，排气道把废气经法兰与弯管送入消声器。',[2.6,.2,-1.0]],
 ['tank','燃油箱','FUEL TANK','3.1 L燃油箱架在曲轴箱上方，油箱盖在后部，前部油位表显示存油量。燃油经油开关流向化油器。',[0,3.4,0]],
 ['aircleaner','空气滤清器','AIR CLEANER','双级空气滤清器装在化油器进气口上，上盖用翼形螺母固定，内部滤芯过滤进入发动机的空气。',[1.8,3.0,-2.6]],
 ['muffler','消声器','MUFFLER','消声器装在排气弯管上方，外罩的百叶孔防止烫伤，废气从侧面出口排出。',[3.0,2.6,2.4]],
 ['shroud','风罩与点火线圈','FAN SHROUD & IGNITION COIL','风罩包住飞轮与风扇，把冷却空气导向气缸与缸盖。点火线圈装在飞轮外缘旁，与轮缘磁铁保持小间隙。',[0,0,-4.2]],
 ['starter','反冲起动器','RECOIL STARTER','拉动起动拉手时，绳轮上的棘爪啮合飞轮外端的棘爪盘，带动曲轴转动起动发动机。外罩上的百叶孔是风扇进风口。',[0,0,-6.2]],
 ['controls','操纵机构','CONTROLS','油门手柄经调速器连杆控制节气门开度，阻风门手柄用于冷机起动，燃油开关控制油箱到化油器的油路。',[2.0,.6,-2.4]]
];
export function build(materials,info){
 const B=makeBuilder(materials),bore=2*ENGINE.radius*68/54/2,named=instantiateAsset(B,'engine',PARTS,materials),part=id=>B.parts.find(p=>p.id===id).group;
 const get=name=>{const o=named.get(name);if(!o)throw new Error('发动机模型缺少子组 '+name);return o;};
 // 导出顺序按名称排列，这里把弹簧子组放回气门组的第一个子组、两只齿轮按20齿在前排列。
 const first=(g,o)=>{g.children.splice(g.children.indexOf(o),1);g.children.unshift(o);};
 const piston=part('piston'),rod=part('rod'),crank=part('crank'),fly=part('flywheel'),cam=part('cam'),timing=part('timing');
 const valves=['intake','exhaust'].map(part),valveSprings=['intake','exhaust'].map(id=>get('spring.'+id)),rocker=['intake','exhaust'].map(id=>get('rocker.'+id)),tappet=['intake','exhaust'].map(id=>get('tappet.'+id)),gears=[get('gear20'),get('gear40')];
 valves.forEach((g,i)=>first(g,valveSprings[i]));first(timing,gears[1]);first(timing,gears[0]);
 // 模型文件以单精度保存节点旋转，气缸坐标系的组恢复为精确的气缸倾角，使配气机构沿气缸轴线的位置与代码模型一致。
 for(const o of [...B.parts.map(p=>p.group),...named.values()]){const q=o.quaternion;if(!o.isMesh&&Math.abs(q.x)+Math.abs(q.y)<1e-7&&Math.abs(2*Math.atan2(q.z,q.w)-FRAME)<1e-6)o.rotation.set(0,0,FRAME);}
 // 铝铸件改为砂铸表面：沿用铸件粗糙度纹理，各铸件颜色略有差别。只改本模型网格的材质副本，共用铝材不变。
 const castTone={case:1,cylinder:.96,head:1.03,cover:1.06,flywheel:.93};
 for(const [id,f]of Object.entries(castTone))part(id).traverse(o=>{if(!o.isMesh||o.userData.materialKey!=='alloy')return;const m=o.material;m.color.setHex(0xa3a9ac).multiplyScalar(f);m.metalness=.6;m.roughness=.58;const map=materials.cast.roughnessMap;if(map){m.roughnessMap=map;m.bumpMap=map;m.bumpScale=.003;}m.needsUpdate=true;});
 const camC=[1.30*Math.cos(-50*PI/180),1.30*Math.sin(-50*PI/180)],camL=[1.30*Math.sin(75*PI/180),1.30*Math.cos(75*PI/180)];
 const uT=new T.Vector2(.92-camL[0],4.80-camL[1]).normalize(),T0=[camL[0]+(.1925+.1)*uT.x,camL[1]+(.1925+.1)*uT.y],pivot=[.46,4.86],valveZ=[-.36,.36],springBase=4.33;
 const camRot=a=>(a-FRAME)/2;
 const gas=B.mesh(piston,new T.CylinderGeometry(bore-.01,bore-.01,1,40),'gas',[0,1,0]);gas.userData.effect=true;gas.castShadow=false;
 const gasColors=[0x5da1c4,0xdaa050,0xe46f29,0x7e8c91].map(c=>new T.Color(c));
 const d=new T.Vector3(AXIS.x,AXIS.y,0),tmp=new T.Vector3();
 function setOffsets(e){for(const p of B.parts)p.group.position.copy(p.base).addScaledVector(p.offset,e);}
 function update(a,e,mode){
  const p=pistonPose(a),phase=Math.floor((a%(PI*4))/PI),crankRot=-a+FRAME;setOffsets(e);
  piston.position.addScaledVector(d,p.pistonY);tmp.set(p.x,p.y,0).applyAxisAngle(new T.Vector3(0,0,1),FRAME);rod.position.add(tmp);rod.rotation.z=p.rodAngle+FRAME;
  crank.rotation.z=crankRot;fly.rotation.z=crankRot;cam.position.x+=camC[0];cam.position.y+=camC[1];cam.rotation.z=camRot(a);gears[0].rotation.z=crankRot;gears[1].rotation.z=camRot(a);
  valves.forEach((g,i)=>{const lift=valveLift(a,i?'exhaust':'intake');g.position.addScaledVector(d,-lift);valveSprings[i].position.y=springBase+lift;valveSprings[i].scale.y=(.37-lift)/.37;rocker[i].position.y=pivot[1]+lift;rocker[i].rotation.z=Math.asin(lift/.46);tappet[i].position.set(T0[0]+lift*uT.x,T0[1]+lift*uT.y+lift,valveZ[i]);});
  const h=Math.max(.03,3.44-p.pistonY-.52);gas.scale.y=h;gas.position.y=.52+h/2;const cycle=a%(PI*4),fraction=(cycle%PI)/PI,mix=T.MathUtils.smoothstep(fraction,.72,1);gas.material.color.lerpColors(gasColors[phase],gasColors[(phase+1)%4],mix);gas.material.opacity=.12+.13*Math.exp(-Math.pow((cycle-PI*2-.2)/.4,2));gas.visible=mode==='motion'&&e<.01;
 }
 return {...B,update,info};
}
