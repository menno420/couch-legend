# Origin — from one Grok prompt to this repo

> **Status:** `reference` (2026-08-20)

## The prototype

The game began as a **Grok App Builder** app generated from one small owner
prompt, published at <https://idle-stoner.grok.me> under the working title
**Couch Legend** ("An idle stoner sim. Get higher, unlock jobs, and let the
afternoon run itself."). The shared conversation:
<https://grok.com/share/c2hhcmQtMi1jb3B5_de0acab3-7c0e-48a8-9748-53f913928c1c>
(title: *"Couch Legend: Idle Stoner Game"*; one recorded follow-up — *"That's
already pretty good, can you add some more features to it"*).

The prototype was genuinely good: coherent economy, strong art direction
(painted couch scenes, Fraunces/Outfit type, sage-on-charcoal palette), and a
complete idle-game skeleton — clicker, generators, jobs, rituals, moods,
achievements, offline progress, prestige, synthesized sound.

## The reconstruction (2026-08-20)

Grok App Builder does not expose the project source, so this repo was rebuilt
**from the deployed artifact**: the two production JS bundles were beautified
and read in full, and every content table, formula and component behavior was
transcribed into clean TypeScript (`src/lib/content.ts`, `src/lib/engine.ts`).
The art (`public/art/`), fonts (`src/fonts/`), favicon and OG images are the
prototype's own assets, carried over unchanged. Save-state keys
(`couch-legend-save`) match the original exactly.

Tuning was ported **faithfully** — no balance value was changed in the
reconstruction. The decided form of the design now lives in
[`DESIGN.md`](DESIGN.md); differences from the prototype are additive and
listed in the README's "What this version adds" section.

## Division of labor (estate convention)

Grok's lane in this estate is brainstorming and prototyping; Claude's lane is
engineering, records and maintenance (fleet-manager `docs/intent.md` § 7).
This repo is that convention applied end to end: a one-prompt Grok prototype
graduated into an owned, tested, documented codebase.
