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
    profileService
  ) {
    $scope.submitForm = function(pw) {
      console.log(password)
      profileService.enteredPassword(pw)
    };
  });
