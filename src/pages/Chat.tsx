// // import React, { useState, useEffect, useRef } from 'react';
// // import { supabase } from '../lib/supabase';
// // import { useAuth } from '../contexts/AuthContext';
// // import { getChatResponse } from '../lib/gemini';
// // import { Send } from 'lucide-react';
// // import ChatMessage from '../components/ChatMessage';

// // export default function Chat() {
// //   const { user } = useAuth();
// //   const [message, setMessage] = useState('');
// //   const [chatHistory, setChatHistory] = useState<any[]>([]);
// //   const [loading, setLoading] = useState(false);
// //   const [initialLoading, setInitialLoading] = useState(true);
// //   const chatEndRef = useRef<HTMLDivElement>(null);
// //   const [isTyping, setIsTyping] = useState(false);
// //   const [error, setError] = useState<string | null>(null);

// //   useEffect(() => {
// //     if (user?.id) {
// //       // Ensure user exists in users table before fetching chat history
// //       ensureUserExists().then(() => {
// //         fetchChatHistory();
// //       });
// //     } else {
// //       setInitialLoading(false);
// //     }
// //   }, [user]);

// //   useEffect(() => {
// //     chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
// //   }, [chatHistory, isTyping]);

// //   async function ensureUserExists() {
// //     if (!user?.id) return;
    
// //     try {
// //       // Check if user exists in users table
// //       const { data, error } = await supabase
// //         .from('users')
// //         .select('id')
// //         .eq('id', user.id)
// //         .single();
        
// //       if (error && error.code === 'PGRST116') {
// //         // User doesn't exist, create them
// //         const { error: insertError } = await supabase
// //           .from('users')
// //           .insert({
// //             id: user.id,
// //             email: user.email,
// //             role: user.email === 'studyai.platform@gmail.com' ? 'admin' : 'user',
// //             last_seen: new Date().toISOString()
// //           });
          
// //         if (insertError) {
// //           console.error('Error creating user record:', insertError);
// //         }
// //       }
// //     } catch (error) {
// //       console.error('Error ensuring user exists:', error);
// //     }
// //   }

// //   async function fetchChatHistory() {
// //     try {
// //       setInitialLoading(true);
// //       const { data, error } = await supabase
// //         .from('chat_history')
// //         .select('*')
// //         .eq('user_id', user?.id)
// //         .order('created_at', { ascending: true });

// //       if (error) {
// //         console.error('Error fetching chat history:', error);
// //         throw error;
// //       }
      
// //       setChatHistory(data || []);
// //     } catch (error) {
// //       console.error('Error fetching chat history:', error);
// //       setError('Failed to load chat history. Please try refreshing the page.');
// //     } finally {
// //       setInitialLoading(false);
// //     }
// //   }

// //   async function handleSubmit(e?: React.FormEvent) {
// //     e?.preventDefault();
// //     if (!message.trim() || loading || !user?.id) return;

// //     setLoading(true);
// //     setError(null);
// //     const userMessage = message;
// //     setMessage('');
    
// //     // Optimistically add user message to chat
// //     const tempId = Date.now().toString();
// //     setChatHistory(prev => [...prev, { 
// //       id: tempId, 
// //       user_id: user.id, 
// //       message: userMessage, 
// //       response: '', 
// //       created_at: new Date().toISOString() 
// //     }]);
    
// //     setIsTyping(true);

// //     try {
// //       // Ensure user exists in users table before adding chat
// //       await ensureUserExists();
      
// //       // Fetch documents for context
// //       const { data: documents, error: docError } = await supabase
// //         .from('documents')
// //         .select('content')
// //         .eq('user_id', user?.id);

// //       if (docError) {
// //         console.error('Error fetching documents:', docError);
// //       }

// //       const context = documents?.map(doc => doc.content).join('\n') || '';
      
// //       // Get response from Gemini API
// //       const response = await getChatResponse(userMessage, context);

