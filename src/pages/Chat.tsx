// // // import React, { useState, useEffect, useRef } from 'react';
// // // import { supabase } from '../lib/supabase';
// // // import { useAuth } from '../contexts/AuthContext';
// // // import { getChatResponse } from '../lib/gemini';
// // // import { Send } from 'lucide-react';
// // // import ChatMessage from '../components/ChatMessage';

// // // export default function Chat() {
// // //   const { user } = useAuth();
// // //   const [message, setMessage] = useState('');
// // //   const [chatHistory, setChatHistory] = useState<any[]>([]);
// // //   const [loading, setLoading] = useState(false);
// // //   const [initialLoading, setInitialLoading] = useState(true);
// // //   const chatEndRef = useRef<HTMLDivElement>(null);
// // //   const [isTyping, setIsTyping] = useState(false);
// // //   const [error, setError] = useState<string | null>(null);

// // //   useEffect(() => {
// // //     if (user?.id) {
// // //       // Ensure user exists in users table before fetching chat history
// // //       ensureUserExists().then(() => {
// // //         fetchChatHistory();
// // //       });
// // //     } else {
// // //       setInitialLoading(false);
// // //     }
// // //   }, [user]);

// // //   useEffect(() => {
// // //     chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
// // //   }, [chatHistory, isTyping]);

// // //   async function ensureUserExists() {
// // //     if (!user?.id) return;
    
// // //     try {
// // //       // Check if user exists in users table
// // //       const { data, error } = await supabase
// // //         .from('users')
// // //         .select('id')
// // //         .eq('id', user.id)
// // //         .single();
        
// // //       if (error && error.code === 'PGRST116') {
// // //         // User doesn't exist, create them
// // //         const { error: insertError } = await supabase
// // //           .from('users')
// // //           .insert({
// // //             id: user.id,
// // //             email: user.email,
// // //             role: user.email === 'studyai.platform@gmail.com' ? 'admin' : 'user',
// // //             last_seen: new Date().toISOString()
// // //           });
          
// // //         if (insertError) {
// // //           console.error('Error creating user record:', insertError);
// // //         }
// // //       }
// // //     } catch (error) {
// // //       console.error('Error ensuring user exists:', error);
// // //     }
// // //   }

// // //   async function fetchChatHistory() {
// // //     try {
// // //       setInitialLoading(true);
// // //       const { data, error } = await supabase
// // //         .from('chat_history')
// // //         .select('*')
// // //         .eq('user_id', user?.id)
// // //         .order('created_at', { ascending: true });

// // //       if (error) {
// // //         console.error('Error fetching chat history:', error);
// // //         throw error;
// // //       }
      
// // //       setChatHistory(data || []);
// // //     } catch (error) {
// // //       console.error('Error fetching chat history:', error);
// // //       setError('Failed to load chat history. Please try refreshing the page.');
// // //     } finally {
// // //       setInitialLoading(false);
// // //     }
// // //   }

// // //   async function handleSubmit(e?: React.FormEvent) {
// // //     e?.preventDefault();
// // //     if (!message.trim() || loading || !user?.id) return;

// // //     setLoading(true);
// // //     setError(null);
// // //     const userMessage = message;
// // //     setMessage('');
    
// // //     // Optimistically add user message to chat
// // //     const tempId = Date.now().toString();
// // //     setChatHistory(prev => [...prev, { 
// // //       id: tempId, 
// // //       user_id: user.id, 
// // //       message: userMessage, 
// // //       response: '', 
// // //       created_at: new Date().toISOString() 
// // //     }]);
    
// // //     setIsTyping(true);

// // //     try {
// // //       // Ensure user exists in users table before adding chat
// // //       await ensureUserExists();
      
// // //       // Fetch documents for context
// // //       const { data: documents, error: docError } = await supabase
// // //         .from('documents')
// // //         .select('content')
// // //         .eq('user_id', user?.id);

// // //       if (docError) {
// // //         console.error('Error fetching documents:', docError);
// // //       }

