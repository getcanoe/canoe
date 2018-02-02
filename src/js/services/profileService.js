'use strict'
angular.module('canoeApp.services')
  .factory('profileService', function profileServiceFactory ($rootScope, $timeout, $filter, $log, $state, lodash, storageService, raiblocksService, configService, gettextCatalog, bwcError, uxLanguage, platformInfo, txFormatService, addressbookService, appConfigService) {
    var isChromeApp = platformInfo.isChromeApp
    var isWindowsPhoneApp = platformInfo.isCordova && platformInfo.isWP
    var isIOS = platformInfo.isIOS

    var UPDATE_PERIOD = 15
    var RAW_PER_XRB = Math.pow(10, 30) // 1 XRB = 1 Mxrb = 10^30 raw

    var rate = 0 // Current rate fetched every 60 sec
    var lastTime = 0

    // This is where we hold profile, wallet and password to decrypt it
    var root = {}
    root.profile = null
    root.wallet = null
    root.password = 'hubbabubba' // TODO Hardcoded for testing during dev!!!!

    // This is where we keep the password entered when you start Canoe
    // or when timeout is reached and it needs to be entered again.
    root.enteredPassword = function (pw) {
      root.password = pw
    }

    root.getEnteredPassword = function (pw) {
      return root.password
    }

    root.getSeed = function () {
      try {
        return root.wallet.getSeed(root.password)
      } catch (e) {
        return null // Bad password or no wallet
      }
    }

    root.fetchServerStatus = function (cb) {
      raiblocksService.fetchServerStatus(cb)
    }

    root.updateRate = function (code) {
      if (!rate || (Date.now() > (lastTime + 60000))) {
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

    root.toFiat = function (raw, code) {
      root.updateRate(code)
      return (raw * rate) / RAW_PER_XRB
    }

    root.fromFiat = function (amount, code) {
      root.updateRate(code)
      return (amount / rate) * RAW_PER_XRB
    }

    root.getCurrentCoinmarketcapRate = function (localCurrency, cb) {
      var local = localCurrency || 'usd'
      local = local.toLowerCase()
      var value = 1
      var xhr = new XMLHttpRequest()
      xhr.open('GET', 'https://api.coinmarketcap.com/v1/ticker/raiblocks/?convert=' + local, true)
      xhr.send()
      xhr.onreadystatechange = processRequest
      function processRequest (e) {
        if (xhr.readyState === 4 && xhr.status === 200) {
          var response = JSON.parse(xhr.responseText)
          console.log('Coinmarketcap reply: ' + JSON.stringify(response))
          var price = response[0]['price_' + local]
          // var symbol = response[0]['symbol']
          cb(null, (price * value))
        }
      }
    }

    // Create a new wallet, but reuse existing id, password and tokens
    root.importSeed = function (seed, cb) {
      $log.debug('Importing Wallet Seed')
      return root.createWallet(null, seed, cb)
    }

    root.updateAllAccounts = function (cb) {
      var accounts = root.wallet.getAccounts()
      lodash.each(accounts, function (acc) {
        root.setLastKnownBalance(acc, function () {})
      })
      if (cb) {
        cb(null, accounts)
      }
    }

    root.formatAmount = function (raw, decimals) {
      if (raw === 0) {
        return raw.toFixed(decimals)
      } else {
        var balance = raw / RAW_PER_XRB
        if (Math.round(balance * Math.pow(10, decimals)) === 0) {
          return balance.toString()
        } else {
          return balance.toFixed(decimals)
        }
      }
    }

    root.formatAmountWithUnit = function (raw) {
      if (isNaN(raw)) return
      // TODO use current unit in settings kxrb, Mxrb etc
      return root.formatAmount(raw, 2) + ' XRB'
    }

    root.updateAccountSettings = function (account) {
      var defaults = configService.getDefaults()
      configService.whenAvailable(function (config) {
        // account.usingCustomBWS = config.bwsFor && config.bwsFor[account.id] && (config.bwsFor[wallet.id] != defaults.bws.url)
        account.name = (config.aliasFor && config.aliasFor[account.id])
        account.meta.color = (config.colorFor && config.colorFor[account.id])
        account.email = config.emailFor && config.emailFor[account.id]
      })
    }

    root.setBackupFlag = function () {
      storageService.setBackupFlag(function (err) {
        if (err) $log.error(err)
        $log.debug('Backup timestamp stored')
        root.wallet.needsBackup = false
      })
    }

    function _needsBackup (wallet, cb) {
      storageService.getBackupFlag(function (err, val) {
        if (err) $log.error(err)
        if (val) return cb(false)
        return cb(true)
      })
    }

    function balanceIsHidden (wallet, cb) {
      storageService.getHideBalanceFlag(wallet.credentials.walletId, function (err, shouldHideBalance) {
        if (err) $log.error(err)
        var hideBalance = (shouldHideBalance == 'true')
        return cb(hideBalance)
      })
    }

    root.bindProfile = function (profile, cb) {
      root.profile = profile
      configService.get(function (err) {
        $log.debug('Preferences read')
        if (err) return cb(err)
        root.loadWallet(cb)
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
      return root.wallet.getWalletBalance().greater(0)
    }

    // Create wallet and default account (which saves wallet), seed can be null.
    root.createWallet = function (password, seed, cb) {
      // Synchronous now
      raiblocksService.createWallet(password, seed, function (wallet) {
        root.setWalletId(wallet.getId(), function (err) {
          if (err) return cb(err)
          root.wallet = wallet
          // Create default acount, will save
          root.createAccount(null, cb)
        })
      })
    }

    // Create account in wallet and save wallet
    root.createAccount = function (name, cb) {
      var accountName = name || gettextCatalog.getString('Default Account')
      raiblocksService.createAccount(root.wallet, accountName)
      // TODO checkChains? See raiwallet.js
      raiblocksService.saveWallet(root.wallet, cb)
    }

    root.saveWallet = function (cb) {
      raiblocksService.saveWallet(root.wallet, cb)
    }

    // Load wallet from local storage using entered password
    root.loadWallet = function (cb) {
      if (!root.password) {
        return cb('No password entered, can not load wallet from local storage')
      }
      raiblocksService.createWalletFromStorage(root.password, function (err, wallet) {
        if (err) {
          return cb(err)
        }
        root.wallet = wallet
        root.setWalletId(wallet.id, function (err) {
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

    root.getWallet = function () {
      return root.wallet
    }

    root.getAccount = function (addr) {
      return root.wallet.getAccount(addr)
    }

    root.send = function (tx, cb) {
      raiblocksService.send(root.wallet, tx.account, tx.address, tx.amount)
      cb()
    }

    // Not used yet but could be useful
    root.mergeAddressBook = function (walletClient, addressBook, cb) {
      storageService.getAddressbook(function (err, localAddressBook) {
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

    root.setWalletId = function (id, cb) {
      root.profile.walletId = id
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

    root.getLastKnownBalance = function (account, cb) {
      storageService.getBalanceCache(account.id, cb)
    }

    root.addLastKnownBalance = function (account, cb) {
      var now = Math.floor(Date.now() / 1000)
      var showRange = 600 // 10 min

      root.getLastKnownBalance(account, function (err, data) {
        if (data) {
          data = JSON.parse(data)
          account.cachedBalanceStr = root.formatAmountWithUnit(parseInt(data.balance))
          account.cachedBalance = data.balance
          account.cachedPendingBalanceStr = root.formatAmountWithUnit(parseInt(data.pendingBalance))
          account.cachedPendingBalance = data.pendingBalance
          account.cachedBalanceUpdatedOn = (data.updatedOn < now - showRange) ? data.updatedOn : null
        }
        return cb()
      })
    }

    root.setLastKnownBalance = function (account, cb) {
      storageService.setBalanceCache(account.id, {
        balance: account.balance,
        pendingBalance: account.pendingBalance,
        updatedOn: Math.floor(Date.now() / 1000)
      }, cb)
    }

    // This is a filtering function for accounts, not used yet
    root.getAccounts = function (opts) {
      if (opts && !lodash.isObject(opts)) { throw 'bad argument' }
      opts = opts || {}

      // No wallet loaded
      if (!root.wallet) {
        return []
      }

      var ret = root.wallet.getAccounts()

      if (opts.hasFunds) {
        ret = lodash.filter(ret, function (a) {
          if (!a.status) return
          return (a.status.availableBalanceSat > 0)
        })
      }

      if (opts.minAmount) {
        ret = lodash.filter(ret, function (a) {
          if (!a.status) return
          return (a.status.availableBalanceSat > opts.minAmount)
        })
      }

      // Add cached balance async
      // TODO kinda... odd way to go about it perhaps
      lodash.each(ret, function (x) {
        root.addLastKnownBalance(x, function () {})
      })

      return lodash.sortBy(ret, [
        'createdOn'
      ])
    }

    root.toggleHideBalanceFlag = function (accountId, cb) {
      var acc = root.getAccount(accountId)
      acc.meta.balanceHidden = !acc.meta.balanceHidden
      raiblocksService.saveWallet(root.wallet, cb)
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

        $log.debug('GET NOTIFICATIONS?')
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
          if (j == l) {
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
