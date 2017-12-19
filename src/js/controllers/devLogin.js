'use strict';

angular.module('raiwApp.controllers').controller('DevLoginController', function($scope, $rootScope, $routeParams, identityService) {

  var mail = $routeParams.mail;
  var password = $routeParams.password;

  var form = {};
  form.email = {};
  form.password = {};
  form.email.$modelValue = mail;
  form.password.$modelValue = password;

  identityService.open($scope, form);

});
