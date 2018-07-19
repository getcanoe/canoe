/* globals uint8_hex nacl blake2bInit blake2bUpdate blake2bFinal hex_uint8 bigInt
   accountFromHexKey dec2hex keyFromAccount TextDecoder TextEncoder */
var pbkdf2 = require('pbkdf2')
var crypto = require('crypto')
var assert = require('assert')
var Block = require('./Block')
var Buffer = require('buffer').Buffer

var MAIN_NET_WORK_THRESHOLD = 'ffffffc000000000'
var BLOCK_BIT_LEN = 128

var Iso10126 = {
  /*
   * Fills remaining block space with random byte values, except for the
   * final byte, which denotes the byte length of the padding
   */

  pad: function (dataBytes, nBytesPerBlock) {
    var nPaddingBytes = nBytesPerBlock - dataBytes.length % nBytesPerBlock
    var paddingBytes = crypto.randomBytes(nPaddingBytes - 1)
    var endByte = new Buffer([ nPaddingBytes ])
    return Buffer.concat([ dataBytes, paddingBytes, endByte ])
  },

  unpad: function (dataBytes) {
    var nPaddingBytes = dataBytes[dataBytes.length - 1]
    return dataBytes.slice(0, -nPaddingBytes)
  }
}

var AES = {
  CBC: 'aes-256-cbc',
  OFB: 'aes-256-ofb',
  ECB: 'aes-256-ecb',

  /*
  *   Encrypt / Decrypt with aes-256
  *   - dataBytes, key, and salt are expected to be buffers
  *   - default options are mode=CBC and padding=auto (PKCS7)
  */

  encrypt: function (dataBytes, key, salt, options) {
    options = options || {}
    assert(Buffer.isBuffer(dataBytes), 'expected `dataBytes` to be a Buffer')
    assert(Buffer.isBuffer(key), 'expected `key` to be a Buffer')
    assert(Buffer.isBuffer(salt) || salt === null, 'expected `salt` to be a Buffer or null')

    var cipher = crypto.createCipheriv(options.mode || AES.CBC, key, salt || '')
    cipher.setAutoPadding(!options.padding)

    if (options.padding) dataBytes = options.padding.pad(dataBytes, BLOCK_BIT_LEN / 8)
    var encryptedBytes = Buffer.concat([ cipher.update(dataBytes), cipher.final() ])

    return encryptedBytes
  },

  decrypt: function (dataBytes, key, salt, options) {
    options = options || {}
    assert(Buffer.isBuffer(dataBytes), 'expected `dataBytes` to be a Buffer')
    assert(Buffer.isBuffer(key), 'expected `key` to be a Buffer')
    assert(Buffer.isBuffer(salt) || salt === null, 'expected `salt` to be a Buffer or null')

    var decipher = crypto.createDecipheriv(options.mode || AES.CBC, key, salt || '')
    decipher.setAutoPadding(!options.padding)

    var decryptedBytes = Buffer.concat([ decipher.update(dataBytes), decipher.final() ])
    if (options.padding) decryptedBytes = options.padding.unpad(decryptedBytes)

    return decryptedBytes
  }
}

function hexRandom (bytes) {
  return uint8_hex(nacl.randomBytes(bytes))
}

