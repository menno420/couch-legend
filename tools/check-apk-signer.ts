/**
 * Asserts an APK was signed by the keystore this repo commits.
 *
 * The failure this exists to catch: the APK builds green but carries a signing
 * identity nobody pinned. Measured 2026-08-21 (#13) — with no committed
 * keystore, Gradle mints a fresh debug key per build machine, so three CI runs
 * produced three distinct signer certificates. An APK signed by a different key
 * REFUSES to install over an installed one, and the only way through is an
 * uninstall, which clears app storage — the player's save. That makes repeated
 * delivery to a real phone (i.e. milestone B's device matrix) impossible.
 *
 * It is written as an assertion, not a report, because "stable" observed once
 * is a fact about yesterday. The expected fingerprint is derived from
 * `android/keystore/debug.keystore` at check time rather than pinned as a hex
 * string here, so there is no third copy to drift: the keystore is the source
 * of truth and this proves the shipped bytes came from it.
 *
 * No Android SDK required — `apksigner` is not available in the agent
 * container, so the APK Signing Block is parsed directly (the recipe recorded
 * in docs/CAPABILITIES.md). Note that modern AGP emits no `META-INF/*.RSA`, so
 * an absent JAR signature is NOT evidence of an unsigned APK.
 *
 * Run: `pnpm check:apk-signer <path-to.apk>` (the android workflow runs it
 * immediately after `assembleDebug`, in both jobs).
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const REPO = new URL('..', import.meta.url).pathname
const KEYSTORE = join(REPO, 'android/keystore/debug.keystore')
const STOREPASS = 'android'
const ALIAS = 'androiddebugkey'

const APK_SIG_BLOCK_MAGIC = 'APK Sig Block 42'
const V2_BLOCK_ID = 0x7109871a
const V3_BLOCK_ID = 0xf05368c0

const apkPath = process.argv[2]
if (!apkPath) {
  console.error('usage: pnpm check:apk-signer <path-to.apk>')
  process.exit(2)
}
if (!existsSync(apkPath)) {
  console.error(`no APK at ${apkPath}`)
  process.exit(2)
}

const sha256 = (b: Buffer) => createHash('sha256').update(b).digest('hex').toUpperCase()
const pretty = (hex: string) => (hex.match(/../g) ?? []).join(':')

/** The certificate the committed keystore holds, DER-encoded. */
function expectedCert(): Buffer {
  if (!existsSync(KEYSTORE)) {
    console.error(`no committed keystore at ${KEYSTORE} — nothing to check against`)
    process.exit(2)
  }
  const pem = execFileSync(
    'keytool',
    ['-list', '-rfc', '-keystore', KEYSTORE, '-storepass', STOREPASS, '-alias', ALIAS],
    { encoding: 'utf8' },
  )
  const body = /-----BEGIN CERTIFICATE-----([\s\S]*?)-----END CERTIFICATE-----/.exec(pem)
  if (!body) {
    console.error('keytool returned no PEM certificate for the debug alias')
    process.exit(2)
  }
  return Buffer.from(body[1].replace(/\s+/g, ''), 'base64')
}

/**
 * Locate the APK Signing Block, which sits immediately before the ZIP central
 * directory:
 *   uint64 size | (uint64 len, uint32 id, value)* | uint64 size | 16-byte magic
 */
function signingBlock(apk: Buffer): Map<number, Buffer> {
  // End of Central Directory — scan back from the tail for its signature.
  let eocd = -1
  for (let i = apk.length - 22; i >= Math.max(0, apk.length - 65557); i--) {
    if (apk.readUInt32LE(i) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new Error('no ZIP End of Central Directory — not an APK?')
  const cdOffset = apk.readUInt32LE(eocd + 16)

  if (cdOffset < 24) throw new Error('central directory too early to hold a signing block')
  const magic = apk.subarray(cdOffset - 16, cdOffset).toString('latin1')
  if (magic !== APK_SIG_BLOCK_MAGIC) {
    throw new Error(
      `no "${APK_SIG_BLOCK_MAGIC}" before the central directory — the APK is UNSIGNED ` +
        `(found ${JSON.stringify(magic)})`,
    )
  }
  const size = Number(apk.readBigUInt64LE(cdOffset - 24))
  const start = cdOffset - size - 8
  if (start < 0) throw new Error('signing block size runs past the start of the file')
  if (Number(apk.readBigUInt64LE(start)) !== size) {
    throw new Error('signing block size fields disagree — malformed APK')
  }

  const pairs = new Map<number, Buffer>()
  let p = start + 8
  const end = cdOffset - 24
  while (p < end) {
    const len = Number(apk.readBigUInt64LE(p))
    if (len < 4 || p + 8 + len > cdOffset) throw new Error('malformed id-value pair')
    pairs.set(apk.readUInt32LE(p + 8), apk.subarray(p + 12, p + 8 + len))
    p += 8 + len
  }
  return pairs
}

/** First signer's first certificate out of a v2/v3 block. */
function firstCert(block: Buffer): Buffer {
  // length-prefixed sequence of length-prefixed signers
  const signers = block.subarray(4, 4 + block.readUInt32LE(0))
  const signerLen = signers.readUInt32LE(0)
  const signer = signers.subarray(4, 4 + signerLen)
  // signer := signed data | signatures | public key, each length-prefixed
  const signedData = signer.subarray(4, 4 + signer.readUInt32LE(0))
  // signed data := digests | certificates | attributes, each length-prefixed
  const digestsLen = signedData.readUInt32LE(0)
  const certsAt = 4 + digestsLen
  const certs = signedData.subarray(certsAt + 4, certsAt + 4 + signedData.readUInt32LE(certsAt))
  return certs.subarray(4, 4 + certs.readUInt32LE(0))
}

const apk = readFileSync(apkPath)
let pairs: Map<number, Buffer>
try {
  pairs = signingBlock(apk)
} catch (err) {
  console.error(`  FAIL ${(err as Error).message}`)
  process.exit(1)
}

const v2 = pairs.get(V2_BLOCK_ID)
if (!v2) {
  console.error(
    `  FAIL no APK Signature Scheme v2 block (0x${V2_BLOCK_ID.toString(16)}) — ` +
      `found ids ${[...pairs.keys()].map((i) => '0x' + i.toString(16)).join(', ')}`,
  )
  process.exit(1)
}

const want = expectedCert()
const got = firstCert(v2)
const wantHex = sha256(want)
const gotHex = sha256(got)

console.log(`  apk        ${apkPath}`)
console.log(`  signer     ${pretty(gotHex)}`)
console.log(`  committed  ${pretty(wantHex)}`)
console.log(`  schemes    v2${pairs.has(V3_BLOCK_ID) ? ' + v3' : ''}`)

if (!got.equals(want)) {
  console.error(
    '\n  FAIL the APK was NOT signed by the committed keystore.\n' +
      '       This is the per-run-key regression: builds signed by different keys\n' +
      '       cannot be installed over one another, and the uninstall that would be\n' +
      '       needed clears the save.',
  )
  process.exit(1)
}

console.log('\napk signer check: the APK carries the committed debug identity')
process.exit(0)
