export interface TTSCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: any) => void;
  onPlaybackStart?: () => void;
  onDuckingEnabled?: () => void;
  onDuckingDisabled?: () => void;
}

export class ElevenLabsService {
  private apiKey: string;
  private voiceId = 'EXAVITQu4vr4xnSDxMaL'; // Sarah voice - natural and clear
  private currentAudio: HTMLAudioElement | null = null;
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying = false;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async initializeAudioContext(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
    }
    
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  async textToSpeech(text: string, config: TTSCallbacks): Promise<void> {
    try {
      // Stop any currently playing audio
      this.stopCurrentAudio();
      
      config.onStart?.();

      // Initialize audio context
      await this.initializeAudioContext();

      console.log('Making TTS request to ElevenLabs API...');
      
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
            stability: 0.6,
            similarity_boost: 0.8,
            style: 0.2,
            use_speaker_boost: true
          },
          // Additional options for better quality
          output_format: 'mp3_44100_128'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('ElevenLabs API error details:', {
          status: response.status,
          statusText: response.statusText,
          errorBody: errorText
        });
        
        // If API key is invalid (401) or other API issues, fall back to browser TTS
        if (response.status === 401) {
          console.log('API key invalid, falling back to browser TTS...');
          return this.fallbackToWebSpeech(text, config);
        }
        
        throw new Error(`ElevenLabs API error (${response.status}): ${response.statusText}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Create audio with enhanced settings
      this.currentAudio = new Audio();
      this.currentAudio.src = audioUrl;
      this.currentAudio.preload = 'auto';
      
      // Set volume to prevent overwhelming the microphone
      this.currentAudio.volume = 0.8;

      return new Promise((resolve, reject) => {
        if (!this.currentAudio) {
          reject(new Error('Audio element not initialized'));
          return;
        }

        const audio = this.currentAudio;

        audio.oncanplaythrough = () => {
          console.log('Audio ready to play');
          config.onDuckingEnabled?.();
        };

        audio.onplay = () => {
          console.log('AI audio playback started');
          this.isPlaying = true;
          config.onPlaybackStart?.();
        };

        audio.onended = () => {
          console.log('AI audio playback ended');
          this.isPlaying = false;
          URL.revokeObjectURL(audioUrl);
          
          // Delay before re-enabling microphone sensitivity
          setTimeout(() => {
            config.onDuckingDisabled?.();
            config.onEnd?.();
            resolve();
          }, 500); // 500ms delay to prevent immediate pickup
        };

        audio.onerror = (error) => {
          console.error('Audio playback error:', error);
          this.isPlaying = false;
          URL.revokeObjectURL(audioUrl);
          config.onDuckingDisabled?.();
          config.onError?.(error);
          reject(error);
        };

        audio.onpause = () => {
          this.isPlaying = false;
        };

        // Start playback
        audio.play().catch(error => {
          console.error('Failed to start audio playback:', error);
          this.isPlaying = false;
          URL.revokeObjectURL(audioUrl);
          config.onDuckingDisabled?.();
          config.onError?.(error);
          reject(error);
        });
      });
    } catch (error) {
      console.error('Error with text-to-speech:', error);
      
      // Try fallback to Web Speech API on network or other errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.log('Network error detected, falling back to browser TTS...');
        try {
          return await this.fallbackToWebSpeech(text, config);
        } catch (fallbackError) {
          console.error('Fallback TTS also failed:', fallbackError);
          config.onError?.(fallbackError);
          throw fallbackError;
        }
      }
      
      config.onError?.(error);
      throw error;
    }
  }

  stopCurrentAudio(): void {
    if (this.currentAudio) {
      console.log('Stopping current audio playback');
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
      this.isPlaying = false;
    }
  }

  getCurrentAudioTime(): number {
    return this.currentAudio?.currentTime || 0;
  }

  isCurrentlyPlaying(): boolean {
    return this.isPlaying && this.currentAudio && !this.currentAudio.paused;
  }

  // Get audio duration for timing calculations
  getAudioDuration(): number {
    return this.currentAudio?.duration || 0;
  }

  // Fallback to Web Speech API when ElevenLabs is unavailable
  private async fallbackToWebSpeech(text: string, config: TTSCallbacks): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        const error = new Error('Text-to-speech not supported in this browser');
        config.onError?.(error);
        reject(error);
        return;
      }

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Try to find a good voice
      const voices = window.speechSynthesis.getVoices();
      const englishVoice = voices.find(voice => 
        voice.lang.startsWith('en') && voice.name.includes('Female')
      ) || voices.find(voice => voice.lang.startsWith('en'));
      
      if (englishVoice) {
        utterance.voice = englishVoice;
      }
      
      // Configure speech parameters
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 0.8;

      utterance.onstart = () => {
        console.log('Browser TTS started');
        this.isPlaying = true;
        config.onDuckingEnabled?.();
        config.onPlaybackStart?.();
      };

      utterance.onend = () => {
        console.log('Browser TTS ended');
        this.isPlaying = false;
        setTimeout(() => {
          config.onDuckingDisabled?.();
          config.onEnd?.();
          resolve();
        }, 500);
      };

      utterance.onerror = (event) => {
        console.error('Browser TTS error:', event);
        this.isPlaying = false;
        config.onDuckingDisabled?.();
        config.onError?.(event);
        reject(event);
      };

      // Start speech synthesis
      window.speechSynthesis.speak(utterance);
    });
  }

  // Cleanup method
  cleanup(): void {
    this.stopCurrentAudio();
    
    // Cancel any Web Speech API synthesis
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.gainNode = null;
  }
}
