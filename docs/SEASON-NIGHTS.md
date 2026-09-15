# A season of nights

Seasonal studies, 15 September 2026. The spatial experience is at `/season.html`;
the original data calendar is retained at `/season-data.html`. Both use exactly
the same prepared nightly data. The calendar gives each night a column of light;
select one to see the available five-minute samples, mean ground-movement vector,
and exact altitude-bin means.

## A place as the hinge between space and time

**Across places** transforms the reeds into a geographic view of the same date
at all 37 radar locations. **Through this place** unfolds the selected radar's
neighbouring nights again. Tapping a radar marker also selects that place and
opens its season; the station selector in Explore provides a keyboard-accessible
alternative. The date reached in time becomes the shared date on returning to
geography. The URL records `view=space` along with station, date and period.

The selected night is the anchor: it remains the same veil, source density and
altitude palette through the transformation. Its horizontal span contracts from
46 to 9 display units as the camera pulls back. Other nights gather toward the
anchor and fade; the other radar profiles appear at their geographic locations.
Those surrounding observations are faded independently, never blended into a
different observation's values. The camera and layout transition takes 3.2 seconds
with smooth acceleration/deceleration. Controls lock during the transition;
reduced motion uses the destination arrangement immediately. Backgrounding
finishes a transition and pauses playback.

The map uses historical radar coordinates in a flat equirectangular frame centred
on 49° N, 5.5° E, with 20 km per scene unit, east to the right and north toward
negative z. The first and second displayed horizontal positions are coordinates;
the footprint width and exaggerated height are visual treatments. The ground is
a flat context plane, not a terrain reconstruction. Country polygons reuse the
project's Natural Earth geometry (public domain), simplified by retaining every
fourth ordered boundary point. Country names and radar markers supply orientation.

Both views use the same square-root density transform and the same cap. A single
global exposure changes from 0.42 in time to 1.4 in geography to compensate for
the much lower overlap of separated veils. It is shared by all stations and dates
in each arrangement; it is not per-station normalization. Comparing exact density
still belongs in the inspection panel or data calendar. Reflection fades out as
the map appears.

On first geographic entry, remaining station calendars load and validate. All
37 must succeed before the scene changes. A failed or malformed response retains
the existing time view and permits retry; completed station downloads are cached.
Subsequent geographic dates read directly from those same calendars. Missing
nightly profiles have no bird veil; geographic location markers remain present.

Verification includes equality of all fifteen selected density values between
time and geography, an animated return via another station/date, saved geographic
URLs, marker selection, loading failure/retry, and reduced-motion navigation.

## A passage through the nights

The time view places nights in depth as translucent veils. Height and colour
retain the altitude ordering; light uses the existing capped square-root density
transform. Depth is calendar time, with one fixed spacing per date. It is an
abstract setting, with no claimed geographic footprint or reconstructed flight
path. Each veil's fixed density values are independent of camera movement.

The default is Memmingen, 4 September, within the autumn window. It starts with
the date held. **Drift through nights** advances the camera at 0.42 dates per
second (roughly 2.4 seconds per date); **Look across** offers a wider oblique view
of the surrounding weeks, and **Step within** returns to the closer view. Drag
to look around or use the time ribbon to travel. Camera interaction pauses drift.

The authored folds, slowly changing texture, reflection, distance fading and
overlap provide atmosphere. They do not encode measured clouds, terrain, flow
direction, velocities or between-night biological change. No density interpolation
is added between dates. Missing dates have no veil; valid zero density emits no
bird light. Discreet date markers remain through gaps, and the selected date
explicitly reports unavailable observations. The nearest actual date supplies
the inspection reading while the camera travels continuously.

**Explore** holds station and period controls; **Read this night** reveals the
same numeric summary used by the calendar, source notes, and a direct link into
the full data view. That link retains date, station and period. **Enter the season**
in the calendar returns with the same selection. All 37 stations remain available.

The spatial view uses WebGL, with at most 64 nearby dates in the drawing pool;
off-screen dates remain in the data. Pixel density is capped at 1.5. The calendar
retains its Canvas 2D renderer and remains available if WebGL fails. Opening a
dialog stops drift and suspends scene rendering after the current frame. Returning
from the background remains paused and never advances through the elapsed time.
Reduced motion holds the texture still and disables camera damping; explicit
drift and manual viewing remain available. Sound work stays separate.

The first exposure was reduced to preserve colour in overlapping bright veils.
Desktop and phone-sized compositions were visually inspected. This remains an
experiential sketch to judge by looking and lingering, with the calendar available
for assessing its relationship to the observations.

## What the audit found

The pinned archive contains 46,508 timestamps across February–December 2018, but
**no July timestamps**. January is also absent. A nearly year-long date range does
not imply continuous observations. No seasonal values are invented across gaps.

The common four-hour window and completeness rule below retain **6,687 station
nights** across 37 sites, out of 13,505 possible station/date combinations in 2018.
Per-site availability ranges from **78 to 208 nights**. Memmingen, the opening
station, retains **171**. These are availability counts, not biological quality
scores, migration totals, or area-weighted coverage of Europe.

| Month | Memmingen nights passing the rule | Days in month |
| --- | ---: | ---: |
| January | 0 | 31 |
| February | 11 | 28 |
| March | 10 | 31 |
| April | 20 | 30 |
| May | 22 | 31 |
| June | 10 | 30 |
| July | 0 | 31 |
| August | 27 | 31 |
| September | 17 | 30 |
| October | 19 | 31 |
| November | 21 | 30 |
| December | 14 | 31 |

