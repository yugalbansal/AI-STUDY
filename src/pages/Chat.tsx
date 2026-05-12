// import React, { useState, useEffect, useRef } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { supabase } from '../lib/supabase';
// import { useAuth } from '../contexts/AuthContext';
// import { getChatResponse } from '../lib/gemini';
// import { Send, Plus, Edit2, Trash2, MoreVertical, MessageSquare, Mic, X, Menu } from 'lucide-react';
// import ChatMessage from '../components/ChatMessage';

// interface Chat {
//   id: string;
//   title: string;
//   created_at: string;
//   user_id: string;
// }

// interface Message {
//   id: string;
//   chat_id: string;
//   user_id: string;
//   message: string;
//   response: string;
//   created_at: string;
// }

// export default function Chat() {
//   const { user } = useAuth();
//   const [message, setMessage] = useState('');
//   const [chatHistory, setChatHistory] = useState<Message[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [initialLoading, setInitialLoading] = useState(true);
//   const chatEndRef = useRef<HTMLDivElement>(null);
//   const [isTyping, setIsTyping] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const navigate = useNavigate();
//   const [chats, setChats] = useState<Chat[]>([]);
//   const [currentChat, setCurrentChat] = useState<string | null>(null);
//   const [showNewChatDialog, setShowNewChatDialog] = useState(false);
//   const [newChatTitle, setNewChatTitle] = useState('');
//   const [editingChat, setEditingChat] = useState<string | null>(null);
//   const [editTitle, setEditTitle] = useState('');
//   const [showContextMenu, setShowContextMenu] = useState<{ x: number; y: number; messageId: string } | null>(null);
//   const [longPressTimeout, setLongPressTimeout] = useState<NodeJS.Timeout | null>(null);
//   const [isSidebarOpen, setIsSidebarOpen] = useState(false);

//   useEffect(() => {
//     if (user?.id) {
//       ensureUserExists().then(() => {
//         fetchChats();
//       });
//     } else {
//       setInitialLoading(false);
//     }
//   }, [user]);

//   useEffect(() => {
//     // Scroll to bottom only when content actually changes
//     if (chatEndRef.current) {
//       chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
//     }
//   }, [chatHistory, isTyping]);

//   useEffect(() => {
//     if (currentChat) {
//       fetchChatHistory(currentChat);
//     }
//   }, [currentChat]);

//   useEffect(() => {
//     const handleClickOutside = () => setShowContextMenu(null);
//     document.addEventListener('click', handleClickOutside);
//     return () => document.removeEventListener('click', handleClickOutside);
//   }, []);

//   async function ensureUserExists() {
//     if (!user?.id) return;
    
//     try {
//       const { data, error } = await supabase
//         .from('users')
//         .select('id')
//         .eq('id', user.id)
//         .single();
        
//       if (error && error.code === 'PGRST116') {
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

//   async function fetchChats() {
//     try {
//       const { data, error } = await supabase
//         .from('chats')
//         .select('*')
//         .eq('user_id', user?.id)
//         .order('created_at', { ascending: false });

//       if (error) throw error;
      
//       setChats(data || []);
//       if (data && data.length > 0 && !currentChat) {
//         setCurrentChat(data[0].id);
//       }
//     } catch (error) {
//       console.error('Error fetching chats:', error);
//       setError('Failed to load chats');
//     } finally {
//       setInitialLoading(false);
//     }
//   }

//   async function fetchChatHistory(chatId: string) {
//     try {
//       setInitialLoading(true);
//       const { data, error } = await supabase
//         .from('chat_messages')
//         .select('*')
//         .eq('chat_id', chatId)
//         .order('created_at', { ascending: true });

//       if (error) throw error;
      
//       setChatHistory(data || []);
//     } catch (error) {
//       console.error('Error fetching chat history:', error);
//       setError('Failed to load chat history');
//     } finally {
//       setInitialLoading(false);
//     }
//   }

