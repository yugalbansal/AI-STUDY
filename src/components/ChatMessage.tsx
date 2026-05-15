import React, { useState, useRef, useEffect, memo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Bot, User, FileText, Check, MessageSquare } from 'lucide-react';

interface ChatMessageProps {
  content: string;
  isUser: boolean;
  isTyping?: boolean;
  onReplyWithSelection?: (selectedText: string) => void;
  attachments?: MessageAttachment[];
  replyTo?: string | null;
}

type MessageAttachment = { url: string; name: string; contentType: string };

type SelectionPopoverState = {
  x: number;
  y: number;
  text: string;
  copied?: boolean;
  placement: 'floating' | 'bottom';
};

const MessageAttachments = memo(function MessageAttachments({ attachments }: { attachments: MessageAttachment[] }) {
  if (attachments.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {attachments.map((att, idx) => (
        att.contentType.startsWith('image/') ? (
          <img
            key={idx}
            src={att.url}
            alt={att.name || 'Attached image'}
            className="max-w-full sm:max-w-[300px] max-h-[300px] rounded-lg object-contain"
          />
        ) : (
          <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm">
            <FileText size={16} />
            <span>{att.name}</span>
          </div>
        )
      ))}
    </div>
  );
});

const TypingIndicator = memo(function TypingIndicator() {
  return (
    <div className="flex flex-col gap-2 py-2">
      <div className="flex space-x-1.5">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '400ms' }} />
      </div>
      <span className="text-xs text-gray-400 italic">Thinking...</span>
    </div>
  );
});

