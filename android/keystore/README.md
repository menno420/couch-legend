# The committed debug signing identity

`debug.keystore` is the **one** key every APK from this repo is signed with, and
`debug-signer-sha256.txt` pins the SHA-256 of the certificate it holds.

Two files, deliberately. `tools/check-apk-signer.ts` requires the APK, the
keystore and the pin to **all three** agree. Deriving the expected value from the
keystore alone would not protect what this exists to protect: if the keystore
were ever regenerated, the APK and the keystore would both carry the new
certificate, the check would stay green — and every phone holding an earlier
build would silently lose the ability to update, which costs the save. The pin is
the independent baseline that makes that regeneration a **red build** instead of
a quiet break.

**Changing the identity is therefore a deliberate two-file diff** — replace the
keystore *and* the pin, in one commit, with a reason. Anyone holding an older
build then pays a one-time uninstall, and must export their save code first
(`src/lib/save.ts`, in-game settings).

The password (`android`) and alias (`androiddebugkey`) are the Android debug
convention and are public by design. This is not a secret, and it is not a Play
upload key — Play rejects debug-signed builds — so it forecloses nothing about
release signing ([D-0002]).
