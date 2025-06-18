# 🧪 Spécifications Techniques

## 🧱 Stack Technique & Architecture

* **Frontend** : React + Vite + Tailwind CSS (Via Cursor)
* **Gestion d'État** : État local des composants (centralisation prévue ultérieurement)
* **Routage** : React Router DOM
* **Backend** : Supabase (PostgreSQL + Auth)
* **Déploiement** : Vercel

## 🗃 Schéma de Base de Données (Supabase)

**Table : fiches**

* `id` (uuid, clé primaire)
* `user_id` (uuid, clé étrangère vers auth.users)
* `created_at` (horodatage de création)
* `updated_at` (horodatage de mise à jour)
* `section_proprietaire` (jsonb)
* `section_logement` (jsonb)
* `section_clefs` (jsonb)
* \[... autres sections au format jsonb]

## 🔌 Points d'Accès API

N/A — Toutes les interactions avec les données se font via le SDK client Supabase.

## 🔗 Services Externes

* Authentification Supabase (utilisation future : accès authentifié par rôles utilisateurs)
* (Optionnel) Hébergement d'images via Supabase Storage
