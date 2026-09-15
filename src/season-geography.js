import * as THREE from 'three';
import outlines from '../data/processed/europe-outlines.json';
import { stationPoint } from './season-passage-model.js';

export function createSeasonGeography(scene, container, stations, onSelect) {
  const group = new THREE.Group(); group.renderOrder = -10; scene.add(group);
  const land = new THREE.MeshBasicMaterial({ color: '#101c26', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const boundary = new THREE.LineBasicMaterial({ color: '#537586', transparent: true, opacity: 0, depthWrite: false });
  const materials = [land, boundary], geometries = [];
  for (const country of outlines) {
    const polygons = country.geometry.type === 'Polygon' ? [country.geometry.coordinates] : country.geometry.coordinates;
    for (const polygon of polygons) {
      const ring = polygon[0];
      if (!ring.some(([lon, lat]) => lon >= -6 && lon <= 17 && lat >= 42 && lat <= 56)) continue;
      // Simplify only the contextual outline, retaining ordered geographic points.
      const sampled = ring.filter((_, i) => i % 4 === 0 || i === ring.length - 1);
      if (sampled.length < 4) continue;
      const points = sampled.map(([lon, lat]) => stationPoint({ lon, lat }));
      const shape = new THREE.Shape(points.map(([x, , z]) => new THREE.Vector2(x, -z)));
      const shapeGeo = new THREE.ShapeGeometry(shape); geometries.push(shapeGeo);
      const fill = new THREE.Mesh(shapeGeo, land); fill.rotation.x = -Math.PI / 2; fill.position.y = -.04; group.add(fill);
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points.map(([x, , z]) => new THREE.Vector3(x, 0, z))); geometries.push(lineGeo);
      group.add(new THREE.Line(lineGeo, boundary));
    }
  }
  const pointGeo = new THREE.BufferGeometry().setFromPoints(stations.map(s => new THREE.Vector3(...stationPoint(s)).setY(.16)));
  const pointMaterial = new THREE.PointsMaterial({ color: '#b7cbd6', size: .6, transparent: true, opacity: 0, depthWrite: false });
  group.add(new THREE.Points(pointGeo, pointMaterial)); materials.push(pointMaterial); geometries.push(pointGeo);
  const labels = [['FRANCE', 46.5, 2.2], ['GERMANY', 51, 10], ['SWITZERLAND', 46.7, 8.1], ['BELGIUM', 50.5, 4.5], ['NETHERLANDS', 52.2, 5.4]].map(([name, lat, lon]) => {
    const element = document.createElement('span'); element.className = 'season-country'; element.textContent = name; container.append(element);
    return { element, point: new THREE.Vector3(...stationPoint({ lat, lon })) };
  });
  const anchorLabel = document.createElement('span'); anchorLabel.className = 'season-anchor-label'; container.append(anchorLabel);
  let opacity = 0, enabled = false, camera, anchor = stations[0], down;
  function setOpacity(value) { opacity = value; group.visible = value > 0; land.opacity = value * .75; boundary.opacity = value * .35; pointMaterial.opacity = value * .85; }
  function place(element, point, currentCamera) {
    const p = point.clone().project(currentCamera);
    const visible = opacity > .1 && p.z > -1 && p.z < 1 && Math.abs(p.x) < 1 && Math.abs(p.y) < 1;
    element.hidden = !visible;
    if (visible) { element.style.left = `${(p.x + 1) / 2 * container.clientWidth}px`; element.style.top = `${(1 - p.y) / 2 * container.clientHeight}px`; element.style.opacity = opacity; }
  }
  function pointerDown(e) { down = [e.clientX, e.clientY]; }
  function pointerUp(e) {
    if (!enabled || !camera || !down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
    const rect = container.getBoundingClientRect(); let closest = null, distance = 22;
    for (const s of stations) {
      const p = new THREE.Vector3(...stationPoint(s)).setY(.16).project(camera);
      if (p.z < -1 || p.z > 1) continue;
      const d = Math.hypot((p.x + 1) / 2 * rect.width - (e.clientX - rect.left), (1 - p.y) / 2 * rect.height - (e.clientY - rect.top));
      if (d < distance) { closest = s; distance = d; }
    }
    if (closest) onSelect(closest.name);
  }
  container.addEventListener('pointerdown', pointerDown); container.addEventListener('pointerup', pointerUp);
  setOpacity(0);
  return {
    setOpacity, setEnabled(value) { enabled = value; },
    setAnchor(value) { anchor = value; anchorLabel.textContent = value.label; },
    update(currentCamera) { camera = currentCamera; labels.forEach(l => place(l.element, l.point, camera)); place(anchorLabel, new THREE.Vector3(...stationPoint(anchor)).add(new THREE.Vector3(0, .4, 0)), camera); },
    dispose() { geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); labels.forEach(l => l.element.remove()); anchorLabel.remove(); container.removeEventListener('pointerdown', pointerDown); container.removeEventListener('pointerup', pointerUp); scene.remove(group); },
  };
}
