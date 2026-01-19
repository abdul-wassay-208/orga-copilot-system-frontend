import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Conversation, Message } from '@/types/chat';

interface ChatContextType {
  conversations: Conversation[];
  activeConversationId: string | null;
  scrollPositions: Map<string, number>; // conversationId -> scroll position
  setConversations: (conversations: Conversation[]) => void;
  setActiveConversationId: (id: string | null) => void;
  saveScrollPosition: (conversationId: string, position: number) => void;
  getScrollPosition: (conversationId: string) => number;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  addMessageToConversation: (conversationId: string, message: Message) => void;
  clearChatState: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const CHAT_STATE_KEY = 'chatState';

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [conversations, setConversationsState] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationIdState] = useState<string | null>(null);
  const [scrollPositions, setScrollPositions] = useState<Map<string, number>>(new Map());

  // Load chat state from localStorage on mount
  useEffect(() => {
    try {
      const savedState = localStorage.getItem(CHAT_STATE_KEY);
      if (savedState) {
        const parsed = JSON.parse(savedState);
        if (parsed.conversations) {
          setConversationsState(parsed.conversations.map((c: any) => ({
            ...c,
            createdAt: new Date(c.createdAt),
            updatedAt: new Date(c.updatedAt),
            messages: c.messages.map((m: any) => ({
              ...m,
              timestamp: new Date(m.timestamp),
            })),
          })));
        }
        if (parsed.activeConversationId) {
          setActiveConversationIdState(parsed.activeConversationId);
        }
        if (parsed.scrollPositions) {
          setScrollPositions(new Map(Object.entries(parsed.scrollPositions)));
        }
      }
    } catch (error) {
      console.error('Failed to load chat state from localStorage:', error);
    }
  }, []);

  // Save chat state to localStorage whenever it changes
  useEffect(() => {
    try {
      const stateToSave = {
        conversations,
        activeConversationId,
        scrollPositions: Object.fromEntries(scrollPositions),
      };
      localStorage.setItem(CHAT_STATE_KEY, JSON.stringify(stateToSave));
    } catch (error) {
      console.error('Failed to save chat state to localStorage:', error);
    }
  }, [conversations, activeConversationId, scrollPositions]);

  const setConversations = useCallback((newConversations: Conversation[]) => {
    setConversationsState(newConversations);
  }, []);

  const setActiveConversationId = useCallback((id: string | null) => {
    setActiveConversationIdState(id);
  }, []);

  const saveScrollPosition = useCallback((conversationId: string, position: number) => {
    setScrollPositions((prev) => {
      const newMap = new Map(prev);
      newMap.set(conversationId, position);
      return newMap;
    });
  }, []);

  const getScrollPosition = useCallback((conversationId: string) => {
    return scrollPositions.get(conversationId) || 0;
  }, [scrollPositions]);

  const updateConversation = useCallback((id: string, updates: Partial<Conversation>) => {
    setConversationsState((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  }, []);

  const addMessageToConversation = useCallback((conversationId: string, message: Message) => {
    setConversationsState((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? { ...c, messages: [...c.messages, message], updatedAt: new Date() }
          : c
      )
    );
  }, []);

  const clearChatState = useCallback(() => {
    setConversationsState([]);
    setActiveConversationIdState(null);
    setScrollPositions(new Map());
    localStorage.removeItem(CHAT_STATE_KEY);
  }, []);

  const value = {
    conversations,
    activeConversationId,
    scrollPositions,
    setConversations,
    setActiveConversationId,
    saveScrollPosition,
    getScrollPosition,
    updateConversation,
    addMessageToConversation,
    clearChatState,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
