import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const STAGE_ART = join(__dirname, '..', 'public', 'art', 'stages')

const PAIRS = [
  ['first-light-lucid.jpg', 'first-light-baked.jpg'],
  ['corner-store-lucid.jpg', 'corner-store-baked.jpg'],
  ['cousins-couch-lucid.jpg', 'cousins-couch-baked.jpg'],
] as const

function jpegDimensions(file: string) {
  const bytes = readFileSync(join(STAGE_ART, file))
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

  throw new Error(`No JPEG dimensions found in ${file}`)
}

describe('delivered Arc 1 scene art', () => {
  it.each(PAIRS)('%s and %s are matching 3:4 delivery pairs', (lucid, baked) => {
    const lucidSize = jpegDimensions(lucid)
    const bakedSize = jpegDimensions(baked)

    expect(lucidSize).toEqual({ width: 900, height: 1200 })
    expect(bakedSize).toEqual(lucidSize)
  })
})
