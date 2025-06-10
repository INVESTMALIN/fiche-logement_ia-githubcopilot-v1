# 🧪 TECHNICAL\_SPEC.md

## 🧱 Tech Stack & Architecture

* **Frontend**: React + Vite + Tailwind CSS (Via Cursor)
* **State Management**: Local component state (to be centralized later)
* **Routing**: React Router DOM
* **Backend**: Supabase (PostgreSQL + Auth)
* **Deployment**: Vercel

## 🗃 Database Schema (Supabase)

**Table: fiches**

* `id` (uuid, PK)
* `user_id` (uuid, FK to auth.users)
* `created_at` (timestamp)
* `updated_at` (timestamp)
* `section_proprietaire` (jsonb)
* `section_logement` (jsonb)
* `section_clefs` (jsonb)
* \[... other sections as jsonb fields]

## 🔌 API Endpoints

N/A — All data interactions occur via Supabase client SDK.

## 🔗 External Services

* Supabase Auth (future use: authenticated access by user roles)
* (Optional) Image hosting via Supabase Storage
