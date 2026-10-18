import React from 'react';
import { HiOutlineCodeBracket, HiOutlineDocumentText, HiOutlineExclamationTriangle, HiXMark } from 'react-icons/hi2';
import { formatBytes } from '../../utils/format';

const CODE_EXT = new Set(['py', 'js', 'jsx', 'ts', 'tsx', 'java', 'c', 'cpp', 'cs', 'go', 'rs', 'rb', 'php', 'sql', 'sh', 'kt', 'swift', 'html', 'css', 'json', 'yaml', 'yml', 'xml']);
const LABELS = {
  pdf: 'PDF', docx: 'Document', txt: 'Text', md: 'Markdown', csv: 'CSV', json: 'JSON', py: 'Python',
  js: 'JavaScript', jsx: 'JavaScript', ts: 'TypeScript', tsx: 'TypeScript', html: 'HTML', sql: 'SQL',
};

const kindOf = (filename = '') => {
  const ext = filename.includes('.') ? filename.split('.').pop().toLowerCase() : '';
  if (ext === 'pdf') return { ext, label: 'PDF', tile: 'bg-[#e5484d]', Icon: HiOutlineDocumentText };
  if (ext === 'docx') return { ext, label: 'Document', tile: 'bg-[#3e63dd]', Icon: HiOutlineDocumentText };
  if (CODE_EXT.has(ext)) return { ext, label: LABELS[ext] || ext.toUpperCase(), tile: 'bg-[#12a594]', Icon: HiOutlineCodeBracket };
  return { ext, label: LABELS[ext] || (ext ? ext.toUpperCase() : 'File'), tile: 'bg-neutral-500', Icon: HiOutlineDocumentText };
};

/**
 * File card shown in the composer (removable, with upload state) and on sent messages.
 * Props: name, size, status ('uploading' | 'ready' | 'error'), error, onRemove
 */
const FileChip = ({ name, size, status = 'ready', error, onRemove }) => {
  const kind = kindOf(name);
  const subtitle = status === 'uploading' ? 'Uploading…'
    : status === 'error' ? (error || 'Upload failed')
      : [kind.label, size ? formatBytes(size) : null].filter(Boolean).join(' · ');

  return (
    <div
      title={name}
      className={`group relative flex w-60 max-w-full items-center gap-3 rounded-2xl border bg-white/[0.04] p-2 pr-3 ${
        status === 'error' ? 'border-red-400/40' : 'border-white/10'
      }`}
    >
      <div className={`relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${status === 'error' ? 'bg-red-500/80' : kind.tile}`}>
        {status === 'error'
          ? <HiOutlineExclamationTriangle className="w-5 h-5 text-white" />
          : <kind.Icon className="w-5 h-5 text-white" />}
        {status === 'uploading' && (
          <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/45">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-ink">{name}</p>
        <p className={`truncate text-xs ${status === 'error' ? 'text-red-300' : 'text-faint'}`}>{subtitle}</p>
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${name}`}
          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-white/20 bg-[#0d0d0d] text-white opacity-100 md:opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
        >
          <HiXMark className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};

export default FileChip;
