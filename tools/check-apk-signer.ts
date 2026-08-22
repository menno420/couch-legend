/**
 * Asserts an APK was signed by the identity this repo pins — and that the
 * signature is real, not merely a matching certificate sitting in a field.
 *
 * The failure this exists to catch: an APK builds green but carries a signing
 * identity nobody pinned. Measured 2026-08-21 (#13) and re-verified 2026-08-22
 * — with no committed keystore, Gradle mints a fresh debug key per build
 * machine, so four CI runs produced four distinct signer certificates. An APK
 * signed by a different key REFUSES to install over an installed one, and the
 * only way through is an uninstall, which clears app storage — the player's
 * save. That makes repeated delivery to a real phone (milestone B's device
 * matrix) impossible.
 *
 * Three things must agree, and the third is the one that matters:
 *
 *   1. the certificate inside the APK,
 *   2. the certificate in `android/keystore/debug.keystore`,
 *   3. `android/keystore/debug-signer-sha256.txt` — an INDEPENDENT pin.
 *
 * (3) exists because (1)+(2) alone check only same-build consistency, not the
 * cross-build stability this is for: regenerate the keystore and both move
 * together, the check stays green, and every phone holding an earlier build
 * quietly loses the ability to update. The pin turns that into a red build.
 * Changing the identity is then a deliberate two-file diff. (Codex P1 on #14.)
 *
 * It also verifies the v2 signature cryptographically, so a corrupted or
 * tampered signature cannot pass merely by carrying intact certificate bytes,
 * and it requires EXACTLY ONE signer — Android treats the whole signer set as
 * the package identity, so an APK with an extra signer is not update-compatible
 * with a single-signer one even if the first certificate matches.
 *
 * Boundary, stated so a pass is not over-read: this verifies the signature over
 * the v2 *signed-data* block. It does not recompute the content digests over
 * the APK's chunks, which is `apksigner verify`'s job (no Android SDK here) and
 * Android's at install time.
 *
 * No Android SDK required — the APK Signing Block is parsed directly (the
 * recipe recorded in docs/CAPABILITIES.md). Modern AGP emits no
 * `META-INF/*.RSA`, so an absent JAR signature is NOT evidence of an unsigned
 * APK.
 *
 * Run: `pnpm check:apk-signer <path-to.apk>` (both android jobs run it
 * immediately after `assembleDebug`).
 */
import { execFileSync } from 'node:child_process'
import { constants, createHash, createPublicKey, verify as cryptoVerify } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const REPO = new URL('..', import.meta.url).pathname
const KEYSTORE = join(REPO, 'android/keystore/debug.keystore')
const PIN = join(REPO, 'android/keystore/debug-signer-sha256.txt')
const STOREPASS = 'android'
const ALIAS = 'androiddebugkey'

const APK_SIG_BLOCK_MAGIC = 'APK Sig Block 42'
const V2_BLOCK_ID = 0x7109871a
const V3_BLOCK_ID = 0xf05368c0

/** v2 signature algorithm IDs → how to verify them. */
const ALGORITHMS: Record<number, { hash: string; padding?: number; saltLength?: number }> = {
  0x0101: { hash: 'sha256', padding: constants.RSA_PKCS1_PSS_PADDING, saltLength: 32 },
  0x0102: { hash: 'sha512', padding: constants.RSA_PKCS1_PSS_PADDING, saltLength: 64 },
  0x0103: { hash: 'sha256', padding: constants.RSA_PKCS1_PADDING },
  0x0104: { hash: 'sha512', padding: constants.RSA_PKCS1_PADDING },
  0x0201: { hash: 'sha256' },
  0x0202: { hash: 'sha512' },
  0x0301: { hash: 'sha256' },
}

const failures: string[] = []
const checks: string[] = []
const fail = (m: string) => failures.push(m)
const pass = (m: string) => checks.push(m)

const sha256 = (b: Buffer) => createHash('sha256').update(b).digest('hex').toUpperCase()
const pretty = (hex: string) => (hex.match(/../g) ?? []).join(':')

function report(): never {
  for (const c of checks) console.log(`  ok   ${c}`)
  for (const f of failures) console.error(`  FAIL ${f}`)
  if (failures.length > 0) {
    console.error(`\napk signer check: ${failures.length} failure(s)`)
    process.exit(1)
  }
  console.log(`\napk signer check: ${checks.length} checks passed — the APK carries the pinned identity`)
  process.exit(0)
}

const apkPath = process.argv[2]
if (!apkPath) {
  console.error('usage: pnpm check:apk-signer <path-to.apk>')
  process.exit(2)
}
if (!existsSync(apkPath)) {
  console.error(`no APK at ${apkPath}`)
  process.exit(2)
}

