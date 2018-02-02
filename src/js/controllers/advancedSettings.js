'use strict'

angular.module('canoeApp.controllers').controller('advancedSettingsController', function ($scope, $log, configService, platformInfo, externalLinkService, gettextCatalog) {
  var updateConfig = function () {
    var config = configService.getSync()

    $scope.serverSidePoW = {
      value: config.wallet.serverSidePoW
    }
    $scope.recentTransactionsEnabled = {
      value: config.recentTransactions.enabled
    }
    $scope.hideNextSteps = {
      value: config.hideNextSteps.enabled
    }
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

  $scope.nextStepsChange = function () {
    var opts = {
      hideNextSteps: {
        enabled: $scope.hideNextSteps.value
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
