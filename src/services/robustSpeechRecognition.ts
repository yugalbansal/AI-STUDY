export interface RobustSpeechCallbacks {
  onTranscript: (transcript: string, isFinal: boolean) => void;
  onError: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

export class RobustSpeechRecognitionService {
  private recognition: SpeechRecognition | null = null;
  private isListening = false;
  private callbacks: RobustSpeechCallbacks | null = null;
  private lastTranscriptTime = 0;
  private networkErrorCount = 0;
  private maxNetworkErrors = 2;

  constructor() {
    const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognitionConstructor) {
      this.recognition = new SpeechRecognitionConstructor();
      this.setupRecognition();
    }
  }

  private setupRecognition() {
    if (!this.recognition) return;

    // Basic, reliable configuration
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = (event) => {
      this.handleResults(event);
    };

    this.recognition.onerror = (event) => {
      this.handleError(event);
    };

    this.recognition.onstart = () => {
      console.log('Speech recognition started');
      this.isListening = true;
      this.lastTranscriptTime = Date.now();
      this.callbacks?.onStart?.();
    };

    this.recognition.onend = () => {
      console.log('Speech recognition ended');
      this.isListening = false;
      this.callbacks?.onEnd?.();
      // NO automatic restarts - let the application decide
    };
  }

  private handleResults(event: SpeechRecognitionEvent) {
    if (!this.callbacks) return;

    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0].transcript.trim();
      
      if (result.isFinal) {
        finalTranscript += transcript;
        this.lastTranscriptTime = Date.now();
      } else {
        interimTranscript += transcript;
      }
    }

    if (finalTranscript) {
      console.log('Final transcript:', finalTranscript);
      this.callbacks.onTranscript(finalTranscript, true);
    } else if (interimTranscript) {
      this.callbacks.onTranscript(interimTranscript, false);
    }

    this.lastTranscriptTime = Date.now();
  }

  private handleError(event: SpeechRecognitionErrorEvent) {
    console.error('Speech recognition error:', event.error);
    
    if (!this.callbacks) return;

    let errorMessage = '';
    
    switch (event.error) {
      case 'network':
        this.networkErrorCount++;
        if (this.networkErrorCount === 1) {
          errorMessage = 'Network connection issue. Try using the Restart button.';
        } else {
          errorMessage = 'Persistent network issues. Please refresh the page or try a different browser.';
        }
        break;
      
      case 'not-allowed':
        errorMessage = 'Microphone permission denied';
        break;
      
      case 'service-not-allowed':
        errorMessage = 'Speech service blocked by browser';
        break;
      
      case 'no-speech':
        errorMessage = 'No speech detected (timeout)';
        break;
      
      case 'audio-capture':
        errorMessage = 'Microphone access failed';
        break;
      
      case 'aborted':
        errorMessage = 'Speech recognition stopped';
        break;
      
      default:
        errorMessage = `Speech error: ${event.error}`;
    }

    this.callbacks.onError(errorMessage);
    
    // NO automatic restarts for ANY error - let the user decide
    console.log('Error occurred, no automatic restart. User must use restart button.');
  }

  isSupported(): boolean {
    return this.recognition !== null;
  }

  async startListening(callbacks: RobustSpeechCallbacks): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('Speech recognition not supported'));
        return;
      }

      if (this.isListening) {
        console.warn('Speech recognition already running');
        resolve();
        return;
      }

      this.callbacks = callbacks;
      this.lastTranscriptTime = Date.now();

      const startHandler = () => {
        resolve();
        this.recognition?.removeEventListener('start', startHandler);
      };

      const errorHandler = (event: SpeechRecognitionErrorEvent) => {
        reject(new Error(`Failed to start: ${event.error}`));
        this.recognition?.removeEventListener('start', startHandler);
        this.recognition?.removeEventListener('error', errorHandler);
      };

      this.recognition.addEventListener('start', startHandler);
      this.recognition.addEventListener('error', errorHandler, { once: true });

      try {
        this.recognition.start();
      } catch (error) {
        this.recognition.removeEventListener('start', startHandler);
        this.recognition.removeEventListener('error', errorHandler);
        reject(error);
      }
    });
  }

  stopListening(): void {
    console.log('Stopping speech recognition');
    
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (error) {
        console.warn('Error stopping speech recognition:', error);
      }
    }
    
    this.isListening = false;
    this.callbacks = null;
  }

  getIsListening(): boolean {
    return this.isListening;
  }

  // Manual restart that resets all error counters
  manualRestart(): void {
    console.log('Manual restart requested');
    this.networkErrorCount = 0;
    // Don't actually restart here - just reset state
    // Let the application handle the restart
  }

  getDebugInfo(): object {
    return {
      isListening: this.isListening,
      isSupported: this.isSupported(),
      lastActivity: new Date(this.lastTranscriptTime).toISOString(),
      timeSinceLastActivity: Date.now() - this.lastTranscriptTime,
      networkErrors: this.networkErrorCount
    };
  }
}
