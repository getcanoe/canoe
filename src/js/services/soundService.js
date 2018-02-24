'use strict'
/* global angular Media Audio */
angular.module('canoeApp.services').factory('soundService', function ($log, platformInfo) {
  var root = {}
  var isCordova = platformInfo.isCordova
  // var isNW = platformInfo.isNW

  var bling = makeMedia('sounds/bling1.mp3')

  function makeMedia (path) {
    /* if (isCordova) {
      // Play the audio file at url
      return Media(path,
        // success callback
        function () {
          $log.debug('playAudio():Audio Success')
        },
        // error callback
        function (err) {
          $log.debug('playAudio():Audio Error: ' + err)
        })
    } else {*/
      return new Audio(path)
    /*} */
  }

  root.playBling = function () {
    bling.play()
  }

  return root
})