module.exports = function (password) {
  var api = {} // wallet public methods
  var priv = {} // wallet priv methods

  // Canoe rep is default (see getDefaultRepresentative()
  // but this is normally changed immediately based on sharedConfig.
  var defaultRepresentative = null

  var id = hexRandom(11) // Unique id of this wallet, to be used as reference when handling
  var token = hexRandom(32) // Secret token (used as username in server account)
  var tokenPass = hexRandom(32) // Secret tokenPass (used as password in server account)

  var enableStateBlocks // True if we should produce state blocks

  // The following variables are set via useAccount()
  var pk // current account public key
  var sk // current account secret key
  var pendingBalance // current account pending balance
  var balance // current account balance
  var lastBlock = '' // current account last block
  var lastPendingBlock = ''
  var pendingBlocks = [] // current account pending blocks
  var chain = [] // current account chain
  var representative // current account representative
  var meta // current account meta data object

  var minimumReceive = bigInt(1) // minimum amount to pocket

  var keys = [] // wallet keys, accounts, and all necessary data
  var recentTxs = []
  var walletPendingBlocks = [] // wallet pending blocks
  var readyBlocks = [] // wallet blocks signed and worked, ready to broadcast and add to chain
  var errorBlocks = [] // blocks which could not be confirmed

  var broadcastCallback = null // Callback function to perform broadcast
  var enableBroadcast = true // Flag to enable/disable

  var pows = {} // Precalculated work for all accounts, filled up regularly
  var current = -1 // key being used
  var seed = '' // wallet seed
  var lastKeyFromSeed = -1 // seed index
  var passPhrase = password // wallet password
  var iterations = 5000 // pbkdf2 iterations
  var checksum // wallet checksum
  var ciphered = true

  var logger = new Logger()

  function newBlock (state) {
    // Explicitly or implicitly by wallet setting
    var stateBlock = state || enableStateBlocks
    return new Block(stateBlock) // State blocks
  }

  api.debug = function () {
    console.log(readyBlocks)
  }

  api.debugChain = function () {
    api.useAccount(keys[1].account)
    for (var i in chain) {
      console.log(chain[i].getHash(true))
      console.log(chain[i].getPrevious())
    }
  }

  api.hasDefaultRepresentative = function () {
    return defaultRepresentative !== null
  }

  api.setDefaultRepresentative = function (rep) {
    defaultRepresentative = rep
  }

  api.getDefaultRepresentative = function () {
    return defaultRepresentative || 'xrb_3rropjiqfxpmrrkooej4qtmm1pueu36f9ghinpho4esfdor8785a455d16nf'
  }

  api.setLogger = function (loggerObj) {
    logger = loggerObj
  }

  api.enableStateBlocks = function (bool) {
    enableStateBlocks = bool
  }

  api.getEnableStateBlocks = function () {
    return enableStateBlocks
  }

  api.enableBroadcast = function (bool) {
    enableBroadcast = bool
  }

  api.setBroadcastCallback = function (cb) {
    broadcastCallback = cb
  }

  /**
   * Sets the secret key to do all the signing stuff
   *
   * @param {Array} hex - The secret key byte array
   * @throws An exception on invalid secret key length
   */
  priv.setSecretKey = function (bytes) {
    if (bytes.length !== 32) { throw new Error('Invalid Secret Key length. Should be 32 bytes') }

    sk = bytes
    pk = nacl.sign.keyPair.fromSecretKey(sk).publicKey
  }

  /**
   * Signs a message with the secret key
   *
   * @param {Array} message - The message to be signed in a byte array
   * @returns {Array} The 64 byte signature
   */
  api.sign = function (message) {
    return nacl.sign.detached(message, sk)
  }

  /**
   * Signs an alias request with the secret key
   *
   * @param {Array} fields - The fields to be signed in an array of strings for public signatures its [alias,address] for priv signatures its [alias,address,seed]
   * @returns {String} The Hex Signature
   */
  api.aliasSignature = function (fields) {
    if (current !== -1) {
      var context = blake2bInit(32)
      for (var i = 0; i < fields.length; i++) {
        blake2bUpdate(context, hex_uint8(fields[i]))
      }
      var data = {
        hash: uint8_hex(blake2bFinal(context))
      }
      data.signature = uint8_hex(nacl.sign.detached(hex_uint8(data.hash), keys[current].priv))
      return data
    } else {
      logger.log('No current account')
      return null
    }
  }

  api.checkPass = function (pswd) {
    return passPhrase === pswd
  }

  api.changePass = function (pswd, newPass) {
    if (ciphered) { throw new Error('Wallet needs to be decrypted first') }
    if (pswd === passPhrase) {
      passPhrase = newPass
      logger.log('Password changed')
    } else { throw new Error('Incorrect password') }
  }

  api.setIterations = function (newIterationNumber) {
    newIterationNumber = parseInt(newIterationNumber)
    if (newIterationNumber < 2) {
      throw new Error('Minimum iteration number is 2')
    }
    iterations = newIterationNumber
  }

  api.setMinimumReceive = function (rawAmount) {
    var amount = bigInt(rawAmount)
    if (amount.lesser(0)) { return false }
    minimumReceive = amount
    return true
  }

  api.getMinimumReceive = function () {
    return minimumReceive
  }

  /**
   * Sets a seed for the wallet
   *
   * @param {string} hexSeed - The 32 byte seed hex encoded
   * @throws An exception on malformed seed
   */
  api.setSeed = function (hexSeed) {
    if (!/[0-9A-F]{64}/i.test(hexSeed)) { throw new Error('Invalid Hex Seed') }
    seed = hex_uint8(hexSeed)
  }

  api.getSeed = function (pswd) {
    if (pswd === passPhrase) { return uint8_hex(seed) }
    throw new Error('Incorrect password')
  }

  /**
   * Sets a random seed for the wallet
   *
   * @param {boolean} overwrite - Set to true to overwrite an existing seed
   * @throws An exception on existing seed
   */
  api.setRandomSeed = function (overwrite = false) {
    if (seed && !overwrite) {
      throw new Error('Seed already exists. To overwrite use setSeed or set overwrite to true')
    }
    seed = nacl.randomBytes(32)
  }

  /**
   * Derives a new secret key from the seed and adds it to the wallet
   *
   * @throws An exception if theres no seed
   */
  api.newKeyFromSeed = function () {
    if (seed.length !== 32) { throw new Error('Seed should be set first.') }

    var index = lastKeyFromSeed + 1
    index = hex_uint8(dec2hex(index, 4))

    var context = blake2bInit(32)
    blake2bUpdate(context, seed)
    blake2bUpdate(context, index)

    var newKey = blake2bFinal(context)

    lastKeyFromSeed++

    logger.log('New key generated')
    api.addSecretKey(uint8_hex(newKey))

    return accountFromHexKey(uint8_hex(nacl.sign.keyPair.fromSecretKey(newKey).publicKey))
  }

  /**
   * Adds a key to the wallet
   *
   * @param {string} hex - The secret key hex encoded
   * @throws An exception on invalid secret key length
   * @throws An exception on invalid hex format
   */
  api.addSecretKey = function (hex) {
    if (hex.length !== 64) { throw new Error('Invalid Secret Key length. Should be 32 bytes') }

    if (!/[0-9A-F]{64}/i.test(hex)) { throw new Error('Invalid Hex Secret Key') }

    keys.push(
      {
        priv: hex_uint8(hex),
        pub: nacl.sign.keyPair.fromSecretKey(hex_uint8(hex)).publicKey,
        account: accountFromHexKey(uint8_hex(nacl.sign.keyPair.fromSecretKey(hex_uint8(hex)).publicKey)),
        balance: bigInt(0),
        pendingBalance: bigInt(0),
        lastBlock: '',
        lastPendingBlock: '',
        subscribed: false,
        chain: [],
        representative: api.getDefaultRepresentative(),
        meta: { label: '' }
      }
    )
    logger.log('New key added to wallet.')
  }

  /**
   *
   * @param {boolean} hex - To return the result hex encoded
   * @returns {string} The public key hex encoded
   * @returns {Array} The public key in a byte array
   */
  api.getPublicKey = function (hex = false) {
    if (hex) { return uint8_hex(pk) }
    return pk
  }

  /**
   *
   * @returns {string} The current account
   */
  api.getCurrentAccount = function () {
    if (current !== -1) { return keys[current].account }
    return null
  }

  /**
   * List all the accounts in the wallet
   *
   * @returns {Array}
   */
  api.getAccounts = function () {
    var accounts = []
    for (var i in keys) {
      accounts.push({
        id: keys[i].account,
        balance: bigInt(keys[i].balance),
        pendingBalance: bigInt(keys[i].pendingBalance),
        name: keys[i].meta.label,
        meta: keys[i].meta
      })
    }
    return accounts
  }

  /**
   * List all the account ids in the wallet
   *
   * @returns {Array}
   */
  api.getAccountIds = function () {
    var ids = []
    for (var i in keys) {
      ids.push(keys[i].account)
    }
    return ids
  }

  /**
   * Get a single account in the wallet given account number
   *
   * @returns {Array}
   */
  api.getAccount = function (account) {
    var key = api.findKey(account)
    if (!key) return null
    return {
      id: key.account,
      balance: bigInt(key.balance),
      pendingBalance: bigInt(key.pendingBalance),
      name: key.meta.label,
      meta: key.meta
    }
  }

  /**
   * Find key for given account number
   */
  api.findKey = function (account) {
    for (var i in keys) {
      if (keys[i].account === account) {
        return keys[i]
      }
    }
    return null
  }

  /**
   * Switches the account being used by the wallet
   *
   * @param {string} accountToUse
   * @throws An exception if the account is not found in the wallet
   */
  api.useAccount = function (accountToUse) {
    // save current account status
    if (current !== -1) {
      keys[current].balance = balance
      keys[current].pendingBalance = pendingBalance
      keys[current].lastBlock = lastBlock
      keys[current].lastPendingBlock = lastPendingBlock
      keys[current].chain = chain
      keys[current].pendingBlocks = pendingBlocks
      keys[current].representative = representative
      keys[current].meta = meta
    }

    for (var i in keys) {
      if (keys[i].account === accountToUse) {
        priv.setSecretKey(keys[i].priv)
        balance = keys[i].balance
        pendingBalance = keys[i].pendingBalance
        current = i
        lastBlock = keys[i].lastBlock
        lastPendingBlock = keys[i].lastPendingBlock
        chain = keys[i].chain
        representative = keys[i].representative
        meta = keys[i].meta
        return
      }
    }
    throw new Error('Account not found in wallet (' + accountToUse + ') ' + JSON.stringify(api.getAccounts()))
  }

  api.importChain = function (blocks, acc) {
    api.useAccount(acc)
    var last = chain.length > 0 ? chain[chain.length - 1].getHash(true) : uint8_hex(pk)
    // verify chain
    for (var i in blocks) {
      if (blocks[i].getPrevious() !== last) { throw new Error('Invalid chain') }
      if (!api.verifyBlock(blocks[i])) { throw new Error('There is an invalid block') }
    }
  }

  api.resetChain = function (acc) {
    api.useAccount(acc)
    balance = bigInt(0)
    pendingBalance = bigInt(0)
    pendingBlocks = []
    lastBlock = ''
    lastPendingBlock = ''
    chain = []
    priv.save()
  }

  api.getLastNBlocks = function (acc, n, offset = 0) {
    var temp = keys[current].account
    api.useAccount(acc)
    var blocks = []

    if (n > chain.length) { n = chain.length }

    for (var i = chain.length - 1 - offset; i > chain.length - 1 - n - offset; i--) {
      blocks.push(chain[i])
    }
    api.useAccount(temp)
    return blocks
  }

  api.getBlocksUpTo = function (acc, hash) {
    var temp = keys[current].account
    api.useAccount(acc)
    var blocks = []
    for (var i = chain.length - 1; i > 0; i--) {
      blocks.push(chain[i])
      if (chain[i].getHash(true) === hash) { break }
    }
    api.useAccount(temp)
    return blocks
  }

  api.getAccountBlockCount = function (acc) {
    var temp = keys[current].account
    api.useAccount(acc)
    var n = chain.length
    api.useAccount(temp)
    return n
  }

  /**
   * Generates a block signature from the block hash using the secret key
   *
   * @param {string} blockHash - The block hash hex encoded
   * @throws An exception on invalid block hash length
   * @throws An exception on invalid block hash hex encoding
   * @returns {string} The 64 byte hex encoded signature
   */
  api.signBlock = function (block) {
    var blockHash = block.getHash()
    if (blockHash.length !== 32) {
      throw new Error('Invalid block hash length. It should be 32 bytes')
    }
    block.setSignature(uint8_hex(api.sign(blockHash)))
    block.setAccount(keys[current].account)
    logger.log('Block ' + block.getHash(true) + ' signed.')
  }

  /**
   * Verifies a block signature given its hash, sig and NANO account
   *
   * @param {string} blockHash - 32 byte hex encoded block hash
   * @param {string} blockSignature - 64 byte hex encoded signature
   * @param {string} account - A NANO account supposed to have signed the block
   * @returns {boolean}
   */
  api.verifyBlockSignature = function (blockHash, blockSignature, account) {
    var pubKey = hex_uint8(keyFromAccount(account))
    return nacl.sign.detached.verify(hex_uint8(blockHash), hex_uint8(blockSignature), pubKey)
  }

  api.verifyBlock = function (block) {
    return api.verifyBlockSignature(block.getHash(true), block.getSignature(), block.getAccount())
  }

  /**
   * Returns current account balance
   *
   * @returns {number} balance
   */
  api.getBalance = function () {
    return balance || keys[current].balance
  }

  /**
   * Returns current account pending balance (not pocketed)
   *
   * @returns {number} pendingBalance
   */
  api.getPendingBalance = function () {
    // return pendingBalance ? pendingBalance : keys[current].pendingBalance;
    var am = bigInt(0)
    for (var i in pendingBlocks) {
      if (pendingBlocks[i].getType() === 'open' || pendingBlocks[i].getType() === 'receive') {
        am = am.add(pendingBlocks[i].getAmount())
      }
    }
    return am
  }

  api.getRepresentative = function (acc = false) {
    if (!acc) { return representative }
    api.useAccount(acc)
    return representative
  }

  priv.setRepresentative = function (repr) {
    representative = repr
    keys[current].representative = repr
  }

  /**
   * Updates current account balance
   *
   * @param {number} newBalance - The new balance in rai units
   */
  priv.setBalance = function (newBalance) {
    balance = bigInt(newBalance)
    keys[current].balance = balance
  }

  priv.setPendingBalance = function (newBalance) {
    pendingBalance = bigInt(newBalance)
    keys[current].pendingBalance = pendingBalance
  }

  api.getAccountBalance = function (acc) {
    api.useAccount(acc)
    return api.getBalanceUpToBlock(0)
  }

  api.getWalletPendingBalance = function () {
    var pending = bigInt(0)
    for (var i in walletPendingBlocks) {
      if (walletPendingBlocks[i].getType() === 'open' || walletPendingBlocks[i].getType() === 'receive') {
        pending = pending.add(walletPendingBlocks[i].getAmount())
      }
    }
    return pending
  }

  api.getWalletBalance = function () {
    var bal = bigInt(0)
    var temp
    for (var i in keys) {
      temp = keys[i].balance
      bal = bal.add(temp)
    }
    return bal
  }

  api.recalculateWalletBalances = function () {
    for (var i in keys) {
      api.useAccount(keys[i].account)
      priv.setBalance(api.getBalanceUpToBlock(0))
    }
  }

  api.getBalanceUpToBlock = function (blockHash) {
    var sum = bigInt(0)
    if (chain.length + pendingBlocks.length === 0) { return sum }

    var found = blockHash === 0
    var blk

    // check pending blocks first
    for (var i = pendingBlocks.length - 1; i >= 0; i--) {
      blk = pendingBlocks[i]

      if (blk.getHash(true) === blockHash) { found = true }

      if (found) {
        if (blk.isState()) {
          return blk.getBalance()
        }
        if (blk.getType() === 'open' || blk.getType() === 'receive') {
          sum = sum.add(blk.getAmount())
        } else if (blk.getType() === 'send') {
          sum = sum.add(blk.getBalance())
          break
        }
      }
    }

    for (i = chain.length - 1; i >= 0; i--) {
      blk = chain[i]

      if (blk.getHash(true) === blockHash) { found = true }

      if (found) {
        if (blk.isState()) {
          return blk.getBalance()
        }
        if (blk.getType() === 'open' || blk.getType() === 'receive') {
          sum = sum.add(blk.getAmount())
        } else if (blk.getType() === 'send') {
          sum = sum.add(blk.getBalance())
          break
        }
      }
    }
    return sum
  }

  /**
   * Updates an account balance
   *
   * @param {number} - The new balance in raw units
   * @param {string} Account - The account whose balance is being updated
   */
  priv.setAccountBalance = function (newBalance, acc) {
    var temp = current
    api.useAccount(acc)
    priv.setBalance(newBalance)
    api.useAccount(keys[temp].account)
  }

  priv.sumAccountPending = function (acc, amount) {
    var temp = current
    api.useAccount(acc)
    priv.setPendingBalance(api.getPendingBalance().sum(amount))
    api.useAccount(keys[temp].account)
  }

  api.setMeta = function (acc, meta) {
    for (var i in keys) {
      if (keys[i].account === acc) {
        keys[i].meta = meta
        return true
      }
    }
    return false
  }

  api.getMeta = function (acc) {
    for (var i in keys) {
      if (keys[i].account === acc) {
        return keys[i].meta
      }
    }
    return null
  }

  api.removePendingBlocks = function (account) {
    var temp = keys[current].account
    api.useAccount(account)
    pendingBlocks = []
    api.useAccount(temp)
  }

  api.removePendingBlock = function (blockHash) {
    var found = false
    for (var i in pendingBlocks) {
      var tmp = pendingBlocks[i]
      if (tmp.getHash(true) === blockHash) {
        pendingBlocks.splice(i, 1)
        found = true
      }
    }
    if (!found) {
      console.log('Not found')
      return
    }
    for (i in walletPendingBlocks) {
      tmp = walletPendingBlocks[i]
      if (tmp.getHash(true) === blockHash) {
        walletPendingBlocks.splice(i, 1)
        return
      }
    }
  }

  api.clearWalletPendingBlocks = function () {
    walletPendingBlocks = []
  }

  api.getBlockFromHashAndAccount = function (blockHash, acc) {
    api.useAccount(acc)
    for (var j = chain.length - 1; j >= 0; j--) {
      var blk = chain[j]
      if (blk.getHash(true) === blockHash) { return blk }
    }
    return null
  }

  api.lastBlockIsState = function () {
    if (lastBlock) {
      return api.getBlockFromHash(lastBlock).isState()
    }
    return false
  }

  api.getBlockFromHash = function (blockHash) {
    for (var i = 0; i < keys.length; i++) {
      api.useAccount(keys[i].account)
      for (var j = chain.length - 1; j >= 0; j--) {
        var blk = chain[j]
        if (blk.getHash(true) === blockHash) { return blk }
      }
    }
    return null
  }

  api.addBlockToReadyBlocks = function (blk) {
    readyBlocks.push(blk)
    logger.log('Block ready to be broadcasted: ' + blk.getHash(true))
    if (enableBroadcast) {
      broadcastCallback(readyBlocks)
    }
  }

  // Check if we already have a precalculated PoW and if so consume it, otherwise
  // we will have to wait for work coming in from outside via addWorkToPendingBlock
  priv.checkPrecalculated = function (blockHash, acc) {
    var precalc = pows[acc]
    if (precalc) {
      delete pows[acc]
      logger.log('Using precalculated work for block: ' + blockHash + ' previous: ' + precalc.hash)
      api.addWorkToPendingBlock(precalc.hash, precalc.work)
    }
  }

  api.addPendingSendBlock = function (from, to, amount = 0) {
    api.useAccount(from)
    amount = bigInt(amount)

    var bal = api.getBalanceUpToBlock(0)
    var remaining = bal.minus(amount)
    var blk = newBlock(api.lastBlockIsState())

    blk.setSendParameters(lastPendingBlock, to, remaining)
    if (blk.isState()) {
      blk.setStateParameters(from, representative)
    }
    blk.build()
    api.signBlock(blk)
    blk.setAmount(amount)
    blk.setAccount(from)

    lastPendingBlock = blk.getHash(true)
    keys[current].lastPendingBlock = lastPendingBlock
    priv.setBalance(remaining)
    pendingBlocks.push(blk)
    walletPendingBlocks.push(blk)
    priv.save()

    logger.log('New send block ready for work: ' + lastPendingBlock)

    priv.checkPrecalculated(lastPendingBlock, from)

    return blk
  }

  api.addPendingReceiveBlock = function (sourceBlockHash, acc, from, amount = 0) {
    amount = bigInt(amount)
    api.useAccount(acc)
    if (amount.lesser(minimumReceive)) {
      logger.log('Receive block rejected due to minimum receive amount (' + sourceBlockHash + ')')
      return false
    }

    // make sure this source has not been redeemed yet
    for (var i in walletPendingBlocks) {
      if (walletPendingBlocks[i].getSource() === sourceBlockHash) { return false }
    }

    for (i in readyBlocks) {
      if (readyBlocks[i].getSource() === sourceBlockHash) { return false }
    }

    for (i in chain) {
      if (chain[i].getSource() === sourceBlockHash) { return false }
    }

    var blk = newBlock(api.lastBlockIsState())
    if (lastPendingBlock.length === 64) {
      blk.setReceiveParameters(lastPendingBlock, sourceBlockHash)
    } else {
      blk.setOpenParameters(sourceBlockHash, acc, api.getDefaultRepresentative())
    }
    if (blk.isState()) {
      var bal = api.getBalanceUpToBlock(0)
      var remaining = bal.plus(amount)
      blk.setStateParameters(acc, representative, remaining)
    }
    blk.build()
    api.signBlock(blk)
    blk.setAmount(amount)
    blk.setAccount(acc)
    blk.setOrigin(from)

    lastPendingBlock = blk.getHash(true)
    keys[current].lastPendingBlock = lastPendingBlock
    pendingBlocks.push(blk)
    walletPendingBlocks.push(blk)
    priv.setPendingBalance(api.getPendingBalance().add(amount))
    priv.save()

    logger.log('New receive block ready for work: ' + lastPendingBlock)

    priv.checkPrecalculated(lastPendingBlock, acc)

    return blk
  }

  api.addPendingChangeBlock = function (acc, repr) {
    api.useAccount(acc)

    if (!lastPendingBlock) { throw new Error('There needs to be at least 1 block in the chain') }

    var blk = newBlock(api.lastBlockIsState())
    blk.setChangeParameters(lastPendingBlock, repr)
    if (blk.isState()) {
      var bal = api.getBalanceUpToBlock(0)
      blk.setStateParameters(acc, repr, bal)
    }
    blk.build()
    api.signBlock(blk)
    blk.setAccount(acc)

    lastPendingBlock = blk.getHash(true)
    keys[current].lastPendingBlock = lastPendingBlock
    pendingBlocks.push(blk)
    walletPendingBlocks.push(blk)
    priv.save()

    logger.log('New change block ready for work: ' + lastPendingBlock)

    priv.checkPrecalculated(lastPendingBlock, acc)

    return blk
  }

  api.getPendingBlocks = function () {
    return pendingBlocks
  }

  api.getPendingBlockByHash = function (blockHash) {
    for (var i in walletPendingBlocks) {
      if (walletPendingBlocks[i].getHash(true) === blockHash) {
        return walletPendingBlocks[i]
      }
    }
    return false
  }

  api.getNextWorkBlockHash = function (acc) {
    var result
    var temp = keys[current].account
    api.useAccount(acc)
    if (lastBlock.length > 0) {
      result = lastBlock
    } else {
      result = uint8_hex(pk)
    }
    api.useAccount(temp)
    return result
  }

  priv.chainPush = function (blk, hash) {
    chain.push(blk)
    lastBlock = hash
    keys[current].lastBlock = hash
  }

  api.clearPrecalc = function () {
    pows = {}
  }

  api.checkWork = function (work, blockHash) {
    var t = hex_uint8(MAIN_NET_WORK_THRESHOLD)
    var context = blake2bInit(8, null)
    blake2bUpdate(context, hex_uint8(work).reverse())
    blake2bUpdate(context, hex_uint8(blockHash))
    var threshold = blake2bFinal(context).reverse()
    if (threshold[0] === t[0]) {
      if (threshold[1] === t[1]) {
        if (threshold[2] === t[2]) {
          if (threshold[3] >= t[3]) {
            return true
          }
        }
      }
    }
    return false
  }

  api.getNextPrecalcToWork = function () {
    for (var i in keys) {
      var acc = keys[i].account
      if (!pows[acc]) {
        // No precalculated for this account, let's make one
        var hash = api.getNextWorkBlockHash(acc)
        return {account: acc, hash: hash}
      }
    }
    return null
  }

  api.addWorkToPrecalc = function (acc, hash, work) {
    pows[acc] = {hash: hash, work: work}
  }

  api.getNextPendingBlockToWork = function () {
    if (walletPendingBlocks.length === 0) {
      return null
    }
    return walletPendingBlocks[0].getPrevious()
  }

  // Called when work has been found for hash
  api.addWorkToPendingBlock = function (hash, work) {
    if (!api.checkWork(work, hash)) {
      logger.warn('Invalid PoW received (' + work + ') (' + hash + ').')
      return false
    }
    // Find pending block with this hash as previous
    for (var j in walletPendingBlocks) {
      if (walletPendingBlocks[j].getPrevious() === hash) {
        // Yes, this is the one, add work to it
        var pendingBlk = walletPendingBlocks[j]
        var pendingHash = pendingBlk.getHash(true)
        logger.log('Work received for block ' + pendingHash + ' previous: ' + hash)
        pendingBlk.setWork(work)
        // Now we can confirm the block and if that works it will end up in readyBlocks
        try {
          api.confirmBlock(pendingHash)
        } catch (e) {
          logger.error('Error adding block ' + pendingHash + ' to chain: ' + e.message)
          errorBlocks.push(pendingHash)
        }
        return true // work consumed no matter if block was added or not
      }
    }
    return false // work not consumed, no matching block found
  }

  api.getReadyBlocks = function () {
    return readyBlocks
  }

  api.getNextReadyBlock = function () {
    if (readyBlocks.length > 0) { return readyBlocks[0] } else { return false }
  }

  api.getReadyBlockByHash = function (blockHash) {
    for (var i in pendingBlocks) {
      if (readyBlocks[i].getHash(true) === blockHash) {
        return readyBlocks[i]
      }
    }
    return false
  }

  api.clearReadyBlocks = function () {
    readyBlocks = []
  }

  api.removeReadyBlock = function (blockHash) {
    for (var i in readyBlocks) {
      if (readyBlocks[i].getHash(true) === blockHash) {
        var blk = readyBlocks[i]
        readyBlocks.splice(i, 1)
        return blk
      }
    }
    return false
  }

  /**
   * Adds block to account chain
   *
   * @param {string} - blockHash The block hash
   * @throws An exception if the block is not found in the ready blocks array
   * @throws An exception if the previous block does not match the last chain block
   * @throws An exception if the chain is empty and the block is not of type open
   */
  api.confirmBlock = function (blockHash) {
    var blk = api.getPendingBlockByHash(blockHash)
    if (blk) {
      if (blk.ready()) {
        api.useAccount(blk.getAccount())
        if (chain.length === 0) {
          // open block
          if (blk.getType() !== 'open') { throw new Error("First block needs to be 'open'.") }
          priv.chainPush(blk, blockHash)
          api.removePendingBlock(blockHash)
          api.addBlockToReadyBlocks(blk)
          priv.setPendingBalance(api.getPendingBalance().minus(blk.getAmount()))
          priv.setBalance(api.getBalance().add(blk.getAmount()))
          // State blocks always carry representative
          if (blk.isState()) {
            priv.setRepresentative(blk.getRepresentative())
          }
          priv.save()
        } else {
          if (blk.getPrevious() === chain[chain.length - 1].getHash(true)) {
            if (blk.getType() === 'receive') {
              priv.setPendingBalance(api.getPendingBalance().minus(blk.getAmount()))
              priv.setBalance(api.getBalance().add(blk.getAmount()))
            } else if (blk.getType() === 'send') {
              // check if amount sent matches amount actually being sent
              var real = api.getBalanceUpToBlock(blk.getPrevious())
              if (blk.isImmutable()) {
                blk.setAmount(real.minus(blk.getBalance('dec')))
              } else if (real.minus(blk.getBalance('dec')).neq(blk.getAmount())) {
                logger.error('Sending incorrect amount (' + blk.getAmount().toString() + ') (' + (real.minus(blk.getBalance('dec')).toString()) + ')')
                api.recalculateWalletBalances()
                throw new Error('Incorrect send amount')
              }
            } else if (blk.getType() === 'change') {
              priv.setRepresentative(blk.getRepresentative())
            } else {
              throw new Error('Invalid block type')
            }
            priv.chainPush(blk, blockHash)
            api.removePendingBlock(blockHash)
            api.addBlockToReadyBlocks(blk)
            // State blocks always carry representative
            if (blk.isState()) {
              priv.setRepresentative(blk.getRepresentative())
            }
            api.recalculateWalletBalances()
            priv.save()
          } else {
            console.log(blk.getPrevious() + ' ' + chain[chain.length - 1].getHash(true))
            logger.warn('Previous block does not match actual previous block')
            throw new Error('Previous block does not match actual previous block')
          }
        }
        logger.log('Block added to chain: ' + blk.getHash(true))
      } else {
        logger.error('Trying to confirm block without signature or work.')
        throw new Error('Block lacks signature or work')
      }
    } else {
      logger.warn('Block trying to be confirmed has not been found.')
      throw new Error('Block not found')
    }
  }

  api.importBlock = function (blk, acc) {
    api.useAccount(acc)
    blk.setAccount(acc)
    if (!blk.ready()) { throw new Error('Block should be complete') }

    lastPendingBlock = blk.getHash(true)
    keys[current].lastPendingBlock = blk.getHash(true)

    // check if there is a conflicting block pending
    for (var i in pendingBlocks) {
      if (pendingBlocks[i].getPrevious() === blk.getPrevious()) {
        // conflict
        priv.fixPreviousChange(blk.getPrevious(), blk.getHash(true), acc)
      }
    }

    pendingBlocks.push(blk)
    walletPendingBlocks.push(blk)
    priv.save()
    api.confirmBlock(blk.getHash(true))
  }

  api.createBlockFromJSON = function (jsonOrObj) {
    var blk = newBlock() // jsonOrObj will decide if state block or not
    blk.buildFromJSON(jsonOrObj)
    return blk
  }

  api.importForkedBlock = function (blk, acc) {
    api.useAccount(acc)
    var prev = blk.getPrevious()

    for (var i = chain.length - 1; i >= 0; i--) {
      if (chain[i].getPrevious() === prev) {
        // fork found, delete block and its successors
        chain.splice(i, chain.length)

        // delete pending blocks if any
        pendingBlocks = []

        // import new block
        api.importBlock(blk, acc)
        return true
      }
    }
    return false
  }

  priv.fixPreviousChange = function (oldPrevious, newPrevious, acc) {
    api.useAccount(acc)
    for (var i in pendingBlocks) {
      if (pendingBlocks[i].getPrevious() === oldPrevious) {
        var oldHash = pendingBlocks[i].getHash(true)
        pendingBlocks[i].changePrevious(newPrevious)
        var newHash = pendingBlocks[i].getHash(true)
        lastPendingBlock = newHash
        priv.fixPreviousChange(oldHash, newHash, acc)
      }
    }
  }

  api.getId = function () {
    return id
  }

  api.getToken = function () {
    return token
  }

  api.getTokenPass = function () {
    return tokenPass
  }

  priv.save = function () {
    // save current account status
    keys[current].balance = balance
    keys[current].pendingBalance = pendingBalance
    keys[current].lastBlock = lastBlock
    keys[current].chain = chain
    keys[current].pendingBlocks = pendingBlocks
    keys[current].representative = representative
  }

  /**
   * Serialize the wallet as JSON
   *
   * @returns {string}
   */
  api.getEntireJSON = function () {
    var pack = {}
    var tempKeys = []
    for (var i in keys) {
      var aux = {}
      aux.priv = uint8_hex(keys[i].priv)
      aux.pub = uint8_hex(keys[i].pub)
      aux.account = keys[i].account
      aux.balance = keys[i].balance.toString()
      aux.pendingBalance = keys[i].pendingBalance.toString()
      aux.lastBlock = keys[i].lastBlock
      aux.pendingBlocks = []
      aux.chain = []
      aux.representative = keys[i].representative
      aux.meta = keys[i].meta

      for (var j in keys[i].chain) {
        aux.chain.push(keys[i].chain[j].getEntireJSON())
      }
      tempKeys.push(aux)
    }
    pack.readyBlocks = []

    for (var rdyBlock in readyBlocks) {
      pack.readyBlocks.push(readyBlocks[rdyBlock].getEntireJSON())
    }
    pack.keys = tempKeys
    pack.seed = uint8_hex(seed)
    pack.last = lastKeyFromSeed
    pack.recent = recentTxs
    pack.pows = pows
    pack.minimumReceive = minimumReceive.toString()

    pack.id = id
    pack.token = token
    pack.tokenPass = tokenPass

    pack.enableStateBlocks = enableStateBlocks

    return JSON.stringify(pack)
  }

  /**
   * Encrypts and packs the wallet data in a hex string
   *
   * @returns {string}
   */
  api.pack = function () {
    var pack = api.getEntireJSON()
    pack = Buffer.from(stringToArr(pack))

    var context = blake2bInit(32)
    blake2bUpdate(context, pack)
    checksum = blake2bFinal(context)

    var salt = new Buffer(nacl.randomBytes(16))
    var key = pbkdf2.pbkdf2Sync(passPhrase, salt, iterations, 32, 'sha1')

    var options = { mode: AES.CBC, padding: Iso10126 }
    var encryptedBytes = AES.encrypt(pack, key, salt, options)

    var payload = Buffer.concat([new Buffer(checksum), salt, encryptedBytes])
    return payload.toString('hex')
  }

  /**
   * Convert an Uint8Array into a string.
   *
   * @returns {String}
   */
  function arrToString (uint8array) {
    return new TextDecoder('utf-8').decode(uint8array)
  }

  /**
  * Convert a string into a Uint8Array.
  *
  * @returns {Uint8Array}
  */
  function stringToArr (myString) {
    return new TextEncoder('utf-8').encode(myString)
  }

  /**
   * Constructs the wallet from an encrypted base64 encoded wallet
   */
  api.load = function (data) {
    var bytes = new Buffer(data, 'hex')
    checksum = bytes.slice(0, 32)
    var salt = bytes.slice(32, 48)
    var payload = bytes.slice(48)
    var key = pbkdf2.pbkdf2Sync(passPhrase, salt, iterations, 32, 'sha1')

    var options = {}
    options.padding = options.padding || Iso10126
    var decryptedBytes = AES.decrypt(payload, key, salt, options)

    var context = blake2bInit(32)
    blake2bUpdate(context, decryptedBytes)
    var hash = uint8_hex(blake2bFinal(context))

    if (hash !== checksum.toString('hex').toUpperCase()) {
      throw new Error('Wallet is corrupted or has been tampered')
    }

    var walletData = JSON.parse(arrToString(decryptedBytes))
    seed = hex_uint8(walletData.seed)
    lastKeyFromSeed = walletData.last
    recentTxs = walletData.recent
    pows = walletData.pows || {}
    minimumReceive = walletData.minimumReceive !== undefined ? bigInt(walletData.minimumReceive) : bigInt('1000000000000000000000000')
    id = walletData.id
    token = walletData.token
    tokenPass = walletData.tokenPass
    enableStateBlocks = walletData.enableStateBlocks

    readyBlocks = []
    for (var i in walletData.readyBlocks) {
      var blk = newBlock()
      blk.buildFromJSON(walletData.readyBlocks[i])
      readyBlocks.push(blk)
    }

    for (i in walletData.keys) {
      var aux = {}

      aux.chain = []
      for (var j in walletData.keys[i].chain) {
        blk = newBlock()
        var prev = null
        if (j > 0) {
          prev = walletData.keys[i].chain[j-1]
        }
        blk.buildFromJSON(walletData.keys[i].chain[j],prev)
        aux.chain.push(blk)
      }

      aux.priv = hex_uint8(walletData.keys[i].priv)
      aux.pub = hex_uint8(walletData.keys[i].pub)
      aux.account = walletData.keys[i].account
      aux.balance = bigInt(walletData.keys[i].balance ? walletData.keys[i].balance : 0)
      aux.lastBlock = aux.chain.length > 0 ? aux.chain[aux.chain.length - 1].getHash(true) : ''
      aux.lastPendingBlock = aux.lastBlock
      aux.pendingBalance = bigInt(walletData.keys[i].pendingBalance ? walletData.keys[i].pendingBalance : 0)
      aux.pendingBlocks = []
      aux.representative = walletData.keys[i].representative !== undefined ? walletData.keys[i].representative : aux.account
      aux.meta = walletData.keys[i].meta !== undefined ? walletData.keys[i].meta : { label: '' }

      keys.push(aux)
    }
    api.useAccount(keys[0].account)
    api.recalculateWalletBalances()
    ciphered = false
    return walletData
  }

  api.createSeed = function (setSeed = false) {
    if (!setSeed) {
      seed = nacl.randomBytes(32)
    } else {
      api.setSeed(setSeed)
    }
    return uint8_hex(seed)
  }

  api.createAccount = function (newMeta) {
    var account = api.newKeyFromSeed()
    api.useAccount(account)
    keys[current].meta = newMeta
    meta = newMeta
    return api.getAccount(account)
  }

  // Use with care, we only remove the last account if the chain is empty.
  api.removeLastAccount = function () {
    if (keys.length < 2) {
      // No account to remove
      return null
    }
    var lastAccount = keys[keys.length - 1].account
    var prevAccount = keys[keys.length - 2].account
    api.useAccount(lastAccount)
    if (chain.length === 0) {
      api.useAccount(prevAccount) // We should not have a current that we are removing
      keys.pop()
      lastKeyFromSeed-- // Would be simpler to just use size of keys
      return lastAccount
    } else {
      return null
    }
  }

  return api
}
