'use strict'
/* global angular XMLHttpRequest */
angular.module('canoeApp.services')
  .factory('aliasService', function ($log, $rootScope, configService, platformInfo, storageService, gettextCatalog, lodash) {
    var root = {}

    var host = 'https://alias.getcanoe.io/api'
    // var host = 'https://alias.getcanoe.io/api-dev' // for dev
    // var host = 'http://localhost:3000' // for local dev

    var timer = null
/*
  "data": {
		"alias": {
			"id": 3,
			"alias": "canoe",
			"address": "xrb_1qckwc5o3obkrwbet4amnkya113xq77qpaknsmiq9hwq31tmd5bpyo7sepsw",
			"listed": true,
			"verified": false,
			"registered": true,
			"createdAt": "2018-02-12T16:27:55.873Z",
			"updatedAt": "2018-02-12T16:27:55.873Z",
			"avatar": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"64\" height=\"64\" viewBox=\"0 0 64 64\" preserveAspectRatio=\"xMidYMid meet\"><path fill=\"#d8bae8\" d=\"M32 19L19 19L19 6ZM32 19L32 6L45 6ZM32 45L45 45L45 58ZM32 45L32 58L19 58ZM19 32L6 32L6 19ZM45 32L45 19L58 19ZM45 32L58 32L58 45ZM19 32L19 45L6 45Z\"/><path fill=\"#4c4c4c\" d=\"M6 12.5L12.5 6L19 12.5L12.5 19ZM51.5 6L58 12.5L51.5 19L45 12.5ZM58 51.5L51.5 58L45 51.5L51.5 45ZM12.5 58L6 51.5L12.5 45L19 51.5Z\"/><path fill=\"#b275d1\" d=\"M19 19L32 19L32 21.1L26.5 32L19 32ZM45 19L45 32L42.9 32L32 26.5L32 19ZM45 45L32 45L32 42.9L37.5 32L45 32ZM19 45L19 32L21.1 32L32 37.5L32 45Z\"/></svg>"
		}
  }
*/
    root.lookupAlias = function (alias, cb) {
      // If we were already waiting to perform a lookup, clear it
      if (timer) {
        clearTimeout(timer)
      }
      timer = setTimeout(function () {
        root.actualLookupAlias(alias, cb)
      }, 500)
    }

    root.lookupAddress = function (address, cb) {
      // If we were already waiting to perform a lookup, clear it
      if (timer) {
        clearTimeout(timer)
      }
      timer = setTimeout(function () {
        root.actualLookupAddress(address, cb)
      }, 500)
    }

    root.actualLookupAlias = function (alias, cb) {
      $log.debug('Perform lookup')
      var xhr = new XMLHttpRequest()
      //xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded')
      xhr.withCredentials = false
      xhr.open('GET', host + '/alias/' + alias, true)
      xhr.onerror = xhr.onabort = xhr.ontimeout = function () { cb('Lookup failed') }
      xhr.onload = function () {
        if (xhr.status === 422) {
          $log.debug('No such alias')
          var response = JSON.parse(xhr.responseText)
          cb(response.message)
        } else if (xhr.status === 200) {
          var response = JSON.parse(xhr.responseText)
          if (response.status === 'SUCCESS') {
            $log.debug('Success: ' + JSON.stringify(response.data))
            cb(null, response.data)
          } else if (response.status === 'ERROR') {
            $log.debug('Error: ' + JSON.stringify(response.message))
            cb(response.message)
          }
        } else {
          cb(xhr.status)
        }
      }
      xhr.send(null)
    }

    root.actualLookupAddress = function (address, cb) {
      $log.debug('Perform lookup')
      var xhr = new XMLHttpRequest()
      //xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded')
      xhr.withCredentials = false
      xhr.open('GET', host + '/address/' + address, true)
      xhr.onerror = xhr.onabort = xhr.ontimeout = function () { cb('Lookup failed') }
      xhr.onload = function () {
        if (xhr.status === 422) {
          $log.debug('No such address')
          cb('No such address')
        } else if (xhr.status === 200) {
          var response = JSON.parse(xhr.responseText)
          if (response.status === 'SUCCESS') {
            $log.debug('Success: ' + JSON.stringify(response.data))
            cb(null, response.data)
          } else if (response.status === 'ERROR') {
            $log.debug('Error: ' + JSON.stringify(response.message))
            cb(response.message)
          }
        } else {
          cb(xhr.status)
        }
      }
      xhr.send(null)
    }

    root.getAvatar = function (alias, cb) {
      $log.debug('Perform avatar lookup')
      var params = `alias=${alias}&type=png&size=70`;
      var xhr = new XMLHttpRequest()
      //xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded')
      xhr.withCredentials = false
      xhr.open('POST', host + '/alias/avatar', true)
      xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded")
      xhr.onerror = xhr.onabort = xhr.ontimeout = function () { cb('Lookup failed') }
      xhr.onload = function () {
        if (xhr.status === 422) {
          $log.debug('No such alias')
          cb('No such alias')
        } else if (xhr.status === 200) {
          var response = JSON.parse(xhr.responseText)
          if (response.status === 'SUCCESS') {
            $log.debug('Success: ' + JSON.stringify(response.data.avatar))
            cb(null, response.data.avatar)
          } else if (response.status === 'ERROR') {
            $log.debug('Error: ' + JSON.stringify(response.message))
            cb(response.message)
          }
        } else {
          cb(xhr.status)
        }
      }
      xhr.send(params)
    }

    root.createAlias = function (alias, address, email, isPrivate, signature, cb) {
      $log.debug('Perform Alias Creation')
      var params = `alias=${alias}&address=${address}&email=${email}&listed=${!isPrivate}&signature=${signature}`;
      var xhr = new XMLHttpRequest()
      //xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded')
      xhr.withCredentials = false
      xhr.open('POST', host + '/alias/create', true)
      xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded")
      xhr.onerror = xhr.onabort = xhr.ontimeout = function () { cb('Creation failed') }
      xhr.onreadystatechange = function () {
        if (this.status === 422) {
          var response = JSON.parse(this.responseText)
          $log.debug(response.message)
          cb(response.message)
        } else if (this.status === 200) {
          var response = JSON.parse(this.responseText)
          if (response.status === 'SUCCESS') {
            $log.debug('Success: ' + JSON.stringify(response.data))
            cb(null, response.data)
          } else if (response.status === 'ERROR') {
            $log.debug('Error: ' + JSON.stringify(response.message))
            cb(response.message)
          }
        } else {
          cb(xhr.status)
        }
      }
      xhr.send(params)
    }

    root.editAlias = function (alias, newAlias, address, email, isPrivate, newSignature, privateSignature, cb) {
      $log.debug('Perform Alias Editing')
      var params = `alias=${alias}&newAlias=${newAlias}&address=${address}&email=${email}&listed=${!isPrivate}&newSignature=${newSignature}&privateSignature=${privateSignature}`;
      var xhr = new XMLHttpRequest()
      //xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded')
      xhr.withCredentials = false
      xhr.open('POST', host + '/alias/edit', true)
      xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded")
      xhr.onerror = xhr.onabort = xhr.ontimeout = function () { cb('Editing failed') }
      xhr.onreadystatechange = function () {
        if (this.status === 422) {
          var response = JSON.parse(this.responseText)
          $log.debug(response.message)
          cb(response.message)
        } else if (this.status === 200) {
          var response = JSON.parse(this.responseText)
          if (response.status === 'SUCCESS') {
            $log.debug('Success: ' + JSON.stringify(response.data))
            cb(null, response.data)
          } else if (response.status === 'ERROR') {
            $log.debug('Error: ' + JSON.stringify(response.message))
            cb(response.message)
          }
        } else {
          cb(xhr.status)
        }
      }
      xhr.send(params)
    }

    return root
  })
