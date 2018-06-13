'use strict';

/**
 * @file Creates and authenticates a Google Service Account that you can use
 * @module googleServiceAccount
 */
const config = require(__dirname + '/config.js');
const key = config.googleServiceAccount;

const google = require('googleapis');

// Any Google scopes the Service Account uses
const scopes = [
	'https://www.googleapis.com/auth/gmail.readonly'
];
// Which user to sign in as under the MyMICDS.net domain
const impersonate = 'support@mymicds.net';

/**
 * Creates and authenticates a Google Service account that you can use for various Google API's
 * @function createServiceAccount
 * @param {createServiceAccountCallback} callback - Callback
 */

/**
 * Returns a jwt client that you can use for various Google API's
 * @callback createServiceAccountCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 * @param {Object} jwtClient - Authorized Google Service Account client. Null if error.
 */

function createServiceAccount(callback) {
	if (typeof callback !== 'function') return;

	const jwtClient = new google.auth.JWT(key.client_email, null, key.private_key, scopes, impersonate);

	jwtClient.authorize(err => {
		if (err) {
			callback(new Error('There was a problem authorizing the Google Service Account!'), null);
			return;
		}

		callback(null, jwtClient);
	});
}

module.exports.create = createServiceAccount;
