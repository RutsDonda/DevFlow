import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { HiOutlineUserPlus } from 'react-icons/hi2';
import { NO_ACCOUNT, authErrorMessage, useAuth } from '../context/AuthContext';
import AuthShell, { Divider, Field, GoogleButton } from '../components/auth/AuthShell';

/** Shown when someone tries to log in without having created an account. */
const NoAccountNotice = ({ email }) => (
  <div role="alert" className="mb-5 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-4">
    <p className="text-sm font-medium text-ink">No account found</p>
    <p className="mt-1 text-[13px] leading-relaxed text-mute">
      {email ? <><span className="text-ink">{email}</span> isn&apos;t registered yet.</> : 'This account isn’t registered yet.'}{' '}
      Please create an account first, then log in.
    </p>
    <Link to="/register" state={{ email }} className="btn-light mt-3 !py-1.5 !px-3.5 !text-[13px]">
      <HiOutlineUserPlus className="w-4 h-4" /> Create an account
    </Link>
  </div>
);

const Login = () => {
  const { login, loginWithGoogle, resetPassword, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || '');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState(null); // { email } when the account does not exist

  if (isAuthenticated && !busy) return <Navigate to="/" replace />;

  const run = async (fn) => {
    setBusy(true);
    setMissing(null);
    try {
      await fn();
      navigate('/');
    } catch (error) {
      if (error.code === NO_ACCOUNT) {
        setMissing({ email: error.email });
      } else {
        const message = authErrorMessage(error);
        if (message) toast.error(message);
      }
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    if (!email) {
      toast.error('Enter your email first, then click "Forgot password?"');
      return;
    }
    try {
      await resetPassword(email);
      toast.success('Password reset email sent');
    } catch (error) {
      toast.error(authErrorMessage(error));
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Log in to continue to your workspace.">
      {missing && <NoAccountNotice email={missing.email} />}
      <GoogleButton onClick={() => run(loginWithGoogle)} disabled={busy}>Continue with Google</GoogleButton>
      <Divider label="or with email" />
      <form onSubmit={(e) => { e.preventDefault(); run(() => login(email.trim(), password)); }} className="space-y-4">
        <Field label="Email" id="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => { setEmail(e.target.value); setMissing(null); }} required />
        <div>
          <Field label="Password" id="password" type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="button" onClick={forgot} className="mt-1.5 text-xs text-faint hover:text-ink">Forgot password?</button>
        </div>
        <button type="submit" className="btn-light w-full !py-3" disabled={busy || !email || !password}>
          {busy ? 'Checking your account…' : 'Log in'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-mute">
        New here? <Link to="/register" state={{ email }} className="text-ink underline underline-offset-4 decoration-white/30 hover:decoration-white">Create an account</Link>
      </p>
    </AuthShell>
  );
};

export default Login;
