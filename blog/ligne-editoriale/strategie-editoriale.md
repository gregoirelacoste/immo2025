# Strategie editoriale — Blog tiili.fr

## 1. Positionnement editorial

### Qui sommes-nous

tiili.fr est un **outil de simulation d'investissement locatif**, pas un media immobilier generaliste. Le blog est une extension naturelle de l'outil : il fournit le contexte, les donnees et l'analyse que l'investisseur a besoin de comprendre **avant et pendant** sa simulation.

Notre avantage competitif editorial :
- **Donnees proprietaires** : base `locality_data` avec ~90 champs par ville (prix segmentes, loyers, qualite de vie, fiscalite, risques), alimentee en continu
- **Calculs verifiables** : chaque chiffre de rendement ou cashflow peut etre reproduit dans le simulateur
- **Pipeline bidirectionnelle** : les articles enrichissent la base de donnees, qui enrichit les guides, qui ameliorent le SEO

### A qui on parle

**Persona principal — L'investisseur en recherche active**
- 28-50 ans, CDI ou profession liberale
- Premier ou deuxieme investissement locatif
- Cherche a comprendre ou investir, pas juste comment
- Compare des villes, des quartiers, des strategies (nu vs meuble, Pinel vs LMNP)
- Lit sur mobile (60%+), souvent le soir ou le week-end

**Persona secondaire — L'investisseur confirme**
- Deja 1-3 biens en portefeuille
- Cherche des donnees fraiches, des signaux de marche, des opportunites emergentes
- Veut des comparatifs chiffres, pas des generalites

**Persona tertiaire — Le curieux qui explore**
- N'a pas encore investi, se renseigne
- Tape "investir immobilier 2026", "meilleure ville investissement locatif"
- A besoin d'etre rassure et guide, pas pousse a l'achat

### Ton et posture

| Attribut | Ce qu'on fait | Ce qu'on ne fait pas |
|----------|---------------|----------------------|
| **Expert** | On maitrise les donnees, on cite nos sources, on explique la methode | On n'ecrase pas le lecteur de jargon non explique |
| **Accessible** | On definit les termes techniques a la premiere occurrence | On ne simplifie pas au point de perdre la precision |
| **Data-driven** | Chaque affirmation est accompagnee d'un chiffre source | On ne donne pas d'avis sans donnee pour l'etayer |
| **Neutre** | On presente les avantages ET les risques | On ne vend rien, on ne recommande aucun bien |
| **Actionnable** | On termine par un CTA vers le simulateur | On ne laisse pas le lecteur sans prochaine etape |

**Voix de marque** : un ami ingenieur qui a deja investi et qui t'explique avec des donnees, pas un commercial qui veut te vendre un Pinel.

---

## 2. Types d'articles — Templates structurels

### 2.1 — Guide ville (pilier principal)

**Objectif** : page de reference absolue pour "investir a [Ville]". Alimente massivement `locality_data`.

**Frequence** : 3-4/semaine (objectif 50 villes en 3 mois)

**Slug** : `/guide/[city]`

**Longueur** : 2 500-4 000 mots

**Structure** :

