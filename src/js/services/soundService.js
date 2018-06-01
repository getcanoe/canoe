'use strict'
/* global angular Media Audio */
angular.module('canoeApp.services').factory('soundService', function ($log, platformInfo, configService) {
  var root = {}
  var isCordova = platformInfo.isCordova

  // Finding base
  var p = window.location.pathname
  var base = p.substring(0, p.lastIndexOf('/')) + '/sounds/'

  // Register sounds, use them like:
  //   soundService.play('send')
  root.sounds = {}
  root.sounds.send = makeMedia('locked.ogg')
  root.sounds.receive = makeMedia('definite.ogg')
  root.sounds.unlocking = makeMedia('confirmed.ogg')
  root.sounds.repchanged = makeMedia('filling-your-inbox.ogg')

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
    configService.get(function (err, config) {
      if (err) return $log.debug(err)
      // Fallback for existing configs
      if (typeof config.wallet.playSounds === "undefined") {
        config.wallet.playSounds = true
        var opts = {
          wallet: {
            playSounds: true
          }
        }
        configService.set(opts, function (err) {
          if (err) $log.debug(err)
        })
      }
      if (config.wallet && config.wallet.playSounds === true) {
        var sound = root.sounds[soundName]
        if (sound) {
          try {
            sound.play()
          } catch (e) {
            $log.warn('Audo play failed:' + JSON.stringify(e))
          }
        } else {
          $log.warn('Missing sound: ' + soundName)
        }
      } else {
        $log.warn('Sounds are disabled not playing: ' + soundName)
      }
    })
  }

  return root
})
