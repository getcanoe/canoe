'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('txDetailsController', function ($log, $ionicHistory, $scope, $state, $timeout, $stateParams, lodash, gettextCatalog, profileService, externalLinkService, addressbookService) {
  var listeners = []

  $scope.$on('$ionicView.beforeEnter', function (event, data) {
    // txId = data.stateParams.txid
    $scope.ntx = $stateParams.ntx
    $scope.hasFunds = profileService.hasFunds()
    $scope.title = gettextCatalog.getString('Transaction')
    $scope.account = profileService.getAccount($stateParams.walletId)
    listeners = []
  })

  addressbookService.list(function (err, ab) {
    if (err) $log.error(err)
    $scope.addressbook = ab || {}
  })

  $scope.refund = function () {
    addressbookService.get($scope.ntx.origin, function (err, addr) {
      $ionicHistory.clearHistory()
      $state.go('tabs.send').then(function () {
        $timeout(function () {
          $state.transitionTo('tabs.send.confirm', {
            recipientType: addr ? 'contact' : null,
            toAmount: $scope.ntx.amount,
            toName: addr ? addr.name : null,
            toAddress: $scope.ntx.origin,
            fromAddress: $stateParams.accountId
            //description: ''
          })
        }, 50)
      })
    })
  }

  $scope.$on('$ionicView.leave', function (event, data) {
    lodash.each(listeners, function (x) {
      x()
    })
  })

  $scope.showCommentPopup = function () {
    /* var opts = {}
    if ($scope.ntx.note) opts.defaultText = $scope.ntx.note
    popupService.showPrompt($scope.account.name, gettextCatalog.getString('Memo'), opts, function (text) {
      if (typeof text === 'undefined') return
      $scope.ntx.note = {
        body: text
      }
      $log.debug('Saving memo')

      var args = {
        hash: $scope.ntx.hash,
        body: text
      }
      walletService.editTxNote($scope.account, args, function (err, res) {
        if (err) {
          $log.debug('Could not save transaction note ' + err)
        }
      })
    }) */
  }

  $scope.viewOnNanode = function () {
    var ntx = $scope.ntx
    var url = 'https://nanode.co/block/' + ntx.hash
    var optIn = true
    var title = null
    var message = gettextCatalog.getString('View Block on Nanode')
    var okText = gettextCatalog.getString('Open')
    var cancelText = gettextCatalog.getString('Go Back')
    externalLinkService.open(url, optIn, title, message, okText, cancelText)
  }
})
