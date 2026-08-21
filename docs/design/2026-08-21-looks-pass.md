# Looks pass — Lucid Chronicle

> **Status:** owner-approved direction with a working visual and narrative
> treatment finalized by this looks pass on 2026-08-21. Later implementation
> and art sessions may refine the treatment without changing the owner
> direction. This does **not** adopt a balance change, a quest economy, a
> substance effect, or a new prestige route.

### Authority in this document

- **Owner direction:** the B + C blend with some of A — modern/futuristic,
  colorful, fun and easy to play; green as a recurring signal rather than a
  universal filter; naturally colored milestone scenes; the weed-and-work life
  story; and room for jail, special smoke spots and later adult-substance
  stories.
- **Working presentation contract:** the exact palette, type, chrome, motion,
  scene treatments and story wording below. Later implementation may refine a
  detail when real screens expose a problem, but must preserve the owner
  direction and record the reason.
- **Technical contract selected by this pass:** each stage is one registered
  scene with matching lucid and baked states. The owner accepted the
  web/Capacitor direction; this pass specifies the asset model and records both
  in DESIGN §§ 7 and 9.7.
- **Simulator-gated:** every reward, economy or pacing effect, work boost,
  trade-off, reset, new currency and substance effect. Presentation-only state
  still needs a save/schema decision, but not balance evidence merely for
  existing.

## 1 · One-sentence direction

**Couch Legend is a colorful modern illustrated life story: painterly chapter
art and dreamlike cinematic atmosphere, wrapped in clean near-future game
chrome that stays fast, obvious and pleasant to use.**

This deliberately blends the owner's preferred parts of the three looks:

- **Painted storybook:** chapters, editorial type and a life that accumulates
  visible history.
- **Dream-state cinema:** strong scene changes, atmosphere and increasingly
  impossible destinations.
- **The room, refined:** familiar controls, readable numbers and one coherent
  system instead of decorative novelty on every screen.

It is not parchment nostalgia, a cold sci-fi HUD, a cannabis-leaf theme, or a
green filter over every place.

## 2 · What must stay recognizable

- `couch-lucid.jpg` and `couch-baked.jpg` remain the finish, lighting and
  character anchor. Later art inherits their painterly material detail, warm
  directional light, deep shadows, rust upholstery, botanical greens and
  restrained dream particles.
- The couch is a character and the continuity object. It begins discarded, then
  can be repaired, reupholstered, impounded, displayed, launched and
  mythologized, but it must remain recognizably *that couch*.
- Moods remain the changing weather of one afternoon; stages remain permanent
  chapters of the life. The lucid/baked response therefore sits inside every
  stage rather than replacing stage progress.
- Fraunces remains the voice of chapter names, revelations and the couch's
  commentary. Outfit remains the voice of controls, prices, body copy and
  repeated game information.
- The main action stays visually unmistakable. Futuristic decoration never
  makes an ordinary button, price or tab harder to recognize.

## 3 · The visual system

### Palette — green is the thread, not the world

| Role | Color | Job |
|---|---:|---|
| Night ink | `#0B1110` | App background |
| Smoked glass | `#121B19` | Main panels |
| Raised glass | `#192521` | Cards and controls |
| Quiet line | `#2D3D37` | Borders and divisions |
| Interactive line | `#61786E` | Recognizable control and input boundaries |
| Paper white | `#F5F1E8` | Primary text |
| Soft paper | `#C5C7BE` | Body text |
| Ash text | `#91A098` | Labels and secondary information |
| Fresh leaf | `#82D99B` | Ready, affordable, active and progress |
| Story gold | `#F4C66A` | Permanent chapters and milestones |
| Couch rust | `#D47762` | Heritage details and couch continuity |
| Dream violet | `#A78BFA` | Side stories and altered states |
| Portal cyan | `#64D8E2` | Special places and cosmic beats |
| Warning coral | `#FF8F80` | Reset, danger and irreversible actions |

Normal-size text must retain at least 4.5:1 contrast after any token refinement;
the lowest proposed text pairing, Ash on Raised glass, measures about 5.8:1.
Interactive line measures about 3.1:1 against Smoked glass; quiet lines remain
decorative and never carry control or status meaning alone.
A backdrop keeps the colors its location deserves: jail can be cold
blue-grey, the White House ivory and navy, nightlife amber and magenta, and the
moon silver and violet. Green appears where it belongs — a plant, reflected
sign, painting, bush, tiny light, progress rail or active control.

