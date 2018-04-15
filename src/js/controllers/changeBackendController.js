'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('changeBackendController', function ($scope, $state, $timeout, $log, $ionicHistory, nanoService, popupService, gettextCatalog) {
  $scope.serverURL = ''

  $scope.changeBackend = function (url) {
    nanoService.setHost(url)
    popupService.showAlert(gettextCatalog.getString('Information'), gettextCatalog.getString('Your backend has been changed'))
    $ionicHistory.removeBackView()
    $state.go('tabs.home')
  }

  $scope.$on('$ionicView.beforeEnter', function (event, data) {
    $scope.serverURL = nanoService.getHost()
    $timeout(function () {
      $scope.$apply()
    })
  })
})
