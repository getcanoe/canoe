'use strict'

angular.module('canoeApp.controllers').controller('confirmController', function ($rootScope, $scope, $interval, $filter, $timeout, $ionicScrollDelegate, gettextCatalog, walletService, platformInfo, lodash, configService, $stateParams, $window, $state, $log, profileService, txFormatService, ongoingProcess, $ionicModal, popupService, $ionicHistory, $ionicConfig, payproService, feeService, bwcError, txConfirmNotification, externalLinkService) {
  var countDown = null
  var CONFIRM_LIMIT_USD = 20

  var tx = {}

  // Config Related values
  var config = configService.getSync()
  var walletConfig = config.wallet
  // var unitToRaw = walletConfig.settings.unitToRaw
  // var unitDecimals = walletConfig.settings.unitDecimals
  // var rawToUnit = 1 / unitToRaw
  // var configFeeLevel = walletConfig.settings.feeLevel ? walletConfig.settings.feeLevel : 'normal'

  // Platform info
  var isChromeApp = platformInfo.isChromeApp
  var isCordova = platformInfo.isCordova
  var isWindowsPhoneApp = platformInfo.isCordova && platformInfo.isWP

  function refresh () {
    $timeout(function () {
      $scope.$apply()
    }, 10)
  }

  $scope.showAccountSelector = function () {
    $scope.accountSelector = true
    refresh()
  }

  $scope.$on('$ionicView.beforeLeave', function (event, data) {
    $ionicConfig.views.swipeBackEnabled(true)
  })

  $scope.$on('$ionicView.enter', function (event, data) {
    $ionicConfig.views.swipeBackEnabled(false)
  })

  function exitWithError (err) {
    $log.info('Error setting wallet selector:' + err)
    popupService.showAlert(gettextCatalog.getString(), err, function () {
      $ionicHistory.nextViewOptions({
        disableAnimate: true,
        historyRoot: true
      })
      $ionicHistory.clearHistory()
      $state.go('tabs.send')
    })
  };

  function setNoWallet (msg, criticalError) {
    $scope.account = null
    $scope.noWalletMessage = msg
    $scope.criticalError = criticalError
    $log.warn('Not ready to make the payment:' + msg)
    $timeout(function () {
      $scope.$apply()
    })
  };

  $scope.$on('$ionicView.beforeEnter', function (event, data) {
    function setAccountSelector (minAmount, cb) {
      // no min amount? (sendMax) => look for no empty wallets
      minAmount = minAmount || 1

      // Make sure we have latest accounts and balances
      profileService.updateAllAccounts(function () {
        $scope.accounts = profileService.getAccounts()

        if (!$scope.accounts || !$scope.accounts.length) {
          setNoWallet(gettextCatalog.getString('No wallets available'), true)
          return cb()
        }

        var filteredAccounts = []
        lodash.each($scope.accounts, function (acc) {
          if (!acc.balance) { $log.debug('No balance available in: ' + acc.name) }
          if (parseInt(acc.balance) >= minAmount) {
            filteredAccounts.push(acc)
          }
        })

        if (lodash.isEmpty(filteredAccounts)) {
          setNoWallet(gettextCatalog.getString('Insufficient funds'), true)
        }

        $scope.accounts = lodash.clone(filteredAccounts)
        return cb()
      })
    }

    // Grab stateParams
    tx = {
      toAmount: data.stateParams.toAmount,
      sendMax: data.stateParams.useSendMax === 'true',
      toAddress: data.stateParams.toAddress,
      description: data.stateParams.description,

      // Vanity tx info (not in the real tx)
      recipientType: data.stateParams.recipientType || null,
      toName: data.stateParams.toName,
      toEmail: data.stateParams.toEmail,
      toColor: data.stateParams.toColor,
      txp: {}
    }

    // Other Scope vars
    $scope.isCordova = isCordova
    $scope.isWindowsPhoneApp = isWindowsPhoneApp
    $scope.showAddress = false

    $scope.accountSelectorTitle = gettextCatalog.getString('Send from')

    setAccountSelector(tx.toAmount, function (err) {
      if (err) {
        return exitWithError('Could not update accounts')
      }
      if ($scope.accounts.length > 1) {
        $scope.showAccountSelector()
      } else if ($scope.accounts.length) {
        setAccount($scope.accounts[0], tx)
      }
    })
  })

  function getTxp (tx, account, dryRun, cb) {
    /*
    if (tx.toAmount > Number.MAX_SAFE_INTEGER) {
      var msg = gettextCatalog.getString('Amount too big')
      $log.warn(msg)
      return setSendError(msg)
    }*/
    var txp = {}
    txp.account = account
    txp.address = tx.toAddress
    txp.amount = tx.toAmount
    txp.message = tx.description
    txp.dryRun = dryRun
    return cb(null, txp)
  }

  function updateTx (tx, account, opts, cb) {
    if (opts.clearCache) {
      tx.txp = {}
    }

    $scope.tx = tx

    function updateAmount () {
      if (!tx.toAmount) return
      // Amount
      tx.amountStr = profileService.formatAmountWithUnit(tx.toAmount) // txFormatService.formatAmountStr(null, tx.toAmount)
      tx.amountValueStr = tx.amountStr.split(' ')[0]
      tx.amountUnitStr = tx.amountStr.split(' ')[1]
      txFormatService.formatAlternativeStr(null, tx.toAmount, function (v) {
        tx.alternativeAmountStr = v
      })
    }

    updateAmount()
    refresh()

    // End of quick refresh, before wallet is selected.
    if (!account) {
      return cb()
    }
  }

  function useSelectedWallet () {
    if (!$scope.useSendMax) {
      showAmount(tx.toAmount)
    }

    $scope.onAccountSelect($scope.account)
  }

  function setButtonText () {
    if (isCordova && !isWindowsPhoneApp) {
      $scope.buttonText = gettextCatalog.getString('Slide to send')
    } else {
      $scope.buttonText = gettextCatalog.getString('Click to send')
    }
  }

  $scope.toggleAddress = function () {
    $scope.showAddress = !$scope.showAddress
  }

  $scope.onAccountSelect = function (account) {
    setAccount(account, tx)
  }

  $scope.showDescriptionPopup = function (tx) {
    var message = gettextCatalog.getString('Add description')
    var opts = {
      defaultText: tx.description
    }

    popupService.showPrompt(null, message, opts, function (res) {
      if (typeof res !== 'undefined') tx.description = res
      $timeout(function () {
        $scope.$apply()
      })
    })
  }

  // Sets a account on the UI, creates a TXPs for that wallet
  function setAccount (account, tx) {
    $scope.account = account

    setButtonText()

    updateTx(tx, account, {
      dryRun: true
    }, function (err) {
      $timeout(function () {
        $ionicScrollDelegate.resize()
        $scope.$apply()
      }, 10)
    })
  };

  var setSendError = function (msg) {
    $scope.sendStatus = ''
    $timeout(function () {
      $scope.$apply()
    })
    popupService.showAlert(gettextCatalog.getString('Error at confirm'), bwcError.msg(msg))
  }

  $scope.openPPModal = function () {
    $ionicModal.fromTemplateUrl('views/modals/paypro.html', {
      scope: $scope
    }).then(function (modal) {
      $scope.payproModal = modal
      $scope.payproModal.show()
    })
  }

  $scope.cancel = function () {
    $scope.payproModal.hide()
  }

  $scope.approve = function (tx, account, onSendStatusChange) {
    if (!tx || !account) return

    /*
    if ($scope.paymentExpired) {
      popupService.showAlert(null, gettextCatalog.getString('This bitcoin payment request has expired.'))
      $scope.sendStatus = ''
      $timeout(function () {
        $scope.$apply()
      })
      return
    } */

    ongoingProcess.set('creatingTx', true, onSendStatusChange)
    getTxp(lodash.clone(tx), account, false, function (err, txp) {
      ongoingProcess.set('creatingTx', false, onSendStatusChange)
      if (err) return

      // confirm txs for more than 20 usd, if not spending/touchid is enabled
      function confirmTx (cb) {
        var amountUsd = parseFloat(txFormatService.formatToUSD(null, txp.amount))
        if (amountUsd <= CONFIRM_LIMIT_USD) { return cb() }

        var message = gettextCatalog.getString('Sending {{amountStr}} from your {{name}} account', {
          amountStr: tx.amountStr,
          name: account.name
        })
        var okText = gettextCatalog.getString('Confirm')
        var cancelText = gettextCatalog.getString('Cancel')
        popupService.showConfirm(null, message, okText, cancelText, function (ok) {
          return cb(!ok)
        })
      }

      function doSend () {
        ongoingProcess.set('sendingTx', true, onSendStatusChange)
        profileService.send(txp, function (err) {
          if (err) return setSendError(err)
          ongoingProcess.set('sendingTx', false, onSendStatusChange)

          // TODO ehum
         /* txConfirmNotification.subscribe(account, {
            txid: txp.txid
          })*/
        })

        /*
        walletService.publishAndSign(wallet, txp, function (err, txp) {
          if (err) return setSendError(err)
          if (config.confirmedTxsNotifications && config.confirmedTxsNotifications.enabled) {
            txConfirmNotification.subscribe(account, {
              txid: txp.txid
            })
          }
        }, onSendStatusChange)*/
      }

      confirmTx(function (nok) {
        if (nok) {
          $scope.sendStatus = ''
          $timeout(function () {
            $scope.$apply()
          })
          return
        }
        doSend()
      })
    })
  }

  function statusChangeHandler (processName, showName, isOn) {
    $log.debug('statusChangeHandler: ', processName, showName, isOn)
    if (
      (
        (processName === 'sendingTx')
      ) && !isOn) {
      $scope.sendStatus = 'success'
      $timeout(function () {
        $scope.$digest()
      }, 100)
    } else if (showName) {
      $scope.sendStatus = showName
    }
  };

  $scope.statusChangeHandler = statusChangeHandler

  $scope.onSuccessConfirm = function () {
    $scope.sendStatus = ''
    $ionicHistory.nextViewOptions({
      disableAnimate: true,
      historyRoot: true
    })
    $state.go('tabs.send').then(function () {
      $ionicHistory.clearHistory()
      $state.transitionTo('tabs.home')
    })
  }
})
