# A night in passage

A separate prototype at `night.html`, joining the cloud → archipelago → sea
journey in one scene. The four individual studies and frozen snapshots remain
available. There is no sound in this first pass.

## Bounded night selection

Run `node scripts/inspect-night.mjs` to reproduce `data/processed/night-shape.json`
from the retained extractions. No new source data or visual precedents were used.

Among the three already extracted Memmingen nights, the complete 1–4 km column
mean peaks at 4.21, 12.44 and 24.34 birds/km³ on 2, 3 and 4 September respectively.
The last night peaks at 23:45 UTC and falls to 1.56 at 04:30. It is also the only
night currently extracted at all 37 stations with the matching weather and
velocity-tracer preparations. This is a practical first selection, not a search
across the full annual archive or evidence of the strongest migration night.

The half-hour inspection records complete-profile counts and the median station
column mean. Each column requires all fifteen equal-width altitude bins. The
network statistic weights stations equally, not area, and its contributing
stations change with availability. It is not a migration total or a causal weather
analysis. The first frame has nine complete profiles, 19:00 has 35, and 04:30 has
30. Missing values remain missing. The full five-minute inspection also records a widespread interior dropout at
00:45, 00:50 and 00:55: only two complete profiles remain. The journey explicitly
labels the observation gap (including adjacent times that cannot be interpolated)
and retains the missing values rather than interpreting the darkening as a lull.
The journey stops at 04:30 before the more
extensive morning gaps; it does not depict a measured disappearance at sunrise.

## Viewing itinerary

An explicit Play starts 150 seconds of guided viewing over 18:00–04:30 UTC.
Camera movement and changes of representation are authored against this shared
clock. They do not infer a departure front, bird route, or a growth of coverage.

- 18:00–20:00: one local cloud at Memmingen, over the regional elevation mesh.
- 20:00–22:30: pull back, reveal the other station profiles, and begin blending.
- 22:30 onward: the existing continuous estimate, with velocity tracers gradually
  appearing between 23:30 and 01:00.
- 02:30–04:30: a westward viewing drift as the retained night thins.

The island footprints retain the existing illustrative 80 km extent. All stations
use a common density scale and palette. Layer height blends from ×12 to ×4 during
the rise; ground relief remains ×8. The continuous field and tracers retain their
existing methods and limitations from `CONTINENT.md` and `CURRENTS.md`. Texture
phase is tied to the clock so seeking back restores it. Solar terrain lighting
uses that same date and time. Optional cloud cover reuses the retained ERA5
reanalysis and does not affect the bird field.

## Interaction

Playback begins paused. Drag/pinch interrupts the itinerary and pauses the data.
Continue journey interpolates back from the current camera pose over 2.4 seconds
before advancing the clock again. Pausing during that return preserves the
current view. Scrubbing seeks the data and authored camera together and pauses.
Controls provides chapter stops, palettes, cloud cover, restart, coverage and
source notes. Space/P, arrows, Shift + arrows, Home and End share the studies'
keyboard controls. The phone layout retains the larger scrub target.

Reduced-motion playback leaves the camera at the chosen view while data advances;
chapter controls make other views available explicitly. Switching away from the
page pauses playback. Opening Controls pauses the journey. Modal notes preserve
focus and return to Controls when closed.

## Checks

Unit checks cover camera clearance, orbit handover distance, continuous joins,
endpoint clamping and the ordering of observed/reconstructed representations.
The hosting suite exercises playback, direct camera takeover, smooth resumption,
chapter seeks, the endpoint, phone sizing, palette selection and nested notes.
Local browser inspection covers desktop and phone framing and the visible
cloud/island/sea changes. This remains an initial artistic study; pacing and
camera composition are open to iteration.
