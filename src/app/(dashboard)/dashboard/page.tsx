'use client';

// import { useQuery } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query'; // ✅ CORRECT
import { analyticsAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import {
  MessageSquare, FileText, Video, TrendingUp,
  Plus, ArrowRight, Clock, Zap
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

const StatCard = ({ icon: Icon, label, value, color, sub }: any) => (
  <div className="glass rounded-2xl p-5 hover:border-slate-600/60 transition-all">
    <div className="flex items-start justify-between mb-3">
      <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center`}>
        <Icon className="w-4 h-4" />
      </div>
    </div>
    <p className="text-2xl font-bold text-white">{value ?? '—'}</p>
    <p className="text-xs text-slate-400 mt-1">{label}</p>
    {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
  </div>
);

const QuickAction = ({ href, icon: Icon, label, desc, color }: any) => (
  <Link href={href} className="glass rounded-xl p-4 hover:border-slate-600/60 transition-all flex items-center gap-3 group">
    <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
      <Icon className="w-4 h-4" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-white">{label}</p>
      <p className="text-xs text-slate-500">{desc}</p>
    </div>
    <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all" />
  </Link>
);

export default function DashboardPage() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => analyticsAPI.getDashboard().then(r => r.data.data),
    staleTime: 2 * 60 * 1000,
  });



  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const stats = data?.overview;

  // Build chart data for last 7 days
  const chartData = (() => {
    const days: Record<string, { date: string; chats: number; meetings: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = format(d, 'yyyy-MM-dd');
      days[key] = { date: format(d, 'MMM d'), chats: 0, meetings: 0 };
    }
    data?.charts?.chatsByDay?.forEach((c: any) => { if (days[c._id]) days[c._id].chats = c.count; });
    data?.charts?.meetingsByDay?.forEach((m: any) => { if (days[m._id]) days[m._id].meetings = m.count; });
    return Object.values(days);
  })();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          {greeting()}, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-slate-400 text-sm mt-1">Here's what's happening in your workspace</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={MessageSquare} label="Total Chats" value={stats?.totalChats}
          color="bg-blue-600/20 text-blue-400"
          sub={`+${stats?.recentChats || 0} this week`} />
        <StatCard icon={FileText} label="Documents" value={stats?.totalDocuments}
          color="bg-purple-600/20 text-purple-400" />
        <StatCard icon={Video} label="Meetings" value={stats?.totalMeetings}
          color="bg-green-600/20 text-green-400"
          sub={`${stats?.avgMeetingDuration || 0} min avg`} />
        <StatCard icon={TrendingUp} label="Messages Sent" value={stats?.totalMessages}
          color="bg-orange-600/20 text-orange-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Chart */}
        <div className="lg:col-span-2 glass rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Activity (last 7 days)</h2>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Line type="monotone" dataKey="chats" stroke="#0ea5e9" strokeWidth={2} dot={false} name="Chats" />
              <Line type="monotone" dataKey="meetings" stroke="#10b981" strokeWidth={2} dot={false} name="Meetings" />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2">
            <span className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-2.5 h-0.5 bg-brand-500 rounded" />Chats</span>
            <span className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-2.5 h-0.5 bg-green-500 rounded" />Meetings</span>
          </div>
        </div>

        {/* Quick actions */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-white mb-4">Quick Start</h2>
          <QuickAction href="/chat" icon={Plus} label="New AI Chat" desc="Chat with your documents" color="bg-brand-600/20 text-brand-400" />
          <QuickAction href="/documents" icon={FileText} label="Upload Document" desc="PDF, TXT, Markdown" color="bg-purple-600/20 text-purple-400" />
          <QuickAction href="/meetings" icon={Video} label="Start Meeting" desc="Video call with AI" color="bg-green-600/20 text-green-400" />
          <QuickAction href="/analytics" icon={TrendingUp} label="View Analytics" desc="Your productivity stats" color="bg-orange-600/20 text-orange-400" />
        </div>
      </div>
    </div>
  );
}
