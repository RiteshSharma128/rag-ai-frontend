'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { meetingAPI } from '@/lib/api';
import { useRouter } from 'next/navigation';
import {
  Video, Plus, Clock, Users, Play, FileText,
  Loader2, CheckCircle, RadioTower, BarChart2
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { color: string; label: string; dot: string }> = {
    scheduled: { color: 'text-blue-400 bg-blue-400/10', label: 'Scheduled', dot: 'bg-blue-400' },
    live: { color: 'text-green-400 bg-green-400/10', label: 'Live', dot: 'bg-green-400 animate-pulse' },
    ended: { color: 'text-slate-400 bg-slate-400/10', label: 'Ended', dot: 'bg-slate-500' },
  };
  const s = map[status] || map.ended;
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium', s.color)}>
      <span className={clsx('w-1.5 h-1.5 rounded-full', s.dot)} />
      {s.label}
    </span>
  );
};

export default function MeetingsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [showForm, setShowForm] = useState(false);

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ['meetings'],
    queryFn: () => meetingAPI.getAll().then(r => r.data.meetings),
  });

  const createMeeting = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const { data } = await meetingAPI.create(newTitle.trim());
      qc.invalidateQueries({ queryKey: ['meetings'] });
      toast.success('Meeting created!');
      router.push(`/meetings/${data.meeting.roomId}`);
    } catch {
      toast.error('Failed to create meeting');
    } finally {
      setCreating(false);
    }
  };

  const joinMeeting = (roomId: string) => {
    router.push(`/meetings/${roomId}`);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Meetings</h1>
          <p className="text-slate-400 text-sm mt-1">Video calls with AI recording & analysis</p>
        </div>
        <button
          onClick={() => setShowForm(p => !p)}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl px-4 py-2 text-sm font-medium transition-all"
        >
          <Plus className="w-4 h-4" /> New Meeting
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="glass rounded-2xl p-5 mb-6 animate-slide-up">
          <h2 className="text-sm font-semibold text-white mb-3">Create New Meeting</h2>
          <div className="flex gap-3">
            <input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createMeeting()}
              placeholder="Meeting title (e.g., Team standup)"
              className="flex-1 bg-surface-900 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500"
            />
            <button
              onClick={createMeeting}
              disabled={creating || !newTitle.trim()}
              className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl px-5 py-2.5 text-sm font-medium transition-all flex items-center gap-2"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
              Start
            </button>
          </div>
        </div>
      )}

      {/* Meetings list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
        </div>
      ) : meetings.length === 0 ? (
        <div className="text-center py-16 glass rounded-2xl">
          <Video className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">No meetings yet.</p>
          <p className="text-slate-600 text-xs mt-1">Create one to get started!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {meetings.map((meeting: any) => (
            <div key={meeting._id} className="glass rounded-2xl p-5 hover:border-slate-600/60 transition-all">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-brand-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Video className="w-5 h-5 text-brand-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-white">{meeting.title}</h3>
                    <StatusBadge status={meeting.status} />
                  </div>

                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {meeting.startTime
                        ? formatDistanceToNow(new Date(meeting.startTime), { addSuffix: true })
                        : format(new Date(meeting.createdAt), 'MMM d, yyyy')}
                    </span>
                    {meeting.duration && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {Math.floor(meeting.duration / 60)}m {meeting.duration % 60}s
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {meeting.participants?.length || 0} participants
                    </span>
                    {meeting.meetingScore?.overall && (
                      <span className="flex items-center gap-1 text-brand-400">
                        <BarChart2 className="w-3 h-3" />
                        Score: {meeting.meetingScore.overall}/10
                      </span>
                    )}
                  </div>

                  {meeting.summary && (
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2">{meeting.summary}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {meeting.status !== 'ended' ? (
                    <button
                      onClick={() => joinMeeting(meeting.roomId)}
                      className="flex items-center gap-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-xl px-3 py-2 text-xs font-medium transition-all"
                    >
                      <Play className="w-3.5 h-3.5" />
                      {meeting.status === 'live' ? 'Join' : 'Start'}
                    </button>
                  ) : (
                    <button
                      onClick={() => router.push(`/meetings/${meeting.roomId}/summary`)}
                      className="flex items-center gap-1.5 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-xl px-3 py-2 text-xs font-medium transition-all"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Summary
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
