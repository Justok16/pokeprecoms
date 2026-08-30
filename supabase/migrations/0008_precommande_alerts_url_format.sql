-- Audit interne du 30/08/2026 (meme principe applique cote pokedeals-saas,
-- migration 0010_watchlist_alerts_url_format.sql) : `url_produit` (rendue
-- directement en <a href> dans le dashboard) n'avait aucune contrainte de
-- format -- ecrite exclusivement par le scraper via la cle service_role,
-- jamais par un utilisateur de ce depot, donc pas exploitable aujourd'hui,
-- mais aucune defense si le scraper stockait un jour une valeur malformee.
-- Defense-en-profondeur, ne bloque rien de legitime (toute vraie URL de
-- fiche produit commence par http:// ou https://).

alter table public.precommande_alerts
  add constraint precommande_alerts_url_produit_http check (url_produit ~ '^https?://');
