# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
- **PDF Generation**: html2pdf.js
- **Media Upload**: Supabase Storage → Google Drive (via Make.com)
- **Deployment**: Vercel

### Key Components Structure

#### FormContext Pattern
The entire application revolves around a centralized `FormContext` that manages state for 22 form sections:

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
The application uses a single "flat table" architecture with 750+ columns in the `fiches` table:

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

Both use `html2pdf.js` with intelligent pagination and upload to `fiche-pdfs` bucket.

### Authentication & Permissions

#### User Roles
- **coordinateur**: Can CRUD their own fiches
- **admin**: Can read all fiches (rarely used)
- **super_admin**: Full CRUD access + user management

#### Row Level Security (RLS)
Supabase policies enforce role-based access:
```sql
-- Coordinateur can only see their own fiches
CREATE POLICY "coordinateur_own_fiches" ON fiches 
  FOR SELECT USING (user_id = auth.uid())

-- Super admin can see all fiches
CREATE POLICY "super_admin_all_fiches" ON fiches 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'super_admin'
    )
  )
```

### Automation Integration

#### Make.com Webhook
When a fiche status changes to "Complété", a SQL trigger sends optimized payload (58 fields vs 750+ columns) to Make.com webhook, which:
1. Downloads PDFs and media files
2. Organizes them in Google Drive structure
3. Updates Monday.com project tracking
4. Triggers cleanup of temporary Supabase storage

### Form Sections (22 total)

The application manages 22 form sections covering:
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
- `src/lib/supabaseHelpers.js`: Database mapping logic
- `src/lib/supabaseClient.js`: Supabase configuration
- `src/components/PhotoUpload.jsx`: Media upload component
- `src/hooks/useFiches.js`: Custom hook for fiche operations
- `docs/🏗️ ARCHITECTURE.md`: Detailed technical architecture
- `docs/📋 FEATURE SPEC.md`: Feature specifications

### Important Notes

- Never modify the core FormContext structure without updating all mapping functions
- All new sections must follow the exact template pattern for consistency
- Media uploads are temporary in Supabase - permanent storage is in Google Drive
- Status changes to "Complété" trigger irreversible automation workflow
- The application is mobile-first - test all UI changes on mobile devices