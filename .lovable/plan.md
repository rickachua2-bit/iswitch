# Mobile Header: Always-Visible Language & Currency

## Problem
On mobile, the language and currency selectors only appear inside the hamburger drawer (`hidden md:block` on the header buttons; `<select>` fallbacks live inside the drawer). Users want them visible directly in the top header bar on mobile, the same as on desktop.

## Fix
Single file: `src/components/Header.tsx`.

### 1. Show the existing currency + language dropdown buttons on mobile
- Remove `hidden md:block` from the two wrapper `<div>`s (currency at line 102, language at line 136). They become `relative` (always visible).
- Tighten the trigger buttons for small screens:
  - Currency button: show `currency.code` only, smaller padding (`px-1.5 py-1`), `text-[11px]` on mobile, `text-xs` on `sm+`.
  - Language button: show `Globe` icon + uppercase code, same compact sizing.
- Keep the existing dropdown panel logic untouched (it already opens on click, closes on outside click, has search + checkmark).

### 2. Make the dropdown panel mobile-friendly
- `DropdownPanel`: change width from fixed `w-72` to `w-[min(18rem,calc(100vw-1.5rem))]` so the 288px panel never overflows on a 360–414px viewport. Keep `right-0 top-full` anchoring so it aligns under its trigger.

### 3. Tighten the right-side cluster spacing on mobile
- Right-side container (line 100): keep `gap-1` on mobile, `md:gap-2` on larger screens, so logo + 2 selectors + hamburger fit on a 360px viewport without wrapping.
- Logo: keep current size; no change needed.

### 4. Remove the now-redundant `<select>` block in the mobile drawer
- Delete the `grid-cols-2` block (lines 257–282) that holds the duplicate native language/currency `<select>`s. They're no longer needed since the real dropdowns live in the header.
- Keep the rest of the drawer (nav links, B2B, sign-in, dashboard, admin, consult) intact.

## Files Touched
- `src/components/Header.tsx` (only)

## Out of Scope
- No changes to `useCurrency`, `i18n`, or any other component.
- No new dependencies.
- Bottom nav (`MobileBottomNav.tsx`) untouched.

## QA Checklist
- 360px viewport: header shows logo · CUR · 🌐EN · ☰ on one row, no wrap.
- Tapping CUR opens currency dropdown anchored to the button, fits within viewport, search works.
- Tapping 🌐EN opens language dropdown the same way.
- Hamburger drawer no longer shows the duplicate language/currency selects.
- Desktop (≥ md) layout unchanged.