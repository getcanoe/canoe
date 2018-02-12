'use strict'

angular.module('canoeApp.controllers').controller('addressbookAddController', function ($scope, $state, $stateParams, $timeout, $ionicHistory, gettextCatalog, addressbookService, nanoService, popupService) {
  $scope.fromSendTab = $stateParams.fromSendTab

  $scope.addressbookEntry = {
    'address': $stateParams.addressbookEntry || '',
    'name': '',
    'email': '',
    'alias': ''
  }

  $scope.onQrCodeScannedAddressBook = function (data, addressbookForm) {
    $timeout(function () {
      var form = addressbookForm
      if (data && form) {
        nanoService.parseQRCode(data, function (code) {
          form.address.$setViewValue(code.account)
          form.address.$isValid = true
          form.address.$render()
          form.name.$setViewValue(code.params.label || '')
          form.name.$render()
          form.alias.$setViewValue(code.alias || '')
          form.alias.$render()
        })
      }
      $scope.$digest()
    }, 100)
  }

  $scope.add = function (entry) {
    $timeout(function () {
      addressbookService.add(entry, function (err, ab) {
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
