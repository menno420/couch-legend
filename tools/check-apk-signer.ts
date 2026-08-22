/**
 * Asserts an APK was signed by the identity this repo pins — that the signature
 * is real, that the key which made it is the key inside the pinned certificate,
 * and that no second signer or second signing block can smuggle a different
 * identity past the check.
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
 * Changing the identity is then a deliberate two-file diff — see
 * `android/keystore/README.md`. **Never update the pin to silence a red build.**
 *
 * Every other rule here exists because a review round found a way past an
 * earlier version of this file (Codex, #14 rounds 1–2), and each is a way an
 * APK could carry the pinned certificate while the DEVICE resolves a different
 * package identity:
 *
 *  - duplicate signing-block IDs — Android takes the FIRST matching block; a
 *    map keyed by id silently kept the last, so an unpinned signer could sit in
 *    front of a pinned one. Duplicates are now rejected outright.
 *  - the v3 block — Android 9+ prefers v3 for package identity. Validating only
 *    v2 would let a pinned v2 signer escort an unpinned v3 signer. EVERY scheme
 *    block present is validated against the same pin.
 *  - the signer's declared public key — the signature was verified against
 *    `publicKey` from the signer record, which an attacker controls. It is now
 *    verified against the public key carried INSIDE the pinned certificate, and
 *    the declared key must equal it, which is what Android enforces.
 *  - digest/signature algorithm agreement — the ordered algorithm lists in the
 *    `digests` and `signatures` records must match, or Android rejects the
 *    signer even though the signature itself verifies.
 *
 * THREAT MODEL, stated because it decides what belongs here. This runs in CI on
 * an APK our own workflow assembled from our own source seconds earlier. What it
 * defends against is a **build-provenance regression** — the pipeline quietly
 * ceasing to use the committed key (a regenerated keystore, a dropped signing
 * config, a scheme we forgot to validate). It is NOT an adversarial APK
 * verifier: nothing here assumes a party crafting a hostile APK, because at this
 * point in the pipeline there is no such party.
 *
 * That boundary is a decision, not an oversight, and three review rounds pushed
 * against it (Codex, #14). Deliberately NOT implemented, each because it is only
 * reachable by an attacker authoring the APK, never by our own build drifting:
 * validating the EOCD comment length to reject a counterfeit end-of-directory
 * record; comparing v3's inner and outer minSDK/maxSDK copies; and enforcing the
 * `0xbeeff00d` stripping-protection attribute. All three are real properties that
 * Android checks and that `apksigner verify` would cover — they are just not this
 * check's job. If a build ever ships from somewhere less trusted than this
 * workflow, revisit that reasoning before trusting a pass.
 *
 * Boundary, stated so a pass is not over-read: this verifies signatures over
 * each scheme's *signed-data* block. It does not recompute the content digests
 * over the APK's chunks — that is `apksigner verify`'s job (no Android SDK
 * here) and Android's at install time. A pass means "carries the pinned
 * identity", not "is intact".
 *
 * Run: `pnpm check:apk-signer <path-to.apk>` (both android jobs run it
 * immediately after `assembleDebug`).
 */
import { execFileSync } from 'node:child_process'
import { constants, createHash, verify as cryptoVerify, X509Certificate } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const REPO = new URL('..', import.meta.url).pathname
const KEYSTORE = join(REPO, 'android/keystore/debug.keystore')
const PIN = join(REPO, 'android/keystore/debug-signer-sha256.txt')
const STOREPASS = 'android'
const ALIAS = 'androiddebugkey'

const APK_SIG_BLOCK_MAGIC = 'APK Sig Block 42'

/** Scheme blocks that establish package identity, and their signer layout. */
const SCHEMES = [
  { id: 0x7109871a, name: 'v2', sdkFieldsAfterSignedData: 0 },
  { id: 0xf05368c0, name: 'v3', sdkFieldsAfterSignedData: 2 },
  // v3.1 (Android 13+, signing-key rotation). Listed for the same reason as v3:
  // if AGP ever emits it, a checker that only knew v2/v3 would silently ignore
  // the block those devices actually take identity from.
  { id: 0x1b93ad61, name: 'v3.1', sdkFieldsAfterSignedData: 2 },
]

/** v2/v3 signature algorithm IDs → how to verify them. */
const ALGORITHMS: Record<
  number,
  { hash: string; keyType: string; padding?: number; saltLength?: number }
