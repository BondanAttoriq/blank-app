import * as THREE from 'three';

const worldView = new THREE.Matrix4();
const mvp = new THREE.Matrix4();
const transformed = new THREE.Matrix4();
const instance = new THREE.Matrix4();
const light = new THREE.Vector3(-.35,.8,.46).normalize();

function indexMesh(g) {
  const positions=g.attributes.position;
  if(!g.boundingBox)g.computeBoundingBox();
  const source=g.index?.array;
  const count=source?source.length:positions.count;
  const simple=count<810;
  const next = [];
  const map=new Uint32Array(positions.count);
  if(simple){
    for(let i=0;i<positions.count;i++){
      map[i]=i;next.push(positions.getX(i),positions.getY(i),positions.getZ(i));
    }
  }else{
    if(!g.boundingBox)g.computeBoundingBox();
    const lo=g.boundingBox.min,hi=g.boundingBox.max;
    const cap=count>42000?8:11;
    const q=[hi.x-lo.x,hi.y-lo.y,hi.z-lo.z].map(a=>cap/Math.max(.0001,a));
    const lut = new Map(), hits=[];
    for(let i=0;i<positions.count;i++){
      const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
      const ix=Math.round((x-lo.x)*q[0]),iy=Math.round((y-lo.y)*q[1]),iz=Math.round((z-lo.z)*q[2]);
      const key=ix*256+iy*16+iz;
      let id=lut.get(key);
      if(id===undefined){id=hits.length;lut.set(key,id);hits.push(0);next.push(0,0,0);}
      map[i]=id;
      hits[id]++;
      next[id*3]+=x;next[id*3+1]+=y;next[id*3+2]+=z;
    }
    for(let i=0;i<hits.length;i++){
      next[i*3]/=hits[i];next[i*3+1]/=hits[i];next[i*3+2]/=hits[i];
    }
  }
  const faces=[],normal=[];
  const found=new Set();
  for(let i=0;i+2<count;i+=3){
    const a=map[source?source[i]:i], b=map[source?source[i+1]:i+1], c=map[source?source[i+2]:i+2];
    if(a===b||b===c||c===a)continue;
    if(!simple){
      const key=[a,b,c].sort((x,y)=>x-y).join(':');
      if(found.has(key))continue;
      found.add(key);
    }
    const ax=next[b*3]-next[a*3],ay=next[b*3+1]-next[a*3+1],az=next[b*3+2]-next[a*3+2];
    const bx=next[c*3]-next[a*3],by=next[c*3+1]-next[a*3+1],bz=next[c*3+2]-next[a*3+2];
    const x=ay*bz-az*by,y=az*bx-ax*bz,z=ax*by-ay*bx,d=Math.hypot(x,y,z);
    if(d<1e-10)continue;
    faces.push(a,b,c);
    normal.push(x/d,y/d,z/d);
  }
  return {vertices:new Float32Array(next),faces:new Uint32Array(faces),normals:new Float32Array(normal),point2:new Float32Array(next.length)};
}
function baseColor(o) {
  const m=o.material;
  const n=(o.name||'').toLowerCase();
  const mName=(m.name||'').toLowerCase();
  const name=n+' '+mName;
  const mapped=[
    [/waduk|permukaan_air|air_waduk/,'#4B9FB0'],
    [/aspal|jalan/,'#62747B'],
    [/rumput|daun|tajuk|grass/,'#6E9369'],
    [/kerikil|gravel|paving|beton/,'#B3BBB8'],
    [/atap_seng|galvanis|cladding/,'#9EADB1'],
    [/digester/,'#829F9A'],
  ].find(([r])=>r.test(name));
  const isDim=m.transparent&&m.opacity<.45;
  let c=mapped&&m.map ? new THREE.Color(mapped[1]) : (m.color||new THREE.Color('#ABB8BA')).clone();
  if(isDim)c.lerp(new THREE.Color('#CBDAD8'),.69);
  return c.convertLinearToSRGB();
}
function shade(v, multiplier) {
  return Math.max(0,Math.min(252,Math.round(v*255*multiplier)));
}

