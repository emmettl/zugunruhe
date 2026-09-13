# First listening sketches

13 September 2026. Three three-minute sketches made with the existing Driftbox
rack, following the [audio direction brief](../../docs/AUDIO-DIRECTION.md).

- **Sustained:** five independent lanes of slowly overlapping swells. Each voice
  pairs lightly detuned wavetable oscillators between sine and triangle, with a
  shared Hall reverb and restrained stereo movement.
- **Passing:** 24 notes in seven loosely spaced phrases. Six available voices use
  sine carriers with octave phase modulation, rounded attacks, decaying upper
  partials and long releases into a shared Hall.
- **Confluence:** a linear mixture of those same performances, with more emphasis
  on the sustained foundation. No separate third score or changed harmony.

The pitch vocabulary is D major pentatonic, with changes in bass and voicing.
There are no samples, percussion, bird calls or engine modifications. The host
controller supplies the long gain envelopes; synthesis and reverb are rack DSP.
The score and seed are saved in `render-manifest.json`.

These are authored timbre/composition experiments, not yet data-responsive music.
Memmingen at 22:00 UTC on 9 September 2018 is recorded as a held visual reference;
its observations do not control the sketches. Next, audition density and altitude
mapping only after choosing a musical direction worth developing.

## Listening

Open `index.html`, or play the three MP3 files directly. All files are local;
this page is not part of the deployed studies. The page starts silent, has native
audio controls and download links, and pauses other sketches when one starts.

The compressed files have matched integrated loudness (−24.3, −24.2 and −24.2 LUFS),
using a constant gain change for each file. Their dynamics are preserved; no
compressor or limiter was used. Lossless 44.1 kHz / 16-bit stereo WAV masters are
retained in the ignored `masters/` folder at their original RMS-matched levels.

The in-app browser preview crashed during verification with AAC, MP3 and WAV
sources. The files themselves decode successfully with FFmpeg. Browser playback
and the page's exclusive-play behaviour could not be verified in that environment;
use the direct files or open the page in a normal browser for listening.

## Reproduce

The renderer imports the built local rack, without installing it into Zugunruhe's
production dependencies. Its default location is `../driftbox/packages/rack/dist`.
The manifest records the rack Git revision and hashes of the relevant compiled
modules. Set `RACK_DIST` to use a different build explicitly.

```sh
node scripts/render-audio-sketches.mjs
FFMPEG_BIN=/path/to/ffmpeg node scripts/encode-audio-sketches.mjs
```

Run from the Zugunruhe checkout. FFmpeg needs `libmp3lame` and the `ebur128` filter.
The encodings use MP3 at 192 kbit/s. No external audio/data service is called by
these scripts. `AUDIO_OUTPUT` can redirect artifacts. `AUDIO_SECONDS=30` makes a
short technical pilot; the authored phrase schedule is designed for 180 seconds.

For an HTTP preview:

```sh
python3 -m http.server 4187 --bind 127.0.0.1 --directory audio-studies/01-flowing
```

## Checks performed

- Rendered both complete stems through `RackRenderer`, with zero compile notes
  (no dropped or replaced cables) and no voice stealing in the passing score.
- Checked all PCM samples for finite values, peak level and DC offset, plus
  five-second RMS windows and the opening threshold. Signal begins within 0.2 s
  of each file; 16 seconds of pre-roll establishes the opening texture.
- Applied a 1.5-second opening fade and 12-second ending fade, with 16-bit dither.
- Encoded and independently decoded all MP3s, checking EBU R128 loudness and true
  peak. Peaks remain below −10 dBTP. Each file is approximately 4.3 MB.
- Syntax-checked both scripts. No existing visual-study or deployment code changed.

These checks establish usable files and technical headroom, not musical quality.
The next decision is a listening decision: which textures invite lingering, which
become tiring, and whether the combination improves on either element alone.
