'use client';

import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  type Dispatch,
  type SetStateAction,
  type ChangeEvent,
  memo,
} from 'react';

import equal from 'fast-deep-equal';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, Image, Loader2 as LoaderIcon, Paperclip, Sparkles, Square, X as XIcon } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { twMerge } from 'tailwind-merge';

type ClassNameValue = string | number | boolean | null | undefined;

const clsx = (...args: ClassNameValue[]) => args.filter(Boolean).join(' ');

// Type Definitions
interface Attachment {
  url: string;
  name: string;
  contentType: string;
  size: number;
}

interface UIMessage {
  id: string;
  content: string;
  role: string;
  attachments?: Attachment[];
}

type VisibilityType = 'public' | 'private' | 'unlisted' | string;

// Utility Functions
const cn = (...inputs: ClassNameValue[]) => {
  return twMerge(clsx(...inputs));
};

// Button variants using cva
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        // Primary: black background, white text
        default: 'bg-black text-white hover:bg-gray-800',
        // Destructive: high-contrast gray outline, black text
        destructive:
          'border border-black text-black hover:bg-gray-100',
        // Outline: grayscale border, white background, black text
        outline:
          'border border-gray-400 bg-white hover:bg-gray-100 hover:text-black',
        // Secondary: grayscale background, gray text
        secondary:
          'bg-gray-200 text-black hover:bg-gray-300',
        // Ghost: hover effect, default text color (should be black)
        ghost: 'text-black hover:bg-gray-100 hover:text-black', // Explicitly set text to black
        // Link: black text
        link: 'text-black underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

// Button component
interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? 'button' : 'button';

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

// Textarea component
const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<'textarea'>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        'flex min-h-[80px] w-full rounded-md border border-gray-400 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-base ring-offset-white dark:ring-offset-zinc-900 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-600 dark:focus-visible:ring-zinc-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm text-black dark:text-white',
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';

// Sub-Components

interface SuggestedActionsProps {
  chatId: string;
  onSelectAction: (action: string) => void;
  selectedVisibilityType: VisibilityType;
}

function PureSuggestedActions({
  onSelectAction,
}: SuggestedActionsProps) {
  const suggestedActions = [
    {
      title: 'Summarize my notes',
      label: 'into clear revision bullets',
      action: 'Summarize my uploaded notes into clear revision bullets.',
    },
    {
      title: 'Create an image',
      label: 'with /image cyber study desk',
      action: '/image futuristic study desk with holographic notes, clean cinematic lighting',
    },
    {
      title: 'Explain this concept',
      label: 'like a friendly tutor',
      action: 'Explain the hardest concept from my documents like a friendly tutor.',
    },
    {
      title: 'Make a quiz',
      label: 'from recent context',
      action: 'Make a short quiz from this chat and include answers after each question.',
    },
  ];

  return (
    <div
      data-testid="suggested-actions"
      className="grid pb-2 sm:grid-cols-2 gap-2 w-full"
    >
      <AnimatePresence>
      {suggestedActions.map((suggestedAction, index) => (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.05 * index }}
          key={`suggested-action-${index}`}
          className={index > 1 ? 'hidden sm:block' : 'block'}
        >
          <Button
            variant="ghost"
            onClick={() => onSelectAction(suggestedAction.action)}
            className="text-left border rounded-lg px-4 py-3 text-sm flex-1 gap-1 sm:flex-col w-full h-auto justify-start items-start
                       border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-950 dark:text-white hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            <span className="font-medium">{suggestedAction.title}</span>
            <span className="text-zinc-500 dark:text-zinc-400">
              {suggestedAction.label}
            </span>
          </Button>
        </motion.div>
      ))}
      </AnimatePresence>
    </div>
  );
}

const SuggestedActions = memo(
  PureSuggestedActions,
  (prevProps, nextProps) => {
    if (prevProps.chatId !== nextProps.chatId) return false;
    if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType)
      return false;
    return true;
  },
);


