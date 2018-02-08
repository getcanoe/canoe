'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('passwordController', function ($state, $interval, $stateParams, $ionicHistory, $timeout, $scope, $log, configService, profileService, applicationService) {
  var ATTEMPT_LIMIT = 5
  var ATTEMPT_LOCK_OUT_TIME = 5 * 60
  var currentPassword = ''

  $scope.match = $scope.error = $scope.disableButton = false
  $scope.currentAttempts = 0
  $scope.password = ''

  $scope.$on('$ionicView.beforeEnter', function (event, data) {
    $scope.password = ''
  })

  configService.whenAvailable(function (config) {
    if (!config.lock) return
    $scope.bannedUntil = config.lock.bannedUntil || null
    if ($scope.bannedUntil) {
      var now = Math.floor(Date.now() / 1000)
      if (now < $scope.bannedUntil) {
        $scope.error = $scope.disableButton = true
        lockTimeControl($scope.bannedUntil)
      }
    }
  })

  function checkAttempts () {
    $scope.currentAttempts += 1
    $log.debug('Attempts to unlock:', $scope.currentAttempts)
    if ($scope.currentAttempts === ATTEMPT_LIMIT) {
      $scope.currentAttempts = 0
      var bannedUntil = Math.floor(Date.now() / 1000) + ATTEMPT_LOCK_OUT_TIME
      saveFailedAttempt(bannedUntil)
    }
  }

  function lockTimeControl (bannedUntil) {
    setExpirationTime()

    var countDown = $interval(function () {
      setExpirationTime()
    }, 1000)

    function setExpirationTime () {
      var now = Math.floor(Date.now() / 1000)
      if (now > bannedUntil) {
        if (countDown) reset()
      } else {
        $scope.disableButton = true
        var totalSecs = bannedUntil - now
        var m = Math.floor(totalSecs / 60)
        var s = totalSecs % 60
        $scope.expires = ('0' + m).slice(-2) + ':' + ('0' + s).slice(-2)
      }
    }

    function reset () {
      $scope.expires = $scope.error = $scope.disableButton = null
      currentPassword = ''
      $interval.cancel(countDown)
      $timeout(function () {
        $scope.$apply()
      })
    }
  }

  $scope.unlock = function (value) {
    if ($scope.disableButton) return // Should not happen
    $scope.error = false
    currentPassword = value
    profileService.enteredPassword(currentPassword)
    // Now we try to load wallet and if it fails, ask user again
    profileService.loadWallet(function (err) {
      if (err) {
        $scope.password = ''
        $log.debug('Error loading wallet: ' + err)
        showError()
        checkAttempts()
      } else {
        $scope.hideModal()
      }
    })
  }

  function showError () {
    $timeout(function () {
      currentPassword = ''
      $scope.error = true
    }, 200)
    $timeout(function () {
      $scope.$apply()
    })
  }

  function saveFailedAttempt (bannedUntil) {
    var opts = {
      lock: {
        bannedUntil: bannedUntil
      }
    }
    configService.set(opts, function (err) {
      if (err) $log.debug(err)
      lockTimeControl(bannedUntil)
    })
  }
})
