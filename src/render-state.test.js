import test from 'node:test';
import assert from 'node:assert/strict';
import { createRenderState } from './render-state.js';

test('stationary frames are skipped while camera, palette, resize and accumulated changes redraw', () => {
  const state = createRenderState(.001);
  assert.equal(state.changed([1, 2, 3]), true);
  assert.equal(state.changed([1, 2, 3]), false);
  assert.equal(state.changed([1.0005, 2, 3]), false);
  assert.equal(state.changed([1.0015, 2, 3]), true);
  assert.equal(state.changed([1.0015, 2, 4]), true);
  assert.equal(state.changed([1.0015, 2, 4]), false);
  state.invalidate(); assert.equal(state.changed([1.0015, 2, 4]), true);
});
