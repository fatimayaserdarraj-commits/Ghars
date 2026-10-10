import { IssueCategory, matchDiagnosis } from '@/data/diagnoses';
import { PLANTS, PlantInfo } from '@/data/plants';
import { currentSeason } from '@/data/seasons';

import type { ChatMessage } from './data';
import { identifyWithPlantNet, plantnetEnabled } from './plantnet';
import { supabase, supabaseAnonKey } from './supabase';
import { Lang } from './translations';

/**
 * AI layer. Providers, in order of preference:
 *  - Pl@ntNet (free) for photo identification — EXPO_PUBLIC_PLANTNET_API_KEY
 *  - Google Gemini (free tier) for diagnosis, chat and care sheets — EXPO_PUBLIC_GEMINI_API_KEY
 *  - Claude, directly (EXPO_PUBLIC_ANTHROPIC_API_KEY) or through the Supabase `ai` Edge Function
 * With none configured, or when a request fails, the on-device knowledge base is used.
 *
 * NOTE: a key bundled into a client app can be extracted. Free-tier keys have no billing attached,
 * so the risk is someone using up your daily quota, not your money.
 */
const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_MODEL = process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-2.5-flash';
const API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
// With Supabase connected, the `ai` Edge Function (supabase/functions/ai) is used by default.
const PROXY_URL =
  process.env.EXPO_PUBLIC_AI_PROXY_URL ||
  (process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_AI === 'true'
    ? `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ai`
    : undefined);
const MODEL = process.env.EXPO_PUBLIC_ANTHROPIC_MODEL || 'claude-sonnet-5-5';

/** A language model is configured (diagnosis + chat). */
export const aiOnline = !!(GEMINI_KEY || API_KEY || PROXY_URL);
/** Display name of the language model in use, for status badges. */
export const aiProvider = GEMINI_KEY ? 'Gemini' : API_KEY || PROXY_URL ? 'Claude' : null;
/** Photo identification can use a real service. */
export const identifyOnline = aiOnline || plantnetEnabled;

export type CareSheet = Record<'water' | 'light' | 'soil' | 'temperature' | 'fertilizer' | 'humidity', string>;

export type Identification = {
  matchId: string | null;
  emoji: string;
  name: string;
  scientific: string;
  family: string;
  description: string;
  confidence: number;
  care: CareSheet;
  demo: boolean;
};

export type DiagnosisResult = {
  category: IssueCategory;
  emoji: string;
  name: string;
  severity: number;
  confidence: number;
  causes: string;
  treatment: string[];
  prevention: string[];
  demo: boolean;
};

type Block =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } };

type Msg = { role: 'user' | 'assistant'; content: string | Block[] };

/** Send a prompt to whichever language model is configured and return its text reply. */
function callClaude(system: string, messages: Msg[], maxTokens = 1024) {
  return GEMINI_KEY ? callGemini(system, messages, maxTokens) : callAnthropic(system, messages, maxTokens);
}

