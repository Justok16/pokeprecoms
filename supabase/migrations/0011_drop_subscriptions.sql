-- Audit du 03/09/2026 : la table `subscriptions` (0002_subscriptions.sql)
-- a été créée pour l'ancien modèle payant Stripe -- explicitement abandonné
-- le 28/08/2026 (cf. CLAUDE.md, "l'ancien modèle payant, puis le modèle '1
-- alerte gratuite puis abonnement', ont été abandonnés"). Vérifié avant
-- suppression : aucune référence à "stripe" ni "subscriptions" (hors cette
-- table elle-même) dans tout le code applicatif (`grep -ril stripe .` /
-- `grep -rn subscriptions .` en excluant `push_subscriptions`) -- aucune
-- route app/api/webhooks/stripe/route.ts n'existe (jamais créée, ou déjà
-- retirée), aucun code ne lit ni n'écrit `subscriptions`. Le service est
-- 100% gratuit et illimité pour tous les utilisateurs, sans exception.
--
-- `drop table` supprime automatiquement ses policies RLS dépendantes (pas
-- besoin de `drop policy` séparé).

drop table if exists public.subscriptions;
