// Groq Speech-to-Text Service - Blocking, Deterministic
// No callbacks, no events, just Promise-based control

export interface GroqSTTConfig {
  apiKey: string;
  language?: string;
  model?: string;
}

export interface STTResult {
  text: string;
  isFinal: boolean;
}

export class GroqSTTService {
  private apiKey: string;
  private model: string;
  private language: string;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isRecording = false;
  private recordingPromise: Promise<Blob> | null = null;
  private recordingResolve: ((blob: Blob) => void) | null = null;
  private recordingReject: ((error: Error) => void) | null = null;

  constructor(config: GroqSTTConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'whisper-large-v3';
    this.language = config.language || 'en';
  }

  // Start recording audio - returns immediately, recording happens in background
  async startRecording(stream: MediaStream): Promise<void> {
    if (this.isRecording) {
      throw new Error('Already recording');
    }

    this.audioChunks = [];
    this.isRecording = true;

    // Create promise that will resolve when recording stops
    this.recordingPromise = new Promise((resolve, reject) => {
      this.recordingResolve = resolve;
      this.recordingReject = reject;
    });

    try {
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.audioChunks = [];
        this.isRecording = false;
        
        if (this.recordingResolve) {
          this.recordingResolve(audioBlob);
          this.recordingResolve = null;
          this.recordingReject = null;
        }
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        this.isRecording = false;
        
        if (this.recordingReject) {
          this.recordingReject(new Error('Recording failed'));
          this.recordingResolve = null;
          this.recordingReject = null;
        }
      };

      this.mediaRecorder.start(100); // Collect data every 100ms
      console.log('MediaRecorder started');
    } catch (error) {
      this.isRecording = false;
      this.recordingResolve = null;
      this.recordingReject = null;
      throw error;
    }
  }

  // Stop recording and transcribe - BLOCKING until transcription complete
  async stopAndTranscribe(): Promise<string> {
    if (!this.isRecording || !this.mediaRecorder || !this.recordingPromise) {
      return ''; // Silent abort if not recording
    }

    console.log('Stopping MediaRecorder...');
    
    // Stop recording (triggers onstop callback)
    this.mediaRecorder.stop();

    // BLOCK until recording promise resolves with audio blob
    const audioBlob = await this.recordingPromise;
    this.recordingPromise = null;

    console.log(`Audio captured: ${audioBlob.size} bytes`);

    // Minimum audio threshold - ignore clicks/noise
    if (audioBlob.size < 5000) {
      console.log('Audio too short, ignoring');
      return '';
    }

    // Convert webm to format Groq accepts (if needed)
    const audioFile = await this.convertToSupportedFormat(audioBlob);

    // BLOCKING call to Groq API
    const transcript = await this.transcribeWithGroq(audioFile);
    
    return transcript.trim();
  }

  // Force stop without transcription
  forceStop(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      
      // Reject the recording promise
      if (this.recordingReject) {
        this.recordingReject(new Error('Recording cancelled'));
        this.recordingResolve = null;
        this.recordingReject = null;
      }
    }
    
    this.audioChunks = [];
    this.recordingPromise = null;
  }

  private async convertToSupportedFormat(blob: Blob): Promise<File> {
    // Groq accepts: flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, webm
    // WebM with opus codec is directly supported
    return new File([blob], 'audio.webm', { type: 'audio/webm' });
  }

  private async transcribeWithGroq(audioFile: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', audioFile);
    formData.append('model', this.model);
    formData.append('language', this.language);
    formData.append('response_format', 'json');
    formData.append('temperature', '0.0'); // Deterministic output

    try {
      const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Groq STT error:', response.status, errorText);
        throw new Error(`Groq STT failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('Groq STT result:', result);
      
      return result.text || '';
    } catch (error) {
      console.error('Groq STT error:', error);
      throw error;
    }
  }

  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  cleanup(): void {
    this.forceStop();
    this.mediaRecorder = null;
  }
}