const PreviewAttachment = ({
  attachment,
  isUploading = false,
}: {
  attachment: Attachment;
  isUploading?: boolean;
}) => {
  const { name, url, contentType } = attachment;

  return (
    <div data-testid="input-attachment-preview" className="flex flex-col gap-1">
        <div className="w-20 h-16 aspect-video bg-zinc-100 dark:bg-zinc-800 rounded-lg relative flex flex-col items-center justify-center overflow-hidden border border-zinc-200 dark:border-zinc-700">
        {contentType?.startsWith('image/') && url ? (
          <img
            key={url}
            src={url}
            alt={name ?? 'An image attachment'}
            className="rounded-lg size-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center text-xs text-zinc-600 dark:text-zinc-300 text-center p-1">
             File: {name?.split('.').pop()?.toUpperCase() || 'Unknown'}
          </div>
        )}

        {isUploading && (
          <div
            data-testid="input-attachment-loader"
            className="animate-spin absolute text-zinc-500"
          >
            <LoaderIcon className="size-5" />
          </div>
        )}
      </div>
      <div className="text-xs text-zinc-600 dark:text-zinc-400 max-w-20 truncate">
        {name}
      </div>
    </div>
  );
};

function PureAttachmentsButton({
  fileInputRef,
  disabled,
}: {
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  disabled: boolean;
}) {
  return (
    <Button
      data-testid="attachments-button"
      className="h-9 w-9 rounded-lg border border-zinc-200 bg-white p-0 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
      onClick={(event) => {
        event.preventDefault();
        fileInputRef.current?.click();
      }}
      disabled={disabled}
      variant="ghost"
      aria-label="Attach files"
      title="Attach files"
    >
      <Paperclip className="h-4 w-4" />
    </Button>
  );
}

const AttachmentsButton = memo(PureAttachmentsButton, (prev, next) => prev.disabled === next.disabled);

function PureStopButton({ onStop }: { onStop: () => void }) {
  return (
    <Button
      data-testid="stop-button"
      className="h-9 w-9 rounded-lg border border-zinc-300 bg-white p-0 text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800"
      onClick={(event) => {
        event.preventDefault();
        onStop();
      }}
      aria-label="Stop generating"
      title="Stop generating"
    >
      <Square className="h-3.5 w-3.5 fill-current" />
    </Button>
  );
}

const StopButton = memo(PureStopButton, (prev, next) => prev.onStop === next.onStop);

function PureSendButton({
  submitForm,
  input,
  uploadQueue,
  attachments,
  canSend,
  isGenerating,
}: {
  submitForm: () => void;
  input: string;
  uploadQueue: Array<string>;
  attachments: Array<Attachment>;
  canSend: boolean;
  isGenerating: boolean;
}) {
  const isDisabled =
    uploadQueue.length > 0 ||
    !canSend ||
    isGenerating ||
    (input.trim().length === 0 && attachments.length === 0);

  return (
    <Button
      data-testid="send-button"
      className="h-9 w-9 rounded-lg bg-zinc-900 p-0 text-white hover:bg-zinc-700 disabled:bg-zinc-300 disabled:text-zinc-500 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
      onClick={(event) => {
        event.preventDefault();
        if (!isDisabled) {
          submitForm();
        }
      }}
      disabled={isDisabled}
      aria-label="Send message"
      title="Send message"
    >
      <ArrowUp className="h-4 w-4" />
    </Button>
  );
}

const SendButton = memo(PureSendButton, (prevProps, nextProps) => {
  if (prevProps.input !== nextProps.input) return false;
  if (prevProps.uploadQueue.length !== nextProps.uploadQueue.length) return false;
  if (prevProps.attachments.length !== nextProps.attachments.length) return false;
  if (prevProps.attachments.length > 0 && !equal(prevProps.attachments, nextProps.attachments)) return false;
  if (prevProps.canSend !== nextProps.canSend) return false;
  if (prevProps.isGenerating !== nextProps.isGenerating) return false;
  return true;
});

