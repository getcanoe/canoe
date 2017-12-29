'use strict'

angular.module('canoeApp.controllers').controller('createController',
  function ($scope, $rootScope, $timeout, $log, lodash, $state, $ionicScrollDelegate, $ionicHistory, profileService, configService, gettextCatalog, ongoingProcess, walletService, storageService, popupService, appConfigService, pushNotificationsService) {
  
    $scope.$on('$ionicView.beforeEnter', function (event, data) {
      $scope.formData = {}
      var defaults = configService.getDefaults()
      var config = configService.getSync()
      $scope.formData.account = 1
      $scope.formData.bwsurl = defaults.bws.url
      resetPasswordFields()
    })

    $scope.showAdvChange = function () {
      $scope.showAdv = !$scope.showAdv
      $scope.encrypt = null
      $scope.resizeView()
    }

    $scope.checkPassword = function (pw1, pw2) {
      if (pw1 && pw1.length > 0) {
        if (pw2 && pw2.length > 0) {
          if (pw1 === pw2) $scope.result = 'correct'
          else {
            $scope.formData.passwordSaved = null
            $scope.result = 'incorrect'
          }
        } else { $scope.result = null }
      } else { $scope.result = null }
    }

    $scope.resizeView = function () {
      $timeout(function () {
        $ionicScrollDelegate.resize()
      }, 10)
      resetPasswordFields()
    }

    function resetPasswordFields () {
      $scope.formData.passphrase = $scope.formData.createPassphrase = $scope.formData.passwordSaved = $scope.formData.repeatPassword = $scope.result = null
      $timeout(function () {
        $scope.$apply()
      })
    }

    $scope.create = function () {
      var opts = {
        name: $scope.formData.walletName,
        bwsurl: $scope.formData.bwsurl
      }

      var setSeed = $scope.formData.seedSource.id === 'set'
      if (setSeed) {
        var words = $scope.formData.privateKey || ''
        if (words.indexOf(' ') === -1 && words.indexOf('prv') === 1 && words.length > 108) {
          opts.extendedPrivateKey = words
        } else {
          opts.mnemonic = words
        }
        opts.passphrase = $scope.formData.passphrase
      } else {
        opts.passphrase = $scope.formData.createPassphrase
      }

      if (setSeed && !opts.mnemonic && !opts.extendedPrivateKey) {
        popupService.showAlert(gettextCatalog.getString('Error'), gettextCatalog.getString('Please enter the wallet recovery phrase'))
        return
      }
      _create(opts)
    }

    function _create (opts) {
      ongoingProcess.set('creatingWallet', true)
      $timeout(function () {
        profileService.createWallet(opts, function (err, client) {
          ongoingProcess.set('creatingWallet', false)
          if (err) {
            $log.warn(err)
            popupService.showAlert(gettextCatalog.getString('Error'), err)
            return
          }

          walletService.updateRemotePreferences(client)
          pushNotificationsService.updateSubscription(client)

          if ($scope.formData.seedSource.id == 'set') {
            profileService.setBackupFlag(client.credentials.walletId)
          }

          $ionicHistory.removeBackView()

          if (!client.isComplete()) {
            $ionicHistory.nextViewOptions({
              disableAnimate: true
            })
            $state.go('tabs.home')
            $timeout(function () {
              $state.transitionTo('tabs.canoeers', {
                walletId: client.credentials.walletId
              })
            }, 100)
          } else $state.go('tabs.home')
        })
      }, 300)
    }
  })
