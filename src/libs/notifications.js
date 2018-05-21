'use strict';

/**
 * @file Notification management functions
 * @module unsubscribe
 */

const users = require(__dirname + '/users.js');
const cryptoUtils = require(__dirname + '/cryptoUtils.js');

const SCOPES = [
	'ALL',
	'ANNOUNCEMENTS',
	'FEATURES'
];

 /**
  * Unsubscribe a user from certain categories of emails
  * @function unsubscribe
  *
  * @param {Object} db - Database connection
  * @param {string} user - Username
  * @param {string} hash - Unsubscribe hash from the database
  * @param {string|string[]} scopes - Single scope or array of multiple valid scopes
  * @param {unsubscribeCallback} callback - Callback
  */

 /**
  * Callback after the account has is unsubscribed
  * @callback unsubscribeCallback
  *
  * @param {Object} err - Null if successful, error object if failure
  */

function unsubscribe(db, user, hash, scopes, callback) {
	if(typeof callback !== 'function') {
		callback = () => {};
	}

	if(typeof db !== 'object') {
		callback(new Error('Invalid database connection!'));
		return;
	}
	if(typeof user !== 'string') {
		callback(new Error('Invalid username!'));
		return;
	}
	if(typeof hash !== 'string' && hash !== true) {
		callback(new Error('Invalid hash!'));
		return;
	}
	if(typeof scopes !== 'string' && typeof scopes !== 'object') {
		callback(new Error('Invalid scope(s)!'));
		return;
	}
	if (typeof scopes === 'string') {
		scopes = [scopes];
	}
	for (const scope of scopes) {
		if (!SCOPES.includes(scope)) {
			callback(new Error(`"${scope}" is an invalid email type!`));
			return;
		}
	}

	users.get(db, user, (err, isUser, userDoc) => {
		if(err) {
			callback(err);
			return;
		}
		if(!isUser) {
			callback(new Error('Does doesn\'t exist!'));
			return;
		}

		const dbHash = userDoc['unsubscribeHash'];

		if(hash === true || cryptoUtils.safeCompare(hash, dbHash)) {
			// Hash matches, unsubscribe account!
			const userdata = db.collection('users');
			userdata.update({ user }, { $addToSet: { unsubscribed: { $each: scopes }}}, err => {
				if(err) {
					callback(new Error('There was a problem updating the database!'));
					return;
				}
				callback(null);
			});
		} else {
			// Hash does not match
			callback(new Error('Hash not valid!'));
		}
	});
}

module.exports.unsubscribe = unsubscribe;
