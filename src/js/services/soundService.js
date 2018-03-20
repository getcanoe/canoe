'use strict'
/* global angular Media Audio */
angular.module('canoeApp.services').factory('soundService', function ($log, platformInfo) {
  var root = {}
  var isCordova = platformInfo.isCordova

  // Finding base
  var p = window.location.pathname
  var base = p.substring(0, p.lastIndexOf('/')) + '/sounds/'

  // Register sounds, use them like:
  //   soundService.play('send')
  root.sounds = {}
  root.sounds.receive = makeMedia('cash.ogg')
  root.sounds.send = makeMedia('bling.ogg')
  root.sounds.unlocking = makeMedia('houston.ogg')

  function makeMedia (path) {
    if (isCordova) {
      // Return media instance
      return new Media(base + path,
        // success callback
        function () {
          $log.debug('playAudio():Audio Success')
        },
        // error callback
        function (err) {
          $log.debug('playAudio():Audio Error: ' + JSON.stringify(err))
        })
    } else {
      return new Audio(base + path)
    }
  }

  root.play = function (soundName) {
    var sound = root.sounds[soundName]
    if (sound) {
      sound.play()
    } else {
      $log.warn('Missing sound: ' + soundName)
    }
  }

  return root
})
