'use strict';
angular.module('raiwApp.services')
  .factory('bitcore', function bitcoreFactory(bwcService) {
    var bitcore = bwcService.getBitcore();
    return bitcore;
  });
