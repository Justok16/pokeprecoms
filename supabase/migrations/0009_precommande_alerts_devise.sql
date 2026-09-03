-- Audit externe du 03/09/2026 -- vérification de la plausibilité des prix
-- des boutiques japonaises (le produit couvre explicitement des boutiques
-- FRANÇAISES ET JAPONAISES, cf. lib/constantes.ts). Constat : la table
-- `precommande_alerts` était VIDE en production au moment de l'audit (0
-- ligne), donc impossible de vérifier sur des données réelles si les prix
-- de boutiques japonaises (ex. japantradingcardstore.com, pokeninjapan.store,
-- fandom.tokyo, japanresell.fr...) sont déjà en EUR ou bruts en JPY. Revue
-- du code scraper (connecteur_supabase_precoms.py, dépôt justok16/pokedeals)
-- confirme qu'AUCUNE conversion ni distinction de devise n'existe nulle part
-- dans le pipeline : `prix` est écrit tel quel depuis la fiche produit
-- scrapée (`e.get("prix")`), sans notion de devise. Le bug potentiel
-- (afficher un prix JPY avec un simple "€") est donc réel et non écarté,
-- juste non observable faute de données -- à surveiller une fois les
-- premières précommandes JP réellement enregistrées.
--
-- Cette colonne permet au scraper de commencer à enregistrer la devise
-- réelle plus tard (ex. "JPY" pour une boutique facturée en yen) sans
-- deviner ici un taux de conversion -- app/dashboard/alertes-liste.tsx sait
-- déjà afficher un montant brut avec le bon symbole selon `devise`, sans
-- convertir. Défaut 'EUR' : comportement inchangé pour les lignes
-- existantes/le cas très majoritaire (boutiques françaises).

alter table public.precommande_alerts
  add column devise text not null default 'EUR';
