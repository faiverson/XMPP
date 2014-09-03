angular.module( 'ngBoilerplate.home', [
	'ui.router',
	'Scope.safeApply'
])

.config(function config( $stateProvider ) {
	$stateProvider.state( 'home', {
		url: '/home',
		views: {
			"main": {
				controller: 'HomeCtrl',
				templateUrl: 'home/home.tpl.html'
			}
		},
		data:{ pageTitle: 'Home' }
	});
})

.controller('HomeCtrl', ['$scope', '$rootScope', '$filter', function HomeController($scope, $rootScope, $filter) {

	var connectArgs = {
		httpBindingURL: "https://im1.ciscowebex.com/http-bind",
		successCallback: function() {
			console.log('client connected');
			startEvents();
			init();
			$scope.$safeApply($scope, function() {
				$scope.me.name = $scope.user.username;
			});

			$rootScope.client.event("presenceReceived", function() {
				console.log("presencereceived client");
			});
			var notifier =  $rootScope.client.applyEvent("caramba");
			var cb = function(eventObject) {
				console.log("subscriptionReceived connectedUser");
			};
			notifier.bind(cb);
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
		username: 'ftorres',
		domain: 'akkadianlabs.com',
		password: 'FTorr3s'
	};
	$scope.contactName = 'luseglio@fidelus.com';

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

	$scope.changeStatus = function(presence) {
		if(presence instanceof jabberwerx.Presence) {
			$scope.$safeApply($scope, function() {
				$scope.me = {
					name: $scope.me.name,
					status: presence.getType()  ? presence.getType() : $scope.me.status,
					message: presence.getStatus() ? presence.getStatus() : $scope.me.message
				};
			});
		}
	};

	function startEvents() {
		jabberwerx.globalEvents.bind("iqSent", handleStanzaSent);
		jabberwerx.globalEvents.bind("messageSent", handleStanzaSent);
		jabberwerx.globalEvents.bind("presenceSent", handleStanzaSent);

		jabberwerx.globalEvents.bind("resourcePresenceChanged", function(evt) {
			console.log("subscriptionReceived global");
		});

		jabberwerx.globalEvents.bind("primaryPresenceChanged", function(evt) {
			console.log("primaryPresenceChanged global");
			// the client user changes the status
			if($rootScope.client.connectedUser._guid === evt.source._guid){
				$scope.changeStatus(evt.data.presence);
			}
		});

		jabberwerx.globalEvents.bind("subscriptionReceived", function(evt) {
			console.log("subscriptionReceived global");

			var contact = evt.data.stanza.getFromJID();
			//$rootScope.roster.denySubscription(contact);
		});

		jabberwerx.globalEvents.bind("unsubscriptionReceived", function(evt) {
			console.log("unsubscriptionReceived global");
			var contact = evt.data.stanza.getFromJID();
			//$rootScope.roster.denySubscription(contact);
		});

		jabberwerx.globalEvents.bind("presenceReceived", function(evt) {
			console.log("presenceReceived global");
		});

		jabberwerx.globalEvents.bind("entityAdded", function(evt) {
			console.log("entityAdded global");
		});

		jabberwerx.globalEvents.bind("entityCreated", function(evt) {
			console.log("entityCreated global");
		});

		jabberwerx.globalEvents.bind("entityUpdated", function(evt) {
			console.log("entityUpdated global");
		});

		jabberwerx.globalEvents.bind("entityDestroyed", function(evt) {
			console.log("entityDestroyed global");
		});

		/*
		// @TODO: are not working at all, only global events are working
		$rootScope.client.event('presenceReceived', function() {
			console.log('presenceReceived');
		});

		$rootScope.client.entitySet.event('entityCreated', function() {
			console.log('entityCreated');
		});

		$rootScope.client.entitySet.event('entityUpdated', function() {
			console.log('entityUpdated');
		});

		$rootScope.client.entitySet.event('entityDestroyed', function() {
			console.log('entityDestroyed');
		});

		$rootScope.roster.event("subscriptionReceived", function(evt) {
			console.log("subscriptionReceived");
			console.log(evt);
		});

		$rootScope.roster.event("unsubscriptionReceived", function(evt) {
			console.log("unsubscriptionReceived");
			console.log(evt);
		});*/
	}

}]);