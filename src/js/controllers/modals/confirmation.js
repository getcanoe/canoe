'use strict';

angular.module('raiwApp.controllers').controller('confirmationController', function($scope) {

  $scope.ok = function() {
    $scope.loading = true;
    $scope.okAction();
    $scope.confirmationModal.hide();
  };

  $scope.cancel = function() {
    $scope.confirmationModal.hide();
  };

});
