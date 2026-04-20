'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { meetingAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import {
  Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff,
  MessageSquare, Users, Maximize2, BarChart2, Brain,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface Participant {
  userId: string;
  socketId: string;
  name: string;
  avatar?: string;
  stream?: MediaStream;
  audio: boolean;
  video: boolean;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
};

export default function MeetingRoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { socket, joinMeeting, leaveMeeting, sendOffer, sendAnswer, sendIceCandidate, sendMediaState } = useSocket();

  const [meeting, setMeeting] = useState<any>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [audio, setAudio] = useState(true);
  const [video, setVideo] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [captions, setCaptions] = useState<{ name: string; text: string }[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showCaptions, setShowCaptions] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [emotion, setEmotion] = useState<string>('neutral');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingInterval = useRef<NodeJS.Timeout>();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  // Init: get media + join meeting
  useEffect(() => {
    const init = async () => {
      try {
        const [, stream] = await Promise.all([
          meetingAPI.join(roomId),
          navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        ]);
        const { data } = await meetingAPI.getOne(roomId);
        setMeeting(data.meeting);
        setLocalStream(stream);
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        joinMeeting(roomId);
      } catch (err: any) {
        toast.error('Could not access camera/microphone');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    init();
    return () => {
      localStream?.getTracks().forEach(t => t.stop());
      peerConnections.current.forEach(pc => pc.close());
      leaveMeeting(roomId);
    };
  }, [roomId]);

  // Create peer connection for a participant
  const createPeerConnection = useCallback((targetSocketId: string, targetUserId: string, targetName: string) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local tracks
    localStream?.getTracks().forEach(track => {
      if (localStream) pc.addTrack(track, localStream);
    });

    // On remote stream
    pc.ontrack = (event) => {
      const stream = event.streams[0];
      setParticipants(prev => prev.map(p =>
        p.socketId === targetSocketId ? { ...p, stream } : p
      ));
      const videoEl = remoteVideoRefs.current.get(targetSocketId);
      if (videoEl) videoEl.srcObject = stream;
    };

    // ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) sendIceCandidate(targetSocketId, event.candidate.toJSON());
    };

    peerConnections.current.set(targetSocketId, pc);
    return pc;
  }, [localStream, sendIceCandidate]);

  // Socket events for WebRTC
  useEffect(() => {
    if (!socket || !localStream) return;

    // New user joined — initiate offer
    socket.on('meeting:participants', async (existingParticipants: any[]) => {
      for (const p of existingParticipants) {
        const pc = createPeerConnection(p.socketId, p.userId, p.name);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendOffer(p.socketId, offer, roomId);
        setParticipants(prev => {
          if (prev.find(x => x.socketId === p.socketId)) return prev;
          return [...prev, { ...p, audio: true, video: true }];
        });
      }
    });

    socket.on('meeting:user-joined', async ({ userId: uid, name, avatar, socketId }: any) => {
      toast.success(`${name} joined`);
      setParticipants(prev => {
        if (prev.find(p => p.socketId === socketId)) return prev;
        return [...prev, { userId: uid, socketId, name, avatar, audio: true, video: true }];
      });
    });

    socket.on('meeting:offer', async ({ offer, fromSocketId, fromUserId, fromName }: any) => {
      let pc = peerConnections.current.get(fromSocketId);
      if (!pc) pc = createPeerConnection(fromSocketId, fromUserId, fromName);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      sendAnswer(fromSocketId, answer);
    });

    socket.on('meeting:answer', async ({ answer, fromSocketId }: any) => {
      const pc = peerConnections.current.get(fromSocketId);
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on('meeting:ice-candidate', async ({ candidate, fromSocketId }: any) => {
      const pc = peerConnections.current.get(fromSocketId);
      if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate));
    });

    socket.on('meeting:user-left', ({ userId: uid, name }: any) => {
      toast(`${name} left`, { icon: '👋' });
      setParticipants(prev => prev.filter(p => p.userId !== uid));
    });

    socket.on('meeting:media-state', ({ userId: uid, audio: a, video: v }: any) => {
      setParticipants(prev => prev.map(p => p.userId === uid ? { ...p, audio: a, video: v } : p));
    });

    socket.on('meeting:caption', ({ name, text }: any) => {
      setCaptions(prev => [...prev.slice(-4), { name, text }]);
    });

    return () => {
      socket.off('meeting:participants');
      socket.off('meeting:user-joined');
      socket.off('meeting:offer');
      socket.off('meeting:answer');
      socket.off('meeting:ice-candidate');
      socket.off('meeting:user-left');
      socket.off('meeting:media-state');
      socket.off('meeting:caption');
    };
  }, [socket, localStream, createPeerConnection, sendOffer, sendAnswer, roomId]);

  const toggleAudio = () => {
    if (!localStream) return;
    const enabled = !audio;
    localStream.getAudioTracks().forEach(t => { t.enabled = enabled; });
    setAudio(enabled);
    sendMediaState(roomId, { audio: enabled, video });
  };

  const toggleVideo = () => {
    if (!localStream) return;
    const enabled = !video;
    localStream.getVideoTracks().forEach(t => { t.enabled = enabled; });
    setVideo(enabled);
    sendMediaState(roomId, { audio, video: enabled });
  };

  const toggleScreenShare = async () => {
    if (!screenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const videoTrack = screenStream.getVideoTracks()[0];
        peerConnections.current.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          sender?.replaceTrack(videoTrack);
        });
        videoTrack.onended = () => toggleScreenShare();
        if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;
        setScreenSharing(true);
        socket?.emit('meeting:screen-share', { roomId, isSharing: true });
      } catch { /* user cancelled */ }
    } else {
      const videoTrack = localStream?.getVideoTracks()[0];
      if (videoTrack) {
        peerConnections.current.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          sender?.replaceTrack(videoTrack);
        });
      }
      if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
      setScreenSharing(false);
      socket?.emit('meeting:screen-share', { roomId, isSharing: false });
    }
  };


  // ── Recording ────────────────────────────────────────────────
  const startRecording = () => {
    if (!localStream) return toast.error('No stream to record');
    try {
      const recorder = new MediaRecorder(localStream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `meeting-${Date.now()}.webm`;
        a.click();
        toast.success('Recording saved!');
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);
      recordingInterval.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
      toast.success('Recording started');
    } catch { toast.error('Recording not supported'); }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    clearInterval(recordingInterval.current);
    setIsRecording(false);
  };

  const formatRecTime = (s: number) =>
    `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  const endCall = async () => {
    localStream?.getTracks().forEach(t => t.stop());
    peerConnections.current.forEach(pc => pc.close());
    leaveMeeting(roomId);
    try {
      await meetingAPI.end(roomId);
    } catch { /* ignore */ }
    router.push('/meetings');
  };

  const analyzeMeeting = async () => {
    if (!meeting) return;
    setAnalyzing(true);
    try {
      await meetingAPI.analyze(meeting._id);
      toast.success('Meeting analyzed! Check summary.');
    } catch {
      toast.error('Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-brand-400 animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Joining meeting...</p>
        </div>
      </div>
    );
  }

  const allParticipants = [
    { userId: user?._id, name: user?.name || 'You', isLocal: true },
    ...participants
  ];

  return (
    <div className="flex flex-col h-full bg-surface-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-surface-900 border-b border-slate-800">
        <div>
          <h1 className="text-sm font-semibold text-white">{meeting?.title || 'Meeting'}</h1>
          <p className="text-xs text-slate-500">{allParticipants.length} participant{allParticipants.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-red-400 bg-red-400/10 px-2 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" /> LIVE
          </div>
          <button
            onClick={() => setShowParticipants(p => !p)}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <Users className="w-4 h-4" />
          </button>
          <button
            onClick={analyzeMeeting}
            disabled={analyzing}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            title="AI Analysis"
          >
            {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Video grid */}
      <div className="flex-1 p-4 overflow-hidden">
        <div className={clsx(
          'grid gap-3 h-full',
          allParticipants.length === 1 ? 'grid-cols-1' :
          allParticipants.length <= 2 ? 'grid-cols-2' :
          allParticipants.length <= 4 ? 'grid-cols-2 grid-rows-2' :
          'grid-cols-3'
        )}>
          {/* Local video */}
          <div className="relative bg-surface-900 rounded-2xl overflow-hidden">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-3 text-xs text-white bg-black/50 px-2 py-0.5 rounded-full">
              You {!audio && '🔇'} {!video && '📷'}
            </div>
          </div>

          {/* Remote participants */}
          {participants.map(p => (
            <div key={p.socketId} className="relative bg-surface-900 rounded-2xl overflow-hidden">
              <video
                ref={el => { if (el) { remoteVideoRefs.current.set(p.socketId, el); if (p.stream) el.srcObject = p.stream; }}}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              {!p.video && (
                <div className="absolute inset-0 flex items-center justify-center bg-surface-900">
                  <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center text-2xl font-bold text-white">
                    {p.name[0]}
                  </div>
                </div>
              )}
              <div className="absolute bottom-2 left-3 text-xs text-white bg-black/50 px-2 py-0.5 rounded-full">
                {p.name} {!p.audio && '🔇'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live captions */}
      {showCaptions && captions.length > 0 && (
        <div className="px-4 pb-2 space-y-1">
          {captions.map((c, i) => (
            <div key={i} className="bg-black/70 text-white text-xs rounded-lg px-3 py-1.5 text-center max-w-lg mx-auto">
              <span className="text-brand-400 font-medium">{c.name}: </span>{c.text}
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 px-4 py-4 bg-surface-900 border-t border-slate-800">
        <button
          onClick={toggleAudio}
          className={clsx(
            'w-11 h-11 rounded-2xl flex items-center justify-center transition-all',
            audio ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-red-600 hover:bg-red-500 text-white'
          )}
        >
          {audio ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>

        <button
          onClick={toggleVideo}
          className={clsx(
            'w-11 h-11 rounded-2xl flex items-center justify-center transition-all',
            video ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-red-600 hover:bg-red-500 text-white'
          )}
        >
          {video ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>

        <button
          onClick={toggleScreenShare}
          className={clsx(
            'w-11 h-11 rounded-2xl flex items-center justify-center transition-all',
            screenSharing ? 'bg-brand-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-white'
          )}
        >
          <MonitorUp className="w-5 h-5" />
        </button>

        <button
          onClick={() => setShowCaptions(p => !p)}
          className={clsx(
            'w-11 h-11 rounded-2xl flex items-center justify-center transition-all',
            showCaptions ? 'bg-brand-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-white'
          )}
          title="Live captions"
        >
          <MessageSquare className="w-5 h-5" />
        </button>

        <button
          onClick={endCall}
          className="w-12 h-12 bg-red-600 hover:bg-red-500 text-white rounded-2xl flex items-center justify-center transition-all"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
