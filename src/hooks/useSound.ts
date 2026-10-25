import { useCallback, useRef, useState, useEffect } from 'react';
export function useSound() {
  const [enabled, setEnabled] = useState(() => {
    try {
      return localStorage.getItem('clinic-sound') === 'true';
    } catch {
      return false;
    }
  });
  const context = useRef<AudioContext | null>(null);
  useEffect(() => {
    try {
      localStorage.setItem('clinic-sound', String(enabled));
    } catch {}
  }, [enabled]);
  const play = useCallback(
    (kind: 'correct' | 'wrong' | 'click' | 'success') => {
      if (!enabled) return;
      try {
        const ctx = context.current ?? (context.current = new AudioContext());
        void ctx.resume();
        const tones =
          kind === 'success'
            ? [523, 659, 784]
            : [kind === 'wrong' ? 220 : kind === 'correct' ? 659 : 440];
        tones.forEach((freq, i) => {
          const osc = ctx.createOscillator(),
            gain = ctx.createGain(),
            at = ctx.currentTime + i * 0.12;
          osc.type = 'sine';
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.055, at);
          gain.gain.exponentialRampToValueAtTime(0.001, at + 0.18);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(at);
          osc.stop(at + 0.2);
        });
      } catch {
        /* 無音訊設備時仍可操作 */
      }
    },
    [enabled],
  );
  return { enabled, toggle: () => setEnabled((e) => !e), play };
}
