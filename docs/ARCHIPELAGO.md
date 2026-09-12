# Study 02 — Archipelago

Open `/network.html` in the local Vite server. The root Layers app and the frozen
Study 01 snapshot are retained. `npm run build` builds both editable studies.

## Representation

37 station-specific profiles on 4–5 September 2018, sharing one continuously
interpolated UTC clock. The 15 bands retain the source's 1–4 km ASL altitude
centres. Each has three softly textured sheets. Their common opacity scale is
0–100 birds/km³ (the extracted network-night maximum is 99.48). No per-station
normalization is applied. Composite light intensity is not a calibrated pixel
reading. A single instanced mesh draws all 1,665 sheets.

The 80 km soft footprints illustrate stations' vertical profiles; they do not
show spatially resolved bird densities, coverage areas or reconstructed tracks.
East/north velocities drive each altitude band's texture. Missing observations
remain missing; incomplete velocity pairs give stationary texture. The initial
study's adjacent-sample interpolation and smooth angular-turn routines are reused.
Pausing stops the data clock and illustrative advection; scrubbing preserves
advection phase. Manual camera orbit remains available.

The default Western Europe preset begins at 1,000 km altitude; Germany begins
at 500 km. The **100 km · Flyover** preset looks obliquely north from 45.5° N,
6° E toward the network. These are fixed viewpoints, not automated camera tours.
Orbit and zoom can change height; the displayed altitude is calculated above the
reference sphere, not distance to the control target. One scene unit is 100 km;
Earth radius is 6,371.0088 km. Camera motion is constrained above the higher of
20 km or the tallest displayed terrain point plus 2 km. Coordinates, layer
locations and geographic ground follow the sphere.

**True scale** puts the layers at 1–4 km. **Exaggerated ×8** multiplies their
altitudes above sea level by eight. A separate terrain relief control defaults
to ×8, with ×4 and true scale available. Extra displayed ground height at each
station lifts that entire profile uniformly, preserving station-centre clearance
at true layer scale. This is an explicit visual comparison, not a different bird
dataset. Original readings and altitude colours remain unchanged. The station selector
dims other islands and reports the complete 1–4 km mean, or unavailable when any
bin is missing. Selecting from the menu or clicking an island/marker now descends
smoothly into a close, aspect-fitted oblique view. The visible glow has a broad
hit area and small markers have a 12-pixel selection allowance; a drag or multi-touch
gesture does not select a station. Older codes without a matching current
metadata name retain their original code.

**Back to previous view** animates back to the exact camera position and orbit
target captured before entering the first station. Visiting another station keeps
that original return point, and Back also works during a descent. Selecting All
37 stations invokes the same return. Camera presets leave the station visit and
clear its return point. Each flight lasts 2.4 seconds with smooth acceleration and
deceleration; radial interpolation around Earth avoids passing through the globe.
Orbit input is suspended during the flight and restored on arrival. The data clock
and texture playback are independent of camera travel. Reduced-motion preferences
use immediate camera changes. The saved Study 01 is unchanged.

## Geography and lighting

Mapzen Terrarium zoom-6 data, sampled into a 513 × 513 grid over a nominal 2,400 km
square around 48.5° N, 6.5° E. Source rasters are decoded before bilinear sampling.
Grid spacing is 4.6875 km in the local equirectangular approximation, then positions
are placed on the sphere. This is coarse geographic context. Elevations below
sea level are clamped to sea level for this rendering. Terrain relief defaults
to ×8, with softened slope shading and faint contours every 500 m of original
elevation. The directional relief light is illustrative, independent of solar dusk.

Natural Earth 1:10m country polygons produce the land mask and thin boundaries,
retaining coastal bays, estuaries and offshore islands. Both use the same detailed
geometry, with complete regional polygon parts and their holes preserved. The
land mask is rasterized at 4096 × 4096. Border heights use bilinear DEM sampling
with a small visual offset and follow relief exaggeration. Natural Earth 1:10m
river centre lines and lake polygons supply 103 rivers and 76 lakes intersecting
the regional selection. They are painted into a 4096-pixel map and draped over
the terrain: muted blue lakes and thin river traces. River widths are enlarged
for visibility, not measured widths; lake surfaces follow the coarse ground grid,
not separately levelled water surfaces. No high-resolution imagery or satellite basemap is
implied. See `scripts/prepare-network-outlines.py`, `scripts/prepare-network-terrain.py`,
`scripts/prepare-network-water.py`
and the associated files in `data/provenance/` for source URLs and checksums.

SunCalc calculates the solar direction for the current UTC time at the coordinate
origin. Ground normals across the sphere then give the local solar elevation,
so dusk moves geographically. The twilight tint is artistic and does not reproduce
measured atmospheric conditions. Bird opacity does not depend on this ground lighting.

Geography: Natural Earth, public domain. Terrain: Mapzen / AWS, including
Copernicus EU-DEM, USGS SRTM and GMTED2010, © offene Daten Österreichs,
© Kartverket and © Environment Agency 2015. Bird data: Nussbaumer and contributors,
[Zenodo v3](https://zenodo.org/records/4587338), CC BY 4.0. Attribution is available
inside the study. No prior-art visualisations were used.

## Checks

Tests verify spherical coordinates and camera altitude, incomplete column means,
all 37 synchronized frame shapes, and every Memmingen density/velocity cell against
the preserved initial extraction. Existing temporal interpolation and solar tests
remain in the suite. Browser checks cover regional/Western European views, true
and exaggerated layers, clicking a glowing island, menu-driven descent, close
framing, the return to the previous view, playback and graphics errors. Camera
journey tests additionally cover visiting multiple stations, Back during descent,
Earth clearance, resetting via a preset, and reduced-motion endpoints.
Terrain tests cover geographic grid orientation, bilinear heights, below-sea-level
clamping and the profile lift preserving local clearance and band spacing.

The background investigation and dataset limits are in [NETWORK-STUDY.md](NETWORK-STUDY.md).
