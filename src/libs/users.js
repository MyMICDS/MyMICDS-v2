'use strict';

/**
 * @file User management functions
 * @module users
 */

var crypto = require('crypto');
var mail   = require(__dirname + '/mail.js');

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
 * Creates a password confirmation hash and sends an email to the user to change their password.
 * You do not need to input a password yet, as that comes later when the user clicks on the link.
 * @function changePassword
 *
 * @param {Object} db - Database connection
 * @param {string} user - Username
 * @param {changePasswordCallback} callback - Callback
 */

/**
 * Returns an error if any
 * @callback changePasswordCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 */

function changePassword(db, user, callback) {
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

			// Now let's insert the passwordChangeHash into the database
			var userdata = db.collection('users');
			userdata.update({ _id: userDoc['_id'], user: userDoc['user'] }, { $set: { passwordChangeHash: hash }}, { upsert: true}, function(err, results) {
				if(err) {
					callback(new Error('There was a problem inserting the confirmation hash into the database!'));
					return;
				}

				// Send confirmation email
				var email = userDoc['user'] + '@micds.org';
				var emailReplace = {
					firstName: userDoc['firstName'],
					lastName : userDoc['lastName'],
					passwordLink: 'https://mymicds.net/change-password/' + userDoc['user'] + '/' + hash;
				};

				// Send email confirmation
				mail.sendHTML(email, 'Change your password', __dirname + '/../html/messages/password.html', emailReplace, callback);
			});
		});
	});
}

module.exports.getUser = getUser;
