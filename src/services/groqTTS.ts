// Groq Text-to-Speech Service - Blocking, Deterministic, Abortable
// No callbacks, just Promise-based control with abort support

export interface GroqTTSConfig {
  apiKey: string;
  model?: string;
  voice?: string;
}

export class GroqTTSService {
  private apiKey: string;
  private model: string;
  private voice: string;
  private currentAudio: HTMLAudioElement | null = null;
  private currentAudioUrl: string | null = null;
  private isPlaying = false;
  private playbackAborted = false;

  constructor(config: GroqTTSConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'canopylabs/orpheus-v1-english';
    this.voice = config.voice || 'troy';
  }

  // Speak text - BLOCKING until playback completes or is aborted
  async speak(text: string): Promise<void> {
    // Stop any existing playback
    this.forceStop();
    
    this.playbackAborted = false;

    try {
      console.log('Generating TTS audio from Groq...');
      
      // BLOCKING call to Groq API
      const audioBlob = await this.generateAudioWithGroq(text);
      
      // Check if aborted during generation
      if (this.playbackAborted) {
        console.log('TTS aborted during generation');
        return;
      }

      console.log(`TTS audio generated: ${audioBlob.size} bytes`);

      // Create audio URL
      this.currentAudioUrl = URL.createObjectURL(audioBlob);
      this.currentAudio = new Audio(this.currentAudioUrl);
      this.currentAudio.volume = 0.8;

      // BLOCKING wait for playback to complete
      await new Promise<void>((resolve, reject) => {
        if (!this.currentAudio) {
          reject(new Error('Audio element lost'));
          return;
        }

        const audio = this.currentAudio;

        audio.onplay = () => {
          this.isPlaying = true;
          console.log('TTS playback started');
        };

        audio.onended = () => {
          this.isPlaying = false;
          console.log('TTS playback completed');
          resolve();
        };

        audio.onerror = (error) => {
          this.isPlaying = false;
          console.error('TTS playback error:', error);
          reject(new Error('Playback failed'));
        };

        audio.onpause = () => {
          this.isPlaying = false;
        };

        // Check if aborted before playing
        if (this.playbackAborted) {
          console.log('TTS aborted before playback');
          resolve();
          return;
        }

        // Start playback
        audio.play().catch(error => {
          this.isPlaying = false;
          console.error('Failed to start TTS playback:', error);
          reject(error);
        });
      });

    } catch (error) {
      console.error('TTS error:', error);
      throw error;
    } finally {
      // Cleanup
      this.cleanup();
    }
  }

  private async generateAudioWithGroq(text: string): Promise<Blob> {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          input: text,
          voice: this.voice,
          response_format: 'wav',
          speed: 1.0
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Groq TTS error:', response.status, errorText);
        throw new Error(`Groq TTS failed: ${response.status}`);
      }

      const audioBlob = await response.blob();
      return audioBlob;

    } catch (error) {
      console.error('Groq TTS generation error:', error);
      throw error;
    }
  }

  // Force stop playback immediately - SYNCHRONOUS
  forceStop(): void {
    console.log('Force stopping TTS');
    this.playbackAborted = true;
    
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }

    this.cleanup();
    this.isPlaying = false;
  }

  private cleanup(): void {
    if (this.currentAudioUrl) {
      URL.revokeObjectURL(this.currentAudioUrl);
      this.currentAudioUrl = null;
    }
  }

  isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }
}
