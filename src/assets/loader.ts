export class AssetLoader {
  private images: Map<string, HTMLImageElement> = new Map();
  private audioBuffers: Map<string, AudioBuffer> = new Map();

  async loadImage(id: string, url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.images.set(id, img);
        resolve(img);
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  getImage(id: string) {
    return this.images.get(id);
  }

  async loadAudio(id: string, url: string, context: AudioContext): Promise<AudioBuffer> {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await context.decodeAudioData(arrayBuffer);
    this.audioBuffers.set(id, audioBuffer);
    return audioBuffer;
  }

  getAudio(id: string) {
    return this.audioBuffers.get(id);
  }
}
