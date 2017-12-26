'use strict';

angular.module('raiwApp.controllers').controller('preferencesPrivateKeyController', function($scope, $log, $timeout, $ionicHistory, profileService, walletService) {

  $scope.$on("$ionicView.beforeEnter", function(event, data) {
    if (!data.stateParams || !data.stateParams.walletId) {
      popupService.showAlert(null, gettextCatalog.getString('No wallet selected'), function() {
        $ionicHistory.goBack();
      });
      return;
    }
    $scope.account = profileService.getAccount(data.stateParams.walletId);
    $scope.credentialsEncrypted = $scope.account.isPrivKeyEncrypted();
    walletService.getKeys($scope.account, function(err, k) {
      if (err || !k) {
        $log.error('Could not get keys: ', err);
        $ionicHistory.goBack();
        return;
      }
      $timeout(function() {
        $scope.xPrivKey = k.xPrivKey;
        $scope.credentialsEncrypted = false;
      }, 100);
    });
  });
});
