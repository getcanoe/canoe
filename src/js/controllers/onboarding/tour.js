'use strict'
/* global angular */
angular
  .module('canoeApp.controllers')
  .controller('tourController', function (
    $scope,
    $state,
    $log,
    $timeout,
    $filter,
    ongoingProcess,
    profileService,
    popupService,
    gettextCatalog
  ) {
    $scope.data = {
      index: 0
    }

    var retryCount = 0
    $scope.createDefaultWallet = function (password) {
      // Set the password we have selected to use for our wallet
      profileService.enteredPassword(password)
      ongoingProcess.set('creatingWallet', true)
      $timeout(function () {
        // This is the call to create the wallet from onboarding
        profileService.createWallet(
          profileService.getEnteredPassword(),
          null,
          function (err, wallet) {
            if (err) {
              $log.warn(err)
              return $timeout(function () {
                $log.warn(
                  'Retrying to create default wallet.....:' + ++retryCount
                )
                if (retryCount > 3) {
                  ongoingProcess.set('creatingWallet', false)
                  popupService.showAlert(
                    gettextCatalog.getString('Cannot Create Wallet'),
                    err,
                    function () {
                      retryCount = 0
                      return $scope.createDefaultWallet()
                    },
                    gettextCatalog.getString('Retry')
                  )
                } else {
                  return $scope.createDefaultWallet()
                }
              }, 2000)
            }
            ongoingProcess.set('creatingWallet', false)
            $state.go('onboarding.aliasRequest', {
              walletId: $scope.accountId
            })
          }
        )
      }, 300)
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
      /* profileService.getCurrentCoinmarketcapRate(null, function (err, str) {
        if (err) {
          $log.warn(err)
        } else {
          $scope.localCurrencySymbol = '$'
          $scope.localCurrencyPerNANO = str
          $timeout(function () {
            $scope.$apply()
          })
        }
      }) */
    })

    $scope.goBack = function () {
      if ($scope.data.index !== 0) $scope.slider.slidePrev()
      else $state.go('onboarding.welcome')
    }

    $scope.goToSlide = function () {
      $state.go('onboarding.welcome')
    }

    $scope.slideNext = function () {
      if ($scope.data.index !== 3) $scope.slider.slideNext()
      else $state.go('onboarding.welcome')
    }
  })
