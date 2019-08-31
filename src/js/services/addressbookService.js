'use strict'
/* global angular */
angular.module('canoeApp.services').factory('addressbookService', function ($log, nanoService, storageService, lodash) {
  var root = {}

  // We initialize with this entry added
  var DONATE_ADDRESS = 'nano_1qckwc5o3obkrwbet4amnkya113xq77qpaknsmiq9hwq31tmd5bpyo7sepsw'
  var DONATE_ENTRY = {
    name: 'Donate to Canoe',
    email: 'donate@getcanoe.io',
    address: DONATE_ADDRESS,
    alias: {
      'id': 1,
      // "alias": "canoe",
      'address': 'nano_1qckwc5o3obkrwbet4amnkya113xq77qpaknsmiq9hwq31tmd5bpyo7sepsw',
      'listed': true,
      'verified': false,
      'signature': '3EEB693EC4F28655518FB7EC804B730203DC2D3C4CF316BE492242CCFFC0294B22DD020D0AA9F7640D90B0876B6F3A55B60F0DF7F3D32F448ABEBA3F23D86F01',
      'createdAt': '2018-02-28T05:29:00.367Z',
      'updatedAt': '2018-03-01T05:55:13.511Z',
      'avatar': 'iVBORw0KGgoAAAANSUhEUgAAAEYAAABGCAMAAABG8BK2AAAABGdBTUEAALGPC/xhBQAAABJ0RVh0U29mdHdhcmUASmRlbnRpY29um8oJfgAAAHtQTFRFAAAATExMTExMTExMnMxmnMxmnMxmTExMTExMTExMnMxmnMxmnMxmTExMTExMnMxmnMxmnMxmnMxmnMxmnMxmnMxmnMxmnMxmnMxmnMxmnMxmnMxmnMxmnMxmnMxmnMxmnMxmnMxmnMxmnMxmnMxmnMxmnMxmnMxmnMxmb+LL+QAAACl0Uk5TACa/GSa/GeX/2OX/2MyyzLIsmRPrbAbSP6wf+H+MZlml8kzfcjMMklJnT9lcAAABrElEQVR4nO2X2VaEMAyGowIiVWcBGRxwFsft/Z9QKEtD2mR6Ub0iN0Pm//JT2qbnFGCJf4yb2zucRnEipARGwn36gKQoU48JmxJ4JqRIassUKiQpgYmLkXSZKSQpgS2XURrKxkKSEtjh0ktTWV9IUgI7XToJlXWFJCUwsnlKcTyvFI41SQkcfjSB5ibUSoXaN6F2caieCtXhFASI+3n1gydhPuw2NryNDRtBUWnL2bhgI1ApL9w2ThgJVHpx2jCwtd2nKHcOGw4G0nxIqWwbHiZHAS56tWx4mH8B7Ou5TRQLMPu5AA22yd/awQkwO/lQZub5UOip4mF+K8BxfKhW427kYX5jDpGchiFcgdk20Z/WnBWykWC2aQHeL2ZxrsGTgtaz4ow9DorRpPjgTLwOisFlm0su1w8K/RR/jpL9YX4HRfuTHY22E2GnoCVVN19IVAcJdgudtN7PylSRCzBShIOis1Hf4AULva9t6o0fLPS+nvHYExZ6X6//jycs9H73/6X0hPne1yWNJ8y3ibapEz+Yb9p+Hk5+8HL1WK4ew1GwXD2Wq4d09VjiT+IXBhpFh295OqwAAAAASUVORK5CYII='
    }
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
      return cb(null, null)
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
    if (!nanoService.isValidAccount(entry.address)) return cb('Not valid BCB account')
    storageService.getAddressbook(function (err, ab) {
      if (err) return cb(err)
      if (ab) ab = JSON.parse(ab)
      ab = ab || {}
      if (lodash.isArray(ab)) ab = {} // No array
      if (!ab[oldAddress]) return cb('Old entry does not exist')
      if ((entry.address !== oldAddress) && ab[entry.address]) return cb('Other entry with that BCB account already exists')
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
    if (!nanoService.isValidAccount(entry.address)) return cb('Not valid BCB account')
    storageService.getAddressbook(function (err, ab) {
      if (err) return cb(err)
      if (ab) ab = JSON.parse(ab)
      ab = ab || {}
      if (lodash.isArray(ab)) ab = {} // No array
      if (ab[entry.address]) return cb('Other entry with that BCB account already exists')
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
    if (!nanoService.isValidAccount(addr)) return cb('Not valid BCB account')
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