### Type and hierarchy

- Fraunces: title, arc, chapter, revelation, milestone and one-line scene
  captions.
- Outfit: controls, tabs, descriptions, costs, rates, progress and statistics.
- Tabular numbers stay tabular. Repeated functional text never becomes an
  ornate display face.
- Small labels start at 12 px. Atmosphere never depends on faint unreadable
  grey.
- Italic Fraunces is reserved for the couch's occasional commentary, not used
  as a general decoration.

### Panel chrome — smoked illuminated pages

- Deep ink-green translucent surfaces with 14–18 px corners.
- One quiet outer keyline and a faint inner highlight; no border around every
  nested rectangle merely because a component exists.
- A narrow top glow may borrow one color from the current scene.
- Main-story cards carry a gold chapter rail. Side-story cards use a single
  violet or cyan edge and one clipped corner.
- Primary controls remain filled fresh-leaf green with dark text. At most one
  luminous color appears on a card.
- No cyberpunk grid, fake terminal language, universal neon outline or
  permanent animated chrome. The painting breathes; the shop stays still.

Implementation should centralize these recipes as semantic theme tokens and a
small panel primitive. Arc and mood select token values in one place; individual
components do not each invent their own stage colors.

### What this pass implements now

- the semantic palette, smoked-glass panel/card recipes and separate scene-light
  variables in `src/app.css`;
- one reusable `Panel` primitive, clearer touch/focus states, 12 px minimum
  labels and readable locked cards;
- green progress and readiness, gold permanent-story cues, violet side-story
  cues, cyan special-place cues and rust couch continuity;
- a protected scene caption, calmer lucid/baked crossfade, safe-area-aware shell
  spacing, and matching browser/PWA launch colors;
- **Chronicle** as the UI label for the existing Lore surface, without changing
  its save data, rewards or progression behavior.

The stage schema, stage-presentation registry, chapter-turn event and 36 scene
files are still later work. The current anchor pair remains on screen until the
implementation and art passes supply those inputs.

### Motion

- Controls answer immediately; ordinary panel changes are brief and quiet.
- The current lucid/baked crossfade remains a slower, soft transformation.
- A stage entry gets one cinematic **chapter turn**: the old scene dims, a gold
  line draws, the chapter title appears, then the new scene cross-dissolves in.
- Ambient light, haze and dust may drift slowly inside the scene only.
- Reduced-motion mode replaces travel, scale and drifting with short opacity
  changes. Color is never the only status signal.

## 4 · Every backdrop must mean something

A stage image is accepted only if a player can answer these four questions by
looking at it:

1. **What changed in the hero's life?** One new place, responsibility,
   consequence or level of influence is unmistakable.
2. **What funds the life now?** One readable work or money clue connects the
   strange rise to the game's cash half.
3. **Where is the couch?** Its condition and placement tell part of the story.
4. **What came before and what comes next?** Two or three retained souvenirs
   show accumulated history; one small clue teases the following chapter.

The scene also reserves a calmer top area for readable chapter text. It contains
no baked-in interface copy or brand logo. Its important subject stays safe in
both the current 4:5 mobile crop and 3:4 larger crop.

### Registered stage-scene package

The current lucid and baked anchors are two opaque full-frame paintings, so
they cannot literally be placed over an unrelated opaque stage backdrop. The
later art pipeline therefore treats each of the 18 backdrops as **one scene
package with two registered states**:

- `public/art/stages/<stage-id>-lucid.jpg`
- `public/art/stages/<stage-id>-baked.jpg`

Both states use identical composition and crop. The baked state changes light,
haze, small props and dream detail without changing the life milestone. This
preserves the decided crossfade honestly; it does not pretend one global JPEG
can cover every future room.

The executable art contract is:

- opaque sRGB JPEG, 3:4 master, minimum 900 × 1200 px — the dimensions of both
  current anchors;
- identical pixel dimensions, couch silhouette, couch position, perspective
  and focal crop across the pair;
