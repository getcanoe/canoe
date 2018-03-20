'use strict'

angular.module('canoeApp.controllers').controller('advancedSettingsController', function ($scope, $log, $ionicHistory, configService, nanoService, popupService, platformInfo, gettextCatalog) {
  var updateConfig = function () {
    var config = configService.getSync()

    var value
    // For now we only allow choosing on NWjs Linux
    if (platformInfo.isLinux) {
      value = config.wallet.serverSidePoW
      $scope.serverSidePoWDisabled = false
    } else {
      value = true
      $scope.serverSidePoWDisabled = true
      if (config.wallet.serverSidePoW !== true) {
        $log.debug('Forced server side PoW to true')
        // Old value, change to true
        $scope.serverSidePoW = {
          value: value
        }
        $scope.serverSidePoWChange()
      }
    }

    $scope.serverSidePoW = {
      value: value
    }
    $scope.recentTransactionsEnabled = {
      value: false // config.recentTransactions.enabled
    }
  }

  $scope.repair = function () {
    var title = gettextCatalog.getString('Warning!')
    var message = gettextCatalog.getString('Repairing your wallet could take some time. This will reload all blockchains associated with your wallet. Are you sure you want to repair?')
    popupService.showConfirm(title, message, null, null, function (res) {
      if (!res) return
      nanoService.repair()
      $ionicHistory.goBack()
    })
  }

  $scope.serverSidePoWChange = function () {
    var opts = {
      wallet: {
        serverSidePoW: $scope.serverSidePoW.value
      }
    }
    configService.set(opts, function (err) {
      if (err) $log.debug(err)
    })
  }

  $scope.recentTransactionsChange = function () {
    var opts = {
      recentTransactions: {
        enabled: $scope.recentTransactionsEnabled.value
      }
    }
    configService.set(opts, function (err) {
      if (err) $log.debug(err)
    })
  }

  $scope.$on('$ionicView.beforeEnter', function (event, data) {
    $scope.isWindowsPhoneApp = platformInfo.isCordova && platformInfo.isWP
    updateConfig()
  })
})
