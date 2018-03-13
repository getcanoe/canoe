'use strict'

angular.module('canoeApp.controllers').controller('backupWarningController', function ($scope, $state, $timeout, $stateParams, $ionicModal) {
  $scope.accountId = $stateParams.walletId
  $scope.fromState = $stateParams.from == 'onboarding' ? $stateParams.from + '.backupRequest' : $stateParams.from
  $scope.toState = $stateParams.from + '.backup'

  $scope.openPopup = function () {
    $ionicModal.fromTemplateUrl('views/includes/screenshotWarningModal.html', {
      scope: $scope,
      backdropClickToClose: true,
      hardwareBackButtonClose: true
    }).then(function (modal) {
      $scope.warningModal = modal
      $scope.warningModal.show()
    })

    $scope.close = function () {
      $scope.warningModal.remove()
      $timeout(function () {
        $state.go($scope.toState, {
          walletId: $scope.accountId
        })
      }, 200)
    }
  }

  $scope.goBack = function () {
    $state.go($scope.fromState, {
      walletId: $scope.accountId
    })
  }
})
