// Types/constantes partagés pour la liste de précommandes (pagination
// "Charger plus", cf. audit du 03/09/2026). Fichier SÉPARÉ de actions.ts à
// dessein : actions.ts porte "use server" en tête, qui interdit d'y
// exporter autre chose que des fonctions async (une constante ou un type
// exportés y sont silencieusement retirés du bundle par Next.js -- piège
// réel rencontré en buildant ce correctif, `npm run build` échouait avec
// "The module has no exports at all" sur tous les imports de actions.ts).

/** Nombre d'alertes chargées par page (requête initiale et "Charger plus"). */
export const TAILLE_PAGE_ALERTES = 50;

export type AlerteLigne = {
  id: string;
  titre_produit: string;
  boutique: string;
  url_produit: string;
  prix: number | null;
  devise: string | null;
  categorie: string | null;
  created_at: string;
};
