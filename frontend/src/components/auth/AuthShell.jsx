import React, { useState } from 'react';
import {
  HiExclamationCircle, HiOutlineEye, HiOutlineEyeSlash, HiOutlineLockClosed, HiOutlineSparkles,
} from 'react-icons/hi2';
import Logo from '../common/Logo';
import { AGENTS } from '../../config/agents';

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const emailError = (value) => {
  if (!value.trim()) return 'Enter your email';
  return EMAIL_RE.test(value.trim()) ? null : 'Enter a valid email address';
};

/** Link-style button, e.g. "Create one" inside an error message. */
export const InlineAction = ({ onClick, children }) => (
  <button type="button" onClick={onClick} className="font-medium text-accent-2 underline underline-offset-2 hover:text-cyan-200">
    {children}
  </button>
);

const Spinner = () => (
  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden />
);

export const GoogleButton = ({ onClick, disabled, children = 'Continue with Google' }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-white/12 bg-white/[0.03] px-4 text-sm font-medium text-ink transition-colors hover:border-white/25 hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-60"
  >
    <GoogleIcon />
    {children}
  </button>
);

export const Divider = ({ label }) => (
  <div className="my-6 flex items-center gap-3">
    <div className="h-px flex-1 bg-white/10" />
    <span className="text-xs text-faint">{label}</span>
    <div className="h-px flex-1 bg-white/10" />
  </div>
);

export const SubmitButton = ({ busy, children }) => (
  <button type="submit" disabled={busy} className="btn-light h-12 w-full !rounded-xl text-[15px]">
    {busy ? <Spinner /> : children}
  </button>
);

/** Form-level problem (Google popup, network) shown above the fields. */
export const FormError = ({ children }) => (children ? (
  <div role="alert" className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-400/25 bg-red-400/[0.07] px-3.5 py-3 text-[13px] leading-relaxed text-red-200">
    <HiExclamationCircle className="mt-px h-4 w-4 flex-shrink-0 text-red-400" />
    <div>{children}</div>
  </div>
) : null);

/**
 * Outlined input with a label that floats onto the border, an optional trailing control
 * (e.g. show password) and an inline error line.
 */
