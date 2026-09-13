# Regional Air

`air.html` follows wind and processed bird movement across Swiss-adjacent Europe
on 24–25 September 2018. The original three-night single-station comparison is
preserved at `air-station.html`. Earlier studies and frozen builds remain intact.
The [selection investigation](SPATIAL-WIND.md) explains the 92-night screen and
full-resolution checks that led to this date.

## Data and reproduction

The source remains [Nussbaumer and contributors, Zenodo v3](https://zenodo.org/records/4587338),
CC BY 4.0. The pipeline retains `dens`, `ub`, `vb`, `uw`, `vw`, fifteen 200 m
altitude centres from 1.1–3.9 km ASL, and all five-minute samples 19:00–04:30 UTC.
The 37 source locations include no Swiss radar stations. ERA5 wind is sampled
at radar locations, not measured by the radar. Its native resolution and role
in upstream bird/insect separation are documented in [Air](AIR.md).

```sh
python3 scripts/prepare-spatial-wind.py data/raw/dc_zeno.zip
node scripts/prepare-regional-air.mjs
```

The Python step verifies the pinned archive MD5 and retains full candidate
profiles without filling nulls. The Node step selects September 24, writes
`regional-air-night.json`, and prepares separate `regional-air-wind.json` and
`regional-air-birds.json` paths. Runtime requires no external data service.
The default view starts paused at 22:00 with all heights visible. The clock runs
20:00–04:00; data on either side provide path warm-up and room for trail endings.

## Regional estimate

The domain is 3–14°E, 44.5–51.5°N. Grid spacing is 0.25°. Both fields reuse the
existing station kernel: Gaussian distance weighting with 90 km scale, tapered
from 180–240 km; no source beyond 240 km contributes. Display support fades
120–240 km from the nearest valid paired profile. A separate edge taper over
0.5° latitude and 0.75° longitude feathers the domain boundary. This is a display
estimate between ERA5 samples at stations, not a newly downloaded full ERA5 grid.
The visual grid spacing does not create new observations or local wind detail.

Wind pairs require both `uw/vw` components; their validity does not depend on
bird density. Bird vectors require density and both `ub/vb`. Each field is
bilinearly interpolated in space and linearly interpolated between adjacent
five-minute snapshots. Missing pairs remain unavailable, never zero-filled.
The selected window has every source timestamp and no widespread bird-data
collapse, but missing bird bands at individual stations are retained.

## Trails and representation

Both flows use the existing explicit-midpoint path integration at one-minute
steps. Their horizontal travel distance follows the same data clock: five real
minutes per playback second. Altitude stays fixed. Paths terminate at terrain,
missing support, the domain edge, or their chosen lifespan; no wrapping or
simulated turbulence is added. Seeds and lifetimes are deterministic display
choices. Bird seeds favour higher density; wind seeds favour available support,
without suggesting an air-density measurement.

Blue wind tails retain up to 60 minutes, green bird tails 45 minutes. Their
birth/death fades, glow widths and exposure are artistic. Bird alpha also follows
square-root scaled density. All heights uses a common lower exposure than an
isolated band. Close views reduce exposure smoothly. Trails do not represent
individual animals or parcel observations, and cannot establish behavioural
responses, flyways, weather fronts or valley-scale circulation. Fine path texture
must not be read as additional measured spatial resolution.

Geometry is placed over the shared curved terrain: relief ×8, layer height ×4,
lifted by additional displayed ground elevation. Physically underground bands
are excluded during integration. No September 4 cloud layer is enabled on this
September 24 view. The source wind and bird fields are independent in display
availability, but scientifically not independent because wind informed upstream
bird/insect separation.

## Interaction and validation

All heights is the opening view; Controls isolates any 200 m band. Blue and green
flows toggle independently. Tap a small station marker or use the station picker
to descend, then Back to restore the camera bookmark. Regional view resets the
camera. Flyover uses the existing 100 km / 65-second shallow itinerary; it is a
viewing route. Controls pauses playback and stops travel, with nested accessible
notes dialogs. Direct touch orbit/pinch, large 56 px phone scrubbers, Space/P,
arrows and Home/End follow the other studies. Page hiding pauses playback.
Reduced-motion users start paused, visit stations instantly, and retain explicit
playback/travel controls.

Unit checks cover independent wind validity, missing pairs, vector interpolation
through calm, finite support, retained source values and the full selected clock.
Browser coverage includes height choice, station descent/back, flow toggles,
keyboard/playback, modal focus, the preserved study link, phone layout and native
touch rotation/pinch. Frozen manifest checks remain part of every build.
