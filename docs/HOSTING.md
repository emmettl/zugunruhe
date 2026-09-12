# Dual hosting

The same static build is served at:

- `https://motionstudies.app/zugunruhe/` through Cloudflare Workers Static Assets.
- `https://emmettl.github.io/zugunruhe/` through GitHub Pages.

Entries are the cloud at the root, `network.html` for the islands and
`continent.html` for the sea. Preserved builds are under `studies/01-layers/`
and `studies/02-archipelago/`. Cloudflare may canonicalize `.html` URLs to their
extensionless equivalents. Links and asset paths work under either host's prefix.

## Build and release

Use Node 24 and the pinned npm lockfile. `npm run build` runs Vite with a relative
base, verifies both frozen-study manifests, and stages their builds and source
snapshots into `dist`. Only the hosted copies of frozen HTML gain the small
hosting adapter; the original snapshots, archives and renderer assets are not
modified. The adapter repairs old root-relative links and enables the same
hostname-guarded GitHub Pages analytics beacon as the peer editions. The three
current entries also receive Cloud / Islands / Sea navigation.

`pages.yml` calls `checks.yml`: locked installation, unit tests, build and
Chromium/iPhone-WebKit smoke tests of all five study entries under `/zugunruhe/`.
The tested artifact is then deployed to GitHub Pages. Pull requests run the same
checks without deployment.

`cloudflare.yml` follows only successful main-branch Pages releases. It uses the
shared edition publisher at the pinned commit recorded in the workflow, downloads
that exact `github-pages` artifact, validates it, and publishes only the
`motionstudies.app/zugunruhe*` route as `zugunruhe-hosting`. No data is rebuilt.
A Cloudflare failure does not undo the completed Pages release. The publisher
checks for newer successful runs again before deployment and verifies live
release identity and cache headers afterwards.

The shared publisher registration is reviewed in
[Motion Studies PR 2](https://github.com/emmettl/motionstudies/pull/2). This edition
pins that tested commit and does not require changes to the shared main branch
to run. Existing editions' routes and deployment settings remain unchanged.

## Cloudflare CI configuration

The `cloudflare` GitHub environment permits only main deployments. Store
`CLOUDFLARE_API_TOKEN` there, then set repository variable `CLOUDFLARE_ENABLED=true`.
The token needs the same account Workers Scripts edit and zone Workers Routes
edit / Zone read permissions as the other editions. Never store the local
Wrangler OAuth credential in GitHub CI. A manual `cloudflare.yml` dispatch accepts
a successful Pages `source_run_id` for a first publication or retry.

The existing local Wrangler login can publish a verified Pages artifact using
`python3 scripts/publish-edition.py --edition zugunruhe --run RUN_ID --require-latest --deploy`
from the shared hosting tools checkout. The default without `--deploy` is a dry run.

Cloudflare adds `X-Motion-Studies-Hosting: cloudflare-static` and `_release.json`
with the source commit, run, file counts and content digest. Hashed top-level
assets cache for one year; documents and datasets revalidate; release metadata
uses no-cache. Unknown paths return 404. Cloudflare's existing custom-domain
analytics injection applies to this path.

## Verification and rollback

`npm run preview:hosted` serves the built site at
`http://127.0.0.1:4187/zugunruhe/` with real 404s. CI browser tests use that same
server and retain traces/screenshots on failure.

For rollback, first set `CLOUDFLARE_ENABLED=false`, then republish an earlier
successful Pages artifact locally without `--require-latest`, or select an older
Cloudflare deployment. Re-enable automatic publishing when ready. GitHub Pages
remains available independently.
