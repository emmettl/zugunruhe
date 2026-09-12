"""Retain detailed Natural Earth country polygons around the study region.

First download the public-domain source to data/raw/countries-10m.geojson:
https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson
"""
import hashlib
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
source=root/'data/raw/countries-10m.geojson'
countries=json.loads(source.read_text())
# Keep complete intersecting polygon parts, including their holes, so no new
# boundary is introduced at the edge of the displayed regional terrain.
bounds=(-11,37,24,61)
features=[]
for feature in countries['features']:
    geometry=feature['geometry']
    polygons=[geometry['coordinates']] if geometry['type']=='Polygon' else geometry['coordinates']
    retained=[]
    for polygon in polygons:
        xs=[p[0] for p in polygon[0]];ys=[p[1] for p in polygon[0]]
        if max(xs)<bounds[0] or min(xs)>bounds[2] or max(ys)<bounds[1] or min(ys)>bounds[3]:continue
        retained.append([[[round(v,5) for v in p] for p in ring] for ring in polygon])
    if retained:
        features.append({'name':feature['properties']['ADMIN'],
                         'geometry':{'type':'MultiPolygon','coordinates':retained}})
(root/'data/processed/europe-outlines.json').write_text(json.dumps(features,separators=(',',':'))+'\n')
provenance={'source':'Natural Earth 1:10m countries','license':'Public domain','accessed':'2026-09-12',
 'url':'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson',
 'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),
 'processing':'Retain complete polygon parts whose bounding boxes intersect 11 W–24 E, 37–61 N, preserving holes and rounding coordinates to five decimals. Render the same detailed geometry as the regional land mask and boundary lines.',
 'countriesRetained':len(features),
 'polygonPartsRetained':sum(len(f['geometry']['coordinates']) for f in features)}
(root/'data/provenance/network-outlines.json').write_text(json.dumps(provenance,indent=2)+'\n')
print(f'Retained {len(features)} countries and {provenance["polygonPartsRetained"]} polygon parts.')
