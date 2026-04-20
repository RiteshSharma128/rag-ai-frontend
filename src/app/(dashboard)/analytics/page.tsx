'use client';

import { useQuery } from '@tanstack/react-query';
import { analyticsAPI } from '@/lib/api';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid, RadarChart,
  PolarGrid, PolarAngleAxis, Radar
} from 'recharts';
import { MessageSquare, FileText, Video, Clock, TrendingUp, Zap, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const Card = ({ children, className = '' }: any) => (
  <div className={`glass rounded-2xl p-5 ${className}`}>{children}</div>
);

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-dashboard'],
    queryFn: () => analyticsAPI.getDashboard().then(r => r.data.data),
  });

  const { data: productivity } = useQuery({
    queryKey: ['analytics-productivity'],
    queryFn: () => analyticsAPI.getProductivity().then(r => r.data.data),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
      </div>
    );
  }

  const overview = data?.overview || {};
  const chartData = (() => {
    const days: Record<string, any> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = format(d, 'yyyy-MM-dd');
      days[key] = { date: format(d, 'EEE'), chats: 0, meetings: 0 };
    }
    data?.charts?.chatsByDay?.forEach((c: any) => { if (days[c._id]) days[c._id].chats = c.count; });
    data?.charts?.meetingsByDay?.forEach((m: any) => { if (days[m._id]) days[m._id].meetings = m.count; });
    return Object.values(days);
  })();

  const radarData = productivity?.meetings?.slice(-5).map((m: any) => ({
    meeting: m.title?.substring(0, 10) || 'Meeting',
    score: m.score,
    duration: Math.min(m.duration, 10)
  })) || [];

  const statCards = [
    { label: 'Total Chats', value: overview.totalChats || 0, icon: MessageSquare, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Documents', value: overview.totalDocuments || 0, icon: FileText, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { label: 'Meetings', value: overview.totalMeetings || 0, icon: Video, color: 'text-green-400', bg: 'bg-green-400/10' },
    { label: 'Messages', value: overview.totalMessages || 0, icon: TrendingUp, color: 'text-orange-400', bg: 'bg-orange-400/10' },
    { label: 'Avg Meeting', value: `${overview.avgMeetingDuration || 0}m`, icon: Clock, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
    { label: 'Meeting Hours', value: `${overview.totalMeetingTime || 0}h`, icon: Zap, color: 'text-pink-400', bg: 'bg-pink-400/10' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-slate-400 text-sm mt-1">Your productivity overview</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center mb-3`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className="text-xl font-bold text-white">{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chat activity */}
        <Card>
          <h2 className="text-sm font-semibold text-white mb-4">Chat Activity (7 days)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barSize={16}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Bar dataKey="chats" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="Chats" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Meeting trend */}
        <Card>
          <h2 className="text-sm font-semibold text-white mb-4">Meeting Trend (7 days)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Line type="monotone" dataKey="meetings" stroke="#10b981" strokeWidth={2.5} dot={{ fill: '#10b981', r: 3 }} name="Meetings" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Meeting scores */}
      {productivity?.meetings?.length > 0 && (
        <Card>
          <h2 className="text-sm font-semibold text-white mb-4">Recent Meeting Scores</h2>
          <div className="space-y-3">
            {productivity.meetings.map((m: any, i: number) => (
              <div key={i} className="flex items-center gap-4">
                <p className="text-xs text-slate-400 w-32 truncate">{m.title}</p>
                <div className="flex-1 bg-slate-800 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-brand-600 to-brand-400 h-2 rounded-full transition-all"
                    style={{ width: `${(m.score / 10) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-brand-400 w-10 text-right">{m.score}/10</span>
                <span className="text-xs text-slate-600 w-12">{m.duration}m</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