export class CanvasSceneRenderer {
  constructor(){
    this.domElement=document.createElement('canvas');
    this.ctx=this.domElement.getContext('2d',{alpha:false});
    if(!this.ctx)throw Error('Konteks gambar tidak dapat dibuat');
    this.cache=new WeakMap();
    this.prev=null;
    this.dirty=true;
  }
  setSize(w,h){
    const factor=Math.min(1,1050/Math.max(w,h));
    const wi=Math.max(1,Math.round(w*factor)),hi=Math.max(1,Math.round(h*factor));
    if(this.domElement.width!==wi||this.domElement.height!==hi){
      this.domElement.width=wi;this.domElement.height=hi;this.dirty=true;
    }
  }
  render(scene, camera){
    camera.updateMatrixWorld();
    const matView=worldView.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
    const sig=matView.elements;
    if(!this.dirty && this.prev && sig.every((x,i)=>Math.abs(x-this.prev[i])<.000037))return;
    this.prev=sig.slice();
    this.dirty=false;
    const ctx=this.ctx,w=this.domElement.width,h=this.domElement.height;
    ctx.globalAlpha=1;ctx.fillStyle='#dbe8e6';ctx.fillRect(0,0,w,h);
    scene.updateMatrixWorld(true);
    const drawn=[];
    scene.traverseVisible(o=>{
      if(!o.isMesh||!o.geometry.attributes.position||Array.isArray(o.material))return;
      if(!this.cache.has(o.geometry))this.cache.set(o.geometry,indexMesh(o.geometry));
      const geo=this.cache.get(o.geometry),c=baseColor(o);
      const m=o.material;
      const b=o.geometry.boundingBox.getSize(new THREE.Vector3());
      const ground=o.userData.groundProxy||(/waduk|lahan|kerikil|aspal|jalan|bukit|sawah/i.test(o.name||'')&&b.y<6&&Math.max(b.x,b.z)>25);
      if(o.userData.largeSurface)return;
      const offset=ground?(o.userData.groundProxy?20:10):0;
      const α=m.transparent ? m.opacity : 1;
      if(o.isInstancedMesh){
        for(let i=0;i<o.count;i++){
          o.getMatrixAt(i,instance);transformed.multiplyMatrices(o.matrixWorld,instance);add(geo,transformed,c,α,o,offset);
        }
      }else add(geo,o.matrixWorld,c,α,o,offset);
    });
    function add(geo,world,col,α,o,offset){
      const {vertices:v,faces:f,normals:n,point2:p}=geo;
      const e=mvp.multiplyMatrices(matView,world).elements;
      const we=world.elements;
      let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
      for(let i=0;i<v.length;i+=3){
        const x=v[i],y=v[i+1],z=v[i+2],q=e[3]*x+e[7]*y+e[11]*z+e[15];
        if(q<=.05){p[i]=p[i+1]=0;p[i+2]=Infinity;continue;}
        const px=p[i]=w*.5*(1+(e[0]*x+e[4]*y+e[8]*z+e[12])/q);
        const py=p[i+1]=h*.5*(1-(e[1]*x+e[5]*y+e[9]*z+e[13])/q);
        p[i+2]=(e[2]*x+e[6]*y+e[10]*z+e[14])/q;
        minX=Math.min(minX,px);maxX=Math.max(maxX,px);minY=Math.min(minY,py);maxY=Math.max(maxY,py);
      }
      if(minX>w||maxX<0||minY>h||maxY<0)return;
      const normalLight=[we[0]*light.x+we[1]*light.y+we[2]*light.z,
        we[4]*light.x+we[5]*light.y+we[6]*light.z,we[8]*light.x+we[9]*light.y+we[10]*light.z];
      for(let i=0;i< f.length;i+=3){
        const a=3*f[i],b=3*f[i+1],c=3*f[i+2];
        const z=(p[a+2]+p[b+2]+p[c+2])/3;
        if(z>1||z<-1||!Number.isFinite(z))continue;
        const ax=p[a],ay=p[a+1],bx=p[b],by=p[b+1],cx=p[c],cy=p[c+1];
        if((ax<0&&bx<0&&cx<0)||(ax>w&&bx>w&&cx>w)||(ay<0&&by<0&&cy<0)||(ay>h&&by>h&&cy>h))continue;
        const winding=(bx-ax)*(cy-ay)-(by-ay)*(cx-ax);
        if(winding>0&&o.material.side!==THREE.DoubleSide||Math.abs(winding)<.14)continue;
        const lum=o.material.isMeshBasicMaterial?1:.77+.23*Math.max(0,normalLight[0]*n[i]+normalLight[1]*n[i+1]+normalLight[2]*n[i+2])/
          Math.max(1,Math.hypot(...normalLight));
        const fill='rgb('+shade(col.r,lum)+','+shade(col.g,lum)+','+shade(col.b,lum)+')';
        drawn.push([z+offset+(o.material.isMeshBasicMaterial?-.000035:0),ax,ay,bx,by,cx,cy,fill,α]);
      }
    }
    drawn.sort((a,b)=>b[0]-a[0]);
    for(const [,a,b,c,d,e,f,color,α] of drawn){
      ctx.globalAlpha=α;ctx.fillStyle=color;
      ctx.beginPath();ctx.moveTo(a,b);ctx.lineTo(c,d);ctx.lineTo(e,f);ctx.closePath();ctx.fill();
      if(α===1){ctx.strokeStyle=color;ctx.lineWidth=.48;ctx.stroke();}
    }
    ctx.globalAlpha=1;
  }
}
