# First integrated soundtrack

The editable Cloud, Islands, Sea, Currents, Night, Air and original station Air
studies share an optional accompaniment: **Confluence with softer twinkles**.
The two frozen studies retain their original controls and assets.

This first integration plays the approved Driftbox render. It does not yet
generate a live score or map observations to notes. The listening experiments
and reproducible rendering scripts are retained under `audio-studies/`; the
[audio direction](AUDIO-DIRECTION.md) describes the subsequent composition work.

## Listening and interaction

- The speaker button beside the timeline starts or pauses sound. It has a
  44 × 48 px target and an accessible on/off label and pressed state.
- Four faint motes drift into the speaker on entry, drawing attention to sound.
  They settle after 20 seconds or disappear on the first tap, and are disabled
  when reduced motion is requested. They do not intercept touches or load audio.
- When sound is enabled, focus or hover reveals the volume slider. Touching the
  button focuses it; keyboard users can Tab to the slider. Escape dismisses the
  panel. Volume is remembered locally, with a default of 65%.
- Sound is off on entry. Neither its asset nor an AudioContext is created before
  the first explicit sound gesture. Sound enablement is not stored or autoplayed.
- Musical playback has its own clock. Visual pause, scrubbing, speed, camera,
  altitude, palette, chapter and night changes do not restart or retime it.
- Sound fades out when switched off and resumes from its retained position.
  Leaving the tab pauses it immediately; returning requires tapping Sound again.
  Navigation to another study stops the current page's sound. The new page starts
  silent, while retaining the volume preference. Night's internal cloud/islands/sea
  transitions keep the same uninterrupted soundtrack.
- Failed loads or audio starts show a retry message. Turning sound off during
  loading prevents a late download from unexpectedly starting playback.

## Playback

`src/study-sound.js` installs the compact control through the shared site shell,
with an explicit frozen-study guard. It lazy-loads the hashed version of
`audio-studies/03-soft-twinkles/05-confluence-soft-twinkles.mp3` (4.3 MB).
No synthesis package or external runtime service is added to the production app.

`src/soundtrack.js` decodes the recording once, schedules buffer sources against
the Web Audio clock, and uses 24-second equal-power overlaps. Each repeat begins
156 seconds after the preceding one. Sources are scheduled more than a cycle
ahead, independently of animation-frame timing. A master gain handles volume and
short start/stop fades. Suspending the AudioContext retains position and effect
tails already contained in the recording. The decoded stereo buffer is roughly
64–69 MB, depending on the browser's sample rate, and exists only after opt-in.

The recording measures −24.3 LUFS with a −11 dBTP maximum before the player's
volume adjustment. Crossfade checks on the lossless master give a 100 ms RMS
range of −31 to −22 dBFS across the join, with a −11 dBFS peak: no silent interval
or clipping at the repeat. This verifies continuity, not a new musical judgement.

## Validation

Unit checks cover lazy loading, overlap curves and scheduling, cancelled loads,
rapid toggles, retained position, retry, device interruption, hidden-page starts,
volume and disposal. The full unit suite has 58 checks.

Browser coverage exercises native decoding/playback, cancellation and retry,
independence from the visual timeline, volume persistence, touch-target size and
default-off navigation. Hosting checks also assert that editable studies gain
the button and frozen snapshots do not. The original frozen manifests continue
to be verified by the production build.
