'use strict'
/* global angular */
window.rfid_invoice_controller_scope=null;
angular.module('canoeApp.controllers').controller('RFIDInvoiceController', function ($scope, $state/*, $stateParams, $timeout, $ionicHistory, gettextCatalog, aliasService, addressbookService, nanoService, popupService*/) {
  
    $scope.$on('$ionicView.enter', function (event, data) {

    if(window.rfid_invoice_controller_scope==null)
      window.rfid_invoice_controller_scope = $scope;
    $scope.updateValues();
  })

  $scope.updateValues = function()
  {
    $scope.rfid_invoice_storename_value = window.rfid_invoice_storename_value;
    $scope.rfid_invoice_amount_nano_value = window.rfid_invoice_amount_nano;
    $scope.rfid_invoice_local_currency = "Amount "+window.rfid_invoice_local_curr;
    $scope.rfid_invoice_local_currency_value = window.rfid_invoice_local_curr_amount;
    $scope.rfid_invoice_exchange_rate_value = window.rfid_invoice_exchange_rate;
  }

  $scope.updateView = function () {
    $scope.updateValues();
    $scope.$apply();
  }


  $scope.invoiceCancel = function () {
    $state.go('tabs.home')
  }

  $scope.invoicePay = function () {

        var privateKey = window.global_current_sk;
        var address = window.global_current_account;
        var balanceFormattedHex = leftPad(radix(rfid_invoice_rawBalanceAfter),32);
        var stateHash = computeStateHash(keyFromAccount(address),
                            window.rfid_invoice_previous_block,
                            keyFromAccount(window.rfid_invoice_app_rep_address),
                            balanceFormattedHex,
                            keyFromAccount(window.rfid_invoice_pos_address));
        var privateKeyHex = uint8_hex (privateKey);
        var stateHashHex = uint8_hex (stateHash);
        var signatureHex = XRB.signBlock(stateHashHex, privateKeyHex);
        window.rfid_block_sign = hce.util.hexStringToByteArray(signatureHex);

        console.log("RFID: Signature = " + signatureHex);

        if(window.rfid_block_sign != null)
        {
            window.rfid_status_button_text = "CANCEL";
            showRFIDStatusView("Payment prepared", "Move your phone over the reader to pay.");
        }
        else
            showRFIDStatusView("Error", "Failed to sign the payment.");
        
  }

  function computeStateHash(account, previous, representative, balance, link) 
  {
    var STATE_BLOCK_PREAMBLE = hex_uint8('0000000000000000000000000000000000000000000000000000000000000006');
    var account_b = hce.util.hexStringToByteArray(account);
    var previous_temp = hce.util.hexStringToByteArray(previous);
    var previous_b = arraycopy(previous_temp, 0, previous_b, 32 - previous_temp.length, previous_temp.length);
    var representative_b = hce.util.hexStringToByteArray(representative);
    var balance_b = hce.util.hexStringToByteArray(balance);
    var link_b = hce.util.hexStringToByteArray(link);
    var output = new Array(); 
    var ctx = blake2bInit(32);
    blake2bUpdate(ctx, STATE_BLOCK_PREAMBLE);
    blake2bUpdate(ctx, account_b);
    blake2bUpdate(ctx, previous_b);
    blake2bUpdate(ctx, representative_b);
    blake2bUpdate(ctx, balance_b);
    blake2bUpdate(ctx, link_b);
    output = blake2bFinal(ctx);
    return output;
  }

  function radix(value) 
  {
    return leftPad(value.toString(16).toUpperCase(), 32);
  }

  function leftPad(str, size) 
  {
    if (str.length >= size) 
    {
      return str;
    }
 
    while (str.length < size) 
    {
      str = "0"+str;
    }
    return str;
  }
})
