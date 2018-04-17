'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('changeBackendController', function ($scope, $state, $timeout, $log, $ionicHistory, nanoService, popupService, gettextCatalog) {
  $scope.serverURL = ''

  $scope.changeBackend = function (url) {
    nanoService.setHost(url)
  }

  $scope.$on('$ionicView.beforeEnter', function (event, data) {
    $scope.serverURL = nanoService.getHost()
    $timeout(function () {
      $scope.$apply()
    })
  })
})
