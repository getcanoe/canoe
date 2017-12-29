'use strict'

angular.module('canoeApp.controllers').controller('tabReceiveController', function ($rootScope, $scope, $timeout, $log, $ionicModal, $state, $ionicHistory, $ionicPopover, storageService, platformInfo, walletService, profileService, configService, lodash, gettextCatalog, popupService, bwcError) {
  var listeners = []
  $scope.isCordova = platformInfo.isCordova
  $scope.isNW = platformInfo.isNW

  $scope.requestSpecificAmount = function () {
    $state.go('tabs.paymentRequest.amount', {
      id: $scope.account
    })
  }

  $scope.setAddress = function (newAddr) {
    $scope.addr = null
    if (!$scope.account || $scope.generatingAddress || !$scope.account.isComplete()) return
    $scope.generatingAddress = true
    walletService.getAddress($scope.account, newAddr, function (err, addr) {
      $scope.generatingAddress = false

      if (err) {
        // Error is already formated
        popupService.showAlert(err)
      }

      $scope.addr = addr
      $timeout(function () {
        $scope.$apply()
      }, 10)
    })
  }

  $scope.goCanoeers = function () {
    $ionicHistory.removeBackView()
    $ionicHistory.nextViewOptions({
      disableAnimate: true
    })
    $state.go('tabs.home')
    $timeout(function () {
      $state.transitionTo('tabs.canoeers', {
        walletId: $scope.account.credentials.walletId
      })
    }, 100)
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
        if ($scope.account && walletId == $scope.account.id && type === 'NewIncomingTx') $scope.setAddress(true)
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
    $scope.account = acc
    $scope.setAddress()
  }

  $scope.showAccountSelector = function () {
    if ($scope.singleAccount) return
    $scope.accountSelectorTitle = gettextCatalog.getString('Select an account')
    $scope.showAccounts = true
  }

  $scope.shareAccount = function () {
    if (!$scope.isCordova) return
    window.plugins.socialsharing.share('raiblocks:' + $scope.addr, null, null, null)
  }
})
