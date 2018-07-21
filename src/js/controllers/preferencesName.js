'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('preferencesNameController',
  function ($scope, $stateParams, $ionicHistory, profileService, popupService, gettextCatalog) {
    var account = profileService.getAccount($stateParams.accountId)
    $scope.accountName = account.meta.label
    $scope.name = {
      value: $scope.accountName
    }

    $scope.save = function () {
      if (profileService.getAccountWithName($scope.name.value)) {
        popupService.showAlert(gettextCatalog.getString('Error'), gettextCatalog.getString('An account already exists with that name'))
        return
      }
      account.meta.label = $scope.name.value
      profileService.saveWallet(function () {
        $ionicHistory.goBack()
      })
    }
  })
