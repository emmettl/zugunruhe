"""Extract a bounded, attributed study from the original CC BY 4.0 archive.

Usage: python3 scripts/prepare-first-study.py /path/to/dc_zeno.zip
Requires the macOS/system unzip command (the archive uses Deflate64).
"""
import datetime as dt
import hashlib
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
EXPECTED_MD5 = '09673506cbc2ed31f3d7a016ebb32cfb'


def main():
    archive = Path(sys.argv[1])
    digest = hashlib.md5()
    with archive.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(block)
    if digest.hexdigest() != EXPECTED_MD5:
        raise ValueError('Archive checksum differs from the pinned Zenodo version')
    def member(name):
        return json.loads(subprocess.check_output(['unzip', '-p', str(archive), name]))
    source = member('dc_demem.json')
    times = [dt.datetime.strptime(t, '%d-%b-%Y %H:%M:%S') for t in member('time.json')]
    assert len(times) == 46508 and all(a < b for a, b in zip(times, times[1:]))
    for key in ('dens', 'ub', 'vb'):
        assert len(source[key]) == 25
        assert all(len(layer) == len(times) for layer in source[key])
    index = {t: i for i, t in enumerate(times)}
    nights = []
    # Earliest three consecutive September nights with >85% available density
    # in the initial 0.8–4 km inspection band. Choice is coverage-led, not peak-led.
    for day in (2, 3, 4):
        start = dt.datetime(2018, 9, day, 18)
        frames = []
        for minute in range(0, 12 * 60 + 1, 5):
            stamp = start + dt.timedelta(minutes=minute)
            i = index.get(stamp)
            row = {'minute': minute, 'time': stamp.isoformat() + 'Z',
                   'sourceIndex': i}
            for key in ('dens', 'ub', 'vb'):
                # 1–4 km above sea level, in unchanged 200 m source bins.
                row[key] = [source[key][h][i] if i is not None else None for h in range(5, 20)]
            # Mean density over one fixed kilometre, not a count of birds.
            ds = row['dens'][:5]
            row['meanDensity'] = sum(ds) / 5 if all(v is not None for v in ds) else None
            us, vs = row['ub'][:5], row['vb'][:5]
            if (row['meanDensity'] is not None and sum(ds) > 0
                    and all(v is not None for v in us + vs)):
                row['velocity'] = [sum(d*v for d, v in zip(ds, us))/sum(ds),
                                   sum(d*v for d, v in zip(ds, vs))/sum(ds)]
            else:
                row['velocity'] = None
            frames.append(row)
        nights.append({'date': start.date().isoformat(), 'label': f'{day}–{day+1} Sep', 'frames': frames})
    result = {
        'schemaVersion': 1,
        'site': {k: source[k] for k in ('name', 'lat', 'lon', 'height', 'heightDEM')},
        'source': {'doi': '10.5281/zenodo.4587338', 'creator': 'Raphaël Nussbaumer et al.',
                   'license': 'CC BY 4.0', 'archiveMd5': EXPECTED_MD5,
                   'evidence': 'Processed radar estimates; upstream filtering and interpolation'},
        'altitudeCentresMAsl': list(range(1100, 4000, 200)),
        'nights': nights,
    }
    # Check every retained cell against the source, including explicit missingness.
    for night in nights:
        for row in night['frames']:
            for key in ('dens', 'ub', 'vb'):
                for h, value in enumerate(row[key], 5):
                    expected = source[key][h][row['sourceIndex']] if row['sourceIndex'] is not None else None
                    assert value == expected
                    assert value is None or isinstance(value, (float, int))
    path = ROOT / 'data/processed/memmingen-three-nights.json'
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(result, separators=(',', ':'), allow_nan=False) + '\n')
    for night in nights:
        valid = [r for r in night['frames'] if r['meanDensity'] is not None]
        peak = max(valid, key=lambda r: r['meanDensity'])
        print(night['label'], f'{len(valid)}/145 complete band profiles;',
              f"peak {peak['meanDensity']:.2f} birds/km³ at {peak['time']}")
    print(f'Wrote {path} ({path.stat().st_size:,} bytes); original cells and nulls verified.')


if __name__ == '__main__':
    main()
