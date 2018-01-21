'use strict'
/* global getUUID */
/**
 * Profile
 */
function Profile () {
  this.version = '1.0.0'
}

Profile.create = function (opts) {
  opts = opts || {}
  var x = new Profile()
  x.createdOn = Date.now()
  x.id = getUUID()
  x.walletId = null
  x.disclaimerAccepted = false
  return x
}

Profile.fromObj = function (obj) {
  var x = new Profile()
  x.createdOn = obj.createdOn
  x.id = obj.id
  x.walletId = obj.id
  x.disclaimerAccepted = obj.disclaimerAccepted
  return x
}

Profile.fromString = function (str) {
  return Profile.fromObj(JSON.parse(str))
}

Profile.prototype.toObj = function () {
  return JSON.stringify(this)
}
