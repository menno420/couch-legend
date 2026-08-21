# Idle-player preferences — visible progress pass

> **Status:** `reference` · researched decision · 2026-08-21
>
> This pass asks one narrow question: which repeatedly reported idle-game
> preference can improve the shipped interface without changing Couch Legend's
> measured economy, stage system, save, or fairness rails?

## What the evidence says

The sources agree more strongly on *how progress is experienced* than on one
universal pacing formula:

- A recent mixed-methods study identifies away play, growth, visibly applied
  unlocks, appealing presentation and continuous progress as recurring qualities
  of favored idle games. It also reports goals, achievements and visual feedback
  positively, while repetition and unrewarding interaction are negative themes.
  The qualitative interview portion was small, so this is directional evidence,
  not a genre law. [Hwang, 2025, pp. 31 and 39–43](https://escholarship.org/content/qt0b07v51w/qt0b07v51w.pdf)
- Proprietary, non-peer-reviewed motivation data for several established idle
  clickers found Completion and Power to be their audiences' strongest common
  motives. It is reasonable to infer that visible completion targets may serve
  part of that audience, but the data does not test this interface treatment.
  [Quantic Foundry](https://quanticfoundry.com/2016/07/06/idle-clickers/)
- Research on a progress-while-gone collection game found engagement expressed
  through checking as well as direct play and social activity. That supports
  designing a satisfying return/check-in loop rather than demanding constant
  attention. [Cutting, Gundry & Cairns](https://eprints.whiterose.ac.uk/id/eprint/135461/)
- Specialist-player discussions from the past two years repeatedly ask for clear
  goals, visible next unlocks, useful offline progress, gradual discovery and
  automation. They also reject forced attendance, repetitive clicking and
  systems that require an outside guide. These threads are self-selected
  anecdotes, useful for finding pain points but not representative survey data.
  [mobile preferences](https://www.reddit.com/r/incremental_games/comments/1hwng0q/what_is_important_for_you_for_a_mobile_idle_or/) ·
  [what keeps players interested](https://www.reddit.com/r/incremental_games/comments/1ko0i7y/what_makes_an_idleincremental_game_actually/) ·
  [offline-return preferences](https://www.reddit.com/r/incremental_games/comments/1pjc7n8/favorite_offlinecatchup_mechanic/)
- Designer research frames strong idle games as systems that permit disengagement
  without punishing the player's long-term trajectory, while using system changes
  as narrative turns rather than repeating one unchanged loop.
  [Spiel et al., CHI PLAY 2019](https://par.nsf.gov/servlets/purl/10174274)

## What Couch Legend already gets right

- The hit has immediate art, number, smoke and sound feedback.
- Purchases produce automation or visible rates rather than fake score alone.
- The itemized offline report respects absence without a daily claim or streak.
- Affordable-tab signals reduce hunting, and Chronicle preserves collection and
  completion surfaces.
- The life-story stages and authored scene pairs now make permanent progress
  visibly real in the world; this pass complements them at the shorter
  within-afternoon scale.

## The clearest safe gap

Before this pass, the only global forecast was a small next-mood label inside the
painting. Shop unlocks could be discovered only by opening each tab, and there was
no single answer to “what arrives next?” This is especially weak at the beginning,
where several small High thresholds teach the Grow, Work and Ritual loops.

## Decision implemented

The evidence supports clear goals and visible progress; choosing one compact,
global rail is a design inference tailored to Couch Legend's existing interface,
not a treatment directly tested by the cited research.

Add one **Next this afternoon** goal rail beneath High:

- derive the nearest currently chapter-available mood, Grow, Work or Ritual
  threshold directly from the canonical content tables;
- group simultaneous arrivals, in deterministic order;
- use the shop's existing reveal boundary, so the rail teases rather than spoils;
- show local progress from the last reached threshold to the next, holding the
  completed bar briefly before the next arrival takes its place;
- coalesce thresholds crossed in quick succession into one readable arrival
  summary instead of silently skipping their labels;
- label it as within-afternoon progress and use play-green, not story-gold, so it
  cannot be mistaken for the permanent chapter ladder;
- replace the mood-only painting label with the same compact unified cue, so the
  next arrival remains above the fold on a narrow phone;
- name every simultaneous arrival and end with an explicit current-shelf
  completion state.

This is presentation only. It adds no reward, gate, estimate, save state, daily
task, economy value or simulator claim. Its brief acknowledgement timer never
changes progress.

## Deliberately not adopted here

- Changing `lifeHigh`, stage tuning or Arc-1 scenes: implemented in the
  preceding life-story session; this pass only consumes its availability seam.
- New quests, prestige routes, upgrade effects or offline tuning: mechanics work,
  and simulator-gated where they affect progression.
- Streaks, daily gifts, energy, ads or attendance pressure: contradicted by both
  the decided no-fail direction and repeated player complaints.

## Verification contract

- Threshold selection, reveal boundaries, grouped ties, rapid-arrival coalescing,
  reset handling and final completion are pure and unit-tested.
- The rail uses a real accessible progressbar with text as well as color.
- The existing reduced-motion rule applies to its brief width transition.
- `pnpm check` remains the implementation gate; visual review covers narrow phone,
  ordinary phone, tablet and desktop widths.
