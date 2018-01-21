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
    $scope.submitForm = function(password) {
        alert(password);
    };
  });
