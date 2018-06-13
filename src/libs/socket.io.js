'use strict';

/**
 * @file Manages the socket.io server
 * @module socket.io
 */
const config = require(__dirname + '/config.js');

const _ = require('underscore');
const jwt = require('jsonwebtoken');

module.exports = io => {

	io.on('connection', socket => {

		/*
		 * We keep the client connected so it can still recieve global events like weahter.
		 * If the client supplies a JWT though, then it can recieve user-specific events
		 * like if the user changed their background.
		 */

		socket.on('authenticate', token => {

			jwt.verify(token, config.jwt.secret, {
				algorithms: ['HS256'],
				audience: config.hostedOn,
				issuer: config.hostedOn,
				clockTolerance: 30

			}, (err, decoded) => {
				if (err) {
					socket.emit('unauthorized');
					return;
				}

				// User is valid!
				if (!err && decoded) {
					socket.decodedToken = decoded;
					socket.emit('authorized');
				}
			});
		});
	});

	return {
		global: () => {
			io.emit.apply(io, arguments);
		},
		user: () => {
			const argumentsArray = Array.from(arguments);
			const emitUser = argumentsArray[0];
			const emitEvent = argumentsArray.slice(1);

			_.each(io.sockets.connected, value => {
				// Check if user is authorized
				if (!value.decodedToken) return;
				// If logged in user has same username as target user
				if (emitUser === value.decodedToken.user) {
					value.emit.apply(value, emitEvent);
				}
			});
		}
	};
};
