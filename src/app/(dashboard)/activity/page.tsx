'use client';

import { useState, useEffect } from 'react';
import { useSocket } from '@/context/SocketContext';
import { useAuth } from '@/context/AuthContext';
import { analyticsAPI } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import {
  Activity, MessageSquare, FileText, Video,
  User, Clock, Filter, RefreshCw
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import clsx from 'clsx';

interface ActivityLog {
  userId: string;
  userName: string;
  action: string;
  metadata?: any;
  timestamp: string;
}

const ACTION_ICONS: Record<string, any> = {
  chat: MessageSquare,
  document: FileText,
  meeting: Video,
  user: User,
  default: Activity,
};

const ACTION_COLORS: Record<string, string> = {
  chat: 'text-blue-400 bg-blue-400/10',
  document: 'text-purple-400 bg-purple-400/10',
  meeting: 'text-green-400 bg-green-400/10',
  user: 'text-orange-400 bg-orange-400/10',
  default: 'text-slate-400 bg-slate-400/10',
};

export default function ActivityPage() {
  const { socket } = useSocket();
  const { user } = useAuth();
  const [liveActivity, setLiveActivity] = useState<ActivityLog[]>([]);
  const [filter, setFilter] = useState('all');

  // Listen for realtime activity
  useEffect(() => {
    if (!socket) return;
    socket.on('activity:new', (log: ActivityLog) => {
      setLiveActivity(prev => [log, ...prev].slice(0, 50));
    });
    return () => { socket.off('activity:new'); };
  }, [socket]);

  const { data: dashboard } = useQuery({
    queryKey: ['analytics-dashboard'],
    queryFn: () => analyticsAPI.getDashboard().then(r => r.data.data),
  });

  const getIcon = (action: string) => {
    const key = Object.keys(ACTION_ICONS).find(k => action.toLowerCase().includes(k)) || 'default';
    return ACTION_ICONS[key];
  };

  const getColor = (action: string) => {
    const key = Object.keys(ACTION_COLORS).find(k => action.toLowerCase().includes(k)) || 'default';
    return ACTION_COLORS[key];
  };

  const stats = dashboard?.overview;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Activity Logs</h1>
          <p className="text-slate-400 text-sm mt-1">Real-time team activity and history</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-green-400 bg-green-400/10 px-3 py-1.5 rounded-full border border-green-400/20">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Live
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Chats', value: stats?.totalChats || 0, icon: MessageSquare, color: 'text-blue-400', bg: 'bg-blue-400/10' },
          { label: 'Documents', value: stats?.totalDocuments || 0, icon: FileText, color: 'text-purple-400', bg: 'bg-purple-400/10' },
          { label: 'Meetings', value: stats?.totalMeetings || 0, icon: Video, color: 'text-green-400', bg: 'bg-green-400/10' },
          { label: 'Messages', value: stats?.totalMessages || 0, icon: Activity, color: 'text-orange-400', bg: 'bg-orange-400/10' },
        ].map(s => (
          <div key={s.label} className="glass rounded-2xl p-4">
            <div className={clsx('w-8 h-8 rounded-xl flex items-center justify-center mb-3', s.bg)}>
              <s.icon className={clsx('w-4 h-4', s.color)} />
            </div>
            <p className="text-xl font-bold text-white">{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-slate-500" />
        {['all', 'chat', 'document', 'meeting'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all',
              filter === f
                ? 'bg-brand-600/20 text-brand-300 border border-brand-600/30'
                : 'text-slate-500 hover:text-slate-300 hover:bg-surface-800'
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Live Activity Feed */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-brand-400" />
            Live Activity Feed
          </h2>
          <span className="text-xs text-slate-500">{liveActivity.length} events</span>
        </div>

        <div className="divide-y divide-slate-800/50 max-h-96 overflow-y-auto">
          {liveActivity.length === 0 ? (
            <div className="py-12 text-center">
              <Activity className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Waiting for activity...</p>
              <p className="text-slate-600 text-xs mt-1">Actions from team members will appear here in real-time</p>
            </div>
          ) : (
            liveActivity
              .filter(a => filter === 'all' || a.action.toLowerCase().includes(filter))
              .map((log, i) => {
                const Icon = getIcon(log.action);
                const color = getColor(log.action);
                return (
                  <div key={i} className="flex items-start gap-3 px-5 py-3 hover:bg-surface-800/30 transition-all">
                    <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5', color)}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200">
                        <span className="font-medium text-white">{log.userName}</span>
                        {' '}{log.action}
                      </p>
                      {log.metadata?.title && (
                        <p className="text-xs text-slate-500 mt-0.5 truncate">{log.metadata.title}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-600 flex-shrink-0">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>

      {/* Version History section */}
      <div className="glass rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-brand-400" />
          Version History
        </h2>
        <div className="space-y-3">
          {[
            { version: 'v1.0.0', date: new Date(), note: 'Initial release — RAG AI System launched', tag: 'latest' },
            { version: 'v0.9.0', date: new Date(Date.now() - 86400000 * 3), note: 'WebRTC meetings + AI summary added', tag: '' },
            { version: 'v0.8.0', date: new Date(Date.now() - 86400000 * 7), note: 'PDF RAG pipeline + ChromaDB integration', tag: '' },
            { version: 'v0.7.0', date: new Date(Date.now() - 86400000 * 14), note: 'Authentication with cookies + JWT refresh', tag: '' },
          ].map((v, i) => (
            <div key={i} className="flex items-start gap-4 py-3 border-b border-slate-800/50 last:border-0">
              <div className="flex flex-col items-center">
                <div className={clsx(
                  'w-2 h-2 rounded-full mt-1.5',
                  i === 0 ? 'bg-brand-400' : 'bg-slate-600'
                )} />
                {i < 3 && <div className="w-0.5 h-full bg-slate-800 mt-1" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono font-semibold text-white">{v.version}</span>
                  {v.tag && <span className="badge-blue">{v.tag}</span>}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{v.note}</p>
                <p className="text-[10px] text-slate-600 mt-1">{format(v.date, 'MMM d, yyyy')}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
