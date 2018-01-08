'use strict'

angular.module('canoeApp.services').factory('walletService', function ($log, $timeout, lodash, storageService, configService, uxLanguage, $filter, gettextCatalog, $ionicPopup, fingerprintService, ongoingProcess, gettext, $rootScope, txFormatService, $ionicModal, popupService) {
  var root = {}

  root.isEncrypted = function (wallet) {
    if (lodash.isEmpty(wallet)) return
    var isEncrypted = wallet.isPrivKeyEncrypted()
    if (isEncrypted) $log.debug('Wallet is encrypted')
    return isEncrypted
  }

  // An alert dialog
  var askPassword = function (name, title, cb) {
    var opts = {
      inputType: 'password',
      forceHTMLPrompt: true,
      class: 'text-warn'
    }
    popupService.showPrompt(title, name, opts, function (res) {
      if (!res) return cb()
      if (res) return cb(res)
    })
  }

  root.encrypt = function (wallet, cb) {
    var title = gettextCatalog.getString('Enter new spending password')
    var warnMsg = gettextCatalog.getString('Your wallet key will be encrypted. The Spending Password cannot be recovered. Be sure to write it down.')
    askPassword(warnMsg, title, function (password) {
      if (!password) return cb('no password')
      title = gettextCatalog.getString('Confirm your new spending password')
      askPassword(warnMsg, title, function (password2) {
        if (!password2 || password != password2) { return cb('password mismatch') }

        wallet.encryptPrivateKey(password)
        return cb()
      })
    })
  }

  root.decrypt = function (wallet, cb) {
    $log.debug('Disabling private key encryption for' + wallet.name)
    askPassword(null, gettextCatalog.getString('Enter Spending Password'), function (password) {
      if (!password) return cb('no password')

      try {
        wallet.decryptPrivateKey(password)
      } catch (e) {
        return cb(e)
      }
      return cb()
    })
  }

  root.handleEncryptedWallet = function (wallet, cb) {
    if (!root.isEncrypted(wallet)) return cb()

    askPassword(wallet.name, gettextCatalog.getString('Enter Spending Password'), function (password) {
      if (!password) return cb('No password')
      if (!wallet.checkPassword(password)) return cb('Wrong password')

      return cb(null, password)
    })
  }

  root.prepare = function (wallet, cb) {
    fingerprintService.check(wallet, function (err) {
      if (err) return cb(err)

      root.handleEncryptedWallet(wallet, function (err, password) {
        if (err) return cb(err)

        return cb(null, password)
      })
    })
  }

  root.getEncodedWalletInfo = function (wallet, password, cb) {
    var derivationPath = wallet.credentials.getBaseAddressDerivationPath()
    var encodingType = {
      mnemonic: 1,
      xpriv: 2,
      xpub: 3
    }
    var info

    // not supported yet
    if (wallet.credentials.derivationStrategy != 'BIP44' || !wallet.canSign()) { return cb(gettextCatalog.getString('Exporting via QR not supported for this wallet')) }

    var keys = root.getKeysWithPassword(wallet, password)

    if (keys.mnemonic) {
      info = {
        type: encodingType.mnemonic,
        data: keys.mnemonic
      }
    } else {
      info = {
        type: encodingType.xpriv,
        data: keys.xPrivKey
      }
    }

    return cb(null, info.type + '|' + info.data + '|' + wallet.credentials.network.toLowerCase() + '|' + derivationPath + '|' + (wallet.credentials.mnemonicHasPassphrase))
  }

  root.setTouchId = function (wallet, enabled, cb) {
    var opts = {
      touchIdFor: {}
    }
    opts.touchIdFor[wallet.id] = enabled

    fingerprintService.check(wallet, function (err) {
      if (err) {
        opts.touchIdFor[wallet.id] = !enabled
        $log.debug('Error with fingerprint:' + err)
        return cb(err)
      }
      configService.set(opts, cb)
    })
  }

  root.getKeys = function (wallet, cb) {
    root.prepare(wallet, function (err, password) {
      if (err) return cb(err)
      var keys

      try {
        keys = wallet.getKeys(password)
      } catch (e) {
        return cb(e)
      }

      return cb(null, keys)
    })
  }

  root.getKeysWithPassword = function (wallet, password) {
    try {
      return wallet.getKeys(password)
    } catch (e) {}
  }

  root.getSendMaxInfo = function (wallet, opts, cb) {
    opts = opts || {}
    wallet.getSendMaxInfo(opts, function (err, res) {
      return cb(err, res)
    })
  }

  root.getProtocolHandler = function (wallet) {
    if (wallet.coin == 'bch') return 'bitcoincash'
    else return 'bitcoin'
  }

  return root
})
