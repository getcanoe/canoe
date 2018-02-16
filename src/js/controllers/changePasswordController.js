'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('changePasswordController', function ($state, $rootScope, $scope, $log, profileService) {
  $scope.changePassword = function (pw, oldPw) {
    profileService.changePassword(pw, oldPw)
  }
})
