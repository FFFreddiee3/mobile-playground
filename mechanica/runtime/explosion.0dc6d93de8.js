import * as T from '#three';
import {transitionProgress as ease} from '#animation';
import {setDetailAmount} from '#optimize';
const TAU=Math.PI*2;
export const BLAST_MOVEMENT_SECONDS=1.9,BLAST_EFFECT_SECONDS=3.1,RESTORE_SECONDS=1.15;
export function blastMotionTime(seconds){const u=Math.max(0,Math.min(1,seconds/BLAST_MOVEMENT_SECONDS));return BLAST_MOVEMENT_SECONDS*(1-(1-u)**3);}
const seed=i=>{const n=Math.sin(i*127.1+31.7)*43758.5453;return n-Math.floor(n);};
// 独立爆炸镜头。原机械网格飞散，粒子只负责火光、火星与烟雾。
export class ExplosionEffect {
 constructor(scene){
  this.root=new T.Group();this.root.visible=false;scene.add(this.root);this.state='';this.time=0;this.detail=0;
  this.fire=this.particles(400,false);this.smoke=this.particles(90,true);this.root.add(this.fire,this.smoke);
  this.ring=new T.Mesh(new T.TorusGeometry(1,.025,6,96),new T.MeshBasicMaterial({color:0xffc57b,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending}));this.ring.rotation.x=Math.PI/2;this.root.add(this.ring);
  this.halo=new T.Sprite(new T.SpriteMaterial({map:this.glowTexture(),color:0xffffff,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));this.root.add(this.halo);
  this.spin=new T.Quaternion();this.temp=new T.Vector3();this.travel=new T.Vector3();
  this.contactMatrix=new T.Matrix4();this.contactInverse=new T.Matrix4();this.contactBox=new T.Box3();this.bounds=new T.Box3();this.pieces=[];
 }
 glowTexture(){const n=64,data=new Uint8Array(n*n*4);for(let y=0;y<n;y++)for(let x=0;x<n;x++){const r=Math.hypot((x+.5)/n*2-1,(y+.5)/n*2-1),i=(y*n+x)*4;data[i]=255;data[i+1]=Math.round(245-205*Math.min(1,r));data[i+2]=Math.round(185*Math.max(0,1-r*1.8));data[i+3]=Math.round(255*Math.exp(-r*r*8)*Math.max(0,1-r));}const texture=new T.DataTexture(data,n,n);texture.magFilter=texture.minFilter=T.LinearFilter;texture.needsUpdate=true;return texture;}
 particles(count,smoke){
  const pos=[],random=[];for(let i=0;i<count;i++){const z=seed(i*3)*2-1,a=seed(i*3+1)*TAU,r=Math.sqrt(1-z*z);pos.push(r*Math.cos(a),z,r*Math.sin(a));random.push(seed(i+1000),seed(i+2000),seed(i+3000));}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('random',new T.Float32BufferAttribute(random,3));
  const m=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:smoke?T.NormalBlending:T.AdditiveBlending,uniforms:{time:{value:0},smoke:{value:smoke?1:0},pixelRatio:{value:1}},
   vertexShader:`attribute vec3 random;uniform float time;uniform float smoke;uniform float pixelRatio;varying float age;varying float noiseSeed;varying float smokeKind;
   void main(){float t=max(0.,time-random.x*.14);float life=mix(.65+random.z,2.+random.z,smoke);age=t/life;noiseSeed=random.y;smokeKind=smoke;float travel=(1.-exp(-t*2.4))*(1.2+random.y*2.4);vec3 p=position*travel;p.y+=mix(-t*t*.9,t*.55,smoke);vec4 mv=modelViewMatrix*vec4(p,1.);float size=mix(mix(3.+random.x*7.,28.+random.x*46.,step(.72,random.z)),18.+t*26.,smoke);gl_PointSize=clamp(size*pixelRatio*30./max(1.,-mv.z),1.,180.);gl_Position=projectionMatrix*mv;}`,
   fragmentShader:`varying float age;varying float noiseSeed;varying float smokeKind;
   void main(){if(age>=1.)discard;vec2 uv=gl_PointCoord-.5;float r=length(uv)*2.;if(r>=1.)discard;float grain=.85+.15*sin(uv.x*25.+noiseSeed*73.)*sin(uv.y*21.+noiseSeed*41.);float alpha=pow(1.-r,2.)*max(0.,1.-age)*grain;vec3 fire=mix(vec3(2.,1.5,.7),vec3(1.,.12,.015),clamp(age*1.7,0.,1.));vec3 color=mix(fire,vec3(.035,.045,.06),smokeKind);gl_FragColor=vec4(color,alpha*mix(1.,.7,smokeKind));
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
   }`});const points=new T.Points(g,m);points.frustumCulled=false;return points;
 }
 get active(){return this.state==='blast'||this.state==='restoring';}
 get present(){return !!this.state;}
 snapshot(model){return model.parts.map(p=>({position:p.group.position.clone(),quaternion:p.group.quaternion.clone(),scale:p.group.scale.clone()}));}
 applyPose(model,poses){model.parts.forEach((p,i)=>{p.group.position.copy(poses[i].position);p.group.quaternion.copy(poses[i].quaternion);p.group.scale.copy(poses[i].scale);});model.root.updateMatrixWorld(true);}
 // 子机构在爆炸时冻结，只缓存相对姿态。普通网格直接复用顶点，履带先取得当前骨骼姿态。
 contactSurfaces(group){
  const surfaces=[],inverse=group.matrixWorld.clone().invert(),a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),instance=new T.Matrix4();
  group.traverseVisible(mesh=>{
   if(!mesh.isMesh||mesh.userData.effect)return;
   const geometry=mesh.geometry,morph=geometry.morphAttributes.position?.[0];let position=geometry.attributes.position,delta=morph;
   if(mesh.isSkinnedMesh){
    const base=new Float64Array(position.count*3),change=new Float64Array(position.count*3),weights=geometry.attributes.skinWeight,indices=geometry.attributes.skinIndex;
    const rigid=mesh.skeleton.bones.map((bone,i)=>new T.Matrix4().copy(mesh.bindMatrixInverse).multiply(bone.matrixWorld).multiply(mesh.skeleton.boneInverses[i]).multiply(mesh.bindMatrix));
    for(let i=0;i<position.count;i++){
     a.fromBufferAttribute(position,i);b.copy(a);if(morph){if(geometry.morphTargetsRelative)b.add(c.fromBufferAttribute(morph,i));else b.fromBufferAttribute(morph,i);}
     if(weights.getX(i)===1&&weights.getY(i)===0&&weights.getZ(i)===0&&weights.getW(i)===0){const matrix=rigid[indices.getX(i)];a.applyMatrix4(matrix);b.applyMatrix4(matrix);}else{mesh.applyBoneTransform(i,a);mesh.applyBoneTransform(i,b);}
     const j=i*3;base[j]=a.x;base[j+1]=a.y;base[j+2]=a.z;change[j]=b.x-a.x;change[j+1]=b.y-a.y;change[j+2]=b.z-a.z;
    }
    position=new T.BufferAttribute(base,3);delta=new T.BufferAttribute(change,3);
   }else if(morph&&!geometry.morphTargetsRelative){const change=[];for(let i=0;i<position.count;i++)change.push(morph.getX(i)-position.getX(i),morph.getY(i)-position.getY(i),morph.getZ(i)-position.getZ(i));delta=new T.Float64BufferAttribute(change,3);}
   const base=mesh.isSkinnedMesh||!geometry.userData.baseBounds?new T.Box3().setFromBufferAttribute(position):geometry.userData.baseBounds;
   let detail=base;if(delta){detail=new T.Box3();for(let i=0;i<position.count;i++)detail.expandByPoint(a.fromBufferAttribute(position,i).add(b.fromBufferAttribute(delta,i)));}
   for(let i=0;i<(mesh.isInstancedMesh?mesh.count:1);i++){const relative=new T.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld);if(mesh.isInstancedMesh){mesh.getMatrixAt(i,instance);relative.multiply(instance);}surfaces.push({position,delta,relative,base,detail});}
  });return surfaces;
 }
 // 先用边界排除离地网格，再检查实际顶点下缘，避免圆筒和弧面因包围盒接地而悬空。
 groundContact(){
  this.bounds.makeEmpty();if(!Number.isFinite(this.floorY))return;
  for(const [i,p]of this.model.parts.entries()){
   const group=p.group,surfaces=this.pieces[i].surfaces;group.updateWorldMatrix(true,false);let minY=this.floorY;
   for(const surface of surfaces){
    const {position,delta,relative,base,detail}=surface,matrix=this.contactMatrix.multiplyMatrices(group.matrixWorld,relative),e=matrix.elements;
    this.contactBox.min.copy(base.min).lerp(detail.min,this.detail);this.contactBox.max.copy(base.max).lerp(detail.max,this.detail);
    const lo=this.contactBox.min,hi=this.contactBox.max,lower=e[13]+e[1]*(e[1]<0?hi.x:lo.x)+e[5]*(e[5]<0?hi.y:lo.y)+e[9]*(e[9]<0?hi.z:lo.z);
    if(lower>=minY)continue;
    for(let j=0;j<position.count;j++){
     const x=position.getX(j)+(delta?this.detail*delta.getX(j):0),y=position.getY(j)+(delta?this.detail*delta.getY(j):0),z=position.getZ(j)+(delta?this.detail*delta.getZ(j):0);
     minY=Math.min(minY,e[1]*x+e[5]*y+e[9]*z+e[13]);
    }
   }
   if(minY<this.floorY){
    const lift=this.floorY-minY;if(group.parent){const e=this.contactInverse.copy(group.parent.matrixWorld).invert().elements;this.temp.set(e[4],e[5],e[6]);}else this.temp.set(0,1,0);
    group.position.addScaledVector(this.temp,lift);group.updateWorldMatrix(false,false);
   }
   for(const {relative,base,detail}of surfaces){this.contactBox.min.copy(base.min).lerp(detail.min,this.detail);this.contactBox.max.copy(base.max).lerp(detail.max,this.detail);this.bounds.union(this.contactBox.applyMatrix4(this.contactMatrix.multiplyMatrices(group.matrixWorld,relative)));}
  }
 }
 start(model,angle,origin,radius,detail=0,floorY){
  const starts=this.snapshot(model);
  if(this.model!==model||!this.present){model.update(angle,0,'structure');this.assembled=this.snapshot(model);this.applyPose(model,starts);}
  this.model=model;this.starts=starts;this.detailStart=detail;this.detail=detail;this.time=0;this.state='blast';this.origin=origin.clone();this.radius=radius;this.floorY=floorY;
  const box=new T.Box3(),inverse=new T.Matrix4();
  this.pieces=model.parts.map((p,i)=>{
   box.copy(p.localBounds).applyMatrix4(p.group.matrixWorld);const center=box.getCenter(new T.Vector3()),local=center.clone().applyMatrix4(inverse.copy(p.group.matrixWorld).invert());
   const direction=center.clone().sub(origin).normalize().add(new T.Vector3(seed(i+50)-.5,.3+seed(i+80)*.4,seed(i+120)-.5)).normalize();
   const axis=new T.Vector3(seed(i+150)-.5,seed(i+180)-.5,seed(i+210)-.5).normalize();
   return {center,local,velocity:direction.multiplyScalar(radius*(1.2+seed(i+240))),axis,spin:(seed(i+270)*2-1)*3.5,surfaces:Number.isFinite(floorY)?this.contactSurfaces(p.group):[]};
  });
  this.root.position.copy(origin);this.root.scale.setScalar(radius*.44);this.root.visible=true;this.update(0);
 }
 restore(){if(!this.present||this.state==='restoring')return;this.restoreStart=this.snapshot(this.model);this.restoreDetail=this.detail;this.time=0;this.state='restoring';this.root.visible=false;}
 cancel(){this.root.visible=false;this.state='';this.model=null;this.pieces=[];this.bounds.makeEmpty();}
 update(dt,pixelRatio=1){
  if(!this.active)return false;const previousTime=this.time;this.time+=dt;this.geometryChanged=false;
  if(this.state==='restoring'){
   this.geometryChanged=true;const t=Math.min(1,this.time/RESTORE_SECONDS),u=ease(t);this.model.parts.forEach((p,i)=>{const a=this.restoreStart[i],b=this.assembled[i];p.group.position.lerpVectors(a.position,b.position,u);p.group.quaternion.slerpQuaternions(a.quaternion,b.quaternion,u);p.group.scale.lerpVectors(a.scale,b.scale,u);});
   this.detail=this.restoreDetail*(1-u);setDetailAmount(this.model,this.detail);
   if(t===1){this.applyPose(this.model,this.assembled);setDetailAmount(this.model,0);this.detail=0;this.state='';this.pieces=[];this.bounds.makeEmpty();}
   else this.groundContact();
  }else{
   if(previousTime<=BLAST_MOVEMENT_SECONDS){
   this.geometryChanged=true;const t=blastMotionTime(this.time),travel=(1-Math.exp(-1.9*t))/1.9;
   this.model.parts.forEach((p,i)=>{const a=this.starts[i],piece=this.pieces[i];this.spin.setFromAxisAngle(piece.axis,piece.spin*t);p.group.quaternion.copy(a.quaternion).premultiply(this.spin);this.temp.copy(piece.local).multiply(a.scale).applyQuaternion(p.group.quaternion);p.group.position.copy(piece.center).addScaledVector(piece.velocity,travel);p.group.position.y-=this.radius*.16*t*t;p.group.position.sub(this.temp);});
   this.detail=this.detailStart+(1-this.detailStart)*Math.min(1,this.time/.28);setDetailAmount(this.model,this.detail);this.groundContact();
   }
   this.fire.material.uniforms.time.value=this.smoke.material.uniforms.time.value=this.time;this.fire.material.uniforms.pixelRatio.value=this.smoke.material.uniforms.pixelRatio.value=pixelRatio;
   this.ring.scale.setScalar(.1+this.time*6);this.ring.material.opacity=Math.max(0,.9-this.time*2);
   this.halo.scale.setScalar(2.8+Math.min(this.time,.35)*12);this.halo.material.opacity=Math.exp(-this.time*5);
   if(this.time>=BLAST_EFFECT_SECONDS){this.root.visible=false;this.state='spent';}
  }
  if(this.geometryChanged)this.model.root.updateMatrixWorld(true);return true;
 }
}
