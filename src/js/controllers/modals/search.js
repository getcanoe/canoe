'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('searchController', function ($scope, $timeout, $ionicScrollDelegate, lodash, gettextCatalog, platformInfo) {
  var HISTORY_SHOW_LIMIT = 10
  var currentTxHistoryPage = 0
  var isCordova = platformInfo.isCordova

  $scope.updateSearchInput = function (search) {
    if (isCordova) {
      window.plugins.toast.hide()
    }
    currentTxHistoryPage = 0
    throttleSearch(search)
    $timeout(function () {
      $ionicScrollDelegate.resize()
    }, 10)
  }

  var throttleSearch = lodash.throttle(function (search) {
    function filter (search) {
      $scope.filteredTxHistory = []

      function computeSearchableString (tx) {
        var addrbook = ''
        if (tx.destination && $scope.addressbook && $scope.addressbook[tx.destination]) {
          addrbook = $scope.addressbook[tx.destination].name || $scope.addressbook[tx.destination] || ''
        }
        var searchableDate = computeSearchableDate(new Date(tx.time * 1000))
        var note = tx.note || ''
        var destination = tx.destination || ''
        var txid = tx.txid || ''
        return ((tx.amountStr + destination + addrbook + searchableDate + note + txid).toString()).toLowerCase()
      }

      function computeSearchableDate (date) {
        var day = ('0' + date.getDate()).slice(-2).toString()
        var month = ('0' + (date.getMonth() + 1)).slice(-2).toString()
        var year = date.getFullYear()
        return [month, day, year].join('/')
      }

      if (lodash.isEmpty(search)) {
        $scope.txHistoryShowMore = false
        return []
      }

      $scope.filteredTxHistory = lodash.filter($scope.completeTxHistory, function (tx) {
        if (!tx.searcheableString) tx.searcheableString = computeSearchableString(tx)
        return lodash.includes(tx.searcheableString, search.toLowerCase())
      })

      if ($scope.filteredTxHistory.length > HISTORY_SHOW_LIMIT) $scope.txHistoryShowMore = true
      else $scope.txHistoryShowMore = false
      return $scope.filteredTxHistory
    }

    $scope.txHistorySearchResults = filter(search).slice(0, HISTORY_SHOW_LIMIT)

    if (isCordova) {
      window.plugins.toast.showShortBottom(gettextCatalog.getString('Matches: ' + $scope.filteredTxHistory.length))
    }

    $timeout(function () {
      $scope.$apply()
    })
  }, 1000)

  $scope.moreSearchResults = function () {
    currentTxHistoryPage++
    $scope.showHistory()
    $scope.$broadcast('scroll.infiniteScrollComplete')
  }

  $scope.showHistory = function () {
    $scope.txHistorySearchResults = $scope.filteredTxHistory ? $scope.filteredTxHistory.slice(0, (currentTxHistoryPage + 1) * HISTORY_SHOW_LIMIT) : []
    $scope.txHistoryShowMore = $scope.filteredTxHistory.length > $scope.txHistorySearchResults.length
  }
})
