export interface SpeechRecognitionCallbacks {
  onTranscript: (transcript: string, isFinal: boolean) => void;
  onError: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

export class SpeechRecognitionService {
  private recognition: SpeechRecognition | null = null;
  private isListening = false;
  private callbacks: SpeechRecognitionCallbacks | null = null;
  private lastTranscriptTime = 0;
  private restartAttempts = 0;
  private maxRestartAttempts = 3;
  private isManualStop = false;

  constructor() {
    // Check if browser supports speech recognition
    const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognitionConstructor) {
      this.recognition = new SpeechRecognitionConstructor();
      this.setupRecognition();
    }
  }

  private setupRecognition() {
    if (!this.recognition) return;

    // Enhanced configuration for better performance
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 1;
    
    // Set service timeout (some browsers support this)
    if ('serviceURI' in this.recognition) {
      // @ts-ignore - Browser-specific property
      this.recognition.serviceURI = 'wss://www.google.com/speech-api/full-duplex/v1/up';
    }

    this.recognition.onresult = (event) => {
      this.handleResults(event);
    };

    this.recognition.onerror = (event) => {
      this.handleError(event);
    };

    this.recognition.onstart = () => {
      console.log('Speech recognition started');
      this.isListening = true;
      this.restartAttempts = 0;
      this.lastTranscriptTime = Date.now();
      
      if (this.callbacks?.onStart) {
        this.callbacks.onStart();
      }
    };

    this.recognition.onend = () => {
      console.log('Speech recognition ended');
      this.isListening = false;
      
      if (this.callbacks?.onEnd) {
        this.callbacks.onEnd();
      }

      // Auto-restart logic (only if not manually stopped)
      if (!this.isManualStop && this.callbacks && this.restartAttempts < this.maxRestartAttempts) {
        console.log('Auto-restarting speech recognition...');
        this.restartAttempts++;
        setTimeout(() => {
          if (!this.isManualStop && this.callbacks) {
            this.restart();
          }
        }, 1000);
      }
    };

    // Handle audio start/end events if available
    if ('onaudiostart' in this.recognition) {
      this.recognition.onaudiostart = () => {
        console.log('Audio capture started');
      };
    }

    if ('onaudioend' in this.recognition) {
      this.recognition.onaudioend = () => {
        console.log('Audio capture ended');
      };
    }

    // Handle sound start/end events if available
    if ('onsoundstart' in this.recognition) {
      this.recognition.onsoundstart = () => {
        console.log('Sound detected');
        this.lastTranscriptTime = Date.now();
      };
    }

    if ('onspeechstart' in this.recognition) {
      this.recognition.onspeechstart = () => {
        console.log('Speech started');
        this.lastTranscriptTime = Date.now();
      };
    }
  }

  private handleResults(event: SpeechRecognitionEvent) {
    if (!this.callbacks) return;

    let interimTranscript = '';
    let finalTranscript = '';

    // Process all results from the last result index
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

    // Send final transcript
    if (finalTranscript) {
      console.log('Final transcript:', finalTranscript);
      this.callbacks.onTranscript(finalTranscript, true);
    } 
    // Send interim transcript only if we have one and no final transcript
    else if (interimTranscript) {
      this.callbacks.onTranscript(interimTranscript, false);
    }

    this.lastTranscriptTime = Date.now();
  }

