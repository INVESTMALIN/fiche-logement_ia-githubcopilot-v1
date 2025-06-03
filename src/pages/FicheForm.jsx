import { useState } from 'react'

export default function FicheForm() {
  const [isInvestisseur, setIsInvestisseur] = useState(false)

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Fiche Propriétaire</h1>
      <div className="mb-4">
        <label>Nom</label>
        <input type="text" className="w-full" />
      </div>
      <div className="mb-4">
        <label>Prénom</label>
        <input type="text" className="w-full" />
      </div>
      <div className="mb-4">
        <label>Email</label>
        <input type="email" className="w-full" />
      </div>
      <div className="mb-4">
        <label>Est-ce un investisseur ?</label>
        <input type="checkbox" onChange={(e) => setIsInvestisseur(e.target.checked)} />
      </div>
      {isInvestisseur && (
        <>
          <div className="mb-4">
            <label>Type d'investisseur</label>
            <input type="text" className="w-full" />
          </div>
          <div className="mb-4">
            <label>Nom de l'entreprise</label>
            <input type="text" className="w-full" />
          </div>
        </>
      )}
    </div>
  )
}
