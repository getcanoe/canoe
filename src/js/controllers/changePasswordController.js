'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('changePasswordController', function ($state, $rootScope, $scope, $timeout, $log, configService, gettextCatalog, fingerprintService, profileService, lodash, applicationService) {
  function getPassword (cb) {
    if ($scope.password) return cb(null, $scope.password)
    walletService.prepare(wallet, function (err, password) {
      if (err) return cb(err)
      $scope.password = password
      return cb(null, password)
    })
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
})
