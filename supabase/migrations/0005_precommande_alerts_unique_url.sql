-- Contrainte d'unicite sur url_produit -- necessaire pour le pont scraper
-- (justok16/pokedeals, connecteur_supabase_precoms.py) : l'insertion utilise
-- `Prefer: resolution=ignore-duplicates` avec `on_conflict=url_produit`,
-- qui n'a d'effet que s'il existe une contrainte unique/index sur cette
-- colonne. Sans elle, une meme fiche produit alertee deux fois (ex. cycle
-- relance apres crash entre l'envoi Telegram et l'ecriture memoire) aurait
-- cree une ligne en double.

alter table public.precommande_alerts
  add constraint precommande_alerts_url_produit_key unique (url_produit);
