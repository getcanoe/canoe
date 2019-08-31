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
    connected,
    cb

  var APPIA_PEM = `
  -----BEGIN CERTIFICATE-----
  MIIDaDCCAlCgAwIBAgIINZv0BbLXm9AwDQYJKoZIhvcNAQELBQAwOjELMAkGA1UE
  BhMCVUsxDjAMBgNVBAoTBUFwcGlhMRswGQYDVQQDExJBcHBpYSBEZXZlbG9wZXIg
  Q0EwHhcNMTgxMDE3MDc0MjAwWhcNMjgxMDE3MDc0MjAwWjA6MQswCQYDVQQGEwJV
  SzEOMAwGA1UEChMFQXBwaWExGzAZBgNVBAMTEkFwcGlhIERldmVsb3BlciBDQTCC
  ASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBALLV0rgr0TYjTKMLOPQlHNp9
  V2NyfyTY6rZd3uLs6UWH4BZSAu2jlB40pWeIoFZb7+sBuJbGe4l1VKPgospynB/+
  +qxDnMNjY2M41a4Gv2Mr261xfNKJ0Vwd1D7WK9XN+3p4BS2dEmv685dSk3AhbnhU
  RVcIFy6aUYCVjLZeg3M0CGPaGy6Zb0g8kt5mQdAQtFTE0wZ0cSUPea9QT+5kDs38
  Lc0jVo1QqB4DFpJ6ceg3sLSB2fGS6c4YEU8SKvu2rLk/VVJJstjFrAwvKQfx+oSx
  NPotU37C4zPG3wBfWb2o/DjFUPWyq6sjtXUb6kmzfcsdP50vN0K8LTpBF84CsqUC
  AwEAAaNyMHAwDwYDVR0TAQH/BAUwAwEB/zAdBgNVHQ4EFgQUOJcBmAyRITBHOIqC
  s+sZ5eM0xlQwCwYDVR0PBAQDAgEGMBEGCWCGSAGG+EIBAQQEAwIABzAeBglghkgB
  hvhCAQ0EERYPeGNhIGNlcnRpZmljYXRlMA0GCSqGSIb3DQEBCwUAA4IBAQCpudBY
  QX4bm6La9cx7h4fruuBmC2NIF2GhobZzd1lEx5bEPtq5S6kx3Qr7pY0yoQtN+lpn
  XWJJQcks3a4WhF0YeqesBcLdlXqMCDsFU6A4yJ6x25FaoelMpv+Keoj+sYuNtcyb
  sfWjDvDaOU1jj76nLX+llMHAau0gALQrH39KCYkORwltOQgc98X/aX/UiBMBxSz8
  dCU0MPLl8dU8KnprtG2Ibik86J649o4EJr0lA01liQicr/viKrVOqzS6cq18hJaX
  zvYu2RVV+AtDHXXE462p3sT8Bk2iB979aDV3GsD0/WrRVwyPhi7YG6zM4otv59xF
  O+dbxo9YqCeAzbna
  -----END CERTIFICATE-----
  `;

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
    mqtt.subscribe("certificate")
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
    var pattern = /manta:\/\/((?:\w|\.)+)(?::(\d+))?\/(.+)/
    return url.match(pattern)
  }

  function onMessageArrived(message) {
    console.log('Topic: ' + message.destinationName + ' Payload: ' + message.payloadString)
    var topic = message.destinationName
    var payload = message.payloadString
    if (topic === 'certificate') {
      console.log("cert received")
      console.log(payload)
      if (verifyChain(payload, APPIA_PEM)) {
        mqtt.subscribe("payment_requests/" + sessionID)
        publish('payment_requests/' + sessionID + '/all', {}, 1, false)
      } else {
        console.log("Invalid Signature Chain");
        cb(
          {
            error:"Invalid Signature Chain"
          }
        );
      }
    } else {
      var tokens = topic.split('/')
      switch (tokens[0]) {
        case 'payment_requests':
          console.log("Got Payment Request");
          var paymentRequest = JSON.parse(payload)
          var paymentRequestMessage = JSON.parse(paymentRequest.message)
          for (var i = 0; i < paymentRequestMessage.destinations.length; i++) {
            if (paymentRequestMessage.destinations[i].crypto_currency === "BCB") {
              if (verifySignature(APPIA_PEM,paymentRequest.message,paymentRequest.signature)) {
                console.log("Valid Signature");
                var big = new BigNumber(paymentRequestMessage.destinations[i].amount);
                var amount = (big.times(Math.pow(10, 30))).toFixed(0)
                var paymentDetails = {
                  error: null,
                  account: paymentRequestMessage.destinations[i].destination_address,
                  amount: amount,
                  message: paymentRequestMessage
                }
                console.log("Returning from MantaWallet");
                console.log(paymentDetails)
                cb(paymentDetails);
                break;
              } else {
                console.log("Invalid Signature");
                cb(
                  {
                    error:"Invalid Signature"
                  }
                );
              }
            }
          }
        default:
          console.log("Unknown Case");
      }
    }
  }

  function publishPayment(hash) {
    var payment = {
      crypto_currency: "bcb",
      transaction_hash: hash,
    };
    mqtt.subscribe('acks/'+sessionID);
    publish('payments/'+sessionID, JSON.stringify(payment), 1, false);
  }

  function verifyChain(testCer, caCer) {
    var caStore = forge.pki.createCaStore([caCer]);
    var result = false;
    try {
      result = forge.pki.verifyCertificateChain(caStore, [testCer]);
    } catch (e) {
      console.log(e);
    }
    return result;
  }

  function verifySignature(key, message, signature) {
    var cert = forge.pki.certificateFromPem(key);
    var publicKey = cert.publicKey;
    var messageDigest = forge.md.sha256.create();
    messageDigest.update(message, "utf-8");
    var dsig = forge.util.decode64(signature);
    var result = false;
    try {
      result = publicKey.verify(messageDigest.digest().bytes(), dsig);
    } catch (e) {
      console.log(e);
    }
    return result;
  }

  function init(url, callback) {
    cb = callback
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
  var MantaWallet = {}
  MantaWallet.init = init
  MantaWallet.isConnected = isConnected
  MantaWallet.disconnect = disconnect
  MantaWallet.publishPayment = publishPayment
})));