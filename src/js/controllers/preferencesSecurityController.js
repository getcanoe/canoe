'use strict'

angular.module('canoeApp.controllers').controller('preferencesSecurity', function ($state, $rootScope, $scope, $timeout, $log, configService, gettextCatalog, fingerprintService, profileService, lodash, applicationService) {
  function init () {
    $scope.options = [
      {
        method: 'none',
        label: gettextCatalog.getString('Disabled'),
        disabled: false
      },
      {
        method: 'pin',
        label: gettextCatalog.getString('Lock by PIN'),
        disabled: false
      }
    ]

    if (fingerprintService.isAvailable()) {
      $scope.options.push({
        method: 'fingerprint',
        label: gettextCatalog.getString('Lock by Fingerprint'),
        disabled: false
      })
    }

    initMethodSelector()
  }

  $scope.$on('$ionicView.beforeEnter', function (event) {
    init()
  })

  function getSavedMethod () {
    var config = configService.getSync()
    if (config.lock && config.lock.method) return config.lock.method
    return 'none'
  }

  function initMethodSelector () {
    function disable (method) {
      lodash.find($scope.options, {
        method: method
      }).disabled = true
    };

    var savedMethod = getSavedMethod()

    lodash.each($scope.options, function (o) {
      o.disabled = false
    })

    // HACK: Disable until we allow to change between methods directly
    if (fingerprintService.isAvailable()) {
      switch (savedMethod) {
        case 'pin':
          disable('fingerprint')
          break
        case 'fingerprint':
          disable('pin')
          break
      }
    }

    $scope.currentOption = lodash.find($scope.options, {
      method: savedMethod
    })
    $timeout(function () {
      $scope.$apply()
    })
  }


  $scope.select = function (selectedMethod) {
    var savedMethod = getSavedMethod()
    if (savedMethod === selectedMethod) return

    if (selectedMethod === 'none') {
      disableMethod(savedMethod)
    } else {
      enableMethod(selectedMethod)
    }
  }

  function disableMethod (method) {
    switch (method) {
      case 'pin':
        applicationService.pinModal('disable')
        break
      case 'fingerprint':
        fingerprintService.check('unlockingApp', function (err) {
          if (err) init()
          else saveConfig('none')
        })
        break
    }
  }

  function enableMethod (method) {
    switch (method) {
      case 'pin':
        applicationService.pinModal('setup')
        break
      case 'fingerprint':
        saveConfig('fingerprint')
        break
    }
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