const MarkdownMessage = memo(function MarkdownMessage({
  content,
  onCopyCode,
}: {
  content: string;
  onCopyCode: (code: string) => void;
}) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      className="min-w-0 max-w-full overflow-hidden text-sm sm:text-base leading-relaxed [overflow-wrap:anywhere]"
      components={{
        code({ inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          const code = String(children).replace(/\n$/, '');

          if (!inline && match) {
            return (
              <div className="relative my-4 min-w-0 max-w-full overflow-x-auto">
                <button
                  onClick={() => onCopyCode(code)}
                  className="absolute top-2 right-2 p-1 rounded bg-gray-700 text-white hover:bg-gray-600 transition-colors z-10"
                  title="Copy code"
                >
                  <Copy size={16} />
                </button>
                <SyntaxHighlighter
                  language={match[1]}
                  style={vscDarkPlus}
                  PreTag="div"
                  className="rounded-md !mt-0 !max-w-full text-xs sm:text-sm"
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
        table({ children, ...props }) {
          return (
            <div className="max-w-full overflow-x-auto my-4">
              <table className="min-w-full w-max divide-y divide-gray-300 border border-gray-300 rounded-lg" {...props}>
                {children}
              </table>
            </div>
          );
        },
        thead({ children, ...props }) {
          return (
            <thead className="bg-gray-50 dark:bg-gray-800" {...props}>
              {children}
            </thead>
          );
        },
        tbody({ children, ...props }) {
          return (
            <tbody className="divide-y divide-gray-200 bg-white dark:bg-gray-900" {...props}>
              {children}
            </tbody>
          );
        },
        tr({ children, ...props }) {
          return (
            <tr className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors" {...props}>
              {children}
            </tr>
          );
        },
        th({ children, ...props }) {
          return (
            <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase" {...props}>
              {children}
            </th>
          );
        },
        td({ children, ...props }) {
          return (
            <td className="px-3 sm:px-4 py-3 text-sm text-gray-700 dark:text-gray-300" {...props}>
              {children}
            </td>
          );
        },
        ul({ children, ...props }) {
          return (
            <ul className="list-disc list-inside space-y-1 my-2 ml-2" {...props}>
              {children}
            </ul>
          );
        },
        ol({ children, ...props }) {
          return (
            <ol className="list-decimal list-inside space-y-1 my-2 ml-2" {...props}>
              {children}
            </ol>
          );
        },
        li({ children, ...props }) {
          return (
            <li className="text-sm leading-relaxed" {...props}>
              {children}
            </li>
          );
        },
        p({ children, ...props }) {
          return (
            <p className="my-2 leading-relaxed break-words" {...props}>
              {children}
            </p>
          );
        },
        h1({ children, ...props }) {
          return (
            <h1 className="text-lg sm:text-2xl leading-snug font-bold mt-3 sm:mt-4 mb-2 break-words" {...props}>
              {children}
            </h1>
          );
        },
        h2({ children, ...props }) {
          return (
            <h2 className="text-base sm:text-xl leading-snug font-bold mt-3 mb-2 break-words" {...props}>
              {children}
            </h2>
          );
        },
        h3({ children, ...props }) {
          return (
            <h3 className="text-base sm:text-lg leading-snug font-semibold mt-3 mb-1 break-words" {...props}>
              {children}
            </h3>
          );
        },
        blockquote({ children, ...props }) {
          return (
            <blockquote className="border-l-4 border-gray-300 pl-4 italic my-2 text-gray-600 dark:text-gray-400" {...props}>
              {children}
            </blockquote>
          );
        },
        strong({ children, ...props }) {
          return (
            <strong className="font-semibold text-gray-900 dark:text-gray-100" {...props}>
              {children}
            </strong>
          );
        },
        em({ children, ...props }) {
          return (
            <em className="italic" {...props}>
              {children}
            </em>
          );
        },
        hr({ ...props }) {
          return <hr className="my-4 border-t border-gray-300" {...props} />;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
});

function ChatMessageComponent({ content, isUser, isTyping, onReplyWithSelection, attachments, replyTo }: ChatMessageProps) {
  const [selectionPopover, setSelectionPopover] = useState<SelectionPopoverState | null>(null);
  const [copied, setCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const selectedRangeRef = useRef<Range | null>(null);

  // Ensure attachments is always an array
  const safeAttachments = attachments || [];

  const fallbackCopy = useCallback((text: string) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }, []);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        fallbackCopy(text);
      }
    } catch {
      fallbackCopy(text);
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [fallbackCopy]);

  const copyCode = useCallback((code: string) => {
    navigator.clipboard.writeText(code);
  }, []);

  const restoreSelection = useCallback(() => {
    const range = selectedRangeRef.current;
    if (!range || !contentRef.current?.contains(range.commonAncestorContainer)) return;

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, []);

  const handleSelectionEnd = useCallback(() => {
    if (isTyping) return;

    window.setTimeout(() => {
      const selection = window.getSelection();
      const selectedText = selection?.toString().trim();
      const selectionRange = selection?.rangeCount ? selection.getRangeAt(0) : null;

      if (
        selectedText &&
        selectedText.length > 0 &&
        selectionRange &&
        contentRef.current?.contains(selectionRange.commonAncestorContainer)
      ) {
        const rect = selectionRange.getBoundingClientRect();
        const isMobileToolbar = window.matchMedia('(max-width: 640px)').matches;
        const clampedX = Math.min(Math.max(rect.left + rect.width / 2, 88), window.innerWidth - 88);
        const clampedY = Math.min(Math.max(rect.top - 10, 86), window.innerHeight - 96);

        selectedRangeRef.current = selectionRange.cloneRange();
        setSelectionPopover({
          x: clampedX,
          y: clampedY,
          text: selectedText,
          placement: isMobileToolbar ? 'bottom' : 'floating',
        });
        requestAnimationFrame(restoreSelection);
      } else {
        setSelectionPopover(null);
      }
    }, 10);
  }, [isTyping, restoreSelection]);

  useEffect(() => {
    if (!selectionPopover) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!(event.target as HTMLElement).closest('.selection-popover')) {
        setSelectionPopover(null);
        selectedRangeRef.current = null;
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [selectionPopover]);

  useEffect(() => {
    if (!selectionPopover) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') {
        event.preventDefault();
        restoreSelection();
        void copyToClipboard(selectionPopover.text);
      }

      if (event.key === 'Escape') {
        setSelectionPopover(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectionPopover, restoreSelection, copyToClipboard]);

  const handleReplyWithSelection = () => {
    if (selectionPopover && onReplyWithSelection) {
      restoreSelection();
      onReplyWithSelection(selectionPopover.text);
      setSelectionPopover(null);
    }
  };

  const handleCopySelection = () => {
    if (!selectionPopover) return;

    restoreSelection();
    void copyToClipboard(selectionPopover.text);
    setSelectionPopover({ ...selectionPopover, copied: true });
    requestAnimationFrame(restoreSelection);
  };

  const keepSelectionActive = (event: React.MouseEvent | React.TouchEvent) => {
    event.stopPropagation();
    if ('button' in event) {
      event.preventDefault();
    }
    restoreSelection();
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 px-1 sm:px-0 relative group/animation w-full min-w-0 overflow-hidden`}>
      <div className={`flex items-start gap-2 min-w-0 ${
        isUser ? 'max-w-[92%] sm:max-w-[75%]' : 'w-full max-w-full sm:max-w-[75%]'
      }`}>
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
        }`}>
          {isUser ? <User size={18} /> : <Bot size={18} />}
        </div>
        <div className={`relative rounded-2xl py-3 px-3 sm:px-4 ${
          isUser ? 'bg-blue-100' : 'bg-gray-100'
        } ${isTyping ? 'min-w-[120px]' : ''} ${!isUser ? 'flex-1' : ''} min-w-0 max-w-full overflow-hidden select-text break-words`} ref={contentRef} onMouseUp={handleSelectionEnd} onTouchEnd={handleSelectionEnd}>
          {/* Copy button for AI messages */}
          {!isUser && !isTyping && content && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                void copyToClipboard(content);
              }}
              onTouchEnd={(event) => event.stopPropagation()}
              className="absolute -top-2 -right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-zinc-700 shadow-md opacity-100 md:opacity-0 md:group-hover/animation:opacity-100 transition-opacity duration-200 hover:bg-gray-100 dark:hover:bg-zinc-600 touch-manipulation"
              aria-label={copied ? "Copied response" : "Copy response"}
              title={copied ? "Copied!" : "Copy response"}
            >
              {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-gray-600 dark:text-gray-300" />}
            </button>
          )}
          {/* Reply preview - show above user's message */}
          {isUser && replyTo && (
            <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/40 border-l-4 border-blue-500 rounded-r-lg">
              <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">Replying to:</div>
              <p className="text-sm text-gray-700 dark:text-gray-300 italic line-clamp-2">"{replyTo}"</p>
            </div>
          )}
          {/* Display image attachments */}
          {safeAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {safeAttachments.map((att, idx) => (
                att.contentType.startsWith('image/') ? (
                  <img
                    key={idx}
                    src={att.url}
                    alt={att.name || 'Attached image'}
                    className="max-w-full sm:max-w-[300px] max-h-[300px] rounded-lg object-contain"
                  />
                ) : (
                  <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm">
                    <FileText size={16} />
                    <span>{att.name}</span>
                  </div>
                )
              ))}
            </div>
          )}
          {isTyping ? (
            <div className="flex flex-col gap-2 py-2">
              <div className="flex space-x-1.5">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '400ms' }} />
              </div>
              <span className="text-xs text-gray-400 italic">Thinking...</span>
            </div>
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              className="min-w-0 max-w-full overflow-hidden text-sm sm:text-base leading-relaxed [overflow-wrap:anywhere]"
              components={{
                code({ inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  const code = String(children).replace(/\n$/, '');
                  
                  if (!inline && match) {
                    return (
                      <div className="relative my-4 min-w-0 max-w-full overflow-x-auto">
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
                          className="rounded-md !mt-0 !max-w-full text-xs sm:text-sm"
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
                table({ children, ...props }) {
                  return (
                    <div className="max-w-full overflow-x-auto my-4">
                      <table className="min-w-full w-max divide-y divide-gray-300 border border-gray-300 rounded-lg" {...props}>
                        {children}
                      </table>
                    </div>
                  );
                },
                thead({ children, ...props }) {
                  return (
                    <thead className="bg-gray-50 dark:bg-gray-800" {...props}>
                      {children}
                    </thead>
                  );
                },
                tbody({ children, ...props }) {
                  return (
                    <tbody className="divide-y divide-gray-200 bg-white dark:bg-gray-900" {...props}>
                      {children}
                    </tbody>
                  );
                },
                tr({ children, ...props }) {
                  return (
                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors" {...props}>
                      {children}
                    </tr>
                  );
                },
                th({ children, ...props }) {
                  return (
                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase" {...props}>
                      {children}
                    </th>
                  );
                },
                td({ children, ...props }) {
                  return (
                    <td className="px-3 sm:px-4 py-3 text-sm text-gray-700 dark:text-gray-300" {...props}>
                      {children}
                    </td>
                  );
                },
                ul({ children, ...props }) {
                  return (
                    <ul className="list-disc list-inside space-y-1 my-2 ml-2" {...props}>
                      {children}
                    </ul>
                  );
                },
                ol({ children, ...props }) {
                  return (
                    <ol className="list-decimal list-inside space-y-1 my-2 ml-2" {...props}>
                      {children}
                    </ol>
                  );
                },
                li({ children, ...props }) {
                  return (
                    <li className="text-sm leading-relaxed" {...props}>
                      {children}
                    </li>
                  );
                },
                p({ children, ...props }) {
                  return (
                    <p className="my-2 leading-relaxed break-words" {...props}>
                      {children}
                    </p>
                  );
                },
                h1({ children, ...props }) {
                  return (
                    <h1 className="text-lg sm:text-2xl leading-snug font-bold mt-3 sm:mt-4 mb-2 break-words" {...props}>
                      {children}
                    </h1>
                  );
                },
                h2({ children, ...props }) {
                  return (
                    <h2 className="text-base sm:text-xl leading-snug font-bold mt-3 mb-2 break-words" {...props}>
                      {children}
                    </h2>
                  );
                },
                h3({ children, ...props }) {
                  return (
                    <h3 className="text-base sm:text-lg leading-snug font-semibold mt-3 mb-1 break-words" {...props}>
                      {children}
                    </h3>
                  );
                },
                blockquote({ children, ...props }) {
                  return (
                    <blockquote className="border-l-4 border-gray-300 pl-4 italic my-2 text-gray-600 dark:text-gray-400" {...props}>
                      {children}
                    </blockquote>
                  );
                },
                strong({ children, ...props }) {
                  return (
                    <strong className="font-semibold text-gray-900 dark:text-gray-100" {...props}>
                      {children}
                    </strong>
                  );
                },
                em({ children, ...props }) {
                  return (
                    <em className="italic" {...props}>
                      {children}
                    </em>
                  );
                },
                hr({ ...props }) {
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

      {/* Selection popover */}
      {selectionPopover && (
        <div
          className={`selection-popover fixed z-[80] bg-white dark:bg-zinc-800 shadow-xl rounded-lg border border-gray-200 dark:border-zinc-700 py-1 px-1 flex items-center gap-1 ${
            selectionPopover.placement === 'bottom'
              ? 'left-1/2 bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] -translate-x-1/2'
              : ''
          }`}
          style={selectionPopover.placement === 'floating' ? {
            left: `${selectionPopover.x}px`,
            top: `${selectionPopover.y}px`,
            transform: 'translate(-50%, -100%)',
          } : undefined}
          onMouseDown={keepSelectionActive}
          onTouchStart={keepSelectionActive}
        >
          <button
            onClick={handleCopySelection}
            onMouseDown={keepSelectionActive}
            onTouchStart={keepSelectionActive}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-700 rounded-md transition-colors"
            title="Copy selected text"
          >
            {selectionPopover.copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            <span>{selectionPopover.copied ? 'Copied' : 'Copy'}</span>
          </button>
          {!isUser && onReplyWithSelection && (
            <button
              onClick={handleReplyWithSelection}
              onMouseDown={keepSelectionActive}
              onTouchStart={keepSelectionActive}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded-md transition-colors"
              title="Reply with selected text"
            >
              <MessageSquare size={14} />
              <span>Reply</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Memoize for performance - only re-render when content/attachments change
export default memo(ChatMessageComponent, (prev, next) => {
  return (
    prev.content === next.content &&
    prev.isUser === next.isUser &&
    prev.isTyping === next.isTyping &&
    prev.replyTo === next.replyTo &&
    prev.attachments === next.attachments
  );
});
