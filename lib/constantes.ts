// Chiffre réel de boutiques françaises et japonaises couvertes par le
// scraper partagé (même source que pokedeals-saas, cf. son lib/constantes.ts
// -- 112 boutiques actives comptées au 25/08/2026, cohérent avec le "110+"
// affiché).
export const NOMBRE_BOUTIQUES = "110+";

// Catégories du filtre dashboard (app/dashboard/page.tsx) -- DOIVENT rester
// synchronisées avec les constantes CATEGORIE_* de precommande_generique.py
// (dépôt justok16/pokedeals), qui calcule cette valeur exacte au moment de
// l'insertion dans `precommande_alerts.categorie`. "Autres" (mot-clé
// CATEGORIE_AUTRE côté scraper) n'a volontairement PAS d'onglet dédié ici --
// ces précommandes restent visibles uniquement dans "Tout le scellé".
export const CATEGORIES_PRECOMMANDE = [
  "Displays",
  "ETB",
  "Boosters & Blisters",
  "Coffrets",
  "Pokébox & Tins",
] as const;
