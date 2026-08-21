import type { CapacitorConfig } from '@capacitor/cli'

// The Android shell wraps the SAME web build the site serves (docs/DESIGN.md
// § 7): one engine, one save format, one presentation. `webDir` is the vite
// output, which the Android build produces with VITE_BASE=./ so every asset
// reference in the bundle is relative and resolves inside the app — no network
// fetch on launch. See .github/workflows/android.yml.
const config: CapacitorConfig = {
  appId: 'com.menno420.couchlegend',
  appName: 'Couch Legend',
  webDir: 'dist',
  android: {
    // Debug-signed sideload build for now; release signing arrives with the
    // first real release ([D-0002] defers it deliberately).
    backgroundColor: '#0b1110',
  },
}

export default config
