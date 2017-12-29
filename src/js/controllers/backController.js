'use strict'

angular.module('canoeApp.controllers').controller('backController', function ($scope, $state, $stateParams) {
  $scope.importGoBack = function () {
    if ($stateParams.fromOnboarding) $state.go('onboarding.welcome')
    else $state.go('tabs.add')
  }

  $scope.onboardingMailSkip = function () {
    $state.go('onboarding.backupRequest')
  }
})
