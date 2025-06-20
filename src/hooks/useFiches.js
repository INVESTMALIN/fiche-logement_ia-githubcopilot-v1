// src/hooks/useFiches.js
import { useState, useEffect } from 'react'
import { useAuth } from '../components/AuthContext'
import { getUserFiches, getAllFiches, deleteFiche, updateFicheStatut } from '../lib/supabaseHelpers'

export const useFiches = () => {
  const { user, userRole, canViewAllFiches, loading: authLoading } = useAuth()
  const [fiches, setFiches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchFiches = async () => {
    // Si l'authentification est encore en cours ou pas d'utilisateur
    if (authLoading || !user) {
      setLoading(false)
      setFiches([])
      if (!user && !authLoading) {
        setError(null)
      }
      return
    }

    setLoading(true)
    setError(null)

    try {
      let result
      
      // 🔥 NOUVEAU : adapter la requête selon le rôle
      if (canViewAllFiches) {
        // Admin ou Super Admin : récupérer toutes les fiches
        console.log(`Chargement de toutes les fiches (rôle: ${userRole})`)
        result = await getAllFiches()
      } else {
        // Coordinateur : récupérer seulement ses fiches
        console.log(`Chargement des fiches personnelles (rôle: ${userRole})`)
        result = await getUserFiches(user.id)
      }
      
      if (result.success) {
        setFiches(result.data)
      } else {
        throw new Error(result.error || result.message)
      }
    } catch (e) {
      console.error("Erreur lors du chargement des fiches :", e.message)
      setError("Erreur lors du chargement des fiches : " + e.message)
      setFiches([])
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

  // Fonction pour archiver une fiche
  const handleArchiveFiche = async (ficheId) => {
    try {
      const result = await updateFicheStatut(ficheId, 'Archivé')
      
      if (result.success) {
        // Met à jour la fiche dans la liste locale (optimistic update)
        setFiches(prev => prev.map(fiche => 
          fiche.id === ficheId 
            ? { ...fiche, statut: 'Archivé', updated_at: result.data.updated_at }
            : fiche
        ))
        return { success: true, message: result.message }
      } else {
        return { success: false, error: result.error || result.message }
      }
    } catch (e) {
      console.error("Erreur lors de l'archivage :", e.message)
      return { success: false, error: "Erreur de connexion" }
    }
  }

  // Fonction pour désarchiver une fiche (restaurer vers Brouillon)
  const handleUnarchiveFiche = async (ficheId) => {
    try {
      const result = await updateFicheStatut(ficheId, 'Brouillon')
      
      if (result.success) {
        // Met à jour la fiche dans la liste locale (optimistic update)
        setFiches(prev => prev.map(fiche => 
          fiche.id === ficheId 
            ? { ...fiche, statut: 'Brouillon', updated_at: result.data.updated_at }
            : fiche
        ))
        return { success: true, message: result.message }
      } else {
        return { success: false, error: result.error || result.message }
      }
    } catch (e) {
      console.error("Erreur lors de la restauration :", e.message)
      return { success: false, error: "Erreur de connexion" }
    }
  }

  useEffect(() => {
    fetchFiches()
  }, [user, authLoading, userRole, canViewAllFiches]) // 🔥 NOUVEAU : dépendances mises à jour

  // Fonction pour rafraîchir les données (utile après création/modification)
  const refetch = () => {
    fetchFiches()
  }

  return { 
    fiches, 
    loading, 
    error,
    refetch,
    deleteFiche: handleDeleteFiche,
    archiveFiche: handleArchiveFiche,
    unarchiveFiche: handleUnarchiveFiche,
    // 🔥 NOUVEAU : informations sur le contexte utilisateur
    userRole,
    canViewAllFiches
  }
}