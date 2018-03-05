'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('howToBuyController',
  function ($rootScope, $log, $scope, externalLinkService, gettextCatalog) {
    
    $scope.openCoinbase = function () {
      var url = 'https://coinbase.com'
      var optIn = true
      var title = null
      var message = gettextCatalog.getString('Open Coinbase.com?')
      var okText = gettextCatalog.getString('Open')
      var cancelText = gettextCatalog.getString('Go Back')
      externalLinkService.open(url, optIn, title, message, okText, cancelText)
    }

    $scope.openGemini = function () {
      var url = 'https://gemini.com/'
      var optIn = true
      var title = null
      var message = gettextCatalog.getString('Open Gemini.com?')
      var okText = gettextCatalog.getString('Open')
      var cancelText = gettextCatalog.getString('Go Back')
      externalLinkService.open(url, optIn, title, message, okText, cancelText)
    }

    $scope.openKukoin = function () {
      var url = 'https://www.kucoin.com/'
      var optIn = true
      var title = null
      var message = gettextCatalog.getString('Open Kucoin.com?')
      var okText = gettextCatalog.getString('Open')
      var cancelText = gettextCatalog.getString('Go Back')
      externalLinkService.open(url, optIn, title, message, okText, cancelText)
    }

    $scope.openNanex = function () {
      var url = 'https://nanex.co/'
      var optIn = true
      var title = null
      var message = gettextCatalog.getString('Open Nanex.co?')
      var okText = gettextCatalog.getString('Open')
      var cancelText = gettextCatalog.getString('Go Back')
      externalLinkService.open(url, optIn, title, message, okText, cancelText)
    }

    $scope.openNanoFaucet = function () {
      var url = 'https://www.nanofaucet.org/'
      var optIn = true
      var title = null
      var message = gettextCatalog.getString('Open Nanofaucet.org?')
      var okText = gettextCatalog.getString('Open')
      var cancelText = gettextCatalog.getString('Go Back')
      externalLinkService.open(url, optIn, title, message, okText, cancelText)
    }

    $scope.openRedditNanocurrency = function () {
      var url = 'https://www.reddit.com/r/nanocurrency/'
      var optIn = true
      var title = null
      var message = gettextCatalog.getString('Open Reddit.com?')
      var okText = gettextCatalog.getString('Open')
      var cancelText = gettextCatalog.getString('Go Back')
      externalLinkService.open(url, optIn, title, message, okText, cancelText)
    }
    
  })
