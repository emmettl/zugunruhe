import url from '../audio-studies/05-clouds/cloud-veil.mp3?url';

export async function loadCloudMotif(decoder) {
  if (!decoder) {
    const Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    decoder = new Offline(2, 1, 24000);
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error('Cloud motif unavailable');
  return decoder.decodeAudioData(await response.arrayBuffer());
}
