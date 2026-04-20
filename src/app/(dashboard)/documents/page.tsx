'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentAPI } from '@/lib/api';
import { useDropzone } from 'react-dropzone';
import { useRouter } from 'next/navigation';
import {
  Upload, FileText, Trash2, MessageSquare, Clock,
  CheckCircle, XCircle, Loader2, File, Plus
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { icon: any; color: string; label: string }> = {
    ready: { icon: CheckCircle, color: 'text-green-400 bg-green-400/10', label: 'Ready' },
    processing: { icon: Loader2, color: 'text-yellow-400 bg-yellow-400/10', label: 'Processing' },
    uploading: { icon: Clock, color: 'text-blue-400 bg-blue-400/10', label: 'Uploading' },
    error: { icon: XCircle, color: 'text-red-400 bg-red-400/10', label: 'Error' },
  };
  const s = map[status] || map.error;
  return (
    <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium', s.color)}>
      <s.icon className={clsx('w-2.5 h-2.5', status === 'processing' && 'animate-spin')} />
      {s.label}
    </span>
  );
};

export default function DocumentsPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const [uploading, setUploading] = useState(false);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => documentAPI.getAll().then(r => r.data.documents),
    refetchInterval: (data) => {
      const hasProcessing = Array.isArray(data) && data.some((d: any) => ['processing', 'uploading'].includes(d.status));
      return hasProcessing ? 3000 : false;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: documentAPI.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['documents'] }); toast.success('Document deleted'); },
    onError: () => toast.error('Failed to delete document'),
  });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', file.name.replace(/\.[^/.]+$/, ''));
      await documentAPI.upload(formData);
      qc.invalidateQueries({ queryKey: ['documents'] });
      toast.success(`"${file.name}" uploaded! Processing started.`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [qc]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'text/plain': ['.txt'], 'text/markdown': ['.md'] },
    maxFiles: 1,
    maxSize: 20 * 1024 * 1024,
    disabled: uploading,
  });

  const startChat = (docId: string) => {
    router.push(`/chat?docId=${docId}`);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Documents</h1>
        <p className="text-slate-400 text-sm mt-1">Upload PDFs and documents to chat with AI</p>
      </div>

      {/* Upload zone */}
      <div
        {...getRootProps()}
        className={clsx(
          'border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all mb-8',
          isDragActive ? 'border-brand-500 bg-brand-500/5' : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/30',
          uploading && 'pointer-events-none opacity-60'
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          {uploading ? (
            <Loader2 className="w-10 h-10 text-brand-400 animate-spin" />
          ) : (
            <Upload className={clsx('w-10 h-10', isDragActive ? 'text-brand-400' : 'text-slate-500')} />
          )}
          <div>
            <p className="text-white font-medium text-sm">
              {uploading ? 'Uploading...' : isDragActive ? 'Drop file here' : 'Drag & drop or click to upload'}
            </p>
            <p className="text-slate-500 text-xs mt-1">PDF, TXT, Markdown · Max 20MB</p>
          </div>
        </div>
      </div>

      {/* Document list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-12 glass rounded-2xl">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">No documents yet. Upload one above!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc: any) => (
            <div key={doc._id} className="glass rounded-2xl p-5 hover:border-slate-600/60 transition-all group">
              {/* Icon + Status */}
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-brand-400" />
                </div>
                <StatusBadge status={doc.status} />
              </div>

              {/* Name */}
              <p className="text-sm font-semibold text-white truncate mb-1" title={doc.name}>{doc.name}</p>
              <p className="text-xs text-slate-500 mb-3">
                {doc.totalPages ? `${doc.totalPages} pages · ` : ''}
                {doc.totalChunks ? `${doc.totalChunks} chunks · ` : ''}
                {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(0)} KB` : ''}
              </p>
              <p className="text-[10px] text-slate-600 mb-4">
                Uploaded {format(new Date(doc.createdAt), 'MMM d, yyyy')}
              </p>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => startChat(doc._id)}
                  disabled={doc.status !== 'ready'}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-brand-600/20 hover:bg-brand-600/30 disabled:opacity-40 disabled:cursor-not-allowed text-brand-300 rounded-xl py-2 text-xs font-medium transition-all"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> Chat
                </button>
                <button
                  onClick={() => deleteMutation.mutate(doc._id)}
                  className="w-9 flex items-center justify-center bg-red-600/10 hover:bg-red-600/20 text-red-400 rounded-xl transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
