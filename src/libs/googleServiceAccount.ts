'use strict';

import config from './config';

import { google } from 'googleapis';
import { InternalError } from './errors';

// Any Google scopes the Service Account uses
const scopes = ['https://www.googleapis.com/auth/gmail.readonly'];
// Which user to sign in as under the MyMICDS.net domain
const impersonate = 'support@mymicds.net';

/**
 * Creates an authenticated Google Service account.
 * @returns An authenticated account client.
 */
async function createServiceAccount() {
	try {
		const key = await config.googleServiceAccount;
		const jwtClient = new google.auth.JWT(
			key.client_email,
			undefined,
			key.private_key,
			scopes,
			impersonate
		);
		await jwtClient.authorize();
		return jwtClient;
	} catch (e) {
		throw new InternalError('There was a problem authorizing the Google Service Account!', e);
	}
}

export { createServiceAccount as create };
