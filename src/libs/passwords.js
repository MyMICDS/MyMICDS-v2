'use strict';

/**
 * @file User management functions
 * @module users
 */
const _ = require('underscore');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const cryptoUtils = require(__dirname + '/cryptoUtils.js');
const mail = require(__dirname + '/mail.js');
const users = require(__dirname + '/users.js');

// Passwords not allowed
const passwordBlacklist = [
	'', // Empty string
	'Nick is not a nerd' // Because he is
];

/**
 * Determines whether a password matches for a certain user
 * @function passwordMatches
 *
 * @param {Object} db - Database connection
 * @param {string} user - Username
 * @param {string} password - Plaintext password
 * @param {passwordMatchesCallback} callback - Callback
 */

/**
 * Returns whether password matches or not
 * @callback passwordMatchesCallback
 *
 * @param {Object} err - Null if successful, error object if failure.
 * @param {Boolean} matches - True if password matches, false if not. Null if error.
 * @param {Boolean} confirmed - Whether or not the user has confirmed their account.
 */

function passwordMatches(db, user, password, callback) {
	if(typeof callback !== 'function') return;

	if(typeof db !== 'object') {
		callback(new Error('Invalid database connection!'), null, null);
		return;
	}
	if(typeof password !== 'string') {
		callback(new Error('Invalid password!'), null, null);
		return;
	}

	users.get(db, user, (err, isUser, userDoc) => {
		if(err) {
			callback(err, null, null);
			return;
		}
		// If invalid user, we just want to say username / password doesn't match
		if(!isUser) {
			callback(null, false, false);
			return;
		}

		const hash = userDoc['password'];

		bcrypt.compare(password, hash, (err, res) => {
			if(err) {
				callback(new Error('There was a problem comparing the passwords!'), null, null);
				return;
			}

			callback(null, res, !!userDoc['confirmed']);

		});
	});
}

/**
 * Changes the password if old password matches
 * @function changePassword
 *
 * @param {Object} db - Database connection
 * @param {string} user - Username
 * @param {string} oldPassword - Old plaintext password
 * @param {string} newPassword - New plaintext password to change
 * @param {changePasswordCallback} callback - Callback
 */

/**
 * Returns an error (if any) about changing the user's password
 * @callback changePasswordCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 */

function changePassword(db, user, oldPassword, newPassword, callback) {
	if(typeof callback !== 'function') {
		callback = () => {};
	}

	if(typeof db !== 'object') {
		callback(new Error('Invalid database connection!'));
		return;
	}
	if(typeof oldPassword !== 'string' || _.contains(passwordBlacklist, newPassword)) {
		callback(new Error('Invalid old password!'));
		return;
	}
	if(typeof newPassword !== 'string') {
		callback(new Error('Invalid new password!'));
		return;
	}

	users.get(db, user, (err, isUser) => {
		if(err) {
			callback(err);
			return;
		}
		if(!isUser) {
			callback(new Error('Invalid user!'));
			return;
		}

		// Compare oldPassword with password in database
		passwordMatches(db, user, oldPassword, (err, matches) => {
			if(err) {
				callback(err);
				return;
			}
			if(!matches) {
				callback(new Error('Password does not match!'));
				return;
			}

			// Hash new password
			cryptoUtils.hashPassword(newPassword, (err, hash) => {
				if(err) {
					callback(err);
					return;
				}

				// Update new password into database
				const userdata = db.collection('users');
				userdata.update({ user }, { $set: { password: hash }, $currentDate: { lastPasswordChange: true }}, err => {
					if(err) {
						callback(new Error('There was a problem updating the password in the database!'));
						return;
					}

					callback(null);

				});
			});
		});
	});
}

 /**
  * Creates a password confirmation hash and sends an email to the user to change their password.
  * You do not need to input a password yet, as that comes later when the user clicks on the link.
  * @function resetPasswordEmail
  *
  * @param {Object} db - Database connection
  * @param {string} user - Username
  * @param {resetPasswordEmailCallback} callback - Callback
  */

 /**
  * Returns an error if any
  * @callback resetPasswordEmailCallback
  *
  * @param {Object} err - Null if success, error object if failure.
  */

