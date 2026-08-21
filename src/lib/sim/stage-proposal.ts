// LIFTED (2026-08-21, § 7 item 2): the stage table this module proposed now
// lives in src/lib/content.ts as `STAGES` / `STAGE_FRAMING` — the one
// implementation the game, the simulator and the tests all consume. This
// module remains as the reference the phase-2 sim evidence cites
// (docs/sim/2026-08-20-life-story-balance.md § 4); it re-exports the
// canonical table under the proposal-era names and defines nothing itself.
export {
  STAGES as PROPOSED_STAGES,
  STAGE_FRAMING as PROPOSED_STAGE_FRAMING,
  stageForLifeHigh,
  type StageDef,
} from '../content'
