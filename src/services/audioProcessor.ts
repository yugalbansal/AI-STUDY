export interface AudioProcessorCallbacks {
  onVoiceStart: () => void;
  onVoiceEnd: () => void;
  onSpeechDetected: (audioData: Float32Array) => void;
  onError: (error: string) => void;
}

export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private analyzer: AnalyserNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private filter: BiquadFilterNode | null = null;
  
  // Voice Activity Detection
  private vadThreshold = 0.01;
  private silenceThreshold = 0.005;
  private voiceDetected = false;
  private silenceCounter = 0;
  private silenceLimit = 50; // ~1 second at 50Hz
  private voiceCounter = 0;
  private voiceLimit = 10; // ~200ms at 50Hz
  
  // Audio ducking for speaker isolation
  private isDucking = false;
  private duckingGain: GainNode | null = null;
  
  // Background noise baseline
  private noiseBaseline = 0;
  private adaptiveThreshold = 0.01;
  private noiseBuffer: number[] = [];
  private maxNoiseBuffer = 100;
  
  private callbacks: AudioProcessorCallbacks | null = null;
  private isProcessing = false;

  constructor() {
    // Will be initialized in start() method
  }

  async start(callbacks: AudioProcessorCallbacks): Promise<void> {
    this.callbacks = callbacks;
    
    try {
      // Initialize audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000,
        latencyHint: 'interactive'
      });

      // Request enhanced microphone with all noise reduction features
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
          channelCount: 1,
          // Additional constraints for better quality
          ...(navigator.userAgent.includes('Chrome') && {
            googEchoCancellation: true,
            googAutoGainControl: true,
            googNoiseSuppression: true,
            googHighpassFilter: true,
            googEchoCancellation2: true,
            googAutoGainControl2: true,
            googNoiseSuppression2: true
          })
        }
      });

      // Create audio processing chain
      this.setupAudioProcessingChain();
      
      // Start processing
      this.isProcessing = true;
      console.log('Enhanced audio processor started');
      
    } catch (error) {
      console.error('Failed to start audio processor:', error);
      this.callbacks?.onError(`Failed to initialize audio: ${error}`);
      throw error;
    }
  }

  private setupAudioProcessingChain(): void {
    if (!this.audioContext || !this.stream) return;

    // Create audio source from microphone
    this.microphone = this.audioContext.createMediaStreamSource(this.stream);

    // Create gain node for ducking (temporarily reducing mic volume)
    this.duckingGain = this.audioContext.createGain();
    this.duckingGain.gain.value = 1.0;

    // Create compressor for dynamic range control
    this.compressor = this.audioContext.createDynamicsCompressor();
    this.compressor.threshold.value = -20;
    this.compressor.knee.value = 20;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;

    // Create high-pass filter to remove low-frequency noise
    this.filter = this.audioContext.createBiquadFilter();
    this.filter.type = 'highpass';
    this.filter.frequency.value = 100; // Remove frequencies below 100Hz
    this.filter.Q.value = 0.7;

    // Create analyzer for voice activity detection
    this.analyzer = this.audioContext.createAnalyser();
    this.analyzer.fftSize = 1024;
    this.analyzer.smoothingTimeConstant = 0.3;

    // Create script processor for real-time analysis
    this.processor = this.audioContext.createScriptProcessor(1024, 1, 1);
    this.processor.onaudioprocess = (event) => {
      this.processAudioData(event);
    };

    // Connect the audio processing chain
    this.microphone
      .connect(this.duckingGain)
      .connect(this.filter)
      .connect(this.compressor)
      .connect(this.analyzer)
      .connect(this.processor);
      
    // Connect to destination for monitoring (can be removed in production)
    this.processor.connect(this.audioContext.destination);
  }

  private processAudioData(event: AudioProcessingEvent): void {
    if (!this.analyzer || !this.callbacks || this.isDucking) return;

    const inputData = event.inputBuffer.getChannelData(0);
    const bufferLength = this.analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    // Get frequency domain data for analysis
    this.analyzer.getByteFrequencyData(dataArray);
    
    // Calculate RMS (Root Mean Square) for volume level
    let sum = 0;
    for (let i = 0; i < inputData.length; i++) {
      sum += inputData[i] * inputData[i];
    }
    const rms = Math.sqrt(sum / inputData.length);
    
    // Update noise baseline (adaptive background noise estimation)
    this.updateNoiseBaseline(rms);
    
    // Voice Activity Detection with adaptive threshold
    this.detectVoiceActivity(rms, inputData);
  }

  private updateNoiseBaseline(currentLevel: number): void {
    // Add current level to noise buffer
    this.noiseBuffer.push(currentLevel);
    
    if (this.noiseBuffer.length > this.maxNoiseBuffer) {
      this.noiseBuffer.shift();
    }
    
    // Calculate baseline as the median of recent quiet periods
    if (this.noiseBuffer.length >= 20) {
      const sorted = [...this.noiseBuffer].sort((a, b) => a - b);
      this.noiseBaseline = sorted[Math.floor(sorted.length * 0.3)]; // 30th percentile
      this.adaptiveThreshold = Math.max(this.noiseBaseline * 3, 0.005);
    }
  }

  private detectVoiceActivity(rms: number, audioData: Float32Array): void {
    const isCurrentlyLoud = rms > this.adaptiveThreshold;
    
    if (isCurrentlyLoud) {
      this.voiceCounter++;
      this.silenceCounter = 0;
      
      // Voice detected after enough consecutive loud samples
      if (!this.voiceDetected && this.voiceCounter >= this.voiceLimit) {
        this.voiceDetected = true;
        console.log('Voice activity started (RMS:', rms.toFixed(4), 'Threshold:', this.adaptiveThreshold.toFixed(4), ')');
        this.callbacks?.onVoiceStart();
      }
      
      // Send audio data while voice is active
      if (this.voiceDetected) {
        this.callbacks?.onSpeechDetected(audioData);
      }
    } else {
      this.silenceCounter++;
      this.voiceCounter = 0;
      
      // Voice ended after enough consecutive quiet samples
      if (this.voiceDetected && this.silenceCounter >= this.silenceLimit) {
        this.voiceDetected = false;
        console.log('Voice activity ended');
        this.callbacks?.onVoiceEnd();
      }
    }
  }

  // Enable audio ducking during AI speech to prevent feedback
  enableDucking(): void {
    if (!this.duckingGain || this.isDucking) return;
    
    console.log('Enabling audio ducking');
    this.isDucking = true;
    
    // Gradually reduce microphone gain
    this.duckingGain.gain.setTargetAtTime(0.1, this.audioContext!.currentTime, 0.1);
  }

  // Disable audio ducking after AI speech
  disableDucking(): void {
    if (!this.duckingGain || !this.isDucking) return;
    
    console.log('Disabling audio ducking');
    
    // Gradually restore microphone gain with delay to avoid immediate pickup
    setTimeout(() => {
      if (this.duckingGain && this.audioContext) {
        this.duckingGain.gain.setTargetAtTime(1.0, this.audioContext.currentTime, 0.2);
        this.isDucking = false;
      }
    }, 1000); // 1 second delay before restoring full sensitivity
  }

  // Force silence the microphone (stronger than ducking)
  muteMicrophone(): void {
    if (!this.duckingGain) return;
    this.duckingGain.gain.setValueAtTime(0, this.audioContext!.currentTime);
  }

  // Restore microphone after muting
  unmuteMicrophone(): void {
    if (!this.duckingGain) return;
    this.duckingGain.gain.setValueAtTime(1.0, this.audioContext!.currentTime);
  }

  // Get current audio levels for debugging
  getAudioLevels(): { rms: number; baseline: number; threshold: number; voiceActive: boolean } {
    return {
      rms: 0, // Would need to store last RMS value
      baseline: this.noiseBaseline,
      threshold: this.adaptiveThreshold,
      voiceActive: this.voiceDetected
    };
  }

  stop(): void {
    console.log('Stopping audio processor');
    this.isProcessing = false;
    this.callbacks = null;

    // Clean up audio nodes
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    
    if (this.analyzer) {
      this.analyzer.disconnect();
      this.analyzer = null;
    }
    
    if (this.compressor) {
      this.compressor.disconnect();
      this.compressor = null;
    }
    
    if (this.filter) {
      this.filter.disconnect();
      this.filter = null;
    }
    
    if (this.duckingGain) {
      this.duckingGain.disconnect();
      this.duckingGain = null;
    }
    
    if (this.microphone) {
      this.microphone.disconnect();
      this.microphone = null;
    }

    // Stop microphone stream
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }

    // Reset state
    this.voiceDetected = false;
    this.isDucking = false;
    this.silenceCounter = 0;
    this.voiceCounter = 0;
  }

  // Check if audio processing is active
  isActive(): boolean {
    return this.isProcessing && this.audioContext?.state === 'running';
  }

  // Adjust sensitivity based on environment
  setSensitivity(level: 'low' | 'medium' | 'high'): void {
    switch (level) {
      case 'low':
        this.vadThreshold = 0.02;
        this.silenceLimit = 75; // More time before ending voice
        this.voiceLimit = 15; // More time before starting voice
        break;
      case 'medium':
        this.vadThreshold = 0.01;
        this.silenceLimit = 50;
        this.voiceLimit = 10;
        break;
      case 'high':
        this.vadThreshold = 0.005;
        this.silenceLimit = 25; // Less time before ending voice
        this.voiceLimit = 5; // Less time before starting voice
        break;
    }
    console.log(`Audio sensitivity set to ${level}`);
  }
}
