'use strict';
angular.module('raiwApp.services')
  .factory('bitcoreCash', function bitcoreFactory(bwcService) {
    var bitcoreCash = bwcService.getBitcoreCash();
    return bitcoreCash;
  });
