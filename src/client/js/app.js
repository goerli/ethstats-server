'use strict';

/* Init Angular App */

var netStatsApp = angular.module('netStatsApp', ['netStatsApp.filters', 'netStatsApp.directives', 'ngStorage']);

netStatsApp.run(function($rootScope) {
	$rootScope.networkName = networkName || 'Ethereum';
	$rootScope.faviconPath = faviconPath || '/favicon-celo.ico';
});

/* Services */

netStatsApp.factory('socket', function ($rootScope) {
	return new Primus({
		// url: "your url here"
	}, {
		pingTimeout: 5 * 1000,
		timeout: 2 * 1000
	});
});

netStatsApp.factory('toastr', function ($rootScope) {
	toastr = window.toastr;
	toastr.options = {
		"closeButton": false,
		"debug": false,
		"progressBar": false,
		"newestOnTop": true,
		"positionClass": "toast-top-right",
		"preventDuplicates": false,
		"onclick": null,
		"showDuration": "300",
		"hideDuration": "1000",
		"timeOut": "5000",
		"extendedTimeOut": "1000",
		"showEasing": "swing",
		"hideEasing": "linear",
		"showMethod": "fadeIn",
		"hideMethod": "fadeOut"
	};
	return toastr;
});

netStatsApp.factory('_', function ($rootScope) {
	var lodash = window._;
	return lodash;
});
