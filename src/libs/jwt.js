'use strict';

/**
 * @file Manages Json Web Token authentication for our API
 * @module jwt
 */

var config = require(__dirname + '/config.js');

var _          = require('underscore');
var expressJWT = require('express-jwt');
var jwt        = require('jsonwebtoken');
var users      = require(__dirname + '/users.js');

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
	return function(req, payload, done) {
		if(typeof payload !== 'object') {
			done(null, true);
			return;
		}

		// Current date
		var current = Date.now();
		// Expiration date
		var expiration = payload.exp * 1000;
		// Make sure token hasn't expired yet
		var timeLeft = expiration - Date.now();
		// Make sure expiration is accurate within 30 seconds to account for time differences between computers.
		var clockTolerance = 30;

		if(timeLeft < (clockTolerance * -1000)) {
			done(null, true);
			return;
		}

		users.get(db, payload.user, function(err, isUser, userDoc) {
			if(err) {
				done(err, true);
				return;
			}
			if(!isUser) {
				done(null, true);
				return;
			}

			// Make sure token wasn't issued before last password change
			/*
			 * @TODO Automatically log user out in front-end on password change
			 * or prevent session that changed password from expiring.
			 */
			/*if(typeof userDoc['lastPasswordChange'] === 'object' && (payload.iat * 1000) < userDoc['lastPasswordChange'].getTime()) {
				done(null, true);
				return;
			}*/

			// Make sure token isn't blacklisted (usually if logged out)
			var jwt = req.get('Authorization').slice(7);

			isBlacklisted(db, jwt, function(err, blacklisted) {
				if(err) {
					callback(err, true);
					return;
				}

				done(null, blacklisted);

			});
		});
	}
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
	if(typeof req.user === 'undefined') {
		req.user = false;
	}
	next();
}

/**
 * Express middleware to catch any errors if the JWT token is invalid.
 * @function catchUnauthorized
 */

function catchUnauthorized(err, req, res, next) {
	if(err.name === 'UnauthorizedError') {
		res.status(401).json({ error: err.message });
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
 * @param {generateCallback} callback - Callback
 */

/**
 * Returns a valid JWT token to give to user
 * @callback generateCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 * @param {string} token - JWT token. Error if null.
 */

function generate(db, user, rememberMe, callback) {
	if(typeof callback !== 'function') return;

	if(typeof db !== 'object') {
		callback(new Error('Invalid database connection!'), null);
		return;
	}
	if(rememberMe) {
		var expiration = '30 days';
	} else {
		var expiration = '12 hours';
	}

	users.get(db, user, function(err, isUser, userDoc) {
		if(err) {
			callback(err, null);
			return;
		}
		if(!isUser) {
			callback(new Error('User doesn\'t exist!'), null);
			return;
		}

		// Default scope
		var scopes = {
			'pleb': true
		};

		if(_.isArray(userDoc['scopes'])) {
			for(var i = 0; i < userDoc['scopes'].length; i++) {
				var scope = userDoc['scopes'][i];
				scopes[scope] = true;
			}
		}

		jwt.sign({
			user  : user,
			scopes: scopes

		}, config.jwt.secret, {
			subject  : 'MyMICDS API',
			algorithm: 'HS256',
			expiresIn: expiration,
			audience : config.hostedOn,
			issuer   : config.hostedOn

		}, function(err, token) {
			if(err) {
				callback(new Error('There was a problem generating a JWT!'), null);
				return;
			}

			callback(null, token);

		});
	});
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

function isBlacklisted(db, jwt, callback) {
	if(typeof callback !== 'function') return;

	if(typeof db !== 'object') {
		callback(new Error('Invalid database connection!'), null);
		return;
	}
	if(typeof jwt !== 'string') {
		callback(new Error('Invalid JWT!'), null);
		return;
	}

	var JWTdata = db.collection('JWTBlacklist');

	JWTdata.find({ jwt: jwt }).toArray(function(err, docs) {
		if(err) {
			callback(new Error('There was a problem querying the database!'), null);
			return;
		}

		callback(null, docs.length > 0);

	});
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

function revoke(db, payload, jwt, callback) {
	if(typeof callback !== 'function') {
		callback = function() {};
	}

	if(typeof db !== 'object') {
		callback(new Error('Invalid database connection!'));
		return;
	}
	if(typeof payload !== 'object') {
		callback(new Error('Invalid payload!'));
		return;
	}
	if(typeof jwt !== 'string') {
		callback(new Error('Invalid JWT!'));
		return;
	}

	var current = new Date();
	var JWTdata = db.collection('JWTBlacklist');

	JWTdata.insert({
		user: payload.user,
		jwt: jwt,
		expires: new Date(payload.exp * 1000),
		revoked: current
	}, function(err) {
		if(err) {
			callback(new Error('There was a problem revoking the JWT in the database!'));
			return;
		}

		callback(null);

	});
}

module.exports.authorize         = authorize;
module.exports.fallback          = fallback;
module.exports.catchUnauthorized = catchUnauthorized;
module.exports.generate          = generate;
module.exports.revoke            = revoke;
