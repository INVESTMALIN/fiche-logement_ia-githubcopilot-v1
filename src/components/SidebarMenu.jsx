import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, X } from 'lucide-react'

const sections = [
  "Propriétaire", "Logement", "Clefs", "Airbnb", "Booking", "Réglementation",
  "Exigences", "Avis", "Gestion Linge", "Équipements", "Consommables", "Visite",
  "Chambres", "Salle De Bains", "Cuisine 1", "Cuisine 2", "Salon / SAM", "Équip. Spé. / Extérie",
  "Communs", "Télétravail", "Bébé", "Sécurité"
]

const routes = {
  "Propriétaire": "/fiche/nouvelle",
  "Logement": "/fiche/logement",
  "Clefs": "/fiche/clefs"
}

export default function SidebarMenu({ currentSection = "Propriétaire" }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const isActive = (section) => section === currentSection

  const handleClick = (section) => {
    if (routes[section]) navigate(routes[section])
  }

  const menuItemClass = (section) =>
    `px-3 py-2 rounded cursor-pointer ${
      isActive(section) ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'
    }`

  return (
    <>
      {/* Mobile hamburger */}
      <div className="lg:hidden p-4">
        <button onClick={() => setOpen(true)} className="flex items-center space-x-2">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile sidebar */}
      {open && (
  <div className="fixed inset-0 z-40 bg-black bg-opacity-30" onClick={() => setOpen(false)}>
    <div
      className="absolute left-0 top-0 h-full w-64 bg-white shadow-lg p-4 overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold">Menu</h2>
        <button onClick={() => setOpen(false)}>
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="mb-4">
        <div
          className="px-3 py-2 bg-gray-100 rounded cursor-pointer font-medium hover:bg-gray-200"
          onClick={() => {
            navigate('/')
            setOpen(false)
          }}
        >
          Mes fiches
        </div>
      </div>

      <ul className="space-y-2">
        {sections.map((section) => (
          <li
            key={section}
            className={`px-3 py-2 rounded cursor-pointer ${
              isActive(section) ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'
            }`}
            onClick={() => {
              handleClick(section)
              // ON NE FERME PAS le menu ici
            }}
          >
            {section}
          </li>
        ))}
      </ul>
    </div>
  </div>
)}


      {/* Desktop sidebar */}
      <div className="hidden lg:block w-60 bg-white shadow-md h-screen p-4">
        <div
          className="px-3 py-2 bg-gray-100 rounded cursor-pointer font-medium mb-4 hover:bg-gray-200"
          onClick={() => navigate('/')}
        >
          Mes fiches
        </div>

        <h2 className="font-semibold mb-4">Sections</h2>
        <ul className="space-y-2">
          {sections.map((section) => (
            <li
              key={section}
              className={menuItemClass(section)}
              onClick={() => handleClick(section)}
            >
              {section}
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
