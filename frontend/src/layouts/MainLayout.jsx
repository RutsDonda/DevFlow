import React, { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  HiArrowRightOnRectangle,
  HiOutlineCubeTransparent,
  HiOutlineDocumentText,
  HiOutlineEllipsisHorizontal,
  HiOutlinePencil,
  HiOutlinePencilSquare,
  HiOutlineTrash,
} from 'react-icons/hi2';
import { TbPinned, TbPinnedOff } from 'react-icons/tb';
import { useAuth } from '../context/AuthContext';
import { threadAPI } from '../services/api';
import Logo from '../components/common/Logo';

/** Sidebar toggle glyph (two panes), like ChatGPT's. */
const SidebarIcon = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className} aria-hidden>
    <rect x="3" y="4" width="18" height="16" rx="3" />
    <path d="M9 4v16" />
  </svg>
);

const Avatar = ({ user, size = 'w-8 h-8' }) => (user?.photo ? (
  <img src={user.photo} alt="" referrerPolicy="no-referrer" className={`${size} rounded-full object-cover`} />
) : (
  <div className={`${size} rounded-full bg-gradient-to-br from-accent to-accent-2 flex items-center justify-center text-white font-medium text-sm`}>
    {user?.name?.charAt(0).toUpperCase() || 'U'}
  </div>
));

/** Group conversations: Pinned first, then Today / Yesterday / Previous 7 days / Older. */
const groupThreads = (threads) => {
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const day = 86_400_000;
  const groups = [['Pinned', []], ['Today', []], ['Yesterday', []], ['Previous 7 days', []], ['Older', []]];
  threads.forEach((t) => {
    const ts = new Date(t.updated_at).getTime();
    const idx = t.pinned ? 0 : ts >= startOfToday ? 1 : ts >= startOfToday - day ? 2 : ts >= startOfToday - 7 * day ? 3 : 4;
    groups[idx][1].push(t);
  });
  return groups.filter(([, items]) => items.length);
};

