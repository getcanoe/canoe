'use strict'
angular.module('canoeApp.services')
  .factory('raiblocksService', function ($log, platformInfo, storageService) {
    var root = {}

    // var host = 'http://localhost:7076' // for local testing against your own rai_wallet or node
    var host = 'https://getcanoe.io/rpc' // for the beta node
    var port = 443
    var rai = null

    root.connect = function () {
      try {
        rai = new Rai(host, port) // connection
        rai.initialize()
      } catch (e) {
        rai = null
        $log.warn('Failed to initialize server connection, no network?', e)
        // Try again
        setTimeout(function () { root.connect() }, 5000)
      }
    }

    root.connect()

    root.fetchServerStatus = function (cb) {
      var xhr = new XMLHttpRequest()
      xhr.open('POST', host, true)
      xhr.send(JSON.stringify({'action': 'canoe_server_status'}))
      xhr.onreadystatechange = processRequest
      function processRequest (e) {
        if (xhr.readyState === 4 && xhr.status === 200) {
          var response = JSON.parse(xhr.responseText)
          cb(null, response)
        }
      }
    }

    root.isValidSeed = function (seedHex) {
      var isValidHash = /^[0123456789ABCDEF]+$/.test(seedHex)
      return (isValidHash && (seedHex.length === 64))
    }

    root.isValidAccount = function (addr, cb) {
      $log.debug('Validating addr: ' + addr)
      if (!addr.startsWith('xrb_')) {
        return false
      }
      return rai.account_validate(addr)
    }

    /*

    root.newRandomSeed = function () {
      // During dev we reuse the same wallet seed - DO NOT ADD MONEY TO THIS ONE
      //if (platformInfo.isDevel) {
      //  $log.debug('Reusing dev seed')
      //  return '<some seed>'
      //} else {
        return XRB.createSeedHex()
      //}
    }

    root.createWallet = function (seed) {
      $log.debug('Create wallet')
      var wallet = {}
      wallet.id = rai.wallet_create()
      // We also need to set the seed, or we can't ever get it out
      var seedToSet = seed || root.newRandomSeed()
      root.changeSeed(wallet, seedToSet)
      $log.debug('Wallet: ' + JSON.stringify(wallet))
      return wallet
    }

    root.makeAccount = function (wallet, id, accountName) {
      // TODO fix unique naming of discovered accounts
      var account = {name: accountName, id: id}
      wallet.accounts[id] = account
      return account
    }

    root.createAccount = function (wallet, accountName) {
      $log.debug('Create account in wallet ' + wallet.id + ' named ' + accountName)
      var json = rai.account_create(wallet.id, true) // work = true
      if (json.account) {
        var account = root.makeAccount(wallet, json.account, accountName)
        $log.debug('Account: ' + JSON.stringify(account))
        return account
      }
    }

    root.fetchAccountsAndBalancesAsync = function (wallet, cb) {
      $log.debug('Fetching all balances in wallet ' + wallet.id)
      // This could discover new ones, or some have been removed
      rai.account_list_async(wallet.id, function (json) {
        if (json.accounts) {
          rai.accounts_balances_async(json.accounts, function (json) {
            $log.debug('Fetched')
            cb(null, json.balances)
          })
        } else {
          cb(json)
        }
      })
    }

    root.changeSeed = function (wallet, seed) {
      $log.debug('Changing seed and clearing accounts: ' + seed)
      wallet.seed = seed
      wallet.accounts = {}
      return rai.wallet_change_seed(wallet.id, seed)
    }

    root.send = function (wallet, account, addr, amount) {
      $log.debug('Sending ' + amount + ' from ' + account.name + ' to ' + addr)
      return rai.send(wallet.id, account.id, addr, amount)
    }

    */

//
// New RaiWebwallet based code. We call functions in src/js/raiwallet.js
// All new functions start with raiXXX
//

    // Send amountRaw (bigInt) from account to addr, using wallet.
    root.send = function (wallet, account, addr, amountRaw) {
      $log.debug('Sending ' + amountRaw + ' from ' + account.name + ' to ' + addr)
      try {
        var blk = wallet.addPendingSendBlock(account.id, addr, amountRaw)
        //var hash = blk.getHash(true)
        // refreshBalances()
        $log.debug('Transaction built successfully. Waiting for work ...')
        // addRecentSendToGui({date: 'Just now', amount: amountRaw, hash: hash})
        wallet.workPoolAdd(blk.getPrevious(), account.id, true)
      } catch (e) {
        $log.error('Send failed ' + e.message)
        return false
      }
      return true
    }

    // Create a new wallet given a good password created by the user, and optional seed.
    root.createWallet = function (password, seed) {
      $log.debug('Create wallet')
      var wallet = RAI.createNewWallet(password)
      wallet.setLogger($log)
      wallet.createSeed(seed)
      $log.debug('Wallet: ' + JSON.stringify(wallet))
      return wallet
    }

    // Loads wallet from local storage using given password
    root.createWalletFromStorage = function (password, cb) {
      $log.debug('Load wallet from local storage')
      var wallet = RAI.createNewWallet(password)
      storageService.loadWallet(function (err, data) {
        if (err) {
          return cb(err)
        }
        if (!data) {
          return cb('No wallet in local storage')
        }
        root.loadWalletData(wallet, data)
        cb(null, wallet)
      })
    }

    // Loads wallet from data using password
    root.createWalletFromData = function (password, data) {
      var wallet = RAI.createNewWallet(password)
      return root.loadWalletData(wallet, data)
    }

    // Create a new account in the wallet
    root.createAccount = function (wallet, accountName) {
      $log.debug('Create account in wallet named ' + accountName)
      var account = wallet.createAccount({label: accountName})
      $log.debug('Created account: ' + account)
      return account
    }

    // Encrypt and store the wallet in localstorage.
    // This should be called on every modification to the wallet.
    root.saveWallet = function (wallet, cb) {
      storageService.storeWallet(wallet.pack(), function () {
        cb(null, wallet)
      })
    }

    // Loads wallet from local storage using current password in wallet
    root.reloadWallet = function (wallet, cb) {
      $log.debug('Reload wallet from local storage')
      storageService.loadWallet(function (data) {
        root.loadWalletData(wallet, data)
        cb(null, wallet)
      })
    }

    // Load wallet with given data using current password in wallet
    root.loadWalletData = function (wallet, data) {
      try {
        wallet.load(data)
      } catch (e) {
        $log.error('Error decrypting wallet. Check that the password is correct.')
        return
      }
      return wallet
    }

    return root
  })