```markdown
# Investir a [Ville] en [Annee] : rendements, quartiers et donnees cles

> Derniere mise a jour : [date]. Donnees DVF, INSEE et Observatoire des loyers.

## Le marche immobilier a [Ville]
- Prix moyen au m2 : X EUR (source DVF [trimestre])
- Prix par type : studio X EUR/m2, T2-T3 X EUR/m2, T4+ X EUR/m2, maison X EUR/m2
- Evolution 1 an : +X% | Evolution 5 ans : +X%
- Nombre de transactions annuelles : X
- Delai moyen de vente : X jours
- [Tableau comparatif avec moyenne departementale et nationale]

## Marche locatif
- Loyer moyen nu : X EUR/m2 | Meuble : X EUR/m2
- Taux de vacance : X%
- Tension locative : tendu / equilibre / detendu
- Zone encadrement des loyers : oui/non (+ details si oui)
- Evolution loyers 1 an : +X%
- [Tableau loyers par type de bien]

## Rendement estime
- Rendement brut moyen : X%
- Simulation type : T2 de 45m2, achete X EUR, loue X EUR/mois
  - Rendement brut : X%
  - Cashflow mensuel estime : X EUR (avec emprunt 25 ans a X%)
- Comparaison moyenne nationale (X%)
- > Simulez ce scenario sur tiili.fr [lien]

## Location courte duree (Airbnb)
- Prix moyen nuitee : X EUR
- Taux d'occupation : X%
- Revenu mensuel estime : X EUR
- Reglementation locale (nombre de jours, enregistrement, zones)
- Comparaison revenus LCD vs location classique

## Les meilleurs quartiers pour investir
- [Quartier 1] : prix X EUR/m2, profil locataire, atouts
- [Quartier 2] : ...
- [Quartier 3] : ...
- Quartiers a eviter et pourquoi (donnees de vacance, risques)

## Demographie et economie locale
- Population : X hab. | Croissance : +X%
- Age moyen : X ans | Part etudiants : X%
- Revenu median : X EUR | Taux pauvrete : X%
- Taux de chomage : X%
- Principaux employeurs : [liste]
- Projets economiques majeurs : [liste]

## Qualite de vie
- Transports : score X/10, gare TGV oui/non, tramway/metro, temps vers [metropole]
- Education : X ecoles, X universites, taux reussite bac X%
- Sante : X medecins/10 000 hab.
- Securite : taux de delinquance X (compare a la moyenne)
- Cadre de vie : ensoleillement X h/an, espaces verts X%

## Fiscalite et dispositifs
- Taxe fonciere moyenne : X EUR/m2
- Eligible Pinel : oui/non (zone X)
- Eligible Denormandie : oui/non
- Zone ZRR : oui/non
- Loc'Avantages : oui/non
- [Tableau recapitulatif des dispositifs applicables]

## Risques
- Inondation : [niveau]
- Sismicite : zone [X]
- Risque industriel (SEVESO) : oui/non
- Radon : niveau [X]
- Retrait-gonflement argiles : [niveau]
- [Lien Georisques pour details]

## Projets urbains et perspectives
- [Projet 1] : description, echeance, impact attendu sur les prix
- [Projet 2] : ...
- Tendance generale : ville en croissance / stable / en declin

## FAQ
- Est-ce rentable d'investir a [Ville] en [annee] ?
- Quel quartier choisir pour investir a [Ville] ?
- Quel type de bien privilegier a [Ville] ?
- Faut-il investir en meuble ou en nu a [Ville] ?
- Quel est le rendement locatif moyen a [Ville] ?
- [Ville] est-elle eligible au dispositif Pinel ?

## Simulez votre investissement a [Ville]
> Retrouvez ces donnees dans le simulateur tiili.fr.
> Creez une simulation personnalisee avec vos parametres.
> [Bouton CTA]
```

**Donnees extraites** : LocalityDataFields complets (P0 + P1), donnees quartier

**JSON-LD** : `Article` + `Place` + `FAQPage`

---

### 2.2 — Guide quartier

**Objectif** : granularite plus fine que le guide ville, cible les requetes "investir quartier [X] [Ville]".

**Frequence** : 1-2/semaine (pour les grandes villes uniquement : Paris, Lyon, Marseille, Bordeaux, Toulouse, Nantes, Lille, Montpellier, Rennes, Strasbourg)

**Slug** : `/guide/[city]/[quartier]`

**Longueur** : 1 500-2 500 mots

**Structure** :

```markdown
# Investir dans le quartier [Quartier] a [Ville] : analyse complete

> Derniere mise a jour : [date]

## Presentation du quartier
- Localisation dans la ville, limites geographiques
- Ambiance, profil des habitants
- Reperez-le : [adresses/rues de reference]

## Prix immobilier dans le quartier
- Prix moyen au m2 : X EUR (vs X EUR moyenne ville)
- Evolution recente
- Types de biens disponibles (ancien, neuf, taille)

## Marche locatif
- Loyer moyen : X EUR/m2 (vs X EUR moyenne ville)
- Profil des locataires (etudiants, jeunes actifs, familles)
- Taux de vacance estime
- Demande locative : forte / moyenne / faible

## Rendement et simulation
- Rendement brut estime : X%
- Simulation type [bien specifique au quartier]
- > Simulez sur tiili.fr

## Atouts pour l'investisseur
- [Atout 1 : proximite universite, bassin emploi, etc.]
- [Atout 2]
- [Atout 3]

## Points de vigilance
- [Risque 1 : nuisances, projets controverses, etc.]
- [Risque 2]

## Transports et commodites
- Stations metro/tram/bus les plus proches
- Commerces, ecoles, sante

## Projets urbains dans le quartier
- [Projet] : impact attendu

## FAQ
- [2-3 questions specifiques au quartier]

## CTA
```

**Donnees extraites** : donnees localite niveau quartier (depth 5)

---

### 2.3 — Actualite marche

**Objectif** : capter le trafic des requetes d'actualite ("prix immobilier [mois] [annee]", "marche immobilier [ville] [annee]"). Signal de fraicheur pour Google et les IA.

**Frequence** : 2-3/semaine

**Slug** : `/blog/[slug]` (ex: `marche-immobilier-ile-de-france-t1-2026`)

**Longueur** : 800-1 500 mots

**Structure** :

