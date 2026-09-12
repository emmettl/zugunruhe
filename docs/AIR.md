# Birds and air

Separate study at `air.html`, over the existing Memmingen terrain. Opens paused
at 22:00 UTC on 3 September 2018 and isolates the 2.1 km altitude centre.
Green is processed bird density/movement; blue strands show deposited ERA5 wind.

## Source and reproduction

Run `python3 scripts/prepare-air.py data/raw/dc_zeno.zip`. The script checks the
original archive MD5 and retains the same three September nights and fifteen
1–4 km ASL bands as Cloud. It verifies the unchanged bird fields and copies `uw`
and `vw` from the same source cells. The archive remains outside Git.

Source: [Nussbaumer et al., Zenodo v3](https://zenodo.org/records/4587338), CC BY 4.0.
At pinned upstream revision `5d9d65437c4f4eec341b4bcfd7084948da6ad7ad`, the code in
`2018/Insect_removal.mlx` loads ERA5 pressure-level u/v wind at hourly, 0.25°
resolution. It converts pressure to height with a standard-atmosphere formula,
then linearly interpolates in latitude, longitude, time and altitude to radar
profiles. `2018/functions/export_zenodo.m` exports real/imaginary `ws` as `uw/vw`,
rounded to two decimals. ERA5 DOI: 10.24381/cds.bd0915c6. Only source code and
metadata were inspected, not figures, rendered notebooks or visual precedents.

Wind informs the upstream bird/insect separation; these are not independent
measurements. No causal response or individual airspeed/heading is inferred.
No further weather download, species layer or insect-density estimate is added.

The retained band-times with complete density and both vector pairs are
1460, 1548 and 1775 out of 2175 for September 2, 3 and 4 respectively. Missing
values and absent source timestamps stay unavailable. The viewer uses 19:00–04:30
within the retained 18:00–06:00 windows. No Night gap bridge is applied here.

At 22:00 UTC and 2.1 km ASL the original vectors (east, north; m/s) are:

| Night | Birds | Wind |
| --- | --- | --- |
| Sep 2 | −6.67, −5.93 | −4.91, +1.16 |
| Sep 3 | −6.36, −5.22 | +2.41, −2.11 |
| Sep 4 | −11.67, −8.71 | −1.95, +0.09 |

## Representation

Bird brightness shares the three-night maximum and common exposure across nights.
Isolating one height increases exposure ×3 for legibility; all-height exposure is ×1.
Wind strand number and brightness are illustrative, not air density. Direction
and relative texture movement follow paired vectors, using the same .022 scene
units per m/s per animation second for both flows. The field is horizontally
uniform at each band; motifs are not particles or individual trajectories.
Pausing freezes motifs. Seeking changes the sampled data without claiming to
reconstruct the historical positions of these illustrative motifs.

The inherited terrain spans 96 km and exaggerates vertical distance ×12. Only
colours/exposure and the optional wind overlay are supplied to the shared Cloud
scene; default behaviour for Cloud stays intact. The numeric readout describes
the chosen 200 m band with a toward-bearing and magnitude of the mean vector.
All heights hides that single-band readout. Both flows can be toggled independently.

Controls provides night, altitude, camera views and source notes. Night changes
hold the time and camera and pause playback. Space/P, arrows, Home/End and the
large mobile scrubber work as in the other studies. Touch directly rotates and
pinches the scene. Reduced motion freezes motifs while allowing clock playback.
Switching away pauses playback. Keyboard focus returns through nested dialogs.

Unit checks cover source preservation, component interpolation, missing values,
clock adjacency, vector bearings and the opening comparison. Browser checks cover
night/height selection, flow toggles, keyboard playback, phone sizing and notes.
