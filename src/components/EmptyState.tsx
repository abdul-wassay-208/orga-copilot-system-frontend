import { Sparkles } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";
import { motion } from 'motion/react';

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
  const { theme } = useTheme();
  return (
    <div className="flex-1 flex flex-col items-center justify-start px-4 py-4 md:py-8 lg:py-12 overflow-y-auto min-h-0">
      <div className="max-w-xl w-full text-center space-y-6 md:space-y-8 py-4 md:py-8">
        {/* Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center animate-scale-in overflow-hidden">
          <img
            src={"/assets/Start chat-Light.svg"}
            alt="Start chat"
            className="h-20 w-800 object-contain"
          />
        </div>

        {/* Welcome message */}
        <div className="space-y-3 animate-fade-in">
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground">
            Your thinking partner
          </h1>
          <p className="text-muted-foreground leading-relaxed max-w-md mx-auto text-sm md:text-base">
<<<<<<< HEAD
          Every team is a living system. Let's discover what yours needs today to thrive.
=======
            Your AI-powered partner for understanding team dynamics, 
            strengthening collaboration and helping your team thrive as a living system.
>>>>>>> 80c20ec2fef34c5ef8c476f72365660543399396
          </p>
        </div>

        {/* Example prompts - only show on first login */}
        {(
          <div className="pt-4 md:pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 max-w-2xl mx-auto">
              {examplePrompts.map((prompt, index) => (
                <motion.button
                  key={index}
                  onClick={() => !disabled && onSelectPrompt(prompt.text)}
                  disabled={disabled}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.15 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -8 }}
                  className={cn(
                    "group relative text-left p-4 md:p-5 rounded-xl border transition-all duration-300",
                    "hover:border-primary/50 hover:bg-accent/50 hover:shadow-xl",
                    disabled 
                      ? "opacity-50 cursor-not-allowed border-border bg-muted/30" 
                      : "border-border bg-background cursor-pointer"
                  )}
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
                </motion.button>
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
