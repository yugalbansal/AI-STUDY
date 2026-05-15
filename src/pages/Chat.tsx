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
import { getChatResponse, captionImages } from '../lib/gemini';
import { vectorSearchService } from '../lib/vectorSearch';
import { Menu, MessageSquare, X } from 'lucide-react';
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
  attachments?: Array<{ url: string; name: string; contentType: string }>;
  replyTo?: string | null;
  reply_to?: string | null;
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
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const shouldStickToBottomRef = useRef(true);
  const scrollFrameRef = useRef<number | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => (
    typeof window === 'undefined' ? true : window.matchMedia('(min-width: 1024px)').matches
  ));
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [replyContext, setReplyContext] = useState<string>('');

  // Stable callback for reply with selection
  const handleReplyWithSelection = useCallback((text: string) => {
    setReplyContext(text);
  }, []);

  const handleMessagesScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    shouldStickToBottomRef.current = distanceFromBottom < 160;
  }, []);

  useEffect(() => {
    if (!authLoading && userId && supabase) {
      fetchChats();
    } else if (!authLoading) {
      setInitialLoading(false);
    }
  }, [userId, authLoading, supabase]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const syncSidebarForViewport = () => {
      setIsSidebarOpen(mediaQuery.matches);
    };

    syncSidebarForViewport();
    mediaQuery.addEventListener('change', syncSidebarForViewport);
    return () => mediaQuery.removeEventListener('change', syncSidebarForViewport);
  }, []);

  useEffect(() => {
    shouldStickToBottomRef.current = true;
  }, [currentChat]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || !shouldStickToBottomRef.current) return;

    if (scrollFrameRef.current !== null) {
      cancelAnimationFrame(scrollFrameRef.current);
    }

    scrollFrameRef.current = requestAnimationFrame(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: loading || isTyping ? 'auto' : 'smooth',
      });
      scrollFrameRef.current = null;
    });

    return () => {
      if (scrollFrameRef.current !== null) {
        cancelAnimationFrame(scrollFrameRef.current);
        scrollFrameRef.current = null;
      }
    };
  }, [chatHistory, isTyping, loading]);

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
    } catch {
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
      
      const loadedMessages = (data || []).map((message: Message) => ({
        ...message,
        replyTo: message.replyTo ?? message.reply_to ?? null,
      }));

      shouldStickToBottomRef.current = true;
      setChatHistory(loadedMessages);
    } catch {
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
      shouldStickToBottomRef.current = true;
      setChatHistory([]);
    } catch {
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
    } catch {
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
    } catch {
      setError('Failed to delete chat');
    }
  }

  const handleSendMessage = useCallback(async ({ input, attachments }: { input: string; attachments: Attachment[] }) => {
    if (loading || !userId || !currentChat || !supabase) return;

    const hasContent = input.trim().length > 0 || attachments.length > 0 || replyContext;
    if (!hasContent) return;

    setLoading(true);
    setError(null);

    // Build user message with reply context if present
    let userMessage = input.trim();
    let promptWithContext = userMessage;
    const replyContextText = replyContext;

    if (replyContextText) {
      if (!userMessage) {
        userMessage = 'Continue';
      }
      promptWithContext = `Regarding your previous response:\n"${replyContextText}"\n\nCurrent question: ${userMessage}`;
      setReplyContext('');
    } else {
      promptWithContext = userMessage;
    }

    const tempId = Date.now().toString();
    const tempMessage = {
      id: tempId,
      chat_id: currentChat,
      user_id: userId,
      message: userMessage,
      response: '',
      created_at: new Date().toISOString(),
      replyTo: replyContextText || null,
    };

    shouldStickToBottomRef.current = true;
    setChatHistory(prev => [...prev, tempMessage]);
    setIsTyping(true);
    setStatusMessage('Processing...');

    let streamedResponse = '';
    const processedAttachments: Array<{ url: string; name: string; contentType: string }> = [];

    try {
      const imageUrls: string[] = [];

      // Process attachments - upload to storage and get public URLs
      if (attachments.length > 0) {
        setStatusMessage('Uploading images...');

        for (const attachment of attachments) {
          if (attachment.url.startsWith('blob:')) {
            // Fetch the blob from blob URL and convert to base64
            const response = await fetch(attachment.url);
            if (!response.ok) {
              setError(`Failed to process image: ${attachment.name}`);
              continue;
            }
            const blob = await response.blob();

            // Convert to base64 for captioning
            const arrayBuffer = await blob.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            let binary = '';
            for (let i = 0; i < uint8Array.length; i++) {
              binary += String.fromCharCode(uint8Array[i]);
            }
            const base64 = btoa(binary);
            const dataUrl = `data:${attachment.contentType};base64,${base64}`;
            imageUrls.push(dataUrl);
            processedAttachments.push({ url: dataUrl, name: attachment.name, contentType: attachment.contentType });

            // Also save to Supabase storage for document library
            const filePath = `${userId}/uploads/${Date.now()}_${attachment.name}`;
            const { error: uploadError } = await supabase.storage
              .from('documents')
              .upload(filePath, blob, {
                cacheControl: '3600',
                upsert: false,
              });

            if (!uploadError) {
              await supabase.from('documents').insert({
                title: attachment.name,
                content: `Chat upload: ${attachment.name}`,
                type: 'file',
                user_id: userId,
                jsonl_file_path: filePath,
              });
            }
          } else if (attachment.contentType.startsWith('image/')) {
            try {
              const imgResponse = await fetch(attachment.url);
              if (imgResponse.ok) {
                const imgBlob = await imgResponse.blob();
                const arrayBuffer = await imgBlob.arrayBuffer();
                const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
                const dataUrl = `data:${attachment.contentType};base64,${base64}`;
                imageUrls.push(dataUrl);
              }
            } catch {
              imageUrls.push(attachment.url);
            }
            processedAttachments.push({ url: attachment.url, name: attachment.name, contentType: attachment.contentType });
          } else {
            imageUrls.push(attachment.url);
            processedAttachments.push({ url: attachment.url, name: attachment.name, contentType: attachment.contentType });
          }
        }

        // Caption images using Gemini vision model
        let imageDescriptions = '';
        if (imageUrls.length > 0) {
          setStatusMessage('Analyzing images...');

          const captions = await captionImages(imageUrls);

          if (captions.length > 0) {
            imageDescriptions = captions.map((c, i) => `Image ${i + 1}: ${c.caption}`).join('\n');
          }
        }

        // Build prompt with image descriptions
        let enhancedPrompt = promptWithContext;
        if (imageDescriptions) {
          enhancedPrompt = `I have ${imageUrls.length} image(s) attached:\n\n${imageDescriptions}\n\n---\n\n${promptWithContext}`;
        }

        setStatusMessage('Getting response...');

        // Stream the response with real-time updates
        const response = await getChatResponse(
          enhancedPrompt,
          '',
          userId,
          currentChat,
          supabase,
          (chunk: string) => {
            streamedResponse += chunk;
            setChatHistory(prev =>
              prev.map(msg => msg.id === tempId ? { ...msg, response: streamedResponse } : msg)
            );
          },
          true
        );

        setStatusMessage('');
        setIsTyping(false);

        // Save to database with attachments
        const { data, error } = await supabase
          .from('chat_messages')
          .insert({
            chat_id: currentChat,
            user_id: userId,
            message: userMessage,
            response,
            attachments: processedAttachments.length > 0 ? processedAttachments : null,
            reply_to: replyContextText,
          })
          .select();

        if (error) throw error;

        // Replace temp message with saved message (include replyTo)
        setChatHistory(prev => {
          const filtered = prev.filter(item => item.id !== tempId);
          const newMessages = (data || []).map((msg: Message) => ({ ...msg, replyTo: replyContextText }));
          return [...filtered, ...newMessages];
        });

        // Store embeddings for the new message asynchronously
        if (data && data[0]) {
          const messageData = data[0];
          vectorSearchService.storeChatEmbedding(currentChat, messageData.id, userId, input, 'user').catch(() => {});
          vectorSearchService.storeChatEmbedding(currentChat, messageData.id, userId, response, 'assistant').catch(() => {});
        }
      } else {
        // No attachments - just send text message
        setStatusMessage('Getting response...');

        const response = await getChatResponse(
          promptWithContext,
          '',
          userId,
          currentChat,
          supabase,
          (chunk: string) => {
            streamedResponse += chunk;
            setChatHistory(prev =>
              prev.map(msg => msg.id === tempId ? { ...msg, response: streamedResponse } : msg)
            );
          },
          true
        );

        setStatusMessage('');
        setIsTyping(false);

        // Save to database
        const { data, error } = await supabase
          .from('chat_messages')
          .insert({
            chat_id: currentChat,
            user_id: userId,
            message: userMessage,
            response,
            attachments: null,
            reply_to: replyContextText,
          })
          .select();

        if (error) throw error;

        setChatHistory(prev => {
          const filtered = prev.filter(item => item.id !== tempId);
          const newMessages = (data || []).map((msg: Message) => ({ ...msg, replyTo: replyContextText }));
          return [...filtered, ...newMessages];
        });

        if (data && data[0]) {
          const messageData = data[0];
          vectorSearchService.storeChatEmbedding(currentChat, messageData.id, userId, input, 'user').catch(() => {});
          vectorSearchService.storeChatEmbedding(currentChat, messageData.id, userId, response, 'assistant').catch(() => {});
        }
      }
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      let message = 'Unknown error';
      if (error instanceof Error) {
        message = error.message;
      } else if (error && typeof error === 'object') {
        // Check for Supabase error format
        const errObj = error as any;
        message = errObj.message || errObj.error?.message || JSON.stringify(error);
      }
      setError(`Failed to get response: ${message}`);
      setChatHistory(prev => prev.filter(item => item.id !== tempId));
    } finally {
      setLoading(false);
      setIsTyping(false);
    }
  }, [loading, userId, currentChat, supabase, replyContext]);

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
            transition-[left] duration-200 ease-out
            left-0 ${isSidebarOpen ? 'lg:left-80' : 'lg:left-16'}
          `}
        >
          <Navbar isFixed={false} className="w-full" />
        </div>
        <div
          className={`
            flex justify-center items-center h-screen
            transition-[margin] duration-200 ease-out
            ml-0 ${isSidebarOpen ? 'lg:ml-80' : 'lg:ml-16'}
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
          w-80 max-w-[88vw] lg:max-w-none
          transform-gpu transition-transform duration-200 ease-out lg:transition-[width] lg:duration-200
          ${isSidebarOpen ? 'translate-x-0 lg:w-80' : '-translate-x-full lg:translate-x-0 lg:w-16'}
          ${!isSidebarOpen && 'pointer-events-none lg:pointer-events-auto lg:border-r-0'}
          z-50
          flex flex-col
          will-change-transform lg:will-change-auto
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
            className="lg:hidden fixed inset-0 bg-black/40 z-40 transition-opacity duration-200"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Navbar - Shifts right with sidebar */}
        <div
          className={`
            fixed top-0 right-0 z-40
            transition-[left] duration-200 ease-out
            left-0 ${isSidebarOpen ? 'lg:left-80' : 'lg:left-16'}
          `}
        >
          <Navbar isFixed={false} compactMobile className="w-full" />
        </div>

        {/* Main Chat Area - Shifts right with sidebar and below navbar */}
        <div 
          className={`
            fixed top-[4.75rem] sm:top-24 lg:top-16 bottom-0 right-0
            transition-[left] duration-200 ease-out
            left-0 ${isSidebarOpen ? 'lg:left-80' : 'lg:left-16'}
          `}
        >
          <div className="h-full flex flex-col bg-gray-50 dark:bg-zinc-900">
            {/* Chat Header */}
            <div className="bg-white dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700 px-3 sm:px-4 py-2.5 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg transition-colors text-gray-700 dark:text-gray-300"
                aria-label="Open chat sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <h1 className="font-semibold text-gray-900 dark:text-white truncate max-w-[150px] sm:max-w-none text-sm sm:text-base">
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

          {/* Chat Messages Area - improved scroll and mobile */}
          <div
            ref={messagesContainerRef}
            onScroll={handleMessagesScroll}
            className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y p-2 sm:p-4 bg-gray-50 dark:bg-zinc-900 scrollbar-mobile"
            style={{ WebkitOverflowScrolling: 'touch', scrollbarGutter: 'stable' }}
          >
            {currentChat ? (
              chatHistory.length === 0 ? (
                <div className="flex items-center justify-center h-full min-h-[50vh]">
                  <div className="text-center max-w-md px-4">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageSquare className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      Start a New Conversation
                    </h2>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                      Ask questions about your documents or any topic you'd like to learn about.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-4xl mx-auto space-y-3 sm:space-y-4 pb-2 overflow-hidden">
                  {chatHistory.map((chat, index) => (
                    <div
                      key={chat.id || index}
                      style={{ contentVisibility: 'auto', containIntrinsicSize: '1px 240px' }}
                    >
                      <ChatMessage content={chat.message} isUser={true} attachments={chat.attachments} replyTo={chat.replyTo || null} />
                      <ChatMessage content={chat.response} isUser={false} onReplyWithSelection={handleReplyWithSelection} />
                    </div>
                  ))}
                  {isTyping && (
                    <div>
                      <ChatMessage content="" isUser={false} isTyping={true} />
                      {statusMessage && (
                        <div className="mt-2 px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                          <span className="inline-block w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full animate-bounce"></span>
                          {statusMessage}
                        </div>
                      )}
                    </div>
                  )}
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
          </div>

          {/* Input Area */}
          {currentChat && (
            <div className="border-t border-gray-200 dark:border-zinc-700 bg-white/95 dark:bg-zinc-800/95 px-3 py-3 sm:p-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-[0_-2px_12px_rgba(0,0,0,0.04)]">
              <div className="max-w-4xl mx-auto">
                {replyContext && (
                  <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-blue-700 dark:text-blue-300">
                        <span className="font-medium">Replying to:</span>
                        <p className="mt-1 italic line-clamp-2">"{replyContext}"</p>
                      </div>
                      <button
                        onClick={() => setReplyContext('')}
                        className="text-blue-500 hover:text-blue-700 p-1"
                        title="Clear context"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                )}
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
