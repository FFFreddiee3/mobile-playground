import * as T from '#three';
import {makeBuilder} from '#geometry';
import {offsets} from '#vehicle-kit';
import {instantiateAsset} from '#glb';
// 几何由 blender/sentinel1.py 导出。部件顺序、名称、展开偏移和运动公式与代码造型一致。
const k=.5, tile=12.3*k/14, tiles=[3,3,2,3,3], pgap=.03;
let cursor=-(14*tile+4*pgap)/2;
const radarOff=[];
for(let i=0;i<5;i++){const len=tiles[i]*tile,cx=cursor+len/2;radarOff.push([cx*.55,-.8,1.8]);cursor+=len+pgap;}
const PARTS=[
 ['frame','平台承力框架','SPACECRAFT FRAME','中心承力筒、上下层板和四角立柱组成主承力结构，外板与设备都固定在这一框架上。',[0,-1.3,0]],
 ['covers','东西侧多层隔热毯','THERMAL BLANKETS','两侧隔热毯贴合层板和立柱外缘，压条分隔各块包覆，前侧剖开后露出内部设备。',[0,.6,-1.7]],
 ['electronics','电子设备箱与线束','AVIONICS','设备箱贴装在散热板内侧，电路板和线束沿箱体朝内一侧布置。',[-1.4,-.5,-.8]],
 ['batteries','蓄电池组与配电','BATTERY PACKS','两组蓄电池贴装在散热板下半部内侧，单体顶部由连接条串接。',[1.4,-1.2,0]],
 ['radiator','南北散热面与热管','RADIATOR PANELS','两侧白色散热板外表面排列光学反射片，内侧水平热管把设备热量传到板面。',[-1.7,.7,0]],
 ['attitude','反作用轮组','REACTION WHEELS','三个倾斜安装的反作用轮通过立座固定在底层板上，转子在罩内转动。',[0,-.8,1.5]],
 ['adapter','底部对接环与包带','LAUNCH ADAPTER','底层板下方的对接环与中心承力筒同轴，包带和螺栓把卫星固定在运载器接口上。',[0,-1.9,0]],
 ['solar0','后向太阳翼','SOLAR WING','根部轭板和五块电池板沿飞行方向伸出，与雷达天线平行。',[-1.8,.6,0]],
 ['solar1','前向太阳翼','SOLAR WING','根部轭板和五块电池板沿飞行方向伸出，与雷达天线平行。',[1.8,.6,0]],
 ['radar-support','雷达天线支架与展开撑杆','RADAR SUPPORT','中央面板由四根支杆固定在平台侧面，两侧撑杆连接相邻面板背部。',[0,-.9,1.2]],
 ...tiles.map((n,i)=>['radar'+i,'雷达天线面板 '+(i+1),'SAR ANTENNA PANEL',`面板正面排列${n}块辐射瓦片，侧边铰链连接相邻面板。`,radarOff[i]]),
 ['radar-electronics','雷达电子设备与射频线缆','RADAR ELECTRONICS','雷达电子箱贴装在天线上方的平台侧面，射频线缆沿支架接入中央面板背部。',[-1.5,.9,.8]],
 ['antenna','数据传输天线与转台','DATA DOWNLINK ANTENNA','对地数据传输天线经立柱和转台连接底层板。',[1.5,-1,-1.1]]
];
export const INFO={
 basis:'外形按 ESA Facts and figures 的 21×2.5×4 米、Living Planet Symposium 2013 的本体 3.4×1.3×1.3 米与 SAR 天线 12.30×1.02 米，以及 SP-1322 的 12.3×0.821 米电口径。雷达面板按 ESA 效果图统一为金色毯面，不采用配置图里的分区色。每翼 5 块电池板加 1 块轭板。辐射槽、隔热毯、设备箱、贮箱、反作用轮、线缆和支架截面为网页造型补全，不是制造图纸。',
 source:'https://www.esa.int/Applications/Observing_the_Earth/Copernicus/Sentinel-1/Facts_and_figures',
 sourceName:'ESA Sentinel-1 Facts and figures'
};
export function build(materials,info){
 const B=makeBuilder(materials);
 instantiateAsset(B,'sentinel1',PARTS,materials);
 const rename=[[/^array-panel(\.\d+)?$/,'array-panel'],[/^array-yoke(\.\d+)?$/,'array-yoke'],[/^array-tracker(\.\d+)?$/,'array-tracker'],[/^mli-blanket(\.\d+)?$/,'mli-blanket']];
 B.root.traverse(o=>{for(const [re,name] of rename)if(re.test(o.name))o.name=name;});
 // GLB 单精度四元数需恢复固定倾角，避免把不动的天线误认成活动组。
 B.root.traverse(o=>{if(o.name==='x-band-antenna')o.rotation.set(.16,Math.PI,0);});
 const trackers=[],wheels=[];
 let turn=null;
 B.root.updateMatrixWorld(true);
 B.root.traverse(o=>{
  if(o.name==='array-tracker')trackers.push(o);
  if(/^wheel\.[012]$/.test(o.name))wheels.push(o);
  if(o.name==='downlink.turn')turn=o;
 });
 trackers.sort((a,b)=>a.getWorldPosition(new T.Vector3()).x-b.getWorldPosition(new T.Vector3()).x);
 wheels.sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0);
 if(trackers.length!==2||wheels.length!==3||!turn)throw new Error('sentinel1 子组不完整');
 // 背板采用低饱和灰色编织表面，与正面电池片分别着色。纹理不依赖浏览器画布。
 const weaveBytes=new Uint8Array(64*64*4);
 for(let y=0;y<64;y++)for(let x=0;x<64;x++){
  const i=(y*64+x)*4,thread=((x>>2)+(y>>2))%2===0;
  const v=thread?174+(x%4)*5:174+(y%4)*5;
  weaveBytes.set([v,v,v,255],i);
 }
 const weave=new T.DataTexture(weaveBytes,64,64,T.RGBAFormat);
 weave.wrapS=weave.wrapT=T.RepeatWrapping;weave.repeat.set(5,5);weave.needsUpdate=true;
 B.root.traverse(o=>{if(!o.isMesh||!o.material)return;const key=o.userData.materialKey,m=o.material;
  if(/^array-backsheet(?:\.\d+)?$/.test(o.name)){
   m.color.setHex(0x42453d);m.metalness=.18;m.roughness=.86;m.map=weave;m.bumpMap=weave;m.bumpScale=.0012;
  }
  if(key==='solar'){m.color.setHex(0x0f2442);m.metalness=.35;m.roughness=.34;m.clearcoat=.3;m.envMapIntensity=.7;}
  if(key==='goldfoil'){m.color.setHex(0xc7a458);m.metalness=.80;m.roughness=.40;}
  if(key==='foil'){m.color.setHex(0xc5c9c9);m.metalness=.86;m.roughness=.36;}
 });
 function update(a,e){
  offsets(B,e);
  wheels.forEach((g,i)=>g.rotation.y=a*(.9+i*.25));
  trackers.forEach((g,i)=>g.rotation.x=.08*Math.sin(a*.14+i*.3));
  turn.rotation.y=.35*Math.sin(a*.2);
 }
 function disposal(after){
  if(after){after.then(()=>disposal(),()=>disposal());return;}
  B.disposal();weave.dispose();
 }
 return {...B,update,disposal,info};
}