// // //       const context = documents?.map(doc => doc.content).join('\n') || '';
      
// // //       // Get response from Gemini API
// // //       const response = await getChatResponse(userMessage, context);

// // //       // Save to database
// // //       const { data, error } = await supabase
// // //         .from('chat_history')
// // //         .insert([
// // //           {
// // //             user_id: user?.id,
// // //             message: userMessage,
// // //             response,
// // //           },
// // //         ])
// // //         .select();

// // //       if (error) {
// // //         console.error('Error saving chat:', error);
// // //         throw error;
// // //       }

// // //       // Remove temporary message and add the real one from the database
// // //       setChatHistory(prev => {
// // //         const filtered = prev.filter(item => item.id !== tempId);
// // //         return [...filtered, ...(data || [])];
// // //       });
// // //     } catch (error: any) {
// // //       console.error('Error processing message:', error);
// // //       setError(`Failed to get response: ${error.message || 'Unknown error'}`);
      
// // //       // Remove the temporary message if there was an error
// // //       setChatHistory(prev => prev.filter(item => item.id !== tempId));
// // //     } finally {
// // //       setLoading(false);
// // //       setIsTyping(false);
// // //     }
// // //   }

// // //   const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
// // //     if (e.key === 'Enter' && !e.shiftKey) {
// // //       e.preventDefault();
// // //       handleSubmit();
// // //     }
// // //   };

// // //   if (initialLoading) {
// // //     return (
// // //       <div className="flex justify-center items-center h-64">
// // //         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
// // //       </div>
// // //     );
// // //   }

// // //   return (
// // //     <div className="max-w-4xl mx-auto h-[calc(100vh-4rem)]">
// // //       <div className="flex flex-col h-full bg-white">
// // //         <div className="flex-1 overflow-y-auto py-4">
// // //           {chatHistory.length === 0 ? (
// // //             <div className="flex items-center justify-center h-full">
// // //               <div className="text-center p-8 max-w-md">
// // //                 <h2 className="text-xl font-semibold text-gray-700 mb-2">Welcome to AI Chat</h2>
// // //                 <p className="text-gray-500 mb-4">
// // //                   Ask questions about your documents or any topic you'd like to learn about.
// // //                 </p>
// // //               </div>
// // //             </div>
// // //           ) : (
// // //             chatHistory.map((chat, index) => (
// // //               <div key={chat.id || index}>
// // //                 <ChatMessage content={chat.message} isUser={true} />
// // //                 <ChatMessage content={chat.response} isUser={false} />
// // //               </div>
// // //             ))
// // //           )}
// // //           {isTyping && <ChatMessage content="" isUser={false} isTyping={true} />}
// // //           {error && (
// // //             <div className="mx-4 p-4 bg-red-50 text-red-700 rounded-md mb-4">
// // //               {error}
// // //             </div>
// // //           )}
// // //           <div ref={chatEndRef} />
// // //         </div>

// // //         <div className="border-t p-4">
// // //           <form onSubmit={handleSubmit} className="flex space-x-4">
// // //             <textarea
// // //               value={message}
// // //               onChange={(e) => setMessage(e.target.value)}
// // //               onKeyPress={handleKeyPress}
// // //               placeholder="Ask a question..."
// // //               rows={1}
// // //               className="flex-1 resize-none rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 min-h-[2.5rem] max-h-32"
// // //               disabled={loading}
// // //               style={{
// // //                 height: 'auto',
// // //                 minHeight: '2.5rem',
// // //                 maxHeight: '8rem',
// // //               }}
// // //             />
// // //             <button
// // //               type="submit"
// // //               disabled={loading || !message.trim()}
// // //               className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed h-10 self-end transition-colors"
// // //             >
// // //               {loading ? (
// // //                 <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
// // //               ) : (
// // //                 <Send className="h-5 w-5" />
// // //               )}
// // //             </button>
// // //           </form>
// // //         </div>
// // //       </div>
// // //     </div>
// // //   );
// // // }
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
// //   const [liveCallEnabled, setLiveCallEnabled] = useState(false);

