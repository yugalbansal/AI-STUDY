import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  const code = String(children).replace(/\n$/, '');
                  
                  if (!inline && match) {
                    return (
                      <div className="relative my-4">
                        <button
                          onClick={() => copyCode(code)}
                          className="absolute top-2 right-2 p-1 rounded bg-gray-700 text-white hover:bg-gray-600 transition-colors z-10"
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
                    <code className="bg-gray-200 dark:bg-gray-700 rounded px-1.5 py-0.5 text-sm font-mono" {...props}>
                      {children}
                    </code>
                  ) : (
                    <code {...props}>{children}</code>
                  );
                },
                table({ node, children, ...props }) {
                  return (
                    <div className="overflow-x-auto my-4">
                      <table className="min-w-full divide-y divide-gray-300 border border-gray-300 rounded-lg" {...props}>
                        {children}
                      </table>
                    </div>
                  );
                },
                thead({ node, children, ...props }) {
                  return (
                    <thead className="bg-gray-50 dark:bg-gray-800" {...props}>
                      {children}
                    </thead>
                  );
                },
                tbody({ node, children, ...props }) {
                  return (
                    <tbody className="divide-y divide-gray-200 bg-white dark:bg-gray-900" {...props}>
                      {children}
                    </tbody>
                  );
                },
                tr({ node, children, ...props }) {
                  return (
                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors" {...props}>
                      {children}
                    </tr>
                  );
                },
                th({ node, children, ...props }) {
                  return (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider" {...props}>
                      {children}
                    </th>
                  );
                },
                td({ node, children, ...props }) {
                  return (
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300" {...props}>
                      {children}
                    </td>
                  );
                },
                ul({ node, children, ordered, ...props }) {
                  return (
                    <ul className="list-disc list-inside space-y-1 my-2 ml-2" {...props}>
                      {children}
                    </ul>
                  );
                },
                ol({ node, children, ordered, ...props }) {
                  return (
                    <ol className="list-decimal list-inside space-y-1 my-2 ml-2" {...props}>
                      {children}
                    </ol>
                  );
                },
                li({ node, children, ...props }) {
                  return (
                    <li className="text-sm leading-relaxed" {...props}>
                      {children}
                    </li>
                  );
                },
                p({ node, children, ...props }) {
                  return (
                    <p className="my-2 leading-relaxed" {...props}>
                      {children}
                    </p>
                  );
                },
                h1({ node, children, ...props }) {
                  return (
                    <h1 className="text-2xl font-bold mt-4 mb-2" {...props}>
                      {children}
                    </h1>
                  );
                },
                h2({ node, children, ...props }) {
                  return (
                    <h2 className="text-xl font-bold mt-3 mb-2" {...props}>
                      {children}
                    </h2>
                  );
                },
                h3({ node, children, ...props }) {
                  return (
                    <h3 className="text-lg font-semibold mt-3 mb-1" {...props}>
                      {children}
                    </h3>
                  );
                },
                blockquote({ node, children, ...props }) {
                  return (
                    <blockquote className="border-l-4 border-gray-300 pl-4 italic my-2 text-gray-600 dark:text-gray-400" {...props}>
                      {children}
                    </blockquote>
                  );
                },
                strong({ node, children, ...props }) {
                  return (
                    <strong className="font-semibold text-gray-900 dark:text-gray-100" {...props}>
                      {children}
                    </strong>
                  );
                },
                em({ node, children, ...props }) {
                  return (
                    <em className="italic" {...props}>
                      {children}
                    </em>
                  );
                },
                hr({ node, ...props }) {
                  return (
                    <hr className="my-4 border-t border-gray-300" {...props} />
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