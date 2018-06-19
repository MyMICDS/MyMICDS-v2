'use strict';

/**
 * @file Manages Json Web Token authentication for our API
 * @module jwt
 */

const config = require(__dirname + '/config.js');

const _ = require('underscore');
const api = require(__dirname + '/api.js');
const expressJWT = require('express-jwt');
const jwt = require('jsonwebtoken');
const users = require(__dirname + '/users.js');

const { promisify } = require('util');

/**
 * Express middleware to verify the JWT token (if any) and assigns it to req.user
 * @function authorize
 * @param {Object} db - Databse connection
 * @returns {function}
 */

function authorize(db) {
	return expressJWT({
		credentialsRequired: false, // We have our own way of handling if user is authorized or not
		secret   : config.jwt.secret,
		isRevoked: isRevoked(db),
		audience : config.hostedOn,
		issuer   : config.hostedOn
	});
}

/**
 * Function for determining if a JWT is valid or not
 * @function isRevoked
 *
 * @param {Object} db - Databse connection
 * @returns {isRevokedCallback}
 */

/**
 * Function that returns whether token is revoked or not.
 * @callback isRevokedCallback
 *
 * @param {Object} req - Express request object
 * @param {Object} payload - Object with the JWT claims
 * @param {isRevokedCallbackCallback} done - Callback
 */

/**
 * Returns whether token is revoked or not.
 * @callback isRevokedCallbackCallback
 * @param {Object} err - Null if success, error object if failure.
 *
 * @param {Boolean} revoked - True if the JWT is revoked, false otherwise.
 */

function isRevoked(db) {
	return async (req, payload, done) => {

		const ignoredRoutes = [
			'/auth/logout'
		];

		// Get rid of possible ending slash
		const testUrl = req.url.endsWith('/') ? req.url.slice(0, -1) : req.url;
		if (ignoredRoutes.includes(testUrl)) {
			done(null, false);
			return;
		}

		if (typeof payload !== 'object') {
			done(null, true);
			return;
		}

		// Expiration date
		const expiration = payload.exp * 1000;
		// Make sure token hasn't expired yet
		const timeLeft = expiration - Date.now();
		// Make sure expiration is accurate within 30 seconds to account for time differences between computers.
		const clockTolerance = 30;

		if (timeLeft < (clockTolerance * -1000)) {
			done(null, true);
			return;
		}

		let isUser, userDoc;
		try {
			// I guess this requires parentheses?
			({ isUser, userDoc } = await users.get(db, payload.user));
		} catch (e) {
			done(e, true);
			return;
		}

		if (!isUser) {
			done(null, true);
			return;
		}

		// Make sure token wasn't issued before last password change
		/*
		 * @TODO Automatically log user out in front-end on password change
		 * or prevent session that changed password from expiring.
		 */
		/* if (typeof userDoc['lastPasswordChange'] === 'object' && (payload.iat * 1000) < userDoc['lastPasswordChange'].getTime()) {
			done(null, true);
			return;
		}*/

		// Make sure token isn't blacklisted (usually if logged out)
		const jwt = req.get('Authorization').slice(7);

		let blacklisted;
		try {
			blacklisted = await isBlacklisted(db, jwt);
		} catch (e) {
			done(e, true);
			return;
		}

		// Update 'lastVisited' field in user document
		const userdata = db.collection('users');
		await userdata.updateOne(userDoc, { $currentDate: { lastVisited: true }});

		const jwtData = db.collection('jwtWhitelist');
		await jwtData.updateOne({ user: userDoc._id, jwt }, { $currentDate: { lastUsed: true }});

		done(null, blacklisted);
	};
}

/**
 * If no req.user is set, will default to false. Attach this middleware after you attach the authorize middleware!
 * @function fallback
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {function} next - Callback with no parameters
 */

function fallback(req, res, next) {
	// If user doesn't exist or is invalid, default req.user to false
	if (typeof req.user === 'undefined') {
		req.user = false;
	}
	next();
}

/**
 * Route-specific middleware to require the user to be logged in
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {function} next - Callback with no parameters
 */

function requireLoggedIn(req, res, next) {
	requireScope('pleb', 'You must be logged in to access this!')(req, res, next);
}

/**
 * Route-specific middleware to require the user to have a specific scope
 * @param {string} scope - Which scope the user needs to have
 * @param {string} [message] - Optional. Custom error message to send back to client if they don't have the specified scope.
 */

