import { Server } from 'socket.io';

declare global {
	namespace SocketIO {
		interface Socket {
			pressingProgressLabel: boolean;
		}
	}
}

export default (io: Server) => {
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
	 * Determines if anyone is currently pressing the progress label and emits whether it should or should not spin.
	 */
	function calcProgressSpin() {
		let anyPressing = false;

		for (const socket of Object.values(io.sockets.connected)) {
			if (socket.pressingProgressLabel) {
				anyPressing = true;
				break;
			}
		}

		io.emit('progress label spin', anyPressing);
	}
};
