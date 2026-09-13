"""Screen autumn nights for spatial wind variation and paired bird availability.

Uses hourly samples at three heights, without filling gaps or simulating values.
Writes screening samples outside Git and a small reproducible ranking in docs.
"""
import datetime as dt
import hashlib
import json
import math
from pathlib import Path
import statistics as st
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
archive = Path(sys.argv[1])
assert hashlib.md5(archive.read_bytes()).hexdigest() == '09673506cbc2ed31f3d7a016ebb32cfb'

def member(name):
    return json.loads(subprocess.check_output(['unzip', '-p', str(archive), name]))

times = {dt.datetime.strptime(t, '%d-%b-%Y %H:%M:%S'): i for i, t in enumerate(member('time.json'))}
dates = [dt.datetime(2018, 8, 1) + dt.timedelta(days=i) for i in range(92)]
heights = [5, 10, 15]  # 1.1, 2.1, 3.1 km ASL
keys = ['dens', 'ub', 'vb', 'uw', 'vw']
windows = [{'date': d.date().isoformat(), 'times': [(d + dt.timedelta(hours=h)).isoformat()+'Z' for h in range(20, 28)], 'stations': []} for d in dates]
for name in subprocess.check_output(['unzip', '-Z1', str(archive)], text=True).splitlines():
    if not name.startswith('dc_'): continue
    source = member(name)
    for d, window in zip(dates, windows):
        frames = []
        for hour in range(20, 28):
            i = times.get(d + dt.timedelta(hours=hour))
            frames.append([[source[k][h][i] if i is not None else None for k in keys] for h in heights])
        window['stations'].append({k: source[k] for k in ['name', 'lat', 'lon']} | {'frames': frames})
    print(name, flush=True)

finite = lambda x: isinstance(x, (int, float)) and math.isfinite(x)
paired = lambda c: all(finite(v) for v in c)
wind = lambda c: all(finite(v) for v in c[3:])
mean = lambda vs: st.mean(vs) if vs else None

def distance(a, b):
    p, q = math.radians(a['lat']), math.radians(b['lat'])
    x = math.sin((q-p)/2)**2 + math.cos(p)*math.cos(q)*math.sin(math.radians(b['lon']-a['lon'])/2)**2
    return 12742 * math.asin(min(1, math.sqrt(x)))

def metrics(window):
    stations = window['stations']
    cells = [c for s in stations for f in s['frames'] for c in f]
    spatial, local, shear, temporal = [], [], [], []
    for t in range(8):
        for b in range(3):
            cs = [s['frames'][t][b] for s in stations if wind(s['frames'][t][b])]
            if len(cs) >= 28:
                u, v = mean([c[3] for c in cs]), mean([c[4] for c in cs])
                spatial.append(math.sqrt(mean([(c[3]-u)**2+(c[4]-v)**2 for c in cs])))
            # Nearby sites in the Swiss-adjacent region; never treat distant countries as local texture.
            region = [s for s in stations if 45 <= s['lat'] <= 50 and 4 <= s['lon'] <= 13]
            for i, a in enumerate(region):
                for z in region[i+1:]:
                    ca, cz = a['frames'][t][b], z['frames'][t][b]
                    if 100 <= distance(a, z) <= 400 and wind(ca) and wind(cz):
                        local.append(math.hypot(ca[3]-cz[3], ca[4]-cz[4]))
    for s in stations:
        for f in s['frames']:
            if wind(f[0]) and wind(f[2]): shear.append(math.hypot(f[0][3]-f[2][3], f[0][4]-f[2][4]))
        for b in range(3):
            a,z=s['frames'][0][b],s['frames'][-1][b]
            if wind(a) and wind(z): temporal.append(math.hypot(a[3]-z[3],a[4]-z[4]))
    return {'date':window['date'], 'pairedFraction':sum(paired(c) for c in cells)/len(cells),
      'windFraction':sum(wind(c) for c in cells)/len(cells),
      'medianBirdDensity':st.median([c[0] for c in cells if paired(c)]) if any(paired(c) for c in cells) else None,
      'spatialRmsMs':mean(spatial), 'nearbyDifferenceMs':mean(local), 'heightShearMs':mean(shear), 'overnightChangeMs':mean(temporal)}

out = ROOT/'data/raw/wind-audit'
out.mkdir(parents=True, exist_ok=True)
(out/'hourly-autumn.json').write_text(json.dumps({'heightsKm':[1.1,2.1,3.1], 'cellFields':keys, 'windows':windows}, separators=(',', ':'), allow_nan=False)+'\n')
rows = [metrics(w) for w in windows]
(ROOT/'docs/spatial-wind-screening.json').write_text(json.dumps({'sourceMd5':'09673506cbc2ed31f3d7a016ebb32cfb','hoursUTC':'20:00–03:00, hourly','heightsKm':[1.1,2.1,3.1],'stations':37,'nights':rows},indent=2, allow_nan=False)+'\n')
usable = [r for r in rows if r['pairedFraction'] >= .7 and r['windFraction'] >= .9]
for field in ['nearbyDifferenceMs','spatialRmsMs','heightShearMs','overnightChangeMs']:
    print(field)
    for r in sorted(usable, key=lambda r:r[field] or 0, reverse=True)[:8]: print(r)
print('BASELINES', [r for r in rows if r['date'] in ['2018-09-02','2018-09-03','2018-09-04']])
