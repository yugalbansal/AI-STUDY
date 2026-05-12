import { useState, useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, Volume2, VolumeX } from 'lucide-react';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';
import { AISiriChat } from '@/components/ui/ai-siri-chat';
import { GroqSTTService } from '../services/groqSTT';
import { GroqTTSService } from '../services/groqTTS';
import { GeminiService } from '../services/gemini';
import { SimpleAudioProcessor } from '../services/simpleAudioProcessor';

// ============================================================================
// STATE MACHINE - SINGLE SOURCE OF TRUTH
// ============================================================================
type VoiceState = 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING' | 'ERROR';

const VALID_TRANSITIONS: Record<VoiceState, VoiceState[]> = {
  IDLE: ['LISTENING', 'THINKING', 'SPEAKING', 'ERROR'],
  LISTENING: ['THINKING', 'IDLE', 'ERROR'],
  THINKING: ['SPEAKING', 'IDLE', 'ERROR'],
  SPEAKING: ['LISTENING', 'IDLE', 'ERROR'],
  ERROR: ['IDLE']
};

const Livecall = () => {
  // ============================================================================
  // STATE - ONLY ONE STATE VARIABLE FOR CONTROL
  // ============================================================================
  const [currentState, setCurrentState] = useState<VoiceState>('IDLE');
  
  // UI-only state (does not control flow)
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [servicesReady, setServicesReady] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume] = useState(0);

  // ============================================================================
  // SERVICES - ALL IN useRef (never useState)
  // ============================================================================
  const groqSTTRef = useRef<GroqSTTService | null>(null);
  const groqTTSRef = useRef<GroqTTSService | null>(null);
  const geminiServiceRef = useRef<GeminiService | null>(null);
  const audioProcessorRef = useRef<SimpleAudioProcessor | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  
  // ============================================================================
  // MUTEX - PREVENTS OVERLAPPING TRANSITIONS (FIX #2)
  // ============================================================================
  const transitionMutexRef = useRef(false);
  
  // ============================================================================
  // CANCELLATION TOKEN - ABORT IN-FLIGHT OPERATIONS (FIX #3)
  // ============================================================================
  const operationIdRef = useRef(0);
  
  // ============================================================================
  // STATE MACHINE GUARD
  // ============================================================================
  const transitionTo = (newState: VoiceState): boolean => {
    const validNextStates = VALID_TRANSITIONS[currentState];
    
    if (!validNextStates.includes(newState)) {
      console.error(`Invalid transition: ${currentState} -> ${newState}`);
      return false;
    }
    
    console.log(`STATE TRANSITION: ${currentState} -> ${newState}`);
    setCurrentState(newState);
    return true;
  };

  // ============================================================================
  // SERVICE INITIALIZATION (RUNS ONCE)
  // ============================================================================
  useEffect(() => {
    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const groqKey = import.meta.env.VITE_GROQ_API_KEY;

    if (!geminiKey || !groqKey) {
      toast.error('API keys not configured. Check VITE_GEMINI_API_KEY and VITE_GROQ_API_KEY.');
      return;
    }

    geminiServiceRef.current = new GeminiService(geminiKey);
    groqSTTRef.current = new GroqSTTService({ apiKey: groqKey });
    groqTTSRef.current = new GroqTTSService({ apiKey: groqKey });
    
    setServicesReady(true);

    return () => {
      // Cleanup on unmount
      fullStop();
    };
  }, []);

  // ============================================================================
  // MICROPHONE CONTROL (BLOCKING)
  // ============================================================================
  const setupMicrophone = async (): Promise<void> => {
    if (micStreamRef.current) {
      console.log('Microphone already active');
      return;
    }

    try {
      // Request microphone with browser's built-in noise suppression
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
          // Let browser choose optimal sample rate
        }
      });

      micStreamRef.current = stream;
      console.log('Microphone activated');
    } catch (error) {
      console.warn('Advanced audio not supported, using basic microphone');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
    }
  };

  const stopMicrophone = async (): Promise<void> => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
      console.log('Microphone stopped');
    }
    
    // Wait for mic to fully release
    await new Promise(resolve => setTimeout(resolve, 100));
  };

  // ============================================================================
  // STATE TRANSITION: LISTENING -> THINKING
  // ============================================================================
  const handleFinalTranscript = async (text: string) => {
    // FIX #2: Acquire mutex - prevent overlapping transitions
    if (transitionMutexRef.current) {
      console.warn('Transition in progress, ignoring transcript');
      return;
    }
    
    const trimmedText = text.trim();
    if (!trimmedText) {
      console.log('Empty transcript, ignoring');
      return;
    }
    
    // Acquire mutex
    transitionMutexRef.current = true;
    const myOperationId = ++operationIdRef.current;
    
    console.log(`User said: "${trimmedText}"`);
    setTranscript(trimmedText);
    
    try {
      // Transition to THINKING (state machine validates transition is legal)
      if (!transitionTo('THINKING')) {
        console.error('Cannot transition to THINKING from current state');
        return;
      }
      
      // FIX #6: Stop recording BEFORE any processing (BLOCKING)
      console.log('Stopping audio recording...');
      if (groqSTTRef.current && groqSTTRef.current.isCurrentlyRecording()) {
        groqSTTRef.current.forceStop();
      }
      await new Promise(resolve => setTimeout(resolve, 100)); // Hardware settling time
      
      // FIX #5: Check cancellation token
      if (operationIdRef.current !== myOperationId) {
        console.log('Operation cancelled (newer operation started)');
        return;
      }
      
      // STEP 2: Get LLM response (BLOCKING)
      console.log('Getting LLM response...');
      if (!geminiServiceRef.current) {
        throw new Error('Gemini service not initialized');
      }
      
      const response = await geminiServiceRef.current.generateResponse(trimmedText);
      
      // FIX #5: Check cancellation token after LLM call
      if (operationIdRef.current !== myOperationId) {
        console.log('Operation cancelled after LLM call');
        return;
      }
      
      console.log(`AI response: "${response}"`);
      setAiResponse(response);
      
      // STEP 3: Transition to SPEAKING
      await transitionToSpeaking(response, myOperationId);
      
    } catch (error) {
      console.error('Error in THINKING state:', error);
      toast.error('Failed to get AI response');
      transitionTo('ERROR');
      await fullStop();
    } finally {
      // FIX #2: Always release mutex
      transitionMutexRef.current = false;
    }
  };
  
  // ============================================================================
  // STATE TRANSITION: THINKING -> SPEAKING
  // ============================================================================
  const transitionToSpeaking = async (responseText: string, operationId: number) => {
    // FIX #5: Check cancellation token
    if (operationIdRef.current !== operationId) {
      console.log('TTS cancelled before starting');
      return;
    }

    if (!transitionTo('SPEAKING')) return;

    // Enable audio ducking to prevent feedback during AI speech
    if (audioProcessorRef.current) {
      audioProcessorRef.current.enableDucking();
    }

    try {
      // FIX #6: Ensure mic is HARD STOPPED (not just muted)
      console.log('Ensuring microphone is stopped...');
      if (groqSTTRef.current && groqSTTRef.current.isCurrentlyRecording()) {
        groqSTTRef.current.forceStop();
      }
      await new Promise(resolve => setTimeout(resolve, 200)); // Hardware settling time

      // FIX #4 & #5: Check cancellation before TTS
      if (operationIdRef.current !== operationId) {
        console.log('TTS cancelled after mic stop');
        return;
      }

      // STEP 2: Play TTS with Groq (BLOCKING) - only if not muted
      if (!isMuted && groqTTSRef.current) {
        console.log('Playing Groq TTS...');

        // FIX #4: TTS is fully blocking and abortable
        await groqTTSRef.current.speak(responseText);

        console.log('TTS playback completed');
      } else {
        console.log('TTS muted or service unavailable');
      }

      // FIX #5: Check cancellation after TTS
      if (operationIdRef.current !== operationId) {
        console.log('Cancelled after TTS, not restarting');
        return;
      }

      // STEP 3: Wait before restarting microphone
      await new Promise(resolve => setTimeout(resolve, 500)); // Post-TTS silence buffer

      // STEP 4: Transition back to LISTENING
      await transitionToListening();

    } catch (error) {
      console.error('Error in SPEAKING state:', error);
      toast.error('Failed to play response');
      transitionTo('ERROR');
      await fullStop();
    }
  };
  
  // ============================================================================
  // STATE TRANSITION: IDLE -> LISTENING (FIX #1: GROQ STT ONLY)
  // ============================================================================
  const transitionToListening = async () => {
    if (currentState !== 'IDLE' && currentState !== 'SPEAKING') {
      console.error('Cannot transition to LISTENING from', currentState);
      return;
    }

    if (!transitionTo('LISTENING')) return;

    // Reset mutex for new listening cycle
    transitionMutexRef.current = false;

    // Ensure ducking is disabled when starting to listen
    if (audioProcessorRef.current) {
      audioProcessorRef.current.disableDucking();
    }

    try {
      // STEP 1: Ensure microphone stream is active (BLOCKING)
      await setupMicrophone();

      if (!micStreamRef.current) {
        throw new Error('Failed to get microphone stream');
      }

      // STEP 2: Start audio processor (for gain control and noise handling)
      if (!audioProcessorRef.current) {
        audioProcessorRef.current = new SimpleAudioProcessor();
        try {
          await audioProcessorRef.current.start({
            onError: (err) => console.warn('Audio processor warning:', err),
            onStreamReady: () => console.log('Audio stream ready')
          });
        } catch (e) {
          console.warn('Audio processor failed, continuing without it');
        }
      }

      // FIX #1: Start Groq STT recording with PROCESSED audio stream
      console.log('Starting Groq STT recording...');
      if (!groqSTTRef.current) {
        throw new Error('Groq STT service not initialized');
      }

      // Use processed stream from audio processor if available, otherwise use raw stream
      const streamToUse = audioProcessorRef.current?.getProcessedStream() || micStreamRef.current;
      await groqSTTRef.current.startRecording(streamToUse);
      console.log('Recording audio for Groq STT...');

      // FIX #1 & #5: Wait for user to finish speaking, then transcribe
      await waitForUserSpeech();

    } catch (error) {
      console.error('Error transitioning to LISTENING:', error);
      toast.error('Failed to start listening');
      transitionTo('ERROR');
      await fullStop();
    }
  };
  
  // FIX #1 & #5: Improved VAD for noisy environments
  const waitForUserSpeech = async () => {
    console.log('Listening with improved noise-resistant VAD...');

    const MIN_SPEECH_DURATION = 400; // ms - minimum speech to trigger
    const SILENCE_DURATION = 1200; // ms - longer silence to stop (more tolerant)
    const MAX_LISTENING_TIME = 15000; // ms - max time to prevent infinite loops
    const NOISE_FLOOR_SAMPLES = 15; // samples to calculate ambient noise
    const CHECK_INTERVAL = 50; // ms

    let silenceStart: number | null = null;
    let speechStart: number | null = null;
    let noiseFloor = 0;
    let sampleCount = 0;

    // Calculate ambient noise floor first
    console.log('Calibrating ambient noise level...');
    const calibrationStart = Date.now();
    while (sampleCount < NOISE_FLOOR_SAMPLES && (Date.now() - calibrationStart) < 1000) {
      if (!groqSTTRef.current?.isCurrentlyRecording()) {
        console.log('Recording stopped during calibration');
        return;
      }
      const vol = audioProcessorRef.current?.getCurrentVolume() ?? 0;
      noiseFloor = Math.max(noiseFloor, vol);
      sampleCount++;
      await new Promise(r => setTimeout(r, 30));
    }

    // Dynamic threshold - at least 1.5x ambient noise, with minimum floor
    const SPEECH_THRESHOLD = Math.max(noiseFloor * 2.5, 0.02);
    console.log(`Noise floor: ${noiseFloor.toFixed(4)}, Speech threshold: ${SPEECH_THRESHOLD.toFixed(4)}`);

    const startTime = Date.now();

    while (true) {
      // Stop if recording was cancelled
      if (!groqSTTRef.current?.isCurrentlyRecording()) {
        console.log('Recording stopped externally');
        return;
      }

      // Timeout safety - max 15 seconds listening
      if (Date.now() - startTime > MAX_LISTENING_TIME) {
        console.log('Max listening time reached, stopping...');
        break;
      }

      const volume = audioProcessorRef.current?.getCurrentVolume() ?? 0;

      if (volume > SPEECH_THRESHOLD) {
        // User is speaking
        if (speechStart === null) {
          speechStart = Date.now();
          console.log('Speech detected, starting speech timer...');
        }
        silenceStart = null;
      } else {
        // Below threshold - could be silence or noise
        if (silenceStart === null) {
          silenceStart = Date.now();
          console.log('Below threshold, starting silence timer...');
        }

        // Check if user was speaking and then went silent
        if (speechStart !== null && (Date.now() - silenceStart) >= SILENCE_DURATION) {
          const speechDuration = Date.now() - speechStart;
          if (speechDuration >= MIN_SPEECH_DURATION) {
            console.log(`Speech detected (${speechDuration}ms), stopping recording...`);
            break;
          } else {
            // Too short, ignore and keep listening
            console.log(`Sound too short (${speechDuration}ms), ignoring...`);
            speechStart = null;
            silenceStart = null;
          }
        }
      }

      await new Promise(r => setTimeout(r, CHECK_INTERVAL));
    }

    // Stop & transcribe
    try {
      if (!groqSTTRef.current) {
        console.error('Groq STT service not available');
        return;
      }

      if (!groqSTTRef.current.isCurrentlyRecording()) {
        console.log('Recording already stopped, aborting transcription');
        return;
      }

      const transcript = await groqSTTRef.current.stopAndTranscribe();
      console.log(`Transcription result: "${transcript}"`);

      if (transcript) {
        setTranscript(transcript);
        await handleFinalTranscript(transcript);
      } else {
        console.log('No speech detected (empty transcript)');
        if (currentState === 'LISTENING') {
          console.log('Restarting listening cycle...');
          await transitionToListening();
        } else {
          console.log('No longer in LISTENING state, not restarting');
        }
      }
    } catch (error) {
      console.error('Transcription error:', error);
      toast.error('Speech recognition failed');
      transitionTo('ERROR');
      await fullStop();
    }
  };

  // ============================================================================
  // FULL STOP (EMERGENCY CLEANUP) - FIX #4: ABORT ALL IN-FLIGHT OPERATIONS
  // ============================================================================
  const fullStop = async () => {
    console.log('FULL STOP - Aborting all operations');
    
    // FIX #5: Invalidate all in-flight operations
    operationIdRef.current++;
    
    // FIX #2: Release mutex if held
    transitionMutexRef.current = false;
    
    // FIX #4: Force stop Groq TTS (SYNCHRONOUS ABORT)
    if (groqTTSRef.current) {
      groqTTSRef.current.forceStop();
    }
    
    // FIX #6: Force stop Groq STT recording (SYNCHRONOUS ABORT)
    if (groqSTTRef.current) {
      groqSTTRef.current.forceStop();
    }
    
    // Stop audio processor
    if (audioProcessorRef.current) {
      audioProcessorRef.current.stop();
      audioProcessorRef.current = null;
    }
    
    // Stop microphone
    await stopMicrophone();
    
    // Reset UI state
    setTranscript('');
    setAiResponse('');
    
    // Return to IDLE
    transitionTo('IDLE');
    console.log('System stopped - returned to IDLE');
  };
  
  // ============================================================================
  // USER ACTIONS
  // ============================================================================
  const handleStartStop = async () => {
    if (currentState === 'IDLE') {
      // Start the system
      if (!groqSTTRef.current || !groqTTSRef.current) {
        toast.error('Groq services not initialized. Check API key.');
        return;
      }
      
      toast.success('Starting voice chat...');
      await transitionToListening();
      
    } else {
      // Stop the system (from any state)
      toast.info('Stopping voice chat...');
      await fullStop();
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    toast.success(isMuted ? 'AI voice enabled' : 'AI voice muted');
  };

  const canStart = servicesReady && groqSTTRef.current !== null && groqTTSRef.current !== null;
  const isActive = currentState !== 'IDLE' && currentState !== 'ERROR';

  // ============================================================================
  // RENDER - UI ONLY
  // ============================================================================
  return (
    <>
      <Helmet>
        <title>Voice Call - Vector Mind AI</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="relative min-h-screen bg-white dark:bg-zinc-900">
      <Navbar isFixed />
      
      {/* AI Siri Chat Component */}
      <AISiriChat
        isListening={currentState === 'LISTENING'}
        isProcessing={currentState === 'THINKING'}
        isSpeaking={currentState === 'SPEAKING'}
        volume={volume}
        onToggleListening={handleStartStop}
        transcript={transcript}
        aiResponse={aiResponse}
      />

      {/* Floating Control Panel */}
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
        <div className="bg-white/90 dark:bg-zinc-800/90 backdrop-blur-lg rounded-full shadow-2xl border border-gray-200 dark:border-zinc-700 p-4 flex items-center gap-4">
          {/* Main Call Button */}
          <Button
            onClick={handleStartStop}
            disabled={!canStart}
            size="lg"
            className={`w-16 h-16 rounded-full ${
              isActive ? 
                'bg-red-500 hover:bg-red-600' : 
                'bg-gradient-to-r from-fuchsia-500 to-violet-500 hover:from-fuchsia-600 hover:to-violet-600'
            } text-white shadow-lg`}
          >
            {isActive ? (
              <PhoneOff className="w-6 h-6" />
            ) : (
              <Phone className="w-6 h-6" />
            )}
          </Button>
          
          {/* Secondary Controls */}
          {isActive && (
            <Button
              onClick={toggleMute}
              variant="outline"
              size="sm"
              className={`rounded-full ${
                isMuted ? 'text-red-500 border-red-300' : 'text-gray-700 border-gray-300'
              }`}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
          )}
        </div>
        
        {/* State Indicator (for debugging) */}
        <div className="text-center mt-2">
          <span className="text-xs text-gray-500 dark:text-gray-400 bg-white/80 dark:bg-zinc-800/80 px-3 py-1 rounded-full">
            State: {currentState}
          </span>
        </div>
      </div>

      {/* Error Message for Unsupported Browser */}
      {!canStart && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 max-w-md">
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-900 rounded-lg p-4 shadow-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              ⚠️ Please configure VITE_GROQ_API_KEY and VITE_GEMINI_API_KEY in environment variables
            </p>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default Livecall;
