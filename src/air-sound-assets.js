import sustained from '../audio-studies/04-responsive/sustained.mp3?url';
import p0 from '../audio-studies/06-density/phrase-0.mp3?url';
import p1 from '../audio-studies/06-density/phrase-1.mp3?url';
import p2 from '../audio-studies/06-density/phrase-2.mp3?url';
import p3 from '../audio-studies/06-density/phrase-3.mp3?url';
import p4 from '../audio-studies/06-density/phrase-4.mp3?url';
import p5 from '../audio-studies/06-density/phrase-5.mp3?url';
let decoder;
async function decode(url) {
  const Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Air soundtrack unavailable');
  decoder ||= new Offline(2, 1, 24000);
  return decoder.decodeAudioData(await response.arrayBuffer());
}
export const loadAirBed = async () => ({ sustained: await decode(sustained) });
export const loadAirPhrases = () => Promise.all([p0,p1,p2,p3,p4,p5].map(decode));
