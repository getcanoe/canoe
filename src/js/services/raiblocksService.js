'use strict'
angular.module('canoeApp.services')
  .factory('raiblocksService', function ($log, platformInfo) {
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

    root.newRandomSeed = function () {
      // During dev we reuse the same wallet seed - DO NOT ADD MONEY TO THIS ONE
      if (platformInfo.isDevel) {
        $log.debug('Reusing dev seed')
        return 'A360BD236EA685BC187CD0784F4281BCDAB63291E0ECC795537480968C18DC8C'
      } else {
        return XRB.createSeedHex()
      }
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

    root.fetchAccountsAndBalances = function (wallet, cb) {
      $log.debug('Fetch all balances in wallet ' + wallet.id)
      // This could discover new ones, or some have been removed
      var json = rai.account_list(wallet.id)
      if (json.accounts) {
        var balances = rai.accounts_balances(json.accounts)
        cb(null, balances)
      } else {
        cb(json)
      }
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
    /*
    // Version
    var ver = rai.node_vendor()
    $log.debug('Version: ' + ver)

    var key = rai.account_key(addr)
    $log.debug('Key: ' + key)

    var info = rai.account_info(addr)
    $log.debug('Info: ' + JSON.stringify(info))
    */
    return root
  })
