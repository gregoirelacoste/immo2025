# Mobile Release Setup Guide

## Prerequis

### Comptes necessaires
- **Apple Developer** (99$/an) — pour iOS/TestFlight
- **Google Play Console** (25$ une fois) — pour Android

### Secrets GitHub a configurer

#### Android
| Secret | Description |
|--------|-------------|
| `KEYSTORE_BASE64` | Keystore encode en base64 |
| `KEYSTORE_PASSWORD` | Mot de passe du keystore |
| `KEY_ALIAS` | Alias de la cle (ex: `immo2025`) |
| `KEY_PASSWORD` | Mot de passe de la cle |
| `PLAY_SERVICE_ACCOUNT_JSON_PATH` | Chemin vers le service account JSON |

#### iOS
| Secret | Description |
|--------|-------------|
| `ASC_API_KEY_ID` | App Store Connect API Key ID |
| `ASC_ISSUER_ID` | App Store Connect Issuer ID |
| `ASC_KEY_CONTENT` | Contenu du fichier .p8 |
| `MATCH_PASSWORD` | Mot de passe pour dechiffrer les certificats |
| `MATCH_GIT_URL` | URL du repo prive contenant les certificats |

## Generer le keystore Android

```bash
keytool -genkey -v \
  -keystore immo2025-release.keystore \
  -alias immo2025 \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

Encoder en base64 pour GitHub Secrets :
```bash
base64 -i immo2025-release.keystore | pbcopy
```

## Flow de release

```bash
# 1. Bump la version
npm version patch   # ou minor/major

# 2. Sync et tag
npm run release

# 3. Push (declenche le workflow)
git push --tags
```

Le workflow build automatiquement :
- **Android** → AAB → Play Store (internal track)
- **iOS** → IPA → TestFlight

Promotion vers production : manuellement depuis les consoles.

## Structure des fichiers Capacitor

```
immo2025/
├── capacitor.config.ts          # Config Capacitor (WebView sur Vercel)
├── ios/
│   └── App/
│       ├── Gemfile              # Ruby deps (fastlane + cocoapods)
│       └── fastlane/
│           ├── Fastfile         # Lanes iOS (deploy → TestFlight)
│           ├── Appfile          # App identifier
│           └── Matchfile        # Code signing via match
├── android/
│   ├── Gemfile                  # Ruby deps (fastlane)
│   └── fastlane/
│       ├── Fastfile             # Lanes Android (deploy → Play Store)
│       └── Appfile              # Package name + service account
├── scripts/
│   └── bump-version.js          # Sync version package.json → natif + tag git
└── .github/
    └── workflows/
        └── mobile-release.yml   # CI/CD declenche sur tag v*
```

## Premiere installation locale

```bash
# Installer les deps Capacitor
npm install

# Generer les projets natifs
npx cap add ios
npx cap add android

# Synchroniser
npm run cap:sync

# Ouvrir dans l'IDE
npm run cap:ios      # ouvre Xcode
npm run cap:android  # ouvre Android Studio
```
