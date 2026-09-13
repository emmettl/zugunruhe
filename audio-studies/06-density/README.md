# Density and space between phrases

First data-responsive Air listening experiment. The sustained bed is unchanged.
Six gestures extracted from the approved soft twinkles retain their notes,
levels and stereo placement. Higher estimated bird density allows phrases to
arrive more often, without turning them up or speeding up their notes.

The browser uses the selected station and heights, or an equal-weight mean of
valid density/velocity pairs at the eleven stations in the displayed region.
At least half the expected pairs must be available. Zero density is valid;
missing observations are not zeros. This summary is not an area-weighted field
or a total bird count. Hiding Birds stops new phrases. Wind visibility is separate.

The authored activity curve is sqrt(clamp(mean density / 12, 0, 1)). It is fixed
across nights and heights. The phrase clock smooths activity with an 8-second
time constant and admits at most one phrase per 18 musical seconds. A phrase
lasts 16 seconds. Each finishes after scrubs, height/night changes or hiding
Birds; sound mute still fades the complete output promptly. No catch-up bursts
follow delayed timers. Visual playback speed never changes musical tempo.

`listen-quiet.mp3` and `listen-busy.mp3` are 90-second comparisons using actual
held snapshots, the same bed and phrase order, and the default 65% volume.
See `comparison.json` for dates, coverage, density, phrase times and PCM levels.
They contain two and five phrases respectively. The difference is space, not
an added loudness rise (whole-piece RMS differs by about 0.02 dB).

The application downloads only the bed and six clips on an explicit Sound tap;
listening comparisons are not bundled. Decode rate is 24 kHz stereo (about
53 MB PCM for all seven buffers). Original listening studies remain unchanged.

Reproduce with `scripts/prepare-density-phrases.mjs`, then
`scripts/render-density-comparison.mjs` with FFMPEG_BIN set. The clip manifest
records the retained source hash and each encoded clip. Rendering requires the
locally retained lossless twinkle master; application builds do not.
