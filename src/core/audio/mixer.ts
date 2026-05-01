export class AudioMixer {
  private context: AudioContext;
  private masterGain: GainNode;
  private sfxGain: GainNode;
  private musicGain: GainNode;

  constructor() {
    this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.context.createGain();
    this.sfxGain = this.context.createGain();
    this.musicGain = this.context.createGain();

    this.sfxGain.connect(this.masterGain);
    this.musicGain.connect(this.masterGain);
    this.masterGain.connect(this.context.destination);
  }

  setMasterVolume(value: number) {
    this.masterGain.gain.setTargetAtTime(value, this.context.currentTime, 0.1);
  }

  setMusicVolume(value: number) {
    this.musicGain.gain.setTargetAtTime(value, this.context.currentTime, 0.1);
  }

  // Basic pooling logic could be expanded here
  playSound(buffer: AudioBuffer, type: 'sfx' | 'music' = 'sfx') {
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(type === 'sfx' ? this.sfxGain : this.musicGain);
    source.start();
    return source;
  }

  // Volume snapshots (e.g., dampening music when UI is open)
  applyDampening(damp: boolean) {
    const volume = damp ? 0.3 : 1.0;
    this.musicGain.gain.setTargetAtTime(volume, this.context.currentTime, 0.2);
  }
}