```markdown
# [Titre factuel avec donnees] — [Mois/Trimestre Annee]

> Publie le [date]. Sources : DVF, [autres].

## Les chiffres cles
- [Stat 1 contextualisee]
- [Stat 2]
- [Stat 3]
- [Tableau ou graphique recapitulatif]

## Ce que ca signifie pour les investisseurs
- Impact sur les rendements
- Opportunites emergentes
- Risques a surveiller

## Zoom sur [ville ou region concernee]
- Donnees locales specifiques
- Comparaison avec la tendance nationale

## Contexte et perspectives
- Facteurs explicatifs (taux, politique, demographie)
- Previsions des experts (avec sources citees)

## FAQ
- [1-2 questions d'actualite]

## CTA
> Evaluez l'impact sur votre projet : simulez sur tiili.fr
```

**Donnees extraites** : tendances prix/loyers, mises a jour `price_trend_1y_pct`, `rent_trend_1y_pct`

---

### 2.4 — Analyse comparative

**Objectif** : repondre aux requetes de comparaison ("investir Lyon ou Bordeaux", "meilleures villes rendement locatif"). Tres performant en GEO car les IA adorent les comparaisons structurees.

**Frequence** : 1/semaine

**Slug** : `/blog/[slug]` (ex: `comparatif-lyon-bordeaux-investissement-locatif`)

**Longueur** : 1 500-2 500 mots

**Structure** :

```markdown
# [Ville A] vs [Ville B] : ou investir en [annee] ?
# OU : Top [N] des villes ou investir en [annee] selon [critere]

> Derniere mise a jour : [date]. Donnees tiili.fr, DVF, INSEE.

## Criteres de comparaison
- [Explication de la methode et des sources]

## Tableau comparatif synthetique
| Critere | Ville A | Ville B |
|---------|---------|---------|
| Prix moyen m2 | X EUR | X EUR |
| Loyer moyen m2 | X EUR | X EUR |
| Rendement brut | X% | X% |
| Vacance locative | X% | X% |
| Tension marche | tendu | equilibre |
| Population | X | X |
| Croissance demo | +X% | +X% |
| Chomage | X% | X% |
| Taxe fonciere | X EUR/m2 | X EUR/m2 |

## Analyse detaillee par critere

### Prix et accessibilite
[Comparaison argumentee]

### Rentabilite locative
[Comparaison argumentee]

### Dynamisme economique
[Comparaison argumentee]

### Qualite de vie et attractivite
[Comparaison argumentee]

## Verdict
- Ville A est preferable si : [profil investisseur / objectif]
- Ville B est preferable si : [profil investisseur / objectif]
- [Pas de "gagnant" absolu — ca depend de la strategie]

## FAQ
- [2-3 questions comparatives]

## CTA
> Comparez par vous-meme : simulez un investissement dans chaque ville sur tiili.fr
```

**Donnees extraites** : mises a jour croisees sur les villes comparees

---

### 2.5 — Conseil investissement (thematique)

**Objectif** : repondre aux questions de methode et de strategie ("comment calculer un rendement locatif", "meuble ou nu", "premier investissement locatif").

**Frequence** : 1/semaine

**Slug** : `/blog/[slug]`

**Longueur** : 1 500-3 000 mots

**Structure** :

```markdown
# [Question ou problematique claire]

> Derniere mise a jour : [date]

## Contexte
- Pourquoi cette question est importante
- A qui s'adresse cet article (debutant, confirme, tous)

## [Reponse structuree en 3-5 sections]

### [Sous-theme 1]
- Explication avec exemples chiffres
- Simulation type sur tiili.fr

### [Sous-theme 2]
- ...

### [Sous-theme 3]
- ...

## Cas pratique
- Situation concrete avec des chiffres reels
- Simulation detaillee (emprunt, loyer, cashflow)
- > Reproduisez cette simulation sur tiili.fr

## Les erreurs a eviter
- [Erreur 1 avec explication]
- [Erreur 2]
- [Erreur 3]

## A retenir
- [3-5 points cles en bullet points]

## FAQ
- [2-3 questions liees]

## CTA
```

**Donnees extraites** : aucune en general (article methodologique)

**Exemples de sujets** :
- "Rendement brut, net, net-net : comment les calculer (et lequel compte vraiment)"
- "Location meublee vs nue : comparaison chiffree pour l'investisseur"
- "Acheter un studio pour louer : bonne ou mauvaise idee en 2026 ?"
- "Investir a distance : les 7 regles d'or"
- "Comment estimer le loyer d'un bien avant d'acheter"
- "Colocation : rendement boostera ou casse-tete ? Analyse chiffree"
- "Investissement locatif et credit : combien puis-je emprunter ?"

---

### 2.6 — Fiscalite et dispositifs

**Objectif** : couvrir les requetes fiscales ("LMNP 2026", "Pinel zone B1", "deficit foncier comment ca marche"). Contenu a forte valeur ajoutee et a forte recherche.

**Frequence** : 2/mois

**Slug** : `/blog/[slug]`

**Longueur** : 1 500-2 500 mots

**Structure** :

