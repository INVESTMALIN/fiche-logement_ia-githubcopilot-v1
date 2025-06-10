import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, X, LayoutDashboard } from 'lucide-react'
import { useForm } from '../components/FormContext'

export default function SidebarMenu() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { currentStep, sections, goTo } = useForm()

  const isActive = (index) => index === currentStep

  const handleClick = (sectionName, index) => {
    // Si c'est "Mes fiches", on navigue vers la home
    if (sectionName === "Mes fiches") {
      navigate('/')
      setOpen(false)
      return
    }
    
    // Sinon, on change d'étape dans le wizard
    goTo(index)
    setOpen(false)
  }

  const menuItemClass = (index) =>
    `px-3 py-2 rounded cursor-pointer transition-colors text-sm ${
      isActive(index) ? 'bg-primary text-white' : 'text-white hover:bg-white hover:bg-opacity-10'
    }`

  return (
    <>
      {/* Mobile: Menu overlay complet */}
      <div className="lg:hidden">
        {/* Hamburger button */}
        <button 
          onClick={() => setOpen(true)} 
          className="fixed top-2 left-2 z-50 p-2 bg-accent text-white rounded-lg shadow-lg lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Overlay menu */}
        {open && (
          <div className="fixed inset-0 z-40 bg-black bg-opacity-30" onClick={() => setOpen(false)}>
            <div
              className="absolute left-0 top-0 h-full w-64 bg-accent shadow-lg p-4 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <button onClick={() => setOpen(false)}>
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              <div className="mb-4">
                <div
                  className="px-3 py-2 bg-white bg-opacity-20 rounded cursor-pointer font-medium hover:bg-white hover:bg-opacity-30 flex items-center gap-2 transition-colors text-white"
                  onClick={() => handleClick("Mes fiches", -1)}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Mes fiches
                </div>
              </div>

              <ul className="space-y-2">
                {sections.map((section, index) => (
                  <li
                    key={section}
                    className={menuItemClass(index)}
                    onClick={() => handleClick(section, index)}
                  >
                    {section}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Desktop: Sidebar normale */}
      <div className="hidden lg:block w-64 bg-accent text-white shadow-md min-h-screen p-4 overflow-y-auto">
        <div
          className="px-3 py-2 bg-white bg-opacity-20 rounded cursor-pointer font-medium mb-4 hover:bg-white hover:bg-opacity-30 flex items-center gap-2 transition-colors"
          onClick={() => handleClick("Mes fiches", -1)}
        >
          <LayoutDashboard className="w-4 h-4" />
          Mes fiches
        </div>

        <h2 className="font-semibold mb-4 text-white">Sections</h2>
        <ul className="space-y-2">
          {sections.map((section, index) => (
            <li
              key={section}
              className={menuItemClass(index)}
              onClick={() => handleClick(section, index)}
            >
              {section}
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}