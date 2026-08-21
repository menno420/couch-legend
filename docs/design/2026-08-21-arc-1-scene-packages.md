# Arc 1 scene packages — opening chapters

> **Status:** owner-approved opening theme and delivered art package,
> 2026-08-21. This supplies three of the planned 18 stage compositions, with a
> lucid and baked state for each. The files are intentionally dormant until the
> permanent `lifeHigh` stage schema and `STAGE_PRESENTATION` registry land.

This package answers the owner's request for more backgrounds, moving visual
life and a clearer sense of travelling through a story. It does not change a
threshold, reward, save value, prestige rule, shop item or simulator result.

## 1 · What the opening should feel like

The first three chapters remain grounded and close to home. Their visual change
comes from ordinary life moving forward — outside to first job to first indoor
room — rather than from immediate science-fiction spectacle. That makes the
later jail, state-room, lunar and cosmic scenes feel earned.

All three use the same language:

- painterly realism, warm practical light and deep green-black shadows;
- the same rust-red, worn couch as the continuity object;
- one clear work or money clue in every frame;
- restrained dream details in the baked state, never a green filter;
- calm space near the top for chapter UI, with no text or logo baked into art;
- environmental motion only. The protagonist and couch do not float, wobble or
  loop like animated stickers.

## 2 · Delivered registry data

The implementation session should move these values into the centralized
`STAGE_PRESENTATION` registry. They are recorded here first so art production
does not force a premature dependency on the simulator-only stage proposal.

| Stage id | Chapter presentation | Scene pair | Focal point | Scene colors | Motion preset |
|---|---|---|---:|---|---|
| `first-light` | **01 / 18 · First Light** — “Before the legend, there was a wet couch, a first cigarette, and a job flyer the wind refused to keep.” | `first-light-lucid.jpg` / `first-light-baked.jpg` | `62% 52%` | sodium amber, rainy indigo, couch rust | `parking-lot` |
| `corner-store` | **02 / 18 · Corner Store Nights** — “The couch squeezed into the stockroom. Fluorescent hours became a first paycheck.” | `corner-store-lucid.jpg` / `corner-store-baked.jpg` | `55% 49%` | fluorescent cyan, wet amber, deep bottle green | `corner-store` |
| `cousins-couch` | **03 / 18 · Somebody's Cousin's Couch** — “One green lighter changed the temperature of the room — and the price of a good afternoon.” | `cousins-couch-lucid.jpg` / `cousins-couch-baked.jpg` | `50% 48%` | lamplight gold, couch rust, botanical green | `cousins-room` |

All paths are under `public/art/stages/` and must be resolved through
`import.meta.env.BASE_URL` in the web and Capacitor builds.

### Alt text

- `first-light`: “A young adult sits smoking on a battered rust couch in a
  rain-dark strip-mall parking lot, with a job flyer near their shoes.”
- `corner-store`: “A tired young adult counts the result of a corner-store
  night shift while the same battered couch waits in the stockroom.”
- `cousins-couch`: “A young adult settles into the same rust couch in a warm,
  plant-filled living room as a cousin passes over a green lighter.”

The baked image in each pair is decorative and uses an empty `alt`; the lucid
image carries the scene description once.

## 3 · Story continuity and Postcards

| Chapter | What changed | What funds the life | Couch continuity | Retained / next clue | Postcard from the Couch |
|---|---|---|---|---|---|
| First Light | The couch and protagonist meet outside at dusk. | A windblown job flyer points toward the first shift. | Torn right arm, exposed stuffing and darkened rust fabric establish the master silhouette. | Rain, flyer and strip-mall light lead toward the store. | **The Flyer That Kept Coming Back** |
| Corner Store Nights | The couch has been hauled into the stockroom. | Nametag, receipt, counter and till show the first paycheck. | Same silhouette; a blanket and rough repair suggest effort rather than replacement. | The kept flyer and pay paper travel to the next room. | **Exact Change** |
| Somebody's Cousin's Couch | The couch finally enters a lived-in room and weed enters the story. | Work papers and nametag remain visible; another good afternoon will require another shift. | The same damage is visible under a first mismatched green repair. | Green lighter, plants, record player and lava lamp seed the room's future rituals. | **Valid Until Morning** |

Postcards are presentation copy derived from permanent stage entry. They have no
reward, completion state, branch or save field in this package.

## 4 · Lucid-to-baked treatment

Each baked image preserves the lucid composition, character pose, couch
silhouette and focal crop. The transition changes the weather of the same
moment:

- **First Light:** the horizon warms, rain reflections deepen and tiny suspended
  lights begin to appear. This is the strongest change of the three and matches
  the current anchor pair's measured image difference.
- **Corner Store Nights:** cyan fluorescent light and amber window reflections
  bloom; small motes make a dull shift feel briefly enchanted.
- **Somebody's Cousin's Couch:** lamplight turns green-gold, fine particles and
  constellation-like marks enter the upper room, while faces and props remain
  still.

The runtime crossfades the pair from the existing `buzz` response. It must never
select a permanent chapter from current `high`, `buzz` or mood: Wake & Bake can
lower those values, but a life story cannot move backwards.

## 5 · Motion direction

