import * as T from '#three';
import {makeBuilder} from '#geometry';
import {instantiateAsset} from '#glb';
import {armorPose,ARMOR_SOURCE} from '#armored';
import {trackPose} from '#mechanism-kit';
export {armorPose,ARMOR_SOURCE};
export const INFO={cutaway:false,basis:'整车比例取自丹麦坦克博物馆Leopard 2A4公开总体尺寸，外形参照博物馆与军方照片。内部为通用网页造型补全，不是制造图纸。炮口、车载机枪和烟幕筒仅表达外观，没有内部击发、供弹、闭锁、装填或火控机构，不是可用武器设计。'};
const PARTS=[["hull", "车体壳体与履带翼板", "VEHICLE STRUCTURE", "底板、侧壁、前后斜板和履带上方翼板围成空腔，侧裙挂在上侧壁外。", [0, -0.9, -0.6]], ["roof", "车体上盖", "VEHICLE STRUCTURE", "上盖可以移开，露出通用动力和设备展示空间。", [0, 1.8, -0.4]], ["suspension", "摆臂、扭杆座与轴端", "VEHICLE STRUCTURE", "每个负重轮轴经摆臂接到车体侧壁扭杆座，托带轮、诱导轮和主动轮轴端固定在侧壁上。", [0, 0.4, -1.6]], ["track0", "左履带链", "VEHICLE STRUCTURE", "各履带板沿闭合路径连续循环，中央导齿从双轮盘之间通过，铰接衬套与主动轮齿交错。", [0, -0.25, -1.7]], ["wheels0", "左侧轮系", "VEHICLE STRUCTURE", "双轮盘负重轮、诱导轮、托带轮和主动轮分别绕固定轴心转动。", [0, 0.25, -2.2]], ["track1", "右履带链", "VEHICLE STRUCTURE", "各履带板沿闭合路径连续循环，中央导齿从双轮盘之间通过，铰接衬套与主动轮齿交错。", [0, -0.25, 1.7]], ["wheels1", "右侧轮系", "VEHICLE STRUCTURE", "双轮盘负重轮、诱导轮、托带轮和主动轮分别绕固定轴心转动。", [0, 0.25, 2.2]], ["skirt0", "左侧分段侧裙", "VEHICLE STRUCTURE", "分段侧裙挂在上侧壁外侧，上缘铰链杆贯通各段，厚度与分段为网页补全。", [0, 1, -1.7]], ["skirt1", "右侧分段侧裙", "VEHICLE STRUCTURE", "分段侧裙挂在上侧壁外侧，上缘铰链杆贯通各段，厚度与分段为网页补全。", [0, 1, 1.7]], ["engine", "活塞式动力包外形", "VEHICLE STRUCTURE", "动力包采用通用封闭外形，用支座放在车体底板上。", [-1.6, 1, 0.8]], ["transmission", "封闭传动箱与侧传动外形", "VEHICLE STRUCTURE", "传动箱经横向输出轴连到两侧侧传动壳，侧传动壳贴在车体下侧壁外。", [-1.4, -0.5, 1.1]], ["cooling", "散热格栅与风扇", "VEHICLE STRUCTURE", "平台格栅压在上盖上，风扇护圈和固定轴吊在上盖下方。", [-1.5, 1.6, -0.4]], ["slew", "炮塔座圈与固定座", "VEHICLE STRUCTURE", "座圈固定在上盖上，外形炮塔底面与座圈顶面保留 1 毫米间隙转动。", [0, 1.1, -0.6]], ["turret", "箱形炮塔与尾舱", "VEHICLE STRUCTURE", "箱形炮塔外壳、尾舱、焊缝和吊环按外观照片补全。内部不包含武器机构。", [0, 2.1, -0.4]], ["dummybarrel", "炮管与热护套外观", "VEHICLE STRUCTURE", "漆面炮管、分段热护套、抽烟装置与浅凹炮口仅用于外观展示，没有可用武器内部结构。", [1.8, 1.5, 0.6]], ["hatches", "顶部舱盖与铰链", "VEHICLE STRUCTURE", "圆形舱盖围绕固定边缘铰轴缓慢打开，铰轴穿过固定铰座。", [-0.3, 2.8, 1.1]], ["sensors", "观察窗与封闭设备盒", "VEHICLE STRUCTURE", "外部观察窗和设备盒为封闭外形，不构成可用火控系统。", [0.8, 2.5, -1]], ["basket", "侧面储物箱与后框", "VEHICLE STRUCTURE", "外部储物件、框条与网格表现车体外观细节。", [-1.5, 2.2, 0.8]], ["rear", "后部散热面与排气外形", "VEHICLE STRUCTURE", "格栅、外部罩壳与封闭排气端面安装在车尾。", [-1.9, 0.5, -0.8]], ["cabin", "车内通用设备与乘员座", "VEHICLE STRUCTURE", "空置座椅、仪表和设备盒放在底板上，仅用于观察车辆空间分配。", [-1.2, 1.7, 1]], ["tools", "外部工具、牵引环与缆线", "VEHICLE STRUCTURE", "外部固定工具、牵引环和缆线贴附在车体表面。", [-1, 1.5, 1.7]], ["lights", "灯具、防护框与尾灯", "VEHICLE STRUCTURE", "前灯和细保护框装在前上斜板上，尾灯贴在车尾板上。", [1.7, 1, 1]], ["fittings", "外壳螺钉、扶手与驾驶员舱盖", "VEHICLE STRUCTURE", "外壳紧固件、扶手和关闭的驾驶员舱盖固定在车体表面。", [0, 2, -1.8]]];
const C={"half": 2.8902652413026098, "R": 0.46, "z": 1.4432999999999998, "pitch": 0.19268434942017398, "hw": 0.3175, "anchor": [0.2, 1.661, 0]};
export function build(materials,info){
 const B=makeBuilder(materials),named=instantiateAsset(B,'leopard2',PARTS,materials),part=id=>B.parts.find(p=>p.id===id).group;
 const tracks=[],wheels=[],hatches=[0,1].map(i=>named.get('hatches.hinge.'+i));
 for(let j=0;j<2;j++){
  const parent=part('track'+j),shoes=Array.from({length:75},(_,i)=>named.get(`track${j}.shoe.${String(i).padStart(3,'0')}`));
  // GLB节点转换为真正Bone，供现有刚性履带合并入口使用。
  for(let i=0;i<shoes.length;i++){const o=shoes[i],bone=new T.Bone();bone.name=o.name;bone.userData={...o.userData};bone.position.copy(o.position);bone.quaternion.copy(o.quaternion);bone.scale.copy(o.scale);while(o.children.length)bone.add(o.children[0]);parent.remove(o);parent.add(bone);shoes[i]=bone;}
  const z=(j?1:-1)*C.z,batch={parent,bones:shoes,half:C.half,r:C.R,z};(B.rigidBatches??=[]).push(batch);
  const update=distance=>shoes.forEach((g,i)=>{const q=trackPose(i*C.pitch+distance,C.half,C.R);g.position.set(q.x,q.y+C.R+.08,z);g.rotation.z=q.angle;});
  tracks.push({shoes,update,half:C.half,r:C.R,z,pitch:C.pitch,batch});
  for(const g of part('wheels'+j).children.filter(g=>!g.isMesh)){const road=g.name.includes('.road.'),drive=g.name.includes('.drive.'),idler=g.name.includes('.idler.');wheels.push({g,r:road?.31:drive||idler?.46:.155,center:g.position.clone(),road,side:j?1:-1,...(drive?{teeth:15}:{})});}
 }
 // 保留从原入口序列化的真实几何类型，供现有轮系接触检查识别。
 B.root.traverse(o=>{if(!o.isMesh)return;if(o.name.endsWith(':bush')){o.geometry.type='CylinderGeometry';o.geometry.parameters={radiusTop:.025};}if(o.name.endsWith(':sprocket'))o.geometry.type='ExtrudeGeometry';});
 const turretParts=['turret','dummybarrel','hatches','sensors','basket'].map(part),fans=[0,1].map(i=>named.get('cooling.fan.'+i)),cap=named.get('muzzle-recess-bottom');
 // GLB节点坐标为单精度。炮塔各部件原点与转轴锚点相差不足1e-6时恢复为同一双精度锚点，运动与检查使用同一来源。
 const anchor=new T.Vector3(...C.anchor);for(const p of B.parts)if(turretParts.includes(p.group)&&p.base.distanceTo(anchor)<1e-6){p.base.copy(anchor);p.group.position.copy(anchor);}
 // 单色深橄榄绿。纵向纹理仅控制下部轻微积尘，不含迷彩分区。
 const texSize=128,pixels=new Uint8Array(texSize*texSize*4);
 for(let y=0;y<texSize;y++)for(let x=0;x<texSize;x++){
  const height=3*y/(texSize-1),dust=.20*Math.max(0,1-height/1.20),grain=((Math.sin(x*12.9898+y*78.233)*43758.5453)%1)*.8;
  const clean=[42,56,43],dirt=[83,78,61],k=4*(y*texSize+x);
  for(let j=0;j<3;j++)pixels[k+j]=Math.round(clean[j]*(1-dust)+dirt[j]*dust+grain);
  pixels[k+3]=255;
 }
 const paintSurface=new T.DataTexture(pixels,texSize,texSize,T.RGBAFormat);paintSurface.colorSpace=T.SRGBColorSpace;paintSurface.wrapS=T.RepeatWrapping;paintSurface.wrapT=T.ClampToEdgeWrapping;paintSurface.magFilter=T.LinearFilter;paintSurface.minFilter=T.LinearMipmapLinearFilter;paintSurface.generateMipmaps=true;paintSurface.needsUpdate=true;
 const olivePaint=m=>{m.color.setHex(0xffffff);m.map=paintSurface;m.metalness=.02;m.roughness=.93;m.envMapIntensity=.38;m.opacity=1;m.transparent=false;m.depthWrite=true;m.side=T.FrontSide;if('transmission'in m)m.transmission=0;if('clearcoat'in m)m.clearcoat=0;m.needsUpdate=true;};
 B.root.updateMatrixWorld(true);
 const paintUV=(o)=>{
  const old=o.geometry,g=old.clone();g.type=old.type;g.parameters=old.parameters;o.geometry=g;
  const world=o.matrixWorld.clone();if(o.isInstancedMesh){const instance=new T.Matrix4();o.getMatrixAt(0,instance);world.multiply(instance);}
  const uv=new Float32Array(g.attributes.position.count*2),v=new T.Vector3();for(let i=0;i<g.attributes.position.count;i++){v.fromBufferAttribute(g.attributes.position,i).applyMatrix4(world);uv[2*i]=v.x*.31+v.z*.23;uv[2*i+1]=T.MathUtils.clamp(v.y/3,0,1);}g.setAttribute('uv',new T.BufferAttribute(uv,2));
 };
 // 履带的钢板与橡胶垫通过两区颜色、金属度和粗糙度贴图共用一个材质。
 // 原合并入口每片刚性履带只接收一个网格，UV在合并过程中原样保留。
 const map2=data=>{const t=new T.DataTexture(new Uint8Array(data),2,1,T.RGBAFormat);t.magFilter=t.minFilter=T.NearestFilter;t.needsUpdate=true;return t;};
 // 接触边缘只有很轻的磨亮，橡胶仍保持近黑色。
 const treadPixels=new Uint8Array(2*64*4),roughPixels=new Uint8Array(2*64*4);
 for(let j=0;j<64;j++)for(let k=0;k<2;k++){
  const edge=Math.pow(Math.abs(2*j/63-1),14),base=k?[34,42,36]:[9,12,10],i=(j*2+k)*4;
  for(let c=0;c<3;c++){treadPixels[i+c]=Math.round(base[c]+edge*(k?8:3));roughPixels[i+c]=Math.round((k?230:252)-edge*(k?24:5));}
  treadPixels[i+3]=roughPixels[i+3]=255;
 }
 const trackColor=new T.DataTexture(treadPixels,2,64,T.RGBAFormat);trackColor.colorSpace=T.SRGBColorSpace;trackColor.magFilter=T.LinearFilter;trackColor.minFilter=T.LinearFilter;trackColor.needsUpdate=true;
 const trackMetal=map2([0,0,0,255,96,96,96,255]),trackRough=new T.DataTexture(roughPixels,2,64,T.RGBAFormat);trackRough.magFilter=trackRough.minFilter=T.LinearFilter;trackRough.needsUpdate=true;
 B.root.traverse(o=>{
  if(!o.isMesh)return;const k=o.userData.materialKey,m=o.material;
  if(String(o.userData.part).startsWith('track')){
   const old=o.geometry,g=old.clone();g.type=old.type;g.parameters=old.parameters;o.geometry=g;
   g.computeBoundingBox();const span=Math.max(.001,g.boundingBox.max.x-g.boundingBox.min.x),uv=new Float32Array(g.attributes.position.count*2);for(let i=0;i<g.attributes.position.count;i++){uv[2*i]=k==='rubber'?.25:.75;uv[2*i+1]=(g.attributes.position.getX(i)-g.boundingBox.min.x)/span;}g.setAttribute('uv',new T.BufferAttribute(uv,2));
   o.userData.materialKey='dark';m.color.setHex(0xffffff);m.map=trackColor;m.metalness=.35;m.envMapIntensity=.22;m.metalnessMap=trackMetal;m.roughness=1;m.roughnessMap=trackRough;m.transparent=false;m.opacity=1;return;
  }
  m.opacity=1;m.transparent=false;m.depthWrite=true;
  if(k==='olive'){paintUV(o);olivePaint(m);}
  else if(k==='rubber'){m.color.setHex(0x0c100d);m.roughness=.98;m.metalness=0;m.envMapIntensity=.18;}
  else if(k==='steel'||k==='chrome'||k==='dark'){if(String(o.userData.part).startsWith('wheels')){m.color.setHex(k==='dark'?0x151b16:0x29382a);m.roughness=.92;m.metalness=.10;m.envMapIntensity=.22;}else{m.color.setHex(k==='dark'?0x1c231e:0x3d493c);m.roughness=.88;m.metalness=.18;m.envMapIntensity=.35;}}
  else if(k==='glass'){m.color.setHex(0x123040);m.roughness=.18;m.metalness=.30;}
 });
 function update(a,e){for(const p of B.parts)p.group.position.copy(p.base).addScaledVector(p.offset,e);const q=armorPose(a);tracks.forEach(t=>t.update(q.travel));wheels.forEach(({g,r})=>g.rotation.z=-q.travel/r);turretParts.forEach(g=>g.rotation.y=q.yaw);hatches.forEach(h=>h.rotation.z=q.hatch);fans.forEach(g=>g.rotation.y=a*.8);}
 function refPose(){hatches.forEach(h=>h.rotation.z=0);}
 return {...B,update,info,refPose,refPoseNodes:hatches,inspection:{displayOnly:true,kind:'leopard2',tracks,wheels,turretParts,turretAnchor:C.anchor,hatches,ramp:null,cap,roadWheelsPerSide:7,source:ARMOR_SOURCE.leopard2,sprocketTeeth:15,shoePitch:C.pitch,trackZ:C.z,trackHalfWidth:C.hw}};
}
