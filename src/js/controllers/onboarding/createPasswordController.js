'use strict'

angular.module('canoeApp.controllers').controller('createPasswordController', function ($state, $rootScope, $scope, $timeout, $log, configService, gettextCatalog, fingerprintService, profileService, lodash, applicationService) {

	function createPassword(cb) {
		if ($scope.password) return cb(null, $scope.password)
			walletService.prepare(wallet, function (err, password) {
				if (err) return cb(err)
				$scope.password = password
				return cb(null, password)
			})
		};
})
