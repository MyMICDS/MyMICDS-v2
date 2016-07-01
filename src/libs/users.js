'use strict';

/**
 * @file User management functions
 * @module users
 */

var auth        = require(__dirname + '/auth.js');
var crypto      = require('crypto');
var cryptoUtils = require(__dirname + '/cryptoUtils.js');
var mail        = require(__dirname + '/mail.js');

/**
 * Get data about user
 * @function getUser
 *
 * @param {Object} db - Database connection
 * @param {string} user - Username
 * @param {getUserCallback} callback - Callback
 */

/**
 * Callback after user id is retrieved
 * @callback getUserCallback
 *
 * @param {Object} err - Null if success, error object if failure
 * @param {Boolean} isUser - True if there is a valid user, false if not. Null if error.
 * @param {Object} userDoc - Everything in the user's document. Null if error or no valid user.
 */

function getUser(db, user, callback) {
	if(typeof callback !== 'function') return;

	if(typeof db !== 'object') {
		callback(new Error('Invalid databse connection!'), null, null);
		return;
	}
	if(typeof user !== 'string') {
		callback(new Error('Invalid username!'), null, null);
		return;
	}

	var userdata  = db.collection('users');
	// Query database to find possible user
	userdata.find({ user: user }).toArray(function(err, docs) {
		if(err) {
			callback(new Error('There was a problem querying the database!'), null, null);
			return;
		}
		if(docs.length === 0) {
			callback(null, false, null)
		} else {
			callback(null, true, docs[0]);
		}

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
		callback = function() {};
	}

	if(typeof db !== 'object') {
		callback(new Error('Invalid database connection!'));
		return;
	}
	if(typeof oldPassword !== 'string') {
		callback(new Error('Invalid old password!'));
		return;
	}
	if(typeof newPassword !== 'string') {
		callback(new Error('Invalid new password!'));
		return;
	}

	getUser(db, user, function(err, isUser, userDoc) {
		if(err) {
			callback(err);
			return;
		}
		if(!isUser) {
			callback(new Error('Invalid user!'));
			return;
		}

		// Compare oldPassword with password in database
		auth.passwordMatches(db, user, oldPassword, function(err, matches) {
			if(err) {
				callback(err);
				return;
			}
			if(!matches) {
				callback(new Error('Password does not match!'));
				return;
			}

			// Hash new password
			cryptoUtils.hashPassword(newPassword, function(err, hash) {
				if(err) {
					callback(err);
					return;
				}

				// Update new password into database
				var userdata = db.collection('users');
				userdata.update({ user: user }, { $set: { password: hash }}, function(err, results) {
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
		callback = function() {};
	}

	if(typeof db !== 'object') {
		callback(new Error('Invalid database connection!'));
		return;
	}

	getUser(db, user, function(err, isUser, userDoc) {
		if(err) {
			callback(err);
			return;
		}
		if(!isUser) {
			callback(new Error('User doesn\'t exist!'));
			return;
		}

		// Generate password hash for confirmation link
		crypto.randomBytes(16, function(err, buf) {
            if(err) {
				callback(new Error('There was a problem generating a random confirmation hash!'));
				return;
			}

            var hash = buf.toString('hex');
			var hashedHash = cryptoUtils.shaHash(hash);

			// Now let's insert the passwordChangeHash into the database
			var userdata = db.collection('users');
			userdata.update({ _id: userDoc['_id'], user: userDoc['user'] }, { $set: { passwordChangeHash: hashedHash }}, { upsert: true }, function(err, results) {
				if(err) {
					callback(new Error('There was a problem inserting the confirmation hash into the database!'));
					return;
				}

				// Send confirmation email
				var email = userDoc['user'] + '@micds.org';
				var emailReplace = {
					firstName: userDoc['firstName'],
					lastName : userDoc['lastName'],
					passwordLink: 'https://mymicds.net/change-password/' + userDoc['user'] + '/' + hash
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
		callback = function () {};
	}

	if(typeof db !== 'object') {
		callback(new Error('Invalid database connection!'));
		return;
	}
	if(typeof password !== 'string') {
		callback(new Error('Invalid password!'));
		return;
	}
	if(typeof hash !== 'string') {
		callback(new Error('Invalid hash!'));
	}

	getUser(db, user, function(err, isUser, userDoc) {
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
		cryptoUtils.hashPassword(password, function(err, hashedPassword) {
			if(err) {
				callback(err);
				return;
			}

			var userdata = db.collection('users');
			// Update password in the database
			userdata.update({ _id: userDoc['_id'], user: userDoc['user'] }, { $set: { password: hashedPassword, passwordChangeHash: null }}, function(err, results) {
				if(err) {
					callback(new Error('There was a problem updating the password in the database!'));
					return;
				}

				callback(null);

			});
		});
	});
}

module.exports.getUser = getUser;
module.exports.changePassword     = changePassword;
module.exports.resetPasswordEmail = resetPasswordEmail;
module.exports.resetPassword      = resetPassword;
