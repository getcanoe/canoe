'use strict'
/* global BigNumber angular Profile */
angular.module('canoeApp.services')
  .factory('profileService', function profileServiceFactory ($rootScope, $timeout, $filter, $log, $state, lodash, storageService, nanoService, configService, gettextCatalog, uxLanguage, platformInfo, txFormatService, addressbookService, rateService) {
    // var isChromeApp = platformInfo.isChromeApp
    // var isWindowsPhoneApp = platformInfo.isCordova && platformInfo.isWP
    // var isIOS = platformInfo.isIOS

    // Avoid 15 signific digit error
    BigNumber.config({ ERRORS: false })

    // 1 BCB = 1 Mnano = 10^30 raw
    var rawPerNano = BigNumber('1000000000000000000000000000000')

    // This is where we hold profile, wallet and password to decrypt it
    var root = {}
    root.profile = null
    root.password = null

    root.getWallet = function () {
      return nanoService.getWallet()
    }

    // Removed wallet from RAM
    root.unloadWallet = function () {
      nanoService.unloadWallet()
      root.enteredPassword(null)
    }

    // This is where we keep the password entered when you start BCB wallet
    // or when timeout is reached and it needs to be entered again.
    root.enteredPassword = function (pw) {
      root.password = pw
    }

    root.getEnteredPassword = function (pw) {
      return root.password
    }

    root.checkPassword = function (pw) {
      if (root.getWallet()) {
        return root.getWallet().checkPass(pw)
      }
      return false
    }

    root.changePass = function (pw, currentPw) {
      if (root.getWallet()) {
        $log.info('Changed password for wallet')
        root.getWallet().changePass(currentPw, pw)
        root.enteredPassword(pw)
        nanoService.saveWallet(root.getWallet(), function () {})
      } else {
        $log.error('No wallet to change password for')
      }
    }

    root.getSeed = function () {
      try {
        return root.getWallet().getSeed(root.password)
      } catch (e) {
        return null // Bad password or no wallet
      }
    }

    root.fetchServerStatus = function (cb) {
      nanoService.fetchServerStatus(cb)
    }

    root.toFiat = function (raw, code) {
      var rate = BigNumber(rateService.getRate(code))
      return root.formatAnyAmount(BigNumber(raw).times(rate).dividedBy(rawPerNano), uxLanguage.currentLanguage, code)
    }

    root.fromFiat = function (amount, code) {
      var rate = rateService.getRate(code)
      return (amount / rate) * rawPerNano
    }

    // Return a URI for the seed given the password
    root.getSeedURI = function (pwd) {
      // xrbseed:<encoded seed>[?][label=<label>][&][message=<message>][&][lastindex=<index>]
      return 'nanoseed:' + root.getWallet().getSeed(pwd) + '?lastindex=' + (root.getWallet().getAccountIds().length - 1)
    }

    // Return an object with wallet member holding the encrypted hex of wallet
    root.getExportWallet = function () {
      return {wallet: root.getWallet().pack()}
    }

    // Import wallet from JSON and password
    root.importWallet = function (json, password, cb) {
      var imported = JSON.parse(json)
      var walletData = imported.wallet
      // Then we try to load wallet
      nanoService.createWalletFromData(walletData, password, function (err, wallet) {
        if (err) { return cb(err) }
        // And we can also try merging addressBook
        if (imported.addressBook) {
          root.mergeAddressBook(imported.addressBook, function (err) {
            if (err) {
              $log.error(err)
            } else {
              $log.info('Merged addressbook with imported addressbook')
            }
          })
        }
        nanoService.saveWallet(wallet, function () {
          // If that succeeded we consider this entering the password
          root.enteredPassword(password)
          $log.info('Successfully imported wallet')
          cb()
        })
      })
    }

    root.formatAmount = function (raw, decimals) {
      return root.formatAnyAmount(new BigNumber(raw).dividedBy(rawPerNano), uxLanguage.currentLanguage)
    }

    root.formatAmountWithUnit = function (raw) {
      if (isNaN(raw)) return
      // TODO use current unit in settings knano, Mnano etc
      return root.formatAnyAmount(new BigNumber(raw).dividedBy(rawPerNano), uxLanguage.currentLanguage, 'BCB')
    }

    // A quite resilient and open minded way to format amounts from any epoch and location
    root.formatAnyAmount = function (amount, loc, cur) {
      var result
      var bigAmount
      var isNan = false

      try {
        bigAmount = new BigNumber(amount)
      } catch (err) {
        isNan = true
      }

      if (amount !== undefined && !isNan) {
        var decimalSeparator = '.'
        var knownLoc = true
        try {
          decimalSeparator = new BigNumber(1.1).toNumber().toLocaleString(loc)[1]
        } catch (err) {
          knownLoc = false
        }

        if (knownLoc) {
          var knownCur = true
          BigNumber.config({ EXPONENTIAL_AT: -31 })
          try {
            1.1.toLocaleString('en', {style: 'currency', currency: cur})
          } catch (err) {
            knownCur = false
          }
          if (knownCur) {
            // Known fiat currency
            result = bigAmount.toNumber().toLocaleString(loc, {style: 'currency', currency: cur})
          } else {
            // Crypto or alien currency
            var integerPart = bigAmount.round(0, BigNumber.ROUND_DOWN)
            var decimalPart = bigAmount.minus(integerPart)
            var cryptoDisplay = integerPart.toString()
            if (knownLoc) {
              cryptoDisplay = integerPart.toNumber().toLocaleString(loc)
            }
            if (!decimalPart.isZero()) {
              cryptoDisplay += decimalSeparator
              cryptoDisplay += decimalPart.toString().substr(2)
            }
            if (cur) cryptoDisplay += ' ' + cur
            result = cryptoDisplay
          }
        } else {
          result = bigAmount.toString()
          if (cur) result += ' ' + cur
        }
      }

      return result
    }

    root.formatAmountWithUnit = function (raw) {
      if (isNaN(raw)) return
      // TODO use current unit in settings knano, Mnano etc
      return root.formatAmount(raw, 2) + ' BCB'
    }

    root.updateAccountSettings = function (account) {
      configService.whenAvailable(function (config) {
        account.name = (config.aliasFor && config.aliasFor[account.id])
        account.meta.color = (config.colorFor && config.colorFor[account.id])
        account.email = config.emailFor && config.emailFor[account.id]
      })
    }

    // We set this still, but we do not really use it
    root.setBackupFlag = function () {
      storageService.setBackupFlag(function (err) {
        if (err) $log.error(err)
        $log.debug('Backup timestamp stored')
      })
    }

    // Not used, but perhaps an idea?
    root.needsBackup = function (cb) {
      storageService.getBackupFlag(function (err, val) {
        if (err) $log.error(err)
        if (val) return cb(false)
        return cb(true)
      })
    }

    root.bindProfile = function (profile, cb) {
      root.profile = profile
      configService.get(function (err) {
        $log.debug('Preferences read')
        if (err) return cb(err)
        return cb()
      })
    }

    root._queue = []
    root.whenAvailable = function (cb) {
      if (!root.isBound) {
        root._queue.push(cb)
        return
      }
      return cb()
    }

    root.loadAndBindProfile = function (cb) {
      storageService.getProfile(function (err, profile) {
        if (err) {
          $rootScope.$emit('Local/DeviceError', err)
          return cb(err)
        }
        if (!profile) {
          return cb(new Error('NOPROFILE: No profile'))
        } else if (!profile.disclaimerAccepted) {
          // Hacky: if the disclaimer wasn't accepted, assume the onboarding didn't complete
          // so just remove the profile
          storageService.deleteProfile(
            function () {
              root.loadAndBindProfile(cb)
            }
          )
        } else {
          $log.debug('Profile read')
          $log.debug('Profile: ' + JSON.stringify(profile))
          return root.bindProfile(profile, cb)
        }
      })
    }

    // Do we have funds? Presuming we are up to date here. It's a bigInt
    root.hasFunds = function () {
      return root.getWallet().getWalletBalance().greater(0)
    }

    // Create wallet and save it, seed can be null.
    root.createWallet = function (password, seed, cb) {
      // Synchronous now
      nanoService.createWallet(password, seed, function (err, wallet) {
        if (err) return cb(err)
        root.setWallet(wallet, function (err) {
          if (err) return cb(err)
          root.enteredPassword(password) // Making sure it's there
          nanoService.saveWallet(root.getWallet(), cb)
        })
      })
    }

    // Create account in wallet and save wallet
    root.createAccount = function (name, cb) {
      var accountName = name || gettextCatalog.getString('Default Account')
      nanoService.createAccount(root.getWallet(), accountName)
      nanoService.saveWallet(root.getWallet(), cb)
    }

    root.saveWallet = function (cb) {
      nanoService.saveWallet(root.getWallet(), cb)
    }

    // Load wallet from local storage using entered password
    root.loadWallet = function (cb) {
      if (!root.password) {
        return cb('No password entered, can not load wallet from local storage')
      }
      nanoService.createWalletFromStorage(root.password, function (err, wallet) {
        if (err) return cb(err)
        root.setWallet(wallet, function (err) {
          if (err) return cb(err)
          cb(null, wallet)
        })
      })
    }

    root.getId = function () {
      return root.profile.id
    }

    root.getWalletId = function () {
      return root.profile.walletId
    }

    root.getAccount = function (addr) {
      return root.getWallet().getAccount(addr)
    }

    root.getPoW = function (addr) {
      if (!root.getWallet()) {
        return null
      } else {
        return root.getWallet().getPoW(addr)
      }
    }

    root.getRepresentativeFor = function (addr) {
      return nanoService.getRepresentativeFor(addr)
    }

    root.getTxHistory = function (addr) {
      var acc = root.getAccount(addr)
      var blocks = root.getWallet().getLastNBlocks(addr, 100000)
      var txs = []
      lodash.each(blocks, function (blk) {
        var type = blk.getType()
        var tx = {type: type}
        tx.time = blk.getTimestamp() / 1000 // Seconds
        if (tx.time) {
          var isToday = new Date(tx.time * 1000).toDateString() === new Date().toDateString()
          tx.timeStr = isToday ? new Date(tx.time * 1000).toLocaleTimeString() : new Date(tx.time * 1000).toLocaleString()
        }
        tx.account = acc
        tx.amount = blk.getAmount()
        tx.amountStr = root.formatAmount(tx.amount, 2)
        tx.unitStr = 'BCB' // TODO
        tx.destination = blk.getDestination()
        tx.origin = blk.getOrigin()
        tx.representative = blk.getRepresentative() || ''
        tx.hash = blk.getHash(true)
        txs.push(tx)
      })
      return txs
    }

    root.send = function (tx, cb) {
      nanoService.send(root.getWallet(), tx.account, tx.address, tx.amount, tx.message, tx.isManta)
      cb()
    }

    // Not used yet but could be useful
    root.mergeAddressBook = function (addressBook, cb) {
      storageService.getAddressbook(function (err, localAddressBook) {
        if (err) $log.debug(err)
        var localAddressBook1 = {}
        try {
          localAddressBook1 = JSON.parse(localAddressBook)
        } catch (ex) {
          $log.warn(ex)
        }
        lodash.merge(addressBook, localAddressBook1)
        storageService.setAddressbook(JSON.stringify(addressBook), function (err) {
          if (err) return cb(err)
          return cb(null)
        })
      })
    }

    root.storeProfile = function (cb) {
      storageService.storeProfile(root.profile, function (err) {
        $log.debug('Saved Profile')
        if (cb) return cb(err)
      })
    }

    root.createProfile = function (cb) {
      $log.info('Creating profile')

      configService.get(function (err) {
        if (err) $log.debug(err)

        var p = Profile.create()
        storageService.storeNewProfile(p, function (err) {
          if (err) return cb(err)

          // Added this here, not the best place
          addressbookService.initialize(function () {
            root.bindProfile(p, function (err) {
              // ignore NONAGREEDDISCLAIMER
              if (err && err.toString().match('NONAGREEDDISCLAIMER')) return cb()
              return cb(err)
            })
          })
        })
      })
    }

    root.setDisclaimerAccepted = function (cb) {
      root.profile.disclaimerAccepted = true
      storageService.storeProfile(root.profile, function (err) {
        return cb(err)
      })
    }

    root.setWallet = function (wallet, cb) {
      root.profile.walletId = wallet.getId()
      $rootScope.$emit('walletloaded')
      storageService.storeProfile(root.profile, function (err) {
        return cb(err)
      })
    }

    root.isDisclaimerAccepted = function (cb) {
      var disclaimerAccepted = root.profile && root.profile.disclaimerAccepted
      if (disclaimerAccepted) { return cb(true) }

      // OLD flag
      storageService.getCanoeDisclaimerFlag(function (err, val) {
        if (val) {
          root.profile.disclaimerAccepted = true
          return cb(true)
        } else {
          return cb()
        }
      })
    }

    root.getAccountWithId = function (id) {
      return lodash.find(root.getAccounts(), function (a) { return a.id === id })
    }

    root.getAccountWithName = function (name) {
      return lodash.find(root.getAccounts(), function (a) { return a.name === name })
    }

    // This gets copies of all accounts in the wallet with
    // additional data attached, like formatted balances etc
    root.getAccounts = function () {
      // No wallet loaded
      if (!root.getWallet()) {
        return []
      }
      var accounts = root.getWallet().getAccounts()
      var work = root.getPoW()
      // Add formatted balances and timestamps
      lodash.each(accounts, function (acc) {
        acc.balanceStr = root.formatAmountWithUnit(parseInt(acc.balance))
        var config = configService.getSync().wallet.settings
        if (work[acc.id]) {
          acc.work = work[acc.id]
        } else {
          acc.work = null
        }
        // Don't show unless rate is loaded, ui update will be lanched by $broadcast('rates.loaded')
        acc.alternativeBalanceStr = 'hide'
        acc.alternativeBalanceStr = root.toFiat(acc.balance, config.alternativeIsoCode, 'bcb')
        acc.pendingBalanceStr = root.formatAmountWithUnit(acc.pendingBalance)
      })

      return accounts
    }

    root.toggleHideBalanceFlag = function (accountId, cb) {
      var acc = root.getAccount(accountId)
      acc.meta.balanceHidden = !acc.meta.balanceHidden
      nanoService.saveWallet(root.getWallet(), cb)
    }

    return root
  })
