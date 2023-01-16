import * as mail from './mail';

import { Db } from 'mongodb';
import { InternalError } from './errors';
import { UserDoc } from './users';

/**
 * Gets all admins from the database.
 * @param db Database connection.
 * @returns Array of usernames of all admins.
 */
async function getAdmins(db: Db) {
	const userdata = db.collection<UserDoc>('users');

	try {
		return await userdata.find({ scopes: ['admin'] }).toArray();
	} catch (e) {
		throw new InternalError('There was a problem querying the database!', e as Error);
	}
}

/**
 * Sends all admins an email.
 * @param db Database connection.
 * @param message Email message to send.
 */
async function sendAdminEmail(db: Db, message: mail.Message) {
	// Get admin objects
	let admins: UserDoc[];
	try {
		admins = await getAdmins(db);
	} catch (e) {
		throw new InternalError('Error getting list of admins!', e as Error);
	}

	if (admins.length < 1) {
		return;
	}

	// Send email
	return mail.send(
		admins.map(a => a.user + '@micds.org'),
		message
	);
}

export { getAdmins as get, sendAdminEmail as sendEmail };
