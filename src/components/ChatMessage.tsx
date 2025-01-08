import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy } from 'lucide-react';

interface ChatMessageProps {
  content: string;
  isUser: boolean;
}

export default function ChatMessage({ content, isUser }: ChatMessageProps) {
  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`rounded-lg py-2 px-4 max-w-[80%] ${
        isUser ? 'bg-blue-100' : 'bg-gray-100'
      }`}>
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
                      className="absolute top-2 right-2 p-1 rounded bg-gray-700 text-white hover:bg-gray-600"
                      title="Copy code"
                    >
                      <Copy size={16} />
                    </button>
                    <SyntaxHighlighter
                      language={match[1]}
                      style={vscDarkPlus}
                      PreTag="div"
                      className="rounded-md"
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
      </div>
    </div>
  );
}