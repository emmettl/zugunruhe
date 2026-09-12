"""Extract matched bird/wind profiles; source archive uses Deflate64 (system unzip)."""
import hashlib,json,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
archive=Path(sys.argv[1])
assert hashlib.md5(archive.read_bytes()).hexdigest()=='09673506cbc2ed31f3d7a016ebb32cfb'
source=json.loads(subprocess.check_output(['unzip','-p',str(archive),'dc_demem.json']))
study=json.loads((ROOT/'data/processed/memmingen-three-nights.json').read_text())
keys=('dens','ub','vb','uw','vw')
for key in keys:
    assert len(source[key])==25 and all(len(row)==46508 for row in source[key])
for night in study['nights']:
    for frame in night['frames']:
        i=frame['sourceIndex']
        for key in keys:
            values=[source[key][h][i] if i is not None else None for h in range(5,20)]
            if key in frame:assert frame[key]==values
            frame[key]=values
    paired=sum(all(f[k][b] is not None for k in keys) for f in night['frames'] for b in range(15))
    night['pairedBands']=paired
    print(night['date'],paired,'paired band-times of',145*15)
study['windSource']={'dataset':'ERA5 pressure-level reanalysis, as exported by Nussbaumer et al.',
 'doi':'10.24381/cds.bd0915c6','nativeResolution':'hourly, 0.25 degrees',
 'processing':'Upstream linear interpolation in position, time and altitude; pressure-to-height conversion uses a standard atmosphere.',
 'codeRevision':'5d9d65437c4f4eec341b4bcfd7084948da6ad7ad',
 'dependency':'Wind also informed upstream bird/insect separation. These estimates are not independent.'}
(ROOT/'data/processed/air-three-nights.json').write_text(json.dumps(study,separators=(',',':'),allow_nan=False)+'\n')
print('Verified every retained cell against the pinned archive; no additional gap filling.')