The full per-station/month audit and source timestamp counts are in
`data/processed/season-nights-index.json`. All 37 radar locations come from the
historical source, not a contemporary station catalogue. Labels reuse the
project's existing radar inventory, falling back to station codes.

## Comparable nightly samples

- A labelled date means the night **beginning** on that date in UTC.
- Each window has 48 possible five-minute positions, **22:00–02:00 UTC**, with
  02:00 excluded. The last included timestamp is 01:55 on the following day.
- This is a fixed core-of-night sample, not a whole-night integral or a
  sunset-relative comparison. Seasonal changes around dusk/dawn are outside this
  first study. Solar-position checks at all station/date endpoints put the sun
  below the horizon; northern summer endpoints can include civil twilight
  (highest tested solar altitude approximately −4.99°).
- Use the unchanged fifteen 200 m bins centred at 1.1–3.9 km ASL, spanning
  **1–4 km above sea level**. Only source `dens`, `ub`, and `vb` are used.
- A density timestamp is complete only when all fifteen density bins contain
  finite nonnegative numbers. A single absent bin excludes that timestamp from
  every altitude mean. All heights therefore use exactly the same timestamp set.
- Accept a nightly column with **at least 39/48 complete timestamps**, the ceiling
  of 80% availability. Average each altitude over those timestamps without gap
  filling. Compute the headline volume density as the arithmetic mean across
  these equal-thickness bins. Coverage bias may remain within an accepted night.
- Retain the original temporal gaps in the 48-position trace of complete-profile
  means, even for rejected nights. Zero remains a valid value. Summary numbers
  are rounded to four decimal places in the client assets; the source is untouched.
- Mean velocity requires at least 39 timestamps with complete density and both
  velocity components at all heights. Compute a density-weighted mean of east
  and north components over this paired subset. Require positive total density;
  otherwise velocity is unavailable. The magnitude of the mean vector is not
  mean individual speed. Opposing movement can cancel and zero resultant has no
  bearing. Density and velocity can have different accepted timestamp sets.

The source contains upstream filtering, bird/insect separation and interpolation;
it supplies no measured/interpolated flag per cell. Its simulated low-altitude
fields remain excluded. See [the source interpretation](FIRST-STUDY.md).

## Data calendar: light and interaction

Gold marks low altitude, then pink and violet, then cyan at the top. Light responds
to square-root density with a **single cap of 20.6733 birds/km³**. The cap is the
nearest-rank pooled 99th percentile of 100,305 accepted altitude-bin means across
all stations/dates. The pooled maximum is 181.7133 and median 0.1631 birds/km³.
Values above the cap share the brightest treatment; exact numbers remain in the
profile table. This is an artistic display transform, not a calibrated pixel
reading or a linear density chart. Local vertical softness does not connect
neighbouring calendar dates. Valid zero columns keep their availability mark;
rejected columns carry grey marks. No date interpolation is added.

Year, Spring (12 February–30 June) and Autumn (1 August–30 November) are viewing
windows, not inferred migration-season boundaries. Switching the window or
station leaves the light scale fixed. The five-minute detail trace has its own
labelled linear scale, fitted to that night's values.

The data calendar opens paused at Memmingen, 4 September. Its four-hour window has 45
complete density samples and 43 paired velocity samples. Mean density is 21.9200
birds/km³, with vector −10.8104 east / −7.0251 north m/s (toward about 237°).
The trace preserves the three missing positions at 00:45, 00:50 and 00:55 UTC.
This is a different time/height summary from the original 1–2 km first-study curve.

Click/tap a column or use the slider to select a night. Left/right arrows step one
date; Shift steps seven; Home/End select the window endpoints. Space or P toggles
playback at four nights/second. Playback includes missing dates and stops at the
end. Scrubbing, season/station changes, notes and backgrounding pause playback.
The query string retains station, date and viewing window after a selection.
Opening on a saved station loads it on demand, preserving date and window.

The 37 per-station JSON files total approximately 5.8 MiB uncompressed. The
opening station is bundled; others load only on selection. Failed or malformed
loads retain the previous calendar and permit retry. The page uses Canvas 2D,
with no WebGL requirement or continuous render loop while paused. The separate
audio studies are not connected to this first seasonal representation.

## Reproduce and verify

```sh
python3 scripts/prepare-season-nights.py data/raw/dc_zeno.zip
python3 scripts/test-season-nights.py
npm test
npm run build
npx playwright test tests/season.spec.js tests/season-passage.spec.js tests/season-space.spec.js
```

The extractor checks the pinned archive MD5, exact timestamp count and ordering,
and all source field dimensions. Tests cover the threshold boundary, incomplete
heights, zero density, missing velocity, opposing flow and negative/nonfinite
inputs. Asset checks verify all 37 station calendars, monthly counts, the common
scale, missing July, and mean/trace consistency. Browser checks pass in Chromium
and WebKit, including selections, paused opening, keyboard playback, URL reload,
missing data, notes focus, and download failure/retry. Width checks cover 320,
390 and 1280 px. Additional spatial tests cover the veil data texture, a bounded
drawing pool, drift timing, explicit reduced-motion playback, unavailable nights,
station failure/retry, camera preset controls, and round-trip links into the data
calendar. All fourteen browser cases pass across Chromium and WebKit. These checks do
not certify physical-device performance.

## Potential continuation

Assess how well the light reveals spring/autumn altitude differences before
adding further dimensions. A sunset-relative window, explicit seasonal pairing,
and entry into a full within-night scene are possible next experiments. Multiple
years would be needed to distinguish this particular year's pattern from a
typical seasonal cycle. The other source avenues are recorded in
[Potential avenues](POTENTIAL-AVENUES.md).
