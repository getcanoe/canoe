//
//  MantaWallet.js
//  mantaprotocol
//
//  Created by Alessandro Viganò.
//  Modified by Tyler Storm.
//  Copyright © 2018 Alessandro Viganò. All rights reserved.
//
;(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    global.MantaWallet = factory()
}(this, (function () { 'use strict';
  var mqtt,
    sessionID,
    paymentRequest,
    port,
    host,
    connected

  function isConnected() {
		return connected
  }

  function disconnect() {
    if (mqtt) {
      mqtt.disconnect()
    }
    mqtt = null
  }

  function onConnected(isReconnect) {
		console.log("connected")
    connected = true
		mqtt.subscribe("/PAYMENT_REQUESTS/" + sessionID)
		publish('/PAYMENT_REQUEST/' + sessionID + '/all', null, 2, false)
  }

  function onFailure() {
    console.log('MQTT failure')
    connected = false
  }

  function onConnectionLost(responseObject) {
    if (responseObject.errorCode !== 0) {
      console.log(responseObject)
    }
    connected = false
  }
  function connectFailure(c, code, msg) {
    console.log('Failed connecting to MQTT: ' + JSON.stringify({context: c, code: code, msg: msg}))
    disconnect()
  }
  function connectSuccess() {
    console.log('Connected to MQTT broker.')
  }

  function parseURL(url) {
    let pattern = /manta:\/\/((?:\w|\.)+)(?::(\d+))?\/(.+)/
    return url.match(pattern)
  }

  function onMessageArrived(message) {
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

  function init(url) {
    var results = parseURL(url)
		console.log(results)
    if (results.length < 2) return null;
    host = results[1]
    sessionID = results[results.length-1]
    port = results.length === 3 ? parseInt(results[1]) : 9000
    console.log("Initalizing a new MQTT Connection")
    mqtt = new Paho.MQTT.Client(host,port,"canoeNanoWallet")
    mqtt.onConnectionLost = onConnectionLost
    mqtt.onConnected = onConnected
    mqtt.onFailure = onFailure
    mqtt.onMessageArrived = onMessageArrived
    var opts = {
      reconnect: true,
			keepAliveInterval: 3600,
      onSuccess: connectSuccess,
      onFailure: connectFailure
    }
		mqtt.connect(opts)
  }

   function publish(topic, json, qos, retained) {
		console.log("publishing")
    if (mqtt) {
			console.log(json)
			console.log(topic)
      var message = new Paho.MQTT.Message(json)
			console.log(message)
      message.destinationName = topic
			console.log(2)
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
	var MantaWallet = {}
  MantaWallet.init = init
	MantaWallet.isConnected = isConnected
	MantaWallet.disconnect = disconnect
	MantaWallet.publish = publish
  return MantaWallet
})));