'use client';

import { useState, useEffect, useRef } from 'react';
import { chatAPI } from '@/lib/api';
import { Mic, MicOff, Volume2, VolumeX, Brain, Loader2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function VoicePage() {
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);
  const [volume, setVolume] = useState(true);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      const text = result[0].transcript;
      setTranscript(text);
      if (result.isFinal) {
        handleVoiceInput(text);
      }
    };

    recognition.onend = () => setListening(false);
    recognition.onerror = () => { setListening(false); toast.error('Microphone error'); };
    recognitionRef.current = recognition;
  }, [activeChatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startListening = () => {
    if (!supported) return toast.error('Speech recognition not supported in this browser');
    setTranscript('');
    setListening(true);
    recognitionRef.current?.start();
  };

  const stopListening = () => {
    setListening(false);
    recognitionRef.current?.stop();
  };

  const speak = (text: string) => {
    if (!volume) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    synthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const handleVoiceInput = async (text: string) => {
    if (!text.trim()) return;
    setLoading(true);
    setTranscript('');

    const userMsg: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);

    try {
      let chatId = activeChatId;
      if (!chatId) {
        const { data } = await chatAPI.create({ title: 'Voice Chat' });
        chatId = data.chat._id;
        setActiveChatId(chatId);
      }

      const { data } = await chatAPI.sendMessage(chatId!, text);
      const aiText = data.message.content;

      const aiMsg: Message = { role: 'assistant', content: aiText };
      setMessages(prev => [...prev, aiMsg]);
      speak(aiText);
    } catch {
      toast.error('AI response failed');
    } finally {
      setLoading(false);
    }
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  const clearChat = () => {
    setMessages([]);
    setActiveChatId(null);
    setTranscript('');
    window.speechSynthesis.cancel();
  };

  return (
    <div className="flex flex-col h-full p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Voice Assistant</h1>
          <p className="text-slate-400 text-sm mt-1">Speak to your AI assistant</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setVolume(v => !v)}
            className="btn-ghost p-2"
            title={volume ? 'Mute AI voice' : 'Unmute AI voice'}
          >
            {volume ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button onClick={clearChat} className="btn-ghost p-2" title="Clear chat">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!supported && (
        <div className="glass rounded-2xl p-6 text-center mb-6">
          <p className="text-red-400 text-sm">⚠️ Speech recognition not supported.</p>
          <p className="text-slate-500 text-xs mt-1">Use Chrome or Edge browser.</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <div className="w-16 h-16 rounded-full bg-brand-600/20 border border-brand-500/30 flex items-center justify-center mb-4">
              <Mic className="w-8 h-8 text-brand-400" />
            </div>
            <h3 className="text-white font-semibold mb-2">Voice AI Ready</h3>
            <p className="text-slate-500 text-sm max-w-xs">
              Press the mic button and speak. AI will respond with voice.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={clsx('flex gap-3', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
            <div className={clsx(
              'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold',
              msg.role === 'user' ? 'bg-brand-600/30 text-brand-300' : 'bg-slate-700 text-slate-300'
            )}>
              {msg.role === 'user' ? 'U' : <Brain className="w-4 h-4" />}
            </div>
            <div className={clsx(
              'max-w-[80%] rounded-2xl px-4 py-3 text-sm',
              msg.role === 'user'
                ? 'bg-brand-600/20 border border-brand-600/25 text-slate-100'
                : 'bg-surface-800 border border-slate-700/50 text-slate-200'
            )}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
              <Brain className="w-4 h-4 text-slate-300" />
            </div>
            <div className="bg-surface-800 border border-slate-700/50 rounded-2xl px-4 py-3">
              <div className="flex gap-1.5">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Transcript preview */}
      {transcript && (
        <div className="glass rounded-xl px-4 py-3 mb-4 text-sm text-slate-300 italic">
          "{transcript}"
        </div>
      )}

      {/* Speaking indicator */}
      {speaking && (
        <div className="flex items-center justify-center gap-2 mb-4 text-brand-400 text-sm">
          <Volume2 className="w-4 h-4 animate-pulse" />
          <span>AI is speaking...</span>
          <button onClick={stopSpeaking} className="text-xs text-slate-500 hover:text-slate-300 underline">
            Stop
          </button>
        </div>
      )}

      {/* Mic Button */}
      <div className="flex items-center justify-center">
        <button
          onClick={listening ? stopListening : startListening}
          disabled={loading || !supported}
          className={clsx(
            'w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl',
            listening
              ? 'bg-red-600 hover:bg-red-500 scale-110 shadow-red-500/30'
              : 'bg-brand-600 hover:bg-brand-500 shadow-brand-500/30',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {loading ? (
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          ) : listening ? (
            <MicOff className="w-8 h-8 text-white" />
          ) : (
            <Mic className="w-8 h-8 text-white" />
          )}
        </button>
      </div>
      <p className="text-center text-xs text-slate-600 mt-3">
        {listening ? 'Listening... tap to stop' : 'Tap mic to speak'}
      </p>
    </div>
  );
}
