'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('addressbookAddController', function ($scope, $state, $stateParams, $timeout, $ionicHistory, gettextCatalog, aliasService, addressbookService, nanoService, popupService) {
  $scope.fromSendTab = $stateParams.fromSendTab

  $scope.addressbookEntry = {
    'address': $stateParams.addressbookEntry || '',
    'name': $stateParams.toName || '',
    'email': '',
    'alias': $stateParams.toAlias || ''
  }

  $scope.onQrCodeScannedAddressBook = function (data, addressbookForm) {
    $timeout(function () {
      var form = addressbookForm
      if (data && form) {
        nanoService.parseQRCode(data, function (err, code) {
          if (err) {
            // Trying to scan an incorrect QR code
            popupService.showAlert(gettextCatalog.getString('Error'), gettextCatalog.getString('Incorrect code format for an account: ' + err))
            return
          }
          form.address.$setViewValue(code.account)
          form.address.$isValid = true
          form.address.$render()
          if (code.params.label) {
            form.name.$setViewValue(code.params.label)
            form.name.$render()
          }
          // if (code.params.alias) {
          //   form.alias.$setViewValue(code.alias)
          //   form.alias.$render()
          // }
        })
      }
      $scope.$digest()
    }, 100)
  }

  // var letterRegex = XRegExp('^\\p{Ll}+$');
  // var lnRegex = XRegExp('^(\\p{Ll}|\\pN)+$');
  // $scope.aliasValid = null;
  // $scope.aliasRegistered = null;
  // $scope.checkingAlias = false;
  // $scope.validateAlias = function(alias) {
  //   $scope.aliasRegistered = null;
  //   if (alias && alias.length > 0 && alias.charAt(0) === "@") {
  //     alias = alias.substring(1, alias.length);
  //   }
  //   $scope.aliasValid = alias.length >= 3 && letterRegex.test(alias.charAt(0)) && lnRegex.test(alias);
  //   $scope.checkingAlias = true;
  //   if ($scope.aliasValid === true) {
  //     aliasService.lookupAlias(alias, function(err, alias) {
  //       if (err === null) {
  //         $scope.aliasRegistered = true;
  //         $scope.addressbookEntry.address = alias.alias.address;
  //         $scope.addressbookEntry.name = "@"+alias.alias.alias;
  //         $scope.addressbookEntry.avatar = alias.alias.avatar;
  //       } else {
  //         $scope.aliasRegistered = false;
  //         $scope.addressbookEntry.avatar = null;
  //       }
  //       $scope.checkingAlias = false;
  //       $scope.$apply()
  //     });
  //   } else {
  //     $scope.checkingAlias = false;
  //   }
  // }

  $scope.$on('$ionicView.enter', function (event, data) {
    // if ($stateParams.toAlias !== null) {
    //   $scope.validateAlias($stateParams.toAlias);
    // }
  })

  $scope.add = function (entry) {
    $timeout(function () {
      addressbookService.add(entry, function (err, ab) {
        if (err) {
          popupService.showAlert(gettextCatalog.getString('Error'), err)
          return
        }
        if ($scope.fromSendTab) $scope.goHome()
        else $ionicHistory.goBack()
      })
    }, 100)
  }

  $scope.goHome = function () {
    $ionicHistory.removeBackView()
    $state.go('tabs.home')
  }
})
