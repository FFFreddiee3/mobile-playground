import * as T from '#three';
import {makeBuilder,TAU} from '#geometry';
import {CAMERA_AXIS,CAMERA_MOUNT_FACE,CAMERA_SPECS,cameraExposure} from '#cameras';
import {instantiateAsset} from '#glb';
const PI=Math.PI;
// 几何由blender/dslr.py建模导出为models/dslr.glb，本模块按部件与子组名称驱动运动。
// 1个模型单位=35.9/0.82毫米，卡口面z=0.7075，尺寸换算与src/cameras.mjs的dslr分支相同。
// 拨轮轮毂与滚花按测试要求在代码里用CylinderGeometry与InstancedMesh补建（同engine的gas）。
const PARTS=[
 ['frame','镁合金骨架','MAGNESIUM CHASSIS','压铸镁合金前隔板承接镜头卡口，上下板与两侧立板围成机身承力框。',[0,-1.2,0]],
 ['body','前部外壳与握柄','FRONT SHELL & GRIP','前面板留有镜头通孔，握柄内为电池仓，上方实心部分形成电池仓顶。',[0,.4,1.1]],
 ['rear','后盖与操作按键','REAR SHELL','后盖、目镜和控制按钮围绕显示屏排列。',[0,.3,-1.25]],
 ['controls','顶部拨轮与热靴','TOP CONTROLS','快门按钮、模式拨轮和热靴分别安装在顶盖上。',[.6,1.3,0]],
 ['mount','镜头卡口与电气触点','LENS MOUNT','卡口环内径与法兰距按公开数值换算，触点排列在卡口下方内侧。',[0,0,1.4]],
 ['sensor','全画幅传感器与固定支承','IMAGE SENSOR','矩形传感器与其支承结构位于法兰距对应的成像面。',[0,-.5,-.9]],
 ['shutter','焦平面快门与叶片','FOCAL PLANE SHUTTER','快门叶片位于传感器前方，叶片分层错开，开启时向上叠起。',[-1.2,1.0,.3]],
 ['electronics','主板与柔性线缆','PROCESSOR BOARD','电路板经铜柱固定在后壳内侧，柔性线缆连到传感器底板。',[-1.5,-.4,-1.1]],
 ['battery','电池与握柄内仓','BATTERY PACK','电池位于握柄下段内仓，顶部触点接到仓顶。',[1.7,-.8,0]],
 ['screen','固定显示屏','CAMERA DISPLAY','显示屏连接后盖或铰链支承。',[-1.3,0,-1.6]],
 ['barrel','镜头外筒与卡口','LENS BARREL','镜筒后端法兰贴合机身卡口面，卡口爪与后组镜片伸入卡口内径。',[0,.8,1.9]],
 ['focus','对焦环与橡胶纹','FOCUS RING','对焦环套在镜筒外，内径与镜筒保持小间隙，转动时带动内部镜组前后移动。',[0,1.6,1.1]],
 ['optics','光学镜片与移动镜框','OPTICAL ELEMENTS','多组曲面镜片沿光轴排列，镜框外缘沿镜筒内壁滑动。',[1.5,.2,1.8]],
 ['aperture','光圈叶片与支承环','IRIS DIAPHRAGM','九片叶片分层叠放在支承环前方，各绕外缘枢轴转动形成可变通光孔。',[-1.4,-.6,1.9]],
 ['fittings','连接口与肩带挂环','PORTS & FITTINGS','接口盖、肩带挂环和三脚架接口分布在机身周围。',[-1.7,-.8,-.4]],
 ['mirror','反光镜与翻转支承','REFLEX MIRROR','铰轴位于对焦屏下后方，反光镜先抬起贴近对焦屏，快门随后开放，曝光结束后回落。',[-1.3,.6,.8]],
 ['prism','五棱镜与对焦屏','PENTAPRISM & FOCUSING SCREEN','对焦屏到镜面中心的距离等于传感器到镜面中心的距离，五棱镜把对焦屏影像转到目镜。',[0,1.4,-.3]]
];
// 顶部三只拨轮的位置与半径（LAYOUT.dslr：xR=1.94，shift=.34）。
const DIALS=[[1.48,.35,.17],[.954,-.25,.24],[-1.05,-.18,.18]],TOP_Y=.77,COVER_TOP=.83;
export const INFO={basis:'外形按Canon EOS 5D Mark IV官方产品图和尺寸重建，镜筒外廓参考EF85mm f/1.8 USM的75×71.5毫米。内部结构与细节为网页造型补全，不是制造图纸。',source:'https://global.canon/en/c-museum/product/dslr849.html',sourceName:'Canon Camera Museum · EOS 5D Mark IV'};
export function build(materials,info){
 const B=makeBuilder(materials),[cx,cy]=CAMERA_AXIS,zM=CAMERA_MOUNT_FACE,S=CAMERA_SPECS.dslr,MM=.82/35.9;
 const named=instantiateAsset(B,'dslr',PARTS,materials),part=id=>B.parts.find(p=>p.id===id).group;
 const get=name=>{const o=named.get(name);if(!o)throw new Error('单反模型缺少子组 '+name);return o;};
 const controlsG=part('controls'),sensorCarrier=get('camera-sensor-carrier'),focusRing=get('camera-focus-ring'),moving=get('camera-moving-optics'),mirrorPivot=get('camera-reflex-mirror');
 // Blender对同名对象自动加.001后缀；代码造型里左右两条热靴导轨同名，这里恢复原名。
 for(const o of controlsG.children)if(o.name.startsWith('camera-hotshoe-rail'))o.name='camera-hotshoe-rail';
 const blades=Array.from({length:6},(_,i)=>get('camera-shutter-blade-'+i)),leaves=Array.from({length:9},(_,i)=>get('camera-iris-leaf-'+i));
 const face=get('camera-sensor-face');face.userData.sensorSizeMm=S.format;
 // 相机自己的细颗粒表面随该模型释放，不改变其他模型的共用材质。
 const grainData=new Uint8Array(128*128*4);for(let y=0;y<128;y++)for(let x=0;x<128;x++){const h=Math.sin(x*127.1+y*311.7)*43758.5453,v=150+Math.floor((h-Math.floor(h))*85),i=(y*128+x)*4;grainData[i]=grainData[i+1]=grainData[i+2]=v;grainData[i+3]=255;}
 const grain=new T.DataTexture(grainData,128,128);grain.wrapS=grain.wrapT=T.RepeatWrapping;grain.repeat.set(9,9);grain.magFilter=T.LinearFilter;grain.minFilter=T.LinearMipmapLinearFilter;grain.generateMipmaps=true;grain.needsUpdate=true;
 // 涂装外壳为细颗粒半哑光黑漆，握柄为低反光橡胶皮纹。
 const finish=(m,grip)=>{m.color.setHex(grip?0x111416:0x1c2024);m.metalness=grip?.015:.02;m.roughness=grip?.92:.92;m.envMapIntensity=.12;m.roughnessMap=null;m.bumpMap=grain;m.bumpScale=grip?.0035:.0008;m.needsUpdate=true;};
 // 内部骨架为压铸镁合金本色，光学玻璃半透明并带镀膜反光。
 const magnesium=m=>{m.color.setHex(0x8f979c);m.metalness=.55;m.roughness=.46;m.needsUpdate=true;};
 const opticalFinish=m=>{m.color.setHex(0x23423e);m.roughness=.075;m.metalness=.12;m.clearcoat=.65;m.clearcoatRoughness=.04;m.envMapIntensity=.8;m.transparent=true;m.opacity=.26;m.depthWrite=false;m.needsUpdate=true;};
 for(const mesh of part('frame').children)if(mesh.isMesh&&mesh.userData.materialKey==='alloy')magnesium(mesh.material);
 part('body').traverse(o=>{if(!o.isMesh)return;const k=o.userData.materialKey;if(k==='black')finish(o.material,false);else if(k==='rubber')finish(o.material,true);});
 for(const id of ['rear','prism'])part(id).traverse(o=>{if(!o.isMesh)return;const k=o.userData.materialKey;if(k==='black')finish(o.material,false);else if(k==='rubber')finish(o.material,true);});
 part('controls').traverse(o=>{if(o.isMesh&&o.userData.materialKey==='black')finish(o.material,false);});
 part('barrel').traverse(o=>{if(!o.isMesh)return;const k=o.userData.materialKey,m=o.material;
  if(k==='black'){m.color.setHex(0x181b1e);m.metalness=.12;m.roughness=.50;m.needsUpdate=true;}
  else if(k==='optics')opticalFinish(m);});
 for(const name of ['camera-barrel-ring-0','camera-barrel-ring-1','camera-barrel-ring-2'])get(name).material.roughness=.35;
 moving.traverse(o=>{if(o.isMesh&&o.userData.materialKey==='optics')opticalFinish(o.material);});
 const penta=get('camera-pentaprism');opticalFinish(penta.material);penta.material.opacity=.45;
 // 拨轮：轮毂与滚花按代码造型参数在代码里补建，套在顶盖的轴座上。
 for(const [x,z,r] of DIALS){
  B.mesh(controlsG,new T.CylinderGeometry(r,r,.10,48),'dark',[x,TOP_Y+.14,z]);
  const knurl=[];for(let i=0;i<32;i++){const a=i*TAU/32;knurl.push({p:[x+r*Math.cos(a),TOP_Y+.14,z+r*Math.sin(a)],r:[0,-a,0]});}
  B.instances(controlsG,new T.BoxGeometry(.015,.07,.025),'black',knurl);
 }
 const inspection={kind:'dslr',spec:S,zS:zM-44*MM,throatR:27*MM,ringR:32.5*MM,mountFace:zM,sensorFace:face};
 const dispose=B.disposal;let disposed=false;
 function disposal(after){if(after){after.then(()=>disposal(),()=>disposal());return;}if(disposed)return;disposed=true;dispose();grain.dispose();}
 function setOffsets(e){for(const p of B.parts)p.group.position.copy(p.base).addScaledVector(p.offset,e);}
 return {...B,disposal,inspection,update(a,e,mode){
  setOffsets(e);const pose=cameraExposure(a);
  sensorCarrier.position.x=cx;sensorCarrier.position.y=cy;
  focusRing.rotation.z=.20*Math.sin(a*.30);moving.position.z=.045*((71.5*MM)/(2.520-zM))*Math.sin(a*.30);
  const open=pose.open;
  for(let i=0;i<6;i++)blades[i].position.y=-.28+i*.112+open*(.70-i*.09);
  mirrorPivot.rotation.x=-PI/4-pose.mirror*PI/4;
  for(let i=0;i<9;i++)leaves[i].rotation.z=i*TAU/9+.12+.24*Math.sin(a*.25);
 },info};
}