async function callGemini(system: string, messages: Msg[], maxTokens: number) {
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts:
      typeof m.content === 'string'
        ? [{ text: m.content }]
        : m.content.map((b) => (b.type === 'text' ? { text: b.text } : { inline_data: { mime_type: b.source.media_type, data: b.source.data } })),
  }));
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': GEMINI_KEY! },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents,
      // Generous limit: "thinking" models spend part of the budget before answering.
      generationConfig: { maxOutputTokens: Math.max(maxTokens * 4, 4096), temperature: 0.4 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini request failed (${res.status})`);
  const json = await res.json();
  const parts = (json.candidates?.[0]?.content?.parts ?? []) as { text?: string }[];
  const text = parts.map((p) => p.text ?? '').join('');
  if (!text) throw new Error('Gemini returned no text');
  return text;
}

async function callAnthropic(system: string, messages: Msg[], maxTokens: number) {
  const url = PROXY_URL || 'https://api.anthropic.com/v1/messages';
  const headers: Record<string, string> = { 'content-type': 'application/json', 'anthropic-version': '2023-06-01' };
  if (PROXY_URL && supabase) {
    // The Edge Function only serves signed-in users; guests fall back to the offline knowledge base.
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw new Error('sign-in required for AI');
    headers.Authorization = `Bearer ${data.session.access_token}`;
    if (supabaseAnonKey) headers.apikey = supabaseAnonKey;
  } else if (!PROXY_URL && API_KEY) {
    headers['x-api-key'] = API_KEY;
    headers['anthropic-dangerous-direct-browser-access'] = 'true';
  }
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages }),
  });
  if (!res.ok) throw new Error(`AI request failed (${res.status})`);
  const json = await res.json();
  return (json.content as { type: string; text?: string }[])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');
}

function parseJSON<T>(text: string): T {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  return JSON.parse(text.slice(start, end + 1)) as T;
}

const langName = (lang: Lang) => (lang === 'ar' ? 'Arabic' : 'English');

function careFromPlant(p: PlantInfo, lang: Lang): CareSheet {
  const c = p.care;
  return {
    water: c.water[lang],
    light: c.light[lang],
    soil: c.soil[lang],
    temperature: c.temperature[lang],
    fertilizer: c.fertilizer[lang],
    humidity: c.humidity[lang],
  };
}

function fromPlant(p: PlantInfo, lang: Lang, confidence: number, demo: boolean): Identification {
  return {
    matchId: p.id,
    emoji: p.emoji,
    name: p.name[lang],
    scientific: p.scientific,
    family: p.family,
    description: p.description[lang],
    confidence,
    care: careFromPlant(p, lang),
    demo,
  };
}

const imageBlock = (base64: string, mime = 'image/jpeg'): Block => ({
  type: 'image',
  source: { type: 'base64', media_type: mime, data: base64 },
});

const GENERIC_CARE: Record<keyof CareSheet, Record<Lang, string>> = {
  water: { en: 'Water when the top 2–3 cm of soil is dry; never leave it standing in water.', ar: 'اسقِ عندما يجف أعلى 2–3 سم من التربة؛ ولا تتركها في الماء.' },
  light: { en: 'Bright light; shade from harsh afternoon sun in summer.', ar: 'إضاءة ساطعة؛ مع حماية من شمس الظهيرة الحارقة صيفًا.' },
  soil: { en: 'Well-drained potting mix enriched with compost.', ar: 'خلطة جيدة الصرف مدعّمة بالسماد العضوي.' },
  temperature: { en: 'Most plants prefer 18–32 °C; protect from extreme heat.', ar: 'تفضّل معظم النباتات 18–32 °م؛ احمِها من الحرارة الشديدة.' },
  fertilizer: { en: 'Balanced fertilizer monthly during active growth.', ar: 'سماد متوازن شهريًا خلال فترة النمو.' },
  humidity: { en: 'Moderate; mist or group plants in air-conditioned rooms.', ar: 'معتدلة؛ رشّ الرذاذ أو اجمع النباتات في الغرف المكيّفة.' },
};

const genericCare = (lang: Lang) =>
  Object.fromEntries(Object.entries(GENERIC_CARE).map(([k, v]) => [k, v[lang]])) as CareSheet;

/** Identify with Pl@ntNet, then fill in care details from the local database or the language model. */
async function identifyViaPlantNet(uri: string, lang: Lang): Promise<Identification | null> {
  const match = await identifyWithPlantNet(uri, lang);
  if (!match) return null;
  const sci = match.scientific.toLowerCase();
  const local = PLANTS.find((p) => p.scientific.toLowerCase().startsWith(sci) || sci.startsWith(p.scientific.toLowerCase()));
  if (local) return { ...fromPlant(local, lang, match.score, false), scientific: match.scientific };

  const base: Identification = {
    matchId: null,
    emoji: '🌿',
    name: match.commonName || match.scientific,
    scientific: match.scientific,
    family: match.family,
    description: '',
    confidence: match.score,
    care: genericCare(lang),
    demo: false,
  };
  if (!aiOnline) return base;
  try {
    const text = await callClaude(
      `You are an expert gardener in the Arabian Gulf. Reply ONLY with JSON: {"emoji": string, "common_name": string, ` +
        `"description": string (2 sentences), "care": {"water","light","soil","temperature","fertilizer","humidity"}} ` +
        `(each one practical sentence for a hot, dry climate). Write all text values in ${langName(lang)}.`,
      [{ role: 'user', content: `Plant: ${match.scientific} (family ${match.family}).` }],
    );
    const r = parseJSON<{ emoji: string; common_name: string; description: string; care: CareSheet }>(text);
    return { ...base, emoji: r.emoji || base.emoji, name: r.common_name || base.name, description: r.description, care: { ...base.care, ...r.care } };
  } catch {
    return base;
  }
}

/** Why a photo could not be identified. `offline` = no recognition service is configured. */
export class IdentifyError extends Error {
  constructor(public reason: 'offline' | 'notFound' | 'failed') {
    super(`identification ${reason}`);
  }
}

/** Care details for a plant the user picked themselves from the built-in list. */
export function manualIdentification(plantId: string, lang: Lang): Identification | null {
  const p = PLANTS.find((x) => x.id === plantId);
  return p ? fromPlant(p, lang, 1, true) : null;
}

/** Identify a photo with the configured services. Never guesses: throws IdentifyError when it can't tell. */
export async function identifyPlant(base64: string | undefined, uri: string, lang: Lang): Promise<Identification> {
  let tried = false;
  let notFound = false;
  if (plantnetEnabled) {
    tried = true;
    try {
      const r = await identifyViaPlantNet(uri, lang);
      if (r) return r;
      notFound = true;
    } catch {
      // fall through to the next provider
    }
  }
  if (aiOnline && base64) {
    tried = true;
    try {
      const ids = PLANTS.map((p) => p.id).join(', ');
      const text = await callClaude(
        `You are an expert botanist for a gardening app used in the Arabian Gulf. Identify the plant in the photo. ` +
          `Reply ONLY with JSON: {"match_id": one of [${ids}] or null, "emoji": string, "common_name": string, "scientific_name": string, ` +
          `"family": string, "confidence": number 0-1, "description": string (2 sentences), "care": {"water","light","soil","temperature","fertilizer","humidity"} ` +
          `(each one practical sentence adapted to a hot, dry climate)}. Identify what is actually in the photo — never default to a plant from the list. ` +
          `If there is no plant in the photo, reply {"no_plant": true}. Write all text values in ${langName(lang)}.`,
        [{ role: 'user', content: [imageBlock(base64), { type: 'text', text: 'Identify this plant.' }] }],
      );
      const r = parseJSON<{
        no_plant?: boolean;
        match_id: string | null;
        emoji: string;
        common_name: string;
        scientific_name: string;
        family: string;
        confidence: number;
        description: string;
        care: CareSheet;
      }>(text);
      if (r.no_plant) {
        notFound = true;
        throw new Error('no plant');
      }
      return {
        matchId: PLANTS.some((p) => p.id === r.match_id) ? r.match_id : null,
        emoji: r.emoji || '🌿',
        name: r.common_name,
        scientific: r.scientific_name,
        family: r.family,
        description: r.description,
        confidence: r.confidence,
        care: r.care,
        demo: false,
      };
    } catch {
      // AI unreachable (offline, signed out or quota) — use the on-device knowledge base.
    }
  }
  throw new IdentifyError(!tried ? 'offline' : notFound ? 'notFound' : 'failed');
}

export async function diagnosePlant(base64: string | undefined, symptoms: string, lang: Lang): Promise<DiagnosisResult> {
  if (aiOnline && (base64 || symptoms.trim())) {
    try {
      const content: Block[] = [];
      if (base64) content.push(imageBlock(base64));
      content.push({ type: 'text', text: `Symptoms reported by the user: ${symptoms || 'none given'}` });
      const text = await callClaude(
        `You are a plant pathologist for a gardening app in the Arabian Gulf. Diagnose plant health from the photo and symptoms. ` +
          `Consider pests, diseases and nutritional deficiencies (and heat/salt stress). Reply ONLY with JSON: ` +
          `{"category": "pest"|"disease"|"nutrient"|"healthy", "emoji": string, "name": string, "severity": number 0-1, "confidence": number 0-1, ` +
          `"causes": string, "treatment": string[] (3 steps), "prevention": string[] (2-3 tips)}. Write all text values in ${langName(lang)}.`,
        [{ role: 'user', content }],
      );
      const r = parseJSON<Omit<DiagnosisResult, 'demo'>>(text);
      return { ...r, demo: false };
    } catch {
      // AI unreachable (offline, signed out or quota) — use the on-device knowledge base.
    }
  }
  await new Promise((r) => setTimeout(r, 1800));
  const { diagnosis: d, confidence } = matchDiagnosis(symptoms);
  return {
    category: d.category,
    emoji: d.emoji,
    name: d.name[lang],
    severity: d.severity,
    confidence,
    causes: d.causes[lang],
    treatment: d.treatment.map((x) => x[lang]),
    prevention: d.prevention.map((x) => x[lang]),
    demo: true,
  };
}

export async function chatReply(history: ChatMessage[], gardenSummary: string, lang: Lang): Promise<string> {
  const season = currentSeason();
  if (aiOnline) {
    try {
      const system =
        `You are the MPS Garden assistant: a warm, expert gardener helping users in Bahrain and the Gulf. ` +
        `Current season: ${season.id} (${season.climate.en}). The user's garden: ${gardenSummary || 'no plants yet'}. ` +
        `Give personalised, practical, concise advice (short paragraphs or bullet points). Cover pests, diseases and nutrient issues when relevant, ` +
        `with treatment and prevention. Reply in ${langName(lang)} unless the user writes in another language.`;
      const messages = history.slice(-16).map((m) => ({ role: m.role, content: m.text }));
      return await callClaude(system, messages, 800);
    } catch {
      // AI unreachable (offline, signed out or quota) — use the on-device knowledge base.
    }
  }
  await new Promise((r) => setTimeout(r, 900));
  return offlineReply(history[history.length - 1]?.text ?? '', lang);
}