function requireScope(scope, message = 'You\'re not authorized in this part of the site, punk.') {
	return (req, res, next) => {
		if (!req.user || !req.user.scopes[scope]) {
			api.error(res, message, 'NOT_LOGGED_IN');
		} else {
			next();
		}
	};
}

/**
 * Express middleware to catch any errors if the JWT token is invalid.
 * @function catchUnauthorized
 */

function catchUnauthorized(err, req, res, next) {
	if (err.name === 'UnauthorizedError') {
		api.error(res, err, 'UNAUTHORIZED');
		return;
	}
	next();
}

/**
 * Generates a JSON Web Token that should be stored on the client
 * and sent in the header with every API call required authentication.
 * @function generate
 *
 * @param {Object} db - Database connection
 * @param {string} user - Username
 * @param {Boolean} rememberMe - Should the user stay logged in?
 * @param {string} comment - ID comment to use in JWT
 * @param {generateCallback} callback - Callback
 */

/**
 * Returns a valid JWT token to give to user
 * @callback generateCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 * @param {string} token - JWT token. Error if null.
 */

async function generate(db, user, rememberMe, comment) {
	if (typeof db !== 'object') throw new Error('Invalid database connection!');

	const expiration = rememberMe ? '30 days' : '12 hours';

	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) throw new Error('User doesn\'t exist!');

	// Default scope
	const scopes = {
		'pleb': true
	};

	if (_.isArray(userDoc['scopes'])) {
		for (const scope of userDoc['scopes']) {
			scopes[scope] = true;
		}
	}

	if (typeof comment !== 'string' || comment.length < 1) {
		comment = 'Unknown';
	}

	let token;
	try {
		token = await promisify(jwt.sign)({
			user, scopes
		}, config.jwt.secret, {
			subject: 'MyMICDS API',
			algorithm: 'HS256',
			expiresIn: expiration,
			audience: config.hostedOn,
			issuer: config.hostedOn
		});
	} catch (e) {
		throw new Error('There was a problem generating a JWT!');
	}

	const jwtData = db.collection('jwtWhitelist');

	try {
		await jwtData.insertOne({ user: userDoc._id, jwt: token, comment });
	} catch (e) {
		throw new Error('There was a problem registering the JWT!');
	}

	return token;
}

/**
 * Determines whether or not a JWT is in the JWTBlacklist collection, usually because they logged out.
 * @function isBlacklisted
 *
 * @param {Object} db - Database connection
 * @param {string} jwt - JSON Web Token
 * @param {isBlacklistedCallback} callback - Callback
 */

/**
 * Returns whether or not JWT is blacklisted.
 * @callback isBlacklistedCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 * @param {Boolean} blacklisted - True if blacklisted, false if not. Null if error.
 */

async function isBlacklisted(db, jwt) {
	if (typeof db !== 'object') throw new Error('Invalid database connection!');
	if (typeof jwt !== 'string') throw new Error('Invalid JWT!');

	const jwtData = db.collection('jwtWhitelist');

	let docs;

	try {
		docs = await jwtData.find({ jwt }).toArray();
	} catch (e) {
		throw new Error('There was a problem querying the database!');
	}

	return docs.length < 1;
}

/**
 * Revokes a JSON Web Token so it can't be used with the API anymore. Used typically for logging the user out.
 * @function revoke
 *
 * @param {Object} db - Database connection
 * @param {Object} payload - Object with all the claims of the JWT
 * @param {string} jwt - JSON Web Token to disable
 * @param {revokeCallback} callback - Callback
 */

/**
 * Returns whether revocation was successful or not.
 * @callback revokeCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 */

async function revoke(db, payload, jwt) {
	if (typeof db !== 'object') throw new Error('Invalid database connection!');
	if (typeof payload !== 'object') throw new Error('Invalid payload!');
	if (typeof jwt !== 'string') throw new Error('Invalid JWT!');

	const { isUser, userDoc } = await users.get(db, payload.user);
	if (!isUser) throw new Error('User doesn\'t exist!');

	const jwtData = db.collection('jwtWhitelist');

	try {
		await jwtData.deleteOne({ user: userDoc._id, jwt });
	} catch (e) {
		throw new Error('There was a problem revoking the JWT in the database!');
	}
}

module.exports.authorize         = authorize;
module.exports.fallback          = fallback;
module.exports.requireLoggedIn   = requireLoggedIn;
module.exports.requireScope      = requireScope;
module.exports.catchUnauthorized = catchUnauthorized;
module.exports.generate          = generate;
module.exports.revoke            = revoke;
