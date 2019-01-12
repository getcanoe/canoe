'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('backupController',
  function ($scope, $timeout, $log, $state, $stateParams, $ionicHistory, profileService, nanoService, popupService, gettextCatalog, $ionicModal) {
    $scope.wallet = profileService.getWallet()

    $scope.setFlow = function (step) {
      $scope.data = {}
      $scope.seedLines = nanoService.splitSeed(profileService.getSeed())
      $scope.data.passphrase = null
      $scope.step = step || 1
      $scope.selectComplete = false
      $scope.backupError = false

      $timeout(function () {
        $scope.$apply()
      }, 10)
    }

    function openConfirmBackupModal () {
      $ionicModal.fromTemplateUrl('views/includes/confirmBackupPopup.html', {
        scope: $scope,
        backdropClickToClose: false,
        hardwareBackButtonClose: false
      }).then(function (modal) {
        $scope.confirmBackupModal = modal
        $scope.confirmBackupModal.show()
      })
    }

    var showBackupResult = function () {
      if ($scope.backupError) {
        var title = gettextCatalog.getString('Uh oh...')
        var message = gettextCatalog.getString("It's important that you write your wallet seed down correctly. If something happens to your wallet, you'll need this seed to reconstruct it. Please review your seed and try again.")
        popupService.showAlert(title, message, function () {
          $scope.setFlow(2)
        })
      } else {
        profileService.setBackupFlag()
        openConfirmBackupModal()
      }
    }

    $scope.closeBackupResultModal = function () {
      $scope.confirmBackupModal.hide()
      $scope.confirmBackupModal.remove()

      profileService.isDisclaimerAccepted(function (val) {
        if (val) {
          $ionicHistory.removeBackView()
          $state.go('tabs.home')
        } else {
          $state.go('onboarding.disclaimer', {
            walletId: $stateParams.walletId,
            backedUp: true
          })
        }
      })
    }

    var finalStep = function () {
      showBackupResult()
    }

    $scope.goToStep = function (n) {
      if (n === 1) { $scope.setFlow() }
      if (n === 2) { $scope.step = 2 }
      if (n === 3) { $scope.step = 3 }
      if (n === 4) { finalStep() }
    }

    $scope.$on('$ionicView.enter', function (event, data) {
      $scope.deleted = (profileService.getSeed() === null)
      if ($scope.deleted) {
        $log.debug('Bad password or no wallet')
        return
      }
      $scope.setFlow()
    })
  })
