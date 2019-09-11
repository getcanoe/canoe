'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('tabHomeController',
  function ($rootScope, $timeout, $scope, $state, $stateParams, $ionicScrollDelegate, $window, gettextCatalog, lodash, popupService, ongoingProcess, externalLinkService, latestReleaseService, profileService, configService, $log, platformInfo, storageService, appConfigService, startupService, addressbookService, feedbackService, buyAndSellService, homeIntegrationsService, pushNotificationsService, timeService) {
    var listeners = []
    $scope.externalServices = {}
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

    $scope.openExternalLinkHelp = function () {
    // TODO var url = 'http://bitcoin.black/' + uxLanguage.getCurrentLanguage() + '/help'
      var url = 'https://bitcoin.black/mobile-wallet-faq/'
      var optIn = true
      var title = null
      var message = gettextCatalog.getString('Help and support information is available at the website.')
      var okText = gettextCatalog.getString('Open')
      var cancelText = gettextCatalog.getString('Go Back')
      externalLinkService.open(url, optIn, title, message, okText, cancelText)
    }

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
            $scope.updateText = gettextCatalog.getString('There is a new version of BCB wallet available', {
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
      addressbookService.list(function (err, ab) {
        if (err) $log.error(err)
        $scope.addressbook = ab || {}
      })

      listeners = [
        $rootScope.$on('servermessage', function (event, message) {
          $scope.serverMessage = message
          $timeout(function () {
            $scope.$apply()
          })
        }),
        $rootScope.$on('walletloaded', function (event) {
          $log.debug('Wallet loaded')
          $scope.accounts = profileService.getAccounts()
        }),
        $rootScope.$on('work', function (event) {
          $scope.work = profileService.getPoW()
          if ($scope.work) {
            for (var i = 0; i < $scope.accounts.length; i++) {
              if ($scope.work[$scope.accounts[i].id] && ($scope.accounts[i].work === null || typeof $scope.accounts[i].work === "undefined")) {
                console.log("Work found for wallet " + i)
                $scope.accounts[i].work = $scope.work[$scope.accounts[i].id]
              } else if (!$scope.work[$scope.accounts[i].id]) {
                console.log("Work is null for " + i)
                $scope.accounts[i].work = null
                $scope.$apply()
              }
            }
          }
        }),
        $rootScope.$on('blocks', function (event, account) {
          if (account === null) {
            $scope.accounts = profileService.getAccounts()
          }
          $timeout(function () {
            $scope.$apply()
          })
        })
      ]

      $scope.buyAndSellItems = buyAndSellService.getLinked()
      $scope.homeIntegrations = homeIntegrationsService.get()

      configService.whenAvailable(function (config) {
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
      var url = 'http://bitcoin.black/download'
      var optIn = true
      var title = gettextCatalog.getString('Update Available')
      var message = gettextCatalog.getString('A new version of this app is available. Please update to the latest version.')
      var okText = gettextCatalog.getString('View Update')
      var cancelText = gettextCatalog.getString('Go Back')
      externalLinkService.open(url, optIn, title, message, okText, cancelText)
    }

    $scope.openServerMessageLink = function () {
      var url = $scope.serverMessage.link
      externalLinkService.open(url)
    }

    /*
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
          // txpModalService.open(txp)
        } else {
          ongoingProcess.set('loadingTxInfo', true)
          walletService.getTxp(wallet, n.txpId, function (err, txp) {
            var _txp = txp
            ongoingProcess.set('loadingTxInfo', false)
            if (err) {
              $log.warn('No txp found')
              return popupService.showAlert(gettextCatalog.getString('Error'), gettextCatalog.getString('Transaction not found'))
            }
            // txpModalService.open(_txp)
          })
        }
      }
    } */

    $scope.openAccount = function (account) {
      $state.go('tabs.account', {
        accountId: account.id
      })
    }

    $rootScope.$on('rates.loaded', function () {
      // Display alternative balance
      $scope.accounts = profileService.getAccounts()
      $scope.$apply()
    })

    var performUpdate = function (cb) {
      $scope.accounts = profileService.getAccounts()
      $scope.serverMessage = null
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
      performUpdate()
      $scope.$broadcast('scroll.refreshComplete')
      $ionicScrollDelegate.resize()
      $timeout(function () {
        $scope.$apply()
      })
    }
  })
