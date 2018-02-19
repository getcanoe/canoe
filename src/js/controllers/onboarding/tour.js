'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('tourController',
  function ($scope, $state, $log, $timeout, $filter, ongoingProcess, profileService, popupService, gettextCatalog) {
    $scope.data = {
      index: 0
    }

    $scope.options = {
      loop: false,
      effect: 'flip',
      speed: 500,
      spaceBetween: 100
    }

    $scope.$on('$ionicSlides.sliderInitialized', function (event, data) {
      $scope.slider = data.slider
    })

    $scope.$on('$ionicSlides.slideChangeStart', function (event, data) {
      $scope.data.index = data.slider.activeIndex
    })

    $scope.$on('$ionicSlides.slideChangeEnd', function (event, data) {})

    $scope.$on('$ionicView.enter', function (event, data) {
      // This is not used anymore in onboarding
      /*profileService.getCurrentCoinmarketcapRate(null, function (err, str) {
        if (err) {
          $log.warn(err)
        } else {
          $scope.localCurrencySymbol = '$'
          $scope.localCurrencyPerNANO = str
          $timeout(function () {
            $scope.$apply()
          })
        }
      })*/
    })

    $scope.goBack = function () {
      if ($scope.data.index !== 0) $scope.slider.slidePrev()
      else $state.go('onboarding.welcome')
    }

    $scope.slideNext = function () {
      if ($scope.data.index !== 2) $scope.slider.slideNext()
      else $state.go('onboarding.welcome')
    }
  })
