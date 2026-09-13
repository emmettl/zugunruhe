import { createSoundtrack } from './soundtrack.js';
import soundUrl from '../audio-studies/03-soft-twinkles/05-confluence-soft-twinkles.mp3?url';
import styles from './study-sound.css?inline';
import { subscribeSoundScene } from './sound-scene.js';

let installed = false;
export function installStudySound() {
  if (installed || document.documentElement.hasAttribute('data-frozen-study')) return;
  const row = document.querySelector('.timeline-row') || document.querySelector('.playback:has(> .timeline)');
  if (!row) return;
  installed = true;
  const style = document.createElement('style'); style.textContent = styles; document.head.append(style);
  const widget = document.createElement('div'); widget.className = 'study-sound'; widget.dataset.state = 'off';
  widget.innerHTML = `<button type="button" id="sound-toggle" aria-label="Turn sound on" aria-pressed="false" title="Sound · off">
    <span class="sound-motes" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path class="sound-waves" d="M16 8c2 2 2 6 0 8m3-11c4 4 4 10 0 14"/><path class="sound-slash" d="m3 3 18 18"/></svg>
  </button><div class="sound-volume" role="group" aria-label="Sound settings"><label for="sound-volume">Sound volume</label><input id="sound-volume" type="range" min="0" max="100" step="1" aria-label="Sound volume"><p>Confluence · soft twinkles<br>Sound keeps its own pace.</p></div><span id="sound-feedback" role="status" class="sound-feedback"></span>`;
  row.append(widget);
  const button = widget.querySelector('button'), slider = widget.querySelector('input'), feedback = widget.querySelector('#sound-feedback');
  const responsive = Boolean(document.getElementById('night-app'));
  let volume = 65;
  try { const saved = localStorage.getItem('zugunruhe-sound-volume'); if (saved !== null && Number.isFinite(Number(saved))) volume = Math.max(0, Math.min(100, Number(saved))); } catch {}
  slider.value = volume;
  slider.setAttribute('aria-valuetext', `${volume}%`);
  const soundtrack = createSoundtrack({
    createContext() {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) throw new Error('Web Audio unavailable');
      return new Audio({ latencyHint: 'playback' });
    },
    async loadBuffer(context) {
      if (responsive) return (await import('./night-sound-assets.js')).loadNightStems();
      const response = await fetch(soundUrl);
      if (!response.ok) throw new Error('Soundtrack unavailable');
      return context.decodeAudioData(await response.arrayBuffer());
    },
    isHidden: () => document.hidden,
    initialVolume: volume / 100,
    onChange({ status }) {
      const enabled = ['loading', 'starting', 'playing'].includes(status);
      widget.dataset.state = status;
      button.setAttribute('aria-pressed', String(enabled));
      button.setAttribute('aria-busy', String(status === 'loading' || status === 'starting'));
      button.setAttribute('aria-label', enabled ? 'Turn sound off' : 'Turn sound on');
      button.title = status === 'loading' ? 'Loading sound · click to cancel' : enabled ? 'Sound · on' : 'Sound · off';
      feedback.textContent = status === 'error' ? 'Sound could not start. Tap to try again.' : '';
    },
  });
  const unsubscribe = responsive ? subscribeSoundScene(scene => {
    soundtrack.setMix(scene.mix);
    widget.dataset.mix = JSON.stringify(scene.mix);
    if (widget.dataset.score !== scene.name) {
      widget.dataset.score = scene.name;
      widget.querySelector('.sound-volume p').textContent = `${scene.name}. Layers follow the scene; phrases keep their pace.`;
    }
  }) : () => {};
  button.addEventListener('click', () => {
    widget.querySelector('.sound-motes')?.remove();
    delete widget.dataset.dismissed;
    button.focus({ preventScroll: true });
    if (soundtrack.enabled) soundtrack.pause(); else void soundtrack.play();
  });
  slider.addEventListener('input', () => {
    const value = Number(slider.value); soundtrack.setVolume(value / 100);
    slider.setAttribute('aria-valuetext', `${value}%`);
    try { localStorage.setItem('zugunruhe-sound-volume', String(value)); } catch {}
  });
  widget.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); button.focus(); widget.dataset.dismissed = 'true'; }
  });
  widget.addEventListener('pointerenter', () => { delete widget.dataset.dismissed; });
  widget.addEventListener('focusin', () => { delete widget.dataset.dismissed; });
  document.addEventListener('visibilitychange', () => { if (document.hidden) soundtrack.pause(true); });
  // Page changes stop sound. Returning from bfcache keeps a paused, resumable score.
  window.addEventListener('pagehide', (event) => { if (event.persisted) soundtrack.pause(true); else { unsubscribe(); soundtrack.dispose(); } });
}
