import React, { useState, useEffect, useRef } from 'react';
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
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    fetchChatHistory();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isTyping]);

  async function fetchChatHistory() {
    try {
      const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setChatHistory(data || []);
    } catch (error) {
      console.error('Error fetching chat history:', error);
    }
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!message.trim() || loading) return;

    setLoading(true);
    const userMessage = message;
    setMessage('');
    setIsTyping(true);

    try {
      const { data: documents } = await supabase
        .from('documents')
        .select('content')
        .eq('user_id', user?.id);

      const context = documents?.map(doc => doc.content).join('\n') || '';
      
      const response = await getChatResponse(userMessage, context);

      const { error } = await supabase
        .from('chat_history')
        .insert([
          {
            user_id: user?.id,
            message: userMessage,
            response,
          },
        ]);

      if (error) throw error;
      
      await fetchChatHistory();
    } catch (error) {
      console.error('Error processing message:', error);
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

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-4rem)]">
      <div className="flex flex-col h-full bg-white">
        <div className="flex-1 overflow-y-auto py-4">
          {chatHistory.map((chat, index) => (
            <div key={index}>
              <ChatMessage content={chat.message} isUser={true} />
              <ChatMessage content={chat.response} isUser={false} />
            </div>
          ))}
          {isTyping && <ChatMessage content="" isUser={false} isTyping={true} />}
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
          </form>
        </div>
      </div>
    </div>
  );
}