//   async function createNewChat() {
//     if (!user?.id) return;

//     try {
//       const timestamp = new Date().toLocaleString('en-US', {
//         month: 'short',
//         day: 'numeric',
//         hour: 'numeric',
//         minute: 'numeric',
//         hour12: true
//       });
      
//       const defaultTitle = `Chat ${timestamp}`;

//       const { data, error } = await supabase
//         .from('chats')
//         .insert([{
//           title: newChatTitle.trim() || defaultTitle,
//           user_id: user.id
//         }])
//         .select()
//         .single();

//       if (error) throw error;

//       setChats(prev => [data, ...prev]);
//       setCurrentChat(data.id);
//       setShowNewChatDialog(false);
//       setNewChatTitle('');
      
//       // Reset chat history for new chat
//       setChatHistory([]);
//     } catch (error) {
//       console.error('Error creating chat:', error);
//       setError('Failed to create new chat');
//     }
//   }

//   async function renameChat(chatId: string) {
//     if (!editTitle.trim()) return;

//     try {
//       const { error } = await supabase
//         .from('chats')
//         .update({ title: editTitle.trim() })
//         .eq('id', chatId);

//       if (error) throw error;

//       setChats(prev => prev.map(chat => 
//         chat.id === chatId ? { ...chat, title: editTitle.trim() } : chat
//       ));
//       setEditingChat(null);
//       setEditTitle('');
//     } catch (error) {
//       console.error('Error renaming chat:', error);
//       setError('Failed to rename chat');
//     }
//   }

//   async function deleteChat(chatId: string) {
//     try {
//       await supabase.from('chat_messages').delete().eq('chat_id', chatId);
//       await supabase.from('chats').delete().eq('id', chatId);

//       setChats(prev => prev.filter(chat => chat.id !== chatId));
//       if (currentChat === chatId) {
//         const remainingChats = chats.filter(chat => chat.id !== chatId);
//         setCurrentChat(remainingChats.length > 0 ? remainingChats[0].id : null);
//         if (remainingChats.length > 0) {
//           setChatHistory([]); // Clear current history before loading new chat
//         }
//       }
//     } catch (error) {
//       console.error('Error deleting chat:', error);
//       setError('Failed to delete chat');
//     }
//   }

//   async function deleteMessage(messageId: string) {
//     try {
//       await supabase.from('chat_messages').delete().eq('id', messageId);
//       setChatHistory(prev => prev.filter(msg => msg.id !== messageId));
//     } catch (error) {
//       console.error('Error deleting message:', error);
//       setError('Failed to delete message');
//     }
//   }

//   const handleMessageLongPress = (messageId: string, event: React.TouchEvent) => {
//     event.preventDefault();
//     const timeout = setTimeout(() => {
//       const rect = (event.target as HTMLElement).getBoundingClientRect();
//       setShowContextMenu({
//         x: rect.left,
//         y: rect.top + rect.height,
//         messageId
//       });
//     }, 500);
//     setLongPressTimeout(timeout);
//   };

//   const handleMessageTouchEnd = () => {
//     if (longPressTimeout) {
//       clearTimeout(longPressTimeout);
//       setLongPressTimeout(null);
//     }
//   };

//   const handleMessageRightClick = (messageId: string, event: React.MouseEvent) => {
//     event.preventDefault();
//     setShowContextMenu({
//       x: event.clientX,
//       y: event.clientY,
//       messageId
//     });
//   };

//   async function handleSubmit(e?: React.FormEvent) {
//     e?.preventDefault();
//     if (!message.trim() || loading || !user?.id || !currentChat) return;

//     setLoading(true);
//     setError(null);
//     const userMessage = message;
//     setMessage('');
    
//     const tempId = Date.now().toString();
//     setChatHistory(prev => [...prev, { 
//       id: tempId,
//       chat_id: currentChat,
//       user_id: user.id,
//       message: userMessage,
//       response: '',
//       created_at: new Date().toISOString()
//     }]);
    
