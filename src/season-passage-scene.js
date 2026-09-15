import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildNightTexture, NIGHT_SPACING, visibleNightIndices, stationPoint, transitionEase } from './season-passage-model.js';
import { createSeasonGeography } from './season-geography.js';

/** An abstract arrangement of nights in depth. Its folds are authored, not geography. */
export function createSeasonPassage(container, nights, cap, onLook, stations, initialStation, onStation, onTransitionEnd) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.setClearColor('#05080f');
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('aria-label', 'A passage through nightly altitude veils. Drag to look around. Left and right arrows move between dates.');
  container.append(renderer.domElement);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(48, 1, .1, 400);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = !matchMedia('(prefers-reduced-motion: reduce)').matches; controls.dampingFactor = .055; controls.enablePan = false;
  controls.minDistance = 18; controls.maxDistance = 240; controls.minPolarAngle = .28; controls.maxPolarAngle = 1.48;
  controls.addEventListener('start', onLook);

  const base = new THREE.PlaneGeometry(1, 1, 48, 15), geo = new THREE.InstancedBufferGeometry();
  geo.index = base.index; geo.attributes = base.attributes;
  const ids = new Float32Array(64); geo.setAttribute('night', new THREE.InstancedBufferAttribute(ids, 1));
  geo.setAttribute('centre', new THREE.InstancedBufferAttribute(new Float32Array(64 * 3), 3));
  let texture, mapTexture, count = nights.length, position = 0, lastPool = -1, overview = false, lost = false;
  let anchor = initialStation, anchorPoint = new THREE.Vector3(...stationPoint(anchor)), referenceNight = 0;
  let spatial = false, transition = null, reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const uniforms = {
    profiles: { value: null }, nightCount: { value: count }, cursor: { value: 0 },
    time: { value: 0 }, gain: { value: .42 }, reach: { value: 28 },
    spaceMix: { value: 0 }, geographic: { value: 0 }, origin: { value: anchorPoint },
    anchorNight: { value: 0 }, anchorStation: { value: stations.findIndex(s => s.name === anchor.name) },
  };
  const material = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float night;attribute vec3 centre; varying vec2 vUv; varying float vNight,vSeed;
      uniform float time,spaceMix,geographic,anchorNight;uniform vec3 origin;
      void main(){vUv=uv;vNight=night;vSeed=geographic>.5?anchorNight:night;
        float blend=geographic>.5?1.:spaceMix;
        float localX=position.x*46.;float x=localX*mix(1.,9./46.,blend);
        float fold=(sin(localX*.16+vSeed*.07)*.55+sin(localX*.39-vSeed*.031)*.25)*mix(1.,9./46.,blend);
        vec3 home=geographic>.5?centre:origin;
        float depth=geographic>.5?0.:-(night-anchorNight)*${NIGHT_SPACING.toFixed(1)}*(1.-blend);
        vec3 p=home+vec3(x,uv.y*13.+.7,depth+fold);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
      }`,
    fragmentShader: `precision highp float;
      uniform sampler2D profiles;uniform float nightCount,cursor,time,gain,reach,spaceMix,geographic,anchorNight,anchorStation;
      varying vec2 vUv;varying float vNight,vSeed;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
      vec3 colour(float t){if(t<.3333)return mix(vec3(1.,.68,.30),vec3(.95,.27,.56),t*3.);
        if(t<.6667)return mix(vec3(.95,.27,.56),vec3(.40,.30,.94),(t-.3333)*3.);
        return mix(vec3(.40,.30,.94),vec3(.24,.77,.91),(t-.6667)*3.);}
      void main(){
        float band=min(14.,floor(vUv.y*15.));
        float density=texture2D(profiles,vec2((band+.5)/15.,(vNight+.5)/nightCount)).r;
        if(density<=0.)discard;
        float x=vUv.x*22.,y=vUv.y;
        float slow=noise(vec2(x*.4+time*.025,vSeed*.123));
        float folds=noise(vec2(x*1.9+slow*1.3-time*.055,y*.6+vSeed*.073));
        float threads=pow(noise(vec2(x*18.+slow*2.,y*.8+vSeed*.29)),4.);
        float structure=.045+pow(folds,3.)*.50+threads*.38;
        float edges=smoothstep(0.,.13,vUv.x)*smoothstep(0.,.13,1.-vUv.x)*smoothstep(0.,.10,1.-y);
        float distanceFade=geographic>.5?1.:mix(exp(-pow(abs(vNight-cursor)/reach,1.5)),1.,spaceMix);
        float presence=geographic>.5?(abs(vNight-anchorStation)<.1?0.:smoothstep(.25,1.,spaceMix)):
          (abs(vNight-anchorNight)<.1?1.:1.-smoothstep(0.,.75,spaceMix));
        vec3 rgb=colour(band/14.);
        float alpha=density*structure*edges*distanceFade*gain*presence;
        gl_FragColor=vec4(rgb+threads*.10,alpha);
      }`,
  });
  const veils = new THREE.Mesh(geo, material); veils.frustumCulled = false; scene.add(veils);
  const reflectionMaterial = material.clone();
  reflectionMaterial.uniforms = { ...uniforms, gain: { value: .05 } };
  const reflection = new THREE.Mesh(geo, reflectionMaterial); reflection.scale.y = -.22; reflection.position.y = .1;
  reflection.frustumCulled = false; scene.add(reflection);

  const mapGeo = new THREE.InstancedBufferGeometry(); mapGeo.index = base.index; mapGeo.attributes = { ...base.attributes };
  mapGeo.instanceCount = stations.length;
  mapGeo.setAttribute('night', new THREE.InstancedBufferAttribute(new Float32Array(stations.map((_, i) => i)), 1));
  mapGeo.setAttribute('centre', new THREE.InstancedBufferAttribute(new Float32Array(stations.flatMap(stationPoint)), 3));
  const mapMaterial = material.clone(); mapMaterial.uniforms = { ...uniforms, geographic: { value: 1 }, profiles: { value: null }, nightCount: { value: stations.length } };
  const mapVeils = new THREE.Mesh(mapGeo, mapMaterial); mapVeils.frustumCulled = false; mapVeils.visible = false; scene.add(mapVeils);
  const geography = createSeasonGeography(scene, container, stations, onStation);
  geography.setAnchor(anchor);

  // Discreet date markers carry time through gaps without drawing a bird veil.
  let markerGeo = new THREE.BufferGeometry();
  const markerMaterial = new THREE.PointsMaterial({ color: '#7b879e', size: .065, transparent: true, opacity: .5, depthWrite: false });
  const markers = new THREE.Points(markerGeo, markerMaterial); scene.add(markers);
  const ring = new THREE.Mesh(new THREE.RingGeometry(.16, .23, 32), new THREE.MeshBasicMaterial({ color: '#d7c4e3', transparent: true, opacity: .7, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(23.5, .14, 0); scene.add(ring);

  function setSource(next) {
    nights = next; count = nights.length;
    texture?.dispose(); texture = new THREE.DataTexture(buildNightTexture(nights, cap), 15, count, THREE.RedFormat, THREE.FloatType);
    texture.minFilter = texture.magFilter = THREE.NearestFilter; texture.needsUpdate = true;
    uniforms.profiles.value = texture; uniforms.nightCount.value = count;
    const points = [];
    nights.forEach((_, i) => { for (const x of [-23.5, 23.5]) points.push(x, .12, -i * NIGHT_SPACING); });
    markerGeo.dispose(); markerGeo = new THREE.BufferGeometry(); markerGeo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3)); markers.geometry = markerGeo;
    lastPool = -1;
  }
  function setPosition(next) {
    const delta = -(next - position) * NIGHT_SPACING;
    if (!spatial) { camera.position.z += delta; controls.target.z += delta; }
    position = next; uniforms.cursor.value = next;
    if (spatial && !transition) { referenceNight = Math.round(next); uniforms.anchorNight.value = referenceNight; }
    ring.position.set(anchorPoint.x + (spatial ? 0 : 23.5), .14, anchorPoint.z - (Math.round(next) - referenceNight) * NIGHT_SPACING);
    markers.position.set(anchorPoint.x, 0, anchorPoint.z + referenceNight * NIGHT_SPACING);
    if (Math.floor(next) !== lastPool) {
      const indices = visibleNightIndices(next, count); ids.fill(-1); ids.set(indices);
      geo.instanceCount = indices.length; geo.attributes.night.needsUpdate = true; lastPool = Math.floor(next);
    }
  }
  function setOverview(value) {
    overview = value; uniforms.reach.value = value ? 48 : 28;
    const z = anchorPoint.z + (referenceNight - position) * NIGHT_SPACING;
    camera.position.set(...(value ? [anchorPoint.x + 57, 36, z + 57] : [anchorPoint.x + 18, 7.6, z + 25]));
    controls.target.set(...(value ? [anchorPoint.x - 1, 3, z - 24] : [anchorPoint.x - 2, 5.2, z - 29]));
    controls.update();
  }
  function setAnchor(station) {
    const previous = anchorPoint.clone(); anchor = station; anchorPoint.copy(new THREE.Vector3(...stationPoint(station)));
    if (!spatial) { const delta = anchorPoint.clone().sub(previous); camera.position.add(delta); controls.target.add(delta); }
    uniforms.anchorStation.value = stations.findIndex(s => s.name === anchor.name); geography.setAnchor(anchor); setPosition(position);
  }
  function setGeographicProfiles(profiles) {
    mapTexture?.dispose(); mapTexture = new THREE.DataTexture(buildNightTexture(profiles, cap), 15, stations.length, THREE.RedFormat, THREE.FloatType);
    mapTexture.minFilter = mapTexture.magFilter = THREE.NearestFilter; mapTexture.needsUpdate = true;
    mapMaterial.uniforms.profiles.value = mapTexture; mapVeils.visible = true;
  }
  function applyBlend(blend) {
    uniforms.spaceMix.value = blend; geography.setOpacity(blend); geography.setEnabled(spatial && !transition);
    // One global exposure compensates for the reduced overlap as places separate.
    uniforms.gain.value = THREE.MathUtils.lerp(.42, 1.4, blend);
    markerMaterial.opacity = .5 * (1 - blend); reflectionMaterial.uniforms.gain.value = .05 * (1 - blend);
    ring.position.x = anchorPoint.x + 23.5 * (1 - blend);
    ring.scale.setScalar(1 + blend * 2);
  }
  function finishTransition() {
    if (!transition) return;
    camera.position.copy(transition.toPosition); controls.target.copy(transition.toTarget);
    transition = null; controls.enabled = true; controls.enableDamping = !reducedMotion; controls.update();
    applyBlend(spatial ? 1 : 0); onTransitionEnd();
  }
  function setSpatial(value, immediate = false) {
    if (transition || (spatial === value && !immediate)) return;
    // Rebase time and camera together so the chosen veil keeps its screen position.
    if (!spatial) {
      const nextReference = Math.round(position), delta = (nextReference - referenceNight) * NIGHT_SPACING;
      camera.position.z += delta; controls.target.z += delta;
      referenceNight = nextReference; uniforms.anchorNight.value = referenceNight;
      setPosition(position);
    }
    spatial = value; overview = false;
    const portrait = camera.aspect < 1;
    const target = value ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(anchorPoint.x - 2, 5.2, anchorPoint.z - 29);
    const eye = value ? new THREE.Vector3(portrait ? 105 : 65, portrait ? 150 : 96, portrait ? 125 : 90) : new THREE.Vector3(anchorPoint.x + 18, 7.6, anchorPoint.z + 25);
    const fromPosition = camera.position.clone(), fromTarget = controls.target.clone();
    controls.enableDamping = false; controls.update(); camera.position.copy(fromPosition); controls.target.copy(fromTarget); controls.enabled = false;
    transition = { elapsed: 0, from: uniforms.spaceMix.value, to: value ? 1 : 0, fromPosition, fromTarget, toPosition: eye, toTarget: target };
    geography.setEnabled(false);
    if (reducedMotion || immediate) finishTransition();
  }
  const resize = new ResizeObserver(() => {
    const width = container.clientWidth, height = container.clientHeight;
    renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
  }); resize.observe(container);
  renderer.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); lost = true; onLook(); container.dispatchEvent(new Event('graphics-lost')); });
  setSource(nights); setOverview(false); setPosition(0);
  return {
    canvas: renderer.domElement, setSource, setPosition, setOverview, setAnchor, setGeographicProfiles, setSpatial, finishTransition,
    setReducedMotion(value) { reducedMotion = value; controls.enableDamping = !value; if (value) finishTransition(); },
    render(time, dt = 0) { if (!lost) {
      uniforms.time.value = time;
      if (transition) {
        transition.elapsed += dt; const t = transitionEase(transition.elapsed / 3.2);
        camera.position.lerpVectors(transition.fromPosition, transition.toPosition, t); controls.target.lerpVectors(transition.fromTarget, transition.toTarget, t);
        applyBlend(THREE.MathUtils.lerp(transition.from, transition.to, t));
        if (transition.elapsed >= 3.2) finishTransition();
      }
      controls.update(); geography.update(camera); renderer.render(scene, camera);
    } },
    get spatial() { return spatial; }, get transitioning() { return transition !== null; },
    get overview() { return overview; },
    dispose() { resize.disconnect(); controls.dispose(); texture.dispose(); mapTexture?.dispose(); mapGeo.dispose(); mapMaterial.dispose(); geography.dispose(); geo.dispose(); material.dispose(); reflectionMaterial.dispose(); markerGeo.dispose(); markerMaterial.dispose(); ring.geometry.dispose(); ring.material.dispose(); renderer.dispose(); },
  };
}
