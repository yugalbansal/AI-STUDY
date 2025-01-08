import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { FileText, MessageSquare, Users, RefreshCw } from 'lucide-react';

interface User {
  id: string;
  email: string;
  full_name: string;
  last_seen: string;
  is_online: boolean;
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
          .from('chat_history')
          .select('id', { count: 'exact' })
          .eq('user_id', user?.id),
      ]);

      // Admin-specific data
      if (isAdmin) {
        const { count: userCount, data: userData } = await supabase
          .from('users')
          .select('*', { count: 'exact' });

        setStats({
          documentCount: documentsResponse.count || 0,
          chatCount: chatResponse.count || 0,
          userCount: userCount || 0,
        });
        setUsers(userData || []);
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
        .from('chat_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      setUserChats(data || []);
      setSelectedUser(userId);
    } catch (error) {
      console.error('Error fetching user chats:', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <button
          onClick={fetchData}
          className="flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Documents</dt>
                  <dd className="text-3xl font-semibold text-gray-900">{stats.documentCount}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <MessageSquare className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Chat Messages</dt>
                  <dd className="text-3xl font-semibold text-gray-900">{stats.chatCount}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                    <dd className="text-3xl font-semibold text-gray-900">{stats.userCount}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">User Management</h2>
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border-r">
                <h3 className="font-semibold mb-4">Users ({users.length})</h3>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {users.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => fetchUserChats(u.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg ${
                        selectedUser === u.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{u.full_name || u.email}</div>
                          <div className="text-sm text-gray-500">
                            Last seen: {new Date(u.last_seen).toLocaleString()}
                          </div>
                        </div>
                        <div className={`h-2 w-2 rounded-full ${u.is_online ? 'bg-green-500' : 'bg-gray-300'}`} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="col-span-2 p-4">
                {selectedUser ? (
                  <>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold">Chat History</h3>
                      <button
                        onClick={() => setSelectedUser(null)}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >
                        Close
                      </button>
                    </div>
                    <div className="space-y-4 max-h-[600px] overflow-y-auto">
                      {userChats.map((chat) => (
                        <div key={chat.id} className="border rounded-lg p-4">
                          <div className="mb-2">
                            <span className="font-medium">User:</span>
                            <p className="ml-2 text-gray-700">{chat.message}</p>
                          </div>
                          <div>
                            <span className="font-medium">AI:</span>
                            <p className="ml-2 text-gray-700">{chat.response}</p>
                          </div>
                          <div className="mt-2 text-sm text-gray-500">
                            {new Date(chat.created_at).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-gray-500 text-center">Select a user to view their chat history</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}