@AGENTS.md

Comments, log messages, and the README are in French (l'utilisateur, Justok, est francophone) ; code identifiers mix French and English, comme dans `pokedeals-saas`. **L'utilisateur est débutant en programmation** : explique en français, sans jargon technique non expliqué.

## Vue d'ensemble

PokéPrécoms est un service **100% gratuit et illimité** (décision de Justok, 28/08/2026 — l'ancien modèle payant, puis le modèle "1 alerte gratuite puis abonnement", ont été abandonnés : le seuil de rentabilité visé n'était pas atteignable pour ces deux petites apps) qui alerte tous ses utilisateurs dès qu'un produit scellé Pokémon TCG (coffret, display, ETB...) passe en précommande **réellement disponible** sur l'une des boutiques françaises/japonaises surveillées. Contrairement à PokéDeals (watchlist personnalisée par carte), PokéPrécoms fonctionne en **modèle broadcast** : tous les utilisateurs inscrits reçoivent toutes les alertes, sans configuration individuelle — le dashboard n'a donc pas de formulaire d'ajout de watchlist, seulement les réglages de notification et l'historique des alertes.

## Lien avec le scraper (`justok16/pokedeals`, dépôt séparé)

Le scraper existant héberge la détection (`scraper/precommande_generique.py` + `scraper/radar_precommande_generique.py` + `scraper/scan_precommandes_generique.py`, workflow `scan_precommandes_generique.yml`, Shopify uniquement pour l'instant) — **aucun code de scraping ici**. Ce dépôt n'est que le site web (Next.js/Supabase).

`scraper/connecteur_supabase_precoms.py` (dépôt `justok16/pokedeals`) écrit les précommandes détectées dans la table `precommande_alerts` de CE projet Supabase et notifie push/email TOUS les utilisateurs inscrits (modèle broadcast) — appelé depuis `scan_precommandes_generique.py`, indépendamment de l'envoi Telegram. Secrets côté scraper : `POKEPRECOMS_SUPABASE_URL`/`POKEPRECOMS_SUPABASE_SERVICE_ROLE_KEY` (secrets GitHub Actions sur `justok16/pokedeals`, DISTINCTS de ceux de pokedeals-saas — projet Supabase différent), `VAPID_PRIVATE_KEY`/`VAPID_CLAIM_EMAIL`/`RESEND_API_KEY`/`RESEND_FROM_EMAIL` réutilisés tels quels (mêmes secrets que pour PokéDeals, décision explicite de Justok).

## Structure

Repo scaffoldé le 23/08/2026 à partir de `pokedeals-saas` (même stack : Next.js 16 App Router, Tailwind v4, Supabase SSR) — fichiers techniques (clients Supabase, `proxy.ts`, service worker, CSP) repris à l'identique, contenu (landing, dashboard, schéma DB) réécrit pour ce produit. Même identité visuelle "Vif Collector" que pokedeals-saas (cohérence de marque) : palette violet/or/magenta, polices Bungee (display) + Sora (corps).

- `app/page.tsx` — landing page
- `app/login/` — connexion OAuth (Google/GitHub)
- `app/dashboard/` — réglages notifications (push/email), historique des précommandes détectées, formulaire de retour — PAS de watchlist (modèle broadcast), gratuit et illimité pour tous
- `supabase/migrations/` — schéma SQL (`push_subscriptions`, `user_preferences`, `subscriptions` — vestige non utilisé depuis le passage au tout-gratuit, `feedback`, `precommande_alerts`)

## Icônes/branding

Identité visuelle propre créée le 23/08/2026 (`public/icons/*.png` + `app/favicon.ico`) : coffret cadeau (contour or, ruban) + étincelle magenta sur fond dégradé violet Vif Collector — même grammaire visuelle que l'icône carte à jouer de pokedeals-saas (coin arrondi, fond dégradé, contour or, étincelle) mais pictogramme et couleur d'accent différents, pour signaler la parenté de marque (cohérence pour le bundle) tout en distinguant clairement les deux apps. Variante `icon-maskable-512.png` : même pictogramme réduit à ~72% avec fond plein bord à bord (zone de sécurité pour le masque circulaire Android).

## Vérification Google Search Console

Pas encore configurée (`verification.google` absent de `app/layout.tsx`, contrairement à pokedeals-saas) — à faire une fois le site déployé sur son propre domaine/URL Vercel.
