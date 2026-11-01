import * as T from '#three';
import {decodeGLB} from '#glb-decode';
// Blender导出的GLB模型：同步解析，按节点名还原部件组与子组，材质名对应网页材质键。
// 节点附加属性：part为部件组，cut为剖切件，instances为实例变换（每16个数为一个列主序矩阵）。
// Blender按网页坐标建模并关闭Y轴向上转换，GLB中的坐标即网页模型坐标。
const COMPONENTS={SCALAR:1,VEC2:2,VEC3:3,VEC4:4},ARRAYS={5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array};
const assets=new Map();
export const hasAsset=key=>assets.has(key);
export function registerAsset(key,buffer){assets.set(key,parseGLB(buffer));}
// 网页按需取模型文件；Node测试在导入时从models目录读入全部模型，buildModel保持同步。
export async function ensureAsset(key,base=new URL('models-c/',globalThis.location?.href)){
 if(assets.has(key))return;const r=await fetch(new URL(key+'.glb',base));if(!r.ok)throw new Error('模型文件加载失败 '+key);registerAsset(key,await decodeGLB(await r.arrayBuffer()));
}
if(typeof process!=='undefined'&&process.versions?.node&&typeof window==='undefined'){
 const {readdir,readFile}=await import('node:fs/promises'),dir=new URL('../models/',import.meta.url);
 for(const f of await readdir(dir).catch(()=>[]))if(f.endsWith('.glb')){const b=await readFile(new URL(f,dir));registerAsset(f.slice(0,-4),b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));}
}
// 按法线主方向做方块投影，坐标单位与网页挤出几何的纹理坐标一致，供铸造与拉丝纹理使用。
function boxUV(g){const p=g.attributes.position,n=g.attributes.normal,uv=new Float32Array(p.count*2);for(let i=0;i<p.count;i++){const x=Math.abs(n.getX(i)),y=Math.abs(n.getY(i)),z=Math.abs(n.getZ(i));if(x>=y&&x>=z){uv[2*i]=p.getY(i);uv[2*i+1]=p.getZ(i);}else if(y>=z){uv[2*i]=p.getX(i);uv[2*i+1]=p.getZ(i);}else{uv[2*i]=p.getX(i);uv[2*i+1]=p.getY(i);}}return new T.BufferAttribute(uv,2);}
export function parseGLB(buffer){
 const view=new DataView(buffer);if(view.getUint32(0,true)!==0x46546c67)throw new Error('不是GLB文件');
 let offset=12,json=null,bin=null;
 while(offset<buffer.byteLength){const len=view.getUint32(offset,true),type=view.getUint32(offset+4,true),start=offset+8;if(type===0x4e4f534a)json=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,start,len)));else if(type===0x004e4942)bin=buffer.slice(start,start+len);offset=start+len;}
 const accessor=i=>{const a=json.accessors[i],bv=json.bufferViews[a.bufferView],Ctor=ARRAYS[a.componentType],n=COMPONENTS[a.type],stride=bv.byteStride,size=Ctor.BYTES_PER_ELEMENT;
  let arr;if(!stride||stride===n*size)arr=new Ctor(bin,(bv.byteOffset||0)+(a.byteOffset||0),a.count*n);else{arr=new Ctor(a.count*n);const v=new DataView(bin);for(let k=0;k<a.count;k++)for(let c=0;c<n;c++){const o=(bv.byteOffset||0)+(a.byteOffset||0)+k*stride+c*size;arr[k*n+c]=size===4?(Ctor===Float32Array?v.getFloat32(o,true):v.getUint32(o,true)):size===2?(Ctor===Int16Array?v.getInt16(o,true):v.getUint16(o,true)):(Ctor===Int8Array?v.getInt8(o):v.getUint8(o));}}
  return {arr,n,normalized:!!a.normalized};};
 const geometries=new Map();
 const geometry=(mi,pi)=>{const key=mi+':'+pi;if(geometries.has(key))return geometries.get(key);const prim=json.meshes[mi].primitives[pi],g=new T.BufferGeometry();
  for(const [name,attr]of [['POSITION','position'],['NORMAL','normal'],['TEXCOORD_0','uv']])if(prim.attributes[name]!==undefined){const {arr,n,normalized}=accessor(prim.attributes[name]);g.setAttribute(attr,new T.BufferAttribute(arr,n,normalized));}
  if(prim.indices!==undefined)g.setIndex(new T.BufferAttribute(accessor(prim.indices).arr,1));if(!g.attributes.normal)g.computeVertexNormals();if(!g.attributes.uv)g.setAttribute('uv',boxUV(g));g.computeBoundingSphere();geometries.set(key,g);return g;};
 return {json,geometry};
}
// 把模型实例化到makeBuilder上。parts按网页部件顺序给出[id,中文名,英文名,说明,展开偏移]，返回按节点名索引的对象。
export function instantiateAsset(B,key,parts,materials){
 const asset=assets.get(key);if(!asset)throw new Error('模型文件未加载 '+key);const {json,geometry}=asset,named=new Map(),groups=new Map();
 for(const [id,name,en,desc,offset]of parts)groups.set(id,B.part(id,name,en,desc,offset));
 const apply=(o,node)=>{if(node.matrix)new T.Matrix4().fromArray(node.matrix).decompose(o.position,o.quaternion,o.scale);else{if(node.translation)o.position.fromArray(node.translation);if(node.rotation)o.quaternion.fromArray(node.rotation);if(node.scale)o.scale.fromArray(node.scale);}};
 const build=(index,parent,part)=>{const node=json.nodes[index],x=node.extras||{};let o;
  if(x.part){o=groups.get(x.part);if(!o)throw new Error('模型部件未登记 '+x.part);part=x.part;}
  else if(node.mesh!==undefined){const prims=json.meshes[node.mesh].primitives;if(prims.length!==1)throw new Error('每个网格只能有一种材质 '+node.name);
   const mat=json.materials[prims[0].material]?.name.replace(/\.\d+$/,'')||'steel';if(!materials[mat])throw new Error('未知材质 '+mat+' '+node.name);const geo=geometry(node.mesh,0);
   if(x.instances){const list=x.instances,count=list.length/16;o=new T.InstancedMesh(geo,materials[mat].clone(),count);const m=new T.Matrix4();for(let i=0;i<count;i++)o.setMatrixAt(i,m.fromArray(list,i*16));o.computeBoundingSphere();}
   else o=new T.Mesh(geo,materials[mat].clone());
   o.userData.part=part;o.userData.materialKey=mat;o.castShadow=o.receiveShadow=true;B.pickable.push(o);if(x.cut)B.cut(o);}
  else{o=new T.Group();o.userData.part=part;}
  o.name=node.name||o.name;apply(o,node);if(!x.part)parent.add(o);named.set(o.name,o);for(const c of node.children||[])build(c,o,part);};
 for(const i of json.scenes[json.scene||0].nodes)build(i,B.root,null);
 for(const [id,g]of groups){if(!g.children.length)throw new Error('模型部件为空 '+id);B.parts.find(p=>p.id===id).base.copy(g.position);}
 return named;
}
