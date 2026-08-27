-- Palier gratuit (decide avec Justok le 27/08/2026) : chaque utilisateur
-- inscrit a droit a UNE alerte de precommande gratuite avant de devoir
-- s'abonner. Cette colonne memorise si elle a deja ete envoyee -- ecrite
-- UNIQUEMENT par le scraper (justok16/pokedeals, connecteur_supabase_precoms.py,
-- cle service_role, contourne RLS), jamais par le client (pas de policy
-- insert/update cote utilisateur pour cette colonne specifiquement, mais
-- la table entiere n'a de toute facon que des policies "own" -- un
-- utilisateur ne peut pas mentir sur les colonnes des AUTRES lignes que
-- la sienne, et modifier la sienne n'aurait aucun effet cote scraper qui
-- lit via service_role, pas de risque de triche a se faire renvoyer une
-- alerte gratuite).
--
-- Defaut false : un utilisateur sans ligne dans user_preferences (n'a
-- jamais visite le dashboard) est traite comme "alerte gratuite pas
-- encore envoyee" par le scraper (upsert avec ce defaut si la ligne
-- n'existe pas encore au moment de marquer l'alerte comme envoyee).
alter table public.user_preferences
  add column if not exists alerte_gratuite_envoyee boolean not null default false;
