import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { readJSON, secure, uid, writeJSON } from './storage';
import { supabase } from './supabase';

export type User = {
  id: string;
  name: string;
  email: string;
  createdAt: number;
  provider: 'email' | 'guest';
  /** Profile photo URL (or a local file when Supabase isn't set up). */
  avatar?: string;
  /** Set when the account signs in with Google or Facebook; email and password then belong to that provider. */
  social?: string;
};

type StoredAccount = User & { salt: string; hash: string };

export type SocialProvider = 'google' | 'apple' | 'facebook';

type AuthError =
  | 'errExists'
  | 'errCredentials'
  | 'errLocked'
  | 'errConfirmEmail'
  | 'errNetwork'
  | 'errConfig'
  | 'errSignupDisabled'
  | 'errEmailSend'
  | 'errPassword'
  | 'errEmail'
  | 'errCode'
  | 'errProviderDisabled'
  | 'socialNeedsCloud'
  | 'errAuthUnknown';

type AuthValue = {
  user: User | null;
  ready: boolean;
  isGuest: boolean;
  register: (name: string, email: string, password: string) => Promise<AuthError | null>;
  login: (email: string, password: string) => Promise<AuthError | null>;
  continueAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  /** Email a password-reset link. Only available with Supabase. */
  resetPassword: (email: string) => Promise<'sent' | 'unavailable' | 'error'>;
  /** Confirm a new account with the code from the sign-up email. Only with Supabase. */
  verifyEmail: (email: string, code: string) => Promise<AuthError | null>;
  /** Sign in with Google, Apple or Facebook through Supabase. Returns 'cancelled' if the user closed the browser. */
  signInWithProvider: (provider: SocialProvider) => Promise<AuthError | 'cancelled' | null>;
  /** Send a fresh sign-up code. */
  resendCode: (email: string) => Promise<AuthError | null>;
  /** Change the display name and/or profile photo. */
  updateProfile: (changes: { name?: string; avatar?: string | null }) => Promise<AuthError | null>;
  changePassword: (password: string) => Promise<AuthError | null>;
  /** Start an email change. With Supabase this returns 'code' and a code is sent to the new address. */
  changeEmail: (email: string) => Promise<AuthError | 'code' | null>;
  /** Finish an email change with the code sent to the new address. */
  confirmEmailChange: (email: string, code: string) => Promise<AuthError | null>;
};

const ACCOUNTS_KEY = 'mps.accounts';
const SESSION_KEY = 'mps_session';
const GUEST: User = { id: 'guest', name: '', email: '', createdAt: 0, provider: 'guest' };

// Simple brute-force protection: lock login for 60s after 5 failures.
const MAX_ATTEMPTS = 5;
const LOCK_MS = 60_000;
let failures = 0;
let lockedUntil = 0;

async function hashPassword(password: string, salt: string) {
  // Key stretching: iterate SHA-256 so offline guessing is expensive.
  let digest = `${salt}:${password}`;
  for (let i = 0; i < 600; i++) {
    digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, digest + salt);
  }
  return digest;
}

function toUser({ salt: _s, hash: _h, ...user }: StoredAccount): User {
  return user;
}

type SupabaseUser = {
  id: string;
  email?: string;
  created_at: string;
  user_metadata?: { name?: string; full_name?: string; avatar_url?: string; picture?: string };
  app_metadata?: { provider?: string };
};
const fromSupabase = (u: SupabaseUser): User => {
  const social = u.app_metadata?.provider && u.app_metadata.provider !== 'email' ? u.app_metadata.provider : undefined;
  return {
    id: u.id,
    name: u.user_metadata?.name ?? u.user_metadata?.full_name ?? u.email?.split('@')[0] ?? '',
    email: u.email ?? '',
    createdAt: Date.parse(u.created_at),
    provider: 'email',
    avatar: u.user_metadata?.avatar_url ?? u.user_metadata?.picture ?? undefined,
    social,
  };
};

