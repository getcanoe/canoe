'use strict';

angular.module('raiwApp.services').factory('appConfigService', function($window) {
  return $window.appConfig;
});
