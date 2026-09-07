const { handleDossierBienRequest } = require('./_dossierBienCore.cjs')

module.exports = async function dossierBienHandler(request, response) {
  return handleDossierBienRequest(request, response)
}
