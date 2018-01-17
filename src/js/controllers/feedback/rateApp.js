'use strict'

angular.module('canoeApp.controllers').controller('rateAppController', function ($scope, $state, $stateParams, $window, lodash, externalLinkService, configService, platformInfo, feedbackService, ongoingProcess, popupService, appConfigService) {
  $scope.score = parseInt($stateParams.score)
  $scope.appName = appConfigService.nameCase
  var isAndroid = platformInfo.isAndroid
  var isIOS = platformInfo.isIOS

  var config = configService.getSync()

  $scope.skip = function () {
    var dataSrc = {
      'Email': lodash.values(config.emailFor)[0] || ' ',
      'Feedback': ' ',
      'Score': $stateParams.score,
      'AppVersion': $window.version,
      'Platform': ionic.Platform.platform(),
      'DeviceVersion': ionic.Platform.version()
    }
    feedbackService.send(dataSrc, function (err) {
      if (err) {
        // try to send, but not essential, since the user didn't add a message
        $log.warn('Could not send feedback.')
      }
    })
    $state.go('tabs.rate.complete', {
      score: $stateParams.score,
      skipped: true
    })
  }

  $scope.sendFeedback = function () {
    $state.go('tabs.rate.send', {
      score: $scope.score
    })
  }

  $scope.goAppStore = function () {
    var defaults = configService.getDefaults()
    var url
    if (isAndroid) { url = defaults.rateApp.canoe.android }
    if (isIOS) { url = defaults.rateApp.canoe.ios }

    externalLinkService.open(url)
    $state.go('tabs.rate.complete', {
      score: $stateParams.score,
      skipped: true,
      rated: true
    })
  }
})