// //       // Save to database
// //       const { data, error } = await supabase
// //         .from('chat_history')
// //         .insert([
// //           {
// //             user_id: user?.id,
// //             message: userMessage,
// //             response,
// //           },
// //         ])
// //         .select();

// //       if (error) {
// //         console.error('Error saving chat:', error);
// //         throw error;
// //       }

// //       // Remove temporary message and add the real one from the database
// //       setChatHistory(prev => {
// //         const filtered = prev.filter(item => item.id !== tempId);
// //         return [...filtered, ...(data || [])];
// //       });
// //     } catch (error: any) {
// //       console.error('Error processing message:', error);
// //       setError(`Failed to get response: ${error.message || 'Unknown error'}`);
      
// //       // Remove the temporary message if there was an error
// //       setChatHistory(prev => prev.filter(item => item.id !== tempId));
// //     } finally {
// //       setLoading(false);
// //       setIsTyping(false);
// //     }
// //   }

// //   const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
// //     if (e.key === 'Enter' && !e.shiftKey) {
// //       e.preventDefault();
// //       handleSubmit();
// //     }
// //   };

// //   if (initialLoading) {
// //     return (
// //       <div className="flex justify-center items-center h-64">
// //         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
// //       </div>
// //     );
// //   }

// //   return (
// //     <div className="max-w-4xl mx-auto h-[calc(100vh-4rem)]">
// //       <div className="flex flex-col h-full bg-white">
// //         <div className="flex-1 overflow-y-auto py-4">
// //           {chatHistory.length === 0 ? (
// //             <div className="flex items-center justify-center h-full">
// //               <div className="text-center p-8 max-w-md">
// //                 <h2 className="text-xl font-semibold text-gray-700 mb-2">Welcome to AI Chat</h2>
// //                 <p className="text-gray-500 mb-4">
// //                   Ask questions about your documents or any topic you'd like to learn about.
// //                 </p>
// //               </div>
// //             </div>
// //           ) : (
// //             chatHistory.map((chat, index) => (
// //               <div key={chat.id || index}>
// //                 <ChatMessage content={chat.message} isUser={true} />
// //                 <ChatMessage content={chat.response} isUser={false} />
// //               </div>
// //             ))
// //           )}
// //           {isTyping && <ChatMessage content="" isUser={false} isTyping={true} />}
// //           {error && (
// //             <div className="mx-4 p-4 bg-red-50 text-red-700 rounded-md mb-4">
// //               {error}
// //             </div>
// //           )}
// //           <div ref={chatEndRef} />
// //         </div>

// //         <div className="border-t p-4">
// //           <form onSubmit={handleSubmit} className="flex space-x-4">
// //             <textarea
// //               value={message}
// //               onChange={(e) => setMessage(e.target.value)}
// //               onKeyPress={handleKeyPress}
// //               placeholder="Ask a question..."
// //               rows={1}
// //               className="flex-1 resize-none rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 min-h-[2.5rem] max-h-32"
// //               disabled={loading}
// //               style={{
// //                 height: 'auto',
// //                 minHeight: '2.5rem',
// //                 maxHeight: '8rem',
// //               }}
// //             />
// //             <button
// //               type="submit"
// //               disabled={loading || !message.trim()}
// //               className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed h-10 self-end transition-colors"
// //             >
// //               {loading ? (
// //                 <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
// //               ) : (
// //                 <Send className="h-5 w-5" />
// //               )}
// //             </button>
// //           </form>
// //         </div>
// //       </div>
// //     </div>
// //   );
// // }
// import React, { useState, useEffect, useRef } from 'react';
// import { supabase } from '../lib/supabase';
// import { useAuth } from '../contexts/AuthContext';
// import { getChatResponse } from '../lib/gemini';
// import { Send } from 'lucide-react';
// import ChatMessage from '../components/ChatMessage';

// export default function Chat() {
//   const { user } = useAuth();
//   const [message, setMessage] = useState('');
//   const [chatHistory, setChatHistory] = useState<any[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [initialLoading, setInitialLoading] = useState(true);
//   const chatEndRef = useRef<HTMLDivElement>(null);
//   const [isTyping, setIsTyping] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [liveCallEnabled, setLiveCallEnabled] = useState(false);

