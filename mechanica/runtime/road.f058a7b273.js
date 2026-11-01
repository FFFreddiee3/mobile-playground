import * as T from '#three';
import {makeBuilder} from '#geometry';
import {subgroup,place,offsets,panel,rod} from '#vehicle-kit';
const PI=Math.PI,TAU=PI*2;

// 1 模型单位 = 0.5 m。整车尺寸与轮胎规格取自 road/sources.md：
// F40 为 Ferrari 官方历史车型页（长宽高、轴距、前后轮距、前 245/40 ZR17、后 335/35 ZR17）；
// Model S 为 Tesla 用户手册 Dimensions 与 Wheels and Tires 页（长、不含后视镜宽、高、轴距、前后悬、轮距、离地间隙、前 255/45R19、后 285/40R19）。
// 主销偏距、转向演示角、制动盘、悬架、车身曲线与内部零件尺寸为网页造型补全，不是制造图。
const tyreRadius=(rim,width,aspect)=>(rim*25.4/2+width*aspect)/500;
const SPEC={
 f40:{L:4358/500,W:1970/500,H:1124/500,rim:17*25.4/1000,disc:.32,kp:.26,sill:.26,floor:.30,rail:{z:.82,y0:.30,y1:.40},case:.25,
  axles:[{x:-2450/1000,R:tyreRadius(17,245,.40),w:245/500,z:1594/1000,steer:true,drive:false},{x:2450/1000,R:tyreRadius(17,335,.35),w:335/500,z:1606/1000,steer:false,drive:true}]},
 models:{L:5021/500,W:1987/500,H:1430/500,rim:19*25.4/1000,disc:.36,kp:.30,sill:.27,floor:.49,rail:{z:.85,y0:.49,y1:.59},case:.20,clearance:126/500,
  axles:[{x:-5021/1000+961/500,R:tyreRadius(19,255,.45),w:255/500,z:1690/1000,steer:true,drive:true},{x:-5021/1000+(961+2960)/500,R:tyreRadius(19,285,.40),w:285/500,z:1690/1000,steer:false,drive:true}]}
};
export const ROAD_SPEC=SPEC;
// 网页补全：主销在轮心面内侧 DK，转向演示幅度 STEER（弧度），横拉杆长 TIE，转向臂球销在主销前方 ARM。
const DK=.12,STEER=.2,TIE=.48,ARM=-.26;

// 曲面共用同一截面，车窗边缘和覆盖件边缘不会各自漂移。宽度上限保证外表面不超过官方总宽。
function profile(points,limit=Infinity){
 const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),rows=curve.getPoints((points.length-1)*16).map(p=>p.toArray());
 return x=>{let i=1;while(i<rows.length-1&&rows[i][0]<x)i++;const a=rows[i-1],b=rows[i],t=T.MathUtils.clamp((x-a[0])/(b[0]-a[0]),0,1);return [x,T.MathUtils.lerp(a[1],b[1],t),Math.min(limit,T.MathUtils.lerp(a[2],b[2],t))];};
}
function carSurface(B,g,section,start,end,mat,crown=.06,u0=-1,u1=1){
 const pos=[],uv=[],idx=[],nx=Math.max(8,Math.ceil((end-start)*12)),nz=24,stride=nz+1,layer=(nx+1)*stride;
 for(let side=0;side<2;side++)for(let i=0;i<=nx;i++)for(let j=0;j<=nz;j++){
  const x=T.MathUtils.lerp(start,end,i/nx),[,y,w]=section(x),u=T.MathUtils.lerp(u0,u1,j/nz),c=typeof crown==='function'?crown(x,u):crown;
  pos.push(x,y+c*(1-u*u)-side*.025,w*u);uv.push(i/nx,j/nz);
 }
 for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){const a=i*stride+j,b=a+1,c=a+stride,d=c+1;idx.push(a,b,c,b,d,c,a+layer,c+layer,b+layer,b+layer,c+layer,d+layer);}
 const edge=[];for(let j=0;j<=nz;j++)edge.push(j);for(let i=1;i<=nx;i++)edge.push(i*stride+nz);for(let j=nz-1;j>=0;j--)edge.push(nx*stride+j);for(let i=nx-1;i>0;i--)edge.push(i*stride);
 for(let i=0;i<edge.length;i++){const a=edge[i],b=edge[(i+1)%edge.length];idx.push(a,a+layer,b,b,a+layer,b+layer);}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.computeVertexNormals();return B.mesh(g,geo,mat);
}
function sideShape(B,g,points,side,width,mat,depth=.036){
 const raw=new T.ExtrudeGeometry(new T.Shape(points.map(p=>new T.Vector2(...p))),{depth,steps:1,bevelEnabled:false});
 const pos=[],norm=[],uv=[],p=raw.attributes.position,n=raw.attributes.normal,t=raw.attributes.uv;
 const vertex=i=>{const normal=[n.getX(i),n.getY(i),n.getZ(i)];if(normal.every(v=>v===0)&&(p.getZ(i)===0||Math.abs(p.getZ(i)-depth)<1e-7))normal[2]=p.getZ(i)===0?-1:1;return {p:[p.getX(i),p.getY(i),p.getZ(i)],n:normal,uv:[t.getX(i),t.getY(i)]};};
 const midpoint=(a,b)=>({p:a.p.map((v,i)=>(v+b.p[i])/2),n:a.n.map((v,i)=>(v+b.n[i])/2),uv:a.uv.map((v,i)=>(v+b.uv[i])/2)});
 function triangle(a,b,c){
  const v=[a,b,c],d=v.map((q,i)=>{const r=v[(i+1)%3];return Math.hypot(q.p[0]-r.p[0],q.p[1]-r.p[1]);}),edge=d.indexOf(Math.max(...d));
  if(d[edge]>.28){const first=v[edge],second=v[(edge+1)%3],third=v[(edge+2)%3],m=midpoint(first,second);triangle(first,m,third);triangle(m,second,third);return;}
  for(const q of v){const [x,y,z]=q.p,h=.0001,dx=(width(x+h,y)-width(x-h,y))/(2*h),dy=(width(x,y+h)-width(x,y-h))/(2*h),normal=new T.Vector3(q.n[0]-side*dx*q.n[2],q.n[1]-side*dy*q.n[2],q.n[2]).normalize();pos.push(x,y,side*width(x,y)+z-depth/2);norm.push(...normal.toArray());uv.push(...q.uv);}
 }
 for(let i=0;i<p.count;i+=3)triangle(vertex(i),vertex(i+1),vertex(i+2));raw.dispose();
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('normal',new T.Float32BufferAttribute(norm,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));return B.mesh(g,geo,mat);
}
// 侧围外廓：上沿由 top(x) 给出，下沿为门槛高度，每个完整落在范围内的车轮让出圆弧轮拱。
function sidePanel(B,g,start,end,side,top,bottom,arches,width,mat,depth=.036){
 const n=Math.max(2,Math.ceil((end-start)*24)),upper=[],lower=[];
 for(let i=0;i<=n;i++){const x=T.MathUtils.lerp(start,end,i/n);upper.push([x,top(x)]);if(arches.every(a=>Math.abs(x-a.x)>a.r))lower.push([x,bottom]);}
 for(const a of arches)if(a.x-a.r>start&&a.x+a.r<end){lower.push([a.x-a.r,bottom]);for(let k=0;k<=40;k++){const t=PI*(1-k/40);lower.push([a.x+a.r*Math.cos(t),a.y+a.r*Math.sin(t)]);}lower.push([a.x+a.r,bottom]);}
 lower.sort((p,q)=>p[0]-q[0]);
 return sideShape(B,g,[...upper,...lower.reverse()],side,width,mat,depth);
}
function cutGroup(B,g){g.traverse(o=>{if(o.isMesh&&!o.userData.rigidChild)B.cut(o);});}
function box0(B,g,w,h,d,mat,pos,holes=[]){// 无倒角盒体：去掉直角轮廓退化线段生成的零面积三角形，避免零向量法线。
 const o=B.box(g,w,h,d,mat,pos,0,holes),geo=o.geometry,p=geo.attributes.position,keep=[],a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
 for(let t=0;t<p.count;t+=3){a.fromBufferAttribute(p,t);b.fromBufferAttribute(p,t+1);c.fromBufferAttribute(p,t+2);if(b.sub(a).cross(c.sub(a)).lengthSq()>1e-18)keep.push(t);}
 for(const [name,attr]of Object.entries(geo.attributes)){const n=attr.itemSize,arr=new attr.array.constructor(keep.length*3*n);keep.forEach((t,q)=>arr.set(attr.array.subarray(t*n,(t+3)*n),q*3*n));geo.setAttribute(name,new T.BufferAttribute(arr,n,attr.normalized));}
 geo.clearGroups();geo.computeBoundingBox();geo.computeBoundingSphere();return o;}
