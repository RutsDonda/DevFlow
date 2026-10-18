import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { HiOutlineCubeTransparent, HiOutlineDocumentDuplicate, HiOutlinePlus } from 'react-icons/hi2';
import { projectAPI } from '../services/api';
import Loader from '../components/common/Loader';
import { timeAgo } from '../utils/format';

const Projects = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    projectAPI.list()
      .then(setProjects)
      .catch((err) => toast.error(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  const newProject = () => navigate('/', { state: { prompt: 'Scaffold a new project: ', mode: 'architect_agent' } });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Projects</h1>
          <p className="mt-1 text-sm text-mute">
            Scaffolded by the <span className="text-ink">Architect agent</span>. Browse every file or download a ZIP.
          </p>
        </div>
        <button onClick={newProject} className="btn-light">
          <HiOutlinePlus className="w-4 h-4" /> New project
        </button>
      </div>

      {isLoading ? (
        <div className="py-20"><Loader /></div>
      ) : projects.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-6 py-14 text-center">
          <HiOutlineCubeTransparent className="mx-auto w-10 h-10 text-faint" />
          <p className="mt-3 text-sm text-neutral-300">No projects yet</p>
          <p className="mt-1 text-xs text-faint">Pick “Architect” above the message box and describe an app.</p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              to={`/projects/${p.id}`}
              className="group flex flex-col rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 hover:border-white/15 hover:bg-white/[0.04] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center">
                  <HiOutlineCubeTransparent className="w-5 h-5 text-sky-300" />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold text-white">{p.name}</h2>
                  <p className="text-xs text-faint">Updated {timeAgo(p.updated_at)}</p>
                </div>
              </div>
              <p className="mt-3 line-clamp-2 flex-1 text-xs leading-relaxed text-mute">{p.description}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {p.tech_stack.slice(0, 5).map((t) => (
                  <span key={t} className="rounded-full border border-white/10 px-2.5 py-0.5 text-[11px] text-neutral-300">{t}</span>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-1.5 border-t border-white/5 pt-3 text-xs text-faint">
                <HiOutlineDocumentDuplicate className="w-4 h-4" /> {p.file_count} files
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Projects;
