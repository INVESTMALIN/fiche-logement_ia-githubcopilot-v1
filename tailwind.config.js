export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#dbae61",         // Or (mis à jour)
        accent: "#000000",          // Noir avec textures/patterns
        background: "#f8f8f8",      // Gris très clair
        text: "#222222",            // Texte principal
        "text-muted": "#6B7280",    // Texte secondaire
      },
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'], // Police Montserrat par défaut
      },
    },
  },
  plugins: [],
}