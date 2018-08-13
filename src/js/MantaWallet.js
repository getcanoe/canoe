//
//  MantaWallet.js
//  mantaprotocol
//
//  Created by Alessandro Viganò.
//  Modified by Tyler Storm.
//  Copyright © 2018 Alessandro Viganò. All rights reserved.
//
(function (root, factory) {
	"use strict";

	/*global define*/
	if (typeof module === 'object' && module.exports) {
		module.exports = factory(require('paho-mqtt'))         // Node
	} else if (typeof define === 'function' && define.amd) {
		define(['paho-mqtt'], factory)                         // AMD
	} else {
		factory(root.Paho.MQTT.Client)                         // Browser
	}
}(this, function (MantaWallet) {
  var mqtt,
    sessionID,
    paymentRequest,
    port,
    host,
    connected

  isConnected = function () {
    return connected
  }

  disconnect = function () {
    if (mqtt) {
      mqtt.disconnect()
    }
    mqtt = null
  }

  onConnected = function (isReconnect) {
    connected = true
  }

  onFailure = function () {
    console.log('MQTT failure')
    connected = false
  }

  onConnectionLost = function (responseObject) {
    if (responseObject.errorCode !== 0) {
      console.log('MQTT connection lost: ' + responseObject.errorMessage)
    }
    connected = false
  }
  connectFailure = function (c, code, msg) {
    console.log('Failed connecting to MQTT: ' + JSON.stringify({context: c, code: code, msg: msg}))
    disconnect()
  }
  connectSuccess = function () {
    console.log('Connected to MQTT broker.')
  }

  parseURL = function (url) {
    let pattern = /(^manta:\/\/((?:\w|\.)+)(?:(\d+))?\/(\d+)$)/
    return url.match(pattern)
  }

  onMessageArrived = function (message) {
    console.log('Topic: ' + message.destinationName + ' Payload: ' + message.payloadString)
    var topic = message.destinationName
    var payload = message.payloadString
    var tokens = topic.split('/')

    switch (tokens[0]) {
      case 'payment_requests':
        console.log("Got Payment Request");
        var paymentRequestMessage = JSON.parse(payload)
        console.log(paymentRequestMessage);
        return
      default:
        console.log("Unknown Case");
    }
  }

  init = function (url) {
    var results = parseURL(url)
    if (results.length < 2) return null;
    host = results[0]
    sessionID = parseInt(results[results.length-1])
    port = results.length === 3 ? parseInt(results[1]) : 1883
    console.log("NEW MANTA WALLET")
    mqtt = new Paho.MQTT.Client(host,port,"testClient")
    mqtt.onConnectionLost = onConnectionLost
    mqtt.onConnected = onConnected
    mqtt.onFailure = onFailure
    mqtt.onMessageArrived = onMessageArrived
    var opts = {
      reconnect: true,
      keepAliveInterval: 3600,
      useSSL: true,
      onSuccess: connectSuccess,
      onFailure: connectFailure
    }
  }

  getPaymentRequest = function() {
    mqtt.subscribe("/payment_requests/" + sessionID)
  }

  sendPayment = function(cryptoCurrency, hashes) {
    var paymentMessage = {
      "crypto_currency": cryptoCurrency,
      "transaction_hash": hashes
    }
    var jsonData = JSON.stringify(paymentMessage)
    publish('/payments/' + sessionID, jsonData, 2, false)
  }

  publish = function (topic, json, qos, retained) {
    if (mqtt) {
      var message = new Paho.MQTT.Message(json)
      message.destinationName = topic
      if (qos !== undefined) {
        message.qos = qos
      }
      if (retained !== undefined) {
        message.retained = retained
      }
      console.log('Send ' + topic + ' ' + json)
      mqtt.send(message)
    } else {
      console.log('Not connected to MQTT, should send ' + topic + ' ' + json)
    }
  }
  MantaWallet.init = MantaWallet.init
  return MantaWallet
}));