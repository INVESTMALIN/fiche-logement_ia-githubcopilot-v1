// src/pages/PrintPDF.jsx
import React, { useEffect, useState } from 'react'
import PDFTemplate from '../components/PDFTemplate'

const PrintPDF = () => {
  const [formData, setFormData] = useState(null)

  useEffect(() => {
    // Récupérer les données depuis sessionStorage
    const data = sessionStorage.getItem('pdf-data')
    
    if (data) {
        try {
          const parsed = JSON.parse(data)
          setFormData(parsed)
          sessionStorage.removeItem('pdf-data')
        } catch (error) {
          console.error('Erreur parsing PDF data:', error)  // 👈 GARDE ÇA (erreur utile)
        }
      }
    }, [])

  // Déclencher l'impression automatiquement
  useEffect(() => {
    if (formData) {
      // Petite pause pour laisser le temps au CSS de se charger
      setTimeout(() => {
        window.print()
      }, 1000)
    }
  }, [formData])

  if (!formData) {
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center', 
        fontFamily: 'Arial, sans-serif' 
      }}>
        <p>Chargement des données pour le PDF...</p>
        <p style={{ fontSize: '14px', color: '#666', marginTop: '20px' }}>
          Si cette page ne se charge pas, retournez à la fiche et essayez à nouveau.
        </p>
      </div>
    )
  }

  return <PDFTemplate formData={formData} />
}

export default PrintPDF