> = {
  0x0101: { hash: 'sha256', keyType: 'rsa', padding: constants.RSA_PKCS1_PSS_PADDING, saltLength: 32 },
  0x0102: { hash: 'sha512', keyType: 'rsa', padding: constants.RSA_PKCS1_PSS_PADDING, saltLength: 64 },
  0x0103: { hash: 'sha256', keyType: 'rsa', padding: constants.RSA_PKCS1_PADDING },
  0x0104: { hash: 'sha512', keyType: 'rsa', padding: constants.RSA_PKCS1_PADDING },
  0x0201: { hash: 'sha256', keyType: 'ec' },
  0x0202: { hash: 'sha512', keyType: 'ec' },
  0x0301: { hash: 'sha256', keyType: 'dsa' },
}

const failures: string[] = []
const checks: string[] = []
const fail = (m: string) => failures.push(m)
const pass = (m: string) => checks.push(m)

const sha256 = (b: Buffer) => createHash('sha256').update(b).digest('hex').toUpperCase()
const pretty = (hex: string) => (hex.match(/../g) ?? []).join(':')
const hex4 = (n: number) => '0x' + n.toString(16)

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
 * The APK Signing Block sits immediately before the ZIP central directory:
 *   uint64 size | (uint64 len, uint32 id, value)* | uint64 size | 16-byte magic
 *
 * Returned as an ordered list, NOT a map — Android resolves an id to its FIRST
 * occurrence, so collapsing duplicates would hide the very trick that matters.
 */
