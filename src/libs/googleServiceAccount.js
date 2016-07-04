'use strict';

/**
 * @file Creates and authenticates a Google Service Account that you can use
 * @module googleServiceAccount
 */

var config = require(__dirname + '/config.js');
var key = config.googleServiceAccount;

var google = require('googleapis');

// Any Google scopes the Service Account uses
var scopes = [
	'https://www.googleapis.com/auth/gmail.readonly'
];
// Which user to sign in as under the MyMICDS.net domain
var impersonate = 'support@mymicds.net';

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
 * @param {Object} google - Google module we can create different API's from
 * @param {Object} jwtClient - Authorized Google Service Account client. Null if error.
 * @param {Object} tokens - Something something client authentication
 */

function createServiceAccount(callback) {
	if(typeof callback !== 'function') return;

	var jwtClient = new google.auth.JWT(key.client_email, null, key.private_key, scopes, impersonate);

	jwtClient.authorize(function(err, tokens) {
		if(err) {
			callback(new Error('There was a problem authorizing the Google Service Account!'), null);
			return;
		}

		callback(null, google, jwtClient, tokens);

	});
}

module.exports.createServiceAccount = createServiceAccount;
