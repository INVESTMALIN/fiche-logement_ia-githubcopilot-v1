import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SidebarMenu from '../components/SidebarMenu'

export default function FicheLogement() {
  const navigate = useNavigate()
  const [typePropriete, setTypePropriete] = useState('')

  const autresOptions = [
    "Chambres d'hôtes", "Auberges de jeunesse", "Lofts", "Studios", "Bungalows", "Chalets",
    "Cabanes", "Cabanes perchées", "Tiny houses", "Yourtes", "Dômes", "Tipis", "Tentes",
    "Camping-cars", "Bateaux"
  ]

  return (
    <div className="flex min-h-screen">
      <SidebarMenu currentSection="Logement" />

      <div className="flex-1 p-6 bg-gray-100">
        <h2 className="text-xl font-bold mb-6">2- Informations sur le logement</h2>

        {/* Champs principaux */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block mb-1 font-semibold">Type de propriété *</label>
            <select
                value={typePropriete}
                onChange={(e) => setTypePropriete(e.target.value)}
            >
                <option value="">Veuillez sélectionner</option>
                <option value="Appartement">Appartement</option>
                <option value="Maison">Maison</option>
                <option value="Villa">Villa</option>
                <option value="Autre">Autre</option>
            </select>

            {/* Champ "Autre" collé juste en dessous */}
            {typePropriete === 'Autre' && (
                <div className="mt-3">
                <label className="block mb-1 font-semibold">Type - Autres (Veuillez préciser) *</label>
                <select>
                    <option value="">Veuillez sélectionner</option>
                    {autresOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
                </div>
            )}
            </div>


          <div>
            <label className="block mb-1 font-semibold">Surface en m² *</label>
            <input type="number" placeholder="par ex. 23" />
          </div>

          <div>
            <label className="block mb-1 font-semibold">Numéro du bien *</label>
            <input type="text" placeholder="par ex. 23" />
          </div>

          <div>
            <label className="block mb-1 font-semibold">Typologie *</label>
            <select>
              <option value="">Veuillez sélectionner</option>
              <option value="T1">T1</option>
              <option value="T2">T2</option>
              <option value="T3">T3</option>
              <option value="T4">T4</option>
              <option value="T5+">T5+</option>
            </select>
          </div>

          <div>
            <label className="block mb-1 font-semibold">Nombre de personnes max *</label>
            <input type="number" placeholder="par ex. 4" />
          </div>

          <div>
            <label className="block mb-1 font-semibold">Nombre de lits *</label>
            <input type="number" placeholder="par ex. 3" />
            <p className="text-xs text-gray-500 mt-1">
              Indiquez également les canapés lits / Comptabilisez 2 lits pour lits superposés ou lits gigognes
            </p>
          </div>
        </div>


        {/* Si Appartement */}
        {typePropriete === 'Appartement' && (
          <div className="mb-6">
            <h3 className="font-semibold text-lg mb-2">Appartement - Accès au logement :</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" placeholder="Nom de la résidence (ex. : L)" />
              <input type="text" placeholder="Bâtiment (ex. : E1)" />
              <select>
                <option value="">Accès à l'appartement</option>
                <option value="Ascenseur">Ascenseur</option>
                <option value="Escalier">Escalier</option>
              </select>
              <input type="text" placeholder="Étage (ex. : 1)" />
              <input type="text" placeholder="Numéro de porte (ex. : 003)" />
            </div>
          </div>
        )}

        {/* Boutons */}
        <div className="flex justify-between mt-6">
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded"
            onClick={() => navigate('/fiche/nouvelle')}
          >
            Retour
          </button>
          <div className="space-x-2">
            <button className="bg-gray-200 px-4 py-2 rounded">Enregistrer</button>
            <button
            className="bg-blue-600 text-white px-4 py-2 rounded"
            onClick={() => navigate('/fiche/clefs')}
            >
            Suivant
            </button>

          </div>
        </div>
      </div>
    </div>
  )
}
