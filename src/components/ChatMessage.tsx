import { useState } from "react";
import { Copy, Check, Share2, Download, Edit2, Trash2, X } from "lucide-react";
import { Message } from "@/types/chat";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatMessageProps {
  message: Message;
  onEdit?: (messageId: string, newContent: string) => Promise<void>;
  onDelete?: (messageId: string) => Promise<void>;
  isEditing?: boolean;
  onStartEdit?: (messageId: string) => void;
  onCancelEdit?: () => void;
  editText?: string;
  onEditTextChange?: (text: string) => void;
}

export function ChatMessage({ 
  message, 
  onEdit, 
  onDelete, 
  isEditing = false,
  onStartEdit,
  onCancelEdit,
  editText = "",
  onEditTextChange
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    toast.success("Message copied");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          text: message.content,
        });
      } else {
        await navigator.clipboard.writeText(message.content);
        toast.success("Message copied to clipboard");
      }
    } catch {
      // User cancelled share
    }
  };

  const handleExport = () => {
    const blob = new Blob([message.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `message-${message.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Message exported");
  };

  const isUser = message.role === "user";
  
  // Check if message has a numeric ID (saved to backend) or string ID (local only)
  // Only allow editing/deleting messages that have been saved to backend
  const messageNumericId = Number(message.id);
  const isSavedToBackend = !isNaN(messageNumericId) && Number.isInteger(messageNumericId) && messageNumericId > 0;

  const handleSaveEdit = async () => {
    if (!editText.trim()) {
      toast.error("Message cannot be empty");
      return;
    }
    if (onEdit) {
      await onEdit(message.id, editText.trim());
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this message?")) {
      return;
    }
    if (onDelete) {
      await onDelete(message.id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === "Escape") {
      if (onCancelEdit) {
        onCancelEdit();
      }
    }
  };

  return (
    <div
      className={cn(
        "group py-5 md:py-6 transition-colors",
        isUser ? "bg-chat-user-bg" : "bg-chat-assistant-bg"
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="chat-width px-4 md:px-6">
        {/* ChatGPT-style: user message bubble on right, assistant on left */}
        <div
          className={cn(
            "flex items-start gap-3 md:gap-4",
            isUser ? "justify-end" : "justify-start"
          )}
        >
          {/* Role indicator */}
          <div
            className={cn(
              "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold transition-transform",
              isUser
                ? "bg-foreground/10 text-foreground"
                : "bg-primary/10 text-primary"
            )}
          >
            {isUser ? "You" : "AI"}
          </div>

          {/* Content */}
          <div className={cn("flex-1 min-w-0 space-y-2", isUser && "max-w-[85%] md:max-w-2xl")}>
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editText}
                  onChange={(e) => onEditTextChange?.(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full min-h-[80px] p-3 rounded-lg border border-border bg-background text-foreground resize-y focus:outline-none focus:ring-2 focus:ring-primary/20"
                  autoFocus
                />
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Press Ctrl+Enter to save, Esc to cancel</span>
                </div>
              </div>
            ) : isUser ? (
              <div className="text-foreground leading-relaxed whitespace-pre-wrap">
                {message.content}
              </div>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none text-foreground leading-relaxed">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    // Style headings
                    h1: ({ node, ...props }) => (
                      <h1 className="text-2xl font-bold mt-6 mb-3 text-foreground first:mt-0" {...props} />
                    ),
                    h2: ({ node, ...props }) => (
                      <h2 className="text-xl font-semibold mt-5 mb-2 text-foreground first:mt-0" {...props} />
                    ),
                    h3: ({ node, ...props }) => (
                      <h3 className="text-lg font-semibold mt-4 mb-2 text-foreground first:mt-0" {...props} />
                    ),
                    // Style paragraphs - better spacing
                    p: ({ node, ...props }) => (
                      <p className="mb-4 text-foreground/90 leading-relaxed last:mb-0" {...props} />
                    ),
                    // Style lists - better indentation
                    ul: ({ node, ...props }) => (
                      <ul className="list-disc list-outside mb-4 space-y-2 text-foreground/90 ml-6" {...props} />
                    ),
                    ol: ({ node, ...props }) => (
                      <ol className="list-decimal list-outside mb-4 space-y-2 text-foreground/90 ml-6" {...props} />
                    ),
                    li: ({ node, ...props }) => (
                      <li className="text-foreground/90 leading-relaxed pl-1" {...props} />
                    ),
                    // Style bold and italic
                    strong: ({ node, ...props }) => (
                      <strong className="font-semibold text-foreground" {...props} />
                    ),
                    em: ({ node, ...props }) => (
                      <em className="italic text-foreground/90" {...props} />
                    ),
                    // Style code blocks - better contrast
                    code: ({ node, inline, ...props }: any) =>
                      inline ? (
                        <code
                          className="px-1.5 py-0.5 rounded bg-foreground/10 text-foreground font-mono text-sm border border-foreground/10"
                          {...props}
                        />
                      ) : (
                        <code
                          className="block p-4 rounded-lg bg-foreground/5 text-foreground font-mono text-sm overflow-x-auto mb-4 border border-foreground/10"
                          {...props}
                        />
                      ),
                    pre: ({ node, ...props }) => (
                      <pre className="p-0 rounded-lg bg-transparent overflow-x-auto mb-4" {...props} />
                    ),
                    // Style blockquotes - more prominent
                    blockquote: ({ node, ...props }) => (
                      <blockquote
                        className="border-l-4 border-primary/40 pl-4 italic my-4 text-foreground/80 bg-foreground/5 py-2 rounded-r"
                        {...props}
                      />
                    ),
                    // Style links - better visibility
                    a: ({ node, ...props }) => (
                      <a
                        className="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
                        target="_blank"
                        rel="noopener noreferrer"
                        {...props}
                      />
                    ),
                    // Style horizontal rules
                    hr: ({ node, ...props }) => (
                      <hr className="my-6 border-border border-t" {...props} />
                    ),
                    // Style tables (from remark-gfm)
                    table: ({ node, ...props }) => (
                      <div className="overflow-x-auto my-4">
                        <table className="min-w-full border-collapse border border-foreground/20" {...props} />
                      </div>
                    ),
                    th: ({ node, ...props }) => (
                      <th className="border border-foreground/20 px-4 py-2 bg-foreground/5 font-semibold text-left" {...props} />
                    ),
                    td: ({ node, ...props }) => (
                      <td className="border border-foreground/20 px-4 py-2" {...props} />
                    ),
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            )}

            {/* Actions - visible on hover or touch */}
            <div
              className={cn(
                "flex items-center gap-1 text-xs transition-all duration-150",
                showActions || isEditing ? "opacity-100" : "opacity-0 md:group-hover:opacity-100"
              )}
            >
              {isEditing ? (
                <>
                  <button
                    onClick={handleSaveEdit}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-green-600 dark:text-green-400 hover:bg-green-500/10 transition-colors"
                    aria-label="Save changes"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Save</span>
                  </button>
                  <button
                    onClick={onCancelEdit}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-chat-hover transition-colors"
                    aria-label="Cancel"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>Cancel</span>
                  </button>
                </>
              ) : (
                <>
                  {isUser && isSavedToBackend && onStartEdit && (
                    <button
                      onClick={() => onStartEdit(message.id)}
                      className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-chat-hover transition-colors"
                      aria-label="Edit message"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </button>
                  )}
                  {isUser && isSavedToBackend && onDelete && (
                    <button
                      onClick={handleDelete}
                      className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-destructive hover:bg-destructive/10 transition-colors"
                      aria-label="Delete message"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete</span>
                    </button>
                  )}
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-chat-hover transition-colors"
                    aria-label="Copy message"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-green-500" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleShare}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-chat-hover transition-colors"
                    aria-label="Share message"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    <span>Share</span>
                  </button>
                  <button
                    onClick={handleExport}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-chat-hover transition-colors"
                    aria-label="Export message"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Export</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="py-5 md:py-6 bg-chat-assistant-bg animate-fade-in">
      <div className="chat-width px-4 md:px-6">
        <div className="flex items-start gap-3 md:gap-4">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold bg-primary/10 text-primary">
            AI
          </div>
          <div className="flex items-center gap-1.5 pt-2">
            <span className="w-2 h-2 rounded-full bg-primary/40 animate-typing-dot-1" />
            <span className="w-2 h-2 rounded-full bg-primary/40 animate-typing-dot-2" />
            <span className="w-2 h-2 rounded-full bg-primary/40 animate-typing-dot-3" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function StreamingIndicator() {
  return (
    <span className="inline-flex items-center gap-1 ml-1">
      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-typing-dot-1" />
      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-typing-dot-2" />
      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-typing-dot-3" />
    </span>
  );
}
