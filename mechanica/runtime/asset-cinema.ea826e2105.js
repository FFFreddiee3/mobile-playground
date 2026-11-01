import * as T from '#three';
import {makeBuilder,TAU} from '#geometry';
import {cameraExposure} from '#cameras';
import {offsets} from '#vehicle-kit';
import {instantiateAsset} from '#glb';
const PI=Math.PI;
// 几何由blender/cinema.py按buildCamera(m,'cinema')复刻并导出为models/cinema.glb，本模块按部件与子组名称驱动运动。
// 1个模型单位=43.78mm（.82单位=35.9mm传感器宽度），与代码造型同一比例。
const CX=-.23,CY=.02;
const PARTS=[
 ['frame','镁合金骨架','MAGNESIUM CHASSIS','压铸镁合金前隔板承接镜头卡口，上下板与两侧立板围成机身承力框。',[0,-1.2,0]],
 ['body','前部外壳与握柄','FRONT SHELL & GRIP','前面板留有镜头通孔，握柄内为电池仓，上方实心部分形成电池仓顶。',[0,.4,1.1]],
 ['rear','后盖与操作按键','REAR SHELL','后盖、目镜和控制按钮围绕显示屏排列。',[0,.3,-1.25]],
 ['controls','顶部拨轮与热靴','TOP CONTROLS','快门按钮、模式拨轮和热靴分别安装在顶盖上。',[.6,1.3,0]],
 ['mount','镜头卡口与电气触点','LENS MOUNT','卡口环内径与法兰距按公开数值换算，触点排列在卡口下方内侧。',[0,0,1.4]],
 ['sensor','Super 35传感器与固定支承','IMAGE SENSOR','矩形传感器与其支承结构位于法兰距对应的成像面。',[0,-.5,-.9]],
 ['electronics','主板与柔性线缆','PROCESSOR BOARD','电路板经铜柱固定在后壳内侧，柔性线缆连到传感器底板。',[-1.5,-.4,-1.1]],
 ['battery','电池与握柄内仓','BATTERY PACK','电池位于握柄下段内仓，顶部触点接到仓顶。',[1.7,-.8,0]],
 ['screen','翻转显示屏与铰链','CAMERA DISPLAY','显示屏连接后盖或铰链支承。',[-1.3,.0,-1.6]],
 ['barrel','镜头外筒与卡口','LENS BARREL','镜筒后端法兰贴合机身卡口面，卡口爪与后组镜片伸入卡口内径。',[0,.8,1.9]],
 ['focus','对焦环与橡胶纹','FOCUS RING','对焦环套在镜筒外，内径与镜筒保持小间隙，转动时带动内部镜组前后移动。',[0,1.6,1.1]],
 ['optics','光学镜片与移动镜框','OPTICAL ELEMENTS','多组曲面镜片沿光轴排列，镜框外缘沿镜筒内壁滑动。',[1.5,.2,1.8]],
 ['aperture','光圈叶片与支承环','IRIS DIAPHRAGM','九片叶片分层叠放在支承环前方，各绕外缘枢轴转动形成可变通光孔。',[-1.4,-.6,1.9]],
 ['fittings','连接口与肩带挂环','PORTS & FITTINGS','接口盖、肩带挂环和三脚架接口分布在机身周围。',[-1.7,-.8,-.4]],
 ['nd','四档ND滤镜与选择机构','ND FILTER SELECTOR','四个滤镜位置位于卡口与传感器之间，由选择轮切换，选择机构为网页补全。',[1.5,1.3,.3]],
 ['cooling','散热鳍片与冷却风扇','CAMERA COOLING','鳍片底座坐在骨架下板上，风扇靠近左侧通风口。',[-1.6,-.8,-.2]],
 ['rig','提手、导轨与遮光斗','CAMERA RIG','底座夹座穿过双导轨，导轨前端支架托住遮光斗，顶部提手连到顶盖。',[0,-1.6,0]],
 ['recorder','外置存储与线缆','EXTERNAL RECORDING','存储盒通过侧支架固定在机身左侧，线缆接到机身接口。',[-1.9,.4,-.8]]
];
export function build(materials,info){
 const B=makeBuilder(materials),named=instantiateAsset(B,'cinema',PARTS,materials);
 // Blender导出时同名网格会被自动加上.001这类序号后缀，代码造型的重复件是同名网格，这里把序号去掉恢复原名。
 const dup=new Set(['camera-sculpted-grip','camera-hotshoe-rail','cinema-rail-clamp','cinema-mattebox-panel']);
 for(const p of B.parts)p.group.traverse(o=>{const m=/^(.*)\.(\d{3})$/.exec(o.name);if(m&&dup.has(m[1]))o.name=m[1];});
 const get=name=>{const o=named.get(name);if(!o)throw new Error('电影机模型缺少对象 '+name);return o;};
 const part=id=>B.parts.find(p=>p.id===id).group;
 // GLB 将顶盖旋转、局部顶点和节点位置分别存为单精度。
 // 用载入后的真实端面恢复静态装配接触，避免这些独立舍入在同一接合面累积。
 const bounds=o=>{B.root.updateMatrixWorld(true);return new T.Box3().setFromObject(o,true);};
 const shoe=get('camera-hotshoe-base');
 shoe.position.y+=bounds(get('camera-top-cover')).max.y-bounds(shoe).min.y;
 const shoeTop=bounds(shoe).max.y;
 for(const rail of part('controls').children.filter(o=>o.name==='camera-hotshoe-rail'))rail.position.y+=shoeTop-bounds(rail).min.y;
 // GLB里所有几何都是BufferGeometry，这里按代码造型的构造参数补回等价标记，
 // 让同一套外形判据继续作用在真实几何上：拨轮毂是半径 .17/.24/.18、高 .10 的圆柱，
 // 导轨底座是沿 z 挤出 1.65 的板；标记值与 blender/cinema.py 的实际尺寸一致。
 const DIAL_RADII=[.17,.24,.18];
 for(let i=0;i<3;i++){const hub=get('camera-dial-'+i);hub.geometry.type='CylinderGeometry';hub.geometry.parameters={height:.10,radiusTop:DIAL_RADII[i],radiusBottom:DIAL_RADII[i],radialSegments:48};}
 const rigBase=get('camera-rig-base');rigBase.geometry.type='ExtrudeGeometry';rigBase.geometry.parameters={depth:1.65,bevelEnabled:true,options:{depth:1.65,bevelThickness:.0105,bevelSize:.0105}};
 // 相机自己的细颗粒表面随该模型释放，不改变其他模型的共用材质。
 const grainData=new Uint8Array(128*128*4);for(let y=0;y<128;y++)for(let x=0;x<128;x++){const h=Math.sin(x*127.1+y*311.7)*43758.5453,v=150+Math.floor((h-Math.floor(h))*85),i=(y*128+x)*4;grainData[i]=grainData[i+1]=grainData[i+2]=v;grainData[i+3]=255;}
 const grain=new T.DataTexture(grainData,128,128);grain.wrapS=grain.wrapT=T.RepeatWrapping;grain.repeat.set(9,9);grain.magFilter=T.LinearFilter;grain.minFilter=T.LinearMipmapLinearFilter;grain.generateMipmaps=true;grain.needsUpdate=true;
 // 涂装外壳为细颗粒半哑光黑漆，握柄为低反光橡胶皮纹。
 function finish(mesh,grip=false){mesh.material.color.setHex(grip?0x111416:0x1c2024);mesh.material.metalness=grip?.015:.18;mesh.material.roughness=grip?.89:.49;mesh.material.roughnessMap=grain;mesh.material.bumpMap=grain;mesh.material.bumpScale=grip?.007:.002;return mesh;}
 finish(get('camera-front-shell'));finish(get('camera-bottom-plate'));finish(get('camera-left-shell'));finish(get('camera-rear-shell'));finish(get('camera-top-cover'));
 for(const g of part('body').children.filter(o=>o.name==='camera-sculpted-grip'))finish(g,true);
 // 内部骨架为压铸镁合金本色，偏灰、半哑光。
 part('frame').traverse(o=>{if(!o.isMesh||o.userData.materialKey!=='alloy')return;const m=o.material;m.color.setHex(0x8f979c);m.metalness=.55;m.roughness=.46;m.needsUpdate=true;});
 // 镜筒本体与对焦环下的固定环。
 part('barrel').traverse(o=>{if(!o.isMesh)return;const m=o.material;if(o.userData.materialKey==='black'){m.color.setHex(0x181b1e);m.metalness=.28;m.roughness=.32;}else if(o.userData.materialKey==='dark'&&o.name.startsWith('camera-lens-ring')){m.roughness=.35;}m.needsUpdate=true;});
 // 光学玻璃半透明并带镀膜反光。
 function opticalFinish(mesh){const material=mesh.material;material.color.setHex(0x23423e);material.roughness=.075;material.metalness=.12;material.clearcoat=.65;material.clearcoatRoughness=.04;material.envMapIntensity=.8;material.transparent=true;material.opacity=.26;material.depthWrite=false;return mesh;}
 opticalFinish(get('camera-lens-element-front'));opticalFinish(get('camera-lens-element-rear'));
 for(let i=0;i<4;i++)opticalFinish(get('camera-moving-element-'+i));
 // 传感器像元尺寸与ND滤镜档位写入userData，ND滤镜除第一片外加深。
 get('camera-sensor-face').userData.sensorSizeMm=[23.10,12.99];
 for(let i=0;i<4;i++){const f=get('cinema-nd-filter-'+i);f.userData.ndFilter=i;f.userData.ndStops=[0,2,4,6][i];if(i){f.material.opacity=.55+.12*i;f.material.transparent=true;}}
 const hinge=get('camera-display-hinge'),focusRing=get('camera-focus-ring'),moving=get('camera-moving-optics'),ndWheel=get('cinema-nd-wheel'),fan=get('cinema-cooling-fan');
 const leaves=[];for(let i=0;i<9;i++)leaves.push({g:get('camera-iris-leaf-'+i),base:i*TAU/9});
 const dispose=B.disposal;let disposed=false;
 function disposal(after){if(after){after.then(()=>disposal(),()=>disposal());return;}if(disposed)return;disposed=true;dispose();grain.dispose();}
 function update(a,e){
  offsets(B,e);cameraExposure(a);
  hinge.rotation.x=.12+.06*Math.sin(a*.18);
  focusRing.rotation.z=.20*Math.sin(a*.30);moving.position.z=.045*Math.sin(a*.30);
  const cycle=a/TAU,n=Math.floor(cycle);ndWheel.rotation.z=(n+T.MathUtils.smoothstep(cycle-n,.72,.92))*PI/2;fan.rotation.x=a*2;
  leaves.forEach(({g,base})=>g.rotation.z=base+.12+.24*Math.sin(a*.25));
 }
 return {...B,disposal,update,info};
}
