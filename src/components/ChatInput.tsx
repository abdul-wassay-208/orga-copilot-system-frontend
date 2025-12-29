import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Send, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  showPromptChips?: boolean;
  onSelectPrompt?: (prompt: string) => void;
}

const quickPrompts = [
  "Help me prepare",
  "Guide my thinking",
  "Give me perspective",
];

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = "What's on your mind?",
  showPromptChips = false,
  onSelectPrompt,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px";
    }
  }, [value]);

  const handleSubmit = () => {
    if (value.trim() && !disabled) {
      onSend(value.trim());
      setValue("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-chat-divider bg-background sticky bottom-0">
      <div className="chat-width px-4 md:px-6 py-4 space-y-3">
        {/* Quick prompt chips */}
        {showPromptChips && !value && (
          <div className="flex items-center gap-2 flex-wrap animate-fade-in">
            <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => onSelectPrompt?.(prompt)}
                className="px-3 py-1.5 rounded-full border border-chat-input-border bg-chat-input-bg text-xs text-muted-foreground hover:text-foreground hover:border-chat-input-focus/50 transition-all"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Input area */}
        <div
          className={cn(
            "relative rounded-xl border transition-all duration-200",
            isFocused
              ? "border-chat-input-focus shadow-sm ring-2 ring-chat-input-focus/10"
              : "border-chat-input-border",
            "bg-chat-input-bg"
          )}
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={cn(
              "w-full resize-none bg-transparent px-4 py-3.5 pr-12 text-sm outline-none placeholder:text-muted-foreground/50",
              "min-h-[52px] max-h-[200px]",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          />
          <button
            onClick={handleSubmit}
            disabled={!value.trim() || disabled}
            className={cn(
              "absolute right-2.5 bottom-2.5 p-2 rounded-lg transition-all duration-150",
              value.trim() && !disabled
                ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>

        {/* Helper text */}
        <p className="text-xs text-muted-foreground/50 text-center">
          Press Enter to send · Shift + Enter for new line
        </p>
      </div>
    </div>
  );
}
