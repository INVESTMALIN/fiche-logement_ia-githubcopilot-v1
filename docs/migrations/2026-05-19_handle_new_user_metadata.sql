-- Amélioration du trigger handle_new_user()
--
-- La version d'origine ignore raw_user_meta_data et met prénom/nom/rôle en dur.
-- Nouvelle version : copie prénom/nom depuis les métadonnées si présentes.
--
-- ⚠️ Sécurité : le rôle n'est JAMAIS lu depuis raw_user_meta_data. Ces
-- métadonnées sont contrôlées par l'utilisateur au signup (si le signup public
-- est activé) — lire `role` ici permettrait à n'importe qui de s'auto-attribuer
-- 'super_admin' et de contourner le flux admin. Le trigger force donc toujours
-- 'coordinateur' ; le rôle réel est appliqué côté serveur par l'Edge Function
-- admin-users (flux de confiance, appelant vérifié super_admin).
--
-- À jouer manuellement dans le SQL Editor Supabase après merge de la PR.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, role, prenom, nom, active, created_at, updated_at)
  VALUES (
    new.id,
    new.email,
    'coordinateur',
    COALESCE(new.raw_user_meta_data->>'prenom', ''),
    COALESCE(new.raw_user_meta_data->>'nom', ''),
    true,
    now(),
    now()
  );
  RETURN new;
END;
$function$;
