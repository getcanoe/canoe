'use strict'
/* global angular chrome */
angular.module('canoeApp.services')
  .factory('applicationService', function ($rootScope, $state, $timeout, $ionicHistory, $ionicModal, $log, platformInfo, fingerprintService, openURLService, configService, Idle) {
    var root = {}

    root.isPinModalOpen = false

    var isChromeApp = platformInfo.isChromeApp
    var isNW = platformInfo.isNW

    $rootScope.$on('IdleStart', function () {
      $log.debug('Start idle: ' + new Date())
    })

    $rootScope.$on('IdleEnd', function () {
      $log.debug('End idle: ' + new Date())
    })

    $rootScope.$on('IdleWarn', function (e, countdown) {
      $log.debug('Idle warn ' + countdown + ' : ' + new Date())
    })

    $rootScope.$on('IdleTimeout', function () {
      $log.debug('Locking A: ' + new Date())
      // root.startWaitingForB()
    })

    root.init = function () {
      configService.whenAvailable(function (config) {
        root.configureLock(config.wallet)
      })
    }

    // Called whenever lock settings are modified or on startup
    root.configureLock = function (obj) {
      var settings = obj || configService.getSync().wallet
      root.timeoutA = settings.timeoutA
      root.lockTypeA = settings.lockTypeA
      root.timeoutB = settings.timeoutB
      root.lockTypeBackground = settings.lockTypeBackground
      root.startWaitingForA()
    }

    root.startWaitingForA = function () {
      $log.debug('Waiting for timeout A: ' + root.timeoutA)
      Idle.setIdle(root.timeoutA)
      Idle.setTimeout(1)
      Idle.watch()
    }

    root.restart = function () {
      var hashIndex = window.location.href.indexOf('#/')
      if (platformInfo.isCordova) {
        window.location = window.location.href.substr(0, hashIndex)
        $timeout(function () {
          $rootScope.$digest()
        }, 1)
      } else {
        // Go home reloading the application
        if (isChromeApp) {
          chrome.runtime.reload()
        } else if (isNW) {
          $ionicHistory.removeBackView()
          $state.go('tabs.home')
          $timeout(function () {
            var win = require('nw.gui').Window.get()
            win.menu = null // Make sure we have no menubar
            win.reload(3)
            // or
            win.reloadDev()
          }, 100)
        } else {
          window.location = window.location.href.substr(0, hashIndex)
        }
      }
    }

    root.fingerprintModal = function () {
      var scope = $rootScope.$new(true)
      $ionicModal.fromTemplateUrl('views/modals/fingerprintCheck.html', {
        scope: scope,
        animation: 'none',
        backdropClickToClose: false,
        hardwareBackButtonClose: false
      }).then(function (modal) {
        scope.fingerprintCheckModal = modal
        root.isModalOpen = true
        scope.openModal()
      })
      scope.openModal = function () {
        scope.fingerprintCheckModal.show()
        scope.checkFingerprint()
      }
      scope.hideModal = function () {
        root.isModalOpen = false
        scope.fingerprintCheckModal.hide()
      }
      scope.checkFingerprint = function () {
        fingerprintService.check('unlockingApp', function (err) {
          if (err) return
          $timeout(function () {
            scope.hideModal()
          }, 200)
        })
      }
    }

    root.passwordModal = function (action) {
      var scope = $rootScope.$new(true)
      scope.action = action
      $ionicModal.fromTemplateUrl('views/modals/password.html', {
        scope: scope,
        animation: 'none',
        backdropClickToClose: false,
        hardwareBackButtonClose: false
      }).then(function (modal) {
        scope.passwordModal = modal
        root.isModalOpen = true
        scope.openModal()
      })
      scope.openModal = function () {
        scope.passwordModal.show()
      }
      scope.hideModal = function () {
        scope.$emit('passwordModalClosed')
        root.isModalOpen = false
        scope.passwordModal.hide()
      }
    }

    root.pinModal = function (action) {
      var scope = $rootScope.$new(true)
      scope.action = action
      $ionicModal.fromTemplateUrl('views/modals/pin.html', {
        scope: scope,
        animation: 'none',
        backdropClickToClose: false,
        hardwareBackButtonClose: false
      }).then(function (modal) {
        scope.pinModal = modal
        root.isModalOpen = true
        scope.openModal()
      })
      scope.openModal = function () {
        scope.pinModal.show()
      }
      scope.hideModal = function () {
        scope.$emit('pinModalClosed')
        root.isModalOpen = false
        scope.pinModal.hide()
      }
    }

    root.appLockModal = function (action) {
      if (root.isModalOpen) return
      root.passwordModal(action)
/*
      configService.whenAvailable(function (config) {
        var lockMethod = config.lock && config.lock.method
        if (!lockMethod || lockMethod === 'none') return
        if (lockMethod === 'fingerprint' && fingerprintService.isAvailable()) root.fingerprintModal()
        if (lockMethod === 'password') root.passwordModal(action)
        if (lockMethod === 'pin') root.pinModal(action)
      })
*/
    }
    return root
  })