- recognizable protagonist identity with deliberate age progression, stable
  couch materials and silhouette, plus a reviewed continuity sheet for
  recurring props and accumulated souvenirs;
- no baked-in interface text, instructions, real brand marks or third-party
  logos;
- one `STAGE_PRESENTATION` registry maps a permanent stage id to its pair or a
  deliberate `placeholder` status, alt text, focal position and scene accent;
  `CouchPanel` receives that presentation and does not grow stage-by-stage
  conditionals;
- every URL resolves through `import.meta.env.BASE_URL`, so the web build and
  bundled Android build use the same local assets;
- load the current pair first, preload only the next pair and lazy-load the
  rest; a missing pair retains the last valid scene/current anchor rather than
  showing an empty frame;
- approve each pair in the current 4:5 mobile crop and 3:4 larger crop;
- for entries marked delivered, add registry tests that both files exist,
  paired dimensions match and focal metadata is valid; placeholder entries use
  the current anchor pair until their art is accepted. Measure encoded size and
  decode cost on representative phones before choosing a delivery-size budget.

This means 18 authored compositions and 36 registered state images. Production
remains a later, separate pipeline; this pass creates neither the files nor the
stage registry.

## 5 · Story spine

At about 18, the hero finds a discarded couch, tries cigarettes, then discovers
weed on somebody's cousin's couch. The room, the stash and the life around them
need money, so increasingly strange work becomes the engine of the story. Odd
jobs become a routine, the routine becomes an operation, one spectacular arrest
becomes a comeback, local fame becomes absurd legitimacy, and the same couch
eventually reaches the White House, the moon and a civilization built around
one long afternoon.

This is motivation and presentation, not a newly adopted consumption economy.
The story may say that work funds the room, stash and lifestyle; it must not
claim that every hit spends cash or nugs while the engine does not do that.

### Working treatment inside the decided stage structure

The stable stage ids, measured thresholds and three arcs do not change here.
Names remain working titles; the broad beats below guide art and writing, while
exact copy stays with the implementation session.

| Stage | Main chapter and meaningful scene | Side-story texture |
|---|---|---|
| **First Light** | At 18, the broke hero has a first cigarette on a battered couch discarded behind a strip mall at dusk. The couch enters before weed does. | A job flyer keeps blowing back onto their shoe. |
| **Corner Store Nights** | The first fluorescent night shift and first small paycheck. A pleasant life is beginning to require an unpleasant amount of money. | The till predicts purchases with insulting accuracy. |
| **Somebody's Cousin's Couch** | The discarded couch is dragged indoors; weed arrives and changes the temperature of the story. Wanting another good afternoon means finding more work. | The cousin lends a lighter and an extremely temporary business plan. |
| **The Couch** | First apartment, first proper tray and the first ridiculous paid errands. The couch finally has a home. | Rent, snacks and the missing remote become equal emergencies. |
| **Rituals of the Room** | Roommate, water, playlist and odd jobs turn a room into a small system. Objects begin accumulating permanently. | The remote is found three feet from where the search began. |
| **The Long Sunday** | Work, smoke, come down and begin another better afternoon: the first visible life rhythm. | A wedding and open-bar postcard introduces alcohol as a social detour, not a higher tier. |
| **Green Thumbs** | The closet becomes a luminous indoor forest; the hero begins producing instead of only consuming. No cultivation instructions appear. | A landlord inspection is defeated by the couch being more interesting than the closet. |
| **A Working Stiff, Technically** | Pizza runs, stairwell guitar, naps and snack chemistry form a colorful wall of jobs, phones and invoices. | Night-shift and gig postcards start a collection of improbable employment. |
| **The Operation** | Success attracts the wrong attention. A raid briefly places both hero and couch in an evidence room or holding area. | **County Weekend:** jail is a consequence-bearing story, never lost progress or a fail state. |
| **Local Legend** | Friends rebuild the remains as a collective and storefront. The couch sits in the window like a neighborhood monument. | The jail wristband becomes a tiny retained souvenir, not the punchline. |
| **Head in the Cloud** | A modern delivery platform and strange remote jobs make the hero accidentally influential. A fictional administration issues an invitation. | **Executive Session:** the White House smoke spot is absurd legitimacy, never a break-in or security-evasion joke. |
| **The Garden Upstairs** | Orbital growing and an envoy job carry the couch to a lunar lounge, with Earth in the window. | **One Small Puff:** the moon is a real late-life milestone, not a disposable gag. |
| **Mythic Canopy** | A bioluminescent forest grows around the couch; the operation has become folklore. | A mushroom-festival postcard introduces a distinct dream language without making shrooms a mandatory upgrade. |
| **The Civilization** | Bright future-city lounges, gardens and absurd jobs show a private routine becoming a culture. | Special-place postcards expand to rooftops, monuments, water and impossible hotels. |
| **The Archive** | A future museum retains the nametag, tray, wristband, government coaster and lunar dust. The couch is supposedly behind glass; the hero is still sitting on it. | Earlier side stories become a readable visual collection. |
| **The Long Now** | A calm future lounge suggests that an afternoon can take several different fictional shapes without becoming several disconnected games. | Weed, shrooms, alcohol and any later adult-substance stories appear as sideways detours, never a strength ladder. |
| **Almost Everything** | Remembered rooms overlap into a colorful dream of nightlife, plants, jail bars, state rooms, the moon and future technology. | Side-story souvenirs finally share one scene. |
| **The Long Afternoon** | The couch overlooks a cosmic sunset while the whole life quietly orbits it. Authored story ends; the afternoon does not. | New postcards can continue indefinitely without inventing a bigger final destination. |

