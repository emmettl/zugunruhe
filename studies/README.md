# Saved studies

## 01 — Layers · 12 September 2026

The initial Memmingen study: three nights, interpolated altitude layers, real
terrain and time-based dusk/dawn. Preserved at the point where the user described
it as a promising initial study and proposed country/continental exploration.

- [Run the frozen study](01-layers/index.html) through a local HTTP server.
  With Vite running, open `/studies/01-layers/`.
- [Source snapshot](01-layers-source.zip): source, processed data, provenance,
  documentation, extraction scripts and exact dependency lockfile.
- [SHA-256 manifest](01-layers-manifest.json).

Do not overwrite this snapshot during subsequent iterations. Extract the source
archive into a new directory and run `npm ci` to reproduce its development setup.
The large original radar archive and raw terrain tiles are not bundled; their
download locations and reproduction details are in the source snapshot.

The root app remains the editable version. The earlier 2D experiment is retained
as `first-study.html` and its associated rendering script.

## 02 — Archipelago · 12 September 2026

37 individual profiles on a curved Western European landscape. Open
`/network.html` in the local Vite server. Compare the 100 km oblique view with
Germany and Western Europe, and true-scale altitude layers with an explicit ×8
treatment. Preserved after adding relief, rivers, lakes and the finer coastline.

- [Run the frozen study](02-archipelago/index.html), at `/studies/02-archipelago/`.
- [Source snapshot](02-archipelago-source.zip).
- [SHA-256 manifest](02-archipelago-manifest.json).

Do not overwrite this snapshot. The existing `/network.html` also remains intact.
See [representation and controls](../docs/ARCHIPELAGO.md) and
[the network investigation](../docs/NETWORK-STUDY.md).

## 03 — Continent ablaze · working experiment

Open `/continent.html`: a continuous spatial estimate joins the same 37 stations
at fifteen altitudes. Flowing colour crosses the space between the observations,
with a separate support inspection view and a shared luminosity control.
[Model, limits and validation](../docs/CONTINENT.md).
