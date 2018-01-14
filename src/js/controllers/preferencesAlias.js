'use strict'

angular.module('canoeApp.controllers').controller('preferencesAliasController',
  function ($scope, $timeout, $stateParams, $ionicHistory, configService, profileService, walletService) {
    var account = profileService.getAccount($stateParams.accountId)
    $scope.accountName = account.name
    $scope.alias = {
      value: $scope.accountName
    }

    $scope.save = function () {
      account.name = $scope.alias.value
      profileService.saveWallet(function () {
        $ionicHistory.goBack()
      })
    }
  })
