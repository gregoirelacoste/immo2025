# Guide d'inscription Apple Developer & Google Play Console

## TL;DR

| Store | Cout | Delai d'activation | Obligatoire pour merger ? |
|-------|------|---------------------|--------------------------|
| Apple Developer | 99€/an | 24-48h (parfois plus si verification manuelle) | **Non** |
| Google Play Console | 25$ une fois | 48h (verification identite) | **Non** |

**Rien n'est obligatoire pour merger.** Le workflow CI/CD ne se declenche que quand tu crees un tag `v*` (via `npm run release`). Sans comptes store, le merge n'a aucun impact.

---

## 1. Apple Developer Program

### 1.1 — Creer un Apple ID (si pas deja fait)

1. Aller sur https://appleid.apple.com
2. Creer un compte avec une adresse email valide
3. Activer l'authentification a deux facteurs (obligatoire)

### 1.2 — S'inscrire au programme developpeur

1. Aller sur https://developer.apple.com/programs/enroll/
2. Choisir **individuel** (ou organisation si tu as une entreprise)
3. Fournir :
   - Nom complet
   - Adresse
   - Piece d'identite (pour la verification)
4. Payer **99€/an**
5. Attendre l'activation (24-48h en general)

### 1.3 — Creer l'App ID

1. Aller sur https://developer.apple.com/account/resources/identifiers/list
2. Cliquer **+** → **App IDs** → **App**
3. Remplir :
   - Description : `Immo2025`
   - Bundle ID : `com.immo2025.app` (explicit)
4. Cocher les capabilities necessaires (aucune specifique pour l'instant)
5. Enregistrer

### 1.4 — Creer l'app sur App Store Connect

1. Aller sur https://appstoreconnect.apple.com
2. **Mes apps** → **+** → **Nouvelle app**
3. Remplir :
   - Plateforme : iOS
   - Nom : `Immo2025`
   - Langue principale : Francais
   - Bundle ID : selectionner `com.immo2025.app`
   - SKU : `immo2025`
4. Creer

### 1.5 — Generer une cle API App Store Connect

C'est cette cle qui permet au CI/CD de publier automatiquement.

1. Aller sur https://appstoreconnect.apple.com/access/integrations/api
2. Cliquer **+** pour generer une nouvelle cle
3. Nom : `CI Fastlane`
4. Acces : **App Manager**
5. Telecharger le fichier `.p8` (une seule fois !)
6. Noter le **Key ID** et l'**Issuer ID** affiches sur la page

### 1.6 — Configurer les secrets GitHub

```
ASC_API_KEY_ID     = le Key ID note ci-dessus
ASC_ISSUER_ID      = l'Issuer ID note ci-dessus
ASC_KEY_CONTENT    = le contenu du fichier .p8 (copier-coller le texte)
```

### 1.7 — Configurer match (code signing)

Match stocke les certificats et profils dans un repo Git prive.

```bash
# Creer un repo prive sur GitHub (ex: immo2025-certificates)
# Puis :
cd ios/App
bundle exec fastlane match init
# Choisir "git" comme storage
# Entrer l'URL du repo prive
```

Puis :
```bash
# Generer les certificats (une seule fois)
bundle exec fastlane match appstore
```

Configurer les secrets :
```
MATCH_GIT_URL   = https://github.com/tonuser/immo2025-certificates.git
MATCH_PASSWORD  = le mot de passe choisi lors du setup match
```

---

## 2. Google Play Console

### 2.1 — Creer un compte developpeur

1. Aller sur https://play.google.com/console/signup
2. Se connecter avec un compte Google
3. Accepter les conditions
4. Payer **25$** (paiement unique)
5. Verification d'identite :
   - Photo d'une piece d'identite
   - Delai : environ 48h

### 2.2 — Creer l'application

1. Dans la Play Console → **Creer une application**
2. Remplir :
   - Nom : `Immo2025`
   - Langue : Francais
   - Type : Application
   - Gratuite/Payante : Gratuite (pour l'instant)
3. Remplir les sections obligatoires :
   - **Contenu de l'application** → declarations de confidentialite
   - **Fiche Store** → description, captures d'ecran, icone

### 2.3 — Generer le keystore de signature

```bash
keytool -genkey -v \
  -keystore immo2025-release.keystore \
  -alias immo2025 \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

Repondre aux questions (nom, organisation, etc.).

**IMPORTANT :** ce keystore est definitif. Si tu le perds, tu ne pourras plus mettre a jour l'app. Sauvegarde-le dans un endroit sur.

### 2.4 — Activer Google Play App Signing

1. Play Console → ton app → **Configuration** → **Integrite de l'application**
2. Choisir **Google gere ta cle de signature**
3. Uploader ta cle ou laisser Google en generer une

### 2.5 — Creer un service account pour le CI/CD

1. Aller sur https://console.cloud.google.com
2. Creer un projet (ou utiliser un existant)
3. **IAM & Admin** → **Service Accounts** → **Creer**
   - Nom : `fastlane-ci`
   - Role : aucun (les perms se configurent cote Play Console)
4. Creer une cle JSON → telecharger le fichier
5. Dans la **Play Console** → **Parametres** → **Acces API**
   - Lier le projet Google Cloud
   - Inviter le service account
   - Lui donner le role **Release manager**
   - Accepter l'invitation

### 2.6 — Configurer les secrets GitHub

```bash
# Encoder le keystore en base64
base64 -i immo2025-release.keystore | pbcopy
```

```
KEYSTORE_BASE64             = le keystore encode en base64
KEYSTORE_PASSWORD           = le mot de passe du keystore
KEY_ALIAS                   = immo2025
KEY_PASSWORD                = le mot de passe de la cle
PLAY_SERVICE_ACCOUNT_JSON   = le contenu du fichier JSON du service account
```

---

## 3. Checklist finale avant premier release

- [ ] Compte Apple Developer actif
- [ ] App creee sur App Store Connect
- [ ] Cle API .p8 generee + secrets GitHub configures
- [ ] Match initialise + repo certificats cree
- [ ] Compte Google Play Console actif
- [ ] App creee sur Play Console + fiche Store remplie
- [ ] Keystore genere + sauvegarde securisee
- [ ] Service account cree + lie a Play Console
- [ ] Tous les secrets GitHub configures
- [ ] Premier test : `npm version patch && npm run release`

---

## 4. Chronologie recommandee

```
Jour 1 : Inscription Apple Developer + Google Play Console
         (les verifications prennent 24-48h)

Jour 2-3 : En attendant les activations :
           - Generer le keystore Android
           - Preparer les captures d'ecran / icone
           - Remplir les fiches Store

Jour 3-4 : Une fois les comptes actifs :
           - Creer les apps sur les deux stores
           - Configurer match (iOS)
           - Creer le service account (Android)
           - Configurer tous les secrets GitHub

Jour 4 : Premier npm run release → build CI → TestFlight + Play Store internal
```
