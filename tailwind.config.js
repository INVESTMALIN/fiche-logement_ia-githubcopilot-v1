export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#D4AF37",         // Or Letahost
        accent: "#1F3F45",          // Bleu canard foncé
        background: "#F9F9F9",      // Fond clair
        text: "#222222",            // Texte principal
        "text-muted": "#6B7280",    // Texte secondaire
      },
    },
  },
  plugins: [],
}