  private handleError(event: SpeechRecognitionErrorEvent) {
    console.error('Speech recognition error:', event.error, event.message);
    
    if (!this.callbacks) return;

    let errorMessage = event.error;
    let shouldRestart = false;

    switch (event.error) {
      case 'network':
        errorMessage = 'Network error occurred';
        shouldRestart = true;
        break;
      
      case 'not-allowed':
        errorMessage = 'Microphone permission denied';
        this.isManualStop = true; // Don't auto-restart on permission issues
        break;
      
      case 'service-not-allowed':
        errorMessage = 'Speech service not allowed';
        shouldRestart = true;
        break;
      
      case 'bad-grammar':
        errorMessage = 'Grammar error';
        shouldRestart = true;
        break;
      
      case 'language-not-supported':
        errorMessage = 'Language not supported';
        this.isManualStop = true;
        break;
      
      case 'no-speech':
        errorMessage = 'No speech detected';
        shouldRestart = true;
        break;
      
      case 'audio-capture':
        errorMessage = 'Audio capture failed';
        shouldRestart = true;
        break;
      
      case 'aborted':
        errorMessage = 'Speech recognition aborted';
        // Don't restart on abort as it's usually intentional
        break;
      
      default:
        errorMessage = `Unknown error: ${event.error}`;
        shouldRestart = true;
    }

    this.callbacks.onError(errorMessage);

    // Auto-restart for certain errors
    if (shouldRestart && !this.isManualStop && this.restartAttempts < this.maxRestartAttempts) {
      console.log(`Attempting to restart due to error: ${event.error}`);
      this.restartAttempts++;
      setTimeout(() => {
        if (!this.isManualStop && this.callbacks) {
          this.restart();
        }
      }, 2000);
    }
  }

  private restart() {
    if (!this.recognition || !this.callbacks) return;

    try {
      if (this.isListening) {
        this.recognition.stop();
      }
      
      setTimeout(() => {
        if (this.recognition && this.callbacks && !this.isManualStop) {
          this.recognition.start();
        }
      }, 500);
    } catch (error) {
      console.error('Error restarting speech recognition:', error);
      if (this.callbacks) {
        this.callbacks.onError('Failed to restart speech recognition');
      }
    }
  }

  isSupported(): boolean {
    return this.recognition !== null;
  }

  async startListening(callbacks: SpeechRecognitionCallbacks): Promise<void> {
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
      this.isManualStop = false;
      this.restartAttempts = 0;
      this.lastTranscriptTime = Date.now();

      // Set up one-time start handler for promise resolution
      const startHandler = () => {
        resolve();
        // Remove the temporary handler
        if (this.recognition) {
          this.recognition.removeEventListener('start', startHandler);
        }
      };

      // Add temporary start handler
      this.recognition.addEventListener('start', startHandler);

      // Set up error handler for promise rejection
      const errorHandler = (event: SpeechRecognitionErrorEvent) => {
        reject(new Error(`Speech recognition failed to start: ${event.error}`));
        // Clean up handlers
        if (this.recognition) {
          this.recognition.removeEventListener('start', startHandler);
          this.recognition.removeEventListener('error', errorHandler);
        }
      };

      this.recognition.addEventListener('error', errorHandler, { once: true });

      try {
        this.recognition.start();
      } catch (error) {
        // Clean up handlers
        this.recognition.removeEventListener('start', startHandler);
        this.recognition.removeEventListener('error', errorHandler);
        reject(error);
      }
    });
  }

  stopListening(): void {
    console.log('Stopping speech recognition manually');
    this.isManualStop = true;
    this.callbacks = null;
    
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
      }
    }
    
    this.isListening = false;
  }

  getIsListening(): boolean {
    return this.isListening;
  }

  // Get last activity time for debugging
  getLastActivityTime(): number {
    return this.lastTranscriptTime;
  }

  // Force restart method for manual troubleshooting
  forceRestart(): void {
    if (this.callbacks) {
      console.log('Force restarting speech recognition');
      this.restartAttempts = 0;
      this.restart();
    }
  }

  // Check if recognition seems stuck
  isStuck(): boolean {
    if (!this.isListening) return false;
    
    const timeSinceLastActivity = Date.now() - this.lastTranscriptTime;
    return timeSinceLastActivity > 60000; // Consider stuck after 60 seconds
  }

  // Get debug information
  getDebugInfo(): object {
    return {
      isListening: this.isListening,
      isSupported: this.isSupported(),
      lastActivity: new Date(this.lastTranscriptTime).toISOString(),
      timeSinceLastActivity: Date.now() - this.lastTranscriptTime,
      restartAttempts: this.restartAttempts,
      isManualStop: this.isManualStop,
      isStuck: this.isStuck()
    };
  }
}