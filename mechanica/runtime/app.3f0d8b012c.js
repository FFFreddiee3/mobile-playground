import * as T from '#three';
import {buildModel,MODEL_INFO} from '#models';
import {MODEL_CATALOG} from '#catalog';
import {optimizeModel,cacheLocalBounds,setDetailAmount,partLabelPosition} from '#optimize';
import {ExplosionEffect,BLAST_EFFECT_SECONDS,RESTORE_SECONDS} from '#explosion';
import {boundedSpeed,MotionValue,ResolutionGovernor,frameStatistics,bindRenderLifecycle} from '#animation';
import {ShadowFitter} from '#shadow-fit';
import {ensureAsset,hasAsset} from '#glb';
const $=id=>document.getElementById(id),PI=Math.PI;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const state={key:'turbine',explosion:0,target:0,angle:.55,playing:!reduced,speed:1,selected:null,isolated:false,cutaway:true,mode:'motion',azimuth:0,elevation:.3,zoom:1,azTarget:0,elTarget:.3,zoomTarget:1,phase:0,orbit:false,detail:0,detailTarget:0};
const speedMotion=new MotionValue(reduced?0:1,24),detailMotion=new MotionValue(0,8);
let assemblyMotion=[],raf=0,fitDirty=true,fitTarget=false,cameraReady=false,renderLifecycle=null;
const governor=new ResolutionGovernor(Math.min(devicePixelRatio,1.5));
function requestFrame(){if(!raf&&!document.hidden&&(!renderLifecycle||renderLifecycle.ready))raf=requestAnimationFrame(render);}
const stage=$('stage'),canvasWidth=()=>stage.clientWidth;let renderer;
function showLoading(message,retry=false){$('loading').hidden=false;$('loading-message').textContent=message;$('reload-view').hidden=!retry;}
$('reload-view').onclick=()=>location.reload();
try{renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});}catch(error){showLoading('请使用支持三维显示的新版浏览器打开。',true);throw error;}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
const canvas=renderer.domElement;stage.prepend(canvas);canvas.tabIndex=0;canvas.setAttribute('role','img');canvas.setAttribute('aria-label','交互三维机械模型，拖动或使用方向键旋转，通过加减按钮缩放。');
const scene=new T.Scene(),camera=new T.PerspectiveCamera(35,1,.1,200);
// 每帧在标注投影前统一更新世界矩阵，渲染器不再重复更新整棵场景树。
scene.matrixWorldAutoUpdate=false;
let env;
function rebuildEnvironment(){
const studio=new T.Scene();studio.background=new T.Color(.12,.13,.15);
for(const [p,s,c]of [[[0,7,0],[8,.1,7],[3.5,3.3,3.0]],[[-6,3,0],[.1,6,9],[1.8,1.95,2.15]],[[6,1,3],[.1,4,7],[2.3,2.2,2.05]],[[0,1,-7],[8,4,.1],[1.25,1.45,1.65]]]){const m=new T.Mesh(new T.BoxGeometry(...s),new T.MeshBasicMaterial({color:new T.Color(...c)}));m.position.set(...p);studio.add(m);}
const pmrem=new T.PMREMGenerator(renderer);
 try{const next=pmrem.fromScene(studio,.025);scene.environment=next.texture;env?.dispose();env=next;}
 finally{pmrem.dispose();studio.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}
}
rebuildEnvironment();
scene.add(new T.HemisphereLight(0xe3e9ef,0x20252a,1.35));const key=new T.DirectionalLight(0xfff1df,3.2);key.position.set(-4,9,7);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.bias=-.0003;key.shadow.normalBias=.025;scene.add(key,key.target);const shadowFit=new ShadowFitter(key);
const fill=new T.DirectionalLight(0xc8ddf2,1.6);fill.position.set(5,3,-3);scene.add(fill);const rim=new T.DirectionalLight(0xd8e6ff,2.4);rim.position.set(-4,3,-5);scene.add(rim);
function texture(kind){const n=kind==='foil'?128:64,data=new Uint8Array(n*n*4);for(let y=0;y<n;y++)for(let x=0;x<n;x++){const h=Math.sin(x*127.1+y*311.7)*43758.5453,v=kind==='brush'?215+Math.sin(y*5.4)*8+(h-Math.floor(h))*15:kind==='foil'?150+60*Math.abs(Math.sin(x*.31+y*.17+1.7*Math.sin(y*.12)))+20*Math.sin(x*.7-y*.44):210+(h-Math.floor(h))*35,i=(y*n+x)*4;data[i]=data[i+1]=data[i+2]=v;data[i+3]=255;}const t=new T.DataTexture(data,n,n);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(kind==='brush'?2:4,kind==='brush'?12:4);t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());t.needsUpdate=true;return t;}
const brushed=texture('brush'),castTexture=texture('cast'),foilTexture=texture('foil');function material(color,metalness,roughness,finish){const m=new T.MeshStandardMaterial({color,metalness,roughness,envMapIntensity:1.25});if(finish){m.roughnessMap=finish==='cast'?castTexture:finish==='foil'?foilTexture:brushed;m.bumpMap=m.roughnessMap;m.bumpScale=finish==='cast'?.003:finish==='foil'?.025:.0015;}return m;}
const materials={steel:material(0xa8afb4,.95,.38,'brush'),chrome:material(0xc4cbd0,1,.19,'brush'),alloy:material(0xa5bac8,.88,.34,'brush'),cast:material(0x384854,.65,.56,'cast'),paint:material(0x3f5c62,.08,.49,'cast'),gearpaint:material(0x436c77,.08,.51,'cast'),motorpaint:material(0x1b5982,.08,.46,'cast'),redpaint:material(0xae3022,.06,.46,'cast'),orangepaint:material(0xf47729,.06,.46,'cast'),dark:material(0x292e34,.82,.46,'brush'),black:material(0x161a1e,.02,.68),rubber:material(0x101214,0,.86),bronze:material(0xb98b4d,.85,.35,'brush'),copper:material(0xce773d,.92,.32,'brush'),ceramic:material(0xe8e6de,.05,.2),titanium:material(0x8195a8,.95,.27,'brush'),hotmetal:material(0x687388,.9,.4,'brush'),gas:new T.MeshBasicMaterial({color:0x73b1d4,transparent:true,opacity:.16,depthWrite:false,side:T.DoubleSide})};
Object.assign(materials,{scarlet:new T.MeshPhysicalMaterial({color:0xce222b,metalness:.18,roughness:.25,clearcoat:1,clearcoatRoughness:.18,envMapIntensity:1.4}),bluepaint:new T.MeshPhysicalMaterial({color:0x236da2,metalness:.18,roughness:.24,clearcoat:1,envMapIntensity:1.5}),airframe:material(0xcbd3da,.74,.32,'brush'),porcelain:material(0xe4e7e6,.04,.34),navy:material(0x174164,.08,.38),olive:material(0x4d5842,.035,.65),glass:new T.MeshPhysicalMaterial({color:0x1c3c4b,metalness:.65,roughness:.12,clearcoat:1,envMapIntensity:1.65}),screen:new T.MeshStandardMaterial({color:0x112733,emissive:0x1b7a9e,emissiveIntensity:.65,metalness:.3,roughness:.3}),lamp:new T.MeshStandardMaterial({color:0xcaf8ff,emissive:0x72b9cd,emissiveIntensity:1.3,roughness:.2}),flame:new T.MeshBasicMaterial({color:0xffa45a,transparent:true,opacity:.65,depthWrite:false,blending:T.AdditiveBlending})});
Object.assign(materials,{gold:material(0xdab451,1,.20,'brush'),foil:material(0xbcaab3,.90,.30,'foil'),goldfoil:material(0xcda04b,.94,.32,'foil'),solar:new T.MeshPhysicalMaterial({color:0x103a6c,metalness:.72,roughness:.23,clearcoat:1,envMapIntensity:1.5}),optics:new T.MeshPhysicalMaterial({color:0x21465c,metalness:.70,roughness:.10,clearcoat:1,envMapIntensity:1.8}),circuit:material(0x1b5751,.35,.47)});
const grainData=new Uint8Array(128*128*4);for(let y=0;y<128;y++)for(let x=0;x<128;x++){const grain=.55+.18*Math.sin(y*.35+3*Math.sin(x*.025))+.09*Math.sin(y*1.8+x*.03),i=(y*128+x)*4;grainData[i]=70+grain*77;grainData[i+1]=32+grain*40;grainData[i+2]=15+grain*24;grainData[i+3]=255;}
const woodGrain=new T.DataTexture(grainData,128,128);woodGrain.colorSpace=T.SRGBColorSpace;woodGrain.wrapS=woodGrain.wrapT=T.RepeatWrapping;woodGrain.magFilter=T.LinearFilter;woodGrain.minFilter=T.LinearMipmapLinearFilter;woodGrain.generateMipmaps=true;woodGrain.needsUpdate=true;
materials.wood=new T.MeshStandardMaterial({color:0xffffff,map:woodGrain,metalness:.025,roughness:.53,envMapIntensity:.65});materials.sand=material(0x877352,.03,.68,'cast');
const floor=new T.Mesh(new T.PlaneGeometry(160,160),new T.ShadowMaterial({color:0x000000,opacity:.3}));floor.rotation.x=-PI/2;floor.receiveShadow=true;scene.add(floor);const grid=new T.GridHelper(80,100,0x174a62,0x122331);grid.material.transparent=true;grid.material.opacity=.5;scene.add(grid);
const lineGeo=new T.BufferGeometry(),lineData=new Float32Array(128*6);lineGeo.setAttribute('position',new T.BufferAttribute(lineData,3).setUsage(T.DynamicDrawUsage));const lines=new T.LineSegments(lineGeo,new T.LineBasicMaterial({color:0x58dbed,transparent:true,opacity:.3,depthWrite:false}));lines.frustumCulled=false;scene.add(lines);
// 单次绘制的气流线，只表达核心流与外涵流的路径，不参与机械几何或选择。
const flowGeometry=new T.BufferGeometry(),flowPositions=[],flowKinds=[];
for(let i=0;i<180;i++){const a=i*2.399963,seed=(i*.61803398875)%1;for(const t of [0,.022]){flowPositions.push(t,a,seed);flowKinds.push(i%3?1:0);}}
flowGeometry.setAttribute('position',new T.Float32BufferAttribute(flowPositions,3));flowGeometry.setAttribute('kind',new T.Float32BufferAttribute(flowKinds,1));
const flowMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0}},
 vertexShader:`attribute float kind;uniform float time;varying vec3 tint;varying float opacity;
 void main(){float u=fract(position.z+time*.12)+position.x;float core=mix(1.48,.93,smoothstep(.05,.25,u));float bypass=mix(2.08,1.72,smoothstep(.7,1.,u));float r=mix(core,bypass,kind);float a=position.y+.05*sin(u*9.+position.y);vec3 p=vec3(-5.4+9.7*u,r*cos(a),r*sin(a));float heat=(1.-kind)*smoothstep(.46,.6,u);tint=mix(vec3(.16,.7,.92),vec3(1.,.33,.05),heat);opacity=.48*smoothstep(0.,.07,u)*(1.-smoothstep(.91,1.,u));gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
 fragmentShader:`varying vec3 tint;varying float opacity;void main(){gl_FragColor=vec4(tint,opacity);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
const flow=new T.LineSegments(flowGeometry,flowMaterial);flow.frustumCulled=false;flow.visible=false;scene.add(flow);state.flow=true;
const blast=new ExplosionEffect(scene);let pendingAction=null;
let model,partMap,selectedPart,modelDirty=true,boundsDirty=true,viewDirty=true,sceneDirty=true,shadowDirty=true,phaseButtons=[],lastPhase=-1,burstTimer;
const frameBox=new T.Box3(),envelope=new T.Box3(),partBox=new T.Box3(),detailBox=new T.Box3(),center=new T.Vector3(),view=new T.Vector3(),fitView=new T.Vector3(),right=new T.Vector3(),up=new T.Vector3(),corner=new T.Vector3(),labelPos=new T.Vector3(),lineStart=new T.Vector3(),lineEnd=new T.Vector3();let stageW=1,stageH=1,fitDistance=10;const cameraFocus=new T.Vector3(),cameraDistance=new MotionValue(10,28);
const label=$('label'),labelGuide=$('label-guide'),labelLine=$('label-line'),labelDot=$('label-dot');let labelWidth=120,labelVisible=false;
new ResizeObserver(entries=>{labelWidth=entries[0].borderBoxSize?.[0]?.inlineSize||label.offsetWidth;}).observe(label);
function partWorldBox(p,out){out.copy(p.localBounds);if(state.detail>0){detailBox.copy(p.localBounds);detailBox.min.lerp(p.detailBounds.min,state.detail);detailBox.max.lerp(p.detailBounds.max,state.detail);out.union(detailBox);}return out.applyMatrix4(p.group.matrixWorld);}
function updateLabel(){
 partLabelPosition(selectedPart,labelPos).project(camera);
 const x=(labelPos.x*.5+.5)*stageW,y=(-labelPos.y*.5+.5)*stageH;
 const visible=!blast.present&&labelPos.z>-1&&labelPos.z<1&&x>=0&&x<=stageW&&y>=0&&y<=stageH;
 if(visible!==labelVisible){labelVisible=visible;label.style.opacity=labelGuide.style.opacity=visible?'1':'0';}
 if(!visible)return;
 const lx=Math.max(labelWidth/2+10,Math.min(stageW-labelWidth/2-10,x)),ly=Math.max(116,Math.min(stageH-78,y-30));
 label.style.transform=`translate3d(${lx.toFixed(2)}px,${ly.toFixed(2)}px,0) translate(-50%,-100%)`;
 labelLine.setAttribute('d',`M${lx.toFixed(2)},${ly.toFixed(2)} L${x.toFixed(2)},${y.toFixed(2)}`);
 labelDot.setAttribute('cx',x.toFixed(2));labelDot.setAttribute('cy',y.toFixed(2));
}
function refreshBounds(){if(state.isolated)partWorldBox(selectedPart,frameBox);else if(state.explosion<.0001&&state.detail<.0001)frameBox.copy(envelope);else{frameBox.copy(envelope);for(const p of model.parts)frameBox.union(partWorldBox(p,partBox));}frameBox.getCenter(center);floor.position.y=Math.min(envelope.min.y,frameBox.min.y)-.12;grid.position.y=floor.position.y+.006;boundsDirty=false;viewDirty=fitDirty=true;}
function cameraUpdate(dt){
 const a=state.azimuth,e=state.elevation;view.set(Math.sin(a)*Math.cos(e),Math.sin(e),Math.cos(a)*Math.cos(e));
 if(fitDirty){
  // 重置过程按最终方向计算距离，镜头仍沿既有曲线平滑转回。
  const fa=fitTarget?state.azTarget:a,fe=fitTarget?state.elTarget:e;fitView.set(Math.sin(fa)*Math.cos(fe),Math.sin(fe),Math.cos(fa)*Math.cos(fe));
  right.set(Math.cos(fa),0,-Math.sin(fa));up.crossVectors(fitView,right).normalize();const tan=Math.tan(camera.fov*PI/360);let d=0;
  for(let i=0;i<8;i++){corner.set(i&1?frameBox.max.x:frameBox.min.x,i&2?frameBox.max.y:frameBox.min.y,i&4?frameBox.max.z:frameBox.min.z).sub(center);d=Math.max(d,Math.abs(corner.dot(right))/(tan*camera.aspect*.88)+corner.dot(fitView),Math.abs(corner.dot(up))/(tan*.80)+corner.dot(fitView));}
  fitDistance=Math.max(d,3);fitDirty=fitTarget=false;
 }
 cameraDistance.to(fitDistance*state.zoom);
 if(!cameraReady||reduced){cameraFocus.copy(center);cameraDistance.reset(cameraDistance.target);cameraReady=true;}else{cameraFocus.lerp(center,1-Math.exp(-dt*10));cameraDistance.step(dt);}
 camera.position.copy(cameraFocus).addScaledVector(view,cameraDistance.value);camera.lookAt(cameraFocus);camera.updateMatrixWorld();
 viewDirty=cameraDistance.active||cameraFocus.distanceToSquared(center)>1e-8;sceneDirty=true;
}
function appearance(){for(const p of model.parts){p.group.visible=!state.isolated||p.id===state.selected;p.group.traverse(o=>{if(o.material?.emissive){o.material.emissive.setHex(p.id===state.selected?0x155d72:0);o.material.emissiveIntensity=p.id===state.selected?.24:0;}});}for(const m of model.cuts)m.visible=state.isolated||!state.cutaway;$('cutaway').setAttribute('aria-pressed',String(state.cutaway));$('isolate').setAttribute('aria-pressed',String(state.isolated));$('isolate').textContent=state.isolated?'显示全部部件 ↗':'单独查看此部件 ↗';shadowFit.reset();boundsDirty=sceneDirty=shadowDirty=true;}
function selectPart(id){const p=partMap.get(id);if(!p)return;selectedPart=p;state.selected=id;state.isolated=false;$('part-en').textContent=p.en;$('part-title').textContent=p.name;$('part-desc').textContent=p.desc;$('label').textContent=p.name;document.querySelectorAll('[data-part]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.part===id)));appearance();}
function setPlaying(value){if(value&&!state.playing)resetMetrics();state.playing=value;speedMotion.to(value?state.speed:0);if(reduced)speedMotion.reset(value?state.speed:0);$('play').textContent=value?'Ⅱ 暂停':'▶ '+(model?.info.playLabel||'启动机械');$('play').setAttribute('aria-pressed',String(value));modelDirty=sceneDirty=true;}
function updateMode(){$('motion').textContent=model.info.motionLabel||'运行原理';document.querySelector('.cycle').setAttribute('aria-label',model.info.displayOnly?'模型部件说明':'机械运行原理');for(const v of ['structure','motion']){$(v).classList.toggle('active',state.mode===v);$(v).setAttribute('aria-pressed',String(state.mode===v));}$('view-status').textContent=model.info.code+' / '+(blast.present?'爆炸特效':state.mode==='motion'?(model.info.motionStatus||'运行演示'):'结构探索');}
function setMode(value){state.mode=value;if(value==='motion'){setDetail(0);setAssemblySpread(0);state.isolated=false;state.cutaway=model.info.cutaway??true;}else setPlaying(false);updateMode();appearance();}
function setDetail(value){
 state.detailTarget=value;if(reduced)detailMotion.reset(value);else detailMotion.to(value);
 state.detail=detailMotion.value;setDetailAmount(model,state.detail);
 $('detail-expand').setAttribute('aria-pressed',String(value===1));$('detail-expand').setAttribute('aria-busy',String(detailMotion.active));
 boundsDirty=sceneDirty=shadowDirty=true;requestFrame();
}
function setAssemblySpread(value){
 value=Math.max(0,Math.min(1,value));
 if(value>0){state.mode='structure';state.isolated=false;state.cutaway=false;setPlaying(false);updateMode();appearance();}
 state.target=value;assemblyMotion.forEach(v=>{v.frequency=12;if(reduced)v.reset(value);else v.to(value);});
 state.explosion=Math.max(...assemblyMotion.map(v=>v.value));
 $('explosion').value=Math.round(value*100);$('explosion-value').textContent=Math.round(value*100)+'%';$('explosion').setAttribute('aria-busy',String(assemblyMotion.some(v=>v.active)));
 modelDirty=boundsDirty=sceneDirty=shadowDirty=true;requestFrame();
}
function restoreThen(action){
 if(!blast.present){action();return;}
 pendingAction=action;blast.restore();lastTime=performance.now();restoreBusy=true;$('assemble').setAttribute('aria-busy','true');
 if(reduced){blast.update(RESTORE_SECONDS);state.detail=0;pendingAction=null;action();}
 sceneDirty=shadowDirty=true;requestFrame();
}
function focusStage(){const r=stage.getBoundingClientRect();if(r.top<0||r.bottom>innerHeight)stage.scrollIntoView({block:'center',behavior:'instant'});}
function detonate(){
 focusStage();
 setPlaying(false);speedMotion.reset(0);state.orbit=false;$('orbit').setAttribute('aria-pressed','false');
 state.isolated=false;state.cutaway=false;appearance();
 model.root.updateMatrixWorld(true);const radius=envelope.getSize(new T.Vector3()).length()*.5;
 blast.start(model,state.angle,envelope.getCenter(new T.Vector3()),radius,state.detail,floor.position.y);resetMetrics();lastTime=performance.now();
 pendingAction=null;assemblyMotion.forEach(v=>v.reset(0));detailMotion.reset(0);state.explosion=state.target=state.detailTarget=0;state.mode='structure';updateMode();
 $('explosion').value=0;$('explosion-value').textContent='0%';$('explosion').setAttribute('aria-busy','false');$('detail-expand').setAttribute('aria-pressed','false');$('detail-expand').setAttribute('aria-busy','false');$('explode').setAttribute('aria-pressed','true');$('explode').setAttribute('aria-busy',String(!reduced));
 if(reduced)blast.update(BLAST_EFFECT_SECONDS);else{stage.classList.remove('exploding');requestAnimationFrame(()=>stage.classList.add('exploding'));clearTimeout(burstTimer);burstTimer=setTimeout(()=>stage.classList.remove('exploding'),700);}
 boundsDirty=false;fitDirty=false;sceneDirty=shadowDirty=true;requestFrame();
}
function setSpeed(value){const v=boundedSpeed(value);if(v===null)return;state.speed=v;speedMotion.to(state.playing?v:0);requestFrame();$('speed').value=v;$('speed-number').value=v.toFixed(1);$('speed-value').textContent=v.toFixed(1)+'×';}
const featured=['abrams','leopard2','ifv','pistol','boltrifle','rifle','lmg','gpmg','rotarygun','excavator','starship','saturnv','soyuz','dragon','rov','locomotive','tiangong','sentinel1','gps3','geocom','cubesat','roman','dslr','filmslr','cinema','iss','webb','hubble','landsat9','mirrorless'];
const order=[...featured.filter(k=>MODEL_INFO[k]),...MODEL_CATALOG.map(m=>m.key).filter(k=>MODEL_INFO[k]&&!featured.includes(k))];
const icons={tiangong:'✧',sentinel1:'▤',gps3:'✧',geocom:'◉',cubesat:'▥',roman:'◈',dslr:'▣',filmslr:'▣',cinema:'▣',iss:'✧',webb:'⬡',hubble:'◈',landsat9:'✧',mirrorless:'▣',engine:'◉',gearbox:'⚙',motor:'▥',turbine:'◈',planetary:'✺',pump:'◔',blower:'∞',clutch:'◎',brake:'◍',robot:'⌁',f40:'◇',models:'◇',p51:'✈',p47:'✈',falcon9:'↑',falconheavy:'↑',r22:'✣',aw95:'✣',a320:'✈',dc6:'✈'};
for(const [i,k]of order.entries()){for(const container of [document.querySelector('.machine-nav'),document.querySelector('.model-tabs')]){const b=document.createElement('button');b.className='machine navitem';b.dataset.model=k;b.setAttribute('aria-pressed','false');b.innerHTML=`<span class="machine-symbol" aria-hidden="true">${icons[k]||'◇'}</span><span>${MODEL_INFO[k].nav}</span><b>${MODEL_INFO[k].code.split(' / ')[1]}</b>`;b.onclick=()=>changeModel(k);container.append(b);}}
const modelOptions=new Map();for(const k of order){const info=MODEL_INFO[k],category=info.category||'机械与机构';if(!modelOptions.has(category)){const group=document.createElement('optgroup');group.label=category;modelOptions.set(category,group);$('model-select').append(group);}const option=document.createElement('option');option.value=k;option.textContent=info.name;modelOptions.get(category).append(option);}$('model-select').onchange=e=>changeModel(e.target.value);
function modelZoom(info){return matchMedia('(max-width:960px)').matches?Math.max(info.zoom??.88,1.02):(info.zoom??.88);}
// Blender导出的模型文件按需下载，下载期间再次切换时只采用最后一次请求。
let assetRequest=0;
function changeModel(k){const asset=MODEL_INFO[k]?.asset,token=++assetRequest;if(asset&&!hasAsset(asset)){$('loading').hidden=false;$('loading-message').textContent='正在载入'+MODEL_INFO[k].name+'的三维模型。';ensureAsset(asset).then(()=>{if(token===assetRequest)showModel(k);},error=>{if(token!==assetRequest)return;console.error(error);$('loading-message').textContent='模型文件未能载入，请检查网络后重新打开。';$('reload-view').hidden=false;$('reload-view').onclick=()=>location.reload();});return;}showModel(k);}
function showModel(k){resetPointers();blast.cancel();pendingAction=null;if(model){scene.remove(model.root);model.disposal(model.compilation);}model=buildModel(k,materials);optimizeModel(model);scene.add(model.root);model.update(.55,0,'structure');cacheLocalBounds(model);state.detail=state.explosion=0;envelope.makeEmpty();for(let i=0;i<16;i++){model.update(i*PI/4,0,'structure');model.root.updateMatrixWorld(true);for(const p of model.parts)envelope.union(partWorldBox(p,partBox));}model.update(.55,0,'structure');partMap=new Map(model.parts.map(p=>[p.id,p]));const info=model.info;$('model-select').value=k;Object.assign(state,{key:k,selected:info.selected,angle:.55,phase:0,explosion:0,target:0,detail:0,detailTarget:0,isolated:false,cutaway:info.cutaway??true,mode:'motion',zoom:modelZoom(info),zoomTarget:modelZoom(info),azimuth:info.azimuth,azTarget:info.azimuth,elevation:info.elevation,elTarget:info.elevation});assemblyMotion=model.parts.map(()=>new MotionValue(0,12));detailMotion.reset(0);speedMotion.reset(reduced?0:state.speed);cameraReady=false;fitDirty=true;$('detail-expand').setAttribute('aria-pressed','false');$('detail-expand').setAttribute('aria-busy','false');document.querySelectorAll('[data-model]').forEach(b=>{b.classList.toggle('selected',b.dataset.model===k);b.setAttribute('aria-pressed',String(b.dataset.model===k));});for(const [id,v]of Object.entries({'model-title':info.name,'model-subtitle':info.subtitle,'model-tag':info.tag,'model-code':info.code,'breadcrumb':'机械探索 / '+info.nav,'side-title':info.name,'side-desc':info.short,'side-code':info.code,'part-count':model.parts.length+' 部件组','cycle-title':info.cycleTitle,'cycle-hint':info.cycleHint}))$(id).textContent=v;$('flow').hidden=k!=='turbine';$('flow').setAttribute('aria-pressed',String(state.flow));$('basis-text').textContent=info.basis||'模型按机械原理构造，用于观察结构与运动。';$('source').href=info.source;$('source').textContent=(info.sourcePrefix||'原理参考')+' · '+info.sourceName+' ↗';$('parts').innerHTML=model.parts.map((p,i)=>`<button class="part" data-part="${p.id}" aria-pressed="false"><span class="part-number">${String(i+1).padStart(2,'0')}</span>${p.name}<span class="part-dot"></span></button>`).join('');$('phases').innerHTML=info.phases.map((p,i)=>`<button class="phase" data-phase="${i}" aria-pressed="${i===0}"><span>0${i+1} / ${p[1]}</span><b>${p[0]}</b><em>↗</em><p>${p[2]}</p><i class="phase-progress"></i></button>`).join('');lastPhase=-1;phaseButtons=Array.from(document.querySelectorAll('[data-phase]'));$('parts').scrollTop=0;$('explosion').value=0;$('explosion-value').textContent='0%';$('explode').setAttribute('aria-pressed','false');$('explode').setAttribute('aria-busy','false');selectPart(info.selected);setPlaying(!reduced);updateMode();resetMetrics();requestFrame();modelDirty=boundsDirty=viewDirty=sceneDirty=shadowDirty=true;document.title=info.name+' · MECHANICA X';model.compilation=renderer.compileAsync(scene,camera).catch(error=>console.error('着色器预编译失败',error));}
function phaseUpdate(){const phase=state.key==='engine'?Math.floor(state.angle/PI)%4:state.phase;if(phase!==lastPhase){phaseButtons.forEach((b,i)=>{b.setAttribute('aria-pressed',String(i===phase));b.lastElementChild.style.transform='scaleX(0)';});lastPhase=phase;}if(state.key==='engine')phaseButtons[phase].lastElementChild.style.transform=`scaleX(${(state.angle%PI)/PI})`;}
$('parts').onclick=e=>{const b=e.target.closest('[data-part]');if(b)restoreThen(()=>selectPart(b.dataset.part));};$('explosion').oninput=e=>{const v=+e.target.value/100;restoreThen(()=>setAssemblySpread(v));};$('assemble').onclick=()=>{focusStage();restoreThen(()=>{state.isolated=false;state.cutaway=false;$('explode').setAttribute('aria-pressed','false');appearance();setDetail(0);setAssemblySpread(0);});};$('detail-expand').onclick=()=>{focusStage();restoreThen(()=>{setDetail(1);setAssemblySpread(1);});};$('explode').onclick=detonate;$('structure').onclick=()=>restoreThen(()=>setMode('structure'));$('motion').onclick=()=>restoreThen(()=>{setMode('motion');setPlaying(!reduced);});$('play').onclick=()=>restoreThen(()=>{if(state.mode!=='motion'){setMode('motion');setPlaying(true);}else setPlaying(!state.playing);});$('speed').oninput=e=>setSpeed(e.target.value);$('speed-number').oninput=e=>{if(e.target.value!==''&&Number.isFinite(+e.target.value)&&+e.target.value>=.1&&+e.target.value<=5)setSpeed(e.target.value);};$('speed-number').onchange=e=>setSpeed(e.target.value);document.querySelectorAll('[data-speed]').forEach(b=>b.onclick=()=>setSpeed(b.dataset.speed));
$('flow').onclick=()=>{state.flow=!state.flow;$('flow').setAttribute('aria-pressed',String(state.flow));sceneDirty=true;};
$('cutaway').onclick=()=>{state.cutaway=!state.cutaway;appearance();};$('isolate').onclick=()=>restoreThen(()=>{state.isolated=!state.isolated;setPlaying(false);state.zoomTarget=1;appearance();});$('orbit').onclick=()=>{state.orbit=!state.orbit;$('orbit').setAttribute('aria-pressed',String(state.orbit));sceneDirty=true;};
$('phases').onclick=e=>{const b=e.target.closest('[data-phase]');if(!b)return;restoreThen(()=>{setMode('motion');setPlaying(false);state.phase=+b.dataset.phase;if(state.key==='engine')state.angle=state.phase*PI+PI/2;selectPart(model.info.phases[state.phase][3]);modelDirty=true;phaseUpdate();});};
function zoom(k){state.zoomTarget=Math.max(.52,Math.min(2.1,state.zoomTarget*k));sceneDirty=true;}$('zoom-in').onclick=()=>zoom(.86);$('zoom-out').onclick=()=>zoom(1/.86);$('reset').onclick=()=>{state.azTarget=model.info.azimuth;state.elTarget=model.info.elevation;state.zoomTarget=modelZoom(model.info);fitTarget=fitDirty=sceneDirty=true;};$('quality').onchange=e=>{governor.value=governor.max;governor.slow=governor.fast=0;renderer.setPixelRatio(e.target.value==='high'?Math.min(devicePixelRatio,2):e.target.value==='low'?1:governor.max);resize();resetMetrics();};
const ray=new T.Raycaster(),pointer=new T.Vector2(),pointers=new Map();let down=null,last=null,moved=false,pinch=0;
function resetPointers(){
 const ids=[...pointers.keys()];pointers.clear();down=last=null;pinch=0;moved=true;canvas.classList.remove('dragging');
 // 先清状态再释放，lostpointercapture即使立即到达也不会结束另一条手势。
 for(const id of ids)if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);
}
canvas.addEventListener('pointerdown',e=>{
 if(e.button!==0||pointers.has(e.pointerId)||pointers.size>=2)return;
 pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);
 state.orbit=false;$('orbit').setAttribute('aria-pressed','false');canvas.classList.add('dragging');
 if(pointers.size===1){down=last={x:e.clientX,y:e.clientY};moved=false;pinch=0;}
 else{const [a,b]=[...pointers.values()];pinch=Math.hypot(a.x-b.x,a.y-b.y);moved=true;}
});
canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const [a,b]=[...pointers.values()],d=Math.hypot(a.x-b.x,a.y-b.y);if(pinch&&d)zoom(pinch/d);pinch=d;state.zoom=state.zoomTarget;cameraDistance.reset(fitDistance*state.zoom);viewDirty=true;moved=true;}else if(last){state.azTarget-=(e.clientX-last.x)*.007;state.elTarget=Math.max(-.45,Math.min(1.3,state.elTarget+(e.clientY-last.y)*.006));moved=moved||Math.hypot(e.clientX-down.x,e.clientY-down.y)>5;}last={x:e.clientX,y:e.clientY};state.azimuth=state.azTarget;state.elevation=state.elTarget;viewDirty=sceneDirty=true;});
function pointerEnd(e){
 if(!pointers.has(e.pointerId))return;
 const pick=e.type==='pointerup'&&pointers.size===1&&!moved&&down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)<=5;
 pointers.delete(e.pointerId);
 if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
 if(pointers.size===1){const p=[...pointers.values()][0];last={...p};down={...p};}
 else{down=last=null;canvas.classList.remove('dragging');}
 moved=true;pinch=0;
 if(pick){const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(model.pickable).find(h=>{let o=h.object;if(o.userData.effect)return false;while(o){if(!o.visible)return false;o=o.parent;}return true;});if(hit)restoreThen(()=>selectPart(hit.object.userData.part));}
}
canvas.addEventListener('pointerup',pointerEnd);canvas.addEventListener('pointercancel',pointerEnd);canvas.addEventListener('lostpointercapture',pointerEnd);window.addEventListener('blur',resetPointers);
canvas.addEventListener('wheel',e=>{e.preventDefault();zoom(Math.exp(e.deltaY*.001));},{passive:false});canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','='].includes(e.key))return;e.preventDefault();if(e.key==='ArrowLeft')state.azTarget-=.12;if(e.key==='ArrowRight')state.azTarget+=.12;if(e.key==='ArrowUp')state.elTarget=Math.min(1.3,state.elTarget+.08);if(e.key==='ArrowDown')state.elTarget=Math.max(-.45,state.elTarget-.08);if(['+','='].includes(e.key))zoom(.9);if(e.key==='-')zoom(1.1);sceneDirty=true;});
function resize(){stageW=stage.clientWidth;stageH=stage.clientHeight;renderer.setSize(stageW,stageH);camera.aspect=stageW/stageH;camera.updateProjectionMatrix();boundsDirty=sceneDirty=fitDirty=true;requestFrame();}new ResizeObserver(resize).observe(stage);resize();
let lastTime=0,fpsTime=0,fpsFrames=0,perfFrames=[],cpuFrames=[],renderCount=0,shadowRenderCount=0,metricsEpoch=0,blastBusy=false,restoreBusy=false;
const bench=new URLSearchParams(location.search).has('benchmark');
function resetMetrics(){perfFrames=[];cpuFrames=[];fpsFrames=0;fpsTime=performance.now();metricsEpoch++;$('perf-details').textContent='采样中';$('fps').textContent='LIVE';}
function updateMetrics(now,rawDelta,cpuMs){
 if(rawDelta===0){resetMetrics();return;}
 if(rawDelta>0){fpsFrames++;perfFrames.push(rawDelta*1000);cpuFrames.push(cpuMs);if(perfFrames.length>720){perfFrames.shift();cpuFrames.shift();}}
 if(now-fpsTime>1200){
  const stats=frameStatistics(perfFrames),p95=stats?.p95||0;
  $('fps').textContent=Math.round(fpsFrames*1000/(now-fpsTime))+' FPS';
  if(bench){const cpu=frameStatistics(cpuFrames);$('perf-details').textContent=renderer.info.render.calls+' draws · p95 '+p95.toFixed(2)+' ms · CPU '+(cpu?.p95||0).toFixed(2)+' ms · p99 '+(stats?.p99||0).toFixed(2)+' ms · '+perfFrames.length+' frames';$('perf-details').title=JSON.stringify(stats);$('perf-details').dataset.renderCount=renderCount;$('perf-details').dataset.shadowRenderCount=shadowRenderCount;$('perf-details').dataset.shadowCoverage=JSON.stringify(shadowFit.summary);$('perf-details').dataset.epoch=metricsEpoch;}
  if($('quality').value==='auto'&&perfFrames.length>=60&&governor.sample(p95)){renderer.setPixelRatio(governor.value);resize();perfFrames=[];}
  fpsFrames=0;fpsTime=now;
 }
}
function render(now){
 const cpuStart=performance.now();
 raf=0;if(document.hidden||!renderLifecycle.ready){lastTime=0;return;}
 const rawDelta=lastTime?Math.max(0,(now-lastTime)/1000):0,dt=rawDelta;lastTime=now;
 const wasBlast=blast.present,blastChanged=blast.update(dt,renderer.getPixelRatio());
 if(blastChanged){state.detail=blast.detail;sceneDirty=true;if(blast.geometryChanged){shadowDirty=true;if(!blast.bounds.isEmpty()){frameBox.copy(envelope).union(blast.bounds);frameBox.getCenter(center);viewDirty=fitDirty=true;}}modelDirty=false;boundsDirty=false;viewDirty=viewDirty||blast.time<.7;}
 if(wasBlast&&!blast.present){state.detail=0;updateMode();$('explode').setAttribute('aria-pressed','false');modelDirty=boundsDirty=true;const next=pendingAction;pendingAction=null;if(next)next();}
 if(blastBusy!==(blast.state==='blast')){blastBusy=blast.state==='blast';$('explode').setAttribute('aria-busy',String(blastBusy));}
 let changed=modelDirty&&!blast.present,expanding=assemblyMotion.some(v=>v.active),detailing=detailMotion.active;
 if(detailing){detailMotion.step(dt);state.detail=detailMotion.value;setDetailAmount(model,state.detail);$('detail-expand').setAttribute('aria-busy',String(detailMotion.active));changed=boundsDirty=shadowDirty=true;}
 if(expanding){for(const v of assemblyMotion)v.step(dt);state.explosion=Math.max(...assemblyMotion.map(v=>v.value));$('explosion').setAttribute('aria-busy',String(assemblyMotion.some(v=>v.active)));changed=boundsDirty=shadowDirty=true;}
 if((expanding||detailing)&&state.target===0&&state.detailTarget===0&&!assemblyMotion.some(v=>v.active)&&!detailMotion.active)shadowFit.reset();
 const angleDelta=speedMotion.step(dt)*PI*.5;
 if(!blast.present&&(state.playing||speedMotion.active)&&state.explosion<.001&&angleDelta){state.angle+=angleDelta;changed=true;}
 if(changed){
  model.update(state.angle,0,state.isolated?'structure':state.mode);
  model.parts.forEach((p,i)=>p.group.position.addScaledVector(p.offset,assemblyMotion[i].value*1.4));
  if(state.isolated)boundsDirty=true;sceneDirty=shadowDirty=true;modelDirty=false;
 }
 if(state.orbit){state.azTarget+=dt*.13;sceneDirty=true;}
 const blend=reduced?1:1-Math.exp(-dt*36);let cameraMoving=false;
 for(const [v,t]of [['azimuth','azTarget'],['elevation','elTarget'],['zoom','zoomTarget']]){const d=state[t]-state[v];if(Math.abs(d)>.00005){state[v]+=d*blend;viewDirty=cameraMoving=true;}else state[v]=state[t];}
 if(sceneDirty||boundsDirty)scene.updateMatrixWorld();
 if(boundsDirty&&!blast.present){refreshBounds();floor.updateMatrixWorld();grid.updateMatrixWorld();}if(viewDirty)cameraUpdate(dt);
 if(blast.state==='blast'&&blast.time<.65&&!reduced){const shake=.16*Math.exp(-blast.time*7);camera.position.x+=Math.sin(blast.time*95)*shake;camera.position.y+=Math.cos(blast.time*117)*shake;camera.updateMatrixWorld();sceneDirty=true;}
 if(changed)phaseUpdate();
 if(sceneDirty)updateLabel();
 lines.visible=state.explosion>.02&&!state.isolated&&!blast.present;
 if(lines.visible&&changed){let count=0;for(const [i,p]of model.parts.entries()){partWorldBox(p,partBox).getCenter(lineEnd);lineStart.copy(lineEnd).addScaledVector(p.offset,-assemblyMotion[i].value*1.4);lineData.set([lineStart.x,lineStart.y,lineStart.z,lineEnd.x,lineEnd.y,lineEnd.z],count*6);count++;}lineGeo.setDrawRange(0,count*2);lineGeo.attributes.position.needsUpdate=true;}
 flow.visible=state.key==='turbine'&&state.flow&&state.mode==='motion'&&state.explosion<.001&&!state.isolated;flowMaterial.uniforms.time.value=state.angle;
 // 几何变化时阴影与当前姿态同步，仅改变观察视角时复用已有阴影。
 if(sceneDirty){if(shadowDirty){shadowFit.fitModel(model.root,state.detail,floor.position.y,!state.isolated&&!blast.present&&state.detail<.001&&state.explosion<.001?envelope:null);renderer.shadowMap.needsUpdate=true;shadowDirty=false;shadowRenderCount++;}renderer.render(scene,camera);renderCount++;sceneDirty=false;if(!renderer.getContext().isContextLost())$('loading').hidden=true;}
 const restoring=blast.state==='restoring'||(state.target===0&&assemblyMotion.some(v=>v.active))||(state.detailTarget===0&&detailMotion.active);
 if(restoreBusy!==restoring){restoreBusy=restoring;$('assemble').setAttribute('aria-busy',String(restoring));}
 const moving=blast.active||shadowDirty||state.playing||speedMotion.active||state.orbit||cameraMoving||viewDirty||assemblyMotion.some(v=>v.active)||detailMotion.active;
 if(moving){updateMetrics(now,rawDelta,performance.now()-cpuStart);requestFrame();}else{
  $('fps').textContent='已暂停';if(bench){const stats=frameStatistics(perfFrames);$('perf-details').textContent=renderer.info.render.calls+' draws · idle'+(stats?' · p95 '+stats.p95.toFixed(2)+' ms · p99 '+stats.p99.toFixed(2)+' ms · '+stats.count+' frames':'');$('perf-details').title=JSON.stringify(stats);$('perf-details').dataset.renderCount=renderCount;$('perf-details').dataset.shadowRenderCount=shadowRenderCount;$('perf-details').dataset.shadowCoverage=JSON.stringify(shadowFit.summary);}
  lastTime=0;
 }
}
// 静止后不再空转渲染。交互、布局或页面恢复可重新唤醒同一条动画循环。
for(const event of ['click','input','change','pointerdown','pointermove','pointerup','pointercancel','wheel','keydown'])document.addEventListener(event,requestFrame,{passive:true});
renderLifecycle=bindRenderLifecycle({canvas,document,window,
 suspend(reason){
  if(raf)cancelAnimationFrame(raf);raf=0;lastTime=0;
  resetPointers();
  if(reason==='context-lost')showLoading('画面暂时中断，正在恢复。',true);
 },
 resume(){lastTime=0;resetMetrics();sceneDirty=shadowDirty=true;requestFrame();},
 async rebuild(){
  rebuildEnvironment();key.shadow.map?.dispose();key.shadow.map=null;
  sceneDirty=shadowDirty=true;
  // 当前模型原地重编译，继续保留视角、展开、选择与暂停状态。
  model.compilation=renderer.compileAsync(scene,camera);await model.compilation;
 },
 onError(error){showLoading('画面恢复未完成，请重新打开。',true);console.error('三维画面恢复失败',error);}
});
if(bench){
 $('perf-details').hidden=false;
 const controls=document.createElement('div');controls.className='benchmark-controls';
 controls.innerHTML='<button id="calibrate-refresh" class="small-btn">测量空载刷新间隔</button><output id="refresh-report">暂停绘制后采样 720 帧，用于区分渲染耗时与浏览器调度。</output>';
 document.querySelector('.footer').after(controls);
 $('calibrate-refresh').onclick=()=>{
  if(blast.present){$('refresh-report').textContent='请先复原机械。';return;}
  const resume=state.playing,orbit=state.orbit;setPlaying(false);speedMotion.reset(0);state.orbit=false;$('orbit').setAttribute('aria-pressed','false');$('calibrate-refresh').disabled=true;
  let previous=0,firstRenderCount=0;const samples=[];
  function sample(now){
   if(document.hidden){$('refresh-report').textContent='页面已隐藏，本次采样取消。';$('calibrate-refresh').disabled=false;state.orbit=orbit;$('orbit').setAttribute('aria-pressed',String(orbit));setPlaying(resume);return;}
   if(previous)samples.push(now-previous);else firstRenderCount=renderCount;previous=now;
   if(samples.length<720){if(samples.length%120===0)$('refresh-report').textContent='空载采样 '+samples.length+' / 720';requestAnimationFrame(sample);return;}
   const stats=frameStatistics(samples);stats.extraRenders=renderCount-firstRenderCount;$('refresh-report').textContent='空载 '+stats.fps.toFixed(1)+' FPS · p95 '+stats.p95.toFixed(2)+' ms · p99 '+stats.p99.toFixed(2)+' ms · 新增绘制 '+stats.extraRenders+' 次';$('refresh-report').title=JSON.stringify(stats);$('calibrate-refresh').disabled=false;state.orbit=orbit;$('orbit').setAttribute('aria-pressed',String(orbit));setPlaying(resume);requestFrame();
  }
  requestAnimationFrame(sample);
 };
}
const initialModel=new URLSearchParams(location.search).get('model');changeModel(MODEL_INFO[initialModel]?initialModel:'iss');requestFrame();
