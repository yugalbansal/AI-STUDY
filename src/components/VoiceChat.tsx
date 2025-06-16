import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Phone, PhoneOff, Settings } from 'lucide-react';
import { toast } from 'sonner';
import AudioVisualizer from './AudioVisualizer';
import { SpeechRecognitionService } from '../services/speechRecognition';
import { GeminiService } from '../services/gemini';
import { ElevenLabsService } from '../services/elevenlabs';

const VoiceChat = () => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [servicesReady, setServicesReady] = useState(false);

  const speechServiceRef = useRef<SpeechRecognitionService | null>(null);
  const geminiServiceRef = useRef<GeminiService | null>(null);
  const elevenLabsServiceRef = useRef<ElevenLabsService | null>(null);

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
  }, []);

  const startListening = async () => {
    try {
      if (!speechServiceRef.current?.isSupported()) {
        toast.error('Speech recognition is not supported in this browser');
        return;
      }

      // Request microphone permission first
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Start speech recognition
      await speechServiceRef.current.startListening({
        onTranscript: handleTranscript,
        onError: (error) => {
          console.error('Speech recognition error:', error);
          toast.error('Speech recognition error: ' + error);
          setIsListening(false);
          setIsConnected(false);
        }
      });
      
      setIsListening(true);
      setIsConnected(true);
      
      toast.success('Voice chat started! Start speaking...');
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
    if (speechServiceRef.current) {
      speechServiceRef.current.stopListening();
    }
    
    setIsListening(false);
    setIsConnected(false);
    
    toast.success('Voice chat stopped');
  };

  const handleTranscript = async (transcript: string, isFinal: boolean) => {
    setTranscript(transcript);
    
    if (isFinal && transcript.trim()) {
      console.log('Final transcript:', transcript);
      
      // Temporarily stop listening while AI responds
      setIsListening(false);
      
      try {
        // Get AI response from Gemini
        if (geminiServiceRef.current) {
          const response = await geminiServiceRef.current.generateResponse(transcript);
          setAiResponse(response);
          
          // Convert AI response to speech
          if (elevenLabsServiceRef.current) {
            setIsSpeaking(true);
            await elevenLabsServiceRef.current.textToSpeech(response, {
              onStart: () => setIsSpeaking(true),
              onEnd: () => {
                setIsSpeaking(false);
                // Resume listening after AI finishes speaking
                if (isConnected && speechServiceRef.current) {
                  setTimeout(() => {
                    speechServiceRef.current?.startListening({
                      onTranscript: handleTranscript,
                      onError: (error) => {
                        console.error('Speech recognition error:', error);
                        toast.error('Speech recognition error occurred');
                      }
                    });
                    setIsListening(true);
                  }, 500);
                }
              },
              onError: (error) => {
                console.error('TTS error:', error);
                setIsSpeaking(false);
                toast.error('Failed to play AI response');
                // Resume listening on TTS error
                if (isConnected) {
                  setTimeout(() => setIsListening(true), 500);
                }
              }
            });
          }
        }
      } catch (error) {
        console.error('Error processing response:', error);
        toast.error('Failed to get AI response');
        setIsListening(true); // Resume listening on error
      }
    }
  };

  const toggleConnection = () => {
    if (isConnected) {
      stopListening();
    } else {
      startListening();
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
                  isConnected ? 'bg-green-500 animate-pulse' : 
                  isSpeaking ? 'bg-blue-500 animate-pulse' : 
                  'bg-slate-500'
                }`} />
                <span className="text-slate-300">
                  {isConnected ? 
                    (isSpeaking ? 'AI is speaking...' : 
                     isListening ? 'Listening...' : 'Processing...') : 
                    'Disconnected'
                  }
                </span>
              </div>
              
              {/* Connection Button */}
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
