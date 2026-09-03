"use client";

import { useState, useTransition } from "react";
import { formaterDateRelative } from "@/lib/temps";
import { chargerPlusAlertes } from "./actions";
import { TAILLE_PAGE_ALERTES, type AlerteLigne } from "./alertes-types";

// Symboles/formatage par devise -- volontairement minimal (audit du
// 03/09/2026, cf. migration 0009_precommande_alerts_devise.sql) : le
// scraper (dépôt justok16/pokedeals) n'écrit encore AUCUNE valeur dans
// `devise` (colonne ajoutée mais pas encore alimentée), donc `a.devise` est
// `null` pour toute ligne existante et actuelle -- traité comme "EUR" par
// défaut. Aucune conversion de devise n'est faite ici ni nulle part dans le
// pipeline : si le scraper commence un jour à enregistrer "JPY" pour une
// boutique réellement facturée en yen, ce composant affichera le montant
// BRUT avec le symbole ¥ (jamais une conversion devinée).
function formaterPrix(prix: number, devise: string | null): string {
  if (devise === "JPY") return `¥${Math.round(prix).toLocaleString("fr-FR")}`;
  return `${prix.toFixed(2)} €`;
}

export default function AlertesListe({
  alertesInitiales,
  categorie,
}: {
  alertesInitiales: AlerteLigne[];
  categorie?: string;
}) {
  const [alertes, setAlertes] = useState(alertesInitiales);
  const [termine, setTermine] = useState(alertesInitiales.length < TAILLE_PAGE_ALERTES);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrerTransition] = useTransition();

  function chargerPlus() {
    const derniere = alertes[alertes.length - 1];
    if (!derniere) return;
    setErreur(null);
    demarrerTransition(async () => {
      try {
        const suite = await chargerPlusAlertes(derniere.created_at, categorie);
        setAlertes((prec) => [...prec, ...suite]);
        if (suite.length < TAILLE_PAGE_ALERTES) setTermine(true);
      } catch {
        setErreur("Impossible de charger plus de précommandes pour l'instant.");
      }
    });
  }

  if (alertes.length === 0) {
    return (
      <p className="text-sm text-muted">
        {categorie
          ? "Aucune précommande dans cette catégorie pour l'instant."
          : "Aucune précommande détectée pour l'instant — reviens bientôt."}
      </p>
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-3">
        {alertes.map((a) => (
          <li key={a.id} className="border-t border-line pt-3 first:border-0 first:pt-0">
            <a
              href={a.url_produit}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-foreground hover:underline"
            >
              {a.titre_produit}
            </a>
            <p className="mt-1 font-mono text-xs text-muted">
              {a.boutique}
              {a.prix ? ` · ${formaterPrix(Number(a.prix), a.devise)}` : ""}
              {" · "}
              {formaterDateRelative(a.created_at)}
            </p>
          </li>
        ))}
      </ul>
      {!termine && (
        <div className="mt-4 flex flex-col items-center gap-2">
          {erreur && <p className="text-xs text-danger">{erreur}</p>}
          <button
            type="button"
            onClick={chargerPlus}
            disabled={enCours}
            className="rounded-full bg-background px-4 py-1.5 text-xs font-medium text-muted transition hover:text-foreground disabled:opacity-50"
          >
            {enCours ? "Chargement..." : "Charger plus"}
          </button>
        </div>
      )}
    </>
  );
}
