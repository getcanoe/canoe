'use strict';

angular.module('canoeApp.services').factory('txpModalService', function(configService, profileService, $rootScope, $ionicModal) {

  var root = {};


  var glideraActive = true; // TODO TODO TODO
  // isGlidera flag is a security measure so glidera status is not
  // only determined by the tx.message


  root.open = function(tx) {
    var wallet = tx.account ? tx.account : profileService.getAccount(tx.accountId);
    var config = configService.getSync().wallet;
    var scope = $rootScope.$new(true);
    scope.tx = tx;
    if (!scope.tx.toAddress) scope.tx.toAddress = tx.outputs[0].toAddress;
    scope.wallet = wallet;
    scope.canoeers = wallet ? wallet.canoeers : null;
    scope.isGlidera = glideraActive;
    scope.currentSpendUnconfirmed = config.spendUnconfirmed;
    // scope.tx.hasMultiplesOutputs = true;  // Uncomment to test multiple outputs

    $ionicModal.fromTemplateUrl('views/modals/txp-details.html', {
      scope: scope
    }).then(function(modal) {
      scope.txpDetailsModal = modal;
      scope.txpDetailsModal.show();
    });
  };

  return root;
});
