'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('changePasswordController', function ($scope, $state, $stateParams, $log, $ionicHistory, profileService, popupService, gettextCatalog) {
  $scope.changePass = function (pw, oldPw) {
    profileService.changePass(pw, oldPw)
    popupService.showAlert(gettextCatalog.getString('Information'), gettextCatalog.getString('Your password has been changed'))
    $ionicHistory.removeBackView()
    $state.go('tabs.home')
  }
})
