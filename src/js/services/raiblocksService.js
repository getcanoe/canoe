'use strict'
angular.module('raiwApp.services')
  .factory('raiblocksService', function ($log) {
    var root = {}

    var host = 'http://localhost:7076' // default host
    var rai = new Rai(host) // connection

    // Initialization global variables
    rai.initialize()

    root.isValid = function (addr, cb) {
      $log.debug('Validating addr: ' + addr)
      if (!addr.startsWith('xrb_')) {
        return false
      }
      return rai.account_validate(addr)
    }

    /*
    // Version
    var ver = rai.node_vendor()
    $log.debug('Version: ' + ver)

    var key = rai.account_key(addr)
    $log.debug('Key: ' + key)

    var info = rai.account_info(addr)
    $log.debug('Info: ' + JSON.stringify(info))
    */
    return root
  })
