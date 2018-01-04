'use strict'

angular.module('canoeApp.controllers').controller('preferencesInformation',
  function ($scope, $log, $ionicHistory, platformInfo, lodash, profileService, configService, $stateParams, $state, walletService) {
    var account = profileService.getAccount($stateParams.accountId)
    var config = configService.getSync()
    var colorCounter = 1
    var BLACK_WALLET_COLOR = '#202020'
    $scope.isCordova = platformInfo.isCordova
    config.colorFor = config.colorFor || {}

    $scope.saveBlack = function () {
      function save (color) {
        account.color = color
        profileService.saveWallet(function (wallet) {
          $ionicHistory.removeBackView()
          $state.go('tabs.home')
        })
      }
      if (colorCounter !== 5) return colorCounter++
      save(BLACK_WALLET_COLOR)
    }

    $scope.$on('$ionicView.enter', function (event, data) {
      var account = profileService.getAccount(data.stateParams.accountId)
      $scope.account = account
      $scope.accountName = account.name
      $scope.accountId = account.id
    })
  })
