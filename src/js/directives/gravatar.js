'use strict';

angular.module('canoeApp.directives')
  .directive('gravatar', function(md5) {
    return {
      restrict: 'AE',
      replace: true,
      scope: {
        name: '@',
        height: '@',
        width: '@',
        email: '@'
      },
      link: function(scope, el, attr) {
        if (typeof scope.email === "string") {
          scope.emailHash = md5.createHash(scope.email.toLowerCase() || '');
        }
      },
      template: '<img class="gravatar" alt="{{ name }}" height="{{ height }}"  width="{{ width }}" src="img/bcb_logo.png">'
    };
  });
