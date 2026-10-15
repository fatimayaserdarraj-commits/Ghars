import { Platform } from 'react-native';

import { Lang } from './translations';

/**
 * Pl@ntNet identification API — free for non-commercial use (500 identifications/day).
 * Get a key at https://my.plantnet.org (sign up → "API key").
 */
const KEY = process.env.EXPO_PUBLIC_PLANTNET_API_KEY;

export const plantnetEnabled = !!KEY;

// Languages Pl@ntNet returns common names in; others fall back to English (care text is localised by the app).
const PLANTNET_LANGS: string[] = ['en'];

export type PlantNetMatch = { scientific: string; genus: string; family: string; commonName?: string; score: number };

type Result = {
  score: number;
  species: {
    scientificNameWithoutAuthor: string;
    genus?: { scientificNameWithoutAuthor: string };
    family?: { scientificNameWithoutAuthor: string };
    commonNames?: string[];
  };
};

export async function identifyWithPlantNet(uri: string, lang: Lang): Promise<PlantNetMatch | null> {
  if (!KEY) return null;
  const form = new FormData();
  if (Platform.OS === 'web') {
    form.append('images', await (await fetch(uri)).blob(), 'plant.jpg');
  } else {
    // React Native's FormData accepts a { uri, name, type } file descriptor.
    form.append('images', { uri, name: 'plant.jpg', type: 'image/jpeg' } as unknown as Blob);
  }
  form.append('organs', 'auto');
  const url = `https://my-api.plantnet.org/v2/identify/all?api-key=${encodeURIComponent(KEY)}&lang=${PLANTNET_LANGS.includes(lang) ? lang : 'en'}&nb-results=3`;
  const res = await fetch(url, { method: 'POST', body: form });
  if (res.status === 404) return null; // no species recognised in the photo
  if (!res.ok) {
    // Pl@ntNet explains the problem in a JSON body ({ message: '...' }).
    const body = await res.text().catch(() => '');
    let msg = body;
    try {
      msg = JSON.parse(body).message ?? body;
    } catch {}
    throw new Error(`Pl@ntNet ${res.status}: ${String(msg).slice(0, 160)}`);
  }
  const top = ((await res.json()).results as Result[] | undefined)?.[0];
  if (!top) return null;
  return {
    scientific: top.species.scientificNameWithoutAuthor,
    genus: top.species.genus?.scientificNameWithoutAuthor ?? '',
    family: top.species.family?.scientificNameWithoutAuthor ?? '',
    commonName: top.species.commonNames?.[0],
    score: top.score,
  };
}
