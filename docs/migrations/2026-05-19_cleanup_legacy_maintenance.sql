-- Cleanup des valeurs legacy de avis_type_premiere_maintenance
--
-- Avant la refonte FicheAvis du 14/05, le pill selector Maintenance utilisait
-- les 6 valeurs TYPES_PASSAGE (labels ménage) — incorrect côté métier. Depuis le
-- 19/05, seuls les 3 labels TYPES_MAINTENANCE sont valides.
--
-- Les fiches créées entre le 14/05 et le 19/05 peuvent donc contenir un ancien
-- label ménage en maintenance. Ces valeurs :
--   - ne sont plus affichables dans l'UI (aucun des 3 boutons ne matche),
--   - sont ignorées par l'Edge Function monday-sync (whitelist guard),
--   - n'avaient de toute façon pas de sens métier.
--
-- Cleanup direct à NULL — pas de mapping vers les nouveaux labels (aucune
-- correspondance sémantique propre entre les 6 labels ménage et les 3 maintenance).
--
-- À jouer manuellement dans le SQL Editor après merge de la PR #5.

UPDATE fiches
SET avis_type_premiere_maintenance = NULL
WHERE avis_type_premiere_maintenance IS NOT NULL
  AND avis_type_premiere_maintenance NOT IN (
    'Intervention propriétaire',
    'Intervention artisan',
    'Pas d''intervention'
  );
