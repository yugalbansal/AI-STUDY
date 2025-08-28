import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Phone, PhoneOff, Settings, AlertCircle, Volume2, VolumeX, Mic, MicOff } from 'lucide-react';
import { toast } from 'sonner';
import AudioVisualizer from './AudioVisualizer';
import { SpeechRecognitionService } from '../services/speechRecognition';
import { GeminiService } from '../services/gemini';
import { ElevenLabsService, TTSCallbacks } from '../services/elevenlabs';
import { SimpleAudioProcessor } from '../services/simpleAudioProcessor';

const VoiceChat = () => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [servicesReady, setServicesReady] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [debugInfo, setDebugInfo] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [audioReady, setAudioReady] = useState(false);

  const speechServiceRef = useRef<SpeechRecognitionService | null>(null);
  const geminiServiceRef = useRef<GeminiService | null>(null);
  const elevenLabsServiceRef = useRef<ElevenLabsService | null>(null);
  const audioProcessorRef = useRef<SimpleAudioProcessor | null>(null);
  const activityCheckRef = useRef<NodeJS.Timeout | null>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const speakerAudioRef = useRef<HTMLAudioElement | null>(null);
  const echoSuppressionRef = useRef<boolean>(false);

  // Initialize services with environment variables
  useEffect(() => {
    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const elevenLabsKey = import.meta.env.VITE_ELEVENLABS_API_KEY;

    if (!geminiKey || !elevenLabsKey) {
      toast.error('Please set VITE_GEMINI_API_KEY and VITE_ELEVENLABS_API_KEY in your environment variables');
      return;
    }

    // Initialize services
    geminiServiceRef.current = new GeminiService(geminiKey);
    elevenLabsServiceRef.current = new ElevenLabsService(elevenLabsKey);
    speechServiceRef.current = new SpeechRecognitionService();
    
    if (!speechServiceRef.current.isSupported()) {
      toast.error('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
    } else {
      setServicesReady(true);
    }

    // Initialize audio context for echo suppression
    try {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    } catch (error) {
      console.warn('AudioContext not supported for echo suppression');
    }

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Activity monitoring with enhanced logic
  useEffect(() => {
    if (isConnected && isListening && !isSpeaking) {
      activityCheckRef.current = setInterval(() => {
        const timeSinceLastActivity = Date.now() - lastActivity;
        setDebugInfo(`Listening - Last activity: ${Math.floor(timeSinceLastActivity / 1000)}s ago`);
        
        // Update audio status
        if (audioProcessorRef.current) {
          const debugInfo = audioProcessorRef.current.getDebugInfo();
          console.log('Audio processor status:', debugInfo);
        }
        
        // Just log inactivity - let the speech recognition service handle its own restarts
        if (timeSinceLastActivity > 60000 && !isProcessingAudio) {
          console.warn('Long period of inactivity detected');
          setDebugInfo('Long silence detected - use Restart button if needed');
        }
      }, 5000);
    } else {
      if (activityCheckRef.current) {
        clearInterval(activityCheckRef.current);
        activityCheckRef.current = null;
      }
      if (isSpeaking) {
        setDebugInfo('AI is speaking...');
      } else if (!isConnected) {
        setDebugInfo('Disconnected');
      }
    }

    return () => {
      if (activityCheckRef.current) {
        clearInterval(activityCheckRef.current);
      }
    };
  }, [isConnected, isListening, lastActivity, isSpeaking, isProcessingAudio]);

  const setupEchoSuppression = async () => {
    try {
      // Request microphone with echo cancellation
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        }
      });
      
      micStreamRef.current = stream;
      echoSuppressionRef.current = true;
      
      console.log('Echo suppression enabled');
      return stream;
    } catch (error) {
      console.warn('Advanced audio features not supported, using basic microphone');
      // Fallback to basic microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      return stream;
    }
  };

  const stopMicrophone = () => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
  };

  const restartSpeechRecognition = useCallback(async () => {
    if (!isConnected || !speechServiceRef.current) return;

    try {
      setDebugInfo('Restarting speech recognition...');
      
      // Stop current recognition
      speechServiceRef.current.stopListening();
      setIsListening(false);
      
      // Wait longer before restarting
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (isConnected && !isSpeaking) { // Only restart if still connected and AI not speaking
        await speechServiceRef.current.startListening({
          onTranscript: handleTranscript,
          onError: handleSpeechError,
          onStart: () => {
            setIsListening(true);
            setLastActivity(Date.now());
            setDebugInfo('Speech recognition restarted successfully');
          },
          onEnd: () => {
            console.log('Speech recognition ended');
            // Only auto-restart if we're not processing AI audio
            if (isConnected && !isSpeaking && !isProcessingAudio) {
              setDebugInfo('Speech ended unexpectedly, will restart...');
              setTimeout(() => {
                if (isConnected && !isSpeaking && !isProcessingAudio) {
                  restartSpeechRecognition();
                }
              }, 1500);
            }
          }
        });
      }
    } catch (error) {
      console.error('Error restarting speech recognition:', error);
      setDebugInfo('Failed to restart - trying again...');
      
      // Try one more time after longer delay
      setTimeout(() => {
        if (isConnected && !isSpeaking) {
          restartSpeechRecognition();
        }
      }, 5000);
    }
  }, [isConnected, isSpeaking, isProcessingAudio]);

  const handleSpeechError = useCallback((error: string) => {
    console.error('Speech recognition error:', error);
    setDebugInfo(`Speech error: ${error}`);
    
    // Let the speech recognition service handle its own restarts
    // Only handle UI state changes here
    if (error.includes('not-allowed') || error.includes('permission')) {
      toast.error('Microphone permission denied');
      setIsConnected(false);
      setIsListening(false);
    } else if (error.includes('Connection issue') || error.includes('failed after multiple attempts')) {
      toast.error('Speech recognition connection failed');
      setIsConnected(false);
      setIsListening(false);
    } else {
      // For other errors, just show the message but let the service handle recovery
      toast.error(`Speech: ${error}`);
    }
  }, []);

  const startListening = async () => {
    try {
      if (!speechServiceRef.current?.isSupported()) {
        toast.error('Speech recognition is not supported in this browser');
        return;
      }

      setDebugInfo('Starting voice chat...');
      
      // Setup microphone with echo suppression
      await setupEchoSuppression();

      // Start simple audio processor for ducking control
      if (!audioProcessorRef.current) {
        audioProcessorRef.current = new SimpleAudioProcessor();
      }
      
      try {
        await audioProcessorRef.current.start({
          onError: (err) => {
            console.warn('Audio processor error:', err);
          },
          onStreamReady: () => {
            setAudioReady(true);
            console.log('Audio stream ready with enhanced noise reduction');
          }
        });
      } catch (e) {
        console.warn('Falling back without advanced audio processing');
      }
      
      // Start speech recognition
      await speechServiceRef.current.startListening({
        onTranscript: handleTranscript,
        onError: handleSpeechError,
        onStart: () => {
          setIsListening(true);
          setLastActivity(Date.now());
          setDebugInfo('Speech recognition active');
        },
        onEnd: () => {
          // Just update UI state, let the speech service handle its own restarts
          setIsListening(false);
          if (!isSpeaking && !isProcessingAudio) {
            setDebugInfo('Speech recognition ended, auto-restarting...');
          }
        }
      });
      
      setIsConnected(true);
      setLastActivity(Date.now());
      
      toast.success('Voice chat started! Start speaking...');
      
      if (echoSuppressionRef.current) {
        toast.success('Echo cancellation enabled');
      } else {
        toast.warning('For best results, use headphones to prevent echo');
      }
      
    } catch (error) {
      console.error('Error starting voice chat:', error);
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        toast.error('Microphone permission denied. Please allow microphone access and try again.');
      } else {
        toast.error('Failed to start voice chat. Please check your microphone permissions.');
      }
    }
  };

  const stopListening = () => {
    setDebugInfo('Stopping voice chat...');
    
    if (speechServiceRef.current) {
      speechServiceRef.current.stopListening();
    }
    
    // Stop microphone
    stopMicrophone();

    // Stop audio processor
    if (audioProcessorRef.current) {
      audioProcessorRef.current.stop();
      audioProcessorRef.current = null;
    }
    
    // Clear all timeouts and intervals
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    if (activityCheckRef.current) {
      clearInterval(activityCheckRef.current);
      activityCheckRef.current = null;
    }
    
    // Stop any playing audio
    if (speakerAudioRef.current) {
      speakerAudioRef.current.pause();
      speakerAudioRef.current = null;
    }
    
    setIsListening(false);
    setIsConnected(false);
    setIsSpeaking(false);
    setIsProcessingAudio(false);
    setDebugInfo('');
    
    toast.success('Voice chat stopped');
  };

  const handleTranscript = async (transcript: string, isFinal: boolean) => {
    // Ignore transcripts while AI is speaking or processing
    if (isSpeaking || isProcessingAudio) {
      console.log('Ignoring transcript while AI is active:', transcript);
      return;
    }

    setTranscript(transcript);
    setLastActivity(Date.now());
    
    if (isFinal && transcript.trim()) {
      const trimmedTranscript = transcript.trim().toLowerCase();
      
      // Filter out potential echo phrases (common AI responses)
      const echoPatterns = [
        'hello', 'hi there', 'how can I help', 'i am', 'i\'m here',
        'what can I do', 'how may I assist', 'good morning', 'good afternoon'
      ];
      
      const isLikelyEcho = echoPatterns.some(pattern => 
        trimmedTranscript.includes(pattern) && trimmedTranscript.length < 50
      );
      
      if (isLikelyEcho) {
        console.log('Potential echo detected, ignoring:', transcript);
        setDebugInfo('Potential echo ignored');
        return;
      }
      
      console.log('Processing final transcript:', transcript);
      setDebugInfo('Processing your message...');
      
      // Stop listening and set processing state
      setIsListening(false);
      setIsProcessingAudio(true);
      
      // Stop speech recognition temporarily
      if (speechServiceRef.current) {
        speechServiceRef.current.stopListening();
      }
      
      try {
        // Get AI response from Gemini
        if (geminiServiceRef.current) {
          const response = await geminiServiceRef.current.generateResponse(transcript);
          setAiResponse(response);
          
          // Convert AI response to speech
          if (elevenLabsServiceRef.current && !isMuted) {
            setIsSpeaking(true);
            setDebugInfo('AI is speaking...');
            
            await elevenLabsServiceRef.current.textToSpeech(response, {
              onStart: () => {
                setIsSpeaking(true);
                setIsProcessingAudio(true);
                // Engage ducking and pause ASR to prevent feedback
                audioProcessorRef.current?.enableDucking();
                speechServiceRef.current?.setSpeakerActive(true);
              },
              onDuckingEnabled: () => {
                // Additional hook if needed
              },
              onDuckingDisabled: () => {
                // Called when playback is fully done and safe to resume
              },
              onEnd: () => {
                console.log('AI finished speaking');
                setIsSpeaking(false);
                setDebugInfo('AI finished speaking, waiting before resuming...');
                
                // Release ducking and allow ASR to resume after a short delay
                audioProcessorRef.current?.disableDucking();
                speechServiceRef.current?.setSpeakerActive(false);

                // Wait longer before resuming to avoid echo
                setTimeout(() => {
                  setIsProcessingAudio(false);
                  
                  if (isConnected) {
                    setDebugInfo('Resuming listening...');
                    // Resume listening after longer delay
                    restartTimeoutRef.current = setTimeout(() => {
                      if (isConnected && !isSpeaking) {
                        restartSpeechRecognition();
                      }
                    }, 3000); // Increased delay to 3 seconds
                  }
                }, 1000);
              },
              onError: (error) => {
                console.error('TTS error:', error);
                setIsSpeaking(false);
                setIsProcessingAudio(false);
                // Ensure we re-enable mic processing
                audioProcessorRef.current?.disableDucking();
                speechServiceRef.current?.setSpeakerActive(false);
                setDebugInfo('TTS error occurred');
                toast.error('Failed to play AI response');
                
                // Resume listening on TTS error
                if (isConnected) {
                  setTimeout(() => restartSpeechRecognition(), 2000);
                }
              }
            });
          } else {
            // If muted, just finish processing
            setIsProcessingAudio(false);
            if (isConnected) {
              setTimeout(() => restartSpeechRecognition(), 1000);
            }
          }
        }
      } catch (error) {
        console.error('Error processing response:', error);
        setDebugInfo('Error processing AI response');
        toast.error('Failed to get AI response');
        setIsProcessingAudio(false);
        
        // Resume listening on error
        if (isConnected) {
          setTimeout(() => restartSpeechRecognition(), 2000);
        }
      }
    } else if (!isFinal) {
      setDebugInfo(`Listening... (${transcript.length} chars)`);
    }
  };

  const toggleConnection = () => {
    if (isConnected) {
      stopListening();
    } else {
      startListening();
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    toast.success(isMuted ? 'AI voice enabled' : 'AI voice muted');
  };

  const forceRestart = () => {
    if (isConnected) {
      setDebugInfo('Force restarting...');
      setIsProcessingAudio(false);
      restartSpeechRecognition();
    }
  };


  const canStart = servicesReady && speechServiceRef.current?.isSupported();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-white">AI Voice Assistant</h1>
          <p className="text-slate-300">Have a natural conversation with AI</p>
          <p className="text-slate-300">Built with Love from Yugal</p>
          <p className="text-slate-300">If it stucks press Restart button</p>
          <p className="text-slate-300">Bot gets stucks in Noisy Surrounding, So please be in quiet place or use Headphones</p>
          {!echoSuppressionRef.current && isConnected && (
            <p className="text-yellow-400 text-sm">
              💡 For best results, use headphones to prevent echo
            </p>
          )}
          {!speechServiceRef.current?.isSupported() && (
            <p className="text-yellow-400 text-sm">
              ⚠️ Speech recognition not supported. Please use Chrome or Edge browser.
            </p>
          )}
        </div>

        {/* Main Chat Interface */}
        <Card className="p-8 bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <div className="space-y-6">
            {/* Audio Visualizer */}
            <div className="flex justify-center">
              <AudioVisualizer 
                isListening={isListening} 
                isSpeaking={isSpeaking}
                isConnected={isConnected}
              />
            </div>

            {/* Status */}
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  isConnected ? 
                    (isSpeaking ? 'bg-blue-500 animate-pulse' :
                     isListening ? 'bg-green-500 animate-pulse' :
                     isProcessingAudio ? 'bg-yellow-500 animate-pulse' : 'bg-orange-500') :
                    'bg-slate-500'
                }`} />
                <span className="text-slate-300">
                  {isConnected ? 
                    (isSpeaking ? 'AI is speaking...' : 
                     isListening ? 'Listening...' : 
                     isProcessingAudio ? 'Processing...' : 'Preparing...') : 
                    'Disconnected'
                  }
                </span>
              </div>
              
              {/* Debug Info */}
              {debugInfo && (
                <div className="text-xs text-slate-400 flex items-center justify-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {debugInfo}
                </div>
              )}
              
              {/* Control Buttons */}
              <div className="flex items-center justify-center gap-4">
                <Button
                  onClick={toggleConnection}
                  disabled={!canStart}
                  size="lg"
                  className={`w-32 h-32 rounded-full text-white font-semibold transition-all ${
                    isConnected ? 
                      'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/25' : 
                      'bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/25'
                  }`}
                >
                  {isConnected ? (
                    <PhoneOff className="w-8 h-8" />
                  ) : (
                    <Phone className="w-8 h-8" />
                  )}
                </Button>
                
                {/* Mute Button */}
                {isConnected && (
                  <Button
                    onClick={toggleMute}
                    variant="outline"
                    size="sm"
                    className={`${isMuted ? 'text-red-400 border-red-400' : 'text-blue-400 border-blue-400'} hover:bg-opacity-10`}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4 mr-1" /> : <Volume2 className="w-4 h-4 mr-1" />}
                    {isMuted ? 'Muted' : 'Audio'}
                  </Button>
                )}
                
                {/* Force Restart Button */}
                {isConnected && (
                  <Button
                    onClick={forceRestart}
                    variant="outline"
                    size="sm"
                    className="text-yellow-400 border-yellow-400 hover:bg-yellow-400/10"
                  >
                    <Settings className="w-4 h-4 mr-1" />
                    Restart
                  </Button>
                )}
              </div>

              {/* Audio Status */}
              {isConnected && audioReady && (
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className="text-xs text-green-400">✓ Enhanced Audio Processing Active</span>
                </div>
              )}
              
              {!canStart && (
                <p className="text-yellow-400 text-sm mt-2">
                  Please set API keys in environment variables and use a supported browser
                </p>
              )}
            </div>

            {/* Transcript and Response */}
            <div className="space-y-4">
              {transcript && (
                <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                  <div className="text-sm text-slate-400 mb-1">You said:</div>
                  <div className="text-white">{transcript}</div>
                </div>
              )}
              
              {aiResponse && (
                <div className="p-4 bg-blue-900/30 rounded-lg border border-blue-700/50">
                  <div className="text-sm text-blue-400 mb-1">AI response:</div>
                  <div className="text-white">{aiResponse}</div>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default VoiceChat;