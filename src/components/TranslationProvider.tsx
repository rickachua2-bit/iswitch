import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { translateBatch } from "@/server/translate.functions";
import { SUPPORTED_LANGUAGES } from "@/i18n";

const RTL_LANGS = new Set(
  SUPPORTED_LANGUAGES.filter((l) => (l as any).rtl).map((l) => l.code),
);

const SKIP_TAGS = new Set([
  "SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE", "KBD", "SAMP", "VAR",
  "TEXTAREA", "SVG", "PATH", "CANVAS",
]);

const ATTR_TARGETS = ["placeholder", "aria-label", "title", "alt"] as const;

const NUM_ONLY = /^[\s\d.,:%+\-/$€£¥₦()]+$/;
const CACHE_PREFIX = "iswitch.tr.";
const ORIGINAL_ATTR = "data-orig-text";

function loadCache(lang: string): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CACHE_PREFIX + lang);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCache(lang: string, cache: Record<string, string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_PREFIX + lang, JSON.stringify(cache));
  } catch {
    // Quota exceeded — drop silently.
  }
}

function shouldSkipElement(el: Element | null): boolean {
  if (!el) return false;
  let cur: Element | null = el;
  while (cur) {
    if (SKIP_TAGS.has(cur.tagName)) return true;
    if (cur.hasAttribute("data-no-translate")) return true;
    if (cur.getAttribute("translate") === "no") return true;
    if (cur.getAttribute("contenteditable") === "true") return true;
    cur = cur.parentElement;
  }
  return false;
}

function isTranslatableText(s: string): boolean {
  const trimmed = s.trim();
  if (trimmed.length < 2) return false;
  if (NUM_ONLY.test(trimmed)) return false;
  return /[A-Za-z]/.test(trimmed); // contains a Latin letter (English source)
}

interface TextJob {
  type: "text";
  node: Text;
  original: string;
}
interface AttrJob {
  type: "attr";
  el: Element;
  attr: string;
  original: string;
}
type Job = TextJob | AttrJob;