//   const toggleLiveCall = () => {
//     setLiveCallEnabled(!liveCallEnabled);
//     if (!liveCallEnabled) {
//       startContinuousSpeechRecognition();
//     } else {
//       stopContinuousSpeechRecognition();
//     }
//   };

//   useEffect(() => {
//     if (user?.id) {
//       // Ensure user exists in users table before fetching chat history
//       ensureUserExists().then(() => {
//         fetchChatHistory();
//       });
//     } else {
//       setInitialLoading(false);
//     }
//   }, [user]);

//   useEffect(() => {
//     chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//   }, [chatHistory, isTyping]);

//   async function ensureUserExists() {
//     if (!user?.id) return;
    
//     try {
//       // Check if user exists in users table
//       const { data, error } = await supabase
//         .from('users')
//         .select('id')
//         .eq('id', user.id)
//         .single();
        
//       if (error && error.code === 'PGRST116') {
//         // User doesn't exist, create them
//         const { error: insertError } = await supabase
//           .from('users')
//           .insert({
//             id: user.id,
//             email: user.email,
//             role: user.email === 'studyai.platform@gmail.com' ? 'admin' : 'user',
//             last_seen: new Date().toISOString()
//           });
          
//         if (insertError) {
//           console.error('Error creating user record:', insertError);
//         }
//       }
//     } catch (error) {
//       console.error('Error ensuring user exists:', error);
//     }
//   }

//   async function fetchChatHistory() {
//     try {
//       setInitialLoading(true);
//       const { data, error } = await supabase
//         .from('chat_history')
//         .select('*')
//         .eq('user_id', user?.id)
//         .order('created_at', { ascending: true });

//       if (error) {
//         console.error('Error fetching chat history:', error);
//         throw error;
//       }
      
//       setChatHistory(data || []);
//     } catch (error) {
//       console.error('Error fetching chat history:', error);
//       setError('Failed to load chat history. Please try refreshing the page.');
//     } finally {
//       setInitialLoading(false);
//     }
//   }

//   async function handleSubmit(e?: React.FormEvent) {
//     e?.preventDefault();
//     if (!message.trim() || loading || !user?.id) return;

//     setLoading(true);
//     setError(null);
//     const userMessage = message;
//     setMessage('');
    
//     // Optimistically add user message to chat
//     const tempId = Date.now().toString();
//     setChatHistory(prev => [...prev, { 
//       id: tempId, 
//       user_id: user.id, 
//       message: userMessage, 
//       response: '', 
//       created_at: new Date().toISOString() 
//     }]);
    
//     setIsTyping(true);

//     try {
//       // Ensure user exists in users table before adding chat
//       await ensureUserExists();
      
//       // Fetch documents for context
//       const { data: documents, error: docError } = await supabase
//         .from('documents')
//         .select('content')
//         .eq('user_id', user?.id);

//       if (docError) {
//         console.error('Error fetching documents:', docError);
//       }

//       const context = documents?.map(doc => doc.content).join('\n') || '';
      
//       // Get response from Gemini API
//       const response = await getChatResponse(userMessage, context);

//       // Save to database
//       const { data, error } = await supabase
//         .from('chat_history')
//         .insert([
//           {
//             user_id: user?.id,
//             message: userMessage,
//             response,
//           },
//         ])
//         .select();

//       if (error) {
//         console.error('Error saving chat:', error);
//         throw error;
//       }

//       // Remove temporary message and add the real one from the database
//       setChatHistory(prev => {
//         const filtered = prev.filter(item => item.id !== tempId);
//         return [...filtered, ...(data || [])];
//       });

//       // Speak the response if live call is enabled
//       if (liveCallEnabled) {
//         speakText(response);
//       }
//     } catch (error: any) {
//       console.error('Error processing message:', error);
//       setError(`Failed to get response: ${error.message || 'Unknown error'}`);
      
