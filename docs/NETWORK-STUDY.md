# Toward an archipelago of light

12 September 2026. Initial data investigation; the visual direction remains open.

The user's image: **island-like glowing aurorae viewed from 100 km up**, at country
or continental scale. Preserve Study 01 rather than evolving it in place. Let
personal reactions to the data lead the next study. Do not research or present
prior-art migration visualisations.

## What is already available

Direct inspection of the pinned 2018 Zenodo archive found 37 station files:
19 France, 15 Germany, two Netherlands and one Belgium. No Swiss stations are
included. These are the contents of this particular processed dataset, not an
inventory of all weather radars in those countries.

Great-circle distances between the published coordinates give a median
nearest-neighbour distance of **132.5 km**, ranging from **68.4 to 241.5 km**.
This is one nearest-neighbour measurement per station within the 37-station
subset, not a coverage radius or an estimate of the spacing of all European radars.

All 37 stations now have a locally extracted, synchronized 4–5 September night
in `data/processed/network-night.json`: the same 145 five-minute timestamps and
15 altitude bins at 1–4 km ASL as Study 01. Values and nulls are copied directly
from `dens`, `ub`, `vb`; simulated density fields are not used. At 22:00 UTC,
34 stations have all fifteen density values; three have incomplete profiles.
Completeness alone does not establish biological signal quality or cross-radar
calibration. Before comparing brightness, inspect per-station distributions and
shared-scale sensitivity; never normalize each island to its own maximum.

Reproduce with:

```sh
python3 scripts/inspect-network.py /path/to/dc_zeno.zip
```

Source: [Nussbaumer et al., Zenodo version 3](https://zenodo.org/records/4587338),
CC BY 4.0. The script verifies the pinned original archive MD5.

## Physical network versus available biological data

The [Aloft station metadata](https://aloftdata.eu/radars/) is derived from OPERA
and was updated on 10 February 2026. Its documentation explicitly says biological
data are not available for every listed station. A local copy is retained as
`data/provenance/opera-radars-2026-02-10.json`.

Filtering this metadata to status `1`, an ODIM code, valid coordinates and unique
ODIM code gives 183 entries across 28 countries. This filtered inventory is **not
a definitive total for the European physical network**, nor a list of 183 usable
bird-density series. Missing codes, statuses and archival entries matter.

Within-country nearest-neighbour distances calculated from those coordinates:

| Country | Active coded entries | Median nearest neighbour | Range |
| --- | ---: | ---: | ---: |
| Switzerland | 5 | 109 km | 107–110 km |
| Germany | 17 | 140 km | 69–222 km |
| France | 25 | 128 km | 61–242 km |

For these rows, neighbours are searched within the same country. Cross-border
stations can be closer. [MeteoSwiss independently confirms five Swiss weather
radars](https://www.meteoswiss.admin.ch/weather/measurement-systems/atmosphere/weather-radar-network.html).
Its [open-data documentation](https://opendatadocs.meteoswiss.ch/d-radar-data)
provides access to polar volume products; this does not by itself establish a
ready-to-use Swiss bird-profile dataset.

Broader biological-data access is expanding: [HiRAD's February 2026 update](https://hirad.science/news/2026/aloft-new-countries/)
reports additional countries, with data for most new sites starting in December
2025. It also says biological signal presence and quality have not been evaluated.
Do not combine these newer observations with 2018 profiles as though simultaneous.

## What the scale suggests

The 37-station subset is already enough for a first Western European study:
separate pools of light with differing altitude distributions, intensity, timing
and direction, sharing one clock. Their spacing supports the proposed island
quality. The darkness between sites initially describes what is unsampled; it
must not be presented as absence of migration.

At a literal 100 km camera altitude the 1–4 km air layers are thin relative to
the station spacing. A low oblique view would let their altitude structure remain
visible as thin luminous shelves. Test true scale before deciding whether vertical
exaggeration is needed, and expose any exaggeration explicitly. Keep footprint
size an acknowledged visual choice; do not inflate it until islands touch and
then imply continuous measured coverage.

Camera height and geographic extent are separate choices. With Study 01's 37°
vertical field of view, a camera looking straight down from 100 km sees about
67 km vertically on a locally flat ground plane. It cannot frame a country by
simply changing the height to 100 km. A wider or oblique camera and travel across
the surface would suit that altitude; a whole-continent overview needs a more
distant camera. On a spherical Earth of radius 6371 km, the geometric ground
horizon is about 1121 km from the point beneath a camera at 100 km, neglecting
refraction. The full continent should not be flattened into an impossible view.

Candidate experiment: begin over Memmingen and pull back or travel to reveal
nearby stations, then Germany and the Western European subset. Use a common
UTC clock with locally calculated sunset at every station, allowing dusk to
move across the geography. Let stations brighten according to their own measured
profiles. Keep absent samples absent. Investigate spatial interpolation only
after this directly observed arrangement has been seen and assessed.
