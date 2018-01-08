'use strict'
angular.module('canoeApp.controllers').controller('paymentUriController',
  function ($rootScope, $scope, $stateParams, $location, $timeout, $ionicHistory, profileService, configService, lodash, $state) {
    function strip (number) {
      return (parseFloat(number.toPrecision(12)))
    };

    // Build bitcoinURI with querystring
    this.init = function () {
      var query = []
      this.bitcoinURI = $stateParams.url

      //var URI = bitcore.URI
      var isUriValid = URI.isValid(this.bitcoinURI)
      if (!URI.isValid(this.bitcoinURI)) {
        this.error = true
        return
      }
      var uri = new URI(this.bitcoinURI)

      if (uri && uri.address) {
        var config = configService.getSync().wallet.settings
        var unitToRaw = config.unitToRaw
        var rawToUnit = 1 / unitToRaw
        var unitName = config.unitName

        if (uri.amount) {
          uri.amount = strip(uri.amount * rawToUnit) + ' ' + unitName
        }
        uri.network = uri.address.network.name
        this.uri = uri
      }
    }

    this.getAccounts = function (network) {
      $scope.accounts = []
      lodash.forEach(profileService.getAccounts(network), function (w) {
        var client = profileService.getClient(w.id)
        profileService.isReady(client, function (err) {
          if (err) return
          $scope.accounts.push(w)
        })
      })
    }

    this.selectWallet = function (wid) {
      var self = this
      profileService.setAndStoreFocus(wid, function () {})
      $ionicHistory.removeBackView()
      $state.go('tabs.home')
      $timeout(function () {
        $rootScope.$emit('paymentUri', self.bitcoinURI)
      }, 1000)
    }
  })
