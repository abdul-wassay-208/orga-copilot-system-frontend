import { MessageCircle, Lock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  onSelectPrompt: (prompt: string) => void;
  disabled?: boolean;
  showPrompts?: boolean;
}

const examplePrompts = [
  { text: "My team keeps running into the same problems no matter what we try.", icon: "💬" },
  { text: "We have talented people, but something's not clicking as a team.", icon: "🤔" },
  { text: "How do I step back as a leader without everything falling apart?", icon: "🧭" },
  { text: "What does a truly healthy team actually look like?", icon: "💡" },
];

export function EmptyState({ onSelectPrompt, disabled = false, showPrompts = false }: EmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-start px-4 py-4 md:py-8 lg:py-12 overflow-y-auto min-h-0">
      <div className="max-w-xl w-full text-center space-y-6 md:space-y-8 py-4 md:py-8">
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

        {/* Example prompts - only show on first login */}
        {(
          <div className="pt-4 md:pt-6 animate-fade-in" style={{ animationDelay: "200ms" }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 max-w-2xl mx-auto">
              {examplePrompts.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => !disabled && onSelectPrompt(prompt.text)}
                  disabled={disabled}
                  className={cn(
                    "group relative text-left p-4 md:p-5 rounded-xl border transition-all duration-200",
                    "hover:border-primary/50 hover:bg-accent/50",
                    disabled 
                      ? "opacity-50 cursor-not-allowed border-border bg-muted/30" 
                      : "border-border bg-background cursor-pointer",
                    "animate-fade-in"
                  )}
                  style={{ animationDelay: `${300 + index * 100}ms` }}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl md:text-3xl flex-shrink-0">{prompt.icon}</span>
                    <p className={cn(
                      "text-sm md:text-base leading-relaxed",
                      disabled ? "text-muted-foreground" : "text-foreground group-hover:text-primary"
                    )}>
                      {prompt.text}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Privacy note */}
        {/* <div className="pt-2 md:pt-4 animate-fade-in" style={{ animationDelay: "200ms" }}>
          <div className="inline-flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-full bg-muted/50 border border-border">
            <Lock className="h-3 w-3 md:h-3.5 md:w-3.5 text-muted-foreground flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              This space is for reflection, not evaluation.
            </p>
          </div>
        </div> */}
      </div>
    </div>
  );
}
