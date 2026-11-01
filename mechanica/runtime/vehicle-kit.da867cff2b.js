import * as T from '#three';
import {TAU,bladeGeometry} from '#geometry';
const PI=Math.PI;
// 所有整机共用的构造入口。尺寸在模型局部单位中维护，补全几何不充当制造图。
export function subgroup(parent,pos=[0,0,0]){const g=new T.Group();g.userData.part=parent.userData.part;g.position.set(...pos);parent.add(g);return g;}
export function place(B,id,pos){const p=B.parts.find(p=>p.id===id);p.base.set(...pos);p.group.position.copy(p.base);return p.group;}
export function offsets(B,e){for(const p of B.parts){p.group.position.copy(p.base).addScaledVector(p.offset,e);p.group.rotation.set(0,0,0);}}
export function loft(B,g,sections,mat,start=0,sweep=TAU){
 const pos=[],uv=[],indices=[],n=48;
 for(let j=0;j<sections.length;j++){const [x,ry,rz,cy=0]=sections[j];for(let i=0;i<=n;i++){const a=start+sweep*i/n;pos.push(x,cy+ry*Math.cos(a),rz*Math.sin(a));uv.push(j/(sections.length-1),i/n);}}
 for(let j=0;j<sections.length-1;j++)for(let i=0;i<n;i++){const a=j*(n+1)+i,b=a+1,c=a+n+1,d=c+1;indices.push(a,b,c,b,d,c);}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();const m=B.mesh(g,geo,mat);m.material.side=T.DoubleSide;return m;
}
export function panel(B,g,points,depth,mat,pos=[0,0,0],plane='xz'){
 const s=new T.Shape(points.map(p=>new T.Vector2(...p)));const geo=new T.ExtrudeGeometry(s,{depth,bevelEnabled:false,steps:1,curveSegments:8});geo.translate(0,0,-depth/2);if(plane==='xz')geo.rotateX(PI/2);else if(plane==='yz')geo.rotateY(PI/2);return B.mesh(g,geo,mat,pos);
}
export function rod(B,g,a,b,r,mat='chrome'){
 const va=new T.Vector3(...a),vb=new T.Vector3(...b),d=vb.clone().sub(va);const m=B.cylinder(g,r,d.length(),mat,va.add(vb).multiplyScalar(.5).toArray(),'y',r,16);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return m;
}
export function ellipsoid(B,g,radii,pos,mat){const geo=new T.SphereGeometry(1,32,20);geo.scale(...radii);return B.mesh(g,geo,mat,pos);}
export function wheel(B,g,r=.55,width=.28,{spokes:spokeCount=10,centerLock=false}={}){
 const tire=B.lathe(g,[[r*.68,-width*.5],[r*.90,-width*.57],[r*.99,-width*.37],[r,width*.35],[r*.90,width*.57],[r*.68,width*.5]],'rubber',[0,0,0],'z');
 // LatheGeometry在末端轮廓点给出零法线，用末段切线恢复该端的外法线。
 // 统一单位法线，坐标、轮廓和胎面实例保持原值。
 const normals=tire.geometry.attributes.normal,points=tire.geometry.parameters.points,last=points.length-1,a=points[last-1],b=points[last],normal=new T.Vector2(b.y-a.y,a.x-b.x).normalize();
 for(let i=0;i<=64;i++){const index=i*points.length+last;if(normals.getX(index)===0&&normals.getY(index)===0&&normals.getZ(index)===0){const phi=i*TAU/64;normals.setXYZ(index,normal.x*Math.sin(phi),normal.y,normal.x*Math.cos(phi));}}
 const v=new T.Vector3();for(let i=0;i<normals.count;i++){v.fromBufferAttribute(normals,i).normalize();normals.setXYZ(i,v.x,v.y,v.z);}
 for(const z of [-width*.53,width*.53]){B.tube(g,r*.72,r*.61,.035,'chrome',[0,0,z]);B.cylinder(g,r*.18,.06,'dark',[0,0,z],'z');if(centerLock)B.cylinder(g,r*.10,.07,'chrome',[0,0,z*1.09],'z',r*.10,6);else B.bolts(g,Array.from({length:5},(_,i)=>{const a=i*TAU/5;return [r*.20*Math.cos(a),r*.20*Math.sin(a),z*1.09];}),'z',r*.035);}
 const spokes=[],tread=[];for(let i=0;i<spokeCount;i++){const a=i*TAU/spokeCount;spokes.push({p:[r*.40*Math.cos(a),r*.40*Math.sin(a),0],r:[0,0,a-PI/2]});}
 B.instances(g,new T.BoxGeometry(r*(centerLock?.16:.08),r*.55,width*.7),'alloy',spokes);
 for(let i=0;i<48;i++){const a=i*TAU/48;for(const z of [-width*.25,width*.25])tread.push({p:[r*1.001*Math.cos(a),r*1.001*Math.sin(a),z],r:[0,0,a]});}
 B.instances(g,new T.BoxGeometry(r*.012,r*.09,width*.24),'black',tread);
 B.tube(g,r*.54,r*.22,.025,'steel',[0,0,width*.22]);
}
export function frameRing(B,g,x,ry,rz,cy=0,mat='alloy'){
 const m=B.torus(g,1,.014,mat,[x,cy,0],'x');m.scale.set(rz,ry,1);return m;
}
export function fanEngine(B,g,r=.45,length=1.8){
 const outer=B.tube(g,r,r*.89,length,'airframe',[0,0,0],'x',PI/2,PI);B.cut(B.tube(g,r,r*.89,length,'airframe',[0,0,0],'x',-PI/2,PI));
 B.torus(g,r*.94,r*.07,'chrome',[-length*.5,0,0],'x');B.tube(g,r*.75,r*.62,length*.45,'hotmetal',[length*.45,0,0],'x');
 const rotor=subgroup(g,[-length*.45,0,0]),blade=bladeGeometry(r*.2,r*.84,r*.25,.7);blade.rotateY(PI/2);
 B.instances(rotor,blade,'titanium',Array.from({length:20},(_,i)=>({p:[0,0,0],r:[i*TAU/20,0,0]})));B.cylinder(rotor,r*.20,.3,'dark',[0,0,0],'x',r*.05);
 for(let j=0;j<3;j++){B.cylinder(g,r*.28,.1,'steel',[-length*.2+j*length*.23,0,0],'x');B.tube(g,r*.65,r*.6,.08,'bronze',[-length*.2+j*length*.23,0,0],'x');}
 for(let i=0;i<8;i++){const a=i*TAU/8;rod(B,g,[length*.20,r*.7*Math.cos(a),r*.7*Math.sin(a)],[length*.46,r*.9*Math.cos(a),r*.9*Math.sin(a)],.012,'bronze');}
 return {rotor,outer};
}
export function propeller(B,g,r,n=4){
 B.cylinder(g,r*.18,.25,'chrome',[0,0,0],'x',r*.04);const blade=bladeGeometry(r*.14,r,r*.22,.55);blade.rotateY(PI/2);
 B.instances(g,blade,'black',Array.from({length:n},(_,i)=>({p:[0,0,0],r:[i*TAU/n,0,0]})));
 for(let i=0;i<n;i++){const a=i*TAU/n;const t=panel(B,g,[[-.06,r*.87],[.04,r*.87],[.03,r],[-.04,r]],.015,'ceramic',[0,0,0],'xy');t.rotation.set(a,PI/2,0);}
}
