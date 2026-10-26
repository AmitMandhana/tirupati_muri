import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import FormField from '../components/FormField';
import Logo from '../components/Logo';
import NavIcon from '../components/NavIcon';
import Spinner from '../components/Spinner';
import { useAuth } from '../hooks/useAuth';
import { getApiErrorMessage } from '../utils/errors';
import { fieldInputClass } from '../utils/formStyles';
import { isValidEmail } from '../utils/validation';

const emptyLoginForm = { email: '', password: '' };
const emptySetupForm = { name: '', email: '', password: '', confirmPassword: '' };

const LoginPage = () => {
  const { user, login, setup } = useAuth();

  const [mode, setMode] = useState('login');
  const [loginForm, setLoginForm] = useState(emptyLoginForm);
  const [setupForm, setSetupForm] = useState(emptySetupForm);
  const [loginErrors, setLoginErrors] = useState({});
  const [setupErrors, setSetupErrors] = useState({});
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSetupPassword, setShowSetupPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setLoginErrors({});
    setSetupErrors({});
    setShowLoginPassword(false);
    setShowSetupPassword(false);
  };

  const handleLoginSubmit = async (event) => {
    event.preventDefault();

    const errors = {};
    if (!loginForm.email.trim()) {
      errors.email = 'Email is required.';
    } else if (!isValidEmail(loginForm.email)) {
      errors.email = 'Enter a valid email address.';
    }
    if (!loginForm.password) {
      errors.password = 'Password is required.';
    }

    setLoginErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const loggedInUser = await login({
        email: loginForm.email.trim(),
        password: loginForm.password,
      });
      toast.success(`Welcome back, ${loggedInUser.name.split(' ')[0]}.`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to sign in. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetupSubmit = async (event) => {
    event.preventDefault();

    const errors = {};
    if (!setupForm.name.trim()) {
      errors.name = 'Name is required.';
    } else if (setupForm.name.trim().length > 100) {
      errors.name = 'Name cannot be longer than 100 characters.';
    }

    if (!setupForm.email.trim()) {
      errors.email = 'Email is required.';
    } else if (!isValidEmail(setupForm.email)) {
      errors.email = 'Enter a valid email address.';
    }

    if (!setupForm.password) {
      errors.password = 'Password is required.';
    } else if (setupForm.password.length < 8) {
      errors.password = 'Use at least 8 characters.';
    } else if (setupForm.password.length > 72) {
      errors.password = 'Password cannot be longer than 72 characters.';
    }

    if (setupForm.confirmPassword !== setupForm.password) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    setSetupErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const email = setupForm.email.trim().toLowerCase();
      await setup({
        name: setupForm.name.trim(),
        email,
        password: setupForm.password,
      });
      toast.success('Owner account created. Please sign in.');
      setLoginForm({ email, password: '' });
      setSetupForm(emptySetupForm);
      setMode('login');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to create the account.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream-50 lg:grid lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-sidebar-900 px-12 py-12 lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-600/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-brand-500/10 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <Logo className="h-11 w-11" />
          <div>
            <p className="text-sm font-semibold text-white">Tirupati Puffed Rice Mill</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-sidebar-muted">
              Management System
            </p>
          </div>
        </div>

        <div className="relative max-w-lg py-12">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-200">
            Business Management System
          </p>
          <p className="mt-4 text-4xl font-semibold leading-[1.2] text-white">
            Everyday mill records, held together in one place.
          </p>          <p className="mt-4 max-w-md text-sm leading-relaxed text-sidebar-muted">
            A simple, dependable business system for the mill — built for everyday desktop use
            rather than complicated enterprise software.
          </p>
          <ul className="mt-8 flex flex-wrap gap-2">
            {['Retail & wholesale', 'Stock & production', 'Cash & accounts'].map((item) => (
              <li
                key={item}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-sidebar-text"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-[11px] text-sidebar-muted">
          Tirupati Puffed Rice Mill &middot; Business Management System
        </p>
      </section>

      <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Logo className="h-11 w-11" />
            <div>
              <p className="text-sm font-semibold text-ink-900">Tirupati Puffed Rice Mill</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-ink-500">
                Management System
              </p>
            </div>
          </div>

          <div className="card p-6 sm:p-8">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600">
              <NavIcon name={mode === 'login' ? 'lock' : 'user'} className="h-4 w-4" />
              {mode === 'login' ? 'Secure sign in' : 'First-time setup'}
            </div>

            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink-900">
              {mode === 'login' ? 'Welcome back' : 'Create the owner account'}
            </h1>
            <p className="mt-1 text-sm leading-relaxed text-ink-500">
              {mode === 'login'
                ? 'Sign in to open the mill dashboard.'
                : 'Create the first user for this mill. This form stops working once an account exists.'}
            </p>

            {mode === 'login' ? (
              <form className="mt-6 space-y-4" onSubmit={handleLoginSubmit} noValidate>
                <FormField label="Email" htmlFor="login-email" error={loginErrors.email} required>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    className={fieldInputClass(Boolean(loginErrors.email))}
                    placeholder="owner@example.com"
                    value={loginForm.email}
                    onChange={(event) => {
                      setLoginForm((prev) => ({ ...prev, email: event.target.value }));
                      setLoginErrors((prev) => ({ ...prev, email: '' }));
                    }}
                  />
                </FormField>

                <FormField
                  label="Password"
                  htmlFor="login-password"
                  error={loginErrors.password}
                  required
                >
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showLoginPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      className={`${fieldInputClass(Boolean(loginErrors.password))} pr-16`}
                      placeholder="Enter your password"
                      value={loginForm.password}
                      onChange={(event) => {
                        setLoginForm((prev) => ({ ...prev, password: event.target.value }));
                        setLoginErrors((prev) => ({ ...prev, password: '' }));
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-2 my-auto h-7 rounded px-2 text-xs font-semibold text-ink-500 transition-colors hover:text-ink-900"
                    >
                      {showLoginPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </FormField>

                <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Spinner /> Signing in...
                    </>
                  ) : (
                    'Sign in'
                  )}
                </button>
              </form>
            ) : (
              <form className="mt-6 space-y-4" onSubmit={handleSetupSubmit} noValidate>
                <FormField label="Owner name" htmlFor="setup-name" error={setupErrors.name} required>
                  <input
                    id="setup-name"
                    type="text"
                    autoComplete="name"
                    className={fieldInputClass(Boolean(setupErrors.name))}
                    placeholder="Full name"
                    value={setupForm.name}
                    onChange={(event) => {
                      setSetupForm((prev) => ({ ...prev, name: event.target.value }));
                      setSetupErrors((prev) => ({ ...prev, name: '' }));
                    }}
                  />
                </FormField>

                <FormField
                  label="Email"
                  htmlFor="setup-email"
                  error={setupErrors.email}
                  required
                >
                  <input
                    id="setup-email"
                    type="email"
                    autoComplete="email"
                    className={fieldInputClass(Boolean(setupErrors.email))}
                    placeholder="owner@example.com"
                    value={setupForm.email}
                    onChange={(event) => {
                      setSetupForm((prev) => ({ ...prev, email: event.target.value }));
                      setSetupErrors((prev) => ({ ...prev, email: '' }));
                    }}
                  />
                </FormField>

                <FormField
                  label="Password"
                  htmlFor="setup-password"
                  error={setupErrors.password}
                  hint="At least 8 characters."
                  required
                >
                  <div className="relative">
                    <input
                      id="setup-password"
                      type={showSetupPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      className={`${fieldInputClass(Boolean(setupErrors.password))} pr-16`}
                      placeholder="Create a password"
                      value={setupForm.password}
                      onChange={(event) => {
                        setSetupForm((prev) => ({ ...prev, password: event.target.value }));
                        setSetupErrors((prev) => ({ ...prev, password: '' }));
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSetupPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-2 my-auto h-7 rounded px-2 text-xs font-semibold text-ink-500 transition-colors hover:text-ink-900"
                    >
                      {showSetupPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </FormField>

                <FormField
                  label="Confirm password"
                  htmlFor="setup-confirm-password"
                  error={setupErrors.confirmPassword}
                  required
                >
                  <input
                    id="setup-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    className={fieldInputClass(Boolean(setupErrors.confirmPassword))}
                    placeholder="Re-enter the password"
                    value={setupForm.confirmPassword}
                    onChange={(event) => {
                      setSetupForm((prev) => ({ ...prev, confirmPassword: event.target.value }));
                      setSetupErrors((prev) => ({ ...prev, confirmPassword: '' }));
                    }}
                  />
                </FormField>

                <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Spinner /> Creating account...
                    </>
                  ) : (
                    'Create owner account'
                  )}
                </button>
              </form>
            )}

            <div className="mt-6 border-t border-cream-200 pt-4 text-center text-sm text-ink-500">
              {mode === 'login' ? (
                <>
                  First time setting up this mill?{' '}
                  <button
                    type="button"
                    className="font-semibold text-brand-700 underline-offset-2 hover:underline"
                    onClick={() => switchMode('setup')}
                  >
                    Create the first user
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    className="font-semibold text-brand-700 underline-offset-2 hover:underline"
                    onClick={() => switchMode('login')}
                  >
                    Back to sign in
                  </button>
                </>
              )}
            </div>
          </div>

          <p className="mt-5 text-center text-[11px] text-ink-400">
            Single-user access &middot; Secured with JWT authentication
          </p>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;