let lastDetail = '';
/** The raw message from the last failed Supabase auth call, shown under the friendly error. */
export const authErrorDetail = () => lastDetail;

function supabaseError(message: string): AuthError {
  lastDetail = message;
  const m = message.toLowerCase();
  if (m.includes('already registered') || m.includes('already exists')) return 'errExists';
  if (m.includes('not confirmed')) return 'errConfirmEmail';
  if (m.includes('invalid login') || m.includes('invalid credentials')) return 'errCredentials';
  if (m.includes('provider is not enabled') || m.includes('unsupported provider')) return 'errProviderDisabled';
  if (m.includes('token') && (m.includes('expired') || m.includes('invalid'))) return 'errCode';
  if (m.includes('sending') && m.includes('email')) return 'errEmailSend';
  if (m.includes('rate limit') || m.includes('too many')) return 'errLocked';
  if (m.includes('api key') || m.includes('apikey') || m.includes('jwt') || m.includes('invalid authentication')) return 'errConfig';
  if (m.includes('signups not allowed') || m.includes('signup is disabled')) return 'errSignupDisabled';
  if (m.includes('password')) return 'errPassword';
  if (m.includes('email') && m.includes('invalid')) return 'errEmail';
  if (m.includes('fetch') || m.includes('network') || m.includes('timed out') || m.includes('failed to')) return 'errNetwork';
  return 'errAuthUnknown';
}

