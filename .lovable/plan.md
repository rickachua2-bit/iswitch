## Goal

Give every booking page (`/flights/book`, `/stays/book`, `/tours/book`, `/visas/book`, `/insurance/book`, `/pickups/book`) a modern, on-brand look that:
- commands attention with a deep-blue → blue-glow gradient hero accented by the iSwitch yellow
- lets the user understand the booking at a glance (vertical, route/property/tour, dates, travellers, total)
- keeps form sections clean, scannable, and consistent across all six verticals
- makes the price + confirm sidebar feel premium and trustworthy

No new pages or routes — we restyle existing ones by upgrading the shared `BookingShell` building blocks plus per-vertical hero data.

## Visual direction

```text
┌─────────────────────────────────────────────────────────────┐
│  [vertical icon]  FLIGHTS · Step 2 of 3                     │  ← gradient-hero
│  Lagos → Dubai                                              │     deep blue + glow
│  Wed 6 May · 1 adult · Emirates                  ₦ 842,300  │     yellow accent dot
│  [Back to results]   ●─●─○  Choose · Details · Pay          │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────────────────┐  ┌──────────────────────┐
│ Section card (rounded-2xl,       │  │  Sticky summary      │
│ subtle gradient, accent rule)    │  │  Per-night × nights  │
│   Field   Field                  │  │  Taxes · Total       │
│   Field   Field                  │  │  ──────────────────  │
└──────────────────────────────────┘  │  [ Confirm & pay ]   │
┌──────────────────────────────────┐  │  Trust strip         │
│ Section card                     │  └──────────────────────┘
└──────────────────────────────────┘
```

Brand tokens used (already in `src/styles.css`): `--gradient-hero`, `--gradient-primary`, `--gradient-accent`, `--accent`, `--primary-glow`, `--shadow-elevated`, `--shadow-card`. No new colors — only new utility classes layered on existing tokens.

## Changes

### 1. Upgrade `src/components/booking/BookingShell.tsx`

Add a new `BookingHero` component and restyle the existing pieces:

- `BookingHero({ vertical, title, subtitle, meta, priceLabel, priceValue, backTo, step })`
  - Full-bleed gradient (`bg-gradient-hero`) with a soft yellow radial glow in the corner (matches `.admin-page-hero` treatment)
  - Vertical icon chip on the left (Plane / Bed / MapPin / FileCheck / Shield / Car) in an accent-tinted pill
  - Big display title (`font-display`, tight tracking) + subtitle row with key facts (dates, pax, etc.)
  - Right side: price block — small "Total" label + large amount in accent yellow
  - Bottom row: back link + restyled stepper (white-on-glass)
- `Stepper` — repaint for dark hero background (active = accent, done = success green, pending = white/30)
- `SectionCard` — add gradient-card background, 1px primary-tinted border, soft shadow, and a 2px accent left rule on the title row for visual rhythm
- `ConfirmButton` — change to `bg-gradient-primary` with glow shadow and inner highlight (matches `.auth-form button[type="submit"]`); accent-yellow lock icon
- `TrustStrip` — slightly elevated card with inline icons in primary/accent
- `SuccessCard` — keep but apply the same gradient-card + shadow-elevated treatment

The shell wrapper changes from `bg-secondary/30` to a layered background: page-tinted `bg-background` with a subtle radial primary glow at the top, so the hero blends downward into the form area.

### 2. Wire the hero into every booking page

Each `*.book.tsx` already has the offer data needed. Replace the current top-of-main intro with `<BookingHero ... />` outside the grid, then keep the existing `<main className="grid ...">` layout below it.

Per-vertical mapping:

| Route | Title | Subtitle / meta | Price label |
|---|---|---|---|
| `flights.book.tsx` | `${origin} → ${destination}` | `${date} · ${pax} · ${airline}` | "Total fare" |
| `stays.book.tsx` | hotel name | `${city} · ${nights} night(s) · ${guests}` | "Total for X nights" |
| `tours.book.tsx` | tour title | `${date} · ${participants} guests · ${duration}` | "Total" |
| `visas.book.tsx` | `${country} ${visaType}` | `${processingDays} processing · ${applicants}` | "Government + service fee" |
| `insurance.book.tsx` | plan name | `${tripType} · ${dates} · ${travellers}` | "Premium" |
| `pickups.book.tsx` | `${pickup} → ${drop}` | `${date} ${time} · ${vehicleClass}` | "Total" |

Also normalise `flights.book.tsx`: remove its local duplicate `SectionCard` (lines ~415+) and import the shared one so all six pages share the same look.

### 3. Sidebar polish (sticky summary)

In each `*.book.tsx` sidebar block:
- Wrap in the upgraded `SectionCard` so the elevation and accent rule match
- Add a clear price breakdown block: rows for base × qty, taxes/fees, then a bold total in `text-gradient-primary`
- Place `ConfirmButton` directly under the breakdown
- Keep `TrustStrip` underneath

### 4. Empty / error states inside `BookingShell`

The "Offer expired / not found" branches in each page already use plain divs. Wrap them in a centered `SectionCard` with the same hero on top so users still see context (vertical + back to results) instead of a bare message.

## Out of scope

- No backend, schema, validation, or payment changes
- No copy rewrites beyond hero labels above
- No changes to search/results pages
- No changes to admin booking views

## Files to edit

- `src/components/booking/BookingShell.tsx` — add `BookingHero`, restyle `Stepper`, `SectionCard`, `ConfirmButton`, `TrustStrip`, `SuccessCard`, and the outer wrapper
- `src/routes/flights.book.tsx` — add hero, drop local `SectionCard`, polish sidebar
- `src/routes/stays.book.tsx` — add hero, polish sidebar breakdown
- `src/routes/tours.book.tsx` — add hero, polish sidebar
- `src/routes/visas.book.tsx` — add hero, polish sidebar
- `src/routes/insurance.book.tsx` — add hero, polish sidebar
- `src/routes/pickups.book.tsx` — add hero, polish sidebar

## Acceptance

- Every `/book` page opens with the same gradient hero pattern, just with vertical-specific icon, title, and meta
- Booking essentials (what, when, who, how much) are visible in the hero without scrolling on a 1366×768 viewport
- All six pages share identical card styling, button styling, and stepper styling
- Brand tokens only — no hard-coded hex colors introduced
- Existing form logic, validation, and submit flows are untouched
