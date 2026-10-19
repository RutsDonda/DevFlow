import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authErrorMessage, useAuth } from '../context/AuthContext';
import AuthShell, {
  Actions, Divider, EmailChip, Field, GoogleButton, PasswordFields, TextButton,
} from '../components/auth/AuthShell';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Two steps like Google: name + email → Next → password + confirm → Create account. Google sign-up is offered on the first. */
const Register = () => {
  const { register, loginWithGoogle, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState('details'); // 'details' | 'password'
  const [form, setForm] = useState({ name: '', email: location.state?.email || '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  if (isAuthenticated && !busy) return <Navigate to="/" replace />;

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((errs) => ({ ...errs, [key]: null }));
  };

  const toPassword = (e) => {
    e.preventDefault();
    const errs = {
      name: form.name.trim() ? null : 'Enter your name',
      email: !form.email.trim() ? 'Enter an email' : EMAIL_RE.test(form.email.trim()) ? null : 'Enter a valid email',
    };
    setErrors(errs);
    if (!errs.name && !errs.email) setStep('password');
  };

  const create = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return setErrors({ password: 'Use 6 characters or more for your password' });
    if (form.password !== form.confirm) return setErrors({ confirm: 'Those passwords didn’t match. Try again.' });
    setBusy(true);
    try {
      await register(form.name.trim(), form.email.trim(), form.password);
      navigate('/');
    } catch (err) {
      if (err.code === 'auth/email-already-in-use' || err.code === 'auth/invalid-email') {
        setStep('details');
        setErrors({ email: authErrorMessage(err) });
      } else {
        setErrors({ password: authErrorMessage(err) });
      }
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  // Signing in with Google creates the account on first use
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

  const signInInstead = (
    <TextButton onClick={() => navigate('/login', { state: { email: form.email.trim() } })}>Sign in instead</TextButton>
  );

  if (step === 'password') {
    return (
      <AuthShell
        title="Create a strong password"
        subtitle="Use 6 or more characters"
        busy={busy}
        aside={<EmailChip email={form.email.trim()} onClick={() => setStep('details')} />}
      >
        <form onSubmit={create} noValidate>
          <PasswordFields
            fields={[
              { label: 'Password', id: 'password', autoComplete: 'new-password', autoFocus: true, value: form.password, error: errors.password, onChange: set('password') },
              { label: 'Confirm', id: 'confirm', autoComplete: 'new-password', value: form.confirm, error: errors.confirm, onChange: set('confirm') },
            ]}
          />
          <Actions
            secondary={<TextButton onClick={() => setStep('details')} disabled={busy}>Back</TextButton>}
            primary={<button type="submit" className="btn-light !px-6" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>}
          />
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Create an AI DevFlow account" subtitle="Enter your name and email" busy={busy}>
      <form onSubmit={toPassword} noValidate>
        <div className="space-y-4">
          <Field label="Full name" id="name" autoComplete="name" autoFocus value={form.name} error={errors.name} onChange={set('name')} />
          <Field label="Email" id="email" type="email" autoComplete="email" value={form.email} error={errors.email} onChange={set('email')} />
        </div>
        <Divider label="or" />
        <GoogleButton onClick={google} disabled={busy}>Sign up with Google</GoogleButton>
        <Actions secondary={signInInstead} primary={<button type="submit" className="btn-light !px-6" disabled={busy}>Next</button>} />
      </form>
    </AuthShell>
  );
};

export default Register;
