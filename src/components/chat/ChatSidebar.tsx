'use client';

import { useEffect, useState } from 'react';
import { useChatStore } from '@/store/chatStore';
import { formatDistanceToNow } from 'date-fns';
import {
  MessageSquare, Plus, Trash2, Edit2, Archive,
  Check, X, Search, FileText
} from 'lucide-react';
import clsx from 'clsx';

interface Props {
  onSelect?: () => void;
}

export default function ChatSidebar({ onSelect }: Props) {
  const { chats, activeChat, fetchChats, createChat, selectChat, deleteChat, updateChatTitle } = useChatStore();
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchChats();
  }, []);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      await createChat();
      onSelect?.();
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelect = async (id: string) => {
    await selectChat(id);
    onSelect?.();
  };

  const handleRename = async (id: string) => {
    if (editTitle.trim()) await updateChatTitle(id, editTitle.trim());
    setEditingId(null);
  };

  const startEdit = (e: React.MouseEvent, chat: any) => {
    e.stopPropagation();
    setEditingId(chat._id);
    setEditTitle(chat.title);
  };

  const filtered = chats.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-surface-900 border-r border-slate-800">
      {/* Header */}
      <div className="p-3 border-b border-slate-800">
        <button
          onClick={handleCreate}
          disabled={isCreating}
          className="w-full flex items-center gap-2 px-3 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-all"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search chats..."
            className="w-full pl-9 pr-3 py-2 bg-surface-800 border border-slate-700 rounded-lg text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-brand-500 transition-all"
          />
        </div>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
        {filtered.length === 0 ? (
          <div className="py-8 text-center">
            <MessageSquare className="w-7 h-7 text-slate-700 mx-auto mb-2" />
            <p className="text-xs text-slate-600">
              {search ? 'No chats found' : 'No chats yet'}
            </p>
          </div>
        ) : (
          filtered.map(chat => (
            <div
              key={chat._id}
              onClick={() => handleSelect(chat._id)}
              className={clsx(
                'group flex items-start gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all relative',
                activeChat?._id === chat._id
                  ? 'bg-brand-600/15 border border-brand-600/25'
                  : 'hover:bg-surface-800'
              )}
            >
              <div className="mt-0.5 flex-shrink-0">
                {chat.document ? (
                  <FileText className="w-3.5 h-3.5 text-purple-400" />
                ) : (
                  <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                {editingId === chat._id ? (
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <input
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleRename(chat._id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      className="flex-1 bg-surface-700 border border-brand-500 rounded px-2 py-0.5 text-xs text-white focus:outline-none"
                      autoFocus
                    />
                    <button onClick={() => handleRename(chat._id)} className="text-green-400">
                      <Check className="w-3 h-3" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-slate-500">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-medium text-slate-200 truncate">{chat.title}</p>
                    <p className="text-[10px] text-slate-600 mt-0.5">
                      {formatDistanceToNow(new Date(chat.lastMessageAt), { addSuffix: true })}
                      {chat.document && (
                        <span className="ml-1 text-purple-500">· {chat.document.name.substring(0, 20)}</span>
                      )}
                    </p>
                  </>
                )}
              </div>

              {/* Actions */}
              {editingId !== chat._id && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                  <button
                    onClick={(e) => startEdit(e, chat)}
                    className="p-1 rounded text-slate-600 hover:text-slate-300 hover:bg-slate-700"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteChat(chat._id); }}
                    className="p-1 rounded text-slate-600 hover:text-red-400 hover:bg-red-900/20"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