//     setIsTyping(true);

//     try {
//       const { data: documents } = await supabase
//         .from('documents')
//         .select('content')
//         .eq('user_id', user?.id);

//       const context = documents?.map(doc => doc.content).join('\n') || '';
//       const response = await getChatResponse(userMessage, context);

//       const { data, error } = await supabase
//         .from('chat_messages')
//         .insert([{
//           chat_id: currentChat,
//           user_id: user.id,
//           message: userMessage,
//           response,
//         }])
//         .select();

//       if (error) throw error;

//       setChatHistory(prev => {
//         const filtered = prev.filter(item => item.id !== tempId);
//         return [...filtered, ...(data || [])];
//       });
//     } catch (error: any) {
//       console.error('Error processing message:', error);
//       setError(`Failed to get response: ${error.message || 'Unknown error'}`);
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
//     <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-gray-100">
//       {/* Sidebar */}
//       <div 
//         className={`fixed inset-y-0 left-0 transform ${
//           isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
//         } lg:relative lg:translate-x-0 w-64 bg-white border-r transition-transform duration-200 ease-in-out z-30 h-[calc(100vh-4rem)] mt-16 top-0`}
//       >
//         <div className="flex items-center justify-between p-4 border-b">
//           <button
//             onClick={() => {
//               createNewChat();
//               setIsSidebarOpen(false);
//             }}
//             className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
//           >
//             <Plus className="w-5 h-5 mr-2" />
//             New Chat
//           </button>
//           <button
//             onClick={() => setIsSidebarOpen(false)}
//             className="lg:hidden ml-2 p-2 hover:bg-gray-100 rounded-lg"
//           >
//             <X className="w-5 h-5" />
//           </button>
//         </div>
//         <div className="overflow-y-auto h-[calc(100%-4rem)]">
//           {chats.map(chat => (
//             <div
//               key={chat.id}
//               className={`p-3 cursor-pointer hover:bg-gray-100 ${currentChat === chat.id ? 'bg-blue-50' : ''}`}
//             >
//               <div className="flex items-center justify-between">
//                 {editingChat === chat.id ? (
//                   <input
//                     type="text"
//                     value={editTitle}
//                     onChange={(e) => setEditTitle(e.target.value)}
//                     onBlur={() => renameChat(chat.id)}
//                     onKeyPress={(e) => e.key === 'Enter' && renameChat(chat.id)}
//                     className="flex-1 px-2 py-1 border rounded"
//                     autoFocus
//                   />
//                 ) : (
//                   <div
//                     className="flex-1 flex items-center"
//                     onClick={() => {
//                       setCurrentChat(chat.id);
//                       setIsSidebarOpen(false);
//                     }}
//                   >
//                     <MessageSquare className="w-4 h-4 mr-2" />
//                     <span className="truncate">{chat.title}</span>
//                   </div>
//                 )}
//                 <div className="flex items-center">
//                   <button
//                     onClick={(e) => {
//                       e.stopPropagation();
//                       setEditingChat(chat.id);
//                       setEditTitle(chat.title);
//                     }}
//                     className="p-1 hover:text-blue-600"
//                   >
//                     <Edit2 className="w-4 h-4" />
//                   </button>
//                   <button
//                     onClick={(e) => {
//                       e.stopPropagation();
//                       deleteChat(chat.id);
//                     }}
//                     className="p-1 hover:text-red-600"
//                   >
//                     <Trash2 className="w-4 h-4" />
//                   </button>
//                 </div>
//               </div>
//             </div>
//           ))}
//         </div>
//       </div>

//       {/* Main chat area */}
//       <div className="flex-1 flex flex-col bg-gray-50 h-full overflow-hidden">
//         {/* Mobile header */}
//         <div className="lg:hidden flex items-center justify-between p-4 bg-white border-b">
//           <button
//             onClick={() => setIsSidebarOpen(!isSidebarOpen)}
//             className="p-2 hover:bg-gray-100 rounded-lg"
//           >
//             <Menu className="w-6 h-6" />
//           </button>
//           <h2 className="font-semibold truncate max-w-[200px]">
//             {currentChat ? chats.find(c => c.id === currentChat)?.title : 'Select a chat'}
//           </h2>
//           <div className="w-6" />
//         </div>

