'use client';

import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { Brain, User, Copy, Check, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';

interface Source {
  documentId: string;
  fileName: string;
  excerpt: string;
  similarity: number;
}

interface MessageProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: Source[];
  createdAt?: string;
  isStreaming?: boolean;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="p-1.5 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-700 transition-all">
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function SourcesPanel({ sources }: { sources: Source[] }) {
  const [expanded, setExpanded] = useState(false);
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3 border border-slate-700/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-surface-800/50 text-xs text-slate-400 hover:text-slate-300 transition-all"
      >
        <ExternalLink className="w-3 h-3" />
        <span>{sources.length} source{sources.length > 1 ? 's' : ''} referenced</span>
        {expanded ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
      </button>
      {expanded && (
        <div className="divide-y divide-slate-800">
          {sources.map((src, i) => (
            <div key={i} className="px-3 py-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-slate-300">{src.fileName}</span>
                <span className="text-[10px] text-slate-500">
                  {Math.round((src.similarity || 0) * 100)}% match
                </span>
              </div>
              <p className="text-[11px] text-slate-500 line-clamp-2">{src.excerpt}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ChatMessage({ role, content, sources, createdAt, isStreaming }: MessageProps) {
  const isUser = role === 'user';

  return (
    <div className={clsx('flex gap-3 px-4 py-4 group', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div className={clsx(
        'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
        isUser ? 'bg-brand-600/25 border border-brand-500/30' : 'bg-slate-700/50 border border-slate-600/30'
      )}>
        {isUser
          ? <User className="w-3.5 h-3.5 text-brand-400" />
          : <Brain className="w-3.5 h-3.5 text-slate-300" />
        }
      </div>

      {/* Content */}
      <div className={clsx('flex-1 max-w-[85%]', isUser && 'flex flex-col items-end')}>
        <div className={clsx(
          'rounded-2xl px-4 py-3 text-sm relative',
          isUser
            ? 'bg-brand-600/20 border border-brand-600/25 text-slate-100'
            : 'bg-surface-800 border border-slate-700/50 text-slate-200'
        )}>
          {isUser ? (
            <p className="whitespace-pre-wrap break-words leading-relaxed">{content}</p>
          ) : (
            <ReactMarkdown
              className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-p:my-1 prose-headings:text-slate-100 prose-code:text-brand-300 prose-code:bg-surface-700 prose-code:px-1 prose-code:rounded prose-pre:p-0 prose-pre:bg-transparent prose-a:text-brand-400"
              components={{
                code({ node, inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  if (!inline && match) {
                    return (
                      <div className="relative my-2">
                        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-t-lg">
                          <span className="text-[10px] text-slate-500 font-mono">{match[1]}</span>
                          <CopyButton text={String(children)} />
                        </div>
                        <SyntaxHighlighter
                          style={oneDark}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{ margin: 0, borderRadius: '0 0 8px 8px', fontSize: '12px' }}
                          {...props}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      </div>
                    );
                  }
                  return <code className={className} {...props}>{children}</code>;
                }
              }}
            >
              {content}
            </ReactMarkdown>
          )}

          {isStreaming && (
            <span className="inline-block w-1 h-4 bg-brand-400 animate-pulse ml-0.5 -mb-0.5" />
          )}
        </div>

        {/* Sources */}
        {!isUser && sources && sources.length > 0 && (
          <div className="w-full mt-1">
            <SourcesPanel sources={sources} />
          </div>
        )}

        {/* Timestamp + copy */}
        <div className={clsx(
          'flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-all',
          isUser ? 'flex-row-reverse' : 'flex-row'
        )}>
          {createdAt && (
            <span className="text-[10px] text-slate-600">
              {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
            </span>
          )}
          {!isUser && <CopyButton text={content} />}
        </div>
      </div>
    </div>
  );
}
