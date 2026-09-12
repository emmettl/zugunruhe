# Layers: first 3D experiment

The local Vite client opens the existing Memmingen data as a 3D volume. No new
bird dataset or prior-art visual reference was used. The earlier 2D source and
its extraction remain available under `studies/` and `scripts/`.

## Representation

- Fifteen bands span 1–4 km above sea level, using the unchanged 200 m source
  bins. Five soft sheets within each bin give its thickness a visible form.
- A fixed altitude palette runs from warm gold through pink and violet to
  cyan. The same colour belongs to the same altitude on every date.
- Shader opacity is proportional to density against the maximum across this
  complete three-night subset. Additive colour blending makes the layers
  luminous; exact values remain in the side panel. Composite pixel brightness
  is not a calibrated density reading.
- The horizontal footprint, feathered edges and streak texture are an
  illustrative spatial arrangement, not radar-sampled spatial structure. No
  particle represents a bird, and no track is reconstructed.
- Texture advection uses `ub` eastward and `vb` northward. A single common
  visual-speed multiplier preserves relative vector magnitudes. It is not
  synchronized travel distance at the playback clock's accelerated rate.
- Density and east/north velocity components interpolate linearly between
  adjacent, complete five-minute samples. Exact source timestamps retain the
  original values. Missing density removes a band; either missing velocity
  component keeps its density texture stationary. Zero density stays zero.
  Missing endpoints and non-adjacent timestamps are never bridged.
- Texture orientation turns smoothly over the shortest angular difference and
  retains its orientation at zero velocity. Advection phase is accumulated in
  texture coordinates, so changing direction does not rotate a large accumulated
  displacement. Scrubbing and night changes preserve this illustrative phase.
  The orientation easing is a display treatment; inspector values use the
  interpolated source vector directly.
- Selecting a band dims the others to 8% and reports its source density, vector
  direction toward travel, and velocity magnitude in km/h.

## Controls

Drag to orbit; scroll or pinch to zoom. Perspective, Side and Above restore
useful camera positions without altering the clock. Select any altitude row
to focus it; select again or use Show all layers to clear.

The clock advances continuously at five minutes per second of foreground playback.
The shader receives an interpolated profile every animation frame; text refreshes
at 10 Hz. Scrubbing pauses both clock and texture at fractional sample positions,
and resuming continues from that exact position. Night changes preserve the selected
clock position and band. Playback stops at the window end. The study opens at
18:00 UTC paused, holding the afterglow for inspection before Play. This also
respects reduced-motion preferences; all camera and source selection controls remain
available. On compact screens the clock follows the canvas before the band
inspector.

## Terrain anchor

Real terrain now sits below the volume: a 96 × 96 km patch centred on the
published radar coordinates, 48.0431° N, 10.2204° E. Mapzen Terrain Tiles on
[AWS](https://registry.opendata.aws/terrain-tiles/) supply the elevation grid.
`scripts/prepare-terrain.py` decodes nine zoom-9 Terrarium tiles before bilinear
sampling at 500 m spacing into a 193 × 193 grid. Rows run north to south and
columns west to east, in a local equirectangular approximation. Source URLs,
checksums, processing and attribution are recorded in
`data/provenance/memmingen-terrain.json`. The static app needs no terrain service.

Terrain and bird bands share the same kilometre-above-sea-level vertical axis.
Horizontal geography is compressed twelvefold (96 km in eight scene units),
so both terrain relief and the air column have 12× vertical exaggeration.
This is disclosed beside the scene. The elevation range is 409–1425 m; the
sample at the radar is 669 m, compared with 664 m in the radar archive's DEM.
This is a regional visual context, not a survey-grade alignment of vertical datums.
100 m contours and directional shading describe relief; the marker identifies
the radar, not the town centre. Terrain depth occludes the luminous sheets.
The horizontal bird footprint remains illustrative and does not describe coverage
or imply geographically resolved density observations.

Europe terrain produced using Copernicus data and information funded by the
European Union — EU-DEM layers; SRTM and GMTED2010 courtesy of the U.S. Geological
Survey; Austria terrain © offene Daten Österreichs — Digitales Geländemodell
(DGM) Österreich. These credits are also available in the app's data notes.

## Implementation and validation

### Dusk and dawn

SunCalc 1.9.0 calculates the solar position from each interpolated UTC timestamp
and the radar's coordinates. Its south-to-west radian azimuth is converted to
the scene's east/+x, north/−z convention. A world-oriented sky gradient and the
terrain share the same smooth light envelopes: warmth fades between solar
altitudes −1° and −12°, and the broader twilight fades by −18°. Daylight returns
at the morning end of the study; the warm horizon follows the sun to the east.
At 18:00 UTC on 4 September the sun is approximately 1.5° below the horizon,
so the opening is afterglow, without a visible solar disc.

Sky colour, haze and broad terrain illumination are artistic responses to the
calculated sun position. They do not reconstruct recorded clouds, atmospheric
conditions or terrain-cast shadows. At night the original subdued terrain light
remains for legibility. Bird-layer opacity and colour are unaffected by solar
lighting. Pause freezes the sky with the data clock; scrubbing and changing the
night recalculate it immediately. No runtime requests are needed.

Regression checks cover the western evening direction, a continuous monotonic
fade, darkness, the eastern dawn, date sensitivity and UTC/time-zone equivalence.
Browser inspection covered the opening afterglow and 19:00 twilight with no
captured graphics errors.

Three.js handles the scene and orbit camera. One instanced mesh renders the
75 soft sheets. Pixel density is capped at 1.7. Exact published
`@motionstudies/web` alpha.6 provides the shared colour tokens; specialist
radar contracts and rendering remain local. No sibling source imports are
used. The static build includes the attributed 175 KB three-night JSON subset.

Production build and JavaScript syntax checks pass. The in-app browser showed
the rendered volume with no captured graphics/runtime errors. Manual browser
checks covered scrubbing to 22:00 UTC, the 1.4–1.6 km band (55.2 birds/km³,
224° and 48 km/h on 4 September), night selection, camera presets, and the
06:00 missing-data state. A compact viewport was also inspected. These are
functional/rendering checks, not a physical-phone performance certification.

Interpolation regression checks (`npm test`) cover actual Memmingen sample
boundaries, exact endpoints, missing values, incomplete velocity pairs, gaps,
opposing flows through zero and the angular wrap at north/±180°. Source records
are not modified.

The complete source record and its interpretation limits remain in
[FIRST-STUDY.md](FIRST-STUDY.md).
