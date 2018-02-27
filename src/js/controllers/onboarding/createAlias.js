'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('createAliasController',
  function ($scope, $timeout, $log, $state, $stateParams, $ionicHistory, lodash, profileService, aliasService, walletService, ongoingProcess, popupService, gettextCatalog, $ionicModal) {
    $scope.accountId = $stateParams.walletId
    $scope.create = function (alias, email, isPrivate, createPhoneAlias) {
      // Save the alias we have selected to use for our wallet
      var account = $scope.wallet.getCurrentAccount();
      var data = $scope.wallet.aliasSignature([alias,account]);
      ongoingProcess.set('creatingAlias', true);
      aliasService.createAlias(alias, account, email, isPrivate, data.signature, function(err, ans) {
        console.log(err);
        console.log(ans);
        if (err) {
          ongoingProcess.set('creatingAlias', false);
          return $log.debug(err);
        }
        $log.debug('Answer from alias server creation: ' + JSON.stringify(ans));
        if (ans) {
          //TODO SAVE ALIAS IN WALLET
        }
        ongoingProcess.set('creatingAlias', false);
        $state.go('onboarding.disclaimer', {
          walletId: $scope.accountId,
          backedUp: false
        })
      });
    }

    $scope.skipAlias = function () {
      $state.go('onboarding.disclaimer', {
        walletId: $scope.accountId,
        backedUp: false
      })
    }

    $scope.$on('$ionicView.enter', function (event, data) {
      $scope.wallet = profileService.getWallet();
      if ($scope.wallet === null) {
        $log.debug('Bad password or no wallet')
        return
      }
    })
  })
