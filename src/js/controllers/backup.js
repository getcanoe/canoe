'use strict'

angular.module('canoeApp.controllers').controller('backupController',
  function ($scope, $timeout, $log, $state, $stateParams, $ionicHistory, lodash, profileService, bwcService, walletService, ongoingProcess, popupService, gettextCatalog, $ionicModal) {
    $scope.wallet = profileService.getWallet()
    $scope.viewTitle = 'Wallet backup' // $scope.account.name || $scope.account.credentials.walletName

    $scope.setFlow = function (step) {
      $scope.data = {}
      $scope.seed = $scope.wallet.seed
      $scope.seed1 = $scope.seed.substring(0, 32)
      $scope.seed2 = $scope.seed.substring(32)
      $scope.data.passphrase = null
      $scope.step = step || 1
      $scope.selectComplete = false
      $scope.backupError = false

      $timeout(function () {
        $scope.$apply()
      }, 10)
    }

    var backupError = function (err) {
      ongoingProcess.set('validatingWords', false)
      $log.debug('Failed to verify seed: ', err)
      $scope.backupError = true

      $timeout(function () {
        $scope.$apply()
      }, 1)
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
    };

    var showBackupResult = function () {
      if ($scope.backupError) {
        var title = gettextCatalog.getString('Uh oh...')
        var message = gettextCatalog.getString("It's important that you write your wallet seed down correctly. If something happens to your wallet, you'll need this seed to reconstruct it. Please review your seed and try again.")
        popupService.showAlert(title, message, function () {
          $scope.setFlow(2)
        })
      } else {
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

    $scope.copyWalletSeed = function () {
      return $scope.seed
    }

    var confirm = function (cb) {
      $scope.backupError = false

      $timeout(function () {
        profileService.setBackupFlag($scope.wallet.id)
        return cb()
      }, 1)
    }

    var finalStep = function () {
      showBackupResult()
  /*    ongoingProcess.set('validatingWords', true)
      confirm(function (err) {
        ongoingProcess.set('validatingWords', false)
        if (err) {
          backupError(err)
        }
        $timeout(function () {
          showBackupResult()
        }, 1)
      })*/
    }

    $scope.goToStep = function (n) {
      if (n === 1) { $scope.setFlow() }
      if (n === 2) { $scope.step = 2 }
      if (n === 3) { $scope.step = 3 }
      if (n === 4) { finalStep() }
    }

    $scope.addButton = function (index, item) {
      var newWord = {
        word: item.word,
        prevIndex: index
      }
      $scope.customWords.push(newWord)
      $scope.shuffledMnemonicWords[index].selected = true
      $scope.shouldContinue()
    }

    $scope.removeButton = function (index, item) {
      if ($scope.loading) return
      $scope.customWords.splice(index, 1)
      $scope.shuffledMnemonicWords[item.prevIndex].selected = false
      $scope.shouldContinue()
    }

    $scope.shouldContinue = function () {
      if ($scope.customWords.length == $scope.shuffledMnemonicWords.length) { $scope.selectComplete = true } else { $scope.selectComplete = false }
    }

    $scope.$on('$ionicView.enter', function (event, data) {
      $scope.deleted = (profileService.getWallet().seed === null)
      if ($scope.deleted) {
        $log.debug('no seed in wallet')
        return
      }
      $scope.setFlow()
    })
  })