//       // Remove the temporary message if there was an error
//       setChatHistory(prev => prev.filter(item => item.id !== tempId));
//     } finally {
//       setLoading(false);
//       setIsTyping(false);
//     }
//   }

//   const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
//     if (e.key === 'Enter' && !e.shiftKey) {
//       e.preventDefault();
//       handleSubmit();
//     }
//   };

//   const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
//   recognition.lang = 'en-US';
//   recognition.continuous = true;
//   recognition.interimResults = false;

//   recognition.onresult = (event) => {
//     const transcript = event.results[event.results.length - 1][0].transcript;
//     setMessage(transcript);
//     handleSubmit();
//   };

//   recognition.onerror = (event) => {
//     console.error('Speech recognition error:', event.error);
//   };

//   const startContinuousSpeechRecognition = () => {
//     recognition.start();
//   };

//   const stopContinuousSpeechRecognition = () => {
//     recognition.stop();
//   };

//   const speakText = (text) => {
//     const synth = window.speechSynthesis;
//     const utterance = new SpeechSynthesisUtterance(text);
//     utterance.lang = 'en-US';
//     synth.speak(utterance);
//   };

//   if (initialLoading) {
//     return (
//       <div className="flex justify-center items-center h-64">
//         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
//       </div>
//     );
//   }

//   return (
//     <div className="max-w-4xl mx-auto h-[calc(100vh-4rem)]">
//       <div className="flex flex-col h-full bg-white">
//         <div className="flex-1 overflow-y-auto py-4">
//           {chatHistory.length === 0 ? (
//             <div className="flex items-center justify-center h-full">
//               <div className="text-center p-8 max-w-md">
//                 <h2 className="text-xl font-semibold text-gray-700 mb-2">Welcome to AI Chat</h2>
//                 <p className="text-gray-500 mb-4">
//                   Ask questions about your documents or any topic you'd like to learn about.
//                 </p>
//               </div>
//             </div>
//           ) : (
//             chatHistory.map((chat, index) => (
//               <div key={chat.id || index}>
//                 <ChatMessage content={chat.message} isUser={true} />
//                 <ChatMessage content={chat.response} isUser={false} />
//               </div>
//             ))
//           )}
//           {isTyping && <ChatMessage content="" isUser={false} isTyping={true} />}
//           {error && (
//             <div className="mx-4 p-4 bg-red-50 text-red-700 rounded-md mb-4">
//               {error}
//             </div>
//           )}
//           <div ref={chatEndRef} />
//         </div>

//         <div className="border-t p-4">
//           <form onSubmit={handleSubmit} className="flex space-x-4">
//             <textarea
//               value={message}
//               onChange={(e) => setMessage(e.target.value)}
//               onKeyPress={handleKeyPress}
//               placeholder="Ask a question..."
//               rows={1}
//               className="flex-1 resize-none rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 min-h-[2.5rem] max-h-32"
//               disabled={loading}
//               style={{
//                 height: 'auto',
//                 minHeight: '2.5rem',
//                 maxHeight: '8rem',
//               }}
//             />
//             <button
//               type="submit"
//               disabled={loading || !message.trim()}
//               className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed h-10 self-end transition-colors"
//             >
//               {loading ? (
//                 <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
//               ) : (
//                 <Send className="h-5 w-5" />
//               )}
//             </button>
//             <button
//               type="button"
//               onClick={toggleLiveCall}
//               className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white ${liveCallEnabled ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 h-10 self-end transition-colors`}
//             >
//               {liveCallEnabled ? 'Stop Live Call' : 'Start Live Call'}
//             </button>
//           </form>
//         </div>
//       </div>
//     </div>
//   );
// }

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { getChatResponse } from '../lib/gemini';
import { Send } from 'lucide-react';
import ChatMessage from '../components/ChatMessage';

