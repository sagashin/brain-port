'use client';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  private getContext(): AudioContext | null {
    if (!this.enabled) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * 心地よいボタンのクリック音
   */
  public playClick() {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.045);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  /**
   * 正解音（コンボ数に応じて音程が華やかに上昇する）
   */
  public playCorrect(combo = 1) {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // コンボ数ごとに半音ずつピッチ上昇（最大12半音＝1オクターブ）
    const semitoneShift = Math.min(Math.max(0, combo - 1), 12);
    const ratio = Math.pow(2, semitoneShift / 12);

    const baseFreq1 = 523.25 * ratio; // C5 base
    const baseFreq2 = 659.25 * ratio; // E5 base
    const baseFreq3 = 783.99 * ratio; // G5 base

    const notes = [
      { freq: baseFreq1, start: 0, dur: 0.09 },
      { freq: baseFreq2, start: 0.06, dur: 0.11 },
      { freq: baseFreq3, start: 0.12, dur: 0.22 },
    ];

    notes.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + start);

      gain.gain.setValueAtTime(0.14, now + start);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + start);
      osc.stop(now + start + dur + 0.01);
    });
  }

  /**
   * 不正解音（耳障りすぎない低めのソフトブザー）
   */
  public playWrong() {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [
      { freq: 220, start: 0, dur: 0.12 },
      { freq: 185, start: 0.11, dur: 0.22 },
    ];

    notes.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + start);

      gain.gain.setValueAtTime(0.09, now + start);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + start);
      osc.stop(now + start + dur + 0.01);
    });
  }

  /**
   * コースクリア・ステージクリア時のファンファーレ
   */
  public playFanfare() {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // C5 -> E5 -> G5 -> C6 華やかなアルペジオ＋和音
    const fanfareNotes = [
      { freq: 523.25, start: 0.0, dur: 0.14 },
      { freq: 659.25, start: 0.12, dur: 0.14 },
      { freq: 783.99, start: 0.24, dur: 0.14 },
      { freq: 1046.5, start: 0.36, dur: 0.55 },
      { freq: 783.99, start: 0.36, dur: 0.55 },
      { freq: 659.25, start: 0.36, dur: 0.55 },
    ];

    fanfareNotes.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + start);

      gain.gain.setValueAtTime(0.12, now + start);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + start);
      osc.stop(now + start + dur + 0.02);
    });
  }
}

export const soundEngine = new SoundEngine();
