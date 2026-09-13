# Choosing a spatial wind study

13 September 2026. Follow-up to Air's horizontally uniform Memmingen profiles.
No prior-art visualisations were consulted. This records data selection for the [regional Air iteration](REGIONAL-AIR.md).

## Choice

Start with **24–25 September 2018, 19:00–04:30 UTC**, around the Swiss-adjacent
French and German stations. Open at 22:00 UTC and 2.1 km ASL. This window has the
largest mean nearby-site wind-vector difference among the nights passing the
initial completeness screen, and avoids the widespread short bird-data gaps
found in the two other detailed candidates.

At 22:00 and 2.1 km ASL, original archive values give:

| Place | Wind toward | Wind speed | Bird density |
| --- | ---: | ---: | ---: |
| Montancy, Swiss–French border | 245° | 41 km/h | 6.20 birds/km³ |
| Memmingen | 194° | 14 km/h | 17.62 birds/km³ |
| Eisberg, Bavaria | 143° | 47 km/h | 0.58 birds/km³ |

Bearings describe where the air moves, not where it comes from. These are
station-position samples of ERA5, not radar measurements of wind. The proposed
visual interest is a broad change from southwesterly movement in the west to
southeasterly movement in the east, with different speeds between them.
This does not establish a front, vortex, terrain channel, or causal bird response.

## Screening and finer checks

Screened 92 nights beginning 1 August through 31 October 2018, at 20:00–03:00
hourly and 1.1, 2.1, 3.1 km ASL, across all 37 archive stations. An unavailable
source timestamp yields nulls. Completeness requires finite density, both bird
velocity components, and both wind components. Retaining a vector at zero density
does not make it biologically meaningful: the comparison map suppresses bird
arrows below 1 bird/km³ (a display choice, not a scientific quality threshold).

The initial screen retained nights with at least 70% paired cells and 90% wind
cells. Rankings remain exploratory, not statistical significance or biological
quality scores. All 92 results are in `spatial-wind-screening.json`.

Metrics, in m/s, are:

- Spatial RMS: for each hour/height with at least 28 wind samples, RMS vector
  deviation from that time/height's network mean; then average these RMS values.
- Nearby difference: mean magnitude of pairwise vector difference for station
  pairs 100–400 km apart, within 45–50°N and 4–13°E, over all sampled times/heights.
- Height shear: mean vector difference between 1.1 and 3.1 km at the same place/time.
- Overnight change: mean vector difference between 20:00 and 03:00 at the same
  place/height. This endpoint comparison can miss intervening changes.

The subsequent full check retains all fifteen 200 m altitude centres and every
five-minute timestamp from 19:00 through 04:30 (115 frames, 555 cells per frame).
It is essential: an hourly screen missed three-sample bird dropouts.

| Night | Paired cells, hourly screen / full check | Full-check minimum paired cells | Widespread bird gaps |
| --- | --- | ---: | --- |
| 24–25 Sep | 76.4% / 65.4% | 320 / 555 | None below half-network paired coverage |
| 28–29 Sep | 80.5% / 67.2% | 20 / 555 | 02:15–02:25 UTC |
| 7–8 Oct | 85.2% / 72.6% | 20 / 555 | 03:15–03:25 UTC |

The percentages use different sampling populations: the full check includes
higher and intermediate bands and a longer evening/morning window. None of the
three windows has a missing source timestamp, and every retained wind component
is available. Bird availability varies by place and height even on the chosen
night. No missing bird values are filled. Full-check statistics are retained in
`spatial-wind-candidate-coverage.json`.

The alternatives remain interesting: on 28 September at Memmingen, 22:00 winds
turn from 235° at 1.1 km to 125° at 3.1 km. Bird density at that upper sample is
zero, so it should not be presented as strong birds/wind interplay. On 7 October,
22:00 at 2.1 km, Memmingen's wind moves toward 278° at 27 km/h while Offenthal's
moves toward 68° at 9 km/h; both have bird density above 1 bird/km³. Those nights
could use shorter, explicitly bounded comparisons, or separately disclosed gap
interpolation in a later journey.

## Reproduction and retained material

Source: [Nussbaumer and contributors, Zenodo version 3](https://zenodo.org/records/4587338),
CC BY 4.0; pinned archive MD5 `09673506cbc2ed31f3d7a016ebb32cfb`.
Wind provenance and its role in upstream bird/insect separation are documented
in [Air](AIR.md). No additional weather download was needed for this screen.

```sh
python3 scripts/inspect-spatial-wind.py data/raw/dc_zeno.zip
python3 scripts/prepare-spatial-wind.py data/raw/dc_zeno.zip
```

The first script retains screening samples in ignored
`data/raw/wind-audit/hourly-autumn.json`; the second retains full candidate
profiles in `data/raw/wind-audit/full-candidates.json`. Values and nulls are
copied directly from the five source fields `dens`, `ub`, `vb`, `uw`, `vw`, using
the archive's UTC timestamps and altitude rows. No simulation fields are used.
The three-height regional comparison contains 56,925 values, checked against
the full retained profiles; it uses the project's sourced country geometry.

## Next visual experiment

Extend Air across the Swiss-adjacent region on 24 September. Allow the wind field
to vary with location as well as height and time, with bird brightness and motion
alongside it. The current 96 km single-profile patch cannot express these
regional contrasts. First use the sampled locations to verify the broad pattern;
for a continuous field, obtain the underlying ERA5 grid for this selected window
or explicitly label and bound station-to-station interpolation. Native ERA5
0.25° hourly resolution does not resolve local valley-scale wind or turbulence.

Preserve unavailable bird samples and state any later temporal gap treatment.
Do not infer local eddies by adding noise to the vectors. Retain the existing Air
comparison as a useful single-station view.
