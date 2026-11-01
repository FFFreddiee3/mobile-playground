import * as T from '#three';
// 仅合并属性逐位相同的顶点，保留法线硬边和 UV 接缝，不改变轮廓和三角形。
export function indexExactGeometry(source){
 if(source.index)return source;
 const names=Object.keys(source.attributes),attributes=names.map(k=>source.attributes[k]);
 const data=attributes.map(()=>[]),indices=[],seen=new Map();
 for(let i=0;i<source.attributes.position.count;i++){
  let key='';for(const a of attributes)for(let k=0;k<a.itemSize;k++)key+=a.array[i*a.itemSize+k]+',';
  let index=seen.get(key);
  if(index===undefined){index=seen.size;seen.set(key,index);attributes.forEach((a,j)=>{for(let k=0;k<a.itemSize;k++)data[j].push(a.array[i*a.itemSize+k]);});}
  indices.push(index);
 }
 const result=new T.BufferGeometry();attributes.forEach((a,i)=>result.setAttribute(names[i],new T.BufferAttribute(new a.array.constructor(data[i]),a.itemSize,a.normalized)));
 result.setIndex(indices);result.userData={...source.userData};return result;
}

// 首轮合并已为每件几何生成展开向量。这里只合并明确声明内部不再独立运动的总成，保留这些向量。
function mergeFixedAssemblies(model,removed,oldGeos,oldMats,newCuts,finishGeo){
 const roots=model.fixedAssemblies||[],rootSet=new Set(roots),cutSet=new Set([...model.cuts,...newCuts]),meta={textures:{},images:{}},materialKeys=new Map();
 const materialKey=m=>{if(!materialKeys.has(m)){const json=m.toJSON(meta);delete json.uuid;delete json.metadata;delete json.name;materialKeys.set(m,JSON.stringify(json));}return materialKeys.get(m);};
 for(const root of roots){
  if(!root.isGroup||!root.userData.part)throw new Error('固定总成必须属于一个可选部件。');for(let p=root.parent;p;p=p.parent)if(rootSet.has(p))throw new Error('固定总成不能相互嵌套。');
  const batches=new Map();root.traverse(o=>{
   if(o!==root&&!o.visible)throw new Error('固定总成内不能包含独立隐藏节点。');if(!o.isMesh)return;
   if(o.userData.part!==root.userData.part||o.isSkinnedMesh||o.isInstancedMesh||o.userData.dynamic||o.userData.effect||Array.isArray(o.material))throw new Error('固定总成不能跨部件或包含独立运动网格。');
   const g=o.geometry;if(!g.morphTargetsRelative||g.morphAttributes.position?.length!==1||Object.keys(g.attributes).sort().join(',')!=='normal,position,uv')throw new Error('固定总成需要完整位置、法线、UV和相对展开向量。');
   const chain=[];for(let p=o;p!==root;p=p.parent)chain.push(p);const matrix=new T.Matrix4();for(let i=chain.length-1;i>=0;i--){if(chain[i].matrixAutoUpdate)chain[i].updateMatrix();matrix.multiply(chain[i].matrix);}if(matrix.determinant()<=0)throw new Error('固定总成的局部变换必须保持朝向且可逆。');
   const key=JSON.stringify([o.userData.materialKey,materialKey(o.material),cutSet.has(o),o.castShadow,o.receiveShadow,o.renderOrder,o.layers.mask,o.frustumCulled,o.material.transparent||o.material.onBeforeCompile!==T.Material.prototype.onBeforeCompile?o.uuid:'']);
   if(!batches.has(key))batches.set(key,[]);batches.get(key).push({mesh:o,matrix});
  });
  for(const entries of batches.values()){
   if(entries.length<2)continue;
   const position=[],normal=[],uv=[],delta=[],index=[],detail=new T.Box3(),v=new T.Vector3(),d=new T.Vector3(),n=new T.Vector3();let offset=0;
   for(const {mesh,matrix}of entries){const g=mesh.geometry,p=g.attributes.position,no=g.attributes.normal,u=g.attributes.uv,de=g.morphAttributes.position[0],linear=new T.Matrix3().setFromMatrix4(matrix),normalMatrix=new T.Matrix3().getNormalMatrix(matrix);
    for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(matrix);d.fromBufferAttribute(de,i).applyMatrix3(linear);n.fromBufferAttribute(no,i).applyNormalMatrix(normalMatrix);position.push(v.x,v.y,v.z);delta.push(d.x,d.y,d.z);normal.push(n.x,n.y,n.z);uv.push(u.getX(i),u.getY(i));detail.expandByPoint(v.set(Math.fround(v.x)+Math.fround(d.x),Math.fround(v.y)+Math.fround(d.y),Math.fround(v.z)+Math.fround(d.z)));}
    for(let i=0;i<(g.index?.count||p.count);i++)index.push(offset+(g.index?g.index.getX(i):i));offset+=p.count;
    mesh.removeFromParent();removed.add(mesh);oldGeos.add(g);oldMats.add(mesh.material);
   }
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(position,3));g.setAttribute('normal',new T.Float32BufferAttribute(normal,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(index);finishGeo(g,delta,detail);
   const first=entries[0].mesh,mesh=new T.Mesh(g,first.material.clone());mesh.name='fixed-assembly-batch';mesh.userData={...first.userData};mesh.castShadow=first.castShadow;mesh.receiveShadow=first.receiveShadow;mesh.renderOrder=first.renderOrder;mesh.layers.mask=first.layers.mask;mesh.frustumCulled=first.frustumCulled;mesh.updateMatrix();mesh.matrixAutoUpdate=false;root.add(mesh);model.pickable.push(mesh);model.detailMeshes.push(mesh);if(cutSet.has(first))newCuts.push(mesh);
  }
 }
}

