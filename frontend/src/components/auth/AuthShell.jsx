import React, { useState } from 'react';
import { HiExclamationCircle } from 'react-icons/hi2';
import Logo from '../common/Logo';

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
    className="flex w-full items-center justify-center gap-3 rounded-full border border-white/15 px-4 py-2.5 text-sm font-medium text-ink hover:bg-white/[0.05] transition-colors disabled:opacity-60"
  >
    <GoogleIcon />
    {children}
  </button>
);

export const Divider = ({ label }) => (
  <div className="my-5 flex items-center gap-3">
    <div className="h-px flex-1 bg-white/10" />
    <span className="text-xs text-faint">{label}</span>
    <div className="h-px flex-1 bg-white/10" />
  </div>
);

/** Outlined input with a label that floats onto the border, plus an inline error line. */
export const Field = ({ label, id, error, ...props }) => (
  <div>
    <div className="relative">
      <input
        id={id}
        placeholder=" "
        aria-invalid={Boolean(error)}
        {...props}
        className={`peer block h-14 w-full rounded-md border bg-transparent px-3.5 text-[15px] text-ink focus:outline-none focus:ring-1 transition-colors ${
          error ? 'border-red-400 focus:ring-red-400' : 'border-white/20 hover:border-white/35 focus:border-accent focus:ring-accent'
        }`}
      />
      <label
        htmlFor={id}
        className={`pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 bg-raise px-1 text-[15px] transition-all
          peer-focus:top-0 peer-focus:text-xs peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs ${
          error ? 'text-red-400' : 'text-mute peer-focus:text-accent'
        }`}
      >
        {label}
      </label>
    </div>
    {error && (
      <p className="mt-2 flex items-start gap-1.5 text-xs text-red-400">
        <HiExclamationCircle className="mt-px w-4 h-4 flex-shrink-0" /> {error}
      </p>
    )}
  </div>
);

/** Password field with a "Show password" checkbox underneath. */
export const PasswordFields = ({ fields }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-4">
      {fields.map((f) => <Field key={f.id} type={show ? 'text' : 'password'} {...f} />)}
      <label className="flex w-fit cursor-pointer items-center gap-3 text-sm text-ink">
        <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} className="h-4 w-4 accent-accent" />
        Show password
      </label>
    </div>
  );
};

/** Pill showing the email being signed in with; clicking it goes back to change it. */
export const EmailChip = ({ email, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    title="Use a different email"
    className="mt-4 inline-flex max-w-full items-center gap-2 rounded-full border border-white/15 py-1 pl-1 pr-3 text-sm text-ink hover:bg-white/[0.05]"
  >
    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-2 text-xs font-medium text-white">
      {email.charAt(0).toUpperCase()}
    </span>
    <span className="truncate">{email}</span>
  </button>
);

/** Bottom row of a step: a text link on the left, the primary button on the right. */
export const Actions = ({ secondary, primary }) => (
  <div className="mt-10 flex items-center justify-between gap-4">
    <div>{secondary}</div>
    {primary}
  </div>
);

export const TextButton = ({ className = '', ...props }) => (
  <button type="button" className={`rounded-full px-3 py-2 -ml-3 text-sm font-medium text-accent-2 hover:bg-accent-2/10 disabled:opacity-50 ${className}`} {...props} />
);

/**
 * Google-style auth card: logo, heading and subtitle on the left, the current step's form on
 * the right (stacked on small screens). A thin bar animates along the top edge while `busy`.
 */
const AuthShell = ({ title, subtitle, aside, busy, children }) => (
  <div className="flex min-h-dvh flex-col items-center justify-center bg-app px-4 py-10">
    <div className="relative w-full max-w-[1040px] overflow-hidden rounded-[28px] border border-white/[0.06] bg-raise px-6 py-9 sm:px-10 sm:py-10">
      {busy && <div className="absolute inset-x-0 top-0 h-1 overflow-hidden"><div className="h-full w-1/3 animate-[auth-progress_1.1s_ease-in-out_infinite] bg-gradient-to-r from-accent to-accent-2" /></div>}
      <div className="grid gap-x-12 gap-y-8 md:grid-cols-2">
        <div>
          <Logo className="w-11 h-11" />
          <h1 className="mt-6 text-[32px] leading-tight font-normal tracking-tight text-ink sm:text-4xl">{title}</h1>
          {subtitle && <p className="mt-4 text-base text-ink">{subtitle}</p>}
          {aside}
        </div>
        <div className="md:pt-16">{children}</div>
      </div>
    </div>
    <p className="mt-6 text-xs text-faint">AI DevFlow · your data stays private to you</p>
  </div>
);

export default AuthShell;
