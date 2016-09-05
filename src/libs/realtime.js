/**
 * @file Manages a bunch of miscellaneous realtime events
 * @module realtime
 */

module.exports = function(io, socketIO) {
	io.on('connection', function(socket) {
		socket.pressingProgressLabel = false;

		socket.on('progress label click toggle', function() {
			socket.pressingProgressLabel = !socket.pressingProgressLabel;
			spinProgress();
		});
	});

	/**
	 * Determines if anyone is currently pressing the progress label, and emits whether should or should not spin
	 * @function spinProgress
	 */

	function spinProgress() {
		var anyPressing = false;

		for(var index in io.sockets.connected) {
			var socket = io.sockets.connected[index];

			if(socket.pressingProgressLabel) {
				anyPressing = true;
				break;
			}
		}

		io.emit('progress label spin', anyPressing);
	}
}
