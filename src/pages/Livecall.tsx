// // import React, { useState, useEffect, useRef } from 'react';
// // import { supabase } from '../lib/supabase';
// // import { useAuth } from '../contexts/AuthContext';
// // import { getChatResponse } from '../lib/gemini';
// // import { Link } from 'react-router-dom';
// // import ChatMessage from '../components/ChatMessage';
// // import { ArrowLeft } from 'lucide-react';
// // import './Livecall.css';

// // export default function LiveCall() {
// //   const { user } = useAuth();
// //   const [message, setMessage] = useState('');
// //   const [chatHistory, setChatHistory] = useState<any[]>([]);
// //   const [loading, setLoading] = useState(false);
// //   const chatEndRef = useRef<HTMLDivElement>(null);
// //   const [isTyping, setIsTyping] = useState(false);
// //   const [error, setError] = useState<string | null>(null);
// //   const [liveCallEnabled, setLiveCallEnabled] = useState(false);
// //   const recognition = useRef<any>(null);
// //   const [transcript, setTranscript] = useState('');
// //   const [isActive, setIsActive] = useState(false);

// //   useEffect(() => {
// //     try {
// //       const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
// //       recognition.current = new SpeechRecognition();
// //       recognition.current.continuous = true;
// //       recognition.current.interimResults = true;
// //       recognition.current.lang = 'en-US';

// //       recognition.current.onstart = () => {
// //         setIsActive(true);
// //       };

// //       recognition.current.onresult = async (event: any) => {
// //         const currentTranscript = event.results[event.results.length - 1][0].transcript;
// //         setTranscript(currentTranscript);

// //         if (event.results[event.results.length - 1].isFinal) {
// //           await handleResponse(currentTranscript);
// //         }
// //       };

// //       recognition.current.onend = () => {
// //         if (liveCallEnabled) {
// //           recognition.current.start();
// //         }
// //       };

// //       recognition.current.onerror = (event: any) => {
// //         console.error('Speech recognition error:', event.error);
// //         setError(`Speech recognition error: ${event.error}`);
// //       };
// //     } catch (err) {
// //       console.error('Speech recognition not supported:', err);
// //       setError('Speech recognition is not supported in your browser');
// //     }

// //     return () => {
// //       if (recognition.current) {
// //         recognition.current.stop();
// //       }
// //       if (window.speechSynthesis) {
// //         window.speechSynthesis.cancel();
// //       }
// //     };
// //   }, [liveCallEnabled]);

// //   useEffect(() => {
// //     chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
// //   }, [chatHistory]);

// //   const handleResponse = async (text: string) => {
// //     if (!text.trim() || loading || !user?.id) return;

// //     setLoading(true);
// //     setError(null);
// //     setIsTyping(true);
    
// //     try {
// //       const tempId = Date.now().toString();
// //       setChatHistory(prev => [...prev, { 
// //         id: tempId, 
// //         user_id: user.id, 
// //         message: text,
// //         isUser: true,
// //         created_at: new Date().toISOString() 
// //       }]);

// //       const response = await getChatResponse(text, '');

// //       setChatHistory(prev => [...prev, { 
// //         id: Date.now().toString(),
// //         user_id: user.id, 
// //         message: response,
// //         isUser: false,
// //         created_at: new Date().toISOString() 
// //       }]);

// //       if (liveCallEnabled) {
// //         const utterance = new SpeechSynthesisUtterance(response);
// //         utterance.lang = 'en-US';
// //         utterance.rate = 1.0;
// //         utterance.pitch = 1.0;
// //         utterance.volume = 1.0;

// //         utterance.onend = () => {
// //           console.log('Finished speaking');
// //           if (liveCallEnabled) {
// //             recognition.current?.start();
// //           }
// //         };

// //         window.speechSynthesis.cancel();
// //         window.speechSynthesis.speak(utterance);
// //       }

// //       await supabase.from('chat_history').insert([{
// //         user_id: user.id,
// //         message: text,
// //         response
// //       }]);

// //     } catch (error: any) {
// //       console.error('Error:', error);
// //       setError(error.message || 'Error processing message');
// //     } finally {
// //       setLoading(false);
// //       setIsTyping(false);
// //       setMessage('');
// //     }
// //   };

// //   const toggleLiveCall = () => {
// //     try {
// //       if (!liveCallEnabled) {
// //         recognition.current?.start();
// //         setLiveCallEnabled(true);
// //       } else {
// //         recognition.current?.stop();
// //         window.speechSynthesis?.cancel();
// //         setLiveCallEnabled(false);
// //       }
// //     } catch (err) {
// //       console.error('Error toggling live call:', err);
// //       setError('Error toggling live call');
// //       setLiveCallEnabled(false);
// //     }
// //   };

