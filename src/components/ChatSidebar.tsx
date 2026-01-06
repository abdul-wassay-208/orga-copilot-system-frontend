import { Plus, MessageSquare, Pencil, Trash2, PanelLeftClose, PanelLeft, Settings, User, Shield, Lock } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Conversation } from "@/types/chat";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "@/lib/utils";
import { adminClient } from "@/lib/api-client";

interface ChatSidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, title: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isTenantAdmin?: boolean;
  isSuperAdmin?: boolean;
}

export function ChatSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onRenameConversation,
  isCollapsed,
  onToggleCollapse,
  isTenantAdmin = false,
  isSuperAdmin = false,
}: ChatSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("User");

  // Load user name on mount
  useEffect(() => {
    loadUserName();
  }, []);

  const loadUserName = async () => {
    try {
      const response = await adminClient.get("/api/auth/me");
      const userData = response.data;
      const name = userData.fullName || userData.email?.split("@")[0] || "User";
      setUserName(name);
    } catch (error: any) {
      console.error("Failed to load user name:", error);
      // Keep default "User" if API fails
    }
  };

  const handleStartEdit = (conv: Conversation) => {
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const handleSaveEdit = () => {
    if (editingId && editTitle.trim()) {
      onRenameConversation(editingId, editTitle.trim());
    }
    setEditingId(null);
    setEditTitle("");
  };

  const handleDeleteClick = (id: string) => {
    setShowDeleteConfirm(id);
  };

  const handleConfirmDelete = (id: string) => {
    onDeleteConversation(id);
    setShowDeleteConfirm(null);
  };

  if (isCollapsed) {
    return (
      <div className="w-0 md:w-14 bg-sidebar border-r border-sidebar-border flex flex-col items-center py-3 transition-all duration-200">
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-md transition-colors hover:bg-sidebar-hover text-sidebar-foreground/70 hover:text-sidebar-foreground mb-3"
          aria-label="Expand sidebar"
        >
          <PanelLeft className="h-5 w-5" />
        </button>
        <button
          onClick={onNewChat}
          className="p-2 rounded-md transition-colors bg-primary/10 hover:bg-primary/20 text-primary"
          aria-label="New chat"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col h-full animate-slide-in-left">
      {/* Header with product name - Sticky */}
      <div className="p-3 border-b border-sidebar-border space-y-3 flex-shrink-0 bg-sidebar">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Lock className="h-4 w-4 text-primary" />
            </div>
            <h1 className="text-base font-semibold text-sidebar-foreground">Evo Associate</h1>
          </div>
          <button
            onClick={onToggleCollapse}
            className="p-2 rounded-md transition-colors hover:bg-sidebar-hover text-sidebar-foreground/70 hover:text-sidebar-foreground"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg transition-all bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium shadow-sm"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </button>
      </div>

      {/* Conversation List - Scrollable */}
      <div className="flex-1 overflow-y-auto scrollbar-thin py-2 min-h-0">
        {conversations.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <MessageSquare className="h-8 w-8 text-sidebar-foreground/20 mx-auto mb-2" />
            <p className="text-sm text-sidebar-foreground/50">
              No conversations yet
            </p>
            <p className="text-xs text-sidebar-foreground/40 mt-1">
              Start a new chat to begin
            </p>
          </div>
        ) : (
          <div className="space-y-0.5 px-2">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={cn(
                  "group relative flex items-center rounded-lg transition-all cursor-pointer",
                  activeConversationId === conv.id
                    ? "bg-sidebar-active"
                    : "hover:bg-sidebar-hover"
                )}
                onMouseEnter={() => setHoveredId(conv.id)}
                onMouseLeave={() => {
                  setHoveredId(null);
                  if (showDeleteConfirm === conv.id) setShowDeleteConfirm(null);
                }}
                onClick={() => onSelectConversation(conv.id)}
              >
                <div className="flex-1 flex items-center gap-2.5 px-3 py-2.5 min-w-0">
                  <MessageSquare className="h-4 w-4 flex-shrink-0 text-sidebar-foreground/40" />
                  {editingId === conv.id ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onBlur={handleSaveEdit}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveEdit();
                        if (e.key === "Escape") {
                          setEditingId(null);
                          setEditTitle("");
                        }
                      }}
                      className="flex-1 bg-transparent border-none outline-none text-sm text-sidebar-foreground"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="text-sm text-sidebar-foreground truncate">
                      {conv.title}
                    </span>
                  )}
                </div>

                {/* Actions on hover */}
                {hoveredId === conv.id && editingId !== conv.id && (
                  <div className="flex items-center gap-0.5 pr-2 animate-fade-in">
                    {showDeleteConfirm === conv.id ? (
                      <div className="flex items-center gap-1 bg-destructive/10 rounded px-2 py-1">
                        <span className="text-xs text-destructive">Delete?</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConfirmDelete(conv.id);
                          }}
                          className="text-xs text-destructive font-medium hover:underline"
                        >
                          Yes
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDeleteConfirm(null);
                          }}
                          className="text-xs text-muted-foreground hover:underline"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(conv);
                          }}
                          className="p-1.5 rounded transition-colors hover:bg-sidebar-hover text-sidebar-foreground/50 hover:text-sidebar-foreground"
                          aria-label="Rename conversation"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(conv.id);
                          }}
                          className="p-1.5 rounded transition-colors hover:bg-destructive/10 text-sidebar-foreground/50 hover:text-destructive"
                          aria-label="Delete conversation"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer - Sticky */}
      <div className="px-3 py-2.5 border-t border-sidebar-border flex-shrink-0 bg-sidebar">
        {/* Admin links - shown based on role */}
        {(isTenantAdmin || isSuperAdmin) && (
          <div className="mb-2 space-y-1">
            {isTenantAdmin && (
              <Link
                to="/admin"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-hover transition-colors"
              >
                <Shield className="h-4 w-4" />
                Tenant Admin
              </Link>
            )}
            {isSuperAdmin && (
              <Link
                to="/super-admin"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-primary/70 hover:text-primary hover:bg-primary/10 transition-colors"
              >
                <Shield className="h-4 w-4" />
                Super Admin
              </Link>
            )}
          </div>
        )}

        {/* User info and settings */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center flex-shrink-0">
              <User className="h-4 w-4 text-sidebar-foreground/70" />
            </div>
            <span className="text-sm text-sidebar-foreground truncate">{userName}</span>
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <ThemeToggle />
            <Link
              to="/settings"
              className="p-1.5 rounded-md transition-colors hover:bg-sidebar-hover text-sidebar-foreground/70 hover:text-sidebar-foreground"
              aria-label="Settings"
            >
              <Settings className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
