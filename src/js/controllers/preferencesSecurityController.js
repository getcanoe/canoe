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

  function saveConfig (method) {
    var opts = {
      lock: {
        method: method,
        value: null
      }
    }
    configService.set(opts, function (err) {
      if (err) $log.debug(err)
      initMethodSelector()
    })
  }

  $rootScope.$on('pinModalClosed', function () {
    init()
  })
})
