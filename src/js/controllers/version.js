'use strict';

angular.module('canoeApp.controllers').controller('versionController', function() {
  this.version = window.version;
  this.commitHash = window.commitHash;
});