/** Run a Supabase auth call, turning thrown network errors into an AuthError too. */
async function guarded<T>(call: () => Promise<T>): Promise<T | { thrown: AuthError }> {
  try {
    return await call();
  } catch (e) {
    return { thrown: supabaseError(e instanceof Error ? e.message : String(e)) };
  }
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // With Supabase, follow its session (restored from storage, refreshed automatically).
    const sub = supabase?.auth.onAuthStateChange((_event, session) => {
      if (session?.user) setUser(fromSupabase(session.user));
      else setUser((u) => (u?.provider === 'guest' ? u : null));
    });
    (async () => {
      try {
        const session = await secure.get(SESSION_KEY);
        if (supabase) {
          const { data } = await supabase.auth.getSession();
          if (data.session?.user) setUser(fromSupabase(data.session.user));
          else if (session === 'guest') setUser(GUEST);
        } else if (session === 'guest') setUser(GUEST);
        else if (session) {
          const accounts = await readJSON<StoredAccount[]>(ACCOUNTS_KEY, []);
          const acc = accounts.find((a) => a.id === session);
          if (acc) setUser(toUser(acc));
        }
      } finally {
        setReady(true);
      }
    })();
    return () => sub?.data.subscription.unsubscribe();
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    if (supabase) {
      const res = await guarded(() =>
        supabase!.auth.signUp({ email: email.trim().toLowerCase(), password, options: { data: { name: name.trim() } } }),
      );
      if ('thrown' in res) return res.thrown;
      const { data, error } = res;
      if (error) return supabaseError(error.message);
      // Supabase returns no session when "Confirm email" is on (an identities-less user means the email is taken).
      if (data.user && data.user.identities?.length === 0) return 'errExists' as const;
      if (!data.session) return 'errConfirmEmail' as const;
      await secure.remove(SESSION_KEY);
      setUser(fromSupabase(data.session.user));
      return null;
    }
    const accounts = await readJSON<StoredAccount[]>(ACCOUNTS_KEY, []);
    const normalized = email.trim().toLowerCase();
    if (accounts.some((a) => a.email === normalized)) return 'errExists' as const;
    const salt = Crypto.randomUUID();
    const account: StoredAccount = {
      id: uid(),
      name: name.trim(),
      email: normalized,
      createdAt: Date.now(),
      provider: 'email',
      salt,
      hash: await hashPassword(password, salt),
    };
    await writeJSON(ACCOUNTS_KEY, [...accounts, account]);
    await secure.set(SESSION_KEY, account.id);
    setUser(toUser(account));
    return null;
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    if (Date.now() < lockedUntil) return 'errLocked' as const;
    if (supabase) {
      const res = await guarded(() => supabase!.auth.signInWithPassword({ email: email.trim().toLowerCase(), password }));
      if ('thrown' in res) return res.thrown;
      const { data, error } = res;
      if (error) return supabaseError(error.message);
      await secure.remove(SESSION_KEY);
      setUser(fromSupabase(data.user));
      return null;
    }
    const accounts = await readJSON<StoredAccount[]>(ACCOUNTS_KEY, []);
    const acc = accounts.find((a) => a.email === email.trim().toLowerCase());
    if (!acc || (await hashPassword(password, acc.salt)) !== acc.hash) {
      failures += 1;
      if (failures >= MAX_ATTEMPTS) {
        lockedUntil = Date.now() + LOCK_MS;
        failures = 0;
      }
      return 'errCredentials' as const;
    }
    failures = 0;
    await secure.set(SESSION_KEY, acc.id);
    setUser(toUser(acc));
    return null;
  }, []);

  const continueAsGuest = useCallback(async () => {
    await secure.set(SESSION_KEY, 'guest');
    setUser(GUEST);
  }, []);

  const logout = useCallback(async () => {
    await supabase?.auth.signOut();
    await secure.remove(SESSION_KEY);
    setUser(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (!supabase) return 'unavailable' as const;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
    return error ? ('error' as const) : ('sent' as const);
  }, []);

  const verifyEmail = useCallback(async (email: string, code: string) => {
    if (!supabase) return 'errConfig' as const;
    const normalized = email.trim().toLowerCase();
    // 'email' is the current OTP type; older projects still issue sign-up codes as 'signup'.
    let res = await guarded(() => supabase!.auth.verifyOtp({ email: normalized, token: code, type: 'email' }));
    if (!('thrown' in res) && res.error) res = await guarded(() => supabase!.auth.verifyOtp({ email: normalized, token: code, type: 'signup' }));
    if ('thrown' in res) return res.thrown;
    if (res.error || !res.data.session) return supabaseError(res.error?.message ?? 'Token has expired or is invalid');
    await secure.remove(SESSION_KEY);
    setUser(fromSupabase(res.data.session.user));
    return null;
  }, []);

  const signInWithProvider = useCallback(async (provider: SocialProvider) => {
    if (!supabase) return 'socialNeedsCloud' as const;
    if (Platform.OS === 'web') {
      // The browser leaves the app, signs in, and comes back here; the session is picked up from the URL.
      const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin } });
      return error ? supabaseError(error.message) : null;
    }
    // Mobile: open the provider's sign-in page in a secure in-app browser and catch the redirect back.
    const redirectTo = Linking.createURL('auth/callback');
    const { data, error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo, skipBrowserRedirect: true } });
    if (error || !data.url) return supabaseError(error?.message ?? 'Unsupported provider: provider is not enabled');
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success') return 'cancelled' as const;
    const url = new URL(result.url);
    const params = new URLSearchParams(url.search || url.hash.replace(/^#/, ''));
    const failure = params.get('error_description') ?? params.get('error');
    if (failure) return supabaseError(failure);
    const code = params.get('code');
    if (!code) return supabaseError('No authorization code returned');
    const exchange = await guarded(() => supabase!.auth.exchangeCodeForSession(code));
    if ('thrown' in exchange) return exchange.thrown;
    if (exchange.error || !exchange.data.session) return supabaseError(exchange.error?.message ?? 'Sign-in failed');
    await secure.remove(SESSION_KEY);
    setUser(fromSupabase(exchange.data.session.user));
    return null;
  }, []);

  const resendCode = useCallback(async (email: string) => {
    if (!supabase) return 'errConfig' as const;
    const res = await guarded(() => supabase!.auth.resend({ type: 'signup', email: email.trim().toLowerCase() }));
    if ('thrown' in res) return res.thrown;
    return res.error ? supabaseError(res.error.message) : null;
  }, []);

  /** Apply changes to the signed-in local (no Supabase) account. */
  const updateLocal = useCallback(async (id: string, change: (a: StoredAccount) => Promise<StoredAccount>) => {
    const accounts = await readJSON<StoredAccount[]>(ACCOUNTS_KEY, []);
    const i = accounts.findIndex((a) => a.id === id);
    if (i < 0) return 'errAuthUnknown' as const;
    accounts[i] = await change(accounts[i]);
    await writeJSON(ACCOUNTS_KEY, accounts);
    setUser(toUser(accounts[i]));
    return null;
  }, []);

  const updateProfile = useCallback(
    async ({ name, avatar }: { name?: string; avatar?: string | null }) => {
      if (!user || user.provider === 'guest') return 'errAuthUnknown' as const;
      if (supabase) {
        const data: Record<string, string | null> = {};
        if (name !== undefined) data.name = name.trim();
        // Google and Facebook store their photo as `picture` too, so clear both when removing it.
        if (avatar !== undefined) Object.assign(data, { avatar_url: avatar, picture: avatar });
        const res = await guarded(() => supabase!.auth.updateUser({ data }));
        if ('thrown' in res) return res.thrown;
        if (res.error) return supabaseError(res.error.message);
        setUser(fromSupabase(res.data.user));
        return null;
      }
      return updateLocal(user.id, async (a) => ({
        ...a,
        ...(name !== undefined && { name: name.trim() }),
        ...(avatar !== undefined && { avatar: avatar ?? undefined }),
      }));
    },
    [user, updateLocal],
  );

  const changePassword = useCallback(
    async (password: string) => {
      if (!user || user.provider === 'guest') return 'errAuthUnknown' as const;
      if (supabase) {
        const res = await guarded(() => supabase!.auth.updateUser({ password }));
        if ('thrown' in res) return res.thrown;
        return res.error ? supabaseError(res.error.message) : null;
      }
      const salt = uid();
      const hash = await hashPassword(password, salt);
      return updateLocal(user.id, async (a) => ({ ...a, salt, hash }));
    },
    [user, updateLocal],
  );

  const changeEmail = useCallback(
    async (email: string) => {
      if (!user || user.provider === 'guest') return 'errAuthUnknown' as const;
      const next = email.trim().toLowerCase();
      if (supabase) {
        const res = await guarded(() => supabase!.auth.updateUser({ email: next }));
        if ('thrown' in res) return res.thrown;
        return res.error ? supabaseError(res.error.message) : ('code' as const);
      }
      const accounts = await readJSON<StoredAccount[]>(ACCOUNTS_KEY, []);
      if (accounts.some((a) => a.email === next && a.id !== user.id)) return 'errExists' as const;
      return updateLocal(user.id, async (a) => ({ ...a, email: next }));
    },
    [user, updateLocal],
  );

  const confirmEmailChange = useCallback(async (email: string, code: string) => {
    if (!supabase) return 'errConfig' as const;
    const res = await guarded(() => supabase!.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code, type: 'email_change' }));
    if ('thrown' in res) return res.thrown;
    if (res.error) return supabaseError(res.error.message);
    if (res.data.user) setUser(fromSupabase(res.data.user));
    return null;
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      ready,
      isGuest: user?.provider === 'guest',
      register,
      login,
      continueAsGuest,
      logout,
      resetPassword,
      verifyEmail,
      resendCode,
      signInWithProvider,
      updateProfile,
      changePassword,
      changeEmail,
      confirmEmailChange,
    }),
    [user, ready, register, login, continueAsGuest, logout, resetPassword, verifyEmail, resendCode, signInWithProvider, updateProfile, changePassword, changeEmail, confirmEmailChange],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());
export const validPassword = (p: string) => p.length >= 8 && /[a-zA-Z]/.test(p) && /\d/.test(p);
export function passwordScore(p: string) {
  let s = 0;
  if (p.length >= 8) s++;
  if (p.length >= 12) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return Math.min(s, 4) / 4;
}
