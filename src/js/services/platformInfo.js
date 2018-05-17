'use strict'
/* global angular */
angular.module('canoeApp.services').factory('platformInfo', function ($window) {
  var ua = navigator ? navigator.userAgent : null
  var isNW
  var nwOS

  if (!ua) {
    console.log('Could not determine navigator. Using fixed string')
    ua = 'dummy user-agent'
  }

  // Fixes IOS WebKit UA
  ua = ua.replace(/\(\d+\)$/, '')

  var isNodeWebkit = function () {
    var isNode = (typeof process !== 'undefined' && typeof require !== 'undefined')
    if (isNode) {
      try {
        // This is NW
        return (typeof require('nw.gui') !== 'undefined')
      } catch (e) {
        return false
      }
    }
  }

  // Detect OS of NWJs
  var isNW = !!isNodeWebkit()
  if (isNW) {
    var os = require('os')
    nwOS = os.platform()
    console.log('Detected OS: ' + nwOS)
  }
  

  // Detect mobile devices and platforms
  var ret = {
    isAndroid: ionic.Platform.isAndroid(),
    isIOS: ionic.Platform.isIOS(),
    isWP: ionic.Platform.isWindowsPhone() || ionic.Platform.platform() == 'edge',
    isSafari: Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0,
    ua: ua,
    isCordova: !!$window.cordova,
    isNW: isNW,
    isLinux: nwOS === 'linux',
    isOSX: nwOS === 'darwin',
    isWindows: (nwOS === 'win64' || nwOS === 'win32')
  }

  ret.isMobile = ret.isAndroid || ret.isIOS || ret.isWP
  ret.isChromeApp = !!($window.chrome && chrome.runtime && chrome.runtime.id && !ret.isNW)
  ret.isDevel = !ret.isMobile && !ret.isChromeApp && !ret.isNW

  //ret.supportsLedger = ret.isChromeApp
  //ret.supportsTrezor = ret.isChromeApp || ret.isDevel

  //ret.versionIntelTEE = getVersionIntelTee()
  //ret.supportsIntelTEE = ret.versionIntelTEE.length > 0

  return ret
})
