# Study 03 — Continent ablaze

Open `/continent.html` in the local Vite server. The island study is frozen at
`/studies/02-archipelago/`, with its source archive and checksum manifest alongside
Study 01. The editable `network.html` and all its source files remain unchanged.

## The first continuous field

The same 37 stations and 4–5 September 2018 night supply fifteen 200 m altitude
bands (centres 1.1–3.9 km ASL). A local weighted estimate joins neighbouring
profiles over Western Europe. This is an initial spatial interpolation study,
not a continent-wide forecast, reconstruction of individual paths or a
mass-conserving movement model. No new bird observations were invented.

For each band, a 0.25° grid spans 6° W–17° E, 42–56° N (93 × 57 nodes).
Great-circle distance sets a Gaussian weight with a 90 km scale. Weights smoothly
taper from 180 km to zero at 240 km. Each value is the weighted mean of available
observations within that radius; weights are renormalized after missing values
are omitted. Observed zeros remain zeros. Density is estimated separately from
velocity: east and north components use only complete velocity pairs with valid
density. Missing velocity leaves stationary illustrative texture.

The same smoother is used at radar locations, so the field does not necessarily
pass through the raw observations. The station inspector explicitly reports the
measured value. The model assumes local spatial similarity; it has no wind,
species, habitat, take-off/landing or terrain-barrier model. Estimates extend a
limited distance beyond the stations, including over water. This is not evidence
of a specific offshore crossing or a narrow migration corridor.

A display support weight is one within 120 km of the nearest available observation
and smoothly fades to zero at 240 km. This is a distance measure, not calibrated
uncertainty. An inspection toggle shows that support in cyan/amber and reveals
the observation sites. Colour in the normal view follows altitude. Density uses
a shared 0–100 birds/km³ scale; the luminosity control applies the same artistic
exposure everywhere, with a smooth global exposure reduction as the camera
descends to retain close-up detail. Neither noise nor exposure changes the estimated data.

## Motion and landscape

Adjacent five-minute estimated fields blend on the GPU. Spatial estimation can
fill a missing station value from neighbouring stations. Where either complete
spatial field endpoint is unavailable, intermediate values remain unavailable.
Textures use two overlapping advection phases to avoid a visible reset as their
positions wrap; velocity components guide their displacement at the same 300×
time compression as the data clock. Their fine streaks remain illustrative and
are not evidence of sub-grid detail. This first version does not transport the
estimated density itself or enforce conservation between frames.

The fifteen continuous meshes follow Earth's curvature. Their display geometry
uses three subdivisions per estimated grid interval to follow the ground; this
does not add information to the estimated data. Terrain and water are
reused from Archipelago. Terrain relief defaults to ×8, layer altitude to ×4.
The extra displayed ground elevation lifts the field locally; bands below actual
terrain are omitted. This is an explicitly exaggerated display, not a change to
reported altitude or density. The camera presets, station visits and Back control
are retained. Inspection is optional; normal viewing has no station markers.

## Withheld-station check

Run `node scripts/validate-continent.mjs` to reproduce
`data/processed/continent-validation.json`. For every station, exclude that entire
station from its local estimate. Compare the prediction with its observation at
30-minute intervals through the night, at all fifteen altitudes. The baseline
is the contemporaneous mean of the other stations at that altitude.

The first check gives 10,680 scored observations, 405 cases without neighbour
support and 2,790 missing observations. Mean absolute density error is **2.01
birds/km³**, versus **2.90** for the network-mean baseline. Median absolute error
is **0.45**, versus **0.75**. Kernel settings were chosen before running this check.
This is a one-night spatial prediction check, dominated in part by low densities;
it does not validate extrapolation, ecological interpretation or statistical
uncertainty. Further work should inspect errors by station, altitude and density,
and evaluate other nights before treating the estimate as a scientific product.

Unit tests cover constant fields, opposite velocities, null/zero handling,
finite support, holdout exclusion and altitude-texture layout. Browser checks
cover the shaders, temporal playback, observation support, close-up/Back and the
frozen Archipelago build. `npm run build` builds all three editable entry points.

## Provenance

Original bird profiles: [Nussbaumer and contributors, Zenodo v3](https://zenodo.org/records/4587338),
CC BY 4.0. The local field model and renderer are new to this study. Geographic
sources and processing remain as documented in [Archipelago](ARCHIPELAGO.md).
The frozen studies do not depend on the evolving shared source or new build output.