Working asset-scene keys, to replace the simulator proposal's placeholder
`scene` labels only when the implementation session lifts `STAGES`, are:

`parking-lot-dusk` · `corner-store` · `cousins-living-room` ·
`first-apartment` · `apartment-lived-in` · `sunday-light` · `closet-forest` ·
`odd-jobs-wall` · `evidence-room` · `storefront` · `state-room` ·
`lunar-lounge` · `bioluminescent-canopy` · `afternoon-city` · `archive-halls` ·
`long-now` · `almost-everything` · `long-afternoon`.

These keys do not change stable stage ids, arcs or measured thresholds.
Side-story postcards do not create extra stages.

## 6 · Main story and side stories

The first implementation does not need a second quest engine to create the
feeling of sidequests. It should use the already-open story surfaces — stage
beats, news, revelations, achievements and Lore — as **Postcards from the
Couch**:

- the permanent main story is a gold spine;
- side stories branch away as violet/cyan postcards;
- a detour already implied by stage, revelation or achievement state may leave
  one small souvenir in later scene art;
- the existing Lore surface is labelled **Chronicle** by this visual pass;
- full optional quests, rewards or branching remain a later mechanics proposal.

There is no independent postcard progress, reward, branch or save field in the
first implementation. A true optional quest system is a separate proposal and,
if it affects rewards or pacing, simulator-gated.

If presentation-only Postcards are authored, one registry gives each a permanent
id, family, existing stage/revelation/achievement trigger, text and souvenir
reference. It derives visibility from state the game already stores. Independent
completion state requires a deliberate save migration; reward-bearing state also
requires simulator evidence.

Useful recurring families are **Odd Jobs**, **People Who Sit Down**, **County
Weekend**, **Smoke Spots** and **Other Afternoons**. This keeps new writing and
art modular: a later story can attach to one registry and one Chronicle surface
instead of creating a separate subsystem for every substance or location.

## 7 · Other substances and prestige — direction, not adoption

Alcohol, mushrooms and potentially more intense adult-substance stories may be
introduced later, but they are **qualitatively different episodes**, not a
linear `stronger drug = stronger upgrade` ladder:

- cannabis: warm botanical green and gold haze;
- alcohol: amber/cobalt glass reflection and social-night color;
- mushrooms: organic violet/cyan forms and doubled painterly edges;
- more intense detours: sharper spectral light and less comfortable geometry,
  never simply more neon and more reward.

No dose, sourcing, combination, concealment, cultivation procedure or claim
about real work performance belongs in the game. The protagonist is an adult
from the opening. The fiction stays warm, deadpan and non-instructional; neither
the player, poverty, jail nor dependency is a cheap punchline.

