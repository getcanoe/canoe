'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('preferencesLanguageController',
  function ($scope, $log, $ionicHistory, configService, uxLanguage, externalLinkService, gettextCatalog) {
    $scope.availableLanguages = uxLanguage.getLanguages()

    $scope.openExternalLink = function () {
      var url = 'https://poeditor.com/join/project/cnSZa85DRN'
      var optIn = true
      var title = gettextCatalog.getString('Open Translation Site')
      var message = gettextCatalog.getString('You can make contributions by signing up on our POEditor community translation project. We’re looking forward to hearing from you!')
      var okText = gettextCatalog.getString('Open POEditor')
      var cancelText = gettextCatalog.getString('Go Back')
      externalLinkService.open(url, optIn, title, message, okText, cancelText)
    }

    $scope.save = function (newLang) {
      var opts = {
        wallet: {
          settings: {
            defaultLanguage: newLang
          }
        }
      }

      uxLanguage._set(newLang)
      configService.set(opts, function (err) {
        if (err) $log.warn(err)
      })

      $ionicHistory.goBack()
    }

    $scope.$on('$ionicView.beforeEnter', function (event, data) {
      $scope.currentLanguage = uxLanguage.getCurrentLanguage()
    })
  })
