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
  'canoeApp.filters',
  'canoeApp.services',
  'canoeApp.controllers',
  'canoeApp.directives',
  'canoeApp.addons'
]

var canoeApp = window.canoeApp = angular.module('canoeApp', modules)

//nw.Window.get().showDevTools()

angular.module('canoeApp.filters', [])
angular.module('canoeApp.services', [])
angular.module('canoeApp.controllers', [])
angular.module('canoeApp.directives', [])
angular.module('canoeApp.addons', [])
