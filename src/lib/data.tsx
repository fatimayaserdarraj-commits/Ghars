import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { plantById } from '@/data/plants';

import { useAuth } from './auth';
import { useI18n } from './i18n';
import { cancelNotification, ensureNotificationPermission, scheduleCareNotification } from './notifications';
import { createComment, createPost, fetchPosts, setLike } from './community';
import { pullUserData, pushUserData, syncEnabled } from './sync';
import { supabase, uploadPhoto } from './supabase';
import { readJSON, removeKey, uid, writeJSON } from './storage';
import { TKey } from './translations';

export type CareTask = 'watering' | 'fertilizing' | 'pruning' | 'misting' | 'harvesting' | 'repotting';
export const CARE_TASKS: { id: CareTask; emoji: string }[] = [
  { id: 'watering', emoji: '💧' },
  { id: 'fertilizing', emoji: '🧪' },
  { id: 'pruning', emoji: '✂️' },
  { id: 'misting', emoji: '🌫️' },
  { id: 'harvesting', emoji: '🧺' },
  { id: 'repotting', emoji: '🪴' },
];

export type GardenPlant = {
  id: string;
  speciesId: string;
  nickname: string;
  location: 'indoor' | 'outdoor' | 'balcony';
  photoUri?: string;
  createdAt: number;
};

export type Reminder = {
  id: string;
  plantId: string;
  task: CareTask;
  intervalDays: number;
  lastDone: number;
  notificationId?: string;
};

export type JournalEntry = {
  id: string;
  plantId: string;
  at: number;
  heightCm?: number;
  note: string;
  photoUri?: string;
};

export type ChatMessage = { id: string; role: 'user' | 'assistant'; text: string; at: number; imageUri?: string };

export type Comment = { id: string; authorId: string; authorName: string; text: string; at: number };
export type PostType = 'question' | 'showcase' | 'tip';
export type Post = {
  id: string;
  authorId: string;
  authorName: string;
  type: PostType;
  text: string;
  imageUri?: string;
  likes: string[];
  comments: Comment[];
  at: number;
};

type UserData = {
  plants: GardenPlant[];
  reminders: Reminder[];
  journal: JournalEntry[];
  chat: ChatMessage[];
  guideProgress: Record<string, number>;
  updatedAt: number;
  lastSynced?: number;
};

const EMPTY: UserData = { plants: [], reminders: [], journal: [], chat: [], guideProgress: {}, updatedAt: 0 };
const POSTS_KEY = 'mps.posts';
const userKey = (id: string) => `mps.user.${id}`;

const DAY = 86_400_000;
export const dueAt = (r: Reminder) => r.lastDone + r.intervalDays * DAY;
export const daysUntil = (r: Reminder) => Math.ceil((dueAt(r) - Date.now()) / DAY);

const now = Date.now();
const SEED_POSTS: Post[] = [
  {
    id: 'seed1',
    authorId: 'seed',
    authorName: 'Maryam A.',
    type: 'showcase',
    text: 'My first tomato harvest of the season from the balcony in Riffa! 🍅 Started from seed in October.',
    likes: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
    comments: [{ id: 'c1', authorId: 'x', authorName: 'Hassan', text: 'Beautiful! Which variety is it?', at: now - 3 * 3600_000 }],
    at: now - 5 * 3600_000,
  },
  {
    id: 'seed2',
    authorId: 'seed',
    authorName: 'Ali K.',
    type: 'question',
    text: 'سؤال: أوراق الليمون عندي صارت صفراء مع عروق خضراء. هل هو نقص حديد؟ 🍋',
    likes: ['a', 'b', 'c'],
    comments: [
      { id: 'c2', authorId: 'y', authorName: 'Noor', text: 'نعم غالبًا نقص حديد بسبب قلوية التربة. جرّب الحديد المخلبي.', at: now - 20 * 3600_000 },
    ],
    at: now - 26 * 3600_000,
  },
  {
    id: 'seed3',
    authorId: 'seed',
    authorName: 'Sara M.',
    type: 'tip',
    text: 'Tip: freeze water in plastic bottles, poke a tiny hole and lay them by your pots in August. Slow, cool drip irrigation for free! 💧',
    likes: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l'],
    comments: [],
    at: now - 3 * 86_400_000,
  },
];

type DataValue = UserData & {
  posts: Post[];
  addPlant: (p: Omit<GardenPlant, 'id' | 'createdAt'>) => GardenPlant;
  removePlant: (id: string) => void;
  addReminder: (plantId: string, task: CareTask, intervalDays: number, plantLabel?: string) => Promise<void>;
  completeReminder: (id: string) => Promise<void>;
  removeReminder: (id: string) => void;
  addJournal: (e: Omit<JournalEntry, 'id' | 'at'>) => void;
  removeJournal: (id: string) => void;
  setChat: (messages: ChatMessage[]) => void;
  setGuideProgress: (guideId: string, step: number) => void;
  addPost: (p: Pick<Post, 'type' | 'text' | 'imageUri'>) => Promise<void>;
  toggleLike: (postId: string) => void;
  addComment: (postId: string, text: string) => Promise<void>;
  refreshPosts: () => Promise<void>;
  syncNow: () => Promise<boolean>;
  wipe: () => Promise<void>;
};

