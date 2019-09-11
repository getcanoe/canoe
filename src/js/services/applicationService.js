'use strict'
/* global angular chrome */
angular.module('canoeApp.services')
  .factory('applicationService', function ($rootScope, $state, $timeout, $ionicHistory, $ionicModal, $log, platformInfo, fingerprintService, openURLService, profileService, configService, Idle) {
    var root = {}

    // Current type of modal open, null if not open
    root.openModalType = null       // Type of current modal opened
    root.waitingForSoft = true      // True if we had a soft timeout
    root.backgroundTimestamp = null // When app went to background
    root.idleTimestamp = null       // When idle timeout was reached NOT USED

    // Configuration filled in by root.configureLock()
    root.timeoutSoft = null
    root.lockTypeSoft = null
    root.timeoutHard = null
    root.lockTypeBackground = null

    // Different behaviors on different platforms
    var isChromeApp = platformInfo.isChromeApp
    var isNW = platformInfo.isNW

    // Events via ngIdle to detect idleness
    $rootScope.$on('IdleStart', function () {
      root.idleTimestamp = new Date()
      $log.debug('Idle ' + (root.waitingForSoft ? 'soft' : 'hard') + ' timeout detected at: ' + new Date())
    })

    // User started doing something again
    $rootScope.$on('IdleEnd', function () {
      root.idleTimestamp = null
      // If we were waiting for hard, we switch back to soft
      if (!root.waitingForSoft) {
        root.startWaitingForSoft()
      }
    })

    $rootScope.$on('IdleTimeout', function () {
      root.idleTimestamp = null
      // Was this a soft timeout?
      if (root.waitingForSoft) {
        root.startWaitingForHard()
        root.lockSoft()
      } else {
        root.lockHard()
      }
    })

    // Make sure we have proper configuration
    root.init = function () {
      configService.whenAvailable(function (config) {
        root.configureLock(config.wallet)
      })
    }

    // Called whenever lock settings are modified or on startup
    root.configureLock = function (obj) {
      var settings = obj || configService.getSync().wallet
      root.timeoutSoft = settings.timeoutSoft
      root.lockTypeSoft = settings.lockTypeSoft
      root.timeoutHard = settings.timeoutHard
      root.lockTypeBackground = settings.lockTypeBackground
      root.startWaitingForSoft()
    }

    root.startWaitingForSoft = function () {
      root.waitingForSoft = true
      $log.debug('Waiting for soft timeout: ' + root.timeoutSoft)
      Idle.setIdle(root.timeoutSoft)
      Idle.setTimeout(1)
      Idle.watch()
    }

    root.startWaitingForHard = function () {
      root.waitingForSoft = false
      $log.debug('Waiting for hard timeout: ' + root.timeoutHard)
      Idle.setIdle(root.timeoutHard)
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
        root.openModalType = 'fingerprint'
        scope.openModal()
      })
      scope.openModal = function () {
        scope.fingerprintCheckModal.show()
        scope.checkFingerprint()
      }
      root.hideModal = scope.hideModal = function () {
        root.openModalType = null
        scope.fingerprintCheckModal.hide()
        root.startWaitingForSoft()
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
      // Remove wallet from RAM
      if (profileService.getWallet()) {
        $log.debug('Unloading wallet')
        profileService.unloadWallet()
      }
      var scope = $rootScope.$new(true)
      scope.action = action
      $ionicModal.fromTemplateUrl('views/modals/password.html', {
        scope: scope,
        animation: 'none',
        backdropClickToClose: false,
        hardwareBackButtonClose: false
      }).then(function (modal) {
        scope.passwordModal = modal
        root.openModalType = 'password'
        scope.openModal()
      })
      scope.openModal = function () {
        scope.passwordModal.show()
      }
      root.hideModal = scope.hideModal = function () {
        scope.$emit('passwordModalClosed')
        root.openModalType = null
        scope.passwordModal.hide()
        root.startWaitingForSoft()
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
        root.openModalType = 'pin'
        scope.openModal()
      })
      scope.openModal = function () {
        scope.pinModal.show()
      }
      root.hideModal = scope.hideModal = function () {
        scope.$emit('pinModalClosed')
        root.openModalType = null
        scope.pinModal.hide()
        root.startWaitingForSoft()
      }
    }

    // When app goes into background
    root.lockBackground = function (force) {
      root.backgroundTimestamp = new Date()
      root.lock(root.lockTypeBackground, force)
    }

    // When soft timeout is reached, we lock soft if not already locked
    root.lockSoft = function (force) {
      if (!root.openModalType) {
        $log.debug('Locking soft: ' + new Date())
        root.lock(root.lockTypeSoft, force)
      } else {
        $log.debug('Already locked, not locking soft')
      }
    }

    // When hard timeout is reached, we lock hard
    root.lockHard = function (force) {
      $log.debug('Locking hard: ' + new Date())
      root.lock('password', force)
    }
    
    // When starting BCB wallet etc
    root.lockStartup = function () {
      root.lock('password', true, true)
    }

    root.lockPassword = function () {
      root.lock('password', true)
    }

    // Called on resume, need to check time passed in background
    root.verifyLock = function () {
      var timePassed = (new Date() - root.backgroundTimestamp) / 1000
      $log.debug('Time passed in background: ' + timePassed)
      if (timePassed > root.timeoutHard) {
        // Force to hard lock
        root.lockHard(true)
      } else if (timePassed > root.timeoutSoft) {
        // Try soft lock
        root.lockSoft()
      }
    }

    root.lock = function (type, force, startup) {
      if (!startup && profileService.getWallet() === null) {
        $log.debug('No wallet, not locking')
        root.startWaitingForSoft()
        return
      }
      if ($state.is('tabs.preferencesSecurity.changeLocks')) {
        $log.debug('In lock settings, not locking')
        root.startWaitingForSoft()
        return
      }
      if (root.openModalType === type) return // Already locked by that type
      if (root.openModalType) {
        if (force) {
          $log.debug('Force hide current lock')
          root.hideModal()
        } else {
          $log.debug('Already locked, not locking')
          return // Already locked by other type
        }
      }
      $log.debug('Applying lock: ' + type)
      if (type === 'none') return
      if (type === 'fingerprint') {
        if (fingerprintService.isAvailable()) {
          root.fingerprintModal()
        } else {
          // Hmmm, fallback. We should not end up here normally, and PIN may not have been configured.
          // TODO: popup?
          root.passwordModal('check')
        }
      } 
      if (type === 'password') root.passwordModal('check')
      // TODO: Verify PIN has been configured?
      if (type === 'pin') root.pinModal('check')
    }

    return root
  })
