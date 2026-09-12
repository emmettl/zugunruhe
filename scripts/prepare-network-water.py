"""Retain regional Natural Earth 1:10m rivers and lakes for terrain context.

Input downloads: ne_10m_rivers_lake_centerlines.geojson and ne_10m_lakes.geojson
from https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/
cached as data/raw/rivers-10m.geojson and data/raw/lakes-10m.geojson.
"""
import hashlib
import json
from pathlib import Path

root=Path(__file__).resolve().parents[1]
bounds=(-10,37,23,61)
def points(coords):
    if not coords:return
    if isinstance(coords[0],(float,int)): yield coords
    else:
        for child in coords: yield from points(child)
def rounded(coords):
    if not coords:return []
    if isinstance(coords[0],(float,int)):return [round(v,5) for v in coords]
    return [rounded(c) for c in coords]
result={}
sources=[]
for kind,original in [('rivers','ne_10m_rivers_lake_centerlines'),('lakes','ne_10m_lakes')]:
    path=root/f'data/raw/{kind}-10m.geojson'
    data=json.loads(path.read_text())
    rows=[]
    for f in data['features']:
        g=f.get('geometry')
        if not g:continue
        ps=list(points(g['coordinates']))
        if not any(bounds[0]<=p[0]<=bounds[2] and bounds[1]<=p[1]<=bounds[3] for p in ps):continue
        p=f['properties']
        rows.append({'name':p.get('name_en') or p.get('name'),'rank':p.get('scalerank',5),
                     'geometry':{'type':g['type'],'coordinates':rounded(g['coordinates'])}})
    result[kind]=rows
    sources.append({'url':f'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/{original}.geojson',
                    'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'featuresRetained':len(rows)})
    print(kind,len(rows))
(root/'data/processed/network-water.json').write_text(json.dumps(result,separators=(',',':'))+'\n')
(root/'data/provenance/network-water.json').write_text(json.dumps({'source':'Natural Earth 1:10m rivers and lakes',
 'license':'Public domain','accessed':'2026-09-12','sources':sources,
 'processing':'Retain features with vertices within 10 W–23 E, 37–61 N; round coordinates to five decimals. Display clips to the terrain extent. Line widths are cartographic, not measured river widths.'},indent=2)+'\n')
