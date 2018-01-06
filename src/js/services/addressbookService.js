'use strict'

angular.module('canoeApp.services').factory('addressbookService', function ($log, bitcore, raiblocksService, storageService, lodash) {
  var root = {}

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

  root.add = function (entry, cb) {
    if (!raiblocksService.isValidAccount(entry.address)) return cb('Not valid RaiBlocks account')
    storageService.getAddressbook(function (err, ab) {
      if (err) return cb(err)
      if (ab) ab = JSON.parse(ab)
      ab = ab || {}
      if (lodash.isArray(ab)) ab = {} // No array
      if (ab[entry.address]) return cb('Entry already exist')
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
    if (!raiblocksService.isValidAccount(addr)) return cb('Not valid RaiBlocks account')
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
