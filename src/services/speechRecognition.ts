export interface SpeechRecognitionCallbacks {
  onTranscript: (transcript: string, isFinal: boolean) => void;
  onError: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
  onSilence?: () => void;
  onVoiceStart?: () => void;
}

export class SpeechRecognitionService {
  private recognition: SpeechRecognition | null = null;
  private isListening = false;
  private isStarting = false;
  private callbacks: SpeechRecognitionCallbacks | null = null;
  private lastTranscriptTime = 0;
  private restartAttempts = 0;
  private maxRestartAttempts = 3;
  private isManualStop = false;
  private isSpeakerActive = false;
  private silenceTimer: NodeJS.Timeout | null = null;
  private restartTimer: NodeJS.Timeout | null = null;
  private lastResultLength = 0;
  private consecutiveErrors = 0;
  private maxConsecutiveErrors = 2;
  private isRestarting = false;

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
      console.log('Speech recognition started successfully');
      this.isListening = true;
      this.isStarting = false;
      this.isRestarting = false;
      this.restartAttempts = 0;
      this.consecutiveErrors = 0; // Reset consecutive error counter on successful start
      this.lastTranscriptTime = Date.now();
      
      if (this.callbacks?.onStart) {
        this.callbacks.onStart();
      }
    };

    this.recognition.onend = () => {
      console.log('Speech recognition ended');
      this.isListening = false;
      this.isStarting = false;
      
      if (this.callbacks?.onEnd) {
        this.callbacks.onEnd();
      }

      // Only auto-restart on unexpected endings (not manual stops or too many errors)
      if (!this.isManualStop && this.callbacks && this.restartAttempts < this.maxRestartAttempts && this.consecutiveErrors < this.maxConsecutiveErrors && !this.isSpeakerActive) {
        console.log('Auto-restarting speech recognition... (attempt', this.restartAttempts + 1, '/', this.maxRestartAttempts, ')');
        this.restartAttempts++;
        setTimeout(() => {
          if (!this.isManualStop && this.callbacks && !this.isRestarting && !this.isSpeakerActive) {
            this.restart();
          }
        }, 2000); // Longer delay to prevent rapid restarts
      } else {
        console.log('Not auto-restarting:', { 
          isManualStop: this.isManualStop, 
          hasCallbacks: !!this.callbacks, 
          restartAttempts: this.restartAttempts, 
          consecutiveErrors: this.consecutiveErrors,
          isSpeakerActive: this.isSpeakerActive
        });
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

    this.consecutiveErrors++;
    let errorMessage = event.error;
    let shouldRestart = false;

    switch (event.error) {
      case 'network':
        // Network error often indicates browser limitations or microphone conflicts
        errorMessage = 'Connection issue (try restarting browser or check microphone)';
        // Only restart if we haven't had too many network errors
        shouldRestart = this.consecutiveErrors <= 2;
        break;
      
      case 'not-allowed':
        errorMessage = 'Microphone permission denied';
        this.isManualStop = true; // Don't auto-restart on permission issues
        break;
      
      case 'service-not-allowed':
        errorMessage = 'Speech service blocked (check browser settings)';
        this.isManualStop = true; // Don't keep retrying if service is blocked
        break;
      
      case 'bad-grammar':
        errorMessage = 'Grammar configuration error';
        shouldRestart = false; // Don't restart for config issues
        break;
      
      case 'language-not-supported':
        errorMessage = 'Language not supported';
        this.isManualStop = true;
        break;
      
      case 'no-speech':
        // This is usually normal - just means timeout
        errorMessage = 'No speech detected (timeout)';
        shouldRestart = this.consecutiveErrors <= 1;
        break;
      
      case 'audio-capture':
        errorMessage = 'Microphone access failed';
        shouldRestart = this.consecutiveErrors <= 1;
        break;
      
      case 'aborted':
        errorMessage = 'Speech recognition stopped';
        // Don't restart on abort as it's usually intentional
        break;
      
      default:
        errorMessage = `Unknown error: ${event.error}`;
        shouldRestart = this.consecutiveErrors <= 1;
    }

    this.callbacks.onError(errorMessage);

    // More conservative restart policy to prevent loops
    if (shouldRestart && !this.isManualStop && !this.isRestarting && this.restartAttempts < this.maxRestartAttempts) {
      console.log(`Attempting to restart due to error: ${event.error} (attempt ${this.restartAttempts + 1}/${this.maxRestartAttempts})`);
      this.restartAttempts++;
      this.isRestarting = true;
      
      // Longer delays for network errors
      const delay = event.error === 'network' ? 5000 : 2000;
      
      setTimeout(() => {
        if (!this.isManualStop && this.callbacks && !this.isSpeakerActive) {
          this.restart();
        }
        this.isRestarting = false;
      }, delay);
    } else {
      console.log('Not restarting due to:', { shouldRestart, isManualStop: this.isManualStop, isRestarting: this.isRestarting, attempts: this.restartAttempts });
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
    this.isRestarting = false;
    this.isStarting = false;
    
    // Clear all timers
    this.cleanup();
    
    if (this.recognition && (this.isListening || this.isStarting)) {
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

  // Signal that speaker audio is active to prevent pickup
  setSpeakerActive(isActive: boolean): void {
    this.isSpeakerActive = isActive;
    
    if (isActive) {
      console.log('Speaker active - temporarily pausing speech recognition');
      // Temporarily stop recognition while speaker is active
      if (this.isListening && this.recognition) {
        try {
          this.recognition.stop();
        } catch (error) {
          console.warn('Could not stop recognition during speaker activity:', error);
        }
      }
    } else {
      console.log('Speaker inactive - resuming speech recognition');
      // Resume recognition after speaker stops with delay
      if (!this.isManualStop && this.callbacks) {
        this.restartTimer = setTimeout(() => {
          if (!this.isSpeakerActive && !this.isManualStop && this.callbacks) {
            this.restart();
          }
        }, 1500); // 1.5 second delay
      }
    }
  }

  // Enhanced restart with better error handling
  private restart() {
    if (!this.recognition || !this.callbacks || this.isSpeakerActive || this.isManualStop) {
      console.log('Skipping restart:', { hasRecognition: !!this.recognition, hasCallbacks: !!this.callbacks, isSpeakerActive: this.isSpeakerActive, isManualStop: this.isManualStop });
      return;
    }

    // Prevent multiple concurrent restarts
    if (this.isRestarting || this.isStarting) {
      console.log('Restart already in progress, skipping');
      return;
    }

    this.isRestarting = true;

    // Clear any existing restart timer
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }

    try {
      console.log('Restarting speech recognition...');
      
      // Ensure recognition is stopped before restarting
      if (this.isListening) {
        try {
          this.recognition.stop();
        } catch (e) {
          console.warn('Error stopping before restart:', e);
        }
      }
      
      // Wait for proper cleanup
      setTimeout(() => {
        if (this.recognition && this.callbacks && !this.isManualStop && !this.isSpeakerActive && !this.isStarting) {
          try {
            this.isStarting = true;
            this.recognition.start();
            this.consecutiveErrors = 0; // Reset error counter on successful start
            
            // Reset starting flag after a delay
            setTimeout(() => {
              this.isStarting = false;
            }, 1000);
          } catch (error) {
            console.error('Failed to restart recognition:', error);
            this.isStarting = false;
            this.consecutiveErrors++;
            
            if (this.consecutiveErrors < this.maxConsecutiveErrors && !this.isManualStop) {
              // Try again with longer delay
              setTimeout(() => {
                this.isRestarting = false;
                this.restart();
              }, 3000);
            } else {
              this.callbacks?.onError('Speech recognition failed after multiple attempts');
              this.isManualStop = true; // Stop trying
            }
          }
        }
        this.isRestarting = false;
      }, 1000); // Wait 1 second for cleanup
    } catch (error) {
      console.error('Error in restart process:', error);
      this.isRestarting = false;
      if (this.callbacks) {
        this.callbacks.onError('Failed to restart speech recognition');
      }
    }
  }

  // Clean up timers and resources
  private cleanup(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
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
      isSpeakerActive: this.isSpeakerActive,
      consecutiveErrors: this.consecutiveErrors,
      isStuck: this.isStuck()
    };
  }
}
