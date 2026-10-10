import { Platform } from 'react-native';

import { Lang } from './translations';

/**
 * Pl@ntNet identification API — free for non-commercial use (500 identifications/day).
 * Get a key at https://my.plantnet.org (sign up → "API key").
 */
const KEY = process.env.EXPO_PUBLIC_PLANTNET_API_KEY;

export const plantnetEnabled = !!KEY;

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
  const url = `https://my-api.plantnet.org/v2/identify/all?api-key=${encodeURIComponent(KEY)}&lang=${lang}&nb-results=3`;
  const res = await fetch(url, { method: 'POST', body: form });
  if (res.status === 404) return null; // no species recognised in the photo
  if (!res.ok) throw new Error(`Pl@ntNet request failed (${res.status})`);
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
