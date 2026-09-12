import * as THREE from 'three';
import terrain from '../data/processed/memmingen-terrain.json';

// 8 scene units span 96 km horizontally; one vertical unit remains 1 km ASL.
export const terrainWidth = 8;
export function createTerrain(scene, lighting) {
  const { size, elevationMetres } = terrain;
  const geometry = new THREE.PlaneGeometry(terrainWidth, terrainWidth, size - 1, size - 1);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) positions.setY(i, elevationMetres[i] / 1000);
  geometry.computeVertexNormals();
  const material = new THREE.ShaderMaterial({
    uniforms: lighting,
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPoint;
      void main() {
        vNormal = normal;
        vPoint = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 sunDirection;
      uniform float twilight;
      uniform float warmth;
      uniform float daylight;
      varying vec3 vNormal;
      varying vec3 vPoint;
      void main() {
        float light = max(0., dot(normalize(vNormal), normalize(vec3(-.7, 1., -.4))));
        float heightTint = smoothstep(.4, 1.7, vPoint.y);
        vec3 base = mix(vec3(.055,.073,.076), vec3(.17,.18,.18), heightTint);
        base *= .48 + light * .85;
        // Broad directional afterglow, not a cast-shadow or weather simulation.
        vec3 eveningDirection = normalize(vec3(sunDirection.x,.3,sunDirection.z));
        float facing = max(0.,dot(normalize(vNormal),eveningDirection));
        base += twilight * vec3(.028,.026,.048) * (.5 + light*.5);
        base += warmth * vec3(.28,.125,.046) * (.20 + facing*.80);
        base += daylight * vec3(.15,.17,.16) * (.3 + max(0.,dot(normalize(vNormal),sunDirection)));
        // Fine 100 m contours, with a slightly stronger 500 m interval.
        float h = vPoint.y * 10.;
        float contour = 1. - smoothstep(.0, max(fwidth(h)*1.1,.025), abs(fract(h+.5)-.5));
        float major = 1. - smoothstep(.0, max(fwidth(h*.2)*1.3,.012), abs(fract(h*.2+.5)-.5));
        base += vec3(.045,.057,.06) * (contour*.45 + major*.55);
        float edge = 1. - smoothstep(3.65,4.,max(abs(vPoint.x),abs(vPoint.z)));
        float westGlow = pow(max(0.,dot(normalize(vPoint.xz+vec2(.00001)),normalize(sunDirection.xz))),4.);
        vec3 edgeColour = vec3(.02,.016,.063) + twilight*vec3(.012,.01,.024)
          + warmth*westGlow*vec3(.04,.013,.009);
        gl_FragColor = vec4(mix(edgeColour,base,edge),1.);
      }
    `,
    polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
  });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  const ground = elevationMetres[(elevationMetres.length - 1) / 2] / 1000;
  const markerMaterial = new THREE.MeshBasicMaterial({ color: '#d3dcd9' });
  const marker = new THREE.Mesh(new THREE.SphereGeometry(.035, 12, 8), markerMaterial);
  marker.position.set(0, ground + .04, 0); scene.add(marker);
  const ring = new THREE.Mesh(new THREE.RingGeometry(.08,.088,48), markerMaterial);
  ring.rotation.x = -Math.PI / 2; ring.position.set(0,ground+.045,0);scene.add(ring);
  const stem = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0,ground+.04,0),new THREE.Vector3(0,ground+.33,0)
  ]),new THREE.LineBasicMaterial({color:'#bccbc9',transparent:true,opacity:.55}));
  scene.add(stem);
  return { radarLabel: new THREE.Vector3(0,ground+.43,0) };
}
