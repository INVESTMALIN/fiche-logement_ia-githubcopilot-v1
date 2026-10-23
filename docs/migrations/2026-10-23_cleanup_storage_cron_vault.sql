-- 2026-10-23 — cleanup-storage : authentification par secret partagé (Vault)
--
-- À exécuter bloc par bloc, jamais le fichier entier : les étapes 2 et 3 se
-- font hors SQL entre A et B.
--
-- Contexte : les anciennes clés API JWT (anon, service_role) ont été
-- désactivées le 23/10/2026 après la fuite Railway du 21/10. Le cron
-- cleanup-storage-daily appelait l'Edge Function avec l'ancienne clé anon
-- écrite en dur dans cron.job, refusée depuis.
--
-- Nouveau schéma :
--   - l'Edge Function cleanup-storage est déployée avec verify_jwt = false et
--     exige l'en-tête x-cleanup-secret, comparé en temps constant à son secret
--     CLEANUP_STORAGE_SECRET (sinon 401, avant tout accès au stockage) ;
--   - le cron lit la même valeur dans Vault au moment de l'exécution : plus
--     aucune clé ni aucun secret en clair dans cron.job.
--
-- Ordre d'application en prod (après merge, même session) :
--   1. Étape A ci-dessous : le secret est GÉNÉRÉ DANS POSTGRES et rangé dans
--      Vault. Il ne transite par aucun client, aucun log, aucun transcript.
--   2. Secret de la fonction CLEANUP_STORAGE_SECRET = même valeur, saisie par
--      Julien dans le dashboard (Integrations → Vault → révéler
--      cleanup_storage_secret, puis Edge Functions → Secrets).
--   3. Déploiement de la fonction (verify_jwt: false).
--   4. Étape B ci-dessous : commande du cron.
--   5. Preuves : étape C (simulation, aucune suppression).
--
-- Rotation : vault.update_secret sur le même nom + nouvelle saisie du secret
-- de la fonction. Tant que les deux valeurs diffèrent, la fonction renvoie 401
-- et ne touche à rien (échec fermé).

-- ─── Étape A : secret dans Vault (rejouable) ────────────────────────────────
-- 32 octets aléatoires → 64 caractères hexadécimaux. Ne renvoie que l'uuid,
-- ou aucune ligne si le secret existe déjà (il n'est alors pas remplacé).
select vault.create_secret(
  encode(extensions.gen_random_bytes(32), 'hex'),
  'cleanup_storage_secret',
  'Secret partagé cron cleanup-storage-daily → Edge Function cleanup-storage (en-tête x-cleanup-secret)'
)
where not exists (select 1 from vault.secrets where name = 'cleanup_storage_secret');

-- Contrôle sans afficher la valeur :
select name, length(decrypted_secret) as longueur, created_at
from vault.decrypted_secrets
where name = 'cleanup_storage_secret';

-- ─── Étape B : commande du cron (même horaire, 0 2 * * * UTC) ───────────────
-- timeout_milliseconds : le défaut pg_net (5 s) est plus court qu'un passage
-- réel (~9 s observés le 23/10 avec démarrage à froid) ; sans lui, la réponse
-- de la fonction n'arrive jamais dans net._http_response.
-- body '{}' : suppression réelle. La simulation ne se demande qu'à la main.
select cron.alter_job(
  job_id := (select jobid from cron.job where jobname = 'cleanup-storage-daily'),
  schedule := '0 2 * * *',
  command := $cmd$
  SELECT net.http_post(
    url := 'https://qwjgkqxemnpvlhwxexht.supabase.co/functions/v1/cleanup-storage',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cleanup-secret', (
        SELECT decrypted_secret FROM vault.decrypted_secrets
        WHERE name = 'cleanup_storage_secret'
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $cmd$
);

-- Contrôle : plus de JWT dans la commande, horaire inchangé.
select jobname, schedule, active,
       command ~ 'eyJ[A-Za-z0-9_-]+\.' as contient_un_jwt,
       command ilike '%vault.decrypted_secrets%' as lit_vault
from cron.job
where jobname = 'cleanup-storage-daily';

-- ─── Étape C : preuve en simulation (aucune suppression) ────────────────────
-- Même appel que le cron, avec {"dry_run": true}. Renvoie l'id de requête.
SELECT net.http_post(
  url := 'https://qwjgkqxemnpvlhwxexht.supabase.co/functions/v1/cleanup-storage',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'x-cleanup-secret', (
      SELECT decrypted_secret FROM vault.decrypted_secrets
      WHERE name = 'cleanup_storage_secret'
    )
  ),
  body := '{"dry_run": true}'::jsonb,
  timeout_milliseconds := 60000
);

-- Puis, quelques secondes plus tard (net._http_response ne garde que ~6 h) :
-- select id, status_code, timed_out, error_msg, content::jsonb->'dry_run' as dry_run,
--        content::jsonb->'photos' as photos, content::jsonb->'pdfs' as pdfs
-- from net._http_response where id = <id renvoyé>;
-- Ne pas se fier à success: true ni à detected: 0 : vérifier aussi dans les
-- logs de la fonction la présence de « 🔍 Photos error: null » et l'absence de
-- « ❌ Erreur query PDFs » (une RPC en échec est seulement loguée).

-- ─── Retour arrière ─────────────────────────────────────────────────────────
-- En cas d'échec du cron (401, 500 ou timeout dans net._http_response), rien
-- n'est supprimé. Mettre le job en pause :
select cron.alter_job(
  job_id := (select jobid from cron.job where jobname = 'cleanup-storage-daily'),
  active := false
);
-- Corriger la cause : secret de la fonction différent de celui de Vault, ou
-- fonction non déployée avec verify_jwt: false. Puis réactiver :
select cron.alter_job(
  job_id := (select jobid from cron.job where jobname = 'cleanup-storage-daily'),
  active := true
);
-- L'ancienne commande n'est pas restaurable : la clé anon JWT qu'elle portait
-- est désactivée depuis le 23/10/2026.