```markdown
# [Dispositif ou sujet fiscal] : guide complet pour l'investisseur locatif [annee]

> Derniere mise a jour : [date]. Base legale : [reference BOFiP/CGI].

## Ce que dit la loi
- Principe du dispositif / du mecanisme fiscal
- Conditions d'eligibilite
- Montants et plafonds en vigueur

## Impact concret sur un investissement
- Simulation chiffree : investissement type X EUR
  - Sans le dispositif : rendement X%, impot X EUR
  - Avec le dispositif : rendement X%, impot X EUR, gain net X EUR
- > Integrez ce parametre dans votre simulation tiili.fr

## Villes / zones eligibles
- [Liste ou carte des zones concernees]
- Lien vers les guides villes eligibles

## Avantages et limites
### Avantages
- [point 1]
- [point 2]

### Limites et pieges
- [point 1]
- [point 2]

## Comment en beneficier (demarches)
- [Etape 1]
- [Etape 2]
- [Etape 3]

## FAQ
- [3-4 questions fiscales courantes]

## CTA
```

**Donnees extraites** : mises a jour des champs `pinel_eligible`, `denormandie_eligible`, `zrr`, `loc_avantages_eligible`, `rent_ceiling_pinel`

**Exemples de sujets** :
- "LMNP en 2026 : le guide complet du loueur meuble non professionnel"
- "Deficit foncier : comment reduire ses impots avec la renovation"
- "Micro-BIC ou reel : quel regime fiscal pour la location meublee ?"
- "Pinel 2026 : les villes encore eligibles et les rendements reels"
- "Taxe fonciere : les villes ou elle explose (et celles ou elle reste raisonnable)"

---

### 2.7 — Financement

**Objectif** : capter le trafic sur les taux de credit, l'assurance emprunteur, le montage financier. Sujets tres recherches et renouveles chaque mois.

**Frequence** : 2-3/mois

**Slug** : `/blog/[slug]`

**Longueur** : 1 000-2 000 mots

**Structure** :

```markdown
# [Sujet financement] : [donnee cle] — [mois annee]

> Derniere mise a jour : [date]. Sources : Banque de France, observatoires de credit.

## Les chiffres du mois
- Taux moyen sur 20 ans : X%
- Taux moyen sur 25 ans : X%
- Evolution sur 3 mois : [tendance]
- [Tableau ou graphique d'evolution]

## Impact sur un investissement locatif
- Simulation : bien a X EUR, emprunt sur 25 ans
  - A X% : mensualite X EUR, cout total X EUR
  - A X% (il y a 6 mois) : mensualite X EUR, cout total X EUR
  - Difference : X EUR/mois, X EUR sur la duree
- > Testez avec votre taux sur tiili.fr

## Strategies pour obtenir le meilleur taux
- [Conseil 1]
- [Conseil 2]
- [Conseil 3]

## Perspectives
- Previsions des analystes (avec sources)
- Faut-il attendre ou acheter maintenant ?

## FAQ
- [2-3 questions sur le financement]

## CTA
```

**Donnees extraites** : aucune directe (mais contexte utile pour les simulations)

**Exemples de sujets** :
- "Taux immobilier mars 2026 : la baisse se poursuit-elle ?"
- "Assurance emprunteur : comment economiser 10 000 EUR sur votre credit"
- "Investissement locatif sans apport : est-ce encore possible en 2026 ?"
- "Duree de credit : 20 ou 25 ans pour un investissement locatif ?"

---

### 2.8 — Etude de cas / simulation

**Objectif** : montrer le simulateur en action avec un cas reel. Le type d'article le plus "conversion" — demontre la valeur de l'outil.

**Frequence** : 2/mois

**Slug** : `/blog/[slug]`

**Longueur** : 1 200-2 000 mots

**Structure** :

```markdown
# Etude de cas : [description du bien] a [Ville] — [rendement ou resultat cle]

> Publie le [date]. Simulation realisee sur tiili.fr.

## Le bien
- Type : [T2 / studio / maison...]
- Surface : X m2
- Prix d'achat : X EUR (X EUR/m2)
- Localisation : [quartier, ville]
- Etat : [etat du bien, travaux necessaires]
- Equipements : [liste]

## Le financement
- Apport : X EUR
- Emprunt : X EUR sur X ans a X%
- Frais de notaire : X EUR
- Cout total : X EUR
- Mensualite credit : X EUR/mois

## Les revenus
- Loyer estime (nu) : X EUR/mois
- Loyer estime (meuble) : X EUR/mois
- Loyer Airbnb estime : X EUR/mois (occupation X%)
- Regime fiscal choisi : [LMNP / foncier reel / micro]

## Les charges
- Charges copro : X EUR/mois
- Taxe fonciere : X EUR/an
- Assurance PNO : X EUR/an
- Assurance GLI : X EUR/an
- Provision travaux : X EUR/mois

## Resultats de la simulation
| Indicateur | Valeur |
|-----------|--------|
| Rendement brut | X% |
| Rendement net | X% |
| Cashflow mensuel | X EUR |
| Cout total credit | X EUR |
| Plus-value estimee a 10 ans | X EUR |
| ROI global a 10 ans | X% |

## Analyse
- Points forts de cet investissement
- Points de vigilance
- Comparaison avec le marche local ([Ville])
- Variantes testees (meuble vs nu, duree credit...)

## Ce qu'on en retient
- [3 enseignements generalisables]

## CTA
> Reproduisez cette simulation avec vos propres parametres sur tiili.fr
> [Screenshot ou lien vers la simulation]
```

