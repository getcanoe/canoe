function Logger (logToConsole) {
  var api = {}
  var logs = []
  var warnings = []
  var errors = []
  var consoleLog = false

  api.getLogs = function () {
    return logs
  }

  api.getWarnings = function () {
    return warnings
  }

  api.getErrors = function () {
    return errors
  }

  api.log = function (data) {
    logs.push(data)
    if (consoleLog) { console.log(data) }
  }

  api.warn = function (data) {
    warnings.push(data)
    if (consoleLog) { console.warn(data) }
  }

  api.error = function (data) {
    errors.push(data)
    if (consoleLog) { console.error(data) }
  }

  return api
}
