// src/components/UserRoleBadge.jsx
import { useAuth } from './AuthContext'

export default function UserRoleBadge() {
  const { userRole } = useAuth()

  // Style plus aligné avec l'image de marque (comme le bouton "Coordinateur" qu'on voit)
  const getRoleStyle = (role) => {
    switch (role) {
      case 'super_admin':
        return 'bg-red-500 text-white'
      case 'admin':
        return 'bg-blue-500 text-white'
      case 'coordinateur':
        return 'bg-green-500 text-white' // Comme le badge vert qu'on voit
      default:
        return 'bg-gray-500 text-white'
    }
  }

  // Texte du badge
  const getRoleLabel = (role) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin'
      case 'admin':
        return 'Admin'
      case 'coordinateur':
        return 'Coordinateur'
      default:
        return 'Utilisateur'
    }
  }

  return (
    <span className={`px-3 py-1 text-sm font-medium rounded-full ${getRoleStyle(userRole)}`}>
      {getRoleLabel(userRole)}
    </span>
  )
}