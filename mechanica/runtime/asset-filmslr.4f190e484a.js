import * as T from '#three';
import {makeBuilder} from '#geometry';
import {cameraExposure,filmCurtains} from '#cameras';
import {offsets} from '#vehicle-kit';
import {instantiateAsset} from '#glb';
const PI=Math.PI,TAU=PI*2;
// 几何由blender/filmslr.py建模导出为models/filmslr.glb，本模块按部件与子组名称驱动运动。
// 比例与代码造型一致：1个模型单位=35.9/0.82毫米，光轴在y=0.02、卡口面z=0.7075。
// 拨轮轮毂与齿纹、快门钮、热靴按测试要求用代码几何补建，位置从模型文件实测顶盖与取景器罩顶面推出。
const PARTS=[
 ['frame','镁合金骨架','MAGNESIUM CHASSIS','压铸镁合金前隔板承接镜头卡口，上下板与两侧立板围成机身承力框。',[0,-1.2,0]],
 ['body','前部外壳与握柄','FRONT SHELL & GRIP','前面板留有镜头通孔，握柄内为电池仓，上方实心部分形成电池仓顶。',[0,.4,1.1]],
 ['rear','后盖与压片板','REAR SHELL','铰接后盖内侧的压片板把胶片压在片门导轨上。',[0,.3,-1.25]],
 ['controls','顶部拨轮与热靴','TOP CONTROLS','快门按钮、模式拨轮和热靴分别安装在顶盖上。',[.6,1.3,0]],
 ['mount','三爪镜头卡口环','LENS MOUNT','三爪卡口环固定在前隔板前方，胶片机为机械连动，不设电气触点。',[0,0,1.4]],
 ['shutter','横走式焦平面快门','FOCAL PLANE SHUTTER','两道钛箔帘幕分别绕在片门两侧的卷鼓上，前帘收卷后后帘展开。',[-1.2,1.0,.3]],
 ['battery','测光电池与底部电池仓','BATTERY PACK','两枚扣式电池装在底部电池仓内。',[1.7,-.8,0]],
 ['barrel','镜头外筒与卡口','LENS BARREL','镜筒按官方直径64毫米、全长72毫米的镜头数据建模，后端法兰贴合机身卡口面，卡口爪与后组镜片伸入卡口内径。',[0,.8,1.9]],
 ['focus','对焦环与橡胶纹','FOCUS RING','对焦环套在镜筒外，内径与镜筒保持小间隙，转动时带动内部镜组前后移动。',[0,1.6,1.1]],
 ['optics','光学镜片与移动镜框','OPTICAL ELEMENTS','多组曲面镜片沿光轴排列，镜框外缘沿镜筒内壁滑动。',[1.5,.2,1.8]],
 ['aperture','光圈叶片与支承环','IRIS DIAPHRAGM','九片叶片分层叠放在支承环前方，各绕外缘枢轴转动形成可变通光孔。',[-1.4,-.6,1.9]],
 ['fittings','连接口与肩带挂环','PORTS & FITTINGS','接口盖、肩带挂环和三脚架接口分布在机身周围。',[-1.7,-.8,-.4]],
 ['mirror','反光镜与翻转支承','REFLEX MIRROR','铰轴位于对焦屏下后方，反光镜先抬起贴近对焦屏，快门随后开放，曝光结束后回落。',[-1.3,.6,.8]],
 ['prism','五棱镜与对焦屏','PENTAPRISM & FOCUSING SCREEN','对焦屏到镜面中心的距离等于胶片到镜面中心的距离，五棱镜把对焦屏影像转到目镜。',[0,1.4,-.3]],
 ['reels','胶卷暗盒与收片轴','FILM REELS','供片暗盒与收片轴位于片门两侧，输片齿轮与收片轴只在过片阶段转动。',[1.4,-.7,-.4]],
 ['film','胶片、片门与导轨','PERFORATED FILM','35毫米胶片跨过片门，齿孔间距与胶片宽度按标准换算，片门开口为36×24毫米。',[0,.2,-1.4]],
 ['advance','过片杆与传动轴','FILM ADVANCE','顶部过片杆绕固定轴转动，与收片轴、输片齿轮在过片阶段配合。',[1.4,1.2,0]]
];
export function build(materials,info){
 const B=makeBuilder(materials),named=instantiateAsset(B,'filmslr',PARTS,materials);
 const get=name=>{const o=named.get(name);if(!o)throw new Error('胶片单反模型缺少子组 '+name);return o;};
 const part=id=>B.parts.find(p=>p.id===id).group;
 // 相机自己的细颗粒表面随该模型释放，不改变其他模型的共用材质。
 const grainData=new Uint8Array(128*128*4);for(let y=0;y<128;y++)for(let x=0;x<128;x++){const h=Math.sin(x*127.1+y*311.7)*43758.5453,v=150+Math.floor((h-Math.floor(h))*85),i=(y*128+x)*4;grainData[i]=grainData[i+1]=grainData[i+2]=v;grainData[i+3]=255;}
 const grain=new T.DataTexture(grainData,128,128);grain.wrapS=grain.wrapT=T.RepeatWrapping;grain.repeat.set(12,12);grain.magFilter=T.LinearFilter;grain.minFilter=T.LinearMipmapLinearFilter;grain.generateMipmaps=true;grain.needsUpdate=true;
 // 涂装分区（实物照片参考）：顶盖与取景器罩为黑铬金属漆，机身与后盖为皮革颗粒蒙皮，
 // 握柄与眼罩为低反光橡胶，镜筒为金属黑漆；只改本模型网格的材质副本。
 const finish=(mesh,grip=false)=>{const m=mesh.material;m.color.setHex(grip?0x111416:0x1c2024);m.metalness=grip?.015:.18;m.roughness=grip?.89:.49;m.roughnessMap=grain;m.bumpMap=grain;m.bumpScale=grip?.007:.002;m.needsUpdate=true;return mesh;};
 const leather=mesh=>{const m=mesh.material;m.color.setHex(0x111210);m.metalness=.02;m.roughness=.93;m.roughnessMap=grain;m.bumpMap=grain;m.bumpScale=.012;m.needsUpdate=true;};
 const blackchrome=mesh=>{const m=mesh.material;m.color.setHex(0x17191c);m.metalness=.52;m.roughness=.38;m.roughnessMap=grain;m.bumpMap=grain;m.bumpScale=.0007;m.needsUpdate=true;};
 const lacquer=mesh=>{const m=mesh.material;m.color.setHex(0x202329);m.metalness=.48;m.roughness=.27;m.needsUpdate=true;};
 const painted=(o,plate)=>{if(!o.isMesh)return;if(o.userData.materialKey==='rubber')finish(o,true);else if(o.userData.materialKey==='black')plate?blackchrome(o):leather(o);};
 part('body').traverse(o=>painted(o,false));
 part('rear').traverse(o=>painted(o,false));
 part('prism').traverse(o=>painted(o,true));
 const topCover=named.get('camera-top-cover');
 if(topCover)blackchrome(topCover);
 part('barrel').traverse(o=>{if(!o.isMesh)return;if(o.userData.materialKey==='black')lacquer(o);else if(o.userData.materialKey==='rubber')finish(o,true);});
 part('focus').traverse(o=>{if(o.isMesh&&o.userData.materialKey==='rubber')finish(o,true);});
 // 内部骨架为压铸镁合金本色；光学玻璃半透明并带镀膜反光；钛箔帘幕、胶片按代码造型调色。
 part('frame').traverse(o=>{if(!o.isMesh||o.userData.materialKey!=='alloy')return;const m=o.material;m.color.setHex(0x8f979c);m.metalness=.55;m.roughness=.46;m.needsUpdate=true;});
 let prismGlass=false;
 B.root.traverse(o=>{
  if(!o.isMesh)return;
  if(o.userData.materialKey==='optics'){const m=o.material;m.color.setHex(0x23423e);m.roughness=.075;m.metalness=.12;m.clearcoat=.65;m.clearcoatRoughness=.04;m.envMapIntensity=.8;m.transparent=true;m.opacity=o.parent===part('prism')&&!prismGlass?.45:.26;m.depthWrite=false;if(o.parent===part('prism'))prismGlass=true;m.needsUpdate=true;}
  if(/^film-shutter-curtain-\d$/.test(o.parent?.name||'')){const m=o.material;m.color.setHex(0x2a2d31);m.metalness=.75;m.roughness=.38;m.needsUpdate=true;}
  if(o.name==='film-strip'){const m=o.material;m.color.setHex(0x6b3a1c);m.metalness=.05;m.roughness=.35;m.needsUpdate=true;}
 });
 // 顶部拨轮：轮毂、齿纹与快门钮为代码几何，坐在模型文件的顶盖板与座圈上。
 // 参考造型：快门大拨轮与曝光补偿环在取景器罩左侧，倒片鼓在左后，均为带底的阶梯轮。
 const controls=part('controls');
 let coverTop=-Infinity;
 controls.traverse(o=>{if(o.isMesh&&o.name==='camera-top-cover'){const b=new T.Box3().setFromObject(o);coverTop=Math.max(coverTop,b.max.y);}});
 if(!isFinite(coverTop))throw new Error('胶片单反模型缺少顶盖板');
 const dials=[ // [x,z, 底半径, 底高, 轮毂半径]
  [-.37,.10,.28,.1765,.22],   // 快门拨轮，顶≈50.5mm
  [-.868,-.18,.25,.2336,.20], // 倒片鼓，顶≈53mm
  [-.37,.10,.315,.01,.31]     // 曝光补偿环，套在快门拨轮外
 ];
 for(const [x,z,rb,hb,rh]of dials){
  B.mesh(controls,new T.CylinderGeometry(rb,rb,hb,48),'dark',[x,coverTop+.03+hb/2,z]);
  const hubY=coverTop+.03+hb+.05;
  B.mesh(controls,new T.CylinderGeometry(rh,rh,.10,48),'dark',[x,hubY,z]);
  const knurl=[];for(let i=0;i<32;i++){const a=i*TAU/32;knurl.push({p:[x+rh*Math.cos(a),hubY,z+rh*Math.sin(a)],r:[0,-a,0]});}
  B.instances(controls,new T.BoxGeometry(.015,.07,.025),'dark',knurl);
 }
 B.mesh(controls,new T.CylinderGeometry(.12,.12,.025,48),'chrome',[1.43,coverTop+.0125,.35]);
 // 热靴底座贴合取景器罩中央塔顶面，导轨坐在底座上；顶面高度由模型文件实测。
 let hoodTop=-Infinity;
 B.root.traverse(o=>{if(o.isMesh&&/^camera-viewfinder-/.test(o.name)){const b=new T.Box3().setFromObject(o);hoodTop=Math.max(hoodTop,b.max.y);}});
 if(!isFinite(hoodTop))throw new Error('胶片单反模型缺少取景器罩');
 const base=B.box(controls,.58,.018,.34,'dark',[.4797,hoodTop+.0111,-.07],.006);base.name='camera-hotshoe-base';
 B.cut(base);
 for(const x of [.2147,.7447]){const rail=B.box(controls,.035,.065,.38,'chrome',[x,hoodTop+.05645,-.07],.005);rail.name='camera-hotshoe-rail';B.cut(rail);}
 // 运动子组
 const focusRing=get('camera-focus-ring'),moving=get('camera-moving-optics'),mirrorPivot=get('camera-reflex-mirror'),
  curtains=[get('film-shutter-curtain-0'),get('film-shutter-curtain-1')],
  spools=[get('film-spool-0'),get('film-spool-1')],sprocket=get('film-sprocket'),lever=get('film-advance-lever');
 const leaves=[];B.root.traverse(o=>{const m=/^camera-iris-leaf-(\d+)$/.exec(o.name);if(m)leaves[+m[1]]={g:o,base:Math.atan2(o.position.y,o.position.x)};});
 // 挂环连同支座在展开时随骨架走，剖切只隐藏罩板，实体支座仍接到骨架横梁。
 const lugs=[];B.root.traverse(o=>{if(/^camera-strap-lug-(?:support-)?\d$/.test(o.name))lugs.push(o);});
 // 保留独立运动父组，避免网页合并网格后对已移除网格的位移不再生效。
 const strapMounts=new T.Group();strapMounts.name='camera-strap-mounts';strapMounts.userData.part='fittings';
 part('fittings').add(strapMounts);for(const o of lugs)strapMounts.add(o);
 const partOffset=id=>B.parts.find(p=>p.id===id).offset;
 const lugShift=lugs.length?new T.Vector3().subVectors(partOffset('frame'),partOffset('fittings')):null;
 function update(a,e,mode){
  offsets(B,e);const pose=cameraExposure(a);
  if(lugShift)strapMounts.position.copy(lugShift).multiplyScalar(e);
  focusRing.rotation.z=.20*Math.sin(a*.30);moving.position.z=.045*Math.sin(a*.30);
  const c=filmCurtains(a);curtains[0].scale.x=Math.max(.02,c.first);curtains[1].scale.x=Math.max(.02,c.second);
  spools[0].rotation.y=-pose.feed*PI*.9;spools[1].rotation.y=-pose.feed*PI*1.1;sprocket.rotation.y=-pose.feed*PI*1.6;lever.rotation.y=pose.lever*.95;
  mirrorPivot.rotation.x=-PI/4-pose.mirror*PI/4;
  for(const {g,base:angle}of leaves)g.rotation.z=angle+.12+.24*Math.sin(a*.25);
 }
 const dispose=B.disposal;let disposed=false;
 function disposal(after){if(after){after.then(()=>disposal(),()=>disposal());return;}if(disposed)return;disposed=true;dispose();grain.dispose();}
 return {...B,disposal,update,info};
}
