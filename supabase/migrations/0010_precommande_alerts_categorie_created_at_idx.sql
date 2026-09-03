-- Audit du 03/09/2026 : app/dashboard/page.tsx filtre systématiquement par
-- `categorie` (onglets) ET trie/pagine par `created_at desc` (cf. pagination
-- "Charger plus", app/dashboard/actions.ts:chargerPlusAlertes) -- un index
-- composite sert les deux à la fois (categorie en tête, created_at desc en
-- second, pour un tri déjà ordonné sur le sous-ensemble filtré), plus
-- efficace que le seul index sur url_produit existant pour ce pattern de
-- requête. N'entre pas en conflit avec un éventuel index simple sur
-- created_at seul (page "Tout le scellé", categorie IS NULL côté requête --
-- Postgres peut aussi utiliser cet index composite en scannant uniquement
-- created_at si besoin, moins optimal mais toujours correct).

create index if not exists precommande_alerts_categorie_created_at_idx
  on public.precommande_alerts (categorie, created_at desc);
