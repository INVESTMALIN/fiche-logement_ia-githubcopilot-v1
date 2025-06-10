# 🛠 DEVELOPMENT\_NOTES.md

## 🧪 Install & Run

```bash
npm install
npm run dev
```

## 🌐 Deployment

* Hosted on Vercel (auto-deploy from GitHub main branch)

## 🔐 .env Variables (required)

```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## ⚠️ Known Issues / Gotchas

* Forms currently lack validation (client or server)
* State is local only, no persistence across pages
* No auto-save: form must be submitted manually
* Route protection not implemented yet (anyone can access `/fiche/...`)
* Mobile UI must be tested extensively with real users
* No progress bar

## 🔍 Tips

* Avoid pushing `node_modules`, use `.gitignore`
* Test every new section with mobile-first mindset
* Keep components small and reusable
