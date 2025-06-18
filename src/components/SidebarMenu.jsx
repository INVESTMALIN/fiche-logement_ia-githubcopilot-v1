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
      isActive(index) ?
        'text-white shadow-md' : 'text-white hover:bg-white hover:bg-opacity-10'
    }`

  return (
    <>
      {/* Mobile: Menu overlay complet */}
      <div className="lg:hidden">
        {/* Hamburger button avec style doré */}
        <button 
          onClick={() => setOpen(true)} 
          className="fixed top-2 left-2 z-50 p-2 text-white rounded-lg shadow-lg lg:hidden"
          style={{background: `linear-gradient(to right, #dbae61, #c19b4f)`}}
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Overlay menu */}
        {open && (
          <div className="fixed inset-0 z-40 bg-black bg-opacity-30" onClick={() => setOpen(false)}>
            <div
              className="absolute left-0 top-0 h-full w-64 bg-black shadow-lg p-4 overflow-y-auto relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Style unifié mobile = desktop */}
              <div className="absolute inset-0">
                <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black"></div>
                <div className="absolute top-1/6 left-1/4 w-1 h-1 rounded-full opacity-60 animate-pulse" style={{backgroundColor: '#dbae61'}}></div>
                <div className="absolute top-1/3 right-1/4 w-0.5 h-0.5 rounded-full opacity-40 animate-pulse delay-500" style={{backgroundColor: '#dbae61'}}></div>
                <div className="absolute top-1/2 left-1/6 w-1 h-1 rounded-full opacity-50 animate-pulse delay-1000" style={{backgroundColor: '#dbae61'}}></div>
              </div>

              <div className="relative z-10">
                <div className="flex justify-between items-center mb-4">
                  <button onClick={() => setOpen(false)}>
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>

                <div className="mb-4">
                  <div
                    className="px-3 py-2 rounded cursor-pointer font-medium hover:bg-white hover:bg-opacity-20 flex items-center gap-2 transition-colors text-white"
                    style={{background: 'rgba(219, 174, 97, 0.2)'}}
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
                      className={`px-3 py-2 rounded cursor-pointer transition-colors text-sm ${
                        isActive(index) ?
                          'text-white shadow-md' : 'text-white hover:bg-white hover:bg-opacity-10'
                      }`}
                      style={isActive(index) ? {
                        background: `linear-gradient(to right, #dbae61, #c19b4f)`
                      } : {}}
                      onClick={() => handleClick(section, index)}
                    >
                      {section}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Desktop: Sidebar normale */}
      <div className="hidden lg:block w-64 bg-black text-white shadow-md min-h-screen p-4 overflow-y-auto relative">
        {/* Simple dégradé noir avec points dorés scintillants */}
        <div className="absolute inset-0">
          {/* Dégradé noir subtil */}
          <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black"></div>
          
          {/* Points dorés scintillants plus nombreux pour desktop */}
          <div className="absolute top-1/6 left-1/4 w-1 h-1 rounded-full opacity-60 animate-pulse" style={{backgroundColor: '#dbae61'}}></div>
          <div className="absolute top-1/3 right-1/4 w-0.5 h-0.5 rounded-full opacity-40 animate-pulse delay-500" style={{backgroundColor: '#dbae61'}}></div>
          <div className="absolute top-1/2 left-1/6 w-1 h-1 rounded-full opacity-50 animate-pulse delay-1000" style={{backgroundColor: '#dbae61'}}></div>
          <div className="absolute bottom-1/3 right-1/3 w-0.5 h-0.5 rounded-full opacity-30 animate-pulse delay-1500" style={{backgroundColor: '#dbae61'}}></div>
          <div className="absolute top-2/3 left-1/3 w-1 h-1 rounded-full opacity-45 animate-pulse delay-2000" style={{backgroundColor: '#dbae61'}}></div>
          <div className="absolute bottom-1/4 right-1/6 w-0.5 h-0.5 rounded-full opacity-35 animate-pulse delay-2500" style={{backgroundColor: '#dbae61'}}></div>
        </div>

        <div className="relative z-10">
          <div
            className="px-3 py-2 rounded cursor-pointer font-medium mb-4 hover:bg-white hover:bg-opacity-20 flex items-center gap-2 transition-colors"
            style={{background: 'rgba(219, 174, 97, 0.2)'}}
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
                className={`px-3 py-2 rounded cursor-pointer transition-colors text-sm ${
                  isActive(index) ?
                    'text-white shadow-md' : 'text-white hover:bg-white hover:bg-opacity-10'
                }`}
                style={isActive(index) ? {
                  background: `linear-gradient(to right, #dbae61, #c19b4f)`
                } : {}}
                onClick={() => handleClick(section, index)}
              >
                {section}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  )
}