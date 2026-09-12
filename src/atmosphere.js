import * as THREE from 'three';

export function createAtmosphere(scene, uniforms) {
  const sky = new THREE.Mesh(new THREE.SphereGeometry(45, 32, 16), new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide, depthWrite: false, depthTest: false,
    vertexShader: `
      varying vec3 vDirection;
      void main() {
        vDirection = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.);
      }
    `,
    fragmentShader: `
      uniform vec3 sunDirection;
      uniform float twilight;
      uniform float warmth;
      uniform float daylight;
      varying vec3 vDirection;
      void main() {
        vec3 ray = normalize(vDirection);
        vec2 sunHorizontal = normalize(sunDirection.xz);
        float towardsSun = pow(max(0., dot(normalize(ray.xz + vec2(.00001)),sunHorizontal)),4.);
        float horizon = exp(-pow((ray.y + .035) / .24,2.));
        float veil = exp(-pow((ray.y + .09) / .52,2.));
        vec3 colour = vec3(.0196,.0157,.0627);
        colour += twilight * veil * vec3(.028,.026,.065);
        colour += warmth * horizon * (vec3(.045,.017,.025) + towardsSun * vec3(.30,.105,.035));
        colour += daylight * vec3(.07,.12,.19) * (.45 + .55*max(ray.y,0.));
        gl_FragColor = vec4(colour,1.);
      }
    `,
  }));
  sky.renderOrder = -10;
  sky.frustumCulled = false;
  scene.add(sky);
  return { follow: camera => sky.position.copy(camera.position) };
}
