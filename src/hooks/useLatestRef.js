// src/hooks/useLatestRef.js
import { useRef } from 'react'

/**
 * Renvoie un ref qui pointe TOUJOURS sur la dernière valeur passée.
 *
 * Usage : lire `ref.current` dans un callback asynchrone pour comparer le
 * contexte COURANT à celui capturé au lancement de l'appel, et ainsi ignorer
 * une réponse périmée (le contexte a changé pendant que la requête était en vol).
 * C'est la seule façon, dans cette base, de gérer une réponse async périmée :
 * on capture une clé à l'envoi, on relit la clé courante via ce ref au retour,
 * et on jette la réponse si elles diffèrent.
 *
 * L'affectation se fait pendant le rendu (et non dans un effet) pour que la
 * valeur soit déjà à jour au moment où un callback asynchrone se résout. Lecture
 * seule côté appelant : ne pas écrire dans `.current`.
 */
export function useLatestRef(value) {
  const ref = useRef(value)
  ref.current = value
  return ref
}
