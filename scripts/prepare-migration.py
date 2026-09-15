"""Prepare recorded stork positions; python environment requires rdata==0.11.2.

Fetch the pinned input URLs in docs/MIGRATION.md into data/raw first.
No coordinates or times are interpolated. One first fix per UTC half-hour,
plus both ends of every >2h source gap and each bird's first/last fix.
"""
import hashlib
import json
import math
import warnings
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'data/raw/whitestork_data.rda'
COMMIT = '8603e8c443476feb84b2db17b365fd95e6926e20'


def select_fixes(rows):
    rows = sorted(rows)
    if not rows:
        return []
    keep = {0, len(rows) - 1}
    previous_bucket = None
    for i, point in enumerate(rows):
        bucket = int(point[0] // 1800)
        if bucket != previous_bucket:
            keep.add(i)
        previous_bucket = bucket
        if i and point[0] - rows[i - 1][0] > 7200:
            keep.update((i - 1, i))
    return [rows[i] for i in sorted(keep)]


def main():
    import rdata
    warnings.filterwarnings('ignore', category=UserWarning, module='rdata')
    raw = SOURCE.read_bytes()
    # Git blob digest pins the exact publicly distributed data subset.
    digest = hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()
    if digest != '7ed1f1b6c4c0f8bd97498cf5a716081581d46598':
        raise ValueError('Unexpected source data; check pinned version')
    frame = rdata.read_rda(SOURCE)['df']
    tracks = []
    for name, group in frame.groupby('name', sort=True):
        rows = []
        for _, row in group.iterrows():
            t, lon, lat = (float(row[c]) for c in ('timestamp', 'location-long', 'location-lat'))
            if not all(math.isfinite(v) for v in (t, lon, lat)) or not (-180 <= lon <= 180 and -90 <= lat <= 90):
                raise ValueError('Invalid observation')
            rows.append([t, round(lon, 7), round(lat, 7)])
        rows = sorted(rows)
        if any(b[0] <= a[0] for a, b in zip(rows, rows[1:])):
            raise ValueError('Non-unique timestamps')
        tracks.append({'id': name.lower().replace(' ', '-'), 'name': name,
                       'sourceId': str(group.iloc[0]['individual-local-identifier']),
                       'sourceCount': len(rows), 'fixes': select_fixes(rows)})
    data = {'schema': 1, 'species': 'Ciconia ciconia', 'license': 'CC0-1.0',
            'doi': '10.5441/001/1.ck04mn78', 'sourceCommit': COMMIT,
            'sourceSha256': hashlib.sha256(raw).hexdigest(),
            'sourceCount': len(frame), 'columns': ['unixSecondsUTC', 'longitude', 'latitude'],
            'sampleSeconds': 1800, 'maxConnectionSeconds': 7200,
            'start': min(t['fixes'][0][0] for t in tracks),
            'end': max(t['fixes'][-1][0] for t in tracks), 'tracks': tracks}
    output = ROOT / 'data/processed/migration-storks.json'
    output.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n')
    world = json.loads((ROOT / 'data/raw/migration-world.geojson').read_text())
    countries = []
    for feature in world['features']:
        geom = feature['geometry']
        polys = geom['coordinates'] if geom['type'] == 'MultiPolygon' else [geom['coordinates']]
        rings = []
        for poly in polys:
            ring = poly[0]
            xs, ys = zip(*ring)
            if max(xs) < -20 or min(xs) > 25 or max(ys) < 25 or min(ys) > 58:
                continue
            rings.append([[round(x, 4), round(y, 4)] for x, y in ring])
        if rings:
            countries.append({'name': feature['properties']['NAME'], 'rings': rings})
    (ROOT / 'data/processed/migration-land.json').write_text(json.dumps(countries, separators=(',', ':')) + '\n')
    print(f"{len(tracks)} birds, {len(frame):,} original fixes, {sum(len(t['fixes']) for t in tracks):,} retained")


if __name__ == '__main__':
    main()
