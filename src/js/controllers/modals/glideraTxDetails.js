'use strict';

angular.module('raiwApp.controllers').controller('glideraTxDetailsController', function($scope) {

  $scope.cancel = function() {
    $scope.glideraTxDetailsModal.hide();
  };

});
