# Clouds on the migration clock

Open `/continent.html?palette=aquatic&clouds=total` to compare the continuous
bird field with cloud cover. The footer selector offers Total, Low, Middle,
High and Off. Visit a station to see a local cloud percentage next to the
weather controls. The bird reading remains the station's radar-derived value.

## Data acquired

- ERA5 hourly reanalysis, explicitly selected through the
  [Open-Meteo Historical Weather API](https://open-meteo.com/en/docs/historical-weather-api).
- 4 September 2018 18:00 through 5 September 06:00 UTC: 13 hourly samples
  matching the full 12-hour bird study, including both endpoints.
- 1,363 locations on a 47 × 29 grid, 6° W–17° E and 42–56° N.
  Sampling is 0.5°, selecting every second point of the provider's 0.25° grid.
  Nearest-cell selection is explicit, including over water; elevation
  downscaling is disabled. Returned coordinates are checked against requests.
- Total, low, middle and high cloud-area fractions, in percent. These are
  separate fields and must not be summed. All 70,876 values are present.

Low/middle/high are broad cloud categories, not fifteen altitude slices like
the bird data. The API describes them approximately as below 2 km, 2–6 km and
above 6 km; those summaries do not supply cloud bases, tops or volumetric
occupancy at a particular bird altitude. ERA5 is a model-based reconstruction
using observations, not a satellite photograph of that night.

`python3 scripts/prepare-clouds.py` downloads, caches, validates and extracts
the four fields. Raw responses are kept in ignored `data/raw/clouds-era5/`.
`data/provenance/cloud-night.json` records request URLs, source checksums,
processing and the output checksum. The small processed dataset is bundled
with the static site; viewing and deployment require no weather API requests.
The free API is used for this non-commercial study, with paced requests and
cached responses. The returned data are [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
Weather data by Open-Meteo.com; generated using Copernicus Climate Change
Service information. ERA5 source DOI: [10.24381/cds.adbb2d47](https://doi.org/10.24381/cds.adbb2d47).

## Display and interpretation

A neutral pale veil projects cloud-area fraction onto the same terrain mesh.
Its opacity increases linearly with cover, with a short fade at the dataset
boundary. It is a coverage map, not cloud geometry: do not read the displayed
height as a cloud base, or conclude that the luminous birds flew above it.
Bird light is composited over the veil to keep both fields legible. No cloud
shadows, physical attenuation, fine cloud texture or wind-driven drift are added.

Cloud cover interpolates bilinearly in space and linearly between hourly
samples on the existing UTC clock. Zeros stay zero. Missing nonzero-weight
neighbours would make the estimate unavailable; the renderer likewise rejects
missing support. Values outside the acquired time/space range are not extended.
The station cloud readout samples this same coarser interpolated map, rather
than making a new native-resolution query. It can differ appreciably from the
nearest original ERA5 cell. It is not a weather measurement at the radar.

For example, the displayed total-cover estimate near Memmingen is 68.0% at
18:00, 54.2% at 22:00, 11.9% at 02:00 and 59.7% at 06:00. Its radar column
means at those times are 0.0, 21.1, 15.0 birds/km³ and unavailable respectively.
This gives us a first set of changes to look at together. It does not establish
a relationship or causal response: one night, spatial smoothing, and radar
quality/filtering all limit that interpretation.

The next data step for actual three-dimensional overlap is cloud fraction and
geopotential on pressure/model levels, or cloud-base/top observations. Retaining
the complete horizontal source grid would also improve local comparisons.

## Verification

The ingestion checks coordinates, UTC offset, units, timestamps, array content,
ranges and completeness. Unit checks cover midnight interpolation, final
endpoints, zeros, bilinear sampling and missing values. The deployed browser
smoke check opens Sea with cloud cover enabled so its shader is exercised.
The original saved studies and their checksum manifests remain intact.
