import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function createFlockScene(container, flock) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setClearColor('#122633');
  const canvas = renderer.domElement; canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Simulated birds banking and flowing together in a dusk sky. Drag to look around; scroll to move closer.');
  container.append(canvas);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(48, 1, .15, 2400);
  camera.position.set(55, 22, 87);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = .06; controls.enablePan = false;
  controls.minDistance = 20; controls.maxDistance = 220; controls.maxPolarAngle = Math.PI * .78;
  const v = () => new THREE.Vector3();
  const focus = v(), previousFocus = v(), direction = new THREE.Vector3(1, 0, 0), desiredPosition = v(), desiredLook = v();
  const forward = v(), right = v(), up = v(), worldUp = new THREE.Vector3(0, 1, 0), position = v();
  const matrix = new THREE.Matrix4(), orientation = new THREE.Quaternion(), roll = new THREE.Quaternion(), dummy = new THREE.Object3D();
  const bodyForward = new THREE.Vector3(0, 0, 1);
  focus.fromArray(flock.centre); previousFocus.copy(focus); camera.position.add(focus); controls.target.copy(focus);
  let mode = 'watch', selected = 0, transition = 0, trails = false, lost = false, reduced = false;
  let lastTrailTime = -1, trailHead = 0, trailSamples = 0, pointer = null;
  const look = v(), raycaster = new THREE.Raycaster(), plane = new THREE.Plane(), threatPoint = v();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1800, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 direction; void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec3 direction; void main(){vec3 d=normalize(direction);float h=d.y;
      vec3 low=vec3(.34,.32,.30),mid=vec3(.14,.23,.28),high=vec3(.025,.072,.12);
      vec3 col=mix(low,mid,smoothstep(-.14,.18,h));col=mix(col,high,smoothstep(.12,.85,h));
      float glow=pow(max(0.,dot(d,normalize(vec3(-.8,.015,-.6)))),18.);
      col+=vec3(.21,.105,.045)*glow*exp(-abs(h)*5.);
      float grain=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);
      gl_FragColor=vec4(col+(grain-.5)/255.,1.);}`,
  })); scene.add(sky);
  // An invented distant horizon offers a quiet spatial reference for flight.
  const ridge = [], ridgeColour = new THREE.Color('#233b46');
  for (let i = 0; i < 128; i++) {
    const a = i / 128 * Math.PI * 2, b = (i + 1) / 128 * Math.PI * 2;
    const height = t => -57 + Math.sin(t * 5 + .8) * 7 + Math.sin(t * 11) * 3;
    ridge.push(Math.cos(a) * 800, -1800, Math.sin(a) * 800, Math.cos(b) * 800, height(b), Math.sin(b) * 800, Math.cos(a) * 800, height(a), Math.sin(a) * 800);
    ridge.push(Math.cos(a) * 800, -1800, Math.sin(a) * 800, Math.cos(b) * 800, -1800, Math.sin(b) * 800, Math.cos(b) * 800, height(b), Math.sin(b) * 800);
  }
  const ridgeGeo = new THREE.BufferGeometry(); ridgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(ridge, 3));
  scene.add(new THREE.Mesh(ridgeGeo, new THREE.MeshBasicMaterial({ color: ridgeColour, side: THREE.DoubleSide })));

  // Local +Z is the beak, +X spans the wings. Silhouettes remain legible in a bank.
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    0,.05,.36, -.085,0,-.22, .085,0,-.22,
    -.06,0,.15, -.55,.015,-.08, -.27,0,-.25,
    -.06,0,.15, -.27,0,-.25, -.055,0,-.13,
    .06,0,.15, .27,0,-.25, .55,.015,-.08,
    .06,0,.15, .055,0,-.13, .27,0,-.25,
    -.055,0,-.15, -.13,0,-.38, .13,0,-.38,
    -.055,0,-.15, .13,0,-.38, .055,0,-.15,
  ], 3));
  geometry.setAttribute('phase', new THREE.InstancedBufferAttribute(flock.phase, 1));
  const timeUniform = { value: 0 };
  const birdMaterial = new THREE.ShaderMaterial({ side: THREE.DoubleSide, uniforms: { time: timeUniform },
    vertexShader: `attribute float phase; varying vec3 tint;varying float aspect;varying float depth;uniform float time;
      void main(){vec3 p=position;float wing=smoothstep(.065,.55,abs(p.x));
      float glide=smoothstep(-.3,.4,sin(time*.72+phase*2.));
      p.y+=wing*(sin(time*(18.+sin(phase)*2.)+phase)*.20*glide+.035);
      p.z-=wing*abs(sin(time*9.+phase))*.025*glide;
      vec4 wp=instanceMatrix*vec4(p,1.);vec3 normal=normalize(mat3(instanceMatrix)*vec3(0.,1.,0.));
      aspect=abs(dot(normal,normalize(vec3(-.5,1.,.4))));tint=instanceColor;
      vec4 view=modelViewMatrix*wp;depth=-view.z;gl_Position=projectionMatrix*view;
      }`,
    fragmentShader: `varying vec3 tint;varying float aspect;varying float depth;void main(){
      vec3 col=tint*(.38+.62*aspect);col=mix(col,vec3(.19,.27,.31),smoothstep(90.,320.,depth)*.65);
      gl_FragColor=vec4(col,1.);}`,
  });
  const birds = new THREE.InstancedMesh(geometry, birdMaterial, flock.count);
  birds.instanceMatrix.setUsage(THREE.DynamicDrawUsage); birds.frustumCulled = false;
  const colors = Array.from({ length: flock.count }, (_, i) => new THREE.Color().setHSL(.10 + .025 * Math.sin(i), .16, .61 + .12 * Math.sin(i * 7)));
  for (let i = 0; i < flock.count; i++) birds.setColorAt(i, colors[i]);
  scene.add(birds);
  const trackedIds = Array.from({ length: 18 }, (_, i) => Math.floor(i * flock.count / 18));
  const trailLength = 32, history = new Float32Array(trackedIds.length * trailLength * 3);
  const trailPositions = new Float32Array(trackedIds.length * (trailLength - 1) * 6), trailColors = new Float32Array(trailPositions.length);
  const trailGeo = new THREE.BufferGeometry(); trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3).setUsage(THREE.DynamicDrawUsage));
  trailGeo.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));
  const lines = new THREE.LineSegments(trailGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .36, depthWrite: false, blending: THREE.AdditiveBlending }));
  lines.frustumCulled = false; lines.visible = false; scene.add(lines);
  const marker = new THREE.Mesh(new THREE.RingGeometry(.45, .50, 48), new THREE.MeshBasicMaterial({ color: '#efbf80', side: THREE.DoubleSide, transparent: true, opacity: .65, depthTest: false }));
  marker.visible = false; scene.add(marker);
  const pulseRing = new THREE.Mesh(marker.geometry.clone(), marker.material.clone());
  pulseRing.visible = false; scene.add(pulseRing); let pulseAge = Infinity;
  function chooseBird() {
    let best = Infinity;
    for (let i = 0; i < flock.count; i++) {
      const k = i * 3, d = Math.hypot(flock.position[k] - flock.centre[0], flock.position[k + 1] - flock.centre[1], flock.position[k + 2] - flock.centre[2]);
      if (d < best) { best = d; selected = i; }
    }
    return selected;
  }
  chooseBird();
  function setMode(next) {
    mode = next; transition = reduced ? 0 : 1;
    controls.enabled = mode === 'watch';
    for (let i = 0; i < flock.count; i++) birds.setColorAt(i, i === selected && mode === 'follow' ? new THREE.Color('#ffd194') : colors[i]);
    birds.instanceColor.needsUpdate = true;
    if (mode === 'watch') {
      desiredPosition.copy(camera.position).sub(focus).normalize().multiplyScalar(95).add(focus);
      desiredPosition.y = focus.y + 24;
    }
  }
  function nextBird() {
    selected = (selected + 37) % flock.count; setMode(mode); return selected;
  }
  function resize() {
    const { width, height } = container.getBoundingClientRect();
    renderer.setSize(width, height, false); camera.aspect = width / Math.max(1, height); camera.updateProjectionMatrix();
  }
  const observer = new ResizeObserver(resize); observer.observe(container); resize();
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); lost = true; container.dispatchEvent(new Event('graphics-lost')); });
  function setPointer(x, y) {
    if (x === null) { pointer = null; marker.visible = false; return; }
    const rect = canvas.getBoundingClientRect(); pointer = new THREE.Vector2((x - rect.left) / rect.width * 2 - 1, 1 - (y - rect.top) / rect.height * 2);
  }
  function projectPointer(point) {
    camera.getWorldDirection(forward);
    plane.setFromNormalAndCoplanarPoint(forward, position.fromArray(flock.centre));
    raycaster.setFromCamera(point, camera);
    if (!raycaster.ray.intersectPlane(plane, threatPoint)) return null;
    return threatPoint.toArray();
  }
  function strike(x, y) {
    const rect = canvas.getBoundingClientRect();
    const point = projectPointer(new THREE.Vector2((x - rect.left) / rect.width * 2 - 1, 1 - (y - rect.top) / rect.height * 2));
    if (point) { pulseRing.position.fromArray(point); pulseRing.visible = true; pulseAge = 0; }
    return point;
  }
  function threat() {
    if (!pointer) return null;
    const point = projectPointer(pointer); if (!point) return null;
    marker.position.copy(threatPoint); marker.quaternion.copy(camera.quaternion); marker.visible = true;
    return point;
  }
  function render(dt) {
    if (lost) return;
    timeUniform.value = flock.time;
    pulseAge += dt;
    pulseRing.visible = pulseAge < 1.35;
    if (pulseRing.visible) {
      pulseRing.quaternion.copy(camera.quaternion); pulseRing.scale.setScalar(reduced ? 2 : 2 + pulseAge * 19);
      pulseRing.material.opacity = .6 * Math.pow(1 - pulseAge / 1.35, 2);
    }
    const fieldOfView = (mode === 'within' ? 68 : mode === 'follow' ? 55 : 48) + (camera.aspect < 1 ? 12 : 0);
    camera.fov += (fieldOfView - camera.fov) * (reduced ? 1 : 1 - Math.exp(-dt * 2));
    camera.updateProjectionMatrix();
    previousFocus.copy(focus); focus.lerp(position.fromArray(flock.centre), 1 - Math.exp(-dt * 2));
    if (mode === 'watch') {
      camera.position.add(position.copy(focus).sub(previousFocus)); controls.target.copy(focus);
      if (transition > .01) {
        desiredPosition.copy(camera.position).sub(focus).normalize().multiplyScalar(95).add(focus); desiredPosition.y = focus.y + 24;
        camera.position.lerp(desiredPosition, 1 - Math.exp(-dt * 1.3));
        camera.up.lerp(worldUp, 1 - Math.exp(-dt * 2));
        transition *= Math.exp(-dt * 1.3);
      }
      controls.update(); look.copy(focus);
    } else {
      const k = selected * 3;
      position.fromArray(flock.position, k); forward.fromArray(flock.velocity, k).normalize();
      direction.lerp(forward, 1 - Math.exp(-dt * .95)).normalize();
      right.crossVectors(worldUp, direction).normalize();
      const distance = mode === 'follow' ? 12 : 3.2, height = mode === 'follow' ? 3.2 : .35;
      desiredPosition.copy(position).addScaledVector(direction, -distance).addScaledVector(right, mode === 'follow' ? 4 : 1.5); desiredPosition.y += height;
      desiredLook.copy(position).addScaledVector(direction, mode === 'follow' ? 5 : 22);
      const response = reduced ? 1 : 1 - Math.exp(-dt * (transition > .015 ? .9 : 2.6));
      camera.position.lerp(desiredPosition, response); look.lerp(desiredLook, response);
      // Only a suggestion of the bird's roll. The horizon stays comfortable.
      up.copy(worldUp).addScaledVector(right, reduced ? 0 : Math.sin(flock.bank[selected]) * .15).normalize();
      camera.up.lerp(up, 1 - Math.exp(-dt)); camera.lookAt(look);
      transition *= Math.exp(-dt * .9);
    }
    sky.position.copy(camera.position);
    for (let i = 0; i < flock.count; i++) {
      const k = i * 3;
      forward.fromArray(flock.velocity, k).normalize(); right.crossVectors(worldUp, forward).normalize(); up.crossVectors(forward, right);
      matrix.makeBasis(right, up, forward); orientation.setFromRotationMatrix(matrix);
      roll.setFromAxisAngle(bodyForward, flock.bank[i]); orientation.multiply(roll);
      dummy.position.fromArray(flock.position, k); dummy.quaternion.copy(orientation); dummy.scale.setScalar(1.05 + .12 * Math.sin(flock.phase[i])); dummy.updateMatrix(); birds.setMatrixAt(i, dummy.matrix);
    }
    birds.instanceMatrix.needsUpdate = true;
    if (flock.time - lastTrailTime >= .05) {
      for (let i = 0; i < trackedIds.length; i++) {
        const bird = trackedIds[i] * 3, h = (i * trailLength + trailHead) * 3;
        history.set(flock.position.subarray(bird, bird + 3), h);
      }
      trailHead = (trailHead + 1) % trailLength; trailSamples = Math.min(trailLength, trailSamples + 1); lastTrailTime = flock.time;
    }
    if (trails) {
      let out = 0;
      for (let i = 0; i < trackedIds.length; i++) for (let j = 1; j < trailSamples; j++) {
        const a = (i * trailLength + (trailHead - j + trailLength) % trailLength) * 3;
        const b = (i * trailLength + (trailHead - j - 1 + trailLength) % trailLength) * 3;
        const fade = Math.pow(1 - j / trailLength, 1.8);
        trailPositions.set(history.subarray(a, a + 3), out); trailPositions.set(history.subarray(b, b + 3), out + 3);
        for (let t = 0; t < 6; t++) trailColors[out + t] = fade * (t % 3 === 0 ? .68 : t % 3 === 1 ? .75 : .8);
        out += 6;
      }
      trailGeo.setDrawRange(0, out / 3); trailGeo.attributes.position.needsUpdate = true; trailGeo.attributes.color.needsUpdate = true;
    }
    renderer.render(scene, camera);
  }
  return { canvas, render, setMode, nextBird, setPointer, threat, strike, get selected() { return selected; },
    setTrails(value) { trails = value; lines.visible = value; },
    setReduced(value) { reduced = value; controls.enableDamping = !value; },
    dispose() { observer.disconnect(); controls.dispose(); scene.traverse(object => { object.geometry?.dispose(); object.material?.dispose(); }); renderer.dispose(); },
  };
}
