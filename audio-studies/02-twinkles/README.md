# Confluence with twinkles

A second listening experiment, 13 September 2026: the approved Confluence master
with a quiet upper layer for the smaller flow indicators.

[Listen — three minutes](04-confluence-twinkles.mp3).

Eight brief arpeggio gestures contain 26 notes in total, starting at 6.5 seconds.
Each gesture has three or four notes, spaced approximately 0.9–1.5 seconds apart,
with long intervals between gestures. They use the same D major pentatonic
vocabulary in the E5–D6 register. Soft attacks, quickly decaying upper partials,
shorter releases and restrained stereo movement give the detail its own scale
without adding a continuous rhythmic pulse.

The existing rack supplies four phase-modulated wavetable voices and a shared,
damped Hall reverb. No DSP changes, samples or new dependency in the app.
The original Confluence PCM is read directly and mixed with this new stem;
none of the original three audio files or their manifest are overwritten.

The new stem is 20 dB below the foundation by whole-piece RMS. In the five-second
windows containing each gesture it measures 11.6–17.6 dB below the existing mix.
This is a level relationship, not a guarantee of perceived subtlety: the higher
register is deliberately distinguishable, and listening should decide its final balance.

The MP3 measures −24.3 LUFS and −11.0 dBTP after encoding/decoding, close to the
original Confluence's −24.2 LUFS. Only constant gain is applied for listening;
there is no dynamic compression. Both files last 180 seconds.

These gestures are authored sound-design material. They are not yet driven by
observations or individual visual particles. The future mapping should control
the likelihood and character of a bounded number of gestures, preserving room
between them even when the visual field is busy.

## Reproduce

```sh
node scripts/render-audio-twinkles.mjs
AUDIO_OUTPUT=audio-studies/02-twinkles FFMPEG_BIN=/path/to/ffmpeg node scripts/encode-audio-sketches.mjs
```

Requires the original Confluence WAV master and the built local Driftbox rack,
as described in [the first study](../01-flowing/README.md). The render manifest
contains the complete score and patch, hashes of the rack modules, preservation
checksums for the original files, and the mix/encoding measurements. Compilation
has no dropped cables; no notes steal ringing voices; finite PCM, headroom,
duration and the quiet ending were checked.
