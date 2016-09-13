'use strict';

/**
 * @file Manages information and functions regarding the MyMICDS admins
 * @module admins
 */

var mail = require(__dirname + "/mail.js");

/**
 * Gets usernames of admins from database
 * @function getAdmins
 * 
 * @param {Object} db - Database connection
 * @param {getAdminsCallback} callback - Callback
 */

/**
 * Callback after admins are retrieved
 * @callback getAdminsCallback
 *
 * @param {Object} err - Null if success, error object if failure
 * @param {Array} adminList - Array of admin usernames if success, null if failure
 */
 function getAdmins(db, callback) {
 	// validate inputs
 	if(typeof callback !== 'function') {
		callback = function() {};
	}
	if(typeof db !== 'object') {
		callback(new Error('Invalid database connection!'), null);
		return;
	}

	var userscoll = db.collection('users');

	userscoll.find({scopes: ['admin']}).toArray(function(err, docs) {
		if(err) {
			callback(new Error('There was a problem querying the database!'), null);
			return;
		}

		var adminList = [];

		// push all usernames into adminList
		docs.forEach(function(userDoc) {
			adminList.push(userDoc['user'])
		});

		callback(null, adminList);
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
 * @param {getAdminsCallback} callback - Callback
 */

/**
 * Callback after a message is sent
 * @callback sendAdminEmailCallback
 *
 * @param {Object} err - Null if success, error object if failure
 */
 function sendAdminEmail(db, message, callback) {
 	// validate inputs
 	if(typeof callback !== 'function') {
		callback = function() {};
	}
	if(typeof db !== 'object') {
		callback(new Error('Invalid database connection!'));
		return;
	}
 	if(typeof message !== 'object') {
		callback(new Error('Invalid message object!'));
		return;
	}
	if(typeof message.subject !== 'string') {
		callback(new Error('Invalid mail subject!'));
		return;
	}
	if(typeof message.html !== 'string') {
		callback(new Error('Invalid mail html!'));
		return;
	}

 	getAdmins(db, function(err, adminList) {
 		if(err) {
 			callback(new Error('Error getting list of admins!'));
 			return;
 		}

 		// add "@micds.org" to all admin usernames to get email addresses
 		var adminEmails = adminList.map(function(admin) {
 			return admin + "@micds.org";
 		});

 		mail.send(adminEmails, message, function(err) {
 			if(err) {
 				callback(new Error('Error sending email to admins!'));
 			}

 			callback(null);
 		});
 	});
 }

 module.exports.get = getAdmins;
 module.exports.sendEmail = sendAdminEmail;