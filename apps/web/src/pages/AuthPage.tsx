import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';

export default function AuthPage() {
  const { user, loading, signInWithGoogle, signInWithMagicLink } = useAuth();
  const [email, setEmail] = useState('');
  const [magicSent, setMagicSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/inbox" replace />;

  async function handleMagicLink(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signInWithMagicLink(email);
      setMagicSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, #5E6AD2 0, transparent 45%), radial-gradient(circle at 80% 10%, #4ade80 0, transparent 40%)',
        }}
      />
      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border-2 bg-surface-2 shadow-glow mb-4">
            <span className="text-accent text-lg font-semibold">S</span>
          </div>
          <h1 className="text-text text-2xl font-semibold tracking-tight">
            Speedy Tasks
          </h1>
          <p className="text-muted text-sm mt-2">
            Keyboard-first task management
          </p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-6 space-y-4 shadow-glow">
          {!isSupabaseConfigured && (
            <p className="text-muted text-xs leading-relaxed border border-border-2 rounded-lg px-3 py-2 bg-surface-2">
              Cloud sign-in is disabled until you add{' '}
              <code className="text-dim">VITE_SUPABASE_URL</code> and{' '}
              <code className="text-dim">VITE_SUPABASE_ANON_KEY</code> (see{' '}
              <code className="text-dim">.env.example</code>). Local tasks still
              work in the app without an account.
            </p>
          )}

          {magicSent ? (
            <div className="text-center py-4">
              <p className="text-text text-sm">
                Check your email — a magic link is on its way to{' '}
                <span className="text-accent">{email}</span>.
              </p>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => void signInWithGoogle()}
                disabled={!isSupabaseConfigured}
                className="w-full flex items-center justify-center gap-3 bg-surface-2 hover:bg-border disabled:opacity-40 disabled:cursor-not-allowed text-text text-sm font-medium px-4 py-2.5 rounded-md border border-border-2 transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
                  />
                  <path
                    fill="#34A853"
                    d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
                  />
                  <path
                    fill="#EA4335"
                    d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.962L3.964 6.294C4.672 4.169 6.656 3.58 9 3.58z"
                  />
                </svg>
                Continue with Google
              </button>

              <div className="relative flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-muted text-xs">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <form onSubmit={handleMagicLink} className="space-y-3">
                <input
                  type="email"
                  required
                  disabled={!isSupabaseConfigured}
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-surface-2 border border-border-2 rounded-md px-3 py-2 text-text text-sm placeholder:text-muted focus:outline-none focus:border-accent transition-colors disabled:opacity-40"
                />
                {error && <p className="text-red text-xs">{error}</p>}
                <button
                  type="submit"
                  disabled={submitting || !isSupabaseConfigured}
                  className="w-full bg-accent hover:bg-accent/90 disabled:opacity-50 text-white text-sm font-medium px-4 py-2.5 rounded-md transition-colors"
                >
                  {submitting ? 'Sending…' : 'Send magic link'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-muted text-xs mt-6">
          No account required — works offline without signing in.
        </p>
      </div>
    </div>
  );
}
