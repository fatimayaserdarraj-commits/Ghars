import * as Crypto from 'expo-crypto';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { readJSON, secure, uid, writeJSON } from './storage';
import { supabase } from './supabase';

export type User = {
  id: string;
  name: string;
  email: string;
  createdAt: number;
  provider: 'email' | 'guest';
};

type StoredAccount = User & { salt: string; hash: string };

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
  /** Send a fresh sign-up code. */
  resendCode: (email: string) => Promise<AuthError | null>;
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

type SupabaseUser = { id: string; email?: string; created_at: string; user_metadata?: { name?: string } };
const fromSupabase = (u: SupabaseUser): User => ({
  id: u.id,
  name: u.user_metadata?.name ?? u.email?.split('@')[0] ?? '',
  email: u.email ?? '',
  createdAt: Date.parse(u.created_at),
  provider: 'email',
});

let lastDetail = '';
/** The raw message from the last failed Supabase auth call, shown under the friendly error. */
export const authErrorDetail = () => lastDetail;

function supabaseError(message: string): AuthError {
  lastDetail = message;
  const m = message.toLowerCase();
  if (m.includes('already registered') || m.includes('already exists')) return 'errExists';
  if (m.includes('not confirmed')) return 'errConfirmEmail';
  if (m.includes('invalid login') || m.includes('invalid credentials')) return 'errCredentials';
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

  const resendCode = useCallback(async (email: string) => {
    if (!supabase) return 'errConfig' as const;
    const res = await guarded(() => supabase!.auth.resend({ type: 'signup', email: email.trim().toLowerCase() }));
    if ('thrown' in res) return res.thrown;
    return res.error ? supabaseError(res.error.message) : null;
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ user, ready, isGuest: user?.provider === 'guest', register, login, continueAsGuest, logout, resetPassword, verifyEmail, resendCode }),
    [user, ready, register, login, continueAsGuest, logout, resetPassword, verifyEmail, resendCode],
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
