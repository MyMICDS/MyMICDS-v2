/**
 * @file Manages information and functions regarding the MyMICDS admins
 * @module admins
 */

import * as mail from './mail';

import { Db } from 'mongodb';

/**
 * Gets usernames of admins from database
 * @function getAdmins
 *
 * @param {Object} db - Database connection
 * @callback {getAdminsCallback} callback - Callback
 */

/**
 * Callback after admins are retrieved
 * @callback getAdminsCallback
 *
 * @param {Object} err - Null if success, error object if failure
 * @param {Array} admins - Array of admin user objects if success, null if failure
 */

async function getAdmins(db: Db) {
	if (typeof db !== 'object') { throw new Error('Invalid database connection!'); }

	const userdata = db.collection('users');

	try {
		return await userdata.find({ scopes: ['admin'] }).toArray();
	} catch (e) {
		throw new Error('There was a problem querying the database!');
	}
}

/**
 * Sends all admins a notification email
 * @function sendAdminEmail
 *
 * @param {Object} db - Database connection
 * @param {Object} message - JSON containing details of message
 * @param {string} message.subject - Subject of email
 * @param {string} message.html - HTML message
 * @callback {getAdminsCallback} callback - Callback
 */

/**
 * Callback after a message is sent
 * @callback sendAdminEmailCallback
 *
 * @param {Object} err - Null if success, error object if failure
 */

async function sendAdminEmail(db: Db, message: mail.Message) {
	if (typeof db !== 'object') { throw new Error('Invalid database connection!'); }

	// Get admin objects
	let admins;
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
