'use strict'

angular.module('canoeApp.controllers').controller('importController',
  function ($scope, $timeout, $log, $state, $stateParams, $ionicHistory, $ionicScrollDelegate, profileService, configService, raiblocksService, platformInfo, ongoingProcess, walletService, popupService, gettextCatalog, appConfigService) {
    var reader = new FileReader()
    var defaults = configService.getDefaults()
    var config = configService.getSync()

    $scope.init = function () {
      $scope.isCordova = platformInfo.isCordova
      $scope.formData = {}
      $scope.formData.account = 1
      $scope.importErr = false

      $scope.NOTIMPLEMENTEDYET = true
      if ($stateParams.code) { $scope.processWalletInfo($stateParams.code) }

      $scope.seedOptions = []

      $timeout(function () {
        $scope.$apply()
      })
    }

    $scope.switchTestnetOff = function () {
      $scope.formData.testnetEnabled = false
      $scope.resizeView()
      $timeout(function () {
        $scope.$apply()
      })
    }

    $scope.processWalletInfo = function (code) {
      if (!code) return

      $scope.importErr = false
      var parsedCode = code.split('|')

      if (parsedCode.length !== 5) {
        /// Trying to import a malformed wallet export QR code
        popupService.showAlert(gettextCatalog.getString('Error'), gettextCatalog.getString('Incorrect code format'))
        return
      }

      var info = {
        type: parsedCode[0],
        data: parsedCode[1],
        network: parsedCode[2],
        derivationPath: parsedCode[3],
        hasPassphrase: parsedCode[4] === 'true'
      }

      if (info.type === 1 && info.hasPassphrase) { popupService.showAlert(gettextCatalog.getString('Error'), gettextCatalog.getString('Password required. Make sure to enter your password in advanced options')) }

      $scope.formData.derivationPath = info.derivationPath
      $scope.formData.testnetEnabled = info.network === 'testnet'

      $timeout(function () {
        $scope.formData.words = info.data
        $scope.$apply()
      }, 1)
    }

    var _importBlob = function (str, opts) {
      var str2, err
      try {
        // TODO str2 = sjcl.decrypt($scope.formData.password, str)
      } catch (e) {
        err = gettextCatalog.getString('Could not decrypt file, check your password')
        $log.warn(e)
      };

      if (err) {
        popupService.showAlert(gettextCatalog.getString('Error'), err)
        return
      }

      ongoingProcess.set('importingWallet', true)
      opts.compressed = null
      opts.password = null

      $timeout(function () {
        profileService.importWallet(str2, opts, function (err, client) {
          ongoingProcess.set('importingWallet', false)
          if (err) {
            popupService.showAlert(gettextCatalog.getString('Error'), err)
            return
          }
          finish(client)
        })
      }, 100)
    }

    $scope.getFile = function () {
      // If we use onloadend, we need to check the readyState.
      reader.onloadend = function (evt) {
        if (evt.target.readyState == FileReader.DONE) { // DONE == 2
          var opts = {}
          opts.bwsurl = $scope.formData.bwsurl
          opts.coin = $scope.formData.coin
          _importBlob(evt.target.result, opts)
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
      var password = $scope.formData.password

      if (!backupFile && !backupText) {
        popupService.showAlert(gettextCatalog.getString('Error'), gettextCatalog.getString('Please, select your backup file'))
        return
      }

      if (backupFile) {
        reader.readAsBinaryString(backupFile)
      } else {
        var opts = {}
        opts.bwsurl = $scope.formData.bwsurl
        opts.coin = $scope.formData.coin
        _importBlob(backupText, opts)
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
      if (!raiblocksService.isValidSeed(seed)) {
        popupService.showAlert(gettextCatalog.getString('Error'), gettextCatalog.getString('The seed is invalid, it should be 64 characters of: 0-9, A-F'))
        return
      }
      ongoingProcess.set('importingWallet', true)
      $timeout(function () {
        profileService.importSeed(seed, function () {
          ongoingProcess.set('importingWallet', false)
          finish(null)
        })
      }, 100)
    }

    var finish = function (wallet) {
      $log.debug('WALLETSERVICE...')
      // walletService.updateRemotePreferences(wallet)

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

    $scope.showAdvChange = function () {
      $scope.showAdv = !$scope.showAdv
      $timeout(function () {
        $scope.resizeView()
      }, 100)
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
