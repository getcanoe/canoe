'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('createController',
  function ($scope, $timeout, $log, $state, $ionicScrollDelegate, $ionicHistory, profileService, gettextCatalog, ongoingProcess, popupService) {

    $scope.$on('$ionicView.beforeEnter', function (event, data) {
      $scope.formData = {}
    })

    $scope.resizeView = function () {
      $timeout(function () {
        $ionicScrollDelegate.resize()
      }, 10)
    }

    $scope.create = function () {
      var name = $scope.formData.accountName
      if (profileService.getAccountWithName(name)) {
        popupService.showAlert(gettextCatalog.getString('Error'), gettextCatalog.getString('An account already exists with that name'))
        return
      }
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
