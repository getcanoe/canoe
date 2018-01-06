'use strict'

angular.module('canoeApp.controllers').controller('addressbookAddController', function ($scope, $state, $stateParams, $timeout, $ionicHistory, gettextCatalog, addressbookService, popupService) {
  $scope.fromSendTab = $stateParams.fromSendTab

  $scope.addressbookEntry = {
    'address': $stateParams.addressbookEntry || '',
    'name': '',
    'email': ''
  }

  $scope.onQrCodeScannedAddressBook = function (data, addressbookForm) {
    $timeout(function () {
      var form = addressbookForm
      if (data && form) {
        // TODO pick out label as name of contact also
        data = data.replace(/^xrb:/, '')
        form.address.$setViewValue(data)
        form.address.$isValid = true
        form.address.$render()
      }
      $scope.$digest()
    }, 100)
  }

  $scope.add = function (addressbook) {
    $timeout(function () {
      addressbookService.add(addressbook, function (err, ab) {
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
