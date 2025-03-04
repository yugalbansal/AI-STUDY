import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { getChatResponse } from '../lib/gemini';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import './Livecall.css';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
    speechSynthesis: SpeechSynthesis;
    AudioContext: any;
    webkitAudioContext: any;
  }
}

const loadVoices = () => {
  return new Promise<SpeechSynthesisVoice[]>((resolve) => {
    const checkVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        resolve(voices);
      } else {
        // Add a timeout as fallback in case onvoiceschanged doesn't fire
        setTimeout(checkVoices, 100);
      }
    };
    
    window.speechSynthesis.onvoiceschanged = () => {
      resolve(window.speechSynthesis.getVoices());
    };
    
    // Initial check in case voices are already loaded
    checkVoices();
  });
};

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
  
  // Add new refs and state for audio analysis
  const audioContext = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const audioSource = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioStream = useRef<MediaStream | null>(null);
  const [voiceThreshold, setVoiceThreshold] = useState<number>(15); // Threshold for voice detection
  const [systemAudioLevel, setSystemAudioLevel] = useState<number>(0);
  const audioMonitoringRef = useRef<number | null>(null);

  // Preload voices and ensure audio capability 
  useEffect(() => {
    // Force load voices immediately
    speechSynthesisVoiceTest();
    
    // Return cleanup function
    return () => {
      cleanupAudio();
    };
  }, []);

  // Test speech synthesis to ensure it's working
  const speechSynthesisVoiceTest = async () => {
    try {
      // Force unlock audio on page load
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const testContext = new AudioContext();
      testContext.resume().then(() => testContext.close());
      
      // Force load voices
      await loadVoices();
      
      // Test speech synthesis with a silent utterance
      const testUtterance = new SpeechSynthesisUtterance('');
      testUtterance.volume = 0;
      testUtterance.onend = () => console.log('Speech synthesis test successful');
      testUtterance.onerror = (e) => console.error('Speech synthesis test failed:', e);
      
      // Chrome sometimes needs this hack to initialize speech synthesis properly
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(testUtterance);
    } catch (err) {
      console.error('Speech synthesis test error:', err);
    }
  };

  // Initialize audio analyzer for system vs microphone differentiation
  const initAudioAnalyzer = async () => {
    try {
      if (!audioContext.current) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContext.current = new AudioContext();
        analyser.current = audioContext.current.createAnalyser();
        analyser.current.fftSize = 1024;
        analyser.current.smoothingTimeConstant = 0.2;
        
        // Ensure audio context is running
        await audioContext.current.resume();
        console.log('Audio context initialized');
      }
    } catch (err) {
      console.error('Failed to initialize audio analyzer:', err);
      setError('Audio analyzer initialization failed');
    }
  };

  // Initialize speech recognition with improved settings
  useEffect(() => {
    if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      setError('Speech recognition is not supported in your browser.');
      return;
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = true;
      recognition.current.interimResults = true;
      recognition.current.lang = 'en-US';

      // Adjusted noise cancellation settings - more balanced
      recognition.current.maxAlternatives = 2; // Increased from 1 to get alternative interpretations
      
      // Lower confidence threshold for quieter speakers
      const confidenceThreshold = 0.5; // Lowered from 0.7

      recognition.current.onstart = () => {
        setIsActive(true);
        console.log('Speech recognition started');
      };

      recognition.current.onresult = async (event: any) => {
        if (isSpeaking || isProcessing) return;

        const result = event.results[event.results.length - 1];
        const transcript = result[0].transcript;
        const confidence = result[0].confidence;

        // Check if this is likely system audio by examining audio levels
        const isLikelySystemAudio = systemAudioLevel > 0 && 
                                   audioSource.current && 
                                   await isAudioFromSystem();

        if (isLikelySystemAudio) {
          console.log('Ignoring likely system audio feedback');
          return;
        }

        // Lower confidence threshold for detection
        if (confidence > confidenceThreshold) {
          setTranscript(transcript);
          console.log('Transcript:', transcript, 'Confidence:', confidence);

          if (result.isFinal) {
            recognition.current.stop(); // Stop recognition before processing
            setIsProcessing(true);
            await handleResponse(transcript);
            setIsProcessing(false);
          }
        }
      };

      recognition.current.onend = () => {
        setIsActive(false);
        console.log('Speech recognition ended');
        // Only restart if enabled and not speaking/processing
        if (liveCallEnabled && !isSpeaking && !isProcessing) {
          setTimeout(() => {
            startRecognition(); // Use our custom start function
          }, 500); // Slightly increased delay before restarting
        }
      };

      recognition.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        // Don't show error for "no-speech" as it's common and not critical
        if (event.error !== 'no-speech') {
          setError(`Speech recognition error: ${event.error}`);
        }
        setIsActive(false);
      };

    } catch (err) {
      console.error('Speech recognition initialization error:', err);
      setError('Failed to initialize speech recognition.');
    }

    return () => {
      cleanupAudio();
    };
  }, [liveCallEnabled, isSpeaking, isProcessing]);

  // Function to check if audio is likely from the system
  const isAudioFromSystem = async (): Promise<boolean> => {
    if (!analyser.current) return false;
    
    const dataArray = new Uint8Array(analyser.current.frequencyBinCount);
    analyser.current.getByteFrequencyData(dataArray);
    
    // Calculate current audio level
    const currentLevel = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    
    // If system is speaking and current audio profile is similar to system audio
    // It's likely the microphone picking up system audio
    if (isSpeaking && systemAudioLevel > 0) {
      const similarity = Math.abs(currentLevel - systemAudioLevel) / systemAudioLevel;
      return similarity < 0.3; // If profiles are within 30% similarity
    }
    
    return false;
  };

  // Custom start recognition function that includes audio setup
  const startRecognition = async () => {
    if (!recognition.current || isProcessing || isSpeaking) return;
    
    try {
      // Initialize audio analyzer if not already done
      await initAudioAnalyzer();
      
      // Get microphone access for audio analysis
      if (!audioStream.current) {
        audioStream.current = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: false, // Turn off auto gain to better detect quiet speech
          } 
        });
        
        if (audioContext.current && analyser.current) {
          // Disconnect previous source if exists
          if (audioSource.current) {
            audioSource.current.disconnect();
          }
          
          // Connect microphone to analyzer
          audioSource.current = audioContext.current.createMediaStreamSource(audioStream.current);
          audioSource.current.connect(analyser.current);
          
          // Start monitoring audio levels
          startAudioMonitoring();
        }
      }
      
      // Now start recognition
      recognition.current.start();
      setIsActive(true);
    } catch (err) {
      console.error('Failed to start recognition:', err);
      setError('Failed to access microphone. Please ensure microphone permissions are granted.');
    }
  };

  // Monitor audio levels to detect system vs human speech
  const startAudioMonitoring = () => {
    if (!analyser.current) return;
    
    const bufferLength = analyser.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const checkAudioLevels = () => {
      if (!analyser.current) return;
      
      analyser.current.getByteFrequencyData(dataArray);
      
      // Calculate average volume
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      
      // If system is speaking, record audio profile for later comparison
      if (isSpeaking && average > 5) {
        setSystemAudioLevel(average);
      }
      
      // Request next frame
      audioMonitoringRef.current = requestAnimationFrame(checkAudioLevels);
    };
    
    audioMonitoringRef.current = requestAnimationFrame(checkAudioLevels);
  };

  // Cleanup audio resources
  const cleanupAudio = () => {
    // Cancel audio monitoring
    if (audioMonitoringRef.current) {
      cancelAnimationFrame(audioMonitoringRef.current);
      audioMonitoringRef.current = null;
    }
    
    // Disconnect and close audio sources
    if (audioSource.current) {
      audioSource.current.disconnect();
      audioSource.current = null;
    }
    
    // Stop media stream tracks
    if (audioStream.current) {
      audioStream.current.getTracks().forEach(track => track.stop());
      audioStream.current = null;
    }
    
    // Close audio context
    if (audioContext.current) {
      audioContext.current.close();
      audioContext.current = null;
    }
    
    // Stop speech recognition
    if (recognition.current) {
      recognition.current.stop();
    }
    
    // Cancel any ongoing speech
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
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
  
      console.log('Getting response from API...');
      const response = await getChatResponse(text, '');
      console.log('API Response:', response);
  
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
  
      // Handle speech synthesis with improved reliability
      if (liveCallEnabled && window.speechSynthesis) {
        try {
          setIsSpeaking(true);
  
          // Ensure audio context is resumed (browsers often require this)
          if (audioContext.current && audioContext.current.state === 'suspended') {
            await audioContext.current.resume();
          }
  
          const preferredVoice = voices.find(voice =>
            voice.lang.includes('en') &&
            (voice.name.includes('Natural') || voice.name.includes('Premium') || voice.name.includes('Enhanced'))
          ) || voices.find(voice => voice.lang.includes('en-US')) || voices.find(voice => voice.lang.includes('en'));
  
          const utterance = new SpeechSynthesisUtterance(response);
  
          if (preferredVoice) {
            utterance.voice = preferredVoice;
            console.log('Using voice:', preferredVoice.name);
          } else {
            console.warn('No suitable voices found');
          }
  
          utterance.lang = 'en-US';
          utterance.rate = 1.0;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;
  
          // Cancel any ongoing speech
          window.speechSynthesis.cancel();
  
          utterance.onstart = () => {
            console.log('Started speaking');
            setIsSpeaking(true);
          };
  
          utterance.onend = () => {
            console.log('Finished speaking');
            setIsSpeaking(false);
            // Resume listening after speech ends with delay
            setTimeout(() => {
              if (liveCallEnabled && !isProcessing) {
                startRecognition();
              }
            }, 1000);
          };
  
          utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event);
            setError('Error speaking response');
            setIsSpeaking(false);
            if (liveCallEnabled && !isProcessing) {
              startRecognition();
            }
          };
  
          // Ensure audio context is running before speaking
          if (audioContext.current && audioContext.current.state === 'suspended') {
            try {
              await audioContext.current.resume();
            } catch (audioContextError) {
              console.error('Error resuming audio context:', audioContextError);
              setError('Error resuming audio context');
              setIsSpeaking(false);
              if (liveCallEnabled && !isProcessing) {
                startRecognition();
              }
              return; // Exit the function if audio context cannot be resumed
            }
          }
  
          window.speechSynthesis.speak(utterance);
        } catch (speechError: any) {
          console.error('Speech synthesis error:', speechError);
          setError(`Error with speech synthesis: ${speechError.message}`);
          setIsSpeaking(false);
          if (liveCallEnabled && !isProcessing) {
            startRecognition();
          }
        }
      }
  
      await supabase.from('chat_history').insert([{
        user_id: user.id,
        message: text,
        response
      }]);
  
    } catch (error: any) {
      console.error('Error in handleResponse:', error);
      setError(error.message || 'Error processing message');
      setIsSpeaking(false);
      if (liveCallEnabled && !isProcessing) {
        startRecognition();
      }
    } finally {
      setLoading(false);
    }
  };

  // Improved toggle function with audio context handling
  const toggleLiveCall = async () => {
    try {
      if (!liveCallEnabled) {
        // Unlock audio on user interaction 
        try {
          // Initialize the audio analyzer
          await initAudioAnalyzer();
          
          // Chrome requires user interaction to allow audio
          if (audioContext.current) {
            await audioContext.current.resume();
          }
          
          // Reset state
          setSystemAudioLevel(0);
          setError(null);
          
          // Force a test of speech synthesis to ensure it's working
          await speechSynthesisVoiceTest();
          
          // Start recognition with our custom function
          await startRecognition();
          
          setLiveCallEnabled(true);
          console.log('Live call enabled');
        } catch (initError) {
          console.error('Error initializing audio:', initError);
          setError('Failed to initialize audio. Please ensure you have granted microphone permissions.');
          return;
        }
      } else {
        // Clean up all audio resources
        cleanupAudio();
        
        setIsSpeaking(false);
        setIsActive(false);
        setLiveCallEnabled(false);
        console.log('Live call disabled');
      }
    } catch (err) {
      console.error('Error toggling live call:', err);
      setError('Error toggling live call. Please refresh the page and try again.');
      cleanupAudio();
      setLiveCallEnabled(false);
      setIsActive(false);
    }
  };

  // Scroll to bottom when chat updates
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  return (
    <div className="livecall-container">
      <div className="content-wrapper">
        <div className="header">
          <Link to="/chat" className="back-button"><ArrowLeft size={20} /></Link>
          <h1>Voice Assistant</h1>
        </div>
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
          {isSpeaking && <p className="speaking">Speaking...</p>}
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