// //   const toggleLiveCall = () => {
// //     setLiveCallEnabled(!liveCallEnabled);
// //     if (!liveCallEnabled) {
// //       startContinuousSpeechRecognition();
// //     } else {
// //       stopContinuousSpeechRecognition();
// //     }
// //   };

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

// //       // Speak the response if live call is enabled
// //       if (liveCallEnabled) {
// //         speakText(response);
// //       }
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

// //   const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
// //   recognition.lang = 'en-US';
// //   recognition.continuous = true;
// //   recognition.interimResults = false;

// //   recognition.onresult = (event) => {
// //     const transcript = event.results[event.results.length - 1][0].transcript;
// //     setMessage(transcript);
// //     handleSubmit();
// //   };

// //   recognition.onerror = (event) => {
// //     console.error('Speech recognition error:', event.error);
// //   };

// //   const startContinuousSpeechRecognition = () => {
// //     recognition.start();
// //   };

// //   const stopContinuousSpeechRecognition = () => {
// //     recognition.stop();
// //   };

// //   const speakText = (text) => {
// //     const synth = window.speechSynthesis;
// //     const utterance = new SpeechSynthesisUtterance(text);
// //     utterance.lang = 'en-US';
// //     synth.speak(utterance);
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
// //             <button
// //               type="button"
// //               onClick={toggleLiveCall}
// //               className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white ${liveCallEnabled ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 h-10 self-end transition-colors`}
// //             >
// //               {liveCallEnabled ? 'Stop Live Call' : 'Start Live Call'}
// //             </button>
// //           </form>
// //         </div>
// //       </div>
// //     </div>
// //   );
// // }

// import React, { useState, useEffect, useRef } from 'react';
// import { useNavigate } from 'react-router-dom';
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
//   const navigate = useNavigate();

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
//               onClick={() => navigate('/livecall')}
//               className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 h-10 self-end transition-colors"
//             >
//               Start Live Call
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
import { Send, Plus, Edit2, Trash2, MoreVertical, MessageSquare, Mic } from 'lucide-react';
import ChatMessage from '../components/ChatMessage';

interface Chat {
  id: string;
  title: string;
  created_at: string;
  user_id: string;
}

interface Message {
  id: string;
  chat_id: string;
  user_id: string;
  message: string;
  response: string;
  created_at: string;
}

