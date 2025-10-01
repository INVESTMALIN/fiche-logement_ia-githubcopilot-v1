// src/components/fiche/MiniDashboard.jsx
import { detectAlertes, generateApercu } from '../lib/AlerteDetector.js'

// Fonction simple pour calculer seulement la conformité
const calculateConformity = (formData) => {
  const reglementation = formData.section_reglementation || {}
  const avis = formData.section_avis || {}
  
  let conformiteStatut = 'conforme'
  let conformiteActions = []
  let conformiteMessages = []
  
  // RÉGLEMENTATION OFFICIELLE
  const requiresChangementUsage = reglementation.ville_changement_usage && reglementation.ville_changement_usage !== "NON !"
  const requiresDeclarationSimple = reglementation.ville_declaration_simple && reglementation.ville_declaration_simple !== "NON !"
  
  if (requiresChangementUsage) {
    conformiteStatut = 'demarches_requises'
    conformiteActions.push('Changement d\'usage requis')
    conformiteMessages.push('Renseignez-vous auprès de votre mairie sur les conditions et exemptions.')
  }
  
  if (requiresDeclarationSimple) {
    conformiteStatut = 'demarches_requises'
    conformiteActions.push('Déclaration simple requise')
    conformiteMessages.push('Formulaire Cerfa n°14004*04 à déposer en mairie avant de commencer la location.')
  }
  
  // RECOMMANDATIONS INTERNES
  const zoneRisques = avis.quartier_securite === 'zone_risques'
  const quartierDefavorise = avis.quartier_types?.includes('quartier_defavorise')
  
  if (zoneRisques) {
    conformiteStatut = 'attention_requise'
    conformiteActions.push('Zone à risques détectée')
    conformiteMessages.push('Vérifications supplémentaires recommandées.')
  }
  
  if (quartierDefavorise) {
    if (conformiteStatut === 'conforme') conformiteStatut = 'attention_requise'
    conformiteActions.push('Quartier défavorisé')
    conformiteMessages.push('Impact possible sur l\'attractivité.')
  }

  return {
    conformiteStatut,
    conformiteActions,
    conformiteMessages,
    requiresChangementUsage,
    requiresDeclarationSimple
  }
}

  // Calculer le nombre de chambres depuis FicheVisite
  const calculateNombreChambres = (formData) => {
    const visite = formData.section_visite || {}
    return visite.nombre_chambres || 'Non renseigné'
  }

