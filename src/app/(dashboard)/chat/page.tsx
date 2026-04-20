
'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { chatAPI, documentAPI } from '@/lib/api';
import { useSocket } from '@/context/SocketContext';
import { useAuth } from '@/context/AuthContext';
import ReactMarkdown from 'react-markdown';
import {
  Plus, Send, Trash2, Edit2, Check, X,
  Bot, FileText, Loader2, Zap, MessageSquare, Search
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface Message {
  _id?: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: any[];
  createdAt?: string;
}
interface Chat {
  _id: string;
  title: string;
  lastMessageAt: string;
  document?: { name: string } | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

function ChatPageInner() {
  const { user } = useAuth();
  const { socket, joinChat, leaveChat, sendTyping } = useSocket();
  const qc = useQueryClient();
  const searchParams = useSearchParams();

  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocId, setSelectedDocId] = useState<string>(
    searchParams.get('docId') || ''
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<NodeJS.Timeout>();

  const { data: chats = [] } = useQuery<Chat[]>({
    queryKey: ['chats'],
    queryFn: () => chatAPI.getAll().then(r => r.data.chats),
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: () =>
      documentAPI.getAll().then(r =>
        r.data.documents.filter((d: any) => d.status === 'ready')
      ),
  });

  useEffect(() => {
    if (!activeChatId) {
      setMessages([]);
      setStreamText('');
      return;
    }
    setMessages([]);
    setStreamText('');
    
    chatAPI.getOne(activeChatId)
      .then(r => {
        const msgs = r.data.chat.messages || [];
        setMessages(msgs);
      })
      .catch(() => toast.error('Failed to load chat'));
  
    joinChat(activeChatId);
    return () => { leaveChat(activeChatId); };
  }, [activeChatId]);

  useEffect(() => {
    if (!socket) return;
    socket.on('chat:message', ({ message }: any) => {
      setMessages(prev => [...prev, message]);
    });
    return () => { socket.off('chat:message'); };
  }, [socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamText]);

  
  const createNewChat = async () => {
    // Pehle screen clear karo
    setActiveChatId(null);
    setMessages([]);
    setStreamText('');
    setInput('');
    
    // Sirf screen clear karna hai — chat baad mein first message pe banta hai
    // Ya turant banana ho toh:
    try {
      const { data } = await chatAPI.create({
        documentId: selectedDocId || undefined,
      });
      await qc.invalidateQueries({ queryKey: ['chats'] });
      setActiveChatId(data.chat._id);
    } catch {
      toast.error('Failed to create chat');
    }
  };

  const handleTyping = () => {
    if (!activeChatId) return;
    sendTyping(activeChatId, true);
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(
      () => sendTyping(activeChatId, false),
      1500
    );
  };

  const sendMessage = async () => {
    if (!input.trim() || streaming) return;

    let chatId = activeChatId;
    if (!chatId) {
      try {
        const { data } = await chatAPI.create({
          documentId: selectedDocId || undefined,
        });
        chatId = data.chat._id;
        setActiveChatId(chatId);
        qc.invalidateQueries({ queryKey: ['chats'] });
      } catch {
        toast.error('Failed to create chat');
        return;
      }
    }

    const question = input.trim();
    setInput('');
    setMessages(prev => [
      ...prev,
      { role: 'user', content: question, createdAt: new Date().toISOString() },
    ]);
    setStreaming(true);
    setStreamText('');
    sendTyping(chatId!, false);

    try {
      const response = await fetch(
        `${API_URL}/chats/${chatId}/message/stream`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ content: question }),
        }
      );

      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.type === 'chunk' && parsed.content) {
              fullText += parsed.content;
              setStreamText(fullText);
            }
            if (parsed.type === 'error') {
              throw new Error(parsed.message);
            }
          } catch (e: any) {
            if (e.message && !e.message.includes('JSON')) throw e;
          }
        }
      }
      
      if (fullText.trim()) {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: fullText },
        ]);
      } else {
        // Fallback — non-streaming
        try {
          const res = await fetch(`${API_URL}/chats/${chatId}/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ content: question }),
          });
          const data = await res.json();
          if (data.success) {
            setMessages(prev => [...prev, { role: 'assistant', content: data.message.content }]);
          }
        } catch {
          setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, could not get response.' }]);
        }
      }

      setStreamText('');
      qc.invalidateQueries({ queryKey: ['chats'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to get AI response');
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setStreaming(false);
    }
  };

  const deleteChat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await chatAPI.delete(id);
      qc.invalidateQueries({ queryKey: ['chats'] });
      if (activeChatId === id) { setActiveChatId(null); setMessages([]); }
    } catch {
      toast.error('Failed to delete chat');
    }
  };

  const saveTitle = async (id: string) => {
    if (!editTitle.trim()) return;
    try {
      await chatAPI.updateTitle(id, editTitle);
      qc.invalidateQueries({ queryKey: ['chats'] });
    } catch { /* silent */ }
    setEditingId(null);
  };

  const filteredChats = chats.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-surface-900 border-r border-slate-800 flex flex-col flex-shrink-0">
        <div className="p-3 border-b border-slate-800 space-y-2">
          <button
            onClick={createNewChat}
            className="w-full flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl px-3 py-2.5 text-sm font-medium transition-all"
          >
            <Plus className="w-4 h-4" /> New Chat
          </button>

          {documents.length > 0 && (
            <select
              value={selectedDocId}
              onChange={e => setSelectedDocId(e.target.value)}
              className="w-full bg-surface-800 border border-slate-700 text-slate-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500"
            >
              <option value="">No document (general chat)</option>
              {documents.map((d: any) => (
                <option key={d._id} value={d._id}>{d.name}</option>
              ))}
            </select>
          )}

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
              className="w-full bg-surface-800 border border-slate-700 text-slate-300 placeholder-slate-600 text-xs rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {filteredChats.length === 0 ? (
            <p className="text-xs text-slate-600 text-center py-8">No chats yet</p>
          ) : (
            filteredChats.map(chat => (
              <div
                key={chat._id}
                onClick={() => {
                  if (activeChatId === chat._id) {
                    setMessages([]);
                    chatAPI.getOne(chat._id).then(r => {
                      setMessages(r.data.chat.messages || []);
                    });
                  } else {
                    setActiveChatId(chat._id);
                  }
                }}
                className={clsx(
                  'group mx-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all mb-0.5 flex items-start gap-2',
                  activeChatId === chat._id
                    ? 'bg-brand-600/15 text-brand-300'
                    : 'hover:bg-slate-800/60 text-slate-300'
                )}
              >
                <MessageSquare className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-slate-500" />
                <div className="flex-1 min-w-0">
                  {editingId === chat._id ? (
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <input
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && saveTitle(chat._id)}
                        className="flex-1 bg-surface-900 border border-brand-500 text-white text-xs rounded px-1 py-0.5 focus:outline-none"
                        autoFocus
                      />
                      <button onClick={() => saveTitle(chat._id)}>
                        <Check className="w-3 h-3 text-green-400" />
                      </button>
                      <button onClick={() => setEditingId(null)}>
                        <X className="w-3 h-3 text-red-400" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs font-medium truncate">{chat.title}</p>
                  )}
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    {format(new Date(chat.lastMessageAt), 'MMM d')}
                    {chat.document && (
                      <span className="text-brand-600 ml-1">
                        · {chat.document.name.substring(0, 15)}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setEditingId(chat._id);
                      setEditTitle(chat.title);
                    }}
                    className="text-slate-600 hover:text-slate-300"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={e => deleteChat(chat._id, e)}
                    className="text-slate-600 hover:text-red-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {messages.length === 0 && !streaming && !activeChatId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 bg-brand-600/15 border border-brand-500/20 rounded-2xl flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-brand-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">RAG AI Assistant</h2>
            <p className="text-slate-400 text-sm max-w-sm mb-6">
              Upload a document and ask questions, or start a general conversation.
            </p>
            <button
              onClick={createNewChat}
              className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl px-5 py-2.5 text-sm font-medium transition-all"
            >
              <Plus className="w-4 h-4" /> Start New Chat
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={clsx(
                  'flex gap-3',
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 bg-brand-600/25 border border-brand-500/30 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-brand-400" />
                  </div>
                )}
                <div
                  className={clsx(
                    'max-w-[75%] rounded-2xl px-4 py-3 text-sm',
                    msg.role === 'user'
                      ? 'bg-brand-600/20 border border-brand-500/30 text-slate-100'
                      : 'bg-surface-800 border border-slate-700/50 text-slate-200'
                  )}
                >
                  {msg.role === 'assistant' ? (
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-700/50">
                      <p className="text-[10px] text-slate-500 mb-1">Sources:</p>
                      {msg.sources.slice(0, 2).map((s, si) => (
                        <div key={si} className="text-[10px] text-slate-500 flex items-center gap-1">
                          <FileText className="w-2.5 h-2.5" />
                          <span>{s.fileName} · {Math.round((s.similarity || 0) * 100)}% match</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-white">
                    {user?.name?.[0]?.toUpperCase()}
                  </div>
                )}
              </div>
            ))}

            {streaming && (
              <div className="flex gap-3 justify-start">
                <div className="w-7 h-7 bg-brand-600/25 border border-brand-500/30 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-brand-400" />
                </div>
                <div className="max-w-[75%] bg-surface-800 border border-slate-700/50 rounded-2xl px-4 py-3 text-sm text-slate-200">
                  {streamText ? (
                    <ReactMarkdown>{streamText}</ReactMarkdown>
                  ) : (
                    <div className="flex gap-1.5 items-center h-5">
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                    </div>
                  )}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-slate-800 bg-surface-900/50">
          <div className="flex gap-3 items-end max-w-4xl mx-auto">
            <textarea
              value={input}
              onChange={e => { setInput(e.target.value); handleTyping(); }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Ask anything... (Enter to send, Shift+Enter for newline)"
              rows={1}
              className="flex-1 bg-surface-900 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 resize-none transition-all"
              style={{ minHeight: '46px', maxHeight: '120px' }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || streaming}
              className="bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl p-3 transition-all flex-shrink-0"
            >
              {streaming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="text-center text-[10px] text-slate-600 mt-2">
            <Zap className="w-2.5 h-2.5 inline mr-1" />
            Powered by Gemini Pro · RAG-enhanced responses
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ChatPageInner />
    </Suspense>
  );
}