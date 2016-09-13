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
 * @param {Array} admins - Array of admin user objects if success, null if failure
 */

 function getAdmins(db, callback) {
 	if(typeof callback !== 'function') {
		callback = function() {};
	}
	if(typeof db !== 'object') {
		callback(new Error('Invalid database connection!'), null);
		return;
	}

	var userdata = db.collection('users');

	userdata.find({scopes: ['admin']}).toArray(function(err, docs) {
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
 * @param {getAdminsCallback} callback - Callback
 */

/**
 * Callback after a message is sent
 * @callback sendAdminEmailCallback
 *
 * @param {Object} err - Null if success, error object if failure
 */

 function sendAdminEmail(db, message, callback) {
 	if(typeof callback !== 'function') {
		callback = function() {};
	}
	if(typeof db !== 'object') {
		callback(new Error('Invalid database connection!'));
		return;
	}

	// Get admin objects
 	getAdmins(db, function(err, admins) {
 		if(err) {
 			callback(new Error('Error getting list of admins!'));
 			return;
 		}

		var adminEmails = [];

		for(var i = 0; i < admins.length; i++) {
			adminEmails.push(admin.user + '@micds.org');
		}

		// Send email
 		mail.send(adminEmails, message, function(err) {
 			if(err) {
 				callback(err);
 			}

 			callback(null);
 		});
 	});
 }

 module.exports.get = getAdmins;
 module.exports.sendEmail = sendAdminEmail;
