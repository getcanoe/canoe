'use strict'

angular.module('canoeApp.controllers').controller('tabReceiveController', function ($rootScope, $scope, $timeout, $log, $ionicModal, $state, $ionicHistory, $ionicPopover, storageService, platformInfo, walletService, profileService, configService, lodash, gettextCatalog, popupService) {
  var listeners = []
  $scope.wallet = profileService.getWallet()
  $scope.isCordova = platformInfo.isCordova
  $scope.isNW = platformInfo.isNW

  $scope.requestSpecificAmount = function () {
    $state.go('tabs.paymentRequest.amount', {
      id: $scope.account
    })
  }

  $scope.openBackupNeededModal = function () {
    $ionicModal.fromTemplateUrl('views/includes/backupNeededPopup.html', {
      scope: $scope,
      backdropClickToClose: false,
      hardwareBackButtonClose: false
    }).then(function (modal) {
      $scope.BackupNeededModal = modal
      $scope.BackupNeededModal.show()
    })
  }

  $scope.close = function () {
    $scope.BackupNeededModal.hide()
    $scope.BackupNeededModal.remove()
  }

  $scope.doBackup = function () {
    $scope.close()
    $scope.goToBackupFlow()
  }

  $scope.goToBackupFlow = function () {
    $state.go('tabs.receive.backupWarning', {
      from: 'tabs.receive',
      walletId: $scope.account.credentials.walletId
    })
  }

  $scope.$on('$ionicView.beforeEnter', function (event, data) {
    $scope.accounts = profileService.getAccounts()
    $scope.singleAccount = $scope.accounts.length === 1

    if (!$scope.accounts[0]) return

    // select first account if no account selected previously
    var selectedAccount = checkSelectedAccount($scope.account, $scope.accounts)
    $scope.onAccountSelect(selectedAccount)

    $scope.showShareButton = platformInfo.isCordova ? (platformInfo.isIOS ? 'iOS' : 'Android') : null

    listeners = [
      $rootScope.$on('bwsEvent', function (e, walletId, type, n) {
        // Update current address
        if ($scope.account && walletId === $scope.account.id && type === 'NewIncomingTx') $scope.setAddress(true)
      })
    ]
  })

  $scope.$on('$ionicView.leave', function (event, data) {
    lodash.each(listeners, function (x) {
      x()
    })
  })

  var checkSelectedAccount = function (account, accounts) {
    if (!account) return accounts[0]
    var w = lodash.find(accounts, function (w) {
      return w.id === account.id
    })
    if (!w) return accounts[0]
    return account
  }

  $scope.onAccountSelect = function (acc) {
    if (!acc) {
      $state.go('tabs.create-account')
    } else {
      $scope.account = acc
      $scope.addr = acc.id
      $scope.addrUrl = 'xrb:' + acc.id
    }
  }

  $scope.showAccountSelector = function () {
    if ($scope.singleAccount) return
    $scope.accountSelectorTitle = gettextCatalog.getString('Select an account')
    $scope.showAccounts = true
  }

  $scope.shareAccount = function () {
    if (!$scope.isCordova) return
    window.plugins.socialsharing.share($scope.addr, null, null, null)
  }
})
