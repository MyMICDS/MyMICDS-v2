import * as mail from './mail';

import { Db } from 'mongodb';
import { UserDoc } from './users';

/**
 * Gets all admins from the database.
 * @param db Database connection.
 * @returns Array of usernames of all admins.
 */
async function getAdmins(db: Db) {
	if (typeof db !== 'object') { throw new Error('Invalid database connection!'); }

	const userdata = db.collection<UserDoc>('users');

	try {
		return await userdata.find({ scopes: ['admin'] }).toArray();
	} catch (e) {
		throw new Error('There was a problem querying the database!');
	}
}

/**
 * Sends all admins an email.
 * @param db Database connection.
 * @param message Email message to send.
 */
async function sendAdminEmail(db: Db, message: mail.Message) {
	if (typeof db !== 'object') { throw new Error('Invalid database connection!'); }

	// Get admin objects
	let admins: UserDoc[];
	try {
		admins = await getAdmins(db);
	} catch (e) {
		throw new Error('Error getting list of admins!');
	}

	if (admins.length < 1) { return; }

	// Send email
	return mail.send(admins.map(a => a.user + '@micds.org'), message);
}

export {
	getAdmins as get,
	sendAdminEmail as sendEmail
};