export default function Chat() {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<string | null>(null);
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [newChatTitle, setNewChatTitle] = useState('');
  const [editingChat, setEditingChat] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [showContextMenu, setShowContextMenu] = useState<{ x: number; y: number; messageId: string } | null>(null);
  const [longPressTimeout, setLongPressTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (user?.id) {
      ensureUserExists().then(() => {
        fetchChats();
      });
    } else {
      setInitialLoading(false);
    }
  }, [user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isTyping]);

  useEffect(() => {
    if (currentChat) {
      fetchChatHistory(currentChat);
    }
  }, [currentChat]);

  useEffect(() => {
    const handleClickOutside = () => setShowContextMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  async function ensureUserExists() {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();
        
      if (error && error.code === 'PGRST116') {
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

  async function fetchChats() {
    try {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setChats(data || []);
      if (data && data.length > 0 && !currentChat) {
        setCurrentChat(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
      setError('Failed to load chats');
    } finally {
      setInitialLoading(false);
    }
  }

  async function fetchChatHistory(chatId: string) {
    try {
      setInitialLoading(true);
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      setChatHistory(data || []);
    } catch (error) {
      console.error('Error fetching chat history:', error);
      setError('Failed to load chat history');
    } finally {
      setInitialLoading(false);
    }
  }

  async function createNewChat() {
    if (!user?.id) return;

    try {
      const timestamp = new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      });
      
      const defaultTitle = `Chat ${timestamp}`;

      const { data, error } = await supabase
        .from('chats')
        .insert([{
          title: defaultTitle,
          user_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;

      setChats(prev => [data, ...prev]);
      setCurrentChat(data.id);
      setShowNewChatDialog(false);
      setNewChatTitle('');
    } catch (error) {
      console.error('Error creating chat:', error);
      setError('Failed to create new chat');
    }
  }

  async function renameChat(chatId: string) {
    if (!editTitle.trim()) return;

    try {
      const { error } = await supabase
        .from('chats')
        .update({ title: editTitle.trim() })
        .eq('id', chatId);

      if (error) throw error;

      setChats(prev => prev.map(chat => 
        chat.id === chatId ? { ...chat, title: editTitle.trim() } : chat
      ));
      setEditingChat(null);
      setEditTitle('');
    } catch (error) {
      console.error('Error renaming chat:', error);
      setError('Failed to rename chat');
    }
  }

  async function deleteChat(chatId: string) {
    try {
      await supabase.from('chat_messages').delete().eq('chat_id', chatId);
      await supabase.from('chats').delete().eq('id', chatId);

      setChats(prev => prev.filter(chat => chat.id !== chatId));
      if (currentChat === chatId) {
        const remainingChats = chats.filter(chat => chat.id !== chatId);
        setCurrentChat(remainingChats.length > 0 ? remainingChats[0].id : null);
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
      setError('Failed to delete chat');
    }
  }

  async function deleteMessage(messageId: string) {
    try {
      await supabase.from('chat_messages').delete().eq('id', messageId);
      setChatHistory(prev => prev.filter(msg => msg.id !== messageId));
    } catch (error) {
      console.error('Error deleting message:', error);
      setError('Failed to delete message');
    }
  }

  const handleMessageLongPress = (messageId: string, event: React.TouchEvent) => {
    event.preventDefault();
    const timeout = setTimeout(() => {
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      setShowContextMenu({
        x: rect.left,
        y: rect.top + rect.height,
        messageId
      });
    }, 500);
    setLongPressTimeout(timeout);
  };

  const handleMessageTouchEnd = () => {
    if (longPressTimeout) {
      clearTimeout(longPressTimeout);
      setLongPressTimeout(null);
    }
  };

  const handleMessageRightClick = (messageId: string, event: React.MouseEvent) => {
    event.preventDefault();
    setShowContextMenu({
      x: event.clientX,
      y: event.clientY,
      messageId
    });
  };

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!message.trim() || loading || !user?.id || !currentChat) return;

    setLoading(true);
    setError(null);
    const userMessage = message;
    setMessage('');
    
    const tempId = Date.now().toString();
    setChatHistory(prev => [...prev, { 
      id: tempId,
      chat_id: currentChat,
      user_id: user.id,
      message: userMessage,
      response: '',
      created_at: new Date().toISOString()
    }]);
    
    setIsTyping(true);

    try {
      const { data: documents } = await supabase
        .from('documents')
        .select('content')
        .eq('user_id', user?.id);

      const context = documents?.map(doc => doc.content).join('\n') || '';
      const response = await getChatResponse(userMessage, context);

      const { data, error } = await supabase
        .from('chat_messages')
        .insert([{
          chat_id: currentChat,
          user_id: user.id,
          message: userMessage,
          response,
        }])
        .select();

      if (error) throw error;

      setChatHistory(prev => {
        const filtered = prev.filter(item => item.id !== tempId);
        return [...filtered, ...(data || [])];
      });
    } catch (error: any) {
      console.error('Error processing message:', error);
      setError(`Failed to get response: ${error.message || 'Unknown error'}`);
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
    <div className="flex h-[calc(100vh-4rem)]">
      <div className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 w-64 bg-white border-r transition-transform duration-200 ease-in-out z-30`}>
        <div className="p-4">
          <button
            onClick={createNewChat}
            className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Chat
          </button>
        </div>
        <div className="overflow-y-auto h-full pb-20">
          {chats.map(chat => (
            <div
              key={chat.id}
              className={`p-3 cursor-pointer hover:bg-gray-100 ${currentChat === chat.id ? 'bg-blue-50' : ''}`}
            >
              <div className="flex items-center justify-between">
                {editingChat === chat.id ? (
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={() => renameChat(chat.id)}
                    onKeyPress={(e) => e.key === 'Enter' && renameChat(chat.id)}
                    className="flex-1 px-2 py-1 border rounded"
                    autoFocus
                  />
                ) : (
                  <div
                    className="flex-1 flex items-center"
                    onClick={() => {
                      setCurrentChat(chat.id);
                      setIsSidebarOpen(false);
                    }}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    <span className="truncate">{chat.title}</span>
                  </div>
                )}
                <div className="flex items-center">
                  <button
                    onClick={() => {
                      setEditingChat(chat.id);
                      setEditTitle(chat.title);
                    }}
                    className="p-1 hover:text-blue-600"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteChat(chat.id)}
                    className="p-1 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-gray-50">
        <div className="lg:hidden flex items-center justify-between p-4 bg-white border-b">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <MoreVertical className="w-6 h-6" />
          </button>
          <h2 className="font-semibold">
            {currentChat ? chats.find(c => c.id === currentChat)?.title : 'Select a chat'}
          </h2>
          <div className="w-6" />
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-4">
          {currentChat ? (
            chatHistory.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center p-8 max-w-md">
                  <h2 className="text-xl font-semibold text-gray-700 mb-2">Start a New Conversation</h2>
                  <p className="text-gray-500">
                    Ask questions about your documents or any topic you'd like to learn about.
                  </p>
                </div>
              </div>
            ) : (
              chatHistory.map((chat, index) => (
                <div
                  key={chat.id || index}
                  onContextMenu={(e) => handleMessageRightClick(chat.id, e)}
                  onTouchStart={(e) => handleMessageLongPress(chat.id, e)}
                  onTouchEnd={handleMessageTouchEnd}
                  className="relative"
                >
                  <ChatMessage content={chat.message} isUser={true} />
                  <ChatMessage content={chat.response} isUser={false} />
                </div>
              ))
            )
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-8">
                <h2 className="text-xl font-semibold text-gray-700 mb-2">Welcome to AI Chat</h2>
                <p className="text-gray-500">Select a chat or create a new one to get started.</p>
              </div>
            </div>
          )}
          {isTyping && <ChatMessage content="" isUser={false} isTyping={true} />}
          {error && (
            <div className="mx-4 p-4 bg-red-50 text-red-700 rounded-md mb-4">
              {error}
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {currentChat && (
          <div className="border-t p-4 bg-white">
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
                onClick={() => navigate('/livecall')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 h-10 self-end transition-colors"
              >
                <Mic className="h-5 w-5" />
              </button>
            </form>
          </div>
        )}
      </div>

      {showContextMenu && (
        <div
          className="fixed bg-white rounded-lg shadow-lg py-2 z-50"
          style={{
            left: showContextMenu.x,
            top: showContextMenu.y,
          }}
        >
          {showContextMenu.messageId.startsWith('chat_') ? (
            <>
              <button
                onClick={() => {
                  const chatId = showContextMenu.messageId.replace('chat_', '');
                  setEditingChat(chatId);
                  const chat = chats.find(c => c.id === chatId);
                  if (chat) setEditTitle(chat.title);
                  setShowContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100"
              >
                Rename Chat
              </button>
              <button
                onClick={() => {
                  const chatId = showContextMenu.messageId.replace('chat_', '');
                  deleteChat(chatId);
                  setShowContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-red-600 hover:bg-gray-100"
              >
                Delete Chat
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                deleteMessage(showContextMenu.messageId);
                setShowContextMenu(null);
              }}
              className="w-full px-4 py-2 text-left text-red-600 hover:bg-gray-100"
            >
              Delete Message
            </button>
          )}
        </div>
      )}
    </div>
  );
}