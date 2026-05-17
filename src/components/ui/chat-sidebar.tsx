import { useEffect, useMemo, useRef, useState } from "react";
import { Edit2, Image, Images, LayoutDashboard, MessageSquare, MoreHorizontal, Plus, Search, Trash2, X } from 'lucide-react';
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
  const [query, setQuery] = useState('');
  const [openMenuChat, setOpenMenuChat] = useState<string | null>(null);
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

  const displayName = userName || userEmail?.split('@')[0] || 'User';
  const filteredChats = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return chats;
    return chats.filter((chat) => chat.title.toLowerCase().includes(cleanQuery));
  }, [chats, query]);

  const closeOnMobile = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <nav className="h-full w-full border-r border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 flex flex-col">
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex h-14 shrink-0 items-center px-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="w-full flex items-center gap-x-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-sm font-semibold text-white dark:bg-white dark:text-zinc-950">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <span className="block text-zinc-950 dark:text-white text-sm font-semibold truncate">
                {displayName}
              </span>
              <span className="block mt-px text-zinc-500 dark:text-zinc-400 text-xs truncate">
                {userEmail || 'user@example.com'}
              </span>
            </div>

            <div className="relative flex-shrink-0">
              <button
                ref={profileRef}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-200/70 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
                onClick={() => setIsProfileActive((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={isProfileActive}
                aria-controls="profile-menu"
              >
                <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
              </button>

              {isProfileActive && (
                <div
                  id="profile-menu"
                  role="menu"
                  className="absolute z-50 top-10 right-0 w-64 rounded-lg bg-white dark:bg-zinc-900 shadow-xl border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-600 dark:text-zinc-300"
                >
                  <div className="p-2 text-left">
                    <span className="block text-zinc-500 dark:text-zinc-400 p-2 text-xs truncate">
                      {userEmail}
                    </span>
                    <button 
                      onClick={() => navigate('/dashboard')}
                      className="flex w-full items-center gap-2 p-2 text-left rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 duration-150"
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Go to Dashboard
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="lg:hidden flex h-8 w-8 items-center justify-center rounded-lg text-zinc-700 hover:bg-zinc-200/70 dark:text-zinc-300 dark:hover:bg-zinc-800 touch-manipulation transition-colors flex-shrink-0"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="shrink-0 space-y-2 px-3 py-3">
          <button
            onClick={() => {
              onCreateNewChat();
              closeOnMobile();
            }}
            className="w-full flex h-11 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 active:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 touch-manipulation"
          >
            <Plus className="w-5 h-5 flex-shrink-0" />
            <span>New chat</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                navigate('/images');
                closeOnMobile();
              }}
              className="flex h-10 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <Image className="w-4 h-4" />
              Images
            </button>
            <button
              onClick={() => {
                navigate('/generated-images');
                closeOnMobile();
              }}
              className="flex h-10 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <Images className="w-4 h-4" />
              Gallery
            </button>
          </div>

          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search chats"
              className="h-10 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-600"
            />
          </label>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="px-4 pb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Chats
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-mobile px-2" style={{ WebkitOverflowScrolling: 'touch' }}>
          {filteredChats.length === 0 ? (
            <div className="text-center py-8 px-4">
              <MessageSquare className="w-10 h-10 mx-auto text-zinc-300 dark:text-zinc-700 mb-3" />
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{query ? 'No matching chats' : 'No chats yet'}</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Create a chat to get started</p>
            </div>
          ) : (
            <ul className="space-y-1 pb-4">
              {filteredChats.map((chat) => (
                <li key={chat.id}>
                  <div
                    className={`group relative rounded-lg transition-colors duration-150 ${
                      currentChat === chat.id
                        ? 'bg-white shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800'
                        : 'hover:bg-white/80 dark:hover:bg-zinc-900/80'
                    }`}
                  >
                    {editingChat === chat.id ? (
                      <div className="p-2">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onBlur={() => handleRename(chat.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleRename(chat.id);
                            }
                            if (e.key === 'Escape') {
                              setEditingChat(null);
                              setEditTitle('');
                            }
                          }}
                          className="w-full h-9 px-2 text-sm border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <div className="flex items-center p-2">
                        <button
                          onClick={() => {
                            onSelectChat(chat.id);
                            closeOnMobile();
                          }}
                          className="flex min-w-0 flex-1 items-center rounded-md px-1 py-1.5 text-left"
                        >
                          <MessageSquare className="w-4 h-4 mr-2.5 flex-shrink-0 text-zinc-400 dark:text-zinc-500" />
                          <span className={`text-sm truncate ${
                            currentChat === chat.id
                              ? 'font-semibold text-zinc-950 dark:text-white'
                              : 'text-zinc-700 dark:text-zinc-300'
                          }`}>
                            {chat.title}
                          </span>
                        </button>
                        
                        <div className="relative flex-shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuChat((value) => value === chat.id ? null : chat.id);
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 opacity-100 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white sm:opacity-0 sm:group-hover:opacity-100"
                            title="Chat options"
                            aria-label="Chat options"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                          {openMenuChat === chat.id && (
                            <div className="absolute right-0 top-9 z-30 w-36 rounded-lg border border-zinc-200 bg-white p-1 text-sm shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingChat(chat.id);
                                  setEditTitle(chat.title);
                                  setOpenMenuChat(null);
                                }}
                                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                              >
                                <Edit2 className="h-4 w-4" />
                                Rename
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuChat(null);
                                  if (window.confirm('Delete this chat?')) {
                                    onDeleteChat(chat.id);
                                  }
                                }}
                                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          </div>
        </div>

        <div className="border-t border-zinc-200 dark:border-zinc-800 p-3 flex-shrink-0">
          <div className="text-xs text-zinc-500 dark:text-zinc-400 text-center">
            Vector Mind AI
          </div>
        </div>
      </div>
    </nav>
  );
}
