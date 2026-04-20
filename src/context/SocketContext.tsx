'use client';

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface OnlineUser {
  id: string;
  name: string;
  avatar: string | null;
  socketId: string;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: OnlineUser[];
  joinChat: (chatId: string) => void;
  leaveChat: (chatId: string) => void;
  sendTyping: (chatId: string, isTyping: boolean) => void;
  joinMeeting: (roomId: string) => void;
  leaveMeeting: (roomId: string) => void;
  sendOffer: (targetSocketId: string, offer: RTCSessionDescriptionInit, roomId: string) => void;
  sendAnswer: (targetSocketId: string, answer: RTCSessionDescriptionInit) => void;
  sendIceCandidate: (targetSocketId: string, candidate: RTCIceCandidateInit) => void;
  sendMediaState: (roomId: string, state: { audio: boolean; video: boolean; screen?: boolean }) => void;
  sendCaption: (roomId: string, text: string, timestamp: number) => void;
}

// const SocketContext = createContext<SocketContextType>({} as SocketContextType);


const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  onlineUsers: [],   // ✅ YE LINE YAHI ADD HOTI HAI

  joinChat: () => {},
  leaveChat: () => {},
  sendTyping: () => {},

  joinMeeting: () => {},
  leaveMeeting: () => {},
  sendOffer: () => {},
  sendAnswer: () => {},
  sendIceCandidate: () => {},
  sendMediaState: () => {},
  sendCaption: () => {},
});

export function SocketProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

    const socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('🔌 Socket connected:', socket.id);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('users:online', (users: OnlineUser[]) => {
      setOnlineUsers(users);
    });

    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated]);

  const joinChat = (chatId: string) => socketRef.current?.emit('chat:join', chatId);
  const leaveChat = (chatId: string) => socketRef.current?.emit('chat:leave', chatId);
  const sendTyping = (chatId: string, isTyping: boolean) =>
    socketRef.current?.emit('chat:typing', { chatId, isTyping });
  const joinMeeting = (roomId: string) => socketRef.current?.emit('meeting:join', { roomId });
  const leaveMeeting = (roomId: string) => socketRef.current?.emit('meeting:leave', { roomId });
  const sendOffer = (targetSocketId: string, offer: RTCSessionDescriptionInit, roomId: string) =>
    socketRef.current?.emit('meeting:offer', { targetSocketId, offer, roomId });
  const sendAnswer = (targetSocketId: string, answer: RTCSessionDescriptionInit) =>
    socketRef.current?.emit('meeting:answer', { targetSocketId, answer });
  const sendIceCandidate = (targetSocketId: string, candidate: RTCIceCandidateInit) =>
    socketRef.current?.emit('meeting:ice-candidate', { targetSocketId, candidate });
  const sendMediaState = (roomId: string, state: { audio: boolean; video: boolean; screen?: boolean }) =>
    socketRef.current?.emit('meeting:media-state', { roomId, ...state });
  const sendCaption = (roomId: string, text: string, timestamp: number) =>
    socketRef.current?.emit('meeting:caption', { roomId, text, timestamp });

  return (
    <SocketContext.Provider value={{
      socket: socketRef.current,
      isConnected,
      onlineUsers,
      joinChat,
      leaveChat,
      sendTyping,
      joinMeeting,
      leaveMeeting,
      sendOffer,
      sendAnswer,
      sendIceCandidate,
      sendMediaState,
      sendCaption,
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
