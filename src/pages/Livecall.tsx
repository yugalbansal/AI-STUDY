import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { getChatResponse } from '../lib/gemini';
import { Link } from 'react-router-dom';
import { ArrowLeft, Volume2, VolumeX } from 'lucide-react';
import './Livecall.css';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
    speechSynthesis: SpeechSynthesis;
    SpeechSynthesisUtterance: typeof SpeechSynthesisUtterance;
    AudioContext: any;
    webkitAudioContext: any;
  }
}

export default function LiveCall() {
  const { user } = useAuth();
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [liveCallEnabled, setLiveCallEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognition = useRef<any>(null);
  const [transcript, setTranscript] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const resumeTimerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Debug state
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [showDebug, setShowDebug] = useState(true); // Set to true by default to help debug

  // Load voices and initialize audio
  useEffect(() => {
    // Initialize audio context
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioContextRef.current = new AudioContext();
        addDebugInfo(`Audio context created: ${audioContextRef.current.state}`);
        
        // Try to resume the audio context
        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume().then(() => {
            addDebugInfo(`Audio context resumed: ${audioContextRef.current.state}`);
          }).catch(err => {
            addDebugInfo(`Failed to resume audio context: ${err}`);
          });
        }
      } else {
        addDebugInfo('AudioContext not supported in this browser');
      }
    } catch (e) {
      addDebugInfo(`Error creating audio context: ${e}`);
    }

    // Function to load and set available voices
    const loadVoices = () => {
      try {
        const availableVoices = window.speechSynthesis.getVoices();
        
        if (availableVoices.length > 0) {
          // Look for an Indian voice first
          let voice = availableVoices.find(v => 
            (v.lang.includes('en-IN') || v.name.toLowerCase().includes('indian'))
          );
          
          // If no Indian voice, try any English voice
          if (!voice) {
            voice = availableVoices.find(v => v.lang.includes('en'));
          }
          
          // If still no voice, use the first available
          if (!voice) {
            voice = availableVoices[0];
          }
          
          setSelectedVoice(voice);
          addDebugInfo(`Selected voice: ${voice.name} (${voice.lang})`);
          
          // Log all available voices for debugging
          const voiceList = availableVoices.map(v => `${v.name} (${v.lang})`).join('\n');
          addDebugInfo(`Available voices (${availableVoices.length}):\n${voiceList}`);
        } else {
          addDebugInfo('No voices available yet');
        }
      } catch (e) {
        addDebugInfo(`Error loading voices: ${e}`);
      }
    };

    // Try to load voices immediately
    loadVoices();

    // Set up event for when voices change/load
    window.speechSynthesis.onvoiceschanged = loadVoices;

    // Unlock audio on page load
    unlockAudio();

    // Test speech synthesis
    testSpeechSynthesis();

    // Cleanup function
    return () => {
      if (resumeTimerRef.current) {
        clearInterval(resumeTimerRef.current);
      }
      window.speechSynthesis.cancel();
      
      if (audioContextRef.current) {
        audioContextRef.current.close().then(() => {
          addDebugInfo('Audio context closed');
        }).catch(err => {
          addDebugInfo(`Error closing audio context: ${err}`);
        });
      }
    };
  }, []);

  // Add debug information
  const addDebugInfo = (info: string) => {
    console.log(info);
    setDebugInfo(prev => `${new Date().toLocaleTimeString()}: ${info}\n${prev}`);
  };

  // Unlock audio context on page load
  const unlockAudio = () => {
    try {
      // Create a short sound and play it to unlock audio
      if (audioContextRef.current) {
        const oscillator = audioContextRef.current.createOscillator();
        const gainNode = audioContextRef.current.createGain();
        
        // Set gain to 0 (silent)
        gainNode.gain.value = 0;
        
        // Connect and start
        oscillator.connect(gainNode);
        gainNode.connect(audioContextRef.current.destination);
        oscillator.start(0);
        oscillator.stop(0.1);
        
        addDebugInfo(`Audio unlocking attempted: ${audioContextRef.current.state}`);
        
        // Try to resume the context
        audioContextRef.current.resume().then(() => {
          addDebugInfo(`Audio context resumed: ${audioContextRef.current.state}`);
        }).catch(err => {
          addDebugInfo(`Failed to resume audio context: ${err}`);
        });
      } else {
        addDebugInfo('No audio context available for unlocking');
      }
      
      // Also try to unlock Web Speech API
      const utterance = new SpeechSynthesisUtterance('');
      utterance.volume = 0;
      window.speechSynthesis.speak(utterance);
      
      addDebugInfo('Audio unlock attempted via silent utterance');
    } catch (e) {
      addDebugInfo(`Error unlocking audio: ${e}`);
    }
  };

  // Test speech synthesis
  const testSpeechSynthesis = () => {
    try {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      // Create a test utterance with a short text
      const utterance = new SpeechSynthesisUtterance('Test');
      utterance.volume = 0.1; // Very quiet but not silent
      
      utterance.onstart = () => addDebugInfo('Test speech started');
      utterance.onend = () => addDebugInfo('Test speech completed');
      utterance.onerror = (e) => addDebugInfo(`Test speech error: ${e.error}`);
      
      // Speak the test utterance
      window.speechSynthesis.speak(utterance);
      addDebugInfo('Test speech synthesis initiated');
    } catch (e) {
      addDebugInfo(`Speech synthesis test failed: ${e}`);
    }
  };

  // Scroll to bottom when chat updates
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Initialize speech recognition
  useEffect(() => {
    if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      setError('Speech recognition is not supported in your browser.');
      addDebugInfo('Speech recognition not supported');
      return;
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = true;
      recognition.current.interimResults = true;
      recognition.current.lang = 'en-US';

      recognition.current.onstart = () => {
        setIsActive(true);
        addDebugInfo('Speech recognition started');
      };

      recognition.current.onresult = async (event: any) => {
        if (isSpeaking || isProcessing) return;

        const result = event.results[event.results.length - 1];
        const transcript = result[0].transcript;
        
        setTranscript(transcript);
        addDebugInfo(`Transcript: ${transcript.substring(0, 30)}...`);

        if (result.isFinal) {
          recognition.current.stop();
          setIsProcessing(true);
          addDebugInfo('Processing final transcript');
          await handleResponse(transcript);
          setIsProcessing(false);
        }
      };

      recognition.current.onend = () => {
        setIsActive(false);
        addDebugInfo('Speech recognition ended');
        
        // Only restart if enabled and not speaking/processing
        if (liveCallEnabled && !isSpeaking && !isProcessing) {
          setTimeout(() => {
            startRecognition();
          }, 500);
        }
      };

      recognition.current.onerror = (event: any) => {
        addDebugInfo(`Speech recognition error: ${event.error}`);
        
        // Don't show error for "no-speech" as it's common
        if (event.error !== 'no-speech') {
          setError(`Speech recognition error: ${event.error}`);
        }
        setIsActive(false);
      };

      addDebugInfo('Speech recognition initialized');
    } catch (err) {
      addDebugInfo(`Speech recognition initialization error: ${err}`);
      setError('Failed to initialize speech recognition.');
    }

    return () => {
      try {
        if (recognition.current) {
          recognition.current.stop();
          addDebugInfo('Speech recognition stopped on cleanup');
        }
      } catch (e) {
        addDebugInfo(`Error stopping recognition on cleanup: ${e}`);
      }
    };
  }, [liveCallEnabled, isSpeaking, isProcessing]);

  // Start speech recognition
  const startRecognition = async () => {
    if (!recognition.current || isProcessing || isSpeaking) return;
    
    try {
      recognition.current.start();
      setIsActive(true);
      addDebugInfo('Started speech recognition');
    } catch (err) {
      addDebugInfo(`Failed to start recognition: ${err}`);
      setError('Failed to access microphone. Please ensure microphone permissions are granted.');
    }
  };

  // Handle user message and get AI response
  const handleResponse = async (text: string) => {
    if (!text.trim() || loading || !user?.id) return;
  
    setLoading(true);
    setError(null);
  
    try {
      const userMessage = {
        id: Date.now().toString(),
        user_id: user.id,
        message: text,
        isUser: true,
        created_at: new Date().toISOString()
      };
  
      setChatHistory(prev => [...prev, userMessage]);
      addDebugInfo('Added user message to chat history');
  
      addDebugInfo('Getting response from API...');
      const response = await getChatResponse(text, '');
      addDebugInfo('API Response received');
  
      if (!response) {
        throw new Error('No response from AI');
      }
  
      const aiMessage = {
        id: Date.now().toString() + '-response',
        user_id: user.id,
        message: response,
        isUser: false,
        created_at: new Date().toISOString()
      };
  
      setChatHistory(prev => [...prev, aiMessage]);
      addDebugInfo('Added AI response to chat history');
  
      // Handle speech synthesis if not muted
      if (liveCallEnabled && !isMuted) {
        await speakText(response);
      } else {
        addDebugInfo('Speech synthesis skipped (muted or live call disabled)');
        // If muted, still need to restart recognition
        if (liveCallEnabled) {
          setTimeout(() => {
            if (!isProcessing) startRecognition();
          }, 1000);
        }
      }
  
      // Save to database
      await supabase.from('chat_history').insert([{
        user_id: user.id,
        message: text,
        response
      }]);
      addDebugInfo('Saved conversation to database');
  
    } catch (error: any) {
      addDebugInfo(`Error in handleResponse: ${error}`);
      setError(error.message || 'Error processing message');
      setIsSpeaking(false);
      
      // Restart recognition even if there was an error
      if (liveCallEnabled && !isProcessing) {
        setTimeout(() => startRecognition(), 1000);
      }
    } finally {
      setLoading(false);
    }
  };

  // Speak text using Web Speech API
  const speakText = async (text: string): Promise<void> => {
    return new Promise((resolve) => {
      try {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();
        
        // Clear any existing resume timer
        if (resumeTimerRef.current) {
          clearInterval(resumeTimerRef.current);
          resumeTimerRef.current = null;
        }
        
        setIsSpeaking(true);
        addDebugInfo('Starting speech synthesis');
        
        // Create utterance with improved settings
        const utterance = new SpeechSynthesisUtterance(text);
        utteranceRef.current = utterance;
        
        // Set the selected voice if available
        if (selectedVoice) {
          utterance.voice = selectedVoice;
          addDebugInfo(`Using voice: ${selectedVoice.name} (${selectedVoice.lang})`);
        } else {
          addDebugInfo('No voice selected, using default voice');
        }
        
        utterance.lang = 'en-US';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        // Set up event handlers
        utterance.onstart = () => {
          addDebugInfo('Speech started');
          setIsSpeaking(true);
        };
        
        utterance.onend = () => {
          addDebugInfo('Speech ended');
          setIsSpeaking(false);
          
          // Clear the resume timer
          if (resumeTimerRef.current) {
            clearInterval(resumeTimerRef.current);
            resumeTimerRef.current = null;
          }
          
          // Resume listening after speech ends
          setTimeout(() => {
            if (liveCallEnabled && !isProcessing) {
              startRecognition();
            }
          }, 1000);
          
          resolve();
        };
        
        utterance.onerror = (event) => {
          addDebugInfo(`Speech synthesis error: ${event.error}`);
          setError(`Speech error: ${event.error}`);
          setIsSpeaking(false);
          
          // Clear the resume timer
          if (resumeTimerRef.current) {
            clearInterval(resumeTimerRef.current);
            resumeTimerRef.current = null;
          }
          
          // Resume listening even after error
          if (liveCallEnabled && !isProcessing) {
            setTimeout(() => startRecognition(), 1000);
          }
          
          resolve();
        };
        
        // Speak the text
        window.speechSynthesis.speak(utterance);
        addDebugInfo('Speech synthesis speak() called');
        
        // Chrome has a bug where it stops speaking after ~15 seconds
        // This is a workaround to keep it going
        resumeTimerRef.current = window.setInterval(() => {
          if (!window.speechSynthesis.speaking) {
            clearInterval(resumeTimerRef.current!);
            resumeTimerRef.current = null;
            return;
          }
          
          addDebugInfo('Applying speech synthesis resume fix');
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }, 5000);
        
      } catch (error: any) {
        addDebugInfo(`Error in speakText: ${error}`);
        setError(`Failed to speak: ${error.message}`);
        setIsSpeaking(false);
        
        // Resume listening even after error
        if (liveCallEnabled && !isProcessing) {
          setTimeout(() => startRecognition(), 1000);
        }
        
        resolve();
      }
    });
  };

  // Toggle mute
  const toggleMute = () => {
    setIsMuted(!isMuted);
    addDebugInfo(`Audio ${!isMuted ? 'muted' : 'unmuted'}`);
    
    // If currently speaking and muting, stop speech
    if (isSpeaking && !isMuted) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      
      // Resume listening
      if (liveCallEnabled && !isProcessing) {
        setTimeout(() => startRecognition(), 500);
      }
    }
  };

  // Toggle live call on/off
  const toggleLiveCall = async () => {
    try {
      if (!liveCallEnabled) {
        // Reset state
        setError(null);
        
        // Unlock audio again just to be safe
        unlockAudio();
        
        // Test speech synthesis with audible sound
        try {
          const testUtterance = new SpeechSynthesisUtterance("Live call started");
          if (selectedVoice) {
            testUtterance.voice = selectedVoice;
          }
          testUtterance.onstart = () => addDebugInfo('Test speech started (audible)');
          testUtterance.onend = () => addDebugInfo('Test speech ended (audible)');
          testUtterance.onerror = (e) => addDebugInfo(`Test speech error: ${e.error}`);
          
          window.speechSynthesis.speak(testUtterance);
          addDebugInfo('Audible test speech initiated');
        } catch (e) {
          addDebugInfo(`Audible test speech failed: ${e}`);
        }
        
        // Start recognition
        await startRecognition();
        
        setLiveCallEnabled(true);
        addDebugInfo('Live call enabled');
      } else {
        // Stop speech recognition
        if (recognition.current) {
          try {
            recognition.current.stop();
          } catch (e) {
            addDebugInfo(`Error stopping recognition: ${e}`);
          }
        }
        
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();
        
        // Clear any existing resume timer
        if (resumeTimerRef.current) {
          clearInterval(resumeTimerRef.current);
          resumeTimerRef.current = null;
        }
        
        setIsSpeaking(false);
        setIsActive(false);
        setLiveCallEnabled(false);
        addDebugInfo('Live call disabled');
      }
    } catch (err) {
      addDebugInfo(`Error toggling live call: ${err}`);
      setError('Error toggling live call. Please refresh the page and try again.');
      setLiveCallEnabled(false);
      setIsActive(false);
    }
  };

  return (
    <div className="livecall-container">
      <div className="content-wrapper">
        <div className="header">
          <Link to="/chat" className="back-button"><ArrowLeft size={20} /></Link>
          <h1>Voice Assistant</h1>
          <div className="flex items-center ml-auto">
            <button 
              onClick={toggleMute} 
              className="p-2 rounded-full bg-gray-700 text-white hover:bg-gray-600"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <button 
              onClick={() => setShowDebug(!showDebug)} 
              className="ml-2 p-2 rounded-full bg-gray-700 text-white hover:bg-gray-600"
              title="Toggle Debug Info"
            >
              {showDebug ? "Hide Debug" : "Show Debug"}
            </button>
          </div>
        </div>
        
        {showDebug && (
          <div className="debug-panel bg-gray-800 text-green-400 p-4 rounded-md mb-4 overflow-auto max-h-40">
            <h3 className="text-white mb-2">Debug Info:</h3>
            <pre className="text-xs whitespace-pre-wrap">{debugInfo}</pre>
          </div>
        )}
        
        <div className="globe-container">
          <div className={`globe ${isActive ? 'listening' : ''}`}></div>
          <div className="globe-ring"></div>
          {isActive && (
            <>
              <div className="waveform"></div>
              <div className="waveform" style={{ animationDelay: '0.5s' }}></div>
              <div className="waveform" style={{ animationDelay: '1s' }}></div>
            </>
          )}
        </div>
        
        <div className="transcript-container">
          <p>{transcript || "Speak something..."}</p>
          {isProcessing && <p className="processing">Processing...</p>}
          {isSpeaking && <p className="speaking">Speaking{isMuted ? " (Muted)" : ""}...</p>}
        </div>
        
        <div className="chat-history">
          {chatHistory.map((chat) => (
            <div key={chat.id} className="chat-message">
              <p className={chat.isUser ? "user-message" : "ai-response"}>
                {chat.isUser ? `You: ${chat.message}` : `AI: ${chat.message}`}
              </p>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
      </div>
      
      <div className="footer">
        <button 
          onClick={toggleLiveCall} 
          disabled={loading} 
          className={`toggle-button ${liveCallEnabled ? 'stop' : 'start'}`}
        >
          {loading ? 'Processing...' : liveCallEnabled ? 'Stop Live Call' : 'Start Live Call'}
        </button>
      </div>
    </div>
  );
}