'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('preferencesController',
  function ($scope, $log, $ionicHistory, configService, profileService, fingerprintService, platformInfo) {
    var account
    var accountId

    $scope.hiddenBalanceChange = function () {
      profileService.toggleHideBalanceFlag(accountId, function (err) {
        if (err) $log.error(err)
      })
    }

    $scope.$on('$ionicView.beforeEnter', function (event, data) {
      account = profileService.getAccount(data.stateParams.accountId)
      accountId = account.id
      $scope.account = account
      $scope.accountRepresentative = profileService.getRepresentativeFor(account.id)
      $scope.isWindowsPhoneApp = platformInfo.isCordova && platformInfo.isWP
      $scope.externalSource = null

      if (!account) { return $ionicHistory.goBack() }

      var config = configService.getSync()

      $scope.hiddenBalance = {
        value: $scope.account.meta.balanceHidden
      }

      $scope.touchIdAvailable = fingerprintService.isAvailable()
      $scope.touchIdEnabled = {
        value: config.touchIdFor ? config.touchIdFor[accountId] : null
      }
    })
  })
