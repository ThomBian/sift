import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

// Lets the in-app browser auth session dismiss itself cleanly after redirect.
WebBrowser.maybeCompleteAuthSession();

// Where Supabase sends the magic link back to. Resolves to
// `siftmobile://auth-callback` in a dev/standalone build and
// `exp://HOST:PORT/--/auth-callback` inside Expo Go.
const redirectTo = Linking.createURL("/auth-callback");

// The PKCE magic link returns to the app with a `?code=` we trade for a
// session. onAuthStateChange then propagates the new session to the UI.
async function exchangeUrlForSession(url: string): Promise<void> {
  if (!supabase) return;
  const { queryParams } = Linking.parse(url);
  const errorDescription = queryParams?.error_description ?? queryParams?.error;
  if (errorDescription) throw new Error(String(errorDescription));
  const code = queryParams?.code;
  if (typeof code !== "string") return;
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw error;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signInWithMagicLink: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setSession(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    // Cold start: app was launched by tapping the magic link.
    void Linking.getInitialURL().then((url) => {
      if (url) exchangeUrlForSession(url).catch((err) => console.warn("[auth] deep-link exchange failed:", err));
    });

    // Warm: link tapped while the app is already running.
    const linkSub = Linking.addEventListener("url", ({ url }) => {
      exchangeUrlForSession(url).catch((err) => console.warn("[auth] deep-link exchange failed:", err));
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      linkSub.remove();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      async signInWithMagicLink(email: string) {
        if (!supabase) throw new Error("Supabase is not configured");
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: redirectTo },
        });
        if (error) throw error;
      },
      async signInWithGoogle() {
        if (!supabase) throw new Error("Supabase is not configured");
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo, skipBrowserRedirect: true },
        });
        if (error) throw error;
        if (!data?.url) throw new Error("No OAuth URL returned");

        // Open Google's consent flow in an in-app browser and capture the
        // redirect back to our deep link, then exchange the ?code= for a
        // session (PKCE — same path as the magic link).
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (result.type === "success" && result.url) {
          await exchangeUrlForSession(result.url);
        }
      },
      async signOut() {
        if (!supabase) return;
        await supabase.auth.signOut();
      },
    }),
    [loading, session],
  );

  // Always provide context — AppContent calls useAuth() before its own
  // isSupabaseConfigured check, and `value` already degrades gracefully when
  // Supabase is absent (loading=false, signIn throws, signOut no-ops).
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
