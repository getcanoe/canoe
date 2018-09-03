'use strict'
/* global angular */

window.rfid_status_controller_scope=null;
angular.module('canoeApp.controllers').controller('RFIDStatusController', function ($scope, $state/*, $stateParams, $timeout, $ionicHistory, gettextCatalog, aliasService, addressbookService, nanoService, popupService*/) {

    $scope.$on('$ionicView.enter', function (event, data) {
    window.rfid_status_controller_scope = $scope;
    $scope.updateValues();
  })

  $scope.updateValues = function() {
  	$scope.rfid_status_headline_text = window.rfid_status_headline;
    $scope.rfid_status_message_text = window.rfid_status_message;

    if(window.rfid_status_button_text != null)
    {
    	$scope.rfid_status_button_text = window.rfid_status_button_text;
    	window.rfid_status_button_text = null;
    }
    else
    {
    	$scope.rfid_status_button_text = "RETURN";
    }
  }

  $scope.statusReturn = function () {
    $state.go('tabs.home')
    resetRFIDVars();
  }

  $scope.updateView = function () {
  	$scope.updateValues();
    $scope.$apply();
  }
})
