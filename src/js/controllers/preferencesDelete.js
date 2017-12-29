'use strict'

angular.module('canoeApp.controllers').controller('preferencesDeleteWalletController',
  function ($scope, $ionicHistory, gettextCatalog, lodash, profileService, $state, ongoingProcess, popupService, pushNotificationsService) {
    $scope.$on('$ionicView.beforeEnter', function (event, data) {
      if (!data.stateParams || !data.stateParams.walletId) {
        popupService.showAlert(null, gettextCatalog.getString('No wallet selected'), function () {
          $ionicHistory.goBack()
        })
        return;
      }
      $scope.account = profileService.getAccount(data.stateParams.walletId)
      if (!$scope.account) {
        popupService.showAlert(null, gettextCatalog.getString('No wallet found'), function () {
          $ionicHistory.goBack()
        })
        return;
      }
      $scope.accountName = $scope.account.name
    })

    $scope.showDeletePopup = function () {
      var title = gettextCatalog.getString('Warning!')
      var message = gettextCatalog.getString('Are you sure you want to delete this wallet?')
      popupService.showConfirm(title, message, null, null, function (res) {
        if (res) deleteWallet()
      })
    };

    function deleteWallet () {
      ongoingProcess.set('deletingWallet', true)
      profileService.deleteWalletClient($scope.account, function (err) {
        ongoingProcess.set('deletingWallet', false)
        if (err) {
          popupService.showAlert(gettextCatalog.getString('Error'), err.message || err)
        } else {
          pushNotificationsService.unsubscribe($scope.account)
          $ionicHistory.nextViewOptions({
            disableAnimate: true,
            historyRoot: true
          })
          $ionicHistory.clearHistory()
          $state.go('tabs.settings').then(function () {
            $state.transitionTo('tabs.home')
          })
        }
      })
    };
  })
