# Recherche quartier (Gemini + Google Search grounding)

> Redige le 2026-03-22 — Pas encore commite

## Contexte

Les donnees de localite (prix, loyers, demographie, risques…) sont quantitatives et proviennent d'APIs publiques (DVF, INSEE, Georisques, etc.). Il manquait une couche qualitative : ambiance du quartier, forces/faiblesses pour l'investissement, projets urbains, transports detailles, securite, profil des locataires cibles.

Cette feature ajoute un bouton "Recherche quartier" dans l'onglet Localite de la page propriete. Un appel Gemini avec Google Search grounding recherche et synthetise des informations qualitatives sur le quartier, stockees comme une localite a part entiere dans le systeme existant.

**Feature premium** — gatee cote client (PremiumGateModal) et cote serveur (getAuthContext). Admin y accede aussi.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│ LocaliteTab (bouton "Recherche quartier")                │
│   isPremium=false → PremiumGateModal                     │
│   isPremium=true  → searchQuartier(propertyId)           │
└───────────────────────┬─────────────────────────────────┘
                        │ server action
┌───────────────────────▼─────────────────────────────────┐
│ searchQuartier() — locality/actions.ts                   │
│  1. Auth check (premium || admin) + ownership check      │
│  2. Find/create quartier locality (name + parent ville)  │
│  3. Check cache (locality_qualitative, 30 jours)         │
│  4. resolveLocalityData → contexte quantitatif           │
│  5. researchNeighborhood() → callGeminiWithSearch()      │
│  6. upsertLocalityData(quartier_id, fields, source)      │
│  7. Merge quartier + ville fields → return               │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│ Gemini API (v1beta) — gemini-2.5-flash                   │
│  tools: [{ googleSearch: {} }]                           │
│  Timeout: 60s                                            │
│  Prompt FR avec contexte quantitatif injecte             │
│  Retour: JSON dans bloc ```json```                       │
└─────────────────────────────────────────────────────────┘
```

### Dedup des quartiers

Un quartier est identifie par `(LOWER(name), parent_id, type='quartier')` dans la table `localities`. Quand un bien n'a pas de quartier renseigne, on utilise le nom de la ville comme fallback. Tous les biens du meme quartier partagent les memes donnees (cache 30 jours).

### Stockage

Les donnees qualitatives sont stockees dans `locality_qualitative` (nouvelle table thematique v16), rattachee a la localite quartier. Le resolver existant gere le fallback quartier → ville pour les champs manquants.

**Attention :** Le resolver marche en remontant (quartier → ville → dept → region). La recherche qualitative est stockee sur le quartier (enfant). Pour la retourner correctement, `searchQuartier` merge manuellement les champs du quartier avec ceux de la ville (via `getLatestLocalityFields(quartierId) + resolveLocalityData(city)`).

## Fichiers cles

| Fichier | Role |
|---------|------|
| `src/infrastructure/ai/gemini.ts` | Nouvelle fonction `callGeminiWithSearch` (Google Search grounding, 60s timeout) |
| `src/domains/locality/types.ts` | 9 champs `neighborhood_*` dans `LocalityDataFields` + `locality_qualitative` dans tables |
| `src/domains/locality/enrichment/research.ts` | **Nouveau** — prompt FR, appel Gemini, parse JSON, validation, mapping vers `LocalityDataFields` |
| `src/domains/locality/actions.ts` | Action `searchQuartier(propertyId, {force?})` — premium-gatee, find/create quartier, cache, upsert |
| `src/domains/locality/repository.ts` | `assembleFields` + `upsertLocalityData` etendus pour `locality_qualitative` (serialisation JSON arrays) |
| `src/infrastructure/database/client.ts` | Migration v16 — table `locality_qualitative` |
| `src/components/locality/LocalityDataView.tsx` | Section "Analyse quartier" avec vibe, forces/faiblesses, transports, securite, projets, employeurs, perspectives |
| `src/components/property/detail/LocaliteTab.tsx` | Bouton dual-mode (premium gate vs recherche reelle), loading, error, cache |
| `src/components/ui/PremiumGate.tsx` | **Nouveau** — modal + hook `usePremiumGate`, CTA mailto contact@tiili.io |
| `src/lib/auth-actions.ts` | `getAuthContext()` retourne maintenant `isPremium` (role premium ou admin) |
| `src/app/property/[id]/page.tsx` | Passe `isPremium` a `PropertyDetail` |
| `src/components/property/detail/TabNavigation.tsx` | 6e onglet "Localite" |

## Champs qualitatifs

| Champ | Type | Description |
|-------|------|-------------|
| `neighborhood_vibe` | `string` | Ambiance du quartier (2-3 phrases) |
| `neighborhood_strengths` | `string[]` | Points forts pour l'investissement |
| `neighborhood_weaknesses` | `string[]` | Points faibles / risques |
| `neighborhood_urban_projects` | `string[]` | Projets urbains en cours/prevus |
| `neighborhood_transport_details` | `string` | Description transports en commun |
| `neighborhood_safety` | `"sur"\|"moyen"\|"preoccupant"` | Perception de securite |
| `neighborhood_investment_outlook` | `string` | Analyse investissement (2-3 phrases) |
| `neighborhood_main_employers` | `string[]` | Employeurs/poles d'emploi proches |
| `neighborhood_target_tenants` | `string` | Profil locataires cibles |

Tous sont nullable et stockes dans `locality_qualitative` avec source `"ai:gemini-search"`.

## Premium gate

Deux niveaux de protection :

| Couche | Mecanisme | Fichier |
|--------|-----------|---------|
| **Client** | `isPremium` prop → `PremiumGateModal` si false | `LocaliteTab.tsx` |
| **Serveur** | `getAuthContext().isPremium` check dans `searchQuartier` | `actions.ts` |

`isPremium = role === "premium" || role === "admin"`. L'admin a toujours acces.

Pour les utilisateurs non-premium, la modal affiche un CTA `mailto:contact@tiili.io` avec le message "Fonctionnalite disponible prochainement".

## Decisions techniques

| Decision | Raison |
|----------|--------|
| Gemini + Google Search grounding (pas Perplexity) | Pas de nouvelle cle API, deja en place via `GEMINI_API_KEY` |
| `responseMimeType` absent | Incompatible avec le mode grounding — JSON parse depuis texte |
| Modele `gemini-2.5-flash` (pas flash-lite) | Flash-lite ne supporte pas les outils/grounding |
| Quartier = localite dans `localities` | Reutilise tout le systeme existant (resolver, fallback, source tracking) |
| Cache 30 jours par quartier (pas par propriete) | Evite les appels Gemini redondants pour les biens du meme quartier |
| Merge manuel quartier + ville | Le resolver remonte (enfant → parent), pas descend. Les donnees qualitatives sont sur le quartier enfant |
| Temperature 0.3 | Bon compromis : reproductibilite factuelle + qualite des descriptions |
| Timeout 60s | Google Search grounding ajoute de la latence vs appel texte standard (30s) |
| Ownership check sur le bien | Un user premium ne peut pas declencher une recherche sur le bien d'un autre user |
