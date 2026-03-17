# Phase 7 — Capacitor + CI/CD stores automatise

## Objectif

Empaqueter Immo2025 en app native iOS/Android via Capacitor, et automatiser les builds + deployements sur Play Store et App Store via GitHub Actions + Fastlane.

## Strategie globale

L'app Capacitor fonctionne en mode **WebView sur URL Vercel** (pas d'export statique). Les server actions, la DB Turso et le scraping IA continuent de tourner cote serveur. Capacitor sert de "coque native" pour :
- Presence sur les stores
- Acces aux APIs natives (push notifs, share extension, clipboard)
- OTA updates via Capgo (90% des mises a jour sans rebuild store)

## Etapes

### 7.1 — Setup Capacitor (1 jour)

**Installer les dependances :**
```bash
npm install @capacitor/core @capacitor/cli
npx cap init "Immo2025" "com.immo2025.app"
npm install @capacitor/ios @capacitor/android
npx cap add ios
npx cap add android
```

**Configuration `capacitor.config.ts` :**
```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.immo2025.app',
  appName: 'Immo2025',
  webDir: 'out', // fallback statique pour offline
  server: {
    url: process.env.CAP_SERVER_URL || 'https://immo2025.vercel.app',
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      androidScaleType: 'CENTER_CROP',
    },
  },
};

export default config;
```

**Scripts npm a ajouter :**
```json
{
  "cap:sync": "npx cap sync",
  "cap:ios": "npx cap open ios",
  "cap:android": "npx cap open android",
  "release": "node scripts/bump-version.js && git push --tags"
}
```

### 7.2 — Signing & Credentials (1 jour)

**iOS :**
- Compte Apple Developer (99$/an)
- Certificats geres via `fastlane match` (stockes dans un repo prive)
- App Store Connect API key (fichier `.p8`)
- Secrets GitHub : `ASC_API_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_CONTENT`, `MATCH_PASSWORD`, `MATCH_GIT_URL`

**Android :**
- Keystore : `keytool -genkey -v -keystore immo2025-release.keystore -alias immo2025 -keyalg RSA -keysize 2048`
- Compte Google Play Console (25$ une fois)
- Service account JSON pour l'upload API
- Secrets GitHub : `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`, `PLAY_SERVICE_ACCOUNT_JSON`

### 7.3 — Fastlane setup (1 jour)

**`ios/App/fastlane/Fastfile` :**
```ruby
default_platform(:ios)

platform :ios do
  desc "Build and push to TestFlight"
  lane :deploy do
    setup_ci
    match(type: "appstore", readonly: true)
    increment_build_number(xcodeproj: "App.xcodeproj")
    build_app(scheme: "App", export_method: "app-store")
    upload_to_testflight(skip_waiting_for_build_processing: true)
  end
end
```

**`android/fastlane/Fastfile` :**
```ruby
default_platform(:android)

platform :android do
  desc "Build and push to Play Store internal track"
  lane :deploy do
    gradle(task: "clean bundleRelease")
    upload_to_play_store(
      track: "internal",
      aab: "../android/app/build/outputs/bundle/release/app-release.aab",
      skip_upload_metadata: true,
      skip_upload_images: true,
      skip_upload_screenshots: true
    )
  end
end
```

### 7.4 — GitHub Actions workflow (1 jour)

