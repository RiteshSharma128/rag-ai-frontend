'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, X, Check,  Trash2 } from 'lucide-react';
import { notificationsAPI } from '@/lib/api';
import { useSocket } from '@/context/SocketContext';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const { socket } = useSocket();

  const fetchNotifications = async () => {
    try {
      const res = await notificationsAPI.getAll();
      setNotifications(res.data.notifications);
      setUnread(res.data.unreadCount);
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('notification:new', (notif: Notification) => {
      setNotifications(prev => [notif, ...prev]);
      setUnread(u => u + 1);
    });
    return () => { socket.off('notification:new'); };
  }, [socket]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const markAllRead = async () => {
    await notificationsAPI.markAllRead();
    setNotifications(n => n.map(x => ({ ...x, isRead: true })));
    setUnread(0);
  };

  const markRead = async (id: string) => {
    await notificationsAPI.markRead(id);
    setNotifications(n => n.map(x => x._id === id ? { ...x, isRead: true } : x));
    setUnread(u => Math.max(0, u - 1));
  };

  const deleteNotif = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await notificationsAPI.delete(id);
    const notif = notifications.find(n => n._id === id);
    setNotifications(n => n.filter(x => x._id !== id));
    if (notif && !notif.isRead) setUnread(u => Math.max(0, u - 1));
  };

  const typeColors: Record<string, string> = {
    chat: 'bg-blue-500/20 text-blue-400',
    meeting: 'bg-green-500/20 text-green-400',
    document: 'bg-purple-500/20 text-purple-400',
    system: 'bg-slate-500/20 text-slate-400',
    mention: 'bg-orange-500/20 text-orange-400',
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-all"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-brand-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-surface-900 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button onClick={markAllRead} className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No notifications</p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n._id}
                  onClick={() => !n.isRead && markRead(n._id)}
                  className={clsx(
                    'flex gap-3 px-4 py-3 border-b border-slate-800/50 cursor-pointer hover:bg-surface-800/50 transition-all group',
                    !n.isRead && 'bg-brand-900/10'
                  )}
                >
                  <div className={clsx('w-7 h-7 rounded-lg flex items-center justify-center text-xs flex-shrink-0 mt-0.5', typeColors[n.type] || typeColors.system)}>
                    {n.type[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-200 truncate">{n.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-slate-600 mt-1">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {!n.isRead && <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />}
                    <button
                      onClick={(e) => deleteNotif(n._id, e)}
                      className="text-slate-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
