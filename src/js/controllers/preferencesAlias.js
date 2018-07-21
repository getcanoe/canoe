'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('preferencesAliasController',
  function ($scope, $timeout, $stateParams, $ionicHistory, $log, profileService, aliasService, ongoingProcess) {
    var account = profileService.getAccount($stateParams.accountId)
    var letterRegex = XRegExp('^\\p{Ll}+$')
    var lnRegex = XRegExp('^(\\p{Ll}|\\pN)+$')
    $scope.accountAlias = account.meta.alias || null
    var initialName = null
    $scope.emailValid = null
    $scope.aliasValid = null
    $scope.aliasRegistered = null
    $scope.checkingAlias = false
    if ($scope.accountAlias !== null) {
      initialName = $scope.accountAlias.alias
      $scope.aliasRegistered = false
      $scope.aliasValid = true
    }
    $scope.validateAlias = function (alias) {
      if (alias === initialName) return
      $scope.aliasRegistered = null
      if (alias && alias.length > 0 && alias.charAt(0) === '@') {
        alias = alias.substring(1, alias.length)
      }
      $scope.aliasValid = alias.length >= 4 && letterRegex.test(alias.charAt(0)) && lnRegex.test(alias)
      $scope.checkingAlias = true
      if ($scope.aliasValid === true) {
        aliasService.lookupAlias(alias, function (err, alias) {
          if (err === null) {
            if (alias.alias.address === account.id) {
              alias.alias.email = $scope.alias.value.email
              account.meta.alias = alias.alias
              profileService.saveWallet(function () {
                $log.info('Finished Creating and storing your alias')
                $ionicHistory.goBack()
              })
            }
            $scope.aliasRegistered = true
          } else {
            $scope.aliasRegistered = false
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
    }
    $scope.alias = {
      value: $scope.accountAlias
    }
    $scope.isPrivate = false
    if ($scope.alias.value !== null && $scope.alias.value.listed === false) {
      $scope.isPrivate = true
    }

    $scope.save = function () {
      // Save the alias we have selected to use for our wallet
      var wallet = profileService.getWallet()
      var curAccount = account.id
      if ($scope.alias.value.alias && $scope.alias.value.alias.length > 0 && $scope.alias.value.alias.charAt(0) === '@') {
        $scope.alias.value.alias = $scope.alias.value.alias.substring(1, $scope.alias.value.alias.length)
      }
      var signatureParams = [
        $scope.alias.value.alias,
        curAccount
      ]
      var signature = wallet.aliasSignature(signatureParams).signature
      if ($scope.alias.value.seed) {
        signatureParams[0] = initialName
        signatureParams.push($scope.alias.value.seed)
        var privateSignature = wallet.aliasSignature(signatureParams).signature
        ongoingProcess.set('editingAlias', true)
        aliasService.editAlias(initialName, $scope.alias.value.alias, curAccount, $scope.alias.value.email, $scope.isPrivate, signature, privateSignature, function (err, ans) {
          if (err) {
            ongoingProcess.set('editingAlias', false)
            return $log.debug(err)
          }
          $log.debug('Answer from alias server editing: ' + JSON.stringify(ans))
          if (ans) {
            ans.alias.email = $scope.alias.value.email
            account.meta.alias = ans.alias
            profileService.saveWallet(function () {
              $log.info('Finished editing and storing your alias')
              $ionicHistory.goBack()
            })
          }
          ongoingProcess.set('editingAlias', false)
        })
      } else {
        ongoingProcess.set('creatingAlias', true)
        aliasService.createAlias($scope.alias.value.alias, curAccount, $scope.alias.value.email, $scope.isPrivate, signature, function (err, ans) {
          if (err) {
            ongoingProcess.set('creatingAlias', false)
            return $log.debug(err)
          }
          $log.debug('Answer from alias server creation: ' + JSON.stringify(ans))
          if (ans) {
            ans.alias.email = $scope.alias.value.email
            account.meta.alias = ans.alias
            profileService.saveWallet(function () {
              $log.info('Finished Creating and storing your alias')
              $ionicHistory.goBack()
            })
          }
          ongoingProcess.set('creatingAlias', false)
        })
      }
    }
  })
