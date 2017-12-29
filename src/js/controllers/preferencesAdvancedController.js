'use strict';

angular.module('canoeApp.controllers').controller('preferencesAdvancedController', function($scope, $timeout, $state, $stateParams, profileService) {
  var wallet = profileService.getAccount($stateParams.walletId);
  $scope.network = wallet.network;
  $scope.account = wallet;

  $scope.goToAddresses = function() {
    $state.go('tabs.settings.addresses', {
      walletId: $stateParams.walletId,
    });
  };

  $timeout(function() {
    $scope.$apply();
  }, 1);
});