export default function MiniDashboard({ formData }) {
  const apercu = generateApercu(formData)
  const alertes = detectAlertes(formData)
  const conformity = calculateConformity(formData)
  
  // Correction du nombre de chambres
  const nombreChambres = calculateNombreChambres(formData)
  
  // Données du propriétaire et logement
  const proprietaire = formData.section_proprietaire || {}
  
  const nomFiche = formData.nom || 'Sans nom'
  const ville = proprietaire.adresse?.ville || proprietaire.ville || 'Non renseignée'
  const nomProprietaire = `${proprietaire.prenom || ''} ${proprietaire.nom || ''}`.trim() || 'Non renseigné'

  return (
    <div className="space-y-6">
      {/* HEADER IDENTITÉ DU LOGEMENT */}
      <div className="bg-gradient-to-br from-[#dbae61] to-[#c49a4f] rounded-xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">{nomFiche}</h2>
            <div className="space-y-1 text-white/90">
              <div className="flex items-center gap-2">
                <span>📍</span>
                <span>{ville}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>👤</span>
                <span>{nomProprietaire}</span>
              </div>
              {/* Statut réglementaire */}
              <div className="flex items-center gap-2 mt-3">
                <span>📋</span>
                <div className="flex gap-2">
                  {conformity.requiresChangementUsage && (
                    <span className="px-2 py-1 bg-white/20 rounded text-xs font-medium">
                      Changement d'usage requis
                    </span>
                  )}
                  {conformity.requiresDeclarationSimple && (
                    <span className="px-2 py-1 bg-white/20 rounded text-xs font-medium">
                      Déclaration simple requise
                    </span>
                  )}
                  {!conformity.requiresChangementUsage && !conformity.requiresDeclarationSimple && (
                    <span className="px-2 py-1 bg-white/20 rounded text-xs font-medium">
                      Aucune démarche réglementaire
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-white/80 text-sm">Statut</div>
            <div className="font-semibold">{formData.statut || 'Brouillon'}</div>
          </div>
        </div>
      </div>

      {/* CONFORMITÉ & RECOMMANDATIONS - PLEINE LARGEUR */}
      <div className="bg-gradient-to-br from-emerald-50 to-blue-50 border border-emerald-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-lg">🎯</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Conformité & Recommandations</h3>
            <p className="text-sm text-gray-600">Statut réglementaire et recommandations</p>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-emerald-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-medium text-gray-600">Conformité & Recommandations</div>
              <div className={`text-lg font-bold ${
                conformity.conformiteStatut === 'conforme' ? 'text-green-600' :
                conformity.conformiteStatut === 'demarches_requises' ? 'text-blue-600' :
                conformity.conformiteStatut === 'attention_requise' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {conformity.conformiteStatut === 'conforme' ? 'Conforme' :
                 conformity.conformiteStatut === 'demarches_requises' ? 'Démarches requises' :
                 conformity.conformiteStatut === 'attention_requise' ? 'Attention requise' : 'Non conforme'}
              </div>
            </div>
            <div className="text-right">
              <div className={`text-2xl ${
                conformity.conformiteStatut === 'conforme' ? 'text-green-600' :
                conformity.conformiteStatut === 'demarches_requises' ? 'text-blue-600' :
                conformity.conformiteStatut === 'attention_requise' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {conformity.conformiteStatut === 'conforme' ? '✓' :
                 conformity.conformiteStatut === 'demarches_requises' ? '📋' :
                 conformity.conformiteStatut === 'attention_requise' ? '⚠' : '✗'}
              </div>
            </div>
          </div>

          {conformity.conformiteActions.length > 0 ? (
            <div className="space-y-3">
              <div className="text-sm font-medium text-gray-700 mb-2">Actions et recommandations :</div>
              
              {/* Message positif si pas de réglementation */}
              {!conformity.requiresChangementUsage && !conformity.requiresDeclarationSimple && (
                <div className="text-sm text-green-700 bg-green-50 p-3 rounded-lg border border-green-200 mb-3">
                  Bonne nouvelle ! Aucune déclaration n'est requise a priori.
                </div>
              )}
              
              {conformity.conformiteActions.map((action, index) => (
                <div key={index} className={`text-sm p-3 rounded-lg ${
                  action.includes('Zone à risques') || action.includes('Quartier défavorisé') 
                    ? 'bg-yellow-50 border border-yellow-200' 
                    : 'bg-blue-50 border border-blue-200'
                }`}>
                  <div className={`font-medium mb-1 ${
                    action.includes('Zone à risques') || action.includes('Quartier défavorisé')
                      ? 'text-yellow-800' 
                      : 'text-blue-800'
                  }`}>
                    {action}
                  </div>
                  {conformity.conformiteMessages[index] && (
                    <div className={`text-xs ${
                      action.includes('Zone à risques') || action.includes('Quartier défavorisé')
                        ? 'text-yellow-700' 
                        : 'text-blue-700'
                    }`}>
                      {conformity.conformiteMessages[index]}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-green-700 bg-green-50 p-3 rounded-lg border border-green-200">
              Bonne nouvelle ! Aucune déclaration n'est requise a priori.
            </div>
          )}
        </div>

        <div className="mt-4 text-xs text-gray-500 text-center">
          💡 Conformité selon réglementation location courte durée et recommandations internes
        </div>
      </div>

      {/* APERÇU DU LOGEMENT */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-lg">📊</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Aperçu du logement</h3>
            <p className="text-sm text-gray-600">Caractéristiques principales</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Carte Capacité */}
          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <div className="text-sm text-gray-600 mb-1">Capacité</div>
            <div className="font-semibold text-gray-900">{apercu.capacite.personnes} personnes</div>
            <div className="text-xs text-gray-500">{nombreChambres} chambres • {apercu.capacite.lits} lits</div>
          </div>

          {/* Carte Surface */}
          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <div className="text-sm text-gray-600 mb-1">Surface</div>
            <div className="font-semibold text-gray-900">{apercu.capacite.surface}</div>
            <div className="text-xs text-gray-500">{apercu.nom}</div>
          </div>

          {/* Carte WiFi */}
          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <div className="text-sm text-gray-600 mb-1">WiFi</div>
            <div className={`font-semibold ${apercu.equipements.wifi.disponible ? 'text-green-600' : 'text-red-600'}`}>
              {apercu.equipements.wifi.texte}
            </div>
          </div>

          {/* Carte Parking */}
          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <div className="text-sm text-gray-600 mb-1">Parking</div>
            <div className="font-semibold text-gray-900">{apercu.equipements.parking.texte}</div>
          </div>
        </div>

        {/* Atouts */}
        {apercu.atouts.length > 0 && (
          <div>
            <div className="text-sm font-medium text-gray-900 mb-3">🌟 Atouts principaux</div>
            <div className="flex flex-wrap gap-2">
              {apercu.atouts.map((atout, index) => (
                <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  {atout}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ALERTES */}
      {(alertes.critiques.length > 0 || alertes.moderees.length > 0 || alertes.elementsAbimes.length > 0) && (
        <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-lg">🚨</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Points d'attention</h3>
              <p className="text-sm text-gray-600">Éléments à surveiller ou corriger</p>
            </div>
          </div>

          {/* Alertes critiques */}
          {alertes.critiques.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-red-600">🔴</span>
                <span className="font-semibold text-red-900">Critique ({alertes.critiques.length})</span>
              </div>
              <div className="space-y-2">
                {alertes.critiques.map((alerte, index) => (
                  <div key={index} className="bg-red-100 border border-red-200 rounded-lg p-3">
                    <div className="flex items-start gap-3">
                      <span className="text-lg">{alerte.icone}</span>
                      <div className="flex-1">
                        <div className="font-medium text-red-900">{alerte.titre}</div>
                        <div className="text-sm text-red-700">{alerte.message}</div>
                        {alerte.action && (
                          <div className="text-xs text-red-600 mt-1 font-medium">→ {alerte.action}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alertes modérées */}
          {alertes.moderees.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-orange-600">🟡</span>
                <span className="font-semibold text-orange-900">Modéré ({alertes.moderees.length})</span>
              </div>
              <div className="space-y-2">
                {alertes.moderees.map((alerte, index) => (
                  <div key={index} className="bg-orange-100 border border-orange-200 rounded-lg p-3">
                    <div className="flex items-start gap-3">
                      <span className="text-lg">{alerte.icone}</span>
                      <div className="flex-1">
                        <div className="font-medium text-orange-900">{alerte.titre}</div>
                        <div className="text-sm text-orange-700">{alerte.message}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Éléments abîmés */}
          {alertes.elementsAbimes.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-yellow-600">⚠️</span>
                <span className="font-semibold text-yellow-900">Éléments abîmés ({alertes.elementsAbimes.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {alertes.elementsAbimes.map((alerte, index) => (
                  <div key={index} className="bg-yellow-100 border border-yellow-200 rounded-lg p-2">
                    <div className="flex items-center gap-2">
                      <span>{alerte.icone}</span>
                      <span className="text-sm font-medium text-yellow-900">{alerte.espace}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Message si aucune alerte */}
      {alertes.critiques.length === 0 && alertes.moderees.length === 0 && alertes.elementsAbimes.length === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-lg">✅</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-900">Aucune alerte détectée</h3>
              <p className="text-sm text-green-700">Le logement ne présente pas de problème majeur identifié</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}