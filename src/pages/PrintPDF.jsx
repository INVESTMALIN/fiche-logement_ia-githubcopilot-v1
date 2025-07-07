// src/pages/PrintPDF.jsx - QUICK FIX
import React, { useEffect, useState } from 'react'
import PDFTemplate from '../components/PDFTemplate'
import { loadFiche } from '../lib/supabaseHelpers'

const PrintPDF = () => {
  const [formData, setFormData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      // PRIORITÉ 1 : sessionStorage (système actuel)
      const sessionData = sessionStorage.getItem('pdf-data')
      
      if (sessionData) {
        // CAS ACTUEL : Utilise sessionStorage (ne change rien!)
        try {
          const parsed = JSON.parse(sessionData)
          setFormData(parsed)
          sessionStorage.removeItem('pdf-data')
          setLoading(false)
          return // ← IMPORTANT : sort ici
        } catch (error) {
          console.error('Erreur parsing PDF data:', error)
        }
      }

      // PRIORITÉ 2 : URL parameter (nouveau pour Make)
      const urlParams = new URLSearchParams(window.location.search)
      const ficheId = urlParams.get('fiche')
      
      if (ficheId) {
        try {
          console.log('🔄 Chargement fiche depuis Supabase, ID:', ficheId)
          const result = await loadFiche(ficheId)
          
          if (result.success) {
            setFormData(result.data)
            console.log('✅ Fiche chargée depuis Supabase')
          } else {
            console.error('❌ Erreur chargement:', result.message)
          }
        } catch (error) {
          console.error('❌ Erreur chargement fiche:', error)
        }
      }
      
      setLoading(false)
    }

    loadData()
  }, [])

  // Déclencher l'impression automatiquement (garde la logique actuelle)
  useEffect(() => {
    if (formData && !loading) {
      // Petite pause pour laisser le temps au CSS de se charger
      setTimeout(() => {
        window.print()
      }, 1000)
    }
  }, [formData, loading])

  if (loading) {
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center', 
        fontFamily: 'Arial, sans-serif' 
      }}>
        <p>Chargement des données pour le PDF...</p>
      </div>
    )
  }

  if (!formData) {
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center', 
        fontFamily: 'Arial, sans-serif' 
      }}>
        <p>Aucune donnée de fiche disponible pour générer le PDF.</p>
        <p style={{ fontSize: '14px', color: '#666', marginTop: '20px' }}>
          Retournez à la fiche et essayez à nouveau.
        </p>
      </div>
    )
  }

  return <PDFTemplate formData={formData} />
}

export default PrintPDF