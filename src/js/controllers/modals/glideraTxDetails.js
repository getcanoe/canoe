'use strict';

angular.module('canoeApp.controllers').controller('glideraTxDetailsController', function($scope) {

  $scope.cancel = function() {
    $scope.glideraTxDetailsModal.hide();
  };

});
