import { Action } from '@mymicds/sdk';
import { Db, ObjectID } from 'mongodb';
import { InputError, InternalError } from './errors';
import { NextFunction, Request, RequestHandler, Response } from 'express';
import { StringDict } from './utils';
import * as api from './api';
import * as jwt from 'jsonwebtoken';
import * as users from './users';
import config from './config';

declare global {
	namespace Express {
		interface Request {
			user: false | UserPayload;
		}
	}
}

/**
 * Verifies a JWT and assigns it to `req.user`.
 * @param db Database connection.
 * @returns An Express middleware function.
 */
export function authorize(db: Db): RequestHandler {
	return (req, res, next) => {
		req.user = false;

		const header = req.headers.authorization;

		// If there's no auth header or it's just empty, it's probably fine and we can just ignore it
		if (typeof header !== 'string' || header.length === 0) {
			next();
			return;
		}

		// Otherwise, make sure it's in the correct format
		if (!header.startsWith('Bearer ')) {
			api.error(
				res,
				'Authorization header must be in bearer token format.',
				Action.UNAUTHORIZED
			);
			return;
		}

		// Verification

		let payload: string | StringDict;

		try {
			payload = jwt.verify(header.substring(7), config.jwt.secret);
		} catch (err) {
			if (err instanceof jwt.TokenExpiredError) {
				api.error(res, err, Action.LOGIN_EXPIRED);
				return;
			}
			api.error(res, err as Error, Action.UNAUTHORIZED);
			return;
		}

		// Express doesn't like async/await so we need promise chains
		isRevoked(db, req, payload)
			.then(revoked => {
				if (revoked) {
					api.error(res, 'Invalid token.', Action.UNAUTHORIZED);
				} else {
					// Type predicates can't be used asynchronously so we need to manually assert
					const { user, scopes } = payload as StringDict;
					req.user = { user, scopes };
					next();
				}
			})
			.catch(err => {
				api.error(res, err, Action.UNAUTHORIZED);
			});
	};
}

/**
 * Checks whether a JWT is revoked or not.
 * @param db Database connection.
 * @param req Express request object.
 * @param payload The JWT payload.
 * @returns Whether the JWT is revoked.
 */
async function isRevoked(db: Db, req: Request, payload: string | StringDict) {
	const ignoredRoutes = ['/auth/logout'];

	// Get rid of possible ending slash
	const testUrl = req.url.endsWith('/') ? req.url.slice(0, -1) : req.url;
	if (ignoredRoutes.includes(testUrl)) {
		return false;
	}

	if (typeof payload !== 'object') {
		return true;
	}

	// Expiration logic is handled by jwt.verify itself

	// // Expiration date
	// const expiration = payload.exp * 1000;
	// // Make sure token hasn't expired yet
	// const timeLeft = expiration - Date.now();
	// // Make sure expiration is accurate within 30 seconds to account for time differences between computers.
	// const clockTolerance = 30;
	//
	// if (timeLeft < (clockTolerance * -1000)) {
	// 	return Action.LOGIN_EXPIRED;
	// }

	const { isUser, userDoc } = await users.get(db, payload.user);

	if (!isUser) {
		return true;
	}

	// Make sure token wasn't issued before last password change
	/*
	 * @TODO Automatically log user out in front-end on password change
	 * or prevent session that changed password from expiring.
	 */
	/* if (typeof userDoc['lastPasswordChange'] === 'object'
			&& (payload.iat * 1000) < userDoc['lastPasswordChange'].getTime()) {
		done(null, true);
		return;
	}*/

	// Make sure token isn't blacklisted (usually if logged out)
	const authJwt = req.headers.authorization!.slice(7);

	const blacklisted = await isBlacklisted(db, authJwt);

	// Update 'lastVisited' field in user document
	const userdata = db.collection('users');
	await userdata.updateOne(userDoc!, { $currentDate: { lastVisited: true } });

	const jwtData = db.collection('jwtWhitelist');
	await jwtData.updateOne(
		{ user: userDoc!._id, jwt: authJwt },
		{ $currentDate: { lastUsed: true } }
	);

	return blacklisted;
}

