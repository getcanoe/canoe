'use strict'
/* global angular Media Audio */
angular.module('canoeApp.services').factory('soundService', function ($log, platformInfo) {
  var root = {}
  var isCordova = platformInfo.isCordova
  //var isNW = platformInfo.isNW

  var bling = 'sounds/bling1.mp3'

  root.playSound = function (path) {
    var sound
    if (isCordova) {
      // Play the audio file at url
      sound = new Media(path,
        // success callback
        function () {
          $log.debug('playAudio():Audio Success')
        },
        // error callback
        function (err) {
          $log.debug('playAudio():Audio Error: ' + err)
        }
      )
      // Play audio
      sound.play()
    } else {
      // HTML5 sound
      sound = new Audio(path)
      sound.play()
    }
  }

  root.playBling = function () {
    root.playSound(bling)
  }

  return root
})
