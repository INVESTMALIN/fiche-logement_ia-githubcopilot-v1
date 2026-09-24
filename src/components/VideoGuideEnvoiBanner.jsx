// src/components/VideoGuideEnvoiBanner.jsx
//
// Indicateur global de l'envoi de la vidéo du Guide d'accès. Monté UNE fois
// dans FicheWizard, au-dessus de la section courante : l'envoi vit dans le
// FormContext et survit au changement de section, alors que l'indicateur
// local de PhotoUpload disparaît avec elle. Sans ce bandeau, le coordinateur
// ne sait plus qu'un envoi tourne et risque de recharger ou fermer la page.
//
// Tant qu'il est affiché, recharger, fermer ou quitter la page déclenche
// l'avertissement natif du navigateur. Changer de section ne décharge pas la
// page : c'est libre. Les sorties par un bouton de l'appli (« Mes fiches »,
// « Annuler ») ne déchargent pas la page non plus : elles demandent une
// confirmation de leur côté (peutQuitterFiche).
//
// Seule la vidéo du Guide d'accès est concernée : le registre des envois ne
// reçoit que les envois « cible livret ».

import { useEffect } from 'react'
import { useForm } from './FormContext'
import { MESSAGE_VIDEO_GUIDE_EN_COURS } from '../lib/videoGuideAcces'

export default function VideoGuideEnvoiBanner() {
  const { phaseVideoGuide } = useForm()
  const enCours = Boolean(phaseVideoGuide)

  useEffect(() => {
    if (!enCours) return
    const retenir = (event) => {
      event.preventDefault()
      // Chrome et Edge exigent encore returnValue pour afficher la boîte
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', retenir)
    return () => window.removeEventListener('beforeunload', retenir)
  }, [enCours])

  if (!enCours) return null

  return (
    <div
      role="status"
      data-testid="video-guide-envoi-banner"
      data-phase={phaseVideoGuide}
      className="sticky top-0 z-40 bg-blue-50 border-b-2 border-blue-300 pl-14 pr-4 py-3 lg:pl-4 text-sm text-blue-800 flex items-center gap-3"
    >
      <div
        className="animate-spin inline-block w-4 h-4 flex-shrink-0 border-2 border-current border-t-transparent rounded-full"
        aria-hidden="true"
      />
      <p>{MESSAGE_VIDEO_GUIDE_EN_COURS[phaseVideoGuide]}</p>
    </div>
  )
}