**Donnees extraites** : validation des donnees de marche de la ville concernee

---

## 3. Calendrier editorial

### 3.1 — Frequence cible par type

| Type | Frequence | Articles/mois |
|------|-----------|---------------|
| Guide ville | 3-4/semaine | 14-16 |
| Guide quartier | 1-2/semaine | 5-8 |
| Actu marche | 2-3/semaine | 10-12 |
| Analyse comparative | 1/semaine | 4 |
| Conseil investissement | 1/semaine | 4 |
| Fiscalite & dispositifs | 2/mois | 2 |
| Financement | 2-3/mois | 2-3 |
| Etude de cas | 2/mois | 2 |
| **Total** | | **~43-51/mois** |

Note : ce rythme est soutenu par la generation IA (pipeline Gemini). La publication quotidienne est assuree par le cron, la validation humaine est concentree sur les guides ville et les etudes de cas.

### 3.2 — Planning type semaine

| Jour | Publication principale | Publication secondaire |
|------|----------------------|----------------------|
| **Lundi** | Guide ville | Actu marche |
| **Mardi** | Conseil investissement | Actu marche |
| **Mercredi** | Guide ville | Guide quartier |
| **Jeudi** | Analyse comparative | Actu marche |
| **Vendredi** | Guide ville | Guide quartier |
| **Samedi** | Etude de cas OU Fiscalite | — |
| **Dimanche** | — (pas de publication) | — |

Le week-end est le pic de lecture pour le persona investisseur (temps libre). Les publications du samedi ont un meilleur engagement.

### 3.3 — Planning type mois

**Semaine 1** :
- Lun : Guide ville (grande ville — ex: Toulouse)
- Mar : Conseil ("Comment calculer le rendement net-net")
- Mer : Guide ville (ville moyenne — ex: Angers) + Guide quartier (Lyon — La Part-Dieu)
- Jeu : Analyse comparative ("Lyon vs Toulouse : ou investir ?") + Actu marche
- Ven : Guide ville (petite ville — ex: Limoges) + Guide quartier (Paris — 18e)
- Sam : Etude de cas ("T2 a Bordeaux Bastide — 6.8% brut")

**Semaine 2** :
- Lun : Guide ville (grande ville — ex: Nantes) + Actu marche
- Mar : Conseil ("Location meublee vs nue : le match chiffre")
- Mer : Guide ville (ville moyenne — ex: Metz) + Guide quartier (Marseille — Joliette)
- Jeu : Analyse comparative ("Top 10 des villes ou le cashflow est positif") + Actu marche
- Ven : Guide ville (petite ville — ex: Saint-Brieuc) + Guide quartier (Bordeaux — Chartrons)
- Sam : Fiscalite ("LMNP en 2026 : ce qui change")

**Semaine 3** :
- Lun : Guide ville + Actu marche
- Mar : Financement ("Taux immobilier mars 2026 : etat des lieux") + Actu marche
- Mer : Guide ville + Guide quartier
- Jeu : Analyse comparative + Actu marche
- Ven : Guide ville + Guide quartier
- Sam : Etude de cas

**Semaine 4** :
- Lun : Guide ville + Actu marche
- Mar : Conseil investissement
- Mer : Guide ville + Guide quartier
- Jeu : Analyse comparative + Actu marche
- Ven : Guide ville + Guide quartier
- Sam : Financement OU Fiscalite

### 3.4 — Saisonnalite

| Periode | Focus editorial | Raison |
|---------|----------------|--------|
| **Janvier** | Bilans annuels, predictions, "ou investir en [annee]" | Nouvelles resolutions, recherche "investir [annee]" au pic |
| **Fevrier-Mars** | Guides villes, fiscalite (declaration revenus approche) | Preparation declarations, reprise marche apres fetes |
| **Avril-Mai** | Fiscalite (declarations en cours), financement (taux) | Declaration IR, forte activite credit |
| **Juin** | Villes etudiantes, location meublee, Airbnb ete | Rentree universitaire se prepare, saison estivale LCD |
| **Juillet-Aout** | Guides villes vacances (sud, littoral), LCD | Vacances = visites, Airbnb haute saison |
| **Septembre** | Rentrée, villes etudiantes, marche locatif | Forte activite locative, rentree |
| **Octobre-Novembre** | Optimisation fiscale, dispositifs de fin d'annee | Derniere ligne droite pour defiscaliser |
| **Decembre** | Bilan annuel marche, perspectives annee suivante | Retrospective, anticipation |

