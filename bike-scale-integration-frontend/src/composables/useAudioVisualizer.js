import { ref } from 'vue';

const BASS_MAX_HZ = 200;
const MID_MAX_HZ = 2000;

/**
 *  useAudioVisualizer
 *  Captures system audio (Electron only - see electron/main.cjs, which
 *  auto-approves getDisplayMedia() with loopback audio and no picker) and
 *  writes live loudness/bass values onto CSS custom properties every frame,
 *  so any CSS can react to music without touching Vue's reactivity system.
 */
export function useAudioVisualizer() {
  const isSupported = typeof window !== 'undefined' && !!window.electronAPI?.isElectron;
  const isActive = ref(false);
  const error = ref(null);

  let audioCtx = null;
  let analyser = null;
  let freqData = null;
  let rafId = null;
  let stream = null;

  function frame() {
    analyser.getByteFrequencyData(freqData);

    const binHz = audioCtx.sampleRate / analyser.fftSize;
    const bassEndBin = Math.min(freqData.length, Math.round(BASS_MAX_HZ / binHz));
    const midEndBin = Math.min(freqData.length, Math.round(MID_MAX_HZ / binHz));

    const avg = (from, to) => {
      if (to <= from) return 0;
      let sum = 0;
      for (let i = from; i < to; i++) sum += freqData[i];
      return sum / (to - from) / 255; // normalize 0..1
    };

    const bass = avg(0, bassEndBin);
    const mid = avg(bassEndBin, midEndBin);
    const treble = avg(midEndBin, freqData.length);
    const loudness = avg(0, freqData.length);

    const root = document.documentElement.style;
    root.setProperty('--beat-loudness', loudness.toFixed(3));
    root.setProperty('--beat-bass', bass.toFixed(3));
    root.setProperty('--beat-mid', mid.toFixed(3));
    root.setProperty('--beat-treble', treble.toFixed(3));

    rafId = requestAnimationFrame(frame);
  }

  async function start() {
    if (!isSupported || isActive.value) return;
    error.value = null;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      stream.getVideoTracks().forEach((t) => t.stop()); // we only need the audio track

      audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.8;
      freqData = new Uint8Array(analyser.frequencyBinCount);
      source.connect(analyser);

      isActive.value = true;
      frame();
    } catch (err) {
      error.value = err.message || String(err);
      stop();
    }
  }

  function stop() {
    if (rafId != null) cancelAnimationFrame(rafId);
    rafId = null;
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
    audioCtx?.close();
    audioCtx = null;
    analyser = null;
    isActive.value = false;

    const root = document.documentElement.style;
    ['--beat-loudness', '--beat-bass', '--beat-mid', '--beat-treble'].forEach((p) =>
      root.setProperty(p, '0')
    );
  }

  return { isSupported, isActive, error, start, stop };
}
