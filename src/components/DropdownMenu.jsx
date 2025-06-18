// src/components/DropdownMenu.jsx
import { useState, useRef, useEffect } from 'react'
import { MoreVertical } from 'lucide-react'

const DropdownMenu = ({ 
  items = [], 
  onSelect = () => {}, 
  triggerClassName = "",
  menuClassName = "",
  disabled = false 
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)
  const buttonRef = useRef(null)

  // Fermeture au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const handleToggle = (e) => {
    e.stopPropagation() // Empêche la propagation vers la carte parent
    if (!disabled) {
      setIsOpen(!isOpen)
    }
  }

  const handleItemClick = (item, e) => {
    e.stopPropagation()
    setIsOpen(false)
    onSelect(item)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bouton trigger avec icône ⋮ */}
      <button
        ref={buttonRef}
        onClick={handleToggle}
        disabled={disabled}
        className={`
          p-2 rounded-full transition-colors duration-200
          hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300
          disabled:opacity-50 disabled:cursor-not-allowed
          ${triggerClassName}
        `}
        aria-label="Options"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <MoreVertical size={20} className="text-gray-600" />
      </button>

      {/* Menu dropdown */}
      {isOpen && (
        <div className={`
            absolute right-0 top-full mt-1 z-50
            bg-white rounded-lg shadow-lg border border-gray-200
            min-w-48 py-1
            ${menuClassName}
          `}
          style={{ zIndex: 9999 }}
          >
          {items.map((item, index) => (
            <button
              key={item.id || index}
              onClick={(e) => handleItemClick(item, e)}
              disabled={item.disabled}
              className={`
                w-full px-4 py-2 text-left text-sm
                hover:bg-gray-50 transition-colors duration-150
                flex items-center gap-3
                disabled:opacity-50 disabled:cursor-not-allowed
                ${item.className || ''}
                ${item.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700'}
              `}
            >
              {item.icon && (
                <span className="flex-shrink-0">
                  {item.icon}
                </span>
              )}
              <span className="flex-1">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default DropdownMenu