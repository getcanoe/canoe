'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('preferencesRepresentativeController',
  function ($scope, $timeout, $stateParams, $ionicHistory, profileService, nanoService, popupService, gettextCatalog) {
    var account = profileService.getAccount($stateParams.accountId)
    $scope.accountRepresentative = profileService.getRepresentativeFor(account.id)
    $scope.representative = {
      value: $scope.accountRepresentative
    }

    $scope.onQrCodeScanned = function (data, form) {
      $timeout(function () {
        if (data && form) {
          nanoService.parseQRCode(data, function (err, code) {
            if (err) {
              // Trying to scan an incorrect QR code
              popupService.showAlert(gettextCatalog.getString('Error'), gettextCatalog.getString('Incorrect code format for an account: ' + err))
              return
            }
            form.representative.$setViewValue(code.account)
            form.representative.$isValid = true
            form.representative.$render()
          })
        }
        $scope.$digest()
      }, 100)
    }

    $scope.save = function () {
      // Creates an outgoing change block
      nanoService.changeRepresentative(account.id, $scope.representative.value)
      profileService.saveWallet(function () {
        $ionicHistory.goBack()
      })
    }
  })
