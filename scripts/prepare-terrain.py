"""Fetch and bilinearly sample Mapzen Terrarium DEM tiles around Memmingen.

Requires Pillow. Cached source tiles stay under ignored data/raw/terrain.
Run from any directory; outputs a static grid, with no runtime network dependency.
"""
import hashlib
import json
import math
from pathlib import Path
from urllib.request import urlopen
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / 'data/raw/terrain'
CACHE.mkdir(parents=True, exist_ok=True)
LAT, LON = 48.0431, 10.2204
SPAN, SIZE, ZOOM = 96, 193, 9
RADIUS = 6371.0088
tiles, sources = {}, []

def pixel(lon, lat):
    n = 256 * 2 ** ZOOM
    return (lon + 180) / 360 * n - .5, (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n - .5

def elevation(x, y):
    tx, ty = x // 256, y // 256
    key = (tx, ty)
    if key not in tiles:
        url = f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{ZOOM}/{tx}/{ty}.png'
        path = CACHE / f'{ZOOM}-{tx}-{ty}.png'
        if not path.exists():
            print(f'Fetching {url}', flush=True)
            with urlopen(url, timeout=60) as response:
                path.write_bytes(response.read())
        image = Image.open(path).convert('RGB')
        assert image.size == (256, 256)
        tiles[key] = image
        sources.append({'url': url, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
    r, g, b = tiles[key].getpixel((x % 256, y % 256))
    return r * 256 + g + b / 256 - 32768

def sample(lon, lat):
    x, y = pixel(lon, lat)
    ix, iy = math.floor(x), math.floor(y)
    fx, fy = x - ix, y - iy
    return sum(elevation(ix + dx, iy + dy) * wx * wy
               for dx, wx in [(0, 1-fx), (1, fx)]
               for dy, wy in [(0, 1-fy), (1, fy)])

heights = []
for row in range(SIZE):
    north = SPAN / 2 - row / (SIZE - 1) * SPAN
    lat = LAT + math.degrees(north / RADIUS)
    for col in range(SIZE):
        east = col / (SIZE - 1) * SPAN - SPAN / 2
        lon = LON + math.degrees(east / (RADIUS * math.cos(math.radians(LAT))))
        heights.append(round(sample(lon, lat)))
assert len(heights) == SIZE * SIZE and all(0 < h < 4000 for h in heights)
data = {'centre': {'lat': LAT, 'lon': LON}, 'spanKm': SPAN, 'size': SIZE,
        'grid': 'Row-major, north to south; columns west to east. Local equirectangular approximation.',
        'elevationMetres': heights}
(ROOT / 'data/processed/memmingen-terrain.json').write_text(json.dumps(data, separators=(',', ':')) + '\n')
provenance = {'source': 'Mapzen Terrain Tiles on AWS', 'accessed': '2026-09-12',
              'registry': 'https://registry.opendata.aws/terrain-tiles/',
              'attribution': 'Europe terrain produced using Copernicus data and information funded by the European Union — EU-DEM layers; SRTM and GMTED2010 courtesy of the U.S. Geological Survey; Austria terrain © offene Daten Österreichs — Digitales Geländemodell (DGM) Österreich.',
              'attributionReference': 'https://github.com/tilezen/joerd/blob/master/docs/attribution.md',
              'processing': 'Decode R*256+G+B/256-32768 metres before bilinear interpolation; sample at 500 m spacing; round to metres. No invented relief.',
              'rangeMetres': [min(heights), max(heights)],
              'centreElevationMetres': heights[len(heights)//2], 'tiles': sources}
(ROOT / 'data/provenance/memmingen-terrain.json').write_text(json.dumps(provenance, indent=2) + '\n')
print(f'{SIZE} × {SIZE} grid; {min(heights)}–{max(heights)} m; radar terrain {heights[len(heights)//2]} m; {len(tiles)} tiles')
