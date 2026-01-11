import { useEffect, useRef, useState } from "react";
import { Plus, Edit2, Trash2, MessageSquare, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Chat {
  id: string;
  title: string;
  created_at: string;
  user_id: string;
}

interface ChatSidebarProps {
  chats: Chat[];
  currentChat: string | null;
  onSelectChat: (chatId: string) => void;
  onCreateNewChat: () => void;
  onRenameChat: (chatId: string, newTitle: string) => void;
  onDeleteChat: (chatId: string) => void;
  onClose: () => void;
  userEmail?: string;
  userName?: string;
}

export default function ChatSidebar({
  chats,
  currentChat,
  onSelectChat,
  onCreateNewChat,
  onRenameChat,
  onDeleteChat,
  onClose,
  userEmail,
  userName,
}: ChatSidebarProps) {
  const navigate = useNavigate();
  const [editingChat, setEditingChat] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const profileRef = useRef<HTMLButtonElement | null>(null);
  const [isProfileActive, setIsProfileActive] = useState(false);

  useEffect(() => {
    const handleProfile = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileActive(false);
      }
    };
    document.addEventListener("click", handleProfile);
    return () => document.removeEventListener("click", handleProfile);
  }, []);

  const handleRename = (chatId: string) => {
    if (editTitle.trim()) {
      onRenameChat(chatId, editTitle.trim());
      setEditingChat(null);
      setEditTitle('');
    }
  };

  // Get user's first name or fallback to email prefix
  const displayName = userName || userEmail?.split('@')[0] || 'User';

  return (
    <nav className="h-full bg-white dark:bg-zinc-900 flex flex-col">
      <div className="flex flex-col h-full">
        {/* User Profile Header */}
        <div className="h-20 flex items-center px-4 border-b border-gray-200 dark:border-zinc-700 flex-shrink-0">
          <div className="w-full flex items-center gap-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <span className="block text-gray-700 dark:text-gray-300 text-sm font-semibold truncate">
                {displayName}
              </span>
              <span className="block mt-px text-gray-600 dark:text-gray-400 text-xs truncate">
                {userEmail || 'user@example.com'}
              </span>
            </div>

            <div className="relative flex-shrink-0">
              <button
                ref={profileRef}
                className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-800 active:bg-gray-100 dark:active:bg-zinc-700 transition-colors"
                onClick={() => setIsProfileActive((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={isProfileActive}
                aria-controls="profile-menu"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-5 h-5"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 3a.75.75 0 01.55.24l3.25 3.5a.75.75 0 11-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 01-1.1-1.02l3.25-3.5A.75.75 0 0110 3zm-3.76 9.2a.75.75 0 011.06.04l2.7 2.908 2.7-2.908a.75.75 0 111.1 1.02l-3.25 3.5a.75.75 0 01-1.1 0l-3.25-3.5a.75.75 0 01.04-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {isProfileActive && (
                <div
                  id="profile-menu"
                  role="menu"
                  className="absolute z-50 top-12 right-0 w-64 rounded-lg bg-white dark:bg-zinc-800 shadow-lg border border-gray-200 dark:border-zinc-700 text-sm text-gray-600 dark:text-gray-300"
                >
                  <div className="p-2 text-left">
                    <span className="block text-gray-500 dark:text-gray-400 p-2 text-xs truncate">
                      {userEmail}
                    </span>
                    <button 
                      onClick={() => navigate('/dashboard')}
                      className="block w-full p-2 text-left rounded-md hover:bg-gray-50 dark:hover:bg-zinc-700 active:bg-gray-100 dark:active:bg-zinc-600 duration-150"
                    >
                      Go to Dashboard
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Close button for mobile */}
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg touch-manipulation transition-colors flex-shrink-0 text-gray-700 dark:text-gray-300"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* New Chat Button */}
        <div className="px-4 pt-4 pb-2 flex-shrink-0">
          <button
            onClick={onCreateNewChat}
            className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 active:from-blue-800 active:to-blue-900 transition-all shadow-sm hover:shadow-md touch-manipulation"
          >
            <Plus className="w-5 h-5 mr-2 flex-shrink-0" />
            <span className="font-medium">New Chat</span>
          </button>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto px-2 min-h-0">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-3 py-2 mt-2">
            Recent Chats
          </div>
          
          {chats.length === 0 ? (
            <div className="text-center py-8 px-4">
              <MessageSquare className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No chats yet</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Create a new chat to get started</p>
            </div>
          ) : (
            <ul className="space-y-1 pb-4">
              {chats.map((chat) => (
                <li key={chat.id}>
                  <div
                    className={`group relative rounded-lg transition-all ${
                      currentChat === chat.id
                        ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-blue-500 dark:border-blue-600'
                        : 'hover:bg-gray-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {editingChat === chat.id ? (
                      <div className="p-2">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onBlur={() => handleRename(chat.id)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleRename(chat.id);
                            }
                          }}
                          className="w-full px-2 py-1 text-sm border border-blue-300 dark:border-blue-700 dark:bg-zinc-700 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <div className="flex items-center p-3">
                        <button
                          onClick={() => onSelectChat(chat.id)}
                          className="flex-1 flex items-center min-w-0 text-left"
                        >
                          <MessageSquare className="w-4 h-4 mr-3 flex-shrink-0 text-gray-400 dark:text-gray-500" />
                          <span className={`text-sm truncate ${
                            currentChat === chat.id
                              ? 'font-semibold text-gray-900 dark:text-white'
                              : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            {chat.title}
                          </span>
                        </button>
                        
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingChat(chat.id);
                              setEditTitle(chat.title);
                            }}
                            className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded transition-colors"
                            title="Rename chat"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm('Delete this chat?')) {
                                onDeleteChat(chat.id);
                              }
                            }}
                            className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/50 rounded transition-colors"
                            title="Delete chat"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-zinc-700 p-4 flex-shrink-0">
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Vector Mind AI
          </div>
        </div>
      </div>
    </nav>
  );
}
