import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { FileText, MessageSquare, Users, RefreshCw, Trash2, Image } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/card';

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
      // Fetch basic stats
      const [documentsResponse, chatResponse] = await Promise.all([
        supabase
          .from('documents')
          .select('id', { count: 'exact' })
          .eq('user_id', user?.id),
        supabase
          .from('chat_messages')
          .select('id', { count: 'exact' })
          .eq('user_id', user?.id),
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Welcome header for mobile */}
      <div className="mb-6 md:hidden">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-white/60 text-sm mt-1">Welcome back, {user?.email?.split('@')[0]}</p>
      </div>
      
      <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 xl:grid-cols-3">
        <Card>
          <div className="p-4 sm:p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-5 sm:h-6 w-5 sm:w-6 text-white/60" />
              </div>
              <div className="ml-4 sm:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-white/60 truncate">Documents</dt>
                  <dd className="text-2xl sm:text-3xl font-semibold text-white">{stats.documentCount}</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-white/5 px-4 sm:px-5 py-3">
            <Link to="/documents" className="text-sm font-medium text-blue-400 hover:text-blue-300 touch-manipulation">
              View all documents
            </Link>
          </div>
        </Card>

        <Card>
          <div className="p-4 sm:p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <MessageSquare className="h-5 sm:h-6 w-5 sm:w-6 text-white/60" />
              </div>
              <div className="ml-4 sm:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-white/60 truncate">Chat Messages</dt>
                  <dd className="text-2xl sm:text-3xl font-semibold text-white">{stats.chatCount}</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-white/5 px-4 sm:px-5 py-3">
            <Link to="/chat" className="text-sm font-medium text-blue-400 hover:text-blue-300 touch-manipulation">
              Start a new chat
            </Link>
          </div>
        </Card>

        <Card>
          <div className="p-4 sm:p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Image className="h-5 sm:h-6 w-5 sm:w-6 text-white/60" />
              </div>
              <div className="ml-4 sm:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-white/60 truncate">AI Images</dt>
                  <dd className="text-2xl sm:text-3xl font-semibold text-white">
                    <span className="text-blue-400">New!</span>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-white/5 px-4 sm:px-5 py-3">
            <Link to="/images" className="text-sm font-medium text-blue-400 hover:text-blue-300 touch-manipulation">
              Generate images
            </Link>
          </div>
        </Card>

        {isAdmin && (
          <Card className="sm:col-span-2 xl:col-span-3">
            <div className="p-4 sm:p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-5 sm:h-6 w-5 sm:w-6 text-white/60" />
                </div>
                <div className="ml-4 sm:ml-5">
                  <h3 className="text-base sm:text-lg font-medium text-white">Total Users</h3>
                  <p className="text-2xl sm:text-3xl font-semibold text-white">{stats.userCount}</p>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>

      {isAdmin && (
        <div className="mt-6 sm:mt-8">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">User Management</h2>
          <div className="bg-white/10 backdrop-blur-md shadow rounded-lg overflow-hidden border border-white/10">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 lg:gap-4">
              <div className="p-4 border-b lg:border-b-0 lg:border-r border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-white">Users ({users.length})</h3>
                  <button
                    onClick={fetchData}
                    className="p-2 rounded-md text-white hover:text-blue-400 hover:bg-white/10 transition-all touch-manipulation"
                    disabled={isRefreshing}
                  >
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                <div className="space-y-2 max-h-[300px] lg:max-h-[600px] overflow-y-auto">
                  {users.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => fetchUserChats(u.id)}
                      className={`w-full text-left px-3 py-3 rounded-lg touch-manipulation transition-all ${
                        selectedUser === u.id ? 'bg-white/10 text-blue-400' : 'hover:bg-white/5 text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm truncate">{u.full_name || u.email}</div>
                          <div className="text-xs text-white/60 truncate">
                            {u.email}
                          </div>
                          <div className="text-xs text-white/40">
                            Role: {u.role}
                          </div>
                          <div className="text-xs text-white/40 hidden sm:block">
                            Last seen: {u.last_seen ? new Date(u.last_seen).toLocaleString() : 'Never'}
                          </div>
                        </div>
                        <div className={`h-2 w-2 rounded-full flex-shrink-0 ${u.is_online ? 'bg-green-500' : 'bg-gray-500'}`} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-2 p-4">
                {selectedUser ? (
                  <>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold text-white text-sm sm:text-base">Chat History</h3>
                      <button
                        onClick={() => setSelectedUser(null)}
                        className="text-sm text-white/60 hover:text-white hover:bg-white/10 px-3 py-1 rounded-md transition-all touch-manipulation"
                      >
                        Close
                      </button>
                    </div>
                    <div className="space-y-3 sm:space-y-4 max-h-[400px] lg:max-h-[600px] overflow-y-auto">
                      {userChats.map((chat) => (
                        <div key={chat.id} className="border border-white/10 rounded-lg p-3 sm:p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="mb-2">
                                <span className="font-medium text-white text-sm">User:</span>
                                <p className="ml-2 text-white/80 text-sm break-words">{chat.message}</p>
                              </div>
                              <div>
                                <span className="font-medium text-white text-sm">AI:</span>
                                <p className="ml-2 text-white/80 text-sm break-words">{chat.response}</p>
                              </div>
                              <div className="mt-2 text-xs text-white/40">
                                {new Date(chat.created_at).toLocaleString()}
                              </div>
                            </div>
                            <button
                              onClick={() => deleteUserChat(chat.id)}
                              className="ml-2 text-red-400 hover:text-red-300 hover:bg-white/10 p-2 rounded-md transition-all touch-manipulation flex-shrink-0"
                              title="Delete chat"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                      {userChats.length === 0 && (
                        <p className="text-white/60 text-center text-sm">No chat history available</p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-32 lg:h-64">
                    <p className="text-white/60 text-center text-sm">Select a user to view their chat history</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}