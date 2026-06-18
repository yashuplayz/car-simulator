export class ProceduralMusic {
  private audioCtx: AudioContext | null = null;
  private isPlaying = false;
  private nextNoteTime = 0;
  private currentNote = 0;
  private timerID: number | null = null;

  // A simple driving Outrun bassline sequence (minor pentatonic)
  private readonly bassSequence = [
    36, 36, 48, 36, 36, 43, 36, 46,
    36, 36, 48, 36, 36, 43, 41, 39
  ];
  private readonly tempo = 120;
  private readonly lookahead = 25.0; // ms
  private readonly scheduleAheadTime = 0.1; // s

  public init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  public toggle() {
    this.init();
    if (!this.audioCtx) return false;

    if (this.isPlaying) {
      this.isPlaying = false;
      if (this.timerID !== null) window.clearTimeout(this.timerID);
      return false;
    } else {
      this.isPlaying = true;
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      this.nextNoteTime = this.audioCtx.currentTime + 0.05;
      this.scheduler();
      return true;
    }
  }

  private nextNote() {
    const secondsPerBeat = 60.0 / this.tempo;
    this.nextNoteTime += 0.25 * secondsPerBeat; // 16th notes
    this.currentNote = (this.currentNote + 1) % this.bassSequence.length;
  }

  private scheduleNote(noteIndex: number, time: number) {
    if (!this.audioCtx) return;

    // --- BASS SYNTH ---
    const midiNote = this.bassSequence[noteIndex];
    const freq = 440 * Math.pow(2, (midiNote - 69) / 12);

    const osc = this.audioCtx.createOscillator();
    const filter = this.audioCtx.createBiquadFilter();
    const gain = this.audioCtx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.value = freq;

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, time);
    filter.frequency.linearRampToValueAtTime(100, time + 0.1);

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.5, time + 0.02);
    gain.gain.linearRampToValueAtTime(0.001, time + 0.15);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start(time);
    osc.stop(time + 0.15);

    // --- KICK DRUM (Every 4th 16th note = Every Beat) ---
    if (noteIndex % 4 === 0) {
      const kickOsc = this.audioCtx.createOscillator();
      const kickGain = this.audioCtx.createGain();
      
      kickOsc.type = 'sine';
      kickOsc.frequency.setValueAtTime(150, time);
      kickOsc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);

      kickGain.gain.setValueAtTime(1.0, time);
      kickGain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);

      kickOsc.connect(kickGain);
      kickGain.connect(this.audioCtx.destination);

      kickOsc.start(time);
      kickOsc.stop(time + 0.5);
    }
  }

  private scheduler() {
    if (!this.audioCtx) return;
    while (this.nextNoteTime < this.audioCtx.currentTime + this.scheduleAheadTime) {
      this.scheduleNote(this.currentNote, this.nextNoteTime);
      this.nextNote();
    }
    this.timerID = window.setTimeout(() => this.scheduler(), this.lookahead);
  }
}

export const music = new ProceduralMusic();
