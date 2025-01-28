import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Bot, User } from 'lucide-react';

interface ChatMessageProps {
  content: string;
  isUser: boolean;
  isTyping?: boolean;
}

export default function ChatMessage({ content, isUser, isTyping }: ChatMessageProps) {
  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 px-4 sm:px-0`}>
      <div className={`flex items-start space-x-2 max-w-[85%] sm:max-w-[75%]`}>
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
        }`}>
          {isUser ? <User size={18} /> : <Bot size={18} />}
        </div>
        <div className={`rounded-2xl py-3 px-4 ${
          isUser ? 'bg-blue-100' : 'bg-gray-100'
        }`}>
          {isTyping ? (
            <div className="flex space-x-2 py-2 px-1">
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          ) : (
            <ReactMarkdown
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  const code = String(children).replace(/\n$/, '');
                  
                  if (!inline && match) {
                    return (
                      <div className="relative">
                        <button
                          onClick={() => copyCode(code)}
                          className="absolute top-2 right-2 p-1 rounded bg-gray-700 text-white hover:bg-gray-600 transition-colors"
                          title="Copy code"
                        >
                          <Copy size={16} />
                        </button>
                        <SyntaxHighlighter
                          language={match[1]}
                          style={vscDarkPlus}
                          PreTag="div"
                          className="rounded-md !mt-0"
                          {...props}
                        >
                          {code}
                        </SyntaxHighlighter>
                      </div>
                    );
                  }
                  return inline ? (
                    <code className="bg-gray-200 rounded px-1" {...props}>
                      {children}
                    </code>
                  ) : (
                    <code {...props}>{children}</code>
                  );
                },
              }}
            >
              {content}
            </ReactMarkdown>
          )}
        </div>
      </div>
    </div>
  );
}