'use strict'

angular.module('canoeApp.controllers').controller('createController',
  function ($scope, $rootScope, $timeout, $log, lodash, $state, $ionicScrollDelegate, $ionicHistory, profileService, configService, gettextCatalog, ongoingProcess, walletService, storageService, popupService, appConfigService, pushNotificationsService) {
  
    $scope.$on('$ionicView.beforeEnter', function (event, data) {
      $scope.formData = {}
      var defaults = configService.getDefaults()
      var config = configService.getSync()
      $scope.formData.account = 1
      //$scope.formData.bwsurl = defaults.bws.url
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
      var name = $scope.formData.walletName
      ongoingProcess.set('creatingAccount', true)
      $timeout(function () {
        profileService.createAccount(name, function (err) {
          ongoingProcess.set('creatingAccount', false)
          if (err) {
            $log.warn(err)
            popupService.showAlert(gettextCatalog.getString('Error'), err)
            return
          }
          $ionicHistory.removeBackView()
          $state.go('tabs.home')
        })
      }, 300)
    }
  })
