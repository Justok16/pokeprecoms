-- Colonne categorie -- alimente le filtre du dashboard (app/dashboard/page.tsx :
-- "Tout le scellé" / Displays / ETB / Boosters & Blisters / Coffrets /
-- Pokébox & Tins), calculee cote scraper (justok16/pokedeals,
-- precommande_generique.determiner_categorie_produit) au moment de
-- l'insertion. Nullable : les lignes ecrites avant cette migration n'ont
-- pas de categorie -- le dashboard les affiche dans "Tout le scellé"
-- uniquement, jamais dans un onglet categorie precis.

alter table public.precommande_alerts
  add column if not exists categorie text;

create index if not exists precommande_alerts_categorie_idx on public.precommande_alerts (categorie);