**Marronniers annuels** (articles a planifier chaque annee) :
- Janvier : "Les X meilleures villes ou investir en [annee]"
- Mars : "Bilan du marche immobilier : les chiffres du T4 [annee-1]"
- Avril : "Declaration de revenus locatifs [annee] : le guide complet"
- Juin : "Les X meilleures villes etudiantes pour investir"
- Septembre : "Marche locatif rentree [annee] : les chiffres"
- Octobre : "Defiscalisation immobiliere : les options avant le 31 decembre"
- Decembre : "Retrospective marche immobilier [annee] + perspectives [annee+1]"

---

## 4. Charte redactionnelle — DO and DON'T

### 4.1 — Ton et style

**DO :**
- Tutoyer le lecteur (coherent avec le positionnement "ami expert")
- Phrases courtes et directes. Un paragraphe = une idee.
- Commencer les articles par une donnee ou un fait, pas par une question rhetorique
- Utiliser la voix active : "Le rendement brut atteint 5.2%" (pas "Un rendement brut de 5.2% est atteint")
- Structurer avec des titres H2/H3 descriptifs : "Prix immobilier a Lyon : 4 200 EUR/m2 en moyenne" (pas "Le marche lyonnais")
- Utiliser des listes a puces pour les donnees et les comparaisons
- Terminer chaque article par un CTA vers le simulateur, formule naturellement

**DON'T :**
- Vouvoyer (sauf articles strictement juridiques/fiscaux ou le "vous" est d'usage)
- Utiliser des superlatifs vagues : "extraordinaire", "incroyable", "exceptionnel"
- Commencer par "Dans cet article, nous allons voir..." ou "L'immobilier est un placement..."
- Ecrire des paragraphes de plus de 5 lignes
- Utiliser des emojis dans le corps de texte
- Utiliser le conditionnel sans raison : "Le rendement pourrait etre de 5%" → "Le rendement brut moyen est de 5.2% (donnees DVF T3 2025)"

### 4.2 — Utilisation des donnees chiffrees

**DO :**
- Toujours indiquer la source et la date : "4 200 EUR/m2 en moyenne (DVF, T3 2025)"
- Arrondir intelligemment : "5.2%" (pas "5.1847%"), "4 200 EUR" (pas "4 217 EUR")
- Contextualiser chaque chiffre : "4 200 EUR/m2, soit 12% de moins que la moyenne des metropoles francaises"
- Utiliser des fourchettes quand la donnee est incertaine : "entre 4.5% et 5.5% de rendement brut"
- Presenter les tableaux comparatifs pour toute comparaison de plus de 2 elements
- Indiquer les tendances avec le sens et l'amplitude : "+3.2% sur un an" (pas juste "en hausse")

**DON'T :**
- Donner un chiffre sans source
- Presenter un chiffre isole sans contexte (comparaison, tendance, moyenne)
- Melanger des chiffres de periodes differentes sans le preciser
- Utiliser "environ" quand on a un chiffre precis
- Presenter des previsions comme des certitudes : "Les prix vont augmenter de 5%" → "Les analystes anticipent une hausse de 3 a 5% (source : [X])"

### 4.3 — Sources a citer / ne pas citer

**Sources a citer (fiables, ouvertes, verifiables)** :
- DVF (Demande de Valeurs Foncieres) — prix de vente reels
- INSEE — donnees demographiques, economiques
- Observatoire des Loyers (CLAMEUR, OLAP) — loyers de marche
- Georisques — risques naturels et technologiques
- Banque de France — taux de credit
- ADEME — diagnostics energetiques
- ANIL — reglementation logement
- BOFiP — textes fiscaux officiels
- Notaires de France — indices des prix
- tiili.fr (nos propres donnees) — toujours preciser "donnees tiili.fr" ou "base de donnees tiili.fr"

**Sources a utiliser avec precaution (citer la source primaire si possible)** :
- Etudes de SeLoger, MeilleursAgents, PAP (donnees propriétaires, methodologies opaques)
- Presse generaliste (Le Figaro, Capital) — ok pour les citations d'experts, pas pour les chiffres
- AirDNA — ok si pas d'alternative, preciser que c'est une estimation

**Sources a ne JAMAIS citer** :
- Agents immobiliers individuels ou reseaux d'agences (conflit d'interet)
- Promoteurs immobiliers (parti pris)
- "Selon une etude" sans nommer l'etude
- Wikipedia (pas une source primaire)
- Forums, commentaires, reseaux sociaux

