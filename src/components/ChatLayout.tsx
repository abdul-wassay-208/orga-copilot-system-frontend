import { useState, useRef, useEffect, useCallback } from "react";
import { ChatSidebar } from "./ChatSidebar";
import { ChatMessage, TypingIndicator } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { EmptyState } from "./EmptyState";
import { Conversation, Message } from "@/types/chat";
import { Menu, Lock, Download, AlertTriangle, X } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { chatClient, adminClient } from "@/lib/api-client";
import { Link } from "react-router-dom";

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
  const [usageData, setUsageData] = useState<{
    messagesUsed: number;
    messagesLimit: number;
    percentUsed: number;
  } | null>(null);
  const [dismissedWarning, setDismissedWarning] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
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

  // Check authentication and load data on mount
  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem("token") || localStorage.getItem("authToken");
    if (!token) {
      // Redirect to login if no token
      window.location.href = "/login";
      return;
    }

    loadConversations();
    loadUserRole();
    loadUsageData();
    
    // Refresh usage data every 30 seconds
    const interval = setInterval(() => {
      loadUsageData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  const loadUsageData = async () => {
    try {
      const response = await chatClient.get("/chat/usage");
      const data = response.data;
      setUsageData({
        messagesUsed: data.messagesUsed || 0,
        messagesLimit: data.messagesLimit || 1000,
        percentUsed: data.percentUsed || 0,
      });
      // Reset dismissed warning if usage drops below 80%
      if (data.percentUsed < 80) {
        setDismissedWarning(false);
      }
    } catch (error: any) {
      console.error("Failed to load usage data:", error);
    }
  };

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

  /**
   * Loads a conversation from the backend and updates state.
   * Messages are loaded as-is from backend - filtering for duplicates is handled
   * in edit/delete operations to maintain data integrity.
   */
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
                messages, // Load messages as-is - filtering handled in edit operations
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

  const handleStartEdit = (messageId: string) => {
    const message = activeConversation?.messages.find((m) => m.id === messageId);
    if (message) {
      setEditingMessageId(messageId);
      setEditText(message.content);
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditText("");
  };

  /**
   * Handles editing a user message with proper message-response pairing.
   * 
   * Flow:
   * 1. Update user message in backend
   * 2. Identify and remove the assistant response linked to this user message
   * 3. Regenerate assistant response via /chat/ask
   * 4. Clean up duplicate user message created by /chat/ask
   * 5. Ensure UI state reflects only updated message + new response
   */
  const handleSaveEdit = async (messageId: string, newContent: string) => {
    if (!activeConversation) return;
    
    // Validate message ID - only allow editing messages saved to backend (numeric IDs)
    const numericId = Number(messageId);
    if (isNaN(numericId) || !Number.isInteger(numericId) || numericId <= 0) {
      toast.error("Cannot edit message that hasn't been saved to the server yet");
      return;
    }
    
    try {
      // Step 1: Update the user message in the backend
      const response = await chatClient.put(`/chat/messages/${numericId}`, {
        content: newContent,
      });

      // Find the index of the edited message in current state
      const messageIndex = activeConversation.messages.findIndex(
        (m) => m.id === messageId
      );
      if (messageIndex === -1) {
        toast.error("Message not found in conversation");
        return;
      }

      // Step 2: Identify the assistant response linked to this user message
      // The assistant response is the FIRST assistant message that appears AFTER this user message
      const linkedAssistantMessage = activeConversation.messages.find(
        (m, idx) => idx > messageIndex && m.role === "assistant"
      );

      // Step 3: Remove the linked assistant response from backend and state
      // This ensures no duplicate assistant responses exist
      // Store the ID to filter it out during reload if deletion fails
      let deletedAssistantId: string | null = null;
      if (linkedAssistantMessage && linkedAssistantMessage.id) {
        const assistantNumericId = Number(linkedAssistantMessage.id);
        if (!isNaN(assistantNumericId) && Number.isInteger(assistantNumericId) && assistantNumericId > 0) {
          try {
            // Delete from backend - WAIT for completion to ensure it's gone
            await chatClient.delete(`/chat/messages/${assistantNumericId}`);
            deletedAssistantId = linkedAssistantMessage.id;
            
            // Remove from local state immediately using immutable update
            setConversations((prev) =>
              prev.map((c) =>
                c.id === activeConversationId
                  ? {
                      ...c,
                      // Filter out the old assistant response
                      messages: c.messages.filter((m) => m.id !== linkedAssistantMessage.id),
                      updatedAt: new Date(),
                    }
                  : c
              )
            );
          } catch (deleteErr: any) {
            console.error("Failed to delete old assistant response:", deleteErr);
            const errorMsg = deleteErr?.response?.data?.message || deleteErr?.message || "Failed to delete old response";
            console.error("Delete error details:", {
              status: deleteErr?.response?.status,
              data: deleteErr?.response?.data,
              message: errorMsg
            });
            
            // If deletion fails, still continue with edit but show warning
            // The old response will be filtered out during reload
            toast.warning("Could not delete old response, but continuing with edit...");
            // Don't return - continue with the edit process
            // The old response will be handled during reload
          }
        }
      }

      // Step 4: Update user message in local state (immutable update)
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === messageId
                    ? { ...m, content: response.data.content }
                    : m
                ),
                updatedAt: new Date(),
              }
            : c
        )
      );

      setEditingMessageId(null);
      setEditText("");

      // Step 5: Regenerate assistant response
      // Note: /chat/ask will create a duplicate user message in backend, which we'll clean up
      setIsStreaming(true);
      try {
        const chatbotResponse = await chatClient.post("/chat/ask", {
          message: newContent,
          conversationId: activeConversationId ? Number(activeConversationId) : null,
        });

        const replyText = chatbotResponse.data?.reply || "No response received.";
        const fullText = typeof replyText === "string" ? replyText : String(replyText);

        // Step 6: Reload conversation to sync with backend and get new assistant response
        if (activeConversationId) {
          await loadConversation(activeConversationId);
          
          // Step 7: Clean up any remaining issues after reload
          setConversations((prev) => {
            const updatedConv = prev.find((c) => c.id === activeConversationId);
            if (!updatedConv) return prev;
            
            let filteredMessages = [...updatedConv.messages];
            
            // Filter out the deleted assistant response if it somehow came back
            if (deletedAssistantId) {
              filteredMessages = filteredMessages.filter((m) => m.id !== deletedAssistantId);
            }
            
            // Find all user messages with the edited content
            const userMessagesWithContent = filteredMessages
              .map((m, idx) => ({ message: m, index: idx }))
              .filter(({ message }) => message.role === "user" && message.content === newContent);
            
            // If duplicates exist, remove the most recent one (created by /chat/ask)
            // Keep the original (updated) message which appears first
            if (userMessagesWithContent.length > 1) {
              // Sort by index descending to get the most recent duplicate
              userMessagesWithContent.sort((a, b) => b.index - a.index);
              const duplicateMessage = userMessagesWithContent[0].message; // Most recent
              const duplicateNumericId = Number(duplicateMessage.id);
              
              if (!isNaN(duplicateNumericId) && Number.isInteger(duplicateNumericId) && duplicateNumericId > 0) {
                // Delete duplicate from backend (async, don't block)
                chatClient.delete(`/chat/messages/${duplicateNumericId}`).catch((err) => {
                  console.error("Failed to delete duplicate user message:", err);
                });
                
                // Remove duplicate from filtered messages
                filteredMessages = filteredMessages.filter((m) => m.id !== duplicateMessage.id);
              }
            }
            
            // Return updated state with all filters applied
            return prev.map((c) =>
              c.id === activeConversationId
                ? {
                    ...c,
                    messages: filteredMessages,
                  }
                : c
            );
          });
        }

        // Refresh usage data
        loadUsageData();
        scrollToBottom();
        toast.success("Message updated and response regenerated");
      } catch (chatbotError: any) {
        console.error("Error getting chatbot response:", chatbotError);
        toast.error(
          chatbotError?.response?.data?.message ||
            "Message updated, but failed to regenerate response"
        );
      } finally {
        setIsStreaming(false);
      }
    } catch (error: any) {
      console.error("Failed to update message:", error);
      toast.error(
        error?.response?.data?.message || "Failed to update message"
      );
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    // Check if messageId is numeric (from backend) or string (local)
    // Only allow deleting messages that have been saved to backend (numeric IDs)
    const numericId = Number(messageId);
    if (isNaN(numericId) || !Number.isInteger(numericId) || numericId <= 0) {
      toast.error("Cannot delete message that hasn't been saved to the server yet");
      return;
    }
    
    try {
      await chatClient.delete(`/chat/messages/${numericId}`);

      // Remove message from local state immediately
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId
            ? {
                ...c,
                messages: c.messages.filter((m) => m.id !== messageId),
                updatedAt: new Date(),
              }
            : c
        )
      );

      // Reload conversations to update message counts
      await loadConversations(true);
      toast.success("Message deleted");
    } catch (error: any) {
      console.error("Failed to delete message:", error);
      toast.error(
        error?.response?.data?.message || "Failed to delete message"
      );
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;
    
    // Check usage limit before sending
    if (usageData && usageData.percentUsed >= 100) {
      toast.error(`You've reached your monthly message limit of ${usageData.messagesLimit} messages. Please contact your administrator to upgrade your plan.`);
      return;
    }

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
      
      // Refresh usage data after sending message
      loadUsageData();
      
      // IMPORTANT: Reload conversation IMMEDIATELY after getting response to get numeric IDs from backend
      // This ensures edit/delete buttons appear on newly sent messages
      // Do this in parallel with typing effect
      (async () => {
        try {
          const convResponse = await chatClient.get(`/chat/conversations/${conversationId}`);
          const updatedConv = convResponse.data;
          
          // Transform backend messages to frontend format (with numeric IDs from backend)
          const backendMessages: Message[] = (updatedConv.messages || []).map((m: any) => ({
            id: String(m.id), // Convert numeric ID to string for consistency
            role: m.role === "USER" ? "user" : "assistant",
            content: m.content,
            timestamp: new Date(m.createdAt),
          }));
          
          // Update the conversation with backend data (this updates message IDs to numeric ones)
          setConversations((prev) =>
            prev.map((c) =>
              c.id === conversationId
                ? {
                    ...c,
                    title: updatedConv.title || c.title,
                    messages: backendMessages, // Replace with messages from backend (have numeric IDs)
                    updatedAt: new Date(updatedConv.updatedAt),
                  }
                : c
            )
          );
        } catch (error) {
          console.error("Failed to update conversation:", error);
        }
      })();

      // Start typing effect - show response word by word for better UX
      const fullText = replyText;
      let currentIndex = 0;
      const typingSpeed = 20; // milliseconds per word chunk (faster = 10-15, slower = 30-50)
      let typingTimeout: NodeJS.Timeout | null = null;
      
      const typeNextChunk = () => {
        if (currentIndex < fullText.length) {
          // Find next word boundary for smoother typing
          let nextIndex = currentIndex;
          
          // Skip whitespace at start
          while (nextIndex < fullText.length && /\s/.test(fullText[nextIndex])) {
            nextIndex++;
          }
          
          // Find end of current word or chunk
          const spaceIndex = fullText.indexOf(' ', nextIndex);
          const newlineIndex = fullText.indexOf('\n', nextIndex);
          
          if (newlineIndex !== -1 && (spaceIndex === -1 || newlineIndex < spaceIndex)) {
            // Include newline and next word
            nextIndex = newlineIndex + 1;
            const nextWordSpace = fullText.indexOf(' ', nextIndex);
            if (nextWordSpace !== -1) {
              nextIndex = nextWordSpace + 1;
            } else {
              nextIndex = fullText.length;
            }
          } else if (spaceIndex !== -1) {
            // Include current word and space
            nextIndex = spaceIndex + 1;
            // Try to include next word too for faster typing
            const nextWordEnd = fullText.indexOf(' ', nextIndex);
            if (nextWordEnd !== -1 && nextWordEnd - nextIndex < 15) {
              nextIndex = nextWordEnd + 1;
            }
          } else {
            // Last chunk
            nextIndex = fullText.length;
          }
          
          const displayText = fullText.substring(0, nextIndex);
          currentIndex = nextIndex;
          
          // Update assistant message with partial text
          setConversations((prev) =>
            prev.map((c) =>
              c.id === conversationId
                ? {
                    ...c,
                    messages: c.messages.map((m) =>
                      m.id === assistantMessageId
                        ? { ...m, content: displayText }
                        : m
                    ),
                    updatedAt: new Date(),
                  }
                : c
            )
          );
          
          // Auto-scroll during typing
          scrollToBottom();
          
          // Continue typing
          typingTimeout = setTimeout(typeNextChunk, typingSpeed);
        } else {
          // Typing complete - ensure full text is shown
          setConversations((prev) =>
            prev.map((c) =>
              c.id === conversationId
                ? {
                    ...c,
                    messages: c.messages.map((m) =>
                      m.id === assistantMessageId
                        ? { ...m, content: fullText }
                        : m
                    ),
                    updatedAt: new Date(),
                  }
                : c
            )
          );
          setIsStreaming(false);
          scrollToBottom();
        }
      };
      
      // Start typing effect immediately
      typeNextChunk();
      
      // Cleanup function to stop typing if component unmounts or new message starts
      return () => {
        if (typingTimeout) {
          clearTimeout(typingTimeout);
        }
      };

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

      // Reload the conversation from backend to get the updated title and message IDs
      // This ensures the title matches what's stored in the database and messages have correct numeric IDs
      try {
        const convResponse = await chatClient.get(`/chat/conversations/${conversationId}`);
        const updatedConv = convResponse.data;
        
        // Transform backend messages to frontend format (with numeric IDs from backend)
        const backendMessages: Message[] = (updatedConv.messages || []).map((m: any) => ({
          id: String(m.id), // Convert numeric ID to string for consistency
          role: m.role === "USER" ? "user" : "assistant",
          content: m.content,
          timestamp: new Date(m.createdAt),
        }));
        
        // Update the conversation with backend data (this updates message IDs to numeric ones)
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  title: updatedConv.title || c.title,
                  messages: backendMessages, // Replace with messages from backend (have numeric IDs)
                  updatedAt: new Date(updatedConv.updatedAt),
                }
              : c
          )
        );
      } catch (error) {
        console.error("Failed to update conversation:", error);
        // Don't fail the whole operation if update fails
      }
    } catch (error: any) {
      console.error("Failed to send message:", error);
      
      // Handle usage limit error (429)
      if (error?.response?.status === 429) {
        const errorMessage = error?.response?.data?.message || "Monthly message limit reached";
        toast.error(errorMessage);
        // Refresh usage data to update UI
        loadUsageData();
      } else {
        toast.error(error?.response?.data?.message || error?.response?.data?.error || "Failed to send message");
      }
      
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
      
      // Remove user message if it was added optimistically
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                messages: c.messages.filter((m) => m.role !== "user" || m.content !== content),
              }
            : c
        )
      );
      setIsStreaming(false);
    } finally {
      // Only set streaming to false if typing effect hasn't completed yet
      // (typing effect will set it to false when done)
      // This ensures errors still stop streaming
    }
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
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
          "fixed md:relative z-50 transition-transform duration-200 h-screen md:h-full",
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
            <EmptyState 
              onSelectPrompt={handleSendMessage} 
              disabled={usageData?.percentUsed >= 100}
            />
            <ChatInput 
              onSend={handleSendMessage} 
              disabled={isStreaming || (usageData?.percentUsed >= 100)}
              placeholder={usageData?.percentUsed >= 100 
                ? "Monthly message limit reached. Contact your administrator to upgrade."
                : "What's on your mind?"}
            />
          </>
        ) : (
          <>
            {/* Usage Warning Banner */}
            {usageData && usageData.percentUsed >= 80 && !dismissedWarning && (
              <div className={cn(
                "mx-4 md:mx-6 mt-4 p-3 rounded-lg border space-y-2 animate-fade-in",
                usageData.percentUsed >= 100
                  ? "bg-destructive/10 border-destructive/20"
                  : "bg-yellow-500/10 border-yellow-500/20"
              )}>
                <div className="flex items-start gap-2">
                  <AlertTriangle className={cn(
                    "h-4 w-4 flex-shrink-0 mt-0.5",
                    usageData.percentUsed >= 100
                      ? "text-destructive"
                      : "text-yellow-600 dark:text-yellow-400"
                  )} />
                  <div className="flex-1 space-y-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium",
                      usageData.percentUsed >= 100
                        ? "text-destructive"
                        : "text-yellow-900 dark:text-yellow-100"
                    )}>
                      {usageData.percentUsed >= 100 
                        ? "Usage limit reached"
                        : "Approaching usage limit"}
                    </p>
                    <p className={cn(
                      "text-xs leading-relaxed",
                      usageData.percentUsed >= 100
                        ? "text-destructive/90"
                        : "text-yellow-800 dark:text-yellow-200"
                    )}>
                      {usageData.percentUsed >= 100 
                        ? "You've reached your monthly message limit. Contact your administrator to upgrade your plan or request additional messages."
                        : `You've used ${usageData.messagesUsed} of ${usageData.messagesLimit} messages (${usageData.percentUsed}%). Contact your administrator to upgrade your plan or request additional messages to avoid service interruption.`}
                    </p>
                    <Link
                      to="/settings"
                      className="text-xs font-medium text-primary hover:text-primary/80 underline"
                    >
                      View usage details
                    </Link>
                  </div>
                  <button
                    onClick={() => setDismissedWarning(true)}
                    className="p-1 rounded hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                    aria-label="Dismiss warning"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
            
            {/* Messages */}
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {activeConversation.messages
                .filter((message) => {
                  // Don't render empty placeholder messages - we'll show TypingIndicator instead
                  return !(message.role === "assistant" && message.content === "" && isStreaming);
                })
                .map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    onEdit={handleSaveEdit}
                    onDelete={handleDeleteMessage}
                    isEditing={editingMessageId === message.id}
                    onStartEdit={handleStartEdit}
                    onCancelEdit={handleCancelEdit}
                    editText={editText}
                    onEditTextChange={setEditText}
                  />
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
              disabled={isStreaming || (usageData?.percentUsed >= 100)}
              placeholder={usageData?.percentUsed >= 100 
                ? "Monthly message limit reached. Contact your administrator to upgrade."
                : "What's on your mind?"}
              showPromptChips={activeConversation.messages.length < 3 && !(usageData?.percentUsed >= 100)}
              onSelectPrompt={handleSendMessage}
            />
          </>
        )}
      </div>
    </div>
  );
}
