import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { getChatResponse } from '../lib/gemini';
import ChatMessage from '../components/ChatMessage';

export default function LiveCall() {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveCallEnabled, setLiveCallEnabled] = useState(false);

  const toggleLiveCall = () => {
    setLiveCallEnabled(!liveCallEnabled);
    if (!liveCallEnabled) {
      startContinuousSpeechRecognition();
    } else {
      stopContinuousSpeechRecognition();
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isTyping]);

  async function handleSubmit() {
    if (!message.trim() || loading || !user?.id) return;

    setLoading(true);
    setError(null);
    const userMessage = message;
    setMessage('');
    
    // Optimistically add user message to chat
    const tempId = Date.now().toString();
    setChatHistory(prev => [...prev, { 
      id: tempId, 
      user_id: user.id, 
      message: userMessage, 
      response: '', 
      created_at: new Date().toISOString() 
    }]);
    
    setIsTyping(true);

    try {
      // Get response from Gemini API
      const response = await getChatResponse(userMessage, '');

      // Save to database
      const { data, error } = await supabase
        .from('chat_history')
        .insert([
          {
            user_id: user?.id,
            message: userMessage,
            response,
          },
        ])
        .select();

      if (error) {
        console.error('Error saving chat:', error);
        throw error;
      }

      // Remove temporary message and add the real one from the database
      setChatHistory(prev => {
        const filtered = prev.filter(item => item.id !== tempId);
        return [...filtered, ...(data || [])];
      });

      // Speak the response if live call is enabled
      if (liveCallEnabled) {
        speakText(response);
      }
    } catch (error: any) {
      console.error('Error processing message:', error);
      setError(`Failed to get response: ${error.message || 'Unknown error'}`);
      
      // Remove the temporary message if there was an error
      setChatHistory(prev => prev.filter(item => item.id !== tempId));
    } finally {
      setLoading(false);
      setIsTyping(false);
    }
  }

  const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.lang = 'en-US';
  recognition.continuous = true;
  recognition.interimResults = false;

  recognition.onresult = (event) => {
    const transcript = event.results[event.results.length - 1][0].transcript;
    setMessage(transcript);
    handleSubmit();
  };

  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
  };

  const startContinuousSpeechRecognition = () => {
    recognition.start();
  };

  const stopContinuousSpeechRecognition = () => {
    recognition.stop();
  };

  const speakText = (text) => {
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    synth.speak(utterance);
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-4rem)]">
      <div className="flex flex-col h-full bg-white">
        <div className="flex-1 overflow-y-auto py-4">
          {chatHistory.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-8 max-w-md">
                <h2 className="text-xl font-semibold text-gray-700 mb-2">Welcome to AI Live Call</h2>
                <p className="text-gray-500 mb-4">
                  Speak to ask questions and get responses in real-time.
                </p>
              </div>
            </div>
          ) : (
            chatHistory.map((chat, index) => (
              <div key={chat.id || index}>
                <ChatMessage content={chat.message} isUser={true} />
                <ChatMessage content={chat.response} isUser={false} />
              </div>
            ))
          )}
          {isTyping && <ChatMessage content="" isUser={false} isTyping={true} />}
          {error && (
            <div className="mx-4 p-4 bg-red-50 text-red-700 rounded-md mb-4">
              {error}
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="border-t p-4">
          <button
            type="button"
            onClick={toggleLiveCall}
            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white ${liveCallEnabled ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 h-10 self-end transition-colors`}
          >
            {liveCallEnabled ? 'Stop Live Call' : 'Start Live Call'}
          </button>
        </div>
      </div>
    </div>
  );
}