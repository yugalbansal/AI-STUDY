import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowDown,
  FileText,
  Image,
  Images,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Phone,
  Plus,
  Sparkles,
  X,
} from 'lucide-react';

import ChatMessage from '../components/ChatMessage';
import { DarkModeToggle } from '../components/DarkModeToggle';
import ChatSidebar from '../components/ui/chat-sidebar';
import { PureMultimodalInput } from '../components/ui/multimodal-ai-chat-input';
import { useClerkAuth } from '../contexts/ClerkAuthContext';
import { usePuterToken } from '../components/PuterGate';
import { captionImages, chatService } from '../lib/chatService';
import { parseDocument } from '../lib/documentParser';
import { saveGeneratedImageRecord } from '../lib/generatedImages';
import { createGeneratedImageRequest } from '../lib/imageGeneration';
import { vectorSearchService } from '../lib/vectorSearch';

interface Chat {
  id: string;
  title: string;
  created_at: string;
  user_id: string;
}

interface ChatAttachment {
  url: string;
  name: string;
  contentType: string;
  size?: number;
}

interface Message {
  id: string;
  chat_id: string;
  user_id: string;
  message: string;
  response: string;
  created_at: string;
  attachments?: ChatAttachment[] | null;
  replyTo?: string | null;
  reply_to?: string | null;
}

interface Attachment {
  url: string;
  name: string;
  contentType: string;
  size: number;
}

function getImagePrompt(input: string): string | null {
  const trimmed = input.trim();
  const match = trimmed.match(/^\/image(?:\s+([\s\S]+))?$/i);
  return match ? (match[1] || '').trim() : null;
}

function buildGeneratedImageResponse(prompt: string, imageUrl: string, model: string, seed: number): string {
  return [
    `Generated image for: **${prompt}**`,
    '',
    `![Generated image](${imageUrl})`,
    '',
    `Model: \`${model}\` | Seed: \`${seed}\``,
  ].join('\n');
}

function buildChatTitle(input?: string): string {
  const clean = input?.trim().replace(/\s+/g, ' ') || '';
  if (clean) {
    return clean.length > 54 ? `${clean.slice(0, 51)}...` : clean;
  }

  return `Chat ${new Date().toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  })}`;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Could not read attachment'));
      }
    };
    reader.onerror = () => reject(new Error('Could not read attachment'));
    reader.readAsDataURL(blob);
  });
}

function isDesktopViewport() {
  return typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;
}

function IconNavButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
    >
      {children}
    </button>
  );
}

