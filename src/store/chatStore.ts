'use client';
import { create } from 'zustand';
import { chatsAPI } from '@/lib/api';

interface Message {
  _id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: any[];
  metadata?: any;
  createdAt?: string;
}

interface Chat {
  _id: string;
  title: string;
  document?: { _id: string; name: string; fileType: string };
  messages: Message[];
  lastMessageAt: string;
  isArchived: boolean;
}

interface ChatState {
  chats: Chat[];
  activeChat: Chat | null;
  isLoading: boolean;
  isSending: boolean;
  streamingContent: string;
  isStreaming: boolean;

  fetchChats: () => Promise<void>;
  createChat: (documentId?: string, title?: string) => Promise<Chat>;
  selectChat: (chatId: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  sendMessageStream: (content: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  updateChatTitle: (chatId: string, title: string) => Promise<void>;
  setActiveChat: (chat: Chat | null) => void;
  addOptimisticMessage: (message: Message) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  activeChat: null,
  isLoading: false,
  isSending: false,
  streamingContent: '',
  isStreaming: false,

  fetchChats: async () => {
    set({ isLoading: true });
    try {
      const res = await chatsAPI.getAll();
      set({ chats: res.data.chats, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  createChat: async (documentId?, title?) => {
    const res = await chatsAPI.create({ documentId, title });
    const newChat = res.data.chat;
    set((s) => ({ chats: [newChat, ...s.chats], activeChat: newChat }));
    return newChat;
  },

  selectChat: async (chatId) => {
    set({ isLoading: true });
    try {
      const res = await chatsAPI.getOne(chatId);
      set({ activeChat: res.data.chat, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  sendMessage: async (content) => {
    const { activeChat } = get();
    if (!activeChat) return;

    const userMsg: Message = { role: 'user', content, createdAt: new Date().toISOString() };
    get().addOptimisticMessage(userMsg);
    set({ isSending: true });

    try {
      const res = await chatsAPI.sendMessage(activeChat._id, content);
      const aiMsg = res.data.message;

      set((s) => ({
        isSending: false,
        activeChat: s.activeChat
          ? { ...s.activeChat, messages: [...s.activeChat.messages, aiMsg] }
          : null,
      }));

      // Update chat title in sidebar
      const updated = await chatsAPI.getOne(activeChat._id);
      set((s) => ({
        activeChat: updated.data.chat,
        chats: s.chats.map((c) => c._id === activeChat._id ? updated.data.chat : c),
      }));
    } catch {
      set({ isSending: false });
    }
  },

  sendMessageStream: async (content) => {
    const { activeChat } = get();
    if (!activeChat) return;

    const userMsg: Message = { role: 'user', content, createdAt: new Date().toISOString() };
    get().addOptimisticMessage(userMsg);
    set({ isSending: true, isStreaming: true, streamingContent: '' });

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_URL}/chats/${activeChat._id}/message/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content }),
      });

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'chunk') {
                accumulated += data.content;
                set({ streamingContent: accumulated });
              } else if (data.type === 'done') {
                // Replace streaming with final message
                const aiMsg: Message = {
                  role: 'assistant',
                  content: accumulated,
                  createdAt: new Date().toISOString(),
                };
                set((s) => ({
                  activeChat: s.activeChat
                    ? {
                        ...s.activeChat,
                        title: data.title || s.activeChat.title,
                        messages: [...s.activeChat.messages, aiMsg],
                      }
                    : null,
                  streamingContent: '',
                  isStreaming: false,
                  isSending: false,
                }));
                // Refresh sidebar
                const updated = await chatsAPI.getAll();
                set({ chats: updated.data.chats });
              }
            } catch { /* ignore parse errors */ }
          }
        }
      }
    } catch {
      set({ isSending: false, isStreaming: false, streamingContent: '' });
    }
  },

  addOptimisticMessage: (message) => {
    set((s) => ({
      activeChat: s.activeChat
        ? { ...s.activeChat, messages: [...s.activeChat.messages, message] }
        : null,
    }));
  },

  deleteChat: async (chatId) => {
    await chatsAPI.delete(chatId);
    set((s) => ({
      chats: s.chats.filter((c) => c._id !== chatId),
      activeChat: s.activeChat?._id === chatId ? null : s.activeChat,
    }));
  },

  updateChatTitle: async (chatId, title) => {
    await chatsAPI.updateTitle(chatId, title);
    set((s) => ({
      chats: s.chats.map((c) => (c._id === chatId ? { ...c, title } : c)),
      activeChat: s.activeChat?._id === chatId ? { ...s.activeChat, title } : s.activeChat,
    }));
  },

  setActiveChat: (chat) => set({ activeChat: chat }),
}));
