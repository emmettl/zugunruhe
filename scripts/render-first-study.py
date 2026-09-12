"""Embed the checked subset in the first in-conversation study."""
import json
from pathlib import Path
import sys

root = Path(__file__).resolve().parents[1]
data = json.loads((root / 'data/processed/memmingen-three-nights.json').read_text())
template = (root / 'studies/first-study.html').read_text()
assert template.count('<!--STUDY_DATA-->') == 1
result = template.replace('<!--STUDY_DATA-->', json.dumps(data, separators=(',', ':'), allow_nan=False))
assert len(result.encode()) < 1_000_000
output = Path(sys.argv[1]).resolve()
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(result)
print(f'Wrote {output} ({len(result.encode()):,} bytes)')
