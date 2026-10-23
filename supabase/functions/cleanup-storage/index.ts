import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const DRY_RUN = false // ⚠️ Passer à true pour validation
const CUTOFF_DAYS_PHOTOS = 75
const CUTOFF_DAYS_PDFS = 7
const BATCH_SIZE = 1000 // Max Supabase

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log(`🧹 Début cleanup (DRY_RUN: ${DRY_RUN})`)

    const photoCutoff = new Date()
    photoCutoff.setDate(photoCutoff.getDate() - CUTOFF_DAYS_PHOTOS)

    const pdfCutoff = new Date()
    pdfCutoff.setDate(pdfCutoff.getDate() - CUTOFF_DAYS_PDFS)

    const stats = {
      photos: { detected: 0, deleted: 0, size_gb: 0 },
      pdfs: { detected: 0, deleted: 0, size_gb: 0 }
    }

    // ============================================
    // BUCKET 1 : fiche-photos (cutoff 90 jours)
    // ============================================
    console.log(`📸 Scan fiche-photos > ${CUTOFF_DAYS_PHOTOS}j...`)
    console.log(`📅 Cutoff date: ${photoCutoff.toISOString()}`)

const { data: oldPhotos, error: photosError } = await supabase
  .rpc('get_old_storage_objects', {
    p_bucket_id: 'fiche-photos',
    p_cutoff: photoCutoff.toISOString(),
    p_limit: BATCH_SIZE
  })

    console.log('🔍 Photos error:', JSON.stringify(photosError))
    console.log('🔍 Photos found:', oldPhotos?.length)

    if (photosError) {
      console.error('❌ Erreur query photos:', JSON.stringify(photosError))
    } else {
      stats.photos.detected = oldPhotos?.length || 0
      stats.photos.size_gb = parseFloat(
        ((oldPhotos || []).reduce((sum, f) => sum + (f.size || 0), 0) / 1024 / 1024 / 1024).toFixed(2)
      )

      console.log(`📸 ${stats.photos.detected} photos détectées (${stats.photos.size_gb} GB)`)

      if (!DRY_RUN && oldPhotos && oldPhotos.length > 0) {
        const fileNames = oldPhotos.map(f => f.name)
        const { error: deleteError } = await supabase.storage
          .from('fiche-photos')
          .remove(fileNames)

        if (deleteError) {
          console.error('❌ Erreur suppression photos:', JSON.stringify(deleteError))
        } else {
          stats.photos.deleted = oldPhotos.length
          console.log(`✅ ${stats.photos.deleted} photos supprimées`)
        }
      }
    }

    // ============================================
    // BUCKET 2 : fiche-pdfs (cutoff 7 jours)
    // ============================================
    console.log(`📄 Scan fiche-pdfs > ${CUTOFF_DAYS_PDFS}j...`)

const { data: oldPdfs, error: pdfsError } = await supabase
  .rpc('get_old_storage_objects', {
    p_bucket_id: 'fiche-pdfs',
    p_cutoff: pdfCutoff.toISOString(),
    p_limit: BATCH_SIZE
  })

    if (pdfsError) {
      console.error('❌ Erreur query PDFs:', JSON.stringify(pdfsError))
    } else {
      stats.pdfs.detected = oldPdfs?.length || 0
      stats.pdfs.size_gb = parseFloat(
        ((oldPdfs || []).reduce((sum, f) => sum + (f.size || 0), 0) / 1024 / 1024 / 1024).toFixed(2)
      )

      console.log(`📄 ${stats.pdfs.detected} PDFs détectés (${stats.pdfs.size_gb} GB)`)

      if (!DRY_RUN && oldPdfs && oldPdfs.length > 0) {
        const fileNames = oldPdfs.map(f => f.name)
        const { error: deleteError } = await supabase.storage
          .from('fiche-pdfs')
          .remove(fileNames)

        if (deleteError) {
          console.error('❌ Erreur suppression PDFs:', JSON.stringify(deleteError))
        } else {
          stats.pdfs.deleted = oldPdfs.length
          console.log(`✅ ${stats.pdfs.deleted} PDFs supprimés`)
        }
      }
    }

    const summary = {
      success: true,
      dry_run: DRY_RUN,
      timestamp: new Date().toISOString(),
      cutoffs: {
        photos_days: CUTOFF_DAYS_PHOTOS,
        pdfs_days: CUTOFF_DAYS_PDFS
      },
      photos: stats.photos,
      pdfs: stats.pdfs,
      total_size_gb: parseFloat((stats.photos.size_gb + stats.pdfs.size_gb).toFixed(2))
    }

    console.log('🎉 Résultat:', JSON.stringify(summary, null, 2))

    return new Response(
      JSON.stringify(summary, null, 2),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('💥 Erreur:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})