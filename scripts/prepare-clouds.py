"""Cache ERA5 cloud cover from Open-Meteo and extract the radar study night.

Python standard library only. Run again to reuse the checked raw responses.
Requests are paced below the free API's per-location minute limit.
"""
import hashlib
import json
import math
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / 'data/raw/clouds-era5'
CACHE.mkdir(parents=True, exist_ok=True)
VARIABLES = ['cloud_cover', 'cloud_cover_low', 'cloud_cover_mid', 'cloud_cover_high']
WIDTH, HEIGHT, STEP = 47, 29, .5
WEST, SOUTH = -6, 42
TIMES = [f'2018-09-04T{h:02}:00' for h in range(18, 24)] + [f'2018-09-05T{h:02}:00' for h in range(7)]


def main():
    frames = [{v: [] for v in VARIABLES} for _ in TIMES]
    sources, coordinates = [], []
    for row in range(HEIGHT):
        lat = SOUTH + row * STEP
        params = dict(latitude=','.join([str(lat)] * WIDTH),
                      longitude=','.join(str(WEST + col * STEP) for col in range(WIDTH)),
                      start_date='2018-09-04', end_date='2018-09-05', hourly=','.join(VARIABLES),
                      models='era5', timezone='GMT', cell_selection='nearest', elevation=','.join(['nan'] * WIDTH))
        url = 'https://archive-api.open-meteo.com/v1/archive?' + urlencode(params)
        path = CACHE / f'row-{row:02}.json'
        if not path.exists():
            for attempt in range(4):
                try:
                    with urlopen(Request(url, headers={'User-Agent': 'Zugunruhe-study/0.1'}), timeout=50) as response:
                        raw = response.read()
                    json.loads(raw)
                    path.write_bytes(raw)
                    break
                except HTTPError as error:
                    if error.code != 429 or attempt == 3:
                        raise
                    time.sleep(30)
            time.sleep(6)
        items = json.loads(path.read_bytes())
        assert isinstance(items, list) and len(items) == WIDTH, f'Unexpected row {row}'
        for col, item in enumerate(items):
            assert item['utc_offset_seconds'] == 0
            assert abs(item['latitude'] - lat) < .001 and abs(item['longitude'] - (WEST + col * STEP)) < .001
            coordinates.append([item['latitude'], item['longitude']])
            hourly = item['hourly']
            for t, stamp in enumerate(TIMES):
                index = hourly['time'].index(stamp)
                for variable in VARIABLES:
                    assert item['hourly_units'][variable] == '%'
                    value = hourly[variable][index]
                    assert value is None or (isinstance(value, (int, float)) and math.isfinite(value) and 0 <= value <= 100)
                    frames[t][variable].append(value)
        sources.append({'url': url, 'cache': str(path.relative_to(ROOT)),
                        'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
        print(f'Validated row {row+1}/{HEIGHT} at {lat} N', flush=True)
    output = {'source': 'ERA5 via Open-Meteo', 'units': '%',
              'grid': {'west': WEST, 'south': SOUTH, 'step': STEP, 'width': WIDTH, 'height': HEIGHT,
                       'order': 'Rows south to north, columns west to east'},
              'times': [stamp + ':00Z' for stamp in TIMES], 'frames': frames}
    destination = ROOT / 'data/processed/cloud-night.json'
    destination.write_text(json.dumps(output, separators=(',', ':')) + '\n')
    provenance = {'source': 'Copernicus ERA5 hourly reanalysis via Open-Meteo',
                  'retrieved': datetime.now(timezone.utc).isoformat(),
                  'documentation': 'https://open-meteo.com/en/docs/historical-weather-api',
                  'dataset': 'https://doi.org/10.24381/cds.adbb2d47',
                  'licence': 'https://creativecommons.org/licenses/by/4.0/',
                  'attribution': 'Weather data by Open-Meteo.com. Generated using Copernicus Climate Change Service information.',
                  'processing': 'ERA5 model explicitly selected; nearest grid cell, no elevation downscaling. Every second point of the 0.25 degree source grid. Four cloud-area fractions retained unchanged for 13 UTC hours. No missing values filled.',
                  'gridPoints': len(coordinates), 'sourceResolutionDegrees': .25,
                  'displaySampleSpacingDegrees': STEP, 'sourceResponses': sources,
                  'outputSha256': hashlib.sha256(destination.read_bytes()).hexdigest(),
                  'missingValues': sum(v is None for f in frames for values in f.values() for v in values)}
    (ROOT / 'data/provenance/cloud-night.json').write_text(json.dumps(provenance, indent=2) + '\n')
    print(f'Saved {len(coordinates)} locations × {len(TIMES)} hours × 4 cloud fields; {provenance["missingValues"]} missing values.', flush=True)


if __name__ == '__main__':
    main()
