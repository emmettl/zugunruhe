# Confluence, separated for Night

Three synchronized, 180-second stems retain the approved sound and soft-twinkle
balance. Sustained sound accompanies the cloud; passing tones follow the islands;
twinkles follow the visible flow threads. The upper layers recede toward morning.

The browser varies their gains with slow, interruptible fades. It does not seek
the recordings, change pitch, or restart phrases when the timeline is scrubbed.
The individual studies retain the previous fixed accompaniment for comparison.

`scripts/prepare-night-sound.mjs` recovers the sustained and passing contributions
using the original renderer's documented linear weights and normalisation gains.
The twinkle contribution is the difference between the two lossless Confluence
masters. Quantisation residue is very low: the reconstructed sum differs from the
approved master by −94.8 dBFS RMS, before encoding. No stem is independently
normalised; the quiet high notes retain their approved level.

The three MP3s total 4.4 MB. They are encoded and decoded at 24 kHz stereo, with
approximately 104 MB of decoded PCM in total, allocated only after opting in.
Decoding and summing the encoded stems measures −24.0 LUFS and −10.8 dBTP,
within 0.3 LU of the earlier listening MP3, with no limiter or compression.
All stems have identical duration and start times, including their 24-second
repeat overlaps. See `manifest.json` for source hashes and balance measurements.

Reproduce using the retained, locally ignored lossless masters:

```sh
FFMPEG_BIN=/path/to/ffmpeg node scripts/prepare-night-sound.mjs
```

This is an authored orchestration tied to presentation phases. The small
`sound-scene.js` interface leaves room for measured scene inputs later.
