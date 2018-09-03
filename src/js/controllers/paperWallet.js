/* global angular */
angular.module('canoeApp.controllers').controller('paperWalletController',
  function ($scope, $timeout, $log, popupService, gettextCatalog, profileService, $state, ongoingProcess, txFormatService, $stateParams) {
    function _scanFunds (cb) {
      // Do it here
    }

    $scope.scanFunds = function () {
      ongoingProcess.set('scanning', true)
      $timeout(function () {
        _scanFunds(function (err, privateKey, balance) {
          ongoingProcess.set('scanning', false)
          if (err) {
            $log.error(err)
            popupService.showAlert(gettextCatalog.getString('Error scanning funds:'), err || err.toString())
            $state.go('tabs.home')
          } else {
            $scope.privateKey = privateKey
            $scope.balanceSat = balance
            if ($scope.balanceSat <= 0) {
              popupService.showAlert(gettextCatalog.getString('Error'), gettextCatalog.getString('Not funds found'))
            }
            $scope.balance = txFormatService.formatAmountStr($scope.account.coin, balance)
          }
          $scope.$apply()
        })
      }, 100)
    }

    function _sweepWallet (cb) {
       
    }

    $scope.sweepWallet = function () {
      ongoingProcess.set('sweepingWallet', true)
      $scope.sending = true

      $timeout(function () {
        _sweepWallet(function (err, destinationAddress, txid) {
          ongoingProcess.set('sweepingWallet', false)
          $scope.sending = false
          if (err) {
            $log.error(err)
            popupService.showAlert(gettextCatalog.getString('Error sweeping wallet:'), err || err.toString())
          } else {
            $scope.sendStatus = 'success'
          }
          $scope.$apply()
        })
      }, 100)
    }

    $scope.onSuccessConfirm = function () {
      $state.go('tabs.home')
    }

    $scope.onAccountSelect = function (wallet) {
      $scope.account = wallet
    }

    $scope.showAccountSelector = function () {
      if ($scope.singleAccount) return
      $scope.accountSelectorTitle = gettextCatalog.getString('Transfer to')
      $scope.showAccounts = true
    }

    $scope.$on('$ionicView.beforeEnter', function (event, data) {
      $scope.scannedKey = (data.stateParams && data.stateParams.privateKey) ? data.stateParams.privateKey : null
      $scope.isPkEncrypted = $scope.scannedKey ? ($scope.scannedKey.substring(0, 2) == '6P') : null
      $scope.sendStatus = null
      $scope.error = false

      $scope.accounts = profileService.getAccounts()
      $scope.singleAccount = $scope.accounts.length === 1

      if (!$scope.accounts || !$scope.accounts.length) {
        $scope.noMatchingWallet = true       
      }
    })

    $scope.$on('$ionicView.enter', function (event, data) {
      $scope.account = $scope.accounts[0]
      if (!$scope.account) return
      if (!$scope.isPkEncrypted) $scope.scanFunds()
      else {
        var message = gettextCatalog.getString('Private key encrypted. Enter password')
        popupService.showPrompt(null, message, null, function (res) {
          $scope.passphrase = res
          $scope.scanFunds()
        })
      }
    })
  })
