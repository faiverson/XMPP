angular.module( 'ngBoilerplate.about', [
	'ui.router',
	'Scope.safeApply'
])

.config(function config( $stateProvider ) {
	$stateProvider.state( 'about', {
		url: '/about',
		views: {
			"main": {
				controller: 'AboutCtrl',
				templateUrl: 'home/home.tpl.html'
			}
		},
		data:{ pageTitle: 'About' }
	});
})

.controller('AboutCtrl', ['$scope', '$rootScope', '$filter', function AboutController($scope, $rootScope, $filter) {

	var connectArgs = {
		httpBindingURL: "https://im1.ciscowebex.com/http-bind",
		successCallback: function() {
			console.log('client connected');
			startEvents();
			init();
			$scope.$safeApply($scope, function() {
				$scope.me.name = $scope.user.username;
			});
		},
		errorCallback: function() {
			console.log('client error in connection');
			$scope.status = 'Not Connected: ';
		}
	};

	$scope.status = 'Not Connected';
	$scope.customMessage = '';
	$scope.contactList = [];
	$scope.groups = [];

	$scope.me = {
		name: '',
		status: '',
		message: ''
	};

	$scope.user = {
		username: 'luseglio',
		domain: 'fidelus.com',
		password: 'Santex01'
	};
	/*$scope.user = {
		username: 'scolussi',
		domain: 'fidelus.com',
		password: 'Lalala098'
	};*/
	$scope.contactName = 'ftorres@akkadianlabs.com';

	$rootScope.client = new jabberwerx.Client();
	$rootScope.roster = $rootScope.client.controllers.roster || new jabberwerx.RosterController($rootScope.client);
	$rootScope.quickcontact = $rootScope.client.controllers.quickContact || new jabberwerx.cisco.QuickContactController($rootScope.client);

function init() {
		$rootScope.roster.autoaccept = $rootScope.roster.AUTOACCEPT_NEVER;
		$rootScope.roster.autoaccept_in_domain = false;
		$rootScope.roster.autoremove = false;
		$rootScope.roster.defaultGroup = "Fidelus";

		$scope.$safeApply($scope, function() {
			$scope.status = 'Connected';
			$scope.refreshList();
		});
	}

	function handleStanzaSent(evt) {
		var stanza = evt.data;
		switch(stanza.pType()) {
			default:
				console.log(stanza.xml());
		}
	}

	$scope.refreshList = function() {
		$scope.contactList = [];
		$rootScope.client.entitySet.each(function(entity) {
			if (entity instanceof jabberwerx.Contact) {
				$scope.contactList.push({
					jid: entity.jid.getBareJIDString(),
					name: entity.getDisplayName()
				});
				console.log($scope.contactList);
			}
		});
	};

	$scope.connect = function() {
		$scope.status = 'Connecting';
		var bareJID = $scope.user.username + '@' + $scope.user.domain;
		var password = $scope.user.password;
		$rootScope.client.connect(bareJID, password, connectArgs);
	};

	$scope.addContact = function() {
		$rootScope.roster.updateContact($scope.contactName, $scope.contactName, ['fidelus'], function(errorStanza) {
			console.log('addContact callback');
			$scope.$safeApply($scope, function() {
				$rootScope.client.entitySet.each(function(entity) {
					var jid;
					if (entity instanceof jabberwerx.Contact) {
						jid = entity.jid.getBareJIDString();
						if($scope.contactName == jid) {
							$scope.contactList.push({
								jid: jid,
								name: entity.getDisplayName()
							});
						}
						console.log(entity);
					}
				});
			});
		});
	};

	$scope.deleteContact = function() {
		$rootScope.roster.deleteContact($scope.contactName, function() {
			console.log('deleteContact callback');
			$scope.$safeApply($scope, function() {
				//var index = $filter('filter')($scope.contactList, { jid: $scope.contactName})[0] - 1;
				var index = [];
				angular.forEach($scope.contactList, function(object, key) {
					if(object.jid === $scope.contactName) {
						this.push(key);
						return this;
					}
				}, index);
				index = index[0];
				if(index >= 0) {
					$scope.contactList.splice(index, 1);
				}
			});
		});
	};

	$scope.sendPresence = function(type) {
		console.log('sendPresence: ' + type + ' message: ' + $scope.customMessage);
		$scope.me.status = type;
		$scope.me.message = $scope.customMessage !== '' ? ' - ' + $scope.customMessage : '';
		$rootScope.client.sendPresence(type, $scope.customMessage);
	};

	function startEvents() {
		jabberwerx.globalEvents.bind("iqSent", handleStanzaSent);
		jabberwerx.globalEvents.bind("messageSent", handleStanzaSent);
		jabberwerx.globalEvents.bind("presenceSent", handleStanzaSent);
	}

}]);