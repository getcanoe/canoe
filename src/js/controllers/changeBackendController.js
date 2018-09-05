'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('changeBackendController', function ($scope, $timeout, nanoService) {
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
