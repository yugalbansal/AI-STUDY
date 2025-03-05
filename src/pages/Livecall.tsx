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
  const [speechRate, setSpeechRate] = useState(1.2);

  const [debugInfo, setDebugInfo] = useState<string>('');
  const [showDebug, setShowDebug] = useState(true);
  const debugTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const addDebugInfo = (info: string) => {
    console.log(info);
    setDebugInfo(prev => `${new Date().toLocaleTimeString()}: ${info}\n${prev}`);
    
    if (debugTimeoutRef.current) {
      clearTimeout(debugTimeoutRef.current);
    }
    debugTimeoutRef.current = setTimeout(() => {
      setDebugInfo('');
    }, 4000);
  };

  useEffect(() => {
    return () => {
      if (debugTimeoutRef.current) {
        clearTimeout(debugTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioContextRef.current = new AudioContext();
        addDebugInfo(`Audio context created: ${audioContextRef.current.state}`);
        
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

    const loadVoices = () => {
      try {
        const availableVoices = window.speechSynthesis.getVoices();
        
        if (availableVoices.length > 0) {
          let voice = availableVoices.find(v => 
            (v.lang.includes('en-IN') || v.name.toLowerCase().includes('indian'))
          );
          
          if (!voice) {
            voice = availableVoices.find(v => v.lang.includes('en'));
          }
          
          if (!voice) {
            voice = availableVoices[0];
          }
          
          setSelectedVoice(voice);
          addDebugInfo(`Selected voice: ${voice.name} (${voice.lang})`);
          
          const voiceList = availableVoices.map(v => `${v.name} (${v.lang})`).join('\n');
          addDebugInfo(`Available voices (${availableVoices.length}):\n${voiceList}`);
        } else {
          addDebugInfo('No voices available yet');
        }
      } catch (e) {
        addDebugInfo(`Error loading voices: ${e}`);
      }
    };

    loadVoices();

    window.speechSynthesis.onvoiceschanged = loadVoices;

    unlockAudio();

    testSpeechSynthesis();

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

  const unlockAudio = () => {
    try {
      if (audioContextRef.current) {
        const oscillator = audioContextRef.current.createOscillator();
        const gainNode = audioContextRef.current.createGain();
        
        gainNode.gain.value = 0;
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContextRef.current.destination);
        oscillator.start(0);
        oscillator.stop(0.1);
        
        addDebugInfo(`Audio unlocking attempted: ${audioContextRef.current.state}`);
        
        audioContextRef.current.resume().then(() => {
          addDebugInfo(`Audio context resumed: ${audioContextRef.current.state}`);
        }).catch(err => {
          addDebugInfo(`Failed to resume audio context: ${err}`);
        });
      } else {
        addDebugInfo('No audio context available for unlocking');
      }
      
      const utterance = new SpeechSynthesisUtterance('');
      utterance.volume = 0;
      window.speechSynthesis.speak(utterance);
      
      addDebugInfo('Audio unlock attempted via silent utterance');
    } catch (e) {
      addDebugInfo(`Error unlocking audio: ${e}`);
    }
  };

  const testSpeechSynthesis = () => {
    try {
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance('Test');
      utterance.volume = 0.1;
      utterance.rate = speechRate;
      
      utterance.onstart = () => addDebugInfo('Test speech started');
      utterance.onend = () => addDebugInfo('Test speech completed');
      utterance.onerror = (e) => addDebugInfo(`Test speech error: ${e.error}`);
      
      window.speechSynthesis.speak(utterance);
      addDebugInfo('Test speech synthesis initiated');
    } catch (e) {
      addDebugInfo(`Speech synthesis test failed: ${e}`);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

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
        
        if (liveCallEnabled && !isSpeaking && !isProcessing) {
          setTimeout(() => {
            startRecognition();
          }, 500);
        }
      };

      recognition.current.onerror = (event: any) => {
        addDebugInfo(`Speech recognition error: ${event.error}`);
        
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
  
      if (liveCallEnabled && !isMuted) {
        setTimeout(async () => {
          try {
            await speakText(response);
          } catch (err) {
            addDebugInfo(`Error in delayed speech: ${err}`);
          }
        }, 300);
      } else {
        addDebugInfo('Speech synthesis skipped (muted or live call disabled)');
        if (liveCallEnabled) {
          setTimeout(() => {
            if (!isProcessing) startRecognition();
          }, 1000);
        }
      }
  
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
      
      if (liveCallEnabled && !isProcessing) {
        setTimeout(() => startRecognition(), 1000);
      }
    } finally {
      setLoading(false);
    }
  };

  const speakText = async (text: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        window.speechSynthesis.cancel();
        
        if (resumeTimerRef.current) {
          clearInterval(resumeTimerRef.current);
          resumeTimerRef.current = null;
        }
        
        setIsSpeaking(true);
        addDebugInfo('Starting speech synthesis for: ' + text.substring(0, 30) + '...');
        
        const chunks = splitTextIntoChunks(text, 100);
        addDebugInfo(`Text split into ${chunks.length} chunks for better speech synthesis`);
        
        let currentChunk = 0;
        const speakNextChunk = () => {
          if (currentChunk >= chunks.length) {
            addDebugInfo('All chunks spoken');
            setIsSpeaking(false);
            
            setTimeout(() => {
              if (liveCallEnabled && !isProcessing) {
                startRecognition();
              }
            }, 500);
            
            resolve();
            return;
          }
          
          const chunk = chunks[currentChunk];
          const utterance = new SpeechSynthesisUtterance(chunk);
          
          if (selectedVoice) {
            utterance.voice = selectedVoice;
          }
          
          utterance.lang = 'en-US';
          utterance.rate = speechRate;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;
          
          addDebugInfo(`Speaking chunk ${currentChunk + 1}/${chunks.length}: "${chunk.substring(0, 30)}..."`);
          
          utterance.onend = () => {
            addDebugInfo(`Chunk ${currentChunk + 1} complete`);
            currentChunk++;
            speakNextChunk();
          };
          
          utterance.onerror = (event) => {
            addDebugInfo(`Speech error on chunk ${currentChunk + 1}: ${event.error}`);
            currentChunk++;
            speakNextChunk();
          };
          
          window.speechSynthesis.speak(utterance);
          
          if (currentChunk === 0) {
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
          }
        };
        
        speakNextChunk();
        
      } catch (error: any) {
        addDebugInfo(`Error in speakText: ${error}`);
        setError(`Failed to speak: ${error.message}`);
        setIsSpeaking(false);
        
        if (liveCallEnabled && !isProcessing) {
          setTimeout(() => startRecognition(), 500);
        }
        
        reject(error);
      }
    });
  };

  const splitTextIntoChunks = (text: string, maxChunkLength = 100): string[] => {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const chunks: string[] = [];
    let currentChunk = '';
    
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > maxChunkLength && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += sentence;
      }
    }
    
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }
    
    if (chunks.length === 0) {
      for (let i = 0; i < text.length; i += maxChunkLength) {
        chunks.push(text.substring(i, i + maxChunkLength));
      }
    }
    
    return chunks;
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    addDebugInfo(`Audio ${!isMuted ? 'muted' : 'unmuted'}`);
    
    if (isSpeaking && !isMuted) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      
      if (liveCallEnabled && !isProcessing) {
        setTimeout(() => startRecognition(), 500);
      }
    }
  };

  const changeSpeechRate = (newRate: number) => {
    setSpeechRate(newRate);
    addDebugInfo(`Speech rate changed to ${newRate}`);
  };

  const toggleLiveCall = async () => {
    try {
      if (!liveCallEnabled) {
        setError(null);
        
        unlockAudio();
        
        try {
          const testUtterance = new SpeechSynthesisUtterance("Live call started");
          if (selectedVoice) {
            testUtterance.voice = selectedVoice;
          }
          testUtterance.rate = speechRate;
          testUtterance.onstart = () => addDebugInfo('Test speech started (audible)');
          testUtterance.onend = () => {
            addDebugInfo('Test speech ended (audible)');
            setTimeout(() => startRecognition(), 500);
          };
          testUtterance.onerror = (e) => addDebugInfo(`Test speech error: ${e.error}`);
          
          window.speechSynthesis.speak(testUtterance);
          addDebugInfo('Audible test speech initiated');
        } catch (e) {
          addDebugInfo(`Audible test speech failed: ${e}`);
          setTimeout(() => startRecognition(), 500);
        }
        
        setLiveCallEnabled(true);
        addDebugInfo('Live call enabled');
      } else {
        if (recognition.current) {
          try {
            recognition.current.stop();
          } catch (e) {
            addDebugInfo(`Error stopping recognition: ${e}`);
          }
        }
        
        window.speechSynthesis.cancel();
        
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

  const forceSpeak = () => {
    const testMessage = "This is a test message to verify that speech synthesis is working correctly. If you can hear this, the system is functioning properly.";
    addDebugInfo('Forcing test speech...');
    
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(testMessage);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    utterance.volume = 1.0;
    utterance.rate = speechRate;
    utterance.pitch = 1.0;
    
    utterance.onstart = () => addDebugInfo('Force test speech started');
    utterance.onend = () => addDebugInfo('Force test speech ended');
    utterance.onerror = (e) => addDebugInfo(`Force test speech error: ${e.error}`);
    
    window.speechSynthesis.speak(utterance);
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

        <div className="flex justify-center space-x-2 my-4">
          <span className="text-white">Speech Rate:</span>
          <button 
            onClick={() => changeSpeechRate(1.0)}
            className={`p-2 rounded ${speechRate === 1.0 ? 'bg-green-600' : 'bg-gray-600'} text-white`}
          >
            Normal
          </button>
          <button 
            onClick={() => changeSpeechRate(1.2)}
            className={`p-2 rounded ${speechRate === 1.2 ? 'bg-green-600' : 'bg-gray-600'} text-white`}
          >
            Fast
          </button>
          <button 
            onClick={() => changeSpeechRate(1.5)}
            className={`p-2 rounded ${speechRate === 1.5 ? 'bg-green-600' : 'bg-gray-600'} text-white`}
          >
            Faster
          </button>
        </div>
        
        {showDebug && (
          <div className="debug-panel bg-gray-800 text-green-400 p-4 rounded-md mb-4 overflow-auto max-h-40">
            <h3 className="text-white mb-2">Debug Info:</h3>
            <pre className="text-xs whitespace-pre-wrap">{debugInfo}</pre>
            <div className="flex space-x-2 mt-2">
              <button 
                onClick={forceSpeak}
                className="p-1 bg-blue-600 text-white text-xs rounded"
              >
                Force Test Speech
              </button>
            </div>
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