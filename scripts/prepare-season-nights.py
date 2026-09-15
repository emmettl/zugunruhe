"""Audit and summarise the pinned radar archive on a common nightly clock.

python3 scripts/prepare-season-nights.py data/raw/dc_zeno.zip
Uses system unzip because the source archive uses Deflate64.
"""
import collections
import datetime as dt
import hashlib
import json
import math
from pathlib import Path
import statistics
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
MD5 = '09673506cbc2ed31f3d7a016ebb32cfb'
BANDS = range(5, 20)
SAMPLES = 48
MINIMUM = math.ceil(SAMPLES * .8)


def finite(value):
    return isinstance(value, (float, int)) and math.isfinite(value)


def summarise(profiles):
    """All retained heights share exactly the same complete-profile timestamps."""
    complete = [p for p in profiles if p is not None and
                all(finite(d) and d >= 0 for d in p['dens'])]
    paired = [p for p in complete if all(finite(v) for k in ('ub', 'vb') for v in p[k])]
    accepted = len(complete) >= MINIMUM
    density = [statistics.fmean(p['dens'][b] for p in complete) for b in range(15)] if accepted else None
    weight = sum(sum(p['dens']) for p in paired)
    velocity = [sum(d * v for p in paired for d, v in zip(p['dens'], p[k])) / weight
                for k in ('ub', 'vb')] if len(paired) >= MINIMUM and weight > 0 else None
    rounded = lambda values: [round(v, 4) for v in values] if values is not None else None
    return {
        'completeSamples': len(complete), 'pairedSamples': len(paired),
        'density': rounded(density),
        'meanDensity': round(statistics.fmean(density), 4) if accepted else None,
        'velocity': rounded(velocity),
        # Retain gaps and valid zeros even on nights rejected for seasonal display.
        'trace': [round(statistics.fmean(p['dens']), 4) if p is not None and
                  all(finite(d) and d >= 0 for d in p['dens']) else None for p in profiles],
    }


def main():
    archive = Path(sys.argv[1])
    digest = hashlib.md5()
    with archive.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(block)
    if digest.hexdigest() != MD5:
        raise ValueError('Archive checksum differs from the pinned Zenodo version')

    def member(name):
        return json.loads(subprocess.check_output(['unzip', '-p', str(archive), name]))

    times = [dt.datetime.strptime(t, '%d-%b-%Y %H:%M:%S') for t in member('time.json')]
    assert len(times) == 46508 and all(a < b for a, b in zip(times, times[1:]))
    index = {t: i for i, t in enumerate(times)}
    dates = [dt.datetime(2018, 1, 1) + dt.timedelta(days=d) for d in range(365)]
    windows = [[index.get(date + dt.timedelta(hours=22, minutes=5 * j))
                for j in range(SAMPLES)] for date in dates]
    names = subprocess.check_output(['unzip', '-Z1', str(archive)], text=True).splitlines()
    inventory = json.loads((ROOT / 'data/processed/network-stations.json').read_text())
    labels = {s['name']: s['location'] for s in inventory['metadata']}
    target = ROOT / 'data/processed/season-nights'
    target.mkdir(parents=True, exist_ok=True)

    def write(path, data):
        path.write_text(json.dumps(data, separators=(',', ':'), allow_nan=False) + '\n')

    stations, values = [], []
    for name in sorted(n for n in names if n.startswith('dc_') and n.endswith('.json')):
        source = member(name)
        for k in ('dens', 'ub', 'vb'):
            assert len(source[k]) == 25 and all(len(b) == len(times) for b in source[k])
        nights = []
        for date, window in zip(dates, windows):
            profiles = [{k: [source[k][b][i] for b in BANDS] for k in ('dens', 'ub', 'vb')}
                        if i is not None else None for i in window]
            nights.append({'date': date.date().isoformat(), **summarise(profiles)})
        site = {k: source[k] for k in ('name', 'lat', 'lon', 'height', 'heightDEM')}
        site['label'] = labels.get(site['name'], site['name'])
        monthly = [{'month': month, 'accepted': sum(n['density'] is not None for n in nights
                    if int(n['date'][5:7]) == month), 'total': sum(int(n['date'][5:7]) == month for n in nights)}
                   for month in range(1, 13)]
        accepted = [n for n in nights if n['density'] is not None]
        values.extend(v for n in accepted for v in n['density'])
        row = {**site, 'acceptedNights': len(accepted), 'monthly': monthly}
        stations.append(row)
        write(target / (site['name'] + '.json'), {'schemaVersion': 1, 'site': site, 'nights': nights})
        print(f"{site['name']} {site['label']}: {len(accepted)}/365 nights; " +
              ' '.join(str(m['accepted']) for m in monthly), flush=True)
    values.sort()
    # A fixed, reproducible pooled P99 cap; never a per-station or per-season scale.
    cap = values[math.ceil(.99 * len(values)) - 1]
    manifest = {
        'schemaVersion': 1, 'year': 2018,
        'source': {'doi': '10.5281/zenodo.4587338', 'license': 'CC BY 4.0', 'archiveMd5': MD5,
                   'firstTimestamp': times[0].isoformat() + 'Z', 'lastTimestamp': times[-1].isoformat() + 'Z',
                   'timestampCountsByMonth': dict(sorted(collections.Counter(t.strftime('%Y-%m') for t in times).items()))},
        'window': {'startUtc': '22:00', 'endUtc': '02:00', 'endExclusive': True,
                   'intervalMinutes': 5, 'expectedSamples': SAMPLES, 'minimumCompleteSamples': MINIMUM},
        'altitudeCentresMAsl': list(range(1100, 4000, 200)),
        'scale': {'densityCap': cap, 'transform': 'sqrt', 'pooledBandValues': len(values),
                  'maximumDensity': max(values), 'medianDensity': statistics.median(values)},
        'stations': stations,
    }
    write(ROOT / 'data/processed/season-nights-index.json', manifest)
    print('Scale:', manifest['scale'])


if __name__ == '__main__':
    main()
