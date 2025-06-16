
export class ElevenLabsService {
  private apiKey: string;
  private voiceId = 'EXAVITQu4vr4xnSDxMaL'; // Sarah voice - natural and clear

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async textToSpeech(text: string, config: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (error: any) => void;
  }): Promise<void> {
    try {
      config.onStart?.();

      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.0,
            use_speaker_boost: true
          }
        })
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.statusText}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      return new Promise((resolve, reject) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          config.onEnd?.();
          resolve();
        };

        audio.onerror = (error) => {
          URL.revokeObjectURL(audioUrl);
          config.onError?.(error);
          reject(error);
        };

        audio.play().catch(error => {
          URL.revokeObjectURL(audioUrl);
          config.onError?.(error);
          reject(error);
        });
      });
    } catch (error) {
      console.error('Error with text-to-speech:', error);
      config.onError?.(error);
      throw error;
    }
  }
}
