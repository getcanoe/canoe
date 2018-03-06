'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('tabSettingsController', function ($rootScope, $timeout, $scope, appConfigService, $ionicModal, $log, lodash, uxLanguage, platformInfo, profileService, configService, externalLinkService, gettextCatalog, addressbookService, applicationService, $state, $ionicHistory) {
  var updateConfig = function () {
    $scope.currentLanguageName = uxLanguage.getCurrentLanguageName()
    // $scope.buyAndSellServices = buyAndSellService.getLinked()

    configService.whenAvailable(function (config) {
      $scope.selectedAlternative = {
        name: config.wallet.settings.alternativeName,
        isoCode: config.wallet.settings.alternativeIsoCode
      }
    })
  }

  $scope.openDonate = function () {
    addressbookService.getDonate(function (err, ab) {
      if (err) $log.error(err)
      $ionicHistory.removeBackView()
      $state.go('tabs.send')
      $timeout(function () {
        return $state.transitionTo('tabs.send.amount', {
          recipientType: 'contact',
          toAddress: ab.address,
          toName: ab.name,
          toEmail: ab.email,
          toColor: ab.color,
          toAlias: ab.alias
        })
      }, 100)
    })
  }

  $scope.lockCanoe = function () {
    $state.transitionTo('tabs.home').then(function () {
      // Clear history
      $ionicHistory.clearHistory()
    })
    profileService.unloadWallet()
    applicationService.appLockModal('check')
  }

  $scope.openExternalLink = function () {
    var url = 'https://github.com/gokr/canoe/issues'
    var optIn = true
    var title = null
    var message = gettextCatalog.getString('Help and support information is available at the website.')
    var okText = gettextCatalog.getString('Open')
    var cancelText = gettextCatalog.getString('Go Back')
    externalLinkService.open(url, optIn, title, message, okText, cancelText)
  }

  $scope.$on('$ionicView.beforeEnter', function (event, data) {
    $scope.accounts = profileService.getAccounts()
    $scope.isCordova = platformInfo.isCordova
    $scope.isWindowsPhoneApp = platformInfo.isCordova && platformInfo.isWP
    $scope.isDevel = platformInfo.isDevel
    $scope.appName = appConfigService.nameCase
    configService.whenAvailable(function (config) {
      $scope.locked = config.lock && config.lock.method
      if (!$scope.locked || $scope.locked === 'none') { $scope.method = gettextCatalog.getString('Disabled') } else { $scope.method = $scope.locked.charAt(0).toUpperCase() + config.lock.method.slice(1) }
    })
  })

  $scope.$on('$ionicView.enter', function (event, data) {
    updateConfig()
  })
})
