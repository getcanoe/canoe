'use strict'
/* global XMLHttpRequest angular Profile */
angular.module('canoeApp.services')
  .factory('profileService', function profileServiceFactory ($rootScope, $timeout, $filter, $log, $state, lodash, storageService, nanoService, configService, gettextCatalog, uxLanguage, platformInfo, txFormatService, addressbookService, appConfigService) {
    var isChromeApp = platformInfo.isChromeApp
    var isWindowsPhoneApp = platformInfo.isCordova && platformInfo.isWP
    var isIOS = platformInfo.isIOS

    var RAW_PER_NANO = Math.pow(10, 30) // 1 NANO = 1 Mnano = 10^30 raw

    var rate = 0 // Current rate fetched every 60 sec
    var lastTime = 0

    // This is where we hold profile, wallet and password to decrypt it
    var root = {}
    root.profile = null
    root.password = null

    root.getWallet = function () {
      return nanoService.getWallet()
    }

    // This is where we keep the password entered when you start Canoe
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

    root.updateRate = function (code, force) {
      if (!rate || (Date.now() > (lastTime + 60000)) || force) {
        root.getCurrentCoinmarketcapRate(code, function (err, rt) {
          if (err) {
            $log.warn(err)
          } else {
            rate = rt
            lastTime = Date.now()
          }
        })
      }
    }

    root.toFiat = function (raw, code, force) {
      root.updateRate(code, force)
      return (raw * rate) / RAW_PER_NANO
    }

    root.fromFiat = function (amount, code) {
      root.updateRate(code)
      return (amount / rate) * RAW_PER_NANO
    }

    root.getCurrentCoinmarketcapRate = function (localCurrency, cb) {
      var local = localCurrency || 'usd'
      local = local.toLowerCase()
      var xhr = new XMLHttpRequest()
      xhr.open('GET', 'https://api.coinmarketcap.com/v1/ticker/nano/?convert=BTC', true)
      xhr.send()
      xhr.onreadystatechange = processRequest
      function processRequest (e) {
        function processRequest (e) {
          if (xhr2.readyState === 4 && xhr2.status === 200) {
            var response = JSON.parse(xhr2.responseText)
            var localPrice = response['rate']
            cb(null, (localPrice * btcPrice))

            // Refresh ui
            $rootScope.$broadcast('rates.loaded')
          }
        }
        if (xhr.readyState === 4 && xhr.status === 200) {
          var response = JSON.parse(xhr.responseText)
          var btcPrice = response[0]['price_btc']

          var xhr2 = new XMLHttpRequest()
          xhr2.open('GET', 'https://bitpay.com/api/rates/' + local, true)
          xhr2.send()
          xhr2.onreadystatechange = processRequest
        }
      }
    }

    // Create a new wallet from a seed
    root.importSeed = function (password, seed, cb) {
      $log.debug('Importing Wallet Seed')
      // Synchronous now
      nanoService.createWallet(password, seed, function (err, wallet) {
        if (err) return cb(err)
        root.setWallet(wallet, function (err) {
          if (err) return cb(err)
          nanoService.repair() // So we fetch truth from lattice, sync
          nanoService.saveWallet(root.getWallet(), cb)          
          // Refresh ui
          root.loadWallet()
          $rootScope.$broadcast('wallet.imported') 
        })
      })
    }

    // Return a URI for the seed given the password
    root.getSeedURI = function (pwd) {
      // xrbseed:<encoded seed>[?][label=<label>][&][message=<message>][&][lastindex=<index>]
      return 'xrbseed:' + root.getWallet().getSeed(pwd) + '?lastindex=' + (root.getWallet().getAccountIds().length - 1)
    }

    // Return an object with wallet member holding the encrypted hex of wallet
    root.getExportWallet = function () {
      return {wallet: root.getWallet().pack()}
    }

    // Import wallet from JSON and password, throws exception on failure
    root.importWallet = function (json, password, cb) {
      var imported = JSON.parse(json)
      var walletData = imported.wallet
      // Then we try to load wallet
      nanoService.createWalletFromData(walletData, password, function (err, wallet) {
        if (err) {
          throw new Error(err)
        }
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
            
          // Refresh ui
          root.loadWallet()
          $rootScope.$broadcast('wallet.imported') 
          $log.info('Successfully imported wallet')
          cb()
        })
      })
    }

    root.formatAmount = function (raw, decimals) {
      if (raw === 0) {
        return raw.toFixed(decimals)
      } else {
        var balance = raw / RAW_PER_NANO
        if (Math.round(balance * Math.pow(10, decimals)) === 0) {
          return balance.toString()
        } else {
          return balance.toFixed(decimals)
        }
      }
    }

    root.formatAmountWithUnit = function (raw) {
      if (isNaN(raw)) return
      // TODO use current unit in settings knano, Mnano etc
      return root.formatAmount(raw, 2) + ' NANO'
    }

    root.updateAccountSettings = function (account) {
      var defaults = configService.getDefaults()
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

    // Create wallet and default account (which saves wallet), seed can be null.
    root.createWallet = function (password, seed, cb) {
      // Synchronous now
      nanoService.createWallet(password, seed, function (err, wallet) {
        if (err) return cb(err)
        root.setWallet(wallet, function (err) {
          if (err) return cb(err)
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
        if (err) {
          return cb(err)
        }
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

    root.send = function (tx, cb) {
      nanoService.send(root.getWallet(), tx.account, tx.address, tx.amount)
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
      var defaults = configService.getDefaults()

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

      // Add formatted balances and timestamps
      lodash.each(accounts, function (acc) {
        acc.balanceStr = root.formatAmountWithUnit(parseInt(acc.balance))
        var config = configService.getSync().wallet.settings        
        // Don't show unless rate is loaded, ui update will be lanched by $broadcast('rates.loaded')
        acc.alternativeBalanceStr = 'hide'
        var altBalance = root.toFiat(parseInt(acc.balance), config.alternativeIsoCode, 'nano', true)
        if (altBalance !== 0) {
          acc.alternativeBalanceStr = $filter('formatFiatAmount')(parseFloat(altBalance).toFixed(2)) + ' ' + config.alternativeIsoCode
        }

        acc.pendingBalanceStr = root.formatAmountWithUnit(parseInt(acc.pendingBalance))
      })

      return accounts
      // Sorted in creation timestamp
      // return lodash.sortBy(accounts, [
      //   'createdOn'
      // ])
    }

    root.toggleHideBalanceFlag = function (accountId, cb) {
      var acc = root.getAccount(accountId)
      acc.meta.balanceHidden = !acc.meta.balanceHidden
      nanoService.saveWallet(root.getWallet(), cb)
    }

    root.getNotifications = function (opts, cb) {
      opts = opts || {}

      var TIME_STAMP = 60 * 60 * 6
      var MAX = 30

      var typeFilter = {
        'NewOutgoingTx': 1,
        'NewIncomingTx': 1
      }

      var w = root.getAccounts()
      if (lodash.isEmpty(w)) return cb()

      var l = w.length,
        j = 0,
        notifications = []

      function isActivityCached (wallet) {
        return wallet.cachedActivity && wallet.cachedActivity.isValid
      };

      function updateNotifications (wallet, cb2) {
        if (isActivityCached(wallet) && !opts.force) return cb2()
        // TODO
/*        wallet.getNotifications({
          timeSpan: TIME_STAMP,
          includeOwn: true
        }, function (err, n) {
          if (err) return cb2(err)

          wallet.cachedActivity = {
            n: n.slice(-MAX),
            isValid: true
          }

          return cb2()
        }) */
      };

      function process (notifications) {
        if (!notifications) return []

        var shown = lodash.sortBy(notifications, 'createdOn').reverse()

        shown = shown.splice(0, opts.limit || MAX)

        lodash.each(shown, function (x) {
          x.txpId = x.data ? x.data.txProposalId : null
          x.txid = x.data ? x.data.txid : null
          x.types = [x.type]

          if (x.data && x.data.amount) { x.amountStr = txFormatService.formatAmountStr(x.wallet.coin, x.data.amount) }

          x.action = function () {
            // TODO?
            // $state.go('tabs.account', {
            //   walletId: x.walletId,
            //   txpId: x.txpId,
            //   txid: x.txid,
            // });
          }
        })

        var finale = shown // GROUPING DISABLED!

        var finale = [],
          prev

        // Item grouping... DISABLED.

        // REMOVE (if we want 1-to-1 notification) ????
        lodash.each(shown, function (x) {
          if (prev && prev.walletId === x.walletId && prev.txpId && prev.txpId === x.txpId && prev.creatorId && prev.creatorId === x.creatorId) {
            prev.types.push(x.type)
            prev.data = lodash.assign(prev.data, x.data)
            prev.txid = prev.txid || x.txid
            prev.amountStr = prev.amountStr || x.amountStr
            prev.creatorName = prev.creatorName || x.creatorName
          } else {
            finale.push(x)
            prev = x
          }
        })

        // var u = bwcService.getUtils()
        lodash.each(finale, function (x) {
          if (x.data && x.data.message && x.wallet && x.wallet.credentials.sharedEncryptingKey) {
            // TODO TODO TODO => BWC
            x.message = u.decryptMessage(x.data.message, x.wallet.credentials.sharedEncryptingKey)
          }
        })

        return finale
      };

      lodash.each(w, function (wallet) {
        updateNotifications(wallet, function (err) {
          j++
          if (err) {
            $log.warn('Error updating notifications:' + err)
          } else {
            var n

            n = lodash.filter(wallet.cachedActivity.n, function (x) {
              return typeFilter[x.type]
            })

            var idToName = {}
            if (wallet.cachedStatus) {
              lodash.each(wallet.cachedStatus.wallet.canoeers, function (c) {
                idToName[c.id] = c.name
              })
            }

            lodash.each(n, function (x) {
              x.wallet = wallet
              if (x.creatorId && wallet.cachedStatus) {
                x.creatorName = idToName[x.creatorId]
              };
            })

            notifications.push(n)
          }
          if (j === l) {
            notifications = lodash.sortBy(notifications, 'createdOn')
            notifications = lodash.compact(lodash.flatten(notifications)).slice(0, MAX)
            var total = notifications.length
            return cb(null, process(notifications), total)
          };
        })
      })
    }

    root.getTxps = function (opts, cb) {
      var MAX = 100
      opts = opts || {}

      var w = root.getAccounts()
      if (lodash.isEmpty(w)) return cb()

      var txps = []

      lodash.each(w, function (x) {
        if (x.pendingTxps) { txps = txps.concat(x.pendingTxps) }
      })
      var n = txps.length
      txps = lodash.sortBy(txps, 'pendingForUs', 'createdOn')
      txps = lodash.compact(lodash.flatten(txps)).slice(0, opts.limit || MAX)
      return cb(null, txps, n)
    }

    return root
  })
