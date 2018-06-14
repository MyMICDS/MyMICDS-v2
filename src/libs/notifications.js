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

async function unsubscribe(db, user, hash, scopes) {
	if (typeof db !== 'object') throw new Error('Invalid database connection!');
	if (typeof user !== 'string') throw new Error('Invalid username!');
	if (typeof hash !== 'string' && hash !== true) throw new Error('Invalid hash!');
	if (typeof scopes !== 'string' && typeof scopes !== 'object') throw new Error('Invalid scope(s)!');

	if (typeof scopes === 'string') scopes = [scopes];
	for (const scope of scopes) {
		if (!SCOPES.includes(scope)) {
			throw new Error(`"${scope}" is an invalid email type!`);
		}
	}

	// Make sure valid user and get user id
	const { isUser, userDoc } = await users.get(db, user);
	if (!isUser) throw new Error('User doesn\'t exist!');

	const dbHash = userDoc['unsubscribeHash'];

	if (hash === true || cryptoUtils.safeCompare(hash, dbHash)) {
		// Hash matches, unsubscribe account!
		const userdata = db.collection('users');

		try {
			await userdata.updateOne({ user }, { $addToSet: { unsubscribed: { $each: scopes } } });
		} catch (e) {
			throw new Error('There was a problem updating the database!');
		}
	} else {
		// Hash does not match
		throw new Error('Hash not valid!');
	}
}

module.exports.SCOPES = SCOPES;
module.exports.unsubscribe = unsubscribe;
