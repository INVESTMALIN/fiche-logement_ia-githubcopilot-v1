import { useState } from 'react'
import { HelpCircle, X } from 'lucide-react'

export default function HelpButton() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('navigation')

  // ✅ ONGLETS OPTIMISÉS : 8 → 6 onglets
  const tabs = [
    { id: 'navigation', label: 'Navigation' },
    { id: 'photos', label: 'Upload photos' },
    { id: 'pdf', label: 'Génération PDF' },
    { id: 'conseils', label: 'Conseils' },
    { id: 'support', label: 'Support' } // Merger FAQ + Contact
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
            <h3 className="text-xl font-semibold text-gray-900">Navigation et gestion des fiches</h3>
            
            {/* Navigation de base */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-blue-600">🧭</span>
                Comment naviguer dans l'application
              </h4>
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

            {/* Statuts des fiches (ex-onglet "statuts") */}
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-orange-600">📊</span>
                Statuts des fiches
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
                    <span className="font-semibold text-orange-900">Brouillon</span>
                  </div>
                  <p className="text-orange-800 text-sm mb-2">Fiche non finalisée</p>
                  <p className="text-orange-700 text-xs">• Modifiable à tout moment<br/>• Visible uniquement par vous</p>
                </div>
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="font-semibold text-green-900">Complété</span>
                  </div>
                  <p className="text-green-800 text-sm mb-2">Fiche finalisée et transmise</p>
                  <p className="text-green-700 text-xs">• Photos enovyées sur le Drive<br/>• Consultable et partageable</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                    <span className="font-semibold text-gray-900">Archivé</span>
                  </div>
                  <p className="text-gray-800 text-sm mb-2">Fiche masquée</p>
                  <p className="text-gray-700 text-xs">• Masquée de la liste principale<br/>• Restaurable si nécessaire</p>
                </div>
              </div>
            </div>

            {/* Menu contextuel des fiches (ex-onglet "menu") */}
            <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-blue-600">⚙️</span>
                Menu contextuel des fiches
              </h4>
              <p className="text-gray-700 mb-4">
                Sur chaque fiche du dashboard, cliquez sur les <strong>3 petits points</strong> pour accéder aux actions :
              </p>
              
              <div className="space-y-4">
                {/* Modifier */}
                <div className="border border-gray-200 rounded-lg p-4 bg-white">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-sm">✏️</span>
                    </div>
                    <h5 className="font-semibold text-gray-900">Modifier</h5>
                  </div>
                  <p className="text-gray-600 text-sm">
                    Ouvre la fiche pour continuer le remplissage ou corriger des informations.
                  </p>
                </div>

                {/* Réaffecter */}
                <div className="border border-gray-200 rounded-lg p-4 bg-white">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-purple-600 font-semibold text-sm">👥</span>
                    </div>
                    <h5 className="font-semibold text-gray-900">Réaffecter</h5>
                  </div>
                  <p className="text-gray-600 text-sm">
                    Transférer la fiche à un autre coordinateur. Utile pour répartir le travail ou en cas d'absence.
                  </p>
                </div>

                {/* Archiver */}
                <div className="border border-gray-200 rounded-lg p-4 bg-white">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-gray-600 font-semibold text-sm">📦</span>
                    </div>
                    <h5 className="font-semibold text-gray-900">Archiver</h5>
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
                    <h5 className="font-semibold text-gray-900">Partager</h5>
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
          </div>
        )
      
      case 'photos':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900">Upload de photos et vidéos</h3>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-blue-900 font-medium mb-3">
                📱 L'application est optimisée pour la prise de photos directe sur mobile
              </p>
              <p className="text-blue-800 text-sm">
                Utilisez votre smartphone ou tablette pour des résultats optimaux.
              </p>
            </div>

            <div className="space-y-4">
              {/* Prise de photos */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="text-blue-600">📸</span>
                  Comment prendre des photos
                </h4>
                <ul className="text-gray-600 text-sm space-y-2">
                  <li>• Cliquez sur <strong>"Ajouter des photos"</strong> pour accéder à l'appareil photo</li>
                  <li>• Ou choisissez <strong>"Sélectionner"</strong> pour accéder à votre galerie</li>
                  <li>• Vous pouvez ajouter <strong>plusieurs photos</strong> dans chaque section</li>
                  <li>• Les photos sont <strong>automatiquement compressées</strong> pour optimiser l'upload</li>
                  <li>• Assurez-vous d'avoir <strong>autorisé votre navigateur</strong> à prendre des photos</li>
                  <li>• Le fonctionnement de cette fonctionnalité diffère selon les modèles de téléphone et le navigateur</li>
                </ul>
              </div>

              {/* Upload vidéos */}
              <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="text-purple-600">🎥</span>
                  Vidéos (sections spécifiques)
                </h4>
                <p className="text-gray-600 text-sm mb-3">
                  Les vidéos sont disponibles dans certaines sections uniquement :
                </p>
                <ul className="text-gray-600 text-sm space-y-1">
                  <li>• <strong>Guide d'accès</strong> : pour expliquer l'accès au logement. La vidéo sert également à la création du Guide d'accès</li>
                  <li>• <strong>Équipements</strong> : pour montrer l'utilisation d'appareils complexes</li>
                  <li>• <strong>Cuisine</strong> : pour les modes d'emploi des électroménagers</li>
                  <li>• <strong>Équipements spé.</strong> : pour montrer les équipements extérieurs</li>
                </ul>
              </div>

              {/* Finalisation de la fiche */}
              <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="text-red-600">🏁</span>
                  Finalisation de la fiche
                </h4>
                <p className="text-gray-600 text-sm mb-2">
                  Sur la dernière section (Finalisation), le bouton <strong>"Finaliser la fiche"</strong> :
                </p>
                <ul className="text-gray-600 text-sm space-y-1">
                  <li>• <strong>Synchronise</strong> toutes vos photos et vidéos sur Google Drive</li>
                  <li>• <strong>Change le statut</strong> en "Complété", mais la fiche reste consutable et modifiable</li>
                  <li>• <strong>Action définitive</strong> ⚠️  : une seule finalisation possible par fiche</li>
                </ul>
              </div>
            </div>
          </div>
        )
      
      case 'pdf':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900">Génération de PDF</h3>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-green-900 font-medium mb-2">
                📄 Deux types de PDF sont générés simultanément
              </p>
              <p className="text-green-800 text-sm">
                Lorsque vous avez fini de remplir votre fiche, cliquez sur <strong>Générer la Fiche logement (PDF)</strong>. Les deux Fiches (logement + ménage) seront générées simultanément et synchronisées sur le Drive et Monday à chaque fois que vous cliquez sur <strong>"Générer la Fiche logement"</strong>. Vous pourrez télécharger une copie de la Fiche logement. La Fiche ménage ne sera pas disponible au téléchargement, mais sera bien envoyée sur le Drive, et remontera dans Monday.
              </p>
            </div>

            <div className="space-y-4">
              {/* PDF Logement */}
              <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="text-blue-600">🏠</span>
                  PDF Logement (Complet)
                </h4>
                <p className="text-gray-600 text-sm mb-3">
                  Contient toutes les informations de la fiche pour le propriétaire et l'équipe :
                </p>
                <ul className="text-gray-600 text-sm space-y-1">
                  <li>• Informations propriétaire et logement</li>
                  <li>• Détails accès, clefs, équipements</li>
                  <li>• Aperçu cliquables des photos et instructions d'utilisation</li>
                  <li>• Informations réglementaires</li>
                </ul>
              </div>

              {/* PDF Ménage */}
              <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="text-purple-600">🧹</span>
                  PDF Ménage (Filtré)
                </h4>
                <p className="text-gray-600 text-sm mb-3">
                  Version allégée spécialement conçue pour l'équipe de ménage :
                </p>
                <ul className="text-gray-600 text-sm space-y-1">
                  <li>• Accès et localisation des clefs</li>
                  <li>• Plan et équipements de chaque pièce</li>
                  <li>• Gestion linge et consommables</li>
                  <li>• Équipements ménage (poubelle, parkings)</li>
                </ul>
              </div>

              {/* Processus génération */}
              <div className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="text-orange-600">⚙️</span>
                  Processus de génération
                </h4>
                <ol className="text-gray-600 text-sm space-y-2 list-decimal list-inside">
                  <li>Remplissez votre fiche complètement</li>
                  <li>Sur la dernière page du formulaire, cliquez <strong>"Générer la Fiche logement"</strong></li>
                  <li>Les 2 PDF sont créés simultanément en arrière plan</li>
                  <li>Vous pouvez télécharger la Fiche logement pour vérification (optionnel)</li>
                  <li>Les deux PDF remontent sur le Drive et dans Monday</li>
                </ol>
              </div>
            </div>
          </div>
        )
      
      case 'conseils':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900">Conseils d'utilisation</h3>
            
            <div className="space-y-4">
              {/* Performance */}
              <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="text-green-600">⚡</span>
                  Optimiser les performances
                </h4>
                <ul className="text-gray-600 text-sm space-y-2">
                  <li>• <strong>Sauvegardez régulièrement</strong> votre progression avec le bouton "Enregistrer"</li>
                  <li>• <strong>Évitez d'ouvrir plusieurs onglets</strong> de l'application simultanément</li>
                  <li>• <strong>Fermez les autres applications</strong> sur mobile pour libérer de la mémoire</li>
                  <li>• <strong>Utilisez une connexion WiFi stable</strong> pour l'upload des photos</li>
                </ul>
              </div>

              {/* Qualité photos */}
              <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="text-blue-600">📸</span>
                  Qualité des photos
                </h4>
                <ul className="text-gray-600 text-sm space-y-2">
                  <li>• <strong>Éclairage naturel</strong> : privilégiez la lumière du jour</li>
                  <li>• <strong>Netteté</strong> : assurez-vous que les photos ne sont pas floues</li>
                  <li>• <strong>Cadrage</strong> : montrez bien l'équipement ou la pièce dans son ensemble</li>
                  <li>• <strong>Angles multiples</strong> : n'hésitez pas à prendre plusieurs photos du même élément</li>
                </ul>
              </div>

              {/* Remplissage efficace */}
              <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="text-purple-600">📝</span>
                  Remplissage efficace
                </h4>
                <ul className="text-gray-600 text-sm space-y-2">
                  <li>• <strong>Préparez votre visite</strong> : ayez le matériel nécessaire (mètre, bloc-notes)</li>
                  <li>• <strong>Suivez l'ordre logique</strong> : commencez par l'accès, puis pièce par pièce</li>
                  <li>• <strong>Soyez précis</strong> : détaillez les marques et modèles des équipements</li>
                  <li>• <strong>Anticipez le ménage</strong> : notez les spécificités importantes pour l'équipe</li>
                </ul>
              </div>

              {/* Erreurs fréquentes */}
              <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="text-red-600">⚠️</span>
                  Erreurs à éviter
                </h4>
                <ul className="text-gray-600 text-sm space-y-2">
                  <li>• <strong>Ne pas sauvegarder</strong> avant de changer de section</li>
                  <li>• <strong>Photos trop lourdes</strong> : l'app compresse automatiquement, mais évitez les vidéos longues</li>
                  <li>• <strong>Informations incomplètes</strong> : les champs vides ralentissent le traitement</li>
                  <li>• <strong>Finaliser trop tôt</strong> : vérifiez que tout est correct avant de finaliser</li>
                </ul>
              </div>
            </div>
          </div>
        )
      
      case 'support':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900">Support et dépannage</h3>
            
            {/* FAQ Section */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-blue-600">❓</span>
                Questions fréquentes
              </h4>
              
              <div className="space-y-4">
                {/* Sauvegarde automatique */}
                <div className="border border-gray-200 rounded-lg p-4 bg-white">
                  <h5 className="font-semibold text-gray-900 mb-2">💾 "Mes données sont-elles sauvegardées automatiquement ?"</h5>
                  <p className="text-gray-600 text-sm mb-3">
                    Vos données sont sauvegardées en mémoire pendant que vous remplissez la fiche, mais pour une sauvegarde définitive en base de données, vous devez cliquer sur <strong>"Enregistrer"</strong>.
                  </p>
                  <p className="text-green-700 text-sm"><strong>Conseil :</strong> Sauvegardez après chaque section importante</p>
                </div>

                {/* Photos lourdes */}
                <div className="border border-gray-200 rounded-lg p-4 bg-white">
                  <h5 className="font-semibold text-gray-900 mb-2">📱 "L'upload de photos est lent"</h5>
                  <p className="text-gray-600 text-sm mb-3">
                    Normal avec une connexion mobile. Les photos sont compressées automatiquement, mais privilégiez le WiFi pour un upload plus rapide.
                  </p>
                  <p className="text-green-700 text-sm"><strong>Solution :</strong> Connectez-vous en WiFi si possible</p>
                </div>

                {/* Champs obligatoires */}
                <div className="border border-gray-200 rounded-lg p-4 bg-white">
                  <h5 className="font-semibold text-gray-900 mb-2">⚠️ "Je ne peux pas finaliser ma fiche"</h5>
                  <p className="text-gray-600 text-sm mb-3">
                    Certains champs sont obligatoires pour finaliser. Vérifiez les sections qui affichent des messages d'erreur en rouge.
                  </p>
                  <p className="text-green-700 text-sm"><strong>Solution :</strong> Vérifiez les champs marqués en rouge</p>
                </div>

                {/* Page ne répond plus */}
                <div className="border border-red-200 rounded-lg p-4 bg-white">
                  <h5 className="font-semibold text-red-900 mb-2">❌ "La page ne répond plus"</h5>
                  <p className="text-gray-600 text-sm mb-3">Surtout sur mobile avec beaucoup de photos</p>
                  <p className="text-green-700 text-sm"><strong>Solution :</strong> Rechargez la page, vos données sauvegardées seront récupérées</p>
                </div>
              </div>
            </div>

            {/* Auto-dépannage */}
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
                Contact si le problème persiste
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
                      <li>• <strong>Quand</strong> le problème se produit (quelle section du formulaire)</li>
                      <li>• <strong>Ce que</strong> vous essayiez de faire exactement</li>
                      <li>• <strong>Message d'erreur</strong> affiché (copie d'écran bienvenue)</li>
                      <li>• <strong>Étapes</strong> de dépannage déjà tentées</li>
                    </ul>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="font-medium text-gray-900 text-sm mb-1">⏰ Contexte</p>
                    <ul className="text-gray-600 text-xs space-y-1">
                      <li>• <strong>Urgence</strong> : Normale / Urgente / Critique</li>
                      <li>• <strong>Fréquence</strong> : Premier incident / Récurrent</li>
                      <li>• <strong>Impact</strong> : Esthétique / Ralentissement / Bloquant</li>
                    </ul>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-green-50 rounded border border-green-200">
                  <p className="text-green-800 text-sm font-medium mb-1">✅ Réponse sous 24-48h</p>
                  <p className="text-green-700 text-xs">
                    Pour les urgences, précisez <strong>URGENT</strong> dans l'objet du mail
                  </p>
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