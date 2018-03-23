'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('preferencesSecurityController', function ($state, $rootScope, $scope, $timeout, $log, configService, gettextCatalog, fingerprintService, profileService, lodash, applicationService) {
  function init () {
 
  }

  $scope.$on('$ionicView.beforeEnter', function (event) {
    init()
  })

  $scope.changePIN = function () {
    applicationService.pinModal('setup')
  }

  $rootScope.$on('pinModalClosed', function () {
    init()
  })
})
