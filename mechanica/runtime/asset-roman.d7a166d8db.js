import {makeBuilder} from '#geometry';
import {offsets} from '#vehicle-kit';
import {instantiateAsset} from '#glb';
export const INFO={basis:'外形依据NASA官方Roman V004三维可视化模型，以公开12.7米展开全长统一定比例。内部设备、光学台、连接及动态细节属于网页造型补全，不是制造图纸。',source:'https://science.nasa.gov/mission/roman-space-telescope/roman-observatory/',sourceName:'NASA Roman V004 官方三维模型'};
const PARTS=[
 [
  "bus",
  "六边形航天器平台与设备舱",
  "SPACECRAFT BUS",
  "六面墙板和上下层板围成平台，设备箱贴装在墙板内侧，一侧墙板剖开。",
  [
   0,
   -1.4,
   0
  ]
 ],
 [
  "frame",
  "仪器承载结构与六根支杆",
  "INSTRUMENT CARRIER",
  "六根斜支杆把承载层板支在平台上方，宽视场仪器和日冕仪挂装在承载结构两侧。",
  [
   0,
   -0.4,
   -1.4
  ]
 ],
 [
  "barrel",
  "六边形外镜筒与十道挡光环",
  "OUTER BARREL ASSEMBLY",
  "复合材料六边形外筒立在承载层板上，内部十道挡光环贴合筒壁。",
  [
   0,
   0.9,
   -1.3
  ]
 ],
 [
  "primary",
  "2.4米主镜与背部支承",
  "PRIMARY MIRROR",
  "主镜由三组双脚支杆支在承载层板上，中央开孔通往后方仪器。",
  [
   0,
   -0.8,
   1.5
  ]
 ],
 [
  "secondary",
  "0.581米次镜与支杆",
  "SECONDARY MIRROR",
  "次镜位于主镜前方，三组支杆把次镜座连接到外筒内壁。",
  [
   0,
   1.5,
   1
  ]
 ],
 [
  "wfi",
  "宽视场仪器与焦平面",
  "WIDE FIELD INSTRUMENT",
  "宽视场仪器挂装在承载层板下方一侧，焦平面装有18块探测器。",
  [
   1.7,
   0.1,
   0.5
  ]
 ],
 [
  "coronagraph",
  "日冕仪与光学台",
  "CORONAGRAPH INSTRUMENT",
  "日冕仪光学台挂装在承载层板下方另一侧，与宽视场仪器分开。",
  [
   -1.6,
   0.2,
   0.8
  ]
 ],
 [
  "solar0",
  "遮阳供电板 1",
  "SOLAR ARRAY SUN SHIELD",
  "六块板组成遮阳供电面，中间两块经支座固定在外筒，外侧四块由侧铰链连接中间板展开。",
  [
   -1.2,
   0.6,
   1.5
  ]
 ],
 [
  "solar1",
  "遮阳供电板 2",
  "SOLAR ARRAY SUN SHIELD",
  "六块板组成遮阳供电面，中间两块经支座固定在外筒，外侧四块由侧铰链连接中间板展开。",
  [
   0,
   0.6,
   1.5
  ]
 ],
 [
  "solar2",
  "遮阳供电板 3",
  "SOLAR ARRAY SUN SHIELD",
  "六块板组成遮阳供电面，中间两块经支座固定在外筒，外侧四块由侧铰链连接中间板展开。",
  [
   1.2,
   0.6,
   1.5
  ]
 ],
 [
  "solar3",
  "遮阳供电板 4",
  "SOLAR ARRAY SUN SHIELD",
  "六块板组成遮阳供电面，中间两块经支座固定在外筒，外侧四块由侧铰链连接中间板展开。",
  [
   -1.2,
   0.6,
   1.5
  ]
 ],
 [
  "solar4",
  "遮阳供电板 5",
  "SOLAR ARRAY SUN SHIELD",
  "六块板组成遮阳供电面，中间两块经支座固定在外筒，外侧四块由侧铰链连接中间板展开。",
  [
   0,
   0.6,
   1.5
  ]
 ],
 [
  "solar5",
  "遮阳供电板 6",
  "SOLAR ARRAY SUN SHIELD",
  "六块板组成遮阳供电面，中间两块经支座固定在外筒，外侧四块由侧铰链连接中间板展开。",
  [
   1.2,
   0.6,
   1.5
  ]
 ],
 [
  "cover",
  "可展开孔径盖",
  "DEPLOYABLE APERTURE COVER",
  "软结构孔径盖经铰链座固定在外筒顶部向阳一侧，展开后由两根撑杆张开。",
  [
   0,
   1.6,
   0.9
  ]
 ],
 [
  "shade",
  "下部仪器遮阳板",
  "LOWER INSTRUMENT SUN SHADE",
  "两块铜色遮阳板从平台顶边向上展开，遮挡仪器承载结构。",
  [
   0,
   -0.7,
   1.7
  ]
 ],
 [
  "antenna",
  "1.7米高增益天线与万向架",
  "HIGH GAIN ANTENNA",
  "高增益天线经伸展杆和万向架连接平台背阳侧墙板，碟面随指向缓慢转动。",
  [
   0,
   -0.6,
   -1.6
  ]
 ],
 [
  "attitude",
  "反作用轮组与线缆",
  "REACTION WHEELS",
  "四个反作用轮立在平台底层板上，线缆沿底板连接设备箱。",
  [
   -1.5,
   -1.1,
   0
  ]
 ]
];
export function build(materials,info){
 const B=makeBuilder(materials),named=instantiateAsset(B,'roman',PARTS,materials);
 const gimbal=named.get('antenna.gimbal'),wheels=[0,1,2,3].map(i=>named.get('wheel.rotor.'+i));
 B.root.traverse(o=>{if(!o.isMesh)o.quaternion.normalize();if(o.name.startsWith('roman-fixed-panel'))o.name='roman-fixed-panel';if(o.name.startsWith('roman-deployable-panel'))o.name='roman-deployable-panel';
  if(!o.isMesh)return;const k=o.userData.materialKey,m=o.material;
  if(k==='solar'){m.color.setHex(0x0b1627);m.metalness=.30;m.roughness=.48;m.clearcoat=.15;m.envMapIntensity=.55;}
  if(k==='foil'){m.color.setHex(0xb8b8ac);m.metalness=.78;m.roughness=.44;}
  if(k==='goldfoil'){m.color.setHex(0xc7a458);m.metalness=.80;m.roughness=.40;}
 });
 return {...B,info,update(a,e){offsets(B,e);gimbal.rotation.z=.4*Math.sin(a*.15);wheels.forEach((g,i)=>g.rotation.y=a*(.8+i*.2));}};
}
