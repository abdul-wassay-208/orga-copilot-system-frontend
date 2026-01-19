import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ChatMessage } from "@/components/ChatMessage";
import { Conversation, Message } from "@/types/chat";
import { apiClient } from "@/lib/api-client";
import { Loader2, Lock, LogIn } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function SharedConversationPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      loadSharedConversation();
    }
  }, [token]);

  const loadSharedConversation = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(`/chat/share/${token}`);
      const data = response.data;

      // Transform backend messages to frontend format
      const messages: Message[] = (data.messages || []).map((m: any) => ({
        id: String(m.id),
        role: m.role === "USER" ? "user" : "assistant",
        content: m.content,
        timestamp: new Date(m.createdAt),
      }));

      const conv: Conversation = {
        id: String(data.id),
        title: data.title,
        messages,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
      };

      setConversation(conv);
    } catch (error: any) {
      console.error("Failed to load shared conversation:", error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.status === 404
          ? "This conversation link has expired or been revoked."
          : "Failed to load shared conversation. Please check the link and try again.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleContinueChat = () => {
    // Check if user is logged in
    const token = localStorage.getItem("token") || localStorage.getItem("authToken");
    if (token) {
      navigate("/chat");
    } else {
      navigate("/login", { state: { from: "/chat" } });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading conversation...</p>
        </div>
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="p-4 rounded-full bg-destructive/10 mx-auto w-fit">
            <Lock className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">Conversation Not Available</h1>
          <p className="text-sm text-muted-foreground">{error || "This conversation could not be found."}</p>
          <div className="flex gap-3 justify-center pt-4">
            <Link
              to="/login"
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <LogIn className="h-4 w-4" />
              Log In
            </Link>
            <button
              onClick={() => navigate("/")}
              className="px-4 py-2 rounded-lg border border-chat-input-border text-sm font-medium hover:bg-chat-hover transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="h-14 border-b border-border flex items-center justify-between px-4 md:px-6 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/5 border border-primary/10">
            <Lock className="h-3 w-3 text-primary" />
            <span className="text-xs text-primary font-medium">Shared</span>
          </div>
          <h2 className="text-sm font-medium text-foreground truncate max-w-[180px] md:max-w-md">
            {conversation.title}
          </h2>
        </div>
        <button
          onClick={handleContinueChat}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          <LogIn className="h-4 w-4" />
          Continue Chatting
        </button>
      </div>

      {/* Messages */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="mb-4 p-4 rounded-lg bg-primary/5 border border-primary/10">
          <p className="text-sm text-muted-foreground">
            This is a read-only view of a shared conversation. To continue chatting, please log in.
          </p>
        </div>

        <div className="space-y-4">
          {conversation.messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              onEdit={undefined}
              onDelete={undefined}
              isEditing={false}
              onStartEdit={undefined}
              onCancelEdit={undefined}
              editText=""
              onEditTextChange={undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
