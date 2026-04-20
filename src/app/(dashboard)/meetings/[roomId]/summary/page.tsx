'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { meetingAPI } from '@/lib/api';
import {
  ArrowLeft, Brain, CheckSquare, Zap, TrendingUp,
  Clock, Users, FileText, Loader2, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function MeetingSummaryPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const router = useRouter();

  const { data: meetingData, isLoading, refetch } = useQuery({
    queryKey: ['meeting-detail', roomId],
    queryFn: () => meetingAPI.getOne(roomId).then(r => r.data.meeting),
  });

  const analyzeMutation = useMutation({
    mutationFn: () => meetingAPI.analyze(meetingData?._id),
    onSuccess: () => { refetch(); toast.success('Meeting analyzed!'); },
    onError: () => toast.error('Analysis failed'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
      </div>
    );
  }

  const m = meetingData;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">{m?.title}</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {m?.duration ? `${Math.floor(m.duration / 60)}m ${m.duration % 60}s` : 'Duration unknown'}
            {' · '}{m?.participants?.length || 0} participants
          </p>
        </div>
        {!m?.summary && (
          <button
            onClick={() => analyzeMutation.mutate()}
            disabled={analyzeMutation.isPending}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl px-4 py-2 text-sm font-medium transition-all"
          >
            {analyzeMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : <Brain className="w-4 h-4" />}
            Analyze with AI
          </button>
        )}
      </div>

      {!m?.summary ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Brain className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">No AI analysis yet.</p>
          <p className="text-slate-600 text-xs mt-1">Click "Analyze with AI" to generate summary, action items, and highlights.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Score cards */}
          {m.meetingScore && (
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Overall', value: m.meetingScore.overall, color: 'text-brand-400' },
                { label: 'Engagement', value: m.meetingScore.engagement, color: 'text-green-400' },
                { label: 'Productivity', value: m.meetingScore.productivity, color: 'text-purple-400' },
              ].map(s => (
                <div key={s.label} className="glass rounded-2xl p-4 text-center">
                  <p className={`text-3xl font-bold ${s.color}`}>{s.value}<span className="text-lg text-slate-500">/10</span></p>
                  <p className="text-xs text-slate-400 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Summary */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-brand-400" />
              <h2 className="text-sm font-semibold text-white">Summary</h2>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">{m.summary}</p>
          </div>

          {/* Sentiment */}
          {m.sentiment && (
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-brand-400" />
                <h2 className="text-sm font-semibold text-white">Sentiment</h2>
                <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-medium capitalize
                  ${m.sentiment.overall === 'positive' ? 'text-green-400 bg-green-400/10' :
                    m.sentiment.overall === 'negative' ? 'text-red-400 bg-red-400/10' :
                    'text-yellow-400 bg-yellow-400/10'}`}>
                  {m.sentiment.overall}
                </span>
              </div>
              {m.sentiment.explanation && (
                <p className="text-xs text-slate-400">{m.sentiment.explanation}</p>
              )}
            </div>
          )}

          {/* Highlights */}
          {m.highlights?.length > 0 && (
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-brand-400" />
                <h2 className="text-sm font-semibold text-white">Key Highlights</h2>
              </div>
              <div className="space-y-2">
                {m.highlights.map((h: string, i: number) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="w-5 h-5 bg-brand-600/20 text-brand-400 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                    <p className="text-sm text-slate-300">{h}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Items */}
          {m.actionItems?.length > 0 && (
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <CheckSquare className="w-4 h-4 text-brand-400" />
                <h2 className="text-sm font-semibold text-white">Action Items</h2>
              </div>
              <div className="space-y-2">
                {m.actionItems.map((item: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-xl">
                    <div className="w-4 h-4 border-2 border-slate-600 rounded mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200">{item.task}</p>
                      {item.assignee && (
                        <p className="text-xs text-brand-400 mt-0.5">👤 {item.assignee}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