/** Rule-based fallback assistant built on the local knowledge base. */
function offlineReply(question: string, lang: Lang): string {
  const q = question.toLowerCase();
  const season = currentSeason();

  if (/(plant|grow|sow|month|season|ازرع|أزرع|زراعة|موسم|شهر)/.test(q)) {
    const picks = PLANTS.filter((p) => p.plantIn.includes(season.id)).slice(0, 6);
    const head =
      lang === 'ar'
        ? `نحن الآن في ${season.months.ar} (${season.climate.ar}). أنصحك بزراعة:`
        : `It's ${season.months.en} now (${season.climate.en}). Great picks to plant:`;
    return `${head}\n${picks.map((p) => `• ${p.emoji} ${p.name[lang]}`).join('\n')}\n\n${season.tips[0][lang]}`;
  }

  const plant = PLANTS.find((p) => p.tags.some((t) => q.includes(t.toLowerCase())));
  if (plant && !/(yellow|spot|bug|pest|أصفر|اصفرار|بقع|حشر|آف)/.test(q)) {
    const c = plant.care;
    return lang === 'ar'
      ? `${plant.emoji} ${plant.name.ar}\n• الري: ${c.water.ar}\n• الإضاءة: ${c.light.ar}\n• التربة: ${c.soil.ar}\n• التسميد: ${c.fertilizer.ar}`
      : `${plant.emoji} ${plant.name.en}\n• Water: ${c.water.en}\n• Light: ${c.light.en}\n• Soil: ${c.soil.en}\n• Feeding: ${c.fertilizer.en}`;
  }

  const { diagnosis: d } = matchDiagnosis(q);
  if (d.id !== 'healthy') {
    const label = lang === 'ar' ? ['قد تكون المشكلة', 'العلاج', 'الوقاية'] : ['This sounds like', 'Treatment', 'Prevention'];
    return `${d.emoji} ${label[0]}: ${d.name[lang]}\n${d.causes[lang]}\n\n${label[1]}:\n${d.treatment
      .map((x) => `• ${x[lang]}`)
      .join('\n')}\n\n${label[2]}:\n${d.prevention.map((x) => `• ${x[lang]}`).join('\n')}`;
  }

  return lang === 'ar'
    ? `سؤال رائع! لأعطيك نصيحة دقيقة، أخبرني باسم النبتة والأعراض (مثل لون الأوراق أو وجود بقع أو حشرات)، أو استخدم الماسح لتشخيص الصورة. 🌿\n\nنصيحة الموسم: ${season.tips[1].ar}`
    : `Great question! To give precise advice, tell me the plant and the symptoms (leaf colour, spots, insects…) or use the scanner to diagnose a photo. 🌿\n\nSeasonal tip: ${season.tips[1].en}`;
}

