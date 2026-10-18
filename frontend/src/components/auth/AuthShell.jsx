import React from 'react';
import Logo from '../common/Logo';
import TerrainBackground from '../common/TerrainBackground';

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
);

export const GoogleButton = ({ onClick, disabled, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="flex w-full items-center justify-center gap-3 rounded-full border border-white/15 bg-app/60 px-4 py-3 text-sm text-ink hover:bg-white/[0.06] transition-colors disabled:opacity-60"
  >
    <GoogleIcon />
    {children}
  </button>
);

export const Divider = ({ label }) => (
  <div className="my-5 flex items-center gap-3">
    <div className="h-px flex-1 bg-white/10" />
    <span className="text-xs uppercase tracking-wider text-faint">{label}</span>
    <div className="h-px flex-1 bg-white/10" />
  </div>
);

export const Field = ({ label, id, ...props }) => (
  <div>
    <label htmlFor={id} className="mb-1.5 block text-xs text-mute">{label}</label>
    <input id={id} {...props} className="input-field !rounded-full !px-4 !py-3 bg-app/60" />
  </div>
);

/** Centered auth card floating over the terrain backdrop. */
const AuthShell = ({ title, subtitle, children }) => (
  <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-app px-4 py-10">
    <TerrainBackground intensity={0.9} />
    <div className="relative w-full max-w-sm">
      <div className="mb-8 flex flex-col items-center text-center">
        <Logo className="w-10 h-10" />
        <h1 className="mt-6 text-[28px] font-normal tracking-tight text-ink">{title}</h1>
        <p className="mt-2 text-sm text-mute">{subtitle}</p>
      </div>
      {children}
    </div>
    <p className="relative mt-10 text-center text-xs text-faint">
      AI DevFlow · a supervisor with Document, Coding and Architect agents
    </p>
  </div>
);

export default AuthShell;