function sphere(B,g,r,mat,pos){return B.mesh(g,new T.SphereGeometry(r,16,12),mat,pos);}
function rigid(g,key,name){g.userData.rigid=key;g.name=name;return g;}
// 轴向圆柱：from、to 为轴上两端坐标，axis 为 x、y 或 z。
function axial(B,g,r,from,to,mat,at,axis='z',segments=24,r2=r){const pos=[...at],k='xyz'.indexOf(axis);pos[k]=(from+to)/2;return B.cylinder(g,to>from?r2:r,Math.abs(to-from),mat,pos,axis,to>from?r:r2,segments);}

// 两种动力布局共用车轮、转向、悬架与装配入口，车身和动力系统分别构造。
export function buildCar(materials,electric=false){
 const S=electric?SPEC.models:SPEC.f40,B=makeBuilder(materials),paint=electric?'bluepaint':'scarlet';
 const L=S.L,W=S.W,Le=L/2-.008,Wpk=W/2-.026,[front,back]=S.axles,rail=S.rail,rd=S.disc,kp=S.kp;
 const sweep=a=>a.steer?a.R*Math.cos(STEER)+(a.w/2+DK)*Math.sin(STEER):a.R;
 const arches=S.axles.map(a=>({x:a.x,y:a.R,r:sweep(a)+.05}));
 const belt=profile(electric?[[-L/2,1.30,1.50],[-4.65,1.52,1.86],[-3.80,1.70,1.95],[-3.10,1.76,Wpk],[-2.25,1.86,1.93],[.10,1.94,1.92],[2.00,1.98,1.95],[2.82,2.00,Wpk],[3.95,1.96,1.92],[L/2,1.70,1.52]]
  :[[-L/2,.91,1.70],[-3.7,1.21,1.87],[-2.9,1.49,1.93],[-2.45,1.52,Wpk],[-1.55,1.40,1.86],[.2,1.41,1.86],[1.55,1.55,1.93],[2.45,1.59,Wpk],[3.5,1.54,1.93],[L/2,1.30,1.84]],Wpk);
 const mid=(x,y)=>belt(x)[2]-.045*Math.max(0,1-y),outer=(x,y)=>mid(x,y)+.018,beltY=x=>belt(x)[1];
 const doorStart=electric?-2.08:-1.55,doorEnd=electric?1.95:1.48,cEnd=electric?3.85:doorEnd,sillTop=S.sill+.17;
 const floorFront=front.x+arches[0].r+.02,floorBack=back.x-arches[1].r-.02,floorY=S.floor-.02;

 // 部件组顺序与界面、测试约定保持不变。
 const chassis=B.part('chassis','底盘与承载结构','CHASSIS',electric?'铝制地板承托底置电池，前后副车架纵梁连接悬架与电驱。':'钢管车架与地板连接前后悬架，后部横梁承托纵置发动机。',[0,-1.1,0]);
 const body=B.part('body','车身与翼子板','BODY PANELS','连续车身围绕承载结构，四处轮拱与黑色内衬为车轮转动和前轮转向保留空间。',[0,1.5,-2.4]);
 const hood=B.part('hood',electric?'前备箱盖':'前舱盖','FRONT HOOD',electric?'前备箱盖沿车头轮廓闭合，移开后可观察前电驱、转向机与散热器。':'整块前舱盖沿车头轮廓闭合，移开后可观察前悬架、转向机与散热器。',[-2.4,1.8,0]);
 const roof=B.part('roof',electric?'全玻璃车顶与前后风挡':'车顶与前风挡','ROOF & GLAZING','玻璃和车顶共用边缘轮廓，侧窗向车内倾斜并连接车顶。',[0,2.4,0]);
 const doors=[-1,1].map(side=>B.part(side<0?'doorL':'doorR',electric?(side<0?'左侧前后车门组':'右侧前后车门组'):(side<0?'左侧车门':'右侧车门'),'SIDE DOOR','车门、倾斜侧窗和密封边框组成可单独移开的部件组。',[0,.7,side*2.6]));
 const rear=B.part('rear',electric?'尾门与后舱':'发动机罩与固定尾翼','REAR DECK',electric?'尾门与尾部轮廓闭合，移开后可观察后电驱与后轴。':'整块后部发动机罩带透明百叶与整幅尾翼，移开后可观察发动机与后轴。',[2.2,2,0]);
 const cabin=B.part('cabin',electric?'五座乘员舱':'双座座舱','CABIN',electric?'前排独立座椅、中控台与横置大屏，后排三个座位。':'两个独立座椅、仪表台、转向柱与中央通道。',[0,1.6,2.1]);
 const suspension=B.part('suspension','悬架与转向机构','SUSPENSION',electric?'前轴双叉臂与后轴连杆经减震支柱和转向节连接底盘与车轮，齿条经横拉杆推动前轮转向节。':'前后上下叉臂、螺旋弹簧套筒减震器和转向节连接底盘与车轮，齿条经横拉杆推动前轮转向节。',[0,-.8,2.2]);
 const wheelParts=[];for(const [i]of S.axles.entries())for(const s of [-1,1]){const id=`wheel${i}${s>0?'R':'L'}`;wheelParts.push(B.part(id,(i?'后':'前')+(s<0?'左':'右')+'车轮与轮毂','WHEEL',S.axles[i].steer?'轮胎、轮辋与轮毂绕轮轴转动，并随转向节绕主销偏转。':'轮胎、轮辋与轮毂绕轮轴转动。',[i?.55:-.55,-.25,s*2.3]));}
 const brakes=B.part('brakes','四轮制动系统','BRAKES','制动盘随车轮转动，卡钳固定在转向节上并随前轮转向偏转。',[0,1.2,-2.5]);
 const power=B.part('power',electric?'前后电驱总成':'双涡轮V8动力总成','POWERTRAIN',electric?'前后两套电机与减速器经半轴驱动四轮，端盘显示转子转动。':'纵置90度V8布置在座舱后方，两侧涡轮增压，变速器壳体经半轴驱动后轮。',[1.5,1.8,1.8]);
 const battery=electric?B.part('battery','底置电池包','BATTERY PACK','电池模块排布在地板下方的托盘内，橙色高压线连接前后电驱。',[0,-1.8,0]):null;
 const thermal=B.part('thermal',electric?'冷却回路与前舱':'散热器与冷却管路','COOLING',electric?'前置散热器经冷却管连接前电驱。':'前置散热器经中央通道内的冷却管连接发动机。',[-2,1.2,-2.1]);
 const lights=B.part('lights','灯组与外部细节','LIGHTING','前灯、尾灯、侧面装饰线与后视镜沿车身布置。',[0,1.5,2.5]);

 // ---------- 底盘 ----------
 const floorEdge=(x0,x1,y)=>{const pts=[],n=Math.ceil((x1-x0)*6);for(let i=0;i<=n;i++){const x=T.MathUtils.lerp(x0,x1,i/n);pts.push([x,mid(x,y)]);}for(let i=n;i>=0;i--){const x=T.MathUtils.lerp(x0,x1,i/n);pts.push([x,-mid(x,y)]);}return pts;};
 panel(B,chassis,floorEdge(floorFront,floorBack,floorY),.04,'dark',[0,floorY,0],'xz');
 const zKf=front.z-DK,zKb=back.z-DK;
 box0(B,chassis,floorFront+.05-(-Le+.045),.04,2*(zKf-.40),'dark',[(-Le+.045+floorFront+.05)/2,floorY,0]);
 box0(B,chassis,Le-.045-(floorBack-.05),.04,2*(zKb-.40),'dark',[(floorBack-.05+Le-.045)/2,floorY,0]);
 const railY=(rail.y0+rail.y1)/2,railH=rail.y1-rail.y0,railSpans=electric?[[-Le+.30,floorFront+.40],[floorBack-.40,Le-.30]]:[[-Le+.30,Le-.30]];
 for(const s of [-1,1]){for(const [x0,x1]of railSpans)box0(B,chassis,x1-x0,railH,.10,'alloy',[(x0+x1)/2,railY,s*rail.z]);}
 for(const end of [-1,1]){const x0=Le-.30-.05,x1=Le-.045;box0(B,chassis,x1-x0,railH,2*(rail.z+.08),'alloy',[end*(x0+x1)/2,railY,0]);}
 const zr=rail.z+.03;
 for(const a of S.axles){const yu=a.R+.36;for(const s of [-1,1]){B.box(chassis,1.30,.08,.08,'alloy',[a.x,yu,s*zr],.01);for(const dx of [-.55,.55])box0(B,chassis,.08,yu-rail.y1+.02,.08,'alloy',[a.x+dx,(yu+rail.y1)/2,s*zr]);}}
 if(!electric){for(const x of [1.50,2.25])box0(B,chassis,.10,.10,2*(rail.z+.05),'alloy',[x,.45,0]);// 发动机横梁：上表面承托油底壳
}

 // ---------- 车身 ----------
 for(const side of [-1,1]){
  sidePanel(B,body,-Le,doorStart,side,beltY,S.sill,arches,mid,paint);
  sidePanel(B,body,doorEnd,Le,side,beltY,S.sill,arches,mid,paint);
  sidePanel(B,body,doorStart,doorEnd,side,()=>sillTop,S.sill,[],mid,paint);
  for(const [i,a]of S.axles.entries()){
   const arc=[],r=arches[i].r;for(let k=0;k<=36;k++){const t=PI*k/36,x=a.x+(r+.02)*Math.cos(t),y=a.R+(r+.02)*Math.sin(t);arc.push([x,y,side*(outer(x,y)-.011)]);}B.path(body,arc,.018,electric?paint:'black');
   const zIn=(a.z-DK)-.40,zOut=mid(a.x,a.R+r*.7),liner=B.tube(body,r+.022,r,zOut-zIn,'black',[a.x,a.R,side*(zIn+zOut)/2],'z',0,PI);liner.name='wheel-arch-liner';
  }
 }
 for(const end of [-1,1]){
  const xe=end*Le,[,y,w]=belt(xe),b=mid(xe,S.sill),points=[[-b,S.sill],[-w,y],[-w*.7,y+.03],[0,y+.055],[w*.7,y+.03],[w,y],[b,S.sill]];
  const face=panel(B,body,points,.045,paint,[end*(Le-.0225),0,0],'xy');face.rotation.y=PI/2;
  box0(B,body,.008,.12,b*1.40,'black',[end*(L/2-.004),S.sill+.16,0]);
 }
 const hoodCrown=.055;carSurface(B,hood,belt,-Le,doorStart,paint,hoodCrown);
 for(const side of [-1,1]){const points=[];for(let i=0;i<=20;i++){const x=T.MathUtils.lerp(-L*.46,doorStart,i/20),[,y,w]=belt(x);points.push([x,y+hoodCrown*(1-.63**2)+.004,side*w*.63]);}B.path(hood,points,.008,'dark');}
 cutGroup(B,hood);
 const canopy=profile(electric?[[doorStart,beltY(doorStart),belt(doorStart)[2]],[-1.30,2.42,1.62],[-.55,2.72,1.52],[.60,2.776,1.50],[1.90,2.62,1.53],[cEnd,2.10,1.72]]:[[doorStart,beltY(doorStart),belt(doorStart)[2]],[-.78,2.10,1.34],[.22,2.17,1.34],[.75,2.00,1.48],[doorEnd,beltY(doorEnd),belt(doorEnd)[2]]]);
 const crown=electric?()=>.075:x=>x<.7?.055:T.MathUtils.lerp(.055,.48,(x-.7)/(doorEnd-.7));
 if(electric)carSurface(B,roof,canopy,doorStart,cEnd,'glass',crown);
 else{carSurface(B,roof,canopy,doorStart,-.78,'glass',crown);carSurface(B,roof,canopy,-.78,.22,paint,crown);carSurface(B,roof,canopy,.22,doorEnd,'glass',crown);}
 for(const side of [-1,1]){const edge=[];for(let i=0;i<=48;i++){const [x,y,w]=canopy(T.MathUtils.lerp(doorStart,cEnd,i/48));edge.push([x,y,side*w]);}B.path(roof,edge,electric?.032:.045,electric?'black':paint);}
 for(const [k,side]of [[0,-1],[1,1]]){
  const g=doors[k],cuts=electric?[doorStart,.02,doorEnd]:[doorStart,doorEnd];
  for(let j=0;j<cuts.length-1;j++){
   const from=cuts[j]+.012,to=cuts[j+1]-.012;sidePanel(B,g,from,to,side,beltY,sillTop+.002,[],mid,paint);
   const top=[],bottom=[];for(let i=0;i<=24;i++){const x=T.MathUtils.lerp(from,to,i/24),[,y]=canopy(x);top.push([x,Math.max(beltY(x)+.025,y)]);bottom.push([x,beltY(x)+.012]);}
   const windowWidth=(x,y)=>{const [,topY,topW]=canopy(x),[,bottomY,bottomW]=belt(x);return T.MathUtils.lerp(bottomW,topW,T.MathUtils.clamp((y-bottomY)/Math.max(.025,topY-bottomY),0,1));};
   const glass=sideShape(B,g,[...top,...bottom.reverse()],side,windowWidth,'glass',.018);glass.name=`side-window-${side}-${j}`;
   B.path(g,top.map(([x,y])=>[x,y,side*windowWidth(x,y)]),.020,'black');
   const [x0,y0]=top[0],[x1,y1]=top[top.length-1];rod(B,g,[x0,beltY(x0),side*belt(x0)[2]],[x0,y0,side*windowWidth(x0,y0)],.025,'black');rod(B,g,[x1,beltY(x1),side*belt(x1)[2]],[x1,y1,side*windowWidth(x1,y1)],.025,'black');
   const hx=to-.30,hy=beltY(hx)-.17;B.box(g,.22,.03,.012,electric?'chrome':'black',[hx,hy,side*(outer(hx,hy)+.004)],.004);
   B.path(g,[sillTop+.02,(sillTop+beltY(to))/2,beltY(to)-.02].map(y=>[to-.004,y,side*(outer(to-.004,y)+.002)]),.008,'dark');
  }
  if(!electric){sideShape(B,g,[[.05,1.35],[1.35,1.51],[1.20,1.15],[.05,1.12]],side,(x,y)=>mid(x,y)+.028,'black',.018);sideShape(B,g,[[.30,.61],[1.25,.69],[1.29,.93]],side,(x,y)=>mid(x,y)+.028,'dark',.018);}
  cutGroup(B,g);
 }
 if(electric){for(const side of [-1,1]){const pts=[];for(let i=0;i<=24;i++){const x=T.MathUtils.lerp(doorEnd,cEnd,i/24);pts.push([x,canopy(x)[1]]);}for(let i=24;i>=0;i--){const x=T.MathUtils.lerp(doorEnd,cEnd,i/24);pts.push([x,beltY(x)]);}const width=(x,y)=>{const [,cy,cw]=canopy(x),[,by,bw]=belt(x);return T.MathUtils.lerp(bw,cw,T.MathUtils.clamp((y-by)/(cy-by),0,1));};sideShape(B,roof,pts,side,width,paint);}}
 if(electric){
  const tailCrown=(x,u)=>{const [,by,bw]=belt(cEnd),[,cy,cw]=canopy(cEnd),z=Math.abs(u*bw),y=z<=cw?cy+.075*(1-(z/cw)**2):T.MathUtils.lerp(cy,by,(z-cw)/(bw-cw)),t=T.MathUtils.clamp((x-cEnd)/.75,0,1);return Math.abs(u)<.999999?T.MathUtils.lerp((y-by)/(1-u*u),.075,t):.075;};
  carSurface(B,rear,belt,cEnd,Le,paint,tailCrown);
  const x=Le-.25,[,by,bw]=belt(x);B.path(rear,[-.75,-.4,0,.4,.75].map(u=>[x,by+.075*(1-u*u)+.006,u*bw]),.022,paint);
 }else{
  const rearCrown=x=>x<2.3?.48:T.MathUtils.lerp(.48,.055,(x-2.3)/(L/2-2.3));
  carSurface(B,rear,belt,doorEnd,3.30,paint,rearCrown,-1,-.63);carSurface(B,rear,belt,doorEnd,3.30,'glass',rearCrown,-.63,.63);carSurface(B,rear,belt,doorEnd,3.30,paint,rearCrown,.63,1);carSurface(B,rear,belt,3.30,Le,paint,rearCrown);
  for(let i=0;i<8;i++){const x=1.66+i*.19,[,y,w]=belt(x);B.path(rear,[[x,y+rearCrown(x)*.61,-w*.62],[x,y+rearCrown(x)+.018,0],[x,y+rearCrown(x)*.61,w*.62]],.021,'black');}
  for(const side of [-1,1])sideShape(B,rear,[[3.22,1.52],[3.53,2.19],[4.25,2.19],[4.30,1.32]],side,()=>1.83,paint,.08);
  box0(B,rear,.65,.085,3.72,paint,[3.94,S.H-.0425,0]);
 }
 cutGroup(B,rear);cutGroup(B,roof);

 // ---------- 座舱 ----------
 const floorTop=S.floor,seatColor=electric?'black':'scarlet';
 const seatPositions=electric?[[-.55,-.68],[-.55,.68],[1.15,-.70],[1.15,0],[1.15,.70]]:[[-.10,-.62],[-.10,.62]];
 for(const [x,z]of seatPositions){const seat=subgroup(cabin);seat.name='passenger-seat';const y0=floorTop+(electric?.13:.08);
  box0(B,seat,.40,y0-floorTop+.01,.40,'dark',[x,(floorTop+y0)/2,z]);B.box(seat,.62,.15,.56,seatColor,[x,y0+.075,z],.06);
  const back=B.box(seat,.15,.70,.56,seatColor,[x+.30,y0+.42,z],.06);back.rotation.z=-.16;B.box(seat,.13,.20,.30,'dark',[x+.38,y0+.86,z],.04);
  for(const dz of [-.24,.24])B.box(seat,.50,.10,.07,'black',[x,y0+.17,z+dz],.03);}
 const dashX=doorStart+.30,dashY=beltY(dashX)-.18,dashW=mid(dashX,dashY)-.012;
 B.box(cabin,.36,.30,2*dashW,'black',[dashX,dashY,0],.05);
 const wheelAt=[dashX+.30,dashY+.10,electric?.68:.55],steerHub=B.cylinder(cabin,.06,.10,'chrome',wheelAt,'x',.06,24);steerHub.name='steering-wheel-hub';
 B.torus(cabin,electric?.20:.18,.024,'black',wheelAt,'x');for(const a of [PI/2,PI*7/6,PI*11/6])rod(B,cabin,wheelAt,[wheelAt[0],wheelAt[1]+(electric?.20:.18)*Math.sin(a),wheelAt[2]+(electric?.20:.18)*Math.cos(a)],.014,'black');
 const pinion=[front.x+ARM,front.R+.16,.30];rod(B,cabin,[wheelAt[0]-.04,wheelAt[1],wheelAt[2]],pinion,.022,'steel');
 if(electric){
  B.box(cabin,.035,.43,.77,'screen',[dashX+.20,dashY+.26,0],.01);
  B.box(cabin,1.70,.36,.30,'black',[-.35,floorTop+.18,0],.05);B.box(cabin,.025,.25,.41,'screen',[.53,floorTop+.40,0],.008);
 }else{
  B.box(cabin,.06,.16,.30,'dark',[dashX+.19,dashY+.10,.55],.02);
  B.box(cabin,2.70,.20,.40,'black',[-.05,floorTop+.10,0],.04);rod(B,cabin,[.30,floorTop+.20,0],[.22,floorTop+.42,0],.014,'chrome');sphere(B,cabin,.035,'black',[.22,floorTop+.45,0]);
 }

 // ---------- 车轮、转向节、制动与悬架（四角共用） ----------
 const corners=[];let rack=null;const tieRods=[];
 for(const [i,a]of S.axles.entries())for(const s of [-1,1]){
  const corner=`${i}${s>0?'R':'L'}`,zK=a.z-DK,K=[a.x,a.R,s*zK],rr=S.rim,R=a.R,w=a.w,zc=s*DK,zf=zc+s*.28*w;
  // 车轮：局部原点在主销与轮轴交点，轮轴为局部Z。
  const wg=wheelParts[i*2+(s>0?1:0)];place(B,wg.name,K);rigid(wg,'wheel-'+corner,wg.name);
  const tyre=B.lathe(wg,[[rr,-.47*w],[rr+.30*(R-rr),-.50*w],[R-.035,-.49*w],[R,-.40*w],[R,.40*w],[R-.035,.49*w],[rr+.30*(R-rr),.50*w],[rr,.47*w]],'rubber',[0,0,zc],'z');tyre.geometry.computeVertexNormals();tyre.name='tyre';
  B.instances(wg,new T.BoxGeometry(.010,.05,.26*w),'black',Array.from({length:96},(_,k)=>{const t=(k>>1)*TAU/48;return {p:[(R-.005)*Math.cos(t),(R-.005)*Math.sin(t),zc+(k&1?.2:-.2)*w],r:[0,0,t]};}));
  B.tube(wg,rr-.002,rr-.03,.94*w,'alloy',[0,0,zc]);for(const d of [-1,1])B.tube(wg,rr+.025,rr-.03,.03,'alloy',[0,0,zc+d*.485*w]);
  const spokeWidth=electric?.05:.12,spokeLength=rr-.02-.10,spokes=new T.BoxGeometry(spokeWidth,spokeLength,.06).translate(0,.10+spokeLength/2,0),count=electric?10:5;
  B.instances(wg,spokes,'alloy',Array.from({length:count},(_,k)=>({p:[0,0,zf],r:[0,0,k*TAU/count]})));
  B.cylinder(wg,.15,.07,'dark',[0,0,zf],'z',.15,32);
  if(electric)B.instances(wg,new T.CylinderGeometry(.022,.022,.04,6).rotateX(PI/2),'chrome',Array.from({length:5},(_,k)=>({p:[.095*Math.cos(k*TAU/5),.095*Math.sin(k*TAU/5),zf+s*.045]})));
  else B.cylinder(wg,.07,.05,'chrome',[0,0,zf+s*.05],'z',.07,6);
  axial(B,wg,.045,0,zf,'steel',[0,0,0]);sphere(B,wg,.055,'steel',[0,0,0]);
  // 转向节：轴承座、上下立柱与球铰座，绕竖直主销偏转。
  const kn=rigid(subgroup(suspension,K),'knuckle-'+corner,'wheel-knuckle');
  B.tube(kn,.085,.057,.12,'cast',[0,0,0]);for(const d of [-1,1]){box0(B,kn,.08,kp+.005-.06,.06,'cast',[0,d*(.06+kp+.005)/2,0]);B.cylinder(kn,.04,.03,'steel',[0,d*(kp+.015),0],'y',.04,24);}
  box0(B,kn,rd-.10-.07,.08,.03,'cast',[(.07+rd-.10)/2,0,s*.02]);
  if(a.steer){rod(B,kn,[-.07,0,0],[ARM+.028,0,0],.025,'cast');sphere(B,kn,.03,'steel',[ARM,0,0]);}
  // 卡钳：随转向节偏转，跨在制动盘外缘。
  const cal=rigid(subgroup(brakes,K),'knuckle-'+corner,'brake-caliper');
  for(const [z0,z1]of [[.02,.055],[.125,.16]])box0(B,cal,.145,.15,z1-z0,'redpaint',[rd-.10+.0725,0,s*(z0+z1)/2]);
  box0(B,cal,.035,.15,.14,'redpaint',[rd+.0295,0,s*.09]);
  // 制动盘与盘帽：随车轮转动，盘帽端面贴近轮毂背面。
  const disc=rigid(subgroup(brakes,K),'wheel-'+corner,'brake-disc');
  B.tube(disc,rd,rd*.55,.05,'steel',[0,0,s*.09]);const hatEnd=Math.abs(zf)-.037;axial(B,disc,rd*.55+.02,s*.09,s*hatEnd,'steel',[0,0,0],'z',32);
  // 固定的上下叉臂、球铰座、弹簧减震器与上纵梁。
  const yU=a.R+kp+.056,yL=a.R-kp-.056,zFork=s*(zK-.36),zPivot=s*(rail.z+.04);
  for(const d of [-1,1]){B.cylinder(suspension,.04,.048,'cast',[a.x,a.R+d*(kp+.056),s*zK],'y',.04,24);}
  rod(B,suspension,[a.x,yU,s*zK],[a.x,yU,zFork],.022,'steel');rod(B,suspension,[a.x,yL,s*zK],[a.x,yL,zFork],.022,'steel');
  for(const dx of [-.45,.45])rod(B,suspension,[a.x,yU,zFork],[a.x+dx,a.R+.36,s*zr],.022,'steel');
  for(const dx of [-.50,.50])rod(B,suspension,[a.x,yL,zFork],[a.x+dx,railY,zPivot],.022,'steel');
  rod(B,suspension,[a.x-.05,yL,zFork],[a.x+.30,yL,zFork],.025,'steel');
  const yb=yL+.035,cx=a.x+.20;B.cylinder(suspension,.13,.02,'steel',[cx,yb,zFork],'y',.13,32);B.spring(suspension,.095,.40,[cx,yb,zFork],'steel');B.cylinder(suspension,.13,.02,'steel',[cx,yb+.40,zFork],'y',.13,32);
  axial(B,suspension,.045,yb,yb+.32,'dark',[cx,0,zFork],'y');axial(B,suspension,.016,yb+.30,a.R+.56,'chrome',[cx,0,zFork],'y',16);
  B.box(suspension,.20,.06,.20,'cast',[cx,a.R+.58,zFork],.01);rod(B,suspension,[cx,a.R+.58,zFork],[cx,a.R+.36,s*zr],.03,'cast');
  corners.push({i,s,a,K,zK,wheel:wg,knuckle:kn,caliper:cal,disc});
 }
 if(front.steer){
  const zP=zKf-TIE,rx=front.x+ARM,ry=front.R;
  B.tube(suspension,.045,.024,2*(zP-.134),'cast',[rx,ry,0]);for(const s of [-1,1])box0(B,suspension,.10,ry-.035-rail.y1+.01,.10,'cast',[rx,(ry-.035+rail.y1-.01)/2,s*rail.z]);
  B.cylinder(suspension,.05,.15,'cast',[rx,ry+.10,.30],'y',.05,24);
  rack=rigid(subgroup(suspension,[rx,ry,0]),'steering-rack','steering-rack');axial(B,rack,.022,-zP,zP,'chrome',[0,0,0],'z',16);for(const s of [-1,1])sphere(B,rack,.03,'steel',[0,0,s*zP]);
  for(const s of [-1,1]){const t=rigid(subgroup(suspension,[rx,ry,s*zP]),'tie-rod-'+(s>0?'R':'L'),'tie-rod');B.cylinder(t,.018,TIE-.062,'steel',[0,TIE/2,0],'y',.018,16);B.cylinder(t,.026,.10,'dark',[0,TIE*.62,0],'y',.026,16);tieRods.push({g:t,s,zP});}
 }

 // ---------- 动力系统 ----------
 const halfshafts=[],rotors=[],pistons=[];let crank=null;
 for(const a of S.axles){if(!a.drive)continue;const zK=a.z-DK,c0=S.case,h=rigid(subgroup(power,[a.x,a.R,0]),'halfshaft-'+a.x.toFixed(2),'halfshaft');
  for(const s of [-1,1]){axial(B,h,.07,s*(c0+.002),s*(c0+.102),'steel',[0,0,0]);axial(B,h,.035,s*(c0+.09),s*(zK-.33),'chrome',[0,0,0],'z',16);
   axial(B,h,.035,s*(zK-.34),s*(zK-.16),'rubber',[0,0,0],'z',24,.07);axial(B,h,.03,s*(zK-.18),s*(zK-.056),'chrome',[0,0,0],'z',16);}
  halfshafts.push(h);}
 if(electric){
  for(const [n,a]of S.axles.entries()){const yK=a.R;
   box0(B,power,.45,.50,.40,'cast',[a.x+.075,yK+.03,0]);B.cylinder(power,.22,.84,'alloy',[a.x+.52,yK,0],'z',.22,48);
   B.box(power,.35,.12,.36,'dark',[a.x+.075,yK+.34,0],.02);B.cylinder(power,.035,.08,'orangepaint',[a.x+.20,yK+.41,0],'y',.035,16);
   const rotor=rigid(subgroup(power,[a.x+.52,yK,0]),'motor-rotor-'+n,'motor-rotor');for(const s of [-1,1]){axial(B,rotor,.12,s*.422,s*.452,'steel',[0,0,0],'z',32);B.instances(rotor,new T.BoxGeometry(.03,.07,.01),'dark',[0,1,2].map(k=>({p:[.07*Math.cos(k*TAU/3),.07*Math.sin(k*TAU/3),s*.456],r:[0,0,k*TAU/3]})));}
   rotors.push(rotor);}
  // 电池包：开口托盘、模块、铜排与高压线。
  const bx0=-2.30,bx1=2.05,bz=1.30,by0=S.clearance;
  box0(B,battery,bx1-bx0,.02,2*bz,'alloy',[(bx0+bx1)/2,by0+.01,0]);for(const s of [-1,1]){box0(B,battery,bx1-bx0,S.floor-.04-by0,.03,'alloy',[(bx0+bx1)/2,(by0+S.floor-.04)/2,s*(bz-.015)]);box0(B,battery,.03,S.floor-.04-by0,2*bz,'alloy',[s>0?bx1-.015:bx0+.015,(by0+S.floor-.04)/2,0]);}
  const modules=[];for(let k=0;k<8;k++)for(const z of [-.96,-.32,.32,.96])modules.push({p:[bx0+.30+k*(bx1-bx0-.60)/7,by0+.02+.085,z]});B.instances(battery,new T.BoxGeometry(.48,.17,.58),'dark',modules);
  for(const z of [-.96,-.32,.32,.96])B.path(battery,[[bx0+.10,by0+.196,z],[0,by0+.196,z],[bx1-.10,by0+.196,z]],.008,'copper');
  for(const s of [-1,1]){B.path(battery,[[bx0+.01,.40,s*.30],[bx0-.03,.62,s*.50],[front.x+.55,1.02,s*.48],[front.x+.24,front.R+.36,s*.17]],.026,'orangepaint');
   B.path(battery,[[bx1-.01,.40,s*.30],[bx1+.25,.62,s*.30],[back.x-.05,back.R+.36,s*.17]],.026,'orangepaint');}
 }else{
  const yc=.80,cr=.0695,rodL=.30,xs=[1.58,1.78,1.98,2.18];
  // 曲轴箱、油底壳、端墙与变速器壳体。
  for(const s of [-1,1])box0(B,power,.96,.28,.04,'cast',[1.88,yc-.08,s*.21]);
  box0(B,power,.96,.10,.46,'cast',[1.88,yc-.25,0]);
  for(const x of [1.42,2.34])box0(B,power,.46,.40,.04,'cast',[x,yc-.10,0],[[0,.10,.062]]).rotation.y=PI/2;
  box0(B,power,.84,.58,.50,'cast',[2.78,.71,0]);
  // 两列气缸以曲轴中心为原点，各偏45度。
  const bankPoint=(s,ax,bz)=>{const f=s*PI/4;return [yc+ax*Math.cos(f)-bz*Math.sin(f),ax*Math.sin(f)+bz*Math.cos(f)];};
  for(const s of [-1,1]){const bank=subgroup(power,[0,yc,0]);bank.rotation.x=s*PI/4;const bx=xs.map(x=>x+s*.035),x0=bx[0]-.10,x1=bx[3]+.10;
   for(const x of bx)B.tube(bank,.10,.084,.30,'cast',[x,.31,0],'y');
   for(const d of [-1,1])box0(B,bank,x1-x0,.30,.025,'cast',[(x0+x1)/2,.31,d*.1125]);
   B.box(bank,x1-x0+.02,.10,.26,'cast',[(x0+x1)/2,.51,0],.02);B.box(bank,x1-x0-.02,.08,.22,'scarlet',[(x0+x1)/2,.60,0],.03);
   for(const x of bx){const [y,z]=bankPoint(s,.51,s*.13);B.path(power,[[x,y,z],[x+.06,y-.12,s*.56],[(x+2.12)/2,.74,s*.60],[2.12,.72,s*.62]],.026,'hotmetal');}
   B.torus(power,.11,.05,'hotmetal',[2.12,.78,s*.66],'x');B.cylinder(power,.09,.10,'alloy',[2.04,.78,s*.66],'x',.09,24);
   B.path(power,[[2.12,.70,s*.64],[2.25,.50,s*.52],[2.60,.48,s*.45],[3.32,.50,s*.40]],.045,'hotmetal');
   B.path(power,[[2.00,.80,s*.64],[1.95,1.10,s*.45],[1.90,yc+.55,s*.20]],.04,'black');
  }
  B.box(power,.76,.15,.52,'alloy',[1.88,yc+.505,0],.02);for(const s of [-1,1])B.box(power,.60,.08,.40,'alloy',[1.85,yc+.61,s*.25],.02);
  B.box(power,.60,.26,1.10,'dark',[3.60,.53,0],.04);for(const z of [-.20,0,.20])axial(B,power,.05,3.86,L/2,'hotmetal',[0,.62,z],'x',24);
  // 曲轴：主轴颈只位于曲柄臂之外，平面曲轴相邻曲柄相差180度。
  crank=rigid(subgroup(power,[0,yc,0]),'crankshaft','crankshaft');
  const journals=[[1.405,xs[0]-.09],...xs.slice(0,3).map((x,i)=>[x+.09,xs[i+1]-.09]),[xs[3]+.09,2.355]];for(const [p,q]of journals)axial(B,crank,.06,p,q,'steel',[0,0,0],'x');
  xs.forEach((x,i)=>{const sign=i%2?-1:1,top=cr+.05;for(const d of [-1,1])box0(B,crank,.025,.06+top,.12,'steel',[x+d*.0825,sign*(top-.06)/2,0]);axial(B,crank,.04,x-.072,x+.072,'chrome',[0,sign*cr,0],'x');});
  for(const s of [-1,1])xs.forEach((x,i)=>{
   const p=subgroup(power),link=subgroup(power);p.name=`piston-${s}-${i}`;link.name=`rod-${s}-${i}`;p.userData.rigid=p.name;link.userData.rigid=link.name;p.rotation.x=s*PI/4;
   B.tube(p,.0815,.07,.095,'alloy',[0,-.0025,0],'y');B.cylinder(p,.0815,.025,'alloy',[0,.0525,0],'y',.0815,32);for(const y of [.036,.052])B.tube(p,.082,.076,.006,'steel',[0,y,0],'y');axial(B,p,.02,-.071,.071,'steel',[0,0,0],'x',16);
   B.tube(link,.065,.042,.06,'steel',[0,0,0],'x');box0(B,link,.03,.215,.03,'steel',[0,.1625,0]);B.tube(link,.035,.022,.04,'steel',[0,rodL,0],'x');
   pistons.push({p,link,s,i,x:x+s*.035});
  });
 }

 // ---------- 冷却 ----------
 const radX=electric?-4.40:-3.62,radY0=S.floor,radH=electric?.56:.50,radZ=electric?.85:.80;
 box0(B,thermal,.12,radH,2*radZ,'dark',[radX,radY0+radH/2,0]);
 B.instances(thermal,new T.BoxGeometry(.13,radH-.06,.012),'alloy',Array.from({length:24},(_,k)=>({p:[radX,radY0+radH/2,(k-11.5)*2*radZ/24]})));
 for(const s of [-1,1]){
  if(electric)B.path(thermal,[[radX+.05,.62,s*.40],[-3.90,.60,s*.30],[-3.42,.60,s*.13],[front.x-.14,.62,s*.10]],.035,'rubber');
  else B.path(thermal,[[radX+.05,.55,s*.62],[-2.95,.42,s*.40],[-1.60,.40,s*.12],[1.00,.40,s*.12],[1.38,.62,s*.12],[1.42,.70,s*.12]],.035,'rubber');
 }

 // ---------- 灯组与外部细节 ----------
 for(const side of [-1,1]){
  if(electric){
   const hoodY=(x,z)=>{const [,y,w]=belt(x);return y+hoodCrown*(1-(z/w)**2);};
   const front=[[-4.96,side*.84],[-4.74,side*1.40],[-4.25,side*1.70]].map(([x,z])=>[x,hoodY(x,z)+.006,z]);B.path(lights,front,.040,'dark');B.path(lights,front.map(([x,y,z])=>[x,y+.03,z]),.016,'lamp');
   const yT=beltY(L/2)-.06;B.path(lights,[[L/2-.06,yT,side*.60],[L/2-.07,yT,side*1.30],[4.75,beltY(4.75)-.06,side*(outer(4.75,beltY(4.75)-.06)-.02)]],.04,'redpaint');
  }else{
   for(const z of [.98,1.48]){B.tube(lights,.155,.128,.012,'dark',[L/2-.006,1.02,side*z],'x');B.cylinder(lights,.128,.008,z<1.2?'redpaint':'orangepaint',[L/2-.004,1.02,side*z],'x',.128,32);}
   box0(B,lights,.008,.10,.50,'lamp',[-L/2+.004,.62,side*1.20]);
   const x=-3.35,y=beltY(x),w=belt(x)[2],cap=B.box(lights,.48,.027,.54,paint,[x,y+hoodCrown*(1-(1.19/w)**2)+.02,side*1.19],.025);cap.rotation.z=.20;
   for(const [x0,x1]of [[-1.50,1.40],[3.25,4.25]]){const q=[];for(let j=0;j<=24;j++){const x=T.MathUtils.lerp(x0,x1,j/24);if(arches.every(a=>Math.hypot(x-a.x,.90-a.y)>a.r+.06))q.push([x,.90,side*(outer(x,.90)+.002)]);}if(q.length>1)B.path(lights,q,.012,'black');}
  }
  const mx=electric?-1.88:-1.47,my=beltY(mx)+.06,mw=belt(mx)[2];const arm=rod(B,lights,[mx,my,side*(mw-.005)],[mx-.08,my+.08,side*(W/2+.02)],.03,'black');arm.name='door-mirror';
  const shell=B.box(lights,.30,.13,.20,paint,[mx-.10,my+.10,side*(W/2+.11)],.05);shell.name='door-mirror';const glassM=B.box(lights,.015,.09,.15,'chrome',[mx+.055,my+.10,side*(W/2+.11)],.01);glassM.name='door-mirror';
 }

 // ---------- 运动 ----------
 const axisY=new T.Vector3(0,1,0),pin=new T.Vector3(),end=new T.Vector3(),direction=new T.Vector3(),P=new T.Vector3(),Q=new T.Vector3();
 const solveLeft=shift=>{const h=p=>TIE+shift+ARM*Math.sin(p)-Math.sqrt(TIE*TIE-(ARM*(1-Math.cos(p)))**2);let lo=-.6,hi=.6;for(let k=0;k<60;k++){const m=(lo+hi)/2;if(h(m)>0)lo=m;else hi=m;}return (lo+hi)/2;};
 return {...B,update(a,e){
  offsets(B,e);
  const psiR=front.steer?STEER*Math.sin(a*.45):0,shift=front.steer?TIE-ARM*Math.sin(psiR)-Math.sqrt(TIE*TIE-(ARM*(1-Math.cos(psiR)))**2):0,psiL=front.steer?solveLeft(shift):0;
  for(const c of corners){const psi=c.a.steer?(c.s>0?psiR:psiL):0;c.wheel.rotation.set(0,psi,-a);c.disc.rotation.set(0,psi,-a);c.knuckle.rotation.set(0,psi,0);c.caliper.rotation.set(0,psi,0);c.psi=psi;}
  if(rack){rack.position.z=shift;for(const t of tieRods){const c=corners.find(c=>c.i===0&&c.s===t.s);t.g.position.set(front.x+ARM,front.R,t.s*t.zP+shift);P.copy(t.g.position);Q.set(c.K[0]+ARM*Math.cos(c.psi),c.K[1],c.K[2]-ARM*Math.sin(c.psi));t.g.quaternion.setFromUnitVectors(axisY,direction.subVectors(Q,P).normalize());}}
  for(const h of halfshafts)h.rotation.z=-a;for(const r of rotors)r.rotation.z=a*3;
  if(crank){crank.rotation.x=a*3;
   for(const {p,link,s,i,x}of pistons){const t=a*3+i*PI,vy=Math.SQRT1_2,vz=s*Math.SQRT1_2;pin.set(x,.80+.0695*Math.cos(t),.0695*Math.sin(t));const projection=.0695*(vy*Math.cos(t)+vz*Math.sin(t)),h=projection+Math.sqrt(.30*.30-.0695*.0695+projection*projection);end.set(x,.80+vy*h,vz*h);p.position.copy(end);link.position.copy(pin);direction.subVectors(end,pin).normalize();link.quaternion.setFromUnitVectors(axisY,direction);}}
 }};
}
