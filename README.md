# PokéPrécoms — SaaS

Application web (Next.js, App Router, Tailwind CSS) qui alerte ses abonnés
dès qu'un produit scellé Pokémon TCG (coffret, display, ETB...) passe en
précommande réellement disponible, détecté par le bot de scraping
(`justok16/pokedeals`, public — `scraper/precommande_generique.py` +
`scraper/radar_precommande_generique.py`, Shopify uniquement pour
l'instant).

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
   `0004_...`).
3. Récupérer aussi la clé `service_role` (secrète) pour
   `SUPABASE_SERVICE_ROLE_KEY` (`.env.local` + réglages Vercel).
4. Pour connecter le scraper (repo séparé) à cette base : ajouter
   `SUPABASE_URL` (= `NEXT_PUBLIC_SUPABASE_URL`) et
   `SUPABASE_SERVICE_ROLE_KEY` comme secrets GitHub Actions sur
   `justok16/pokedeals` — **pont pas encore construit côté scraper** (cf.
   `CLAUDE.md`), ces secrets ne servent à rien tant que ce module n'existe
   pas.

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

### 4. Abonnement payant (Stripe)

**MÊME compte Stripe que pokedeals-saas** (décision explicite, cf.
`CLAUDE.md`) — permet à `lib/stripe.ts` de détecter automatiquement un
abonnement PokéDeals existant pour appliquer le tarif bundle.

1. **Product catalog > Add product** : nouveau produit (ex. "PokéPrécoms"),
   prix récurrent mensuel **7,99€**. Copier l'ID du prix (`price_...`) →
   `STRIPE_PRICE_ID`.
2. Noter aussi l'ID du prix PokéDeals existant (`pokedeals-saas/.env.local`,
   `STRIPE_PRICE_ID`) → `POKEDEALS_STRIPE_PRICE_ID` ici.
3. **Coupons** (mode test d'abord) — déjà créés le 23/08/2026 :
   - `bundle-fondateur` : -2,99€, durée **forever**
   - `bundle-standard` : -0,99€, durée **forever**
   - `early-bird-200` (PokéDeals, déjà existant) : -3,00€, durée
     **forever**, max 200 rédemptions
4. **Developers > API keys** → `STRIPE_SECRET_KEY`
5. **Developers > Webhooks > Add endpoint** : URL
   `<ton-domaine>/api/webhooks/stripe`, événements
   `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted` → `STRIPE_WEBHOOK_SECRET`
6. Renseigner `SUPABASE_SERVICE_ROLE_KEY` (nécessaire au webhook)

En mode test Stripe, utiliser la carte `4242 4242 4242 4242` (n'importe
quelle date future, n'importe quel CVC).

### 5. Lancer en local

```bash
npm install
npm run dev
```

## Structure

- `app/page.tsx` — landing page
- `app/login/` — connexion OAuth (Google/GitHub)
- `app/dashboard/` — réglages notifications (push/email), historique des
  précommandes détectées, statut d'abonnement, formulaire de retour — pas
  de watchlist (modèle broadcast)
- `app/api/webhooks/stripe/` — synchronise l'état d'abonnement
- `lib/stripe.ts` — client Stripe + logique de tarif bundle
  (`determinerCouponBundle`)
- `supabase/migrations/` — schéma SQL

## Déploiement

Prévu pour [Vercel](https://vercel.com) : connecter ce repo, renseigner les
variables d'environnement listées dans `.env.example` dans les réglages du
projet Vercel.
