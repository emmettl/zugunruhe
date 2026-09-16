// Compare with the last rendered state, so many small changes still accumulate
// into a visible update. Used by scenes whose paused image is stationary.
export function createRenderState(epsilon = 1e-6) {
  let rendered = null, dirty = true;
  return {
    invalidate() { dirty = true; },
    changed(values) {
      if (!dirty && rendered?.length === values.length && values.every((v, i) => Math.abs(v - rendered[i]) <= epsilon)) return false;
      rendered = [...values]; dirty = false; return true;
    },
  };
}
