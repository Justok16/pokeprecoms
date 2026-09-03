// Formatage de fraîcheur relative ("il y a 12 min", "il y a 2 h"...) sans
// dépendance externe (philosophie minimaliste du repo, cf. package.json) --
// juste Intl.RelativeTimeFormat + un peu de calcul (audit du 03/09/2026,
// created_at était déjà récupéré mais jamais affiché dans le dashboard).

const UNITES: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["week", 60 * 60 * 24 * 7],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
];

const formateurRelatif = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });

/** "il y a 12 min", "il y a 2 h", "à l'instant"... à partir d'un timestamp ISO. */
export function formaterDateRelative(dateIso: string): string {
  const diffSecondes = Math.max(0, (Date.now() - new Date(dateIso).getTime()) / 1000);
  if (diffSecondes < 60) return "à l'instant";
  for (const [unite, secondesParUnite] of UNITES) {
    const valeur = Math.floor(diffSecondes / secondesParUnite);
    if (valeur >= 1) return formateurRelatif.format(-valeur, unite);
  }
  return "à l'instant";
}
