import * as THREE from 'three';
// Uniform wind at each height, not a spatially resolved weather simulation.
export function createAirWind(scene){
  const g=new THREE.InstancedBufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute([0,-1,0,1,-1,0,1,1,0,0,1,0],3));g.setIndex([0,1,2,0,2,3]);
  const seeds=[],bands=[];let seed=41;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let band=0;band<15;band++)for(let n=0;n<42;n++){seeds.push(random()*6.4-3.2,random()*6.4-3.2);bands.push(band);}
  g.setAttribute('seed',new THREE.InstancedBufferAttribute(new Float32Array(seeds),2));g.setAttribute('band',new THREE.InstancedBufferAttribute(new Float32Array(bands),1));g.instanceCount=bands.length;
  const uniforms={flow:{value:Array.from({length:15},()=>new THREE.Vector2())},offset:{value:Array.from({length:15},()=>new THREE.Vector2())},valid:{value:Array(15).fill(0)},selected:{value:-1}};
  const m=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
    vertexShader:`attribute vec2 seed;attribute float band;uniform vec2 flow[15],offset[15];varying float layer,along,side;varying vec2 q;
    void main(){int b=int(band+.5);vec2 v=flow[b];float speed=length(v);vec2 dir=speed>.001?v/speed:vec2(1.,0.);vec2 across=vec2(-dir.y,dir.x);
      vec2 head=mod(seed+offset[b]+3.2,6.4)-3.2;q=head-dir*(1.-position.x)*(.4+speed*.045)+across*position.y*.025;
      layer=band;along=position.x;side=position.y;gl_Position=projectionMatrix*modelViewMatrix*vec4(q.x,1.1+band*.2,q.y,1.);}`,
    fragmentShader:`uniform float valid[15],selected;varying float layer,along,side;varying vec2 q;
    void main(){int b=int(layer+.5);float edge=1.-smoothstep(2.,3.1,length(q));float focus=selected<0.||abs(selected-layer)<.1?1.:.04;
      float alpha=valid[b]*edge*focus*pow(along,1.5)*exp(-side*side*3.)*.85;gl_FragColor=vec4(.35,.65,1.,alpha);}`});
  const mesh=new THREE.Mesh(g,m);mesh.frustumCulled=false;scene.add(mesh);
  return {setFrame(frame){for(let b=0;b<15;b++){const valid=Number.isFinite(frame.uw[b])&&Number.isFinite(frame.vw[b]);uniforms.valid.value[b]=valid?1:0;uniforms.flow.value[b].set(valid?frame.uw[b]:0,valid?-frame.vw[b]:0);}},
    draw(dt,playing){if(playing)for(let b=0;b<15;b++)uniforms.offset.value[b].addScaledVector(uniforms.flow.value[b],dt*.022);},
    selectBand(b){uniforms.selected.value=b;},setVisible(value){mesh.visible=value;}};
}
