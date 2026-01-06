import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { FileText, MessageSquare, Users, RefreshCw, Trash2, Image, Mic, Brain, Sparkles, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BentoGrid, BentoItem } from '../components/ui/bento-grid';
import Navbar from '../components/Navbar';

interface User {
  id: string;
  email: string;
  full_name: string;
  last_seen: string;
  is_online: boolean;
  role: string;
}

interface User {
  id: string;
  email: string;
  full_name: string;
  last_seen: string;
  is_online: boolean;
  role: string;
}

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    documentCount: 0,
    chatCount: 0,
    userCount: 0,
  });
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [userChats, setUserChats] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      // Fetch basic stats - RLS will automatically filter based on user role
      const [documentsResponse, chatResponse] = await Promise.all([
        supabase.from('documents').select('id', { count: 'exact' }),
        supabase.from('chat_messages').select('id', { count: 'exact' }),
      ]);

      // Admin-specific data
      if (isAdmin) {
        // Get users data directly from the users table
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('*');

        if (usersError) {
          console.error('Error fetching users:', usersError);
          return;
        }

        // Get total counts for admin
        const [{ count: totalDocs }, { count: totalChats }] = await Promise.all([
          supabase.from('documents').select('*', { count: 'exact' }),
          supabase.from('chat_messages').select('*', { count: 'exact' }),
        ]);

        if (usersData) {
          const formattedUsers = usersData.map(userData => ({
            id: userData.id,
            email: userData.email || '',
            full_name: userData.full_name || userData.email?.split('@')[0] || 'Unknown',
            last_seen: userData.last_seen || null,
            is_online: userData.is_online || false,
            role: userData.role || 'user',
          }));

          setStats({
            documentCount: totalDocs || 0,
            chatCount: totalChats || 0,
            userCount: usersData.length,
          });
          setUsers(formattedUsers);
        }
      } else {
        setStats({
          documentCount: documentsResponse.count || 0,
          chatCount: chatResponse.count || 0,
          userCount: 0,
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    if (isAdmin) {
      const channel = supabase
        .channel('db-changes')
        .on('postgres_changes', { event: '*', schema: 'public' }, () => {
          fetchData();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, isAdmin]);

  const fetchUserChats = async (userId: string) => {
    try {
      // Admin needs to see specific user's chats, so keep user_id filter
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      setUserChats(data || []);
      setSelectedUser(userId);
    } catch (error) {
      console.error('Error fetching user chats:', error);
    }
  };

  const deleteUserChat = async (chatId: string) => {
    try {
      const { error } = await supabase
        .from('chat_history')
        .delete()
        .eq('id', chatId);

      if (error) throw error;
      
      // Refresh the chat list
      if (selectedUser) {
        await fetchUserChats(selectedUser);
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  // Create bento grid items for dashboard features
  const bentoItems: BentoItem[] = [
    {
      title: "AI Chat Assistant",
      meta: `${stats.chatCount} conversations`,
      description: "Engage in intelligent conversations with our advanced AI. Get instant answers, explanations, and creative insights.",
      icon: <MessageSquare className="w-4 h-4 text-blue-500" />,
      status: "Active",
      tags: ["AI", "Chat", "Real-time"],
      colSpan: 2,
      hasPersistentHover: true,
      cta: "Start Chat →"
    },
    {
      title: "Document Analysis",
      meta: `${stats.documentCount} documents`,
      description: "Upload and analyze PDFs, Word docs, and text files with AI-powered insights and summaries.",
      icon: <FileText className="w-4 h-4 text-emerald-500" />,
      status: "Ready",
      tags: ["Documents", "Analysis"],
      cta: "Upload →"
    },
    {
      title: "AI Image Generator",
      meta: "Unlimited creates",
      description: "Transform your ideas into stunning visuals with state-of-the-art AI image generation technology.",
      icon: <Image className="w-4 h-4 text-purple-500" />,
      status: "New",
      tags: ["Creative", "Images"],
      colSpan: 2,
      cta: "Generate →"
    },
    {
      title: "Voice Chat",
      meta: "Real-time AI",
      description: "Natural voice conversations with AI. Speak your questions and hear intelligent responses instantly.",
      icon: <Mic className="w-4 h-4 text-rose-500" />,
      status: "Beta",
      tags: ["Voice", "AI"],
      cta: "Try Now →"
    },
    ...(isAdmin ? [{
      title: "Admin Dashboard",
      meta: `${stats.userCount} users`,
      description: "Manage users, monitor system health, and access advanced analytics and controls.",
      icon: <Users className="w-4 h-4 text-amber-500" />,
      status: "Admin",
      tags: ["Management", "Analytics"],
      colSpan: 3,
      hasPersistentHover: true,
      cta: "Manage →"
    }] : [])
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <Navbar />

      {/* Hero Section */}
      <div className="pt-32 pb-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              Welcome back, {user?.email?.split('@')[0] || 'User'}!
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              Your AI-Powered
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Workspace</span>
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Access all your AI tools in one place. Chat, analyze, create, and innovate with cutting-edge artificial intelligence.
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer" onClick={() => navigate('/chat')}>
              <div className="flex items-center justify-between mb-2">
                <MessageSquare className="w-8 h-8 text-blue-500" />
                <Zap className="w-5 h-5 text-blue-400" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{stats.chatCount}</div>
              <div className="text-sm text-gray-600">Chat Conversations</div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer" onClick={() => navigate('/documents')}>
              <div className="flex items-center justify-between mb-2">
                <FileText className="w-8 h-8 text-emerald-500" />
                <Brain className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{stats.documentCount}</div>
              <div className="text-sm text-gray-600">Documents Analyzed</div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer" onClick={() => navigate('/images')}>
              <div className="flex items-center justify-between mb-2">
                <Image className="w-8 h-8 text-purple-500" />
                <Sparkles className="w-5 h-5 text-purple-400" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                <span className="text-purple-600">New!</span>
              </div>
              <div className="text-sm text-gray-600">AI Image Generation</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bento Grid Section */}
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Your AI Tools</h2>
          <p className="text-gray-600">Explore powerful features designed to enhance your productivity</p>
        </div>
        
        <div onClick={(e) => {
          const target = e.target as HTMLElement;
          const card = target.closest('[class*="group relative"]') as HTMLElement;
          if (!card) return;
          
          const index = Array.from(card.parentElement?.children || []).indexOf(card);
          const routes = ['/chat', '/documents', '/images', '/livecall'];
          if (isAdmin && index === 3) {
            // Scroll to admin section
            document.getElementById('admin-section')?.scrollIntoView({ behavior: 'smooth' });
          } else if (routes[index]) {
            navigate(routes[index]);
          }
        }}>
          <BentoGrid items={bentoItems} />
        </div>
      </div>

      {/* Admin Section */}
      {isAdmin && (
        <div id="admin-section" className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Admin Controls</h2>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
                <div className="p-6 border-b lg:border-b-0 lg:border-r border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold text-gray-900 text-lg">Users ({users.length})</h3>
                    <button
                      onClick={fetchData}
                      className="p-2 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all"
                      disabled={isRefreshing}
                    >
                      <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {users.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => fetchUserChats(u.id)}
                        className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                          selectedUser === u.id 
                            ? 'bg-blue-100 border-2 border-blue-500' 
                            : 'hover:bg-gray-100 border-2 border-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-gray-900 truncate">{u.full_name || u.email}</div>
                            <div className="text-sm text-gray-600 truncate">{u.email}</div>
                            <div className="text-xs text-gray-500 mt-1">Role: {u.role}</div>
                          </div>
                          <div className={`h-3 w-3 rounded-full flex-shrink-0 ${u.is_online ? 'bg-green-500' : 'bg-gray-300'}`} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-2 p-6">
                  {selectedUser ? (
                    <>
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="font-semibold text-gray-900 text-lg">Chat History</h3>
                        <button
                          onClick={() => setSelectedUser(null)}
                          className="text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-4 py-2 rounded-lg transition-all"
                        >
                          Close
                        </button>
                      </div>
                      <div className="space-y-4 max-h-[600px] overflow-y-auto">
                        {userChats.map((chat) => (
                          <div key={chat.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-all">
                            <div className="flex justify-between items-start">
                              <div className="flex-1 min-w-0 space-y-3">
                                <div>
                                  <span className="font-medium text-gray-900 text-sm">User:</span>
                                  <p className="text-gray-700 text-sm mt-1">{chat.message}</p>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-900 text-sm">AI:</span>
                                  <p className="text-gray-700 text-sm mt-1">{chat.response}</p>
                                </div>
                                <div className="text-xs text-gray-500">
                                  {new Date(chat.created_at).toLocaleString()}
                                </div>
                              </div>
                              <button
                                onClick={() => deleteUserChat(chat.id)}
                                className="ml-3 text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all"
                                title="Delete chat"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                        ))}
                        {userChats.length === 0 && (
                          <p className="text-gray-500 text-center py-12">No chat history available</p>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full min-h-[400px]">
                      <div className="text-center">
                        <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">Select a user to view their chat history</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}