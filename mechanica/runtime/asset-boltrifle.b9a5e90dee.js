import * as T from '#three';
import {makeBuilder} from '#geometry';
import {instantiateAsset} from '#glb';
// 封闭展示模型的几何均来自Blender，不增加内部或活动机构。
const PARTS=[
 [
  "stock",
  "木质枪托与贴腮板",
  "EXTERIOR DISPLAY",
  "圆角木质外形连接后部肩托、贴腮木块与前部护木。",
  [
   -1,
   -0.7,
   -0.3
  ]
 ],
 [
  "butt",
  "托底板与铭牌",
  "EXTERIOR DISPLAY",
  "深色金属后板贴合木质肩托末端。",
  [
   -1.8,
   -0.5,
   0.1
  ]
 ],
 [
  "body",
  "机匣与弹匣外形",
  "EXTERIOR DISPLAY",
  "机匣外壳可剖开观察壁厚与空腔，弹匣只表现外部轮廓，不制作内部机构。",
  [
   0,
   0.8,
   -0.5
  ]
 ],
 [
  "barrel",
  "枪管外形与准星座",
  "EXTERIOR DISPLAY",
  "枪管外形、圆柱形前端和准星护翼按照片补全，没有膛线和弹膛。",
  [
   1.7,
   0.4,
   0
  ]
 ],
 [
  "cap",
  "枪口外缘",
  "EXTERIOR DISPLAY",
  "圆形前缘与浅凹面表现枪口外观，不构成贯穿管道。",
  [
   2.4,
   0.1,
   0.2
  ]
 ],
 [
  "handguard",
  "前后护木",
  "EXTERIOR DISPLAY",
  "下部护木与覆盖长柱上方的木质上护罩组合，前方只露出短段金属外形。",
  [
   1.1,
   -0.4,
   0.8
  ]
 ],
 [
  "scope",
  "镜筒与调节鼓",
  "EXTERIOR DISPLAY",
  "镜筒带外部调节鼓、刻槽、端盖与镜座，不建立内部光学组件。",
  [
   0,
   1.4,
   0.2
  ]
 ],
 [
  "mount",
  "镜座与抱箍",
  "EXTERIOR DISPLAY",
  "两副固定抱箍连接上部外壳与封闭镜筒。",
  [
   0,
   1.1,
   -0.7
  ]
 ],
 [
  "guard",
  "扳机与护圈",
  "EXTERIOR DISPLAY",
  "固定扳机外形位于护圈内，不连接内部击发机构。",
  [
   -0.7,
   -0.9,
   0.6
  ]
 ],
 [
  "handle",
  "拉机柄外形",
  "EXTERIOR DISPLAY",
  "拉机柄球头与弯柄按照片放置，只展示外观，不制作枪机或闭锁结构。",
  [
   -0.4,
   0.4,
   1
  ]
 ],
 [
  "bands",
  "护罩外部箍带",
  "EXTERIOR DISPLAY",
  "深色金属带包住上下木质护罩。",
  [
   0.9,
   0.8,
   -0.7
  ]
 ],
 [
  "sling",
  "背带环与吊环",
  "EXTERIOR DISPLAY",
  "前后小环贴合木质外形底面，为外观展示附件。",
  [
   -0.5,
   -1.1,
   -0.4
  ]
 ],
 [
  "pins",
  "外部紧固件",
  "EXTERIOR DISPLAY",
  "表面螺钉与饰板分开显示。",
  [
   0,
   -0.2,
   1.3
  ]
 ]
];
export const INFO={cutaway:true,basis:'外形依据IWM FIR10707多角度照片，整体长度按112厘米归一化。局部尺寸与剖开后的外壳壁厚、空腔为网页展示补全，不含内部击发、供弹、闭锁机构，不是可用武器设计。'};
export function build(materials,info){
 const B=makeBuilder(materials),named=instantiateAsset(B,'boltrifle',PARTS,materials);
 // 此处仅创建材质纹理，所有几何仍由Blender提供。
 const grain=new Uint8Array(512*256*4);
 for(let y=0;y<256;y++)for(let x=0;x<512;x++){
  const u=x/512,v=y/256,h=Math.sin(x*12.9898+y*78.233)*43758.5453;
  const phase=v*145+3.4*Math.sin(u*5)+.7*Math.sin(u*23+v*9);
  const g=Math.exp(-Math.pow(Math.sin(phase)/.24,2));
  const fine=Math.exp(-Math.pow(Math.sin(v*720+.8*Math.sin(u*13))/.16,2)),noise=h-Math.floor(h);
  const f=.73-.075*g-.022*fine+.02*Math.sin(v*17+u*5)+.025*noise,i=(y*512+x)*4;
  grain[i]=168*f;grain[i+1]=98*f;grain[i+2]=47*f;grain[i+3]=255;
 }
 const woodMap=new T.DataTexture(grain,512,256);woodMap.colorSpace=T.SRGBColorSpace;
 woodMap.wrapS=woodMap.wrapT=T.RepeatWrapping;woodMap.magFilter=T.LinearFilter;woodMap.minFilter=T.LinearMipmapLinearFilter;woodMap.generateMipmaps=true;woodMap.needsUpdate=true;
 const palette={wood:{color:0xffffff,roughness:.44,metalness:.015},dark:{color:0x252e37,roughness:.39,metalness:.72},steel:{color:0x303a42,roughness:.40,metalness:.76},optics:{color:0x344750,roughness:.25,metalness:.35},black:{color:0x171b1d,roughness:.66,metalness:.18},rubber:{color:0x795137,roughness:.82,metalness:0},bronze:{color:0x71614b,roughness:.64,metalness:.52}};
 B.root.traverse(o=>{if(!o.isMesh)return;const f=palette[o.userData.materialKey];if(!f)return;
  Object.assign(o.material,{roughness:f.roughness,metalness:f.metalness});o.material.color.setHex(f.color);o.material.envMapIntensity=.65;
  if(o.userData.materialKey==='wood'){
   o.geometry=o.geometry.clone();const p=o.geometry.attributes.position,n=o.geometry.attributes.normal,uv=new Float32Array(p.count*2);
   for(let i=0;i<p.count;i++){uv[2*i]=p.getX(i)*.5;uv[2*i+1]=(Math.abs(n.getZ(i))>=Math.abs(n.getY(i))?p.getY(i):p.getZ(i))*1.9;}
   o.geometry.setAttribute('uv',new T.BufferAttribute(uv,2));o.material.map=woodMap;o.material.color.multiplyScalar(o.userData.part==='stock'?.73:o.name.includes('upper-cover')?1.18:1.08);
  }
 });
 function update(a,e){for(const p of B.parts){p.group.position.copy(p.base).addScaledVector(p.offset,e);p.group.rotation.y=.16*Math.sin(a*.22);}}
 const dispose=B.disposal;
 return {...B,update,info,disposal(...args){dispose(...args);woodMap.dispose();},inspection:{displayOnly:true,kind:'boltrifle'}};
}
