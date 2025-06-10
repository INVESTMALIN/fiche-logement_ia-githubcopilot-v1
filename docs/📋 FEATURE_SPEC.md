# 📋 FEATURE\_SPEC.md

## 👥 User Stories

* As a coordinator, I want to fill in a structured property sheet step-by-step
* As a coordinator, I want the app to adapt to my answers with conditional fields
* As a coordinator, I want to save progress and return later
* As an admin, I want to access structured data for internal workflows

## 🎯 MVP Features

* Step-by-step form sections (22 blocks)
* Save + Next/Back navigation between sections
* Conditional field rendering
* Supabase database integration
* Sidebar navigation

## ✨ Nice-to-Haves

* Auto-save feature
* Auth with role-based access
* Export to PDF or CSV
* Completion progress bar

## 🧩 Component Breakdown

* `SidebarMenu` (section navigation)
* `FicheForm` (section: Propriétaire)
* `FicheLogement`, `FicheClefs`, etc. (per-section components)
* Shared `InputGroup`, `FormButtonGroup` (TBD)

## 🔄 State Management

Currently: Local component state
Plan: Introduce context or global state (e.g., Zustand) once form gets too complex
