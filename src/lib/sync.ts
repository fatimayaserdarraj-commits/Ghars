import { supabase } from './supabase';

/**
 * Multi-device sync through Supabase: one JSON document per user in the `user_data` table
 * (protected by row-level security so each user can only read and write their own row).
 * Newest `updatedAt` wins.
 */
export const syncEnabled = !!supabase;

export type Syncable = { updatedAt: number };

export async function pushUserData<T extends Syncable>(userId: string, data: T) {
  if (!supabase) throw new Error('sync not configured');
  const { error } = await supabase
    .from('user_data')
    .upsert({ user_id: userId, data, updated_at: new Date(data.updatedAt || Date.now()).toISOString() });
  if (error) throw error;
}

export async function pullUserData<T extends Syncable>(userId: string): Promise<T | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('user_data').select('data').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return (data?.data as T) ?? null;
}
