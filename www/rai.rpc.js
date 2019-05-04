/*
* RaiBlocks JavaScript RPC requests and basic functions
* https://github.com/SergiySW/RaiBlocksJS
*
* Released under the BSD 3-Clause License
*
*
* RPC commands full list
* https://github.com/clemahieu/raiblocks/wiki/RPC-protocol
*
*
* set 'request' as string. Samples
*	JSON.stringify({"action":"block_count"})
*	'{"action":"block_count"}'
*
* set 'url_base' as string. Mask protocol://host:port. Default value is http://localhost:7076. Samples
*	http://localhost:7076
*	https://canoeallet.info:7077
*
* set 'async' as boolean. Default value is false
* Note: Now only sync requests are available. Async for future developments
*
* Request sample
*	var rai = new Rai();
*	var block_count = rai.rpc(JSON.stringify({"action":"block_count"}), 'http://localhost:7076', false);
*
*/

var XRB = XRB || {}

function Rai (url_base) {
  this.rpc = function (request, async_callback) {
    try {
      // Asynchronous
      if (typeof async_callback === 'function') {
        let xhr = new XMLHttpRequest()
        xhr.onload = function (e) {
          if (xhr.readyState === 4 && xhr.status === 200) {
            let json = JSON.parse(xhr.responseText)
            async_callback(json)
          }	else {
            console.error('XHR Failure')
          }
        }

        xhr.onerror = function (e) {
          console.error(xhr.statusText)
        }

        xhr.open('POST', url_base, true)
        xhr.send(request)
      }

      // Synchronous
      else {
        let xhr
        xhr = new XMLHttpRequest()
        xhr.open('POST', url_base, false)
        xhr.send(request)

        if (xhr.readyState === 4 && xhr.status === 200) {
          let json = JSON.parse(xhr.responseText)
          return json
        } else {
          console.error('XHR Failure')
        }
      }
    } catch (ex) {
      console.error(ex.message)
    }
  }

  this.unit = function (input, input_unit, output_unit) {
    return input // Disabled due to pruning of BigNumber: XRB.unit(input, input_unit, output_unit)
  }

  // Object output
  this.account_balance = function (account) {
    return this.rpc(JSON.stringify({'action': 'account_balance', 'account': account}))
  }

  // String output
  this.account_block_count = function (account) {
    return this.rpc(JSON.stringify({'action': 'account_block_count', 'account': account}))
  }

  this.create_server_account = function (id, token, tokenPass, name, version, meta) {
    return this.rpc(JSON.stringify(
      {'action': 'create_server_account',
        'wallet': id,
        'token': token,
        'tokenPass': tokenPass,
        'name': name,
        'version': version,
        'meta': JSON.stringify(meta)
      }))
  }

  this.account_create = function (wallet, work = true) {
    return this.rpc(JSON.stringify({'action': 'account_create', 'wallet': wallet, 'work': work}))
  }

  this.account_info = function (account, unit = 'raw', representative = false, weight = false, pending = false) {
    var account_info = this.rpc(JSON.stringify({'action': 'account_info', 'account': account, 'representative': representative, 'weight': weight, 'pending': pending}))
    if (unit != 'raw') {
      account_info.balance = this.unit(account_info.balance, 'raw', unit)
      if (weight)		account_info.weight = this.unit(account_info.weight, 'raw', unit)
      if (pending)		account_info.pending = this.unit(account_info.pending, 'raw', unit)
    }
    return account_info
  }

  this.account_history = function (account, count = '-1', raw = 'true') {
    var account_history = this.rpc(JSON.stringify({'action': 'account_history', 'account': account, 'count': count, 'raw': raw}))
    return account_history.history
  }

  this.account_get = function (key) {
    return this.rpc(JSON.stringify({'action': 'account_get', 'key': key}))
  }

  this.account_key = function (account) {
    var account_key = this.rpc(JSON.stringify({'action': 'account_key', 'account': account}))
    return account_key.key
  }

  this.account_list = function (wallet) {
    return this.rpc(JSON.stringify({'action': 'account_list', 'wallet': wallet}))
  }
  this.account_list_async = function (wallet, cb) {
    this.rpc(JSON.stringify({'action': 'account_list', 'wallet': wallet}), function (account_list) {
      cb(account_list)
    })
  }

  // accounts is array
  this.account_move = function (wallet, source, accounts) {
    var account_move = this.rpc(JSON.stringify({'action': 'account_move', 'wallet': wallet, 'source': source, 'accounts': accounts}))
    return account_move.moved
  }

  this.account_remove = function (wallet, account) {
    var account_remove = this.rpc(JSON.stringify({'action': 'account_remove', 'wallet': wallet, 'account': account}))
    return account_remove.removed
  }

  this.account_representative = function (account) {
    var account_representative = this.rpc(JSON.stringify({'action': 'account_representative', 'account': account}))
    return account_representative.representative
  }

  this.account_representative_set = function (wallet, account, representative, work = '0000000000000000') {
    var account_representative_set = this.rpc(JSON.stringify({'action': 'account_representative_set', 'wallet': wallet, 'account': account, 'representative': representative, 'work': work}))
    return account_representative_set.block
  }

  // String output
  this.account_weight = function (account, unit = 'raw') {
    var rpc_account_weight = this.rpc(JSON.stringify({'action': 'account_weight', 'account': account}))
    var account_weight = this.unit(rpc_account_weight.weight, 'raw', unit)
    return account_weight
  }

  // Array input
  this.accounts_balances = function (accounts) {
    return this.rpc(JSON.stringify({'action': 'accounts_balances', 'accounts': accounts}))
  }
  this.accounts_balances_async = function (accounts, cb) {
    this.rpc(JSON.stringify({'action': 'accounts_balances', 'accounts': accounts}), function (accounts_balances) {
      cb(accounts_balances)
    })
  }

  this.accounts_create = function (wallet, count = 1, work = true) {
    var accounts_create = this.rpc(JSON.stringify({'action': 'accounts_create', 'wallet': wallet, 'count': count, 'work': work}))
    return accounts_create.accounts
  }

  // Array input
  this.accounts_frontiers = function (accounts) {
    var accounts_frontiers = this.rpc(JSON.stringify({'action': 'accounts_frontiers', 'accounts': accounts}))
    return accounts_frontiers.frontiers
  }

  // Array input
  this.accounts_pending = function (accounts, count = '4096', threshold = 0, unit = 'raw', source = false) {
    if (threshold != 0)	threshold = this.unit(threshold, unit, 'raw')
    var accounts_pending = this.rpc(JSON.stringify({'action': 'accounts_pending', 'accounts': accounts, 'count': count, 'threshold': threshold, 'source': source}))
    if (source) {
      for (let account in accounts_pending.blocks) {
        for (let hash in accounts_pending.blocks[account]) {
          accounts_pending.blocks[account][hash].amount = this.unit(accounts_pending.blocks[account][hash].amount, 'raw', unit)
        }
      }
    }	else if (threshold != 0) {
      for (let account in accounts_pending.blocks) {
        for (let hash in accounts_pending.blocks[account]) {
          accounts_pending.blocks[account][hash] = this.unit(accounts_pending.blocks[account][hash], 'raw', unit)
        }
      }
    }
    return accounts_pending.blocks
  }

  // String output
  this.available_supply = function (unit = 'raw') {
    var rpc_available_supply = this.rpc(JSON.stringify({'action': 'available_supply'}))
    var available_supply = this.unit(rpc_available_supply.available, 'raw', unit)
    return available_supply
  }

  this.block = function (hash) {
    var rpc_block = this.rpc(JSON.stringify({'action': 'block', 'hash': hash}))
    var block = JSON.parse(rpc_block.contents)
    return block
  }

  // Array input
  this.blocks = function (hashes) {
    var rpc_blocks = this.rpc(JSON.stringify({'action': 'blocks', 'hashes': hashes}))
    var blocks = rpc_blocks.blocks
    for (let key in blocks) {
      blocks[key] = JSON.parse(blocks[key])
    }
    return blocks
  }

  // Array input
  this.blocks_info = function (hashes, unit = 'raw', pending = false, source = false) {
    var rpc_blocks_info = this.rpc(JSON.stringify({'action': 'blocks_info', 'hashes': hashes, 'pending': pending, 'source': source}))
    var blocks = rpc_blocks_info.blocks
    for (let key in blocks) {
      blocks[key].contents = JSON.parse(blocks[key].contents)
      if (unit != 'raw')	blocks[key].amount = this.unit(blocks[key].amount, 'raw', unit)
    }
    return blocks
  }

  this.block_account = function (hash) {
    var block_account = this.rpc(JSON.stringify({'action': 'block_account', 'hash': hash}))
    return block_account.account
  }

  // Object output
  this.block_count = function () {
    var block_count = this.rpc(JSON.stringify({'action': 'block_count'}))
    return block_count
  }

  // Object output
  this.block_count_type = function () {
    var block_count_type = this.rpc(JSON.stringify({'action': 'block_count_type'}))
    return block_count_type
  }

  // Object input, object output
  /*	Sample block creation:
	var block_data = {};
	block_data.type = "open";
	block_data.key = "0000000000000000000000000000000000000000000000000000000000000001",
	block_data.account = xrb_3kdbxitaj7f6mrir6miiwtw4muhcc58e6tn5st6rfaxsdnb7gr4roudwn951";
	block_data.representative = "xrb_1hza3f7wiiqa7ig3jczyxj5yo86yegcmqk3criaz838j91sxcckpfhbhhra1";
	block_data.source = "19D3D919475DEED4696B5D13018151D1AF88B2BD3BCFF048B45031C1F36D1858";
	var block = rpc.block_create(block_data);		*/
  this.block_create = function (block_data) {
    block_data.action = 'block_create'
    var block_create = this.rpc(JSON.stringify(block_data))
    var block = JSON.parse(block_create.block)
    return block
  }

  // Empty output
  this.bootstrap = function (address = '::ffff:138.201.94.249', port = '7075') {
    var bootstrap = this.rpc(JSON.stringify({'action': 'bootstrap', 'address': address, 'port': port}))
    return bootstrap.success
  }

  // Empty output
  this.bootstrap_any = function () {
    var bootstrap_any = this.rpc(JSON.stringify({'action': 'bootstrap_any'}))
    return bootstrap_any.success
  }

  this.chain = function (block, count = '4096') {
    var chain = this.rpc(JSON.stringify({'action': 'chain', 'block': block, 'count': count}))
    return chain.blocks
  }

  this.delegators = function (account, unit = 'raw') {
    var rpc_delegators = this.rpc(JSON.stringify({'action': 'delegators', 'account': account}))
    var delegators = rpc_delegators.delegators
    if (unit != 'raw')	for (let delegator in delegators)	delegators[delegator] = this.unit(delegators[delegator], 'raw', unit)
    return delegators
  }

  // String output
  this.delegators_count = function (account) {
    var delegators_count = this.rpc(JSON.stringify({'action': 'delegators_count', 'account': account}))
    return delegators_count.count
  }

  // Object output
  this.deterministic_key = function (seed, index = 0) {
    var deterministic_key = this.rpc(JSON.stringify({'action': 'deterministic_key', 'seed': seed, 'index': index}))
    return deterministic_key
  }

  this.frontiers = function (account = 'nano_1111111111111111111111111111111111111111111111111117353trpda', count = '1048576') {
    var rpc_frontiers = this.rpc(JSON.stringify({'action': 'frontiers', 'account': account, 'count': count}))
    return rpc_frontiers.frontiers
  }

  // String output
  this.frontier_count = function () {
    var frontier_count = this.rpc(JSON.stringify({'action': 'frontier_count'}))
    return frontier_count.count
  }

  this.history = function (hash, count = '4096') {
    var rpc_history = this.rpc(JSON.stringify({'action': 'history', 'hash': hash, 'count': count}))
    return rpc_history.history
  }

  // Use this.unit instead of this function
  // String input and output
  this.mrai_from_raw = function (amount) {
    var mrai_from_raw = this.rpc(JSON.stringify({'action': 'mrai_from_raw', 'amount': amount}))
    return mrai_from_raw.amount
  }

  // Use this.unit instead of this function
  // String input and output
  this.mrai_to_raw = function (amount) {
    var mrai_to_raw = this.rpc(JSON.stringify({'action': 'mrai_to_raw', 'amount': amount}))
    return mrai_to_raw.amount
  }

  // Use this.unit instead of this function
  // String input and output
  this.krai_from_raw = function (amount) {
    var krai_from_raw = this.rpc(JSON.stringify({'action': 'krai_from_raw', 'amount': amount}))
    return krai_from_raw.amount
  }

  // Use this.unit instead of this function
  // String input and output
  this.krai_to_raw = function (amount) {
    var krai_to_raw = this.rpc(JSON.stringify({'action': 'krai_to_raw', 'amount': amount}))
    return krai_to_raw.amount
  }

  // Use this.unit instead of this function
  // String input and output
  this.rai_from_raw = function (amount) {
    var rai_from_raw = this.rpc(JSON.stringify({'action': 'rai_from_raw', 'amount': amount}))
    return rai_from_raw.amount
  }

  // Use this.unit instead of this function
  // String input and output
  this.rai_to_raw = function (amount) {
    var rai_to_raw = this.rpc(JSON.stringify({'action': 'rai_to_raw', 'amount': amount}))
    return rai_to_raw.amount
  }

  this.keepalive = function (address = '::ffff:192.168.1.1', port = '7075') {
    var keepalive = this.rpc(JSON.stringify({'action': 'keepalive', 'address': address, 'port': port}))
    return keepalive
  }

  // Object output
  this.key_create = function () {
    var key_create = this.rpc(JSON.stringify({'action': 'key_create'}))
    return key_create
  }

  // Object output
  this.key_expand = function (key) {
    var key_expand = this.rpc(JSON.stringify({'action': 'key_expand', 'key': key}))
    return key_expand
  }

  this.ledger = function (account = 'nano_1111111111111111111111111111111111111111111111111117353trpda', count = '1048576', representative = false, weight = false, pending = false, sorting = false) {
    var ledger = this.rpc(JSON.stringify({'action': 'ledger', 'account': account, 'count': count, 'representative': representative, 'weight': weight, 'pending': pending, 'sorting': sorting}))
    return ledger.accounts
  }

  this.password_change = function (wallet, password) {
    var password_change = this.rpc(JSON.stringify({'action': 'password_change', 'wallet': wallet, 'password': password}))
    return password_change.changed
  }

  this.password_enter = function (wallet, password) {
    var rpc_password_enter
    if (typeof password === 'undefined') rpc_password_enter = this.rpc(JSON.stringify({'action': 'password_enter', 'wallet': wallet, 'password': ''}))
    else password_enter = this.rpc(JSON.stringify({'action': 'password_enter', 'wallet': wallet, 'password': password}))
    return password_enter.valid
  }

  this.password_valid = function (wallet) {
    var password_valid = this.rpc(JSON.stringify({'action': 'password_valid', 'wallet': wallet}))
    return password_valid.valid
  }

  this.payment_begin = function (wallet) {
    var payment_begin = this.rpc(JSON.stringify({'action': 'payment_begin', 'wallet': wallet}))
    return payment_begin.account
  }

  this.payment_init = function (wallet) {
    var payment_init = this.rpc(JSON.stringify({'action': 'payment_init', 'wallet': wallet}))
    return payment_init.status
  }

  this.payment_end = function (account, wallet) {
    var payment_end = this.rpc(JSON.stringify({'action': 'payment_end', 'account': account, 'wallet': wallet}))
    return payment_end
  }

  // String input
  this.payment_wait = function (account, amount, timeout) {
    var payment_wait = this.rpc(JSON.stringify({'action': 'payment_wait', 'account': account, 'amount': amount, 'timeout': timeout}))
    return payment_wait.status
  }

  // block as Object
  this.process = function (block) {
    var process = this.rpc(JSON.stringify({'action': 'process', 'block': block}))
    return process.hash
  }

  // Added to get errors back
  this.process_block = function (block) {
    return this.rpc(JSON.stringify({'action': 'process', 'block': block}))
  }

  this.peers = function () {
    var rpc_peers = this.rpc(JSON.stringify({'action': 'peers'}))
    return rpc_peers.peers
  }

  this.pending = function (account, count = '4096', threshold = 0, unit = 'raw', source = false) {
    if (threshold != 0)	threshold = this.unit(threshold, unit, 'raw')
    var pending = this.rpc(JSON.stringify({'action': 'pending', 'account': account, 'count': count, 'threshold': threshold, 'source': source}))
    if (source) {
      for (let hash in pending.blocks) {
        pending.blocks[hash].amount = this.unit(pending.blocks[hash].amount, 'raw', unit)
      }
    }	else if (threshold != 0) {
      for (let hash in pending.blocks) {
        pending.blocks[hash] = this.unit(pending.blocks[hash], 'raw', unit)
      }
    }
    return pending.blocks
  }

  this.pending_exists = function (hash) {
    var pending_exists = this.rpc(JSON.stringify({'action': 'pending_exists', 'hash': hash}))
    return pending_exists.exists
  }

  this.receive = function (wallet, account, block, work = '0000000000000000') {
    var receive = this.rpc(JSON.stringify({'action': 'receive', 'wallet': wallet, 'account': account, 'block': block, 'work': work}))
    return receive.block
  }

  this.receive_minimum = function (unit = 'raw') {
    var receive_minimum = this.rpc(JSON.stringify({'action': 'receive_minimum'}))
    var amount = this.unit(receive_minimum.amount, 'raw', unit)
    return amount
  }

  this.receive_minimum_set = function (amount, unit = 'raw') {
    var raw_amount = this.unit(amount, unit, 'raw')
    var receive_minimum_set = this.rpc(JSON.stringify({'action': 'receive_minimum_set', 'amount': raw_amount}))
    return receive_minimum_set.success
  }

  this.representatives = function (unit = 'raw', count = '1048576', sorting = false) {
    var rpc_representatives = this.rpc(JSON.stringify({'action': 'representatives', 'count': count, 'sorting': sorting}))
    var representatives = rpc_representatives.representatives
    if (unit != 'raw') {
      for (let represetative in representatives)	representatives[represetative] = this.unit(representatives[represetative], 'raw', unit)
    }
    return representatives
  }

  this.republish = function (hash, count = 1024, sources = 2) {
    var republish = this.rpc(JSON.stringify({'action': 'republish', 'hash': hash, 'count': count, 'sources': sources}))
    return republish.blocks
  }

  this.search_pending = function (wallet) {
    var search_pending = this.rpc(JSON.stringify({'action': 'search_pending', 'wallet': wallet}))
    return search_pending.started
  }

  this.search_pending_all = function () {
    var search_pending_all = this.rpc(JSON.stringify({'action': 'search_pending_all'}))
    return search_pending_all.success
  }

  this.send = function (wallet, source, destination, amount, unit = 'raw', work = '0000000000000000') {
    var raw_amount = this.unit(amount, unit, 'raw')
    var send = this.rpc(JSON.stringify({'action': 'send', 'wallet': wallet, 'source': source, 'destination': destination, 'amount': raw_amount, 'work': work}))
    return send.block
  }

  this.stop = function () {
    var stop = this.rpc(JSON.stringify({'action': 'stop'}))
    return stop.success
  }

  this.successors = function (block, count = '4096') {
    var successors = this.rpc(JSON.stringify({'action': 'successors', 'block': block, 'count': count}))
    return successors.blocks
  }

  this.unchecked = function (count = '4096') {
    var unchecked = this.rpc(JSON.stringify({'action': 'unchecked', 'count': count}))
    var blocks = unchecked.blocks
    for (let key in blocks) {
      blocks[key] = JSON.parse(blocks[key])
    }
    return blocks
  }

  // Empty output
  this.unchecked_clear = function () {
    var unchecked_clear = this.rpc(JSON.stringify({'action': 'unchecked_clear'}))
    return unchecked_clear.success
  }

  this.unchecked_get = function (hash) {
    var unchecked_get = this.rpc(JSON.stringify({'action': 'unchecked_get', 'hash': hash}))
    var block = JSON.parse(unchecked_get.contents)
    return block
  }

  this.unchecked_keys = function (key = '0000000000000000000000000000000000000000000000000000000000000000', count = '4096') {
    var unchecked_keys = this.rpc(JSON.stringify({'action': 'unchecked_keys', 'key': key, 'count': count}))
    var unchecked = unchecked_keys.unchecked
    for (let uncheckedKey in unchecked) {
      unchecked[uncheckedKey].contents = JSON.parse(unchecked[uncheckedKey].contents)
    }
    return unchecked
  }

  this.validate_account_number = function (account) {
    var validate_account_number = this.rpc(JSON.stringify({'action': 'validate_account_number', 'account': account}))
    return validate_account_number.valid
  }

  this.version = function () {
    var version = this.rpc(JSON.stringify({'action': 'version'}))
    return version
  }

  this.wallet_add = function (wallet, key, work = true) {
    var wallet_add = this.rpc(JSON.stringify({'action': 'wallet_add', 'wallet': wallet, 'key': key, 'work': work}))
    return wallet_add.account
  }

  // Object output
  this.wallet_balance_total = function (wallet, unit = 'raw') {
    var rpc_wallet_balance = this.rpc(JSON.stringify({'action': 'wallet_balance_total', 'wallet': wallet}))
    var wallet_balance_total = { balance: this.unit(rpc_wallet_balance.balance, 'raw', unit), pending: this.unit(rpc_wallet_balance.pending, 'raw', unit) }
    return wallet_balance_total
  }

  this.wallet_balances = function (wallet, unit = 'raw', threshold = 0) {
    if (threshold != 0)	threshold = this.unit(threshold, unit, 'raw')
    var wallet_balances = this.rpc(JSON.stringify({'action': 'wallet_balances', 'wallet': wallet, 'threshold': threshold}))
    for (let account in wallet_balances.balances) {
      wallet_balances.balances[account].balance = this.unit(wallet_balances.balances[account].balance, 'raw', unit)
      wallet_balances.balances[account].pending = this.unit(wallet_balances.balances[account].pending, 'raw', unit)
    }
    return wallet_balances.balances
  }

  // Empty output
  this.wallet_change_seed = function (wallet, seed) {
    var wallet_change_seed = this.rpc(JSON.stringify({'action': 'wallet_change_seed', 'wallet': wallet, 'seed': seed}))
    return wallet_change_seed.success
  }

  this.wallet_contains = function (wallet, account) {
    var wallet_contains = this.rpc(JSON.stringify({'action': 'wallet_contains', 'wallet': wallet, 'account': account}))
    return wallet_contains.exists
  }

  this.wallet_create = function () {
    var wallet_create = this.rpc(JSON.stringify({'action': 'wallet_create'}))
    return wallet_create.wallet
  }

  this.wallet_destroy = function (wallet) {
    var wallet_destroy = this.rpc(JSON.stringify({'action': 'wallet_destroy', 'wallet': wallet}))
    return wallet_destroy
  }

  // Return as array or as JSON/Object?
  this.wallet_export = function (wallet) {
    var wallet_export = this.rpc(JSON.stringify({'action': 'wallet_export', 'wallet': wallet}))
    return wallet_export.json
  }

  this.wallet_frontiers = function (wallet) {
    var wallet_frontiers = this.rpc(JSON.stringify({'action': 'wallet_frontiers', 'wallet': wallet}))
    return wallet_frontiers.frontiers
  }

  this.wallet_locked = function (wallet) {
    var wallet_locked = this.rpc(JSON.stringify({'action': 'wallet_locked', 'wallet': wallet}))
    return wallet_locked.locked
  }

  this.wallet_pending = function (wallet, count = '4096', threshold = 0, unit = 'raw', source = false) {
    if (threshold != 0)	threshold = this.unit(threshold, unit, 'raw')
    var wallet_pending = this.rpc(JSON.stringify({'action': 'wallet_pending', 'wallet': wallet, 'count': count, 'threshold': threshold, 'source': source}))
    if (source) {
      for (let account in wallet_pending.blocks) {
        for (let hash in wallet_pending.blocks[account]) {
          wallet_pending.blocks[account][hash].amount = this.unit(wallet_pending.blocks[account][hash].amount, 'raw', unit)
        }
      }
    }	else if (threshold != 0) {
      for (let account in wallet_pending.blocks) {
        for (let hash in wallet_pending.blocks[account]) {
          wallet_pending.blocks[account][hash] = this.unit(wallet_pending.blocks[account][hash], 'raw', unit)
        }
      }
    }
    return wallet_pending.blocks
  }

  this.wallet_representative = function (wallet) {
    var wallet_representative = this.rpc(JSON.stringify({'action': 'wallet_representative', 'wallet': wallet}))
    return wallet_representative.representative
  }

  this.wallet_representative_set = function (wallet, representative) {
    var wallet_representative_set = this.rpc(JSON.stringify({'action': 'wallet_representative_set', 'wallet': wallet, 'representative': representative}))
    return wallet_representative_set.set
  }

  this.wallet_republish = function (wallet, count = 2) {
    var wallet_republish = this.rpc(JSON.stringify({'action': 'wallet_republish', 'wallet': wallet, 'count': count}))
    return wallet_republish.blocks
  }

  this.wallet_unlock = function (wallet, password) {
    var wallet_unlock = this.password_enter(wallet, password)
    return wallet_unlock
  }

  this.wallet_work_get = function (wallet) {
    var wallet_work = this.rpc(JSON.stringify({'action': 'wallet_work_get', 'wallet': wallet}))
    return wallet_work.works
  }

  this.work_cancel = function (hash) {
    var work_cancel = this.rpc(JSON.stringify({'action': 'work_cancel', 'hash': hash}))
    return work_cancel
  }

  this.work_generate = function (hash) {
    var work_generate = this.rpc(JSON.stringify({'action': 'work_generate', 'hash': hash}))
    return work_generate.work
  }

  this.work_generate_async = function (hash, cb) {
    this.rpc(JSON.stringify({'action': 'work_generate', 'hash': hash}), function (result) {
      cb(result)
    })
  }

  this.work_get = function (wallet, account) {
    var work_get = this.rpc(JSON.stringify({'action': 'work_get', 'wallet': wallet, 'account': account}))
    return work_get.work
  }

  this.work_set = function (wallet, account, work) {
    var work_set = this.rpc(JSON.stringify({'action': 'work_set', 'wallet': wallet, 'account': account, 'work': work}))
    return work_set.success
  }

  this.work_validate = function (work, hash) {
    var work_validate = this.rpc(JSON.stringify({'action': 'work_validate', 'work': work, 'hash': hash}))
    return work_validate.valid
  }

  // Empty output
  this.work_peer_add = function (address = '::1', port = '7076') {
    var work_peer_add = this.rpc(JSON.stringify({'action': 'work_peer_add', 'address': address, 'port': port}))
    return work_peer_add.success
  }

  this.work_peers = function () {
    var rpc_work_peers = this.rpc(JSON.stringify({'action': 'work_peers'}))
    return rpc_work_peers.work_peers
  }

  // Empty output
  this.work_peers_clear = function () {
    var work_peers_clear = this.rpc(JSON.stringify({'action': 'work_peers_clear'}))
    return work_peers_clear.success
  }
};
