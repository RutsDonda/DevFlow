import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { NO_ACCOUNT, authErrorMessage, useAuth } from '../context/AuthContext';
import AuthShell, {
  Divider, Field, FormError, GoogleButton, InlineAction, PasswordField, SubmitButton, emailError,
} from '../components/auth/AuthShell';
import RegisterForm from './Register';

const WRONG_PASSWORD = ['auth/invalid-credential', 'auth/wrong-password'];

const SignInForm = ({ email, setEmail, busy, setBusy, onSwitch, google }) => {
  const { login, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);

  const createOne = <>No account found for this email. <InlineAction onClick={() => onSwitch('register')}>Create one</InlineAction></>;

  const submit = async (e) => {
    e.preventDefault();
    const errs = { email: emailError(email), password: password ? null : 'Enter your password' };
    setErrors(errs);
    setFormError(null);
    if (errs.email || errs.password) return;
    setBusy(true);
    try {
      await login(email.trim(), password);
      navigate('/');
    } catch (err) {
      if (err.code === NO_ACCOUNT) setErrors({ email: createOne });
      else if (WRONG_PASSWORD.includes(err.code)) setErrors({ password: 'Incorrect password. Try again or reset it.' });
      else setFormError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    const err = emailError(email);
    if (err) return setErrors({ email: 'Enter your email first, then click "Forgot password?"' });
    try {
      await resetPassword(email.trim());
      toast.success(`Password reset link sent to ${email.trim()}`);
    } catch (e) {
      setFormError(authErrorMessage(e));
    }
    return undefined;
  };

  return (
    <>
      <FormError>{formError}</FormError>
      <GoogleButton onClick={() => google(setFormError)} disabled={busy} />
      <Divider label="or sign in with email" />
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field
          label="Email address" id="email" type="email" autoComplete="email" autoFocus
          value={email} error={errors.email}
          onChange={(e) => { setEmail(e.target.value); setErrors((s) => ({ ...s, email: null })); }}
          onBlur={() => email && setErrors((s) => ({ ...s, email: emailError(email) }))}
        />
        <div>
          <PasswordField
            label="Password" id="password" autoComplete="current-password"
            value={password} error={errors.password}
            onChange={(e) => { setPassword(e.target.value); setErrors((s) => ({ ...s, password: null })); }}
          />
          <div className="mt-2 flex justify-end">
            <button type="button" onClick={forgot} disabled={busy} className="text-[13px] text-mute hover:text-ink">Forgot password?</button>
          </div>
        </div>
        <SubmitButton busy={busy}>Sign in</SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-mute">
        New to AI DevFlow? <InlineAction onClick={() => onSwitch('register')}>Create an account</InlineAction>
      </p>
    </>
  );
};

const HEADERS = {
  signin: ['Welcome back', 'Sign in to continue to your workspace.'],
  details: ['Create your account', 'Free to start – it takes less than a minute.'],
  password: ['Secure your account', 'Step 2 of 2 · choose a password'],
};

/**
 * /login and /register: one page with a Sign In / Create Account switcher. Switching only swaps
 * the URL in place (same component, no remount), so the email typed so far carries over.
 */
const Login = () => {
  const { loginWithGoogle, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const tab = location.pathname === '/register' ? 'register' : 'signin';
  const [email, setEmail] = useState(location.state?.email || '');
  const [step, setStep] = useState('details'); // register: 'details' | 'password'
  const [busy, setBusy] = useState(false);

  if (isAuthenticated && !busy) return <Navigate to="/" replace />;

  const switchTab = (next) => {
    setStep('details');
    navigate(next === 'register' ? '/register' : '/login', { replace: true });
  };

  /** Google sign-in creates the account on first use, so it serves both tabs. */
  const google = async (setFormError) => {
    setBusy(true);
    setFormError(null);
    try {
      await loginWithGoogle();
      navigate('/');
    } catch (err) {
      setFormError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const [title, subtitle] = HEADERS[tab === 'signin' ? 'signin' : step];
  const shared = { email, setEmail, busy, setBusy, onSwitch: switchTab, google };

  return (
    <AuthShell tab={tab} onTabChange={switchTab} title={title} subtitle={subtitle} busy={busy}>
      {tab === 'signin' ? <SignInForm {...shared} /> : <RegisterForm {...shared} step={step} setStep={setStep} />}
    </AuthShell>
  );
};

export default Login;
