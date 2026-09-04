# Fleet-preflight contract sheet — the long-form redesign run (2026-09-04)

> **Status:** `reference` — the contracts written BEFORE the first agent spawned,
> per fleet-manager's `fleet-preflight` skill. Filled from real runs and real
> exit codes, not from ceremony. Quoted verbatim by whatever this run publishes.
>
> Certainty legend: `MEASURED` = a command was run here and its exit code read ·
> `REASONED` = derived from measured inputs · `OWNER` = his stated direction.

```
AGGREGATE   : dies_if not( (not refuted) and changes_couch_legend and named_comparator
                           and (not already_covered_by) and (not generalization_risk)
                           and evidence_kind )
              · unread fields 0, undefined fields 0 (exit 0)
              · fixture kill 5/7, fixture survival 2/7, mismatches 0 (exit 0)
              · refute authority 3/3 — every verifier lens carries the refute instruction
INSTRUMENT  : tools/stage-evolution.ts (imports the live content tables; nothing retyped)
              · positives 6/6, negatives 5/5, controls 2/2, exit 0
              · real-slice hits 18/18 stages read by hand (full corpus — no sampling)
PILOT       : research lane × 3 agents first · 3 transcripts read whole · changed: see § Pilot
CORPUS      : 18/18 stages · 38 shelf rows (14 generators, 13 jobs, 11 rituals) · 9 moods
              · 33 achievements · 4,022 LOC across src/ · 124 tests · from
              /home/user/couch-legend @ d877ed0, cloned 2026-09-04 12:0xZ
              Composition (census output, pasted): 2/18 stages gate any new content row;
              0/18 introduce a new mechanic; 3/18 have delivered scene art;
              4 of 38 shelf rows carry a real stage gate.
RETAIN      : repo + source_path + source_sha (couch-legend@d877ed0, fleet-manager@caa6cd2)
              · source_url + source_title + source_date for every web claim
              · raw_span verbatim (never a summary) · instrument id + version
              · the agent PROMPT that produced each artefact (input AND output)
              follow-up "which of the adopted mechanics did research actually move,
              versus which are my design inference?" answerable: YES — evidence_kind
              is retained per claim and the matrix cites claim ids.
BASE        : couch-legend@d877ed0b611418f35ad9e578785b012a844d1992 at 2026-09-04 ~12:05Z
              · open PRs: none (0 measured via REST, per_page=100)
              fleet-manager@caa6cd2ab6591794258b68b3c385a8378a55c8d3
              · open PRs: #1020 (estate truth baseline — does not touch couch-legend)
              re-read <sha>..origin/main on BOTH repos before writing the final report
SIZE        : limit 2 via PROBE (demand test: 5 agents dispatched at one instant,
              each holding its slot for a fixed 40 s) at 2026-09-04 12:16–12:19Z.
              Peak overlap 2, three waves of 2/2/1. Within-wave start gap 0.15–0.6 s;
              between-wave gap 8.5 s after a slot freed — a 50x ratio, so provisioning
              is fast and starts track slot-frees ⇒ SLOT-LIMITED, not provisioning-limited.
              Documented cap min(16, CPUs-2) = 2 on this 4-CPU box: agrees, but the
              probe is the authority, not the formula.
              ~16 agents x ~240 s ÷ 2 ≈ 32 min floor for the full research fan-out.
EXTERNAL    : Codex on the PR — HARD CAP 3 rounds per PR per session ([D-0039],
              enforced by fleet-manager's codex_round_guard hook). Budgeted: 1 round at
              the design-doc integration boundary, 1 at the implementation boundary,
              1 held in reserve for the flip head. Mid-run verification of intermediate
              fixes goes to the free-key Gemini route (gemini-3.6-flash), NOT to Codex
              (owner, live, 2026-08-29 — reserve Codex for flip-readiness).
              Plus an in-fleet adversarial verify lane (3 refuting lenses per claim).
MODELS      : research readers -> sonnet · code/UX mappers -> sonnet
              · claim verifiers (refute lenses) -> opus · design judge panel -> opus
              · final completeness critic -> opus
              reasons: every stage that DECIDES what survives runs on opus; the reading
              and mapping stages are instrument-bound, not model-bound.
              fable: none — the owner has not asked for Fable in this run, and a session
              may not name that tier on its own (D-0040 as amended 2026-09-02).
              Synthesis, all game-design judgment, architecture, implementation and final
              integration are the main session (Opus 5), not delegated.
UNCONTRACTED: none.
```

## Pilot

Per § 3 of the skill, the research lane launches at 3 agents first; all three
transcripts are read whole before the remaining agents commit. What the pilot
changed is recorded here after it runs, including "nothing".

**Pilot result:** see `2026-09-04-long-form-idle-research.md` § Pilot.

## What this sheet does not cover

- Whether the question is worth N agents. Sizing gives the price, not the value.
- An instrument that matches correctly and asks the wrong question. The
  stage-evolution census counts *availability* changes; it cannot tell you
  whether a stage FEELS different, which is the design judgment this run exists
  to make and which stays with the main session.
- Everything after launch except the pilot and the base re-read.
