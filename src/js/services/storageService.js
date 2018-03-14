'use strict'
/* global angular */
angular.module('canoeApp.services')
  .factory('storageService', function (logHeader, fileStorageService, localStorageService, $log, lodash, platformInfo, $timeout) {
    var root = {}
    var storage

    // File storage is not supported for writing according to
    // https://github.com/apache/cordova-plugin-file/#supported-platforms
    var shouldUseFileStorage = platformInfo.isCordova && !platformInfo.isWP

    if (shouldUseFileStorage) {
      $log.debug('Using: FileStorage')
      storage = fileStorageService
    } else {
      $log.debug('Using: LocalStorage')
      storage = localStorageService
    }

    var getUUID = function (cb) {
      // TO SIMULATE MOBILE
      // return cb('hola');
      if (!window || !window.plugins || !window.plugins.uniqueDeviceID) { return cb(null) }
      window.plugins.uniqueDeviceID.get(
        function (uuid) {
          return cb(uuid)
        }, cb)
    }

    // This is only used in Canoe, we used to encrypt profile using device's UUID.
    var decryptOnMobile = function (text, cb) {
      var json
      try {
        json = JSON.parse(text)
      } catch (e) {
        $log.warn('Could not open profile:' + text)

        var i = text.lastIndexOf('}{')
        if (i > 0) {
          text = text.substr(i + 1)
          $log.warn('trying last part only:' + text)
          try {
            json = JSON.parse(text)
            $log.warn('Worked... saving.')
            storage.set('profile', text, function () {})
          } catch (e) {
            $log.warn('Could not open profile (2nd try):' + e)
          }
        }
      }

      if (!json) return cb('Could not access storage')

      if (!json.iter || !json.ct) {
        $log.debug('Profile is not encrypted')
        return cb(null, text)
      }

      $log.debug('Profile is encrypted')
      getUUID(function (uuid) {
        $log.debug('Device UUID:' + uuid)
        if (!uuid) { return cb('Could not decrypt storage: could not get device ID') }

        try {
          // TODO text = sjcl.decrypt(uuid, text)

          $log.info('Migrating to unencrypted profile')
          return storage.set('profile', text, function (err) {
            return cb(err, text)
          })
        } catch (e) {
          $log.warn('Decrypt error: ', e)
          return cb('Could not decrypt storage: device ID mismatch')
        }
        return cb(null, text)
      })
    }

    root.storeNewProfile = function (profile, cb) {
      storage.create('profile', profile.toObj(), cb)
    }

    root.storeProfile = function (profile, cb) {
      storage.set('profile', profile.toObj(), cb)
    }

    root.getProfile = function (cb) {
      storage.get('profile', function (err, str) {
        if (err || !str) { return cb(err) }

        decryptOnMobile(str, function (err, str) {
          if (err) return cb(err)
          var p, err
          try {
            p = Profile.fromString(str)
          } catch (e) {
            $log.debug('Could not read profile:', e)
            err = new Error('Could not read profile:' + p)
          }
          return cb(err, p)
        })
      })
    }

    root.deleteProfile = function (cb) {
      storage.remove('profile', cb)
    }

    root.setFeedbackInfo = function (feedbackValues, cb) {
      storage.set('feedback', feedbackValues, cb)
    }

    root.getFeedbackInfo = function (cb) {
      storage.get('feedback', cb)
    }

    root.storeWallet = function (wallet, cb) {
      storage.set('raiwallet', wallet, cb)
    }

    root.loadWallet = function (cb) {
      storage.get('raiwallet', cb)
    }

    root.storeOldWallet = function (wallet, cb) {
      storage.set('wallet', wallet, cb)
    }

    root.loadOldWallet = function (cb) {
      storage.get('wallet', cb)
    }

    root.getLastAddress = function (walletId, cb) {
      storage.get('lastAddress-' + walletId, cb)
    }

    root.storeLastAddress = function (walletId, address, cb) {
      storage.set('lastAddress-' + walletId, address, cb)
    }

    root.clearLastAddress = function (walletId, cb) {
      storage.remove('lastAddress-' + walletId, cb)
    }

    root.setBackupFlag = function (cb) {
      storage.set('backup-timestamp', Date.now(), cb)
    }

    root.getBackupFlag = function (cb) {
      storage.get('backup-timestamp', cb)
    }

    root.clearBackupFlag = function (walletId, cb) {
      storage.remove('backup-' + walletId, cb)
    }

    root.setCleanAndScanAddresses = function (walletId, cb) {
      storage.set('CleanAndScanAddresses', walletId, cb)
    }

    root.getCleanAndScanAddresses = function (cb) {
      storage.get('CleanAndScanAddresses', cb)
    }

    root.removeCleanAndScanAddresses = function (cb) {
      storage.remove('CleanAndScanAddresses', cb)
    }

    root.getConfig = function (cb) {
      storage.get('config', cb)
    }

    root.storeConfig = function (val, cb) {
      $log.debug('Storing Preferences', val)
      storage.set('config', val, cb)
    }

    root.clearConfig = function (cb) {
      storage.remove('config', cb)
    }

    root.getHomeTipAccepted = function (cb) {
      storage.get('homeTip', cb)
    }

    root.setHomeTipAccepted = function (val, cb) {
      storage.set('homeTip', val, cb)
    }

    root.setHideBalanceFlag = function (walletId, val, cb) {
      storage.set('hideBalance-' + walletId, val, cb)
    }

    root.getHideBalanceFlag = function (walletId, cb) {
      storage.get('hideBalance-' + walletId, cb)
    }

    // for compatibility
    root.getCanoeDisclaimerFlag = function (cb) {
      storage.get('agreeDisclaimer', cb)
    }

    root.setRemotePrefsStoredFlag = function (cb) {
      storage.set('remotePrefStored', true, cb)
    }

    root.getRemotePrefsStoredFlag = function (cb) {
      storage.get('remotePrefStored', cb)
    }

    root.setAddressbook = function (addressbook, cb) {
      storage.set('addressbook', addressbook, cb)
    }

    root.getAddressbook = function (cb) {
      storage.get('addressbook', cb)
    }

    root.removeAddressbook = function (cb) {
      storage.remove('addressbook', cb)
    }

    root.setTransactionTimes = function (transactionTimes, cb) {
      storage.set('transactionTimes', transactionTimes, cb)
    }

    root.getTransactionTimes = function (cb) {
      storage.get('transactionTimes', cb)
    }

    root.setLastCurrencyUsed = function (lastCurrencyUsed, cb) {
      storage.set('lastCurrencyUsed', lastCurrencyUsed, cb)
    }

    root.getLastCurrencyUsed = function (cb) {
      storage.get('lastCurrencyUsed', cb)
    }

    root.setAmountInputDefaultCurrency = function (amountInputDefaultCurrency, cb) {
      storage.set('amountInputDefaultCurrency', amountInputDefaultCurrency, cb)
    }

    root.getAmountInputDefaultCurrency = function (cb) {
      storage.get('amountInputDefaultCurrency', cb)
    }

    root.checkQuota = function () {
      var block = ''
      // 50MB
      for (var i = 0; i < 1024 * 1024; ++i) {
        block += '12345678901234567890123456789012345678901234567890'
      }
      storage.set('test', block, function (err) {
        $log.error('CheckQuota Return:' + err)
      })
    }

    root.setTxHistory = function (txs, walletId, cb) {
      try {
        storage.set('txsHistory-' + walletId, txs, cb)
      } catch (e) {
        $log.error('Error saving tx History. Size:' + txs.length)
        $log.error(e)
        return cb(e)
      }
    }
    /*

    root.getTxHistory = function (walletId, cb) {
      storage.get('txsHistory-' + walletId, cb)
    }

    root.removeTxHistory = function (walletId, cb) {
      storage.remove('txsHistory-' + walletId, cb)
    }

    root.setBalanceCache = function (addr, data, cb) {
      storage.set('balanceCache-' + addr, data, cb)
    }

    root.getBalanceCache = function (addr, cb) {
      storage.get('balanceCache-' + addr, cb)
    }

    root.removeBalanceCache = function (cardId, cb) {
      storage.remove('balanceCache-' + cardId, cb)
    }
*/
    root.setAppIdentity = function (network, data, cb) {
      storage.set('appIdentity-' + network, data, cb)
    }

    root.getAppIdentity = function (network, cb) {
      storage.get('appIdentity-' + network, function (err, data) {
        if (err) return cb(err)
        cb(err, JSON.parse(data || '{}'))
      })
    }

    root.removeAppIdentity = function (network, cb) {
      storage.remove('appIdentity-' + network, cb)
    }

    root.removeAllWalletData = function (walletId, cb) {
      root.clearLastAddress(walletId, function (err) {
        if (err) return cb(err)
        root.removeTxHistory(walletId, function (err) {
          if (err) return cb(err)
          root.clearBackupFlag(walletId, function (err) {
            return cb(err)
          })
        })
      })
    }

    root.setTxConfirmNotification = function (txid, val, cb) {
      storage.set('txConfirmNotif-' + txid, val, cb)
    }

    root.getTxConfirmNotification = function (txid, cb) {
      storage.get('txConfirmNotif-' + txid, cb)
    }

    root.removeTxConfirmNotification = function (txid, cb) {
      storage.remove('txConfirmNotif-' + txid, cb)
    }

    return root
  })
