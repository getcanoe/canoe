'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('exportController',
  function ($scope, $timeout, $log, $ionicHistory, $ionicScrollDelegate, backupService, storageService, profileService, platformInfo, gettextCatalog, $state, $stateParams, popupService) {
    var wallet = profileService.getAccount($stateParams.walletId)
    $scope.wallet = wallet
    $scope.typePassword = false

    $scope.resizeView = function () {
      $timeout(function () {
        $ionicScrollDelegate.resize()
      }, 10)
    }

    $scope.checkPassword = function (pw) {
      if (profileService.checkPassword(pw)) {
        $scope.result = 'correct'
        $scope.passwordCorrect = true
      } else {
        $scope.result = 'incorrect'
        $scope.passwordCorrect = false
      }
    }

    $scope.togglePassword = function (typePasswordStr) {
      $scope[typePasswordStr] = !$scope[typePasswordStr]
    }

    $scope.generateQrCode = function () {
      if ($scope.formData.seedURI) {
        $scope.file.value = false
      }
      var seedURI = profileService.getSeedURI($scope.formData.password)
      if (!seedURI) {
        popupService.showAlert(gettextCatalog.getString('Error'), gettextCatalog.getString('Failed to generate seed QR code'))
        return
      }
      $scope.formData.seedURI = seedURI
      $scope.file.value = false
      $timeout(function () {
        $scope.$apply()
      })
    }

    var init = function () {
      $scope.formData = {}
      $scope.formData.password = ''
      $scope.passwordCorrect = false
      $scope.isCordova = platformInfo.isCordova
      $scope.isSafari = platformInfo.isSafari
      $scope.wallet = wallet
    }

    $scope.downloadWalletBackup = function () {
      $scope.getAddressbook(function (err, localAddressBook) {
        if (err) {
          popupService.showAlert(gettextCatalog.getString('Error'), gettextCatalog.getString('Failed to export'))
          return
        }
        var opts = {
          addressBook: localAddressBook,
          password: $scope.password
        }

        backupService.walletDownload($scope.formData.password, opts, function (err) {
          if (err) {
            popupService.showAlert(gettextCatalog.getString('Error'), gettextCatalog.getString('Failed to export'))
            return
          }
          $ionicHistory.removeBackView()
          $state.go('tabs.home')
        })
      })
    }

    $scope.getAddressbook = function (cb) {
      storageService.getAddressbook(function (err, addressBook) {
        if (err) return cb(err)

        var localAddressBook = []
        try {
          localAddressBook = JSON.parse(addressBook)
        } catch (ex) {
          $log.warn(ex)
        }

        return cb(null, localAddressBook)
      })
    }

    $scope.getBackup = function (cb) {
      $scope.getAddressbook(function (err, localAddressBook) {
        if (err) {
          popupService.showAlert(gettextCatalog.getString('Error'), gettextCatalog.getString('Failed to export'))
          return cb(null)
        }
        var opts = {
          addressBook: localAddressBook,
          password: $scope.formData.password
        }
        var ew = backupService.walletExport($scope.formData.password, opts)
        if (!ew) {
          popupService.showAlert(gettextCatalog.getString('Error'), gettextCatalog.getString('Failed to export'))
        }
        return cb(ew)
      })
    }

    $scope.viewWalletBackup = function () {
      $timeout(function () {
        $scope.getBackup(function (backup) {
          var ew = backup
          if (!ew) return
          $scope.backupWalletPlainText = ew
        })
      }, 100)
    }

    $scope.copyWalletBackup = function () {
      $scope.getBackup(function (backup) {
        var ew = backup
        if (!ew) return
        window.cordova.plugins.clipboard.copy(ew)
        window.plugins.toast.showShortCenter(gettextCatalog.getString('Copied to clipboard'))
      })
    }

    $scope.sendWalletBackup = function () {
      window.plugins.toast.showShortCenter(gettextCatalog.getString('Preparing backup...'))
      $scope.getBackup(function (backup) {
        var ew = backup
        if (!ew) return
        var subject = 'BCB Wallet Backup'
        var body = 'Here is the encrypted backup of the wallet.\n\n' + ew + '\n\n To import this backup, copy all text between {...}, including the symbols {}'
        window.plugins.socialsharing.shareViaEmail(
          body,
          subject,
          null, // TO: must be null or an array
          null, // CC: must be null or an array
          null, // BCC: must be null or an array
          null, // FILES: can be null, a string, or an array
          function () {},
          function () {}
        )
      })
    }

    $scope.$on('$ionicView.beforeEnter', function (event, data) {
      init()
      $scope.file = {
        value: true
      }
      $scope.formData.seedURI = null
      $scope.password = null
      $scope.result = null
    })
  })
