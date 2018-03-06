'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('addressbookViewController', function ($scope, $state, $timeout, lodash, addressbookService, popupService, $ionicHistory, platformInfo, gettextCatalog, nanoService) {
  $scope.isChromeApp = platformInfo.isChromeApp
  $scope.addressbookEntry = {}

  $scope.$on('$ionicView.beforeEnter', function (event, data) {
    $scope.addressbookEntry = {}
    $scope.addressbookEntry.address = data.stateParams.address
    $scope.addressbookEntry.name = data.stateParams.name
    $scope.addressbookEntry.email = data.stateParams.email
    $scope.addressbookEntry.alias = data.stateParams.alias
    nanoService.isValidAccount($scope.addressbookEntry.address)
  })

  $scope.edit = function () {
    $ionicHistory.removeBackView()
    $timeout(function () {
      $state.transitionTo('tabs.addressbook.edit', {
        address: $scope.addressbookEntry.address,
        name: $scope.addressbookEntry.name,
        email: $scope.addressbookEntry.email,
        alias: $scope.addressbookEntry.alias
      })
    }, 100)
  }

  $scope.sendTo = function () {
    $ionicHistory.removeBackView()
    $state.go('tabs.send')
    $timeout(function () {
      $state.transitionTo('tabs.send.amount', {
        recipientType: 'contact',
        toAddress: $scope.addressbookEntry.address,
        toName: $scope.addressbookEntry.name,
        toEmail: $scope.addressbookEntry.email,
        toAlias: $scope.addressbookEntry.alias
      })
    }, 100)
  }

  $scope.remove = function (addr) {
    var title = gettextCatalog.getString('Warning!')
    var message = gettextCatalog.getString('Are you sure you want to delete this contact?')
    popupService.showConfirm(title, message, null, null, function (res) {
      if (!res) return
      addressbookService.remove(addr, function (err, ab) {
        if (err) {
          popupService.showAlert(gettextCatalog.getString('Error'), err)
          return
        }
        $ionicHistory.goBack()
      })
    })
  }
})
