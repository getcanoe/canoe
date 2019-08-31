'use strict'
/* global angular BigNumber */
angular.module('canoeApp.controllers').controller('amountController', function ($scope, $timeout, $ionicScrollDelegate, $ionicHistory, gettextCatalog, platformInfo, lodash, configService, aliasService, $stateParams, $window, $state, $log, profileService, nodeWebkitService, storageService) {
  var _id
  var unitToRaw
  var rawToUnit
  var unitDecimals
  var SMALL_FONT_SIZE_LIMIT = 10
  var LENGTH_EXPRESSION_LIMIT = 19
  var isNW = platformInfo.isNW
  var rawPerNano = BigNumber('1000000000000000000000000000000')

  var unitIndex = 0
  var altUnitIndex = 0
  var availableUnits = []
  var fiatCode

  var fixedUnit

  // Avoid 15 signific digit error
  BigNumber.config({ ERRORS: false })

  $scope.isChromeApp = platformInfo.isChromeApp

  $scope.$on('$ionicView.leave', function () {
    angular.element($window).off('keydown')
  })

  $scope.onAccountSelect = function (acc) {
    if (!acc) {
      $state.go('tabs.create-account')
    } else {
      $scope.acc = acc
      $scope.account = acc
    }
  }

  $scope.showAccountSelector = function () {
    if ($scope.singleAccount) return
    $scope.accountSelectorTitle = gettextCatalog.getString('Select an account')
    $scope.showAccounts = true
  }

  var checkSelectedAccount = function (account, accounts) {
    if (!account) return accounts[0]
    var w = lodash.find(accounts, function (w) {
      return w.id === account.id
    })
    if (!w) return accounts[0]
    return w
  }

  $scope.$on('$ionicView.beforeEnter', function (event, data) {
    var config = configService.getSync().wallet.settings
    $scope.recipientType = data.stateParams.recipientType || null
    $scope.toAddress = data.stateParams.toAddress
    $scope.toName = data.stateParams.toName
    $scope.toEmail = data.stateParams.toEmail
    $scope.toColor = data.stateParams.toColor
    $scope.toAlias = data.stateParams.toAlias
    $scope.fromAddress = data.stateParams.fromAddress
    aliasService.getAvatar(data.stateParams.toAlias, function (err, avatar) {
      $scope.toAvatar = avatar
      $scope.$apply()
    })
    $scope.accounts = profileService.getAccounts()
    $scope.singleAccount = $scope.accounts.length === 1
    $scope.hasAccounts = !lodash.isEmpty($scope.accounts)
    if ($scope.fromAddress) {
      $scope.acc = {
        id: $scope.fromAddress
      }
    }
    var selectedAccount = checkSelectedAccount($scope.acc, $scope.accounts)
    $scope.onAccountSelect(selectedAccount)
    $scope.accountSelectorTitle = gettextCatalog.getString('Select an account')
    $scope.hasMoreAccounts = $scope.accounts.length > 1
    function setAvailableUnits() {
      availableUnits = []

      availableUnits.push({
        name: 'BCB',
        id: 'bcb',
        shortName: 'BCB'
      })

      unitIndex = 0

      if (data.stateParams.coin) {
        var coins = data.stateParams.coin.split(',')
        var newAvailableUnits = []

        lodash.each(coins, function (c) {
          var coin = lodash.find(availableUnits, {
            id: c
          })
          if (!coin) {
            $log.warn('Could not find desired coin:' + data.stateParams.coin)
          } else {
            newAvailableUnits.push(coin)
          }
        })

        if (newAvailableUnits.length > 0) {
          availableUnits = newAvailableUnits
        }
      }

      //  currency have preference
      var fiatName
      if (data.stateParams.currency) {
        fiatCode = data.stateParams.currency
        altUnitIndex = unitIndex
        unitIndex = availableUnits.length
      } else {
        fiatCode = config.alternativeIsoCode || 'USD'
        fiatName = config.alternanativeName || fiatCode
        altUnitIndex = availableUnits.length
      }

      availableUnits.push({
        name: fiatName || fiatCode,
        // TODO
        id: fiatCode,
        shortName: fiatCode,
        isFiat: true
      })

      storageService.getAmountInputDefaultCurrency(function (err, amountInputDefaultCurrency) {
        config.amountInputDefaultCurrency = amountInputDefaultCurrency ? amountInputDefaultCurrency : 'BCB'
      })
      if (!config.amountInputDefaultCurrency || config.amountInputDefaultCurrency === 'BCB') {
        unitIndex = 0
        altUnitIndex = 1
      } else {
        unitIndex = 1
        altUnitIndex = 0
      }

      if (data.stateParams.fixedUnit) {
        fixedUnit = true
      }
    };

    // Go to...
    _id = data.stateParams.id // Optional (BitPay Card ID or Wallet ID)
    $scope.nextStep = data.stateParams.nextStep

    setAvailableUnits()
    updateUnitUI()

    $scope.showMenu = $ionicHistory.backView() && ($ionicHistory.backView().stateName === 'tabs.send')
    $scope.showSendMax = false

    if (!$scope.nextStep && !data.stateParams.toAddress) {
      $log.error('Bad params at amount')
      throw ('bad params')
    }

    var reNr = /^[1234567890\.]$/
    var reOp = /^[\*\+\-\/]$/

    var disableKeys = angular.element($window).on('keydown', function (e) {
      if (!e.key) return
      if (e.which === 8) { // you can add others here inside brackets.
        e.preventDefault()
        $scope.removeDigit()
      }

      if (e.key.match(reNr)) {
        $scope.pushDigit(e.key)
      } else if (e.key.match(reOp)) {
        $scope.pushOperator(e.key)
      } else if (e.keyCode === 86) {
        if (e.ctrlKey || e.metaKey) processClipboard()
      } else if (e.keyCode === 13) $scope.finish()

      $timeout(function () {
        $scope.$apply()
      })
    })
    $scope.specificAmount = $scope.specificAlternativeAmount = ''
    $scope.isCordova = platformInfo.isCordova
    unitToRaw = BigNumber(config.unitToRaw)
    rawToUnit = 1 / unitToRaw
    unitDecimals = config.unitDecimals

    $scope.resetAmount()

    // in raw always
    if ($stateParams.toAmount) {
      $scope.amount = (($stateParams.toAmount) * rawToUnit).toFixed(unitDecimals)
    }

    processAmount()

    $timeout(function () {
      $ionicScrollDelegate.resize()
    }, 10)
  })

  function paste(value) {
    $scope.amount = value
    processAmount()
    $timeout(function () {
      $scope.$apply()
    })
  };

  function processClipboard() {
    if (!isNW) return
    var value = nodeWebkitService.readFromClipboard()
    if (value && evaluate(value) > 0) paste(evaluate(value))
  };

  $scope.showSendMaxMenu = function () {
    $scope.showSendMax = true
  }

  $scope.sendMax = function () {
    if (availableUnits[unitIndex].isFiat) {
      $scope.changeUnit()
      $scope.sendMax()
    } else {
      $scope.amount = new BigNumber($scope.acc.balance.toString()).dividedBy(rawPerNano).toString()
      processAmount()
    }
    // $scope.showSendMax = false
    // $scope.useSendMax = true
    // $scope.finish()
  }

  $scope.toggleAlternative = function () {
    if ($scope.amount && isExpression($scope.amount)) {
      var amount = evaluate(format($scope.amount))
      $scope.globalResult = '= ' + processResult(amount)
    }
  }

  function updateUnitUI() {
    $scope.unit = availableUnits[unitIndex].shortName
    $scope.alternativeUnit = availableUnits[altUnitIndex].shortName
    processAmount()
    $log.debug('Update unit coin @amount unit:' + $scope.unit + ' alternativeUnit:' + $scope.alternativeUnit)
  };

  $scope.changeUnit = function () {
    if (fixedUnit) return

    var config = configService.getSync().wallet.settings
    unitIndex++
    if (unitIndex >= availableUnits.length) unitIndex = 0

    if (availableUnits[unitIndex].isFiat) {
      config.amountInputDefaultCurrency = availableUnits[1].shortName
      altUnitIndex = 0
    } else {
      config.amountInputDefaultCurrency = 'BCB'
      altUnitIndex = lodash.findIndex(availableUnits, {
        isFiat: true
      })
    }

    storageService.setAmountInputDefaultCurrency(config.amountInputDefaultCurrency, function () { })

    updateUnitUI()
  }

  $scope.changeAlternativeUnit = function () {
    // Do nothing if fiat is not main unit
    if (!availableUnits[unitIndex].isFiat) return

    var nextCoin = lodash.findIndex(availableUnits, function (x) {
      if (x.isFiat) return false
      if (x.id === availableUnits[altUnitIndex].id) return false
      return true
    })

    if (nextCoin >= 0) {
      altUnitIndex = nextCoin
      updateUnitUI()
    }
  }

  function checkFontSize() {
    if ($scope.amount && $scope.amount.length >= SMALL_FONT_SIZE_LIMIT) $scope.smallFont = true
    else $scope.smallFont = false
  };

  $scope.pushDigit = function (digit) {
    if ($scope.amount && $scope.amount.length >= LENGTH_EXPRESSION_LIMIT) return
    if ($scope.amount.indexOf('.') > -1 && digit === '.') return
    if (availableUnits[unitIndex].isFiat && $scope.amount.indexOf('.') > -1 && $scope.amount[$scope.amount.indexOf('.') + 2]) return

    $scope.amount = ($scope.amount + digit).replace('..', '.')
    processAmount()
  }

  $scope.pushOperator = function (operator) {
    if (!$scope.amount || $scope.amount.length == 0) return
    $scope.amount = _pushOperator($scope.amount)

    function _pushOperator(val) {
      if (!isOperator(lodash.last(val))) {
        return val + operator
      } else {
        return val.slice(0, -1) + operator
      }
    };
  }

  function isOperator(val) {
    var regex = /[\/\-\+\x\*]/
    return regex.test(val)
  };

  function isExpression(val) {
    var regex = /^\.?\d+(\.?\d+)?([\/\-\+\*x]\d?\.?\d+)+$/
    return regex.test(val)
  };

  $scope.removeDigit = function () {
    $scope.amount = ($scope.amount).toString().slice(0, -1)
    processAmount()
  }

  $scope.resetAmount = function () {
    $scope.amount = $scope.alternativeAmount = $scope.globalResult = ''
    $scope.allowSend = false
    checkFontSize()
  }

  function processAmount() {
    checkFontSize()
    var formatedValue = format($scope.amount)
    var result = evaluate(formatedValue)
    $scope.allowSend = lodash.isNumber(result) && +result > 0
    if (lodash.isNumber(result)) {
      $scope.globalResult = isExpression($scope.amount) ? '= ' + processResult(result) : ''

      if (availableUnits[unitIndex].isFiat) {
        var a = fromFiat(result)
        if (a) {
          $scope.alternativeAmount = a
        } else {
          if (result) {
            $scope.alternativeAmount = 'N/A'
          } else {
            $scope.alternativeAmount = null
          }
          $scope.allowSend = false
        }
      } else {
        $scope.alternativeAmount = toFiat(result)
      }
    }
  }

  function processResult(val) {
    return profileService.formatAmount(new BigNumber(unitDecimals).times(unitToRaw))
  }

  function fromFiat(val) {
    return profileService.fromFiat(val, fiatCode, availableUnits[altUnitIndex].id) * rawToUnit
  }

  function toFiat(val) {
    return profileService.toFiat(val * unitToRaw, fiatCode, availableUnits[unitIndex].id)
  }

  function evaluate(val) {
    var result
    try {
      result = $scope.$eval(val)
    } catch (e) {
      return 0
    }
    if (!lodash.isFinite(result)) return 0
    return result
  }

  function format(val) {
    if (!val) return
    var result = val.toString()
    if (isOperator(lodash.last(val))) result = result.slice(0, -1)
    return result.replace('x', '*')
  }

  $scope.finish = function () {
    var unit = availableUnits[unitIndex]
    var _amount = evaluate(format($scope.amount))
    var coin = unit.id
    if (unit.isFiat) {
      coin = availableUnits[altUnitIndex].id
    }

    if ($scope.nextStep) {
      $state.transitionTo($scope.nextStep, {
        id: _id,
        amount: $scope.useSendMax ? null : _amount,
        currency: unit.id.toUpperCase(),
        coin: coin,
        useSendMax: $scope.useSendMax
      })
    } else {
      var amount = _amount
      var big
      if (unit.isFiat) {
        big = new BigNumber(fromFiat(amount))
        amount = (big.times(unitToRaw)).toFixed(0)
      } else {
        big = new BigNumber(amount)
        amount = (big.times(unitToRaw)).toFixed(0)
      }
      $state.transitionTo('tabs.send.confirm', {
        recipientType: $scope.recipientType,
        toAmount: amount,
        toAddress: $scope.toAddress,
        fromAddress: $scope.acc.id,
        toName: $scope.toName,
        toEmail: $scope.toEmail,
        toColor: $scope.toColor,
        toAlias: $scope.toAlias,
        useSendMax: $scope.useSendMax
      })
    }
    $scope.useSendMax = null
  }
})
