# Audio direction: flowing sound

Research and first listening-study brief, 13 September 2026. This is a proposal,
not an implemented soundtrack. The current Driftbox source has been inspected;
its suitability for this particular sound still needs to be established by listening.

The first [three listening sketches](../audio-studies/01-flowing/README.md) are now
rendered with the existing rack. They hold the scene reference fixed and explore
timbre and composition before connecting musical parameters to observations.

## Goal

An evolving musical environment that feels continuous with the moving light:
spacious, layered and capable of lingering. The scene influences its density,
register, movement and depth. It should reward attention without demanding it,
remain alive at a held moment, and change character gently as the viewer travels.

The Eno touchpoint is useful as an approach to time and attention. In his
[description of Reflection](https://generativemusic.com/reflection.html), Eno
describes music that continues for as long as the listener wants, retaining an
identity while unfolding differently. That is a useful ambition for a scene the
viewer can inhabit. This reference does not establish a recipe for his sound,
and this study should develop its own musical language through listening.

For the first experiment, propose a small harmonic vocabulary, independently
overlapping phrases, soft entrances, long departures and stretches of relative
stillness. Avoid making every visual event a note. A few well-chosen voices can
express a field of movement more clearly than a voice for every station or trail.

## Initial musical material

Try three elements, individually before combining them:

1. **A sustained layer:** a quiet, slowly changing foundation with a little internal
   movement. It should have room to thin out rather than remain a constant wash.
2. **Passing tones:** sparse, rounded attacks whose releases overlap. Their timing
   can drift independently within an authored pitch set, without an obvious loop reset.
3. **An airy detail:** a restrained upper texture, if it adds depth. This need not
   be literal wind noise, and it should not mask the tones or tire the ear.

Timbre, spacing and harmony need authorship. Random note selection and a large
reverb alone will not establish the desired character. A held chord may be enough
for the first test; changing key or harmony is not required to prove the concept.

## How the scene might be heard

These are artistic mapping hypotheses to audition, not measured acoustic properties.
Start with density and altitude; add other inputs only if the relationship is audible
and musically useful.

| Scene property | Candidate musical response |
| --- | --- |
| Bird density | Phrase likelihood and overlap, within a small voice budget |
| Altitude distribution | Balance between broad registers and timbres |
| Flow speed and directional coherence | Gentle changes in motion and phrase behaviour |
| Bird and wind vector difference | Relative movement of two distinguishable layers |
| Camera position or selected region | Foreground balance and detail within the same musical environment |

Summarise fields over a region and a few height groups. Use comparable scales
across nights so the same observation does not arbitrarily produce a different
intensity. Camera changes should alter emphasis without making the music lurch.
Do not imply that vector difference measures effort, intent or emotion.

Keep data interpolation unchanged. Musical controls can respond over several
seconds or longer; that smoothing is part of the presentation. Preserve missing
data as missing, not zero: existing notes can decay and an independent foundation
can remain, but absent observations should not generate new purported bird events.

Separate musical time from the visual timeline. Changing playback speed should
change how the scene evolves, not pitch-shift the soundtrack or accelerate every
phrase. Scrubbing and changing night should move smoothly towards a new musical
state. Proposal for a held scene: let its musical environment continue evolving;
the sound control remains a separate way to silence it. Verify that behaviour
with listening and interaction before treating it as settled.

## What Driftbox already supplies

Audit basis: local `../driftbox` revision `1399912`, rack package version `0.1.0`.
This is a source audit, not verification that every capability is in a published
package. The older `driftbox2` checkout is not the basis for this assessment.

- A persistent graph in an AudioWorklet, with audio and control-rate connections,
  polyphony, and integration into a host-owned AudioContext. The rack interface
  does not have to appear in Zugunruhe.
- Oscillators, wavetable and subtractive voices, envelopes, filters, gain control,
  slow modulation, mixers, delay, stereo effects, reverb and limiting. Sample
  playback is also available if recorded material becomes useful later.
- Live parameter changes and an `Adaptive` helper for mapping an intensity to
  several controls. This provides control plumbing; it does not compose phrases,
  choose harmony or manage multi-minute musical development.
- `RackRenderer`, which renders the same graph/DSP to PCM offline. This allows
  listening sketches before adding the soundtrack to the WebGL application.

The rack is a closer architectural fit for this work than the groovebox engine
integration described in `../gleislicht/docs/SOUNDTRACK.md`. Gleislicht's separation
of visual speed and musical tempo, and its gesture-initiated sound, remain useful.

## Limits that matter here

| Source finding | Implication |
| --- | --- |
| Live parameter changes ramp over an audio block | This prevents abrupt sample changes, but is not a slow musical transition. Add explicit longer smoothing. |
| Standalone ADSR attack/decay/release controls top out at 10 seconds; the combined Voice has shorter limits | Long swells may need an extended envelope or a slowly controlled VCA. This need not block the first sketch. |
| LFO base rate reaches 0.01 Hz; random mode holds each value | Existing cyclic modulation is useful. Smooth wandering and longer development need additional control logic. |
| Delay and ping-pong delay time controls reach 2 seconds | Fine for short echoes; long phrase loops would need a different arrangement or extended delay. |
| Reverb offers Room/Hall/Plate/Spring; decay is a feedback parameter rather than seconds | Audition tail density, colour and fatigue. Do not infer a particular decay time from the knob value. |
| Reverb size changes delay lengths without an evident fractional-delay transition | Keep size fixed initially; verify that any later size modulation is clean. |
| Replacing the patch reconstructs processors | Keep a persistent graph when the scene changes so phase, envelopes and effect tails survive. |

Relevant source files are under `../driftbox/packages/rack/src/`:
`index.ts`, `graph.ts`, `adaptive.ts`, `headless.ts`, and
`modules/{adsr,voice,lfo,delay,ping-pong,reverb}.ts`.

There is no evidence yet that this requires a new synthesis engine. Nor is there
evidence from source inspection alone that the existing reverb and voices deliver
the desired finish. Granulation, spectral freezing or a new reverb are possible
later tools, not prerequisites to this experiment.

## Work to do, in order

1. **Listening sketches using the current rack.** Render three roughly three-minute
   pieces: sustained layers, passing tones, and a restrained combination. Use the
   same fixed scene excerpt and comparable perceived loudness. Keep the visual
   design out of the evaluation at first so the sound has to stand on its own.
2. **A minimal scene response.** Apply only density and altitude to the strongest
   sketch. Compare two contrasting excerpts with the same musical rules, then
   try a held scene and a scrub. Establish whether the relationship is perceptible
   without becoming literal or distracting.
3. **A live integration in one study.** Add an authored phrase controller, bounded
   scene summaries and slow parameter transitions. Use audio-clock scheduling or
   graph modulation, not render-frame timing for notes. Keep the graph running
   through scene transitions. Start with a small number of voices and shared effects.
4. **Touch and sustained-use checks.** Sound starts from a gesture, is initially off,
   and has a compact volume control. Handle suspension and resumption cleanly.
   Test headphones, phone speakers, several minutes of listening, missing data,
   night changes and the cost alongside WebGL on a phone.

Only then promote proven needs into rack work: longer envelopes, a reusable slow
slew/wandering control, or improvements to the effect tail if listening identifies
a specific weakness. The first deliverable should be something to hear and compare,
before committing to an instrument architecture or distributing audio across all studies.