### 4.4 — Formulations optimisees GEO

Les moteurs IA (Gemini, ChatGPT, Perplexity) extraient le contenu differemment de Google. Voici les regles pour maximiser les citations IA :

**DO — Formulations assertives avec donnees** :
- "Le rendement brut moyen a Lyon est de 5.2% en 2025, selon les donnees DVF et l'Observatoire des loyers."
- "Nantes est la 3e ville francaise en termes de rendement locatif pour les T2, avec un rendement brut moyen de 6.1%."
- "La taxe fonciere moyenne a Marseille s'eleve a 1 450 EUR pour un T3, soit 35% de plus que la moyenne nationale."
- "En 2025, il faut compter en moyenne 4 200 EUR/m2 pour acheter a Lyon, contre 3 100 EUR/m2 a Saint-Etienne."

**DO — Phrases "prete a citer"** :
- Commencer les paragraphes par la reponse directe, puis developper
- Ecrire des phrases autonomes (comprehensibles hors contexte)
- Inclure le nom de la ville + le chiffre + la source dans la meme phrase
- Utiliser "selon [source]" ou "d'apres les donnees [source]"

**DO — Structuration pour extraction IA** :
- Sections FAQ avec question en H3 et reponse directe en premier paragraphe
- Tableaux de donnees (les IA savent tres bien lire les tableaux Markdown/HTML)
- Listes ordonnees pour les classements
- Resume en bullet points en fin d'article ("A retenir")

**DON'T — Formulations que les IA ignorent** :
- "On pourrait dire que Lyon est une ville interessante" (trop vague, non citable)
- "Il est important de noter que..." (remplissage)
- "Comme chacun le sait..." (presupposition)
- Paragraphes longs sans chiffre (les IA sautent au prochain bloc structuré)

### 4.5 — Ce qu'on ne fait JAMAIS

| Interdit | Raison | Alternative |
|----------|--------|-------------|
| Promettre un rendement garanti | Trompeur, potentiellement illegal | "Le rendement brut moyen constate est de X%" |
| Conseil fiscal personnalise | Exercice illegal de conseil fiscal | "Consultez un expert-comptable pour votre situation" |
| Recommander un bien specifique | Conflit d'interet, responsabilite | "Voici les criteres a analyser" |
| Recommander un courtier, agent, promoteur | Conflit d'interet | Mentionner les institutions (ANIL, notaires) |
| Dire "le meilleur investissement" | Subjectif, clickbait | "L'investissement le plus rentable en rendement brut" |
| Minimiser les risques | Irresponsable | Toujours une section "Points de vigilance" |
| Utiliser "placement sur" ou "garanti" | Termes reserves aux produits financiers reglementes | "Investissement", "patrimoine" |
| Donner des objectifs de plus-value chiffres | Speculatif | "Evolution historique : +X% sur 5 ans" |
| Clickbait en titre | Detruit la credibilite | Titres factuels avec donnees |
| Copier du contenu d'autres sites | SEO penalisant, ethique | Toujours rediger a partir de donnees sources |
| Publier sans verifier les chiffres | Credibilite | Validation obligatoire sur les guides villes |

### 4.6 — Regles de mise en forme

- **Nombres** : EUR avec espace insecable (4 200 EUR), pourcentages avec % colle (5.2%)
- **Villes** : toujours le nom officiel, majuscule (Lyon, Saint-Etienne, La Rochelle)
- **Dates** : "mars 2026", "T1 2026", "1er trimestre 2026" (pas "03/2026")
- **Tableaux** : obligatoires pour toute comparaison de 3+ elements
- **Liens internes** : au moins 3 par article (guide ville, article lie, simulateur)
- **Liens externes** : vers sources officielles uniquement (DVF, INSEE, BOFiP, Georisques)
- **Images** : toujours un `alt` descriptif incluant la ville et le sujet
- **Meta description** : 150-160 caracteres, inclut la ville et le mot-cle principal
- **Titre H1** : inclut la ville, l'annee, et un chiffre ou une promesse factuelle

---

## 5. Taxonomie

### 5.1 — Categories (exclusives — un article = une categorie)

| Slug categorie | Label | Description |
|---------------|-------|-------------|
| `guide-ville` | Guide ville | Page reference pour investir dans une ville |
| `guide-quartier` | Guide quartier | Analyse d'un quartier specifique |
| `actu-marche` | Actualite marche | Chiffres et tendances du marche immobilier |
| `analyse` | Analyse comparative | Comparaisons entre villes, regions, strategies |
| `conseil` | Conseil investissement | Methodologie, strategie, bonnes pratiques |
| `fiscalite` | Fiscalite & dispositifs | Regimes fiscaux, Pinel, LMNP, deficit foncier |
| `financement` | Financement | Taux, credit, assurance, montage financier |
| `etude-de-cas` | Etude de cas | Simulation detaillee d'un investissement reel |

