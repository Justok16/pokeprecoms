-- Historique des precommandes detectees et notifiees -- MODELE BROADCAST,
-- pas de watchlist personnelle par utilisateur (contrairement a PokeDeals) :
-- chaque abonne actif recoit TOUTES les alertes, donc une seule table
-- partagee suffit (pas de user_id, pas de correspondance a calculer).
--
-- Ecrite UNIQUEMENT par le scraper (cle service_role, cf. futur pont
-- equivalent a connecteur_supabase.py cote pokedeals) -- jamais par
-- l'application elle-meme. Lue par le dashboard (historique des alertes)
-- pour tout utilisateur authentifie, meme sans abonnement actif (l'aperçu
-- de l'historique aide a comprendre la valeur du service avant de payer).

create table if not exists public.precommande_alerts (
  id uuid primary key default gen_random_uuid(),
  titre_produit text not null,
  boutique text not null,
  url_produit text not null,
  prix numeric,
  created_at timestamptz not null default now()
);

create index if not exists precommande_alerts_created_at_idx on public.precommande_alerts (created_at desc);

alter table public.precommande_alerts enable row level security;

create policy "precommande_alerts_select_authenticated"
  on public.precommande_alerts for select
  to authenticated
  using (true);
