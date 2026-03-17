#!/usr/bin/env npx tsx
/**
 * Script CLI pour générer un article de blog.
 *
 * Usage :
 *   npm run blog -- --category guide_ville --city Lyon
 *   npm run blog -- --category guide_ville --city Lyon --publish
 *   npm run blog -- --category guide_ville --city Lyon --dry-run
 *   npm run blog -- --category actu_marche
 *   npm run blog -- --help
 */

// ── Charger .env.local (tsx ne le fait pas comme Next.js) ──
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnvFile(filename: string) {
  try {
    const envPath = resolve(process.cwd(), filename);
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  } catch { /* file not found — ok */ }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

import { runPipeline, PipelineResult } from "../src/domains/blog/pipeline";
import { ARTICLE_CATEGORIES, ArticleCategory } from "../src/domains/blog/types";

// ── Parse CLI args ──

const args = process.argv.slice(2);

function getArg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return undefined;
  return args[idx + 1];
}

function hasFlag(name: string): boolean {
  return args.includes(`--${name}`);
}

// ── Help ──

if (hasFlag("help") || args.length === 0) {
  console.log(`
📝 Blog Generator — tiili.io

Usage :
  npm run blog -- --category <type> [--city <ville>] [options]

Catégories :
  guide_ville            Guide d'investissement complet (nécessite --city)
  guide_quartier         Guide quartier (nécessite --city)
  actu_marche            Actualité marché immobilier
  analyse_comparative    Comparaison entre villes
  conseil_investissement Article conseil thématique
  fiscalite              Fiscalité et dispositifs
  financement            Taux et crédit immobilier
  etude_de_cas           Simulation détaillée (nécessite --city)

Options :
  --city <ville>     Ville cible
  --postal <code>    Code postal (aide à la résolution)
  --insee <code>     Code INSEE (prioritaire sur --city)
  --publish          Publier directement (sinon brouillon)
  --no-inject        Ne pas injecter les données extraites
  --dry-run          Générer sans sauvegarder en base
  --help             Afficher cette aide

Exemples :
  npm run blog -- --category guide_ville --city Lyon
  npm run blog -- --category guide_ville --city "Saint-Étienne" --publish
  npm run blog -- --category actu_marche --dry-run
  npm run blog -- --category analyse_comparative --city "Lyon,Bordeaux"
`);
  process.exit(0);
}

// ── Validation ──

const category = getArg("category") as ArticleCategory | undefined;
const city = getArg("city");
const postalCode = getArg("postal");
const codeInsee = getArg("insee");
const autoPublish = hasFlag("publish");
const noInject = hasFlag("no-inject");
const dryRun = hasFlag("dry-run");

if (!category) {
  console.error("❌ --category est obligatoire. Utilise --help pour voir les options.");
  process.exit(1);
}

if (!ARTICLE_CATEGORIES.includes(category)) {
  console.error(`❌ Catégorie invalide : "${category}"`);
  console.error(`   Catégories valides : ${ARTICLE_CATEGORIES.join(", ")}`);
  process.exit(1);
}

const CITY_REQUIRED = ["guide_ville", "guide_quartier", "etude_de_cas"];
if (CITY_REQUIRED.includes(category) && !city && !codeInsee) {
  console.error(`❌ --city ou --insee est obligatoire pour la catégorie "${category}"`);
  process.exit(1);
}

// ── Auto-select city for cron ──

const AUTO_CITIES = [
  "Lyon", "Bordeaux", "Nantes", "Toulouse", "Marseille", "Lille",
  "Montpellier", "Rennes", "Strasbourg", "Nice", "Grenoble", "Rouen",
  "Toulon", "Dijon", "Angers", "Metz", "Clermont-Ferrand", "Tours",
  "Limoges", "Amiens", "Perpignan", "Besançon", "Orléans", "Reims",
  "Le Mans", "Caen", "Saint-Étienne", "Brest", "Le Havre", "Avignon",
];

let resolvedCity = city;
if (city === "auto") {
  // Pick a city based on the day of the year for rotation
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  resolvedCity = AUTO_CITIES[dayOfYear % AUTO_CITIES.length];
  console.log(`🎯 Sélection automatique : ${resolvedCity}`);
}

// ── Exécution ──

async function main() {
  console.log("─────────────────────────────────────────");
  console.log(`📝 Génération d'article : ${category}`);
  if (resolvedCity) console.log(`🏙️  Ville : ${resolvedCity}`);
  if (codeInsee) console.log(`🔢 Code INSEE : ${codeInsee}`);
  if (dryRun) console.log(`🧪 Mode dry-run (pas de sauvegarde)`);
  if (autoPublish) console.log(`🚀 Publication automatique`);
  if (noInject) console.log(`⏭️  Pas d'injection données`);
  console.log("─────────────────────────────────────────");

  console.log("\n⏳ Étape 1/5 : Collecte des données...");

  const result: PipelineResult = await runPipeline({
    category: category!,
    city: resolvedCity || undefined,
    postalCode,
    codeInsee,
    autoPublish,
    injectData: !noInject,
    dryRun,
    triggeredBy: "cli",
  });

  console.log("");

  if (!result.success) {
    console.error(`❌ Échec : ${result.error}`);
    console.error(`⏱️  Durée : ${(result.durationMs / 1000).toFixed(1)}s`);
    process.exit(1);
  }

  const article = result.article!;

  console.log("✅ Article généré avec succès !");
  console.log("─────────────────────────────────────────");
  console.log(`📄 Titre    : ${article.title}`);
  console.log(`🔗 Slug     : ${article.slug}`);
  console.log(`📂 Catégorie: ${article.category}`);
  console.log(`📊 Statut   : ${article.status}`);
  console.log(`📏 Contenu  : ${article.content.length} caractères`);

  const tags = JSON.parse(article.tags || "[]");
  if (tags.length > 0) {
    console.log(`🏷️  Tags     : ${tags.join(", ")}`);
  }

  if (result.injectionResult) {
    const inj = result.injectionResult;
    console.log(`\n💉 Injection données :`);
    console.log(`   Injectées : ${inj.injected} localité(s)`);
    if (inj.skipped > 0) console.log(`   Ignorées  : ${inj.skipped}`);
    if (inj.errors.length > 0) {
      for (const err of inj.errors) {
        console.log(`   ⚠️  ${err.city} : ${err.error}`);
      }
    }
  }

  console.log(`\n⏱️  Durée totale : ${(result.durationMs / 1000).toFixed(1)}s`);

  if (!dryRun) {
    console.log(`\n💾 Article sauvegardé en base (ID: ${article.id})`);
    if (article.status === "published") {
      console.log(`🌐 Article publié → /blog/${article.slug}`);
    } else {
      console.log(`📝 Article en brouillon — publie-le depuis l'admin ou avec --publish`);
    }
  }

  // En dry-run, afficher un extrait du contenu
  if (dryRun) {
    console.log("\n── Extrait de l'article (500 premiers caractères) ──");
    const text = article.content.replace(/<[^>]+>/g, "").slice(0, 500);
    console.log(text);
    console.log("...");
  }
}

main().catch((e) => {
  console.error("❌ Erreur fatale :", e);
  process.exit(1);
});
