"""Inventory the pinned archive and retain a synchronized night for scale studies."""
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
archive = Path(sys.argv[1])
assert hashlib.md5(archive.read_bytes()).hexdigest() == '09673506cbc2ed31f3d7a016ebb32cfb'
def member(name):
    return json.loads(subprocess.check_output(['unzip','-p',str(archive),name]))
names = subprocess.check_output(['unzip','-Z1',str(archive)],text=True).splitlines()
times = [dt.datetime.strptime(t,'%d-%b-%Y %H:%M:%S') for t in member('time.json')]
indices = {t:i for i,t in enumerate(times)}
stamps = [dt.datetime(2018,9,4,18) + dt.timedelta(minutes=m) for m in range(0,721,5)]
stations = []
for name in names:
    if not name.startswith('dc_'): continue
    source = member(name)
    frames = []
    for stamp in stamps:
        i = indices.get(stamp)
        frame = {'time':stamp.isoformat()+'Z','minute':int((stamp-stamps[0]).total_seconds()/60)}
        for key in ('dens','ub','vb'):
            frame[key] = [source[key][h][i] if i is not None else None for h in range(5,20)]
        frames.append(frame)
    stations.append({**{k:source[k] for k in ('name','lat','lon','height','heightDEM')},'frames':frames})
    print(source['name'],flush=True)

def distance(a,b):
    p,q=math.radians(a['lat']),math.radians(b['lat'])
    d=math.radians(b['lon']-a['lon'])
    v=math.sin((q-p)/2)**2+math.cos(p)*math.cos(q)*math.sin(d/2)**2
    return 12742.0176*math.asin(min(1,math.sqrt(v)))
def spacing(rows):
    ns=[min(distance(a,b) for b in rows if b is not a) for a in rows]
    return {'count':len(rows),'nearestKm':{'min':round(min(ns),1),'median':round(statistics.median(ns),1),'max':round(max(ns),1)}} if ns else None
archiveStats=spacing(stations)
archiveStats['countries']=dict(collections.Counter(s['name'][:2] for s in stations))
archiveStats['completeProfilesAt2200']=sum(all(d is not None for d in s['frames'][48]['dens']) for s in stations)
inventory=json.loads((ROOT/'data/provenance/opera-radars-2026-02-10.json').read_text())
active=[{'name':r.get('odimcode'), 'country':r['country'], 'location':r['location'],
         'lat':float(r['latitude']), 'lon':float(r['longitude'])}
        for r in inventory if r.get('status')=='1' and r.get('odimcode') and r.get('latitude') and r.get('longitude')]
active=list({s['name']:s for s in active}.values())
groups={c:spacing([s for s in active if s['country']==c]) for c in ('Switzerland','Germany','France')}
summary={'archive2018':archiveStats,'metadata2026':{'activeCodedStations':len(active),'countries':dict(collections.Counter(s['country'] for s in active)),'nationalSpacing':groups}}
result={'source':{'doi':'10.5281/zenodo.4587338','license':'CC BY 4.0','date':'2018-09-04','bands':'1–4 km ASL'},'stations':stations,'summary':summary}
(ROOT/'data/processed/network-night.json').write_text(json.dumps(result,separators=(',',':'))+'\n')
(ROOT/'data/processed/network-stations.json').write_text(json.dumps({'archive':[dict((k,v) for k,v in s.items() if k!='frames') for s in stations],'metadata':active,'summary':summary},indent=2)+'\n')
print(json.dumps(summary,indent=2))
