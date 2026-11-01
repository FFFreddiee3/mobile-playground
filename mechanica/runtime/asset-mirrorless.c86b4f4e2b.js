import * as T from '#three';
import {makeBuilder} from '#geometry';
import {offsets} from '#vehicle-kit';
import {cameraExposure} from '#cameras';
import {instantiateAsset} from '#glb';
const PI=Math.PI;

// 全画幅无反相机（Sony α7 IV 比例 ＋ SEL28702 镜头）的网页端模块。
// 几何由 blender/mirrorless.py 建模导出为 models/mirrorless.glb，本模块按部件与子组名称驱动运动。
// 1个模型单位＝43.7788 mm，使35.9毫米传感器宽度等于0.820单位；卡口内径46.1 mm、法兰距18 mm。
export const MM=43.7788;
const CX=-.23,CY=.02;                              // 光轴位置，与代码造型 CAMERA_AXIS 相同
const PARTS=[
 ['frame','镁合金骨架','MAGNESIUM CHASSIS','压铸镁合金前隔板承接镜头卡口，上下板与两侧立板围成机身承力框。',[0,-1.2,0]],
 ['body','前部外壳与握柄','FRONT SHELL & GRIP','前面板留有镜头通孔，握柄内为电池仓，上方实心部分形成电池仓顶。',[0,.4,1.1]],
 ['rear','后盖与操作按键','REAR SHELL','后盖、目镜和控制按钮围绕显示屏排列。',[0,.3,-1.25]],
 ['controls','顶部拨轮与热靴','TOP CONTROLS','快门按钮、模式拨轮和热靴分别安装在顶盖上。',[0,1.3,0]],
 ['mount','镜头卡口与电气触点','LENS MOUNT','卡口环内径与法兰距按公开数值换算，触点排列在卡口下方内侧。',[0,0,1.4]],
 ['sensor','全画幅传感器与防抖移动支承','IMAGE SENSOR','传感器承载板经四颗钢珠贴在固定底板上，可在平面内微移。',[0,-.5,-.9]],
 ['shutter','焦平面快门与叶片','FOCAL PLANE SHUTTER','快门叶片位于传感器前方，叶片分层错开，开启时向上叠起。',[-1.2,1.0,.3]],
 ['electronics','主板与柔性线缆','PROCESSOR BOARD','电路板经铜柱固定在后壳内侧，柔性线缆连到传感器底板。',[-1.5,-.4,-1.1]],
 ['battery','电池与握柄内仓','BATTERY PACK','电池位于握柄下段内仓，顶部触点接到仓顶。',[1.7,-.8,0]],
 ['screen','可调显示屏与铰链','CAMERA DISPLAY','显示屏连接后盖或铰链支承。',[-1.3,.0,-1.6]],
 ['barrel','镜头外筒与卡口','LENS BARREL','镜筒后端法兰贴合机身卡口面，卡口爪与后组镜片伸入卡口内径。',[0,.8,1.9]],
 ['focus','对焦环与橡胶纹','FOCUS RING','对焦环套在镜筒外，内径与镜筒保持小间隙，转动时带动内部镜组前后移动。',[0,1.6,1.1]],
 ['optics','光学镜片与移动镜框','OPTICAL ELEMENTS','多组曲面镜片沿光轴排列，镜框外缘沿镜筒内壁滑动。',[1.5,.2,1.8]],
 ['aperture','光圈叶片与支承环','IRIS DIAPHRAGM','九片叶片分层叠放在支承环前方，各绕外缘枢轴转动形成可变通光孔。',[-1.4,-.6,1.9]],
 ['fittings','连接口与肩带挂环','PORTS & FITTINGS','接口盖、肩带挂环和三脚架接口分布在机身周围。',[-1.7,-.8,-.4]]
];
export const INFO={
 basis:'外形按 Sony α7 IV（ILCE-7M4）官方规格页给出的外形寸法 131.3×96.4×79.8 mm 重建，比例基准为35.9毫米传感器宽对应0.820模型单位（1单位＝43.7788毫米）。正面轮廓由官方正面产品照片按官方宽高换算量取，侧面与顶面按官方深度寸法并参考官方顶部、背面产品照片的形状与相对位置生成；镜头取官方套头 SEL28702（外形寸法 最大径72.5 mm×長さ83 mm）。卡口内径46.1毫米与法兰距18毫米为公开数值。外壳分型线、内部构件、快门与光圈叶片、传感器支承、主板与按键布局为网页造型补全，不是厂商维修CAD或真实光学处方。',
 source:'https://www.sony.jp/ichigan/products/ILCE-7M4/spec.html',
 sourceName:'Sony α7 IV 官方规格'
};

