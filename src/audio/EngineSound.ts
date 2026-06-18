export class EngineSound {
  private audioCtx: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private gainNode: GainNode | null = null;

  public isInitialized = false;
  public engineOn = false;
  public muted = false;
  public carProfile = 0; // 0: Modern, 1: Muscle, 2: Tuner

  // Base frequencies for different cars
  private readonly profiles = [
    { minFreq: 55, maxFreq: 240, filterFreq: 800 }, // Modern Supercar
    { minFreq: 40, maxFreq: 180, filterFreq: 500 }, // Muscle Car
    { minFreq: 80, maxFreq: 350, filterFreq: 1200 }, // JDM Tuner
  ];

  constructor() {}

  public init() {
    if (this.isInitialized) return;
    
    this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create nodes
    this.oscillator = this.audioCtx.createOscillator();
    this.filter = this.audioCtx.createBiquadFilter();
    this.gainNode = this.audioCtx.createGain();

    // Configure oscillator
    this.oscillator.type = 'sawtooth';
    this.oscillator.frequency.value = this.profiles[0].minFreq;

    // Configure filter (lowpass to make it rumble like an engine)
    this.filter.type = 'lowpass';
    this.filter.frequency.value = this.profiles[0].filterFreq; // Cut off high frequencies for deep exhaust note
    this.filter.Q.value = 1;

    // Configure gain
    this.gainNode.gain.value = 0.001; // Start very quiet, cannot be exactly 0 for exponential functions

    // Connect nodes: Osc -> Filter -> Gain -> Destination
    this.oscillator.connect(this.filter);
    this.filter.connect(this.gainNode);
    this.gainNode.connect(this.audioCtx.destination);

    // Start oscillator
    this.oscillator.start();

    this.isInitialized = true;
  }

  public setRPM(currentRPM: number, maxRPM: number, isAccelerating: boolean) {
    if (!this.isInitialized || !this.audioCtx || !this.oscillator || !this.gainNode || !this.filter) return;

    if (!this.engineOn || this.muted) {
      this.gainNode.gain.setTargetAtTime(0.001, this.audioCtx.currentTime, 0.1);
      return;
    }

    const p = this.profiles[this.carProfile];
    this.filter.frequency.setTargetAtTime(p.filterFreq, this.audioCtx.currentTime, 0.1);

    // Calculate ratio (0.0 to 1.0)
    const ratio = Math.max(0, Math.min(1, currentRPM / maxRPM));
    
    // Calculate target frequency based on profile
    const targetFreq = p.minFreq + (p.maxFreq - p.minFreq) * ratio;

    // Calculate target volume (louder when accelerating, quieter when idling/coasting)
    const baseGain = 0.1;
    const accelGain = isAccelerating ? 0.3 : 0;
    const revGain = ratio * 0.2; // slightly louder at high RPMs
    const targetGain = baseGain + accelGain + revGain;

    const timeConstant = 0.05; // 50ms smoothing
    
    const safeFreq = Math.max(0.01, targetFreq);
    const safeGain = Math.max(0.001, targetGain); 

    this.oscillator.frequency.setTargetAtTime(safeFreq, this.audioCtx.currentTime, timeConstant);
    this.gainNode.gain.setTargetAtTime(safeGain, this.audioCtx.currentTime, timeConstant);
  }

  public suspend() {
    if (this.audioCtx && this.audioCtx.state === 'running') {
      this.audioCtx.suspend();
    }
  }

  public resume() {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  public toggleMute() {
    this.muted = !this.muted;
    if (this.muted && this.gainNode && this.audioCtx) {
      this.gainNode.gain.setTargetAtTime(0.001, this.audioCtx.currentTime, 0.1);
    }
    return this.muted;
  }

  public playEngineStart() {
    if (!this.isInitialized || !this.audioCtx || !this.gainNode || !this.oscillator) return;
    
    this.engineOn = true;
    if (this.muted) return;
    const t = this.audioCtx.currentTime;
    
    // Engine starter cranking sound
    const crankOsc = this.audioCtx.createOscillator();
    const crankGain = this.audioCtx.createGain();
    crankOsc.type = 'sawtooth';
    crankOsc.frequency.setValueAtTime(15, t);
    crankOsc.frequency.linearRampToValueAtTime(30, t + 0.6); // Chugging up
    
    crankGain.gain.setValueAtTime(0, t);
    crankGain.gain.linearRampToValueAtTime(0.5, t + 0.1);
    crankGain.gain.linearRampToValueAtTime(0, t + 0.6);
    
    crankOsc.connect(crankGain);
    crankGain.connect(this.audioCtx.destination);
    crankOsc.start(t);
    crankOsc.stop(t + 0.6);

    // Initial Rev blip
    const p = this.profiles[this.carProfile];
    this.oscillator.frequency.setValueAtTime(p.minFreq, t + 0.6);
    this.oscillator.frequency.exponentialRampToValueAtTime(p.maxFreq * 0.6, t + 0.8);
    this.oscillator.frequency.exponentialRampToValueAtTime(p.minFreq, t + 1.2);

    this.gainNode.gain.setValueAtTime(0.001, t + 0.5);
    this.gainNode.gain.exponentialRampToValueAtTime(0.6, t + 0.8);
    this.gainNode.gain.exponentialRampToValueAtTime(0.1, t + 1.2);
  }

  public playGearShift(isUpShift: boolean) {
    if (!this.isInitialized || !this.audioCtx || this.muted) return;

    const t = this.audioCtx.currentTime;

    // A very clean, satisfying, smooth "snick"
    const createSnick = () => {
      if (!this.audioCtx) return;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      
      // Use a sine wave for a very smooth, non-harsh tone
      osc.type = 'sine';
      
      // Upshifts sound slightly higher pitched, downshifts slightly lower
      osc.frequency.setValueAtTime(isUpShift ? 2500 : 1800, t);
      osc.frequency.exponentialRampToValueAtTime(isUpShift ? 3500 : 1200, t + 0.03);
      
      // Very fast, quiet decay so it's smooth and not overwhelming
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.04);
      
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(t);
      osc.stop(t + 0.04);
    };

    createSnick();
  }
}

// Export a singleton instance
export const engineSound = new EngineSound();
