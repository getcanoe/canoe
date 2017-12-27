'use strict'

angular.module('raiwApp.controllers').controller('customAmountController', function ($scope, $ionicHistory, txFormatService, platformInfo, configService, profileService, walletService, popupService) {
  var showErrorAndBack = function (title, msg) {
    popupService.showAlert(title, msg, function () {
      $scope.close()
    })
  }

  $scope.$on('$ionicView.beforeEnter', function (event, data) {
    var walletId = data.stateParams.id

    if (!walletId) {
      showErrorAndBack('Error', 'No wallet selected')
      return
    }

    $scope.showShareButton = platformInfo.isCordova ? (platformInfo.isIOS ? 'iOS' : 'Android') : null

    $scope.account = profileService.getAccount(walletId)

    walletService.getAddress($scope.account, false, function (err, addr) {
      if (!addr) {
        showErrorAndBack('Error', 'Could not get the address')
        return
      }

      $scope.address = addr

      $scope.coin = data.stateParams.coin
      var parsedAmount = txFormatService.parseAmount(
        $scope.account.coin,
        data.stateParams.amount,
        data.stateParams.currency)

      // Amount in USD or BTC
      var amount = parsedAmount.amount
      var currency = parsedAmount.currency
      $scope.amountUnitStr = parsedAmount.amountUnitStr

      if (currency != 'BTC' && currency != 'BCH') {
        // Convert to BTC or BCH
        var config = configService.getSync().wallet.settings
        var amountUnit = txFormatService.satToUnit(parsedAmount.amountSat)
        var btcParsedAmount = txFormatService.parseAmount($scope.account.coin, amountUnit, $scope.account.coin)

        $scope.amountBtc = btcParsedAmount.amount
        $scope.altAmountStr = btcParsedAmount.amountUnitStr
      } else {
        $scope.amountBtc = amount // BTC or BCH
        $scope.altAmountStr = txFormatService.formatAlternativeStr($scope.account.coin, parsedAmount.amountSat)
      }
    })
  })

  $scope.close = function () {
    $ionicHistory.nextViewOptions({
      disableAnimate: true
    })
    $ionicHistory.goBack(-2)
  }

  $scope.shareAccount = function () {
    if (!platformInfo.isCordova) return
    var protocol = 'bitcoin'
    if ($scope.account.coin == 'bch') protocol += 'cash'
    var data = protocol + ':' + $scope.address + '?amount=' + $scope.amountBtc
    window.plugins.socialsharing.share(data, null, null, null)
  }

  $scope.copyToClipboard = function () {
    var protocol = 'bitcoin'
    if ($scope.account.coin == 'bch') protocol += 'cash'
    return protocol + ':' + $scope.address + '?amount=' + $scope.amountBtc
  }
})