//         {/* Messages container - adjusted to fix bottom gap */}
//         <div className="flex-1 overflow-y-auto p-4">
//           {currentChat ? (
//             chatHistory.length === 0 ? (
//               <div className="flex items-center justify-center h-full">
//                 <div className="text-center p-8 max-w-md">
//                   <h2 className="text-xl font-semibold text-gray-700 mb-2">Start a New Conversation</h2>
//                   <p className="text-gray-500">
//                     Ask questions about your documents or any topic you'd like to learn about.
//                   </p>
//                 </div>
//               </div>
//             ) : (
//               chatHistory.map((chat, index) => (
//                 <div
//                   key={chat.id || index}
//                   onContextMenu={(e) => handleMessageRightClick(chat.id, e)}
//                   onTouchStart={(e) => handleMessageLongPress(chat.id, e)}
//                   onTouchEnd={handleMessageTouchEnd}
//                   className="relative"
//                 >
//                   <ChatMessage content={chat.message} isUser={true} />
//                   <ChatMessage content={chat.response} isUser={false} />
//                 </div>
//               ))
//             )
//           ) : (
//             <div className="flex items-center justify-center h-full">
//               <div className="text-center p-8">
//                 <h2 className="text-xl font-semibold text-gray-700 mb-2">Welcome to AI Chat</h2>
//                 <p className="text-gray-500">Select a chat or create a new one to get started.</p>
//               </div>
//             </div>
//           )}
//           {isTyping && <ChatMessage content="" isUser={false} isTyping={true} />}
//           {error && (
//             <div className="mx-4 p-4 bg-red-50 text-red-700 rounded-md mb-4">
//               {error}
//             </div>
//           )}
//           <div ref={chatEndRef} />
//         </div>

//         {/* Input area - adjusted to make sure it sticks to bottom */}
//         {currentChat && (
//           <div className="border-t p-4 bg-white mt-auto">
//             <form onSubmit={handleSubmit} className="flex space-x-4">
//               <textarea
//                 value={message}
//                 onChange={(e) => setMessage(e.target.value)}
//                 onKeyPress={handleKeyPress}
//                 placeholder="Ask a question..."
//                 rows={1}
//                 className="flex-1 resize-none rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 min-h-[2.5rem] max-h-32"
//                 disabled={loading}
//                 style={{
//                   height: 'auto',
//                   minHeight: '2.5rem',
//                   maxHeight: '8rem',
//                 }}
//               />
//               <button
//                 type="submit"
//                 disabled={loading || !message.trim()}
//                 className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed h-10 self-end transition-colors"
//               >
//                 {loading ? (
//                   <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
//                 ) : (
//                   <Send className="h-5 w-5" />
//                 )}
//               </button>
//               <button
//                 type="button"
//                 onClick={() => navigate('/livecall')}
//                 className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 h-10 self-end transition-colors"
//               >
//                 <Mic className="h-5 w-5" />
//               </button>
//             </form>
//           </div>
//         )}
//       </div>

//       {/* Context menu for message actions */}
//       {showContextMenu && (
//         <div
//           className="fixed bg-white rounded-lg shadow-lg py-2 z-50"
//           style={{
//             left: showContextMenu.x,
//             top: showContextMenu.y,
//           }}
//         >
//           <button
//             onClick={() => {
//               deleteMessage(showContextMenu.messageId);
//               setShowContextMenu(null);
//             }}
//             className="w-full px-4 py-2 text-left text-red-600 hover:bg-gray-100"
//           >
//             Delete Message
//           </button>
//         </div>
//       )}