// //   return (
// //     <div className="livecall-container">
// //       <div className="header">
// //         <Link to="/chat" className="back-button"><ArrowLeft size={20} /></Link>
// //         <h1>Voice Assistant</h1>
// //       </div>
// //       <div className="globe-container">
// //         <div className={`globe ${isActive ? 'listening' : ''}`}></div>
// //         <div className="globe-ring"></div>
// //         {isActive && (
// //           <>
// //             <div className="waveform"></div>
// //             <div className="waveform" style={{ animationDelay: '0.5s' }}></div>
// //             <div className="waveform" style={{ animationDelay: '1s' }}></div>
// //           </>
// //         )}
// //       </div>
// //       <div className="transcript-container">
// //         <p>{transcript || "Speak something..."}</p>
// //       </div>
// //       <div className="chat-history">
// //         {chatHistory.map((chat, index) => (
// //           <div key={index} className="chat-message">
// //             <p className="user-message">You: {chat.message}</p>
// //             <p className="ai-response">AI: {chat.response}</p>
// //           </div>
// //         ))}
// //       </div>
// //       {error && (
// //         <div className="error-message">
// //           {error}
// //         </div>
// //       )}
// //       <div ref={chatEndRef}></div>
// //       <div className="footer">
// //         <button onClick={toggleLiveCall} disabled={loading} className={`toggle-button ${liveCallEnabled ? 'stop' : 'start'}`}>
// //           {loading ? 'Processing...' : liveCallEnabled ? 'Stop Live Call' : 'Start Live Call'}
// //         </button>
// //       </div>
// //     </div>
// //   );
// // }

// import React, { useState, useEffect, useRef } from 'react';
// import { supabase } from '../lib/supabase';
// import { useAuth } from '../contexts/AuthContext';
// import { getChatResponse } from '../lib/gemini';
// import { Link } from 'react-router-dom';
// import ChatMessage from '../components/ChatMessage';
// import { ArrowLeft } from 'lucide-react';
// import './Livecall.css';

// // Declare global types for SpeechRecognition
// declare global {
//   interface Window {
//     SpeechRecognition: any;
//     webkitSpeechRecognition: any;
//     speechSynthesis: SpeechSynthesis;
//   }
// }

// export default function LiveCall() {
//   const { user } = useAuth();
//   const [message, setMessage] = useState('');
//   const [chatHistory, setChatHistory] = useState<any[]>([]);
//   const [loading, setLoading] = useState(false);
//   const chatEndRef = useRef<HTMLDivElement>(null);
//   const [isTyping, setIsTyping] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [liveCallEnabled, setLiveCallEnabled] = useState(false);
//   const recognition = useRef<any>(null);
//   const [transcript, setTranscript] = useState('');
//   const [isActive, setIsActive] = useState(false);

//   // Initialize speech recognition and synthesis
//   useEffect(() => {
//     // Check if SpeechRecognition is supported
//     if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
//       setError('Speech recognition is not supported in your browser.');
//       return;
//     }

//     try {
//       const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
//       recognition.current = new SpeechRecognition();
//       recognition.current.continuous = true;
//       recognition.current.interimResults = true;
//       recognition.current.lang = 'en-US';

//       // Event handler for start of speech recognition
//       recognition.current.onstart = () => {
//         setIsActive(true);
//         console.log('Speech recognition started');
//       };

//       // Event handler for speech recognition results
//       recognition.current.onresult = async (event: any) => {
//         const currentTranscript = event.results[event.results.length - 1][0].transcript;
//         setTranscript(currentTranscript);

//         // If the result is final, process the message
//         if (event.results[event.results.length - 1].isFinal) {
//           await handleResponse(currentTranscript);
//         }
//       };

//       // Event handler for end of speech recognition
//       recognition.current.onend = () => {
//         setIsActive(false);
//         console.log('Speech recognition ended');
//         if (liveCallEnabled) {
//           recognition.current.start();
//         }
//       };

//       // Event handler for speech recognition errors
//       recognition.current.onerror = (event: any) => {
//         console.error('Speech recognition error:', event.error);
//         setError(`Speech recognition error: ${event.error}`);
//         setIsActive(false);
//       };
//     } catch (err) {
//       console.error('Speech recognition initialization error:', err);
//       setError('Failed to initialize speech recognition.');
//     }

//     // Cleanup function
//     return () => {
//       if (recognition.current) {
//         recognition.current.stop();
//         console.log('Speech recognition stopped');
//       }
//       if (window.speechSynthesis) {
//         window.speechSynthesis.cancel();
//         console.log('Speech synthesis cancelled');
//       }
//     };
//   }, [liveCallEnabled]);

