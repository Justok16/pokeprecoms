# PokéPrécoms — SaaS

Application web (Next.js, App Router, Tailwind CSS), 100% gratuite et
illimitée, qui alerte ses utilisateurs dès qu'un produit scellé Pokémon TCG
(coffret, display, ETB...) passe en précommande réellement disponible,
détecté par le bot de scraping (`justok16/pokedeals`, public —
`scraper/precommande_generique.py` + `scraper/radar_precommande_generique.py`,
Shopify uniquement pour l'instant).

Contrairement à PokéDeals, **pas de watchlist personnalisée** : modèle
broadcast, tous les abonnés reçoivent toutes les alertes.

PWA : voir `public/sw.js`, `public/manifest` (généré via `app/manifest.ts`)
et `app/register-sw.tsx`.

## Mise en route

### 1. Projet Supabase + schéma

Le projet Supabase a déjà été créé manuellement pour ce projet. Pour
appliquer le schéma :

1. Copier `.env.example` vers `.env.local`, renseigner
   `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (**Project
   Settings > API** du dashboard Supabase).
2. Dans le dashboard Supabase (**SQL Editor**), exécuter dans l'ordre le
   contenu de chaque fichier de `supabase/migrations/` (`0001_...` à
   `0005_...`).
3. Récupérer aussi la clé `service_role` (secrète) pour
   `SUPABASE_SERVICE_ROLE_KEY` (`.env.local` + réglages Vercel).
4. Pour connecter le scraper (repo séparé `justok16/pokedeals`) à cette
   base : ajouter `POKEPRECOMS_SUPABASE_URL` (= `NEXT_PUBLIC_SUPABASE_URL`)
   et `POKEPRECOMS_SUPABASE_SERVICE_ROLE_KEY` (= `SUPABASE_SERVICE_ROLE_KEY`)
   comme secrets GitHub Actions sur `justok16/pokedeals` — le pont
   (`connecteur_supabase_precoms.py`) est construit depuis le 23/08/2026, ces
   secrets sont bien utilisés dès qu'ils sont configurés.

(`scripts/setup-supabase.sh` existe pour provisionner un projet Supabase
*à partir de zéro* via l'API — pas utile ici puisque le projet existe déjà,
gardé pour référence/un futur environnement de test séparé.)

### 2. Fournisseurs OAuth (Google + GitHub)

Dans le dashboard Supabase, **Authentication > Providers** — mêmes apps
OAuth que pokedeals-saas réutilisables si les URI de redirection Supabase
sont ajoutées en plus (Google Cloud Console / GitHub Developer Settings
acceptent plusieurs URI de callback), ou créer de nouvelles apps dédiées.

Dans **Authentication > URL Configuration**, ajouter l'URL du site
(`http://localhost:3000` en local, l'URL Vercel en prod) aux Redirect URLs.

### 3. Notifications (push + email) — optionnel

**Push** : peut réutiliser la même paire de clés VAPID que pokedeals-saas,
ou en générer une nouvelle (cf. `pokedeals-saas/README.md` section 3 pour
la commande de génération). `VAPID_PUBLIC_KEY` →
`NEXT_PUBLIC_VAPID_PUBLIC_KEY` ici, `VAPID_PRIVATE_KEY` +
`VAPID_CLAIM_EMAIL` en secrets GitHub Actions sur `justok16/pokedeals` (une
fois le pont scraper construit).

**Email** : compte [Resend](https://resend.com) — peut réutiliser le même
compte que pokedeals-saas avec une adresse d'envoi distincte (ex.
`PokéPrécoms <alertes@tondomaine.com>`), ou un compte séparé.

PokéPrécoms est 100% gratuit et illimité pour tous les utilisateurs — aucune
intégration de paiement n'est nécessaire.

### 4. Lancer en local

```bash
npm install
npm run dev
```

## Structure

- `app/page.tsx` — landing page
- `app/login/` — connexion OAuth (Google/GitHub)
- `app/dashboard/` — réglages notifications (push/email), historique des
  précommandes détectées, formulaire de retour — pas de watchlist (modèle
  broadcast), gratuit et illimité pour tous
- `supabase/migrations/` — schéma SQL (`subscriptions` est un vestige non
  utilisé depuis le passage au tout-gratuit)

## Déploiement

Prévu pour [Vercel](https://vercel.com) : connecter ce repo, renseigner les
variables d'environnement listées dans `.env.example` dans les réglages du
projet Vercel.