const animatedPlaceholders = [
  'Ask anything about your notes',
  'Use /image to generate an image',
  'Paste a screenshot for instant help',
  'Attach an image and ask what it shows',
  'Build a quiz from this chat',
];

// Main Component

interface MultimodalInputProps {
  chatId: string;
  messages: Array<UIMessage>;
  attachments: Array<Attachment>;
  setAttachments: Dispatch<SetStateAction<Array<Attachment>>>;
  onSendMessage: (params: { input: string; attachments: Attachment[] }) => void;
  onStopGenerating: () => void;
  isGenerating: boolean;
  canSend: boolean;
  className?: string;
  selectedVisibilityType: VisibilityType;
  initialInput?: string;
}

function PureMultimodalInput({
  chatId,
  messages,
  attachments,
  setAttachments,
  onSendMessage,
  onStopGenerating,
  isGenerating,
  canSend,
  className,
  selectedVisibilityType,
  initialInput = '',
}: MultimodalInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [input, setInput] = useState(initialInput);
  const [uploadQueue, setUploadQueue] = useState<Array<string>>([]);
  const [shouldAutoFocus, setShouldAutoFocus] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  // Update input when initialInput changes (for reply context)
  useEffect(() => {
    if (initialInput) {
      setInput(initialInput);
    }
  }, [initialInput]);

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const nextHeight = Math.min(textarea.scrollHeight, 192);
      textarea.style.height = `${nextHeight}px`;
    }
  };

  const resetHeight = useCallback(() => {
     const textarea = textareaRef.current;
      if (textarea) {
          textarea.style.height = 'auto';
          textarea.rows = 1;
          adjustHeight();
      }
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight();
    }
  }, [input]); // Depend only on input

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setShouldAutoFocus(window.matchMedia('(min-width: 1024px)').matches);
  }, []);

  useEffect(() => {
    if (!shouldAutoFocus) return;

    requestAnimationFrame(() => {
      textareaRef.current?.focus({ preventScroll: true });
    });
  }, [shouldAutoFocus]);

  useEffect(() => {
    if (input || attachments.length > 0 || uploadQueue.length > 0) return;

    const interval = window.setInterval(() => {
      setPlaceholderIndex((index) => (index + 1) % animatedPlaceholders.length);
    }, 2600);

    return () => window.clearInterval(interval);
  }, [input, attachments.length, uploadQueue.length]);

  // Handle paste events for images and videos
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];

      for (const item of items) {
        // Handle both images and videos
        if (item.type.startsWith('image/') || item.type.startsWith('video/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            files.push(file);
          }
        }
      }

      if (files.length > 0) {
        // Add to upload queue
        setUploadQueue(currentQueue => [...currentQueue, ...files.map(f => f.name)]);

        // Process each file
        for (const file of files) {
          const isVideo = file.type.startsWith('video/');
          const extension = isVideo ? 'mp4' : 'png';
          const defaultName = isVideo ? `pasted-video-${Date.now()}.${extension}` : `pasted-image-${Date.now()}.${extension}`;

          // Create blob URL for preview
          const blobUrl = URL.createObjectURL(file);
          const attachment: Attachment = {
            url: blobUrl,
            name: file.name || defaultName,
            contentType: file.type || (isVideo ? 'video/mp4' : 'image/png'),
            size: file.size,
          };

          setAttachments(current => [...current, attachment]);
          setUploadQueue(current => current.filter(name => name !== file.name));
        }
      }
    };

    textarea.addEventListener('paste', handlePaste);
    return () => textarea.removeEventListener('paste', handlePaste);
  }, []);

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
  };

  // Placeholder File Upload Function
  const uploadFile = async (file: File): Promise<Attachment | undefined> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        try {
          // Use URL.createObjectURL for client-side preview. Remember to revoke!
          const mockUrl = URL.createObjectURL(file);
          const mockAttachment: Attachment = {
            url: mockUrl,
            name: file.name,
            contentType: file.type || 'application/octet-stream',
            size: file.size,
          };
          resolve(mockAttachment);
        } catch (error) {
          console.error('MOCK: Failed to create object URL for preview:', error);
          resolve(undefined);
        } finally {
           // Remove file name from upload queue
           setUploadQueue(currentQueue => currentQueue.filter(name => name !== file.name));
        }
      }, 700); // Simulate delay
    });
  };

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      if (files.length === 0) return;

      // Add files to upload queue immediately by name
      setUploadQueue(currentQueue => [...currentQueue, ...files.map((file) => file.name)]);

      // Clear the file input value to allow selecting the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
      const validFiles = files.filter(file => file.size <= MAX_FILE_SIZE);
      const invalidFiles = files.filter(file => file.size > MAX_FILE_SIZE);

      if (invalidFiles.length > 0) {
         console.warn(`Skipped ${invalidFiles.length} files larger than ${MAX_FILE_SIZE / 1024 / 1024}MB.`);
         // Also remove invalid files from the upload queue
         setUploadQueue(currentQueue => currentQueue.filter(name => !invalidFiles.some(f => f.name === name)));
      }

      // Start uploads for valid files
      const uploadPromises = validFiles.map((file) => uploadFile(file));
      const uploadedAttachments = await Promise.all(uploadPromises);

      const successfullyUploadedAttachments = uploadedAttachments.filter(
        (attachment): attachment is Attachment => attachment !== undefined,
      );

      // Add successfully uploaded attachments to the main attachments list
      setAttachments((currentAttachments) => [
        ...currentAttachments,
        ...successfullyUploadedAttachments,
      ]);

    },
    [setAttachments, uploadFile],
  );

  const handleRemoveAttachment = useCallback(
    (attachmentToRemove: Attachment) => {
      // Revoke the object URL
      if (attachmentToRemove.url.startsWith('blob:')) {
         URL.revokeObjectURL(attachmentToRemove.url);
      }
      // Filter out the attachment
      setAttachments((currentAttachments) =>
        currentAttachments.filter(
          (attachment) => attachment.url !== attachmentToRemove.url || attachment.name !== attachmentToRemove.name
        )
      );
      // Focus the textarea
      textareaRef.current?.focus();
    },
    [setAttachments, textareaRef]
  );

  const submitForm = useCallback(() => {
    // Allow sending if there's input or attachments
    // Note: reply context is handled by parent component
    if (input.trim().length === 0 && attachments.length === 0) {
      console.warn('Please enter a message or add an attachment.');
      return;
    }

    // Store blob URLs before clearing
    const blobUrlsToRevoke = attachments.filter(att => att.url.startsWith('blob:')).map(att => att.url);

    onSendMessage({ input, attachments });

    // Clear input and attachments immediately
    setInput('');
    setAttachments([]);

    // Revoke blob URLs after a delay (allow time for message to be saved and displayed)
    setTimeout(() => {
      blobUrlsToRevoke.forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    }, 3000); // 3 second delay before cleanup

    resetHeight();
    textareaRef.current?.focus();

  }, [
    input,
    attachments,
    onSendMessage,
    setAttachments,
    textareaRef,
    resetHeight,
  ]);

  const showSuggestedActions = messages.length === 0 && attachments.length === 0 && uploadQueue.length === 0;

  const isAttachmentDisabled = isGenerating || uploadQueue.length > 0;

  return (
    <div className={cn("relative w-full flex flex-col gap-3", className)}>

      <AnimatePresence>
       {showSuggestedActions && (
         <motion.div
            key="suggested-actions-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
         >
            <SuggestedActions
              onSelectAction={(action) => {
                setInput(action);
                requestAnimationFrame(() => {
                     adjustHeight();
                     textareaRef.current?.focus();
                });
             }}
              chatId={chatId}
              selectedVisibilityType={selectedVisibilityType}
            />
         </motion.div>
       )}
      </AnimatePresence>


      {/* Hidden file input */}
      <input
        type="file"
        className="fixed -top-4 -left-4 size-0.5 opacity-0 pointer-events-none"
        ref={fileInputRef}
        multiple
        onChange={handleFileChange}
        tabIndex={-1}
        disabled={isAttachmentDisabled}
        accept="image/*,video/*,audio/*,.pdf" // Example mime types
      />

      {(attachments.length > 0 || uploadQueue.length > 0) && (
        <div
          data-testid="attachments-preview"
          className="flex flex-row gap-3 overflow-x-auto items-end pb-1 pl-1"
        >
          {attachments.map((attachment) => (
            <div key={attachment.url || attachment.name} className="relative group">
                <PreviewAttachment attachment={attachment} isUploading={false} />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-[-8px] right-[-8px] h-5 w-5 rounded-full p-0 flex items-center justify-center z-20 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemoveAttachment(attachment)}
                  aria-label={`Remove ${attachment.name}`}
                >
                   <XIcon className="size-3" />
                </Button>
            </div>
          ))}
          {uploadQueue.map((filename, index) => (
            <PreviewAttachment
              key={`upload-${filename}-${index}`}
              attachment={{ url: '', name: filename, contentType: '', size: 0 }}
              isUploading={true}
            />
          ))}
        </div>
      )}

