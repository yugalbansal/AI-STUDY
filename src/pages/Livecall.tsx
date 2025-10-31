import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, Volume2, VolumeX, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';
import { AISiriChat } from '@/components/ui/ai-siri-chat';
import { RobustSpeechRecognitionService } from '../services/robustSpeechRecognition';
import { GeminiService } from '../services/gemini';
import { ElevenLabsService } from '../services/elevenlabs';
import { SimpleAudioProcessor } from '../services/simpleAudioProcessor';

const Livecall = () => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [servicesReady, setServicesReady] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [volume] = useState(0);

  const speechServiceRef = useRef<RobustSpeechRecognitionService | null>(null);
  const geminiServiceRef = useRef<GeminiService | null>(null);
  const elevenLabsServiceRef = useRef<ElevenLabsService | null>(null);
  const audioProcessorRef = useRef<SimpleAudioProcessor | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize services
  useEffect(() => {
    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const elevenLabsKey = import.meta.env.VITE_ELEVENLABS_API_KEY;

    if (!geminiKey || !elevenLabsKey) {
      toast.error('API keys not configured. Please check your environment variables.');
      return;
    }

    geminiServiceRef.current = new GeminiService(geminiKey);
    elevenLabsServiceRef.current = new ElevenLabsService(elevenLabsKey);
    speechServiceRef.current = new RobustSpeechRecognitionService();
    
    if (!speechServiceRef.current.isSupported()) {
      toast.error('Speech recognition not supported. Please use Chrome or Edge.');
    } else {
      setServicesReady(true);
    }

    return () => {
      stopListening();
    };
  }, []);

  const setupMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        }
      });
      
      micStreamRef.current = stream;
      return stream;
    } catch (error) {
      console.warn('Advanced audio not supported, using basic microphone');
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

  const handleSpeechError = useCallback((error: string) => {
    console.error('Speech error:', error);
    
    if (error.includes('not-allowed') || error.includes('permission')) {
      toast.error('Microphone permission denied');
      setIsConnected(false);
      setIsListening(false);
    } else if (!error.includes('Persistent network')) {
      toast.error(`Speech: ${error}`);
    }
  }, []);

  const handleTranscript = useCallback(async (transcript: string, isFinal: boolean) => {
    if (isSpeaking || isProcessingAudio) {
      return;
    }

    setTranscript(transcript);
    
    if (isFinal && transcript.trim()) {
      const trimmedTranscript = transcript.trim();
      
      setIsListening(false);
      setIsProcessingAudio(true);
      
      if (speechServiceRef.current) {
        speechServiceRef.current.stopListening();
      }
      
      try {
        // Get AI response
        if (geminiServiceRef.current) {
          const response = await geminiServiceRef.current.generateResponse(trimmedTranscript);
          setAiResponse(response);
          
          // Convert to speech
          if (elevenLabsServiceRef.current && !isMuted) {
            setIsSpeaking(true);
            
            await elevenLabsServiceRef.current.textToSpeech(response, {
              onStart: () => {
                setIsSpeaking(true);
                setIsProcessingAudio(true);
                audioProcessorRef.current?.enableDucking();
              },
              onEnd: () => {
                setIsSpeaking(false);
                audioProcessorRef.current?.disableDucking();

                setTimeout(() => {
                  setIsProcessingAudio(false);
                  
                  if (isConnected) {
                    restartTimeoutRef.current = setTimeout(() => {
                      if (isConnected && !isSpeaking) {
                        restartSpeechRecognition();
                      }
                    }, 2000);
                  }
                }, 1000);
              },
              onError: (error) => {
                console.error('TTS error:', error);
                setIsSpeaking(false);
                setIsProcessingAudio(false);
                audioProcessorRef.current?.disableDucking();
                toast.error('Failed to play AI response');
                
                if (isConnected) {
                  setTimeout(() => restartSpeechRecognition(), 2000);
                }
              }
            });
          } else {
            setIsProcessingAudio(false);
            if (isConnected) {
              setTimeout(() => restartSpeechRecognition(), 1000);
            }
          }
        }
      } catch (error) {
        console.error('Error processing response:', error);
        toast.error('Failed to get AI response');
        setIsProcessingAudio(false);
        
        if (isConnected) {
          setTimeout(() => restartSpeechRecognition(), 2000);
        }
      }
    }
  }, [isSpeaking, isProcessingAudio, isMuted, isConnected]);

  const restartSpeechRecognition = useCallback(async () => {
    if (!isConnected || !speechServiceRef.current) return;

    try {
      speechServiceRef.current.manualRestart();
      speechServiceRef.current.stopListening();
      setIsListening(false);
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      if (isConnected && !isSpeaking) {
        await speechServiceRef.current.startListening({
          onTranscript: handleTranscript,
          onError: handleSpeechError,
          onStart: () => {
            setIsListening(true);
          },
          onEnd: () => {
            setIsListening(false);
          }
        });
      }
    } catch (error) {
      console.error('Error restarting speech recognition:', error);
      toast.error('Failed to restart. Please try the restart button.');
    }
  }, [isConnected, isSpeaking, handleTranscript, handleSpeechError]);

  const startListening = async () => {
    try {
      if (!speechServiceRef.current?.isSupported()) {
        toast.error('Speech recognition not supported');
        return;
      }

      speechServiceRef.current.manualRestart();
      await setupMicrophone();

      if (!audioProcessorRef.current) {
        audioProcessorRef.current = new SimpleAudioProcessor();
      }
      
      try {
        await audioProcessorRef.current.start({
          onError: (err) => console.warn('Audio processor error:', err),
          onStreamReady: () => console.log('Audio stream ready')
        });
      } catch (e) {
        console.warn('Falling back without advanced audio processing');
      }
      
      await speechServiceRef.current.startListening({
        onTranscript: handleTranscript,
        onError: handleSpeechError,
        onStart: () => {
          setIsListening(true);
        },
        onEnd: () => {
          setIsListening(false);
        }
      });
      
      setIsConnected(true);
      toast.success('Voice chat started!');
      
    } catch (error) {
      console.error('Error starting voice chat:', error);
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        toast.error('Microphone permission denied');
      } else {
        toast.error('Failed to start voice chat');
      }
    }
  };

  const stopListening = () => {
    if (speechServiceRef.current) {
      speechServiceRef.current.stopListening();
    }
    
    stopMicrophone();

    if (audioProcessorRef.current) {
      audioProcessorRef.current.stop();
      audioProcessorRef.current = null;
    }
    
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    
    setIsListening(false);
    setIsConnected(false);
    setIsSpeaking(false);
    setIsProcessingAudio(false);
    
    toast.success('Voice chat stopped');
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
      setIsProcessingAudio(false);
      restartSpeechRecognition();
      toast.success('Restarting...');
    }
  };

  const canStart = servicesReady && speechServiceRef.current?.isSupported();

  return (
    <div className="relative min-h-screen">
      <Navbar isFixed />
      
      {/* AI Siri Chat Component */}
      <AISiriChat
        isListening={isListening}
        isProcessing={isProcessingAudio && !isSpeaking}
        isSpeaking={isSpeaking}
        volume={volume}
        onToggleListening={toggleConnection}
        transcript={transcript}
        aiResponse={aiResponse}
      />

      {/* Floating Control Panel */}
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
        <div className="bg-white/90 backdrop-blur-lg rounded-full shadow-2xl border border-gray-200 p-4 flex items-center gap-4">
          {/* Main Call Button */}
          <Button
            onClick={toggleConnection}
            disabled={!canStart}
            size="lg"
            className={`w-16 h-16 rounded-full ${
              isConnected ? 
                'bg-red-500 hover:bg-red-600' : 
                'bg-gradient-to-r from-fuchsia-500 to-violet-500 hover:from-fuchsia-600 hover:to-violet-600'
            } text-white shadow-lg`}
          >
            {isConnected ? (
              <PhoneOff className="w-6 h-6" />
            ) : (
              <Phone className="w-6 h-6" />
            )}
          </Button>
          
          {/* Secondary Controls */}
          {isConnected && (
            <>
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
              
              <Button
                onClick={forceRestart}
                variant="outline"
                size="sm"
                className="rounded-full text-gray-700 border-gray-300"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Error Message for Unsupported Browser */}
      {!canStart && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 max-w-md">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-lg">
            <p className="text-sm text-yellow-800">
              {!speechServiceRef.current?.isSupported() 
                ? '⚠️ Please use Chrome or Edge browser for voice chat'
                : '⚠️ Please configure API keys in environment variables'
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Livecall;