`SceneMotion` supplies a small DOM/CSS vocabulary now and the future registry
selects a semantic preset. It uses no timer loop, canvas, WebGL or game engine.

| Preset | Moving layers | Timing | Never animate |
|---|---|---|---|
| `parking-lot` | slanted rain plane, one distant headlight reflection, slow streetlight breath | rain 2.8 s; headlights 8.5 s; light 9 s | protagonist, cigarette, couch, flyer |
| `corner-store` | restrained fluorescent skip, slow warm window reflection, sparse dust | light skip 6.7 s; reflection 10 s; motes 9–12 s | hands, till, receipt, couch |
| `cousins-room` | lava-lamp bloom, lamplight beam, six dust motes | bloom 7.8 s; beam 11 s; motes 9–12 s | people, lighter, smoke pose, couch |
| `couch-room` | warm light breath, diagonal room beam, six dust motes | light 7.5 s; beam 11 s; motes 9–12 s | current anchor painting |

Only `transform` and `opacity` travel. Motion pauses when the scene is outside
the viewport or the document is hidden. `prefers-reduced-motion: reduce`
removes all ambient travel and retains the still composition and ordinary
crossfade.

The three stage-specific presets are ready but deliberately not selected by
game state yet. The currently deployed couch scene uses `couch-room`, so this
package improves ambient life without inventing a temporary, incorrect stage
selector.

## 6 · Chapter-turn handoff

When the permanent stage changes, presentation should emit one atomic chapter
event and run this sequence while the economy continues:

1. old scene dims for about 250 ms;
2. a story-gold rail and `Sparks · chapter NN / 18` appear;
3. the new lucid scene cross-dissolves over about 900 ms;
4. title and one-line caption hold for about two seconds;
5. the Postcard title may appear as a quiet final beat, then the overlay clears.

The turn is dismissible. Reduced-motion mode uses short opacity changes only.
Offline progress and save import must emit at most one final chapter turn, not a
rapid replay of every crossed threshold.

## 7 · File and crop QA

| Asset | Dimensions | Encoded size |
|---|---:|---:|
| `first-light-lucid.jpg` | 900 × 1200 | 235,123 B |
| `first-light-baked.jpg` | 900 × 1200 | 245,229 B |
| `corner-store-lucid.jpg` | 900 × 1200 | 207,066 B |
| `corner-store-baked.jpg` | 900 × 1200 | 224,782 B |
| `cousins-couch-lucid.jpg` | 900 × 1200 | 213,162 B |
| `cousins-couch-baked.jpg` | 900 × 1200 | 199,535 B |

- All six are opaque progressive JPEGs in sRGB at the contract's 3:4 minimum.
- Total encoded payload is 1,324,897 B (about 1.26 MiB).
- Each decoded pair is about 8.24 MiB at RGBA8. Keep only the current pair and,
  when safe, the next pair warm; do not decode all 18 pairs.
- Centered 4:5 mobile crops and full 3:4 crops were visually checked. All
  milestone, couch and money clues remain legible; no face or essential prop is
  cut.
- Pair dimensions match. The first pair's pixel-change magnitude is comparable
  to the current couch anchors; the other two are intentionally calmer changes
  supported by scene-local light and particles.

Before a registry entry changes from `placeholder` to `delivered`, CI should
verify file existence, equal pair dimensions and focal metadata. The loader
must retain the last valid scene or current anchor if either state fails.

## 8 · Art-generation provenance

The lucid masters were generated as three separate 3:4 painterly illustrations
using the existing `couch-lucid.jpg` and `couch-baked.jpg` as the finish,
lighting and couch-continuity references. The production prompts required:

- a clearly adult fictional protagonist with stable dark curly hair and worn
  deep-green work clothes;
- the same battered rust couch, identical within each pair;
- one unmistakable location and work clue per chapter;
- natural location color, blank fictional paper/labels, and no logos or baked-in
  UI text;
- a crop-safe full composition with calm upper space.

Each baked master was then generated as a composition-preserving dream-lighting
edit of its lucid master: unchanged people, pose, room geometry, couch, props,
camera and crop; only light, reflections, haze, motes and restrained surreal
marks could change. The cousin scene was framed as implied adult story context,
not drug instruction or an active-use demonstration.

The 1086 × 1448 PNG generation masters remain production provenance outside the
app bundle. The checked-in derivatives are mechanically resized, metadata-free
JPEG delivery assets.

## 9 · Integration boundary

Safe in this package:

- six reviewed scene-state images;
- the semantic, reduced-motion-safe `SceneMotion` component;
- activation of `couch-room` on the current anchor scene;
- registry-ready metadata and exact story/motion handoff.

Must land with the planned implementation session:

- permanent `lifeHigh` in save v2 and migration from the current save;
- production `STAGES`, `stageForLifeHigh` and exhaustive
  `STAGE_PRESENTATION` entries;
- stage-entry events from hits, ticks, offline progress and import;
- atomic pair loading, current/next preload, stale-request protection and
  fallback behavior;
- chapter-turn and Chronicle integration.

There is deliberately no temporary selector based on `high`, `peakHigh`, mood,
time or current simulator state in this art package.
