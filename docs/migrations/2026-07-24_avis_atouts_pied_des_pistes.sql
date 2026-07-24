-- Ajoute l'atout montagne "Au pied des pistes".
-- Migration appliquée en production le 2026-07-24 avant le déploiement du code.
-- Colonne nullable, sans valeur par défaut : les fiches existantes restent à NULL.

ALTER TABLE public.fiches
  ADD COLUMN IF NOT EXISTS avis_atouts_pied_des_pistes BOOLEAN;
