'use strict'
/* global angular XMLHttpRequest pow_initiate pow_callback Paho RAI Rai ionic bigInt */
angular.module('canoeApp.services')
  .factory('nanoService', function ($log, $rootScope, $window, $state, $ionicHistory, $timeout, configService, popupService, soundService, platformInfo, storageService, gettextCatalog, aliasService, rateService, lodash) {
    var root = {}

    // This config is controlled over retained MQTT
    root.sharedconfig = {
      defaultRepresentative: null,
      servermessage: null, // { title: 'Hey', body: 'Rock on', link: 'http://getcanoe.io' }
      stateblocks: {
        enable: false
      }
    }

    var POW
    // Only for OSX and Linux so far
    if (platformInfo.isOSX || platformInfo.isLinux) {
      POW = require('raiblocks-pow')
    }

    // This is where communication happens. This service is mostly called from profileService.
    // We use either XMLHttpRpc calls via rai (RaiblocksJS modified) or MQTT-over-WSS.

    // Both profileService and this service holds onto it
    root.wallet = null

    // Default server
    var host = 'https://getcanoe.io/rpc'
    var mqttHost = 'getcanoe.io'

    var rai = null

    root.connectRPC = function (cb) {
      try {
        $log.debug('Connecting to ' + host)
        rai = new Rai(host) // connection
        rai.initialize()
        if (cb) cb()
      } catch (e) {
        rai = null
        var msg = gettextCatalog.getString('Failed connecting to backend, no network?')
        $log.warn(msg, e)
        if (cb) cb(msg)
      }
    }

    configService.get(function (err, config) {
      if (err) return $log.debug(err)
      if (config.backend) {
        host = 'https://' + config.backend + '/rpc' // TODO need to revist this setup
        mqttHost = config.backend
        root.connectRPC()
      }
    })

    // port and ip to use for MQTT-over-WSS
    var mqttPort = 443 // Nginx acts as proxy
    var mqttClient = null
    var mqttUsername = null
    root.connected = false

    // See generatePoW below
    var powWorkers = null

    // Let's call it every second
    setTimeout(generatePoW, 1000)
    // Let's call it every 5 seconds
    setTimeout(regularBroadcast, 5000)

    root.unloadWallet = function () {
      root.disconnect()
      root.wallet = null
    }

    root.getWallet = function () {
      return root.wallet
    }

    root.setHost = function (url) {
      var opts = {
        backend: url
      }
      configService.set(opts, function (err) {
        if (err) $log.debug(err)
        mqttHost = url
        host = 'https://' + url + '/rpc'
        // Force relogin etc
        root.connectNetwork(function () {
          popupService.showAlert(gettextCatalog.getString('Information'), gettextCatalog.getString('Successfully connected to backend'))
          $ionicHistory.removeBackView()
          $state.go('tabs.home')
        })
      })
    }

    root.getHost = function () {
      return mqttHost
    }

    // Possibility to quiet the logs
    var doLog = true

    // This function calls itself every sec and scans
    // for pending blocks or precalcs in need of work.
    function generatePoW () {
      $rootScope.$emit('work', null)
      // No wallet, no dice
      if (root.wallet === null) {
        return setTimeout(generatePoW, 1000)
      }
      // Find a pending block in need of work
      var hash = root.wallet.getNextPendingBlockToWork()
      if (!hash) {
        // No hash to work on, do we have one to precalculate?
        var accAndHash = root.wallet.getNextPrecalcToWork()
        if (accAndHash) {
          if (doLog) $log.info('Working on precalc for ' + accAndHash.account)
          doWork(accAndHash.hash, function (work) {
            // Wallet may be purged from RAM, so need to check
            if (work && root.wallet) {
              root.wallet.addWorkToPrecalc(accAndHash.account, accAndHash.hash, work)
              $rootScope.$emit('work', root.wallet.getPoW())
              root.saveWallet(root.wallet, function () {})
            }
            setTimeout(generatePoW, 1000)
          })
        } else {
          return setTimeout(generatePoW, 1000)
        }
      } else {
        if (doLog) $log.info('Working on pending block ' + hash)
        doWork(hash, function (work) {
          // Wallet may be purged from RAM, so need to check
          if (work && root.wallet) {
            root.wallet.addWorkToPendingBlock(hash, work)
            $rootScope.$emit('work', root.wallet.getPoW())
            root.saveWallet(root.wallet, function () {})
          }
          setTimeout(generatePoW, 1000)
        })
      }
    }

    // Perform PoW calculation using different techniques based on platform
    // and the server or client side setting.
    function doWork (hash, callback) {
      var start = Date.now()
      // Server or client side?
      if (configService.getSync().wallet.serverSidePoW) {
        // Server side
        if (doLog) $log.info('Working on server for ' + hash)
        rai.work_generate_async(hash, function (result) {
          if (result.work) {
            if (doLog) $log.info('Server side PoW found for ' + hash + ': ' + result.work + ' took: ' + (Date.now() - start) + ' ms')
            callback(result.work)
          } else {
            if (doLog) $log.warn('Error doing PoW: ' + result)
            callback(null)
          }
        })
      } else {
        // Client side
        if (false) { // platformInfo.isCordova) {
          // Cordova plugin for libsodium, not working yet...
          // if (window.plugins.MiniSodium) {
          //  if (doLog) $log.info('Working on client (MiniSodium) for ' + hash)
          //  window.plugins.MiniSodium.crypto_generichash(8, hash, null, function (err, result) {
          //    if (err) return $log.error('Failed to compute client side PoW: ' + err)
          //    $log.info('Client side PoW found for ' + hash + ' took: ' + (Date.now() - start) + ' ms')
          //    callback(result)
          //  })
          // }
        } else {
          // node-raiblocks-pow (native C implementation for NodeJS, works on Desktop)
          if (POW) {
            if (doLog) $log.info('Working on client (threaded node-raiblocks-pow) for ' + hash)
            POW.threaded(hash, (err, result) => {
              if (err) {
                $log.error('Failed to compute client side PoW: ' + err)
                callback(null)
              } else {
                $log.info('Client side PoW found for ' + hash + ' took: ' + (Date.now() - start) + ' ms')
                callback(result)
              }
            })
          } else {
            // pow.wasm solution (slower but works in Chrome and is js only)
            if (doLog) $log.info('Working on client (pow.wasm) for ' + hash)
            powWorkers = pow_initiate(NaN, 'raiwallet/') // NaN = let it find number of threads
            pow_callback(powWorkers, hash, function () {
              // Do nothing
            }, function (result) {
              $log.info('Client side PoW found for ' + hash + ' took: ' + (Date.now() - start) + ' ms')
              callback(result)
            })
          }
        }
      }
    }

    // Retry broadcasts every 5 seconds, does nothing if empty.
    function regularBroadcast () {
      if (root.wallet) {
        root.broadcastCallback(root.wallet.getReadyBlocks())
      }
      setTimeout(regularBroadcast, 5000)
    }

    // This is called both from inside Wallet immediately
    // when a block is ready, and using a timeout, see above.
    root.broadcastCallback = function (blocks) {
      var dirty = false
      lodash.each(blocks, function (blk) {
        var res = root.broadcastBlock(blk)
        var hash = res.hash
        if (hash) {
          $log.debug('Succeeded broadcast, removing readyblock: ' + hash)
          root.wallet.removeReadyBlock(hash)
          dirty = true
        } else {
          $log.debug('Failed broadcast, removing readyblock: ' + hash)
          root.wallet.removeReadyBlock(hash)
          // This will fix the tip of the chain to match network, no need to set dirty
          // since syncChain will save wallet
          // syncChain(root.wallet, blk.account)
        }
      })
      if (dirty) {
        root.saveWallet(root.wallet, function () {})
      }
    }

    root.connectNetwork = function (cb) {
      // Makes sure we have the right backend for RPC
      root.connectRPC(function (err) {
        if (err) {
          $timeout(function () {
            popupService.showAlert(gettextCatalog.getString('Failed connecting to backend'), err)
            $ionicHistory.removeBackView()
            $state.go('tabs.home')
          }, 1000)
        } else {
          // Make sure we have an account for this wallet on the server side
          root.createServerAccount(root.wallet, function (err) {
            if (err) {
              $timeout(function () {
                popupService.showAlert(gettextCatalog.getString('Failed connecting to backend'), err)
                $ionicHistory.removeBackView()
                $state.go('tabs.home')
              }, 1000)
            } else {
              root.disconnect() // Makes sure we are disconnected from MQTT
              root.startMQTT(cb)
            }
          })
        }
      })
    }

    // Whenever the wallet is replaced we call this
    root.setWallet = function (wallet, cb) {
      root.wallet = wallet
      wallet.setLogger($log)
      // Install callback for broadcasting of blocks
      wallet.setBroadcastCallback(root.broadcastCallback)
      cb(null, root.wallet)
      root.connectNetwork()
    }

    // Perform repair tricks, can be chosen in Advanced settings
    root.repair = function () {
      clearPrecalc()
      resetChains()
    }

    // Import all chains for the whole wallet from scratch throwing away local forks we have.
    function resetChains () {
      if (root.wallet) {
        root.wallet.enableBroadcast(false)
        var accountIds = root.wallet.getAccountIds()
        lodash.each(accountIds, function (account) {
          resetChainInternal(root.wallet, account)
        })
        // Better safe than sorry, we always remove them.
        root.wallet.clearWalletPendingBlocks()
        root.wallet.clearReadyBlocks()
        root.wallet.enableBroadcast(true) // Turn back on
        root.fetchPendingBlocks()
        root.saveWallet(root.wallet, function () {})
      }
    }

    // This function is meant to quickly, from the last block in the chain
    // make sure we are in sync. The function resetChainInternal does a full reconstruct
    // of the chain and takes a lot of time. We have the following situations:
    // 1. We are already in perfect sync, all is well.
    // 2. Our chain is good, but there are more blocks on the network. We need to process them.
    // 3. We have extra blocks not on the network, we throw them away.
    // 4. A combination of 2 and 3, a fork. We throw ours away and process those on the network.
    function syncChain (wallet, account) {
      root.wallet.enableBroadcast(false)
      // Get our full chain, this is a fast operation.
      var currentBlocks = wallet.getLastNBlocks(account, 99999)
      // Get last block from network
      var frontiers = rai.accounts_frontiers([account])
      var lastHash = frontiers[account]
      // Is our chain empty?
      if (currentBlocks.length === 0) {
        // Are they both empty?
        if (!lastHash) {
          return true
        }
        // Network has blocks that we do not, process them


      } else {
        var lastBlock = currentBlocks[currentBlocks.length - 1]
        // Are the last hashes the same
        if (lastHash && lastBlock)
        var ourLastHash = currentBlocks.pop().hash
        if (lastHash === ourLastHash) {
          return
        }

      }
      var history = rai.account_history(account)
      if (history) {
        var blocks = history.reverse()
        // Loop until:
        // a) History has a fork -> adopt fork from history
        // b) History runs out -> truncate what we have

        lodash.each(blocks, function (block) {
          var our = currentBlocks.pop()
          if (our.hash !== block.hash) {
            // Found fork
          }
        })
        // We have to make this call too so we get work, signature and timestamp
        var infos = rai.blocks_info(hashes, 'raw', false, true) // true == include source_account
        // Unfortunately blocks is an object so to get proper order we use hashes
        lodash.each(blocks, function (block) {
          var hash = block.hash
          var info = infos[hash]
          block.work = info.contents.work
          block.signature = info.contents.signature
          block.previous = info.contents.previous
          block.extras = {
            blockAccount: info.block_account,
            blockAmount: info.amount,
            timestamp: info.timestamp,
            origin: info.source_account
          }
          // For some reason account_history is different...
          if (block.type === 'open') {
            block.account = info.contents.account
          }
          if (info.contents.balance) {
            block.balance = info.contents.balance // hex for old blocks, decimal for new
          }
          // State logic
          if (block.type === 'state') {
            block.state = true
            block.account = info.contents.account
            }
          var blk = wallet.createBlockFromJSON(block)
          if (blk.getHash(true) !== hash) {
            console.log('WRONG HASH')
          }
          blk.setImmutable(true)
          try {
            // First we check if this is a fork and thus adopt it if it is
            if (!wallet.importForkedBlock(blk, account)) { // Replaces any existing block
              // No fork so we can just import it
              wallet.importBlock(blk, account)
            }
            // It was added so remove it from currentBlocks
            lodash.remove(currentBlocks, function (b) {
              return b.getHash(true) === hash
            })
            wallet.removeReadyBlock(blk.getHash(true)) // so it is not broadcasted, not necessary
          } catch (e) {
            $log.error(e)
          }
        })
      }

      wallet.enableBroadcast(true) // Turn back on
      root.fetchPendingBlocks()
      root.saveWallet(wallet, function () {})
    }

    function resetChain (wallet, account) {
      wallet.enableBroadcast(false)
      resetChainInternal(wallet, account)
      wallet.enableBroadcast(true) // Turn back on
      root.fetchPendingBlocks()
      root.saveWallet(wallet, function () {})
    }

    function resetChainInternal (wallet, account) {
      // Better safe than sorry, we always remove them.
      wallet.removePendingBlocks(account)
      // var currentBlocks = wallet.getLastNBlocks(account, 99999)
      var history = rai.account_history(account)
      if (history) {
        var blocks = history.reverse()
        var hashes = []
        lodash.each(blocks, function (block) {
          hashes.push(block.hash)
        })
        // We have to make this call too so we get work, signature and timestamp
        var infos = rai.blocks_info(hashes, 'raw', false, true) // true == include source_account
        // Unfortunately infos is an object so to get proper order we use hashes
        lodash.each(blocks, function (block) {
          var hash = block.hash
          var info = infos[hash]
          block.work = info.contents.work
          block.signature = info.contents.signature
          block.previous = info.contents.previous
          block.extras = {
            blockAccount: info.block_account,
            blockAmount: info.amount,
            timestamp: info.timestamp,
            origin: info.source_account
          }
          // For some reason account_history is different...
          if (block.type === 'open') {
            block.account = info.contents.account
          }
          if (info.contents.balance) {
            block.balance = info.contents.balance // hex for old blocks, decimal for new
          }
          // State logic
          if (block.type === 'state') {
            block.state = true
            block.account = info.contents.account
          }
          var blk = wallet.createBlockFromJSON(block)
          if (blk.getHash(true) !== hash) {
            console.log('WRONG HASH')
          }
          blk.setImmutable(true)
          try {
            // First we check if this is a fork and thus adopt it if it is
            if (!wallet.importForkedBlock(blk, account)) { // Replaces any existing block
              // No fork so we can just import it
              wallet.importBlock(blk, account)
            }
            // It was added so remove it from currentBlocks
            // lodash.remove(currentBlocks, function (b) {
            //   return b.getHash(true) === hash
            // })
            wallet.removeReadyBlock(blk.getHash(true)) // so it is not broadcasted, not necessary
          } catch (e) {
            $log.error(e)
          }
        })
        // Now we add any old blocks and rebroadcast them
        // $log.debug('Current blocks not found from server: ' + JSON.stringify(currentBlocks))
        // wallet.enableBroadcast(true) // Turn back on
        // lodash.each(currentBlocks, function (b) {
        //   wallet.addBlockToReadyBlocks(b)
        // })
        // wallet.enableBroadcast(false) // Turn off
      } else {
        // Empty it from blocks
        wallet.resetChain(account)
      }
    }

    function clearPrecalc () {
      root.wallet.clearPrecalc()
      root.saveWallet(root.wallet, function () {})
    }

    window.fetchPendingBlocks = root.fetchPendingBlocks
    window.resetChains = resetChains
    window.root = root

    // Explicitly ask for pending blocks and fetching them to process them as if
    // they came in live over the rai_node callback
    root.fetchPendingBlocks = function () {
      if (root.wallet) {
        var accountIds = root.wallet.getAccountIds()
        var accountsAndHashes = rai.accounts_pending(accountIds)
        $log.debug('Pending hashes: ' + JSON.stringify(accountsAndHashes))
        lodash.each(accountsAndHashes, function (hashes, account) {
          var blocks = rai.blocks_info(hashes)
          lodash.each(blocks, function (blk, hash) {
            root.handleIncomingSendBlock(hash, account, blk.block_account, blk.amount)
          })
        })
      }
    }

    // Synchronous call that currently returns hash if it succeeded, null otherwise
    // TODO make async
    root.broadcastBlock = function (blk) {
      return root.processBlockJSON(blk.getJSONBlock())
    }

    root.processBlockJSON = function (json) {
      $log.debug('Broadcast block: ' + json)
      var res = rai.process_block(json)
      $log.debug('Result ' + JSON.stringify(res))
      return res
    }

    // Parse out major parts of QR/URL syntax. Calls callback on :
    // { protocol: 'xrb', account: 'xrb_yaddayadda', params: {label: 'label', amount: '10000'}}
    root.parseQRCode = function (data, cb) {
      // <protocol>:<encoded address>[?][amount=<raw amount>][&][label=<label>][&][message=<message>]
      var code = {}
      var protocols = ['eur', 'eurseed', 'eurblock']
      try {
        var parts = data.match(/^([a-z]+):(.*)/) // Match protocol:whatever
        if (!parts) {
          // No match,  perhaps a bare account, alias, seed? TODO bare key
          if (root.isValidAccount(data)) {
            // A bare account
            code.protocol = 'eur'
            parts = data
          } else if (data.startsWith('@')) {
            // A bare alias
            code.protocol = 'eur'
            parts = data
          } else if (root.isValidSeed(data)) {
            // A bare seed
            code.protocol = 'eurseed'
            parts = data
          } else {
            // Nope, give up
            return cb('Unknown format of QR code: ' + data)
          }
        } else {
          code.protocol = parts[1]
          parts = parts[2]
        }
        if (!protocols.includes(code.protocol)) {
          return cb('Unknown protocol: ' + code.protocol)
        }
        // Special handling for JSON protocols
        $log.debug('Protocol: ' + code.protocol)
        $log.debug('Parts: ' + parts)
        if (code.protocol === 'eurblock') {
          code.block = JSON.parse(parts)
          cb(null, code)
        } else {
          // URL style params, time to check for params
          parts = parts.split('?')
          if (code.protocol === 'eurseed') {
            code.seed = parts[0]
          } else {
            code.account = parts[0]
          }
          var kvs = {}
          if (parts.length === 2) {
            // We also have key value pairs
            var pairs = parts[1].split('&')
            lodash.each(pairs, function (pair) {
              var kv = pair.split('=')
              kvs[kv[0]] = kv[1]
            })
          }
          code.params = kvs
          if (code.account) {
            // If the account is an alias, we need to perform a lookup
            if (!root.isValidAccount(code.account)) {
              $log.debug('Account invalid')
              return cb('Account invalid' + code.account)
            }
            cb(null, code)
            // if (code.account.startsWith('@')) {
            //   code.alias = code.account.substr(1)
            //   aliasService.lookupAlias(code.alias, function (err, ans) {
            //     if (err) return $log.debug(err)
            //     $log.debug('Answer from alias server looking up ' + code.alias + ': ' + JSON.stringify(ans))
            //     if (ans) {
            //       code.account = ans.alias.address
            //       if (!root.isValidAccount(code.account)) {
            //         $log.debug('Account invalid')
            //         return
            //       }
            //       // Perform callback now
            //       cb(null, code)
            //     }
            //   })
            // } else {
            //
            // }
          } else {
            cb(null, code)
          }
        }
      } catch (e) {
        // Some other error
        cb(e)
      }
    }

    root.fetchServerStatus = function (cb) {
      var xhr = new XMLHttpRequest()
      xhr.open('GET', host, true)
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
      var isValidHash = /^[0123456789ABCDEFabcdef]+$/.test(seedHex)
      return (isValidHash && (seedHex.length === 64))
    }

    root.isValidAccount = function (addr) {
      if (addr.startsWith('eur_')) {
        return rai.account_validate(addr)
      }
      return false
    }

    // Send amountRaw (bigInt) from account to addr, using wallet.
    root.send = function (wallet, account, addr, amountRaw) {
      $log.debug('Sending ' + amountRaw + ' from ' + account.name + ' to ' + addr)
      try {
        var blk = wallet.addPendingSendBlock(account.id, addr, amountRaw)
        $log.debug('Added send block successfully: ' + blk.getHash(true))
      } catch (e) {
        $log.error('Send failed ' + e.message)
        return false
      }
      return true
    }

    root.getRepresentativeFor = function (addr) {
      return root.wallet.getRepresentative(addr)
    }

    // Change representative
    root.changeRepresentative = function (addr, rep) {
      try {
        $log.debug('Changing representative for ' + addr + ' to ' + rep)
        var blk = root.wallet.addPendingChangeBlock(addr, rep)
        $log.debug('Added change block successfully: ' + blk.getHash(true))
      } catch (e) {
        $log.error('Change representative failed ' + e.message)
        return false
      }
      return true
    }

    // Create a new wallet
    root.createNewWallet = function (password) {
      var wallet = RAI.createNewWallet(password)
      if (root.sharedconfig.stateblocks.enable) {
        wallet.enableStateBlocks(true)
      }
      return wallet
    }

    // Create a corresponding account in the server for this wallet
    root.createServerAccount = function (wallet, cb) {
      $log.debug('Creating server account for wallet ' + wallet.getId())
      var meta = {
        platform: ionic.Platform.platform(),
        platformVersion: ionic.Platform.version()
      }
      var json = rai.create_server_account(wallet.getId(), wallet.getToken(), wallet.getTokenPass(), 'canoe', $window.version, meta)
      if (json.error) {
        $log.debug('Error creating server account: ' + json.error + ' ' + json.message)
        cb(json.message)
      } else {
        cb(null)
      }
    }

    // Subscribe to our private topics for incoming messages
    root.subscribeForWallet = function (wallet) {
      // Subscribe to rate service
      root.subscribe('rates')
      // Subscribe to sharedconfig
      root.subscribe('sharedconfig/#')
      // Subscribe to blocks sent to our own wallet id
      root.subscribe('wallet/' + wallet.getId() + '/block/#')
    }

    // Create a new wallet given a good password created by the user, and optional seed.
    root.createWallet = function (password, seed, cb) {
      $log.debug('Creating new wallet')
      var wallet = root.createNewWallet(password)
      if (root.sharedconfig.defaultRepresentative) {
        root.wallet.setDefaultRepresentative(root.sharedconfig.defaultRepresentative)
      }
      wallet.createSeed(seed ? seed.toUpperCase() : null)
      // Recreate existing accounts
      wallet.enableBroadcast(false)
      var emptyAccounts = 0
      var accountNum = 1
      do {
        var accountName = gettextCatalog.getString('Account') + ' ' + accountNum
        accountNum++
        var account = wallet.createAccount({label: accountName})
        // We load existing blocks
        resetChainInternal(wallet, account.id)
        if (wallet.getAccountBlockCount(account.id) === 0) {
          emptyAccounts++
        } else {
          emptyAccounts = 0
        }
      } while (emptyAccounts < 20)
      // Remove last 20 accounts because they are empty
      while (emptyAccounts > 0) {
        wallet.removeLastAccount()
        emptyAccounts--
      }
      wallet.enableBroadcast(true)
      root.setWallet(wallet, cb)
      root.saveWallet(root.wallet, function () {})
      // aliasService.lookupAddress(account.id, function (err, ans) {
      //   if (err) {
      //     $log.debug(err)
      //   } else {
      //     $log.debug('Answer from alias server looking up ' + account.id + ': ' + JSON.stringify(ans))
      //     if (ans && ans.aliases.length > 0) {
      //       account.meta.alias = ans.aliases[0]
      //       wallet.setMeta(account, account.meta)
      //     }
      //     root.setWallet(wallet, cb)
      //   }
      // })
    }

    // Loads wallet from local storage using given password
    root.createWalletFromStorage = function (password, cb) {
      $log.debug('Load wallet from local storage')
      storageService.loadWallet(function (err, data) {
        if (err) {
          return cb(err)
        }
        if (!data) {
          return cb('No wallet in local storage')
        }
        root.createWalletFromData(data, password, cb)
      })
    }

    // Start MQTT
    root.startMQTT = function (cb) {
      var doneIt = false
      root.connectMQTT(root.wallet, function (connected) {
        if (connected) {
          root.updateServerMap(root.wallet)
          root.subscribeForWallet(root.wallet)
          // Failsafe for reconnects causing this to run many times
          if (!doneIt) {
            doneIt = true
            if (cb) cb()
          }
        }
      })
    }

    // Loads wallet from data using password
    root.createWalletFromData = function (data, password, cb) {
      $log.debug('Create wallet from data')
      var wallet = root.createNewWallet(password)
      root.loadWalletData(wallet, data, function (err, wallet) {
        if (err) return cb(err)
        root.setWallet(wallet, cb)
      })
    }

    // Create a new account in the wallet
    root.createAccount = function (wallet, accountName) {
      $log.debug('Creating account named ' + accountName)
      var account = wallet.createAccount({label: accountName})
      resetChain(wallet, account.id) // It may be an already existing account so we want existing blocks
      $log.debug('Created account ' + account.id)
      root.updateServerMap(wallet)
      return account
    }

    // Remove an account from the wallet. TODO Do we actually? Or just hide?
    root.removeAccount = function (wallet, account) {
      $log.debug('Remove account in wallet named ' + account.name)
      wallet.removeAccount(account.id)
      $log.debug('Removed account: ' + account.id)
      root.updateServerMap(wallet)
    }

    // Tell server which accounts this wallet has. The server has a map of wallet id -> accounts
    // This needs to be called when a new account is created or one is removed.
    // We also call it whenever we load a wallet from data.
    // Canoe up to 0.3.5 sends only wallet id.
    // Canoe from 0.3.6 sends more information in a JSON object.
    root.updateServerMap = function (wallet) {
      var ids = wallet.getAccountIds()
      var register = {
        accounts: ids,
        wallet: wallet.getId(),
        name: 'canoe', // Other wallets can also use our backend
        version: $window.version
      }
      root.publish('wallet/' + wallet.getId() + '/register', JSON.stringify(register), 2, false)
    }

    // Encrypt and store the wallet in localstorage.
    // This should be called on every modification to the wallet.
    root.saveWallet = function (wallet, cb) {
      $rootScope.$emit('blocks', null)
      storageService.storeWallet(wallet.pack(), function () {
        if (doLog) $log.info('Wallet saved')
        cb(null, wallet)
      })
    }

    // Loads wallet from local storage using current password in wallet
    root.reloadWallet = function (wallet, cb) {
      $log.debug('Reload wallet from local storage')
      storageService.loadWallet(function (data) {
        root.loadWalletData(wallet, data, cb)
      })
    }

    // Load wallet with given data using current password in wallet
    root.loadWalletData = function (wallet, data, cb) {
      try {
        wallet.load(data)
      } catch (e) {
        $log.error('Error decrypting wallet. Check that the password is correct: ' + e)
        return cb(e)
      }
      cb(null, wallet)
    }

    /* ******************************* MQTT ********************************/

    root.publishBlock = function (block) {
      var msg = {account: block.getAccount(), block: block}
      root.publish('broadcast/' + block.getAccount(), JSON.stringify(msg), 2, false)
    }

    root.connectMQTT = function (wallet, cb) {
      mqttUsername = wallet.getToken()
      var mqttPassword = wallet.getTokenPass()
      var mqttClientId = wallet.getId()
      var opts = {
        userName: mqttUsername,
        password: mqttPassword,
        clientId: mqttClientId
      }
      // Connect to MQTT
      if (doLog) $log.info('Connecting to MQTT broker ' + mqttHost + ' port ' + mqttPort)
      // $log.debug('Options: ' + JSON.stringify(opts))
      root.connect(opts, function () {
        if (doLog) $log.info('Connected to MQTT broker.')
        if (cb) {
          cb(true)
        }
      }, function (c, code, msg) {
        $log.error('Failed connecting to MQTT: ', {context: c, code: code, msg: msg})
        root.disconnect()
        if (cb) {
          cb(false)
        }
      })
    }

    // Are we connected to the MQTT server?
    root.isConnected = function () {
      return root.connected
    }

    // Disconnects MQTT.
    root.disconnect = function () {
      if (mqttClient) {
        mqttClient.disconnect()
      }
      mqttClient = null
    }

    root.onConnectionLost = function (responseObject) {
      if (responseObject.errorCode !== 0) {
        if (doLog) $log.info('MQTT connection lost: ' + responseObject.errorMessage)
      }
      root.connected = false
    }

    root.onConnected = function (isReconnect) {
      // Fetch all pending blocks, since we have possibly missed incoming blocks
      // We can't do it right here in this handler, need a timeout
      setTimeout(function () { root.fetchPendingBlocks() }, 100)
      root.connected = true
    }

    root.onFailure = function () {
      if (doLog) $log.info('MQTT failure')
      root.connected = false
    }

    root.handleIncomingSendBlock = function (hash, account, from, amount) {
      // Create a receive (or open, if this is the first block in account)
      // block to match this incoming send block
      if (root.wallet) {
        if (root.wallet.addPendingReceiveBlock(hash, account, from, amount)) {
          if (doLog) $log.info('Added pending receive block')
          soundService.play('receive')
          root.saveWallet(root.wallet, function () {})
        }
      }
    }

    root.hasAccount = function (account) {
      return root.wallet.findKey(account) !== null
    }

    root.confirmBlock = function (blk, hash, timestamp) {
      $log.debug('Confirming block: ' + hash + ' time: ' + timestamp)
      blk.setTimestamp(timestamp)
    }

    root.importBlock = function (block, account) {
      var wallet = root.wallet
      // State logic
      if (block.type === 'state') {
        block.state = true
      }
      var blk = wallet.createBlockFromJSON(block)
      try {
        wallet.enableBroadcast(false)
        // First we check if this is a fork and thus adopt it if it is
        if (!wallet.importForkedBlock(blk, account)) { // Replaces any existing block
          // No fork so we can just import it
          wallet.importBlock(blk, account)
        }
        wallet.removeReadyBlock(blk.getHash(true)) // so it is not broadcasted, not necessary
        wallet.enableBroadcast(true)
      } catch (e) {
        $log.error(e)
      }
    }

    root.handleIncomingBlock = function (blkType, payload) {
      /*
        {
          "account":"xrb_15d4oo67z6ruebmkcjqghawcbf5f9r4zkg8pf1af3n1s7kd9u7x3m47y8x37",
          "hash":"9818A861E6D961F0F94EA19FC1F54D714F076F258F6C2637502AD9FEDA6E83B5",
          "block":"{\n    \"type\": \"send\",\n    \"previous\": \"DBDC7AA21FA059513C7390F8ADB6EAA664384126E64DB50CFE09E31F594CDCFF\",\n    \"destination\": \"xrb_117ikxnfcpoz7oz56sxdw5yhwtt86rrwxsg5io6c6pbqa4fsr1cnyot4ikqu\",\n    \"balance\": \"00000000000000000000000000000000\",\n    \"work\": \"06fa80d5e00f047d\",\n    \"signature\": \"EAAC8136BD133B6A9D5584598558CE45A8A461B50414264B8AF73D04769C4F20E59A8C17C0E2B5C2A4ABD7BD3C980DE69616F93789FF5C5C613F51300A8BFF0A\"\n}\n",
          "amount":"1994000000000000000000000000000"
        }
      */
      // A block
      var blk = JSON.parse(payload)
      var blk2 = JSON.parse(blk.block)
      var hash = blk.hash
      var timestamp = blk.timestamp
      var account = blk.account
      var amount = blk.amount
      blk2.extras = {
        blockAccount: account,
        blockAmount: amount,
        timestamp: timestamp
        // origin: account ??
      }

      // Check for existing block already
      var existingBlock = null
      if (root.hasAccount(account)) {
        existingBlock = root.wallet.getBlockFromHashAndAccount(hash, account)
      }

      // Switch on block type
      switch (blkType) {
        case 'state':
          // If a send
          if (blk.is_send) {
            var to = blk2.link_as_account
            // If this is from one of our accounts we confirm or import
            if (root.hasAccount(account)) {
              soundService.play('send')
              if (existingBlock) {
                root.confirmBlock(existingBlock, hash, timestamp)
              } else {
                // or another wallet using same seed
                root.importBlock(blk2, account)
              }
            }
            // And if this is to one of our accounts, we pocket it
            if (root.hasAccount(to)) {
              // state block sends were "2^128 - amount" in the callback!
              // Fixed in V12.0 of node, so removed this:
              amount = bigInt(amount) // bigInt('340282366920938463463374607431768211456').minus(bigInt(amount))
              root.handleIncomingSendBlock(hash, to, account, amount)
            }
            return
          } else {
            // This is an echo from network
            if (existingBlock) {
              return root.confirmBlock(existingBlock, hash, timestamp)
            } else {
              // or another wallet using same seed
              return root.importBlock(blk2, account)
            }
          }
        case 'open':
          // This is an echo from network
          if (existingBlock) {
            return root.confirmBlock(existingBlock, hash, timestamp)
          } else {
            // or another wallet using same seed
            return root.importBlock(blk2, account)
          }
        case 'send':
          // If this is from one of our accounts we confirm or import
          if (root.hasAccount(account)) {
            soundService.play('send')
            if (existingBlock) {
              root.confirmBlock(existingBlock, hash, timestamp)
            } else {
              // or another wallet using same seed
              root.importBlock(blk2, account)
            }
          }
          // And if this is to one of our accounts, we pocket it
          var dest = blk2.destination
          if (root.hasAccount(dest)) {
            root.handleIncomingSendBlock(hash, dest, account, amount)
          }
          return
        case 'receive':
          // This is an echo from network
          if (existingBlock) {
            return root.confirmBlock(existingBlock, hash, timestamp)
          } else {
            // or another wallet using same seed
            return root.importBlock(blk2, account)
          }
        case 'change':
          // This is an echo from network
          soundService.play('repchanged')
          if (existingBlock) {
            return root.confirmBlock(existingBlock, hash, timestamp)
          } else {
            // or another wallet using same seed
            return root.importBlock(blk2, account)
          }
      }
      $log.error('Unknown block type: ' + blkType)
    }

    root.handleRate = function (payload) {
      var rates = JSON.parse(payload)
      rateService.updateRates(rates)
    }

    root.handleSharedConfig = function (payload) {
      var saveWallet = false
      root.sharedconfig = JSON.parse(payload)
      $log.debug('Received shared config' + JSON.stringify(root.sharedconfig))
      if (root.wallet) {
        if (root.sharedconfig.defaultRepresentative) {
          if (!root.wallet.hasDefaultRepresentative()) {
            root.wallet.setDefaultRepresentative(root.sharedconfig.defaultRepresentative)
            $log.debug('Set default representative in wallet to ' + root.sharedconfig.defaultRepresentative)
            saveWallet = true
          }
        }
        // Check if we should turn on state block generation. Can not be turned off again.
        if (root.sharedconfig.stateblocks.enable) {
          if (!root.wallet.getEnableStateBlocks()) {
            root.wallet.enableStateBlocks(true)
            $log.debug('Enabled state blocks on this wallet')
            saveWallet = true
          }
        }
        if (saveWallet) {
          root.saveWallet(root.wallet, function () {
            $log.debug('Saved changes in wallet from sharedConfig')
          })
        }
      }
      // Broadcast either null or a message
      $rootScope.$emit('servermessage', root.sharedconfig.servermessage)
    }

    root.onMessageArrived = function (message) {
      // $log.debug('Topic: ' + message.destinationName + ' Payload: ' + message.payloadString)
      var topic = message.destinationName
      var payload = message.payloadString
      // Switch over topics
      var parts = topic.split('/')
      switch (parts[0]) {
        case 'sharedconfig':
          root.handleSharedConfig(payload)
          return
        case 'wallet':
          // A wallet specific message
          // TODO ensure proper wallet id?
          if (parts[2] === 'block') {
            return root.handleIncomingBlock(parts[3], payload)
          }
          break
        case 'rates':
          return root.handleRate(payload)
      }
      $log.debug('Message not handled: ' + topic)
    }

    // Connect to MQTT. callback when connected or failed.
    root.connect = function (options, callback, callbackFailure) {
      var port = mqttPort
      var ip = mqttHost
      var userName = options.userName
      var password = options.password
      var clientId = options.clientId
      root.disconnect()
      mqttClient = new Paho.MQTT.Client(ip, port, clientId)
      mqttClient.onConnectionLost = root.onConnectionLost
      mqttClient.onConnected = root.onConnected
      mqttClient.onFailure = root.onFailure
      mqttClient.onMessageArrived = root.onMessageArrived
      var opts = {
        reconnect: true,
        keepAliveInterval: 3600,
        useSSL: true,
        userName: userName,
        password: password,
        onSuccess: callback,
        onFailure: callbackFailure
      }
      mqttClient.connect(opts)
    }

    root.publish = function (topic, json, qos, retained) {
      if (mqttClient) {
        var message = new Paho.MQTT.Message(json)
        message.destinationName = topic
        if (qos !== undefined) {
          message.qos = qos
        }
        if (retained !== undefined) {
          message.retained = retained
        }
        $log.debug('Send ' + topic + ' ' + json)
        mqttClient.send(message)
      } else {
        $log.error('Not connected to MQTT, should send ' + topic + ' ' + json)
      }
    }

    root.subscribe = function (topic) {
      mqttClient.subscribe(topic)
      $log.debug('Subscribed: ' + topic)
    }

    root.unsubscribe = function (topic) {
      mqttClient.unsubscribe(topic)
      $log.debug('Unsubscribed: ' + topic)
    }

    return root
  })
