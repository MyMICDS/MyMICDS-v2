'use strict';

/**
 * @file Manages information and functions regarding the MyMICDS admins
 * @module admins
 */
const mail = require(__dirname + "/mail.js");

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

function getAdmins(db, callback) {
	if(typeof callback !== 'function') {
		callback = () => {};
	}
	if(typeof db !== 'object') {
		callback(new Error('Invalid database connection!'), null);
		return;
	}

	let userdata = db.collection('users');

	userdata.find({scopes: ['admin']}).toArray((err, docs) => {
		if(err) {
			callback(new Error('There was a problem querying the database!'), null);
			return;
		}

		callback(null, docs);
	});
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

function sendAdminEmail(db, message, callback) {
	if(typeof callback !== 'function') {
		callback = () => {};
	}
	if(typeof db !== 'object') {
		callback(new Error('Invalid database connection!'));
		return;
	}

	// Get admin objects
	getAdmins(db, (err, admins) => {
		if(err) {
			callback(new Error('Error getting list of admins!'));
			return;
		}

		let adminEmails = [];

		for(let i = 0; i < admins.length; i++) {
			adminEmails.push(admins[i].user + '@micds.org');
		}

		// Send email
		mail.send(adminEmails, message, err => {
			if(err) {
				callback(err);
			}

			callback(null);
		});
	});
}

module.exports.get = getAdmins;
module.exports.sendEmail = sendAdminEmail;
