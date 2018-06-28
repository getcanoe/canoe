'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('changePasswordController', function ($scope, $state, $timeout, $log, $ionicHistory, profileService, popupService, gettextCatalog) {
  $scope.oldPassword = ''
  $scope.password = ''
  $scope.confirmPassword = ''
  $scope.typePassword1 = false
  $scope.typePassword2 = false
  $scope.typePassword3 = false

  $scope.changePass = function (pw, oldPw) {
    if (!profileService.checkPassword(oldPw)) {
      popupService.showAlert(gettextCatalog.getString('Information'), gettextCatalog.getString('Your old password was not entered correctly'))
    } else {
      profileService.changePass(pw, oldPw)
      popupService.showAlert(gettextCatalog.getString('Information'), gettextCatalog.getString('Your password has been changed'))
      $ionicHistory.removeBackView()
      $state.go('tabs.home')
    }
  }

  $scope.togglePassword = function (typePasswordStr) {
   $scope[typePasswordStr] = !$scope[typePasswordStr]
  }

  $scope.$on('$ionicView.beforeEnter', function (event, data) {
    $scope.oldPassword = ''
    $scope.password = ''
    $scope.confirmPassword = ''
    $timeout(function () {
      $scope.$apply()
    })
  })
})
