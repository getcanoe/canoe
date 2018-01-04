'use strict'

angular.module('canoeApp.controllers').controller('preferencesController',
  function ($scope, $rootScope, $timeout, $log, $ionicHistory, configService, profileService, fingerprintService, walletService, platformInfo, externalLinkService, gettextCatalog) {
    var account
    var accountId

    $scope.hiddenBalanceChange = function () {
      var opts = {
        balance: {
          enabled: $scope.hiddenBalance.value
        }
      }
      profileService.toggleHideBalanceFlag(accountId, function (err) {
        if (err) $log.error(err)
      })
    }

    $scope.touchIdChange = function () {
      var newStatus = $scope.touchIdEnabled.value
      walletService.setTouchId(account, !!newStatus, function (err) {
        if (err) {
          $scope.touchIdEnabled.value = !newStatus
          $timeout(function () {
            $scope.$apply()
          }, 1)
          return
        }
        $log.debug('Touch Id status changed: ' + newStatus)
      })
    }

    $scope.$on('$ionicView.beforeEnter', function (event, data) {
      account = profileService.getAccount(data.stateParams.accountId)
      accountId = account.id
      $scope.account = account
      $scope.isWindowsPhoneApp = platformInfo.isCordova && platformInfo.isWP
      $scope.externalSource = null

      if (!account) { return $ionicHistory.goBack() }

      var config = configService.getSync()

      $scope.hiddenBalance = {
        value: $scope.account.balanceHidden
      }

      $scope.touchIdAvailable = fingerprintService.isAvailable()
      $scope.touchIdEnabled = {
        value: config.touchIdFor ? config.touchIdFor[accountId] : null
      }
    })
  })