function CollapsedRail({
  chats,
  currentChat,
  onOpen,
  onNewChat,
  onSelectChat,
  onNavigate,
}: {
  chats: Chat[];
  currentChat: string | null;
  onOpen: () => void;
  onNewChat: () => void;
  onSelectChat: (chatId: string) => void;
  onNavigate: (path: string) => void;
}) {
  return (
    <div className="hidden h-full w-[72px] flex-col items-center border-r border-zinc-200 bg-zinc-50/95 py-3 dark:border-zinc-800 dark:bg-zinc-950 lg:flex">
      <button
        type="button"
        onClick={onOpen}
        aria-label="Open sidebar"
        title="Open sidebar"
        className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-200/70 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
      >
        <Menu className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={onNewChat}
        aria-label="New chat"
        title="New chat"
        className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-900 text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
      >
        <Plus className="h-5 w-5" />
      </button>

      <div className="mb-3 flex flex-col gap-1">
        <IconNavButton label="Dashboard" onClick={() => onNavigate('/dashboard')}>
          <LayoutDashboard className="h-5 w-5" />
        </IconNavButton>
        <IconNavButton label="Images" onClick={() => onNavigate('/images')}>
          <Image className="h-5 w-5" />
        </IconNavButton>
        <IconNavButton label="Generated images" onClick={() => onNavigate('/generated-images')}>
          <Images className="h-5 w-5" />
        </IconNavButton>
      </div>

      <div className="min-h-0 w-full flex-1 overflow-y-auto px-2 scrollbar-mobile">
        <div className="flex flex-col gap-1">
          {chats.slice(0, 14).map((chat) => (
            <button
              key={chat.id}
              type="button"
              onClick={() => onSelectChat(chat.id)}
              title={chat.title}
              aria-label={chat.title}
              className={`flex h-10 w-full items-center justify-center rounded-lg transition-colors ${
                currentChat === chat.id
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white'
              }`}
            >
              <MessageSquare className="h-5 w-5" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptyChat({ hasChat }: { hasChat: boolean }) {
  return (
    <div className="flex min-h-full items-center justify-center px-4 py-10">
      <div className="mx-auto max-w-xl text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-sm dark:bg-white dark:text-zinc-950">
          <Sparkles className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-normal text-zinc-950 dark:text-white sm:text-3xl">
          {hasChat ? 'What should we explore?' : 'Start a new Vector Mind chat'}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-500 dark:text-zinc-400 sm:text-base">
          Ask about your documents, attach images, or use /image to generate visuals directly in the conversation.
        </p>
      </div>
    </div>
  );
}

export default function Chat() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedChatId = searchParams.get('chat');
  const { user, userId, supabase, loading: authLoading } = useClerkAuth();
  const { puterToken } = usePuterToken();

  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [replyContext, setReplyContext] = useState('');
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => (
    typeof window === 'undefined' ? true : window.matchMedia('(min-width: 1024px)').matches
  ));

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const shouldStickToBottomRef = useRef(true);
  const scrollFrameRef = useRef<number | null>(null);
  const activeRequestRef = useRef<number | null>(null);

  const currentChatTitle = useMemo(() => {
    if (!currentChat) return 'New chat';
    return chats.find((chat) => chat.id === currentChat)?.title || 'Chat';
  }, [chats, currentChat]);

  const uiMessages = useMemo(() => (
    chatHistory.flatMap((chat) => [
      { id: `${chat.id}-user`, content: chat.message, role: 'user' },
      ...(chat.response ? [{ id: `${chat.id}-assistant`, content: chat.response, role: 'assistant' }] : []),
    ])
  ), [chatHistory]);

  const closeSidebarOnMobile = useCallback(() => {
    if (!isDesktopViewport()) {
      setIsSidebarOpen(false);
    }
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior });
    shouldStickToBottomRef.current = true;
    setShowScrollToBottom(false);
  }, []);

  const handleMessagesScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    shouldStickToBottomRef.current = distanceFromBottom < 180;
    setShowScrollToBottom(distanceFromBottom > 360);
  }, []);

  const fetchChats = useCallback(async () => {
    if (!supabase) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('chats')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const rows = (data || []) as Chat[];
      setChats(rows);
      setCurrentChat((previous) => {
        const requestedChat = requestedChatId ? rows.find((chat) => chat.id === requestedChatId) : null;
        if (requestedChat) return requestedChat.id;
        if (previous && rows.some((chat) => chat.id === previous)) return previous;
        return rows[0]?.id ?? null;
      });
    } catch {
      setError('Failed to load chats');
    } finally {
      setInitialLoading(false);
    }
  }, [requestedChatId, supabase]);

  const fetchChatHistory = useCallback(async (chatId: string) => {
    if (!supabase) return;

    try {
      setMessagesLoading(true);
      const { data, error: fetchError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      const loadedMessages = ((data || []) as Message[]).map((message) => ({
        ...message,
        replyTo: message.replyTo ?? message.reply_to ?? null,
      }));

      shouldStickToBottomRef.current = true;
      setChatHistory(loadedMessages);
    } catch {
      setError('Failed to load chat history');
    } finally {
      setMessagesLoading(false);
      setInitialLoading(false);
    }
  }, [supabase]);

  const createNewChat = useCallback(async (title?: string): Promise<string | null> => {
    if (!userId || !supabase) return null;

    try {
      const chatTitle = buildChatTitle(title);
      const { data, error: createError } = await supabase
        .from('chats')
        .insert([{ title: chatTitle, user_id: userId }])
        .select()
        .single();

      if (createError) throw createError;

      const createdChat = data as Chat;
      setChats((previous) => [createdChat, ...previous]);
      setCurrentChat(createdChat.id);
      setChatHistory([]);
      setReplyContext('');
      shouldStickToBottomRef.current = true;
      return createdChat.id;
    } catch {
      setError('Failed to create new chat');
      return null;
    }
  }, [supabase, userId]);

  const renameChat = useCallback(async (chatId: string, newTitle: string) => {
    if (!newTitle.trim() || !supabase) return;

    try {
      const nextTitle = newTitle.trim();
      const { error: renameError } = await supabase
        .from('chats')
        .update({ title: nextTitle })
        .eq('id', chatId);

      if (renameError) throw renameError;

      setChats((previous) => previous.map((chat) => (
        chat.id === chatId ? { ...chat, title: nextTitle } : chat
      )));
    } catch {
      setError('Failed to rename chat');
    }
  }, [supabase]);

  const deleteChat = useCallback(async (chatId: string) => {
    if (!supabase) return;

    try {
      await supabase.from('chat_messages').delete().eq('chat_id', chatId);
      await supabase.from('chats').delete().eq('id', chatId);

      setChats((previous) => {
        const remaining = previous.filter((chat) => chat.id !== chatId);
        if (currentChat === chatId) {
          setCurrentChat(remaining[0]?.id ?? null);
          setChatHistory([]);
        }
        return remaining;
      });
    } catch {
      setError('Failed to delete chat');
    }
  }, [currentChat, supabase]);

  const handleReplyWithSelection = useCallback((text: string) => {
    setReplyContext(text);
  }, []);

  const handleStopGenerating = useCallback(() => {
    activeRequestRef.current = null;
    setLoading(false);
    setIsTyping(false);
    setStatusMessage('');
  }, []);

  const handleSendMessage = useCallback(async ({ input, attachments: sentAttachments }: { input: string; attachments: Attachment[] }) => {
    if (loading || !userId || !supabase) return;

    const replyContextText = replyContext;
    const rawInput = input.trim();
    const hasContent = rawInput.length > 0 || sentAttachments.length > 0 || replyContextText.length > 0;
    if (!hasContent) return;

    const chatId = currentChat ?? await createNewChat(rawInput || 'New chat');
    if (!chatId) return;

    const requestId = Date.now();
    activeRequestRef.current = requestId;

    let userMessage = rawInput;
    if (!userMessage) {
      userMessage = replyContextText ? 'Continue' : 'Review these attachments';
    }

    const promptWithContext = replyContextText
      ? `Regarding your previous response:\n"${replyContextText}"\n\nCurrent question: ${userMessage}`
      : userMessage;

    const tempId = `temp-${requestId}`;
    const tempMessage: Message = {
      id: tempId,
      chat_id: chatId,
      user_id: userId,
      message: userMessage,
      response: '',
      created_at: new Date().toISOString(),
      attachments: sentAttachments,
      replyTo: replyContextText || null,
    };

    setLoading(true);
    setIsTyping(true);
    setError(null);
    setReplyContext('');
    setStatusMessage('Thinking...');
    shouldStickToBottomRef.current = true;
    setChatHistory((previous) => [...previous, tempMessage]);

    let streamedResponse = '';
    const isActive = () => activeRequestRef.current === requestId;

    try {
      const imagePrompt = getImagePrompt(userMessage);

      if (imagePrompt !== null) {
        if (!imagePrompt) {
          throw new Error('Please write an image prompt after /image.');
        }

        setStatusMessage('Generating image...');
        const generatedImage = createGeneratedImageRequest(imagePrompt);
        const response = buildGeneratedImageResponse(
          generatedImage.prompt,
          generatedImage.imageUrl,
          generatedImage.model,
          generatedImage.seed,
        );

        if (!isActive()) return;
        setChatHistory((previous) => previous.map((message) => (
          message.id === tempId ? { ...message, response } : message
        )));
        setStatusMessage('Saving image...');
        setIsTyping(false);

        const { data, error: insertError } = await supabase
          .from('chat_messages')
          .insert({
            chat_id: chatId,
            user_id: userId,
            message: userMessage,
            response,
            attachments: null,
            reply_to: replyContextText || null,
          })
          .select();

        if (insertError) throw insertError;
        if (!isActive()) return;

        const savedMessages = ((data || []) as Message[]).map((message) => ({
          ...message,
          replyTo: replyContextText || null,
        }));

        setChatHistory((previous) => [
          ...previous.filter((message) => message.id !== tempId),
          ...savedMessages,
        ]);

        const savedMessage = savedMessages[0];
        if (savedMessage) {
          saveGeneratedImageRecord(supabase, {
            user_id: userId,
            chat_id: chatId,
            message_id: savedMessage.id,
            prompt: generatedImage.prompt,
            enhanced_prompt: generatedImage.enhancedPrompt,
            image_url: generatedImage.imageUrl,
            model: generatedImage.model,
            seed: generatedImage.seed,
            width: generatedImage.width,
            height: generatedImage.height,
            source: 'chat',
          }).catch((saveError) => {
            console.warn('Generated image history was not saved:', saveError);
          });

          vectorSearchService.storeChatEmbedding(chatId, savedMessage.id, userId, userMessage, 'user').catch(() => {});
          vectorSearchService.storeChatEmbedding(chatId, savedMessage.id, userId, response, 'assistant').catch(() => {});
        }

        return;
      }

      const imageUrls: string[] = [];
      const processedAttachments: ChatAttachment[] = [];
      const attachmentNotes: string[] = [];

      if (sentAttachments.length > 0) {
        setStatusMessage('Reading attachments...');

        for (const attachment of sentAttachments) {
          let attachmentUrl = attachment.url;
          let blob: Blob | null = null;

          if (attachment.url.startsWith('blob:')) {
            const response = await fetch(attachment.url);
            if (!response.ok) {
              attachmentNotes.push(`Could not read ${attachment.name}.`);
              continue;
            }

            blob = await response.blob();
            attachmentUrl = await blobToDataUrl(blob);

            const filePath = `${userId}/uploads/${Date.now()}_${attachment.name}`;
            const { error: uploadError } = await supabase.storage
              .from('documents')
              .upload(filePath, blob, {
                cacheControl: '3600',
                upsert: false,
              });

            if (!uploadError) {
              let parsedContent = `Chat upload: ${attachment.name}`;
              
              if (!attachment.contentType.startsWith('image/')) {
                try {
                  const file = new File([blob], attachment.name, { type: attachment.contentType || 'application/octet-stream' });
                  parsedContent = await parseDocument(file);
                } catch (parseError) {
                  console.error('Error parsing document:', parseError);
                  parsedContent = `Chat upload: ${attachment.name}`;
                }
              }

              await supabase.from('documents').insert({
                title: attachment.name,
                content: parsedContent,
                type: 'file',
                user_id: userId,
                jsonl_file_path: filePath,
              });
            }
          }

          processedAttachments.push({
            url: attachmentUrl,
            name: attachment.name,
            contentType: attachment.contentType,
            size: attachment.size,
          });

          if (attachment.contentType.startsWith('image/')) {
            if (attachmentUrl.startsWith('data:')) {
              imageUrls.push(attachmentUrl);
            } else {
              try {
                const imageResponse = await fetch(attachmentUrl);
                if (imageResponse.ok) {
                  imageUrls.push(await blobToDataUrl(await imageResponse.blob()));
                }
              } catch {
                attachmentNotes.push(`Image ${attachment.name} could not be converted for analysis.`);
              }
            }
          } else {
            try {
              const file = new File([blob!], attachment.name, { type: attachment.contentType || 'application/octet-stream' });
              const parsedContent = await parseDocument(file);
              attachmentNotes.push(`Document "${attachment.name}" content:\n${parsedContent}`);
            } catch {
              attachmentNotes.push(`Attached file: ${attachment.name} (${attachment.contentType || 'unknown type'}).`);
            }
          }
        }
      }

      let enhancedPrompt = promptWithContext;
      if (imageUrls.length > 0) {
        setStatusMessage('Analyzing images...');
        const captions = await captionImages(imageUrls);
        const imageDescriptions = captions.map((caption, index) => (
          `Image ${index + 1}: ${caption.caption}`
        )).join('\n');

        if (imageDescriptions) {
          enhancedPrompt = `I have ${imageUrls.length} image(s) attached:\n\n${imageDescriptions}\n\n---\n\n${enhancedPrompt}`;
        }
      }

      if (attachmentNotes.length > 0) {
        enhancedPrompt = `${attachmentNotes.join('\n')}\n\n${enhancedPrompt}`;
      }

      setStatusMessage('Generating response...');
      const response = await chatService.generateResponse(
        enhancedPrompt,
        (chunk: string) => {
          if (!isActive()) return;
          streamedResponse += chunk;
          setChatHistory((previous) => previous.map((message) => (
            message.id === tempId ? { ...message, response: streamedResponse } : message
          )));
        },
        (_stage, message) => {
          if (isActive()) setStatusMessage(message);
        },
        userId,
        chatId,
        undefined,
        puterToken || undefined,
      );

      if (!isActive()) return;
      setStatusMessage('Saving response...');
      setIsTyping(false);

      const { data, error: insertError } = await supabase
        .from('chat_messages')
        .insert({
          chat_id: chatId,
          user_id: userId,
          message: userMessage,
          response,
          attachments: processedAttachments.length > 0 ? processedAttachments : null,
          reply_to: replyContextText || null,
        })
        .select();

      if (insertError) throw insertError;
      if (!isActive()) return;

      const savedMessages = ((data || []) as Message[]).map((message) => ({
        ...message,
        replyTo: replyContextText || null,
      }));

      setChatHistory((previous) => [
        ...previous.filter((message) => message.id !== tempId),
        ...savedMessages,
      ]);

      const savedMessage = savedMessages[0];
      if (savedMessage) {
        vectorSearchService.storeChatEmbedding(chatId, savedMessage.id, userId, userMessage, 'user').catch(() => {});
        vectorSearchService.storeChatEmbedding(chatId, savedMessage.id, userId, response, 'assistant').catch(() => {});
      }
    } catch (sendError) {
      if (!isActive()) return;

      let message = 'Unknown error';
      if (sendError instanceof Error) {
        message = sendError.message;
      } else if (sendError && typeof sendError === 'object' && 'message' in sendError) {
        message = String(sendError.message);
      }

      setError(`Failed to get response: ${message}`);
      setChatHistory((previous) => previous.filter((item) => item.id !== tempId));
    } finally {
      if (isActive()) {
        activeRequestRef.current = null;
      }
      setLoading(false);
      setIsTyping(false);
      setStatusMessage('');
    }
  }, [createNewChat, currentChat, loading, replyContext, supabase, userId]);

  useEffect(() => {
    if (!authLoading && userId && supabase) {
      void fetchChats();
    } else if (!authLoading) {
      setInitialLoading(false);
    }
  }, [authLoading, fetchChats, supabase, userId]);

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
    if (!currentChat) {
      setChatHistory([]);
      setMessagesLoading(false);
      return;
    }

    if (activeRequestRef.current !== null) {
      return;
    }

    void fetchChatHistory(currentChat);
  }, [currentChat, fetchChatHistory]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || !shouldStickToBottomRef.current) return;

    if (scrollFrameRef.current !== null) {
      cancelAnimationFrame(scrollFrameRef.current);
    }

    scrollFrameRef.current = requestAnimationFrame(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: loading || isTyping || messagesLoading ? 'auto' : 'smooth',
      });
      scrollFrameRef.current = null;
    });

    return () => {
      if (scrollFrameRef.current !== null) {
        cancelAnimationFrame(scrollFrameRef.current);
        scrollFrameRef.current = null;
      }
    };
  }, [chatHistory, isTyping, loading, messagesLoading, statusMessage]);

  const handleNewChat = useCallback(() => {
    if (loading || isTyping) {
      handleStopGenerating();
    }
    void createNewChat();
    closeSidebarOnMobile();
  }, [closeSidebarOnMobile, createNewChat, handleStopGenerating, isTyping, loading]);

  const selectChat = useCallback((chatId: string) => {
    if (loading || isTyping) {
      handleStopGenerating();
    }

    if (chatId === currentChat) {
      closeSidebarOnMobile();
      return;
    }

    setCurrentChat(chatId);
    setError(null);
    setReplyContext('');
    shouldStickToBottomRef.current = true;
    closeSidebarOnMobile();
  }, [closeSidebarOnMobile, currentChat, handleStopGenerating, isTyping, loading]);

  const assistantTypingOnly = isTyping && !chatHistory[chatHistory.length - 1]?.response;

  return (
    <>
      <Helmet>
        <title>AI Chat - Vector Mind AI</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="fixed inset-0 z-50 flex h-[100dvh] w-full overflow-hidden bg-white text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex h-full max-w-[88vw] transform-gpu transition-[width,transform] duration-200 ease-out lg:max-w-none ${
            isSidebarOpen
              ? 'w-80 translate-x-0'
              : '-translate-x-full lg:w-[72px] lg:translate-x-0'
          }`}
        >
          {isSidebarOpen ? (
            <ChatSidebar
              chats={chats}
              currentChat={currentChat}
              onSelectChat={selectChat}
              onCreateNewChat={handleNewChat}
              onRenameChat={renameChat}
              onDeleteChat={deleteChat}
              onClose={() => setIsSidebarOpen(false)}
              userEmail={user?.primaryEmailAddress?.emailAddress}
              userName={user?.firstName || user?.username}
            />
          ) : (
            <CollapsedRail
              chats={chats}
              currentChat={currentChat}
              onOpen={() => setIsSidebarOpen(true)}
              onNewChat={handleNewChat}
              onSelectChat={selectChat}
              onNavigate={navigate}
            />
          )}
        </aside>

        {isSidebarOpen && (
          <button
            type="button"
            aria-label="Close sidebar overlay"
            className="fixed inset-0 z-40 bg-zinc-950/40 backdrop-blur-[1px] lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <main
          className={`flex min-w-0 flex-1 flex-col transition-[padding-left] duration-200 ease-out ${
            isSidebarOpen ? 'lg:pl-80' : 'lg:pl-[72px]'
          }`}
        >
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 bg-white/90 px-3 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/90 sm:px-4">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800 lg:hidden"
                aria-label="Open sidebar"
              >
                <Menu className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={() => setIsSidebarOpen((open) => !open)}
                className="hidden h-10 w-10 items-center justify-center rounded-lg text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800 lg:flex"
                aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                title={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-zinc-950 dark:text-white sm:text-base">
                  {currentChatTitle}
                </div>
                <div className="hidden text-xs text-zinc-500 dark:text-zinc-400 sm:block">
                  {loading ? statusMessage || 'Generating response...' : `${chatHistory.length} saved ${chatHistory.length === 1 ? 'turn' : 'turns'}`}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <div className="hidden items-center gap-1 sm:flex">
                <IconNavButton label="Dashboard" onClick={() => navigate('/dashboard')}>
                  <LayoutDashboard className="h-5 w-5" />
                </IconNavButton>
                <IconNavButton label="Documents" onClick={() => navigate('/documents')}>
                  <FileText className="h-5 w-5" />
                </IconNavButton>
                <IconNavButton label="Images" onClick={() => navigate('/images')}>
                  <Image className="h-5 w-5" />
                </IconNavButton>
                <IconNavButton label="Live call" onClick={() => navigate('/livecall')}>
                  <Phone className="h-5 w-5" />
                </IconNavButton>
              </div>

              <DarkModeToggle />

              <button
                type="button"
                onClick={handleNewChat}
                className="ml-1 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New</span>
              </button>
            </div>
          </header>

          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950">
            <div
              ref={messagesContainerRef}
              onScroll={handleMessagesScroll}
              className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-0 scrollbar-mobile"
              style={{ WebkitOverflowScrolling: 'touch', scrollbarGutter: 'stable' }}
            >
              {initialLoading || messagesLoading ? (
                <div className="mx-auto flex h-full max-w-3xl flex-col gap-5 px-4 py-8 sm:px-6">
                  <div className="h-20 w-2/3 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
                  <div className="ml-auto h-14 w-1/2 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
                  <div className="h-32 w-full animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
                </div>
              ) : chatHistory.length === 0 ? (
                <EmptyChat hasChat={Boolean(currentChat)} />
              ) : (
                <div className="mx-auto w-full max-w-3xl px-3 py-5 sm:px-6 sm:py-8">
                  {chatHistory.map((chat) => (
                    <div
                      key={chat.id}
                      className="min-w-0"
                      style={{ contentVisibility: 'auto', containIntrinsicSize: '1px 260px' }}
                    >
<ChatMessage
                          key={`user-${chat.id}`}
                          content={chat.message}
                          isUser
                          attachments={chat.attachments ?? undefined}
                          replyTo={chat.replyTo || null}
                        />
                        {chat.response && (
                          <ChatMessage
                            key={`assistant-${chat.id}`}
                            content={chat.response}
                            isUser={false}
                            onReplyWithSelection={handleReplyWithSelection}
                          />
                        )}
                    </div>
                  ))}

                  {assistantTypingOnly && (
                    <ChatMessage content="" isUser={false} isTyping />
                  )}

                  {isTyping && statusMessage && (
                    <div className="ml-11 mt-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      {statusMessage}
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="mx-auto w-full max-w-3xl px-3 pb-4 sm:px-6">
                  <div className="flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300">
                    <span>{error}</span>
                    <button
                      type="button"
                      onClick={() => setError(null)}
                      className="rounded-md p-1 transition-colors hover:bg-red-100 dark:hover:bg-red-950"
                      aria-label="Dismiss error"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {showScrollToBottom && (
              <button
                type="button"
                onClick={() => scrollToBottom('smooth')}
                className="absolute bottom-[calc(80px+env(safe-area-inset-bottom))] left-1/2 z-10 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 shadow-lg transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                aria-label="Scroll to latest message"
                title="Scroll to latest message"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
            )}

            <footer className="shrink-0 border-t border-zinc-200 bg-white/95 px-3 pb-[env(safe-area-inset-bottom)] pt-3 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/95 sm:px-4">
              <div className="mx-auto max-w-full sm:max-w-3xl">
                {replyContext && (
                  <div className="mb-2 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900 dark:border-blue-900/70 dark:bg-blue-950/30 dark:text-blue-100">
                    <MessageSquare className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">Replying to selection</div>
                      <p className="mt-0.5 line-clamp-2 text-blue-800/80 dark:text-blue-100/75">{replyContext}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReplyContext('')}
                      className="rounded-md p-1 transition-colors hover:bg-blue-100 dark:hover:bg-blue-900"
                      aria-label="Clear reply context"
                      title="Clear reply context"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                <PureMultimodalInput
                  chatId={currentChat ?? 'new-chat'}
                  messages={uiMessages}
                  attachments={attachments}
                  setAttachments={setAttachments}
                  onSendMessage={handleSendMessage}
                  onStopGenerating={handleStopGenerating}
                  isGenerating={loading}
                  canSend={!messagesLoading && Boolean(userId && supabase)}
                  selectedVisibilityType="private"
                />
              </div>
            </footer>
          </div>
        </main>
      </div>
    </>
  );
}
