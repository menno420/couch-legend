// The Lucid Chronicle stage-presentation registry (looks contract § 4 +
// the delivered Arc-1 scene packages). One entry per stage: a delivered
// lucid/baked pair, or an explicit `placeholder` riding the current couch
// anchors until its art passes owner review. Components receive an entry
// and never grow stage-specific path conditionals; every path resolves
// through BASE_URL so the web build and a bundled Android build share the
// same local assets.

import { STAGES, type StageDef } from './content'

export type SceneMotionPreset =
  | 'couch-room'
  | 'parking-lot'
  | 'corner-store'
  | 'cousins-room'

export interface SceneAccent {
  /** Values for the --scene-* seam in app.css — the one place stage light
   * touches chrome (a narrow top glow, the scene edge, haze tints). */
  light: string
  dream: string
  edge: string
  haze: string
}

export interface StagePresentation {
  stageId: string
  status: 'delivered' | 'placeholder'
  /** BASE_URL-relative paths — resolve with resolveArt(). */
  lucid: string
  baked: string
  /** Scene description for the lucid image; the baked state is decorative
   * (empty alt) per the delivered package's accessibility contract. */
  alt: string
  /** CSS object-position for both states, e.g. '62% 52%'. */
  focal: string
  motion: SceneMotionPreset
  /** Optional scene-light override; absent = the room's default palette. */
  accent?: SceneAccent
  /** Postcard from the Couch — the chapter turn's quiet final beat.
   * Only owner-approved titles ship (the three delivered packages); later
   * scene packages bring their own with owner QA. */
  postcard?: string
}

/** The current couch anchors — every stage not yet delivered presents this
 * pair by contract (looks pass § 4), never a blank scene. */
const ANCHOR: Omit<StagePresentation, 'stageId'> = {
  status: 'placeholder',
  lucid: 'art/couch-lucid.jpg',
  baked: 'art/couch-baked.jpg',
  alt: 'Your stoner slouched on the couch',
  focal: '50% 22%',
  motion: 'couch-room',
}

const DELIVERED: Record<string, Omit<StagePresentation, 'stageId'>> = {
  'first-light': {
    status: 'delivered',
    lucid: 'art/stages/first-light-lucid.jpg',
    baked: 'art/stages/first-light-baked.jpg',
    alt: 'A young adult sits smoking on a battered rust couch in a rain-dark strip-mall parking lot, with a job flyer near their shoes.',
    focal: '62% 52%',
    motion: 'parking-lot',
    accent: { light: '#f2a65a', dream: '#6d7fb3', edge: '#d47762', haze: '#66759b' },
    postcard: 'The Flyer That Kept Coming Back',
  },
  'corner-store': {
    status: 'delivered',
    lucid: 'art/stages/corner-store-lucid.jpg',
    baked: 'art/stages/corner-store-baked.jpg',
    alt: 'A tired young adult counts the result of a corner-store night shift while the same battered couch waits in the stockroom.',
    focal: '55% 49%',
    motion: 'corner-store',
    accent: { light: '#9be8e0', dream: '#e8b662', edge: '#d47762', haze: '#3f6f5a' },
    postcard: 'Exact Change',
  },
  'cousins-couch': {
    status: 'delivered',
    lucid: 'art/stages/cousins-couch-lucid.jpg',
    baked: 'art/stages/cousins-couch-baked.jpg',
    alt: "A young adult settles into the same rust couch in a warm, plant-filled living room as a cousin passes over a green lighter.",
    focal: '50% 48%',
    motion: 'cousins-room',
    accent: { light: '#f4c66a', dream: '#82d99b', edge: '#d47762', haze: '#8ba86f' },
    postcard: 'Valid Until Morning',
  },
}

export const STAGE_PRESENTATION: Record<string, StagePresentation> = Object.fromEntries(
  STAGES.map(st => [st.id, { stageId: st.id, ...(DELIVERED[st.id] ?? ANCHOR) }]),
)

/** The entry for a stage, falling back to the anchor pair for anything the
 * registry does not know (never a blank scene — looks pass § 4). */
export function presentationFor(stage: StageDef): StagePresentation {
  return STAGE_PRESENTATION[stage.id] ?? { stageId: stage.id, ...ANCHOR }
}

/** The anchor-pair presentation itself — the loader's last-resort scene
 * when a delivered image fails to load. */
export function anchorPresentation(stage: StageDef): StagePresentation {
  return { stageId: stage.id, ...ANCHOR }
}

export function resolveArt(path: string): string {
  return import.meta.env.BASE_URL + path
}
