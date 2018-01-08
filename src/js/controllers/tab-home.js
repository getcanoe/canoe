'use strict'

angular.module('canoeApp.controllers').controller('tabHomeController',
  function ($rootScope, $timeout, $scope, $state, $stateParams, $ionicModal, $ionicScrollDelegate, $window, gettextCatalog, lodash, popupService, ongoingProcess, externalLinkService, latestReleaseService, profileService, walletService, configService, $log, platformInfo, storageService, txpModalService, appConfigService, startupService, addressbookService, feedbackService, bwcError, nextStepsService, buyAndSellService, homeIntegrationsService, bitpayCardService, pushNotificationsService, timeService) {
    var wallet
    var listeners = []
    var notifications = []
    $scope.externalServices = {}
    $scope.openTxpModal = txpModalService.open
    $scope.version = $window.version
    $scope.name = appConfigService.nameCase
    $scope.homeTip = $stateParams.fromOnboarding
    $scope.isCordova = platformInfo.isCordova
    $scope.isAndroid = platformInfo.isAndroid
    $scope.isWindowsPhoneApp = platformInfo.isCordova && platformInfo.isWP
    $scope.isNW = platformInfo.isNW
    $scope.showRateCard = {}
    $scope.serverMessage = null

    $scope.$on('$ionicView.afterEnter', function () {
      startupService.ready()
    })

    $scope.$on('$ionicView.beforeEnter', function (event, data) {
      $scope.accounts = profileService.getAccounts()
      $scope.singleAccount = $scope.accounts.length === 1

      if (!$scope.accounts[0]) return

      if (!$scope.homeTip) {
        storageService.getHomeTipAccepted(function (error, value) {
          $scope.homeTip = value !== 'accepted'
        })
      }

      if ($scope.isNW) {
        latestReleaseService.checkLatestRelease(function (err, newRelease) {
          if (err) {
            $log.warn(err)
            return
          }
          if (newRelease) {
            $scope.newRelease = true
            $scope.updateText = gettextCatalog.getString('There is a new version of {{appName}} available', {
              appName: $scope.name
            })
          }
        })
      }

      storageService.getFeedbackInfo(function (error, info) {
        if ($scope.isWindowsPhoneApp) {
          $scope.showRateCard.value = false
          return
        }
        if (!info) {
          initFeedBackInfo()
        } else {
          var feedbackInfo = JSON.parse(info)
          // Check if current version is greater than saved version
          var currentVersion = $scope.version
          var savedVersion = feedbackInfo.version
          var isVersionUpdated = feedbackService.isVersionUpdated(currentVersion, savedVersion)
          if (!isVersionUpdated) {
            initFeedBackInfo()
            return
          }
          var now = moment().unix()
          var timeExceeded = (now - feedbackInfo.time) >= 24 * 7 * 60 * 60
          $scope.showRateCard.value = timeExceeded && !feedbackInfo.sent
          $timeout(function () {
            $scope.$apply()
          })
        }
      })

      function initFeedBackInfo () {
        var feedbackInfo = {}
        feedbackInfo.time = moment().unix()
        feedbackInfo.version = $scope.version
        feedbackInfo.sent = false
        storageService.setFeedbackInfo(JSON.stringify(feedbackInfo), function () {
          $scope.showRateCard.value = false
        })
      }
    })

    $scope.$on('$ionicView.enter', function (event, data) {
      performUpdate(function () {})

      addressbookService.list(function (err, ab) {
        if (err) $log.error(err)
        $scope.addressbook = ab || {}
      })

      /*
      listeners = [
        $rootScope.$on('bwsEvent', function (e, walletId, type, n) {
          var wallet = profileService.getAccount(walletId)
          updateAccount(wallet)
          if ($scope.recentTransactionsEnabled) getNotifications()
        }),
        $rootScope.$on('Local/TxAction', function (e, walletId) {
          $log.debug('Got action for wallet ' + walletId)
          var wallet = profileService.getAccount(walletId)
          updateAccount(wallet)
          if ($scope.recentTransactionsEnabled) getNotifications()
        })
      ]*/

      $scope.buyAndSellItems = buyAndSellService.getLinked()
      $scope.homeIntegrations = homeIntegrationsService.get()

      bitpayCardService.get({}, function (err, cards) {
        $scope.bitpayCardItems = cards
      })

      configService.whenAvailable(function (config) {
        $scope.recentTransactionsEnabled = config.recentTransactions.enabled
        if ($scope.recentTransactionsEnabled) getNotifications()

        /*
        if (config.hideNextSteps.enabled) {
          $scope.nextStepsItems = null
        } else {
          $scope.nextStepsItems = nextStepsService.get()
        }*/

        pushNotificationsService.init()

        $timeout(function () {
          $ionicScrollDelegate.resize()
          $scope.$apply()
        }, 10)
      })
    })

    $scope.$on('$ionicView.leave', function (event, data) {
      lodash.each(listeners, function (x) {
        x()
      })
    })

    $scope.createdWithinPastDay = function (time) {
      return timeService.withinPastDay(time)
    }

    $scope.goToDownload = function () {
      var url = 'https://github.com/gokr/canoe/releases/latest'
      var optIn = true
      var title = gettextCatalog.getString('Update Available')
      var message = gettextCatalog.getString('An update to this app is available. For your security, please update to the latest version.')
      var okText = gettextCatalog.getString('View Update')
      var cancelText = gettextCatalog.getString('Go Back')
      externalLinkService.open(url, optIn, title, message, okText, cancelText)
    }

    $scope.openServerMessageLink = function () {
      var url = $scope.serverMessage.link
      externalLinkService.open(url)
    }

    $scope.openNotificationModal = function (n) {
      wallet = profileService.getAccount(n.walletId)

      if (n.txid) {
        $state.transitionTo('tabs.account.tx-details', {
          txid: n.txid,
          walletId: n.walletId
        })
      } else {
        var txp = lodash.find($scope.txps, {
          id: n.txpId
        })
        if (txp) {
          txpModalService.open(txp)
        } else {
          ongoingProcess.set('loadingTxInfo', true)
          walletService.getTxp(wallet, n.txpId, function (err, txp) {
            var _txp = txp
            ongoingProcess.set('loadingTxInfo', false)
            if (err) {
              $log.warn('No txp found')
              return popupService.showAlert(gettextCatalog.getString('Error'), gettextCatalog.getString('Transaction not found'))
            }
            txpModalService.open(_txp)
          })
        }
      }
    }

    $scope.openAccount = function (account) {
      $state.go('tabs.account', {
        accountId: account.id
      })
    }

    var updateTxps = function () {
      profileService.getTxps({
        limit: 3
      }, function (err, txps, n) {
        if (err) $log.error(err)
        $scope.txps = txps
        $scope.txpsN = n
        $timeout(function () {
          $ionicScrollDelegate.resize()
          $scope.$apply()
        }, 10)
      })
    }

    var updateAccount = function (account) {
      $log.debug('Updating account:' + account.name)
      walletService.getStatus(account, {}, function (err, status) {
        if (err) {
          $log.error(err)
          return
        }
        account.status = status
        updateTxps()
      })
    }

    var getNotifications = function () {
      profileService.getNotifications({
        limit: 3
      }, function (err, notifications, total) {
        if (err) {
          $log.error(err)
          return
        }
        $scope.notifications = notifications
        $scope.notificationsN = total
        $timeout(function () {
          $ionicScrollDelegate.resize()
          $scope.$apply()
        }, 10)
      })
    }

    var performUpdate = function (cb) {
      profileService.updateAllAccounts(function (err, accounts) {
        if (err) {
          profileService.fetchServerStatus(function (err, status) {
            // {link: "url", title: "asdasd", body: "saasd"}
            $scope.serverMessage = status.message
            cb()
          })
        } else {
          $scope.serverMessage = null
          cb()
        }
      })
    }

    $scope.hideHomeTip = function () {
      storageService.setHomeTipAccepted('accepted', function () {
        $scope.homeTip = false
        $timeout(function () {
          $scope.$apply()
        })
      })
    }

    $scope.onRefresh = function () {
      performUpdate(function () {
        $scope.$broadcast('scroll.refreshComplete')
        $ionicScrollDelegate.resize()
        $scope.$apply()
      })
    }
  })
