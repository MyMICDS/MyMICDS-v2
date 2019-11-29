'use strict';

import config from './config';
const key = config.googleServiceAccount;

import { google } from 'googleapis';

// Any Google scopes the Service Account uses
const scopes = [
	'https://www.googleapis.com/auth/gmail.readonly'
];
// Which user to sign in as under the MyMICDS.net domain
const impersonate = 'support@mymicds.net';

/**
 * Creates an authenticated Google Service account.
 * @returns An authenticated account client.
 */
async function createServiceAccount() {
	const jwtClient = new google.auth.JWT(key.client_email, undefined, key.private_key, scopes, impersonate);

	try {
		await jwtClient.authorize();
	} catch (e) {
		throw new Error('There was a problem authorizing the Google Service Account!');
	}

	return jwtClient;
}

export {
	createServiceAccount as create
};
