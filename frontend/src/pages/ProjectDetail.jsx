import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import hljs from 'highlight.js/lib/common';
import {
  HiOutlineArrowDownTray,
  HiOutlineArrowLeft,
  HiOutlineChatBubbleLeftRight,
  HiOutlineCheck,
  HiOutlineClipboard,
  HiOutlineTrash,
} from 'react-icons/hi2';
import { projectAPI } from '../services/api';
import FileTree from '../components/projects/FileTree';
import Markdown from '../components/chat/Markdown';
import Loader from '../components/common/Loader';
import { languageFor, saveBlob, timeAgo } from '../utils/format';

const CodeViewer = ({ file }) => {
  const [copied, setCopied] = useState(false);
  const html = useMemo(() => {
    const language = languageFor(file.path);
    try {
      return hljs.getLanguage(language)
        ? hljs.highlight(file.content, { language }).value
        : hljs.highlightAuto(file.content).value;
    } catch {
      return file.content.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    }
  }, [file]);
  const lines = file.content.split('\n').length;

  const copy = async () => {
    await navigator.clipboard.writeText(file.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-2">
        <span className="truncate font-mono text-xs text-mute">{file.path}</span>
        <button onClick={copy} className="inline-flex items-center gap-1 text-xs text-mute hover:text-white">
          {copied ? <HiOutlineCheck className="w-4 h-4 text-emerald-400" /> : <HiOutlineClipboard className="w-4 h-4" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="flex flex-1 overflow-auto bg-[#0d1117] min-h-0">
        <pre aria-hidden className="select-none py-4 pl-4 pr-3 text-right font-mono text-[12.5px] leading-6 text-faint">
          {Array.from({ length: lines }, (_, i) => i + 1).join('\n')}
        </pre>
        <pre className="flex-1 py-4 pr-4 font-mono text-[12.5px] leading-6">
          <code className="hljs !bg-transparent !p-0" dangerouslySetInnerHTML={{ __html: html }} />
        </pre>
      </div>
    </div>
  );
};

const ProjectDetail = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState('files');
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    projectAPI.get(projectId)
      .then((p) => {
        setProject(p);
        setSelected(p.files.find((f) => f.path.toLowerCase() === 'readme.md')?.path || p.files[0]?.path);
      })
      .catch((err) => {
        toast.error(err.message);
        navigate('/projects', { replace: true });
      });
  }, [projectId, navigate]);

  if (!project) return <div className="flex h-full items-center justify-center"><Loader /></div>;

  const file = project.files.find((f) => f.path === selected);

  const download = async () => {
    setIsDownloading(true);
    try {
      saveBlob(await projectAPI.download(project.id), `${project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.zip`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsDownloading(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete project "${project.name}"?`)) return;
    try {
      await projectAPI.remove(project.id);
      toast.success('Project deleted');
      navigate('/projects');
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-white/5 px-4 py-4 md:px-6">
        <Link to="/projects" className="inline-flex items-center gap-1 text-xs text-faint hover:text-neutral-300">
          <HiOutlineArrowLeft className="w-3.5 h-3.5" /> All projects
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-white">{project.name}</h1>
            <p className="mt-1 max-w-3xl text-sm text-mute">{project.description}</p>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {project.tech_stack.map((t) => (
                <span key={t} className="rounded-full border border-white/10 px-2.5 py-0.5 text-[11px] text-neutral-300">{t}</span>
              ))}
              <span className="ml-1 text-xs text-faint">{project.file_count} files · updated {timeAgo(project.updated_at)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {project.thread_id && (
              <Link to={`/c/${project.thread_id}`} className="btn-ghost">
                <HiOutlineChatBubbleLeftRight className="w-4 h-4" /> Refine in chat
              </Link>
            )}
            <button onClick={download} disabled={isDownloading} className="btn-light">
              <HiOutlineArrowDownTray className="w-4 h-4" /> {isDownloading ? 'Preparing…' : 'Download ZIP'}
            </button>
            <button onClick={remove} className="rounded-lg p-2 text-faint hover:bg-white/5 hover:text-red-400" aria-label="Delete project">
              <HiOutlineTrash className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="mt-4 flex gap-1">
          {['files', 'setup'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize ${tab === t ? 'bg-white/10 text-white' : 'text-mute hover:text-ink'}`}
            >
              {t === 'files' ? 'Files' : 'Setup instructions'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'files' ? (
        <div className="flex flex-1 flex-col md:flex-row min-h-0">
          <aside className="max-h-56 md:max-h-none md:w-64 flex-shrink-0 overflow-y-auto border-b md:border-b-0 md:border-r border-white/5 bg-white/[0.02]">
            <FileTree paths={project.files.map((f) => f.path)} selected={selected} onSelect={setSelected} />
          </aside>
          <section className="flex-1 min-w-0 min-h-0">
            {file ? <CodeViewer file={file} /> : <p className="p-6 text-sm text-faint">Select a file</p>}
          </section>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-4 py-6 text-sm text-ink md:px-6">
            <Markdown>{project.setup_instructions || '_No setup instructions were provided._'}</Markdown>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetail;
