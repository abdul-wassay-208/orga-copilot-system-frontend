import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  showPromptChips?: boolean;
  onSelectPrompt?: (prompt: string) => void;
  /** When set and input is disabled, clicking/focusing the input triggers this (e.g. redirect to billing). */
  onDisabledClick?: () => void;
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = "What's on your mind?",
  showPromptChips = false,
  onSelectPrompt,
  onDisabledClick,
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
        {/* Input area */}
        <div
          className={cn(
            "relative rounded-xl border transition-all duration-200",
            isFocused
              ? "border-chat-input-focus shadow-sm ring-2 ring-chat-input-focus/10"
              : "border-chat-input-border",
            "bg-chat-input-bg",
            disabled && onDisabledClick && "cursor-pointer"
          )}
          onClick={() => {
            if (disabled && onDisabledClick) onDisabledClick();
          }}
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => {
              if (disabled && onDisabledClick) {
                onDisabledClick();
                return;
              }
              setIsFocused(true);
            }}
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
        AI can make mistakes. Check important info.
        </p>
      </div>
    </div>
  );
}
