@AGENTS.md

Comments, log messages, and the README are in French (l'utilisateur, Justok, est francophone) ; code identifiers mix French and English, comme dans `pokedeals-saas`. **L'utilisateur est débutant en programmation** : explique en français, sans jargon technique non expliqué.

## Vue d'ensemble

PokéPrécoms est un service payant (pas de niveau gratuit) qui alerte ses abonnés dès qu'un produit scellé Pokémon TCG (coffret, display, ETB...) passe en précommande **réellement disponible** sur l'une des boutiques françaises/japonaises surveillées. Contrairement à PokéDeals (watchlist personnalisée par carte), PokéPrécoms fonctionne en **modèle broadcast** : tous les abonnés actifs reçoivent toutes les alertes, sans configuration individuelle — le dashboard n'a donc pas de formulaire d'ajout de watchlist, seulement les réglages de notification, l'historique des alertes et la gestion de l'abonnement.

## Lien avec le scraper (`justok16/pokedeals`, dépôt séparé)

Le scraper existant héberge la détection (`scraper/precommande_generique.py` + `scraper/radar_precommande_generique.py` + `scraper/scan_precommandes_generique.py`, workflow `scan_precommandes_generique.yml`, Shopify uniquement pour l'instant) — **aucun code de scraping ici**. Ce dépôt n'est que le site web (Next.js/Supabase/Stripe).

**Pont construit le 23/08/2026** : `scraper/connecteur_supabase_precoms.py` (dépôt `justok16/pokedeals`) écrit les précommandes détectées dans la table `precommande_alerts` de CE projet Supabase et notifie push/email TOUS les abonnés actifs (modèle broadcast) — appelé depuis `scan_precommandes_generique.py`, indépendamment de l'envoi Telegram. Secrets côté scraper : `POKEPRECOMS_SUPABASE_URL`/`POKEPRECOMS_SUPABASE_SERVICE_ROLE_KEY` (secrets GitHub Actions sur `justok16/pokedeals`, DISTINCTS de ceux de pokedeals-saas — projet Supabase différent), `VAPID_PRIVATE_KEY`/`VAPID_CLAIM_EMAIL`/`RESEND_API_KEY`/`RESEND_FROM_EMAIL` réutilisés tels quels (mêmes secrets que pour PokéDeals, décision explicite de Justok). **Reste à faire côté toi** : ajouter `POKEPRECOMS_SUPABASE_URL`/`POKEPRECOMS_SUPABASE_SERVICE_ROLE_KEY` (Project URL + clé `service_role` de CE projet Supabase) comme secrets GitHub Actions sur le dépôt `justok16/pokedeals`, et exécuter la migration `0005_precommande_alerts_unique_url.sql` (contrainte d'unicité nécessaire à la déduplication du pont, cf. son commentaire).

## Tarification et lien avec PokéDeals

**Même compte Stripe que `pokedeals-saas`** (décision explicite de Justok, 23/08/2026) — deux produits distincts, mais un seul dashboard Stripe. `lib/stripe.ts` interroge directement l'API Stripe (`determinerCouponBundle`) pour savoir si l'email du client a déjà un abonnement PokéDeals actif, et applique automatiquement le bon coupon bundle :

- Pas d'abonnement PokéDeals → tarif plein, {PRIX_SOLO} = 7,99€/mois
- Abonnement PokéDeals actif, sans le coupon fondateur `early-bird-200` → coupon `bundle-standard` (-0,99€, soit 7,00€) → total combiné 14,99€
- Abonnement PokéDeals actif, AVEC `early-bird-200` (un des 200 premiers abonnés PokéDeals) → coupon `bundle-fondateur` (-2,99€, soit 5,00€) → total combiné 9,99€

Les 3 coupons (`early-bird-200`, `bundle-fondateur`, `bundle-standard`) sont créés à la main dans le dashboard Stripe (mode test pour l'instant), pas via l'API — cf. README.md pour le détail. **PokéPrécoms n'a PAS son propre programme fondateur indépendant** — la réduction découle uniquement du statut fondateur PokéDeals (décision explicite, pour ne pas gérer deux programmes en parallèle).

`determinerCouponBundle()` n'a pas encore été testé en conditions réelles avec un vrai abonné fondateur — à vérifier avant la mise en production (la forme exacte du champ `discount` d'un objet `Subscription` a changé entre versions de l'API Stripe, cf. commentaire dans `lib/stripe.ts`).

## Structure

Repo scaffoldé le 23/08/2026 à partir de `pokedeals-saas` (même stack : Next.js 16 App Router, Tailwind v4, Supabase SSR, Stripe) — fichiers techniques (clients Supabase, `proxy.ts`, service worker, CSP) repris à l'identique, contenu (landing, dashboard, schéma DB) réécrit pour ce produit. Même identité visuelle "Vif Collector" que pokedeals-saas (cohérence de marque pour le bundle) : palette violet/or/magenta, polices Bungee (display) + Sora (corps).

- `app/page.tsx` — landing page
- `app/login/` — connexion OAuth (Google/GitHub)
- `app/dashboard/` — réglages notifications (push/email), historique des précommandes détectées, statut d'abonnement, formulaire de retour — PAS de watchlist (modèle broadcast)
- `app/api/webhooks/stripe/` — synchronise l'état d'abonnement depuis les événements Stripe
- `lib/stripe.ts` — client Stripe + logique de tarif bundle
- `supabase/migrations/` — schéma SQL (`push_subscriptions`, `user_preferences`, `subscriptions`, `feedback`, `precommande_alerts`)

## Icônes/branding

Les fichiers `public/icons/*.png` et `app/favicon.ico` sont pour l'instant des **copies de ceux de pokedeals-saas** (placeholders) — à remplacer par une identité visuelle propre à PokéPrécoms avant le lancement public.

## Vérification Google Search Console

Pas encore configurée (`verification.google` absent de `app/layout.tsx`, contrairement à pokedeals-saas) — à faire une fois le site déployé sur son propre domaine/URL Vercel.
