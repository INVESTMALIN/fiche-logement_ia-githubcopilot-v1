import { useState } from 'react'
import { HelpCircle, X } from 'lucide-react'

export default function HelpButton() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('navigation')

  const tabs = [
    { id: 'navigation', label: 'Navigation' },
    { id: 'statuts', label: 'Statuts des fiches' },
    { id: 'menu', label: 'Menu contextuel' },
    { id: 'photos', label: 'Upload photos' },
    { id: 'pdf', label: 'Génération PDF' },
    { id: 'conseils', label: 'Conseils' },
    { id: 'faq', label: 'FAQ' },
    { id: 'contact', label: 'Contact' }
  ]

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen)
  }

  const closeModal = () => {
    setIsModalOpen(false)
  }

  const renderTabContent = () => {
    switch(activeTab) {
      case 'navigation':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900">Comment naviguer dans l'application</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700 mb-4">
                L'application est organisée en 23 sections que vous devez remplir pour compléter une fiche logement :
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2 text-sm">
                <li>Utilisez la <strong>barre latérale</strong> pour naviguer entre les sections</li>
                <li>Votre progression est <strong>sauvegardée automatiquement</strong> en mémoire pendant la session active</li>
                <li>Vous pouvez <strong>revenir sur n'importe quelle section</strong> à tout moment</li>
                <li>Les boutons <strong>"Enregistrer"</strong> permettent de sauvegarder dans la base de données</li>
                <li>Sur mobile, utilisez le <strong>menu hamburger</strong> pour naviguer entre les sections</li>
              </ul>
            </div>
          </div>
        )
      
      case 'statuts':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900">Statuts des fiches</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
                  <span className="font-semibold text-orange-900">Brouillon</span>
                </div>
                <p className="text-orange-800 text-sm mb-2">Fiche en cours de remplissage</p>
                <p className="text-orange-700 text-xs">• Modifiable à tout moment<br/>• Visible uniquement par vous</p>
              </div>
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="font-semibold text-green-900">Complété</span>
                </div>
                <p className="text-green-800 text-sm mb-2">Fiche finalisée et transmise</p>
                <p className="text-green-700 text-xs">• PDF générés automatiquement<br/>• Envoyées sur le Drive d'équipe</p>
              </div>
              <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  <span className="font-semibold text-gray-900">Archivé</span>
                </div>
                <p className="text-gray-800 text-sm mb-2">Fiche archivée</p>
                <p className="text-gray-700 text-xs">• Masquée de la liste principale<br/>• Restaurable si nécessaire</p>
              </div>
            </div>
          </div>
        )
      
      case 'conseils':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900">Conseils pour bien remplir les fiches</h3>

            {/* Photos de qualité */}
            <div className="border border-green-200 rounded-lg p-4 bg-green-50">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-green-600">📸</span>
                Photos de qualité
              </h4>
              <ul className="text-gray-600 text-sm space-y-1">
                <li>• Prenez des photos <strong>nettes et bien éclairées</strong></li>
                <li>• Vérifiez que tous les <strong>équipements sont visibles</strong></li>
                <li>• Évitez les photos floues ou trop sombres</li>
                <li>• Pour les vidéos : <strong>2-3 minutes maximum</strong> recommandées</li>
              </ul>
            </div>

            {/* Navigation efficace */}
            <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-blue-600">🧭</span>
                Navigation efficace
              </h4>
              <ul className="text-gray-600 text-sm space-y-1">
                <li>• Utilisez la <strong>barre latérale</strong> pour passer d'une section à l'autre</li>
                <li>• Vous pouvez <strong>revenir en arrière</strong> à tout moment</li>
                <li>• Les sections se remplissent <strong>dans l'ordre</strong> mais pas obligatoire</li>
                <li>• Cliquez sur <strong>"Enregistrer"</strong> régulièrement</li>
              </ul>
            </div>

            {/* Données importantes */}
            <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-purple-600">📋</span>
                Données importantes
              </h4>
              <ul className="text-gray-600 text-sm space-y-1">
                <li>• <strong>Numéro de bien</strong> : Indispensable pour enregistrer</li>
                <li>• <strong>Surface et capacité</strong> : Données essentielles pour les annonces</li>
                <li>• <strong>Équipements</strong> : Soyez précis, ça impacte l'expérience client</li>
              </ul>
            </div>

            {/* Finalisation */}
            <div className="border border-orange-200 rounded-lg p-4 bg-orange-50">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-orange-600">🏁</span>
                Avant de finaliser
              </h4>
              <ul className="text-gray-600 text-sm space-y-1">
                <li>• <strong>Relisez</strong> les informations importantes</li>
                <li>• <strong>Vérifiez</strong> que toutes les photos sont présentes</li>
                <li>• <strong>Générez</strong> le PDF AVANT finalisation</li>
                <li>• Une fois finalisé, <strong>impossible de revenir en arrière</strong></li>
              </ul>
            </div>
          </div>
        )
      
      case 'faq':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900">Questions fréquentes</h3>

            {/* Erreurs upload */}
            <div className="border border-red-200 rounded-lg p-4">
              <h4 className="font-semibold text-red-900 mb-2">❌ "Erreur lors de l'upload de photos"</h4>
              <p className="text-gray-600 text-sm mb-2"><strong>Causes possibles :</strong></p>
              <ul className="text-gray-600 text-sm space-y-1 mb-3">
                <li>• Fichier trop volumineux (>20MB pour photos, >200MB pour vidéos)</li>
                <li>• Format non supporté</li>
                <li>• Connexion internet instable</li>
              </ul>
              <p className="text-green-700 text-sm"><strong>Solution :</strong> Réduisez la taille ou changez de réseau</p>
            </div>

            {/* Photos perdues */}
            <div className="border border-red-200 rounded-lg p-4">
              <h4 className="font-semibold text-red-900 mb-2">❌ "Mes photos ont disparu"</h4>
              <p className="text-gray-600 text-sm mb-2"><strong>Cause :</strong></p>
              <p className="text-gray-600 text-sm mb-3">Vous avez quitté l'application sans cliquer sur "Enregistrer"</p>
              <p className="text-green-700 text-sm"><strong>Solution :</strong> Toujours sauvegarder avant de fermer</p>
            </div>

            {/* PDF ne se génère pas */}
            <div className="border border-red-200 rounded-lg p-4">
              <h4 className="font-semibold text-red-900 mb-2">❌ "Le PDF ne se génère pas"</h4>
              <p className="text-gray-600 text-sm mb-2"><strong>Causes possibles :</strong></p>
              <ul className="text-gray-600 text-sm space-y-1 mb-3">
                <li>• Données manquantes dans la fiche</li>
                <li>• Problème de connexion</li>
                <li>• Trop de photos (génération lente)</li>
              </ul>
              <p className="text-green-700 text-sm"><strong>Solution :</strong> Patientez 10-15 secondes, rechargez si nécessaire</p>
            </div>

            {/* Impossible de finaliser */}
            <div className="border border-red-200 rounded-lg p-4">
              <h4 className="font-semibold text-red-900 mb-2">❌ "Impossible de finaliser la fiche"</h4>
              <p className="text-gray-600 text-sm mb-2"><strong>Cause :</strong></p>
              <p className="text-gray-600 text-sm mb-3">Données obligatoires manquantes (numéro de bien, surface, etc.)</p>
              <p className="text-green-700 text-sm"><strong>Solution :</strong> Vérifiez les champs marqués en rouge</p>
            </div>

            {/* Page ne répond plus */}
            <div className="border border-red-200 rounded-lg p-4">
              <h4 className="font-semibold text-red-900 mb-2">❌ "La page ne répond plus"</h4>
              <p className="text-gray-600 text-sm mb-3">Surtout sur mobile avec beaucoup de photos</p>
              <p className="text-green-700 text-sm"><strong>Solution :</strong> Rechargez la page, vos données sauvegardées seront récupérées</p>
            </div>
          </div>
        )
      
      case 'contact':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900">Contact et support</h3>
            
            {/* Auto-dépannage d'abord */}
            <div className="border border-orange-200 rounded-lg p-4 bg-orange-50">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-orange-600">🔧</span>
                Étapes de dépannage à essayer d'abord
              </h4>
              <ol className="text-gray-600 text-sm space-y-2 list-decimal list-inside">
                <li><strong>Vérifiez votre connexion internet</strong> (ouvrez un autre site web)</li>
                <li><strong>Actualisez la page</strong> (F5 ou tirez vers le bas sur mobile)</li>
                <li><strong>Videz le cache</strong> de votre navigateur</li>
                <li><strong>Essayez en navigation privée</strong> (mode incognito)</li>
                <li><strong>Redémarrez l'application</strong> (fermez l'onglet et rouvrez)</li>
                <li><strong>Testez sur un autre navigateur</strong> (Chrome, Safari, Firefox)</li>
                <li><strong>Vérifiez l'espace de stockage</strong> de votre appareil</li>
              </ol>
            </div>

            {/* Contact si problème persiste */}
            <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-blue-600">📧</span>
                Si le problème persiste
              </h4>
              <div className="bg-white p-4 rounded border border-blue-200">
                <p className="text-blue-900 font-medium mb-3">
                  Envoyez un email à : <strong>julien@invest-malin.com</strong>
                </p>
                <p className="text-gray-600 text-sm mb-3">
                  <strong>Incluez obligatoirement ces informations :</strong>
                </p>
                
                <div className="space-y-3">
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="font-medium text-gray-900 text-sm mb-1">📱 Informations appareil</p>
                    <ul className="text-gray-600 text-xs space-y-1">
                      <li>• Marque et modèle (ex: iPhone 14, Samsung Galaxy S23)</li>
                      <li>• Système d'exploitation et version (ex: iOS 17, Android 13)</li>
                      <li>• Navigateur utilisé (Chrome, Safari, Firefox...)</li>
                    </ul>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="font-medium text-gray-900 text-sm mb-1">🔍 Description du problème</p>
                    <ul className="text-gray-600 text-xs space-y-1">
                      <li>• <strong>Quand</strong> le problème se produit (quelle section fu formulaire)</li>
                      <li>• <strong>Ce que</strong> vous essayiez de faire exactement</li>
                      <li>• <strong>Message d'erreur</strong> affiché (copie exacte)</li>
                      <li>• <strong>Comportement observé</strong> vs comportement attendu</li>
                    </ul>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="font-medium text-gray-900 text-sm mb-1">📸 Preuves visuelles</p>
                    <ul className="text-gray-600 text-xs space-y-1">
                      <li>• <strong>Captures d'écran</strong> du problème</li>
                      <li>• <strong>Vidéo courte</strong> si le problème est difficile à expliquer</li>
                      <li>• <strong>Console d'erreur</strong> (F12 > Console sur ordinateur)</li>
                    </ul>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="font-medium text-gray-900 text-sm mb-1">⚙️ Context technique</p>
                    <ul className="text-gray-600 text-xs space-y-1">
                      <li>• <strong>Connexion internet</strong> (WiFi/4G, débit si connu)</li>
                      <li>• <strong>Heure</strong> du problème (pour vérifier les logs)</li>
                      <li>• <strong>Étapes de dépannage</strong> déjà tentées</li>
                      <li>• <strong>Fréquence</strong> (problème ponctuel ou récurrent)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Temps de réponse */}
            <div className="border border-green-200 rounded-lg p-4 bg-green-50">
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <span className="text-green-600">⏱️</span>
                Délai de réponse
              </h4>
              <p className="text-gray-600 text-sm">
                Réponse sous 24-48h ouvrées. Précisez <strong>Assistance: Fiche Logement</strong> dans l'objet de l'e-mail.
              </p>
            </div>
          </div>
        )
      
      case 'pdf':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900">Génération des PDF</h3>

            {/* Où générer les PDF */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-blue-600">📄</span>
                Où générer les PDF
              </h4>
              <p className="text-gray-600 text-sm">
                Sur la dernière section <strong>(Sécurité)</strong>, utilisez le bouton <strong>Générer la fiche logement</strong> pour générer les 2 documents PDF.
              </p>
            </div>

            {/* Types de PDF */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="text-green-600">📋</span>
                  Fiche Logement
                </h4>
                <ul className="text-gray-600 text-sm space-y-1">
                  <li>• Document complet</li>
                  <li>• <strong>Téléchargeable</strong> depuis l'app</li>
                  <li>• Pour consultation et vérification</li>
                </ul>
              </div>
              
              <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="text-purple-600">🧹</span>
                  Fiche Ménage
                </h4>
                <ul className="text-gray-600 text-sm space-y-1">
                  <li>• Version spécialisée</li>
                  <li>• <strong>Non téléchargeable</strong></li>
                  <li>• Générée automatiquement</li>
                </ul>
              </div>
            </div>

            {/* Regénération possible */}
            <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-blue-600">🔄</span>
                Modifications et regénération
              </h4>
              <ul className="text-gray-600 text-sm space-y-1">
                <li>• Si vous modifiez la fiche, vous pouvez <strong>regénérer les PDF</strong></li>
                <li>• La génération crée <strong>toujours les 2 PDF</strong> en même temps</li>
                <li>• Aucune limite avant la finalisation</li>
              </ul>
            </div>

            {/* Finalisation - Action définitive */}
            <div className="border border-red-200 rounded-lg p-4 bg-red-50">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-red-600">⚠️</span>
                Finalisation - Action définitive
              </h4>
              <p className="text-gray-600 text-sm mb-2">
                Une fois que vous cliquez sur <strong>"Finaliser la fiche"</strong> :
              </p>
              <ul className="text-gray-600 text-sm space-y-1">
                <li>• Les 2 PDF sont <strong>envoyés vers Google Drive</strong></li>
                <li>• Les données <strong>remontent dans Monday.com</strong></li>
                <li>• ⚠️ <strong>Action irréversible</strong></li>
              </ul>
            </div>
          </div>
        )
      
      case 'photos':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900">Upload de photos et vidéos</h3>

            {/* Comment ajouter des photos */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-blue-600">📷</span>
                Comment ajouter des photos
              </h4>
              <ul className="text-gray-600 text-sm space-y-1">
                <li>• Cliquez sur le bouton <strong>"Ajouter des photos"</strong> ou faites glisser vos fichiers</li>
                <li>• Sur mobile : accès à l'<strong>appareil photo</strong> ou à la <strong>galerie</strong> selon les autorisations de votre téléphone</li>
                <li>• Plusieurs photos acceptées selon la section (généralement 10 max)</li>
              </ul>
            </div>

            {/* Formats acceptés */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-green-600">📁</span>
                Formats acceptés
              </h4>
              <ul className="text-gray-600 text-sm space-y-1">
                <li>• <strong>Photos</strong> : JPG, PNG, WEBP</li>
                <li>• <strong>Vidéos</strong> : MP4, MOV (uniquement dans certaines sections)</li>
              </ul>
            </div>

            {/* Limites de taille */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-orange-600">⚖️</span>
                Limites de taille
              </h4>
              <ul className="text-gray-600 text-sm space-y-1">
                <li>• <strong>Photos</strong> : 20 MB maximum par fichier</li>
                <li>• <strong>Vidéos</strong> : 200 MB maximum par fichier</li>
                <li>• <strong>Compression automatique</strong> des photos si elles sont trop lourdes</li>
                <li>• <strong>Ne pas charger de photos en doublon,</strong> contentez-vous des photos utiles</li>
              </ul>
            </div>

            {/* Où sont stockées vos photos */}
            <div className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-yellow-600">💾</span>
                Où sont stockées vos photos
              </h4>
              <ul className="text-gray-600 text-sm space-y-1">
                <li>• <strong>Pendant la session</strong> : Sauvegardées temporairement dans l'application</li>
                <li>• ⚠️ <strong>Important</strong> : Cliquez sur <strong>"Enregistrer"</strong> avant de quitter, sinon les photos seront perdues</li>
                <li>• <strong>Sauvegarde possible</strong> : Vous pouvez cliquer sur "Enregistrer" à tout moment</li>
                <li>• <strong>Après finalisation</strong> : Transférées automatiquement sur Google Drive</li>
                <li>• <strong>Conservation</strong> : 30 jours dans l'application, puis disponibles uniquement sur Drive</li>
              </ul>
            </div>

            {/* Finalisation de la fiche */}
            <div className="border border-red-200 rounded-lg p-4 bg-red-50">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-red-600">🏁</span>
                Finalisation de la fiche
              </h4>
              <p className="text-gray-600 text-sm mb-2">
                Sur la dernière section (Sécurité), le bouton <strong>"Finaliser la fiche"</strong> :
              </p>
              <ul className="text-gray-600 text-sm space-y-1">
                <li>• <strong>Synchronise</strong> toutes vos photos et vidéos sur Google Drive</li>
                <li>• <strong>Change le statut</strong> en "Complété"</li>
                <li>• ⚠️ <strong>Action définitive</strong> : une seule finalisation possible par fiche</li>
              </ul>
            </div>
          </div>
        )
      
      case 'menu':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900">Menu contextuel des fiches</h3>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700 mb-4">
                Sur chaque fiche du dashboard, cliquez sur les <strong>3 petits points</strong> pour accéder aux actions :
              </p>
            </div>

            <div className="space-y-4">
              {/* Modifier */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-sm">✏️</span>
                  </div>
                  <h4 className="font-semibold text-gray-900">Modifier</h4>
                </div>
                <p className="text-gray-600 text-sm">
                  Ouvre la fiche pour continuer le remplissage ou corriger des informations.
                </p>
              </div>

              {/* Réaffecter */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 font-semibold text-sm">👥</span>
                  </div>
                  <h4 className="font-semibold text-gray-900">Réaffecter</h4>
                </div>
                <p className="text-gray-600 text-sm">
                  Transférer la fiche à un autre coordinateur. Utile pour répartir le travail ou en cas d'absence.
                </p>
              </div>

              {/* Archiver */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 font-semibold text-sm">📦</span>
                  </div>
                  <h4 className="font-semibold text-gray-900">Archiver</h4>
                </div>
                <p className="text-gray-600 text-sm">
                  Masque la fiche de votre liste principale. Elle reste accessible dans l'onglet "Archivé".
                </p>
              </div>

              {/* Partager */}
              <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 font-semibold text-sm">📤</span>
                  </div>
                  <h4 className="font-semibold text-gray-900">Partager</h4>
                  <span className="bg-green-200 text-green-800 text-xs px-2 py-1 rounded-full">Fiches complétées uniquement</span>
                </div>
                <p className="text-gray-600 text-sm mb-3">
                  Envoie un récapitulatif de la fiche à quelqu'un pour consultation.
                </p>
                <div className="bg-white p-3 rounded border">
                  <p className="text-gray-600 text-xs mb-2"><strong>Options de partage :</strong></p>
                  <ul className="text-gray-600 text-xs space-y-1">
                    <li>• <strong>Lien</strong> : Copie un lien à partager pour consultation</li>
                    <li>• <strong>WhatsApp</strong> : Envoi direct sur WhatsApp</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )
      
      default:
        return (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              🚧 Section en construction
            </h3>
            <p className="text-blue-800">
              Le contenu de cette section sera ajouté prochainement.
            </p>
          </div>
        )
    }
  }

  return (
    <>
      {/* Bouton flottant */}
      <button
        onClick={toggleModal}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 z-40 flex items-center justify-center text-white"
        style={{
          background: 'linear-gradient(135deg, #dbae61, #c19b4f)',
        }}
        title="Aide et documentation"
      >
        <HelpCircle 
          size={24} 
          className="hover:rotate-12 transition-transform duration-300" 
        />
      </button>

      {/* Modal d'aide */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <div 
            className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            
            {/* Header du modal */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                📚 Guide d'utilisation
              </h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={24} className="text-gray-500" />
              </button>
            </div>

            {/* Contenu du modal */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              
              {/* Navigation par onglets */}
              <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-b-2 text-white'
                        : 'border-transparent hover:border-gray-300 text-gray-600 hover:text-gray-900'
                    }`}
                    style={activeTab === tab.id ? {
                      borderBottomColor: '#dbae61',
                      background: 'linear-gradient(to right, #dbae61, #c19b4f)'
                    } : {}}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Contenu de l'onglet actif */}
              {renderTabContent()}

            </div>

          </div>
        </div>
      )}
    </>
  )
}