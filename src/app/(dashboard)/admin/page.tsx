'use client';

import { useAuth } from '@/context/AuthContext';
import { analyticsAPI, usersAPI } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, Shield, BarChart2, Crown,
  Trash2, UserCheck, Loader2, Activity,
  MessageSquare, Video, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  // Only admin can access
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/dashboard');
      toast.error('Admin access required');
    }
  }, [user]);

  const { data: teamData, isLoading: teamLoading } = useQuery({
    queryKey: ['team-analytics'],
    queryFn: () => analyticsAPI.getTeam().then(r => r.data.data),
    enabled: user?.role === 'admin',
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => usersAPI.getAll().then(r => r.data.users),
    enabled: user?.role === 'admin',
  });

  const rolesMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => usersAPI.changeRole(id, role),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['all-users'] }); toast.success('Role updated!'); },
    onError: () => toast.error('Failed to update role'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersAPI.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['all-users'] }); toast.success('User removed'); },
    onError: () => toast.error('Failed to delete user'),
  });

  if (user?.role !== 'admin') return null;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-orange-600/20 flex items-center justify-center">
          <Shield className="w-5 h-5 text-orange-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-slate-400 text-sm">Team management and overview</p>
        </div>
      </div>

      {/* Team Stats */}
      {teamLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Users', value: teamData?.totalUsers || 0, icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10' },
            { label: 'Active (7 days)', value: teamData?.activeUsers || 0, icon: Activity, color: 'text-green-400', bg: 'bg-green-400/10' },
            { label: 'Meetings', value: teamData?.recentMeetings?.length || 0, icon: Video, color: 'text-purple-400', bg: 'bg-purple-400/10' },
            { label: 'Top Users', value: teamData?.topUsers?.length || 0, icon: Crown, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
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
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Users */}
        {teamData?.topUsers?.length > 0 && (
          <div className="glass rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Crown className="w-4 h-4 text-yellow-400" />
              Most Active Users
            </h2>
            <div className="space-y-3">
              {teamData.topUsers.map((u: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-600/20 flex items-center justify-center text-sm font-bold text-brand-300 flex-shrink-0">
                    {u.user?.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white">{u.user?.name}</p>
                    <p className="text-xs text-slate-500">{u.chatCount} chats</p>
                  </div>
                  <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-500 rounded-full"
                      style={{ width: `${Math.min((u.chatCount / (teamData.topUsers[0]?.chatCount || 1)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Meetings */}
        {teamData?.recentMeetings?.length > 0 && (
          <div className="glass rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Video className="w-4 h-4 text-green-400" />
              Recent Meetings
            </h2>
            <div className="space-y-3">
              {teamData.recentMeetings.map((m: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-600/20 flex items-center justify-center flex-shrink-0">
                    <Video className="w-3.5 h-3.5 text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{m.title}</p>
                    <p className="text-xs text-slate-500">
                      {m.host?.name} · {m.duration ? `${Math.floor(m.duration / 60)}m` : 'N/A'}
                    </p>
                  </div>
                  {m.meetingScore?.overall && (
                    <span className="text-xs text-brand-400 font-medium">{m.meetingScore.overall}/10</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* User Management */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-brand-400" />
            User Management
          </h2>
          <span className="text-xs text-slate-500">{users.length} users</span>
        </div>

        {usersLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />
          </div>
        ) : (
          <div className="divide-y divide-slate-800/50">
            {users.map((u: any) => (
              <div key={u._id} className="flex items-center gap-4 px-5 py-3 hover:bg-surface-800/30 transition-all">
                {/* Avatar */}
                <div className="w-9 h-9 rounded-lg bg-brand-600/20 flex items-center justify-center text-sm font-bold text-brand-300 flex-shrink-0">
                  {u.name?.[0]?.toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white truncate">{u.name}</p>
                    {u._id === user?._id && (
                      <span className="text-[10px] text-brand-400 bg-brand-400/10 px-1.5 py-0.5 rounded-full">You</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{u.email}</p>
                </div>

                {/* Online status */}
                <div className={clsx(
                  'w-2 h-2 rounded-full flex-shrink-0',
                  u.isOnline ? 'bg-green-400' : 'bg-slate-600'
                )} title={u.isOnline ? 'Online' : `Last seen ${formatDistanceToNow(new Date(u.lastSeen || Date.now()), { addSuffix: true })}`} />

                {/* Role selector */}
                <select
                  value={u.role}
                  onChange={(e) => rolesMutation.mutate({ id: u._id, role: e.target.value })}
                  disabled={u._id === user?._id}
                  className="bg-surface-800 border border-slate-700 text-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="user">User</option>
                  <option value="moderator">Moderator</option>
                  <option value="admin">Admin</option>
                </select>

                {/* Delete */}
                {u._id !== user?._id && (
                  <button
                    onClick={() => {
                      if (confirm(`Remove ${u.name}?`)) deleteMutation.mutate(u._id);
                    }}
                    className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
