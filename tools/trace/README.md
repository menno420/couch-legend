# Hand-played trace drivers

These two scripts produced the committed fixtures in `tests/fixtures/` — real
play sessions on the real UI (a `VITE_BASE=./ vite build` of `e4b168b`, served
locally, driven through Chromium in real time). The session's play decisions
are encoded as the phased plan inside each script; click cadence carries
seeded jitter; every action and a periodic `localStorage` save snapshot are
recorded.

- `handplay-driver.js` → `tests/fixtures/handplay-2026-08-20.json` — an
  11-minute fresh-start session (496 hits, 50 purchases, 137 snapshots, zero
  page errors). Its recording defect — an index-based button locator that
  drifted when the Wake & Bake header button mounted — is annotated in the
  fixture (`meta.phantomEvidence`) and analyzed in
  [`../../docs/sim/2026-08-20-life-story-balance.md`](../../docs/sim/2026-08-20-life-story-balance.md).
- `prestige-driver.js` → `tests/fixtures/handplay-prestige-2026-08-20.json` —
  a seeded near-gate save crossing the prestige gate live and confirming
  Wake & Bake through the real modal ("Sleep it off"), then rebuilding.

Reproduction needs a browser environment: `npm i playwright` next to the
scripts (Chromium binaries as available; both scripts fall back to an
explicit `executablePath`), a served build on `localhost:4173`, then
`node <driver>.js`. Playwright is deliberately **not** a dependency of this
repository — the committed fixtures are the durable artifact, and the replay
validation over them (`tests/replay.test.ts`) runs offline in CI.
