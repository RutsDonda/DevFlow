import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { NO_ACCOUNT, authErrorMessage, useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import AuthShell, {
  Actions, Divider, EmailChip, Field, GoogleButton, PasswordFields, TextButton,
} from '../components/auth/AuthShell';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WRONG_PASSWORD = ['auth/invalid-credential', 'auth/wrong-password'];

/** Two steps like Google: email → Next → password → Next. Google sign-in is offered on the first. */
const Login = () => {
  const { login, loginWithGoogle, resetPassword, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState('email'); // 'email' | 'password'
  const [email, setEmail] = useState(location.state?.email || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null); // inline message under the current field
  const [busy, setBusy] = useState(false);

  if (isAuthenticated && !busy) return <Navigate to="/" replace />;

  const noAccount = (
    <>Couldn&apos;t find your AI DevFlow account. <Link to="/register" state={{ email }} className="underline underline-offset-2">Create one</Link></>
  );

  const toPassword = async (e) => {
    e.preventDefault();
    const value = email.trim();
    if (!value) return setError('Enter an email');
    if (!EMAIL_RE.test(value)) return setError('Enter a valid email');
    setBusy(true);
    try {
      const { exists } = await authAPI.checkEmail(value);
      if (!exists) return setError(noAccount);
      setError(null);
      setStep('password');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  const signIn = async (e) => {
    e.preventDefault();
    if (!password) return setError('Enter a password');
    setBusy(true);
    try {
      await login(email.trim(), password);
      navigate('/');
    } catch (err) {
      if (WRONG_PASSWORD.includes(err.code)) setError('Wrong password. Try again or click "Forgot password?" to reset it.');
      else if (err.code === NO_ACCOUNT) { setStep('email'); setError(noAccount); }
      else setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  const google = async () => {
    setBusy(true);
    try {
      await loginWithGoogle();
      navigate('/');
    } catch (err) {
      const message = authErrorMessage(err);
      if (message) toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    try {
      await resetPassword(email.trim());
      toast.success(`Password reset link sent to ${email.trim()}`);
    } catch (err) {
      toast.error(authErrorMessage(err));
    }
  };

  if (step === 'password') {
    return (
      <AuthShell
        title="Welcome"
        busy={busy}
        aside={<EmailChip email={email.trim()} onClick={() => { setStep('email'); setPassword(''); setError(null); }} />}
      >
        <form onSubmit={signIn} noValidate>
          <PasswordFields
            fields={[{
              label: 'Enter your password', id: 'password', autoComplete: 'current-password', autoFocus: true,
              value: password, error, onChange: (e) => { setPassword(e.target.value); setError(null); },
            }]}
          />
          <Actions
            secondary={<TextButton onClick={forgot} disabled={busy}>Forgot password?</TextButton>}
            primary={<button type="submit" className="btn-light !px-6" disabled={busy}>Next</button>}
          />
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Sign in" subtitle="to continue to AI DevFlow" busy={busy}>
      <form onSubmit={toPassword} noValidate>
        <Field
          label="Email" id="email" type="email" autoComplete="email" autoFocus
          value={email} error={error} onChange={(e) => { setEmail(e.target.value); setError(null); }}
        />
        <Divider label="or" />
        <GoogleButton onClick={google} disabled={busy}>Sign in with Google</GoogleButton>
        <Actions
          secondary={<TextButton onClick={() => navigate('/register', { state: { email: email.trim() } })}>Create account</TextButton>}
          primary={<button type="submit" className="btn-light !px-6" disabled={busy}>Next</button>}
        />
      </form>
    </AuthShell>
  );
};

export default Login;
