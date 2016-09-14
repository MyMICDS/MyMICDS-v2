'use strict';

/**
 * @file Defines authorization-related functions.
 * @module auth
 */

var _           = require('underscore');
var admins      = require(__dirname + '/admins.js');
var crypto      = require('crypto');
var cryptoUtils = require(__dirname + '/cryptoUtils.js');
var jwt         = require(__dirname + '/jwt.js');
var mail        = require(__dirname + '/mail.js');
var passwords   = require(__dirname + '/passwords.js');
var users       = require(__dirname + '/users.js');
var admins 		= require(__dirname + '/admins.js');

/**
 * Validates a user's credentials and updates the 'lastLogin' field.
 * @function login
 *
 * @param {Object} db - Database connection
 * @param {string} user - Username
 * @param {string} password - Plaintext password
 * @param {Boolean} rememberMe - Whether JWT token should expire in 30 days instead of 1 day
 * @param {loginCallback} callback - Callback
 */

/**
 * Callback after a user is logged in
 * @callback loginCallback
 *
 * @param {Object} err - Null if successful, error object if failure
 * @param {Boolean} response - True if credentials match in database, false if not. Null if error.
 * @param {string} jwt - JSON Web Token for user to make API calls with
 */

function login(db, user, password, rememberMe, callback) {
	if(typeof callback !== 'function') return;

	if(typeof db !== 'object') {
		callback(new Error('Invalid database connection!'), null, null);
		return;
	}
	if(typeof user !== 'string') {
		callback(new Error('Invalid username!'), null, null);
		return;
	} else {
		user = user.toLowerCase();
	}
	if(typeof password !== 'string') {
		callback(new Error('Invalid password!'), null, null);
		return;
	}
	if(typeof rememberMe !== 'boolean') {
		rememberMe = true;
	}

	passwords.passwordMatches(db, user, password, function(err, passwordMatches) {
		if(err) {
			callback(err, null, null);
			return;
		}
		if(!passwordMatches) {
			callback(null, false, null);
			return;
		}

		// Update lastLogin in database
		var userdata = db.collection('users');
		userdata.update({ user: user }, { $currentDate: { lastLogin: true }});

		// Login successful!
		// Now we need to create a JWT
		jwt.generate(db, user, rememberMe, function(err, jwt) {
			if(err) {
				callback(err, null, null);
				return;
			}

			callback(null, true, jwt);

		});
	});
}

/**
 * Registers a user by adding their credentials into the database. Also sends email confirmation.
 * @function register
 *
 * @param {Object} db - Database connection
 *
 * @param {Object} user - User's credentials
 * @param {string} user.Username - Username (___@micds.org)
 * @param {string} user.password - User's plaintext password
 * @param {string} user.firstName - User's first name
 * @param {string} user.lastName - User's last name
 * @param {Number} user.gradYear - User's graduation year (Ex. Class of 2019). Set to null if faculty.
 *
 * @param {registerCallback} callback - Callback
 */

/**
 * Callback after a user is registered
 * @callback registerCallback
 *
 * @param {Object} err - Null if success, error object if failure
 */

