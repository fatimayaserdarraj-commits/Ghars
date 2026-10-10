# MPS Garden 🌿

A React Native + Expo (SDK 57) gardening companion with an animated, glass-style dark UI, full
**English / Arabic (RTL)** support, and AI plant care tuned for Bahrain and the Gulf climate.

## Features

| Feature | What it does | Where |
| --- | --- | --- |
| **Registration & login** | Email accounts with salted and stretched SHA-256 password hashes, session token in the encrypted Secure Store, a lockout after 5 failed logins, and a password-strength meter. You can **explore as a guest** first; anything you create is moved into your account when you register. Google / Apple / Facebook buttons are in place and need OAuth client IDs (see below). Cloud sync across devices through Supabase. | `src/lib/auth.tsx`, `src/lib/supabase.ts`, `src/lib/sync.ts` |
| **Multilingual** | English and Arabic with full right-to-left layout. Switch any time from the toggle or Settings. The first language follows the device language. | `src/lib/i18n.tsx`, `src/lib/translations.ts` |
| **Plant identifier** | Take a photo or pick one from the gallery. You get the common and scientific name, family, a confidence ring and a 6-part care guide, then **Add to my garden**, which also creates reminders. | `src/app/(tabs)/scan.tsx` |
| **AI diagnosis & assistant** | Photo and symptom diagnosis of **pests, diseases and nutrient deficiencies**, with severity, causes, treatment steps and prevention. A chat assistant knows your garden and the current season. | `src/lib/ai.ts`, `src/app/(tabs)/assistant.tsx` |
| **Guides & tutorials** | Step-by-step lessons (watering, planting, pruning, Gulf soil, natural pest control) with visuals, quick-check quizzes, saved progress and a completion screen. | `src/app/guides/*`, `src/data/guides.ts` |
| **Local shops directory** | Nurseries, markets, equipment suppliers and experts in Bahrain, with search, filters, distance sorting, and call / WhatsApp / directions buttons. | `src/app/shops.tsx`, `src/data/shops.ts` |
| **Reminders & growth tracking** | Care reminders per plant (watering, fertilising, pruning, misting, harvesting, repotting) sent as local notifications. A growth journal holds height, notes and photos, with an animated growth chart. | `src/app/(tabs)/garden.tsx`, `src/app/plant/[id].tsx`, `src/lib/notifications.ts` |
| **Season-based recommendations** | Gulf seasons (winter / spring / summer / autumn) with climate, care tips, and plants grouped as **cool-season, warm-season or perennial**. | `src/app/seasons.tsx`, `src/data/seasons.ts` |
| **Community forum** | Questions, showcases and tips with photos, likes and comments. | `src/app/(tabs)/community.tsx`, `src/app/post/[id].tsx` |

**Animation & design:** Reanimated 4 handles the floating leaves, the breathing logo, drifting background orbs,
staggered entrances, a springy sliding tab bar and segmented controls, press-scale and haptics, the scanner laser
and pulse rings, the typing indicator, animated progress and confidence meters, the growth-chart bars, quiz shake
feedback and the lesson-complete burst.

## Run it

```bash
npm install
npx expo start        # then scan the QR code with Expo Go, or press a / i / w
```

Checks: `npx tsc --noEmit` and `npx expo lint`.

## Connect Supabase (backend)

Supabase gives the app real accounts, sync across devices, a shared community feed and photo storage.
The free tier is enough.

1. **Create the tables.** In the Supabase dashboard, open **SQL Editor → New query**, paste all of
   [`supabase/schema.sql`](supabase/schema.sql) and press **Run**. This creates `user_data`, `posts`, `comments`,
   `post_likes` and a `photos` storage bucket, with row-level security so users can only change their own data.
2. **Copy your keys.** Open **Project Settings → API** (or the **Connect** button). Copy the **Project URL** and the
   **anon / publishable** key. Never put the `service_role` / secret key in the app.
3. **Create `.env`** in the project folder (copy `.env.example`):
   ```bash
   EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-OR-PUBLISHABLE-KEY
   ```
4. **Email confirmation.** Supabase asks new users to confirm their email by default. The app tells them to check
   their inbox. For quick testing you can turn this off under **Authentication → Sign In / Providers → Email →
   Confirm email**.
5. **Restart the app** with `npx expo start -c` (`-c` clears the cache so the new `.env` is picked up).

### Optional: real AI through Supabase (keeps your Anthropic key secret)

```bash
npx supabase login
npx supabase link --project-ref YOUR-PROJECT-REF
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
npx supabase functions deploy ai
```

Then set `EXPO_PUBLIC_SUPABASE_AI=true` in `.env`. Signed-in users get Claude-powered identification, diagnosis and
chat. Guests, or anyone offline, get the built-in knowledge base. You can also create the function in the dashboard
(**Edge Functions → Deploy a new function → Via editor**, name it `ai`, paste
[`supabase/functions/ai/index.ts`](supabase/functions/ai/index.ts)) and add the secret under **Edge Functions →
Secrets**.

### Without Supabase

The app still works fully offline on one device. For quick AI testing only, you can set
`EXPO_PUBLIC_ANTHROPIC_API_KEY`. A key built into an app can be extracted, so don't ship it.

## Notes

- **Social sign-in:** Supabase supports Google, Apple and Facebook under **Authentication → Sign In / Providers**.
  Each one needs OAuth client IDs from that provider. Until they're set up, the buttons show a configuration notice.

- Without Supabase, accounts, plants, journal and chats are stored on the device only. With Supabase, they are also saved to
  your project and follow the user to any phone or tablet.
- The shop directory in `src/data/shops.ts` is **sample data**: names and phone numbers are placeholders. Replace it with
  verified listings before release.
- Expo Go supports local notifications. Remote push needs a development build.
