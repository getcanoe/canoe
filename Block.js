/* globals bigInt blake2bInit blake2bUpdate hex_uint8 uint8_hex blake2bFinal keyFromAccount
   hex2dec dec2hex accountFromHexKey stringFromHex */
var RAI_TO_RAW = '000000000000000000000000'
var MAIN_NET_WORK_THRESHOLD = 'ffffffc000000000'
var STATE_BLOCK_PREAMBLE = '0000000000000000000000000000000000000000000000000000000000000006'
var STATE_BLOCK_ZERO = '0000000000000000000000000000000000000000000000000000000000000000'

module.exports = function (isState = true) {
  var api = {} // public methods
  var type // block type
  var state = isState // if this is a state block
  var send // if this is a send state block
  var hash // block hash
  var signed = false // if block has signature
  var worked = false // if block has work
  var signature = '' // signature
  var work = '' // work
  var blockAmount = bigInt(0)// amount transferred
  var blockAccount // account owner of this block
  var blockMessage // Additional information about this block
  var origin // account sending money in case of receive or open block
  var immutable = false // if true means block has already been confirmed and cannot be changed, some checks are ignored
  var timestamp // the UTC timestamp in milliseconds since 1970, 1 jan

  var previous // send, receive and change
  var destination // send
  var balance // send
  var source // receive and open
  var representative // open and change
  var account // open

  /**
   * Calculates the hash
   *
   * @throws An exception on invalid type
   * @returns {Array} The block hash
   */
  api.build = function () {
    var context = blake2bInit(32, null)
    if (state) {
      blake2bUpdate(context, hex_uint8(STATE_BLOCK_PREAMBLE))
      blake2bUpdate(context, hex_uint8(account))
      blake2bUpdate(context, hex_uint8(previous))
      blake2bUpdate(context, hex_uint8(representative))
      blake2bUpdate(context, hex_uint8(balance))
      switch (type) {
        case 'send':
          blake2bUpdate(context, hex_uint8(destination))
          break
        case 'receive':
          blake2bUpdate(context, hex_uint8(source))
          break
        case 'open':
          blake2bUpdate(context, hex_uint8(source))
          break
        case 'change':
          blake2bUpdate(context, hex_uint8(STATE_BLOCK_ZERO))
          break
        default:
          throw new Error('Unrecognized type of block')
      }
    } else {
      switch (type) {
        case 'send':
          blake2bUpdate(context, hex_uint8(previous))
          blake2bUpdate(context, hex_uint8(destination))
          blake2bUpdate(context, hex_uint8(balance))
          break
        case 'receive':
          blake2bUpdate(context, hex_uint8(previous))
          blake2bUpdate(context, hex_uint8(source))
          break
        case 'open':
          blake2bUpdate(context, hex_uint8(source))
          blake2bUpdate(context, hex_uint8(representative))
          blake2bUpdate(context, hex_uint8(account))
          break
        case 'change':
          blake2bUpdate(context, hex_uint8(previous))
          blake2bUpdate(context, hex_uint8(representative))
          break
        default:
          throw new Error('Unrecognized type of block')
      }
    }
    hash = uint8_hex(blake2bFinal(context))
    return hash
  }

  /**
   * Sets the send parameters and builds the block
   *
   * @param {string} previousBlockHash - The previous block 32 byte hash hex encoded
   * @param {string} destinationAccount - The BCB account receiving the money
   * @param {string} balanceRemaining - Remaining balance after sending this block (Raw)
   * @throws An exception on invalid block hash
   * @throws An exception on invalid destination account
   * @throws An exception on invalid balance
   */
  api.setSendParameters = function (previousBlockHash, destinationAccount, balanceRemaining) {
    if (!/[0-9A-F]{64}/i.test(previousBlockHash)) {
      throw new Error('Invalid previous block hash')
    }

    try {
      var pk = keyFromAccount(destinationAccount)
    } catch (err) {
      throw new Error('Invalid destination account')
    }

    previous = previousBlockHash
    destination = pk
    balance = dec2hex(balanceRemaining, 16)

    type = 'send'
  }

  /**
   * Sets the receive parameters and builds the block
   *
   * @param {string} previousBlockHash - The previous block 32 byte hash hex encoded
   * @param {string} sourceBlockHash - The hash of the send block which is going to be received, 32 byte hex encoded
   * @throws An exception on invalid previousBlockHash
   * @throws An exception on invalid sourceBlockHash
   */
  api.setReceiveParameters = function (previousBlockHash, sourceBlockHash) {
    if (!/[0-9A-F]{64}/i.test(previousBlockHash)) { throw new Error('Invalid previous block hash') }
    if (!/[0-9A-F]{64}/i.test(sourceBlockHash)) { throw new Error('Invalid source block hash') }

    previous = previousBlockHash
    source = sourceBlockHash
    type = 'receive'
  }

  api.setStateParameters = function (newAccount, representativeAccount, curBalance) {
    try {
      account = keyFromAccount(newAccount)
    } catch (err) {
      throw new Error('Invalid BCB account')
    }
    try {
      representative = keyFromAccount(representativeAccount)
    } catch (err) {
      throw new Error('Invalid representative account')
    }
    if (curBalance) {
      balance = dec2hex(curBalance, 16)
    }
  }

  /**
   * Sets the open parameters and builds the block
   *
   * @param {string} sourceBlockHash - The hash of the send block which is going to be received, 32 byte hex encoded
   * @param {string} newAccount - The BCB account which is being created
   * @param {string} representativeAccount - The account to be set as representative, if none, its self assigned
   * @throws An exception on invalid sourceBlockHash
   * @throws An exception on invalid account
   * @throws An exception on invalid representative account
   */
  api.setOpenParameters = function (sourceBlockHash, newAccount, representativeAccount = null) {
    if (!/[0-9A-F]{64}/i.test(sourceBlockHash)) { throw new Error('Invalid source block hash') }

    try {
      account = keyFromAccount(newAccount)
    } catch (err) {
      throw new Error('Invalid BCB account')
    }

    if (representativeAccount) {
      try {
        representative = keyFromAccount(representativeAccount)
      } catch (err) {
        throw new Error('Invalid representative account')
      }
    } else { representative = account }

    source = sourceBlockHash
    if (api.isState()) {
      previous = STATE_BLOCK_ZERO
    }
    type = 'open'
  }

  /**
 * Sets the change parameters and builds the block
 *
 * @param {string} previousBlockHash - The previous block 32 byte hash hex encoded
 * @param {string} representativeAccount - The account to be set as representative
 * @throws An exception on invalid previousBlockHash
 * @throws An exception on invalid representative account
 */
  api.setChangeParameters = function (previousBlockHash, representativeAccount) {
    if (!/[0-9A-F]{64}/i.test(previousBlockHash)) { throw new Error('Invalid previous block hash') }

    try {
      representative = keyFromAccount(representativeAccount)
    } catch (err) {
      throw new Error('Invalid representative account')
    }

    previous = previousBlockHash
    type = 'change'
  }

  /**
   * Sets the block signature
   *
   * @param {string} hex - The hex encoded 64 byte block hash signature
   */
  api.setSignature = function (hex) {
    signature = hex
    signed = true
  }

  /**
   * Sets the block work
   *
   * @param {string} hex - The hex encoded 8 byte block hash PoW
   * @throws An exception if work is not enough
   */
  api.setWork = function (hex) {
    if (!api.checkWork(hex)) { throw new Error('Work not valid for block') }
    work = hex
    worked = true
  }

  /**
   * Sets block amount, to be retrieved from it directly instead of calculating it quering the chain
   *
   * @param {number} am - The amount
   */
  api.setAmount = function (am) {
    blockAmount = bigInt(am)
  }

  /**
   *
   * @returns blockAmount - The amount transferred in raw
   */
  api.getAmount = function () {
    return blockAmount
  }

  /**
   * Sets the account owner of the block
   *
   * @param {string} acc - The BCB account
   */
  api.setAccount = function (acc) {
    blockAccount = acc
    if (type === 'send') { origin = acc }
  }

  /**
   *
   * @returns blockAccount
   */
  api.getAccount = function () {
    return blockAccount
  }

  /**
   * Sets the message of the block
   *
   * @param {string} message - The message with the block
   */
  api.setMessage = function (message) {
    blockMessage = message
  }

  /**
   *
   * @returns blockMessage
   */
  api.getMessage = function () {
    return blockMessage
  }


  /**
   * Sets the account which sent the block
   * @param {string} acc - The BCB account
   */
  api.setOrigin = function (acc) {
    if (type === 'receive' || type === 'open') { origin = acc }
  }

  /**
   * Sets the timestamp of when the block was received from the network.
   * This is an added feature in canoed, the server daemon for.
   * @param {Number} milliseconds - Since 1970, 1 jan
   */
  api.setTimestamp = function (millis) {
    timestamp = millis
  }

  /**
   * Gets the timestamp of when the block was received from the network.
   * This is an added feature in canoed, the server daemon for.
   * @returns {Number} milliseconds - Since 1970, 1 jan
   */
  api.getTimestamp = function () {
    return timestamp
  }

  /**
   *
   * @returns originAccount
   */
  api.getOrigin = function () {
    if (type === 'receive' || type === 'open') { return origin }
    if (type === 'send') { return blockAccount }
    return false
  }

  /**
   *
   * @returns destinationAccount
   */
  api.getDestination = function () {
    if (type === 'send') { return accountFromHexKey(destination) }
    if (type === 'receive' || type === 'open') { return blockAccount }
  }

  /**
   *
   * @param {boolean} hex - To get the hash hex encoded
   * @returns {string} The block hash
   */
  api.getHash = function (hex = false) {
    return hex ? hash : hex_uint8(hash)
  }

  api.getSignature = function () {
    return signature
  }

  api.getType = function () {
    return type
  }

  api.isState = function () {
    return state
  }

  api.getBalance = function (format = 'dec') {
    if (format === 'dec') {
      return bigInt(hex2dec(balance))
    }
    return balance
  }

  /**
   * Returns the previous block hash if its not an open block, the public key if it is
   *
   * @returns {string} The previous block hash
   */
  api.getPrevious = function () {
    if (type === 'open') { return account }
    return previous
  }

  api.getSource = function () {
    return source
  }

  api.getRepresentative = function () {
    // All state blocks have representative
    if (state || type === 'change' || type === 'open') {
      return accountFromHexKey(representative)
    } else {
      return false
    }
  }

  api.ready = function () {
    return signed && worked
  }

  api.setImmutable = function (bool) {
    immutable = bool
  }

  api.isImmutable = function () {
    return immutable
  }

  /**
   * Changes the previous block hash and rebuilds the block
   *
   * @param {string} newPrevious - The previous block hash hex encoded
   * @throws An exception if its an open block
   * @throws An exception if block is not built
   */
  api.changePrevious = function (newPrevious) {
    switch (type) {
      case 'open':
        throw new Error('Open has no previous block')
      case 'receive':
        api.setReceiveParameters(newPrevious, source)
        api.build()
        break
      case 'send':
        api.setSendParameters(newPrevious, destination, stringFromHex(balance).replace(RAI_TO_RAW, ''))
        api.build()
        break
      case 'change':
        api.setChangeParameters(newPrevious, representative)
        api.build()
        break
      default:
        throw new Error('Invalid block type')
    }
  }

  /**
   *
   * @returns {string} The block JSON encoded to be broadcasted with RPC
   */
  api.getJSONBlock = function (pretty = false) {
    if (!signed) { throw new Error('Block lacks signature') }
    var obj = {}
    // For state blocks we do things differently
    if (state) {
      obj.type = 'state'
      if (type === 'open') {
        obj.previous = STATE_BLOCK_ZERO
      } else {
        obj.previous = previous
      }
      obj.account = accountFromHexKey(account)
      obj.representative = accountFromHexKey(representative || account)
      // State blocks wants balance as decimal string in RPC
      obj.balance = hex2dec(balance)

      // Only the link field is different
      switch (type) {
        case 'send':
          obj.link = destination
          break
        case 'receive':
          obj.link = source
          break
        case 'open':
          obj.link = source
          break
        case 'change':
          obj.link = STATE_BLOCK_ZERO
          break
        default:
          throw new Error('Invalid block type')
      }
    } else {
      obj.type = type
      switch (type) {
        case 'send':
          obj.previous = previous
          obj.destination = accountFromHexKey(destination)
          obj.balance = balance
          break
        case 'receive':
          obj.previous = previous
          obj.source = source
          break
        case 'open':
          obj.source = source
          obj.representative = accountFromHexKey(representative || account)
          obj.account = accountFromHexKey(account)
          break
        case 'change':
          obj.previous = previous
          obj.representative = accountFromHexKey(representative)
          break
        default:
          throw new Error('Invalid block type')
      }
    }

    obj.work = work
    obj.signature = signature

    if (pretty) { return JSON.stringify(obj, null, 2) }
    return JSON.stringify(obj)
  }

  // Used only for serializing to storage
  api.getEntireJSON = function () {
    var obj = JSON.parse(api.getJSONBlock())
    var extras = {}

    extras.blockAccount = blockAccount
    if (blockAmount) { extras.blockAmount = blockAmount.toString() } else { extras.blockAmount = 0 }
    extras.origin = origin
    extras.timestamp = timestamp
    extras.blockMessage = blockMessage
    obj.extras = extras
    obj.state = state
    obj.send = send
    return JSON.stringify(obj)
  }

  api.buildFromJSON = function (json, prev) {
    var obj
    var prevObj
    if (typeof json !== 'object') {
      obj = JSON.parse(json)
    } else {
      obj = json
    }
    if (typeof prev !== 'object' && typeof prev !== 'undefined') {
      prevObj = JSON.parse(prev)
    } else {
      prevObj = prev
    }
    state = obj.state || false // Is this a state block or not?
    type = obj.type

    if (state) {
      send = false
      if (prevObj) {
        if (prevObj.type !== 'state' && typeof prevObj.balance !== 'undefined') {
          prevObj.balance = hex2dec(prevObj.balance)
        }
        if (typeof prevObj.balance !== 'undefined') {
          send = bigInt(prevObj.balance).compare(bigInt(obj.balance)) > 0
        }
      }
      // These 4 we know where to put
      previous = obj.previous // 0 for the first block
      balance = dec2hex(obj.balance, 16)
      account = keyFromAccount(obj.account)
      representative = keyFromAccount(obj.representative)
      // Special handling of link field depending on send
      if (send) {
        type = 'send'
        destination = obj.link
      } else {
        if (obj.link === STATE_BLOCK_ZERO) {
          type = 'change'
        } else {
          if (previous === STATE_BLOCK_ZERO) {
            type = 'open'
            source = obj.link
          } else {
            type = 'receive'
            source = obj.link
          }
        }
      }
    } else {
      switch (type) {
        case 'send':
          previous = obj.previous
          destination = keyFromAccount(obj.destination)
          balance = obj.balance
          break
        case 'receive':
          previous = obj.previous
          source = obj.source
          break
        case 'open':
          source = obj.source
          representative = keyFromAccount(obj.representative)
          account = keyFromAccount(obj.account)
          break
        case 'change':
          previous = obj.previous
          representative = keyFromAccount(obj.representative)
          break
        default:
          throw new Error('Invalid block type')
      }
    }

    signature = obj.signature
    work = obj.work

    if (work) { worked = true }
    if (signature) { signed = true }

    if (obj.extras !== undefined) {
      api.setAccount(obj.extras.blockAccount)
      api.setAmount(obj.extras.blockAmount ? obj.extras.blockAmount : 0)
      api.setOrigin(obj.extras.origin)
      api.setTimestamp(obj.extras.timestamp)
      api.setMessage(obj.extras.message)
      // too big, glitch from the units change a couple of commits ago :P
      if (api.getAmount().greater('1000000000000000000000000000000000000000000000000')) {
        api.setAmount(api.getAmount().over('1000000000000000000000000'))
      }
    }

    api.build()
  }

  api.checkWork = function (work, blockHash = false) {
    if (blockHash === false) {
      blockHash = api.getPrevious()
    }
    var t = hex_uint8(MAIN_NET_WORK_THRESHOLD)
    var context = blake2bInit(8, null)
    blake2bUpdate(context, hex_uint8(work).reverse())
    blake2bUpdate(context, hex_uint8(blockHash))
    var threshold = blake2bFinal(context).reverse()
    if (threshold[0] === t[0]) {
      if (threshold[1] === t[1]) {
        if (threshold[2] === t[2]) {
          if (threshold[3] >= t[3]) { return true }
        }
      }
    }
    return false
  }

  return api
}
