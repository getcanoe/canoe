'use strict'
/* global angular */
angular
  .module('canoeApp.controllers')
  .controller('createPasswordController', function (
    $scope,
    $state,
    $log,
    $timeout,
    $filter,
    ongoingProcess,
    profileService,
    popupService,
    gettextCatalog
  ) {
    var retryCount = 0
    $scope.createDefaultWallet = function () {
      ongoingProcess.set('creatingWallet', true)
      $timeout(function () {
        // This is the call to create the wallet from onboarding.
        // profileService.enterPassword() needs to be called first with the password
        // chosen by the user.
        profileService.createWallet(
          profileService.getEnteredPassword(),
          null,
          function (err, wallet) {
            if (err) {
              $log.warn(err)
              return $timeout(function () {
                $log.warn(
                  'Retrying to create default wallet.....:' + ++retryCount
                )
                if (retryCount > 3) {
                  ongoingProcess.set('creatingWallet', false)
                  popupService.showAlert(
                    gettextCatalog.getString('Cannot Create Wallet'),
                    err,
                    function () {
                      retryCount = 0
                      return $scope.createDefaultWallet()
                    },
                    gettextCatalog.getString('Retry')
                  )
                } else {
                  return $scope.createDefaultWallet()
                }
              }, 2000)
            }
            ongoingProcess.set('creatingWallet', false)
            $state.go('onboarding.backupRequest', {
              walletId: wallet.id
            })
          }
        )
      }, 300)
    }
  })
