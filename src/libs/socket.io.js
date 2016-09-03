'use strict';

/**
 * @file Manages the socket.io server
 * @module socket.io
 */

var config = require(__dirname + '/config.js');
var socketioJwt = require('socketio-jwt');

module.exports = function(io) {

	console.log('start socket.io server')
	io.on('connection', function(socket) {
		console.log('User connected!');
	});

	// io.on('connection', socketioJwt.authorize({
	// 	secret: config.jwt.secret,
	// 	timeout: 1500
	// }))
	// .on('authenticated', function(socket) {
	// 	console.log('User connected!', socket.decoded_token)
	// });

	return {
		global: function() {
			io.emit.apply(io, arguments);
		}
	};
}
