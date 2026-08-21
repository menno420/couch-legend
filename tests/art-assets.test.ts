import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { STAGES } from '../src/lib/content'
import { STAGE_PRESENTATION, presentationFor } from '../src/lib/presentation'

const PUBLIC = join(__dirname, '..', 'public')

function jpegDimensions(path: string) {
  const bytes = readFileSync(path)
  expect(bytes[0]).toBe(0xff)
  expect(bytes[1]).toBe(0xd8)

  let offset = 2
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1
      continue
    }

    while (bytes[offset] === 0xff) offset += 1
    const marker = bytes[offset]
    offset += 1

    // SOF0–SOF3 carry the dimensions for baseline and progressive JPEGs.
    if (marker >= 0xc0 && marker <= 0xc3) {
      return {
        height: bytes.readUInt16BE(offset + 3),
        width: bytes.readUInt16BE(offset + 5),
      }
    }

    // Standalone markers do not carry a length field.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) continue

    const segmentLength = bytes.readUInt16BE(offset)
    expect(segmentLength).toBeGreaterThanOrEqual(2)
    offset += segmentLength
  }

  throw new Error(`No JPEG dimensions found in ${path}`)
}

const FOCAL = /^\d{1,3}% \d{1,3}%$/
const PRESETS = ['couch-room', 'parking-lot', 'corner-store', 'cousins-room']

describe('STAGE_PRESENTATION registry (looks contract § 4)', () => {
  it('covers every stage exactly, and unknown stages fall back to the anchor pair', () => {
    for (const st of STAGES) expect(STAGE_PRESENTATION[st.id], st.id).toBeDefined()
    expect(Object.keys(STAGE_PRESENTATION).length).toBe(STAGES.length)
    const ghost = presentationFor({ ...STAGES[0], id: 'no-such-stage' })
    expect(ghost.status).toBe('placeholder')
    expect(ghost.lucid).toBe('art/couch-lucid.jpg')
  })

  it('every entry names real files, a valid focal point, a known motion preset and alt text', () => {
    for (const st of STAGES) {
      const p = STAGE_PRESENTATION[st.id]
      expect(existsSync(join(PUBLIC, p.lucid)), p.lucid).toBe(true)
      expect(existsSync(join(PUBLIC, p.baked)), p.baked).toBe(true)
      expect(p.focal, `${st.id} focal`).toMatch(FOCAL)
      expect(PRESETS, `${st.id} motion`).toContain(p.motion)
      expect(p.alt.trim().length, `${st.id} alt`).toBeGreaterThan(10)
    }
  })

  it('delivered pairs are matching 900×1200 masters; placeholders ride the anchors', () => {
    let delivered = 0
    for (const st of STAGES) {
      const p = STAGE_PRESENTATION[st.id]
      if (p.status === 'delivered') {
        delivered++
        const lucid = jpegDimensions(join(PUBLIC, p.lucid))
        const baked = jpegDimensions(join(PUBLIC, p.baked))
        expect(lucid, p.lucid).toEqual({ width: 900, height: 1200 })
        expect(baked, p.baked).toEqual(lucid)
        expect(p.lucid.startsWith('art/stages/'), p.lucid).toBe(true)
      } else {
        expect(p.lucid).toBe('art/couch-lucid.jpg')
        expect(p.baked).toBe('art/couch-baked.jpg')
      }
    }
    // The three owner-approved Arc-1 packages (2026-08-21) are live; the
    // remaining scenes stay placeholders until their art passes review.
    expect(delivered).toBe(3)
  })

  it('only owner-approved postcards ship', () => {
    for (const st of STAGES) {
      const p = STAGE_PRESENTATION[st.id]
      if (p.postcard != null) expect(p.status).toBe('delivered')
    }
  })
})
