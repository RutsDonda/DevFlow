import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  HiOutlineArrowUpTray,
  HiOutlineChatBubbleLeftEllipsis,
  HiOutlineDocumentText,
  HiOutlinePlus,
  HiOutlineTrash,
} from 'react-icons/hi2';
import { documentAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { DOC_ACCEPT } from '../components/chat/Composer';
import Loader from '../components/common/Loader';
import { formatBytes, timeAgo } from '../utils/format';

const TYPE_STYLES = {
  'application/pdf': { label: 'PDF', cls: 'bg-red-500/10 text-red-300' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { label: 'DOCX', cls: 'bg-blue-500/10 text-blue-300' },
  'text/plain': { label: 'TXT', cls: 'bg-gray-500/10 text-neutral-300' },
};

const Documents = () => {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const fileRef = useRef(null);
  const [docs, setDocs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(null); // null | 0-100
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    documentAPI.list()
      .then(setDocs)
      .catch((err) => toast.error(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  const upload = async (files) => {
    if (!files?.length || progress !== null) return;
    setProgress(0);
    try {
      const created = await documentAPI.upload(files, setProgress);
      setDocs((prev) => [...created, ...prev]);
      toast.success(`Indexed ${created.length} document${created.length > 1 ? 's' : ''}`);
      refreshProfile();
    } catch (err) {
      toast.error(err.message, { duration: 6000 });
    } finally {
      setProgress(null);
    }
  };

  const remove = async (doc) => {
    if (!window.confirm(`Delete "${doc.filename}" and its embeddings?`)) return;
    try {
      await documentAPI.remove(doc.id);
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
      refreshProfile();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const ask = (doc) => navigate('/', { state: { prompt: `Summarise the key points of ${doc.filename}`, mode: 'rag_agent' } });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Documents</h1>
          <p className="mt-1 text-sm text-mute">
            Your private knowledge base. The <span className="text-ink">Document agent</span> answers only from these files.
          </p>
        </div>
        <button type="button" onClick={() => fileRef.current?.click()} disabled={progress !== null} className="btn-light">
          <HiOutlinePlus className="w-4 h-4" /> Upload your document
        </button>
      </div>

      {/* Dropzone */}
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); upload(e.dataTransfer.files); }}
        disabled={progress !== null}
        className={`mt-6 flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
          isDragging ? 'border-white/40 bg-white/[0.05]' : 'border-white/10 hover:border-white/25 bg-white/[0.02]'
        }`}
      >
        {progress !== null ? (
          <div className="w-full max-w-xs">
            <p className="text-sm text-ink">{progress < 100 ? `Uploading… ${progress}%` : 'Extracting text & creating embeddings…'}</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className={`h-full bg-white/70 transition-all ${progress >= 100 ? 'animate-pulse' : ''}`} style={{ width: `${Math.max(progress, 5)}%` }} />
            </div>
          </div>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-white/[0.06] flex items-center justify-center">
              <HiOutlineArrowUpTray className="w-6 h-6 text-ink" />
            </div>
            <p className="mt-3 text-sm font-medium text-ink">Drop files here or click to upload</p>
            <p className="mt-1 text-xs text-faint">PDF, Word (.docx), text, Markdown, CSV, JSON & source code · up to 20 MB each</p>
          </>
        )}
      </button>
      <input ref={fileRef} type="file" multiple accept={DOC_ACCEPT} className="hidden" onChange={(e) => { upload(e.target.files); e.target.value = ''; }} />

      {/* List */}
      <div className="mt-8">
        {isLoading ? (
          <div className="py-16"><Loader /></div>
        ) : docs.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-6 py-12 text-center">
            <HiOutlineDocumentText className="mx-auto w-10 h-10 text-faint" />
            <p className="mt-3 text-sm text-mute">No documents yet. Upload one to start asking questions about it.</p>
          </div>
        ) : (
          <ul className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]">
            {docs.map((doc) => {
              const type = TYPE_STYLES[doc.content_type] || TYPE_STYLES['text/plain'];
              return (
                <li key={doc.id} className="group flex items-start gap-4 px-4 py-4 hover:bg-white/[0.02]">
                  <span className={`mt-0.5 w-12 flex-shrink-0 rounded-md py-1 text-center text-[10px] font-bold tracking-wide ${type.cls}`}>{type.label}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white" title={doc.filename}>{doc.filename}</p>
                    <p className="mt-0.5 text-xs text-faint">
                      {formatBytes(doc.size_bytes)} · {doc.num_chunks} chunk{doc.num_chunks === 1 ? '' : 's'} · {doc.num_chars.toLocaleString()} characters · {timeAgo(doc.created_at)}
                    </p>
                    <p className="mt-1.5 line-clamp-2 text-xs text-mute">{doc.preview}</p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-1">
                    <button onClick={() => ask(doc)} className="rounded-lg p-2 text-mute hover:bg-white/5 hover:text-ink" title="Ask about this document">
                      <HiOutlineChatBubbleLeftEllipsis className="w-4 h-4" />
                    </button>
                    <button onClick={() => remove(doc)} className="rounded-lg p-2 text-mute hover:bg-white/5 hover:text-red-400" title="Delete">
                      <HiOutlineTrash className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Documents;
