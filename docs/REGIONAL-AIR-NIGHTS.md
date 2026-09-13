# Three nights over the same landscape

Regional Air now compares 9–10 September, 24–25 September and 8–9 October 2018.
September 24 remains the default. The original single-station comparison and all
earlier studies remain available. No prior-art visualisations were consulted.

## Selection and continuity

The existing 92-night hourly screen suggested contrasting directions and speeds.
Eight windows were then retained at every five-minute timestamp and all fifteen
200 m bands, from 19:00 through 04:30 UTC. Results are in
`regional-air-candidate-coverage.json`. The visible clock is 20:00–04:00 for every
night; the retained margins establish trails before the start and after the end.

| Start date | Minimum complete bird/wind bands / 555 | Decision |
| --- | ---: | --- |
| September 9 | 292 | Selected: eastward wind across the three example sites |
| September 24 | 320 | Retained: stronger spatial differences in wind |
| October 4 | 22 | Excluded: widespread 00:30–00:40 dropout |
| October 8 | 311 | Selected: slower air at the German example sites |
| October 9 | 311 | Usable alternative; October 8 gives the slower-wind contrast |
| October 16 | 81 | Excluded: widespread 00:15–00:25 and 03:15–03:25 dropouts |
| October 17 | 19 | Excluded: 04:15–04:25 dropout disrupts the trail-ending margin |
| October 19 | 369 | Usable alternative; retained as a research candidate |

All eight windows have complete source timestamps and all 555 wind band pairs
at every frame. Missing individual bird profiles remain null. The selected
nights have no frame below half-network paired coverage. In the eleven-site
Swiss-adjacent subset, the minimum complete bird bands are respectively
106, 93 and 126 of 165; the largest loss between adjacent five-minute frames is
5, 4 and 5 bands. These are availability checks, not biological quality scores.
No gaps are filled, and these checks do not imply that every location is observed.

At **22:00 UTC and 2.1 km ASL**, the retained source values give these examples.
Bearings point toward movement; speeds are magnitudes of the vector in km/h.

| Night | Site | Wind toward / speed | Birds toward / speed | Density (birds/km³) |
| --- | --- | --- | --- | ---: |
| Sep 9 | Montancy | 99° / 16 | 262° / 11 | 4.47 |
| Sep 9 | Memmingen | 88° / 20 | 172° / 22 | 7.04 |
| Sep 9 | Eisberg | 101° / 16 | 190° / 27 | 11.60 |
| Sep 24 | Montancy | 245° / 41 | 243° / 71 | 6.20 |
| Sep 24 | Memmingen | 194° / 14 | 245° / 43 | 17.62 |
| Sep 24 | Eisberg | 143° / 47 | 202° / 31 | 0.58 |
| Oct 8 | Montancy | 274° / 12 | 238° / 42 | 30.66 |
| Oct 8 | Memmingen | 346° / 5 | 251° / 30 | 13.65 |
| Oct 8 | Eisberg | 351° / 4 | 221° / 28 | 14.97 |

These examples are not whole-night summaries. Bird movement is relative to the
ground; the difference from wind does not establish intent or a causal response.
Wind informed upstream bird/insect separation, so the two fields are not
independent observations. See [Regional Air](REGIONAL-AIR.md) and [Air](AIR.md)
for spatial limits, source attribution and processing caveats.

## A comparable view

Each night uses the same integration, boundary, distance, altitude, density-to-
brightness and exposure rules. The pseudo-random generator starts from the same
seed, 20180924, for each night, with identical seeding counts and lifetimes.
Density and available support determine where paths can start and continue;
paths do not identify individual birds. No per-night brightness normalization
is applied and no transition invents intermediate weather between dates.

Night selection preserves the precise timeline index, height, flow visibility,
playback speed, selected station, camera and its Back bookmark. It pauses the
clock. Both flow datasets load before replacing the scene; loading or download
failure leaves the previous night intact. Alternatives are separate static JSON
assets fetched on demand, with the browser HTTP cache available for revisits.
Prepared world positions are replaced in existing geometry, releasing the old
night's transformed path arrays rather than accumulating new meshes.

The selected date is recorded as `?night=2018-09-09` or `?night=2018-10-08`.
The default September 24 needs no parameter. Speed and other query parameters
are preserved. Reload starts at the usual 22:00 regional view on the selected
night; only switching within the current page preserves the camera and time.

## Reproduction

```sh
python3 scripts/prepare-spatial-wind.py data/raw/dc_zeno.zip --comparison
node scripts/prepare-regional-air.mjs 2018-09-09 2018-10-08
```

The Python extractor verifies the pinned archive MD5 and writes the complete
shortlist to ignored `data/raw/wind-audit/comparison-candidates.json`, retaining
values and nulls verbatim. The Node command writes date-qualified profile,
wind-path and bird-path assets for the two new nights. Original September 24
assets are unchanged. Unit checks verify continuity, retained contrasting values
and established paths across the visible clock. Browser checks cover both
switches, retained time/height/station/speed, Back, date persistence, returning
to the default, and a failed optional download.