function collectJobs(root: Node): Job[] {
  const jobs: Job[] = [];
  if (typeof document === "undefined") return jobs;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const text = (node as Text).data;
      if (!isTranslatableText(text)) return NodeFilter.FILTER_REJECT;
      if (shouldSkipElement((node as Text).parentElement)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let n: Node | null;
  while ((n = walker.nextNode())) {
    const tn = n as Text;
    const parent = tn.parentElement;
    let original = tn.data;
    if (parent && parent.hasAttribute(ORIGINAL_ATTR + "-node-" + Array.from(parent.childNodes).indexOf(tn))) {
      // ignore - using simpler per-node WeakMap below
    }
    jobs.push({ type: "text", node: tn, original });
  }

  // Attributes
  const elementWalker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
    acceptNode(el) {
      if (shouldSkipElement(el as Element)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let el: Node | null;
  while ((el = elementWalker.nextNode())) {
    const e = el as Element;
    for (const attr of ATTR_TARGETS) {
      const val = e.getAttribute(attr);
      if (val && isTranslatableText(val)) {
        jobs.push({ type: "attr", el: e, attr, original: val });
      }
    }
  }

  return jobs;
}

// Track originals so we can restore when switching back to English.
const originalTextMap = new WeakMap<Text, string>();
const originalAttrMap = new WeakMap<Element, Record<string, string>>();

function recordOriginalText(node: Text, value: string) {
  if (!originalTextMap.has(node)) originalTextMap.set(node, value);
}
function recordOriginalAttr(el: Element, attr: string, value: string) {
  let store = originalAttrMap.get(el);
  if (!store) {
    store = {};
    originalAttrMap.set(el, store);
  }
  if (!(attr in store)) store[attr] = value;
}

function restoreOriginals(root: Node) {
  if (typeof document === "undefined") return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n: Node | null;
  while ((n = walker.nextNode())) {
    const orig = originalTextMap.get(n as Text);
    if (orig !== undefined && (n as Text).data !== orig) {
      (n as Text).data = orig;
    }
  }
  const elw = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let e: Node | null;
  while ((e = elw.nextNode())) {
    const store = originalAttrMap.get(e as Element);
    if (store) {
      for (const [attr, val] of Object.entries(store)) {
        if ((e as Element).getAttribute(attr) !== val) {
          (e as Element).setAttribute(attr, val);
        }
      }
    }
  }
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function TranslationProvider({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  const inFlightRef = useRef(false);
  const pendingRef = useRef(false);
  const observerRef = useRef<MutationObserver | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const runPass = async () => {
      const lang = i18n.language?.split("-")[0] || "en";

      // Update html lang/dir always.
      document.documentElement.lang = lang;
      document.documentElement.dir = RTL_LANGS.has(lang) ? "rtl" : "ltr";

      if (lang === "en") {
        restoreOriginals(document.body);
        return;
      }

      if (inFlightRef.current) {
        pendingRef.current = true;
        return;
      }
      inFlightRef.current = true;
      try {
        const jobs = collectJobs(document.body);
        if (jobs.length === 0) return;

        // Record originals
        for (const j of jobs) {
          if (j.type === "text") recordOriginalText(j.node, j.original);
          else recordOriginalAttr(j.el, j.attr, j.original);
        }

        // Use the recorded ORIGINAL English text for translation, not whatever
        // is currently in the DOM (which might already be translated).
        const sources = jobs.map((j) =>
          j.type === "text"
            ? originalTextMap.get(j.node) ?? j.original
            : originalAttrMap.get(j.el)?.[j.attr] ?? j.original,
        );

        const cache = loadCache(lang);
        const uniqueMisses = new Set<string>();
        for (const s of sources) {
          const key = s.trim();
          if (!cache[key]) uniqueMisses.add(key);
        }

        if (uniqueMisses.size > 0) {
          const missArr = Array.from(uniqueMisses);
          for (const batch of chunk(missArr, 40)) {
            try {
              const res = await translateBatch({
                data: { texts: batch, target: lang, source: "en" } as any,
              });
              const translations = res?.translations ?? batch;
              batch.forEach((src, i) => {
                cache[src] = translations[i] ?? src;
              });
            } catch (e) {
              console.error("translateBatch failed", e);
              break;
            }
          }
          saveCache(lang, cache);
        }

        // Apply translations.
        for (let i = 0; i < jobs.length; i++) {
          const j = jobs[i];
          const src = sources[i];
          const key = src.trim();
          const translated = cache[key];
          if (!translated) continue;
          // Preserve leading/trailing whitespace from the original source.
          const leading = src.match(/^\s*/)?.[0] ?? "";
          const trailing = src.match(/\s*$/)?.[0] ?? "";
          const finalText = leading + translated.trim() + trailing;

          if (j.type === "text") {
            if (j.node.data !== finalText) j.node.data = finalText;
          } else {
            if (j.el.getAttribute(j.attr) !== finalText) {
              j.el.setAttribute(j.attr, finalText);
            }
          }
        }
      } finally {
        inFlightRef.current = false;
        if (pendingRef.current) {
          pendingRef.current = false;
          // Run again for any DOM that changed during translation.
          setTimeout(() => void runPass(), 50);
        }
      }
    };

    // Debounced pass for mutations.
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        void runPass();
      }, 250);
    };

    // Observe DOM changes anywhere under <body>.
    const observer = new MutationObserver((mutations) => {
      // Ignore mutations that are purely our own text rewrites — heuristic:
      // if all changes are characterData on text nodes we just touched, skip.
      let meaningful = false;
      for (const m of mutations) {
        if (m.type === "childList" && (m.addedNodes.length > 0)) {
          meaningful = true;
          break;
        }
        if (m.type === "attributes") {
          meaningful = true;
          break;
        }
      }
      if (meaningful) schedule();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["placeholder", "aria-label", "title", "alt"],
    });
    observerRef.current = observer;

    // Initial pass + on language change.
    void runPass();
    const onLang = () => {
      void runPass();
    };
    i18n.on("languageChanged", onLang);

    return () => {
      observer.disconnect();
      observerRef.current = null;
      i18n.off("languageChanged", onLang);
      if (timer) clearTimeout(timer);
    };
  }, [i18n]);

  return <>{children}</>;
}
