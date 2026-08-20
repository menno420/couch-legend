# Couch Legend

An idle stoner sim. **Get higher. Unlock a life.** Keep a very relaxed hero on
their couch while generators, absurd jobs and household rituals turn one long
afternoon into a civilization.

**Play it:** <https://menno420.github.io/couch-legend/> · Original prototype:
<https://idle-stoner.grok.me>

The game began as a one-prompt **Grok App Builder** prototype; this repo is its
permanent home — source reconstructed from the deployed artifact, mechanics
mapped and decided in [`docs/DESIGN.md`](docs/DESIGN.md), provenance in
[`docs/ORIGIN.md`](docs/ORIGIN.md). The long-term goal is a fully working
**Android game** on this exact mechanics base (the decided path is a Capacitor
shell over this build — DESIGN.md § 7).

## The game in 30 seconds

- **Take a hit** — the one manual action. It pays nugs and cash, raises High
  and spikes Buzz; the couch art literally gets hazier as Buzz climbs.
- **Grow** — 12 nug generators, Rolling Tray → Mythic Canopy.
- **Work** — 12 jobs that pay cash and drip passive High.
- **Rituals** — 10 finite upgrade ladders: automation, multipliers, offline.
- **Moods** — Lucid → Couch Legend; each first reach reveals a permanent
  revelation.
- **Wake & Bake** — prestige at High 400+: reset the afternoon, bank Clarity,
  run hotter forever.
- Closing the tab is fine: offline progress accrues (2 h @ 45 % base, up to
  12 h @ 95 % with Blackout Curtains).

## What this version adds over the prototype

- **Portable saves** — export/import a `CL1.` save code from Settings; imports
  validate before touching anything.
- **Revelations** — each mood now carries a permanent lore line with a toast on
  first reach (the Lore tab shows the collection).
- **A richer offline report** — the return banner itemizes nugs/cash/high
  earned and says when the cap truncated the absence.
- **Prestige legibility** — the Lore tab shows the current Clarity multiplier
  and what it becomes after the pending Wake & Bake.
- **Tab signals** — a quiet dot marks tabs holding something affordable.
- **Keyboard + accessibility** — Space/Enter take a hit; aria labels on icon
  controls; `prefers-reduced-motion` respected.
- **Installable PWA** — manifest + icons; add-to-home-screen works on Android
  today, ahead of the native shell.
- **A tested engine** — the economy is a pure TypeScript module with a unit
  suite pinning every load-bearing formula (`pnpm test`).

## Development

```bash
pnpm install
pnpm dev        # local dev server
pnpm check      # typecheck + tests + production build (what CI runs)
```

Built with Vite, React 19, TypeScript, Tailwind CSS v4 and zustand. No
backend; saves live in `localStorage` (same keys as the prototype).

Deploys to GitHub Pages from `main` via `.github/workflows/pages.yml`;
`ci.yml` runs `pnpm check` on every push and PR.

## Layout

```
src/lib/       platform-neutral game core (content, engine, save, format)
src/components React UI (web adapter)
docs/DESIGN.md the binding mechanics map — read before changing any number
docs/ORIGIN.md how a one-prompt prototype became this repo
tests/         the engine suite that pins the design
```
