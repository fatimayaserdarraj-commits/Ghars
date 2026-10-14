import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

// Accept common copy-paste variants: trailing slashes, quotes, or the REST endpoint (".../rest/v1/").
const URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim()
  .replace(/^["']|["']$/g, '')
  .replace(/\/(rest|auth)\/v1\/?$/, '')
  .replace(/\/+$/, '');
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** True when the app is connected to a Supabase project (see README → "Connect Supabase"). */
export const supabaseEnabled = !!(URL && ANON_KEY);

export const supabase: SupabaseClient | null = supabaseEnabled
  ? createClient(URL!, ANON_KEY!, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

export const supabaseAnonKey = ANON_KEY;

// Only refresh the session while the app is in the foreground.
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

/** Upload a local photo to the public `photos` bucket and return its URL. Returns the input if Supabase is off. */
export async function uploadPhoto(uri: string | undefined, userId: string): Promise<string | undefined> {
  if (!uri || !supabase || /^https?:\/\//.test(uri)) return uri;
  const body = await (await fetch(uri)).arrayBuffer();
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supabase.storage.from('photos').upload(path, body, { contentType: 'image/jpeg' });
  if (error) throw error;
  return supabase.storage.from('photos').getPublicUrl(path).data.publicUrl;
}
