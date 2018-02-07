'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('preferencesNameController',
  function ($scope, $timeout, $stateParams, $ionicHistory, configService, profileService, walletService) {
    var account = profileService.getAccount($stateParams.accountId)
    $scope.accountName = account.meta.label
    $scope.name = {
      value: $scope.accountName
    }

    $scope.save = function () {
      account.meta.label = $scope.name.value
      profileService.saveWallet(function () {
        $ionicHistory.goBack()
      })
    }
  })
