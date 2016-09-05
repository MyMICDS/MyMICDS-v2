'use strict';

/**
 * @file Manages the socket.io server
 * @module socket.io
 */

var config = require(__dirname + '/config.js');

var _   = require('underscore');
var jwt = require('jsonwebtoken');

module.exports = function(io) {

	io.on('connection', function(socket) {

		/*
		 * We keep the client connected so it can still recieve global events like weahter.
		 * If the client supplies a JWT though, then it can recieve user-specific events
		 * like if the user changed their background.
		 */

		socket.on('authenticate', function(token) {

			jwt.verify(token, config.jwt.secret, {
				algorithms: ['HS256'],
				audience: config.hostedOn,
				issuer: config.hostedOn,
				clockTolerance: 30

			}, function(err, decoded) {
				if(err) {
					socket.emit('unauthorized');
					return;
				}

				// User is valid!
				if(!err && decoded) {
					socket.decodedToken = decoded;
					socket.emit('authorized');
				}
			});
		});
	});

	return {
		global: function() {
			io.emit.apply(io, arguments);
		},
		user: function() {
			var argumentsArray = Array.prototype.slice.call(arguments);
			var emitUser = argumentsArray[0];
			var emitEvent = argumentsArray.slice(1);

			_.each(io.sockets.connected, function(value, key) {
				// Check if user is authorized
				if(!value.decodedToken) return;
				// If logged in user has same username as target user
				if(emitUser === value.decodedToken.user) {
					value.emit.apply(value, emitEvent);
				}
			});
		}
	};
}
