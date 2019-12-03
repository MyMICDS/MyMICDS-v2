import * as jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import config from './config';

export default (io: Server) => {

	io.on('connection', socket => {

		/*
		 * We keep the client connected so it can still recieve global events like weahter.
		 * If the client supplies a JWT though, then it can recieve user-specific events
		 * like if the user changed their background.
		 */

		socket.on('authenticate', token => {
			let decoded;

			try {
				decoded = jwt.verify(token, config.jwt.secret, {
					algorithms: ['HS256'],
					audience: config.hostedOn,
					issuer: config.hostedOn,
					clockTolerance: 30
				});
			} catch (err) {
				socket.emit('unauthorized');
				return;
			}

			// User is valid!
			if (decoded) {
				(socket as any).decodedToken = decoded;
				socket.emit('authorized');
			}
		});
	});

	return {
		global(event: string, ...args: any[]) {
			io.emit(event, ...args);
		},
		user(emitUser: string, event: string, ...args: any[]) {
			for (const value of Object.values(io.sockets.connected)) {
				// Check if user is authorized
				if (!(value as any).decodedToken) { return; }
				// If logged in user has same username as target user
				if (emitUser === (value as any).decodedToken.user) {
					value.emit(event, ...args);
				}
			}
		}
	};
};
