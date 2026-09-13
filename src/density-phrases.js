import { createPhraseClock } from './phrase-clock.js';
export function createDensityPhrases(context, output, buffers) {
  const clock = createPhraseClock(), sources = new Set();
  return {
    setActivity: clock.setActivity,
    tick() {
      const event = clock.advance(context.currentTime);
      if (!event) return;
      const source = context.createBufferSource(); source.buffer = buffers[event.index];
      source.connect(output); sources.add(source);
      source.onended = () => { source.disconnect(); sources.delete(source); };
      source.start(event.at);
    },
    dispose() { for (const source of sources) { source.stop(); source.disconnect(); } sources.clear(); },
  };
}