export default function Chat() {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.id) {
      // Ensure user exists in users table before fetching chat history
      ensureUserExists().then(() => {
        fetchChatHistory();
      });
    } else {
      setInitialLoading(false);
    }
  }, [user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isTyping]);

  async function ensureUserExists() {
    if (!user?.id) return;
    
    try {
      // Check if user exists in users table
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();
        
      if (error && error.code === 'PGRST116') {
        // User doesn't exist, create them
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email,
            role: user.email === 'studyai.platform@gmail.com' ? 'admin' : 'user',
            last_seen: new Date().toISOString()
          });
          
        if (insertError) {
          console.error('Error creating user record:', insertError);
        }
      }
    } catch (error) {
      console.error('Error ensuring user exists:', error);
    }
  }

  async function fetchChatHistory() {
    try {
      setInitialLoading(true);
      const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching chat history:', error);
        throw error;
      }
      
      setChatHistory(data || []);
    } catch (error) {
      console.error('Error fetching chat history:', error);
      setError('Failed to load chat history. Please try refreshing the page.');
    } finally {
      setInitialLoading(false);
    }
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!message.trim() || loading || !user?.id) return;

    setLoading(true);
    setError(null);
    const userMessage = message;
    setMessage('');
    
    // Optimistically add user message to chat
    const tempId = Date.now().toString();
    setChatHistory(prev => [...prev, { 
      id: tempId, 
      user_id: user.id, 
      message: userMessage, 
      response: '', 
      created_at: new Date().toISOString() 
    }]);
    
    setIsTyping(true);

    try {
      // Ensure user exists in users table before adding chat
      await ensureUserExists();
      
      // Fetch documents for context
      const { data: documents, error: docError } = await supabase
        .from('documents')
        .select('content')
        .eq('user_id', user?.id);

      if (docError) {
        console.error('Error fetching documents:', docError);
      }

      const context = documents?.map(doc => doc.content).join('\n') || '';
      
      // Get response from Gemini API
      const response = await getChatResponse(userMessage, context);

      // Save to database
      const { data, error } = await supabase
        .from('chat_history')
        .insert([
          {
            user_id: user?.id,
            message: userMessage,
            response,
          },
        ])
        .select();

      if (error) {
        console.error('Error saving chat:', error);
        throw error;
      }

      // Remove temporary message and add the real one from the database
      setChatHistory(prev => {
        const filtered = prev.filter(item => item.id !== tempId);
        return [...filtered, ...(data || [])];
      });
    } catch (error: any) {
      console.error('Error processing message:', error);
      setError(`Failed to get response: ${error.message || 'Unknown error'}`);
      
      // Remove the temporary message if there was an error
      setChatHistory(prev => prev.filter(item => item.id !== tempId));
    } finally {
      setLoading(false);
      setIsTyping(false);
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (initialLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-4rem)]">
      <div className="flex flex-col h-full bg-white">
        <div className="flex-1 overflow-y-auto py-4">
          {chatHistory.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-8 max-w-md">
                <h2 className="text-xl font-semibold text-gray-700 mb-2">Welcome to AI Chat</h2>
                <p className="text-gray-500 mb-4">
                  Ask questions about your documents or any topic you'd like to learn about.
                </p>
              </div>
            </div>
          ) : (
            chatHistory.map((chat, index) => (
              <div key={chat.id || index}>
                <ChatMessage content={chat.message} isUser={true} />
                <ChatMessage content={chat.response} isUser={false} />
              </div>
            ))
          )}
          {isTyping && <ChatMessage content="" isUser={false} isTyping={true} />}
          {error && (
            <div className="mx-4 p-4 bg-red-50 text-red-700 rounded-md mb-4">
              {error}
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="border-t p-4">
          <form onSubmit={handleSubmit} className="flex space-x-4">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question..."
              rows={1}
              className="flex-1 resize-none rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 min-h-[2.5rem] max-h-32"
              disabled={loading}
              style={{
                height: 'auto',
                minHeight: '2.5rem',
                maxHeight: '8rem',
              }}
            />
            <button
              type="submit"
              disabled={loading || !message.trim()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed h-10 self-end transition-colors"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate('/live-call')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 h-10 self-end transition-colors"
            >
              Start Live Call
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}