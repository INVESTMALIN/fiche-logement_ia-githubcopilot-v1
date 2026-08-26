# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

This is a React application for managing property inspection forms (fiches logement) for Letahost's concierge services. It replaces a previous Jotform solution with a modern, mobile-first interface built with React + Vite, Tailwind CSS, and Supabase backend.

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Architecture

### Core Technologies
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Routing**: React Router DOM
- **PDF Generation**: HTML rendu côté app → service Railway (Puppeteer)
- **Media Upload**: Supabase Storage → Google Drive (via Make.com)
- **Deployment**: Vercel

### Key Components Structure

#### FormContext Pattern
The entire application revolves around a centralized `FormContext` that manages state for 23 form sections (+ 1 section "Finalisation"):

```javascript
// Required pattern for all form sections
const { 
  next, back, currentStep, totalSteps,
  getField, updateField, handleSave, saveStatus 
} = useForm()

// Always get formData for boolean fields
const formData = getField('section_name')

// Standard handlers
const handleInputChange = (field, value) => updateField(field, value)
const handleRadioChange = (field, value) => updateField(field, value === 'true' ? true : (value === 'false' ? false : null))
```

#### Mandatory Section Template
All form sections must follow this exact structure:

```javascript
return (
  <div className="flex min-h-screen">
    <SidebarMenu />
    <div className="flex-1 flex flex-col">
      <ProgressBar />
      <div className="flex-1 p-6 bg-gray-100">
        {/* Section content */}
        
        {/* Required save status messages */}
        {saveStatus.saving && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
            ⏳ Sauvegarde en cours...
          </div>
        )}
        {saveStatus.saved && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
            ✅ Sauvegardé avec succès !
          </div>
        )}
        {saveStatus.error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            ❌ {saveStatus.error}
          </div>
        )}

        {/* Required navigation buttons */}
        <div className="mt-6 flex justify-between">
          <Button variant="ghost" onClick={back} disabled={currentStep === 0}>
            Retour
          </Button>
          
          {currentStep === totalSteps - 1 ? (
            <div className="flex gap-3">
              <Button variant="secondary" onClick={handleSave} disabled={saveStatus.saving}>
                {saveStatus.saving ? 'Sauvegarde...' : 'Enregistrer'}
              </Button>
              <Button variant="primary" onClick={handleFinaliser} disabled={saveStatus.saving}>
                {saveStatus.saving ? 'Finalisation...' : 'Finaliser la fiche'}
              </Button>
            </div>
          ) : (
            <div className="flex gap-3">
              <Button variant="secondary" onClick={handleSave} disabled={saveStatus.saving}>
                {saveStatus.saving ? 'Sauvegarde...' : 'Enregistrer'}
              </Button>
              <Button variant="primary" onClick={next}>
                Suivant
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
)
```

### Database Architecture

#### Supabase Schema
The application uses a single "flat table" architecture with 950+ columns in the `fiches` table:

- **Metadata**: `id`, `user_id`, `nom`, `statut`, `created_at`, `updated_at`
- **Naming pattern**: `{section}_{field}` (e.g., `proprietaire_prenom`, `logement_surface`)
- **Arrays**: Media fields use `TEXT[]` type (e.g., `clefs_photos`, `equipements_poubelle_photos`)
- **Booleans**: Use `?? null` for proper null handling in mapping

#### Data Mapping
The `supabaseHelpers.js` file handles bidirectional mapping between FormContext and Supabase:
- `mapFormDataToSupabase()`: FormContext → Database
- `mapSupabaseToFormData()`: Database → FormContext

Critical mapping patterns:
```javascript
// Integer fields
logement_surface: formData.section_logement?.surface ? parseInt(formData.section_logement.surface) : null

// Boolean fields (preserve null state)
clefs_ttlock_masterpin: formData.section_clefs?.ttlock_masterpin ?? null

// Array fields
clefs_photos: formData.section_clefs?.photos || []
```

### Media Upload System

#### PhotoUpload Component
```javascript
<PhotoUpload 
  fieldPath="section_clefs.photos"
  label="Photos des clefs"
  multiple={true}
  maxFiles={10}
  capture={true}
  acceptVideo={false}
/>
```

#### Upload Workflow
1. **Compression**: Automatic image compression based on file size
2. **Supabase Storage**: Temporary upload to `fiche-photos` bucket
3. **Structure**: `user-{id}/fiche-{numero_bien}/section/field/`
4. **Finalization**: Webhook triggers Make.com automation
5. **Migration**: Files moved to Google Drive, Supabase cleanup after 40 days

### PDF Generation

Two PDF types are generated simultaneously:
- **Logement PDF**: Complete property form (`/print-pdf`)
- **Ménage PDF**: Cleaning-specific form (`/print-pdf-menage`)

Both are produced the same way: `PDFUpload.jsx` extracts the rendered HTML of the print route via an iframe, posts it to the Railway service (`/generate-pdf`, Puppeteer `page.pdf`), which uploads to the `fiche-pdfs` bucket and returns the URL. `<a href>` links stay clickable in the output — that's how photo and video links work. `html2pdf.js` survives only in the legacy `PDFUploadBackup.jsx`.

`PDFTemplate.jsx` is **generic, not hand-written**: it loops over `sectionsConfig`, then over every key of each section. A new form field shows up automatically — unless it hits one of the documented traps (section missing from `sectionsConfig`, a `photo`/`video` substring in the key, the grouped renderers of `section_equipements` / `section_cuisine_1` that replace generic rendering). Read `docs/📄 PLAN UPLOAD PDF.md` § "Règle de complétude du PDF logement" before adding a field or debugging a missing one.

