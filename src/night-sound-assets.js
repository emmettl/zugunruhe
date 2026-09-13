import sustained from '../audio-studies/04-responsive/sustained.mp3?url';
import passing from '../audio-studies/04-responsive/passing.mp3?url';
import twinkles from '../audio-studies/04-responsive/twinkles.mp3?url';

export async function loadNightStems() {
  // Decode at the stored rate, avoiding three full 48 kHz copies on phones.
  // Playback resamples to the output device without changing pitch or timing.
  const Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const decoder = new Offline(2, 1, 24000);
  const buffers = {};
  for (const [name, url] of Object.entries({ sustained, passing, twinkles })) {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Soundtrack stem unavailable');
    buffers[name] = await decoder.decodeAudioData(await response.arrayBuffer());
  }
  return buffers;
}
