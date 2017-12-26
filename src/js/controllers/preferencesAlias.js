'use strict';

angular.module('raiwApp.controllers').controller('preferencesAliasController',
  function($scope, $timeout, $stateParams, $ionicHistory, configService, profileService, walletService) {
    var wallet = profileService.getAccount($stateParams.walletId);
    var walletId = wallet.credentials.walletId;
    var config = configService.getSync();

    $scope.accountName = wallet.credentials.walletName;
    $scope.accountAlias = config.aliasFor && config.aliasFor[walletId] ? config.aliasFor[walletId] : wallet.credentials.walletName;
    $scope.alias = {
      value: $scope.accountAlias
    };

    $scope.save = function() {
      var opts = {
        aliasFor: {}
      };

      opts.aliasFor[walletId] = $scope.alias.value;

      configService.set(opts, function(err) {
        if (err) $log.warn(err);
        $ionicHistory.goBack();
      });
    };
  });
