-- Rollback de 2026-10-01_relancer_medias_v3.sql
--
-- Supprime la fonction de relance et son journal. Aucun autre objet n'en dépend :
-- le trigger notify_fiche_completed et le scénario V2 ne sont pas concernés.
-- ATTENTION : le DROP TABLE efface l'historique des relances. L'exporter avant si besoin :
--   SELECT * FROM public.media_relances ORDER BY demandee_le;

DROP FUNCTION IF EXISTS public.relancer_medias_v3(uuid, text, boolean);
DROP TABLE IF EXISTS public.media_relances;