### 5.2 — Tags (multiples — un article a 2-5 tags)

**Tags geographiques** :
- Ville : `lyon`, `bordeaux`, `nantes`, `toulouse`, `marseille`, `lille`, `montpellier`, `rennes`, `strasbourg`, `paris`, ...
- Region : `auvergne-rhone-alpes`, `nouvelle-aquitaine`, `bretagne`, `ile-de-france`, `occitanie`, `hauts-de-france`, `grand-est`, `pays-de-la-loire`, `paca`, ...
- Categorisation : `grande-ville` (>200K), `ville-moyenne` (50K-200K), `petite-ville` (<50K), `ville-etudiante`, `ville-littorale`, `ville-montagne`

**Tags thematiques** :
- Type de bien : `studio`, `t2`, `t3-t4`, `maison`, `immeuble-de-rapport`, `parking`
- Strategie : `location-nue`, `location-meublee`, `airbnb`, `colocation`, `achat-revente`
- Profil : `premier-investissement`, `investisseur-confirme`, `expatrie`
- Fiscalite : `lmnp`, `lmp`, `pinel`, `denormandie`, `deficit-foncier`, `sci`, `micro-bic`, `micro-foncier`, `reel`
- Finance : `taux-credit`, `assurance-emprunteur`, `apport`, `effet-de-levier`, `cashflow`
- Marche : `tendance-prix`, `tendance-loyers`, `tension-locative`, `vacance-locative`
- Criteres : `rendement`, `cashflow-positif`, `plus-value`, `patrimoine`

### 5.3 — Organisation du contenu et maillage

**Hierarchie des pages** :

```
/guide                          → Index des guides villes (tableau, carte, filtres)
/guide/[city]                   → Guide ville complet
/guide/[city]/[quartier]        → Guide quartier

/blog                           → Index blog (paginé, filtrable)
/blog/[slug]                    → Article individuel
/blog/categorie/[categorie]     → Liste par categorie
/blog/tag/[tag]                 → Liste par tag
/blog/ville/[city]              → Tous les articles sur une ville
```

**Regles de maillage interne** :

1. **Guide ville** → lie vers :
   - Guides quartier de la meme ville
   - Guides des villes voisines ou comparables
   - Articles blog recents sur cette ville
   - Page simulateur

2. **Article blog** → lie vers :
   - Guide de la ville mentionnee (toujours)
   - 1-2 articles de la meme categorie
   - 1 article d'une categorie differente (si pertinent)
   - Page simulateur (CTA)

3. **Guide quartier** → lie vers :
   - Guide ville parent (toujours)
   - Autres quartiers de la meme ville
   - Articles blog sur la ville

4. **Page simulateur** → lie vers :
   - Guide de la ville saisie par l'utilisateur (si existant)

**Regles de tagging** :

- Minimum 2 tags par article, maximum 5
- Au moins 1 tag geographique pour tout article lie a une localite
- Au moins 1 tag thematique
- Ne pas creer de tag utilise par moins de 3 articles (regrouper)

### 5.4 — Nommage et conventions URL

| Element | Convention | Exemple |
|---------|-----------|---------|
| Slug ville | Minuscule, tirets, sans accent | `saint-etienne`, `aix-en-provence` |
| Slug quartier | Minuscule, tirets | `la-part-dieu`, `vieux-lyon` |
| Slug article | 3-6 mots cles, tirets | `taux-immobilier-mars-2026`, `investir-lyon-meilleurs-quartiers` |
| Categorie | Slug fixe (cf. 5.1) | `guide-ville`, `actu-marche` |
| Tag | Slug minuscule, tirets | `premier-investissement`, `lmnp` |

---

## Annexe — Checklist de validation avant publication

### Guide ville

- [ ] Tous les chiffres ont une source et une date
- [ ] Tableau comparatif prix par type de bien present
- [ ] Section quartiers avec au moins 3 quartiers
- [ ] Section FAQ avec au moins 4 questions
- [ ] JSON-LD Article + Place + FAQPage
- [ ] Meta description 150-160 chars avec ville + annee
- [ ] Au moins 3 liens internes (guide voisin, article lie, simulateur)
- [ ] CTA vers le simulateur en fin d'article
- [ ] `extracted_data` JSON valide et conforme a LocalityDataFields
- [ ] Relecture humaine effectuee

### Article blog

- [ ] Titre H1 factuel avec donnee cle
- [ ] Introduction avec la reponse/donnee principale en 2 lignes
- [ ] Chiffres sources et dates
- [ ] Au moins 1 section FAQ
- [ ] JSON-LD Article (+ FAQPage si FAQ)
- [ ] Meta description
- [ ] Au moins 2 liens internes
- [ ] CTA vers le simulateur
- [ ] Tags conformes a la taxonomie (2-5)
- [ ] Categorie correcte (une seule)
