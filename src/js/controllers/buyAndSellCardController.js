'use strict';

angular.module('canoeApp.controllers').controller('buyAndSellCardController', function($scope, $ionicScrollDelegate, buyAndSellService) {

  $scope.services = buyAndSellService.getLinked();

  $scope.toggle = function() {
    $scope.hide = !$scope.hide;
    $timeout(function() {
      $ionicScrollDelegate.resize();
      $scope.$apply();
    }, 10);
  };
});
