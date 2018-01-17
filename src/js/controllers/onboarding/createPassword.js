'use strict';

angular
  .module('canoeApp.controllers')
  .controller('createPasswordController', function(
    $scope,
    $state,
    $log,
    $timeout,
    $http,
    $httpParamSerializer,
    $ionicConfig,
    profileService,
    configService,
    walletService,
    appConfigService,
    emailService,
    passwordCheck,
  ) {
    $scope.submitForm = function() {
      if (
        $scope.signUp.$valid &&
        $scope.signUp.password.$viewValue ==
          $scope.signUp.confirmPassword.$viewValue
      ) {
        alert('Its a match!');
      }
    };
  });
