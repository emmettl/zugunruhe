import * as THREE from 'three';
import terrain from '../data/processed/network-terrain.json';
import outlines from '../data/processed/europe-outlines.json';
import water from '../data/processed/network-water.json';
import { R,globePoint } from './network-geo.js';
import { terrainSampler } from './network-terrain.js';

export function createNetworkLandscape(scene,sunDirection){
  const {heightAt,latSpan,lonSpan,west,north}=terrainSampler(terrain);
  const relief={value:8};
  const resolution=4096;
  function canvas(){const c=document.createElement('canvas');c.width=c.height=resolution;const ctx=c.getContext('2d');ctx.fillStyle='#000';ctx.fillRect(0,0,resolution,resolution);return[c,ctx];}
  function path(ctx,coords){coords.forEach(([lon,lat],i)=>{const x=(lon-west)/lonSpan*resolution,y=(north-lat)/latSpan*resolution;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});}
  const [landCanvas,landCtx]=canvas();landCtx.fillStyle='#fff';
  for(const country of outlines){
    const polygons=country.geometry.type==='Polygon'?[country.geometry.coordinates]:country.geometry.coordinates;
    for(const polygon of polygons){landCtx.beginPath();for(const ring of polygon){path(landCtx,ring);landCtx.closePath();}landCtx.fill('evenodd');}
  }
  const [waterCanvas,waterCtx]=canvas();waterCtx.lineCap='round';waterCtx.lineJoin='round';
  for(const river of water.rivers){
    const lines=river.geometry.type==='LineString'?[river.geometry.coordinates]:river.geometry.coordinates;
    waterCtx.strokeStyle='#ff0000';waterCtx.lineWidth=river.rank<=4?1.6:1.0;
    for(const line of lines){waterCtx.beginPath();path(waterCtx,line);waterCtx.stroke();}
  }
  waterCtx.fillStyle='#00ff00';
  for(const lake of water.lakes){
    const polygons=lake.geometry.type==='Polygon'?[lake.geometry.coordinates]:lake.geometry.coordinates;
    for(const polygon of polygons){waterCtx.beginPath();for(const ring of polygon){path(waterCtx,ring);waterCtx.closePath();}waterCtx.fill('evenodd');}
  }
  const size=terrain.size,positions=[],uv=[],heights=[],indices=[];
  for(let row=0;row<size;row++)for(let col=0;col<size;col++){
    const lat=north-row/(size-1)*latSpan,lon=west+col/(size-1)*lonSpan,h=Math.max(0,terrain.elevationMetres[row*size+col])/1000;
    positions.push(...globePoint(lat,lon,h+.02));heights.push(h/100);uv.push(col/(size-1),1-row/(size-1));
    if(row<size-1&&col<size-1){const a=row*size+col;indices.push(a,a+size,a+1,a+1,a+size,a+size+1);}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('height',new THREE.Float32BufferAttribute(heights,1));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  const material=new THREE.ShaderMaterial({uniforms:{landMask:{value:new THREE.CanvasTexture(landCanvas)},waterMask:{value:new THREE.CanvasTexture(waterCanvas)},sunDirection,relief},
    vertexShader:`attribute float height;uniform float relief;varying vec2 vUv;varying vec3 vNormal;varying vec3 vRadial;varying float vHeight;
      void main(){vUv=uv;vHeight=height*100.;vec3 earth=vec3(0.,-${R},0.);vRadial=normalize(position-earth);float radialNormal=dot(normal,vRadial);vNormal=normalize((normal-vRadial*radialNormal)*relief+vRadial*radialNormal);vec3 p=earth+vRadial*(${R}+height*relief+.0002);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader:`uniform sampler2D landMask,waterMask;uniform vec3 sunDirection;varying vec2 vUv;varying vec3 vNormal,vRadial;varying float vHeight;
      void main(){float land=texture2D(landMask,vUv).r;vec2 water=texture2D(waterMask,vUv).rg;
        vec3 normal=normalize(vNormal);
        float solar=dot(vRadial,sunDirection),dusk=smoothstep(-.25,0.,solar)*(1.-smoothstep(0.,.2,solar)),day=smoothstep(-.04,.15,solar);
        float slopeLight=max(0.,dot(normal,normalize(vec3(-.65,.7,-.35))));
        float shade=.24+1.05*slopeLight;
        vec3 low=vec3(.065,.083,.079),high=vec3(.13,.14,.145);
        vec3 ground=mix(low,high,smoothstep(.25,2.8,vHeight))*shade;
        ground+=day*vec3(.065,.075,.06)*shade+dusk*vec3(.07,.029,.012)*shade;
        float level=vHeight*2.;float contour=1.-smoothstep(0.,max(fwidth(level)*1.4,.035),abs(fract(level+.5)-.5));
        ground+=vec3(.018,.027,.027)*contour*smoothstep(.15,.6,vHeight);
        vec3 ocean=vec3(.022,.036,.052)+day*vec3(.015,.025,.035);
        vec3 lake=vec3(.039,.094,.112)+day*vec3(.012,.024,.025);
        ground=mix(ground,lake,water.g*.92);
        ground=mix(ground,vec3(.13,.22,.235),water.r*.62*(1.-water.g));
        gl_FragColor=vec4(mix(ocean,ground,land),1.);
      }`});
  const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;scene.add(mesh);

  // Keep political borders quieter than physical geography and drape them too.
  const borders=[],borderHeights=[];
  for(const country of outlines){const polygons=country.geometry.type==='Polygon'?[country.geometry.coordinates]:country.geometry.coordinates;
    for(const polygon of polygons)for(const ring of polygon)for(let i=1;i<ring.length;i++){
      const a=ring[i-1],b=ring[i];if([a,b].some(([lon,lat])=>lon<west||lon>west+lonSpan||lat>north||lat<north-latSpan))continue;
      const steps=Math.max(1,Math.ceil(Math.hypot(a[0]-b[0],a[1]-b[1])/.025));
      for(let j=0;j<steps;j++)for(const t of [j/steps,(j+1)/steps]){const lon=a[0]+(b[0]-a[0])*t,lat=a[1]+(b[1]-a[1])*t,h=heightAt(lat,lon);
        borders.push(...globePoint(lat,lon,h));borderHeights.push(h/100);
      }
    }
  }
  const borderGeometry=new THREE.BufferGeometry();borderGeometry.setAttribute('position',new THREE.Float32BufferAttribute(borders,3));borderGeometry.setAttribute('height',new THREE.Float32BufferAttribute(borderHeights,1));
  const borderMaterial=new THREE.ShaderMaterial({uniforms:{relief},transparent:true,depthWrite:false,
    vertexShader:`attribute float height;uniform float relief;void main(){vec3 e=vec3(0.,-${R},0.);vec3 p=e+normalize(position-e)*(${R}+height*relief+.002);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader:'void main(){gl_FragColor=vec4(.30,.37,.39,.10);}' });
  scene.add(new THREE.LineSegments(borderGeometry,borderMaterial));
  return {heightAt,relief,geometry,bounds:{west,north,latSpan,lonSpan},maxHeightKm:terrain.elevationMetres.reduce((max,h)=>Math.max(max,h),0)/1000};
}