**`.github/workflows/mobile-release.yml` :**
```yaml
name: Mobile Release

on:
  push:
    tags: ['v*']

concurrency:
  group: mobile-release-${{ github.ref }}
  cancel-in-progress: true

jobs:
  build-android:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 17
      - run: npm ci
      - run: npx cap sync android
      - name: Decode keystore
        run: echo "${{ secrets.KEYSTORE_BASE64 }}" | base64 -d > android/app/immo2025-release.keystore
      - name: Build & deploy
        run: cd android && bundle exec fastlane deploy
        env:
          KEYSTORE_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
          KEY_ALIAS: ${{ secrets.KEY_ALIAS }}
          KEY_PASSWORD: ${{ secrets.KEY_PASSWORD }}
      - name: Upload to Play Store
        uses: r0adkll/upload-google-play@v1
        with:
          serviceAccountJsonPlainText: ${{ secrets.PLAY_SERVICE_ACCOUNT_JSON }}
          packageName: com.immo2025.app
          releaseFiles: android/app/build/outputs/bundle/release/app-release.aab
          track: internal

  build-ios:
    runs-on: macos-latest
    timeout-minutes: 45
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx cap sync ios
      - uses: ruby/setup-ruby@v1
        with:
          ruby-version: 3.2
          bundler-cache: true
          working-directory: ios/App
      - name: Build & deploy to TestFlight
        run: cd ios/App && bundle exec fastlane deploy
        env:
          APP_STORE_CONNECT_API_KEY_KEY_ID: ${{ secrets.ASC_API_KEY_ID }}
          APP_STORE_CONNECT_API_KEY_ISSUER_ID: ${{ secrets.ASC_ISSUER_ID }}
          APP_STORE_CONNECT_API_KEY_KEY: ${{ secrets.ASC_KEY_CONTENT }}
          MATCH_PASSWORD: ${{ secrets.MATCH_PASSWORD }}
          MATCH_GIT_URL: ${{ secrets.MATCH_GIT_URL }}
```

### 7.5 — Versioning automatique (quelques heures)

**`scripts/bump-version.js` :**
```javascript
// Lit la version de package.json apres npm version patch/minor/major
// Met a jour :
// - capacitor.config.ts (version)
// - android/app/build.gradle (versionName + versionCode)
// - ios/App/App.xcodeproj (CFBundleShortVersionString + CFBundleVersion)
// Puis : git add . && git commit && git tag vX.Y.Z
```

Flow de release :
```
npm version patch          # bumpe package.json + cree tag git
node scripts/bump-version  # sync capacitor + natif
git push --tags            # declenche GitHub Actions
  ├── Android → AAB → Play Store (internal)
  └── iOS → IPA → TestFlight
```

Promotion internal → production se fait manuellement depuis les consoles (automatisable plus tard).

### 7.6 — OTA Updates avec Capgo (quelques heures)

```bash
npm install @capgo/capacitor-updater
npx cap sync
```

**Avantage majeur :** 90% des updates (UI, calculs, bug fixes) se deploient instantanement sans repasser par les stores. Seuls les changements natifs (nouveau plugin, permissions) necessitent un build store.

**Integration CI :** ajouter un job dans le workflow qui pousse le bundle web vers Capgo apres chaque merge sur `main`.

**Note :** l'ancien 7.7 (plugin WebView extraction) a ete deplace en **Phase 8**.

## Fichiers a creer

| Fichier | Role |
|---------|------|
| `capacitor.config.ts` | Configuration Capacitor |
| `ios/` | Projet Xcode (genere par `cap add ios`) |
| `android/` | Projet Android (genere par `cap add android`) |
| `ios/App/fastlane/Fastfile` | Lanes iOS (build + TestFlight) |
| `ios/App/fastlane/Matchfile` | Config match pour certificats |
| `android/fastlane/Fastfile` | Lanes Android (build + Play Store) |
| `.github/workflows/mobile-release.yml` | CI/CD release mobile |
| `scripts/bump-version.js` | Sync versions package.json → natif |

## Fichiers a modifier

| Fichier | Changement |
|---------|-----------|
| `package.json` | Ajouter dependances Capacitor + scripts |
| `.gitignore` | Ajouter `ios/App/Pods/`, `android/.gradle/`, etc. |
| `next.config.ts` | Potentiellement `output: "export"` pour le fallback offline |

## Dependances

- Aucune dependance sur les phases 1-6 (peut etre fait en parallele)
- Necessite un compte Apple Developer + Google Play Console
## Estimation effort total

| Etape | Effort |
|-------|--------|
| 7.1 Setup Capacitor | 1 jour |
| 7.2 Signing & credentials | 1 jour |
| 7.3 Fastlane | 1 jour |
| 7.4 GitHub Actions | 1 jour |
| 7.5 Versioning auto | quelques heures |
| 7.6 Capgo OTA (non prioritaire) | quelques heures |
| **Total** | **~4-5 jours** |
