'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('changeLocksController', function ($scope, $state, $timeout, $log, $ionicHistory, fingerprintService, popupService, configService, applicationService, platformInfo, gettextCatalog) {
  $scope.saveLockTypeA = function (lockType) {
    $scope.lockTypeSoft = lockType
  }

  $scope.saveLockTypeBackground = function (lockType) {
    $scope.lockTypeBackground = lockType
  }

  $scope.save = function (timeoutSoft, timeoutHard) {
    var opts = {
      wallet: {
        timeoutSoft: timeoutSoft,
        timeoutHard: timeoutHard,
        lockTypeSoft: $scope.lockTypeSoft,
        lockTypeBackground: $scope.lockTypeBackground
      }
    }
    configService.set(opts, function (err) {
      if (err) $log.debug(err)
      applicationService.configureLock(opts.wallet)
      popupService.showAlert(gettextCatalog.getString('Information'), gettextCatalog.getString('Saved'))
      $ionicHistory.removeBackView()
      $state.go('tabs.home')
    })
  }

  $scope.$on('$ionicView.beforeEnter', function (event, data) {
    var config = configService.getSync()
    $scope.enabledFingerprint = fingerprintService.isAvailable()
    $scope.enabledBackground = platformInfo.isMobile
    $scope.timeoutSoft = config.wallet.timeoutSoft
    $scope.lockTypeSoft = config.wallet.lockTypeSoft
    $scope.timeoutHard = config.wallet.timeoutHard
    $scope.lockTypeBackground = config.wallet.lockTypeBackground
    $timeout(function () {
      $scope.$apply()
    })
  })
})
