-- ============================================================
-- ROLLBACK : Détection de doublon inter-coordinateurs
-- Date     : 2026-08-03
-- Branche  : feat/alerte-doublon-cross-coordinateur
-- ============================================================
-- Annule `2026-08-03_check_fiche_existante.sql`.
--
-- ⚠️ À n'exécuter QU'APRÈS avoir remis le code applicatif dans son état
--    précédent (revert de la PR). Si la fonction disparaît alors que le
--    code la référence encore, l'appel échoue : l'alerte de doublon ne
--    s'affiche plus du tout. Ce n'est PAS bloquant — la création de fiche
--    continue de fonctionner, `checkForDuplicate` renvoie false et
--    journalise l'erreur — mais le garde-fou est perdu, et avec lui la
--    protection contre les doublons inter-coordinateurs.
--
-- La suppression est sans effet de bord : la fonction ne détient aucune
-- donnée, ne participe à aucune policy, aucun trigger, aucune vue.
-- ============================================================

DROP FUNCTION IF EXISTS public.check_fiche_existante(text);

-- Vérification :
--   SELECT proname FROM pg_proc WHERE proname = 'check_fiche_existante';
--   -- attendu : 0 ligne