// 合并绘制时保留每个原始网格及实例的展开位移，由 GPU 插值，无须增加逐帧绘制调用。
export function optimizeModel(model){
 const cutSet=new Set(model.cuts),parents=[];model.root.traverse(o=>{if(o.isGroup||o.isBone)parents.push(o);});let before=0,after=0,pieceCount=0;model.root.traverse(o=>{if(o.isMesh&&!o.userData.effect)before++;});
 const indexed=new Map();model.root.traverse(o=>{if(o.isMesh&&!o.userData.effect&&!o.geometry.index){const old=o.geometry;if(!indexed.has(old))indexed.set(old,indexExactGeometry(old));o.geometry=indexed.get(old);}});indexed.forEach((_,g)=>g.dispose());
 const oldGeos=new Set(),oldMats=new Set(),removed=new Set(),newCuts=[];model.detailMeshes=[];
 const box=new T.Box3(),parentBox=new T.Box3(),partCenter=new T.Vector3(),pieceCenter=new T.Vector3(),dir=new T.Vector3(),matrix=new T.Matrix4(),inst=new T.Matrix4(),normal=new T.Matrix3(),v=new T.Vector3(),n=new T.Vector3();
 function offsetFor(g,m,i){if(!g.boundingBox)g.computeBoundingBox();g.boundingBox.getCenter(pieceCenter).applyMatrix4(m);dir.copy(pieceCenter).sub(partCenter);if(dir.length()<.04)dir.set(Math.cos(i*2.399),.4*Math.sin(i*1.43),Math.sin(i*2.399));dir.normalize().multiplyScalar(.65+.16*Math.sin(i*2.17));return dir;}
 function finishGeo(g,delta,detail){g.userData.baseBounds=new T.Box3().setFromBufferAttribute(g.attributes.position);g.userData.detailBounds=detail;g.morphAttributes.position=[new T.Float32BufferAttribute(delta,3)];g.morphTargetsRelative=true;g.computeBoundingBox();g.computeBoundingSphere();}
 for(const parent of parents){parentBox.makeEmpty();for(const m of parent.children){if(!m.isMesh||m.userData.effect)continue;m.updateMatrix();if(!m.geometry.boundingBox)m.geometry.computeBoundingBox();if(m.isInstancedMesh){for(let k=0;k<m.count;k++){m.getMatrixAt(k,inst);matrix.multiplyMatrices(m.matrix,inst);parentBox.union(box.copy(m.geometry.boundingBox).applyMatrix4(matrix));}}else parentBox.union(box.copy(m.geometry.boundingBox).applyMatrix4(m.matrix));}if(parentBox.isEmpty())continue;parentBox.getCenter(partCenter);
  const batches=new Map();for(const m of [...parent.children]){if(!m.isMesh||m.userData.effect||!m.userData.materialKey)continue;if(m.userData.dynamic){const g=m.geometry.clone(),delta=[],detail=new T.Box3();offsetFor(g,m.matrix,pieceCount++);dir.transformDirection(m.matrix.clone().invert()).multiplyScalar(.75);const p=g.attributes.position;for(let i=0;i<p.count;i++){delta.push(dir.x,dir.y,dir.z);v.fromBufferAttribute(p,i).add(dir);detail.expandByPoint(v);}oldGeos.add(m.geometry);m.geometry=g;finishGeo(g,delta,detail);m.updateMorphTargets();model.detailMeshes.push(m);continue;}const k=m.userData.materialKey+':'+cutSet.has(m);if(!batches.has(k))batches.set(k,[]);batches.get(k).push(m);}
  for(const meshes of batches.values()){const positions=[],normals=[],uvs=[],indices=[],delta=[],detail=new T.Box3();let offset=0;
   for(const m of meshes){m.updateMatrix();const g=m.geometry,p=g.attributes.position,no=g.attributes.normal,uv=g.attributes.uv;for(let k=0;k<(m.isInstancedMesh?m.count:1);k++){matrix.copy(m.matrix);if(m.isInstancedMesh){m.getMatrixAt(k,inst);matrix.multiply(inst);}normal.getNormalMatrix(matrix);offsetFor(g,matrix,pieceCount++);for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(matrix);positions.push(v.x,v.y,v.z);delta.push(dir.x,dir.y,dir.z);detail.expandByPoint(v.add(dir));if(no)n.fromBufferAttribute(no,i).applyMatrix3(normal).normalize();else n.set(0,1,0);normals.push(n.x,n.y,n.z);uvs.push(uv?uv.getX(i):0,uv?uv.getY(i):0);}if(g.index){for(let i=0;i<g.index.count;i++)indices.push(offset+g.index.getX(i));}else for(let i=0;i<p.count;i++)indices.push(offset+i);offset+=p.count;}parent.remove(m);removed.add(m);oldGeos.add(g);oldMats.add(m.material);}
   const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geo.setIndex(indices);finishGeo(geo,delta,detail);const first=meshes[0],merged=new T.Mesh(geo,first.material.clone());merged.userData={...first.userData};merged.castShadow=true;merged.receiveShadow=true;merged.updateMatrix();merged.matrixAutoUpdate=false;parent.add(merged);model.pickable.push(merged);model.detailMeshes.push(merged);if(cutSet.has(first))newCuts.push(merged);
  }
 }
 mergeFixedAssemblies(model,removed,oldGeos,oldMats,newCuts,finishGeo);
 // 每块履带板仍由独立刚性骨骼驱动，同侧只提交一次绘制。保留原有逐零件形变位移。
 model.root.updateMatrixWorld(true);
 for(const batch of model.rigidBatches||[]){
  const {parent,bones,half,r,z}=batch,positions=[],normals=[],uvs=[],indices=[],delta=[],skinIndex=[],skinWeight=[];
  let offset=0;const radial=[0,0],zMin=[Infinity,Infinity],zMax=[-Infinity,-Infinity],linear=new T.Matrix3(),d=new T.Vector3(),endpoint=new T.Vector3();
  const sources=bones.map(b=>{const meshes=b.children.filter(o=>o.isMesh);if(meshes.length!==1)throw new Error('履带板合并后必须保留一个完整网格。');return meshes[0];});
  for(const [j,m]of sources.entries()){
   const g=m.geometry,p=g.attributes.position,no=g.attributes.normal,uv=g.attributes.uv,de=g.morphAttributes.position[0];
   matrix.multiplyMatrices(bones[j].matrix,m.matrix);normal.getNormalMatrix(matrix);linear.setFromMatrix4(matrix);
   for(let i=0;i<p.count;i++){
    v.fromBufferAttribute(p,i);d.fromBufferAttribute(de,i);
    for(const t of [0,1]){endpoint.copy(v).addScaledVector(d,t);radial[t]=Math.max(radial[t],Math.hypot(endpoint.x,endpoint.y));zMin[t]=Math.min(zMin[t],endpoint.z);zMax[t]=Math.max(zMax[t],endpoint.z);}
    v.applyMatrix4(matrix);n.fromBufferAttribute(no,i).applyMatrix3(normal).normalize();d.applyMatrix3(linear);
    positions.push(v.x,v.y,v.z);normals.push(n.x,n.y,n.z);uvs.push(uv.getX(i),uv.getY(i));delta.push(d.x,d.y,d.z);skinIndex.push(j,0,0,0);skinWeight.push(1,0,0,0);
   }
   for(let i=0;i<g.index.count;i++)indices.push(offset+g.index.getX(i));offset+=p.count;
   bones[j].remove(m);removed.add(m);oldGeos.add(g);oldMats.add(m.material);
  }
  // 顶点和形变存储为Float32，骨骼运算使用双精度。只为裁剪边界保留四个Float32舍入单位。
  const bounds=t=>{const padding=Math.max(1,half+r+radial[t],Math.abs(z)+Math.max(Math.abs(zMin[t]),Math.abs(zMax[t])))*4*2**-23;return new T.Box3(new T.Vector3(-half-r-radial[t],.08-radial[t],z+zMin[t]),new T.Vector3(half+r+radial[t],2*r+.08+radial[t],z+zMax[t])).expandByScalar(padding);};
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geo.setAttribute('skinIndex',new T.Uint16BufferAttribute(skinIndex,4));geo.setAttribute('skinWeight',new T.Float32BufferAttribute(skinWeight,4));geo.setIndex(indices);finishGeo(geo,delta,bounds(1));geo.userData.baseBounds=bounds(0);
  const mesh=new T.SkinnedMesh(geo,sources[0].material.clone());mesh.name='track-batch';mesh.userData={...sources[0].userData};mesh.castShadow=mesh.receiveShadow=true;mesh.updateMatrix();mesh.matrixAutoUpdate=false;parent.add(mesh);model.root.updateMatrixWorld(true);mesh.bind(new T.Skeleton(bones));
  mesh.boundingBox=bounds(0).union(bounds(1));mesh.boundingSphere=mesh.boundingBox.getBoundingSphere(new T.Sphere());batch.mesh=mesh;batch.skeleton=mesh.skeleton;model.pickable.push(mesh);model.detailMeshes.push(mesh);
 }
 model.detailMeshes=model.detailMeshes.filter(m=>!removed.has(m));model.pickable=model.pickable.filter(m=>!removed.has(m));model.cuts=model.cuts.filter(m=>!removed.has(m)).concat(newCuts.filter(m=>!removed.has(m)));const usedGeo=new Set(),usedMat=new Set();model.root.traverse(o=>{if(o.isMesh&&!o.userData.effect){after++;usedGeo.add(o.geometry);usedMat.add(o.material);}});oldGeos.forEach(g=>{if(!usedGeo.has(g))g.dispose();});oldMats.forEach(m=>{if(!usedMat.has(m))m.dispose();});model.releaseBuildCache?.();model.pieceCount=pieceCount;return {before,after,pieceCount};
}
export function setDetailAmount(model,value){for(const m of model.detailMeshes)m.morphTargetInfluences[0]=value;}
// 标注绑定固定局部点。世界包围盒的最高点会随旋转换角，不能用作运动标注。
export function partLabelPosition(part,out){return out.copy(part.labelAnchor).applyMatrix4(part.group.matrixWorld);}
export function cacheLocalBounds(model){
 model.root.updateMatrixWorld(true);const inverse=new T.Matrix4(),relative=new T.Matrix4(),box=new T.Box3();for(const p of model.parts){inverse.copy(p.group.matrixWorld).invert();p.localBounds=new T.Box3();p.detailBounds=new T.Box3();p.group.traverse(o=>{if(!o.geometry||o.userData.effect)return;if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();relative.multiplyMatrices(inverse,o.matrixWorld);box.copy(o.geometry.userData.baseBounds||o.geometry.boundingBox).applyMatrix4(relative);p.localBounds.union(box);box.copy(o.geometry.userData.detailBounds||o.geometry.boundingBox).applyMatrix4(relative);p.detailBounds.union(box);});}
 for(const p of model.parts)p.labelAnchor=p.localBounds.getCenter(new T.Vector3());
}
