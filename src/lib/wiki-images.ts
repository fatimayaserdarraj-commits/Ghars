import { useEffect, useState } from 'react';

import { readJSON, writeJSON } from './storage';

/**
 * Real photos for plants and guide steps, taken from the lead image of a Wikipedia article
 * (hosted on Wikimedia Commons under free licences). Looked up once, then remembered.
 */
const CACHE_KEY = 'ghars.wikiImages';
const memory = new Map<string, string | null>();
const pending = new Map<string, Promise<string | null>>();
let loaded: Promise<void> | null = null;

function loadCache() {
  loaded ??= readJSON<Record<string, string | null>>(CACHE_KEY, {}).then((saved) => {
    for (const [k, v] of Object.entries(saved)) if (!memory.has(k)) memory.set(k, v);
  });
  return loaded;
}

function saveCache() {
  writeJSON(CACHE_KEY, Object.fromEntries(memory)).catch(() => {});
}

/** Wikimedia serves these thumbnail widths without resizing on demand. */
const WIDTHS = [330, 500, 960];

/** Ask for a sharper thumbnail than the default 320px one. */
export function sizedThumb(url: string, width: number) {
  const w = WIDTHS.find((x) => x >= width) ?? WIDTHS[WIDTHS.length - 1];
  return url.replace(/\/\d+px-/, `/${w}px-`);
}

async function lookup(title: string): Promise<string | null> {
  await loadCache();
  if (memory.has(title)) return memory.get(title)!;
  let job = pending.get(title);
  if (!job) {
    job = fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`, { headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { thumbnail?: { source?: string } } | null) => {
        const url = j?.thumbnail?.source ?? null;
        memory.set(title, url);
        saveCache();
        return url;
      })
      // Offline or blocked: don't remember the failure, so it is retried next time.
      .catch(() => null)
      .finally(() => pending.delete(title));
    pending.set(title, job);
  }
  return job;
}

/** The photo URL for a Wikipedia article, or null while loading / when there is none. */
export function useWikiImage(title?: string) {
  const [state, setState] = useState<{ title?: string; url: string | null }>({ title, url: title ? (memory.get(title) ?? null) : null });
  useEffect(() => {
    if (!title) return;
    let alive = true;
    lookup(title).then((url) => alive && setState({ title, url }));
    return () => {
      alive = false;
    };
  }, [title]);
  return state.title === title ? state.url : title ? (memory.get(title) ?? null) : null;
}
