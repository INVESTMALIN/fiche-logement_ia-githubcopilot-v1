# 🛠 DEVELOPMENT\_NOTES.md

## 🧪 Install & Run

```bash
npm install
npm run dev
```

## 🌐 Deployment

* Hosted on Vercel (auto-deploy from GitHub main branch)
* Consider moving to Netlify

## 🔐 .env Variables (required)

```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## ⚠️ Known Issues / Gotchas

* Route protection not implemented yet (anyone can access `/fiche/...`)
* Mobile UI must be tested extensively with real users

## 🔍 Tips

* Avoid pushing `node_modules`, use `.gitignore`
* Test every new section with mobile-first mindset
* Keep components small and reusable
