import {makeBuilder} from '#geometry';
import {instantiateAsset} from '#glb';
import {offsets} from '#vehicle-kit';
const PI=Math.PI,TAU=2*PI;
// 18个部件的名称、说明、顺序与展开位移逐项继承代码造型。
const PARTS=[
 [
  "sic",
  "S-IC一级结构",
  "S-IC STRUCTURE",
  "白色蒙皮、底部隔热板、发动机整流罩和环框形成一级外形。",
  [
   -1.4,
   -0.5,
   -1
  ]
 ],
 [
  "markings",
  "黑白识别条与稳定翼",
  "ROLL MARKINGS",
  "四片稳定翼位于发动机整流罩外侧，黑白纵向条带按45度分区。",
  [
   -1.4,
   0.4,
   1.2
  ]
 ],
 [
  "tanks1",
  "一级分隔贮箱",
  "S-IC TANKS",
  "上部氧化剂容器和下部燃料容器沿纵轴排列，外壁贴合箭体内壁。",
  [
   1.4,
   0,
   0.5
  ]
 ],
 [
  "f1",
  "五台F-1发动机",
  "F-1 CLUSTER",
  "中央一台与外侧四台构成一级五机布局，顶端连接底部隔热板。",
  [
   0,
   -1.7,
   0
  ]
 ],
 [
  "interstage",
  "一二级间段",
  "INTERSTAGE",
  "环形级间筒连接相邻级，内侧有纵向加强结构。",
  [
   0,
   0.8,
   -1.5
  ]
 ],
 [
  "sii",
  "S-II二级结构",
  "S-II STRUCTURE",
  "二级与一级直径相同，底部推力板承接五台J-2发动机。",
  [
   1.5,
   1.3,
   -1
  ]
 ],
 [
  "tanks2",
  "二级容器与共同隔板",
  "S-II TANKS",
  "下部氧化剂容器与上部燃料容器通过共同隔板区域分隔。",
  [
   -1.5,
   1.6,
   0.8
  ]
 ],
 [
  "j2",
  "五台J-2二级发动机",
  "S-II J-2 ENGINES",
  "二级五台喷管朝向相同，悬挂在级间段内的推力板下方。",
  [
   0,
   1.3,
   1.7
  ]
 ],
 [
  "transition",
  "三级后级间段",
  "S-IVB AFT INTERSTAGE",
  "锥形级间段连接二级和三级的不同直径，表面按象限涂黑白方块。",
  [
   0,
   2,
   -1.3
  ]
 ],
 [
  "sivb",
  "S-IVB三级结构",
  "S-IVB STRUCTURE",
  "较细的三级箭体底部推力板承接单台J-2，顶端连接仪器环。",
  [
   1.4,
   2.2,
   0.7
  ]
 ],
 [
  "tanks3",
  "三级内部贮箱",
  "S-IVB TANKS",
  "两个轴向容器分配三级内部空间，外壁贴合箭体内壁。",
  [
   -1.3,
   2.4,
   -0.5
  ]
 ],
 [
  "singlej2",
  "三级单台J-2发动机",
  "S-IVB ENGINE",
  "单台发动机与三级中心轴重合，位于锥形级间段内。",
  [
   0,
   2,
   1.8
  ]
 ],
 [
  "iu",
  "仪器环与控制设备",
  "INSTRUMENT UNIT",
  "圆周设备安装在三级顶端的薄环内。",
  [
   0,
   3,
   -1.6
  ]
 ],
 [
  "sla",
  "飞船适配段四片蒙皮",
  "SPACECRAFT ADAPTER",
  "四片锥形蒙皮下径21英尺8英寸、上径12英尺10英寸，包围登月舱。",
  [
   0,
   3.2,
   1.5
  ]
 ],
 [
  "lunar",
  "登月舱与支承架",
  "LUNAR MODULE",
  "折叠的支腿、下降级和上升级占据适配段内部。",
  [
   1.5,
   3.3,
   0
  ]
 ],
 [
  "service",
  "阿波罗服务舱",
  "SERVICE MODULE",
  "服务舱围绕中央轴安装设备、外部喷口和热控表面。",
  [
   -1.3,
   3.8,
   0.5
  ]
 ],
 [
  "command",
  "指令舱与防热底部",
  "COMMAND MODULE",
  "锥形返回舱与服务舱上端连接。",
  [
   0,
   4.1,
   -1.2
  ]
 ],
 [
  "tower",
  "逃逸塔外部结构",
  "ESCAPE TOWER",
  "四根长杆连接塔顶外罩和指令舱上方。",
  [
   0,
   4.6,
   0.8
  ]
 ]
];
export const INFO={
 basis:'外形按NASA Saturn V Flight Manual SA-503的官方尺寸和NASA阿波罗任务照片重建，保持总高110.6426米与筒体直径10.0584米的比例。内部贮箱、连接件、仪器与登月舱细节为网页造型补全，不是制造图纸。',
 source:'https://www.nasa.gov/image-article/preparing-saturn-v-apollo-13-march-24-1970/',
 sourceName:'NASA土星五号尺寸资料与官方照片'
};
export function build(materials,info){
 const B=makeBuilder(materials),named=instantiateAsset(B,'saturnv',PARTS,materials),fins=[PI/4,3*PI/4,5*PI/4,7*PI/4];
 const part=id=>B.parts.find(p=>p.id===id).group;
 // 外壳半片放回代码模型的前两项，保留测试对主壳的定义。
 for(const id of ['sic','interstage','sii','sivb','service']){
  const g=part(id),first=['body.back','body.front'].map(n=>g.children.find(o=>o.name===n||o.name.startsWith(n+'.')));
  g.children.splice(0,g.children.length,...first,...g.children.filter(o=>!first.includes(o)));
 }
 // GLB单精度角度恢复为原象限角。中心节点仍称engine-nozzle，供既有检查识别。
 for(let i=0;i<4;i++)for(const pre of ['fin','marking'])named.get(pre+'.'+i).rotation.set(0,fins[i]-PI/2,0);
 const pos={f1:[[0,0,0],...fins.map(a=>[.417*Math.sin(a),0,.417*Math.cos(a)])],j2:[[0,0],[-.23,-.23],[-.23,.23],[.23,-.23],[.23,.23]].map(([x,z])=>[x,4.75-.34,z]),singlej2:[[0,7.27-.34,0]]};
 for(const [id,centres]of Object.entries(pos))for(let i=0;i<centres.length;i++){const o=named.get('engine.'+id+'.'+i);o.position.fromArray(centres[i]);o.name='engine-nozzle';}
 // 使用每个网格自身材质副本调整白漆与隔热金属，不改共用材质。
 B.root.traverse(o=>{if(!o.isMesh)return;const m=o.material,k=o.userData.materialKey;
  if(k==='porcelain'||k==='airframe'){m.metalness=.12;m.roughness=.48;}
  if(k==='black'){m.metalness=.06;m.roughness=.62;}
  if(k==='hotmetal'){m.metalness=.77;m.roughness=.47;}
 });
 return {...B,update:(a,e)=>offsets(B,e),info,inspection:{stage1Engines:5,stage2Engines:5,stage3Engines:1,interfaces:[4.20,4.75,6.68,7.26,8.47,8.565,9.42,10.00],finAngles:fins}};
}