/** The certificate the committed keystore holds, DER-encoded. */
function keystoreCert(): Buffer {
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

/** Split a length-prefixed sequence of length-prefixed elements. */
function elements(seq: Buffer): Buffer[] {
  const out: Buffer[] = []
  let p = 0
  while (p + 4 <= seq.length) {
    const len = seq.readUInt32LE(p)
    if (len < 0 || p + 4 + len > seq.length) throw new Error('malformed length-prefixed sequence')
    out.push(seq.subarray(p + 4, p + 4 + len))
    p += 4 + len
  }
  return out
}

/** field at `p`: uint32 length then that many bytes. */
function field(buf: Buffer, p: number): { value: Buffer; next: number } {
  if (p + 4 > buf.length) throw new Error('truncated length-prefixed field')
  const len = buf.readUInt32LE(p)
  if (p + 4 + len > buf.length) throw new Error('length-prefixed field runs past its container')
  return { value: buf.subarray(p + 4, p + 4 + len), next: p + 4 + len }
}

const apk = readFileSync(apkPath)
let pairs: Map<number, Buffer>
try {
  pairs = signingBlock(apk)
} catch (err) {
  fail((err as Error).message)
  report()
}

const v2 = pairs.get(V2_BLOCK_ID)
if (!v2) {
  fail(
    `no APK Signature Scheme v2 block (0x${V2_BLOCK_ID.toString(16)}) — ` +
      `found ids ${[...pairs.keys()].map((i) => '0x' + i.toString(16)).join(', ')}`,
  )
  report()
}

console.log(`  apk        ${apkPath}`)
console.log(`  schemes    v2${pairs.has(V3_BLOCK_ID) ? ' + v3' : ''}`)

// 1 — exactly one signer. Android treats the whole signer set as the package
//     identity, so an extra signer breaks update-compatibility with a
//     single-signer build even when the first certificate matches.
const signers = elements(field(v2, 0).value)
if (signers.length !== 1) {
  fail(`expected exactly 1 signer, found ${signers.length} — the signer set IS the package identity`)
  report()
}
pass('exactly one signer')

const signedDataF = field(signers[0], 0)
const signaturesF = field(signers[0], signedDataF.next)
const publicKeyF = field(signers[0], signaturesF.next)
const signedData = signedDataF.value

// signed data := digests | certificates | attributes, each length-prefixed
const digestsF = field(signedData, 0)
const certsF = field(signedData, digestsF.next)
const certs = elements(certsF.value)
if (certs.length !== 1) {
  fail(`expected exactly 1 certificate in the signer, found ${certs.length}`)
  report()
}

// 2 — the APK's certificate, the committed keystore's, and the independent pin
//     must ALL agree. See the header: (1)+(2) alone would only prove same-build
//     consistency, which is not what this protects.
const apkCert = certs[0]
const apkHex = sha256(apkCert)
const ksHex = sha256(keystoreCert())
const pinHex = existsSync(PIN) ? readFileSync(PIN, 'utf8').trim().replace(/[^0-9A-Fa-f]/g, '').toUpperCase() : ''

console.log(`  apk cert   ${pretty(apkHex)}`)
console.log(`  keystore   ${pretty(ksHex)}`)
console.log(`  pinned     ${pinHex ? pretty(pinHex) : '(missing)'}`)

if (!pinHex) {
  fail(`no pinned fingerprint at ${PIN} — without it a regenerated keystore would pass silently`)
} else if (pinHex.length !== 64) {
  fail(`pinned fingerprint is not a 64-char SHA-256: ${pinHex.length} hex chars`)
} else {
  if (apkHex !== pinHex) {
    fail(
      'the APK certificate does not match the PINNED identity — either this APK was not built ' +
        'from the committed keystore, or the keystore was replaced without updating the pin. ' +
        'Builds signed by different keys cannot be installed over one another, and the uninstall ' +
        'that would force clears the save.',
    )
  } else {
    pass('APK certificate matches the pinned identity')
  }
  if (ksHex !== pinHex) {
    fail(
      'the COMMITTED KEYSTORE does not match the pinned identity — the keystore appears to have ' +
        'been regenerated or replaced. Every already-installed build becomes un-updatable. If this ' +
        'is deliberate, update android/keystore/debug-signer-sha256.txt in the same commit and say why.',
    )
  } else {
    pass('committed keystore matches the pinned identity')
  }
}

// 3 — the signature is real, not just a matching certificate sitting in a field.
try {
  const publicKey = createPublicKey({ key: publicKeyF.value, format: 'der', type: 'spki' })
  let verified = 0
  for (const sig of elements(signaturesF.value)) {
    const algoId = sig.readUInt32LE(0)
    const spec = ALGORITHMS[algoId]
    if (!spec) {
      fail(`unknown v2 signature algorithm 0x${algoId.toString(16)}`)
      continue
    }
    const bytes = field(sig, 4).value
    const opts: Record<string, unknown> = { key: publicKey }
    if (spec.padding !== undefined) opts.padding = spec.padding
    if (spec.saltLength !== undefined) opts.saltLength = spec.saltLength
    if (!cryptoVerify(spec.hash, signedData, opts as never, bytes)) {
      fail(`v2 signature (algorithm 0x${algoId.toString(16)}) does NOT verify against the signer's public key`)
    } else {
      verified++
    }
  }
  if (verified === 0) fail('no v2 signature could be verified')
  else pass(`${verified} v2 signature(s) cryptographically verified against the signer's public key`)
} catch (err) {
  fail(`could not verify the v2 signature: ${(err as Error).message}`)
}

report()
