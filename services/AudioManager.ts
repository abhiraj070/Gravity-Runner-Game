
export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private isMuted: boolean = false;
  private bgmInterval: any = null;
  private beat: number = 0;

  constructor() {
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.musicGain.connect(this.masterGain);
      this.masterGain.gain.value = 0.3;
      this.musicGain.gain.value = 0.4;
    } catch (e) {
      console.warn("AudioContext not supported");
    }
  }

  private resume() {
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMute(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain) {
      this.masterGain.gain.value = muted ? 0 : 0.3;
    }
  }

  // SFX: Gravity Flip
  playFlip() {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  // SFX: Collect Star
  playCollect() {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1760, this.ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  // SFX: Near Miss
  playNearMiss() {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  // SFX: Death / Hit
  playDeath() {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    const osc = this.ctx.createOscillator();
    const noise = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    
    // Create noise buffer
    const bufferSize = this.ctx.sampleRate * 0.5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    noise.buffer = buffer;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(20, this.ctx.currentTime + 0.5);
    
    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);
    
    osc.connect(gain);
    noise.connect(gain);
    gain.connect(this.masterGain!);
    osc.start();
    noise.start();
    osc.stop(this.ctx.currentTime + 0.5);
    noise.stop(this.ctx.currentTime + 0.5);
  }

  // SFX: UI Click
  playClick() {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  // Dynamic Background Music (Synthesized Pulse)
  startBGM() {
    if (!this.ctx || this.bgmInterval) return;
    this.resume();
    this.beat = 0;
    this.bgmInterval = setInterval(() => {
      this.playBGMStep();
    }, 150); // Base tempo
  }

  stopBGM() {
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }

  updateBGMTempo(speed: number) {
    if (!this.bgmInterval) return;
    const tempo = Math.max(80, 160 - (speed - 8) * 4);
    clearInterval(this.bgmInterval);
    this.bgmInterval = setInterval(() => this.playBGMStep(), tempo);
  }

  private playBGMStep() {
    if (!this.ctx || this.isMuted || this.ctx.state === 'suspended') return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    
    const notes = [55, 55, 65.41, 55, 73.42, 55, 82.41, 65.41]; // A1, C2, D2, E2 pattern
    const freq = notes[this.beat % notes.length];
    
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(this.musicGain!);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
    this.beat++;
  }
}

export const audio = new AudioManager();
