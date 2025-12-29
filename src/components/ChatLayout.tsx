import { useState, useRef, useEffect, useCallback } from "react";
import { ChatSidebar } from "./ChatSidebar";
import { ChatMessage, TypingIndicator } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { EmptyState } from "./EmptyState";
import { Conversation, Message } from "@/types/chat";
import { Menu, Lock, Download } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { chatClient, adminClient } from "@/lib/api-client";

// Generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 11);

// Generate title from first message
const generateTitle = (content: string) => {
  const words = content.split(" ").slice(0, 6).join(" ");
  return words.length < content.length ? words + "..." : words;
};

export function ChatLayout() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConversation = conversations.find(
    (c) => c.id === activeConversationId
  );

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation?.messages, scrollToBottom]);

  // Load conversations and user role on mount
  useEffect(() => {
    loadConversations();
    loadUserRole();
  }, []);

  const loadUserRole = async () => {
    try {
      const response = await adminClient.get("/api/auth/me");
      const role = response.data?.role;
      if (role) {
        setUserRole(role);
      }
    } catch (error: any) {
      console.error("Failed to load user role:", error);
      // If unauthorized, user will be redirected by interceptor
      // Otherwise, silently fail - user just won't see admin buttons
    }
  };

  const loadConversations = async (preserveActiveMessages = false) => {
    try {
      setLoadingConversations(true);
      const response = await chatClient.get("/chat/conversations");
      const backendConversations = response.data || [];
      
      // Get current active conversation messages to preserve them
      const activeConvMessages = preserveActiveMessages && activeConversationId
        ? conversations.find(c => c.id === activeConversationId)?.messages || []
        : [];
      
      // Transform backend format to frontend format
      const transformed: Conversation[] = backendConversations.map((conv: any) => {
        const existingConv = conversations.find(c => c.id === String(conv.id));
        const isActive = activeConversationId === String(conv.id);
        
        return {
          id: String(conv.id),
          title: conv.title,
          // Preserve messages if this is the active conversation and we want to preserve
          messages: preserveActiveMessages && isActive && activeConvMessages.length > 0
            ? activeConvMessages
            : existingConv?.messages || [], // Keep existing messages if conversation exists
          createdAt: new Date(conv.createdAt),
          updatedAt: new Date(conv.updatedAt),
        };
      });
      
      // Merge with existing conversations to preserve any that aren't in backend yet (newly created)
      setConversations((prev) => {
        const merged = [...transformed];
        
        // Add any conversations that exist locally but not in backend (newly created)
        prev.forEach((localConv) => {
          if (!transformed.find((t) => t.id === localConv.id)) {
            // Only add if it's very new (created in last few seconds) or is the active conversation
            const isVeryNew = Date.now() - localConv.createdAt.getTime() < 10000;
            if (isVeryNew || localConv.id === activeConversationId) {
              merged.unshift(localConv);
            }
          }
        });
        
        return merged;
      });
    } catch (error: any) {
      console.error("Failed to load conversations:", error);
      toast.error("Failed to load conversations");
    } finally {
      setLoadingConversations(false);
    }
  };

  const loadConversation = async (id: string) => {
    try {
      const response = await chatClient.get(`/chat/conversations/${id}`);
      const conv = response.data;
      
      // Transform backend messages to frontend format
      const messages: Message[] = (conv.messages || []).map((m: any) => ({
        id: String(m.id),
        role: m.role === "USER" ? "user" : "assistant",
        content: m.content,
        timestamp: new Date(m.createdAt),
      }));

      // Update conversation in state
      setConversations((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                title: conv.title,
                messages,
                updatedAt: new Date(conv.updatedAt),
              }
            : c
        )
      );
    } catch (error: any) {
      console.error("Failed to load conversation:", error);
      toast.error("Failed to load conversation");
    }
  };

  const handleNewChat = async () => {
    try {
      const response = await chatClient.post("/chat/conversations");
      const newConv: Conversation = {
        id: String(response.data.id),
        title: response.data.title || "New Chat",
        messages: [],
        createdAt: new Date(response.data.createdAt),
        updatedAt: new Date(response.data.createdAt),
      };
      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(newConv.id);
      setMobileMenuOpen(false);
    } catch (error: any) {
      console.error("Failed to create conversation:", error);
      toast.error("Failed to create new conversation");
    }
  };

  const handleSelectConversation = async (id: string) => {
    setActiveConversationId(id);
    setMobileMenuOpen(false);
    
    // Load conversation messages if not already loaded
    const conv = conversations.find((c) => c.id === id);
    if (conv && conv.messages.length === 0) {
      await loadConversation(id);
    }
  };

  const handleDeleteConversation = async (id: string) => {
    if (!confirm("Are you sure you want to delete this conversation?")) {
      return;
    }

    try {
      await chatClient.delete(`/chat/conversations/${id}`);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        setActiveConversationId(null);
      }
      toast.success("Conversation deleted");
    } catch (error: any) {
      console.error("Failed to delete conversation:", error);
      toast.error("Failed to delete conversation");
    }
  };

  const handleRenameConversation = (id: string, title: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title } : c))
    );
    // TODO: Add API call to update conversation title on backend
  };

  const handleExportConversation = () => {
    if (!activeConversation) return;
    
    const content = activeConversation.messages
      .map((m) => `${m.role === "user" ? "You" : "AI"}: ${m.content}`)
      .join("\n\n---\n\n");
    
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeConversation.title.replace(/[^a-z0-9]/gi, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Conversation exported");
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: generateId(),
      role: "user",
      content,
      timestamp: new Date(),
    };

    let conversationId = activeConversationId;
    const assistantMessageId = generateId();
    let conversationHistory: Array<{ role: string; content: string }> = [];

    // Create new conversation if none exists
    if (!conversationId) {
      try {
        const response = await chatClient.post("/chat/conversations");
        conversationId = String(response.data.id);
        const newConversation: Conversation = {
          id: conversationId,
          title: generateTitle(content),
          messages: [userMessage],
          createdAt: new Date(response.data.createdAt),
          updatedAt: new Date(response.data.createdAt),
        };
        setConversations((prev) => [newConversation, ...prev]);
        setActiveConversationId(conversationId);
        // For new conversation, history is just the user message
        conversationHistory = [{ role: "user", content }];
      } catch (error: any) {
        console.error("Failed to create conversation:", error);
        toast.error("Failed to create conversation");
        return;
      }
    } else {
      // Add user message to existing conversation
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                messages: [...c.messages, userMessage],
                updatedAt: new Date(),
              }
            : c
        )
      );
      // Build conversation history from existing conversation + new user message
      const currentConv = conversations.find((c) => c.id === conversationId);
      conversationHistory = currentConv
        ? [...currentConv.messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          }))
        : [{ role: "user", content }];
    }

    setIsStreaming(true);

    // Add placeholder for assistant message - ensure only one exists
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== conversationId) return c;
        
        // Remove any existing empty assistant messages first (cleanup)
        const messagesWithoutEmpty = c.messages.filter(
          (m) => !(m.role === "assistant" && m.content === "")
        );
        
        // Add new placeholder
        return {
          ...c,
          messages: [
            ...messagesWithoutEmpty,
            {
              id: assistantMessageId,
              role: "assistant" as const,
              content: "",
              timestamp: new Date(),
            },
          ],
        };
      })
    );

    try {

      // Call backend API
      const response = await chatClient.post("/chat/ask", {
        message: content,
        conversationId: conversationId ? Number(conversationId) : null,
      });

      const replyText = response.data?.reply || "No response received.";

      // Update assistant message with response - replace the placeholder
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMessageId
                    ? { ...m, content: replyText }
                    : m
                ),
                updatedAt: new Date(),
              }
            : c
        )
      );

      // Update conversation ID if it was returned (shouldn't happen, but handle it)
      if (response.data?.conversationId && conversationId !== String(response.data.conversationId)) {
        const newId = String(response.data.conversationId);
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId ? { ...c, id: newId } : c
          )
        );
        setActiveConversationId(newId);
        conversationId = newId; // Update local variable
      }

      // Reload the conversation from backend to get the updated title
      // This ensures the title matches what's stored in the database
      try {
        const convResponse = await chatClient.get(`/chat/conversations/${conversationId}`);
        const updatedConv = convResponse.data;
        
        // Update the conversation title from backend
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  title: updatedConv.title || c.title,
                  updatedAt: new Date(updatedConv.updatedAt),
                }
              : c
          )
        );
      } catch (error) {
        console.error("Failed to update conversation title:", error);
        // Don't fail the whole operation if title update fails
      }
    } catch (error: any) {
      console.error("Failed to send message:", error);
      toast.error(error?.response?.data?.message || "Failed to send message");
      
      // Remove the placeholder assistant message on error
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                messages: c.messages.filter((m) => m.id !== assistantMessageId),
              }
            : c
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-background">
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileMenuOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2.5 rounded-lg bg-card border border-border shadow-sm hover:bg-chat-hover transition-colors"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 animate-fade-in"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed md:relative z-50 h-full transition-transform duration-200",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <ChatSidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
          onDeleteConversation={handleDeleteConversation}
          onRenameConversation={handleRenameConversation}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          isTenantAdmin={userRole === "TENANT_ADMIN"}
          isSuperAdmin={userRole === "SUPER_ADMIN"}
        />
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        {activeConversation && (
          <div className="h-14 border-b border-border flex items-center justify-between px-4 md:px-6 bg-background/80 backdrop-blur-sm">
            <div className="flex items-center gap-3 pl-12 md:pl-0">
              <h2 className="text-sm font-medium text-foreground truncate max-w-[180px] md:max-w-md">
                {activeConversation.title}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/5 border border-primary/10">
                <Lock className="h-3 w-3 text-primary" />
                <span className="text-xs text-primary font-medium">Private</span>
              </div>
              <button
                onClick={handleExportConversation}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-chat-hover transition-colors"
                aria-label="Export conversation"
              >
                <Download className="h-4 w-4" />
              </button>
              <ThemeToggle />
            </div>
          </div>
        )}
        
        {!activeConversation ? (
          <>
            {/* Top bar for empty state */}
            <div className="h-14 border-b border-border flex items-center justify-end px-4 md:px-6 bg-background/80 backdrop-blur-sm">
              <ThemeToggle />
            </div>
            <EmptyState onSelectPrompt={handleSendMessage} />
            <ChatInput onSend={handleSendMessage} disabled={isStreaming} />
          </>
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {activeConversation.messages
                .filter((message) => {
                  // Don't render empty placeholder messages - we'll show TypingIndicator instead
                  return !(message.role === "assistant" && message.content === "" && isStreaming);
                })
                .map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))}
              {/* Show typing indicator when streaming and we have an empty placeholder message */}
              {isStreaming && 
               activeConversation.messages.length > 0 && 
               activeConversation.messages[activeConversation.messages.length - 1]?.role === "assistant" &&
               activeConversation.messages[activeConversation.messages.length - 1]?.content === "" && (
                <TypingIndicator />
              )}
              <div ref={messagesEndRef} className="h-4" />
            </div>

            {/* Input */}
            <ChatInput 
              onSend={handleSendMessage} 
              disabled={isStreaming}
              showPromptChips={activeConversation.messages.length < 3}
              onSelectPrompt={handleSendMessage}
            />
          </>
        )}
      </div>
    </div>
  );
}
