import * as T from '#three';
import {involuteHalfAngle,GEARBOX} from '#motion';
export const TAU=Math.PI*2;
const CIRCLE_CURVE_SEGMENTS=64;
// 128条弦的内接多边形和Float32坐标舍入补偿，只用于网页网格，不代表加工间隙。
export function circularHoleRadius(radius,extent=1){return (radius+Math.max(1,extent)*2*2**-23)/Math.cos(Math.PI/(CIRCLE_CURVE_SEGMENTS*2));}
// 所有机械共用这些几何构造，部件组是选择与拆解的最小单位。
export function makeBuilder(materials){
 const root=new T.Group(),parts=[],pickable=[],cuts=[],geometryCache=new Map();
 const memo=(key,create)=>{if(!geometryCache.has(key))geometryCache.set(key,create());return geometryCache.get(key);};
 function part(id,name,en,desc,offset=[0,0,0]){const group=new T.Group();group.name=id;group.userData.part=id;root.add(group);const p={id,name,en,desc,offset:new T.Vector3(...offset),group,base:new T.Vector3()};parts.push(p);return group;}
 function mesh(g,geo,mat='steel',pos=[0,0,0],rotation=[0,0,0]){const m=new T.Mesh(geo,materials[mat].clone());m.position.set(...pos);m.rotation.set(...rotation);m.userData.part=g.userData.part;m.userData.materialKey=mat;m.castShadow=true;m.receiveShadow=true;g.add(m);pickable.push(m);return m;}
 function box(g,w,h,d,mat,pos,bevel=.035,holes=[]){const s=new T.Shape();const r=Math.min(bevel,w/3,h/3);s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);
  // 显式线段保持圆孔精度，不提高原有外轮廓曲线的细分。孔壁预留外缘倒角向内的偏移。
  for(const [x,y,radius]of holes){const hole=new T.Path(),extent=Math.max(w,h,d,...pos.map(Math.abs),Math.abs(x)+radius,Math.abs(y)+radius),drawRadius=circularHoleRadius(radius+r*.35,extent);for(let i=0;i<CIRCLE_CURVE_SEGMENTS*2;i++){const a=-i*TAU/(CIRCLE_CURVE_SEGMENTS*2),px=x+drawRadius*Math.cos(a),py=y+drawRadius*Math.sin(a);i?hole.lineTo(px,py):hole.moveTo(px,py);}hole.closePath();s.holes.push(hole);}
  const geo=new T.ExtrudeGeometry(s,{depth:d,bevelEnabled:r>0,bevelSize:r*.35,bevelThickness:r*.35,bevelSegments:2,steps:1,curveSegments:4});geo.translate(0,0,-d/2);return mesh(g,geo,mat,pos);}
 function cylinder(g,r,h,mat,pos=[0,0,0],axis='y',r2=r,segments=48){const rot=axis==='z'?[Math.PI/2,0,0]:axis==='x'?[0,0,-Math.PI/2]:[0,0,0];return mesh(g,memo('cylinder:'+[r,r2,h,segments],()=>new T.CylinderGeometry(r,r2,h,segments)),mat,pos,rot);}
 function tube(g,ro,ri,h,mat,pos=[0,0,0],axis='z',start=0,length=TAU){
  const geo=memo('tube:'+[ro,ri,h,start,length],()=>{const sh=new T.Shape();sh.absarc(0,0,ro,start,start+length,false);if(length<TAU-.001){sh.lineTo(ri*Math.cos(start+length),ri*Math.sin(start+length));sh.absarc(0,0,ri,start+length,start,true);sh.closePath();}else{const hole=new T.Path();hole.absarc(0,0,ri,0,TAU,true);sh.holes.push(hole);}const shapeGeo=new T.ExtrudeGeometry(sh,{depth:h,bevelEnabled:false,curveSegments:CIRCLE_CURVE_SEGMENTS,steps:1});shapeGeo.translate(0,0,-h/2);return shapeGeo;});
  return mesh(g,geo,mat,pos,axis==='y'?[Math.PI/2,0,0]:axis==='x'?[0,Math.PI/2,0]:[0,0,0]);
 }
 function lathe(g,points,mat,pos=[0,0,0],axis='y',start=0,length=TAU){return mesh(g,new T.LatheGeometry(points.map(p=>new T.Vector2(...p)),64,start,length),mat,pos,axis==='z'?[Math.PI/2,0,0]:axis==='x'?[0,0,-Math.PI/2]:[0,0,0]);}
 function torus(g,r,t,mat,pos=[0,0,0],axis='z'){return mesh(g,memo('torus:'+[r,t],()=>new T.TorusGeometry(r,t,10,64)),mat,pos,axis==='y'?[Math.PI/2,0,0]:axis==='x'?[0,Math.PI/2,0]:[0,0,0]);}
 function path(g,points,r,mat){return mesh(g,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),Math.max(24,points.length*5),r,8,false),mat);}
 function instances(g,geo,mat,transforms){const m=new T.InstancedMesh(geo,materials[mat].clone(),transforms.length);const o=new T.Object3D();transforms.forEach((t,i)=>{o.position.set(...t.p);o.rotation.set(...(t.r||[0,0,0]));o.scale.set(...(t.s||[1,1,1]));o.updateMatrix();m.setMatrixAt(i,o.matrix);});m.userData.part=g.userData.part;m.userData.materialKey=mat;m.castShadow=true;m.receiveShadow=true;g.add(m);pickable.push(m);return m;}
 // 螺栓头有倒角和真实六角凹槽，凹槽底与垫圈分开构造。
 function bolts(g,positions,axis='y',size=.075){
  const profile=new T.Shape();for(let i=0;i<6;i++){const a=i*TAU/6;i?profile.lineTo(size*1.5*Math.cos(a),size*1.5*Math.sin(a)):profile.moveTo(size*1.5*Math.cos(a),size*1.5*Math.sin(a));}profile.closePath();
  const socket=new T.Path();for(let i=5;i>=0;i--){const a=i*TAU/6;i===5?socket.moveTo(size*.64*Math.cos(a),size*.64*Math.sin(a)):socket.lineTo(size*.64*Math.cos(a),size*.64*Math.sin(a));}socket.closePath();profile.holes.push(socket);
  const geo=new T.ExtrudeGeometry(profile,{depth:size*.65,bevelEnabled:true,bevelSize:size*.08,bevelThickness:size*.06,bevelSegments:1,steps:1});geo.translate(0,0,-size*.25);
  const rot=axis==='y'?[-Math.PI/2,0,0]:axis==='x'?[0,Math.PI/2,0]:[0,0,0];
  const transforms=positions.map(p=>({p,r:rot}));
  const heads=instances(g,geo,'steel',transforms);
  const floors=instances(g,new T.CylinderGeometry(size*.68,size*.68,size*.08,6).rotateX(Math.PI/2).translate(0,0,-size*.24),'dark',transforms);
  const washers=instances(g,new T.TorusGeometry(size*1.45,size*.18,6,20).translate(0,0,-size*.3),'chrome',transforms);
  return [heads,floors,washers];
 }
 function bearing(g,r,pos=[0,0,0],axis='z',bore=r*.39){
  // 内圈内径由配合轴单独指定，原展示截面按剩余径向空间调整，不代表标准型号或加工公差。
  const radial=u=>bore+(r-bore)*(u-.39)/.61,section=(r-bore)/.61;
  const holeRadius=radius=>circularHoleRadius(radius,Math.max(r,...pos.map(Math.abs)));
  tube(g,r,holeRadius(radial(.82)),.22,'chrome',pos,axis);tube(g,radial(.59),holeRadius(bore),.24,'chrome',pos,axis);
  const map=(x,y,z)=>{const p=axis==='x'?[z,y,x]:axis==='y'?[x,z,y]:[x,y,z];return p.map((v,j)=>v+pos[j]);};
  const balls=[],cage=[];for(let i=0;i<12;i++){const a=i*TAU/12;balls.push({p:map(radial(.705)*Math.cos(a),radial(.705)*Math.sin(a),0)});const b=a+TAU/24;cage.push({p:map(radial(.705)*Math.cos(b),radial(.705)*Math.sin(b),0),r:axis==='x'?[0,Math.PI/2,0]:axis==='y'?[Math.PI/2,0,0]:[0,0,0]});}
  instances(g,new T.SphereGeometry(section*.115,12,8),'steel',balls);
  // 保持架销径按相邻滚珠中心距减去滚珠半径取值，销与两侧滚珠贴合，保持架经滚珠连到内外圈。
  const pin=2*radial(.705)*Math.sin(TAU/48)-section*.115+.001;
  instances(g,new T.CylinderGeometry(pin,pin,.19,8).rotateX(Math.PI/2),'bronze',cage);
  for(const z of [-.095,.095]){tube(g,radial(.77),radial(.65),.022,'bronze',map(0,0,z),axis);torus(g,radial(.91),.012,'dark',map(0,0,z*1.22),axis);}
 }
 function spring(g,r,h,pos,mat='steel'){
  const pts=[];for(let i=0;i<=140;i++){const a=i/140*TAU*7;pts.push(new T.Vector3(pos[0]+r*Math.cos(a),pos[1]+h*i/140,pos[2]+r*Math.sin(a)));}
  const geo=new T.TubeGeometry(new T.CatmullRomCurve3(pts),168,.027,8,false),p=Array.from(geo.attributes.position.array),normals=Array.from(geo.attributes.normal.array),uv=Array.from(geo.attributes.uv.array),index=Array.from(geo.index.array),point=new T.Vector3(),a=new T.Vector3(),b=new T.Vector3(),normal=new T.Vector3();
  // 线材端头使用独立顶点与平面法线封口，原有螺旋路径及侧面法线保持不变。
  for(const end of [0,168]){const center=pts[end?140:0],target=geo.tangents[end].clone().multiplyScalar(end?1:-1),base=p.length/3;p.push(center.x,center.y,center.z);normals.push(target.x,target.y,target.z);uv.push(.5,.5);
   for(let i=0;i<8;i++){point.fromBufferAttribute(geo.attributes.position,end*9+i);p.push(point.x,point.y,point.z);normals.push(target.x,target.y,target.z);const t=i*TAU/8;uv.push(.5+.5*Math.cos(t),.5+.5*Math.sin(t));}
   a.fromBufferAttribute(geo.attributes.position,end*9).sub(center);b.fromBufferAttribute(geo.attributes.position,end*9+1).sub(center);const forward=normal.crossVectors(a,b).dot(target)>0;
   for(let i=0;i<8;i++){const left=base+1+i,right=base+1+(i+1)%8;forward?index.push(base,left,right):index.push(base,right,left);}
  }
  geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(index);
  return mesh(g,geo,mat);
 }
 // 同一构造用于轴、轮毂与接头的齿槽，保持每一条可随零件展开。
 function splines(g,r,length,n=24,pos=[0,0,0],axis='z',mat='steel'){
  const geo=new T.BoxGeometry(.045,.065,length),tr=[];
  for(let i=0;i<n;i++){const a=i*TAU/n,local=new T.Matrix4().makeRotationZ(a);local.setPosition(r*Math.cos(a),r*Math.sin(a),0);const orient=new T.Matrix4().makeRotationY(axis==='x'?Math.PI/2:0);if(axis==='y')orient.makeRotationX(Math.PI/2);local.premultiply(orient);const p=new T.Vector3(),q=new T.Quaternion(),sc=new T.Vector3();local.decompose(p,q,sc);p.add(new T.Vector3(...pos));const e=new T.Euler().setFromQuaternion(q);tr.push({p:p.toArray(),r:[e.x,e.y,e.z]});}
  return instances(g,geo,mat,tr);
 }
 function cut(mesh){cuts.push(mesh);return mesh;}
 function disposal(after){if(after){after.then(()=>disposal(),()=>disposal());return;}const geos=new Set(),mats=new Set(),skeletons=new Set();root.traverse(o=>{if(o.geometry)geos.add(o.geometry);if(o.skeleton)skeletons.add(o.skeleton);if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>mats.add(m));}});geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());skeletons.forEach(s=>s.dispose());}
 return {root,parts,pickable,cuts,part,mesh,box,cylinder,tube,lathe,torus,path,instances,bolts,bearing,spring,splines,cut,disposal,releaseBuildCache:()=>geometryCache.clear()};
}
export function gearGeometry(teeth,module,width,bore,lightening=false){
 const rp=teeth*module/2,rb=rp*Math.cos(GEARBOX.pressureAngle),ra=rp+module,rf=rp-1.25*module;
 const pts=[];for(let k=0;k<teeth;k++){const center=k*TAU/teeth;const bottom=involuteHalfAngle(Math.max(rf,rb),rp,rb,teeth);pts.push(new T.Vector2(rf*Math.cos(center-bottom),rf*Math.sin(center-bottom)));for(let i=0;i<=8;i++){const r=Math.max(rf,rb)+(ra-Math.max(rf,rb))*i/8,a=center-involuteHalfAngle(r,rp,rb,teeth);pts.push(new T.Vector2(r*Math.cos(a),r*Math.sin(a)));}for(let i=8;i>=0;i--){const r=Math.max(rf,rb)+(ra-Math.max(rf,rb))*i/8,a=center+involuteHalfAngle(r,rp,rb,teeth);pts.push(new T.Vector2(r*Math.cos(a),r*Math.sin(a)));}pts.push(new T.Vector2(rf*Math.cos(center+bottom),rf*Math.sin(center+bottom)));const gap=(TAU/teeth-2*bottom);for(let j=1;j<=3;j++){const a=center+bottom+gap*j/3;pts.push(new T.Vector2(rf*Math.cos(a),rf*Math.sin(a)));}}
 const s=new T.Shape(pts),hole=new T.Path();hole.absarc(0,0,bore,0,TAU,true);s.holes.push(hole);
 if(lightening)for(let i=0;i<6;i++){const a=i*TAU/6,h=new T.Path();h.absarc(rp*.58*Math.cos(a),rp*.58*Math.sin(a),rp*.17,0,TAU,true);s.holes.push(h);}
 const geo=new T.ExtrudeGeometry(s,{depth:width,bevelEnabled:true,bevelSegments:2,bevelThickness:.018,bevelSize:.012,curveSegments:16,steps:1});geo.translate(0,0,-width/2);geo.userData={teeth,pitchRadius:rp};return geo;
}
// 扭转叶片由截面沿径向扫掠构成，前后缘都有厚度。
export function bladeGeometry(inner,outer,chord,twist=.6){const verts=[],idx=[];const sections=8,sides=16;for(let j=0;j<=sections;j++){const v=j/sections,r=inner+(outer-inner)*v,w=chord*(1-.32*v),rot=twist*(v-.35);for(let i=0;i<sides;i++){const t=TAU*i/sides;const u=Math.cos(t)*w/2,z=Math.sin(t)*w*.07+.08*w*(1-Math.cos(t)**2);verts.push(u*Math.cos(rot)-z*Math.sin(rot)+v*v*.12,r,u*Math.sin(rot)+z*Math.cos(rot));}}for(let j=0;j<sections;j++)for(let i=0;i<sides;i++){const a=j*sides+i,b=j*sides+(i+1)%sides,c=a+sides,d=b+sides;idx.push(a,b,c,b,d,c);}for(let i=1;i<sides-1;i++){idx.push(0,i+1,i);const s=sections*sides;idx.push(s,s+i,s+i+1);}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.setIndex(idx);geo.computeVertexNormals();return geo;}
// 把带真实通孔的平面薄板弯成圆筒，孔壁也保留厚度。
export function perforatedTubeGeometry(outer,inner,length,start,sweep){
 const radius=(outer+inner)/2,width=radius*sweep,s=new T.Shape();s.moveTo(0,-length/2);s.lineTo(width,-length/2);s.lineTo(width,length/2);s.lineTo(0,length/2);s.closePath();
 for(let row=0;row<5;row++)for(let col=0;col<13;col++){const h=new T.Path();h.absarc(width*(col+.65)/13.3,-length/2+.19+row*(length-.38)/4,row%2?.05:.065,0,TAU,true);s.holes.push(h);}
 const geo=new T.ExtrudeGeometry(s,{depth:outer-inner,bevelEnabled:false,curveSegments:8,steps:1});const p=geo.attributes.position;for(let i=0;i<p.count;i++){const angle=start+p.getX(i)/radius,r=inner+p.getZ(i),axis=p.getY(i);p.setXYZ(i,axis,r*Math.cos(angle),r*Math.sin(angle));}geo.computeVertexNormals();return geo;
}
// 大直径风扇的后掠叶片，沿径向同时改变弦长、后掠量和扭转角。
export function fanBladeGeometry(){const pos=[],idx=[],sections=16,sides=20;for(let j=0;j<=sections;j++){const v=j/sections,r=.54+1.76*v,w=.32+.43*Math.sin(v*Math.PI)+.36*v,twist=.65*(1-v)-.15;for(let i=0;i<sides;i++){const t=i*TAU/sides,u=Math.cos(t)*w/2,h=Math.sin(t)*w*.045+.08*w*(1-Math.cos(t)**2);pos.push(u*Math.sin(twist)+h*Math.cos(twist)+v*v*.17,r,u*Math.cos(twist)-h*Math.sin(twist)+v*v*.60);}}for(let j=0;j<sections;j++)for(let i=0;i<sides;i++){const a=j*sides+i,b=j*sides+(i+1)%sides,c=a+sides,d=b+sides;idx.push(a,c,b,b,c,d);}for(let i=1;i<sides-1;i++){idx.push(0,i,i+1);const n=sections*sides;idx.push(n,n+i+1,n+i);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g;}
