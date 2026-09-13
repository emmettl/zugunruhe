# Cloud veil — first candidate

A tentative cloud motif: three slowly unfolding, open intervals with soft attacks
and long reverberant tails. The pitches stay within the existing D/E/F♯/A/B
vocabulary, extending down to A2 and up to F♯4. There are no rain effects or sharp
attacks. The existing Driftbox wavetable voices and Hall render this authored score.

In Night, Sea and Currents, the motif's gain follows the square root of the
area-weighted mean cloud fraction across the retained weather grid. It uses the
selected cloud layer and the same hourly time interpolation as the cloud veil.
This is a regional aggregate, not the cloud fraction under the camera. Off,
clear sky, out-of-range time or an unavailable mean fades the motif to silence.
The notes and their timings are composed; only their presence follows weather.

The stem is −42 dBFS RMS at full gain, with a −27.1 dBFS sample peak before
encoding. It is kept well below the main score. Its 180-second duration matches
the existing stems and shares their 24-second loop overlaps. It adds 1.7 MB to
the opt-in download and about 35 MB of decoded stereo PCM at 24 kHz.
The four encoded Night stems summed at full gain measure −23.9 LUFS and
−10.4 dBTP, versus −24.0 LUFS and −10.8 dBTP without the cloud motif.

Reproduce with the local Driftbox rack build and FFmpeg:

```sh
FFMPEG_BIN=/path/to/ffmpeg node scripts/render-cloud-motif.mjs
```

The manifest retains the score, patch, source hashes, balance and output hash.
Lossless masters remain locally under the ignored `masters/` directory.
