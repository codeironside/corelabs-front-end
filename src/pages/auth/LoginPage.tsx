import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  completeGoogleSignup,
  fetchMe,
  googleStudioLogin,
  isSignupRoleRequired,
  isTokenPair,
} from '@/api/auth';
import { SIGNUP_ROLE_OPTIONS, type SignupRoleOption } from '@/config/roles';
import {
  isFirebaseConfigured,
  isGooglePopupCancelled,
  signInWithGoogleIdToken,
} from '@/config/firebase';
import { getAuthErrorMessage } from '@/lib/authError';
import { useAuthStore } from '@/store/authStore';
import { AmbientVideo } from '@/components/AmbientVideo';

type AuthMode = 'login' | 'signup';

function GoogleGlyph(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.3-.9 2.4-1.9 3.1l3.1 2.4c1.8-1.7 2.9-4.1 2.9-7 0-.7-.1-1.3-.2-1.9H12z"
      />
      <path
        fill="#34A853"
        d="M5.3 14.3l-.8.6-2.7 2.1C3.5 20.1 7.4 22.5 12 22.5c3 0 5.5-1 7.3-2.7l-3.1-2.4c-.9.6-2 .9-3.3.9-2.5 0-4.6-1.7-5.4-4z"
      />
      <path
        fill="#4A90E2"
        d="M3.8 7.1C3.3 8.1 3 9.2 3 10.5s.3 2.4.8 3.4l3.5-2.7c-.2-.6-.3-1.2-.3-1.7 0-.6.1-1.1.3-1.6L3.8 7.1z"
      />
      <path
        fill="#FBBC05"
        d="M12 5.3c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.5 2.1 15 1 12 1 7.4 1 3.5 3.4 1.8 7.1l3.5 2.7C6.1 7 8.2 5.3 12 5.3z"
      />
    </svg>
  );
}

export function LoginPage(): React.JSX.Element {
  const navigate = useNavigate();
  const accessToken = useAuthStore((state) => state.accessToken);
  const setTokens = useAuthStore((state) => state.setTokens);
  const setUser = useAuthStore((state) => state.setUser);

  const [mode, setMode] = useState<AuthMode>('login');
  const [signupRole, setSignupRole] = useState<SignupRoleOption>('editor');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [pendingToken, setPendingToken] = useState<string | null>(null);

  if (accessToken && !pendingToken) {
    return <Navigate to="/home" replace />;
  }

  async function enterWithTokens(access: string, refresh: string): Promise<void> {
    setTokens(access, refresh);
    const me = await fetchMe();
    setUser(me);
    toast.success('welcome to corelabsstudio');
    navigate(me.role === 'user' ? '/account' : '/app', { replace: true });
  }

  async function startGoogle(): Promise<void> {
    if (!isFirebaseConfigured()) {
      toast.error('google sign-in is not configured on this platform');
      return;
    }

    setLoading(true);
    try {
      const idToken = await signInWithGoogleIdToken();
      const result = await googleStudioLogin({
        idToken,
        intent: mode,
        signupRole: mode === 'signup' ? signupRole : undefined,
        rememberMe,
      });

      if (isSignupRoleRequired(result)) {
        setPendingToken(result.signupToken);
        setMode('signup');
        toast('new google account — choose users or editor to finish');
        return;
      }

      if (isTokenPair(result)) {
        await enterWithTokens(result.accessToken, result.refreshToken);
      }
    } catch (error) {
      if (isGooglePopupCancelled(error)) {
        return;
      }
      toast.error(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function finishPendingSignup(): Promise<void> {
    if (!pendingToken) {
      return;
    }
    setLoading(true);
    try {
      const tokens = await completeGoogleSignup({
        signupToken: pendingToken,
        signupRole,
        rememberMe,
      });
      setPendingToken(null);
      await enterWithTokens(tokens.accessToken, tokens.refreshToken);
    } catch (error) {
      toast.error(getAuthErrorMessage(error, 'could not finish google signup'));
    } finally {
      setLoading(false);
    }
  }

  if (pendingToken) {
    return (
      <main className="flex min-h-full items-center justify-center bg-black px-6 py-16 text-white">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-neutral-950 p-8">
          <h1 className="text-2xl font-medium tracking-tight">choose your role</h1>
          <p className="mt-3 text-sm text-white/60">finish google signup for corelabsstudio.</p>
          <div className="mt-6 grid grid-cols-2 gap-2">
            {SIGNUP_ROLE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSignupRole(option.value)}
                className={`rounded-full border px-4 py-3 text-sm transition-colors ${
                  signupRole === option.value
                    ? 'border-white bg-white text-black'
                    : 'border-white/15 text-white/70 hover:border-white/40'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              void finishPendingSignup();
            }}
            className="mt-6 w-full rounded-full bg-white px-6 py-3 text-sm text-black transition-colors hover:bg-neutral-200 disabled:opacity-60"
          >
            {loading ? 'creating…' : 'continue'}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-full items-center justify-center overflow-hidden bg-black px-6 py-16">
      <AmbientVideo
        videoKey="atmosphere"
        variant="background"
        kenBurns
        overlayClassName="absolute inset-0 bg-gradient-to-b from-black/70 via-black/55 to-black/80"
      />
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-black/80 p-8 backdrop-blur">
        <Link to="/" className="text-sm text-white/60 transition-colors hover:text-white">
          ← corelabsstudio
        </Link>
        <h1 className="mt-8 text-3xl font-medium tracking-tight">start creating</h1>
        <p className="mt-3 text-sm leading-relaxed text-white/60">
          google sign-in is handled by CoreLabsStudio. roles: users, editor, admin, and super admin.
        </p>

        <div className="mt-8 flex gap-2 rounded-full bg-neutral-900 p-1">
          {(['login', 'signup'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setMode(option)}
              className={`flex-1 rounded-full px-4 py-2 text-sm transition-colors ${
                mode === option ? 'bg-white text-black' : 'text-white/60 hover:text-white'
              }`}
            >
              {option === 'login' ? 'sign in' : 'create account'}
            </button>
          ))}
        </div>

        {mode === 'signup' ? (
          <div className="mt-6">
            <p className="text-xs tracking-[0.16em] text-white/45 uppercase">account type</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {SIGNUP_ROLE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSignupRole(option.value)}
                  className={`rounded-full border px-4 py-3 text-sm transition-colors ${
                    signupRole === option.value
                      ? 'border-white bg-white text-black'
                      : 'border-white/15 text-white/70 hover:border-white/40 hover:text-white'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-white/45">
              admin and super admin are assigned by CoreLabs — choose users or editor when signing up.
            </p>
          </div>
        ) : null}

        <label className="mt-6 flex items-center gap-2 text-sm text-white/60">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(event) => setRememberMe(event.target.checked)}
          />
          remember me
        </label>

        <button
          type="button"
          disabled={loading}
          onClick={() => {
            void startGoogle();
          }}
          className="mt-6 inline-flex w-full items-center justify-center gap-3 rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition-colors hover:bg-neutral-200 disabled:opacity-60"
        >
          <GoogleGlyph />
          {loading ? 'signing in…' : 'continue with google'}
        </button>

        <button
          type="button"
          onClick={() => navigate('/')}
          className="mt-4 w-full rounded-full border border-white/15 px-6 py-3 text-sm text-white/60 transition-colors hover:border-white/40 hover:text-white"
        >
          back to marketing
        </button>
      </div>
    </main>
  );
}
