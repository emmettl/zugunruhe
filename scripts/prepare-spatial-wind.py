"""Retain three screened weather windows at original five-minute/200 m sampling."""
import datetime as dt
import hashlib
import json
from pathlib import Path
import subprocess
import sys
ROOT=Path(__file__).resolve().parents[1]
archive=Path(sys.argv[1])
assert hashlib.md5(archive.read_bytes()).hexdigest()=='09673506cbc2ed31f3d7a016ebb32cfb'
def member(name):return json.loads(subprocess.check_output(['unzip','-p',str(archive),name]))
times={dt.datetime.strptime(t,'%d-%b-%Y %H:%M:%S'):i for i,t in enumerate(member('time.json'))}
keys=['dens','ub','vb','uw','vw']
comparison='--comparison' in sys.argv
dates=['2018-09-24','2018-09-09','2018-10-04','2018-10-08','2018-10-09','2018-10-16','2018-10-17','2018-10-19'] if comparison else ['2018-09-24','2018-09-28','2018-10-07']
nights=[]
for date in dates:
 start=dt.datetime.fromisoformat(date)+dt.timedelta(hours=19)
 stamps=[start+dt.timedelta(minutes=5*i) for i in range(115)]
 nights.append({'date':date,'times':[t.isoformat()+'Z' for t in stamps],'sourceIndices':[times.get(t) for t in stamps],'stations':[]})
for filename in subprocess.check_output(['unzip','-Z1',str(archive)],text=True).splitlines():
 if not filename.startswith('dc_'):continue
 source=member(filename)
 for night in nights:
  frames=[{key:[source[key][h][i] if i is not None else None for h in range(5,20)] for key in keys} for i in night['sourceIndices']]
  night['stations'].append({key:source[key] for key in ['name','lat','lon']}|{'frames':frames})
 print(filename,flush=True)
metadata={'source':{'doi':'10.5281/zenodo.4587338','license':'CC BY 4.0','archiveMd5':'09673506cbc2ed31f3d7a016ebb32cfb','wind':'Deposited ERA5, native hourly 0.25 degrees, interpolated upstream to radar profiles; wind informed bird/insect separation.'},'altitudeCentresMAsl':list(range(1100,4000,200)),'nights':nights}
# Research material is deliberately not imported into the live study yet.
out=ROOT/'data/raw/wind-audit'/('comparison-candidates.json' if comparison else 'full-candidates.json')
out.parent.mkdir(parents=True,exist_ok=True)
out.write_text(json.dumps(metadata,separators=(',',':'),allow_nan=False)+'\n')
report=[]
for n in nights:
 counts=[sum(all(s['frames'][i][k][b] is not None for k in keys) for s in n['stations'] for b in range(15)) for i in range(115)]
 winds=[sum(s['frames'][i]['uw'][b] is not None and s['frames'][i]['vw'][b] is not None for s in n['stations'] for b in range(15)) for i in range(115)]
 print(n['date'],'paired minimum',min(counts),'of 555 at',[n['times'][i] for i,c in enumerate(counts) if c==min(counts)],'wind minimum',min(winds),'missing timestamps',[t for t,i in zip(n['times'],n['sourceIndices']) if i is None])

 report.append({'date':n['date'],'frames':115,'bands':15,'stations':37,
  'pairedFraction':sum(counts)/(115*555),'minimumPairedBands':min(counts),
  'timesBelowHalfCoverage':[n['times'][i] for i,c in enumerate(counts) if c<278],
  'missingSourceTimes':[t for t,i in zip(n['times'],n['sourceIndices']) if i is None],
  'minimumWindBands':min(winds)})
(ROOT/'docs'/('regional-air-candidate-coverage.json' if comparison else 'spatial-wind-candidate-coverage.json')).write_text(json.dumps(report,indent=2,allow_nan=False)+'\n')
