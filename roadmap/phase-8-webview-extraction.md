# Phase 8 — Plugin natif WebView extraction

## Objectif

Developper un plugin Capacitor custom qui ouvre une WebView navigable dans l'app, permettant d'extraire les donnees des annonces immobilieres directement depuis les sites qui bloquent le scraping serveur.

## Probleme resolu

LeBonCoin, SeLoger, Bien'ici et d'autres sites bloquent les requetes serveur (anti-bot, Cloudflare, etc.). En ouvrant le site dans une WebView cote client, l'utilisateur navigue normalement et le plugin extrait les donnees de la page visitee.

## Fonctionnement

```
Utilisateur clique "Naviguer vers le site"
  |
  v
WebView custom s'ouvre (plein ecran)
  ├── L'utilisateur navigue normalement sur LeBonCoin/SeLoger
  ├── Bouton flottant "Importer cette annonce" (toujours visible)
  |
  v
Clic sur "Importer"
  ├── Injection JS dans la page pour extraire le DOM
  ├── Envoi du HTML a l'app
  ├── Parsing via le pipeline existant (AI ou selectors)
  ├── Creation du bien
  └── Fermeture de la WebView → redirection vers /property/{id}/edit
```

## Architecture technique

### Plugin Capacitor custom

```typescript
// plugins/webview-extractor/src/definitions.ts
export interface WebViewExtractorPlugin {
  open(options: { url: string }): Promise<void>;
  onPageLoaded(callback: (data: { url: string; title: string }) => void): void;
  extractHTML(): Promise<{ html: string; url: string }>;
  close(): Promise<void>;
}
```

### Code natif necessaire

| Plateforme | Fichier | Role |
|-----------|---------|------|
| iOS | `WebViewExtractorPlugin.swift` | WKWebView + WKNavigationDelegate |
| Android | `WebViewExtractorPlugin.kt` | Android WebView + WebViewClient |

### Communication bidirectionnelle

```
App (JS) ──── open(url) ────> WebView native
App (JS) <── onPageLoaded ── WebView native (a chaque navigation)
App (JS) ──── extractHTML() ─> WebView native (injection JS evaluateJavaScript)
App (JS) <── { html, url } ── WebView native
```

## Comparatif : plugins standard vs natif maison

| Feature | Recommandation | Justification |
|---------|---------------|---------------|
| WebView + extraction | **Natif maison** | Killer feature, aucun plugin standard ne fait ca |
| Share target | **Standard** (`@capacitor/share`) puis natif si besoin | Le standard recoit URL+texte, suffisant pour v1 |
| Clipboard | **Standard** (`@capacitor/clipboard`) | Couvre tous les cas |
| Push notifs | **Standard** (`@capacitor/push-notifications` + Firebase) | Bien documente, pas besoin de custom |
| Deep links | **Standard** (`@capacitor/app`) | Gere les URL schemes nativement |

## Fichiers a creer

| Fichier | Role |
|---------|------|
| `plugins/webview-extractor/` | Plugin Capacitor custom |
| `plugins/webview-extractor/src/definitions.ts` | Interface TypeScript |
| `plugins/webview-extractor/src/web.ts` | Fallback web (no-op ou iframe) |
| `plugins/webview-extractor/ios/` | Implementation Swift |
| `plugins/webview-extractor/android/` | Implementation Kotlin |
| `src/components/collect/WebViewImporter.tsx` | UI bouton + integration |

## Dependances

- Phase 7 terminee (Capacitor setup + CI/CD)
- Necessite `GEMINI_API_KEY` pour le parsing AI du HTML extrait
- Connaissance Swift + Kotlin pour le code natif

## Estimation effort

| Tache | Effort |
|-------|--------|
| Plugin iOS (Swift) | 1-2 jours |
| Plugin Android (Kotlin) | 1-2 jours |
| Interface TS + composant React | 0.5 jour |
| Integration pipeline scraping | 0.5 jour |
| Tests manuels multi-sites | 1 jour |
| **Total** | **3-5 jours** |
