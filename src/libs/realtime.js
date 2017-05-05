'use strict';

/**
 * @file Manages a bunch of miscellaneous realtime events
 * @module realtime
 */

module.exports = io => {
	io.on('connection', socket => {
		socket.pressingProgressLabel = false;

		socket.on('progress label click', pressed => {
			socket.pressingProgressLabel = pressed;
			calcProgressSpin();
		});

		socket.on('disconnect', () => {
			socket.pressingProgressLabel = false;
			calcProgressSpin();
		});
	});

	/**
	 * Determines if anyone is currently pressing the progress label, and emits whether should or should not spin
	 * @function calcProgressSpin
	 */

	function calcProgressSpin() {
		let anyPressing = false;

		for(const socket of io.sockets.connected) {
			if(socket.pressingProgressLabel) {
				anyPressing = true;
				break;
			}
		}

		io.emit('progress label spin', anyPressing);
	}
};