<div className="relative rounded-2xl border border-zinc-200 bg-white shadow-sm transition focus-within:border-zinc-300 focus-within:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:focus-within:border-zinc-700">
          <Textarea
            data-testid="multimodal-input"
            ref={textareaRef}
            placeholder=""
            value={input}
            onChange={handleInput}
            className={cn(
              'min-h-[56px] max-h-48 overflow-y-auto resize-none rounded-2xl !text-base leading-6 pt-3 pb-12 transition-[height] duration-150 ease-out shadow-none !bg-white dark:!bg-zinc-900 border-0 !text-zinc-950 dark:!text-white placeholder:!text-zinc-500 dark:placeholder:!text-zinc-400 focus-visible:ring-0 focus-visible:ring-offset-0',
              className,
            )}
          rows={1}
          autoFocus={shouldAutoFocus}
          disabled={!canSend || isGenerating || uploadQueue.length > 0}
          onKeyDown={(event) => {
            if (
              event.key === 'Enter' &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();

              const canSubmit = canSend && !isGenerating && uploadQueue.length === 0 && (input.trim().length > 0 || attachments.length > 0);

              if (canSubmit) {
                submitForm();
              }
            }
          }}
        />

        {!input && attachments.length === 0 && uploadQueue.length === 0 && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-3 right-12 top-3 h-6 overflow-hidden text-base text-zinc-500 dark:text-zinc-400"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={animatedPlaceholders[placeholderIndex]}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="block truncate"
              >
                {animatedPlaceholders[placeholderIndex]}
              </motion.span>
            </AnimatePresence>
          </div>
        )}

        <div className="absolute bottom-0 left-0 p-2 w-fit flex flex-row justify-start gap-1 z-10">
          <AttachmentsButton
            fileInputRef={fileInputRef}
            disabled={isAttachmentDisabled}
          />
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              setInput((current) => current.trim().startsWith('/image') ? current : `/image ${current}`.trimEnd());
              requestAnimationFrame(() => {
                adjustHeight();
                textareaRef.current?.focus();
              });
            }}
            disabled={!canSend || isGenerating}
            title="Image prompt"
            aria-label="Image prompt"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
          >
            <Sparkles className="h-4 w-4" />
          </button>
          <span className="hidden h-9 items-center gap-1 rounded-lg px-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 sm:flex">
            <Image className="h-3.5 w-3.5" />
            /image
          </span>
        </div>

        <div className="absolute bottom-0 right-0 p-2 w-fit flex flex-row justify-end z-10">
          {isGenerating ? (
            <StopButton onStop={onStopGenerating} />
          ) : (
            <SendButton
              submitForm={submitForm}
              input={input}
              uploadQueue={uploadQueue}
              attachments={attachments}
              canSend={canSend}
              isGenerating={isGenerating}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export { PureMultimodalInput };
