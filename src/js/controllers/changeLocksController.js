'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('changeLocksController', function ($scope, $state, $timeout, $log, $ionicHistory, profileService, popupService, configService, gettextCatalog) {

  $scope.saveLockTypeA = function (lockType) {
    $scope.lockTypeA = lockType
  }

  $scope.saveLockTypeBackground = function (lockType) {
    $scope.lockTypeBackground = lockType
  }

  $scope.save = function (timeoutA, timeoutB) {
    var opts = {
      wallet: {
        timeoutA: timeoutA,
        timeoutB: timeoutB,
        lockTypeA: $scope.lockTypeA,
        lockTypeBackground: $scope.lockTypeBackground
      }
    }
    configService.set(opts, function (err) {
      if (err) $log.debug(err)
      popupService.showAlert(gettextCatalog.getString('Information'), gettextCatalog.getString('Saved'))
      $ionicHistory.removeBackView()
      $state.go('tabs.home')
    })
  }

  $scope.$on('$ionicView.beforeEnter', function (event, data) {
    var config = configService.getSync()
    $scope.timeoutA = config.wallet.timeoutA
    $scope.lockTypeA = config.wallet.lockTypeA
    $scope.timeoutB = config.wallet.timeoutB
    $scope.lockTypeBackground = config.wallet.lockTypeBackground
    $timeout(function () {
      $scope.$apply()
    })
  })
})
