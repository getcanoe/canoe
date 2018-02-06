'use strict'
/* global angular chrome */
angular.module('canoeApp.services').factory('openURLService', function ($rootScope, $ionicHistory, $document, $log, $state, platformInfo, lodash, profileService, incomingData, appConfigService) {
  var root = {}

  var handleOpenURL = function (args) {
    $log.info('Handling Open URL: ' + JSON.stringify(args))
    // Stop it from caching the first view as one to return when the app opens
    $ionicHistory.nextViewOptions({
      historyRoot: true,
      disableBack: false,
      disableAnimation: true
    })

    var url = args.url
    if (!url) {
      $log.error('No url provided')
      return
    }

    if (url) {
      if ('cordova' in window) {
        window.cordova.removeDocumentEventHandler('handleopenurl')
        window.cordova.addStickyDocumentEventHandler('handleopenurl')
      }
      document.removeEventListener('handleopenurl', handleOpenURL)
    }

    document.addEventListener('handleopenurl', handleOpenURL, false)

    if (!incomingData.redir(url)) {
      $log.warn('Unknown URL! : ' + url)
    }
  }

  var handleResume = function () {
    $log.debug('Handle Resume @ openURL...')
    document.addEventListener('handleopenurl', handleOpenURL, false)
  }

  root.init = function () {
    $log.debug('Initializing openURL')
    document.addEventListener('handleopenurl', handleOpenURL, false)
    document.addEventListener('resume', handleResume, false)

    if (platformInfo.isChromeApp) {
      $log.debug('Registering Chrome message listener')
      chrome.runtime.onMessage.addListener(
        function (request, sender, sendResponse) {
          if (request.url) {
            handleOpenURL(request.url)
          }
        })
    } else if (platformInfo.isNW) {
      var gui = require('nw.gui')

      // This event is sent to an existent instance of Canoe (only for standalone apps)
      gui.App.on('open', function (pathData) {
        if (pathData.indexOf(/^bitcoin(cash)?:/) !== -1) {
          $log.debug('Bitcoin URL found')
          handleOpenURL({
            url: pathData.substring(pathData.indexOf(/^bitcoin(cash)?:/))
          })
        } else if (pathData.indexOf(appConfigService.name + '://') !== -1) {
          $log.debug(appConfigService.name + ' URL found')
          handleOpenURL({
            url: pathData.substring(pathData.indexOf(appConfigService.name + '://'))
          })
        }
      })

      // Used at the startup of Canoe
      var argv = gui.App.argv
      if (argv && argv[0]) {
        handleOpenURL({
          url: argv[0]
        })
      }
    } else if (platformInfo.isDevel) {
      var base = window.location.origin + '/'
      var url = base + '#/uri/%s'

      if (navigator.registerProtocolHandler) {
        $log.debug('Registering Browser handlers base:' + base)
        // These two not allowed, see: https://developer.mozilla.org/en-US/docs/Web/API/Navigator/registerProtocolHandler
        // navigator.registerProtocolHandler('nano', url, 'Canoe Nano Handler')
        // navigator.registerProtocolHandler('xrb', url, 'Canoe XRB Handler')
        navigator.registerProtocolHandler('web+nano', url, 'Canoe web Nano Handler')
        navigator.registerProtocolHandler('web+canoe', url, 'Canoe Wallet Handler')
        navigator.registerProtocolHandler('web+xrb', url, 'Canoe web XRB Handler')
      }
    }
  }

  root.registerHandler = function (x) {
    $log.debug('Registering URL Handler: ' + x.name)
    root.registeredUriHandlers.push(x)
  }

  root.handleURL = function (args) {
    profileService.whenAvailable(function () {
      // Wait ux to settle
      setTimeout(function () {
        handleOpenURL(args)
      }, 1000)
    })
  }

  return root
})
