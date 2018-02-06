'use strict'

angular.module('canoeApp.services').factory('addressbookService', function ($log, nanoService, storageService, lodash) {
  var root = {}

  // We initialize with this entry added
  var DONATE_ADDRESS = 'xrb_1qckwc5o3obkrwbet4amnkya113xq77qpaknsmiq9hwq31tmd5bpyo7sepsw'
  var DONATE_ENTRY = {
    name: 'Donate to Canoe',
    email: 'donate@getcanoe.io',
    address: DONATE_ADDRESS
  }

  root.getDonate = function (cb) {
    return root.get(DONATE_ADDRESS, cb)
  }

  root.initialize = function (cb) {
    storageService.getAddressbook(function (err, ab) {
      if (err) return cb(err)
      if (ab) ab = JSON.parse(ab)
      ab = ab || {}
      if (lodash.isArray(ab)) ab = {} // No array
      if (ab[DONATE_ADDRESS]) return cb('Entry already exist')
      ab[DONATE_ADDRESS] = DONATE_ENTRY
      storageService.setAddressbook(JSON.stringify(ab), function (err, ab) {
        if (err) return cb('Error adding new entry')
        root.list(function (err, ab) {
          return cb(err, ab)
        })
      })
    })
  }

  root.get = function (addr, cb) {
    storageService.getAddressbook(function (err, ab) {
      if (err) return cb(err)
      if (ab) ab = JSON.parse(ab)
      if (ab && ab[addr]) return cb(null, ab[addr])
    })
  }

  root.list = function (cb) {
    storageService.getAddressbook(function (err, ab) {
      if (err) return cb('Could not get the Addressbook')
      if (ab) ab = JSON.parse(ab)
      ab = ab || {}
      return cb(err, ab)
    })
  }

  root.save = function (entry, oldAddress, cb) {
    if (!nanoService.isValidAccount(entry.address)) return cb('Not valid Nano account')
    storageService.getAddressbook(function (err, ab) {
      if (err) return cb(err)
      if (ab) ab = JSON.parse(ab)
      ab = ab || {}
      if (lodash.isArray(ab)) ab = {} // No array
      if (!ab[oldAddress]) return cb('Old entry does not exist')
      if ((entry.address !== oldAddress) && ab[entry.address]) return cb('Other entry with that Nano account already exists')
      delete ab[oldAddress]
      ab[entry.address] = entry
      storageService.setAddressbook(JSON.stringify(ab), function (err, ab) {
        if (err) return cb('Error saving entry')
        root.list(function (err, ab) {
          return cb(err, ab)
        })
      })
    })
  }

  root.add = function (entry, cb) {
    if (!nanoService.isValidAccount(entry.address)) return cb('Not valid Nano account')
    storageService.getAddressbook(function (err, ab) {
      if (err) return cb(err)
      if (ab) ab = JSON.parse(ab)
      ab = ab || {}
      if (lodash.isArray(ab)) ab = {} // No array
      if (ab[entry.address]) return cb('Other entry with that Nano account already exists')
      ab[entry.address] = entry
      storageService.setAddressbook(JSON.stringify(ab), function (err, ab) {
        if (err) return cb('Error adding new entry')
        root.list(function (err, ab) {
          return cb(err, ab)
        })
      })
    })
  }

  root.remove = function (addr, cb) {
    if (!nanoService.isValidAccount(addr)) return cb('Not valid Nano account')
    storageService.getAddressbook(function (err, ab) {
      if (err) return cb(err)
      if (ab) ab = JSON.parse(ab)
      ab = ab || {}
      if (lodash.isEmpty(ab)) return cb('Addressbook is empty')
      if (!ab[addr]) return cb('Entry does not exist')
      delete ab[addr]
      storageService.setAddressbook(JSON.stringify(ab), function (err) {
        if (err) return cb('Error deleting entry')
        root.list(function (err, ab) {
          return cb(err, ab)
        })
      })
    })
  }

  root.removeAll = function () {
    storageService.removeAddressbook(function (err) {
      if (err) return cb('Error deleting addressbook')
      return cb()
    })
  }

  return root
})