function register(db, user, callback) {

	// Validate inputs
	if(typeof callback !== 'function') callback = function() {};
	if(typeof db   !== 'object') { callback(new Error('Invalid database connection!')); return; }
	if(typeof user !== 'object') { callback(new Error('Invalid user object!'));         return; }
	if(typeof user.user !== 'string') {
		callback(new Error('Invalid username!'));
		return;
	} else {
		// Make sure username is lowercase
		user.user = user.user.toLowerCase();
	}

	if(typeof user.password  !== 'string' || _.contains(passwords.passwordBlacklist, user.password)) {
		callback(new Error('Invalid password!'));
		return;
	}

	if(typeof user.firstName !== 'string') { callback(new Error('Invalid first name!')); return; }
	if(typeof user.lastName  !== 'string') { callback(new Error('Invalid last name!'));  return; }

	// If gradYear not valid, default to faculty
	if(typeof user.gradYear !== 'number' || user.gradYear % 1 !== 0 || _.isNaN(user.gradYear)) {
		user.gradYear = null;
	}

	// Check if it's an already existing user
	users.get(db, user.user, function(err, isUser, data) {
		if(isUser && data.confirmed) {
			callback(new Error('An account is already registered under the email ' + user.user + '@micds.org!'));
			return;
		}

		var userdata = db.collection('users');

		// Generate confirmation email hash
		crypto.randomBytes(16, function(err, buf) {
			if(err) {
				callback(new Error('There was a problem generating a random confirmation hash!'));
				return;
			}

			var hash = buf.toString('hex');

			// Hash Password
			cryptoUtils.hashPassword(user.password, function(err, hashedPassword) {
				if(err) {
					callback(err);
					return;
				}

				var newUser = {
					user      : user.user,
					password  : hashedPassword,
					firstName : user.firstName,
					lastName  : user.lastName,
					gradYear  : user.gradYear,
					confirmed : false,
					registered: new Date(),
					confirmationHash: hash,
					scopes: []
				}

				userdata.update({ user: newUser.user }, newUser, { upsert: true }, function(err, data) {
					if(err) {
						callback(new Error('There was a problem inserting the account into the database!'));
						return;
					}

					var email = newUser.user + '@micds.org';
					var emailReplace = {
						firstName  : newUser.firstName,
						lastName   : newUser.lastName,
						confirmLink: 'https://mymicds.net/confirm/' + newUser.user + '/' + hash,
					}

					// Send confirmation email
					mail.sendHTML(email, 'Confirm your Account', __dirname + '/../html/messages/register.html', emailReplace, callback);

					// Let's celebrate and the message throughout the land!
					admins.sendEmail(db, {
						subject: newUser.user + ' just created a 2.0 account!',
						html: newUser.firstName + ' ' + newUser.lastName + ' (' + newUser.gradYear + ') just created an account with the username ' + newUser.user
					}, function(err) {
						if(err) {
							console.log('[' + new Date() + '] Error occured when sending admin notification! (' + err + ')');
						}
					});
				});
			});
		});
	});
}

/**
 * Confirms a user's account if hash matches. This is used to confirm the user's email and account via email.
 * @function confirm
 *
 * @param {Object} db - Database connection
 * @param {string} user - Username
 * @param {string} hash - Hashed password from the database
 * @param {confirmCallback} callback - Callback
 */

/**
 * Callback after the account has is confirmed
 * @callback confirmCallback
 *
 * @param {Object} err - Null if successful, error object if failure
 */

function confirm(db, user, hash, callback) {

	if(typeof callback !== 'function') {
		callback = function() {};
	}

	if(typeof db !== 'object') {
		callback(new Error('Invalid database connection!'));
		return;
	}
	if(typeof user !== 'string') {
		callback(new Error('Invalid username!'));
		return;
	}
	if(typeof hash !== 'string') {
		callback(new Error('Invalid hash!'));
		return;
	}

	users.get(db, user, function(err, isUser, userDoc) {
		if(err) {
			callback(err);
			return;
		}
		if(!isUser) {
			callback(new Error('Does doesn\'t exist!'));
			return;
		}

		var dbHash = userDoc['confirmationHash'];

		if(cryptoUtils.safeCompare(hash, dbHash)) {
			// Hash matches, confirm account!
			var userdata = db.collection('users');
			userdata.update({ user: user }, {$set: { confirmed: true }}, function(err, results) {
				if(err) {
					callback(new Error('There was a problem updating the database!'));
					reutrn;
				}
				callback(null);
			});
		} else {
			// Hash does not match
			callback(new Error('Hash not valid!'));
		}
	});
}

module.exports.login    = login;
module.exports.register = register;
module.exports.confirm  = confirm;
