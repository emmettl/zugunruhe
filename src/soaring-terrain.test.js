import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { createSoaringFlock } from './soaring-model.js';
import { createSoaringTerrain, TERRAIN_SIZE, TERRAIN_SEGMENTS, TERRAIN_SHIFT, TERRAIN_FADE } from './soaring-terrain.js';

function assertCoverage(ground, eye) {
  ground.update(eye);
  const margin = TERRAIN_SIZE / 2 - Math.max(Math.abs(eye.x - ground.mesh.position.x), Math.abs(eye.z - ground.mesh.position.z));
  assert.ok(margin > TERRAIN_FADE, `terrain edge ${margin} m away must stay beyond haze`);
}
function dispose(ground) { ground.mesh.geometry.dispose(); ground.mesh.material.dispose(); }

test('terrain covers every camera position through a three-hour flight, even after birds separate', () => {
  const flock = createSoaringFlock(), ground = createSoaringTerrain(), eye = new Vector3();
  let widestSeparation = 0;
  for (let frame = 0; frame < 3 * 3600 * 60; frame++) {
    flock.step();
    if (frame % (60 * 60)) continue;
    // Watch, then every selectable companion: the ground cannot depend on centre.
    assertCoverage(ground, eye.fromArray(flock.centre).add(new Vector3(95, 45, 150)));
    for (let bird = 0; bird < flock.count; bird++) {
      eye.fromArray(flock.position, bird * 3);
      widestSeparation = Math.max(widestSeparation, Math.abs(eye.x - flock.centre[0]));
      assertCoverage(ground, eye);
    }
  }
  assert.ok(widestSeparation > 6500 / 2, 'exercise a bird beyond the old centre-based patch');
  dispose(ground);
});

test('terrain stays covered across positive and negative tile boundaries and camera transfers', () => {
  const ground = createSoaringTerrain(), geometry = ground.mesh.geometry;
  for (const x of [-200000, -780.01, -.01, 0, 779.99, 780, 200000]) {
    for (const z of [-120000, -.01, 779.99, 120000]) assertCoverage(ground, new Vector3(x, 200, z));
  }
  assert.equal(ground.mesh.geometry, geometry, 'reuse the same bounded mesh');
  assert.equal(geometry.attributes.position.count, (TERRAIN_SEGMENTS + 1) ** 2);
  dispose(ground);
});

test('recentring preserves overlapping terrain vertices and avoids updates within a tile', () => {
  const ground = createSoaringTerrain(), points = ground.mesh.geometry.attributes.position;
  ground.update(new Vector3(0, 200, 0));
  const original = new Map();
  for (let i = 0; i < points.count; i++) original.set(`${points.getX(i)}:${points.getZ(i)}`, points.getY(i));
  const version = points.version;
  ground.update(new Vector3(20, 210, 30)); assert.equal(points.version, version);
  ground.update(new Vector3(TERRAIN_SHIFT, 200, TERRAIN_SHIFT));
  let shared = 0;
  for (let i = 0; i < points.count; i++) {
    const key = `${points.getX(i) + TERRAIN_SHIFT}:${points.getZ(i) + TERRAIN_SHIFT}`;
    if (original.has(key)) { assert.equal(points.getY(i), original.get(key)); shared++; }
  }
  assert.ok(shared > 20000, 'the visible hills retain their original vertices');
  dispose(ground);
});