export function build(materials,info){
 const B=makeBuilder(materials),named=instantiateAsset(B,'mirrorless',PARTS,materials);
 const get=name=>{const o=named.get(name);if(!o)throw new Error('相机模型缺少子组 '+name);return o;};
 // 子组按名称取用，不依赖导出顺序。
 const sensorPivot=get('camera-sensor-carrier'),hinge=get('camera-display-hinge'),
       focusRing=get('camera-focus-ring'),moving=get('camera-moving-optics'),
       blades=[...Array(6)].map((_,i)=>get('camera-shutter-blade-'+i)),
       leaves=[...Array(9)].map((_,i)=>({g:get('camera-iris-leaf-'+i),a:i*2*PI/9}));
 // GLB 节点位置为单精度，移动镜组的光轴坐标按本模块的光轴常数恢复（运动只改变其z）。
 moving.position.x=CX;moving.position.y=CY;
 // 传感器正面记录实际片幅，网页的成像面计算依赖它。
 const face=named.get('camera-sensor-face');
 if(face)face.userData.sensorSizeMm=[35.9,23.9];
 // 热靴左右导轨在代码造型中同名，Blender导出时加了-0/-1序号，这里恢复原名。
 const topGroup=B.parts.find(p=>p.id==='controls').group;
 const rails=[0,1].map(i=>get('camera-hotshoe-rail-'+i)),lips=[0,1].map(i=>get('camera-hotshoe-lip-'+i));
 for(const rail of rails)rail.name='camera-hotshoe-rail';
 // GLB 把节点位置与局部顶点分别存为单精度，用载入后的真实端面恢复静态装配接触：
 // 底座底面落在取景器罩顶面，导轨（连同各自的上唇）底面落在底座顶面，位移只有舍入量级。
 const realBounds=o=>{B.root.updateMatrixWorld(true);return new T.Box3().setFromObject(o,true);};
 const shoe=get('camera-hotshoe-base'),hood=new T.Box3();
 for(const n of ['camera-viewfinder-walls','camera-viewfinder-front','camera-viewfinder-rear'])hood.union(realBounds(get(n)));
 shoe.position.y+=hood.max.y-realBounds(shoe).min.y;
 const shoeTop=realBounds(shoe).max.y;
 rails.forEach((rail,i)=>{const d=shoeTop-realBounds(rail).min.y;rail.position.y+=d;lips[i].position.y+=d;});
 // GLB里所有几何都是BufferGeometry。三个拨轮毂在 blender/mirrorless.py 中是半径 .17/.24/.18、高 .10 的圆柱，
 // 这里按实际尺寸补回等价的构造参数标记，并先用真实顶点核对尺寸，标记与几何不符时直接报错。
 const DIAL_RADII=[.17,.24,.18];
 DIAL_RADII.forEach((r,i)=>{const hub=get('camera-control-dial-'+i),g=hub.geometry;g.computeBoundingBox();const size=g.boundingBox.getSize(new T.Vector3());
  if(hub.parent!==topGroup||Math.abs(size.x/2-r)>1e-4||Math.abs(size.z/2-r)>1e-4||Math.abs(size.y-.10)>1e-4)throw new Error('拨轮毂尺寸与标记不符 '+i);
  g.type='CylinderGeometry';g.parameters={height:.10,radiusTop:r,radiusBottom:r,radialSegments:96};});
 // 相机自己的细颗粒表面随该模型释放，不改变其他模型的共用材质。
 const grainData=new Uint8Array(128*128*4);
 for(let y=0;y<128;y++)for(let x=0;x<128;x++){const h=Math.sin(x*127.1+y*311.7)*43758.5453,v=150+Math.floor((h-Math.floor(h))*85),i=(y*128+x)*4;grainData[i]=grainData[i+1]=grainData[i+2]=v;grainData[i+3]=255;}
 const grain=new T.DataTexture(grainData,128,128);grain.wrapS=grain.wrapT=T.RepeatWrapping;grain.repeat.set(9,9);
 grain.magFilter=T.LinearFilter;grain.minFilter=T.LinearMipmapLinearFilter;grain.generateMipmaps=true;grain.needsUpdate=true;
 // 涂装外壳为细颗粒半哑光黑漆，握柄为低反光橡胶皮纹，骨架为压铸镁合金本色，光学玻璃半透明带镀膜反光。
 const FINISH={
  black:m=>{m.color.setHex(0x1c2024);m.metalness=.18;m.roughness=.49;m.roughnessMap=grain;m.bumpMap=grain;m.bumpScale=.002;},
  rubber:m=>{m.color.setHex(0x111416);m.metalness=.015;m.roughness=.89;m.roughnessMap=grain;m.bumpMap=grain;m.bumpScale=.007;},
  alloy:m=>{m.color.setHex(0x8f979c);m.metalness=.55;m.roughness=.46;},
  optics:m=>{m.color.setHex(0x23423e);m.roughness=.075;m.metalness=.12;m.clearcoat=.65;m.clearcoatRoughness=.04;m.envMapIntensity=.8;m.transparent=true;m.opacity=.26;m.depthWrite=false;}
 };
 B.root.traverse(o=>{if(!o.isMesh)return;const f=FINISH[o.userData.materialKey];if(!f)return;f(o.material);o.material.needsUpdate=true;});
 // 深灰金属顶盖和涂层取景器，避免内骨架的银白色与盖缝混淆。
 B.root.traverse(o=>{if(!o.isMesh)return;
  if(o.name==='camera-top-cover'){o.material.color.setHex(0x34393e);o.material.metalness=.42;o.material.roughness=.52;}
  if(o.name.startsWith('camera-viewfinder-')){o.material.color.setHex(0x20252a);o.material.metalness=.16;o.material.roughness=.58;}
  if(o.name.startsWith('camera-hotshoe-')){o.material.color.setHex(0x30353a);o.material.metalness=.52;o.material.roughness=.42;}
 });
 // 顶盖、取景器和热靴作为一个装配件拆出，保留其内部接合。
 // 共用优化器在首次合并后生成逐网格展开向量，仅此总成将这些相对位移设为零。
 const topAssembly=B.parts.find(p=>p.id==='controls').group,prepared=new WeakSet();
 function keepTopAssembly(){topAssembly.traverse(o=>{
  const g=o.geometry,delta=g?.morphAttributes?.position?.[0];
  if(!delta||prepared.has(g))return;
  delta.array.fill(0);delta.needsUpdate=true;
  if(g.userData.baseBounds)g.userData.detailBounds=g.userData.baseBounds.clone();
  g.computeBoundingBox();g.computeBoundingSphere();prepared.add(g);
 });}
 // 逐行复现代码造型的运动：传感器防抖微移、屏幕翻转、对焦环带动镜组前后、快门叶片开合、光圈叶片摆动。
 function update(a,e,mode){
  keepTopAssembly();
  offsets(B,e);const pose=cameraExposure(a);
  sensorPivot.position.x=CX+.009*Math.sin(a*.45);
  sensorPivot.position.y=CY+.007*Math.sin(a*.37);
  hinge.rotation.y=.13*(1+Math.sin(a*.18));
  focusRing.rotation.z=.20*Math.sin(a*.30);
  moving.position.z=.045*Math.sin(a*.30);
  const open=(1-Math.cos(a*.70))*.5;
  blades.forEach((g,i)=>g.position.y=-.28+i*.112+open*(.70-i*.09));
  leaves.forEach(({g,a:base})=>g.rotation.z=base+.12+.24*Math.sin(a*.25));
 }
 const dispose=B.disposal;let disposed=false;
 function disposal(after){if(after){after.then(()=>disposal(),()=>disposal());return;}if(disposed)return;disposed=true;dispose();grain.dispose();}
 return {...B,disposal,update,info};
}
