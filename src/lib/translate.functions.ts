import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  texts: z.array(z.string().min(1).max(2000)).min(1).max(80),
  target: z.string().min(2).max(10),
  source: z.string().min(2).max(10).optional().default("en"),
});

// Simple in-memory LRU per worker instance.
const CACHE_MAX = 5000;
const cache = new Map<string, string>();
function cacheGet(key: string) {
  const v = cache.get(key);
  if (v !== undefined) {
    cache.delete(key);
    cache.set(key, v);
  }
  return v;
}
function cacheSet(key: string, value: string) {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, value);
  if (cache.size > CACHE_MAX) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
}

const LANG_NAMES: Record<string, string> = {
  en: "English", es: "Spanish", fr: "French", de: "German", pt: "Portuguese",
  it: "Italian", nl: "Dutch", ru: "Russian", zh: "Simplified Chinese",
  ja: "Japanese", ko: "Korean", ar: "Arabic", hi: "Hindi", bn: "Bengali",
  ur: "Urdu", tr: "Turkish", id: "Indonesian", ms: "Malay", vi: "Vietnamese",
  th: "Thai", sw: "Swahili", ha: "Hausa", yo: "Yoruba", am: "Amharic", fa: "Persian",
};

export const translateBatch = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const { texts, target, source } = data;
    if (target === source) {
      return { translations: texts };
    }

    // Resolve from cache first.
    const out: (string | null)[] = texts.map((t) => {
      const k = `${target}|${t}`;
      const hit = cacheGet(k);
      return hit !== undefined ? hit : null;
    });
    const missingIdx: number[] = [];
    const missing: string[] = [];
    out.forEach((v, i) => {
      if (v === null) {
        missingIdx.push(i);
        missing.push(texts[i]);
      }
    });

    if (missing.length === 0) {
      return { translations: out as string[] };
    }

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      // Fallback: return originals so UI doesn't break.
      missingIdx.forEach((i, k) => (out[i] = missing[k]));
      return { translations: out as string[] };
    }

    const targetName = LANG_NAMES[target] ?? target;
    const sourceName = LANG_NAMES[source] ?? source;

    const tools = [
      {
        type: "function",
        function: {
          name: "return_translations",
          description: "Return the translated array, same length and order as input.",
          parameters: {
            type: "object",
            properties: {
              translations: {
                type: "array",
                items: { type: "string" },
                description: "Translated strings in the same order as the input.",
              },
            },
            required: ["translations"],
            additionalProperties: false,
          },
        },
      },
    ];

    const systemPrompt =
      `You are a professional UI translator. Translate the JSON array of UI strings from ${sourceName} to ${targetName}. ` +
      `Preserve the order and array length exactly. Preserve placeholders like {name}, %s, $1, HTML entities, emojis, line breaks, leading/trailing whitespace, punctuation. ` +
      `Do NOT translate brand names, product names, proper nouns, currency codes (USD, EUR, NGN), country codes, URLs, email addresses, numbers, or code-like tokens. ` +
      `Return natural, idiomatic ${targetName}. If a string is already in ${targetName} or is untranslatable (e.g. just a number), return it unchanged.`;

    const userPrompt = JSON.stringify(missing);

    try {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          tools,
          tool_choice: { type: "function", function: { name: "return_translations" } },
        }),
      });

      if (!resp.ok) {
        if (resp.status === 429 || resp.status === 402) {
          missingIdx.forEach((i, k) => (out[i] = missing[k]));
          return { translations: out as string[], error: resp.status === 429 ? "rate_limited" : "payment_required" };
        }
        const body = await resp.text().catch(() => "");
        console.error("translate gateway error", resp.status, body);
        missingIdx.forEach((i, k) => (out[i] = missing[k]));
        return { translations: out as string[] };
      }

      const json = await resp.json() as any;
      const call = json?.choices?.[0]?.message?.tool_calls?.[0];
      const argStr = call?.function?.arguments;
      let translations: string[] = [];
      if (argStr) {
        try {
          const parsed = JSON.parse(argStr);
          if (Array.isArray(parsed?.translations)) translations = parsed.translations;
        } catch (e) {
          console.error("failed parsing tool args", e);
        }
      }

      // Pad or trim to expected length.
      if (translations.length !== missing.length) {
        translations = missing.map((m, i) => translations[i] ?? m);
      }

      missingIdx.forEach((i, k) => {
        const t = translations[k] ?? missing[k];
        out[i] = t;
        cacheSet(`${target}|${missing[k]}`, t);
      });

      return { translations: out as string[] };
    } catch (e) {
      console.error("translate handler error", e);
      missingIdx.forEach((i, k) => (out[i] = missing[k]));
      return { translations: out as string[] };
    }
  });
