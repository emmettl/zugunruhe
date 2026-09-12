# Mobile usability pass

The four editable studies share `study-ui.js` and `study-ui.css`. Frozen study
snapshots retain their original presentation.

On screens up to 760 px wide, and landscape phones up to 1024 × 500 px:

- Study navigation occupies a separate row with 44 px targets.
- The landscape fills the space between navigation and a slim playback strip. A
  single Controls button opens a modal bottom panel containing camera presets,
  settings, night selection and explanatory text. Cloud's altitude bands appear
  there in two columns. Playback stays visible when the panel is closed.
- Settings keep their existing controls, event listeners and values. Resizing
  back to desktop restores each control to its original position.
- Scenes respond directly to touch: one finger orbits and two fingers pinch to
  zoom. Page scrolling remains available outside the scene and within settings.
  Choosing a camera preset closes the panel and returns to the scene. All primary
  touch targets retain their 44 px minimum. Station markers have a 44 px touch
  target; dragging or pinching does not count as a station tap.
- Station selection closes settings and returns to the scene with focus on Back.
  Other adjustments offer a Back to scene button.
- Timeline scrubbing has a 56 px touch area and a 44 px thumb hitbox around a
  visible 28 px handle, while the playback strip retains its compact height.
- Controls use at least 44 px heights, 16 px select text, larger labels and readable
  timelines. The page can reflow without horizontal scrolling at 320 px.

All editable studies use native modal dialogs for notes: a named dialog, modal
focus containment, Escape, focus restoration and a close button that stays
reachable while the notes scroll. Opening notes prevents background scrolling.
Reduced-motion preferences disable cosmetic transitions and the return-to-scene
scroll animation. Playback still starts paused.

Validation: local browser inspection of all four studies at phone widths,
320 × 568, 390 × 844 and 844 × 390 layouts, station selection, scrollable notes,
focus containment, settings and desktop restoration. The WebKit suite checks
mobile control sizes, horizontal overflow, panel opening, modal focus and the camera
gesture availability alongside the existing playback tests. Chromium checks the
existing desktop flows and injects native touch input at phone size to check
camera rotation, pinch zoom and suppression of station selection during gestures. These are browser-based checks, not a physical-device
VoiceOver or TalkBack audit and not a claim of full WCAG conformance.
