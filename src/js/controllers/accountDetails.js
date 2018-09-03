'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('accountDetailsController', function ($scope, $rootScope, $interval, $timeout, $filter, $log, $ionicModal, $ionicPopover, $state, $stateParams, $ionicHistory, profileService, nanoService, lodash, configService, platformInfo, externalLinkService, popupService, addressbookService, $ionicScrollDelegate, $window, gettextCatalog, timeService) {
  var HISTORY_SHOW_LIMIT = 10
  var currentTxHistoryPage = 0
  var listeners = []
  $scope.completeTxHistory = []
  $scope.isCordova = platformInfo.isCordova
  $scope.isAndroid = platformInfo.isAndroid
  $scope.isIOS = platformInfo.isIOS

  $scope.amountIsCollapsible = !$scope.isAndroid

  $scope.openExternalLink = function (url, target) {
    externalLinkService.open(url, target)
  }

  $scope.openSearchModal = function () {
    $scope.color = $scope.account.meta.color
    $scope.isSearching = true
    $scope.txHistorySearchResults = []
    $scope.filteredTxHistory = []

    $ionicModal.fromTemplateUrl('views/modals/search.html', {
      scope: $scope,
      focusFirstInput: true
    }).then(function (modal) {
      $scope.searchModal = modal
      $scope.searchModal.show()
    })

    $scope.close = function () {
      $scope.isSearching = false
      $scope.searchModal.hide()
    }

    $scope.openTx = function (tx) {
      $ionicHistory.nextViewOptions({
        disableAnimate: true
      })
      $scope.close()
      $scope.openTxModal(tx)
    }
  }

  $scope.openTxModal = function (ntx) {
    $scope.accountId = $scope.account.id
    $state.transitionTo('tabs.account.tx-details', {
      ntx: ntx,
      accountId: $scope.accountId
    })
  }

  var updateTxHistory = function () {
    $scope.completeTxHistory = $scope.account ? profileService.getTxHistory($scope.account.id) : []
    if ($scope.completeTxHistory[0]) {
      $scope.showNoTransactionsYetMsg = false
    } else {
      $scope.showNoTransactionsYetMsg = true
    }
    $scope.showHistory()
    $timeout(function () {
      $scope.$apply()
    })
  }

  $scope.showHistory = function () {
    if ($scope.completeTxHistory) {
      $scope.txHistory = $scope.completeTxHistory.slice(0, (currentTxHistoryPage + 1) * HISTORY_SHOW_LIMIT)
      $scope.txHistoryShowMore = $scope.completeTxHistory.length > $scope.txHistory.length
    }
  }

  $scope.getDate = function (txCreated) {
    var date = new Date(txCreated * 1000)
    return date
  }

  $scope.isFirstInGroup = function (index) {
    if (index === 0) {
      return true
    }
    var curTx = $scope.txHistory[index]
    var prevTx = $scope.txHistory[index - 1]
    return !$scope.createdDuringSameMonth(curTx, prevTx)
  }

  $scope.isLastInGroup = function (index) {
    if (index === $scope.txHistory.length - 1) {
      return true
    }
    return $scope.isFirstInGroup(index + 1)
  }

  $scope.createdDuringSameMonth = function (curTx, prevTx) {
    return timeService.withinSameMonth(curTx.time * 1000, prevTx.time * 1000)
  }

  $scope.createdWithinPastDay = function (time) {
    return timeService.withinPastDay(time)
  }

  $scope.isDateInCurrentMonth = function (date) {
    return timeService.isDateInCurrentMonth(date)
  }

  $scope.showMore = function () {
    $timeout(function () {
      currentTxHistoryPage++
      $scope.showHistory()
      $scope.$broadcast('scroll.infiniteScrollComplete')
    }, 100)
  }

  $scope.onRefresh = function () {
    $timeout(function () {
      $scope.$broadcast('scroll.refreshComplete')
    }, 300)
    $scope.updateAll()
  }

  $scope.updateAll = function (cb) {
    $scope.account = profileService.getAccountWithId($scope.accountId)
    updateTxHistory(cb)
  }

  $scope.hideToggle = function () {
    $scope.balanceHidden = !$scope.balanceHidden
    $timeout(function () {
      $scope.$apply()
    })
  }

  var prevPos

  function getScrollPosition () {
    var scrollPosition = $ionicScrollDelegate.getScrollPosition()
    if (!scrollPosition) {
      $window.requestAnimationFrame(function () {
        getScrollPosition()
      })
      return
    }
    var pos = scrollPosition.top
    if (pos === prevPos) {
      $window.requestAnimationFrame(function () {
        getScrollPosition()
      })
      return
    }
    prevPos = pos
    refreshAmountSection(pos)
  }

  function refreshAmountSection (scrollPos) {
    $scope.showBalanceButton = false
    if ($scope.status) {
      $scope.showBalanceButton = ($scope.status.totalBalanceSat !== $scope.status.spendableAmount)
    }
    if (!$scope.amountIsCollapsible) {
      var t = ($scope.showBalanceButton ? 15 : 45)
      $scope.amountScale = 'translateY(' + t + 'px)'
      return
    }

    scrollPos = scrollPos || 0
    var amountHeight = 210 - scrollPos
    if (amountHeight < 80) {
      amountHeight = 80
    }
    var contentMargin = amountHeight
    if (contentMargin > 210) {
      contentMargin = 210
    }

    var amountScale = (amountHeight / 210)
    if (amountScale < 0.5) {
      amountScale = 0.5
    }
    if (amountScale > 1.1) {
      amountScale = 1.1
    }

    var s = amountScale

    // Make space for the balance button when it needs to display.
    var TOP_NO_BALANCE_BUTTON = 115
    var TOP_BALANCE_BUTTON = 30
    var top = TOP_NO_BALANCE_BUTTON
    if ($scope.showBalanceButton) {
      top = TOP_BALANCE_BUTTON
    }

    var amountTop = ((amountScale - 0.7) / 0.7) * top
    if (amountTop < -10) {
      amountTop = -10
    }
    if (amountTop > top) {
      amountTop = top
    }

    t = amountTop

    $scope.altAmountOpacity = (amountHeight - 100) / 80
    $window.requestAnimationFrame(function () {
      $scope.amountHeight = amountHeight + 'px'
      $scope.contentMargin = contentMargin + 'px'
      $scope.amountScale = 'scale3d(' + s + ',' + s + ',' + s + ') translateY(' + t + 'px)'
      $scope.$digest()
      getScrollPosition()
    })
  }

  var scrollWatcherInitialized

  $scope.$on('$ionicView.enter', function (event, data) {
    if ($scope.isCordova && $scope.isAndroid) setAndroidStatusBarColor()
    if (scrollWatcherInitialized || !$scope.amountIsCollapsible) {
      return
    }
    scrollWatcherInitialized = true
  })

  $scope.$on('$ionicView.beforeEnter', function (event, data) {
    var clearCache = data.stateParams.clearCache
    $scope.accountId = data.stateParams.accountId
    var config = configService.getSync().wallet.settings
    $scope.alternativeIsoCode = config.alternativeIsoCode
    $scope.account = profileService.getAccountWithId($scope.accountId)
    if (!$scope.account) return

    $scope.balanceHidden = $scope.account.meta.balanceHidden

    // Getting info from cache
    if (clearCache) {
      $scope.txHistory = null
      $scope.status = null
    } else {
      $scope.status = $scope.account.cachedStatus
      if ($scope.account.completeHistory) {
        $scope.completeTxHistory = $scope.account.completeHistory
        $scope.showHistory()
      }
    }

    addressbookService.list(function (err, ab) {
      if (err) $log.error(err)
      $scope.addressbook = ab || {}
    })
  })

  $rootScope.$on('blocks', function (event, data) {
    $scope.updateAll()
    refreshAmountSection()
  })

  $scope.$on('$ionicView.afterEnter', function (event, data) {
    $scope.updateAll()
    refreshAmountSection()
  })

  $scope.$on('$ionicView.afterLeave', function (event, data) {
    if ($window.StatusBar) {
      var statusBarColor = '#192c3a'
      $window.StatusBar.backgroundColorByHexString(statusBarColor)
    }
  })

  $scope.$on('$ionicView.leave', function (event, data) {
    lodash.each(listeners, function (x) {
      x()
    })
  })

  function setAndroidStatusBarColor () {
    var SUBTRACT_AMOUNT = 15
    var walletColor
    if (!$scope.account.meta.color) walletColor = '#019477'
    else walletColor = $scope.account.meta.color
    var rgb = hexToRgb(walletColor)
    var keys = Object.keys(rgb)
    keys.forEach(function (k) {
      if (rgb[k] - SUBTRACT_AMOUNT < 0) {
        rgb[k] = 0
      } else {
        rgb[k] -= SUBTRACT_AMOUNT
      }
    })
    var statusBarColorHexString = rgbToHex(rgb.r, rgb.g, rgb.b)
    if ($window.StatusBar) { $window.StatusBar.backgroundColorByHexString(statusBarColorHexString) }
  }

  function hexToRgb (hex) {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i
    hex = hex.replace(shorthandRegex, function (m, r, g, b) {
      return r + r + g + g + b + b
    })

    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null
  }

  function componentToHex (c) {
    var hex = c.toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }

  function rgbToHex (r, g, b) {
    return '#' + componentToHex(r) + componentToHex(g) + componentToHex(b)
  }
})