function resetPasswordEmail(db, user, callback) {
	if(typeof callback !== 'function') {
		callback = () => {};
	}

	if(typeof db !== 'object') {
		callback(new Error('Invalid database connection!'));
		return;
	}

	users.get(db, user, (err, isUser, userDoc) => {
		if(err) {
			callback(err);
			return;
		}
		if(!isUser) {
			callback(new Error('User doesn\'t exist!'));
			return;
		}

		// Generate password hash for confirmation link
		crypto.randomBytes(16, (err, buf) => {
			if(err) {
				callback(new Error('There was a problem generating a random confirmation hash!'));
				return;
			}

			const hash = buf.toString('hex');
			const hashedHash = cryptoUtils.shaHash(hash);

			// Now let's insert the passwordChangeHash into the database
			const userdata = db.collection('users');
			userdata.update({ _id: userDoc['_id'], user: userDoc['user'] }, { $set: { passwordChangeHash: hashedHash }}, { upsert: true }, err => {
				if(err) {
					callback(new Error('There was a problem inserting the confirmation hash into the database!'));
					return;
				}

				// Send confirmation email
				const email = userDoc['user'] + '@micds.org';
				const emailReplace = {
					firstName: userDoc['firstName'],
					lastName: userDoc['lastName'],
					passwordLink: 'https://mymicds.net/reset-password/' + userDoc['user'] + '/' + hash
				};

				// Send email confirmation
				mail.sendHTML(email, 'Change your password', __dirname + '/../html/messages/password.html', emailReplace, callback);

			});
		});
	});
}

 /**
  * Changes the password if hash matches the user's passwordChangeHash
  * @function resetPassword
  *
  * @param {Object} db - Database connection
  * @param {string} user - Username
  * @param {string} password - Plaintext password to change
  * @param {string} hash - passwordChangeHash from confirmation email
  * @param {resetPasswordCallback} callback - Callback
  */

 /**
  * Returns an error (if any) about changing the user's password
  * @callback resetPasswordCallback
  *
  * @param {Object} err - Null if success, error object if failure.
  */

function resetPassword(db, user, password, hash, callback) {
	if(typeof callback !== 'function') {
		callback = () => {};
	}

	if(typeof db !== 'object') {
		callback(new Error('Invalid database connection!'));
		return;
	}
	if(typeof password !== 'string' || _.contains(passwordBlacklist, password)) {
		callback(new Error('Invalid password!'));
		return;
	}
	if(typeof hash !== 'string') {
		callback(new Error('Invalid hash!'));
	}

	users.get(db, user, (err, isUser, userDoc) => {
		if(err) {
			callback(err);
			return;
		}
		if(!isUser) {
			callback(new Error('User doesn\'t exist!'));
			return;
		}
		if(typeof userDoc['passwordChangeHash'] !== 'string' || userDoc['passwordChangeHash'] === null) {
			callback(new Error('Password change email was never sent!'));
			return;
		}

		if(!cryptoUtils.safeCompareSHA(hash, userDoc['passwordChangeHash'])) {
			// Hash is not valid
			callback(new Error('Invalid hash!'));
			return;
		}

		// Change password
		cryptoUtils.hashPassword(password, (err, hashedPassword) => {
			if(err) {
				callback(err);
				return;
			}

			const userdata = db.collection('users');
			// Update password in the database
			userdata.update({ _id: userDoc['_id'], user: userDoc['user'] }, { $set: { password: hashedPassword, passwordChangeHash: null}, $currentDate: { lastPasswordChange: true }}, err => {
				if(err) {
					callback(new Error('There was a problem updating the password in the database!'));
					return;
				}

				callback(null);

			});
		});
	});
}

module.exports.passwordMatches    = passwordMatches;
module.exports.passwordBlacklist  = passwordBlacklist;
module.exports.changePassword     = changePassword;
module.exports.resetPasswordEmail = resetPasswordEmail;
module.exports.resetPassword      = resetPassword;
