# Auto-translate the entire site on language switch

Today the language selector only swaps a tiny set of i18n keys (nav, CTAs). Page bodies stay in English. The fix: translate every visible text node on the current page automatically whenever the user picks a non‑English language.

## Approach: runtime DOM auto‑translation via Lovable AI

Build a `TranslationProvider` that walks the rendered DOM and replaces visible English text with the target language. It uses **Lovable AI** (`google/gemini-2.5-flash-lite`, free, no API key required) as the translation engine and aggressively caches results so each phrase is only translated once.

Why this approach:
- Works on every page automatically — no per‑component refactor needed.
- No paid translation API or user‑supplied key.
- Survives navigation, dynamic content, and search results.
- Leaves English untouched (no work, no cost) and respects RTL languages.

```text
[Language selector] -> i18n.changeLanguage(xx)
        |
        v
[TranslationProvider] -> collect text nodes on page
        |                 (skip <script>, <style>, <code>, inputs, [data-no-translate])
        v
  cached?  --yes--> apply instantly
        |
        no
        v
[edge function: translate-batch]  -> Lovable AI Gateway (gemini-2.5-flash-lite)
        |
        v
   cache + apply -> MutationObserver re-runs on new DOM
```

## What we will build

### 1. Backend: batched translation endpoint
- New server function `src/server/translate.functions.ts` exposing `translateBatch({ texts: string[], target: string, source?: "en" })`.
- Calls Lovable AI Gateway with a structured prompt that returns a JSON array (one translation per input, same order). Includes simple chunking (≤50 strings per call) and a server-side LRU cache keyed by `target|sha1(text)` to avoid re-billing repeats.
- Returns `{ translations: string[] }`.

### 2. Frontend: TranslationProvider
- New `src/components/TranslationProvider.tsx` mounted inside `__root.tsx` around `<Outlet />`.
- On mount and on `i18next` `languageChanged`:
  - If language is `en` → restore originals (we keep an `originalText` map per text node) and stop.
  - Otherwise: walk the DOM, collect untranslated text nodes (and key attributes: `placeholder`, `aria-label`, `title`, `alt`, `value` on submit buttons), de‑dupe, look up in `localStorage` cache (`iswitch.tr.<lang>`), batch the misses to `translateBatch`, then write results back into the DOM.
- A `MutationObserver` re-runs the same pass for nodes added later (route changes, search results, modals).
- Skips: `<script>`, `<style>`, `<noscript>`, `<code>`, `<pre>`, elements with `[data-no-translate]` or `[translate="no"]`, inputs the user is typing in, numbers/currency/dates, and strings shorter than 2 chars.
- Sets `<html lang>` and `dir="rtl"` for Arabic/Urdu/Persian.

### 3. Wire-up
- `src/routes/__root.tsx`: wrap children in `<TranslationProvider>`.
- `src/i18n/index.ts`: no change needed — provider listens to its `languageChanged` event.
- Mark a few elements that must never be translated (brand name "iSwitch", code snippets, prices) with `data-no-translate` where relevant (Header logo, price strings).

### 4. UX polish
- Tiny "Translating…" indicator pinned to the header while a batch is in flight (re-uses existing toast component).
- First-load behavior: if the stored language ≠ `en`, run the translation pass right after hydration so the user lands on a translated page.
- Errors fall back silently to the original English text; we log to console only.

## Files to create / edit
- create `src/server/translate.functions.ts`
- create `src/components/TranslationProvider.tsx`
- edit `src/routes/__root.tsx` (wrap Outlet)
- edit `src/components/Header.tsx` (add `data-no-translate` to logo + price chips; show translating indicator)

## Limits & notes (for transparency)
- Translation runs client-side after render, so non‑English visitors see ~100–500 ms of English on first paint of each new page before strings swap in. The cache makes repeat visits instant.
- We translate visible text only — not values inside `<input>` the user is editing, and not data sent to the backend (search still uses English/structured params).
- Brand names and prices are excluded by design.