/**
 * Requires the user to be logged in. Used on specific routes.
 * @param req Express request object.
 * @param res Express response object.
 * @param next Calls the next handler in the middleware chain.
 */
export function requireLoggedIn(req: Request, res: Response, next: NextFunction) {
	requireScope('pleb', 'You must be logged in to access this!')(req, res, next);
}

/**
 * Requires the user to have a specific scope. Used on specific routes.
 * @param scope The scope to check for.
 * @param message A custom error message to send to the client.
 * @returns An Express middleware function.
 */
export function requireScope(
	scope: string,
	message = "You're not authorized in this part of the site, punk."
): RequestHandler {
	return (req, res, next) => {
		if (req.user && (req.user.scopes[scope] || req.user.scopes.admin)) {
			next();
		} else {
			api.error(res, message, Action.NOT_LOGGED_IN);
		}
	};
}

/**
 * Generates a JWT (JSON Web Token) to be stored on the client.
 * @param db Database connection.
 * @param user Username.
 * @param rememberMe Whether JWT should expire in 30 days instead of 12 hours.
 * @param comment Comment to associate with the JWT.
 * @returns A valid JWT.
 */
export async function generate(db: Db, user: string, rememberMe: boolean, comment?: string) {
	const expiration = rememberMe ? '30 days' : '12 hours';

	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) {
		throw new InputError("User doesn't exist!");
	}

	// Default scope
	const scopes: { [scope: string]: true } = {
		pleb: true
	};

	if (Array.isArray(userDoc!.scopes)) {
		for (const scope of userDoc!.scopes) {
			scopes[scope] = true;
		}
	}

	if (typeof comment !== 'string' || comment.length < 1) {
		comment = 'Unknown';
	}

	let token;
	try {
		token = jwt.sign(
			{
				user,
				scopes
			},
			config.jwt.secret,
			{
				subject: 'MyMICDS API',
				algorithm: 'HS256',
				expiresIn: expiration,
				audience: config.hostedOn,
				issuer: config.hostedOn
			}
		);
	} catch (e) {
		throw new InternalError('There was a problem generating a JWT!', e as Error);
	}

	const jwtData = db.collection('jwtWhitelist');

	try {
		await jwtData.insertOne({ user: userDoc!._id, jwt: token, comment });
	} catch (e) {
		throw new InternalError('There was a problem registering the JWT!', e as Error);
	}

	return token;
}

/**
 * Checks whether a JWT is not in the whitelist.
 * @param db Database connection.
 * @param checkJwt The JWT to check.
 * @returns Whether the JWT is blacklisted.
 */
export async function isBlacklisted(db: Db, checkJwt: string) {
	const jwtData = db.collection<JWTDoc>('jwtWhitelist');

	let docs: JWTDoc[];

	try {
		docs = await jwtData.find({ jwt: checkJwt }).toArray();
	} catch (e) {
		throw new InternalError('There was a problem querying the database!', e as Error);
	}

	return docs.length < 1;
}

/**
 * Revokes a JWT so that it can't be used with the API anymore.
 * @param db Database connection.
 * @param payload All the JWT claims and payload.
 * @param revokeJwt The JWT to revoke access for.
 */
export async function revoke(db: Db, payload: UserPayload, revokeJwt: string) {
	const { isUser, userDoc } = await users.get(db, payload.user);
	if (!isUser) {
		throw new InputError("User doesn't exist!");
	}

	const jwtData = db.collection('jwtWhitelist');

	try {
		await jwtData.deleteOne({ user: userDoc!._id, jwt: revokeJwt });
	} catch (e) {
		throw new InternalError(
			'There was a problem revoking the JWT in the database!',
			e as Error
		);
	}
}

export interface JWTDoc {
	_id: ObjectID;
	user: ObjectID;
	jwt: string;
	comment: string;
	lastUsed: Date;
}

export interface UserPayload {
	user: string;
	scopes: { [scope: string]: true };
}
