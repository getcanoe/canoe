'use strict'
/* global angular */
angular.module('canoeApp.services').factory('incomingData', function ($log, $state, $timeout, $ionicHistory, $rootScope, lodash, nanoService, scannerService, appConfigService, popupService, gettextCatalog) {
  var root = {}

  root.showMenu = function (data) {
    $rootScope.$broadcast('incomingDataMenu.showMenu', data)
  }

  root.redir = function (data) {
    $log.debug('Processing incoming data: ' + data)

    function sanitizeUri (data) {
      // Fixes when a region uses comma to separate decimals
      var regex = /[\?\&]amount=(\d+([\,\.]\d+)?)/i
      var match = regex.exec(data)
      if (!match || match.length === 0) {
        return data
      }
      var value = match[0].replace(',', '.')
      var newUri = data.replace(regex, value)
      // mobile devices, uris
      newUri.replace('://', ':')
      return newUri
    }

    function getParameterByName (name, url) {
      if (!url) return
      name = name.replace(/[\[\]]/g, '\\$&')
      var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)')
      var results = regex.exec(url)
      if (!results) return null
      if (!results[2]) return ''
      return decodeURIComponent(results[2].replace(/\+/g, ' '))
    }

    function goSend (addr, amount, message) {
      $state.go('tabs.send', {}, {
        'reload': true,
        'notify': $state.current.name !== 'tabs.send'
      })
      // Timeout is required to enable the "Back" button
      $timeout(function () {
        if (amount) {
          $state.transitionTo('tabs.send.confirm', {
            toAmount: amount,
            toAddress: addr,
            description: message
          })
        } else {
          $state.transitionTo('tabs.send.amount', {
            toAddress: addr
          })
        }
      }, 100)
    }

    // Some smart fixes
    data = sanitizeUri(data)
    var code = nanoService.parseQRCode(data)
    if (code === null) {
      return false
    }
    var protocol = code.protocol
    if (protocol === 'xrb' || protocol === 'raiblocks' || protocol === 'nano') {
      if (code.params.amount) {
        $log.debug('Go send ' + JSON.stringify(code))
        goSend(code.account, code.params.amount, code.params.message)
      } else {
        goToAmountPage(code.account)
      }
      return true
    } else if (protocol === 'xrbkey' || protocol === 'nanokey') {
      // A private key
      // xrbkey:<encoded private key>[?][label=<label>][&][message=<message>]

    } else if (protocol === 'xrbseed' || protocol === 'nanoseed') {

    // data extensions for Payment Protocol with non-backwards-compatible request
    /* if ((/^bitcoin(cash)?:\?r=[\w+]/).exec(data)) {
      var coin = 'btc'
      if (data.indexOf('bitcoincash') === 0) coin = 'bch'

      data = decodeURIComponent(data.replace(/bitcoin(cash)?:\?r=/, ''))

      payproService.getPayProDetails(data, function (err, details) {
        if (err) {
          popupService.showAlert(gettextCatalog.getString('Error'), err)
        } else handlePayPro(details, coin)
      })

      return true
    }*/

    // Bitcoin  URL
/*    if (bitcore.URI.isValid(data)) {
      var coin = 'btc'
        var parsed = new bitcore.URI(data)

        var addr = parsed.address ? parsed.address.toString() : ''
        var message = parsed.message

        var amount = parsed.amount ? parsed.amount : ''

        if (parsed.r) {
          payproService.getPayProDetails(parsed.r, function (err, details) {
            if (err) {
              if (addr && amount) goSend(addr, amount, message, coin)
              else popupService.showAlert(gettextCatalog.getString('Error'), err)
            } else handlePayPro(details)
          })
        } else {
          goSend(addr, amount, message, coin)
        }
      return true
    // Cash URI
    } else if (false) {
      var coin = 'bch'
        var parsed = null

        var addr = parsed.address ? parsed.address.toString() : ''
        var message = parsed.message

        var amount = parsed.amount ? parsed.amount : ''

        // paypro not yet supported on cash
        if (parsed.r) {
          payproService.getPayProDetails(parsed.r, function (err, details) {
            if (err) {
              if (addr && amount)
                {goSend(addr, amount, message, coin);}
              else
                {popupService.showAlert(gettextCatalog.getString('Error'), err);}
            }
            handlePayPro(details, coin)
          })
        } else {
          goSend(addr, amount, message, coin)
        }
      return true

    // Cash URI with bitcoin core address version number?
    } else if (bitcore.URI.isValid(data.replace(/^bitcoincash:/, 'bitcoin:'))) {
      $log.debug('Handling bitcoincash URI with legacy address')
        var coin = 'bch'
        var parsed = new bitcore.URI(data.replace(/^bitcoincash:/, 'bitcoin:'))

        var oldAddr = parsed.address ? parsed.address.toString() : ''
        if (!oldAddr) return false

        var addr = ''

        var a = bitcore.Address(oldAddr).toObject()
        addr = null

        // Translate address
        $log.debug('address transalated to:' + addr)
        popupService.showConfirm(
          gettextCatalog.getString('Bitcoin cash Payment'),
          gettextCatalog.getString('Payment address was translated to new Bitcoin Cash address format: ' + addr),
          gettextCatalog.getString('OK'),
          gettextCatalog.getString('Cancel'),
          function (ret) {
            if (!ret) return false

            var message = parsed.message
            var amount = parsed.amount ? parsed.amount : ''

            // paypro not yet supported on cash
            if (parsed.r) {
              payproService.getPayProDetails(parsed.r, function (err, details) {
                if (err) {
                  if (addr && amount)
                    {goSend(addr, amount, message, coin);}
                  else
                    {popupService.showAlert(gettextCatalog.getString('Error'), err);}
                }
                handlePayPro(details, coin)
              })
            } else {
              goSend(addr, amount, message, coin)
            }
          }
        )
      return true
      // Plain URL
    } else if (/^https?:\/\//.test(data)) {
      payproService.getPayProDetails(data, function (err, details) {
        if (err) {
          root.showMenu({
            data: data,
            type: 'url'
          })
          return;
        }
        handlePayPro(details)
        return true
      })
      // Plain Address
    } else if (bitcore.Address.isValid(data, 'livenet') || bitcore.Address.isValid(data, 'testnet')) {
      if ($state.includes('tabs.scan')) {
        root.showMenu({
          data: data,
          type: 'bitcoinAddress'
        })
      } else {
        goToAmountPage(data)
      }
    } else if (false) {
      if ($state.includes('tabs.scan')) {
        root.showMenu({
          data: data,
          type: 'bitcoinAddress',
          coin: 'bch'
        })
      } else {
        goToAmountPage(data, 'bch')
      }
    } else if (data && data.indexOf(appConfigService.name + '://glidera') === 0) {
      var code = getParameterByName('code', data)
      $ionicHistory.nextViewOptions({
        disableAnimate: true
      })
      $state.go('tabs.home', {}, {
        'reload': true,
        'notify': $state.current.name != 'tabs.home'
      }).then(function () {
        $ionicHistory.nextViewOptions({
          disableAnimate: true
        })
        $state.transitionTo('tabs.buyandsell.glidera', {
          code: code
        })
      })
      return true

    } else if (data && data.indexOf(appConfigService.name + '://coinbase') === 0) {
      var code = getParameterByName('code', data)
      $ionicHistory.nextViewOptions({
        disableAnimate: true
      })
      $state.go('tabs.home', {}, {
        'reload': true,
        'notify': $state.current.name != 'tabs.home'
      }).then(function () {
        $ionicHistory.nextViewOptions({
          disableAnimate: true
        })
        $state.transitionTo('tabs.buyandsell.coinbase', {
          code: code
        })
      })
      return true

      // BitPayCard Authentication
    } else if (data && data.indexOf(appConfigService.name + '://') === 0) {
      // Disable BitPay Card
      if (!appConfigService._enabledExtensions.debitcard) return false

      var secret = getParameterByName('secret', data)
      var email = getParameterByName('email', data)
      var otp = getParameterByName('otp', data)
      var reason = getParameterByName('r', data)

      $state.go('tabs.home', {}, {
        'reload': true,
        'notify': $state.current.name != 'tabs.home'
      }).then(function () {
        switch (reason) {
          default:
          case '0':
            // For BitPay card binding
            $state.transitionTo('tabs.bitpayCardIntro', {
              secret: secret,
              email: email,
              otp: otp
            })
          break;
        }
      })
      return true

      // Join
    } else if (data && data.match(/^canoe:[0-9A-HJ-NP-Za-km-z]{70,80}$/)) {
      $state.go('tabs.home', {}, {
        'reload': true,
        'notify': $state.current.name != 'tabs.home'
      }).then(function () {
        $state.transitionTo('tabs.add.join', {
          url: data
        })
      })
      return true

      // Old join
    } else if (data && data.match(/^[0-9A-HJ-NP-Za-km-z]{70,80}$/)) {
      $state.go('tabs.home', {}, {
        'reload': true,
        'notify': $state.current.name != 'tabs.home'
      }).then(function () {
        $state.transitionTo('tabs.add.join', {
          url: data
        })
      })
      return true
    } else if (data && (data.substring(0, 2) == '6P' || checkPrivateKey(data))) {
      root.showMenu({
        data: data,
        type: 'privateKey'
      })
    } else if (data && ((data.substring(0, 2) == '1|') || (data.substring(0, 2) == '2|') || (data.substring(0, 2) == '3|'))) {
      $state.go('tabs.home').then(function () {
        $state.transitionTo('tabs.add.import', {
          code: data
        })
      })
      return true
    } else {*/

      // Example QR urls, see https://github.com/clemahieu/raiblocks/wiki/URI-and-QR-Code-Standard
      // Payment:
      // xrb:xrb_<encoded address>[?][amount=<raw amount>][&][label=<label>][&][message=<message>]
      // Key import:
      // xrbkey:<encoded private key>[?][label=<label>][&][message=<message>]
      // Seed import:
      // xrbseed:<encoded seed>[?][label=<label>][&][message=<message>][&][lastindex=<index>]
      // We could add:
      // Contact?
      // Payment with confirmation

    } else {
      // Offer clipboard
      if ($state.includes('tabs.scan')) {
        root.showMenu({
          data: data,
          type: 'text'
        })
      }
    }
    return false
  }

  function goToAmountPage (toAddress) {
    $state.go('tabs.send', {}, {
      'reload': true,
      'notify': $state.current.name !== 'tabs.send'
    })
    $timeout(function () {
      $state.transitionTo('tabs.send.amount', {
        toAddress: toAddress
      })
    }, 100)
  }

  return root
})
