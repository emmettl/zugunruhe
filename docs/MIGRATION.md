# A thread of passage

An exploratory study at `/migration.html`, made 16 September 2026. Fifteen
white storks are shown through recorded positions from 30 July to 29 September
2018. This excerpt reaches Morocco; it does not contain complete trans-Saharan
journeys, complete lives, or spring returns.

## Experience

The geographic view holds the available journeys as faint threads. The preceding
three days brighten, and sparse glints reveal retained observations. Select a
bird, play at six recorded hours per second, scrub the date, or tap a visible
glint to hold its recorded time and position. Arrow controls step through exact
retained observations; the canvas also accepts left/right arrows and space.

**Unfold time** morphs each observation from its geographic position into a
shared date/latitude view over 2.8 seconds. Horizontal position becomes calendar
time; vertical position remains north/south. The selected bird, clock and held
fix survive this change. Horizontal spans mean similar latitude, which can include
east/west travel; they are not automatically classified as resting. The full
excerpt is faintly visible, including future dates relative to the playback clock.

Glints have no interpolated positions. Their halos, palette, rhythm and selected
brightness are authored, not measurements of altitude, velocity or accuracy.
Cosmetic pulses use slow sine envelopes (under 0.2 cycles/second). Reduced motion
removes cosmetic pulses and completes the view change immediately; explicit
playback remains available. The Glints switch removes the decorative trail and
sparkle arms but retains current-position markers. No audio is added.

The reading gives latitude, longitude, recorded UTC time and great-circle
displacement from the first fix in this excerpt, not cumulative distance flown.
All fifteen birds can be shown together. Their names and individual identifiers
come from the data. They are a small tagged sample, separate from the weather-radar
observations used in Season of nights.

## Source and permission

Fiedler W, Flack A, Schäfle W, Keeves B, Quetting M, Eid B, Schmid H, Wikelski M
(2019). Data from: Study “LifeTrack White Stork SW Germany” (2013–2019).
[Movebank Data Repository, DOI 10.5441/001/1.ck04mn78](https://doi.org/10.5441/001/1.ck04mn78).
The repository's item metadata was checked directly and states **CC0 1.0 Universal**.
Metadata endpoint: `https://datarepository.movebank.org/server/api/pid/find?id=10255/move.912`.

This sketch uses the published 155,173-row, fifteen-bird `df` subset distributed
with moveVis, not an authenticated live Movebank export. Only the dataset and its
documentation were used; the visual approach was developed for this study.
[Subset documentation](https://movevis.org/reference/whitestork_data.html).

Pinned source:
`https://raw.githubusercontent.com/16EAGLE/moveVis/8603e8c443476feb84b2db17b365fd95e6926e20/data/whitestork_data.rda`

- Git blob SHA-1: `7ed1f1b6c4c0f8bd97498cf5a716081581d46598`
- SHA-256: `930afdea6d079f6a3305e49bb84c15f10a7215ccadebdab718b1f7c6449b5cca`
- Stored input: ignored `data/raw/whitestork_data.rda`.
- Associated paper: Cheng Y, Fiedler W, Wikelski M, Flack A (2019),
  “Closer-to-home” strategy benefits juvenile survival in a long-distance
  migratory bird, DOI `10.1002/ece3.5395`.

## Extraction and gaps

`scripts/prepare-migration.py` reads the R data frame using `rdata==0.11.2`.
It validates finite coordinates, geographic bounds and strictly increasing times
within each bird, then retains the first recorded fix in each UTC half-hour,
the first/last fix of each bird, and both sides of source gaps longer than two hours.

The output contains **28,298 retained fixes**, stored as
`[unixSecondsUTC, longitude, latitude]`. Fractional seconds are preserved.
Coordinates are rounded to seven decimal places; none are spatially averaged or
interpolated. All 28,298 output timestamps and coordinates were independently
matched back to the original `df` during preparation. This subset contains no
altitude or accuracy columns, so these are not invented or inferred.

Connections are straight segments between retained fixes at most two hours apart.
Longer intervals remain open. The current marker is the latest retained fix at or
before the clock, only while it is at most two hours old and within the bird's
recorded date range. It never travels along a connecting segment. Sparse birds
sometimes have no current marker even when others have one. Recording ends are
not interpreted as death or arrival.

## Geography

Natural Earth 1:110m country polygons, public domain, provide quiet context:
`https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson`.
Input SHA-256: `6866c877d39cba9c357620878839b336d569f8c662d3cfab4cb1dbe2d39c977f`.
Exterior rings intersecting 20°W–25°E and 25–58°N are retained, with coordinates
rounded to four decimals. Small islands and borders are approximate. Projection
is equirectangular with longitude scaled by cosine of 41° latitude. The birds
and land use the same projection. No elevation is shown.

## Reproduce and verify

Download the two inputs to `data/raw/whitestork_data.rda` and
`data/raw/migration-world.geojson`. In Python with `rdata==0.11.2`:

```sh
python scripts/prepare-migration.py
python scripts/test-prepare-migration.py
npm test
npm run build
npx playwright test tests/migration.spec.js
```

The extractor verifies the R input's Git blob digest. Browser checks cover held
observations through the view change, stepping, URL reload, source gaps, recording
ends, playback, modal focus, reduced motion and narrow widths. Canvas 2D keeps
this first sketch portable. Observation controls still work if the drawing
context is unavailable. Playback pauses when the document is hidden or notes
are opened, and stops at the end of the excerpt.
