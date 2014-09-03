angular.module( 'ngBoilerplate.chat', [
  'ui.router',
  'Scope.safeApply'
])

.config(function config( $stateProvider ) {
  $stateProvider.state( 'chat', {
	url: '/chat',
	views: {
		"main": {
			controller: 'ChatCtrl',
			templateUrl: 'chat/chat.tpl.html'
		}
	},
	data:{ pageTitle: 'Chat' }
  });
})

.controller('ChatCtrl', ['$scope', '$rootScope', '$filter', function ChatController($scope, $rootScope, $filter) {

	$scope.user = {
		username: 'ftorres',
		domain: 'akkadianlabs.com',
		password: 'FTorr3s'
	};
	/*
		username: 'luseglio',
		domain: 'fidelus.com',
		password: 'Santex01'
	*/

	$scope.chat = {
		broadcast: '',
		subject: '',
		invite: 'aferrari@fidelus.com'
	};

	var connectArgs = {
		httpBindingURL: "https://im1.ciscowebex.com/http-bind",
		successCallback: function() {
			console.log('client connected');
			startEvents();
			init();
			$scope.$safeApply($scope, function() {
				$scope.mucServer = "achatroom@" + $rootScope.client.controllers.disco.findByIdentity("conference/text")[0].jid;
				$scope.errorMessage = '';
			});
			if($rootScope.client.event("clientDisconnected") !== undefined) {
				$rootScope.client.event("clientDisconnected").bind(function(evt) {
					$scope.$safeApply($scope, function() {
						$scope.status = 'Not Connected';
						$scope.bareJID = null;
					});
				});
			} else {
				console.log('Cisco is not returning an event here!');
			}
		},
		errorCallback: function() {
			console.log('client error in connection');
			$scope.$safeApply($scope, function() {
				$scope.status = 'Not Connected';
				$scope.errorMessage = 'Client error in connection';
			});
		}
	};

	$scope.status = 'Not Connected';
	$scope.errorMessage = '';
	$scope.contactList = [];
	$scope.occupants = [];
	$scope.broadcasts = [];
	$scope.inRoom = false;

	$rootScope.client = new jabberwerx.Client();
	$rootScope.roster = $rootScope.client.controllers.roster || new jabberwerx.RosterController($rootScope.client);
	$rootScope.quickcontact = $rootScope.client.controllers.quickContact || new jabberwerx.cisco.QuickContactController($rootScope.client);
	$rootScope.muc = $rootScope.client.controllers.muc || new jabberwerx.MUCController($rootScope.client);
	$scope.room = null;
	$scope.roomEntered = false;

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

	$scope.connect = function() {
		$scope.status = 'Connecting';
		$scope.bareJID = $scope.user.username + '@' + $scope.user.domain;
		var password = $scope.user.password;
		$rootScope.client.connect($scope.bareJID, password, connectArgs);
	};

	$scope.disconnect = function() {
		$rootScope.client.disconnect();
	};

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

	$scope.enterRoom = function() {
		console.log('enterRoom');
		// if the client has not been created or we are not yet fully connected...
		if($rootScope.client == null || !$rootScope.client.isConnected()) {
			$scope.$safeApply($scope, function() {
				$scope.errorMessage = "The client is not connected.  Please connect first.";
			});
		}

		//create the room using the user supplied room name
		//see ../api/symbols/jabberwerx.MUCController.html#room
		$scope.$safeApply($scope, function() {
			$scope.room = $scope.muc.room($scope.mucServer);
		});

		$scope.muc.event("mucInviteReceived").bind(function(evt) {
			console.log(evt.data.getInvitor() + " invited you to chat in room: " + evt.data.getRoom());
		});

		// Respond to an event that is triggered when an occupant is added to the room
		$scope.room.occupants.event("entityCreated").bind(function(evt) {
			console.log('entityCreated');
			updateOccupantsList();
		});

		// Respond to an event that is triggered when an occupant is updated in the room
		$scope.room.occupants.event("entityUpdated").bind(function(evt) {
			console.log('entityUpdated');
			updateOccupantsList();
		});

		// Respond to an event that is triggered when an occupant is removed from the room
		$scope.room.occupants.event("entityDestroyed").bind(function(evt) {
			console.log('entityDestroyed');
			updateOccupantsList();
		});

		// Respond to an event that is triggered when an occupant in the room is renamed
		$scope.room.occupants.event("entityRenamed").bind(function(evt) {
			console.log('entityRenamed');
			updateOccupantsList();
		});

		/**
		 * Event fired when the room has been entered completely. This
		 * event handler maps other event handlers that are valid only
		 * when a room has been entered.
		 */
		$scope.room.event("roomEntered").bind(function(evt) {
			console.log('roomEntered');

			$scope.room.event("roomExited").bind(function(evt) {
				console.log('roomExited');
				$scope.exitRoom();
			});

			$scope.room.event("roomBroadcastReceived").bind(function(evt) {
				console.log('roomBroadcastReceived');
				$scope.$safeApply($scope, function() {
					$scope.broadcasts.push(evt.data.getBody());
					$scope.chat.broadcast = '';
				});
			});

			$scope.room.event("roomSubjectChanged").bind(function(evt) {
				console.log('roomSubjectChanged');
				$scope.$safeApply($scope, function() {
					$scope.subject = ': ' + evt.data.getSubject();
				});
			});

			//console.log($scope.room.properties.subject);
		});

		$scope.room.event("roomCreated").bind(function(evt) {
			console.log('roomCreated');
			$scope.$safeApply($scope, function() {
				$scope.roomEntered = true;
			});
		});

		$scope.room.event("errorEncountered").bind(function(evt) {
			console.log('errorEncountered');
			$scope.$safeApply($scope, function() {
				$scope.errorMessage = 'Error encountered';
			});
		});

		var enterRoomArgs = {
			successCallback: function() {
				console.log('enter room success');
			},
			configureCallback: function() {
			},
			errorCallback: function(err, aborted) {
				$scope.$safeApply($scope, function() {
					$scope.errorMessage = 'Error entering room: ' + err.message;
				});
				$scope.exitRoom();
			}
		};

		try {
			$scope.room.enter($scope.bareJID + "/" + $rootScope.client.resourceName, enterRoomArgs);
		} catch(ex) {
			$scope.$safeApply($scope, function() {
				$scope.errorMessage = "The following error occurred while attempting to enter the room: " + ex.message;
			});
		}
	};

	$scope.exitRoom = function() {
		$scope.$safeApply($scope, function() {
			$scope.room.destroy();
			$scope.roomEntered = false;
			$scope.room = null;
			updateOccupantsList();
		});
	};

	$scope.broadcast = function() {
		if($scope.room == null || !$scope.room.isActive()) {
			$scope.$safeApply($scope, function() {
				$scope.errorMessage = "Please enter a chat room before attempting to broadcast.";
			});
			return;
		}

		try {
			$scope.room.sendBroadcast($scope.chat.broadcast);
		} catch(ex) {
			$scope.$safeApply($scope, function() {
				$scope.errorMessage = ex.message;
			});
		}
	};

	$scope.subject = function() {
		if($scope.room == null || !$scope.room.isActive()) {
			$scope.$safeApply($scope, function() {
				$scope.errorMessage = "Please enter a chat room before attempting to broadcast.";
			});
			return;
		}

		try {
			$scope.room.changeSubject($scope.chat.subject, function(err) {
				if (err) {
					$scope.$safeApply($scope, function() {
						$scope.errorMessage = "Subject could not be changed. " + jabberwerx.errorReporter.getMessage(err.error);
					});
				}
			});
		} catch(ex) {
			$scope.$safeApply($scope, function() {
				$scope.errorMessage = "Error occurred while changing subject: " + ex.message;
			});
		}
	};

	$scope.invitation = function() {
		if($scope.room == null || !$scope.room.isActive()) {
			safeApply($scope, function() {
				$scope.errorMessage = "Please enter a chat room before attempting to broadcast";
			});
			return;
		}

		try {
			var jids = $scope.room.invite($scope.chat.invite, "Because", true);
			console.log(jids);
		} catch(ex) {
			$scope.$safeApply($scope, function() {
				$scope.errorMessage = "Error occurred while inviting a user: " + ex.message;
			});
		}
	};

	function handleStanzaSent(evt) {
		var stanza = evt.data;
		if(!stanza instanceof jabberwerx.MUCRoom) {
			switch(stanza.pType()) {
				default:
					console.log(stanza.xml());
			}
		}
	}

	/**
	 * Called when the entityCreated, entityUpdated, entityDestroyed
	 * and entityRenamed events are triggered against the MUCOccupantCache
	 *
	 * see ../api/symbolds/jabberwerx.MUCOccupantCache.html
	 */
	function updateOccupantsList() {
		/**
		 * room.occupants is a jabberwerx.EntitySet of
		 * jabberwerx.MUCOccupant entities. The toArray method converts
		 * an entity set to a simple array of entities.
		 *
		 * ../api/symbols/jabberwerx.MUCOccupant.html
		 */
		var occupants;
		$scope.$safeApply($scope, function() {
			if(typeof $scope.room !== 'undefined') {
				occupants = $scope.room.occupants.toArray();
				for(var i in occupants) {
					$scope.occupants[i] = {
						name: occupants[i].getNickname()
					};
				}
			}
			else {
				$scope.occupants = [];
			}
		});
	}

	function startEvents() {
		jabberwerx.globalEvents.bind("iqSent", handleStanzaSent);
		jabberwerx.globalEvents.bind("messageSent", handleStanzaSent);
		jabberwerx.globalEvents.bind("presenceSent", handleStanzaSent);
		jabberwerx.globalEvents.bind("presenceSent", handleStanzaSent);
		jabberwerx.globalEvents.bind("roomEntered", handleStanzaSent);
		jabberwerx.globalEvents.bind("roomCreated", handleStanzaSent);
		jabberwerx.globalEvents.bind("errorEncountered", handleStanzaSent);
		jabberwerx.globalEvents.bind("entityAdded", handleStanzaSent);
		jabberwerx.globalEvents.bind("entityCreated", handleStanzaSent);
		jabberwerx.globalEvents.bind("entityUpdated", handleStanzaSent);
		jabberwerx.globalEvents.bind("entityDestroyed", handleStanzaSent);
		jabberwerx.globalEvents.bind("mucInviteReceived", function(evt) {
			console.log(evt.data.getInvitor() + " invited you (global) to chat in room: " + evt.data.getRoom());
		});

	}

}]);