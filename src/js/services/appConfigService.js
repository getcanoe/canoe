'use strict';

angular.module('canoeApp.services').factory('appConfigService', function($window) {
  return $window.appConfig;
});
