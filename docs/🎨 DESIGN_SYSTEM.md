# 🎨 DESIGN_SYSTEM.md

## 🌈 Color Palette Letahost (Mise à jour 2025)

### Couleurs Principales
- **Primary (Gold)**: `#dbae61` - *Or principal pour boutons et accents clés*
- **Accent (Black)**: `#000000` - *Noir avec textures et patterns pour atténuer*  
- **Background**: `#f8f8f8` - *Gris très clair pour les fonds*
- **Text Primary**: `#222222` - *Texte principal*
- **Text Secondary**: `#6B7280` - *Texte secondaire*

### Couleurs Fonctionnelles
- **Success**: `#10b981` - *Validation et succès*
- **Warning**: `#f59e0b` - *Alertes et avertissements*
- **Error**: `#ef4444` - *Erreurs et suppression*
- **Border**: `#e5e7eb` - *Bordures subtiles*

## 🔤 Typography

### Police
- **Font Family**: `Montserrat` - *Police principale*
- **Fallback**: `sans-serif` - *System fallback*

### Tailles (Tailwind classes)
- **Titre principal**: `text-2xl font-bold` (24px)
- **Sous-titres**: `text-xl font-semibold` (20px)
- **Texte normal**: `text-base` (16px)  
- **Texte petit**: `text-sm` (14px)
- **Labels**: `text-sm font-medium` (14px medium)

## 📐 Spacing & Layout

### Grille Formulaires
- **Mobile**: `grid-cols-1` - *Une colonne sur mobile*
- **Desktop**: `md:grid-cols-2` - *Deux colonnes sur desktop*
- **Gap**: `gap-4` ou `gap-6` selon contexte

### Padding Standard
- **Conteneurs**: `p-6` (24px)
- **Cartes**: `p-4` (16px)
- **Inputs**: `px-3 py-2` (12px horizontal, 8px vertical)
- **Boutons**: `px-4 py-2` (16px horizontal, 8px vertical)

### Margins
- **Entre sections**: `mb-6` (24px)
- **Entre champs**: `mb-4` (16px)
- **Entre labels**: `mb-2` (8px)

## 🧱 Component Patterns

### Structure Formulaire
```jsx
<div className="bg-white p-6 rounded-lg shadow">
  <h2 className="text-xl font-bold mb-6">Titre Section</h2>
  
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label className="block text-sm font-medium mb-2">
        Label Champ
      </label>
      <input 
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
        placeholder="Texte d'aide"
      />
    </div>
  </div>
</div>
```

### Inputs Standard
- **Background**: `bg-white`
- **Border**: `border-gray-300`
- **Focus**: `focus:ring-2 focus:ring-primary`
- **Radius**: `rounded-lg`

### Boutons
- **Primary**: `bg-primary text-white hover:bg-primary/90`
- **Secondary**: `bg-gray-200 text-gray-900 hover:bg-gray-300`
- **Ghost**: `bg-transparent border border-gray-300 hover:bg-gray-50`

## 💡 UX Principles

### Mobile-First
- Toujours développer mobile d'abord
- Navigation tactile optimisée
- Tailles de boutons minimum 44px

### Hiérarchie Visuelle
- **H1**: `text-2xl font-bold` pour les titres principaux
- **H2**: `text-xl font-semibold` pour les sections
- **H3**: `text-lg font-medium` pour les sous-sections

### Navigation
- **Breadcrumb**: Barre de progression en haut
- **Sidebar**: Navigation sections (mobile = hamburger)
- **Boutons**: Toujours visibles en bas mobile

## 🧩 Visual Style Notes

### Textures et Patterns
- Utiliser `#000000` avec `opacity-90` ou `opacity-80` pour atténuer
- Appliquer des `patterns` CSS ou des `gradients` subtils sur le noir
- Background images/textures en overlay pour casser l'uniformité

### États Visuels
- **Hover**: Toujours ajouter transition `transition-colors duration-200`
- **Focus**: Ring visible `focus:ring-2 focus:ring-primary`
- **Disabled**: `opacity-50 cursor-not-allowed`

### Ombres (Tailwind)
- **Cartes**: `shadow` (subtle)
- **Modales**: `shadow-lg`
- **Boutons actifs**: `shadow-sm`

## 🎯 Implementation Checklist

### Couleurs à Mettre à Jour
- [ ] `tailwind.config.js` - Primary vers `#dbae61`
- [ ] `tailwind.config.js` - Accent vers patterns noir
- [ ] `tailwind.config.js` - Background vers `#f8f8f8`

### Police à Intégrer
- [ ] `index.html` - Import Google Fonts Montserrat
- [ ] `tailwind.config.js` - Font family Montserrat

### Components à Auditer
- [ ] `Button.jsx` - Vérifier couleurs primary
- [ ] `SidebarMenu.jsx` - Adapter aux nouvelles couleurs
- [ ] Tous les formulaires - Background cohérent

## 📱 Responsive Breakpoints

- **Mobile**: `< 768px` - Design de base
- **Tablet**: `768px - 1024px` - Adaptations md:
- **Desktop**: `> 1024px` - Adaptations lg: