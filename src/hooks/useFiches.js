// src/hooks/useFiches.js
import { useState, useEffect } from 'react'
import { useAuth } from '../components/AuthContext'
import { getUserFiches, deleteFiche } from '../lib/supabaseHelpers'

export const useFiches = () => {
  const { user, loading: authLoading } = useAuth()
  const [fiches, setFiches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchFiches = async () => {
    // Si l'authentification est encore en cours ou pas d'utilisateur
    if (authLoading || !user) {
      setLoading(false)
      setFiches([])
      if (!user && !authLoading) {
        // Pas d'erreur si pas connecté, c'est normal
        setError(null)
      }
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Utilise le helper existant qui retourne { success, data, error }
      const result = await getUserFiches(user.id)
      
      if (result.success) {
        setFiches(result.data)
      } else {
        throw new Error(result.error || result.message)
      }
    } catch (e) {
      console.error("Erreur lors du chargement des fiches :", e.message)
      setError("Erreur lors du chargement des fiches : " + e.message)
      setFiches([]) // Reset en cas d'erreur
    } finally {
      setLoading(false)
    }
  }

  // Fonction pour supprimer une fiche
  const handleDeleteFiche = async (ficheId) => {
    try {
      const result = await deleteFiche(ficheId)
      
      if (result.success) {
        // Supprime la fiche de la liste locale (optimistic update)
        setFiches(prev => prev.filter(fiche => fiche.id !== ficheId))
        return { success: true, message: result.message }
      } else {
        return { success: false, error: result.error || result.message }
      }
    } catch (e) {
      console.error("Erreur lors de la suppression :", e.message)
      return { success: false, error: "Erreur de connexion" }
    }
  }

  useEffect(() => {
    fetchFiches()
  }, [user, authLoading])

  // Fonction pour rafraîchir les données (utile après création/modification)
  const refetch = () => {
    fetchFiches()
  }

  return { 
    fiches, 
    loading, 
    error,
    refetch,
    deleteFiche: handleDeleteFiche // Export de la fonction delete
  }
}