//   // Scroll to bottom of chat history
//   useEffect(() => {
//     chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//   }, [chatHistory]);

//   // Handle response from AI
//   const handleResponse = async (text: string) => {
//     if (!text.trim() || loading || !user?.id) return;

//     setLoading(true);
//     setError(null);
//     setIsTyping(true);
    
//     try {
//       // Add user message to chat history
//       const tempId = Date.now().toString();
//       setChatHistory(prev => [...prev, { 
//         id: tempId, 
//         user_id: user.id, 
//         message: text,
//         isUser: true,
//         created_at: new Date().toISOString() 
//       }]);

//       // Get response from Gemini API
//       const response = await getChatResponse(text, '');

//       // Add AI response to chat history
//       setChatHistory(prev => [...prev, { 
//         id: Date.now().toString(),
//         user_id: user.id, 
//         message: response,
//         isUser: false,
//         created_at: new Date().toISOString() 
//       }]);

//       // Speak the response
//       if (liveCallEnabled && window.speechSynthesis) {
//         const utterance = new SpeechSynthesisUtterance(response);
//         utterance.lang = 'en-US';
//         utterance.rate = 1.0;
//         utterance.pitch = 1.0;
//         utterance.volume = 1.0;

//         utterance.onstart = () => {
//           console.log('Speech synthesis started');
//         };

//         utterance.onend = () => {
//           console.log('Speech synthesis finished');
//           if (liveCallEnabled) {
//             recognition.current?.start();
//           }
//         };

//         utterance.onerror = (event: any) => {
//           console.error('Speech synthesis error:', event);
//           setError('Error speaking response');
//         };

//         window.speechSynthesis.cancel();
//         window.speechSynthesis.speak(utterance);
//       }

//       // Save to database
//       await supabase.from('chat_history').insert([{
//         user_id: user.id,
//         message: text,
//         response
//       }]);

//     } catch (error: any) {
//       console.error('Error:', error);
//       setError(error.message || 'Error processing message');
//     } finally {
//       setLoading(false);
//       setIsTyping(false);
//       setMessage('');
//     }
//   };

//   // Toggle live call
//   const toggleLiveCall = () => {
//     try {
//       if (!liveCallEnabled) {
//         recognition.current?.start();
//         setLiveCallEnabled(true);
//         console.log('Live call enabled');
//       } else {
//         recognition.current?.stop();
//         window.speechSynthesis?.cancel();
//         setLiveCallEnabled(false);
//         console.log('Live call disabled');
//       }
//     } catch (err) {
//       console.error('Error toggling live call:', err);
//       setError('Error toggling live call');
//       setLiveCallEnabled(false);
//     }
//   };

//   return (
//     <div className="livecall-container">
//       <div className="header">
//         <Link to="/chat" className="back-button"><ArrowLeft size={20} /></Link>
//         <h1>Voice Assistant</h1>
//       </div>
//       <div className="globe-container">
//         <div className={`globe ${isActive ? 'listening' : ''}`}></div>
//         <div className="globe-ring"></div>
//         {isActive && (
//           <>
//             <div className="waveform"></div>
//             <div className="waveform" style={{ animationDelay: '0.5s' }}></div>
//             <div className="waveform" style={{ animationDelay: '1s' }}></div>
//           </>
//         )}
//       </div>
//       <div className="transcript-container">
//         <p>{transcript || "Speak something..."}</p>
//       </div>
//       <div className="chat-history">
//         {chatHistory.map((chat, index) => (
//           <div key={index} className="chat-message">
//             <p className="user-message">You: {chat.message}</p>
//             <p className="ai-response">AI: {chat.response}</p>
//           </div>
//         ))}
//       </div>
//       {error && (
//         <div className="error-message">
//           {error}
//         </div>
//       )}
//       <div ref={chatEndRef}></div>
//       <div className="footer">
//         <button onClick={toggleLiveCall} disabled={loading} className={`toggle-button ${liveCallEnabled ? 'stop' : 'start'}`}>
//           {loading ? 'Processing...' : liveCallEnabled ? 'Stop Live Call' : 'Start Live Call'}
//         </button>
//       </div>
//     </div>
//   );
// }

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { getChatResponse } from '../lib/gemini';
import { Link } from 'react-router-dom';
import ChatMessage from '../components/ChatMessage';
import { ArrowLeft } from 'lucide-react';
import './Livecall.css';

// Declare global types for SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
    speechSynthesis: SpeechSynthesis;
  }
}

