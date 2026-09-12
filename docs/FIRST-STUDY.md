# First study: three nights near the Alpine foreland

## Working direction

Begin with Swiss or adjacent habitats, a small real dataset and simple views of
flow and density. Let the owner's response to the data determine the visual
language. Do not research, open or present existing migration visualisations,
artworks or design precedents. Read source metadata, measurement methods and
processing code only as needed for faithful interpretation.

## Source

Raphaël Nussbaumer and contributors, **Vertical profiles time series of bird
density and flight speed vector (01.01.2018–01.01.2019)**, version 3.
[Zenodo record](https://zenodo.org/records/4587338), DOI
[10.5281/zenodo.4587338](https://doi.org/10.5281/zenodo.4587338).
The repository API explicitly records **CC BY 4.0**, open access. Metadata was
retrieved on 11 September 2026 and retained under `data/provenance/`.

Original archive: `dc_zeno.zip`, 320,773,053 bytes,
MD5 `09673506cbc2ed31f3d7a016ebb32cfb` (verified before extraction).
Download from the file link in the Zenodo record. Keep the complete archive
outside Git; `data/raw/` is ignored.

The first extraction uses `dc_demem.json` and `time.json` only. The archive
contains 37 radars. Memmingen is in southern Germany, northeast of Lake
Constance; it represents the air sampled around that radar, not Swiss coverage.
Use coordinates from this dated artifact: **48.0431° N, 10.2204° E**;
antenna 725 m ASL, terrain reference 664 m ASL. Current radar catalogues can
differ slightly and must not silently replace historical metadata.

## Time, altitude and evidence

- The actual time array has **46,508 timestamps**, from 12 February to 31
  December 2018. The record's illustrative array dimensions differ from the
  actual files. Arrays are **altitude × time**, verified against the data.
- Source profiles are on a five-minute grid. The export removes timestamps
  without density anywhere in the network. An absent timestamp or a site's
  null value remains unavailable; it never becomes zero.
- Times are interpreted as UTC, consistent with the filename-based radar
  ingestion and UTC astronomical calculations in the source preparation.
  September local civil time is UTC+2. The view shows UTC explicitly.
- Altitude bins are centred at 100, 300, …, 4,900 m **above sea level**, not
  above the radar. This first view uses centres 1,100–3,900 m (1–4 km bands).
- `dens` is the archive's **processed bird-density estimate**, birds/km³.
  `ub` is east-positive and `vb` north-positive movement speed, m/s, following
  the deposited field documentation. These are population estimates, not
  individually tracked birds or species identifications.
- Source processing includes filtering, bird/insect separation and
  interpolation. The export does not provide a per-cell measured/interpolated
  flag. Therefore label the entire study as processed radar estimates.
- The deposited density is already the corrected `dens4`; do not multiply it
  by `bird` again. `densSIMmean` contains simulated low-altitude values and
  `denss` includes a simulation-based integration. Neither is used here.
- We add no temporal interpolation, gap filling, low-altitude reconstruction,
  migration trajectories, particles or sound in this first study.

Relevant processing files at inspected repository revision
`5d9d65437c4f4eec341b4bcfd7084948da6ad7ad`:
[export](https://github.com/birdmigrationmap/BMM/blob/5d9d65437c4f4eec341b4bcfd7084948da6ad7ad/2018/functions/export_zenodo.m),
[ingestion and cleaning](https://github.com/birdmigrationmap/BMM/blob/5d9d65437c4f4eec341b4bcfd7084948da6ad7ad/2018/script_download_cleaning.m),
[UTC astronomical calculation](https://github.com/birdmigrationmap/BMM/blob/5d9d65437c4f4eec341b4bcfd7084948da6ad7ad/2018/sunriseset_astral/script.py).
This repository revision supports interpretation; it is not a claim to reproduce
the upstream 2021 processing pipeline.

## Bounded selection and transformations

The windows begin **2, 3 and 4 September 2018 at 18:00 UTC**, each ending at
06:00 UTC the following morning. These are the earliest three consecutive
September nights exceeding 85% density availability across the 0.8–4 km
inspection band in the supplied nighttime timestamps. Selection was based on
coverage, not maximum migration intensity. Fixed clock windows are not exact
astronomical sunset/sunrise boundaries; empty margins remain empty.

The comparison curve is the arithmetic mean of the five equal-width density
bins spanning **1–2 km ASL**. It is available only when all five bins exist.
It is a volume density, not total abundance or migration traffic rate.

The selected profile shows all 15 unchanged bins spanning 1–4 km ASL. All
three nights and selected profiles use common linear scales. Missing bins are
labelled rather than connected or filled.

The compass shows the **density-weighted mean velocity vector** in the same
1–2 km band. It requires all five density and velocity pairs, with positive
summed density. Bearing points **toward** travel: 0° north, 90° east. Its speed
is the magnitude of the mean vector (converted to km/h), not mean individual
speed. Opposing movement can cancel; this is not a full direction distribution.

## Reproduce

```sh
python3 scripts/prepare-first-study.py /path/to/dc_zeno.zip
python3 scripts/render-first-study.py /absolute/output/memmingen-three-nights.html
```

The extractor verifies the archive checksum, dimensions, time ordering and
every retained density/velocity cell against the archive, preserving nulls.
The renderer embeds only this small subset. It makes no live data requests.

The extracted subset is 174,879 bytes, with 145 five-minute clock positions per
night. Each night has 126 complete 1–2 km density profiles; valid mean-velocity
profiles number 118, 121 and 124 respectively. Peak mean densities are 7.75,
30.28 and 60.62 birds/km³. These are this chosen band's sample maxima, not
whole-night means or total migration counts. The initial selection is 4
September at 22:00 UTC. Extraction invariants, missing-band handling, data
embedding and JavaScript syntax were checked; no physical-device performance
claim is made.

The earlier [Superfledermaus archive](https://zenodo.org/records/14720050)
remains a separate Swiss lead: its explicit research/publication agreement
requirement has not been resolved. It is not used in this first study.
