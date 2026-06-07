import React, { useState, useRef, useEffect, memo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Bot, User, FileText, Check, MessageSquare, Download, Loader2, ChevronDown, Brain } from 'lucide-react';

type CodeProps = React.ComponentProps<'code'> & {
  inline?: boolean;
  className?: string;
};

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
    <div className="mb-3 flex flex-wrap gap-2">
      {attachments.map((att, idx) => (
        att.contentType.startsWith('image/') ? (
          <img
            key={idx}
            src={att.url}
            alt={att.name || 'Attached image'}
            className="max-h-[320px] max-w-full rounded-lg border border-zinc-200 object-contain dark:border-zinc-800 sm:max-w-[320px]"
          />
        ) : (
          <div key={idx} className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
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
        <div className="w-2 h-2 bg-zinc-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-zinc-500 rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
        <div className="w-2 h-2 bg-zinc-500 rounded-full animate-pulse" style={{ animationDelay: '400ms' }} />
      </div>
      <span className="text-xs text-zinc-400 italic">Thinking...</span>
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Thinking Block — Collapsible reasoning display                      */
/* ------------------------------------------------------------------ */

/**
 * Parse <think>...</think> tags from model output.
 * Returns { thinking, response } where thinking is the content inside
 * the tags and response is everything outside.
 */
function parseThinkingContent(content: string): { thinking: string; response: string } {
  // Match <think>...</think> (possibly with newlines inside)
  const thinkRegex = /<think>([\s\S]*?)<\/think>/gi;
  let thinking = '';
  let match;

  while ((match = thinkRegex.exec(content)) !== null) {
    thinking += (thinking ? '\n\n' : '') + match[1].trim();
  }

  // Remove all <think>...</think> blocks from the response
  const response = content.replace(thinkRegex, '').trim();

  // Also handle incomplete/streaming think tags (still open)
  // e.g., "<think>partial thinking..." with no closing tag
  const openThinkMatch = response.match(/<think>([\s\S]*)$/i);
  if (openThinkMatch) {
    const partialThinking = openThinkMatch[1].trim();
    const cleanResponse = response.replace(/<think>[\s\S]*$/i, '').trim();
    return {
      thinking: (thinking ? thinking + '\n\n' : '') + partialThinking,
      response: cleanResponse,
    };
  }

  return { thinking, response };
}

const ThinkingBlock = memo(function ThinkingBlock({
  thinking,
  isStreaming,
}: {
  thinking: string;
  isStreaming?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (!thinking) return null;

  return (
    <div className="mb-3 rounded-xl border border-violet-200/60 dark:border-violet-800/40 bg-violet-50/50 dark:bg-violet-950/20 overflow-hidden transition-all duration-200">
      {/* Toggle header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left transition-colors hover:bg-violet-100/50 dark:hover:bg-violet-900/20"
      >
        <div className="flex h-5 w-5 items-center justify-center rounded-md bg-violet-100 dark:bg-violet-900/50">
          {isStreaming ? (
            <div className="h-2.5 w-2.5 rounded-full bg-violet-500 animate-pulse" />
          ) : (
            <Brain className="h-3 w-3 text-violet-600 dark:text-violet-400" />
          )}
        </div>
        <span className="flex-1 text-xs font-semibold text-violet-700 dark:text-violet-300">
          {isStreaming ? 'Thinking...' : 'Thought Process'}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-violet-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Collapsible content */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="border-t border-violet-200/40 dark:border-violet-800/30 px-3.5 py-3 max-h-[500px] overflow-y-auto scrollbar-thin">
          <div className="text-xs leading-relaxed text-violet-800/80 dark:text-violet-300/70 whitespace-pre-wrap font-mono">
            {thinking}
          </div>
        </div>
      </div>
    </div>
  );
});

function getPointerPoint(event: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) {
  if ('changedTouches' in event && event.changedTouches.length > 0) {
    return { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY };
  }

  if ('clientX' in event) {
    return { x: event.clientX, y: event.clientY };
  }

  return null;
}

function MarkdownImage({ src, alt }: { src?: string; alt?: string }) {
  const imageSrc = typeof src === 'string' ? src.trim().replace(/^<|>$/g, '') : '';
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
    setHasFailed(false);
  }, [imageSrc]);

  if (!imageSrc) return null;

  return (
    <span className="my-3 block w-full max-w-xs overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:max-w-sm">
      <span className="relative block aspect-square w-full overflow-hidden bg-zinc-100 dark:bg-zinc-950">
        {/* referrerPolicy="no-referrer" prevents the browser from sending the
            Referer header — Pollinations.ai returns 403 when it sees a Referer.
            Opening in a new tab works because there's no Referer on navigation. */}
        <img
          src={imageSrc}
          alt={alt || 'Generated image'}
          referrerPolicy="no-referrer"
          className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-300 ${isLoaded && !hasFailed ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasFailed(true)}
        />

        {!isLoaded && !hasFailed && (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 text-center bg-zinc-100 dark:bg-zinc-950">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm dark:bg-zinc-900">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-700 dark:text-zinc-200" />
            </span>
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Generating image…</span>
          </span>
        )}

        {hasFailed && (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center bg-zinc-100 dark:bg-zinc-950">
            <span className="text-2xl">🖼️</span>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">Image could not be loaded.</span>
            <a
              href={imageSrc}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 underline hover:text-blue-700"
            >
              Open in browser
            </a>
          </span>
        )}
      </span>

      <span className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        <span className="min-w-0 truncate">{alt || 'Generated image'}</span>
        <a
          href={imageSrc}
          download={alt || 'generated-image'}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
          onClick={(event) => event.stopPropagation()}
        >
          <Download size={13} />
          Download
        </a>
      </span>
    </span>
  );
}

const MarkdownMessage = memo(function MarkdownMessage({
  content,
  onCopyCode,
  isUser,
}: {
  content: string;
  onCopyCode: (code: string) => void;
  isUser?: boolean;
}) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      className={`min-w-0 max-w-full overflow-hidden text-sm leading-7 [overflow-wrap:anywhere] sm:text-[15px] ${isUser ? 'text-white' : 'text-zinc-800 dark:text-zinc-100'}`}
      components={{
        code(props) {
          const { inline, className, children, ...codeProps } = props as CodeProps;
          const match = /language-(\w+)/.exec(className || '');
          const code = String(children).replace(/\n$/, '');

          if (!inline && match) {
            return (
              <div className="relative my-4 min-w-0 max-w-full overflow-x-auto">
                <button
                  onClick={() => onCopyCode(code)}
                  className="absolute top-2 right-2 z-10 rounded bg-zinc-700 p-1 text-white transition-colors hover:bg-zinc-600"
                  title="Copy code"
                >
                  <Copy size={16} />
                </button>
                <SyntaxHighlighter
                  language={match[1]}
                  style={vscDarkPlus as Record<string, React.CSSProperties>}
                  PreTag="div"
                  className="rounded-md !mt-0 !max-w-full text-xs sm:text-sm"
                >
                  {code}
                </SyntaxHighlighter>
              </div>
            );
          }
          return inline ? (
            <code className="rounded bg-zinc-200 px-1.5 py-0.5 font-mono text-sm dark:bg-zinc-800" {...codeProps}>
              {children}
            </code>
          ) : (
            <code {...codeProps}>{children}</code>
          );
        },
        table({ children, ...props }) {
          return (
            <div className="my-4 max-w-full overflow-x-auto">
              <table className="w-max min-w-full divide-y divide-zinc-300 rounded-lg border border-zinc-300 dark:divide-zinc-700 dark:border-zinc-700" {...props}>
                {children}
              </table>
            </div>
          );
        },
        thead({ children, ...props }) {
          return (
            <thead className="bg-zinc-100 dark:bg-zinc-900" {...props}>
              {children}
            </thead>
          );
        },
        tbody({ children, ...props }) {
          return (
            <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950" {...props}>
              {children}
            </tbody>
          );
        },
        tr({ children, ...props }) {
          return (
            <tr className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900" {...props}>
              {children}
            </tr>
          );
        },
        th({ children, ...props }) {
          return (
            <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-zinc-900 dark:text-zinc-100 sm:px-4" {...props}>
              {children}
            </th>
          );
        },
        td({ children, ...props }) {
          return (
            <td className="px-3 py-3 text-sm text-zinc-700 dark:text-zinc-300 sm:px-4" {...props}>
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
            <blockquote className="my-2 border-l-4 border-zinc-300 pl-4 italic text-zinc-600 dark:border-zinc-700 dark:text-zinc-400" {...props}>
              {children}
            </blockquote>
          );
        },
        strong({ children, ...props }) {
          return (
            <strong className="font-semibold text-zinc-950 dark:text-zinc-50" {...props}>
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
          return <hr className="my-4 border-t border-zinc-300 dark:border-zinc-700" {...props} />;
        },
        img({ src, alt, ...props }) {
          void props;
          const imageSrc = typeof src === 'string' ? src : String(src || '');
          return <MarkdownImage src={imageSrc} alt={alt || 'Generated image'} />;
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
  const selectionStartedInsideRef = useRef(false);
  const selectionEndPointRef = useRef<{ x: number; y: number } | null>(null);

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
    void copyToClipboard(code);
  }, [copyToClipboard]);

  const restoreSelection = useCallback(() => {
    const range = selectedRangeRef.current;
    if (!range || !contentRef.current?.contains(range.commonAncestorContainer)) return;

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, []);

  const handleSelectionEnd = useCallback(() => {
    if (isTyping) return;
    selectionStartedInsideRef.current = false;

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
        const isMobileToolbar = window.matchMedia('(max-width: 640px)').matches;
        const rangeRect = selectionRange.getBoundingClientRect();
        
        // Use the selection end position directly from the range
        const anchorX = rangeRect.right;
        const anchorY = rangeRect.bottom;
        
        const toolbarHalfWidth = 48;
        const toolbarHeight = 36;
        const clampedX = Math.min(Math.max(anchorX, toolbarHalfWidth + 8), window.innerWidth - toolbarHalfWidth - 8);
        // Position below the selection, not constrained to a high minimum
        const clampedY = anchorY + 6;

        selectedRangeRef.current = selectionRange.cloneRange();
        requestAnimationFrame(() => {
          setSelectionPopover({
            x: clampedX,
            y: clampedY,
            text: selectedText,
            placement: isMobileToolbar ? 'bottom' : 'floating',
          });
          requestAnimationFrame(restoreSelection);
        });
      } else {
        setSelectionPopover(null);
      }
    }, 10);
  }, [isTyping, restoreSelection]);

  const handleSelectionStart = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    if ((event.target as HTMLElement).closest('button')) return;
    selectionEndPointRef.current = getPointerPoint(event);
    selectionStartedInsideRef.current = true;
  }, []);

  useEffect(() => {
    const handleDocumentSelectionEnd = (event: MouseEvent | TouchEvent) => {
      if (!selectionStartedInsideRef.current) return;

      selectionEndPointRef.current = getPointerPoint(event);
      selectionStartedInsideRef.current = false;
      handleSelectionEnd();
    };

    document.addEventListener('mouseup', handleDocumentSelectionEnd);
    document.addEventListener('touchend', handleDocumentSelectionEnd);
    return () => {
      document.removeEventListener('mouseup', handleDocumentSelectionEnd);
      document.removeEventListener('touchend', handleDocumentSelectionEnd);
    };
  }, [handleSelectionEnd]);

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
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-5 px-1 sm:px-0 relative group/animation w-full min-w-0 overflow-visible`}>
      <div className={`flex items-start gap-3 min-w-0 ${
        isUser ? 'max-w-[88%] sm:max-w-[72%]' : 'w-full max-w-full'
      }`}>
        <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
          isUser
            ? 'order-2 bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
            : 'bg-white text-zinc-600 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-800'
        }`}>
          {isUser ? <User size={18} /> : <Bot size={18} />}
        </div>
        <div className={`relative py-3 px-3 sm:px-4 ${
          isUser
            ? 'rounded-2xl bg-zinc-900 text-white dark:bg-zinc-800'
            : 'rounded-none bg-transparent'
        } ${isTyping ? 'min-w-[120px]' : ''} ${!isUser ? 'flex-1' : ''} min-w-0 max-w-full overflow-visible select-text break-words`}
          ref={contentRef}
          onMouseDown={handleSelectionStart}
          onTouchStart={handleSelectionStart}
          onMouseUp={handleSelectionEnd}
          onTouchEnd={handleSelectionEnd}
        >
          {!isUser && !isTyping && content && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                const { response } = parseThinkingContent(content);
                void copyToClipboard(response || content);
              }}
              onTouchEnd={(event) => event.stopPropagation()}
              className="absolute -top-1 right-0 z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 shadow-sm opacity-100 transition-opacity duration-200 hover:bg-zinc-100 hover:text-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white md:opacity-0 md:group-hover/animation:opacity-100 touch-manipulation"
              aria-label={copied ? "Copied response" : "Copy response"}
              title={copied ? "Copied!" : "Copy response"}
            >
              {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            </button>
          )}
          {isUser && replyTo && (
            <div className="mb-3 rounded-lg border-l-4 border-zinc-400 bg-white/10 p-2 dark:border-zinc-500">
              <div className="mb-1 text-xs font-medium text-zinc-200">Replying to</div>
              <p className="line-clamp-2 text-sm italic text-zinc-100/85">{replyTo}</p>
            </div>
          )}
          <MessageAttachments attachments={safeAttachments} />
          {isTyping ? (
            <TypingIndicator />
          ) : (() => {
            const { thinking, response } = parseThinkingContent(content);
            return (
              <>
                {thinking && <ThinkingBlock thinking={thinking} />}
                <MarkdownMessage content={response || content} onCopyCode={copyCode} isUser={isUser} />
              </>
            );
          })()}
        </div>
      </div>

      {/* Selection popover */}
      {selectionPopover && (
        <div
          className={`selection-popover fixed z-[80] bg-white dark:bg-zinc-900 shadow-xl rounded-lg border border-zinc-200 dark:border-zinc-800 py-1 px-1 flex items-center gap-1 ${
            selectionPopover.placement === 'bottom'
              ? 'left-1/2 bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] -translate-x-1/2'
              : ''
          }`}
          style={selectionPopover.placement === 'floating' ? {
            left: `${selectionPopover.x}px`,
            top: `${selectionPopover.y}px`,
            transform: 'translate(-50%, 0)',
          } : undefined}
          onMouseDown={keepSelectionActive}
          onTouchStart={keepSelectionActive}
        >
          <button
            onClick={handleCopySelection}
            onMouseDown={keepSelectionActive}
            onTouchStart={keepSelectionActive}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
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
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
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