export default function LiveCall() {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveCallEnabled, setLiveCallEnabled] = useState(false);
  const recognition = useRef<any>(null);
  const [transcript, setTranscript] = useState('');
  const [isActive, setIsActive] = useState(false);

  // Initialize speech recognition and synthesis
  useEffect(() => {
    // Check if SpeechRecognition is supported
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

      // Event handler for start of speech recognition
      recognition.current.onstart = () => {
        setIsActive(true);
        console.log('Speech recognition started');
      };

      // Event handler for speech recognition results
      recognition.current.onresult = async (event: any) => {
        const currentTranscript = event.results[event.results.length - 1][0].transcript;
        setTranscript(currentTranscript);
        console.log('Transcript:', currentTranscript);

        // If the result is final, process the message
        if (event.results[event.results.length - 1].isFinal) {
          await handleResponse(currentTranscript);
        }
      };

      // Event handler for end of speech recognition
      recognition.current.onend = () => {
        setIsActive(false);
        console.log('Speech recognition ended');
        if (liveCallEnabled) {
          recognition.current.start();
        }
      };

      // Event handler for speech recognition errors
      recognition.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setError(`Speech recognition error: ${event.error}`);
        setIsActive(false);
      };

      // Start speech recognition when liveCallEnabled is true
      if (liveCallEnabled) {
        recognition.current.start();
        console.log('Speech recognition started (liveCallEnabled)');
      }
    } catch (err) {
      console.error('Speech recognition initialization error:', err);
      setError('Failed to initialize speech recognition.');
    }

    // Cleanup function
    return () => {
      if (recognition.current) {
        recognition.current.stop();
        console.log('Speech recognition stopped');
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        console.log('Speech synthesis cancelled');
      }
    };
  }, [liveCallEnabled]); // Depend on liveCallEnabled

  // Scroll to bottom of chat history
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Handle response from AI
  const handleResponse = async (text: string) => {
    if (!text.trim() || loading || !user?.id) return;

    setLoading(true);
    setError(null);
    setIsTyping(true);
    
    try {
      // Add user message to chat history
      const tempId = Date.now().toString();
      setChatHistory(prev => [...prev, { 
        id: tempId, 
        user_id: user.id, 
        message: text,
        isUser: true,
        created_at: new Date().toISOString() 
      }]);

      // Get response from Gemini API
      const response = await getChatResponse(text, '');

      // Add AI response to chat history
      setChatHistory(prev => [...prev, { 
        id: Date.now().toString(),
        user_id: user.id, 
        message: response,
        isUser: false,
        created_at: new Date().toISOString() 
      }]);

      // Speak the response
      if (liveCallEnabled && window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(response);
        utterance.lang = 'en-US';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        utterance.onstart = () => {
          console.log('Speech synthesis started');
        };

        utterance.onend = () => {
          console.log('Speech synthesis finished');
          if (liveCallEnabled) {
            recognition.current?.start();
          }
        };

        utterance.onerror = (event: any) => {
          console.error('Speech synthesis error:', event);
          setError('Error speaking response');
        };

        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      }

      // Save to database
      await supabase.from('chat_history').insert([{
        user_id: user.id,
        message: text,
        response
      }]);

    } catch (error: any) {
      console.error('Error:', error);
      setError(error.message || 'Error processing message');
    } finally {
      setLoading(false);
      setIsTyping(false);
      setMessage('');
    }
  };

  // Toggle live call
  const toggleLiveCall = () => {
    try {
      if (!liveCallEnabled) {
        recognition.current?.start();
        setLiveCallEnabled(true);
        console.log('Live call enabled');
      } else {
        recognition.current?.stop();
        window.speechSynthesis?.cancel();
        setLiveCallEnabled(false);
        console.log('Live call disabled');
      }
    } catch (err) {
      console.error('Error toggling live call:', err);
      setError('Error toggling live call');
      setLiveCallEnabled(false);
    }
  };

  return (
    <div className="livecall-container">
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
      </div>
      <div className="chat-history">
        {chatHistory.map((chat, index) => (
          <div key={index} className="chat-message">
            <p className="user-message">You: {chat.message}</p>
            <p className="ai-response">AI: {chat.response}</p>
          </div>
        ))}
      </div>
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      <div ref={chatEndRef}></div>
      <div className="footer">
        <button onClick={toggleLiveCall} disabled={loading} className={`toggle-button ${liveCallEnabled ? 'stop' : 'start'}`}>
          {loading ? 'Processing...' : liveCallEnabled ? 'Stop Live Call' : 'Start Live Call'}
        </button>
      </div>
    </div>
  );
}