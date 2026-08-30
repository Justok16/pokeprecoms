-- Audit externe du 30/08/2026 (meme bug que celui deja corrige cote
-- watchlist_alerts/pokedeals-saas) : une precommande detectee etait
-- diffusee (push/email) UNE SEULE FOIS, au moment de son insertion -- si
-- push ET email echouaient tous les deux ce cycle-la (panne Resend/service
-- Web Push), la ligne restait en base mais n'etait plus JAMAIS retentee
-- (les cycles suivants la voient comme un doublon deja connu, dedupe sur
-- url_produit). Ces deux colonnes permettent au scraper de retenter
-- UNIQUEMENT les canaux non encore diffuses avec succes.
--
-- Modele BROADCAST (contrairement a watchlist_alerts qui a une ligne par
-- utilisateur) : un seul flag par canal et par precommande, pas par
-- (precommande, utilisateur) -- le canal n'est marque diffuse que si TOUS
-- les envois de ce canal ont reussi pour ce cycle ; un seul echec individuel
-- (ex. un abonnement push expire pas encore purge) fait retenter tout le
-- canal au prochain cycle, ce qui peut renvoyer une notification en double
-- a certains abonnes -- compromis deliberement accepte plutot qu'un suivi
-- par utilisateur beaucoup plus lourd pour un simple broadcast.
--
-- IMPORTANT -- backfill des lignes EXISTANTES a true (pas false) : sans ca,
-- toutes les precommandes deja enregistrees seraient reconsiderees "en
-- attente" au prochain cycle et rediffuseraient d'un coup potentiellement
-- des semaines d'anciennes precommandes a tous les abonnes.

alter table public.precommande_alerts
  add column push_diffuse boolean not null default true;

alter table public.precommande_alerts
  add column email_diffuse boolean not null default true;

alter table public.precommande_alerts
  alter column push_diffuse set default false;

alter table public.precommande_alerts
  alter column email_diffuse set default false;
