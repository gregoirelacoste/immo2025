# Immo2025

Simulateur d'investissement locatif — Next.js + Supabase

## Fonctionnalités

- Formulaire de saisie complet : infos du bien, prêt immobilier, frais de notaire, location classique, Airbnb
- Calcul automatique : rentabilité brute/nette, cash-flow mensuel, mensualités de crédit
- Frais de notaire auto-calculés (~7.5% ancien, ~2.5% neuf)
- Dashboard avec tableau triable par rentabilité, cash-flow, prix
- Multi-utilisateurs avec authentification Supabase
- Historique sauvegardé par utilisateur

## Setup

### 1. Installer les dépendances

```bash
npm install
```

### 2. Configurer Supabase

Créer un projet sur [supabase.com](https://supabase.com), puis copier le fichier d'environnement :

```bash
cp .env.local.example .env.local
```

Remplir `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` avec les valeurs de votre projet Supabase.

### 3. Créer la table

Aller dans l'éditeur SQL de Supabase et exécuter le contenu de `supabase/migrations/001_create_properties.sql`.

### 4. Lancer le projet

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

## Stack

- **Next.js** (App Router)
- **TypeScript**
- **Tailwind CSS v4**
- **Supabase** (Auth + PostgreSQL + RLS)
