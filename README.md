# PokéPrécoms

Application web (Next.js 16, App Router, Tailwind CSS v4, PWA) qui alerte
automatiquement dès qu'un produit scellé Pokémon TCG (coffret, display,
ETB, booster/blister, pokébox/tin...) passe en **précommande réellement
disponible** (commandable, pas juste annoncée) sur l'une des 110+ boutiques
françaises et japonaises surveillées.

**100% gratuit et illimité pour tous les utilisateurs, sans exception** —
toutes les précommandes détectées, sans abonnement, sans carte bancaire.
L'ancien modèle payant (puis "1 alerte gratuite, ensuite abonnement") a été
abandonné le 28/08/2026 : le seuil de rentabilité visé n'était pas
atteignable pour ces deux petites apps. La table `subscriptions` héritée du
webhook Stripe (jamais implémenté ici) a été supprimée pour de bon en
migration `0011_drop_subscriptions.sql`.

## Modèle broadcast (≠ PokéDeals)

PokéPrécoms est le service **sœur** de [PokéDeals](https://pokedeals-rho.vercel.app)
(watchlist personnalisée par carte, dépôt `pokedeals-saas`), mais fonctionne
sur un principe opposé : **pas de watchlist, pas de configuration
individuelle**. Un seul flux d'alertes, partagé par tous les utilisateurs
inscrits — chacun reçoit la même chose, dès l'inscription. Le dashboard n'a
donc aucun formulaire d'ajout/suivi de produit, seulement :

- les réglages de notification (push / email, indépendants),
- l'historique des précommandes détectées,
- un formulaire de retour utilisateur.

Ce choix se reflète jusque dans le schéma : `precommande_alerts` est une
table unique sans `user_id` (une ligne par précommande détectée, pas une
ligne par utilisateur), alors que l'équivalent côté PokéDeals
(`watchlist_alerts`) a une ligne par correspondance (utilisateur × carte).

## Fonctionnalités du dashboard

- **Filtrage par catégorie** — onglets "Tout le scellé" / Displays / ETB /
  Boosters & Blisters / Coffrets / Pokébox & Tins (`categorie`, calculée
  côté scraper au moment de l'insertion ; les précommandes hors de ces
  catégories restent visibles uniquement dans "Tout le scellé").
- **Pagination par curseur ("Charger plus")** — 50 précommandes chargées
  initialement, puis 50 de plus à chaque clic, en filtrant sur
  `created_at < <date de la dernière ligne affichée>` plutôt que sur un
  offset (qui se désynchroniserait si de nouvelles lignes sont insérées
  entre deux clics). Servie par un index composite `(categorie,
  created_at desc)`.
- **Fraîcheur relative** — chaque alerte affiche depuis combien de temps
  elle a été détectée ("à l'instant", "il y a 12 min", "il y a 2 h"...),
  via `Intl.RelativeTimeFormat`, sans dépendance externe
  (`lib/temps.ts`).
- **Prix multi-devises** — le produit couvre explicitement des boutiques
  françaises **et japonaises** ; chaque alerte affiche son prix brut avec
  le bon symbole selon la colonne `devise` (`€` par défaut, `¥` pour
  `JPY`) — **aucune conversion de change n'est faite**, volontairement : le
  montant affiché est toujours celui de la fiche produit scrapée.
- **Notifications push (Web Push / VAPID)** — abonnement navigateur
  (Service Worker, `public/sw.js`), avec re-souscription automatique en cas
  de rotation d'endpoint (`app/api/push/resubscribe`) et vérification que
  l'abonnement stocké appartient bien à l'utilisateur connecté (protection
  contre un faux "actif" sur un appareil partagé).
- **Notifications email (Resend)** — activables/désactivables
  indépendamment du push, préférence par défaut activée
  (`user_preferences.notif_email`).
- **PWA installable** — manifeste (`app/manifest.ts`), service worker
  (`public/sw.js`), enregistrement côté client (`app/register-sw.tsx`).
- **Landing page publique** — étapes de fonctionnement, garanties de
  détection (Pokémon TCG uniquement, vraiment en stock, jamais deux fois la
  même alerte), FAQ, données structurées `schema.org` (`WebApplication` +
  `FAQPage`) pour le SEO.
- **Formulaire de retour** utilisateur, limité à 20 messages/24h par compte
  (anti-abus).
- **Connexion OAuth** (Google / GitHub) via Supabase Auth, pas de mot de
  passe à gérer.

## Lien avec le scraper (`justok16/pokedeals`, dépôt séparé)

**Aucun code de scraping dans ce dépôt.** La détection elle-même vit dans
le dépôt public `justok16/pokedeals` (`scraper/precommande_generique.py`
+ `scraper/radar_precommande_generique.py` +
`scraper/scan_precommandes_generique.py`, exécuté par le workflow GitHub
Actions `scan_precommandes_generique.yml`, Shopify uniquement pour
l'instant). Ce dépôt-ci n'est que le site web (Next.js/Supabase) qui
affiche et notifie ce que le scraper détecte.

Le pont entre les deux (`scraper/connecteur_supabase_precoms.py`, dans le
dépôt du scraper) écrit chaque précommande détectée dans la table
`precommande_alerts` de **ce** projet Supabase, puis notifie push/email
**tous** les utilisateurs inscrits (modèle broadcast) — indépendamment de
l'envoi Telegram existant. Deux colonnes de suivi
(`push_diffuse`/`email_diffuse`) permettent de ne retenter que les canaux
qui ont échoué à un cycle donné, sans jamais renvoyer une précommande déjà
diffusée avec succès.

Secrets côté scraper (GitHub Actions, dépôt `justok16/pokedeals`) :
`POKEPRECOMS_SUPABASE_URL` / `POKEPRECOMS_SUPABASE_SERVICE_ROLE_KEY`
(projet Supabase **distinct** de celui de PokéDeals), et
`VAPID_PRIVATE_KEY` / `VAPID_CLAIM_EMAIL` / `RESEND_API_KEY` /
`RESEND_FROM_EMAIL` réutilisés tels quels (mêmes comptes/secrets que pour
PokéDeals, décision explicite de Justok).

## Stack technique

- **Next.js 16** (App Router, Server Actions, `proxy.ts` pour la
  protection des routes et le rafraîchissement de session)
- **React 19**
- **Tailwind CSS v4** — identité visuelle "Vif Collector" partagée avec
  PokéDeals (palette violet/or/magenta, polices Bungee pour les titres,
  Sora pour le corps de texte), pictogramme et couleur d'accent propres
  pour distinguer les deux apps tout en signalant leur parenté
- **Supabase** (Postgres + Auth OAuth + Row Level Security) — projet
  dédié, distinct de celui de PokéDeals
- **TypeScript**, **ESLint**
- Pas de dépendance runtime au-delà de `@supabase/ssr` et
  `@supabase/supabase-js` — philosophie volontairement minimaliste (ex. le
  formatage de date relative est fait à la main plutôt que d'ajouter une
  librairie)

## Structure du dépôt

```
app/
├── page.tsx                    # landing page publique
├── login/                      # connexion OAuth (Google/GitHub)
├── auth/callback/              # échange du code OAuth contre une session
├── dashboard/
│   ├── page.tsx                # tableau de bord (réglages + historique)
│   ├── actions.ts               # Server Actions (push, email, feedback, pagination)
│   ├── alertes-liste.tsx        # liste + "Charger plus" (client)
│   ├── alertes-types.ts         # types/constantes partagés (hors de actions.ts,
│   │                             # qui porte "use server" et ne peut exporter
│   │                             # que des fonctions async)
│   └── notif-push.tsx           # abonnement/désabonnement push (client)
├── api/push/
│   ├── vapid-public-key/        # clé VAPID publique pour le service worker
│   └── resubscribe/             # re-souscription (rotation d'endpoint)
├── manifest.ts, register-sw.tsx # PWA
├── cgu/, confidentialite/, mentions-legales/
lib/
├── supabase/                    # clients Supabase (browser, server, middleware)
├── constantes.ts                 # nombre de boutiques, catégories du filtre
└── temps.ts                      # formatage de date relative
supabase/migrations/              # schéma SQL (précommande_alerts, push_subscriptions,
                                   # user_preferences, feedback ; subscriptions
                                   # supprimée en 0011, vestige du modèle payant abandonné)
public/sw.js                      # service worker (push, cache offline)
```

## Mise en route

### 1. Projet Supabase + schéma

1. Copier `.env.example` vers `.env.local`, renseigner
   `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (**Project
   Settings > API** du dashboard Supabase).
2. Dans le dashboard Supabase (**SQL Editor**), exécuter dans l'ordre le
   contenu de chaque fichier de `supabase/migrations/` (`0001_...` à
   `0011_...`).
3. Récupérer aussi la clé `service_role` (secrète) pour
   `SUPABASE_SERVICE_ROLE_KEY` (`.env.local` + réglages Vercel).
4. Pour connecter le scraper (dépôt séparé `justok16/pokedeals`) à cette
   base : ajouter `POKEPRECOMS_SUPABASE_URL` (= `NEXT_PUBLIC_SUPABASE_URL`)
   et `POKEPRECOMS_SUPABASE_SERVICE_ROLE_KEY` (= `SUPABASE_SERVICE_ROLE_KEY`)
   comme secrets GitHub Actions sur `justok16/pokedeals`.

(`scripts/setup-supabase.sh` provisionne un projet Supabase *à partir de
zéro* via l'API — pas utile ici puisque le projet existe déjà, gardé pour
référence/un futur environnement de test séparé.)

### 2. Fournisseurs OAuth (Google + GitHub)

Dans le dashboard Supabase, **Authentication > Providers** — mêmes apps
OAuth que pokedeals-saas réutilisables si les URI de redirection Supabase
sont ajoutées en plus, ou créer de nouvelles apps dédiées.

Dans **Authentication > URL Configuration**, ajouter l'URL du site
(`http://localhost:3000` en local, l'URL Vercel en prod) aux Redirect URLs.

### 3. Notifications (push + email) — optionnel

**Push** : peut réutiliser la même paire de clés VAPID que pokedeals-saas,
ou en générer une nouvelle (cf. `pokedeals-saas/README.md` section 3 pour
la commande de génération). `VAPID_PUBLIC_KEY` →
`NEXT_PUBLIC_VAPID_PUBLIC_KEY` ici, `VAPID_PRIVATE_KEY` +
`VAPID_CLAIM_EMAIL` en secrets GitHub Actions sur `justok16/pokedeals`.

**Email** : compte [Resend](https://resend.com) — peut réutiliser le même
compte que pokedeals-saas avec une adresse d'envoi distincte (ex.
`PokéPrécoms <alertes@tondomaine.com>`), ou un compte séparé.

Ces deux canaux sont entièrement gratuits à ce niveau d'usage — aucune
intégration de paiement n'existe ni n'est nécessaire nulle part dans le
projet.

### 4. Lancer en local

```bash
npm install
npm run dev
```

## Déploiement

Prévu pour [Vercel](https://vercel.com) : connecter ce repo, renseigner les
variables d'environnement listées dans `.env.example` dans les réglages du
projet Vercel.
