import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { HiOutlineArrowRight, HiOutlineCheck, HiOutlineClipboard, HiOutlineCubeTransparent } from 'react-icons/hi2';
import Markdown from './Markdown';
import FileChip from './FileChip';
import { agentMeta, modeFor } from '../../config/agents';

const ProjectCard = ({ project }) => (
  <Link
    to={`/projects/${project.id}`}
    className="group mt-4 flex max-w-md items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 hover:bg-white/[0.06] transition-colors"
  >
    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06]">
      <HiOutlineCubeTransparent className="w-5 h-5 text-sky-200/90" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-medium text-white">{project.name || 'Generated project'}</p>
      <p className="text-xs text-faint">{project.file_count ? `${project.file_count} files · ` : ''}Open to browse and download</p>
    </div>
    <HiOutlineArrowRight className="w-4 h-4 text-mute transition-transform group-hover:translate-x-0.5" />
  </Link>
);

const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch { /* clipboard unavailable */ }
      }}
      aria-label="Copy"
      className="rounded-lg p-1.5 text-faint hover:bg-white/[0.06] hover:text-ink"
    >
      {copied ? <HiOutlineCheck className="w-4 h-4" /> : <HiOutlineClipboard className="w-4 h-4" />}
    </button>
  );
};

const MessageBubble = ({ message, projects = {} }) => {
  if (message.role === 'user') {
    const mode = message.mode ? modeFor(message.mode) : null;
    return (
      <div className="flex flex-col items-end gap-1.5">
        {mode && (
          <span className="inline-flex items-center gap-1 text-[12px] text-faint">
            <mode.icon className={`w-3.5 h-3.5 ${mode.text}`} /> {mode.label}
          </span>
        )}
        {message.attachments?.length > 0 && (
          <div className="flex max-w-[85%] flex-wrap justify-end gap-2">
            {message.attachments.map((a) => <FileChip key={a.id} name={a.filename} size={a.size_bytes} />)}
          </div>
        )}
        {message.content && (
          <div className="max-w-[85%] md:max-w-[70%] rounded-3xl rounded-br-lg border border-accent/20 bg-gradient-to-br from-accent/25 to-accent-2/10 px-5 py-2.5 text-[15px] leading-7 text-ink">
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          </div>
        )}
      </div>
    );
  }

  const meta = agentMeta(message.agent);
  return (
    <div className="group">
      <div className="mb-2 flex items-center gap-1.5 text-[13px] text-faint">
        <meta.icon className={`w-4 h-4 ${meta.text}`} />
        <span className="text-mute">{meta.name}</span>
      </div>
      <div className="text-[15px] text-ink">
        <Markdown>{message.content}</Markdown>
      </div>
      {(message.project_ids || []).map((id) => (
        <ProjectCard key={id} project={{ id, ...(projects[id] || {}) }} />
      ))}
      <div className="mt-1 -ml-1.5 opacity-0 transition-opacity group-hover:opacity-100">
        <CopyButton text={message.content} />
      </div>
    </div>
  );
};

export default MessageBubble;
