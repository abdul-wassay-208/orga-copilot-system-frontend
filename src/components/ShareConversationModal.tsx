import { useState, useEffect } from "react";
import { X, Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { chatClient } from "@/lib/api-client";

interface ShareConversationModalProps {
  conversationId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareConversationModal({
  conversationId,
  isOpen,
  onClose,
}: ShareConversationModalProps) {
  const [shareUrl, setShareUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && conversationId) {
      loadShareLink();
    }
  }, [isOpen, conversationId]);

  const loadShareLink = async () => {
    setIsLoading(true);
    try {
      const response = await chatClient.post(`/chat/conversations/${conversationId}/share`);
      const url = response.data.shareUrl;
      setShareUrl(url);
    } catch (error: any) {
      console.error("Failed to create share link:", error);
      toast.error("Failed to create share link. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-card border border-border rounded-xl shadow-lg p-6 max-w-md w-full mx-4 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Share Conversation</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-chat-hover text-muted-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Anyone with this link can view this conversation. They won't be able to send messages or edit the conversation.
          </p>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : shareUrl ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 rounded-lg border border-chat-input-border bg-chat-input-bg">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 text-sm bg-transparent outline-none text-foreground truncate"
                />
                <button
                  onClick={handleCopy}
                  className="p-2 rounded-lg hover:bg-chat-hover text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                  aria-label="Copy link"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>

              <button
                onClick={handleCopy}
                className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy Link
                  </>
                )}
              </button>

              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                Open shared link
              </a>
            </div>
          ) : (
            <button
              onClick={loadShareLink}
              className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Generate Share Link
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
