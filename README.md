```
MOTION STUDIES 006
ZUGUNRUHE
The sky moves as Europe sleeps
``` 

# Introduction/Manifesto

THis is part of the Motion Studies series, using the motion studies technologies, frameworks and visual grammar.
It is an attempt to create beautiful, insightful or surprising visualisation of the migration of birds. 
It will start with looking at European birds, showing their flow and seasonality. 
Where it makes sense the data can be augmented with simulations of flocking behaviour but the maxim is: interpolated, never fake. 

Murmurations, the interplay of light and motion. 

But it must start somewhere.  With the data; without the grounding in reality it tells us little about the world.

# Sound Design

Part of this is to show the flow via sound in addition to light, to help the viewer connect to the flow of the visuals and the mood. 
It is anticipated that some of these techniques may flow back to the other projects (in particular Gleislicht) as a way to "hear the city". 
The driftbox engine used in gleislicht is a jumping off point but I forsee new realtime generative music whose mood and sounds are rather different. 

# Plan of commencement

There are three different strands: 
- Visual concepts, grammar and flow
- Data. What can be had, how, and whawt would be interesting to present?
- Sounds. How can we build an emotionally satisfying connection between the visuals and the mood? 

# First local study

The **Layers** prototype uses three nights of processed radar estimates from
Memmingen, near Lake Constance. Fifteen altitude bands become translucent colour
fields: altitude determines colour, density determines brightness, and estimated
velocity guides an illustrative flowing texture. The study supports orbiting,
altitude selection, night comparison and a shared playback clock.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. `npm run build` creates the static client.
The current studies are published on both hosts linked below.

[Data provenance and reproduction](docs/FIRST-STUDY.md) ·
[3D representation and controls](docs/LAYERS.md)

This initial study is preserved as [Study 01 — Layers](studies/README.md), with
a frozen runnable build and a source archive. Future iterations can branch from
that snapshot. The root app remains the editable working copy.

The second study, **Archipelago**, is at `/network.html`: 37 radar
profiles over curved Western European terrain, with a 100 km oblique viewpoint,
wider camera presets and an explicit altitude-exaggeration comparison.
[Representation and controls](docs/ARCHIPELAGO.md) ·
[Network investigation](docs/NETWORK-STUDY.md).

Archipelago is now preserved at `/studies/02-archipelago/`, with a frozen build,
source archive and checksum manifest. **Study 03 — Continent ablaze**, at
`/continent.html`, joins the observed region into continuous flowing altitude
layers. [Spatial model, controls and validation](docs/CONTINENT.md).

Sea also has a first [cloud-cover comparison](docs/CLOUDS.md): hourly ERA5 weather on the same 4–5 September 2018 clock, with total, low, middle and high cover.

# Hosting

[Motion Studies host](https://motionstudies.app/zugunruhe/) ·
[GitHub Pages](https://emmettl.github.io/zugunruhe/) ·
[Deployment workflow and rollback](docs/HOSTING.md)

The same verified artifact goes to both hosts, with the three current studies
and both frozen snapshots included. `npm run preview:hosted` checks the built
site under its production `/zugunruhe/` prefix.

The fourth study, [Currents](docs/CURRENTS.md), opens at `/currents.html`: persistent
luminous paths integrated through the radar-derived velocity field, with deterministic
timeline scrubbing. Sea remains available as the previous continuous-field study.

The first continuous journey, **A night in passage**, is at `/night.html`: one
clock carries the view from Memmingen through the archipelago into the estimated
sea. [Night selection, itinerary and controls](docs/NIGHT.md).

**Birds and air**, at `/air.html`, compares bird movement with the archive’s
matching ERA5 wind across three nights at Memmingen.
[Data, interpretation and controls](docs/AIR.md).
