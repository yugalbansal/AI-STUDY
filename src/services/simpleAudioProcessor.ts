export interface SimpleAudioCallbacks {
  onError: (error: string) => void;
  onStreamReady?: (stream: MediaStream) => void;
}

export class SimpleAudioProcessor {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private isDucking = false;
  private callbacks: SimpleAudioCallbacks | null = null;
  private isActive = false;

  constructor() {
    // Simple constructor
  }

  async start(callbacks: SimpleAudioCallbacks): Promise<void> {
    this.callbacks = callbacks;
    
    try {
      console.log('Starting simplified audio processor...');
      
      // Request enhanced microphone with all available noise reduction
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
          channelCount: 1,
          // Chrome-specific enhancements
          ...(navigator.userAgent.includes('Chrome') && {
            googEchoCancellation: true,
            googAutoGainControl: true,
            googNoiseSuppression: true,
            googHighpassFilter: true,
            googEchoCancellation2: true,
            googAutoGainControl2: true,
            googNoiseSuppression2: true,
            googTypingNoiseDetection: true,
            googExperimentalAutoGainControl: true,
            googExperimentalEchoCancellation: true,
            googExperimentalNoiseSuppression: true
          })
        }
      });

      // Initialize audio context for gain control
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000,
        latencyHint: 'interactive'
      });

      // Create simple gain node for ducking
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 1.0;

      // Create analyser for volume detection
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = 0.3;

      // Connect stream to gain node to analyser
      const source = this.audioContext.createMediaStreamSource(this.stream);
      source.connect(this.gainNode);
      this.gainNode.connect(this.analyser);
      // Note: NOT connecting to destination to prevent audio feedback

      this.isActive = true;
      console.log('Simple audio processor started successfully');
      
      // Notify that stream is ready
      if (callbacks.onStreamReady) {
        callbacks.onStreamReady(this.stream);
      }
      
    } catch (error) {
      console.error('Failed to start simple audio processor:', error);
      this.callbacks?.onError(`Failed to initialize audio: ${error}`);
      throw error;
    }
  }

  // Enable audio ducking during AI speech to prevent feedback
  enableDucking(): void {
    if (!this.gainNode || this.isDucking) return;
    
    console.log('Enabling audio ducking (reducing microphone sensitivity)');
    this.isDucking = true;
    
    // Gradually reduce microphone gain to 5% to prevent feedback
    if (this.audioContext) {
      this.gainNode.gain.setTargetAtTime(0.05, this.audioContext.currentTime, 0.1);
    }
  }

  // Disable audio ducking after AI speech
  disableDucking(): void {
    if (!this.gainNode || !this.isDucking) return;
    
    console.log('Disabling audio ducking (restoring microphone sensitivity)');
    
    // Gradually restore microphone gain with delay to avoid immediate pickup
    setTimeout(() => {
      if (this.gainNode && this.audioContext && this.isDucking) {
        this.gainNode.gain.setTargetAtTime(1.0, this.audioContext.currentTime, 0.2);
        this.isDucking = false;
      }
    }, 1500); // 1.5 second delay before restoring full sensitivity
  }

  // Completely mute the microphone
  muteMicrophone(): void {
    if (!this.gainNode || !this.audioContext) return;
    console.log('Muting microphone');
    this.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
  }

  // Restore microphone after muting
  unmuteMicrophone(): void {
    if (!this.gainNode || !this.audioContext) return;
    console.log('Unmuting microphone');
    this.gainNode.gain.setValueAtTime(1.0, this.audioContext.currentTime);
  }

  // Check if audio processing is active
  isReady(): boolean {
    return this.isActive && this.stream !== null && this.audioContext?.state === 'running';
  }

  // Get the processed media stream
  getProcessedStream(): MediaStream | null {
    return this.stream;
  }

  // Stop the audio processor
  stop(): void {
    console.log('Stopping simple audio processor');
    this.isActive = false;
    this.callbacks = null;

    // Clean up gain node
    if (this.gainNode) {
      try {
        this.gainNode.disconnect();
      } catch (e) {
        console.warn('Error disconnecting gain node:', e);
      }
      this.gainNode = null;
    }

    // Clean up analyser
    if (this.analyser) {
      try {
        this.analyser.disconnect();
      } catch (e) {
        console.warn('Error disconnecting analyser:', e);
      }
      this.analyser = null;
    }

    // Stop microphone stream
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped audio track:', track.label);
      });
      this.stream = null;
    }

    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(e => {
        console.warn('Error closing audio context:', e);
      });
      this.audioContext = null;
    }

    // Reset state
    this.isDucking = false;
  }

  // Get current ducking state
  isDuckingActive(): boolean {
    return this.isDucking;
  }

  // Get current microphone volume (0 to 1)
  getCurrentVolume(): number {
    if (!this.analyser) return 0;

    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteTimeDomainData(data);

    let sumSquares = 0;
    for (let i = 0; i < data.length; i++) {
      const normalized = (data[i] - 128) / 128;
      sumSquares += normalized * normalized;
    }

    return Math.sqrt(sumSquares / data.length); // 0 → 1
  }

  // Simple debug info
  getDebugInfo(): object {
    return {
      isActive: this.isActive,
      hasStream: !!this.stream,
      hasAudioContext: !!this.audioContext,
      audioContextState: this.audioContext?.state || 'none',
      isDucking: this.isDucking,
      streamActive: this.stream?.active || false,
      trackCount: this.stream?.getTracks().length || 0
    };
  }
}
