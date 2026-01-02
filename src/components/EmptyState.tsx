import { MessageCircle, Lock, Sparkles } from "lucide-react";

interface EmptyStateProps {
  onSelectPrompt: (prompt: string) => void;
  disabled?: boolean;
}

const examplePrompts = [
  { text: "Prepare for a difficult conversation", icon: "💬" },
  { text: "Think through a team decision", icon: "🤔" },
  { text: "Navigate a challenging situation", icon: "🧭" },
  { text: "Explore leadership approach", icon: "💡" },
];

export function EmptyState({ onSelectPrompt, disabled = false }: EmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 md:py-12">
      <div className="max-w-xl w-full text-center space-y-8">
        {/* Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center animate-scale-in">
          <MessageCircle className="h-8 w-8 text-primary" />
        </div>

        {/* Welcome message */}
        <div className="space-y-3 animate-fade-in">
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground">
            Your thinking partner
          </h1>
          <p className="text-muted-foreground leading-relaxed max-w-md mx-auto text-sm md:text-base">
            Your AI-powered assistant to think through complex workplace situations, 
            prepare for important conversations, and navigate challenging decisions.
          </p>
        </div>

        {/* Example prompts */}
        <div className="space-y-4 pt-2 animate-fade-in" style={{ animationDelay: "100ms" }}>
          <div className="flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Start a conversation</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto">
            {examplePrompts.map((prompt, index) => (
              <button
                key={index}
                onClick={() => !disabled && onSelectPrompt(prompt.text)}
                disabled={disabled}
                className="group flex items-center gap-3 px-4 py-3 rounded-xl border border-chat-input-border bg-chat-input-bg hover:bg-chat-hover hover:border-chat-input-focus/50 transition-all duration-150 text-left disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-chat-input-bg disabled:hover:border-chat-input-border"
              >
                <span className="text-lg">{prompt.icon}</span>
                <span className="text-sm text-foreground/80 group-hover:text-foreground transition-colors">
                  {prompt.text}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Privacy note */}
        <div className="pt-4 animate-fade-in" style={{ animationDelay: "200ms" }}>
          <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-muted/50 border border-border">
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              This space is for reflection, not evaluation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