//       {/* Mobile sidebar overlay */}
//       {isSidebarOpen && (
//         <div 
//           className="fixed inset-0 bg-black bg-opacity-50 lg:hidden z-20"
//           onClick={() => setIsSidebarOpen(false)}
//         />
//       )}
//     </div>
//   );
// }

import { useState, useEffect, useRef, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { useClerkAuth } from '../contexts/ClerkAuthContext';
import { getChatResponse } from '../lib/gemini';
import { vectorSearchService } from '../lib/vectorSearch';
import { Menu, MessageSquare } from 'lucide-react';
import ChatMessage from '../components/ChatMessage';
import Navbar from '../components/Navbar';
import ChatSidebar from '../components/ui/chat-sidebar';
import { PureMultimodalInput } from '../components/ui/multimodal-ai-chat-input';

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

// Attachment type for multimodal input
interface Attachment {
  url: string;
  name: string;
  contentType: string;
  size: number;
}

export default function Chat() {
  const { user, userId, supabase, loading: authLoading } = useClerkAuth();
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Desktop sidebar open by default
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  useEffect(() => {
    if (!authLoading && userId && supabase) {
      fetchChats();
    } else if (!authLoading) {
      setInitialLoading(false);
    }
  }, [userId, authLoading, supabase]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isTyping]);

  useEffect(() => {
    if (currentChat) {
      fetchChatHistory(currentChat);
    }
  }, [currentChat]);



  async function fetchChats() {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setChats(data || []);
      if (data && data.length > 0 && !currentChat) {
        setCurrentChat(data[0].id);
      }
    } catch (error) {
      setError('Failed to load chats');
    } finally {
      setInitialLoading(false);
    }
  }

  async function fetchChatHistory(chatId: string) {
    if (!supabase) return;
    try {
      setInitialLoading(true);
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true});

      if (error) throw error;
      
      setChatHistory(data || []);
    } catch (error) {
      setError('Failed to load chat history');
    } finally {
      setInitialLoading(false);
    }
  }

  async function createNewChat() {
    if (!userId || !supabase) return;

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
          user_id: userId
        }])
        .select()
        .single();

      if (error) throw error;

      setChats(prev => [data, ...prev]);
      setCurrentChat(data.id);
      setChatHistory([]);
    } catch (error) {
      setError('Failed to create new chat');
    }
  }

  async function renameChat(chatId: string, newTitle: string) {
    if (!newTitle.trim() || !supabase) return;

    try {
      const { error } = await supabase
        .from('chats')
        .update({ title: newTitle.trim() })
        .eq('id', chatId);

      if (error) throw error;

      setChats(prev => prev.map(chat => 
        chat.id === chatId ? { ...chat, title: newTitle.trim() } : chat
      ));
    } catch (error) {
      setError('Failed to rename chat');
    }
  }

  async function deleteChat(chatId: string) {
    if (!supabase) return;
    try {
      await supabase.from('chat_messages').delete().eq('chat_id', chatId);
      await supabase.from('chats').delete().eq('id', chatId);

      setChats(prev => prev.filter(chat => chat.id !== chatId));
      if (currentChat === chatId) {
        const remainingChats = chats.filter(chat => chat.id !== chatId);
        setCurrentChat(remainingChats.length > 0 ? remainingChats[0].id : null);
        if (remainingChats.length > 0) {
          setChatHistory([]);
        }
      }
    } catch (error) {
      setError('Failed to delete chat');
    }
  }

  const handleSendMessage = useCallback(async ({ input }: { input: string; attachments: Attachment[] }) => {
    if (!input.trim() || loading || !userId || !currentChat || !supabase) return;

    setLoading(true);
    setError(null);
    
    const tempId = Date.now().toString();
    const tempMessage = { 
      id: tempId,
      chat_id: currentChat,
      user_id: userId,
      message: input,
      response: '',
      created_at: new Date().toISOString()
    };
    
    setChatHistory(prev => [...prev, tempMessage]);
    setIsTyping(true);

    try {
      let streamedResponse = '';
      
      // Stream the response with real-time updates
      const response = await getChatResponse(
        input,
        '',
        userId,
        currentChat,
        supabase,
        (chunk: string) => {
          // Update response in real-time as chunks arrive
          streamedResponse += chunk;
          setChatHistory(prev =>
            prev.map(msg =>
              msg.id === tempId
                ? { ...msg, response: streamedResponse }
                : msg
            )
          );
        },
        true // enable streaming
      );

      setIsTyping(false);

      // Save to database
      const { data, error } = await supabase
        .from('chat_messages')
        .insert([{
          chat_id: currentChat,
          user_id: userId,
          message: input,
          response,
        }])
        .select();

      if (error) throw error;

      // Replace temp message with saved message
      setChatHistory(prev => {
        const filtered = prev.filter(item => item.id !== tempId);
        return [...filtered, ...(data || [])];
      });

      // Store embeddings for the new message asynchronously
      if (data && data[0]) {
        const messageData = data[0];
        vectorSearchService.storeChatEmbedding(
          currentChat,
          messageData.id,
          userId,
          input,
          'user'
        ).catch(() => {});
        
        vectorSearchService.storeChatEmbedding(
          currentChat,
          messageData.id,
          userId,
          response,
          'assistant'
        ).catch(() => {});
      }
    } catch (error: any) {
      setError(`Failed to get response: ${error.message || 'Unknown error'}`);
      setChatHistory(prev => prev.filter(item => item.id !== tempId));
    } finally {
      setLoading(false);
      setIsTyping(false);
    }
  }, [loading, userId, currentChat, supabase]);

  const handleStopGenerating = useCallback(() => {
    setLoading(false);
    setIsTyping(false);
  }, []);

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-900">
        <div
          className={`
            fixed top-0 right-0 z-40
            transition-all duration-300 ease-in-out
            ${isSidebarOpen ? 'left-80' : 'left-0 lg:left-16'}
          `}
        >
          <Navbar isFixed={false} className="w-full" />
        </div>
        <div
          className={`
            flex justify-center items-center h-screen
            transition-all duration-300 ease-in-out
            ${isSidebarOpen ? 'ml-80' : 'ml-0 lg:ml-16'}
          `}
        >
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
        </div>
      </div>
    );
  }

  // Convert chat history to UIMessage format for multimodal input
  const uiMessages = chatHistory.flatMap(chat => [
    { id: `${chat.id}-user`, content: chat.message, role: 'user' },
    { id: `${chat.id}-assistant`, content: chat.response, role: 'assistant' }
  ]);

  return (
    <>
      <Helmet>
        <title>AI Chat - Vector Mind AI</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-900">
      {/* Sidebar - Fixed on left side, full height */}
      <div 
        className={`
          fixed inset-y-0 left-0 top-0
          bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-700
          transition-all duration-300 ease-in-out
          ${isSidebarOpen ? 'w-80' : 'w-0 lg:w-16'}
          ${!isSidebarOpen && 'lg:border-r-0'}
          z-50
          flex flex-col
        `}
      >
          {/* Sidebar Content */}
          <div className={`${isSidebarOpen ? 'block' : 'hidden lg:block'} h-full`}>
            {isSidebarOpen ? (
              <ChatSidebar
                chats={chats}
                currentChat={currentChat}
                onSelectChat={(id) => {
                  setCurrentChat(id);
                  // Close mobile sidebar after selection
                  if (window.innerWidth < 1024) {
                    setIsSidebarOpen(false);
                  }
                }}
                onCreateNewChat={() => {
                  createNewChat();
                  if (window.innerWidth < 1024) {
                    setIsSidebarOpen(false);
                  }
                }}
                onRenameChat={renameChat}
                onDeleteChat={deleteChat}
                onClose={() => setIsSidebarOpen(false)}
                userEmail={user?.primaryEmailAddress?.emailAddress}
                userName={user?.firstName || user?.username}
              />
            ) : (
              // Minimized sidebar (desktop only)
              <div className="hidden lg:flex flex-col items-center py-4 space-y-4 h-full">
                <button
                  onClick={createNewChat}
                  className="p-3 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-gray-700 dark:text-gray-300"
                  title="New Chat"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                <div className="flex-1 overflow-y-auto w-full space-y-2 px-2">
                  {chats.slice(0, 10).map(chat => (
                    <button
                      key={chat.id}
                      onClick={() => setCurrentChat(chat.id)}
                      className={`w-full p-2 rounded-lg transition-colors ${
                        currentChat === chat.id
                          ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                          : 'hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-300'
                      }`}
                      title={chat.title}
                    >
                      <MessageSquare className="w-5 h-5 mx-auto" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Toggle Button - Desktop */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`
              hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2
              w-6 h-12 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-r-lg
              items-center justify-center hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors
              shadow-sm z-50 text-gray-700 dark:text-gray-300
            `}
          >
            {isSidebarOpen ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Overlay */}
        {isSidebarOpen && (
          <div 
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Navbar - Shifts right with sidebar */}
        <div
          className={`
            fixed top-0 right-0 z-40
            transition-all duration-300 ease-in-out
            ${isSidebarOpen ? 'left-80' : 'left-0 lg:left-16'}
          `}
        >
          <Navbar isFixed={false} className="w-full" />
        </div>

        {/* Main Chat Area - Shifts right with sidebar and below navbar */}
        <div 
          className={`
            fixed top-16 bottom-0 right-0
            transition-all duration-300 ease-in-out
            ${isSidebarOpen ? 'left-80' : 'left-0 lg:left-16'}
          `}
        >
          <div className="h-full flex flex-col bg-gray-50 dark:bg-zinc-900">
            {/* Chat Header */}
            <div className="bg-white dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700 px-4 py-4 flex items-center justify-between shadow-sm mt-4">
              <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg transition-colors text-gray-700 dark:text-gray-300"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <h1 className="font-semibold text-gray-900 dark:text-white truncate max-w-[200px] sm:max-w-none">
                  {currentChat 
                    ? chats.find(c => c.id === currentChat)?.title || 'Chat' 
                    : 'Vector Mind AI Chat'
                  }
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {chatHistory.length > 0 && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {chatHistory.length} {chatHistory.length === 1 ? 'message' : 'messages'}
                </span>
              )}
            </div>
          </div>

          {/* Chat Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-zinc-900">
            {currentChat ? (
              chatHistory.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center max-w-md">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageSquare className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      Start a New Conversation
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      Ask questions about your documents or any topic you'd like to learn about.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="max-w-4xl mx-auto space-y-4">
                  {chatHistory.map((chat, index) => (
                    <div key={chat.id || index}>
                      <ChatMessage content={chat.message} isUser={true} />
                      <ChatMessage content={chat.response} isUser={false} />
                    </div>
                  ))}
                  {isTyping && <ChatMessage content="" isUser={false} isTyping={true} />}
                </div>
              )
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-md">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Welcome to Vector Mind AI Chat
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Select a chat from the sidebar or create a new one to get started.
                  </p>
                  <button
                    onClick={createNewChat}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm hover:shadow-md"
                  >
                    Start New Chat
                  </button>
                </div>
              </div>
            )}
            {error && (
              <div className="max-w-4xl mx-auto mt-4">
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg">
                  {error}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          {currentChat && (
            <div className="border-t border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4">
              <div className="max-w-4xl mx-auto">
                <PureMultimodalInput
                  chatId={currentChat}
                  messages={uiMessages}
                  attachments={attachments}
                  setAttachments={setAttachments}
                  onSendMessage={handleSendMessage}
                  onStopGenerating={handleStopGenerating}
                  isGenerating={loading}
                  canSend={!loading}
                  selectedVisibilityType="private"
                />
              </div>
            </div>
          )}
          </div>
        </div>
    </div>
    </>
  );
}
