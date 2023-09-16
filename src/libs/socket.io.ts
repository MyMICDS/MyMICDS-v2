import { InternalError } from './errors';
import { Server } from 'socket.io';
import { UserPayload } from './jwt';
import * as jwt from 'jsonwebtoken';
import config from './config';

declare global {
	namespace SocketIO {
		interface Socket {
			decodedToken?: UserPayload;
		}
	}
}

export default (io: Server) => {
	io.on('connection', socket => {
		/*
		 * We keep the client connected so it can still recieve global events like weahter.
		 * If the client supplies a JWT though, then it can recieve user-specific events
		 * like if the user changed their background.
		 */

		socket.on('authenticate', async token => {
			let decoded;

			try {
				const jwtSecret = await config.jwt.secret;
				if (typeof jwtSecret !== 'string') throw new InternalError('Invalid JWT secret!');
				decoded = jwt.verify(token, jwtSecret, {
					algorithms: ['HS256'],
					audience: config.hostedOn,
					issuer: config.hostedOn,
					clockTolerance: 30
				}) as UserPayload;
			} catch (err) {
				socket.emit('unauthorized');
				return;
			}

			// User is valid!
			if (decoded) {
				socket.decodedToken = decoded;
				socket.emit('authorized');
			}
		});
	});

	return {
		global(event: string, ...args: unknown[]) {
			io.emit(event, ...args);
		},
		user(emitUser: string, event: string, ...args: unknown[]) {
			for (const value of Object.values(io.sockets.connected)) {
				// Check if user is authorized
				if (!value.decodedToken) {
					return;
				}
				// If logged in user has same username as target user
				if (emitUser === value.decodedToken.user) {
					value.emit(event, ...args);
				}
			}
		}
	};
};
