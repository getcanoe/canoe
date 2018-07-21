'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('createAliasController',
  function ($scope, $timeout, $log, $state, $stateParams, profileService, nanoService, aliasService, ongoingProcess) {
    var letterRegex = XRegExp('^\\p{Ll}+$')
    var lnRegex = XRegExp('^(\\p{Ll}|\\pN)+$')
    $scope.accountId = $stateParams.walletId
    $scope.emailValid = false
    $scope.aliasValid = false
    $scope.aliasRegistered = null
    $scope.checkingAlias = false
    $scope.validateAlias = function (alias) {
      $scope.aliasRegistered = null
      if (alias && alias.length > 0 && alias.charAt(0) === '@') {
        alias = alias.substring(1, alias.length)
      }
      $scope.aliasValid = alias.length >= 3 && letterRegex.test(alias.charAt(0)) && lnRegex.test(alias)
      $scope.checkingAlias = true
      if ($scope.aliasValid === true) {
        aliasService.lookupAlias(alias, function (err, alias) {
          if (err === null) {
            $scope.aliasRegistered = true
          } else if (err === 'Could not find alias') {
            $scope.aliasRegistered = false
          } else {
            $scope.aliasRegistered = true
          }
          $scope.checkingAlias = false
          $scope.$apply()
        })
      } else {
        $scope.checkingAlias = false
      }
    }
    $scope.validateEmail = function (email) {
      $scope.emailValid = validator.isEmail(email)
    };
    $scope.create = function (alias, email, isPrivate, createPhoneAlias) {
      // Save the alias we have selected to use for our wallet
      var account = $scope.wallet.getCurrentAccount()
      if (alias && alias.length > 0 && alias.charAt(0) === '@') {
        alias = alias.substring(1, alias.length)
      }
      var data = $scope.wallet.aliasSignature([alias, account])
      ongoingProcess.set('creatingAlias', true)
      aliasService.createAlias(alias, account, email, isPrivate, data.signature, function (err, ans) {
        if (err) {
          ongoingProcess.set('creatingAlias', false)
          return $log.debug(err)
        }
        $log.debug('Answer from alias server creation: ' + JSON.stringify(ans))
        if (ans) {
          var meta = $scope.wallet.getMeta(account)
          ans.alias.email = email
          meta.alias = ans.alias
          $scope.wallet.setMeta(account, meta)
          nanoService.saveWallet($scope.wallet, function (err, wallet) {
            profileService.setWallet($scope.wallet, function (err) {
              if (err) $log.debug(err)
              $log.info('Finished Creating and storing your alias')
              $state.go('onboarding.backupRequest', {
                walletId: $scope.accountId
              })
            })
          })
        }
        ongoingProcess.set('creatingAlias', false)
      })
    }

    $scope.skipAlias = function () {
      $state.go('onboarding.backupRequest', {
        walletId: $scope.accountId
      })
    }

    $scope.$on('$ionicView.enter', function (event, data) {
      $scope.wallet = profileService.getWallet();
      if ($scope.wallet === null) {
        $log.debug('Bad password or no wallet')
        
      }
    })
  })
