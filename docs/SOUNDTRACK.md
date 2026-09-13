# Integrated soundtrack and first responsive score

The editable Cloud, Islands, Sea, Currents, Night, Air and original station Air
studies share an optional accompaniment: **Confluence with softer twinkles**.
Night now plays its three constituent layers with a balance that follows the journey.
Night, Sea and Currents also have an experimental **Cloud veil** motif whose
presence follows the selected regional cloud-cover estimate.
The two frozen studies retain their original controls and assets.

The integration uses the approved Driftbox renders. It does not yet
generate notes live or map observations to notes. The listening experiments
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
  Moving focus or tapping outside sound settings also dismisses the panel, so
  it does not remain over Controls after a timeline scrub.
- Sound is off on entry. Neither its asset nor an AudioContext is created before
  the first explicit sound gesture. Sound enablement is not stored or autoplayed.
- Musical playback has its own clock. Visual pause, scrubbing, speed, camera,
  altitude, palette, chapter and night changes do not restart or retime it.
  In Night, the visual reveals change the balance: sustained cloud, passing
  tones with neighbours (indices 22–32), then twinkles with threads (66–84).
  Toward morning (102–126), twinkles fade away, passing tones recede to 35%, and
  sustained sound to 82%. These are authored gain choices, not bird measurements.
  Scrubbing redirects exponential gain fades from their current level: about
  five seconds to arrive and eight to recede (95% settling). Pause holds the
  scene's balance while musical phrases continue. The volume popup names the phase.
- The palette selector in Night, Sea and Currents also colours the music. Aquatic
  is darker with a diffuse echo; Ember is warm and veiled; Boreal softly spacious;
  Oxygen clearer and closer. Four-and-a-half-second settling reshapes tone and
  space without seeking, retuning, loading another recording or changing the
  phase mix. A palette selected before opting in is used on the first sound.
  Studies without a palette selector retain their original tone.
- Selecting cloud cover introduces a separate, low, slowly swelling phrase.
  Its target gain is the square root of the area-weighted regional cloud
  fraction from the same retained ERA5 layer and interpolated time as the veil.
  Switching cloud layers or scrubbing redirects the existing calm fades. Off,
  zero cover, out-of-range time or unavailable data fades it away. This is an
  authored response to regional weather; the notes are not measured cloud events.
- Sound fades out when switched off and resumes from its retained position.
  Leaving the tab pauses it immediately; returning requires tapping Sound again.
  Navigation to another study stops the current page's sound. The new page starts
  silent, while retaining the volume preference. Night's internal cloud/islands/sea
  transitions keep the same uninterrupted soundtrack.
- Failed loads or audio starts show a retry message. Turning sound off during
  loading prevents a late download from unexpectedly starting playback.

## Playback

`src/study-sound.js` installs the compact control through the shared site shell,
with an explicit frozen-study guard. Outside Night, it lazy-loads the hashed version of
`audio-studies/03-soft-twinkles/05-confluence-soft-twinkles.mp3` (4.3 MB).
No synthesis package or external runtime service is added to the production app.

Night instead lazy-loads three synchronized stems from `audio-studies/04-responsive/`.
Their total download is 4.4 MB; a 24 kHz OfflineAudioContext decodes them to about
104 MB of PCM, avoiding three device-rate copies on phones. All three are loaded
before playback and validated for matching durations. Per-stem gain nodes sit
after their repeat envelopes, so muted parts continue in sync and scrubs do not
retrigger notes. `nightSound()` follows `nightPresentation()`; `sound-scene.js`
publishes the current mix even before audio loads. Repeated scrubs replace gain
targets, rather than queueing transitions. The other studies remain listening
references with the complete fixed recording.

The cloud-capable studies additionally load `audio-studies/05-clouds/cloud-veil.mp3`
after sound opt-in, even if clouds start off, so enabling them later never waits
for a download. This quiet fourth layer in Night (second layer in Sea/Currents)
is decoded at 24 kHz and shares the same repeat clock. It adds 1.7 MB compressed
and 35 MB decoded; Night totals about 6.1 MB and 139 MB respectively. A muted
cloud layer continues in sync, so toggling does not trigger a new attack.
`cloudCoverMean()` weights grid rows by cosine latitude and requires valid
endpoints wherever interpolation has nonzero weight. Missing data is not zero.
`sound-scene.js` publishes the cloud state separately from Night's phase mix,
preventing a chapter change from overwriting the weather response.

`sound-colour.js` adds a low-pass filter and a treble shelf, plus a restrained
0.71-second filtered delay before the master volume. The delay has no feedback
and its time never changes, avoiding pitch bends. Palette changes redirect
AudioParam targets from their current values (1.5-second time constant).
Treble is only attenuated; complementary direct and delayed gains sum to one.
No extra audio assets are fetched. Colour and phase gains are independent.

`src/soundtrack.js` decodes the recording once, schedules buffer sources against
the Web Audio clock, and uses 24-second equal-power overlaps. Each repeat begins
156 seconds after the preceding one. Sources are scheduled more than a cycle
ahead, independently of animation-frame timing. A master gain handles volume and
short start/stop fades. Suspending the AudioContext retains position and effect
tails already contained in the recording. The decoded stereo buffer is roughly
64–69 MB, depending on the browser's sample rate, and exists only after opt-in.

The fixed recording measures −24.3 LUFS with a −11 dBTP maximum before the player's
volume adjustment. Crossfade checks on the lossless master give a 100 ms RMS
range of −31 to −22 dBFS across the join, with a −11 dBFS peak: no silent interval
or clipping at the repeat. This verifies continuity, not a new musical judgement.
The new encoded stems summed at full gain measure −24.0 LUFS and −10.8 dBTP.
Adding the cloud motif at full strength measures −23.9 LUFS and −10.4 dBTP.

## Validation

Unit checks cover lazy loading, overlap curves and scheduling, cancelled loads,
rapid toggles, retained position, retry, device interruption, hidden-page starts,
volume and disposal. The full unit suite has 66 checks, including synchronized
stems, interrupted fades, rejection/retry of mismatched stems and continuous mapping.
Palette checks cover lazy application, rapid switching, retained musical time,
unchanged master volume, fixed delay and restrained upper notes. Browser coverage
changes palettes before loading and during playback, then scrubs between phases.
Cloud checks cover weighted means, temporal interpolation, missing versus zero
cover, preselected cloud layers and toggling during playback without reloading.

Browser coverage exercises native decoding/playback, cancellation and retry,
independence from the visual timeline, volume persistence, touch-target size and
default-off navigation. Hosting checks also assert that editable studies gain
the button and frozen snapshots do not. The original frozen manifests continue
to be verified by the production build.
