# Borrowed sky — air and answering voices

22 September 2026. A 2:12 render of the live Soaring score, accompanying bird 01
through the default simulation. This is the chosen direction for the current
study: a sustained lower voice, spacious rounded phrases, and quieter answers as
companions gather. It is available in the live study through **Listen**.

[Listen to the opening passage](listen-passage.m4a)

| Time | Flight and musical intention |
| --- | --- |
| 0:00–0:55 | Circling together; ascending phrases and occasional delayed answers. |
| 0:56–1:43 | Departure and search; a soft closing tone, more silence, thinner upper voices. |
| 1:44–1:51 | Bird 01 notices bird 09 climbing; confidence begins returning. |
| 1:51–2:08 | Joining the climb; upper voices and quiet answers can gather again. |
| 2:08–2:12 | Stop and fade to silence. |

The melody stays within D major pentatonic. Answers arrive 2.6 seconds after a
lead phrase, at 48% of its amplitude. Slow stereo motion narrows as confidence
and nearby company increase; phrase density still responds to climb and readiness.
The lower foundation stays present through searching. There is no reverb wash or
literal wing or wind recording. The camera and sound remain independent of the
bird steering rules.

This develops the broader project's idea of two slowly moving musical voices.
The separate bird/wind direction comparisons in study 07 have not been promoted
into Air or incorporated as source audio. This score synthesises its own material.

## Archived flight

This sample captures the 22 September flight, before varied thermals and changing
weather were added. The current score design is the same, but new weather changes
the birds' decisions and therefore the timing of musical responses. The table and
`render.json` describe this archived sample. Running the script now renders the
current flight and replaces the sample and report; it does not reproduce this
older flight. The original source is in commit `2da7fbe`.

## Render and checks

`node scripts/render-soaring-listening.mjs` uses installed Playwright Chromium and
Web Audio's OfflineAudioContext. It runs the same score module, flight model and
proximity calculation as the live page, at the default 65% volume. The browser
loads only intercepted local modules; the script makes no external service calls.
Native macOS `afconvert` encodes the AAC listening file. A temporary PCM WAV is
removed after encoding. Browser binaries must already be installed.

The PCM render peaks at about **−16.23 dBFS**, with whole-piece RMS **−30.90 dBFS**,
and its final second is silent. These are signal-level checks, not subjective
listening judgments or perceptual loudness measurements. `render.json` records
exact levels, event times and source hashes. The sample has no separate gain
normalisation: its level matches the live graph at the same volume setting.

Listen for whether the second voice makes reunion perceptible without demanding
attention, and whether searching leaves enough space without feeling like the
sound has stopped. Headphone stereo is one cue; the presence or absence of the
answering phrase also survives mono playback.
