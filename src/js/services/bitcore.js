'use strict';
angular.module('canoeApp.services')
  .factory('bitcore', function bitcoreFactory(bwcService) {
    var bitcore = bwcService.getBitcore();
    return bitcore;
  });
