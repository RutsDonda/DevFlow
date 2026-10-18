import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { HiOutlineDocumentArrowUp } from 'react-icons/hi2';
import { documentAPI, streamChat, threadAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { MODES } from '../config/agents';
import MessageBubble from '../components/chat/MessageBubble';
import LiveRun from '../components/chat/LiveRun';
import Composer from '../components/chat/Composer';
import AgentPicker from '../components/chat/AgentPicker';
import TerrainBackground from '../components/common/TerrainBackground';
import Loader from '../components/common/Loader';

const EMPTY_RUN = { agent: null, tools: [], text: '', textAgent: null };
const MAX_ATTACHMENTS = 10;

const greeting = (name) => {
  const h = new Date().getHours();
  const part = h < 5 ? 'Up late' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  return name ? `${part}, ${name.split(' ')[0]}` : part;
};

const Chat = () => {
  const { threadId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshThreads } = useOutletContext();
  const { user, refreshProfile } = useAuth();

  const [messages, setMessages] = useState([]);
  const [projects, setProjects] = useState({}); // id → summary, for project cards
  const [run, setRun] = useState(null);           // in-progress turn, null when idle
  const [modeId, setModeId] = useState('auto');
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState([]); // [{ key, name, size, status, error, doc }]
  const [isDragging, setIsDragging] = useState(false);

  const loadedThreadRef = useRef(null); // thread whose messages are in state (null = new chat)
  const abortRef = useRef(null);
  const bottomRef = useRef(null);
  const composerRef = useRef(null);
  const dragDepth = useRef(0);
  const mode = MODES.find((m) => m.id === modeId) || MODES[0];

  // Load the selected conversation (skip if we just created it ourselves)
  useEffect(() => {
    if (threadId && loadedThreadRef.current === threadId) return undefined;
    // Leaving a running chat: stop listening (the backend still finishes and saves the turn)
    abortRef.current?.abort();

    if (!threadId) {
      loadedThreadRef.current = null;
      setMessages([]); setProjects({}); setModeId('auto'); setAttachments([]);
      composerRef.current?.focus();
      return undefined;
    }

    let cancelled = false;
    setIsLoading(true);
    threadAPI.get(threadId)
      .then((t) => {
        if (cancelled) return;
        loadedThreadRef.current = threadId;
        setMessages(t.messages);
        setProjects({});
        const lastPick = [...t.messages].reverse().find((m) => m.role === 'user')?.mode;
        setModeId(lastPick || 'auto');
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(err.message);
        navigate('/', { replace: true });
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [threadId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Prefill from other pages (e.g. "Ask about this document")
  useEffect(() => {
    if (location.state?.prompt) {
      if (location.state.mode) setModeId(location.state.mode);
      composerRef.current?.setText(location.state.prompt);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, run?.text, run?.agent, run?.tools.length]);

  const handleEvent = useCallback((event) => {
    switch (event.type) {
      case 'thread':
        if (!loadedThreadRef.current) {
          loadedThreadRef.current = event.thread.id;
          navigate(`/c/${event.thread.id}`, { replace: true });
          refreshThreads();
        }
        break;
      case 'route':
        setRun((r) => ({ ...r, agent: event.agent, text: '', textAgent: null }));
        break;
      case 'tool':
        setRun((r) => ({ ...r, tools: [...r.tools, event.name] }));
        break;
      case 'token':
        // Text from a different agent than before (e.g. supervisor → worker) starts a fresh draft
        setRun((r) => (r.textAgent === event.agent
          ? { ...r, text: r.text + event.text }
          : { ...r, text: event.text, textAgent: event.agent }));
        break;
      case 'done':
        setMessages((prev) => [...prev, event.message]);
        setProjects((prev) => ({ ...prev, ...Object.fromEntries(event.projects.map((p) => [p.id, p])) }));
        break;
      case 'error':
        toast.error(event.message, { duration: 6000 });
        break;
      default:
    }
  }, [navigate, refreshThreads]);

  const send = async (text) => {
    const startedIn = loadedThreadRef.current;
    const sent = attachments.filter((a) => a.status === 'ready');
    const meta = sent.map(({ doc }) => ({ id: doc.id, filename: doc.filename, content_type: doc.content_type, size_bytes: doc.size_bytes }));
    setAttachments([]);
    setMessages((prev) => [...prev, { role: 'user', content: text, mode: mode.agent, attachments: meta, created_at: new Date().toISOString() }]);
    setRun(mode.agent ? { ...EMPTY_RUN, agent: mode.agent } : EMPTY_RUN);
    const controller = new AbortController();
    abortRef.current = controller;
    let finished = false;

    try {
      await streamChat({ message: text, threadId: startedIn, agent: mode.agent, documentIds: meta.map((m) => m.id) }, (ev) => {
        if (ev.type === 'done') finished = true;
        handleEvent(ev);
      }, controller.signal);
    } catch (err) {
      if (err.name !== 'AbortError') toast.error(err.message);
    } finally {
      abortRef.current = null;
      setRun(null);
      if (!finished && loadedThreadRef.current === startedIn) {
        setMessages((prev) => prev.slice(0, -1)); // drop the optimistic user message
        setAttachments((prev) => [...sent, ...prev]); // give the files back to the composer
      }
      refreshThreads();
      refreshProfile();
    }
  };

  const stop = () => {
    abortRef.current?.abort();
    toast('Stopped. The agent may still finish in the background – reopen the chat to see it.');
  };

  /** Upload each file right away (it gets indexed for the agents) and show it as a card in the composer. */
  const attach = (fileList) => {
    const files = Array.from(fileList || []).slice(0, Math.max(0, MAX_ATTACHMENTS - attachments.length));
    if (fileList?.length > files.length) toast.error(`You can attach up to ${MAX_ATTACHMENTS} files per message`);
    files.forEach((file) => {
      const key = `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`;
      const update = (patch) => setAttachments((prev) => prev.map((a) => (a.key === key ? { ...a, ...patch } : a)));
      setAttachments((prev) => [...prev, { key, name: file.name, size: file.size, status: 'uploading' }]);
      documentAPI.upload([file])
        .then(([doc]) => { update({ status: 'ready', doc }); refreshProfile(); })
        .catch((err) => update({ status: 'error', error: err.message }));
    });
    composerRef.current?.focus();
  };

  /** Remove a file from the draft; it was uploaded only for this message, so delete it too. */
  const removeAttachment = (key) => {
    const item = attachments.find((a) => a.key === key);
    setAttachments((prev) => prev.filter((a) => a.key !== key));
    if (item?.doc) documentAPI.remove(item.doc.id).then(refreshProfile).catch(() => {});
  };

  // Drag & drop files anywhere on the chat
  const dragHandlers = {
    onDragEnter: (e) => {
      if (!e.dataTransfer?.types?.includes('Files')) return;
      e.preventDefault();
      dragDepth.current += 1;
      setIsDragging(true);
    },
    onDragOver: (e) => { if (e.dataTransfer?.types?.includes('Files')) e.preventDefault(); },
    onDragLeave: () => {
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (!dragDepth.current) setIsDragging(false);
    },
    onDrop: (e) => {
      if (!e.dataTransfer?.files?.length) return;
      e.preventDefault();
      dragDepth.current = 0;
      setIsDragging(false);
      attach(e.dataTransfer.files);
    },
  };

  const dropOverlay = isDragging && (
    <div className="pointer-events-none absolute inset-3 z-30 flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-white/30 bg-app/85 backdrop-blur-sm">
      <HiOutlineDocumentArrowUp className="w-10 h-10 text-ink" />
      <p className="mt-3 text-lg text-ink">Drop files to add them to the chat</p>
      <p className="mt-1 text-sm text-faint">PDF, Word, text and code files</p>
    </div>
  );

  const isEmpty = !messages.length && !run && !isLoading;

  const composer = (
    <>
      <AgentPicker value={modeId} onChange={setModeId} disabled={Boolean(run)} />
      <Composer
        ref={composerRef}
        onSend={send}
        onStop={stop}
        onAttach={attach}
        onRemoveAttachment={removeAttachment}
        attachments={attachments}
        isRunning={Boolean(run)}
        placeholder={mode.placeholder}
      />
    </>
  );

  if (isEmpty) {
    return (
      <div className="relative flex h-full flex-col items-center justify-center overflow-hidden px-4" {...dragHandlers}>
        <TerrainBackground intensity={1} />
        {dropOverlay}
        <div className="relative w-full max-w-3xl pb-[8vh]">
          <h1 className="mb-8 text-center text-[28px] font-normal tracking-tight text-ink">{greeting(user?.name)}. What should we work on?</h1>
          {composer}
          <div className="mx-auto mt-5 grid max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
            {mode.examples.map((ex) => (
              <button
                key={ex}
                onClick={() => composerRef.current?.setText(ex)}
                className="truncate rounded-xl border border-white/[0.08] bg-app/60 px-4 py-2.5 text-left text-[13px] text-mute backdrop-blur-sm hover:bg-white/[0.05] hover:text-ink transition-colors"
                title={ex}
              >
                {ex.split('\n')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col" {...dragHandlers}>
      <TerrainBackground intensity={0.18} />
      {dropOverlay}
      <div className="relative flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
          <div className="flex h-full items-center justify-center"><Loader text="" /></div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-10 px-4 py-8">
            {messages.map((m, i) => <MessageBubble key={`${m.created_at}-${i}`} message={m} projects={projects} />)}
            {run && <LiveRun run={run} />}
            <div ref={bottomRef} className="h-4" />
          </div>
        )}
      </div>
      <div className="relative mx-auto w-full max-w-3xl px-4 pb-3">
        {composer}
        <p className="mt-2 text-center text-[11px] text-faint">AI DevFlow agents can make mistakes. Check important info and review generated code.</p>
      </div>
    </div>
  );
};

export default Chat;
