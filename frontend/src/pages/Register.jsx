import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authErrorMessage, useAuth } from '../context/AuthContext';
import AuthShell, { Divider, Field, GoogleButton } from '../components/auth/AuthShell';

const Register = () => {
  const { register, registerWithGoogle, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: '', email: location.state?.email || '', password: '', confirm: '' });
  const [busy, setBusy] = useState(false);

  if (isAuthenticated && !busy) return <Navigate to="/" replace />;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const run = async (fn) => {
    setBusy(true);
    try {
      await fn();
      navigate('/');
    } catch (error) {
      const message = authErrorMessage(error);
      if (message) toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    if (form.password !== form.confirm) return toast.error('Passwords do not match');
    return run(() => register(form.name.trim(), form.email.trim(), form.password));
  };

  return (
    <AuthShell title="Create your account" subtitle="Free to start. Your data stays private to you.">
      <GoogleButton onClick={() => run(registerWithGoogle)} disabled={busy}>Sign up with Google</GoogleButton>
      <Divider label="or with email" />
      <form onSubmit={submit} className="space-y-4">
        <Field label="Name" id="name" autoComplete="name" placeholder="Ada Lovelace" value={form.name} onChange={set('name')} required />
        <Field label="Email" id="email" type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={set('email')} required />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Password" id="password" type="password" autoComplete="new-password" placeholder="6+ characters" value={form.password} onChange={set('password')} required />
          <Field label="Confirm" id="confirm" type="password" autoComplete="new-password" placeholder="Repeat" value={form.confirm} onChange={set('confirm')} required />
        </div>
        <button type="submit" className="btn-light w-full !py-3" disabled={busy || !form.name || !form.email || !form.password}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-mute">
        Already have an account? <Link to="/login" state={{ email: form.email }} className="text-ink underline underline-offset-4 decoration-white/30 hover:decoration-white">Sign in</Link>
      </p>
    </AuthShell>
  );
};

export default Register;