const ThreadRow = ({ thread, active, onPin, onRename, onDelete }) => {
  const [menu, setMenu] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!menu) return undefined;
    const close = (e) => { if (!ref.current?.contains(e.target)) setMenu(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menu]);

  return (
    <div ref={ref} className="relative group">
      <NavLink
        to={`/c/${thread.id}`}
        className={`flex items-center gap-2 rounded-lg py-2 pl-3 pr-9 text-sm transition-colors ${
          active ? 'bg-accent/15 text-white ring-1 ring-inset ring-accent/25' : 'text-neutral-300 hover:bg-white/[0.05]'
        }`}
      >
        {thread.pinned && <TbPinned className="w-4 h-4 flex-shrink-0 text-accent-2" aria-label="Pinned" />}
        <span className="min-w-0 flex-1 truncate">{thread.title}</span>
      </NavLink>
      <button
        onClick={() => setMenu((m) => !m)}
        aria-label="Conversation options"
        className={`absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-neutral-400 hover:text-white ${
          active || menu ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
      >
        <HiOutlineEllipsisHorizontal className="w-4 h-4" />
      </button>
      {menu && (
        <div className="absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-xl border border-white/10 bg-field py-1 shadow-2xl shadow-black/50">
          <button onClick={() => { setMenu(false); onPin(thread); }} className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-ink hover:bg-white/5">
            {thread.pinned ? <TbPinnedOff className="w-4 h-4" /> : <TbPinned className="w-4 h-4" />} {thread.pinned ? 'Unpin' : 'Pin'}
          </button>
          <button onClick={() => { setMenu(false); onRename(thread); }} className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-ink hover:bg-white/5">
            <HiOutlinePencil className="w-4 h-4" /> Rename
          </button>
          <button onClick={() => { setMenu(false); onDelete(thread); }} className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-white/5">
            <HiOutlineTrash className="w-4 h-4" /> Delete
          </button>
        </div>
      )}
    </div>
  );
};

const MainLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const activeId = location.pathname.match(/^\/c\/([^/]+)/)?.[1];
  const [threads, setThreads] = useState([]);
  const [open, setOpen] = useState(() => window.innerWidth >= 768);
  const [userMenu, setUserMenu] = useState(false);
  const isMobile = () => window.innerWidth < 768;

  const refreshThreads = useCallback(async () => {
    try {
      setThreads(await threadAPI.list());
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  }, []);

  useEffect(() => { refreshThreads(); }, [refreshThreads]);
  useEffect(() => { if (isMobile()) setOpen(false); setUserMenu(false); }, [location.pathname]);

  const togglePin = async (thread) => {
    try {
      const updated = await threadAPI.pin(thread.id, !thread.pinned);
      setThreads((prev) => prev.map((t) => (t.id === thread.id ? { ...t, pinned: updated.pinned } : t)));
    } catch (error) {
      toast.error(error.message);
    }
  };

  const rename = async (thread) => {
    const title = window.prompt('Rename conversation', thread.title)?.trim();
    if (!title || title === thread.title) return;
    try {
      const updated = await threadAPI.rename(thread.id, title);
      setThreads((prev) => prev.map((t) => (t.id === thread.id ? { ...t, title: updated.title } : t)));
    } catch (error) {
      toast.error(error.message);
    }
  };

  const remove = async (thread) => {
    if (!window.confirm(`Delete "${thread.title}"?`)) return;
    try {
      await threadAPI.remove(thread.id);
      setThreads((prev) => prev.filter((t) => t.id !== thread.id));
      if (thread.id === activeId) navigate('/');
    } catch (error) {
      toast.error(error.message);
    }
  };

  const linkClass = ({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
    isActive ? 'bg-accent/15 text-white ring-1 ring-inset ring-accent/25' : 'text-neutral-200 hover:bg-white/[0.05]'
  }`;

  return (
    <div className="flex h-dvh overflow-hidden bg-app">
      {/* Mobile backdrop */}
      {open && <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setOpen(false)} />}

      <aside
        className={`fixed md:relative z-40 h-full flex-shrink-0 bg-side/95 border-r border-white/[0.05] backdrop-blur transition-[width,transform] duration-300 overflow-hidden ${
          open ? 'w-[260px] translate-x-0' : 'w-[260px] -translate-x-full md:w-0 md:translate-x-0'
        }`}
      >
        <div className="flex h-full w-[260px] flex-col">
          <div className="flex h-14 items-center justify-between px-3">
            <NavLink to="/" className="rounded-lg p-1.5 hover:bg-white/[0.06]" aria-label="Home"><Logo /></NavLink>
            <button onClick={() => setOpen(false)} className="rounded-lg p-2 text-neutral-400 hover:bg-white/[0.06] hover:text-white" aria-label="Close sidebar">
              <SidebarIcon />
            </button>
          </div>

          <nav className="px-2 space-y-0.5">
            <button onClick={() => navigate('/')} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-neutral-200 hover:bg-white/[0.05]">
              <HiOutlinePencilSquare className="w-[18px] h-[18px]" /> New chat
            </button>
            <NavLink to="/documents" className={linkClass}><HiOutlineDocumentText className="w-[18px] h-[18px]" /> Documents</NavLink>
            <NavLink to="/projects" className={linkClass}><HiOutlineCubeTransparent className="w-[18px] h-[18px]" /> Projects</NavLink>
          </nav>

          <div className="mt-4 flex-1 overflow-y-auto px-2 pb-4 min-h-0">
            {threads.length === 0 ? (
              <p className="px-3 py-2 text-xs text-faint">No conversations yet.</p>
            ) : groupThreads(threads).map(([label, items]) => (
              <div key={label} className="mb-4">
                <p className="px-3 pb-1.5 pt-2 text-xs font-medium text-faint">{label}</p>
                {items.map((t) => (
                  <ThreadRow key={t.id} thread={t} active={t.id === activeId} onPin={togglePin} onRename={rename} onDelete={remove} />
                ))}
              </div>
            ))}
          </div>

          <div className="relative border-t border-white/[0.06] p-2">
            <button onClick={() => setUserMenu((m) => !m)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/[0.05]">
              <Avatar user={user} />
              <div className="min-w-0 text-left">
                <p className="truncate text-sm text-ink">{user?.name}</p>
                <p className="truncate text-xs text-faint">{user?.email}</p>
              </div>
            </button>
            {userMenu && (
              <div className="absolute bottom-full left-2 right-2 mb-1 overflow-hidden rounded-xl border border-white/10 bg-field py-1 shadow-2xl shadow-black/50">
                <div className="px-3 py-2 text-xs text-faint">
                  {user?.stats?.conversations ?? 0} chats · {user?.stats?.documents ?? 0} documents · {user?.stats?.projects ?? 0} projects · {user?.stats?.videos ?? 0} videos
                </div>
                <button onClick={async () => { await logout(); navigate('/login'); }} className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-ink hover:bg-white/5">
                  <HiArrowRightOnRectangle className="w-4 h-4" /> Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className="relative flex flex-1 flex-col min-w-0">
        <header className="flex h-14 flex-shrink-0 items-center gap-1 px-2 md:px-3">
          {!open && (
            <>
              <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-neutral-400 hover:bg-white/[0.06] hover:text-white" aria-label="Open sidebar">
                <SidebarIcon />
              </button>
              <button onClick={() => navigate('/')} className="rounded-lg p-2 text-neutral-400 hover:bg-white/[0.06] hover:text-white" aria-label="New chat">
                <HiOutlinePencilSquare className="w-5 h-5" />
              </button>
            </>
          )}
          <span className="px-2 text-lg font-semibold tracking-tight text-brand">AI DevFlow</span>
        </header>
        <div className="flex-1 min-h-0 overflow-auto">
          <Outlet context={{ threads, refreshThreads }} />
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
