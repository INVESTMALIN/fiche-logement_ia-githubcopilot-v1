import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const navigate = useNavigate()
  const fiches = [
    { id: 1, nom: 'Apt. République', statut: 'Brouillon' },
    { id: 2, nom: 'Villa Sud', statut: 'Complété' },
  ]
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Mes fiches logement</h1>
      <button className="mb-4 bg-blue-600 text-white px-4 py-2 rounded" onClick={() => navigate('/fiche/nouvelle')}>
        Nouvelle fiche logement
      </button>
      <ul>
        {fiches.map((fiche) => (
          <li key={fiche.id} className="mb-2 flex justify-between items-center bg-white p-4 rounded shadow">
            <span>{fiche.nom}</span>
            <button className="text-blue-600" onClick={() => navigate(`/fiche/${fiche.id}`)}>
              Modifier
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
