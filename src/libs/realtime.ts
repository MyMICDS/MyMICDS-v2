import { Server } from 'socket.io';

export default (io: Server) => {
	io.on('connection', socket => {
		(socket as any).pressingProgressLabel = false;

		socket.on('progress label click', pressed => {
			(socket as any).pressingProgressLabel = pressed;
			calcProgressSpin();
		});

		socket.on('disconnect', () => {
			(socket as any).pressingProgressLabel = false;
			calcProgressSpin();
		});
	});

	/**
	 * Determines if anyone is currently pressing the progress label and emits whether it should or should not spin.
	 */
	function calcProgressSpin() {
		let anyPressing = false;

		for (const socket of Object.values(io.sockets.connected)) {
			if ((socket as any).pressingProgressLabel) {
				anyPressing = true;
				break;
			}
		}

		io.emit('progress label spin', anyPressing);
	}
};
