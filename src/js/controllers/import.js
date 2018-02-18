'use strict'
/* global angular FileReader */
angular.module('canoeApp.controllers').controller('importController',
  function ($scope, $timeout, $log, $state, $stateParams, $ionicHistory, $ionicScrollDelegate, lodash, profileService, configService, nanoService, platformInfo, ongoingProcess, walletService, popupService, gettextCatalog, appConfigService) {
    var reader = new FileReader()
    var defaults = configService.getDefaults()
    var config = configService.getSync()

    $scope.init = function () {
      $scope.isCordova = platformInfo.isCordova
      $scope.formData = {}
      $scope.formData.account = 1
      $scope.importErr = false

      if ($stateParams.code) { $scope.processQRSeed($stateParams.code) }

      $scope.seedOptions = []

      $timeout(function () {
        $scope.$apply()
      })
    }

    $scope.processQRSeed = function (data) {
      // xrbseed:<encoded seed>[?][label=<label>][&][message=<message>][&][lastindex=<index>]
      // xrbseed:97123971239712937123987129387129873?label=bah&message=hubba&lastindex=9
      if (!data) return

      nanoService.parseQRCode(data, function (err, code) {
        if (err) {
          // Trying to import a malformed seed QR code
          popupService.showAlert(gettextCatalog.getString('Error'), gettextCatalog.getString('Incorrect code format for a seed: ' + code))
          return
        }
        if (code.protocol === 'xrbseed' || code.protocol === 'nanoseed') {
          $timeout(function () {
            $scope.formData.seed = code.seed
            $scope.$apply()
          }, 1)
        } else {
          // Trying to import wrong protocol
          popupService.showAlert(gettextCatalog.getString('Error'), gettextCatalog.getString('Not a seed QR code: ' + code))
        }
      })
    }

    var _importBlob = function (data, opts) {
      var err
      ongoingProcess.set('importingWallet', true)
      $timeout(function () {
        try {
          profileService.importWallet(data, $scope.formData.password, function (err) {
            ongoingProcess.set('importingWallet', false)
            if (err) {
              popupService.showAlert(gettextCatalog.getString('Error'), err)
              return
            }
            finish()    
          })
        } catch (e) {
          err = gettextCatalog.getString('Could not decrypt wallet, check your password')
          $log.warn(e)
        }
      }, 100)
    }

    $scope.getFile = function () {
      // If we use onloadend, we need to check the readyState.
      reader.onloadend = function (evt) {
        if (evt.target.readyState === FileReader.DONE) { // DONE == 2
          _importBlob(evt.target.result)
        }
      }
    }

    $scope.importBlob = function (form) {
      if (form.$invalid) {
        popupService.showAlert(gettextCatalog.getString('Error'), gettextCatalog.getString('There is an error in the form'))
        return
      }

      var backupFile = $scope.formData.file
      var backupText = $scope.formData.backupText

      if (!backupFile && !backupText) {
        popupService.showAlert(gettextCatalog.getString('Error'), gettextCatalog.getString('Please, select your backup file'))
        return
      }

      if (backupFile) {
        reader.readAsBinaryString(backupFile)
      } else {
        _importBlob(backupText)
      }
    }

    $scope.importSeed = function (form) {
      if (form.$invalid) {
        popupService.showAlert(gettextCatalog.getString('Error'), gettextCatalog.getString('There is an error in the form'))
        return
      }
      var seed = $scope.formData.seed || null
      if (!seed) {
        popupService.showAlert(gettextCatalog.getString('Error'), gettextCatalog.getString('Please enter the seed'))
        return
      }
      if (!nanoService.isValidSeed(seed)) {
        popupService.showAlert(gettextCatalog.getString('Error'), gettextCatalog.getString('The seed is invalid, it should be 64 characters of: 0-9, A-F'))
        return
      }
      var password = $scope.formData.password || null
      if (!password) {
        popupService.showAlert(gettextCatalog.getString('Error'), gettextCatalog.getString('Please enter a password to use for the wallet'))
        return
      }
      ongoingProcess.set('importingWallet', true)
      $timeout(function () {
        profileService.importSeed(password, seed, function () {
          ongoingProcess.set('importingWallet', false)
          finish()
        })
      }, 100)
    }

    var finish = function () {
      profileService.setBackupFlag()
      if ($stateParams.fromOnboarding) {
        profileService.setDisclaimerAccepted(function (err) {
          if (err) $log.error(err)
        })
      }
      $ionicHistory.removeBackView()
      $state.go('tabs.home', {
        fromOnboarding: $stateParams.fromOnboarding
      })
    }

    $scope.resizeView = function () {
      $timeout(function () {
        $ionicScrollDelegate.resize()
      }, 10)
    }

    $scope.$on('$ionicView.afterEnter', function (event, data) {
      $scope.showAdv = false
      $scope.init()
    })
  })
