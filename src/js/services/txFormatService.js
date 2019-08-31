'use strict'

angular.module('canoeApp.services').factory('txFormatService', function ($filter, rateService, configService, lodash) {
  var root = {}

  //root.Utils = bwcService.getUtils()

  root.formatAmount = function (raw, fullPrecision) {
    var config = configService.getDefaults().wallet.settings
    if (config.unitCode === 'raw') return raw

    // TODO : now only works for english, specify opts to change thousand separator and decimal separator
    var opts = {
      fullPrecision: !!fullPrecision
    }
    return this.Utils.formatAmount(raw, config.unitCode, opts)
  }

  root.formatAmountStr = function (coin, raw) {
    if (isNaN(raw)) return
    return root.formatAmount(raw) + (coin ? coin.toUpperCase() : 'BCB')
  }

  root.toFiat = function (coin, raw, code, cb) {
    if (isNaN(raw)) return
    var val = function () {
      var v1 = rateService.toFiat(raw, code, coin)
      if (!v1) return null

      return v1.toFixed(2)
    }

    // Async version
    if (cb) {
      rateService.whenAvailable(function () {
        return cb(val())
      })
    } else {
      if (!rateService.isAvailable()) return null
      return val()
    };
  }

  root.formatToUSD = function (coin, raw, cb) {
    if (isNaN(raw)) return
    var val = function () {
      var v1 = rateService.toFiat(raw, 'USD', coin)
      if (!v1) return null

      return v1.toFixed(2)
    }

    // Async version
    if (cb) {
      rateService.whenAvailable(function () {
        return cb(val())
      })
    } else {
      if (!rateService.isAvailable()) return null
      return val()
    };
  }

  root.formatAlternativeStr = function (coin, raw, cb) {
    if (isNaN(raw)) return
    var config = configService.getSync().wallet.settings

    var val = function () {
      var v1 = parseFloat((rateService.toFiat(raw, config.alternativeIsoCode, coin)).toFixed(2))
      v1 = $filter('formatFiatAmount')(v1)
      if (!v1) return null

      return v1 + ' ' + config.alternativeIsoCode
    }

    // Async version
    if (cb) {
      rateService.whenAvailable(function () {
        return cb(val())
      })
    } else {
      if (!rateService.isAvailable()) return null
      return val()
    };
  }

  root.processTx = function (coin, tx) {
    if (!tx || tx.action == 'invalid')      { return tx}

    // New transaction output format
    if (tx.outputs && tx.outputs.length) {
      var outputsNr = tx.outputs.length

      if (tx.action != 'received') {
        if (outputsNr > 1) {
          tx.recipientCount = outputsNr
          tx.hasMultiplesOutputs = true
        }
        tx.amount = lodash.reduce(tx.outputs, function (total, o) {
          o.amountStr = root.formatAmountStr(coin, o.amount)
          o.alternativeAmountStr = root.formatAlternativeStr(coin, o.amount)
          return total + o.amount
        }, 0)
      }
      tx.toAddress = tx.outputs[0].toAddress
    }

    tx.amountStr = root.formatAmountStr(coin, tx.amount)
    tx.alternativeAmountStr = root.formatAlternativeStr(coin, tx.amount)
    tx.feeStr = root.formatAmountStr(coin, tx.fee || tx.fees)

    if (tx.amountStr) {
      tx.amountValueStr = tx.amountStr.split(' ')[0]
      tx.amountUnitStr = tx.amountStr.split(' ')[1]
    }

    return tx
  }

  root.formatPendingTxps = function (txps) {
    $scope.pendingTxProposalsCountForUs = 0
    var now = Math.floor(Date.now() / 1000)

    /* To test multiple outputs...
    var txp = {
      message: 'test multi-output',
      fee: 1000,
      createdOn: new Date() / 1000,
      outputs: []
    };
    function addOutput(n) {
      txp.outputs.push({
        amount: 600,
        toAddress: '2N8bhEwbKtMvR2jqMRcTCQqzHP6zXGToXcK',
        message: 'output #' + (Number(n) + 1)
      });
    };
    lodash.times(150, addOutput);
    txps.push(txp);
    */

    lodash.each(txps, function (tx) {
      // no future transactions...
      if (tx.createdOn > now)        { tx.createdOn = now}

      tx.account = profileService.getAccount(tx.accountId)
      if (!tx.account) {
        $log.error('no wallet at txp?')
        return
      }

      tx = txFormatService.processTx(tx.account.coin, tx)

      var action = lodash.find(tx.actions, {
        canoeerId: tx.account.canoeerId
      })

      if (!action && tx.status == 'pending') {
        tx.pendingForUs = true
      }

      if (action && action.type == 'accept') {
        tx.statusForUs = 'accepted'
      } else if (action && action.type == 'reject') {
        tx.statusForUs = 'rejected'
      } else {
        tx.statusForUs = 'pending'
      }

      if (!tx.deleteLockTime)        { tx.canBeRemoved = true}
    })

    return txps
  }

  root.parseAmount = function (coin, amount, currency) {
    var config = configService.getSync().wallet.settings
    var satToBtc = 1 / 100000000
    var unitToRaw = config.unitToRaw
    var amountUnitStr
    var amountSat
    var alternativeIsoCode = config.alternativeIsoCode

    // If fiat currency
    if (currency != 'BCH' && currency != 'BTC' && currency != 'raw') {
      amountUnitStr = $filter('formatFiatAmount')(amount) + ' ' + currency
      amountSat = rateService.fromFiat(amount, currency, coin).toFixed(0)
    } else if (currency == 'raw') {
      amountSat = amount
      amountUnitStr = root.formatAmountStr(coin, amountSat)
      // convert sat to BTC or BCH
      amount = (amountSat * satToBtc).toFixed(8)
      currency = (coin).toUpperCase()
    } else {
      amountSat = parseInt((amount * unitToRaw).toFixed(0))
      amountUnitStr = root.formatAmountStr(coin, amountSat)
      // convert unit to BTC or BCH
      amount = (amountSat * satToBtc).toFixed(8)
      currency = (coin).toUpperCase()
    }

    return {
      amount: amount,
      currency: currency,
      alternativeIsoCode: alternativeIsoCode,
      amountSat: amountSat,
      amountUnitStr: 'BCB' // amountUnitStr
    }
  }

  root.rawToUnit = function (amount) {
    var config = configService.getSync().wallet.settings
    var unitToRaw = config.unitToRaw
    var rawToUnit = 1 / unitToRaw
    var unitDecimals = config.unitDecimals
    return parseFloat((amount * rawToUnit).toFixed(unitDecimals))
  }

  return root
})