const DataContext = createContext<DataValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { t, l } = useI18n();
  const [data, setData] = useState<UserData>(EMPTY);
  const [posts, setPosts] = useState<Post[]>([]);
  const loadedFor = useRef<string | null>(null);

  const prevUser = useRef<string | null>(null);

  const [reschedule, setReschedule] = useState(false);
  const userId = user?.id;
  const cloud = !!supabase && !!userId && userId !== 'guest';

  // Load per-user data whenever the signed-in user changes.
  useEffect(() => {
    const from = prevUser.current;
    prevUser.current = userId ?? null;
    loadedFor.current = null;
    (async () => {
      if (!userId) return setData(EMPTY);
      let d = await readJSON<UserData>(userKey(userId), EMPTY);
      // A guest who registers keeps what they created while exploring.
      if (from === 'guest' && userId !== 'guest' && !d.updatedAt) {
        const guest = await readJSON<UserData>(userKey('guest'), EMPTY);
        if (guest.updatedAt) {
          d = guest;
          await removeKey(userKey('guest'));
        }
      }
      // Signed in with Supabase: take the cloud copy if another device saved something newer.
      if (supabase && userId !== 'guest') {
        try {
          const remote = await pullUserData<UserData>(userId);
          if (remote && remote.updatedAt > (d.updatedAt ?? 0)) {
            d.reminders?.forEach((r) => cancelNotification(r.notificationId));
            // Notification ids belong to the device that scheduled them.
            d = { ...remote, reminders: (remote.reminders ?? []).map((r) => ({ ...r, notificationId: undefined })) };
            setReschedule(true);
          }
          d = { ...d, lastSynced: Date.now() };
        } catch {
          // offline — keep the local copy and sync later
        }
      }
      setData({ ...EMPTY, ...d });
      loadedFor.current = userId;
    })();
  }, [userId]);

  const refreshPosts = useCallback(async () => {
    if (!supabase) return;
    try {
      setPosts(await fetchPosts());
    } catch {
      // keep what we have
    }
  }, []);

  useEffect(() => {
    if (supabase) fetchPosts().then(setPosts, () => {});
    else readJSON<Post[] | null>(POSTS_KEY, null).then((p) => setPosts(p ?? SEED_POSTS));
  }, []);

  // Persist on change (only after the user's data has been loaded, to avoid clobbering).
  useEffect(() => {
    if (!userId || loadedFor.current !== userId) return;
    writeJSON(userKey(userId), data);
    if (!cloud || !data.updatedAt) return;
    // Push to the cloud shortly after the last change.
    const id = setTimeout(() => {
      pushUserData(userId, data).catch(() => {});
    }, 1500);
    return () => clearTimeout(id);
  }, [data, userId, cloud]);

  const update = useCallback((fn: (d: UserData) => UserData) => {
    setData((d) => ({ ...fn(d), updatedAt: Date.now() }));
  }, []);

  const savePosts = useCallback((fn: (p: Post[]) => Post[]) => {
    setPosts((p) => {
      const next = fn(p);
      writeJSON(POSTS_KEY, next);
      return next;
    });
  }, []);

  const plantName = useCallback(
    (plantId: string) => {
      const p = data.plants.find((x) => x.id === plantId);
      const species = p && plantById(p.speciesId);
      return p?.nickname || (species ? l(species.name) : '');
    },
    [data.plants, l],
  );

  const schedule = useCallback(
    async (r: Reminder, label?: string) => {
      const ok = await ensureNotificationPermission();
      if (!ok) return undefined;
      return scheduleCareNotification(
        `${t('appName')} 🌿`,
        t('reminderBody', { task: t(r.task as TKey), plant: label ?? plantName(r.plantId) }),
        new Date(dueAt(r)),
      );
    },
    [t, plantName],
  );

  // Reminders that arrived from another device get scheduled on this one.
  useEffect(() => {
    if (!reschedule) return;
    (async () => {
      setReschedule(false);
      const ids = new Map<string, string | undefined>();
      for (const r of data.reminders) ids.set(r.id, await schedule(r));
      setData((d) => ({ ...d, reminders: d.reminders.map((r) => (ids.has(r.id) ? { ...r, notificationId: ids.get(r.id) } : r)) }));
    })();
  }, [reschedule, data.reminders, schedule]);

  // Upload a local photo in the background and swap in its cloud URL.
  const syncPhoto = useCallback(
    (uri: string | undefined, apply: (url: string) => void) => {
      if (!cloud || !uri || !userId) return;
      uploadPhoto(uri, userId)
        .then((url) => url && url !== uri && apply(url))
        .catch(() => {});
    },
    [cloud, userId],
  );

  const value = useMemo<DataValue>(
    () => ({
      ...data,
      posts,
      addPlant: (p) => {
        const plant: GardenPlant = { ...p, id: uid(), createdAt: Date.now() };
        update((d) => ({ ...d, plants: [plant, ...d.plants] }));
        syncPhoto(plant.photoUri, (url) => update((d) => ({ ...d, plants: d.plants.map((x) => (x.id === plant.id ? { ...x, photoUri: url } : x)) })));
        return plant;
      },
      removePlant: (id) => {
        data.reminders.filter((r) => r.plantId === id).forEach((r) => cancelNotification(r.notificationId));
        update((d) => ({
          ...d,
          plants: d.plants.filter((p) => p.id !== id),
          reminders: d.reminders.filter((r) => r.plantId !== id),
          journal: d.journal.filter((j) => j.plantId !== id),
        }));
      },
      addReminder: async (plantId, task, intervalDays, plantLabel) => {
        const r: Reminder = { id: uid(), plantId, task, intervalDays, lastDone: Date.now() };
        r.notificationId = await schedule(r, plantLabel);
        update((d) => ({ ...d, reminders: [...d.reminders, r] }));
      },
      completeReminder: async (id) => {
        const r = data.reminders.find((x) => x.id === id);
        if (!r) return;
        await cancelNotification(r.notificationId);
        const next: Reminder = { ...r, lastDone: Date.now() };
        next.notificationId = await schedule(next);
        update((d) => ({ ...d, reminders: d.reminders.map((x) => (x.id === id ? next : x)) }));
      },
      removeReminder: (id) => {
        cancelNotification(data.reminders.find((x) => x.id === id)?.notificationId);
        update((d) => ({ ...d, reminders: d.reminders.filter((r) => r.id !== id) }));
      },
      addJournal: (e) => {
        const entry: JournalEntry = { ...e, id: uid(), at: Date.now() };
        update((d) => ({ ...d, journal: [entry, ...d.journal] }));
        syncPhoto(entry.photoUri, (url) => update((d) => ({ ...d, journal: d.journal.map((x) => (x.id === entry.id ? { ...x, photoUri: url } : x)) })));
      },
      removeJournal: (id) => update((d) => ({ ...d, journal: d.journal.filter((j) => j.id !== id) })),
      setChat: (chat) => update((d) => ({ ...d, chat })),
      setGuideProgress: (guideId, step) =>
        update((d) => ({ ...d, guideProgress: { ...d.guideProgress, [guideId]: Math.max(step, d.guideProgress[guideId] ?? 0) } })),
      refreshPosts,
      addPost: async (p) => {
        if (!user) return;
        if (cloud) {
          const imageUrl = await uploadPhoto(p.imageUri, user.id);
          await createPost({ authorId: user.id, authorName: user.name || t('guest'), type: p.type, text: p.text, imageUrl });
          return refreshPosts();
        }
        savePosts((list) => [
          { ...p, id: uid(), authorId: user.id, authorName: user.name || t('guest'), likes: [], comments: [], at: Date.now() },
          ...list,
        ]);
      },
      toggleLike: (postId) => {
        if (!user) return;
        if (cloud) {
          const liked = !posts.find((p) => p.id === postId)?.likes.includes(user.id);
          // Optimistic update, then confirm with the server.
          setPosts((list) => list.map((p) => (p.id !== postId ? p : { ...p, likes: liked ? [...p.likes, user.id] : p.likes.filter((x) => x !== user.id) })));
          setLike(postId, user.id, liked).catch(refreshPosts);
          return;
        }
        savePosts((list) =>
          list.map((p) =>
            p.id !== postId ? p : { ...p, likes: p.likes.includes(user.id) ? p.likes.filter((x) => x !== user.id) : [...p.likes, user.id] },
          ),
        );
      },
      addComment: async (postId, text) => {
        if (!user) return;
        if (cloud) {
          await createComment(postId, user.id, user.name || t('guest'), text);
          return refreshPosts();
        }
        savePosts((list) =>
          list.map((p) =>
            p.id !== postId
              ? p
              : { ...p, comments: [...p.comments, { id: uid(), authorId: user.id, authorName: user.name || t('guest'), text, at: Date.now() }] },
          ),
        );
      },
      syncNow: async () => {
        if (!user || !syncEnabled || !cloud) return false;
        const remote = await pullUserData<UserData>(user.id);
        const merged = remote && remote.updatedAt > data.updatedAt ? remote : data;
        await pushUserData(user.id, merged);
        setData({ ...merged, lastSynced: Date.now() });
        return true;
      },
      wipe: async () => {
        if (!user) return;
        data.reminders.forEach((r) => cancelNotification(r.notificationId));
        await removeKey(userKey(user.id));
        if (cloud) await supabase!.from('user_data').delete().eq('user_id', user.id);
        setData(EMPTY);
      },
    }),
    [data, posts, update, savePosts, schedule, user, t, cloud, refreshPosts, syncPhoto],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}