export const Field = ({ label, id, error, trailing, ...props }) => (
  <div>
    <div className="relative">
      <input
        id={id}
        placeholder=" "
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
        className={`peer block h-14 w-full rounded-xl border bg-white/[0.02] px-4 pt-3 text-[15px] text-ink transition-colors focus:outline-none focus:ring-4 ${
          trailing ? 'pr-12' : ''
        } ${
          error
            ? 'border-red-400/70 focus:border-red-400 focus:ring-red-400/15'
            : 'border-white/12 hover:border-white/25 focus:border-accent focus:ring-accent/15'
        }`}
      />
      <label
        htmlFor={id}
        className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[15px] transition-all duration-150
          peer-focus:top-3.5 peer-focus:text-[11px] peer-[:not(:placeholder-shown)]:top-3.5 peer-[:not(:placeholder-shown)]:text-[11px] ${
          error ? 'text-red-300' : 'text-faint peer-focus:text-accent'
        }`}
      >
        {label}
      </label>
      {trailing && <div className="absolute inset-y-0 right-2 flex items-center">{trailing}</div>}
    </div>
    {error && (
      <p id={`${id}-error`} className="mt-1.5 flex items-start gap-1.5 text-xs text-red-300">
        <HiExclamationCircle className="mt-px h-4 w-4 flex-shrink-0 text-red-400" /> <span>{error}</span>
      </p>
    )}
  </div>
);

/** Password input with an eye button to reveal it. */
export const PasswordField = (props) => {
  const [show, setShow] = useState(false);
  return (
    <Field
      {...props}
      type={show ? 'text' : 'password'}
      trailing={(
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="rounded-lg p-2 text-faint hover:bg-white/[0.06] hover:text-ink"
        >
          {show ? <HiOutlineEyeSlash className="h-5 w-5" /> : <HiOutlineEye className="h-5 w-5" />}
        </button>
      )}
    />
  );
};

const SHOWCASE = [
  { agent: AGENTS.rag_agent, title: 'RAG & Docs', text: 'Answers grounded in your PDFs, Word and text files – with sources.' },
  { agent: AGENTS.coding_agent, title: 'Code & Debug', text: 'Writes, reviews and fixes code, backed by static analysis.' },
  { agent: AGENTS.architect_agent, title: 'Project Architect', text: 'Scaffolds complete projects you can browse and download.' },
  { agent: AGENTS.video_agent, title: 'Docs to Video', text: 'Turns a PDF or Word file into a narrated explainer video.' },
];
const PILLS = ['Supervisor routing', 'Live streaming answers', 'Private document search', 'MP4 & ZIP export'];

/** Left half: brand, headline and the four agents. Collapses to a compact header on mobile. */
const Showcase = () => (
  <aside className="relative overflow-hidden border-b border-white/[0.06] bg-side px-6 py-8 sm:px-10 lg:flex lg:min-h-dvh lg:flex-col lg:border-b-0 lg:border-r lg:px-14 lg:py-12 xl:px-20">
    {/* Glow + faint grid */}
    <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-accent/25 blur-[120px]" />
    <div className="pointer-events-none absolute -bottom-40 right-0 h-96 w-96 rounded-full bg-accent-2/15 blur-[120px]" />
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.07] [mask-image:radial-gradient(ellipse_at_30%_20%,black,transparent_70%)]"
      style={{ backgroundImage: 'linear-gradient(rgb(255 255 255/.6) 1px,transparent 1px),linear-gradient(90deg,rgb(255 255 255/.6) 1px,transparent 1px)', backgroundSize: '44px 44px' }}
    />

    <div className="relative flex items-center gap-2.5">
      <Logo className="h-9 w-9" />
      <span className="text-lg font-semibold tracking-tight text-ink">AI DevFlow</span>
    </div>

    <div className="relative mt-8 lg:my-auto lg:py-12">
      <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs text-indigo-200">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-2 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-2" />
        </span>
        Multi-agent AI workspace
      </span>
      <h2 className="mt-5 max-w-xl text-[28px] font-semibold leading-[1.15] tracking-tight text-ink sm:text-4xl xl:text-5xl">
        Four specialist agents. <span className="text-brand">One flow</span> from question to shipped code.
      </h2>
      <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-mute">
        A supervisor sends every message to the right expert – or pick one yourself.
      </p>

      <ul className="mt-8 hidden max-w-lg space-y-3 lg:block">
        {SHOWCASE.map(({ agent, title, text }) => (
          <li key={agent.id} className="flex items-start gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 backdrop-blur-sm transition-colors hover:border-white/15 hover:bg-white/[0.045]">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/[0.06] ring-1 ring-white/10">
              <agent.icon className={`h-5 w-5 ${agent.text}`} />
            </span>
            <span>
              <span className="block text-sm font-medium text-ink">{title}</span>
              <span className="mt-0.5 block text-[13px] leading-relaxed text-mute">{text}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-6 hidden max-w-lg flex-wrap gap-2 lg:flex">
        {PILLS.map((p) => (
          <span key={p} className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] px-3 py-1 text-xs text-mute">
            <HiOutlineSparkles className="h-3.5 w-3.5 text-accent-2/80" /> {p}
          </span>
        ))}
      </div>
    </div>

    <p className="relative mt-8 hidden items-center gap-1.5 text-xs text-faint lg:flex">
      <HiOutlineLockClosed className="h-3.5 w-3.5" /> Your documents and chats stay private to your account.
    </p>
  </aside>
);

const TABS = [
  { id: 'signin', label: 'Sign In' },
  { id: 'register', label: 'Create Account' },
];

/**
 * Split auth layout: showcase on the left, the form on the right with a Sign In / Create Account
 * switcher. `onTabChange` swaps the form in place; a bar runs along the top while `busy`.
 */
const AuthShell = ({ tab, onTabChange, title, subtitle, busy, children }) => {
  const index = TABS.findIndex((t) => t.id === tab);
  return (
    <div className="relative min-h-dvh bg-app lg:grid lg:grid-cols-2">
      {busy && (
        <div className="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden">
          <div className="h-full w-1/3 animate-[auth-progress_1.1s_ease-in-out_infinite] bg-gradient-to-r from-accent to-accent-2" />
        </div>
      )}
      <Showcase />

      <main className="flex justify-center px-4 py-10 sm:px-8 sm:py-14 lg:min-h-dvh lg:pt-[max(3.5rem,14vh)]">
        <div className="w-full max-w-[420px]">
          <div role="tablist" aria-label="Sign in or create an account" className="relative grid grid-cols-2 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
            <span
              aria-hidden
              className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-lg bg-gradient-to-r from-accent/90 to-accent/60 shadow-lg shadow-accent/20 transition-transform duration-300 ease-out"
              style={{ transform: `translateX(${index * 100}%)` }}
            />
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={t.id === tab}
                disabled={busy}
                onClick={() => t.id !== tab && onTabChange(t.id)}
                className={`relative z-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                  t.id === tab ? 'text-white' : 'text-mute hover:text-ink'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Re-keyed so the heading and form animate in on every tab / step change */}
          <div key={`${tab}-${title}`} className="auth-enter">
            <h1 className="mt-9 text-[26px] font-semibold tracking-tight text-ink">{title}</h1>
            {subtitle && <p className="mt-1.5 text-sm text-mute">{subtitle}</p>}
            <div className="mt-7">{children}</div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AuthShell;
