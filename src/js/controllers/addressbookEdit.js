'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('addressbookEditController', function ($scope, $state, $stateParams, $timeout, $ionicHistory, gettextCatalog, addressbookService, nanoService, popupService) {
  $scope.fromSendTab = $stateParams.fromSendTab

  $scope.oldAddress = $stateParams.address
  $scope.addressbookEntry = {
    'address': $stateParams.address || '',
    'name': $stateParams.name || '',
    'email': $stateParams.email || '',
    'alias': $stateParams.alias || ''
  }

  $scope.onQrCodeScannedAddressBook = function (data, addressbookForm) {
    $timeout(function () {
      var form = addressbookForm
      if (data && form) {
        var code = nanoService.parseQRCode(data)
        form.address.$setViewValue(code.account)
        form.address.$isValid = true
        form.address.$render()
        form.name.$setViewValue(code.params.label || '')
        form.name.$render()
      }
      $scope.$digest()
    }, 100)
  }

  $scope.save = function (entry) {
    $timeout(function () {
      addressbookService.save(entry, $scope.oldAddress, function (err, ab) {
        if (err) {
          popupService.showAlert(gettextCatalog.getString('Error'), err)
          return
        }
        if ($scope.fromSendTab) $scope.goHome()
        else $ionicHistory.goBack()
      })
    }, 100)
  }

  $scope.goHome = function () {
    $ionicHistory.removeBackView()
    $state.go('tabs.home')
  }
})
