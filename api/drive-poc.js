const { handleDrivePocRequest } = require('./_drivePocCore.cjs')

module.exports = async function drivePocHandler(request, response) {
  return handleDrivePocRequest(request, response)
}