function signingBlock(apk: Buffer): { id: number; value: Buffer }[] {
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

  const out: { id: number; value: Buffer }[] = []
  let p = start + 8
  const end = cdOffset - 24
  while (p < end) {
    const len = Number(apk.readBigUInt64LE(p))
    if (len < 4 || p + 8 + len > cdOffset) throw new Error('malformed id-value pair')
    out.push({ id: apk.readUInt32LE(p + 8), value: apk.subarray(p + 12, p + 8 + len) })
    p += 8 + len
  }
  return out
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
let blocks: { id: number; value: Buffer }[]
try {
  blocks = signingBlock(apk)
} catch (err) {
  fail((err as Error).message)
  report()
}

console.log(`  apk        ${apkPath}`)

// 0 — duplicate scheme blocks. Android takes the first; a checker that took the
//     last would validate a pinned signer while the device used an unpinned one.
const seen = new Map<number, number>()
for (const b of blocks) seen.set(b.id, (seen.get(b.id) ?? 0) + 1)
const dupes = [...seen.entries()].filter(([, n]) => n > 1)
if (dupes.length > 0) {
  fail(
    `duplicate signing-block id(s): ${dupes.map(([id, n]) => `${hex4(id)} ×${n}`).join(', ')} — ` +
      'Android resolves an id to its FIRST occurrence, so a duplicate can hide an unpinned signer',
  )
  report()
}

const present = SCHEMES.filter((s) => seen.has(s.id))
console.log(`  schemes    ${present.length ? present.map((s) => s.name).join(' + ') : '(none)'}`)
if (present.length === 0) {
  fail(
    `no v2 or v3 signing block — found ids ${[...seen.keys()].map(hex4).join(', ')}. ` +
      'Neither scheme means no pinnable package identity.',
  )
  report()
}
pass(`no duplicate signing-block ids; ${present.length} identity scheme(s) present`)

// The pin, read once. Everything below is compared against it.
const ksHex = sha256(keystoreCert())
const pinHex = existsSync(PIN)
  ? readFileSync(PIN, 'utf8').trim().replace(/[^0-9A-Fa-f]/g, '').toUpperCase()
  : ''
console.log(`  keystore   ${pretty(ksHex)}`)
console.log(`  pinned     ${pinHex ? pretty(pinHex) : '(missing)'}`)

if (!pinHex) {
  fail(`no pinned fingerprint at ${PIN} — without it a regenerated keystore would pass silently`)
  report()
}
if (pinHex.length !== 64) {
  fail(`pinned fingerprint is not a 64-char SHA-256: ${pinHex.length} hex chars`)
  report()
}
if (ksHex !== pinHex) {
  fail(
    'the COMMITTED KEYSTORE does not match the pinned identity — it appears to have been ' +
      'regenerated or replaced. Every already-installed build becomes un-updatable. If this is ' +
      'deliberate, update android/keystore/debug-signer-sha256.txt in the same commit and say why.',
  )
} else {
  pass('committed keystore matches the pinned identity')
}

// Every identity-bearing scheme present must independently carry the pin.
for (const scheme of present) {
  const block = blocks.find((b) => b.id === scheme.id)!.value
  try {
    const signers = elements(field(block, 0).value)
    if (signers.length !== 1) {
      fail(`${scheme.name}: expected exactly 1 signer, found ${signers.length} — the signer set IS the identity`)
      continue
    }
    const signer = signers[0]

    const signedDataF = field(signer, 0)
    // v3 inserts minSDK/maxSDK (uint32 each) between signed data and signatures.
    let p = signedDataF.next + 4 * scheme.sdkFieldsAfterSignedData
    const signaturesF = field(signer, p)
    const publicKeyF = field(signer, signaturesF.next)
    const signedData = signedDataF.value

    // signed data := digests | certificates | ... (v3 adds minSDK/maxSDK before attrs)
    const digestsF = field(signedData, 0)
    const certsF = field(signedData, digestsF.next)
    const certs = elements(certsF.value)
    if (certs.length !== 1) {
      fail(`${scheme.name}: expected exactly 1 certificate, found ${certs.length}`)
      continue
    }

    const apkCert = certs[0]
    const apkHex = sha256(apkCert)
    console.log(`  ${scheme.name} cert    ${pretty(apkHex)}`)
    if (apkHex !== pinHex) {
      fail(
        `${scheme.name}: the certificate does not match the PINNED identity — either this APK was not ` +
          'built from the committed keystore, or the keystore was replaced without updating the pin.',
      )
      continue
    }
    pass(`${scheme.name}: certificate matches the pinned identity`)

    // The key that actually signed must be the key INSIDE the pinned
    // certificate — not the signer's own declared public key, which is
    // attacker-controlled. Android enforces exactly this.
    const certKey = new X509Certificate(apkCert).publicKey
    const certSpki = certKey.export({ type: 'spki', format: 'der' })
    if (!certSpki.equals(publicKeyF.value)) {
      fail(
        `${scheme.name}: the signer's declared public key differs from the public key inside the pinned ` +
          'certificate — the pinned certificate did not sign this APK',
      )
      continue
    }
    pass(`${scheme.name}: declared public key equals the pinned certificate's public key`)

    // The ordered algorithm lists in digests and signatures must correspond, or
    // Android rejects the signer even when the signature itself verifies.
    const digestAlgs = elements(digestsF.value).map((d) => d.readUInt32LE(0))
    const sigAlgs = elements(signaturesF.value).map((s) => s.readUInt32LE(0))
    if (digestAlgs.length === 0 || sigAlgs.length === 0) {
      fail(`${scheme.name}: empty digest or signature record list`)
      continue
    }
    if (digestAlgs.length !== sigAlgs.length || digestAlgs.some((a, i) => a !== sigAlgs[i])) {
      fail(
        `${scheme.name}: digest algorithms [${digestAlgs.map(hex4).join(', ')}] do not match ` +
          `signature algorithms [${sigAlgs.map(hex4).join(', ')}]`,
      )
      continue
    }
    pass(`${scheme.name}: digest and signature algorithm lists agree (${sigAlgs.map(hex4).join(', ')})`)

    // And the signatures verify, against the certificate's key.
    let verified = 0
    for (const sig of elements(signaturesF.value)) {
      const algoId = sig.readUInt32LE(0)
      const spec = ALGORITHMS[algoId]
      if (!spec) {
        fail(`${scheme.name}: unknown signature algorithm ${hex4(algoId)}`)
        continue
      }
      // Node infers the key family from the key itself, so a record labelled
      // ECDSA but filled with an RSA signature would verify here and be
      // rejected on device. Bind the label to the key.
      const family = (certKey.asymmetricKeyType ?? '').replace(/-pss$/, '')
      if (family !== spec.keyType) {
        fail(
          `${scheme.name}: signature record claims ${hex4(algoId)} (${spec.keyType.toUpperCase()}) but the ` +
            `pinned certificate holds a ${family.toUpperCase() || 'unknown'} key`,
        )
        continue
      }
      const opts: Record<string, unknown> = { key: certKey }
      if (spec.padding !== undefined) opts.padding = spec.padding
      if (spec.saltLength !== undefined) opts.saltLength = spec.saltLength
      if (!cryptoVerify(spec.hash, signedData, opts as never, field(sig, 4).value)) {
        fail(`${scheme.name}: signature (${hex4(algoId)}) does NOT verify against the pinned certificate's key`)
      } else {
        verified++
      }
    }
    if (verified === 0) fail(`${scheme.name}: no signature could be verified`)
    else pass(`${scheme.name}: ${verified} signature(s) verified against the pinned certificate's key`)
  } catch (err) {
    fail(`${scheme.name}: ${(err as Error).message}`)
  }
}

report()
