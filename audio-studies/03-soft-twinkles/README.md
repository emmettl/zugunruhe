# Confluence with softer twinkles

[Listen — three minutes](05-confluence-soft-twinkles.mp3).

Revision of [the twinkle sketch](../02-twinkles/README.md) following feedback that
the upper notes entered too prominently. The same Confluence foundation, notes,
gesture times and stereo positions are retained.

- The twinkle stem is 5 dB quieter by whole-piece RMS: 25 dB below the foundation.
- Attacks grow by 120–280 ms, with the highest notes receiving the slowest entrances.
- Upper notes receive progressively more attenuation, up to 3 dB before the
  overall stem gain is set. Their phase-modulation transient is also gentler.

The final MP3 measures −24.3 LUFS and −11.0 dBTP, matching the previous listening
version. Only constant gain is used for loudness matching. The original sketches
and first twinkle MP3 are preserved; their checksums were verified. Phrase timing,
pitch identity and the 5 dB stem reduction were checked, and the encoded file was
decoded for loudness/peak validation. These remain authored listening sketches,
not data-driven gestures.

```sh
node scripts/render-audio-twinkles.mjs --soft
AUDIO_OUTPUT=audio-studies/03-soft-twinkles FFMPEG_BIN=/path/to/ffmpeg node scripts/encode-audio-sketches.mjs
```

The render manifest records the score, patch, source checksums and measurements.
The unchanged default renderer still reproduces the first twinkle version.
