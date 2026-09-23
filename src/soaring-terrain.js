import * as THREE from 'three';

export const TERRAIN_SIZE = 10400;
export const TERRAIN_SEGMENTS = 160;
export const TERRAIN_SHIFT = 780;
export const TERRAIN_FADE = 4100;
const groundHeight = (x, z) => 12 + 13 * Math.sin(x / 310) * Math.cos(z / 260) + 6 * Math.sin(z / 95 + x / 420);

export function createSoaringTerrain() {
  const geometry = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, TERRAIN_SEGMENTS, TERRAIN_SEGMENTS);
  geometry.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geometry, new THREE.ShaderMaterial({
    transparent: true,
    uniforms: { fogColour: { value: new THREE.Color('#d5dfd8') }, fadeDistance: { value: TERRAIN_FADE } },
    vertexShader: `varying vec3 world, viewPosition;
      void main(){world=(modelMatrix*vec4(position,1.)).xyz;vec4 p=modelViewMatrix*vec4(position,1.);viewPosition=p.xyz;gl_Position=projectionMatrix*p;}`,
    fragmentShader: `varying vec3 world, viewPosition;uniform vec3 fogColour;uniform float fadeDistance;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      void main(){vec2 p=world.xz;vec2 fields=vec2(p.x/125.+sin(p.y/600.)*.6,p.y/90.+sin(p.x/420.)*.4);float seed=hash(floor(fields));
        vec3 colour=mix(vec3(.40,.49,.36),vec3(.66,.61,.40),seed);
        vec2 edge=abs(fract(fields)-.5);float hedge=smoothstep(.478,.498,max(edge.x,edge.y));colour*=1.-hedge*.13;
        float river=abs(p.y-210.-sin(p.x/420.)*115.-sin(p.x/170.)*24.);colour=mix(vec3(.44,.57,.55),colour,smoothstep(12.,20.,river));
        colour*=.94+.06*sin(p.x/310.)*cos(p.y/260.);
        float distance=length(viewPosition);
        colour=mix(colour,fogColour,smoothstep(350.,fadeDistance,distance));
        gl_FragColor=vec4(colour,1.-smoothstep(fadeDistance-300.,fadeDistance,distance));}`,
  }));
  // Blend the distant ground before the transparent lift and flight-path guides.
  mesh.renderOrder = -1;
  let tileX, tileZ;
  return { mesh,
    update(cameraPosition) {
      // Follow the actual eye in every view, including travel between distant birds.
      // The patch extends beyond the radial haze even just before a tile shift.
      const x = Math.floor(cameraPosition.x / TERRAIN_SHIFT) * TERRAIN_SHIFT;
      const z = Math.floor(cameraPosition.z / TERRAIN_SHIFT) * TERRAIN_SHIFT;
      if (x === tileX && z === tileZ) return;
      tileX = x; tileZ = z; mesh.position.set(x, 0, z);
      const points = geometry.attributes.position;
      // Shifts are whole mesh cells: overlapping hills keep the same triangles.
      for (let i = 0; i < points.count; i++) points.setY(i, groundHeight(points.getX(i) + x, points.getZ(i) + z));
      points.needsUpdate = true; geometry.computeBoundingSphere();
    },
  };
}
