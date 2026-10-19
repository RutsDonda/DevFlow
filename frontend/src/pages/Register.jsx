import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiArrowLeft } from 'react-icons/hi2';
import { authErrorMessage, useAuth } from '../context/AuthContext';
import {
  Divider, Field, FormError, GoogleButton, InlineAction, PasswordField, SubmitButton, emailError,
} from '../components/auth/AuthShell';

const STRENGTH = [
  { label: 'Too short', bar: 'bg-red-400' },
  { label: 'Weak', bar: 'bg-red-400' },
  { label: 'Fair', bar: 'bg-amber-300' },
  { label: 'Good', bar: 'bg-accent-2' },
  { label: 'Strong', bar: 'bg-emerald-400' },
];

const strengthOf = (pw) => {
  if (pw.length < 6) return 0;
  return 1 + [pw.length >= 10, /[A-Z]/.test(pw) && /[a-z]/.test(pw), /\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)].filter(Boolean).length;
};

const StrengthMeter = ({ password }) => {
  if (!password) return null;
  const score = strengthOf(password);
  return (
    <div className="mt-2 flex items-center gap-3" aria-live="polite">
      <div className="flex flex-1 gap-1">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i <= score ? STRENGTH[score].bar : 'bg-white/10'}`} />
        ))}
      </div>
      <span className="w-16 text-right text-xs text-mute">{STRENGTH[score].label}</span>
    </div>
  );
};

/**
 * Create Account tab, in two steps: name + email → password + confirm.
 * Rendered by the auth page in Login.jsx, which owns the step, the shared email and `busy`.
 */
const RegisterForm = ({ email, setEmail, busy, setBusy, onSwitch, google, step, setStep }) => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((s) => ({ ...s, [key]: null }));
  };

  const next = (e) => {
    e.preventDefault();
    const errs = { name: form.name.trim() ? null : 'Enter your name', email: emailError(email) };
    setErrors(errs);
    if (!errs.name && !errs.email) setStep('password');
  };

  const create = async (e) => {
    e.preventDefault();
    const errs = {
      password: form.password.length < 6 ? 'Use 6 characters or more' : null,
      confirm: form.password && form.confirm !== form.password ? 'Passwords don’t match' : null,
    };
    setErrors(errs);
    setFormError(null);
    if (errs.password || errs.confirm) return;
    setBusy(true);
    try {
      await register(form.name.trim(), email.trim(), form.password);
      navigate('/');
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setStep('details');
        setErrors({ email: <>This email already has an account. <InlineAction onClick={() => onSwitch('signin')}>Sign in instead</InlineAction></> });
      } else if (err.code === 'auth/invalid-email') {
        setStep('details');
        setErrors({ email: authErrorMessage(err) });
      } else {
        setFormError(authErrorMessage(err));
      }
    } finally {
      setBusy(false);
    }
  };

  if (step === 'password') {
    return (
      <>
        <FormError>{formError}</FormError>
        <button
          type="button"
          onClick={() => setStep('details')}
          disabled={busy}
          className="mb-5 inline-flex max-w-full items-center gap-2 rounded-full border border-white/12 py-1 pl-1 pr-3 text-sm text-ink hover:bg-white/[0.05]"
          title="Change name or email"
        >
          <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-2 text-xs font-medium text-white">
            {(form.name.trim() || email).charAt(0).toUpperCase()}
          </span>
          <span className="truncate">{email.trim()}</span>
        </button>
        <form onSubmit={create} noValidate className="space-y-4">
          <div>
            <PasswordField
              label="Password" id="password" autoComplete="new-password" autoFocus
              value={form.password} error={errors.password} onChange={set('password')}
            />
            <StrengthMeter password={form.password} />
          </div>
          <PasswordField
            label="Confirm password" id="confirm" autoComplete="new-password"
            value={form.confirm} error={errors.confirm} onChange={set('confirm')}
            onBlur={() => form.confirm && form.confirm !== form.password && setErrors((s) => ({ ...s, confirm: 'Passwords don’t match' }))}
          />
          <SubmitButton busy={busy}>Create account</SubmitButton>
        </form>
        <button
          type="button"
          onClick={() => setStep('details')}
          disabled={busy}
          className="mx-auto mt-5 flex items-center gap-1.5 text-sm text-mute hover:text-ink"
        >
          <HiArrowLeft className="h-4 w-4" /> Back
        </button>
      </>
    );
  }

  return (
    <>
      <FormError>{formError}</FormError>
      <GoogleButton onClick={() => google(setFormError)} disabled={busy} />
      <Divider label="or sign up with email" />
      <form onSubmit={next} noValidate className="space-y-4">
        <Field
          label="Full name" id="name" autoComplete="name" autoFocus
          value={form.name} error={errors.name} onChange={set('name')}
        />
        <Field
          label="Email address" id="email" type="email" autoComplete="email"
          value={email} error={errors.email}
          onChange={(e) => { setEmail(e.target.value); setErrors((s) => ({ ...s, email: null })); }}
          onBlur={() => email && setErrors((s) => ({ ...s, email: emailError(email) }))}
        />
        <SubmitButton busy={busy}>Continue</SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-mute">
        Already have an account? <InlineAction onClick={() => onSwitch('signin')}>Sign in</InlineAction>
      </p>
    </>
  );
};

export default RegisterForm;