`PDFMenageTemplate.jsx` is a separate copy with a reduced section list — fixes to the logement template do not propagate to it.

### Authentication & Permissions

#### User Roles
- **coordinateur**: Can CRUD their own fiches (default fallback)
- **admin**: Can read all fiches (rarely used)
- **super_admin**: Full CRUD access + user management

Roles are stored in the `profiles` table (`role` column), not in `raw_user_meta_data`. The `profiles` table also has an `active` boolean — deactivated accounts are rejected at login even with valid credentials.

`AuthContext` exposes helpers: `isCoordinateur`, `isAdmin`, `isSuperAdmin`, `canEditAllFiches`, `canViewAllFiches`.

#### Row Level Security (RLS)
Supabase policies enforce role-based access using the `profiles` table:
```sql
-- Coordinateur can only see their own fiches
CREATE POLICY "coordinateur_own_fiches" ON fiches
  FOR SELECT USING (user_id = auth.uid())

-- Super admin can see all fiches
CREATE POLICY "super_admin_all_fiches" ON fiches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  )
```

### Loomky Integration

`src/services/loomkyService.js` handles synchronization with the Loomky property management API. Key points:
- Currently points to `DEV` environment (`dev.loomky.com`). Change `CURRENT_ENV` to `'PROD'` when ready.
- The API token is **never hardcoded** — it must be injected by the caller (e.g., `FicheFinalisation`, `SimulationLoomky`).
- `normalizeFormDataToFiche()` converts nested FormContext state to a flat fiche structure before API calls.
- `/simulation-loomky` is a protected test route for the Loomky API.
- `/test-guide-agent` is a protected test route for the n8n guide agent.

### Validation System

`src/lib/validationConfig.js` defines three-tier validation run during finalization:
1. **`REQUIRED_FIELDS`** — always-required fields per section
2. **`CONDITIONAL_REQUIRED_FIELDS`** — fields required based on other field values (e.g., TTlock codes only if `boiteType === 'TTlock'`)
3. **`SPECIAL_VALIDATIONS`** — complex logic (e.g., at least one bed type per room, at least one bathroom equipment per bathroom)

`validateRequiredFields(formData)` is the main export — returns an `errors` object keyed by section name.

### Automation Integration

#### Make.com Photo Webhook
When a fiche status changes to "Complété", a SQL trigger sends optimized payload (100 fields vs 950+ columns) to Make.com webhook, which:
1. Downloads media files
2. Organizes them in Google Drive structure

#### Make.com PDF Webhook
When PDF is generated, a SQL trigger sends payload to Make.com webhook, which:
1. Downloads both PDF files
2. Sends them to Monday column
3. Updates the Google Drive folder with the PDF files

#### Make.com Assistants Webhook
When the n8n guide d'accès assistant is validated, a SQL trigger sends the validated output to a Make.com webhook, which:
1. Generates the PDF file
2. Sends it to the Monday column "Guide d'accès"

The scenario keeps an "annonce" branch, but it is inert since the old n8n annonce assistant was retired (August 2026): its trigger and columns are gone, so nothing fires it any more. The current annonce agent pushes its PDF straight to Monday from the `annonce-validate` Edge Function, without going through Make.


### Form Sections (23 total)

The application manages 23 form sections covering:
- Property details (logement, proprietaire)
- Access management (clefs, guide_acces)
- Room inspections (chambres, salle_de_bains, cuisine1, cuisine2)
- Equipment (equipements, securite)
- Special features (bebe, jacuzzi, barbecue)
- Booking platforms (airbnb, booking)
- Reviews and compliance (avis, reglementation)

### Development Patterns

#### When Adding New Sections
1. Create new page component following the mandatory template
2. Add section to `initialFormData` in `FormContext.jsx`
3. Add database mapping in `supabaseHelpers.js`
4. Update the sections array in FormContext
5. Add new route in `App.jsx`

#### Boolean Field Handling
Always use `?? null` for boolean fields to preserve three-state logic (true/false/null):
```javascript
// Correct
updateField(field, value === 'true' ? true : (value === 'false' ? false : null))

// Incorrect  
updateField(field, value === 'true')
```

#### Media Fields
All media fields should be arrays (`TEXT[]` in Supabase) and follow the naming pattern:
`{section}_{specific_field}_photo` or `{section}_{specific_field}_photos`

### Key Files

- `src/components/FormContext.jsx`: Central state management
- `src/components/AuthContext.jsx`: Auth state + role helpers (`useAuth()` hook)
- `src/lib/supabaseHelpers.js`: Database mapping logic
- `src/lib/validationConfig.js`: Finalization validation rules
- `src/lib/checklistHelpers.js`: Checklist generation from fiche data
- `src/lib/AlerteDetector.js`: alert detection for the MiniDashboard
- `src/lib/pdfRenderer.js`, `generateAssistantPDF.js`: PDF rendering utilities
- `src/components/PhotoUpload.jsx`: Media upload component
- `src/components/PDFTemplate.jsx`, `PDFMenageTemplate.jsx`: PDF print templates
- `src/hooks/useFiches.js`: Custom hook for fiche operations
- `src/services/loomkyService.js`: Loomky API integration
- `docs/🏗️ ARCHITECTURE.md`: Detailed technical architecture
- `docs/📋 FEATURE SPEC.md`: Feature specifications

### Important Notes

- Never modify the core FormContext structure without updating all mapping functions
- All new sections must follow the exact template pattern for consistency
- Media uploads are temporary in Supabase - permanent storage is in Google Drive
- Status changes to "Complété" trigger irreversible automation workflow
- The application is mobile-first - test all UI changes on mobile devices