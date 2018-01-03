'use strict'
angular.module('canoeApp.services')
  .factory('profileService', function profileServiceFactory ($rootScope, $timeout, $filter, $log, $state, sjcl, lodash, storageService, raiblocksService, configService, gettextCatalog, bwcError, uxLanguage, platformInfo, txFormatService, appConfigService) {
    var isChromeApp = platformInfo.isChromeApp
    var isWindowsPhoneApp = platformInfo.isCordova && platformInfo.isWP
    var isIOS = platformInfo.isIOS

    var root = {}

    var UPDATE_PERIOD = 15

    root.profile = null

    Object.defineProperty(root, 'focusedClient', {
      get: function () {
        throw 'focusedClient is not used any more'
      },
      set: function () {
        throw 'focusedClient is not used any more'
      }
    })

    root.getCurrentCoinmarketcapRate = function (localCurrency, cb) {
      var local = localCurrency || 'usd'
      var value = 1
      var decimals = 2
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
          var answer = (price * value).toFixed(decimals)
          cb(null, answer)
        }
      }
    }

    root.changeSeed = function (seed, cb) {
      $log.debug('Importing Wallet Seed')
      raiblocksService.changeSeed(root.wallet, seed)
      $log.debug('Recreateing first account')
      // TODO... ehm
      root.createAccount({}, cb)
    }

    root.updateAllAccounts = function () {
      raiblocksService.fetchAccountsAndBalances(root.wallet, function (err, balances) {
        if (err) $log.error(err)
        // Loop over balances and create accounts if needed
        var foundAccounts = []
        lodash.forOwn(balances, function (bal, id) {
          foundAccounts.push(id)
          var acc = root.getAccount(id)
          if (!acc) {
            acc = raiblocksService.makeAccount(root.wallet, id, null)
          }
          acc.balance = bal.balance
          acc.pending = bal.pending
          root.setLastKnownBalance(id, acc.balance, function () {})
        })
        // Remove accounts not found
        // TODO is this kosher?
        lodash.forOwn(root.wallet.accounts, function (acc, id) {
          if (!foundAccounts.includes(id)) {
            $log.debug('Deleting account gone from server ' + JSON.stringify(acc))
            delete root.wallet.accounts[id]
          }
        })

        /*
        // Trick to know when all are done
        var i = accounts.length
        var j = 0
        lodash.each(accounts, function (account) {
          root.setLastKnownBalance(account.id, account.balance, function () {})
          if (++j === i) {
            //updateTxps()
          }
        }) */
      })
    }

    root.updateAccountSettings = function (account) {
      var defaults = configService.getDefaults()
      configService.whenAvailable(function (config) {
        // account.usingCustomBWS = config.bwsFor && config.bwsFor[account.id] && (config.bwsFor[wallet.id] != defaults.bws.url)
        account.name = (config.aliasFor && config.aliasFor[account.id])
        account.color = (config.colorFor && config.colorFor[account.id])
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

    function _balanceIsHidden (wallet, cb) {
      storageService.getHideBalanceFlag(wallet.credentials.walletId, function (err, shouldHideBalance) {
        if (err) $log.error(err)
        var hideBalance = (shouldHideBalance == 'true')
        return cb(hideBalance)
      })
    }

    // Adds a wallet client to profileService
    root.bindWalletClient = function (wallet, opts) {
      var opts = opts || {}
      var walletId = wallet.credentials.walletId

      if ((root.wallet[walletId] && root.wallet[walletId].started) && !opts.force) {
        return false
      }

      // INIT WALLET VIEWMODEL
      wallet.id = walletId
      wallet.started = true
      wallet.doNotVerifyPayPro = isChromeApp
      wallet.network = wallet.credentials.network
      wallet.canoeerId = wallet.credentials.canoeerId
      wallet.m = wallet.credentials.m
      wallet.n = wallet.credentials.n
      wallet.coin = wallet.credentials.coin

      root.updateAccountSettings(wallet)
      root.wallet[walletId] = wallet

      _needsBackup(wallet, function (val) {
        wallet.needsBackup = val
      })

      _balanceIsHidden(wallet, function (val) {
        wallet.balanceHidden = val
      })

      wallet.removeAllListeners()

      wallet.initialize({
        notificationIncludeOwn: true
      }, function (err) {
        if (err) {
          $log.error('Could not init notifications err:', err)
          return
        }
        wallet.setNotificationsInterval(UPDATE_PERIOD)
        wallet.openWallet(function (err) {
          if (wallet.status !== true) { $log.debug('Wallet + ' + walletId + ' status:' + wallet.status) }
        })
      })

      $rootScope.$on('Local/SettingsUpdated', function (e, walletId) {
        if (!walletId || walletId == wallet.id) {
          $log.debug('Updating settings for wallet:' + wallet.id)
          root.updateAccountSettings(wallet)
        }
      })

      return true
    }

    root.bindWallet = function (cb) {
      root.loadWallet(cb)
    }

    root.bindProfile = function (profile, cb) {
      root.profile = profile

      configService.get(function (err) {
        $log.debug('Preferences read')
        if (err) return cb(err)
        root.bindWallet(cb)

        /* function bindWallets (cb) {
          var l = root.profile.credentials.length
          var i = 0,
            totalBound = 0

          if (!l) return cb()

          lodash.each(root.profile.credentials, function (credentials) {
            root.bindWallet(credentials, function (err, bound) {
              i++
              totalBound += bound
              if (i == l) {
                $log.info('Bound ' + totalBound + ' out of ' + l + ' wallets')
                return cb()
              }
            })
          })
        } */
        /*
        bindWallets(function () {
          root.isBound = true

          lodash.each(root._queue, function (x) {
            $timeout(function () {
              return x()
            }, 1)
          })
          root._queue = []

          root.isDisclaimerAccepted(function (val) {
            if (!val) {
              return cb(new Error('NONAGREEDDISCLAIMER: Non agreed disclaimer'))
            }
            return cb()
          })
        }) */
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
        } else {
          $log.debug('Profile read')
          $log.debug('Profile: ' + JSON.stringify(profile))
          return root.bindProfile(profile, cb)
        }
      })
    }

    var seedWallet = function (opts, cb) {
      opts = opts || {}
      var walletClient = bwcService.getClient(null, opts)
      var network = opts.networkName || 'livenet'

      if (opts.mnemonic) {
        try {
          opts.mnemonic = root._normalizeMnemonic(opts.mnemonic)
          walletClient.seedFromMnemonic(opts.mnemonic, {
            network: network,
            passphrase: opts.passphrase,
            account: opts.account || 0,
            derivationStrategy: opts.derivationStrategy || 'BIP44',
            coin: opts.coin
          })
        } catch (ex) {
          $log.info(ex)
          return cb(gettextCatalog.getString('Could not create: Invalid wallet recovery phrase'))
        }
      } else if (opts.extendedPrivateKey) {
        try {
          walletClient.seedFromExtendedPrivateKey(opts.extendedPrivateKey, {
            network: network,
            account: opts.account || 0,
            derivationStrategy: opts.derivationStrategy || 'BIP44',
            coin: opts.coin
          })
        } catch (ex) {
          $log.warn(ex)
          return cb(gettextCatalog.getString('Could not create using the specified extended private key'))
        }
      } else if (opts.extendedPublicKey) {
        try {
          walletClient.seedFromExtendedPublicKey(opts.extendedPublicKey, opts.externalSource, opts.entropySource, {
            account: opts.account || 0,
            derivationStrategy: opts.derivationStrategy || 'BIP44',
            coin: opts.coin
          })
          walletClient.credentials.hwInfo = opts.hwInfo
        } catch (ex) {
          $log.warn('Creating wallet from Extended Public Key Arg:', ex, opts)
          return cb(gettextCatalog.getString('Could not create using the specified extended public key'))
        }
      } else {
        var lang = uxLanguage.getCurrentLanguage()
        try {
          walletClient.seedFromRandomWithMnemonic({
            network: network,
            passphrase: opts.passphrase,
            language: lang,
            account: 0,
            coin: opts.coin
          })
        } catch (e) {
          $log.info('Error creating recovery phrase: ' + e.message)
          if (e.message.indexOf('language') > 0) {
            $log.info('Using default language for recovery phrase')
            walletClient.seedFromRandomWithMnemonic({
              network: network,
              passphrase: opts.passphrase,
              account: 0,
              coin: opts.coin
            })
          } else {
            return cb(e)
          }
        }
      }
      return cb(null, walletClient)
    }

    // Do we have funds? Presuming we are up to date here
    root.hasFunds = function () {
      var total = 0
      lodash.forOwn(root.wallet.accounts, function (acc) {
        total = total + (acc.balance || 0)
      })
      return total > 0
    }

    // Create wallet and default account
    root.createWallet = function (opts, cb) {
      // Synchronous now
      root.wallet = raiblocksService.createWallet()
      root.createAccount(opts, cb)
    }

    // Create account in wallet and store wallet
    root.createAccount = function (opts, cb) {
      var accountName = opts.name || gettextCatalog.getString('Default Account')
      raiblocksService.createAccount(root.wallet, accountName)
      root.saveWallet(cb)
    }

    // Store the wallet
    root.saveWallet = function (cb) {
      storageService.storeWallet(root.wallet, function () {
        cb(null, root.wallet)
      })
    }

    // Load wallet from local storage
    root.loadWallet = function (cb) {
      storageService.loadWallet(function (err, wallet) {
        if (err) {
          $log.warn(err)
        } else {
          root.wallet = wallet ? JSON.parse(wallet) : null
          cb(null, root.wallet)
        }
      })
    }

    root.getWallet = function () {
      return root.wallet
    }

    root.getAccount = function (addr) {
      return root.wallet.accounts[addr]
    }

    root.deleteWalletClient = function (client, cb) {
      var walletId = client.credentials.walletId

      var config = configService.getSync()

      $log.debug('Deleting Wallet:', client.credentials.walletName)
      client.removeAllListeners()

      root.profile.deleteWallet(walletId)

      delete root.wallet[walletId]

      storageService.removeAllWalletData(walletId, function (err) {
        if (err) $log.warn(err)
      })

      storageService.storeProfile(root.profile, function (err) {
        if (err) return cb(err)
        return cb()
      })
    }

    root.setMetaData = function (walletClient, addressBook, cb) {
      storageService.getAddressbook(function (err, localAddressBook) {
        var localAddressBook1 = {}
        try {
          localAddressBook1 = JSON.parse(localAddressBook)
        } catch (ex) {
          $log.warn(ex)
        }
        var mergeAddressBook = lodash.merge(addressBook, localAddressBook1)
        storageService.setAddressbook(JSON.stringify(addressBook), function (err) {
          if (err) return cb(err)
          return cb(null)
        })
      })
    }

    // Adds and bind a new client to the profile
    var addAndBindWalletClient = function (client, opts, cb) {
      if (!client || !client.credentials) { return cb(gettextCatalog.getString('Could not access wallet')) }

      var walletId = client.credentials.walletId

      if (!root.profile.addWallet(JSON.parse(client.export()))) {
        return cb(gettextCatalog.getString('Wallet already in {{appName}}', {
          appName: appConfigService.nameCase
        }))
      }

      var skipKeyValidation = shouldSkipValidation(walletId)
      if (!skipKeyValidation) { root.runValidation(client) }

      root.bindWalletClient(client)

      var saveBwsUrl = function (cb) {
        var defaults = configService.getDefaults()
        var bwsFor = {}
        bwsFor[walletId] = opts.bwsurl || defaults.bws.url

        // Dont save the default
        if (bwsFor[walletId] == defaults.bws.url) { return cb() }

        configService.set({
          bwsFor: bwsFor
        }, function (err) {
          if (err) $log.warn(err)
          return cb()
        })
      }

      saveBwsUrl(function () {
        storageService.storeProfile(root.profile, function (err) {
          return cb(err, client)
        })
      })
    }

    root.storeProfileIfDirty = function (cb) {
      if (root.profile.dirty) {
        storageService.storeProfile(root.profile, function (err) {
          $log.debug('Saved modified Profile')
          if (cb) return cb(err)
        })
      } else {
        if (cb) return cb()
      };
    }

    root.importWallet = function (str, opts, cb) {
      var walletClient = bwcService.getClient(null, opts)

      $log.debug('Importing Wallet:', opts)

      try {
        var c = JSON.parse(str)

        if (c.xPrivKey && c.xPrivKeyEncrypted) {
          $log.warn('Found both encrypted and decrypted key. Deleting the encrypted version')
          delete c.xPrivKeyEncrypted
          delete c.mnemonicEncrypted
        }

        str = JSON.stringify(c)

        walletClient.import(str, {
          compressed: opts.compressed,
          password: opts.password
        })
      } catch (err) {
        return cb(gettextCatalog.getString('Could not import. Check input file and spending password'))
      }

      str = JSON.parse(str)

      if (!str.n) {
        return cb('Backup format not recognized. If you are using a Canoe Beta backup and version is older than 0.10, please see: https://github.com/gokr/canoe/issues/4730#issuecomment-244522614')
      }

      var addressBook = str.addressBook || {}

      addAndBindWalletClient(walletClient, {
        bwsurl: opts.bwsurl
      }, function (err, walletId) {
        if (err) return cb(err)
        root.setMetaData(walletClient, addressBook, function (error) {
          if (error) $log.warn(error)
          return cb(err, walletClient)
        })
      })
    }

    root.importSeed = function (seed, cb) {
      root.changeSeed(seed, cb)
    }

    root.createProfile = function (cb) {
      $log.info('Creating profile')
      var defaults = configService.getDefaults()

      configService.get(function (err) {
        if (err) $log.debug(err)

        var p = Profile.create()
        storageService.storeNewProfile(p, function (err) {
          if (err) return cb(err)
          root.bindProfile(p, function (err) {
            // ignore NONAGREEDDISCLAIMER
            if (err && err.toString().match('NONAGREEDDISCLAIMER')) return cb()
            return cb(err)
          })
        })
      })
    }

    root.createDefaultWallet = function (cb) {
      var opts = {}
      root.createWallet(opts, cb)
    }

    root.setDisclaimerAccepted = function (cb) {
      root.profile.disclaimerAccepted = true
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

    root.updateCredentials = function (credentials, cb) {
      root.profile.updateWallet(credentials)
      storageService.storeProfile(root.profile, cb)
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
          account.cachedBalance = data.balance
          account.cachedBalanceUpdatedOn = (data.updatedOn < now - showRange) ? data.updatedOn : null
        }
        return cb()
      })
    }

    root.setLastKnownBalance = function (account, balance, cb) {
      storageService.setBalanceCache(account, {
        balance: balance,
        updatedOn: Math.floor(Date.now() / 1000)
      }, cb)
    }

    root.getAccounts = function (opts) {
      if (opts && !lodash.isObject(opts)) { throw 'bad argument' }
      opts = opts || {}

      // No wallet loaded
      if (!root.wallet) {
        return []
      }

      var ret = root.wallet.accounts

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

    root.toggleHideBalanceFlag = function (walletId, cb) {
      root.wallet[walletId].balanceHidden = !root.wallet[walletId].balanceHidden
      storageService.setHideBalanceFlag(walletId, root.wallet[walletId].balanceHidden.toString(), cb)
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

        var u = bwcService.getUtils()
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
