'use strict'

var modules = [
  'angularMoment',
  'monospaced.qrcode',
  'gettext',
  'ionic',
  'ionic-toast',
  'angular-clipboard',
  'ngTouch',
  'ngLodash',
  'ngCsv',
  'angular-md5',
  'bwcModule',
  'bitauthModule',
  'raiwApp.filters',
  'raiwApp.services',
  'raiwApp.controllers',
  'raiwApp.directives',
  'raiwApp.addons'
]

var raiwApp = window.raiwApp = angular.module('raiwApp', modules)

angular.module('raiwApp.filters', [])
angular.module('raiwApp.services', [])
angular.module('raiwApp.controllers', [])
angular.module('raiwApp.directives', [])
angular.module('raiwApp.addons', [])
