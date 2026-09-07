// scripts/tests/_chargerModule.mjs
//
// Charge un module ESM de `src/` dans Node.
//
// Le package n'a pas de "type": "module" : Node traite les `.js` de `src/`
// comme du CommonJS et refuse leurs `export`. On lit donc la source et on la
// donne à l'évaluateur via une data: URL, qui est toujours du module ESM.
//
// ⚠️ Limite : un module chargé ainsi ne peut PAS résoudre d'import relatif
// (il n'a plus de chemin de base). N'utiliser que sur des modules sans import
// — c'est justement la raison d'être de `src/lib/numeroBien.js`.

import { readFileSync } from 'node:fs'

export async function chargerModule(cheminRelatif) {
  const source = readFileSync(new URL(cheminRelatif, import.meta.url), 'utf8')
  if (/^\s*import\s/m.test(source)) {
    throw new Error(`${cheminRelatif} contient un import : ce chargeur ne sait pas le résoudre.`)
  }
  return import(`data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`)
}