If later simulator evidence supports a work-boost or prestige experiment, the
preferred hypothesis extends the existing **Wake & Bake / Clarity** orchestration
rather than creating one prestige currency per substance. A candidate for the
simulator is an optional
**Afternoon Route** that changes the emphasis and visual identity of one
afternoon, then resolves through the existing prestige preview. Whether it
exists, when it unlocks, what it changes, every trade-off and every number remain
simulator-gated. The looks pass adopts only the visual vocabulary and the slot
for later evaluation.

## 8 · Arc-level evolution

- **Arc 1 · Sparks:** grounded and sparse — parking-lot indigo, sodium amber,
  corner-store cyan and a small cigarette-red note. Chrome is dark, clear and
  only lightly luminous.
- **Arc 2 · The Couch Era:** the current paintings are the center of gravity —
  couch rust, lamp gold, moss, violet grow light and increasingly colorful
  objects. The room and interface visibly become more confident and capable.
- **Arc 3 · The Legend:** scenes become impossible — future cities, formal
  rooms, lunar windows, archive glass, cosmic violet, portal cyan and story
  gold. Panels feel lighter and more suspended, but controls never move merely
  to announce the future.
- **The Long Afternoon:** first-stage dusk, original couch rust, mature green
  and legend gold return together. It feels like coming home after the universe
  became strange.

## 9 · Web/Android presentation seam

- React/Vite remains the single interface. Capacitor later packages the same
  `dist`; there is no native theme, story, stage or art fork.
- Fonts and art remain bundled locally. The shell build uses `VITE_BASE=./`,
  while asset paths remain `BASE_URL`-aware.
- Theme and stage selection live in content/presentation registries, never in
  browser-versus-native component branches.
- The app shell owns safe-area padding through `env(safe-area-inset-*)`.
  Controls remain touch-first and no meaning depends on hover.
- Chapter turns remain CSS-capable and reduced-motion safe. Painted scenes,
  crossfades and restrained particles do not require Godot, a native renderer
  or WebGL.
- The loading and fallback policy in § 4 bounds memory and keeps first launch
  offline. A specialized Canvas/WebGL renderer is an optional measured escape
  hatch inside the scene, not a second game architecture.
- No Capacitor package, Android project or native behavior change belongs to
  this looks PR. DESIGN § 7 records the later storage and lifecycle work.

## 10 · Handoff boundaries

### The next implementation session may take

- this theme as the visual contract for stage schema and arc-1 presentation;
- the main-story spine and stage treatments as working flavor;
- future Postcard presentation derived only from existing stage, revelation or
  achievement state; Chronicle is already the presentational label;
- one centralized arc/mood theming seam;
- the existing stage ids, thresholds, fairness rails and lucid/baked behavior
  unchanged.

### Still requires simulator evidence or a separate decision

- charging cash or nugs for hits;
- any reward-bearing or branching quest system;
- jail penalties, confiscation, failure or backward story movement;
- income-bearing arc content that changes pacing;
- substance effects, work boosts, trade-offs or alternative prestige rules;
- a second permanent currency or another prestige system;
- more stages or different measured thresholds.

### Later art-production pass

- produces the registered lucid/baked scene packages only after the stage art
  prompts and crop-safe contract are reviewed;
- uses the current couch pair as image references;
- verifies couch continuity, milestone legibility, retained souvenirs, natural
  scene palette and both responsive crops before an asset lands.

## 11 · Baseline inspected: `main` at `4dca59e`

- Game purpose and current loop: `README.md` §§ “The game in 30 seconds” and
  “What this version adds over the prototype.”
- Permanent life chapters versus within-afternoon moods: `docs/DESIGN.md` § 9.2.
- Existing stage ids, thresholds, working names and scene keys:
  `src/lib/sim/stage-proposal.ts` (`PROPOSED_STAGES`).
- Stage-entry story slot, couch continuity and the current art contract:
  `docs/DESIGN.md` §§ 9.4 and 9.7.
- Owner's sequencing and binding tone: `docs/planning/2026-08-20-life-story-direction.md`
  §§ 1–2 and 8.
- Baseline palette and self-hosted type: `src/app.css` (`@font-face`, `@theme`).
- Opaque lucid/baked images, crossfade and responsive scene crops:
  `src/components/CouchPanel.tsx` (`CouchPanel`).
