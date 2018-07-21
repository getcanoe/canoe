'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('preferencesAltCurrencyController',
  function ($scope, $log, $timeout, $ionicHistory, configService, rateService, lodash, storageService) {
    var next = 10
    var completeAlternativeList = []

    function init () {
      rateService.whenAvailable(function () {
        $scope.listComplete = false
        var idx = lodash.indexBy($scope.lastUsedAltCurrencyList, 'isoCode')
        completeAlternativeList = lodash.reject(rateService.listAlternatives(true), function (c) {
          return idx[c.isoCode]
        })

        // #98 Last is first... Sorted by population per country (+ corea and japan) from : https://www.internetworldstats.com/stats8.htm
        completeAlternativeList = moveElementInArrayToTop(completeAlternativeList, findElement(completeAlternativeList, 'isoCode', 'JPY')) // Japan
        completeAlternativeList = moveElementInArrayToTop(completeAlternativeList, findElement(completeAlternativeList, 'isoCode', 'KRW')) // Korea

        completeAlternativeList = moveElementInArrayToTop(completeAlternativeList, findElement(completeAlternativeList, 'isoCode', 'BRL')) // Brazil
        completeAlternativeList = moveElementInArrayToTop(completeAlternativeList, findElement(completeAlternativeList, 'isoCode', 'IDR')) // Indonesia
        completeAlternativeList = moveElementInArrayToTop(completeAlternativeList, findElement(completeAlternativeList, 'isoCode', 'USD')) // US
        completeAlternativeList = moveElementInArrayToTop(completeAlternativeList, findElement(completeAlternativeList, 'isoCode', 'EUR')) // YUROP
        completeAlternativeList = moveElementInArrayToTop(completeAlternativeList, findElement(completeAlternativeList, 'isoCode', 'INR')) // India
        completeAlternativeList = moveElementInArrayToTop(completeAlternativeList, findElement(completeAlternativeList, 'isoCode', 'CNY')) // China

        $scope.altCurrencyList = completeAlternativeList.slice(0, 10)

        $timeout(function () {
          $scope.$apply()
        })
      })
    }

    function moveElementInArrayToTop (array, value) {
      var oldIndex = array.indexOf(value)
      if (oldIndex > -1) {
        var newIndex = 0
        var arrayClone = array.slice()
        arrayClone.splice(oldIndex, 1)
        arrayClone.splice(newIndex, 0, value)
        return arrayClone
      }
      return array
    }

    function findElement (arr, propName, propValue) {
      for (var i = 0; i < arr.length; i++) {
        if (arr[i][propName] === propValue) { return arr[i] }
      }
    }

    $scope.loadMore = function () {
      $timeout(function () {
        $scope.altCurrencyList = completeAlternativeList.slice(0, next)
        next += 10
        $scope.listComplete = $scope.altCurrencyList.length >= completeAlternativeList.length
        $scope.$broadcast('scroll.infiniteScrollComplete')
      }, 100)
    }

    $scope.findCurrency = function (search) {
      if (!search) init()
      $scope.altCurrencyList = lodash.filter(completeAlternativeList, function (item) {
        var val = item.name
        var val2 = item.isoCode
        return lodash.includes(val.toLowerCase(), search.toLowerCase()) || lodash.includes(val2.toLowerCase(), search.toLowerCase())
      })
      $timeout(function () {
        $scope.$apply()
      })
    }

    $scope.save = function (newAltCurrency) {
      var opts = {
        wallet: {
          settings: {
            alternativeName: newAltCurrency.name,
            alternativeIsoCode: newAltCurrency.isoCode
          }
        }
      }

      configService.set(opts, function (err) {
        if (err) $log.warn(err)

        $ionicHistory.goBack()
        saveLastUsed(newAltCurrency)
        // Refresh ui
        $timeout(function () {
          configService.getSync().wallet.settings.alternativeIsoCode = newAltCurrency.isoCode
          // profileService.updateRate(newAltCurrency.isoCode, true)
          // $rootScope.$broadcast('rates.loaded')
        }, 30)
      })
    }

    function saveLastUsed (newAltCurrency) {
      $scope.lastUsedAltCurrencyList.unshift(newAltCurrency)
      $scope.lastUsedAltCurrencyList = lodash.uniq($scope.lastUsedAltCurrencyList, 'isoCode')
      $scope.lastUsedAltCurrencyList = $scope.lastUsedAltCurrencyList.slice(0, 3)
      storageService.setLastCurrencyUsed(JSON.stringify($scope.lastUsedAltCurrencyList), function () {})
    }

    $scope.$on('$ionicView.beforeEnter', function (event, data) {
      var config = configService.getSync()
      $scope.currentCurrency = config.wallet.settings.alternativeIsoCode

      storageService.getLastCurrencyUsed(function (err, lastUsedAltCurrency) {
        $scope.lastUsedAltCurrencyList = lastUsedAltCurrency ? JSON.parse(lastUsedAltCurrency) : []
        init()
      })
    })
  })
